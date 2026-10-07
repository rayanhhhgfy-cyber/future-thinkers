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
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from bson import ObjectId

from db import db, now_iso, ser
from auth import get_current_user, require_permission
from services import award_xp, create_notification, send_push_to_user
from routes.badges_routes import award_badge
from routes.control_routes import get_games_config, section_open

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


async def _word_bank():
    """Built-in bank plus admin-added words (wordle_words collection)."""
    extra = set()
    async for d in db.wordle_words.find({}, {"word": 1}):
        w = _norm(d.get("word", ""))
        if len(w) == 5:
            extra.add(w)
    if not extra:
        return WORDS, WORD_SET
    merged = sorted(WORD_SET | extra)
    return merged, set(merged)


async def _wordle_answer(day: str) -> str:
    bank, _ = await _word_bank()
    return bank[_day_seed_int(day) % len(bank)]


async def _typing_pool():
    """Built-in texts plus admin-added ones (typing_texts collection)."""
    pool = list(TEXTS)
    async for d in db.typing_texts.find({}, {"text": 1, "lang": 1}):
        pool.append({"id": str(d["_id"]), "lang": d.get("lang", "ar"), "text": d.get("text", "")})
    return pool


async def _text_by_id(tid: str, pool=None):
    if tid in TEXT_BY_ID:
        return TEXT_BY_ID[tid]
    pool = pool if pool is not None else await _typing_pool()
    for t in pool:
        if t["id"] == tid:
            return t
    return TEXTS[0]


async def _games_open():
    if not await section_open("games"):
        raise HTTPException(status_code=403, detail="ساحة الألعاب متوقفة مؤقتاً بقرار الإدارة")


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
    await _games_open()
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
    await _games_open()
    day = _today()
    ans = await _wordle_answer(day)
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
    await _games_open()
    day = _today()
    ans = await _wordle_answer(day)
    guess = _norm(body.guess)
    if len(guess) != 5:
        raise HTTPException(status_code=400, detail="الكلمة يجب أن تكون 5 أحرف")
    _, bank_set = await _word_bank()
    if guess not in bank_set:
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
        full = WORDLE_WIN_XP.get(len(tries), 10) if won else (await get_games_config())["wordle_lose_xp"]
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
    await _games_open()
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
    full_xp = min((await get_games_config())["math_full_cap"], correct * 2) if correct > 0 else 0
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
    await _games_open()
    pool_all = await _typing_pool()
    pool = [t for t in pool_all if t["lang"] == (lang if lang in ("ar", "en") else "ar")]
    if not pool:
        pool = pool_all
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
    original = (await _text_by_id(run["text_id"]))["text"]
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
    full_xp = min((await get_games_config())["typing_full_cap"], int(wpm / 2)) if accuracy >= 70 else 5
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


# ================================================================ challenges
# Async friend duels: one shared, server-generated set. Both sides play
# when they can; the server judges, times, and pays the winner.
class ChallengeBody(BaseModel):
    to_user_id: str
    game: str


class ChallengeSubmitBody(BaseModel):
    answers: list | None = None
    typed: str | None = None


def _math_judge(items, answers):
    correct = 0
    for i, it in enumerate(items):
        got = None
        if answers and i < len(answers):
            try:
                got = int(answers[i])
            except (TypeError, ValueError):
                got = None
        if got == it["a"]:
            correct += 1
    wrong = len(items) - correct
    score = max(0, correct * 10 - wrong * 2 + (10 if correct == len(items) else 0))
    return correct, score


def _typing_judge(original, typed, duration):
    typed = typed or ""
    n = min(len(typed), len(original))
    correct_chars = sum(1 for i in range(n) if typed[i] == original[i])
    accuracy = round((correct_chars / len(typed)) * 100, 1) if typed else 0.0
    minutes = max(duration, 1) / 60.0
    wpm = round((correct_chars / 5.0) / minutes, 1)
    return wpm, accuracy, int(round(wpm * (accuracy / 100.0)))


