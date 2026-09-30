import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

_client = None
_db = None


def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name!r}. "
            "Set it in the Vercel project settings (Environment Variables) and redeploy."
        )
    return value


def init_db():
    """Create the Motor client lazily (must run inside the app's event loop).

    Safe to call multiple times; only the first call creates the client.
    Raises a clear RuntimeError (instead of a bare KeyError) when the
    required environment variables are missing.
    """
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(_required_env("MONGO_URL"))
        _db = _client[_required_env("DB_NAME")]
    return _db


def get_db():
    # Lazily (re)initialize so request handlers keep working even when the
    # startup lifespan event did not run or failed in the serverless runtime.
    if _db is None:
        init_db()
    return _db


class _DatabaseProxy:
    def __getattr__(self, name):
        return getattr(get_db(), name)


class _ClientProxy:
    def close(self):
        global _client, _db
        if _client is not None:
            _client.close()
            _client = None
            _db = None


db = _DatabaseProxy()
client = _ClientProxy()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ser(doc):
    """Serialize a mongo document: _id(ObjectId) -> id(str). Drop sensitive fields."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


def sers(docs):
    return [ser(d) for d in docs]


def oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None
