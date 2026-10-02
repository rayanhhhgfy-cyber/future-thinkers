from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user
from services import award_xp, bump_stat, create_notification

router = APIRouter(prefix="/api/chess")

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
K = 32


def expected(a, b):
    return 1 / (1 + 10 ** ((b - a) / 400))


class ChallengeBody(BaseModel):
    opponent_id: str | None = None  # None => open challenge (quick match)


def _game_out(g):
    d = ser(g)
    return d


@router.post("/challenge")
async def create_challenge(body: ChallengeBody, user: dict = Depends(get_current_user)):
    if body.opponent_id:
        if body.opponent_id == user["id"]:
            raise HTTPException(status_code=400, detail="لا يمكنك تحدي نفسك")
        opp = await db.users.find_one({"_id": oid(body.opponent_id)})
        if not opp:
            raise HTTPException(status_code=404, detail="اللاعب غير موجود")
        doc = {"challenger_id": user["id"], "challenger_name": user["name"],
               "opponent_id": body.opponent_id, "opponent_name": opp["name"],
               "status": "pending", "open": False, "created_at": now_iso()}
        res = await db.chess_challenges.insert_one(doc)
        await create_notification(body.opponent_id, "chess", "تحدي شطرنج جديد ♟️",
                                  f"{user['name']} يتحداك في مباراة", "/clubs/chess")
        return {"id": str(res.inserted_id), "status": "pending"}
    # open challenge: try to match an existing open one from someone else
    open_ch = await db.chess_challenges.find_one({"status": "pending", "open": True, "challenger_id": {"$ne": user["id"]}})
    if open_ch:
        return await _start_game(open_ch, user)
    doc = {"challenger_id": user["id"], "challenger_name": user["name"],
           "opponent_id": None, "opponent_name": None, "status": "pending", "open": True, "created_at": now_iso()}
    res = await db.chess_challenges.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "waiting"}


async def _start_game(challenge, accepter):
    white = challenge["challenger_id"]
    black = accepter["id"]
    wu = await db.users.find_one({"_id": oid(white)})
    doc = {
        "white_id": white, "white_name": challenge["challenger_name"],
        "black_id": black, "black_name": accepter["name"],
        "white_rating": wu.get("chess_rating", 1200) if wu else 1200,
        "black_rating": accepter.get("chess_rating", 1200),
        "fen": START_FEN, "pgn": "", "moves": [], "turn": "w",
        "status": "active", "result": None, "winner_id": None,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    res = await db.chess_games.insert_one(doc)
    gid = str(res.inserted_id)
    await db.chess_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"status": "accepted", "game_id": gid}})
    await create_notification(white, "chess", "بدأت مباراة الشطرنج ♟️", f"ضد {accepter['name']}", f"/chess/{gid}")
    return {"game_id": gid, "status": "started"}


@router.get("/challenges")
async def my_challenges(user: dict = Depends(get_current_user)):
    incoming = await db.chess_challenges.find({"opponent_id": user["id"], "status": "pending"}).to_list(50)
    outgoing = await db.chess_challenges.find({"challenger_id": user["id"], "status": "pending"}).to_list(50)
    return {"incoming": sers(incoming), "outgoing": sers(outgoing)}


