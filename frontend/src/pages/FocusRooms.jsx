import React, { useEffect, useRef, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Timer, Plus, LogOut, Users, Play, Pause, Flame } from "lucide-react";

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
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-scale-in relative overflow-hidden rounded-[2rem] bg-slate-950 text-white px-6 py-10 sm:px-12 text-center ft-shadow">
            <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(600px 240px at 50% -60px, #05966955, transparent)" }} />
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> داخل الغرفة الآن</span>
            <h1 className="relative font-head text-2xl sm:text-3xl font-extrabold mt-4">{room.name}</h1>
            <div className="relative font-head text-7xl sm:text-8xl font-black tabular-nums tracking-tight mt-6" dir="ltr">{fmt(seconds)}</div>
            <p className="relative text-white/50 text-sm mt-2">دقائقك المحفوظة: {Math.round((me?.focus_min || 0) + seconds / 60)} · الجلسة من 10 دقائق فأكثر تمنح نقاطاً (حتى 30)</p>
            <div className="relative flex justify-center gap-3 mt-7 flex-wrap">
              <button onClick={() => setTicking((t) => !t)} className="pressable inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold">
                {ticking ? <><Pause className="w-5 h-5" /> إيقاف مؤقت</> : <><Play className="w-5 h-5" /> استئناف</>}
              </button>
              <button onClick={leave} className="pressable inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold">
                <LogOut className="w-5 h-5" /> إنهاء الجلسة
              </button>
            </div>
            <div className="relative flex justify-center gap-2 mt-8 flex-wrap">
              {(room.members || []).map((m) => (
                <span key={m.user_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {m.name} · {Math.round(m.focus_min)}د
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
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 sm:px-10 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold"><Timer className="w-3.5 h-3.5" /> ذاكروا معاً بصمت</span>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-4">غرف التركيز</h1>
          <p className="text-white/60 text-sm sm:text-base mt-2 max-w-xl">افتح غرفة أو ادخل واحدة، شغّل المؤقّت واقرأ أو ذاكر · كل 10 دقائق تركيز فأكثر تمنحك نقاط خبرة.</p>
          <Timer className="absolute -left-6 -bottom-8 w-44 h-44 text-white/5" />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 flex flex-col sm:flex-row gap-3 mb-8">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم غرفة جديدة: مذاكرة الرياضيات"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" />
          <button onClick={create} className="pressable inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold"><Plus className="w-4 h-4" /> افتح غرفة</button>
        </div>

        {!rooms ? <PageLoader /> : rooms.length === 0 ? (
          <EmptyState icon={Timer} title="لا غرف مفتوحة الآن" desc="افتح أول غرفة تركيز وادعُ زملاءك" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="animate-fade-up bg-slate-950 text-white rounded-[1.6rem] p-5 ft-shadow relative overflow-hidden">
                <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(300px 120px at 80% -40px, #05966966, transparent)" }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> مفتوحة</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/60"><Users className="w-3.5 h-3.5" /> {r.member_count}</span>
                  </div>
                  <h3 className="font-head font-extrabold text-lg mt-3">{r.name}</h3>
                  <p className="text-xs text-white/50 mt-1">المضيف: {r.host_name}</p>
                  <button onClick={() => enter(r.id)} className="pressable mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold">
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
