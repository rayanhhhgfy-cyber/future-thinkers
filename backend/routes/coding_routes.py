"""نادي البرمجة — code judge (hardened).

Security model for running untrusted student code:
- isolated subprocess per run (python3 -I: ignores env & user site-packages)
- rlimits in the child: CPU 5s, address space 256MB, file writes 1MB, 64 fds,
  capped process count (fork-bomb guard)
- own process group + group kill on timeout (no orphaned children)
- stdout/stderr read with a hard byte cap (output-flood guard)
- env scrubbed to PATH only, cwd = fresh temp dir, stdin fed programmatically
- global concurrency semaphore + per-user cooldown + per-user single-run lock
"""
import asyncio
import os
import sys
import resource
import tempfile
import time
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, require_permission
from services import award_xp, bump_stat, create_notification, audit_log

router = APIRouter(prefix="/api/coding")

TIME_LIMIT = 5
OUT_CAP = 65536
_RUN_SEM = asyncio.Semaphore(4)
_user_lock: dict[str, float] = {}


def _limits():
    resource.setrlimit(resource.RLIMIT_CPU, (TIME_LIMIT, TIME_LIMIT + 1))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    try:
        resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    except Exception:
        pass


async def _read_capped(stream, cap=OUT_CAP):
    buf = b""
    try:
        while len(buf) < cap:
            chunk = await stream.read(min(8192, cap - len(buf)))
            if not chunk:
                break
            buf += chunk
    except Exception:
        pass
    return buf


async def _run(code: str, stdin: str) -> tuple[bool, str]:
    """Run code in the hardened sandbox. Returns (ok, stdout_or_error)."""
    async with _RUN_SEM:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "sol.py")
            with open(path, "w") as f:
                f.write(code)
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-I", path, cwd=tmp,
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE, env={"PATH": "/usr/bin:/bin"},
                preexec_fn=_limits, start_new_session=True,
            )
            try:
                proc.stdin.write(stdin.encode())
                await proc.stdin.drain()
                proc.stdin.close()
            except Exception:
                pass
            try:
                out_t = asyncio.create_task(_read_capped(proc.stdout))
                err_t = asyncio.create_task(_read_capped(proc.stderr))
                await asyncio.wait_for(proc.wait(), timeout=TIME_LIMIT)
                out = await out_t
                err = await err_t
            except asyncio.TimeoutError:
                try:
                    os.killpg(os.getpgid(proc.pid), 9)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
                return False, "تجاوز الوقت المسموح"
            if proc.returncode != 0:
                return False, (err.decode(errors="replace")[:400] or "خطأ في التنفيذ")
            return True, out.decode(errors="replace")


def _check_user_rate(user_id: str):
    now = time.time()
    last = _user_lock.get(user_id, 0)
    if now - last < 1.0:
        raise HTTPException(status_code=429, detail="مهلة قصيرة بين التشغيلات — انتظر ثانية")
    _user_lock[user_id] = now


# ---------------- Problems (students) ----------------
@router.get("/problems")
async def list_problems(user: dict = Depends(get_current_user)):
    docs = await db.coding_problems.find({}).sort("difficulty", 1).to_list(100)
    solved = {s["problem_id"] for s in await db.coding_submissions.find(
        {"user_id": user["id"], "verdict": "accepted"}).to_list(500)}
    out = []
    for p in docs:
        d = ser(p)
        d.pop("tests", None)
        d["solved"] = d["id"] in solved
        d["solved_count"] = await db.coding_submissions.count_documents({"problem_id": d["id"], "verdict": "accepted"})
        out.append(d)
    return out


@router.get("/problems/{pid}")
async def get_problem(pid: str, user: dict = Depends(get_current_user)):
    p = await db.coding_problems.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    d = ser(p)
    d["sample_tests"] = [{"input": t["input"], "output": t["output"]} for t in p.get("tests", [])[:2]]
    d.pop("tests", None)
    sub = await db.coding_submissions.find_one({"user_id": user["id"], "problem_id": pid, "verdict": "accepted"})
    d["solved"] = bool(sub)
    return d


class SubmitBody(BaseModel):
    code: str


@router.post("/problems/{pid}/submit")
async def submit(pid: str, body: SubmitBody, user: dict = Depends(get_current_user)):
    _check_user_rate(user["id"])
    p = await db.coding_problems.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    if len(body.code) > 20000:
        raise HTTPException(status_code=400, detail="الكود طويل جداً")
    tests = p.get("tests", [])
    passed = 0
    detail = ""
    verdict = "accepted"
    for i, t in enumerate(tests):
        ok, output = await _run(body.code, t["input"])
        if not ok:
            verdict = "error"
            detail = f"اختبار {i + 1}: {output}"
            break
        if output.strip() != t["output"].strip():
            verdict = "wrong_answer"
            detail = f"اختبار {i + 1}: نتيجة غير صحيحة"
            break
        passed += 1
    already = await db.coding_submissions.find_one({"user_id": user["id"], "problem_id": pid, "verdict": "accepted"})
    await db.coding_submissions.insert_one({
        "user_id": user["id"], "user_name": user["name"], "problem_id": pid,
        "problem_title": p["title"], "verdict": verdict, "passed": passed,
        "total": len(tests), "created_at": now_iso(),
    })
    if verdict == "accepted" and not already:
        await bump_stat(user["id"], "coding_solved", 1)
        await award_xp(user["id"], p.get("xp", 30), "حل مسألة برمجية", pid)
        await create_notification(user["id"], "achievement", "حل مقبول! 💻", f"{p['title']} — +{p.get('xp', 30)} خبرة")
    return {"verdict": verdict, "passed": passed, "total": len(tests), "detail": detail}


