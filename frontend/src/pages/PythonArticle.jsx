import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Layout, PageLoader } from "@/components/Layout";
import { renderArticle } from "@/lib/pythonContent";
import {
  ArrowRight, ChevronLeft, Lock, Check, HelpCircle,
  Trophy, Zap, BookOpen, PenLine,
} from "lucide-react";

export default function PythonArticle() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [art, setArt] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setArt(null); setFailed(false);
    api.get(`/python-learn/articles/${slug}`)
      .then((r) => setArt(r.data))
      .catch(() => setFailed(true));
  }, [slug]);

  if (failed)
    return (
      <Layout>
        <div dir="rtl" className="mx-auto max-w-2xl px-4 py-24 text-center">
          <Lock className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 font-head text-2xl font-black text-slate-900">المقال غير متاح</h1>
          <p className="mt-2 text-slate-500">ربما لم تُكمل المراحل السابقة بعد — الرحلة تسير خطوة بخطوة.</p>
          <Link to="/python" className="mt-6 inline-block rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white">عودة إلى الرحلة</Link>
        </div>
      </Layout>
    );
  if (!art) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div dir="rtl" className="min-h-screen bg-[#faf8f4]">
        {/* dark hero */}
        <div className="relative overflow-hidden text-white" style={{ background: "#0a1628" }}>
          <div className="pointer-events-none absolute -top-24 left-[15%] h-72 w-72 rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle,#3776AB,transparent 65%)" }} />
          <div className="pointer-events-none absolute -bottom-24 right-[10%] h-64 w-64 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle,#FFD43B,transparent 65%)" }} />
          <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
            <Link to="/python" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400 transition hover:text-white">
              <ArrowRight className="h-4 w-4" /> رحلة بايثون
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-xl bg-[#FFD43B]/15 px-3 py-1 text-[12px] font-extrabold text-[#FFD43B]">المرحلة {art.order + 1} من {art.total}</span>
              {art.passed && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1 text-[12px] font-extrabold text-emerald-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} /> مُجتازة {art.score != null ? `· ${art.score}%` : ""}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-head text-[1.7rem] font-black leading-[1.35] sm:text-4xl">{art.title}</h1>
            {art.summary ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-400">{art.summary}</p> : null}
            {/* stage progress dots */}
            <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: art.total }, (_, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < art.order + 1 ? "linear-gradient(90deg,#3776AB,#FFD43B)" : "rgba(255,255,255,0.12)" }} />
              ))}
            </div>
          </div>
        </div>

        {/* paper body */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <article className="-mt-2 rounded-[2rem] border border-slate-100 bg-white px-5 py-7 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.25)] sm:px-10 sm:py-10">
            <div className="mb-6 flex items-center gap-2 border-b border-slate-100 pb-5 text-[13px] font-bold text-slate-400">
              <BookOpen className="h-4 w-4 text-emerald-600" /> اقرأ بتمعّن — الامتحان يغطي كل ما في المقال
            </div>
            {renderArticle(art.content)}
          </article>

          {/* exam CTA */}
          <div className="my-8 overflow-hidden rounded-[2rem] p-[1.5px]" style={{ background: "linear-gradient(135deg,#3776AB,#FFD43B)" }}>
            <div className="rounded-[calc(2rem-1.5px)] bg-[#0a1628] p-6 text-center text-white sm:p-8">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFD43B]/15 text-[#FFD43B]"><PenLine className="h-7 w-7" /></span>
              <h3 className="mt-3 font-head text-xl font-black sm:text-2xl">
                {art.passed ? "أعد الاختبار وحسّن نتيجتك" : "هل أتقنت المقال؟ أثبت ذلك"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-400">
                {art.has_exam
                  ? `امتحان من ${art.questions_count} أسئلة — تحتاج ${60}% على الأقل لاجتياز المرحلة وفتح التالية.`
                  : "سيضيف المشرف امتحان هذا المقال قريباً."}
              </p>
              {art.has_exam && (
                <button onClick={() => nav(`/python/${art.slug}/exam`)}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-[15px] font-black text-[#0a1628] transition active:scale-95"
                  style={{ background: "linear-gradient(135deg,#FFD43B,#f5b800)" }}>
                  <HelpCircle className="h-5 w-5" /> {art.passed ? "إعادة الامتحان" : "ابدأ الامتحان"}
                </button>
              )}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-slate-500">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> اجتياز الامتحان = +50 نقطة خبرة
              </div>
            </div>
          </div>

          {/* prev / next */}
          <div className="mb-16 grid grid-cols-2 gap-3">
            {art.prev_slug ? (
              <Link to={`/python/${art.prev_slug}`} className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[13.5px] font-extrabold text-slate-700 transition hover:border-slate-300">
                <ChevronLeft className="h-4 w-4 rotate-180" /> المرحلة السابقة
              </Link>
            ) : <span />}
            {art.next_slug ? (
              <Link to={`/python/${art.next_slug}`} className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-3.5 text-[13.5px] font-extrabold text-white transition hover:bg-slate-800">
                المرحلة التالية <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/python" className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-3.5 text-[13.5px] font-extrabold text-white transition hover:bg-slate-800">
                <Trophy className="h-4 w-4 text-[#FFD43B]" /> عودة إلى الرحلة
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
