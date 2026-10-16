import React, { useEffect, useMemo, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { toast } from "sonner";
import { Plus, PenLine, Trash2, Users, BookOpen, Trophy, Code2, Palette, MessageSquare, Lightbulb, Rocket, Star, X, Sparkles, Crown, Eye, EyeOff } from "lucide-react";

/* معاينة حية للمعرّف — نفس منطق التوليد في الخادم (عربي ← لاتيني مقروء) */
const AR_SLUG_MAP = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "aa", "ء": "", "ئ": "i", "ؤ": "u",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "ة": "a", "و": "u", "ي": "i", "ى": "a", "ـ": "",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};
function slugPreview(name) {
  const s = (name || "").replace(/[ً-ٰٟ]/g, "");
  let out = "";
  for (const ch of s) {
    if (ch in AR_SLUG_MAP) out += AR_SLUG_MAP[ch];
    else if (/^[a-z0-9]$/i.test(ch)) out += ch.toLowerCase();
    else out += "-";
  }
  out = out.replace(/-{2,}/g, "-").replace(/^[-]+|[-]+$/g, "").replace(/[^a-z0-9-]/g, "");
  return out.slice(0, 60) || "nadi";
}

/* الأندية · إعادة تصميم ClubsPanel
   نفس النقاط والصلاحيات: GET /clubs · POST /clubs · PATCH /clubs/{slug} · DELETE /clubs/{slug}
   الحقول: name · slug (اختياري عند الإنشاء، ثابت بعده) · description · icon · color · members_count */

const ICON_CHOICES = ["Users", "BookOpen", "Trophy", "Code2", "Palette", "MessageSquare", "Lightbulb", "Rocket", "Star"];
const ICON_MAP = { Users, BookOpen, Trophy, Code2, Palette, MessageSquare, Lightbulb, Rocket, Star };
const COLOR_CHOICES = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F", "#DB2777"];

