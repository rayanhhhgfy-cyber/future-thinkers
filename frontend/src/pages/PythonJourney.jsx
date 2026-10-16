import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Layout } from "@/components/Layout";
import {
  ChevronLeft, Trophy, Zap, Lock, Check, Play, Star, Flame,
  BookOpen, Target, Sparkles, Award, TrendingUp, Clock, ArrowLeft,
} from "lucide-react";

const BLUE = "#3776AB";
const BLUE_D = "#255a85";
const YELLOW = "#FFD43B";

/* Animated progress ring */
function ProgressRing({ pct, size = 120, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnim(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`url(#pyg)`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - anim / 100)}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }} />
        <defs>
          <linearGradient id="pyg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUE} />
            <stop offset="100%" stopColor={YELLOW} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-head text-2xl font-black text-slate-900" dir="ltr">{Math.round(pct)}%</div>
          <div className="text-[10px] font-bold text-slate-400">مكتمل</div>
        </div>
      </div>
    </div>
  );
}

/* Floating decorative python code chips */
function FloatChip({ children, className, delay }) {
  return (
    <span dir="ltr" className={`pointer-events-none absolute hidden select-none rounded-xl bg-white/80 px-3 py-1.5 font-mono text-[11px] font-bold text-slate-600 shadow-lg ring-1 ring-slate-200/60 backdrop-blur md:block ${className}`}
      style={{ animation: `pyfloat 7s ease-in-out ${delay}s infinite` }}>
      {children}
    </span>
  );
}

