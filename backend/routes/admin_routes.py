from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel, EmailStr, Field
from db import db, ser, sers, oid, now_iso
from auth import (get_current_user, require_permission, require_role, ALL_PERMISSIONS,
                  ROLES, ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_LABELS,
                  effective_permissions, hash_password)
from services import audit_log, broadcast_notification, create_notification, deliver_notification, send_push_to_user

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


def _may_grant(creator: dict, role: str, perms: list[str]) -> bool:
    """Privilege-escalation guard: a non-super-admin can only hand out
    permissions they themselves hold, and can never create admin/super_admin."""
    if creator.get("role") == "super_admin":
        return True
    if role in ("admin", "super_admin"):
        return False
    have = effective_permissions(creator)
    if not set(perms) <= have:
        return False
    if not set(ROLE_PERMISSIONS.get(role, set())) <= have:
        return False
    return True


class UserCreateBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = "custom"
    # Hand-picked permissions. For role "custom" these are the account's ONLY
    # permissions; for other roles they are added on top of the role's base set.
    permissions: list[str] = []


@router.post("/users")
async def admin_create_user(body: UserCreateBody, request: Request,
                            user: dict = Depends(require_permission("user.create"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="دور غير صالح")
    invalid = set(body.permissions) - set(ALL_PERMISSIONS)
    if invalid:
        raise HTTPException(status_code=400, detail="صلاحيات غير معروفة")
    if not _may_grant(user, body.role, body.permissions):
        raise HTTPException(status_code=403, detail="لا يمكنك منح صلاحيات لا تملكها")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم مسبقاً")
    doc = {
        "name": body.name.strip(), "email": email,
        "password_hash": hash_password(body.password), "role": body.role,
        "status": "active",
        "xp": 0, "level": 1, "level_title": "قارئ مبتدئ",
        "extra_permissions": sorted(set(body.permissions)),
        "badges": [], "achievements": [], "stats": {},
        "streak": 0, "chess_rating": 1200, "email_verified": False,
        "privacy": {"show_school": True, "show_activity": True},
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    await audit_log(user, "user_create", "user", uid,
                    {"role": body.role, "permissions": sorted(set(body.permissions))}, request)
    doc["_id"] = res.inserted_id
    return {"user": ser(doc)}


class PermsBody(BaseModel):
    permissions: list[str]


@router.put("/users/{uid}/permissions")
async def update_user_permissions(uid: str, body: PermsBody, request: Request,
                                  user: dict = Depends(require_permission("role.manage"))):
    target = await db.users.find_one({"_id": oid(uid)})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    invalid = set(body.permissions) - set(ALL_PERMISSIONS)
    if invalid:
        raise HTTPException(status_code=400, detail="صلاحيات غير معروفة")
    if not _may_grant(user, target.get("role", "student"), body.permissions):
        raise HTTPException(status_code=403, detail="لا يمكنك منح صلاحيات لا تملكها")
    await db.users.update_one({"_id": target["_id"]},
                              {"$set": {"extra_permissions": sorted(set(body.permissions))}})
    await audit_log(user, "user_permissions_update", "user", uid,
                    {"permissions": sorted(set(body.permissions))}, request)
    return {"ok": True}


@router.delete("/users/{uid}")
async def delete_user(uid: str, request: Request,
                      user: dict = Depends(require_permission("user.delete"))):
    target = await db.users.find_one({"_id": oid(uid)})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if str(target["_id"]) == user.get("id"):
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك الخاص")
    if target.get("role") == "super_admin":
        if user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="فقط المسؤول الأعلى يمكنه حذف مسؤول أعلى")
        remaining = await db.users.count_documents({"role": "super_admin"})
        if remaining <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن حذف المسؤول الأعلى الوحيد")
    await db.users.delete_one({"_id": target["_id"]})
    await audit_log(user, "user_delete", "user", uid, {"email": target.get("email")}, request)
    return {"ok": True}


# ---------- Teacher account approvals ----------

@router.get("/users/pending-teachers")
async def pending_teachers(user: dict = Depends(require_permission("teacher.approve"))):
    docs = await db.users.find({"status": "pending_approval"}).sort("created_at", -1).to_list(100)
    return {"items": sers(docs)}


@router.post("/users/{uid}/approve-teacher")
async def approve_teacher(uid: str, request: Request,
                          user: dict = Depends(require_permission("teacher.approve"))):
    target = await db.users.find_one({"_id": oid(uid)})
    if not target or target.get("status") != "pending_approval":
        raise HTTPException(status_code=404, detail="لا يوجد طلب معلق لهذا الحساب")
    await db.users.update_one({"_id": target["_id"]},
                              {"$set": {"status": "active", "approval_notice": True},
                               "$unset": {"rejection_reason": "", "pending_push_token": ""}})
    await create_notification(
        uid, "account",
        "تمت الموافقة على حسابك 🎉",
        "أهلاً بك في منصة مفكري المستقبل! تم تفعيل حسابك كمعلم، يمكنك الآن تسجيل الدخول.",
        "/dashboard",
    )
    # Phone push for teachers who enabled the approval alert while pending.
    # (No-op when they never subscribed — send_push_to_user returns 0 then.)
    try:
        await send_push_to_user(uid, "تمت الموافقة على حسابك 🎉",
                                "تم تفعيل حسابك كمعلم — سجل الدخول الآن للبدء.",
                                "/login")
    except Exception:
        pass
    await audit_log(user, "teacher_approve", "user", uid, None, request)
    return {"ok": True}


class RejectTeacherBody(BaseModel):
    reason: str = Field(default="", max_length=500)


@router.post("/users/{uid}/reject-teacher")
async def reject_teacher(uid: str, body: RejectTeacherBody, request: Request,
                         user: dict = Depends(require_permission("teacher.approve"))):
    target = await db.users.find_one({"_id": oid(uid)})
    if not target or target.get("status") != "pending_approval":
        raise HTTPException(status_code=404, detail="لا يوجد طلب معلق لهذا الحساب")
    reason = body.reason.strip() or "لم يتم قبول طلب إنشاء الحساب"
    await db.users.update_one({"_id": target["_id"]},
                              {"$set": {"status": "rejected", "rejection_reason": reason},
                               "$unset": {"pending_push_token": ""}})
    # The denial message is shown to them on their next login attempt.
    await audit_log(user, "teacher_reject", "user", uid, {"reason": reason}, request)
    return {"ok": True}


@router.get("/permissions")
async def list_permissions(user: dict = Depends(get_current_user)):
    # Needed both for editing roles and for the create-account permission picker.
    perms = effective_permissions(user)
    if "role.manage" not in perms and "user.create" not in perms:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية للقيام بهذا الإجراء")
    return {"permissions": ALL_PERMISSIONS,
            "labels": PERMISSION_LABELS,
            "groups": [{"key": k, "label": label, "permissions": perms}
                       for k, label, perms in PERMISSION_GROUPS],
            "roles": [{"key": r, "label": ROLE_LABELS[r],
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
    channel: str = "both"  # push | inapp | both


def _check_channel(channel: str) -> str:
    if channel not in ("push", "inapp", "both"):
        raise HTTPException(400, "قناة الإرسال غير صالحة")
    return channel


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
    channel = _check_channel(body.channel)
    q = _audience_query(body.scope, body.scope_id, user)
    users = await db.users.find(q, {"_id": 1}).to_list(20000)
    ids = [str(u["_id"]) for u in users]
    counts = await deliver_notification(
        ids, "announcement", body.title.strip(), body.body,
        body.link or "/dashboard", channel)
    camp = {"title": body.title.strip(), "body": body.body, "link": body.link or "/dashboard",
            "scope": body.scope, "scope_id": body.scope_id, "channel": channel,
            "status": "sent", "sent_at": now_iso(), "recipient_count": len(ids),
            "inapp_count": counts["inapp"], "push_count": counts["push"],
            "created_by": user["id"], "created_at": now_iso()}
    await db.notification_campaigns.insert_one(camp)
    await audit_log(user, "notify.send", "notification", None,
                    {"count": len(ids), "scope": body.scope, "channel": channel}, request)
    return {"ok": True, "sent": len(ids), "inapp": counts["inapp"],
            "push": counts["push"], "channel": channel}


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
    channel = _check_channel(body.channel)
    q = _audience_query(body.scope, body.scope_id, user)
    camp = {"title": body.title.strip(), "body": body.body, "link": body.link or "/dashboard",
            "audience_query": q, "scope": body.scope, "scope_id": body.scope_id,
            "channel": channel,
            "status": "scheduled", "send_at": dt.isoformat(),
            "created_by": user["id"], "created_at": now_iso()}
    r = await db.notification_campaigns.insert_one(camp)
    await audit_log(user, "notify.schedule", "notification", str(r.inserted_id),
                    {"send_at": camp["send_at"], "scope": body.scope, "channel": channel}, request)
    return {"ok": True, "id": str(r.inserted_id)}


@router.post("/notify/campaigns/{cid}/send-now")
async def campaign_send_now(cid: str, request: Request,
                            user: dict = Depends(require_permission(NOTIFY_PERM))):
    """Immediately dispatch a scheduled campaign (also rescues overdue ones)."""
    doc = await db.notification_campaigns.find_one({"_id": oid(cid)})
    if not doc:
        raise HTTPException(404, "الحملة غير موجودة")
    if doc.get("status") != "scheduled":
        raise HTTPException(400, f"الحملة ليست مجدولة (الحالة: {doc.get('status')})")
    claimed = await db.notification_campaigns.update_one(
        {"_id": doc["_id"], "status": "scheduled"},
        {"$set": {"status": "sending"}})
    if claimed.modified_count == 0:
        raise HTTPException(409, "الحملة قيد الإرسال بالفعل")
    try:
        q = doc.get("audience_query") or {"status": {"$ne": "banned"}}
        users = await db.users.find(q, {"_id": 1}).to_list(20000)
        ids = [str(u["_id"]) for u in users]
        counts = await deliver_notification(
            ids, "announcement", doc["title"], doc.get("body", ""),
            doc.get("link") or "/dashboard", doc.get("channel") or "both")
        await db.notification_campaigns.update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "sent", "sent_at": now_iso(),
                      "recipient_count": len(ids),
                      "inapp_count": counts["inapp"],
                      "push_count": counts["push"]}})
    except Exception as e:
        await db.notification_campaigns.update_one(
            {"_id": doc["_id"]}, {"$set": {"status": "scheduled"}})
        raise HTTPException(500, f"فشل الإرسال: {type(e).__name__}: {str(e)[:200]}")
    await audit_log(user, "notify.send_now", "notification", cid, None, request)
    return {"ok": True, "dispatched": 1, "inapp": counts["inapp"], "push": counts["push"]}


@router.get("/notify/stats")
async def notify_stats(user: dict = Depends(require_permission(NOTIFY_PERM))):
    """Small numbers the admin UI needs: push-subscribed devices, users."""
    devices = await db.push_subscriptions.count_documents({})
    users = await db.users.count_documents({"status": {"$ne": "banned"}})
    return {"push_devices": devices, "users": users}


@router.get("/notify/audience-count")
async def audience_count(scope: str = Query("all"),
                        scope_id: str | None = Query(None),
                        user: dict = Depends(require_permission(NOTIFY_PERM))):
    """Live recipient count preview for the notify composer audience picker."""
    q = _audience_query(scope, scope_id, user)
    count = await db.users.count_documents(q)
    return {"count": count, "scope": scope, "scope_id": scope_id}


@router.get("/notify/campaigns")
async def list_campaigns(user: dict = Depends(require_permission(NOTIFY_PERM))):
    # Flush anything due right now so the admin always sees fresh state.
    from services import dispatch_due_campaigns
    try:
        await dispatch_due_campaigns()
    except Exception:
        pass
    docs = await db.notification_campaigns.find({}).sort("created_at", -1).to_list(50)
    return {"items": sers(docs)}


@router.delete("/notify/campaigns/{cid}")
async def cancel_campaign(cid: str, request: Request, user: dict = Depends(get_current_user)):
    doc = await db.notification_campaigns.find_one({"_id": oid(cid)})
    if not doc:
        raise HTTPException(404, "الحملة غير موجودة")
    perms = effective_permissions(user)
    if doc.get("status") == "scheduled":
        # Cancelling a scheduled campaign keeps the original permission.
        if NOTIFY_PERM not in perms:
            raise HTTPException(403, "ليس لديك صلاحية للقيام بهذا الإجراء")
        await db.notification_campaigns.delete_one({"_id": doc["_id"]})
        await audit_log(user, "notify.cancel", "notification", cid, None, request)
        return {"ok": True, "cancelled": True}
    # Deleting an already-sent campaign from the history needs its own permission.
    if "notification.delete" not in perms:
        raise HTTPException(403, "تحتاج صلاحية «حذف سجل الإشعارات» لحذف عناصر من السجل")
    await db.notification_campaigns.delete_one({"_id": doc["_id"]})
    await audit_log(user, "notify.history_delete", "notification", cid, None, request)
    return {"ok": True, "deleted": True}