async def _finalize_challenge(ch):
    """Both sides in (or expired) -> decide, pay, notify. Returns the doc."""
    fr, to = ch.get("from_result"), ch.get("to_result")
    expired = datetime.now(timezone.utc) > datetime.fromisoformat(ch["expires_at"])
    if ch.get("status") == "done" or (not fr and not to) or (not (fr and to) and not expired):
        return ch
    winner = None
    if fr and to:
        winner = ch["from_id"] if fr["score"] > to["score"] else ch["to_id"] if to["score"] > fr["score"] else "draw"
    elif fr:
        winner = ch["from_id"]
    elif to:
        winner = ch["to_id"]
    cfg = await get_games_config()
    payouts = {}
    for uid, res in ((ch["from_id"], fr), (ch["to_id"], to)):
        if not res:
            payouts[uid] = 0
        elif winner == "draw":
            payouts[uid] = cfg["challenge_draw_xp"]
        elif winner == uid:
            payouts[uid] = cfg["challenge_win_xp"]
        else:
            payouts[uid] = cfg["challenge_lose_xp"]
    for uid, xp in payouts.items():
        if xp:
            await award_xp(uid, xp, "تحدي صديق", ref=f"challenge:{ch['_id']}")
    await db.game_challenges.update_one({"_id": ch["_id"]},
                                        {"$set": {"status": "done", "winner": winner, "payouts": payouts}})
    names = await _users_map([ch["from_id"], ch["to_id"]])
    for uid, other in ((ch["from_id"], ch["to_id"]), (ch["to_id"], ch["from_id"])):
        mine = payouts.get(uid, 0)
        outcome = "تعادل!" if winner == "draw" else ("فزت بالتحدي 🏆" if winner == uid else "انتهى التحدي")
        await create_notification(uid, "challenge", f"نتيجة التحدي: {outcome}",
                                  f"ضد {(names.get(other) or {}).get('name', 'صديقك')} · +{mine} XP", "/games/challenges")
    ch["status"] = "done"
    ch["winner"] = winner
    ch["payouts"] = payouts
    return ch


def _challenge_out(ch, me):
    out = ser(ch)
    out.pop("items", None)  # answers never leave the server
    out["is_mine"] = ch["from_id"] == me
    out["my_result"] = ch.get("from_result") if ch["from_id"] == me else ch.get("to_result")
    out["opp_result"] = ch.get("to_result") if ch["from_id"] == me else ch.get("from_result")
    out["opp_id"] = ch["to_id"] if ch["from_id"] == me else ch["from_id"]
    out["my_turn"] = (not out["my_result"]) and ch.get("status") != "done"
    return out


