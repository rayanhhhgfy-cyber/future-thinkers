import React, { useEffect, useRef, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Timer, Plus, LogOut, Users, Play, Pause, Flame, Headphones } from "lucide-react";

function fmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function FocusRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [ticking, setTicking] = useState(false);
  const pendingMin = useRef(0);
  const load = () => api.get("/focus/rooms").then((r) => setRooms(r.data)).catch(() => setRooms([]));
  useEffect(() => { load(); }, []);

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

  const create = async () => {
    if (name.trim().length < 2) return toast.error("اسم الغرفة قصير");
    try {
      const { data } = await api.post("/focus/rooms", { name: name.trim() });
      setName("");
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
    const ringPct = Math.min(100, (seconds / 1800) * 100);
    const R = 124, CIRC = 2 * Math.PI * R;
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-scale-in relative overflow-hidden rounded-[2rem] bg-slate-950 grain text-white px-5 py-9 sm:px-10 sm:py-11 text-center ft-shadow-lg">
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: "radial-gradient(600px 260px at 50% -60px, #7c3aed44, transparent)" }} />
            <div className={`pointer-events-none absolute left-1/2 top-44 -translate-x-1/2 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl ${ticking ? "animate-pulse-soft" : ""}`} />
            <Headphones className="pointer-events-none absolute -right-8 -top-6 w-40 h-40 text-white/[0.04] rotate-12" />
            <Timer className="pointer-events-none absolute -left-8 -bottom-8 w-40 h-40 text-white/[0.04] -rotate-12" />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-xs font-bold backdrop-blur-sm"><span className={`w-2 h-2 rounded-full ${ticking ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} /> داخل الغرفة الآن</span>
            <h1 className="relative font-head text-2xl sm:text-3xl font-extrabold mt-4">{room.name}</h1>
            <div className="relative w-[248px] h-[248px] sm:w-[288px] sm:h-[288px] mx-auto mt-8">
              <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90">
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" className="stroke-white/[0.07]" />
                <circle cx="140" cy="140" r={R} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-violet-400 transition-all duration-1000" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - ringPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                <div className="font-mono text-6xl sm:text-7xl font-black tabular-nums tracking-tight leading-none" dir="ltr">{fmt(seconds)}</div>
                <div className="text-white/40 text-[11px] font-bold mt-3">{ticking ? "الجلسة جارية · ركّز" : "متوقفة مؤقتاً"}</div>
              </div>
            </div>
            <p className="relative text-white/50 text-sm mt-6 max-w-md mx-auto leading-relaxed">دقائقك المحفوظة: {Math.round((me?.focus_min || 0) + seconds / 60)} · الجلسة من 10 دقائق فأكثر تمنح نقاطاً (حتى 30)</p>
            <div className="relative flex justify-center gap-3 mt-7 flex-wrap">
              <button onClick={() => setTicking((t) => !t)} className="pressable inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/30 font-bold min-w-[160px]">
                {ticking ? <><Pause className="w-5 h-5" /> إيقاف مؤقت</> : <><Play className="w-5 h-5" /> استئناف</>}
              </button>
              <button onClick={leave} className="pressable inline-flex items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/15 font-bold min-w-[160px]">
                <LogOut className="w-5 h-5" /> إنهاء الجلسة
              </button>
            </div>
            <div className="relative flex justify-center gap-2 mt-9 flex-wrap">
              {(room.members || []).map((m) => (
                <span key={m.user_id} className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm ${m.user_id === user?.id ? "bg-violet-500/25 ring-1 ring-violet-300/40 text-white" : "bg-white/10 ring-1 ring-white/10"}`}>
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 grid place-items-center text-[10px] font-black text-white shrink-0">{m.name?.[0] || "؟"}</span>
                  {m.name} · {Math.round(m.focus_min)}د
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 flex flex-col sm:flex-row gap-3 mb-8">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-violet-500 via-indigo-400 to-slate-800" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم غرفة جديدة: مذاكرة الرياضيات"
            className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100 transition" />
          <button onClick={create} className="pressable inline-flex items-center justify-center gap-1.5 h-12 px-7 rounded-xl bg-gradient-to-l from-slate-900 to-violet-950 hover:from-violet-700 hover:to-indigo-800 shadow-lg shadow-slate-900/20 text-white text-sm font-bold transition-colors"><Plus className="w-4 h-4" /> افتح غرفة</button>
        </div>

        {!rooms ? <PageLoader /> : rooms.length === 0 ? (
          <EmptyState icon={Timer} title="لا غرف مفتوحة الآن" desc="افتح أول غرفة تركيز وادعُ زملاءك" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r, ri) => (
              <div key={r.id} className="animate-fade-up group bg-slate-950 text-white rounded-[1.6rem] p-5 ft-shadow hover-lift relative overflow-hidden" style={{ animationDelay: `${Math.min(ri, 8) * 60}ms` }}>
                <div className="absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-50" style={{ background: "radial-gradient(320px 140px at 80% -40px, #7c3aed55, transparent), radial-gradient(240px 120px at 10% 120%, #05966933, transparent)" }} />
                <Timer className="pointer-events-none absolute -left-5 -bottom-6 w-28 h-28 text-white/[0.04] -rotate-12" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-400/10 ring-1 ring-emerald-300/20 px-2.5 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> مفتوحة</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/60"><Users className="w-3.5 h-3.5" /> {r.member_count}</span>
                  </div>
                  <div className="flex items-center mt-4" dir="ltr">
                    {Array.from({ length: Math.min(6, r.member_count || 0) }).map((_, i) => (
                      <span key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 ring-2 ring-slate-950 -ml-1 first:ml-0" />
                    ))}
                    {(r.member_count || 0) > 6 && <span className="text-[10px] font-bold text-white/50 ml-1.5">+{r.member_count - 6}</span>}
                  </div>
                  <h3 className="font-head font-extrabold text-lg mt-2.5 leading-snug">{r.name}</h3>
                  <p className="text-xs text-white/50 mt-1">المضيف: {r.host_name}</p>
                  <button onClick={() => enter(r.id)} className="pressable mt-5 w-full h-11 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold shadow-lg shadow-violet-900/40 transition-colors">
                    {r.inside ? "العودة للغرفة" : "ادخل وابدأ التركيز"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
