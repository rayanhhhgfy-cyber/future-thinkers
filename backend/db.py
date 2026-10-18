"""MongoDB-compatible async database adapter over Turso (libsql/SQLite).

Drop-in replacement for the Motor-based db.py. Exposes the identical
interface (init_db/get_db/db proxy/client proxy/now_iso/ser/sers/oid)
so all existing call sites keep working unchanged.

Storage model: one SQLite table per collection:
    CREATE TABLE IF NOT EXISTS "<name>" (_id TEXT PRIMARY KEY, _doc TEXT NOT NULL)
_doc holds the full document as JSON with $oid/$date/$binary markers so
ObjectId, datetime and bson.Binary round-trip with fidelity.

All libsql calls are synchronous -> every DB operation is wrapped in
asyncio.to_thread to preserve the async interface.
"""

import asyncio
import base64
import json
import os
import re
from datetime import datetime, timezone

from bson import Binary, ObjectId

_client = None  # libsql connection (sync, used via to_thread)
_tables = set()  # tables already ensured


# ---------------------------------------------------------------------------
# env / lifecycle (same style as the Motor version)
# ---------------------------------------------------------------------------

def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name!r}. "
            "Set it in the Vercel project settings (Environment Variables) and redeploy."
        )
    return value


def _connect():
    import libsql_experimental as libsql
    url = _required_env("TURSO_DATABASE_URL")
    token = _required_env("TURSO_AUTH_TOKEN")
    # libsql://... URLs need the auth token; plain file: URLs work without it.
    if url.startswith("libsql://") or url.startswith("https://"):
        return libsql.connect(url, auth_token=token)
    return libsql.connect(url)


def init_db():
    """Create the libsql client lazily. Safe to call multiple times."""
    global _client
    if _client is None:
        _client = _connect()
    return _Database(_client)


def get_db():
    if _client is None:
        init_db()
    return _Database(_client)


class _DatabaseProxy:
    def __getattr__(self, name):
        return _Collection(get_db()._conn, name)


class _ClientProxy:
    def close(self):
        global _client, _tables
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
            _client = None
            _tables = set()


db = _DatabaseProxy()
client = _ClientProxy()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ser(doc):
    """Serialize a document: _id(ObjectId/str) -> id(str). Drop sensitive fields."""
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


# ---------------------------------------------------------------------------
# JSON codec with Mongo type round-tripping
# ---------------------------------------------------------------------------

class _Encoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return {"$oid": str(o)}
        if isinstance(o, datetime):
            return {"$date": o.isoformat()}
        if isinstance(o, (Binary, bytes, bytearray)):
            return {"$binary": base64.b64encode(bytes(o)).decode("ascii")}
        return super().default(o)


