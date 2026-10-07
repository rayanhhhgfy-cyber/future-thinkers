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
export const cardCls = "rounded-3xl bg-gradient-to-b from-white to-slate-50/70 ring-1 ring-slate-100 ft-shadow p-4 sm:p-6";
export const chips = (active) =>
  `pressable px-3.5 py-2.5 rounded-xl text-[12.5px] font-black transition min-h-[44px] inline-flex items-center justify-center gap-1.5 ${active ? "bg-slate-900 text-white ft-shadow scale-[1.03]" : "bg-white ring-1 ring-slate-200 text-slate-600 hover:bg-lime-50 hover:ring-lime-200"}`;
export const fmt = (x, d = 2) => (x == null || !isFinite(x) ? "·" : Number(x.toFixed(d)).toLocaleString("en-US"));
export const SecHead = React.memo(function SecHead({ icon, grad, title, sub }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <span className={`w-12 h-12 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-b ${grad} text-white ft-shadow ring-1 ring-white/40`}>
          {typeof icon === "string" ? <span className="text-2xl">{icon}</span> : icon}
        </span>
        <div className="min-w-0">
          <div className="font-head font-black text-slate-900 text-lg leading-tight">{title}</div>
          {sub && <div className="text-[11.5px] text-slate-400 font-bold leading-snug">{sub}</div>}
        </div>
        <span className={`hidden sm:block mr-auto h-8 w-24 rounded-full bg-gradient-to-l ${grad} opacity-15 blur-[1px]`} />
      </div>
      <div className={`h-1 rounded-full bg-gradient-to-l ${grad} opacity-60 mt-3`} />
    </div>
  );
});
export const Steps = React.memo(function Steps({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-1.5 mt-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-[12.5px] text-slate-600 leading-relaxed">
          <span className="w-5 h-5 shrink-0 grid place-items-center rounded-full bg-lime-100 text-lime-800 text-[10px] font-black mt-0.5">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
});
export const gradBtn = "pressable inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-l from-lime-500 to-green-600 text-white font-head font-black ft-shadow hover:scale-[1.02] active:scale-95 transition min-h-[44px]";

/* ================= perf helpers ================= */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(!!mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync); else if (mq.addListener) mq.addListener(sync);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", sync); else if (mq.removeListener) mq.removeListener(sync); };
  }, []);
  return reduced;
}
export function LazyMount({ children, minH = 320, icon = "🧪", grad = "from-lime-500 to-green-600", className = "" }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (on) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: "700px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  if (on) return className ? <div className={className}>{children}</div> : children;
  return (
    <div ref={ref} aria-hidden="true" style={{ minHeight: minH }} className={`${cardCls} ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-12 h-12 shrink-0 grid place-items-center rounded-2xl bg-gradient-to-b ${grad} text-white ring-1 ring-white/40 opacity-70`}><span className="text-2xl">{icon}</span></span>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 max-w-full rounded-full bg-slate-200/80" />
          <div className="h-2.5 w-56 max-w-full rounded-full bg-slate-100" />
        </div>
      </div>
      <div className={`space-y-2.5 ${reduced ? "" : "animate-pulse"}`}>
        <div className="h-3 rounded-full bg-slate-100" />
        <div className="h-3 rounded-full bg-slate-100 w-11/12" />
        <div className="h-3 rounded-full bg-slate-100 w-4/5" />
        <div className="h-3 rounded-full bg-slate-100 w-3/5" />
      </div>
    </div>
  );
}

