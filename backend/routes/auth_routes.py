import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from db import db, ser, sers, now_iso
from auth import (hash_password, verify_password, create_access_token, create_refresh_token,
                  get_current_user, effective_permissions, get_secret)
import jwt
from services import audit_log

router = APIRouter(prefix="/api/auth")

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: str = "student"
    school_id: str | None = None
    grade: str | None = None
    section: str | None = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class UpdateProfileBody(BaseModel):
    name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    privacy: dict | None = None
    cover_theme: str | None = None
    daily_goal_pages: int | None = None
    notify_prefs: dict | None = None


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


def _set_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=30 * 24 * 3600, path="/")


def _public_user(user: dict) -> dict:
    u = ser(user)
    u["permissions"] = sorted(effective_permissions(user))
    return u


@router.post("/register")
async def register(body: RegisterBody, request: Request, response: Response):
    email = body.email.lower().strip()
    if body.role not in ("student", "teacher"):
        raise HTTPException(status_code=400, detail="يُسمح بالتسجيل الذاتي للطلاب والمعلمين فقط")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم مسبقاً")

    geo = {}
    if body.school_id:
        school = await db.schools.find_one({"_id": ObjectId(body.school_id)}) if ObjectId.is_valid(body.school_id) else None
        if not school:
            raise HTTPException(status_code=400, detail="المدرسة غير موجودة")
        geo = {
            "school_id": body.school_id, "school_name": school["name"],
            "directorate_id": school["directorate_id"], "directorate_name": school["directorate_name"],
            "governorate_id": school["governorate_id"], "governorate_name": school["governorate_name"],
        }
        await db.schools.update_one({"_id": school["_id"]}, {"$inc": {"students_count": 1}})
    elif body.role == "student":
        raise HTTPException(status_code=400, detail="يجب اختيار المدرسة للطالب")

    doc = {
        "name": body.name.strip(), "email": email,
        "password_hash": hash_password(body.password), "role": body.role,
        # Teachers need admin approval before their account is activated.
        "status": "pending_approval" if body.role == "teacher" else "active",
        "grade": body.grade, "section": body.section,
        "xp": 0, "level": 1, "level_title": "قارئ مبتدئ",
        "extra_permissions": [], "badges": [], "achievements": [], "stats": {},
        "streak": 0, "chess_rating": 1200, "email_verified": False,
        "privacy": {"show_school": True, "show_activity": True},
        "created_at": now_iso(), **geo,
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    uid = str(res.inserted_id)
    await audit_log({"id": uid, "email": email}, "register", "user", uid, request=request)
    if body.role == "teacher":
        # No session yet · the account activates only after admin approval.
        # Issue a single-purpose token so this device can subscribe for a
        # phone push the moment the account gets approved.
        push_token = secrets.token_urlsafe(32)
        await db.users.update_one({"_id": res.inserted_id},
                                  {"$set": {"pending_push_token": push_token}})
        return {"pending_approval": True,
                "push_token": push_token,
                "message": "تم استلام طلب إنشاء حسابك كمعلم بنجاح. سيتم مراجعته من قبل الإدارة وسيصلك إشعار عند الموافقة."}
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    _set_cookies(response, access, refresh)
    from security_signing import get_session_key
    return {"user": _public_user(doc), "access_token": access, "refresh_token": refresh,
            "sig_key": await get_session_key(access)}


@router.get("/teacher-application-status")
async def teacher_application_status(email: str = ""):
    """Public: let a teacher applicant check whether their account was approved.

    Only reveals the application state of teacher-role accounts · nothing else.
    """
    email = (email or "").lower().strip()
    if not email:
        return {"status": "none", "message": "أدخل البريد الإلكتروني للتحقق من حالة الطلب"}
    user = await db.users.find_one({"email": email})
    if not user or user.get("role") != "teacher":
        return {"status": "none", "message": "لا يوجد طلب حساب معلم بهذا البريد الإلكتروني"}
    st = user.get("status")
    if st == "pending_approval":
        return {"status": "pending",
                "message": "طلبك قيد المراجعة من قبل الإدارة. تحقق مجدداً لاحقاً · ستظهر لك هنا رسالة الموافقة فور اعتمادها."}
    if st == "rejected":
        reason = user.get("rejection_reason") or "لم يتم قبول الطلب"
        return {"status": "rejected",
                "message": f"تم رفض طلب حسابك: {reason}"}
    return {"status": "approved",
            "message": "تمت الموافقة على حسابك! سجل الدخول الآن للبدء."}


@router.post("/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "?"
    ident = f"{ip}:{email}"
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = rec.get("locked_until")
        if locked_until and datetime.fromisoformat(locked_until) > now:
            raise HTTPException(status_code=429, detail="تم قفل الحساب مؤقتاً بسبب محاولات فاشلة. حاول لاحقاً")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        new_count = (rec.get("count", 0) if rec else 0) + 1
        upd = {"$set": {"count": new_count}}
        if new_count >= MAX_ATTEMPTS:
            upd["$set"]["locked_until"] = (now + timedelta(minutes=LOCK_MINUTES)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, upd, upsert=True)
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة")
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="تم حظر هذا الحساب")
    if user.get("status") == "deactivated":
        raise HTTPException(status_code=403, detail="هذا الحساب معطّل · تواصل مع الإدارة لإعادة تفعيله")
    if user.get("status") == "pending_approval":
        raise HTTPException(status_code=403, detail="حسابك كمعلم قيد المراجعة من قبل الإدارة. سيصلك إشعار عند الموافقة.")
    if user.get("status") == "rejected":
        reason = user.get("rejection_reason") or "لم يتم قبول طلب إنشاء الحساب"
        raise HTTPException(status_code=403, detail=f"تم رفض طلب إنشاء حسابك: {reason}")

    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    _set_cookies(response, access, refresh)
    await audit_log({"id": uid, "email": email}, "login", "user", uid, request=request)
    resp = {"user": _public_user(user), "access_token": access, "refresh_token": refresh}
    from security_signing import get_session_key
    resp["sig_key"] = await get_session_key(access)
    if user.get("approval_notice"):
        # First login after a teacher approval · the frontend shows a celebration
        # toast, then calls /auth/ack-approval-notice so it only shows once.
        resp["just_approved"] = True
    return resp


@router.post("/ack-approval-notice")
async def ack_approval_notice(user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$unset": {"approval_notice": ""}})
    return {"ok": True}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request, user: dict = Depends(get_current_user)):
    out = _public_user(user)
    token = None
    authz = request.headers.get("authorization") or ""
    if authz.lower().startswith("bearer "):
        token = authz[7:].strip() or None
    if not token:
        token = request.cookies.get("access_token")
    if token:
        from security_signing import get_session_key
        out["sig_key"] = await get_session_key(token)
    return out


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="لا يوجد رمز تجديد")
    try:
        payload = jwt.decode(token, get_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="رمز غير صالح")
        uid = payload["sub"]
        user = await db.users.find_one({"_id": ObjectId(uid)})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        access = create_access_token(uid, user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True,
                            samesite="none", max_age=7 * 24 * 3600, path="/")
        return {"access_token": access}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


