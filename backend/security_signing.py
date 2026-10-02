"""API request signing (HMAC-SHA256) · anti-automation layer.

Canonical string (must match the frontend signer exactly):
    METHOD + "\n" + PATH + "\n" + TS + "\n" + NONCE + "\n" + SHA256HEX(bodyBytes)
PATH is the URL path only (starts with /api, no query string). For GET/HEAD
requests and multipart/form-data uploads the body bytes are EMPTY.

Keys:
- APP_KEY: public client key for unauthenticated requests (env FT_APP_KEY
  or the built-in default below).
- SERVER_SECRET: env FT_SIGNING_SECRET, otherwise generated once and kept
  in the Mongo settings doc {_id: "api_signing"} (never exposed via API).
- Session key: HMAC-SHA256(SERVER_SECRET, "sess:" + access_token) hex ·
  derived from the bearer token, nothing extra is stored.

Modes (settings doc "mode"): off | warn | enforce. Default warn, so the
rollout never breaks the live site: warn logs the outcome in the
X-Ft-Sig response header, enforce rejects unsigned/invalid requests.
"""
import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timezone

from db import db

APP_KEY = os.environ.get(
    "FT_APP_KEY",
    "5c1284a105405feb0300eb6f91e1d7bffdc4643fde967592",
)
SETTINGS_ID = "api_signing"
WINDOW_SECONDS = 300
NONCE_TTL_SECONDS = 600
_CACHE_TTL = 20

_cache = {"cfg": None, "at": 0.0}
_ttl_index_ready = False


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data or b"").hexdigest()


def build_canonical(method: str, path: str, ts: str, nonce: str, body: bytes) -> str:
    return f"{method.upper()}\n{path}\n{ts}\n{nonce}\n{sha256_hex(body)}"


def sign_with_key(key: str, canonical: str) -> str:
    return hmac.new(key.encode("utf-8"), canonical.encode("utf-8"),
                    hashlib.sha256).hexdigest()


def session_key_for_secret(secret: str, token: str) -> str:
    """Session signing key derived from the server secret + access token."""
    return hmac.new(secret.encode("utf-8"), f"sess:{token}".encode("utf-8"),
                    hashlib.sha256).hexdigest()


async def get_signing_config() -> dict:
    """{secret, mode} with a 20s in-process cache. Creates the settings
    doc (with a fresh random secret) when it does not exist yet."""
    global _cache
    now = time.time()
    if _cache["cfg"] is not None and now - _cache["at"] < _CACHE_TTL:
        return _cache["cfg"]
    doc = await db.settings.find_one({"_id": SETTINGS_ID})
    if not doc:
        await db.settings.update_one(
            {"_id": SETTINGS_ID},
            {"$setOnInsert": {"secret": secrets.token_hex(32), "mode": "warn"}},
            upsert=True,
        )
        doc = await db.settings.find_one({"_id": SETTINGS_ID}) or {}
    secret = os.environ.get("FT_SIGNING_SECRET") or doc.get("secret") or ""
    mode = doc.get("mode") or "warn"
    if mode not in ("off", "warn", "enforce"):
        mode = "warn"
    cfg = {"secret": secret, "mode": mode}
    _cache = {"cfg": cfg, "at": now}
    return cfg


def clear_signing_cache() -> None:
    global _cache
    _cache = {"cfg": None, "at": 0.0}


async def get_session_key(token: str) -> str:
    cfg = await get_signing_config()
    return session_key_for_secret(cfg["secret"], token)


async def _check_replay(nonce: str) -> bool:
    """True when this nonce was already seen (replay). Records the nonce
    with a TTL index so the collection cleans itself up."""
    global _ttl_index_ready
    if not _ttl_index_ready:
        try:
            await db.sig_nonces.create_index("at", expireAfterSeconds=NONCE_TTL_SECONDS)
            _ttl_index_ready = True
        except Exception:
            pass
    from pymongo.errors import DuplicateKeyError
    try:
        await db.sig_nonces.insert_one(
            {"_id": nonce, "at": datetime.now(timezone.utc)})
        return False
    except DuplicateKeyError:
        return True


async def verify_request(method, path, ts, nonce, sig, body_bytes, auth_token,
                         query_signed=False):
    """Returns (ok, key_used, reason). key_used is "session" or "app".

    query_signed (media/PDF URLs) gets a 6h window and no nonce-replay
    check: browsers legitimately reuse one signed URL for many range
    requests over a long reading session."""
    cfg = await get_signing_config()
    if not ts or not nonce or not sig:
        return (False, None, "missing")
    try:
        ts_int = int(ts)
    except (TypeError, ValueError):
        return (False, None, "bad_ts")
    window = 6 * 3600 if query_signed else WINDOW_SECONDS
    if abs(int(time.time()) - ts_int) > window:
        return (False, None, "stale")
    if len(nonce) != 16 or any(c not in "0123456789abcdefABCDEF" for c in nonce):
        return (False, None, "bad_nonce")
    candidates = []
    if auth_token:
        candidates.append(("session", session_key_for_secret(cfg["secret"], auth_token)))
    candidates.append(("app", APP_KEY))
    canonical = build_canonical(method, path, str(ts), nonce, body_bytes or b"")
    sig_norm = str(sig).strip().lower()
    for label, key in candidates:
        expected = sign_with_key(key, canonical)
        if hmac.compare_digest(expected, sig_norm):
            if cfg["mode"] == "enforce" and not query_signed and await _check_replay(nonce):
                return (False, None, "replay")
            return (True, label, None)
    return (False, None, "bad_sig")
