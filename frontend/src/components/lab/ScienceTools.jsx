import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets, Flame, Atom, Calculator, Thermometer, TrendingUp, Grid3X3,
  FlaskConical, Play, Check, Beaker, Sparkles,
} from "lucide-react";
import { ELEMENTS, EL, CATS, COMPOUNDS, shells, parseFormula, molarMass } from "./chemData";
import { predict } from "./reactions";

/* ---------- scientific reference data (school values) ---------- */
const PH_ITEMS = [
  { f: "H2SO4", ar: "حمض الكبريتيك (البطارية)", ph: 0.5 }, { f: "HCl", ar: "حمض الهيدروكلوريك", ph: 1 },
  { f: "HNO3", ar: "حمض النيتريك", ph: 1 }, { f: "CH3COOH", ar: "الخل (حمض الخليك)", ph: 2.4 },
  { f: "H2O2", ar: "ماء الأكسجين", ph: 4.5 }, { f: "H2O", ar: "ماء نقي", ph: 7 },
  { f: "NaCl", ar: "محلول الملح", ph: 7 }, { f: "NaHCO3", ar: "صودا الخبز", ph: 8.4 },
  { f: "NH3", ar: "محلول الأمونيا", ph: 11.1 }, { f: "Ca(OH)2", ar: "ماء الجير", ph: 12.4 },
  { f: "NaOH", ar: "الصودا الكاوية", ph: 13 }, { f: "KOH", ar: "البوتاسا الكاوية", ph: 13.5 },
];
const HOME_PH = [
  { ar: "عصير الليمون", ph: 2.2 }, { ar: "المشروبات الغازية", ph: 3.2 }, { ar: "عصير البرتقال", ph: 3.7 },
  { ar: "القهوة", ph: 5 }, { ar: "الحليب", ph: 6.5 }, { ar: "الدم", ph: 7.4 },
  { ar: "ماء البحر", ph: 8.1 }, { ar: "الصابون", ph: 9.5 }, { ar: "الكلور المنزلي", ph: 12.5 },
];
const PH_COLORS = ["#ef4444", "#f97316", "#fb923c", "#facc15", "#a3e635", "#4ade80", "#22c55e", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#d946ef"];
const FLAMES = [
  { sym: "Li", ar: "ليثيوم", col: "#ff2d78", note: "قرمزي" }, { sym: "Na", ar: "صوديوم", col: "#ffb703", note: "أصفر ذهبي كثيف" },
  { sym: "K", ar: "بوتاسيوم", col: "#c77dff", note: "بنفسجي (ليلكي)" }, { sym: "Ca", ar: "كالسيوم", col: "#ff7b00", note: "برتقالي مائل للحمرة" },
  { sym: "Sr", ar: "سترونشيوم", col: "#ff1744", note: "أحمر قرمزي" }, { sym: "Ba", ar: "باريوم", col: "#69f0ae", note: "أخضر تفاحي" },
  { sym: "Cu", ar: "نحاس", col: "#00e5a0", note: "أخضر زمردي" }, { sym: "Zn", ar: "زنك", col: "#a5d6a7", note: "أخضر مبيض" },
];
const ACTIVITY = ["K", "Na", "Ca", "Mg", "Al", "Zn", "Fe", "Pb", "H", "Cu", "Ag", "Au"];
const SALTS = ["CuSO4", "ZnSO4", "FeSO4", "FeCl2", "ZnCl2", "AgNO3", "CuCl2"];

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

export default function ScienceTools({ onTry, onInfo }) {
  const [tool, setTool] = useState("ph");
  const TABS = [
    ["ph", "🌈", "مقياس الحموضة"], ["flame", "🔥", "اختبار اللهب"], ["atom", "⚛️", "بنّاء الذرة"],
    ["mole", "🧮", "حاسبة المولات"], ["heat", "🌡️", "منحنى التسخين"], ["series", "🏆", "سلسلة النشاط"],
    ["trends", "📊", "الاتجاهات الدورية"], ["library", "📚", "تجارب كلاسيكية"],
  ];
  return (
    <div className="bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
      <div className="h-1.5 bg-gradient-to-l from-cyan-400 via-emerald-400 to-amber-400" />
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-b from-cyan-500 to-emerald-600 grid place-items-center ft-shadow"><FlaskConical className="w-5 h-5 text-white" /></span>
          <div>
            <div className="font-head font-black text-xl text-slate-900">المختبر العلمي الكبير</div>
            <div className="text-[12px] text-slate-400 font-bold">ثماني أدوات وتجارب علمية تفاعلية من منهاجك</div>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map(([id, icon, ar]) => (
            <button key={id} onClick={() => setTool(id)} data-testid={`tool-${id}`}
              className={`pressable shrink-0 px-3.5 py-2.5 rounded-2xl text-[12.5px] font-black transition ${tool === id ? "text-white ft-shadow scale-[1.03] bg-gradient-to-l from-cyan-600 to-emerald-600" : "bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              {icon} {ar}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tool} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            {tool === "ph" && <PhLab />}
            {tool === "flame" && <FlameLab />}
            {tool === "atom" && <AtomBuilder onInfo={onInfo} />}
            {tool === "mole" && <MoleCalc />}
            {tool === "heat" && <HeatingCurve />}
            {tool === "series" && <ActivitySeries onTry={onTry} />}
            {tool === "trends" && <Trends onInfo={onInfo} />}
            {tool === "library" && <Experiments onTry={onTry} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============ 1 · pH lab ============ */
function PhLab() {
  const [ph, setPh] = useState(7);
  const shown = PH_ITEMS.find((x) => Math.abs(x.ph - ph) < 0.01);
  const col = PH_COLORS[Math.max(0, Math.min(14, Math.round(ph)))];
  const kind = ph < 6.5 ? ["حمض", "#dc2626", "يحوّل ورقة عباد الشمس الزرقاء إلى حمراء", "🍋"] : ph > 7.5 ? ["قاعدة", "#2563eb", "يحوّل ورقة عباد الشمس الحمراء إلى زرقاء", "🧼"] : ["متعادل", "#16a34a", "لا يغيّر لون ورقة عباد الشمس", "💧"];
  return (
    <div>
      <div className="grid sm:grid-cols-[1fr_260px] gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-black text-slate-500">حرّك المؤشر أو اختر مادة</span>
            <span className="text-3xl font-black font-head text-slate-900" dir="ltr">pH {ph.toFixed(1)}</span>
          </div>
          <div className="relative h-9 rounded-2xl overflow-visible ring-1 ring-slate-200" dir="ltr"
            style={{ background: `linear-gradient(90deg, ${PH_COLORS.join(",")})` }}>
            <motion.div animate={{ left: `calc(${(ph / 14) * 100}% - 14px)` }} className="absolute -top-2 w-7 h-13">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white grid place-items-center text-[11px] font-black ring-2 ring-white ft-shadow" style={{ height: 28 }}>{Math.round(ph)}</div>
              <div className="w-0 h-0 mx-auto border-x-[7px] border-x-transparent border-t-[9px] border-t-slate-900" />
            </motion.div>
          </div>
          <div className="flex justify-between text-[10px] font-black text-slate-400 mt-2" dir="ltr"><span>0 حمض قوي</span><span>7 متعادل</span><span>14 قاعدة قوية</span></div>
          <input type="range" min="0" max="14" step="0.1" value={ph} onChange={(e) => setPh(+e.target.value)} className="w-full accent-emerald-500 mt-1" aria-label="قيمة pH" />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PH_ITEMS.map((x) => <button key={x.f} onClick={() => setPh(x.ph)} className={chips(Math.abs(x.ph - ph) < 0.01)}><FxSub f={x.f} /> · {x.ph}</button>)}
            {HOME_PH.map((x) => <button key={x.ar} onClick={() => setPh(x.ph)} className={chips(Math.abs(x.ph - ph) < 0.01)}>{x.ar} · {x.ph}</button>)}
          </div>
        </div>
        <div className="rounded-3xl ring-1 ring-slate-100 bg-slate-50/60 p-4">
          <div className="text-[11px] font-black text-slate-500 mb-2">لون الكاشف العام (يونيفرسال)</div>
          <motion.div animate={{ backgroundColor: col }} className="h-20 rounded-2xl ring-1 ring-black/5 grid place-items-center">
            <span className="text-3xl">{kind[3]}</span>
          </motion.div>
          <div className="mt-3 text-center">
            <span className="text-lg font-black font-head" style={{ color: kind[1] }}>{shown ? shown.ar : kind[0]}</span>
            <p className="text-[12px] text-slate-500 font-semibold leading-relaxed mt-1">{kind[2]}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className="rounded-2xl bg-white ring-1 ring-slate-100 py-2"><div className="text-[15px]">🔴</div><div className="text-[10px] font-black text-slate-500">عباد أحمر بـ{ph < 7 ? "يبقى" : "يزرَقّ"}</div></div>
            <div className="rounded-2xl bg-white ring-1 ring-slate-100 py-2"><div className="text-[15px]">🔵</div><div className="text-[10px] font-black text-slate-500">عباد أزرق بـ{ph > 7 ? "يبقى" : "يحمَرّ"}</div></div>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold mt-4 leading-relaxed">مقياس pH لوغاريتمي: كل درجة أقل بعشر مرات تركيز أيونات الهيدروجين · القيم هنا تراكيز مدرسية تقريبية (محاليل مخففة آمنة للمدرسة).</p>
    </div>
  );
}

/* ============ 2 · flame test ============ */
function FlameLab() {
  const [sel, setSel] = useState(FLAMES[1]);
  return (
    <div className="grid sm:grid-cols-[240px_1fr] gap-6 items-center">
      <div className="relative h-56 grid place-items-end justify-center">
        <motion.div key={sel.sym} initial={{ scale: 0.7, opacity: 0.4 }} animate={{ scale: [1, 1.07, 0.97, 1.04, 1], opacity: 1 }} transition={{ duration: 1.6, repeat: Infinity }}
          className="w-28 h-44 rounded-[50%_50%_50%_50%/62%_62%_38%_38%]"
          style={{ background: `radial-gradient(50% 60% at 50% 78%, #ffffff 0%, ${sel.col} 34%, ${sel.col}88 58%, transparent 74%)`, filter: "blur(0.4px)", boxShadow: `0 0 60px 12px ${sel.col}55` }} />
        <div className="absolute bottom-0 text-center w-full">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-black">{sel.ar} · {sel.sym}</span>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap gap-1.5">
          {FLAMES.map((m) => (
            <button key={m.sym} onClick={() => setSel(m)} className={chips(sel.sym === m.sym)}>
              <span className="inline-block w-2.5 h-2.5 rounded-full ml-1 ring-1 ring-black/10" style={{ background: m.col }} />{m.ar}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-3xl bg-slate-50/70 ring-1 ring-slate-100 p-4">
          <div className="font-black font-head text-slate-900">لون اللهب: {sel.note}</div>
          <p className="text-[13px] text-slate-500 leading-relaxed mt-1.5">
            نغمس سلك بلاتين نظيفاً بحمض الهيدروكلوريك ثم بملح المعدن ونضعه بطرف لهب بنزن غير المضيء.
            إلكترونات «{sel.ar}» تمتصّ حرارة اللهب وتقفز لمستوى أعلى، وعند رجوعها تطلق الفائض ضوءاً بهذا اللون المميز · هكذا نكشف المعدن المجهول، ونفس المبدأ يلوّن الألعاب النارية 🎆
          </p>
          <p className="text-[11px] text-amber-700 font-bold mt-2">⚠️ تجربة لهب حقيقية: للمعلّم فقط وبنظارات واقية.</p>
        </div>
      </div>
    </div>
  );
}

/* ============ 3 · atom builder ============ */
function AtomBuilder({ onInfo }) {
  const [z, setZ] = useState(6);
  const [n, setN] = useState(6);
  const [e, setE] = useState(6);
  const el = ELEMENTS[z - 1];
  const sh = shells(z);
  const charge = z - e;
  const shownShells = useMemo(() => {
    const base = [...sh];
    let diff = e - z;
    let i = base.length - 1;
    while (diff > 0 && i >= 0) { base[i]++; diff--; }
    while (diff < 0 && i >= 0) { const take = Math.min(base[i], -diff); base[i] -= take; diff += take; i--; }
    return base;
  }, [sh, e, z]);
  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6">
      <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72">
        {shownShells.map((cnt, i) => (
          <div key={i} className="absolute rounded-full border border-dashed border-slate-300" style={{ inset: `${i * 34}px` }}>
            {Array.from({ length: cnt }).map((_, j) => {
              const a = (j / Math.max(1, cnt)) * Math.PI * 2 - Math.PI / 2;
              const R = 50;
              return <span key={j} className="absolute w-3.5 h-3.5 rounded-full bg-cyan-500 ring-2 ring-white ft-shadow"
                style={{ left: `calc(${50 + R * Math.cos(a)}% - 7px)`, top: `calc(${50 + R * Math.sin(a)}% - 7px)` }} />;
            })}
          </div>
        ))}
        <button onClick={() => el && onInfo?.(el)} className="pressable absolute inset-0 m-auto w-24 h-24 rounded-full grid place-items-center text-white ft-shadow-lg ring-4 ring-white" style={{ background: CATS[el?.cat || "unknown"].color }}>
          <span className="text-center text-slate-900">
            <span className="block text-[10px] font-black opacity-70">{z}</span>
            <span className="block text-3xl font-black leading-none">{el?.sym}</span>
            <span className="block text-[10px] font-bold opacity-80">{z + n}</span>
          </span>
        </button>
      </div>
      <div className="space-y-4">
        {[["البروتونات Z", z, setZ, 1, 30, "#0ea5e9"], ["النيوترونات N", n, setN, 0, 40, "#64748b"], ["الإلكترونات e", e, setE, 0, 34, "#06b6d4"]].map(([ar, v, set, mn, mx, accent]) => (
          <label key={ar} className="block">
            <span className="flex justify-between text-[12px] font-black text-slate-600"><span>{ar}</span><span dir="ltr">{v}</span></span>
            <input type="range" min={mn} max={mx} value={v} onChange={(ev) => set(+ev.target.value)} className="w-full" style={{ accentColor: accent }} />
          </label>
        ))}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[["العنصر", el ? `${el.ar} ${el.sym}` : "—"], ["عدد الكتلة A", z + n], ["الشحنة", charge === 0 ? "متعادل" : charge > 0 ? `أيون +${charge}` : `أيون ${charge}`], ["النظير", `${el?.sym || "?"}-${z + n}`]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 py-2.5 px-1">
              <div className="text-[15px] font-black text-slate-900" dir="ltr">{v}</div>
              <div className="text-[10px] text-slate-400 font-black mt-0.5">{k}</div>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-slate-500 leading-relaxed">
          عدد البروتونات وحده يحدّد هوية العنصر · النيوترونات تصنع النظائر (مثل كربون-14 للتأريخ) · وإذا اختلف عدد الإلكترونات عن البروتونات صارت الذرّة أيوناً مشحوناً.
          التوزيع الإلكتروني هنا: {sh.join(" · ")} {charge !== 0 && "· بهذه التجربة أصبح أيوناً"}.
        </p>
      </div>
    </div>
  );
}

/* ============ 4 · mole calculator ============ */
function MoleCalc() {
  const [f, setF] = useState("H2O");
  const [grams, setGrams] = useState(18);
  const M = molarMass(f);
  const mol = grams / M;
  const parts = Object.entries(parseFormula(f));
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {COMPOUNDS.slice(0, 24).map((c) => <button key={c.f} onClick={() => setF(c.f)} className={chips(f === c.f)}><FxSub f={c.f} /></button>)}
        </div>
        <label className="block mt-4">
          <span className="text-[12px] font-black text-slate-600">الكتلة بالغرام</span>
          <input type="number" min="0" value={grams} onChange={(e) => setGrams(Math.max(0, +e.target.value || 0))}
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-lg focus:outline-none focus:ring-emerald-300" dir="ltr" />
        </label>
        <input type="range" min="0" max={Math.max(100, M * 4)} value={grams} onChange={(e) => setGrams(+e.target.value)} className="w-full accent-emerald-500 mt-2" />
      </div>
      <div className="space-y-2.5">
        {[["الكتلة المولية", `${M} g/mol`], ["عدد المولات", `${mol.toFixed(3)} mol`], ["عدد الجسيمات (أفوجادرو)", `${(mol * 6.022e23).toExponential(2)}`], ["عدد الذرات الكلي", `${(mol * 6.022e23 * parts.reduce((a, [, n2]) => a + n2, 0)).toExponential(2)}`]].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-2xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3">
            <span className="text-[12px] font-black text-slate-500">{k}</span>
            <span className="font-black font-head text-slate-900" dir="ltr">{v}</span>
          </div>
        ))}
        <p className="text-[12px] text-slate-400 font-semibold leading-relaxed">المول جسر الكيميائي بين الميزان وعالم الذرات: مول واحد من أي مادة فيه 6.022×10²³ جسيماً دائماً · مول الماء 18 غراماً فقط لكن فيه ذرات أكثر من نجوم مجرّتنا ✨</p>
      </div>
    </div>
  );
}

/* ============ 5 · heating curve ============ */
function HeatingCurve() {
  const [t, setT] = useState(25);
  const py = (v) => (v < 0 ? 150 - ((v + 20) / 20) * 30 : v < 100 ? 120 - (v / 100) * 76 : 44 - Math.min(14, (v - 100) * 0.7));
  const px = 10 + ((t + 20) / 140) * 212;
  const phase = t < 0 ? ["🧊 جليد صلب", "الجزيئات تهتز حول مواضعها فقط · كل حرارة ترفع حرارتها فعلاً"]
    : t < 1 ? ["🧊←💧 الانصهار عند 0°م", "الحرارة تُنفق على كسر روابط الجليد لا على رفع الحرارة · خط ثابت رغم التسخين!"]
    : t < 100 ? ["💧 ماء سائل", "ترتفع الحرارة وتزداد سرعة الجزيئات وتباعدها"]
    : t < 101 ? ["💧←♨️ الغليان عند 100°م", "الحرارة تُنفق على تحويل السائل إلى بخار · ثابتة حتى آخر قطرة"]
    : ["♨️ بخار ماء (غاز)", "جزيئات حرة تملأ الوعاء كله · الحرارة ترفع الحرارة من جديد"];
  return (
    <div className="grid sm:grid-cols-[1fr_240px] gap-6">
      <div>
        <svg viewBox="0 0 232 170" className="w-full rounded-3xl bg-slate-50/70 ring-1 ring-slate-100" dir="ltr">
          <polyline points="8,150 40,120 72,120 152,44 190,44 226,30" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" />
          <line x1="56" y1="120" x2="56" y2="160" stroke="#cbd5e1" strokeDasharray="3 3" />
          <text x="32" y="112" fontSize="8.5" fill="#64748b" fontWeight="700">0°C انصهار</text>
          <line x1="171" y1="44" x2="171" y2="160" stroke="#cbd5e1" strokeDasharray="3 3" />
          <text x="140" y="36" fontSize="8.5" fill="#64748b" fontWeight="700">100°C غليان</text>
          <circle cx={px} cy={py(t)} r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
          <text x="12" y="166" fontSize="8.5" fill="#94a3b8" fontWeight="700">الزمن مع تسخين ثابت ←</text>
        </svg>
        <input type="range" min="-20" max="120" value={t} onChange={(e) => setT(+e.target.value)} className="w-full accent-orange-500 mt-3" aria-label="درجة الحرارة" />
      </div>
      <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 p-4">
        <div className="text-3xl font-black font-head text-slate-900" dir="ltr">{t}°C</div>
        <div className="text-lg font-black text-sky-800 mt-1">{phase[0]}</div>
        <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1.5">{phase[1]}</p>
        <p className="text-[11.5px] text-amber-700 font-bold leading-relaxed mt-2">سرّ المنهاج: على الهضبتين الحرارة «تختفي» داخل كسر الروابط (طاقة كامنة) فلا ترفع حرارة المادة أبداً حتى تتحوّل كلها.</p>
      </div>
    </div>
  );
}

/* ============ 6 · activity series ============ */
function ActivitySeries({ onTry }) {
  const [metal, setMetal] = useState("Fe");
  const [salt, setSalt] = useState("CuSO4");
  const verdict = useMemo(() => {
    try { return predict([{ f: metal }, { f: salt }], null); } catch { return null; }
  }, [metal, salt]);
  return (
    <div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2" dir="ltr">
        {ACTIVITY.map((m, i) => (
          <div key={m} className="flex flex-col items-center shrink-0">
            <div className={`w-9 sm:w-11 rounded-t-xl grid place-items-center text-[12px] font-black text-slate-900 ring-1 ring-black/5 ${m === "H" ? "ring-2 ring-slate-400" : ""}`}
              style={{ height: `${118 - i * 8}px`, background: m === "H" ? "#e2e8f0" : (EL[m]?.col || "#cbd5e1") }}>
              {m}
            </div>
            <span className="text-[9px] font-bold text-slate-400 mt-1">{EL[m]?.ar || "هيدروجين"}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 font-bold">من الأنشط يساراً إلى الأقل نشاطاً يميناً · كل معدن يُحِلّ من هو تحته من محاليل أملاحه</p>
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end mt-4">
        <div>
          <div className="text-[12px] font-black text-slate-600 mb-1.5">اختر معدناً</div>
          <div className="flex flex-wrap gap-1.5">{["Mg", "Al", "Zn", "Fe", "Pb", "Cu", "Ag"].map((m) => <button key={m} onClick={() => setMetal(m)} className={chips(metal === m)}>{EL[m].ar} {m}</button>)}</div>
        </div>
        <div className="text-2xl font-black text-slate-300 text-center">+</div>
        <div>
          <div className="text-[12px] font-black text-slate-600 mb-1.5">اختر محلول ملح</div>
          <div className="flex flex-wrap gap-1.5">{SALTS.map((sf) => <button key={sf} onClick={() => setSalt(sf)} className={chips(salt === sf)}><FxSub f={sf} /></button>)}</div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={metal + salt} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-3xl p-4 ring-1 ${verdict?.reacts ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50/70 ring-rose-100"}`}>
          {verdict?.reacts ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-black text-emerald-800">✓ يحدث إحلال: «{EL[metal].ar}» أنشط فيزيح المعدن الآخر</span>
              <button onClick={() => onTry?.([metal, salt], null)} className="pressable mr-auto px-4 py-2.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[12.5px] font-head font-black ft-shadow active:scale-95"><Play className="w-4 h-4 inline-block ml-1 -mt-0.5" /> شاهده بالمختبر</button>
            </div>
          ) : (
            <span className="text-[14px] font-black text-rose-700">✗ لا إحلال: «{EL[metal].ar}» أضعف من معدن الملح فلا يستطيع إزاحته · جرّب معدناً أعلى بالسلسلة</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============ 7 · periodic trends ============ */
function Trends({ onInfo }) {
  const [mode, setMode] = useState("mass");
  const colorFor = (el) => {
    if (mode === "mass") { const k = Math.min(1, Math.log10(el.mass) / 2.5); return `hsl(${212 - k * 160} 85% ${88 - k * 38}%)`; }
    if (mode === "eneg") { if (el.en == null) return "#e2e8f0"; const k = (el.en - 0.7) / 3.3; return `hsl(${280 - k * 280} 85% ${88 - Math.max(0, k) * 40}%)`; }
    return { g: "#7dd3fc", l: "#fbbf24", s: "#cbd5e1" }[el.state] || "#e2e8f0";
  };
  const legend = mode === "mass" ? "الأزرق خفيف ← الوردي ثقيل (حتى 294)" : mode === "eneg" ? "البارد ضعيف الجذب ← الحارق الأقوى (الفلور 3.98)" : "سماوي غاز · ذهبي سائل · رمادي صلب";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {[["mass", "الكتلة الذرية"], ["eneg", "الكهروسلبية"], ["state", "حالة المادة"]].map(([id, ar]) => (
          <button key={id} onClick={() => setMode(id)} className={chips(mode === id)}>{ar}</button>
        ))}
        <span className="text-[11px] font-bold text-slate-400 mr-2">{legend}</span>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-slate-50/70 ring-1 ring-slate-100 p-3">
        <div className="min-w-[600px] grid gap-[2.5px]" style={{ gridTemplateColumns: "repeat(18, minmax(0,1fr))" }} dir="ltr">
          {ELEMENTS.filter((e) => e.g > 0).sort((a, b) => a.p - b.p || a.g - b.g).map((el) => (
            <button key={el.z} onClick={() => onInfo?.(el)} title={`${el.ar} · ${mode === "mass" ? el.mass : mode === "eneg" ? (el.en ?? "—") : el.state}`}
              className="pressable aspect-[0.95] rounded-[5px] flex flex-col items-center justify-center ring-1 ring-black/5 hover:scale-[1.18] hover:z-10 transition"
              style={{ gridColumn: el.g, gridRow: el.p, background: colorFor(el) }}>
              <span className="text-[11px] font-black text-slate-900 leading-none">{el.sym}</span>
              <span className="text-[7px] font-bold text-slate-700/70 leading-none mt-0.5">{mode === "mass" ? Math.round(el.mass) : mode === "eneg" ? (el.en ?? "–") : el.z}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold mt-3 leading-relaxed">الجدول الدوري ليس عشوائياً: الكتلة تكبر كلما نزلت واتجهت يميناً، والكهروسلبية تشتد نحو الفلور أعلى اليمين · هذه الاتجاهات تفسّر أغلب تفاعلات الكيمياء. اضغط أي عنصر لملفّه.</p>
    </div>
  );
}

/* ============ 8 · classic experiments library ============ */
const EXPERIMENTS = [
  { icon: "🚀", title: "وقود الصواريخ: تكوين الماء", items: ["H2", "O2"], cond: "spark", steps: ["اخلط غازي الهيدروجين والأكسجين بنسبة 2:1", "قرّب شرارة (لا يبدأ دونها)", "فرقعة ثم قطرات ماء على جدار بارد"], warn: "غاز متفجر · مختبر افتراضي آمن هنا" },
  { icon: "🌋", title: "بركان صودا الخبز", items: ["NaHCO3", "CH3COOH"], cond: null, steps: ["ضع صودا الخبز بالكأس", "اسكب الخل فوقها", "شاهد فوران CO2 يفيض كالحمم"], warn: "آمن منزلياً بإشراف" },
  { icon: "🌧️", title: "المطر الذهبي", items: ["Pb(NO3)2", "KI"], cond: null, steps: ["امزج محلولي نترات الرصاص ويوديد البوتاسيوم", "بلورات صفراء ذهبية تهطل فوراً", "سخّن تذوب · برّد تعود أجمل"], warn: "أملاح الرصاص سامة · للمختبر المدرسي فقط" },
  { icon: "🥛", title: "كاشف ثاني أكسيد الكربون", items: ["Ca(OH)2", "CO2"], cond: null, steps: ["حضّر ماء جير صافياً", "انفخ فيه بقشة (زفيرك CO2)", "يتعكر حليبياً = كشف إيجابي"], warn: "آمن" },
  { icon: "✨", title: "وهج المغنيسيوم الأبيض", items: ["Mg", "O2"], cond: "spark", steps: ["أمسك الشريط بملقط", "أشعل طرفه باللهب", "وهج أبيض ساطع ورماد أبيض MgO"], warn: "لا تنظر للوهج مباشرة" },
  { icon: "🫧", title: "فقاعات الهيدروجين", items: ["Zn", "HCl"], cond: null, steps: ["قطع زنك بحمض مخفف", "فقاعات تتصاعد فوراً", "اختبار الفرقعة يثبت أنه هيدروجين"], warn: "حمض مخفف + نظارات واقية" },
  { icon: "🔌", title: "تفكيك الماء بالكهرباء", items: ["H2O"], cond: "electric", steps: ["املأ جهاز فولتامتر بالماء", "وصّل البطارية", "الهيدروجين عند السالب ضعف حجم الأكسجين"], warn: "تيار منخفض فقط" },
  { icon: "🌱", title: "مصنع الغذاء الأخضر", items: ["CO2", "H2O"], cond: "light", steps: ["نبتة مائية بكأس ماء", "عرّضها لضوء قوي", "فقاعات أكسجين تتصاعد من الأوراق"], warn: "تجربة صفية آمنة ومحبوبة" },
];
function Experiments({ onTry }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {EXPERIMENTS.map((x, i) => (
        <div key={x.title} className={`rounded-3xl ring-1 p-4 transition ${open === i ? "bg-gradient-to-b from-emerald-50/70 to-white ring-emerald-200 ft-shadow" : "bg-white ring-slate-100"}`}>
          <button className="w-full flex items-center gap-3 text-right" onClick={() => setOpen(open === i ? -1 : i)}>
            <span className="text-3xl">{x.icon}</span>
            <span className="font-black font-head text-slate-900 text-[15px]">{x.title}</span>
            <span className={`mr-auto text-[10px] font-black px-2 py-1 rounded-full ${open === i ? "bg-emerald-500 text-white" : "bg-slate-50 ring-1 ring-slate-200 text-slate-400"}`}>{open === i ? "مفتوحة" : "افتح"}</span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <ol className="mt-3 space-y-1.5">
                  {x.steps.map((st, j) => <li key={j} className="flex gap-2 text-[13px] text-slate-600 leading-relaxed"><span className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black mt-0.5">{j + 1}</span>{st}</li>)}
                </ol>
                <p className="text-[11px] font-bold text-amber-700 mt-2">⚠️ {x.warn}</p>
                <button onClick={() => onTry?.(x.items, x.cond)} className="pressable mt-3 px-4 py-2.5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[12.5px] font-head font-black ft-shadow active:scale-95">
                  <Play className="w-4 h-4 inline-block ml-1 -mt-0.5" /> نفّذها الافتراضي الآن
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
