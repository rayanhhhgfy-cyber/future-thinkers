"""Study circles: small groups that gain XP together toward a shared goal.

Each member stores a snapshot of their XP at join time; their live
contribution is max(0, current_xp - snapshot). Snapshots are embedded in
the circle's members list.
"""
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, oid, now_iso
from auth import get_current_user
from services import award_xp, create_notification

router = APIRouter(prefix="/api/circles")

_CODE_ALPHABET = string.ascii_uppercase + string.digits

try:
    _AMMAN = ZoneInfo("Asia/Amman")
except Exception:  # pragma: no cover - tzdata missing fallback
    _AMMAN = timezone(timedelta(hours=3))


def _week_key() -> str:
    iso = datetime.now(_AMMAN).isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


async def _new_code() -> str:
    for _ in range(20):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not await db.study_circles.find_one({"code": code}):
            return code
    return uuid.uuid4().hex[:6].upper()


async def _xp_map(member_ids):
    """{user_id: current xp} for the given member ids."""
    oids = [o for o in (oid(i) for i in member_ids) if o]
    out = {}
    if oids:
        async for u in db.users.find({"_id": {"$in": oids}}, {"xp": 1}):
            out[str(u["_id"])] = u.get("xp", 0)
    return out


def _contribution(member, xp_by_id):
    return max(0, xp_by_id.get(member["id"], 0) - member.get("snapshot", 0))


async def _members_with_contrib(circle):
    xp_by_id = await _xp_map([m["id"] for m in circle.get("members", [])])
    rows = [{
        "id": m["id"],
        "name": m.get("name", ""),
        "contribution": _contribution(m, xp_by_id),
        "week_xp": max(0, xp_by_id.get(m["id"], 0) - m.get("week_base", m.get("snapshot", 0))),
    } for m in circle.get("members", [])]
    rows.sort(key=lambda r: -r["contribution"])
    return rows


async def _ensure_week(circle):
    """لقطة أسبوعية كسولة: عند تغيّر أسبوع عمّان تُعاد قاعدة XP الأسبوعية لكل عضو."""
    key = _week_key()
    members = circle.get("members", [])
    if all(m.get("week_key") == key for m in members):
        return circle
    xp_by_id = await _xp_map([m["id"] for m in members])
    changed = False
    for m in members:
        if m.get("week_key") != key:
            m["week_key"] = key
            m["week_base"] = xp_by_id.get(m["id"], m.get("snapshot", 0))
            changed = True
    if changed:
        await db.study_circles.update_one({"id": circle["id"]}, {"$set": {"members": members}})
    return circle


async def _challenge_view(circle):
    """عرض التحدي الحالي + إتمام المكافأة مرة واحدة عند بلوغ الهدف."""
    ch = circle.get("challenge")
    if not ch:
        return None
    xp_by_id = await _xp_map([m["id"] for m in circle.get("members", [])])
    base = ch.get("base") or {}
    progress = sum(max(0, xp_by_id.get(m["id"], 0) - base.get(m["id"], xp_by_id.get(m["id"], 0)))
                   for m in circle.get("members", []))
    done = bool(ch.get("done"))
    if not done and progress >= ch.get("target", 0) and ch.get("target", 0) > 0:
        # إغلاق ذرّي: أول طلب يقلب done يمنح المكافأة وحده · تمنع الازدواج
        res = await db.study_circles.update_one(
            {"id": circle["id"], "challenge.done": {"$ne": True}},
            {"$set": {"challenge.done": True}})
        done = True
        ch["done"] = True
        if res.modified_count:
            for m in circle.get("members", []):
                await award_xp(m["id"], 20, f"إكمال تحدي الدائرة: {ch.get('title', '')}", circle["id"])
                await create_notification(m["id"], "circle_challenge_done",
                                          "اكتمل تحدي الدائرة 🏆",
                                          f"حقق فريقكم هدف «{ch.get('title', '')}» وحصل كل عضو على +20 XP",
                                          "/circles")
    return {"title": ch.get("title", ""), "target": ch.get("target", 0),
            "progress": progress, "ends_at": ch.get("ends_at"), "done": done}


