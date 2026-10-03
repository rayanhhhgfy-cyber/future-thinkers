from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import create_notification, audit_log, broadcast_notification

router = APIRouter(prefix="/api")


# ---------------- News ----------------
class NewsBody(BaseModel):
    title: str
    body: str
    cover_url: str = ""
    category: str = "منصة"


@router.get("/news")
async def list_news(page: int = 1, limit: int = 9):
    total = await db.news.count_documents({"status": "published"})
    docs = await db.news.find({"status": "published"}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    items = []
    for d in sers(docs):
        d["views"] = d.get("views", 0)
        items.append(d)
    return {"items": items, "total": total}


@router.get("/news/trending")
async def trending_news():
    docs = await db.news.find({"status": "published"}).sort("views", -1).limit(5).to_list(5)
    items = []
    for d in sers(docs):
        d["views"] = d.get("views", 0)
        items.append(d)
    return {"items": items}


@router.get("/news/digest")
async def news_digest():
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    news_docs = await db.news.find(
        {"status": "published", "created_at": {"$gte": since}}).sort("views", -1).limit(3).to_list(3)
    if len(news_docs) < 3:
        news_docs = await db.news.find({"status": "published"}).sort("views", -1).limit(3).to_list(3)
    top_news = []
    for d in sers(news_docs):
        d["views"] = d.get("views", 0)
        top_news.append(d)
    today = datetime.now(timezone.utc).date().isoformat()
    ev = await db.events.find_one({"status": "published", "date": {"$gte": today}}, sort=[("date", 1)])
    top_event = None
    if ev:
        e = ser(ev)
        top_event = {"id": e["id"], "title": e.get("title", ""), "date": e.get("date", ""),
                     "time": e.get("time", ""), "location": e.get("location", ""),
                     "mode": e.get("mode", "online")}
    bk = await db.books.find_one({}, sort=[("views", -1)])
    top_book = None
    if bk:
        b = ser(bk)
        top_book = {"id": b["id"], "title": b.get("title", ""), "author": b.get("author", ""),
                    "cover_url": b.get("cover_url", ""), "views": b.get("views", 0),
                    "rating_avg": b.get("rating_avg", 0), "rating_count": b.get("rating_count", 0)}
    return {"top_news": top_news, "top_event": top_event, "top_book": top_book}


@router.post("/news")
async def create_news(body: NewsBody, request: Request, user: dict = Depends(require_permission("news.manage"))):
    doc = {**body.model_dump(), "status": "published", "author_id": user["id"],
           "author_name": user["name"], "views": 0, "created_at": now_iso()}
    res = await db.news.insert_one(doc)
    await audit_log(user, "news_create", "news", str(res.inserted_id), request=request)
    return {"id": str(res.inserted_id)}


@router.get("/news/{nid}")
async def get_news(nid: str):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    out = ser(n)
    out["views"] = out.get("views", 0)
    return out


@router.post("/news/{nid}/view")
async def view_news(nid: str, user: dict = Depends(get_current_user)):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    await db.news.update_one({"_id": n["_id"]}, {"$inc": {"views": 1}})
    return {"views": (n.get("views", 0) or 0) + 1}


# ---------------- News comments ----------------
class NewsCommentBody(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


def _comment_out(c: dict, viewer: dict | None) -> dict:
    return {"id": str(c["_id"]),
            "user": {"id": c["user_id"], "name": c.get("user_name", "")},
            "text": c["text"], "at": c.get("created_at"),
            "mine": bool(viewer and viewer["id"] == c["user_id"])}


@router.get("/news/{nid}/comments")
async def list_news_comments(nid: str, request: Request):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    viewer = await get_optional_user(request)
    docs = await db.news_comments.find({"news_id": nid}).sort("created_at", 1).to_list(500)
    return {"items": [_comment_out(c, viewer) for c in docs], "total": len(docs)}


@router.post("/news/{nid}/comments")
async def add_news_comment(nid: str, body: NewsCommentBody, user: dict = Depends(get_current_user)):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="التعليق فارغ")
    doc = {"news_id": nid, "user_id": user["id"], "user_name": user["name"],
           "text": text, "created_at": now_iso()}
    res = await db.news_comments.insert_one(doc)
    author_id = n.get("author_id")
    if author_id and author_id != user["id"]:
        await create_notification(author_id, "news", "تعليق جديد على خبرك 💬",
                                  f"{user['name']}: {text[:60]}", "/news")
    return _comment_out({**doc, "_id": res.inserted_id}, user)


@router.delete("/news/{nid}/comments/{cid}")
async def delete_news_comment(nid: str, cid: str, user: dict = Depends(get_current_user)):
    c = await db.news_comments.find_one({"_id": oid(cid), "news_id": nid})
    if not c:
        raise HTTPException(status_code=404, detail="التعليق غير موجود")
    perms = effective_permissions(user)
    is_staff = bool(perms & {"news.manage", "news.edit", "news.delete"}) or user.get("role") in ("admin", "super_admin")
    if c["user_id"] != user["id"] and not is_staff:
        raise HTTPException(status_code=403, detail="لا تملك صلاحية الحذف")
    await db.news_comments.delete_one({"_id": c["_id"]})
    return {"ok": True}


class NewsPatchBody(BaseModel):
    title: str | None = None
    body: str | None = None
    cover_url: str | None = None
    category: str | None = None


@router.patch("/news/{nid}")
async def update_news(nid: str, body: NewsPatchBody, request: Request, user: dict = Depends(require_permission("news.edit"))):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد حقول للتحديث")
    await db.news.update_one({"_id": n["_id"]}, {"$set": {**updates, "updated_at": now_iso()}})
    await audit_log(user, "news_update", "news", nid, updates, request)
    return ser(await db.news.find_one({"_id": n["_id"]}) )


@router.delete("/news/{nid}")
async def delete_news(nid: str, request: Request, user: dict = Depends(require_permission("news.delete"))):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    await db.news.delete_one({"_id": n["_id"]})
    await audit_log(user, "news_delete", "news", nid, request=request)
    return {"ok": True}


# ---------------- Activities gallery ----------------
class ActivityBody(BaseModel):
    title: str
    description: str = ""
    media_url: str = ""
    media_type: str = "image"  # image | video
    club_slug: str | None = None


@router.get("/activities")
async def list_activities(page: int = 1, limit: int = 12):
    total = await db.activities.count_documents({"status": "approved"})
    docs = await db.activities.find({"status": "approved"}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total}


@router.post("/activities")
async def create_activity(body: ActivityBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "status": "pending", "author_id": user["id"], "author_name": user["name"],
           "school_name": user.get("school_name"), "directorate_name": user.get("directorate_name"),
           "created_at": now_iso()}
    res = await db.activities.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "pending"}


