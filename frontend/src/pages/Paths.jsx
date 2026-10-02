import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Route, Map, BookOpen, Code2, Trophy, CheckCircle2, Check, Sparkles, Zap } from "lucide-react";

const KIND = {
  book: { icon: BookOpen, label: "كتاب", to: (r) => `/books/${r}`, c: "ft-bg-soft ft-text-accent" },
  problem: { icon: Code2, label: "مسألة برمجة", to: () => "/clubs/programming", c: "bg-slate-900 text-white" },
  competition: { icon: Trophy, label: "مسابقة", to: (r) => `/competitions/${r}`, c: "bg-amber-50 text-amber-600" },
};

export default function Paths() {
  const [paths, setPaths] = useState(null);
  const [claiming, setClaiming] = useState("");
  const load = () => api.get("/paths").then((r) => setPaths(r.data)).catch(() => setPaths([]));
  useEffect(() => { load(); }, []);

  const claim = async (p, i) => {
    setClaiming(`${p.id}:${i}`);
    try {
      const { data } = await api.post(`/paths/${p.id}/steps/${i}/claim`);
      toast.success(`+${data.xp} خبرة 🎉`);

      load();
    } catch (e) { toast.error(apiErr(e)); }
    setClaiming("");
  };

  const list = paths || [];
  const heroTotalSteps = list.reduce((a, p) => a + (p.steps?.length || 0), 0);
  const heroDoneSteps = list.reduce((a, p) => a + (p.done_steps || 0), 0);
  const heroDonePaths = list.filter((p) => p.steps?.length > 0 && p.claimed_steps === p.steps.length).length;
  const heroTotalXp = list.reduce((a, p) => a + (p.total_xp || 0) + 100, 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== hero ===== */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-10 sm:py-12 mb-8 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-24 w-80 h-80 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur text-white text-xs font-bold"><Route className="w-3.5 h-3.5" /> رحلات تعلّم موجّهة</span>
            <h1 className="font-head text-4xl sm:text-5xl font-extrabold text-white mt-4 leading-tight">مسارات التعلم</h1>
            <p className="text-white/80 text-sm sm:text-base mt-3 max-w-xl leading-relaxed">خطوات مرتبة تجمع الكتب والبرمجة والمسابقات · أكمل كل خطوة واجمع نقاطها، وإنهاء المسار كاملاً يمنحك مكافأة إضافية.</p>
            {list.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold">
                  <Map className="w-4 h-4 ft-text-accent-bright" /> {heroDonePaths}/{list.length} مسارات مكتملة
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 ft-text-accent-bright" /> {heroDoneSteps}/{heroTotalSteps} خطوة منجزة
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold">
                  <Zap className="w-4 h-4 text-amber-300" /> حتى {heroTotalXp} XP
                </span>
              </div>
            )}
          </div>
          <Route className="absolute -left-8 -bottom-10 w-52 h-52 text-white/10" />
          <Map className="absolute right-6 -top-8 w-40 h-40 text-white/[0.07] hidden sm:block" />
        </div>

        {!paths ? <PageLoader /> : paths.length === 0 ? (
          <EmptyState icon={Route} title="لا مسارات بعد" desc="ستظهر هنا رحلات تعلم موجهة قريباً" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {paths.map((p, pi) => {
              const total = p.steps.length;
              const donePct = total ? Math.round((p.done_steps / total) * 100) : 0;
              const doneSteps = p.done_steps || 0;
              const complete = p.claimed_steps === total && total > 0;
              const color = p.color || "#059669";
              return (
                <section key={p.id}
                  className={`animate-fade-up group relative overflow-hidden bg-white rounded-[1.8rem] border ft-shadow hover-lift p-5 sm:p-6 ${complete ? "border-emerald-200 ring-2 ring-emerald-300/60" : "border-slate-100"}`}
                  style={{ animationDelay: `${pi * 0.07}s` }}>
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <span className="pointer-events-none absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" style={{ background: `${color}26` }} />

                  {/* ===== path header ===== */}
                  <div className="relative flex items-start gap-3.5">
                    <span className="w-14 h-14 rounded-2xl grid place-items-center text-3xl shrink-0 ring-1 ring-slate-900/5 shadow-inner" style={{ background: `${p.color || "#059669"}1f` }}>{p.icon || "🛤️"}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-head font-extrabold text-xl text-slate-900 leading-snug">{p.title}</h2>
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[11px] font-extrabold">
                        <Zap className="w-3 h-3" /> حتى {p.total_xp + 100} XP
                      </span>
                    </div>
                  </div>
                  <p className="relative text-sm text-slate-500 mt-3 leading-relaxed">{p.desc}</p>

                  {/* ===== progress ===== */}
                  <div className="relative mt-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-500">{p.done_steps}/{total} خطوات · {donePct}%</span>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full text-white shadow-sm" style={{ background: color }}>{donePct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-900/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${donePct}%`, background: `linear-gradient(90deg, ${color}, ${color}b3)` }} />
                    </div>
                  </div>

                  {/* ===== steps journey timeline ===== */}
                  <div className="relative mt-6">
                    {p.steps.map((s, i) => {
                      const k = KIND[s.kind] || KIND.book;
                      const Icon = k.icon;
                      const done = i < doneSteps;
                      const current = i === doneSteps && !complete;
                      const last = i === total - 1;
                      return (
                        <div key={i} className="flex gap-3">
                          {/* route node + connector */}
                          <div className="flex flex-col items-center shrink-0">
                            {done ? (
                              <span className="relative z-10 w-10 h-10 rounded-full grid place-items-center bg-emerald-500 border-2 border-emerald-400 text-white shadow-md shadow-emerald-500/30">
                                <Check className="w-4.5 h-4.5" />
                              </span>
                            ) : current ? (
                              <span className="relative z-10 w-10 h-10 rounded-full grid place-items-center border-2 border-white/60 text-white text-sm font-extrabold shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 10px 20px -8px ${color}` }}>
                                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.3 }} />
                                <span className="relative">{i + 1}</span>
                              </span>
                            ) : (
                              <span className="relative z-10 w-10 h-10 rounded-full grid place-items-center bg-white border-2 border-slate-200 text-xs font-extrabold text-slate-400">
                                {i + 1}
                              </span>
                            )}
                            {!last && (
                              <span className={`w-[3px] flex-1 min-h-[18px] my-1 rounded-full ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
                            )}
                          </div>

                          {/* step card */}
                          <div className={`flex-1 min-w-0 ${last ? "" : "pb-3"}`}>
                            <div className={`rounded-2xl border p-3.5 transition-all duration-300 ${
                              done
                                ? "bg-emerald-50/70 border-emerald-100"
                                : current
                                  ? "bg-white border-slate-200 shadow-md"
                                  : "bg-slate-50/80 border-slate-100"
                            }`} style={current ? { borderColor: `${color}59`, boxShadow: `0 14px 30px -14px ${color}80` } : undefined}>
                              <div className="flex items-start gap-3">
                                <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 shadow-sm ${k.c} ${!done && !current ? "opacity-60" : ""}`}><Icon className="w-5 h-5" /></span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className={`text-sm font-bold truncate ${done ? "text-slate-600" : "text-slate-800"}`}>{s.title}</div>
                                    {current && (
                                      <span className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>الحالية</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <span>{k.label}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-600"><Zap className="w-3 h-3" /> +{s.xp || 10} XP</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Link to={k.to(s.ref_id)} className="flex-1 inline-flex items-center justify-center h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">افتح</Link>
                                <button onClick={() => claim(p, i)} disabled={claiming === `${p.id}:${i}`}
                                  className="pressable flex-1 inline-flex items-center justify-center gap-1 h-11 rounded-xl ft-btn-primary text-xs font-bold shadow-md disabled:opacity-50">
                                  <CheckCircle2 className="w-4 h-4" /> {claiming === `${p.id}:${i}` ? "…" : "أنجزت"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ===== completion celebration ===== */}
                  {complete && (
                    <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-600 text-white p-4 ft-shadow">
                      <div className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
                      <div className="relative flex items-center gap-3">
                        <span className="w-11 h-11 rounded-2xl bg-white/20 ring-1 ring-white/30 grid place-items-center shrink-0">
                          <Trophy className="w-6 h-6" />
                        </span>
                        <div className="flex-1 font-head font-extrabold text-base">مكتمل 🎉</div>
                        <Sparkles className="w-5 h-5 text-white/80 shrink-0" />
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
