from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, Request, Response
from pydantic import BaseModel, Field
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import award_xp, bump_stat, create_notification, audit_log
from storage import save_file, read_file, MAX_SIZE
from telegram_storage import (
    save_pdf, fetch_pdf_from_telegram, iter_pdf_parts_from_telegram,
    delete_telegram_messages,
)

router = APIRouter(prefix="/api/books")


async def _points(key, default):
    s = await db.settings.find_one({"key": "points_config"})
    return (s or {}).get("value", {}).get(key, default)


def _book_out(b, user_id=None):
    d = ser(b)
    if b.get("external_pdf_url"):
        d["pdf_url"] = b["external_pdf_url"]
    elif b.get("telegram_file_ids") or b.get("telegram_file_id"):
        d["pdf_url"] = f"/api/books/{d.get('id')}/pdf"
    elif b.get("storage_path"):
        d["pdf_url"] = f"/api/files/{b['storage_path']}"
    return d


@router.get("/categories")
async def categories():
    docs = await db.categories.find({}).to_list(100)
    return sers(docs)


@router.get("")
async def list_books(request: Request, category: str | None = None, q: str | None = None,
                     sort: str = "recent", status: str | None = None,
                     page: int = 1, limit: int = 12):
    user = await get_optional_user(request)
    query = {}
    can_moderate = user and "book.approve" in effective_permissions(user)
    if status and can_moderate and status != "all":
        query["status"] = status
    elif not (status == "all" and can_moderate):
        query["status"] = "approved"
    if category:
        query["category"] = category
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"author": {"$regex": q, "$options": "i"}},
                        {"description": {"$regex": q, "$options": "i"}}]
    sort_map = {"recent": ("created_at", -1), "popular": ("views", -1),
                "rating": ("rating_avg", -1), "title": ("title", 1)}
    sf, sd = sort_map.get(sort, ("created_at", -1))
    total = await db.books.count_documents(query)
    docs = await db.books.find(query).sort(sf, sd).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [_book_out(b) for b in docs], "total": total, "page": page, "limit": limit}


@router.get("/pending")
async def pending_books(user: dict = Depends(require_permission("book.approve"))):
    docs = await db.books.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.get("/me/favorites")
async def my_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}).to_list(500)
    ids = [oid(f["book_id"]) for f in favs if oid(f["book_id"])]
    docs = await db.books.find({"_id": {"$in": ids}}).to_list(500)
    return [_book_out(b) for b in docs]


@router.get("/me/reading")
async def my_reading(user: dict = Depends(get_current_user)):
    progs = await db.reading_progress.find({"user_id": user["id"]}).sort("updated_at", -1).limit(20).to_list(20)
    out = []
    for p in progs:
        b = await db.books.find_one({"_id": oid(p["book_id"])})
        if b:
            item = _book_out(b)
            item["progress"] = p.get("percent", 0)
            item["last_page"] = p.get("page", 1)
            out.append(item)
    return out


@router.get("/{book_id}")
async def get_book(book_id: str, request: Request):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$inc": {"views": 1}})
    user = await get_optional_user(request)
    d = _book_out(b)
    if user:
        d["is_favorite"] = bool(await db.favorites.find_one({"user_id": user["id"], "book_id": book_id}))
        prog = await db.reading_progress.find_one({"user_id": user["id"], "book_id": book_id})
        d["my_progress"] = prog.get("percent", 0) if prog else 0
        d["my_last_page"] = prog.get("page", 1) if prog else 1
    return d


