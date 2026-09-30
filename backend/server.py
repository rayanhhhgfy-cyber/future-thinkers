from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from starlette.middleware.cors import CORSMiddleware
import time

from db import client, init_db, get_db
from seed import seed_all

from routes.auth_routes import router as auth_router
from routes.geo_routes import router as geo_router
from routes.books_routes import router as books_router
from routes.files_routes import router as files_router
from routes.community_routes import router as community_router
from routes.chess_routes import router as chess_router
from routes.events_routes import router as events_router
from routes.leaderboard_routes import router as leaderboard_router
from routes.social_routes import router as social_router
from routes.content_routes import router as content_router
from routes.admin_routes import router as admin_router
from routes.coding_routes import router as coding_router
from routes.showcase_routes import router as showcase_router
from routes.cert_routes import router as cert_router
from routes.push_routes import router as push_router
from routes.studio_routes import router as studio_router
from routes.badges_routes import router as badges_router
from routes.widgets_routes import router as widgets_router
from ws import hub
import jwt
from bson import ObjectId
from auth import get_secret

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("future-thinkers")

app = FastAPI(title="منصة مفكري المستقبل API", version="1.0.0")

for r in (auth_router, geo_router, books_router, files_router, community_router,
          chess_router, events_router, leaderboard_router, social_router,
          content_router, admin_router, coding_router, showcase_router, cert_router,
          push_router, studio_router, badges_router, widgets_router):
    app.include_router(r)


@app.get("/api/cron/dispatch-scheduled")
async def cron_dispatch_scheduled(request: Request):
    """Vercel Cron (every 5 min) or external cron hits this to flush due campaigns."""
    secret = os.environ.get("CRON_SECRET", "")
    is_vercel_cron = request.headers.get("x-vercel-cron") == "1"
    if not is_vercel_cron and (not secret or request.query_params.get("secret") != secret):
        raise HTTPException(403, "forbidden")
    from services import dispatch_due_campaigns
    n = await dispatch_due_campaigns()
    return {"ok": True, "dispatched": n}


_last_opportunistic_dispatch = 0.0


@app.middleware("http")
async def opportunistic_dispatch_middleware(request: Request, call_next):
    """Safety net: if cron misses, any API traffic flushes due campaigns (throttled)."""
    global _last_opportunistic_dispatch
    try:
        now = time.time()
        if request.url.path.startswith("/api/") and now - _last_opportunistic_dispatch > 120:
            _last_opportunistic_dispatch = now
            from services import dispatch_due_campaigns
            await dispatch_due_campaigns()
    except Exception:
        pass
    return await call_next(request)


async def _ws_user(websocket, token):
    try:
        payload = jwt.decode(token, get_secret(), algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None


@app.websocket("/api/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    await websocket.accept()
    uid = await _ws_user(websocket, websocket.query_params.get("token"))
    if not uid:
        await websocket.close(code=1008)
        return
    await hub.join(hub.user_conns, uid, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(hub.user_conns, uid, websocket)


@app.websocket("/api/ws/chess/{game_id}")
async def ws_chess(websocket: WebSocket, game_id: str):
    await websocket.accept()
    uid = await _ws_user(websocket, websocket.query_params.get("token"))
    if not uid:
        await websocket.close(code=1008)
        return
    await hub.join(hub.game_conns, game_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(hub.game_conns, game_id, websocket)


@app.get("/api/")
async def root():
    return {"message": "Future Thinkers Platform API", "status": "ok"}


@app.get("/api/health")
async def health():
    """Liveness + DB reachability. Returns db:'up' only when MongoDB answers a ping."""
    try:
        await asyncio.wait_for(get_db().client.admin.command("ping"), timeout=8)
        return {"status": "healthy", "db": "up"}
    except Exception as e:
        logger.warning(f"DB health check failed: {type(e).__name__}: {e}")
        return {"status": "degraded", "db": "down"}


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً"})


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        init_db()
        await seed_all()
        logger.info("Seed complete")
    except Exception:
        # A DB/seed failure at startup must never take the whole API down:
        # request handlers (re)initialize the DB lazily via get_db(), and the
        # global error handler reports the real problem per request.
        logger.exception("Startup DB init/seed failed; continuing without it")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
