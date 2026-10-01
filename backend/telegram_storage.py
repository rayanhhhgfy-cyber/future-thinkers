"""Telegram file storage for book PDFs (stdlib only — no new dependencies).

Every book PDF lives on Telegram, regardless of size. Telegram's Bot API
only lets bots *download* files up to 20MB, so PDFs bigger than that are
split into ~19MB parts: each part is sent as its own document message and
the parts are stitched back together (in order) on every download.

Security model:
- The bot token and storage chat id live ONLY in server environment variables
  (TELEGRAM_BOT_TOKEN / TELEGRAM_STORAGE_CHAT_ID). They are never written to
  the repo, never logged, and never sent to the frontend.
- MongoDB stores only Telegram file_ids (+ message_ids for cleanup). A
  file_id is useless without the bot token, so a database leak alone exposes
  nothing downloadable.
- All downloads are proxied through the backend (/api/books/{id}/pdf): the
  browser never sees the token or the direct Telegram file URL.
"""
import json
import os
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor

# Bot getFile (download) caps at 20MB per file — stay comfortably under it.
TG_PART_BYTES = 19 * 1024 * 1024
# Bot sendDocument caps at 50MB per file — parts are far below it.
_SEND_WORKERS = 4


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


def _with_retries(fn, tries=3, label="telegram call"):
    last = None
    for attempt in range(1, tries + 1):
        try:
            return fn()
        except Exception as exc:
            last = exc
    raise RuntimeError(f"{label} failed after {tries} tries: {last}") from last


def _send_part(args) -> dict:
    """Send one part. args = (index, total, part_bytes, filename, tag)."""
    def _do():
        return _send_part_once(*args)
    return _with_retries(_do, label=f"Telegram sendDocument part {args[0] + 1}/{args[1]}")


def _send_part_once(index, total, part_bytes, filename, tag=None) -> dict:
    token = _token()
    chat_id = _chat_id()
    boundary = uuid.uuid4().hex
    tag_suffix = f" · {tag}" if tag else ""
    if total > 1:
        caption = f"📚 {filename or 'book.pdf'}{tag_suffix} — جزء {index + 1}/{total}"
    else:
        caption = f"📚 {filename or 'book.pdf'}{tag_suffix}"
    body = b"".join([
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{chat_id}\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{caption}\r\n".encode(),
        (f"--{boundary}\r\nContent-Disposition: form-data; name=\"document\"; "
         f"filename=\"part-{index + 1}.pdf\"\r\nContent-Type: application/pdf\r\n\r\n").encode(),
        part_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ])
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendDocument",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            out = json.load(resp)
    except Exception as exc:
        raise RuntimeError(f"Telegram sendDocument part {index + 1}/{total} failed: {exc}") from exc
    if not out.get("ok"):
        raise RuntimeError(f"Telegram sendDocument part {index + 1}/{total} error: {out}")
    doc = out["result"]["document"]
    return {"file_id": doc["file_id"], "message_id": out["result"]["message_id"]}


def send_pdf_to_telegram(pdf_bytes: bytes, filename: str, tag: str | None = None) -> dict:
    """Upload a PDF of any size to the storage channel.

    `tag` is a unique per-book identifier embedded in every part's caption so
    channel messages can always be traced back to exactly one book.
    Returns {"file_ids": [...], "message_ids": [...]} in part order.
    Parts are uploaded in parallel (4 workers) to keep big files fast.
    """
    if not telegram_configured():
        raise RuntimeError("Telegram storage is not configured")
    total = max(1, (len(pdf_bytes) + TG_PART_BYTES - 1) // TG_PART_BYTES)
    parts = [pdf_bytes[i * TG_PART_BYTES:(i + 1) * TG_PART_BYTES] for i in range(total)]
    with ThreadPoolExecutor(max_workers=min(_SEND_WORKERS, total)) as pool:
        results = list(pool.map(_send_part, [(i, total, p, filename, tag) for i, p in enumerate(parts)]))
    return {
        "file_ids": [r["file_id"] for r in results],
        "message_ids": [r["message_id"] for r in results],
    }


def _fetch_part(file_id: str) -> bytes:
    return _with_retries(lambda: _fetch_part_once(file_id), label="Telegram file download")


def _fetch_part_once(file_id: str) -> bytes:
    info = _api("getFile", {"file_id": file_id}, timeout=30)
    file_path = info.get("file_path")
    if not file_path:
        raise RuntimeError("Telegram getFile returned no file_path")
    token = _token()
    req = urllib.request.Request(f"https://api.telegram.org/file/bot{token}/{file_path}")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return resp.read()
    except Exception as exc:
        raise RuntimeError(f"Telegram file download failed: {exc}") from exc


def fetch_pdf_from_telegram(file_ids) -> bytes:
    """Download all parts and stitch them back together in order."""
    if isinstance(file_ids, str):
        file_ids = [file_ids]
    if not file_ids:
        raise RuntimeError("No Telegram file ids")
    with ThreadPoolExecutor(max_workers=min(_SEND_WORKERS, len(file_ids))) as pool:
        parts = list(pool.map(_fetch_part, file_ids))
    return b"".join(parts)


def iter_pdf_parts_from_telegram(file_ids):
    """Yield parts in order (for streaming responses). Downloads sequentially."""
    if isinstance(file_ids, str):
        file_ids = [file_ids]
    for fid in file_ids:
        yield _fetch_part(fid)


def delete_telegram_messages(message_ids) -> None:
    """Best-effort delete of storage-channel messages. Never raises."""
    if not message_ids:
        return
    if not isinstance(message_ids, (list, tuple)):
        message_ids = [message_ids]
    for mid in message_ids:
        try:
            _api("deleteMessage", {"chat_id": _chat_id(), "message_id": mid}, timeout=30)
        except Exception:
            pass


# Backwards-compatible aliases (single-file era, minutes old — kept for safety)
def fetch_pdf_from_telegram_single(file_id: str) -> bytes:
    return fetch_pdf_from_telegram([file_id])


def delete_telegram_message(message_id) -> bool:
    try:
        delete_telegram_messages(message_id)
        return True
    except Exception:
        return False


async def save_pdf(data: bytes, filename: str, content_type: str, user_id: str,
                 tag: str | None = None) -> dict:
    """Store a book PDF on Telegram (any size). GridFS is only the fallback
    when Telegram isn't configured or the upload fails.

    Returns a dict compatible with storage.save_file's shape plus
    telegram_file_ids / telegram_message_ids (None when GridFS was used).
    """
    from storage import save_file  # local import: storage imports db lazily too

    meta = None
    if content_type == "application/pdf" and telegram_configured():
        try:
            tg = send_pdf_to_telegram(data, filename, tag=tag)
            meta = {
                "storage_path": None,
                "telegram_file_ids": tg["file_ids"],
                "telegram_message_ids": tg["message_ids"],
                # legacy single-value fields (first part) for older readers
                "telegram_file_id": tg["file_ids"][0],
                "telegram_message_id": tg["message_ids"][0],
                "provider": "telegram",
            }
        except Exception:
            meta = None  # fall through to GridFS
    if meta is None:
        grid = await save_file(data, filename, content_type, user_id, "books")
        meta = {
            "storage_path": grid["storage_path"],
            "telegram_file_ids": None,
            "telegram_message_ids": None,
            "telegram_file_id": None,
            "telegram_message_id": None,
            "provider": "mongodb_gridfs",
        }
    meta.update({"size": len(data), "content_type": content_type, "original_name": filename})
    return meta