async def _summary(circle, me):
    rows = await _members_with_contrib(circle)
    mine = next((r for r in rows if r["id"] == me), None)
    return {
        "id": circle["id"],
        "name": circle["name"],
        "code": circle["code"],
        "goal": circle.get("goal", ""),
        "owner_id": circle["owner_id"],
        "members_count": len(rows),
        "leader_name": rows[0]["name"] if rows else "",
        "my_contribution": mine["contribution"] if mine else 0,
        "is_member": mine is not None,
        "is_owner": circle["owner_id"] == me,
    }


class CreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    goal: str = Field(default="", max_length=500)


class JoinBody(BaseModel):
    code: str = Field(min_length=1, max_length=12)


@router.post("")
@router.post("/")
async def create_circle(body: CreateBody, user: dict = Depends(get_current_user)):
    me = user["id"]
    now = now_iso()
    circle = {
        "id": uuid.uuid4().hex,
        "name": body.name.strip(),
        "goal": body.goal.strip(),
        "code": await _new_code(),
        "owner_id": me,
        "members": [{
            "id": me,
            "name": user.get("name", ""),
            "snapshot": user.get("xp", 0),
            "joined_at": now,
        }],
        "created_at": now,
    }
    await db.study_circles.insert_one(circle)
    return {
        "id": circle["id"],
        "name": circle["name"],
        "code": circle["code"],
        "goal": circle["goal"],
        "owner_id": circle["owner_id"],
        "members": await _members_with_contrib(circle),
    }


@router.get("")
@router.get("/")
async def list_circles(user: dict = Depends(get_current_user)):
    me = user["id"]
    circles = await db.study_circles.find({}).sort("created_at", -1).to_list(50)
    circles = [await _ensure_week(c) for c in circles]
    return {"items": [await _summary(c, me) for c in circles]}


@router.post("/join")
async def join_circle(body: JoinBody, user: dict = Depends(get_current_user)):
    me = user["id"]
    code = body.code.strip().upper()
    circle = await db.study_circles.find_one({"code": code})
    if not circle:
        raise HTTPException(status_code=404, detail="الدائرة غير موجودة")
    if any(m["id"] == me for m in circle.get("members", [])):
        return {"ok": True, "id": circle["id"]}
    member = {
        "id": me,
        "name": user.get("name", ""),
        "snapshot": user.get("xp", 0),
        "joined_at": now_iso(),
    }
    await db.study_circles.update_one(
        {"id": circle["id"]}, {"$push": {"members": member}})
    return {"ok": True, "id": circle["id"]}


