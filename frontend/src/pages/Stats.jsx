import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BookOpen, Zap, Timer, CalendarCheck, Trophy, TrendingUp, TrendingDown, History, Flame, ArrowLeft } from "lucide-react";

const REASON_LABELS = {
  read_book: "قراءة كتاب", review_book: "مراجعة كتاب", studio_review: "مراجعة عمل في الاستوديو",
  work_published: "نشر عمل في الاستوديو", venture_publish: "نشر مشروع", venture_vote_received: "تصويت لمشروعك",
  venture_complete_owner: "إتمام مشروع (قائد الفريق)", venture_complete_member: "إتمام مشروع (عضو)",
  daily_checkin: "حضور يومي", win_chess: "فوز في الشطرنج", play_chess: "مباراة شطرنج",
  join_event: "المشاركة في فعالية", join_competition: "الانضمام لمسابقة", win_competition: "الفوز بمسابقة",
};

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Stats() {
  const [week, setWeek] = useState(null);
  const [focus, setFocus] = useState(null);
  const [history, setHistory] = useState([]);
  const [standing, setStanding] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    const [w, f, h, s] = await Promise.allSettled([
      api.get("/stats/my-week"),
      api.get("/focus/stats/me"),
      api.get("/gamification/history", { params: { page: 1, limit: 100 } }),
      api.get("/leaderboard/my-standing"),
    ]);
    if (w.status === "fulfilled") setWeek(w.value.data); else setFailed(true);
    if (f.status === "fulfilled") setFocus(f.value.data);
    if (h.status === "fulfilled") setHistory(h.value.data.items || []);
    if (s.status === "fulfilled") setStanding(s.value.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const chart = useMemo(() => {
    const days = [];
    const byDay = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      byDay[dayKey(d)] = 0;
      days.push({ key: dayKey(d), label: d.toLocaleDateString("ar", { weekday: "short" }), xp: 0 });
    }
    history.forEach((t) => {
      if (!t.created_at || (t.amount || 0) <= 0) return;
      const k = dayKey(new Date(t.created_at));
      if (k in byDay) byDay[k] += t.amount;
    });
    return days.map((d) => ({ ...d, xp: byDay[d.key] }));
  }, [history]);

  const pagesDelta = week ? (week.pages_this_week || 0) - (week.pages_last_week || 0) : 0;
  const pagesPct = week && week.pages_last_week > 0 ? Math.round((pagesDelta / week.pages_last_week) * 100) : null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-[1.8rem] ft-hero-gradient grain text-white px-6 py-8 sm:px-8 mb-6 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-16 left-1/4 w-56 h-56 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_22%,transparent)] blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur"><Zap className="w-3.5 h-3.5 ft-text-accent-bright" /> نبض أسبوعك</span>
            <h1 className="font-head text-3xl sm:text-4xl font-extrabold mt-4">إحصائياتي</h1>
            <p className="text-white/70 text-sm mt-2 max-w-xl leading-relaxed">قراءتك وتركيزك ونقاطك في نظرة واحدة · قارن هذا الأسبوع بالماضي وتابع تقدّمك يوماً بيوم.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 animate-pulse"><div className="w-10 h-10 rounded-2xl bg-slate-100" /><div className="h-7 w-16 bg-slate-100 rounded-lg mt-4" /><div className="h-3 w-20 bg-slate-100 rounded mt-2" /></div>
            ))}
            <div className="col-span-2 lg:col-span-4 bg-white rounded-3xl border border-slate-100 ft-shadow p-5 animate-pulse"><div className="h-48 bg-slate-50 rounded-2xl" /></div>
          </div>
        ) : failed && !week ? (
          <ErrorState message="تعذّر تحميل إحصائياتك" onRetry={load} context="stats-page" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <Tile icon={BookOpen} tint="bg-sky-50 text-sky-600" label="صفحات هذا الأسبوع" value={week?.pages_this_week ?? 0}>
                {week && (pagesPct !== null ? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${pagesDelta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {pagesDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {pagesDelta >= 0 ? "+" : ""}{pagesPct}% عن الأسبوع الماضي ({week.pages_last_week || 0})
                  </span>
                ) : <span className="text-[11px] font-bold text-slate-400">أسبوعك الأول هنا · بداية قوية!</span>)}
              </Tile>
              <Tile icon={Zap} tint="bg-amber-50 text-amber-600" label="نقاط خبرة الأسبوع" value={week?.xp_this_week ?? 0} suffix="XP" />
              <Tile icon={Timer} tint="bg-violet-50 text-violet-600" label="دقائق تركيز الأسبوع" value={week?.focus_min_week ?? focus?.week_min ?? 0} suffix="دقيقة" />
              <Tile icon={CalendarCheck} tint="bg-emerald-50 text-emerald-600" label="أيام نشاطي" value={`${week?.active_days ?? 0}/7`} sub="من أيام هذا الأسبوع" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-5">
              <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
                <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <span className="w-9 h-9 rounded-xl ft-icon-tile text-white grid place-items-center"><Zap className="w-5 h-5" /></span>
                  نقاطي المكتسبة يومياً
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">مجموع نقاط الخبرة الإيجابية كل يوم · آخر 14 يوماً من سجلّك</p>
                <div className="h-52" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={1} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [`${v} XP`, "النقاط"]} contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", fontSize: 12 }} />
                      <Area type="monotone" dataKey="xp" stroke="#f59e0b" strokeWidth={2.5} fill="url(#xpFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="space-y-4">
                {standing && (
                  <Link to="/leaderboard" className="block bg-white rounded-3xl border border-slate-100 ft-shadow p-5 hover-lift pressable">
                    <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center"><Trophy className="w-5 h-5" /></span>
                      موقعي في الترتيب
                    </h3>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <div className="font-head text-3xl font-black text-slate-900">#{standing.rank_students || standing.rank_all || "·"}</div>
                        <div className="text-[11px] text-slate-400 font-bold mt-1">{standing.xp ?? 0} XP إجمالاً</div>
                      </div>
                      {standing.chess_rank && <span className="ft-chip rounded-full px-3 py-1.5 text-[11px] font-extrabold">شطرنج #{standing.chess_rank}</span>}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold ft-text-accent mt-3">افتح لوحة الترتيب <ArrowLeft className="w-3.5 h-3.5" /></span>
                  </Link>
                )}

                {focus && (
                  <section className="bg-slate-950 grain relative overflow-hidden rounded-3xl text-white p-5 ft-shadow">
                    <div className="pointer-events-none absolute -top-14 left-1/4 w-40 h-40 rounded-full bg-violet-600/20 blur-3xl" />
                    <h3 className="relative font-head font-bold flex items-center gap-2 mb-3">
                      <span className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/15 grid place-items-center"><Flame className="w-5 h-5 text-amber-300" /></span>
                      تركيزي
                    </h3>
                    <div className="relative grid grid-cols-2 gap-2.5 text-center">
                      <MiniStat label="اليوم" value={`${focus.today_min || 0}د`} />
                      <MiniStat label="الأسبوع" value={`${focus.week_min || 0}د`} />
                      <MiniStat label="جلساتي" value={focus.sessions || 0} />
                      <MiniStat label="أفضل جلسة" value={`${focus.best_min || 0}د`} />
                    </div>
                    <Link to="/focus" className="relative inline-flex items-center gap-1 text-xs font-extrabold text-violet-200 mt-3 min-h-[44px]">افتح غرف التركيز <ArrowLeft className="w-3.5 h-3.5" /></Link>
                  </section>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
                <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 grid place-items-center"><History className="w-5 h-5" /></span>
                  أحدث نشاطاتي
                </h3>
                <div className="divide-y divide-slate-50">
                  {history.slice(0, 6).map((t, i) => {
                    const pos = (t.amount || 0) >= 0;
                    return (
                      <div key={`${t.created_at}-${i}`} className="flex items-center gap-3 py-2.5">
                        <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${pos ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{pos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{REASON_LABELS[t.reason] || "نشاط"}</div>
                          <div className="text-[11px] text-slate-400">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar", { day: "numeric", month: "short" }) : ""}</div>
                        </div>
                        <span className={`font-extrabold text-sm shrink-0 ${pos ? "text-emerald-600" : "text-rose-500"}`} dir="ltr">{pos ? "+" : ""}{t.amount}</span>
                      </div>
                    );
                  })}
                </div>
                <Link to="/points" className="inline-flex items-center gap-1 text-xs font-extrabold ft-text-accent mt-3 min-h-[44px]">سجل النقاط الكامل <ArrowLeft className="w-3.5 h-3.5" /></Link>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function Tile({ icon: Icon, tint, label, value, suffix, sub, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 hover-lift">
      <span className={`w-10 h-10 rounded-2xl grid place-items-center ${tint}`}><Icon className="w-5 h-5" /></span>
      <div className="font-head text-2xl sm:text-3xl font-black text-slate-900 mt-3 leading-none">
        {value}{suffix && <span className="text-xs font-bold text-slate-400 mr-1">{suffix}</span>}
      </div>
      <div className="text-[11px] font-bold text-slate-400 mt-1.5">{label}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400">{sub}</div>}
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] ring-1 ring-white/10 px-2 py-3">
      <div className="font-head font-black text-base leading-none">{value}</div>
      <div className="text-[10px] font-bold text-white/50 mt-1.5">{label}</div>
    </div>
  );
}
