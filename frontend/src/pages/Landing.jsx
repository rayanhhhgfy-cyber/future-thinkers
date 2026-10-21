import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import BookCover from "@/components/BookCover";
import { useAuth } from "@/context/AuthContext";
import * as Icons from "lucide-react";
import { BookOpen, Crown, MessagesSquare, Users, GraduationCap, Building2, Calendar, ArrowLeft, Sparkles, Target, Flag, Trophy, Rocket, Mic, Users2, ChevronDown, Flame, TrendingUp, UserPlus, Route, Quote, EyeOff, ArrowDown } from "lucide-react";

const CLUB_ICON = (name) => Icons[name] || Icons.Circle;

const CLAMP_CLASSES = { 2: "line-clamp-2", 3: "line-clamp-3", 4: "line-clamp-4" };

// Collapsible "read more" wrapper: shows a preview, expands to full text on arrow tap.
// Nothing is excluded · all content stays, just collapsed by default.
function ReadMore({ children, lines = 3 }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className={expanded ? "" : (CLAMP_CLASSES[lines] || "line-clamp-3")}>{children}</div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1.5 text-[var(--ft-accent)] hover:text-[var(--ft-accent)] text-sm font-bold transition-colors"
      >
        {expanded ? "عرض أقل" : "اقرأ المزيد"}
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

const AR_NUMS = ["٠١", "٠٢", "٠٣", "٠٤", "٠٥", "٠٦", "٠٧", "٠٨", "٠٩", "١٠", "١١", "١٢"];

// Editorial section header · visible on every screen size
function SectionHead({ num, kicker, title, sub, center = false, dark = false }) {
  return (
    <Reveal className={`${center ? "text-center" : ""} mb-10 lg:mb-14`}>
      <div className={`inline-flex items-center gap-2.5 ${center ? "justify-center" : ""}`}>
        <span className="font-head text-sm font-black text-transparent bg-clip-text bg-gradient-to-l from-[var(--ft-accent)] to-[var(--ft-grad-b)]">{num}</span>
        <span className="h-[3px] w-10 rounded-full bg-gradient-to-l from-[var(--ft-accent)] to-transparent" />
        <span className={`text-xs font-extrabold tracking-wide ${dark ? "text-slate-400" : "text-slate-400"}`}>{kicker}</span>
      </div>
      <h2 className={`mt-4 font-head text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-black leading-[1.3] ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
      {sub && <p className={`mt-3 text-[15px] leading-relaxed max-w-2xl ${dark ? "text-slate-400" : "text-slate-500"} ${center ? "mx-auto" : ""}`}>{sub}</p>}
    </Reveal>
  );
}

// Infinite values marquee · fully contained, never overflows the page
const VALUES = ["القراءة", "الحوار", "الشطرنج", "البرمجة", "العلوم", "الابتكار", "المناظرات", "ريادة الأعمال", "الكتابة الإبداعية", "المنافسات"];
function Marquee() {
  const row = [...VALUES, ...VALUES];
  return (
    <div className="relative overflow-hidden bg-[var(--ft-grad-c)] py-3.5 sm:py-4" dir="ltr" aria-hidden="true">
      <style>{`@keyframes ft-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div className="flex w-max" style={{ animation: "ft-marquee 30s linear infinite" }}>
        {row.map((v, i) => (
          <span key={i} dir="rtl" className="flex items-center gap-3 px-5 sm:px-7 text-sm sm:text-[15px] font-extrabold text-white/85 whitespace-nowrap">
            <span className="text-amber-300 text-base leading-none">✦</span>{v}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--ft-grad-c)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[var(--ft-grad-c)] to-transparent" />
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [cms, setCms] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [goalsExpanded, setGoalsExpanded] = useState(false);

  useEffect(() => {
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
    api.get("/clubs").then((r) => setClubs(r.data)).catch(() => {});
    api.get("/landing/cms").then((r) => setCms(r.data)).catch(() => {});
    api.get("/site/featured-book").then((r) => setFeatured(r.data?.book || null)).catch(() => {});
  }, []);

  const statItems = stats ? [
    { label: "مفكرو المستقبل", value: stats.students, icon: Users },
    { label: "الكتب المعرفية", value: stats.books, icon: BookOpen },
    { label: "المدارس المشاركة", value: stats.schools, icon: GraduationCap },
    { label: "مديريات التربية", value: stats.directorates, icon: Building2 },
    { label: "الفعاليات", value: stats.events, icon: Calendar },
    { label: "مباريات الشطرنج", value: stats.chess_games, icon: Crown },
  ] : [];

  const aboutText = cms?.about || `نحن مجموعة ونخبة من طلبة المدارس المبدعين والرياديين والمفكرين نقدياً، والباحثين عن الخير والحقيقة والجمال لتطوير مجتمعنا ووطننا وأمتنا والإنسانية جمعاء.

وذلك من خلال التشبيك مع شباب المدارس الأخرى على مستوى مديرية قصبة إربد الأولى ومدارس المملكة الأردنية الهاشمية للقيام بنشاطات فكرية وثقافية تخدم رؤية وزارة التربية والتعليم، وتسعى لإنشاء جيلٍ منتمٍ لوطنه وقيادته، يسعى لخدمة وطنه ومجتمعه وأمته تربوياً وعلمياً وثقافياً وإنسانياً.

وذلك تحقيقاً لرؤى جلالة الملك عبدالله الثاني بن الحسين حفظه الله ورعاه، وولي عهده الأمين الأمير الحسين بن عبدالله الثاني وفقه الله.`;

  const visionText = cms?.vision || "يسعى نادي مفكري المستقبل لتكون المنصة الأولى محلياً على مستوى المملكة الأردنية الهاشمية وعربياً وعالمياً خلال الخمس سنوات القادمة، لتصبح جسراً ثقافياً وإنسانياً وثيقاً للتواصل والتعارف وتبادل الخبرات والتجارب الذاتية والتشبيك والدعم بين الطلبة، ونقل خبراتهم وثقافتهم لبعضهم البعض عبر الحوار والتواصل والفعاليات. ونسعى لتخريج مفكرين رياديين ومبدعين مميزين عربياً وعالمياً كسفراء لوطنهم الأردن، والمتابعة مع الطلبة من خلال منتدى ثقافي يجمعهم في الجامعات أيضاً ليبقوا سفراء للنادي وينقلوا تجربتهم لطلبة المدارس اللاحقين من بعدهم.";

  const missionText = cms?.mission || "تهدف رسالتنا في نادي مفكري المستقبل إلى بناء ثقافة جيلٍ كامل من الأجيال الصاعدة، متسلحة بالوعي والمعرفة والإيمان والمهارات الحياتية والناعمة والتفكير الناقد، بقيم وطنية أصيلة، وتطوير جميع الأدوات المهارية التي تصنع منه جيلاً مبدعاً ومتميزاً من خلال أنشطتنا ومنصتنا الرقمية.";

  const defaultGoals = [
    "تشبيك الطلبة بين بعضهم البعض وتعزيز مهارات الحوار والتواصل.",
    "تعزيز قيمة الكتاب والمعرفة والعلم في حياتهم.",
    "تطوير المهارات الداعمة والشخصية ليكونوا مستعدين لسوق العمل.",
    "تشبيك طرق التواصل من خلال التبادل الثقافي بين الدول والقارات ونقل التجربة العربية والأردنية للعالم.",
    "تأسيس مجموعة من المشاريع والأندية الريادية والمبادرات ضمن مظلة نادي مفكري المستقبل والعمل عليها بشكل دائم وفعال.",
    "تعزيز قيم الريادة والابتكار والإبداع والرقمنة والذكاء الاصطناعي من خلال منصة نادي مفكري المستقبل والموقع الإلكتروني.",
  ];
  const goalsList = (cms?.goals && cms.goals.length > 0) ? cms.goals : defaultGoals;

  const glassCards = [
    { icon: BookOpen, tone: "#059669", tag: "نادي القراءة", title: "رحلتي مع القراءة", foot: "72٪ من الكتاب", extra: <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-600"><Flame className="w-3.5 h-3.5" /> سلسلة 21 يوماً</span> },
    { icon: Crown, tone: "#7C3AED", tag: "مباراة مباشرة", title: "أنت × منافسك", foot: "شطرنج · 3 دقائق", extra: <span className="relative flex w-2.5 h-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" /><span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-rose-500" /></span> },
    { icon: MessagesSquare, tone: "#E11D48", tag: "نادي الحوار", title: "المناظرات الفكرية", foot: "مجتمع طلابي نشط", extra: <span className="text-[11px] font-extrabold rounded-full bg-slate-900 text-white px-2.5 py-1">انضم الآن</span> },
    { icon: TrendingUp, tone: "#D97706", tag: "نقاط الخبرة", title: "+340 نقطة", foot: "تقدّمك هذا الأسبوع", extra: <span className="text-[11px] font-extrabold text-slate-400">المستوى 12</span> },
  ];

  return (
    <Layout>
      {/* ══════════ HERO · emerald light ══════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg,color-mix(in_srgb,var(--ft-accent)_8%,white) 0%,#ffffff 55%,color-mix(in_srgb,var(--ft-accent)_6%,white) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 right-[5%] w-[30rem] h-[30rem] rounded-full blur-3xl opacity-60 animate-float" style={{ background: "radial-gradient(circle, color-mix(in_srgb,var(--ft-accent) 55%,transparent), transparent 65%)" }} />
        <div className="pointer-events-none absolute top-40 -left-32 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, color-mix(in_srgb,var(--ft-accent) 50%,transparent), transparent 65%)" }} />
        <div className="pointer-events-none absolute bottom-0 right-[30%] w-[24rem] h-[24rem] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(253,224,71,0.35), transparent 65%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-100" style={{ backgroundImage: "linear-gradient(color-mix(in_srgb,var(--ft-accent) 6%,transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in_srgb,var(--ft-accent) 6%,transparent) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 85% 65% at 50% 38%, black, transparent)", WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 38%, black, transparent)" }} />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 sm:pt-20 lg:pt-24 pb-10 lg:pb-14">
          <div className="anim-stagger text-center max-w-4xl mx-auto">
            <div style={{ "--i": 0 }} className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ft-accent)_30%,white)] bg-white/85 backdrop-blur px-4 py-2 text-[12px] sm:text-[13px] font-extrabold text-[var(--ft-accent)] shadow-[0_10px_30px_-14px_color-mix(in_srgb,var(--ft-accent) 50%,transparent)]">
              <Sparkles className="w-4 h-4 text-[var(--ft-accent)]" /> {cms?.hero_badge || "المنصة المعرفية الوطنية لطلاب الأردن"}
            </div>
            <h1 style={{ "--i": 1 }} className="mt-6 font-head font-black text-slate-900 text-[2.35rem] leading-[1.16] sm:text-6xl lg:text-[4.4rem] sm:leading-[1.14]">
              {cms?.hero_title || "نقرأ أكثر، نفكّر أعمق،"}<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(120deg,var(--ft-accent),var(--ft-grad-b) 55%,var(--ft-accent))" }}>{cms?.hero_highlight || "ونصنع المستقبل."}</span>
            </h1>
            <p style={{ "--i": 2 }} className="mt-6 text-[15px] sm:text-lg text-slate-600 leading-relaxed sm:leading-loose max-w-2xl mx-auto">
              {cms?.hero_subtitle || "بيئة معرفية وثقافية وعلمية تجمع طلاب المملكة الأردنية الهاشمية حول القراءة والحوار والشطرنج والبرمجة والابتكار والمنافسات في مجتمع طلابي واحد."}
            </p>
            <div style={{ "--i": 3 }} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button data-testid="hero-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg"
                className="pressable hover-glow rounded-2xl h-12 sm:h-[52px] px-7 sm:px-8 text-[15px] sm:text-base font-extrabold text-white border-0 shadow-[0_18px_45px_-12px_color-mix(in_srgb,var(--ft-accent) 65%,transparent)]"
                style={{ background: "linear-gradient(135deg,var(--ft-accent),var(--ft-grad-b))" }}>
                {user ? "اذهب إلى لوحتي" : "انضم إلى مفكري المستقبل"} <ArrowLeft className="w-5 h-5 mr-1" />
              </Button>
              <Button data-testid="hero-library-btn" onClick={() => nav("/library")} size="lg" variant="outline"
                className="pressable rounded-2xl h-12 sm:h-[52px] px-7 sm:px-8 text-[15px] sm:text-base font-extrabold bg-white border-slate-200 text-slate-800 hover:border-[color-mix(in_srgb,var(--ft-accent)_45%,white)] hover:text-[var(--ft-accent)] shadow-[0_14px_35px_-18px_rgba(15,23,42,0.4)]">
                تصفّح المكتبة
              </Button>
            </div>
          </div>

          {/* floating cards · white · snap row on every screen */}
          <div className="animate-fade-up d-3 mt-10 sm:mt-12 -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 sm:pb-2 lg:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {glassCards.map((g, i) => (
                <div key={i} className="snap-start shrink-0 w-[218px] sm:w-[248px] rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 text-right shadow-[0_26px_55px_-26px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl grid place-items-center text-white shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${g.tone}, ${g.tone}88)` }}>
                      <g.icon className="w-5 h-5" />
                    </span>
                    {g.extra}
                  </div>
                  <div className="mt-3 text-[11px] font-bold text-slate-400">{g.tag}</div>
                  <div className="mt-0.5 font-head font-extrabold text-slate-900 text-[15px] sm:text-base">{g.title}</div>
                  <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-bold">{g.foot}</div>
                </div>
              ))}
            </div>
          </div>

          {/* stats · light cards */}
          <div className="anim-stagger mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
            {statItems.map((s, si) => (
              <div key={s.label} style={{ "--i": si }} className="rounded-2xl sm:rounded-3xl border border-slate-100 bg-white px-3 py-4 sm:p-5 text-center shadow-[0_20px_45px_-26px_rgba(15,23,42,0.3)]">
                <span className="mx-auto mb-2 grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[color-mix(in_srgb,var(--ft-accent)_12%,white)] text-[var(--ft-accent)]"><s.icon className="w-5 h-5 sm:w-6 sm:h-6" /></span>
                <div className="font-head font-black text-slate-900 text-xl sm:text-2xl lg:text-[1.7rem]"><Counter value={s.value} /></div>
                <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-bold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center" aria-hidden="true">
            <span className="flex flex-col items-center gap-1.5 text-slate-400">
              <span className="text-[10px] font-bold tracking-widest">اكتشف المزيد</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </span>
          </div>
        </div>
      </section>


      <Marquee />

      {/* ══════════ كتاب الأسبوع ══════════ */}
      {featured && (
        <section className="relative overflow-hidden bg-white">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-16 lg:pt-20">
            <Reveal>
              <div data-testid="landing-featured-book" className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem] text-white p-6 sm:p-9 lg:p-12 shadow-[0_35px_70px_-28px_rgba(3,30,24,0.6)]" style={{ background: "linear-gradient(140deg,var(--ft-grad-c) 0%,var(--ft-grad-a) 55%,var(--ft-grad-b) 100%)" }}>
                <div className="pointer-events-none absolute -top-24 right-[12%] w-96 h-96 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, color-mix(in_srgb,var(--ft-accent) 55%,transparent), transparent 65%)" }} />
                <div className="pointer-events-none absolute -bottom-28 -left-16 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.4), transparent 65%)" }} />
                <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                <div className="relative flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                  <Link to={`/books/${featured.id}`} className="shrink-0 group">
                    <BookCover book={featured} className="w-32 lg:w-44 aspect-[3/4] rounded-2xl shadow-2xl ring-1 ring-white/30 rotate-[-3deg] transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105" imgClassName="w-32 lg:w-44 aspect-[3/4] object-cover rounded-2xl" />
                  </Link>
                  <div className="min-w-0 flex-1 text-center md:text-start">
                    <span className="inline-flex items-center gap-1.5 rounded-full text-slate-950 px-4 py-1.5 text-[11px] font-black shadow-lg" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 12px 30px -8px rgba(251,191,36,0.55)" }}>
                      <Sparkles className="w-3.5 h-3.5" /> كتاب الأسبوع في النادي
                    </span>
                    <h2 className="mt-4 font-head text-[1.65rem] lg:text-4xl font-black leading-snug">{featured.title}</h2>
                    <p className="mt-1.5 text-sm lg:text-base font-bold text-white/70">{featured.author}</p>
                    {featured.description && <p className="mt-3 text-sm lg:text-[15px] leading-relaxed text-slate-300 line-clamp-3 max-w-2xl mx-auto md:mx-0">{featured.description}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2">
                      {featured.pages > 0 && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">{featured.pages} صفحة</span>}
                      {featured.category && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">{featured.category}</span>}
                      {featured.rating_count > 0 && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">★ {Number(featured.rating_avg).toFixed(1)} · {featured.rating_count} تقييم</span>}
                    </div>
                  </div>
                  <Link to={`/books/${featured.id}`} className="pressable shrink-0 inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-6 py-3.5 text-sm font-black shadow-xl transition hover:-translate-y-0.5 min-h-[52px]">
                    <BookOpen className="w-5 h-5" /> ابدأ القراءة
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ══════════ من نحن ══════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute top-10 -left-24 w-72 h-72 rounded-full bg-[color-mix(in_srgb,var(--ft-accent)_15%,transparent)] blur-3xl" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-28 relative">
          <SectionHead num="٠١" kicker="من نحن" title="نخبةٌ تصنع الفرق" sub="تعرّف على الحكاية التي تجمعنا" />
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
            <Reveal className="lg:col-span-5">
              <div className="relative h-full overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] text-white p-7 sm:p-9 lg:p-10" style={{ background: "linear-gradient(150deg,var(--ft-grad-c) 0%,var(--ft-grad-a) 60%,var(--ft-grad-b) 100%)" }}>
                <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[color-mix(in_srgb,var(--ft-accent)_25%,transparent)] blur-3xl" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                <Quote className="relative w-9 h-9 text-[var(--ft-accent)] mb-4" />
                <blockquote className="relative font-head text-lg sm:text-xl lg:text-[1.35rem] leading-[1.9] font-bold text-white/90">
                  {aboutText.split("\n\n")[0].slice(0, 160)}…
                </blockquote>
                <div className="relative mt-6 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 grid place-items-center font-head font-black text-lg">م</span>
                  <div>
                    <div className="text-sm font-extrabold">مفكرو المستقبل</div>
                    <div className="text-[11px] text-white/60 font-bold">من كلمة النادي</div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-7">
              <div className="h-full rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 bg-gradient-to-bl from-slate-50/80 to-white p-7 sm:p-9 lg:p-11 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-12 h-12 rounded-2xl grid place-items-center text-white shadow-lg shrink-0" style={{ background: "linear-gradient(135deg,var(--ft-accent),var(--ft-grad-b))" }}>
                    <Users2 className="w-6 h-6" />
                  </span>
                  <h3 className="font-head text-xl sm:text-2xl font-black text-slate-900">من نحن؟</h3>
                </div>
                <div className="text-slate-600 leading-[1.95] text-[15px] sm:text-base">
                  <ReadMore lines={4}>
                    {aboutText.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                    ))}
                  </ReadMore>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════ الرؤية والرسالة ══════════ */}
      <section className="relative overflow-hidden bg-slate-50/70">
        <div className="pointer-events-none absolute -top-20 right-[15%] w-80 h-80 rounded-full bg-teal-100/70 blur-3xl" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-28 relative">
          <SectionHead num="٠٢" kicker="رؤيتنا ورسالتنا" title="إلى أين نتجه، ولماذا؟" />
          <div className="grid md:grid-cols-2 gap-5 lg:gap-8">
            <Reveal>
              <div className="group h-full relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-white border border-slate-100 p-7 sm:p-9 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.28)] transition-transform duration-500 hover:-translate-y-1.5">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "linear-gradient(90deg,var(--ft-accent),var(--ft-grad-b),var(--ft-accent))" }} />
                <div className="flex items-center gap-4">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] grid place-items-center text-white shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" style={{ background: "linear-gradient(135deg,var(--ft-accent),var(--ft-grad-b))", boxShadow: "0 16px 32px -12px color-mix(in_srgb,var(--ft-accent) 60%,transparent)" }}>
                    <Flag className="w-7 h-7 sm:w-8 sm:h-8" />
                  </span>
                  <div>
                    <h3 className="font-head text-2xl sm:text-[1.7rem] font-black text-slate-900">رؤيتنا</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">إلى أين نتجه خلال خمس سنوات؟</p>
                  </div>
                </div>
                <div className="mt-5 text-slate-600 leading-[1.95] text-[15px] sm:text-base">
                  <ReadMore lines={3}><p>{visionText}</p></ReadMore>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="group h-full relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] bg-white border border-slate-100 p-7 sm:p-9 shadow-[0_24px_55px_-30px_rgba(15,23,42,0.28)] transition-transform duration-500 hover:-translate-y-1.5">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1,#8b5cf6)" }} />
                <div className="flex items-center gap-4">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] grid place-items-center text-white shadow-xl shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" style={{ background: "linear-gradient(135deg,#0ea5e9,#4f46e5)", boxShadow: "0 16px 32px -12px rgba(14,165,233,0.6)" }}>
                    <Target className="w-7 h-7 sm:w-8 sm:h-8" />
                  </span>
                  <div>
                    <h3 className="font-head text-2xl sm:text-[1.7rem] font-black text-slate-900">رسالتنا</h3>
                    <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">لماذا نوجد كل يوم؟</p>
                  </div>
                </div>
                <div className="mt-5 text-slate-600 leading-[1.95] text-[15px] sm:text-base">
                  <ReadMore lines={3}><p>{missionText}</p></ReadMore>
                </div>
              </div>
            </Reveal>
          </div>

          {/* الأهداف · bento */}
          <div className="mt-14 lg:mt-20">
            <Reveal className="flex items-end justify-between gap-4 mb-6 lg:mb-8">
              <div>
                <h3 className="font-head text-2xl sm:text-3xl font-black text-slate-900">أهدافنا</h3>
                <p className="mt-1.5 text-sm text-slate-400 font-bold">{goalsList.length} أهداف نعمل عليها كل يوم</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--ft-accent)] bg-[color-mix(in_srgb,var(--ft-accent)_12%,white)] border border-[color-mix(in_srgb,var(--ft-accent)_20%,white)] rounded-full px-3.5 py-1.5"><Target className="w-3.5 h-3.5" /> خارطة الطريق</span>
            </Reveal>
            <div className="anim-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {(goalsExpanded ? goalsList : goalsList.slice(0, 3)).map((g, i) => (
                <div key={i} style={{ "--i": i }} className="group relative overflow-hidden rounded-[1.5rem] bg-white border border-slate-100 p-5 sm:p-6 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.25)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-24px_color-mix(in_srgb,var(--ft-accent) 35%,transparent)]">
                  <div className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full bg-[color-mix(in_srgb,var(--ft-accent)_12%,white)] blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex items-start gap-4">
                    <span className="font-head font-black text-[1.65rem] leading-none text-transparent bg-clip-text shrink-0" style={{ backgroundImage: "linear-gradient(135deg,var(--ft-accent),var(--ft-grad-b))" }}>{AR_NUMS[i] || i + 1}</span>
                    <p className="text-slate-700 text-sm sm:text-[15px] leading-[1.9] pt-0.5">{g}</p>
                  </div>
                </div>
              ))}
            </div>
            {goalsList.length > 3 && (
              <div className="text-center mt-7">
                <button
                  onClick={() => setGoalsExpanded((v) => !v)}
                  className="pressable inline-flex items-center gap-2 text-sm font-extrabold text-white rounded-2xl px-6 py-3 shadow-[0_16px_35px_-12px_color-mix(in_srgb,var(--ft-accent) 60%,transparent)] border-0"
                  style={{ background: "linear-gradient(135deg,var(--ft-accent),var(--ft-grad-b))" }}
                >
                  {goalsExpanded ? "عرض أقل" : `عرض جميع الأهداف (${goalsList.length})`}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${goalsExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ كيف تبدأ رحلتك ══════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-28">
          <SectionHead num="٠٣" kicker="كيف تبدأ رحلتك؟" title="ثلاث خطوات ويبدأ مشوارك" sub="من إنشاء الحساب إلى صدارة القوائم الوطنية في رحلة واحدة واضحة" center />
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute top-10 bottom-10 right-[2.45rem] sm:right-auto sm:top-10 sm:right-[16.6%] sm:left-[16.6%] sm:bottom-auto sm:border-t-2 border-r-2 sm:border-r-0 border-dashed" style={{ borderColor: "color-mix(in_srgb,var(--ft-accent) 40%,transparent)" }} aria-hidden="true" />
            <div className="anim-stagger grid sm:grid-cols-3 gap-8 sm:gap-6 relative">
              {[
                { icon: UserPlus, title: "أنشئ حسابك وانضم", desc: "سجّل خلال دقيقة واحدة وفعّل حسابك لتصلك كل فعاليات النادي ومسابقاته.", tone: "#10b981" },
                { icon: Route, title: "اختر أنديتك ومساراتك", desc: "انضم إلى أندية القراءة والحوار والشطرنج والبرمجة، وابدأ مسار تعلم يناسب اهتماماتك.", tone: "#0ea5e9" },
                { icon: Trophy, title: "اقرأ ونافس وتصدّر", desc: "اجمع نقاط الخبرة من القراءة والفعاليات والبطولات، واصعد قوائم الصدارة الوطنية.", tone: "#f59e0b" },
              ].map((s, i) => (
                <div key={s.title} style={{ "--i": i }} className="relative flex sm:flex-col sm:text-center sm:items-center gap-5 sm:gap-0">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-[1.6rem] bg-white grid place-items-center border border-slate-100 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)] relative z-10">
                      <s.icon className="w-8 h-8" style={{ color: s.tone }} />
                    </div>
                    <span className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full grid place-items-center text-[11px] font-black text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${s.tone}, ${s.tone}99)` }}>{AR_NUMS[i]}</span>
                  </div>
                  <div className="sm:mt-6 min-w-0">
                    <h3 className="font-head text-lg sm:text-xl font-black text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed sm:max-w-[16rem] sm:mx-auto">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ النشاطات ══════════ */}
      {cms?.activities && cms.activities.length > 0 && (
        <section className="relative overflow-hidden bg-slate-50/70 border-y border-slate-100">
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[color-mix(in_srgb,var(--ft-accent)_15%,transparent)] blur-3xl" />
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-28 relative">
            <SectionHead num="٠٤" kicker="نشاطاتنا ومشاريعنا" title="نشاطاتنا وفعالياتنا ومشاريعنا" sub="مبادرات نوعية تستهدف بناء الطالب المبدع والمفكر الناقد والريادي الواعي" center />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {cms.activities.map((activity, index) => {
                const Icon = Icons[activity.icon] || Icons.BookOpen;
                const featuredA = index === 0;
                const wide = index === 1;
                return (
                  <Reveal key={index} delay={Math.min(index, 5) * 0.05} className={featuredA ? "sm:col-span-2 sm:row-span-2" : wide ? "sm:col-span-2 lg:col-span-2" : ""}>
                    <div className={`group relative h-full overflow-hidden rounded-[1.6rem] bg-white border border-slate-100 p-6 sm:p-7 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.3)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_32px_60px_-28px_color-mix(in_srgb,var(--ft-accent) 40%,transparent)] ${featuredA ? "lg:p-10" : ""}`}>
                      <div className="pointer-events-none absolute -top-10 -left-10 w-36 h-36 rounded-full blur-3xl opacity-25 transition-opacity duration-500 group-hover:opacity-50" style={{ background: activity.color }} />
                      <span className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 grid place-items-center text-[11px] font-black text-slate-400 font-head" aria-hidden="true">{AR_NUMS[index] || index + 1}</span>
                      <div className={`relative w-14 h-14 rounded-2xl grid place-items-center mb-5 text-white shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${featuredA ? "lg:w-[4.5rem] lg:h-[4.5rem]" : ""}`} style={{ background: activity.color, boxShadow: `0 16px 32px -12px ${activity.color}90` }}>
                        <Icon className={`w-7 h-7 ${featuredA ? "lg:w-9 lg:h-9" : ""}`} />
                      </div>
                      <h3 className={`relative font-head font-black text-slate-900 mb-2.5 ${featuredA ? "text-xl lg:text-2xl" : "text-lg"}`}>{activity.title}</h3>
                      <p className={`relative text-slate-500 leading-[1.9] ${featuredA ? "text-[15px] lg:text-base" : "text-sm"}`}>{activity.description}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ الأندية ══════════ */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20 lg:py-28">
          <SectionHead num="٠٥" kicker="أنديتنا الطلابية" title="اكتشف الأندية" sub="مساحات تفاعلية حقيقية للقراءة، الحوار، الشطرنج، البرمجة، العلوم، الابتكار والمزيد." center />
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="anim-stagger flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 [scrollbar-width:thin] lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:overflow-visible">
              {clubs.map((c, ci) => {
                const Icon = CLUB_ICON(c.icon);
                return (
                  <div key={c.id} style={{ "--i": ci }} className="snap-start shrink-0 w-[272px] sm:w-[300px] lg:w-auto">
                    <Link to={`/clubs/${c.slug}`} data-testid={`club-card-${c.slug}`}
                      className="group relative flex flex-col h-full overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.35)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_36px_65px_-28px_rgba(15,23,42,0.45)]">
                      <div className="relative h-28 sm:h-32 overflow-hidden shrink-0" style={{ background: `linear-gradient(130deg, ${c.color}, ${c.color}99)` }}>
                        <div className="absolute inset-0 opacity-[0.14] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.95) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                        <Icon className="absolute -left-6 -bottom-9 w-36 h-36 text-white/15 -rotate-12 pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                        {c.is_hidden && (
                          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-slate-900/70 backdrop-blur px-2.5 py-1 rounded-full shadow"><EyeOff className="w-3 h-3" /> مخفي</span>
                        )}
                        <span className="absolute bottom-3 right-3.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-white/95"><Users className="w-3.5 h-3.5" />{c.members_count || 0} عضو</span>
                      </div>
                      <div className="relative flex-1 p-5 pt-0">
                        <div className="relative z-10 -mt-9 mb-3.5 w-16 h-16 rounded-[1.3rem] grid place-items-center text-white shrink-0 ring-4 ring-white transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`, boxShadow: `0 14px 28px -10px ${c.color}90` }}>
                          <Icon className="w-8 h-8 drop-shadow" />
                        </div>
                        <h3 className="font-head font-black text-[1.05rem] text-slate-900 leading-snug">{c.name}</h3>
                        <p className="mt-1.5 text-[13px] text-slate-500 line-clamp-2 leading-relaxed min-h-[2.6rem]">{c.description}</p>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[13px] font-black inline-flex items-center gap-1.5 transition-all duration-300 group-hover:gap-2.5" style={{ color: c.color }}>ادخل النادي <ArrowLeft className="w-4 h-4" /></span>
                          <Mic className="w-4 h-4 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          <Reveal className="text-center mt-8">
            <Link to="/clubs" className="pressable inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-7 py-3.5 text-sm font-black text-slate-800 transition-all hover:border-[color-mix(in_srgb,var(--ft-accent)_60%,white)] hover:text-[var(--ft-accent)] hover:-translate-y-0.5">
              عرض جميع الأندية <ArrowLeft className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,var(--ft-accent) 0%,var(--ft-grad-b) 55%,var(--ft-grad-a) 100%)" }}>
        <div className="pointer-events-none absolute -top-32 left-[10%] w-[30rem] h-[30rem] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 65%)" }} />
        <div className="pointer-events-none absolute -bottom-40 right-[5%] w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, rgba(253,224,71,0.4), transparent 65%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 lg:py-28 text-center text-white">
          <Reveal>
            <span className="inline-block animate-float">
              <span className="mx-auto mb-6 grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] bg-white text-[var(--ft-accent)] shadow-[0_25px_50px_-15px_rgba(0,0,0,0.4)]">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
              </span>
            </span>
            <h2 className="font-head font-black text-[1.9rem] sm:text-4xl lg:text-[3.2rem] leading-[1.25]">جاهز لتكون من <span className="text-amber-200">مفكري المستقبل؟</span></h2>
            <p className="mt-4 text-white/95 max-w-xl lg:max-w-2xl mx-auto text-[15px] sm:text-base lg:text-lg leading-relaxed font-medium">انضم إلى طلاب من مختلف مدارس المملكة في رحلة معرفية تنافسية، واجمع نقاط الخبرة، وتصدّر قوائم الصدارة الوطنية.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button data-testid="cta-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg"
                className="pressable hover-glow rounded-2xl h-[52px] sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-black text-[var(--ft-grad-a)] bg-white border-0 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] hover:bg-[color-mix(in_srgb,var(--ft-accent)_12%,white)]">
                <Rocket className="w-5 h-5 ml-2" /> {user ? "لوحتي" : "ابدأ الآن مجاناً"}
              </Button>
              <Button onClick={() => nav("/clubs")} size="lg" variant="outline"
                className="pressable rounded-2xl h-[52px] sm:h-14 px-8 text-base font-extrabold bg-white/15 border-white/40 text-white hover:bg-white/25 backdrop-blur">
                استكشف الأندية
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-[13px] font-bold text-white/90">
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> مجتمع طلابي وطني</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> مكتبة رقمية غنية</span>
              <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4" /> منافسات وجوائز</span>
            </div>
          </Reveal>
        </div>
      </section>
    </Layout>
  );
}
