from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from bson import ObjectId

from db import db, ser, now_iso
from auth import get_current_user
from services import award_xp

router = APIRouter(prefix="/api")

# ---------------------------------------------------------------- Weekly goals

_GOAL_REASONS = {
    # NOTE: xp_transactions store Arabic reason strings; the English keys are
    # kept as fallback so both match.
    "books": {"إكمال قراءة كتاب", "تقييم كتاب", "الموافقة على كتاب",
              "read_book", "review_book", "upload_book_approved"},
    "chess": {"لعب مباراة شطرنج", "الفوز بمباراة شطرنج",
              "win_chess", "play_chess"},
    "discussions": {"إنشاء نقاش", "رد في نقاش",
                    "create_discussion", "reply_discussion"},
}

_DEFAULT_GOALS = {"books": 0, "chess": 0, "discussions": 0}


def _week_start_str() -> str:
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


async def _week_progress(user_id: str, week_start: str) -> dict:
    counts = {k: 0 for k in _DEFAULT_GOALS}
    rows = await db.xp_transactions.find(
        {"user_id": user_id, "created_at": {"$gte": week_start + "T00:00:00"}}
    ).to_list(5000)
    for r in rows:
        reason = r.get("reason", "")
        for key, reasons in _GOAL_REASONS.items():
            if reason in reasons:
                counts[key] += 1
                break
    return counts


async def _weekly_payload(user_id: str) -> dict:
    week_start = _week_start_str()
    doc = await db.user_goals.find_one({"user_id": user_id, "week_start": week_start})
    if not doc:
        doc = {"user_id": user_id, "week_start": week_start,
               "goals": dict(_DEFAULT_GOALS), "created_at": now_iso()}
        await db.user_goals.insert_one(doc)
    return {
        "week_start": week_start,
        "goals": {k: int(doc.get("goals", {}).get(k, 0)) for k in _DEFAULT_GOALS},
        "progress": await _week_progress(user_id, week_start),
    }


class GoalsBody(BaseModel):
    books: int | None = Field(default=None, ge=0, le=50)
    chess: int | None = Field(default=None, ge=0, le=50)
    discussions: int | None = Field(default=None, ge=0, le=50)


@router.get("/goals/weekly")
async def get_weekly_goals(user: dict = Depends(get_current_user)):
    return await _weekly_payload(user["id"])


@router.put("/goals/weekly")
async def set_weekly_goals(body: GoalsBody, user: dict = Depends(get_current_user)):
    week_start = _week_start_str()
    doc = await db.user_goals.find_one({"user_id": user["id"], "week_start": week_start})
    goals = {k: int((doc or {}).get("goals", {}).get(k, 0)) for k in _DEFAULT_GOALS}
    for k in _DEFAULT_GOALS:
        v = getattr(body, k)
        if v is not None:
            goals[k] = int(v)
    await db.user_goals.update_one(
        {"user_id": user["id"], "week_start": week_start},
        {"$set": {"goals": goals, "updated_at": now_iso()},
         "$setOnInsert": {"user_id": user["id"], "week_start": week_start,
                          "created_at": now_iso()}},
        upsert=True,
    )
    return await _weekly_payload(user["id"])

# ------------------------------------------------------------ Daily challenge

