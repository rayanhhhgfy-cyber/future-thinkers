"""Public student portfolio: a shareable, public-safe profile page.

GET /api/portfolio/{uid} exposes only non-sensitive fields: identity,
gamification stats, certificates, badge names and venture projects.
"""
from fastapi import APIRouter, HTTPException

from db import db, oid

router = APIRouter(prefix="/api/portfolio")


async def _focus_minutes(user_id: str) -> int:
    rows = await db.focus_sessions.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "m": {"$sum": "$minutes"}}},
    ]).to_list(1)
    return int(rows[0]["m"]) if rows else 0


@router.get("/{uid}")
async def get_portfolio(uid: str):
    o = oid(uid)
    user = await db.users.find_one({"_id": o}) if o else None
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    stats = user.get("stats") or {}

    certs = await db.certificates.find({"user_id": uid}).sort("created_at", -1).limit(50).to_list(50)
    certificates = [{
        "title": c.get("title_line") or c.get("title") or "",
        "subtitle": c.get("subtitle", ""),
        "created_at": c.get("created_at"),
        "code": c.get("code"),
    } for c in certs]

    badge_names: list[str] = []
    seen: set[str] = set()
    ub = await db.user_badges.find({"user_id": uid}).to_list(200)
    if ub:
        defs = await db.skill_badges.find(
            {"key": {"$in": [d["badge_key"] for d in ub]}}).to_list(200)
        name_by_key = {d["key"]: d.get("name", d["key"]) for d in defs}
        for d in ub:
            name = name_by_key.get(d["badge_key"], d["badge_key"])
            if name not in seen:
                seen.add(name)
                badge_names.append(name)
    raw_badges = user.get("badges") or []
    if raw_badges:
        ach = await db.achievements.find({"key": {"$in": raw_badges}}).to_list(200)
        title_by_key = {a["key"]: a.get("title", a["key"]) for a in ach}
        for key in raw_badges:
            name = title_by_key.get(key, key)
            if name not in seen:
                seen.add(name)
                badge_names.append(name)

    ventures = await db.ventures.find({
        "$or": [{"owner_id": uid}, {"members.id": uid}, {"members": uid}],
    }).sort("created_at", -1).limit(50).to_list(50)
    projects = [{"id": str(v["_id"]), "title": v.get("title", ""),
                 "status": v.get("status", "")} for v in ventures]

    return {
        "user": {
            "id": uid,
            "name": user.get("name", ""),
            "school": user.get("school_name") or "",
            "level": user.get("level", 1),
            "xp_total": user.get("xp", 0),
        },
        "stats": {
            "books_finished": int(stats.get("books_read", 0)),
            "chess_rating": user.get("chess_rating", 1200),
            "chess_games": int(stats.get("chess_games", 0)),
            "focus_minutes": await _focus_minutes(uid),
        },
        "certificates": certificates,
        "badges": badge_names,
        "projects": projects,
    }
