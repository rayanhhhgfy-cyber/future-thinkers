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
import { PenLine, BookOpen, Feather, ScrollText, Heart, Clock, CheckCircle2, XCircle, Send, Trash2, Plus, Star, Sparkles, Search, Eye, LayoutGrid, FolderOpen } from "lucide-react";
import { FadeUp, Stagger, Item } from "@/components/anim";
import BookmarkButton from "@/components/BookmarkButton";

const TYPES = [
  { v: "article", l: "مقال", icon: ScrollText },
  { v: "poetry", l: "شعر", icon: Feather },
  { v: "essay", l: "خاطرة", icon: PenLine },
  { v: "story", l: "قصة قصيرة", icon: BookOpen },
];

const TYPE_META = {
  article: { g: "from-blue-500 to-indigo-600", soft: "bg-blue-50 text-blue-700 ring-blue-200", avatar: "from-blue-500 to-indigo-600" },
  poetry: { g: "from-rose-500 to-pink-600", soft: "bg-rose-50 text-rose-700 ring-rose-200", avatar: "from-rose-500 to-pink-600" },
  essay: { g: "from-amber-500 to-orange-600", soft: "bg-amber-50 text-amber-700 ring-amber-200", avatar: "from-amber-500 to-orange-600" },
  story: { g: "from-emerald-500 to-teal-600", soft: "bg-emerald-50 text-emerald-700 ring-emerald-200", avatar: "from-emerald-500 to-teal-600" },
};

const STATUS = {
  draft: { l: "مسودة", c: "bg-slate-100 text-slate-600 ring-slate-300", icon: Clock },
  pending: { l: "قيد المراجعة", c: "bg-amber-100 text-amber-700 ring-amber-300", icon: Clock },
  published: { l: "منشور", c: "bg-emerald-100 text-emerald-700 ring-emerald-300", icon: CheckCircle2 },
  rejected: { l: "يحتاج تعديلاً", c: "bg-rose-100 text-rose-700 ring-rose-300", icon: XCircle },
};

