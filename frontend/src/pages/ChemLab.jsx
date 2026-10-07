import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Atom, Play, Pause, RotateCcw, Plus, X, Info, Thermometer,
  Zap, Sparkles, ArrowLeft, Beaker, Lightbulb, Ban, Gauge, ChevronLeft,
} from "lucide-react";
import { Layout } from "@/components/Layout";
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
              <div className="text-slate-500 text-sm font-semibold" dir="ltr">{el.en}</div>
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
  const [tab, setTab] = useState("table"); // table (top) | compounds (under it)
  const [elModal, setElModal] = useState(null);
  const [temp, setTemp] = useState(25);
  const [phase, setPhase] = useState("idle");
  const [query, setQuery] = useState("");
  const stageRef = useRef(null);

  const addItem = (f) => {
    setTray((t) => (t.some((x) => x.f === f) || t.length >= 3 ? t : [...t, { f }]));
    setResult(null);
  };
  const addElement = (el) => addItem(DIATOMIC[el.sym] || el.sym);
  const removeItem = (f) => { setTray((t) => t.filter((x) => x.f !== f)); setResult(null); };

  const run = (items = tray, c = cond) => {
    if (!items.length) return;
    const r = predict(items, c);
    setResult(r); setRunId((x) => x + 1); setPlaying(true); setTemp(25); setPhase("approach");
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const applyPreset = (p) => {
    const items = p.items.map((f) => ({ f }));
    setTray(items); setCond(p.cond); run(items, p.cond);
  };

  const involvedElements = useMemo(() => {
    if (!result?.eq) return [];
    const set = new Set();
    [...result.eq.reactants, ...result.eq.products].forEach(({ f }) => Object.keys(parseFormula(f)).forEach((s) => set.add(s)));
    return [...set].map((s) => EL[s]).filter(Boolean);
  }, [result]);

  const shownCompounds = COMPOUNDS.filter((c) => !query || c.ar.includes(query) || c.f.toLowerCase().includes(query.toLowerCase()));
  const trayName = (f) => COMPOUNDS.find((c) => c.f === f)?.ar || (EL[f] ? EL[f].ar : (DIATOMIC_REV[f] ? EL[DIATOMIC_REV[f]]?.ar : ""));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24" dir="rtl">
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
                <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black mt-3 leading-tight">محاكي التفاعلات <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 to-emerald-300">الكيميائية</span></h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">اختر أي عنصر أو مركب · وشاهد التفاعل يحدث أمامك ثلاثي الأبعاد ذرّةً ذرّة، مع المعادلة والطاقة والحرارة وتفاصيل كل مادة</p>
              </div>
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <div className="text-center px-4 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">118</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">عنصراً</div>
                </div>
                <div className="text-center px-4 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">40+</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">مركباً شائعاً</div>
                </div>
                <div className="text-center px-4 sm:px-5 py-3 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-xl sm:text-2xl font-black font-head">3D</div>
                  <div className="text-[10px] text-slate-300 font-bold mt-0.5">محاكاة ذرية</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)} data-testid={`preset-${p.items.join("-")}`}
                  className="pressable px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[13px] font-bold hover:bg-white/20 active:scale-95 transition">{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== simulation stage ===== */}
        <div ref={stageRef} className="relative mt-6 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
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
          <div className="h-[340px] sm:h-[440px] lg:h-[520px] bg-[radial-gradient(70%_100%_at_50%_0%,#f0f9ff_0%,#ffffff_55%,#f5f3ff_100%)]">
            <SimCanvas result={result} runId={runId} playing={playing} onTemp={setTemp} onPhase={setPhase} light />
          </div>
          <div className="relative border-t border-slate-100 bg-white px-3 py-3 lg:px-5 flex flex-wrap items-center gap-2 lg:gap-3">
            <button onClick={() => run()} data-testid="lab-run"
              className="pressable flex items-center gap-2 px-5 lg:px-7 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 font-head font-black text-white ft-shadow hover:scale-[1.03] active:scale-95 transition disabled:opacity-40" disabled={!tray.length}>
              <Play className="w-5 h-5" /> شغّل التفاعل
            </button>
            <button onClick={() => setPlaying((p) => !p)} className="pressable w-11 h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition" title={playing ? "إيقاف" : "تشغيل"}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => { setRunId((x) => x + 1); setPlaying(true); }} className="pressable w-11 h-11 grid place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 transition" title="إعادة">
              <RotateCcw className="w-5 h-5" />
            </button>
            <span className="text-[11px] text-slate-400 font-bold mr-auto hidden sm:block">اسحب المشهد لتدويره ثلاثي الأبعاد 🖱️</span>
          </div>
        </div>

        {/* ===== tray + conditions ===== */}
        <div className="mt-5 grid lg:grid-cols-[1fr_auto] gap-4 items-stretch">
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-head font-black text-slate-900 flex items-center gap-2"><Beaker className="w-5 h-5 text-emerald-600" /> المفاعلات <span className="text-slate-400 text-xs font-bold">(حتى 3 مواد)</span></div>
              {tray.length > 0 && <button onClick={() => { setTray([]); setResult(null); }} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition">مسح الكل</button>}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[52px]">
              <AnimatePresence>
                {tray.map(({ f }) => (
                  <motion.span key={f} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                    className="inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                    <Fx f={f} className="text-emerald-800" />
                    <span className="text-xs font-bold text-slate-500">{trayName(f) || ""}</span>
                    <button onClick={() => removeItem(f)} className="w-5 h-5 grid place-items-center rounded-full bg-white ring-1 ring-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white transition"><X className="w-3 h-3" /></button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {tray.length === 0 && <span className="text-slate-400 text-sm font-semibold self-center">لم تختر شيئاً بعد · اضغط أي عنصر من الجدول الدوري أو مركب من الجدول بالأسفل</span>}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
            <div className="font-head font-black text-slate-900 mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> شرط البدء</div>
            <div className="flex flex-wrap gap-1.5">
              {COND_LIST.map((c) => (
                <button key={String(c.id)} onClick={() => setCond(c.id)} data-testid={`cond-${c.id || "none"}`}
                  className={`pressable px-3 py-2 rounded-xl text-[13px] font-black transition ${cond === c.id ? "bg-amber-400 text-slate-950 ft-shadow scale-[1.04]" : "bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                  {c.icon} {c.ar}
                </button>
              ))}
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
                  </div>
                  <div className="ft-navy-gradient relative overflow-hidden rounded-3xl px-4 py-5 lg:py-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xl sm:text-2xl lg:text-[34px] ft-shadow" dir="ltr">
                    {result.eq.reactants.map(({ f, n }, i) => (
                      <span key={i} className="inline-flex items-baseline gap-1.5">
                        {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                        {n > 1 && <span className="text-cyan-300 font-black">{n}</span>}<Fx f={f} className="text-cyan-50" />
                      </span>
                    ))}
                    <ArrowLeft className="w-7 h-7 text-amber-300 mx-1 rotate-180 shrink-0" />
                    {result.eq.products.map(({ f, n }, i) => (
                      <span key={i} className="inline-flex items-baseline gap-1.5">
                        {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                        {n > 1 && <span className="text-emerald-300 font-black">{n}</span>}<Fx f={f} className="text-emerald-50" />
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Zap className="w-3.5 h-3.5 text-amber-500" /> طاقة التفاعل ΔH</div>
                      <div className="text-2xl font-black font-head mt-1.5 text-slate-900" dir="ltr">{result.dH != null ? `${result.dH > 0 ? "+" : ""}${result.dH}` : "—"} <span className="text-xs text-slate-400">kJ/mol</span></div>
                      <div className={`text-xs font-black mt-1 ${result.dH < 0 ? "text-orange-600" : "text-sky-600"}`}>{result.dH != null ? (result.dH < 0 ? "طارد للحرارة · يطلق طاقة 🔥" : "ماصّ للحرارة · يبتلع طاقة ❄️") : "قيمة غير مقاسة"}</div>
                    </div>
                    <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500"><Thermometer className="w-3.5 h-3.5 text-red-500" /> حرارة قصوى تقريبية</div>
                      <div className="text-2xl font-black font-head mt-1.5 text-slate-900" dir="ltr">{result.peak ? `${result.peak}°C` : "حرارة الغرفة"}</div>
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

        {/* ===== pickers · periodic table on top, compounds under it ===== */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 ft-shadow p-1.5 flex gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setTab("table")} data-testid="tab-table"
            className={`pressable shrink-0 min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "table" ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-emerald-500 to-teal-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>
            <Atom className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> الجدول الدوري
          </button>
          <button onClick={() => setTab("compounds")} data-testid="tab-compounds"
            className={`pressable shrink-0 min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "compounds" ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-emerald-500 to-teal-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>
            <Beaker className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> المركبات الشائعة
          </button>
          <span className="hidden md:inline-flex items-center text-[11px] font-bold text-slate-400 px-3">اضغط أي عنصر أو مركب لإضافته إلى المفاعلات · وزر ⓘ يفتح الملف الكامل</span>
        </div>

        {tab === "table" ? (
          <div className="mt-4 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow p-3 sm:p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="font-head font-black text-slate-900">الجدول الدوري · 118 عنصراً</div>
              <span className="text-[11px] font-bold text-slate-400">مرتّبة حسب العدد الذري ومجموعاتها الكيميائية</span>
            </div>
            <div className="min-w-[820px]">
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(18, minmax(0,1fr))" }} dir="ltr">
                {ELEMENTS.filter((e) => e.g > 0).sort((a, b) => a.p - b.p || a.g - b.g).map((el) => (
                  <ElementTile key={el.z} el={el} tray={tray} onAdd={addElement} onInfo={setElModal} />
                ))}
              </div>
              <div className="grid gap-[3px] mt-3" style={{ gridTemplateColumns: "repeat(15, minmax(0,1fr))" }} dir="ltr">
                {ELEMENTS.filter((e) => e.g === 0 && e.z < 89).map((el) => <ElementTile key={el.z} el={el} tray={tray} onAdd={addElement} onInfo={setElModal} fBlock />)}
                {ELEMENTS.filter((e) => e.g === 0 && e.z >= 89).map((el) => <ElementTile key={el.z} el={el} tray={tray} onAdd={addElement} onInfo={setElModal} fBlock />)}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {Object.entries(CATS).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-100 text-[11px] font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded ring-1 ring-black/5" style={{ background: v.color }} /> {v.ar}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="font-head font-black text-slate-900">مركبات شائعة من حياتنا اليومية</div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن مركب… (ماء · حمض · ملح)"
                className="w-full sm:w-72 px-4 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-emerald-300 transition" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {shownCompounds.map((c) => {
                const info = compoundInfo(c.f);
                const inTray = tray.some((x) => x.f === c.f);
                return (
                  <button key={c.f} onClick={() => addItem(c.f)} data-testid={`comp-${c.f}`}
                    className={`pressable text-right rounded-3xl ring-1 p-4 transition hover:-translate-y-1 active:scale-95 ${inTray ? "bg-emerald-50 ring-emerald-300 ft-shadow" : "bg-white ring-slate-100 ft-shadow hover:ring-emerald-200"}`}>
                    <div className="flex items-start justify-between">
                      <Fx f={c.f} className="text-xl text-slate-900" />
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">{c.type}</span>
                    </div>
                    <div className="font-bold text-sm text-slate-800 mt-1.5 leading-snug">{c.ar}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-1" dir="ltr">{info.molar} g/mol</div>
                    <div className="flex gap-1 mt-2.5" dir="ltr">
                      {info.parts.map((p) => <span key={p.sym} className="w-5 h-5 rounded-md grid place-items-center text-[8px] font-black text-slate-900 ring-1 ring-black/5" style={{ background: p.el?.col || "#94a3b8" }}>{p.sym}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

function ElementTile({ el, tray, onAdd, onInfo, fBlock }) {
  const active = tray.some((x) => x.f === (DIATOMIC[el.sym] || el.sym));
  return (
    <div className="relative group" style={fBlock ? undefined : { gridColumn: `${el.g}`, gridRow: `${el.p}` }}>
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
