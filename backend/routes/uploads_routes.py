"""Chunked/resumable PDF uploads (for files larger than what a single request
can carry through the Vercel edge — up to 100MB).

Flow:
  1. POST /uploads/start   {filename, content_type, size}  -> {upload_id, chunk_size, total_parts}
  2. POST /uploads/part    {upload_id, index, data(base64)} (per 3MB chunk)
  3. POST /uploads/complete {upload_id, purpose, ...}       (reassembles + saves the book)
"""
import base64
import math
import uuid

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from bson import Binary

from db import db, now_iso, oid
from auth import get_current_user, effective_permissions
from services import audit_log

router = APIRouter(prefix="/api")

CHUNK_SIZE = 3 * 1024 * 1024       # 3MB per chunk
MAX_UPLOAD = 100 * 1024 * 1024     # 100MB hard limit
COVER_MAX = 5 * 1024 * 1024        # 5MB cover limit
COVER_TYPES = {"image/png", "image/jpeg", "image/webp"}
PURPOSES = {"book_create", "book_replace"}


async def _ensure_ttl():
    """Create the TTL index on upload_parts.created_at (24h) if missing."""
    try:
        info = await db.upload_parts.index_information()
        for v in info.values():
            key = v.get("key") or []
            if any(k == "created_at" for k, _ in key) and v.get("expireAfterSeconds"):
                return
        await db.upload_parts.create_index("created_at", expireAfterSeconds=86400)
    except Exception:
        pass


async def _get_upload(upload_id: str, user: dict):
    up = await db.uploads.find_one({"upload_id": upload_id})
    if not up:
        raise HTTPException(status_code=404, detail="الرفع غير موجود")
    if up.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    if up.get("status") != "open":
        raise HTTPException(status_code=400, detail="انتهت صلاحية هذا الرفع")
    return up


class StartBody(BaseModel):
    filename: str
    content_type: str
    size: int


@router.post("/uploads/start")
async def start_upload(body: StartBody, user: dict = Depends(get_current_user)):
    await _ensure_ttl()
    if body.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة PDF")
    if body.size <= 0 or body.size > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد الأقصى 100MB")
    total_parts = math.ceil(body.size / CHUNK_SIZE)
    upload_id = uuid.uuid4().hex
    await db.uploads.insert_one({
        "upload_id": upload_id, "user_id": user["id"], "filename": body.filename,
        "content_type": body.content_type, "size": body.size,
        "total_parts": total_parts, "received": 0, "status": "open",
        "created_at": now_iso(),
    })
    return {"upload_id": upload_id, "chunk_size": CHUNK_SIZE, "total_parts": total_parts}


class PartBody(BaseModel):
    upload_id: str
    index: int
    data: str


@router.post("/uploads/part")
async def upload_part(body: PartBody, user: dict = Depends(get_current_user)):
    up = await _get_upload(body.upload_id, user)
    if body.index < 0 or body.index >= up["total_parts"]:
        raise HTTPException(status_code=400, detail="رقم الجزء غير صالح")
    try:
        raw = base64.b64decode(body.data, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="بيانات الجزء غير صالحة")
    await db.upload_parts.update_one(
        {"upload_id": body.upload_id, "index": body.index},
        {"$set": {"data": Binary(raw), "created_at": now_iso()}},
        upsert=True,
    )
    received = await db.upload_parts.count_documents({"upload_id": body.upload_id})
    await db.uploads.update_one({"upload_id": body.upload_id}, {"$set": {"received": received}})
    return {"ok": True, "received": received}


class CompleteBody(BaseModel):
    upload_id: str
    purpose: str
    # book_create params
    title: str | None = None
    author: str | None = None
    description: str = ""
    category: str = "general"
    language: str = "العربية"
    pages: int | str | None = 0
    year: int | str | None = 0
    publisher: str = ""
    age: str = "عام"
    tags: str = ""
    cover_b64: str | None = None
    cover_ct: str | None = None
    # book_replace params
    book_id: str | None = None


