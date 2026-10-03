"""Teacher school report: per-school student activity summary.

GET /api/reports/my-school returns the students of the caller's school
(school_name on the user doc), sorted by XP. Admins/super admins without
their own school may pass ?school=<name>.
"""
from fastapi import APIRouter, Depends

from auth import require_role
from db import db

router = APIRouter(prefix="/api/reports")

MAX_STUDENTS = 300


@router.get("/my-school")
async def my_school_report(school: str | None = None,
                           user: dict = Depends(require_role("teacher", "admin", "super_admin"))):
    school_name = user.get("school_name") or None
    if not school_name and user.get("role") in ("admin", "super_admin"):
        school_name = school or None
    if not school_name:
        return {"school": None, "students": [],
                "totals": {"students": 0, "xp": 0, "books": 0}}

    students = await db.users.find(
        {"school_name": school_name, "role": "student"}
    ).sort("xp", -1).limit(MAX_STUDENTS).to_list(MAX_STUDENTS)
    ids = [str(s["_id"]) for s in students]

    focus_map: dict[str, int] = {}
    last_map: dict[str, str] = {}
    if ids:
        async for row in db.focus_sessions.aggregate([
                {"$match": {"user_id": {"$in": ids}}},
                {"$group": {"_id": "$user_id", "m": {"$sum": "$minutes"}}}]):
            focus_map[row["_id"]] = int(row["m"])
        async for row in db.xp_transactions.aggregate([
                {"$match": {"user_id": {"$in": ids}}},
                {"$group": {"_id": "$user_id", "last": {"$max": "$created_at"}}}]):
            last_map[row["_id"]] = row["last"]

    out = []
    total_xp = 0
    total_books = 0
    for s in students:
        uid = str(s["_id"])
        stats = s.get("stats") or {}
        books = int(stats.get("books_read", 0))
        total_xp += s.get("xp", 0)
        total_books += books
        out.append({
            "id": uid,
            "name": s.get("name", ""),
            "xp_total": s.get("xp", 0),
            "books_finished": books,
            "chess_games": int(stats.get("chess_games", 0)),
            "focus_minutes": focus_map.get(uid, 0),
            "last_active": last_map.get(uid),
        })
    return {
        "school": school_name,
        "students": out,
        "totals": {"students": len(out), "xp": total_xp, "books": total_books},
    }
