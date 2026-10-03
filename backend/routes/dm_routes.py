"""Direct messages (1-on-1) between users, with blocking."""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, oid, now_iso
from auth import get_current_user

router = APIRouter(prefix="/api/dm")


async def _get_user(uid: str):
    o = oid(uid)
    if not o:
        return None
    return await db.users.find_one({"_id": o}, {"name": 1, "status": 1, "blocked_users": 1})


def _pub(doc):
    """Public {id, name} for a user doc."""
    return {"id": str(doc["_id"]), "name": doc.get("name", "")}


async def _find_conv(me_id: str, uid: str):
    return await db.dm_conversations.find_one(
        {"members": {"$all": [me_id, uid]}})


class MessageBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    me = user["id"]
    convs = await db.dm_conversations.find(
        {"members": me}).sort("last_at", -1).to_list(200)
    items = []
    for c in convs:
        other_id = next((m for m in c["members"] if m != me), me)
        other = await _get_user(other_id)
        if not other:
            continue
        items.append({
            "id": c["id"],
            "other": _pub(other),
            "last_message": c.get("last_message", ""),
            "last_at": c.get("last_at", c.get("created_at", "")),
            "unread": (c.get("unread") or {}).get(me, 0),
        })
    return {"items": items}


@router.get("/with/{uid}")
async def get_thread(uid: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    other = await _get_user(uid)
    if not other:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    conv = await _find_conv(me, uid)
    if not conv:
        return {"other": _pub(other), "items": []}
    msgs = await db.dm_messages.find(
        {"conversation_id": conv["id"]}).sort("at", 1).to_list(1000)
    # Mark my unread in this conversation as read.
    if (conv.get("unread") or {}).get(me, 0):
        await db.dm_conversations.update_one(
            {"id": conv["id"]}, {"$set": {f"unread.{me}": 0}})
    items = [{
        "id": m["id"],
        "from_me": m["sender_id"] == me,
        "body": m["body"],
        "at": m["at"],
    } for m in msgs]
    return {"other": _pub(other), "items": items}


@router.post("/with/{uid}")
async def send_message(uid: str, body: MessageBody,
                       user: dict = Depends(get_current_user)):
    me = user["id"]
    if uid == me:
        raise HTTPException(status_code=400, detail="لا يمكنك مراسلة نفسك")
    other = await _get_user(uid)
    if not other:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if other.get("status") != "active":
        raise HTTPException(status_code=403, detail="المستخدم غير متاح")
    if uid in (user.get("blocked_users") or []):
        raise HTTPException(status_code=403, detail="لقد حظرت هذا المستخدم")
    if me in (other.get("blocked_users") or []):
        raise HTTPException(status_code=403, detail="لا يمكنك مراسلة هذا المستخدم")

    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="الرسالة فارغة")
    now = now_iso()
    conv = await _find_conv(me, uid)
    if not conv:
        conv = {
            "id": uuid.uuid4().hex,
            "members": sorted([me, uid]),
            "last_message": "",
            "last_at": now,
            "unread": {me: 0, uid: 0},
            "created_at": now,
        }
        await db.dm_conversations.insert_one(conv)
    msg = {
        "id": uuid.uuid4().hex,
        "conversation_id": conv["id"],
        "sender_id": me,
        "body": text,
        "at": now,
    }
    await db.dm_messages.insert_one(msg)
    await db.dm_conversations.update_one(
        {"id": conv["id"]},
        {"$set": {"last_message": text, "last_at": now},
         "$inc": {f"unread.{uid}": 1}})
    return {"ok": True}


@router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    me = user["id"]
    convs = await db.dm_conversations.find({"members": me}).to_list(500)
    count = sum((c.get("unread") or {}).get(me, 0) for c in convs)
    return {"count": count}


@router.post("/block/{uid}")
async def toggle_block(uid: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    if uid == me:
        raise HTTPException(status_code=400, detail="لا يمكنك حظر نفسك")
    other = await _get_user(uid)
    if not other:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    blocked = list(user.get("blocked_users") or [])
    if uid in blocked:
        blocked.remove(uid)
        is_blocked = False
    else:
        blocked.append(uid)
        is_blocked = True
    await db.users.update_one(
        {"_id": oid(me)}, {"$set": {"blocked_users": blocked}})
    return {"blocked": is_blocked}
