import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Newspaper, CalendarDays, ArrowLeft, Sparkles, LayoutGrid, Eye, TrendingUp, MessageCircle, Send, Trash2, BookOpen, Loader2, Clock3, Flame } from "lucide-react";

/* قراءة تقريبية بعدد الدقائق · عرض فقط */
const readMinutes = (body) => Math.max(1, Math.round((body?.length || 0) / 900));

export default function News() {
  const [data, setData] = useState(null);
  const [cat, setCat] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [digest, setDigest] = useState(null);
  const [trending, setTrending] = useState([]);
  const viewedRef = useRef(new Set());
  useEffect(() => {
    api.get("/news").then((r) => setData(r.data));
    api.get("/news/digest").then((r) => setDigest(r.data)).catch(() => setDigest(null));
    api.get("/news/trending")
      .then((r) => { const d = r.data; setTrending(Array.isArray(d) ? d : d?.items || []); })
      .catch(() => setTrending([]));
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
  /* Open an article from the trending rail / digest (scroll + expand). */
  const openArticle = (id) => {
    if (!id) return;
    setCat("");
    pingView(id);
    setExpanded(id);
    setTimeout(() => document.getElementById(`news-article-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 90);
  };
  const digestNews = digest ? (digest.top_news || (Array.isArray(digest.news) ? digest.news[0] : digest.news)) : null;
  const digestEvent = digest ? (digest.top_event || digest.event) : null;
  const digestBook = digest ? (digest.top_book || digest.book) : null;
  const todayLine = new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Layout>
      {/* ===== Masthead · newspaper header ===== */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[#fdfcf8]">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-blue-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/4 h-64 w-64 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-5 sm:px-6 sm:pt-7 lg:px-8 xl:max-w-[1440px]">
          {/* dateline */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-slate-900 pb-3 text-[11px] font-bold text-slate-500 sm:text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-white"><Newspaper className="h-3.5 w-3.5" /></span>
              نادي مفكّري المستقبل · نشرة المنصة الإخبارية
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex"><CalendarDays className="h-3.5 w-3.5 text-blue-600" />{todayLine}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-extrabold text-rose-600 ring-1 ring-rose-100">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              آخر الأخبار
            </span>
          </div>

          {/* masthead title */}
          <div className="flex items-end justify-between gap-4 pt-5 sm:pt-7">
            <div className="animate-fade-up">
              <h1 className="font-head text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-7xl lg:text-[5.5rem]">الأخبار</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base sm:leading-loose">أخبار المنصة والفعاليات وإنجازات الطلاب والمدارس والأندية · تغطية يكتبها النادي لأعضائه.</p>
            </div>
            <Newspaper className="pointer-events-none hidden h-28 w-28 shrink-0 -rotate-6 text-slate-900/[0.06] md:block lg:h-36 lg:w-36" />
          </div>

          {/* meta strip */}
          {data && all.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 pt-4 text-xs font-bold text-slate-500 animate-fade-up sm:text-[13px]">
              <span className="inline-flex items-center gap-1.5"><Newspaper className="h-4 w-4 text-blue-600" /> {all.length} خبر منشور</span>
              {cats.length > 0 && <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4 text-emerald-600" /> {cats.length} تصنيف</span>}
              {trending.length > 0 && <span className="inline-flex items-center gap-1.5"><Flame className="h-4 w-4 text-rose-500" /> {trending.length} في الأكثر قراءة</span>}
            </div>
          )}

          {/* ===== Category chips · static (display-only filter over loaded items) ===== */}
          {cats.length > 1 && (
            <div className="mt-5 flex gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-fade-up">
              <button onClick={() => setCat("")}
                className={`pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${!cat ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900 hover:ring-slate-300"}`}>
                <LayoutGrid className="h-4 w-4" /> الكل
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${!cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>{all.length}</span>
              </button>
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)}
                  className={`pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${cat === c ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900 hover:ring-slate-300"}`}>
                  {c}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${cat === c ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>{all.filter((n) => n.category === c).length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-14 xl:max-w-[1440px]">
        {!data ? (
          <div className="space-y-6">
            <Skeleton className="h-14 w-2/3 rounded-2xl" />
            <Skeleton className="h-[26rem] rounded-[1.4rem] sm:rounded-3xl lg:h-[30rem]" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          </div>
        )
          : data.items.length === 0 ? <EmptyState icon={Newspaper} title="لا أخبار بعد" desc="تابعنا لآخر المستجدات" />
          : (
            <>
              {/* ===== ملخص الأسبوع digest ===== */}
              {(digestNews || digestEvent || digestBook) && (
                <section data-testid="news-digest" className="relative mb-6 overflow-hidden rounded-[1.4rem] bg-slate-950 p-[2px] ft-shadow-lg animate-fade-up sm:mb-8 sm:rounded-3xl">
                  <div className="relative overflow-hidden rounded-[calc(1.4rem-2px)] bg-gradient-to-bl from-slate-900 via-blue-950 to-slate-900 p-5 sm:rounded-[calc(1.5rem-2px)] sm:p-7">
                    <div className="pointer-events-none absolute -top-16 left-10 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 right-16 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" />
                    <div className="relative flex flex-wrap items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30"><Sparkles className="h-5 w-5" /></span>
                      <div>
                        <h2 className="font-head text-xl font-extrabold text-white sm:text-2xl">ملخص الأسبوع</h2>
                        <p className="text-xs font-semibold text-white/60">أبرز ما حدث في النادي هذا الأسبوع · في ثلاث لمحات</p>
                      </div>
                      <span className="ms-auto hidden rounded-full bg-white/[0.07] px-3 py-1.5 text-[11px] font-extrabold text-white/60 ring-1 ring-white/10 sm:inline-flex">نشرة أسبوعية</span>
                    </div>
                    <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                      {digestNews?.title && (
                        <button onClick={() => openArticle(digestNews.id)} className="pressable group rounded-3xl bg-white/[0.07] p-4 text-start ring-1 ring-white/10 backdrop-blur transition duration-300 hover:bg-white/[0.12] hover:ring-white/20 sm:p-5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-extrabold text-sky-300 ring-1 ring-sky-300/25"><Newspaper className="h-3.5 w-3.5" /> أبرز خبر</span>
                          <h3 className="mt-3 font-head text-[15px] font-bold leading-snug text-white line-clamp-2 sm:text-base">{digestNews.title}</h3>
                          {digestNews.views != null && <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/50"><Eye className="h-3.5 w-3.5 text-cyan-300" />{digestNews.views} قراءة</span>}
                        </button>
                      )}
                      {digestEvent?.title && (
                        <Link to={`/events/${digestEvent.id}`} className="pressable group rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur transition duration-300 hover:bg-white/[0.12] hover:ring-white/20 sm:p-5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300 ring-1 ring-emerald-300/25"><CalendarDays className="h-3.5 w-3.5" /> فعالية قادمة</span>
                          <h3 className="mt-3 font-head text-[15px] font-bold leading-snug text-white line-clamp-2 sm:text-base">{digestEvent.title}</h3>
                          {digestEvent.date && <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/50"><CalendarDays className="h-3.5 w-3.5 text-emerald-300" />{digestEvent.date} {digestEvent.time || ""}</span>}
                        </Link>
                      )}
                      {digestBook?.title && (
                        <Link to={`/books/${digestBook.id}`} className="pressable group rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur transition duration-300 hover:bg-white/[0.12] hover:ring-white/20 sm:p-5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-extrabold text-amber-300 ring-1 ring-amber-300/25"><BookOpen className="h-3.5 w-3.5" /> كتاب مختار</span>
                          <h3 className="mt-3 font-head text-[15px] font-bold leading-snug text-white line-clamp-2 sm:text-base">{digestBook.title}</h3>
                          {digestBook.author && <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/50"><BookOpen className="h-3.5 w-3.5 text-amber-300" />{digestBook.author}</span>}
                        </Link>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {items.length === 0 ? (
                <EmptyState icon={Newspaper} title="لا أخبار في هذا التصنيف" desc="جرّب تصنيفًا آخر" />
              ) : (
                <>
                  {/* ===== Featured · editorial cover story ===== */}
                  {featured && (
                    <article id={`news-article-${featured.id}`} className="group relative mb-6 flex min-h-[27rem] scroll-mt-24 items-end overflow-hidden rounded-[1.4rem] bg-slate-950 ft-shadow-lg animate-fade-up sm:mb-8 sm:min-h-[32rem] lg:min-h-[36rem] 2xl:min-h-[40rem] sm:rounded-[2rem]">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-cyan-700 to-emerald-700" />
                      {featured.cover_url && <img src={fileUrl(featured.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />
                      <Newspaper className="pointer-events-none absolute -left-8 top-16 h-44 w-44 rotate-12 text-white/[0.07]" />
                      <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-2 p-4 sm:p-6 lg:p-8">
                        <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur">{featured.category}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg"><Sparkles className="h-3.5 w-3.5" /> قصة الغلاف</span>
                        <span className="ms-auto hidden items-center gap-1.5 rounded-full bg-slate-950/40 px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-white/80 ring-1 ring-white/15 backdrop-blur sm:inline-flex">العدد الأحدث</span>
                      </div>
                      <div className="relative w-full p-5 sm:p-8 lg:p-10 xl:p-12">
                        <h3 className="font-head max-w-4xl text-3xl font-extrabold leading-snug text-white line-clamp-3 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.25] xl:text-5xl">{featured.title}</h3>
                        <p className={`mt-3 max-w-3xl text-sm leading-loose text-white/80 sm:text-base ${expanded === featured.id ? "" : "line-clamp-2"}`}>{featured.body}</p>
                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5 sm:gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-4 pr-1 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-extrabold text-white">{featured.author_name?.[0]}</span>
                            {featured.author_name}
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
                              {expanded === featured.id ? "إظهار أقل" : "اقرأ القصة كاملة"}
                              <ArrowLeft className={`h-4 w-4 transition-transform duration-300 ${expanded === featured.id ? "-rotate-90" : "group-hover:-translate-x-0.5"}`} />
                            </button>
                          )}
                        </div>
                        {expanded === featured.id && (
                          <div className="mt-6 rounded-[1.4rem] bg-white p-5 text-slate-800 shadow-2xl animate-fade-up sm:rounded-3xl sm:p-7">
                            <NewsComments newsId={featured.id} />
                          </div>
                        )}
                      </div>
                    </article>
                  )}

                  {/* ===== Stories + trending rail (editorial two-column on desktop) ===== */}
                  <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
                    <div className="min-w-0">
                      {rest.length > 0 ? (
                        <div className="grid gap-5 sm:grid-cols-2 xl:gap-6">
                          {rest.map((n, i) => (
                            <article key={n.id} id={`news-article-${n.id}`} className={`group flex h-full scroll-mt-24 flex-col overflow-hidden rounded-[1.4rem] border border-slate-100 bg-white ft-shadow transition duration-300 animate-fade-up hover:shadow-2xl hover:ring-1 hover:ring-blue-100 sm:rounded-3xl d-${((i + 1) % 6) + 1}`}>
                              <div className="relative h-44 shrink-0 overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 sm:h-48">
                                {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]" />}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                                <Newspaper className="absolute -bottom-7 left-3 h-28 w-28 rotate-12 text-white/15" />
                                <span className="absolute right-3 top-3 rounded-full bg-slate-950/35 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/25 shadow backdrop-blur">{n.category}</span>
                                {n.views != null && (
                                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-slate-950/40 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/20 backdrop-blur"><Eye className="h-3 w-3 text-cyan-300" />{n.views}</span>
                                )}
                              </div>
                              <div className="flex flex-1 flex-col p-5 sm:p-6">
                                <h3 className="font-head text-lg font-bold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-800">{n.title}</h3>
                                {expanded !== n.id && <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-3">{n.body}</p>}
                                {expanded === n.id ? (
                                  <div className="mt-4 animate-fade-up">
                                    <div className="rounded-3xl bg-[#fdfcf8] p-4 ring-1 ring-slate-100 sm:p-5">
                                      <p className="whitespace-pre-wrap text-[15px] leading-[1.95] text-slate-700 first-letter:float-right first-letter:ml-2 first-letter:font-head first-letter:text-[3.4rem] first-letter:font-black first-letter:leading-[0.85] first-letter:text-blue-700">{n.body}</p>
                                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200/80 pt-4 text-xs font-semibold text-slate-400">
                                        <span className="flex items-center gap-2">
                                          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white">{n.author_name?.[0]}</span>
                                          كتبها {n.author_name}
                                        </span>
                                        {(n.date || n.created_at) && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-blue-600" />{n.date || String(n.created_at).slice(0, 10)}</span>}
                                        <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-emerald-600" />{readMinutes(n.body)} دقائق قراءة</span>
                                      </div>
                                    </div>
                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                      <NewsComments newsId={n.id} />
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {n.body?.length > 140 && (
                                      <button onClick={() => toggle(n.id)} className="pressable mt-3 inline-flex min-h-[40px] w-fit items-center gap-1.5 text-sm font-extrabold text-blue-700 transition hover:text-blue-900">
                                        اقرأ المزيد
                                        <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                                      </button>
                                    )}
                                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-xs font-medium text-slate-400">
                                      <span className="flex items-center gap-2">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white">{n.author_name?.[0]}</span>
                                        {n.author_name}
                                      </span>
                                      {(n.date || n.created_at) && (
                                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-blue-600" />{n.date || String(n.created_at).slice(0, 10)}</span>
                                      )}
                                      <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-emerald-600" />{readMinutes(n.body)} د</span>
                                      {n.comments_count != null && Number(n.comments_count) > 0 && (
                                        <span className="flex items-center gap-1.5 font-bold"><MessageCircle className="h-3.5 w-3.5 text-blue-600" />{n.comments_count}</span>
                                      )}
                                    </div>
                                  </>
                                )}
                                {expanded === n.id && n.body?.length > 140 && (
                                  <button onClick={() => toggle(n.id)} className="pressable mt-3 inline-flex min-h-[40px] w-fit items-center gap-1.5 text-sm font-extrabold text-slate-400 transition hover:text-slate-600">
                                    إظهار أقل
                                    <ArrowLeft className="h-4 w-4 -rotate-90 transition-transform duration-300" />
                                  </button>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        !featured && <EmptyState icon={Newspaper} title="لا أخبار في هذا التصنيف" desc="جرّب تصنيفًا آخر" />
                      )}
                    </div>

                    {/* ===== الأكثر قراءة · numbered editorial list ===== */}
                    {trending.length > 0 && (
                      <aside data-testid="news-trending" className="animate-fade-up">
                        <div className="overflow-hidden rounded-[1.4rem] border border-slate-100 bg-white ft-shadow sm:rounded-3xl">
                          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-l from-rose-50/80 to-white px-5 py-4">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25"><TrendingUp className="h-4 w-4" /></span>
                            <div>
                              <h2 className="font-head text-base font-extrabold leading-tight text-slate-900">الأكثر قراءة</h2>
                              <p className="text-[11px] font-semibold text-slate-400">ما يقرأه الأعضاء الآن</p>
                            </div>
                          </div>
                          <ol>
                            {trending.slice(0, 8).map((t, i) => (
                              <li key={t.id} className="border-b border-slate-50 last:border-0">
                                <button onClick={() => openArticle(t.id)} data-testid={`news-trending-${t.id}`} className="pressable group flex w-full items-start gap-3.5 px-5 py-3.5 text-start transition hover:bg-rose-50/40">
                                  <span className={`font-head text-[1.7rem] font-black leading-none transition ${i === 0 ? "text-rose-500" : "text-slate-200 group-hover:text-rose-300"}`}>{String(i + 1).padStart(2, "0")}</span>
                                  <span className="min-w-0 flex-1 pt-0.5">
                                    <span className="block font-head text-sm font-bold leading-snug text-slate-800 line-clamp-2 transition-colors group-hover:text-rose-700">{t.title}</span>
                                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold text-slate-400">
                                      {t.category && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600 ring-1 ring-rose-100">{t.category}</span>}
                                      {t.views != null && <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3 text-cyan-600" />{t.views} قراءة</span>}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </aside>
                    )}
                  </div>
                </>
              )}
            </>
          )}
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
