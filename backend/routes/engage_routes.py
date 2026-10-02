"""Engagement: daily quests, the live activity feed, and online presence."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import db, sers
from auth import get_current_user
from services import award_xp, get_today_quests

router = APIRouter(prefix="/api")


# ---------------- Daily quests ----------------
@router.get("/quests/today")
async def quests_today(user: dict = Depends(get_current_user)):
    doc = await get_today_quests(user["id"])
    quests = [{**q, "done": q.get("progress", 0) >= q.get("target", 1)}
              for q in doc.get("quests", [])]
    return {"date": doc["date"], "quests": quests,
            "claimable": sum(1 for q in quests if q["done"] and not q["claimed"])}


class ClaimBody(BaseModel):
    key: str


@router.post("/quests/claim")
async def quests_claim(body: ClaimBody, user: dict = Depends(get_current_user)):
    doc = await get_today_quests(user["id"])
    for q in doc.get("quests", []):
        if q["key"] == body.key:
            if q.get("claimed"):
                raise HTTPException(status_code=400, detail="تمت المطالبة بهذه المكافأة")
            if q.get("progress", 0) < q.get("target", 1):
                raise HTTPException(status_code=400, detail="المهمة لم تكتمل بعد")
            q["claimed"] = True
            await db.user_quests.update_one(
                {"user_id": user["id"], "date": doc["date"]},
                {"$set": {"quests": doc["quests"]}})
            await award_xp(user["id"], q["reward"], "مكافأة مهمة يومية", q["key"])
            return {"ok": True, "xp": q["reward"]}
    raise HTTPException(status_code=404, detail="المهمة غير موجودة")


# ---------------- Activity feed ----------------
@router.get("/activity/feed")
async def activity_feed(limit: int = 40, user: dict = Depends(get_current_user)):
    limit = max(1, min(limit, 100))
    docs = await db.activity_events.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"items": sers(docs)}


# ---------------- Presence ----------------
@router.get("/presence/online")
async def presence_online(user: dict = Depends(get_current_user)):
    try:
        from ws import hub
        ids = list(hub.user_conns.keys())
    except Exception:
        ids = []
    return {"online": len(ids), "user_ids": ids}


# ---------------- Points store (cosmetics) ----------------
STORE_ITEMS = [
    {"key": "frame_emerald", "kind": "frame", "name": "إطار الزمرد", "cost": 300},
    {"key": "frame_gold", "kind": "frame", "name": "إطار الذهب", "cost": 800},
    {"key": "frame_galaxy", "kind": "frame", "name": "إطار المجرّة", "cost": 1500},
    {"key": "title_reader", "kind": "title", "name": "القارئ النهم", "cost": 200},
    {"key": "title_chess", "kind": "title", "name": "عبقري الشطرنج", "cost": 600},
    {"key": "title_thinker", "kind": "title", "name": "مفكّر المستقبل", "cost": 1200},
    {"key": "title_legend", "kind": "title", "name": "أسطورة النادي", "cost": 3000},
]
_STORE_BY_KEY = {i["key"]: i for i in STORE_ITEMS}


@router.get("/store")
async def store_list(user: dict = Depends(get_current_user)):
    me = await db.users.find_one({"_id": _me_oid(user)})
    owned = (me or {}).get("store_items", [])
    cosmetics = (me or {}).get("cosmetics", {})
    items = [{**i, "owned": i["key"] in owned,
              "equipped": (cosmetics.get("frame") == i["key"] if i["kind"] == "frame"
                           else cosmetics.get("title") == i["name"])}
             for i in STORE_ITEMS]
    return {"items": items, "xp": (me or {}).get("xp", 0), "cosmetics": cosmetics}


def _me_oid(user):
    from bson import ObjectId
    try:
        return ObjectId(user["id"])
    except Exception:
        return None


class BuyBody(BaseModel):
    key: str


@router.post("/store/buy")
async def store_buy(body: BuyBody, user: dict = Depends(get_current_user)):
    item = _STORE_BY_KEY.get(body.key)
    if not item:
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    me = await db.users.find_one({"_id": _me_oid(user)})
    if body.key in (me.get("store_items") or []):
        raise HTTPException(status_code=400, detail="تملك هذا العنصر بالفعل")
    if (me.get("xp", 0) or 0) < item["cost"]:
        raise HTTPException(status_code=400, detail="نقاطك لا تكفي")
    await award_xp(user["id"], -item["cost"], f"شراء: {item['name']}", item["key"])
    await db.users.update_one({"_id": _me_oid(user)}, {"$addToSet": {"store_items": item["key"]}})
    return {"ok": True, "item": item["key"]}


class EquipBody(BaseModel):
    kind: str  # frame | title
    key: str = None


@router.post("/store/equip")
async def store_equip(body: EquipBody, user: dict = Depends(get_current_user)):
    if body.kind not in ("frame", "title"):
        raise HTTPException(status_code=400, detail="نوع غير صالح")
    me = await db.users.find_one({"_id": _me_oid(user)})
    owned = me.get("store_items") or []
    if body.key:
        item = _STORE_BY_KEY.get(body.key)
        if not item or item["kind"] != body.kind or body.key not in owned:
            raise HTTPException(status_code=400, detail="العنصر غير متاح لك")
        value = item["key"] if body.kind == "frame" else item["name"]
    else:
        value = None
    await db.users.update_one({"_id": _me_oid(user)},
                              {"$set": {f"cosmetics.{body.kind}": value}})
    return {"ok": True, "cosmetics": {**((me.get("cosmetics") or {})), body.kind: value}}


# ---------------- School battles (weekly XP race) ----------------
@router.get("/battles/weekly")
async def weekly_battle():
    from datetime import datetime, timezone, timedelta
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    ws = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc).isoformat()
    rows = await db.xp_transactions.aggregate([
        {"$match": {"created_at": {"$gte": ws}, "amount": {"$gt": 0}}},
        {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
    ]).to_list(100000)
    per_school = {}
    for r in rows:
        u = await db.users.find_one({"_id": _me_oid({"id": r["_id"]})},
                                    {"school_id": 1, "school_name": 1})
        if not u or not u.get("school_id"):
            continue
        s = per_school.setdefault(u["school_id"], {"school_id": u["school_id"],
                                                   "school_name": u.get("school_name") or "مدرسة",
                                                   "xp": 0, "members": 0})
        s["xp"] += r["xp"]
        s["members"] += 1
    standings = sorted(per_school.values(), key=lambda x: -x["xp"])
    battle = None
    if len(standings) >= 2:
        battle = {"a": standings[0], "b": standings[1]}
    return {"week_start": ws, "standings": standings[:10], "battle": battle}