@router.get("/activities/pending")
async def pending_activities(user: dict = Depends(require_permission("activity.approve"))):
    docs = await db.activities.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.post("/activities/{aid}/{action}")
async def moderate_activity(aid: str, action: str, user: dict = Depends(require_permission("activity.approve"))):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="إجراء غير صالح")
    a = await db.activities.find_one({"_id": oid(aid)})
    if not a:
        raise HTTPException(status_code=404, detail="غير موجود")
    await db.activities.update_one({"_id": a["_id"]}, {"$set": {"status": "approved" if action == "approve" else "rejected", "reviewed_by": user["id"]}})
    await create_notification(a["author_id"], "activity", "تحديث حالة نشاطك",
                              "تمت الموافقة على نشاطك" if action == "approve" else "تم رفض نشاطك", "/dashboard")
    await audit_log(user, f"activity_{action}", "activity", aid)
    return {"status": action}


# ---------------- Reports ----------------
class ReportBody(BaseModel):
    entity_type: str  # book | discussion | reply | user | event | activity
    entity_id: str
    reason: str
    details: str = ""


@router.post("/reports")
async def create_report(body: ReportBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "status": "open", "reporter_id": user["id"],
           "reporter_name": user["name"], "created_at": now_iso()}
    res = await db.reports.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "open"}


@router.get("/reports")
async def list_reports(status: str = "open", user: dict = Depends(require_permission("report.manage"))):
    docs = await db.reports.find({"status": status}).sort("created_at", -1).to_list(200)
    return sers(docs)


class ReportActionBody(BaseModel):
    action: str  # dismiss | warn | hide | delete
    note: str = ""


@router.post("/reports/{rid}/resolve")
async def resolve_report(rid: str, body: ReportActionBody, user: dict = Depends(require_permission("report.manage"))):
    r = await db.reports.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(status_code=404, detail="غير موجود")
    if body.action == "delete":
        if r["entity_type"] == "discussion":
            await db.discussions.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "reply":
            await db.discussion_replies.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "activity":
            await db.activities.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "work":
            await db.works.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "comment":
            await db.book_comments.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "book":
            await db.books.update_one({"_id": oid(r["entity_id"])}, {"$set": {"status": "rejected"}})
    await db.reports.update_one({"_id": r["_id"]}, {"$set": {"status": "resolved", "action": body.action,
                                                             "note": body.note, "resolved_by": user["id"]}})
    await audit_log(user, "report_resolve", "report", rid, {"action": body.action})
    return {"status": "resolved"}


