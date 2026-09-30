from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from db import db, ser, sers, oid, now_iso
from auth import (get_current_user, require_permission, require_role, ALL_PERMISSIONS,
                  ROLES, ROLE_LABELS, ROLE_PERMISSIONS)
from services import audit_log, broadcast_notification, create_notification

router = APIRouter(prefix="/api/admin")


@router.get("/overview")
async def overview(user: dict = Depends(require_permission("analytics.view"))):
    return {
        "users": await db.users.count_documents({}),
        "students": await db.users.count_documents({"role": "student"}),
        "teachers": await db.users.count_documents({"role": "teacher"}),
        "schools": await db.schools.count_documents({}),
        "directorates": await db.directorates.count_documents({}),
        "governorates": await db.governorates.count_documents({}),
        "books": await db.books.count_documents({}),
        "books_approved": await db.books.count_documents({"status": "approved"}),
        "books_pending": await db.books.count_documents({"status": "pending"}),
        "clubs": await db.clubs.count_documents({}),
        "events": await db.events.count_documents({}),
        "competitions": await db.competitions.count_documents({}),
        "discussions": await db.discussions.count_documents({}),
        "chess_games": await db.chess_games.count_documents({}),
        "reports_open": await db.reports.count_documents({"status": "open"}),
        "activities_pending": await db.activities.count_documents({"status": "pending"}),
    }


