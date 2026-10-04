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
from routes.ventures_routes import router as ventures_router
from routes.library_routes import router as library_router
from routes.engage_routes import router as engage_router
from routes.errors_routes import router as errors_router
from routes.goals_routes import router as goals_router
from routes.uploads_routes import router as uploads_router
from routes.dm_routes import router as dm_router
from routes.circles_routes import router as circles_router
from routes.qa_routes import router as qa_router
from routes.quizlive_routes import router as quizlive_router
from routes.portfolio_routes import router as portfolio_router
from routes.reports_routes import router as reports_router
from routes.cups_routes import router as cups_router
from routes.learning_routes import router as learning_router
from routes.growth_routes import router as growth_router
from routes.games_routes import router as games_router
from routes.stories_routes import router as stories_router
from routes.control_routes import site_router, admin_router as control_admin_router
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
          push_router, studio_router, badges_router, ventures_router, goals_router,
          uploads_router, library_router, engage_router, errors_router,
          dm_router, circles_router, qa_router, quizlive_router,
          portfolio_router, reports_router, cups_router,
          learning_router, growth_router, games_router, stories_router,
          site_router, control_admin_router):
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
            try:
                from routes.games_routes import maybe_send_streak_reminders
                await maybe_send_streak_reminders()
            except Exception:
                pass
    except Exception:
        pass
    return await call_next(request)


@app.middleware("http")
async def signing_middleware(request: Request, call_next):
    """HMAC request signing (see security_signing.py). Modes off|warn|enforce
    come from the api_signing settings doc; warn (default) never rejects, it
    only reports the outcome in the X-Ft-Sig response header. Requests with
    header X-Ft-V: "2" use the hardened v2 protocol (rotating keys, device
    binding, ECDSA device proof, proof-of-work on auth paths)."""
    path = request.url.path
    if (not path.startswith("/api")) or path == "/api/health" or request.method == "OPTIONS":
        return await call_next(request)
    try:
        from security_signing import get_signing_config, verify_request
        cfg = await get_signing_config()
        mode = cfg.get("mode", "warn")
    except Exception:
        return await call_next(request)
    if mode == "off":
        return await call_next(request)
    auth_token = None
    authz = request.headers.get("authorization") or ""
    if authz.lower().startswith("bearer "):
        auth_token = authz[7:].strip() or None
    if not auth_token:
        auth_token = request.cookies.get("access_token")
    ctype = (request.headers.get("content-type") or "").lower()
    if request.method in ("GET", "HEAD") or ctype.startswith("multipart/form-data"):
        body = b""
    else:
        try:
            body = await request.body()
        except Exception:
            body = b""
    if (request.headers.get("x-ft-v") or "") == "2":
        from security_signing import canonical_query, verify_request_v2
        try:
            ok, key_used, reason = await verify_request_v2(
                request.method, path, canonical_query(request.query_params),
                request.headers.get("x-ft-ts"), request.headers.get("x-ft-nonce"),
                request.headers.get("x-ft-dev"), request.headers.get("x-ft-sig"),
                request.headers.get("x-ft-esig"), body,
                request.headers.get("content-type") or "", auth_token,
                request.headers.get("x-ft-pow"))
        except Exception:
            ok, key_used, reason = (False, None, "error")
        if ok:
            response = await call_next(request)
            response.headers["X-Ft-Sig"] = key_used or "app2"
            return response
        if mode == "enforce":
            return JSONResponse(
                status_code=401,
                content={"detail": "طلب غير موقّع",
                         "code": f"SIG_{(reason or 'invalid').upper()}"})
        response = await call_next(request)
        response.headers["X-Ft-Sig"] = f"fail-{reason or 'invalid'}"
        return response
    ts = request.headers.get("x-ft-ts")
    nonce = request.headers.get("x-ft-nonce")
    sig = request.headers.get("x-ft-sig")
    query_signed = False
    if request.method == "GET" and not (ts and nonce and sig):
        q_ts = request.query_params.get("fts")
        q_nonce = request.query_params.get("fnonce")
        q_sig = request.query_params.get("fsig")
        if q_ts and q_nonce and q_sig:
            ts, nonce, sig = q_ts, q_nonce, q_sig
            query_signed = True
    try:
        ok, key_used, reason = await verify_request(
            request.method, path, ts, nonce, sig, body, auth_token,
            query_signed=query_signed)
    except Exception:
        ok, key_used, reason = (False, None, "error")
    if ok:
        response = await call_next(request)
        response.headers["X-Ft-Sig"] = key_used or "app"
        return response
    if mode == "enforce":
        return JSONResponse(
            status_code=401,
            content={"detail": "طلب غير موقّع",
                     "code": f"SIG_{(reason or 'invalid').upper()}"})
    response = await call_next(request)
    response.headers["X-Ft-Sig"] = f"fail-{reason or 'invalid'}"
    return response


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
    """Every unexpected server error is stored in full (traceback included) in
    error_reports so the admin sees the real failure; users only get a short
    friendly message. Logging must never break the error response itself."""
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    try:
        import traceback as _tb
        from db import db as _db, now_iso as _now
        uid = uname = uemail = None
        authz = request.headers.get("authorization") or ""
        if authz.lower().startswith("bearer "):
            try:
                payload = jwt.decode(authz[7:], get_secret(), algorithms=["HS256"])
                u = await _db.users.find_one({"_id": ObjectId(payload.get("sub", ""))}, {"name": 1, "email": 1})
                if u:
                    uid, uname, uemail = str(u["_id"]), u.get("name"), u.get("email")
            except Exception:
                pass
        await _db.error_reports.insert_one({
            "message": (str(exc) or exc.__class__.__name__)[:300],
            "detail": "".join(_tb.format_exception(type(exc), exc, exc.__traceback__))[:20000],
            "page": f"{request.method} {request.url.path}"[:300],
            "source": "server", "context": "fastapi",
            "user_id": uid, "user_name": uname, "user_email": uemail,
            "status": "open", "contacted_at": None, "created_at": _now(),
        })
    except Exception:
        pass
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
