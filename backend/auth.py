import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from bson import ObjectId
from db import db

JWT_ALG = "HS256"
ACCESS_TTL = timedelta(days=7)
REFRESH_TTL = timedelta(days=30)

ROLES = [
    "student", "teacher", "school_admin", "directorate_admin",
    "moderator", "admin", "super_admin", "custom",
]

ROLE_LABELS = {
    "student": "طالب",
    "teacher": "معلم",
    "school_admin": "مدير مدرسة",
    "directorate_admin": "مدير مديرية",
    "moderator": "مشرف محتوى",
    "admin": "مسؤول المنصة",
    "super_admin": "المسؤول الأعلى",
    "custom": "صلاحيات مخصصة",
}

ALL_PERMISSIONS = [
    # الكتب
    "book.view", "book.create", "book.edit", "book.delete", "book.approve", "book.reject",
    # الفعاليات
    "event.view", "event.create", "event.edit", "event.delete", "event.approve",
    # المسابقات
    "competition.view", "competition.create", "competition.edit", "competition.delete",
    "competition.manage",
    # المستخدمون
    "user.view", "user.create", "user.edit", "user.delete", "user.manage", "user.ban",
    # الأدوار والصلاحيات
    "role.view", "role.manage",
    # المعلمون
    "teacher.approve",
    # المدارس
    "school.view", "school.create", "school.edit", "school.delete", "school.manage",
    # المديريات
    "directorate.view", "directorate.create", "directorate.manage",
    # الطلاب
    "student.view", "student.edit", "student.manage",
    # المناقشات والتعليقات
    "discussion.view", "discussion.create", "discussion.delete", "discussion.moderate",
    "comment.moderate",
    # المحتوى والبلاغات
    "content.moderate", "report.manage",
    # الأخبار
    "news.view", "news.create", "news.edit", "news.delete", "news.manage",
    # الأنشطة
    "activity.view", "activity.create", "activity.approve", "activity.delete",
    # النقاط والإنجازات
    "points.view", "points.manage", "achievement.view", "achievement.manage",
    # الاستوديو
    "studio.view", "studio.create", "studio.review", "studio.delete",
    # الشارات
    "badge.view", "badge.create", "badge.award", "badge.manage",
    # الشهادات
    "certificate.view", "certificate.create", "certificate.manage", "certificate.delete",
    # الإشعارات
    "notification.view", "notification.broadcast", "notification.delete",
    # الأندية
    "club.view", "club.create", "club.edit", "club.delete", "club.manage",
    # المتصدرون
    "leaderboard.view", "leaderboard.manage",
    # النظام
    "cms.view", "cms.edit", "cms.manage",
    "analytics.view", "analytics.manage",
    "audit.view", "audit.manage",
    "settings.manage", "backup.manage",
]

