"""Live quiz rooms (polling-based Kahoot-style battles).

A host creates a room with questions, players join with a 6-char code,
the host starts the run (20s per question), correct answers score
600..1000 points depending on speed. Clients poll GET /rooms/{code}.
The correct answer index is only ever exposed to the host.
"""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user
from db import db, now_iso

router = APIRouter(prefix="/api/quiz-live")

QUESTION_SECONDS = 20
ANSWER_GRACE_SECONDS = 25
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class QuizQuestion(BaseModel):
    q: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct: int


class CreateRoomBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    questions: list[QuizQuestion] = Field(min_length=1, max_length=50)


class AnswerBody(BaseModel):
    index: int


async def _new_code() -> str:
    for _ in range(20):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not await db.quiz_rooms.find_one({"code": code}):
            return code
    raise HTTPException(status_code=500, detail="تعذر إنشاء رمز الغرفة")


async def _get_room(code: str) -> dict:
    room = await db.quiz_rooms.find_one({"code": code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="الغرفة غير موجودة")
    return room


def _started_at(room: dict):
    raw = room.get("q_started_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except Exception:
        return None


def _room_view(room: dict, user: dict) -> dict:
    uid = user["id"]
    is_host = room["host_id"] == uid
    players = sorted(room.get("players", []), key=lambda p: -p.get("score", 0))
    view = {
        "id": str(room["_id"]),
        "title": room["title"],
        "state": room["state"],
        "host_id": room["host_id"],
        "host_name": room.get("host_name", ""),
        "is_host": is_host,
        "current": room.get("current", 0),
        "total": len(room.get("questions", [])),
        "players": [{"id": p["id"], "name": p["name"], "score": p.get("score", 0)}
                    for p in players],
        "question": None,
        "my_answer": None,
    }
    me = next((p for p in room.get("players", []) if p["id"] == uid), None)
    if me is not None:
        view["my_answer"] = (me.get("answers") or {}).get(str(room.get("current", 0)))
    if room["state"] == "running":
        q = room["questions"][room["current"]]
        started = _started_at(room)
        ends_at = None
        if started:
            ends_at = (started + timedelta(seconds=QUESTION_SECONDS)).isoformat()
        question = {"q": q["q"], "options": q["options"], "ends_at": ends_at}
        if is_host:
            question["correct"] = q["correct"]
        view["question"] = question
    if room["state"] == "finished":
        view["results"] = [
            {"rank": i + 1, "id": p["id"], "name": p["name"], "score": p.get("score", 0)}
            for i, p in enumerate(players)
        ]
    return view


@router.post("/rooms")
async def create_room(body: CreateRoomBody, user: dict = Depends(get_current_user)):
    for q in body.questions:
        if not 0 <= q.correct < len(q.options):
            raise HTTPException(status_code=400, detail="رقم الإجابة الصحيحة غير صالح")
    code = await _new_code()
    doc = {
        "code": code, "title": body.title.strip(),
        "host_id": user["id"], "host_name": user["name"],
        "state": "lobby", "current": 0, "q_started_at": None,
        "questions": [q.model_dump() for q in body.questions],
        "players": [{"id": user["id"], "name": user["name"], "score": 0, "answers": {}}],
        "created_at": now_iso(),
    }
    res = await db.quiz_rooms.insert_one(doc)
    return {"id": str(res.inserted_id), "code": code}


@router.get("/rooms/{code}")
async def get_room(code: str, user: dict = Depends(get_current_user)):
    return _room_view(await _get_room(code), user)


@router.post("/rooms/{code}/join")
async def join_room(code: str, user: dict = Depends(get_current_user)):
    room = await _get_room(code)
    if any(p["id"] == user["id"] for p in room.get("players", [])):
        return _room_view(room, user)
    await db.quiz_rooms.update_one(
        {"_id": room["_id"]},
        {"$push": {"players": {"id": user["id"], "name": user["name"],
                                "score": 0, "answers": {}}}})
    return _room_view(await _get_room(code), user)


@router.post("/rooms/{code}/start")
async def start_room(code: str, user: dict = Depends(get_current_user)):
    room = await _get_room(code)
    if room["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="المضيف فقط يمكنه بدء المسابقة")
    if room["state"] != "lobby":
        raise HTTPException(status_code=400, detail="بدأت المسابقة مسبقاً")
    await db.quiz_rooms.update_one(
        {"_id": room["_id"]},
        {"$set": {"state": "running", "current": 0, "q_started_at": now_iso()}})
    return _room_view(await _get_room(code), user)


@router.post("/rooms/{code}/answer")
async def answer_room(code: str, body: AnswerBody, user: dict = Depends(get_current_user)):
    room = await _get_room(code)
    if room["state"] != "running":
        raise HTTPException(status_code=400, detail="المسابقة غير جارية الآن")
    me = next((p for p in room.get("players", []) if p["id"] == user["id"]), None)
    if me is None:
        raise HTTPException(status_code=400, detail="انضم إلى الغرفة أولاً")
    current = room.get("current", 0)
    q = room["questions"][current]
    if not 0 <= body.index < len(q["options"]):
        raise HTTPException(status_code=400, detail="خيار غير صالح")
    if str(current) in (me.get("answers") or {}):
        raise HTTPException(status_code=400, detail="أجبت على هذا السؤال مسبقاً")
    started = _started_at(room)
    elapsed = (datetime.now(timezone.utc) - started).total_seconds() if started else 0.0
    if elapsed > ANSWER_GRACE_SECONDS:
        raise HTTPException(status_code=400, detail="انتهى وقت هذا السؤال")
    gained = 0
    if body.index == q["correct"]:
        gained = round(600 + 400 * max(0.0, 1 - elapsed / QUESTION_SECONDS))
    await db.quiz_rooms.update_one(
        {"_id": room["_id"], "players.id": user["id"]},
        {"$set": {f"players.$.answers.{current}": body.index},
         "$inc": {"players.$.score": gained}})
    return {"accepted": True}


@router.post("/rooms/{code}/next")
async def next_question(code: str, user: dict = Depends(get_current_user)):
    room = await _get_room(code)
    if room["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="المضيف فقط يمكنه الانتقال للسؤال التالي")
    if room["state"] != "running":
        raise HTTPException(status_code=400, detail="المسابقة غير جارية الآن")
    nxt = room.get("current", 0) + 1
    if nxt >= len(room.get("questions", [])):
        await db.quiz_rooms.update_one(
            {"_id": room["_id"]},
            {"$set": {"state": "finished", "q_started_at": None}})
    else:
        await db.quiz_rooms.update_one(
            {"_id": room["_id"]},
            {"$set": {"current": nxt, "q_started_at": now_iso()}})
    return _room_view(await _get_room(code), user)
