import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Timer, Plus, LogOut, Users, Play, Pause, Flame, Headphones, Target, CalendarDays, Trophy, History, Activity, Check, Coffee, CloudRain, Waves, Wind, Volume2, VolumeX, Minus } from "lucide-react";

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
const POMO_FOCUS = 25 * 60, POMO_BREAK = 5 * 60, POMO_CYCLE = POMO_FOCUS + POMO_BREAK;

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
    <section className="animate-fade-up bg-white rounded-[1.6rem] lg:rounded-[2rem] border border-slate-100 ft-shadow p-5 sm:p-6 lg:p-7 xl:p-8 mb-6 lg:mb-8">
      <h3 className="font-head font-extrabold text-slate-800 lg:text-lg flex items-center gap-2.5 mb-4 lg:mb-5">
        <span className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-lg shadow-amber-200"><Trophy className="w-5 h-5 lg:w-6 lg:h-6" /></span>
        متصدرو التركيز هذا الأسبوع
        <span className="ft-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">غرف التركيز</span>
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 lg:gap-3">
        {items.slice(0, 6).map((m, i) => (
          <div key={m.user_id || i} className="flex items-center gap-3 rounded-2xl bg-slate-50/70 ring-1 ring-slate-100 px-3 py-2.5 lg:px-4 lg:py-3">
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

/* من يركّز الآن · live presence strip, refreshes every 30s, lobby only. */
const MOOD_CHIP_LIGHT = {
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  ocean: "bg-sky-50 text-sky-600 ring-sky-100",
  sunset: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-200",
};

function NowFocusing() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    const loadNow = () => api.get("/focus/now")
      .then((r) => { if (alive) setItems(Array.isArray(r.data?.items) ? r.data.items : []); })
      .catch(() => { if (alive) setItems([]); });
    loadNow();
    const iv = setInterval(loadNow, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  if (items === null) return null;
  return (
    <section data-testid="focus-now" className="animate-fade-up bg-white rounded-[1.6rem] lg:rounded-[2rem] border border-slate-100 ft-shadow p-5 sm:p-6 lg:p-7 xl:p-8 mb-6 lg:mb-8">
      <h3 className="font-head font-extrabold text-slate-800 lg:text-lg flex items-center gap-2.5 mb-4 lg:mb-5">
        <span className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white grid place-items-center shadow-lg shadow-emerald-200"><Users className="w-5 h-5 lg:w-6 lg:h-6" /><span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" /></span>
        من يركّز الآن
        {items.length > 0 && <span className="ft-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">{items.length} في جلسة</span>}
      </h3>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50/70 ring-1 ring-slate-100 px-4 py-4">
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white grid place-items-center shrink-0"><Flame className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-700">كن أول من يبدأ جلسة الآن</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">افتح غرفة تركيز من الأسفل وابدأ · حضورك سيظهر هنا للآخرين</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 lg:gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((p) => {
            const mm = moodOf(p);
            return (
              <span key={p.id} className="inline-flex items-center gap-2.5 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-50/80 ring-1 ring-slate-100 shrink-0">
                <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${mm.dot} text-white grid place-items-center text-xs font-black ring-2 ring-white shadow shrink-0`}>{(p.name || "؟").trim().charAt(0)}</span>
                <span className="text-xs lg:text-[13px] font-bold text-slate-700 whitespace-nowrap">{p.name || "طالب"}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap ${MOOD_CHIP_LIGHT[p.mood] || MOOD_CHIP_LIGHT.violet}`}>{mm.label}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-violet-600 whitespace-nowrap"><Timer className="w-3.5 h-3.5" />{Math.round(p.minutes || 0)}د</span>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* هدفي الأسبوعي · weekly goal ring + 7-day chart, lobby only, hides if endpoints missing. */
const DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
function dayLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : DAY_NAMES[d.getDay()];
}

function WeeklyGoal() {
  const [week, setWeek] = useState(null);
  const [goal, setGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/focus/my-week").then((r) => setWeek(r.data || null)).catch(() => setWeek(null));
    api.get("/focus/goal").then((r) => setGoal(typeof r.data?.weekly_minutes === "number" ? r.data.weekly_minutes : null)).catch(() => {});
  }, []);
  if (!week) return null;
  const minutes = week.minutes || 0;
  const goalVal = goal ?? (typeof week.goal === "number" ? week.goal : 0);
  const pct = goalVal > 0 ? Math.min(100, Math.round((minutes / goalVal) * 100)) : 0;
  const days = Array.isArray(week.days) ? week.days : [];
  const maxDay = Math.max(1, ...days.map((d) => d.minutes || 0));
  const nowD = new Date();
  const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;
  const change = async (delta) => {
    const base = goalVal > 0 ? goalVal : 300;
    const next = Math.min(1200, Math.max(60, base + delta));
    if (next === goalVal || saving) return;
    setGoal(next);
    setSaving(true);
    try {
      await api.put("/focus/goal", { weekly_minutes: next });
      toast.success("تم حفظ هدفك الأسبوعي 🎯");
    } catch (e) { /* التغيير انعكس محلياً · تُحفظ المحاولة القادمة */ }
    setSaving(false);
  };
  const R2 = 30, C2 = 2 * Math.PI * R2;
  return (
    <section data-testid="focus-weekly-goal" className="animate-fade-up bg-white rounded-[1.6rem] lg:rounded-[2rem] border border-slate-100 ft-shadow p-5 sm:p-6 lg:p-7 xl:p-8 mb-6 lg:mb-8">
      <h3 className="font-head font-extrabold text-slate-800 lg:text-lg flex items-center gap-2.5 mb-5 lg:mb-6">
        <span className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white grid place-items-center shadow-lg shadow-violet-200"><Target className="w-5 h-5 lg:w-6 lg:h-6" /></span>
        هدفي الأسبوعي
        <span className="ft-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">أسبوعي</span>
      </h3>
      <div className="grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-10 items-center">
        <div className="flex items-center gap-4 lg:gap-5">
          <div className="relative w-20 h-20 lg:w-24 lg:h-24 shrink-0">
            <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
              <circle cx="36" cy="36" r={R2} fill="none" strokeWidth="7" className="stroke-slate-100" />
              <circle cx="36" cy="36" r={R2} fill="none" strokeWidth="7" strokeLinecap="round" stroke="#8b5cf6" className="transition-all duration-700" strokeDasharray={C2} strokeDashoffset={C2 * (1 - pct / 100)} />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-head text-lg lg:text-xl font-black text-slate-800" dir="ltr">{pct}%</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm lg:text-base font-extrabold text-slate-800">أنجزت <b className="font-head">{minutes}د</b> {goalVal > 0 ? <>من <b className="font-head">{goalVal}د</b></> : "هذا الأسبوع"}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">{pct >= 100 ? "أحسنت · بلغت هدف الأسبوع 🎉" : goalVal > 0 ? `يتبقّى ${Math.max(0, goalVal - minutes)}د لبلوغ هدفك` : "حدّد هدفك الأسبوعي وابدأ التقدّم"}</p>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => change(-60)} disabled={saving || goalVal <= 60} data-testid="weekly-goal-minus" aria-label="إنقاص الهدف" className="pressable w-10 h-10 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-500 grid place-items-center disabled:opacity-40 min-h-[44px]"><Minus className="w-4 h-4" /></button>
              <span className="text-xs lg:text-[13px] font-extrabold text-slate-600 whitespace-nowrap">{goalVal > 0 ? `${goalVal} دقيقة أسبوعياً` : "بلا هدف بعد"}</span>
              <button onClick={() => change(60)} disabled={saving || goalVal >= 1200} data-testid="weekly-goal-plus" aria-label="زيادة الهدف" className="pressable w-10 h-10 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200 grid place-items-center disabled:opacity-40 min-h-[44px]"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        {days.length > 0 && (
          <div>
            <div className="flex items-end gap-1.5 sm:gap-2 lg:gap-2.5">
              {days.map((d, i) => {
                const min = d.minutes || 0;
                const h = Math.max(min > 0 ? 10 : 4, Math.round((min / maxDay) * 100));
                const isToday = d.date === todayStr;
                return (
                  <div key={d.date || i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={`${min} دقيقة`}>
                    <span className={`text-[10px] lg:text-[11px] font-extrabold h-4 ${min > 0 ? "text-violet-600" : "text-transparent"}`}>{min}</span>
                    <div className="w-full h-20 lg:h-24 flex items-end rounded-t-xl">
                      <div className={`w-full rounded-t-lg transition-all duration-700 ${isToday ? "bg-gradient-to-t from-violet-600 to-indigo-400 shadow-md shadow-violet-200" : "bg-gradient-to-t from-violet-300/60 to-indigo-300/50"}`} style={{ height: `${h}%` }} />
                    </div>
                    <span className={`text-[10px] lg:text-[11px] font-bold ${isToday ? "text-violet-700" : "text-slate-400"}`}>{dayLabel(d.date)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] font-bold text-slate-300 mt-2">دقائق التركيز في كل يوم من هذا الأسبوع</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* أصوات أجواء · generated live with WebAudio, no audio files, stops on unmount. */
function noiseBuffer(ctx, brown) {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; ch[i] = last * 3.5; }
    else ch[i] = w;
  }
  return buf;
}

const SOUNDS = [
  { key: "rain", label: "مطر", icon: CloudRain },
  { key: "white", label: "ضجيج أبيض", icon: Waves },
  { key: "brown", label: "ضجيج بنّي", icon: Wind },
  { key: "cafe", label: "أجواء مقهى", icon: Coffee },
];

function AmbientSounds() {
  const [sel, setSel] = useState(() => { try { return localStorage.getItem("ft-ambient-sound") || ""; } catch (e) { return ""; } });
  const [volume, setVolume] = useState(() => { const v = parseFloat(localStorage.getItem("ft-ambient-volume")); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5; });
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const gainRef = useRef(null);
  const volumeRef = useRef(volume);

  const stop = () => {
    const n = nodesRef.current;
    if (n) n.forEach((s) => { try { s.stop(); } catch (e) {} });
    nodesRef.current = null;
    gainRef.current = null;
    if (ctxRef.current) { const c = ctxRef.current; ctxRef.current = null; c.close().catch(() => {}); }
  };

  const start = (kind) => {
    stop();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast.error("متصفحك لا يدعم أصوات الأجواء"); return false; }
    const ctx = new AC();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = volumeRef.current;
    master.connect(ctx.destination);
    gainRef.current = master;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, kind === "brown");
    src.loop = true;
    const stoppables = [src];
    if (kind === "rain") {
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 320;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = 0.4;
      src.connect(hp); hp.connect(lp); lp.connect(master);
    } else if (kind === "cafe") {
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 480; bp.Q.value = 0.5;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
      const swell = ctx.createGain(); swell.gain.value = 0.8;
      const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.12;
      const depth = ctx.createGain(); depth.gain.value = 0.22;
      lfo.connect(depth); depth.connect(swell.gain);
      lfo.start();
      stoppables.push(lfo);
      src.connect(bp); bp.connect(lp); lp.connect(swell); swell.connect(master);
    } else {
      src.connect(master);
    }
    src.start();
    nodesRef.current = stoppables;
    return true;
  };

  const toggle = (key) => {
    if (playing && sel === key) { stop(); setPlaying(false); return; }
    setSel(key);
    setPlaying(start(key));
  };

  useEffect(() => { try { localStorage.setItem("ft-ambient-sound", sel || ""); } catch (e) {} }, [sel]);
  useEffect(() => {
    volumeRef.current = volume;
    try { localStorage.setItem("ft-ambient-volume", String(volume)); } catch (e) {}
    if (gainRef.current && ctxRef.current) gainRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.05);
  }, [volume]);
  useEffect(() => () => stop(), []);

  const selLabel = SOUNDS.find((s) => s.key === sel)?.label;
  return (
    <div className="relative mt-6 lg:mt-7 flex flex-col items-center gap-3" data-testid="ambient-sounds">
      <span className="inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-white/50"><Headphones className="w-3.5 h-3.5" /> أصوات أجواء ترافق تركيزك</span>
      <div className="flex flex-wrap justify-center gap-2">
        {SOUNDS.map(({ key, label, icon: Icon }) => {
          const active = playing && sel === key;
          const remembered = !playing && sel === key;
          return (
            <button key={key} onClick={() => toggle(key)} data-testid={`ambient-sound-${key}`} aria-pressed={active}
              className={`pressable inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-full text-xs lg:text-[13px] font-bold ring-1 transition-colors ${active ? "bg-white/20 ring-white/40 text-white" : remembered ? "bg-white/10 ring-violet-300/50 text-violet-100" : "bg-white/[0.07] ring-white/10 text-white/70 hover:bg-white/[0.12]"}`}>
              <Icon className="w-4 h-4" /> {label}
              {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />}
            </button>
          );
        })}
      </div>
      {sel && (
        <label className="inline-flex items-center gap-2.5 text-white/60">
          {volume > 0 ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} dir="ltr" data-testid="ambient-volume" aria-label="مستوى الصوت" className="w-32 lg:w-40 accent-violet-400 cursor-pointer" />
          <span className="text-[11px] font-bold text-white/40">{playing ? `يُشغَّل الآن · ${selLabel}` : `محفوظ · ${selLabel} · اضغط للتشغيل`}</span>
        </label>
      )}
    </div>
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
  const [pomodoro, setPomodoro] = useState(false);
  const [pomoSec, setPomoSec] = useState(0);
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

  // pomodoro: independent 25/5 cycle clock, local state only (never touches heartbeat)
  useEffect(() => {
    if (!pomodoro || !ticking) return;
    const iv = setInterval(() => setPomoSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [pomodoro, ticking]);
  useEffect(() => { if (!room) { setPomodoro(false); setPomoSec(0); } }, [room]);
  const prevPomoPhase = useRef(null);
  useEffect(() => {
    if (!pomodoro) { prevPomoPhase.current = null; return; }
    const ph = (pomoSec % POMO_CYCLE) < POMO_FOCUS ? "focus" : "break";
    if (prevPomoPhase.current && prevPomoPhase.current !== ph) {
      if (ph === "break") toast("موعد استراحة ☕ · خمس دقائق لتلتقط أنفاسك");
      else toast("انتهت الاستراحة · عودة للتركيز 🎯");
    }
    prevPomoPhase.current = ph;
  }, [pomoSec, pomodoro]);

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
    const pomoPos = pomoSec % POMO_CYCLE;
    const pomoPhase = pomoPos < POMO_FOCUS ? "focus" : "break";
    const pomoLeft = (pomoPhase === "focus" ? POMO_FOCUS : POMO_CYCLE) - pomoPos;
    const pomoCycles = Math.floor(pomoSec / POMO_CYCLE);
    const pomoPct = Math.round(((pomoPhase === "focus" ? pomoPos : pomoPos - POMO_FOCUS) / (pomoPhase === "focus" ? POMO_FOCUS : POMO_BREAK)) * 100);
    const roomGoalSec = (room.goal_min || 25) * 60;
    const ringPct = Math.min(100, (seconds / roomGoalSec) * 100);
    const R = 124, CIRC = 2 * Math.PI * R;
    return (
      <Layout>
        <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 lg:py-10 xl:py-12">
          <div className={`animate-scale-in relative overflow-hidden rounded-[2rem] bg-slate-950 grain text-white px-5 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-14 xl:px-16 xl:py-16 text-center ft-shadow-lg ${pomodoro && pomoPhase === "break" ? "ring-2 ring-emerald-300/50" : ""}`}>
            <span className="absolute inset-x-0 top-0 h-1 z-10" style={{ background: `linear-gradient(to left, transparent, ${m.ring}, transparent)` }} />
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(600px 260px at 50% -60px, ${m.glow}, transparent)` }} />
            <div className={`pointer-events-none absolute left-1/2 top-44 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl ${ticking ? "animate-pulse-soft" : ""}`} style={{ background: m.glow, opacity: 0.35 }} />
            <Headphones className="pointer-events-none absolute -right-8 -top-6 w-40 h-40 text-white/[0.04] rotate-12" />
            <Timer className="pointer-events-none absolute -left-8 -bottom-8 w-40 h-40 text-white/[0.04] -rotate-12" />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 lg:text-[13px] rounded-full bg-white/10 ring-1 ring-white/15 text-xs font-bold backdrop-blur-sm min-h-[36px]"><span className={`w-2 h-2 rounded-full ${ticking ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} /> داخل الغرفة الآن</span>
            <h1 className="relative font-head text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold mt-4 lg:mt-5">{room.name}</h1>
            <div className="relative flex justify-center gap-2 lg:gap-2.5 mt-4 lg:mt-5 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 lg:text-xs rounded-full ring-1 text-[11px] font-bold ${m.soft}`}><span className={`w-2 h-2 rounded-full bg-gradient-to-br ${m.dot}`} /> {m.label}</span>
              {room.topic && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 lg:text-xs rounded-full bg-white/10 ring-1 ring-white/15 text-[11px] font-bold">{room.topic}</span>}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 lg:text-xs rounded-full ring-1 text-[11px] font-bold ${goalReached ? "bg-emerald-500/25 ring-emerald-300/50 text-emerald-100" : "bg-white/10 ring-white/15"}`}><Target className="w-3.5 h-3.5" /> هدف {room.goal_min || 25}د{goalReached && <Check className="w-3.5 h-3.5 text-emerald-300" />}</span>
            </div>
            <div className="relative w-[248px] h-[248px] sm:w-[288px] sm:h-[288px] lg:w-[320px] lg:h-[320px] xl:w-[360px] xl:h-[360px] mx-auto mt-8 lg:mt-10">
              <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90">
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" className="stroke-white/[0.07]" />
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" strokeLinecap="round" stroke={goalReached ? "#34d399" : m.ring} className="transition-all duration-1000" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ringPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                <div className={`font-mono text-6xl sm:text-7xl lg:text-7xl xl:text-8xl font-black tabular-nums tracking-tight leading-none ${pomodoro && pomoPhase === "break" ? "text-emerald-300" : ""}`} dir="ltr">{fmt(seconds)}</div>
                <div className="text-white/40 text-[11px] lg:text-xs font-bold mt-3">{pomodoro && pomoPhase === "break" ? "موعد استراحة · أرح عينيك وابتعد عن الشاشة" : ticking ? "الجلسة جارية · ركّز" : "متوقفة مؤقتاً"}</div>
              </div>
            </div>
            <p className="relative text-white/50 text-sm lg:text-base mt-6 lg:mt-7 max-w-md lg:max-w-lg xl:max-w-xl mx-auto leading-relaxed">دقائقك المحفوظة: {Math.round((me?.focus_min || 0) + seconds / 60)} · الجلسة من 10 دقائق فأكثر تمنح نقاطاً (حتى 30) · هدف الجلسة {room.goal_min || 25}د</p>
            <div className="relative flex justify-center gap-3 lg:gap-4 mt-7 lg:mt-8 flex-wrap">
              <button onClick={() => setTicking((t) => !t)} className={`pressable inline-flex items-center justify-center gap-2 h-12 lg:h-[52px] px-7 lg:px-9 lg:text-base rounded-2xl bg-gradient-to-l ${m.btn} shadow-lg font-bold min-w-[160px] lg:min-w-[180px] min-h-[44px]`} style={{ boxShadow: `0 12px 28px -10px ${m.glow}` }}>
                {ticking ? <><Pause className="w-5 h-5" /> إيقاف مؤقت</> : <><Play className="w-5 h-5" /> استئناف</>}
              </button>
              <button onClick={leave} className="pressable inline-flex items-center justify-center gap-2 h-12 lg:h-[52px] px-7 lg:px-9 lg:text-base rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 font-bold min-w-[160px] lg:min-w-[180px] min-h-[44px]">
                <LogOut className="w-5 h-5" /> إنهاء الجلسة
              </button>
            </div>
            <div className="relative mt-6 lg:mt-7 flex flex-col items-center gap-3">
              <button
                onClick={() => { setPomodoro((v) => !v); setPomoSec(0); }}
                aria-pressed={pomodoro}
                data-testid="focus-pomodoro-toggle"
                className={`pressable inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full text-xs lg:text-sm font-bold ring-1 transition-colors ${pomodoro ? "bg-amber-400/20 ring-amber-300/50 text-amber-100" : "bg-white/10 ring-white/15 text-white/80 hover:bg-white/15"}`}
              >
                <Timer className="w-4 h-4" /> وضع بومودورو · {pomodoro ? "مفعّل" : "معطّل"}
              </button>
              {pomodoro && (
                <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-bold ring-1 backdrop-blur-sm ${pomoPhase === "break" ? "bg-emerald-400/20 ring-emerald-300/50 text-emerald-100" : "bg-white/10 ring-white/15 text-white"}`}>
                  {pomoPhase === "break" ? <Coffee className="w-4 h-4 shrink-0" /> : <Flame className="w-4 h-4 shrink-0 text-amber-300" />}
                  <span>{pomoPhase === "break" ? "موعد استراحة" : "جولة تركيز"}</span>
                  <span className="font-mono tabular-nums" dir="ltr">{fmt(pomoLeft)}</span>
                  <span className="w-16 h-1.5 rounded-full bg-white/15 overflow-hidden shrink-0">
                    <span className={`block h-full rounded-full transition-all duration-1000 ${pomoPhase === "break" ? "bg-emerald-300" : "bg-amber-300"}`} style={{ width: `${pomoPct}%` }} />
                  </span>
                  <span className="text-white/50 text-[11px] font-bold">الدورة {pomoCycles + 1} · {pomoCycles} مكتملة</span>
                </div>
              )}
            </div>
            <AmbientSounds />
            <div className="relative flex justify-center gap-2 lg:gap-2.5 mt-9 lg:mt-10 flex-wrap">
              {(room.members || []).map((mm) => (
                <span key={mm.user_id} className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 lg:pl-4 lg:pr-2 lg:py-2 lg:text-[13px] rounded-full text-xs font-bold backdrop-blur-sm ring-1 ${mm.user_id === user?.id ? `${m.soft}` : "bg-white/10 ring-white/10"}`}>
                  <span className={`w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br ${m.dot} grid place-items-center text-[10px] lg:text-[11px] font-black text-white shrink-0`}>{mm.name?.[0] || "؟"}</span>
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
      <div className="max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 lg:py-10 xl:py-12">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] bg-slate-950 grain px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-14 xl:px-16 xl:py-16 mb-8 lg:mb-10 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-28 left-1/3 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-10 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <Timer className="pointer-events-none absolute -left-8 -bottom-10 w-52 h-52 text-white/[0.05] -rotate-12" />
          <Headphones className="pointer-events-none absolute left-8 top-8 w-12 h-12 text-violet-300/25 animate-float hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 lg:text-[13px] rounded-full bg-white/10 ring-1 ring-white/15 text-white text-xs font-bold backdrop-blur-sm min-h-[36px]"><Timer className="w-3.5 h-3.5" /> ذاكروا معاً بصمت</span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold text-white mt-4 leading-tight">غرف <span className="animate-gradient-text bg-gradient-to-l from-violet-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">التركيز</span></h1>
            <p className="text-white/60 text-sm sm:text-base lg:text-lg mt-3 max-w-xl lg:max-w-2xl xl:max-w-3xl leading-relaxed">افتح غرفة أو ادخل واحدة، شغّل المؤقّت واقرأ أو ذاكر · كل 10 دقائق تركيز فأكثر تمنحك نقاط خبرة.</p>
          </div>
        </div>

        <NowFocusing />

        {stats && (
          <div className="animate-fade-up relative overflow-hidden rounded-[1.6rem] lg:rounded-[2rem] bg-slate-950 grain text-white px-5 py-4 lg:px-7 lg:py-6 mb-6 lg:mb-8 ft-shadow">
            <div className="pointer-events-none absolute -top-20 right-1/4 w-64 h-64 rounded-full bg-violet-600/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-2 lg:grid lg:grid-cols-5 lg:gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl min-h-[44px]"><Flame className="w-4 h-4 lg:w-5 lg:h-5 text-amber-400" /> تركيز اليوم <b className="font-head">{stats.today_min}د</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl min-h-[44px]"><CalendarDays className="w-4 h-4 lg:w-5 lg:h-5 text-sky-300" /> هذا الأسبوع <b className="font-head">{stats.week_min}د</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl min-h-[44px]"><History className="w-4 h-4 lg:w-5 lg:h-5 text-violet-300" /> جلسات <b className="font-head">{stats.sessions}</b></span>
              <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold bg-white/[0.07] ring-1 ring-white/10 px-3.5 py-2 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl min-h-[44px]"><Trophy className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300" /> أفضل جلسة <b className="font-head">{stats.best_min}د</b></span>
              {(stats.live_min || 0) > 0 && <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold bg-emerald-400/10 ring-1 ring-emerald-300/25 text-emerald-200 px-3.5 py-2 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl min-h-[44px]"><Activity className="w-4 h-4 lg:w-5 lg:h-5" /> مباشر الآن <b className="font-head">{stats.live_min}د</b></span>}
            </div>
          </div>
        )}

        <WeeklyGoal />

        {rooms && rooms.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 gap-5 xl:gap-6 mb-6 lg:mb-8">
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 grid place-items-center shrink-0"><Timer className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{rooms.length}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">غرفة مفتوحة الآن</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Users className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{rooms.reduce((s, r) => s + (r.member_count || 0), 0)}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">مشارك داخل الغرف</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Flame className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{maxCount}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">في أكثر غرفة نشاطاً</div>
              </div>
            </div>
          </div>
        )}

        <FocusLeaders />

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 lg:p-7 xl:p-8 mb-8 lg:mb-10">
          <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${selMood.dot} transition-all duration-500`} />
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم غرفة جديدة: مذاكرة الرياضيات"
              className="flex-1 h-12 lg:h-[52px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm lg:text-[15px] outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 transition min-h-[44px]" />
            <button onClick={create} className={`pressable inline-flex items-center justify-center gap-1.5 h-12 lg:h-[52px] px-7 lg:px-9 rounded-xl bg-gradient-to-l ${selMood.btn} shadow-lg text-white text-sm lg:text-base font-bold transition-all min-h-[44px]`} style={{ boxShadow: `0 12px 24px -10px ${selMood.glow}` }}><Plus className="w-4 h-4" /> افتح غرفة</button>
          </div>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={80} placeholder="موضوع الجلسة (اختياري): مراجعة الفصل الثالث"
            className="mt-3 w-full h-12 lg:h-[52px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm lg:text-[15px] outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 transition min-h-[44px]" />
          <div className="mt-4 lg:mt-5 flex flex-wrap items-center gap-2 lg:gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold text-slate-400"><Target className="w-4 h-4" /> هدف الجلسة</span>
            {GOALS.map((g) => (
              <button key={g} onClick={() => setGoalMin(g)} className={`pressable h-11 lg:h-12 px-4 lg:px-5 rounded-full text-xs lg:text-[13px] font-bold transition-all min-h-[44px] ${goalMin === g ? `bg-gradient-to-l ${selMood.btn} text-white shadow-md` : "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:ring-slate-300"}`}>{g} دقيقة</button>
            ))}
          </div>
          <div className="mt-4 lg:mt-5 flex flex-wrap items-center gap-2.5 lg:gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs lg:text-[13px] font-bold text-slate-400"><Flame className="w-4 h-4" /> أجواء الغرفة</span>
            {Object.entries(MOODS).map(([k, mm]) => (
              <button key={k} onClick={() => setMood(k)} title={mm.label} aria-label={mm.label}
                className={`pressable w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br ${mm.dot} transition-all duration-300 ${mood === k ? "scale-110" : "opacity-75 hover:opacity-100 hover:scale-105"}`}
                style={mood === k ? { boxShadow: `0 0 0 2px #fff, 0 0 0 4.5px ${mm.ring}, 0 10px 20px -8px ${mm.glow}` } : undefined} />
            ))}
            <span className="text-xs font-bold text-slate-500">{selMood.label}</span>
          </div>
        </div>

        {!rooms ? <PageLoader /> : rooms.length === 0 ? (
          <EmptyState icon={Timer} title="لا غرف مفتوحة الآن" desc="افتح أول غرفة تركيز وادعُ زملاءك" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 lg:gap-5 xl:gap-6">
            {rooms.map((r, ri) => {
              const m = moodOf(r);
              const members = r.members || [];
              const featured = (r.member_count || 0) > 0 && (r.member_count || 0) === maxCount;
              return (
                <div key={r.id} className="animate-fade-up group bg-slate-950 text-white rounded-[1.6rem] lg:rounded-[1.9rem] p-5 lg:p-6 xl:p-7 ft-shadow hover-lift relative overflow-hidden" style={{ animationDelay: `${Math.min(ri, 8) * 60}ms` }}>
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
                      <div className="flex items-center mt-4 lg:mt-5" dir="ltr">
                        {members.slice(0, 3).map((mm) => (
                          <span key={mm.user_id} className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br ${m.dot} ring-2 ring-slate-950 -ml-1.5 first:ml-0 grid place-items-center text-[10px] lg:text-[11px] font-black text-white`}>{mm.name?.[0] || "؟"}</span>
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
                    <h3 className="font-head font-extrabold text-lg lg:text-xl xl:text-[1.35rem] mt-2.5 lg:mt-3 leading-snug">{r.name}</h3>
                    <p className="text-xs lg:text-[13px] text-white/50 mt-1">المضيف: {r.host_name}</p>
                    <div className="flex items-center gap-1.5 lg:gap-2 mt-3 lg:mt-3.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-bold px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full ring-1 ${m.soft}`}><span className={`w-2 h-2 rounded-full bg-gradient-to-br ${m.dot}`} /> {m.label}</span>
                      {r.topic && <span className="inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-white/75 bg-white/[0.08] ring-1 ring-white/10 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full">{r.topic}</span>}
                      <span className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-bold text-white/75 bg-white/[0.08] ring-1 ring-white/10 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full"><Target className="w-3 h-3" /> هدف {r.goal_min || 25}د</span>
                    </div>
                    <button onClick={() => enter(r.id)} className={`pressable mt-5 lg:mt-6 w-full h-11 lg:h-12 lg:text-[15px] rounded-xl bg-gradient-to-l ${m.btn} text-sm font-bold shadow-lg transition-all min-h-[44px]`} style={{ boxShadow: `0 12px 24px -10px ${m.glow}` }}>
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
