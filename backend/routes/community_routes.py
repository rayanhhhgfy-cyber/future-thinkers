from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timedelta, timezone
import re
import secrets
import unicodedata
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import award_xp, bump_stat, create_notification, audit_log

try:
    from zoneinfo import ZoneInfo
    _AMMAN = ZoneInfo("Asia/Amman")
except Exception:  # pragma: no cover - tzdata missing fallback
    _AMMAN = timezone(timedelta(hours=3))

router = APIRouter(prefix="/api")

# ---------- Clubs ----------
def _slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or f"club-{secrets.token_hex(3)}"


class ClubBody(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    slug: str | None = None
    description: str = ""
    icon: str = "Users"
    color: str = "#2563EB"


class ClubPatchBody(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None


async def _club_or_404(slug: str) -> dict:
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    return c


def _club_manager(user: dict | None, club: dict) -> bool:
    """مؤسس النادي (created_by) أو إدارة المنصة · لا توجد رتب داخل عضوية الأندية."""
    if not user:
        return False
    if user.get("role") in ("admin", "super_admin"):
        return True
    if club.get("created_by") and club["created_by"] == user["id"]:
        return True
    return "club.edit" in effective_permissions(user)


def _month_key() -> str:
    n = datetime.now(_AMMAN)
    return f"{n.year:04d}-{n.month:02d}"


async def _club_member_rows(slug: str):
    """أعضاء النادي مع لقطة XP شهرية كسولة (Asia/Amman) كنمط دوائر الدراسة الأسبوعي."""
    mems = await db.club_members.find({"club_slug": slug}).to_list(500)
    if not mems:
        return []
    key = _month_key()
    ids = [o for o in (oid(m["user_id"]) for m in mems) if o]
    users = {}
    if ids:
        async for u in db.users.find({"_id": {"$in": ids}}):
            users[str(u["_id"])] = u
    rows = []
    for m in mems:
        u = users.get(m["user_id"])
        if not u:
            continue
        xp = u.get("xp", 0)
        if m.get("month_key") != key:
            await db.club_members.update_one({"_id": m["_id"]},
                {"$set": {"month_key": key, "month_base": xp}})
            m["month_key"], m["month_base"] = key, xp
        rows.append({
            "id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
            "xp": xp, "level": u.get("level", 1), "avatar_url": u.get("avatar_url"),
            "month_xp": max(0, xp - m.get("month_base", xp)),
        })
    return rows
@router.get("/clubs")
async def list_clubs(request: Request):
    docs = await db.clubs.find({}).to_list(50)
    user = await get_optional_user(request)
    mine = set()
    if user:
        mems = await db.club_members.find({"user_id": user["id"]}).to_list(50)
        mine = {m["club_id"] for m in mems}
    out = []
    for c in docs:
        d = ser(c)
        d["is_member"] = d["id"] in mine
        out.append(d)
    return out


@router.get("/clubs/{slug}")
async def get_club(slug: str, request: Request):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    d = ser(c)
    d["members_count"] = await db.club_members.count_documents({"club_id": d["id"]})
    d["discussions_count"] = await db.discussions.count_documents({"club_slug": slug})
    user = await get_optional_user(request)
    d["is_member"] = bool(user and await db.club_members.find_one({"club_id": d["id"], "user_id": user["id"]}))
    return d


@router.post("/clubs")
async def create_club(body: ClubBody, request: Request, user: dict = Depends(require_permission("club.create"))):
    slug = (body.slug or "").strip().lower() or _slugify(body.name)
    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise HTTPException(status_code=400, detail="المعرّف (slug) يجب أن يكون أحرفاً إنجليزية صغيرة أو أرقام أو شرطات")
    if await db.clubs.find_one({"slug": slug}):
        raise HTTPException(status_code=400, detail="هذا المعرّف مستخدم مسبقاً")
    doc = {"slug": slug, "name": body.name.strip(), "description": body.description,
           "icon": body.icon, "color": body.color,
           "members_count": 0, "created_at": now_iso(), "created_by": user["id"]}
    res = await db.clubs.insert_one(doc)
    await audit_log(user, "club_create", "club", slug, {"name": body.name}, request)
    return ser({**doc, "_id": res.inserted_id})


@router.patch("/clubs/{slug}")
async def update_club(slug: str, body: ClubPatchBody, request: Request, user: dict = Depends(require_permission("club.edit"))):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد حقول للتحديث")
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    await db.clubs.update_one({"_id": c["_id"]}, {"$set": {**updates, "updated_at": now_iso()}})
    await audit_log(user, "club_update", "club", slug, updates, request)
    return ser(await db.clubs.find_one({"_id": c["_id"]}) )


@router.delete("/clubs/{slug}")
async def delete_club(slug: str, request: Request, user: dict = Depends(require_permission("club.delete"))):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    await db.clubs.delete_one({"_id": c["_id"]})
    await db.club_members.delete_many({"club_slug": slug})
    await audit_log(user, "club_delete", "club", slug, request=request)
    return {"ok": True}


@router.post("/clubs/{slug}/join")
async def join_club(slug: str, user: dict = Depends(get_current_user)):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    cid = str(c["_id"])
    if await db.club_members.find_one({"club_id": cid, "user_id": user["id"]}):
        return {"joined": True}
    await db.club_members.insert_one({"club_id": cid, "club_slug": slug, "user_id": user["id"], "created_at": now_iso()})
    await db.clubs.update_one({"_id": c["_id"]}, {"$inc": {"members_count": 1}})
    return {"joined": True}


@router.post("/clubs/{slug}/leave")
async def leave_club(slug: str, user: dict = Depends(get_current_user)):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    res = await db.club_members.delete_one({"club_id": str(c["_id"]), "user_id": user["id"]})
    if res.deleted_count:
        await db.clubs.update_one({"_id": c["_id"]}, {"$inc": {"members_count": -1}})
    return {"joined": False}


@router.get("/clubs/{slug}/members")
async def club_members(slug: str, limit: int = 50):
    rows = await _club_member_rows(slug)
    return rows[:limit]


@router.get("/clubs/{slug}/leaders")
async def club_leaders(slug: str, period: str = "all"):
    await _club_or_404(slug)
    rows = await _club_member_rows(slug)
    field = "month_xp" if period == "month" else "xp"
    rows.sort(key=lambda r: -r[field])
    return [{**r, "rank": i + 1} for i, r in enumerate(rows[:10])]


# ---------- Club announcements ----------

class ClubAnnouncementBody(BaseModel):
    title: str = Field(default="", max_length=120)
    text: str = Field(min_length=1, max_length=2000)


@router.get("/clubs/{slug}/announcements")
async def list_club_announcements(slug: str, request: Request):
    await _club_or_404(slug)
    user = await get_optional_user(request)
    docs = await db.club_announcements.find({"club_slug": slug}).sort("created_at", -1).to_list(100)
    out = []
    for a in docs:
        d = ser(a)
        d["mine"] = bool(user and user["id"] == a["author_id"])
        out.append(d)
    return out


@router.post("/clubs/{slug}/announcements")
async def create_club_announcement(slug: str, body: ClubAnnouncementBody,
                                   user: dict = Depends(get_current_user)):
    c = await _club_or_404(slug)
    if not _club_manager(user, c):
        raise HTTPException(status_code=403, detail="إعلانات النادي ينشرها مؤسس النادي أو الإدارة فقط")
    doc = {"club_slug": slug, "author_id": user["id"], "author_name": user["name"],
           "title": body.title.strip(), "text": body.text.strip(), "created_at": now_iso()}
    res = await db.club_announcements.insert_one(doc)
    note_body = ((doc["title"] + " · ") if doc["title"] else "") + doc["text"]
    mems = await db.club_members.find({"club_id": str(c["_id"])}).to_list(1000)
    for m in mems:
        if m["user_id"] != user["id"]:
            await create_notification(m["user_id"], "club", "إعلان من ناديك 📣",
                                      note_body[:140], f"/clubs/{slug}")
    return ser({**doc, "_id": res.inserted_id})


@router.delete("/clubs/{slug}/announcements/{ann_id}")
async def delete_club_announcement(slug: str, ann_id: str, user: dict = Depends(get_current_user)):
    c = await _club_or_404(slug)
    a = await db.club_announcements.find_one({"_id": oid(ann_id), "club_slug": slug})
    if not a:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    if a["author_id"] != user["id"] and not _club_manager(user, c):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية حذف هذا الإعلان")
    await db.club_announcements.delete_one({"_id": a["_id"]})
    return {"status": "deleted"}


# ---------- Discussions (forum) ----------
DISCUSSION_CATEGORIES = ["علوم", "ثقافة", "تقنية", "كتب", "مجتمع", "فلسفة", "تعليم", "ريادة أعمال"]


class DiscussionBody(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1)
    category: str = "مجتمع"
    club_slug: str = "dialogue"


@router.get("/discussions/categories")
async def disc_categories():
    return DISCUSSION_CATEGORIES


@router.get("/discussions")
async def list_discussions(club_slug: str | None = None, category: str | None = None,
                           q: str | None = None, sort: str = "recent", page: int = 1, limit: int = 15):
    query = {}
    if club_slug:
        query["club_slug"] = club_slug
    if category:
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    sf = {"recent": ("last_activity", -1), "popular": ("likes_count", -1), "replies": ("replies_count", -1)}.get(sort, ("last_activity", -1))
    total = await db.discussions.count_documents(query)
    docs = await db.discussions.find(query).sort(*sf).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total, "page": page}


@router.post("/discussions")
async def create_discussion(body: DiscussionBody, request: Request, user: dict = Depends(get_current_user)):
    doc = {
        "title": body.title, "body": body.body, "category": body.category, "club_slug": body.club_slug,
        "author_id": user["id"], "author_name": user["name"], "author_school": user.get("school_name"),
        "likes": [], "likes_count": 0, "replies_count": 0, "views": 0,
        "followers": [user["id"]], "status": "published",
        "created_at": now_iso(), "last_activity": now_iso(),
    }
    res = await db.discussions.insert_one(doc)
    await bump_stat(user["id"], "posts", 1)
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("create_discussion", 15), "إنشاء نقاش", str(res.inserted_id))
    await audit_log(user, "discussion_create", "discussion", str(res.inserted_id))
    return {"id": str(res.inserted_id)}


