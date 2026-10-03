"""استوديو النشر الطلابي · مقالات وشعر وخواطر بمراجعة تحريرية قبل النشر."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import award_xp, create_notification, audit_log, track_quest

router = APIRouter(prefix="/api/studio")

WORK_TYPES = {
    "article": "مقال",
    "poetry": "شعر",
    "essay": "خاطرة",
    "story": "قصة قصيرة",
}

# statuses: draft → pending → published | rejected


async def _points(key, default):
    s = await db.settings.find_one({"key": "points_config"})
    return (s or {}).get("value", {}).get(key, default)


def _work_out(w):
    d = ser(w)
    d["type_label"] = WORK_TYPES.get(w.get("type"), w.get("type"))
    return d


async def _comments_map(work_ids):
    """{work_id: عدد التعليقات} لدفعة أعمال دفعة واحدة."""
    out = {wid: 0 for wid in work_ids}
    if work_ids:
        agg = await db.work_comments.aggregate([
            {"$match": {"work_id": {"$in": work_ids}}},
            {"$group": {"_id": "$work_id", "count": {"$sum": 1}}}]).to_list(1000)
        for r in agg:
            out[r["_id"]] = r["count"]
    return out


class WorkBody(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    type: str = "article"
    content: str = Field(min_length=20, max_length=20000)
    excerpt: str = ""


@router.post("/works")
async def create_work(body: WorkBody, user: dict = Depends(get_current_user)):
    if body.type not in WORK_TYPES:
        raise HTTPException(status_code=400, detail="نوع العمل غير صالح")
    doc = {
        "title": body.title.strip(), "type": body.type,
        "content": body.content, "excerpt": body.excerpt.strip() or body.content[:180],
        "status": "draft", "author_id": user["id"], "author_name": user["name"],
        "likes": 0, "views": 0, "review_note": "",
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    res = await db.works.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "draft"}


@router.get("/works/me")
async def my_works(user: dict = Depends(get_current_user)):
    docs = await db.works.find({"author_id": user["id"]}).sort("updated_at", -1).to_list(100)
    cmap = await _comments_map([str(w["_id"]) for w in docs])
    out = []
    for w in docs:
        d = _work_out(w)
        d["comments_count"] = cmap.get(str(w["_id"]), 0)
        out.append(d)
    return out


@router.get("/published")
async def published_works(type: str | None = None, q: str | None = None,
                           page: int = 1, limit: int = 12, sort: str | None = None):
    query = {"status": "published"}
    if type in WORK_TYPES:
        query["type"] = type
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"content": {"$regex": q, "$options": "i"}}]
    if sort == "trending":
        # رائج: (إعجاب + 3×تعليقات) مع كسر التعادل بالأحدث نشراً
        docs = await db.works.find(query).to_list(1000)
        cmap = await _comments_map([str(w["_id"]) for w in docs])
        items = []
        for w in docs:
            d = _work_out(w)
            cc = cmap.get(str(w["_id"]), 0)
            d["comments_count"] = cc
            d["_trend"] = (w.get("likes", 0) or 0) + 3 * cc
            items.append(d)
        items.sort(key=lambda d: (d["_trend"], d.get("published_at") or ""), reverse=True)
        for d in items:
            d.pop("_trend", None)
        total = len(items)
        return {"items": items[(page - 1) * limit:page * limit],
                "total": total, "page": page, "limit": limit}
    total = await db.works.count_documents(query)
    docs = await db.works.find(query).sort("published_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    cmap = await _comments_map([str(w["_id"]) for w in docs])
    items = []
    for w in docs:
        d = _work_out(w)
        d["comments_count"] = cmap.get(str(w["_id"]), 0)
        items.append(d)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/works/{work_id}")
async def get_work(work_id: str, request: Request):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    user = await get_optional_user(request)
    is_owner = user and user["id"] == w["author_id"]
    can_review = user and "studio.review" in effective_permissions(user)
    if w["status"] != "published" and not (is_owner or can_review):
        raise HTTPException(status_code=403, detail="هذا العمل قيد المراجعة")
    await db.works.update_one({"_id": w["_id"]}, {"$inc": {"views": 1}})
    d = _work_out(w)
    d["comments_count"] = await db.work_comments.count_documents({"work_id": work_id})
    if user:
        d["liked"] = bool(await db.work_likes.find_one({"user_id": user["id"], "work_id": work_id}))
        my_rev = await db.work_reviews.find_one({"user_id": user["id"], "work_id": work_id})
        d["my_stars"] = my_rev["stars"] if my_rev else 0
        d["my_review_id"] = str(my_rev["_id"]) if my_rev else None
    return d


@router.put("/works/{work_id}")
async def update_work(work_id: str, body: WorkBody, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    if w["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس عملك")
    if w["status"] not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail="لا يمكن تعديل عمل قيد المراجعة أو منشور")
    if body.type not in WORK_TYPES:
        raise HTTPException(status_code=400, detail="نوع العمل غير صالح")
    await db.works.update_one({"_id": w["_id"]}, {"$set": {
        "title": body.title.strip(), "type": body.type, "content": body.content,
        "excerpt": body.excerpt.strip() or body.content[:180],
        "updated_at": now_iso()}})
    return {"ok": True}


@router.delete("/works/{work_id}")
async def delete_work(work_id: str, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    if w["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس عملك")
    if w["status"] == "published":
        raise HTTPException(status_code=400, detail="لا يمكن حذف عمل منشور · تواصل مع الإدارة")
    await db.works.delete_one({"_id": w["_id"]})
    return {"ok": True}


@router.post("/works/{work_id}/submit")
async def submit_work(work_id: str, request: Request, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    if w["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليس عملك")
    if w["status"] not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail="العمل قيد المراجعة أو منشور بالفعل")
    await db.works.update_one({"_id": w["_id"]},
        {"$set": {"status": "pending", "submitted_at": now_iso(), "updated_at": now_iso()}})
    await audit_log(user, "work_submit", "work", work_id, {"title": w["title"]}, request)
    mods = await db.users.find({"role": {"$in": ["moderator", "admin", "super_admin"]}}).to_list(100)
    for m in mods:
        await create_notification(str(m["_id"]), "moderation", "عمل جديد بانتظار المراجعة ✍️",
                                  f"{w['title']} · {w['author_name']}", "/admin/studio")
    return {"status": "pending"}


@router.post("/works/{work_id}/like")
async def like_work(work_id: str, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w or w["status"] != "published":
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    existing = await db.work_likes.find_one({"user_id": user["id"], "work_id": work_id})
    if existing:
        await db.work_likes.delete_one({"_id": existing["_id"]})
        await db.works.update_one({"_id": w["_id"]}, {"$inc": {"likes": -1}})
        return {"liked": False}
    await db.work_likes.insert_one({"user_id": user["id"], "work_id": work_id, "created_at": now_iso()})
    await db.works.update_one({"_id": w["_id"]}, {"$inc": {"likes": 1}})
    return {"liked": True}


# ---------- comments ----------

class WorkCommentBody(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@router.get("/works/{work_id}/comments")
async def list_work_comments(work_id: str, request: Request):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w or w["status"] != "published":
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    user = await get_optional_user(request)
    docs = await db.work_comments.find({"work_id": work_id}).sort("created_at", 1).to_list(500)
    out = []
    for c in docs:
        d = ser(c)
        d["mine"] = bool(user and user["id"] == c["user_id"])
        out.append(d)
    return out


@router.post("/works/{work_id}/comments")
async def comment_work(work_id: str, body: WorkCommentBody, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w or w["status"] != "published":
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    doc = {"work_id": work_id, "user_id": user["id"], "user_name": user["name"],
           "text": body.text.strip(), "created_at": now_iso()}
    res = await db.work_comments.insert_one(doc)
    if w["author_id"] != user["id"]:
        await create_notification(w["author_id"], "studio", "تعليق جديد على عملك 💬",
                                  f"{user['name']}: {doc['text'][:80]}", f"/studio/{work_id}")
    d = ser({**doc, "_id": res.inserted_id})
    d["mine"] = True
    return d


@router.delete("/works/{work_id}/comments/{comment_id}")
async def delete_work_comment(work_id: str, comment_id: str, user: dict = Depends(get_current_user)):
    c = await db.work_comments.find_one({"_id": oid(comment_id), "work_id": work_id})
    if not c:
        raise HTTPException(status_code=404, detail="التعليق غير موجود")
    w = await db.works.find_one({"_id": oid(work_id)})
    is_staff = ("studio.review" in effective_permissions(user)
                or user.get("role") in ("admin", "super_admin"))
    if c["user_id"] != user["id"] and (not w or w["author_id"] != user["id"]) and not is_staff:
        raise HTTPException(status_code=403, detail="لا تملك صلاحية حذف هذا التعليق")
    await db.work_comments.delete_one({"_id": c["_id"]})
    return {"status": "deleted"}


# ---------- spotlight ----------

@router.get("/spotlight")
async def studio_spotlight():
    """أبرز المبدعين: أكثر المؤلفين تلقياً للإعجاب خلال آخر 7 أيام."""
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    likes = await db.work_likes.find({"created_at": {"$gte": since}}).to_list(10000)
    work_ids = list({l["work_id"] for l in likes})
    works = {}
    if work_ids:
        async for w in db.works.find({"_id": {"$in": [oid(i) for i in work_ids]}}):
            works[str(w["_id"])] = w
    per_author = {}
    for l in likes:
        w = works.get(l["work_id"])
        if not w:
            continue
        a = per_author.setdefault(w["author_id"], {"likes": 0, "name": w.get("author_name")})
        a["likes"] += 1
    items = []
    for author_id, a in per_author.items():
        works_count = await db.works.count_documents({"author_id": author_id, "status": "published"})
        u = await db.users.find_one({"_id": oid(author_id)}, {"name": 1})
        items.append({"user": {"id": author_id, "name": (u or {}).get("name") or a.get("name") or ""},
                      "likes": a["likes"], "works_count": works_count})
    items.sort(key=lambda x: -x["likes"])
    return {"items": items[:5]}


# ---------- moderation ----------

@router.get("/queue")
async def review_queue(user: dict = Depends(require_permission("studio.review"))):
    docs = await db.works.find({"status": "pending"}).sort("submitted_at", 1).to_list(100)
    cmap = await _comments_map([str(w["_id"]) for w in docs])
    out = []
    for w in docs:
        d = _work_out(w)
        d["comments_count"] = cmap.get(str(w["_id"]), 0)
        out.append(d)
    return out


class ReviewBody(BaseModel):
    note: str = ""


@router.post("/works/{work_id}/approve")
async def approve_work(work_id: str, body: ReviewBody, request: Request,
                       user: dict = Depends(require_permission("studio.review"))):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    if w["status"] != "pending":
        raise HTTPException(status_code=400, detail="العمل ليس قيد المراجعة")
    await db.works.update_one({"_id": w["_id"]}, {"$set": {
        "status": "published", "published_at": now_iso(), "reviewed_by": user["id"],
        "review_note": body.note, "updated_at": now_iso()}})
    pts = await _points("work_published", 60)
    await award_xp(w["author_id"], pts, "نشر عمل في الاستوديو", work_id)
    # auto skill badge: first published work → rising writer
    published_count = await db.works.count_documents({"author_id": w["author_id"], "status": "published"})
    if published_count == 1:
        from routes.badges_routes import award_badge
        await award_badge(w["author_id"], "rising_writer", user["id"], auto=True)
    await create_notification(w["author_id"], "studio", "تم نشر عملك! 🎉",
                              f"«{w['title']}» أصبح متاحاً في معرض الأعمال", f"/studio")
    await audit_log(user, "work_approve", "work", work_id, request=request)
    return {"status": "published"}


@router.post("/works/{work_id}/reject")
async def reject_work(work_id: str, body: ReviewBody, request: Request,
                      user: dict = Depends(require_permission("studio.review"))):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w:
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    if w["status"] != "pending":
        raise HTTPException(status_code=400, detail="العمل ليس قيد المراجعة")
    await db.works.update_one({"_id": w["_id"]}, {"$set": {
        "status": "rejected", "reviewed_by": user["id"],
        "review_note": body.note, "updated_at": now_iso()}})
    await create_notification(w["author_id"], "studio", "عملك يحتاج تعديلاً ✍️",
                              body.note or f"«{w['title']}» · راجع الملاحظات وعدّل ثم أعد الإرسال", "/studio")
    await audit_log(user, "work_reject", "work", work_id, {"note": body.note}, request)
    return {"status": "rejected"}


# ---------- reviews & ratings ----------

class WorkReviewBody(BaseModel):
    stars: int = Field(ge=1, le=5)
    text: str = ""


async def _recalc_work_rating(work_id: str):
    agg = await db.work_reviews.aggregate([{"$match": {"work_id": work_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$stars"}, "count": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.works.update_one({"_id": oid(work_id)},
            {"$set": {"rating_avg": round(agg[0]["avg"], 1), "rating_count": agg[0]["count"]}})
    else:
        await db.works.update_one({"_id": oid(work_id)}, {"$set": {"rating_avg": 0, "rating_count": 0}})


@router.post("/works/{work_id}/reviews")
async def review_work(work_id: str, body: WorkReviewBody, user: dict = Depends(get_current_user)):
    w = await db.works.find_one({"_id": oid(work_id)})
    if not w or w["status"] != "published":
        raise HTTPException(status_code=404, detail="العمل غير موجود")
    existing = await db.work_reviews.find_one({"user_id": user["id"], "work_id": work_id})
    await db.work_reviews.update_one({"user_id": user["id"], "work_id": work_id},
        {"$set": {"stars": body.stars, "text": body.text.strip(), "user_name": user["name"], "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    await _recalc_work_rating(work_id)
    if not existing:
        await award_xp(user["id"], await _points("review_work", 10), "تقييم عمل أدبي", work_id)
        await track_quest(user["id"], "review")
    return {"ok": True}


@router.get("/works/{work_id}/reviews")
async def list_work_reviews(work_id: str):
    docs = await db.work_reviews.find({"work_id": work_id}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.delete("/works/{work_id}/reviews/{review_id}")
async def delete_work_review(work_id: str, review_id: str, user: dict = Depends(get_current_user)):
    r = await db.work_reviews.find_one({"_id": oid(review_id), "work_id": work_id})
    if not r:
        raise HTTPException(status_code=404, detail="المراجعة غير موجودة")
    if r["user_id"] != user["id"] and "studio.review" not in effective_permissions(user):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية حذف هذه المراجعة")
    await db.work_reviews.delete_one({"_id": r["_id"]})
    await _recalc_work_rating(work_id)
    return {"status": "deleted"}
