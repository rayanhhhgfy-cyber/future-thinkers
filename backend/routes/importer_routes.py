"""مستورد الكتب · Book importer.

Pulls public-domain / open-license books (archive.org) into the library
through the very same creation path as manual admin uploads
(books_routes._create_book_from_pdf → save_pdf → Telegram), with:
  - admin-managed sources (archive.org queries / collections)
  - manual search + preview + selective import
  - scheduled runs (cron endpoint + "run now") respecting per-source caps
  - dedupe by archive.org identifier (never imports the same book twice)
  - a review queue when auto-publish is off
  - a full import log with errors and retries

Everything is gated behind the book.edit permission, like the books admin.
Only lawful open sources are wired in (archive.org public-domain texts).
"""
import asyncio
import re
import uuid

import requests
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from auth import require_permission
from db import db, now_iso, ser

router = APIRouter(prefix="/api/admin/importer")
cron_router = APIRouter(prefix="/api/cron")

ARCHIVE_SEARCH = "https://archive.org/advancedsearch.php"
ARCHIVE_META = "https://archive.org/metadata/"
ARCHIVE_DOWNLOAD = "https://archive.org/download/"
ARCHIVE_COVER = "https://archive.org/services/img/"

DEFAULT_CONFIG = {
    "enabled": False,
    "auto_publish": True,
    "default_category": "general",
    "max_file_mb": 90,
    "per_run": 5,
    "interval_hours": 12,
    "sources": [],
    "last_run_at": None,
    "stats": {"imported": 0, "queued": 0, "failed": 0, "skipped": 0},
}

CATEGORY_SLUGS = ["science", "culture", "religion", "history", "literature",
                  "novels", "philosophy", "programming", "ai", "economics",
                  "entrepreneurship", "self-dev", "arts", "technology", "general"]

# archive.org subject keywords → platform category slug
CATEGORY_HINTS = [
    ("novels", ["رواية", "روايات", "novel", "fiction", "أدب"]),
    ("literature", ["شعر", "أدب", "poetry", "literature", "ديوان"]),
    ("history", ["تاريخ", "history", "سيرة", "biography"]),
    ("religion", ["إسلام", "دين", "قرآن", "islam", "religion", "فقه", "حديث"]),
    ("philosophy", ["فلسفة", "philosophy", "منطق"]),
    ("science", ["علوم", "science", "فيزياء", "كيمياء", "رياضيات", "mathematics", "physics"]),
    ("programming", ["برمجة", "programming", "computer", "حاسوب"]),
    ("ai", ["ذكاء اصطناعي", "artificial intelligence", "machine learning"]),
    ("economics", ["اقتصاد", "economics", "business"]),
    ("entrepreneurship", ["ريادة", "entrepreneur", "startup"]),
    ("self-dev", ["تطوير الذات", "self-help", "self help", "نجاح"]),
    ("arts", ["فن", "فنون", "art", "موسيقى", "music"]),
    ("technology", ["تكنولوجيا", "technology", "تقنية"]),
    ("culture", ["ثقافة", "culture", "حضارة"]),
]


async def get_config() -> dict:
    doc = await db.settings.find_one({"_id": "importer"}) or {}
    cfg = {**DEFAULT_CONFIG, **{k: v for k, v in doc.items() if k != "_id"}}
    cfg["sources"] = doc.get("sources") or []
    cfg["stats"] = {**DEFAULT_CONFIG["stats"], **(doc.get("stats") or {})}
    return cfg


async def _save_config(cfg: dict):
    data = {k: v for k, v in cfg.items()}
    await db.settings.update_one({"_id": "importer"}, {"$set": data}, upsert=True)


def _clean_text(raw, limit=1200):
    if not raw:
        return ""
    if isinstance(raw, list):
        raw = " ".join(str(x) for x in raw)
    txt = re.sub(r"<[^>]+>", " ", str(raw))
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:limit]


