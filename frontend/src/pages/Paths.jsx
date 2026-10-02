import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { Route, BookOpen, Code2, Trophy, CheckCircle2, Lock, Sparkles } from "lucide-react";

const KIND = {
  book: { icon: BookOpen, label: "كتاب", to: (r) => `/books/${r}`, c: "bg-emerald-50 text-emerald-600" },
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient px-6 py-8 sm:px-10 sm:py-10 mb-8">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold"><Route className="w-3.5 h-3.5" /> رحلات تعلّم موجّهة</span>
            <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-4">مسارات التعلم</h1>
            <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">خطوات مرتبة تجمع الكتب والبرمجة والمسابقات — أكمل كل خطوة واجمع نقاطها، وإنهاء المسار كاملاً يمنحك مكافأة إضافية.</p>
          </div>
          <Route className="absolute -left-8 -bottom-10 w-52 h-52 text-white/10" />
        </div>

        {!paths ? <PageLoader /> : paths.length === 0 ? (
          <EmptyState icon={Route} title="لا مسارات بعد" desc="ستظهر هنا رحلات تعلم موجهة قريباً" />
        ) : (
          <div className="space-y-6">
            {paths.map((p, pi) => {
              const total = p.steps.length;
              const donePct = total ? Math.round((p.done_steps / total) * 100) : 0;
              return (
                <section key={p.id} className="animate-fade-up bg-white rounded-[1.8rem] border border-slate-100 ft-shadow p-5 sm:p-7" style={{ animationDelay: `${pi * 0.07}s` }}>
                  <div className="flex items-start gap-4 flex-wrap">
                    <span className="w-14 h-14 rounded-2xl grid place-items-center text-3xl shrink-0" style={{ background: `${p.color || "#059669"}1f` }}>{p.icon || "🛤️"}</span>
                    <div className="flex-1 min-w-[220px]">
                      <h2 className="font-head font-extrabold text-xl text-slate-900">{p.title}</h2>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1 max-w-xs h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${donePct}%`, background: p.color || "#059669" }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{p.done_steps}/{total} خطوات · {donePct}%</span>
                        <span className="text-xs font-bold text-amber-600">حتى {p.total_xp + 100} XP</span>
                      </div>
                    </div>
                    {p.claimed_steps === total && total > 0 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold"><Sparkles className="w-3.5 h-3.5" /> مكتمل 🎉</span>
                    )}
                  </div>
                  <div className="mt-5 space-y-2.5">
                    {p.steps.map((s, i) => {
                      const k = KIND[s.kind] || KIND.book;
                      const Icon = k.icon;
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-3">
                          <span className="w-7 h-7 rounded-full bg-white border border-slate-200 grid place-items-center text-xs font-extrabold text-slate-500 shrink-0">{i + 1}</span>
                          <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${k.c}`}><Icon className="w-4.5 h-4.5" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{s.title}</div>
                            <div className="text-[11px] text-slate-400">{k.label} · +{s.xp || 10} XP</div>
                          </div>
                          <Link to={k.to(s.ref_id)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 shrink-0">افتح</Link>
                          <button onClick={() => claim(p, i)} disabled={claiming === `${p.id}:${i}`}
                            className="pressable px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 shrink-0 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {claiming === `${p.id}:${i}` ? "…" : "أنجزت"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