@router.post("/forgot-password")
async def forgot_password(body: ForgotBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]), "used": False,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        })
        print(f"[RESET LINK] /reset-password?token={token}")
    return {"message": "إذا كان البريد مسجلاً، ستصلك رسالة لإعادة تعيين كلمة المرور"}


@router.post("/reset-password")
async def reset_password(body: ResetBody):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="رمز غير صالح أو مستخدم")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="انتهت صلاحية الرمز")
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
        {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"message": "تم تحديث كلمة المرور بنجاح"}


@router.put("/me")
async def update_profile(body: UpdateProfileBody, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": update})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return _public_user(fresh)


@router.post("/change-password")
async def change_password(body: ChangePasswordBody, user: dict = Depends(get_current_user)):
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    await db.users.update_one({"_id": ObjectId(user["id"])},
        {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"message": "تم تغيير كلمة المرور"}


@router.get("/me/export")
async def export_my_data(user: dict = Depends(get_current_user)):
    """Download everything the platform holds about me (JSON)."""
    uid = user["id"]
    me = await db.users.find_one({"_id": ObjectId(uid)}) or {}
    me.pop("password_hash", None)
    tx = await db.xp_transactions.find({"user_id": uid}).sort("created_at", -1).limit(300).to_list(300)
    progress = await db.reading_progress.find({"user_id": uid}).to_list(200)
    works = await db.works.find({"author_id": uid}).to_list(100)
    ventures = await db.ventures.find(
        {"$or": [{"owner_id": uid}, {"members.id": uid}]}).to_list(100)
    certs = await db.certificates.find({"user_id": uid}).to_list(100)
    return {
        "exported_at": now_iso(), "profile": ser(me),
        "xp_history": sers(tx), "reading_progress": sers(progress),
        "my_works": sers(works), "my_ventures": sers(ventures),
        "my_certificates": sers(certs),
    }


@router.post("/me/deactivate")
async def deactivate_account(user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": ObjectId(user["id"])},
                              {"$set": {"status": "deactivated", "deactivated_at": now_iso()}})
    return {"ok": True, "message": "تم تعطيل حسابك. تواصل مع الإدارة لإعادة تفعيله."}
