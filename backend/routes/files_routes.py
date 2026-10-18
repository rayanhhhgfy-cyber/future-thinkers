from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from auth import get_current_user
from storage import read_file, save_file

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
    try:
        meta = await save_file(data, file.filename or "image", ctype, str(user.get("id") or user.get("_id")), folder="images")
    except Exception:
        raise HTTPException(status_code=500, detail="فشل حفظ الصورة")
    return {"url": f"/api/files/{meta['storage_path']}", "storage_path": meta["storage_path"]}


@router.get("/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = await read_file(path)
    except Exception:
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"})
