"""Study circles: small groups that gain XP together toward a shared goal.

Each member stores a snapshot of their XP at join time; their live
contribution is max(0, current_xp - snapshot). Snapshots are embedded in
the circle's members list.
"""
import secrets
import string
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, oid, now_iso
from auth import get_current_user

router = APIRouter(prefix="/api/circles")

_CODE_ALPHABET = string.ascii_uppercase + string.digits


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
    } for m in circle.get("members", [])]
    rows.sort(key=lambda r: -r["contribution"])
    return rows


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
    return {
        "id": circle["id"],
        "name": circle["name"],
        "code": circle["code"],
        "goal": circle.get("goal", ""),
        "owner_id": circle["owner_id"],
        "members": await _members_with_contrib(circle),
    }


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