CHALLENGE_BANK = [
    {"q": "ما هو أكبر كوكب في المجموعة الشمسية؟",
     "options": ["المشتري", "زحل", "الأرض", "المريخ"], "answer": 0},
    {"q": "ما العنصر الكيميائي الذي يرمز له بالرمز O؟",
     "options": ["الأكسجين", "الذهب", "الحديد", "الهيدروجين"], "answer": 0},
    {"q": "كم عدد قارات العالم؟",
     "options": ["7", "5", "6", "8"], "answer": 0},
    {"q": "ما لغة البرمجة الأكثر استخداماً في تطوير واجهات الويب؟",
     "options": ["JavaScript", "Python", "Java", "C++"], "answer": 0},
    {"q": "ما هو أطول أنهار العالم؟",
     "options": ["النيل", "الأمازون", "اليانغتسي", "المسيسيبي"], "answer": 0},
    {"q": "ما هي عاصمة الأردن؟",
     "options": ["عمّان", "إربد", "الزرقاء", "العقبة"], "answer": 0},
    {"q": "كم عدد ألوان قوس قزح؟",
     "options": ["7", "6", "5", "8"], "answer": 0},
    {"q": "ما الغاز الذي تمتصه النباتات لعملية البناء الضوئي؟",
     "options": ["ثاني أكسيد الكربون", "الأكسجين", "النيتروجين", "الهيليوم"], "answer": 0},
    {"q": "ما هي أصغر وحدة بناء في الكائنات الحية؟",
     "options": ["الخلية", "الذرة", "الجزيء", "النسيج"], "answer": 0},
    {"q": "ماذا يعني اختصار AI؟",
     "options": ["الذكاء الاصطناعي", "الإنترنت المتقدم", "الأنظمة المتكاملة", "التحليل الآلي"], "answer": 0},
    {"q": "كم عدد لاعبي فريق كرة القدم داخل الملعب؟",
     "options": ["11", "10", "9", "12"], "answer": 0},
    {"q": "ما هي أكبر صحراء حارة في العالم؟",
     "options": ["الصحراء الكبرى", "الربع الخالي", "غوبي", "أتاكاما"], "answer": 0},
    {"q": "ما هو المعدن الأعلى توصيلاً للكهرباء؟",
     "options": ["الفضة", "النحاس", "الذهب", "الألمنيوم"], "answer": 0},
    {"q": "ما هي سرعة الضوء التقريبية؟",
     "options": ["300 ألف كم/ث", "150 ألف كم/ث", "500 ألف كم/ث", "مليون كم/ث"], "answer": 0},
    {"q": "ما هو نظام التشغيل مفتوح المصدر الأشهر؟",
     "options": ["لينكس", "ويندوز", "macOS", "أندرويد"], "answer": 0},
    {"q": "كم عدد أحرف الأبجدية العربية؟",
     "options": ["28", "26", "30", "32"], "answer": 0},
    {"q": "ما هو أكبر محيط في العالم؟",
     "options": ["الهادئ", "الأطلسي", "الهندي", "المتجمد الشمالي"], "answer": 0},
    {"q": "ما هي العملة الرسمية في الأردن؟",
     "options": ["الدينار", "الريال", "الدرهم", "الجنيه"], "answer": 0},
    {"q": "ما هو العنصر الأكثر وفرة في الكون؟",
     "options": ["الهيدروجين", "الهيليوم", "الأكسجين", "الكربون"], "answer": 0},
    {"q": "من هو مؤسس شركة مايكروسوفت؟",
     "options": ["بيل غيتس", "ستيف جوبز", "إيلون ماسك", "جيف بيزوس"], "answer": 0},
    {"q": "كم عدد أيام السنة الكبيسة؟",
     "options": ["366", "365", "364", "367"], "answer": 0},
    {"q": "ما هي أكبر دولة في العالم من حيث المساحة؟",
     "options": ["روسيا", "الصين", "كندا", "الولايات المتحدة"], "answer": 0},
    {"q": "ماذا يقيس مقياس ريختر؟",
     "options": ["الزلازل", "سرعة الرياح", "درجة الحرارة", "الضغط الجوي"], "answer": 0},
    {"q": "ما هي أول دولة عربية تصل إلى المريخ بمسبار (مسبار الأمل)؟",
     "options": ["الإمارات", "السعودية", "مصر", "المغرب"], "answer": 0},
]

CHALLENGE_XP = 15


def _today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _today_question():
    doy = datetime.now(timezone.utc).timetuple().tm_yday
    return CHALLENGE_BANK[doy % len(CHALLENGE_BANK)]


@router.get("/challenge/today")
async def get_daily_challenge(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    today = _today_str()
    q = _today_question()
    done = bool(u) and u.get("challenge_last_date") == today
    return {
        "date": today,
        "q": q["q"],
        "options": q["options"],
        "done": done,
        "was_correct": u.get("challenge_last_correct") if done else None,
    }


class ChallengeAnswerBody(BaseModel):
    choice: int = Field(ge=0, le=3)


@router.post("/challenge/today/answer")
async def answer_daily_challenge(body: ChallengeAnswerBody,
                                user: dict = Depends(get_current_user)):
    today = _today_str()
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    if u and u.get("challenge_last_date") == today:
        return {"done": True, "was_correct": bool(u.get("challenge_last_correct")),
                "xp_awarded": 0}
    correct = body.choice == _today_question()["answer"]
    xp_awarded = 0
    if correct:
        await award_xp(user["id"], CHALLENGE_XP, "daily_challenge")
        xp_awarded = CHALLENGE_XP
    await db.users.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {"challenge_last_date": today, "challenge_last_correct": correct}},
    )
    return {"done": True, "was_correct": correct, "xp_awarded": xp_awarded}

