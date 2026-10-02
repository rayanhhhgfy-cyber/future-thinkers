"""شهادات PDF · قوالب قابلة للتخصيص من لوحة الإدارة + منح شهادات للمستخدمين."""
import io
import secrets
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import create_notification, audit_log
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors

router = APIRouter(prefix="/api/certificates")

ASSETS = Path(__file__).parent.parent / "assets"
_REG = False

DEFAULT_TEMPLATE = {
    "org_name": "منصة مفكري المستقبل",
    "country_line": "المملكة الأردنية الهاشمية",
    "main_title": "شهادة تقدير",
    "award_label": "تُمنح هذه الشهادة إلى",
    "footer_right": "منصة مفكري المستقبل",
    "color_primary": "#059669",
    "color_dark": "#0A192F",
    "color_muted": "#64748B",
    "color_gold": "#C6A15B",
    "bg_color": "#F6FBF9",
}


def _fonts():
    global _REG
    if not _REG:
        pdfmetrics.registerFont(TTFont("Amiri", str(ASSETS / "Amiri-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("Amiri-Bold", str(ASSETS / "Amiri-Bold.ttf")))
        _REG = True


def ar(text: str) -> str:
    return get_display(arabic_reshaper.reshape(str(text)))


async def get_template() -> dict:
    doc = await db.settings.find_one({"_id": "certificate_template"})
    tpl = dict(DEFAULT_TEMPLATE)
    if doc:
        for k in DEFAULT_TEMPLATE:
            if doc.get(k):
                tpl[k] = doc[k]
    return tpl


def _diamond(c, x, y, r, fill):
    p = c.beginPath()
    p.moveTo(x, y + r); p.lineTo(x + r, y); p.lineTo(x, y - r); p.lineTo(x - r, y)
    p.close()
    c.setFillColor(fill)
    c.drawPath(p, fill=1, stroke=0)


def _star(c, cx, cy, r_out, r_in, fill):
    import math
    p = c.beginPath()
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        a = math.pi / 2 + i * math.pi / 5
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        p.moveTo(x, y) if i == 0 else p.lineTo(x, y)
    p.close()
    c.setFillColor(fill)
    c.drawPath(p, fill=1, stroke=0)


def _build(name, title_line, subtitle, meta_lines, tpl=None, code=None):
    tpl = tpl or DEFAULT_TEMPLATE
    _fonts()
    buf = io.BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(W, H))
    P = colors.HexColor(tpl["color_primary"])
    D = colors.HexColor(tpl["color_dark"])
    M = colors.HexColor(tpl["color_muted"])
    G = colors.HexColor(tpl.get("color_gold") or "#C6A15B")
    INK = colors.HexColor("#1E293B")
    cx = W / 2

    # background + tight triple frame
    c.setFillColor(colors.HexColor(tpl["bg_color"]))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(P); c.setLineWidth(4.5)
    c.rect(12, 12, W - 24, H - 24)
    c.setStrokeColor(G); c.setLineWidth(1)
    c.rect(19, 19, W - 38, H - 38)
    c.setStrokeColor(D); c.setLineWidth(0.6)
    c.rect(24, 24, W - 48, H - 48)
    for fx, fy in ((24, 24), (W - 24, 24), (24, H - 24), (W - 24, H - 24)):
        _diamond(c, fx, fy, 5.5, G)
        _diamond(c, fx, fy, 2.4, P)

    # subtle side ornament stars (kept clear of the text column)
    c.saveState()
    c.setFillAlpha(0.10)
    _star(c, 92, H - 210, 23, 10, G)
    _star(c, W - 92, H - 210, 23, 10, G)
    c.restoreState()

    # header band (dark) with gold base line
    c.setFillColor(D)
    c.rect(24, H - 96, W - 48, 72, fill=1, stroke=0)
    c.setFillColor(G)
    c.rect(24, H - 99, W - 48, 3, fill=1, stroke=0)
    _diamond(c, 44, H - 60, 4, G)
    _diamond(c, W - 44, H - 60, 4, G)
    c.setFillColor(colors.white)
    c.setFont("Amiri-Bold", 19)
    c.drawCentredString(cx, H - 66, ar(tpl["org_name"]))
    c.setFillColor(G)
    c.setFont("Amiri", 10.5)
    c.drawCentredString(cx, H - 84, ar(tpl["country_line"]))

    # main title with gold flourishes
    ty = H - 158
    c.setFillColor(P)
    c.setFont("Amiri-Bold", 37)
    c.drawCentredString(cx, ty, ar(tpl["main_title"]))
    for sgn in (-1, 1):
        x0 = cx + sgn * 118
        c.setStrokeColor(G); c.setLineWidth(1.1)
        c.line(x0, ty + 10, x0 + sgn * 54, ty + 10)
        _diamond(c, x0 + sgn * 62, ty + 10, 4, G)
        _diamond(c, x0 + sgn * 74, ty + 10, 2.4, P)

    c.setFillColor(M)
    c.setFont("Amiri", 12.5)
    c.drawCentredString(cx, H - 184, ar(tpl["award_label"]))

    # recipient name + double gold underline
    ny = H - 238
    c.setFillColor(INK)
    c.setFont("Amiri-Bold", 37)
    c.drawCentredString(cx, ny, ar(name))
    c.setStrokeColor(G); c.setLineWidth(1.8)
    c.line(cx - 96, ny - 15, cx + 96, ny - 15)
    c.setLineWidth(0.7)
    c.line(cx - 76, ny - 20.5, cx + 76, ny - 20.5)
    _diamond(c, cx, ny - 15, 4.2, G)

    # achievement lines (dense)
    yy = H - 276
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Amiri", 15.5)
    c.drawCentredString(cx, yy, ar(title_line))
    if subtitle:
        yy -= 27
        c.setFont("Amiri-Bold", 16.5)
        c.setFillColor(P)
        c.drawCentredString(cx, yy, ar(subtitle))
    yy -= 24
    c.setFont("Amiri", 11.5)
    c.setFillColor(M)
    for line in [l for l in (meta_lines or []) if l][:3]:
        c.drawCentredString(cx, yy, ar(line))
        yy -= 17

    # divider above the bottom zone
    c.setStrokeColor(G); c.setLineWidth(0.9)
    c.line(56, 200, W - 56, 200)
    _diamond(c, cx, 200, 4, G)
    _diamond(c, 56, 200, 3, P)
    _diamond(c, W - 56, 200, 3, P)

    # info box (left): code · date · org
    bx, bw, btop = 48, 252, 188
    c.setFillColor(colors.white)
    c.setFillAlpha(0.65)
    c.roundRect(bx, btop - 108, bw, 108, 8, fill=1, stroke=0)
    c.setFillAlpha(1)
    c.setStrokeColor(G); c.setLineWidth(0.8)
    c.roundRect(bx, btop - 108, bw, 108, 8, fill=0, stroke=1)
    rows = [
        ("رمز التحقق", code or "······", bool(code)),
        ("تاريخ الإصدار", datetime.now().strftime("%Y-%m-%d"), True),
        ("الجهة المانحة", tpl["org_name"], False),
    ]
    ry = btop - 24
    for label, val, latin in rows:
        c.setFillColor(M); c.setFont("Amiri", 9)
        c.drawRightString(bx + bw - 12, ry, ar(label))
        c.setFillColor(INK)
        if latin:
            c.setFont("Helvetica-Bold", 10.5)
            c.drawRightString(bx + bw - 12, ry - 14, str(val))
        else:
            c.setFont("Amiri-Bold", 11)
            c.drawRightString(bx + bw - 12, ry - 14, ar(val))
        ry -= 33

    # seal (center bottom)
    sx, sy = cx, 134
    c.setFillColor(P)
    for dx in (-13, 13):
        p = c.beginPath()
        p.moveTo(sx + dx - 7, sy - 28); p.lineTo(sx + dx + 7, sy - 28); p.lineTo(sx + dx, sy - 58)
        p.close(); c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(tpl["bg_color"]))
    c.circle(sx, sy, 35, stroke=0, fill=1)
    c.setStrokeColor(G); c.setLineWidth(2.4)
    c.circle(sx, sy, 35, stroke=1, fill=0)
    c.setStrokeColor(P); c.setLineWidth(0.9)
    c.circle(sx, sy, 28.5, stroke=1, fill=0)
    _star(c, sx, sy, 15, 6.2, G)

    # signature (right)
    rx = W - 48
    c.setFillColor(INK)
    c.setFont("Amiri-Bold", 12.5)
    c.drawRightString(rx, 174, ar(tpl["org_name"]))
    c.setStrokeColor(M); c.setLineWidth(0.8)
    c.line(rx - 178, 162, rx, 162)
    c.setFillColor(M); c.setFont("Amiri", 10)
    c.drawRightString(rx, 148, ar("إدارة المنصة"))
    c.setFont("Amiri", 9.5)
    c.drawRightString(rx, 120, ar(tpl["footer_right"]))

    c.showPage()
    c.save()
    buf.seek(0)
    return buf


def _pdf_response(buf, filename):
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})


