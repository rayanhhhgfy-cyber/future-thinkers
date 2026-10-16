import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Layout, PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import {
  ArrowRight, ChevronLeft, Check, X, Trophy, RotateCcw,
  Sparkles, Flag, ListChecks, PartyPopper, Frown, Zap,
} from "lucide-react";

const LETTERS = ["أ", "ب", "ج", "د"];

function ScoreRing({ score, passed }) {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={passed ? "#10b981" : "#f43f5e"} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-head text-3xl font-black text-white">{score}%</div>
          <div className="text-[10.5px] font-bold text-slate-400">النتيجة</div>
        </div>
      </div>
    </div>
  );
}

export default function PythonExam() {
  const { slug } = useParams();
  const isPlacement = !slug;
  const loc = useLocation();
  const nav = useNavigate();
  const [exam, setExam] = useState(isPlacement ? loc.state?.session || null : null);
  const [articleId, setArticleId] = useState(null);
  const [key, setKey] = useState(null); // display -> original (article mode)
  const [sel, setSel] = useState({});
  const [cur, setCur] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showNav, setShowNav] = useState(false);

  // article mode: resolve slug -> id, then fetch exam
  useEffect(() => {
    if (isPlacement) return;
    let alive = true;
    (async () => {
      try {
        const { data: a } = await api.get(`/python-learn/articles/${slug}`);
        if (!alive) return;
        setArticleId(a.id);
        const { data: e } = await api.get(`/python-learn/exams/${a.id}`);
        if (!alive) return;
        setExam(e); setKey(e.key);
      } catch {
        if (alive) toast.error("تعذر تحميل الامتحان");
      }
    })();
    return () => { alive = false; };
  }, [slug, isPlacement]);

  const qs = useMemo(() => exam?.questions || [], [exam]);
  const answered = Object.keys(sel).length;

  const submit = async () => {
    if (answered < qs.length) { toast.error(`أجب عن جميع الأسئلة (${answered}/${qs.length})`); return; }
    setSubmitting(true);
    try {
      let data;
      if (isPlacement) {
        const answers = qs.map((_, i) => sel[i]);
        ({ data } = await api.post(`/python-learn/placement/${exam.session_id}/submit`, { answers }));
      } else {
        const orig = new Array(qs.length).fill(-1);
        qs.forEach((_, di) => { orig[key[di]] = sel[di]; });
        ({ data } = await api.post(`/python-learn/exams/${articleId}/submit`, { answers: orig }));
      }
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "تعذر تسليم الامتحان");
    } finally { setSubmitting(false); }
  };

  // map result details to display order
  const detailFor = (di) => {
    if (!result?.details) return null;
    const oi = isPlacement ? di : key[di];
    return result.details.find((d) => d.i === oi);
  };

  if (!exam)
    return (
      <Layout>
        <div dir="rtl" className="mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="text-slate-500">لا توجد جلسة اختبار — ابدأ من صفحة الرحلة.</p>
          <Link to="/python" className="mt-6 inline-block rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white">رحلة بايثون</Link>
        </div>
      </Layout>
    );

  /* ---------- results ---------- */
  if (result) {
    const passed = result.passed;
    return (
      <Layout>
        <div dir="rtl" className="min-h-screen text-white" style={{ background: "#0a1628" }}>
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="text-center">
              <span className={`mx-auto grid h-16 w-16 place-items-center rounded-3xl ${passed ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                {passed ? <PartyPopper className="h-8 w-8" /> : <Frown className="h-8 w-8" />}
              </span>
              <h1 className="mt-4 font-head text-3xl font-black sm:text-4xl">
                {passed ? "أحسنت! اجتزت الامتحان 🎉" : "لم توفَّق هذه المرة"}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-slate-400">
                {passed
                  ? isPlacement
                    ? `فتحت أول ${result.unlocked_count} مرحلة — أكمل رحلتك من حيث تستحق!`
                    : "فُتحت لك المرحلة التالية — واصل التقدم!"
                  : `تحتاج ${result.pass_score}% للاجتياز — راجع المقال وحاول مجدداً.`}
              </p>
              <div className="mt-6 flex justify-center"><ScoreRing score={result.score} passed={passed} /></div>
              <div className="mt-4 flex items-center justify-center gap-4 text-[13px] font-bold text-slate-400">
                <span>{result.correct} إجابة صحيحة من {result.total}</span>
                {passed && !isPlacement && <span className="inline-flex items-center gap-1 text-amber-300"><Zap className="h-4 w-4" /> +50 نقطة خبرة</span>}
                {passed && isPlacement && <span className="inline-flex items-center gap-1 text-amber-300"><Zap className="h-4 w-4" /> +100 نقطة خبرة</span>}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                {!passed && (
                  <button onClick={() => { setResult(null); setSel({}); setCur(0); }}
                    className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-[14px] font-extrabold text-[#0a1628]" style={{ background: "linear-gradient(135deg,#FFD43B,#f5b800)" }}>
                    <RotateCcw className="h-4 w-4" /> حاول مجدداً
                  </button>
                )}
                <Link to="/python" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-[14px] font-extrabold text-white transition hover:bg-white/10">
                  <Trophy className="h-4 w-4 text-[#FFD43B]" /> عودة إلى الرحلة
                </Link>
                {!isPlacement && passed && (
                  <Link to={`/python/${slug}`} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-[14px] font-extrabold text-white transition hover:bg-white/15">
                    مراجعة المقال
                  </Link>
                )}
              </div>
            </div>

            {/* review */}
            <div className="mt-10">
              <div className="mb-4 flex items-center gap-2 text-[14px] font-extrabold text-slate-300">
                <ListChecks className="h-5 w-5 text-[#4B8BBE]" /> مراجعة الإجابات
              </div>
              <div className="space-y-3">
                {qs.map((q, di) => {
                  const d = detailFor(di);
                  const ok = d?.correct;
                  return (
                    <div key={di} className={`rounded-3xl border p-4 sm:p-5 ${ok ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-rose-500/25 bg-rose-500/[0.06]"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${ok ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                          {ok ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-bold leading-relaxed text-white">{d?.q || q.q}</div>
                          {d?.article_title && <div className="mt-1 text-[11px] font-bold text-slate-500">من مقال: {d.article_title}</div>}
                          <div className="mt-2.5 space-y-1.5">
                            {(d?.choices || q.choices).map((c, ci) => (
                              <div key={ci} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] ${ci === d?.answer ? "bg-emerald-500/15 font-bold text-emerald-200" : "text-slate-400"}`}>
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/10 text-[11px] font-extrabold">{LETTERS[ci]}</span>
                                <span className="flex-1">{c}</span>
                                {ci === d?.answer && <Check className="h-4 w-4 text-emerald-300" />}
                              </div>
                            ))}
                          </div>
                          {d?.explanation && (
                            <div className="mt-2.5 rounded-xl bg-[#FFD43B]/10 px-3 py-2 text-[12.5px] leading-relaxed text-[#FFD43B]/90">💡 {d.explanation}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  /* ---------- exam runner ---------- */
  const q = qs[cur];
  return (
    <Layout>
      <div dir="rtl" className="min-h-screen text-white" style={{ background: "#0a1628" }}>
        <div className="pointer-events-none absolute left-[10%] top-0 h-72 w-72 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle,#3776AB,transparent 65%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <Link to={isPlacement ? "/python" : `/python/${slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 transition hover:text-white">
            <ArrowRight className="h-4 w-4" /> {isPlacement ? "رحلة بايثون" : "عودة إلى المقال"}
          </Link>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD43B]/30 bg-[#FFD43B]/10 px-3.5 py-1 text-[11.5px] font-extrabold text-[#FFD43B]">
                <Flag className="h-3.5 w-3.5" /> {isPlacement ? "اختبار تحديد المستوى الشامل" : `امتحان: ${exam.title}`}
              </div>
              <div className="mt-2 text-[12px] font-bold text-slate-500">تحتاج {exam.pass_score}% للاجتياز</div>
            </div>
            <button onClick={() => setShowNav((v) => !v)} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-bold text-slate-300">
              {answered}/{qs.length} <span className="text-slate-500">· تنقّل</span>
            </button>
          </div>

          {/* progress */}
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(answered / qs.length) * 100}%`, background: "linear-gradient(90deg,#3776AB,#FFD43B)" }} />
          </div>

          {showNav && (
            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {qs.map((_, i) => (
                <button key={i} onClick={() => { setCur(i); setShowNav(false); }}
                  className={`grid h-9 place-items-center rounded-xl text-[12px] font-extrabold transition ${i === cur ? "bg-[#FFD43B] text-[#0a1628]" : sel[i] !== undefined ? "bg-emerald-500/25 text-emerald-200" : "bg-white/5 text-slate-500 hover:bg-white/10"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* question card */}
          {q && (
            <div key={cur} className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur">
              <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4 sm:px-7">
                <div className="text-[11.5px] font-extrabold text-[#4B8BBE]">السؤال {cur + 1} من {qs.length}</div>
                <h2 className="mt-1.5 text-[16px] font-extrabold leading-[1.9] text-white sm:text-lg">{q.q}</h2>
                {q.article_title && <div className="mt-1 text-[11px] font-bold text-slate-500">من مقال: {q.article_title}</div>}
              </div>
              <div className="space-y-2.5 p-4 sm:p-6">
                {q.choices.map((c, ci) => {
                  const active = sel[cur] === ci;
                  return (
                    <button key={ci} onClick={() => setSel((s) => ({ ...s, [cur]: ci }))}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[0.99] sm:p-4 ${active ? "border-[#FFD43B]/60 bg-[#FFD43B]/10 shadow-[0_0_25px_-8px_rgba(255,212,59,0.5)]" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-black ${active ? "bg-[#FFD43B] text-[#0a1628]" : "bg-white/10 text-slate-300"}`}>
                        {LETTERS[ci]}
                      </span>
                      <span className={`flex-1 text-[14px] leading-relaxed sm:text-[15px] ${active ? "font-bold text-white" : "text-slate-300"}`}>{c}</span>
                      {active && <Check className="h-5 w-5 shrink-0 text-[#FFD43B]" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3.5 sm:px-6">
                <button disabled={cur === 0} onClick={() => setCur((v) => v - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4 rotate-180" /> السابق
                </button>
                {cur < qs.length - 1 ? (
                  <button onClick={() => setCur((v) => v + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-5 py-2.5 text-[13px] font-extrabold text-white transition hover:bg-white/15">
                    التالي <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={submit} disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-[13px] font-black text-[#0a1628] transition active:scale-95 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#10b981,#0d9488)" }}>
                    <Sparkles className="h-4 w-4" /> {submitting ? "جارٍ التصحيح…" : "تسليم الامتحان"}
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-[11.5px] font-bold text-slate-600">
            <Sparkles className="inline h-3.5 w-3.5 text-[#FFD43B]/60" /> أجب عن جميع الأسئلة قبل التسليم — يمكنك التنقل بينها بحرية
          </p>
        </div>
      </div>
    </Layout>
  );
}
