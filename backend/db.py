import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

_client = None
_db = None


def init_db():
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        _db = _client[os.environ["DB_NAME"]]
    return _db


def get_db():
    if _db is None:
        raise RuntimeError("Database has not been initialized")
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
