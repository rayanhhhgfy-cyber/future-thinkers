import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp, Float } from "@/components/anim";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import BookCover from "@/components/BookCover";
import { useAuth } from "@/context/AuthContext";
import * as Icons from "lucide-react";
import { BookOpen, Crown, MessagesSquare, Users, GraduationCap, Building2, Calendar, ArrowLeft, Sparkles, Target, Flag, Trophy, Rocket, Mic, Users2, ChevronDown, Flame, TrendingUp, UserPlus, Route, Quote } from "lucide-react";

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
        className="mt-3 inline-flex items-center gap-1.5 ft-text-accent text-sm font-bold transition-colors"
      >
        {expanded ? "عرض أقل" : "اقرأ المزيد"}
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

const AR_NUMS = ["٠١", "٠٢", "٠٣", "٠٤", "٠٥", "٠٦", "٠٧", "٠٨", "٠٩", "١٠", "١١", "١٢"];

// Numbered editorial section label (desktop only)
function SectionTag({ num, label, center = false, dark = false }) {
  return (
    <div className={`hidden lg:flex items-center gap-3 mb-10 ${center ? "justify-center" : ""}`} aria-hidden="true">
      <span className={`font-head text-sm font-extrabold ${dark ? "ft-text-accent-bright ft-on-hero" : "ft-text-accent"}`}>{num}</span>
      <span className={`h-px w-14 ${dark ? "bg-white/30" : "ft-grad-bar opacity-70"}`} />
      <span className={`text-sm font-bold ${dark ? "text-slate-300 ft-on-hero" : "text-slate-500"}`}>{label}</span>
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

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden ft-hero-gradient grain text-white">
        <div className="absolute top-20 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 w-[28rem] h-[28rem] rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 26%, transparent)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(to left, rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,.7) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-28 relative lg:min-h-[94vh] lg:flex lg:items-center">
          <div className="grid lg:grid-cols-12 gap-12 xl:gap-16 items-center w-full">
          <div className="max-w-3xl lg:max-w-none lg:col-span-7">
            <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm mb-6 ft-on-hero">
              <Sparkles className="w-4 h-4 ft-text-accent-bright" /> {cms?.hero_badge || "المنصة المعرفية الوطنية لطلاب الأردن"}
            </div>
            <div className="hidden lg:flex items-center gap-3 mb-6" aria-hidden="true">
              <span className="h-px w-16 ft-grad-bar" />
              <span className="text-xs font-extrabold tracking-wide text-slate-300 ft-on-hero">حيث يجتمع قرّاء الأردن ومفكروه</span>
            </div>
            <h1 className="animate-fade-up d-1 font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] ft-on-hero">
              {cms?.hero_title || "نقرأ أكثر، نفكّر أعمق،"}<br /><span className="relative inline-block"><span className="ft-hero-gradient-text animate-gradient-text">{cms?.hero_highlight || "ونصنع المستقبل."}</span><span className="hidden lg:block absolute -bottom-2 right-0 h-1.5 w-3/4 rounded-full ft-grad-bar opacity-80" aria-hidden="true" /></span>
            </h1>
            <p className="animate-fade-up d-2 mt-6 text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl ft-on-hero">
              {cms?.hero_subtitle || "بيئة معرفية وثقافية وعلمية تجمع طلاب المملكة الأردنية الهاشمية حول القراءة والحوار والشطرنج والبرمجة والابتكار والمنافسات في مجتمع طلابي واحد."}
            </p>
            <div className="animate-fade-up d-3 mt-8 lg:mt-10 flex flex-wrap gap-3">
              <Button data-testid="hero-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="pressable rounded-2xl ft-btn-solid h-12 px-7 text-base">
                {user ? "اذهب إلى لوحتي" : "انضم إلى مفكري المستقبل"} <ArrowLeft className="w-5 h-5 mr-1" />
              </Button>
              <Button data-testid="hero-library-btn" onClick={() => nav("/library")} size="lg" variant="outline" className="pressable rounded-2xl h-12 px-7 text-base bg-white/5 border-white/20 text-white hover:bg-white/10">
                تصفّح المكتبة
              </Button>
            </div>
            {/* desktop social proof row */}
            <div className="hidden lg:flex animate-fade-up d-3 mt-10 items-center gap-4">
              <div className="flex -space-x-3 space-x-reverse">
                {["أ", "ل", "ع", "س", "م"].map((ch, i) => (
                  <span key={i} className="w-11 h-11 rounded-full border-2 border-white/25 grid place-items-center text-sm font-bold text-white shadow-lg" style={{ background: ["#059669", "#2563EB", "#7C3AED", "#D97706", "#0D9488"][i] }}>{ch}</span>
                ))}
              </div>
              <div>
                <p className="text-sm text-slate-300">مجتمع طلابي نشط من مختلف مدارس المملكة ومديرياتها</p>
              </div>
            </div>
          </div>

          {/* desktop hero visual · platform mosaic collage */}
          <div className="hidden lg:block lg:col-span-5 relative h-[580px] xl:h-[600px]" aria-hidden="true">
            <div className="pointer-events-none absolute top-2 left-8 w-80 h-80 rounded-full border-2 border-dashed border-white/15" />
            <div className="pointer-events-none absolute bottom-28 -left-10 w-72 h-16 rotate-[24deg] rounded-full opacity-25" style={{ background: "linear-gradient(90deg, var(--ft-grad-a, #052e26), var(--ft-accent, #0d9488))" }} />
            <div className="pointer-events-none absolute top-44 right-2 w-36 h-20 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.55) 1.5px, transparent 1.6px)", backgroundSize: "14px 14px" }} />
            <div className="pointer-events-none absolute -inset-6 rounded-[3rem] blur-3xl opacity-60" style={{ background: "color-mix(in srgb, var(--ft-accent) 18%, transparent)" }} />

            {/* book card */}
            <div className="absolute top-0 right-0 w-60 rotate-[-4deg] rounded-3xl bg-white text-slate-800 shadow-2xl p-4 z-10">
              <div className="relative h-32 rounded-2xl overflow-hidden grid place-items-center" style={{ background: "linear-gradient(160deg,#059669,#065F46)" }}>
                <BookOpen className="w-14 h-14 text-white/90" />
                <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-white/20 border border-white/25 rounded-full px-2 py-0.5 text-white">رواية</span>
                <span className="absolute -bottom-4 -left-2 text-[92px] leading-none font-head font-extrabold text-white/10 select-none">ق</span>
              </div>
              <div className="mt-3 font-head font-bold">رحلتي مع القراءة</div>
              <div className="text-[11px] text-slate-500 mt-0.5">من مختارات نادي القراءة</div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full w-[72%] rounded-full ft-grad-bar" />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
                <span className="ft-text-accent">72٪ من الكتاب</span>
                <span className="inline-flex items-center gap-1 text-orange-500"><Flame className="w-3.5 h-3.5" /> سلسلة 21 يوماً</span>
              </div>
            </div>

            {/* chess card */}
            <div className="absolute top-[300px] lg:right-[105px] xl:right-[135px] w-52 rotate-[3deg] rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl p-4 text-white z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold"><Crown className="w-4 h-4 text-amber-300" /> مباراة مباشرة</span>
                <span className="relative flex w-2.5 h-2.5"><span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" /><span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-rose-400" /></span>
              </div>
              <div className="grid grid-cols-8 rounded-xl overflow-hidden border border-white/20">
                {Array.from({ length: 64 }).map((_, i) => {
                  const pieces = { 10: "♟", 18: "♞", 27: "♟", 36: "♞", 45: "♝", 54: "♜" };
                  const light = (Math.floor(i / 8) + i) % 2 === 0;
                  return (
                    <span key={i} className={`aspect-square grid place-items-center text-[13px] leading-none ${light ? "bg-[#EBECD0] text-slate-800" : "bg-[#779952] text-white"}`}>{pieces[i] || ""}</span>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-200">أنت × منافسك</span>
                <span className="rounded-full bg-white/15 border border-white/15 px-2 py-0.5">3 دقائق</span>
              </div>
            </div>

            {/* club card */}
            <div className="absolute top-24 left-0 w-56 rotate-[5deg] rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl p-4 text-white z-10">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-rose-500 grid place-items-center shrink-0 shadow-lg"><MessagesSquare className="w-5 h-5" /></span>
                <div>
                  <div className="text-sm font-extrabold font-head leading-tight">نادي الحوار</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">والمناظرات الفكرية</div>
                </div>
              </div>
              <div className="mt-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-200"><Users className="w-3.5 h-3.5" /> مجتمع طلابي نشط</span>
                <span className="text-[11px] font-extrabold rounded-full bg-white text-slate-800 px-2.5 py-1">انضم الآن</span>
              </div>
            </div>

            <Float className="absolute top-[248px] left-6 z-20">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 text-slate-800 shadow-2xl px-4 py-3 rotate-[-3deg]">
                <span className="w-9 h-9 rounded-xl bg-orange-100 grid place-items-center shrink-0"><TrendingUp className="w-5 h-5 text-orange-500" /></span>
                <div>
                  <div className="text-xs font-extrabold leading-tight">+340 نقطة خبرة</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">تقدّمك هذا الأسبوع</div>
                </div>
              </div>
            </Float>
          </div>
          </div>
        </div>
        {/* stats ribbon */}
        <div className="relative border-t border-white/10 bg-black/20">
          <Stagger className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {statItems.map((s) => (
              <Item key={s.label} className="text-center lg:rounded-2xl lg:bg-white/[0.06] lg:border lg:border-white/10 lg:backdrop-blur-sm lg:px-4 lg:py-6">
                <s.icon className="hidden lg:block w-6 h-6 mx-auto mb-2.5 ft-text-accent-bright" />
                <div className="text-2xl lg:text-3xl font-extrabold font-head text-white"><Counter value={s.value} /></div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* About Us */}
            {/* Book of the week */}
      {featured && (
        <section className="relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 lg:pt-20">
            <FadeUp>
              <div data-testid="landing-featured-book" className="relative overflow-hidden rounded-[2rem] ft-hero-gradient grain text-white p-6 sm:p-8 lg:p-10 shadow-[0_30px_60px_-25px_rgba(4,47,38,0.55)]">
                <div className="pointer-events-none absolute -top-20 right-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 28%, transparent)" }} />
                <div className="relative flex flex-col md:flex-row items-center gap-6 lg:gap-9">
                  <Link to={`/books/${featured.id}`} className="shrink-0">
                    <BookCover book={featured} className="w-32 lg:w-40 aspect-[3/4] rounded-2xl shadow-2xl ring-1 ring-white/30 rotate-[-2deg]" imgClassName="w-32 lg:w-40 aspect-[3/4] object-cover rounded-2xl" />
                  </Link>
                  <div className="min-w-0 flex-1 text-center md:text-start">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-slate-950 px-3.5 py-1.5 text-[11px] font-black shadow-lg shadow-amber-500/30">
                      <Sparkles className="w-3.5 h-3.5" /> كتاب الأسبوع في النادي
                    </span>
                    <h2 className="mt-3.5 font-head text-2xl lg:text-4xl font-black leading-snug">{featured.title}</h2>
                    <p className="mt-1.5 text-sm lg:text-base font-bold text-slate-300">{featured.author}</p>
                    {featured.description && <p className="mt-3 text-sm lg:text-[15px] leading-relaxed text-slate-300 line-clamp-3 max-w-2xl">{featured.description}</p>}
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
            </FadeUp>
          </div>
        </section>
      )}

<section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 bg-white">
        <FadeUp>
        <SectionTag num="٠١" label="من نحن" />
        <div className="lg:grid lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-6 lg:flex-col lg:items-start lg:mb-0">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl ft-bg-soft-2 grid place-items-center"><Users2 className="w-6 h-6 lg:w-8 lg:h-8 ft-text-accent" /></div>
              <h2 className="font-head text-3xl lg:text-4xl font-extrabold text-slate-900">من نحن</h2>
            </div>
            <figure className="hidden lg:block mt-12 border-r-4 pr-6" style={{ borderColor: "var(--ft-accent)" }}>
              <Quote className="w-7 h-7 ft-text-accent mb-3" />
              <blockquote className="font-head text-xl leading-relaxed text-slate-700 font-bold">{aboutText.split("\n\n")[0].slice(0, 117)}…</blockquote>
              <figcaption className="mt-3 text-sm text-slate-400 font-bold">من كلمة النادي</figcaption>
            </figure>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-3xl p-8 lg:p-12 border ft-border-accent text-slate-700 leading-relaxed text-base lg:text-lg font-body max-w-none lg:col-span-8">
            <ReadMore lines={3}>
              {aboutText.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-slate-600 leading-relaxed mb-4 last:mb-0">{paragraph}</p>
              ))}
            </ReadMore>
          </div>
        </div>
        </FadeUp>
      </section>

      {/* Vision / Mission / Goals */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <SectionTag num="٠٢" label="رؤيتنا ورسالتنا وأهدافنا" />
        <div className="space-y-6 lg:space-y-12 mb-14 lg:mb-16">
          <FadeUp>
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
            <div className="flex items-center gap-3 mb-4 lg:mb-0 lg:col-span-4 lg:flex-col lg:items-start lg:gap-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl ft-bg-soft grid place-items-center"><Flag className="w-6 h-6 lg:w-8 lg:h-8 ft-text-accent" /></div>
              <div>
                <h2 className="font-head text-2xl lg:text-4xl font-extrabold text-slate-900">رؤيتنا</h2>
                <p className="hidden lg:block mt-2 text-sm text-slate-400 font-bold">إلى أين نتجه خلال خمس سنوات؟</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 lg:p-10 ft-shadow border border-slate-100 lg:col-span-8">
              <ReadMore lines={3}><p className="text-slate-600 leading-relaxed lg:text-lg">{visionText}</p></ReadMore>
            </div>
          </div>
          </FadeUp>
          <FadeUp>
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
            <div className="flex items-center gap-3 mb-4 lg:mb-0 lg:col-span-4 lg:flex-col lg:items-start lg:gap-4 lg:order-2">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl ft-bg-soft grid place-items-center"><Target className="w-6 h-6 lg:w-8 lg:h-8 ft-text-accent" /></div>
              <div>
                <h2 className="font-head text-2xl lg:text-4xl font-extrabold text-slate-900">رسالتنا</h2>
                <p className="hidden lg:block mt-2 text-sm text-slate-400 font-bold">لماذا نوجد كل يوم؟</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 lg:p-10 ft-shadow border border-slate-100 lg:col-span-8 lg:order-1">
              <ReadMore lines={3}><p className="text-slate-600 leading-relaxed lg:text-lg">{missionText}</p></ReadMore>
            </div>
          </div>
          </FadeUp>
        </div>

        <FadeUp>
          <div className="flex items-end justify-between gap-4 mb-5">
            <h2 className="font-head text-2xl lg:text-3xl font-bold text-slate-900">أهدافنا</h2>
            <span className="hidden lg:block text-sm font-bold text-slate-400">{goalsList.length} أهداف نعمل عليها كل يوم</span>
          </div>
        </FadeUp>
        <Stagger className="grid sm:grid-cols-2 gap-4 lg:gap-x-14 lg:gap-y-0">
          {(goalsExpanded ? goalsList : goalsList.slice(0, 3)).map((g, i) => (
            <Item key={i} className="flex items-start gap-3 lg:gap-5 bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] lg:bg-transparent lg:border-0 lg:border-b lg:border-dashed lg:border-slate-200 lg:rounded-none lg:shadow-none lg:p-0 lg:py-6">
              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl ft-icon-tile grid place-items-center text-sm lg:text-base font-bold shrink-0">{AR_NUMS[i] || i + 1}</div>
              <p className="text-slate-700 text-sm lg:text-base leading-relaxed lg:pt-2.5">{g}</p>
            </Item>
          ))}
        </Stagger>
        {goalsList.length > 3 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setGoalsExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 ft-text-accent text-sm font-bold transition-colors bg-white border ft-border-accent rounded-2xl px-5 py-2.5 ft-shadow"
            >
              {goalsExpanded ? "عرض أقل" : `عرض جميع الأهداف (${goalsList.length})`}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${goalsExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </section>

      {/* How it works · desktop journey */}
      <section className="hidden lg:block max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <SectionTag num="٠٣" label="كيف تبدأ رحلتك؟" center />
        <FadeUp className="text-center">
          <h2 className="font-head text-4xl font-extrabold text-slate-900">ثلاث خطوات ويبدأ مشوارك</h2>
          <p className="mt-3 text-slate-500">من إنشاء الحساب إلى صدارة القوائم الوطنية في رحلة واحدة واضحة</p>
        </FadeUp>
        <div className="relative mt-16">
          <div className="absolute top-10 right-[17%] left-[17%] border-t-2 border-dashed" style={{ borderColor: "color-mix(in srgb, var(--ft-accent) 40%, transparent)" }} aria-hidden="true" />
          <Stagger className="grid grid-cols-3 gap-10 relative">
            {[
              { icon: UserPlus, title: "أنشئ حسابك وانضم", desc: "سجّل خلال دقيقة واحدة وفعّل حسابك لتصلك كل فعاليات النادي ومسابقاته." },
              { icon: Route, title: "اختر أنديتك ومساراتك", desc: "انضم إلى أندية القراءة والحوار والشطرنج والبرمجة، وابدأ مسار تعلم يناسب اهتماماتك." },
              { icon: Trophy, title: "اقرأ ونافس وتصدّر", desc: "اجمع نقاط الخبرة من القراءة والفعاليات والبطولات، واصعد قوائم الصدارة الوطنية." },
            ].map((s, i) => (
              <Item key={s.title} className="text-center">
                <div className="relative mx-auto w-20 h-20 rounded-full bg-white ft-shadow border ft-border-accent grid place-items-center">
                  <s.icon className="w-8 h-8 ft-text-accent" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full ft-icon-tile grid place-items-center text-[11px] font-extrabold">{AR_NUMS[i]}</span>
                </div>
                <h3 className="mt-6 font-head text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Activities / Projects */}
      {cms?.activities && cms.activities.length > 0 && (
        <section className="bg-white py-20 lg:py-28 border-y border-slate-100">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTag num="٠٤" label="نشاطاتنا ومشاريعنا" center />
            <div className="text-center mb-12">
              <h2 className="font-head text-3xl lg:text-4xl xl:text-[2.75rem] font-extrabold text-slate-900">نشاطاتنا وفعالياتنا ومشاريعنا</h2>
              <p className="mt-3 text-slate-500 max-w-2xl mx-auto">مبادرات نوعية تستهدف بناء الطالب المبدع والمفكر الناقد والريادي الواعي</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-fr gap-6">
              {cms.activities.map((activity, index) => {
                const Icon = Icons[activity.icon] || Icons.BookOpen;
                const featured = index === 0;
                const wide = index === 1;
                return (
                  <div key={index} className={`group relative bg-white rounded-3xl p-6 border border-slate-100 ft-shadow hover-lift ft-hover-border-accent transition-all duration-300 ${featured ? "lg:col-span-2 lg:row-span-2 lg:p-10" : ""} ${wide ? "lg:col-span-2" : ""}`}>
                    <span className="hidden lg:grid absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 place-items-center text-[11px] font-extrabold text-slate-400 font-head" aria-hidden="true">{AR_NUMS[index] || index + 1}</span>
                    <div className={`w-14 h-14 rounded-2xl grid place-items-center mb-5 text-white ${featured ? "lg:w-[4.5rem] lg:h-[4.5rem]" : ""}`} style={{ background: activity.color }}>
                      <Icon className={`w-7 h-7 ${featured ? "lg:w-9 lg:h-9" : ""}`} />
                    </div>
                    <h3 className={`font-head text-xl font-bold text-slate-900 mb-3 ${featured ? "lg:text-2xl" : ""}`}>{activity.title}</h3>
                    <p className={`text-slate-600 leading-relaxed text-sm ${featured ? "lg:text-base" : ""}`}>{activity.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Clubs showcase */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp className="text-center mb-12">
            <SectionTag num="٠٥" label="أنديتنا الطلابية" center />
            <h2 className="font-head text-3xl lg:text-4xl xl:text-[2.75rem] font-extrabold text-slate-900">اكتشف الأندية</h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">مساحات تفاعلية حقيقية للقراءة، الحوار، الشطرنج، البرمجة، العلوم، الابتكار والمزيد.</p>
            <p className="hidden lg:block mt-3 text-xs font-bold text-slate-400">مرّر أفقياً لاستكشاف جميع الأندية</p>
          </FadeUp>
          <Stagger className="grid sm:grid-cols-2 lg:flex lg:flex-nowrap lg:overflow-x-auto lg:snap-x lg:snap-mandatory lg:gap-5 lg:pb-6 lg:[scrollbar-width:thin]">
            {clubs.map((c) => {
              const Icon = CLUB_ICON(c.icon);
              return (
                <Item key={c.id} className="lg:snap-start lg:shrink-0 lg:w-[320px] xl:w-[340px]">
                <Link to={`/clubs/${c.slug}`} data-testid={`club-card-${c.slug}`} className="group bg-white hover:bg-slate-50 rounded-2xl p-6 border border-slate-100 hover-lift block h-full">
                  <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 text-white" style={{ background: c.color }}><Icon className="w-6 h-6" /></div>
                  <h3 className="font-head font-bold text-lg text-slate-900">{c.name}</h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
                  <div className="mt-4 ft-text-accent text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">ادخل النادي <ArrowLeft className="w-4 h-4" /></div>
                </Link>
                </Item>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1440px] lg:max-w-none mx-auto px-4 sm:px-6 lg:px-0 py-20 lg:py-0">
        <FadeUp>
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] lg:rounded-none p-10 lg:py-28 lg:px-8 text-center text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(to left, rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,.7) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
          <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 30%, transparent)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-80 h-80 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 18%, transparent)" }} />
          <div className="pointer-events-none absolute top-10 left-1/4 w-56 h-12 rotate-[24deg] rounded-full opacity-20 hidden lg:block" style={{ background: "linear-gradient(90deg, var(--ft-grad-a, #052e26), var(--ft-accent, #0d9488))" }} />
          <div className="relative max-w-3xl mx-auto">
          <Float className="inline-block relative"><Trophy className="w-14 h-14 lg:w-[4.5rem] lg:h-[4.5rem] ft-text-accent-bright ft-on-hero-icon mx-auto mb-5" /></Float>
          <h2 className="relative font-head text-3xl lg:text-5xl font-extrabold ft-on-hero">جاهز لتكون من مفكري المستقبل؟</h2>
          <p className="relative mt-4 text-slate-300 max-w-xl lg:max-w-2xl lg:text-lg mx-auto ft-on-hero">انضم إلى طلاب من مختلف مدارس المملكة في رحلة معرفية تنافسية، واجمع نقاط الخبرة، وتصدّر قوائم الصدارة الوطنية.</p>
          <Button data-testid="cta-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="pressable relative mt-8 rounded-2xl ft-btn-solid h-12 px-8 text-base">
            <Rocket className="w-5 h-5 ml-2" /> {user ? "لوحتي" : "ابدأ الآن مجاناً"}
          </Button>
          </div>
        </div>
        </FadeUp>
      </section>
    </Layout>
  );
}
