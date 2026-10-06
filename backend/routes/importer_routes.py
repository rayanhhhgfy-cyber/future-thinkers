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
    ("novels", ["رواية", "روايات", "novel", "fiction", "قصة", "قصص", "مسرحية", "drama", "story", "stories"]),
    ("literature", ["شعر", "أدب", "poetry", "literature", "ديوان", "بلاغة", "نثر", "مقامات", "نقد أدبي", "أدب عربي", "arabic literature"]),
    ("history", ["تاريخ", "history", "سيرة", "biography", "حضارة", "الأندلس", "تراجم", "حضارات", "معارك", "civilization"]),
    ("religion", ["إسلام", "دين", "قرآن", "islam", "religion", "فقه", "حديث", "تفسير", "سيرة نبوية", "عقيدة", "تصوف", "quran", "hadith"]),
    ("philosophy", ["فلسفة", "philosophy", "منطق", "أخلاق", "فلاسفة", "وجودية", "logic", "ethics"]),
    ("science", ["علوم", "science", "فيزياء", "كيمياء", "رياضيات", "mathematics", "physics", "فلك", "astronomy", "طب", "biology", "chemistry", "جغرافيا", "geography"]),
    ("programming", ["برمجة", "programming", "computer", "حاسوب", "python", "java", "algorithms", "برمجيات", "software"]),
    ("ai", ["ذكاء اصطناعي", "artificial intelligence", "machine learning", "data science", "neural", "تعلم الآلة"]),
    ("economics", ["اقتصاد", "economics", "business", "مال", "تجارة", "finance", "اقتصاد إسلامي"]),
    ("entrepreneurship", ["ريادة", "entrepreneur", "startup", "تسويق", "marketing", "إدارة أعمال", "أعمال"]),
    ("self-dev", ["تطوير الذات", "self-help", "self help", "نجاح", "عادات", "إنتاجية", "قيادة", "تحفيز", "success", "habits"]),
    ("arts", ["فن", "فنون", "art", "موسيقى", "music", "رسم", "خط عربي", "عمارة", "سينما", "calligraphy", "architecture"]),
    ("technology", ["تكنولوجيا", "technology", "تقنية", "إنترنت", "شبكات", "إلكترونيات", "internet", "electronics"]),
    ("culture", ["ثقافة", "culture", "حضارة", "مجتمع", "تربية", "تعليم", "أطفال", "children", "society", "education"]),
]