@router.get("/{circle_id}")
async def get_circle(circle_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    circle = await db.study_circles.find_one({"id": circle_id})
    if not circle:
        raise HTTPException(status_code=404, detail="الدائرة غير موجودة")
    if not any(m["id"] == me for m in circle.get("members", [])):
        raise HTTPException(status_code=403, detail="لست عضواً في هذه الدائرة")
    circle = await _ensure_week(circle)
    members = await _members_with_contrib(circle)
    return {
        "id": circle["id"],
        "name": circle["name"],
        "code": circle["code"],
        "goal": circle.get("goal", ""),
        "owner_id": circle["owner_id"],
        "members": members,
        "weekly_goal": int(circle.get("weekly_goal") or 0),
        "week_total": sum(m["week_xp"] for m in members),
        "challenge": await _challenge_view(circle),
    }


# ---------------- محادثة الدائرة ----------------
class MessageBody(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


async def _member_circle(circle_id: str, me: str) -> dict:
    circle = await db.study_circles.find_one({"id": circle_id})
    if not circle:
        raise HTTPException(status_code=404, detail="الدائرة غير موجودة")
    if not any(m["id"] == me for m in circle.get("members", [])):
        raise HTTPException(status_code=403, detail="لست عضواً في هذه الدائرة")
    return circle


def _msg_item(m: dict, me: str) -> dict:
    return {"id": str(m["_id"]),
            "user": {"id": m.get("user_id"), "name": m.get("name", "")},
            "text": m.get("text", ""), "at": m.get("at"), "mine": m.get("user_id") == me}


@router.get("/{circle_id}/messages")
async def list_messages(circle_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    await _member_circle(circle_id, me)
    docs = await db.circle_messages.find({"circle_id": circle_id}).sort("at", -1).to_list(100)
    docs.reverse()
    return {"items": [_msg_item(m, me) for m in docs]}


@router.post("/{circle_id}/messages")
async def post_message(circle_id: str, body: MessageBody, user: dict = Depends(get_current_user)):
    me = user["id"]
    await _member_circle(circle_id, me)
    m = {"circle_id": circle_id, "user_id": me, "name": user.get("name", ""),
         "text": body.text.strip(), "at": now_iso()}
    res = await db.circle_messages.insert_one(m)
    m["_id"] = res.inserted_id
    return _msg_item(m, me)


# ---------------- الهدف الأسبوعي والتحدي ----------------
class WeeklyGoalBody(BaseModel):
    xp: int = Field(ge=0, le=100000)


class ChallengeBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    target_xp: int = Field(gt=0, le=1000000)
    days: int = Field(default=7, ge=1, le=90)


@router.put("/{circle_id}/weekly-goal")
async def set_weekly_goal(circle_id: str, body: WeeklyGoalBody, user: dict = Depends(get_current_user)):
    me = user["id"]
    circle = await _member_circle(circle_id, me)
    if circle["owner_id"] != me:
        raise HTTPException(status_code=403, detail="فقط مالك الدائرة يضبط الهدف الأسبوعي")
    await db.study_circles.update_one({"id": circle_id}, {"$set": {"weekly_goal": int(body.xp)}})
    return {"weekly_goal": int(body.xp)}


@router.post("/{circle_id}/challenge")
async def set_challenge(circle_id: str, body: ChallengeBody, user: dict = Depends(get_current_user)):
    me = user["id"]
    circle = await _member_circle(circle_id, me)
    if circle["owner_id"] != me:
        raise HTTPException(status_code=403, detail="فقط مالك الدائرة يطلق التحديات")
    xp_by_id = await _xp_map([m["id"] for m in circle.get("members", [])])
    ends = (datetime.now(timezone.utc) + timedelta(days=body.days)).isoformat()
    challenge = {"title": body.title.strip(), "target": int(body.target_xp),
                 "ends_at": ends,
                 "base": {m["id"]: xp_by_id.get(m["id"], 0) for m in circle.get("members", [])},
                 "done": False}
    await db.study_circles.update_one({"id": circle_id}, {"$set": {"challenge": challenge}})
    return {"challenge": {"title": challenge["title"], "target": challenge["target"],
                          "progress": 0, "ends_at": ends, "done": False}}


@router.post("/{circle_id}/leave")
async def leave_circle(circle_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    circle = await db.study_circles.find_one({"id": circle_id})
    if not circle:
        raise HTTPException(status_code=404, detail="الدائرة غير موجودة")
    members = [m for m in circle.get("members", []) if m["id"] != me]
    if len(members) == len(circle.get("members", [])):
        raise HTTPException(status_code=400, detail="لست عضواً في هذه الدائرة")
    if not members:
        await db.study_circles.delete_one({"id": circle_id})
        return {"ok": True}
    update = {"members": members}
    if circle["owner_id"] == me:
        # Hand ownership to the earliest-joined remaining member.
        update["owner_id"] = members[0]["id"]
    await db.study_circles.update_one({"id": circle_id}, {"$set": update})
    return {"ok": True}


@router.delete("/{circle_id}")
async def delete_circle(circle_id: str, user: dict = Depends(get_current_user)):
    me = user["id"]
    circle = await db.study_circles.find_one({"id": circle_id})
    if not circle:
        raise HTTPException(status_code=404, detail="الدائرة غير موجودة")
    if circle["owner_id"] != me:
        raise HTTPException(status_code=403, detail="فقط مالك الدائرة يمكنه حذفها")
    await db.study_circles.delete_one({"id": circle_id})
    return {"ok": True}
