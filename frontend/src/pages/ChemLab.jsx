import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Atom, Play, Pause, RotateCcw, Plus, X, Info, Thermometer,
  Zap, Sparkles, ArrowLeft, Beaker, Lightbulb, Ban, Gauge, ChevronLeft, Dices, Search, MousePointerClick,
  Camera, Maximize2, Type, Orbit, GaugeCircle, Share2, Copy, Check, Trophy, ShieldAlert, Scale, Swords,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { ELEMENTS, EL, CATS, COMPOUNDS, shells, parseFormula } from "@/components/lab/chemData";
import { predict, compoundInfo, COND_LIST } from "@/components/lab/reactions";
import SimCanvas from "@/components/lab/SimCanvas";

/* element symbols that react as diatomic molecules */
const DIATOMIC = { H: "H2", N: "N2", O: "O2", F: "F2", Cl: "Cl2", Br: "Br2", I: "I2" };
const DIATOMIC_REV = Object.fromEntries(Object.entries(DIATOMIC).map(([k, v]) => [v, k]));

function Fx({ f, className = "" }) {
  const parts = [];
  let i = 0, key = 0;
  while (i < f.length) {
    const ch = f[i];
    if (/\d/.test(ch)) { let d = ""; while (i < f.length && /\d/.test(f[i])) d += f[i++]; parts.push(<sub key={key++} className="text-[0.62em] font-bold">{d}</sub>); }
    else parts.push(<span key={key++}>{ch}</span>), i++;
  }
  return <span dir="ltr" className={`inline-flex items-baseline font-black tracking-wide ${className}`}>{parts}</span>;
}

