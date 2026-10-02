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


def _build(name, title_line, subtitle, meta_lines, tpl=None):
    tpl = tpl or DEFAULT_TEMPLATE
    _fonts()
    buf = io.BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(W, H))
    P = colors.HexColor(tpl["color_primary"])
    D = colors.HexColor(tpl["color_dark"])
    M = colors.HexColor(tpl["color_muted"])
    # background + border
    c.setFillColor(colors.HexColor(tpl["bg_color"]))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(P)
    c.setLineWidth(6)
    c.rect(18, 18, W - 36, H - 36)
    c.setStrokeColor(D)
    c.setLineWidth(1.5)
    c.rect(30, 30, W - 60, H - 60)

    cx = W / 2
    c.setFillColor(P)
    c.setFont("Amiri-Bold", 20)
    c.drawCentredString(cx, H - 80, ar(tpl["org_name"]))
    c.setFillColor(M)
    c.setFont("Amiri", 12)
    c.drawCentredString(cx, H - 100, ar(tpl["country_line"]))

    c.setFillColor(D)
    c.setFont("Amiri-Bold", 34)
    c.drawCentredString(cx, H - 165, ar(tpl["main_title"]))

    c.setFillColor(M)
    c.setFont("Amiri", 14)
    c.drawCentredString(cx, H - 205, ar(tpl["award_label"]))

    c.setFillColor(P)
    c.setFont("Amiri-Bold", 30)
    c.drawCentredString(cx, H - 250, ar(name))

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Amiri", 15)
    c.drawCentredString(cx, H - 288, ar(title_line))
    if subtitle:
        c.setFont("Amiri-Bold", 16)
        c.setFillColor(D)
        c.drawCentredString(cx, H - 315, ar(subtitle))

    y = 120
    c.setFont("Amiri", 12)
    c.setFillColor(M)
    for line in meta_lines:
        c.drawCentredString(cx, y, ar(line))
        y -= 20

    c.setFont("Amiri", 11)
    c.drawString(60, 55, ar(datetime.now().strftime("%Y-%m-%d")))
    c.drawRightString(W - 60, 55, ar(tpl["footer_right"]))
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


@router.get("/{cert_id}/pdf")
async def certificate_pdf(cert_id: str, user: dict = Depends(get_current_user)):
    cert = await db.certificates.find_one({"_id": oid(cert_id)})
    if not cert:
        raise HTTPException(status_code=404, detail="الشهادة غير موجودة")
    if cert["user_id"] != user["id"] and user.get("role") not in ("admin", "super_admin", "moderator"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    tpl = cert.get("template") or await get_template()
    buf = _build(cert["user_name"], cert["title_line"], cert.get("subtitle", ""),
                 cert.get("meta_lines", []), tpl)
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