PERMISSION_GROUPS = [
    ("books", "📚 الكتب", ["book.view", "book.create", "book.edit", "book.delete", "book.approve", "book.reject"]),
    ("events", "📅 الفعاليات", ["event.view", "event.create", "event.edit", "event.delete", "event.approve"]),
    ("competitions", "🏆 المسابقات", ["competition.view", "competition.create", "competition.edit", "competition.delete", "competition.manage"]),
    ("users", "👥 المستخدمون", ["user.view", "user.create", "user.edit", "user.delete", "user.manage", "user.ban"]),
    ("roles", "🛡️ الأدوار", ["role.view", "role.manage"]),
    ("teachers", "👨‍🏫 المعلمون", ["teacher.approve"]),
    ("schools", "🏫 المدارس", ["school.view", "school.create", "school.edit", "school.delete", "school.manage"]),
    ("directorates", "🗺️ المديريات", ["directorate.view", "directorate.create", "directorate.manage"]),
    ("students", "🎒 الطلاب", ["student.view", "student.edit", "student.manage"]),
    ("discussions", "💬 المناقشات", ["discussion.view", "discussion.create", "discussion.delete", "discussion.moderate", "comment.moderate"]),
    ("content", "🛠️ المحتوى والبلاغات", ["content.moderate", "report.manage"]),
    ("news", "📰 الأخبار", ["news.view", "news.create", "news.edit", "news.delete", "news.manage"]),
    ("activities", "⚡ الأنشطة", ["activity.view", "activity.create", "activity.approve", "activity.delete"]),
    ("points", "⭐ النقاط والإنجازات", ["points.view", "points.manage", "achievement.view", "achievement.manage"]),
    ("studio", "🎨 الاستوديو", ["studio.view", "studio.create", "studio.review", "studio.delete"]),
    ("badges", "🎖️ الشارات", ["badge.view", "badge.create", "badge.award", "badge.manage"]),
    ("certificates", "📜 الشهادات", ["certificate.view", "certificate.create", "certificate.manage", "certificate.delete"]),
    ("notifications", "🔔 الإشعارات", ["notification.view", "notification.broadcast", "notification.delete"]),
    ("clubs", "🤝 الأندية", ["club.view", "club.create", "club.edit", "club.delete", "club.manage"]),
    ("leaderboard", "🥇 المتصدرون", ["leaderboard.view", "leaderboard.manage"]),
    ("system", "⚙️ النظام", ["cms.view", "cms.edit", "cms.manage", "analytics.view", "analytics.manage",
                             "audit.view", "audit.manage", "settings.manage", "backup.manage"]),
]

PERMISSION_LABELS = {
    "book.view": "عرض الكتب", "book.create": "رفع كتب", "book.edit": "تعديل الكتب",
    "book.delete": "حذف الكتب", "book.approve": "الموافقة على الكتب", "book.reject": "رفض الكتب",
    "event.view": "عرض الفعاليات", "event.create": "إنشاء فعاليات", "event.edit": "تعديل الفعاليات",
    "event.delete": "حذف الفعاليات", "event.approve": "الموافقة على الفعاليات",
    "competition.view": "عرض المسابقات", "competition.create": "إنشاء مسابقات",
    "competition.edit": "تعديل المسابقات", "competition.delete": "حذف المسابقات",
    "competition.manage": "إدارة المسابقات",
    "user.view": "عرض المستخدمين", "user.create": "إنشاء حسابات", "user.edit": "تعديل المستخدمين",
    "user.delete": "حذف المستخدمين", "user.manage": "إدارة المستخدمين (حظر/تفعيل)",
    "user.ban": "حظر المستخدمين",
    "role.view": "عرض الأدوار", "role.manage": "إدارة الأدوار والصلاحيات",
    "teacher.approve": "الموافقة على حسابات المعلمين",
    "school.view": "عرض المدارس", "school.create": "إضافة مدارس", "school.edit": "تعديل المدارس",
    "school.delete": "حذف المدارس", "school.manage": "إدارة المدارس",
    "directorate.view": "عرض المديريات", "directorate.create": "إضافة مديريات",
    "directorate.manage": "إدارة المديريات",
    "student.view": "عرض الطلاب", "student.edit": "تعديل بيانات الطلاب",
    "student.manage": "إدارة الطلاب",
    "discussion.view": "عرض المناقشات", "discussion.create": "إنشاء مناقشات",
    "discussion.delete": "حذف المناقشات", "discussion.moderate": "إشراف على المناقشات",
    "comment.moderate": "إشراف على التعليقات",
    "content.moderate": "مراجعة المحتوى", "report.manage": "إدارة البلاغات",
    "news.view": "عرض الأخبار", "news.create": "نشر أخبار", "news.edit": "تعديل الأخبار",
    "news.delete": "حذف الأخبار", "news.manage": "إدارة الأخبار",
    "activity.view": "عرض الأنشطة", "activity.create": "إنشاء أنشطة",
    "activity.approve": "الموافقة على الأنشطة", "activity.delete": "حذف الأنشطة",
    "points.view": "عرض النقاط", "points.manage": "إدارة النقاط",
    "achievement.view": "عرض الإنجازات", "achievement.manage": "إدارة الإنجازات",
    "studio.view": "عرض الاستوديو", "studio.create": "النشر في الاستوديو",
    "studio.review": "مراجعة أعمال الاستوديو", "studio.delete": "حذف أعمال الاستوديو",
    "badge.view": "عرض الشارات", "badge.create": "إنشاء شارات",
    "badge.award": "منح الشارات", "badge.manage": "إدارة الشارات",
    "certificate.view": "عرض الشهادات", "certificate.create": "إصدار شهادات",
    "certificate.manage": "إدارة الشهادات", "certificate.delete": "حذف الشهادات",
    "notification.view": "عرض الإشعارات", "notification.broadcast": "بث الإشعارات",
    "notification.delete": "حذف سجل الإشعارات",
    "club.view": "عرض الأندية", "club.create": "إنشاء أندية", "club.edit": "تعديل الأندية",
    "club.delete": "حذف الأندية", "club.manage": "إدارة الأندية",
    "leaderboard.view": "عرض المتصدرين", "leaderboard.manage": "إدارة المتصدرين",
    "cms.view": "عرض إعدادات المحتوى", "cms.edit": "تعديل إعدادات المحتوى",
    "cms.manage": "إدارة المحتوى",
    "analytics.view": "عرض الإحصائيات", "analytics.manage": "إدارة الإحصائيات",
    "audit.view": "عرض سجل العمليات", "audit.manage": "إدارة سجل العمليات",
    "settings.manage": "إدارة إعدادات المنصة", "backup.manage": "إدارة النسخ الاحتياطي",
}

