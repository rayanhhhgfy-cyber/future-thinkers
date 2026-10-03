"""Directorate season cup: schools ranked by total member XP.

GET /api/cups/schools aggregates all users grouped by school_name
(empty schools skipped), sorted by total XP, top 50.
"""
from fastapi import APIRouter

from db import db

router = APIRouter(prefix="/api/cups")


@router.get("/schools")
async def schools_cup():
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
