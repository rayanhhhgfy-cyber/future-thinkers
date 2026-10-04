"""ساحة الألعاب · ثلاث ألعاب يومية تُحكَم من الخادم:
كلمة اليوم (Wordle عربي)، سباق الحساب، سباق الكتابة.

Rules that keep the yard honest:
- every answer/text is generated and judged server-side (runs carry a
  server timestamp; durations are measured on the server, never trusted
  from the client);
- full XP only on the first completion of each game per day, tiny XP
  afterwards (anti-farm). Game XP goes through award_xp, so it lifts the
  student's total and therefore his school in the Season Cup too;
- badges: word-master (7 wordle wins), human-calculator (>=15 correct in
  one math run), golden-fingers (typing >=45 wpm at >=90% accuracy).
"""
import hashlib
import random
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from bson import ObjectId

from db import db, now_iso
from auth import get_current_user
from services import award_xp
from routes.badges_routes import award_badge

router = APIRouter(prefix="/api/games")

# ---------------------------------------------------------------- wordle
_DIACRITICS = dict.fromkeys(range(0x064B, 0x0653), None)


def _norm(w: str) -> str:
    w = (w or "").translate(_DIACRITICS)
    w = w.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ٱ", "ا")
    w = w.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")
    return w.strip()


_WORDS_RAW = """مدرسة مكتبة حديقة سيارة طائرة مدينة سحابة شجاعة صداقة حكاية رواية قصيدة سفينة جزيرة صحيفة مجتمع
تعليم تدريب تفكير تحقيق تطوير تنظيم ترتيب تشجيع تسجيل تعبير تغيير تقديم تاريخ تجربة تحليل تخطيط تركيز
تصميم تعاون سلامة سعادة رياضة سياحة صناعة زراعة تجارة ثقافة حضارة نافذة حاسوب طبيعة بحيرة صحراء
جامعة سينما حقيبة محفظة نظارة مفتاح بطولة زيتون ليمون زرافة بطريق بنفسج مهندس مبرمج شعراء علماء
أدباء انهار اقلام فريقنا علمنا كتابنا دفترنا قلمنا بلدنا وطننا شعبنا لغتنا حضارتنا ثقافتنا مدرستنا
مكتبتنا حديقتنا مدينتنا قريتنا ساحتنا لعبتنا رحلتنا قصتنا حفلتنا مجلتنا جريدتنا إذاعة نشاط همة عزيمة
إرادة معرفة حكمة فكرة خيال إبداع ابتكار اختراع اكتشاف تجارب علوم فنون آداب لغات حساب هندسة فيزياء
كيمياء أحياء تاريخنا جغرافيا اقتصاد سياسة اجتماع فلسفة منطق أخلاق قيم مبادئ أهداف خطط مشاريع أعمال
فرق نوادي مدارس طلاب معلم مدير ناظر حارس سائق طباخ خباز نجار حداد خياط رسام كاتب شاعر قارئ باحث
مفكر مخترع مكتشف رحالة مسافر زائر ضيف صديق زميل جار قريب أخ أخت والد والدة جد جدة طفل شاب فتاة رجل
امرأة إنسان شخص ناس بشر عالم أمة دولة مملكة مدينة قرية حي شارع سوق محل متجر مطعم مقهى فندق متحف
مسرح ملعب حدائق شواطئ جبال وديان أنهار بحار محيط سماء أرض شمس قمر نجوم كواكب غيوم أمطار ثلوج رياح
عواصف فصول صيف شتاء ربيع خريف صباح مساء ليل نهار أسبوع شهر سنة قرن زمن وقت ساعة دقيقة ثانية لحظة"""

WORDS = sorted({_norm(w) for w in _WORDS_RAW.split() if len(_norm(w)) == 5})
WORD_SET = set(WORDS)
WORDLE_WIN_XP = {1: 50, 2: 40, 3: 35, 4: 28, 5: 20, 6: 12}