function HeroCard({ passed, total, xp }) {
  const pct = total ? Math.round((passed / total) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_25px_70px_-25px_rgba(55,118,171,0.35)] ring-1 ring-slate-100 sm:p-8 lg:p-10">
      {/* bg decorations */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl" style={{ background: BLUE }} />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
      <style>{`@keyframes pyfloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1.5deg)}}`}</style>
      <FloatChip className="left-[8%] top-[18%]" delay={0}>print("مرحباً")</FloatChip>
      <FloatChip className="bottom-[22%] left-[14%]" delay={1.6}>def learn():</FloatChip>
      <FloatChip className="right-[10%] top-[14%]" delay={2.8}>for i in range(∞):</FloatChip>
      <FloatChip className="bottom-[16%] right-[16%]" delay={4}>x = "بايثون 🐍"</FloatChip>

      <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:gap-10">
        {/* python emblem */}
        <div className="relative shrink-0">
          <div className="absolute -inset-3 rounded-[2rem] opacity-30 blur-2xl" style={{ background: `linear-gradient(135deg,${BLUE},${YELLOW})` }} />
          <div className="relative grid h-24 w-24 place-items-center rounded-[1.75rem] text-6xl shadow-xl ring-1 ring-white/40 sm:h-28 sm:w-28"
            style={{ background: `linear-gradient(135deg,${BLUE} 0%,${BLUE_D} 55%,#1d4e79 100%)` }}>
            🐍
            <span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full text-lg shadow-lg ring-4 ring-white" style={{ background: YELLOW }}>⚡</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center lg:text-right">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1.5 text-[11.5px] font-extrabold text-amber-700 ring-1 ring-amber-200">
            <Sparkles className="h-3.5 w-3.5" /> رحلة تعلّم تفاعلية
          </div>
          <h1 className="mt-3 font-head text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            بايثون <span style={{ color: BLUE }}>من الصفر</span> <span className="text-amber-500">حتى الاحتراف</span>
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-slate-500 sm:text-[15px] lg:mx-0">
            اقرأ المقال، افهم الكود الملّون، ثم اجتز امتحان المقال لتفتح المرحلة التالية.
            كل مرحلة تُبنى على ما قبلها — خطوة بخطوة نحو الاحتراف.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[12px] font-extrabold ring-1 ring-blue-100" style={{ color: BLUE_D }}>
              <Zap className="h-4 w-4 text-amber-500" /> +50 نقطة خبرة لكل مقال تجتازه
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-[12px] font-extrabold text-violet-700 ring-1 ring-violet-100">
              <Trophy className="h-4 w-4" /> شارات لكل إنجاز
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3">
          <ProgressRing pct={pct} />
          <div className="flex items-center gap-3 text-center">
            <div>
              <div className="font-head text-xl font-black text-slate-900" dir="ltr">{passed}/{total}</div>
              <div className="text-[10.5px] font-bold text-slate-400">مراحل منجزة</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="font-head text-xl font-black text-amber-500" dir="ltr">{xp}</div>
              <div className="text-[10.5px] font-bold text-slate-400">نقطة خبرة</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlacementCard({ max, onStart }) {
  const [n, setN] = useState(1);
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 sm:p-6">
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-15 blur-3xl" style={{ background: BLUE }} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid h-13 w-13 h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
          <Target className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-head text-[16px] font-extrabold text-slate-900">تعرف بايثون مسبقاً؟ تخطَّ ما تتقنه</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
            حدد عدد المقالات التي درستها، وسنولّد لك اختباراً شاملاً ذكياً يغطيها جميعاً.
            اجتزه وافتح المراحل التالية مباشرة.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[12.5px] font-bold text-slate-600">
            <span>درست أول</span>
            <select value={n} onChange={(e) => setN(Number(e.target.value))}
              className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-1.5 font-black outline-none focus:border-blue-300" dir="ltr">
              {Array.from({ length: Math.max(1, max) }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <span>مقالات</span>
          </div>
        </div>
        <button onClick={() => onStart(n)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-6 py-3.5 text-[14px] font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-95"
          style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
          <Play className="h-4 w-4" /> ابدأ الاختبار الشامل
        </button>
      </div>
    </div>
  );
}

function StageCard({ a, i, state, onOpen }) {
  const locked = state === "locked";
  const passed = state === "passed";
  return (
    <button onClick={onOpen} disabled={locked}
      className={`group relative w-full overflow-hidden rounded-[1.6rem] p-5 text-right transition-all duration-300 sm:p-6 ${
        locked ? "cursor-not-allowed bg-slate-50 ring-1 ring-slate-200/70"
        : passed ? "bg-white shadow-[0_14px_40px_-16px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100 hover:-translate-y-1 hover:shadow-[0_22px_55px_-16px_rgba(16,185,129,0.45)]"
        : "bg-white shadow-[0_18px_50px_-18px_rgba(55,118,171,0.4)] ring-2 hover:-translate-y-1.5 hover:shadow-[0_28px_65px_-18px_rgba(55,118,171,0.55)]"
      }`}
      style={!locked && !passed ? { ["--tw-ring-color"]: `${BLUE}55` } : undefined}>
      {/* top accent */}
      {!locked && (
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: passed ? "linear-gradient(90deg,#10b981,#34d399)" : `linear-gradient(90deg,${BLUE},${YELLOW})` }} />
      )}
      {state === "current" && (
        <span className="absolute left-4 top-4 inline-flex animate-pulse items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-black text-white shadow" style={{ background: BLUE }}>
          <Flame className="h-3 w-3" /> دورك الآن
        </span>
      )}
      <div className="flex items-start gap-4">
        <span className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-head text-lg font-black shadow-md sm:h-16 sm:w-16 sm:text-xl ${
          locked ? "bg-slate-200 text-slate-400"
          : passed ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
          : "text-white"
        }`} style={!locked && !passed ? { background: `linear-gradient(135deg,${BLUE},${BLUE_D})` } : undefined}>
          {locked ? <Lock className="h-6 w-6" /> : passed ? <Check className="h-7 w-7" strokeWidth={3} /> : i + 1}
          {!locked && !passed && <span className="absolute -left-1 -top-1 h-4 w-4 animate-ping rounded-full opacity-40" style={{ background: YELLOW }} />}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-[11px] font-extrabold tracking-wide text-slate-400">المرحلة {i + 1}</div>
          <div className={`mt-0.5 font-head text-[16.5px] font-extrabold leading-snug sm:text-[18px] ${locked ? "text-slate-400" : "text-slate-900"}`}>
            {a.title}
          </div>
          {a.summary && !locked && <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{a.summary}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {passed && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10.5px] font-extrabold text-emerald-600 ring-1 ring-emerald-100"><Check className="h-3 w-3" /> مُجتازة</span>}
            {(a.questions_count > 0) && !locked && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10.5px] font-extrabold text-amber-700 ring-1 ring-amber-100"><Star className="h-3 w-3" /> امتحان · {a.questions_count} أسئلة</span>}
            {locked && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-extrabold text-slate-400"><Lock className="h-3 w-3" /> تُفتح بعد اجتياز المرحلة السابقة</span>}
            {state === "current" && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10.5px] font-extrabold ring-1 ring-blue-100" style={{ color: BLUE_D }}><Play className="h-3 w-3" /> ابدأ التعلم</span>}
          </div>
        </div>
        {!locked && <ChevronLeft className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-slate-500" />}
      </div>
    </button>
  );
}

function JourneyInner({ embedded }) {
  const nav = useNavigate();
  const [arts, setArts] = useState(null);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    api.get("/python-learn/articles").then((r) => {
      const list = r.data?.articles || [];
      setArts(list);
      setXp(r.data?.xp || 0);
    }).catch(() => setArts([]));
  }, []);

  const passed = arts?.filter((a) => a.passed).length || 0;
  const firstOpen = useMemo(() => arts?.findIndex((a) => a.unlocked && !a.passed) ?? -1, [arts]);

  const openStage = (a, idx) => {
    if (!a.unlocked) return;
    nav(`/python/${a.slug}`);
  };

  const content = (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8" dir="rtl">
      {!embedded && (
        <Link to="/clubs/programming" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition hover:text-slate-800">
          <ArrowLeft className="h-4 w-4 rotate-180" /> نادي البرمجة
        </Link>
      )}

      <HeroCard passed={passed} total={arts?.length || 0} xp={xp} />

      {arts && arts.length > 1 && (
        <PlacementCard max={arts.length - 1} onStart={(n) => nav(`/python/placement?n=${n}`)} />
      )}

      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 font-head text-[17px] font-extrabold text-slate-900 sm:text-lg">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white shadow" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
              <BookOpen className="h-[18px] w-[18px]" />
            </span>
            مراحل الرحلة
          </div>
          <span className="text-[12px] font-bold text-slate-400" dir="ltr">{passed} / {arts?.length || 0}</span>
        </div>

        {arts === null ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[1.6rem] bg-slate-100" />)}
          </div>
        ) : arts.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-white/70 p-12 text-center">
            <div className="text-5xl">🐍</div>
            <div className="mt-3 font-head text-lg font-extrabold text-slate-800">الرحلة تُجهَّز الآن</div>
            <div className="mt-1 text-[13px] text-slate-500">سيضيف المشرفون المراحل قريباً — عد لاحقاً!</div>
          </div>
        ) : (
          <div className="relative">
            {/* connecting line */}
            <div className="pointer-events-none absolute bottom-8 right-[2.6rem] top-8 hidden w-0.5 rounded-full bg-gradient-to-b from-blue-200 via-amber-200 to-emerald-200 sm:block" />
            <div className="grid gap-3 sm:gap-3.5">
              {arts.map((a, i) => (
                <StageCard key={a.id} a={a} i={i}
                  state={!a.unlocked ? "locked" : a.passed ? "passed" : "current"}
                  onOpen={() => openStage(a, i)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {passed > 0 && (
        <div className="flex items-center gap-3 rounded-[1.6rem] bg-gradient-to-l from-amber-50 to-yellow-50/60 p-4 ring-1 ring-amber-100 sm:p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Award className="h-6 w-6" />
          </span>
          <div>
            <div className="font-head text-[14.5px] font-extrabold text-amber-900">أحسنت! واصل التقدم 🎉</div>
            <div className="text-[12.5px] text-amber-700">أنجزت {passed} {passed === 1 ? "مرحلة" : "مراحل"} — كل مرحلة جديدة تفتح لك آفاقاً أوسع في البرمجة.</div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return <Layout>{content}</Layout>;
}

export default function PythonJourney({ embedded = false }) {
  return <JourneyInner embedded={embedded} />;
}
