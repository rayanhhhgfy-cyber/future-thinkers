import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import ReportProblem from "@/components/ReportProblem";

const COLS = [
  { title: "استكشف", links: [
    { to: "/library", l: "المكتبة الرقمية" },
    { to: "/studio", l: "الاستوديو" },
    { to: "/clubs", l: "الأندية الطلابية" },
    { to: "/ventures", l: "مساحة المشاريع" },
    { to: "/events", l: "الفعاليات" },
    { to: "/competitions", l: "المسابقات" },
  ]},
  { title: "المجتمع", links: [
    { to: "/leaderboard", l: "قوائم الصدارة" },
    { to: "/community", l: "ساحة المجتمع" },
    { to: "/clubs/dialogue", l: "نادي الحوار" },
    { to: "/clubs/chess", l: "نادي الشطرنج" },
    { to: "/news", l: "الأخبار" },
    { to: "/calendar", l: "التقويم" },
    { to: "/certificates-wall", l: "جدار الشهادات" },
  ]},
  { title: "طوّر نفسك", links: [
    { to: "/paths", l: "مسارات التعلم" },
    { to: "/reading-challenges", l: "تحديات القراءة" },
    { to: "/focus", l: "غرف التركيز" },
    { to: "/chess/puzzle", l: "لغز اليوم" },
    { to: "/points", l: "نقاطي وإنجازاتي" },
    { to: "/stats", l: "إحصائياتي" },
  ]},
];

export function Footer() {
  return (
    <footer className="ft-navy-gradient text-slate-300 mt-20 relative grain overflow-hidden">
      <LogoMark className="pointer-events-none absolute -left-10 -bottom-12 w-64 h-64 opacity-[0.07] -rotate-12" />
      <div className="pointer-events-none absolute -top-24 right-[20%] w-72 h-72 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_14%,transparent)] blur-3xl" />
      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-20 grid gap-10 md:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Logo dark />
          <p className="mt-5 text-sm text-slate-400 leading-loose max-w-sm">منصة معرفية وطنية أردنية تجمع القراءة والحوار والعلم والإبداع في مجتمع طلابي واحد.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[11px] font-bold">قصبة إربد الأولى</span>
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[11px] font-bold">طلاب الأردن</span>
            <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[11px] font-bold">قراءة · حوار · إبداع</span>
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="text-white font-head font-extrabold mb-4 flex items-center gap-2">
              {c.title}
              <span className="h-px flex-1 bg-gradient-to-l from-[color:color-mix(in_srgb,var(--ft-accent)_45%,transparent)] to-transparent" />
            </h4>
            <ul className="space-y-2.5 text-sm">
              {c.links.map((x) => (
                <li key={x.to}>
                  <Link to={x.to} className="text-slate-400 hover:text-white hover:pr-1 transition-all">{x.l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="text-white font-head font-extrabold mb-4 flex items-center gap-2">
            المملكة الأردنية الهاشمية
            <span className="h-px flex-1 bg-gradient-to-l from-[color:color-mix(in_srgb,var(--ft-accent)_45%,transparent)] to-transparent" />
          </h4>
          <p className="text-sm text-slate-400 leading-loose">منصة موجهة لجميع طلاب الأردن في مختلف المحافظات ومديريات التربية والتعليم.</p>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <nav aria-label="السياسات والقوانين" className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-xs font-bold">
          <Link to="/privacy" className="text-slate-300 hover:text-white transition-colors">سياسة الخصوصية</Link>
          <Link to="/terms" className="text-slate-300 hover:text-white transition-colors">الشروط والأحكام</Link>
          <Link to="/cookies" className="text-slate-300 hover:text-white transition-colors">سياسة ملفات الارتباط</Link>
        </nav>
      </div>
      <div className="relative border-t border-white/10 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[color:color-mix(in_srgb,var(--ft-accent)_65%,transparent)] to-transparent" />
        <div className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-[36rem] h-40 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_10%,transparent)] blur-3xl" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex flex-col items-center gap-4 sm:gap-5 text-center">
          <div data-testid="footer-made-by" className="flex flex-col items-center gap-3 sm:gap-3.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              Made with love by
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              {["ريان الجمل", "أوس التميمي", "طه عبابنه", "يمان عبابنة"].map((n) => (
                <span key={n} className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/15 px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:bg-white/[0.14] hover:border-white/30 hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--ft-accent)] shadow-[0_0_8px_2px_color-mix(in_srgb,var(--ft-accent)_60%,transparent)]" />
                  {n}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-400">صُنعت بشغف لطلاب الأردن <span className="ft-text-accent-bright font-bold">· مفكرو المستقبل</span></p>
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[11px] sm:text-xs text-slate-500">
            <span>© {new Date().getFullYear()} منصة مفكري المستقبل · جميع الحقوق محفوظة</span>
            <ReportProblem />
          </div>
        </div>
      </div>
    </footer>
  );
}
