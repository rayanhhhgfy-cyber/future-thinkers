"""شهادات PDF · قوالب قابلة للتخصيص من لوحة الإدارة + منح شهادات للمستخدمين."""
import io
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
    # background + triple frame (primary · dark hairline · gold hairline)
    c.setFillColor(colors.HexColor(tpl["bg_color"]))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(P); c.setLineWidth(5)
    c.rect(18, 18, W - 36, H - 36)
    c.setStrokeColor(D); c.setLineWidth(1.1)
    c.rect(29, 29, W - 58, H - 58)
    c.setStrokeColor(G); c.setLineWidth(0.7)
    c.rect(36, 36, W - 72, H - 72)
    for fx, fy in ((36, 36), (W - 36, 36), (36, H - 36), (W - 36, H - 36)):
        _diamond(c, fx, fy, 6, G)

    cx = W / 2
    c.setFillColor(D)
    c.setFont("Amiri-Bold", 20)
    c.drawCentredString(cx, H - 76, ar(tpl["org_name"]))
    c.setFillColor(M)
    c.setFont("Amiri", 12)
    c.drawCentredString(cx, H - 96, ar(tpl["country_line"]))
    # gold divider: line · diamond · line
    c.setStrokeColor(G); c.setLineWidth(1)
    c.line(cx - 78, H - 112, cx - 14, H - 112)
    c.line(cx + 14, H - 112, cx + 78, H - 112)
    _diamond(c, cx, H - 112, 5, G)

    c.setFillColor(P)
    c.setFont("Amiri-Bold", 36)
    c.drawCentredString(cx, H - 160, ar(tpl["main_title"]))

    c.setFillColor(M)
    c.setFont("Amiri", 14)
    c.drawCentredString(cx, H - 194, ar(tpl["award_label"]))

    c.setFillColor(D)
    c.setFont("Amiri-Bold", 32)
    c.drawCentredString(cx, H - 240, ar(name))
    c.setStrokeColor(G); c.setLineWidth(1.6)
    c.line(cx - 58, H - 254, cx + 58, H - 254)
    _diamond(c, cx, H - 254, 4, G)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Amiri", 15)
    c.drawCentredString(cx, H - 284, ar(title_line))
    if subtitle:
        c.setFont("Amiri-Bold", 16)
        c.setFillColor(D)
        c.drawCentredString(cx, H - 311, ar(subtitle))

    y = 168
    c.setFont("Amiri", 12)
    c.setFillColor(M)
    for line in meta_lines:
        c.drawCentredString(cx, y, ar(line))
        y -= 20

    # seal (left): gold ring + primary ring + star + ribbons
    sx, sy = 108, 96
    c.setFillColor(P)
    p = c.beginPath()
    p.moveTo(sx - 17, sy - 22); p.lineTo(sx - 3, sy - 22); p.lineTo(sx - 10, sy - 46)
    p.close(); c.drawPath(p, fill=1, stroke=0)
    p = c.beginPath()
    p.moveTo(sx + 17, sy - 22); p.lineTo(sx + 3, sy - 22); p.lineTo(sx + 10, sy - 46)
    p.close(); c.drawPath(p, fill=1, stroke=0)
    c.setStrokeColor(G); c.setLineWidth(2.2)
    c.circle(sx, sy, 27, stroke=1, fill=0)
    c.setStrokeColor(P); c.setLineWidth(0.8)
    c.circle(sx, sy, 21.5, stroke=1, fill=0)
    _star(c, sx, sy, 11, 4.6, G)

    # signature (right)
    c.setFillColor(D)
    c.setFont("Amiri-Bold", 13)
    c.drawRightString(W - 62, 108, ar(tpl["org_name"]))
    c.setStrokeColor(M); c.setLineWidth(0.8)
    c.line(W - 196, 96, W - 62, 96)
    c.setFillColor(M)
    c.setFont("Amiri", 10.5)
    c.drawRightString(W - 62, 82, ar("إدارة المنصة"))

    # footer: date · verification · org
    c.setFillColor(M)
    c.setFont("Helvetica", 10)
    c.drawString(60, 50, datetime.now().strftime("%Y-%m-%d"))
    c.setFont("Amiri", 11)
    c.drawRightString(W - 60, 50, ar(tpl["footer_right"]))
    if code:
        c.setFont("Amiri", 9.5)
        c.drawCentredString(cx, 62, ar(f"رمز التحقق: {code}"))
        c.setFont("Helvetica", 8.5)
        c.drawCentredString(cx, 50, f"f-thinkers.vercel.app/verify/{code}")
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


@router.post("/admin/award")
async def admin_award_certificate(body: AwardBody, user: dict = Depends(require_permission("certificate.manage"))):
    target = await db.users.find_one({"_id": oid(body.user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    tpl = await get_template()
    doc = {
        "user_id": str(target["_id"]), "user_name": target["name"],
        "title_line": body.title_line, "subtitle": body.subtitle,
        "meta_lines": [str(x) for x in (body.meta_lines or [])][:6],
        "template": tpl,
        "code": __import__("secrets").token_hex(3).upper(),
        "awarded_by": user["id"], "awarded_by_name": user["name"],
        "created_at": now_iso(),
    }
    res = await db.certificates.insert_one(doc)
    await create_notification(str(target["_id"]), "certificate",
                              "حصلت على شهادة جديدة! 🏅", body.title_line,
                              f"/profile/{str(target['_id'])}")
    await audit_log(user, "certificate_award", "certificate", str(res.inserted_id),
                    {"user_id": str(target["_id"]), "title": body.title_line})
    return {"id": str(res.inserted_id)}


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
