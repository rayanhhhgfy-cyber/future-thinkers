import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Play, Atom, Calculator, Search, Trophy, Sparkles, Beaker,
  Check, X, RotateCcw, Lightbulb, ShieldAlert, ChevronLeft, Target, Zap,
} from "lucide-react";
import { ELEMENTS, EL, CATS, COMPOUNDS, COMP, shells, parseFormula, molarMass } from "./chemData";
import { predict, compoundInfo, REACTION_INDEX } from "./reactions";

/* ============ shared bits ============ */
function FxSub({ f, className = "" }) {
  const parts = [];
  let i = 0, key = 0;
  while (i < f.length) {
    if (/\d/.test(f[i])) { let d = ""; while (i < f.length && /\d/.test(f[i])) d += f[i++]; parts.push(<sub key={key++} className="text-[0.62em] font-bold">{d}</sub>); }
    else parts.push(<span key={key++}>{f[i]}</span>), i++;
  }
  return <span dir="ltr" className={`inline-flex items-baseline font-black ${className}`}>{parts}</span>;
}
const chips = (active) =>
  `pressable px-3 py-2 rounded-xl text-[12px] font-black transition ${active ? "bg-slate-900 text-white ft-shadow scale-[1.03]" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"}`;
const fmt = (x, d = 3) => (x == null || !isFinite(x) ? "—" : Number(x.toFixed(d)).toLocaleString("en-US"));
const sci = (x) => (!isFinite(x) ? "—" : x.toExponential(2).replace("e+", "×10^"));
const cardCls = "rounded-3xl bg-gradient-to-b from-white to-slate-50/70 ring-1 ring-slate-100 ft-shadow p-4 sm:p-5";
const head2 = (icon, title, sub) => (
  <div className="flex items-center gap-2.5 mb-3">
    <span className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-b from-cyan-500/15 to-emerald-500/15 ring-1 ring-emerald-100 text-2xl ft-shadow">{icon}</span>
    <div>
      <div className="font-head font-black text-slate-900 text-[16px] leading-tight">{title}</div>
      {sub && <div className="text-[11.5px] text-slate-400 font-bold">{sub}</div>}
    </div>
  </div>
);