def _guess_category(subjects, fallback):
    blob = " ".join(subjects or []).lower()
    for slug, keys in CATEGORY_HINTS:
        if any(k.lower() in blob for k in keys):
            return slug
    return fallback if fallback in CATEGORY_SLUGS else "general"


def _http_get(url, timeout=60):
    return requests.get(url, timeout=timeout, headers={"User-Agent": "FutureThinkersBookImporter/1.0"})


async def archive_search(query: str, lang: str, rows: int):
    """Search archive.org texts; returns normalized candidate dicts."""
    q = (query or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="اكتب كلمات البحث أو معرّف مجموعة")
    full = q if (":" in q or "AND" in q) else f"({q})"
    full += " AND mediatype:texts"
    if lang == "ar":
        full += " AND language:ara"
    elif lang == "en":
        full += " AND language:eng"
    params = {
        "q": full,
        "fl[]": ["identifier", "title", "creator", "description", "language", "date", "subject", "year"],
        "rows": max(1, min(rows, 50)),
        "page": 1,
        "output": "json",
        "sort[]": "addeddate desc",
    }
    r = await asyncio.to_thread(lambda: requests.get(
        ARCHIVE_SEARCH, params=params, timeout=45,
        headers={"User-Agent": "FutureThinkersBookImporter/1.0"}))
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="تعذّر الاتصال بمصدر الكتب الآن")
    docs = (((r.json() or {}).get("response") or {}).get("docs")) or []
    out = []
    for d in docs:
        ident = d.get("identifier")
        if not ident:
            continue
        lang_raw = str(d.get("language") or "")
        out.append({
            "archive_id": ident,
            "title": _clean_text(d.get("title"), 220) or ident,
            "author": _clean_text(d.get("creator"), 160),
            "description": _clean_text(d.get("description"), 500),
            "language": "العربية" if lang_raw.startswith("ar") else ("English" if lang_raw.startswith("en") else lang_raw),
            "year": int(str(d.get("year") or "")[:4]) if str(d.get("year") or "")[:4].isdigit() else 0,
            "subjects": [str(s) for s in (d.get("subject") or [])][:8] if isinstance(d.get("subject"), list) else ([str(d["subject"])] if d.get("subject") else []),
            "cover_url": ARCHIVE_COVER + ident,
            "source_url": f"https://archive.org/details/{ident}",
        })
    return out


async def _mark_states(items):
    """Annotate each candidate with its import state (imported/queued/new)."""
    ids = [i["archive_id"] for i in items]
    if not ids:
        return items
    books = await db.books.find({"source_archive_id": {"$in": ids}},
                                {"source_archive_id": 1}).to_list(len(ids))
    imported = {b["source_archive_id"] for b in books}
    jobs = await db.import_jobs.find(
        {"archive_id": {"$in": ids}, "status": {"$in": ["queued", "imported"]}},
        {"archive_id": 1, "status": 1}).to_list(len(ids) * 2)
    job_state = {}
    for j in jobs:
        job_state[j["archive_id"]] = "imported" if j["status"] == "imported" else "queued"
    for i in items:
        if i["archive_id"] in imported or job_state.get(i["archive_id"]) == "imported":
            i["state"] = "imported"
        elif job_state.get(i["archive_id"]) == "queued":
            i["state"] = "queued"
        else:
            i["state"] = "new"
    return items


async def _pick_pdf_file(ident):
    r = await asyncio.to_thread(lambda: requests.get(
        ARCHIVE_META + ident, timeout=45,
        headers={"User-Agent": "FutureThinkersBookImporter/1.0"}))
    if r.status_code != 200:
        raise ValueError("تعذّر قراءة بيانات الكتاب من المصدر")
    files = ((r.json() or {}).get("files")) or []
    pdfs = [f for f in files if str(f.get("name", "")).lower().endswith(".pdf")]
    if not pdfs:
        raise ValueError("لا توجد نسخة PDF لهذا الكتاب في المصدر")
    def pref(f):
        name = str(f.get("name", "")).lower()
        score = 0
        if name == f"{ident}.pdf":
            score -= 3
        if "_bw" in name or "_text" in name:
            score += 1
        if "color" in name:
            score += 1
        try:
            score += int(f.get("size") or 0) / 1e12
        except Exception:
            pass
        return score
    pdfs.sort(key=pref)
    chosen = pdfs[0]
    size = 0
    try:
        size = int(chosen.get("size") or 0)
    except Exception:
        size = 0
    return chosen.get("name"), size


