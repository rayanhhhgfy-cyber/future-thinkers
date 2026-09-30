"""استوديو النشر الطلابي — مقالات وشعر وخواطر بمراجعة تحريرية قبل النشر."""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import award_xp, create_notification, audit_log

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
    return [_work_out(w) for w in docs]


@router.get("/published")
async def published_works(type: str | None = None, q: str | None = None,
                           page: int = 1, limit: int = 12):
    query = {"status": "published"}
    if type in WORK_TYPES:
        query["type"] = type
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"content": {"$regex": q, "$options": "i"}}]
    total = await db.works.count_documents(query)
    docs = await db.works.find(query).sort("published_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [_work_out(w) for w in docs], "total": total, "page": page, "limit": limit}


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
    if user:
        d["liked"] = bool(await db.work_likes.find_one({"user_id": user["id"], "work_id": work_id}))
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
        raise HTTPException(status_code=400, detail="لا يمكن حذف عمل منشور — تواصل مع الإدارة")
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
                                  f"{w['title']} — {w['author_name']}", "/admin")
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


# ---------- moderation ----------

@router.get("/queue")
async def review_queue(user: dict = Depends(require_permission("studio.review"))):
    docs = await db.works.find({"status": "pending"}).sort("submitted_at", 1).to_list(100)
    return [_work_out(w) for w in docs]


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
                              body.note or f"«{w['title']}» — راجع الملاحظات وعدّل ثم أعد الإرسال", "/studio")
    await audit_log(user, "work_reject", "work", work_id, {"note": body.note}, request)
    return {"status": "rejected"}
