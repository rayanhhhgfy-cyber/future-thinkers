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
    import os, json, asyncio
    has_public = bool(os.environ.get("VAPID_PUBLIC_KEY"))
    has_private = bool(os.environ.get("VAPID_PRIVATE_KEY"))
    subs = await db.push_subscriptions.find({"user_id": user["id"]}).to_list(20)
    n = len(subs)
    delivered = 0
    error = None
    if n == 0:
        error = "لا يوجد اشتراك دفع مسجل لهذا المستخدم"
    elif not (has_public and has_private):
        error = "مفاتيح VAPID غير مكتملة على الخادم"
    else:
        from services import _vapid_cfg, _do_webpush
        cfg = _vapid_cfg()
        payload = {"title": "اختبار الإشعارات 🔔",
                   "body": "إذا وصلك هذا فإشعارات الهاتف تعمل!",
                   "link": "/dashboard"}
        for sub in subs:
            try:
                await asyncio.to_thread(
                    _do_webpush, sub.get("subscription") or {},
                    payload, cfg["private"], cfg["subject"])
                delivered += 1
            except Exception as e:
                # surface the real failure reason for diagnostics
                error = f"{type(e).__name__}: {str(e)[:300]}"
    return {"ok": delivered > 0, "devices": n,
            "vapid_public": has_public, "vapid_private": has_private,
            "delivered": delivered, "error": error,
            "lib_versions": _lib_versions()}


def _lib_versions():
    out = {}
    for mod in ("pywebpush", "cryptography", "http_ece"):
        try:
            m = __import__(mod)
            out[mod] = getattr(m, "__version__", "?")
        except Exception as e:
            out[mod] = f"missing: {e}"
    try:
        import importlib.metadata as md
        for pkg in ("pywebpush", "cryptography", "http-ece"):
            try:
                out[pkg + ":dist"] = md.version(pkg)
            except Exception:
                pass
    except Exception:
        pass
    return out
