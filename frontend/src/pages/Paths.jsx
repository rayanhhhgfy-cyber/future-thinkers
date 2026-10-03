import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Route, Map, BookOpen, Code2, Trophy, CheckCircle2, Check, Sparkles, Zap, Award, ShieldCheck, Users, Compass } from "lucide-react";

const KIND = {
  book: { icon: BookOpen, label: "كتاب", to: (r) => `/books/${r}`, c: "ft-bg-soft ft-text-accent" },
  problem: { icon: Code2, label: "مسألة برمجة", to: () => "/clubs/programming", c: "bg-slate-900 text-white" },
  competition: { icon: Trophy, label: "مسابقة", to: (r) => `/competitions/${r}`, c: "bg-amber-50 text-amber-600" },
};

function friendPct(f) {
  if (typeof f?.percent === "number") return Math.max(0, Math.min(100, Math.round(f.percent)));
  if (typeof f?.pct === "number") return Math.max(0, Math.min(100, Math.round(f.pct)));
  if (typeof f?.progress === "number") return Math.max(0, Math.min(100, Math.round(f.progress <= 1 ? f.progress * 100 : f.progress)));
  if (f?.total_steps) return Math.round(((f.done_steps || 0) / f.total_steps) * 100);
  if (f?.steps_total) return Math.round(((f.steps_done || 0) / f.steps_total) * 100);
  return 0;
}

