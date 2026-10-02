from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, effective_permissions
from services import create_notification

router = APIRouter(prefix="/api")


# ---------------- Notifications ----------------
@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 40):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return sers(docs)


@router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    n = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": n}


@router.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"_id": oid(nid), "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Site theme (design switcher) ----------------
THEME_PRESETS = ("emerald", "royal", "sunset", "violet", "ocean", "gold", "rose", "crimson",
                 "midnight", "forest", "desert", "lavender")
_HEX = __import__("re").compile(r"^#[0-9a-fA-F]{6}$")


def _design_config(stored: dict | None) -> dict:
    """الإعدادات الافتراضية + أي قيم محفوظة (تُطهَّر دائماً قبل الإرجاع)."""
    v = (stored or {}).get("value") or {}
    preset = v.get("preset", "emerald")
    if preset not in THEME_PRESETS:
        preset = "emerald"
    custom = v.get("custom")
    if not (isinstance(custom, dict) and all(
            isinstance(custom.get(k), str) and _HEX.match(custom[k])
            for k in ("a", "b", "c", "accent"))):
        custom = None
    eff = v.get("effects") or {}
    return {"preset": preset, "custom": custom,
            "effects": {"grain": bool(eff.get("grain", True)),
                        "motion": bool(eff.get("motion", True))}}


@router.get("/theme")
async def public_theme():
    s = await db.settings.find_one({"key": "theme"})
    return _design_config(s)


# ---------------- Public stats (landing) ----------------
@router.get("/stats/public")
async def public_stats():
    return {
        "students": await db.users.count_documents({"role": "student"}),
        "schools": await db.schools.count_documents({}),
        "books": await db.books.count_documents({"status": "approved"}),
        "events": await db.events.count_documents({"status": "published"}),
        "discussions": await db.discussions.count_documents({}),
        "directorates": await db.directorates.count_documents({}),
        "governorates": await db.governorates.count_documents({}),
        "chess_games": await db.chess_games.count_documents({}),
        "competitions": await db.competitions.count_documents({}),
    }


@router.get("/landing/cms")
async def landing_cms():
    s = await db.settings.find_one({"key": "landing_cms"})
    return (s or {}).get("value", {})