@router.get("/discussions/{disc_id}")
async def get_discussion(disc_id: str, request: Request):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="النقاش غير موجود")
    await db.discussions.update_one({"_id": d["_id"]}, {"$inc": {"views": 1}})
    replies = await db.discussion_replies.find({"discussion_id": disc_id}).sort("created_at", 1).to_list(500)
    user = await get_optional_user(request)
    out = ser(d)
    out["liked"] = bool(user and user["id"] in d.get("likes", []))
    out["following"] = bool(user and user["id"] in d.get("followers", []))
    out["replies"] = [{**ser(r), "liked": bool(user and user["id"] in r.get("likes", []))} for r in replies]
    return out


class ReplyBody(BaseModel):
    body: str = Field(min_length=1)
    parent_id: str | None = None


@router.post("/discussions/{disc_id}/reply")
async def reply_discussion(disc_id: str, body: ReplyBody, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="النقاش غير موجود")
    doc = {
        "discussion_id": disc_id, "parent_id": body.parent_id, "body": body.body,
        "author_id": user["id"], "author_name": user["name"], "author_school": user.get("school_name"),
        "likes": [], "likes_count": 0, "created_at": now_iso(),
    }
    res = await db.discussion_replies.insert_one(doc)
    await db.discussions.update_one({"_id": d["_id"]}, {"$inc": {"replies_count": 1}, "$set": {"last_activity": now_iso()}})
    await bump_stat(user["id"], "posts", 1)
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("reply_discussion", 8), "رد في نقاش", disc_id)
    followers = set(d.get("followers", []))
    async for f in db.community_follows.find({"post_id": disc_id}, {"user_id": 1}):
        followers.add(f["user_id"])
    for follower in followers:
        if follower != user["id"]:
            await create_notification(follower, "reply", "رد جديد في موضوع تتابعه", d["title"], f"/discussions/{disc_id}")
    return {"id": str(res.inserted_id)}