# Curated, strong archive.org sources (public-domain / open-license texts
# only). Queries use field operators so results stay accurate; the platform
# category rides along so imports land in the right shelf without guessing.
PRESET_SOURCES = [
    {"key": "preset_heritage", "label": "تراث الأدب العربي", "desc": "أمهات كتب الأدب والبلاغة والنثر الكلاسيكي", "lang": "ar", "category": "literature", "max_items": 6,
     "query": '(subject:"Arabic literature" OR subject:أدب OR subject:تراث OR subject:بلاغة)'},
    {"key": "preset_poetry", "label": "دواوين الشعر العربي", "desc": "دواوين الشعراء وشروح الشعر عبر العصور", "lang": "ar", "category": "literature", "max_items": 6,
     "query": '(subject:شعر OR subject:"Arabic poetry" OR subject:ديوان OR title:ديوان)'},
    {"key": "preset_history", "label": "التاريخ والحضارة الإسلامية", "desc": "تواريخ وحضارات وسير الأمم والدول", "lang": "ar", "category": "history", "max_items": 6,
     "query": '(subject:تاريخ OR subject:"Islamic history" OR subject:حضارة OR subject:الأندلس)'},
    {"key": "preset_religion", "label": "الدراسات الإسلامية والتفسير", "desc": "تفسير وفقه وحديث وعلوم شرعية", "lang": "ar", "category": "religion", "max_items": 6,
     "query": '(subject:تفسير OR subject:فقه OR subject:حديث OR subject:"Islamic studies")'},
    {"key": "preset_philosophy", "label": "الفلسفة والمنطق", "desc": "فلسفة عربية وعالمية ومنطق وأخلاق", "lang": "ar", "category": "philosophy", "max_items": 5,
     "query": '(subject:فلسفة OR subject:منطق OR subject:philosophy)'},
    {"key": "preset_science_ar", "label": "العلوم الكلاسيكية العربية", "desc": "طب وفلك ورياضيات التراث العلمي", "lang": "ar", "category": "science", "max_items": 5,
     "query": '(subject:طب OR subject:فلك OR subject:رياضيات OR subject:علوم)'},
    {"key": "preset_novels_ar", "label": "روايات وقصص عربية", "desc": "روايات وقصص من الأدب العربي", "lang": "ar", "category": "novels", "max_items": 6,
     "query": '(subject:رواية OR subject:"Arabic fiction" OR subject:قصص OR title:رواية)'},
    {"key": "preset_biography", "label": "السير والتراجم", "desc": "سير الأعلام والتراجم عبر التاريخ", "lang": "ar", "category": "history", "max_items": 5,
     "query": '(subject:سيرة OR subject:تراجم OR subject:biography)'},
    {"key": "preset_andalusia", "label": "الأندلس والمغرب العربي", "desc": "تاريخ الأندلس والمغرب وأدبهما", "lang": "ar", "category": "history", "max_items": 5,
     "query": '(subject:الأندلس OR subject:المغرب OR title:الأندلس)'},
    {"key": "preset_children", "label": "قصص الأطفال", "desc": "حكايات وقصص مصورة للأطفال", "lang": "ar", "category": "culture", "max_items": 5,
     "query": '(subject:"Childrens stories" OR subject:أطفال OR subject:"قصص الأطفال")'},
    {"key": "preset_shakespeare", "label": "Shakespeare & Drama", "desc": "أعمال شكسبير والمسرح العالمي", "lang": "en", "category": "literature", "max_items": 5,
     "query": '(creator:Shakespeare OR subject:Shakespeare OR subject:Drama)'},
    {"key": "preset_en_novels", "label": "World Classic Novels", "desc": "روايات عالمية كلاسيكية بالإنجليزية", "lang": "en", "category": "novels", "max_items": 6,
     "query": '(subject:"Classic novels" OR creator:Dickens OR creator:Austen OR creator:Twain)'},
    {"key": "preset_en_science", "label": "Classic Science", "desc": "رياضيات وفيزياء وفلك كلاسيكي", "lang": "en", "category": "science", "max_items": 5,
     "query": '(subject:Mathematics OR subject:Physics OR subject:Astronomy OR subject:"Natural history")'},
    {"key": "preset_en_philosophy", "label": "Western Philosophy", "desc": "من أفلاطون إلى كانط بالإنجليزية", "lang": "en", "category": "philosophy", "max_items": 5,
     "query": '(subject:Philosophy OR creator:Plato OR creator:Aristotle OR creator:Kant)'},
    {"key": "preset_selfdev", "label": "تطوير الذات والنجاح", "desc": "عادات وإنتاجية وقيادة وتطوير شخصي", "lang": "ar", "category": "self-dev", "max_items": 5,
     "query": '(subject:"تطوير الذات" OR subject:"Self-help" OR subject:نجاح OR subject:عادات)'},
    {"key": "preset_business", "label": "اقتصاد وريادة أعمال", "desc": "اقتصاد وتسويق وريادة أعمال", "lang": "ar", "category": "economics", "max_items": 5,
     "query": '(subject:اقتصاد OR subject:"ريادة أعمال" OR subject:تسويق OR subject:Business)'},
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


_AR_DIACRITICS = re.compile(r"[ً-ٰٟـ]")


def _norm_title(title: str) -> str:
    """Arabic-aware title fingerprint for cross-edition dedupe."""
    t = _AR_DIACRITICS.sub("", str(title or "").lower())
    t = t.replace("إ", "ا").replace("أ", "ا").replace("آ", "ا")
    t = t.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")
    t = re.sub(r"[^a-z0-9\u0600-\u06FF ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if t.startswith("كتاب "):
        t = t[5:].strip()
    return t


_TITLE_CACHE = {"at": 0.0, "norms": set()}


async def _known_title_norms():
    import time as _time
    if _time.time() - _TITLE_CACHE["at"] < 60 and _TITLE_CACHE["norms"]:
        return _TITLE_CACHE["norms"]
    norms = set()
    async for b in db.books.find({}, {"title": 1, "title_norm": 1}).limit(8000):
        norms.add(b.get("title_norm") or _norm_title(b.get("title", "")))
    norms.discard("")
    _TITLE_CACHE.update(at=_time.time(), norms=norms)
    return norms


def _clean_author(raw) -> str:
    a = _clean_text(raw, 160)
    a = re.sub(r"\(\s*\d{3,4}\s*[-–]\s*\d{0,4}\s*\)", "", a)
    a = re.sub(r",\s*\d{3,4}\s*[-–]\s*\d{0,4}", "", a)
    return re.sub(r"\s+", " ", a).strip(" ,؛·")


def _clean_title(raw) -> str:
    t = _clean_text(raw, 220)
    t = t.strip("«»\"'[]()")
    return re.sub(r"\s+", " ", t).strip()


def _year_of(d) -> int:
    m = re.search(r"(1[0-9]{3}|20[0-2][0-9]|0[7-9][0-9]{2})", str(d.get("year") or d.get("date") or ""))
    return int(m.group(1)) if m else 0


def _guess_category(subjects, fallback):
    blob = " ".join(subjects or []).lower()
    for slug, keys in CATEGORY_HINTS:
        if any(k.lower() in blob for k in keys):
            return slug
    return fallback if fallback in CATEGORY_SLUGS else "general"


def _http_get(url, timeout=60):
    return requests.get(url, timeout=timeout, headers={"User-Agent": "FutureThinkersBookImporter/1.0"})


async def _ia_docs(full_q: str, rows: int, page: int, fresh: bool):
    """One archive.org advancedsearch page (retried). Returns raw docs."""
    params = {
        "q": full_q,
        "fl[]": ["identifier", "title", "creator", "description", "language",
                 "date", "subject", "year", "files_count", "downloads"],
        "rows": max(1, min(rows, 50)),
        "page": max(1, page),
        "output": "json",
    }
    if fresh:  # scheduled/source runs want the newest additions first
        params["sort[]"] = "addeddate desc"
    r = None
    for _attempt in range(2):
        try:
            r = await asyncio.to_thread(lambda: requests.get(
                ARCHIVE_SEARCH, params=params, timeout=45,
                headers={"User-Agent": "FutureThinkersBookImporter/1.0"}))
            if r.status_code == 200:
                break
        except Exception:
            r = None
        await asyncio.sleep(1.2)
    if r is None or r.status_code != 200:
        raise HTTPException(status_code=502, detail="تعذّر الاتصال بمصدر الكتب الآن")
    return (((r.json() or {}).get("response") or {}).get("docs")) or []


def _doc_to_item(d):
    ident = d.get("identifier")
    if not ident:
        return None
    try:
        if int(d.get("files_count") or 0) < 4:  # metadata-only shells hold no book file
            return None
    except Exception:
        pass
    lang_raw = str(d.get("language") or "")
    return {
        "archive_id": ident,
        "title": _clean_title(d.get("title")) or ident,
        "author": _clean_author(d.get("creator")),
        "description": _clean_text(d.get("description"), 500),
        "language": "العربية" if lang_raw.startswith("ar") else ("English" if lang_raw.startswith("en") else lang_raw),
        "year": _year_of(d),
        "subjects": [str(x) for x in (d.get("subject") or [])][:8] if isinstance(d.get("subject"), list) else ([str(d["subject"])] if d.get("subject") else []),
        "cover_url": ARCHIVE_COVER + ident,
        "source_url": f"https://archive.org/details/{ident}",
        "_downloads": int(d.get("downloads") or 0),
    }


async def archive_search(query: str, lang: str, rows: int, fresh: bool = False, deep: bool = False):
    """Search archive.org texts; returns normalized candidate dicts.

    deep=True powers the manual search: plain terms are expanded into
    title/subject/creator/general probes fetched in parallel, and operator
    queries are paged 3 deep · everything merged, de-duplicated and ranked
    by match strength so real books (with files) surface first.
    """
    q = (query or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="اكتب كلمات البحث أو معرّف مجموعة")
    tail = " AND mediatype:texts"
    if lang == "ar":
        tail += " AND language:ara"
    elif lang == "en":
        tail += " AND language:eng"
    is_operator = (":" in q) or (" AND " in q) or (" OR " in q) or ('"' in q)

    if not deep:
        docs = await _ia_docs((q if is_operator else f"({q})") + tail, rows, 1, fresh)
        items = [it for it in (_doc_to_item(d) for d in docs) if it]
        for it in items:
            it.pop("_downloads", None)
        return items

    if is_operator:
        pages = await asyncio.gather(*[_ia_docs(q + tail, 50, p, False) for p in (1, 2, 3)],
                                     return_exceptions=True)
        docs = []
        for pg in pages:
            if isinstance(pg, list):
                docs.extend(pg)
        scanned = len(docs)
        ranked = {}
        for d in docs:
            it = _doc_to_item(d)
            if it:
                ranked.setdefault(it["archive_id"], it)
        out = sorted(ranked.values(), key=lambda x: -(x.get("_downloads") or 0))
    else:
        variants = [(f"title:({q})", 100), (f"subject:({q})", 80),
                    (f"creator:({q})", 60), (f"({q})", 40)]
        pages = await asyncio.gather(
            *[_ia_docs(v + tail, 50, 1, False) for v, _ in variants],
            return_exceptions=True)
        scanned = 0
        ranked = {}
        for (v, score), pg in zip(variants, pages):
            if not isinstance(pg, list):
                continue
            scanned += len(pg)
            for d in pg:
                it = _doc_to_item(d)
                if not it:
                    continue
                cur = ranked.get(it["archive_id"])
                if cur is None or score > cur["_score"] or (
                        score == cur["_score"] and len(it["description"]) > len(cur["description"])):
                    it["_score"] = score
                    ranked[it["archive_id"]] = it
        out = sorted(ranked.values(),
                     key=lambda x: (-(x.get("_score") or 0), -(x.get("_downloads") or 0)))
    for it in out:
        it.pop("_downloads", None)
        it.pop("_score", None)
    out = out[:max(1, min(rows, 100))]
    archive_search.last_scanned = scanned
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


async def _pdf_candidates(ident):
    r = None
    for _attempt in range(2):
        try:
            r = await asyncio.to_thread(lambda: requests.get(
                ARCHIVE_META + ident, timeout=45,
                headers={"User-Agent": "FutureThinkersBookImporter/1.0"}))
            if r.status_code == 200:
                break
        except Exception:
            r = None
        await asyncio.sleep(1.0)
    if r is None or r.status_code != 200:
        raise ValueError("تعذّر قراءة بيانات الكتاب من المصدر")
    files = ((r.json() or {}).get("files")) or []
    JUNK = ("scandata", "_djvu", "_text", "epub", "_bw", "cover", "thumb", "_sample", "preview")
    pdfs = []
    for f in files:
        name = str(f.get("name", "")).lower()
        if not name.endswith(".pdf"):
            continue
        if any(j in name for j in JUNK):
            continue
        try:
            size = int(f.get("size") or 0)
        except Exception:
            size = 0
        if 0 < size < 15 * 1024:  # cover-only stubs are not books
            continue
        pdfs.append({"name": f.get("name"), "size": size,
                     "format": str(f.get("format") or "")})
    if not pdfs:
        raise ValueError("لا توجد نسخة PDF لهذا الكتاب في المصدر")
    def rank(f):
        score = 0
        if str(f["name"]).lower() == f"{ident}.pdf":
            score -= 100
        if "text pdf" in f["format"].lower() or f["format"].lower() == "pdf":
            score -= 10
        if "color" in str(f["name"]).lower():
            score += 4
        return (score, -(f["size"] or 0))
    pdfs.sort(key=rank)
    return [(f["name"], f["size"]) for f in pdfs[:4]]


async def _pick_pdf_file(ident):
    cands = await _pdf_candidates(ident)
    return cands[0]


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
        norm = _norm_title(item.get("title") or "")
        if norm and norm in await _known_title_norms():
            log.update(status="skipped_dup", error="موجود بالمكتبة بنفس العنوان (طبعة أخرى)")
            return log
        max_bytes = int(cfg.get("max_file_mb") or 90) * 1024 * 1024
        filename, pdf_bytes = None, None
        last_err = None
        for cand_name, cand_size in await _pdf_candidates(ident):
            if cand_size and cand_size > max_bytes:
                last_err = f"حجم الملف ({cand_size // (1024 * 1024)}MB) أكبر من حد الاستيراد ({cfg.get('max_file_mb')}MB)"
                continue
            try:
                data = await _download(ARCHIVE_DOWNLOAD + ident + "/" + cand_name)
            except Exception as e:  # try the next candidate edition
                last_err = str(e)[:200]
                continue
            if len(data) > max_bytes:
                last_err = "حجم الملف أكبر من حد الاستيراد"
                continue
            if not data.startswith(b"%PDF"):
                last_err = "الملف المحمّل ليس PDF صالحاً"
                continue
            filename, pdf_bytes = cand_name, data
            break
        if pdf_bytes is None:
            raise ValueError(last_err or "لا توجد نسخة PDF لهذا الكتاب في المصدر")
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
                      "title_norm": norm,
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
                                 max(10, int(source.get("max_items") or 5) * 2), fresh=True)
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


# ---------------- preset sources ----------------
@router.get("/presets")
async def importer_presets(user: dict = Depends(require_permission("book.edit"))):
    cfg = await get_config()
    added = {s.get("preset") for s in (cfg.get("sources") or [])}
    return {"presets": [{**p, "added": p["key"] in added} for p in PRESET_SOURCES]}


class PresetBody(BaseModel):
    key: str


@router.post("/presets/add")
async def preset_add(body: PresetBody, user: dict = Depends(require_permission("book.edit"))):
    preset = next((p for p in PRESET_SOURCES if p["key"] == body.key), None)
    if not preset:
        raise HTTPException(status_code=404, detail="المصدر الجاهز غير موجود")
    cfg = await get_config()
    for s in cfg["sources"]:
        if s.get("preset") == preset["key"]:
            return {"source": s, "added": False}
    src = {k: preset[k] for k in ("label", "query", "lang", "category", "max_items")}
    src["key"] = uuid.uuid4().hex[:8]
    src["preset"] = preset["key"]
    src["active"] = True
    src["last_run_at"] = None
    src["last_stats"] = ""
    cfg["sources"].append(src)
    await _save_config(cfg)
    return {"source": src, "added": True}


# ---------------- search & manual import ----------------
class SearchBody(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    lang: str = "any"
    rows: int = Field(default=24, ge=1, le=100)


@router.post("/search")
async def importer_search(body: SearchBody, user: dict = Depends(require_permission("book.edit"))):
    items = await archive_search(body.query, body.lang, body.rows, deep=True)
    return {"items": await _mark_states(items),
            "scanned": getattr(archive_search, "last_scanned", len(items))}


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
