import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import * as Icons from "lucide-react";
import { Users, ArrowLeft } from "lucide-react";

export default function Clubs() {
  const [clubs, setClubs] = useState(null);
  useEffect(() => { api.get("/clubs").then((r) => setClubs(r.data)); }, []);
  if (!clubs) return <Layout><PageLoader /></Layout>;
  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-10 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-200"><Users className="w-3.5 h-3.5" /> مجتمع الطلاب المبدعين</span>
            <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-extrabold mt-4 leading-tight">الأندية الطلابية</h1>
            <p className="text-slate-300 mt-3 max-w-2xl leading-relaxed">مساحات تفاعلية للقراءة والحوار والشطرنج والبرمجة والعلوم والابتكار والمناظرات والأدب وريادة الأعمال.</p>
          </div>
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/25 grid place-items-center text-emerald-200 font-head font-extrabold">{clubs.length}</div>
              <div><div className="text-sm font-bold leading-none">نادياً نشطاً</div><div className="text-[11px] text-slate-300 mt-1">بانتظارك لاستكشافها</div></div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur">
              <div className="w-10 h-10 rounded-xl bg-sky-400/25 grid place-items-center text-sky-200 font-head font-extrabold">{clubs.reduce((s, c) => s + (c.members_count || 0), 0)}</div>
              <div><div className="text-sm font-bold leading-none">عضو مشارك</div><div className="text-[11px] text-slate-300 mt-1">في جميع الأندية</div></div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur">
              <div className="w-10 h-10 rounded-xl bg-amber-400/25 grid place-items-center text-amber-200 font-head font-extrabold">{clubs.filter((c) => c.is_member).length}</div>
              <div><div className="text-sm font-bold leading-none">أندية انضممت إليها</div><div className="text-[11px] text-slate-300 mt-1">تابع نشاطك فيها</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex items-end justify-between gap-3 mb-5">
          <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900">استكشف الأندية</h2>
          <span className="text-xs text-slate-400 whitespace-nowrap">{clubs.length} نادٍ متاح</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {clubs.map((c, idx) => {
            const Icon = Icons[c.icon] || Icons.Circle;
            return (
              <Link key={c.id} to={`/clubs/${c.slug}`} data-testid={`club-${c.slug}`} className="group relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl p-6 border border-slate-100 ft-shadow hover-lift block animate-fade-up" style={{ animationDelay: `${Math.min(idx, 8) * 70}ms` }}>
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${c.color}, ${c.color}55)` }} />
                <div className="absolute -top-10 -left-10 w-28 h-28 rounded-full opacity-[0.07] pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: c.color }} />
                <div className="relative flex items-start justify-between">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl grid place-items-center text-white shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}B3)`, boxShadow: `0 12px 24px -8px ${c.color}80` }}><Icon className="w-7 h-7 sm:w-8 sm:h-8" /></div>
                  {c.is_member && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">عضو</span>}
                </div>
                <h3 className="relative font-head font-extrabold text-lg sm:text-xl text-slate-900 mt-4">{c.name}</h3>
                <p className="relative mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed min-h-[2.6rem]">{c.description}</p>
                <div className="relative mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-full"><Users className="w-3.5 h-3.5" style={{ color: c.color }} />{c.members_count} عضو</span>
                  <span className="text-sm font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: c.color }}>ادخل <ArrowLeft className="w-4 h-4" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
