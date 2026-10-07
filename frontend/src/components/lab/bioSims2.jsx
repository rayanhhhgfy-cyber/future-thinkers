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
const DIGEST_STOPS = [
  { ar: "الفم", icon: "👄", time: "دقيقة واحدة", enz: "أميليز اللعاب (التيالين)", what: "يقطّع الأسنان الطعام، ويبدأ الأميليز بتفكيك النشويات إلى سكريات أبسط.", col: "#f59e0b" },
  { ar: "المريء", icon: "🌊", time: "10 ثوانٍ", enz: "لا إنزيمات هنا", what: "أنبوب عضلي يدفع اللقمة للأسفل بحركات متموّجة حتى لو أكلت مقلوباً.", col: "#64748b" },
  { ar: "المعدة", icon: "🧪", time: "2 إلى 4 ساعات", enz: "بيبسين + حمض الهيدروكلوريك", what: "حمّام حمضي يعقّم الطعام ويبدأ هضم البروتينات، ويعصره حتى يصير شوربة (الكيموس).", col: "#e11d48" },
  { ar: "الكبد والمرارة", icon: "🫘", time: "شريك مساعد", enz: "العصارة الصفراوية", what: "الصفراء تستحلب الدهون: تكسّر كراتها الكبيرة لقطرات صغيرة فيهاجمها الليباز بسهولة.", col: "#65a30d" },
  { ar: "البنكرياس", icon: "🧬", time: "شريك مساعد", enz: "أميليز + ليباز + تربسين", what: "يصبّ أقوى كوكتيل إنزيمات في الأمعاء ويكمل هضم النشا والدهون والبروتين معاً.", col: "#7c3aed" },
  { ar: "الأمعاء الدقيقة", icon: "🌀", time: "3 إلى 5 ساعات", enz: "إنزيمات جدارية مكملة", what: "مسرح الامتصاص الكبير: ملايين الزغابات تنقل السكريات والأحماض الأمينية والدهون إلى الدم.", col: "#0284c7" },
  { ar: "الأمعاء الغليظة", icon: "💧", time: "12 إلى 48 ساعة", enz: "بكتيريا نافعة", what: "يمتص الماء والأملاح، وتصنع بكتيريا الأمعاء فيتامينات، ويتكثّف الباقي ليخرج من الجسم.", col: "#0891b2" },
];
function PeristalsisStrip({ col }) {
  const reduced = useReducedMotion();
  return (
    <div className="rounded-3xl bg-gradient-to-b from-amber-50/70 to-white ring-1 ring-amber-100 px-3 pt-2 pb-1 mb-4 overflow-hidden">
      <svg viewBox="0 0 640 86" className="w-full h-auto" role="img" aria-label="حركة دودية تدفع الطعام">
        <path d="M24 43 L616 43" stroke="#fde68a" strokeWidth="34" strokeLinecap="round" />
        <path d="M24 43 L616 43" stroke={col} strokeWidth="34" strokeLinecap="round" opacity="0.16" />
        {Array.from({ length: 11 }).map((_, i) => (
          <motion.ellipse key={i} cx={52 + i * 54} cy="43" rx="15" ry="21" fill="none" stroke={col} strokeWidth="4"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            animate={reduced ? undefined : { scaleX: [1, 0.4, 1] }} transition={{ duration: 1.15, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }} />
        ))}
        <motion.g animate={reduced ? undefined : { x: [0, 548] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}>
          <circle cx="46" cy="43" r="12.5" fill="#92400e" stroke="#451a03" strokeWidth="2" />
          <circle cx="42" cy="39" r="4" fill="#d97706" />
        </motion.g>
      </svg>
      <p className="text-[10.5px] text-slate-400 font-bold text-center leading-relaxed">الحركة الدودية (التمعّج): حلقات عضلية تنقبض موجةً وراء موجة فتدفع لقمة الطعام عبر القناة كلها · ولو أكلت واقفاً على رأسك لوصلت معدتك</p>
    </div>
  );
}
export const DigestionJourney = React.memo(function DigestionJourney({ act }) {
  const [sel, setSel] = useState(DIGEST_STOPS[0]);
  return (
    <section data-testid="bio-digestion" className={cardCls}>
      <SecHead icon="🍽️" grad="from-amber-500 to-orange-600" title="رحلة الطعام" sub="من أول قضمة إلى الامتصاص · اضغط كل محطة لترى زمن العبور وإنزيماتها" />
      <PeristalsisStrip col={sel.col} />
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DIGEST_STOPS.map((s, i) => (
          <React.Fragment key={s.ar}>
            <button onClick={() => { setSel(s); act.award(5, `digest-${s.ar}`); }} className={`pressable shrink-0 flex flex-col items-center gap-1 px-3.5 py-3 rounded-3xl ring-1 transition min-w-[76px] min-h-[76px] ${sel.ar === s.ar ? "text-white ft-shadow scale-[1.04]" : "bg-white ring-slate-200 text-slate-600"}`} style={sel.ar === s.ar ? { background: `linear-gradient(160deg, ${s.col}, ${s.col}aa)` } : {}}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[11px] font-black leading-tight">{s.ar}</span>
            </button>
            {i < DIGEST_STOPS.length - 1 && <span className="self-center text-slate-300 font-black shrink-0">←</span>}
          </React.Fragment>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.ar} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl ring-1 p-5 mt-1" style={{ background: `linear-gradient(180deg, ${sel.col}12, #fff)`, borderColor: sel.col + "44" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xl">{sel.icon}</span>
            <span className="font-head font-black text-slate-900 text-lg">{sel.ar}</span>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-900 text-white">⏱ {sel.time}</span>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: sel.col }}>الإنزيم: {sel.enz}</span>
          </div>
          <p className="text-[13.5px] text-slate-700 leading-relaxed mt-2.5">{sel.what}</p>
          <p className="text-[11.5px] text-slate-400 font-bold mt-2 leading-relaxed">الرحلة الكاملة للطعام من الفم إلى الإخراج تستغرق عادة من 24 إلى 72 ساعة، وأكثرها يُقضى بالأمعاء الغليظة لامتصاص الماء.</p>
        </motion.div>
      </AnimatePresence>
    </section>
  );
});

/* ================= 5 · evolution tree ================= */
const EVO_STEPS = [
  { ar: "الأصل المشترك LUCA", icon: "🌋", when: "قبل 3.8 مليار سنة · 3800 Ma", desc: "آخر سلف مشترك لكل حياة اليوم: كائن وحيد الخلية عاش قرب فوهات حارة بأعماق المحيط.", col: "#78716c" },
  { ar: "البكتيريا والعتائق", icon: "🦠", when: "قبل 3.5 مليار سنة · 3500 Ma", desc: "أولى الخلايا بدائية النواة، ومنها بكتيريا زرقاء بدأت البناء الضوئي وملأت الجو بالأكسجين.", col: "#84cc16" },
  { ar: "حقيقيات النواة", icon: "🧫", when: "قبل مليارَي سنة · 2000 Ma", desc: "خلايا بنواة وميتوكوندريا بعد ابتلاع بكتيريا قديمة، فانفتح باب التعقيد.", col: "#06b6d4" },
  { ar: "أولى النباتات", icon: "🌿", when: "قبل 470 مليون سنة · 470 Ma", desc: "طحالب ثم نباتات برية صغيرة غيّرت وجه اليابسة ومهّدت للحيوانات الخروج من الماء.", col: "#16a34a" },
  { ar: "الأسماك", icon: "🐟", when: "قبل 530 مليون سنة · 530 Ma", desc: "أولى الفقاريات بعمود فقري، ومن أسماك ذات زعانف لحمية ستخرج كل رباعيات الأطراف.", col: "#0284c7" },
  { ar: "البرمائيات", icon: "🐸", when: "قبل 375 مليون سنة · 375 Ma", desc: "أولى الفقاريات على اليابسة: تعيش بالماء صغاراً وتتنفس بالرئتين كباراً.", col: "#059669" },
  { ar: "الزواحف", icon: "🦎", when: "قبل 320 مليون سنة · 320 Ma", desc: "بيضة ذات قشرة حرّرت التكاثر من الماء، ومنها لاحقاً الديناصورات والطيور والثدييات الأولى.", col: "#d97706" },
  { ar: "الطيور والثدييات", icon: "🦅", when: "قبل 240 إلى 150 مليون سنة · انقراض الديناصورات 66 Ma", desc: "الريش والطيران من جهة، والفراء والحليب من جهة أخرى، مساران توأمان من أصل زاحفي.", col: "#e11d48" },
  { ar: "الإنسان العاقل", icon: "🧍", when: "قبل 0.3 مليون سنة · 300 ألف سنة", desc: "أحدث الواصلين: دماغ كبير ولغة وأدوات، و99.9% من حمضه النووي مشترك مع أي إنسان آخر.", col: "#7c3aed" },
];
export const EvolutionTimeline = React.memo(function EvolutionTimeline({ act }) {
  const reduced = useReducedMotion();
  const [sel, setSel] = useState(EVO_STEPS[0]);
  const idx = EVO_STEPS.indexOf(sel);
  return (
    <section data-testid="bio-evolution" className={cardCls}>
      <SecHead icon="🌳" grad="from-green-600 to-emerald-700" title="شجرة التطور" sub="رحلة الحياة من خلية واحدة إليك · اضغط كل محطة" />
      <div className="relative">
        <div className="absolute top-7 right-2 left-2 h-1.5 rounded-full bg-gradient-to-l from-stone-300 via-lime-400 to-violet-400" dir="ltr" />
        <div className="flex gap-1 overflow-x-auto pb-1 relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EVO_STEPS.map((s, i) => (
            <button key={s.ar} onClick={() => { setSel(s); act.award(5, `evo-${i}`); }} className="shrink-0 flex flex-col items-center gap-1.5 px-2 pt-1 min-w-[86px]">
              <motion.span animate={sel.ar === s.ar && !reduced ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 1.6 }}
                className={`w-12 h-12 grid place-items-center rounded-full text-2xl ring-4 transition ${sel.ar === s.ar ? "ring-amber-300 ft-shadow-lg scale-110" : "ring-white"}`} style={{ background: `linear-gradient(160deg, ${s.col}, ${s.col}99)` }}>{s.icon}</motion.span>
              <span className={`text-[10.5px] font-black leading-tight text-center ${sel.ar === s.ar ? "text-slate-900" : "text-slate-400"}`}>{s.ar}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.ar} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl ring-1 p-5 mt-2" style={{ background: `linear-gradient(180deg, ${sel.col}12, #fff)`, borderColor: sel.col + "44" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-3xl">{sel.icon}</span>
            <span className="font-head font-black text-slate-900 text-lg">{sel.ar}</span>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: sel.col }}>{sel.when}</span>
            <span className="text-[11px] font-black text-slate-400">محطة {idx + 1} من {EVO_STEPS.length}</span>
          </div>
          <p className="text-[13.5px] text-slate-700 leading-relaxed mt-2">{sel.desc}</p>
        </motion.div>
      </AnimatePresence>
      <p className="text-[11.5px] text-slate-400 font-semibold mt-3 leading-relaxed">كل كائن حي اليوم، من البكتيريا إلى الحوت الأزرق، فرع في الشجرة نفسها وأبناء عمومة بدرجات مختلفة.</p>
    </section>
  );
});

