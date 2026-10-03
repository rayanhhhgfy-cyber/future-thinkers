"""مزايا النمو والمجتمع: رفيق القراءة · جلسات قراءة مباشرة · هدف المدرسة الشهري ·
أوسمة موسمية · كتيّبات الطلاب · تبادل الكتب الورقية."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, require_role
from services import award_xp, create_notification, audit_log
from routes.badges_routes import award_badge

router = APIRouter(prefix="/api/growth")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _user_card(u: dict) -> dict:
    return {
        "id": str(u["_id"]), "name": u.get("name"), "avatar_url": u.get("avatar_url"),
        "level": u.get("level", 1), "level_title": u.get("level_title", ""),
        "school_name": u.get("school_name"), "xp": u.get("xp", 0),
    }


async def _week_pages(user_id: str) -> int:
    start = (_now() - timedelta(days=6)).date().isoformat()
    docs = await db.user_daily.find({"user_id": user_id, "date": {"$gte": start}}).to_list(10)
    return int(sum(d.get("pages", 0) for d in docs))


# ------------------------------------------------------------------ buddies
@router.get("/buddies/me")
async def my_buddy(user: dict = Depends(get_current_user)):
    pair = await db.buddy_pairs.find_one(
        {"status": "active", "$or": [{"a": user["id"]}, {"b": user["id"]}]})
    if not pair:
        waiting = await db.buddy_requests.find_one({"user_id": user["id"]})
        return {"state": "waiting" if waiting else "none"}
    other_id = pair["b"] if pair["a"] == user["id"] else pair["a"]
    other = await db.users.find_one({"_id": oid(other_id)})
    my_pages, buddy_pages = await _week_pages(user["id"]), await _week_pages(other_id)
    return {
        "state": "active", "pair_id": str(pair["_id"]),
        "buddy": _user_card(other) if other else None,
        "my_week_pages": my_pages, "buddy_week_pages": buddy_pages,
        "since": pair.get("created_at"),
    }


@router.post("/buddies/find")
async def find_buddy(user: dict = Depends(get_current_user)):
    current = await my_buddy(user)
    if current["state"] == "active":
        return current
    # pair with the longest-waiting requester who has no active pair
    candidates = await db.buddy_requests.find({"user_id": {"$ne": user["id"]}}).sort("created_at", 1).to_list(20)
    for cand in candidates:
        taken = await db.buddy_pairs.find_one(
            {"status": "active", "$or": [{"a": cand["user_id"]}, {"b": cand["user_id"]}]})
        if taken:
            await db.buddy_requests.delete_one({"_id": cand["_id"]})
            continue
        pair = {"a": cand["user_id"], "b": user["id"], "status": "active", "created_at": now_iso()}
        res = await db.buddy_pairs.insert_one(pair)
        await db.buddy_requests.delete_many({"user_id": {"$in": [cand["user_id"], user["id"]]}})
        await create_notification(cand["user_id"], "social", "وجدت رفيق قراءة! 📚",
                                    f"{user['name']} صار رفيقك في القراءة · نافسه في صفحات الأسبوع", "/buddies")
        return {"state": "active", "pair_id": str(res.inserted_id)}
    await db.buddy_requests.update_one({"user_id": user["id"]},
                                       {"$set": {"user_id": user["id"], "created_at": now_iso()}}, upsert=True)
    return {"state": "waiting"}


@router.post("/buddies/leave")
async def leave_buddy(user: dict = Depends(get_current_user)):
    pair = await db.buddy_pairs.find_one(
        {"status": "active", "$or": [{"a": user["id"]}, {"b": user["id"]}]})
    if pair:
        other_id = pair["b"] if pair["a"] == user["id"] else pair["a"]
        await db.buddy_pairs.update_one({"_id": pair["_id"]}, {"$set": {"status": "ended", "ended_at": now_iso()}})
        await create_notification(other_id, "social", "انتهت شراكة القراءة",
                                  "أنهى رفيقك شراكة القراءة · ابحث عن رفيق جديد", "/buddies")
    await db.buddy_requests.delete_many({"user_id": user["id"]})
    return {"ok": True}


# ------------------------------------------------------------ live sessions
class SessionBody(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    description: str = Field(default="", max_length=500)
    book_id: str | None = None
    starts_at: str = Field(min_length=10, max_length=40)
    duration_min: int = Field(default=45, ge=10, le=240)


def _session_state(s: dict, now: datetime) -> str:
    if s.get("status") == "ended":
        return "ended"
    try:
        start = datetime.fromisoformat(s["starts_at"].replace("Z", "+00:00"))
    except Exception:
        return "scheduled"
    end = start + timedelta(minutes=int(s.get("duration_min", 45)))
    if now < start - timedelta(minutes=10):
        return "scheduled"
    if now <= end:
        return "live"
    return "ended"


async def _session_out(s: dict, user_id: str | None = None) -> dict:
    d = ser(s)
    d["state"] = _session_state(s, _now())
    attendees = await db.live_attendance.count_documents({"session_id": d["id"]})
    d["attendees"] = attendees
    d["joined"] = bool(user_id and await db.live_attendance.find_one({"session_id": d["id"], "user_id": user_id}))
    if s.get("book_id"):
        b = await db.books.find_one({"_id": oid(s["book_id"])}, {"title": 1})
        d["book_title"] = b.get("title") if b else None
    return d


@router.get("/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    docs = await db.live_sessions.find({}).sort("starts_at", -1).limit(60).to_list(60)
    out = [await _session_out(s, user["id"]) for s in docs]
    order = {"live": 0, "scheduled": 1, "ended": 2}
    out.sort(key=lambda s: (order.get(s["state"], 3), s.get("starts_at") or ""))
    return out


@router.post("/sessions")
async def create_session(body: SessionBody, request: Request, user: dict = Depends(get_current_user)):
    if (user.get("level") or 1) < 3 and user.get("role") not in ("admin", "super_admin", "moderator", "teacher"):
        raise HTTPException(status_code=403, detail="استضافة الجلسات متاحة من المستوى ٣ فأعلى")
    try:
        datetime.fromisoformat(body.starts_at.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="وقت البداية غير صالح")
    doc = {**body.model_dump(), "host_id": user["id"], "host_name": user.get("name"),
           "status": "open", "created_at": now_iso()}
    res = await db.live_sessions.insert_one(doc)
    await audit_log(user, "live_session_create", "live_session", str(res.inserted_id), {"title": body.title}, request)
    return await _session_out(await db.live_sessions.find_one({"_id": res.inserted_id}), user["id"])


@router.get("/sessions/{session_id}")
async def session_detail(session_id: str, user: dict = Depends(get_current_user)):
    s = await db.live_sessions.find_one({"_id": oid(session_id)})
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    d = await _session_out(s, user["id"])
    msgs = await db.live_messages.find({"session_id": session_id}).sort("created_at", 1).limit(120).to_list(120)
    d["messages"] = sers(msgs)
    atts = await db.live_attendance.find({"session_id": session_id}).sort("joined_at", 1).limit(40).to_list(40)
    d["attendees_list"] = [{"user_id": a["user_id"], "name": a.get("user_name")} for a in atts]
    d["is_host"] = s.get("host_id") == user["id"]
    return d


@router.post("/sessions/{session_id}/join")
async def join_session(session_id: str, user: dict = Depends(get_current_user)):
    s = await db.live_sessions.find_one({"_id": oid(session_id)})
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    state = _session_state(s, _now())
    existing = await db.live_attendance.find_one({"session_id": session_id, "user_id": user["id"]})
    xp = 0
    if not existing:
        await db.live_attendance.insert_one({"session_id": session_id, "user_id": user["id"],
                                             "user_name": user.get("name"), "joined_at": now_iso(),
                                             "xp_awarded": state == "live"})
        if state == "live":
            xp = 10
            await award_xp(user["id"], xp, "حضور جلسة قراءة مباشرة", session_id)
    return {"ok": True, "state": state, "xp_awarded": xp}


class SessionMsgBody(BaseModel):
    text: str = Field(min_length=1, max_length=600)


@router.post("/sessions/{session_id}/messages")
async def session_message(session_id: str, body: SessionMsgBody, user: dict = Depends(get_current_user)):
    s = await db.live_sessions.find_one({"_id": oid(session_id)})
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    if _session_state(s, _now()) == "ended":
        raise HTTPException(status_code=400, detail="انتهت هذه الجلسة")
    attended = await db.live_attendance.find_one({"session_id": session_id, "user_id": user["id"]})
    if not attended:
        raise HTTPException(status_code=403, detail="انضم إلى الجلسة أولاً")
    doc = {"session_id": session_id, "user_id": user["id"], "user_name": user.get("name"),
           "text": body.text.strip(), "created_at": now_iso()}
    res = await db.live_messages.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    s = await db.live_sessions.find_one({"_id": oid(session_id)})
    if not s:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    if s.get("host_id") != user["id"] and user.get("role") not in ("admin", "super_admin", "moderator"):
        raise HTTPException(status_code=403, detail="المضيف فقط يستطيع إنهاء الجلسة")
    await db.live_sessions.update_one({"_id": s["_id"]}, {"$set": {"status": "ended", "ended_at": now_iso()}})
    await audit_log(user, "live_session_end", "live_session", session_id, {}, request)
    return {"ok": True}


# --------------------------------------------------------------- school goal
@router.get("/school-goal/my")
async def my_school_goal(user: dict = Depends(get_current_user)):
    school_id = user.get("school_id")
    if not school_id:
        return {"school": None}
    month = _now().strftime("%Y-%m")
    month_start = _now().replace(day=1).date().isoformat()
    goal_doc = await db.school_goals.find_one({"school_id": school_id, "month": month})
    goal = int(goal_doc.get("pages_goal", 5000)) if goal_doc else 5000
    members = await db.users.find({"school_id": school_id}, {"_id": 1, "name": 1}).to_list(2000)
    ids = [str(m["_id"]) for m in members]
    names = {str(m["_id"]): m.get("name") for m in members}
    pages_map: dict[str, int] = {}
    total = 0
    if ids:
        docs = await db.user_daily.find({"user_id": {"$in": ids}, "date": {"$gte": month_start}}).to_list(5000)
        for d in docs:
            pages_map[d["user_id"]] = pages_map.get(d["user_id"], 0) + int(d.get("pages", 0))
            total += int(d.get("pages", 0))
    top = sorted(pages_map.items(), key=lambda kv: kv[1], reverse=True)[:5]
    return {
        "school": {"id": school_id, "name": user.get("school_name")},
        "month": month, "goal": goal, "pages": total,
        "pct": min(100, round(total / goal * 100)) if goal else 0,
        "my_pages": pages_map.get(user["id"], 0),
        "contributors": [{"user_id": uid, "name": names.get(uid), "pages": p} for uid, p in top],
        "members": len(ids),
    }


class SchoolGoalBody(BaseModel):
    school_id: str
    pages_goal: int = Field(ge=100, le=1000000)
    month: str | None = None


@router.put("/school-goal")
async def set_school_goal(body: SchoolGoalBody, request: Request,
                          user: dict = Depends(require_role("admin", "super_admin", "moderator", "teacher"))):
    month = body.month or _now().strftime("%Y-%m")
    await db.school_goals.update_one(
        {"school_id": body.school_id, "month": month},
        {"$set": {"school_id": body.school_id, "month": month, "pages_goal": body.pages_goal,
                  "set_by": user["id"], "updated_at": now_iso()}}, upsert=True)
    await audit_log(user, "school_goal_set", "school", body.school_id, {"goal": body.pages_goal, "month": month}, request)
    return {"ok": True}


# ------------------------------------------------------------ seasonal badges
async def _season_progress(user_id: str, metric: str, start: str, end: str) -> int:
    if metric == "books":
        return await db.reading_progress.count_documents(
            {"user_id": user_id, "percent": {"$gte": 95}, "updated_at": {"$gte": start, "$lte": end}})
    if metric == "pages":
        docs = await db.user_daily.find(
            {"user_id": user_id, "date": {"$gte": start[:10], "$lte": end[:10]}}).to_list(400)
        return int(sum(d.get("pages", 0) for d in docs))
    if metric == "quizzes":
        return await db.quiz_attempts.count_documents(
            {"user_id": user_id, "passed": True, "created_at": {"$gte": start, "$lte": end}})
    return 0


@router.get("/badges/seasonal")
async def seasonal_badges(user: dict = Depends(get_current_user)):
    now = _now()
    defs = await db.skill_badges.find({"seasonal": True}).sort("starts_at", 1).to_list(50)
    earned_docs = await db.user_badges.find({"user_id": user["id"]}).to_list(200)
    earned = {d["badge_key"] for d in earned_docs}
    out = []
    for b in defs:
        start, end = b.get("starts_at") or "", b.get("ends_at") or ""
        if end and end < now.isoformat():
            continue
        target = int(b.get("target", 1))
        progress = await _season_progress(user["id"], b.get("metric", "books"), start, end or now.isoformat())
        newly = False
        if progress >= target and b["key"] not in earned:
            newly = await award_badge(user["id"], b["key"], "season", auto=True)
            if newly:
                earned.add(b["key"])
        try:
            days_left = max(0, (datetime.fromisoformat(end.replace("Z", "+00:00")) - now).days) if end else None
        except Exception:
            days_left = None
        d = ser(b)
        d.update({"progress": progress, "target": target, "earned": b["key"] in earned,
                  "days_left": days_left, "starts_at": start, "ends_at": end})
        out.append(d)
    return out


# ---------------------------------------------------------------- mini-books
class MiniBookBody(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    intro: str = Field(default="", max_length=600)
    pages: list[dict] = Field(default_factory=list, max_length=60)
    source_work_id: str | None = None
    cover_color: str = "#7c3aed"


def _chunk_pages(content: str) -> list[dict]:
    paras = [p.strip() for p in (content or "").split("\n") if p.strip()]
    pages, buf = [], ""
    for p in paras:
        if len(buf) + len(p) > 700 and buf:
            pages.append({"heading": "", "text": buf})
            buf = p
        else:
            buf = f"{buf}\n{p}" if buf else p
    if buf:
        pages.append({"heading": "", "text": buf})
    return pages[:60] or [{"heading": "", "text": content[:2000]}]


@router.get("/minibooks")
async def list_minibooks(q: str = "", user: dict = Depends(get_current_user)):
    query: dict = {"status": "published"}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.mini_books.find(query).sort("created_at", -1).limit(60).to_list(60)
    liked = set()
    like_docs = await db.mini_book_likes.find({"user_id": user["id"]}).to_list(500)
    liked = {d["mini_book_id"] for d in like_docs}
    out = []
    for d in docs:
        o = ser(d)
        o["pages_count"] = len(d.get("pages", []))
        o["liked"] = str(d["_id"]) in liked
        o.pop("pages", None)
        out.append(o)
    return out


@router.get("/minibooks/mine")
async def my_minibooks(user: dict = Depends(get_current_user)):
    docs = await db.mini_books.find({"author_id": user["id"]}).sort("created_at", -1).to_list(60)
    out = []
    for d in docs:
        o = ser(d)
        o["pages_count"] = len(d.get("pages", []))
        out.append(o)
    return out


@router.get("/minibooks/{book_id}")
async def get_minibook(book_id: str, user: dict = Depends(get_current_user)):
    d = await db.mini_books.find_one({"_id": oid(book_id)})
    if not d:
        raise HTTPException(status_code=404, detail="الكتيّب غير موجود")
    await db.mini_books.update_one({"_id": d["_id"]}, {"$inc": {"reads": 1}})
    o = ser(d)
    o["liked"] = bool(await db.mini_book_likes.find_one({"user_id": user["id"], "mini_book_id": book_id}))
    return o


@router.post("/minibooks")
async def create_minibook(body: MiniBookBody, user: dict = Depends(get_current_user)):
    pages = body.pages
    if body.source_work_id:
        work = await db.works.find_one({"_id": oid(body.source_work_id), "author_id": user["id"]})
        if not work:
            raise HTTPException(status_code=404, detail="العمل غير موجود أو ليس لك")
        if not pages:
            pages = _chunk_pages(work.get("content") or "")
    pages = [{"heading": (p.get("heading") or "")[:80], "text": (p.get("text") or "")[:3000]}
             for p in pages if (p.get("text") or "").strip()][:60]
    if not pages:
        raise HTTPException(status_code=400, detail="أضف صفحة واحدة على الأقل")
    doc = {"title": body.title.strip(), "intro": body.intro.strip(), "pages": pages,
           "source_work_id": body.source_work_id, "cover_color": body.cover_color,
           "author_id": user["id"], "author_name": user.get("name"),
           "status": "published", "reads": 0, "likes": 0, "created_at": now_iso()}
    res = await db.mini_books.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@router.post("/minibooks/{book_id}/like")
async def like_minibook(book_id: str, user: dict = Depends(get_current_user)):
    book = await db.mini_books.find_one({"_id": oid(book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="الكتيّب غير موجود")
    existing = await db.mini_book_likes.find_one({"user_id": user["id"], "mini_book_id": book_id})
    if existing:
        await db.mini_book_likes.delete_one({"_id": existing["_id"]})
        await db.mini_books.update_one({"_id": book["_id"]}, {"$inc": {"likes": -1}})
        return {"liked": False}
    await db.mini_book_likes.insert_one({"user_id": user["id"], "mini_book_id": book_id, "created_at": now_iso()})
    await db.mini_books.update_one({"_id": book["_id"]}, {"$inc": {"likes": 1}})
    if book.get("author_id") and book["author_id"] != user["id"]:
        await create_notification(book["author_id"], "social", "إعجاب جديد بكتيّبك 📖",
                                  f"{user.get('name')} أعجب بـ«{book.get('title')}»", "/mini-books")
    return {"liked": True}


@router.delete("/minibooks/{book_id}")
async def delete_minibook(book_id: str, user: dict = Depends(get_current_user)):
    res = await db.mini_books.delete_one({"_id": oid(book_id), "author_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="الكتيّب غير موجود")
    return {"ok": True}


# ---------------------------------------------------------------------- swap
class SwapBody(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    author: str = Field(default="", max_length=80)
    condition: str = Field(default="جيدة", max_length=40)
    note: str = Field(default="", max_length=400)
    want: str = Field(default="", max_length=200)


@router.get("/swap")
async def list_swap(q: str = "", mine: bool = False, user: dict = Depends(get_current_user)):
    query: dict = {}
    if mine:
        query["user_id"] = user["id"]
    else:
        query["status"] = "open"
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    docs = await db.swap_listings.find(query).sort("created_at", -1).limit(80).to_list(80)
    out = []
    for d in docs:
        o = ser(d)
        o["mine"] = d.get("user_id") == user["id"]
        out.append(o)
    return out


@router.post("/swap")
async def create_swap(body: SwapBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "user_id": user["id"], "user_name": user.get("name"),
           "school_name": user.get("school_name"), "status": "open", "created_at": now_iso()}
    res = await db.swap_listings.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


class SwapStatusBody(BaseModel):
    status: str = Field(pattern="^(open|exchanged)$")


@router.patch("/swap/{listing_id}")
async def update_swap(listing_id: str, body: SwapStatusBody, user: dict = Depends(get_current_user)):
    res = await db.swap_listings.update_one(
        {"_id": oid(listing_id), "user_id": user["id"]}, {"$set": {"status": body.status}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"ok": True}


@router.delete("/swap/{listing_id}")
async def delete_swap(listing_id: str, user: dict = Depends(get_current_user)):
    res = await db.swap_listings.delete_one({"_id": oid(listing_id), "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    return {"ok": True}


# ------------------------------------------------------------ wrapped (ملخصي)
@router.get("/wrapped")
async def my_wrapped(user: dict = Depends(get_current_user)):
    uid = user["id"]
    stats = user.get("stats", {}) or {}
    progs = await db.reading_progress.find({"user_id": uid}).to_list(500)
    finished, in_progress = [], 0
    cats: dict[str, int] = {}
    months: dict[str, int] = {}
    for p in progs:
        if (p.get("percent") or 0) >= 95:
            b = await db.books.find_one({"_id": oid(p["book_id"])}, {"title": 1, "category": 1, "pages": 1})
            if b:
                finished.append({"id": str(b["_id"]), "title": b.get("title"),
                                 "pages": b.get("pages") or 0, "category": b.get("category") or "misc"})
                cat = b.get("category") or "misc"
                cats[cat] = cats.get(cat, 0) + 1
            m = (p.get("updated_at") or "")[:7]
            if m:
                months[m] = months.get(m, 0) + 1
        else:
            in_progress += 1
    finished.sort(key=lambda x: x["pages"], reverse=True)
    best_month = max(months.items(), key=lambda kv: kv[1])[0] if months else None
    top_cat = max(cats.items(), key=lambda kv: kv[1])[0] if cats else None
    badges_count = await db.user_badges.count_documents({"user_id": uid})
    quizzes_passed = await db.quiz_attempts.count_documents({"user_id": uid, "passed": True})
    cards_mastered = await db.flashcards.count_documents({"user_id": uid, "reps": {"$gte": 4}})
    mini_books = await db.mini_books.count_documents({"author_id": uid, "status": "published"})
    buddies_count = await db.buddy_pairs.count_documents(
        {"$or": [{"a": uid}, {"b": uid}], "status": {"$in": ["active", "ended"]}})
    return {
        "name": user.get("name"), "school_name": user.get("school_name"),
        "joined_at": user.get("created_at"),
        "xp": user.get("xp", 0), "level": user.get("level", 1),
        "level_title": user.get("level_title", ""), "streak": user.get("streak", 0),
        "books_read": stats.get("books_read", len(finished)),
        "pages_read": stats.get("pages_read", 0),
        "finished_books": finished[:6], "finished_count": len(finished),
        "in_progress": in_progress,
        "top_category": top_cat, "categories": cats,
        "best_month": best_month, "best_month_books": months.get(best_month, 0) if best_month else 0,
        "longest_book": finished[0] if finished else None,
        "badges": badges_count, "quizzes_passed": quizzes_passed,
        "cards_mastered": cards_mastered, "mini_books": mini_books,
        "buddies": buddies_count, "chess_rating": user.get("chess_rating", 1200),
    }