GAME_BADGES = [
    {"key": "word-master", "name": "سيد الكلمات 🏆", "description": "فاز في «كلمة اليوم» 7 مرات",
     "criteria": "اربح كلمة اليوم 7 مرات", "icon": "BookOpen", "color": "#D97706", "order": 91},
    {"key": "human-calculator", "name": "الحاسوب البشري 🧮", "description": "أجاب 15 إجابة صحيحة في جولة حساب واحدة",
     "criteria": "15 إجابة صحيحة في جولة واحدة من سباق الحساب", "icon": "Calculator", "color": "#2563EB", "order": 92},
    {"key": "golden-fingers", "name": "الأصابع الذهبية ⌨️", "description": "كتب بسرعة 45 كلمة/دقيقة بدقة 90٪ أو أكثر",
     "criteria": "45 كلمة في الدقيقة بدقة لا تقل عن 90٪ في سباق الكتابة", "icon": "Keyboard", "color": "#059669", "order": 93},
]


async def ensure_game_badges():
    for b in GAME_BADGES:
        await db.skill_badges.update_one({"key": b["key"]}, {"$setOnInsert": b}, upsert=True)


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _day_seed_int(day: str) -> int:
    return int(hashlib.sha256(("ft-wordle-" + day).encode()).hexdigest()[:12], 16)


def _wordle_answer(day: str) -> str:
    return WORDS[_day_seed_int(day) % len(WORDS)]


def _score_record(user_id: str, game: str, day: str):
    return {"user_id": user_id, "game": game, "day": day}


async def _record_score(user_id: str, game: str, day: str, score: int, meta: dict | None = None):
    """Upsert today's best score + play count; returns (doc, is_first_completion)."""
    existing = await db.game_scores.find_one(_score_record(user_id, game, day))
    first = existing is None
    await db.game_scores.update_one(
        _score_record(user_id, game, day),
        {"$max": {"best_score": score},
         "$inc": {"plays": 1},
         "$set": {"updated_at": now_iso(), "meta": meta or {}}},
        upsert=True)
    return first


async def _award_game_xp(user_id: str, game: str, day: str, full_xp: int, reason: str):
    """Full XP once a day per game · a token amount afterwards."""
    flag = {"user_id": user_id, "game": game, "day": day}
    doc = await db.game_scores.find_one(flag)
    if doc and doc.get("xp_full_used"):
        xp = min(3, full_xp)
    else:
        xp = full_xp
        await db.game_scores.update_one(flag, {"$set": {"xp_full_used": True}}, upsert=True)
    if xp > 0:
        await award_xp(user_id, xp, reason, ref=f"{game}:{day}")
    return xp


def _evaluate(guess: str, answer: str):
    res = ["absent"] * 5
    remaining = {}
    for i in range(5):
        if guess[i] == answer[i]:
            res[i] = "correct"
        else:
            remaining[answer[i]] = remaining.get(answer[i], 0) + 1
    for i in range(5):
        if res[i] == "correct":
            continue
        if remaining.get(guess[i], 0) > 0:
            res[i] = "present"
            remaining[guess[i]] -= 1
    return res


# ---------------------------------------------------------------- models
class GuessBody(BaseModel):
    guess: str = Field(min_length=1, max_length=12)


class MathSubmitBody(BaseModel):
    run_id: str
    answers: list = Field(default_factory=list, max_length=30)


class TypingSubmitBody(BaseModel):
    session_id: str
    typed: str = Field(min_length=0, max_length=4000)


# ---------------------------------------------------------------- hub
@router.get("/today")
async def games_today(user: dict = Depends(get_current_user)):
    await ensure_game_badges()
    day = _today()
    out = {"day": day, "games": {}}
    wp = await db.wordle_plays.find_one({"user_id": user["id"], "day": day})
    out["games"]["wordle"] = {
        "played": bool(wp), "finished": bool(wp and wp.get("finished")),
        "won": bool(wp and wp.get("won")), "tries": len(wp.get("tries", [])) if wp else 0,
    }
    for game in ("math", "typing"):
        sc = await db.game_scores.find_one(_score_record(user["id"], game, day))
        out["games"][game] = {
            "played": bool(sc), "best_score": sc.get("best_score", 0) if sc else 0,
            "plays": sc.get("plays", 0) if sc else 0,
            "xp_available": not (sc and sc.get("xp_full_used")),
        }
    out["games"]["wordle"]["xp_available"] = not (wp and wp.get("xp_given"))
    return out


