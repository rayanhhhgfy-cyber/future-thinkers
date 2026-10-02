import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PenLine, BookOpen, Feather, ScrollText, Heart, Clock, CheckCircle2, XCircle, Send, Trash2, Plus, Star } from "lucide-react";
import { FadeUp, Stagger, Item } from "@/components/anim";
import BookmarkButton from "@/components/BookmarkButton";

const TYPES = [
  { v: "article", l: "مقال", icon: ScrollText },
  { v: "poetry", l: "شعر", icon: Feather },
  { v: "essay", l: "خاطرة", icon: PenLine },
  { v: "story", l: "قصة قصيرة", icon: BookOpen },
];

const STATUS = {
  draft: { l: "مسودة", c: "bg-slate-100 text-slate-600", icon: Clock },
  pending: { l: "قيد المراجعة", c: "bg-amber-100 text-amber-700", icon: Clock },
  published: { l: "منشور", c: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { l: "يحتاج تعديلاً", c: "bg-rose-100 text-rose-700", icon: XCircle },
};

function StatusBadge({ s }) {
  const st = STATUS[s] || STATUS.draft;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.c}`}><st.icon className="w-3.5 h-3.5" />{st.l}</span>;
}

export default function Studio() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("gallery");
  const [mine, setMine] = useState([]);
  const [gallery, setGallery] = useState({ items: [], total: 0 });
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // work being edited or "new"
  const [form, setForm] = useState({ title: "", type: "article", content: "", excerpt: "" });
  const [saving, setSaving] = useState(false);

  const loadMine = () => api.get("/studio/works/me").then((r) => setMine(r.data)).catch(() => {});
  const loadGallery = () => api.get("/studio/published", { params: { type: filter || undefined, q: q || undefined } }).then((r) => setGallery(r.data)).catch(() => {});

  useEffect(() => { loadMine(); }, []);
  useEffect(() => { loadGallery(); }, [filter]);

  const startNew = () => { setForm({ title: "", type: "article", content: "", excerpt: "" }); setEditing("new"); };
  const startEdit = (w) => { setForm({ title: w.title, type: w.type, content: w.content, excerpt: w.excerpt || "" }); setEditing(w); };

  const save = async (submitAfter) => {
    if (form.title.trim().length < 3) return toast.error("العنوان قصير جداً");
    if (form.content.trim().length < 20) return toast.error("النص قصير جداً (20 حرفاً على الأقل)");
    setSaving(true);
    try {
      let id = editing === "new" ? null : editing.id;
      if (editing === "new") {
        const { data } = await api.post("/studio/works", form);
        id = data.id;
      } else {
        await api.put(`/studio/works/${id}`, form);
      }
      if (submitAfter) {
        await api.post(`/studio/works/${id}/submit`);
        toast.success("أُرسل عملك للمراجعة التحريرية ✍️");
      } else toast.success("حُفظت المسودة");
      setEditing(null); loadMine(); setTab("mine");
    } catch (e) { toast.error(apiErr(e)); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm("حذف هذه المسودة؟")) return;
    try { await api.delete(`/studio/works/${id}`); toast.success("حُذفت المسودة"); loadMine(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const submit = async (id) => {
    try { await api.post(`/studio/works/${id}/submit`); toast.success("أُرسل للمراجعة ✍️"); loadMine(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-head text-3xl font-extrabold flex items-center gap-2"><PenLine className="w-7 h-7 text-violet-600" /> استوديو النشر</h1>
            <p className="text-slate-500 mt-1 text-sm">انشر مقالاتك وأشعارك وخواطرك · تُراجع تحريرياً قبل النشر</p>
          </div>
          {user && <Button onClick={startNew} className="rounded-2xl bg-violet-600 hover:bg-violet-700"><Plus className="w-4 h-4 ml-1" /> عمل جديد</Button>}
        </div>

        <div className="flex gap-2 mb-6">
          {[["gallery", "معرض الأعمال"], ["mine", "أعمالي"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${tab === k ? "bg-violet-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{l}</button>
          ))}
        </div>

        {tab === "gallery" && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              <button onClick={() => setFilter("")} className={`px-4 py-2 rounded-xl text-sm ${!filter ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>الكل</button>
              {TYPES.map((t) => (
                <button key={t.v} onClick={() => setFilter(t.v)} className={`px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 ${filter === t.v ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  <t.icon className="w-4 h-4" />{t.l}
                </button>
              ))}
              <div className="mr-auto flex gap-2">
                <Input placeholder="ابحث في الأعمال..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadGallery()} className="rounded-xl w-48" />
                <Button variant="outline" onClick={loadGallery} className="rounded-xl">بحث</Button>
              </div>
            </div>
            {gallery.items.length === 0 ? <EmptyState icon={BookOpen} title="لا أعمال منشورة بعد" hint="كن أول من ينشر في الاستوديو!" /> : (
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.items.map((w) => (
                  <Item key={w.id} className="relative">
                  <button onClick={() => nav(`/studio/${w.id}`)} className="w-full h-full text-right bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">{w.type_label}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-2">
                        {(w.rating_count || 0) > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{w.rating_avg}</span>}
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{w.likes}</span>
                      </span>
                    </div>
                    <div className="font-head font-bold text-slate-900 mb-1 line-clamp-1">{w.title}</div>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{w.excerpt}</p>
                    <div className="mt-3 text-xs text-slate-400">بقلم {w.author_name}</div>
                  </button>
                  <BookmarkButton kind="work" refId={w.id} title={w.title} className="absolute top-3 left-3 shadow" />
                  </Item>
                ))}
              </Stagger>
            )}
          </>
        )}

        {tab === "mine" && (
          !user ? <EmptyState icon={PenLine} title="سجّل الدخول" hint="تحتاج حساباً لنشر أعمالك" /> :
          mine.length === 0 ? <EmptyState icon={PenLine} title="لم تنشر شيئاً بعد" hint="ابدأ بكتابة أول عمل لك" action={<Button onClick={startNew} className="rounded-xl bg-violet-600">عمل جديد</Button>} /> : (
            <div className="space-y-3">
              {mine.map((w) => (
                <div key={w.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{w.title}</span>
                        <StatusBadge s={w.status} />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{w.type_label} · {w.views} مشاهدة · {w.likes} إعجاب</div>
                      {w.status === "rejected" && w.review_note && (
                        <div className="mt-2 text-sm bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-700">ملاحظة المراجع: {w.review_note}</div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => nav(`/studio/${w.id}`)} className="rounded-xl">قراءة</Button>
                      {(w.status === "draft" || w.status === "rejected") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(w)} className="rounded-xl">تعديل</Button>
                          <Button size="sm" onClick={() => submit(w.id)} className="rounded-xl bg-violet-600"><Send className="w-3.5 h-3.5 ml-1" /> إرسال للمراجعة</Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(w.id)} className="rounded-xl text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Editor dialog */}
        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle className="font-head text-xl">{editing === "new" ? "عمل جديد" : "تعديل العمل"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان جذّاب لعملك..." className="rounded-xl mt-1" maxLength={120} />
              </div>
              <div>
                <Label>النوع</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {TYPES.map((t) => (
                    <button key={t.v} onClick={() => setForm({ ...form, type: t.v })} className={`p-3 rounded-xl border text-sm flex flex-col items-center gap-1 transition-colors ${form.type === t.v ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-500"}`}>
                      <t.icon className="w-5 h-5" />{t.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>النص</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="اكتب إبداعك هنا..." className="rounded-xl mt-1 min-h-[220px] leading-loose" maxLength={20000} />
                <div className="text-xs text-slate-400 mt-1">{form.content.length} / 20000</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => save(false)} disabled={saving} variant="outline" className="rounded-xl flex-1">حفظ كمسودة</Button>
                <Button onClick={() => save(true)} disabled={saving} className="rounded-xl flex-1 bg-violet-600 hover:bg-violet-700"><Send className="w-4 h-4 ml-1" /> حفظ وإرسال للمراجعة</Button>
              </div>
              <p className="text-xs text-slate-400 text-center">تُراجع الأعمال تحريرياً من المشرفين قبل ظهورها في المعرض</p>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
