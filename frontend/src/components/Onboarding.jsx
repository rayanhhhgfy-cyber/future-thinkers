import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, BookOpen, Gamepad2, Users, Rocket, Swords, Trophy,
  Award, ChevronLeft, ChevronRight, X, Map, ArrowLeft,
} from "lucide-react";

/* الجولة التعريفية · first-visit guided tour of the whole platform.
   Shows once per user per device (localStorage), with Next / Back / Skip,
   a CTA into each section, and a final start button. Re-openable from
   Settings (the flag is cleared there before navigating to /dashboard). */

export const onboardingKey = (uid) => `ft_onboarding_v1_${uid || "anon"}`;

export function resetOnboarding(uid) {
  try { localStorage.removeItem(onboardingKey(uid)); } catch { /* private mode */ }
}

const STEPS = (uid) => [
  {
    icon: Sparkles, grad: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/40",
    title: "أهلاً بك في نادي مفكري المستقبل",
    body: "مجتمع طلاب الأردن للقراءة والابتكار: مكتبة كاملة، ألعاب ذهنية، أندية نقاش، مشاريع طلابية ومسابقات. هذه جولة سريعة بدقيقتين تعرّفك كل شيء.",
    chips: ["مكتبة", "ألعاب", "أندية", "مشاريع", "مسابقات"],
  },
  {
    icon: BookOpen, grad: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/40",
    title: "المكتبة وكتاب الأسبوع",
    body: "اقرأ كتباً كاملة داخل المنصة وتابع تقدمك صفحة صفحة، وقيّم وراجع ما قرأت. كل أسبوع يختار النادي كتاباً يظهر في لوحتك، ويمكنك أيضاً رفع كتاب من عندك ليقرأه زملاؤك.",
    chips: ["قراءة داخل المنصة", "كتاب الأسبوع", "ارفع كتاباً"],
    cta: { label: "تصفح المكتبة", to: "/library" },
  },
  {
    icon: Gamepad2, grad: "from-violet-500 to-fuchsia-600", shadow: "shadow-violet-500/40",
    title: "ساحة الألعاب والتحديات",
    body: "كلمة اليوم، سباق الحساب، سباق الكتابة، قصص تختار فيها المغامرة، وتحديات مباشرة ضد أصدقائك. كل لعبة تكسبك نقاط خبرة وأوسمة.",
    chips: ["كلمة اليوم", "سباقات", "قصص تفاعلية", "تحدي صديق"],
    cta: { label: "العب الآن", to: "/games" },
  },
  {
    icon: Users, grad: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/40",
    title: "الأندية والمجتمع والرسائل",
    body: "انضم إلى أندية الكتب واجلس في جلسات نقاش، شارك في ساحة المجتمع، وراسل زملاءك أو فريق المنصة في أي وقت.",
    chips: ["أندية كتب", "مجتمع", "رسائل"],
    cta: { label: "اكتشف الأندية", to: "/clubs" },
  },
  {
    icon: Rocket, grad: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/40",
    title: "المشاريع الطلابية",
    body: "اطرح فكرة مشروع حقيقي، كوّن فريقاً من مدارس مختلفة، ابنِ ونفّذ معاً، ونافس في تصنيف المشاريع الطلابية.",
    chips: ["فكرة", "فريق", "تنفيذ", "تصنيف"],
    cta: { label: "شاهد المشاريع", to: "/ventures" },
  },
  {
    icon: Swords, grad: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/40",
    title: "الشطرنج والمسابقات",
    body: "العب مباريات شطرنج مصنّفة ضد زملائك أو الروبوت، حل لغز اليوم، وشارك في المسابقات المباشرة وفعاليات النادي.",
    chips: ["تصنيف شطرنج", "لغز اليوم", "مسابقات مباشرة"],
    cta: { label: "جرّب لغز اليوم", to: "/chess/puzzle" },
  },
  {
    icon: Trophy, grad: "from-yellow-500 to-amber-600", shadow: "shadow-amber-500/40",
    title: "نقاطك وصدارتك وكأس المدارس",
    body: "كل نشاط يكسبك XP يرفع مستواك وترتيبك الوطني، ومدارس الأردن تتنافس كل موسم على الكأس. حافظ على سلسلة أيامك وأنجز مهام اليوم.",
    chips: ["XP ومستويات", "سلسلة الأيام", "كأس الموسم"],
    cta: { label: "شاهد الصدارة", to: "/leaderboard" },
  },
  {
    icon: Award, grad: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/40",
    title: "شهاداتك وملف إنجازك",
    body: "اربح شهادات موثقة برمز تحقق واجمع أوسمتك، وشارك ملف إنجازك مع معلميك أو صدّره ملف PDF أنيقاً لملفك المدرسي.",
    chips: ["شهادات موثقة", "أوسمة", "تصدير PDF"],
    cta: { label: "افتح ملف إنجازي", to: `/portfolio/${uid}` },
  },
];