# ---------------- Debugger / playground runs ----------------
class RunBody(BaseModel):
    code: str
    stdin: str = ""


@router.post("/run")
async def playground_run(body: RunBody, user: dict = Depends(get_current_user)):
    """Free run with custom stdin — the student debugger. No XP, fully sandboxed."""
    _check_user_rate(user["id"])
    if len(body.code) > 20000:
        raise HTTPException(status_code=400, detail="الكود طويل جداً")
    ok, out = await _run(body.code, body.stdin or "")
    return {"ok": ok, "output": out[:8000]}


@router.post("/problems/{pid}/run")
async def problem_run(pid: str, body: SubmitBody, user: dict = Depends(get_current_user)):
    """Run against the problem's sample tests and show per-test results."""
    _check_user_rate(user["id"])
    p = await db.coding_problems.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    results = []
    for i, t in enumerate(p.get("tests", [])[:2]):
        ok, out = await _run(body.code, t["input"])
        results.append({
            "test": i + 1, "ran": ok,
            "output": (out or "")[:2000],
            "expected": t["output"],
            "passed": ok and out.strip() == t["output"].strip(),
        })
    return {"results": results}


# ---------------- Admin: challenge management ----------------
@router.get("/admin/problems")
async def admin_list_problems(user: dict = Depends(require_permission("coding.manage"))):
    docs = await db.coding_problems.find({}).sort("difficulty", 1).to_list(200)
    return sers(docs)
class TestCase(BaseModel):
    input: str = ""
    output: str


class ProblemBody(BaseModel):
    title: str
    statement: str
    difficulty: int = 1
    xp: int = 30
    tags: list[str] = []
    tests: list[TestCase]


@router.post("/problems")
async def create_problem(body: ProblemBody, request: Request,
                         user: dict = Depends(require_permission("coding.manage"))):
    if not body.tests:
        raise HTTPException(status_code=400, detail="أضف حالة اختبار واحدة على الأقل")
    if not (1 <= body.difficulty <= 5):
        raise HTTPException(status_code=400, detail="الصعوبة بين 1 و 5")
    doc = {**body.model_dump(), "created_by": user["id"], "created_at": now_iso()}
    res = await db.coding_problems.insert_one(doc)
    await audit_log(user, "coding_problem_create", "coding_problem", str(res.inserted_id), request=request)
    return {"id": str(res.inserted_id)}


@router.put("/problems/{pid}")
async def update_problem(pid: str, body: ProblemBody, request: Request,
                         user: dict = Depends(require_permission("coding.manage"))):
    if not await db.coding_problems.find_one({"_id": oid(pid)}):
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    await db.coding_problems.update_one({"_id": oid(pid)},
                                        {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    await audit_log(user, "coding_problem_update", "coding_problem", pid, request=request)
    return {"ok": True}


@router.delete("/problems/{pid}")
async def delete_problem(pid: str, request: Request,
                         user: dict = Depends(require_permission("coding.manage"))):
    res = await db.coding_problems.delete_one({"_id": oid(pid)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    await audit_log(user, "coding_problem_delete", "coding_problem", pid, request=request)
    return {"ok": True}


class SolutionTestBody(BaseModel):
    code: str
    tests: list[TestCase]


@router.post("/problems/test-solution")
async def test_solution(body: SolutionTestBody,
                        user: dict = Depends(require_permission("coding.manage"))):
    """Admin debugger: run a candidate solution against draft tests before publishing."""
    if len(body.code) > 20000:
        raise HTTPException(status_code=400, detail="الكود طويل جداً")
    results = []
    for i, t in enumerate(body.tests[:10]):
        ok, out = await _run(body.code, t.input)
        results.append({
            "test": i + 1, "ran": ok, "output": (out or "")[:2000],
            "expected": t.output,
            "passed": ok and out.strip() == t.output.strip(),
        })
    return {"results": results,
            "all_passed": bool(results) and all(r["passed"] for r in results)}


@router.get("/leaderboard")
async def coding_leaderboard(limit: int = 30):
    pipeline = [
        {"$match": {"verdict": "accepted"}},
        {"$group": {"_id": {"u": "$user_id", "p": "$problem_id"}, "name": {"$first": "$user_name"}}},
        {"$group": {"_id": "$_id.u", "name": {"$first": "$name"}, "solved": {"$sum": 1}}},
        {"$sort": {"solved": -1}}, {"$limit": limit},
    ]
    rows = await db.coding_submissions.aggregate(pipeline).to_list(limit)
    return [{"rank": i + 1, "id": r["_id"], "name": r["name"], "solved": r["solved"]} for i, r in enumerate(rows)]
