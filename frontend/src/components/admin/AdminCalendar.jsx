import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { FadeUp } from "@/components/anim";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, ChevronRight, ChevronLeft, ArrowLeft, Calendar, Trophy, Newspaper, Sparkles, ListOrdered } from "lucide-react";

/* التقويم الإداري · إعادة تصميم مكوّن calendar
   نفس مصادر البيانات والمنطق: GET /events · GET /competitions · GET /news (limit 1000)
   شبكة شهرية تبدأ بالسبت · النقر على يوم يفتح محتواه وينقل إلى الصفحة العامة. */

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const CAL_TYPE_META = {
  event: { l: "فعالية", c: "#7C3AED", icon: Calendar, link: (i) => `/events/${i.ref}` },
  comp: { l: "مسابقة", c: "#D97706", icon: Trophy, link: (i) => `/competitions/${i.ref}` },
  news: { l: "خبر", c: "#0891B2", icon: Newspaper, link: () => "/news" },
};

export default function AdminCalendar() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [items, setItems] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [ev, co, nw] = await Promise.all([
          api.get("/events", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
          api.get("/competitions", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
          api.get("/news", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
        ]);
        const norm = [];
        (ev.data.items || []).forEach((e) => {
          const d = String(e.date || "").slice(0, 10);
          if (d) norm.push({ type: "event", date: d, title: e.title, ref: e.id, sub: [e.time, e.location].filter(Boolean).join(" · ") });
        });
        (co.data.items || []).forEach((c) => {
          const d = String(c.start_at || "").slice(0, 10);
          if (d) norm.push({ type: "comp", date: d, title: c.title, ref: c.id, sub: c.end_at ? `تنتهي ${String(c.end_at).slice(0, 10)}` : "" });
        });
        (nw.data.items || []).forEach((n) => {
          const d = String(n.created_at || "").slice(0, 10);
          if (d) norm.push({ type: "news", date: d, title: n.title, ref: null, sub: n.category || "" });
        });
        setItems(norm);
      } catch { setItems([]); }
    })();
  }, []);

  const { y, m } = ym;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = (first.getDay() + 1) % 7; // Saturday-first week
  const byDate = {};
  (items || []).forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const shift = (d) => { const dt = new Date(y, m + d); setYm({ y: dt.getFullYear(), m: dt.getMonth() }); };
  const selItems = selDay ? byDate[selDay] || [] : [];

  const monthItems = useMemo(
    () => (items || []).filter((i) => i.date.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).sort((a, b) => a.date.localeCompare(b.date)),
    [items, y, m]
  );
  const monthCounts = useMemo(() => {
    const c = { event: 0, comp: 0, news: 0 };
    monthItems.forEach((i) => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  }, [monthItems]);
  const upcoming = useMemo(
    () => (items || []).filter((i) => i.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6),
    [items, todayStr]
  );

  if (!items) return <PageLoader />;

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="ft-hero-gradient rounded-[28px] p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 right-1/4 w-56 h-56 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full"><Sparkles className="w-3.5 h-3.5" /> خريطة المحتوى الزمنية</div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3">تقويم المحتوى</h2>
              <p className="text-white/70 text-sm mt-1.5">كل الفعاليات والمسابقات والأخبار في شهر <span className="font-bold text-white">{AR_MONTHS[m]} {y}</span> بنظرة واحدة.</p>
            </div>
            <div className="flex items-center gap-2">
              <button data-testid="admin-cal-prev" onClick={() => shift(-1)} className="pressable inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 text-sm font-bold"><ChevronRight className="w-4 h-4" /> السابق</button>
              <button data-testid="admin-cal-today" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })} className="pressable px-3.5 py-2.5 rounded-2xl bg-white text-emerald-800 text-sm font-extrabold shadow-lg shadow-black/10">اليوم</button>
              <button data-testid="admin-cal-next" onClick={() => shift(1)} className="pressable inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 text-sm font-bold">التالي <ChevronLeft className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-5">
            {Object.entries(CAL_TYPE_META).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-2 bg-white/12 backdrop-blur ring-1 ring-white/20 rounded-full px-3.5 py-1.5 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.c }} />{v.l}
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-[11px] font-extrabold">{monthCounts[k] || 0}</span>
              </span>
            ))}
          </div>
        </div>
      </FadeUp>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <FadeUp className="bg-white rounded-3xl border border-slate-100 ft-shadow p-3 sm:p-5 min-w-0">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {AR_WEEKDAYS.map((d) => <div key={d} className="text-center text-[11px] sm:text-xs font-extrabold text-slate-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = byDate[ds] || [];
              const isToday = ds === todayStr;
              const isSel = ds === selDay;
              return (
                <button key={day} data-testid={`admin-cal-day-${ds}`} onClick={() => dayItems.length && setSelDay(ds)}
                  className={`min-h-[54px] sm:min-h-[88px] rounded-2xl border p-1 sm:p-1.5 text-right transition-all flex flex-col ${isSel ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/60" : isToday ? "border-emerald-300 bg-emerald-50/40" : "border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm"} ${dayItems.length ? "cursor-pointer" : "cursor-default"}`}>
                  <span className={`text-xs sm:text-sm font-extrabold w-6 h-6 grid place-items-center rounded-full ${isToday ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-slate-600"}`}>{day}</span>
                  <div className="mt-1 space-y-1 overflow-hidden w-full">
                    {dayItems.slice(0, 2).map((it, j) => (
                      <div key={j} className="flex items-center gap-1 text-[10px] sm:text-[11px] leading-tight bg-white/80 rounded-md px-1 py-0.5 ring-1 ring-slate-100">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CAL_TYPE_META[it.type].c }} />
                        <span className="truncate font-semibold text-slate-600">{it.title}</span>
                      </div>
                    ))}
                    {dayItems.length > 2 && <div className="text-[10px] text-slate-400 font-bold px-0.5">+{dayItems.length - 2} المزيد</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </FadeUp>

        <FadeUp delay={0.08} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
          <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2 text-sm"><ListOrdered className="w-4.5 h-4.5 text-emerald-600" /> القادم على المنصة</h3>
          {upcoming.length === 0 ? (
            <div className="text-center py-8">
              <span className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center mb-3"><CalendarDays className="w-6 h-6" /></span>
              <div className="text-sm font-bold text-slate-500">لا محتوى قادم مجدول</div>
              <p className="text-xs text-slate-400 mt-1">جدول فعالية أو مسابقة وستظهر هنا فوراً.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {upcoming.map((it, i) => {
                const meta = CAL_TYPE_META[it.type];
                const MetaIcon = meta.icon;
                return (
                  <button key={i} onClick={() => nav(meta.link(it))} className="w-full text-right flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all group">
                    <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${meta.c}, ${meta.c}AA)` }}><MetaIcon className="w-4.5 h-4.5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-sm text-slate-800 truncate">{it.title}</span>
                      <span className="block text-[11px] text-slate-400 font-semibold mt-0.5">{it.date}{it.sub ? ` · ${it.sub}` : ""}</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-full shrink-0" style={{ background: `${meta.c}14`, color: meta.c }}>{meta.l}</span>
                  </button>
                );
              })}
            </div>
          )}
        </FadeUp>
      </div>

      <Dialog open={!!selDay} onOpenChange={(o) => !o && setSelDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>محتوى يوم {selDay}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selItems.map((it, i) => {
              const meta = CAL_TYPE_META[it.type];
              const MetaIcon = meta.icon;
              return (
                <button key={i} onClick={() => { setSelDay(null); nav(meta.link(it)); }}
                  className="w-full text-right flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: meta.c }}><MetaIcon className="w-4 h-4" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-slate-800 truncate">{it.title}</span>
                    <span className="block text-[11px] text-slate-400 font-semibold">{meta.l}{it.sub ? ` · ${it.sub}` : ""}</span>
                  </span>
                  <ArrowLeft className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
