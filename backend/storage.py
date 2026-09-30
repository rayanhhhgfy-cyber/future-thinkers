from io import BytesIO
import uuid

from gridfs.errors import NoFile
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from db import get_db

MAX_SIZE = 50 * 1024 * 1024
MIME_EXT = {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "image/jpg": "jpg", "image/webp": "webp", "video/mp4": "mp4",
}
APP_NAME = "future-thinkers"
def _bucket():
    return AsyncIOMotorGridFSBucket(get_db())


async def save_file(data: bytes, filename: str, content_type: str, user_id: str, folder: str = "uploads") -> dict:
    if len(data) > MAX_SIZE:
        raise ValueError("File exceeds the 50MB limit")
    ext = MIME_EXT.get(content_type, filename.rsplit(".", 1)[-1] if "." in filename else "bin")
    path = f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"
    await _bucket().upload_from_stream(
        path,
        BytesIO(data),
        metadata={
            "content_type": content_type,
            "original_name": filename,
            "user_id": str(user_id),
        },
    )
    return {
        "storage_path": path,
        "size": len(data),
        "content_type": content_type,
        "original_name": filename,
        "provider": "mongodb_gridfs",
    }


async def read_file(path: str):
    try:
        file = await _bucket().open_download_stream_by_name(path)
    except NoFile as exc:
        raise FileNotFoundError(path) from exc
    content_type = (file.metadata or {}).get("content_type", "application/octet-stream")
    return await file.read(), content_type


async def delete_file(path: str) -> bool:
    """Best-effort GridFS delete by stored path. Returns True if a file was removed."""
    if not path:
        return False
    try:
        grid_out = await _bucket().open_download_stream_by_name(path)
        await _bucket().delete(grid_out._id)
        return True
    except Exception:
        return False