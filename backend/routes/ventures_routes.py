"""مساحة المشاريع الطلابية: عرض أفكار مشاريع، تكوين فرق، متابعة التقدّم، تصويت."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, ser, oid, now_iso
from auth import get_current_user
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
    return user.get("role") in STAFF_ROLES


def _flags(doc: dict, user: dict) -> dict:
    uid = user["id"]
    members = doc.get("members", [])
    requests = doc.get("join_requests", [])
    return {
        "voted": uid in doc.get("votes", []),
        "is_owner": doc.get("owner_id") == uid,
        "is_member": any(m.get("id") == uid for m in members),
        "request_pending": any(r.get("id") == uid for r in requests),
        "team_count": 1 + len(members),
        "requests_count": len(requests),
    }


def _public(doc: dict, user: dict, detail: bool = False) -> dict:
    item = ser(doc)
    item.update(_flags(doc, user))
    item["status_label"] = STATUSES.get(doc.get("status"), doc.get("status"))
    if not detail:
        item.pop("join_requests", None)
        item.pop("updates", None)
    elif not _flags(doc, user)["is_owner"] and not _is_staff(user):
        item.pop("join_requests", None)
    return item


async def _get_venture(vid: str) -> dict:
    doc = await db.ventures.find_one({"_id": oid(vid)})
    if not doc:
        raise HTTPException(status_code=404, detail="المشروع غير موجود")
    return doc


@router.get("/ventures")
async def list_ventures(sort: str = "votes", category: str | None = None,
                        status: str | None = None, q: str | None = None, mine: bool = False,
                        user: dict = Depends(get_current_user)):
    query: dict = {}
    if mine:
        uid = user["id"]
        query["$or"] = [{"owner_id": uid}, {"members.id": uid}]
    if category and category != "الكل":
        query["category"] = category
    if status and status != "all":
        query["status"] = status
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"description": {"$regex": q, "$options": "i"}}]
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
async def get_venture(vid: str, user: dict = Depends(get_current_user)):
    return _public(await _get_venture(vid), user, detail=True)


@router.patch("/ventures/{vid}")
async def update_venture(vid: str, body: VenturePatch, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc["owner_id"] != user["id"] and not _is_staff(user):
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
            await award_xp(doc["owner_id"], 30, "إنجاز مشروع طلابي", vid)
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
    if doc["owner_id"] != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="غير مصرّح")
    await db.ventures.delete_one({"_id": doc["_id"]})
    return {"ok": True}


@router.post("/ventures/{vid}/join")
async def request_join(vid: str, body: JoinBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    uid = user["id"]
    if doc["owner_id"] == uid:
        raise HTTPException(status_code=400, detail="أنت صاحب المشروع")
    if any(m.get("id") == uid for m in doc.get("members", [])):
        raise HTTPException(status_code=400, detail="أنت عضو في الفريق مسبقاً")
    if any(r.get("id") == uid for r in doc.get("join_requests", [])):
        raise HTTPException(status_code=400, detail="طلبك قيد المراجعة")
    if 1 + len(doc.get("members", [])) >= doc.get("max_members", 5):
        raise HTTPException(status_code=400, detail="اكتمل عدد الفريق")
    req = {"id": uid, "name": user.get("name"), "message": body.message.strip(),
           "created_at": now_iso()}
    await db.ventures.update_one({"_id": doc["_id"]}, {"$push": {"join_requests": req}})
    await create_notification(doc["owner_id"], "venture_join",
                              f"طلب انضمام جديد لمشروعك: {doc['title']}",
                              f"{user.get('name')} يريد الانضمام إلى فريقك.",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/requests/{uid}/approve")
async def approve_join(vid: str, uid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc["owner_id"] != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع يعتمد الطلبات")
    req = next((r for r in doc.get("join_requests", []) if r.get("id") == uid), None)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if 1 + len(doc.get("members", [])) >= doc.get("max_members", 5):
        raise HTTPException(status_code=400, detail="اكتمل عدد الفريق")
    await db.ventures.update_one(
        {"_id": doc["_id"]},
        {"$pull": {"join_requests": {"id": uid}},
         "$push": {"members": {"id": uid, "name": req.get("name"), "joined_at": now_iso()}}})
    await create_notification(uid, "venture_approved",
                              f"تم قبولك في مشروع: {doc['title']}",
                              "أصبحت عضواً في الفريق · بالتوفيق!",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/requests/{uid}/reject")
async def reject_join(vid: str, uid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc["owner_id"] != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع يرفض الطلبات")
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$pull": {"join_requests": {"id": uid}}})
    await create_notification(uid, "venture_rejected",
                              f"لم يتم قبول طلبك في مشروع: {doc['title']}",
                              "يمكنك التقديم لمشاريع أخرى تناسبك.",
                              f"/ventures/{vid}")
    return {"ok": True}


@router.post("/ventures/{vid}/leave")
async def leave_venture(vid: str, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if not any(m.get("id") == user["id"] for m in doc.get("members", [])):
        raise HTTPException(status_code=400, detail="لست عضواً في الفريق")
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$pull": {"members": {"id": user["id"]}}})
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
    if doc["owner_id"] != user["id"]:
        await award_xp(doc["owner_id"], 3, "تصويت لمشروعك الطلابي", vid)
    return {"voted": True}


@router.post("/ventures/{vid}/updates")
async def add_update(vid: str, body: UpdateBody, user: dict = Depends(get_current_user)):
    doc = await _get_venture(vid)
    if doc["owner_id"] != user["id"] and not _is_staff(user):
        raise HTTPException(status_code=403, detail="فقط صاحب المشروع ينشر التحديثات")
    upd = {"title": body.title.strip(), "text": body.text.strip(),
           "author_name": user.get("name"), "created_at": now_iso()}
    await db.ventures.update_one({"_id": doc["_id"]},
                                 {"$push": {"updates": {"$each": [upd], "$position": 0}}})
    return {"ok": True}
