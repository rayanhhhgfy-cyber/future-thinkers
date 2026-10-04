import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { FadeUp, Stagger, Item, EASE } from "@/components/anim";
import {
  Compass, BookOpen, Calculator, Keyboard, BookMarked, Flame, Zap, Library,
  CheckCircle2, Lock, Gift, Sparkles, Target,
} from "lucide-react";
import { toast } from "sonner";

const ICONS = { BookOpen, Calculator, Keyboard, BookMarked, Flame, Zap, Library };

export default function Missions() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/games/missions/week");
      setData(data);
    } catch { setData({ missions: [] }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Layout><PageLoader /></Layout>;
  const missions = data.missions || [];
  const doneCount = missions.filter((m) => m.done).length;
  const pct = missions.length ? Math.round((doneCount / missions.length) * 100) : 0;

  const claim = async (key) => {
    setBusy(key);
    try {
      const { data: d } = await api.post("/games/missions/claim", { mission: key });
      toast.success(`استلمت +${d.xp_awarded} XP 🎉`);
      load();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(""); }
  };

  return (
    <Layout>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 xl:py-10 space-y-6">
        <FadeUp>
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl animate-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <Compass className="w-3.5 h-3.5 text-amber-300" /> أسبوع {data.week} · تتجدد كل اثنين
                </span>
                <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black mt-3">مهمات الأسبوع</h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  سبع مهمات موزعة على القراءة والألعاب · كل مهمة تمنحك XP عند استلامها، وإكمال السبع كلها يفتح <span className="text-amber-300 font-black">صندوق الكنز +{data.chest_xp} XP</span>
                </p>
              </div>
              <div className="shrink-0 text-center px-6 py-4 rounded-3xl bg-white/10 ring-1 ring-white/10 min-w-[170px]">
                <div className="relative mx-auto w-20 h-20">
                  <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
                    <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 34}
                      initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100) }}
                      transition={{ duration: 0.9, ease: EASE }} />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center font-head font-black text-lg">{doneCount}/7</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1.5">مهمات منجزة</p>
              </div>
            </div>
          </div>
        </FadeUp>

        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {missions.map((m) => {
            const Icon = ICONS[m.icon] || Target;
            const p = Math.min(100, Math.round((m.progress / m.target) * 100));
            return (
              <Item key={m.key}>
                <div className={`relative overflow-hidden rounded-3xl bg-white ring-1 p-5 ft-shadow transition hover:-translate-y-1 hover:shadow-xl ${m.done ? "ring-emerald-200" : "ring-slate-200/70"}`} data-testid="mission-card">
                  {m.done && (
                    <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}
                      className="absolute top-4 left-4 w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg shadow-emerald-500/40">
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${m.done ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-head font-black">{m.title}</p>
                      <p className="text-[11px] font-black text-amber-600 bg-amber-50 ring-1 ring-amber-100 rounded-full inline-block px-2 py-0.5 mt-0.5">+{m.xp} XP</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mt-3 min-h-[42px]">{m.desc}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-slate-400">التقدم</span>
                      <span className={m.done ? "text-emerald-600" : "text-slate-600"}>{m.progress} / {m.target}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${m.done ? "bg-gradient-to-l from-emerald-500 to-teal-400" : "bg-gradient-to-l from-amber-400 to-orange-500"}`}
                        initial={{ width: 0 }} whileInView={{ width: `${p}%` }} viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: EASE }} />
                    </div>
                  </div>
                  <button data-testid="mission-claim-btn" disabled={!m.done || m.claimed || busy === m.key} onClick={() => claim(m.key)}
                    className={`mt-4 w-full rounded-2xl py-3 font-head font-black text-sm transition active:scale-95 ${m.claimed ? "bg-slate-100 text-slate-400" : m.done ? "bg-gradient-to-l from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02]" : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"}`}>
                    {m.claimed ? "تم الاستلام ✓" : m.done ? `استلم +${m.xp} XP` : "أنجز المهمة أولاً"}
                  </button>
                </div>
              </Item>
            );
          })}

          <Item>
            <div className={`relative overflow-hidden rounded-3xl p-5 ft-shadow transition hover:-translate-y-1 ${data.chest_ready || data.chest_claimed ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white" : "bg-slate-900 text-white"}`} data-testid="mission-chest">
              <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
              <motion.div animate={data.chest_ready && !data.chest_claimed ? { rotate: [0, -6, 6, -4, 0], scale: [1, 1.08, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }} className="relative">
                <Gift className="w-12 h-12" />
              </motion.div>
              <p className="font-head font-black text-xl mt-3 relative">صندوق كنز الأسبوع</p>
              <p className="text-sm mt-1 relative text-white/85 leading-relaxed">
                {data.chest_claimed ? "فتحت الصندوق هذا الأسبوع · عد الاثنين القادم" : data.chest_ready ? "أنجزت المهمات السبع · الصندوق بانتظارك!" : `أكمل المهمات السبع كلها لفتح الصندوق (${doneCount}/7)`}
              </p>
              <div className="flex gap-1.5 mt-4 relative">
                {missions.map((m) => (
                  <span key={m.key} className={`h-2 flex-1 rounded-full ${m.done ? "bg-white" : "bg-white/30"}`} />
                ))}
              </div>
              <button data-testid="mission-chest-btn" disabled={!data.chest_ready || data.chest_claimed || busy === "__chest__"} onClick={() => claim("__chest__")}
                className={`mt-4 w-full rounded-2xl py-3 font-head font-black text-sm transition active:scale-95 relative ${data.chest_claimed ? "bg-white/20 text-white/60" : data.chest_ready ? "bg-white text-orange-600 shadow-xl hover:scale-[1.02]" : "bg-white/10 text-white/50"}`}>
                {data.chest_claimed ? "تم الفتح ✓" : data.chest_ready ? <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> افتح الصندوق · +{data.chest_xp} XP</span> : <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4" /> مقفل · +{data.chest_xp} XP</span>}
              </button>
            </div>
          </Item>
        </Stagger>
      </div>
    </Layout>
  );
}
