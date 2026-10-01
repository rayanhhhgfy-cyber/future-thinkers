import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/Layout";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { toast } from "sonner";
import { Plus, PenLine, Trash2, Users, BookOpen, Trophy, Code2, Palette, MessageSquare, Lightbulb, Rocket, Star, X } from "lucide-react";

const ICON_CHOICES = ["Users", "BookOpen", "Trophy", "Code2", "Palette", "MessageSquare", "Lightbulb", "Rocket", "Star"];
const ICON_MAP = { Users, BookOpen, Trophy, Code2, Palette, MessageSquare, Lightbulb, Rocket, Star };
const COLOR_CHOICES = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F", "#DB2777"];

const Empty = ({ t }) => <div className="text-center py-10 text-slate-400 text-sm">{t}</div>;

export default function ClubsPanel() {
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

  if (!clubs) return <PageLoader />;

  return (
    <div className="space-y-6">
      <FadeUp className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-head text-xl font-extrabold text-slate-900">إدارة الأندية</h2>
          <p className="text-sm text-slate-400 mt-1">{clubs.length} نادٍ · تُعرض للأعضاء في صفحة الأندية</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 ml-1" /> نادٍ جديد
          </Button>
        )}
      </FadeUp>

      {clubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow"><Empty t="لا أندية بعد — أنشئ أول نادٍ 🌱" /></div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((c) => {
            const Icon = ICON_MAP[c.icon] || Users;
            return (
              <Item key={c.id || c.slug} className="bg-white rounded-2xl border border-slate-100 ft-shadow p-5 flex flex-col gap-3 hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: c.color || "#2563EB" }}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex gap-1.5">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="rounded-lg h-9 w-9 p-0" title="تعديل">
                        <PenLine className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="outline" onClick={() => del(c)} className="rounded-lg h-9 w-9 p-0 text-rose-600 border-rose-200" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-head font-bold text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5" dir="ltr">/{c.slug}</div>
                  {c.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{c.description}</p>}
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
                <Label>المعرّف (slug) <span className="text-slate-400 font-normal">— اختياري، يُولّد تلقائياً</span></Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="reading-club" className="rounded-xl mt-1" dir="ltr" />
              </div>
            ) : (
              <div>
                <Label>المعرّف (slug) <span className="text-slate-400 font-normal">— ثابت لا يمكن تغييره</span></Label>
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
            {/* live preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-xl grid place-items-center text-white shrink-0" style={{ background: form.color }}>
                {React.createElement(ICON_MAP[form.icon] || Users, { className: "w-6 h-6" })}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{form.name || "اسم النادي"}</div>
                <div className="text-xs text-slate-400 truncate">{form.description || "الوصف يظهر هنا..."}</div>
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
