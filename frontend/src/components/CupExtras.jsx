import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Target, Flame, Award, Check, Clock3, BookOpen, FileText, BrainCircuit, Crown, School,
} from "lucide-react";

/* هدف مدرستي الشهري + أوسمة الموسم · bands shown on the School Cup page. */
const METRIC_ICON = { books: BookOpen, pages: FileText, quizzes: BrainCircuit };
const METRIC_LABEL = { books: "كتاب منتهٍ", pages: "صفحة", quizzes: "اختبار ناجح" };

export default function CupExtras() {
  const { user } = useAuth();
  const [goal, setGoal] = useState(undefined);
  const [seasonal, setSeasonal] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get("/growth/school-goal/my").then((r) => setGoal(r.data)).catch(() => setGoal(null));
    api.get("/growth/badges/seasonal").then((r) => setSeasonal(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [user?.id]); // eslint-disable-line

  if (!user) return null;

  return (
    <div className="mt-8 sm:mt-10 space-y-5">
      {/* ---------- monthly school goal ---------- */}
      {goal?.school && (
        <section className="relative overflow-hidden rounded-[28px] p-[1px] bg-gradient-to-br from-emerald-400/50 via-white/40 to-teal-300/50 ft-shadow">
          <div className="relative rounded-[27px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-7 overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-lg shadow-emerald-500/30"><Target className="w-5 h-5" /></span>
                  هدف {goal.school.name} هذا الشهر
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
                  <School className="w-3.5 h-3.5" /> {goal.members} طالب في المدرسة
                </span>
              </div>
              <div className="flex items-end gap-3 mt-4 flex-wrap">
                <span className="font-head text-4xl sm:text-5xl font-black text-slate-900 tabular-nums">{goal.pages}</span>
                <span className="text-sm font-bold text-slate-400 pb-1.5">من {goal.goal} صفحة · {goal.pct}٪</span>
                {goal.my_pages > 0 && <span className="ms-auto inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-700 ring-1 ring-amber-400/30"><Flame className="w-4 h-4" /> مساهمتك: {goal.my_pages} صفحة</span>}
              </div>
              <div className="h-3.5 rounded-full bg-slate-900/[0.06] overflow-hidden mt-3">
                <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-1000 shadow-[0_0_18px_rgba(16,185,129,0.45)]" style={{ width: `${goal.pct}%` }} />
              </div>
              {goal.contributors?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {goal.contributors.map((c, i) => (
                    <span key={c.user_id} className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-white/80 ring-1 ring-slate-900/[0.05] text-slate-600">
                      {i === 0 ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <span className="text-slate-300 font-black">{i + 1}</span>}
                      {c.name} · {c.pages} صفحة
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] font-bold text-slate-400 mt-3">كل صفحة تقرؤها تُحسب تلقائياً لمدرستك · الهدف يُضبط من إدارة النادي.</p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- seasonal badges ---------- */}
      {seasonal.length > 0 && (
        <section className="relative overflow-hidden rounded-[28px] p-[1px] bg-gradient-to-br from-amber-400/50 via-white/40 to-orange-300/50 ft-shadow">
          <div className="relative rounded-[27px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-7 overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-lg shadow-amber-500/30"><Award className="w-5 h-5" /></span>
                أوسمة الموسم · محدودة الوقت
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
                {seasonal.map((b) => {
                  const Icon = METRIC_ICON[b.metric] || Award;
                  const pct = b.target ? Math.min(100, Math.round((b.progress / b.target) * 100)) : 0;
                  return (
                    <div key={b.key} className={`relative overflow-hidden rounded-3xl p-4 ring-1 ${b.earned ? "bg-gradient-to-br from-amber-400/[0.14] to-orange-400/[0.08] ring-amber-400/40" : "bg-white/70 ring-slate-900/[0.05]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="w-11 h-11 rounded-2xl text-white grid place-items-center shadow-lg" style={{ background: `linear-gradient(135deg, ${b.color || "#D97706"}, ${b.color || "#D97706"}99)` }}><Icon className="w-5 h-5" /></span>
                        {b.earned
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30"><Check className="w-3 h-3" /> كسبتها</span>
                          : b.days_left != null && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-900/[0.06] text-slate-500"><Clock3 className="w-3 h-3" /> باقي {b.days_left} يوم</span>}
                      </div>
                      <div className="font-head font-extrabold text-slate-900 mt-3">{b.name}</div>
                      {b.description && <p className="text-[11px] text-slate-500 leading-relaxed mt-1 line-clamp-2">{b.description}</p>}
                      <div className="flex items-center justify-between text-[11px] font-extrabold mt-3">
                        <span className="text-slate-400">{b.progress} / {b.target} {METRIC_LABEL[b.metric] || ""}</span>
                        <span className={b.earned ? "text-emerald-600" : "text-amber-600"}>{pct}٪</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900/[0.06] overflow-hidden mt-1.5">
                        <div className={`h-full rounded-full transition-all duration-700 ${b.earned ? "bg-gradient-to-l from-emerald-400 to-teal-400" : "bg-gradient-to-l from-amber-400 to-orange-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-4">الأوسمة الموسمية تُمنح تلقائياً عند بلوغ الهدف، وتختفي بنهاية موسمها · من فاتته لا تعود.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