export default function AdminClubs() {
  const { hasPerm } = useAuth();
  const canCreate = hasPerm("club.create");
  const canEdit = hasPerm("club.edit");
  const canDelete = hasPerm("club.delete");
  const [clubs, setClubs] = useState(null);
  const [dialog, setDialog] = useState(null); // {mode:"create"} | {mode:"edit", club}
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "Users", color: "#2563EB", is_hidden: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/clubs"); setClubs(data || []); }
    catch { setClubs([]); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: "", slug: "", description: "", icon: "Users", color: "#2563EB", is_hidden: false });
    setDialog({ mode: "create" });
  };
  const openEdit = (c) => {
    setForm({ name: c.name || "", slug: c.slug || "", description: c.description || "", icon: c.icon || "Users", color: c.color || "#2563EB", is_hidden: !!c.is_hidden });
    setDialog({ mode: "edit", club: c });
  };

  const save = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) return toast.error("اسم النادي مطلوب (حرفان على الأقل)");
    setSaving(true);
    try {
      if (dialog.mode === "create") {
        const payload = { name: form.name.trim(), description: form.description, icon: form.icon, color: form.color, is_hidden: !!form.is_hidden };
        if (form.slug.trim()) payload.slug = form.slug.trim().toLowerCase();
        await api.post("/clubs", payload);
        toast.success("تم إنشاء النادي 🎉");
      } else {
        await api.patch(`/clubs/${dialog.club.slug}`, {
          name: form.name.trim(), description: form.description, icon: form.icon, color: form.color, is_hidden: !!form.is_hidden,
        });
        toast.success("تم حفظ التعديلات ✅");
      }
      setDialog(null); load();
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };

  const del = async (c) => {
    if (!window.confirm(`حذف نادي "${c.name}" نهائياً؟ سيتم إزالة عضويات الأعضاء المرتبطين به.`)) return;
    try { await api.delete(`/clubs/${c.slug}`); toast.success("تم حذف النادي"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const toggleHide = async (c) => {
    const next = !c.is_hidden;
    try {
      await api.patch(`/clubs/${c.slug}`, { is_hidden: next });
      toast.success(next ? "تم إخفاء النادي عن الأعضاء 🙈" : "أصبح النادي ظاهراً للجميع ✅");
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const totalMembers = useMemo(() => (clubs || []).reduce((s, c) => s + (c.members_count || 0), 0), [clubs]);
  const biggest = useMemo(() => (clubs || []).reduce((best, c) => ((c.members_count || 0) > (best?.members_count || 0) ? c : best), null), [clubs]);

  if (!clubs) return <PageLoader />;

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="ft-hero-gradient rounded-[28px] p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-14 right-1/4 w-52 h-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full"><Sparkles className="w-3.5 h-3.5" /> مجتمعات الطلاب</div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3">إدارة الأندية</h2>
              <p className="text-white/70 text-sm mt-1.5 max-w-lg leading-relaxed">{clubs.length} نادٍ · تُعرض للأعضاء في صفحة الأندية العامة.</p>
            </div>
            {canCreate && (
              <button data-testid="admin-clubs-create-btn" onClick={openCreate} className="pressable inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white text-emerald-800 text-sm font-extrabold shadow-lg shadow-black/10">
                <Plus className="w-4 h-4" /> نادٍ جديد
              </button>
            )}
          </div>
          <div className="relative flex flex-wrap gap-2 mt-5">
            <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur ring-1 ring-white/20 rounded-full px-3.5 py-1.5 text-xs font-bold"><Users className="w-3.5 h-3.5" /> مجموع الأعضاء <Counter value={totalMembers} className="font-extrabold" /></span>
            {biggest && (
              <span className="inline-flex items-center gap-2 bg-white/12 backdrop-blur ring-1 ring-white/20 rounded-full px-3.5 py-1.5 text-xs font-bold"><Crown className="w-3.5 h-3.5 text-amber-300" /> الأكبر: {biggest.name} · {biggest.members_count || 0} عضو</span>
            )}
          </div>
        </div>
      </FadeUp>

      {clubs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-lg shadow-emerald-500/25 mb-4"><Users className="w-8 h-8" /></span>
          <div className="font-head font-extrabold text-slate-800">لا أندية بعد</div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">أنشئ أول نادٍ ليجمع الطلاب حول اهتمام مشترك وأنشطة أسبوعية 🌱</p>
          {canCreate && <Button onClick={openCreate} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> إنشاء أول نادٍ</Button>}
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((c) => {
            const Icon = ICON_MAP[c.icon] || Users;
            const color = c.color || "#2563EB";
            return (
              <Item key={c.id || c.slug} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover-lift">
                <div className="relative h-20 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
                  <span className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/15 blur-md" />
                  <span className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/25 backdrop-blur px-2.5 py-1 rounded-full"><Users className="w-3.5 h-3.5" />{c.members_count || 0} عضو</span>
                  {c.is_hidden && (
                    <span className="absolute bottom-3 left-4 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900/60 backdrop-blur px-2.5 py-1 rounded-full"><EyeOff className="w-3.5 h-3.5" /> مخفي</span>
                  )}
                  <span className="absolute top-3 left-3 flex gap-1.5">
                    {canEdit && (
                      <button onClick={() => toggleHide(c)} title={c.is_hidden ? "إظهار النادي" : "إخفاء النادي"}
                        className={`pressable w-9 h-9 rounded-xl grid place-items-center shadow ${c.is_hidden ? "bg-slate-900/85 text-amber-300 hover:bg-slate-900" : "bg-white/90 text-slate-700 hover:bg-white"}`}>
                        {c.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                    {canEdit && (
                      <button onClick={() => openEdit(c)} title="تعديل" className="pressable w-9 h-9 rounded-xl bg-white/90 text-slate-700 grid place-items-center shadow hover:bg-white"><PenLine className="w-4 h-4" /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => del(c)} title="حذف" className="pressable w-9 h-9 rounded-xl bg-white/90 text-rose-600 grid place-items-center shadow hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </span>
                </div>
                <div className="p-4 sm:p-5 flex items-start gap-3.5 flex-1">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 -mt-9 rounded-2xl grid place-items-center text-white shrink-0 ring-4 ring-white shadow-lg relative z-10" style={{ background: color }}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="font-head font-extrabold text-slate-900 truncate">{c.name}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5" dir="ltr">/{c.slug}</div>
                    {c.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{c.description}</p>}
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain overflow-x-hidden [&>*]:min-w-0
          max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0
          max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[1.4rem]
          max-sm:p-3 max-sm:pt-2 max-sm:gap-2 max-sm:max-h-[94dvh]
          max-sm:data-[state=open]:slide-in-from-left-0 max-sm:data-[state=open]:slide-in-from-top-0 max-sm:data-[state=open]:slide-in-from-bottom-8">
          <div className="sm:hidden mx-auto h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
          <DialogHeader className="max-sm:text-right">
            <DialogTitle className="max-sm:text-[15px] max-sm:pr-9">{dialog?.mode === "create" ? "إنشاء نادٍ جديد" : `تعديل: ${dialog?.club?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-sm:space-y-2.5">
            <div>
              <Label className="max-sm:text-[13px]">اسم النادي *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: نادي القراءة" className="rounded-xl mt-1 h-11 max-sm:h-10 max-sm:text-sm" />
              {dialog?.mode === "create" && form.name.trim().length >= 2 && (
                <p className="mt-1.5 text-[11px] text-slate-400">المعرّف المقترح: <span className="font-mono font-bold text-emerald-700 break-all" dir="ltr">/{form.slug.trim() ? form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") : slugPreview(form.name)}</span></p>
              )}
            </div>
            {dialog?.mode === "create" ? (
              <div>
                <Label className="max-sm:text-[13px]">المعرّف (slug) <span className="text-slate-400 font-normal">· اختياري، يُولّد تلقائياً من الاسم بشكل مقروء</span></Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="nadi-alqraa" className="rounded-xl mt-1 h-11 max-sm:h-10 max-sm:text-sm" dir="ltr" />
              </div>
            ) : (
              <div>
                <Label className="max-sm:text-[13px]">المعرّف (slug) <span className="text-slate-400 font-normal">· ثابت لا يمكن تغييره</span></Label>
                <Input value={form.slug} disabled className="rounded-xl mt-1 bg-slate-50 max-sm:h-10 max-sm:text-sm" dir="ltr" />
              </div>
            )}
            <div><Label className="max-sm:text-[13px]">الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="نبذة عن النادي وأنشطته..." className="rounded-xl mt-1 max-sm:text-sm max-sm:min-h-[52px]" rows={3} /></div>
            <div>
              <Label className="max-sm:text-[13px]">الأيقونة</Label>
              <div className="grid grid-cols-6 min-[420px]:grid-cols-9 gap-1.5 max-sm:gap-1 mt-2">
                {ICON_CHOICES.map((n) => {
                  const I = ICON_MAP[n];
                  return (
                    <button key={n} type="button" onClick={() => setForm({ ...form, icon: n })}
                      className={`aspect-square min-h-[2.75rem] max-sm:min-h-[2.5rem] rounded-xl grid place-items-center border transition-all ${form.icon === n ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105" : "border-slate-200 text-slate-500 hover:border-slate-300 active:scale-95"}`}>
                      <I className="w-5 h-5 max-sm:w-[1.1rem] max-sm:h-[1.1rem]" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="max-sm:text-[13px]">اللون</Label>
              <div className="flex gap-2 max-sm:gap-1.5 mt-2 flex-wrap">
                {COLOR_CHOICES.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    className={`w-9 h-9 max-sm:w-8 max-sm:h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"}`}
                    style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            {/* إخفاء / إظهار */}
            <button type="button" onClick={() => setForm({ ...form, is_hidden: !form.is_hidden })}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-3 sm:p-3.5 max-sm:p-2.5 max-sm:gap-2 text-right transition active:scale-[0.99] ${form.is_hidden ? "border-slate-700 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <span className="flex items-center gap-3 max-sm:gap-2.5 min-w-0">
                <span className={`w-10 h-10 max-sm:w-9 max-sm:h-9 rounded-xl grid place-items-center shrink-0 ${form.is_hidden ? "bg-white/10 text-amber-300" : "bg-slate-100 text-slate-500"}`}>
                  {form.is_hidden ? <EyeOff className="w-5 h-5 max-sm:w-[1.1rem] max-sm:h-[1.1rem]" /> : <Eye className="w-5 h-5 max-sm:w-[1.1rem] max-sm:h-[1.1rem]" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm max-sm:text-[13px] font-bold">{form.is_hidden ? "النادي مخفي 🙈" : "إخفاء النادي"}</span>
                  <span className={`block text-[11px] max-sm:text-[10px] mt-0.5 leading-relaxed ${form.is_hidden ? "text-slate-300" : "text-slate-400"}`}>لن يظهر في صفحة الأندية · يبقى ظاهراً للمشرفين فقط</span>
                </span>
              </span>
              <span className={`relative w-11 h-6 max-sm:w-10 max-sm:h-[1.35rem] shrink-0 rounded-full transition-colors ${form.is_hidden ? "bg-emerald-500" : "bg-slate-200"}`} aria-hidden>
                <span className={`absolute top-0.5 h-5 w-5 max-sm:h-4 max-sm:w-4 rounded-full bg-white shadow transition-all ${form.is_hidden ? "right-0.5" : "left-0.5"}`} />
              </span>
            </button>
            {/* معاينة حية */}
            <div className="rounded-2xl overflow-hidden border border-slate-100">
              <div className="h-12 max-sm:h-9" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}99)` }} />
              <div className="flex items-center gap-3 max-sm:gap-2.5 px-3.5 pb-3.5 max-sm:px-3 max-sm:pb-3 bg-slate-50">
                <div className="w-12 h-12 max-sm:w-10 max-sm:h-10 -mt-6 max-sm:-mt-5 rounded-xl grid place-items-center text-white shrink-0 ring-4 ring-slate-50 shadow" style={{ background: form.color }}>
                  {React.createElement(ICON_MAP[form.icon] || Users, { className: "w-6 h-6 max-sm:w-5 max-sm:h-5" })}
                </div>
                <div className="min-w-0 pt-1">
                  <div className="font-bold text-slate-800 truncate">{form.name || "اسم النادي"}</div>
                  <div className="text-xs text-slate-400 truncate">{form.description || "الوصف يظهر هنا..."}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2 max-sm:gap-1.5 max-sm:mt-1 max-sm:flex-col-reverse max-sm:items-stretch">
            <Button variant="outline" onClick={() => setDialog(null)} className="rounded-xl max-sm:w-full max-sm:h-10 max-sm:text-sm">
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 max-sm:w-full max-sm:h-10 max-sm:text-sm">
              {saving ? "جارٍ الحفظ..." : dialog?.mode === "create" ? "إنشاء النادي" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
