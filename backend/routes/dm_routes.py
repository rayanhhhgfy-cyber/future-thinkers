"""Direct messages (1-on-1) between users, with blocking."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, oid, now_iso
from auth import get_current_user
from services import create_notification

router = APIRouter(prefix="/api/dm")


def _parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


async def _get_user(uid: str):
    o = oid(uid)
    if not o:
        return None
    return await db.users.find_one(
        {"_id": o}, {"name": 1, "status": 1, "blocked_users": 1, "avatar_url": 1})


def _pub(doc):
    """Public {id, name, avatar_url} for a user doc."""
    return {"id": str(doc["_id"]), "name": doc.get("name", ""),
            "avatar_url": doc.get("avatar_url")}


async def _find_conv(me_id: str, uid: str):
    return await db.dm_conversations.find_one(
        {"members": {"$all": [me_id, uid]}})


class MessageBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    reply_to: str | None = None


class ReactBody(BaseModel):
    emoji: str


class EditBody(BaseModel):
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
        return {"other": _pub(other), "items": [], "other_typing": False}
    msgs = await db.dm_messages.find(
        {"conversation_id": conv["id"]}).sort("at", 1).to_list(1000)
    now = now_iso()
    now_dt = datetime.now(timezone.utc)
    # Record that I have read the thread up to now.
    updates = {f"last_read.{me}": now}
    if (conv.get("unread") or {}).get(me, 0):
        updates[f"unread.{me}"] = 0
    await db.dm_conversations.update_one({"id": conv["id"]}, {"$set": updates})
    other_last_read = _parse_ts((conv.get("last_read") or {}).get(uid))
    typing_at = _parse_ts((conv.get("typing") or {}).get(uid))
    other_typing = bool(typing_at and (now_dt - typing_at).total_seconds() <= 5)
    items = []
    for m in msgs:
        mine = m["sender_id"] == me
        at_dt = _parse_ts(m.get("at"))
        item = {
            "id": m["id"],
            "from_me": mine,
            "body": "" if m.get("deleted") else m.get("body", ""),
            "at": m["at"],
            "reactions": m.get("reactions") or {},
            "reply": m.get("reply"),
            "edited": bool(m.get("edited")),
            "deleted": bool(m.get("deleted")),
        }
        if mine:
            item["seen"] = bool(
                other_last_read and at_dt and at_dt <= other_last_read)
        items.append(item)
    return {"other": _pub(other), "items": items,
            "other_typing": other_typing}


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
    reply = None
    if body.reply_to:
        orig = await db.dm_messages.find_one(
            {"id": body.reply_to, "conversation_id": conv["id"]})
        if orig:
            if orig["sender_id"] == me:
                orig_name = user.get("name", "")
            else:
                orig_name = other.get("name", "")
            reply = {
                "id": orig["id"],
                "name": orig_name,
                "text": (orig.get("body") or "")[:90],
            }
    msg = {
        "id": uuid.uuid4().hex,
        "conversation_id": conv["id"],
        "sender_id": me,
        "body": text,
        "at": now,
        "reply": reply,
    }
    await db.dm_messages.insert_one(msg)
    await db.dm_conversations.update_one(
        {"id": conv["id"]},
        {"$set": {"last_message": text, "last_at": now},
         "$inc": {f"unread.{uid}": 1}})
    try:
        await create_notification(
            uid, "message", "رسالة جديدة",
            f"أرسل لك {user.get('name', '')} رسالة: {text[:60]}",
            link=f"/messages?to={me}")
    except Exception:
        pass
    return {"ok": True}


async def _member_message(mid: str, me: str):
    """Fetch a message and verify I am a member of its conversation."""
    msg = await db.dm_messages.find_one({"id": mid})
    if not msg:
        raise HTTPException(status_code=404, detail="الرسالة غير موجودة")
    conv = await db.dm_conversations.find_one(
        {"id": msg["conversation_id"], "members": me})
    if not conv:
        raise HTTPException(status_code=403, detail="لا صلاحية لديك على هذه المحادثة")
    return msg, conv


@router.post("/messages/{mid}/react")
async def react_message(mid: str, body: ReactBody,
                        user: dict = Depends(get_current_user)):
    me = user["id"]
    emoji = (body.emoji or "").strip()
    if not emoji or len(emoji) > 8:
        raise HTTPException(status_code=400, detail="رمز غير صالح")
    msg, _conv = await _member_message(mid, me)
    reactions = dict(msg.get("reactions") or {})
    users = list(reactions.get(emoji) or [])
    if me in users:
        users.remove(me)
    else:
        users.append(me)
    if users:
        reactions[emoji] = users
    else:
        reactions.pop(emoji, None)
    await db.dm_messages.update_one(
        {"id": mid}, {"$set": {"reactions": reactions}})
    return {"reactions": reactions}


@router.patch("/messages/{mid}")
async def edit_message(mid: str, body: EditBody,
                       user: dict = Depends(get_current_user)):
    me = user["id"]
    msg, _conv = await _member_message(mid, me)
    if msg["sender_id"] != me:
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل رسالة لست صاحبها")
    if msg.get("deleted"):
        raise HTTPException(status_code=400, detail="لا يمكن تعديل رسالة محذوفة")
    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=400, detail="الرسالة فارغة")
    await db.dm_messages.update_one(
        {"id": mid}, {"$set": {"body": text, "edited": True}})
    return {"ok": True}


@router.delete("/messages/{mid}")
async def delete_message(mid: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    msg, _conv = await _member_message(mid, me)
    if msg["sender_id"] != me:
        raise HTTPException(status_code=403, detail="لا يمكنك حذف رسالة لست صاحبها")
    await db.dm_messages.update_one(
        {"id": mid}, {"$set": {"deleted": True, "body": ""}})
    return {"ok": True}


@router.post("/typing/{uid}")
async def typing_ping(uid: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    conv = await _find_conv(me, uid)
    if conv:
        await db.dm_conversations.update_one(
            {"id": conv["id"]}, {"$set": {f"typing.{me}": now_iso()}})
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
