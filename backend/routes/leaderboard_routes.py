from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from db import db, oid
from auth import get_current_user
from services import award_xp, create_notification, level_title, level_for_xp

router = APIRouter(prefix="/api")


def _period_start(period: str):
    now = datetime.now(timezone.utc)
    if period == "weekly":
        return now - timedelta(days=7)
    if period == "monthly":
        return now - timedelta(days=30)
    if period == "yearly":
        return now - timedelta(days=365)
    return None


async def _period_xp_map(period: str):
    start = _period_start(period)
    if not start:
        return None
    pipeline = [
        {"$match": {"created_at": {"$gte": start.isoformat()}, "amount": {"$gt": 0}}},
        {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
    ]
    rows = await db.xp_transactions.aggregate(pipeline).to_list(5000)
    return {r["_id"]: r["xp"] for r in rows}


@router.get("/leaderboard")
async def student_leaderboard(scope: str = "national", scope_id: str | None = None,
                              period: str = "all", limit: int = 50):
    query = {"role": "student"}
    if scope == "school" and scope_id:
        query["school_id"] = scope_id
    elif scope == "directorate" and scope_id:
        query["directorate_id"] = scope_id
    elif scope == "governorate" and scope_id:
        query["governorate_id"] = scope_id

    if period != "all":
        xp_map = await _period_xp_map(period)
        users = await db.users.find(query).to_list(5000)
        # only people who actually earned points in this period belong on a
        # period board — otherwise it is just the all-time board with zeros
        ranked = sorted(
            (u for u in users if xp_map.get(str(u["_id"]), 0) > 0),
            key=lambda u: xp_map[str(u["_id"])], reverse=True)[:limit]
        return [_row(u, i, xp_map[str(u["_id"])]) for i, u in enumerate(ranked)]

    docs = await db.users.find(query).sort("xp", -1).limit(limit).to_list(limit)
    return [_row(u, i, u.get("xp", 0)) for i, u in enumerate(docs)]


def _row(u, i, xp):
    return {"rank": i + 1, "id": str(u["_id"]), "name": u["name"],
            "school_name": u.get("school_name"), "governorate_name": u.get("governorate_name"),
            "xp": xp, "level": u.get("level", 1), "level_title": u.get("level_title", "قارئ مبتدئ"),
            "avatar_url": u.get("avatar_url"), "streak": u.get("streak", 0)}


async def _group_leaderboard(group_field, name_field, limit):
    pipeline = [
        {"$match": {"role": "student", group_field: {"$ne": None}}},
        {"$group": {"_id": f"${group_field}", "name": {"$first": f"${name_field}"},
                    "total_xp": {"$sum": "$xp"}, "students": {"$sum": 1}}},
        {"$sort": {"total_xp": -1}}, {"$limit": limit},
    ]
    rows = await db.users.aggregate(pipeline).to_list(limit)
    return [{"rank": i + 1, "id": r["_id"], "name": r["name"], "total_xp": r["total_xp"],
             "students": r["students"]} for i, r in enumerate(rows)]


@router.get("/leaderboard/schools")
async def schools_leaderboard(limit: int = 50):
    return await _group_leaderboard("school_id", "school_name", limit)


@router.get("/leaderboard/directorates")
async def directorates_leaderboard(limit: int = 50):
    return await _group_leaderboard("directorate_id", "directorate_name", limit)


@router.get("/leaderboard/governorates")
async def governorates_leaderboard(limit: int = 20):
    return await _group_leaderboard("governorate_id", "governorate_name", limit)


@router.get("/leaderboard/my-standing")
async def my_standing(user: dict = Depends(get_current_user)):
    """The signed-in user's own numbers for the leaderboard page — shown for
    every role, even though the public students board lists students only."""
    xp = user.get("xp", 0)
    stats = user.get("stats", {})
    out = {
        "xp": xp, "level": user.get("level", 1),
        "level_title": user.get("level_title", "قارئ مبتدئ"),
        "streak": user.get("streak", 0), "role": user.get("role"),
        "rank_all": await db.users.count_documents({"xp": {"$gt": xp}}) + 1,
        "total_all": await db.users.count_documents({}),
        "chess_rating": user.get("chess_rating", 1200),
        "chess_games": stats.get("chess_games", 0),
        "chess_wins": stats.get("chess_wins", 0),
        "pages_read": stats.get("pages_read", 0),
        "books_read": stats.get("books_read", 0),
    }
    if user.get("role") == "student":
        out["rank_students"] = await db.users.count_documents(
            {"role": "student", "xp": {"$gt": xp}}) + 1
        out["total_students"] = await db.users.count_documents({"role": "student"})
    if out["chess_games"] > 0:
        out["chess_rank"] = await db.users.count_documents(
            {"stats.chess_games": {"$gt": 0},
             "chess_rating": {"$gt": user.get("chess_rating", 1200)}}) + 1
    return out


# ---------------- Gamification ----------------
@router.get("/gamification/achievements")
async def all_achievements(user: dict = Depends(get_current_user)):
    docs = await db.achievements.find({}).to_list(200)
    owned = set(user.get("achievements", []))
    return [{"key": a["key"], "title": a["title"], "description": a.get("description", ""),
             "icon": a.get("icon", "Award"), "badge": a.get("badge"), "unlocked": a["key"] in owned}
            for a in docs]


@router.get("/gamification/me")
async def my_gamification(user: dict = Depends(get_current_user)):
    xp = user.get("xp", 0)
    level = user.get("level", 1)
    from services import level_threshold
    cur = level_threshold(level)
    nxt = level_threshold(level + 1)
    return {
        "xp": xp, "level": level, "level_title": user.get("level_title", "قارئ مبتدئ"),
        "level_progress": round((xp - cur) / max(1, nxt - cur) * 100),
        "xp_to_next": max(0, nxt - xp), "streak": user.get("streak", 0),
        "badges": user.get("badges", []), "achievements": user.get("achievements", []),
        "stats": user.get("stats", {}), "chess_rating": user.get("chess_rating", 1200),
    }


@router.post("/gamification/checkin")
async def daily_checkin(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    last = user.get("last_checkin")
    if last == today:
        return {"already": True, "streak": user.get("streak", 0)}
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    streak = user.get("streak", 0) + 1 if last == yesterday else 1
    max_streak = max(streak, user.get("stats", {}).get("max_streak", 0))
    await db.users.update_one({"_id": oid(user["id"])},
        {"$set": {"last_checkin": today, "streak": streak, "stats.max_streak": max_streak}})
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("daily_checkin", 5), "تسجيل حضور يومي")
    return {"already": False, "streak": streak}


@router.get("/gamification/history")
async def points_history(user: dict = Depends(get_current_user), page: int = 1, limit: int = 20):
    limit = max(1, min(limit, 100))
    query = {"user_id": user["id"]}
    total = await db.xp_transactions.count_documents(query)
    docs = await db.xp_transactions.find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    items = [{"amount": d.get("amount", 0), "reason": d.get("reason", ""),
              "ref": d.get("ref"), "balance": d.get("balance", 0),
              "created_at": d.get("created_at")} for d in docs]
    return {"items": items, "total": total, "page": page, "limit": limit}


# ---------------- Extra leaderboards ----------------
@router.get("/leaderboard/chess")
async def chess_top(limit: int = 20):
    limit = max(1, min(limit, 100))
    # only real players: accounts that never finished a game sit at the
    # default 1200 and made the board look frozen
    query = {"stats.chess_games": {"$gt": 0}}
    docs = await db.users.find(query).sort("chess_rating", -1).limit(limit).to_list(limit)
    items = [{"user_id": str(u["_id"]), "name": u["name"], "avatar": u.get("avatar_url"),
              "chess_rating": u.get("chess_rating", 1200),
              "level_title": u.get("level_title", "قارئ مبتدئ")} for u in docs]
    return {"items": items}


@router.get("/leaderboard/studio")
async def studio_top(limit: int = 20):
    limit = max(1, min(limit, 100))
    docs = await db.works.find({"status": "published"}).sort("likes", -1).limit(limit).to_list(limit)
    items = [{"id": str(w["_id"]), "title": w.get("title", ""), "author_name": w.get("author_name", ""),
              "likes": w.get("likes", 0), "rating_avg": w.get("rating_avg", 0),
              "rating_count": w.get("rating_count", 0), "views": w.get("views", 0),
              "cover_url": w.get("cover_url")} for w in docs]
    return {"items": items}


@router.get("/leaderboard/ventures")
async def ventures_top(limit: int = 20):
    limit = max(1, min(limit, 100))
    docs = await db.ventures.find({}).sort("votes_count", -1).limit(limit).to_list(limit)
    items = [{"id": str(v["_id"]), "title": v.get("title", ""), "owner_name": v.get("owner_name", ""),
              "votes": v.get("votes_count", 0), "members_count": 1 + len(v.get("members", [])),
              "status": v.get("status")} for v in docs]
    return {"items": items}


@router.get("/gamification/points-table")
async def points_table():
    """Public XP earn-table for the Points page (no perm needed)."""
    from seed import POINTS_CONFIG
    s = await db.settings.find_one({"key": "points_config"})
    return {"points": {**POINTS_CONFIG, **(s or {}).get("value", {})}}


@router.get("/activity/heatmap")
async def activity_heatmap(user: dict = Depends(get_current_user)):
    """Own xp_transactions aggregated by day for the last 120 days."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=119)
    start_iso = start.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    # NOTE: xp_transactions.created_at is stored as an ISO string, so group by
    # the date prefix (first 10 chars) rather than $dateToString.
    rows = await db.xp_transactions.aggregate([
        {"$match": {"user_id": user["id"], "created_at": {"$gte": start_iso}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]},
                    "count": {"$sum": 1}, "xp": {"$sum": "$amount"}}},
    ]).to_list(500)
    by_day = {r["_id"]: {"count": r["count"], "xp": r["xp"]} for r in rows if r.get("_id")}
    days = []
    for i in range(120):
        d = (start + timedelta(days=i)).date().isoformat()
        v = by_day.get(d, {"count": 0, "xp": 0})
        days.append({"date": d, "count": v["count"], "xp": v["xp"]})
    return {"days": days}