async def _download(url, timeout=180):
    def _go():
        with requests.get(url, timeout=timeout, stream=True,
                          headers={"User-Agent": "FutureThinkersBookImporter/1.0"}) as resp:
            resp.raise_for_status()
            chunks = []
            total = 0
            for chunk in resp.iter_content(chunk_size=256 * 1024):
                chunks.append(chunk)
                total += len(chunk)
                if total > 120 * 1024 * 1024:
                    raise ValueError("حجم الملف يتجاوز الحد المسموح (100MB)")
            return b"".join(chunks)
    return await asyncio.to_thread(_go)


async def _import_one(user: dict, item: dict, cfg: dict, source: dict | None):
    """Import a single candidate. Returns a job-result dict (never raises)."""
    ident = item["archive_id"]
    log = {
        "archive_id": ident,
        "title": item.get("title", ""),
        "author": item.get("author", ""),
        "source_key": (source or {}).get("key"),
        "source_label": (source or {}).get("label", ""),
        "created_at": now_iso(),
    }
    try:
        existing = await db.books.find_one({"source_archive_id": ident}, {"_id": 1})
        if existing:
            log.update(status="skipped_dup", book_id=str(existing["_id"]))
            return log
        filename, size = await _pick_pdf_file(ident)
        max_bytes = int(cfg.get("max_file_mb") or 90) * 1024 * 1024
        if size and size > max_bytes:
            raise ValueError(f"حجم الملف ({size // (1024 * 1024)}MB) أكبر من حد الاستيراد ({cfg.get('max_file_mb')}MB)")
        pdf_bytes = await _download(ARCHIVE_DOWNLOAD + ident + "/" + filename)
        if size and len(pdf_bytes) > max_bytes:
            raise ValueError("حجم الملف أكبر من حد الاستيراد")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("الملف المحمّل ليس PDF صالحاً")
        cover_bytes = None
        try:
            cover_bytes = await _download(ARCHIVE_COVER + ident, timeout=30)
            if not (cover_bytes[:2] == b"\xff\xd8" or cover_bytes[:4] == b"\x89PNG"):
                cover_bytes = None
        except Exception:
            cover_bytes = None
        category = (source or {}).get("category") or "auto"
        if category == "auto":
            category = _guess_category(item.get("subjects"), cfg.get("default_category") or "general")
        meta = {
            "title": item.get("title") or ident,
            "author": item.get("author") or "مؤلف غير معروف",
            "description": item.get("description") or "",
            "category": category,
            "language": item.get("language") or "العربية",
            "pages": 0,
            "year": item.get("year") or 0,
            "publisher": "archive.org",
            "age": "عام",
            "tags": ",".join((item.get("subjects") or [])[:5]),
        }
        from routes.books_routes import _create_book_from_pdf
        res = await _create_book_from_pdf(
            user, meta, pdf_bytes, filename,
            cover_bytes, "cover.jpg" if cover_bytes else None,
            "image/jpeg" if cover_bytes else None, None)
        book_id = res.get("id")
        await db.books.update_one(
            {"_id": ObjectId(book_id)},
            {"$set": {"source": "archive.org", "source_archive_id": ident,
                      "source_url": item.get("source_url") or f"https://archive.org/details/{ident}"}})
        log.update(status="imported", book_id=book_id)
        return log
    except Exception as e:  # noqa: BLE001 · one bad book must not kill the run
        log.update(status="failed", error=str(e)[:300])
        return log