def _to_int(v, default=0):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


@router.post("/uploads/complete")
async def complete_upload(body: CompleteBody, request: Request, user: dict = Depends(get_current_user)):
    up = await _get_upload(body.upload_id, user)
    if body.purpose not in PURPOSES:
        raise HTTPException(status_code=400, detail="غرض غير صالح")
    if body.purpose == "book_replace" and "book.edit" not in effective_permissions(user):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية للقيام بهذا الإجراء")
    if body.purpose == "book_create" and (not (body.title or "").strip() or not (body.author or "").strip()):
        raise HTTPException(status_code=400, detail="العنوان والمؤلف مطلوبان")
    if body.purpose == "book_replace" and not body.book_id:
        raise HTTPException(status_code=400, detail="معرف الكتاب مطلوب")

    total = up["total_parts"]
    parts = await db.upload_parts.find({"upload_id": body.upload_id}).sort("index", 1).to_list(total + 10)
    if len(parts) != total:
        raise HTTPException(status_code=400,
                            detail=f"اكتملت الأجزاء المستلمة: {len(parts)} من {total}")
    pdf_bytes = b"".join(bytes(p["data"]) for p in parts)
    if len(pdf_bytes) != up["size"]:
        raise HTTPException(status_code=400, detail="حجم الملف المجمّع لا يطابق الحجم المعلن")
    if len(pdf_bytes) > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد الأقصى 100MB")
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="الملف المرفوع ليس PDF صالحاً")

    from routes.books_routes import _create_book_from_pdf  # deferred to avoid a circular import

    result = None
    if body.purpose == "book_create":
        cover_bytes = None
        cover_ct = None
        cover_filename = None
        if body.cover_b64:
            try:
                cover_bytes = base64.b64decode(body.cover_b64, validate=True)
            except Exception:
                raise HTTPException(status_code=400, detail="صورة الغلاف غير صالحة")
            if body.cover_ct not in COVER_TYPES:
                raise HTTPException(status_code=400, detail="صيغة الغلاف غير مدعومة")
            if len(cover_bytes) > COVER_MAX:
                raise HTTPException(status_code=400, detail="حجم الغلاف يتجاوز 5MB")
            cover_ct = body.cover_ct
            cover_filename = "cover"
        meta = {
            "title": (body.title or "").strip(), "author": (body.author or "").strip(),
            "description": body.description, "category": body.category, "language": body.language,
            "pages": _to_int(body.pages), "year": _to_int(body.year),
            "publisher": body.publisher, "age": body.age, "tags": body.tags,
        }
        result = await _create_book_from_pdf(user, meta, pdf_bytes, up["filename"],
                                             cover_bytes, cover_filename, cover_ct, request)
    else:  # book_replace — replicate the PATCH /books/{id} pdf-replace branch
        from storage import save_file, delete_file
        b = await db.books.find_one({"_id": oid(body.book_id)})
        if not b:
            raise HTTPException(status_code=404, detail="الكتاب غير موجود")
        pdf_meta = await save_file(pdf_bytes, up["filename"], "application/pdf", user["id"], "books")
        old = b.get("storage_path")
        updates = {
            "storage_path": pdf_meta["storage_path"],
            "telegram_file_id": pdf_meta.get("telegram_file_id"),
            "external_pdf_url": None,
            "updated_at": now_iso(),
        }
        await db.books.update_one({"_id": b["_id"]}, {"$set": updates})
        if old and old != pdf_meta["storage_path"]:
            try:
                await delete_file(old)
            except Exception:
                pass
        await audit_log(user, "book_edit", "book", body.book_id, {"fields": ["storage_path"]}, request)
        result = {"id": body.book_id, "status": "updated"}

    # cleanup the chunked session
    await db.upload_parts.delete_many({"upload_id": body.upload_id})
    await db.uploads.delete_one({"upload_id": body.upload_id})
    return result
