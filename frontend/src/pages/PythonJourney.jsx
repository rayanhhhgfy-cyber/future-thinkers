import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import {
  ChevronLeft, Lock, Check, Play, Trophy, Sparkles, Zap,
  FileText, HelpCircle, ArrowRight, Gauge, ChevronDown, BookOpen,
} from "lucide-react";

const BLUE = "#3776AB";
const BLUE_D = "#255a85";
const YELLOW = "#FFD43B";

function NodeIcon({ st }) {
  if (st === "passed")
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg sm:h-14 sm:w-14" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
        <Check className="h-6 w-6" strokeWidth={3} />
      </span>
    );
  if (st === "current")
    return (
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg sm:h-14 sm:w-14" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
        <span className="absolute inset-0 animate-ping rounded-2xl opacity-30" style={{ background: BLUE }} />
        <Play className="relative h-6 w-6 fill-current" />
      </span>
    );
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-400 sm:h-14 sm:w-14">
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
    <div dir="rtl" className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/40">
      {/* soft ambient blobs like other pages */}
      <div className="pointer-events-none absolute -top-24 left-[8%] h-72 w-72 rounded-full blur-3xl opacity-20" style={{ background: BLUE }} />
      <div className="pointer-events-none absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl opacity-15" style={{ background: YELLOW }} />

      <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {!embedded && (
          <Link to="/clubs/nadi-albrmja" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition hover:text-slate-900">
            <ArrowRight className="h-4 w-4" /> نادي البرمجة
          </Link>
        )}

        {/* hero */}
        <div className="mt-4 overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_-20px_rgba(55,118,171,0.25)] ring-1 ring-slate-100 sm:p-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.75rem] text-5xl shadow-xl sm:h-24 sm:w-24" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
              🐍
            </span>
            <div className="min-w-0 flex-1 text-center sm:text-right">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold" style={{ background: `${YELLOW}22`, color: "#a16207" }}>
                <Sparkles className="h-3.5 w-3.5" /> رحلة تعلّم تفاعلية
              </div>
              <h1 className="mt-2 font-head text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                بايثون <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(120deg,${BLUE},#f59e0b)` }}>من الصفر</span> حتى الاحتراف
              </h1>
              <p className="mx-auto mt-2 max-w-xl text-[13.5px] leading-relaxed text-slate-500 sm:mx-0 sm:text-sm">
                اقرأ المقال، افهم الكود الملوّن، ثم اجتز امتحان المقال لتفتح المرحلة التالية. كل مرحلة تُبنى على ما قبلها.
              </p>
            </div>
          </div>

          {/* progress */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:p-5">
            <div className="flex items-center justify-between text-[13px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-slate-700"><Trophy className="h-4 w-4" style={{ color: "#d97706" }} /> تقدّمك في الرحلة</span>
              <span className="text-slate-900">{passed_count} / {total}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${BLUE},#f59e0b)` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{pct}% مكتمل</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> +50 نقطة خبرة لكل مقال تجتازه</span>
            </div>
          </div>
        </div>

        {/* placement */}
        {total > 0 && (
          <div className="mt-4 overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_16px_40px_-18px_rgba(55,118,171,0.2)] ring-1 ring-slate-100 sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
                <Gauge className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-head text-[15px] font-extrabold text-slate-900 sm:text-base">تعرف بايثون مسبقاً؟ تخطَّ ما تتقنه</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">حدد عدد المقالات التي درستها، وسنولّد لك اختباراً شاملاً ذكياً يغطيها جميعاً. اجتزه وافتح المراحل التالية مباشرة.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <label className="text-[12px] font-bold text-slate-500">درست أول</label>
                  <div className="relative">
                    <select value={placeN} onChange={(e) => setPlaceN(Number(e.target.value))}
                      className="appearance-none rounded-xl border-2 border-slate-100 bg-white py-2 pl-8 pr-3 text-sm font-extrabold text-slate-900 outline-none transition focus:border-blue-300">
                      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <label className="text-[12px] font-bold text-slate-500">مقالات</label>
                  <button onClick={startPlacement} disabled={starting}
                    className="mr-auto rounded-xl px-5 py-2.5 text-[13px] font-extrabold text-white shadow-md transition active:scale-95 disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
                    {starting ? "جارٍ التجهيز…" : "ابدأ الاختبار الشامل"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* journey path */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-700">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white shadow" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            مراحل الرحلة
            <span className="mr-auto rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">{total} مراحل</span>
          </div>
          {articles.length === 0 ? (
            <div className="rounded-[1.75rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
              <EmptyState icon={FileText} title="لا توجد مقالات بعد" desc="سيضيف المشرفون مقالات تعليم البايثون قريباً — ترقّب!" />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute bottom-8 right-[27px] top-8 w-1 rounded-full bg-gradient-to-b from-emerald-400 via-blue-400 to-slate-200 sm:right-[31px]" aria-hidden="true" />
              <div className="space-y-3">
                {articles.map((a) => {
                  const st = a.passed ? "passed" : a.unlocked ? "current" : "locked";
                  const innerCard = (
                    <div className={`flex items-center gap-3.5 rounded-[1.5rem] bg-white p-4 shadow-[0_10px_35px_-15px_rgba(15,23,42,0.15)] ring-1 transition sm:gap-4 sm:p-5 ${
                      st === "locked"
                        ? "opacity-55 ring-slate-100"
                        : "ring-slate-100 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-15px_rgba(55,118,171,0.35)] hover:ring-blue-200"
                    }`}>
                      <NodeIcon st={st} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-600">المرحلة {a.order + 1}</span>
                          {a.passed && <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-600 ring-1 ring-emerald-100">✓ مُجتازة</span>}
                          {st === "current" && <span className="rounded-lg px-2 py-0.5 text-[10.5px] font-extrabold text-white shadow" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>دورك الآن</span>}
                        </div>
                        <div className="mt-1.5 truncate font-head text-[15px] font-extrabold text-slate-900 sm:text-base">{a.title}</div>
                        {a.summary ? <div className="mt-0.5 truncate text-[12px] text-slate-500">{a.summary}</div> : null}
                        {a.has_exam && (
                          <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-100">
                            <HelpCircle className="h-3.5 w-3.5" /> امتحان · {a.questions_count} أسئلة
                          </div>
                        )}
                      </div>
                      {st !== "locked" && (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow transition group-hover:scale-110" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
                          <ChevronLeft className="h-5 w-5" />
                        </span>
                      )}
                    </div>
                  );
                  return st === "locked" ? (
                    <div key={a.id} className="relative">{innerCard}</div>
                  ) : (
                    <Link key={a.id} to={`/python/${a.slug}`} className="group relative block">{innerCard}</Link>
                  );
                })}
              </div>
            </div>
          )}
          {next && (
            <button onClick={() => nav(`/python/${next.slug}`)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black text-white shadow-[0_18px_45px_-12px_rgba(55,118,171,0.5)] transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
              <Play className="h-5 w-5 fill-current" /> أكمل من حيث توقفت: {next.title}
            </button>
          )}
        </div>
      </div>
    </div>
  );
  return embedded ? inner : <Layout>{inner}</Layout>;
}