async def _run_source(user: dict, cfg: dict, source: dict, budget: int):
    """Fetch a source's newest candidates and import/queue unseen ones."""
    results = []
    if budget <= 0:
        return results
    items = await archive_search(source.get("query", ""), source.get("lang") or "any",
                                 max(10, int(source.get("max_items") or 5) * 2))
    items = await _mark_states(items)
    fresh = [i for i in items if i["state"] == "new"]
    cap = min(int(source.get("max_items") or 5), budget)
    for item in fresh[:cap]:
        if cfg.get("auto_publish"):
            results.append(await _import_one(user, item, cfg, source))
        else:
            doc = {
                "archive_id": item["archive_id"], "title": item["title"],
                "author": item["author"], "description": item.get("description", ""),
                "language": item.get("language", ""), "year": item.get("year") or 0,
                "subjects": item.get("subjects") or [], "cover_url": item.get("cover_url"),
                "source_url": item.get("source_url"),
                "source_key": source.get("key"), "source_label": source.get("label", ""),
                "status": "queued", "created_at": now_iso(),
            }
            await db.import_jobs.insert_one(doc)
            results.append({"archive_id": item["archive_id"], "title": item["title"],
                            "source_key": source.get("key"), "status": "queued"})
    return results


def _public_cfg(cfg):
    out = {k: cfg.get(k) for k in ("enabled", "auto_publish", "default_category",
                                   "max_file_mb", "per_run", "interval_hours", "last_run_at", "stats")}
    out["sources"] = cfg.get("sources") or []
    out["categories"] = CATEGORY_SLUGS
    return out


# ---------------- config & sources ----------------
class ConfigBody(BaseModel):
    enabled: bool | None = None
    auto_publish: bool | None = None
    default_category: str | None = None
    max_file_mb: int | None = Field(default=None, ge=5, le=100)
    per_run: int | None = Field(default=None, ge=1, le=50)
    interval_hours: int | None = Field(default=None, ge=1, le=168)


@router.get("/config")
async def importer_config(user: dict = Depends(require_permission("book.edit"))):
    return _public_cfg(await get_config())


