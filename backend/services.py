"""Shared domain services: gamification (XP/levels/badges/achievements),
notifications, and audit logging. All persist to MongoDB (source of truth)."""
import asyncio
import json
import os

from bson import ObjectId
from db import db, now_iso


def level_for_xp(xp: int) -> int:
    lvl = 1
    while xp >= level_threshold(lvl + 1):
        lvl += 1
    return lvl


def level_threshold(level: int) -> int:
    # cumulative XP required to reach a level (quadratic curve)
    return int(100 * (level - 1) * level / 2)


LEVEL_TITLES = {
    1: "قارئ مبتدئ", 3: "مستكشف معرفي", 5: "مفكر ناشئ",
    8: "باحث متميز", 12: "عقل نيّر", 18: "مفكّر المستقبل",
}


def level_title(level: int) -> str:
    title = "قارئ مبتدئ"
    for lvl, t in sorted(LEVEL_TITLES.items()):
        if level >= lvl:
            title = t
    return title


async def award_xp(user_id: str, amount: int, reason: str, ref: str = None):
    if amount == 0:
        return
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    new_xp = max(0, user.get("xp", 0) + amount)
    old_level = user.get("level", 1)
    new_level = level_for_xp(new_xp)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"xp": new_xp, "level": new_level, "level_title": level_title(new_level)}},
    )
    await db.xp_transactions.insert_one({
        "user_id": user_id, "amount": amount, "reason": reason,
        "ref": ref, "balance": new_xp, "created_at": now_iso(),
    })
    if new_level > old_level:
        await create_notification(
            user_id, "achievement", "🎉 ترقية مستوى!",
            f"وصلت إلى المستوى {new_level} — {level_title(new_level)}",
        )
    await check_achievements(user_id)


async def check_achievements(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    owned = set(user.get("achievements", []))
    stats = user.get("stats", {})
    unlocked = []
    achievements = await db.achievements.find({}).to_list(200)
    for a in achievements:
        key = a["key"]
        if key in owned:
            continue
        metric = a.get("metric")
        threshold = a.get("threshold", 0)
        value = 0
        if metric == "xp":
            value = user.get("xp", 0)
        elif metric == "level":
            value = user.get("level", 1)
        else:
            value = stats.get(metric, 0)
        if value >= threshold:
            unlocked.append(a)
    for a in unlocked:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"achievements": a["key"], "badges": a.get("badge", a["key"])}},
        )
        await create_notification(
            user_id, "achievement", f"🏅 إنجاز جديد: {a['title']}", a.get("description", ""),
        )
        await log_activity(user_id, "badge", f"فتح إنجاز «{a['title']}» 🏅")


async def bump_stat(user_id: str, stat: str, delta: int = 1):
    await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$inc": {f"stats.{stat}": delta}}
    )
    kind = _STAT_TO_QUEST.get(stat)
    if kind and delta > 0:
        await track_quest(user_id, kind, delta)
    await check_achievements(user_id)


_PREF_MAP = {"achievement": "achievements", "certificate": "achievements", "follow": "social"}


def _pref_key(type_: str):
    if type_.startswith("chess"):
        return "chess"
    if type_.startswith("venture"):
        return "ventures"
    if type_.startswith("book"):
        return "books"
    return _PREF_MAP.get(type_)


