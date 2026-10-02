import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Timer, Plus, LogOut, Users, Play, Pause, Flame, Headphones, Target, CalendarDays, Trophy, History, Activity, Check } from "lucide-react";

function fmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const MOODS = {
  violet: { label: "بنفسجي", dot: "from-violet-500 to-indigo-500", btn: "from-violet-600 to-indigo-600", soft: "bg-violet-500/20 ring-violet-300/40 text-violet-100", ring: "#a78bfa", glow: "rgba(139,92,246,0.50)" },
  emerald: { label: "زمردي", dot: "from-emerald-500 to-teal-500", btn: "from-emerald-600 to-teal-600", soft: "bg-emerald-500/20 ring-emerald-300/40 text-emerald-100", ring: "#34d399", glow: "rgba(16,185,129,0.50)" },
  ocean: { label: "محيطي", dot: "from-sky-500 to-blue-600", btn: "from-sky-600 to-blue-600", soft: "bg-sky-500/20 ring-sky-300/40 text-sky-100", ring: "#38bdf8", glow: "rgba(14,165,233,0.50)" },
  sunset: { label: "غروب", dot: "from-amber-500 to-rose-500", btn: "from-amber-600 to-rose-600", soft: "bg-amber-500/20 ring-amber-300/40 text-amber-100", ring: "#fbbf24", glow: "rgba(245,158,11,0.50)" },
  rose: { label: "وردي", dot: "from-rose-500 to-pink-500", btn: "from-rose-600 to-pink-600", soft: "bg-rose-500/20 ring-rose-300/40 text-rose-100", ring: "#fb7185", glow: "rgba(244,63,94,0.50)" },
  slate: { label: "حجري", dot: "from-slate-400 to-slate-600", btn: "from-slate-600 to-slate-800", soft: "bg-slate-400/20 ring-slate-300/40 text-slate-100", ring: "#94a3b8", glow: "rgba(100,116,139,0.50)" },
};
const moodOf = (r) => MOODS[r?.mood] || MOODS.violet;
const GOALS = [10, 25, 45, 60];

