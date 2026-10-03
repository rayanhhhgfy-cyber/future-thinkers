import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import { CalendarDays, Trophy, ChevronLeft, ChevronRight, Bell, BellRing, MapPin, Clock, X, Download, UserCheck, LayoutGrid, Columns3, Loader2 } from "lucide-react";

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
  const [view, setView] = useState("month");
  const [mineOnly, setMineOnly] = useState(false);
  const [sheetKey, setSheetKey] = useState(null);
  const [exportGone, setExportGone] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get("/events", { params: { limit: 100 } }).then((r) => setEvents(r.data?.items || [])).catch(() => setEvents([]));
    api.get("/competitions").then((r) => { const d = r.data; setComps(Array.isArray(d) ? d : (d?.items || [])); }).catch(() => {});
    api.get("/events/reminders/mine").then((r) => setReminds(r.data || [])).catch(() => {});
  }, []);

  const isMineEvent = (e) => !!(e && (e.mine || e.registered || e.is_registered || e.joined || e.attending || reminds.includes(e.id)));
  const isMineComp = (c) => !!(c && (c.mine || c.entered || c.is_entered || c.joined || c.submitted));

  const byDay = useMemo(() => {
    const map = {};
    const evs = mineOnly ? (events || []).filter(isMineEvent) : (events || []);
    const cps = mineOnly ? comps.filter(isMineComp) : comps;
    evs.forEach((e) => { const k = String(e.date || "").slice(0, 10); (map[k] = map[k] || []).push({ ...e, _kind: "event" }); });
    cps.forEach((c) => { const k = String(c.date || c.deadline || "").slice(0, 10); if (k) (map[k] = map[k] || []).push({ ...c, _kind: "comp" }); });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, comps, mineOnly, reminds]);

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

  const labelForKey = (k) => {
    const p = String(k || "").split("-").map(Number);
    const d = new Date(p[0] || 2000, (p[1] || 1) - 1, p[2] || 1);
    return `${WEEK_AR[d.getDay()]} · ${d.getDate()} ${MONTH_AR[d.getMonth()]} ${d.getFullYear()}`;
  };

  const weekDays = useMemo(() => {
    const p = selected.split("-").map(Number);
    const base = new Date(p[0] || 2000, (p[1] || 1) - 1, p[2] || 1);
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [selected]);

  const weekLabel = weekDays.length === 7
    ? `${weekDays[0].getDate()} ${MONTH_AR[weekDays[0].getMonth()]} · ${weekDays[6].getDate()} ${MONTH_AR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
    : "";

  const stepView = (dir) => {
    if (view === "week") {
      const p = selected.split("-").map(Number);
      const nd = new Date(p[0] || 2000, (p[1] || 1) - 1, p[2] || 1);
      nd.setDate(nd.getDate() + dir * 7);
      setSelected(fmtKey(nd));
      setCursor(new Date(nd.getFullYear(), nd.getMonth(), 1));
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    }
  };

  const openDay = (k) => { setSelected(k); setSheetKey(k); };

  const exportCalendar = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.get("/calendar/export.ics", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/calendar;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "future-thinkers-calendar.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("تم تصدير تقويمك · أضِفه إلى تطبيق التقويم لديك");
    } catch {
      setExportGone(true);
    }
    setExporting(false);
  };

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
          <>
          {/* ===== toolbar: view switcher · mine filter · export ===== */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6 animate-fade-up">
            <div className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 p-1 shadow-sm">
              <button onClick={() => setView("month")}
                className={`pressable inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-extrabold transition ${view === "month" ? "ft-navy-gradient text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}>
                <LayoutGrid className="w-4 h-4" /> شهر
              </button>
              <button onClick={() => setView("week")}
                className={`pressable inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-extrabold transition ${view === "week" ? "ft-navy-gradient text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}>
                <Columns3 className="w-4 h-4" /> أسبوع
              </button>
            </div>
            <button onClick={() => setMineOnly((v) => !v)} aria-pressed={mineOnly}
              className={`pressable inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full text-xs font-extrabold border transition ${mineOnly ? "bg-gradient-to-l from-emerald-500 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-500/25" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"}`}>
              <UserCheck className="w-4 h-4" /> فعالياتي فقط
              <span className={`relative w-8 h-[18px] rounded-full transition shrink-0 ${mineOnly ? "bg-white/30" : "bg-slate-200"}`}>
                <span className="absolute top-[2px] right-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-300" style={{ transform: mineOnly ? "translateX(-14px)" : "translateX(0)" }} />
              </span>
            </button>
            <span className="flex-1" />
            {!exportGone && (
              <button onClick={exportCalendar} disabled={exporting}
                className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full ft-btn-primary text-white text-xs font-extrabold shadow-md disabled:opacity-60">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} تصدير تقويمي
              </button>
            )}
          </div>

          <div className="grid lg:grid-cols-[1fr_330px] xl:grid-cols-[minmax(0,1fr)_380px] gap-6 xl:gap-8 items-start">
            <div className="bg-white rounded-[1.8rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-4 sm:p-6 xl:p-8 animate-fade-up">
              <div className="flex items-center justify-between gap-2 mb-5">
                <button onClick={() => stepView(1)} aria-label="التالي" className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-700 transition"><ChevronRight className="w-5 h-5" /></button>
                <div className="text-center">
                  {view === "week" ? (
                    <>
                      <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">أسبوع <span className="ft-text-accent">{weekDays[0]?.getFullYear()}</span></h2>
                      <div className="mt-0.5 text-[11px] font-bold text-slate-400">{weekLabel}</div>
                    </>
                  ) : (
                    <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-tight">{MONTH_AR[cursor.getMonth()]} <span className="ft-text-accent">{cursor.getFullYear()}</span></h2>
                  )}
                  <button onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(todayKey); }} className="pressable mt-1 text-[11px] font-bold text-slate-400 ft-hover-text-accent transition">العودة لليوم</button>
                </div>
                <button onClick={() => stepView(-1)} aria-label="السابق" className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-full bg-white ring-1 ring-slate-200 text-slate-600 shadow-sm ft-hover-ring-accent ft-hover-text-accent transition"><ChevronLeft className="w-5 h-5" /></button>
              </div>
              {view === "month" ? (
              <>
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
                    <button key={i} onClick={() => openDay(k)}
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
              </>
              ) : (
              /* ===== week view: 7 day columns ===== */
              <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory lg:grid lg:grid-cols-7 lg:overflow-visible lg:mx-0 lg:px-0">
                {weekDays.map((d, di) => {
                  const k = fmtKey(d);
                  const items = byDay[k] || [];
                  const isToday = k === todayKey;
                  const isSel = k === selected;
                  return (
                    <div key={k}
                      className={`snap-start shrink-0 w-[132px] sm:w-[150px] lg:w-auto rounded-2xl border p-2.5 flex flex-col gap-2 min-h-[190px] lg:min-h-[230px] transition ${isSel ? "border-transparent ft-bg-soft ring-2 ft-ring-accent shadow-md" : isToday ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200" : "border-slate-100 bg-slate-50/50"}`}>
                      <button onClick={() => openDay(k)} className="pressable text-center rounded-xl py-1.5 transition hover:bg-white/70">
                        <span className={`block text-[10px] font-extrabold ${di === 5 ? "ft-text-accent" : "text-slate-400"}`}>{WEEK_AR[d.getDay()]}</span>
                        <span className={`mt-0.5 mx-auto grid place-items-center w-9 h-9 rounded-full font-head font-extrabold text-base ${isSel ? "ft-navy-gradient text-white shadow-lg" : isToday ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-700"}`}>{d.getDate()}</span>
                        {items.length > 0 && <span className="block mt-1 text-[9px] font-extrabold text-slate-400">{items.length} موعد</span>}
                      </button>
                      <div className="flex flex-col gap-1.5 flex-1">
                        {items.length === 0 ? (
                          <span className="flex-1 grid place-items-center text-[10px] font-bold text-slate-300">لا مواعيد</span>
                        ) : (
                          <>
                            {items.slice(0, 3).map((it) => (
                              <Link key={it.id} to={it._kind === "comp" ? `/competitions/${it.id}` : `/events/${it.id}`}
                                className={`pressable block rounded-xl px-2 py-2 text-[11px] font-bold leading-snug shadow-sm transition hover:shadow ${it._kind === "comp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/25" : "ft-navy-gradient text-white shadow-slate-900/20"}`}>
                                <span className="block line-clamp-2">{it.title}</span>
                                {it.time && <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold bg-white/20 rounded-full px-1.5 py-0.5"><Clock className="w-2.5 h-2.5" />{it.time}</span>}
                              </Link>
                            ))}
                            {items.length > 3 && (
                              <button onClick={() => openDay(k)} className="pressable text-[10px] font-extrabold text-slate-400 ft-hover-text-accent transition py-1">+{items.length - 3} المزيد</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500" /> فعالية</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><span className="w-2 h-2 rounded-full bg-amber-500" /> مسابقة</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25"><span className="w-2 h-2 rounded-full bg-white" /> اليوم</span>
              </div>
            </div>

            <aside className="bg-white rounded-[1.8rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
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

          {/* ===== day detail bottom sheet ===== */}
          {sheetKey && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={() => setSheetKey(null)} />
              <div className="relative w-full sm:max-w-lg bg-white rounded-t-[1.8rem] sm:rounded-[1.8rem] shadow-2xl max-h-[84vh] flex flex-col overflow-hidden animate-fade-up sm:m-4">
                <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar z-10" />
                <div className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-slate-200 sm:hidden shrink-0" />
                <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
                  <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-xl ft-hero-gradient text-white grid place-items-center shrink-0"><CalendarDays className="w-4 h-4" /></span>
                    <span className="truncate">{labelForKey(sheetKey)}</span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {(byDay[sheetKey] || []).length > 0 && (
                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-900 text-white">{(byDay[sheetKey] || []).length} موعد</span>
                    )}
                    <button onClick={() => setSheetKey(null)} aria-label="إغلاق" className="pressable w-10 h-10 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500 transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto px-5 py-4">
                  {(byDay[sheetKey] || []).length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-200 py-10 px-4 text-center">
                      <CalendarDays className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-bold">لا فعاليات هذا اليوم</p>
                      <p className="text-[11px] text-slate-300 mt-1">استمتع بيوم هادئ · أو تصفّح أيامًا أخرى</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(byDay[sheetKey] || []).map((it, ix) => (
                        <div key={it.id} className="animate-fade-up rounded-2xl bg-slate-50 border border-slate-100 p-4" style={{ animationDelay: `${ix * 60}ms` }}>
                          <div className="flex items-start gap-3">
                            <span className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 shadow-md ${it._kind === "comp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30" : "ft-navy-gradient text-white shadow-slate-900/20"}`}>
                              {it._kind === "comp" ? <Trophy className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <Link to={it._kind === "comp" ? `/competitions/${it.id}` : `/events/${it.id}`} onClick={() => setSheetKey(null)} className="font-bold text-[15px] text-slate-800 ft-hover-text-accent block leading-snug">{it.title}</Link>
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${it._kind === "comp" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{it._kind === "comp" ? "مسابقة" : "فعالية"}</span>
                                {it.time && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-500"><Clock className="w-3 h-3" />{it.time}</span>}
                                {it.location && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white ring-1 ring-slate-200 text-slate-500"><MapPin className="w-3 h-3" />{it.location}</span>}
                              </div>
                            </div>
                          </div>
                          {it._kind === "event" && (
                            <button onClick={() => toggleRemind(it.id)}
                              className={`pressable mt-3 w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs font-extrabold transition ${reminds.includes(it.id) ? "bg-gradient-to-l from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30" : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"}`}>
                              {reminds.includes(it.id) ? <><BellRing className="w-3.5 h-3.5" /> التذكير مفعّل</> : <><Bell className="w-3.5 h-3.5" /> ذكّرني قبلها بيوم</>}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </Layout>
  );
}