# ---------------------------------------------------------------- wordle
@router.get("/wordle/today")
async def wordle_today(user: dict = Depends(get_current_user)):
    day = _today()
    ans = _wordle_answer(day)
    wp = await db.wordle_plays.find_one({"user_id": user["id"], "day": day})
    tries = []
    if wp:
        for g in wp.get("tries", []):
            tries.append({"guess": g, "result": _evaluate(g, ans)})
    out = {"day": day, "length": 5, "tries": tries,
           "won": bool(wp and wp.get("won")), "finished": bool(wp and wp.get("finished"))}
    if out["finished"]:
        out["answer"] = ans
    return out


@router.post("/wordle/guess")
async def wordle_guess(body: GuessBody, user: dict = Depends(get_current_user)):
    day = _today()
    ans = _wordle_answer(day)
    guess = _norm(body.guess)
    if len(guess) != 5:
        raise HTTPException(status_code=400, detail="الكلمة يجب أن تكون 5 أحرف")
    if guess not in WORD_SET:
        raise HTTPException(status_code=400, detail="كلمة غير معروفة · جرّب كلمة عربية معروفة")
    wp = await db.wordle_plays.find_one({"user_id": user["id"], "day": day})
    if wp and wp.get("finished"):
        raise HTTPException(status_code=400, detail="أنهيت كلمة اليوم · عد غداً لكلمة جديدة")
    tries = (wp.get("tries") if wp else []) or []
    tries.append(guess)
    won = guess == ans
    finished = won or len(tries) >= 6
    xp = 0
    if finished and not (wp and wp.get("xp_given")):
        full = WORDLE_WIN_XP.get(len(tries), 10) if won else 3
        xp = await _award_game_xp(user["id"], "wordle", day, full, "كلمة اليوم")
    await db.wordle_plays.update_one(
        {"user_id": user["id"], "day": day},
        {"$set": {"tries": tries, "won": won, "finished": finished,
                  "xp_given": bool(finished), "updated_at": now_iso()}},
        upsert=True)
    if finished:
        score = WORDLE_WIN_XP.get(len(tries), 0) if won else 0
        await _record_score(user["id"], "wordle", day, score, {"won": won, "tries": len(tries)})
    badge = None
    if won:
        wins = await db.wordle_plays.count_documents({"user_id": user["id"], "won": True})
        if wins >= 7:
            await ensure_game_badges()
            if await award_badge(user["id"], "word-master", "system", auto=True):
                badge = "word-master"
    out = {"guess": guess, "result": _evaluate(guess, ans), "won": won,
           "finished": finished, "tries_used": len(tries), "xp_awarded": xp,
           "badge": badge}
    if finished:
        out["answer"] = ans
    return out


# ---------------------------------------------------------------- math
def _gen_math(rng: random.Random):
    items = []
    for i in range(20):
        tier = 0 if i < 6 else 1 if i < 13 else 2
        if tier == 0:
            a, b = rng.randint(3, 25), rng.randint(3, 25)
            if rng.random() < 0.5:
                items.append({"q": f"{a} + {b}", "a": a + b})
            else:
                hi, lo = max(a, b), min(a, b)
                items.append({"q": f"{hi} − {lo}", "a": hi - lo})
        elif tier == 1:
            if rng.random() < 0.6:
                a, b = rng.randint(4, 15), rng.randint(3, 12)
                items.append({"q": f"{a} × {b}", "a": a * b})
            else:
                a = rng.randint(21, 99)
                b = rng.randint(11, 89)
                items.append({"q": f"{a} + {b}", "a": a + b})
        else:
            b = rng.randint(3, 12)
            ans = rng.randint(4, 15)
            items.append({"q": f"{b * ans} ÷ {b}", "a": ans})
    return items


@router.post("/math/start")
async def math_start(user: dict = Depends(get_current_user)):
    rng = random.Random()
    items = _gen_math(rng)
    doc = {"user_id": user["id"], "kind": "math", "items": items,
           "started_at": datetime.now(timezone.utc).isoformat(), "used": False}
    res = await db.game_runs.insert_one(doc)
    return {"run_id": str(res.inserted_id),
            "questions": [it["q"] for it in items], "seconds": 60}


