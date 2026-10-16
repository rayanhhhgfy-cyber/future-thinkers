import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ChevronLeft, Atom, Rocket, Play, RotateCcw, Volume2, VolumeX, Check, X,
  Trophy, Timer, Activity, Triangle,
} from "lucide-react";
import { Layout } from "@/components/Layout";

import { fmt, chips, cardCls, gradBtn, ghostBtn, head3, Stat, Slider, Steps, numIn, selIn, useSimCanvas, LazyMount, usePrefersReducedMotion, NOOP, roundRect, arrow, PLANETS, planetById, RANKS, rankOf, BADGES, SPECTRUM, QUIZ_BANK, FACTS, FACT_CATS, LS_KEY, blankStore, loadStore, PhysCtx, usePhys, todayStr, lamText, sciHz } from "@/components/lab/physCore";
import { ProjectileSim, ProjectileLab, CollisionLab, CircuitLab, WaveStudio, OpticsBench, PendulumLab, SpringLab, RampLab } from "@/components/lab/physSims";
/* ============ حاسبة الفيزياء الاحترافية ============ */
function PhysicsCalculatorPro() {
  const MODES = [
    { id: "kin", icon: "🚀", name: "الحركية" },
    { id: "force", icon: "💪", name: "القوى" },
    { id: "energy", icon: "⚡", name: "الطاقة والشغل" },
    { id: "elec", icon: "🔌", name: "الكهرباء" },
    { id: "wave", icon: "🌊", name: "الموجات" },
    { id: "units", icon: "🔄", name: "محول الوحدات" },
  ];
  const [mode, setMode] = useState("kin");
  const [vals, setVals] = useState({});
  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const N = (k) => { const v = parseFloat(vals[k]); return isNaN(v) ? null : v; };
  const F = ({ k, label, unit, ph }) => (
    <label className="block">
      <span className="text-[12px] font-black text-slate-500">{label} {unit && <span className="text-slate-400 font-bold">({unit})</span>}</span>
      <input value={vals[k] || ""} onChange={(e) => set(k, e.target.value)} placeholder={ph || "0"}
        inputMode="decimal" dir="ltr"
        className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3 text-center text-lg font-black text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white" />
    </label>
  );
  let out = null;
  const R = (label, value, unit, steps) => { out = { label, value, unit, steps }; };

  if (mode === "kin") {
    const v0 = N("v0"), a = N("a"), t = N("t"), x = N("x"), v = N("v");
    if (v !== null && v0 !== null && a !== null && a !== 0) R("الزمن t", fmt((v - v0) / a), "s", [`t = (v − v₀) / a`, `t = (${v} − ${v0}) / ${a}`]);
    else if (v !== null && v0 !== null && t !== null && t !== 0) R("التسارع a", fmt((v - v0) / t), "m/s²", [`a = (v − v₀) / t`, `a = (${v} − ${v0}) / ${t}`]);
    else if (v0 !== null && a !== null && t !== null) {
      const vv = v0 + a * t, xx = v0 * t + 0.5 * a * t * t;
      R("السرعة النهائية والمسافة", `${fmt(vv)} m/s · ${fmt(xx)} m`, "", [`v = v₀ + at = ${v0} + ${a}×${t}`, `x = v₀t + ½at² = ${v0}×${t} + ½×${a}×${t}²`]);
    } else if (v !== null && v0 !== null && x !== null && x !== 0) R("التسارع a", fmt((v * v - v0 * v0) / (2 * x)), "m/s²", [`v² = v₀² + 2ax`, `a = (${v}² − ${v0}²) / (2×${x})`]);
    else out = { hint: "أدخل 3 قيم على الأقل ليحسب الباقي" };
  } else if (mode === "force") {
    const m = N("m"), a = N("a"), f = N("f");
    if (f !== null && m !== null && m !== 0) R("التسارع a", fmt(f / m), "m/s²", [`a = F / m`, `a = ${f} / ${m}`]);
    else if (f !== null && a !== null && a !== 0) R("الكتلة m", fmt(f / a), "kg", [`m = F / a`, `m = ${f} / ${a}`]);
    else if (m !== null && a !== null) {
      const ff = m * a, wgt = m * 9.81;
      R("القوة والوزن", `${fmt(ff)} N · الوزن ${fmt(wgt)} N`, "", [`F = ma = ${m} × ${a}`, `W = mg = ${m} × 9.81`]);
    } else out = { hint: "أدخل قيمتين: الكتلة والقوة أو التسارع" };
  } else if (mode === "energy") {
    const m = N("m"), v = N("v"), h = N("h"), d = N("d"), f = N("f"), t = N("t");
    const parts = [], steps = [];
    if (m !== null && v !== null) { parts.push(`KE = ${fmt(0.5 * m * v * v)} J`); steps.push(`KE = ½mv² = ½×${m}×${v}²`); }
    if (m !== null && h !== null) { parts.push(`PE = ${fmt(m * 9.81 * h)} J`); steps.push(`PE = mgh = ${m}×9.81×${h}`); }
    if (f !== null && d !== null) { parts.push(`W = ${fmt(f * d)} J`); steps.push(`W = Fd = ${f}×${d}`); }
    if (parts.length && t !== null && t !== 0) { const wj = (f || 0) * (d || 0); parts.push(`P = ${fmt(wj / t)} W`); steps.push(`P = W/t = ${fmt(wj)} / ${t}`); }
    out = parts.length ? { label: "النتائج", value: parts.join(" · "), unit: "", steps } : { hint: "أدخل الكتلة والسرعة، أو القوة والمسافة" };
  } else if (mode === "elec") {
    const v = N("v"), i = N("i"), r = N("r");
    if (v !== null && i !== null) R("المقاومة والقدرة", `R = ${fmt(v / i)} Ω · P = ${fmt(v * i)} W`, "", [`R = V/I = ${v}/${i}`, `P = VI = ${v}×${i}`]);
    else if (v !== null && r !== null && r !== 0) R("التيار والقدرة", `I = ${fmt(v / r)} A · P = ${fmt((v * v) / r)} W`, "", [`I = V/R = ${v}/${r}`, `P = V²/R`]);
    else if (i !== null && r !== null) R("الجهد والقدرة", `V = ${fmt(i * r)} V · P = ${fmt(i * i * r)} W`, "", [`V = IR = ${i}×${r}`, `P = I²R`]);
    else out = { hint: "أدخل قيمتين من: الجهد V، التيار I، المقاومة R" };
  } else if (mode === "wave") {
    const f = N("f"), l = N("l"), v = N("v");
    if (f !== null && l !== null) R("سرعة الموجة", fmt(f * l), "m/s", [`v = fλ = ${f} × ${l}`]);
    else if (v !== null && f !== null && f !== 0) R("الطول الموجي λ", fmt(v / f), "m", [`λ = v/f = ${v} / ${f}`]);
    else if (v !== null && l !== null && l !== 0) R("التردد f", fmt(v / l), "Hz", [`f = v/λ = ${v} / ${l}`]);
    else out = { hint: "أدخل قيمتين من: التردد f، الطول الموجي λ، السرعة v" };
  } else if (mode === "units") {
    const val = N("uv"), from = vals.uf || "m", to = vals.ut || "km";
    const toM = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048 };
    const toKg = { kg: 1, g: 0.001, t: 1000, lb: 0.453592 };
    const toS = { s: 1, min: 60, h: 3600, day: 86400 };
    const T = { m: toM, km: toM, cm: toM, mm: toM, mi: toM, ft: toM, kg: toKg, g: toKg, t: toKg, lb: toKg, s: toS, min: toS, h: toS, day: toS };
    if (val !== null && T[from] && T[from] === T[to]) {
      const res = (val * T[from][from]) / T[to][to];
      R("النتيجة", fmt(res, 4), to, [`${val} ${from} = ${val} × ${T[from][from]} ${"mkg s".includes(from[0]) ? "" : ""}`, `= ${fmt(res, 4)} ${to}`]);
    } else out = { hint: "اختر وحدتين من نفس النوع (طول / كتلة / زمن)" };
  }

  const unitOpts = { طول: ["m", "km", "cm", "mm", "mi", "ft"], كتلة: ["kg", "g", "t", "lb"], زمن: ["s", "min", "h", "day"] };
  return (
    <div className={cardCls} data-testid="phys-calculator-pro">
      {head3("🧮", "حاسبة الفيزياء الاحترافية", "ستة أقسام ذكية · نتائج فورية مع خطوات الحل كما يكتبها معلمك")}
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="أقسام الحاسبة">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => { setMode(m.id); setVals({}); }} role="tab" aria-selected={mode === m.id}
            className={`pressable shrink-0 px-4 py-2.5 rounded-2xl text-[13px] font-black transition min-h-[44px] ${mode === m.id ? "text-white ft-shadow bg-gradient-to-l from-violet-600 to-indigo-600" : "bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:ring-violet-200"}`}>
            {m.icon} {m.name}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-3xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-100 p-4 sm:p-6">
        {mode === "kin" && (<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <F k="v0" label="السرعة الابتدائية v₀" unit="m/s" /><F k="v" label="السرعة النهائية v" unit="m/s" /><F k="a" label="التسارع a" unit="m/s²" /><F k="t" label="الزمن t" unit="s" /><F k="x" label="المسافة x" unit="m" />
        </div>)}
        {mode === "force" && (<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <F k="m" label="الكتلة m" unit="kg" /><F k="a" label="التسارع a" unit="m/s²" /><F k="f" label="القوة F" unit="N" />
        </div>)}
        {mode === "energy" && (<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <F k="m" label="الكتلة m" unit="kg" /><F k="v" label="السرعة v" unit="m/s" /><F k="h" label="الارتفاع h" unit="m" /><F k="f" label="القوة F" unit="N" /><F k="d" label="المسافة d" unit="m" /><F k="t" label="الزمن t" unit="s" />
        </div>)}
        {mode === "elec" && (<div className="grid grid-cols-3 gap-3">
          <F k="v" label="الجهد V" unit="V" /><F k="i" label="التيار I" unit="A" /><F k="r" label="المقاومة R" unit="Ω" />
        </div>)}
        {mode === "wave" && (<div className="grid grid-cols-3 gap-3">
          <F k="f" label="التردد f" unit="Hz" /><F k="l" label="الطول الموجي λ" unit="m" /><F k="v" label="السرعة v" unit="m/s" />
        </div>)}
        {mode === "units" && (
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <F k="uv" label="القيمة" ph="100" />
            <label className="block"><span className="text-[12px] font-black text-slate-500">من</span>
              <select value={vals.uf || "m"} onChange={(e) => set("uf", e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3 font-black text-slate-900 outline-none focus:border-violet-400">
                {Object.entries(unitOpts).map(([g, us]) => (<optgroup key={g} label={g}>{us.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>))}
              </select></label>
            <label className="block"><span className="text-[12px] font-black text-slate-500">إلى</span>
              <select value={vals.ut || "km"} onChange={(e) => set("ut", e.target.value)} className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3 font-black text-slate-900 outline-none focus:border-violet-400">
                {Object.entries(unitOpts).map(([g, us]) => (<optgroup key={g} label={g}>{us.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>))}
              </select></label>
          </div>
        )}
        <div className="mt-5">
          {out && out.hint ? (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-[13px] font-bold text-amber-700">💡 {out.hint}</div>
          ) : out ? (
            <div>
              <div className="rounded-3xl bg-gradient-to-l from-violet-600 via-indigo-600 to-indigo-700 p-5 sm:p-6 text-white ft-shadow">
                <div className="text-[12px] font-black text-violet-200">{out.label}</div>
                <div className="font-head text-2xl sm:text-4xl font-black mt-1 leading-tight" dir="auto">{out.value} {out.unit && <span className="text-lg text-violet-200">{out.unit}</span>}</div>
              </div>
              {out.steps && out.steps.length > 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 ring-1 ring-slate-100 p-4">
                  <div className="text-[12px] font-black text-slate-500 mb-2">📝 خطوات الحل</div>
                  <Steps steps={out.steps} />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">القيم تقريبية تعليمية · g = 9.81 m/s² · اترك الخانة التي تريد حسابها فارغة وستحسبها الحاسبة تلقائياً.</p>
    </div>
  );
}


/* ================= main page ================= */
const SIM_TABS = [
  ["projectile", "🚀 المقذوفات"], ["collision", "🚗 التصادمات"], ["circuit", "💡 الدوائر الكهربائية"],
  ["waves", "🌊 الموجات والصوت"], ["optics", "🔍 البصريات"], ["pendulum", "⏱️ البندول"],
["spring", "🌀 النوابض"], ["ramp", "📐 المنحدر والاحتكاك"],
];
function SectionHead({ icon, title, sub }) {
  return (
    <div className="flex items-center gap-2.5 mt-9 mb-4">
      <span className="w-11 h-11 rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-700 grid place-items-center ft-shadow text-xl text-white">{icon}</span>
      <div>
        <div className="font-head font-black text-xl sm:text-2xl text-slate-900 leading-tight">{title}</div>
        {sub && <div className="text-[12px] text-slate-400 font-bold">{sub}</div>}
      </div>
    </div>
  );
}

/* memoized sections: page-level state (toast / sim tabs) must not repaint the whole lab */
const MProjectileLab = React.memo(ProjectileLab);
const MCollisionLab = React.memo(CollisionLab);
const MCircuitLab = React.memo(CircuitLab);
const MWaveStudio = React.memo(WaveStudio);
const MOpticsBench = React.memo(OpticsBench);
const MPendulumLab = React.memo(PendulumLab);
const MSpringLab = React.memo(SpringLab);
const MRampLab = React.memo(RampLab);
const MProjectileSim = React.memo(ProjectileSim);
const MRecordsCard = React.memo(RecordsCard);

export default function PhysicsLab() {
  const [store, setStore] = useState(loadStore);
  const [toast, setToast] = useState(null);
  const [sim, setSim] = useState("projectile");
  const awardedRef = useRef(new Set());
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* private */ } }, [store]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const award = useCallback((id, xp, msg, badgeId) => {
    if (awardedRef.current.has(id)) return;
    awardedRef.current.add(id);
    setStore((s) => {
      let ns = { ...s, xp: s.xp + xp };
      if (badgeId && !ns.badges.includes(badgeId)) ns = { ...ns, badges: [...ns.badges, badgeId] };
      return ns;
    });
    if (msg) setToast({ xp, msg, badgeId, key: Date.now() });
  }, []);
  const patchStore = useCallback((fn) => setStore(fn), []);
  const recordExperiment = useCallback((simId) => {
    setStore((s) => {
      const sims = (s.records.sims || []).includes(simId) ? s.records.sims : [...(s.records.sims || []), simId];
      return { ...s, records: { ...s.records, experiments: (s.records.experiments || 0) + 1, sims } };
    });
    const sims = new Set([...(storeRef.current.records.sims || []), simId]);
    if (sims.size >= 5) award("explorer-badge", 20, "شغّلت 5 تجارب مختلفة في المسرح", "explorer");
  }, [award]);
  useEffect(() => {
    if (store.xp >= 500 && !store.badges.includes("scholar")) {
      setStore((s) => ({ ...s, badges: [...s.badges, "scholar"] }));
      setToast({ xp: 0, msg: "وسام جديد: الفيزيائي المثابر · 500 نقطة", badgeId: "scholar", key: Date.now() });
    }
  }, [store.xp, store.badges]);
  const ctxVal = useMemo(() => ({ store, award, recordExperiment, patchStore }), [store, award, recordExperiment, patchStore]);
  const { rank } = rankOf(store.xp);

  return (
    <PhysCtx.Provider value={ctxVal}>
      <MotionConfig reducedMotion="user">
      <Layout>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 overflow-x-clip" dir="rtl">
          {/* ===== hero ===== */}
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl" />
            <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-fuchsia-400/15 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-violet-400 via-indigo-300 to-cyan-300" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1.3px)] [background-size:24px_24px]" />
            <div className="relative">
              <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-cyan-200/80 hover:text-cyan-100 text-[13px] font-bold mb-4 transition"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                    <Atom className="w-3.5 h-3.5 text-cyan-300" /> مختبر نادي العلوم التفاعلي
                  </span>
                  <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-black mt-3 leading-tight">مختبر <span className="text-transparent bg-clip-text bg-gradient-to-l from-violet-300 via-indigo-200 to-cyan-300">الفيزياء</span> المتقدم</h1>
                  <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">ثماني محاكيات حيّة تراها بعينك: مقذوفات وتصادمات ودوائر وموجات · وكل تجربة تشغّلها ترفع رتبتك من فيزيائي مبتدئ إلى أستاذ الفيزياء</p>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3 shrink-0 w-full lg:w-auto">
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-cyan-200 drop-shadow">8</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">محاكيات حيّة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-violet-200 drop-shadow">20</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">ميزة كاملة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-xl sm:text-2xl font-black font-head text-fuchsia-200 drop-shadow" dir="ltr">{store.xp}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">نقطة خبرة</div>
                  </div>
                  <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className="text-lg sm:text-xl font-black font-head text-amber-200 drop-shadow leading-tight">{rank.name}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">رتبتك الحالية</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-400 text-slate-950 text-[12.5px] font-black ft-shadow">
                  🧠 {store.daily.date === todayStr() && store.daily.quizDone ? "أنجزت اختبار اليوم 🏆 عد غداً" : "اختبار فيزياء جديد بانتظارك اليوم"}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                  🏅 أوسمة مفتوحة: {store.badges.length} من {BADGES.length}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                  🔥 سلسلة الاختبار: {store.records.quizStreak || 0} يوم
                </span>
              </div>
            </div>
          </div>

          {/* ===== simulator stage ===== */}
          <SectionHead icon="🎛️" title="مسرح المحاكاة الحية" sub="ثماني تجارب فيزيائية تتحرك أمامك · بدّل بينها وجرّب كل واحدة بيدك" />
          <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="تجارب المسرح">
            {SIM_TABS.map(([id, ar]) => (
              <button key={id} onClick={() => setSim(id)} data-testid={`phys-tab-${id}`} role="tab" aria-selected={sim === id}
                className={`pressable shrink-0 px-3.5 py-2.5 rounded-2xl text-[12.5px] font-black transition min-h-[44px] ${sim === id ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-violet-600 via-indigo-600 to-indigo-700 ring-1 ring-white/30" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-indigo-200"}`}>
                {ar}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={sim} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {sim === "projectile" && <MProjectileLab />}
              {sim === "collision" && <MCollisionLab />}
              {sim === "circuit" && <MCircuitLab />}
              {sim === "waves" && <MWaveStudio />}
              {sim === "optics" && <MOpticsBench />}
              {sim === "pendulum" && <MPendulumLab />}
              {sim === "spring" && <MSpringLab />}
              {sim === "ramp" && <MRampLab />}
            </motion.div>
          </AnimatePresence>

          {/* ===== physics calculator ===== */}
          <SectionHead icon="🧮" title="حاسبة الفيزياء الاحترافية" sub="ستة أقسام ذكية · اكتب القيم واحصل على النتيجة مع خطوات الحل" />
          <LazyMount minH={560} icon="🧮" title="حاسبة الفيزياء الاحترافية">
            <PhysicsCalculatorPro />
          </LazyMount>

        </div>

        {/* ===== XP toast ===== */}
        <AnimatePresence>
          {toast && (
            <motion.div key={toast.key} initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="fixed inset-x-0 bottom-[86px] sm:bottom-24 z-[95] flex justify-center px-3 pointer-events-none">
              <div className="relative w-full max-w-[700px] overflow-hidden rounded-[1.75rem] bg-white/75 backdrop-blur-xl ft-shadow-lg">
                <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/70 rounded-[1.75rem]" />
                <span className="pointer-events-none absolute -top-10 right-10 w-32 h-32 rounded-full bg-amber-300/30 blur-2xl" />
                <span className="pointer-events-none absolute -bottom-12 left-10 w-32 h-32 rounded-full bg-violet-400/25 blur-2xl" />
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 grid place-items-center ft-shadow ring-1 ring-white/50">
                    <Trophy className="w-6 h-6 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-black text-amber-600">{toast.badgeId ? "وسام فيزياء جديد 🏅" : "إنجاز فيزياء جديد 🏆"}</div>
                    <div className="font-black font-head text-slate-900 text-[15px] leading-snug truncate">{toast.msg}</div>
                  </div>
                  {toast.xp > 0 && <span className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-to-l from-violet-600 to-indigo-600 text-white text-[12px] font-black ft-shadow" dir="ltr">+{toast.xp} XP</span>}
                  <button onClick={() => setToast(null)} className="pressable pointer-events-auto shrink-0 w-9 h-9 grid place-items-center rounded-full bg-slate-900/[0.06] text-slate-500 active:scale-90" aria-label="إغلاق"><X className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
      </MotionConfig>
    </PhysCtx.Provider>
  );
}
