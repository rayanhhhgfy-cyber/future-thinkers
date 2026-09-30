"""Web Push subscription management (VAPID)."""
import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import db, now_iso
from auth import get_current_user

router = APIRouter(prefix="/api/push")


@router.get("/vapid-public-key")
async def vapid_public_key():
    return {"publicKey": os.environ.get("VAPID_PUBLIC_KEY", "")}


class SubBody(BaseModel):
    subscription: dict


@router.post("/subscribe")
async def subscribe(body: SubBody, user: dict = Depends(get_current_user)):
    sub = body.subscription or {}
    endpoint = sub.get("endpoint") or ""
    if not endpoint or not isinstance(sub.get("keys"), dict):
        return {"ok": False, "error": "اشتراك غير صالح"}
    await db.push_subscriptions.update_one(
        {"user_id": user["id"], "endpoint": endpoint},
        {"$set": {"user_id": user["id"], "endpoint": endpoint,
                  "subscription": sub, "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@router.post("/unsubscribe")
async def unsubscribe(body: SubBody, user: dict = Depends(get_current_user)):
    endpoint = (body.subscription or {}).get("endpoint") or ""
    if endpoint:
        await db.push_subscriptions.delete_many({"user_id": user["id"], "endpoint": endpoint})
    else:
        await db.push_subscriptions.delete_many({"user_id": user["id"]})
    return {"ok": True}


@router.get("/status")
async def push_status(user: dict = Depends(get_current_user)):
    n = await db.push_subscriptions.count_documents({"user_id": user["id"]})
    return {"enabled": n > 0, "devices": n}


@router.post("/test")
async def push_test(user: dict = Depends(get_current_user)):
    """Send a test push to the current user's devices and report diagnostics."""
    import os
    from services import send_push_to_user
    has_public = bool(os.environ.get("VAPID_PUBLIC_KEY"))
    has_private = bool(os.environ.get("VAPID_PRIVATE_KEY"))
    n = await db.push_subscriptions.count_documents({"user_id": user["id"]})
    delivered = 0
    error = None
    if n == 0:
        error = "لا يوجد اشتراك دفع مسجل لهذا المستخدم"
    elif not (has_public and has_private):
        error = "مفاتيح VAPID غير مكتملة على الخادم"
    else:
        try:
            delivered = await send_push_to_user(
                user["id"], "اختبار الإشعارات 🔔",
                "إذا وصلك هذا فإشعارات الهاتف تعمل!", "/dashboard")
        except Exception as e:
            error = f"{type(e).__name__}: {str(e)[:200]}"
    return {"ok": delivered > 0, "devices": n,
            "vapid_public": has_public, "vapid_private": has_private,
            "delivered": delivered, "error": error}