@router.get("/competition/{cid}")
async def competition_certificate(cid: str, user: dict = Depends(get_current_user)):
    comp = await db.competitions.find_one({"_id": oid(cid)})
    if not comp:
        raise HTTPException(status_code=404, detail="المسابقة غير موجودة")
    entry = await db.competition_entries.find_one({"competition_id": cid, "user_id": user["id"], "submitted": True})
    if not entry:
        raise HTTPException(status_code=403, detail="أكمل المسابقة أولاً للحصول على الشهادة")
    higher = await db.competition_entries.count_documents(
        {"competition_id": cid, "submitted": True, "score": {"$gt": entry.get("score", 0)}})
    rank = higher + 1
    tpl = await get_template()
    buf = _build(
        user["name"],
        "لمشاركته المتميزة في مسابقة",
        comp["title"],
        [f"النتيجة: {entry.get('score', 0)}%  •  الترتيب: {rank}",
         f"الإجابات الصحيحة: {entry.get('correct', 0)} من {entry.get('total', 0)}"],
        tpl,
    )
    return _pdf_response(buf, f"certificate-{cid}")


@router.get("/event/{eid}")
async def event_certificate(eid: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"_id": oid(eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    reg = await db.event_registrations.find_one({"event_id": eid, "user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=403, detail="يجب التسجيل في الفعالية")
    tpl = await get_template()
    buf = _build(user["name"], "لحضوره ومشاركته في فعالية", ev["title"],
                 [f"بتاريخ {ev.get('date', '')}", "شكراً لمساهمتك في مجتمع مفكري المستقبل"], tpl)
    return _pdf_response(buf, f"event-{eid}")


# ---------- user: my certificates ----------

@router.get("/mine")
async def my_certificates(user: dict = Depends(get_current_user)):
    docs = await db.certificates.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.get("/user/{user_id}")
async def user_certificates(user_id: str, request: Request):
    # public for profiles: titles and dates only (PDF download only for the owner / staff)
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="سجل الدخول")
    docs = await db.certificates.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    out = sers(docs)
    if user["id"] != user_id and "certificate.manage" not in effective_permissions(user):
        out = [{k: c[k] for k in ("id", "title_line", "subtitle", "created_at") if k in c} for c in out]
    return out


# ---------- public: verify a certificate by code ----------

@router.get("/verify/{code}")
async def verify_certificate(code: str):
    code = (code or "").strip().upper()
    cert = await db.certificates.find_one({"code": code})
    if not cert and len(code) >= 6:
        # شهادات قديمة بلا رمز: طابِق ببادئة معرّف الشهادة
        async for doc in db.certificates.find({"code": {"$exists": False}}):
            if str(doc["_id"]).upper().startswith(code):
                cert = doc
                break
    if not cert:
        return {"valid": False}
    tpl = await get_template()
    return {"valid": True, "user_name": cert.get("user_name", ""),
            "title_line": cert.get("title_line", ""), "subtitle": cert.get("subtitle", ""),
            "created_at": cert.get("created_at", ""), "org": tpl["org_name"]}


# ---------- public: certificates wall (latest awards) ----------

@router.get("/wall")
async def certificates_wall():
    docs = await db.certificates.find({}).sort("created_at", -1).limit(12).to_list(12)
    uids = [oid(d["user_id"]) for d in docs if d.get("user_id") and oid(d["user_id"])]
    names = {}
    if uids:
        async for u in db.users.find({"_id": {"$in": uids}}, {"name": 1}):
            names[str(u["_id"])] = u["name"]
    return [{
        "user_name": names.get(d.get("user_id")) or d.get("user_name", ""),
        "title_line": d.get("title_line", ""),
        "subtitle": d.get("subtitle", ""),
        "created_at": d.get("created_at", ""),
        "code": d.get("code") or str(d["_id"])[:8].upper(),
    } for d in docs]


@router.get("/{cert_id}/pdf")
async def certificate_pdf(cert_id: str, user: dict = Depends(get_current_user)):
    cert = await db.certificates.find_one({"_id": oid(cert_id)})
    if not cert:
        raise HTTPException(status_code=404, detail="الشهادة غير موجودة")
    if cert["user_id"] != user["id"] and user.get("role") not in ("admin", "super_admin", "moderator"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    tpl = cert.get("template") or await get_template()
    code = cert.get("code") or str(cert["_id"])[:8].upper()
    buf = _build(cert["user_name"], cert["title_line"], cert.get("subtitle", ""),
                 cert.get("meta_lines", []), tpl, code=code)
    return _pdf_response(buf, f"certificate-{cert_id}")


# ---------- admin: template + awards ----------

class TemplateBody(BaseModel):
    org_name: str = ""
    country_line: str = ""
    main_title: str = ""
    award_label: str = ""
    footer_right: str = ""
    color_primary: str = ""
    color_dark: str = ""
    color_muted: str = ""
    color_gold: str = ""
    bg_color: str = ""


@router.get("/admin/template")
async def admin_get_template(user: dict = Depends(require_permission("certificate.manage"))):
    return await get_template()


@router.put("/admin/template")
async def admin_set_template(body: TemplateBody, user: dict = Depends(require_permission("certificate.manage"))):
    data = {k: v for k, v in body.dict().items() if v}
    if data:
        await db.settings.update_one({"_id": "certificate_template"},
                                      {"$set": {**data, "updated_at": now_iso(), "updated_by": user["id"]}},
                                      upsert=True)
        await audit_log(user, "certificate_template_update", "certificate_template", "certificate_template", data)
    return await get_template()


class AwardBody(BaseModel):
    user_id: str = Field(..., min_length=1)
    title_line: str = Field(..., min_length=1)
    subtitle: str = ""
    meta_lines: list = Field(default_factory=list)


def _gen_code() -> str:
    return secrets.token_hex(3).upper()


async def _insert_cert(target: dict, title_line: str, subtitle: str,
                       meta_lines: list, tpl: dict, admin: dict) -> str:
    """Shared award path (single + bulk): insert the cert doc and notify."""
    doc = {
        "user_id": str(target["_id"]), "user_name": target["name"],
        "title_line": title_line, "subtitle": subtitle,
        "meta_lines": [str(x) for x in (meta_lines or [])][:6],
        "template": tpl,
        "code": _gen_code(),
        "awarded_by": admin["id"], "awarded_by_name": admin["name"],
        "created_at": now_iso(),
    }
    res = await db.certificates.insert_one(doc)
    await create_notification(str(target["_id"]), "certificate",
                              "حصلت على شهادة جديدة! 🏅", title_line,
                              f"/profile/{str(target['_id'])}")
    return str(res.inserted_id)


@router.post("/admin/award")
async def admin_award_certificate(body: AwardBody, user: dict = Depends(require_permission("certificate.manage"))):
    target = await db.users.find_one({"_id": oid(body.user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    tpl = await get_template()
    cert_id = await _insert_cert(target, body.title_line, body.subtitle,
                                 body.meta_lines, tpl, user)
    await audit_log(user, "certificate_award", "certificate", cert_id,
                    {"user_id": str(target["_id"]), "title": body.title_line})
    return {"id": cert_id}


class AwardBulkBody(BaseModel):
    user_ids: list = Field(..., min_length=1, max_length=50)
    title_line: str = Field(..., min_length=1)
    subtitle: str = ""


@router.post("/admin/award-bulk")
async def admin_award_bulk(body: AwardBulkBody, user: dict = Depends(require_permission("certificate.manage"))):
    tpl = await get_template()
    awarded = 0
    skipped = []
    for uid in body.user_ids:
        target = await db.users.find_one({"_id": oid(str(uid))})
        if not target:
            skipped.append(uid)
            continue
        await _insert_cert(target, body.title_line, body.subtitle, [], tpl, user)
        awarded += 1
    await audit_log(user, "certificate_award_bulk", "certificate", "bulk",
                    {"awarded": awarded, "skipped": skipped, "title": body.title_line})
    return {"awarded": awarded, "skipped": skipped}


@router.get("/admin/awarded")
async def admin_list_awarded(user: dict = Depends(require_permission("certificate.manage"))):
    docs = await db.certificates.find({}).sort("created_at", -1).to_list(200)
    return sers(docs)


@router.delete("/admin/awarded/{cert_id}")
async def admin_delete_awarded(cert_id: str, user: dict = Depends(require_permission("certificate.manage"))):
    cert = await db.certificates.find_one({"_id": oid(cert_id)})
    if not cert:
        raise HTTPException(status_code=404, detail="الشهادة غير موجودة")
    await db.certificates.delete_one({"_id": cert["_id"]})
    await audit_log(user, "certificate_delete", "certificate", cert_id, {"user_name": cert.get("user_name")})
    return {"status": "deleted"}
