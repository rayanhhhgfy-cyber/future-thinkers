"""شارات المهارات — اعتمادات مصغّرة يمنحها المشرفون (خطابة، كتابة إبداعية، قيادة...)."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission
from services import create_notification, audit_log

router = APIRouter(prefix="/api/badges")


def _badge_out(b, earned=False, awarded_at=None):
    d = ser(b)
    d["earned"] = earned
    d["awarded_at"] = awarded_at
    return d


async def award_badge(user_id: str, badge_key: str, awarded_by: str, auto: bool = False):
    """Internal helper — awards a badge if not already earned. Returns True if newly awarded."""
    badge = await db.skill_badges.find_one({"key": badge_key})
    if not badge:
        return False
    existing = await db.user_badges.find_one({"user_id": user_id, "badge_key": badge_key})
    if existing:
        return False
    await db.user_badges.insert_one({
        "user_id": user_id, "badge_key": badge_key,
        "awarded_by": awarded_by, "auto": auto, "awarded_at": now_iso(),
    })
    await create_notification(user_id, "achievement",
                              f"حصلت على شارة مهارة! 🏅", badge["name"],
                              f"/profile/{user_id}")
    return True


@router.get("")
async def list_badges(request: Request):
    defs = await db.skill_badges.find({}).sort("order", 1).to_list(100)
    user = await get_optional_user(request)
    earned = {}
    if user:
        docs = await db.user_badges.find({"user_id": user["id"]}).to_list(200)
        earned = {d["badge_key"]: d.get("awarded_at") for d in docs}
    return [_badge_out(b, b["key"] in earned, earned.get(b["key"])) for b in defs]


@router.get("/me")
async def my_badges(user: dict = Depends(get_current_user)):
    defs = await db.skill_badges.find({}).sort("order", 1).to_list(100)
    docs = await db.user_badges.find({"user_id": user["id"]}).to_list(200)
    earned = {d["badge_key"]: d.get("awarded_at") for d in docs}
    return [_badge_out(b, b["key"] in earned, earned.get(b["key"]))
            for b in defs if b["key"] in earned]


@router.get("/user/{user_id}")
async def user_badges(user_id: str):
    defs = await db.skill_badges.find({}).sort("order", 1).to_list(100)
    docs = await db.user_badges.find({"user_id": user_id}).to_list(200)
    earned = {d["badge_key"]: d.get("awarded_at") for d in docs}
    return [_badge_out(b, b["key"] in earned, earned.get(b["key"]))
            for b in defs if b["key"] in earned]


class AwardBody(BaseModel):
    user_id: str
    badge_key: str


@router.post("/award")
async def award(body: AwardBody, request: Request,
                user: dict = Depends(require_permission("badge.award"))):
    target = await db.users.find_one({"_id": oid(body.user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    ok = await award_badge(body.user_id, body.badge_key, user["id"])
    if not ok:
        raise HTTPException(status_code=400, detail="الشارة غير موجودة أو ممنوحة مسبقاً")
    await audit_log(user, "badge_award", "user_badge", body.user_id,
                    {"badge": body.badge_key}, request)
    return {"ok": True}


class BadgeDef(BaseModel):
    key: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=60)
    description: str = ""
    criteria: str = ""
    icon: str = "Award"
    color: str = "#059669"
    order: int = 0


@router.post("")
async def create_badge(body: BadgeDef, request: Request,
                       user: dict = Depends(require_permission("badge.manage"))):
    if await db.skill_badges.find_one({"key": body.key}):
        raise HTTPException(status_code=400, detail="مفتاح الشارة مستخدم مسبقاً")
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    await db.skill_badges.insert_one(doc)
    await audit_log(user, "badge_create", "skill_badge", body.key, request=request)
    return {"ok": True, "key": body.key}


@router.delete("/{key}")
async def delete_badge(key: str, request: Request,
                       user: dict = Depends(require_permission("badge.manage"))):
    await db.skill_badges.delete_one({"key": key})
    await audit_log(user, "badge_delete", "skill_badge", key, request=request)
    return {"ok": True}