/* ================= XP: ranks, badges, facts ================= */
export const RANKS = [
  { xp: 0, ar: "باحث أحياء مبتدئ", icon: "🌱" },
  { xp: 150, ar: "مستكشف الخلايا", icon: "🔬" },
  { xp: 350, ar: "عالِم طبيعة صاعد", icon: "🌿" },
  { xp: 600, ar: "خبير الوراثة", icon: "🧬" },
  { xp: 1000, ar: "حارس النُّظم البيئية", icon: "🦁" },
  { xp: 1700, ar: "أستاذ علوم الحياة", icon: "🎓" },
  { xp: 2600, ar: "أستاذ الأحياء", icon: "🏆" },
];
export const BADGES = [
  { id: "cell", icon: "🔬", ar: "مستكشف الخلية", desc: "اكتشف 5 عضيّات مختلفة بالمستكشف" },
  { id: "dna", icon: "🧬", ar: "قارئ الشيفرة", desc: "ترجم سلسلة DNA إلى بروتين" },
  { id: "mut", icon: "🧫", ar: "مهندس الطفرات", desc: "طبّق طفرة وراقب أثرها على البروتين" },
  { id: "mendel", icon: "🌸", ar: "وريث مندل", desc: "أكمل مربع بانيت واحسب النسب" },
  { id: "heart", icon: "❤️", ar: "نبض الحياة", desc: "شغّل محاكاة القلب في وضع الرياضة" },
  { id: "web", icon: "🕸️", ar: "ناسج الشبكات", desc: "ابنِ شبكة غذائية من 4 روابط صحيحة" },
  { id: "jordan", icon: "🦅", ar: "حارس محميات الأردن", desc: "تعرّف على 3 كائنات من كائنات الأردن" },
  { id: "classify", icon: "🎮", ar: "بطل التصنيف", desc: "أنهِ لعبة صنّف الكائن" },
  { id: "match", icon: "⏱️", ar: "خاطف العضيّات", desc: "أنهِ لعبة مطابقة العضيّات" },
  { id: "quiz", icon: "📅", ar: "نجم اختبار اليوم", desc: "أكمل اختبار الأحياء اليومي" },
];
export const FACTS = [
  "الميتوكوندريا في خلاياك كانت بكتيريا حرّة قبل نحو ملياري سنة، ثم سكنت الخلية الأولى وصارت محطة طاقتها إلى اليوم.",
  "جسم الإنسان ينتج نحو 25 مليون خلية جديدة كل ثانية، وخلايا جلدك تتجدد كاملة كل شهر تقريباً.",
  "لو فُرد الحمض النووي من خلية واحدة لامتدّ مترين، ومن جسمك كله لقطع المسافة إلى الشمس ذهاباً وإياباً عشرات المرات.",
  "قلبك ينبض نحو 100 ألف مرة يومياً ويضخ قرابة 7,500 لتر من الدم، ما يكفي لملء حمّام سباحة صغير كل يومين.",
  "أطول خلية في جسمك خلية عصبية تمتد من الحبل الشوكي إلى أصابع قدمك، وقد يصل طولها إلى متر كامل.",
  "نباتات الأرض تنتج سنوياً أكسجيناً يكفي البشرية كلها، وثلثه تقريباً يأتي من عوالق نباتية مجهرية في المحيطات.",
  "البكتيريا في أمعائك عددها يقارب عدد خلايا جسمك كلها، وتصنع لك فيتامينات وتدرب جهازك المناعي يومياً.",
  "سوسن الأردن الأسود زهرة نادرة لا تنمو طبيعياً إلا في الأردن ومناطق صغيرة حوله، واختيرت زهرة وطنية للبلاد.",
];
export function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem("ft-bio-xp") || "null");
    if (p && typeof p.xp === "number") return { badges: [], daily: { date: "", done: false }, records: {}, ...p };
  } catch { /* ignore */ }
  return { xp: 0, badges: [], daily: { date: "", done: false }, records: {} };
}
export const todayStr = () => new Date().toISOString().slice(0, 10);

/* ================= codon table (standard genetic code) ================= */
export const AA = {
  F: { ar: "فينيل ألانين", en: "Phe", codons: ["TTT", "TTC"] },
  L: { ar: "لوسين", en: "Leu", codons: ["TTA", "TTG", "CTT", "CTC", "CTA", "CTG"] },
  I: { ar: "آيزولوسين", en: "Ile", codons: ["ATT", "ATC", "ATA"] },
  M: { ar: "ميثيونين", en: "Met", codons: ["ATG"] },
  V: { ar: "فالين", en: "Val", codons: ["GTT", "GTC", "GTA", "GTG"] },
  S: { ar: "سيرين", en: "Ser", codons: ["TCT", "TCC", "TCA", "TCG", "AGT", "AGC"] },
  P: { ar: "برولين", en: "Pro", codons: ["CCT", "CCC", "CCA", "CCG"] },
  T: { ar: "ثريونين", en: "Thr", codons: ["ACT", "ACC", "ACA", "ACG"] },
  A: { ar: "ألانين", en: "Ala", codons: ["GCT", "GCC", "GCA", "GCG"] },
  Y: { ar: "تيروسين", en: "Tyr", codons: ["TAT", "TAC"] },
  H: { ar: "هستيدين", en: "His", codons: ["CAT", "CAC"] },
  Q: { ar: "غلوتامين", en: "Gln", codons: ["CAA", "CAG"] },
  N: { ar: "أسباراجين", en: "Asn", codons: ["AAT", "AAC"] },
  K: { ar: "لايسين", en: "Lys", codons: ["AAA", "AAG"] },
  D: { ar: "أسبارتات", en: "Asp", codons: ["GAT", "GAC"] },
  E: { ar: "غلوتامات", en: "Glu", codons: ["GAA", "GAG"] },
  C: { ar: "سيستين", en: "Cys", codons: ["TGT", "TGC"] },
  W: { ar: "تربتوفان", en: "Trp", codons: ["TGG"] },
  R: { ar: "أرجينين", en: "Arg", codons: ["CGT", "CGC", "CGA", "CGG", "AGA", "AGG"] },
  G: { ar: "غلايسين", en: "Gly", codons: ["GGT", "GGC", "GGA", "GGG"] },
};
export const CODON = {};
Object.entries(AA).forEach(([k, v]) => v.codons.forEach((c) => { CODON[c] = { aa: k, ar: v.ar, en: v.en }; }));
["TAA", "TAG", "TGA"].forEach((c) => { CODON[c] = { aa: "*", ar: "كودون إيقاف", en: "Stop" }; });
export const BASE_COMP = { A: "T", T: "A", C: "G", G: "C" };
export function cleanDna(s) { return (s || "").toUpperCase().replace(/[^ATGC]/g, "").slice(0, 60); }
export function translateDna(coding) {
  const out = [];
  for (let i = 0; i + 3 <= coding.length; i += 3) {
    const cod = coding.slice(i, i + 3);
    const hit = CODON[cod];
    if (!hit) continue;
    out.push({ codon: cod.replace(/T/g, "U"), aa: hit.aa, ar: hit.ar, en: hit.en, stop: hit.aa === "*" });
    if (hit.aa === "*") break;
  }
  return out;
}

/* ================= main page ================= */
