"""مختبر الكيمياء · نقاط خبرة واكتشافات ولوحة صدارة وأوسمة.

Server-judged like the games yard: the client reports what reaction it ran,
the server validates shapes/caps, dedupes signatures, and awards XP through
award_xp (so lab work also lifts the student and his school in the Season
Cup). Anti-farm: full discovery bonuses are one-time per species/element,
daily challenge pays once per day, platform XP from the lab is capped daily.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from db import db
from auth import get_current_user
from services import award_xp, create_notification
from routes.control_routes import section_open

router = APIRouter(prefix="/api/lab")

LAB_LEVELS = [
    (0, "باحث مبتدئ"), (120, "مساعد مختبر"), (300, "كيميائي واعد"),
    (600, "كيميائي"), (1000, "كيميائي أول"), (1600, "عالم كيمياء"), (2600, "أستاذ المختبر"),
]
ACIDS = {"HCl", "H2SO4", "HNO3", "CH3COOH", "HBr", "HF"}
PRECIP = {"PbI2", "AgCl", "BaSO4", "CaCO3", "Zn(OH)2", "Cu(OH)2"}

DAILY_TARGETS = [
    (["H2", "O2"], "اصنع الماء من غازيه"),
    (["NaHCO3", "CH3COOH"], "فجّر بركان صودا الخبز"),
    (["Pb(NO3)2", "KI"], "أسقط المطر الذهبي"),
    (["CH4", "O2"], "أشعل الغاز الطبيعي"),
    (["Zn", "HCl"], "حرّر غاز الهيدروجين"),
    (["CaCO3", "HCl"], "فوّر الحجر الجيري"),
    (["Mg", "O2"], "أضئ المغنيسيوم"),
    (["H2O"], "حلّل الماء بالكهرباء"),
    (["CO2", "H2O"], "ابنِ كالنبات (بناء ضوئي)"),
    (["Fe", "CuSO4"], "بدّل معدناً بمعدن"),
]


def _lab_level(xp: int):
    title, nxt = LAB_LEVELS[0][1], None
    for i, (need, t) in enumerate(LAB_LEVELS):
        if xp >= need:
            title = t
            nxt = LAB_LEVELS[i + 1][0] if i + 1 < len(LAB_LEVELS) else None
    return title, nxt


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _daily_target():
    day = datetime.now(timezone.utc).toordinal()
    items, title = DAILY_TARGETS[day % len(DAILY_TARGETS)]
    return {"reactants": items, "title": title}


def _badges(u: dict):
    xp = u.get("lab_xp", 0)
    runs = u.get("lab_runs", 0)
    sigs = len(u.get("lab_sigs", []))
    elems = u.get("lab_elements", [])
    flags = set(u.get("lab_flags", []))
    return [
        {"key": "first", "icon": "🧪", "title": "أول تجربة", "desc": "شغّل أول تفاعل", "earned": runs >= 1},
        {"key": "water", "icon": "💧", "title": "صانع الماء", "desc": "كوّن الماء داخل المختبر", "earned": "water" in flags},
        {"key": "fire", "icon": "🔥", "title": "سيد اللهب", "desc": "نفّذ تفاعل احتراق", "earned": "flame" in flags},
        {"key": "gas", "icon": "🫧", "title": "صائد الغازات", "desc": "حرّر غازاً من تفاعل", "earned": "gas" in flags},
        {"key": "gold", "icon": "🌟", "title": "المطر الذهبي", "desc": "شاهد راسباً يتكوّن", "earned": "precip" in flags},
        {"key": "explorer10", "icon": "🔭", "title": "مستكشف العناصر", "desc": "ادرس 10 عناصر داخل التفاعلات", "earned": len(elems) >= 10},
        {"key": "explorer25", "icon": "🗺️", "title": "رحّالة الجدول", "desc": "ادرس 25 عنصراً داخل التفاعلات", "earned": len(elems) >= 25},
        {"key": "chemist10", "icon": "⚗️", "title": "كيميائي نشيط", "desc": "نفّذ 10 تفاعلات مميزة", "earned": sigs >= 10},
        {"key": "chemist25", "icon": "🏆", "title": "أسطورة المختبر", "desc": "نفّذ 25 تفاعلاً مميزاً", "earned": sigs >= 25},
        {"key": "daily", "icon": "📅", "title": "بطل اليوم", "desc": "أنجز تحدي اليوم", "earned": bool(u.get("lab_daily_done"))},
        {"key": "xp500", "icon": "⭐", "title": "نجم الكيمياء", "desc": "اجمع 500 خبرة مختبر", "earned": xp >= 500},
        {"key": "xp1500", "icon": "👑", "title": "عرش الكيمياء", "desc": "اجمع 1500 خبرة مختبر", "earned": xp >= 1500},
    ]


def _pub(u: dict):
    xp = u.get("lab_xp", 0)
    title, nxt = _lab_level(xp)
    return {
        "lab_xp": xp, "level_title": title, "next_level_at": nxt,
        "runs": u.get("lab_runs", 0), "signatures": len(u.get("lab_sigs", [])),
        "discoveries": u.get("lab_discoveries", []),
        "elements": u.get("lab_elements", []),
        "badges": _badges(u),
        "daily": {**_daily_target(), "done": u.get("lab_daily_done") == _today()},
    }


class RunBody(BaseModel):
    reactants: list[str] = []
    products: list[str] = []
    elements: list[str] = []


def _clean_str(v):
    return isinstance(v, str) and 0 < len(v) <= 26


async def _gate():
    if not await section_open("clubs"):
        raise HTTPException(status_code=403, detail="قسم الأندية مغلق حالياً")


@router.get("/me")
async def lab_me(user: dict = Depends(get_current_user)):
    await _gate()
    return _pub(user)


@router.get("/leaderboard")
async def lab_leaderboard(limit: int = 20, user: dict = Depends(get_current_user)):
    """نفس لوحة صدارة نادي العلوم حرفياً: أعضاء النادي مرتّبون بخبرة المنصة،
    والمختبر قسم تابع للنادي — كل خبرة مختبر تُرفع عبر award_xp فتتقدّم بها هنا.
    نُلحق بكل صف لمحة مختبره (اكتشافات وتجارب)."""
    await _gate()
    from routes.community_routes import _club_member_rows
    rows = await _club_member_rows("science")
    rows.sort(key=lambda r: -r.get("xp", 0))
    rows = rows[:max(1, min(50, limit))]
    lab = {}
    if rows:
        ids = [ObjectId(r["id"]) for r in rows]
        async for u in db.users.find({"_id": {"$in": ids}},
                                      {"lab_xp": 1, "lab_discoveries": 1, "lab_elements": 1, "lab_runs": 1}):
            title, _ = _lab_level(u.get("lab_xp", 0))
            lab[str(u["_id"])] = {
                "lab_xp": u.get("lab_xp", 0), "lab_level": title,
                "discoveries": len(u.get("lab_discoveries", [])),
                "elements": len(u.get("lab_elements", [])),
                "runs": u.get("lab_runs", 0),
            }
    out = []
    for r in rows:
        extra = lab.get(r["id"], {"lab_xp": 0, "lab_level": LAB_LEVELS[0][1], "discoveries": 0, "elements": 0, "runs": 0})
        out.append({**r, **extra, "rank": len(out) + 1,
                    "xp": r.get("xp", 0), "level_title": extra["lab_level"],
                    "me": r["id"] == str(user["_id"])})
    return {"items": out, "club": "science"}


@router.post("/run")
async def lab_run(body: RunBody, user: dict = Depends(get_current_user)):
    await _gate()
    if not (1 <= len(body.reactants) <= 4 and 1 <= len(body.products) <= 8 and len(body.elements) <= 18):
        raise HTTPException(status_code=422, detail="حمولة غير صالحة")
    if not all(_clean_str(x) for x in body.reactants + body.products + body.elements):
        raise HTTPException(status_code=422, detail="حمولة غير صالحة")

    uid = str(user["_id"])
    species = sorted(set(body.reactants + body.products))
    elems = sorted(set(x for x in body.elements if len(x) <= 3))
    sig = "|".join(sorted(body.reactants)) + "→" + "|".join(sorted(body.products))
    old = user
    new_species = [f for f in species if f not in old.get("lab_discoveries", [])]
    new_elems = [e for e in elems if e not in old.get("lab_elements", [])]
    first_sig = sig not in old.get("lab_sigs", [])

    flags = []
    prods = set(body.products)
    if "H2O" in prods: flags.append("water")
    if "H2" in prods: flags.append("gas")
    if "CO2" in prods and "O2" in body.reactants: flags.append("flame")
    if any(p in prods for p in PRECIP): flags.append("precip")
    if "H2" in prods and any(r in ACIDS for r in body.reactants): flags.append("gas")

    daily = _daily_target()
    daily_hit = sorted(body.reactants) == sorted(daily["reactants"]) and old.get("lab_daily_done") != _today()

    gained = 20
    if first_sig: gained += 30
    gained += min(60, 10 * len(new_species))
    gained += min(40, 5 * len(new_elems))
    if daily_hit: gained += 120

    today = _today()
    same_day_sigs = old.get("lab_daily_sigs", {}) if old.get("lab_daily_date") == today else {}
    repeats = same_day_sigs.get(sig, 0)
    if repeats >= 5:
        gained = min(gained, 2)

    upd = {
        "$inc": {"lab_xp": gained, "lab_runs": 1},
        "$set": {"lab_daily_date": today,
                 f"lab_daily_sigs.{abs(hash(sig)) % 10**9}": repeats + 1},
        "$addToSet": {"lab_discoveries": {"$each": new_species},
                      "lab_elements": {"$each": new_elems},
                      "lab_sigs": sig, "lab_flags": {"$each": flags}},
    }
    if daily_hit:
        upd["$set"]["lab_daily_done"] = today
    await db.users.update_one({"_id": ObjectId(uid)}, upd)

    platform = 0
    earned_today = old.get("lab_platform_day", {}) if old.get("lab_platform_date") == today else {}
    used = earned_today.get("xp", 0)
    if used < 300:
        platform = min(gained, 60, 300 - used)
        await db.users.update_one({"_id": ObjectId(uid)},
                                  {"$set": {"lab_platform_date": today,
                                            "lab_platform_day.xp": used + platform}})
        if platform:
            await award_xp(uid, platform, "مختبر الكيمياء · نادي العلوم", ref=sig)

    fresh = await db.users.find_one({"_id": ObjectId(uid)})
    before = {b["key"] for b in _badges(old) if b["earned"]}
    new_badges = [b for b in _badges(fresh) if b["earned"] and b["key"] not in before]
    for b in new_badges:
        await create_notification(uid, "achievement",
                                  f"وسام كيمياء جديد: {b['icon']} {b['title']}",
                                  f"{b['desc']} · أُنجز داخل مختبر نادي العلوم · أكمل التجارب لفتح بقية أوسمتك الاثني عشر.",
                                  "/clubs/science/lab")
    return {"gained": gained, "platform_xp": platform,
            "new_species": new_species, "new_elements": new_elems,
            "new_badges": new_badges, "daily_done": daily_hit or fresh.get("lab_daily_done") == today,
            "me": _pub(fresh), "new_signature": first_sig}