@router.post("/discussions/{disc_id}/like")
async def like_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in d.get("likes", []):
        await db.discussions.update_one({"_id": d["_id"]}, {"$pull": {"likes": user["id"]}, "$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.discussions.update_one({"_id": d["_id"]}, {"$addToSet": {"likes": user["id"]}, "$inc": {"likes_count": 1}})
    if d["author_id"] != user["id"]:
        s = await db.settings.find_one({"key": "points_config"})
        await award_xp(d["author_id"], (s or {}).get("value", {}).get("receive_like", 3), "إعجاب على نقاش", disc_id)
    return {"liked": True}


@router.post("/replies/{reply_id}/like")
async def like_reply(reply_id: str, user: dict = Depends(get_current_user)):
    r = await db.discussion_replies.find_one({"_id": oid(reply_id)})
    if not r:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in r.get("likes", []):
        await db.discussion_replies.update_one({"_id": r["_id"]}, {"$pull": {"likes": user["id"]}, "$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.discussion_replies.update_one({"_id": r["_id"]}, {"$addToSet": {"likes": user["id"]}, "$inc": {"likes_count": 1}})
    return {"liked": True}


@router.post("/discussions/{disc_id}/follow")
async def follow_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in d.get("followers", []):
        await db.discussions.update_one({"_id": d["_id"]}, {"$pull": {"followers": user["id"]}})
        return {"following": False}
    await db.discussions.update_one({"_id": d["_id"]}, {"$addToSet": {"followers": user["id"]}})
    return {"following": True}


@router.delete("/discussions/{disc_id}")
async def delete_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    from auth import effective_permissions
    if d["author_id"] != user["id"] and "discussion.moderate" not in effective_permissions(user):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية الحذف")
    await db.discussions.delete_one({"_id": d["_id"]})
    await db.discussion_replies.delete_many({"discussion_id": disc_id})
    return {"ok": True}


# ---------- Community topics (مواضيع المجتمع · فوق نقاشات المنتدى) ----------
@router.get("/community/contributors")
async def community_contributors():
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    scores: dict = {}

    def _add(author_id, likes):
        if not author_id:
            return
        s = scores.setdefault(author_id, {"posts": 0, "likes_received": 0})
        s["posts"] += 1
        s["likes_received"] += int(likes or 0)

    async for d in db.discussions.find(
            {"created_at": {"$gte": since}}, {"author_id": 1, "likes_count": 1}):
        _add(d.get("author_id"), d.get("likes_count"))
    async for r in db.discussion_replies.find(
            {"created_at": {"$gte": since}}, {"author_id": 1, "likes_count": 1}):
        _add(r.get("author_id"), r.get("likes_count"))
    top = sorted(scores.items(), key=lambda kv: -(kv[1]["posts"] + kv[1]["likes_received"]))[:8]
    items = []
    for uid_, s in top:
        u = await db.users.find_one({"_id": oid(uid_)}, {"name": 1, "avatar_url": 1})
        items.append({"user": {"id": uid_, "name": (u or {}).get("name", "طالب"),
                               "avatar_url": (u or {}).get("avatar_url")},
                      "posts": s["posts"], "likes_received": s["likes_received"],
                      "score": s["posts"] + s["likes_received"]})
    return {"items": items}


@router.get("/community/posts")
async def community_posts(request: Request, sort: str = "newest", page: int = 1, limit: int = 15):
    query: dict = {}
    if sort == "unanswered":
        query["replies_count"] = 0
        sf = ("created_at", -1)
    elif sort == "active":
        sf = ("last_activity", -1)
    else:
        sf = ("created_at", -1)
    total = await db.discussions.count_documents(query)
    docs = await db.discussions.find(query).sort(*sf).skip((page - 1) * limit).limit(limit).to_list(limit)
    viewer = await get_optional_user(request)
    items = []
    for d in sers(docs):
        d["reply_count"] = d.get("replies_count", 0)
        d["followers_count"] = await db.community_follows.count_documents({"post_id": d["id"]})
        d["following"] = bool(viewer and await db.community_follows.find_one(
            {"post_id": d["id"], "user_id": viewer["id"]}))
        items.append(d)
    return {"items": items, "total": total, "page": page}


@router.post("/community/posts/{post_id}/follow")
async def community_follow(post_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(post_id)})
    if not d:
        raise HTTPException(status_code=404, detail="الموضوع غير موجود")
    existing = await db.community_follows.find_one({"post_id": post_id, "user_id": user["id"]})
    if existing:
        await db.community_follows.delete_one({"_id": existing["_id"]})
        following = False
    else:
        await db.community_follows.insert_one(
            {"post_id": post_id, "user_id": user["id"], "created_at": now_iso()})
        following = True
    count = await db.community_follows.count_documents({"post_id": post_id})
    return {"following": following, "followers_count": count}
