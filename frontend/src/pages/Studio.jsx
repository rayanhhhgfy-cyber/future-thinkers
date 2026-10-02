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

const BAND_H = ["h-28", "h-24", "h-32"];
const EXCERPT_CLAMP = ["line-clamp-4", "line-clamp-3", "line-clamp-6"];

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
      <div className="max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
        {/* hero */}
        <FadeUp>
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] px-6 py-9 sm:px-12 sm:py-14 lg:px-16 lg:py-20 xl:px-20 mb-6 sm:mb-8 text-white ft-shadow-lg grain bg-gradient-to-br from-violet-700 via-indigo-800 to-fuchsia-900">
            <PenLine className="absolute -left-10 -bottom-16 w-64 h-64 sm:w-[26rem] sm:h-[26rem] lg:w-[32rem] lg:h-[32rem] text-white/[0.07] -rotate-12 pointer-events-none" />
            <Feather className="absolute left-[16%] top-8 w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-white/10 rotate-12 pointer-events-none animate-float" />
            <Sparkles className="absolute right-[10%] bottom-10 w-10 h-10 lg:w-14 lg:h-14 text-fuchsia-300/30 pointer-events-none animate-float" />
            <div className="absolute -top-24 right-[8%] w-72 h-72 bg-violet-500/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -left-16 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 right-1/3 w-72 h-72 bg-indigo-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-10 left-1/2 w-40 h-40 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-xs font-bold mb-5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> منصة إبداع الطلاب
              </span>
              <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold flex items-center gap-3 sm:gap-4 leading-tight relative z-10">
                <span className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 lg:rounded-[1.5rem] rounded-[1.3rem] bg-white/15 backdrop-blur-md ring-1 ring-white/25 grid place-items-center shrink-0 shadow-lg shadow-black/10"><PenLine className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10" /></span>
                استوديو النشر
              </h1>
              <p className="text-white/85 mt-4 lg:mt-5 text-base sm:text-lg lg:text-xl leading-relaxed max-w-xl lg:max-w-2xl relative z-10">انشر مقالاتك وأشعارك وخواطرك · تُراجع تحريرياً قبل النشر</p>
              <div className="flex flex-wrap items-center gap-2 mt-6 lg:mt-8 relative z-10">
                {TYPES.map((t) => (
                  <span key={t.v} className="inline-flex items-center gap-1.5 px-3 lg:px-4 lg:py-2 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 text-xs lg:text-sm font-bold">
                    <t.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />{t.l}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-7 lg:mt-9 relative z-10">
                {user && <Button onClick={startNew} className="pressable min-h-[48px] lg:min-h-[54px] px-6 lg:px-8 lg:text-lg rounded-2xl bg-gradient-to-l from-fuchsia-500 to-violet-500 hover:from-fuchsia-400 hover:to-violet-400 ring-1 ring-white/40 text-white font-extrabold text-base shadow-xl shadow-fuchsia-950/40"><Plus className="w-5 h-5 ml-1" /> عمل جديد</Button>}
                {gallery.total > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-xs font-bold">
                    <BookOpen className="w-3.5 h-3.5" /> {gallery.total} عمل منشور
                  </span>
                )}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* tabs · sticky glass segmented control */}
        <div className="sticky top-20 z-40 mb-6 sm:mb-8">
          <div className="glass rounded-full p-1.5 border border-white/70 ft-shadow-lg flex w-full sm:w-fit max-w-full">
            {[["gallery", "معرض الأعمال", LayoutGrid, gallery.total], ["mine", "أعمالي", FolderOpen, mine.length]].map(([k, l, Icon, count]) => (
              <button key={k} onClick={() => setTab(k)} className={`pressable flex-1 sm:flex-none min-h-[44px] px-4 sm:px-7 rounded-full text-sm font-extrabold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${tab === k ? "bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-300/60" : "text-slate-500 hover:text-slate-800 hover:bg-white/60"}`}>
                <Icon className="w-4 h-4 shrink-0" />{l}
                {count > 0 && <span className={`min-w-[22px] h-[22px] px-1 grid place-items-center rounded-full text-[11px] font-extrabold ${tab === k ? "bg-white/25 text-white" : "bg-violet-100 text-violet-700"}`}>{count}</span>}
              </button>
            ))}
          </div>
        </div>

        {tab === "gallery" && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-6 sm:mb-8">
              <button onClick={() => setFilter("")} className={`pressable min-h-[44px] px-5 rounded-full text-sm font-bold transition-all ${!filter ? "bg-slate-900 text-white shadow-lg shadow-slate-300" : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}>الكل</button>
              {TYPES.map((t) => {
                const meta = TYPE_META[t.v] || TYPE_META.article;
                const active = filter === t.v;
                return (
                  <button key={t.v} onClick={() => setFilter(t.v)} className={`pressable min-h-[44px] px-5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all ${active ? `bg-gradient-to-l ${meta.g} text-white shadow-lg` : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    <t.icon className="w-4 h-4" />{t.l}
                  </button>
                );
              })}
              <div className="mr-auto flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input placeholder="ابحث في الأعمال..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadGallery()} className="rounded-full h-11 w-full sm:w-52 pr-10 bg-white" />
                </div>
                <Button variant="outline" onClick={loadGallery} className="pressable rounded-full h-11 px-5 bg-white">بحث</Button>
              </div>
            </div>
            {gallery.items.length === 0 ? <div className="lg:max-w-3xl lg:mx-auto"><EmptyState icon={BookOpen} title="لا أعمال منشورة بعد" hint="كن أول من ينشر في الاستوديو!" /></div> : (
              <Stagger className="columns-1 min-[480px]:columns-2 lg:columns-3 xl:columns-4 gap-5 xl:gap-6">
                {gallery.items.map((w, i) => {
                  const meta = TYPE_META[w.type] || TYPE_META.article;
                  const TIcon = (TYPES.find((x) => x.v === w.type) || TYPES[0]).icon;
                  return (
                  <Item key={w.id} className="relative w-full mb-5 xl:mb-6 break-inside-avoid">
                  <button onClick={() => nav(`/studio/${w.id}`)} className="group w-full text-right bg-white rounded-[1.6rem] border border-slate-100 ft-shadow hover-lift overflow-hidden flex flex-col lg:transition-all lg:duration-300 lg:hover:-translate-y-1.5 lg:hover:shadow-2xl lg:hover:shadow-violet-200/60 lg:hover:border-violet-200">
                    <div className={`relative bg-gradient-to-l ${meta.g} ${BAND_H[i % 3]} shrink-0 overflow-hidden`}>
                      <TIcon className="absolute -left-3 -bottom-6 w-28 h-28 lg:w-32 lg:h-32 text-white/15 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/25 text-white text-xs font-bold">
                        <TIcon className="w-3.5 h-3.5" />{w.type_label}
                      </span>
                      <span className="absolute bottom-3 right-3 flex items-center gap-2 text-white text-xs font-bold">
                        {(w.rating_count || 0) > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md ring-1 ring-white/20"><Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{w.rating_avg}</span>}
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md ring-1 ring-white/20"><Heart className="w-3.5 h-3.5 fill-current" />{w.likes}</span>
                      </span>
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="font-head font-extrabold text-lg lg:text-xl text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-violet-700 transition-colors">{w.title}</div>
                      <p className={`text-sm text-slate-500 ${EXCERPT_CLAMP[i % 3]} leading-relaxed flex-1`}>{w.excerpt}</p>
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2.5 text-xs text-slate-400">
                        <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.avatar} ring-2 ring-white shadow text-white grid place-items-center font-extrabold text-xs shrink-0`}>{w.author_name?.trim()?.[0]}</span>
                        <span className="font-bold text-slate-500 truncate">بقلم {w.author_name}</span>
                      </div>
                    </div>
                  </button>
                  <BookmarkButton kind="work" refId={w.id} title={w.title} className="absolute top-3 left-3 z-10 shadow-lg" />
                  </Item>
                  );
                })}
              </Stagger>
            )}
          </>
        )}

        {tab === "mine" && (
          !user ? <div className="lg:max-w-3xl lg:mx-auto"><EmptyState icon={PenLine} title="سجّل الدخول" hint="تحتاج حساباً لنشر أعمالك" /></div> :
          mine.length === 0 ? <div className="lg:max-w-3xl lg:mx-auto"><EmptyState icon={PenLine} title="لم تنشر شيئاً بعد" hint="ابدأ بكتابة أول عمل لك" action={<Button onClick={startNew} className="rounded-xl bg-violet-600">عمل جديد</Button>} /></div> : (
            <div className="grid gap-3 sm:gap-4 xl:grid-cols-2 xl:gap-5">
              {mine.map((w, i) => {
                const meta = TYPE_META[w.type] || TYPE_META.article;
                const TIcon = (TYPES.find((x) => x.v === w.type) || TYPES[0]).icon;
                return (
                <div key={w.id} className="animate-fade-up group bg-white rounded-[1.6rem] p-4 sm:p-6 border border-slate-100 ft-shadow hover-lift hover:border-violet-200 hover:shadow-violet-100 relative overflow-hidden" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                  <span className={`absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${meta.g}`} />
                  <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.g} text-white grid place-items-center shrink-0 shadow-lg`}><TIcon className="w-5 h-5" /></span>
                        <span className="font-head font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-violet-700 transition-colors">{w.title}</span>
                        <StatusBadge s={w.status} />
                      </div>
                      <div className="text-xs text-slate-400 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 font-bold ${meta.soft}`}>{w.type_label}</span>
                        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{w.views} مشاهدة</span>
                        <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{w.likes} إعجاب</span>
                      </div>
                      {w.excerpt && <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-3">{w.excerpt}</p>}
                      {w.status === "rejected" && w.review_note && (
                        <div className="mt-3 text-sm bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-rose-700">ملاحظة المراجع: {w.review_note}</div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <Button size="sm" variant="outline" onClick={() => nav(`/studio/${w.id}`)} className="pressable rounded-full min-h-[40px] px-4">قراءة</Button>
                      {(w.status === "draft" || w.status === "rejected") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(w)} className="pressable rounded-full min-h-[40px] px-4">تعديل</Button>
                          <Button size="sm" onClick={() => submit(w.id)} className="pressable rounded-full min-h-[40px] px-4 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-md shadow-violet-200"><Send className="w-3.5 h-3.5 ml-1" /> إرسال للمراجعة</Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(w.id)} className="pressable rounded-full min-h-[40px] text-rose-600"><Trash2 className="w-4 h-4" /></Button>
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
          <DialogContent className="max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] p-0 gap-0" dir="rtl">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md pl-6 pr-14 pt-6 pb-4 border-b border-slate-100">
              <DialogHeader>
                <DialogTitle className="font-head text-xl font-extrabold flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white grid place-items-center shadow-lg shadow-violet-200"><PenLine className="w-4 h-4" /></span>
                  {editing === "new" ? "عمل جديد" : "تعديل العمل"}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان جذّاب لعملك..." className="rounded-2xl mt-1.5 h-12" />
              </div>
              <div>
                <Label>النوع</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {TYPES.map((t) => {
                    const meta = TYPE_META[t.v] || TYPE_META.article;
                    const active = form.type === t.v;
                    return (
                      <button key={t.v} onClick={() => setForm({ ...form, type: t.v })} className={`pressable min-h-[64px] p-3 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${active ? `bg-gradient-to-br ${meta.g} text-white border-transparent shadow-lg scale-[1.02]` : "border-slate-200 text-slate-500 hover:border-violet-300 hover:bg-violet-50/50"}`}>
                        <t.icon className="w-5 h-5" />{t.l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>النص</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="اكتب إبداعك هنا..." className="rounded-2xl mt-1.5 min-h-[240px] lg:min-h-[320px] leading-loose bg-slate-50/60 focus:bg-white text-base" />
                <div className="flex items-center justify-between mt-2">
                  <div className="h-2 flex-1 ml-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-violet-500 via-purple-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${Math.min(100, (form.content.length / 20000) * 100)}%` }} />
                  </div>
                  <div className="text-xs font-bold text-slate-400 shrink-0">{form.content.length} / 20000</div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-t border-slate-100">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => save(false)} disabled={saving} variant="outline" className="pressable rounded-full min-h-[48px] flex-1">حفظ كمسودة</Button>
                <Button onClick={() => save(true)} disabled={saving} className="pressable rounded-full min-h-[48px] flex-1 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-200"><Send className="w-4 h-4 ml-1" /> حفظ وإرسال للمراجعة</Button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">تُراجع الأعمال تحريرياً من المشرفين قبل ظهورها في المعرض</p>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
