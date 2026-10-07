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

function Fx({ f, className = "" }) {
  // formula with subscripts: H2SO4 -> H<sub>2</sub>SO<sub>4</sub>
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
      className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[28px] overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
        <div className="p-6 relative" style={{ background: `linear-gradient(135deg, ${CATS[el.cat].color}33, transparent 60%)` }}>
          <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="w-4 h-4" /></button>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-3xl grid place-items-center shadow-xl shrink-0" style={{ background: CATS[el.cat].color }}>
              <div className="text-center">
                <div className="text-[11px] font-black text-slate-900/60">{el.z}</div>
                <div className="text-4xl font-black text-slate-900 leading-none">{el.sym}</div>
                <div className="text-[10px] font-bold text-slate-900/70 mt-0.5">{el.mass}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black text-white">{el.ar}</div>
              <div className="text-slate-400 text-sm font-semibold" dir="ltr">{el.en}</div>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: CATS[el.cat].color + "33", color: CATS[el.cat].color, border: `1px solid ${CATS[el.cat].color}66` }}>{CATS[el.cat].ar}</span>
            </div>
          </div>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed">{el.desc}</p>
        </div>
        <div className="p-5 grid grid-cols-3 gap-2.5 text-center">
          {[["العدد الذري", el.z], ["الكتلة الذرية", el.mass], ["الحالة", el.state === "g" ? "غاز" : el.state === "l" ? "سائل" : "صلب"],
            ["المجموعة", el.g || "f"], ["الدورة", el.p], ["الكهروسلبية", el.en ?? "—"],
            ["الانصهار °م", el.melt ?? "—"], ["الغليان °م", el.boil ?? "—"], ["إلكترونات الغلاف الأخير", sh[sh.length - 1]]]
            .map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/[0.05] border border-white/[0.07] py-2.5 px-1">
                <div className="text-base font-black text-white" dir="ltr">{v}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">{k}</div>
              </div>
            ))}
        </div>
        <div className="px-5 pb-2">
          <div className="text-[11px] font-black text-slate-400 mb-2">التوزيع الإلكتروني بالأغلفة</div>
          <div className="flex items-end gap-3" dir="ltr">
            {sh.map((n, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex flex-wrap justify-center gap-[3px] w-12 min-h-[14px]">
                  {Array.from({ length: n }).map((_, j) => <span key={j} className="w-[7px] h-[7px] rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.8)]" />)}
                </div>
                <span className="text-[10px] text-slate-500 font-bold">n={i + 1} · {n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <button onClick={() => { onAdd(el); onClose(); }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-l from-cyan-500 to-violet-600 text-white font-black shadow-lg shadow-cyan-900/40 hover:scale-[1.01] active:scale-95 transition">
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
  const [tab, setTab] = useState("table"); // table | compounds
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
  const trayName = (f) => COMPOUNDS.find((c) => c.f === f)?.ar || (EL[f] ? EL[f].ar : DIATOMIC_REV[f]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#070d1f] text-slate-100 pb-24" dir="rtl">
        {/* hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_0%,rgba(34,211,238,0.25),transparent),radial-gradient(50%_100%_at_10%_10%,rgba(167,139,250,0.22),transparent)]" />
          <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-6 lg:pt-12 lg:pb-8">
            <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-cyan-300/80 hover:text-cyan-200 text-sm font-bold mb-4"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-[22px] bg-gradient-to-br from-cyan-400 via-sky-600 to-violet-600 grid place-items-center shadow-[0_18px_40px_-10px_rgba(34,211,238,0.5)] shrink-0">
                <FlaskConical className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-5xl font-black leading-tight">مختبر التفاعلات <span className="text-transparent bg-clip-text bg-gradient-to-l from-cyan-300 to-violet-400">الكيميائية</span></h1>
                <p className="text-slate-400 mt-1.5 text-sm lg:text-base max-w-2xl">اختر أي عنصر أو مركب من الجدول الدوري ومكتبة المركبات · وشاهد التفاعل يحدث أمامك بثلاثة أبعاد ذرّةً ذرّة</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)} data-testid={`preset-${p.items.join("-")}`}
                  className="px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-[13px] font-bold hover:bg-white/[0.12] hover:border-cyan-300/40 hover:scale-[1.03] active:scale-95 transition">{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          {/* ===== simulation stage ===== */}
          <div ref={stageRef} className="relative rounded-[26px] overflow-hidden border border-white/10 bg-gradient-to-b from-slate-900 to-[#0a1226] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-[11px] font-black backdrop-blur ${result?.reacts ? "bg-cyan-500/20 text-cyan-200 border border-cyan-300/30" : "bg-white/10 text-slate-300 border border-white/15"}`}>
                {result ? PHASE_AR[phase] : "اختر المواد ثم شغّل التفاعل"}
              </span>
            </div>
            <div className="absolute top-3 left-3 z-20 rounded-2xl bg-black/45 backdrop-blur border border-white/10 px-3.5 py-2 flex items-center gap-3">
              <Thermometer className={`w-5 h-5 ${temp > 400 ? "text-red-400" : temp > 120 ? "text-orange-300" : "text-cyan-300"}`} />
              <div>
                <div className="text-xl font-black leading-none" dir="ltr">{temp}°C</div>
                <div className="text-[10px] text-slate-400 font-bold mt-0.5">حرارة التفاعل</div>
              </div>
              <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden" dir="ltr">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-red-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(3, (temp / 3000) * 100))}%` }} />
              </div>
            </div>
            <div className="h-[380px] sm:h-[440px] lg:h-[540px]">
              <SimCanvas result={result} runId={runId} playing={playing} onTemp={setTemp} onPhase={setPhase} />
            </div>
            <div className="relative border-t border-white/[0.07] bg-black/30 backdrop-blur px-3 py-3 lg:px-5 flex flex-wrap items-center gap-2 lg:gap-3">
              <button onClick={() => run()} data-testid="lab-run"
                className="flex items-center gap-2 px-5 lg:px-7 py-3 rounded-2xl bg-gradient-to-l from-cyan-500 via-sky-600 to-violet-600 font-black text-white shadow-[0_12px_30px_-8px_rgba(14,165,233,0.7)] hover:scale-[1.03] active:scale-95 transition disabled:opacity-40" disabled={!tray.length}>
                <Play className="w-5 h-5" /> شغّل التفاعل
              </button>
              <button onClick={() => setPlaying((p) => !p)} className="w-11 h-11 grid place-items-center rounded-2xl bg-white/[0.07] border border-white/10 hover:bg-white/[0.13] transition" title={playing ? "إيقاف" : "تشغيل"}>
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => { setRunId((x) => x + 1); setPlaying(true); }} className="w-11 h-11 grid place-items-center rounded-2xl bg-white/[0.07] border border-white/10 hover:bg-white/[0.13] transition" title="إعادة">
                <RotateCcw className="w-5 h-5" />
              </button>
              <span className="text-[11px] text-slate-500 font-bold mr-auto hidden sm:block">اسحب الرقعة لتدوير المشهد ثلاثي الأبعاد 🖱️</span>
            </div>
          </div>

          {/* ===== tray + conditions ===== */}
          <div className="mt-5 grid lg:grid-cols-[1fr_auto] gap-4 items-stretch">
            <div className="rounded-[22px] bg-white/[0.04] border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-black flex items-center gap-2"><Beaker className="w-5 h-5 text-cyan-300" /> المفاعلات <span className="text-slate-500 text-xs font-bold">(حتى 3 مواد)</span></div>
                {tray.length > 0 && <button onClick={() => { setTray([]); setResult(null); }} className="text-xs font-bold text-rose-300 hover:text-rose-200">مسح الكل</button>}
              </div>
              <div className="flex flex-wrap gap-2 min-h-[52px]">
                <AnimatePresence>
                  {tray.map(({ f }) => (
                    <motion.span key={f} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                      className="inline-flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-2xl bg-gradient-to-l from-cyan-500/25 to-violet-500/25 border border-cyan-300/30">
                      <Fx f={f} className="text-cyan-100" />
                      <span className="text-xs font-bold text-slate-300">{trayName(f) || ""}</span>
                      <button onClick={() => removeItem(f)} className="w-5 h-5 grid place-items-center rounded-full bg-white/10 hover:bg-rose-500/60 transition"><X className="w-3 h-3" /></button>
                    </motion.span>
                  ))}
                </AnimatePresence>
                {tray.length === 0 && <span className="text-slate-500 text-sm font-semibold self-center">لم تختر شيئاً بعد · اضغط أي عنصر أو مركب بالأسفل</span>}
              </div>
            </div>
            <div className="rounded-[22px] bg-white/[0.04] border border-white/[0.08] p-4">
              <div className="font-black mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-300" /> شرط البدء</div>
              <div className="flex flex-wrap gap-1.5">
                {COND_LIST.map((c) => (
                  <button key={String(c.id)} onClick={() => setCond(c.id)} data-testid={`cond-${c.id || "none"}`}
                    className={`px-3 py-2 rounded-xl text-[13px] font-black transition ${cond === c.id ? "bg-amber-400 text-slate-950 shadow-[0_8px_20px_-6px_rgba(251,191,36,0.8)] scale-[1.04]" : "bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/[0.12]"}`}>
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
                className="mt-6 rounded-[26px] overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
                {result.reacts ? (
                  <div className="p-5 lg:p-7">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-300/30 text-emerald-300 text-xs font-black">✓ يحدث التفاعل</span>
                      <span className="px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-300/30 text-violet-200 text-xs font-black">{result.type}</span>
                      {result.name && <span className="text-lg font-black text-white">{result.name}</span>}
                      {result.approx && <span className="text-[11px] text-slate-500 font-bold">قيم طاقة تقريبية تعليمية</span>}
                    </div>
                    {/* equation */}
                    <div className="rounded-3xl bg-black/35 border border-white/[0.08] px-4 py-5 lg:py-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xl sm:text-2xl lg:text-[34px]" dir="ltr">
                      {result.eq.reactants.map(({ f, n }, i) => (
                        <span key={i} className="inline-flex items-baseline gap-1.5">
                          {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                          {n > 1 && <span className="text-cyan-300">{n}</span>}<Fx f={f} className="text-cyan-100" />
                        </span>
                      ))}
                      <ArrowLeft className="w-7 h-7 text-amber-300 mx-1 rotate-180 shrink-0" />
                      {result.eq.products.map(({ f, n }, i) => (
                        <span key={i} className="inline-flex items-baseline gap-1.5">
                          {i > 0 && <span className="text-slate-500 mx-1">+</span>}
                          {n > 1 && <span className="text-emerald-300">{n}</span>}<Fx f={f} className="text-emerald-100" />
                        </span>
                      ))}
                    </div>
                    {/* stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400"><Zap className="w-3.5 h-3.5 text-amber-300" /> طاقة التفاعل ΔH</div>
                        <div className="text-2xl font-black mt-1.5" dir="ltr">{result.dH != null ? `${result.dH > 0 ? "+" : ""}${result.dH}` : "—"} <span className="text-xs text-slate-400">kJ/mol</span></div>
                        <div className={`text-xs font-black mt-1 ${result.dH < 0 ? "text-orange-300" : "text-sky-300"}`}>{result.dH != null ? (result.dH < 0 ? "طارد للحرارة · يطلق طاقة 🔥" : "ماصّ للحرارة · يبتلع طاقة ❄️") : "قيمة غير مقاسة"}</div>
                      </div>
                      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400"><Thermometer className="w-3.5 h-3.5 text-red-300" /> حرارة قصوى تقريبية</div>
                        <div className="text-2xl font-black mt-1.5" dir="ltr">{result.peak ? `${result.peak}°C` : "حرارة الغرفة"}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{result.peak ? "حرارة اللهب/التفاعل عملياً" : "لا لهب في هذا التفاعل"}</div>
                      </div>
                      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400"><Gauge className="w-3.5 h-3.5 text-cyan-300" /> شرط البدء</div>
                        <div className="text-lg font-black mt-2">{result.condUsed ? COND_LIST.find((c) => c.id === result.condUsed)?.ar : "يبدأ تلقائياً"}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">طاقة التنشيط اللازمة</div>
                      </div>
                      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400"><Atom className="w-3.5 h-3.5 text-violet-300" /> حفظ الذرّات</div>
                        <div className="text-lg font-black mt-2">متوازن ✓</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">عدد ذرات كل عنصر متساوٍ في الطرفين</div>
                      </div>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-3 mt-3">
                      <div className="rounded-3xl bg-cyan-500/[0.07] border border-cyan-300/20 p-4">
                        <div className="text-xs font-black text-cyan-200 mb-2">👀 ماذا ستلاحظ عملياً؟</div>
                        <ul className="space-y-1.5">
                          {result.obs?.map((o, i) => <li key={i} className="text-sm text-slate-200 leading-relaxed">· {o}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-3xl bg-amber-500/[0.07] border border-amber-300/20 p-4">
                        <div className="text-xs font-black text-amber-200 mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4" /> حقيقة مبهرة</div>
                        <p className="text-sm text-slate-200 leading-relaxed">{result.fact}</p>
                      </div>
                    </div>
                    {/* species cards */}
                    <div className="mt-5">
                      <div className="font-black mb-3">بطاقات المواد بالتفصيل</div>
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {[...result.eq.reactants.map((s) => ({ ...s, side: "مادة متفاعلة", colCls: "border-cyan-300/25 bg-cyan-500/[0.05]" })),
                          ...result.eq.products.map((s) => ({ ...s, side: "ناتج", colCls: "border-emerald-300/25 bg-emerald-500/[0.05]" }))].map(({ f, side, colCls }, i) => {
                          const info = compoundInfo(f);
                          return (
                            <div key={i} className={`rounded-3xl border p-4 ${colCls}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <Fx f={f} className="text-2xl text-white" />
                                  <div className="text-sm font-bold text-slate-300 mt-0.5">{info.meta?.ar || EL[f]?.ar || ""}</div>
                                </div>
                                <span className="text-[10px] font-black px-2 py-1 rounded-full bg-white/10 text-slate-300">{side}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1.5">الكتلة المولية <b className="text-slate-200" dir="ltr">{info.molar} g/mol</b>{info.meta ? ` · ${info.meta.type}` : ""}</div>
                              {info.meta?.desc && <p className="text-xs text-slate-400 leading-relaxed mt-1">{info.meta.desc}</p>}
                              <div className="mt-3 space-y-1.5">
                                {info.parts.map((p) => (
                                  <button key={p.sym} onClick={() => p.el && setElModal(p.el)} className="w-full flex items-center gap-2 group text-right">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.el?.col || "#94a3b8" }} />
                                    <span className="text-xs font-bold text-slate-300 w-20 shrink-0 group-hover:text-cyan-200 transition">{p.el?.ar || p.sym} ×{p.n}</span>
                                    <span className="flex-1 h-2 rounded-full bg-white/[0.07] overflow-hidden" dir="ltr"><span className="block h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.el?.col || "#94a3b8" }} /></span>
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
                      <div className="mt-5">
                        <div className="font-black mb-2.5">العناصر المشاركة · اضغط أي عنصر لملفّه الكامل</div>
                        <div className="flex flex-wrap gap-2">
                          {involvedElements.map((el) => (
                            <button key={el.sym} onClick={() => setElModal(el)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl bg-white/[0.05] border border-white/10 hover:border-cyan-300/40 hover:scale-[1.04] transition">
                              <span className="w-8 h-8 rounded-xl grid place-items-center text-[13px] font-black text-slate-900" style={{ background: CATS[el.cat].color }}>{el.sym}</span>
                              <span className="text-xs font-bold">{el.ar}</span>
                              <span className="text-[10px] text-slate-500 font-bold" dir="ltr">Z={el.z}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 lg:p-8 text-center">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 border border-rose-300/25 grid place-items-center"><Ban className="w-8 h-8 text-rose-300" /></div>
                    <div className="text-xl lg:text-2xl font-black mt-4">لا يحدث تفاعل هنا</div>
                    <p className="text-slate-300 mt-2 max-w-xl mx-auto leading-relaxed text-sm lg:text-base">{result.reason}</p>
                    {result.tip && <p className="text-cyan-300 text-sm font-bold mt-2">💡 {result.tip}</p>}
                    {result.needs && (
                      <button onClick={() => { setCond(result.needs); run(tray, result.needs); }}
                        className="mt-4 px-5 py-3 rounded-2xl bg-gradient-to-l from-amber-400 to-orange-500 text-slate-950 font-black hover:scale-[1.03] active:scale-95 transition">
                        فعّل «{COND_LIST.find((c) => c.id === result.needs)?.ar}» وشغّل الآن
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== pickers ===== */}
          <div className="mt-8 flex items-center gap-2">
            <button onClick={() => setTab("table")} data-testid="tab-table"
              className={`px-4 lg:px-6 py-3 rounded-2xl font-black text-sm transition ${tab === "table" ? "bg-gradient-to-l from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-900/40" : "bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1]"}`}>
              <Atom className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> الجدول الدوري · 118 عنصراً
            </button>
            <button onClick={() => setTab("compounds")} data-testid="tab-compounds"
              className={`px-4 lg:px-6 py-3 rounded-2xl font-black text-sm transition ${tab === "compounds" ? "bg-gradient-to-l from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-900/40" : "bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1]"}`}>
              <Beaker className="w-4 h-4 inline-block ml-1.5 -mt-0.5" /> مركبات شائعة
            </button>
          </div>

          {tab === "table" ? (
            <div className="mt-4 rounded-[26px] bg-white/[0.03] border border-white/[0.08] p-3 lg:p-5 overflow-x-auto">
              <div className="min-w-[880px]">
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
              <div className="flex flex-wrap gap-1.5 mt-4" dir="rtl">
                {Object.entries(CATS).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-bold text-slate-300">
                    <span className="w-2.5 h-2.5 rounded" style={{ background: v.color }} /> {v.ar}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن مركب… (ماء · حمض · ملح)"
                className="w-full sm:w-80 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-sm font-semibold placeholder:text-slate-500 focus:outline-none focus:border-cyan-300/50 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {shownCompounds.map((c) => {
                  const info = compoundInfo(c.f);
                  const inTray = tray.some((x) => x.f === c.f);
                  return (
                    <button key={c.f} onClick={() => addItem(c.f)} data-testid={`comp-${c.f}`}
                      className={`text-right rounded-3xl border p-4 transition hover:scale-[1.02] active:scale-95 ${inTray ? "bg-cyan-500/15 border-cyan-300/50" : "bg-white/[0.04] border-white/[0.09] hover:border-cyan-300/30"}`}>
                      <div className="flex items-start justify-between">
                        <Fx f={c.f} className="text-xl text-white" />
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-300/25">{c.type}</span>
                      </div>
                      <div className="font-bold text-sm mt-1.5 leading-snug">{c.ar}</div>
                      <div className="text-[11px] text-slate-500 font-bold mt-1" dir="ltr">{info.molar} g/mol</div>
                      <div className="flex gap-1 mt-2.5" dir="ltr">
                        {info.parts.map((p) => <span key={p.sym} className="w-5 h-5 rounded-md grid place-items-center text-[8px] font-black text-slate-900" style={{ background: p.el?.col || "#94a3b8" }}>{p.sym}</span>)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-3xl bg-gradient-to-l from-cyan-500/10 via-transparent to-violet-500/10 border border-white/[0.08] p-5 flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300 leading-relaxed">
              <b className="text-white">كيف يعمل المختبر؟</b> اختر حتى 3 مواد (عناصر من الجدول أو مركبات من المكتبة)، حدّد شرط البدء إن لزم (شرارة للاحتراق · كهرباء لتحليل الماء · ضوء للبناء الضوئي)، ثم شغّل التفاعل. ستشاهد الذرّات نفسها تنفصل عن المتفاعلات وتعيد ترتيب نفسها إلى نواتج · لأن الذرّات لا تُخلق ولا تفنى في التفاعل الكيميائي. القيم الطاقية أرقام كتب مدرسية تقريبية للتعليم.
            </p>
          </div>
        </div>
      </div>
      <AnimatePresence>{elModal && <ElementModal el={elModal} onClose={() => setElModal(null)} onAdd={addElement} />}</AnimatePresence>
    </Layout>
  );
}

const DIATOMIC_REV = Object.fromEntries(Object.entries(DIATOMIC).map(([k, v]) => [v, k]));

function ElementTile({ el, tray, onAdd, onInfo, fBlock }) {
  const active = tray.some((x) => x.f === (DIATOMIC[el.sym] || el.sym));
  return (
    <div className="relative group" style={fBlock ? undefined : { gridColumn: `${el.g}`, gridRow: `${el.p}` }}>
      <button onClick={() => onAdd(el)} data-testid={`el-${el.sym}`} title={el.ar}
        className={`w-full aspect-[0.92] rounded-[7px] lg:rounded-[9px] flex flex-col items-center justify-center transition-all duration-150 hover:scale-[1.14] hover:z-10 hover:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.8)] active:scale-95 ${active ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-[1.06]" : ""}`}
        style={{ background: `linear-gradient(150deg, ${CATS[el.cat].color}, ${CATS[el.cat].color}bb)` }}>
        <span className="text-[7px] lg:text-[8px] font-black text-slate-900/60 leading-none">{el.z}</span>
        <span className="text-[13px] lg:text-[17px] font-black text-slate-900 leading-tight">{el.sym}</span>
        <span className="text-[6px] lg:text-[7.5px] font-bold text-slate-900/70 leading-none px-0.5 text-center line-clamp-1">{el.ar}</span>
      </button>
      <button onClick={() => onInfo(el)} aria-label={`معلومات ${el.ar}`}
        className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-900/85 text-cyan-200 grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition z-20 border border-white/20">
        <Info className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
