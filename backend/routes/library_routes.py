"""المكتبة الشخصية · قوائم كتب مخصصة مثل قوائم تشغيل سبوتيفاي."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, ser, oid, now_iso
from auth import get_current_user

router = APIRouter(prefix="/api/library")


class PlaylistBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = "#2563EB"
    icon: str = "ListMusic"


class PlaylistPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = None
    icon: str | None = None


class AddBookBody(BaseModel):
    book_id: str


async def _books_by_ids(ids):
    oids = [oid(i) for i in ids if oid(i)]
    if not oids:
        return {}
    docs = await db.books.find({"_id": {"$in": oids}}).to_list(500)
    out = {}
    for b in docs:
        d = ser(b)
        if not d.get("cover_url") and b.get("cover_path"):
            d["cover_url"] = b["cover_path"]
        out[str(b["_id"])] = {"id": d["id"], "title": b.get("title", ""),
                              "author": b.get("author", ""), "cover_url": d.get("cover_url"),
                              "rating_avg": b.get("rating_avg", 0)}
    return out


def _playlist_out(p, books_map=None):
    d = ser(p)
    ids = p.get("book_ids", [])
    d["count"] = len(ids)
    if books_map is not None:
        d["books"] = [books_map[i] for i in ids if i in books_map]
    else:
        d["books"] = []
    return d


async def _owned_playlist(pid: str, user_id: str):
    p = await db.playlists.find_one({"_id": oid(pid), "user_id": user_id})
    if not p:
        raise HTTPException(status_code=404, detail="القائمة غير موجودة")
    return p


@router.get("/playlists")
async def list_playlists(user: dict = Depends(get_current_user)):
    docs = await db.playlists.find({"user_id": user["id"]}).sort("updated_at", -1).to_list(100)
    all_ids = [bid for p in docs for bid in p.get("book_ids", [])]
    books_map = await _books_by_ids(all_ids)
    return [_playlist_out(p, books_map) for p in docs]


@router.post("/playlists")
async def create_playlist(body: PlaylistBody, user: dict = Depends(get_current_user)):
    res = await db.playlists.insert_one({
        "user_id": user["id"], "name": body.name.strip(), "color": body.color,
        "icon": body.icon, "book_ids": [], "created_at": now_iso(), "updated_at": now_iso(),
    })
    doc = await db.playlists.find_one({"_id": res.inserted_id})
    return _playlist_out(doc, {})


@router.get("/playlists/{pid}")
async def get_playlist(pid: str, user: dict = Depends(get_current_user)):
    p = await _owned_playlist(pid, user["id"])
    books_map = await _books_by_ids(p.get("book_ids", []))
    return _playlist_out(p, books_map)


@router.patch("/playlists/{pid}")
async def update_playlist(pid: str, body: PlaylistPatch, user: dict = Depends(get_current_user)):
    p = await _owned_playlist(pid, user["id"])
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if "name" in patch:
        patch["name"] = patch["name"].strip()
    patch["updated_at"] = now_iso()
    await db.playlists.update_one({"_id": p["_id"]}, {"$set": patch})
    doc = await db.playlists.find_one({"_id": p["_id"]})
    books_map = await _books_by_ids(doc.get("book_ids", []))
    return _playlist_out(doc, books_map)


@router.delete("/playlists/{pid}")
async def delete_playlist(pid: str, user: dict = Depends(get_current_user)):
    p = await _owned_playlist(pid, user["id"])
    await db.playlists.delete_one({"_id": p["_id"]})
    return {"ok": True}


@router.post("/playlists/{pid}/books")
async def add_book(pid: str, body: AddBookBody, user: dict = Depends(get_current_user)):
    p = await _owned_playlist(pid, user["id"])
    book = await db.books.find_one({"_id": oid(body.book_id)})
    if not book:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    if body.book_id not in p.get("book_ids", []):
        await db.playlists.update_one(
            {"_id": p["_id"]},
            {"$push": {"book_ids": body.book_id}, "$set": {"updated_at": now_iso()}})
    doc = await db.playlists.find_one({"_id": p["_id"]})
    books_map = await _books_by_ids(doc.get("book_ids", []))
    return _playlist_out(doc, books_map)


@router.delete("/playlists/{pid}/books/{book_id}")
async def remove_book(pid: str, book_id: str, user: dict = Depends(get_current_user)):
    p = await _owned_playlist(pid, user["id"])
    await db.playlists.update_one(
        {"_id": p["_id"]},
        {"$pull": {"book_ids": book_id}, "$set": {"updated_at": now_iso()}})
    doc = await db.playlists.find_one({"_id": p["_id"]})
    books_map = await _books_by_ids(doc.get("book_ids", []))
    return _playlist_out(doc, books_map)