@router.post("/challenges")
async def create_challenge(body: ChallengeBody, user: dict = Depends(get_current_user)):
    await _games_open()
    if body.game not in ("math", "typing"):
        raise HTTPException(status_code=400, detail="اختر سباق الحساب أو سباق الكتابة")
    if body.to_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك تحدي نفسك")
    target = await db.users.find_one({"_id": ObjectId(body.to_user_id)}) if ObjectId.is_valid(body.to_user_id) else None
    if not target:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    doc = {"from_id": user["id"], "to_id": body.to_user_id, "game": body.game,
           "status": "open", "created_at": now_iso(),
           "expires_at": (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()}
    if body.game == "math":
        doc["items"] = _gen_math(random.Random())
    else:
        pool = await _typing_pool()
        t = random.choice(pool)
        doc["text_id"] = t["id"]
    res = await db.game_challenges.insert_one(doc)
    label = "سباق الحساب" if body.game == "math" else "سباق الكتابة"
    await create_notification(body.to_user_id, "challenge",
                              f"⚔️ {user.get('name', 'طالب')} تحدّاك في {label}!",
                              "افتح التحدي والعب مجموعته نفسها · الفائز يأخذ 15 XP",
                              "/games/challenges")
    return {"challenge_id": str(res.inserted_id), "game": body.game}


@router.get("/challenges/mine")
async def my_challenges(user: dict = Depends(get_current_user)):
    docs = await db.game_challenges.find(
        {"$or": [{"from_id": user["id"]}, {"to_id": user["id"]}]},
    ).sort("created_at", -1).to_list(50)
    for ch in docs:
        if ch.get("status") != "done":
            await _finalize_challenge(ch)
    docs = await db.game_challenges.find(
        {"$or": [{"from_id": user["id"]}, {"to_id": user["id"]}]},
    ).sort("created_at", -1).to_list(50)
    names = await _users_map(list({d["from_id"] for d in docs} | {d["to_id"] for d in docs}))
    out = []
    for ch in docs:
        o = _challenge_out(ch, user["id"])
        o["opp_name"] = (names.get(o["opp_id"]) or {}).get("name", "طالب")
        o["opp_avatar"] = (names.get(o["opp_id"]) or {}).get("avatar_url", "")
        o["from_name"] = (names.get(ch["from_id"]) or {}).get("name", "طالب")
        out.append(o)
    return {"challenges": out}


@router.post("/challenges/{cid}/play")
async def challenge_play(cid: str, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="تحدي غير صالح")
    ch = await db.game_challenges.find_one({"_id": ObjectId(cid)})
    if not ch or user["id"] not in (ch["from_id"], ch["to_id"]):
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    if ch.get("status") == "done":
        raise HTTPException(status_code=400, detail="انتهى هذا التحدي")
    side = "from" if ch["from_id"] == user["id"] else "to"
    if ch.get(f"{side}_result"):
        raise HTTPException(status_code=400, detail="لعبت حصتك من هذا التحدي")
    if not ch.get(f"{side}_started_at"):
        await db.game_challenges.update_one({"_id": ch["_id"]},
                                            {"$set": {f"{side}_started_at": datetime.now(timezone.utc).isoformat()}})
    if ch["game"] == "math":
        return {"game": "math", "questions": [it["q"] for it in ch["items"]], "seconds": 60}
    t = await _text_by_id(ch["text_id"])
    return {"game": "typing", "text": t["text"], "lang": t["lang"]}


@router.post("/challenges/{cid}/submit")
async def challenge_submit(cid: str, body: ChallengeSubmitBody, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=400, detail="تحدي غير صالح")
    ch = await db.game_challenges.find_one({"_id": ObjectId(cid)})
    if not ch or user["id"] not in (ch["from_id"], ch["to_id"]):
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    side = "from" if ch["from_id"] == user["id"] else "to"
    if ch.get(f"{side}_result"):
        raise HTTPException(status_code=400, detail="أرسلت نتيجتك من قبل")
    started_raw = ch.get(f"{side}_started_at")
    if not started_raw:
        raise HTTPException(status_code=400, detail="ابدأ اللعب أولاً")
    duration = (datetime.now(timezone.utc) - datetime.fromisoformat(started_raw)).total_seconds()
    if duration > 600:
        raise HTTPException(status_code=400, detail="انتهى وقت التحدي")
    if ch["game"] == "math":
        correct, score = _math_judge(ch["items"], body.answers or [])
        result = {"score": score, "correct": correct, "total": len(ch["items"]), "duration_s": int(duration)}
    else:
        wpm, accuracy, score = _typing_judge((await _text_by_id(ch["text_id"]))["text"], body.typed, duration)
        if wpm > 220:
            raise HTTPException(status_code=400, detail="نتيجة غير واقعية")
        result = {"score": score, "wpm": wpm, "accuracy": accuracy, "duration_s": int(duration)}
    await db.game_challenges.update_one({"_id": ch["_id"]}, {"$set": {f"{side}_result": result}})
    ch = await db.game_challenges.find_one({"_id": ch["_id"]})
    ch = await _finalize_challenge(ch)
    names = await _users_map([ch["from_id"], ch["to_id"]])
    opp = ch["to_id"] if side == "from" else ch["from_id"]
    if ch.get("status") != "done":
        await create_notification(opp, "challenge", "خصمك لعب حصته من التحدي ⚔️",
                                  "نتيجته محفوظة · العب حصتك قبل انتهاء 72 ساعة", "/games/challenges")
    o = _challenge_out(ch, user["id"])
    o["opp_name"] = (names.get(o["opp_id"]) or {}).get("name", "طالب")
    return o


# ================================================================ missions
def _week_bounds(day_iso: str):
    d = datetime.fromisoformat(day_iso).date()
    monday = d - timedelta(days=d.weekday())
    return monday.isoformat(), (monday + timedelta(days=7)).isoformat(), f"{monday.isocalendar()[0]}-W{monday.isocalendar()[1]:02d}"


MISSIONS = [
    {"key": "wordle3", "icon": "BookOpen", "title": "سيد الكلمة الأسبوعي", "desc": "اربح «كلمة اليوم» 3 مرات هذا الأسبوع", "target": 3, "xp": 12},
    {"key": "math150", "icon": "Calculator", "title": "قنّاص الحساب", "desc": "اجمع 150 نقطة في سباق الحساب (مجموع أفضل جولات أيامك)", "target": 150, "xp": 12},
    {"key": "typing40", "icon": "Keyboard", "title": "أصابع سريعة", "desc": "حقق 40 كلمة/دقيقة أو أكثر في سباق الكتابة", "target": 40, "xp": 12},
    {"key": "pages50", "icon": "BookMarked", "title": "قارئ لا يهدأ", "desc": "اقرأ 50 صفحة هذا الأسبوع", "target": 50, "xp": 12},
    {"key": "days5", "icon": "Flame", "title": "حاضر كل يوم", "desc": "العب في ساحة الألعاب خلال 5 أيام مختلفة", "target": 5, "xp": 12},
    {"key": "xp200", "icon": "Zap", "title": "جامع الخبرة", "desc": "اكسب 200 نقطة خبرة من أي نشاط هذا الأسبوع", "target": 200, "xp": 12},
    {"key": "book1", "icon": "Library", "title": "كتاب الأسبوع", "desc": "أنهِ قراءة كتاب واحد على الأقل", "target": 1, "xp": 12},
]
CHEST_XP = 75


_METRIC_ALIAS = {"wordle_wins": "wordle3", "math_points": "math150", "typing_wpm": "typing40",
                 "pages": "pages50", "play_days": "days5", "xp_earned": "xp200", "books": "book1"}


async def _mission_progress(uid: str, key: str, start: str, end: str) -> int:
    key = _METRIC_ALIAS.get(key, key)
    if key == "wordle3":
        return await db.wordle_plays.count_documents(
            {"user_id": uid, "won": True, "day": {"$gte": start, "$lt": end}})
    if key == "math150":
        docs = await db.game_scores.find(
            {"user_id": uid, "game": "math", "day": {"$gte": start, "$lt": end}}).to_list(7)
        return sum(d.get("best_score", 0) for d in docs)
    if key == "typing40":
        docs = await db.game_scores.find(
            {"user_id": uid, "game": "typing", "day": {"$gte": start, "$lt": end}}).to_list(7)
        return int(max([float((d.get("meta") or {}).get("wpm", 0)) for d in docs] or [0]))
    if key == "pages50":
        docs = await db.user_daily.find(
            {"user_id": uid, "date": {"$gte": start, "$lt": end}}).to_list(7)
        return sum(d.get("pages", 0) for d in docs)
    if key == "days5":
        days = set()
        async for d in db.game_scores.find({"user_id": uid, "day": {"$gte": start, "$lt": end}}, {"day": 1}):
            days.add(d["day"])
        async for d in db.wordle_plays.find({"user_id": uid, "day": {"$gte": start, "$lt": end}}, {"day": 1}):
            days.add(d["day"])
        return len(days)
    if key == "xp200":
        docs = await db.xp_transactions.find(
            {"user_id": uid, "created_at": {"$gte": start, "$lt": end + "T23:59:59"}}).to_list(2000)
        return sum(max(0, d.get("amount", 0)) for d in docs)
    if key == "book1":
        return await db.xp_transactions.count_documents(
            {"user_id": uid, "reason": "إكمال قراءة كتاب",
             "created_at": {"$gte": start, "$lt": end + "T23:59:59"}})
    return 0


@router.get("/missions/week")
async def missions_week(user: dict = Depends(get_current_user)):
    await _games_open()
    cfg = await get_games_config()
    start, end, week = _week_bounds(_today())
    claims = await db.mission_claims.find({"user_id": user["id"], "week": week}).to_list(50)
    claimed = {c["mission"] for c in claims}
    out = []
    for m in MISSIONS:
        prog = await _mission_progress(user["id"], m["key"], start, end)
        out.append({**m, "xp": cfg["mission_xp"], "progress": min(prog, m["target"]), "done": prog >= m["target"],
                    "claimed": m["key"] in claimed})
    custom = await db.mission_defs.find({"active": True}).to_list(50)
    for c in custom:
        prog = await _mission_progress(user["id"], c["metric"], start, end)
        out.append({"key": c["key"], "icon": c.get("icon", "Target"), "title": c["title"],
                    "desc": c.get("desc", ""), "target": c["target"], "xp": c.get("xp", 12),
                    "progress": min(prog, c["target"]), "done": prog >= c["target"],
                    "claimed": c["key"] in claimed})
    chest = await db.mission_claims.find_one({"user_id": user["id"], "week": week, "mission": "__chest__"})
    return {"week": week, "missions": out, "done_count": sum(1 for m in out if m["done"]),
            "chest_xp": cfg["chest_xp"], "chest_claimed": bool(chest),
            "chest_ready": bool(out) and all(m["done"] for m in out)}


class ClaimBody(BaseModel):
    mission: str


@router.post("/missions/claim")
async def missions_claim(body: ClaimBody, user: dict = Depends(get_current_user)):
    start, end, week = _week_bounds(_today())
    cfg = await get_games_config()
    custom = await db.mission_defs.find({"active": True}).to_list(50)
    all_defs = [(m["key"], m["target"], cfg["mission_xp"]) for m in MISSIONS] + \
               [(c["key"], c["target"], c.get("xp", 12)) for c in custom]
    def _metric_of(key):
        for m in MISSIONS:
            if m["key"] == key:
                return m["key"]
        for c in custom:
            if c["key"] == key:
                return c["metric"]
        return None
    if body.mission == "__chest__":
        prog_all = []
        for key, target, _x in all_defs:
            met = _metric_of(key)
            prog_all.append(await _mission_progress(user["id"], met, start, end) >= target)
        if not prog_all or not all(prog_all):
            raise HTTPException(status_code=400, detail="أكمل كل مهمات الأسبوع أولاً لفتح الصندوق")
        xp = cfg["chest_xp"]
    else:
        d = next((x for x in all_defs if x[0] == body.mission), None)
        if not d:
            raise HTTPException(status_code=404, detail="مهمة غير موجودة")
        if await _mission_progress(user["id"], _metric_of(body.mission), start, end) < d[1]:
            raise HTTPException(status_code=400, detail="لم تكمل هذه المهمة بعد")
        xp = d[2]
    existing = await db.mission_claims.find_one({"user_id": user["id"], "week": week, "mission": body.mission})
    if existing:
        raise HTTPException(status_code=400, detail="استلمت هذه المكافأة من قبل")
    await db.mission_claims.insert_one({"user_id": user["id"], "week": week,
                                        "mission": body.mission, "claimed_at": now_iso()})
    await award_xp(user["id"], xp, "مهمات الأسبوع", ref=f"mission:{week}:{body.mission}")
    return {"ok": True, "xp_awarded": xp}


# ================================================================ admin radar
@router.get("/admin/radar")
async def games_radar(user: dict = Depends(require_permission("analytics.view"))):
    day = _today()
    start7 = (datetime.now(timezone.utc).date() - timedelta(days=6)).isoformat()
    per_game = {}
    for game in ("wordle", "math", "typing"):
        t = await db.game_scores.find({"game": game, "day": day}).to_list(2000)
        w = await db.game_scores.find({"game": game, "day": {"$gte": start7}}).to_list(10000)
        per_game[game] = {
            "plays_today": sum(d.get("plays", 0) for d in t),
            "players_today": len({d["user_id"] for d in t}),
            "plays_7d": sum(d.get("plays", 0) for d in w),
            "players_7d": len({d["user_id"] for d in w}),
        }
    xp_rows = await db.xp_transactions.find(
        {"reason": {"$in": ["كلمة اليوم", "سباق الحساب", "سباق الكتابة", "تحدي صديق", "مهمات الأسبوع"]},
         "created_at": {"$gte": start7}}).to_list(20000)
    xp_by_reason = {}
    for r in xp_rows:
        xp_by_reason[r["reason"]] = xp_by_reason.get(r["reason"], 0) + max(0, r.get("amount", 0))
    top = await db.game_scores.aggregate([
        {"$match": {"day": day}},
        {"$group": {"_id": "$user_id", "score": {"$sum": "$best_score"}, "plays": {"$sum": "$plays"}}},
        {"$sort": {"score": -1}}, {"$limit": 10},
    ]).to_list(10)
    names = await _users_map([t["_id"] for t in top])
    heavy = await db.game_scores.aggregate([
        {"$match": {"day": day}},
        {"$group": {"_id": "$user_id", "plays": {"$sum": "$plays"}}},
        {"$match": {"plays": {"$gte": 20}}},
        {"$sort": {"plays": -1}}, {"$limit": 10},
    ]).to_list(10)
    hnames = await _users_map([h["_id"] for h in heavy])
    pending_ch = await db.game_challenges.count_documents({"status": "open"})
    done_ch = await db.game_challenges.count_documents({"status": "done"})
    return {
        "day": day, "per_game": per_game, "xp_by_reason": xp_by_reason,
        "xp_total_7d": sum(xp_by_reason.values()),
        "top_today": [{"user_id": t["_id"], "name": (names.get(t["_id"]) or {}).get("name", "طالب"),
                       "score": t["score"], "plays": t["plays"]} for t in top],
        "heavy_players": [{"user_id": h["_id"], "name": (hnames.get(h["_id"]) or {}).get("name", "طالب"),
                           "plays": h["plays"]} for h in heavy],
        "challenges": {"open": pending_ch, "done": done_ch},
    }


@router.post("/admin/streak-saver")
async def streak_saver_now(user: dict = Depends(require_permission("notification.broadcast"))):
    return await maybe_send_streak_reminders(force=True)


async def maybe_send_streak_reminders(force: bool = False):
    """Evening streak rescue: played yesterday, silent today -> one push.
    Runs once a day (marker doc) inside the 18:00-21:59 Amman window."""
    amman = timezone(timedelta(hours=3))
    now_local = datetime.now(amman)
    if not force and not (18 <= now_local.hour <= 21):
        return {"sent": 0, "reason": "outside-window"}
    today = now_local.date().isoformat()
    yesterday = (now_local.date() - timedelta(days=1)).isoformat()
    marker = await db.streak_reminder_runs.find_one({"_id": "global"})
    if marker and marker.get("day") == today and not force:
        return {"sent": 0, "reason": "already-sent"}
    y_ids = {d["user_id"] for d in await db.game_scores.find({"day": yesterday}, {"user_id": 1}).to_list(5000)}
    y_ids |= {d["user_id"] for d in await db.wordle_plays.find({"day": yesterday}, {"user_id": 1}).to_list(5000)}
    t_ids = {d["user_id"] for d in await db.game_scores.find({"day": today}, {"user_id": 1}).to_list(5000)}
    t_ids |= {d["user_id"] for d in await db.wordle_plays.find({"day": today}, {"user_id": 1}).to_list(5000)}
    candidates = y_ids - t_ids
    # Claim the day BEFORE the send loop: if this process is killed mid-loop
    # (serverless time limit), the day must still count as attempted so the
    # next request does not re-run the entire loop (2026-10-07 hang).
    try:
        await db.streak_reminder_runs.update_one(
            {"_id": "global"},
            {"$set": {"day": today, "sent": 0, "at": now_iso(), "claim": "in-progress"}},
            upsert=True)
    except Exception:
        pass
    sent = 0
    for uid in candidates:
        subs = await db.push_subscriptions.count_documents({"user_id": uid})
        if not subs:
            continue
        n = await send_push_to_user(uid, "🔥 سلسلتك في خطر!",
                                    "لعبت أمس ولم تلعب اليوم بعد · جولة سريعة في ساحة الألعاب تنقذ يومك",
                                    "/games")
        if n:
            sent += 1
            await create_notification(uid, "games", "🔥 سلسلتك في خطر!",
                                      "العب أي لعبة اليوم قبل منتصف الليل لتحافظ على إيقاعك", "/games")
    await db.streak_reminder_runs.update_one({"_id": "global"}, {"$set": {"day": today, "sent": sent, "at": now_iso()}, "$unset": {"claim": ""}}, upsert=True)
    return {"sent": sent, "candidates": len(candidates)}


# ================================================================ admin content: word bank + typing texts
class WordBody(BaseModel):
    word: str


@router.get("/admin/words")
async def admin_words(user: dict = Depends(require_permission("cms.manage"))):
    bank, bank_set = await _word_bank()
    custom = []
    async for d in db.wordle_words.find({}).sort("created_at", -1):
        custom.append({"id": str(d["_id"]), "word": d.get("word", "")})
    return {"bank_size": len(bank), "builtin": len(WORDS), "custom": custom, "days_covered": len(bank)}


@router.post("/admin/words")
async def admin_word_add(body: WordBody, user: dict = Depends(require_permission("cms.manage"))):
    raw = (body.word or "").strip()
    w = _norm(raw)
    if len(w) != 5 or not all("؀" <= ch <= "ۿ" for ch in w):
        raise HTTPException(status_code=400, detail="الكلمة يجب أن تكون عربية من 5 أحرف بعد التطبيع")
    _, bank_set = await _word_bank()
    if w in bank_set:
        raise HTTPException(status_code=400, detail="هذه الكلمة موجودة في البنك")
    res = await db.wordle_words.insert_one({"word": raw, "normalized": w, "added_by": user["id"], "created_at": now_iso()})
    return {"id": str(res.inserted_id), "word": raw}


@router.delete("/admin/words/{wid}")
async def admin_word_delete(wid: str, user: dict = Depends(require_permission("cms.manage"))):
    if not ObjectId.is_valid(wid):
        raise HTTPException(status_code=404, detail="الكلمة غير موجودة")
    r = await db.wordle_words.delete_one({"_id": ObjectId(wid)})
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="الكلمة غير موجودة")
    return {"ok": True}


class TextBody(BaseModel):
    text: str = Field(min_length=30, max_length=400)
    lang: str = "ar"


@router.get("/admin/texts")
async def admin_texts(user: dict = Depends(require_permission("cms.manage"))):
    custom = []
    async for d in db.typing_texts.find({}).sort("created_at", -1):
        custom.append({"id": str(d["_id"]), "text": d.get("text", ""), "lang": d.get("lang", "ar")})
    return {"builtin": len(TEXTS), "custom": custom}


@router.post("/admin/texts")
async def admin_text_add(body: TextBody, user: dict = Depends(require_permission("cms.manage"))):
    lang = body.lang if body.lang in ("ar", "en") else "ar"
    res = await db.typing_texts.insert_one({"text": body.text.strip(), "lang": lang,
                                             "added_by": user["id"], "created_at": now_iso()})
    return {"id": str(res.inserted_id)}


@router.delete("/admin/texts/{tid}")
async def admin_text_delete(tid: str, user: dict = Depends(require_permission("cms.manage"))):
    if not ObjectId.is_valid(tid):
        raise HTTPException(status_code=404, detail="النص غير موجود")
    r = await db.typing_texts.delete_one({"_id": ObjectId(tid)})
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="النص غير موجود")
    return {"ok": True}
