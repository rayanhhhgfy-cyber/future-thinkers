import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Flag, Plus, PenLine, Trash2, Copy, Link2, Megaphone, PlayCircle, Clock3, Ban, History } from "lucide-react";

/* لافتات الإعلانات · شريط إعلاني أعلى الموقع لجميع الزوار
   نفس نقاط النهاية: GET/POST /admin/announcements · PATCH/DELETE /admin/announcements/{id}
   والتكرار = إنشاء نسخة جديدة بنفس البيانات */

const BG_PRESETS = ["#059669", "#2563EB", "#7C3AED", "#D97706", "#E11D48", "#0891B2", "#0A192F"];

function bannerStatus(b) {
  if (!b.active) return { l: "معطّل", c: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" };
  const now = new Date();
  if (b.ends_at && new Date(b.ends_at) < now) return { l: "منتهي", c: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" };
  if (b.starts_at && new Date(b.starts_at) > now) return { l: "مجدول", c: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" };
  return { l: "نشط", c: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" };
}

export default function AdminBanners() {
  const [banners, setBanners] = useState(null);
  const [dialog, setDialog] = useState(null); // null | "new" | banner obj
  const [f, setF] = useState({ text: "", link: "", bg: BG_PRESETS[0], starts_at: "", ends_at: "", active: true });
  const [saving, setSaving] = useState(false);
  const [dupId, setDupId] = useState(null);

  const load = async () => {
    try { const { data } = await api.get("/admin/announcements"); setBanners(data.banners || []); }
    catch { setBanners([]); }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const openNew = () => { setF({ text: "", link: "", bg: BG_PRESETS[0], starts_at: "", ends_at: "", active: true }); setDialog("new"); };
  const openEdit = (b) => {
    setF({
      text: b.text || "", link: b.link || "", bg: b.bg || BG_PRESETS[0],
      starts_at: (b.starts_at || "").slice(0, 16), ends_at: (b.ends_at || "").slice(0, 16),
      active: b.active !== false,
    });
    setDialog(b);
  };
  const toISO = (v) => (v ? new Date(v).toISOString() : null);
  const save = async () => {
    if (!f.text.trim()) return toast.error("نص اللافتة مطلوب");
    setSaving(true);
    try {
      const payload = { text: f.text.trim(), link: f.link.trim() || null, bg: f.bg, starts_at: toISO(f.starts_at), ends_at: toISO(f.ends_at), active: !!f.active };
      if (dialog === "new") { await api.post("/admin/announcements", payload); toast.success("أُضيفت اللافتة 📢"); }
      else { await api.patch(`/admin/announcements/${dialog.id}`, payload); toast.success("تم حفظ التعديلات ✅"); }
      setDialog(null); load();
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (b) => {
    if (!window.confirm("حذف هذه اللافتة نهائياً؟")) return;
    try { await api.delete(`/admin/announcements/${b.id}`); toast.success("تم حذف اللافتة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const duplicate = async (b) => {
    setDupId(b.id);
    try {
      await api.post("/admin/announcements", {
        text: `${b.text} (نسخة)`,
        link: b.link || null,
        bg: b.bg || BG_PRESETS[0],
        starts_at: b.starts_at || null,
        ends_at: b.ends_at || null,
        active: b.active !== false,
      });
      toast.success("تم تكرار اللافتة 📢");
      load();
    } catch (e) { toast.error(apiErr(e)); } finally { setDupId(null); }
  };

  const statOf = (l) => (banners || []).filter((b) => bannerStatus(b).l === l).length;
  const stats = [
    { l: "نشطة الآن", v: statOf("نشط"), icon: PlayCircle, cls: "bg-emerald-500" },
    { l: "مجدولة", v: statOf("مجدول"), icon: Clock3, cls: "bg-amber-500" },
    { l: "منتهية", v: statOf("منتهي"), icon: History, cls: "bg-rose-500" },
    { l: "معطّلة", v: statOf("معطّل"), icon: Ban, cls: "bg-slate-500" },
  ];

  if (!banners) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-gradient-to-l from-rose-600 via-pink-600 to-fuchsia-600" data-testid="admin-banners-hero">
          <Megaphone className="absolute -left-4 -bottom-6 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <Flag className="w-3.5 h-3.5" /> شريط الموقع العلوي
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">لافتات الإعلانات</h2>
              <p className="text-white/75 text-xs sm:text-sm mt-1.5 font-medium">لافتات تظهر أعلى الموقع لجميع الزوار · مثالية للتنبيهات المهمة والمواعيد</p>
            </div>
            <Button onClick={openNew} data-testid="admin-banners-new-btn" className="pressable rounded-xl bg-white text-rose-700 hover:bg-rose-50 min-h-[46px] px-5 font-extrabold shadow-lg shrink-0">
              <Plus className="w-4 h-4 ml-1.5" /> لافتة جديدة
            </Button>
          </div>
        </div>
      </FadeUp>

      {/* شريط حالات */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Item key={s.l} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
            <span className={`w-10 h-10 rounded-2xl ${s.cls} text-white grid place-items-center mb-2.5 shadow`}><s.icon className="w-5 h-5" /></span>
            <span className="block font-head font-black text-2xl text-slate-900 leading-none tabular-nums">{s.v.toLocaleString("en-US")}</span>
            <span className="block text-[11px] font-bold text-slate-400 mt-1.5">{s.l}</span>
          </Item>
        ))}
      </Stagger>

      {/* القائمة */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow text-center py-14 px-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 grid place-items-center mb-3"><Megaphone className="w-8 h-8 text-rose-300" /></div>
          <div className="font-head font-extrabold text-slate-700">لا لافتات بعد</div>
          <p className="text-xs text-slate-400 mt-1.5">أنشئ أول لافتة إعلانية لتظهر أعلى الموقع لكل الزوار</p>
          <Button onClick={openNew} className="pressable mt-4 rounded-xl bg-rose-600 hover:bg-rose-700 min-h-[44px] px-5"><Plus className="w-4 h-4 ml-1.5" /> إنشاء لافتة</Button>
        </div>
      ) : (
        <Stagger className="space-y-3.5">
          {banners.map((b) => {
            const s = bannerStatus(b);
            return (
              <Item key={b.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden hover:border-rose-200 transition-colors" data-testid={`admin-banner-card-${b.id}`}>
                {/* معاينة حية بلون اللافتة */}
                <div className="py-3 px-4 text-center text-white text-sm font-bold leading-relaxed" style={{ background: b.bg || "#059669" }}>
                  {b.text}
                </div>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shrink-0 ${s.c}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.l}
                  </span>
                  <div className="text-xs text-slate-400 flex-1 min-w-0 space-y-1 font-medium">
                    {b.link && <div className="flex items-center gap-1.5 truncate" dir="ltr"><Link2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{b.link}</span></div>}
                    {(b.starts_at || b.ends_at) && (
                      <div>من {b.starts_at ? String(b.starts_at).slice(0, 16).replace("T", " ") : "·"} إلى {b.ends_at ? String(b.ends_at).slice(0, 16).replace("T", " ") : "·"}</div>
                    )}
                    <div>أُنشئت {String(b.created_at || "").slice(0, 10)}</div>
                  </div>
                  <div className="grid grid-cols-3 sm:flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)} data-testid={`admin-banner-edit-${b.id}`} className="pressable rounded-xl h-11"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(b)} disabled={dupId === b.id} data-testid={`admin-banner-duplicate-${b.id}`} className="pressable rounded-xl h-11"><Copy className="w-4 h-4 ml-1" /> {dupId === b.id ? "جارٍ التكرار..." : "تكرار"}</Button>
                    <Button size="sm" variant="outline" onClick={() => del(b)} data-testid={`admin-banner-delete-${b.id}`} className="pressable rounded-xl h-11 text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      {/* حوار الإنشاء/التعديل */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-head font-extrabold">{dialog === "new" ? "لافتة إعلان جديدة" : "تعديل اللافتة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* معاينة حية داخل الحوار */}
            <div>
              <Label>معاينة حية</Label>
              <div className="mt-1.5 py-3 px-4 rounded-2xl text-center text-white text-sm font-bold leading-relaxed shadow" style={{ background: f.bg }}>
                {f.text.trim() || "نص اللافتة سيظهر هنا…"}
              </div>
            </div>
            <div><Label>النص *</Label><Textarea value={f.text} onChange={(e) => set("text")(e.target.value)} rows={2} className="rounded-xl mt-1.5 bg-slate-50 focus:bg-white" placeholder="مثال: التسجيل في مسابقة القراءة مفتوح الآن! 🎉" /></div>
            <div><Label>الرابط (اختياري · عند النقر على اللافتة)</Label><Input value={f.link} onChange={(e) => set("link")(e.target.value)} dir="ltr" className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" placeholder="/competitions" /></div>
            <div>
              <Label>لون الخلفية</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {BG_PRESETS.map((c) => (
                  <button key={c} type="button" onClick={() => set("bg")(c)}
                    className={`w-10 h-10 rounded-xl transition-transform ${f.bg === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"}`}
                    style={{ background: c }} aria-label={c} />
                ))}
                <input type="color" value={f.bg} onChange={(e) => set("bg")(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5" title="لون مخصص" />
                <span className="text-xs font-mono text-slate-400" dir="ltr">{f.bg}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>تبدأ (اختياري)</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at")(e.target.value)} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
              <div><Label>تنتهي (اختياري)</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at")(e.target.value)} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer select-none">
              <button type="button" role="switch" aria-checked={f.active} onClick={() => set("active")(!f.active)}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${f.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${f.active ? "right-1" : "left-1"}`} />
              </button>
              لافتة مفعّلة
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} className="pressable rounded-xl min-h-[44px]">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="pressable rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">{saving ? "جارٍ الحفظ..." : "حفظ اللافتة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
