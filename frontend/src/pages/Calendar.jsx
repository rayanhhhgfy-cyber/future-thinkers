import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import { CalendarDays, Trophy, ChevronLeft, ChevronRight, Bell, BellRing, MapPin } from "lucide-react";

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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient px-6 py-8 sm:px-10 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold"><CalendarDays className="w-3.5 h-3.5" /> كل مواعيد النادي</span>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-4">تقويم الفعاليات والمسابقات</h1>
          <p className="text-white/75 text-sm mt-2">اضغط أي يوم لعرض فعالياته، وفعّل التذكير لتصلك رسالة قبلها بيوم.</p>
          <CalendarDays className="absolute -left-6 -bottom-8 w-44 h-44 text-white/10" />
        </div>

        {events === null ? <PageLoader /> : (
          <div className="grid lg:grid-cols-[1fr_330px] gap-6 items-start">
            <div className="bg-white rounded-[1.8rem] border border-slate-100 ft-shadow p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
                <h2 className="font-head font-extrabold text-lg">{MONTH_AR[cursor.getMonth()]} {cursor.getFullYear()}</h2>
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1">
                {WEEK_AR.map((w) => <div key={w} className="py-1">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const k = fmtKey(d);
                  const items = byDay[k] || [];
                  const isToday = k === todayKey;
                  const isSel = k === selected;
                  return (
                    <button key={i} onClick={() => setSelected(k)}
                      className={`pressable relative rounded-xl py-2.5 sm:py-3 text-sm font-bold transition ${isSel ? "bg-slate-900 text-white" : isToday ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "text-slate-600 hover:bg-slate-50"}`}>
                      {d.getDate()}
                      {items.length > 0 && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {items.slice(0, 3).map((it, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${it._kind === "comp" ? "bg-amber-500" : "bg-emerald-500"}`} />)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> فعالية</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> مسابقة</span>
              </div>
            </div>

            <aside className="bg-white rounded-[1.8rem] border border-slate-100 ft-shadow p-5">
              <h3 className="font-head font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-600" /> {selected}</h3>
              {dayItems.length === 0 ? <p className="text-sm text-slate-400">لا فعاليات هذا اليوم</p> : (
                <div className="space-y-3">
                  {dayItems.map((it) => (
                    <div key={it.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${it._kind === "comp" ? "bg-amber-500 text-white" : "ft-navy-gradient text-white"}`}>
                          {it._kind === "comp" ? <Trophy className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <Link to={it._kind === "comp" ? `/competitions/${it.id}` : `/events/${it.id}`} className="font-bold text-sm text-slate-800 hover:text-emerald-700 block truncate">{it.title}</Link>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            {it.time && <span>{it.time}</span>}
                            {it.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{it.location}</span>}
                          </div>
                        </div>
                      </div>
                      {it._kind === "event" && (
                        <button onClick={() => toggleRemind(it.id)}
                          className={`pressable mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold ${reminds.includes(it.id) ? "bg-amber-100 text-amber-700" : "bg-white border border-slate-200 text-slate-600"}`}>
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
