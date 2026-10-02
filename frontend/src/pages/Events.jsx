import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users, Globe, Building2 } from "lucide-react";

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
        <Calendar className="pointer-events-none absolute -bottom-12 -left-10 h-64 w-64 rotate-12 text-white/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
            <Calendar className="h-6 w-6" />
          </div>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">الفعاليات</h1>
          <p className="text-emerald-50/80 mt-3 max-w-2xl leading-relaxed sm:text-lg">فعاليات وطنية وعلى مستوى المديريات والمدارس، حضورية وعن بُعد.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-[1.4rem] border border-slate-100 bg-white p-2 ft-shadow sm:flex-wrap sm:overflow-visible">
          {[["", "الكل"], ["national", "وطنية"], ["directorate", "مديرية"], ["school", "مدرسة"]].map(([v, l]) => (
            <button key={v} onClick={() => setScope(v)} data-testid={`event-scope-${v || "all"}`} className={`pressable shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${scope === v ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
        {!data ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Calendar} title="لا فعاليات حالياً" desc="تابعنا لمعرفة الفعاليات القادمة" />
          : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
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
                      {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
                      <Calendar className="absolute -bottom-7 left-3 h-28 w-28 rotate-12 text-white/15" />
                      <span className="absolute right-3 top-3 z-10 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-slate-700 backdrop-blur">{SCOPE[e.scope]}</span>
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-950/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                        {e.mode === "online" ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                        {e.mode === "online" ? "عن بُعد" : "حضوري"}
                      </span>
                      {(dateDay || dateMonth) && (
                        <div className="absolute bottom-3 right-3 z-10 min-w-[3.75rem] rounded-2xl bg-white/95 px-3 py-2 text-center shadow-lg backdrop-blur">
                          <div className="font-head text-xl font-extrabold leading-none text-slate-900">{dateDay}</div>
                          <div className="mt-1 text-[11px] font-bold leading-none text-blue-600">{dateMonth}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <h3 className="font-head font-bold text-lg leading-snug text-slate-900 line-clamp-2">{e.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-500 line-clamp-3 mt-2">{e.description}</p>
                      <div className="mt-5 space-y-3 text-xs text-slate-500 sm:text-[13px]">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Calendar className="w-3.5 h-3.5" /></span>
                          <span>{e.date} {e.time}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">{e.mode === "online" ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}</span>
                          <span>{e.mode === "online" ? "عن بُعد" : e.location || "حضوري"}</span>
                        </div>
                      </div>
                      <div className="mt-auto pt-5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-600" />{e.registered_count}/{e.capacity} مسجّل</span>
                          <span className="font-head text-blue-600">{Math.round(capacityPct)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-l from-blue-600 to-emerald-500 transition-all duration-500" style={{ width: `${capacityPct}%` }} />
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