@router.put("/config")
async def importer_config_put(body: ConfigBody, user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    for k, v in body.model_dump().items():
        if v is not None:
            cfg[k] = v
    if cfg["default_category"] not in CATEGORY_SLUGS:
        cfg["default_category"] = "general"
    await _save_config(cfg)
    return _public_cfg(cfg)


class SourceBody(BaseModel):
    label: str = Field(min_length=2, max_length=60)
    query: str = Field(min_length=2, max_length=300)
    lang: str = "any"
    category: str = "auto"
    max_items: int = Field(default=5, ge=1, le=50)
    active: bool = True


@router.post("/sources")
async def source_add(body: SourceBody, user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    src = body.model_dump()
    if src["lang"] not in ("any", "ar", "en"):
        src["lang"] = "any"
    if src["category"] != "auto" and src["category"] not in CATEGORY_SLUGS:
        src["category"] = "auto"
    src["key"] = uuid.uuid4().hex[:8]
    src["last_run_at"] = None
    src["last_stats"] = ""
    cfg["sources"].append(src)
    await _save_config(cfg)
    return {"source": src}


@router.put("/sources/{key}")
async def source_update(key: str, body: SourceBody, user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    for s in cfg["sources"]:
        if s.get("key") == key:
            upd = body.model_dump()
            if upd["lang"] not in ("any", "ar", "en"):
                upd["lang"] = "any"
            if upd["category"] != "auto" and upd["category"] not in CATEGORY_SLUGS:
                upd["category"] = "auto"
            s.update(upd)
            await _save_config(cfg)
            return {"source": s}
    raise HTTPException(status_code=404, detail="المصدر غير موجود")


@router.delete("/sources/{key}")
async def source_delete(key: str, user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    before = len(cfg["sources"])
    cfg["sources"] = [s for s in cfg["sources"] if s.get("key") != key]
    if len(cfg["sources"]) == before:
        raise HTTPException(status_code=404, detail="المصدر غير موجود")
    await _save_config(cfg)
    return {"ok": True}


# ---------------- search & manual import ----------------
class SearchBody(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    lang: str = "any"
    rows: int = Field(default=20, ge=1, le=50)


@router.post("/search")
async def importer_search(body: SearchBody, user: dict = Depends(require_permission("book.edit"))):
    items = await archive_search(body.query, body.lang, body.rows)
    return {"items": await _mark_states(items)}


class ImportBody(BaseModel):
    items: list[dict]
    source_key: str | None = None


@router.post("/import")
async def importer_import(body: ImportBody, user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    src = None
    if body.source_key:
        src = next((s for s in cfg["sources"] if s.get("key") == body.source_key), None)
    results = []
    for raw in body.items[:20]:
        item = {
            "archive_id": str(raw.get("archive_id") or ""),
            "title": raw.get("title") or "", "author": raw.get("author") or "",
            "description": raw.get("description") or "",
            "language": raw.get("language") or "", "year": raw.get("year") or 0,
            "subjects": raw.get("subjects") or [],
            "source_url": raw.get("source_url") or "",
        }
        if not item["archive_id"]:
            continue
        if cfg.get("auto_publish"):
            res = await _import_one(user, item, cfg, src)
        else:
            dup = await db.import_jobs.find_one(
                {"archive_id": item["archive_id"], "status": "queued"}, {"_id": 1})
            book = await db.books.find_one({"source_archive_id": item["archive_id"]}, {"_id": 1})
            if book:
                res = {"archive_id": item["archive_id"], "status": "skipped_dup", "book_id": str(book["_id"])}
            elif dup:
                res = {"archive_id": item["archive_id"], "status": "queued"}
            else:
                doc = {**item, "cover_url": ARCHIVE_COVER + item["archive_id"],
                       "source_key": (src or {}).get("key"),
                       "source_label": (src or {}).get("label", ""),
                       "status": "queued", "created_at": now_iso()}
                await db.import_jobs.insert_one(doc)
                res = {"archive_id": item["archive_id"], "status": "queued"}
        results.append(res)
        if res.get("status") != "queued":
            await db.import_jobs.insert_one({
                "archive_id": res["archive_id"], "title": item["title"], "author": item["author"],
                "source_key": (src or {}).get("key"), "source_label": (src or {}).get("label", ""),
                "status": res["status"], "book_id": res.get("book_id"),
                "error": res.get("error"), "created_at": now_iso(), "via": "manual",
            })
    return {"results": results}


# ---------------- jobs: log, review queue, run ----------------
@router.get("/jobs")
async def importer_jobs(status: str = "", limit: int = 60,
                        user: dict = Depends(require_permission("book.edit"))):
    q = {"status": status} if status else {}
    docs = await db.import_jobs.find(q).sort("created_at", -1).limit(min(limit, 200)).to_list(min(limit, 200))
    return {"jobs": [ser(d) for d in docs]}


@router.post("/jobs/{job_id}/approve")
async def job_approve(job_id: str, user: dict = Depends(require_permission("book.edit"))):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    job = await db.import_jobs.find_one({"_id": ObjectId(job_id)})
    if not job or job.get("status") != "queued":
        raise HTTPException(status_code=404, detail="العنصر غير موجود في قائمة الانتظار")
    cfg = await get_config()
    src = next((s for s in cfg["sources"] if s.get("key") == job.get("source_key")), None)
    item = {"archive_id": job["archive_id"], "title": job.get("title", ""),
            "author": job.get("author", ""), "description": job.get("description", ""),
            "language": job.get("language", ""), "year": job.get("year") or 0,
            "subjects": job.get("subjects") or [], "source_url": job.get("source_url") or ""}
    res = await _import_one(user, item, cfg, src)
    await db.import_jobs.update_one({"_id": job["_id"]}, {"$set": {
        "status": res["status"], "book_id": res.get("book_id"),
        "error": res.get("error"), "created_at": now_iso()}})
    return res


@router.post("/jobs/{job_id}/reject")
async def job_reject(job_id: str, user: dict = Depends(require_permission("book.edit"))):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=404, detail="العنصر غير موجود")
    r = await db.import_jobs.update_one(
        {"_id": ObjectId(job_id), "status": "queued"}, {"$set": {"status": "rejected"}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="العنصر غير موجود في قائمة الانتظار")
    return {"ok": True}


@router.post("/run-now")
async def run_now(source_key: str = "", user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    sources = [s for s in cfg["sources"] if s.get("active", True)]
    if source_key:
        sources = [s for s in sources if s.get("key") == source_key]
    if not sources:
        raise HTTPException(status_code=400, detail="لا توجد مصادر مفعّلة")
    budget = int(cfg.get("per_run") or 5)
    all_results = []
    for s in sources:
        if budget <= 0:
            break
        res = await _run_source(user, cfg, s, budget)
        used = len([r for r in res if r.get("status") in ("imported", "queued")])
        budget -= used
        s["last_run_at"] = now_iso()
        done = len([r for r in res if r.get("status") == "imported"])
        qd = len([r for r in res if r.get("status") == "queued"])
        s["last_stats"] = f"استورد {done} · بالانتظار {qd}"
        for r in res:
            if r.get("status") != "queued":
                await db.import_jobs.insert_one({**r, "via": "run"})
        all_results.extend(res)
    cfg["last_run_at"] = now_iso()
    stats = cfg["stats"]
    stats["imported"] = stats.get("imported", 0) + len([r for r in all_results if r.get("status") == "imported"])
    stats["queued"] = stats.get("queued", 0) + len([r for r in all_results if r.get("status") == "queued"])
    stats["failed"] = stats.get("failed", 0) + len([r for r in all_results if r.get("status") == "failed"])
    stats["skipped"] = stats.get("skipped", 0) + len([r for r in all_results if r.get("status") == "skipped_dup"])
    cfg["stats"] = stats
    await _save_config(cfg)
    return {"results": all_results}


async def maybe_run_scheduled_import():
    """Cron entry: run all active sources when enabled and due."""
    cfg = await get_config()
    if not cfg.get("enabled"):
        return {"ran": False, "reason": "disabled"}
    from datetime import datetime, timezone
    last = cfg.get("last_run_at")
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            age_h = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if age_h < float(cfg.get("interval_hours") or 12):
                return {"ran": False, "reason": "not_due"}
        except Exception:
            pass
    admin = await db.users.find_one({"role": {"$in": ["super_admin", "admin"]}})
    if not admin:
        return {"ran": False, "reason": "no_admin"}
    from db import ser as _ser
    user = _ser(admin)
    sources = [s for s in cfg["sources"] if s.get("active", True)]
    budget = int(cfg.get("per_run") or 5)
    total = []
    for s in sources:
        if budget <= 0:
            break
        try:
            res = await _run_source(user, cfg, s, budget)
        except Exception:
            res = []
        budget -= len([r for r in res if r.get("status") in ("imported", "queued")])
        s["last_run_at"] = now_iso()
        for r in res:
            if r.get("status") != "queued":
                await db.import_jobs.insert_one({**r, "via": "schedule"})
        total.extend(res)
    cfg["last_run_at"] = now_iso()
    cfg["stats"]["imported"] = cfg["stats"].get("imported", 0) + len([r for r in total if r.get("status") == "imported"])
    cfg["stats"]["failed"] = cfg["stats"].get("failed", 0) + len([r for r in total if r.get("status") == "failed"])
    await _save_config(cfg)
    return {"ran": True, "results": len(total)}


@cron_router.get("/importer-tick")
async def importer_tick(request: Request):
    import os
    secret = os.environ.get("CRON_SECRET", "")
    is_vercel_cron = request.headers.get("x-vercel-cron") == "1"
    if not is_vercel_cron and (not secret or request.query_params.get("secret") != secret):
        raise HTTPException(status_code=403, detail="forbidden")
    return await maybe_run_scheduled_import()
