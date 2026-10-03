"""مساحة المشاريع الطلابية: عرض أفكار مشاريع، تكوين فرق، متابعة التقدّم، تصويت."""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, ser, oid, now_iso
from auth import get_current_user, get_optional_user, effective_permissions
from services import award_xp, create_notification

router = APIRouter(prefix="/api")

STAFF_ROLES = {"moderator", "admin", "super_admin", "school_admin", "directorate_admin"}

CATEGORIES = ["تقنية وبرمجة", "ريادة أعمال", "علمي", "بيئي", "مجتمعي",
              "ثقافي وأدبي", "فني وإعلامي", "أخرى"]
STATUSES = {"idea": "فكرة", "in_progress": "قيد التنفيذ", "completed": "مكتمل"}


class VentureBody(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    category: str = "أخرى"
    looking_for: str = Field(default="", max_length=500)
    max_members: int = Field(default=5, ge=2, le=20)


class VenturePatch(BaseModel):
    description: str | None = Field(default=None, max_length=5000)
    category: str | None = None
    looking_for: str | None = Field(default=None, max_length=500)
    max_members: int | None = Field(default=None, ge=2, le=20)
    status: str | None = None


class JoinBody(BaseModel):
    message: str = Field(default="", max_length=500)


class UpdateBody(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    text: str = Field(min_length=1, max_length=2000)


def _is_staff(user: dict) -> bool:
    return bool(user) and user.get("role") in STAFF_ROLES


def _pid(person) -> str | None:
    """معرّف شخص من عضو/طلب مخزّن · يتحمّل الصيغ القديمة (نص خام) والحديثة (كائن)."""
    if isinstance(person, dict):
        return person.get("id") or person.get("user_id")
    if isinstance(person, str):
        return person
    return None


def _pname(person) -> str:
    return (person.get("name") or "") if isinstance(person, dict) else ""


def _flags(doc: dict, user: dict | None) -> dict:
    uid = (user or {}).get("id")
    members = doc.get("members") or []
    requests = doc.get("join_requests") or []
    return {
        "voted": bool(uid) and uid in (doc.get("votes") or []),
        "is_owner": bool(uid) and doc.get("owner_id") == uid,
        "is_member": bool(uid) and any(_pid(m) == uid for m in members),
        "request_pending": bool(uid) and any(_pid(r) == uid for r in requests),
        "team_count": 1 + len(members),
        "requests_count": len(requests),
    }


def _public(doc: dict, user: dict | None, detail: bool = False) -> dict:
    item = ser(doc)
    item.update(_flags(doc, user))
    item["status_label"] = STATUSES.get(doc.get("status"), doc.get("status"))
    item.pop("votes", None)
    if not detail:
        item.pop("join_requests", None)
        item.pop("updates", None)
        item.pop("members", None)
    elif not _flags(doc, user)["is_owner"] and not _is_staff(user or {}):
        item.pop("join_requests", None)
    if detail and isinstance(item.get("members"), list):
        item["members"] = [
            m if isinstance(m, dict) else {"id": m, "name": ""}
            for m in item["members"]]
    if detail and isinstance(item.get("join_requests"), list):
        item["join_requests"] = [
            r if isinstance(r, dict) else {"id": r, "name": "", "message": ""}
            for r in item["join_requests"]]
    return item


async def _get_venture(vid: str) -> dict:
    doc = await db.ventures.find_one({"_id": oid(vid)})
    if not doc:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    return doc


@router.get("/ventures")
async def list_ventures(sort: str = "votes", category: str | None = None,
                        status: str | None = None, q: str | None = None, mine: bool = False,
                        user: dict = Depends(get_optional_user)):
    query: dict = {}
    extra: list = []
    if mine and user:
        uid = user["id"]
        extra.append({"$or": [{"owner_id": uid}, {"members.id": uid}]})
    if category and category != "الكل":
        query["category"] = category
    if status and status != "all":
        query["status"] = status
    if q:
        extra.append({"$or": [{"title": {"$regex": q, "$options": "i"}},
                             {"description": {"$regex": q, "$options": "i"}}]})
    if extra:
        query["$and"] = extra
    sf = ("votes_count", -1) if sort == "votes" else ("created_at", -1)
    docs = await db.ventures.find(query).sort(*sf).to_list(200)
    return [_public(d, user) for d in docs]


@router.post("/ventures")
async def create_venture(body: VentureBody, user: dict = Depends(get_current_user)):
    category = body.category if body.category in CATEGORIES else "أخرى"
    doc = {
        "title": body.title.strip(), "description": body.description.strip(),
        "category": category, "looking_for": body.looking_for.strip(),
        "max_members": body.max_members, "status": "idea",
        "owner_id": user["id"], "owner_name": user.get("name"),
        "school_name": user.get("school_name"),
        "members": [], "join_requests": [],
        "votes": [], "votes_count": 0, "updates": [],
        "created_at": now_iso(),
    }
    res = await db.ventures.insert_one(doc)
    await award_xp(user["id"], 20, "نشر مشروع طلابي", str(res.inserted_id))
    return {"id": str(res.inserted_id)}


@router.get("/ventures/{vid}")
async def get_venture(vid: str, user: dict = Depends(get_optional_user)):
    doc = await _get_venture(vid)
    item = _public(doc, user, detail=True)
    item["milestones"] = [
        {"id": m.get("id"), "title": m.get("title", ""), "done": bool(m.get("done")),
         "done_by": m.get("done_by"), "at": m.get("at")}
        for m in (doc.get("milestones") or [])]
    item["followers_count"] = await db.venture_follows.count_documents({"venture_id": vid})
    item["following"] = bool(user) and bool(await db.venture_follows.find_one(
        {"venture_id": vid, "user_id": user["id"]}))
    item["comments_count"] = await db.venture_comments.count_documents({"venture_id": vid})
    return item


@router.patch("/ventures/{vid}")
async def update_venture(vid: str, body: VenturePatch, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc.get("owner_id") != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع يمكنه التعديل")
    patch: dict = {}
    if body.description is not None:
        patch["description"] = body.description.strip()
    if body.category is not None and body.category in CATEGORIES:
        patch["category"] = body.category
    if body.looking_for is not None:
        patch["looking_for"] = body.looking_for.strip()
    if body.max_members is not None:
        if body.max_members < 1 + len(doc.get("members", [])):
            raise HTTPException(status_code=400, detail="الحد الأدنى للفريق هو عدد الأعضاء الحاليين")
        patch["max_members"] = body.max_members
    if body.status is not None:
        if body.status not in STATUSES:
            raise HTTPException(status_code=400, detail="حالة غير صالحة")
        if doc.get("status") != "completed" and body.status == "completed":
            patch["status"] = "completed"
            # مكافأة إنجاز المشروع للمالك والفريق
            await award_xp(doc.get("owner_id"), 30, "إنجاز مشروع طلابي", vid)
            for m in doc.get("members", []):
                await award_xp(m["id"], 15, "إنجاز مشروع طلابي ضمن فريق", vid)
        else:
            patch["status"] = body.status
    if patch:
        await db.ventures.update_one({"_id": doc["_id"]}, {"$set": patch})
    return _public(await _get_venture(vid), user, detail=True)


@router.delete("/ventures/{vid}")
async def delete_venture(vid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc.get("owner_id") != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="غير مصرّح")
    await db.ventures.delete_one({"_id": doc["_id"]})
    return {"ok": True}


@router.post("/ventures/{vid}/join")
async def request_join(vid: str, body: JoinBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    uid = user["id"]
    if doc.get("owner_id") == uid:
        raise HTTPException(status_code=400, detail="أنت صاحب المشروع")
    if any(_pid(m) == uid for m in doc.get("members") or []):
        raise HTTPException(status_code=400, detail="أنت عضو في الفريق مسبقاً")
    if any(_pid(r) == uid for r in doc.get("join_requests") or []):
        raise HTTPException(status_code=400, detail="طلبك قيد المراجعة")
    if 1 + len(doc.get("members") or []) >= doc.get("max_members", 5):
        raise HTTPException(status_code=400, detail="اكتمل عدد الفريق")
    req = {"id": uid, "name": user.get("name"), "message": body.message.strip(),
           "created_at": now_iso()}
    await db.ventures.update_one({"_id": doc["_id"]}, {"$push": {"join_requests": req}})
    await create_notification(doc.get("owner_id"), "venture_join",
                              f"طلب انضمام جديد لمشروعك: {doc['title']}",
                              f"{user.get('name')} يريد الانضمام إلى فريقك.",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/requests/{uid}/approve")
async def approve_join(vid: str, uid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc.get("owner_id") != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع يعتمد الطلبات")
    req = next((r for r in (doc.get("join_requests") or []) if _pid(r) == uid), None)
    if req is None:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if 1 + len(doc.get("members") or []) >= doc.get("max_members", 5):
        raise HTTPException(status_code=400, detail="اكتمل عدد الفريق")
    await db.ventures.update_one(
        {"_id": doc["_id"]},
        {"$pull": {"join_requests": req},
         "$push": {"members": {"id": uid, "name": _pname(req), "joined_at": now_iso()}}})
    await create_notification(uid, "venture_approved",
                              f"تم قبولك في مشروع: {doc['title']}",
                              "أصبحت عضواً في الفريق · بالتوفيق!",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/requests/{uid}/reject")
async def reject_join(vid: str, uid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc.get("owner_id") != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع يرفض الطلبات")
    req = next((r for r in (doc.get("join_requests") or []) if _pid(r) == uid), None)
    if req is not None:
        await db.ventures.update_one({"_id": doc["_id"]},
                                     {"$pull": {"join_requests": req}})
    await create_notification(uid, "venture_rejected",
                              f"لم يتم قبول طلبك في مشروع: {doc['title']}",
                              "يمكنك التقديم لمشاريع أخرى تناسبك.",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/leave")
async def leave_venture(vid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if not any(_pid(m) == user["id"] for m in doc.get("members") or []):
        raise HTTPException(status_code=400, detail="لست عضواً في الفريق")
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$pull": {"members": {"id": user["id"]}}})
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$pull": {"members": user["id"]}})
    return {"ok": True}


@router.post("/ventures/{vid}/vote")
async def vote_venture(vid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if user["id"] in doc.get("votes", []):
        await db.ventures.update_one({"_id": doc["_id"]},
                                     {"$pull": {"votes": user["id"]},
                                      "$inc": {"votes_count": -1}})
        return {"voted": False}
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$addToSet": {"votes": user["id"]},
                                  "$inc": {"votes_count": 1}})
    if doc.get("owner_id") and doc.get("owner_id") != user["id"]:
        await award_xp(doc.get("owner_id"), 3, "تصويت لمشروعك الطلابي", vid)
    return {"voted": True}


@router.post("/ventures/{vid}/updates")
async def add_update(vid: str, body: UpdateBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc.get("owner_id") != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع ينشر التحديثات")
    upd = {"title": body.title.strip(), "text": body.text.strip(),
           "author_name": user.get("name"), "created_at": now_iso()}
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$push": {"updates": {"$each": [upd], "$position": 0}}})
    # إشعار المتابعين بالتحديث الجديد
    async for f in db.venture_follows.find({"venture_id": vid}, {"user_id": 1}):
        if f.get("user_id") and f["user_id"] != user["id"]:
            await create_notification(f["user_id"], "venture_update",
                                      "تحديث في مشروع تتابعه",
                                      f"{doc['title']}: {upd['title']}",
                                      f"/ventures/{vid}")
    return {"ok": True}


# ---------------- المتابعة ----------------
@router.post("/ventures/{vid}/follow")
async def toggle_follow(vid: str, user: dict = Depends(get_current_user)):
    await _get_venture(vid)
    existing = await db.venture_follows.find_one({"venture_id": vid, "user_id": user["id"]})
    if existing:
        await db.venture_follows.delete_one({"_id": existing["_id"]})
        return {"following": False}
    await db.venture_follows.insert_one(
        {"venture_id": vid, "user_id": user["id"], "at": now_iso()})
    return {"following": True}


# ---------------- التعليقات ----------------
class CommentBody(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


def _comment_item(c: dict, me: str | None) -> dict:
    return {"id": str(c["_id"]),
            "user": {"id": c.get("user_id"), "name": c.get("name", "")},
            "text": c.get("text", ""), "at": c.get("at"), "mine": c.get("user_id") == me}


@router.get("/ventures/{vid}/comments")
async def list_comments(vid: str, user: dict = Depends(get_optional_user)):
    await _get_venture(vid)
    docs = await db.venture_comments.find({"venture_id": vid}).sort("at", 1).to_list(200)
    return {"items": [_comment_item(c, (user or {}).get("id")) for c in docs]}


@router.post("/ventures/{vid}/comments")
async def add_comment(vid: str, body: CommentBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    c = {"venture_id": vid, "user_id": user["id"], "name": user.get("name", ""),
         "text": body.text.strip(), "at": now_iso()}
    res = await db.venture_comments.insert_one(c)
    c["_id"] = res.inserted_id
    if doc.get("owner_id") and doc["owner_id"] != user["id"]:
        await create_notification(doc["owner_id"], "venture_comment",
                                  "تعليق جديد على مشروعك",
                                  f"{user.get('name')}: {c['text'][:120]}",
                                  f"/ventures/{vid}")
    return _comment_item(c, user["id"])


@router.delete("/ventures/{vid}/comments/{cid}")
async def delete_comment(vid: str, cid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    c = await db.venture_comments.find_one({"_id": oid(cid), "venture_id": vid})
    if not c:
        raise HTTPException(status_code=404, detail="التعليق غير موجود")
    allowed = (c.get("user_id") == user["id"] or doc.get("owner_id") == user["id"]
               or user.get("role") in ("admin", "super_admin")
               or "venture.manage" in effective_permissions(user))
    if not allowed:
        raise HTTPException(status_code=403, detail="غير مصرّح بحذف هذا التعليق")
    await db.venture_comments.delete_one({"_id": c["_id"]})
    return {"ok": True}


# ---------------- مراحل المشروع ----------------
class MilestoneBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)


def _is_team(doc: dict, user: dict) -> bool:
    flags = _flags(doc, user)
    return flags["is_owner"] or flags["is_member"]


def _milestones_view(doc: dict) -> tuple[list, int]:
    items = [{"id": m.get("id"), "title": m.get("title", ""), "done": bool(m.get("done")),
              "done_by": m.get("done_by"), "at": m.get("at")}
             for m in (doc.get("milestones") or [])]
    pct = round(sum(1 for m in items if m["done"]) * 100 / len(items)) if items else 0
    return items, pct


@router.get("/ventures/{vid}/milestones")
async def list_milestones(vid: str, user: dict = Depends(get_optional_user)):
    doc = await _get_venture(vid)
    items, pct = _milestones_view(doc)
    return {"items": items, "pct": pct}


@router.post("/ventures/{vid}/milestones")
async def add_milestone(vid: str, body: MilestoneBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if not _is_team(doc, user):
        raise HTTPException(status_code=403, detail="فقط فريق المشروع يضيف المراحل")
    m = {"id": uuid.uuid4().hex[:12], "title": body.title.strip(),
         "done": False, "done_by": None, "at": now_iso()}
    await db.ventures.update_one({"_id": doc["_id"]}, {"$push": {"milestones": m}})
    return m


@router.post("/ventures/{vid}/milestones/{mid}/toggle")
async def toggle_milestone(vid: str, mid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if not _is_team(doc, user):
        raise HTTPException(status_code=403, detail="فقط فريق المشروع يعدّل المراحل")
    milestones = list(doc.get("milestones") or [])
    target = next((m for m in milestones if m.get("id") == mid), None)
    if target is None:
        raise HTTPException(status_code=404, detail="المرحلة غير موجودة")
    target["done"] = not target.get("done")
    target["done_by"] = user["id"] if target["done"] else None
    target["at"] = now_iso()
    items, pct = _milestones_view({"milestones": milestones})
    update = {"milestones": milestones}
    celebrated_now = False
    if pct == 100 and not doc.get("milestones_celebrated"):
        update["milestones_celebrated"] = True
        celebrated_now = True
    await db.ventures.update_one({"_id": doc["_id"]}, {"$set": update})
    if celebrated_now:
        recipients = {doc.get("owner_id")}
        recipients.update(_pid(m) for m in doc.get("members") or [])
        async for f in db.venture_follows.find({"venture_id": vid}, {"user_id": 1}):
            recipients.add(f.get("user_id"))
        for rid in recipients:
            if rid and rid != user["id"]:
                await create_notification(rid, "venture_milestones_done",
                                          "اكتملت مراحل المشروع",
                                          f"أنهى فريق «{doc['title']}» جميع مراحل المشروع 🎉",
                                          f"/ventures/{vid}")
    return {"items": items, "pct": pct}


# ---------------- مشاريع مشابهة ----------------
@router.get("/ventures/{vid}/similar")
async def similar_ventures(vid: str, user: dict = Depends(get_optional_user)):
    doc = await _get_venture(vid)
    docs = await db.ventures.find(
        {"category": doc.get("category"), "_id": {"$ne": doc["_id"]}}
    ).sort("votes_count", -1).to_list(6)
    return {"items": [{"id": str(d["_id"]), "title": d.get("title", ""),
                       "category": d.get("category", ""),
                       "team_count": 1 + len(d.get("members") or []),
                       "votes_count": d.get("votes_count", 0),
                       "status": d.get("status", "")} for d in docs]}