/* Weekly focus leaderboard strip · hides on error/empty, lobby only. */
function FocusLeaders() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/focus/leaderboard")
      .then((r) => setItems(r.data?.items || []))
      .catch(() => {});
  }, []);
  if (!items.length) return null;
  const chip = ["from-amber-400 to-orange-500 text-white shadow-amber-200", "from-slate-400 to-slate-500 text-white shadow-slate-200", "from-orange-300 to-amber-500 text-white shadow-orange-200"];
  return (
    <section className="animate-fade-up bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-5 sm:p-6 mb-6">
      <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2.5 mb-4">
        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-lg shadow-amber-200"><Trophy className="w-5 h-5" /></span>
        متصدرو التركيز هذا الأسبوع
        <span className="ft-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">غرف التركيز</span>
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.slice(0, 6).map((m, i) => (
          <div key={m.user_id || i} className="flex items-center gap-3 rounded-2xl bg-slate-50/70 ring-1 ring-slate-100 px-3 py-2.5">
            <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${chip[i] || "from-slate-200 to-slate-300 text-slate-600"} grid place-items-center text-xs font-black shadow shrink-0`}>{i + 1}</span>
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white grid place-items-center text-xs font-extrabold ring-2 ring-white shadow shrink-0">{(m.name || "؟").trim().charAt(0)}</span>
            <Link to={`/profile/${m.user_id}`} className="flex-1 min-w-0 truncate text-sm font-bold text-slate-700 hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)] transition-colors min-h-[44px] inline-flex items-center">{m.name}</Link>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-violet-600 bg-violet-50 ring-1 ring-violet-100 rounded-full px-2.5 py-1 shrink-0"><Timer className="w-3.5 h-3.5" />{m.minutes}د</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FocusRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [mood, setMood] = useState("violet");
  const [goalMin, setGoalMin] = useState(25);
  const [stats, setStats] = useState(null);
  const [room, setRoom] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const pendingMin = useRef(0);
  const load = () => api.get("/focus/rooms").then((r) => setRooms(r.data)).catch(() => setRooms([]));
  const loadStats = () => api.get("/focus/stats/me").then((r) => setStats(r.data)).catch(() => setStats(null));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!room) loadStats(); }, [room]);

  // timer + heartbeat (flush accumulated minutes every 60s)
  useEffect(() => {
    if (!ticking) return;
    const iv = setInterval(() => {
      setSeconds((s) => {
        const n = s + 1;
        if (n % 60 === 0) pendingMin.current += 1;
        if (n % 120 === 0 && room) {
          const add = pendingMin.current; pendingMin.current = 0;
          if (add > 0) api.post(`/focus/rooms/${room.id}/heartbeat`, { add_minutes: Math.min(5, add) }).catch(() => {});
        }
        return n;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [ticking, room]);

  const goalSec = (room?.goal_min || 25) * 60;
  useEffect(() => { setGoalReached(false); }, [room?.id]);
  useEffect(() => {
    if (room && seconds >= goalSec && !goalReached) {
      setGoalReached(true);
      toast.success("حققت هدف الجلسة 🎉");
    }
  }, [seconds, room, goalSec, goalReached]);

  const create = async () => {
    if (name.trim().length < 2) return toast.error("اسم الغرفة قصير");
    try {
      const { data } = await api.post("/focus/rooms", { name: name.trim(), mood, goal_min: goalMin, topic: topic.trim() });
      setName("");
      setTopic("");
      enter(data.id);
    } catch (e) { toast.error(apiErr(e)); }
  };
  const enter = async (id) => {
    try {
      await api.post(`/focus/rooms/${id}/join`);
      const { data } = await api.get(`/focus/rooms/${id}`);
      setRoom(data); setSeconds(0); setTicking(true);
    } catch (e) { toast.error(apiErr(e)); }
  };
  const leave = async () => {
    if (!room) return;
    setTicking(false);
    try {
      const { data } = await api.post(`/focus/rooms/${room.id}/leave`);
      if (data.xp > 0) { toast.success(`+${data.xp} خبرة من جلسة التركيز 🎉`); }
      else toast("انتهت الجلسة · 10 دقائق فأكثر تمنح نقاطاً");
    } catch (e) { toast.error(apiErr(e)); }
    setRoom(null); setSeconds(0); load();
  };

  if (room) {
    const me = room.members?.find((m) => m.user_id === user?.id);
    const m = moodOf(room);
    const roomGoalSec = (room.goal_min || 25) * 60;
    const ringPct = Math.min(100, (seconds / roomGoalSec) * 100);
    const R = 124, CIRC = 2 * Math.PI * R;
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-scale-in relative overflow-hidden rounded-[2rem] bg-slate-950 grain text-white px-5 py-9 sm:px-10 sm:py-11 text-center ft-shadow-lg">
            <span className="absolute inset-x-0 top-0 h-1 z-10" style={{ background: `linear-gradient(to left, transparent, ${m.ring}, transparent)` }} />
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(600px 260px at 50% -60px, ${m.glow}, transparent)` }} />
            <div className={`pointer-events-none absolute left-1/2 top-44 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl ${ticking ? "animate-pulse-soft" : ""}`} style={{ background: m.glow, opacity: 0.35 }} />
            <Headphones className="pointer-events-none absolute -right-8 -top-6 w-40 h-40 text-white/[0.04] rotate-12" />
            <Timer className="pointer-events-none absolute -left-8 -bottom-8 w-40 h-40 text-white/[0.04] -rotate-12" />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-xs font-bold backdrop-blur-sm"><span className={`w-2 h-2 rounded-full ${ticking ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} /> داخل الغرفة الآن</span>
            <h1 className="relative font-head text-2xl sm:text-3xl font-extrabold mt-4">{room.name}</h1>
            <div className="relative flex justify-center gap-2 mt-4 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 text-[11px] font-bold ${m.soft}`}><span className={`w-2 h-2 rounded-full bg-gradient-to-br ${m.dot}`} /> {m.label}</span>
              {room.topic && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-bold">{room.topic}</span>}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 text-[11px] font-bold ${goalReached ? "bg-emerald-500/25 ring-emerald-300/50 text-emerald-100" : "bg-white/10 ring-white/15"}`}><Target className="w-3.5 h-3.5" /> هدف {room.goal_min || 25}د{goalReached && <Check className="w-3.5 h-3.5 text-emerald-300" />}</span>
            </div>
            <div className="relative w-[248px] h-[248px] sm:w-[288px] sm:h-[288px] mx-auto mt-8">
              <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90">
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" className="stroke-white/[0.07]" />
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" strokeLinecap="round" stroke={goalReached ? "#34d399" : m.ring} className="transition-all duration-1000" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ringPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                <div className="font-mono text-6xl sm:text-7xl font-black tabular-nums tracking-tight leading-none" dir="ltr">{fmt(seconds)}</div>
                <div className="text-white/40 text-[11px] font-bold mt-3">{ticking ? "الجلسة جارية · ركّز" : "متوقفة مؤقتاً"}</div>
              </div>
            </div>
            <p className="relative text-white/50 text-sm mt-6 max-w-md mx-auto leading-relaxed">دقائقك المحفوظة: {Math.round((me?.focus_min || 0) + seconds / 60)} · الجلسة من 10 دقائق فأكثر تمنح نقاطاً (حتى 30) · هدف الجلسة {room.goal_min || 25}د</p>
            <div className="relative flex justify-center gap-3 mt-7 flex-wrap">
              <button onClick={() => setTicking((t) => !t)} className={`pressable inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-gradient-to-l ${m.btn} shadow-lg font-bold min-w-[160px]`} style={{ boxShadow: `0 12px 28px -10px ${m.glow}` }}>
                {ticking ? <><Pause className="w-5 h-5" /> إيقاف مؤقت</> : <><Play className="w-5 h-5" /> استئناف</>}
              </button>
              <button onClick={leave} className="pressable inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 font-bold min-w-[160px]">
                <LogOut className="w-5 h-5" /> إنهاء الجلسة
              </button>
            </div>
            <div className="relative flex justify-center gap-2 mt-9 flex-wrap">
              {(room.members || []).map((mm) => (
                <span key={mm.user_id} className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ring-1 ${mm.user_id === user?.id ? `${m.soft}` : "bg-white/10 ring-white/10"}`}>
                  <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${m.dot} grid place-items-center text-[10px] font-black text-white shrink-0`}>{mm.name?.[0] || "؟"}</span>
                  {mm.name} · {Math.round(mm.focus_min)}د
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const maxCount = rooms && rooms.length ? Math.max(...rooms.map((r) => r.member_count || 0)) : 0;
  const selMood = MOODS[mood];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] bg-slate-950 grain px-6 py-9 sm:px-10 sm:py-11 mb-8 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-28 left-1/3 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-10 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <Timer className="pointer-events-none absolute -left-8 -bottom-10 w-52 h-52 text-white/[0.05] -rotate-12" />
          <Headphones className="pointer-events-none absolute left-8 top-8 w-12 h-12 text-violet-300/25 animate-float hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-white text-xs font-bold backdrop-blur-sm"><Timer className="w-3.5 h-3.5" /> ذاكروا معاً بصمت</span>
            <h1 className="font-head text-4xl sm:text-5xl font-extrabold text-white mt-4 leading-tight">غرف <span className="animate-gradient-text bg-gradient-to-l from-violet-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">التركيز</span></h1>
            <p className="text-white/60 text-sm sm:text-base mt-3 max-w-xl leading-relaxed">افتح غرفة أو ادخل واحدة، شغّل المؤقّت واقرأ أو ذاكر · كل 10 دقائق تركيز فأكثر تمنحك نقاط خبرة.</p>
          </div>
        </div>

        {stats && (
          <div className="animate-fade-up relative overflow-hidden rounded-[1.6rem] bg-slate-950 grain text-white px-5 py-4 mb-6 ft-shadow">
            <div className="pointer-events-none absolute -top-20 right-1/4 w-64 h-64 rounded-full bg-violet-600/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 rounded-full"><Flame className="w-4 h-4 text-amber-400" /> تركيز اليوم <b className="font-head">{stats.today_min}د</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 rounded-full"><CalendarDays className="w-4 h-4 text-sky-300" /> هذا الأسبوع <b className="font-head">{stats.week_min}د</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 rounded-full"><History className="w-4 h-4 text-violet-300" /> جلسات <b className="font-head">{stats.sessions}</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 rounded-full"><Trophy className="w-4 h-4 text-amber-300" /> أفضل جلسة <b className="font-head">{stats.best_min}د</b></span>
              {(stats.live_min || 0) > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-400/10 ring-1 ring-emerald-300/25 text-emerald-200 px-3.5 py-2 rounded-full"><Activity className="w-4 h-4" /> مباشر الآن <b className="font-head">{stats.live_min}د</b></span>}
            </div>
          </div>
        )}

        <FocusLeaders />

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 mb-8">
          <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${selMood.dot} transition-all duration-500`} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم غرفة جديدة: مذاكرة الرياضيات"
              className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 transition" />
            <button onClick={create} className={`pressable inline-flex items-center justify-center gap-1.5 h-12 px-7 rounded-xl bg-gradient-to-l ${selMood.btn} shadow-lg text-white text-sm font-bold transition-all`} style={{ boxShadow: `0 12px 24px -10px ${selMood.glow}` }}><Plus className="w-4 h-4" /> افتح غرفة</button>
          </div>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} placeholder="موضوع الجلسة (اختياري): مراجعة الفصل الثالث"
            className="mt-3 w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 transition" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400"><Target className="w-4 h-4" /> هدف الجلسة</span>
            {GOALS.map((g) => (
              <button key={g} onClick={() => setGoalMin(g)} className={`pressable h-11 px-4 rounded-full text-xs font-bold transition-all ${goalMin === g ? `bg-gradient-to-l ${selMood.btn} text-white shadow-md` : "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:ring-slate-300"}`}>{g} دقيقة</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400"><Flame className="w-4 h-4" /> أجواء الغرفة</span>
            {Object.entries(MOODS).map(([k, mm]) => (
              <button key={k} onClick={() => setMood(k)} title={mm.label} aria-label={mm.label}
                className={`pressable w-11 h-11 rounded-full bg-gradient-to-br ${mm.dot} transition-all duration-300 ${mood === k ? "scale-110" : "opacity-75 hover:opacity-100 hover:scale-105"}`}
                style={mood === k ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4.5px ${mm.ring}, 0 10px 20px -8px ${mm.glow}` } : undefined} />
            ))}
            <span className="text-xs font-bold text-slate-500">{selMood.label}</span>
          </div>
        </div>

        {!rooms ? <PageLoader /> : rooms.length === 0 ? (
          <EmptyState icon={Timer} title="لا غرف مفتوحة الآن" desc="افتح أول غرفة تركيز وادعُ زملاءك" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r, ri) => {
              const m = moodOf(r);
              const members = r.members || [];
              const featured = (r.member_count || 0) > 0 && (r.member_count || 0) === maxCount;
              return (
                <div key={r.id} className="animate-fade-up group bg-slate-950 text-white rounded-[1.6rem] p-5 ft-shadow hover-lift relative overflow-hidden" style={{ animationDelay: `${Math.min(ri, 8) * 60}ms` }}>
                  <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${m.dot} z-10`} />
                  <div className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-50" style={{ background: `radial-gradient(320px 140px at 80% -40px, ${m.glow}, transparent), radial-gradient(240px 120px at 10% 120%, rgba(5,150,105,0.25), transparent)` }} />
                  <Timer className="pointer-events-none absolute -left-5 -bottom-6 w-28 h-28 text-white/[0.04] -rotate-12" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-300/20 px-2.5 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> مفتوحة</span>
                      <span className="inline-flex items-center gap-2">
                        {featured && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-gradient-to-l from-amber-500 to-rose-500 ring-1 ring-amber-300/40 px-2.5 py-1 rounded-full shadow-lg shadow-rose-900/30"><Flame className="w-3.5 h-3.5" /> الأكثر نشاطاً الآن</span>}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/60"><Users className="w-3.5 h-3.5" /> {r.member_count}</span>
                      </span>
                    </div>
                    {members.length > 0 ? (
                      <div className="flex items-center mt-4" dir="ltr">
                        {members.slice(0, 3).map((mm) => (
                          <span key={mm.user_id} className={`w-7 h-7 rounded-full bg-gradient-to-br ${m.dot} ring-2 ring-slate-950 -ml-1.5 first:ml-0 grid place-items-center text-[10px] font-black text-white`}>{mm.name?.[0] || "؟"}</span>
                        ))}
                        {(r.member_count || 0) > 3 && <span className="text-[10px] font-bold text-white/50 ml-1.5">+{r.member_count - 3}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center mt-4" dir="ltr">
                        {Array.from({ length: Math.min(6, r.member_count || 0) }).map((_, i) => (
                          <span key={i} className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${m.dot} ring-2 ring-slate-950 -ml-1 first:ml-0`} />
                        ))}
                        {(r.member_count || 0) > 6 && <span className="text-[10px] font-bold text-white/50 ml-1.5">+{r.member_count - 6}</span>}
                      </div>
                    )}
                    <h3 className="font-head font-extrabold text-lg mt-2.5 leading-snug">{r.name}</h3>
                    <p className="text-xs text-white/50 mt-1">المضيف: {r.host_name}</p>
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${m.soft}`}><span className={`w-2 h-2 rounded-full bg-gradient-to-br ${m.dot}`} /> {m.label}</span>
                      {r.topic && <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/75 bg-white/[0.08] ring-1 ring-white/10 px-2.5 py-1 rounded-full">{r.topic}</span>}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/75 bg-white/[0.08] ring-1 ring-white/10 px-2.5 py-1 rounded-full"><Target className="w-3 h-3" /> هدف {r.goal_min || 25}د</span>
                    </div>
                    <button onClick={() => enter(r.id)} className={`pressable mt-5 w-full h-11 rounded-xl bg-gradient-to-l ${m.btn} text-sm font-bold shadow-lg transition-all`} style={{ boxShadow: `0 12px 24px -10px ${m.glow}` }}>
                      {r.inside ? "العودة للغرفة" : "ادخل وابدأ التركيز"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