@router.post("/math/submit")
async def math_submit(body: MathSubmitBody, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(body.run_id):
        raise HTTPException(status_code=400, detail="جولة غير صالحة")
    run = await db.game_runs.find_one({"_id": ObjectId(body.run_id), "user_id": user["id"], "kind": "math"})
    if not run or run.get("used"):
        raise HTTPException(status_code=400, detail="هذه الجولة انتهت أو غير موجودة")
    started = datetime.fromisoformat(run["started_at"])
    duration = (datetime.now(timezone.utc) - started).total_seconds()
    if duration > 300:
        raise HTTPException(status_code=400, detail="انتهى وقت الجولة")
    await db.game_runs.update_one({"_id": run["_id"]}, {"$set": {"used": True}})
    items = run["items"]
    correct = 0
    detail = []
    for i, it in enumerate(items):
        got = body.answers[i] if i < len(body.answers) else None
        try:
            got_n = int(got) if got is not None else None
        except (TypeError, ValueError):
            got_n = None
        ok = got_n == it["a"]
        correct += 1 if ok else 0
        detail.append({"q": it["q"], "a": it["a"], "got": got_n, "ok": ok})
    wrong = len(items) - correct
    score = max(0, correct * 10 - wrong * 2 + (10 if correct == len(items) else 0))
    day = _today()
    first = await _record_score(user["id"], "math", day, score,
                                {"correct": correct, "duration_s": int(duration)})
    full_xp = min(30, correct * 2) if correct > 0 else 0
    xp = await _award_game_xp(user["id"], "math", day, full_xp, "سباق الحساب")
    badge = None
    if correct >= 15:
        await ensure_game_badges()
        if await award_badge(user["id"], "human-calculator", "system", auto=True):
            badge = "human-calculator"
    return {"correct": correct, "total": len(items), "score": score,
            "duration_s": int(duration), "xp_awarded": xp, "first_today": first,
            "badge": badge, "detail": detail}


# ---------------------------------------------------------------- typing
TEXTS = [
    {"id": "ar1", "lang": "ar", "text": "القراءة تصنع العقل وتبني المستقبل، وكل كتاب تفتحه يفتح لك بابا جديدا نحو عالم أوسع وأجمل."},
    {"id": "ar2", "lang": "ar", "text": "نحن طلاب نؤمن أن الفكرة الصغيرة قد تتحول إلى مشروع عظيم حين تجد من يرعاها ويعمل عليها بجد وإصرار."},
    {"id": "ar3", "lang": "ar", "text": "المدرسة ليست جدرانا وصفوفا فحسب، بل هي ورشة أحلام يتعلم فيها الطالب كيف يفكر ويبتكر ويقود."},
    {"id": "ar4", "lang": "ar", "text": "من يزرع عادة القراءة اليوم يحصد ثمار المعرفة غدا، فالكلمات التي تقرؤها تصبح أفكارا تقود خطواتك."},
    {"id": "en1", "lang": "en", "text": "Reading builds the mind and shapes the future, and every book you open opens a new door to a wider world."},
    {"id": "en2", "lang": "en", "text": "Great ideas grow when curious students share them, test them, and work together to turn them into real projects."},
    {"id": "en3", "lang": "en", "text": "The future belongs to those who learn fast, think deeply, and never stop asking better questions every day."},
]
TEXT_BY_ID = {t["id"]: t for t in TEXTS}


@router.get("/typing/text")
async def typing_text(lang: str = "ar", user: dict = Depends(get_current_user)):
    pool = [t for t in TEXTS if t["lang"] == (lang if lang in ("ar", "en") else "ar")]
    t = random.choice(pool)
    doc = {"user_id": user["id"], "kind": "typing", "text_id": t["id"],
           "started_at": datetime.now(timezone.utc).isoformat(), "used": False}
    res = await db.game_runs.insert_one(doc)
    return {"session_id": str(res.inserted_id), "text": t["text"], "lang": t["lang"]}


@router.post("/typing/submit")
async def typing_submit(body: TypingSubmitBody, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(body.session_id):
        raise HTTPException(status_code=400, detail="جلسة غير صالحة")
    run = await db.game_runs.find_one({"_id": ObjectId(body.session_id), "user_id": user["id"], "kind": "typing"})
    if not run or run.get("used"):
        raise HTTPException(status_code=400, detail="هذه الجلسة انتهت أو غير موجودة")
    started = datetime.fromisoformat(run["started_at"])
    duration = (datetime.now(timezone.utc) - started).total_seconds()
    if duration < 4 or duration > 900:
        raise HTTPException(status_code=400, detail="وقت الجلسة غير صالح")
    await db.game_runs.update_one({"_id": run["_id"]}, {"$set": {"used": True}})
    original = TEXT_BY_ID[run["text_id"]]["text"]
    typed = body.typed or ""
    n = min(len(typed), len(original))
    correct_chars = sum(1 for i in range(n) if typed[i] == original[i])
    accuracy = round((correct_chars / len(typed)) * 100, 1) if typed else 0.0
    minutes = duration / 60.0
    wpm = round((correct_chars / 5.0) / minutes, 1) if minutes > 0 else 0.0
    if wpm > 220:
        raise HTTPException(status_code=400, detail="نتيجة غير واقعية · أعد المحاولة")
    score = int(round(wpm * (accuracy / 100.0)))
    day = _today()
    first = await _record_score(user["id"], "typing", day, score,
                                {"wpm": wpm, "accuracy": accuracy})
    full_xp = min(30, int(wpm / 2)) if accuracy >= 70 else 5
    xp = await _award_game_xp(user["id"], "typing", day, full_xp, "سباق الكتابة")
    badge = None
    if wpm >= 45 and accuracy >= 90:
        await ensure_game_badges()
        if await award_badge(user["id"], "golden-fingers", "system", auto=True):
            badge = "golden-fingers"
    return {"wpm": wpm, "accuracy": accuracy, "score": score,
            "duration_s": int(duration), "correct_chars": correct_chars,
            "total_chars": len(original), "xp_awarded": xp,
            "first_today": first, "badge": badge}


# ---------------------------------------------------------------- boards
async def _users_map(ids):
    out = {}
    if ids:
        docs = await db.users.find({"_id": {"$in": [ObjectId(i) for i in ids if ObjectId.is_valid(i)]}}).to_list(500)
        for d in docs:
            out[str(d["_id"])] = {"name": d.get("name", "طالب"),
                                  "school_name": d.get("school_name", ""),
                                  "avatar_url": d.get("avatar_url", "")}
    return out


@router.get("/boards/{game}")
async def game_board(game: str, scope: str = "today", user: dict = Depends(get_current_user)):
    if game not in ("wordle", "math", "typing"):
        raise HTTPException(status_code=404, detail="لعبة غير موجودة")
    day = _today()
    rows = []
    if scope == "today":
        docs = await db.game_scores.find({"game": game, "day": day}).sort("best_score", -1).to_list(200)
        rows = [{"user_id": d["user_id"], "score": d.get("best_score", 0),
                 "meta": d.get("meta", {})} for d in docs]
    elif scope == "school":
        docs = await db.game_scores.find({"game": game, "day": day}).sort("best_score", -1).to_list(500)
        ids = [d["user_id"] for d in docs]
        umap0 = await _users_map(ids)
        my_school = (umap0.get(user["id"]) or {}).get("school_name", "")
        rows = [{"user_id": d["user_id"], "score": d.get("best_score", 0), "meta": d.get("meta", {})}
                for d in docs if (umap0.get(d["user_id"]) or {}).get("school_name") == my_school and my_school]
    else:  # all time · wordle sums points, races keep their best ever
        if game == "wordle":
            agg = await db.game_scores.aggregate([
                {"$match": {"game": game}},
                {"$group": {"_id": "$user_id", "score": {"$sum": "$best_score"}}},
                {"$sort": {"score": -1}}, {"$limit": 200},
            ]).to_list(200)
        else:
            agg = await db.game_scores.aggregate([
                {"$match": {"game": game}},
                {"$group": {"_id": "$user_id", "score": {"$max": "$best_score"}}},
                {"$sort": {"score": -1}}, {"$limit": 200},
            ]).to_list(200)
        rows = [{"user_id": a["_id"], "score": a.get("score", 0), "meta": {}} for a in agg]
    ids = [r["user_id"] for r in rows]
    umap = await _users_map(ids)
    board = []
    my_rank = None
    for i, r in enumerate(rows):
        info = umap.get(r["user_id"]) or {}
        entry = {"rank": i + 1, "user_id": r["user_id"],
                 "name": info.get("name", "طالب"), "school_name": info.get("school_name", ""),
                 "avatar_url": info.get("avatar_url", ""), "score": r["score"],
                 "meta": r.get("meta", {}), "me": r["user_id"] == user["id"]}
        board.append(entry)
        if entry["me"]:
            my_rank = i + 1
    return {"game": game, "scope": scope, "day": day,
            "board": board[:20], "my_rank": my_rank, "total_players": len(board)}