@router.get("/analytics")
async def analytics(user: dict = Depends(require_permission("analytics.view"))):
    # books per category
    by_cat = await db.books.aggregate([{"$match": {"status": "approved"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(30)
    cats = await db.categories.find({}).to_list(50)
    cat_names = {c["slug"]: c["name"] for c in cats}
    # students per governorate
    by_gov = await db.users.aggregate([{"$match": {"role": "student", "governorate_name": {"$ne": None}}},
        {"$group": {"_id": "$governorate_name", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(20)
    # most read books
    top_books = await db.books.find({"status": "approved"}).sort("views", -1).limit(6).to_list(6)
    return {
        "books_by_category": [{"name": cat_names.get(r["_id"], r["_id"]), "count": r["count"]} for r in by_cat],
        "students_by_governorate": [{"name": r["_id"], "count": r["count"]} for r in by_gov],
        "top_books": [{"title": b["title"], "views": b.get("views", 0)} for b in top_books],
    }


@router.get("/users")
async def list_users(q: str | None = None, role: str | None = None, page: int = 1, limit: int = 20,
                     user: dict = Depends(require_permission("user.view"))):
    query = {}
    if role:
        query["role"] = role
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]
    total = await db.users.count_documents(query)
    docs = await db.users.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total, "page": page}


class RoleBody(BaseModel):
    role: str
    extra_permissions: list[str] | None = None


@router.put("/users/{uid}/role")
async def update_role(uid: str, body: RoleBody, request: Request, user: dict = Depends(require_permission("role.manage"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="دور غير صالح")
    target = await db.users.find_one({"_id": oid(uid)})
    if target and target.get("role") == "super_admin" and body.role != "super_admin":
        remaining = await db.users.count_documents({"role": "super_admin"})
        if remaining <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن تخفيض رتبة المسؤول الأعلى الوحيد")
    upd = {"role": body.role}
    if body.extra_permissions is not None:
        invalid = set(body.extra_permissions) - set(ALL_PERMISSIONS)
        if invalid:
            raise HTTPException(status_code=400, detail="صلاحيات غير معروفة")
        upd["extra_permissions"] = body.extra_permissions
    await db.users.update_one({"_id": oid(uid)}, {"$set": upd})
    await audit_log(user, "user_role_update", "user", uid, {"role": body.role}, request)
    return {"ok": True}


class StatusBody(BaseModel):
    status: str  # active | banned | suspended


@router.put("/users/{uid}/status")
async def update_status(uid: str, body: StatusBody, request: Request, user: dict = Depends(require_permission("user.manage"))):
    if body.status not in ("active", "banned", "suspended"):
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    await db.users.update_one({"_id": oid(uid)}, {"$set": {"status": body.status}})
    await audit_log(user, "user_status_update", "user", uid, {"status": body.status}, request)
    return {"ok": True}


class AdjustXpBody(BaseModel):
    amount: int
    reason: str = "تعديل إداري"


@router.post("/users/{uid}/adjust-xp")
async def adjust_xp(uid: str, body: AdjustXpBody, request: Request, user: dict = Depends(require_permission("points.manage"))):
    from services import award_xp
    await award_xp(uid, body.amount, body.reason)
    await audit_log(user, "xp_adjust", "user", uid, {"amount": body.amount}, request)
    return {"ok": True}


@router.get("/permissions")
async def list_permissions(user: dict = Depends(require_permission("role.manage"))):
    return {"permissions": ALL_PERMISSIONS, "roles": [{"key": r, "label": ROLE_LABELS[r],
            "permissions": sorted(ROLE_PERMISSIONS.get(r, set()))} for r in ROLES]}


# ---------- Points config (CMS) ----------
@router.get("/points-config")
async def get_points_config(user: dict = Depends(require_permission("points.manage"))):
    s = await db.settings.find_one({"key": "points_config"})
    return (s or {}).get("value", {})


@router.put("/points-config")
async def set_points_config(body: dict, request: Request, user: dict = Depends(require_permission("points.manage"))):
    await db.settings.update_one({"key": "points_config"}, {"$set": {"value": body}}, upsert=True)
    await audit_log(user, "points_config_update", "settings", "points_config", request=request)
    return {"ok": True}


# ---------- Landing CMS ----------
@router.get("/cms/landing")
async def get_landing_cms(user: dict = Depends(require_permission("cms.manage"))):
    s = await db.settings.find_one({"key": "landing_cms"})
    return (s or {}).get("value", {})


@router.put("/cms/landing")
async def set_landing_cms(body: dict, request: Request, user: dict = Depends(require_permission("cms.manage"))):
    await db.settings.update_one({"key": "landing_cms"}, {"$set": {"value": body}}, upsert=True)
    await audit_log(user, "cms_landing_update", "settings", "landing_cms", request=request)
    return {"ok": True}


# ---------- Audit logs ----------
@router.get("/audit-logs")
async def audit_logs(page: int = 1, limit: int = 50, user: dict = Depends(require_permission("audit.view"))):
    total = await db.audit_logs.count_documents({})
    docs = await db.audit_logs.find({}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total, "page": page}


# ---------- Broadcast announcement ----------
class BroadcastBody(BaseModel):
    title: str
    body: str
    scope: str = "all"  # all | school | directorate
    scope_id: str | None = None


@router.post("/broadcast")
async def broadcast(body: BroadcastBody, request: Request, user: dict = Depends(require_permission("notification.broadcast"))):
    query = {}
    if body.scope == "school" and body.scope_id:
        query["school_id"] = body.scope_id
    elif body.scope == "directorate" and body.scope_id:
        query["directorate_id"] = body.scope_id
    elif user["role"] == "school_admin" and user.get("school_id"):
        query["school_id"] = user["school_id"]
    users = await db.users.find(query, {"_id": 1}).to_list(10000)
    await broadcast_notification([str(u["_id"]) for u in users], "announcement", body.title, body.body)
    await audit_log(user, "broadcast", "notification", None, {"count": len(users)}, request)
    return {"sent": len(users)}


# ---------- Directorate / School scoped views ----------
@router.get("/scope/summary")
async def scope_summary(user: dict = Depends(require_role("school_admin", "directorate_admin", "admin", "super_admin"))):
    if user["role"] == "school_admin":
        q = {"role": "student", "school_id": user.get("school_id")}
        return {"level": "school", "name": user.get("school_name"),
                "students": await db.users.count_documents(q)}
    if user["role"] == "directorate_admin":
        q = {"role": "student", "directorate_id": user.get("directorate_id")}
        schools = await db.schools.count_documents({"directorate_id": user.get("directorate_id")})
        return {"level": "directorate", "name": user.get("directorate_name"),
                "students": await db.users.count_documents(q), "schools": schools}
    return {"level": "national", "name": "المملكة", "students": await db.users.count_documents({"role": "student"})}


# ================= Notification center =================
NOTIFY_PERM = "notification.broadcast"

DEFAULT_PRESETS = [
    {"name": "📚 كتاب جديد", "title": "📚 كتاب جديد في المكتبة",
     "body": "تمت إضافة كتاب جديد إلى مكتبة المنصة — تصفحه الآن!",
     "link": "/books"},
    {"name": "📅 فعالية قادمة", "title": "📅 فعالية قادمة",
     "body": "لا تفوّت فعاليتنا القادمة — سجّل الآن!",
     "link": "/events"},
    {"name": "🏆 مسابقة جديدة", "title": "🏆 مسابقة جديدة",
     "body": "انطلقت مسابقة جديدة بجوائز قيّمة — شارك الآن!",
     "link": "/competitions"},
    {"name": "🔧 صيانة مجدولة", "title": "🔧 صيانة مجدولة",
     "body": "ستكون المنصة في وضع الصيانة لفترة قصيرة. شكراً لتفهمكم.",
     "link": "/dashboard"},
    {"name": "⭐ إعلان عام", "title": "📢 إعلان من الإدارة",
     "body": "", "link": "/dashboard"},
]


class PresetBody(BaseModel):
    name: str
    title: str
    body: str = ""
    link: str = "/dashboard"


async def _seed_presets():
    if await db.notification_presets.count_documents({}) == 0:
        await db.notification_presets.insert_many([
            {**p, "builtin": True, "created_at": now_iso()} for p in DEFAULT_PRESETS
        ])


@router.get("/notify/presets")
async def list_presets(user: dict = Depends(require_permission(NOTIFY_PERM))):
    await _seed_presets()
    docs = await db.notification_presets.find({}).sort("created_at", 1).to_list(100)
    return {"items": sers(docs)}


@router.post("/notify/presets")
async def create_preset(body: PresetBody, request: Request,
                        user: dict = Depends(require_permission(NOTIFY_PERM))):
    doc = {**body.model_dump(), "builtin": False, "created_at": now_iso()}
    r = await db.notification_presets.insert_one(doc)
    await audit_log(user, "preset.create", "notification_preset", str(r.inserted_id), None, request)
    return {"ok": True, "id": str(r.inserted_id)}


@router.put("/notify/presets/{pid}")
async def update_preset(pid: str, body: PresetBody, request: Request,
                        user: dict = Depends(require_permission(NOTIFY_PERM))):
    await db.notification_presets.update_one(
        {"_id": oid(pid)}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    await audit_log(user, "preset.update", "notification_preset", pid, None, request)
    return {"ok": True}


@router.delete("/notify/presets/{pid}")
async def delete_preset(pid: str, request: Request,
                        user: dict = Depends(require_permission(NOTIFY_PERM))):
    await db.notification_presets.delete_one({"_id": oid(pid)})
    await audit_log(user, "preset.delete", "notification_preset", pid, None, request)
    return {"ok": True}


class NotifySendBody(BaseModel):
    title: str
    body: str = ""
    link: str = "/dashboard"
    scope: str = "all"  # all | school | directorate
    scope_id: str | None = None


def _audience_query(scope: str, scope_id: str | None, user: dict) -> dict:
    q: dict = {"status": {"$ne": "banned"}}
    sid = scope_id or (user.get("school_id") if user.get("role") == "school_admin" else None)
    if scope == "school" and sid:
        q["school_id"] = sid
    elif scope == "directorate" and (scope_id or user.get("directorate_id")):
        q["directorate_id"] = scope_id or user.get("directorate_id")
    elif user["role"] == "school_admin" and user.get("school_id"):
        q["school_id"] = user["school_id"]
    return q


@router.post("/notify/send")
async def notify_send(body: NotifySendBody, request: Request,
                      user: dict = Depends(require_permission(NOTIFY_PERM))):
    if not body.title.strip():
        raise HTTPException(400, "العنوان مطلوب")
    q = _audience_query(body.scope, body.scope_id, user)
    users = await db.users.find(q, {"_id": 1}).to_list(20000)
    ids = [str(u["_id"]) for u in users]
    await broadcast_notification(ids, "announcement", body.title.strip(), body.body, body.link or "/dashboard")
    camp = {"title": body.title.strip(), "body": body.body, "link": body.link or "/dashboard",
            "scope": body.scope, "scope_id": body.scope_id,
            "status": "sent", "sent_at": now_iso(), "recipient_count": len(ids),
            "created_by": user["id"], "created_at": now_iso()}
    await db.notification_campaigns.insert_one(camp)
    await audit_log(user, "notify.send", "notification", None,
                    {"count": len(ids), "scope": body.scope}, request)
    return {"ok": True, "sent": len(ids)}


class NotifyScheduleBody(NotifySendBody):
    send_at: str  # ISO datetime (UTC)


@router.post("/notify/schedule")
async def notify_schedule(body: NotifyScheduleBody, request: Request,
                          user: dict = Depends(require_permission(NOTIFY_PERM))):
    from datetime import datetime, timezone
    if not body.title.strip():
        raise HTTPException(400, "العنوان مطلوب")
    try:
        dt = datetime.fromisoformat(body.send_at.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
    except Exception:
        raise HTTPException(400, "صيغة التاريخ غير صالحة")
    if dt <= datetime.now(timezone.utc):
        raise HTTPException(400, "موعد الإرسال يجب أن يكون في المستقبل")
    q = _audience_query(body.scope, body.scope_id, user)
    camp = {"title": body.title.strip(), "body": body.body, "link": body.link or "/dashboard",
            "audience_query": q, "scope": body.scope, "scope_id": body.scope_id,
            "status": "scheduled", "send_at": dt.isoformat(),
            "created_by": user["id"], "created_at": now_iso()}
    r = await db.notification_campaigns.insert_one(camp)
    await audit_log(user, "notify.schedule", "notification", str(r.inserted_id),
                    {"send_at": camp["send_at"], "scope": body.scope}, request)
    return {"ok": True, "id": str(r.inserted_id)}


@router.get("/notify/campaigns")
async def list_campaigns(user: dict = Depends(require_permission(NOTIFY_PERM))):
    docs = await db.notification_campaigns.find({}).sort("created_at", -1).to_list(50)
    return {"items": sers(docs)}


@router.delete("/notify/campaigns/{cid}")
async def cancel_campaign(cid: str, request: Request,
                          user: dict = Depends(require_permission(NOTIFY_PERM))):
    r = await db.notification_campaigns.delete_one({"_id": oid(cid), "status": "scheduled"})
    if r.deleted_count:
        await audit_log(user, "notify.cancel", "notification", cid, None, request)
        return {"ok": True}
    raise HTTPException(400, "لا يمكن إلغاء هذه الحملة")