async def create_notification(user_id: str, type_: str, title: str, body: str = "", link: str = None):
    # Respect the user's notification preferences (Settings → notifications).
    pk = _pref_key(type_)
    if pk:
        try:
            u = await db.users.find_one({"_id": ObjectId(user_id)}, {"notify_prefs": 1})
            if u and (u.get("notify_prefs") or {}).get(pk) is False:
                return
        except Exception:
            pass
    doc = {
        "user_id": user_id, "type": type_, "title": title, "body": body,
        "link": link, "read": False, "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)
    try:
        from ws import hub
        await hub.notify_user(user_id, {"kind": "notification", "title": title, "body": body, "link": link})
    except Exception:
        pass
    # best-effort phone push; never breaks the request
    try:
        await send_push_to_user(user_id, title, body, link)
    except Exception:
        pass


def _vapid_cfg():
    return {
        "public": os.environ.get("VAPID_PUBLIC_KEY", ""),
        "private": os.environ.get("VAPID_PRIVATE_KEY", ""),
        "subject": os.environ.get("VAPID_SUBJECT", "mailto:admin@futurethinkers.jo"),
    }


def _do_webpush(subscription_info, data, private_key, subject):
    from pywebpush import webpush
    if isinstance(data, dict):
        data = json.dumps(data, ensure_ascii=False)
    webpush(subscription_info=subscription_info, data=data,
            vapid_private_key=private_key,
            vapid_claims={"sub": subject})


async def send_push_to_user(user_id: str, title: str, body: str = "", link: str = None):
    """Send a Web Push message to all of the user's subscribed devices.
    Returns the number of devices the push was delivered to."""
    cfg = _vapid_cfg()
    if not cfg["public"] or not cfg["private"]:
        return 0
    subs = await db.push_subscriptions.find({"user_id": user_id}).to_list(20)
    if not subs:
        return 0
    payload = json.dumps({
        "title": title, "body": body or "",
        "link": link or "/dashboard",
        "icon": "/icons/icon-192.png", "badge": "/icons/icon-192.png",
        "tag": f"ft-{user_id}",
    })
    delivered = 0
    for s in subs:
        sub = s.get("subscription") or {}
        if not sub.get("endpoint"):
            continue
        try:
            await asyncio.to_thread(_do_webpush, sub, payload, cfg["private"], cfg["subject"])
            delivered += 1
        except Exception as e:
            # drop dead subscriptions (410 Gone / 404 Not Found)
            msg = str(e)
            if "410" in msg or "404" in msg:
                try:
                    await db.push_subscriptions.delete_one({"_id": s["_id"]})
                except Exception:
                    pass
    return delivered


async def deliver_notification(user_ids, type_, title, body="", link=None, channel="both"):
    """Deliver a notification through the chosen channel(s).

    channel: "push" (phone system push only), "inapp" (in-app alert only),
             "both" (default).
    Returns {"inapp": n, "push": m} delivery counts.
    """
    if channel not in ("push", "inapp", "both"):
        channel = "both"
    if not user_ids:
        return {"inapp": 0, "push": 0}
    inapp = 0
    if channel in ("inapp", "both"):
        docs = [{
            "user_id": uid, "type": type_, "title": title, "body": body,
            "link": link, "read": False, "created_at": now_iso(),
        } for uid in user_ids]
        await db.notifications.insert_many(docs)
        inapp = len(docs)
        # real-time bell update, same as create_notification
        try:
            from ws import hub
            for uid in user_ids:
                await hub.notify_user(uid, {"kind": "notification", "title": title,
                                            "body": body, "link": link})
        except Exception:
            pass
    push = 0
    if channel in ("push", "both"):
        for uid in user_ids:
            try:
                push += await send_push_to_user(uid, title, body, link)
            except Exception:
                pass
    return {"inapp": inapp, "push": push}


async def broadcast_notification(user_ids, type_, title, body="", link=None):
    await deliver_notification(user_ids, type_, title, body, link, channel="both")


async def dispatch_due_campaigns():
    """Send all scheduled notification campaigns whose time has come.
    Safe to call from cron, middleware, or anywhere: claims each campaign
    atomically so concurrent instances never double-send."""
    due = await db.notification_campaigns.find(
        {"status": "scheduled", "send_at": {"$lte": now_iso()}}
    ).to_list(20)
    sent = 0
    for c in due:
        claimed = await db.notification_campaigns.update_one(
            {"_id": c["_id"], "status": "scheduled"},
            {"$set": {"status": "sending"}})
        if claimed.modified_count == 0:
            continue
        try:
            q = c.get("audience_query") or {"status": {"$ne": "banned"}}
            users = await db.users.find(q, {"_id": 1}).to_list(20000)
            ids = [str(u["_id"]) for u in users]
            counts = await deliver_notification(
                ids, "announcement", c["title"], c.get("body", ""),
                c.get("link") or "/dashboard", c.get("channel") or "both")
            await db.notification_campaigns.update_one(
                {"_id": c["_id"]},
                {"$set": {"status": "sent", "sent_at": now_iso(),
                          "recipient_count": len(ids),
                          "inapp_count": counts["inapp"],
                          "push_count": counts["push"]}})
            sent += 1
        except Exception:
            try:
                await db.notification_campaigns.update_one(
                    {"_id": c["_id"]}, {"$set": {"status": "scheduled"}})
            except Exception:
                pass
    return sent


async def audit_log(user, action: str, entity: str, entity_id: str = None, meta: dict = None, request=None):
    ip = None
    ua = None
    if request is not None:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
    await db.audit_logs.insert_one({
        "user_id": str(user.get("id")) if user else None,
        "user_email": user.get("email") if user else None,
        "action": action, "entity": entity, "entity_id": entity_id,
        "meta": meta or {}, "ip": ip, "user_agent": ua, "created_at": now_iso(),
    })


# ---------------- Daily quests & activity feed ----------------
QUEST_POOL = [
    {"key": "read_pages", "kind": "pages_read", "title": "اقرأ 20 صفحة", "target": 20, "reward": 15, "icon": "BookOpen"},
    {"key": "finish_book", "kind": "books_read", "title": "أنهِ قراءة كتاب", "target": 1, "reward": 40, "icon": "Library"},
    {"key": "review_book", "kind": "review", "title": "قيّم كتاباً أو عملاً أدبياً", "target": 1, "reward": 10, "icon": "Star"},
    {"key": "chess_win", "kind": "chess_wins", "title": "اربح مباراة شطرنج", "target": 1, "reward": 20, "icon": "Crown"},
    {"key": "chess_play", "kind": "chess_games", "title": "العب مباراة شطرنج", "target": 1, "reward": 5, "icon": "Swords"},
    {"key": "daily_checkin_q", "kind": "checkin", "title": "سجّل حضورك اليومي", "target": 1, "reward": 5, "icon": "Flame"},
    {"key": "discuss", "kind": "posts", "title": "شارك في نقاش", "target": 1, "reward": 10, "icon": "MessageSquare"},
]
_STAT_TO_QUEST = {"pages_read": "pages_read", "books_read": "books_read",
                  "chess_wins": "chess_wins", "chess_games": "chess_games", "posts": "posts"}


def _today_str() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).date().isoformat()


