"""مزايا التعلم: ملخص الكتاب الذكي · اختبارات الفهم · بطاقات المراجعة المتباعدة."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, require_permission
from services import award_xp, audit_log

router = APIRouter(prefix="/api/learn")


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _book(book_id: str) -> dict:
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    return b


# ---------------------------------------------------------------- insights
GENERIC_QUESTIONS = [
    "ما الفكرة الرئيسية التي خرجت بها من هذا الكتاب؟",
    "ما أقوى حجة أو مثال قدّمه المؤلف، ولماذا أقنعك؟",
    "ما الذي قد تختلف فيه مع المؤلف؟ ولماذا؟",
    "كيف يمكن تطبيق فكرة واحدة من الكتاب في حياتك المدرسية؟",
    "لمن تنصح بهذا الكتاب؟ وما الجملة التي ستقولها له؟",
]


def _auto_insights(book: dict) -> dict:
    desc = (book.get("description") or "").strip()
    ideas = []
    if desc:
        parts = [p.strip() for p in desc.replace("!", ".").replace("؟", ".").split(".") if len(p.strip()) > 25]
        ideas = parts[:4]
    if not ideas:
        ideas = [f"كتاب في {book.get('category') or 'المعرفة'} للمؤلف {book.get('author') or ''}".strip()]
    return {
        "book_id": str(book["_id"]),
        "key_ideas": ideas,
        "quotes": [],
        "questions": GENERIC_QUESTIONS,
        "source": "auto",
    }


@router.get("/books/{book_id}/insights")
async def get_insights(book_id: str, user: dict = Depends(get_current_user)):
    book = await _book(book_id)
    doc = await db.book_insights.find_one({"book_id": book_id})
    if doc:
        d = ser(doc)
        d["source"] = "manual"
        return d
    return _auto_insights(book)


class InsightsBody(BaseModel):
    key_ideas: list[str] = Field(default_factory=list, max_length=8)
    quotes: list[dict] = Field(default_factory=list, max_length=8)
    questions: list[str] = Field(default_factory=list, max_length=8)


@router.put("/books/{book_id}/insights")
async def put_insights(book_id: str, body: InsightsBody, request: Request,
                       user: dict = Depends(require_permission("book.edit"))):
    await _book(book_id)
    doc = {
        "book_id": book_id,
        "key_ideas": [i.strip() for i in body.key_ideas if i.strip()][:8],
        "quotes": [{"text": (q.get("text") or "").strip(), "page": q.get("page")} for q in body.quotes if (q.get("text") or "").strip()][:8],
        "questions": [q.strip() for q in body.questions if q.strip()][:8],
        "updated_by": user["id"], "updated_at": now_iso(),
    }
    await db.book_insights.update_one({"book_id": book_id}, {"$set": doc}, upsert=True)
    await audit_log(user, "book_insights_edit", "book", book_id, {}, request)
    return {"ok": True, **doc}


# ------------------------------------------------------------------- quiz
class QuizQuestion(BaseModel):
    q: str = Field(min_length=3, max_length=400)
    options: list[str] = Field(min_length=2, max_length=5)
    answer: int = Field(ge=0, le=4)
    explain: str = Field(default="", max_length=400)


class QuizBody(BaseModel):
    title: str = Field(default="اختبر فهمك", max_length=80)
    questions: list[QuizQuestion] = Field(min_length=1, max_length=20)
    xp_reward: int = Field(default=30, ge=0, le=200)


@router.get("/books/{book_id}/quiz")
async def get_quiz(book_id: str, user: dict = Depends(get_current_user)):
    await _book(book_id)
    quiz = await db.book_quizzes.find_one({"book_id": book_id})
    attempt = await db.quiz_attempts.find_one({"user_id": user["id"], "book_id": book_id}, sort=[("score", -1)])
    if not quiz:
        return {"exists": False, "my_best": ser(attempt) if attempt else None}
    return {
        "exists": True,
        "id": str(quiz["_id"]),
        "title": quiz.get("title") or "اختبر فهمك",
        "xp_reward": quiz.get("xp_reward", 30),
        "questions": [{"q": q["q"], "options": q["options"]} for q in quiz.get("questions", [])],
        "my_best": ({"score": attempt["score"], "total": attempt["total"], "passed": attempt["passed"],
                     "xp_awarded": attempt.get("xp_awarded", False)} if attempt else None),
    }


@router.put("/books/{book_id}/quiz")
async def put_quiz(book_id: str, body: QuizBody, request: Request,
                   user: dict = Depends(require_permission("book.edit"))):
    await _book(book_id)
    for q in body.questions:
        if q.answer >= len(q.options):
            raise HTTPException(status_code=400, detail="رقم الإجابة الصحيحة خارج الخيارات")
    doc = {"book_id": book_id, "title": body.title,
           "questions": [q.model_dump() for q in body.questions],
           "xp_reward": body.xp_reward, "created_by": user["id"], "updated_at": now_iso()}
    await db.book_quizzes.update_one({"book_id": book_id}, {"$set": doc}, upsert=True)
    await audit_log(user, "book_quiz_edit", "book", book_id, {"count": len(body.questions)}, request)
    return {"ok": True}


class AttemptBody(BaseModel):
    answers: list[int] = Field(min_length=1, max_length=20)


@router.post("/books/{book_id}/quiz/attempt")
async def attempt_quiz(book_id: str, body: AttemptBody, user: dict = Depends(get_current_user)):
    quiz = await db.book_quizzes.find_one({"book_id": book_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="لا اختبار لهذا الكتاب بعد")
    questions = quiz.get("questions", [])
    if len(body.answers) != len(questions):
        raise HTTPException(status_code=400, detail="أجب عن كل الأسئلة")
    results = []
    score = 0
    for i, q in enumerate(questions):
        ok_q = body.answers[i] == q["answer"]
        score += 1 if ok_q else 0
        results.append({"ok": ok_q, "answer": q["answer"], "explain": q.get("explain", "")})
    total = len(questions)
    passed = total > 0 and (score / total) >= 0.7
    prev = await db.quiz_attempts.find_one({"user_id": user["id"], "book_id": book_id, "xp_awarded": True})
    xp = 0
    if passed and not prev:
        xp = int(quiz.get("xp_reward", 30))
        if xp:
            await award_xp(user["id"], xp, "اجتياز اختبار فهم كتاب", book_id)
    await db.quiz_attempts.insert_one({
        "user_id": user["id"], "book_id": book_id, "quiz_id": str(quiz["_id"]),
        "score": score, "total": total, "passed": passed,
        "xp_awarded": bool(passed and not prev), "created_at": now_iso(),
    })
    return {"score": score, "total": total, "passed": passed, "xp_awarded": xp, "results": results}


# -------------------------------------------------------------- flashcards
INTERVALS = [1, 3, 7, 16, 35, 90]


@router.get("/flashcards/due")
async def flashcards_due(user: dict = Depends(get_current_user)):
    now = _now().isoformat()
    docs = await db.flashcards.find({
        "user_id": user["id"], "$or": [{"due_at": {"$lte": now}}, {"due_at": None}],
    }).sort("due_at", 1).limit(60).to_list(60)
    total = await db.flashcards.count_documents({"user_id": user["id"]})
    mastered = await db.flashcards.count_documents({"user_id": user["id"], "reps": {"$gte": 4}})
    return {"cards": sers(docs), "total": total, "due": len(docs), "mastered": mastered}


class CardBody(BaseModel):
    front: str = Field(min_length=2, max_length=500)
    back: str = Field(min_length=2, max_length=1200)
    book_id: str | None = None


@router.post("/flashcards")
async def create_card(body: CardBody, user: dict = Depends(get_current_user)):
    doc = {"user_id": user["id"], "front": body.front.strip(), "back": body.back.strip(),
           "book_id": body.book_id, "source": "manual", "reps": 0, "interval_days": 0,
           "due_at": None, "created_at": now_iso()}
    res = await db.flashcards.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc


@router.post("/flashcards/generate")
async def generate_cards(user: dict = Depends(get_current_user)):
    """Build review cards from the member's own book notes and finished books."""
    made = 0
    notes = await db.book_notes.find({"user_id": user["id"]}).sort("created_at", -1).limit(40).to_list(40)
    for n in notes:
        key = f"note:{n['_id']}"
        if await db.flashcards.find_one({"user_id": user["id"], "source_key": key}):
            continue
        book = await db.books.find_one({"_id": oid(n.get("book_id", ""))}, {"title": 1})
        title = book.get("title") if book else "كتاب"
        await db.flashcards.insert_one({
            "user_id": user["id"], "source": "note", "source_key": key,
            "book_id": n.get("book_id"),
            "front": f"ما الفكرة التي دوّنتها في «{title}» (صفحة {n.get('page') or '؟'})؟",
            "back": n.get("text", ""), "reps": 0, "interval_days": 0,
            "due_at": None, "created_at": now_iso(),
        })
        made += 1
    progs = await db.reading_progress.find({"user_id": user["id"], "percent": {"$gte": 95}}).to_list(50)
    for p in progs:
        key = f"book:{p['book_id']}"
        if await db.flashcards.find_one({"user_id": user["id"], "source_key": key}):
            continue
        book = await db.books.find_one({"_id": oid(p["book_id"])}, {"title": 1, "description": 1, "author": 1})
        if not book:
            continue
        doc = await db.book_insights.find_one({"book_id": p["book_id"]})
        ideas = (doc or {}).get("key_ideas") or []
        back = " · ".join(ideas[:3]) if ideas else (book.get("description") or "")[:400] or "راجع أهم أفكار الكتاب بنفسك وأضفها كبطاقة."
        await db.flashcards.insert_one({
            "user_id": user["id"], "source": "book", "source_key": key,
            "book_id": p["book_id"],
            "front": f"ما أهم أفكار كتاب «{book.get('title')}» لـ{book.get('author') or ''}؟",
            "back": back, "reps": 0, "interval_days": 0,
            "due_at": None, "created_at": now_iso(),
        })
        made += 1
    return {"ok": True, "created": made}


