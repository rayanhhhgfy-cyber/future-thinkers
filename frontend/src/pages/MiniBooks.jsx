import React, { useEffect, useMemo, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  BookMarked, Plus, Search, Heart, Eye, X, ChevronLeft, ChevronRight,
  Trash2, Loader2, Feather, LibraryBig, Sparkles, Clock3, Crown,
  TrendingUp, CalendarDays, ThumbsUp, BookOpen,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* كتيّبات الطلاب · student-authored mini-books in a fully glass library:
   glowing 3D covers with glass footers, a featured shelf, and a luminous
   full-screen glass reader. */
const COVERS = ["#7c3aed", "#db2777", "#0891b2", "#059669", "#d97706", "#dc2626", "#2563eb", "#0f766e"];

export default function MiniBooks() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("new");
  const [mine, setMine] = useState([]);
  const [reading, setReading] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [works, setWorks] = useState([]);
  const [form, setForm] = useState({ title: "", intro: "", source_work_id: "", cover_color: COVERS[0] });
  const [pagesText, setPagesText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        api.get("/growth/minibooks", { params: { q } }),
        api.get("/growth/minibooks/mine"),
      ]);
      setItems(a.data);
      setMine(b.data);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [q]); // eslint-disable-line

  useEffect(() => {
    if (!showCreate) return;
    api.get("/studio/works/me").then((r) => setWorks(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [showCreate]);

  const stats = useMemo(() => {
    const all = items || [];
    return {
      count: all.length,
      reads: all.reduce((a, b) => a + (b.reads || 0), 0),
      likes: all.reduce((a, b) => a + (b.likes || 0), 0),
    };
  }, [items]);

  if (!items) return <Layout><PageLoader /></Layout>;

  const baseList = tab === "mine" ? mine : items;
  const list = [...baseList].sort((a, b) =>
    sort === "reads" ? (b.reads || 0) - (a.reads || 0)
      : sort === "likes" ? (b.likes || 0) - (a.likes || 0)
        : String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const featured = tab === "all" && !q && list.length >= 3
    ? [...list].sort((a, b) => (b.reads || 0) - (a.reads || 0))[0] : null;
  const gridList = featured ? list.filter((b) => b.id !== featured.id) : list;

  const create = async () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان الكتيّب"); return; }
    let pages = [];
    if (!form.source_work_id) {
      pages = pagesText.split(/\n\s*---\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => ({ heading: "", text: t }));
      if (!pages.length && pagesText.trim()) pages = [{ heading: "", text: pagesText.trim() }];
      if (!pages.length) { toast.error("اكتب صفحات الكتيّب أو اختر عملاً من الاستوديو"); return; }
    }
    setBusy(true);
    try {
      await api.post("/growth/minibooks", {
        title: form.title.trim(), intro: form.intro.trim(),
        cover_color: form.cover_color, pages,
        source_work_id: form.source_work_id || null,
      });
      toast.success("نُشر كتيّبك في مكتبة الطلاب 🎉");
      setShowCreate(false);
      setForm({ title: "", intro: "", source_work_id: "", cover_color: COVERS[0] });
      setPagesText("");
      setTab("all");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const openBook = async (id) => {
    try {
      const { data } = await api.get(`/growth/minibooks/${id}`);
      setReading(data);
    } catch (e) { toast.error(apiErr(e)); }
  };

  const like = async (id) => {
    try {
      const { data } = await api.post(`/growth/minibooks/${id}/like`);
      const bump = (arr) => arr.map((b) => b.id === id ? { ...b, liked: data.liked, likes: Math.max(0, (b.likes || 0) + (data.liked ? 1 : -1)) } : b);
      setItems(bump);
      setMine(bump);
    } catch (e) { toast.error(apiErr(e)); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/growth/minibooks/${id}`);
      toast.success("حُذف الكتيّب");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <Layout>
      <div className="relative w-full max-w-[1150px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ambient page glow */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-96 overflow-visible">
          <div className="absolute right-[6%] top-0 w-72 h-72 rounded-full bg-fuchsia-400/[0.13] blur-3xl" />
          <div className="absolute left-[4%] top-24 w-72 h-72 rounded-full bg-cyan-400/[0.12] blur-3xl" />
        </div>

        <FadeUp className="relative">
          <div className="relative overflow-hidden rounded-[30px] ft-navy-gradient grain text-white p-6 sm:p-9 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-fuchsia-500/25 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-l from-transparent via-white/50 to-transparent" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-fuchsia-200 backdrop-blur-md"><Feather className="w-3.5 h-3.5" /> من قارئ إلى مؤلف</div>
                <h1 className="font-head text-3xl sm:text-[2.6rem] font-black mt-3.5 leading-tight">كتيّبات الطلاب</h1>
                <p className="text-slate-300 text-sm mt-2 max-w-lg leading-relaxed">مكتبة زجاجية لكتب قصيرة يكتبها أعضاء النادي بأنفسهم: انشر كتيّبك، واقرأ كتب زملائك كأنها كتب حقيقية بين يديك.</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  {[
                    { n: stats.count, l: "كتيّب منشور", icon: BookMarked },
                    { n: stats.reads, l: "قراءة", icon: Eye },
                    { n: stats.likes, l: "إعجاب", icon: Heart },
                  ].map((s) => (
                    <span key={s.l} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md px-3.5 py-2">
                      <s.icon className="w-4 h-4 text-fuchsia-300" />
                      <span className="font-head font-black tabular-nums">{s.n}</span>
                      <span className="text-[11px] font-bold text-slate-300">{s.l}</span>
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowCreate((s) => !s)} className="pressable shrink-0 inline-flex items-center gap-2 h-[52px] px-7 rounded-2xl bg-gradient-to-l from-fuchsia-500 to-purple-500 text-white text-sm font-extrabold shadow-xl shadow-fuchsia-500/40 ring-1 ring-white/25">
                <Plus className="w-5 h-5" /> انشر كتيّبك
              </button>
            </div>
          </div>
        </FadeUp>

        {showCreate && (
          <FadeUp className="relative">
            <div className="mt-5 rounded-[28px] p-[1px] bg-gradient-to-br from-fuchsia-400/50 via-white/40 to-cyan-300/40 ft-shadow">
              <div className="rounded-[27px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-7">
                <h3 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-fuchsia-500" /> كتيّب جديد</h3>
                <div className="grid lg:grid-cols-[1fr_190px] gap-5 mt-4">
                  <div className="min-w-0">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الكتيّب" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-fuchsia-400/50 outline-none px-4 py-3 text-sm font-bold placeholder:font-medium" />
                      <select value={form.source_work_id} onChange={(e) => setForm({ ...form, source_work_id: e.target.value })} className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] outline-none px-4 py-3 text-sm">
                        <option value="">اكتب الصفحات بنفسك هنا</option>
                        {works.map((w) => <option key={w.id} value={w.id}>من عملي في الاستوديو: {w.title}</option>)}
                      </select>
                      <input value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} placeholder="سطر تعريفي يشد القارئ (اختياري)" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-fuchsia-400/50 outline-none px-4 py-3 text-sm sm:col-span-2" />
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-500">لون الغلاف:</span>
                      {COVERS.map((c) => (
                        <button key={c} onClick={() => setForm({ ...form, cover_color: c })} className={`w-9 h-9 rounded-xl shadow-md transition-all ${form.cover_color === c ? "ring-[3px] ring-slate-900/60 scale-110" : "hover:scale-105"}`} style={{ background: `linear-gradient(140deg, ${c}, ${c}77)` }} aria-label="لون الغلاف" />
                      ))}
                    </div>
                    {!form.source_work_id ? (
                      <textarea value={pagesText} onChange={(e) => setPagesText(e.target.value)} rows={7}
                        placeholder={"اكتب صفحات كتيّبك هنا…\nافصل بين كل صفحة والتي بعدها بسطر فيه ---\n\nالصفحة الأولى\n---\nالصفحة الثانية"}
                        className="w-full mt-4 rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-fuchsia-400/50 outline-none px-4 py-3 text-sm leading-loose" />
                    ) : (
                      <p className="text-xs font-bold text-slate-400 mt-4 rounded-2xl bg-fuchsia-500/[0.06] ring-1 ring-fuchsia-500/10 px-4 py-3.5 leading-relaxed">سيحوّل النظام عملك المختار من الاستوديو إلى صفحات مرتبة تلقائياً عند النشر.</p>
                    )}
                  </div>
                  {/* live cover preview */}
                  <div className="hidden lg:block">
                    <div className="text-[11px] font-extrabold text-slate-400 mb-2">معاينة الغلاف</div>
                    <MiniCover title={form.title || "عنوان كتيّبك"} author={user?.name || "اسمك"} color={form.cover_color} pages={0} preview />
                  </div>
                </div>
                <div className="flex gap-2 mt-5 flex-wrap">
                  <button onClick={create} disabled={busy} className="pressable h-12 px-7 rounded-2xl bg-gradient-to-l from-fuchsia-500 to-purple-600 text-white text-sm font-extrabold shadow-lg shadow-fuchsia-600/30 disabled:opacity-50 inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />} نشر الكتيّب</button>
                  <button onClick={() => setShowCreate(false)} className="h-12 px-5 rounded-2xl text-sm font-extrabold text-slate-500">إلغاء</button>
                </div>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp className="relative">
          <div className="flex flex-wrap items-center gap-3 mt-7">
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-slate-900/[0.05] ft-shadow">
              {[{ id: "all", label: "المكتبة", icon: LibraryBig }, { id: "mine", label: "كتيّباتي", icon: Feather }].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${tab === t.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/60 backdrop-blur-xl ring-1 ring-slate-900/[0.05] ft-shadow">
              {[{ id: "new", label: "الأحدث", icon: CalendarDays }, { id: "reads", label: "الأكثر قراءة", icon: TrendingUp }, { id: "likes", label: "الأكثر إعجاباً", icon: ThumbsUp }].map((t) => (
                <button key={t.id} onClick={() => setSort(t.id)} className={`pressable inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-extrabold transition-all ${sort === t.id ? "bg-gradient-to-l from-fuchsia-500 to-purple-500 text-white shadow-md shadow-fuchsia-500/30" : "text-slate-500 hover:text-slate-700"}`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              ))}
            </div>
            <label className="flex-1 min-w-[190px] relative">
              <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بعنوان كتيّب…" className="w-full h-12 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-slate-900/[0.05] focus:ring-2 focus:ring-fuchsia-400/50 outline-none ps-4 pe-11 text-sm ft-shadow" />
            </label>
          </div>
        </FadeUp>

        {featured && (
          <FadeUp className="relative">
            <section className="mt-6 relative overflow-hidden rounded-[30px] p-[1px] ft-shadow-lg" style={{ background: `linear-gradient(120deg, ${featured.cover_color || "#7c3aed"}66, rgba(255,255,255,0.35), ${featured.cover_color || "#7c3aed"}44)` }}>
              <div className="relative rounded-[29px] bg-white/65 backdrop-blur-2xl backdrop-saturate-150 overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: featured.cover_color || "#7c3aed" }} />
                <div className="relative grid sm:grid-cols-[210px_1fr] gap-5 sm:gap-7 p-5 sm:p-7 items-center">
                  <button onClick={() => openBook(featured.id)} className="pressable w-[150px] sm:w-full mx-auto sm:mx-0">
                    <MiniCover title={featured.title} author={featured.author_name} color={featured.cover_color} pages={featured.pages_count} />
                  </button>
                  <div className="min-w-0 text-center sm:text-start">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full text-white shadow-lg" style={{ background: `linear-gradient(120deg, ${featured.cover_color || "#7c3aed"}, ${featured.cover_color || "#7c3aed"}aa)` }}><Crown className="w-3.5 h-3.5" /> الأكثر قراءة في المكتبة</span>
                    <h2 className="font-head font-black text-2xl sm:text-[2rem] text-slate-900 leading-snug mt-3">{featured.title}</h2>
                    <div className="text-xs font-bold text-slate-400 mt-1">بقلم {featured.author_name} · {featured.pages_count} صفحة</div>
                    {featured.intro && <p className="text-sm text-slate-600 leading-relaxed mt-3 line-clamp-3">{featured.intro}</p>}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 mt-5">
                      <button onClick={() => openBook(featured.id)} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl text-white text-sm font-extrabold shadow-xl ring-1 ring-white/30" style={{ background: `linear-gradient(120deg, ${featured.cover_color || "#7c3aed"}, ${featured.cover_color || "#7c3aed"}bb)`, boxShadow: `0 14px 30px -10px ${featured.cover_color || "#7c3aed"}88` }}>
                        <BookOpen className="w-4.5 h-4.5 w-5 h-5" /> اقرأ الآن
                      </button>
                      <button onClick={() => like(featured.id)} className={`pressable inline-flex items-center gap-2 h-12 px-5 rounded-2xl text-sm font-extrabold ring-1 backdrop-blur-md ${featured.liked ? "bg-rose-500 text-white ring-rose-400 shadow-lg shadow-rose-500/30" : "bg-white/70 text-slate-600 ring-slate-900/[0.06]"}`}>
                        <Heart className={`w-4.5 h-4.5 w-5 h-5 ${featured.liked ? "fill-white" : "text-rose-500"}`} /> {featured.likes || 0}
                      </button>
                      <span className="inline-flex items-center gap-1.5 h-12 px-4 rounded-2xl bg-white/50 ring-1 ring-slate-900/[0.05] text-xs font-extrabold text-slate-500"><Eye className="w-4 h-4" /> {featured.reads || 0} قراءة</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </FadeUp>
        )}

        {gridList.length === 0 && !featured ? (
          <div className="mt-6 relative overflow-hidden rounded-[30px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-10 sm:p-14 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-16 left-1/3 w-56 h-56 rounded-full bg-fuchsia-400/15 blur-3xl" />
            <div className="relative">
              <div className="flex justify-center -space-x-5" dir="ltr">
                {["#7c3aed", "#0891b2", "#d97706"].map((c, i) => (
                  <span key={c} className="w-14 h-[4.2rem] rounded-lg shadow-xl ring-1 ring-black/10 grid place-items-start justify-center pt-2" style={{ background: `linear-gradient(150deg, ${c}, ${c}88)`, transform: `rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -6 : 2}px)`, zIndex: i === 1 ? 2 : 1 }}>
                    <BookMarked className="w-5 h-5 text-white/80" />
                  </span>
                ))}
              </div>
              <h2 className="font-head font-black text-xl text-slate-900 mt-6">{tab === "mine" ? "رفّك فارغ بعد" : "المكتبة بانتظار أول مؤلف"}</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{tab === "mine" ? "انشر كتيّبك الأول وسيظهر هنا على رفك الخاص." : "كن أول من ينشر كتيّباً في مكتبة طلاب النادي."}</p>
              <button onClick={() => setShowCreate(true)} className="pressable mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-l from-fuchsia-500 to-purple-600 text-white text-sm font-extrabold shadow-xl shadow-fuchsia-500/35"><Plus className="w-5 h-5" /> انشر كتيّباً الآن</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-5 mt-8">
            {gridList.map((b) => (
              <FadeUp key={b.id}>
                <div className="group">
                  <div className="relative transition-all duration-300 group-hover:-translate-y-2 group-hover:rotate-[-0.6deg]">
                    <button onClick={() => openBook(b.id)} className="pressable block w-full text-start">
                      <MiniCover title={b.title} author={b.author_name} color={b.cover_color} pages={b.pages_count} />
                    </button>
                    <button onClick={() => like(b.id)} aria-label="إعجاب"
                      className={`pressable absolute top-3 left-3 z-10 w-9 h-9 grid place-items-center rounded-full backdrop-blur-xl ring-1 transition-all ${b.liked ? "bg-rose-500 text-white ring-rose-300 shadow-lg shadow-rose-500/40" : "bg-black/25 text-white ring-white/30 hover:bg-rose-500/80"}`}>
                      <Heart className={`w-4 h-4 ${b.liked ? "fill-white" : ""}`} />
                    </button>
                    {b.author_id === user?.id && (
                      <button onClick={() => remove(b.id)} aria-label="حذف كتيّبي"
                        className="pressable absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-black/25 text-white ring-1 ring-white/30 backdrop-blur-xl hover:bg-rose-600/90 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="px-1 pt-3">
                    <button onClick={() => openBook(b.id)} className="pressable block w-full text-start">
                      <div className="font-head font-extrabold text-[15px] text-slate-900 leading-snug line-clamp-1 group-hover:text-fuchsia-700 transition-colors">{b.title}</div>
                    </button>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-400 min-w-0">
                      <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] font-black text-white shrink-0" style={{ background: `linear-gradient(135deg, ${b.cover_color || "#7c3aed"}, ${b.cover_color || "#7c3aed"}88)` }}>{(b.author_name || "؟")[0]}</span>
                      <span className="truncate">{b.author_name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-slate-400">
                      <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {(b.reads || 0).toLocaleString("ar-JO")}</span>
                      <span className={`inline-flex items-center gap-1 ${b.liked ? "text-rose-500" : ""}`}><Heart className={`w-3.5 h-3.5 ${b.liked ? "fill-rose-500" : ""}`} /> {b.likes || 0}</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {b.pages_count} صفحة</span>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        )}
      </div>
      {reading && <MiniReader book={reading} onClose={() => { setReading(null); load(); }}
        onLike={async () => { await like(reading.id); setReading((r) => r ? { ...r, liked: !r.liked, likes: Math.max(0, (r.likes || 0) + (r.liked ? -1 : 1)) } : r); }} />}
    </Layout>
  );
}

function MiniCover({ title, author, color = "#7c3aed", pages = 0, preview = false }) {
  return (
    <div className="relative aspect-[3/4] rounded-[18px] overflow-hidden ring-1 ring-black/25 shadow-[0_24px_40px_-16px_rgba(2,6,23,0.55)]"
      style={{ background: `linear-gradient(155deg, ${color}f2 0%, ${color}c4 46%, #0b1026 130%)` }}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_88%_6%,rgba(255,255,255,0.4),transparent_52%)]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_10%_96%,rgba(0,0,0,0.35),transparent_55%)]" />
      {/* page edges peeking on the left */}
      <div aria-hidden className="absolute inset-y-[5px] left-[3px] w-[5px] rounded-full bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.75)_0px,rgba(255,255,255,0.75)_1.5px,rgba(0,0,0,0.10)_1.5px,rgba(0,0,0,0.10)_3px)] opacity-80" />
      {/* spine fold on the right (RTL book) */}
      <div aria-hidden className="absolute inset-y-0 right-0 w-[13%] bg-gradient-to-l from-black/[0.38] via-white/[0.13] to-transparent" />
      <BookMarked aria-hidden className="absolute -bottom-5 -left-5 w-28 h-28 text-white/[0.13] -rotate-12" />
      <div className="relative h-full flex flex-col p-4 sm:p-[1.1rem]">
        <div className="flex items-start justify-between gap-2">
          <span className="w-8 h-8 rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur-md grid place-items-center shrink-0"><BookMarked className="w-4.5 h-4.5 w-5 h-5 text-white" /></span>
          {pages > 0 && <span className="text-[9px] font-black text-white bg-black/30 ring-1 ring-white/25 backdrop-blur-md px-2 py-1 rounded-full">{pages} صفحة</span>}
        </div>
        <div className="font-head font-black text-white text-[17px] sm:text-lg leading-[1.35] mt-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] line-clamp-3">{title || "عنوان كتيّبك"}</div>
        <div className="mt-auto">
          <div aria-hidden className="h-px w-10 bg-white/50 mb-2" />
          <div className="text-[11px] font-extrabold text-white/95 truncate">{author || "اسم المؤلف"}</div>
          <div className="text-[9px] font-bold text-white/60 mt-0.5">كتيّب طلابي · مفكرو المستقبل</div>
        </div>
      </div>
      {preview && <div aria-hidden className="absolute inset-0 rounded-[18px] ring-1 ring-white/20" />}
    </div>
  );
}

function MiniReader({ book, onClose, onLike }) {
  const [page, setPage] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [fs, setFs] = useState(1);
  const pages = book.pages || [];
  const p = pages[page] || { heading: "", text: "" };
  const pct = pages.length ? ((page + 1) / pages.length) * 100 : 0;
  const color = book.cover_color || "#7c3aed";

  const go = (n) => {
    const next = Math.max(0, Math.min(pages.length - 1, n));
    if (next !== page) { setPage(next); setAnimKey((k) => k + 1); }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(page + 1);
      if (e.key === "ArrowRight") go(page - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden" dir="rtl">
      <div aria-hidden className="absolute inset-0 bg-[#070a1d]" />
      <div aria-hidden className="absolute -top-36 right-[6%] w-[28rem] h-[28rem] rounded-full blur-[120px] opacity-35 transition-colors duration-700" style={{ background: color }} />
      <div aria-hidden className="absolute -bottom-40 left-[4%] w-[26rem] h-[26rem] rounded-full bg-cyan-500/15 blur-[120px]" />
      <div aria-hidden className="absolute top-1/3 left-[38%] w-72 h-72 rounded-full bg-fuchsia-600/10 blur-[100px]" />
      <style>{`@keyframes ftPageIn { from { opacity: 0; transform: translateY(14px) scale(.992); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

      <div className="relative h-[100dvh] flex flex-col">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 m-3 sm:m-4 mb-0 rounded-[22px] bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl">
          <button onClick={onClose} className="pressable w-10 h-10 grid place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-white shrink-0" aria-label="إغلاق"><X className="w-5 h-5" /></button>
          <span className="w-10 h-10 rounded-2xl grid place-items-center text-white shrink-0 ring-1 ring-white/25 shadow-lg" style={{ background: `linear-gradient(140deg, ${color}, ${color}88)` }}><BookMarked className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <div className="font-head font-extrabold text-white truncate">{book.title}</div>
            <div className="text-[11px] text-white/60 font-bold truncate">{book.author_name} · صفحة {page + 1} من {pages.length}</div>
          </div>
          <button onClick={onLike} className={`pressable inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl text-xs font-extrabold ring-1 backdrop-blur-md transition-all ${book.liked ? "bg-rose-500 text-white ring-rose-300 shadow-lg shadow-rose-500/40" : "bg-white/10 text-white ring-white/20"}`}>
            <Heart className={`w-4 h-4 ${book.liked ? "fill-white" : ""}`} /> {(book.likes || 0).toLocaleString("ar-JO")}
          </button>
        </div>

        <div className="relative flex-1 flex items-center justify-center px-3 sm:px-8 py-3 min-h-0">
          {/* right vertical rail · pinned to the screen edge (desktop) */}
          <aside className="hidden lg:flex absolute top-1/2 -translate-y-1/2 right-2 xl:right-5 z-20 w-[76px] flex-col items-center gap-4 rounded-[26px] bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.55)] px-3 py-5">
            <div className="text-center">
              <div className="font-head text-[26px] font-black text-white leading-none tabular-nums">{page + 1}</div>
              <div className="text-[9px] font-bold text-white/50 mt-1">من <span dir="ltr" className="tabular-nums">{pages.length}</span></div>
            </div>
            <div className="relative w-1.5 h-44 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)}>
              <div className="absolute bottom-0 inset-x-0 rounded-full transition-all duration-500" style={{ height: `${pct}%`, background: `linear-gradient(to top, ${color}, #22d3ee)` }} />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black text-white/85 tabular-nums">{Math.round(pct)}٪</div>
              <div className="text-[9px] font-bold text-white/45 mt-0.5">أنجزت</div>
            </div>
            <div aria-hidden className="w-8 h-px bg-white/15" />
            <button onClick={onLike} className={`pressable w-12 h-12 grid place-items-center rounded-2xl ring-1 transition-all ${book.liked ? "bg-rose-500 text-white ring-rose-300 shadow-lg shadow-rose-500/40" : "bg-white/10 text-white ring-white/20 hover:bg-rose-500/70"}`} aria-label="إعجاب">
              <Heart className={`w-5 h-5 ${book.liked ? "fill-white" : ""}`} />
            </button>
            <div className="text-center -mt-2">
              <div className="text-[10px] font-black text-white/85 tabular-nums">{(book.likes || 0).toLocaleString("ar-JO")}</div>
              <div className="text-[9px] font-bold text-white/45">إعجاب</div>
            </div>
            <div className="text-center">
              <Eye className="w-4.5 h-4.5 w-5 h-5 text-white/70 mx-auto" />
              <div className="text-[10px] font-black text-white/85 tabular-nums mt-1">{(book.reads || 0).toLocaleString("ar-JO")}</div>
              <div className="text-[9px] font-bold text-white/45">قراءة</div>
            </div>
          </aside>
          <div className="relative w-full max-w-2xl h-full max-h-[780px]">
            <div aria-hidden className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-[26px] bg-white/[0.07] ring-1 ring-white/10 rotate-[0.7deg]" />
            <div aria-hidden className="absolute inset-0 -translate-x-1.5 translate-y-1 rounded-[26px] bg-white/[0.05] ring-1 ring-white/[0.07] rotate-[-0.5deg]" />
            <div key={animKey} className="relative h-full rounded-[26px] bg-[#fdfcf7]/95 backdrop-blur-xl shadow-[0_50px_90px_-24px_rgba(0,0,0,0.65)] ring-1 ring-black/25 overflow-hidden flex flex-col" style={{ animation: "ftPageIn .38s cubic-bezier(.22,1,.36,1)" }}>
              <div aria-hidden className="absolute inset-y-0 right-0 w-[30px] bg-gradient-to-l from-black/[0.08] via-black/[0.02] to-transparent z-10 pointer-events-none" />
              <div aria-hidden className="absolute inset-y-0 left-0 w-[10px] bg-gradient-to-r from-black/[0.05] to-transparent z-10 pointer-events-none" />
              <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10">
                {page === 0 && (
                  <div className="text-center mb-9">
                    <span className="inline-grid w-14 h-14 rounded-[18px] place-items-center text-white shadow-xl ring-1 ring-black/10" style={{ background: `linear-gradient(140deg, ${color}, ${color}88)` }}><BookMarked className="w-7 h-7" /></span>
                    <h2 className="font-head font-black text-[1.7rem] sm:text-4xl text-slate-900 leading-snug mt-4">{book.title}</h2>
                    <div className="text-xs font-extrabold text-slate-400 mt-2">بقلم {book.author_name}</div>
                    {book.intro && <p className="text-sm text-slate-500 leading-relaxed mt-3.5 max-w-md mx-auto">{book.intro}</p>}
                    <div className="flex items-center justify-center gap-2 mt-7" aria-hidden>
                      <span className="h-px w-14 bg-slate-900/15" />
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="h-px w-14 bg-slate-900/15" />
                    </div>
                  </div>
                )}
                {p.heading ? (
                  <h3 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-[11px] font-black shrink-0 shadow" style={{ background: `linear-gradient(140deg, ${color}, ${color}99)` }}>{page + 1}</span>
                    {p.heading}
                  </h3>
                ) : null}
                <p className="text-[15px] sm:text-[1.05rem] leading-[2.15] text-slate-800 whitespace-pre-wrap font-medium" style={{ fontSize: `${1.02 * fs}rem` }}>{p.text}</p>
                {page === pages.length - 1 && pages.length > 0 && (
                  <div className="text-center mt-12">
                    <div className="flex items-center justify-center gap-2" aria-hidden>
                      <span className="h-px w-10 bg-slate-900/15" /><span className="text-[11px] font-black tracking-[0.3em] text-slate-400">النهاية</span><span className="h-px w-10 bg-slate-900/15" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-3">أعجبك الكتيّب؟ ادعم مؤلفه بقلب من الأعلى · عدد قراءاته {(book.reads || 0).toLocaleString("ar-JO")}</p>
                  </div>
                )}
              </div>
              <div className="relative px-6 sm:px-10 pb-4 flex items-center justify-between text-[10px] font-bold text-slate-300">
                <span>{book.title}</span>
                <span className="tabular-nums">{page + 1}</span>
              </div>
            </div>
          </div>
          {/* left vertical rail · pinned to the screen edge (desktop) */}
          <aside className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-2 xl:left-5 z-20 w-[76px] flex-col items-center gap-3 rounded-[26px] bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.55)] px-3 py-5">
            <button onClick={() => go(page + 1)} disabled={page >= pages.length - 1}
              className="pressable w-12 h-14 grid place-items-center rounded-2xl text-white ring-1 ring-white/25 shadow-lg disabled:opacity-30"
              style={{ background: `linear-gradient(140deg, ${color}, ${color}bb)`, boxShadow: `0 12px 26px -10px ${color}99` }} aria-label="الصفحة التالية">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-[9px] font-bold text-white/45">التالي</div>
            <button onClick={() => go(page - 1)} disabled={page === 0}
              className="pressable w-12 h-14 grid place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 disabled:opacity-30" aria-label="الصفحة السابقة">
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="text-[9px] font-bold text-white/45">السابق</div>
            <div aria-hidden className="w-8 h-px bg-white/15 my-1" />
            <button onClick={() => setFs((v) => Math.min(1.3, +(v + 0.08).toFixed(2)))} disabled={fs >= 1.3}
              className="pressable w-12 h-12 grid place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 disabled:opacity-30 font-head font-black text-[22px] leading-none" aria-label="تكبير الخط">A</button>
            <button onClick={() => setFs((v) => Math.max(0.85, +(v - 0.08).toFixed(2)))} disabled={fs <= 0.85}
              className="pressable w-12 h-12 grid place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 disabled:opacity-30 font-head font-black text-[15px] leading-none" aria-label="تصغير الخط">A</button>
            <div className="text-[9px] font-bold text-white/45">حجم الخط</div>
          </aside>
        </div>

        <div className="px-4 sm:px-6 pb-[max(14px,env(safe-area-inset-bottom))] lg:hidden">
          <div className="max-w-2xl mx-auto rounded-[22px] bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl px-3.5 py-3 flex items-center gap-3">
            <button onClick={() => go(page - 1)} disabled={page === 0} className="pressable w-11 h-11 grid place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 disabled:opacity-30 shrink-0" aria-label="الصفحة السابقة"><ChevronRight className="w-5 h-5" /></button>
            <div className="flex-1 min-w-0">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(to left, ${color}, #22d3ee)` }} />
              </div>
              <div className="text-center text-[10px] font-bold text-white/60 mt-1.5">{Math.round(pct)}٪ من الكتيّب · <span dir="ltr" className="inline-block tabular-nums">{page + 1} / {pages.length}</span></div>
            </div>
            <button onClick={() => go(page + 1)} disabled={page >= pages.length - 1} className="pressable w-11 h-11 grid place-items-center rounded-2xl text-white shadow-lg disabled:opacity-30 shrink-0 ring-1 ring-white/25" style={{ background: `linear-gradient(140deg, ${color}, ${color}bb)`, boxShadow: `0 10px 24px -8px ${color}99` }} aria-label="الصفحة التالية"><ChevronLeft className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
