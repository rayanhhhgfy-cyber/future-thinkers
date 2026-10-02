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

V2 protocol (header X-Ft-V: "2") layers on top of v1:
- Hour-rotating keys: RK = HMAC-SHA512(L0, "rk:<deviceId>:<hourBucket>"),
  request Sig = HMAC-SHA512(RK, canonical). L0 is the v1 session key or
  APP_KEY exactly as in v1. Server tries buckets b-1, b, b+1.
- Canonical: "V2\n" + METHOD + PATH + QUERY + TSMS + NONCE + DEVICE +
  SHA256HEX(body) + SHA256HEX(content-type), newline-joined. QUERY is the
  sorted raw query string minus the v1 media params (fts/fnonce/fsig).
- Device binding: accounts may register unlimited devices
  (POST /api/auth/device-key -> user.sig_devices). Session-signed v2
  requests must present a registered X-Ft-Dev; when that device has an
  ECDSA P-256 public key, X-Ft-Esig (base64url raw r||s over the
  canonical string) is verified too.
- Proof-of-work (enforce mode, POST /api/auth/login|register):
  SHA256("<ts>.<deviceId>.<powNonce>.<path>") must start with "0000".
"""
import base64
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


# ---------------------------------------------------------------------------
# V2 protocol
# ---------------------------------------------------------------------------
V2_WINDOW_MS = 120_000
V2_BUCKET_MS = 3_600_000
V2_POW_PREFIX = "0000"
V2_POW_PATHS = {"/api/auth/login", "/api/auth/register"}

_user_devices_cache = {}  # uid -> (cached_at, user doc or None)


def _b64url_decode(s: str) -> bytes:
    s = (s or "").strip()
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def canonical_query(query_params) -> str:
    """Sorted raw query string for the v2 canonical: every param except
    the v1 media-signing trio, sorted by (key, value), joined as raw
    "k=v" pairs (values already URL-decoded by Starlette)."""
    items = [(k, v) for k, v in query_params.multi_items()
             if k not in ("fts", "fnonce", "fsig")]
    items.sort(key=lambda kv: (kv[0], kv[1]))
    return "&".join(f"{k}={v}" for k, v in items)


def build_canonical_v2(method, path, query, ts_ms, nonce, device_id,
                       body, content_type) -> str:
    return ("V2\n" + method.upper() + "\n" + path + "\n" + query + "\n"
            + str(ts_ms) + "\n" + nonce + "\n" + (device_id or "") + "\n"
            + sha256_hex(body) + "\n"
            + sha256_hex((content_type or "").encode("utf-8")))


def rotating_key(l0: str, device_id: str, bucket: int) -> str:
    return hmac.new(l0.encode("utf-8"),
                    f"rk:{device_id}:{bucket}".encode("utf-8"),
                    hashlib.sha512).hexdigest()


def sign_v2(l0: str, device_id: str, canonical: str, bucket: int) -> str:
    return hmac.new(rotating_key(l0, device_id, bucket).encode("utf-8"),
                    canonical.encode("utf-8"), hashlib.sha512).hexdigest()


def verify_esig(x_b64: str, y_b64: str, canonical: str, esig_b64: str) -> bool:
    """ECDSA P-256 verify: esig is base64url of raw r||s (64 bytes) over
    the UTF-8 canonical string, ECDSA with SHA-256."""
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives.asymmetric.utils import \
            encode_dss_signature
        raw = _b64url_decode(esig_b64)
        if len(raw) != 64:
            return False
        r = int.from_bytes(raw[:32], "big")
        s = int.from_bytes(raw[32:], "big")
        pub = ec.EllipticCurvePublicNumbers(
            int.from_bytes(_b64url_decode(x_b64), "big"),
            int.from_bytes(_b64url_decode(y_b64), "big"),
            ec.SECP256R1()).public_key()
        try:
            pub.verify(encode_dss_signature(r, s), canonical.encode("utf-8"),
                       ec.ECDSA(hashes.SHA256()))
            return True
        except InvalidSignature:
            return False
    except Exception:
        return False


def _uid_from_token(token: str):
    if not token:
        return None
    try:
        import jwt as _jwt
        from auth import get_secret
        payload = _jwt.decode(token, get_secret(), algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except Exception:
        return None


async def _get_user_for_devices(uid: str):
    """User doc for device binding, 30s in-process cache per uid."""
    now = time.time()
    hit = _user_devices_cache.get(uid)
    if hit and now - hit[0] < 30:
        return hit[1]
    user = None
    try:
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(uid)})
    except Exception:
        user = None
    _user_devices_cache[uid] = (now, user)
    return user


def invalidate_user_devices(uid: str) -> None:
    _user_devices_cache.pop(uid, None)


def verify_pow(ts_ms: str, device_id: str, pow_nonce: str, path: str) -> bool:
    if not pow_nonce or len(pow_nonce) != 16:
        return False
    if any(c not in "0123456789abcdefABCDEF" for c in pow_nonce):
        return False
    digest = sha256_hex(f"{ts_ms}.{device_id}.{pow_nonce}.{path}".encode("utf-8"))
    return digest.startswith(V2_POW_PREFIX)


async def verify_request_v2(method, path, query, ts_raw, nonce, device_id,
                            sig, esig, body_bytes, content_type, auth_token,
                            pow_header):
    """V2 verification. Returns (ok, key_used, reason); key_used is
    "session2"/"app2". Reason strings map to SIG_<REASON> in enforce."""
    cfg = await get_signing_config()
    mode = cfg.get("mode", "warn")
    if not ts_raw or not nonce or not sig:
        return (False, None, "missing")
    try:
        ts_ms = int(ts_raw)
    except (TypeError, ValueError):
        return (False, None, "stale")
    if abs(int(time.time() * 1000) - ts_ms) > V2_WINDOW_MS:
        return (False, None, "stale")
    if len(nonce) != 32 or any(c not in "0123456789abcdefABCDEF" for c in nonce):
        return (False, None, "bad_nonce")
    device_id = device_id or ""
    canonical = build_canonical_v2(method, path, query, str(ts_raw), nonce,
                                   device_id, body_bytes or b"",
                                   content_type or "")
    bucket = ts_ms // V2_BUCKET_MS
    candidates = []
    if auth_token:
        candidates.append(("session2",
                           session_key_for_secret(cfg["secret"], auth_token)))
    candidates.append(("app2", APP_KEY))
    sig_norm = str(sig).strip().lower()
    matched = None
    for label, l0 in candidates:
        for b in (bucket - 1, bucket, bucket + 1):
            if hmac.compare_digest(sign_v2(l0, device_id, canonical, b), sig_norm):
                matched = label
                break
        if matched:
            break
    if not matched:
        return (False, None, "bad_sig")
    if mode == "enforce" and await _check_replay(nonce):
        return (False, matched, "replay")
    if matched == "session2":
        uid = _uid_from_token(auth_token)
        user = await _get_user_for_devices(uid) if uid else None
        devices = (user or {}).get("sig_devices") or []
        if devices:
            entry = next((d for d in devices
                          if d.get("device_id") == device_id), None)
            if entry is None:
                return (False, matched, "device")
            if entry.get("x") and entry.get("y"):
                if not esig or not verify_esig(entry["x"], entry["y"],
                                               canonical, esig):
                    return (False, matched, "ec_bad")
    if mode == "enforce" and method.upper() == "POST" and path in V2_POW_PATHS:
        if not verify_pow(str(ts_raw), device_id, pow_header or "", path):
            return (False, matched, "pow")
    return (True, matched, None)