# ---------------- Global Search ----------------
@router.get("/search")
async def global_search(q: str, request: Request):
    if not q or len(q) < 2:
        return {"books": [], "discussions": [], "events": [], "students": [], "schools": []}
    rx = {"$regex": q, "$options": "i"}
    books = await db.books.find({"status": "approved", "$or": [{"title": rx}, {"author": rx}]}).limit(6).to_list(6)
    discussions = await db.discussions.find({"title": rx}).limit(6).to_list(6)
    events = await db.events.find({"status": "published", "title": rx}).limit(6).to_list(6)
    schools = await db.schools.find({"name": rx}).limit(6).to_list(6)
    students = await db.users.find({"role": "student", "name": rx}).limit(6).to_list(6)
    return {
        "books": [{"id": str(b["_id"]), "title": b["title"], "author": b["author"], "cover_url": b.get("cover_url")} for b in books],
        "discussions": [{"id": str(d["_id"]), "title": d["title"], "category": d.get("category")} for d in discussions],
        "events": [{"id": str(e["_id"]), "title": e["title"], "date": e.get("date")} for e in events],
        "schools": [{"id": str(s["_id"]), "name": s["name"], "governorate_name": s.get("governorate_name")} for s in schools],
        "students": [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"), "level": u.get("level", 1)} for u in students],
    }


# ---------------- Public profile ----------------
@router.get("/users/{uid}/profile")
async def public_profile(uid: str, viewer: dict = Depends(get_optional_user)):
    u = await db.users.find_one({"_id": oid(uid)})
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    privacy = u.get("privacy", {})
    rank = await db.users.count_documents({"role": "student", "xp": {"$gt": u.get("xp", 0)}}) + 1
    achievements = await db.achievements.find({"key": {"$in": u.get("achievements", [])}}).to_list(100)
    works = await db.works.find({"author_id": uid, "status": "published"}).sort("likes", -1).limit(6).to_list(6)
    ventures = await db.ventures.find(
        {"$or": [{"owner_id": uid}, {"members.id": uid}]}).sort("updated_at", -1).limit(6).to_list(6)
    followers_count = await db.follows.count_documents({"following_id": uid})
    following_count = await db.follows.count_documents({"follower_id": uid})
    certs_count = await db.certificates.count_documents({"user_id": uid})
    is_following = False
    if viewer and viewer.get("id") != uid:
        is_following = bool(await db.follows.find_one(
            {"follower_id": viewer["id"], "following_id": uid}))
    return {
        "id": str(u["_id"]), "name": u["name"], "role": u.get("role"),
        "avatar_url": u.get("avatar_url"), "bio": u.get("bio"),
        "school_name": u.get("school_name") if privacy.get("show_school", True) else None,
        "directorate_name": u.get("directorate_name") if privacy.get("show_school", True) else None,
        "governorate_name": u.get("governorate_name"),
        "xp": u.get("xp", 0), "level": u.get("level", 1), "level_title": u.get("level_title"),
        "national_rank": rank, "streak": u.get("streak", 0),
        "chess_rating": u.get("chess_rating", 1200),
        "badges": u.get("badges", []),
        "achievements": [{"key": a["key"], "title": a["title"], "icon": a.get("icon"), "badge": a.get("badge")} for a in achievements],
        "stats": u.get("stats", {}) if privacy.get("show_activity", True) else {},
        "followers_count": followers_count, "following_count": following_count,
        "is_following": is_following, "certificates_count": certs_count,
        "frame": (u.get("cosmetics") or {}).get("frame"),
        "title_badge": (u.get("cosmetics") or {}).get("title"),
        "cover_theme": u.get("cover_theme") or "navy",
        "works": [{"id": str(w["_id"]), "title": w["title"], "likes": w.get("likes", 0),
                   "rating_avg": w.get("rating_avg", 0)} for w in works],
        "ventures": [{"id": str(v["_id"]), "title": v["title"], "status": v.get("status")} for v in ventures],
    }


# ---------------- Follows ----------------
@router.post("/users/{uid}/follow")
async def toggle_follow(uid: str, user: dict = Depends(get_current_user)):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك متابعة نفسك")
    target = await db.users.find_one({"_id": oid(uid)}, {"name": 1})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    existing = await db.follows.find_one({"follower_id": user["id"], "following_id": uid})
    if existing:
        await db.follows.delete_one({"_id": existing["_id"]})
        following = False
    else:
        await db.follows.insert_one({"follower_id": user["id"], "following_id": uid,
                                     "created_at": now_iso()})
        await create_notification(uid, "follow", f"بدأ {user['name']} بمتابعتك 🤝", "",
                                  f"/profile/{user['id']}")
        following = True
    count = await db.follows.count_documents({"following_id": uid})
    return {"following": following, "followers_count": count}


async def _user_cards(docs):
    ids = [d["_id"] for d in docs]
    return [{"id": str(u["_id"]), "name": u["name"], "avatar_url": u.get("avatar_url"),
             "role": u.get("role"), "level": u.get("level", 1), "xp": u.get("xp", 0)} for u in docs]


@router.get("/users/{uid}/followers")
async def list_followers(uid: str, limit: int = 50):
    rels = await db.follows.find({"following_id": uid}).sort("created_at", -1).limit(limit).to_list(limit)
    users = []
    for r in rels:
        u = await db.users.find_one({"_id": oid(r["follower_id"])},
                                    {"name": 1, "avatar_url": 1, "role": 1, "level": 1, "xp": 1})
        if u:
            users.append(u)
    return {"items": await _user_cards(users)}


@router.get("/users/{uid}/following")
async def list_following(uid: str, limit: int = 50):
    rels = await db.follows.find({"follower_id": uid}).sort("created_at", -1).limit(limit).to_list(limit)
    users = []
    for r in rels:
        u = await db.users.find_one({"_id": oid(r["following_id"])},
                                    {"name": 1, "avatar_url": 1, "role": 1, "level": 1, "xp": 1})
        if u:
            users.append(u)
    return {"items": await _user_cards(users)}


@router.get("/feed/following")
async def following_feed(user: dict = Depends(get_current_user)):
    rels = await db.follows.find({"follower_id": user["id"]}).to_list(500)
    ids = [r["following_id"] for r in rels]
    if not ids:
        return {"items": []}
    works = await db.works.find({"author_id": {"$in": ids}, "status": "published"}) \
        .sort("published_at", -1).limit(20).to_list(20)
    ventures = await db.ventures.find({"owner_id": {"$in": ids}}) \
        .sort("created_at", -1).limit(20).to_list(20)
    items = []
    for w in works:
        items.append({"kind": "work", "id": str(w["_id"]), "title": w["title"],
                      "author_id": w.get("author_id"), "author_name": w.get("author_name"),
                      "likes": w.get("likes", 0), "created_at": w.get("published_at") or w.get("created_at")})
    for v in ventures:
        items.append({"kind": "venture", "id": str(v["_id"]), "title": v["title"],
                      "author_id": v.get("owner_id"), "author_name": v.get("owner_name"),
                      "likes": v.get("votes_count", 0), "created_at": v.get("created_at")})
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"items": items[:30]}


