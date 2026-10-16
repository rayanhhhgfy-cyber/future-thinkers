"""رحلة تعلّم بايثون · Python learning journey.

- مقالات تعليمية بمراحل مرتبة (admin/coding.manage)
- امتحان لكل مقال — لا يُجتاز المقال إلا باجتياز امتحانه
- اختبار تحديد مستوى ذكي: يختار المتقدم "درست أول N مقالات" فيُبنى له
  امتحان شامل مُختبَر بذكاء (عيّنة متناسبة من أسئلة كل المقالات)
"""
import random
import re
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, require_permission, effective_permissions
from services import award_xp, audit_log

router = APIRouter(prefix="/api/python-learn")

PASS_SCORE = 60          # نسبة اجتياز امتحان المقال
PLACEMENT_PASS = 70      # نسبة اجتياز اختبار تحديد المستوى (أصعب لأنه تخطٍّ)
PLACEMENT_PER_ARTICLE = 3
PLACEMENT_MAX_Q = 30
PLACEMENT_TTL_MIN = 45
ARTICLE_XP = 50
PLACEMENT_XP = 100


# ── models ──────────────────────────────────────────────────────────
class ArticleBody(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    summary: str = Field(default="", max_length=300)
    content: str = Field(min_length=10, max_length=60000)
    is_published: bool = True


class ReorderBody(BaseModel):
    ids: list[str]


class QuestionBody(BaseModel):
    q: str = Field(min_length=3, max_length=600)
    choices: list[str] = Field(min_length=4, max_length=4)
    answer: int = Field(ge=0, le=3)
    explanation: str = Field(default="", max_length=1000)


class ExamBody(BaseModel):
    questions: list[QuestionBody] = Field(min_length=1, max_length=40)
    pass_score: int = Field(default=PASS_SCORE, ge=10, le=100)


class SubmitBody(BaseModel):
    answers: list[int]


class PlacementStartBody(BaseModel):
    upto_order: int = Field(ge=1, le=500)


# ── helpers ─────────────────────────────────────────────────────────
def _slugify(title: str) -> str:
    out = []
    for ch in title.strip():
        if "\u0600" <= ch <= "\u06ff" or "\u0750" <= ch <= "\u077f":
            out.append(ch)
        elif ch.isascii() and (ch.isalpha() or ch.isdigit()):
            out.append(ch.lower())
        else:
            out.append("-")
    slug = re.sub(r"-{2,}", "-", "".join(out)).strip("-")
    return slug[:60].strip("-") or "python"


async def _unique_slug(title: str, ignore_id=None) -> str:
    base = _slugify(title)
    slug, i = base, 2
    while True:
        ex = await db.python_articles.find_one({"slug": slug})
        if not ex or (ignore_id and ex["_id"] == ignore_id):
            return slug
        slug, i = f"{base}-{i}", i + 1


async def _articles_ordered(published_only=True):
    q = {"is_published": True} if published_only else {}
    return await db.python_articles.find(q).sort("order", 1).to_list(500)


async def _passed_ids(user_id: str) -> set:
    cur = db.python_progress.find({"user_id": user_id, "status": "passed"})
    return {str(p["article_id"]) async for p in cur}


def _is_unlocked(idx: int, articles: list, passed: set) -> bool:
    if idx == 0:
        return True
    return str(articles[idx - 1]["_id"]) in passed


def _public_question(q: dict, i: int) -> dict:
    return {"i": i, "q": q["q"], "choices": q["choices"]}


# ── learner: journey ────────────────────────────────────────────────
@router.get("/articles")
async def list_articles(user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    passed = await _passed_ids(user["id"])
    out = []
    for i, a in enumerate(arts):
        aid = str(a["_id"])
        exam = await db.python_exams.find_one({"article_id": aid})
        out.append({
            "id": aid, "slug": a["slug"], "title": a["title"],
            "summary": a.get("summary", ""), "order": a.get("order", i),
            "passed": aid in passed,
            "unlocked": _is_unlocked(i, arts, passed),
            "has_exam": bool(exam and exam.get("questions")),
            "questions_count": len(exam.get("questions", [])) if exam else 0,
        })
    return {"articles": out, "passed_count": len(passed), "total": len(out)}


@router.get("/articles/{slug}")
async def get_article(slug: str, user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    art = next((a for a in arts if a["slug"] == slug), None)
    if not art:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    idx = arts.index(art)
    passed = await _passed_ids(user["id"])
    aid = str(art["_id"])
    exam = await db.python_exams.find_one({"article_id": aid})
    prog = await db.python_progress.find_one({"user_id": user["id"], "article_id": aid})
    return {
        "id": aid, "slug": art["slug"], "title": art["title"],
        "summary": art.get("summary", ""), "content": art.get("content", ""),
        "order": art.get("order", idx), "index": idx, "total": len(arts),
        "passed": aid in passed,
        "unlocked": _is_unlocked(idx, arts, passed),
        "score": (prog or {}).get("score"),
        "has_exam": bool(exam and exam.get("questions")),
        "questions_count": len(exam.get("questions", [])) if exam else 0,
        "prev_slug": arts[idx - 1]["slug"] if idx > 0 else None,
        "next_slug": arts[idx + 1]["slug"] if idx + 1 < len(arts) else None,
    }


# ── learner: per-article exam ───────────────────────────────────────
@router.get("/exams/{article_id}")
async def get_exam(article_id: str, user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    art = next((a for a in arts if str(a["_id"]) == article_id), None)
    if not art:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    idx = arts.index(art)
    passed = await _passed_ids(user["id"])
    if not _is_unlocked(idx, arts, passed):
        raise HTTPException(status_code=403, detail="أكمل المقالات السابقة أولاً")
    exam = await db.python_exams.find_one({"article_id": article_id})
    if not exam or not exam.get("questions"):
        raise HTTPException(status_code=404, detail="لا يوجد امتحان لهذا المقال بعد")
    qs = exam["questions"]
    order = list(range(len(qs)))
    random.shuffle(order)
    return {
        "article_id": article_id, "title": art["title"],
        "pass_score": exam.get("pass_score", PASS_SCORE),
        "questions": [_public_question(qs[i], n) for n, i in enumerate(order)],
        "key": order,  # ترتيب الأسئلة الأصلي — يُعاد مع الإجابات للتصحيح
    }


@router.post("/exams/{article_id}/submit")
async def submit_exam(article_id: str, body: SubmitBody, request: Request,
                      user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    art = next((a for a in arts if str(a["_id"]) == article_id), None)
    if not art:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    exam = await db.python_exams.find_one({"article_id": article_id})
    if not exam or not exam.get("questions"):
        raise HTTPException(status_code=404, detail="لا يوجد امتحان لهذا المقال بعد")
    qs = exam["questions"]
    if len(body.answers) != len(qs):
        raise HTTPException(status_code=400, detail="عدد الإجابات غير مكتمل")
    correct = sum(1 for i, q in enumerate(qs)
                  if 0 <= body.answers[i] < 4 and body.answers[i] == q["answer"])
    total = len(qs)
    score = round(correct * 100 / total)
    passed = score >= exam.get("pass_score", PASS_SCORE)
    first_pass = False
    if passed:
        ex = await db.python_progress.find_one({"user_id": user["id"], "article_id": article_id})
        if not ex or ex.get("status") != "passed":
            first_pass = True
            await award_xp(user["id"], ARTICLE_XP, "python_article", article_id)
        await db.python_progress.update_one(
            {"user_id": user["id"], "article_id": article_id},
            {"$set": {"status": "passed", "score": score, "passed_at": now_iso()}},
            upsert=True)
    details = [{"i": i, "q": q["q"], "choices": q["choices"],
                "correct": 0 <= body.answers[i] < 4 and body.answers[i] == q["answer"],
                "answer": q["answer"], "explanation": q.get("explanation", "")}
               for i, q in enumerate(qs)]
    await audit_log(user, "python_exam_submit", "python_exam", article_id,
                    request=request, meta={"score": score, "passed": passed})
    return {"score": score, "correct": correct, "total": total,
            "passed": passed, "first_pass": first_pass,
            "pass_score": exam.get("pass_score", PASS_SCORE), "details": details}


# ── learner: smart placement exam ───────────────────────────────────
@router.post("/placement/start")
async def placement_start(body: PlacementStartBody, user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    chosen = [a for a in arts if a.get("order", 0) <= body.upto_order]
    if not chosen:
        raise HTTPException(status_code=400, detail="لا توجد مقالات ضمن هذا النطاق")
    # عيّنة ذكية: أسئلة متناسبة من كل مقال (حتى PLACEMENT_PER_ARTICLE لكل مقال)
    pool = []  # (article_id, title, question)
    skipped = []
    for a in chosen:
        aid = str(a["_id"])
        exam = await db.python_exams.find_one({"article_id": aid})
        qs = (exam or {}).get("questions", [])
        if not qs:
            skipped.append(a["title"])
            continue
        take = min(len(qs), PLACEMENT_PER_ARTICLE)
        for q in random.sample(qs, take):
            pool.append({"article_id": aid, "article_title": a["title"],
                         "q": q["q"], "choices": q["choices"], "answer": q["answer"],
                         "explanation": q.get("explanation", "")})
    if not pool:
        raise HTTPException(status_code=400, detail="لا توجد أسئلة بعد في هذه المقالات")
    random.shuffle(pool)
    pool = pool[:PLACEMENT_MAX_Q]
    # إخفاء الإجابات عن المتقدم — تُحفظ في الجلسة فقط
    public = [{"i": i, "q": p["q"], "choices": p["choices"],
               "article_title": p["article_title"]} for i, p in enumerate(pool)]
    key = [p["answer"] for p in pool]
    sess = {"user_id": user["id"], "upto_order": body.upto_order,
            "key": key, "total": len(pool),
            "qs": [{"q": p["q"], "choices": p["choices"], "answer": p["answer"],
                    "explanation": p["explanation"],
                    "article_title": p["article_title"]} for p in pool],
            "articles": sorted({p["article_title"] for p in pool}),
            "created_at": now_iso(), "used": False}
    r = await db.python_placements.insert_one(sess)
    return {"session_id": str(r.inserted_id), "total": len(pool),
            "articles": sess["articles"], "skipped": skipped,
            "pass_score": PLACEMENT_PASS, "questions": public}


class PlacementSubmitBody(BaseModel):
    answers: list[int]


@router.post("/placement/{session_id}/submit")
async def placement_submit2(session_id: str, body: PlacementSubmitBody,
                            request: Request, user: dict = Depends(get_current_user)):
    sess = await db.python_placements.find_one(
        {"_id": oid(session_id), "user_id": user["id"]})
    if not sess or sess.get("used"):
        raise HTTPException(status_code=404, detail="الجلسة غير صالحة أو مستخدمة")
    key = sess["key"]
    if len(body.answers) != len(key):
        raise HTTPException(status_code=400, detail="عدد الإجابات غير مكتمل")
    correct = sum(1 for i, k in enumerate(key)
                  if 0 <= body.answers[i] < 4 and body.answers[i] == k)
    total = len(key)
    score = round(correct * 100 / total)
    passed = score >= PLACEMENT_PASS
    newly = 0
    if passed:
        arts = await _articles_ordered()
        already = await _passed_ids(user["id"])
        for a in arts:
            if a.get("order", 0) <= sess["upto_order"]:
                aid = str(a["_id"])
                if aid not in already:
                    newly += 1
                    await db.python_progress.update_one(
                        {"user_id": user["id"], "article_id": aid},
                        {"$set": {"status": "passed", "score": score,
                                  "passed_at": now_iso(), "via": "placement"}},
                        upsert=True)
        if newly:
            await award_xp(user["id"], PLACEMENT_XP, "python_placement", session_id)
    await db.python_placements.update_one(
        {"_id": sess["_id"]},
        {"$set": {"used": True, "score": score, "passed": passed,
                  "submitted_at": now_iso()}})
    await audit_log(user, "python_placement_submit", "python_placement",
                    session_id, request=request,
                    meta={"score": score, "passed": passed, "unlocked": newly})
    details = [{"i": i, "q": q["q"], "choices": q["choices"],
                "correct": 0 <= body.answers[i] < 4 and body.answers[i] == q["answer"],
                "answer": q["answer"], "explanation": q.get("explanation", ""),
                "article_title": q.get("article_title", "")}
               for i, q in enumerate(sess.get("qs", []))]
    return {"score": score, "correct": correct, "total": total,
            "passed": passed, "pass_score": PLACEMENT_PASS,
            "unlocked_count": newly, "upto_order": sess["upto_order"],
            "details": details}


@router.get("/progress")
async def my_progress(user: dict = Depends(get_current_user)):
    arts = await _articles_ordered()
    passed = await _passed_ids(user["id"])
    return {"passed_count": len(passed), "total": len(arts),
            "passed_ids": sorted(passed)}


# ── admin ───────────────────────────────────────────────────────────
@router.get("/admin/articles")
async def admin_list(user: dict = Depends(require_permission("coding.manage"))):
    arts = await _articles_ordered(published_only=False)
    out = []
    for a in arts:
        aid = str(a["_id"])
        exam = await db.python_exams.find_one({"article_id": aid})
        out.append({**ser(a), "questions_count": len((exam or {}).get("questions", []))})
    return out


@router.post("/articles")
async def admin_create(body: ArticleBody, request: Request,
                       user: dict = Depends(require_permission("coding.manage"))):
    n = await db.python_articles.count_documents({})
    doc = {"slug": await _unique_slug(body.title), "title": body.title,
           "summary": body.summary, "content": body.content,
           "is_published": body.is_published, "order": n,
           "created_by": user["id"], "created_at": now_iso()}
    r = await db.python_articles.insert_one(doc)
    await audit_log(user, "python_article_create", "python_article",
                    str(r.inserted_id), request=request)
    return ser(await db.python_articles.find_one({"_id": r.inserted_id}))


@router.patch("/articles/{article_id}")
async def admin_update(article_id: str, body: ArticleBody, request: Request,
                       user: dict = Depends(require_permission("coding.manage"))):
    a = await db.python_articles.find_one({"_id": oid(article_id)})
    if not a:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    upd = {"title": body.title, "summary": body.summary,
           "content": body.content, "is_published": body.is_published,
           "updated_at": now_iso()}
    if body.title != a.get("title"):
        upd["slug"] = await _unique_slug(body.title, ignore_id=a["_id"])
    await db.python_articles.update_one({"_id": a["_id"]}, {"$set": upd})
    await audit_log(user, "python_article_update", "python_article",
                    article_id, request=request)
    return ser(await db.python_articles.find_one({"_id": a["_id"]}))


@router.delete("/articles/{article_id}")
async def admin_delete(article_id: str, request: Request,
                       user: dict = Depends(require_permission("coding.manage"))):
    a = await db.python_articles.find_one({"_id": oid(article_id)})
    if not a:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    await db.python_articles.delete_one({"_id": a["_id"]})
    await db.python_exams.delete_many({"article_id": article_id})
    await db.python_progress.delete_many({"article_id": article_id})
    await audit_log(user, "python_article_delete", "python_article",
                    article_id, request=request)
    return {"ok": True}


@router.post("/articles/reorder")
async def admin_reorder(body: ReorderBody, request: Request,
                        user: dict = Depends(require_permission("coding.manage"))):
    for i, aid in enumerate(body.ids):
        await db.python_articles.update_one({"_id": oid(aid)}, {"$set": {"order": i}})
    await audit_log(user, "python_articles_reorder", "python_article",
                    "bulk", request=request)
    return {"ok": True}


@router.put("/exams/{article_id}")
async def admin_upsert_exam(article_id: str, body: ExamBody, request: Request,
                            user: dict = Depends(require_permission("coding.manage"))):
    a = await db.python_articles.find_one({"_id": oid(article_id)})
    if not a:
        raise HTTPException(status_code=404, detail="المقال غير موجود")
    qs = [{"q": q.q, "choices": q.choices, "answer": q.answer,
           "explanation": q.explanation} for q in body.questions]
    await db.python_exams.update_one(
        {"article_id": article_id},
        {"$set": {"article_id": article_id, "questions": qs,
                  "pass_score": body.pass_score, "updated_at": now_iso(),
                  "updated_by": user["id"]}},
        upsert=True)
    await audit_log(user, "python_exam_upsert", "python_exam",
                    article_id, request=request)
    return {"ok": True, "questions": len(qs)}


@router.get("/exams/{article_id}/admin")
async def admin_get_exam(article_id: str,
                         user: dict = Depends(require_permission("coding.manage"))):
    exam = await db.python_exams.find_one({"article_id": article_id})
    return exam and ser(exam) or {"article_id": article_id, "questions": [],
                                 "pass_score": PASS_SCORE}
