"""Q&A help board: students ask questions, peers answer, best answer wins.

Accepting an answer awards its author +25 XP exactly once (guarded by the
answer's xp_awarded flag). Votes are one per user, toggle/switch.
"""
import re
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, oid, now_iso
from auth import get_current_user
from services import award_xp

router = APIRouter(prefix="/api/qa")

ACCEPT_XP = 25


async def _user_pub(uid: str):
    o = oid(uid)
    doc = await db.users.find_one({"_id": o}, {"name": 1}) if o else None
    return {"id": uid, "name": (doc or {}).get("name", "")}


async def _question_out(q):
    count = await db.qa_answers.count_documents({"question_id": q["id"]})
    return {
        "id": q["id"],
        "title": q["title"],
        "body": q["body"],
        "tags": q.get("tags", []),
        "asker": await _user_pub(q["asker_id"]),
        "answers_count": count,
        "accepted": bool(q.get("accepted_answer_id")),
        "created_at": q["created_at"],
    }


def _answer_out(a, me):
    return {
        "id": a["id"],
        "body": a["body"],
        "author": {"id": a["author_id"], "name": a.get("author_name", "")},
        "votes": a.get("votes", 0),
        "accepted": bool(a.get("accepted")),
        "mine": a["author_id"] == me,
        "my_vote": (a.get("voters") or {}).get(me, 0),
        "created_at": a["created_at"],
    }


class QuestionBody(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    body: str = Field(min_length=1, max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=5)


class AnswerBody(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class VoteBody(BaseModel):
    dir: int


@router.get("/questions")
async def list_questions(q: str = "", tag: str = "",
                         user: dict = Depends(get_current_user)):
    query = {}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"title": rx}, {"body": rx}]
    if tag.strip():
        query["tags"] = tag.strip()
    docs = await db.qa_questions.find(query).sort(
        "created_at", -1).limit(50).to_list(50)
    return {"items": [await _question_out(d) for d in docs]}


@router.post("/questions")
async def create_question(body: QuestionBody,
                          user: dict = Depends(get_current_user)):
    tags = [t.strip()[:30] for t in body.tags if t.strip()][:5]
    qdoc = {
        "id": uuid.uuid4().hex,
        "title": body.title.strip(),
        "body": body.body.strip(),
        "tags": tags,
        "asker_id": user["id"],
        "accepted_answer_id": None,
        "created_at": now_iso(),
    }
    await db.qa_questions.insert_one(qdoc)
    return {"id": qdoc["id"]}


@router.get("/questions/{qid}")
async def get_question(qid: str, user: dict = Depends(get_current_user)):
    qdoc = await db.qa_questions.find_one({"id": qid})
    if not qdoc:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    answers = await db.qa_answers.find(
        {"question_id": qid}).to_list(500)
    out = [_answer_out(a, user["id"]) for a in answers]
    out.sort(key=lambda a: (not a["accepted"], -a["votes"], a["created_at"]))
    result = await _question_out(qdoc)
    result["answers"] = out
    return result


@router.post("/questions/{qid}/answers")
async def create_answer(qid: str, body: AnswerBody,
                        user: dict = Depends(get_current_user)):
    qdoc = await db.qa_questions.find_one({"id": qid})
    if not qdoc:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    adoc = {
        "id": uuid.uuid4().hex,
        "question_id": qid,
        "author_id": user["id"],
        "author_name": user.get("name", ""),
        "body": body.body.strip(),
        "votes": 0,
        "voters": {},
        "accepted": False,
        "xp_awarded": False,
        "created_at": now_iso(),
    }
    await db.qa_answers.insert_one(adoc)
    return {"ok": True, "id": adoc["id"]}


@router.post("/answers/{aid}/vote")
async def vote_answer(aid: str, body: VoteBody,
                      user: dict = Depends(get_current_user)):
    if body.dir not in (1, -1):
        raise HTTPException(status_code=400, detail="اتجاه تصويت غير صالح")
    adoc = await db.qa_answers.find_one({"id": aid})
    if not adoc:
        raise HTTPException(status_code=404, detail="الإجابة غير موجودة")
    me = user["id"]
    voters = dict(adoc.get("voters") or {})
    prev = voters.get(me, 0)
    if prev == body.dir:
        voters.pop(me, None)          # same direction again -> toggle off
    else:
        voters[me] = body.dir         # new vote or switch
    total = sum(voters.values())
    await db.qa_answers.update_one(
        {"id": aid}, {"$set": {"voters": voters, "votes": total}})
    return {"ok": True, "votes": total, "my_vote": voters.get(me, 0)}


@router.post("/answers/{aid}/accept")
async def accept_answer(aid: str, user: dict = Depends(get_current_user)):
    adoc = await db.qa_answers.find_one({"id": aid})
    if not adoc:
        raise HTTPException(status_code=404, detail="الإجابة غير موجودة")
    qdoc = await db.qa_questions.find_one({"id": adoc["question_id"]})
    if not qdoc:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    if qdoc["asker_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="فقط صاحب السؤال يمكنه اعتماد إجابة")
    # Only one accepted answer per question.
    await db.qa_answers.update_many(
        {"question_id": qdoc["id"], "accepted": True},
        {"$set": {"accepted": False}})
    update = {"accepted": True}
    award = not adoc.get("xp_awarded")
    if award:
        update["xp_awarded"] = True
    await db.qa_answers.update_one({"id": aid}, {"$set": update})
    await db.qa_questions.update_one(
        {"id": qdoc["id"]}, {"$set": {"accepted_answer_id": aid}})
    if award and adoc["author_id"] != user["id"]:
        await award_xp(adoc["author_id"], ACCEPT_XP,
                       "إجابة مقبولة في الأسئلة والأجوبة", aid)
    return {"ok": True}
