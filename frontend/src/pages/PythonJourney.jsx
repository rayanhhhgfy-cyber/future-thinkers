import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import {
  ChevronLeft, Lock, Check, Play, Trophy, Sparkles, Zap,
  FileText, HelpCircle, ArrowRight, Gauge, ChevronDown,
} from "lucide-react";

const BG = "#0a1628";

function NodeIcon({ st }) {
  if (st === "passed")
    return (
      <span className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.8)] sm:h-14 sm:w-14" style={{ background: "linear-gradient(135deg,#10b981,#0d9488)" }}>
        <Check className="h-6 w-6" strokeWidth={3} />
      </span>
    );
  if (st === "current")
    return (
      <span className="relative grid h-12 w-12 place-items-center rounded-2xl text-white sm:h-14 sm:w-14" style={{ background: "linear-gradient(135deg,#3776AB,#255a85)" }}>
        <span className="absolute inset-0 animate-ping rounded-2xl bg-[#3776AB]/40" />
        <Play className="relative h-6 w-6 fill-current" />
      </span>
    );
  return (
    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-500 sm:h-14 sm:w-14">
      <Lock className="h-5 w-5" />
    </span>
  );
}

export default function PythonJourney({ embedded = false } = {}) {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [placeN, setPlaceN] = useState(5);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get("/python-learn/articles")
      .then((r) => setData(r.data))
      .catch(() => setData({ articles: [], passed_count: 0, total: 0 }));
  }, []);

  const startPlacement = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const { data: s } = await api.post("/python-learn/placement/start", { upto_order: placeN - 1 });
      nav("/python/placement", { state: { session: s } });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "تعذر بدء الاختبار");
      setStarting(false);
    }
  };

  if (!data) return embedded ? <PageLoader /> : <Layout><PageLoader /></Layout>;
  const { articles = [], passed_count = 0, total = 0 } = data;
  const pct = total ? Math.round((passed_count / total) * 100) : 0;
  const next = articles.find((a) => a.unlocked && !a.passed);

  const inner = (
      <div dir="rtl" className={`relative ${embedded ? "" : "min-h-screen "}overflow-hidden text-white`} style={{ background: BG }}>
        {/* ambient */}
        <div className="pointer-events-none absolute -top-40 right-[10%] h-[28rem] w-[28rem] rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle,#3776AB,transparent 65%)" }} />
        <div className="pointer-events-none absolute top-1/3 -left-40 h-[24rem] w-[24rem] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle,#FFD43B,transparent 65%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          {!embedded && (
            <Link to="/clubs/nadi-albrmja" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 transition hover:text-white">
              <ArrowRight className="h-4 w-4" /> نادي البرمجة
            </Link>
          )}

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD43B]/30 bg-[#FFD43B]/10 px-4 py-1.5 text-[12px] font-extrabold text-[#FFD43B]">
              <Sparkles className="h-4 w-4" /> رحلة تعلّم تفاعلية
            </div>
            <h1 className="mt-4 font-head text-4xl font-black leading-[1.2] sm:text-5xl">
              بايثون
              <span className="mx-2 text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(120deg,#4B8BBE,#FFD43B)" }}>من الصفر</span>
              حتى الاحتراف
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-slate-400 sm:text-[15px]">
              اقرأ المقال، افهم الكود الملوّن، ثم اجتز امتحان المقال لتفتح المرحلة التالية. كل مرحلة تُبنى على ما قبلها.
            </p>
          </div>

          {/* progress */}
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:p-6">
            <div className="flex items-center justify-between text-[13px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-slate-300"><Trophy className="h-4 w-4 text-[#FFD43B]" /> تقدّمك في الرحلة</span>
              <span className="text-white">{passed_count} / {total}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#3776AB,#4B8BBE,#FFD43B)" }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{pct}% مكتمل</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-400" /> +50 نقطة خبرة لكل مقال تجتازه</span>
            </div>
          </div>

          {/* placement */}
          {total > 0 && (
            <div className="mt-4 overflow-hidden rounded-3xl border border-[#3776AB]/30 bg-gradient-to-l from-[#3776AB]/15 to-transparent p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#3776AB]/20 text-[#4B8BBE]"><Gauge className="h-6 w-6" /></span>
                <div className="flex-1">
                  <div className="font-head text-[15px] font-extrabold sm:text-base">تعرف بايثون مسبقاً؟ تخطَّ ما تتقنه</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">حدد عدد المقالات التي درستها، وسنولّد لك اختباراً شاملاً ذكياً يغطيها جميعاً. اجتزه وافتح المراحل التالية مباشرة.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <label className="text-[12px] font-bold text-slate-400">درست أول</label>
                    <div className="relative">
                      <select value={placeN} onChange={(e) => setPlaceN(Number(e.target.value))}
                        className="appearance-none rounded-xl border border-white/15 bg-[#0a1628] py-2 pl-8 pr-3 text-sm font-extrabold text-white outline-none focus:border-[#4B8BBE]">
                        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <label className="text-[12px] font-bold text-slate-400">مقالات</label>
                    <button onClick={startPlacement} disabled={starting}
                      className="mr-auto rounded-xl px-5 py-2.5 text-[13px] font-extrabold text-[#0a1628] transition active:scale-95 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#FFD43B,#f5b800)" }}>
                      {starting ? "جارٍ التجهيز…" : "ابدأ الاختبار الشامل"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* journey path */}
          <div className="mt-10">
            <div className="mb-5 flex items-center gap-2 text-[13px] font-extrabold text-slate-400">
              <FileText className="h-4 w-4 text-[#4B8BBE]" /> مراحل الرحلة
            </div>
            {articles.length === 0 ? (
              <EmptyState icon={FileText} title="لا توجد مقالات بعد" desc="سيضيف المشرفون مقالات تعليم البايثون قريباً — ترقّب!" />
            ) : (
              <div className="relative">
                <div className="absolute bottom-6 right-[23px] top-6 w-[3px] rounded-full sm:right-[27px]" style={{ background: "linear-gradient(180deg,#10b981,#3776AB,rgba(255,255,255,0.08))" }} aria-hidden="true" />
                <div className="space-y-3.5">
                  {articles.map((a) => {
                    const st = a.passed ? "passed" : a.unlocked ? "current" : "locked";
                    const inner = (
                      <div className={`flex items-center gap-3.5 rounded-3xl border p-4 transition sm:gap-4 sm:p-5 ${st === "locked" ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/[0.05] backdrop-blur hover:border-[#4B8BBE]/40 hover:bg-white/[0.07]"}`}>
                        <NodeIcon st={st} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-300">المرحلة {a.order + 1}</span>
                            {a.passed && <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-300">مُجتازة</span>}
                            {st === "current" && <span className="rounded-lg bg-[#FFD43B]/15 px-2 py-0.5 text-[10.5px] font-extrabold text-[#FFD43B]">دورك الآن</span>}
                          </div>
                          <div className="mt-1.5 truncate font-head text-[15px] font-extrabold text-white sm:text-base">{a.title}</div>
                          {a.summary ? <div className="mt-0.5 truncate text-[12px] text-slate-400">{a.summary}</div> : null}
                          <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-slate-500">
                            {a.has_exam && <span className="inline-flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" /> امتحان · {a.questions_count} أسئلة</span>}
                          </div>
                        </div>
                        {st !== "locked" && <ChevronLeft className="h-5 w-5 shrink-0 text-slate-500" />}
                      </div>
                    );
                    return st === "locked" ? (
                      <div key={a.id} className="relative">{inner}</div>
                    ) : (
                      <Link key={a.id} to={`/python/${a.slug}`} className="relative block">{inner}</Link>
                    );
                  })}
                </div>
              </div>
            )}
            {next && (
              <button onClick={() => nav(`/python/${next.slug}`)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black text-white shadow-[0_18px_45px_-12px_rgba(55,118,171,0.7)] transition active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#3776AB,#4B8BBE)" }}>
                <Play className="h-5 w-5 fill-current" /> أكمل من حيث توقفت: {next.title}
              </button>
            )}
          </div>
        </div>
      </div>
  );
  return embedded ? inner : <Layout>{inner}</Layout>;
}
