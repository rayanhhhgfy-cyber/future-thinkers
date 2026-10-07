import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dna, Microscope, HeartPulse, Shield,
  Calculator, Trophy, Sparkles, RotateCcw, Check, X, Lightbulb, ChevronLeft, FlaskConical,
  Zap, Timer, Award, Sun, Play, Pause,
} from "lucide-react";
import { Layout } from "@/components/Layout";

/* ================= shared bits ================= */
import { cardCls, chips, fmt, SecHead, Steps, gradBtn, useReducedMotion, LazyMount, RANKS, BADGES, FACTS, loadProfile, todayStr, AA, CODON, BASE_COMP, cleanDna, translateDna } from "@/components/lab/bioCore";
const ORGANELLES = [
  { id: "nucleus", ar: "النواة", icon: "🟣", fn: "مركز القيادة: تخزّن الحمض النووي DNA وتدير أنشطة الخلية كلها وتنسّق انقسامها.", fact: "نواة الخلية البشرية تخزّن نحو مترين من DNA مطويّاً بعناية داخل 6 ميكرومترات فقط." },
  { id: "mito", ar: "الميتوكوندريا", icon: "⚡", fn: "محطة الطاقة: تحرق الغلوكوز بالأكسجين وتنتج ATP عملة الطاقة التي تشغّل كل عمليات الخلية.", fact: "للميتوكوندريا حمض نووي خاص بها، دليل أنها كانت بكتيريا مستقلة سكنت الخلية الأولى." },
  { id: "ribo", ar: "الريبوسومات", icon: "🔴", fn: "مصانع البروتين: تقرأ رسالة mRNA وتسلسل الأحماض الأمينية لبناء البروتينات.", fact: "الخلية الواحدة قد تضم ملايين الريبوسومات، وكل واحد يبني سلسلة بروتين كاملة في ثوانٍ." },
  { id: "golgi", ar: "جهاز غولجي", icon: "📦", fn: "مركز التغليف والشحن: يعدّل البروتينات ويلفّها في حويصلات ويرسلها لوجهتها داخل الخلية أو خارجها.", fact: "سمي باسم العالم كاميلو غولجي الذي رأاه أول مرة عام 1898 ولم يصدّقه كثيرون لسنوات." },
  { id: "er", ar: "الشبكة الإندوبلازمية", icon: "🌀", fn: "شبكة النقل والتصنيع: الخشنة (عليها ريبوسومات) تصنع البروتينات، والملساء تصنع الدهون وتزيل السموم.", fact: "أغشية الشبكة الإندوبلازمية في خلية كبد واحدة قد تمتد كيلومترات لو فُردت." },
  { id: "membrane", ar: "الغشاء الخلوي", icon: "🛡️", fn: "الحارس الانتقائي: طبقة دهنية ذكية تسمح بدخول الغذاء والأكسجين وتمنع المواد الضارة وتحمل مستقبلات للإشارات.", fact: "غشاؤك الخلوي ليس جداراً صلباً بل بحر سائل من الدهون تسبح فيه البروتينات كالجزر." },
  { id: "cyto", ar: "السيتوبلازم", icon: "💧", fn: "السائل الهلامي الذي تسبح فيه العضيّات وتجري فيه معظم التفاعلات الكيميائية للخلية.", fact: "السيتوبلازم ليس ساكناً: يتدفق باستمرار وينقل المواد والعضيّات داخل الخلية." },
  { id: "lyso", ar: "الليسوسوم", icon: "🧹", fn: "جهاز التنظيف والهضم: أكياس إنزيمات قوية تذيب الفضلات والبكتيريا الغازية والعضيّات التالفة.", fact: "إنزيمات الليسوسوم قوية لدرجة أنها لو تسربت بكثافة لهضمت الخلية نفسها، لذا جداره محكم جداً." },
  { id: "vac", ar: "الفجوة", icon: "🫧", fn: "مخزن الخلية: تحفظ الماء والأملاح والفضلات. بالنباتات فجوة مركزية ضخمة تضغط الجدار وتمنح النبات صلابته.", fact: "عندما تذبل الخضار في ثلاجتك فالسبب فراغ فجواتها من الماء، فتنكمش الخلايا ويرتخي النبات." },
  { id: "chloro", ar: "البلاستيدات الخضراء", icon: "🌿", fn: "مطابخ النبات الشمسية: فيها الكلوروفيل الذي يلتقط ضوء الشمس ويجري البناء الضوئي صانعاً الغذاء والأكسجين. (نباتية فقط)", fact: "البلاستيدات، مثل الميتوكوندريا، لها DNA خاص، وكانت يوماً بكتيريا زرقاء تعيش حرّة.", plant: true },
];
const CytoParticles = React.memo(function CytoParticles({ drift }) {
  const PTS = [[120, 90, 150, 120], [300, 70, 340, 95], [480, 90, 440, 120], [560, 180, 520, 205], [420, 330, 460, 305], [230, 330, 200, 300], [90, 260, 130, 285], [520, 250, 555, 225], [330, 240, 305, 268], [180, 200, 210, 225], [400, 160, 430, 140], [270, 120, 240, 145]];
  return (
    <g aria-hidden="true" opacity="0.55">
      {PTS.map(([x1, y1, x2, y2], i) => (
        <circle key={i} cx={x1} cy={y1} r={2.2 + (i % 3)} fill={i % 3 === 0 ? "#65a30d" : i % 3 === 1 ? "#a3e635" : "#4d7c0f"}>
          {drift && <animate attributeName="cx" values={`${x1};${x2};${x1}`} dur={`${7 + (i % 5) * 1.7}s`} repeatCount="indefinite" />}
          {drift && <animate attributeName="cy" values={`${y1};${y2};${y1}`} dur={`${6 + (i % 4) * 1.9}s`} repeatCount="indefinite" />}
        </circle>
      ))}
    </g>
  );
});
const MembraneRings = React.memo(function MembraneRings() {
  return (
    <g aria-hidden="true">
      {Array.from({ length: 72 }).map((_, k) => { const t = (k / 72) * Math.PI * 2; return <circle key={"o" + k} cx={320 + 293 * Math.cos(t)} cy={200 + 175 * Math.sin(t)} r="2.7" fill="#15803d" opacity="0.55" />; })}
      {Array.from({ length: 72 }).map((_, k) => { const t = (k / 72) * Math.PI * 2; return <circle key={"i" + k} cx={320 + 283 * Math.cos(t)} cy={200 + 165 * Math.sin(t)} r="2.7" fill="#22c55e" opacity="0.55" />; })}
    </g>
  );
});
export const CellExplorer = React.memo(function CellExplorer({ act }) {
  const [plant, setPlant] = useState(false);
  const [drift, setDrift] = useState(true);
  const [sel, setSel] = useState("nucleus");
  const reduced = useReducedMotion();
  const info = ORGANELLES.find((o) => o.id === sel) || ORGANELLES[0];
  const pick = (id) => {
    setSel(id);
    const n = act.seen("cellSeen", id);
    act.award(5, `cell-${id}`);
    if (n >= 5) act.awardBadge("cell");
  };
  const hi = (id) => (sel === id ? { stroke: "#f59e0b", strokeWidth: 4, filter: "drop-shadow(0 0 6px rgba(245,158,11,0.8))" } : {});
  return (
    <section data-testid="bio-cell" className={cardCls}>
      <SecHead icon="🧫" grad="from-lime-500 to-green-600" title="مستكشف الخلية التفاعلي" sub="اضغط أي عضيّة داخل الخلية لتقرأ ملفّها الكامل" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setPlant(false)} className={chips(!plant)}>🐾 خلية حيوانية</button>
        <button onClick={() => setPlant(true)} className={chips(plant)}>🌱 خلية نباتية</button>
        <button onClick={() => setDrift((d) => !d)} className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl ring-1 font-black text-[12.5px] transition bg-white ring-slate-200 text-slate-600 hover:ring-lime-300">
          {drift ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} حركة السيتوبلازم {drift ? "تعمل" : "متوقفة"}
        </button>
        <span className="text-[11px] font-bold text-slate-400 self-center">النباتية تضيف: جداراً خلوياً وبلاستيدات وفجوة عملاقة · المجسّات تتحرك كما بالخلية الحية</span>
      </div>
      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4">
        <div className="rounded-3xl bg-gradient-to-b from-lime-50/80 to-white ring-1 ring-lime-100 p-2 overflow-hidden">
          <svg viewBox="0 0 640 400" className="w-full h-auto" role="img" aria-label="رسم خلية تفاعلي">
            <defs>
              <radialGradient id="cytoG" cx="45%" cy="40%"><stop offset="0%" stopColor="#f7fee7" /><stop offset="100%" stopColor="#dcfce7" /></radialGradient>
              <radialGradient id="nucG" cx="40%" cy="35%"><stop offset="0%" stopColor="#ddd6fe" /><stop offset="100%" stopColor="#8b5cf6" /></radialGradient>
              <linearGradient id="mitoG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#ea580c" /></linearGradient>
              <linearGradient id="chlG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80" /><stop offset="100%" stopColor="#15803d" /></linearGradient>
              <radialGradient id="vacG" cx="45%" cy="40%"><stop offset="0%" stopColor="#e0f2fe" /><stop offset="100%" stopColor="#7dd3fc" /></radialGradient>
              <clipPath id="mitoC1"><ellipse cx="452" cy="300" rx="46" ry="21" /></clipPath>
              <clipPath id="mitoC2"><ellipse cx="138" cy="296" rx="40" ry="19" /></clipPath>
              <clipPath id="mitoC3"><ellipse cx="500" cy="128" rx="38" ry="18" /></clipPath>
            </defs>
            {plant && <rect x="14" y="14" width="612" height="372" rx="70" fill="#ecfccb" stroke="#65a30d" strokeWidth="9" />}
            <ellipse cx="320" cy="200" rx="288" ry="170" fill="url(#cytoG)" onClick={() => pick("cyto")} className="cursor-pointer" />
            <CytoParticles drift={drift && !reduced} />
            {plant && <ellipse cx="345" cy="215" rx="150" ry="98" fill="url(#vacG)" opacity="0.85" stroke="#38bdf8" strokeWidth="2" onClick={() => pick("vac")} className="cursor-pointer" {...hi("vac")} />}
            {plant && (
              <g onClick={() => pick("chloro")} className="cursor-pointer" {...hi("chloro")}>
                {[[150, 108, -18], [522, 100, 14], [148, 312, 10], [545, 300, -12], [95, 205, 24], [320, 82, -6], [580, 205, 18]].map(([cx, cy, rot], i) => (
                  <g key={i} transform={`rotate(${rot} ${cx} ${cy})`}>
                    <ellipse cx={cx} cy={cy} rx="40" ry="20" fill="url(#chlG)" stroke="#166534" strokeWidth="1.6" />
                    {[-9, -3, 3, 9].map((dy, k) => <line key={k} x1={cx - 30} y1={cy + dy} x2={cx + 30} y2={cy + dy} stroke="#14532d" strokeWidth="2.2" opacity="0.55" />)}
                    {[[-16, -4], [0, 4], [16, -3]].map(([ox, oy], k) => <ellipse key={k} cx={cx + ox} cy={cy + oy} rx="7" ry="3.4" fill="#166534" opacity="0.75" />)}
                  </g>
                ))}
              </g>
            )}
            <g onClick={() => pick("er")} className="cursor-pointer" {...hi("er")}>
              <path d="M150 130 Q225 90 300 118 M140 165 Q225 130 305 152 M145 235 Q225 265 300 240" stroke="#f472b6" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.75" />
              <path d="M330 260 Q420 300 520 280 M350 300 Q430 330 500 318" stroke="#f9a8d4" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.7" />
              {[[168, 120], [196, 108], [226, 102], [256, 106], [282, 114], [162, 154], [196, 143], [232, 139], [264, 144], [290, 151], [168, 240], [204, 252], [240, 254], [272, 247], [356, 282], [392, 296], [428, 300], [464, 292]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill="#e11d48" stroke="#881337" strokeWidth="0.8" />)}
            </g>
            <g onClick={() => pick("golgi")} className="cursor-pointer" {...hi("golgi")}>
              <path d="M458 176 Q512 152 566 176" stroke="#be123c" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.55" />
              <path d="M462 196 Q512 174 562 196" stroke="#e11d48" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M466 216 Q512 196 558 216" stroke="#f43f5e" strokeWidth="9" fill="none" strokeLinecap="round" />
              <path d="M472 236 Q512 218 552 236" stroke="#fb7185" strokeWidth="8" fill="none" strokeLinecap="round" />
              <circle cx="570" cy="246" r="10" fill="#fda4af" stroke="#e11d48" strokeWidth="1.6" /><circle cx="448" cy="168" r="7.5" fill="#fda4af" stroke="#e11d48" strokeWidth="1.4" /><circle cx="556" cy="258" r="6" fill="#fda4af" /><circle cx="486" cy="252" r="5" fill="#fecdd3" />
            </g>
            <g onClick={() => pick("mito")} className="cursor-pointer" {...hi("mito")}>
              <g transform="rotate(-18 452 300)">
                <ellipse cx="452" cy="300" rx="46" ry="21" fill="url(#mitoG)" stroke="#9a3412" strokeWidth="2" />
                <g clipPath="url(#mitoC1)">{[424, 436, 448, 460, 472].map((x, i) => <path key={i} d={`M${x} 282 q7 9 0 18 q-7 9 0 18`} stroke="#7c2d12" strokeWidth="3" fill="none" />)}</g>
              </g>
              <g transform="rotate(12 138 296)">
                <ellipse cx="138" cy="296" rx="40" ry="19" fill="url(#mitoG)" stroke="#9a3412" strokeWidth="2" />
                <g clipPath="url(#mitoC2)">{[114, 126, 138, 150, 162].map((x, i) => <path key={i} d={`M${x} 279 q6 8 0 17 q-6 8 0 17`} stroke="#7c2d12" strokeWidth="2.6" fill="none" />)}</g>
              </g>
              <g transform="rotate(8 500 128)">
                <ellipse cx="500" cy="128" rx="38" ry="18" fill="url(#mitoG)" stroke="#9a3412" strokeWidth="2" />
                <g clipPath="url(#mitoC3)">{[478, 489, 500, 511, 522].map((x, i) => <path key={i} d={`M${x} 112 q6 8 0 16 q-6 8 0 16`} stroke="#7c2d12" strokeWidth="2.6" fill="none" />)}</g>
              </g>
            </g>
            <g onClick={() => pick("nucleus")} className="cursor-pointer" transform={plant ? "translate(-96 -62)" : undefined} {...hi("nucleus")}>
              <circle cx="228" cy="185" r="62" fill="url(#nucG)" stroke="#6d28d9" strokeWidth="3" />
              <circle cx="228" cy="185" r="54" fill="none" stroke="#ede9fe" strokeWidth="1.6" strokeDasharray="3 5" opacity="0.8" />
              <path d="M190 150 q20 -14 44 -6 M182 190 q18 16 44 12 M226 138 q26 4 40 24 M204 224 q28 10 52 -4 M186 168 q14 8 30 4" stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
              {[[196, 158], [262, 160], [206, 216], [256, 214], [228, 140], [176, 196]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#a78bfa" opacity="0.85" />)}
              <circle cx="228" cy="185" r="21" fill="#4c1d95" opacity="0.9" />
              <circle cx="221" cy="178" r="6" fill="#7c3aed" opacity="0.9" />
            </g>
            <g onClick={() => pick("ribo")} className="cursor-pointer" {...hi("ribo")}>
              {[[176, 148], [196, 138], [258, 132], [282, 148], [352, 268], [392, 284], [430, 290], [330, 130], [420, 160], [96, 210], [560, 160], [300, 320]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6.5" fill="#e11d48" stroke="#881337" strokeWidth="1.4" />)}
            </g>
            <g onClick={() => pick("lyso")} className="cursor-pointer" {...hi("lyso")}>
              <circle cx="106" cy="112" r="19" fill="#fb7185" stroke="#be123c" strokeWidth="2.5" />
              <circle cx="566" cy="298" r="15" fill="#fb7185" stroke="#be123c" strokeWidth="2.5" />
            </g>
            {!plant && <circle cx="545" cy="332" r="27" fill="url(#vacG)" stroke="#38bdf8" strokeWidth="2" onClick={() => pick("vac")} className="cursor-pointer" {...hi("vac")} />}
            <MembraneRings />
            <ellipse cx="320" cy="200" rx="288" ry="170" fill="none" stroke={sel === "membrane" ? "#f59e0b" : "#16a34a"} strokeWidth="3" onClick={() => pick("membrane")} className="cursor-pointer" />
            <g aria-hidden="true">
              <line x1="36" y1="374" x2="116" y2="374" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <line x1="36" y1="368" x2="36" y2="380" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <line x1="116" y1="368" x2="116" y2="380" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
              <text x="76" y="362" textAnchor="middle" fontSize="11" fontWeight="800" fill="#334155">10 µm</text>
            </g>
            {plant && <text x="320" y="392" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4d7c0f">الجدار الخلوي الخارجي يمنح الخلية النباتية شكلها الثابت</text>}
          </svg>
          <p className="text-[11px] text-slate-400 font-bold px-2 pb-1 leading-relaxed">الأحجام النسبية واقعية تقريباً: النواة أكبر عضيّة (نحو 6 µm)، والميتوكوندريا بحجم بكتيريا (1 إلى 2 µm)، والريبوسومات الأصغر (نحو 20 نانومتراً) · غشاء الخلية طبقتان دهنيّتان كما تراهما بالنقاط الخضراء.</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={sel + String(plant)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-3xl bg-gradient-to-b from-lime-50 to-white ring-1 ring-lime-200 p-5">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 grid place-items-center rounded-2xl bg-white ring-1 ring-lime-200 text-2xl ft-shadow">{info.icon}</span>
              <div>
                <div className="font-head font-black text-slate-900 text-lg leading-tight">{info.ar}</div>
                <div className="text-[11px] text-lime-700 font-black">{info.plant ? "عضيّة نباتية" : plant ? "موجودة بالخلية النباتية أيضاً" : "عضيّة أساسية"}</div>
              </div>
              <span className="mr-auto text-[10.5px] font-black px-2.5 py-1 rounded-full bg-lime-600 text-white">اكتشفتها ✓</span>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-black text-slate-400">الوظيفة</div>
              <p className="text-[13.5px] text-slate-700 leading-relaxed mt-0.5">{info.fn}</p>
            </div>
            <div className="mt-3 rounded-2xl bg-amber-50 ring-1 ring-amber-100 px-3.5 py-2.5">
              <div className="text-[11px] font-black text-amber-700 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> حقيقة مذهلة</div>
              <p className="text-[12.5px] text-slate-600 leading-relaxed mt-0.5">{info.fact}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ORGANELLES.filter((o) => !o.plant || plant).map((o) => (
                <button key={o.id} onClick={() => pick(o.id)} className={chips(sel === o.id)}>{o.icon} {o.ar}</button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
});

/* ================= 10 · virtual microscope ================= */
const SLIDES = [
  { id: "onion", ar: "خلايا قشرة البصل", icon: "🧅", note: "خلايا نباتية مستطيلة منتظمة كجدار من الطوب، لكل واحدة نواة قريبة من الجدار · صبغة وردية وبنفسجية كما بشرائح المختبر الحقيقية.", draw: (z, lab) => (<g><rect x="0" y="0" width="640" height="400" fill="#fdf2f8" />{Array.from({ length: 6 }).map((_, r) => Array.from({ length: 4 }).map((_, c) => (<g key={r + "-" + c}><rect x={30 + c * 95} y={30 + r * 58} width="88" height="52" rx="10" fill="#fbcfe8" stroke="#be185d" strokeWidth="2.5" /><ellipse cx={52 + c * 95 + (r % 3) * 18} cy={50 + r * 58 + (c % 2) * 14} rx={7 + z * 2.5} ry={5.5 + z * 2} fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.4" /><circle cx={52 + c * 95 + (r % 3) * 18} cy={50 + r * 58 + (c % 2) * 14} r={2 + z} fill="#2e1065" />{lab && c === 1 && r === 1 && <text x={70 + c * 95} y={46 + r * 58} fontSize="13" fontWeight="800" fill="#6d28d9">نواة</text>}</g>)))}</g>) },
  { id: "blood", ar: "مسحة دم", icon: "🩸", note: "كريات حمراء قرصية بأعداد هائلة بلا نوى، وخلية بيضاء واحدة كبيرة بنواة مفصصة · صبغة غيمزا كما بمسحات المختبر الطبية.", draw: (z, lab) => (<g><rect x="0" y="0" width="640" height="400" fill="#fdf4ff" />{Array.from({ length: 34 }).map((_, i) => { const x = 40 + ((i * 83) % 545), y = 36 + ((i * 61) % 316); return (<g key={i}><circle cx={x} cy={y} r={13 + (z - 1) * 3} fill="#fda4af" stroke="#e11d48" strokeWidth="2" /><circle cx={x} cy={y} r={(13 + (z - 1) * 3) * 0.45} fill="#fecdd3" /></g>); })}<circle cx="330" cy="190" r={30 + z * 4} fill="#e9d5ff" stroke="#7e22ce" strokeWidth="3" /><circle cx="322" cy="182" r="12" fill="#6d28d9" /><circle cx="342" cy="198" r="10" fill="#6d28d9" /><circle cx="330" cy="206" r="8" fill="#6d28d9" />{lab && <text x="330" y="140" textAnchor="middle" fontSize="13" fontWeight="800" fill="#581c87">خلية دم بيضاء</text>}</g>) },
  { id: "bacteria", ar: "بكتيريا عصوية", icon: "🦠", note: "عصيّات دقيقة متحركة بسوط، أصغر من الخلايا حقيقية النواة بعشرات المرات ولا نواة حقيقية لها · مصبوغة بنفسجياً بصبغة غرام.", draw: (z, lab) => (<g><rect x="0" y="0" width="640" height="400" fill="#faf5ff" />{Array.from({ length: 16 }).map((_, i) => { const x = 60 + ((i * 97) % 520), y = 50 + ((i * 71) % 300); return (<g key={i} transform={`rotate(${i * 27} ${x} ${y})`}><rect x={x - 26} y={y - 9} width="52" height="18" rx="9" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="2" /><ellipse cx={x} cy={y} rx="15" ry="4.5" fill="#8b5cf6" opacity="0.65" /><path d={`M${x + 26} ${y} q 16 -8 26 2`} stroke="#7c3aed" strokeWidth="2.5" fill="none" /></g>); })}{lab && <text x="320" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill="#4c1d95">سوط الحركة</text>}</g>) },
  { id: "leaf", ar: "ورقة نبات", icon: "🍃", note: "خلايا مملوءة ببلاستيدات خضراء، وثغور (عدسات صغيرة) تفتح وتغلق لتبادل الغازات.", draw: (z, lab) => (<g><rect x="0" y="0" width="640" height="400" fill="#f0fdf4" />{Array.from({ length: 5 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => (<g key={r + "-" + c}><rect x={28 + c * 118} y={28 + r * 72} width="110" height="64" rx="14" fill="#dcfce7" stroke="#4ade80" strokeWidth="2" />{Array.from({ length: 4 }).map((_, k) => <ellipse key={k} cx={52 + c * 118 + (k % 2) * 46} cy={48 + r * 72 + Math.floor(k / 2) * 28} rx="11" ry="6.5" fill="#22c55e" />)}<circle cx={84 + c * 118} cy={60 + r * 72} r={4.5 + z} fill="#65a30d" opacity="0.8" /></g>)))}<ellipse cx="330" cy="200" rx="20" ry="11" fill="#bbf7d0" stroke="#15803d" strokeWidth="3" />{lab && <text x="330" y="176" textAnchor="middle" fontSize="13" fontWeight="800" fill="#14532d">ثغر</text>}</g>) },
  { id: "cheek", ar: "خلايا باطن الخد", icon: "😊", note: "خلايا بشرية مسطّحة غير منتظمة من فمك أنت، لكل واحدة نواة مركزية واضحة · صبغة زرقاء وبنفسجية كما بالشرائح التحضيرية.", draw: (z, lab) => (<g><rect x="0" y="0" width="640" height="400" fill="#fdf2f8" />{[[140, 110], [330, 90], [500, 130], [230, 240], [440, 260], [120, 320], [560, 330], [80, 200], [380, 330]].map(([x, y], i) => (<g key={i}><ellipse cx={x} cy={y} rx={56 + (i % 3) * 8} ry={38 + (i % 2) * 7} fill="#fbcfe8" opacity="0.85" stroke="#be185d" strokeWidth="2.5" /><circle cx={x} cy={y} r={11 + z * 2.5} fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.6" /><circle cx={x} cy={y} r={3.5 + z} fill="#2e1065" /></g>))}{lab && <text x="140" y="52" textAnchor="middle" fontSize="13" fontWeight="800" fill="#6d28d9">نواة</text>}</g>) },
];
export const MicroscopeLab = React.memo(function MicroscopeLab({ act }) {
  const [slide, setSlide] = useState(SLIDES[0]);
  const [zoom, setZoom] = useState(100);
  const [focus, setFocus] = useState(65);
  const [labels, setLabels] = useState(true);
  const zf = (zoom - 40) / 360; // 0..1
  const blur = Math.min(6, Math.abs(focus - 65) / 7);
  const focused = blur < 0.6;
  const pick = (s) => { setSlide(s); act.award(5, `slide-${s.id}`); };
  const slideArt = useMemo(() => slide.draw(zf, labels), [slide, zf, labels]);
  return (
    <section data-testid="bio-microscope" className={cardCls}>
      <SecHead icon={<Microscope className="w-6 h-6" />} grad="from-sky-500 to-blue-600" title="المجهر الافتراضي" sub="شرائح حقيقية من المنهاج · حرّك التكبير وافتح الملصقات" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SLIDES.map((s) => <button key={s.id} onClick={() => pick(s)} className={chips(slide.id === s.id)}>{s.icon} {s.ar}</button>)}
      </div>
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 items-start">
        <div className="rounded-full overflow-hidden ring-8 ring-slate-800 ft-shadow-lg mx-auto w-full max-w-[430px] aspect-square bg-gradient-to-b from-sky-50 to-white relative">
          <svg viewBox="0 0 640 400" className="w-full h-full" style={{ transform: `scale(${1 + zf * 1.5})`, transition: "transform .3s", filter: `blur(${blur.toFixed(1)}px) saturate(${(1 - blur * 0.05).toFixed(2)})` }}>
            {slideArt}
          </svg>
          <span className="absolute inset-0 pointer-events-none rounded-full" style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0) 52%, rgba(15,23,42,0.18) 78%, rgba(2,6,23,0.55) 100%)", boxShadow: "inset 0 0 60px rgba(2,6,23,0.45)" }} />
          <span className={`absolute top-3 right-4 px-2.5 py-1 rounded-full text-white text-[10.5px] font-black ${focused ? "bg-emerald-600/90" : "bg-amber-500/90"}`}>{focused ? "التركيز حاد ✓" : "خارج التركيز · حرّك البؤرة"}</span>
          <span className="absolute bottom-3 right-4 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-[11px] font-black" dir="ltr">{zoom}x</span>
        </div>
        <div>
          <label className="block">
            <span className="flex justify-between text-[12px] font-black text-slate-600"><span>قوة التكبير</span><span dir="ltr">{zoom}x</span></span>
            <input type="range" min="40" max="400" step="20" value={zoom} onChange={(e) => setZoom(+e.target.value)} className="w-full accent-sky-600" />
          </label>
          <label className="block mt-3">
            <span className="flex justify-between text-[12px] font-black text-slate-600"><span>بؤرة التركيز (العدسة)</span><span className={focused ? "text-emerald-600" : "text-amber-600"}>{focused ? "صورة حادة" : "صورة ضبابية"}</span></span>
            <input type="range" min="0" max="100" value={focus} onChange={(e) => setFocus(+e.target.value)} className="w-full accent-violet-600" />
            <span className="text-[10.5px] text-slate-400 font-bold leading-snug block mt-0.5">كما بالمجهر الحقيقي: حافة الصورة أغمق وأقل حدّة من المركز (عمق الميدان) · التركيز المثالي قرب المنتصف</span>
          </label>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 ring-1 ring-slate-100 px-3.5 py-3 mt-2">
            <span className="text-[12px] font-black text-slate-600">ملصقات الأجزاء</span>
            <button onClick={() => setLabels((v) => !v)} className={`w-12 h-7 rounded-full relative transition ${labels ? "bg-sky-500" : "bg-slate-300"}`} aria-label="تبديل الملصقات">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white ft-shadow transition-all ${labels ? "right-6" : "right-1"}`} />
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={slide.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] text-slate-600 leading-relaxed mt-3 rounded-2xl bg-sky-50/70 ring-1 ring-sky-100 p-3.5">{slide.note}</motion.p>
          </AnimatePresence>
          <p className="text-[11.5px] text-slate-400 font-semibold mt-2 leading-relaxed">شرائح مصبوغة بأسلوب المختبر الحقيقي (وردي وبنفسجي) ومرسومة تعليمياً بمقاسات واقعية · أدِر البؤرة حتى تحصل على صورة حادة كما تفعل بعجلة المجهر.</p>
        </div>
      </div>
    </section>
  );
});

/* ================= 11 · taxonomy explorer ================= */
const KINGDOMS = [
  { ar: "البكتيريا", icon: "🦠", col: "#84cc16", ex: "الإشريكية القولونية · بكتيريا التربة", desc: "بدائيات نواة وحيدة الخلية بلا نواة حقيقية، تعيش في كل مكان حتى أمعائك." },
  { ar: "الطلائعيات", icon: "🫧", col: "#06b6d4", ex: "الأميبا · البراميسيوم · الطحالب", desc: "حقيقيات نواة غالباً وحيدة الخلية، تعيش بالماء وتتحرك بأهداب أو أقدام كاذبة." },
  { ar: "الفطريات", icon: "🍄", col: "#f59e0b", ex: "فطر الغاريقون · الخميرة · عفن الخبز", desc: "تمتص غذاءها من الوسط، جدرانها من الكيتين، وتنتج الخميرة منها خبزك." },
  { ar: "النباتات", icon: "🌳", col: "#16a34a", ex: "الزيتون · القمح · السرخس", desc: "تصنع غذاءها بالبناء الضوئي، خلاياها بجدار خلوي وبلاستيدات خضراء." },
  { ar: "الحيوانات", icon: "🦁", col: "#e11d48", ex: "الأسد · العقاب · الإنسان", desc: "متعددة الخلايا، تتغذى على غيرها، وأغلبها يتحرك ويستجيب بسرعة." },
];
const HUMAN_PATH = [
  ["النطاق", "حقيقيات النواة", "Eukarya"], ["المملكة", "الحيوانات", "Animalia"], ["الشعبة", "الحبليات", "Chordata"],
  ["الطائفة", "الثدييات", "Mammalia"], ["الرتبة", "الرئيسيات", "Primates"], ["العائلة", "الإنسانيّات", "Hominidae"],
  ["الجنس", "الإنسان", "Homo"], ["النوع", "الإنسان العاقل", "Homo sapiens"],
];
export const TaxonomyExplorer = React.memo(function TaxonomyExplorer({ act }) {
  const [sel, setSel] = useState(KINGDOMS[4]);
  return (
    <section data-testid="bio-taxonomy" className={cardCls}>
      <SecHead icon="🌳" grad="from-green-500 to-lime-600" title="مستكشف التصنيف" sub="الممالك الخمس · وأين يقف الإنسان في شجرة الحياة؟" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {KINGDOMS.map((k) => (
          <button key={k.ar} onClick={() => { setSel(k); act.award(5, `kingdom-${k.ar}`); }} className={chips(sel.ar === k.ar)}>
            <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" style={{ background: k.col }} /> {k.icon} {k.ar}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.ar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-4 ring-1" style={{ background: `linear-gradient(180deg, ${sel.col}14, #ffffff)`, borderColor: sel.col + "55" }}>
          <div className="font-head font-black text-slate-900">{sel.icon} مملكة {sel.ar}</div>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-1">{sel.desc}</p>
          <div className="text-[12px] font-black text-slate-500 mt-2">أمثلة: <span className="text-slate-700">{sel.ex}</span></div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4">
        <div className="text-[12px] font-black text-slate-500 mb-2">سلسلة تصنيف الإنسان الكاملة · من الأعمّ إلى الأدقّ</div>
        <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
          {HUMAN_PATH.map(([rank, ar, lat], i) => (
            <React.Fragment key={rank}>
              <span className="px-3 py-2 rounded-2xl bg-gradient-to-b from-white to-lime-50 ring-1 ring-lime-200 text-center">
                <span className="block text-[9.5px] font-black text-lime-700">{rank}</span>
                <span className="block text-[12.5px] font-black text-slate-800 leading-tight">{ar}</span>
                <span className="block text-[10px] font-bold text-slate-400 italic" dir="ltr">{lat}</span>
              </span>
              {i < HUMAN_PATH.length - 1 && <span className="text-lime-500 font-black">←</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ================= 2 · DNA lab ================= */
const BASE_COLORS = { A: "#22c55e", T: "#ec4899", C: "#06b6d4", G: "#f59e0b" };
const BASE_AR = { A: "أدينين", T: "ثايمين", C: "سايتوسين", G: "غوانين" };
function DoubleHelix({ seq }) {
  const s = (seq || "ATG").slice(0, 18).padEnd(3, "A");
  const yTop = (i) => 38 + Math.sin(i * 0.62) * 20;
  const yBot = (i) => 102 - Math.sin(i * 0.62) * 20;
  const pathOf = (fn) => Array.from({ length: s.length * 4 + 1 }).map((_, k) => { const t = k / 4; const i = Math.min(t, s.length - 1); return `${k === 0 ? "M" : "L"}${(36 + i * 34).toFixed(1)},${fn(i).toFixed(1)}`; }).join(" ");
  return (
    <div className="rounded-3xl bg-slate-950 ring-1 ring-slate-800 p-3 overflow-x-auto">
      <svg viewBox="0 0 660 140" className="w-full min-w-[520px] h-auto" role="img" aria-label="لولب مزدوج للحمض النووي">
        <defs>
          <linearGradient id="helixA" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#818cf8" /></linearGradient>
          <linearGradient id="helixB" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
        </defs>
        {s.split("").map((b, i) => {
          const comp = BASE_COMP[b];
          const bonds = b === "A" || b === "T" ? 2 : 3;
          const x = 36 + i * 34, ya = yTop(i), yb = yBot(i);
          return (
            <g key={i}>
              {Array.from({ length: bonds }).map((_, k) => {
                const off = (k - (bonds - 1) / 2) * 7;
                return <line key={k} x1={x + off} y1={ya + 9} x2={x + off} y2={yb - 9} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" opacity="0.85" />;
              })}
            </g>
          );
        })}
        <path d={pathOf(yTop)} stroke="url(#helixA)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d={pathOf(yBot)} stroke="url(#helixB)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {s.split("").map((b, i) => (
          <g key={"t" + i}>
            <circle cx={36 + i * 34} cy={yTop(i)} r="10.5" fill={BASE_COLORS[b]} stroke="#0f172a" strokeWidth="2" />
            <text x={36 + i * 34} y={yTop(i) + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">{b}</text>
            <circle cx={36 + i * 34} cy={yBot(i)} r="10.5" fill={BASE_COLORS[BASE_COMP[b]]} stroke="#0f172a" strokeWidth="2" />
            <text x={36 + i * 34} y={yBot(i) + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">{BASE_COMP[b]}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-1" dir="rtl">
        {["A", "T", "C", "G"].map((b) => <span key={b} className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-300"><span className="w-3 h-3 rounded-full ring-1 ring-white/40" style={{ background: BASE_COLORS[b] }} />{b} · {BASE_AR[b]}</span>)}
        <span className="text-[11px] font-black text-amber-300">حقيقة واقعية: ترتبط A مع T برابطتين هيدروجينيتين، وG مع C بثلاث روابط · لذا تنفصل مناطق A·T الغنية بسهولة أكبر عند النسخ</span>
      </div>
    </div>
  );
}
export const DnaLab = React.memo(function DnaLab({ dna, setDna, act }) {
  const coding = cleanDna(dna);
  const template = coding.split("").map((b) => BASE_COMP[b] || "N").join("");
  const mrna = coding.replace(/T/g, "U");
  const protein = useMemo(() => translateDna(coding), [coding]);
  const presets = [
    ["جين تعليمي كامل", "ATGGCTTATCGACAGTAA"],
    ["بداية جين الإنسولين", "ATGGCCCTGTGGATGCGCCTC"],
    ["قطعة بلا إيقاف", "ATGTTTGGGAAACCC"],
  ];
  const runTranslate = () => { if (protein.some((p) => !p.stop)) { act.award(15, "dna-run"); act.awardBadge("dna"); } };
  return (
    <section data-testid="bio-dna" className={cardCls}>
      <SecHead icon={<Dna className="w-6 h-6" />} grad="from-rose-500 to-pink-600" title="مختبر الحمض النووي" sub="من الشريط المشفّر إلى البروتين · بجدول الأكواد الوراثية القياسي الكامل" />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {presets.map(([ar, seq]) => <button key={ar} onClick={() => setDna(seq)} className={chips(dna === seq)}>{ar}</button>)}
      </div>
      <label className="block">
        <span className="text-[12px] font-black text-slate-500">الشريط المشفّر (اكتب أو عدّل · A T G C فقط · حتى 60 قاعدة)</span>
        <input value={dna} onChange={(e) => setDna(cleanDna(e.target.value))} dir="ltr"
          className="mt-1 w-full px-4 py-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-mono font-black text-[15px] tracking-[0.18em] text-slate-800 focus:outline-none focus:ring-rose-300" />
      </label>
      <div className="mt-3"><DoubleHelix seq={coding} /></div>
      <div className="mt-4 space-y-2 rounded-3xl bg-slate-900 p-4 overflow-x-auto">
        {[["الشريط المشفّر", "5'", coding, "text-lime-300"], ["الشريط القالب", "3'", template, "text-rose-300"], ["الحمض الرسول mRNA", "5'", mrna, "text-sky-300"]].map(([ar, end, seq, cls]) => (
          <div key={ar} className="flex items-baseline gap-3 min-w-[520px]">
            <span className="w-32 shrink-0 text-[11px] font-black text-slate-400">{ar}</span>
            <span className="text-[10px] font-black text-slate-500" dir="ltr">{end}</span>
            <span className={`font-mono font-black tracking-[0.18em] text-[14px] ${cls}`} dir="ltr">{seq || "·"}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button onClick={runTranslate} className={gradBtn}><Play className="w-4 h-4" /> ترجم إلى بروتين</button>
        <span className="text-[11.5px] font-bold text-slate-400">الترجمة تتوقف عند أول كودون إيقاف كما تفعل الريبوسومات</span>
      </div>
      <div className="mt-3">
        <div className="text-[12px] font-black text-slate-500 mb-2">سلسلة الأحماض الأمينية <span dir="ltr" className="text-slate-400">({protein.filter((p) => !p.stop).length} حمضاً)</span></div>
        <div className="flex flex-wrap gap-1.5" dir="ltr">
          {protein.length === 0 && <span className="text-[12px] font-bold text-slate-400">اكتب 3 قواعد على الأقل</span>}
          {protein.map((p, i) => (
            <motion.span key={i} initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.05 }}
              className={`inline-flex flex-col items-center px-2.5 py-1.5 rounded-2xl ring-1 ${p.stop ? "bg-rose-600 text-white ring-rose-400" : "bg-gradient-to-b from-lime-50 to-white ring-lime-200"}`}>
              <span className="font-mono text-[10px] font-black opacity-70">{p.codon}</span>
              <span className="font-black text-[15px] leading-none">{p.aa}</span>
              <span className="text-[9px] font-bold opacity-80">{p.stop ? "إيقاف" : p.en}</span>
            </motion.span>
          ))}
        </div>
        <p className="text-[12px] text-slate-500 leading-relaxed mt-2.5">
          {protein.map((p) => p.ar).join(" · ") || "·"}
        </p>
      </div>
    </section>
  );
});

/* ================= 3 · mutation simulator ================= */
export const MutationLab = React.memo(function MutationLab({ dna, act }) {
  const base = cleanDna(dna) || "ATGGCTTATCGACAGTAA";
  const [pos, setPos] = useState(4);
  const [kind, setKind] = useState("sub");
  const [newBase, setNewBase] = useState("A");
  const [applied, setApplied] = useState(false);
  const p0 = useMemo(() => translateDna(base), [base]);
  const mutated = useMemo(() => {
    if (!applied) return base;
    const arr = base.split("");
    if (kind === "sub") arr[pos] = newBase;
    else if (kind === "ins") arr.splice(pos, 0, newBase);
    else if (kind === "del") arr.splice(pos, 1);
    return arr.join("");
  }, [applied, base, pos, kind, newBase]);
  const p1 = useMemo(() => translateDna(mutated), [mutated]);
  const effect = useMemo(() => {
    if (!applied) return null;
    const s0 = p0.map((x) => x.aa).join(""), s1 = p1.map((x) => x.aa).join("");
    if (kind !== "sub" && (base.length - mutated.length) % 3 !== 0 && mutated.length !== base.length) return { ar: "إزاحة إطار القراءة", cls: "bg-rose-600", why: "إدخال أو حذف قاعدة واحدة يزيح كل الأكواد التالية، فتتغيّر السلسلة كلها غالباً وتنتهي بإيقاف مبكر." };
    if (s0 === s1) return { ar: "طفرة صامتة", cls: "bg-emerald-600", why: "تغيّرت القاعدة لكن الكودون الجديد يشفّر الحمض الأميني نفسه، فالبروتين لم يتغيّر إطلاقاً." };
    if (p1.length && p1[p1.length - 1].stop && (!p0.length || !p0[p0.length - 1].stop || p1.length < p0.length)) return { ar: "طفرة إيقاف (هراء)", cls: "bg-rose-600", why: "ظهر كودون إيقاف مبكراً، فسيُبنى بروتين مقطوع أقصر من اللازم وغالباً غير فعّال." };
    if (kind !== "sub" && mutated.length !== base.length) return { ar: "إزاحة إطار القراءة", cls: "bg-rose-600", why: "عدد القواعد المضافة أو المحذوفة ليس من مضاعفات الثلاثة، فانزاح إطار القراءة كله." };
    return { ar: "طفرة مغيّرة (استبدال حمض)", cls: "bg-amber-500", why: "تغيّر حمض أميني واحد في السلسلة. أثره يعتمد على مكانه: قد يكون معدوماً أو يغيّر شكل البروتين ووظيفته." };
  }, [applied, p0, p1, base, mutated, kind]);
  const apply = () => { setApplied(true); act.award(15, "mut-apply"); act.awardBadge("mut"); };
  return (
    <section data-testid="bio-mutation" className={cardCls}>
      <SecHead icon="🧫" grad="from-fuchsia-500 to-purple-600" title="محاكي الطفرات" sub="غيّر قاعدة واحدة وشاهد مصير البروتين كاملاً" />
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-[12px] font-black text-slate-500">نوع الطفرة</span>
          <div className="flex gap-1.5 mt-1">
            {[["sub", "استبدال"], ["ins", "إدخال"], ["del", "حذف"]].map(([k, ar]) => <button key={k} onClick={() => { setKind(k); setApplied(false); }} className={chips(kind === k) + " flex-1"}>{ar}</button>)}
          </div></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">الموقع (قاعدة رقم <span dir="ltr">{pos + 1}</span> من <span dir="ltr">{base.length}</span>)</span>
          <input type="range" min="0" max={base.length - 1} value={pos} onChange={(e) => { setPos(+e.target.value); setApplied(false); }} className="w-full accent-fuchsia-600 mt-3" /></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">القاعدة الجديدة</span>
          <div className="flex gap-1.5 mt-1" dir="ltr">
            {["A", "T", "G", "C"].map((b) => <button key={b} disabled={kind === "del"} onClick={() => { setNewBase(b); setApplied(false); }} className={chips(newBase === b) + " flex-1 font-mono disabled:opacity-40"}>{b}</button>)}
          </div></label>
      </div>
      <div className="rounded-3xl bg-slate-900 p-4 mt-4 overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="text-[10.5px] font-black text-slate-400 mb-1">السلسلة الأصلية من «مختبر الحمض النووي» بالأعلى</div>
          <div className="font-mono font-black tracking-[0.18em] text-[14px] text-lime-300" dir="ltr">{base.split("").map((c, i) => <span key={i} className={i === pos ? "bg-amber-400 text-slate-950 rounded px-0.5" : ""}>{c}</span>)}</div>
          {applied && <div className="font-mono font-black tracking-[0.18em] text-[14px] text-rose-300 mt-2" dir="ltr">{mutated}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={apply} className={gradBtn}><Zap className="w-4 h-4" /> طبّق الطفرة</button>
        {applied && <button onClick={() => setApplied(false)} className={chips(false)}><RotateCcw className="w-3.5 h-3.5" /> إعادة</button>}
      </div>
      <AnimatePresence>
        {effect && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl bg-gradient-to-b from-fuchsia-50 to-white ring-1 ring-fuchsia-100 p-4">
            <span className={`inline-block px-3 py-1.5 rounded-full text-white text-[12px] font-black ${effect.cls}`}>{effect.ar}</span>
            <div className="grid sm:grid-cols-2 gap-3 mt-3" dir="ltr">
              <div><div className="text-[10.5px] font-black text-slate-400" dir="rtl">البروتين الأصلي</div><div className="flex flex-wrap gap-1 mt-1">{p0.map((p, i) => <span key={i} className={`px-2 py-1 rounded-lg text-[11px] font-black ring-1 ${p.stop ? "bg-rose-100 text-rose-700 ring-rose-200" : "bg-lime-50 text-lime-800 ring-lime-200"}`}>{p.aa}</span>)}</div></div>
              <div><div className="text-[10.5px] font-black text-slate-400" dir="rtl">بعد الطفرة</div><div className="flex flex-wrap gap-1 mt-1">{p1.map((p, i) => <span key={i} className={`px-2 py-1 rounded-lg text-[11px] font-black ring-1 ${p.stop ? "bg-rose-600 text-white ring-rose-400" : "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200"}`}>{p.aa}</span>)}</div></div>
            </div>
            <p className="text-[12.5px] text-slate-600 leading-relaxed mt-3">{effect.why}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});

/* ================= 4 · Punnett lab ================= */
const TRAITS = [
  { id: "flower", ar: "لون زهرة البازلاء", A: "P", dom: "أرجوانية", rec: "بيضاء", mendel: true },
  { id: "shape", ar: "شكل بذرة البازلاء", A: "R", dom: "مستديرة ملساء", rec: "مجعّدة", mendel: true },
  { id: "seed", ar: "لون بذرة البازلاء", A: "Y", dom: "أصفر", rec: "أخضر", mendel: true },
  { id: "height", ar: "طول نبات البازلاء", A: "T", dom: "طويل", rec: "قصير", mendel: true },
  { id: "eye", ar: "لون العيون (مثال بشري)", A: "B", dom: "بني", rec: "أزرق", note: "نموذج تعليمي مبسّط بجين واحد · لون العيون الحقيقي تتحكم به جينات كثيرة" },
];
function gametesOf(gen) {
  const up = gen.split("").filter((c) => c === c.toUpperCase());
  const all = gen.split("");
  if (gen.length === 2) return [...new Set(all)];
  const first = [gen[0], gen[1]], second = [gen[2], gen[3]];
  const out = [];
  first.forEach((a) => second.forEach((b) => { const g = a + b; if (!out.includes(g)) out.push(g); }));
  return out;
}
function combineAlleles(g1, g2, traitCount) {
  let out = "";
  for (let t = 0; t < traitCount; t++) {
    const pair = [g1[t], g2[t]].sort((x, y) => (x === x.toUpperCase() ? 0 : 1) - (y === y.toUpperCase() ? 0 : 1));
    out += pair.join("");
  }
  return out;
}
export const PunnettLab = React.memo(function PunnettLab({ act }) {
  const [mode, setMode] = useState("mono");
  const [t1, setT1] = useState(TRAITS[0]);
  const [t2, setT2] = useState(TRAITS[2]);
  const [pA, setPA] = useState(1); // genotype index mono
  const [pB, setPB] = useState(1);
  const [dA, setDA] = useState("YyRr");
  const [dB, setDB] = useState("YyRr");
  const monoGens = (tr) => [`${tr.A}${tr.A}`, `${tr.A}${tr.A.toLowerCase()}`, `${tr.A.toLowerCase()}${tr.A.toLowerCase()}`];
  const genLabel = (g, tr) => (g === `${tr.A}${tr.A}` ? "نقي سائد" : g[0] === g[1] ? "نقي متنحٍّ" : "هجين");
  const traits = mode === "mono" ? [t1] : [t1, t2];
  const PAIR_IDX = [[0, 0], [1, 1], [0, 1], [1, 0], [2, 2], [1, 2], [2, 1], [0, 2], [2, 0]];
  const diOptsCalc = PAIR_IDX.map(([i, j]) => monoGens(t1)[i] + monoGens(t2)[j]);
  const parentA = mode === "mono" ? monoGens(t1)[pA] : (diOptsCalc.includes(dA) ? dA : diOptsCalc[1]);
  const parentB = mode === "mono" ? monoGens(t1)[pB] : (diOptsCalc.includes(dB) ? dB : diOptsCalc[1]);
  const gA = gametesOf(parentA), gB = gametesOf(parentB);
  const cells = gB.map((gb) => gA.map((ga) => combineAlleles(ga, gb, traits.length)));
  const phenoOf = (gen) => traits.map((tr, i) => (gen.slice(i * 2, i * 2 + 2).includes(tr.A) ? tr.dom : tr.rec)).join(" · ");
  const genoCount = {}, phenoCount = {};
  cells.flat().forEach((g) => { genoCount[g] = (genoCount[g] || 0) + 1; const p = phenoOf(g); phenoCount[p] = (phenoCount[p] || 0) + 1; });
  const total = cells.flat().length;
  const diOptions = diOptsCalc;
  const done = () => { act.award(15, "punnett-run"); act.awardBadge("mendel"); };
  return (
    <section data-testid="bio-punnett" className={cardCls}>
      <SecHead icon="🌸" grad="from-rose-400 to-pink-500" title="مختبر الوراثة ومربع بانيت" sub="صفات البازلاء الحقيقية التي جرّبها مندل بنفسه · نموذج جين واحد مبسّط للتعليم" />
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[11px] font-black px-2.5 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800">🌱 صفات بازلاء مندل الحقيقية: زهرة أرجوانية وبيضاء · بذرة مستديرة ومجعّدة · بذرة صفراء وخضراء · ساق طويل وقصير</span>
        <span className="text-[11px] font-black px-2.5 py-1.5 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-800">نموذج تعليمي مبسّط: صفة واحدة يتحكم بها جين واحد بأليلين</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setMode("mono")} className={chips(mode === "mono")}>صفة واحدة (أحادي)</button>
        <button onClick={() => setMode("di")} className={chips(mode === "di")}>صفتان (ثنائي)</button>
        <select value={t1.id} onChange={(e) => setT1(TRAITS.find((t) => t.id === e.target.value))} className="px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[12.5px] min-h-[44px]">
          {TRAITS.map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
        </select>
        {mode === "di" && (
          <select value={t2.id} onChange={(e) => setT2(TRAITS.find((t) => t.id === e.target.value))} className="px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[12.5px] min-h-[44px]">
            {TRAITS.filter((t) => t.id !== t1.id).map((t) => <option key={t.id} value={t.id}>{t.ar}</option>)}
          </select>
        )}
      </div>
      {mode === "mono" ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[["الأب الأول", pA, setPA], ["الأب الثاني", pB, setPB]].map(([ar, v, set]) => (
            <label key={ar} className="block"><span className="text-[12px] font-black text-slate-500">{ar} · {t1.ar}</span>
              <select value={v} onChange={(e) => set(+e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] min-h-[44px]">
                {monoGens(t1).map((g, i) => <option key={g} value={i}>{g} · {genLabel(g, t1)} ({g.includes(t1.A) ? t1.dom : t1.rec})</option>)}
              </select></label>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {[["الأب الأول", dA, setDA], ["الأب الثاني", dB, setDB]].map(([ar, v, set]) => (
            <label key={ar} className="block"><span className="text-[12px] font-black text-slate-500">{ar}</span>
              <select value={v} onChange={(e) => set(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] min-h-[44px]" dir="ltr">
                {diOptions.map((g) => <option key={g} value={g}>{g}</option>)}
              </select></label>
          ))}
        </div>
      )}
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4 mt-4 items-start">
        <div className="overflow-x-auto rounded-3xl ring-1 ring-rose-100">
          <table className="w-full text-center" dir="ltr">
            <thead><tr><th className="bg-rose-600 text-white p-2.5 text-[11px] font-black">{parentA} × {parentB}</th>{gA.map((g) => <th key={g} className="bg-rose-100 text-rose-900 p-2.5 font-mono font-black text-[13px]">{g}</th>)}</tr></thead>
            <tbody>
              {cells.map((row, i) => (
                <tr key={i}><th className="bg-rose-100 text-rose-900 p-2.5 font-mono font-black text-[13px]">{gB[i]}</th>
                  {row.map((g, j) => <td key={j} className="p-2.5 ring-1 ring-rose-50 bg-white"><span className="font-mono font-black text-[13px] text-slate-800">{g}</span><span className="block text-[9.5px] font-bold text-slate-400 mt-0.5" dir="rtl">{phenoOf(g)}</span></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="text-[12px] font-black text-slate-500 mb-2">نسب الأنماط الظاهرية بين الأبناء</div>
          <div className="space-y-2">
            {Object.entries(phenoCount).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
              <div key={p} className="flex items-center gap-2.5">
                <span className="text-[12px] font-bold text-slate-600 w-32 shrink-0">{p}</span>
                <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><motion.span initial={{ width: 0 }} animate={{ width: `${(n / total) * 100}%` }} className="block h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500" /></span>
                <span className="text-[11.5px] font-black text-slate-500 w-14" dir="ltr">{Math.round((n / total) * 100)}% · {n}/{total}</span>
              </div>
            ))}
          </div>
          <div className="text-[12px] font-black text-slate-500 mt-4 mb-1.5">الأنماط الوراثية</div>
          <div className="flex flex-wrap gap-1.5" dir="ltr">
            {Object.entries(genoCount).sort().map(([g, n]) => <span key={g} className="px-2.5 py-1.5 rounded-xl bg-rose-50 ring-1 ring-rose-100 font-mono text-[11.5px] font-black text-rose-900">{g} ×{n}</span>)}
          </div>
          <button onClick={done} className={gradBtn + " mt-4"}><Check className="w-4 h-4" /> سجّل هذا التهجين</button>
          {traits.some((t) => t.note) && <p className="text-[11px] text-amber-600 font-bold mt-2">تنبيه: {traits.find((t) => t.note)?.note}</p>}
        </div>
      </div>
    </section>
  );
});

/* ================= 14 · trait challenge game ================= */
const TRAIT_ROUNDS = [
  { title: "زهور البازلاء", story: "نبات زهرته أرجوانية هجين (Pp) زُوّج بنبات هجين آخر (Pp). ما احتمال أن يخرج الابن بزهرة بيضاء؟", opts: ["0%", "25%", "50%", "75%"], answer: 1, grid: "Pp × Pp", why: "ربع الأبناء (pp) فقط يحملون نسختين من الأليل المتنحي فتظهر الزهرة البيضاء." },
  { title: "طول النبات", story: "نبات طويل هجين (Tt) زُوّج بنبات قصير (tt). ما احتمال ابن قصير؟", opts: ["25%", "50%", "75%", "100%"], answer: 1, grid: "Tt × tt", why: "نصف أبناء الهجين يرثون (t) منه، ومن القصير يرثون (t) دائماً، فيكون نصفهم tt قصيراً." },
  { title: "لون العيون", story: "أبوان بنيّا العيون وكلاهما هجين (Bb × Bb) بنموذجنا المبسّط. ما احتمال طفل أزرق العينين؟", opts: ["0%", "25%", "50%", "100%"], answer: 1, grid: "Bb × Bb", why: "الزرقة متنحية، فتحتاج نسختين (bb)، واحتمالها ربع الحالات في تهجين هجينين." },
  { title: "بذور صفراء", story: "نبات بذوره صفراء نقية (YY) زُوّج بأخضر البذور (yy). كيف يكون لون بذور الأبناء؟", opts: ["كلها خضراء", "كلها صفراء", "نصف ونصف", "ثلاثة أرباع خضراء"], answer: 1, grid: "YY × yy", why: "كل ابن يأخذ Y من الأول وy من الثاني فيصير Yy، والصفراء سائدة فتظهر عند الجميع." },
  { title: "أب أزرق وأم هجينة", story: "أب أزرق العينين (bb) وأم بنية هجينة (Bb). ما احتمال طفل أزرق؟", opts: ["0%", "25%", "50%", "75%"], answer: 2, grid: "bb × Bb", why: "الأب يعطي b دائماً، والأم تعطي b في نصف الحالات، فيكون نصف الأبناء bb." },
];
export const TraitGame = React.memo(function TraitGame({ act }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const r = TRAIT_ROUNDS[round];
  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === r.answer) { setScore((s) => s + 1); act.award(20, `trait-${round}`); }
  };
  const next = () => {
    if (round === TRAIT_ROUNDS.length - 1) { setFinished(true); if (score >= 4) act.awardBadge("mendel"); }
    else { setRound((x) => x + 1); setPicked(null); }
  };
  const reset = () => { setRound(0); setPicked(null); setScore(0); setFinished(false); };
  return (
    <section data-testid="bio-trait-game" className={cardCls}>
      <SecHead icon="🎯" grad="from-violet-500 to-indigo-600" title="تحدي الصفات الوراثية" sub="خمسة سيناريوهات · توقّع احتمال صفة الطفل قبل كشف الحل" />
      {!finished ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-800">الجولة {round + 1} / {TRAIT_ROUNDS.length}</span>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">نقطتك: {score}</span>
            <span className="mr-auto font-mono font-black text-[13px] text-slate-500" dir="ltr">{r.grid}</span>
          </div>
          <h3 className="font-head font-black text-slate-900 text-lg">{r.title}</h3>
          <p className="text-[13.5px] text-slate-600 leading-relaxed mt-1">{r.story}</p>
          <div className="grid grid-cols-2 gap-2 mt-4" dir="ltr">
            {r.opts.map((o, i) => {
              const state = picked === null ? "" : i === r.answer ? "bg-emerald-500 text-white ring-emerald-300" : i === picked ? "bg-rose-500 text-white ring-rose-300" : "bg-slate-50 ring-slate-200 opacity-50";
              return (
                <button key={o} onClick={() => choose(i)} className={`pressable rounded-2xl px-4 py-3.5 ring-1 font-black text-[15px] transition min-h-[52px] ${state || "bg-white ring-slate-200 hover:ring-violet-300 text-slate-700"}`}>
                  {picked !== null && i === r.answer ? "✓ " : picked === i ? "✗ " : ""}{o}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {picked !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-2xl px-4 py-3 ring-1 flex flex-wrap items-center gap-3 ${picked === r.answer ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
                <span className="text-[12.5px] font-bold text-slate-700 leading-relaxed flex-1">{picked === r.answer ? "🎉 توقّع صائب! " : "ليست الإجابة · "}{r.why}</span>
                <button onClick={next} className="pressable px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-head font-black active:scale-95 min-h-[44px]">{round === TRAIT_ROUNDS.length - 1 ? "النتيجة" : "التالي"}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center rounded-3xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-6">
          <div className="text-5xl">{score >= 4 ? "🏆" : score >= 3 ? "🌟" : "🌱"}</div>
          <div className="font-head font-black text-2xl text-slate-900 mt-2">نتيجتك {score} من {TRAIT_ROUNDS.length}</div>
          <p className="text-[13px] text-slate-500 font-semibold mt-1">{score >= 4 ? "عقل وراثي ممتاز · ورثت دقّة مندل" : "أعد اللعب وركّز: المتنحي لا يظهر إلا بنسختين"}</p>
          <button onClick={reset} className={gradBtn + " mt-4"}><RotateCcw className="w-4 h-4" /> العب من جديد</button>
        </motion.div>
      )}
    </section>
  );
});

/* ================= 6 · body systems explorer ================= */
const SYSTEMS = [
  { id: "cardio", ar: "القلبي الوعائي", icon: "❤️", col: "#e11d48", organs: "القلب · الشرايين · الأوردة · الشعيرات", fn: "ينقل الدم المحمّل بالأكسجين والغذاء إلى كل خلية ويجمع الفضلات وثاني أكسيد الكربون.", wow: "لو وُصلت أوعيتك الدموية ببعضها لامتدت نحو 100 ألف كيلومتر، أي مرتين ونصف حول الأرض.", tip: "30 دقيقة مشي يومياً تخفض خطر أمراض القلب بوضوح وتقوّي عضلة القلب نفسها." },
  { id: "resp", ar: "الجهاز التنفسي", icon: "🫁", col: "#0284c7", organs: "الأنف · القصبة الهوائية · الرئتان · الحجاب الحاجز", fn: "يدخل الأكسجين إلى الدم عبر 300 مليون حويصلة هوائية ويطرد ثاني أكسيد الكربون.", wow: "مساحة سطح الحويصلات الهوائية في رئتيك تعادل ملعب تنس كاملاً مطويّاً داخل صدرك.", tip: "ابتعد عن دخان السجائر والشيشة: أهداب قصبتك الهوائية تتشلّ بالدخان وتتوقف عن تنظيف رئتيك." },
  { id: "digest", ar: "الجهاز الهضمي", icon: "🍽️", col: "#d97706", organs: "الفم · المعدة · الأمعاء · الكبد · البنكرياس", fn: "يفكك الطعام ميكانيكياً وكيميائياً ويمتص الغذاء في الأمعاء الدقيقة على مدى 9 أمتار.", wow: "أمعاؤك الدقيقة وحدها لو فُردت زغاباتها لغطت مساحة ملعب كرة سلة تقريباً.", tip: "امضغ ببطء: الهضم يبدأ بالفم، والمضغ الجيد يخفف نصف عمل معدتك ويقلل الانتفاخ." },
  { id: "nerv", ar: "الجهاز العصبي", icon: "🧠", col: "#7c3aed", organs: "الدماغ · الحبل الشوكي · الأعصاب", fn: "مركز القيادة: يستقبل الحواس ويصدر الأوامر بسرعة تصل إلى 430 كم/ساعة عبر 86 مليار خلية عصبية.", wow: "دماغك يولّد كهرباء تكفي لإضاءة مصباح صغير، وفيه وصلات أكثر من نجوم مجرتنا.", tip: "النوم 8-9 ساعات للمراهقين ليس رفاهية: دماغك يرتب الذاكرة وينظف فضلاته أثناء النوم." },
  { id: "skel", ar: "الجهاز الهيكلي", icon: "🦴", col: "#64748b", organs: "206 عظمة · المفاصل · الغضاريف", fn: "يدعم الجسم ويحمي الأعضاء (الجمجمة للدماغ، والأضلاع للقلب) ويصنع خلايا الدم في نخاعه.", wow: "وُلدت بنحو 300 عظمة، واندمج كثير منها لتصير 206 عند البلوغ، وأصغرها عظمة الركاب في أذنك.", tip: "الكالسيوم وفيتامين د وحركة الشمس الصباحية ثلاثي بناء عظام قوية قبل عمر العشرين." },
  { id: "musc", ar: "الجهاز العضلي", icon: "💪", col: "#dc2626", organs: "أكثر من 600 عضلة هيكلية · عضلة القلب · عضلات ملساء", fn: "ينتج الحركة والحرارة: الهيكلية بإرادتك، والقلب والملساء تعملان دون أن تفكر بهما.", wow: "أقوى عضلاتك بالنسبة لحجمها عضلات الفك، وعضلة قلبك لا تتعب أبداً طوال عمرك.", tip: "البروتين بعد الرياضة والراحة بين التمارين هو سرّ بناء العضلات، لا التمرين وحده." },
  { id: "immune", ar: "الجهاز المناعي", icon: "🛡️", col: "#059669", organs: "خلايا الدم البيضاء · العقد اللمفية · الطحال · نخاع العظم", fn: "جيش الدفاع: يميّز خلاياك من الغزاة، يهاجم البكتيريا والفيروسات ويحفظ ذاكرة عنها لسنوات.", wow: "جسمك يصنع ملايين الأجسام المضادة المختلفة، وذاكرة مناعتك قد تحميك من مرض بعد عقود.", tip: "اللقاحات تدريب آمن لجيشك المناعي، وغسل اليدين 20 ثانية يمنع أكثر العدوى اليومية." },
  { id: "excr", ar: "الجهاز الإخراجي", icon: "💧", col: "#0891b2", organs: "الكليتان · الحالبان · المثانة", fn: "يرشّح دمك كله كل يوم عبر مليوني نفرون بالكليتين، ويوازن الماء والأملاح ويطرد اليوريا.", wow: "كليتاك ترشّحان نحو 180 لتراً يومياً ثم تعيدان امتصاص 99% منها، فلا يخرج إلا لتر ونصف.", tip: "اشرب ماءً كافياً حتى يكون لون البول أصفر فاتحاً، فالجفاف أسرع طريق لحصى الكلى." },
];
const ORG_OVERLAY = {
  cardio: (<g>
    <path d="M150 208 C132 188 112 196 114 214 C116 232 136 244 150 254 C164 244 184 232 186 214 C188 196 168 188 150 208 Z" fill="#e11d48" stroke="#881337" strokeWidth="2.5" />
    <path d="M150 196 C150 168 158 150 176 142 M150 254 L150 420" stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
    <path d="M150 300 L104 340 M150 300 L196 340 M150 420 L128 500 M150 420 L172 500" stroke="#3b82f6" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.6" />
    <text x="196" y="222" fontSize="11" fontWeight="900" fill="#881337">القلب وسط الصدر</text>
  </g>),
  resp: (<g>
    <path d="M150 108 L150 168" stroke="#0284c7" strokeWidth="7" strokeLinecap="round" />
    <path d="M150 168 L124 196 M150 168 L176 196" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="116" cy="232" rx="27" ry="50" fill="#7dd3fc" stroke="#0369a1" strokeWidth="2.5" opacity="0.9" />
    <ellipse cx="184" cy="232" rx="27" ry="50" fill="#7dd3fc" stroke="#0369a1" strokeWidth="2.5" opacity="0.9" />
    <path d="M104 282 Q150 268 196 282" stroke="#0369a1" strokeWidth="4" fill="none" strokeLinecap="round" />
    <text x="206" y="215" fontSize="11" fontWeight="900" fill="#0369a1">الرئتان حول القلب</text>
    <text x="196" y="290" fontSize="10.5" fontWeight="900" fill="#0369a1">الحجاب الحاجز</text>
  </g>),
  digest: (<g>
    <path d="M150 110 L150 210" stroke="#d97706" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
    <path d="M132 232 C118 252 132 276 156 272 C178 268 184 244 168 232 C152 222 140 220 132 232 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="2.5" />
    <path d="M176 218 C196 210 210 224 202 240 C196 252 178 254 168 244 C160 234 164 222 176 218 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" opacity="0.9" />
    <path d="M116 300 q17 -12 34 0 q17 12 34 0 M116 322 q17 -12 34 0 q17 12 34 0 M116 344 q17 -12 34 0 q17 12 34 0 M122 366 q14 -10 28 0 q14 10 28 0" stroke="#ea580c" strokeWidth="5" fill="none" strokeLinecap="round" />
    <text x="198" y="252" fontSize="11" fontWeight="900" fill="#92400e">المعدة يساراً · الكبد يميناً</text>
    <text x="192" y="330" fontSize="10.5" fontWeight="900" fill="#9a3412">الأمعاء بالبطن</text>
  </g>),
  nerv: (<g>
    <circle cx="150" cy="58" r="29" fill="#a78bfa" stroke="#5b21b6" strokeWidth="2.5" />
    <path d="M132 48 q10 -10 20 -2 M136 68 q12 8 26 0 M156 40 q10 8 4 18" stroke="#5b21b6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M150 92 L150 430" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" />
    <path d="M150 180 L100 250 M150 180 L200 250 M150 300 L108 380 M150 300 L192 380 M150 430 L132 520 M150 430 L168 520" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
    <text x="190" y="52" fontSize="11" fontWeight="900" fill="#5b21b6">الدماغ بالجمجمة</text>
    <text x="164" y="270" fontSize="10.5" fontWeight="900" fill="#5b21b6">الحبل الشوكي والأعصاب</text>
  </g>),
  skel: (<g stroke="#64748b" strokeWidth="4" strokeLinecap="round" fill="none">
    <circle cx="150" cy="58" r="28" fill="#f1f5f9" strokeWidth="3" />
    <path d="M110 176 q40 -14 80 0 M108 204 q42 -14 84 0 M110 232 q40 -14 80 0" strokeWidth="3.5" />
    <path d="M150 96 L150 330" strokeWidth="6" />
    <path d="M118 330 L182 330" strokeWidth="7" />
    <path d="M126 150 L96 260 M174 150 L204 260 M96 260 L88 350 M204 260 L212 350" />
    <path d="M132 336 L124 470 L122 548 M168 336 L176 470 L178 548" />
  </g>),
  musc: (<g fill="#dc2626" opacity="0.75">
    <rect x="112" y="168" width="76" height="58" rx="16" />
    <rect x="66" y="168" width="26" height="96" rx="13" transform="rotate(10 79 216)" />
    <rect x="208" y="168" width="26" height="96" rx="13" transform="rotate(-10 221 216)" />
    <rect x="112" y="352" width="30" height="120" rx="15" />
    <rect x="158" y="352" width="30" height="120" rx="15" />
    <rect x="116" y="478" width="22" height="70" rx="11" />
    <rect x="162" y="478" width="22" height="70" rx="11" />
    <text x="196" y="200" fontSize="11" fontWeight="900" fill="#991b1b">عضلات الصدر والأطراف</text>
  </g>),
  immune: (<g>
    <circle cx="150" cy="186" r="12" fill="#059669" stroke="#064e3b" strokeWidth="2" />
    <ellipse cx="104" cy="262" rx="16" ry="11" fill="#10b981" stroke="#064e3b" strokeWidth="2" transform="rotate(-24 104 262)" />
    {[[126, 118], [174, 118], [92, 210], [208, 210], [126, 356], [174, 356], [150, 320]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6.5" fill="#34d399" stroke="#065f46" strokeWidth="1.6" />)}
    <text x="182" y="190" fontSize="11" fontWeight="900" fill="#065f46">الغدة الزعترية والعقد اللمفية</text>
    <text x="30" y="252" fontSize="10.5" fontWeight="900" fill="#065f46">الطحال</text>
  </g>),
  excr: (<g>
    <path d="M104 268 C88 282 88 312 104 326 C118 338 134 328 132 306 C136 284 120 256 104 268 Z" fill="#06b6d4" stroke="#155e75" strokeWidth="2.5" />
    <path d="M196 268 C212 282 212 312 196 326 C182 338 166 328 168 306 C164 284 180 256 196 268 Z" fill="#06b6d4" stroke="#155e75" strokeWidth="2.5" />
    <path d="M124 322 L146 356 M176 322 L154 356" stroke="#0891b2" strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="150" cy="368" rx="17" ry="13" fill="#22d3ee" stroke="#155e75" strokeWidth="2.5" />
    <text x="206" y="290" fontSize="11" fontWeight="900" fill="#155e75">الكليتان عند الخصر</text>
    <text x="172" y="372" fontSize="10.5" fontWeight="900" fill="#155e75">المثانة</text>
  </g>),
};
export const BodyExplorer = React.memo(function BodyExplorer({ act }) {
  const [sel, setSel] = useState(SYSTEMS[0]);
  return (
    <section data-testid="bio-body" className={cardCls}>
      <SecHead icon="🫀" grad="from-rose-500 to-red-600" title="مستكشف أجهزة الجسم" sub="ثمانية أجهزة تعمل كفريق واحد · اختر جهازاً لترى أعضاءه بمواضعها الواقعية بجسم الإنسان" />
      <div className="grid lg:grid-cols-[290px_1fr] gap-5 items-start">
        <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200 p-3 mx-auto w-full max-w-[320px]">
          <svg viewBox="0 0 300 600" className="w-full h-auto" role="img" aria-label="مخطط جسم الإنسان ومواضع الأعضاء">
            <g fill="#e8edf3" stroke="#94a3b8" strokeWidth="2.5">
              <circle cx="150" cy="58" r="36" />
              <rect x="136" y="88" width="28" height="22" rx="8" />
              <path d="M104 118 C96 190 100 260 108 322 L118 344 L182 344 L192 322 C200 260 204 190 196 118 C176 104 124 104 104 118 Z" />
              <path d="M104 126 C82 170 70 240 74 300 L92 306 C96 250 104 200 116 160 Z" />
              <path d="M196 126 C218 170 230 240 226 300 L208 306 C204 250 196 200 184 160 Z" />
              <path d="M112 344 L106 470 L108 556 L140 556 L146 440 L154 440 L160 556 L192 556 L194 470 L188 344 Z" />
            </g>
            <AnimatePresence mode="wait">
              <motion.g key={sel.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{ORG_OVERLAY[sel.id]}</motion.g>
            </AnimatePresence>
          </svg>
          <p className="text-[10.5px] text-slate-400 font-bold text-center leading-relaxed">مواضع تشريحية واقعية تقريباً: القلب وسط الصدر، والكبد تحت الأضلاع اليمنى، والكليتان عند الخصر من الخلف.</p>
        </div>
        <div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5 mb-4">
        {SYSTEMS.map((s) => (
          <button key={s.id} onClick={() => { setSel(s); act.award(5, `system-${s.id}`); }} className={`pressable rounded-2xl px-3 py-3 text-right ring-1 transition min-h-[52px] ${sel.id === s.id ? "text-white ft-shadow scale-[1.02]" : "bg-white ring-slate-200 text-slate-600 hover:ring-rose-200"}`} style={sel.id === s.id ? { background: `linear-gradient(160deg, ${s.col}, ${s.col}bb)` } : {}}>
            <span className="text-xl block">{s.icon}</span>
            <span className="text-[12px] font-black leading-tight block mt-0.5">{s.ar}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl ring-1 p-5" style={{ background: `linear-gradient(180deg, ${sel.col}12, #fff)`, borderColor: sel.col + "44" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xl">{sel.icon}</span>
            <span className="font-head font-black text-slate-900 text-lg">{sel.ar}</span>
            <span className="text-[11.5px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: sel.col }}>{sel.organs}</span>
          </div>
          <p className="text-[13.5px] text-slate-700 leading-relaxed mt-3"><b className="text-slate-900">الوظيفة:</b> {sel.fn}</p>
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-100 px-3.5 py-2.5"><div className="text-[11px] font-black text-amber-700 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> رقم يبهرك</div><p className="text-[12.5px] text-slate-600 leading-relaxed mt-0.5">{sel.wow}</p></div>
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 px-3.5 py-2.5"><div className="text-[11px] font-black text-emerald-700 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> احمِ جهازك</div><p className="text-[12.5px] text-slate-600 leading-relaxed mt-0.5">{sel.tip}</p></div>
          </div>
        </motion.div>
      </AnimatePresence>
        </div>
      </div>
    </section>
  );
});

/* ================= 7 · heart & circulation sim ================= */
function EcgTrace({ bpm }) {
  const ref = useRef(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let W = 660, H = 120;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(50, Math.round((cv.clientWidth || 660) * dpr));
      H = Math.max(30, Math.round((cv.clientHeight || 96) * dpr));
      cv.width = W; cv.height = H;
    };
    size();
    let raf = 0, running = false, inView = false;
    const t0 = performance.now();
    const g = (p, c, a, w) => a * Math.exp(-((p - c) * (p - c)) / (2 * w * w));
    const wave = (p) => g(p, 0.14, 0.13, 0.024) + g(p, 0.235, -0.1, 0.008) + g(p, 0.26, 1, 0.007) + g(p, 0.286, -0.24, 0.009) + g(p, 0.47, 0.27, 0.032);
    const draw = (now) => {
      const sc = W / 660;
      const t = (now - t0) / 1000;
      const beat = 60 / Math.max(20, bpmRef.current), span = 3.4;
      ctx.fillStyle = "#0b0714";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(244,63,94,0.14)";
      ctx.lineWidth = 1;
      const gs = Math.max(10, W / 30);
      for (let gx = 0; gx <= W; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy <= H; gy += gs) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const tt = t - ((W - x) / W) * span;
        const ph = (((tt / beat) % 1) + 1) % 1;
        const y = H * 0.66 - wave(ph) * H * 0.52;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2.4 * sc;
      ctx.shadowColor = "rgba(244,63,94,0.8)";
      ctx.shadowBlur = 8 * sc;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const phNow = (((t / beat) % 1) + 1) % 1;
      ctx.beginPath();
      ctx.arc(W - 4, H * 0.66 - wave(phNow) * H * 0.52, 4 * sc, 0, Math.PI * 2);
      ctx.fillStyle = "#fff1f2";
      ctx.fill();
    };
    const loop = (now) => { if (!running) return; draw(now); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const sync = () => { if (document.hidden || !inView) stop(); else start(); };
    let io = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => { inView = !!es[0].isIntersecting; sync(); }, { threshold: 0.02 });
      io.observe(cv);
    } else { inView = true; }
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", size);
    sync();
    return () => { stop(); if (io) io.disconnect(); document.removeEventListener("visibilitychange", sync); window.removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="w-full h-24 block" aria-label="تخطيط قلب كهربائي حي متزامن مع النبض" />;
}
const CircStatic = React.memo(function CircStatic() {
  return (
    <>
      <defs>
        <linearGradient id="chBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
        <linearGradient id="chBlueD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1e3a8a" /></linearGradient>
        <linearGradient id="chRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fda4af" /><stop offset="100%" stopColor="#e11d48" /></linearGradient>
        <linearGradient id="chRedD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#881337" /></linearGradient>
        <linearGradient id="lungG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fecdd3" /><stop offset="100%" stopColor="#fda4af" /></linearGradient>
      </defs>
      <path d="M236 16 L236 118" stroke="#2563eb" strokeWidth="15" strokeLinecap="round" opacity="0.85" />
      <path d="M238 262 C200 190 150 140 112 108" stroke="#2563eb" strokeWidth="13" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M430 108 C470 132 492 138 520 108" stroke="#dc2626" strokeWidth="11" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M120 108 C170 132 196 138 224 116" stroke="#dc2626" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.75" />
      <path d="M428 238 C428 150 470 96 540 84 L588 84 L588 400" stroke="#dc2626" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.9" />
      <g>
        <path d="M112 26 C70 50 58 96 74 138 C84 164 118 168 132 144 C146 118 142 44 112 26 Z" fill="url(#lungG)" stroke="#be123c" strokeWidth="2.5" opacity="0.95" />
        <path d="M528 26 C570 50 582 96 566 138 C556 164 522 168 508 144 C494 118 498 44 528 26 Z" fill="url(#lungG)" stroke="#be123c" strokeWidth="2.5" opacity="0.95" />
        <text x="104" y="92" textAnchor="middle" fontSize="13" fontWeight="900" fill="#881337">رئة</text>
        <text x="536" y="92" textAnchor="middle" fontSize="13" fontWeight="900" fill="#881337">رئة</text>
      </g>
      <g stroke="#0f172a" strokeWidth="2">
        <rect x="182" y="118" width="112" height="76" rx="24" fill="url(#chBlue)" />
        <rect x="182" y="202" width="112" height="92" rx="26" fill="url(#chBlueD)" />
        <rect x="346" y="118" width="112" height="76" rx="24" fill="url(#chRed)" />
        <rect x="346" y="202" width="112" height="92" rx="26" fill="url(#chRedD)" />
      </g>
      <g fontSize="12.5" fontWeight="900" fill="#ffffff" textAnchor="middle">
        <text x="238" y="152">الأذين الأيمن</text>
        <text x="238" y="168" fontSize="10" opacity="0.85">دم فقير بالأكسجين</text>
        <text x="238" y="244">البطين الأيمن</text>
        <text x="238" y="260" fontSize="10" opacity="0.85">يضخ إلى الرئتين</text>
        <text x="402" y="152">الأذين الأيسر</text>
        <text x="402" y="168" fontSize="10" opacity="0.85">دم غني بالأكسجين</text>
        <text x="402" y="244">البطين الأيسر</text>
        <text x="402" y="260" fontSize="10" opacity="0.85">الأقوى · يضخ للجسم</text>
      </g>
      <g fontSize="11" fontWeight="900" fill="#334155">
        <text x="252" y="30">الوريد الأجوف (من الجسم)</text>
        <text x="150" y="196">الشريان الرئوي</text>
        <text x="492" y="196">الأوردة الرئوية</text>
        <text x="600" y="240" textAnchor="middle" transform="rotate(90 600 240)">الأبهر إلى الجسم</text>
      </g>
    </>
  );
});
function CirculationDiagram({ bpm, reduced }) {
  const dur = (60 / bpm) * 2;
  return (
    <svg viewBox="0 0 640 430" className="w-full h-auto" role="img" aria-label="مخطط حجرات القلب الأربع ومسار الدم">
      <CircStatic />
      {!reduced && (
      <g key={bpm}>
        <circle r="7" fill="#3b82f6" stroke="#fff" strokeWidth="2">
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path="M236 10 L236 140 L238 240 C215 185 155 140 116 110" />
        </circle>
        <circle r="7" fill="#3b82f6" stroke="#fff" strokeWidth="2">
          <animateMotion dur={`${dur}s`} begin={`${dur / 2}s`} repeatCount="indefinite" path="M236 10 L236 140 L238 240 C215 185 155 140 116 110" />
        </circle>
        <circle r="7" fill="#ef4444" stroke="#fff" strokeWidth="2">
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path="M524 104 C480 132 440 140 404 150 L402 245 C420 160 480 92 545 84 L586 84 L586 396" />
        </circle>
        <circle r="7" fill="#ef4444" stroke="#fff" strokeWidth="2">
          <animateMotion dur={`${dur}s`} begin={`${dur / 2}s`} repeatCount="indefinite" path="M524 104 C480 132 440 140 404 150 L402 245 C420 160 480 92 545 84 L586 84 L586 396" />
        </circle>
      </g>
      )}
    </svg>
  );
}
export const HeartSim = React.memo(function HeartSim({ act }) {
  const reduced = useReducedMotion();
  const [bpm, setBpm] = useState(72);
  const co = (bpm * 70) / 1000; // L/min
  const state = bpm < 60 ? ["راحة عميقة / نوم", "قلبك يوفّر طاقته، والجسم يصلح نفسه"] : bpm <= 100 ? ["وضع طبيعي", "ضخ متوازن يكفي أنشطتك اليومية بهدوء"] : bpm <= 140 ? ["جهد رياضي", "عضلاتك تطلب أكسجين أكثر، فالقلب يسرع ويقوى ضخّه"] : ["جهد أقصى", "أقصى ما يصل إليه قلب شاب بالتمارين الشاقة، ويعود تدريجياً بعدها"];
  useEffect(() => { if (bpm >= 110) act.awardBadge("heart"); }, [bpm]); // eslint-disable-line
  return (
    <section data-testid="bio-heart" className={cardCls}>
      <SecHead icon={<HeartPulse className="w-6 h-6" />} grad="from-rose-500 to-red-600" title="محاكاة القلب والدورة الدموية" sub="حرّك النبض وشاهد قلبك يخفق بسرعتك" />
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="text-center">
          <div className="relative rounded-3xl bg-gradient-to-b from-rose-50 via-white to-sky-50 ring-1 ring-rose-100 p-3 overflow-hidden">
            {!reduced && (<>
              <motion.span aria-hidden="true" animate={{ scale: [0.55, 1.25], opacity: [0.4, 0] }} transition={{ duration: 60 / bpm, repeat: Infinity, ease: "easeOut" }} className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-rose-300 pointer-events-none" />
              <motion.span aria-hidden="true" animate={{ scale: [0.55, 1.25], opacity: [0.3, 0] }} transition={{ duration: 60 / bpm, repeat: Infinity, ease: "easeOut", delay: (60 / bpm) / 2 }} className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-sky-300 pointer-events-none" />
            </>)}
            <motion.div animate={{ scale: [1, 1.025, 1.008, 1.02, 1] }} transition={{ duration: 60 / bpm, repeat: Infinity, ease: "easeInOut" }}>
              <CirculationDiagram bpm={bpm} reduced={reduced} />
            </motion.div>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-full bg-blue-50 ring-1 ring-blue-200 text-blue-800"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> أزرق · دم فقير بالأكسجين قادم من الجسم</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-full bg-rose-50 ring-1 ring-rose-200 text-rose-800"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> أحمر · دم غني بالأكسجين عائد من الرئتين</span>
          </div>
          <div className="font-head font-black text-4xl text-slate-900 mt-3" dir="ltr">{bpm} <span className="text-base text-slate-400">BPM</span></div>
          <div className="text-[12px] font-black text-rose-600">{state[0]}</div>
          <p className="text-[12px] text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto mt-1">{state[1]}</p>
        </div>
        <div>
          <div className="rounded-3xl overflow-hidden ring-1 ring-rose-200 ft-shadow">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950">
              <span className="text-[11px] font-black text-rose-300">تخطيط القلب الكهربائي ECG · حي ومتزامن مع نبضك</span>
              <span className="text-[10px] font-black text-slate-400" dir="ltr">P · QRS · T</span>
            </div>
            <EcgTrace bpm={bpm} />
            <p className="text-[10.5px] text-slate-400 font-bold px-3.5 py-2 bg-slate-950 leading-relaxed">كل دورة تخطيط فيها موجات PQRST: موجة P انقباض الأذينين، وقفزة QRS الحادة انقباض البطينين، وموجة T استرخاؤهما وإعادة شحنهما.</p>
          </div>
          <label className="block mt-4">
            <span className="flex justify-between text-[12px] font-black text-slate-600"><span>معدل النبض (نبضة / دقيقة)</span><span dir="ltr">{bpm}</span></span>
            <input type="range" min="40" max="160" value={bpm} onChange={(e) => setBpm(+e.target.value)} className="w-full accent-rose-600" />
          </label>
          <div className="flex justify-between text-[10px] font-black text-slate-400" dir="ltr"><span>40 نوم</span><span>72 راحة</span><span>120 جري</span><span>160 أقصى</span></div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-3xl bg-gradient-to-b from-rose-50 to-white ring-1 ring-rose-100 p-4 text-center">
              <div className="text-[11px] font-black text-rose-500">النتاج القلبي</div>
              <div className="text-3xl font-black font-head text-slate-900" dir="ltr">{fmt(co, 1)} <span className="text-sm text-slate-400">L/min</span></div>
              <div className="text-[10.5px] text-slate-400 font-bold">نبضاتك × 70 مل لكل نبضة</div>
            </div>
            <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-white ring-1 ring-amber-100 p-4 text-center">
              <div className="text-[11px] font-black text-amber-600">دم يُضخ يومياً بهذا المعدل</div>
              <div className="text-3xl font-black font-head text-slate-900" dir="ltr">{fmt(co * 1440 / 1000, 1)}k <span className="text-sm text-slate-400">L</span></div>
              <div className="text-[10.5px] text-slate-400 font-bold">أثناء الراحة ينخفض الرقم فعلياً</div>
            </div>
          </div>
          <Steps steps={[`كل نبضة تدفع نحو 70 مل من الدم (حجم فنجان صغير تقريباً)`, `النتاج القلبي = ${bpm} × 70 مل = ${fmt(bpm * 70)} مل بالدقيقة`, `بالرياضة لا يسرع القلب فقط، بل تزيد قوة النبضة أيضاً فيتضاعف التروية أكثر من ضعفين`]} />
        </div>
      </div>
    </section>
  );
});

/* ================= 17 · digestion journey ================= */