export default function Onboarding({ user }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let seen = null;
    try { seen = localStorage.getItem(onboardingKey(user.id)); } catch { seen = "1"; }
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

  const done = () => {
    try { localStorage.setItem(onboardingKey(user?.id), "1"); } catch { /* ignore */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") done();
      if (e.key === "ArrowLeft") setStep((s) => Math.min(s + 1, STEPS(user?.id).length));
      if (e.key === "ArrowRight") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, user?.id]);

  if (!open || !user) return null;
  const steps = STEPS(user.id);
  const isFinal = step >= steps.length;
  const cur = isFinal ? null : steps[step];
  const Icon = cur?.icon || Map;

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/60 backdrop-blur-sm p-4" dir="rtl">
      <div role="dialog" aria-modal="true" aria-label="الجولة التعريفية"
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-fade-up">
        {/* top band */}
        <div className="relative overflow-hidden ft-hero-gradient grain px-6 pt-6 pb-16 text-white sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11px] font-black">
              <Map className="h-3.5 w-3.5" /> جولة تعريفية
            </span>
            <button onClick={done} data-testid="onboarding-skip-top" aria-label="تخطَّ الجولة"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/15 text-white transition hover:bg-white/20">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
          {/* progress segments */}
          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {[...steps, null].map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-amber-400" : "bg-white/20"}`} />
            ))}
          </div>
          <p className="mt-3 text-[11px] font-bold text-slate-300">
            {isFinal ? "الخطوة الأخيرة" : `الخطوة ${step + 1} من ${steps.length}`}
          </p>
        </div>

        {/* icon medallion overlapping the band */}
        <div className="relative px-6 sm:px-8">
          <span key={`icon-${step}`} className={`animate-fade-up -mt-10 grid h-20 w-20 place-items-center rounded-[1.4rem] bg-gradient-to-br ${cur ? cur.grad : "from-slate-800 to-slate-950"} text-white shadow-xl ${cur ? cur.shadow : "shadow-slate-900/40"} ring-4 ring-white`}>
            <Icon className="h-9 w-9" />
          </span>
        </div>

        {/* body */}
        <div key={`body-${step}`} className="animate-fade-up px-6 pb-2 pt-4 sm:px-8 min-h-[168px]">
          {isFinal ? (
            <>
              <h2 className="font-head text-2xl font-black text-slate-900">جاهز تبدأ؟</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                صرت تعرف طريقك في المنصة. ابدأ من لوحتك: سجّل حضور اليوم لتربح أول نقاطك، ثم اختر قسماً يعجبك وانطلق.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-head text-2xl font-black text-slate-900">{cur.title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{cur.body}</p>
              {cur.chips && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {cur.chips.map((c) => (
                    <span key={c} className="rounded-full ft-chip px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-white/60">{c}</span>
                  ))}
                </div>
              )}
              {cur.cta && (
                <Link to={cur.cta.to} onClick={done} data-testid="onboarding-cta"
                  className="pressable mt-4 inline-flex items-center gap-2 rounded-2xl ft-bg-soft ft-text-accent px-4 py-2.5 text-sm font-black ring-1 ft-ring-accent transition hover:-translate-y-0.5 min-h-[44px]">
                  {cur.cta.label} <ArrowLeft className="h-4 w-4" />
                </Link>
              )}
            </>
          )}
        </div>

        {/* controls */}
        <div className="flex items-center justify-between gap-3 px-6 pb-6 pt-3 sm:px-8">
          <button onClick={done} data-testid="onboarding-skip"
            className="rounded-2xl px-4 py-2.5 text-sm font-extrabold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 min-h-[44px]">
            تخطَّ
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} data-testid="onboarding-back"
                className="inline-flex items-center gap-1 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 min-h-[44px]">
                <ChevronRight className="h-4 w-4" /> السابق
              </button>
            )}
            {isFinal ? (
              <button onClick={done} data-testid="onboarding-finish"
                className="pressable inline-flex items-center gap-2 rounded-2xl ft-btn-primary px-6 py-2.5 font-head text-sm font-black text-white shadow-lg min-h-[44px]">
                <Sparkles className="h-4 w-4" /> ابدأ الرحلة
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} data-testid="onboarding-next"
                className="pressable inline-flex items-center gap-1.5 rounded-2xl ft-btn-primary px-6 py-2.5 font-head text-sm font-black text-white shadow-lg min-h-[44px]">
                التالي <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
