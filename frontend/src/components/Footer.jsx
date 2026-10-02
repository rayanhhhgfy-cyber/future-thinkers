import React from "react";
import { Link } from "react-router-dom";
import { Logo, LogoMark } from "@/components/Logo";

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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} منصة مفكري المستقبل · جميع الحقوق محفوظة</span>
          <span className="inline-flex items-center gap-1.5">صُنعت بشغف لطلاب الأردن <span className="ft-text-accent-bright font-bold">· مفكرو المستقبل</span></span>
        </div>
      </div>
    </footer>
  );
}