@router.get("/{book_id}/pdf")
async def get_book_pdf(book_id: str):
    """Serve a book's PDF. Telegram-hosted files are proxied through the
    backend (parts stitched in order) so the bot token never reaches the browser."""
    from fastapi.responses import StreamingResponse
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    file_ids = b.get("telegram_file_ids") or b.get("telegram_file_id")
    if file_ids:
        try:
            return StreamingResponse(
                iter_pdf_parts_from_telegram(file_ids),
                media_type="application/pdf",
                headers={"Content-Disposition": "inline",
                         "Cache-Control": "public, max-age=86400"},
            )
        except Exception:
            raise HTTPException(status_code=502, detail="تعذر جلب الملف من التخزين")
    if b.get("storage_path"):
        try:
            data, _ct = await read_file(b["storage_path"])
        except Exception:
            raise HTTPException(status_code=404, detail="الملف غير موجود")
        return Response(content=data, media_type="application/pdf",
                        headers={"Content-Disposition": "inline",
                                 "Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="الملف غير موجود")


async def _create_book_from_pdf(user: dict, meta: dict, pdf_bytes: bytes, pdf_filename: str,
                                cover_bytes: bytes | None = None, cover_filename: str | None = None,
                                cover_ct: str | None = None, request=None) -> dict:
    """Shared book-creation path for direct and chunked/resumable uploads.

    meta: title, author, description, category, language, pages, year, publisher, age, tags (comma string).
    Returns {"id", "status"} and handles audit logging + moderator notifications.
    """
    if len(pdf_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد المسموح (100MB)")
    # Telegram first (<=20MB), GridFS fallback — see telegram_storage.save_pdf
    pdf_meta = await save_pdf(pdf_bytes, pdf_filename, "application/pdf", user["id"])
    cover_path = None
    cover_url = None
    if cover_bytes and cover_ct in ("image/png", "image/jpeg", "image/webp"):
        cmeta = await save_file(cover_bytes, cover_filename or "cover", cover_ct, user["id"], "covers")
        cover_path = cmeta["storage_path"]
    # staff uploads skip the review queue
    auto_approved = "book.approve" in effective_permissions(user)
    doc = {
        "title": meta.get("title", ""), "author": meta.get("author", ""), "description": meta.get("description", ""),
        "category": meta.get("category", "general"), "language": meta.get("language", "العربية"),
        "pages": int(meta.get("pages") or 0), "year": int(meta.get("year") or 0),
        "publisher": meta.get("publisher", ""), "age": meta.get("age", "عام"),
        "tags": [t.strip() for t in (meta.get("tags") or "").split(",") if t.strip()] or [meta.get("category", "general")],
        "cover_url": cover_url, "cover_path": cover_path,
        "storage_path": pdf_meta["storage_path"], "external_pdf_url": None,
        "telegram_file_ids": pdf_meta.get("telegram_file_ids"),
        "telegram_message_ids": pdf_meta.get("telegram_message_ids"),
        "telegram_file_id": pdf_meta.get("telegram_file_id"),
        "telegram_message_id": pdf_meta.get("telegram_message_id"),
        "status": "approved" if auto_approved else "pending",
        "uploaded_by": user["id"], "uploader_name": user["name"],
        "views": 0, "downloads": 0, "favorites_count": 0, "rating_avg": 0, "rating_count": 0,
        "created_at": now_iso(),
    }
    res = await db.books.insert_one(doc)
    await audit_log(user, "book_upload", "book", str(res.inserted_id), {"title": doc["title"]}, request)
    if auto_approved:
        return {"id": str(res.inserted_id), "status": "approved"}
    mods = await db.users.find({"role": {"$in": ["moderator", "admin", "super_admin"]}}).to_list(100)
    for m in mods:
        await create_notification(str(m["_id"]), "moderation", "كتاب جديد بانتظار المراجعة", doc["title"], "/admin/moderation")
    return {"id": str(res.inserted_id), "status": "pending"}


@router.post("")
async def upload_book(request: Request, title: str = Form(...), author: str = Form(...),
                      description: str = Form(""), category: str = Form("general"),
                      language: str = Form("العربية"), pages: int = Form(0), year: int = Form(0),
                      publisher: str = Form(""), age: str = Form("عام"), tags: str = Form(""),
                      pdf: UploadFile = File(...), cover: UploadFile | None = File(None),
                      user: dict = Depends(get_current_user)):
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة PDF")
    if pdf.size and pdf.size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد المسموح (100MB)")
    pdf_bytes = await pdf.read()
    cover_bytes = None
    cover_ct = None
    cover_filename = None
    if cover:
        if cover.content_type not in ("image/png", "image/jpeg", "image/webp"):
            raise HTTPException(status_code=400, detail="صيغة الغلاف غير مدعومة")
        cover_bytes = await cover.read()
        cover_ct = cover.content_type
        cover_filename = cover.filename
    meta = {"title": title, "author": author, "description": description, "category": category,
            "language": language, "pages": pages, "year": year, "publisher": publisher,
            "age": age, "tags": tags}
    return await _create_book_from_pdf(user, meta, pdf_bytes, pdf.filename,
                                       cover_bytes, cover_filename, cover_ct, request)


@router.delete("/{book_id}")
async def delete_book(book_id: str, request: Request, user: dict = Depends(require_permission("book.delete"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.delete_one({"_id": b["_id"]})
    # best-effort cleanup of stored files
    try:
        from storage import delete_file
        await delete_file(b.get("storage_path"))
        await delete_file(b.get("cover_path"))
        delete_telegram_messages(b.get("telegram_message_ids") or b.get("telegram_message_id"))
    except Exception:
        pass
    await audit_log(user, "book_delete", "book", book_id, {"title": b.get("title")}, request)
    return {"status": "deleted"}


@router.patch("/{book_id}")
async def edit_book(book_id: str, request: Request,
                    title: str | None = Form(None), author: str | None = Form(None),
                    description: str | None = Form(None), category: str | None = Form(None),
                    language: str | None = Form(None), pages: int | None = Form(None),
                    year: int | None = Form(None), publisher: str | None = Form(None),
                    age: str | None = Form(None), tags: str | None = Form(None),
                    pdf: UploadFile | None = File(None), cover: UploadFile | None = File(None),
                    user: dict = Depends(require_permission("book.edit"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    updates = {}
    for k, v in {"title": title, "author": author, "description": description,
                 "category": category, "language": language, "pages": pages,
                 "year": year, "publisher": publisher, "age": age}.items():
        if v is not None:
            updates[k] = v
    if tags is not None:
        updates["tags"] = [t.strip() for t in tags.split(",") if t.strip()]
    if pdf:
        pdf_bytes = await pdf.read()
        if len(pdf_bytes) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد المسموح (100MB)")
        if pdf.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة PDF")
        pdf_meta = await save_pdf(pdf_bytes, pdf.filename, "application/pdf", user["id"])
        old = b.get("storage_path")
        old_tg_msgs = b.get("telegram_message_ids") or b.get("telegram_message_id")
        updates["storage_path"] = pdf_meta["storage_path"]
        updates["telegram_file_ids"] = pdf_meta.get("telegram_file_ids")
        updates["telegram_message_ids"] = pdf_meta.get("telegram_message_ids")
        updates["telegram_file_id"] = pdf_meta.get("telegram_file_id")
        updates["telegram_message_id"] = pdf_meta.get("telegram_message_id")
        updates["external_pdf_url"] = None
        if old and old != pdf_meta["storage_path"]:
            try:
                from storage import delete_file
                await delete_file(old)
            except Exception:
                pass
        new_msgs = pdf_meta.get("telegram_message_ids") or pdf_meta.get("telegram_message_id")
        if old_tg_msgs and old_tg_msgs != new_msgs:
            delete_telegram_messages(old_tg_msgs)
    if cover:
        cbytes = await cover.read()
        if cover.content_type not in ("image/png", "image/jpeg", "image/webp"):
            raise HTTPException(status_code=400, detail="صيغة الغلاف غير مدعومة")
        cmeta = await save_file(cbytes, cover.filename, cover.content_type, user["id"], "covers")
        old_cover = b.get("cover_path")
        updates["cover_path"] = cmeta["storage_path"]
        if old_cover and old_cover != cmeta["storage_path"]:
            try:
                from storage import delete_file
                await delete_file(old_cover)
            except Exception:
                pass
    if not updates:
        return {"status": "no_changes"}
    updates["updated_at"] = now_iso()
    await db.books.update_one({"_id": b["_id"]}, {"$set": updates})
    await audit_log(user, "book_edit", "book", book_id, {"fields": list(updates.keys())}, request)
    return {"status": "updated", "fields": list(updates.keys())}


@router.delete("/{book_id}/reviews/{review_id}")
async def delete_review(book_id: str, review_id: str, request: Request,
                        user: dict = Depends(require_permission("book.edit"))):
    r = await db.reviews.find_one({"_id": oid(review_id), "book_id": book_id})
    if not r:
        raise HTTPException(status_code=404, detail="المراجعة غير موجودة")
    await db.reviews.delete_one({"_id": r["_id"]})
    agg = await db.reviews.aggregate([{"$match": {"book_id": book_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.books.update_one({"_id": oid(book_id)},
            {"$set": {"rating_avg": round(agg[0]["avg"], 1), "rating_count": agg[0]["count"]}})
    else:
        await db.books.update_one({"_id": oid(book_id)}, {"$set": {"rating_avg": 0, "rating_count": 0}})
    await audit_log(user, "review_delete", "review", review_id,
                    {"book_id": book_id, "user_name": r.get("user_name")}, request)
    return {"status": "deleted"}


@router.post("/{book_id}/approve")
async def approve_book(book_id: str, request: Request, user: dict = Depends(require_permission("book.approve"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$set": {"status": "approved", "approved_by": user["id"], "approved_at": now_iso()}})
    pts = await _points("upload_book_approved", 40)
    await award_xp(b["uploaded_by"], pts, "الموافقة على كتاب", book_id)
    await create_notification(b["uploaded_by"], "book", "تمت الموافقة على كتابك 🎉", b["title"], f"/books/{book_id}")
    await audit_log(user, "book_approve", "book", book_id)
    return {"status": "approved"}


class RejectBody(BaseModel):
    reason: str = ""


@router.post("/{book_id}/reject")
async def reject_book(book_id: str, body: RejectBody, user: dict = Depends(require_permission("book.reject"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$set": {"status": "rejected", "reject_reason": body.reason, "reviewed_by": user["id"]}})
    await create_notification(b["uploaded_by"], "book", "تم رفض كتابك", body.reason or b["title"], "/upload-book")
    await audit_log(user, "book_reject", "book", book_id, {"reason": body.reason})
    return {"status": "rejected"}


@router.post("/{book_id}/favorite")
async def toggle_favorite(book_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "book_id": book_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        await db.books.update_one({"_id": oid(book_id)}, {"$inc": {"favorites_count": -1}})
        return {"favorite": False}
    await db.favorites.insert_one({"user_id": user["id"], "book_id": book_id, "created_at": now_iso()})
    await db.books.update_one({"_id": oid(book_id)}, {"$inc": {"favorites_count": 1}})
    return {"favorite": True}


class ProgressBody(BaseModel):
    page: int = 1
    percent: float = 0


@router.post("/{book_id}/progress")
async def save_progress(book_id: str, body: ProgressBody, user: dict = Depends(get_current_user)):
    existing = await db.reading_progress.find_one({"user_id": user["id"], "book_id": book_id})
    completed_before = existing and existing.get("percent", 0) >= 95
    await db.reading_progress.update_one(
        {"user_id": user["id"], "book_id": book_id},
        {"$set": {"page": body.page, "percent": body.percent, "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    if body.percent >= 95 and not completed_before:
        await bump_stat(user["id"], "books_read", 1)
        await award_xp(user["id"], await _points("read_book", 50), "إكمال قراءة كتاب", book_id)
        await create_notification(user["id"], "achievement", "أكملت كتاباً! 📚", "+نقاط خبرة")
    return {"ok": True}


class ReviewBody(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = ""


@router.post("/{book_id}/review")
async def add_review(book_id: str, body: ReviewBody, user: dict = Depends(get_current_user)):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    existing = await db.reviews.find_one({"user_id": user["id"], "book_id": book_id})
    await db.reviews.update_one({"user_id": user["id"], "book_id": book_id},
        {"$set": {"rating": body.rating, "text": body.text, "user_name": user["name"], "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    agg = await db.reviews.aggregate([{"$match": {"book_id": book_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.books.update_one({"_id": oid(book_id)},
            {"$set": {"rating_avg": round(agg[0]["avg"], 1), "rating_count": agg[0]["count"]}})
    if not existing:
        await award_xp(user["id"], await _points("review_book", 20), "تقييم كتاب", book_id)
    return {"ok": True}


@router.get("/{book_id}/reviews")
async def list_reviews(book_id: str):
    docs = await db.reviews.find({"book_id": book_id}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.get("/me/recommendations")
async def recommendations(user: dict = Depends(get_current_user)):
    # interest-based: categories from favorites + reading progress
    favs = await db.favorites.find({"user_id": user["id"]}).to_list(200)
    progs = await db.reading_progress.find({"user_id": user["id"]}).to_list(200)
    read_ids = set([f["book_id"] for f in favs] + [p["book_id"] for p in progs])
    cats = {}
    for bid in read_ids:
        b = await db.books.find_one({"_id": oid(bid)})
        if b:
            cats[b["category"]] = cats.get(b["category"], 0) + 1
    query = {"status": "approved"}
    if read_ids:
        query["_id"] = {"$nin": [oid(x) for x in read_ids if oid(x)]}
    if cats:
        top = sorted(cats, key=cats.get, reverse=True)[:3]
        query["category"] = {"$in": top}
    docs = await db.books.find(query).sort("rating_avg", -1).limit(8).to_list(8)
    if len(docs) < 4:
        more = await db.books.find({"status": "approved"}).sort("views", -1).limit(8).to_list(8)
        seen = {str(d["_id"]) for d in docs}
        docs += [m for m in more if str(m["_id"]) not in seen]
    return [_book_out(b) for b in docs[:8]]
