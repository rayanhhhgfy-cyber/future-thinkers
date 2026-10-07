import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ChevronLeft, Atom, Rocket, Play, RotateCcw, Volume2, VolumeX, Check, X,
  Trophy, Timer, Activity, Triangle,
} from "lucide-react";
import { Layout } from "@/components/Layout";

/* ================= shared bits ================= */
export const fmt = (x, d = 2) => (x == null || !isFinite(x) ? "-" : Number(x.toFixed(d)).toLocaleString("en-US"));
export const chips = (active) =>
  `pressable px-3 py-2 rounded-xl text-[12px] font-black transition min-h-[40px] ${active ? "bg-slate-900 text-white ft-shadow scale-[1.03]" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50"}`;
export const cardCls = "rounded-3xl bg-gradient-to-b from-white to-slate-50/70 ring-1 ring-slate-100 ft-shadow p-4 sm:p-5";
export const gradBtn = "pressable inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 text-white text-[13px] font-head font-black ft-shadow hover:scale-[1.03] active:scale-95 transition min-h-[44px]";
export const ghostBtn = "pressable inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-black hover:bg-slate-50 active:scale-95 transition min-h-[44px]";

export function head3(icon, title, sub) {
  return (
    <div className="relative mb-4 -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 rounded-t-3xl bg-gradient-to-l from-violet-50/90 via-indigo-50/60 to-cyan-50/50 ring-1 ring-inset ring-violet-100/60 overflow-hidden">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
      <div className="relative flex items-center gap-2.5">
        <span className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-indigo-600 ring-1 ring-white/60 shadow-lg shadow-indigo-200 text-2xl">{icon}</span>
        <div>
          <div className="font-head font-black text-slate-900 text-[16px] leading-tight">{title}</div>
          {sub && <div className="text-[11.5px] text-slate-400 font-bold">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
export function Stat({ label, value, unit, tone = "from-violet-50 ring-violet-100" }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-b ${tone} to-white ring-1 p-3 text-center ft-shadow overflow-hidden`}>
      <motion.div key={String(value)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        className="text-[19px] sm:text-[22px] font-black font-head text-slate-900 leading-none" dir="ltr">
        {value}{unit && <span className="text-[11px] text-slate-400 font-black"> {unit}</span>}
      </motion.div>
      <div className="text-[10px] text-slate-400 font-black mt-1.5 leading-tight">{label}</div>
    </div>
  );
}
export function Slider({ label, value, set, min, max, step = 1, unit = "", tone = "accent-violet-600" }) {
  return (
    <label className="block">
      <span className="flex justify-between items-center text-[12px] font-black text-slate-600 mb-1">
        <span>{label}</span>
        <span className="px-2 py-0.5 rounded-lg bg-violet-50 ring-1 ring-violet-100 text-violet-700" dir="ltr">{fmt(value, step < 1 ? 2 : 0)}{unit ? " " + unit : ""}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(+e.target.value)}
        className={`w-full ${tone} h-9 cursor-pointer`} aria-label={label} />
    </label>
  );
}
export function Steps({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-1.5 mt-3">
      {steps.map((st, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] text-slate-600 leading-relaxed">
          <span className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-violet-100 text-violet-800 text-[10px] font-black mt-0.5">{i + 1}</span>
          <span dir="auto">{st}</span>
        </li>
      ))}
    </ol>
  );
}
export const numIn = "w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-[15px] focus:outline-none focus:ring-indigo-300 text-slate-800 min-h-[44px]";
export const selIn = "w-full px-3 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] focus:outline-none focus:ring-indigo-300 text-slate-700 min-h-[44px]";

/* canvas helper: one rAF loop, DPR aware, pauses when hidden */
export function useSimCanvas(init, draw) {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = init();
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf = 0, last = performance.now(), inView = true;
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { threshold: 0.04 })
      : null;
    if (io) io.observe(cv);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !inView) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current(ctx, w, h, dt, worldRef.current);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); if (io) io.disconnect(); };
  }, []);
  return [canvasRef, worldRef];
}
/* ============ performance helpers ============ */
/* lazy section mount: renders only when near the viewport, then stays mounted */
export function LazyMount({ minH = 420, icon = "⚛️", title = "", children }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: "700px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  if (!on) {
    return (
      <div ref={ref} className={cardCls} style={{ minHeight: minH }} aria-hidden="true">
        {head3(icon, title)}
        <div className="space-y-2.5 pt-1">
          <div className="h-3.5 rounded-full bg-slate-100 w-2/3" />
          <div className="h-3.5 rounded-full bg-slate-100 w-1/2" />
          <div className="h-28 rounded-2xl bg-gradient-to-b from-violet-50/80 to-slate-50 ring-1 ring-slate-100" />
        </div>
      </div>
    );
  }
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}
/* prefers-reduced-motion: decorative animation off, functional motion stays */
export function usePrefersReducedMotion() {
  const [rm, setRm] = useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = (e) => setRm(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", fn); else if (mq.addListener) mq.addListener(fn);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", fn); else if (mq.removeListener) mq.removeListener(fn); };
  }, []);
  return rm;
}
export const NOOP = () => {};

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function arrow(ctx, x1, y1, x2, y2, color, width = 3) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 9 * Math.cos(a - 0.42), y2 - 9 * Math.sin(a - 0.42));
  ctx.lineTo(x2 - 9 * Math.cos(a + 0.42), y2 - 9 * Math.sin(a + 0.42));
  ctx.closePath(); ctx.fill();
}

/* ================= physics data ================= */
export const PLANETS = [
  { id: "mercury", name: "عطارد", g: 3.7, esc: 4.3, col: "#b8a88f", fact: "سنة عطارد 88 يوماً فقط · وأسرع كوكب حول الشمس" },
  { id: "venus", name: "الزهرة", g: 8.87, esc: 10.4, col: "#e8b04b", fact: "أسخن كوكب (465°م) ويدور حول نفسه بالعكس" },
  { id: "earth", name: "الأرض", g: 9.81, esc: 11.2, col: "#38bdf8", fact: "الكوكب الوحيد المعروف بالحياة · وسرعة الهروب منه 11.2 كم/ثا" },
  { id: "moon", name: "القمر", g: 1.62, esc: 2.4, col: "#cbd5e1", fact: "رواد أبولو قفزوا عالياً لأن جاذبيته سدس جاذبية الأرض" },
  { id: "mars", name: "المريخ", g: 3.71, esc: 5.0, col: "#f97316", fact: "فيه أعلى بركان بالنظام الشمسي: أوليمبوس ارتفاعه 22 كم" },
  { id: "jupiter", name: "المشتري", g: 24.79, esc: 59.5, col: "#d6a05a", fact: "كتلته أكبر من كل الكواكب مجتمعة مرتين ونصف" },
  { id: "saturn", name: "زحل", g: 10.44, esc: 35.5, col: "#e7c873", fact: "كثافته أقل من الماء · لو وجد محيطاً عملاقاً لطفا عليه" },
  { id: "uranus", name: "أورانوس", g: 8.69, esc: 21.3, col: "#7dd3fc", fact: "يدور مائلاً على جانبه بزاوية 98 درجة" },
  { id: "neptune", name: "نبتون", g: 11.15, esc: 23.5, col: "#60a5fa", fact: "أسرع رياح بالنظام الشمسي: 2100 كم/ساعة" },
];
export const planetById = (id) => PLANETS.find((p) => p.id === id) || PLANETS[2];

export const RANKS = [
  { xp: 0, name: "فيزيائي مبتدئ" }, { xp: 150, name: "مراقب الحركة" }, { xp: 350, name: "مفتش القوى" },
  { xp: 650, name: "مهندس المختبر" }, { xp: 1050, name: "باحث فيزياء" }, { xp: 1600, name: "خبير الموجات" },
  { xp: 2600, name: "أستاذ الفيزياء" },
];
export const rankOf = (xp) => {
  let r = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i].xp) r = RANKS[i]; else { next = RANKS[i]; break; } }
  return { rank: r, next };
};
export const BADGES = [
  { id: "first-flight", icon: "🚀", name: "أول إقلاع", desc: "أطلق أول مقذوف في المختبر" },
  { id: "sniper", icon: "🎯", name: "القنّاص", desc: "أصب الهدف بدقة 90 فأكثر في تحدي الهدف" },
  { id: "circuit-master", icon: "💡", name: "مهندس الدوائر", desc: "اربح تحدي الدائرة الكهربائية" },
  { id: "momentum", icon: "⚖️", name: "حارس الزخم", desc: "شغّل مسرح التصادمات وشاهد حفظ الزخم" },
  { id: "wave-rider", icon: "🔊", name: "راكب الموجات", desc: "شغّل نغمة صوتية من استوديو الموجات" },
  { id: "orbit", icon: "🛰️", name: "رائد المدارات", desc: "ضع قمراً في مدار مستقر حول الكوكب" },
  { id: "pendulum", icon: "⏱️", name: "سيد الزمن", desc: "قارن زمن البندول المقاس بالنظري" },
  { id: "quiz-ace", icon: "🧠", name: "عبقري الفيزياء", desc: "أجب 4 من 5 فأكثر في اختبار اليوم" },
  { id: "explorer", icon: "🔭", name: "مستكشف المختبر", desc: "شغّل 5 تجارب مختلفة في المسرح" },
  { id: "scholar", icon: "📐", name: "الفيزيائي المثابر", desc: "اجمع 500 نقطة خبرة فيزياء" },
];

export const SPECTRUM = [
  { id: "radio", name: "موجات الراديو", icon: "📻", lamNm: 1e9, col: "#94a3b8", danger: 0, dangerAr: "آمنة تماماً", uses: "البث الإذاعي والتلفزيوني واتصالات الهواتف والواي فاي حولك كل يوم", note: "أطول الموجات وأقلها طاقة · تمر عبر الجدران بسهولة" },
  { id: "micro", name: "الميكروويف", icon: "📡", lamNm: 1e7, col: "#a78bfa", danger: 1, dangerAr: "منخفضة", uses: "فرن الميكروويف يسخن طعامك · وأبراج الاتصالات والرادارات", note: "تهز جزيئات الماء في الطعام فيسخن من الداخل" },
  { id: "ir", name: "الأشعة تحت الحمراء", icon: "🌡️", lamNm: 1e4, col: "#f87171", danger: 1, dangerAr: "منخفضة", uses: "ريموت التلفاز وكاميرات المراقبة الليلية ومقاييس الحرارة", note: "هي حرارة الشمس التي تشعر بها على جلدك دون أن تراها" },
  { id: "vis", name: "الضوء المرئي", icon: "🌈", lamNm: 550, col: "#facc15", danger: 1, dangerAr: "آمنة · لا تنظر للشمس", uses: "رؤيتك للعالم · وألواح الطاقة الشمسية المنتشرة على أسطح الأردن", note: "شريط ضيق جداً من الطيف كله · ألوانه من الأحمر للبنفسجي" },
  { id: "uv", name: "الأشعة فوق البنفسجية", icon: "☀️", lamNm: 100, col: "#c084fc", danger: 2, dangerAr: "متوسطة", uses: "تعقيم الأدوات وكشف العملات المزيفة · ومؤشرها مرتفع بصيف الأردن", note: "تسبب اسمرار الجلد وحروقه · طبقة الأوزون تحجب أخطرها" },
  { id: "xray", name: "الأشعة السينية", icon: "🦴", lamNm: 1, col: "#38bdf8", danger: 3, dangerAr: "عالية · بجرعات طبية محسوبة", uses: "تصوير العظام بالمستشفيات وفحص الحقائب بالمطارات", note: "تخترق اللحم وتقف عند العظام · اكتشفها رونتغن عام 1895" },
  { id: "gamma", name: "أشعة غاما", icon: "☢️", lamNm: 0.001, col: "#fb7185", danger: 3, dangerAr: "عالية جداً", uses: "علاج الأورام وتعقيم المعدات الطبية · وتولد من انفجارات النجوم", note: "أقصر الموجات وأعلى طاقة · تحتاج دروعاً من الرصاص لإيقافها" },
];

export const QUIZ_BANK = [
  { q: "ما وحدة قياس القوة في النظام الدولي؟", opts: ["الجول", "النيوتن", "الواط", "الباسكال"], a: 1, why: "القوة تقاس بالنيوتن نسبة لإسحاق نيوتن صاحب قوانين الحركة." },
  { q: "سيارة تتحرك بسرعة ثابتة 20 م/ثا. ما المسافة التي تقطعها في 15 ثانية؟", opts: ["35 م", "150 م", "300 م", "450 م"], a: 2, why: "المسافة = السرعة × الزمن = 20 × 15 = 300 متر." },
  { q: "جسم كتلته 5 كغ على الأرض (g = 10). ما وزنه؟", opts: ["5 نيوتن", "15 نيوتن", "50 نيوتن", "0.5 نيوتن"], a: 2, why: "الوزن = الكتلة × تسارع الجاذبية = 5 × 10 = 50 نيوتن." },
  { q: "ما سرعة الضوء في الفراغ تقريباً؟", opts: ["300 م/ثا", "340 م/ثا", "3×10⁸ م/ثا", "1500 م/ثا"], a: 2, why: "سرعة الضوء 300 ألف كم/ثا · أسرع شيء معروف في الكون." },
  { q: "مصباح مقاومته 12 أوم موصول ببطارية 6 فولت. ما شدة التيار؟", opts: ["2 أمبير", "0.5 أمبير", "72 أمبير", "18 أمبير"], a: 1, why: "قانون أوم: التيار = الجهد ÷ المقاومة = 6 ÷ 12 = 0.5 أمبير." },
  { q: "سقط جسم سقوطاً حراً من السكون (g = 10). ما سرعته بعد 3 ثوانٍ؟", opts: ["3 م/ثا", "10 م/ثا", "30 م/ثا", "300 م/ثا"], a: 2, why: "السرعة = g × الزمن = 10 × 3 = 30 م/ثا." },
  { q: "موجة ترددها 5 هرتز وطولها الموجي 2 م. ما سرعتها؟", opts: ["2.5 م/ثا", "7 م/ثا", "10 م/ثا", "0.4 م/ثا"], a: 2, why: "سرعة الموجة = التردد × الطول الموجي = 5 × 2 = 10 م/ثا." },
  { q: "أي قانون يقول: لكل فعل رد فعل مساوٍ له في المقدار ومعاكس في الاتجاه؟", opts: ["الأول لنيوتن", "الثاني لنيوتن", "الثالث لنيوتن", "قانون أوم"], a: 2, why: "قانون نيوتن الثالث: القوى دائماً تأتي في أزواج متساوية ومتعاكسة." },
  { q: "رفع طالب صندوقاً 2 م بقوة 50 نيوتن. ما الشغل المبذول؟", opts: ["25 جول", "100 جول", "52 جول", "1000 جول"], a: 1, why: "الشغل = القوة × المسافة باتجاهها = 50 × 2 = 100 جول." },
  { q: "بندول طوله أكبر يقارن ببندول أقصر على نفس الكوكب. زمنه الدوري:", opts: ["أقصر", "أطول", "متساوٍ", "صفر"], a: 1, why: "الزمن الدوري يتناسب مع جذر طول البندول: T = 2π√(L/g) · الطول الأكبر زمنه أطول." },
  { q: "وصلت مقاومتان 4 و4 أوم على التوازي. المقاومة المكافئة:", opts: ["8 أوم", "4 أوم", "2 أوم", "16 أوم"], a: 2, why: "بالتوازي: 1/R = 1/4 + 1/4 = 1/2 · إذن R = 2 أوم · دائماً أصغر من أصغرهما." },
  { q: "كتلة 2 كغ تتحرك بسرعة 3 م/ثا. طاقتها الحركية:", opts: ["6 جول", "9 جول", "18 جول", "3 جول"], a: 1, why: "الطاقة الحركية = ½ الكتلة × السرعة² = 0.5 × 2 × 9 = 9 جول." },
  { q: "لماذا يطفو الجليد على الماء؟", opts: ["لأنه أثقل", "كثافته أقل من الماء", "لأنه بارد", "بسبب الجاذبية"], a: 1, why: "كثافة الجليد 917 كغ/م³ أقل من الماء 1000 · الأقل كثافة يطفو." },
  { q: "ما وحدة قياس القدرة الكهربائية؟", opts: ["الأمبير", "الفولت", "الواط", "الأوم"], a: 2, why: "القدرة تقاس بالواط = الجهد × التيار · ومصباح بيتك عادة 5 إلى 20 واط." },
  { q: "رائد فضاء على القمر مقارنة بالأرض. كتلته:", opts: ["تصبح سدسها", "تبقى كما هي", "تصبح صفراً", "تتضاعف"], a: 1, why: "الكتلة لا تتغير أبداً · الذي ينقص هو الوزن فقط لأن جاذبية القمر أضعف." },
];

export const FACTS = [
  { cat: "حركة", icon: "🍎", title: "تفاحة نيوتن", text: "قصة التفاحة مشهورة، لكن الأهم أن نيوتن أدرك أن نفس الجاذبية التي تسقط التفاحة تمسك القمر في مداره حول الأرض. قانون واحد يحكم الكون كله." },
  { cat: "حركة", icon: "🗼", title: "تجربة غاليليو", text: "أثبت غاليليو أن الأجسام الثقيلة والخفيفة تسقط بنفس التسارع إذا أهملنا مقاومة الهواء. على القمر أسقط رائد فضاء مطرقة وريشة فوصلتا معاً في نفس اللحظة." },
  { cat: "حركة", icon: "🚗", title: "مسافة التوقف", text: "مضاعفة سرعة السيارة تضاعف مسافة الفرملة أربع مرات، لأن الطاقة الحركية تتناسب مع مربع السرعة. لهذا السرعة الزائدة خطيرة جداً." },
  { cat: "كهرباء", icon: "⚡", title: "البرق أحر من الشمس", text: "حرارة قناة البرق تصل إلى 30 ألف درجة مئوية، أي خمسة أضعاف حرارة سطح الشمس. والإلكترونات في سلك بيتك تتحرك ببطء شديد، أبطأ من مشي النملة." },
  { cat: "كهرباء", icon: "🔋", title: "بطارية الليمون", text: "ليمونة بمسارين من النحاس والزنك تولد نحو 0.9 فولت. أربع ليمونات على التوالي قد تشعل مصباح LED صغيراً. جربها في مختبر المدرسة." },
  { cat: "كهرباء", icon: "🧲", title: "الأرض مغناطيس عملاق", text: "قلب الأرض الحديدي المنصهر يجعل كوكبنا مغناطيساً ضخماً. إبرة البوصلة تشير شمالاً بفضله، وهو يحمينا من الرياح الشمسية الضارة." },
  { cat: "ضوء", icon: "☀️", title: "ضوء الشمس عجوز", text: "ضوء الشمس الذي يصلك الآن غادر سطحها قبل 8 دقائق و20 ثانية. والفوتون الواحد قد يقضي آلاف السنين داخل الشمس قبل أن يهرب من سطحها." },
  { cat: "ضوء", icon: "🌈", title: "قوس المطر مزدوج", text: "قوس قزح الثاني الخافت فوق الأول ألوانه معكوسة الترتيب، لأن ضوءه ينعكس مرتين داخل قطرة المطر بدل مرة واحدة." },
  { cat: "ضوء", icon: "🔭", title: "ننظر إلى الماضي", text: "أقرب نجم إلينا بعد الشمس يبعد 4.2 سنة ضوئية، أي أنك تراه كما كان قبل 4 سنوات. التلسكوبات القوية ترى مجرات كما كانت قبل مليارات السنين." },
  { cat: "فضاء", icon: "🛰️", title: "ليس انعدام جاذبية", text: "رواد محطة الفضاء ليسوا بلا جاذبية؛ جاذبية الأرض عندهم 90% من سطحها. هم في سقوط حر مستمر حول الأرض، لذلك يطفون." },
  { cat: "فضاء", icon: "🌍", title: "تدور بسرعة هائلة", text: "أنت الآن تدور مع الأرض بسرعة 1600 كم/ساعة عند خط الاستواء، وتدور حول الشمس بسرعة 107 آلاف كم/ساعة، ولا تشعر بشيء لأن الحركة منتظمة." },
  { cat: "فضاء", icon: "🌙", title: "القمر يبتعد", text: "القمر يبتعد عن الأرض نحو 3.8 سم كل سنة بسبب المد والجزر. بعد ملايين السنين لن يغطي الشمس كاملة ولن نرى كسوفاً كلياً." },
];
export const FACT_CATS = ["الكل", "حركة", "كهرباء", "ضوء", "فضاء"];

/* ================= local XP store ================= */
export const LS_KEY = "ft-phys-xp";
export function blankStore() {
  return {
    xp: 0, badges: [],
    daily: { date: "", quizDone: false },
    records: { experiments: 0, sims: [], quizAnswered: 0, quizCorrect: 0, quizStreak: 0, bestTarget: 0, circuitWins: 0, lastQuizDate: "" },
  };
}
export function loadStore() {
  try {
    const j = JSON.parse(localStorage.getItem(LS_KEY));
    if (j && typeof j.xp === "number") {
      const b = blankStore();
      return { ...b, ...j, daily: { ...b.daily, ...(j.daily || {}) }, records: { ...b.records, ...(j.records || {}) } };
    }
  } catch { /* private mode */ }
  return blankStore();
}
export const PhysCtx = React.createContext(null);
export const usePhys = () => React.useContext(PhysCtx);
export const todayStr = () => new Date().toISOString().slice(0, 10);

/* ============ FEATURE 1 · projectile lab (engine reused by the target challenge) ============ */
export function lamText(nm) {
  if (nm >= 1e8) return fmt(nm / 1e9, 2) + " م";
  if (nm >= 1e6) return fmt(nm / 1e6, 2) + " سم";
  if (nm >= 1e3) return fmt(nm / 1e3, 1) + " ميكرومتر";
  if (nm >= 1) return fmt(nm, 3) + " نانومتر";
  return fmt(nm * 1000, 0) + " بيكومتر";
}
export const sciHz = (x) => { if (!isFinite(x) || x <= 0) return "-"; const e = Math.floor(Math.log10(x)); return fmt(x / Math.pow(10, e)) + "×10^" + e; };
