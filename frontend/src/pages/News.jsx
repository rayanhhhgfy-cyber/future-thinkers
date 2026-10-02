import React, { useEffect, useState } from "react";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, CalendarDays, ArrowLeft, Sparkles, LayoutGrid } from "lucide-react";

export default function News() {
  const [data, setData] = useState(null);
  const [cat, setCat] = useState("");
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { api.get("/news").then((r) => setData(r.data)); }, []);

  const all = data?.items || [];
  const cats = [...new Set(all.map((n) => n.category).filter(Boolean))];
  const items = cat ? all.filter((n) => n.category === cat) : all;
  const featured = items[0];
  const rest = items.slice(1);
  const toggle = (id) => setExpanded((x) => (x === id ? null : id));

  return (
    <Layout>
      {/* ===== Newsroom hero ===== */}
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <Newspaper className="pointer-events-none absolute -bottom-16 -left-12 h-80 w-80 rotate-12 text-white/[0.07]" />
        <Newspaper className="pointer-events-none absolute -top-10 right-[12%] hidden h-32 w-32 -rotate-12 text-white/[0.05] lg:block" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="flex items-center gap-3 animate-fade-up">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
              <Newspaper className="h-6 w-6" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              آخر الأخبار
            </span>
          </div>
          <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mt-6 animate-fade-up">الأخبار</h1>
          <p className="text-emerald-50/80 mt-3 max-w-2xl leading-relaxed sm:text-lg animate-fade-up">أخبار المنصة والفعاليات وإنجازات الطلاب والمدارس والأندية.</p>
          {data && all.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold animate-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur"><Newspaper className="h-3.5 w-3.5 text-emerald-300" /> {all.length} خبر منشور</span>
              {cats.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur"><LayoutGrid className="h-3.5 w-3.5 text-sky-300" /> {cats.length} تصنيف</span>}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {!data ? (
          <div className="space-y-5">
            <Skeleton className="h-[26rem] rounded-[1.4rem] sm:rounded-3xl lg:h-[30rem]" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          </div>
        )
          : data.items.length === 0 ? <EmptyState icon={Newspaper} title="لا أخبار بعد" desc="تابعنا لآخر المستجدات" />
          : (
            <>
              {/* ===== Category rail (display-only filter over loaded items) ===== */}
              {cats.length > 1 && (
                <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 mb-5 sm:mb-6">
                  <div className="flex gap-2 overflow-x-auto whitespace-nowrap rounded-2xl bg-white/85 p-2 ring-1 ring-slate-200/60 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.25)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button onClick={() => setCat("")}
                      className={`pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition ${!cat ? "bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                      <LayoutGrid className="h-4 w-4" /> الكل
                    </button>
                    {cats.map((c) => (
                      <button key={c} onClick={() => setCat(c)}
                        className={`pressable min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold transition ${cat === c ? "bg-gradient-to-l from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <EmptyState icon={Newspaper} title="لا أخبار في هذا التصنيف" desc="جرّب تصنيفًا آخر" />
              ) : (
                <>
                  {/* ===== Featured · cinematic ===== */}
                  {featured && (
                    <article className="group relative mb-5 flex min-h-[26rem] items-end overflow-hidden rounded-[1.4rem] bg-slate-950 ft-shadow-lg animate-fade-up sm:mb-6 sm:min-h-[30rem] lg:min-h-[34rem] sm:rounded-3xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-cyan-700 to-emerald-700" />
                      {featured.cover_url && <img src={fileUrl(featured.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />
                      <Newspaper className="pointer-events-none absolute -left-8 top-16 h-44 w-44 rotate-12 text-white/[0.07]" />
                      <div className="absolute right-4 top-4 flex flex-wrap items-center gap-2 sm:right-6 sm:top-6">
                        <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur">{featured.category}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg"><Sparkles className="h-3.5 w-3.5" /> خبر مميز</span>
                      </div>
                      <div className="relative w-full p-5 sm:p-8 lg:p-10">
                        <h3 className="font-head max-w-4xl text-3xl font-extrabold leading-snug text-white line-clamp-3 sm:text-4xl lg:text-[2.75rem]">{featured.title}</h3>
                        <p className={`mt-3 max-w-3xl text-sm leading-loose text-white/80 sm:text-base ${expanded === featured.id ? "" : "line-clamp-2"}`}>{featured.body}</p>
                        <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 py-1 pl-4 pr-1 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-extrabold text-white">{featured.author_name?.[0]}</span>
                            {featured.author_name}
                          </span>
                          {(featured.date || featured.created_at) && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur sm:text-sm"><CalendarDays className="h-4 w-4 text-sky-300" />{featured.date || String(featured.created_at).slice(0, 10)}</span>
                          )}
                          {featured.body?.length > 140 && (
                            <button onClick={() => toggle(featured.id)} className="pressable inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-4 text-xs font-extrabold text-slate-900 shadow-lg transition hover:bg-emerald-50 sm:text-sm">
                              {expanded === featured.id ? "إظهار أقل" : "اقرأ المزيد"}
                              <ArrowLeft className={`h-4 w-4 transition-transform duration-300 ${expanded === featured.id ? "-rotate-90" : "group-hover:-translate-x-0.5"}`} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )}

                  {/* ===== Rest of the articles ===== */}
                  {rest.length > 0 && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                      {rest.map((n, i) => (
                        <article key={n.id} className={`group flex h-full flex-col overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow hover-lift animate-fade-up d-${((i + 1) % 6) + 1}`}>
                          <div className="relative h-44 shrink-0 overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 sm:h-48">
                            {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                            <Newspaper className="absolute -bottom-7 left-3 h-28 w-28 rotate-12 text-white/15" />
                            <span className="absolute right-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/25 shadow backdrop-blur">{n.category}</span>
                          </div>
                          <div className="flex flex-1 flex-col p-5 sm:p-6">
                            <h3 className="font-head font-bold text-lg leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-700">{n.title}</h3>
                            <p className={`text-sm leading-relaxed text-slate-500 mt-2 ${expanded === n.id ? "" : "line-clamp-3"}`}>{n.body}</p>
                            {n.body?.length > 140 && (
                              <button onClick={() => toggle(n.id)} className="pressable mt-3 inline-flex min-h-[36px] w-fit items-center gap-1.5 text-sm font-extrabold text-blue-700 transition hover:text-blue-900">
                                {expanded === n.id ? "إظهار أقل" : "اقرأ المزيد"}
                                <ArrowLeft className={`h-4 w-4 transition-transform duration-300 ${expanded === n.id ? "-rotate-90" : "group-hover:-translate-x-1"}`} />
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
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
      </div>
    </Layout>
  );
}
