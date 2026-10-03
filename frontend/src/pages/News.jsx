import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Newspaper, CalendarDays, ArrowLeft, Sparkles, LayoutGrid, Eye, MessageCircle, Send, Trash2, BookOpen, Loader2, Clock3, Flame, Zap, Trophy, Megaphone, Radio } from "lucide-react";

/* قراءة تقريبية بعدد الدقائق · عرض فقط */
const readMinutes = (body) => Math.max(1, Math.round((body?.length || 0) / 900));

/* أيقونات تدور على رقائق التصنيفات · عرض فقط */
const CAT_ICONS = [Zap, BookOpen, CalendarDays, Trophy, Megaphone, Sparkles, Flame];
/* تدرجات أغلفة بديلة عند غياب صورة · عرض فقط */
const COVER_GRADS = [
  "from-blue-700 via-cyan-600 to-emerald-600",
  "from-violet-700 via-purple-600 to-fuchsia-500",
  "from-rose-600 via-orange-500 to-amber-500",
  "from-emerald-700 via-teal-600 to-cyan-500",
  "from-slate-800 via-slate-600 to-slate-500",
  "from-indigo-700 via-blue-600 to-sky-500",
];
const coverGrad = (seed) => COVER_GRADS[Math.abs(String(seed || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COVER_GRADS.length];

/* تاريخ الخبر وعدد الأيام منذ نشره · تنظيم الأرشيف فقط */
const storyDate = (n) => {
  const raw = n?.created_at || n?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (d) => Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);

export default function News() {
  const [data, setData] = useState(null);
  const [cat, setCat] = useState("");
  const [expanded, setExpanded] = useState(null);
  const viewedRef = useRef(new Set());
  useEffect(() => {
    api.get("/news").then((r) => setData(r.data));
  }, []);

  const all = data?.items || [];
  const cats = [...new Set(all.map((n) => n.category).filter(Boolean))];
  const items = cat ? all.filter((n) => n.category === cat) : all;
  const featured = items[0];
  const rest = items.slice(1);
  /* Fire a view ping exactly once per article per session (defensive). */
  const pingView = (id) => {
    if (!id || viewedRef.current.has(id)) return;
    viewedRef.current.add(id);
    api.post(`/news/${id}/view`).catch(() => {});
  };
  const toggle = (id) => { if (expanded !== id) pingView(id); setExpanded((x) => (x === id ? null : id)); };
  /* Open an article from the breaking bar / explorer / archive (scroll + expand). */
  const openArticle = (id) => {
    if (!id) return;
    setCat("");
    pingView(id);
    setExpanded(id);
    setTimeout(() => document.getElementById(`news-article-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };
  /* Apply a category from the explorer (re-click clears) and glide to the stream. */
  const exploreCategory = (c) => {
    setCat((cur) => (cur === c ? "" : c));
    setTimeout(() => document.getElementById("news-stream")?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };
  /* استكشاف التصنيفات · بطاقة لكل تصنيف حاضر في البيانات */
  const catCards = cats.map((c) => {
    const list = all.filter((n) => n.category === c);
    return { name: c, count: list.length, newest: list[0] };
  });
  /* أرشيف الأسبوع · الأخبار مجمّعة حسب اليوم (آخر ٧ أيام) */
  const weekGroups = (() => {
    const byDay = new Map();
    all.forEach((n) => {
      const d = storyDate(n);
      if (!d) return;
      const diff = dayDiff(d);
      if (diff < 0 || diff > 6) return;
      if (!byDay.has(diff)) byDay.set(diff, []);
      byDay.get(diff).push(n);
    });
    return [...byDay.keys()].sort((a, b) => a - b).map((diff) => {
      const list = byDay.get(diff);
      const d = storyDate(list[0]);
      return {
        diff,
        label: diff === 0 ? "اليوم" : diff === 1 ? "أمس" : d.toLocaleDateString("ar", { weekday: "long" }),
        dateLine: d.toLocaleDateString("ar", { day: "numeric", month: "long" }),
        items: list,
      };
    });
  })();
  const weekCount = weekGroups.reduce((s, g) => s + g.items.length, 0);
  const todayLine = new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Layout>
      {/* حركة شريط المستجدات المتحرك · توقف عند اللمس/التمرير فوقه */}
      <style>{`
        @keyframes ft-live-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ft-live-track { animation-name: ft-live-marquee; animation-timing-function: linear; animation-iteration-count: infinite; }
        .ft-live-marquee:hover .ft-live-track, .ft-live-marquee:active .ft-live-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ft-live-track { animation: none; } }
      `}</style>

      {/* ===== شريط آخر المستجدات ===== */}
      {data && all.length > 0 && (
        <div className="bg-slate-950 text-white animate-fade-up">
          <div className="mx-auto flex max-w-7xl items-stretch px-0 sm:px-6 lg:px-8 xl:max-w-[1440px]">
            <span className="relative z-10 inline-flex shrink-0 items-center gap-2 bg-rose-600 px-3.5 py-2.5 text-[11px] font-black tracking-wide shadow-[8px_0_16px_rgba(2,6,23,0.45)] sm:px-4 sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              آخر المستجدات
            </span>
            <div dir="ltr" className="ft-live-marquee relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
              <div className="ft-live-track flex w-max items-center gap-10 py-2.5 pl-10" style={{ animationDuration: `${Math.min(90, Math.max(28, all.length * 7))}s` }}>
                {[...all, ...all].map((n, i) => (
                  <button key={`${n.id}-${i}`} onClick={() => openArticle(n.id)} className="pressable inline-flex shrink-0 items-center gap-2 text-start text-xs font-bold text-white/85 transition hover:text-white sm:text-[13px]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span dir="rtl" className="whitespace-nowrap">{n.title}</span>
                    {n.category && <span dir="rtl" className="hidden whitespace-nowrap rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold text-white/60 ring-1 ring-white/10 sm:inline-block">{n.category}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ترويسة البث ===== */}
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -top-28 left-[12%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-[8%] h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <Newspaper className="pointer-events-none absolute -left-10 bottom-4 h-48 w-48 rotate-12 text-white/[0.06] lg:h-64 lg:w-64" />
        <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 sm:pt-9 lg:px-8 xl:max-w-[1440px]">
          <div className="flex flex-wrap items-center gap-2 animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-[11px] font-black tracking-wide shadow-lg shadow-rose-950/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              بث مباشر
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75 ring-1 ring-white/15 backdrop-blur">
              <Radio className="h-3.5 w-3.5 text-cyan-300" /> نادي مفكّري المستقبل
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/75 ring-1 ring-white/15 backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-300" /> {todayLine}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
            <div>
              <h1 className="font-head text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">الأخبار <span className="ft-hero-gradient-text">الآن</span></h1>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">أخبار المنصة والفعاليات وإنجازات الطلاب والمدارس والأندية · تحديثات يكتبها النادي لأعضائه أولًا بأول.</p>
            </div>
            {data && all.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur">
                  <span className="block font-head text-lg font-black leading-none">{all.length}</span>
                  <span className="mt-1 block text-[10px] font-bold text-white/60">خبر منشور</span>
                </span>
                {cats.length > 0 && (
                  <span className="rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur">
                    <span className="block font-head text-lg font-black leading-none">{cats.length}</span>
                    <span className="mt-1 block text-[10px] font-bold text-white/60">تصنيف</span>
                  </span>
                )}
                {weekCount > 0 && (
                  <span className="rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 backdrop-blur">
                    <span className="block font-head text-lg font-black leading-none">{weekCount}</span>
                    <span className="mt-1 block text-[10px] font-bold text-white/60">خبر هذا الأسبوع</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ===== رقائق التصنيفات · ثابتة داخل الترويسة ===== */}
          {cats.length > 1 && (
            <div className="mt-6 flex gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-fade-up">
              <button onClick={() => setCat("")}
                className={`pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${!cat ? "bg-white text-slate-950 shadow-lg" : "bg-white/10 text-white/75 ring-1 ring-white/20 backdrop-blur hover:bg-white/20 hover:text-white"}`}>
                <LayoutGrid className="h-4 w-4" /> الكل
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${!cat ? "bg-slate-950/10 text-slate-700" : "bg-white/15 text-white/70"}`}>{all.length}</span>
              </button>
              {cats.map((c, ci) => {
                const Icon = CAT_ICONS[ci % CAT_ICONS.length];
                return (
                  <button key={c} onClick={() => setCat(c)}
                    className={`pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${cat === c ? "bg-white text-slate-950 shadow-lg" : "bg-white/10 text-white/75 ring-1 ring-white/20 backdrop-blur hover:bg-white/20 hover:text-white"}`}>
                    <Icon className="h-4 w-4" /> {c}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${cat === c ? "bg-slate-950/10 text-slate-700" : "bg-white/15 text-white/70"}`}>{all.filter((n) => n.category === c).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-b from-slate-100/80 via-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-14 xl:max-w-[1440px]">
          {!data ? (
            <div className="space-y-4">
              <Skeleton className="h-64 rounded-[1.6rem] sm:h-80 sm:rounded-[2rem]" />
              <div className="mx-auto max-w-4xl space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4 rounded-[1.6rem] bg-white p-4 ring-1 ring-slate-100 sm:p-5">
                    <div className="min-w-0 flex-1 space-y-3 py-1">
                      <Skeleton className="h-4 w-1/3 rounded-full" />
                      <Skeleton className="h-6 w-4/5 rounded-lg" />
                      <Skeleton className="h-4 w-2/3 rounded-lg" />
                      <Skeleton className="h-4 w-1/2 rounded-full" />
                    </div>
                    <Skeleton className="h-28 w-28 shrink-0 rounded-2xl sm:h-32 sm:w-44" />
                  </div>
                ))}
              </div>
            </div>
          )
            : data.items.length === 0 ? <EmptyState icon={Newspaper} title="لا أخبار بعد" desc="تابعنا لآخر المستجدات" />
            : (
              <>
                {/* ===== استكشف بالتصنيفات ===== */}
                {catCards.length > 1 && (
                  <section data-testid="news-explorer" className="mb-6 animate-fade-up sm:mb-8">
                    <div className="mb-3.5 flex items-center gap-2.5 px-0.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25"><LayoutGrid className="h-4 w-4" /></span>
                      <div>
                        <h2 className="font-head text-base font-extrabold leading-tight text-slate-900">استكشف بالتصنيفات</h2>
                        <p className="text-[11px] font-semibold text-slate-400">اختر تصنيفًا لتصفية مجرى الأخبار مباشرة</p>
                      </div>
                      {cat && (
                        <button onClick={() => setCat("")} className="pressable ms-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-[11px] font-extrabold text-white shadow-md transition hover:bg-slate-700">
                          عرض الكل
                          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{all.length}</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
                      {catCards.map((c, ci) => {
                        const Icon = CAT_ICONS[ci % CAT_ICONS.length];
                        const active = cat === c.name;
                        return (
                          <button key={c.name} onClick={() => exploreCategory(c.name)} data-testid={`news-explorer-card-${ci}`}
                            className={`pressable group relative overflow-hidden rounded-[1.4rem] text-start ft-shadow transition duration-300 hover:shadow-xl sm:rounded-[1.6rem] ${ci === 0 ? "col-span-2" : ""} ${active ? "ring-4 ring-blue-500/70" : "ring-1 ring-slate-100 hover:ring-blue-200"}`}>
                            <span className={`absolute inset-0 bg-gradient-to-br ${coverGrad(c.name)}`} />
                            {c.newest?.cover_url && <img src={fileUrl(c.newest.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" />}
                            <span className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/5" />
                            <span className={`relative flex flex-col p-4 sm:p-5 ${ci === 0 ? "min-h-[11rem] sm:min-h-[12.5rem]" : "min-h-[9.5rem] sm:min-h-[11rem]"}`}>
                              <span className="mb-auto flex items-start justify-between gap-2">
                                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur"><Icon className="h-5 w-5" /></span>
                                <span className="rounded-full bg-slate-950/45 px-2.5 py-1 text-[10px] font-extrabold text-white ring-1 ring-white/20 backdrop-blur">{c.count} خبر</span>
                              </span>
                              <span className="font-head text-base font-extrabold leading-snug text-white sm:text-lg">{c.name}</span>
                              {c.newest && <span className="mt-1 text-xs font-semibold leading-relaxed text-white/70 line-clamp-2">{c.newest.title}</span>}
                              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-extrabold text-cyan-300">
                                {active ? "يُعرض الآن · اضغط لعرض الكل" : "تصفّح التصنيف"}
                                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {items.length === 0 ? (
                  <EmptyState icon={Newspaper} title="لا أخبار في هذا التصنيف" desc="جرّب تصنيفًا آخر" />
                ) : (
                  <>
                    {/* ===== القصة الأبرز · سينمائية بعرض كامل ===== */}
                    {featured && (
                      <article id={`news-article-${featured.id}`} className="group relative mb-6 flex min-h-[27rem] scroll-mt-24 items-end overflow-hidden rounded-[1.6rem] bg-slate-950 ft-shadow-lg animate-fade-up sm:mb-8 sm:min-h-[32rem] lg:min-h-[36rem] 2xl:min-h-[40rem] sm:rounded-[2rem]">
                        <div className={`absolute inset-0 bg-gradient-to-br ${coverGrad(featured.id)}`} />
                        {featured.cover_url && <img src={fileUrl(featured.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />
                        <Newspaper className="pointer-events-none absolute -left-8 top-16 h-44 w-44 rotate-12 text-white/[0.07]" />
                        <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-4 sm:p-6 lg:p-8">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-rose-950/40">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                            </span>
                            الأبرز الآن
                          </span>
                          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur">{featured.category}</span>
                          <span className="ms-auto hidden items-center gap-1.5 rounded-full bg-slate-950/40 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-white/80 ring-1 ring-white/15 backdrop-blur sm:inline-flex"><Flame className="h-3.5 w-3.5 text-orange-400" /> قصة الغلاف</span>
                        </div>
                        <div className={`relative w-full p-5 sm:p-8 lg:p-10 xl:p-12 ${expanded === featured.id ? "pt-24 sm:pt-28 lg:pt-32" : ""}`}>
                          {expanded !== featured.id && (
                            <>
                              <h3 className="font-head max-w-4xl text-3xl font-extrabold leading-snug text-white break-words line-clamp-3 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.25] xl:text-5xl">{featured.title}</h3>
                              <p className="mt-3 max-w-3xl text-sm leading-loose text-white/80 line-clamp-2 sm:text-base">{featured.body}</p>
                              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5 sm:gap-3">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-4 pr-1 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm">
                                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-extrabold text-white">{featured.author_name?.[0] || "؟"}</span>
                                  <span className="min-w-0 break-words">{featured.author_name}</span>
                                </span>
                                {(featured.date || featured.created_at) && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm"><CalendarDays className="h-4 w-4 text-sky-300" />{featured.date || String(featured.created_at).slice(0, 10)}</span>
                                )}
                                {featured.views != null && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm"><Eye className="h-4 w-4 text-cyan-300" />{featured.views} قراءة</span>
                                )}
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm"><Clock3 className="h-4 w-4 text-emerald-300" />{readMinutes(featured.body)} دقائق قراءة</span>
                                {featured.body?.length > 140 && (
                                  <button onClick={() => toggle(featured.id)} className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-5 text-xs font-extrabold text-slate-900 shadow-lg transition hover:bg-blue-50 sm:text-sm">
                                    اقرأ القصة كاملة
                                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                          {expanded === featured.id && (
                            <div className="rounded-[1.4rem] bg-white p-5 text-slate-800 shadow-2xl animate-fade-up sm:rounded-3xl sm:p-7 lg:p-9">
                              {featured.category && <span className="inline-flex rounded-full ft-bg-soft px-3 py-1 text-[11px] font-extrabold ft-text-accent ring-1 ft-ring-accent">{featured.category}</span>}
                              <h3 className="font-head mt-3 break-words text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl sm:leading-snug lg:text-4xl">{featured.title}</h3>
                              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 pb-4">
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-extrabold text-white">{featured.author_name?.[0] || "؟"}</span>
                                  <span className="min-w-0">
                                    <span className="block break-words leading-tight">{featured.author_name}</span>
                                    <span className="block text-[11px] font-semibold text-slate-400">كاتب الخبر</span>
                                  </span>
                                </span>
                                <span className="ms-auto flex flex-wrap items-center gap-1.5">
                                  {(featured.date || featured.created_at) && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><CalendarDays className="h-3 w-3 text-blue-500" />{featured.date || String(featured.created_at).slice(0, 10)}</span>}
                                  {featured.views != null && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><Eye className="h-3 w-3 text-cyan-600" />{featured.views} قراءة</span>}
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><Clock3 className="h-3 w-3 text-emerald-500" />{readMinutes(featured.body)} دقائق قراءة</span>
                                </span>
                              </div>
                              <p className="mt-5 whitespace-pre-wrap text-[15px] leading-[2.05] text-slate-700 sm:text-base sm:leading-[2.1]">{featured.body}</p>
                              <div className="mt-6 border-t border-slate-100 pt-5">
                                <NewsComments newsId={featured.id} />
                              </div>
                              <button onClick={() => toggle(featured.id)} className="pressable mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-extrabold text-slate-400 transition hover:text-slate-600">
                                إظهار أقل
                                <ArrowLeft className="h-4 w-4 -rotate-90 transition-transform duration-300" />
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    )}

                    {/* ===== مجرى الأخبار ===== */}
                    <div id="news-stream" className="mx-auto w-full min-w-0 max-w-4xl scroll-mt-24">
                      <div className="mb-4 flex items-center gap-2.5 px-0.5 animate-fade-up">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25"><Radio className="h-4 w-4" /></span>
                        <div>
                          <h2 className="font-head text-base font-extrabold leading-tight text-slate-900">مجرى الأخبار</h2>
                          <p className="text-[11px] font-semibold text-slate-400">{cat ? `تصنيف: ${cat} · اضغط التصنيف مجددًا لعرض الكل` : "كل أخبار النادي · الأحدث أولًا"}</p>
                        </div>
                        {items.length > 0 && <span className="ms-auto rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold text-rose-600 ring-1 ring-rose-100">{items.length} خبر</span>}
                      </div>
                        {rest.length > 0 ? (
                          <div className="space-y-4">
                            {rest.map((n, i) => (
                              <article key={n.id} id={`news-article-${n.id}`} className={`group scroll-mt-24 overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-slate-100 ft-shadow transition duration-300 animate-fade-up hover:shadow-xl hover:ring-blue-200/70 d-${((i + 1) % 6) + 1}`}>
                                <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {n.category && <span className="rounded-full ft-bg-soft px-2.5 py-1 text-[11px] font-extrabold ft-text-accent ring-1 ft-ring-accent">{n.category}</span>}
                                      {(n.date || n.created_at) && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><CalendarDays className="h-3 w-3 text-blue-500" />{n.date || String(n.created_at).slice(0, 10)}</span>
                                      )}
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><Clock3 className="h-3 w-3 text-emerald-500" />{readMinutes(n.body)} دقائق</span>
                                    </div>
                                    {expanded !== n.id && (
                                      <button onClick={() => toggle(n.id)} className="pressable mt-2.5 block w-full text-start">
                                        <h3 className="font-head break-words text-lg font-bold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-800 sm:text-xl">{n.title}</h3>
                                      </button>
                                    )}
                                    {expanded !== n.id && <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2 sm:line-clamp-3">{n.body}</p>}
                                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                                      <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white">{n.author_name?.[0]}</span>
                                        {n.author_name}
                                      </span>
                                      {n.views != null && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Eye className="h-3.5 w-3.5 text-cyan-600" />{n.views}</span>
                                      )}
                                      {n.comments_count != null && Number(n.comments_count) > 0 && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><MessageCircle className="h-3.5 w-3.5 text-blue-600" />{n.comments_count}</span>
                                      )}
                                      {expanded !== n.id && n.body?.length > 140 && (
                                        <button onClick={() => toggle(n.id)} className="pressable ms-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-full ft-bg-soft px-4 text-xs font-extrabold ft-text-accent ring-1 ft-ring-accent transition hover:brightness-95">
                                          اقرأ المزيد
                                          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <button onClick={() => toggle(n.id)} aria-label={n.title} className="pressable relative w-28 shrink-0 self-stretch overflow-hidden rounded-2xl ring-1 ring-slate-100 sm:w-44 lg:w-52">
                                    <span className={`absolute inset-0 bg-gradient-to-br ${coverGrad(n.id)}`} />
                                    {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" />}
                                    <span className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                                    <Newspaper className="absolute -bottom-5 left-2 h-20 w-20 rotate-12 text-white/15" />
                                    {n.views != null && (
                                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-slate-950/45 px-2 py-0.5 text-[10px] font-extrabold text-white ring-1 ring-white/20 backdrop-blur"><Eye className="h-3 w-3 text-cyan-300" />{n.views}</span>
                                    )}
                                  </button>
                                </div>

                                {expanded === n.id && (
                                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-5 animate-fade-up sm:px-6 sm:py-6">
                                    <div className="rounded-[1.4rem] bg-white p-5 ring-1 ring-slate-100 sm:rounded-3xl sm:p-7">
                                      {n.category && <span className="inline-flex rounded-full ft-bg-soft px-3 py-1 text-[11px] font-extrabold ft-text-accent ring-1 ft-ring-accent">{n.category}</span>}
                                      <h3 className="font-head mt-3 break-words text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">{n.title}</h3>
                                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 pb-4">
                                        <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-extrabold text-white">{n.author_name?.[0]}</span>
                                          <span>
                                            <span className="block leading-tight">{n.author_name}</span>
                                            <span className="block text-[11px] font-semibold text-slate-400">كاتب الخبر</span>
                                          </span>
                                        </span>
                                        <span className="ms-auto flex flex-wrap items-center gap-1.5">
                                          {(n.date || n.created_at) && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><CalendarDays className="h-3 w-3 text-blue-500" />{n.date || String(n.created_at).slice(0, 10)}</span>}
                                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><Clock3 className="h-3 w-3 text-emerald-500" />{readMinutes(n.body)} دقائق قراءة</span>
                                          {n.views != null && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-100"><Eye className="h-3 w-3 text-cyan-600" />{n.views} قراءة</span>}
                                        </span>
                                      </div>
                                      <p className="mt-5 whitespace-pre-wrap text-[15px] leading-[2.05] text-slate-700 sm:text-base">{n.body}</p>
                                      <div className="mt-6 border-t border-slate-100 pt-5">
                                        <NewsComments newsId={n.id} />
                                      </div>
                                      {n.body?.length > 140 && (
                                        <button onClick={() => toggle(n.id)} className="pressable mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-extrabold text-slate-400 transition hover:text-slate-600">
                                          إظهار أقل
                                          <ArrowLeft className="h-4 w-4 -rotate-90 transition-transform duration-300" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        ) : (
                          !featured && <EmptyState icon={Newspaper} title="لا أخبار في هذا التصنيف" desc="جرّب تصنيفًا آخر" />
                        )}
                    </div>

                    {/* ===== أرشيف الأسبوع · آخر ٧ أيام يومًا بيوم ===== */}
                    {weekGroups.length > 0 && (
                      <section data-testid="news-archive" className="mx-auto mt-10 w-full max-w-4xl animate-fade-up sm:mt-14">
                        <div className="mb-5 flex items-center gap-2.5 px-0.5">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-900/25"><CalendarDays className="h-4 w-4" /></span>
                          <div>
                            <h2 className="font-head text-base font-extrabold leading-tight text-slate-900">أرشيف الأسبوع</h2>
                            <p className="text-[11px] font-semibold text-slate-400">آخر ٧ أيام في النادي · يومًا بيوم</p>
                          </div>
                          <span className="ms-auto rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold text-white">{weekCount} خبر</span>
                        </div>
                        <div>
                          {weekGroups.map((g, gi) => (
                            <div key={g.diff} className="flex gap-3.5 sm:gap-4">
                              <div className="flex flex-col items-center">
                                <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow ring-4 ring-blue-50" />
                                {gi < weekGroups.length - 1 && <span className="mt-1.5 w-px flex-1 bg-gradient-to-b from-blue-200/80 via-slate-200/70 to-slate-100" />}
                              </div>
                              <div className="min-w-0 flex-1 pb-7">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-extrabold text-white shadow-sm">{g.label}</span>
                                  <span className="text-[11px] font-bold text-slate-400">{g.dateLine}</span>
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 ring-1 ring-blue-100">{g.items.length} خبر</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {g.items.map((n) => (
                                    <button key={n.id} onClick={() => openArticle(n.id)} data-testid={`news-archive-item-${n.id}`}
                                      className="pressable group flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-start ring-1 ring-slate-100 ft-shadow transition duration-300 hover:shadow-lg hover:ring-blue-200 sm:p-3">
                                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-20">
                                        <span className={`absolute inset-0 bg-gradient-to-br ${coverGrad(n.id)}`} />
                                        {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" />}
                                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block font-head text-sm font-bold leading-snug text-slate-800 line-clamp-2 transition-colors group-hover:text-blue-800 sm:text-[15px]">{n.title}</span>
                                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                          {n.category && <span className="rounded-full ft-bg-soft px-2 py-0.5 text-[10px] font-extrabold ft-text-accent ring-1 ft-ring-accent">{n.category}</span>}
                                          {n.views != null && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Eye className="h-3 w-3 text-cyan-600" />{n.views} قراءة</span>}
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Clock3 className="h-3 w-3 text-emerald-500" />{readMinutes(n.body)} دقائق</span>
                                        </span>
                                      </span>
                                      <ArrowLeft className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:text-blue-600" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </>
            )}
        </div>
      </div>
    </Layout>
  );
}

/* ===== Article comments · loads lazily when an article is expanded ===== */
function NewsComments({ newsId }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(`/news/${newsId}/comments`)
      .then((r) => { if (!alive) return; const d = r.data; setItems(Array.isArray(d) ? d : d?.items || []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [newsId]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/news/${newsId}/comments`, { text: t });
      const c = data?.comment || data;
      if (c && (c.id || c.text || c.body)) setItems((prev) => [...(prev || []), c]);
      else {
        const r = await api.get(`/news/${newsId}/comments`);
        const d = r.data; setItems(Array.isArray(d) ? d : d?.items || []);
      }
      setText("");
      toast.success("تم نشر تعليقك");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const remove = async (cid) => {
    try {
      await api.delete(`/news/${newsId}/comments/${cid}`);
      setItems((prev) => (prev || []).filter((c) => c.id !== cid));
      toast.success("تم حذف التعليق");
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (failed) return null;

  return (
    <div data-testid="news-comments">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/25"><MessageCircle className="h-4 w-4" /></span>
        <h4 className="font-head text-base font-extrabold text-slate-900">التعليقات</h4>
        {items && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 ring-1 ring-blue-100">{items.length}</span>}
        <span className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
      </div>

      {items === null ? (
        <div className="flex items-center gap-2 py-5 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل التعليقات…</div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
          <MessageCircle className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-400">لا تعليقات بعد · كن أول من يشارك رأيه.</p>
        </div>
      ) : (
        <ul className="relative mt-5 space-y-3 before:absolute before:bottom-3 before:right-[1.1rem] before:top-3 before:w-px before:bg-gradient-to-b before:from-blue-100 before:via-slate-100 before:to-transparent sm:before:right-[1.35rem]">
          {items.map((c) => {
            const name = c.author_name || c.user_name || c.name || "عضو";
            const body = c.text || c.body || "";
            const when = c.date || (c.created_at ? String(c.created_at).slice(0, 10) : "");
            const mine = !!user && (c.mine || c.user_id === user.id || c.author_id === user.id);
            return (
              <li key={c.id} className="relative flex gap-3 animate-fade-up">
                <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white ring-4 ring-white sm:h-11 sm:w-11">{name?.[0] || "؟"}</span>
                <div className="min-w-0 flex-1 rounded-3xl rounded-tr-md border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-extrabold text-slate-800">{name}</span>
                    {mine && <span className="rounded-full ft-bg-soft px-2 py-0.5 text-[10px] font-extrabold ft-text-accent ring-1 ft-ring-accent">أنت</span>}
                    {when && <span className="text-[11px] font-semibold text-slate-400">{when}</span>}
                    {mine && (
                      <button onClick={() => remove(c.id)} data-testid={`news-comment-delete-${c.id}`} aria-label="حذف التعليق" className="pressable ms-auto grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {user ? (
        <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-200">
          <div className="flex items-end gap-2.5">
            <textarea
              data-testid="news-comment-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              maxLength={600}
              placeholder="شارك رأيك في هذا الخبر…"
              className="min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none"
            />
            <button
              data-testid="news-comment-send"
              onClick={send}
              disabled={!text.trim() || busy}
              className="pressable grid h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
              aria-label="إرسال التعليق"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
            </button>
          </div>
          <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5 text-[10px] font-bold text-slate-300">
            <span>Enter للإرسال · Shift+Enter لسطر جديد</span>
            <span>{text.length}/600</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3">
          <span className="text-sm font-semibold text-slate-500">سجّل دخولك لتشارك في النقاش</span>
          <Link to="/login" className="pressable inline-flex min-h-[40px] items-center rounded-full bg-gradient-to-l from-blue-600 to-cyan-600 px-4 text-xs font-extrabold text-white shadow-md">تسجيل الدخول</Link>
        </div>
      )}
    </div>
  );
}