@router.post("/challenges/{cid}/accept")
async def accept_challenge(cid: str, user: dict = Depends(get_current_user)):
    ch = await db.chess_challenges.find_one({"_id": oid(cid)})
    if not ch or ch["status"] != "pending":
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    if ch.get("opponent_id") and ch["opponent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="هذا التحدي ليس لك")
    return await _start_game(ch, user)


@router.post("/challenges/{cid}/decline")
async def decline_challenge(cid: str, user: dict = Depends(get_current_user)):
    await db.chess_challenges.update_one({"_id": oid(cid)}, {"$set": {"status": "declined"}})
    return {"status": "declined"}


@router.get("/games")
async def my_games(user: dict = Depends(get_current_user)):
    docs = await db.chess_games.find({"$or": [{"white_id": user["id"]}, {"black_id": user["id"]}]}).sort("updated_at", -1).limit(30).to_list(30)
    return sers(docs)


@router.get("/games/{gid}")
async def get_game(gid: str, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g:
        raise HTTPException(status_code=404, detail="المباراة غير موجودة")
    d = _game_out(g)
    d["my_color"] = "w" if g["white_id"] == user["id"] else ("b" if g["black_id"] == user["id"] else None)
    return d


class MoveBody(BaseModel):
    fen: str
    san: str
    pgn: str = ""
    turn: str  # next turn after move: 'w' or 'b'


@router.post("/games/{gid}/move")
async def make_move(gid: str, body: MoveBody, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة غير نشطة")
    my_color = "w" if g["white_id"] == user["id"] else ("b" if g["black_id"] == user["id"] else None)
    if my_color is None:
        raise HTTPException(status_code=403, detail="لست لاعباً في هذه المباراة")
    if g["turn"] != my_color:
        raise HTTPException(status_code=400, detail="ليس دورك")
    await db.chess_games.update_one({"_id": g["_id"]}, {
        "$set": {"fen": body.fen, "pgn": body.pgn, "turn": body.turn, "updated_at": now_iso()},
        "$push": {"moves": {"san": body.san, "by": user["id"], "at": now_iso()}}})
    opp = g["black_id"] if my_color == "w" else g["white_id"]
    await create_notification(opp, "chess", "دورك في الشطرنج ♟️", "لعب خصمك نقلته", f"/chess/{gid}")
    try:
        from ws import hub
        await hub.broadcast_game(gid, {"kind": "move", "fen": body.fen, "san": body.san, "turn": body.turn})
    except Exception:
        pass
    return {"ok": True}


class ResultBody(BaseModel):
    result: str  # 'white' | 'black' | 'draw'


@router.post("/games/{gid}/result")
async def report_result(gid: str, body: ResultBody, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة منتهية أو غير موجودة")
    if user["id"] not in (g["white_id"], g["black_id"]):
        raise HTTPException(status_code=403, detail="لست لاعباً")
    await _finalize(g, body.result)
    return {"status": "finished", "result": body.result}


@router.post("/games/{gid}/resign")
async def resign(gid: str, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة منتهية")
    if user["id"] not in (g["white_id"], g["black_id"]):
        raise HTTPException(status_code=403, detail="لست لاعباً")
    result = "black" if g["white_id"] == user["id"] else "white"
    await _finalize(g, result, resigned_by=user["id"])
    return {"status": "finished", "result": result}


async def _finalize(g, result, resigned_by=None):
    wr, br = g["white_rating"], g["black_rating"]
    sw = 1 if result == "white" else (0 if result == "black" else 0.5)
    new_wr = round(wr + K * (sw - expected(wr, br)))
    new_br = round(br + K * ((1 - sw) - expected(br, wr)))
    winner_id = g["white_id"] if result == "white" else (g["black_id"] if result == "black" else None)
    await db.chess_games.update_one({"_id": g["_id"]}, {"$set": {
        "status": "finished", "result": result, "winner_id": winner_id,
        "white_rating_after": new_wr, "black_rating_after": new_br,
        "resigned_by": resigned_by, "updated_at": now_iso()}})
    await db.users.update_one({"_id": oid(g["white_id"])}, {"$set": {"chess_rating": new_wr}})
    await db.users.update_one({"_id": oid(g["black_id"])}, {"$set": {"chess_rating": new_br}})
    s = await db.settings.find_one({"key": "points_config"})
    pc = (s or {}).get("value", {})
    for pid in (g["white_id"], g["black_id"]):
        await bump_stat(pid, "chess_games", 1)
        await award_xp(pid, pc.get("play_chess", 10), "لعب مباراة شطرنج", str(g["_id"]))
    if winner_id:
        await bump_stat(winner_id, "chess_wins", 1)
        await award_xp(winner_id, pc.get("win_chess", 30), "الفوز بمباراة شطرنج", str(g["_id"]))
        await create_notification(winner_id, "chess", "فزت بالمباراة! 🏆", "+تقييم ونقاط خبرة")
    try:
        from ws import hub
        await hub.broadcast_game(str(g["_id"]), {"kind": "result", "result": result, "winner_id": winner_id})
    except Exception:
        pass
    if g.get("tournament_id"):
        try:
            await _advance_tournament(g["tournament_id"], g, winner_id)
        except Exception:
            pass


async def _advance_tournament(tid: str, game: dict, winner_id):
    """Advance a finished tournament match; crown the champion at the end."""
    t = await db.chess_tournaments.find_one({"_id": oid(tid)})
    if not t or t.get("status") != "running":
        return
    matches = t.get("matches", [])
    for m in matches:
        if m.get("game_id") == str(game["_id"]):
            m["winner_id"] = winner_id
            m["status"] = "done"
    cur_round = max((m["round"] for m in matches), default=1)
    round_matches = [m for m in matches if m["round"] == cur_round]
    if not all(m["status"] == "done" for m in round_matches):
        await db.chess_tournaments.update_one({"_id": oid(tid)}, {"$set": {"matches": matches}})
        return
    winners = []
    for m in round_matches:
        if m.get("winner_id"):
            u = await db.users.find_one({"_id": oid(m["winner_id"])}, {"name": 1})
            winners.append({"user_id": m["winner_id"], "name": (u or {}).get("name", m.get("winner_name", ""))})
    if len(round_matches) == 1 and len(winners) == 1:
        champ = winners[0]
        await db.chess_tournaments.update_one({"_id": oid(tid)},
            {"$set": {"matches": matches, "status": "completed",
                      "champion_id": champ["user_id"], "champion_name": champ["name"]}})
        await award_xp(champ["user_id"], 150, "بطل بطولة الشطرنج 🏆", tid)
        await create_notification(champ["user_id"], "chess", "بطل البطولة! 🏆",
                                  f"فزت ببطولة {t['name']} · +150 خبرة", "/clubs/chess")
        return
    rnd = cur_round + 1
    midx = len(matches)
    for i in range(0, len(winners), 2):
        a = winners[i]
        b = winners[i + 1] if i + 1 < len(winners) else None
        matches.append({
            "idx": midx, "round": rnd,
            "a_id": a["user_id"], "a_name": a["name"],
            "b_id": b["user_id"] if b else None, "b_name": b["name"] if b else None,
            "winner_id": a["user_id"] if not b else None,
            "game_id": None, "status": "pending" if b else "done",
        })
        midx += 1
    await db.chess_tournaments.update_one({"_id": oid(tid)}, {"$set": {"matches": matches}})


class TournamentBody(BaseModel):
    name: str
    max_players: int = 8


@router.get("/tournaments")
async def list_tournaments(user: dict = Depends(get_current_user)):
    docs = await db.chess_tournaments.find({}).sort("created_at", -1).limit(20).to_list(20)
    out = []
    for d in docs:
        x = ser(d)
        x["joined"] = any(p["user_id"] == user["id"] for p in x.get("players", []))
        out.append(x)
    return out


@router.post("/tournaments")
async def create_tournament(body: TournamentBody, user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if len(name) < 3:
        raise HTTPException(status_code=400, detail="اسم البطولة قصير")
    doc = {"name": name, "max_players": max(4, min(32, body.max_players)),
           "creator_id": user["id"], "creator_name": user["name"],
           "players": [], "matches": [], "status": "registration",
           "champion_id": None, "created_at": now_iso()}
    res = await db.chess_tournaments.insert_one(doc)
    return {"id": str(res.inserted_id)}


@router.post("/tournaments/{tid}/join")
async def join_tournament(tid: str, user: dict = Depends(get_current_user)):
    t = await db.chess_tournaments.find_one({"_id": oid(tid)})
    if not t:
        raise HTTPException(status_code=404, detail="البطولة غير موجودة")
    if t["status"] != "registration":
        raise HTTPException(status_code=400, detail="بدأت البطولة بالفعل")
    if any(p["user_id"] == user["id"] for p in t.get("players", [])):
        return {"ok": True, "already": True}
    if len(t.get("players", [])) >= t["max_players"]:
        raise HTTPException(status_code=400, detail="اكتمل العدد")
    await db.chess_tournaments.update_one({"_id": oid(tid)},
        {"$push": {"players": {"user_id": user["id"], "name": user["name"]}}})
    return {"ok": True}


@router.post("/tournaments/{tid}/start")
async def start_tournament(tid: str, user: dict = Depends(get_current_user)):
    t = await db.chess_tournaments.find_one({"_id": oid(tid)})
    if not t:
        raise HTTPException(status_code=404, detail="البطولة غير موجودة")
    if t["status"] != "registration":
        raise HTTPException(status_code=400, detail="بدأت مسبقاً")
    players = t.get("players", [])
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="يحتاج لاعبين على الأقل للبدء")
    matches = []
    for i in range(0, len(players), 2):
        a = players[i]
        b = players[i + 1] if i + 1 < len(players) else None
        matches.append({
            "idx": len(matches), "round": 1,
            "a_id": a["user_id"], "a_name": a["name"],
            "b_id": b["user_id"] if b else None, "b_name": b["name"] if b else None,
            "winner_id": a["user_id"] if not b else None,
            "game_id": None, "status": "pending" if b else "done",
        })
    await db.chess_tournaments.update_one({"_id": oid(tid)},
        {"$set": {"matches": matches, "status": "running", "started_at": now_iso()}})
    for p in players:
        await create_notification(p["user_id"], "chess", "بدأت البطولة! ⚔️",
                                  f"{t['name']} · العب مباراتك الآن", "/clubs/chess")
    return {"ok": True, "matches": len(matches)}


@router.post("/tournaments/{tid}/matches/{idx}/play")
async def play_match(tid: str, idx: int, user: dict = Depends(get_current_user)):
    t = await db.chess_tournaments.find_one({"_id": oid(tid)})
    if not t or t.get("status") != "running":
        raise HTTPException(status_code=404, detail="المباراة غير متاحة")
    m = next((x for x in t.get("matches", []) if x.get("idx") == idx), None)
    if not m or m["status"] != "pending":
        raise HTTPException(status_code=400, detail="المباراة غير جاهزة")
    if user["id"] not in (m["a_id"], m["b_id"]):
        raise HTTPException(status_code=403, detail="لست طرفاً في هذه المباراة")
    if m.get("game_id"):
        return {"game_id": m["game_id"]}
    wu = await db.users.find_one({"_id": oid(m["a_id"])})
    bu = await db.users.find_one({"_id": oid(m["b_id"])})
    doc = {
        "white_id": m["a_id"], "white_name": m["a_name"],
        "black_id": m["b_id"], "black_name": m["b_name"],
        "white_rating": (wu or {}).get("chess_rating", 1200),
        "black_rating": (bu or {}).get("chess_rating", 1200),
        "fen": START_FEN, "pgn": "", "moves": [], "turn": "w",
        "status": "active", "result": None, "winner_id": None,
        "tournament_id": tid, "created_at": now_iso(), "updated_at": now_iso(),
    }
    res = await db.chess_games.insert_one(doc)
    gid = str(res.inserted_id)
    matches = t["matches"]
    for x in matches:
        if x.get("idx") == idx:
            x["game_id"] = gid
            x["status"] = "playing"
    await db.chess_tournaments.update_one({"_id": oid(tid)}, {"$set": {"matches": matches}})
    opp = m["b_id"] if user["id"] == m["a_id"] else m["a_id"]
    await create_notification(opp, "chess", "مباراة بطولة بانتظارك ⚔️",
                              f"{t['name']} · ادخل للعب", f"/chess/{gid}")
    return {"game_id": gid}


@router.get("/leaderboard")
async def chess_leaderboard(limit: int = 50):
    docs = await db.users.find({"chess_rating": {"$exists": True}}).sort("chess_rating", -1).limit(limit).to_list(limit)
    return [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
             "governorate_name": u.get("governorate_name"), "rating": u.get("chess_rating", 1200),
             "wins": u.get("stats", {}).get("chess_wins", 0), "games": u.get("stats", {}).get("chess_games", 0)}
            for u in docs]


@router.get("/players")
async def searchable_players(q: str = "", limit: int = 20, user: dict = Depends(get_current_user)):
    query = {"_id": {"$ne": oid(user["id"])}, "role": "student"}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.users.find(query).limit(limit).to_list(limit)
    return [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
             "rating": u.get("chess_rating", 1200)} for u in docs]
