import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import { CalendarDays, Trophy, ChevronLeft, ChevronRight, Bell, BellRing, MapPin, Clock } from "lucide-react";

const MONTH_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const WEEK_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function fmtKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendar() {
  const [events, setEvents] = useState(null);
  const [comps, setComps] = useState([]);
  const [reminds, setReminds] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(fmtKey(new Date()));

  useEffect(() => {
    api.get("/events", { params: { limit: 100 } }).then((r) => setEvents(r.data?.items || [])).catch(() => setEvents([]));
    api.get("/competitions").then((r) => { const d = r.data; setComps(Array.isArray(d) ? d : (d?.items || [])); }).catch(() => {});
    api.get("/events/reminders/mine").then((r) => setReminds(r.data || [])).catch(() => {});
  }, []);

  const byDay = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => { const k = String(e.date || "").slice(0, 10); (map[k] = map[k] || []).push({ ...e, _kind: "event" }); });
    comps.forEach((c) => { const k = String(c.date || c.deadline || "").slice(0, 10); if (k) (map[k] = map[k] || []).push({ ...c, _kind: "comp" }); });
    return map;
  }, [events, comps]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(y, m, d));
    return arr;
  }, [cursor]);

  const toggleRemind = async (id) => {
    try {
      const { data } = await api.post("/events/remind", { event_id: id });
      setReminds((arr) => data.remind ? [...arr, id] : arr.filter((x) => x !== id));
      toast.success(data.remind ? "سيصلك تذكير قبل الفعالية بيوم 🔔" : "أُلغي التذكير");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const todayKey = fmtKey(new Date());
  const dayItems = byDay[selected] || [];

  const selParts = selected.split("-").map(Number);
  const selDate = new Date(selParts[0], (selParts[1] || 1) - 1, selParts[2] || 1);
  const selLabel = `${WEEK_AR[selDate.getDay()]} · ${selDate.getDate()} ${MONTH_AR[selDate.getMonth()]} ${selDate.getFullYear()}`;
  const curPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const monthItems = Object.keys(byDay).filter((k) => k.startsWith(curPrefix)).reduce((s, k) => s + byDay[k].length, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 xl:max-w-[1440px] xl:py-10">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-8 sm:px-10 xl:px-12 xl:py-10 mb-8">
          <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-8 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl" />
          <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur text-white text-xs font-bold"><CalendarDays className="w-3.5 h-3.5" /> كل مواعيد النادي</span>
          <h1 className="relative font-head text-3xl sm:text-5xl xl:text-6xl font-extrabold text-white mt-4 leading-tight">تقويم الفعاليات والمسابقات</h1>
          <p className="relative text-white/75 text-sm sm:text-base mt-2 max-w-xl">اضغط أي يوم لعرض فعالياته، وفعّل التذكير لتصلك رسالة قبلها بيوم.</p>
          {events !== null && (
            <div className="relative mt-5 flex flex-wrap gap-2 animate-fade-up">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold"><CalendarDays className="w-3.5 h-3.5 ft-text-accent-bright" /> {events.length} فعالية</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold"><Trophy className="w-3.5 h-3.5 text-amber-300" /> {comps.length} مسابقة</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold"><Bell className="w-3.5 h-3.5 text-sky-300" /> {monthItems} هذا الشهر</span>
            </div>
          )}
          <CalendarDays className="absolute -left-6 -bottom-8 w-44 h-44 text-white/10 rotate-12" />
          <Trophy className="absolute left-24 top-4 w-16 h-16 text-white/[0.07] -rotate-12 hidden sm:block" />
        </div>

        {events === null ? <PageLoader /> : (
          <div className="grid lg:grid-cols-[1fr_330px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6 xl:gap-8 items-start">
            <div className="bg-white rounded-[1.8rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-4 sm:p-6 xl:p-8 animate-fade-up">
              <div className="flex items-center justify-between gap-2 mb-5">
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-700 transition"><ChevronRight className="w-5 h-5" /></button>
                <div className="text-center">
                  <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">{MONTH_AR[cursor.getMonth()]} <span className="ft-text-accent">{cursor.getFullYear()}</span></h2>
                  <button onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(todayKey); }} className="pressable mt-1 text-[11px] font-bold text-slate-400 ft-hover-text-accent transition">العودة لليوم</button>
                </div>
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-white ring-1 ring-slate-200 text-slate-600 shadow-sm ft-hover-ring-accent ft-hover-text-accent transition"><ChevronLeft className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[11px] sm:text-xs font-extrabold mb-2">
                {WEEK_AR.map((w, wi) => <div key={w} className={`py-2 rounded-lg ${wi === 5 ? "ft-text-accent ft-bg-soft" : "text-slate-400"}`}>{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="rounded-xl bg-slate-50/40" />;
                  const k = fmtKey(d);
                  const items = byDay[k] || [];
                  const isToday = k === todayKey;
                  const isSel = k === selected;
                  const first = items[0];
                  return (
                    <button key={i} onClick={() => setSelected(k)}
                      className={`pressable relative rounded-xl sm:rounded-2xl min-h-[46px] sm:min-h-[68px] lg:min-h-[84px] xl:min-h-[98px] 2xl:min-h-[110px] px-1 py-1.5 text-sm font-bold transition flex flex-col items-center justify-start gap-1 ${isSel ? "ft-navy-gradient text-white shadow-lg shadow-slate-900/25 ring-2 ring-slate-900/10" : isToday ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400" : "text-slate-600 ring-1 ring-slate-100 hover:bg-slate-50 ft-hover-ring-accent"}`}>
                      <span className={`leading-none ${isToday && !isSel ? "relative after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-emerald-500" : ""}`}>{d.getDate()}</span>
                      {first && (
                        <span className={`hidden sm:block max-w-full truncate text-[9px] leading-tight font-bold px-1.5 py-0.5 rounded-md ${isSel ? "bg-white/20 text-white" : first._kind === "comp" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{first.title}</span>
                      )}
                      {items[1] && (
                        <span className={`hidden xl:block max-w-full truncate text-[9px] leading-tight font-bold px-1.5 py-0.5 rounded-md ${isSel ? "bg-white/15 text-white" : items[1]._kind === "comp" ? "bg-amber-100/80 text-amber-700" : "bg-emerald-100/80 text-emerald-700"}`}>{items[1].title}</span>
                      )}
                      {items.length > 0 && (
                        <span className="flex gap-0.5 mt-auto sm:mt-0">
                          {items.slice(0, 3).map((it, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-white/85" : it._kind === "comp" ? "bg-amber-500" : "bg-emerald-500"}`} />)}
                          {items.length > 3 && <span className={`text-[8px] font-extrabold leading-none ${isSel ? "text-white/85" : "text-slate-400"}`}>+{items.length - 3}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500" /> فعالية</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><span className="w-2 h-2 rounded-full bg-amber-500" /> مسابقة</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25"><span className="w-2 h-2 rounded-full bg-white" /> اليوم</span>
              </div>
            </div>

            <aside className="bg-white rounded-[1.8rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 lg:sticky lg:top-24 animate-fade-up" style={{ animationDelay: "80ms" }}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2"><span className="w-8 h-8 rounded-xl ft-hero-gradient text-white grid place-items-center shrink-0"><CalendarDays className="w-4 h-4" /></span> {selLabel}</h3>
                {dayItems.length > 0 && <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-900 text-white shrink-0">{dayItems.length} موعد</span>}
              </div>
              {dayItems.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 py-8 px-4 text-center">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-bold">لا فعاليات هذا اليوم</p>
                  <p className="text-[11px] text-slate-300 mt-1">جرّب يومًا آخر من التقويم</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayItems.map((it, ix) => (
                    <div key={it.id} className="animate-fade-up rounded-2xl bg-slate-50 border border-slate-100 p-3.5 ft-hover-border-accent ft-hover-bg-soft/40 transition" style={{ animationDelay: `${ix * 70}ms` }}>
                      <div className="flex items-start gap-2.5">
                        <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 shadow-md ${it._kind === "comp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30" : "ft-navy-gradient text-white shadow-slate-900/20"}`}>
                          {it._kind === "comp" ? <Trophy className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link to={it._kind === "comp" ? `/competitions/${it.id}` : `/events/${it.id}`} className="font-bold text-sm text-slate-800 ft-hover-text-accent block leading-snug">{it.title}</Link>
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${it._kind === "comp" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{it._kind === "comp" ? "مسابقة" : "فعالية"}</span>
                            {it.time && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-500"><Clock className="w-3 h-3" />{it.time}</span>}
                            {it.location && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-500"><MapPin className="w-3 h-3" />{it.location}</span>}
                          </div>
                        </div>
                      </div>
                      {it._kind === "event" && (
                        <button onClick={() => toggleRemind(it.id)}
                          className={`pressable mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-extrabold transition ${reminds.includes(it.id) ? "bg-gradient-to-l from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30" : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"}`}>
                          {reminds.includes(it.id) ? <><BellRing className="w-3.5 h-3.5" /> التذكير مفعّل</> : <><Bell className="w-3.5 h-3.5" /> ذكّرني قبلها بيوم</>}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