const PHASE_AR = { idle: "بانتظار التشغيل", approach: "المواد تقترب وتتحرك", collide: "التصادم وتكسير الروابط", rearrange: "الذرّات تعيد ترتيب نفسها", products: "النواتج تتكوّن" };
const GAS_SET = new Set(["H2", "O2", "N2", "Cl2", "F2", "Br2g", "CO2", "CH4", "NH3", "SO2", "CO", "H2S", "C2H2", "C2H4", "C3H8"]);
const LIQ_SET = new Set(["H2O", "H2O2", "Br2", "Hg", "C2H5OH"]);
const AQ_SET = new Set(["HCl", "H2SO4", "HNO3", "NaOH", "KOH", "CH3COOH", "NaCl", "KCl", "Ca(OH)2", "Pb(NO3)2", "KI", "NaHCO3"]);
const stateOf = (f) => (GAS_SET.has(f) ? "g" : LIQ_SET.has(f) ? "l" : AQ_SET.has(f) ? "aq" : "s");
const HAZARD = {
  HCl: "حمض آكل · تجنّب الاستنشاق والملامسة", H2SO4: "حمض شديد التآكل والحرارة عند التخفيف", HNO3: "حمض مؤكسد قوي وآكل",
  NaOH: "قلوي آكل للجلد والعينين", KOH: "قلوي آكل · تعامل بحذر", Cl2: "غاز سام · خطر عند الاستنشاق",
  Br2: "سائل سام ومتطاير", NH3: "غاز مهيّج للتنفس", H2O2: "مؤكسد · قد يهيّج الجلد",
  "Pb(NO3)2": "ملح رصاصي سام · لا يُبتلع أبداً", PbI2: "مركب رصاصي سام", CH3COOH: "حمض عضوي · المركز منه آكل",
};
const SUBS = { 0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉" };
const GAS_TEST = {
  CO2: { test: "مرّره في ماء الجير الصافي", pass: "يتعكّر ماء الجير حليبياً · مؤكد ✓", icon: "🥛" },
  H2: { test: "قرّب شظية مشتعلة من فوهته", pass: "فرقعة مميزة (اختبار الفرقعة) · مؤكد ✓", icon: "💥" },
  O2: { test: "أدخل شظية متوهّجة بلا لهب", pass: "تشتعل الشظية من جديد · مؤكد ✓", icon: "✨" },
};
const plainFx = (f) => f.replace(/\d/g, (d) => SUBS[d]);
const eqText = (eq) => {
  const side = (arr) => arr.map(({ f, n }) => `${n > 1 ? n : ""}${plainFx(f)}(${stateOf(f)})`).join(" + ");
  return `${side(eq.reactants)} ⟶ ${side(eq.products)}`;
};
const CODEX_UNIVERSE = [...new Set([...COMPOUNDS.map((c) => c.f),
  "CH3COONa", "KNO3", "NaNO3", "AgCl", "BaSO4", "PbI2", "ZnCl2", "FeCl2", "FeCl3", "MgO", "CuSO4", "ZnSO4"])];
const MISSIONS = [
  { id: "water", icon: "💧", title: "صانع الماء", desc: "كوّن جزيئات ماء من تفاعل حقيقي", test: (r) => r.reacts && r.eq.products.some((p) => p.f === "H2O") && r.eq.reactants.some((p) => p.f === "O2") },
  { id: "volcano", icon: "🌋", title: "بركان الغاز", desc: "ولّد غاز ثاني أكسيد الكربون ولاحظ الفوران", test: (r) => r.reacts && r.eq.products.some((p) => p.f === "CO2") },
  { id: "metal", icon: "⚡", title: "معدن نشط", desc: "حرّر غاز الهيدروجين من معدن وحمض", test: (r) => r.reacts && r.eq.products.some((p) => p.f === "H2") && r.eq.reactants.some((p) => AQ_SET.has(p.f)) },
];

const PRESETS = [
  { label: "💥 تكوين الماء", items: ["H2", "O2"], cond: "spark" },
  { label: "🌋 بركان صودا الخبز", items: ["NaHCO3", "CH3COOH"], cond: null },
  { label: "🌧️ المطر الذهبي", items: ["Pb(NO3)2", "KI"], cond: null },
  { label: "🔥 احتراق الغاز الطبيعي", items: ["CH4", "O2"], cond: "spark" },
  { label: "🔌 تحليل الماء كهربائياً", items: ["H2O"], cond: "electric" },
  { label: "🌱 البناء الضوئي", items: ["CO2", "H2O"], cond: "light" },
];

function ElementModal({ el, onClose, onAdd }) {
  if (!el) return null;
  const sh = shells(el.z);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[1.75rem] overflow-hidden bg-white ft-shadow-lg max-h-[92dvh] overflow-y-auto">
        <div className="p-6 relative" style={{ background: `linear-gradient(135deg, ${CATS[el.cat].color}2e, #ffffff 65%)` }}>
          <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 grid place-items-center rounded-full bg-slate-900/[0.06] text-slate-600 hover:bg-slate-900/10 transition"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-3xl grid place-items-center shadow-lg shrink-0 ring-1 ring-black/5" style={{ background: CATS[el.cat].color }}>
              <div className="text-center">
                <div className="text-[11px] font-black text-slate-900/60">{el.z}</div>
                <div className="text-4xl font-black text-slate-900 leading-none">{el.sym}</div>
                <div className="text-[10px] font-bold text-slate-900/70 mt-0.5">{el.mass}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black font-head text-slate-900">{el.ar}</div>
              <div className="text-slate-500 text-sm font-semibold" dir="ltr">{el.enName}</div>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: CATS[el.cat].color + "2e", color: "#334155", border: `1px solid ${CATS[el.cat].color}88` }}>{CATS[el.cat].ar}</span>
            </div>
          </div>
          <p className="mt-4 text-slate-600 text-sm leading-relaxed">{el.desc}</p>
        </div>
        <div className="px-5 grid grid-cols-3 gap-2.5 text-center">
          {[["العدد الذري", el.z], ["الكتلة الذرية", el.mass], ["الحالة", el.state === "g" ? "غاز" : el.state === "l" ? "سائل" : "صلب"],
            ["المجموعة", el.g || "f"], ["الدورة", el.p], ["الكهروسلبية", el.en ?? "—"],
            ["الانصهار °م", el.melt ?? "—"], ["الغليان °م", el.boil ?? "—"], ["إلكترونات الغلاف الأخير", sh[sh.length - 1]]]
            .map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 py-2.5 px-1">
                <div className="text-base font-black text-slate-900" dir="ltr">{v}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">{k}</div>
              </div>
            ))}
        </div>
        <div className="px-5 pt-4">
          <div className="text-[11px] font-black text-slate-500 mb-2">التوزيع الإلكتروني بالأغلفة</div>
          <div className="flex items-end gap-3" dir="ltr">
            {sh.map((n, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex flex-wrap justify-center gap-[3px] w-12 min-h-[14px]">
                  {Array.from({ length: n }).map((_, j) => <span key={j} className="w-[7px] h-[7px] rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.7)]" />)}
                </div>
                <span className="text-[10px] text-slate-400 font-bold">n={i + 1} · {n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <button onClick={() => { onAdd(el); onClose(); }}
            className="pressable w-full py-3.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-head font-black ft-shadow hover:scale-[1.01] active:scale-95 transition">
            <Plus className="w-4 h-4 inline-block ml-1 -mt-0.5" /> أضف «{el.ar}» إلى المفاعلات
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ChemLab() {
  const [tray, setTray] = useState([{ f: "H2" }, { f: "O2" }]);
  const [cond, setCond] = useState("spark");
  const [result, setResult] = useState(null);
  const [runId, setRunId] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elModal, setElModal] = useState(null);
  const [temp, setTemp] = useState(25);
  const [phase, setPhase] = useState("idle");
  const [speed, setSpeed] = useState(1);
  const [labels, setLabels] = useState(true);
  const [autoRot, setAutoRot] = useState(true);
  const zoomRef = useRef({ v: 1 });
  const stageCardRef = useRef(null);
  const stageRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const seekRef = useRef({ scrubbing: false, v: 0 });
  const [copied, setCopied] = useState(false);
  const [missions, setMissions] = useState(() => { try { return JSON.parse(localStorage.getItem("ft-lab-missions") || "[]"); } catch { return []; } });
  const [me, setMe] = useState(null);
  const [board, setBoard] = useState([]);
  const [toast, setToast] = useState(null);

  const addItem = React.useCallback((f) => {
    setTray((t) => (t.some((x) => x.f === f) || t.length >= 3 ? t : [...t, { f }]));
    setResult(null);
  }, []);
  const addElement = React.useCallback((el) => addItem(DIATOMIC[el.sym] || el.sym), [addItem]);
  const removeItem = React.useCallback((f) => { setTray((t) => t.filter((x) => x.f !== f)); setResult(null); }, []);
  const clearTray = React.useCallback(() => { setTray([]); setResult(null); }, []);

  const run = (items = tray, c = cond) => {
    if (!items.length) return;
    const r = predict(items, c);
    setResult(r); setRunId((x) => x + 1); setPlaying(true); setTemp(25); setPhase("approach"); setProgress(0);
    if (r.reacts && r.eq) {
      const speciesEls = [...new Set([...r.eq.reactants, ...r.eq.products].flatMap(({ f }) => Object.keys(parseFormula(f))))];
      api.post("/lab/run", {
        reactants: items.map((x) => x.f),
        products: r.eq.products.map((p) => p.f),
        elements: speciesEls,
      }).then(({ data }) => {
        setMe(data.me);
        setToast({ gained: data.gained, species: data.new_species || [], badges: data.new_badges || [], daily: data.daily_done && data.gained >= 120 });
        setTimeout(() => setToast(null), 4200);
        api.get("/lab/leaderboard").then(({ data: b }) => setBoard(b.items || [])).catch(() => {});
      }).catch(() => {});
    }
    if (r.reacts) {
      setMissions((prev) => {
        const won = MISSIONS.filter((m) => m.test(r) && !prev.includes(m.id)).map((m) => m.id);
        if (!won.length) return prev;
        const next = [...prev, ...won];
        try { localStorage.setItem("ft-lab-missions", JSON.stringify(next)); } catch { /* private mode */ }
        return next;
      });
    }
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const applyPreset = (p) => {
    const items = p.items.map((f) => ({ f }));
    setTray(items); setCond(p.cond); run(items, p.cond);
  };
  const surprise = () => applyPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)]);
  const runCb = React.useCallback(() => run(), [tray, cond]); // eslint-disable-line react-hooks/exhaustive-deps
  const surpriseCb = React.useCallback(() => surprise(), []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    api.get("/lab/me").then(({ data }) => setMe(data)).catch(() => {});
    api.get("/lab/leaderboard").then(({ data }) => setBoard(data.items || [])).catch(() => {});
    try {
      const raw = sessionStorage.getItem("ft-lab-try");
      if (raw) {
        sessionStorage.removeItem("ft-lab-try");
        const t2 = JSON.parse(raw);
        if (Array.isArray(t2.items) && t2.items.length) {
          const o = t2.items.map((f) => ({ f }));
          setTray(o); setCond(t2.cond ?? null);
          setTimeout(() => run(o, t2.cond ?? null), 450);
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atomCount = useMemo(() => {
    if (!result?.eq) return 0;
    return result.eq.reactants.reduce((sum, { f, n }) => sum + n * Object.values(parseFormula(f)).reduce((a, b) => a + b, 0), 0);
  }, [result]);
  const ledger = useMemo(() => {
    if (!result?.eq) return [];
    const count = (arr) => { const m = {}; arr.forEach(({ f, n }) => { const c = parseFormula(f); for (const k in c) m[k] = (m[k] || 0) + c[k] * n; }); return m; };
    const R = count(result.eq.reactants), P = count(result.eq.products);
    return [...new Set([...Object.keys(R), ...Object.keys(P)])].map((sym) => ({ sym, r: R[sym] || 0, p: P[sym] || 0, el: EL[sym] })).filter((x) => x.el);
  }, [result]);
  const involvedElements = useMemo(() => {
    if (!result?.eq) return [];
    const set = new Set();
    [...result.eq.reactants, ...result.eq.products].forEach(({ f }) => Object.keys(parseFormula(f)).forEach((s) => set.add(s)));
    return [...set].map((s) => EL[s]).filter(Boolean);
  }, [result]);

  const trayName = (f) => COMPOUNDS.find((c) => c.f === f)?.ar || (EL[f] ? EL[f].ar : (DIATOMIC_REV[f] ? EL[DIATOMIC_REV[f]]?.ar : ""));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 overflow-x-clip" dir="rtl">
        {/* ===== hero · same design language as the site ===== */}
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative">
            <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-cyan-200/80 hover:text-cyan-100 text-[13px] font-bold mb-4 transition"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-300" /> مختبر نادي العلوم التفاعلي
                </span>
                <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-black mt-3 leading-tight">محاكي التفاعلات <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 to-emerald-300">الكيميائية</span></h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">اختر أي عنصر أو مركب · وشاهد التفاعل يحدث أمامك ثلاثي الأبعاد ذرّةً ذرّة، مع المعادلة والطاقة والحرارة وتفاصيل كل مادة</p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 shrink-0 w-full lg:w-auto">
                <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">118</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">عنصراً</div>
                </div>
                <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">40+</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">مركباً شائعاً</div>
                </div>
                <div className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">3D</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">محاكاة ذرية</div>
                </div>
              </div>
            </div>
            {me && (
              <div className="flex flex-wrap items-center gap-2 mt-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-400 text-slate-950 text-[12.5px] font-black ft-shadow" data-testid="lab-daily">
                  📅 تحدي اليوم: {me.daily.title} {me.daily.done ? "· أُنجز 🏆" : ""}
                </span>
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                  ⭐ {me.level_title} · {me.lab_xp} خبرة مختبر
                </span>
                {me.next_level_at && (
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 ring-1 ring-white/15">
                    <span className="w-24 h-2 rounded-full bg-white/15 overflow-hidden" dir="ltr">
                      <span className="block h-full bg-gradient-to-r from-amber-300 to-emerald-300 rounded-full transition-all" style={{ width: `${Math.min(100, (me.lab_xp / me.next_level_at) * 100)}%` }} />
                    </span>
                    <span className="text-[11px] font-bold text-slate-200">للمستوى التالي {me.next_level_at}</span>
                  </span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)} data-testid={`preset-${p.items.join("-")}`}
                  className="pressable px-3 py-2.5 sm:px-3.5 rounded-2xl sm:rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] sm:text-[13px] font-bold hover:bg-white/20 active:scale-95 transition text-center">{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6"><PickerDeck tray={tray} cond={cond} onCond={setCond} onAddItem={addItem} onAddElement={addElement} onRemove={removeItem} onClear={clearTray} onRun={runCb} onSurprise={surpriseCb} onInfo={setElModal} /></div>

        {/* ===== مسرح المحاكاة ===== */}
        <div ref={(n) => { stageRef.current = n; stageCardRef.current = n; }} className="relative mt-6 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden ring-1 ring-slate-100">
          <div className="absolute top-3 right-3 z-20">
            <span className={`px-3 py-1.5 rounded-full text-[11px] font-black ring-1 backdrop-blur ${result?.reacts ? "bg-emerald-50/90 text-emerald-700 ring-emerald-200" : "bg-white/85 text-slate-500 ring-slate-200"}`}>
              {result ? PHASE_AR[phase] : "اختر المواد ثم شغّل التفاعل"}
            </span>
          </div>
          <div className="absolute top-3 left-3 z-20 rounded-2xl bg-white/85 backdrop-blur ring-1 ring-slate-200/80 ft-shadow px-3.5 py-2 flex items-center gap-3">
            <Thermometer className={`w-5 h-5 ${temp > 400 ? "text-red-500" : temp > 120 ? "text-orange-500" : "text-cyan-600"}`} />
            <div>
              <div className="text-xl font-black font-head leading-none text-slate-900" dir="ltr">{temp}°C</div>
              <div className="text-[10px] text-slate-500 font-bold mt-0.5">حرارة التفاعل</div>
            </div>
            <div className="w-14 sm:w-16 h-2 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200/60" dir="ltr">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-red-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(3, (temp / 3000) * 100))}%` }} />
            </div>
          </div>
          <div className="relative h-[360px] sm:h-[470px] lg:h-[560px] bg-[radial-gradient(60%_90%_at_20%_0%,rgba(16,185,129,0.10),transparent_60%),radial-gradient(55%_90%_at_85%_10%,rgba(6,182,212,0.12),transparent_60%),radial-gradient(rgba(15,23,42,0.055)_1px,transparent_1.4px)] [background-size:auto,auto,22px_22px]">
            <SimCanvas result={result} runId={runId} playing={playing} speed={speed} labels={labels} autoRotate={autoRot} zoomRef={zoomRef} seekRef={seekRef} onProgress={setProgress} onTemp={setTemp} onPhase={setPhase} light />
          </div>
          {atomCount > 0 && (
            <div className="absolute bottom-16 sm:bottom-[76px] left-3 z-20 rounded-full bg-white/85 backdrop-blur ring-1 ring-slate-200/80 ft-shadow px-3 py-1.5 text-[11px] font-black text-slate-600 flex items-center gap-1.5">
              <Atom className="w-3.5 h-3.5 text-violet-500" /> {atomCount} ذرّة في المشهد · لا تُخلق ولا تفنى
            </div>
          )}
          <div className="relative border-t border-slate-100 bg-white px-3 py-3 lg:px-5 flex flex-wrap items-center gap-2 lg:gap-3">
            <button onClick={() => setPlaying((p) => !p)} className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition" title={playing ? "إيقاف" : "تشغيل"}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => { setRunId((x) => x + 1); setPlaying(true); }} className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition" title="إعادة">
              <RotateCcw className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-1" role="group" aria-label="سرعة المحاكاة">
              {[0.5, 1, 2].map((v) => (
                <button key={v} onClick={() => setSpeed(v)} data-testid={`speed-${v}`}
                  className={`pressable px-2.5 py-1.5 rounded-xl text-[11px] font-black transition ${speed === v ? "bg-slate-900 text-white ft-shadow" : "text-slate-500 hover:bg-white"}`} dir="ltr">{v}×</button>
              ))}
            </div>
            <button onClick={() => setLabels((v) => !v)} data-testid="toggle-labels" title="رموز الذرات"
              className={`pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl ring-1 transition ${labels ? "bg-cyan-50 ring-cyan-200 text-cyan-700" : "bg-slate-50 ring-slate-200 text-slate-400"}`}>
              <Type className="w-5 h-5" />
            </button>
            <button onClick={() => setAutoRot((v) => !v)} data-testid="toggle-rotate" title="دوران تلقائي"
              className={`pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl ring-1 transition ${autoRot ? "bg-violet-50 ring-violet-200 text-violet-700" : "bg-slate-50 ring-slate-200 text-slate-400"}`}>
              <Orbit className="w-5 h-5" />
            </button>
            <button onClick={() => { const cv = stageCardRef.current?.querySelector("canvas"); if (!cv) return; cv.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "future-thinkers-chem.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }); }} data-testid="stage-snapshot" title="احفظ لقطة من المحاكاة"
              className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition">
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => { const el = stageCardRef.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); }} data-testid="stage-full" title="ملء الشاشة"
              className="pressable w-10 h-10 sm:w-11 sm:h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition">
              <Maximize2 className="w-5 h-5" />
            </button>
            <span className="text-[11px] text-slate-400 font-bold mr-auto hidden md:block">اسحب للتدوير · عجلة الفأرة أو إصبعان للتقريب 🖱️</span>
          </div>
          <div className="relative border-t border-slate-100 bg-slate-50/60 px-4 lg:px-6 py-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {["approach", "collide", "rearrange", "products"].map((ph, i, arr) => {
                const activeIdx = ["approach", "collide", "rearrange", "products"].indexOf(phase === "idle" ? "approach" : phase);
                const on = result && i <= activeIdx;
                return (
                  <React.Fragment key={ph}>
                    <span className={`inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-black transition ${on ? "text-emerald-700" : "text-slate-400"}`}>
                      <span className={`w-5 h-5 grid place-items-center rounded-full text-[10px] ${on ? "bg-emerald-500 text-white ft-shadow" : "bg-white ring-1 ring-slate-200"}`}>{i + 1}</span>
                      <span className="hidden sm:inline">{PHASE_AR[ph]}</span>
                    </span>
                    {i < arr.length - 1 && <span className={`flex-1 h-1 rounded-full ${result && i < activeIdx ? "bg-emerald-400" : "bg-slate-200"}`} />}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-[10px] font-black text-slate-400" dir="ltr">{Math.round(progress * 100)}%</span>
              <input type="range" min="0" max="100" value={Math.round(progress * 100)} data-testid="scrub"
                onChange={(e) => { seekRef.current = { scrubbing: true, v: e.target.value / 100 }; setProgress(e.target.value / 100); setPlaying(false); }}
                onPointerUp={() => { seekRef.current.scrubbing = false; }}
                className="flex-1 accent-emerald-500 h-1.5 cursor-pointer" aria-label="الخط الزمني للتفاعل" />
              <span className="text-[10px] font-bold text-slate-400 hidden sm:block">اسحب لتقديم وترجيع التفاعل</span>
            </div>
          </div>
        </div>

        {/* ===== results ===== */}
        <AnimatePresence>
          {result && (
            <motion.div key={runId} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-6 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
              {result.reacts ? (
                <div className="p-5 lg:p-7">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-xs font-black">✓ يحدث التفاعل</span>
                    <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-xs font-black">{result.type}</span>
                    {result.name && <span className="text-lg font-black font-head text-slate-900">{result.name}</span>}
                    {result.approx && <span className="text-[11px] text-slate-400 font-bold">قيم طاقة تقريبية تعليمية</span>}
                    <span className="mr-auto flex gap-1.5">
                      <button onClick={() => { navigator.clipboard?.writeText(eqText(result.eq)); setCopied(true); setTimeout(() => setCopied(false), 1600); }} data-testid="eq-copy"
                        className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[11px] font-black text-slate-600 hover:bg-slate-100 transition">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "نُسخت!" : "نسخ المعادلة"}
                      </button>
                      <button onClick={() => { const t = eqText(result.eq); if (navigator.share) navigator.share({ title: "تفاعل كيميائي · مفكرو المستقبل", text: t }).catch(() => {}); else { navigator.clipboard?.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1600); } }} data-testid="eq-share"
                        className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[11px] font-black text-slate-600 hover:bg-slate-100 transition">
                        <Share2 className="w-3.5 h-3.5" /> مشاركة
                      </button>
                    </span>
                  </div>
                  <div className="ft-navy-gradient relative overflow-hidden rounded-3xl px-4 py-5 lg:py-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xl sm:text-2xl lg:text-[34px] ft-shadow" dir="ltr">
                    {result.eq.reactants.map(({ f, n }, i) => (
                      <span key={i} className="inline-flex items-baseline gap-1.5">
                        {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                        {n > 1 && <span className="text-cyan-300 font-black">{n}</span>}<Fx f={f} className="text-cyan-50" /><sub className="text-[11px] font-bold text-cyan-300/80">({stateOf(f)})</sub>
                      </span>
                    ))}
                    <ArrowLeft className="w-7 h-7 text-amber-300 mx-1 rotate-180 shrink-0" />
                    {result.eq.products.map(({ f, n }, i) => (
                      <span key={i} className="inline-flex items-baseline gap-1.5">
                        {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                        {n > 1 && <span className="text-emerald-300 font-black">{n}</span>}<Fx f={f} className="text-emerald-50" /><sub className="text-[11px] font-bold text-emerald-300/80">({stateOf(f)})</sub>
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Zap className="w-3.5 h-3.5 text-amber-500" /> طاقة التفاعل ΔH</div>
                      <div className="text-xl sm:text-2xl font-black font-head mt-1.5 text-slate-900" dir="ltr">{result.dH != null ? `${result.dH > 0 ? "+" : ""}${result.dH}` : "—"} <span className="text-xs text-slate-400">kJ/mol</span></div>
                      <div className={`text-xs font-black mt-1 ${result.dH < 0 ? "text-orange-600" : "text-sky-600"}`}>{result.dH != null ? (result.dH < 0 ? "طارد للحرارة · يطلق طاقة 🔥" : "ماصّ للحرارة · يبتلع طاقة ❄️") : "قيمة غير مقاسة"}</div>
                    </div>
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Thermometer className="w-3.5 h-3.5 text-red-500" /> حرارة قصوى تقريبية</div>
                      <div className="text-xl sm:text-2xl font-black font-head mt-1.5 text-slate-900" dir="ltr">{result.peak ? `${result.peak}°C` : "حرارة الغرفة"}</div>
                      <div className="text-xs font-bold text-slate-400 mt-1">{result.peak ? "حرارة اللهب/التفاعل عملياً" : "لا لهب في هذا التفاعل"}</div>
                    </div>
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Gauge className="w-3.5 h-3.5 text-cyan-600" /> شرط البدء</div>
                      <div className="text-lg font-black font-head mt-2 text-slate-900">{result.condUsed ? COND_LIST.find((c) => c.id === result.condUsed)?.ar : "يبدأ تلقائياً"}</div>
                      <div className="text-xs font-bold text-slate-400 mt-1">طاقة التنشيط اللازمة</div>
                    </div>
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Atom className="w-3.5 h-3.5 text-violet-500" /> حفظ الذرّات</div>
                      <div className="text-lg font-black font-head mt-2 text-slate-900">متوازن ✓</div>
                      <div className="text-xs font-bold text-slate-400 mt-1">عدد ذرات كل عنصر متساوٍ في الطرفين</div>
                    </div>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-3 mt-3">
                    <div className="rounded-3xl bg-cyan-50/70 ring-1 ring-cyan-100 p-4">
                      <div className="text-xs font-black text-cyan-800 mb-2">👀 ماذا ستلاحظ عملياً؟</div>
                      <ul className="space-y-1.5">
                        {result.obs?.map((o, i) => <li key={i} className="text-sm text-slate-700 leading-relaxed">· {o}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-3xl bg-amber-50/80 ring-1 ring-amber-100 p-4">
                      <div className="text-xs font-black text-amber-800 mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4" /> حقيقة مبهرة</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{result.fact}</p>
                    </div>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-3 mt-3">
                    <div className="rounded-3xl bg-white ring-1 ring-slate-100 ft-shadow p-4">
                      <div className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5"><Scale className="w-4 h-4 text-cyan-600" /> سجلّ حفظ الذرّات · لا شيء يختفي</div>
                      <div className="space-y-2">
                        {ledger.map(({ sym, r, p, el }) => (
                          <div key={sym} className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-xl grid place-items-center text-[12px] font-black text-slate-900 ring-1 ring-black/5 shrink-0" style={{ background: CATS[el.cat].color }}>{sym}</span>
                            <span className="text-xs font-bold text-slate-600 w-16 shrink-0">{el.ar}</span>
                            <span className="text-xs font-black text-cyan-700" dir="ltr">{r}</span>
                            <span className="flex-1 h-1.5 rounded-full bg-slate-100 relative overflow-hidden" dir="ltr">
                              <span className="absolute inset-y-0 right-0 bg-emerald-400/80 rounded-full transition-all" style={{ width: `${Math.max(r, p) ? (p / Math.max(r, p)) * 100 : 0}%` }} />
                            </span>
                            <span className="text-xs font-black text-emerald-700" dir="ltr">{p}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">✓ محفوظة</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold mt-3">عدد ذرات كل عنصر قبل التفاعل يساوي عدده بعده دائماً · هذا قانون حفظ الكتلة</p>
                    </div>
                    <div className="rounded-3xl bg-gradient-to-b from-violet-50/80 to-white ring-1 ring-violet-100 ft-shadow p-4">
                      <div className="text-xs font-black text-violet-800 mb-3 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> تحديات المختبر <span className="mr-auto text-[11px] font-black text-slate-400">{missions.length}/3 منجزة</span></div>
                      <div className="space-y-2">
                        {MISSIONS.map((m) => {
                          const done = missions.includes(m.id);
                          return (
                            <div key={m.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ${done ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-slate-100"}`}>
                              <span className="text-xl">{m.icon}</span>
                              <div className="min-w-0">
                                <div className="text-[13px] font-black text-slate-800">{m.title}</div>
                                <div className="text-[11px] text-slate-400 font-semibold leading-snug">{m.desc}</div>
                              </div>
                              <span className={`mr-auto text-[10px] font-black px-2 py-1 rounded-full shrink-0 ${done ? "bg-emerald-500 text-white" : "bg-slate-50 ring-1 ring-slate-200 text-slate-400"}`}>{done ? "أُنجزت 🏆" : "بانتظارك"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="font-head font-black text-slate-900 mb-3">بطاقات المواد بالتفصيل</div>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[...result.eq.reactants.map((s) => ({ ...s, side: "مادة متفاعلة", colCls: "ring-cyan-200/70 bg-cyan-50/40" })),
                        ...result.eq.products.map((s) => ({ ...s, side: "ناتج", colCls: "ring-emerald-200/70 bg-emerald-50/40" }))].map(({ f, side, colCls }, i) => {
                        const info = compoundInfo(f);
                        return (
                          <div key={i} className={`rounded-3xl ring-1 p-4 bg-white ${colCls}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Fx f={f} className="text-2xl text-slate-900" />
                                <div className="text-sm font-bold text-slate-600 mt-0.5">{info.meta?.ar || EL[f]?.ar || ""}</div>
                              </div>
                              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-900/[0.05] ring-1 ring-slate-200/70 text-slate-500">{side}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1.5">الكتلة المولية <b className="text-slate-800" dir="ltr">{info.molar} g/mol</b>{info.meta ? ` · ${info.meta.type}` : ""}</div>
                            {info.meta?.desc && <p className="text-xs text-slate-500 leading-relaxed mt-1">{info.meta.desc}</p>}
                            {HAZARD[f] && <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 ring-1 ring-amber-100 rounded-xl px-2.5 py-1.5"><ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" /> سلامة: {HAZARD[f]} · تجارب حقيقية فقط بإشراف معلّم</p>}
                            <div className="mt-3 space-y-1.5">
                              {info.parts.map((p) => (
                                <button key={p.sym} onClick={() => p.el && setElModal(p.el)} className="w-full flex items-center gap-2 group text-right">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10" style={{ background: p.el?.col || "#94a3b8" }} />
                                  <span className="text-xs font-bold text-slate-600 w-20 shrink-0 group-hover:text-emerald-700 transition">{p.el?.ar || p.sym} ×{p.n}</span>
                                  <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><span className="block h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.el?.col || "#94a3b8" }} /></span>
                                  <span className="text-[11px] font-black text-slate-400 w-10" dir="ltr">{p.pct}%</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {result.condUsed === "electric" && (
                    <div className="mt-6 rounded-3xl bg-gradient-to-b from-cyan-50/80 to-white ring-1 ring-cyan-100 p-4 sm:p-5" data-testid="electrolysis-card">
                      <div className="font-head font-black text-slate-900 mb-3">🔌 التحليل الكهربائي: ماذا يحدث عند القطبين؟</div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-4 text-center">
                          <div className="text-3xl">−</div>
                          <div className="text-[11px] font-black text-slate-400">القطب السالب (مهبط)</div>
                          <div className="font-black font-head text-cyan-800 mt-1">ينجذب إليه أيون الهيدروجين H⁺</div>
                          <div className="text-[12px] font-bold text-slate-500 mt-1">يتصاعد غاز الهيدروجين H₂ · <b>ضعف حجم</b> الأكسجين</div>
                        </div>
                        <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-4 text-center">
                          <div className="text-3xl">+</div>
                          <div className="text-[11px] font-black text-slate-400">القطب الموجب (مصعد)</div>
                          <div className="font-black font-head text-cyan-800 mt-1">ينجذب إليه أيون الهيدروكسيد OH⁻</div>
                          <div className="text-[12px] font-bold text-slate-500 mt-1">يتصاعد غاز الأكسجين O₂ · نصف حجم الهيدروجين</div>
                        </div>
                      </div>
                      <p className="text-[11.5px] text-slate-400 font-semibold mt-3">النسبة 2:1 هي بصمة معادلة الماء نفسها (H₂O) · وبها اكتشف العلماء تركيب الماء أصلاً.</p>
                    </div>
                  )}
                  {result.eq.products.some(({ f }) => GAS_TEST[f]) && (
                    <div className="mt-6" data-testid="gas-tests">
                      <div className="font-head font-black text-slate-900 mb-3">🔬 اختبر الغازات الناتجة كالمحقق العلمي</div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {result.eq.products.filter(({ f }) => GAS_TEST[f]).map(({ f }) => <GasTestCard key={f} f={f} runId={runId} />)}
                      </div>
                    </div>
                  )}
                  {involvedElements.length > 0 && (
                    <div className="mt-6">
                      <div className="font-head font-black text-slate-900 mb-2.5">العناصر المشاركة · اضغط أي عنصر لملفّه الكامل</div>
                      <div className="flex flex-wrap gap-2">
                        {involvedElements.map((el) => (
                          <button key={el.sym} onClick={() => setElModal(el)} className="pressable flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl bg-white ring-1 ring-slate-200 hover:ring-emerald-300 hover:scale-[1.04] transition ft-shadow">
                            <span className="w-8 h-8 rounded-xl grid place-items-center text-[13px] font-black text-slate-900 ring-1 ring-black/5" style={{ background: CATS[el.cat].color }}>{el.sym}</span>
                            <span className="text-xs font-bold text-slate-700">{el.ar}</span>
                            <span className="text-[10px] text-slate-400 font-bold" dir="ltr">Z={el.z}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 lg:p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 ring-1 ring-rose-100 grid place-items-center"><Ban className="w-8 h-8 text-rose-500" /></div>
                  <div className="text-xl lg:text-2xl font-black font-head text-slate-900 mt-4">لا يحدث تفاعل هنا</div>
                  <p className="text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed text-sm lg:text-base">{result.reason}</p>
                  {result.tip && <p className="text-emerald-700 text-sm font-bold mt-2">💡 {result.tip}</p>}
                  {result.needs && (
                    <button onClick={() => { setCond(result.needs); run(tray, result.needs); }}
                      className="pressable mt-4 px-5 py-3 rounded-2xl bg-gradient-to-l from-amber-400 to-orange-500 text-slate-950 font-head font-black ft-shadow hover:scale-[1.03] active:scale-95 transition">
                      فعّل «{COND_LIST.find((c) => c.id === result.needs)?.ar}» وشغّل الآن
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Link to="/clubs/science/tools" data-testid="lab-tools-entry"
          className="group mt-8 relative block overflow-hidden rounded-[1.75rem] sm:rounded-3xl text-white ft-shadow-lg hover:scale-[1.004] transition-transform">
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-600 via-teal-700 to-cyan-700" />
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(50%_120%_at_85%_10%,rgba(255,255,255,0.35),transparent),radial-gradient(40%_100%_at_10%_90%,rgba(52,211,153,0.45),transparent)]" />
          <div className="relative p-5 sm:p-7 flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] bg-white/15 border border-white/25 backdrop-blur grid place-items-center text-4xl sm:text-5xl shrink-0 shadow-inner group-hover:rotate-6 transition-transform">🧑‍🔬</div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black tracking-wide text-emerald-100/90">صفحة جديدة كاملة</div>
              <div className="text-xl sm:text-3xl font-black mt-0.5 leading-snug">المختبر العلمي الكبير · أدوات وتجارب</div>
              <p className="text-emerald-50/85 text-[13px] sm:text-sm mt-1 leading-relaxed">الحموضة واللهب وبنّاء الذرة والمولات ومنحنى التسخين وسلسلة النشاط والاتجاهات الدورية ومكتبة تجارب كلاسيكية</p>
            </div>
            <span className="hidden sm:grid w-12 h-12 rounded-full bg-white text-emerald-700 place-items-center font-black text-lg shrink-0 shadow-lg group-hover:-translate-x-1 transition-transform">←</span>
          </div>
        </Link>

        {/* ===== أبطال المختبر: صدارة واكتشافات وأوسمة ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 grid place-items-center ft-shadow"><Trophy className="w-5 h-5 text-white" /></span>
            <div>
              <div className="font-head font-black text-xl text-slate-900">أبطال المختبر</div>
              <div className="text-[12px] text-slate-400 font-bold">كل تفاعل يرفع خبرتك هنا وبمنصة المنصة كاملة · ويقرّب مدرستك من كأس الموسم</div>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5" data-testid="lab-board">
              <div className="font-head font-black text-slate-900 mb-1">🏅 لوحة صدارة نادي العلوم</div>
              <p className="text-[11px] text-slate-400 font-bold mb-3">نفس لوحة النادي الرسمية · خبرة المختبر تصعد بك فيها تلقائياً</p>
              <div className="space-y-2">
                {board.slice(0, 10).map((u) => (
                  <div key={u.id} className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 ring-1 ${u.me ? "bg-emerald-50 ring-emerald-300" : u.rank <= 3 ? "bg-amber-50/70 ring-amber-100" : "bg-slate-50/60 ring-slate-100"}`}>
                    <span className={`w-7 h-7 grid place-items-center rounded-full text-[11px] font-black shrink-0 ${u.rank === 1 ? "bg-amber-400 text-slate-950" : u.rank === 2 ? "bg-slate-300 text-slate-800" : u.rank === 3 ? "bg-orange-300 text-slate-900" : "bg-white ring-1 ring-slate-200 text-slate-500"}`}>{u.rank}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-slate-800 truncate">{u.name} {u.me && <span className="text-emerald-600">(أنت)</span>}</span>
                      <span className="block text-[10.5px] text-slate-400 font-bold truncate">{u.school_name || u.level_title}</span>
                    </span>
                    <span className="mr-auto text-left shrink-0">
                      <span className="block text-[13px] font-black text-slate-900" dir="ltr">{u.xp ?? u.lab_xp} XP</span>
                      <span className="block text-[10px] text-slate-400 font-bold">مختبر: {u.discoveries} مادة · {u.runs} تجربة</span>
                    </span>
                  </div>
                ))}
                {board.length === 0 && <p className="text-[13px] text-slate-400 font-bold text-center py-4">كن أول كيميائي على اللوحة · شغّل تفاعلك الأول 🧪</p>}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5" data-testid="lab-codex">
              <div className="flex items-center justify-between mb-1">
                <div className="font-head font-black text-slate-900">📖 دفتر الاكتشافات</div>
                <span className="text-[11px] font-black text-slate-400">{(me?.discoveries || []).length}/{CODEX_UNIVERSE.length} مادة</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3" dir="ltr">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full transition-all" style={{ width: `${((me?.discoveries || []).length / CODEX_UNIVERSE.length) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-0.5">
                {CODEX_UNIVERSE.map((f) => {
                  const found = (me?.discoveries || []).includes(f);
                  return (
                    <span key={f} className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl text-[11px] font-black ring-1 ${found ? "bg-emerald-50 ring-emerald-200 text-emerald-800" : "bg-slate-50 ring-slate-100 text-slate-300"}`}>
                      <Fx f={f} className={found ? "text-emerald-900" : "text-slate-300"} />{found ? "" : " ؟؟؟"}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-3">كل مادة جديدة تكتشفها داخل تفاعل تساوي خبرة إضافية · العناصر المدروسة: {(me?.elements || []).length}</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5" data-testid="lab-badges">
              <div className="font-head font-black text-slate-900 mb-3">🎖️ أوسمة الكيميائي</div>
              <div className="grid grid-cols-3 gap-2">
                {(me?.badges || []).map((b) => (
                  <div key={b.key} className={`rounded-2xl p-2.5 text-center ring-1 transition ${b.earned ? "bg-gradient-to-b from-amber-50 to-white ring-amber-200 ft-shadow" : "bg-slate-50/70 ring-slate-100 opacity-55"}`} title={b.desc}>
                    <div className={`text-2xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</div>
                    <div className="text-[10.5px] font-black text-slate-700 leading-tight mt-1">{b.title}</div>
                    <div className="text-[9px] text-slate-400 font-bold leading-snug mt-0.5">{b.desc}</div>
                  </div>
                ))}
                {!me && <p className="col-span-3 text-[13px] text-slate-400 font-bold text-center py-3">جارٍ تحميل أوسمتك…</p>}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-[86px] sm:bottom-24 left-1/2 -translate-x-1/2 z-[80] w-[min(700px,calc(100vw-20px))] overflow-hidden rounded-[1.75rem] ft-shadow-lg" data-testid="xp-toast">
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-l from-amber-300/55 via-rose-300/40 to-violet-300/50" />
              <span className="pointer-events-none absolute inset-0 backdrop-blur-2xl bg-white/55" />
              <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/70 rounded-[1.75rem]" />
              <span className="relative flex items-center gap-3 px-5 py-3.5 w-full">
              <span className="text-2xl sm:text-3xl">⭐</span>
              <div className="text-[13px] font-bold leading-snug">
                <span className="font-black text-amber-700">+{toast.gained} خبرة مختبر</span>
                {toast.species?.length > 0 && <span className="block text-slate-600">اكتشاف جديد: {toast.species.slice(0, 3).join(" · ")}</span>}
                {toast.badges?.map((b) => <span key={b.key} className="block text-slate-200">وسام جديد: {b.icon} {b.title}</span>)}
                {toast.daily && <span className="block text-emerald-700 font-black">تحدي اليوم أُنجز 🏆</span>}
              </div>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 rounded-3xl bg-gradient-to-l from-emerald-50 via-white to-cyan-50 ring-1 ring-emerald-100 ft-shadow p-5 flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            <b className="text-slate-900 font-head">كيف يعمل المختبر؟</b> اختر حتى 3 مواد من الجدول الدوري بالأعلى أو جدول المركبات تحته، حدّد شرط البدء إن لزم (شرارة للاحتراق · كهرباء لتحليل الماء · ضوء للبناء الضوئي)، ثم شغّل التفاعل. ستشاهد الذرّات نفسها تنفصل عن المتفاعلات وتعيد ترتيب نفسها إلى نواتج · لأن الذرّات لا تُخلق ولا تفنى في التفاعل الكيميائي. القيم الطاقية أرقام كتب مدرسية تقريبية للتعليم.
          </p>
        </div>
      </div>
      <AnimatePresence>{elModal && <ElementModal el={elModal} onClose={() => setElModal(null)} onAdd={addElement} />}</AnimatePresence>
    </Layout>
  );
}

function ElementTile({ el, tray, onAdd, onInfo, fBlock, dim }) {
  const active = tray.some((x) => x.f === (DIATOMIC[el.sym] || el.sym));
  return (
    <div className={`relative group transition-opacity duration-200 ${dim ? "opacity-[0.16] saturate-0" : ""}`} style={fBlock ? undefined : { gridColumn: `${el.g}`, gridRow: `${el.p}` }}>
      <button onClick={() => onAdd(el)} data-testid={`el-${el.sym}`} title={el.ar}
        className={`pressable w-full aspect-[0.92] rounded-[7px] lg:rounded-[9px] flex flex-col items-center justify-center ring-1 ring-black/5 transition-all duration-150 hover:scale-[1.16] hover:z-10 hover:ft-shadow-lg active:scale-95 ${active ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-white scale-[1.07]" : ""}`}
        style={{ background: `linear-gradient(150deg, ${CATS[el.cat].color}, ${CATS[el.cat].color}c9)` }}>
        <span className="text-[7px] lg:text-[8px] font-black text-slate-900/60 leading-none">{el.z}</span>
        <span className="text-[13px] lg:text-[17px] font-black text-slate-900 leading-tight">{el.sym}</span>
        <span className="text-[6px] lg:text-[7.5px] font-bold text-slate-900/70 leading-none px-0.5 text-center line-clamp-1">{el.ar}</span>
      </button>
      <button onClick={() => onInfo(el)} aria-label={`معلومات ${el.ar}`}
        className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-900 text-cyan-200 grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition z-20 ring-1 ring-white/40 ft-shadow">
        <Info className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

const PickerDeck = React.memo(function PickerDeck({ tray, cond, onCond, onAddItem, onAddElement, onRemove, onClear, onRun, onSurprise, onInfo }) {
  const [tab, setTab] = useState("table");
  const [elQuery, setElQuery] = useState("");
  const [catFilter, setCatFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [compType, setCompType] = useState("الكل");
  const COMP_TYPES = ["الكل", ...new Set(COMPOUNDS.map((c) => c.type))];
  const shownCompounds = COMPOUNDS.filter((c) => (compType === "الكل" || c.type === compType) && (!query || c.ar.includes(query) || c.f.toLowerCase().includes(query.toLowerCase())));
  const elDim = (el) => {
    const q = elQuery.trim().toLowerCase();
    const hitQ = !q || el.ar.includes(elQuery.trim()) || el.sym.toLowerCase() === q || String(el.z) === q || el.enName.toLowerCase().includes(q);
    const hitC = !catFilter || el.cat === catFilter;
    return !(hitQ && hitC);
  };
  const trayName = (f) => COMPOUNDS.find((c) => c.f === f)?.ar || (EL[f] ? EL[f].ar : (DIATOMIC_REV[f] ? EL[DIATOMIC_REV[f]]?.ar : ""));
  const shownCount = ELEMENTS.filter((e) => !elDim(e)).length;
  return (
        <div className="bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-l from-emerald-400 via-cyan-400 to-violet-400" />
          <div className="p-4 sm:p-6 pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-head font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
                  <MousePointerClick className="w-6 h-6 text-emerald-600" /> اختر موادّك
                </div>
                <p className="text-[12.5px] sm:text-[13px] text-slate-500 font-semibold mt-1">حتى 3 مواد من الجدول الدوري أو المركبات · زر ⓘ يفتح ملف العنصر الكامل</p>
              </div>
              <div className="bg-slate-50 rounded-2xl ring-1 ring-slate-200/80 p-1.5 grid grid-cols-2 md:flex gap-1 w-full md:w-auto">
                <button onClick={() => setTab("table")} data-testid="tab-table"
                  className={`pressable min-h-[46px] px-3 sm:px-6 py-2.5 rounded-xl text-[13px] sm:text-sm font-black transition-all ${tab === "table" ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-emerald-500 to-teal-600" : "text-slate-500 hover:text-slate-900 hover:bg-white"}`}>
                  <Atom className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> الجدول الدوري · 118
                </button>
                <button onClick={() => setTab("compounds")} data-testid="tab-compounds"
                  className={`pressable min-h-[46px] px-3 sm:px-6 py-2.5 rounded-xl text-[13px] sm:text-sm font-black transition-all ${tab === "compounds" ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-emerald-500 to-teal-600" : "text-slate-500 hover:text-slate-900 hover:bg-white"}`}>
                  <Beaker className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> المركبات الشائعة · 40+
                </button>
              </div>
            </div>
          </div>

          {tab === "table" ? (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4">
                <label className="relative block w-full xl:w-80 shrink-0">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={elQuery} onChange={(e) => setElQuery(e.target.value)} placeholder="ابحث: حديد · Fe · 26"
                    className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-emerald-300 focus:bg-white transition" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setCatFilter(null)}
                    className={`pressable shrink-0 px-3 py-2 rounded-xl text-[12px] font-black transition ${!catFilter ? "bg-slate-900 text-white ft-shadow" : "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:bg-slate-100"}`}>كل الفئات</button>
                  {Object.entries(CATS).map(([k, v]) => (
                    <button key={k} onClick={() => setCatFilter(catFilter === k ? null : k)} data-testid={`cat-${k}`}
                      className={`pressable shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-black transition ${catFilter === k ? "text-slate-900 ft-shadow scale-[1.03]" : "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:bg-slate-100"}`}
                      style={catFilter === k ? { background: v.color } : undefined}>
                      <span className="w-2.5 h-2.5 rounded ring-1 ring-black/10" style={{ background: v.color }} /> {v.ar}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-50/70 ring-1 ring-slate-100 p-3 sm:p-4 overflow-x-auto">
                <div className="min-w-[640px] sm:min-w-[820px]">
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(18, minmax(0,1fr))" }} dir="ltr">
                    {ELEMENTS.filter((e) => e.g > 0).sort((a, b) => a.p - b.p || a.g - b.g).map((el) => (
                      <ElementTile key={el.z} el={el} tray={tray} onAdd={onAddElement} onInfo={onInfo} dim={elDim(el)} />
                    ))}
                  </div>
                  <div className="grid gap-[3px] mt-3" style={{ gridTemplateColumns: "repeat(15, minmax(0,1fr))" }} dir="ltr">
                    {ELEMENTS.filter((e) => e.g === 0 && e.z < 89).map((el) => <ElementTile key={el.z} el={el} tray={tray} onAdd={onAddElement} onInfo={onInfo} fBlock dim={elDim(el)} />)}
                    {ELEMENTS.filter((e) => e.g === 0 && e.z >= 89).map((el) => <ElementTile key={el.z} el={el} tray={tray} onAdd={onAddElement} onInfo={onInfo} fBlock dim={elDim(el)} />)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] font-bold text-slate-400">
                <span>الألوان حسب فئة العنصر الكيميائية · اضغط الفئة بالأعلى لعزلها</span>
                <span className="sm:hidden px-2 py-0.5 rounded-full bg-slate-900/[0.04] ring-1 ring-slate-200/70">مرّر الجدول أفقياً ↔</span>
                <span className="mr-auto" dir="ltr">{ELEMENTS.filter((e) => !elDim(e)).length} / 118</span>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4">
                <label className="relative block w-full xl:w-80 shrink-0">
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن مركب… (ماء · حمض · ملح)"
                    className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-emerald-300 focus:bg-white transition" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMP_TYPES.map((t) => (
                    <button key={t} onClick={() => setCompType(t)}
                      className={`pressable shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-black transition ${compType === t ? "bg-slate-900 text-white ft-shadow scale-[1.03]" : "bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:bg-slate-100"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
                {shownCompounds.map((c) => {
                  const info = compoundInfo(c.f);
                  const inTray = tray.some((x) => x.f === c.f);
                  return (
                    <button key={c.f} onClick={() => onAddItem(c.f)} data-testid={`comp-${c.f}`}
                      className={`pressable min-w-0 text-right rounded-3xl ring-1 p-3.5 sm:p-4 transition hover:-translate-y-1 active:scale-95 ${inTray ? "bg-emerald-50 ring-emerald-300 ft-shadow" : "bg-white ring-slate-100 ft-shadow hover:ring-emerald-200"}`}>
                      <div className="flex items-start justify-between">
                        <Fx f={c.f} className="text-xl text-slate-900" />
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">{c.type}</span>
                      </div>
                      <div className="font-bold text-sm text-slate-800 mt-1.5 leading-snug">{c.ar}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-2">{c.desc}</p>
                      <div className="text-[11px] text-slate-400 font-bold mt-1.5" dir="ltr">{info.molar} g/mol</div>
                      <div className="flex gap-1 mt-2" dir="ltr">
                        {info.parts.map((p) => <span key={p.sym} className="w-5 h-5 rounded-md grid place-items-center text-[8px] font-black text-slate-900 ring-1 ring-black/5" style={{ background: p.el?.col || "#94a3b8" }}>{p.sym}</span>)}
                      </div>
                    </button>
                  );
                })}
                {shownCompounds.length === 0 && <div className="col-span-full text-center text-slate-400 font-bold text-sm py-8">لا مركبات مطابقة · جرّب كلمة أخرى</div>}
              </div>
            </div>
          )}

          {/* control bar: tray + condition + run */}
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 ml-1"><Beaker className="w-4 h-4 text-emerald-600" /> المفاعلات</span>
              <AnimatePresence>
                {tray.map(({ f }) => (
                  <motion.span key={f} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                    className="inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-2xl bg-white ring-1 ring-emerald-300 ft-shadow">
                    <Fx f={f} className="text-emerald-800" />
                    <span className="text-xs font-bold text-slate-500">{trayName(f) || ""}</span>
                    <button onClick={() => onRemove(f)} className="w-5 h-5 grid place-items-center rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white transition"><X className="w-3 h-3" /></button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {tray.length === 0 && <span className="text-slate-400 text-[13px] font-semibold">لم تختر شيئاً بعد · اضغط أي عنصر أو مركب بالأعلى</span>}
              {tray.length > 0 && <button onClick={onClear} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition mr-1">مسح الكل</button>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3.5">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 ml-1 w-full sm:w-auto"><Zap className="w-4 h-4 text-amber-500" /> شرط البدء</span>
              {COND_LIST.map((c) => (
                <button key={String(c.id)} onClick={() => onCond(c.id)} data-testid={`cond-${c.id || "none"}`}
                  className={`pressable px-3 py-2 rounded-xl text-[12.5px] font-black transition ${cond === c.id ? "bg-amber-400 text-slate-950 ft-shadow scale-[1.04]" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                  {c.icon} {c.ar}
                </button>
              ))}
              <div className="grid grid-cols-[auto_1fr] sm:flex gap-2 w-full sm:w-auto sm:mr-auto mt-1 sm:mt-0">
                <button onClick={onSurprise} data-testid="lab-surprise"
                  className="pressable flex items-center justify-center gap-2 px-4 py-3.5 sm:py-3 rounded-2xl bg-white ring-1 ring-violet-200 text-violet-700 font-head font-black text-sm ft-shadow hover:scale-[1.03] active:scale-95 transition">
                  <Dices className="w-5 h-5" /> فاجئني
                </button>
                <button onClick={onRun} data-testid="lab-run"
                  className="pressable flex items-center justify-center gap-2 px-6 lg:px-8 py-3.5 sm:py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 font-head font-black text-white ft-shadow hover:scale-[1.03] active:scale-95 transition disabled:opacity-40" disabled={!tray.length}>
                  <Play className="w-5 h-5" /> شغّل التفاعل
                </button>
              </div>
            </div>
          </div>
        </div>

        
  );
});

function GasTestCard({ f, runId }) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => setDone(false), [runId, f]);
  const g = GAS_TEST[f];
  return (
    <div className="rounded-3xl bg-white ring-1 ring-slate-100 ft-shadow p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-3xl">{g.icon}</span>
        <div>
          <Fx f={f} className="text-lg text-slate-900" />
          <div className="text-[11px] font-black text-slate-400">اختبار الكشف الكلاسيكي</div>
        </div>
      </div>
      <p className="text-[12.5px] text-slate-500 font-semibold leading-relaxed mt-2.5">{g.test}</p>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.p key="p" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[12.5px] font-black px-3 py-2.5">{g.pass}</motion.p>
        ) : (
          <motion.button key="b" exit={{ opacity: 0 }} onClick={() => setDone(true)} className="pressable mt-3 w-full py-2.5 rounded-2xl bg-slate-900 text-white text-[12.5px] font-head font-black active:scale-95 transition">نفّذ الاختبار</motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