def _decode(obj):
    if isinstance(obj, dict):
        if set(obj.keys()) == {"$oid"}:
            try:
                return ObjectId(obj["$oid"])
            except Exception:
                return obj
        if set(obj.keys()) == {"$date"}:
            try:
                return datetime.fromisoformat(obj["$date"])
            except Exception:
                return obj
        if set(obj.keys()) == {"$binary"}:
            try:
                return Binary(base64.b64decode(obj["$binary"]))
            except Exception:
                return obj
        return {k: _decode(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decode(v) for v in obj]
    return obj


def _to_json(doc: dict) -> str:
    return json.dumps(doc, cls=_Encoder, ensure_ascii=False)


def _from_json(text: str) -> dict:
    return _decode(json.loads(text))


def _norm_id(value):
    """Normalize an _id value to its string storage form."""
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


# ---------------------------------------------------------------------------
# Filter -> SQL WHERE translator
# ---------------------------------------------------------------------------

def _json_path(field: str) -> str:
    # "a.b.c" -> '$."a"."b"."c"'  (quote each segment for safety)
    parts = field.split(".")
    return "$." + ".".join('"%s"' % p.replace('"', '""') for p in parts)


class _Where:
    def __init__(self):
        self.clauses = []
        self.params = []

    def add(self, clause, *params):
        self.clauses.append(clause)
        self.params.extend(params)

    def sql(self):
        if not self.clauses:
            return "1=1", []
        return "(" + " AND ".join(self.clauses) + ")", self.params


def _translate_filter(filt) -> tuple:
    """Return (where_sql, params) for a Mongo filter dict."""
    w = _Where()
    _translate_into(w, filt or {})
    return w.sql()


def _translate_into(w: _Where, filt: dict):
    for key, cond in filt.items():
        if key == "$or":
            subs = []
            for sub in cond:
                sw = _Where()
                _translate_into(sw, sub)
                s, p = sw.sql()
                subs.append(s)
                w.params.extend(p)
            w.clauses.append("(" + " OR ".join(subs) + ")")
            continue
        if key == "$and":
            subs = []
            for sub in cond:
                sw = _Where()
                _translate_into(sw, sub)
                s, p = sw.sql()
                subs.append(s)
                w.params.extend(p)
            w.clauses.append("(" + " AND ".join(subs) + ")")
            continue
        if key == "$nor":
            subs = []
            for sub in cond:
                sw = _Where()
                _translate_into(sw, sub)
                s, p = sw.sql()
                subs.append(s)
                w.params.extend(p)
            w.clauses.append("NOT (" + " OR ".join(subs) + ")")
            continue
        if key.startswith("$"):
            # unknown top-level operator -> ignore (safe default)
            continue
        _translate_field(w, key, cond)


def _field_expr(field: str) -> str:
    """SQL expression yielding the field value for comparisons."""
    if field == "_id":
        return '"_id"'
    return "json_extract(_doc, '%s')" % _json_path(field).replace("'", "''")


def _coerce_param(value):
    """Convert a Python filter value to a SQLite-bindable scalar."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (Binary, bytes, bytearray)):
        return base64.b64encode(bytes(value)).decode("ascii")
    if isinstance(value, bool):
        return 1 if value else 0
    return value


def _translate_field(w: _Where, field: str, cond):
    expr = _field_expr(field)
    if isinstance(cond, dict) and any(k.startswith("$") for k in cond):
        for op, val in cond.items():
            if op == "$gt":
                w.add(f"{expr} > ?", _coerce_param(val))
            elif op == "$gte":
                w.add(f"{expr} >= ?", _coerce_param(val))
            elif op == "$lt":
                w.add(f"{expr} < ?", _coerce_param(val))
            elif op == "$lte":
                w.add(f"{expr} <= ?", _coerce_param(val))
            elif op == "$ne":
                if val is None:
                    w.add(f"({expr} IS NOT NULL)")
                else:
                    w.add(f"({expr} IS NULL OR {expr} != ?)", _coerce_param(val))
            elif op == "$in":
                vals = [_coerce_param(v) for v in val]
                if not vals:
                    w.add("1=0")
                else:
                    ph = ",".join("?" * len(vals))
                    w.add(f"{expr} IN ({ph})", *vals)
            elif op == "$nin":
                vals = [_coerce_param(v) for v in val]
                if vals:
                    ph = ",".join("?" * len(vals))
                    w.add(f"({expr} IS NULL OR {expr} NOT IN ({ph}))", *vals)
            elif op == "$exists":
                if val:
                    w.add(f"{expr} IS NOT NULL")
                else:
                    w.add(f"{expr} IS NULL")
            elif op == "$regex":
                opts = cond.get("$options", "")
                pattern = val
                if "i" in opts:
                    # case-insensitive: lower both sides
                    w.add(f"lower({expr}) REGEXP lower(?)", pattern)
                else:
                    w.add(f"{expr} REGEXP ?", pattern)
            elif op == "$not":
                sw = _Where()
                _translate_field(sw, field, val)
                s, p = sw.sql()
                w.clauses.append(f"NOT ({s})")
                w.params.extend(p)
            elif op == "$all":
                for v in val:
                    # json_each over the array; value must be present
                    w.add(
                        f"EXISTS (SELECT 1 FROM json_each({expr}) WHERE value = ?)",
                        _coerce_param(v),
                    )
            elif op == "$size":
                w.add(f"json_array_length({expr}) = ?", int(val))
            elif op == "$elemMatch":
                # approximate: at least one array element matches sub-filter
                # (only supports simple equality conditions inside)
                for sk, sv in (val or {}).items():
                    if isinstance(sv, dict):
                        continue
                    w.add(
                        f"EXISTS (SELECT 1 FROM json_each({expr}) "
                        f"WHERE json_extract(value, '$.{sk}') = ?)",
                        _coerce_param(sv),
                    )
            # unknown operator -> ignore
        return
    # implicit equality (None must use IS NULL)
    if cond is None:
        w.add(f"{expr} IS NULL")
    else:
        w.add(f"{expr} = ?", _coerce_param(cond))


# ---------------------------------------------------------------------------
# Update application (read-modify-write in Python)
# ---------------------------------------------------------------------------

def _get_path(doc: dict, path: str, default=None):
    cur = doc
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return default
    return cur


def _set_path(doc: dict, path: str, value):
    parts = path.split(".")
    cur = doc
    for part in parts[:-1]:
        nxt = cur.get(part)
        if not isinstance(nxt, dict):
            nxt = {}
            cur[part] = nxt
        cur = nxt
    cur[parts[-1]] = value


def _unset_path(doc: dict, path: str):
    parts = path.split(".")
    cur = doc
    for part in parts[:-1]:
        if not isinstance(cur, dict) or part not in cur:
            return
        cur = cur[part]
    if isinstance(cur, dict):
        cur.pop(parts[-1], None)


def _apply_update(doc: dict, update: dict, is_insert: bool = False) -> bool:
    """Apply a Mongo update document to a dict in place. Returns True if changed."""
    changed = False
    for op, spec in update.items():
        if op == "$set":
            for k, v in spec.items():
                if _get_path(doc, k, object()) != v:
                    _set_path(doc, k, v)
                    changed = True
        elif op == "$unset":
            for k in spec:
                if _get_path(doc, k, object()) is not object():
                    _unset_path(doc, k)
                    changed = True
        elif op == "$inc":
            for k, v in spec.items():
                cur = _get_path(doc, k, 0) or 0
                _set_path(doc, k, cur + v)
                changed = True
        elif op == "$push":
            for k, v in spec.items():
                arr = _get_path(doc, k, None)
                if not isinstance(arr, list):
                    arr = []
                    _set_path(doc, k, arr)
                if isinstance(v, dict) and "$each" in v:
                    arr.extend(v["$each"])
                else:
                    arr.append(v)
                changed = True
        elif op == "$pull":
            for k, v in spec.items():
                arr = _get_path(doc, k, None)
                if isinstance(arr, list):
                    new = [x for x in arr if x != v]
                    if len(new) != len(arr):
                        _set_path(doc, k, new)
                        changed = True
        elif op == "$addToSet":
            for k, v in spec.items():
                arr = _get_path(doc, k, None)
                if not isinstance(arr, list):
                    arr = []
                    _set_path(doc, k, arr)
                vals = v["$each"] if isinstance(v, dict) and "$each" in v else [v]
                for item in vals:
                    if item not in arr:
                        arr.append(item)
                        changed = True
        elif op == "$setOnInsert":
            if is_insert:
                for k, v in spec.items():
                    _set_path(doc, k, v)
                    changed = True
        # unknown operators ignored
    return changed


# ---------------------------------------------------------------------------
# Cursor (async, Motor-compatible subset)
# ---------------------------------------------------------------------------

class _Cursor:
    def __init__(self, docs):
        self._docs = list(docs)
        self._index = 0

    # -- chainable modifiers (sync, like Motor) --
    def sort(self, key, direction=1):
        reverse = direction < 0
        if isinstance(key, (list, tuple)):
            # Motor also accepts a list of (key, direction) pairs
            for k, d in reversed(list(key)):
                self._docs.sort(key=lambda d_: _sort_key(_get_path(d_, k)),
                                reverse=(d < 0))
        else:
            self._docs.sort(key=lambda d_: _sort_key(_get_path(d_, key)),
                            reverse=reverse)
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    # -- async terminal --
    async def to_list(self, length=None):
        docs = self._docs if length is None else self._docs[:length]
        return docs

    # -- async iteration --
    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self._docs):
            raise StopAsyncIteration
        doc = self._docs[self._index]
        self._index += 1
        return doc


def _sort_key(value):
    # None sorts before everything; mixed types -> compare as strings
    if value is None:
        return (0, "")
    if isinstance(value, (int, float)):
        return (1, value)
    return (2, str(value))


# ---------------------------------------------------------------------------
# Aggregation (evaluated in Python for correctness)
# ---------------------------------------------------------------------------

def _expr_val(doc: dict, expr):
    """Resolve a $group/_id expression against a document."""
    if isinstance(expr, str) and expr.startswith("$"):
        return _get_path(doc, expr[1:])
    if isinstance(expr, dict):
        if "$substr" in expr:
            src, start, length = expr["$substr"]
            s = str(_expr_val(doc, src) or "")
            return s[start:start + length]
        if "$dateToString" in expr:
            spec = expr["$dateToString"]
            fmt = spec.get("format", "%Y-%m-%d")
            d = _expr_val(doc, spec.get("date"))
            try:
                if isinstance(d, str):
                    d = datetime.fromisoformat(d)
                return d.strftime(fmt) if isinstance(d, datetime) else str(d or "")
            except Exception:
                return str(d or "")
        if "$ifNull" in expr:
            for item in expr["$ifNull"]:
                v = _expr_val(doc, item)
                if v is not None:
                    return v
            return None
        if "$toLower" in expr:
            return str(_expr_val(doc, expr["$toLower"]) or "").lower()
        if "$toUpper" in expr:
            return str(_expr_val(doc, expr["$toUpper"]) or "").upper()
        if "$year" in expr:
            d = _expr_val(doc, expr["$year"])
            try:
                return datetime.fromisoformat(str(d)).year
            except Exception:
                return None
        if "$month" in expr:
            d = _expr_val(doc, expr["$month"])
            try:
                return datetime.fromisoformat(str(d)).month
            except Exception:
                return None
        if "$dayOfMonth" in expr:
            d = _expr_val(doc, expr["$dayOfMonth"])
            try:
                return datetime.fromisoformat(str(d)).day
            except Exception:
                return None
        # composite _id: resolve each key
        return {k: _expr_val(doc, v) for k, v in expr.items()}
    return expr


def _run_pipeline(docs: list, pipeline: list) -> list:
    rows = list(docs)
    for stage in pipeline:
        if not isinstance(stage, dict) or len(stage) != 1:
            continue
        op, spec = next(iter(stage.items()))
        if op == "$match":
            rows = [d for d in rows if _doc_matches(d, spec)]
        elif op == "$sort":
            for k, d in reversed(list(spec.items())):
                rows.sort(key=lambda r: _sort_key(_get_path(r, k)), reverse=(d < 0))
        elif op == "$limit":
            rows = rows[:int(spec)]
        elif op == "$skip":
            rows = rows[int(spec):]
        elif op == "$unwind":
            field = spec[1:] if isinstance(spec, str) and spec.startswith("$") else spec
            out = []
            for d in rows:
                arr = _get_path(d, field, None)
                if isinstance(arr, list) and arr:
                    for item in arr:
                        nd = dict(d)
                        _set_path(nd, field, item)
                        out.append(nd)
                # empty array / missing / null -> doc is dropped (mongo default)
            rows = out
        elif op == "$group":
            rows = _group_rows(rows, spec)
        elif op == "$project":
            rows = [_project_doc(d, spec) for d in rows]
        elif op == "$lookup":
            rows = _lookup_rows(rows, spec)
        # unknown stages ignored
    return rows


def _doc_matches(doc: dict, filt: dict) -> bool:
    """Pure-Python filter check (used after SQL pre-filtering)."""
    for key, cond in (filt or {}).items():
        if key == "$or":
            if not any(_doc_matches(doc, s) for s in cond):
                return False
            continue
        if key == "$and":
            if not all(_doc_matches(doc, s) for s in cond):
                return False
            continue
        if key == "$nor":
            if any(_doc_matches(doc, s) for s in cond):
                return False
            continue
        if key.startswith("$"):
            continue
        val = _get_path(doc, key, None) if "." in key else doc.get(key)
        # normalize ObjectId comparisons
        if isinstance(val, ObjectId):
            val = str(val)
        if isinstance(cond, dict) and any(k.startswith("$") for k in cond):
            for cop, cval in cond.items():
                cv = str(cval) if isinstance(cval, ObjectId) else cval
                if cop == "$gt" and not (val is not None and val > cv):
                    return False
                elif cop == "$gte" and not (val is not None and val >= cv):
                    return False
                elif cop == "$lt" and not (val is not None and val < cv):
                    return False
                elif cop == "$lte" and not (val is not None and val <= cv):
                    return False
                elif cop == "$ne":
                    if cv is None:
                        if val is None:
                            return False
                    elif val == cv:
                        return False
                elif cop == "$in":
                    cvs = [str(x) if isinstance(x, ObjectId) else x for x in cval]
                    if val not in cvs:
                        return False
                elif cop == "$nin":
                    cvs = [str(x) if isinstance(x, ObjectId) else x for x in cval]
                    if val in cvs:
                        return False
                elif cop == "$exists":
                    exists = ("." in key and _get_path(doc, key, object()) is not object()) \
                        or ("." not in key and key in doc)
                    if bool(cval) != exists:
                        return False
                elif cop == "$regex":
                    opts = cond.get("$options", "")
                    flags = re.I if "i" in opts else 0
                    if not re.search(str(cval), str(val or ""), flags):
                        return False
        else:
            cv = str(cond) if isinstance(cond, ObjectId) else cond
            if cond is None:
                if val is not None:
                    return False
            elif val != cv:
                return False
    return True


def _group_rows(rows: list, spec: dict) -> list:
    groups = {}
    order = []
    for d in rows:
        gid = _expr_val(d, spec.get("_id"))
        gkey = json.dumps(gid, sort_keys=True, default=str)
        if gkey not in groups:
            groups[gkey] = {"_id": gid}
            order.append(gkey)
        g = groups[gkey]
        for field, acc in spec.items():
            if field == "_id":
                continue
            if not isinstance(acc, dict) or len(acc) != 1:
                continue
            aop, aval = next(iter(acc.items()))
            v = _expr_val(d, aval)
            if aop == "$sum":
                if isinstance(aval, (int, float)):
                    g[field] = g.get(field, 0) + aval
                else:
                    g[field] = g.get(field, 0) + (v if isinstance(v, (int, float)) else 0)
            elif aop == "$avg":
                s, c = g.get(field, (0, 0))
                if isinstance(v, (int, float)):
                    s, c = s + v, c + 1
                g[field] = (s, c)
            elif aop == "$min":
                if field not in g or (v is not None and (g[field] is None or v < g[field])):
                    g[field] = v
            elif aop == "$max":
                if field not in g or (v is not None and (g[field] is None or v > g[field])):
                    g[field] = v
            elif aop == "$first":
                if field not in g:
                    g[field] = v
            elif aop == "$last":
                g[field] = v
            elif aop == "$push":
                g.setdefault(field, []).append(v)
            elif aop == "$addToSet":
                arr = g.setdefault(field, [])
                if v not in arr:
                    arr.append(v)
            elif aop == "$count":
                g[field] = g.get(field, 0) + 1
    out = []
    for gkey in order:
        g = groups[gkey]
        for field, acc in spec.items():
            if isinstance(acc, dict) and "$avg" in acc:
                s, c = g.get(field, (0, 0))
                g[field] = (s / c) if c else None
        out.append(g)
    return out


def _project_doc(doc: dict, spec: dict) -> dict:
    # inclusion (any truthy non-zero value) vs exclusion (all zeros)
    vals = [v for k, v in spec.items() if k != "_id"]
    inclusion = any(v for v in vals)
    out = {}
    if inclusion:
        for k, v in spec.items():
            if k == "_id" and v == 0:
                continue
            if v:
                out[k] = _expr_val(doc, v) if isinstance(v, (str, dict)) and v != 1 else _get_path(doc, k)
                if v == 1:
                    out[k] = _get_path(doc, k)
        if spec.get("_id", 1) != 0 and "_id" in doc:
            out["_id"] = doc["_id"]
    else:
        out = dict(doc)
        for k, v in spec.items():
            if v == 0:
                out.pop(k, None)
    return out


def _lookup_rows(rows: list, spec: dict):
    # resolved by the collection (needs DB access) — placeholder replaced below
    return rows


# ---------------------------------------------------------------------------
# Result wrappers (Motor-compatible attribute shapes)
# ---------------------------------------------------------------------------

class _InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id
        self.acknowledged = True


class _InsertManyResult:
    def __init__(self, inserted_ids):
        self.inserted_ids = inserted_ids
        self.acknowledged = True


class _UpdateResult:
    def __init__(self, matched_count, modified_count, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id
        self.acknowledged = True


class _DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count
        self.acknowledged = True


class _BulkWriteResult:
    def __init__(self, matched=0, modified=0, upserted=0, inserted=0):
        self.matched_count = matched
        self.modified_count = modified
        self.upserted_count = upserted
        self.inserted_count = inserted
        self.acknowledged = True


# ---------------------------------------------------------------------------
# Collection
# ---------------------------------------------------------------------------

def _ensure_table(conn, name: str):
    if name in _tables:
        return
    # table names come from code (not user input); still quote defensively
    safe = name.replace('"', '""')
    conn.execute(f'CREATE TABLE IF NOT EXISTS "{safe}" (_id TEXT PRIMARY KEY, _doc TEXT NOT NULL)')
    conn.commit()
    _tables.add(name)


def _apply_projection(doc: dict, projection) -> dict:
    if not projection:
        return doc
    if isinstance(projection, (list, tuple)):
        keys = list(projection)
        return {k: doc[k] for k in keys if k in doc}
    vals = [v for k, v in projection.items() if k != "_id"]
    inclusion = any(v for v in vals)
    out = dict(doc)
    if inclusion:
        out = {k: doc[k] for k, v in projection.items() if v and k in doc}
        if projection.get("_id", 1):
            out["_id"] = doc["_id"]
        else:
            out.pop("_id", None)
    else:
        for k, v in projection.items():
            if not v:
                out.pop(k, None)
    return out


class _Database:
    def __init__(self, conn):
        self._conn = conn

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return _Collection(self._conn, name)

    def __getitem__(self, name):
        return _Collection(self._conn, name)

    @property
    def client(self):
        """Mongo-compat: db.client.admin.command('ping') for health checks."""
        return _ClientCompat(self._conn)


class _ClientCompat:
    def __init__(self, conn):
        self._conn = conn
        self.admin = self

    async def command(self, *args, **kwargs):
        # Only 'ping' is used (health check). Run a trivial query via thread.
        import asyncio
        def _ping():
            cur = self._conn.execute("SELECT 1")
            cur.fetchone()
            return {"ok": 1}
        return await asyncio.to_thread(_ping)


class _Collection:
    def __init__(self, conn, name: str):
        self._conn = conn
        self._name = name
        self._table = name.replace('"', '""')

    # -- internal sync helpers (run inside to_thread) --
    def _sync_ensure(self):
        _ensure_table(self._conn, self._name)

    def _sync_all(self):
        self._sync_ensure()
        cur = self._conn.execute(f'SELECT _id, _doc FROM "{self._table}"')
        out = []
        for row in cur.fetchall():
            doc = _from_json(row[1])
            doc["_id"] = doc.get("_id", row[0])
            out.append(doc)
        return out

    def _sync_find(self, where_sql, params):
        self._sync_ensure()
        cur = self._conn.execute(
            f'SELECT _id, _doc FROM "{self._table}" WHERE {where_sql}', tuple(params))
        out = []
        for row in cur.fetchall():
            doc = _from_json(row[1])
            doc["_id"] = doc.get("_id", row[0])
            out.append(doc)
        return out

    def _sync_write_doc(self, doc_id: str, doc: dict):
        self._sync_ensure()
        # keep the stored _id consistent with the row key
        doc = dict(doc)
        doc["_id"] = doc_id
        self._conn.execute(
            f'INSERT OR REPLACE INTO "{self._table}" (_id, _doc) VALUES (?, ?)',
            (doc_id, _to_json(doc)))
        self._conn.commit()

    def _sync_delete_ids(self, ids):
        if not ids:
            return 0
        self._sync_ensure()
        ph = ",".join("?" * len(ids))
        cur = self._conn.execute(
            f'DELETE FROM "{self._table}" WHERE _id IN ({ph})', tuple(ids))
        self._conn.commit()
        return cur.rowcount if cur.rowcount and cur.rowcount > 0 else 0

    # -- public async API --
    async def find_one(self, filter=None, projection=None, *args, **kwargs):
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        if not docs:
            return None
        return _apply_projection(docs[0], projection)

    def find(self, filter=None, projection=None, *args, **kwargs):
        # NOTE: sync like Motor (returns cursor immediately); IO happens in to_list
        return _LazyCursor(self, filter, projection)

    async def insert_one(self, doc):
        new_id = _norm_id(doc.get("_id", ObjectId()))
        stored = dict(doc)
        stored["_id"] = new_id
        await asyncio.to_thread(self._sync_write_doc, new_id, stored)
        return _InsertOneResult(new_id)

    async def insert_many(self, docs, ordered=True):
        ids = []
        for doc in docs:
            r = await self.insert_one(doc)
            ids.append(r.inserted_id)
        return _InsertManyResult(ids)

    def _sync_update(self, where_sql, params, update, upsert, limit_one=False):
        docs = self._sync_find(where_sql, params)
        if limit_one:
            docs = docs[:1]
        matched = len(docs)
        modified = 0
        upserted_id = None
        if docs:
            for doc in docs:
                doc_id = _norm_id(doc.get("_id"))
                if _apply_update(doc, update, is_insert=False):
                    modified += 1
                self._sync_write_doc(doc_id, doc)
        elif upsert:
            new_id = _norm_id(ObjectId())
            new_doc = {"_id": new_id}
            _apply_update(new_doc, update, is_insert=True)
            self._sync_write_doc(new_id, new_doc)
            upserted_id = new_id
        return matched, modified, upserted_id

    async def update_one(self, filter, update, upsert=False, **kwargs):
        where_sql, params = _translate_filter(filter)
        matched, modified, upserted_id = await asyncio.to_thread(
            self._sync_update, where_sql, params, update, upsert, True)
        return _UpdateResult(matched, modified, upserted_id)

    async def update_many(self, filter, update, upsert=False, **kwargs):
        where_sql, params = _translate_filter(filter)
        matched, modified, upserted_id = await asyncio.to_thread(
            self._sync_update, where_sql, params, update, upsert, False)
        return _UpdateResult(matched, modified, upserted_id)

    async def delete_one(self, filter, **kwargs):
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        if not docs:
            return _DeleteResult(0)
        n = await asyncio.to_thread(
            self._sync_delete_ids, [_norm_id(docs[0].get("_id"))])
        return _DeleteResult(n)

    async def delete_many(self, filter, **kwargs):
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        n = await asyncio.to_thread(
            self._sync_delete_ids, [_norm_id(d.get("_id")) for d in docs])
        return _DeleteResult(n)

    async def count_documents(self, filter, **kwargs):
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        return len(docs)

    async def distinct(self, field, filter=None, **kwargs):
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        seen = []
        for d in docs:
            v = _get_path(d, field, None) if "." in field else d.get(field)
            if v is not None and v not in seen:
                seen.append(v)
        return seen

    def aggregate(self, pipeline, *args, **kwargs):
        return _LazyAggregateCursor(self, pipeline)

    async def create_index(self, keys, **kwargs):
        # SQLite: real indexes on JSON paths are overkill here; _id is already PK.
        if isinstance(keys, (list, tuple)):
            name = "_".join(str(k) for k, _ in keys)
        else:
            name = str(keys)
        return f"{name}_1"

    async def find_one_and_update(self, filter, update, upsert=False,
                                  return_document=False, **kwargs):
        # Motor: return_document=True -> ReturnDocument.AFTER
        where_sql, params = _translate_filter(filter)
        docs = await asyncio.to_thread(self._sync_find, where_sql, params)
        if docs:
            doc = docs[0]
            doc_id = _norm_id(doc.get("_id"))
            _apply_update(doc, update, is_insert=False)
            await asyncio.to_thread(self._sync_write_doc, doc_id, doc)
            return doc if return_document else docs[0]
        if upsert:
            new_id = _norm_id(ObjectId())
            new_doc = {"_id": new_id}
            _apply_update(new_doc, update, is_insert=True)
            await asyncio.to_thread(self._sync_write_doc, new_id, new_doc)
            return new_doc if return_document else None
        return None

    async def bulk_write(self, operations, ordered=True, **kwargs):
        matched = modified = upserted = inserted = 0
        for op in operations:
            # pymongo UpdateOne / InsertOne / DeleteOne / ReplaceOne
            cls = type(op).__name__
            filt = getattr(op, "_filter", None)
            if cls == "UpdateOne":
                r = await self.update_one(filt, op._doc, upsert=op._upsert)
                matched += r.matched_count
                modified += r.modified_count
                if r.upserted_id:
                    upserted += 1
            elif cls == "InsertOne":
                await self.insert_one(op._doc)
                inserted += 1
            elif cls == "DeleteOne":
                r = await self.delete_one(filt)
                matched += r.deleted_count
            elif cls == "DeleteMany":
                r = await self.delete_many(filt)
                matched += r.deleted_count
            elif cls == "ReplaceOne":
                r = await self.update_one(filt, {"$set": op._doc}, upsert=op._upsert)
                matched += r.matched_count
                modified += r.modified_count
        return _BulkWriteResult(matched, modified, upserted, inserted)


class _LazyCursor(_Cursor):
    """Cursor that fetches on first async use (Motor parity for find())."""

    def __init__(self, collection: _Collection, filt, projection):
        super().__init__([])
        self._collection = collection
        self._filter = filt
        self._projection = projection
        self._loaded = False
        self._sort_spec = None
        self._limit_n = None
        self._skip_n = 0

    def sort(self, key, direction=1):
        # record; applied after load (keeps SQL simple & correct)
        if isinstance(key, (list, tuple)):
            self._sort_spec = list(key)
        else:
            self._sort_spec = [(key, direction)]
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def skip(self, n):
        self._skip_n = n
        return self

    async def _load(self):
        if self._loaded:
            return
        where_sql, params = _translate_filter(self._filter)
        docs = await asyncio.to_thread(self._collection._sync_find, where_sql, params)
        docs = [_apply_projection(d, self._projection) for d in docs]
        if self._sort_spec:
            for k, d in reversed(self._sort_spec):
                docs.sort(key=lambda r: _sort_key(_get_path(r, k)), reverse=(d < 0))
        if self._skip_n:
            docs = docs[self._skip_n:]
        if self._limit_n is not None:
            docs = docs[:self._limit_n]
        self._docs = docs
        self._loaded = True

    async def to_list(self, length=None):
        await self._load()
        return await super().to_list(length)

    def __aiter__(self):
        return self._aiter_impl()

    async def _aiter_impl(self):
        await self._load()
        for d in self._docs:
            yield d


class _LazyAggregateCursor:
    def __init__(self, collection: _Collection, pipeline):
        self._collection = collection
        self._pipeline = pipeline

    async def _run(self):
        # $lookup needs DB access: resolve here, then run the rest in Python
        docs = await asyncio.to_thread(self._collection._sync_all)
        pipeline = []
        for stage in self._pipeline:
            if isinstance(stage, dict) and "$lookup" in stage:
                docs = await self._do_lookup(docs, stage["$lookup"])
            else:
                pipeline.append(stage)
        return _run_pipeline(docs, pipeline)

    async def _do_lookup(self, docs, spec):
        frm = spec["from"]
        local = spec["localField"]
        foreign = spec["foreignField"]
        as_field = spec.get("as", "joined")
        other = _Collection(self._collection._conn, frm)
        foreign_docs = await asyncio.to_thread(other._sync_all)
        # index foreign docs by normalized foreign key
        index = {}
        for fd in foreign_docs:
            key = _get_path(fd, foreign, None) if "." in foreign else fd.get(foreign)
            key = str(key) if isinstance(key, ObjectId) else key
            index.setdefault(key, []).append(fd)
        out = []
        for d in docs:
            lv = _get_path(d, local, None) if "." in local else d.get(local)
            lv = str(lv) if isinstance(lv, ObjectId) else lv
            nd = dict(d)
            nd[as_field] = index.get(lv, [])
            out.append(nd)
        return out

    async def to_list(self, length=None):
        rows = await self._run()
        return rows if length is None else rows[:length]

    def __aiter__(self):
        return self._aiter_impl()

    async def _aiter_impl(self):
        for r in await self._run():
            yield r