# ---------------- Student dashboard aggregate ----------------
@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()
    daily = await db.user_daily.find_one({"user_id": uid, "date": today})
    rank = await db.users.count_documents({"role": "student", "xp": {"$gt": user.get("xp", 0)}}) + 1
    school_rank = None
    if user.get("school_id"):
        school_rank = await db.users.count_documents({"role": "student", "school_id": user["school_id"], "xp": {"$gt": user.get("xp", 0)}}) + 1
    reading = await db.reading_progress.find({"user_id": uid}).sort("updated_at", -1).limit(3).to_list(3)
    reading_out = []
    for p in reading:
        b = await db.books.find_one({"_id": oid(p["book_id"])})
        if b:
            reading_out.append({"id": str(b["_id"]), "title": b["title"], "author": b["author"],
                                "cover_url": b.get("cover_url"), "progress": p.get("percent", 0)})
    events = await db.events.find({"status": "published"}).sort("date", 1).limit(3).to_list(3)
    competitions = await db.competitions.find({"status": "open"}).sort("start_at", -1).limit(3).to_list(3)
    chess_challenges = await db.chess_challenges.count_documents({"opponent_id": uid, "status": "pending"})
    unread = await db.notifications.count_documents({"user_id": uid, "read": False})
    my_ventures = await db.ventures.find(
        {"$or": [{"owner_id": uid}, {"members.id": uid}]}).sort("updated_at", -1).limit(3).to_list(3)
    active_chess = await db.chess_games.count_documents(
        {"$or": [{"white_id": uid}, {"black_id": uid}], "status": "active"})
    recent_notifs = await db.notifications.find({"user_id": uid}).sort("created_at", -1).limit(5).to_list(5)
    later_docs = await db.later_books.find({"user_id": uid}).sort("created_at", -1).limit(4).to_list(4)
    later_out = []
    for d in later_docs:
        b = await db.books.find_one({"_id": oid(d["book_id"])})
        if b:
            later_out.append({"id": str(b["_id"]), "title": b["title"], "author": b["author"],
                              "cover_url": b.get("cover_url") or b.get("cover_path")})
    later_count = await db.later_books.count_documents({"user_id": uid})
    my_playlists = await db.playlists.find({"user_id": uid}).sort("updated_at", -1).limit(4).to_list(4)
    return {
        "xp": user.get("xp", 0), "level": user.get("level", 1),
        "level_title": user.get("level_title", "قارئ مبتدئ"), "streak": user.get("streak", 0),
        "national_rank": rank, "school_rank": school_rank,
        "currently_reading": reading_out,
        "upcoming_events": [{"id": str(e["_id"]), "title": e["title"], "date": e.get("date"), "mode": e.get("mode")} for e in events],
        "open_competitions": [{"id": str(c["_id"]), "title": c["title"], "type": c.get("type")} for c in competitions],
        "chess_challenges": chess_challenges,
        "unread_notifications": unread,
        "books_read": user.get("stats", {}).get("books_read", 0),
        "pages_read": user.get("stats", {}).get("pages_read", 0),
        "pages_today": (daily or {}).get("pages", 0),
        "daily_goal": user.get("daily_goal_pages") or 20,
        "later_books": later_out,
        "later_count": later_count,
        "my_playlists": [{"id": str(p["_id"]), "name": p.get("name", ""), "color": p.get("color", "#2563EB"),
                          "icon": p.get("icon", "ListMusic"), "count": len(p.get("book_ids", []))}
                         for p in my_playlists],
        "posts": user.get("stats", {}).get("posts", 0),
        "chess_rating": user.get("chess_rating", 1200),
        "my_ventures": [{"id": str(v["_id"]), "title": v.get("title"), "status": v.get("status"),
                         "is_owner": v.get("owner_id") == uid} for v in my_ventures],
        "active_chess": active_chess,
        "recent_notifications": [{"id": str(n["_id"]), "title": n.get("title"), "body": n.get("body"),
                                  "link": n.get("link"), "read": n.get("read", False),
                                  "created_at": n.get("created_at")} for n in recent_notifs],
    }
