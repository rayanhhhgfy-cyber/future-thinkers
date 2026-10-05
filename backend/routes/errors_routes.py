"""Error reports: user-submitted + automatically captured errors.

Users only ever see short friendly Arabic messages. Every error here keeps the
FULL original detail (server traceback / JS stack / raw server response) so the
admin can see exactly what happened, copy it, and message the affected user.
"""
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from db import db, ser, oid, now_iso
from auth import get_optional_user, require_permission
from services import create_notification, audit_log

router = APIRouter(prefix="/api")


class ErrorReportBody(BaseModel):
    message: str  # short friendly summary the user saw
    detail: str = ""  # full technical detail (never shown to users)
    page: str = ""
    source: str = "manual"  # manual | auto | client
    context: str = ""
    # «الإبلاغ عن مشكلة» من المستخدم: عنوان صريح + صورة اختيارية
    subject: str = ""
    image: str = ""  # base64 (بلا بادئة data:) لقطة شاشة مضغوطة من المتصفح
    image_type: str = ""


_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")
_MAX_IMAGE_B64 = 1_400_000  # ≈ 1MB ثنائي · الصورة تُضغط أصلًا في المتصفح


def _clean_image(raw: str, ctype: str):
    """Return (base64, content_type) for a valid screenshot, else (None, None)."""
    img = (raw or "").strip()
    if img.startswith("data:"):
        head, _, tail = img.partition(",")
        if tail:
            ctype = ctype or head[5:].split(";")[0]
            img = tail
    if not img or len(img) > _MAX_IMAGE_B64:
        return None, None
    if ctype not in _IMAGE_TYPES:
        ctype = "image/jpeg"
    return img, ctype


@router.post("/errors/report")
async def report_error(body: ErrorReportBody, request: Request):
    user = await get_optional_user(request)
    uid = user["id"] if user else None
    subject = (body.subject or "").strip()[:150]
    msg = (subject or body.message or "خطأ غير معروف").strip()[:300]
    image, image_type = _clean_image(body.image, body.image_type)
    # de-noise: an identical auto-report storm from one user counts once
    if body.source == "auto" and uid:
        recent = await db.error_reports.count_documents({
            "user_id": uid, "message": msg, "source": "auto",
            "created_at": {"$gte": (db_now_minus_minutes(10))},
        })
        if recent >= 3:
            return {"ok": True, "deduped": True}
    doc = {
        "message": msg,
        "subject": subject,
        "detail": (body.detail or "")[:20000],
        "page": (body.page or "")[:300],
        "source": body.source if body.source in ("manual", "auto", "client") else "manual",
        "context": (body.context or "")[:200],
        "image": image,
        "image_type": image_type,
        "user_id": uid,
        "user_name": user["name"] if user else None,
        "user_email": user["email"] if user else None,
        "status": "open",
        "contacted_at": None,
        "created_at": now_iso(),
    }
    res = await db.error_reports.insert_one(doc)
    return {"ok": True, "id": str(res.inserted_id)}


def db_now_minus_minutes(minutes: int) -> str:
    return (db_now() - timedelta(minutes=minutes)).isoformat()


def db_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


# ---------------- admin ----------------
@router.get("/admin/errors")
async def list_errors(status: str = "open", source: str = "", page: int = 1, limit: int = 20,
                      user: dict = Depends(require_permission("report.manage"))):
    q = {}
    if status in ("open", "resolved"):
        q["status"] = status
    if source in ("manual", "auto", "client", "server"):
        q["source"] = source
    limit = max(1, min(50, limit))
    total = await db.error_reports.count_documents(q)
    counts = {
        "open": await db.error_reports.count_documents({"status": "open"}),
        "resolved": await db.error_reports.count_documents({"status": "resolved"}),
        "total": await db.error_reports.count_documents({}),
    }
    docs = await db.error_reports.find(q).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    items = []
    for d in docs:
        item = ser(d)
        item["has_image"] = bool(d.get("image"))
        item.pop("image", None)  # الصورة ثقيلة · تُجلب عند الطلب من مسار منفصل
        items.append(item)
    return {"items": items, "total": total, "page": page, "pages": max(1, -(-total // limit)), "counts": counts}


@router.get("/admin/errors/{eid}/image")
async def error_image(eid: str, user: dict = Depends(require_permission("report.manage"))):
    e = await db.error_reports.find_one({"_id": oid(eid)}, {"image": 1, "image_type": 1})
    if not e:
        raise HTTPException(status_code=404, detail="غير موجود")
    if not e.get("image"):
        raise HTTPException(status_code=404, detail="لا توجد صورة مرفقة")
    ct = e.get("image_type") or "image/jpeg"
    return {"image": f"data:{ct};base64,{e['image']}"}


class ResolveBody(BaseModel):
    status: str  # resolved | open


@router.post("/admin/errors/{eid}/resolve")
async def resolve_error(eid: str, body: ResolveBody, request: Request,
                        user: dict = Depends(require_permission("report.manage"))):
    e = await db.error_reports.find_one({"_id": oid(eid)})
    if not e:
        raise HTTPException(status_code=404, detail="غير موجود")
    st = "resolved" if body.status == "resolved" else "open"
    await db.error_reports.update_one({"_id": oid(eid)}, {"$set": {"status": st}})
    await audit_log(user, "error_resolve", "error_report", eid, {"status": st}, request)
    return {"ok": True, "status": st}


class ContactBody(BaseModel):
    message: str


@router.post("/admin/errors/{eid}/contact")
async def contact_error_user(eid: str, body: ContactBody, request: Request,
                             user: dict = Depends(require_permission("report.manage"))):
    e = await db.error_reports.find_one({"_id": oid(eid)})
    if not e:
        raise HTTPException(status_code=404, detail="غير موجود")
    if not e.get("user_id"):
        raise HTTPException(status_code=400, detail="هذا الخطأ من زائر غير مسجل، لا يمكن مراسلته")
    msg = (body.message or "").strip()
    if len(msg) < 3:
        raise HTTPException(status_code=400, detail="اكتب رسالة أولًا")
    await create_notification(e["user_id"], "system", "رسالة من فريق الدعم 🛠️",
                              msg[:500], "/dashboard")
    await db.error_reports.update_one({"_id": oid(eid)}, {"$set": {"contacted_at": now_iso()}})
    await audit_log(user, "error_contact", "error_report", eid, request=request)
    return {"ok": True}


@router.delete("/admin/errors/{eid}")
async def delete_error(eid: str, request: Request,
                       user: dict = Depends(require_permission("report.manage"))):
    res = await db.error_reports.delete_one({"_id": oid(eid)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="غير موجود")
    await audit_log(user, "error_delete", "error_report", eid, request=request)
    return {"ok": True}
