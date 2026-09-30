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
