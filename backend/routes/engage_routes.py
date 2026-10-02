"""Engagement: daily quests, the live activity feed, and online presence."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, require_permission, effective_permissions
from services import award_xp, get_today_quests, create_notification, audit_log, track_quest, log_activity

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


# ---------------- My week (ISO week, Mon-Sun) ----------------
@router.get("/stats/my-week")
async def my_week(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    last_monday = monday - timedelta(days=7)
    next_monday = monday + timedelta(days=7)
    monday_s = monday.isoformat()
    ws = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc).isoformat()
    daily = await db.user_daily.find(
        {"user_id": user["id"],
         "date": {"$gte": last_monday.isoformat(), "$lt": next_monday.isoformat()}}
    ).to_list(14)
    pages_this_week = sum(r.get("pages", 0) for r in daily if r.get("date", "") >= monday_s)
    pages_last_week = sum(r.get("pages", 0) for r in daily if r.get("date", "") < monday_s)
    active_days = min(7, sum(1 for r in daily
                             if r.get("date", "") >= monday_s and r.get("pages", 0) > 0))
    xp_rows = await db.xp_transactions.aggregate([
        {"$match": {"user_id": user["id"], "created_at": {"$gte": ws}, "amount": {"$gt": 0}}},
        {"$group": {"_id": None, "xp": {"$sum": "$amount"}}},
    ]).to_list(1)
    focus_rows = await db.focus_sessions.find(
        {"user_id": user["id"], "at": {"$gte": ws}}).to_list(1000)
    return {
        "pages_this_week": int(pages_this_week),
        "pages_last_week": int(pages_last_week),
        "xp_this_week": int(xp_rows[0]["xp"]) if xp_rows else 0,
        "focus_min_week": int(sum(r.get("minutes", 0) for r in focus_rows)),
        "active_days": int(active_days),
    }


# ---------------- Learning paths ----------------
async def _step_done(uid: str, step: dict) -> bool:
    k, ref = step.get("kind"), step.get("ref_id")
    if k == "book":
        p = await db.reading_progress.find_one({"user_id": uid, "book_id": ref})
        return bool(p and p.get("percent", 0) >= 95)
    if k == "problem":
        return await db.coding_submissions.find_one(
            {"user_id": uid, "problem_id": ref, "verdict": "accepted"}) is not None
    if k == "competition":
        return await db.competition_entries.find_one(
            {"competition_id": ref, "user_id": uid, "submitted": True}) is not None
    return False


@router.get("/paths")
async def list_paths(user: dict = Depends(get_current_user)):
    paths = await db.learning_paths.find({}).sort("created_at", -1).to_list(50)
    claims = {c["path_id"]: set(c.get("claimed", [])) for c in await db.path_progress.find({"user_id": user["id"]}).to_list(50)}
    out = []
    for p in paths:
        d = ser(p)
        done = 0
        for i, s in enumerate(d["steps"]):
            done += 1 if await _step_done(user["id"], s) else 0
        d["done_steps"] = done
        d["claimed_steps"] = len(claims.get(d["id"], set()))
        d["total_xp"] = sum(s.get("xp", 10) for s in d["steps"])
        out.append(d)
    return out


@router.post("/paths/{pid}/steps/{idx}/claim")
async def claim_step(pid: str, idx: int, user: dict = Depends(get_current_user)):
    p = await db.learning_paths.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسار غير موجود")
    steps = p.get("steps", [])
    if not (0 <= idx < len(steps)):
        raise HTTPException(status_code=400, detail="خطوة غير صالحة")
    step = steps[idx]
    prog = await db.path_progress.find_one({"user_id": user["id"], "path_id": pid}) or {"claimed": []}
    if idx in prog.get("claimed", []):
        return {"ok": True, "already": True, "xp": 0}
    if not await _step_done(user["id"], step):
        raise HTTPException(status_code=400, detail="أكمل الخطوة أولاً (اقرأ الكتاب كاملاً / حل المسألة / شارك في المسابقة)")
    await db.path_progress.update_one({"user_id": user["id"], "path_id": pid},
                                      {"$addToSet": {"claimed": idx}, "$set": {"updated_at": now_iso()}}, upsert=True)
    xp = step.get("xp", 10)
    await award_xp(user["id"], xp, f"خطوة مسار: {p['title']}", pid)
    claimed_count = len(set(prog.get("claimed", [])) | {idx})
    if claimed_count == len(steps) and len(steps) > 0:
        await award_xp(user["id"], 100, f"إكمال مسار {p['title']} 🎉", pid)
        await create_notification(user["id"], "achievement", "أكملت مساراً كاملاً! 🛤️",
                                  f"{p['title']} · +100 خبرة إضافية")
        await log_activity(user, "path_completed", pid, f"أكمل مسار {p['title']}")
    return {"ok": True, "xp": xp}


class PathBody(BaseModel):
    title: str
    desc: str = ""
    icon: str = "🛤️"
    color: str = "#059669"
    steps: list[dict]


@router.post("/paths")
async def create_path(body: PathBody, request: Request,
                      user: dict = Depends(require_permission("cms.manage"))):
    if len(body.steps) == 0 or len(body.steps) > 30:
        raise HTTPException(status_code=400, detail="المسار يحتاج 1–30 خطوة")
    doc = {**body.model_dump(), "created_by": user["id"], "created_at": now_iso()}
    res = await db.learning_paths.insert_one(doc)
    await audit_log(user, "path_create", "learning_path", str(res.inserted_id), request=request)
    return {"id": str(res.inserted_id)}


@router.put("/paths/{pid}")
async def update_path(pid: str, body: PathBody, request: Request,
                      user: dict = Depends(require_permission("cms.manage"))):
    if not await db.learning_paths.find_one({"_id": oid(pid)}):
        raise HTTPException(status_code=404, detail="المسار غير موجود")
    await db.learning_paths.update_one({"_id": oid(pid)}, {"$set": body.model_dump()})
    await audit_log(user, "path_update", "learning_path", pid, request=request)
    return {"ok": True}


@router.delete("/paths/{pid}")
async def delete_path(pid: str, request: Request,
                      user: dict = Depends(require_permission("cms.manage"))):
    res = await db.learning_paths.delete_one({"_id": oid(pid)})
    await audit_log(user, "path_delete", "learning_path", pid, request=request)
    return {"ok": True, "deleted": bool(res.deleted_count)}


# ---------------- Community square ----------------
class PostBody(BaseModel):
    text: str


@router.get("/feed/posts")
async def feed_posts(user: dict = Depends(get_current_user)):
    docs = await db.feed_posts.find({}).sort("created_at", -1).limit(40).to_list(40)
    out = []
    for d in docs:
        x = ser(d)
        x["liked"] = user["id"] in x.get("likes", [])
        x["likes"] = len(x.get("likes", []))
        out.append(x)
    return out


@router.post("/feed/posts")
async def create_post(body: PostBody, user: dict = Depends(get_current_user)):
    text = body.text.strip()
    if len(text) < 2 or len(text) > 1000:
        raise HTTPException(status_code=400, detail="المنشور بين 2 و 1000 حرف")
    doc = {"user_id": user["id"], "user_name": user["name"],
           "user_avatar": user.get("avatar_url"), "text": text,
           "likes": [], "created_at": now_iso()}
    res = await db.feed_posts.insert_one(doc)
    await track_quest(user["id"], "post")
    return {"id": str(res.inserted_id)}


@router.post("/feed/posts/{pid}/like")
async def like_post(pid: str, user: dict = Depends(get_current_user)):
    d = await db.feed_posts.find_one({"_id": oid(pid)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in d.get("likes", []):
        await db.feed_posts.update_one({"_id": oid(pid)}, {"$pull": {"likes": user["id"]}})
        return {"liked": False}
    await db.feed_posts.update_one({"_id": oid(pid)}, {"$addToSet": {"likes": user["id"]}})
    if d["user_id"] != user["id"]:
        await create_notification(d["user_id"], "follow", "إعجاب بمنشورك ❤️", user["name"], "/community")
    return {"liked": True}


@router.delete("/feed/posts/{pid}")
async def delete_post(pid: str, user: dict = Depends(get_current_user)):
    d = await db.feed_posts.find_one({"_id": oid(pid)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if d["user_id"] != user["id"] and "content.moderate" not in effective_permissions(user):
        raise HTTPException(status_code=403, detail="ليس منشورك")
    await db.feed_posts.delete_one({"_id": oid(pid)})
    return {"ok": True}


# ---------------- Seasons & hall of fame ----------------
@router.get("/seasons/champions")
async def season_champions():
    from datetime import timezone
    now = datetime.now(timezone.utc)
    months = []
    y, m = now.year, now.month
    for _ in range(3):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        months.append((y, m))
    out = []
    for (yy, mm) in months:
        prefix = f"{yy:04d}-{mm:02d}"
        rows = await db.xp_transactions.aggregate([
            {"$match": {"amount": {"$gt": 0}, "created_at": {"$regex": f"^{prefix}"}}},
            {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
            {"$sort": {"xp": -1}}, {"$limit": 3},
        ]).to_list(3)
        champs = []
        for r in rows:
            u = await db.users.find_one({"_id": oid(r["_id"])}, {"name": 1})
            champs.append({"id": r["_id"], "name": u["name"] if u else "طالب", "xp": r["xp"]})
        out.append({"month": prefix, "champions": champs})
    return out


# ---------------- Reading challenges ----------------
class ChallengeBody(BaseModel):
    title: str
    target_pages: int
    days: int = 7


@router.get("/reading-challenges")
async def list_challenges(user: dict = Depends(get_current_user)):
    docs = await db.reading_challenges.find({}).sort("created_at", -1).limit(30).to_list(30)
    out = []
    today = datetime.now(timezone.utc).date().isoformat()
    for c in docs:
        d = ser(c)
        members = []
        for mem in d.get("members", []):
            pages = await _user_pages_between(mem["user_id"], mem["joined_at"][:10], today)
            members.append({**mem, "pages": min(pages, d["target_pages"])})
        members.sort(key=lambda x: -x["pages"])
        d["members"] = members
        d["member_count"] = len(members)
        d["joined"] = any(m["user_id"] == user["id"] for m in members)
        out.append(d)
    return out


async def _user_pages_between(uid: str, date_from: str, date_to: str) -> int:
    rows = await db.user_daily.find(
        {"user_id": uid, "date": {"$gte": date_from, "$lte": date_to}}).to_list(400)
    return sum(r.get("pages", 0) for r in rows)


@router.post("/reading-challenges")
async def create_challenge(body: ChallengeBody, user: dict = Depends(get_current_user)):
    title = body.title.strip()
    if len(title) < 3:
        raise HTTPException(status_code=400, detail="العنوان قصير")
    if not (50 <= body.target_pages <= 100000):
        raise HTTPException(status_code=400, detail="الهدف بين 50 و 100000 صفحة")
    if not (1 <= body.days <= 90):
        raise HTTPException(status_code=400, detail="المدة بين 1 و 90 يوماً")
    from datetime import timedelta as _td
    today = datetime.now(timezone.utc).date()
    doc = {"title": title, "target_pages": body.target_pages,
           "creator_id": user["id"], "creator_name": user["name"],
           "starts": today.isoformat(),
           "ends": (today + _td(days=body.days)).isoformat(),
           "members": [{"user_id": user["id"], "name": user["name"], "joined_at": now_iso()}],
           "created_at": now_iso()}
    res = await db.reading_challenges.insert_one(doc)
    return {"id": str(res.inserted_id)}


@router.post("/reading-challenges/{cid}/join")
async def join_challenge(cid: str, user: dict = Depends(get_current_user)):
    c = await db.reading_challenges.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    if any(m["user_id"] == user["id"] for m in c.get("members", [])):
        return {"ok": True, "already": True}
    await db.reading_challenges.update_one({"_id": oid(cid)},
        {"$push": {"members": {"user_id": user["id"], "name": user["name"], "joined_at": now_iso()}}})
    return {"ok": True}


# ---------------- Focus rooms ----------------
FOCUS_MOODS = {"violet", "emerald", "ocean", "sunset", "rose", "slate"}


class FocusRoomBody(BaseModel):
    name: str
    mood: str = "violet"
    goal_min: int = 25
    topic: str = ""


@router.get("/focus/stats/me")
async def focus_stats_me(user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone, timedelta
    rows = await db.focus_sessions.find({"user_id": user["id"]}).sort("at", -1).to_list(1000)
    now = datetime.now(timezone.utc)
    today_key = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7)).isoformat()
    today_min = sum(r.get("minutes", 0) for r in rows if str(r.get("at", "")).startswith(today_key))
    week_min = sum(r.get("minutes", 0) for r in rows if str(r.get("at", "")) >= week_ago)
    best = max((r.get("minutes", 0) for r in rows), default=0)
    live = await db.focus_rooms.find({"members.user_id": user["id"]}).to_list(5)
    live_min = sum(int(m.get("focus_min", 0)) for g in live for m in g.get("members", [])
                   if m.get("user_id") == user["id"])
    return {"today_min": int(today_min), "week_min": int(week_min),
            "sessions": len(rows), "best_min": int(best), "live_min": int(live_min)}


@router.get("/focus/leaderboard")
async def focus_leaderboard(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    ws = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc).isoformat()
    rows = await db.focus_sessions.aggregate([
        {"$match": {"at": {"$gte": ws}}},
        {"$group": {"_id": "$user_id", "minutes": {"$sum": "$minutes"}}},
        {"$sort": {"minutes": -1}},
        {"$limit": 25},
    ]).to_list(25)
    items = []
    for r in rows:
        u = await db.users.find_one({"_id": oid(r["_id"])}, {"name": 1})
        if not u:
            continue
        items.append({"user_id": r["_id"], "name": u.get("name", ""),
                      "minutes": int(r["minutes"])})
        if len(items) >= 10:
            break
    return {"items": items}


@router.get("/focus/rooms")
async def list_rooms(user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat().replace("+00:00", "Z")
    docs = await db.focus_rooms.find({"updated_at": {"$gte": cutoff}}).sort("updated_at", -1).limit(20).to_list(20)
    out = []
    for d in docs:
        x = ser(d)
        x["member_count"] = len(x.get("members", []))
        x["inside"] = any(m["user_id"] == user["id"] for m in x.get("members", []))
        out.append(x)
    return out


@router.post("/focus/rooms")
async def create_room(body: FocusRoomBody, user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="اسم الغرفة قصير")
    doc = {"name": name, "host_id": user["id"], "host_name": user["name"],
           "mood": body.mood if body.mood in FOCUS_MOODS else "violet",
           "goal_min": min(120, max(10, int(body.goal_min or 25))),
           "topic": (body.topic or "").strip()[:80],
           "members": [{"user_id": user["id"], "name": user["name"], "focus_min": 0,
                        "joined_at": now_iso(), "claimed": False}],
           "created_at": now_iso(), "updated_at": now_iso()}
    res = await db.focus_rooms.insert_one(doc)
    return {"id": str(res.inserted_id)}


@router.post("/focus/rooms/{rid}/join")
async def join_room(rid: str, user: dict = Depends(get_current_user)):
    r = await db.focus_rooms.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    if not any(m["user_id"] == user["id"] for m in r.get("members", [])):
        await db.focus_rooms.update_one({"_id": oid(rid)},
            {"$push": {"members": {"user_id": user["id"], "name": user["name"],
                                    "focus_min": 0, "joined_at": now_iso(), "claimed": False}},
             "$set": {"updated_at": now_iso()}})
    return {"ok": True}


@router.post("/focus/rooms/{rid}/heartbeat")
async def room_heartbeat(rid: str, body: dict, user: dict = Depends(get_current_user)):
    add = body.get("add_minutes", 0)
    if not isinstance(add, (int, float)) or add < 0 or add > 5:
        raise HTTPException(status_code=400, detail="دفعة دقائق غير صالحة")
    res = await db.focus_rooms.update_one(
        {"_id": oid(rid), "members.user_id": user["id"]},
        {"$inc": {"members.$.focus_min": int(add)}, "$set": {"updated_at": now_iso()}})
    return {"ok": bool(res.modified_count)}


@router.post("/focus/rooms/{rid}/leave")
async def leave_room(rid: str, user: dict = Depends(get_current_user)):
    r = await db.focus_rooms.find_one({"_id": oid(rid)})
    if not r:
        return {"ok": True}
    me = next((m for m in r.get("members", []) if m["user_id"] == user["id"]), None)
    xp = 0
    if me and int(me.get("focus_min", 0)) >= 1:
        await db.focus_sessions.insert_one(
            {"user_id": user["id"], "name": user.get("name"),
             "minutes": int(me["focus_min"]), "room_id": rid, "at": now_iso()})
    if me and not me.get("claimed") and me.get("focus_min", 0) >= 10:
        xp = min(30, int(me["focus_min"]))
        await db.focus_rooms.update_one({"_id": oid(rid), "members.user_id": user["id"]},
                                        {"$set": {"members.$.claimed": True}})
        await award_xp(user["id"], xp, "جلسة تركيز 📚", rid)
        await log_activity(user, "focus_session", rid, f"أنهى جلسة تركيز ({int(me['focus_min'])} د)")
    await db.focus_rooms.update_one({"_id": oid(rid)}, {"$pull": {"members": {"user_id": user["id"]}}})
    return {"ok": True, "xp": xp}


@router.get("/focus/rooms/{rid}")
async def get_room(rid: str, user: dict = Depends(get_current_user)):
    r = await db.focus_rooms.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    return ser(r)


# ---------------- Event reminders ----------------
class RemindBody(BaseModel):
    event_id: str


@router.post("/events/remind")
async def toggle_remind(body: RemindBody, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"_id": oid(body.event_id)})
    if not ev:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    ex = await db.event_reminders.find_one({"user_id": user["id"], "event_id": body.event_id})
    if ex:
        await db.event_reminders.delete_one({"_id": ex["_id"]})
        return {"remind": False}
    await db.event_reminders.insert_one({"user_id": user["id"], "event_id": body.event_id,
                                          "sent": False, "created_at": now_iso()})
    return {"remind": True}


@router.get("/events/reminders/mine")
async def my_reminders(user: dict = Depends(get_current_user)):
    docs = await db.event_reminders.find({"user_id": user["id"]}).to_list(100)
    return [d["event_id"] for d in docs]


# ---------------- Points store (cosmetics) ----------------
STORE_ITEMS = [
    {"key": "frame_emerald", "kind": "frame", "name": "إطار الزمرد", "cost": 300},
    {"key": "frame_gold", "kind": "frame", "name": "إطار الذهب", "cost": 800},
    {"key": "frame_galaxy", "kind": "frame", "name": "إطار المجرّة", "cost": 1500},
    {"key": "title_reader", "kind": "title", "name": "القارئ النهم", "cost": 200},
    {"key": "title_chess", "kind": "title", "name": "عبقري الشطرنج", "cost": 600},
    {"key": "title_thinker", "kind": "title", "name": "مفكّر المستقبل", "cost": 1200},
    {"key": "title_legend", "kind": "title", "name": "أسطورة النادي", "cost": 3000},
    {"key": "item_freeze", "kind": "item", "name": "حماية السلسلة ❄️", "cost": 150},
]
_STORE_BY_KEY = {i["key"]: i for i in STORE_ITEMS}


@router.get("/store")
async def store_list(user: dict = Depends(get_current_user)):
    me = await db.users.find_one({"_id": _me_oid(user)})
    owned = (me or {}).get("store_items", [])
    cosmetics = (me or {}).get("cosmetics", {})
    items = [{**i, "owned": (False if i["kind"] == "item" else i["key"] in owned),
              "equipped": (cosmetics.get("frame") == i["key"] if i["kind"] == "frame"
                           else cosmetics.get("title") == i["name"])}
             for i in STORE_ITEMS]
    return {"items": items, "xp": (me or {}).get("xp", 0), "cosmetics": cosmetics,
            "streak_freezes": (me or {}).get("streak_freezes", 0)}


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
    if item["kind"] != "item" and body.key in (me.get("store_items") or []):
        raise HTTPException(status_code=400, detail="تملك هذا العنصر بالفعل")
    if (me.get("xp", 0) or 0) < item["cost"]:
        raise HTTPException(status_code=400, detail="نقاطك لا تكفي")
    await award_xp(user["id"], -item["cost"], f"شراء: {item['name']}", item["key"])
    if item["kind"] == "item":
        await db.users.update_one({"_id": _me_oid(user)}, {"$inc": {"streak_freezes": 1}})
    else:
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
