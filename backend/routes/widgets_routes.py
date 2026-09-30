"""تفضيلات ودجت لوحة التحكم — ترتيب وإظهار/إخفاء الودجت لكل مستخدم."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from db import db
from auth import get_current_user

router = APIRouter(prefix="/api/widgets")

DEFAULT_WIDGETS = ["stats", "reading", "events", "competitions", "recommendations",
                   "achievements", "badges", "studio"]


class PrefsBody(BaseModel):
    widgets: list[str]  # ordered list of visible widget keys


@router.get("/prefs")
async def get_prefs(user: dict = Depends(get_current_user)):
    doc = await db.widget_prefs.find_one({"user_id": user["id"]})
    if doc:
        return {"widgets": doc.get("widgets", DEFAULT_WIDGETS)}
    return {"widgets": DEFAULT_WIDGETS}


@router.put("/prefs")
async def set_prefs(body: PrefsBody, user: dict = Depends(get_current_user)):
    widgets = [w for w in body.widgets if w in DEFAULT_WIDGETS]
    if not widgets:
        widgets = DEFAULT_WIDGETS
    await db.widget_prefs.update_one(
        {"user_id": user["id"]},
        {"$set": {"widgets": widgets}}, upsert=True)
    return {"widgets": widgets}