function PathFriends({ pathId, color }) {
  const [friends, setFriends] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/paths/${pathId}/friends`)
      .then((r) => {
        if (!alive) return;
        const d = r.data;
        const arr = Array.isArray(d) ? d : (d?.items || d?.friends || []);
        setFriends(arr.filter((f) => f && f.name));
      })
      .catch(() => { if (alive) setFriends([]); });
    return () => { alive = false; };
  }, [pathId]);

  if (!friends || friends.length === 0) return null;
  const sorted = [...friends].sort((a, b) => friendPct(b) - friendPct(a));
  return (
    <div className="relative mt-5 lg:mt-6 rounded-2xl lg:rounded-[1.4rem] border border-slate-100 bg-gradient-to-l from-slate-50 via-white to-slate-50 p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-3.5">
        <span className="w-8 h-8 rounded-xl grid place-items-center text-white shadow-md shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
          <Users className="w-4 h-4" />
        </span>
        <h3 className="font-head font-extrabold text-sm lg:text-base text-slate-800">تقدّم أصدقائك</h3>
        <span className="text-[11px] font-bold text-slate-400">في هذا المسار</span>
        <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.map((f, fi) => {
          const pct = friendPct(f);
          return (
            <div key={f.id || f.user_id || fi} className="shrink-0 w-[128px] rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
              {f.avatar_url ? (
                <img src={f.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow mx-auto" />
              ) : (
                <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-extrabold shadow mx-auto">{(f.name || "؟").charAt(0)}</span>
              )}
              <div className="mt-2 text-xs font-bold text-slate-700 truncate">{f.name}</div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}b3)` }} />
              </div>
              <div className="mt-1 text-[11px] font-extrabold" style={{ color }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendedPaths({ onJump }) {
  const [recs, setRecs] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get("/paths/recommended")
      .then((r) => {
        if (!alive) return;
        const d = r.data;
        const arr = Array.isArray(d) ? d : (d?.items || d?.paths || []);
        setRecs(arr.filter((p) => p && p.id));
      })
      .catch(() => { if (alive) setRecs([]); });
    return () => { alive = false; };
  }, []);

  if (!recs || recs.length === 0) return null;
  return (
    <section className="mb-8 lg:mb-10 animate-fade-up">
      <div className="flex items-center gap-3 mb-4 lg:mb-5">
        <span className="h-8 w-1.5 rounded-full ft-grad-bar shrink-0 shadow" />
        <span className="inline-flex items-center gap-2 font-head text-lg sm:text-xl font-extrabold text-slate-800">
          <Compass className="w-5 h-5 ft-text-accent" />
          مسارات مقترحة لك
        </span>
        <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">مختارة بناءً على تقدّمك واهتماماتك</span>
        <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
        {recs.slice(0, 6).map((r, ri) => {
          const color = r.color || "#059669";
          const total = r.steps?.length || r.total_steps || 0;
          const done = r.done_steps || 0;
          const pct = total ? Math.round((done / total) * 100) : (typeof r.percent === "number" ? Math.round(r.percent) : 0);
          return (
            <article key={r.id}
              className="group relative overflow-hidden bg-white rounded-[1.6rem] border border-slate-100 ft-shadow hover-lift p-5 animate-fade-up"
              style={{ animationDelay: `${ri * 0.06}s` }}>
              <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0 ring-1 ring-slate-900/5 shadow-inner" style={{ background: `${color}1f` }}>{r.icon || "🛤️"}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-head font-extrabold text-base lg:text-lg text-slate-900 leading-snug truncate">{r.title}</h3>
                  {(r.reason || r.because) && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[10px] font-extrabold">
                      <Sparkles className="w-3 h-3" /> {r.reason || r.because}
                    </span>
                  )}
                </div>
              </div>
              {r.desc && <p className="text-[13px] text-slate-500 mt-3 leading-relaxed line-clamp-2">{r.desc}</p>}
              {total > 0 && (
                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                    <span>{done}/{total} خطوات</span>
                    <span style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}b3)` }} />
                  </div>
                </div>
              )}
              <button onClick={() => onJump(r.id)}
                className="pressable mt-4 w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl ft-btn-primary text-white text-xs font-extrabold shadow-md">
                <Route className="w-4 h-4" /> {done > 0 ? "أكمل المسار" : "ابدأ المسار"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

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
  const jumpToPath = (id) => {
    const el = document.getElementById(`path-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const heroTotalSteps = list.reduce((a, p) => a + (p.steps?.length || 0), 0);
  const heroDoneSteps = list.reduce((a, p) => a + (p.done_steps || 0), 0);
  const heroDonePaths = list.filter((p) => p.steps?.length > 0 && p.claimed_steps === p.steps.length).length;
  const heroTotalXp = list.reduce((a, p) => a + (p.total_xp || 0) + 100, 0);

  return (
    <Layout>
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 lg:py-10 xl:py-12">
        {/* ===== hero ===== */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14 xl:px-16 xl:py-16 mb-8 lg:mb-10 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-24 w-80 h-80 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur text-white text-xs font-bold"><Route className="w-3.5 h-3.5" /> رحلات تعلّم موجّهة</span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold text-white mt-4 leading-tight">مسارات التعلم</h1>
            <p className="text-white/80 text-sm sm:text-base lg:text-lg mt-3 max-w-xl lg:max-w-2xl xl:max-w-3xl leading-relaxed">خطوات مرتبة تجمع الكتب والبرمجة والمسابقات · أكمل كل خطوة واجمع نقاطها، وإنهاء المسار كاملاً يمنحك مكافأة إضافية.</p>
            {list.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 lg:mt-8 lg:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold min-h-[44px]">
                  <Map className="w-4 h-4 lg:w-5 lg:h-5 ft-text-accent-bright" /> {heroDonePaths}/{list.length} مسارات مكتملة
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold min-h-[44px]">
                  <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 ft-text-accent-bright" /> {heroDoneSteps}/{heroTotalSteps} خطوة منجزة
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur text-white text-xs font-bold min-h-[44px]">
                  <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-amber-300" /> حتى {heroTotalXp} XP
                </span>
              </div>
            )}
          </div>
          <Route className="absolute -left-8 -bottom-10 w-52 h-52 text-white/10" />
          <Map className="absolute right-6 -top-8 w-40 h-40 text-white/[0.07] hidden sm:block" />
        </div>

        {list.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 gap-5 xl:gap-6 mb-8 xl:mb-10">
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl ft-bg-soft ft-text-accent grid place-items-center shrink-0"><Map className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{heroDonePaths}<span className="text-slate-300 text-2xl">/{list.length}</span></div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">مسارات مكتملة</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><CheckCircle2 className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{heroDoneSteps}<span className="text-slate-300 text-2xl">/{heroTotalSteps}</span></div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">خطوة منجزة</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Zap className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{heroTotalXp}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">نقطة خبرة متاحة</div>
              </div>
            </div>
          </div>
        )}

        {paths && paths.length > 0 && <RecommendedPaths onJump={jumpToPath} />}

        {!paths ? <PageLoader /> : paths.length === 0 ? (
          <EmptyState icon={Route} title="لا مسارات بعد" desc="ستظهر هنا رحلات تعلم موجهة قريباً" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 lg:gap-6 xl:gap-7 items-start">
            {paths.map((p, pi) => {
              const total = p.steps.length;
              const donePct = total ? Math.round((p.done_steps / total) * 100) : 0;
              const doneSteps = p.done_steps || 0;
              const complete = p.claimed_steps === total && total > 0;
              const color = p.color || "#059669";
              const certCode = p.certificate_code || p.certificate?.code || null;
              return (
                <section key={p.id} id={`path-${p.id}`}
                  className={`scroll-mt-24 animate-fade-up group relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border ft-shadow hover-lift p-5 sm:p-6 lg:p-7 xl:p-8 ${complete ? "border-emerald-200 ring-2 ring-emerald-300/60" : "border-slate-100"}`}
                  style={{ animationDelay: `${pi * 0.07}s` }}>
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                  <span className="pointer-events-none absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500" style={{ background: `${color}26` }} />

                  {/* ===== path header ===== */}
                  <div className="relative flex items-start gap-3.5 lg:gap-4">
                    <span className="w-14 h-14 lg:w-16 lg:h-16 xl:w-[4.5rem] xl:h-[4.5rem] rounded-2xl lg:rounded-[1.25rem] grid place-items-center text-3xl lg:text-4xl shrink-0 ring-1 ring-slate-900/5 shadow-inner" style={{ background: `${p.color || "#059669"}1f` }}>{p.icon || "🛤️"}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-head font-extrabold text-xl lg:text-2xl text-slate-900 leading-snug">{p.title}</h2>
                      <span className="inline-flex items-center gap-1 mt-1.5 lg:mt-2 px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-[11px] font-extrabold min-h-[28px]">
                        <Zap className="w-3 h-3" /> حتى {p.total_xp + 100} XP
                      </span>
                    </div>
                  </div>
                  <p className="relative text-sm lg:text-[15px] xl:text-base text-slate-500 mt-3 lg:mt-4 leading-relaxed">{p.desc}</p>

                  {/* ===== progress ===== */}
                  <div className="relative mt-4 lg:mt-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs lg:text-sm font-bold text-slate-500">{p.done_steps}/{total} خطوات · {donePct}%</span>
                      <span className="text-[11px] lg:text-xs font-extrabold px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-white shadow-sm" style={{ background: color }}>{donePct}%</span>
                    </div>
                    <div className="h-3 lg:h-3.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-900/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${donePct}%`, background: `linear-gradient(90deg, ${color}, ${color}b3)` }} />
                    </div>
                  </div>

                  {/* ===== steps journey timeline · vertical on mobile, horizontal track on lg+ ===== */}
                  <div className="relative mt-6 lg:mt-8">
                    <div className="hidden lg:block absolute top-5 right-10 left-10 h-[3px] rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${donePct}%`, background: `linear-gradient(90deg, ${color}, ${color}b3)` }} />
                    </div>
                    <div className="lg:flex lg:gap-3 lg:items-stretch lg:overflow-x-auto lg:pb-2 lg:-mx-1 lg:px-1">
                    {p.steps.map((s, i) => {
                      const k = KIND[s.kind] || KIND.book;
                      const Icon = k.icon;
                      const done = i < doneSteps;
                      const current = i === doneSteps && !complete;
                      const last = i === total - 1;
                      return (
                        <div key={i} className="flex gap-3 lg:flex-col lg:items-center lg:gap-0 lg:flex-1 lg:min-w-[168px] xl:min-w-[184px]">
                          {/* route node + connector */}
                          <div className="flex flex-col items-center shrink-0 lg:flex-row lg:w-full lg:justify-center lg:px-1">
                            {done ? (
                              <span className="relative z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-full grid place-items-center bg-emerald-500 border-2 border-emerald-400 text-white shadow-md shadow-emerald-500/30 shrink-0">
                                <Check className="w-4.5 h-4.5" />
                              </span>
                            ) : current ? (
                              <span className="relative z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-full grid place-items-center border-2 border-white/60 text-white text-sm font-extrabold shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 10px 20px -8px ${color}` }}>
                                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.3 }} />
                                <span className="relative">{i + 1}</span>
                              </span>
                            ) : (
                              <span className="relative z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-full grid place-items-center bg-white border-2 border-slate-200 text-xs font-extrabold text-slate-400 shrink-0">
                                {i + 1}
                              </span>
                            )}
                            {!last && (
                              <span className={`w-[3px] flex-1 min-h-[18px] my-1 rounded-full lg:w-full lg:h-[3px] lg:min-h-0 lg:my-0 lg:mx-1 lg:flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
                            )}
                          </div>

                          {/* step card */}
                          <div className={`flex-1 min-w-0 lg:w-full lg:pt-3 ${last ? "" : "pb-3 lg:pb-0"}`}>
                            <div className={`rounded-2xl border p-3.5 lg:p-4 transition-all duration-300 h-full ${
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
                  </div>

                  {/* ===== friends progress ===== */}
                  <PathFriends pathId={p.id} color={color} />

                  {/* ===== completion celebration ===== */}
                  {complete && (
                    <div className="relative mt-5 lg:mt-6 overflow-hidden rounded-2xl lg:rounded-[1.4rem] bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-600 text-white p-4 lg:p-5 ft-shadow">
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

                  {/* ===== completion certificate ===== */}
                  {donePct === 100 && certCode && (
                    <div className="relative mt-5 lg:mt-6 overflow-hidden rounded-2xl lg:rounded-[1.4rem] bg-gradient-to-l from-amber-400 via-yellow-500 to-amber-600 text-white p-4 lg:p-5 ft-shadow animate-fade-up">
                      <div className="pointer-events-none absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/20 blur-2xl" />
                      <div className="pointer-events-none absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-amber-200/30 blur-2xl" />
                      <Award className="pointer-events-none absolute -left-4 -bottom-6 w-28 h-28 text-white/10 -rotate-12" />
                      <div className="relative flex flex-wrap items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/40 grid place-items-center shrink-0 shadow-lg">
                          <Award className="w-6 h-6" />
                        </span>
                        <div className="flex-1 min-w-[140px]">
                          <div className="font-head font-extrabold text-base lg:text-lg leading-tight">أكملت المسار 🎉</div>
                          <div className="text-[11px] lg:text-xs text-white/85 font-bold mt-0.5">شهادة إتمام رسمية بانتظارك · تحقّق منها وشاركها</div>
                        </div>
                        <Link to={`/verify/${encodeURIComponent(certCode)}`}
                          className="pressable inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full bg-white text-amber-700 text-xs font-extrabold shadow-lg hover:bg-amber-50 transition shrink-0">
                          <ShieldCheck className="w-4 h-4" /> التحقق من الشهادة
                        </Link>
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