# ----------------------------------------------------------------- Bookmarks

_BOOKMARK_KINDS = {"book", "work", "venture", "event", "competition", "news", "club"}


class BookmarkBody(BaseModel):
    kind: str
    ref_id: str
    title: str = ""


@router.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    docs = await db.bookmarks.find({"user_id": user["id"]}).sort(
        "created_at", -1).limit(50).to_list(50)
    return {"items": [{"id": str(d["_id"]), "kind": d.get("kind"),
                       "ref_id": d.get("ref_id"), "title": d.get("title", ""),
                       "created_at": d.get("created_at")} for d in docs]}


@router.post("/bookmarks")
async def add_bookmark(body: BookmarkBody, user: dict = Depends(get_current_user)):
    if body.kind not in _BOOKMARK_KINDS:
        raise HTTPException(status_code=400, detail="نوع غير صالح")
    existing = await db.bookmarks.find_one(
        {"user_id": user["id"], "kind": body.kind, "ref_id": body.ref_id})
    if existing:
        return ser(existing)
    res = await db.bookmarks.insert_one({
        "user_id": user["id"], "kind": body.kind, "ref_id": body.ref_id,
        "title": body.title, "created_at": now_iso(),
    })
    return ser(await db.bookmarks.find_one({"_id": res.inserted_id}))


@router.delete("/bookmarks/{bid}")
async def delete_bookmark(bid: str, user: dict = Depends(get_current_user)):
    try:
        _id = ObjectId(bid)
    except Exception:
        raise HTTPException(status_code=400, detail="معرف غير صالح")
    res = await db.bookmarks.delete_one({"_id": _id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="غير موجود")
    return {"ok": True}

# --------------------------------------------------------------- Suggestions


@router.get("/suggestions")
async def get_suggestions(user: dict = Depends(get_current_user)):
    out = {"clubs": [], "books": [], "people": []}
    try:
        # Clubs the user hasn't joined, sorted by member count
        mems = await db.club_members.find({"user_id": user["id"]}).to_list(100)
        joined = {m.get("club_id") for m in mems}
        clubs = await db.clubs.find({}).to_list(60)
        scored = []
        for c in clubs:
            cid = str(c["_id"])
            if cid in joined:
                continue
            n = await db.club_members.count_documents({"club_id": cid})
            scored.append((n, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        out["clubs"] = [{"slug": c.get("slug"), "name": c.get("name"),
                         "icon": c.get("icon"), "color": c.get("color"),
                         "members_count": n} for n, c in scored[:3]]
    except Exception:
        pass

    try:
        # Books: prefer categories of bookmarked books, else most viewed
        bms = await db.bookmarks.find({"user_id": user["id"], "kind": "book"}).to_list(50)
        bm_ids = {b.get("ref_id") for b in bms}
        cats = set()
        for rid in list(bm_ids)[:20]:
            try:
                b = await db.books.find_one({"_id": ObjectId(rid)})
                if b and b.get("category"):
                    cats.add(b["category"])
            except Exception:
                continue
        query = {"status": "approved"}
        if cats:
            query["category"] = {"$in": list(cats)}
        docs = await db.books.find(query).sort("views", -1).limit(12).to_list(12)
        picked = [d for d in docs if str(d["_id"]) not in bm_ids][:4]
        if not picked and cats:
            docs = await db.books.find({"status": "approved"}).sort(
                "views", -1).limit(12).to_list(12)
            picked = [d for d in docs if str(d["_id"]) not in bm_ids][:4]
        out["books"] = [{"id": str(d["_id"]), "title": d.get("title"),
                         "author": d.get("author"), "cover_url": d.get("cover_url"),
                         "category": d.get("category")} for d in picked]
    except Exception:
        pass

    try:
        # People: highest XP excluding self
        docs = await db.users.find({}).sort("xp", -1).limit(20).to_list(20)
        picked = [d for d in docs if str(d["_id"]) != user["id"]][:4]
        out["people"] = [{"user_id": str(d["_id"]), "name": d.get("name"),
                          "avatar": d.get("avatar_url"),
                          "level_title": d.get("level_title", "قارئ مبتدئ"),
                          "xp": d.get("xp", 0)} for d in picked]
    except Exception:
        pass
    return out
