from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from fastapi.responses import RedirectResponse
from auth import get_current_user
from storage import read_file, save_file, public_url_for

router = APIRouter(prefix="/api/files")

# Separate router for /api/upload-image (outside the /api/files prefix)
upload_router = APIRouter(prefix="/api")

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


@upload_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ctype = (file.content_type or "").lower()
    if ctype not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم — استخدم PNG أو JPEG أو WebP")
    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="حجم الصورة أكبر من 5MB")
    if not data:
        raise HTTPException(status_code=400, detail="الملف فارغ")
    filename = file.filename or "photo.jpg"
    # Prefer Telegram storage (same as book PDFs); fall back to Turso when Telegram is down.
    tg_error = None
    try:
        from telegram_storage import telegram_configured, send_photo_to_telegram
        if telegram_configured():
            tg = send_photo_to_telegram(data, filename)
            file_id = tg["file_id"]
            return {"url": f"/api/tg-photo/{file_id}", "file_id": file_id}
    except Exception as exc:
        tg_error = exc  # fall through to Turso below
    try:
        meta = await save_file(data, filename, ctype, str(user.get("id") or user.get("_id")), folder="images")
    except Exception:
        raise HTTPException(status_code=500, detail="فشل حفظ الصورة")
    # R2-backed storage returns a direct public URL; Turso mode keeps the /api/files proxy.
    url = meta.get("url") or f"/api/files/{meta['storage_path']}"
    return {"url": url, "storage_path": meta["storage_path"]}


@upload_router.get("/tg-photo/{file_id}")
async def tg_photo(file_id: str):
    """Serve a Telegram-stored photo by file_id. Proxied so the bot token never reaches the browser."""
    from telegram_storage import telegram_configured, fetch_photo_from_telegram
    if not telegram_configured():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    try:
        data = fetch_photo_from_telegram(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return Response(content=data, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400"})


@router.get("/{path:path}")
async def download_file(path: str):
    # R2 mode: if the object actually lives on R2, redirect straight to its
    # public URL (no proxy through Vercel). Legacy Turso-stored paths fall
    # through to the proxy below, which reads from the Turso fallback.
    from storage import USE_R2
    if USE_R2:
        try:
            from storage_r2 import r2_has
            if await r2_has(path):
                return RedirectResponse(public_url_for(path), status_code=302)
        except Exception:
            pass
    try:
        data, content_type = await read_file(path)
    except Exception:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"})