/* ============ shell: the five huge features ============ */
export default function ScienceTools({ onTry, onInfo }) {
  const [tool, setTool] = useState("atom");
  const TABS = [
    ["atom", "⚛️", "مستكشف الذرة والجدول"],
    ["calc", "🧮", "حاسبة الكيمياء الشاملة"],
    ["detect", "🕵️", "مختبر الكشف والمجهول"],
    ["hall", "🏆", "قاعة التجارب الأسطورية"],
  ];
  return (
    <div className="relative bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-l from-cyan-400 via-emerald-400 to-amber-400" />
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-20 w-72 h-72 rounded-full bg-emerald-300/15 blur-3xl" />
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-b from-cyan-500 via-teal-500 to-emerald-600 grid place-items-center ft-shadow ring-1 ring-white/40 shadow-emerald-200"><FlaskConical className="w-6 h-6 text-white" /></span>
          <div>
            <div className="font-head font-black text-xl text-slate-900">المختبر العلمي الكبير</div>
            <div className="text-[12px] text-slate-400 font-bold">ميزات ضخمة قليلة وعميقة · بدل أدوات صغيرة متناثرة</div>
          </div>
          <Link to="/clubs/science/lab" className="pressable mr-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[12px] font-black ft-shadow active:scale-95">
            <Atom className="w-4 h-4" /> الميزة الأولى: المحاكاة التكيفية ثلاثية الأبعاد
          </Link>
        </div>
        <p className="text-[12.5px] text-slate-400 font-semibold leading-relaxed mb-4">خمس ميزات ضخمة تكمل بعضها: المحاكاة التكيفية بالمختبر الرئيسي، وهنا مستكشف الذرة وحاسبة متكاملة ومختبر كشف وقاعة تجارب · كلها بمعلومات مدقّقة ومصحّحة.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-5">
          {TABS.map(([id, icon, ar]) => (
            <button key={id} onClick={() => setTool(id)} data-testid={`tool-${id}`}
              className={`pressable px-3 py-3 rounded-2xl text-[12.5px] font-black transition text-right ${tool === id ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-cyan-600 via-teal-600 to-emerald-600 ring-1 ring-white/30 shadow-emerald-200" : "bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 hover:ring-emerald-200"}`}>
              <span className="text-lg block sm:inline">{icon}</span> {ar}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tool} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {tool === "atom" && <AtomExplorer onInfo={onInfo} />}
            {tool === "calc" && <ChemCalculator />}
            {tool === "detect" && <DetectionLab onTry={onTry} />}
            {tool === "hall" && <ExperimentsHall onTry={onTry} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============ FEATURE 2 · Atom & periodic-table explorer ============ */
const TREND_MODES = [
  ["mass", "⚖️ الكتلة الذرية"],
  ["eneg", "🧲 الكهروسلبية"],
  ["melt", "🌡️ نقطة الانصهار"],
  ["state", "💠 حالة المادة"],
];
function trendColor(el, mode) {
  if (mode === "mass") { const k = Math.min(1, Math.log10(Math.max(1, el.mass)) / 2.47); return `hsl(${214 - k * 168} 85% ${90 - k * 40}%)`; }
  if (mode === "eneg") { if (el.en == null) return "#e2e8f0"; const k = Math.max(0, Math.min(1, (el.en - 0.7) / 3.3)); return `hsl(${268 - k * 268} 88% ${90 - k * 42}%)`; }
  if (mode === "melt") { if (el.melt == null) return "#e2e8f0"; const k = Math.max(0, Math.min(1, (el.melt + 273) / 3695)); return `hsl(${212 - k * 212} 88% ${90 - k * 42}%)`; }
  return { g: "#7dd3fc", l: "#fbbf24", s: "#cbd5e1" }[el.state] || "#e2e8f0";
}
function trendVal(el, mode) {
  if (mode === "mass") return el.mass;
  if (mode === "eneg") return el.en ?? "—";
  if (mode === "melt") return el.melt == null ? "—" : `${el.melt}°`;
  return el.state === "g" ? "غاز" : el.state === "l" ? "سائل" : "صلب";
}
function AtomRings({ shellsArr, sym, z, mass, cat }) {
  return (
    <div className="relative mx-auto w-60 h-60 sm:w-72 sm:h-72">
      {shellsArr.map((cnt, i) => (
        <div key={i} className="absolute rounded-full border border-dashed border-slate-300" style={{ inset: `${i * 32}px` }}>
          {Array.from({ length: cnt }).map((_, j) => {
            const a = (j / Math.max(1, cnt)) * Math.PI * 2 - Math.PI / 2;
            return <span key={j} className="absolute w-3.5 h-3.5 rounded-full bg-cyan-500 ring-2 ring-white ft-shadow"
              style={{ left: `calc(${50 + 50 * Math.cos(a)}% - 7px)`, top: `calc(${50 + 50 * Math.sin(a)}% - 7px)` }} />;
          })}
          <span className="absolute -bottom-1 right-1 text-[9px] font-black text-slate-400 bg-white/80 px-1 rounded">n={i + 1} · {cnt}</span>
        </div>
      ))}
      <div className="absolute inset-0 m-auto w-24 h-24 rounded-full grid place-items-center ring-4 ring-white ft-shadow-lg" style={{ background: CATS[cat || "unknown"].color }}>
        <span className="text-center text-slate-900">
          <span className="block text-[10px] font-black opacity-70">{z} بروتوناً</span>
          <span className="block text-3xl font-black leading-none">{sym}</span>
          <span className="block text-[10px] font-bold opacity-80">A = {mass}</span>
        </span>
      </div>
    </div>
  );
}
function AtomExplorer({ onInfo }) {
  const [mode, setMode] = useState("mass");
  const [sel, setSel] = useState(EL.Fe);
  const [z, setZ] = useState(26);
  const [n, setN] = useState(30);
  const [e, setE] = useState(26);
  const el = ELEMENTS[z - 1];
  const neutralShells = shells(z);
  const shownShells = useMemo(() => {
    const base = [...neutralShells];
    let diff = e - z;
    let i = base.length - 1;
    while (diff > 0) { base[i] = (base[i] || 0) + 1; diff--; if (base[i] >= 2 * (i + 1) * (i + 1)) i = Math.max(0, i - 1); }
    while (diff < 0 && i >= 0) { const take = Math.min(base[i] || 0, -diff); base[i] -= take; diff += take; i--; }
    return base.filter((x, ix) => x > 0 || ix === 0);
  }, [neutralShells, e, z]);
  const charge = z - e;
  const pick = (elm) => {
    setSel(elm); setZ(elm.z); setE(elm.z);
    setN(Math.max(0, Math.round(elm.mass) - elm.z));
  };
  const cell = (elm, fBlock) => (
    <button key={elm.z} onClick={() => pick(elm)} title={`${elm.ar} · ${trendVal(elm, mode)}`}
      className={`pressable aspect-[0.95] rounded-[5px] flex flex-col items-center justify-center ring-1 transition hover:scale-[1.2] hover:z-10 ${sel?.z === elm.z ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-white scale-[1.08]" : "ring-black/5"}`}
      style={fBlock ? { background: trendColor(elm, mode) } : { gridColumn: elm.g, gridRow: elm.p, background: trendColor(elm, mode) }}>
      <span className="text-[11px] font-black text-slate-900 leading-none">{elm.sym}</span>
      <span className="text-[6.5px] font-bold text-slate-700/70 leading-none mt-0.5">{mode === "state" ? elm.z : trendVal(elm, mode)}</span>
    </button>
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {TREND_MODES.map(([id, ar]) => <button key={id} onClick={() => setMode(id)} className={chips(mode === id)}>{ar}</button>)}
        <span className="text-[11px] font-bold text-slate-400 mr-1">لوّن الجدول بأي خاصية · اضغط أي عنصر لبناء ذرّته</span>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-slate-50/70 ring-1 ring-slate-100 p-3">
        <div className="min-w-[620px]">
          <div className="grid gap-[2.5px]" style={{ gridTemplateColumns: "repeat(18, minmax(0,1fr))" }} dir="ltr">
            {ELEMENTS.filter((x) => x.g > 0).sort((a, b) => a.p - b.p || a.g - b.g).map((elm) => cell(elm, false))}
          </div>
          <div className="grid gap-[2.5px] mt-2.5" style={{ gridTemplateColumns: "repeat(15, minmax(0,1fr))" }} dir="ltr">
            {ELEMENTS.filter((x) => x.g === 0 && x.z < 89).map((elm) => cell(elm, true))}
            {ELEMENTS.filter((x) => x.g === 0 && x.z >= 89).map((elm) => cell(elm, true))}
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className={cardCls}>
          {head2("🔬", `ملف العنصر: ${sel.ar}`, `${sel.enName} · Z=${sel.z} · ${CATS[sel.cat].ar}`)}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["الكتلة الذرية", sel.mass], ["المجموعة", sel.g || "f"], ["الدورة", sel.p], ["الحالة", sel.state === "g" ? "غاز" : sel.state === "l" ? "سائل" : "صلب"], ["الكهروسلبية", sel.en ?? "—"], ["الانصهار °م", sel.melt ?? "—"], ["الغليان °م", sel.boil ?? "—"], ["إلكترونات الغلاف الأخير", neutralShellsFor(sel.z)], ["التوزيع بالأغلفة", shells(sel.z).join(" · ")]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 py-2 px-1">
                <div className="text-[14px] font-black text-slate-900" dir="ltr">{v}</div>
                <div className="text-[9.5px] text-slate-400 font-black mt-0.5">{k}</div>
              </div>
            ))}
          </div>
          <p className="text-[12.5px] text-slate-500 leading-relaxed mt-3">{sel.desc}</p>
          <button onClick={() => onInfo?.(sel)} className="pressable mt-3 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-[12px] font-head font-black active:scale-95">افتح الملف المنبثق الكامل</button>
        </div>
        <div className={cardCls}>
          {head2("⚛️", "بنّاء الذرة التفاعلي", "بروتونات ونيوترونات وإلكترونات · اصنع أيونات ونظائر")}
          <AtomRings shellsArr={shownShells} sym={el?.sym || "?"} z={z} mass={z + n} cat={el?.cat} />
          <div className="space-y-3 mt-3">
            {[["البروتونات Z (هوية العنصر)", z, (v) => { setZ(v); }, 1, 40, "#0284c7"], ["النيوترونات N", n, setN, 0, 55, "#64748b"], ["الإلكترونات e", e, setE, 0, 45, "#06b6d4"]].map(([ar, v, set, mn, mx, accent]) => (
              <label key={ar} className="block">
                <span className="flex justify-between text-[12px] font-black text-slate-600"><span>{ar}</span><span dir="ltr">{v}</span></span>
                <input type="range" min={mn} max={mx} value={v} onChange={(ev) => set(+ev.target.value)} className="w-full" style={{ accentColor: accent }} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-3">
            {[["العنصر", el ? `${el.ar}` : "—"], ["عدد الكتلة A", z + n], ["الشحنة", charge === 0 ? "ذرّة متعادلة" : charge > 0 ? `أيون موجب +${charge}` : `أيون سالب ${charge}`], ["النظير", `${el?.sym || "?"}–${z + n}`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 py-2 px-1">
                <div className="text-[14px] font-black text-slate-900" dir="ltr">{v}</div>
                <div className="text-[9.5px] text-slate-400 font-black mt-0.5">{k}</div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">عدد البروتونات وحده يقرر هوية العنصر · النيوترونات تصنع النظائر (كربون-14 يؤرّخ الآثار) · وفارق الإلكترونات يصنع الأيونات التي تقود كل كيمياء المحاليل.</p>
        </div>
      </div>
    </div>
  );
}
function neutralShellsFor(z) { const sh = shells(z); return sh[sh.length - 1]; }

/* ============ FEATURE 3 · the chemistry calculator (completely rebuilt) ============ */
const CALC_MODES = [
  ["formula", "🧪 الصيغة والكتلة المولية"],
  ["convert", "🔁 تحويلات المول"],
  ["stoich", "⚖️ حسابات التفاعل والمردود"],
  ["empirical", "🧬 الصيغة التجريبية"],
  ["solution", "💧 المحاليل والتخفيف"],
];
function validFormula(f) {
  if (!f || !f.trim()) return false;
  const c = parseFormula(f.trim());
  const ks = Object.keys(c);
  return ks.length > 0 && ks.every((k) => EL[k]);
}
function Steps({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-1.5 mt-3">
      {steps.map((st, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] text-slate-600 leading-relaxed">
          <span className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black mt-0.5">{i + 1}</span>
          <span dir="auto">{st}</span>
        </li>
      ))}
    </ol>
  );
}
const numIn = "w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-[15px] focus:outline-none focus:ring-emerald-300 text-slate-800";
const selIn = "w-full px-3 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] focus:outline-none focus:ring-emerald-300 text-slate-700";

function FormulaCalc() {
  const [f, setF] = useState("CuSO4");
  const ok = validFormula(f);
  const info = ok ? compoundInfo(f.trim()) : null;
  const pad = ["H", "C", "N", "O", "S", "P", "Cl", "Na", "K", "Ca", "Mg", "Al", "Fe", "Cu", "Zn", "(", ")", "2", "3", "4"];
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <div className="text-[12px] font-black text-slate-500 mb-1.5">اكتب أي صيغة كيميائية</div>
        <div className="flex gap-2">
          <input value={f} onChange={(e) => setF(e.target.value)} dir="ltr" placeholder="e.g. Ca(OH)2"
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-lg focus:outline-none focus:ring-emerald-300 text-slate-800" />
          {COMP[f.trim()] && <span className="px-3 py-3 rounded-2xl bg-violet-50 ring-1 ring-violet-100 text-violet-700 text-[12px] font-black">{COMP[f.trim()].ar}</span>}
        </div>
        <div className="flex flex-wrap gap-1 mt-2.5" dir="ltr">
          {pad.map((t) => <button key={t} onClick={() => setF((x) => x + t)} className="pressable w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 text-[13px] font-black text-slate-600 hover:bg-slate-50 active:scale-90">{t}</button>)}
          <button onClick={() => setF((x) => x.slice(0, -1))} className="pressable px-3 h-9 rounded-xl bg-white ring-1 ring-slate-200 text-[12px] font-black text-rose-500 active:scale-90">⌫</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 max-h-32 overflow-y-auto">
          {COMPOUNDS.slice(0, 20).map((c) => <button key={c.f} onClick={() => setF(c.f)} className={chips(f === c.f)}><FxSub f={c.f} /></button>)}
        </div>
        {!ok && <p className="text-[12px] font-bold text-rose-500 mt-3">صيغة غير مكتملة · تأكد من رموز العناصر والأقواس</p>}
      </div>
      {info && (
        <div>
          <div className="rounded-3xl bg-gradient-to-b from-cyan-50 to-white ring-1 ring-cyan-100 p-4 text-center">
            <div className="text-[11px] font-black text-cyan-700">الكتلة المولية</div>
            <div className="text-4xl font-black font-head text-slate-900" dir="ltr">{info.molar} <span className="text-base text-slate-400">g/mol</span></div>
            <div className="text-[12px] text-slate-400 font-bold">غرام واحد من المول فيه {sci(6.022e23 / info.molar)} جسيماً تقريباً</div>
          </div>
          <div className="space-y-2 mt-3">
            {info.parts.map((p) => (
              <div key={p.sym} className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl grid place-items-center text-[12px] font-black text-slate-900 ring-1 ring-black/5 shrink-0" style={{ background: p.el?.col || "#e2e8f0" }}>{p.sym}</span>
                <span className="text-[12px] font-bold text-slate-600 w-24 shrink-0">{p.el?.ar} ×{p.n}</span>
                <span className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><motion.span initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} className="block h-full rounded-full" style={{ background: p.el?.col || "#94a3b8" }} /></span>
                <span className="text-[11.5px] font-black text-slate-500 w-12" dir="ltr">{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConvertCalc() {
  const [f, setF] = useState("H2O");
  const [amt, setAmt] = useState("36");
  const [unit, setUnit] = useState("g");
  const M = validFormula(f) ? molarMass(f.trim()) : 0;
  const atomsPer = validFormula(f) ? Object.values(parseFormula(f.trim())).reduce((a, b) => a + b, 0) : 0;
  const v = parseFloat(amt) || 0;
  const mol = unit === "g" ? (M ? v / M : 0) : unit === "mol" ? v : unit === "particles" ? v * 1e23 / 6.022e23 : v / 22.4;
  const steps = [
    `نبدأ من عدد المولات لأنه الجسر بين كل الوحدات: n = ${fmt(mol, 4)} mol`,
    unit === "g" ? `من الكتلة: n = m ÷ M = ${v} ÷ ${M} = ${fmt(mol, 4)} mol` : unit === "particles" ? `من الجسيمات: n = N ÷ Nₐ = ${v}×10²³ ÷ 6.022×10²³` : unit === "gas" ? `من حجم الغاز بالظروف القياسية: n = V ÷ 22.4` : "الكمية معطاة بالمول مباشرة",
    `الكتلة = n × M · عدد الجسيمات = n × 6.022×10²³ · وحجم الغاز بالظروف القياسية = n × 22.4 لتر`,
  ];
  const outs = [
    ["الكتلة", `${fmt(mol * M)} g`, "⚖️"],
    ["المولات", `${fmt(mol, 4)} mol`, "🔢"],
    ["الجسيمات (جزيئات/وحدات)", sci(mol * 6.022e23), "✨"],
    ["مجموع الذرات", sci(mol * 6.022e23 * atomsPer), "⚛️"],
    ["حجم الغاز STP ‏(0°م · 1 atm)", `${fmt(mol * 22.4)} L`, "🎈"],
  ];
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-[12px] font-black text-slate-500">المادة</span>
          <select value={f} onChange={(e) => setF(e.target.value)} className={selIn + " mt-1"}>{COMPOUNDS.map((c) => <option key={c.f} value={c.f}>{c.f} · {c.ar}</option>)}</select></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">الكمية</span>
          <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">وحدتها</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selIn + " mt-1"}>
            <option value="g">غرام g</option><option value="mol">مول mol</option>
            <option value="particles">جسيمات ×10²³</option><option value="gas">لتر غاز STP</option>
          </select></label>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-4">
        {outs.map(([k, val, icon]) => (
          <div key={k} className="rounded-3xl bg-slate-50 ring-1 ring-slate-100 p-3 text-center">
            <div className="text-xl">{icon}</div>
            <div className="text-[15px] font-black text-slate-900 mt-1" dir="ltr">{val}</div>
            <div className="text-[10px] text-slate-400 font-black mt-0.5 leading-snug">{k}</div>
          </div>
        ))}
      </div>
      <Steps steps={M ? steps : []} />
      <p className="text-[11.5px] text-slate-400 font-semibold mt-2">حجم 22.4 لتر للغازات فقط بالظروف القياسية · وبالحرارة العادية (25°م) يصبح ≈24.5 لتر.</p>
    </div>
  );
}

function StoichCalc() {
  const [ri, setRi] = useState(0);
  const [givenF, setGivenF] = useState(null);
  const [givenG, setGivenG] = useState("56");
  const [secondG, setSecondG] = useState("");
  const [actual, setActual] = useState("");
  const rx = REACTION_INDEX[ri] || REACTION_INDEX[0];
  const gf = givenF && rx.eq.reactants.some((x) => x.f === givenF) ? givenF : rx.eq.reactants[0].f;
  const gEntry = rx.eq.reactants.find((x) => x.f === gf);
  const gMol = (parseFloat(givenG) || 0) / (molarMass(gf) || 1);
  const per = gEntry.n ? gMol / gEntry.n : 0;
  const others = rx.eq.reactants.filter((x) => x.f !== gf);
  const second = others[0];
  let limiting = null, extent = per, leftover = null;
  if (second && parseFloat(secondG) > 0) {
    const m2 = (parseFloat(secondG) || 0) / (molarMass(second.f) || 1);
    const ext2 = m2 / second.n;
    if (ext2 < per) { limiting = second.f; extent = ext2; leftover = { f: gf, g: (per - ext2) * gEntry.n * molarMass(gf) }; }
    else { limiting = gf; leftover = { f: second.f, g: (ext2 - per) * second.n * molarMass(second.f) }; }
  }
  const firstProduct = rx.eq.products[0];
  const theoYield = extent * firstProduct.n * molarMass(firstProduct.f);
  const pctYield = parseFloat(actual) > 0 && theoYield ? ((parseFloat(actual) / theoYield) * 100).toFixed(1) : null;
  const steps = [
    `المعادلة موزونة أصلاً: ${rx.eq.reactants.map((x) => `${x.n > 1 ? x.n : ""}${x.f}`).join(" + ")} ← ${rx.eq.products.map((x) => `${x.n > 1 ? x.n : ""}${x.f}`).join(" + ")}`,
    `مولات ${gf} = الكتلة ÷ الكتلة المولية = ${givenG || 0} ÷ ${molarMass(gf)} = ${fmt(gMol, 4)} mol`,
    `نقسم على معاملها (${gEntry.n}) لنحصل على «مقدار التفاعل» ξ = ${fmt(per, 4)} · ثم نضرب بمعامل أي مادة لمعرفة مولاتها`,
    second && limiting ? `المادة المحدِّدة هي ${limiting} لأنها تنفد أولاً · وهي من يقرر كمية النواتج` : "بمادة متفاعلة واحدة معطاة نفترض الباقي فائضاً",
  ];
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2"><span className="text-[12px] font-black text-slate-500">اختر تفاعلاً من الموسوعة ({REACTION_INDEX.length})</span>
          <select value={ri} onChange={(e) => { setRi(+e.target.value); setGivenF(null); }} className={selIn + " mt-1"}>
            {REACTION_INDEX.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.r.join(" + ")} ← {r.p.join(" + ")}</option>)}
          </select></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">المادة المعطاة</span>
          <select value={gf} onChange={(e) => setGivenF(e.target.value)} className={selIn + " mt-1"}>
            {rx.eq.reactants.map((x) => <option key={x.f} value={x.f}>{x.f}</option>)}
          </select></label>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <label className="block"><span className="text-[12px] font-black text-slate-500">كتلة {gf} (غرام)</span>
          <input type="number" value={givenG} onChange={(e) => setGivenG(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        {second && (
          <label className="block"><span className="text-[12px] font-black text-slate-500">كتلة {second.f} (اختياري · للمحدِّد)</span>
            <input type="number" value={secondG} onChange={(e) => setSecondG(e.target.value)} placeholder="اتركها فارغة = فائض" className={numIn + " mt-1"} dir="ltr" /></label>
        )}
        <label className="block"><span className="text-[12px] font-black text-slate-500">الناتج الفعلي (اختياري · للمردود %)</span>
          <input type="number" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="ما حصلت عليه عملياً" className={numIn + " mt-1"} dir="ltr" /></label>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-[12.5px] min-w-[520px]">
          <thead><tr className="text-slate-400 text-[11px]"><th className="text-right py-1.5">المادة</th><th>الدور</th><th>المولات</th><th>الكتلة</th><th>الكتلة المولية</th></tr></thead>
          <tbody>
            {[...rx.eq.reactants.map((x) => ({ ...x, role: x.f === limiting ? "⭐ المحدِّدة" : x.f === gf ? "معطاة" : "متفاعلة", cls: "text-cyan-700" })),
              ...rx.eq.products.map((x) => ({ ...x, role: "ناتج", cls: "text-emerald-700" }))].map((x) => {
              const mol = extent * x.n;
              return (
                <tr key={x.f + x.role} className="border-t border-slate-100">
                  <td className="py-2"><FxSub f={x.f} className="text-slate-900" /></td>
                  <td className={`text-center font-black ${x.cls}`}>{x.role}</td>
                  <td className="text-center font-black" dir="ltr">{fmt(mol, 4)}</td>
                  <td className="text-center font-black" dir="ltr">{fmt(mol * molarMass(x.f))} g</td>
                  <td className="text-center text-slate-400 font-bold" dir="ltr">{molarMass(x.f)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {limiting && <span className="px-3 py-2 rounded-2xl bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-[12px] font-black">المادة المحدِّدة: <FxSub f={limiting} /></span>}
        {leftover && <span className="px-3 py-2 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-[12px] font-black">يبقى فائض من <FxSub f={leftover.f} />: {fmt(leftover.g)} g</span>}
        <span className="px-3 py-2 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[12px] font-black">المردود النظري لـ<FxSub f={firstProduct.f} />: {fmt(theoYield)} g</span>
        {pctYield && <span className="px-3 py-2 rounded-2xl bg-violet-50 ring-1 ring-violet-200 text-violet-800 text-[12px] font-black">المردود المئوي: {pctYield}%</span>}
      </div>
      <Steps steps={steps} />
    </div>
  );
}

function EmpiricalCalc() {
  const COMMON = ["C", "H", "O", "N", "S", "Cl", "Na", "Mg", "Al", "Ca", "Fe", "Cu", "Zn", "K", "P"];
  const [rows, setRows] = useState([{ sym: "C", pct: "40" }, { sym: "H", pct: "6.7" }, { sym: "O", pct: "53.3" }]);
  const setRow = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const calc = useMemo(() => {
    const valid = rows.filter((r) => EL[r.sym] && parseFloat(r.pct) > 0);
    if (valid.length < 2) return null;
    const moles = valid.map((r) => ({ sym: r.sym, pct: r.pct, m: parseFloat(r.pct) / EL[r.sym].mass }));
    const mn = Math.min(...moles.map((x) => x.m));
    let ratio = moles.map((x) => x.m / mn);
    let mult = 1;
    for (const k of [1, 2, 3, 4]) { if (ratio.every((v) => Math.abs(v * k - Math.round(v * k)) < 0.12)) { mult = k; break; } }
    ratio = ratio.map((v) => Math.max(1, Math.round(v * mult)));
    const order = [...moles].sort((a, b) => (a.sym === "C" ? -1 : b.sym === "C" ? 1 : a.sym === "H" ? -1 : b.sym === "H" ? 1 : a.sym.localeCompare(b.sym)));
    const fStr = order.map((x) => { const rr = ratio[moles.indexOf(x)]; return x.sym + (rr > 1 ? rr : ""); }).join("");
    const mm = order.reduce((s2, x) => s2 + EL[x.sym].mass * ratio[moles.indexOf(x)], 0);
    return { fStr, mm: Math.round(mm * 100) / 100, moles, ratio };
  }, [rows]);
  const [realM, setRealM] = useState("180");
  const kTimes = calc && parseFloat(realM) ? Math.round(parseFloat(realM) / calc.mm) : 0;
  const molF = calc && kTimes > 0 ? calc.fStr.replace(/([A-Z][a-z]?)(\d*)/g, (m, s2, d) => s2 + ((parseInt(d || "1", 10) * kTimes) > 1 ? parseInt(d || "1", 10) * kTimes : "")) : null;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2">
              <select value={r.sym} onChange={(e) => setRow(i, "sym", e.target.value)} className={selIn + " w-28"}>{COMMON.map((sx) => <option key={sx} value={sx}>{sx} · {EL[sx].ar}</option>)}</select>
              <input type="number" value={r.pct} onChange={(e) => setRow(i, "pct", e.target.value)} placeholder="%" className={numIn + " flex-1"} dir="ltr" />
              {rows.length > 2 && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="pressable w-10 rounded-xl bg-rose-50 ring-1 ring-rose-100 text-rose-500 active:scale-90"><X className="w-4 h-4 mx-auto" /></button>}
            </div>
          ))}
        </div>
        {rows.length < 4 && <button onClick={() => setRows([...rows, { sym: "N", pct: "" }])} className="pressable mt-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-[12px] font-black active:scale-95">+ عنصر آخر</button>}
        <label className="block mt-4"><span className="text-[12px] font-black text-slate-500">الكتلة المولية الحقيقية (اختياري · للصيغة الجزيئية)</span>
          <input type="number" value={realM} onChange={(e) => setRealM(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <p className="text-[11.5px] text-slate-400 font-semibold mt-3 leading-relaxed">المثال الافتراضي (40% كربون · 6.7% هيدروجين · 53.3% أكسجين) هو بصمة الغلوكوز التحليلية الشهيرة.</p>
      </div>
      {calc ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-3xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-4 text-center">
              <div className="text-[11px] font-black text-violet-600">الصيغة التجريبية</div>
              <div className="text-3xl font-black text-slate-900 mt-1" dir="ltr">{calc.fStr}</div>
              <div className="text-[11.5px] text-slate-400 font-bold">كتلتها {calc.mm} g/mol</div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-emerald-50 to-white ring-1 ring-emerald-100 p-4 text-center">
              <div className="text-[11px] font-black text-emerald-600">الصيغة الجزيئية</div>
              <div className="text-3xl font-black text-slate-900 mt-1" dir="ltr">{molF || "—"}</div>
              <div className="text-[11.5px] text-slate-400 font-bold">{kTimes ? `= التجريبية × ${kTimes}` : "أدخل الكتلة الحقيقية"}</div>
            </div>
          </div>
          <Steps steps={calc.moles.map((x) => `مولات ${x.sym} في 100 غرام = ${x.pct} ÷ ${EL[x.sym].mass} = ${fmt(x.m, 3)} mol`)} />
          <p className="text-[12px] text-slate-500 font-semibold">نقسم الكل على أصغر قيمة (${fmt(Math.min(...calc.moles.map((x) => x.m)), 3)}) فنحصل على أبسط نسبة أعداد صحيحة.</p>
        </div>
      ) : <p className="text-[12.5px] text-slate-400 font-bold">أدخل نسبتين مئويتين على الأقل لعنصرين مختلفين.</p>}
    </div>
  );
}

function SolutionCalc() {
  const [f, setF] = useState("NaOH");
  const [g, setG] = useState("4");
  const [ml, setMl] = useState("250");
  const M = validFormula(f) ? molarMass(f.trim()) : 0;
  const molS = M ? (parseFloat(g) || 0) / M : 0;
  const molarity = ml > 0 ? molS / ((parseFloat(ml) || 1) / 1000) : 0;
  const [dv, setDv] = useState({ c1: "2", v1: "25", c2: "0.5", v2: "" });
  const miss = ["c1", "v1", "c2", "v2"].find((k) => !dv[k]);
  const solved = useMemo(() => {
    const { c1, v1, c2, v2 } = dv;
    const C1 = parseFloat(c1), V1 = parseFloat(v1), C2 = parseFloat(c2), V2 = parseFloat(v2);
    if (miss === "v2" && C1 && V1 && C2) return ["v2", (C1 * V1) / C2, `V₂ = C₁V₁ ÷ C₂ = ${C1} × ${V1} ÷ ${C2}`];
    if (miss === "v1" && C1 && C2 && V2) return ["v1", (C2 * V2) / C1, `V₁ = C₂V₂ ÷ C₁ = ${C2} × ${V2} ÷ ${C1}`];
    if (miss === "c2" && C1 && V1 && V2) return ["c2", (C1 * V1) / V2, `C₂ = C₁V₁ ÷ V₂ = ${C1} × ${V1} ÷ ${V2}`];
    if (miss === "c1" && V1 && C2 && V2) return ["c1", (C2 * V2) / V1, `C₁ = C₂V₂ ÷ V₁ = ${C2} × ${V2} ÷ ${V1}`];
    return null;
  }, [dv, miss]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className={cardCls}>
        {head2("💧", "التركيز المولاري", "كم مولاً في كل لتر محلول؟")}
        <div className="grid grid-cols-3 gap-2">
          <label className="block"><span className="text-[11px] font-black text-slate-500">الصيغة</span><input value={f} onChange={(e) => setF(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
          <label className="block"><span className="text-[11px] font-black text-slate-500">الكتلة g</span><input type="number" value={g} onChange={(e) => setG(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
          <label className="block"><span className="text-[11px] font-black text-slate-500">الحجم mL</span><input type="number" value={ml} onChange={(e) => setMl(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        </div>
        <div className="text-center mt-4">
          <div className="text-[11px] font-black text-slate-400">التركيز</div>
          <div className="text-4xl font-black font-head text-slate-900" dir="ltr">{fmt(molarity, 3)} <span className="text-base text-slate-400">mol/L</span></div>
        </div>
        <Steps steps={M ? [`المولات = ${g || 0} ÷ ${M} = ${fmt(molS, 4)} mol`, `الحجم باللتر = ${ml || 0} ÷ 1000 = ${fmt((parseFloat(ml) || 0) / 1000, 3)} L`, `التركيز = المولات ÷ الحجم = ${fmt(molarity, 3)} M`] : []} />
      </div>
      <div className={cardCls}>
        {head2("🧫", "معادلة التخفيف C₁V₁ = C₂V₂", "اترك المجهول فارغاً وسنحلّه لك")}
        <div className="grid grid-cols-2 gap-2">
          {[["c1", "C₁ التركيز قبل (M)"], ["v1", "V₁ الحجم قبل (mL)"], ["c2", "C₂ التركيز بعد (M)"], ["v2", "V₂ الحجم بعد (mL)"]].map(([k, ar]) => (
            <label key={k} className="block"><span className="text-[11px] font-black text-slate-500">{ar}</span>
              <input type="number" value={dv[k]} onChange={(e) => setDv({ ...dv, [k]: e.target.value })} className={numIn + " mt-1"} dir="ltr" placeholder={miss === k ? "المجهول" : ""} /></label>
          ))}
        </div>
        {solved ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-center">
            <span className="text-[12px] font-black text-emerald-700">{solved[0] === "c1" || solved[0] === "c2" ? "التركيز المجهول" : "الحجم المجهول"} = </span>
            <span className="text-2xl font-black font-head text-slate-900" dir="ltr">{fmt(solved[1], 3)} {solved[0][0] === "c" ? "M" : "mL"}</span>
            <div className="text-[11.5px] text-slate-500 font-bold mt-1" dir="ltr">{solved[2]}</div>
          </div>
        ) : <p className="text-[12px] text-slate-400 font-bold mt-4 text-center">اترك خانة واحدة فقط فارغة (المجهول) واملأ الباقي</p>}
        <p className="text-[11.5px] text-slate-400 font-semibold mt-3 leading-relaxed">بالتخفيف لا يتغير عدد مولات المذاب · يتغير الحجم فقط · لذلك حاصل التركيز × الحجم ثابت.</p>
      </div>
    </div>
  );
}

function ChemCalculator() {
  const [mode, setMode] = useState("formula");
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CALC_MODES.map(([id, ar]) => (
          <button key={id} onClick={() => setMode(id)} data-testid={`calc-${id}`} className={chips(mode === id) + " shrink-0"}>{ar}</button>
        ))}
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mb-4">حاسبة مختلفة تماماً عن عدّاد المولات القديم: خمس آلات متخصصة، كل واحدة تعرض خطوات الحل كما يكتبها معلّمك على اللوح.</p>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {mode === "formula" && <FormulaCalc />}
          {mode === "convert" && <ConvertCalc />}
          {mode === "stoich" && <StoichCalc />}
          {mode === "empirical" && <EmpiricalCalc />}
          {mode === "solution" && <SolutionCalc />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ FEATURE 4 · detection lab: pH, flames, gases, and the mystery unknown ============ */
const PH_ITEMS = [
  { f: "H2SO4", ar: "حمض بطارية السيارة", ph: 0.5 }, { f: "HCl", ar: "حمض الهيدروكلوريك", ph: 1 },
  { f: "HNO3", ar: "حمض النيتريك", ph: 1 }, { f: "CH3COOH", ar: "الخل", ph: 2.4 },
  { f: "H2O2", ar: "ماء الأكسجين", ph: 4.5 }, { f: "H2O", ar: "ماء نقي", ph: 7 },
  { f: "NaCl", ar: "محلول الملح", ph: 7 }, { f: "NaHCO3", ar: "صودا الخبز", ph: 8.4 },
  { f: "NH3", ar: "محلول الأمونيا", ph: 11.1 }, { f: "Ca(OH)2", ar: "ماء الجير", ph: 12.4 },
  { f: "NaOH", ar: "الصودا الكاوية", ph: 13 }, { f: "KOH", ar: "البوتاسا الكاوية", ph: 13.5 },
];
const HOME_PH = [
  { ar: "عصير الليمون", ph: 2.2 }, { ar: "مشروبات غازية", ph: 3.2 }, { ar: "عصير البرتقال", ph: 3.7 },
  { ar: "القهوة السوداء", ph: 5 }, { ar: "الحليب", ph: 6.5 }, { ar: "دم الإنسان", ph: 7.4 },
  { ar: "ماء البحر", ph: 8.1 }, { ar: "صابون اليدين", ph: 9.5 }, { ar: "مبيّض الكلور", ph: 12.5 },
];
const PH_COLORS = ["#ef4444", "#f97316", "#fb923c", "#facc15", "#a3e635", "#4ade80", "#22c55e", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#d946ef"];
const INDICATORS = [
  { name: "عبّاد الشمس (ليتموس)", color: (p) => (p < 6 ? "#ef4444" : p > 8 ? "#3b82f6" : "#a78bfa"), text: (p) => (p < 6 ? "أحمر في الحمض" : p > 8 ? "أزرق في القاعدة" : "بنفسجي متعادل") },
  { name: "الفينولفثالين", color: (p) => (p >= 8.2 ? "#ec4899" : "#e2e8f0"), text: (p) => (p >= 8.2 ? "وردي في القاعدة" : "عديم اللون") },
  { name: "برتقالي الميثيل", color: (p) => (p < 3.1 ? "#ef4444" : p > 4.4 ? "#facc15" : "#fb923c"), text: (p) => (p < 3.1 ? "أحمر" : p > 4.4 ? "أصفر" : "برتقالي انتقالي") },
];
const FLAMES = [
  { sym: "Li", ar: "ليثيوم", col: "#ff2d78", note: "قرمزي" }, { sym: "Na", ar: "صوديوم", col: "#ffb703", note: "أصفر ذهبي كثيف" },
  { sym: "K", ar: "بوتاسيوم", col: "#c77dff", note: "بنفسجي ليلكي" }, { sym: "Ca", ar: "كالسيوم", col: "#ff7b00", note: "برتقالي مائل للحمرة (قرميدي)" },
  { sym: "Sr", ar: "سترونشيوم", col: "#ff1744", note: "أحمر قرمزي" }, { sym: "Ba", ar: "باريوم", col: "#69f0ae", note: "أخضر تفاحي" },
  { sym: "Cu", ar: "نحاس", col: "#00e5a0", note: "أخضر زمردي" }, { sym: "B", ar: "بورون", col: "#4ade80", note: "أخضر ساطع" },
  { sym: "Zn", ar: "زنك", col: "#a5d6a7", note: "أخضر مبيض" }, { sym: "Pb", ar: "رصاص", col: "#bcd7f5", note: "أزرق شاحب مبيض" },
];
const GASES_ID = [
  { f: "H2", icon: "💥", test: "شظية مشتعلة عند فوهة الأنبوب", pass: "فرقعة حادة مميزة (اختبار الفرقعة)", why: "الهيدروجين يشتعل مع أكسجين الهواء بانفجار صغير" },
  { f: "O2", icon: "✨", test: "شظية متوهجة بلا لهب (جمرة)", pass: "تعود الجمرة فتشتعل بلهب", why: "الأكسجين يغذي الاحتراق ولا يشتعل بنفسه" },
  { f: "CO2", icon: "🥛", test: "تمريرة في ماء جير صافٍ", pass: "يتعكّر حليبياً فوراً", why: "يتكون كربونات كالسيوم بيضاء لا تذوب" },
  { f: "Cl2", icon: "🧻", test: "ورقة عبّاد شمس زرقاء رطبة", pass: "تحمّرّ أولاً ثم يبيضّ لونها ويزول", why: "الكلور مؤكسد مبيّض · غاز سام لا يُشمّ مباشرة أبداً" },
  { f: "NH3", icon: "👃", test: "عود مبلل بحمض هيدروكلوريك مركز قرب الفوهة", pass: "دخان أبيض كثيف (كلوريد أمونيوم)", why: "غاز قلوي يزرقّ عبّاد الشمس الأحمر أيضاً" },
];
const ACT_ARR = ["K", "Na", "Ca", "Mg", "Al", "Zn", "Fe", "Pb", "H", "Cu", "Ag", "Au"];
const MYSTERIES = [
  { look: "مسحوق أبيض ناعم في قارورة بلا اسم", tests: [["مع حمض مخفف", "فوران عنيف وغاز يخرج"], ["الغاز في ماء الجير", "تعكّر حليبي فوري"], ["اختبار اللهب لعينة منه", "برتقالي قرميدي"]], options: ["كربونات الكالسيوم", "كلوريد الصوديوم", "كبريتات النحاس"], answer: 0, why: "الفوران + تعكّر ماء الجير بصمة الكربونات · ولهب الكالسيوم القرميدي أكّد الكاتيون" },
  { look: "بلورات زرقاء جميلة في علبة قديمة", tests: [["أذبها بالماء", "محلول أزرق سماوي"], ["أضف صودا كاوية", "راسب أزرق جيلاتيني"], ["اختبار اللهب", "أخضر زمردي"]], options: ["كبريتات النحاس الزرقاء", "كلوريد الحديد", "نترات الأمونيوم"], answer: 0, why: "الأزرق في المحلول والراسب واللهب الأخضر · ثلاث بصمات للنحاس Cu²⁺" },
  { look: "قضيب معدني رمادي باهت", tests: [["في حمض هيدروكلوريك مخفف", "فقاعات غاز · قربت شظية ففرقعت"], ["قارن بسلسلة النشاط", "فوق الهيدروجين وتحت الألمنيوم"], ["اختبار اللهب", "أخضر مبيض"]], options: ["الخارصين (الزنك)", "النحاس", "الفضة"], answer: 0, why: "يحرّر هيدروجين من الحمض فهو فوقه بالسلسلة · ولهبه الأخضر المبيض للزنك" },
  { look: "ملح أبيض من مخزن المطبخ المدرسي", tests: [["اختبار اللهب", "أصفر ذهبي كثيف يخفي كل لون"], ["مع نترات الفضة", "راسب أبيض حليبي يغمقّ بالضوء"], ["الذوبان والمذاق ممنوعان مخبرياً", "تعلمنا: لا نتذوق أبداً"]], options: ["كلوريد الصوديوم", "كلوريد البوتاسيوم", "نترات الصوديوم"], answer: 0, why: "لهب الصوديوم الذهبي + راسب كلوريد الفضة الأبيض = ملح الطعام" },
  { look: "ملح أبيض تنبعث منه رائحة عند تسخينه مع قاعدة", tests: [["مع صودا كاوية وتسخين لطيف", "غاز يزرقّ ورقة عبّاد حمراء رطبة"], ["الغاز مع عود حمضي", "دخان أبيض كثيف"], ["اختبار اللهب", "لا لون مميزاً تقريباً"]], options: ["كلوريد الأمونيوم (النشادر)", "بيكربونات الصوديوم", "كلوريد الكالسيوم"], answer: 0, why: "القاعدة حرّرت أمونيا · إذن الأيون الموجب هو الأمونيوم NH₄⁺" },
  { look: "ملح أبيض من مختبر الألعاب النارية", tests: [["اختبار اللهب", "قرمزي مبهر كألعاب العيد"], ["مع حمض مركز بحذر", "تصاعد أبخرة"], ["مقارنة بالألوان", "أغمق وأحمر من لهب الكالسيوم"]], options: ["أملاح الليثيوم", "أملاح الصوديوم", "أملاح الباريوم"], answer: 0, why: "القرمزي الغامق بصمة الليثيوم الأشهر في الألعاب النارية" },
];

function DetectionLab({ onTry }) {
  const [ph, setPh] = useState(7);
  const [flame, setFlame] = useState(FLAMES[1]);
  const [gasDone, setGasDone] = useState({});
  const [mys, setMys] = useState(() => Math.floor(Math.random() * MYSTERIES.length));
  const [revealed, setRevealed] = useState([]);
  const [guess, setGuess] = useState(null);
  const [score, setScore] = useState(() => { try { return JSON.parse(localStorage.getItem("ft-mystery") || '{"w":0,"p":0}'); } catch { return { w: 0, p: 0 }; } });
  const M = MYSTERIES[mys];
  const col = PH_COLORS[Math.max(0, Math.min(14, Math.round(ph)))];
  const kind = ph < 6.5 ? ["حمض", "#dc2626"] : ph > 7.5 ? ["قاعدة", "#2563eb"] : ["متعادل", "#16a34a"];
  const doGuess = (i) => {
    if (guess !== null) return;
    const right = i === M.answer;
    setGuess(i);
    const ns = { w: score.w + (right ? 1 : 0), p: score.p + 1 };
    setScore(ns);
    try { localStorage.setItem("ft-mystery", JSON.stringify(ns)); } catch { /* private */ }
  };
  const nextMystery = () => { setMys((m) => (m + 1 + Math.floor(Math.random() * (MYSTERIES.length - 1))) % MYSTERIES.length); setRevealed([]); setGuess(null); };
  return (
    <div className="space-y-6">
      {/* pH universe + indicators */}
      <div className={cardCls}>
        {head2("🌈", "كون الرقم الهيدروجيني pH", "من حمض البطارية إلى الصودا الكاوية · مع مختبر الكواشف")}
        <div className="grid lg:grid-cols-[1fr_300px] gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-black text-slate-500">حرّك المؤشر أو اختر مادة حقيقية</span>
              <span className="text-3xl font-black font-head text-slate-900" dir="ltr">pH {ph.toFixed(1)}</span>
            </div>
            <div className="relative h-9 rounded-2xl overflow-visible ring-1 ring-slate-200" dir="ltr" style={{ background: `linear-gradient(90deg, ${PH_COLORS.join(",")})` }}>
              <motion.div animate={{ left: `calc(${(ph / 14) * 100}% - 14px)` }} className="absolute -top-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white grid place-items-center text-[11px] font-black ring-2 ring-white ft-shadow">{Math.round(ph)}</div>
                <div className="w-0 h-0 mx-auto border-x-[7px] border-x-transparent border-t-[9px] border-t-slate-900" />
              </motion.div>
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-400 mt-2" dir="ltr"><span>0 حمض قوي</span><span>7 متعادل</span><span>14 قاعدة قوية</span></div>
            <input type="range" min="0" max="14" step="0.1" value={ph} onChange={(e) => setPh(+e.target.value)} className="w-full accent-emerald-500 mt-1" aria-label="قيمة pH" data-testid="ph-slider" />
            <div className="flex flex-wrap gap-1.5 mt-3 max-h-36 overflow-y-auto">
              {PH_ITEMS.map((x) => <button key={x.f} onClick={() => setPh(x.ph)} className={chips(Math.abs(x.ph - ph) < 0.01)}><FxSub f={x.f} /> · {x.ar} {x.ph}</button>)}
              {HOME_PH.map((x) => <button key={x.ar} onClick={() => setPh(x.ph)} className={chips(Math.abs(x.ph - ph) < 0.01)}>{x.ar} · {x.ph}</button>)}
            </div>
            <p className="text-[11.5px] text-slate-400 font-semibold mt-3 leading-relaxed">المقياس لوغاريتمي: نزول درجة واحدة يعني أيونات هيدروجين أكثر بعشر مرات · القيم تقريبية لتراكيز مدرسية آمنة.</p>
          </div>
          <div>
            <motion.div animate={{ backgroundColor: col }} className="h-20 rounded-2xl ring-1 ring-black/5 grid place-items-center">
              <span className="px-3 py-1 rounded-full bg-white/85 text-[13px] font-black" style={{ color: kind[1] }}>{kind[0]} · لون الكاشف العام</span>
            </motion.div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {INDICATORS.map((ind) => (
                <div key={ind.name} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 p-2 text-center">
                  <motion.div animate={{ backgroundColor: ind.color(ph) }} className="h-9 rounded-xl ring-1 ring-black/5" />
                  <div className="text-[10px] font-black text-slate-600 mt-1.5 leading-tight">{ind.name}</div>
                  <div className="text-[9.5px] font-bold text-slate-400 leading-tight">{ind.text(ph)}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-2 leading-relaxed">كل كاشف يغيّر لونه عند مدى مختلف · بثلاثتها معاً تضبط pH بدقة دون جهاز.</p>
          </div>
        </div>
      </div>

      {/* flame studio + gas id */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className={cardCls}>
          {head2("🔥", "استوديو اختبار اللهب", "بصمات ضوئية لكل معدن · أساس الألعاب النارية")}
          <div className="flex gap-4 items-center">
            <div className="relative h-48 w-32 shrink-0 grid place-items-end justify-center">
              <motion.div key={flame.sym} animate={{ scale: [1, 1.08, 0.97, 1.04, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                className="w-24 h-40 rounded-[50%_50%_50%_50%/62%_62%_38%_38%]"
                style={{ background: `radial-gradient(50% 60% at 50% 78%, #ffffff 0%, ${flame.col} 34%, ${flame.col}88 58%, transparent 74%)`, boxShadow: `0 0 54px 10px ${flame.col}55` }} />
              <span className="absolute bottom-0 inset-x-0 text-center"><span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-black">{flame.ar} · {flame.sym}</span></span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                {FLAMES.map((m) => <button key={m.sym} onClick={() => setFlame(m)} className={chips(flame.sym === m.sym)}><span className="inline-block w-2.5 h-2.5 rounded-full ml-1 ring-1 ring-black/10" style={{ background: m.col }} />{m.ar}</button>)}
              </div>
              <div className="font-black font-head text-slate-900 mt-3">اللون: {flame.note}</div>
              <p className="text-[12px] text-slate-500 leading-relaxed mt-1">إلكترونات المعدن تمتص حرارة اللهب وتقفز لمستويات أعلى، وعند عودتها تطلق الفائض ضوءاً بلون مميّز · هكذا كشف العلماء عناصر النجوم من ضوئها.</p>
            </div>
          </div>
        </div>
        <div className={cardCls}>
          {head2("🧪", "بطاقات كشف الغازات", "اختبارات المنهاج الخمسة الكلاسيكية")}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
            {GASES_ID.map((g) => {
              const done = !!gasDone[g.f];
              return (
                <div key={g.f} className={`rounded-2xl ring-1 p-3 transition ${done ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50/60 ring-slate-100"}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{g.icon}</span>
                    <FxSub f={g.f} className="text-lg text-slate-900" />
                    <span className="text-[11px] font-bold text-slate-400">{g.test}</span>
                    <button onClick={() => setGasDone({ ...gasDone, [g.f]: !done })} className={`pressable mr-auto px-3 py-1.5 rounded-xl text-[11px] font-black active:scale-95 ${done ? "bg-white ring-1 ring-emerald-300 text-emerald-700" : "bg-slate-900 text-white"}`}>{done ? "أعد" : "نفّذ الاختبار"}</button>
                  </div>
                  <AnimatePresence>{done && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden text-[12px] font-bold text-emerald-800 leading-relaxed">✓ {g.pass} · <span className="text-slate-500">{g.why}</span></motion.p>}</AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* activity series mini */}
      <div className={cardCls}>
        {head2("🏆", "سلسلة النشاط · ساحة الإحلال", "كل معدن يطرد من تحته من محاليل أملاحه · جرّب أي زوج في المحاكي")}
        <div className="flex items-end gap-1 overflow-x-auto pb-2" dir="ltr">
          {ACT_ARR.map((m, i) => (
            <div key={m} className="flex flex-col items-center shrink-0">
              <div className={`w-9 sm:w-11 rounded-t-xl grid place-items-center text-[12px] font-black text-slate-900 ring-1 ring-black/5 ${m === "H" ? "ring-2 ring-slate-400" : ""}`}
                style={{ height: `${116 - i * 8}px`, background: m === "H" ? "#e2e8f0" : (EL[m]?.col || "#cbd5e1") }}>{m}</div>
              <span className="text-[9px] font-bold text-slate-400 mt-1">{EL[m]?.ar || "هيدروجين"}</span>
            </div>
          ))}
        </div>
        <ActivityTry onTry={onTry} />
      </div>

      {/* mystery unknown */}
      <div className="rounded-3xl bg-gradient-to-b from-violet-600 via-indigo-700 to-slate-900 text-white ft-shadow-lg p-5 sm:p-6 relative overflow-hidden" data-testid="mystery-box">
        <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-fuchsia-400/25 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl">🕵️</span>
            <div>
              <div className="font-head font-black text-lg leading-tight">تحدّي المادة المجهولة</div>
              <div className="text-[11.5px] text-indigo-200 font-bold">نفّذ الاختبارات الافتراضية · اجمع البصمات · ثم خمّن الهوية</div>
            </div>
            <span className="mr-auto px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-[11.5px] font-black">🏅 سجلّك: {score.w} صواب من {score.p}</span>
          </div>
          <p className="mt-4 text-[15px] font-bold leading-relaxed bg-white/[0.07] ring-1 ring-white/10 rounded-2xl px-4 py-3">📦 {M.look}</p>
          <div className="grid sm:grid-cols-3 gap-2 mt-3">
            {M.tests.map(([label, res], i) => {
              const open = revealed.includes(i);
              return (
                <button key={i} disabled={open} onClick={() => setRevealed([...revealed, i])}
                  className={`pressable text-right rounded-2xl px-3.5 py-3 ring-1 transition ${open ? "bg-white text-slate-800 ring-white" : "bg-white/10 ring-white/15 hover:bg-white/20 text-white"}`}>
                  <span className="block text-[11px] font-black opacity-80">اختبار {i + 1} · {label}</span>
                  <span className="block text-[12.5px] font-bold mt-1 leading-relaxed">{open ? res : "اضغط لتنفيذ الاختبار…"}</span>
                </button>
              );
            })}
          </div>
          <div className="grid sm:grid-cols-3 gap-2 mt-3">
            {M.options.map((op, i) => {
              const state = guess === null ? "" : i === M.answer ? "bg-emerald-500 text-white ring-emerald-300" : i === guess ? "bg-rose-500 text-white ring-rose-300" : "bg-white/10 ring-white/10 opacity-50";
              return (
                <button key={op} onClick={() => doGuess(i)} data-testid={`mystery-opt-${i}`}
                  className={`pressable rounded-2xl px-3.5 py-3 ring-1 font-black text-[13px] transition active:scale-95 ${state || "bg-white/10 ring-white/20 hover:bg-white/25 text-white"}`}>
                  {guess !== null && i === M.answer ? "✓ " : guess === i ? "✗ " : ""}{op}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {guess !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 ring-1 ring-white/15 px-4 py-3">
                <span className="text-[13px] font-bold leading-relaxed">{guess === M.answer ? "🎉 كشف صحيح كالمحترفين! " : "ليست هي · راجع البصمات: "}{M.why}</span>
                <button onClick={nextMystery} className="pressable mr-auto px-4 py-2 rounded-xl bg-white text-indigo-800 text-[12px] font-head font-black active:scale-95"><RotateCcw className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /> مجهول جديد</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
function ActivityTry({ onTry }) {
  const [metal, setMetal] = useState("Fe");
  const [salt, setSalt] = useState("CuSO4");
  const verdict = useMemo(() => { try { return predict([{ f: metal }, { f: salt }], null); } catch { return null; } }, [metal, salt]);
  return (
    <div>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end mt-2">
        <div>
          <div className="text-[12px] font-black text-slate-600 mb-1.5">معدن حرّ</div>
          <div className="flex flex-wrap gap-1.5">{["Mg", "Al", "Zn", "Fe", "Pb", "Cu", "Ag"].map((m) => <button key={m} onClick={() => setMetal(m)} className={chips(metal === m)}>{EL[m].ar} {m}</button>)}</div>
        </div>
        <div className="text-2xl font-black text-slate-300 text-center">+</div>
        <div>
          <div className="text-[12px] font-black text-slate-600 mb-1.5">محلول ملح</div>
          <div className="flex flex-wrap gap-1.5">{["CuSO4", "ZnSO4", "FeSO4", "FeCl2", "ZnCl2", "AgNO3", "CuCl2"].map((sf) => <button key={sf} onClick={() => setSalt(sf)} className={chips(salt === sf)}><FxSub f={sf} /></button>)}</div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={metal + salt} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-2xl p-3.5 ring-1 ${verdict?.reacts ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50/70 ring-rose-100"}`}>
          {verdict?.reacts ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-black text-emerald-800">✓ يحدث إحلال · «{EL[metal].ar}» أنشط فيزيح المعدن الآخر من ملحه</span>
              <button onClick={() => onTry?.([metal, salt], null)} className="pressable mr-auto px-4 py-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[12px] font-head font-black ft-shadow active:scale-95"><Play className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /> شاهده في المحاكي</button>
            </div>
          ) : <span className="text-[13px] font-black text-rose-700">✗ لا إحلال · «{EL[metal].ar}» أضعف من معدن الملح · اصعد بالسلسلة وجرّب معدناً أنشط</span>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ FEATURE 5 · legendary experiments hall ============ */
const EXPERIMENTS = [
  { icon: "🚀", title: "وقود الصواريخ: صناعة الماء", items: ["H2", "O2"], cond: "spark", level: "👨‍🏫 للمعلّم فقط", time: "٣ دقائق", steps: ["امزج هيدروجين وأكسجين بنسبة 2:1", "قرّب شرارة صغيرة", "فرقعة مدوّية ثم قطرات ماء على جدار بارد"], watch: "اختفاء الغازين معاً وتكوّن سائل · إثبات أن الماء مركّب لا عنصر", warn: "خليط متفجر · يُنفّذ افتراضياً هنا فقط" },
  { icon: "🌋", title: "بركان ثنائي الكرومات", items: ["(NH4)2Cr2O7"], cond: "heat", level: "👨‍🏫 للمعلّم فقط", time: "٥ دقائق", steps: ["كومة صغيرة من البلورات البرتقالية", "المسها بعود مشتعل", "جبل أخضر منتفخ يتنامى كبركان حقيقي مع شرر"], watch: "الحجم يكبر أضعافاً واللون من برتقالي لأخضر داكن", warn: "مركبات الكروم سامة ومسرطنة · عرض فيديو بالمدرسة عادة" },
  { icon: "🧊", title: "التفاعل الذي يجمّد الكأس", items: ["NH4Cl", "Ba(OH)2"], cond: null, level: "🏫 مختبر مدرسي", time: "٤ دقائق", steps: ["اخلط الملحين الأبيضين بكأس فوق لوح مبلل", "رجّ الكأس وراقب الميزان الحراري", "تنخفض الحرارة دون الصفر ويلتصق الكأس باللوح متجمّداً"], watch: "رائحة أمونيا خفيفة + برد قارس يبتلع حرارة الغرفة", warn: "أملاح الباريوم سامة · غسل يدين إلزامي" },
  { icon: "🪥", title: "معجون أسنان الفيل", items: ["H2O2"], cond: "catalyst", level: "🏫 مختبر مدرسي", time: "دقيقتان", steps: ["فوق أكسيد مركز بقارورة ضيقة مع صابون وملون", "أضف يوديد البوتاسيوم حفّازاً", "نافورة رغوة عملاقة تنفجر للأعلى"], watch: "حرارة تصاعد البخار من الرغوة · الأكسجين المنطلق يعيد إشعال جمرة", warn: "تركيز عالٍ يهيّج الجلد · نظارات وقفازات" },
  { icon: "🌋", title: "بركان صودا الخبز المنزلي", items: ["NaHCO3", "CH3COOH"], cond: null, level: "🧒 آمن منزلياً", time: "دقيقتان", steps: ["صودا خبز داخل نموذج بركان", "اسكب الخل الملوّن أحمر", "حمم من فقاعات CO2 تفيض"], watch: "فوران فوري بارد الملمس بعكس البركان الحقيقي", warn: "آمن · نظّف بعدها مباشرة" },
  { icon: "🌧️", title: "المطر الذهبي", items: ["Pb(NO3)2", "KI"], cond: null, level: "🏫 مختبر مدرسي", time: "٣ دقائق", steps: ["امزج محولين شفافين عديمي اللون", "بلورات صفراء ذهبية تهطل كالمطر", "سخّن تختفي · برّد تعود ألمع وأجمل"], watch: "الاختفاء بالتسخين والعودة بالتبريد · ترسيب عكسي الحرارة", warn: "أملاح الرصاص سامة · لا تُرمى بالمغسلة" },
  { icon: "🌳", title: "شجرة الفضة البلورية", items: ["Cu", "AgNO3"], cond: null, level: "🏫 مختبر مدرسي", time: "١٠ دقائق", steps: ["سلك نحاس ملفوف كشجرة بمحلول نترات فضة", "راقب بصبر بلورات فضية براقة تنمو", "المحلول يزرقّ ببطء"], watch: "إحلال صامت ينحت بلورات معدنية حقيقية", warn: "نترات الفضة تصبغ الجلد أسود · تُحفظ بالظلام" },
  { icon: "🔥", title: "الثرمايت: لحام السكك الحديدية", items: ["Al", "Fe2O3"], cond: "heat", level: "👨‍🏫 للمعلّم فقط", time: "دقيقة واحدة", steps: ["مسحوق ألمنيوم + أكسيد حديد", "إشعال بصاعق مغنيسيوم", "حديد منصهر 2500°م يقطر فيلحم القضبان"], watch: "واحدة من أعنف طاقات التفاعلات المألوفة", warn: "خطير جداً · لا يُنفّذ خارج الورش المتخصصة أبداً" },
  { icon: "💡", title: "مصباح الكربيد القديم", items: ["CaC2", "H2O"], cond: null, level: "🏫 مختبر مدرسي", time: "٣ دقائق", steps: ["قطرات ماء فوق حبيبات كربيد كالسيوم", "غاز أسيتيلين يتصاعد فوراً", "يشتعل عند الفوهة بلهب ساطع مدخّن"], watch: "غاز من صخر وماء · إضاءة المناجم قبل الكهرباء", warn: "غاز قابل للاشتعال · كميات ضئيلة وتهوية" },
  { icon: "🧲", title: "حديد متوهج يفكك البخار", items: ["Fe", "H2O"], cond: "heat", level: "👨‍🏫 للمعلّم فقط", time: "٦ دقائق", steps: ["برادة حديد محمّاة حتى الاحمرار بأنبوب", "مرّر بخار ماء فوقها", "هيدروجين يخرج من الطرف الآخر ويفرقع"], watch: "الحديد يخطف أكسجين الماء ويتأكسد أسود مغناطيسياً", warn: "حرارة عالية وغاز قابل للاشتعال" },
  { icon: "🥛", title: "كاشف ثاني أكسيد الكربون", items: ["Ca(OH)2", "CO2"], cond: null, level: "🧒 آمن منزلياً", time: "دقيقة", steps: ["ماء جير صافٍ بكأس", "انفخ فيه بقشة · زفيرك غني بـCO₂", "يتعكّر حليبياً أمام عينيك"], watch: "زفيرك نفسه مركّب كيميائي قابل للكشف", warn: "آمن تماماً · قشة نظيفة لكل طالب" },
  { icon: "🌱", title: "مصنع الغذاء الأخضر", items: ["CO2", "H2O"], cond: "light", level: "🧒 آمن صفياً", time: "ساعة ضوء", steps: ["نبتة مائية مقلوبة بقمع وكأس ماء", "عرّضها لضوء قوي", "فقاعات أكسجين تتجمع أعلى الكأس"], watch: "غاز يعيد إشعال جمرة متوهجة · البناء الضوئي حياً", warn: "آمنة ومحبوبة · الأجمل تنفيذها صفياً" },
  { icon: "🕯️", title: "مغنيسيوم لا يطفئه CO₂", items: ["Mg", "CO2"], cond: "spark", level: "👨‍🏫 للمعلّم فقط", time: "دقيقتان", steps: ["شريط مغنيسيوم مشتعل", "أدخله قارورة ثاني أكسيد كربون أو ثلج جاف", "يستمر مشتعلاً ويسوّد الجدار كربوناً"], watch: "المغنيسيوم يخطف أكسجين حتى من CO₂ نفسه", warn: "وهج يعمي لحظياً · لا تنظر مباشرة" },
];
function ExperimentsHall({ onTry }) {
  const [open, setOpen] = useState(0);
  const [levelFilter, setLevelFilter] = useState("الكل");
  const levels = ["الكل", ...new Set(EXPERIMENTS.map((x) => x.level))];
  const shown = EXPERIMENTS.map((x, i) => ({ ...x, i })).filter((x) => levelFilter === "الكل" || x.level === levelFilter);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {levels.map((l) => <button key={l} onClick={() => setLevelFilter(l)} className={chips(levelFilter === l)}>{l}</button>)}
        <span className="text-[11px] font-bold text-slate-400 mr-1">{EXPERIMENTS.length} تجربة أسطورية · كلها تُشغَّل في المحاكي ثلاثي الأبعاد</span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {shown.map((x) => {
          const isOpen = open === x.i;
          return (
            <div key={x.title} className={`rounded-3xl ring-1 p-4 transition ${isOpen ? "bg-gradient-to-b from-emerald-50/80 to-white ring-emerald-200 ft-shadow" : "bg-white ring-slate-100"}`}>
              <button className="w-full flex items-start gap-3 text-right" onClick={() => setOpen(isOpen ? -1 : x.i)}>
                <span className="text-4xl shrink-0">{x.icon}</span>
                <span className="min-w-0">
                  <span className="block font-black font-head text-slate-900 text-[15px] leading-snug">{x.title}</span>
                  <span className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900/[0.05] ring-1 ring-slate-200 text-slate-500">{x.level}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900/[0.05] ring-1 ring-slate-200 text-slate-500">⏱ {x.time}</span>
                  </span>
                </span>
                <span className={`mr-auto shrink-0 text-[10px] font-black px-2 py-1 rounded-full ${isOpen ? "bg-emerald-500 text-white" : "bg-slate-50 ring-1 ring-slate-200 text-slate-400"}`}>{isOpen ? "مفتوحة" : "افتح"}</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ol className="mt-3 space-y-1.5">
                      {x.steps.map((st, j) => <li key={j} className="flex gap-2 text-[12.5px] text-slate-600 leading-relaxed"><span className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black mt-0.5">{j + 1}</span>{st}</li>)}
                    </ol>
                    <p className="flex gap-1.5 text-[12px] text-cyan-800 font-bold leading-relaxed mt-2.5 bg-cyan-50 ring-1 ring-cyan-100 rounded-xl px-3 py-2"><Lightbulb className="w-4 h-4 shrink-0 mt-px" /> راقب: {x.watch}</p>
                    <p className="flex gap-1.5 text-[11.5px] font-bold text-amber-700 mt-2"><ShieldAlert className="w-4 h-4 shrink-0 mt-px" /> {x.warn}</p>
                    <button onClick={() => onTry?.(x.items, x.cond)} className="pressable mt-3 w-full py-2.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[12.5px] font-head font-black ft-shadow active:scale-95">
                      <Play className="w-4 h-4 inline-block ml-1 -mt-0.5" /> نفّذها الآن في المحاكي ثلاثي الأبعاد
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
