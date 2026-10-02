import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Timer, Brain, Code2, BookOpen, Crown, Atom, Feather, Scale, Zap, ArrowLeft, Sparkles } from "lucide-react";

export const TYPE_META = {
  quiz: { label: "اختبار معرفي", icon: Brain, color: "#2563EB" },
  chess: { label: "شطرنج", icon: Crown, color: "#0A192F" },
  programming: { label: "برمجة", icon: Code2, color: "#1E293B" },
  reading: { label: "قراءة", icon: BookOpen, color: "#D97706" },
  writing: { label: "كتابة", icon: Feather, color: "#0891B2" },
  science: { label: "علوم", icon: Atom, color: "#059669" },
  debate: { label: "مناظرة", icon: Scale, color: "#7C3AED" },
};

/* Display-only status derived from the real start_at/end_at/status fields. */
export function compStatus(c) {
  const st = c?.status;
  if (st && st !== "open") {
    if (st === "closed" || st === "finished" || st === "ended") return { label: "منتهية", cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", dot: "bg-slate-400" };
    return null;
  }
  const s = Date.parse(c?.start_at);
  const e = Date.parse(c?.end_at);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  const now = Date.now();
  if (now < s) return { label: "قادمة", cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", dot: "bg-sky-500" };
  if (now <= e) return { label: "جارية الآن", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500 animate-pulse" };
  return { label: "منتهية", cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", dot: "bg-slate-400" };
}

export default function Competitions() {
  const [data, setData] = useState(null);
  const [type, setType] = useState("");
  useEffect(() => { setData(null); api.get("/competitions", { params: { type: type || undefined } }).then((r) => setData(r.data)); }, [type]);

  return (
    <Layout>
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <Trophy className="pointer-events-none absolute -bottom-16 -left-10 h-80 w-80 rotate-12 text-white/[0.07]" />
        <Crown className="pointer-events-none absolute -top-10 right-6 h-44 w-44 -rotate-12 text-amber-300/10" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 xl:max-w-[1440px] xl:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> مسابقات النادي · تحدَّ نفسك واجمع الخبرة
          </span>
          <div className="mt-5 grid h-14 w-14 place-items-center rounded-[1.1rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur">
            <Trophy className="h-7 w-7 text-amber-300" />
          </div>
          <h1 className="font-head mt-4 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight">المسابقات</h1>
          <p className="text-emerald-50/80 mt-3 max-w-2xl leading-relaxed sm:text-lg">اختبارات معرفية وعلمية وبرمجية وأدبية مع نقاط خبرة وشهادات وترتيب.</p>
          {data && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/15 backdrop-blur"><Trophy className="h-4 w-4 text-amber-300" />{data.total} مسابقة</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-white/15 backdrop-blur"><Zap className="h-4 w-4 text-amber-300" /> نقاط خبرة وشهادات للفائزين</span>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-300/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 xl:max-w-[1440px] xl:grid xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start xl:gap-8">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 mb-6 flex gap-2 overflow-x-auto rounded-[1.4rem] border border-white/60 bg-white/85 p-2 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-200/60 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible xl:top-24 xl:mb-0 xl:flex-col xl:flex-nowrap xl:gap-2.5 xl:rounded-3xl xl:p-3">
          <span className="hidden px-2 pb-0.5 pt-1 text-xs font-extrabold text-slate-400 xl:block">تصنيف المسابقات</span>
          <button data-testid="competition-type-all" onClick={() => setType("")} className={`pressable flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-bold transition-all xl:w-full ${!type ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"}`}>الكل</button>
          {Object.entries(TYPE_META).map(([k, m]) => {
            const Icon = m.icon;
            const active = type === k;
            return (
              <button key={k} data-testid={`competition-type-${k}`} onClick={() => setType(k)} className={`pressable flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all xl:w-full ${active ? "text-white" : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"}`} style={active ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`, boxShadow: `0 12px 22px -10px ${m.color}` } : {}}>
                <Icon className="h-4 w-4" style={!active ? { color: m.color } : {}} />
                {m.label}
              </button>
            );
          })}
        </div>

        {!data ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Trophy} title="لا مسابقات حالياً" desc="ستُعلن المسابقات القادمة قريباً" />
          : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 xl:gap-6">
              {data.items.map((c, i) => {
                const m = TYPE_META[c.type] || TYPE_META.quiz;
                const Icon = m.icon;
                const st = compStatus(c);
                return (
                  <Link key={c.id} to={`/competitions/${c.id}`} data-testid={`competition-${c.id}`} className={`group relative flex h-full flex-col overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow hover-lift animate-fade-up d-${(i % 6) + 1}`}>
                    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}99)` }} />
                    <span className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-[0.12]" style={{ background: m.color }} />
                    <div className="relative flex items-start justify-between gap-3 mb-5">
                      <div className="w-14 h-14 rounded-2xl grid place-items-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`, boxShadow: `0 14px 26px -12px ${m.color}` }}><Icon className="w-7 h-7" /></div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded-full px-3 py-1 text-xs font-bold ring-1" style={{ background: `${m.color}14`, color: m.color, "--tw-ring-color": `${m.color}30` }}>{m.label}</span>
                        {st && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>}
                      </div>
                    </div>
                    <h3 className="font-head font-bold text-xl leading-snug text-slate-900 line-clamp-2 transition-colors group-hover:text-slate-950">{c.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500 line-clamp-3 mt-2">{c.description}</p>
                    <div className="relative mt-auto pt-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-100"><Users className="w-3.5 h-3.5" style={{ color: m.color }} />{c.participants_count} مشارك</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-100"><Timer className="w-3.5 h-3.5" style={{ color: m.color }} />{c.duration_minutes} دقيقة</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-amber-100"><Zap className="w-3.5 h-3.5" />نقاط خبرة</span>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-sm font-extrabold transition-all group-hover:gap-2.5" style={{ color: m.color }}>
                        عرض المسابقة <ArrowLeft className="h-4 w-4" />
                      </div>
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