async def get_today_quests(user_id: str) -> dict:
    today = _today_str()
    doc = await db.user_quests.find_one({"user_id": user_id, "date": today})
    if doc:
        return doc
    from datetime import date
    seed_n = date.today().toordinal() + sum(ord(c) for c in user_id)
    quests = []
    for i in range(3):
        t = QUEST_POOL[(seed_n + i * 2) % len(QUEST_POOL)]
        quests.append({**t, "progress": 0, "claimed": False})
    doc = {"user_id": user_id, "date": today, "quests": quests, "created_at": now_iso()}
    try:
        await db.user_quests.insert_one(doc)
    except Exception:
        doc = await db.user_quests.find_one({"user_id": user_id, "date": today}) or doc
    return doc


async def track_quest(user_id: str, kind: str, delta: int = 1):
    """Advance today's quest progress for an action kind. Never raises."""
    try:
        doc = await get_today_quests(user_id)
        changed = False
        for q in doc.get("quests", []):
            if q.get("kind") == kind and not q.get("claimed"):
                new_p = min(q.get("target", 1), q.get("progress", 0) + delta)
                if new_p != q.get("progress", 0):
                    q["progress"] = new_p
                    changed = True
        if changed:
            await db.user_quests.update_one(
                {"user_id": user_id, "date": doc["date"]},
                {"$set": {"quests": doc["quests"]}})
    except Exception:
        pass


async def log_activity(user_id: str, kind: str, text: str, ref: str = None):
    """Append to the platform activity feed. Never raises."""
    try:
        u = await db.users.find_one({"_id": ObjectId(user_id)}, {"name": 1})
        await db.activity_events.insert_one({
            "user_id": user_id, "user_name": (u or {}).get("name", ""),
            "kind": kind, "text": text, "ref": ref, "created_at": now_iso(),
        })
    except Exception:
        pass