class ReviewBody(BaseModel):
    grade: str = Field(pattern="^(again|good|easy)$")


@router.post("/flashcards/{card_id}/review")
async def review_card(card_id: str, body: ReviewBody, user: dict = Depends(get_current_user)):
    card = await db.flashcards.find_one({"_id": oid(card_id), "user_id": user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="البطاقة غير موجودة")
    reps = int(card.get("reps", 0))
    now = _now()
    if body.grade == "again":
        reps = 0
        due = now + timedelta(minutes=10)
        interval = 0
    elif body.grade == "good":
        interval = INTERVALS[min(reps, len(INTERVALS) - 1)]
        due = now + timedelta(days=interval)
        reps += 1
    else:  # easy
        interval = INTERVALS[min(reps, len(INTERVALS) - 1)]
        interval = max(2, round(interval * 1.7)) if reps > 0 else 4
        due = now + timedelta(days=interval)
        reps += 1
    await db.flashcards.update_one({"_id": card["_id"]},
                                   {"$set": {"reps": reps, "interval_days": interval, "due_at": due.isoformat(),
                                             "last_grade": body.grade, "updated_at": now_iso()}})
    xp = 0
    if body.grade in ("good", "easy"):
        xp = 1
        await award_xp(user["id"], xp, "مراجعة بطاقة ذاكرة", card_id)
    return {"ok": True, "reps": reps, "interval_days": interval, "due_at": due.isoformat(), "xp_awarded": xp}


@router.delete("/flashcards/{card_id}")
async def delete_card(card_id: str, user: dict = Depends(get_current_user)):
    res = await db.flashcards.delete_one({"_id": oid(card_id), "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="البطاقة غير موجودة")
    return {"ok": True}