_STUDENT = {"book.create", "discussion.create", "student.view"}
_TEACHER = _STUDENT | {"discussion.moderate", "event.create"}
_SCHOOL_ADMIN = _TEACHER | {"school.view", "student.view", "event.create", "activity.approve", "notification.broadcast"}
_DIR_ADMIN = _SCHOOL_ADMIN | {"directorate.view", "school.view", "analytics.view"}
_MODERATOR = {"content.moderate", "report.manage", "book.approve", "book.reject",
              "discussion.moderate", "activity.approve", "news.manage",
              "studio.review", "badge.award"}

ROLE_PERMISSIONS = {
    "student": _STUDENT,
    "teacher": _TEACHER,
    "school_admin": _SCHOOL_ADMIN,
    "directorate_admin": _DIR_ADMIN,
    "moderator": _MODERATOR,
    "admin": set(ALL_PERMISSIONS),
    "super_admin": set(ALL_PERMISSIONS),
    # "custom" starts with zero base permissions — everything it can do comes
    # from hand-picked extra_permissions assigned by an admin.
    "custom": set(),
}


def get_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + ACCESS_TTL}
    return jwt.encode(payload, get_secret(), algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + REFRESH_TTL}
    return jwt.encode(payload, get_secret(), algorithm=JWT_ALG)


def effective_permissions(user: dict) -> set:
    perms = set(ROLE_PERMISSIONS.get(user.get("role", "student"), set()))
    perms |= set(user.get("extra_permissions", []))
    return perms


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح لك بالدخول")
    try:
        payload = jwt.decode(token, get_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="نوع الرمز غير صالح")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        if user.get("status") == "banned":
            raise HTTPException(status_code=403, detail="تم حظر هذا الحساب")
        if user.get("status") == "pending_approval":
            raise HTTPException(status_code=403, detail="الحساب قيد المراجعة من قبل الإدارة")
        if user.get("status") == "rejected":
            raise HTTPException(status_code=403, detail="تم رفض طلب إنشاء هذا الحساب")
        user["id"] = str(user["_id"])
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def require_permission(permission: str):
    async def checker(user: dict = Depends(get_current_user)):
        if permission not in effective_permissions(user):
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية للقيام بهذا الإجراء")
        return user
    return checker


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية للوصول")
        return user
    return checker