# ---------------- Announcement banners (stored in db.settings)

_ANNOUNCE_KEY = "announcement_banners"
_ANNOUNCE_PERM = "cms.manage"  # perm chosen: exists in auth.py catalog


async def _load_banners() -> list:
    s = await db.settings.find_one({"key": _ANNOUNCE_KEY})
    return list((s or {}).get("value", {}).get("banners", []))


async def _save_banners(banners: list):
    await db.settings.update_one(
        {"key": _ANNOUNCE_KEY},
        {"$set": {"key": _ANNOUNCE_KEY, "value": {"banners": banners},
                  "updated_at": now_iso()}},
        upsert=True,
    )


class BannerBody(BaseModel):
    text: str
    link: str = ""
    bg: str = "#1B7A5A"
    starts_at: str | None = None
    ends_at: str | None = None
    publish_at: str | None = None
    expires_at: str | None = None
    active: bool = True


class BannerPatchBody(BaseModel):
    text: str | None = None
    link: str | None = None
    bg: str | None = None
    starts_at: str | None = None
    ends_at: str | None = None
    publish_at: str | None = None
    expires_at: str | None = None
    active: bool | None = None


def _check_banner_dates(values: dict):
    """publish_at / expires_at must be parseable ISO datetimes when non-empty."""
    from datetime import datetime as _dt
    for key in ("publish_at", "expires_at"):
        v = values.get(key)
        if v is None or str(v).strip() == "":
            continue
        try:
            _dt.fromisoformat(str(v).replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="تاريخ غير صالح")


def _banner_live(b: dict) -> bool:
    now = now_iso()
    if not b.get("active"):
        return False
    if b.get("starts_at") and b["starts_at"] > now:
        return False
    if b.get("ends_at") and b["ends_at"] < now:
        return False
    if b.get("publish_at") and b["publish_at"] > now:
        return False
    if b.get("expires_at") and b["expires_at"] < now:
        return False
    return True


@router.get("/announcements")
async def list_announcements():
    banners = [b for b in await _load_banners() if _banner_live(b)]
    banners.sort(key=lambda b: b.get("created_at", ""), reverse=True)
    return {"banners": banners}


@router.get("/admin/announcements")
async def admin_list_announcements(user: dict = Depends(require_permission(_ANNOUNCE_PERM))):
    banners = await _load_banners()
    banners.sort(key=lambda b: b.get("created_at", ""), reverse=True)
    return {"banners": banners}


@router.post("/admin/announcements")
async def create_announcement(body: BannerBody, request: Request,
                             user: dict = Depends(require_permission(_ANNOUNCE_PERM))):
    _check_banner_dates(body.model_dump())
    import uuid as _uuid
    banners = await _load_banners()
    banner = {**body.model_dump(), "id": _uuid.uuid4().hex[:8], "created_at": now_iso()}
    banners.append(banner)
    await _save_banners(banners)
    await audit_log(user, "announcement_create", "announcement", banner["id"],
                    {"text": body.text}, request)
    return banner


@router.patch("/admin/announcements/{bid}")
async def update_announcement(bid: str, body: BannerPatchBody, request: Request,
                              user: dict = Depends(require_permission(_ANNOUNCE_PERM))):
    banners = await _load_banners()
    banner = next((b for b in banners if b.get("id") == bid), None)
    if not banner:
        raise HTTPException(status_code=404, detail="غير موجود")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    _check_banner_dates(updates)
    banner.update(updates)
    banner["updated_at"] = now_iso()
    await _save_banners(banners)
    await audit_log(user, "announcement_update", "announcement", bid, updates, request)
    return banner


@router.delete("/admin/announcements/{bid}")
async def delete_announcement(bid: str, request: Request,
                              user: dict = Depends(require_permission(_ANNOUNCE_PERM))):
    banners = await _load_banners()
    kept = [b for b in banners if b.get("id") != bid]
    if len(kept) == len(banners):
        raise HTTPException(status_code=404, detail="غير موجود")
    await _save_banners(kept)
    await audit_log(user, "announcement_delete", "announcement", bid, request=request)
    return {"ok": True}