function StatusBadge({ s }) {
  const st = STATUS[s] || STATUS.draft;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${st.c}`}><st.icon className="w-3.5 h-3.5" />{st.l}</span>;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* hero */}
        <FadeUp>
          <div className="ft-hero-gradient relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10 mb-6 text-white ft-shadow">
            <PenLine className="absolute -left-8 -bottom-10 w-48 h-48 sm:w-64 sm:h-64 text-white/10 -rotate-12 pointer-events-none" />
            <div className="absolute top-0 left-1/3 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 right-10 w-48 h-48 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> منصة إبداع الطلاب
              </span>
              <h1 className="font-head text-3xl sm:text-4xl font-extrabold flex items-center gap-3">
                <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center shrink-0"><PenLine className="w-6 h-6 sm:w-7 sm:h-7" /></span>
                استوديو النشر
              </h1>
              <p className="text-white/85 mt-3 text-sm sm:text-base leading-relaxed">انشر مقالاتك وأشعارك وخواطرك · تُراجع تحريرياً قبل النشر</p>
              <div className="flex flex-wrap items-center gap-3 mt-6">
                {user && <Button onClick={startNew} className="pressable rounded-2xl bg-white text-violet-700 hover:bg-white/90 font-extrabold shadow-lg shadow-black/10"><Plus className="w-4 h-4 ml-1" /> عمل جديد</Button>}
                {gallery.total > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-xs font-bold">
                    <BookOpen className="w-3.5 h-3.5" /> {gallery.total} عمل منشور
                  </span>
                )}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* tabs */}
        <div className="flex p-1.5 gap-1.5 bg-white rounded-2xl border border-slate-100 ft-shadow mb-6 w-fit max-w-full">
          {[["gallery", "معرض الأعمال", LayoutGrid], ["mine", "أعمالي", FolderOpen]].map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`pressable px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${tab === k ? "bg-gradient-to-l from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
              <Icon className="w-4 h-4" />{l}
            </button>
          ))}
        </div>

        {tab === "gallery" && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button onClick={() => setFilter("")} className={`pressable px-4 py-2 rounded-xl text-sm font-bold transition-all ${!filter ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>الكل</button>
              {TYPES.map((t) => {
                const meta = TYPE_META[t.v] || TYPE_META.article;
                const active = filter === t.v;
                return (
                  <button key={t.v} onClick={() => setFilter(t.v)} className={`pressable px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${active ? `bg-gradient-to-l ${meta.g} text-white shadow-md` : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    <t.icon className="w-4 h-4" />{t.l}
                  </button>
                );
              })}
              <div className="mr-auto flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input placeholder="ابحث في الأعمال..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadGallery()} className="rounded-xl w-full sm:w-48 pr-9" />
                </div>
                <Button variant="outline" onClick={loadGallery} className="pressable rounded-xl">بحث</Button>
              </div>
            </div>
            {gallery.items.length === 0 ? <EmptyState icon={BookOpen} title="لا أعمال منشورة بعد" hint="كن أول من ينشر في الاستوديو!" /> : (
              <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {gallery.items.map((w, i) => {
                  const meta = TYPE_META[w.type] || TYPE_META.article;
                  const TIcon = (TYPES.find((x) => x.v === w.type) || TYPES[0]).icon;
                  return (
                  <Item key={w.id} className="relative h-full">
                  <button onClick={() => nav(`/studio/${w.id}`)} className="group w-full h-full text-right bg-white rounded-[1.4rem] border border-slate-100 ft-shadow hover-lift overflow-hidden flex flex-col">
                    <div className={`relative bg-gradient-to-l ${meta.g} ${i % 3 === 1 ? "h-24" : "h-20"} shrink-0 overflow-hidden`}>
                      <TIcon className="absolute -left-3 -bottom-5 w-24 h-24 text-white/15 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white text-xs font-bold">
                        <TIcon className="w-3.5 h-3.5" />{w.type_label}
                      </span>
                      <span className="absolute bottom-3 right-3 flex items-center gap-2.5 text-white text-xs font-bold">
                        {(w.rating_count || 0) > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/25 backdrop-blur"><Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{w.rating_avg}</span>}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/25 backdrop-blur"><Heart className="w-3.5 h-3.5 fill-current" />{w.likes}</span>
                      </span>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="font-head font-extrabold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-violet-700 transition-colors">{w.title}</div>
                      <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed flex-1">{w.excerpt}</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                        <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${meta.avatar} text-white grid place-items-center font-extrabold text-[11px] shrink-0`}>{w.author_name?.trim()?.[0]}</span>
                        <span className="font-bold text-slate-500 truncate">بقلم {w.author_name}</span>
                      </div>
                    </div>
                  </button>
                  <BookmarkButton kind="work" refId={w.id} title={w.title} className="absolute top-3 left-3 shadow" />
                  </Item>
                  );
                })}
              </Stagger>
            )}
          </>
        )}

        {tab === "mine" && (
          !user ? <EmptyState icon={PenLine} title="سجّل الدخول" hint="تحتاج حساباً لنشر أعمالك" /> :
          mine.length === 0 ? <EmptyState icon={PenLine} title="لم تنشر شيئاً بعد" hint="ابدأ بكتابة أول عمل لك" action={<Button onClick={startNew} className="rounded-xl bg-violet-600">عمل جديد</Button>} /> : (
            <div className="space-y-3">
              {mine.map((w, i) => {
                const meta = TYPE_META[w.type] || TYPE_META.article;
                const TIcon = (TYPES.find((x) => x.v === w.type) || TYPES[0]).icon;
                return (
                <div key={w.id} className="animate-fade-up bg-white rounded-[1.4rem] p-5 border border-slate-100 ft-shadow hover-lift relative overflow-hidden" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <span className={`absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${meta.g}`} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.g} text-white grid place-items-center shrink-0`}><TIcon className="w-4 h-4" /></span>
                        <span className="font-head font-extrabold text-slate-900">{w.title}</span>
                        <StatusBadge s={w.status} />
                      </div>
                      <div className="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-bold">{w.type_label}</span>
                        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{w.views} مشاهدة</span>
                        <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{w.likes} إعجاب</span>
                      </div>
                      {w.status === "rejected" && w.review_note && (
                        <div className="mt-2 text-sm bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-700">ملاحظة المراجع: {w.review_note}</div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => nav(`/studio/${w.id}`)} className="pressable rounded-xl">قراءة</Button>
                      {(w.status === "draft" || w.status === "rejected") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(w)} className="pressable rounded-xl">تعديل</Button>
                          <Button size="sm" onClick={() => submit(w.id)} className="pressable rounded-xl bg-violet-600"><Send className="w-3.5 h-3.5 ml-1" /> إرسال للمراجعة</Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(w.id)} className="pressable rounded-xl text-rose-600"><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )
        )}

        {/* Editor dialog */}
        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[1.6rem]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-head text-xl font-extrabold flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white grid place-items-center"><PenLine className="w-4 h-4" /></span>
                {editing === "new" ? "عمل جديد" : "تعديل العمل"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان جذّاب لعملك..." className="rounded-xl mt-1" maxLength={120} />
              </div>
              <div>
                <Label>النوع</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                  {TYPES.map((t) => {
                    const meta = TYPE_META[t.v] || TYPE_META.article;
                    const active = form.type === t.v;
                    return (
                      <button key={t.v} onClick={() => setForm({ ...form, type: t.v })} className={`pressable p-3 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1.5 transition-all ${active ? `bg-gradient-to-br ${meta.g} text-white border-transparent shadow-md` : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"}`}>
                        <t.icon className="w-5 h-5" />{t.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>النص</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="اكتب إبداعك هنا..." className="rounded-2xl mt-1 min-h-[220px] leading-loose bg-slate-50/60 focus:bg-white" maxLength={20000} />
                <div className="flex items-center justify-between mt-1">
                  <div className="h-1.5 flex-1 ml-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-purple-500 transition-all" style={{ width: `${Math.min(100, (form.content.length / 20000) * 100)}%` }} />
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{form.content.length} / 20000</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => save(false)} disabled={saving} variant="outline" className="pressable rounded-xl flex-1">حفظ كمسودة</Button>
                <Button onClick={() => save(true)} disabled={saving} className="pressable rounded-xl flex-1 bg-gradient-to-l from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200"><Send className="w-4 h-4 ml-1" /> حفظ وإرسال للمراجعة</Button>
              </div>
              <p className="text-xs text-slate-400 text-center">تُراجع الأعمال تحريرياً من المشرفين قبل ظهورها في المعرض</p>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
