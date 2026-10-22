"""Cloudflare R2 file storage — S3-compatible, drop-in replacement for storage.py.

Activated by `storage.py` only when ALL of these env vars are set:
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
Optional: R2_BUCKET (defaults to "future-thinkers-photos").

Same function signatures as the Turso storage: save_file / read_file /
delete_file / MAX_SIZE. Photos are served directly from R2's public URL
(the browser never talks to R2 for uploads — everything goes through the
backend, so no CORS configuration is needed on the bucket).

read_file/delete_file also fall back to the Turso fs_files table, so files
stored before the R2 switch keep working.
"""

import asyncio
import os
import uuid

MAX_SIZE = 100 * 1024 * 1024  # 100MB · same limit as the Turso storage
PROVIDER = "r2"
APP_NAME = "future-thinkers"

MIME_EXT = {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "image/jpg": "jpg", "image/webp": "webp", "video/mp4": "mp4",
}

_client = None


def _get_client():
    """Lazily build the boto3 S3 client for R2 (cached per process)."""
    global _client
    if _client is not None:
        return _client
    import boto3  # lazy: only imported when R2 is actually configured
    from botocore.config import Config

    account_id = os.environ["R2_ACCOUNT_ID"]
    _client = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",  # R2 requires "auto"
    )
    return _client


def _bucket() -> str:
    return os.environ.get("R2_BUCKET", "future-thinkers-photos")


def public_url_for(path: str) -> str:
    """Direct public URL for an R2 object key."""
    return f"{os.environ['R2_PUBLIC_URL'].rstrip('/')}/{path.lstrip('/')}"


def _make_key(folder: str, user_id: str, filename: str, content_type: str) -> str:
    ext = MIME_EXT.get(content_type, filename.rsplit(".", 1)[-1] if "." in filename else "bin")
    return f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"


async def save_file(data: bytes, filename: str, content_type: str, user_id: str,
                    folder: str = "uploads") -> dict:
    if len(data) > MAX_SIZE:
        raise ValueError("File exceeds the 100MB limit")
    key = _make_key(folder, str(user_id), filename, content_type)
    client = _get_client()

    def _put():
        client.put_object(Bucket=_bucket(), Key=key, Body=bytes(data),
                          ContentType=content_type)

    await asyncio.to_thread(_put)
    return {
        "storage_path": key,
        "url": public_url_for(key),
        "size": len(data),
        "content_type": content_type,
        "original_name": filename,
        "provider": PROVIDER,
    }


async def r2_has(path: str) -> bool:
    """Cheap HEAD check: does this key exist on R2?"""
    client = _get_client()

    def _head():
        try:
            client.head_object(Bucket=_bucket(), Key=path)
            return True
        except Exception as e:
            code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "404", "NotFound"):
                return False
            raise

    return await asyncio.to_thread(_head)


async def read_file(path: str):
    """Read from R2; fall back to the Turso fs_files table for pre-R2 files."""
    client = _get_client()

    def _get():
        try:
            resp = client.get_object(Bucket=_bucket(), Key=path)
            return bytes(resp["Body"].read()), resp.get("ContentType")
        except Exception as e:
            code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "404", "NotFound"):
                return None
            raise

    result = await asyncio.to_thread(_get)
    if result is not None:
        data, ctype = result
        return data, ctype or "application/octet-stream"
    # Fall back: file was stored in Turso before the R2 switch.
    from storage_turso import read_file as turso_read
    return await turso_read(path)


async def delete_file(path: str) -> bool:
    """Best-effort delete from R2 and from the Turso fallback. True if removed anywhere."""
    if not path:
        return False
    removed = False
    client = _get_client()

    def _delete():
        try:
            client.delete_object(Bucket=_bucket(), Key=path)
            return True
        except Exception:
            return False

    try:
        removed = await asyncio.to_thread(_delete) or removed
    except Exception:
        pass
    try:
        from storage_turso import delete_file as turso_delete
        removed = await turso_delete(path) or removed
    except Exception:
        pass
    return removed
