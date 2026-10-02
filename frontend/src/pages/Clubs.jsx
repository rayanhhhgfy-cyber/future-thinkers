import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import * as Icons from "lucide-react";
import { Users, ArrowLeft, Check, Compass, Crown } from "lucide-react";

export default function Clubs() {
  const [clubs, setClubs] = useState(null);
  useEffect(() => { api.get("/clubs").then((r) => setClubs(r.data)); }, []);
  if (!clubs) return <Layout><PageLoader /></Layout>;
  const totalMembers = clubs.reduce((s, c) => s + (c.members_count || 0), 0);
  const myClubs = clubs.filter((c) => c.is_member).length;
  const stats = [
    { value: clubs.length, label: "نادياً نشطاً", hint: "بانتظارك لاستكشافها", icon: Compass, tone: "bg-emerald-400/25 text-emerald-200" },
    { value: totalMembers, label: "عضو مشارك", hint: "في جميع الأندية", icon: Users, tone: "bg-sky-400/25 text-sky-200" },
    { value: myClubs, label: "أندية انضممت إليها", hint: "تابع نشاطك فيها", icon: Crown, tone: "bg-amber-400/25 text-amber-200" },
  ];
  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-10 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <Users className="absolute -left-8 -bottom-10 w-52 h-52 sm:w-72 sm:h-72 text-white/[0.04] pointer-events-none -rotate-12" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative">
          <div className="animate-fade-up max-w-3xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-200 backdrop-blur"><Users className="w-3.5 h-3.5" /> مجتمع الطلاب المبدعين</span>
            <h1 className="font-head text-[2rem] leading-[1.15] sm:text-4xl lg:text-[3.4rem] font-extrabold mt-4">الأندية <span className="text-transparent bg-clip-text bg-gradient-to-l from-emerald-300 via-teal-200 to-sky-300">الطلابية</span></h1>
            <p className="text-slate-300 mt-3 max-w-2xl text-[15px] leading-relaxed sm:text-base sm:leading-loose">مساحات تفاعلية للقراءة والحوار والشطرنج والبرمجة والعلوم والابتكار والمناظرات والأدب وريادة الأعمال.</p>
          </div>
          <div className="grid grid-cols-1 min-[430px]:grid-cols-3 gap-3 mt-8 sm:mt-10 animate-fade-up" style={{ animationDelay: "120ms" }}>
            {stats.map((s) => (
              <div key={s.label} className="group flex items-center gap-3 sm:gap-3.5 bg-white/[0.08] hover:bg-white/[0.13] border border-white/10 rounded-2xl sm:rounded-3xl px-4 py-3 sm:py-3.5 backdrop-blur transition-colors duration-300">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl grid place-items-center shrink-0 font-head font-extrabold text-lg sm:text-xl ${s.tone}`}><s.icon className="w-5 h-5 sm:hidden" /><span className="hidden sm:inline">{s.value}</span></div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-[15px] font-bold leading-tight truncate"><span className="sm:hidden font-head font-extrabold ml-1">{s.value}</span>{s.label}</div>
                  <div className="text-[11px] sm:text-xs text-slate-300 mt-1 truncate">{s.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-px bg-gradient-to-l from-transparent via-white/25 to-transparent relative" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="flex items-end justify-between gap-3 mb-5 sm:mb-6">
          <div>
            <h2 className="font-head font-extrabold text-xl sm:text-2xl lg:text-[1.7rem] text-slate-900">استكشف الأندية</h2>
            <div className="mt-2 h-1 w-14 rounded-full bg-gradient-to-l from-emerald-500 to-sky-500" />
          </div>
          <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">{clubs.length} نادٍ متاح</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {clubs.map((c, idx) => {
            const Icon = Icons[c.icon] || Icons.Circle;
            return (
              <Link key={c.id} to={`/clubs/${c.slug}`} data-testid={`club-${c.slug}`} className="group relative overflow-hidden bg-white rounded-3xl sm:rounded-[1.75rem] p-5 sm:p-6 border border-slate-100 ft-shadow hover-lift block animate-fade-up pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]" style={{ animationDelay: `${Math.min(idx, 10) * 60}ms` }}>
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${c.color}, ${c.color}55)` }} />
                <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full opacity-[0.07] pointer-events-none transition-all duration-500 group-hover:scale-[1.35] group-hover:opacity-[0.12]" style={{ background: c.color }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `linear-gradient(160deg, ${c.color}0d, transparent 55%)` }} />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center text-white shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}B3)`, boxShadow: `0 14px 28px -10px ${c.color}90` }}><Icon className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow" /></div>
                  {c.is_member && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0"><Check className="w-3 h-3" /> عضو</span>}
                </div>
                <h3 className="relative font-head font-extrabold text-lg sm:text-xl text-slate-900 mt-4 transition-colors duration-300 group-hover:text-slate-950">{c.name}</h3>
                <p className="relative mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed min-h-[2.75rem]">{c.description}</p>
                <div className="relative mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5 bg-slate-50 group-hover:bg-white px-2.5 py-1.5 rounded-full transition-colors"><Users className="w-3.5 h-3.5" style={{ color: c.color }} />{c.members_count} عضو</span>
                  <span className="text-sm font-bold inline-flex items-center gap-1 transition-all duration-300 group-hover:gap-2.5 group-hover:-translate-x-0.5" style={{ color: c.color }}>ادخل <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