/* ================= 18 · geologic time of life ================= */
const ERAS = [
  { ar: "ما قبل الكامبري", when: "4600 إلى 541 Ma", span: 88, col: "#78716c", events: ["نشأة الأرض والمحيطات", "أولى الخلايا الحية", "البكتيريا الزرقاء تنتج الأكسجين", "أولى حقيقيات النواة وعديدة الخلايا"] },
  { ar: "الدهر الباليوزوي (القديم)", when: "541 إلى 252 Ma", span: 7, col: "#0284c7", events: ["الانفجار الكامبري: تنوّع حيواني هائل", "أولى الأسماك والفقاريات", "النباتات ثم الحشرات تغزو اليابسة · أولى الأسماك نحو 530 Ma", "أولى الغابات والبرمائيات والزواحف"] },
  { ar: "الدهر الميزوزوي (الأوسط)", when: "252 إلى 66 Ma · ينتهي بانقراض الديناصورات", span: 4, col: "#d97706", events: ["عصر الديناصورات العملاقة", "أولى الثدييات الصغيرة", "أولى الطيور من ديناصورات مريّشة", "النباتات المزهرة تسيطر، ثم انقراض الديناصورات بنيزك قبل 66 Ma"] },
  { ar: "الدهر السينوزوي (الحديث)", when: "66 Ma إلى اليوم · الإنسان العاقل 0.3 Ma", span: 1, col: "#7c3aed", events: ["الثدييات والطيور تملأ الفراغ", "أولى القردة العليا", "انفصال خط الإنسان عن الشمبانزي", "الإنسان العاقل والحضارة الزراعية"] },
];
export const GeologicStrip = React.memo(function GeologicStrip({ act }) {
  const [sel, setSel] = useState(ERAS[0]);
  return (
    <section data-testid="bio-geologic" className={cardCls}>
      <SecHead icon="🪨" grad="from-stone-500 to-stone-700" title="خط زمن الحياة الجيولوجي" sub="4.6 مليار سنة مضغوطة في شريط واحد · اضغط أي دهر" />
      <div className="flex gap-1 rounded-3xl overflow-hidden ring-1 ring-stone-200" dir="ltr">
        {ERAS.map((e) => (
          <button key={e.ar} onClick={() => { setSel(e); act.award(5, `era-${e.ar}`); }}
            className={`py-4 px-1.5 text-white font-black text-[10px] sm:text-[11px] leading-tight transition min-h-[56px] ${sel.ar === e.ar ? "brightness-110 scale-y-105" : "opacity-70 hover:opacity-95"}`}
            style={{ flexGrow: e.span, background: `linear-gradient(180deg, ${e.col}, ${e.col}cc)` }}>{e.ar}</button>
        ))}
      </div>
      <p className="text-[10.5px] text-slate-400 font-bold mt-1.5">عرض كل دهر متناسب تقريباً مع مدّته الحقيقية · لهذا يلتهم ما قبل الكامبري الشريط كله تقريباً · Ma تعني «مليون سنة قبل اليوم»</p>
      <AnimatePresence mode="wait">
        <motion.div key={sel.ar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl ring-1 p-5 mt-3" style={{ background: `linear-gradient(180deg, ${sel.col}10, #fff)`, borderColor: sel.col + "44" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-head font-black text-slate-900 text-lg">{sel.ar}</span>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: sel.col }}>{sel.when}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
            {sel.events.map((ev, i) => (
              <div key={ev} className="flex gap-2 items-start rounded-2xl bg-white ring-1 ring-slate-100 px-3 py-2.5">
                <span className="w-5 h-5 shrink-0 grid place-items-center rounded-full text-white text-[10px] font-black mt-0.5" style={{ background: sel.col }}>{i + 1}</span>
                <span className="text-[12.5px] font-bold text-slate-600 leading-snug">{ev}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
});

/* ================= 8 · food web builder ================= */
const WEB_NODES = [
  { id: "plant", ar: "نباتات برية وأعشاب", icon: "🌾", kind: "منتج" },
  { id: "grasshopper", ar: "جراد", icon: "🦗", kind: "آكل أعشاب", eats: ["plant"] },
  { id: "rabbit", ar: "أرنب بري", icon: "🐇", kind: "آكل أعشاب", eats: ["plant"] },
  { id: "mouse", ar: "فأر الحقول", icon: "🐭", kind: "آكل بذور", eats: ["plant"] },
  { id: "frog", ar: "ضفدع", icon: "🐸", kind: "مفترس صغير", eats: ["grasshopper"] },
  { id: "snake", ar: "ثعبان", icon: "🐍", kind: "مفترس", eats: ["frog", "mouse", "rabbit"] },
  { id: "fox", ar: "ثعلب أحمر", icon: "🦊", kind: "مفترس", eats: ["rabbit", "mouse"] },
  { id: "kestrel", ar: "عوسق (صقر صغير)", icon: "🦅", kind: "مفترس علوي", eats: ["mouse", "grasshopper", "snake"] },
  { id: "owl", ar: "بومة", icon: "🦉", kind: "مفترس ليلي", eats: ["mouse"] },
];
const nodeById = (id) => WEB_NODES.find((n) => n.id === id);
export const FoodWebBuilder = React.memo(function FoodWebBuilder({ act }) {
  const [links, setLinks] = useState([["mouse", "plant"], ["snake", "mouse"]]);
  const [eater, setEater] = useState("fox");
  const [food, setFood] = useState("rabbit");
  const [removed, setRemoved] = useState(null);
  const BASE_POP = { plant: 100, grasshopper: 76, rabbit: 62, mouse: 84, frog: 44, snake: 32, fox: 26, kestrel: 16, owl: 20 };
  const pops = useMemo(() => {
    const p = { ...BASE_POP };
    if (!removed) return p;
    WEB_NODES.forEach((n) => {
      if (n.id === removed) { p[n.id] = 0; return; }
      if (removed === "plant" && n.id !== "plant") p[n.id] = Math.max(3, Math.round(p[n.id] * 0.35));
      else if (nodeById(removed)?.eats?.includes(n.id)) p[n.id] = Math.min(130, Math.round(p[n.id] * 1.45)); // prey blooms without its predator
      else if (n.eats?.includes(removed)) p[n.id] = Math.max(3, Math.round(p[n.id] * 0.55)); // predator starves
    });
    return p;
  }, [removed]);
  const realCount = links.filter(([e, f]) => nodeById(e)?.eats?.includes(f)).length;
  const addLink = () => {
    if (eater === food || links.some(([e, f]) => e === eater && f === food)) return;
    const next = [...links, [eater, food]];
    setLinks(next);
    const rc = next.filter(([e, f]) => nodeById(e)?.eats?.includes(f)).length;
    act.award(10, `web-${next.length}`);
    if (rc >= 4) act.awardBadge("web");
  };
  const cascade = useMemo(() => {
    if (!removed) return [];
    const out = [];
    const removedNode = nodeById(removed);
    out.push(`اختفى «${removedNode.ar}» من النظام البيئي · شاهد أشرطة الأعداد تتغيّر فوق.`);
    WEB_NODES.forEach((n) => {
      if (n.id === removed) return;
      const before = BASE_POP[n.id], after = pops[n.id];
      if (removed === "plant" && n.id !== "plant") out.push(`⚠️ «${n.ar}» ينهار من ${before} إلى ${after} فرداً تقريباً: بلا منتجات لا طاقة تدخل الشبكة أصلاً.`);
      else if (nodeById(removed)?.eats?.includes(n.id)) out.push(`🌱 «${n.ar}» يزدهر من ${before} إلى ${after}: غاب مفترسه فتكاثر، وسيضغط بدوره على غذائه.`);
      else if (n.eats?.includes(removed)) out.push(`⚠️ «${n.ar}» يجوع من ${before} إلى ${after}: فقد فريسته الأساسية وقد يهاجر أو يتحول لفريسة أصعب.`);
    });
    links.forEach(([e, f]) => {
      if (f === removed) {
        const alternatives = links.filter(([e2, f2]) => e2 === e && f2 !== removed);
        if (alternatives.length) out.push(`«${nodeById(e).ar}» يستطيع التحول جزئياً إلى ${alternatives.map(([a, b]) => nodeById(b).ar).join(" و")} فيخف الجوع قليلاً.`);
      }
    });
    if (removed === "plant") out.push("⚠️ الكارثة الأكبر: بلا منتجات تنهار الشبكة كلها من القاعدة، فالكل يعتمد على البناء الضوئي.");
    return [...new Set(out)];
  }, [removed, links, pops]);
  return (
    <section data-testid="bio-foodweb" className={cardCls}>
      <SecHead icon="🕸️" grad="from-emerald-500 to-teal-600" title="باني الشبكات الغذائية" sub="وادي الأردن نموذجاً · اربط من يأكل من، ثم احذف كائناً وشاهد الانهيار أو التوازن" />
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-emerald-200 mb-4">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-amber-100 to-amber-200" />
        <div className="absolute -top-6 -left-4 w-24 h-24 rounded-full bg-amber-300/80 blur-[1px]" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-amber-500/40 via-yellow-600/20 to-transparent" />
        <div className="absolute bottom-10 left-0 right-0 h-10 bg-lime-500/15 rounded-[100%]" />
        <div className="relative p-3 sm:p-4 space-y-2.5">
          {[["kestrel", "owl", "fox", "snake"], ["frog", "rabbit", "mouse", "grasshopper"], ["plant"]].map((row, ri) => (
            <div key={ri} className={`grid gap-2 ${ri === 2 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
              {row.map((id) => {
                const n = nodeById(id);
                const pop = pops[id];
                const gone = removed === id;
                const changed = removed && !gone && pop !== BASE_POP[id];
                return (
                  <div key={id} className={`rounded-2xl px-3 py-2.5 ring-1 backdrop-blur-sm transition ${gone ? "bg-slate-800/70 ring-slate-600 text-slate-300 grayscale" : "bg-white/80 ring-white text-slate-700"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{n.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[12px] font-black leading-tight truncate">{n.ar}</span>
                        <span className="block text-[9.5px] font-bold opacity-60">{n.kind}</span>
                      </span>
                      <span className={`mr-auto text-[11px] font-black shrink-0 ${gone ? "text-rose-300" : changed ? (pop > BASE_POP[id] ? "text-emerald-600" : "text-rose-600") : "text-slate-500"}`} dir="ltr">{gone ? "0" : pop}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900/10 overflow-hidden mt-1.5" dir="ltr">
                      <motion.div animate={{ width: `${Math.min(100, pop)}%` }} transition={{ type: "spring", stiffness: 60, damping: 16 }} className={`h-full rounded-full ${gone ? "bg-slate-500" : pop > BASE_POP[id] ? "bg-gradient-to-r from-emerald-400 to-lime-500" : pop < BASE_POP[id] ? "bg-gradient-to-r from-rose-400 to-red-500" : "bg-gradient-to-r from-teal-400 to-emerald-500"}`} />
                    </div>
                    {gone && <div className="text-[9.5px] font-black text-rose-300 mt-1">انقرض محلياً من هذا الوادي</div>}
                    {changed && <div className={`text-[9.5px] font-black mt-1 ${pop > BASE_POP[id] ? "text-emerald-600" : "text-rose-600"}`}>{pop > BASE_POP[id] ? `ازدهر +${pop - BASE_POP[id]}` : `تدهور ${pop - BASE_POP[id]}`} · كان {BASE_POP[id]}</div>}
                  </div>
                );
              })}
            </div>
          ))}
          <p className="text-[10px] font-bold text-slate-500 text-center">المشهد: وادي الأردن بين الغور الأخضر وبادية الأردن الصحراوية · الأرقام أعداد تقريبية لكل نوع (الأشرطة تتفاعل حيّاً مع الحذف بالأسفل)</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
        <label className="block"><span className="text-[11.5px] font-black text-slate-500">المفترس (من يأكل؟)</span>
          <select value={eater} onChange={(e) => setEater(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] min-h-[44px]">{WEB_NODES.filter((n) => n.id !== "plant").map((n) => <option key={n.id} value={n.id}>{n.icon} {n.ar}</option>)}</select></label>
        <span className="text-slate-300 font-black text-xl text-center pb-2">يأكل</span>
        <label className="block"><span className="text-[11.5px] font-black text-slate-500">الفريسة (ماذا؟)</span>
          <select value={food} onChange={(e) => setFood(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 font-black text-[13px] min-h-[44px]">{WEB_NODES.map((n) => <option key={n.id} value={n.id}>{n.icon} {n.ar}</option>)}</select></label>
        <button onClick={addLink} className={gradBtn}>اربط الرابط</button>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[11.5px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">روابط واقعية: {realCount} / {links.length}</span>
        <button onClick={() => { setLinks([["mouse", "plant"], ["snake", "mouse"]]); setRemoved(null); }} className={chips(false)}><RotateCcw className="w-3.5 h-3.5" /> صفّر</button>
      </div>
      <div className="space-y-1.5 mt-3">
        <AnimatePresence>
          {links.map(([e, f]) => {
            const real = nodeById(e)?.eats?.includes(f);
            return (
              <motion.div key={e + f} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 ring-1 ${real ? "bg-emerald-50/70 ring-emerald-100" : "bg-amber-50/70 ring-amber-100"}`}>
                <span className="text-[12.5px] font-black text-slate-700">{nodeById(e).icon} {nodeById(e).ar}</span>
                <span className="text-emerald-500 font-black">يأكل ←</span>
                <span className="text-[12.5px] font-black text-slate-700">{nodeById(f).icon} {nodeById(f).ar}</span>
                <span className={`mr-auto text-[10px] font-black px-2 py-0.5 rounded-full ${real ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-950"}`}>{real ? "رابط واقعي ✓" : "غير معتاد بالطبيعة"}</span>
                <button onClick={() => setLinks(links.filter(([a, b]) => !(a === e && b === f)))} className="pressable w-7 h-7 grid place-items-center rounded-full bg-white ring-1 ring-slate-200 text-rose-500 active:scale-90" aria-label="حذف الرابط"><X className="w-3.5 h-3.5" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {links.length === 0 && <p className="text-[12px] font-bold text-slate-400">لا روابط بعد · اربط أول سلسلة غذائية</p>}
      </div>
      <div className="mt-5 rounded-3xl bg-gradient-to-b from-rose-50 to-white ring-1 ring-rose-100 p-4">
        <div className="text-[12.5px] font-black text-rose-700 mb-2">🧨 محاكاة حذف كائن: ماذا ينهار؟</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {WEB_NODES.map((n) => <button key={n.id} onClick={() => setRemoved(removed === n.id ? null : n.id)} className={chips(removed === n.id) + (removed === n.id ? " !bg-rose-600" : "")}>{n.icon} {n.ar}</button>)}
          {removed && <button onClick={() => setRemoved(null)} className={chips(true) + " !bg-emerald-600"}><RotateCcw className="w-3.5 h-3.5" /> إعادة تعيين الأعداد</button>}
        </div>
        <AnimatePresence>
          {removed && (
            <motion.ul initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 space-y-1.5">
              {cascade.map((c, i) => <li key={i} className="text-[12.5px] text-slate-600 leading-relaxed flex gap-2"><span className="text-rose-400 font-black">·</span>{c}</li>)}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});

/* ================= 9 · photosynthesis lab ================= */
export const PhotosynthesisLab = React.memo(function PhotosynthesisLab({ act }) {
  const [light, setLight] = useState(10);
  const [intensity, setIntensity] = useState(3);
  const [co2, setCo2] = useState(420);
  const [days, setDays] = useState(7);
  const INTENSITY_STEPS = [["🌑 ظل", 0.12], ["💡 إضاءة غرفة", 0.35], ["⛅ يوم غائم", 0.65], ["☀️ شمس مباشرة", 1]];
  const I = INTENSITY_STEPS[intensity][1];
  const sat = 1 - Math.exp(-2.6 * I); // real light-saturation curve: output plateaus at high light
  const co2Factor = Math.min(1.6, 0.25 + co2 / 560);
  const o2PerDay = 0.62 * light * (sat / 0.926) * co2Factor; // grams, educational model for a potted plant
  const glucosePerDay = o2PerDay * (180 / 192);
  const o2 = o2PerDay * days, glucose = glucosePerDay * days;
  const maxRate = 0.62 * 16 * 1.6;
  useEffect(() => { if (intensity >= 2 && light >= 8 && co2 >= 600) act.award(10, "photo-pro"); }, [intensity, light, co2]); // eslint-disable-line
  return (
    <section data-testid="bio-photosynthesis" className={cardCls}>
      <SecHead icon={<Sun className="w-6 h-6" />} grad="from-amber-400 to-yellow-500" title="مختبر البناء الضوئي والتنفس" sub="نبتة في جرة افتراضية · عدّل الضوء والغاز وراقب الأكسجين والسكر" />
      <div className="rounded-3xl bg-slate-900 text-white p-4 text-center overflow-x-auto">
        <span className="font-mono font-black text-[14px] sm:text-base tracking-wide whitespace-nowrap" dir="ltr">6CO₂ + 6H₂O <span className="text-amber-300">☀ →</span> C₆H₁₂O₆ + 6O₂</span>
        <div className="text-[10.5px] text-slate-400 font-bold mt-1">المعادلة نفسها التي تراها معكوسة بالتنفس · جرّبها حيّة بمحاكي الكيمياء بصفحة «محاكي التفاعلات الكيميائية» بنادي العلوم</div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-4">
        <div className="space-y-4">
          <div>
            <span className="text-[12px] font-black text-slate-600 block mb-1.5">شدة الضوء (كما بالحياة الحقيقية)</span>
            <div className="grid grid-cols-4 gap-1.5">
              {INTENSITY_STEPS.map(([ar], i) => (
                <button key={ar} onClick={() => setIntensity(i)} className={`pressable rounded-xl px-1 py-2.5 ring-1 font-black text-[10.5px] sm:text-[11.5px] leading-tight min-h-[44px] transition ${intensity === i ? "bg-gradient-to-b from-amber-400 to-yellow-500 text-white ring-amber-300 ft-shadow" : "bg-white ring-slate-200 text-slate-500 hover:ring-amber-300"}`}>{ar}</button>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-400 font-bold mt-1 leading-relaxed">منحنى التشبع الضوئي واقعي: بعد حدٍّ معين لا تزيد شدة الضوء الإنتاج، لأن الإنزيمات تصل طاقتها القصوى.</p>
          </div>
          {[
            ["ساعات الضوء يومياً", light, setLight, 0, 16, "ساعة", "accent-amber-500"],
            ["تركيز ثاني أكسيد الكربون", co2, setCo2, 200, 1200, "ppm", "accent-emerald-600"],
            ["مدة التجربة", days, setDays, 1, 30, "يوماً", "accent-sky-600"],
          ].map(([ar, v, set, mn, mx, unit, ac]) => (
            <label key={ar} className="block">
              <span className="flex justify-between text-[12px] font-black text-slate-600"><span>{ar}</span><span dir="ltr">{v} {unit}</span></span>
              <input type="range" min={mn} max={mx} value={v} onChange={(e) => set(+e.target.value)} className={`w-full ${ac}`} />
            </label>
          ))}
          <div className="rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 px-3.5 py-2.5 text-[12px] font-bold text-indigo-900 leading-relaxed">🌙 بالليل تنقلب الحكاية: النبات يتنفس كالبشر فيستهلك أكسجين ويطلق CO₂ · صافي الإنتاج يتحقق لأن البناء نهاراً أسرع من التنفس ليلاً.</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 content-start">
          <div className="col-span-2 rounded-3xl bg-gradient-to-b from-lime-50 to-white ring-1 ring-lime-100 p-3.5">
            <div className="text-[11.5px] font-black text-lime-800 mb-1.5">مقطع عرضي بالورقة · أين يحدث البناء الضوئي؟</div>
            <svg viewBox="0 0 340 150" className="w-full h-auto" role="img" aria-label="مقطع ورقة نبات">
              <rect x="10" y="8" width="320" height="16" rx="6" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.6" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <g key={i}>
                  <rect x={16 + i * 40} y="28" width="30" height="52" rx="12" fill="#4ade80" stroke="#15803d" strokeWidth="1.6" />
                  {[36, 48, 60, 72].map((y) => <line key={y} x1={21 + i * 40} y1={y} x2={41 + i * 40} y2={y} stroke="#14532d" strokeWidth="1.8" opacity="0.6" />)}
                </g>
              ))}
              {[[50, 108], [100, 118], [160, 104], [220, 118], [285, 108], [130, 124], [255, 126]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="13" fill="#86efac" stroke="#15803d" strokeWidth="1.6" opacity="0.85" />)}
              <rect x="10" y="128" width="320" height="14" rx="6" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.6" />
              <ellipse cx="170" cy="135" rx="15" ry="6.5" fill="#f0fdf4" stroke="#15803d" strokeWidth="2" />
              <text x="330" y="20" textAnchor="end" fontSize="10" fontWeight="900" fill="#166534">بشرة عليا</text>
              <text x="330" y="58" textAnchor="end" fontSize="10" fontWeight="900" fill="#14532d">نسيج عمودي</text>
              <text x="330" y="112" textAnchor="end" fontSize="10" fontWeight="900" fill="#14532d">نسيج إسفنجي</text>
              <text x="196" y="139" fontSize="10" fontWeight="900" fill="#15803d">ثغر</text>
            </svg>
            <p className="text-[10.5px] text-slate-400 font-bold leading-relaxed">الخلايا العمودية المكدّسة بالبلاستيدات تلتقط معظم الضوء، والإسفنجية تترك فراغات لغاز CO₂ · وبالأسفل ترى منحنى التشبع: شدة ضوء أعلى لا تعني إنتاجاً أعلى بعد حد التشبع.</p>
            <svg viewBox="0 0 300 74" className="w-full h-auto mt-1" role="img" aria-label="منحنى التشبع الضوئي">
              <path d={`M14 64 ${Array.from({ length: 21 }).map((_, k) => { const i = k / 20; return `L${(14 + i * 272).toFixed(1)} ${(64 - ((1 - Math.exp(-2.6 * i)) / 0.926) * 52).toFixed(1)}`; }).join(" ")}`} stroke="#65a30d" strokeWidth="3" fill="none" strokeLinecap="round" />
              <line x1={14 + I * 272} y1="8" x2={14 + I * 272} y2="66" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
              <circle cx={14 + I * 272} cy={64 - (sat / 0.926) * 52} r="5.5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
              <text x="16" y="74" fontSize="9" fontWeight="800" fill="#64748b">ظل</text>
              <text x="150" y="74" fontSize="9" fontWeight="800" fill="#64748b">غائم</text>
              <text x="256" y="74" fontSize="9" fontWeight="800" fill="#64748b">شمس</text>
              <text x="292" y="16" textAnchor="end" fontSize="9" fontWeight="800" fill="#65a30d">التشبع</text>
            </svg>
          </div>
          <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 p-4 text-center">
            <div className="text-3xl">🫧</div>
            <div className="text-2xl font-black font-head text-slate-900" dir="ltr">{fmt(o2, 1)} g</div>
            <div className="text-[10.5px] text-slate-400 font-black">أكسجين مُنتج خلال التجربة</div>
          </div>
          <div className="rounded-3xl bg-gradient-to-b from-lime-50 to-white ring-1 ring-lime-100 p-4 text-center">
            <div className="text-3xl">🍬</div>
            <div className="text-2xl font-black font-head text-slate-900" dir="ltr">{fmt(glucose, 1)} g</div>
            <div className="text-[10.5px] text-slate-400 font-black">غلوكوز مخزّن كغذاء</div>
          </div>
          <div className="col-span-2 rounded-2xl bg-slate-50 ring-1 ring-slate-100 p-3.5">
            <div className="flex justify-between text-[11px] font-black text-slate-500"><span>كفاءة البناء الضوئي الحالية</span><span dir="ltr">{Math.round((o2PerDay / maxRate) * 100)}%</span></div>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden mt-1.5" dir="ltr"><motion.div animate={{ width: `${(o2PerDay / maxRate) * 100}%` }} className="h-full bg-gradient-to-r from-amber-400 via-lime-400 to-emerald-500 rounded-full" /></div>
            <p className="text-[11px] text-slate-400 font-semibold mt-2 leading-relaxed">نموذج تعليمي مبسّط لنبتة منزلية: الضوء هو العامل المحدّد غالباً، ورفع CO₂ ينفع حتى حدّ التشبع ثم يتوقف الأثر.</p>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ================= 16 · Jordan species encyclopedia ================= */
const JORDAN_SPECIES = [
  { ar: "المها العربي", lat: "Oryx leucoryx", icon: "🦌", col: "#b45309", habitat: "الصحاري والسهول الحصوية شرق الأردن وجنوبه", status: "معرّض للخطر (كان منقرضاً بالبرية)", where: "محمية الشومري ووادي رم", desc: "الظبي الصحراوي الأسطوري بقرنيه المستقيمين. انقرض من برية الأردن بالسبعينيات، ثم أعيد توطينه من الأسر فصار قصة نجاح عالمية." },
  { ar: "الوعل النوبي", lat: "Capra nubiana", icon: "🐐", col: "#78716c", habitat: "الجبال الوعرة والوديان الصخرية", status: "معرّض للخطر", where: "محمية ضانا والبتراء ووادي الموجب", desc: "متسلّق جبال خارق يقف على حواف بعرض سنتيمترات. قرنا الذكر مقوّسان ضخمان يحملان حلقات بعدد سنوات عمره تقريباً." },
  { ar: "الضبع المخطط", lat: "Hyaena hyaena", icon: "🐺", col: "#57534e", habitat: "الأودية والهضاب شبه الجافة بأنحاء الأردن", status: "قريب من التهديد", where: "واسع الانتشار، محمي بكل المحميات", desc: "منظف البيئة الليلي: فكّاه من أقوى فكوك الثدييات نسبة لحجمه فيسحق العظام. مظلوم بسمعته، فهو خجول وينفر من الإنسان." },
  { ar: "العقاب الذهبي", lat: "Aquila chrysaetos", icon: "🦅", col: "#92400e", habitat: "الجبال العالية والمنحدرات الصخرية", status: "غير مهدد عالمياً · نادر محلياً", where: "جبال ضانا والشوبك والبتراء", desc: "ملك سماء الجبال بجناحين يتجاوزان مترين. نظره أحدّ من نظر الإنسان بثماني مرات ويرصد أرنباً من كيلومترين." },
  { ar: "السوسن الأسود", lat: "Iris nigricans", icon: "🌺", col: "#581c87", habitat: "التلال الصخرية بمناطق البتراء وضانا والكرك", status: "نادر · الزهرة الوطنية للأردن", where: "ينمو برياً قرب البتراء وضانا", desc: "زهرة أردن الوطنية: بتلات بنفسجية شبه سوداء تلمع كالمخمل. لا تنمو طبيعياً إلا بالأردن وبقع صغيرة مجاورة، وقطفها يهدد بقاءها." },
  { ar: "القط الرملي", lat: "Felis margarita", icon: "🐱", col: "#ca8a04", habitat: "الكثبان والصحاري الرملية شرق الأردن", status: "قريب من التهديد", where: "بادية الأردن الشرقية ووادي رم", desc: "قط صحراوي صغير بفراء كثيف حتى باطن قدميه ليمشي على رمال ملتهبة. يعيش بلا ماء تقريباً ويصطاد ليلاً فقط." },
];
export const JordanSpecies = React.memo(function JordanSpecies({ act }) {
  const [sel, setSel] = useState(JORDAN_SPECIES[0]);
  const pick = (s) => {
    setSel(s);
    const n = act.seen("jordanSeen", s.ar);
    act.award(5, `jordan-${s.ar}`);
    if (n >= 3) act.awardBadge("jordan");
  };
  return (
    <section data-testid="bio-jordan" className={cardCls}>
      <SecHead icon="🦅" grad="from-amber-500 to-orange-600" title="موسوعة كائنات الأردن" sub="كنوز برّية تحميها محمياتنا · الشومري والأزرق وضانا ووادي رم" />
      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JORDAN_SPECIES.map((s) => (
          <button key={s.ar} onClick={() => pick(s)} className={`pressable shrink-0 w-32 rounded-3xl ring-1 p-3 text-center transition min-h-[104px] ${sel.ar === s.ar ? "text-white ft-shadow scale-[1.03]" : "bg-white ring-slate-200 text-slate-600"}`} style={sel.ar === s.ar ? { background: `linear-gradient(165deg, ${s.col}, ${s.col}aa)` } : {}}>
            <span className="text-3xl block">{s.icon}</span>
            <span className="text-[12px] font-black leading-tight block mt-1">{s.ar}</span>
            <span className="text-[9px] font-bold italic opacity-75 block" dir="ltr">{s.lat}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel.ar} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl ring-1 p-5" style={{ background: `linear-gradient(180deg, ${sel.col}12, #fff)`, borderColor: sel.col + "44" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-4xl">{sel.icon}</span>
            <div>
              <div className="font-head font-black text-slate-900 text-lg leading-tight">{sel.ar}</div>
              <div className="text-[11px] text-slate-400 font-bold italic" dir="ltr">{sel.lat}</div>
            </div>
            <span className="mr-auto text-[10.5px] font-black px-2.5 py-1 rounded-full text-white" style={{ background: sel.col }}>{sel.status}</span>
          </div>
          <p className="text-[13.5px] text-slate-700 leading-relaxed mt-3">{sel.desc}</p>
          <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
            <div className="rounded-2xl bg-white ring-1 ring-slate-100 px-3.5 py-2.5"><div className="text-[10.5px] font-black text-slate-400">الموئل</div><div className="text-[12.5px] font-bold text-slate-700">{sel.habitat}</div></div>
            <div className="rounded-2xl bg-white ring-1 ring-slate-100 px-3.5 py-2.5"><div className="text-[10.5px] font-black text-slate-400">أين يُحمى؟</div><div className="text-[12.5px] font-bold text-slate-700">{sel.where}</div></div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
});

/* ================= 13 · classify game ================= */
const CREATURES = [
  { ar: "الأسد", icon: "🦁", k: "الحيوانات" }, { ar: "فطر الغاريقون", icon: "🍄", k: "الفطريات" },
  { ar: "خميرة الخبز", icon: "🧁", k: "الفطريات" }, { ar: "بكتيريا القولون", icon: "🦠", k: "البكتيريا" },
  { ar: "الأميبا", icon: "🫧", k: "الطلائعيات" }, { ar: "البراميسيوم", icon: "👟", k: "الطلائعيات" },
  { ar: "شجرة الزيتون", icon: "🫒", k: "النباتات" }, { ar: "السرخس", icon: "🌿", k: "النباتات" },
  { ar: "العقاب الذهبي", icon: "🦅", k: "الحيوانات" }, { ar: "الطحلب الأخضر", icon: "🟢", k: "الطلائعيات" },
  { ar: "عفن الخبز الأسود", icon: "🍞", k: "الفطريات" }, { ar: "سمكة السردين", icon: "🐟", k: "الحيوانات" },
];
const KINGDOM_NAMES = ["البكتيريا", "الطلائعيات", "الفطريات", "النباتات", "الحيوانات"];
export const ClassifyGame = React.memo(function ClassifyGame({ act }) {
  const [order] = useState(() => [...CREATURES].sort(() => Math.random() - 0.5));
  const [selCard, setSelCard] = useState(null);
  const [placed, setPlaced] = useState({});
  const [wrong, setWrong] = useState(null);
  const done = Object.keys(placed).length;
  const correct = order.filter((c) => placed[c.ar] === c.k).length;
  const finish = () => { act.recordMax("classifyBest", correct); act.awardBadge("classify"); };
  const place = (kingdom) => {
    if (!selCard) return;
    if (selCard.k === kingdom) {
      setPlaced((p) => ({ ...p, [selCard.ar]: kingdom }));
      act.award(10, `cls-${selCard.ar}`);
      setSelCard(null); setWrong(null);
    } else {
      setWrong(kingdom);
      setTimeout(() => setWrong(null), 700);
    }
  };
  return (
    <section data-testid="bio-classify-game" className={cardCls}>
      <SecHead icon="🎮" grad="from-lime-500 to-green-600" title="لعبة: صنّف الكائن" sub="اختر بطاقة كائن ثم اضغط مملكته الصحيحة · 12 كائناً حياً" />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-lime-100 text-lime-800">صُنّف: {done} / 12</span>
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white">صح: {correct}</span>
        {selCard && <span className="text-[11.5px] font-black text-slate-500">اخترت: {selCard.icon} {selCard.ar} · أين يعيش تصنيفياً؟</span>}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {order.map((c) => {
          const isPlaced = placed[c.ar];
          return (
            <button key={c.ar} disabled={!!isPlaced} onClick={() => setSelCard(c)}
              className={`pressable rounded-3xl p-3 text-center ring-1 transition min-h-[92px] ${isPlaced ? "bg-emerald-50 ring-emerald-200 opacity-70" : selCard?.ar === c.ar ? "bg-lime-600 text-white ring-lime-400 scale-[1.04] ft-shadow" : "bg-white ring-slate-200 hover:ring-lime-300"}`}>
              <span className="text-3xl block">{c.icon}</span>
              <span className="text-[11.5px] font-black leading-tight block mt-1">{c.ar}</span>
              {isPlaced && <span className="text-[9.5px] font-black text-emerald-600 block">✓ {placed[c.ar]}</span>}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
        {KINGDOM_NAMES.map((k) => (
          <motion.button key={k} animate={wrong === k ? { x: [0, -7, 7, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}
            onClick={() => place(k)} className={`pressable rounded-2xl px-3 py-3.5 font-head font-black text-[13px] ring-1 transition min-h-[52px] ${wrong === k ? "bg-rose-500 text-white ring-rose-300" : "bg-gradient-to-b from-slate-800 to-slate-900 text-white ring-slate-700 hover:scale-[1.02]"}`}>
            مملكة {k}
          </motion.button>
        ))}
      </div>
      {done === 12 && (
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center rounded-3xl bg-gradient-to-b from-lime-50 to-white ring-1 ring-lime-200 p-5">
          <div className="text-4xl">🏆</div>
          <div className="font-head font-black text-xl text-slate-900 mt-1">أنهيت التصنيف كاملاً · {correct} إجابة صحيحة من أول محاولة</div>
          <button onClick={finish} className={gradBtn + " mt-3"}><Award className="w-4 h-4" /> استلم وسام بطل التصنيف</button>
          <p className="text-[11px] text-slate-400 font-bold mt-2">ملاحظة مدرسية: الطحالب الخضراء تُدرَّس غالباً مع الطلائعيات بهذا النموذج الخماسي، وبعض التصنيفات الحديثة تضعها مع النباتات.</p>
        </motion.div>
      )}
    </section>
  );
});

/* ================= 15 · organelle matching game ================= */
const ORG_PAIRS = [
  ["النواة", "التحكم بالخلية وتخزين DNA"], ["الميتوكوندريا", "إنتاج الطاقة ATP"], ["الريبوسومات", "بناء البروتينات"],
  ["جهاز غولجي", "تعديل البروتينات وتغليفها وشحنها"], ["الشبكة الإندوبلازمية", "تصنيع ونقل البروتينات والدهون"],
  ["الليسوسوم", "الهضم الخلوي وتنظيف الفضلات"], ["الغشاء الخلوي", "تنظيم ما يدخل الخلية ويخرج منها"], ["البلاستيدات الخضراء", "إجراء البناء الضوئي"],
];
export const OrganelleMatch = React.memo(function OrganelleMatch({ act }) {
  const [left] = useState(() => ORG_PAIRS.map((p) => p[0]).sort(() => Math.random() - 0.5));
  const [right] = useState(() => ORG_PAIRS.map((p) => p[1]).sort(() => Math.random() - 0.5));
  const [pick, setPick] = useState(null);
  const [matched, setMatched] = useState([]);
  const [miss, setMiss] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const doneAll = matched.length === ORG_PAIRS.length;
  useEffect(() => {
    if (!started || doneAll) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, doneAll]);
  useEffect(() => {
    if (doneAll) {
      act.award(80, "match-complete");
      act.awardBadge("match");
      if (!act.records.matchBest || seconds < act.records.matchBest) act.recordSet("matchBest", seconds);
    }
  }, [doneAll]); // eslint-disable-line
  const chooseRight = (fn) => {
    if (!pick || matched.includes(pick)) return;
    const pair = ORG_PAIRS.find((p) => p[0] === pick);
    if (pair && pair[1] === fn) { setMatched((m) => [...m, pick]); setPick(null); }
    else { setMiss((m) => [...m, fn]); setTimeout(() => setMiss((m) => m.filter((x) => x !== fn)), 600); }
  };
  return (
    <section data-testid="bio-organelle-game" className={cardCls}>
      <SecHead icon="⏱️" grad="from-sky-500 to-indigo-600" title="لعبة: مطابقة العضيّات" sub="صل كل عضيّة بوظيفتها · أسرع وقت يفوز" />
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full bg-sky-100 text-sky-800"><Timer className="w-3.5 h-3.5" /> <span dir="ltr">{seconds}s</span></span>
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">طابقت: {matched.length} / 8</span>
        {!started && <button onClick={() => setStarted(true)} className={chips(true)}>ابدأ المؤقّت</button>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          {left.map((o) => (
            <button key={o} disabled={matched.includes(o)} onClick={() => { setPick(o); setStarted(true); }}
              className={`pressable w-full rounded-2xl px-3 py-3 text-right font-black text-[12.5px] ring-1 transition min-h-[48px] ${matched.includes(o) ? "bg-emerald-500 text-white ring-emerald-300" : pick === o ? "bg-slate-900 text-white ring-slate-700 scale-[1.02]" : "bg-white ring-slate-200 hover:ring-sky-300 text-slate-700"}`}>{o} {matched.includes(o) ? "✓" : ""}</button>
          ))}
        </div>
        <div className="space-y-1.5">
          {right.map((f) => {
            const owner = ORG_PAIRS.find((p) => p[1] === f)[0];
            const isDone = matched.includes(owner);
            return (
              <motion.button key={f} animate={miss.includes(f) ? { x: [0, -6, 6, -4, 4, 0] } : {}} disabled={isDone} onClick={() => chooseRight(f)}
                className={`pressable w-full rounded-2xl px-3 py-3 text-right font-bold text-[12px] ring-1 transition min-h-[48px] ${isDone ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : miss.includes(f) ? "bg-rose-500 text-white ring-rose-300" : "bg-slate-50 ring-slate-200 hover:ring-sky-300 text-slate-600"}`}>{f}</motion.button>
            );
          })}
        </div>
      </div>
      {doneAll && (
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 text-center rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 p-5">
          <div className="text-4xl">⏱️🏆</div>
          <div className="font-head font-black text-xl text-slate-900 mt-1">طابقت العضيّات الثماني في <span dir="ltr">{seconds}</span> ثانية</div>
          <p className="text-[12px] text-slate-500 font-semibold">سُجّل وقتك في سجلّ المختبر · تحدَّ نفسك بجولة أسرع من صفحة جديدة</p>
        </motion.div>
      )}
    </section>
  );
});

/* ================= 12 · biology calculator ================= */
export const BioCalculator = React.memo(function BioCalculator() {
  const [mode, setMode] = useState("bmi");
  const MODES = [["bmi", "⚖️ مؤشر كتلة الجسم"], ["growth", "📈 النمو السكاني"], ["hw", "🧬 هاردي واينبرغ"], ["mag", "🔬 تكبير المجهر"], ["cal", "🔥 السعرات اليومية"]];
  return (
    <section data-testid="bio-calculator" className={cardCls}>
      <SecHead icon={<Calculator className="w-6 h-6" />} grad="from-teal-500 to-cyan-600" title="حاسبة الأحياء" sub="خمس حاسبات علمية · كل واحدة تريك خطوات الحل مرقّمة" />
      <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MODES.map(([id, ar]) => <button key={id} onClick={() => setMode(id)} data-testid={`bio-calc-${id}`} className={chips(mode === id) + " shrink-0"}>{ar}</button>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          {mode === "bmi" && <BmiCalc />}{mode === "growth" && <GrowthCalc />}{mode === "hw" && <HwCalc />}{mode === "mag" && <MagCalc />}{mode === "cal" && <CalCalc />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
});
const numIn = "w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 ring-1 ring-slate-200 font-black text-[15px] focus:outline-none focus:ring-lime-300 text-slate-800 min-h-[44px]";
function BmiCalc() {
  const [w, setW] = useState("60"), [h, setH] = useState("165");
  const bmi = (parseFloat(w) || 0) / Math.pow((parseFloat(h) || 1) / 100, 2);
  const cat = bmi < 18.5 ? ["نقص وزن", "#0284c7"] : bmi < 25 ? ["وزن طبيعي", "#16a34a"] : bmi < 30 ? ["زيادة وزن", "#d97706"] : ["سمنة", "#dc2626"];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-3">
        <label className="block"><span className="text-[12px] font-black text-slate-500">الوزن (كغ)</span><input type="number" value={w} onChange={(e) => setW(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">الطول (سم)</span><input type="number" value={h} onChange={(e) => setH(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <Steps steps={[`نحوّل الطول للمتر: ${h} ÷ 100 = ${fmt((parseFloat(h) || 0) / 100)} م`, `نربّع الطول: ${fmt(Math.pow((parseFloat(h) || 1) / 100, 2))} م²`, `المؤشر = الوزن ÷ مربع الطول = ${w || 0} ÷ ${fmt(Math.pow((parseFloat(h) || 1) / 100, 2))}`, "قارن نتيجتك بمقياس منظمة الصحة العالمية للبالغين"]} />
      </div>
      <div className="rounded-3xl bg-gradient-to-b from-lime-50 to-white ring-1 ring-lime-100 p-5 text-center self-start">
        <div className="text-[11px] font-black text-slate-400">مؤشر كتلة جسمك BMI</div>
        <div className="text-5xl font-black font-head text-slate-900" dir="ltr">{fmt(bmi, 1)}</div>
        <span className="inline-block mt-2 px-3.5 py-1.5 rounded-full text-white text-[12.5px] font-black" style={{ background: cat[1] }}>{cat[0]}</span>
        <div className="relative h-3 rounded-full mt-4 ring-1 ring-slate-200" dir="ltr" style={{ background: "linear-gradient(90deg,#38bdf8 0 18%,#4ade80 18% 50%,#facc15 50% 75%,#f87171 75% 100%)" }}>
          <span className="absolute -top-1.5 w-4 h-4 rounded-full bg-slate-900 ring-2 ring-white ft-shadow" style={{ left: `calc(${Math.min(97, Math.max(1, (bmi / 40) * 100))}% - 8px)` }} />
        </div>
        <p className="text-[11px] text-slate-400 font-semibold mt-3 leading-relaxed">للمراهقين تُستخدم منحنيات نمو خاصة بالعمر والجنس · هذا المقياس تقريبي توعوي</p>
      </div>
    </div>
  );
}
function GrowthCalc() {
  const [n0, setN0] = useState("100"), [rate, setRate] = useState("10"), [k, setK] = useState("1000"), [t, setT] = useState("10");
  const r = (parseFloat(rate) || 0) / 100, T = parseFloat(t) || 0, N0 = parseFloat(n0) || 0, K = parseFloat(k) || 1;
  const expN = N0 * Math.exp(r * T);
  const logN = K / (1 + ((K - N0) / Math.max(1, N0)) * Math.exp(-r * T));
  const pts = (fn) => Array.from({ length: 21 }, (_, i) => { const tt = (T * i) / 20; const v = fn(tt); return `${(i / 20) * 310 + 5},${130 - Math.min(125, (v / Math.max(expN, K)) * 125)}`; }).join(" ");
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 gap-3 content-start">
        {[["العدد الابتدائي", n0, setN0], ["معدل النمو % سنوياً", rate, setRate], ["السعة الاستيعابية K", k, setK], ["المدة (سنة)", t, setT]].map(([ar, v, set]) => (
          <label key={ar} className="block"><span className="text-[11.5px] font-black text-slate-500">{ar}</span><input type="number" value={v} onChange={(e) => set(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        ))}
        <div className="col-span-2"><Steps steps={[`النمو الأسي بلا حدود: N = ${N0} × e^(${fmt(r, 2)}×${T}) = ${fmt(expN, 0)} فرداً`, `النمو اللوجستي بسعة المكان: يقترب من K = ${K} ولا يتجاوزه لأن الغذاء والمكان محدودان`, `بعد ${T} سنوات: أسي ${fmt(expN, 0)} مقابل لوجستي ${fmt(logN, 0)}`]} /></div>
      </div>
      <div className="rounded-3xl bg-slate-900 p-4 self-start">
        <svg viewBox="0 0 320 140" className="w-full" dir="ltr">
          <line x1="5" y1="130" x2="315" y2="130" stroke="#334155" strokeWidth="2" /><line x1="5" y1="130" x2="5" y2="8" stroke="#334155" strokeWidth="2" />
          <line x1="5" y1={130 - Math.min(125, (K / Math.max(expN, K)) * 125)} x2="315" y2={130 - Math.min(125, (K / Math.max(expN, K)) * 125)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 4" />
          <polyline points={pts((tt) => N0 * Math.exp(r * tt))} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <polyline points={pts((tt) => K / (1 + ((K - N0) / Math.max(1, N0)) * Math.exp(-r * tt)))} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
        </svg>
        <div className="flex gap-4 text-[11px] font-black mt-1"><span className="text-sky-300">الأسي (بلا حدود)</span><span className="text-amber-300">اللوجستي (بسعة K)</span></div>
        <p className="text-[11px] text-slate-400 font-semibold mt-1.5 leading-relaxed">الأرانب بأستراليا نمت أسياً لغياب المفترسات · أما بالطبيعة المتوازنة فتفرض السعة الاستيعابية سقفها</p>
      </div>
    </div>
  );
}
function HwCalc() {
  const [q, setQ] = useState(0.3);
  const p = 1 - q;
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <label className="block"><span className="flex justify-between text-[12px] font-black text-slate-600"><span>تردد الأليل المتنحي q</span><span dir="ltr">{fmt(q)}</span></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value={q} onChange={(e) => setQ(+e.target.value)} className="w-full accent-pink-600" /></label>
        <Steps steps={[`تردد الأليل السائد p = 1 − q = ${fmt(p)}`, `نقي سائد p² = ${fmt(p * p)} · هجين 2pq = ${fmt(2 * p * q)} · متنحٍّ q² = ${fmt(q * q)}`, "بهذا تستطيع من نسبة المتنحين الظاهرين تقدير حاملي الصفة الخفيين بالسكان"]} />
      </div>
      <div className="space-y-2">
        {[["نقي سائد p²", p * p, "#16a34a"], ["هجين حامل 2pq", 2 * p * q, "#f59e0b"], ["متنحٍّ يظهر q²", q * q, "#e11d48"]].map(([ar, v, col]) => (
          <div key={ar} className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold text-slate-600 w-28 shrink-0">{ar}</span>
            <span className="flex-1 h-3.5 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><motion.span animate={{ width: `${v * 100}%` }} className="block h-full rounded-full" style={{ background: col }} /></span>
            <span className="text-[12px] font-black text-slate-700 w-14" dir="ltr">{fmt(v * 100, 1)}%</span>
          </div>
        ))}
        <p className="text-[11.5px] text-slate-400 font-semibold leading-relaxed">مبدأ هاردي واينبرغ يصف سكاناً بلا انتخاب ولا هجرة ولا طفرات · نقطة الصفر التي نقيس عليها التطور الحقيقي</p>
      </div>
    </div>
  );
}
function MagCalc() {
  const [obj, setObj] = useState(40), [obs, setObs] = useState("2");
  const total = obj * 10;
  const actualUm = ((parseFloat(obs) || 0) * 1000) / total;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-3">
        <label className="block"><span className="text-[12px] font-black text-slate-500">العدسة الشيئية</span>
          <div className="flex gap-1.5 mt-1" dir="ltr">{[4, 10, 40, 100].map((o) => <button key={o} onClick={() => setObj(o)} className={chips(obj === o) + " flex-1"}>{o}x</button>)}</div></label>
        <label className="block"><span className="text-[12px] font-black text-slate-500">الحجم كما نقيسه بالمسطرة (مم)</span><input type="number" value={obs} onChange={(e) => setObs(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>
        <Steps steps={[`التكبير الكلي = العينية 10x × الشيئية ${obj}x = ${total}x`, `الحجم الحقيقي = المقاس الظاهر ÷ التكبير = ${obs || 0} مم ÷ ${total}`, `= ${fmt(actualUm, 1)} ميكرومتراً تقريباً (المم = 1000 ميكرومتر)`]} />
      </div>
      <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 p-5 text-center self-start">
        <div className="text-[11px] font-black text-slate-400">التكبير الكلي</div>
        <div className="text-5xl font-black font-head text-slate-900" dir="ltr">{total}x</div>
        <div className="text-[12px] font-black text-sky-700 mt-2">الحجم الحقيقي ≈ <span dir="ltr">{fmt(actualUm, 1)} µm</span></div>
        <p className="text-[11px] text-slate-400 font-semibold mt-2 leading-relaxed">خلية خدّك قطرها نحو 60 ميكرومتراً · وشعرة رأسك سماكتها 70 تقريباً للمقارنة</p>
      </div>
    </div>
  );
}
function CalCalc() {
  const [sex, setSex] = useState("m"), [age, setAge] = useState("16"), [w, setW] = useState("60"), [h, setH] = useState("168"), [actL, setActL] = useState(1.55);
  const bmr = 10 * (parseFloat(w) || 0) + 6.25 * (parseFloat(h) || 0) - 5 * (parseFloat(age) || 0) + (sex === "m" ? 5 : -161);
  const tdee = bmr * actL;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex gap-1.5">
          {[["m", "ذكر"], ["f", "أنثى"]].map(([k, ar]) => <button key={k} onClick={() => setSex(k)} className={chips(sex === k) + " flex-1"}>{ar}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["العمر", age, setAge], ["الوزن كغ", w, setW], ["الطول سم", h, setH]].map(([ar, v, set]) => <label key={ar} className="block"><span className="text-[11px] font-black text-slate-500">{ar}</span><input type="number" value={v} onChange={(e) => set(e.target.value)} className={numIn + " mt-1"} dir="ltr" /></label>)}
        </div>
        <label className="block"><span className="text-[12px] font-black text-slate-500">مستوى النشاط</span>
          <select value={actL} onChange={(e) => setActL(+e.target.value)} className={numIn + " mt-1"}>
            <option value={1.2}>خامل (مكتب ومدرسة فقط)</option><option value={1.375}>خفيف (رياضة 1-3 أيام)</option><option value={1.55}>متوسط (رياضة 3-5 أيام)</option><option value={1.725}>عالٍ (رياضة يومية)</option>
          </select></label>
        <Steps steps={[`الأيض الأساسي BMR بمعادلة ميفلين = ${fmt(bmr, 0)} سعرة`, `نضرب بمعامل النشاط ${actL} لاحتياج يوم كامل`, "الناتج تقدير إرشادي · المراهقون النامون يحتاجون فعلياً أكثر قليلاً"]} />
      </div>
      <div className="rounded-3xl bg-gradient-to-b from-orange-50 to-white ring-1 ring-orange-100 p-5 text-center self-start">
        <div className="text-3xl">🔥</div>
        <div className="text-5xl font-black font-head text-slate-900" dir="ltr">{fmt(tdee, 0)}</div>
        <div className="text-[11px] font-black text-slate-400">سعرة حرارية يحتاجها يومك تقريباً</div>
        <div className="text-[12px] font-bold text-orange-700 mt-2">منها {fmt(bmr, 0)} يستهلكها جسمك بالراحة التامة فقط</div>
      </div>
    </div>
  );
}

/* ================= 19 · daily biology quiz ================= */
const QUIZ_POOL = [
  { q: "أي عضيّة تُلقَّب بمحطة طاقة الخلية؟", opts: ["النواة", "الميتوكوندريا", "جهاز غولجي", "الليسوسوم"], a: 1, why: "الميتوكوندريا تنتج ATP من حرق الغلوكوز بالأكسجين." },
  { q: "ما الوحدة البنائية للبروتينات؟", opts: ["الأحماض الدهنية", "النيوكليوتيدات", "الأحماض الأمينية", "الغلوكوز"], a: 2, why: "البروتين سلسلة أحماض أمينية، وعددها 20 نوعاً تبني كل بروتينات الكائنات." },
  { q: "ما نواتج البناء الضوئي؟", opts: ["ماء وCO₂", "غلوكوز وأكسجين", "ATP وحرارة فقط", "نشا وبروتين"], a: 1, why: "المعادلة: 6CO₂ + 6H₂O تصنع غلوكوزاً وتطلق 6O₂." },
  { q: "كم عدد الكروموسومات في خلية جسم الإنسان؟", opts: ["23", "44", "46", "48"], a: 2, why: "46 كروموسوماً في 23 زوجاً، نصفها من كل والد." },
  { q: "أين يحدث معظم امتصاص الغذاء المهضوم؟", opts: ["المعدة", "الأمعاء الغليظة", "الأمعاء الدقيقة", "الكبد"], a: 2, why: "زغابات الأمعاء الدقيقة تنقل الغذاء إلى الدم على مساحة هائلة." },
  { q: "كودون البدء الذي تبدأ به الترجمة دائماً؟", opts: ["UAA", "AUG", "UGA", "GGG"], a: 1, why: "AUG يشفّر الميثيونين ويعلن بدء بناء السلسلة." },
  { q: "أي مما يلي مثال على نباتات لا وعائية؟", opts: ["السرخس", "الحزازيات", "الصنوبر", "القمح"], a: 1, why: "الحزازيات بلا أنسجة ناقلة للماء فتبقى صغيرة رطبة." },
  { q: "كم حجرة في قلب الإنسان؟", opts: ["حجرتان", "3 حجرات", "4 حجرات", "5 حجرات"], a: 2, why: "أذينان وبطينان يفصلان الدم المؤكسج عن غير المؤكسج." },
  { q: "الوحدة الوظيفية في الكلية هي؟", opts: ["العصبون", "النفرون", "الحويصلة", "الزغابة"], a: 1, why: "نحو مليوني نفرون بالكليتين يرشّحان دمك ويكوّنان البول." },
  { q: "انتقال الماء عبر غشاء شبه منفذ يسمى؟", opts: ["الانتشار", "الأسموزية", "النقل النشط", "البلعمة"], a: 1, why: "الأسموزية حركة الماء نحو التركيز الأعلى من الأملاح." },
  { q: "إنزيم اللعاب الذي يبدأ هضم النشويات؟", opts: ["الببسين", "الليباز", "الأميليز", "التربسين"], a: 2, why: "أميليز اللعاب (التيالين) يكسر النشا من أول قضمة." },
  { q: "أصغر وحدة تصنيفية (أدق مستوى)؟", opts: ["الجنس", "النوع", "العائلة", "الرتبة"], a: 1, why: "النوع أدق مستوى، وأفراده تتزاوج وتنجب خصباً." },
  { q: "الغدة الملقبة بسيدة الغدد الصماء؟", opts: ["الدرقية", "النخامية", "الكظرية", "البنكرياس"], a: 1, why: "النخامية بحجم حبة بازلاء وتدير معظم الغدد الأخرى." },
  { q: "حجم دم الإنسان البالغ تقريباً؟", opts: ["لتران", "3 لترات", "5 لترات", "9 لترات"], a: 2, why: "نحو 5 لترات، أي 7 إلى 8% من وزن الجسم." },
  { q: "أي غاز يخرج بكمية أكبر مع الزفير مقارنة بالشهيق؟", opts: ["الأكسجين", "النيتروجين", "ثاني أكسيد الكربون", "الهيدروجين"], a: 2, why: "الزفير غني بـCO₂ القادم من تنفس الخلايا، وفقير بالأكسجين." },
];
export const DailyQuiz = React.memo(function DailyQuiz({ act, profile, setProfile }) {
  const today = todayStr();
  const seed = today.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const questions = useMemo(() => [...QUIZ_POOL].sort((a, b) => ((QUIZ_POOL.indexOf(a) * 7 + seed) % 13) - ((QUIZ_POOL.indexOf(b) * 7 + seed) % 13)).slice(0, 5), [seed]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [doneQ, setDoneQ] = useState(false);
  const already = profile.daily?.date === today && profile.daily?.done;
  const q = questions[idx];
  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.a) setScore((s) => s + 1);
  };
  const finish = () => {
    setDoneQ(true);
    const total = score + (picked === q.a ? 0 : 0);
    if (!already) {
      act.award(total * 10 + 20, `quiz-${today}`);
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = profile.records.quizLast === y ? (profile.records.quizStreak || 0) + 1 : 1;
      act.recordSet("quizStreak", streak);
      act.recordSet("quizLast", today);
      setProfile((p) => ({ ...p, daily: { date: today, done: true } }));
    }
    act.awardBadge("quiz");
  };
  const next = () => { if (idx === questions.length - 1) finish(); else { setIdx((i) => i + 1); setPicked(null); } };
  return (
    <section data-testid="bio-quiz" className={cardCls}>
      <SecHead icon="📅" grad="from-amber-500 to-orange-600" title="اختبار الأحياء اليومي" sub="خمسة أسئلة تتجدد كل يوم · حافظ على سلسلتك" />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">سلسلة أيام الاختبار: {profile.records.quizStreak || 0} 🔥</span>
        {already && <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white">أكملت اختبار اليوم ✓ عد غداً</span>}
        <span className="mr-auto text-[11px] font-black text-slate-400">السؤال {Math.min(idx + 1, questions.length)} / {questions.length}</span>
      </div>
      {!doneQ ? (
        <div>
          <h3 className="font-head font-black text-slate-900 text-lg leading-relaxed">{q.q}</h3>
          <div className="grid sm:grid-cols-2 gap-2 mt-3">
            {q.opts.map((o, i) => {
              const state = picked === null ? "" : i === q.a ? "bg-emerald-500 text-white ring-emerald-300" : i === picked ? "bg-rose-500 text-white ring-rose-300" : "bg-slate-50 ring-slate-200 opacity-50";
              return (
                <button key={o} onClick={() => choose(i)} className={`pressable rounded-2xl px-4 py-3.5 ring-1 font-black text-[13.5px] text-right transition min-h-[52px] ${state || "bg-white ring-slate-200 hover:ring-amber-300 text-slate-700"}`}>
                  {picked !== null && i === q.a ? "✓ " : picked === i ? "✗ " : ""}{o}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {picked !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-2xl px-4 py-3 ring-1 flex flex-wrap items-center gap-3 ${picked === q.a ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"}`}>
                <span className="text-[12.5px] font-bold text-slate-700 flex-1 leading-relaxed">{picked === q.a ? "🎉 صحيح! " : "الإجابة الصحيحة موضّحة بالأخضر · "}{q.why}</span>
                <button onClick={next} className="pressable px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-head font-black active:scale-95 min-h-[44px]">{idx === questions.length - 1 ? "إنهاء وحصد الخبرة" : "التالي"}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center rounded-3xl bg-gradient-to-b from-amber-50 to-white ring-1 ring-amber-100 p-6">
          <div className="text-5xl">{score >= 5 ? "🏆" : score >= 3 ? "🌟" : "🌱"}</div>
          <div className="font-head font-black text-2xl text-slate-900 mt-2">نتيجتك {score} من {questions.length}</div>
          <p className="text-[13px] text-slate-500 font-semibold mt-1">{already ? "جدّدت ذاكرتك اليوم · الخبرة تُحتسب مرة واحدة يومياً" : `حصدت ${score * 10 + 20} خبرة أحياء · عد غداً لأسئلة جديدة ولسلسلة أطول`}</p>
        </motion.div>
      )}
    </section>
  );
});
