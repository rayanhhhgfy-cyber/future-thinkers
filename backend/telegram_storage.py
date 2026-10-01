"""Telegram file storage for book PDFs (stdlib only — no new dependencies).

Security model:
- The bot token and storage chat id live ONLY in server environment variables
  (TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID). They are never written to
  the repo, never logged, and never sent to the frontend.
- MongoDB stores only the Telegram file_id (+ message_id for cleanup). A
  file_id is useless without the bot token, so a database leak alone exposes
  nothing downloadable.
- All downloads are proxied through the backend (/api/books/{id}/pdf): the
  browser never sees the token or the direct Telegram file URL.

Telegram Bot API limits that shape this module:
- Bots can SEND files up to 50MB, but can only DOWNLOAD (getFile) files up to
  20MB. So Telegram round-trips are only used for PDFs <= 20MB; anything
  bigger stays in GridFS via storage.save_file.
"""
import json
import os
import urllib.request
import uuid

TELEGRAM_MAX_BYTES = 20 * 1024 * 1024  # bot getFile download limit
_SEND_MAX_BYTES = 50 * 1024 * 1024     # bot sendDocument limit


def _token() -> str:
    return os.environ.get("TELEGRAM_BOT_TOKEN", "")


def _chat_id() -> str:
    return os.environ.get("TELEGRAM_STORAGE_CHAT_ID", "")


def telegram_configured() -> bool:
    return bool(_token() and _chat_id())


def _api(method: str, payload: dict | None = None, timeout: int = 60) -> dict:
    token = _token()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            out = json.load(resp)
    except Exception as exc:
        raise RuntimeError(f"Telegram API {method} failed: {exc}") from exc
    if not out.get("ok"):
        raise RuntimeError(f"Telegram API {method} error: {out}")
    return out["result"]


def send_pdf_to_telegram(pdf_bytes: bytes, filename: str) -> dict:
    """Upload a PDF to the storage channel. Returns {file_id, message_id}."""
    if len(pdf_bytes) > _SEND_MAX_BYTES:
        raise ValueError("PDF exceeds Telegram's 50MB bot upload limit")
    token = _token()
    chat_id = _chat_id()
    if not token or not chat_id:
        raise RuntimeError("Telegram storage is not configured")
    boundary = uuid.uuid4().hex
    parts = [
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{chat_id}\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n".encode(),
        (f"--{boundary}\r\nContent-Disposition: form-data; name=\"document\"; "
         f"filename=\"{filename or 'book.pdf'}\"\r\n"
         f"Content-Type: application/pdf\r\n\r\n").encode(),
        pdf_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ]
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendDocument",
        data=b"".join(parts),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.load(resp)
    except Exception as exc:
        raise RuntimeError(f"Telegram sendDocument failed: {exc}") from exc
    if not out.get("ok"):
        raise RuntimeError(f"Telegram sendDocument error: {out}")
    doc = out["result"]["document"]
    return {"file_id": doc["file_id"], "message_id": out["result"]["message_id"]}


def fetch_pdf_from_telegram(file_id: str) -> bytes:
    """Download a PDF back from Telegram (works for files <= 20MB)."""
    info = _api("getFile", {"file_id": file_id}, timeout=30)
    file_path = info.get("file_path")
    if not file_path:
        raise RuntimeError("Telegram getFile returned no file_path")
    token = _token()
    req = urllib.request.Request(f"https://api.telegram.org/file/bot{token}/{file_path}")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read()
    except Exception as exc:
        raise RuntimeError(f"Telegram file download failed: {exc}") from exc


def delete_telegram_message(message_id) -> bool:
    """Best-effort delete of a storage-channel message. Never raises."""
    try:
        _api("deleteMessage", {"chat_id": _chat_id(), "message_id": message_id}, timeout=30)
        return True
    except Exception:
        return False


async def save_pdf(data: bytes, filename: str, content_type: str, user_id: str) -> dict:
    """Store a book PDF: Telegram when possible (<=20MB), else GridFS.

    Returns a dict compatible with storage.save_file's shape plus
    telegram_file_id / telegram_message_id (None when GridFS was used).
    """
    from storage import save_file  # local import: storage imports db lazily too

    meta = None
    if content_type == "application/pdf" and len(data) <= TELEGRAM_MAX_BYTES and telegram_configured():
        try:
            tg = send_pdf_to_telegram(data, filename)
            meta = {
                "storage_path": None,
                "telegram_file_id": tg["file_id"],
                "telegram_message_id": tg["message_id"],
                "provider": "telegram",
            }
        except Exception:
            meta = None  # fall through to GridFS
    if meta is None:
        grid = await save_file(data, filename, content_type, user_id, "books")
        meta = {
            "storage_path": grid["storage_path"],
            "telegram_file_id": None,
            "telegram_message_id": None,
            "provider": "mongodb_gridfs",
        }
    meta.update({"size": len(data), "content_type": content_type, "original_name": filename})
    return meta
