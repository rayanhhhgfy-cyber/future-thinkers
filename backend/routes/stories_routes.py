"""قصص «اختر مغامرتك» · branching stories written by students, read by all.

A story is one doc: nodes = {key: {text, choices: [{label, to}]}}.
Nodes with no choices are endings. Reading progress is server-side, so
the one-time finish XP (15) can only be earned by actually walking a
path from the start to an ending.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from bson import ObjectId

from db import db, ser, now_iso
from auth import get_current_user
from services import award_xp, create_notification
from routes.control_routes import get_games_config, section_open

router = APIRouter(prefix="/api/stories")
FINISH_XP = 15
COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#E11D48", "#0891B2", "#0A192F"]


class ChoiceIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    to: str = Field(min_length=1, max_length=40)


class NodeIn(BaseModel):
    key: str = Field(min_length=1, max_length=40)
    text: str = Field(min_length=10, max_length=4000)
    choices: list[ChoiceIn] = Field(default_factory=list, max_length=4)


class StoryBody(BaseModel):
    title: str = Field(min_length=3, max_length=90)
    desc: str = Field(default="", max_length=300)
    color: str = "#7C3AED"
    start: str = Field(min_length=1, max_length=40)
    nodes: list[NodeIn] = Field(min_length=2, max_length=60)
    publish: bool = False


def _validate_story(body: StoryBody):
    keys = [n.key for n in body.nodes]
    if len(set(keys)) != len(keys):
        raise HTTPException(status_code=400, detail="مفاتيح المشاهد مكررة")
    kset = set(keys)
    if body.start not in kset:
        raise HTTPException(status_code=400, detail="مشهد البداية غير موجود")
    endings = 0
    for n in body.nodes:
        if not n.choices:
            endings += 1
        for c in n.choices:
            if c.to not in kset:
                raise HTTPException(status_code=400, detail=f"اختيار يشير إلى مشهد غير موجود: {c.to}")
    if endings == 0:
        raise HTTPException(status_code=400, detail="القصة تحتاج نهاية واحدة على الأقل (مشهد بلا اختيارات)")
    nodes = {n.key: {"text": n.text, "choices": [{"label": c.label, "to": c.to} for c in n.choices]}
             for n in body.nodes}
    return nodes


async def _story_or_404(sid: str, user: dict, mine_ok_private=True):
    if not ObjectId.is_valid(sid):
        raise HTTPException(status_code=404, detail="القصة غير موجودة")
    st = await db.stories.find_one({"_id": ObjectId(sid)})
    if not st:
        raise HTTPException(status_code=404, detail="القصة غير موجودة")
    if st.get("status") != "published" and st.get("author_id") != user["id"]:
        raise HTTPException(status_code=404, detail="القصة غير موجودة")
    return st


async def _progress(uid: str, sid: str):
    return await db.story_progress.find_one({"user_id": uid, "story_id": sid})


@router.get("")
async def _stories_open():
    if not await section_open("stories"):
        raise HTTPException(status_code=403, detail="قسم القصص متوقف مؤقتاً بقرار الإدارة")


async def list_stories(user: dict = Depends(get_current_user)):
    await _stories_open()
    docs = await db.stories.find(
        {"$or": [{"status": "published"}, {"author_id": user["id"]}]},
    ).sort("created_at", -1).to_list(100)
    progs = await db.story_progress.find({"user_id": user["id"]}).to_list(200)
    pmap = {p["story_id"]: p for p in progs}
    authors = {}
    ids = list({d["author_id"] for d in docs})
    if ids:
        for u in await db.users.find({"_id": {"$in": [ObjectId(i) for i in ids if ObjectId.is_valid(i)]}}).to_list(100):
            authors[str(u["_id"])] = u.get("name", "طالب")
    out = []
    for d in docs:
        o = ser(d)
        o.pop("nodes", None)
        o["author_name"] = authors.get(d["author_id"], "طالب")
        o["nodes_count"] = len(d.get("nodes", {}))
        p = pmap.get(str(d["_id"]))
        o["my_progress"] = ({"node": p["node"], "finished": bool(p.get("finished"))} if p else None)
        out.append(o)
    return {"stories": out}


@router.post("")
async def create_story(body: StoryBody, user: dict = Depends(get_current_user)):
    nodes = _validate_story(body)
    doc = {"author_id": user["id"], "title": body.title.strip(), "desc": body.desc.strip(),
           "color": body.color if body.color in COLORS else COLORS[0],
           "start": body.start, "nodes": nodes,
           "status": "published" if body.publish else "draft",
           "reads": 0, "finishes": 0, "created_at": now_iso()}
    res = await db.stories.insert_one(doc)
    return {"id": str(res.inserted_id), "status": doc["status"]}


@router.get("/{sid}")
async def get_story(sid: str, user: dict = Depends(get_current_user)):
    st = await _story_or_404(sid, user)
    p = await _progress(user["id"], sid)
    out = ser(st)
    out["author_name"] = user.get("name") if st["author_id"] == user["id"] else out.get("author_name", "")
    if st["author_id"] != user["id"]:
        au = await db.users.find_one({"_id": ObjectId(st["author_id"])})
        out["author_name"] = au.get("name", "طالب") if au else "طالب"
    out["my_progress"] = ({"node": p["node"], "finished": bool(p.get("finished")),
                           "path": p.get("path", [])} if p else None)
    out["is_mine"] = st["author_id"] == user["id"]
    return out


class MoveBody(BaseModel):
    to: str = Field(min_length=1, max_length=40)


@router.post("/{sid}/move")
async def story_move(sid: str, body: MoveBody, user: dict = Depends(get_current_user)):
    st = await _story_or_404(sid, user)
    nodes = st.get("nodes", {})
    p = await _progress(user["id"], sid)
    current = p["node"] if p else st["start"]
    if body.to == st["start"] and not p:
        current = st["start"]
    cur_node = nodes.get(current)
    if cur_node is None:
        raise HTTPException(status_code=400, detail="حالة قراءة غير صالحة")
    allowed = {c["to"] for c in cur_node.get("choices", [])}
    if body.to != current and body.to not in allowed:
        raise HTTPException(status_code=400, detail="لا يمكنك القفز إلى هذا المشهد مباشرة")
    target = nodes.get(body.to)
    if target is None:
        raise HTTPException(status_code=400, detail="مشهد غير موجود")
    is_end = len(target.get("choices", [])) == 0
    path = (p.get("path", []) if p else [st["start"]])
    if body.to != current:
        path = path + [body.to]
    xp = 0
    finished_now = False
    if is_end and not (p and p.get("finished")):
        finished_now = True
    updates = {"node": body.to, "path": path, "updated_at": now_iso()}
    if finished_now:
        updates["finished"] = True
        if not (p and p.get("xp_given")):
            updates["xp_given"] = True
            xp = (await get_games_config())["story_finish_xp"]
    await db.story_progress.update_one(
        {"user_id": user["id"], "story_id": sid},
        {"$set": updates, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True)
    if not p:
        await db.stories.update_one({"_id": st["_id"]}, {"$inc": {"reads": 1}})
    if finished_now:
        await db.stories.update_one({"_id": st["_id"]}, {"$inc": {"finishes": 1}})
    if xp:
        await award_xp(user["id"], xp, "قصة تفاعلية", ref=f"story:{sid}")
        if st["author_id"] != user["id"]:
            await create_notification(st["author_id"], "achievement",
                                      "📖 قارئ أنهى قصتك!", f"أنهى {user.get('name', 'طالب')} قصة «{st['title']}»",
                                      "/stories")
    return {"node": body.to, "text": target["text"], "choices": target.get("choices", []),
            "is_end": is_end, "finished": bool(updates.get("finished") or (p and p.get("finished"))),
            "xp_awarded": xp, "path": path}


@router.post("/{sid}/restart")
async def story_restart(sid: str, user: dict = Depends(get_current_user)):
    st = await _story_or_404(sid, user)
    await db.story_progress.update_one(
        {"user_id": user["id"], "story_id": sid},
        {"$set": {"node": st["start"], "path": [st["start"]], "updated_at": now_iso()}},
        upsert=True)
    node = st["nodes"][st["start"]]
    return {"node": st["start"], "text": node["text"], "choices": node.get("choices", []), "is_end": False}


@router.put("/{sid}")
async def update_story(sid: str, body: StoryBody, user: dict = Depends(get_current_user)):
    st = await _story_or_404(sid, user)
    if st["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليست قصتك")
    nodes = _validate_story(body)
    await db.stories.update_one({"_id": st["_id"]}, {"$set": {
        "title": body.title.strip(), "desc": body.desc.strip(),
        "color": body.color if body.color in COLORS else COLORS[0],
        "start": body.start, "nodes": nodes,
        "status": "published" if body.publish else st.get("status", "draft")}})
    return {"ok": True}


@router.delete("/{sid}")
async def delete_story(sid: str, user: dict = Depends(get_current_user)):
    st = await _story_or_404(sid, user)
    if st["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="ليست قصتك")
    await db.stories.delete_one({"_id": st["_id"]})
    await db.story_progress.delete_many({"story_id": sid})
    return {"ok": True}
