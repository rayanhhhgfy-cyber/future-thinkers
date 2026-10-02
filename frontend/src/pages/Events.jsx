import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users, Globe, Building2, CalendarDays, Wifi } from "lucide-react";

const SCOPE = { national: "وطنية", directorate: "مديرية", school: "مدرسة" };
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function Events() {
  const { hasPerm } = useAuth();
  const [data, setData] = useState(null);
  const [scope, setScope] = useState("");
  useEffect(() => { setData(null); api.get("/events", { params: { scope: scope || undefined } }).then((r) => setData(r.data)); }, [scope]);

  return (
    <Layout>
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <CalendarDays className="pointer-events-none absolute -bottom-14 -left-12 h-72 w-72 rotate-12 text-white/10 sm:h-96 sm:w-96" />
        <CalendarDays className="pointer-events-none absolute -top-10 right-[12%] hidden h-40 w-40 -rotate-12 text-white/[0.06] lg:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-20 lg:pt-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-emerald-50 backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5" />
              تقويم النادي · فعاليات قادمة
            </span>
          </div>
          <div className="mt-6 flex items-start gap-4 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.15rem] border border-white/20 bg-white/10 shadow-lg backdrop-blur sm:h-16 sm:w-16">
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h1 className="font-head text-4xl font-extrabold leading-[1.15] sm:text-5xl lg:text-6xl">الفعاليات</h1>
              <p className="mt-3 max-w-2xl leading-relaxed text-emerald-50/85 sm:text-lg">فعاليات وطنية وعلى مستوى المديريات والمدارس، حضورية وعن بُعد.</p>
            </div>
          </div>
          {data && (
            <div className="mt-7 flex flex-wrap items-center gap-2.5 animate-fade-up d-2">
              <span className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
                <Calendar className="h-4 w-4 text-emerald-200" />
                {data.total} فعالية
              </span>
              <span className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
                <Globe className="h-4 w-4 text-emerald-200" />
                حضورية وعن بُعد
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 mb-6">
          <div className="flex gap-2 overflow-x-auto rounded-[1.75rem] border border-slate-200/70 bg-white/85 p-2 ft-shadow-lg backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:rounded-full">
            {[["", "الكل"], ["national", "وطنية"], ["directorate", "مديرية"], ["school", "مدرسة"]].map(([v, l]) => (
              <button key={v} onClick={() => setScope(v)} data-testid={`event-scope-${v || "all"}`} className={`pressable min-h-[2.75rem] shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-all ${scope === v ? "bg-gradient-to-l from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-600/25" : "bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-800"}`}>{l}</button>
            ))}
          </div>
        </div>

        {!data ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[22rem] rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Calendar} title="لا فعاليات حالياً" desc="تابعنا لمعرفة الفعاليات القادمة" />
          : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
              {data.items.map((e, i) => {
                const dateParts = String(e.date || "").split("-");
                const dateDay = dateParts[2]?.slice(0, 2) || "";
                const dateMonth = MONTHS[Number(dateParts[1]) - 1] || dateParts[1] || "";
                const capacity = Number(e.capacity) || 0;
                const registered = Number(e.registered_count) || 0;
                const capacityPct = capacity > 0 ? Math.min(100, Math.max(0, (registered / capacity) * 100)) : 0;
                return (
                  <Link key={e.id} to={`/events/${e.id}`} data-testid={`event-${e.id}`} className={`group flex h-full flex-col overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow hover-lift animate-fade-up d-${(i % 6) + 1}`}>
                    <div className="relative h-44 shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 sm:h-48">
                      {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-slate-950/5" />
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-blue-400 via-cyan-400 to-emerald-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CalendarDays className="absolute -bottom-8 left-2 h-28 w-28 rotate-12 text-white/10 transition duration-700 group-hover:rotate-6" />
                      <span className="absolute right-3 top-3 z-10 rounded-full border border-white/50 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-md">{SCOPE[e.scope]}</span>
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                        {e.mode === "online" ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                        {e.mode === "online" ? "عن بُعد" : "حضوري"}
                      </span>
                      {(dateDay || dateMonth) && (
                        <div className="absolute bottom-3 right-3 z-10 min-w-[3.75rem] rounded-2xl bg-white/90 px-3 py-2 text-center shadow-[0_14px_30px_-10px_rgba(2,6,23,0.5)] ring-1 ring-white/70 backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1">
                          <div className="font-head text-xl font-extrabold leading-none text-slate-900">{dateDay}</div>
                          <div className="mt-1 text-[11px] font-bold leading-none text-blue-600">{dateMonth}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-head text-lg font-extrabold leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-blue-700">{e.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-3">{e.description}</p>
                      <div className="mt-4 space-y-2.5 text-xs text-slate-500 sm:text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" /></span>
                          <span className="font-semibold">{e.date} {e.time}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">{e.mode === "online" ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}</span>
                          <span className="font-semibold">{e.mode === "online" ? "عن بُعد" : e.location || "حضوري"}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-blue-600" />{e.registered_count}/{e.capacity} مسجّل</span>
                          <span className="font-head text-sm text-blue-600">{Math.round(capacityPct)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-l from-blue-600 via-cyan-500 to-emerald-500 transition-all duration-700" style={{ width: `${capacityPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </Layout>
  );
}
