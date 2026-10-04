import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { FadeUp } from "@/components/anim";
import { BoardPanel, ShareResultButton } from "@/components/GameExtras";
import { Calculator, ArrowRight, Play, Timer, Zap, Check, X, RotateCcw } from "lucide-react";

/* سباق الحساب · 20 server-generated questions, 60 seconds, server-timed. */
export default function MathSprint() {
  const [phase, setPhase] = useState("idle"); // idle | playing | done
  const [runId, setRunId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [cur, setCur] = useState("");
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(60);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  useEffect(() => () => clearTimer(), []);

  const finish = async (finalAnswers) => {
    clearTimer();
    setBusy(true);
    try {
      const { data: r } = await api.post("/games/math/submit", { run_id: runId, answers: finalAnswers });
      setRes(r);
      setPhase("done");
      if (r.badge) toast.success("شارة جديدة: الحاسوب البشري 🧮");
      else if (r.xp_awarded) toast.success(`+${r.xp_awarded} XP · ${r.correct}/${r.total} إجابة صحيحة`);
    } catch (e) { toast.error(apiErr(e)); setPhase("idle"); }
    setBusy(false);
  };

  const start = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.post("/games/math/start");
      setRunId(r.run_id);
      setQuestions(r.questions || []);
      setAnswers([]);
      setCur("");
      setIdx(0);
      setLeft(r.seconds || 60);
      setRes(null);
      setPhase("playing");
      setTimeout(() => inputRef.current?.focus(), 80);
      const endAt = Date.now() + (r.seconds || 60) * 1000;
      clearTimer();
      timerRef.current = setInterval(() => {
        const l = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        setLeft(l);
        if (l <= 0) {
          clearTimer();
        }
      }, 250);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  useEffect(() => {
    if (phase === "playing" && left <= 0) {
      const final = [...answers];
      final[idx] = cur === "" ? null : Number(cur);
      finish(final.map((v) => (v === undefined ? null : v)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  const next = () => {
    const final = [...answers];
    final[idx] = cur === "" ? null : Number(cur);
    setAnswers(final);
    setCur("");
    if (idx + 1 >= questions.length) {
      finish(final.map((v) => (v === undefined ? null : v)));
    } else {
      setIdx(idx + 1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const pct = questions.length ? Math.round(((idx) / questions.length) * 100) : 0;

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-blue-600 via-indigo-600 to-violet-600 text-white p-5 sm:p-7 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/25 px-3 py-1 text-[11px] font-black"><Calculator className="w-3.5 h-3.5" /> ضد الساعة</span>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-2.5">سباق الحساب</h1>
                <p className="text-white/80 text-sm mt-1.5 max-w-lg leading-relaxed">20 عملية حسابية في 60 ثانية · الأسئلة تُولّد وتُصحّح على الخادم، والزمن يُقاس هناك أيضاً</p>
              </div>
              <Link to="/games" className="pressable shrink-0 inline-flex items-center gap-1.5 px-3.5 min-h-[42px] rounded-xl bg-white/15 ring-1 ring-white/25 text-sm font-extrabold hover:bg-white/25">
                <ArrowRight className="w-4 h-4" /> الساحة
              </Link>
            </div>
          </div>
        </FadeUp>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          <FadeUp className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-7 min-h-[380px] flex flex-col">
              {phase === "idle" && (
                <div className="flex-1 grid place-items-center text-center py-8">
                  <div>
                    <span className="mx-auto w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 grid place-items-center"><Timer className="w-10 h-10" /></span>
                    <h2 className="font-head text-2xl font-black text-slate-800 mt-5">جاهز للسباق؟</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mt-2 max-w-sm mx-auto">
                      أجب أكبر عدد ممكن خلال 60 ثانية · الإجابة الصحيحة +10 والخاطئة −2
                      · أفضل جولة اليوم كاملة النقاط، وبعدها نقاط رمزية
                    </p>
                    <button onClick={start} disabled={busy}
                      className="pressable mt-6 inline-flex items-center gap-2 px-7 min-h-[52px] rounded-2xl bg-blue-600 text-white font-head font-extrabold shadow-xl hover:bg-blue-500 disabled:opacity-50">
                      <Play className="w-5 h-5" /> ابدأ الجولة
                    </button>
                  </div>
                </div>
              )}

              {phase === "playing" && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-head font-black text-sm shrink-0 ${left <= 10 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-blue-50 text-blue-700"}`}>
                      <Timer className="w-4 h-4" /> <span dir="ltr">{left}s</span>
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-l from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-400 shrink-0" dir="ltr">{idx + 1}/{questions.length}</span>
                  </div>
                  <div className="flex-1 grid place-items-center py-8">
                    <div className="text-center">
                      <div className="font-head font-black text-5xl sm:text-6xl text-slate-900 tracking-wide" dir="ltr">{questions[idx]}</div>
                      <div className="mt-6 flex items-center justify-center gap-2">
                        <input ref={inputRef} value={cur} inputMode="numeric" dir="ltr"
                          onChange={(e) => setCur(e.target.value.replace(/[^0-9-]/g, ""))}
                          onKeyDown={(e) => { if (e.key === "Enter") next(); }}
                          placeholder="؟"
                          className="w-40 rounded-2xl border-2 border-blue-200 bg-blue-50/60 px-4 py-3 text-center text-3xl font-black outline-none focus:border-blue-400" />
                        <button onClick={next} className="pressable min-h-[56px] px-5 rounded-2xl bg-blue-600 text-white font-head font-extrabold shadow-lg hover:bg-blue-500">
                          التالي
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-4">Enter للإجابة التالية · اتركها فارغة للتخطي</p>
                    </div>
                  </div>
                </div>
              )}

              {phase === "done" && res && (
                <div className="flex-1">
                  <div className="text-center">
                    <div className="font-head text-lg font-extrabold text-slate-500">نتيجتك</div>
                    <div className="font-head text-7xl font-black text-slate-900 mt-1" dir="ltr">{res.score}</div>
                    <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 px-3 py-1 text-xs font-black"><Check className="w-3.5 h-3.5" /> {res.correct} صحيحة</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100 px-3 py-1 text-xs font-black"><X className="w-3.5 h-3.5" /> {res.total - res.correct} خاطئة/متروكة</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-100 px-3 py-1 text-xs font-black"><Timer className="w-3.5 h-3.5" /> <span dir="ltr">{res.duration_s}s</span></span>
                      {res.xp_awarded > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-white px-3 py-1 text-xs font-black shadow"><Zap className="w-3.5 h-3.5" /> +{res.xp_awarded} XP</span>}
                    </div>
                    {res.badge && <div className="mt-3 text-sm font-black text-blue-700">شارة جديدة: الحاسوب البشري 🧮</div>}
                    <div className="mt-6 flex items-center justify-center gap-2.5 flex-wrap">
                      <button onClick={start} disabled={busy} className="pressable inline-flex items-center gap-2 px-6 min-h-[50px] rounded-2xl bg-blue-600 text-white font-head font-extrabold shadow-xl hover:bg-blue-500 disabled:opacity-50">
                        <RotateCcw className="w-4.5 h-4.5" /> جولة جديدة
                      </button>
                      <ShareResultButton gameLabel="سباق الحساب" title="نتيجتي" score={res.score}
                        lines={[`${res.correct} إجابة صحيحة من ${res.total}`, `في ${res.duration_s} ثانية فقط`, "تحدَّاني في مفكرو المستقبل"]} color="#2563EB" />
                    </div>
                  </div>
                  <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {res.detail.map((d, i) => (
                      <div key={i} className={`rounded-xl px-2 py-1.5 text-center text-[11px] font-bold ${d.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                        <span dir="ltr">{d.q} = {d.a}</span>{!d.ok && d.got !== null && <span className="block opacity-70">إجابتك: <span dir="ltr">{d.got}</span></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </FadeUp>
          <FadeUp delay={0.08} className="lg:col-span-2">
            <BoardPanel game="math" accent="#2563EB" />
          </FadeUp>
        </div>
      </div>
    </Layout>
  );
}
