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
import { Plus, PenLine, Trash2, Users, BookOpen, Trophy, Code2, Palette, MessageSquare, Lightbulb, Rocket, Star, X, Sparkles, Crown } from "lucide-react";

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
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "Users", color: "#2563EB" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/clubs"); setClubs(data || []); }
    catch { setClubs([]); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: "", slug: "", description: "", icon: "Users", color: "#2563EB" });
    setDialog({ mode: "create" });
  };
  const openEdit = (c) => {
    setForm({ name: c.name || "", slug: c.slug || "", description: c.description || "", icon: c.icon || "Users", color: c.color || "#2563EB" });
    setDialog({ mode: "edit", club: c });
  };

  const save = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) return toast.error("اسم النادي مطلوب (حرفان على الأقل)");
    setSaving(true);
    try {
      if (dialog.mode === "create") {
        const payload = { name: form.name.trim(), description: form.description, icon: form.icon, color: form.color };
        if (form.slug.trim()) payload.slug = form.slug.trim().toLowerCase();
        await api.post("/clubs", payload);
        toast.success("تم إنشاء النادي 🎉");
      } else {
        await api.patch(`/clubs/${dialog.club.slug}`, {
          name: form.name.trim(), description: form.description, icon: form.icon, color: form.color,
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
                  <span className="absolute top-3 left-3 flex gap-1.5">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "create" ? "إنشاء نادٍ جديد" : `تعديل: ${dialog?.club?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم النادي *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: نادي القراءة" className="rounded-xl mt-1" /></div>
            {dialog?.mode === "create" ? (
              <div>
                <Label>المعرّف (slug) <span className="text-slate-400 font-normal">· اختياري، يُولّد تلقائياً</span></Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="reading-club" className="rounded-xl mt-1" dir="ltr" />
              </div>
            ) : (
              <div>
                <Label>المعرّف (slug) <span className="text-slate-400 font-normal">· ثابت لا يمكن تغييره</span></Label>
                <Input value={form.slug} disabled className="rounded-xl mt-1 bg-slate-50" dir="ltr" />
              </div>
            )}
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="نبذة عن النادي وأنشطته..." className="rounded-xl mt-1" rows={3} /></div>
            <div>
              <Label>الأيقونة</Label>
              <div className="grid grid-cols-9 gap-1.5 mt-2">
                {ICON_CHOICES.map((n) => {
                  const I = ICON_MAP[n];
                  return (
                    <button key={n} type="button" onClick={() => setForm({ ...form, icon: n })}
                      className={`aspect-square rounded-xl grid place-items-center border transition-all ${form.icon === n ? "border-emerald-500 bg-emerald-50 text-emerald-700 scale-105" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      <I className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {COLOR_CHOICES.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                    className={`w-9 h-9 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"}`}
                    style={{ background: c }} aria-label={c} />
                ))}
              </div>
            </div>
            {/* معاينة حية */}
            <div className="rounded-2xl overflow-hidden border border-slate-100">
              <div className="h-12" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}99)` }} />
              <div className="flex items-center gap-3 px-3.5 pb-3.5 bg-slate-50">
                <div className="w-12 h-12 -mt-6 rounded-xl grid place-items-center text-white shrink-0 ring-4 ring-slate-50 shadow" style={{ background: form.color }}>
                  {React.createElement(ICON_MAP[form.icon] || Users, { className: "w-6 h-6" })}
                </div>
                <div className="min-w-0 pt-1">
                  <div className="font-bold text-slate-800 truncate">{form.name || "اسم النادي"}</div>
                  <div className="text-xs text-slate-400 truncate">{form.description || "الوصف يظهر هنا..."}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDialog(null)} className="rounded-xl">
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {saving ? "جارٍ الحفظ..." : dialog?.mode === "create" ? "إنشاء النادي" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
