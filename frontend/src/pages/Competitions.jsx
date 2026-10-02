import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Timer, Brain, Code2, BookOpen, Crown, Atom, Feather, Scale } from "lucide-react";

const TYPE_META = {
  quiz: { label: "اختبار معرفي", icon: Brain, color: "#2563EB" },
  chess: { label: "شطرنج", icon: Crown, color: "#0A192F" },
  programming: { label: "برمجة", icon: Code2, color: "#1E293B" },
  reading: { label: "قراءة", icon: BookOpen, color: "#D97706" },
  writing: { label: "كتابة", icon: Feather, color: "#0891B2" },
  science: { label: "علوم", icon: Atom, color: "#059669" },
  debate: { label: "مناظرة", icon: Scale, color: "#7C3AED" },
};

export default function Competitions() {
  const [data, setData] = useState(null);
  const [type, setType] = useState("");
  useEffect(() => { setData(null); api.get("/competitions", { params: { type: type || undefined } }).then((r) => setData(r.data)); }, [type]);

  return (
    <Layout>
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <Trophy className="pointer-events-none absolute -bottom-14 -left-10 h-72 w-72 rotate-12 text-white/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
            <Trophy className="h-6 w-6" />
          </div>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">المسابقات</h1>
          <p className="text-emerald-50/80 mt-3 max-w-2xl leading-relaxed sm:text-lg">اختبارات معرفية وعلمية وبرمجية وأدبية مع نقاط خبرة وشهادات وترتيب.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-[1.4rem] border border-slate-100 bg-white p-2 ft-shadow sm:flex-wrap sm:overflow-visible">
          <button onClick={() => setType("")} className={`pressable shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!type ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>الكل</button>
          {Object.entries(TYPE_META).map(([k, m]) => {
            const Icon = m.icon;
            const active = type === k;
            return (
              <button key={k} onClick={() => setType(k)} className={`pressable flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? "text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={active ? { background: m.color, boxShadow: `0 10px 20px -12px ${m.color}` } : {}}>
                <Icon className="h-4 w-4" style={!active ? { color: m.color } : {}} />
                {m.label}
              </button>
            );
          })}
        </div>
        {!data ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Trophy} title="لا مسابقات حالياً" desc="ستُعلن المسابقات القادمة قريباً" />
          : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
              {data.items.map((c, i) => {
                const m = TYPE_META[c.type] || TYPE_META.quiz;
                const Icon = m.icon;
                return (
                  <Link key={c.id} to={`/competitions/${c.id}`} data-testid={`competition-${c.id}`} className={`group relative flex h-full flex-col overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow hover-lift animate-fade-up d-${(i % 6) + 1}`}>
                    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: m.color }} />
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="w-14 h-14 rounded-2xl grid place-items-center text-white shadow-lg transition-transform duration-300 group-hover:scale-105" style={{ background: m.color, boxShadow: `0 14px 26px -14px ${m.color}` }}><Icon className="w-7 h-7" /></div>
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${m.color}14`, color: m.color }}>{m.label}</span>
                    </div>
                    <h3 className="font-head font-bold text-xl leading-snug text-slate-900 line-clamp-2">{c.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500 line-clamp-3 mt-2">{c.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-6 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Users className="w-3.5 h-3.5" style={{ color: m.color }} />{c.participants_count} مشارك</span>
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Timer className="w-3.5 h-3.5" style={{ color: m.color }} />{c.duration_minutes} دقيقة</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </Layout>
  );
}
