"""Turso-backed file storage — drop-in replacement for the GridFS storage.py.

Same function signatures: save_file / read_file / delete_file / MAX_SIZE.
Files live in a single `fs_files` table:
    (path TEXT PRIMARY KEY, data BLOB, content_type TEXT, metadata TEXT)
"""

import asyncio
import json
import uuid
from io import BytesIO

MAX_SIZE = 100 * 1024 * 1024  # 100MB · larger books go through chunked/resumable uploads (/api/uploads/*)
MIME_EXT = {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "image/jpg": "jpg", "image/webp": "webp", "video/mp4": "mp4",
}
APP_NAME = "future-thinkers"

_table_ready = False


def _conn():
    # Imported lazily to avoid a hard dependency at module import time.
    # db.py is the Turso adapter (swapped in from db_turso.py).
    from db import _client, init_db
    if _client is None:
        init_db()
    from db import _client as c
    return c


def _sync_ensure():
    global _table_ready
    if _table_ready:
        return
    _conn().execute(
        "CREATE TABLE IF NOT EXISTS fs_files "
        "(path TEXT PRIMARY KEY, data BLOB, content_type TEXT, metadata TEXT)"
    )
    _conn().commit()
    _table_ready = True


async def save_file(data: bytes, filename: str, content_type: str, user_id: str, folder: str = "uploads") -> dict:
    if len(data) > MAX_SIZE:
        raise ValueError("File exceeds the 100MB limit")
    ext = MIME_EXT.get(content_type, filename.rsplit(".", 1)[-1] if "." in filename else "bin")
    path = f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"
    metadata = {
        "content_type": content_type,
        "original_name": filename,
        "user_id": str(user_id),
    }

    def _write():
        _sync_ensure()
        _conn().execute(
            "INSERT OR REPLACE INTO fs_files (path, data, content_type, metadata) "
            "VALUES (?, ?, ?, ?)",
            (path, bytes(data), content_type, json.dumps(metadata)),
        )
        _conn().commit()

    await asyncio.to_thread(_write)
    return {
        "storage_path": path,
        "size": len(data),
        "content_type": content_type,
        "original_name": filename,
        "provider": "turso",
    }


async def read_file(path: str):
    def _read():
        _sync_ensure()
        cur = _conn().execute(
            "SELECT data, content_type, metadata FROM fs_files WHERE path = ?", (path,))
        return cur.fetchone()

    row = await asyncio.to_thread(_read)
    if row is None:
        raise FileNotFoundError(path)
    data, content_type, metadata_json = row
    try:
        metadata = json.loads(metadata_json) if metadata_json else {}
    except Exception:
        metadata = {}
    return bytes(data), metadata.get("content_type", content_type or "application/octet-stream")


async def delete_file(path: str) -> bool:
    """Best-effort delete by stored path. Returns True if a file was removed."""
    if not path:
        return False

    def _delete():
        _sync_ensure()
        cur = _conn().execute("DELETE FROM fs_files WHERE path = ?", (path,))
        _conn().commit()
        return (cur.rowcount or 0) > 0

    try:
        return await asyncio.to_thread(_delete)
    except Exception:
        return False
