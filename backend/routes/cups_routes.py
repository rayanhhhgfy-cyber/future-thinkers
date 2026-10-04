"""Directorate season cup: schools ranked by total member XP.

GET /api/cups/schools aggregates all users grouped by school_name
(empty schools skipped), sorted by total XP, top 50.
"""
from fastapi import APIRouter

from db import db

router = APIRouter(prefix="/api/cups")


@router.get("/schools")
async def schools_cup():
    season_doc = await db.settings.find_one({"_id": "season"}) or {}
    cur = season_doc.get("current")
    if cur and cur.get("started_at"):
        since = cur["started_at"]
        rows = await db.xp_transactions.aggregate([
            {"$match": {"created_at": {"$gte": since}, "amount": {"$gt": 0}}},
            {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
            {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "u"}},
            {"$unwind": "$u"},
            {"$match": {"u.school_name": {"$nin": [None, ""]}}},
            {"$group": {"_id": "$u.school_name",
                        "xp": {"$sum": "$xp"},
                        "members": {"$sum": 1},
                        "books_finished": {"$sum": 0}}},
            {"$sort": {"xp": -1}},
            {"$limit": 50},
        ]).to_list(50)
        return {"items": [{
            "school": r["_id"],
            "xp": int(r.get("xp", 0)),
            "members": int(r.get("members", 0)),
            "books_finished": int(r.get("books_finished", 0)),
        } for r in rows], "season": {"name": cur.get("name"), "started_at": since}}
    rows = await db.users.aggregate([
        {"$match": {"school_name": {"$nin": [None, ""]}}},
        {"$group": {
            "_id": "$school_name",
            "xp": {"$sum": {"$ifNull": ["$xp", 0]}},
            "members": {"$sum": 1},
            "books_finished": {"$sum": {"$ifNull": ["$stats.books_read", 0]}},
        }},
        {"$sort": {"xp": -1}},
        {"$limit": 50},
    ]).to_list(50)
    return {"items": [{
        "school": r["_id"],
        "xp": int(r.get("xp", 0)),
        "members": int(r.get("members", 0)),
        "books_finished": int(r.get("books_finished", 0)),
    } for r in rows]}
