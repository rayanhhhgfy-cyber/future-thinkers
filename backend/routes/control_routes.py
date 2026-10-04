"""Admin control room: section toggles, maintenance mode, games config,
season manager, and the custom missions engine."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timezone

from db import db, now_iso, ser
from auth import require_permission

site_router = APIRouter(prefix="/api/site")
admin_router = APIRouter(prefix="/api/admin/controls")

SECTION_KEYS = ["games", "stories", "swap", "community", "ventures", "clubs", "mini_books", "live_sessions"]

DEFAULT_TOGGLES = {k: True for k in SECTION_KEYS}
DEFAULT_GAMES_CONFIG = {
    "math_full_cap": 30, "typing_full_cap": 30, "wordle_lose_xp": 3,
    "challenge_win_xp": 15, "challenge_lose_xp": 5, "challenge_draw_xp": 10,
    "story_finish_xp": 15, "mission_xp": 12, "chest_xp": 75,
}


async def get_site_config() -> dict:
    doc = await db.settings.find_one({"_id": "site_config"}) or {}
    toggles = {**DEFAULT_TOGGLES, **(doc.get("toggles") or {})}
    maintenance = doc.get("maintenance") or {"on": False, "message": ""}
    return {"toggles": toggles, "maintenance": maintenance}


async def get_games_config() -> dict:
    doc = await db.settings.find_one({"_id": "games_config"}) or {}
    cfg = {**DEFAULT_GAMES_CONFIG}
    for k in cfg:
        if isinstance(doc.get(k), int):
            cfg[k] = doc[k]
    return cfg


async def section_open(key: str) -> bool:
    cfg = await get_site_config()
    return bool(cfg["toggles"].get(key, True))


@site_router.get("/config")
async def site_config_public():
    from fastapi.responses import JSONResponse
    return JSONResponse(content=await get_site_config(), headers={"Cache-Control": "no-store"})


class ConfigBody(BaseModel):
    toggles: dict | None = None
    maintenance: dict | None = None


@admin_router.get("/config")
async def controls_config(user: dict = Depends(require_permission("analytics.view"))):
    return await get_site_config()


@admin_router.put("/config")
async def controls_config_put(body: ConfigBody, user: dict = Depends(require_permission("cms.manage"))):
    cur = await get_site_config()
    toggles = cur["toggles"]
    if body.toggles:
        for k, v in body.toggles.items():
            if k in SECTION_KEYS:
                toggles[k] = bool(v)
    maintenance = cur["maintenance"]
    if body.maintenance is not None:
        maintenance = {"on": bool(body.maintenance.get("on")),
                       "message": str(body.maintenance.get("message", ""))[:300]}
    await db.settings.update_one({"_id": "site_config"},
                                 {"$set": {"toggles": toggles, "maintenance": maintenance}},
                                 upsert=True)
    return {"toggles": toggles, "maintenance": maintenance}


class GamesConfigBody(BaseModel):
    math_full_cap: int | None = Field(default=None, ge=0, le=300)
    typing_full_cap: int | None = Field(default=None, ge=0, le=300)
    wordle_lose_xp: int | None = Field(default=None, ge=0, le=100)
    challenge_win_xp: int | None = Field(default=None, ge=0, le=200)
    challenge_lose_xp: int | None = Field(default=None, ge=0, le=200)
    challenge_draw_xp: int | None = Field(default=None, ge=0, le=200)
    story_finish_xp: int | None = Field(default=None, ge=0, le=200)
    mission_xp: int | None = Field(default=None, ge=0, le=200)
    chest_xp: int | None = Field(default=None, ge=0, le=1000)


@admin_router.get("/games-config")
async def games_config_get(user: dict = Depends(require_permission("analytics.view"))):
    return await get_games_config()


@admin_router.put("/games-config")
async def games_config_put(body: GamesConfigBody, user: dict = Depends(require_permission("cms.manage"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.settings.update_one({"_id": "games_config"}, {"$set": upd}, upsert=True)
    return await get_games_config()


# ---------------- season manager ----------------
async def _season():
    doc = await db.settings.find_one({"_id": "season"}) or {}
    return doc.get("current")


async def _cup_rows(since: str | None):
    if since:
        rows = await db.xp_transactions.aggregate([
            {"$match": {"created_at": {"$gte": since}, "amount": {"$gt": 0}}},
            {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
            {"$lookup": {"from": "users", "localField": "_id", "foreignField": "_id", "as": "u"}},
            {"$unwind": "$u"},
            {"$match": {"u.school_name": {"$nin": [None, ""]}}},
            {"$group": {"_id": "$u.school_name", "xp": {"$sum": "$xp"}, "members": {"$sum": 1}}},
            {"$sort": {"xp": -1}}, {"$limit": 50},
        ]).to_list(50)
        return [{"school": r["_id"], "xp": int(r.get("xp", 0)), "members": int(r.get("members", 0))} for r in rows]
    rows = await db.users.aggregate([
        {"$match": {"school_name": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$school_name", "xp": {"$sum": {"$ifNull": ["$xp", 0]}}, "members": {"$sum": 1}}},
        {"$sort": {"xp": -1}}, {"$limit": 50},
    ]).to_list(50)
    return [{"school": r["_id"], "xp": int(r.get("xp", 0)), "members": int(r.get("members", 0))} for r in rows]


@admin_router.get("/season")
async def season_get(user: dict = Depends(require_permission("analytics.view"))):
    cur = await _season()
    archives = await db.season_archives.find({}).sort("ended_at", -1).to_list(20)
    standings = await _cup_rows(cur.get("started_at") if cur else None)
    return {"current": cur, "standings": standings, "archives": [ser(a) for a in archives]}


class SeasonStartBody(BaseModel):
    name: str = Field(min_length=2, max_length=60)


@admin_router.post("/season/start")
async def season_start(body: SeasonStartBody, user: dict = Depends(require_permission("cms.manage"))):
    cur = await _season()
    if cur:
        rows = await _cup_rows(cur.get("started_at"))
        await db.season_archives.insert_one({
            "name": cur.get("name", ""), "started_at": cur.get("started_at"),
            "ended_at": now_iso(), "standings": rows,
        })
    await db.settings.update_one(
        {"_id": "season"},
        {"$set": {"current": {"name": body.name.strip(),
                              "started_at": datetime.now(timezone.utc).isoformat()}}},
        upsert=True)
    return {"ok": True, "archived_previous": bool(cur)}


@admin_router.post("/season/end")
async def season_end(user: dict = Depends(require_permission("cms.manage"))):
    cur = await _season()
    if not cur:
        raise HTTPException(status_code=400, detail="لا يوجد موسم جارٍ")
    rows = await _cup_rows(cur.get("started_at"))
    await db.season_archives.insert_one({
        "name": cur.get("name", ""), "started_at": cur.get("started_at"),
        "ended_at": now_iso(), "standings": rows,
    })
    await db.settings.update_one({"_id": "season"}, {"$set": {"current": None}}, upsert=True)
    return {"ok": True, "winner": rows[0]["school"] if rows else None}


# ---------------- custom missions engine ----------------
METRICS = ["wordle_wins", "math_points", "typing_wpm", "pages", "play_days", "xp_earned", "books"]


class MissionDefBody(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    desc: str = Field(default="", max_length=200)
    icon: str = "Target"
    metric: str
    target: int = Field(ge=1, le=100000)
    xp: int = Field(default=12, ge=0, le=500)
    active: bool = True


def _check_metric(m: str):
    if m not in METRICS:
        raise HTTPException(status_code=400, detail=f"مقياس غير معروف · اختر من: {', '.join(METRICS)}")


@admin_router.get("/missions")
async def mission_defs_list(user: dict = Depends(require_permission("analytics.view"))):
    docs = await db.mission_defs.find({}).sort("created_at", 1).to_list(100)
    return {"defs": [ser(d) for d in docs], "metrics": METRICS}


@admin_router.post("/missions")
async def mission_def_create(body: MissionDefBody, user: dict = Depends(require_permission("cms.manage"))):
    _check_metric(body.metric)
    doc = body.model_dump()
    doc["key"] = f"c{ObjectId()}"[:13]
    doc["created_at"] = now_iso()
    res = await db.mission_defs.insert_one(doc)
    return {"id": str(res.inserted_id), "key": doc["key"]}


@admin_router.put("/missions/{mid}")
async def mission_def_update(mid: str, body: MissionDefBody, user: dict = Depends(require_permission("cms.manage"))):
    _check_metric(body.metric)
    if not ObjectId.is_valid(mid):
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    r = await db.mission_defs.update_one({"_id": ObjectId(mid)}, {"$set": body.model_dump()})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    return {"ok": True}


@admin_router.delete("/missions/{mid}")
async def mission_def_delete(mid: str, user: dict = Depends(require_permission("cms.manage"))):
    if not ObjectId.is_valid(mid):
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    r = await db.mission_defs.delete_one({"_id": ObjectId(mid)})
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    return {"ok": True}
