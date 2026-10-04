import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { FadeUp } from "@/components/anim";
import { BoardPanel, ShareResultButton } from "@/components/GameExtras";
import { Keyboard, ArrowRight, Play, Zap, RotateCcw, Gauge, Target } from "lucide-react";

/* سباق الكتابة · server issues the text and measures the clock. */
export default function TypingRace() {
  const [lang, setLang] = useState("ar");
  const [session, setSession] = useState(null); // {session_id, text}
  const [typed, setTyped] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [liveSec, setLiveSec] = useState(0);
  const tickRef = useRef(null);
  const areaRef = useRef(null);

  const stopTick = () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  useEffect(() => () => stopTick(), []);

  const start = async (lg = lang) => {
    setBusy(true);
    stopTick();
    try {
      const { data: r } = await api.get(`/games/typing/text?lang=${lg}`);
      setSession(r);
      setTyped("");
      setRes(null);
      setLiveSec(0);
      const t0 = Date.now();
      tickRef.current = setInterval(() => setLiveSec(Math.floor((Date.now() - t0) / 1000)), 500);
      setTimeout(() => areaRef.current?.focus(), 80);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const submit = async (value) => {
    if (!session || res) return;
    setBusy(true);
    stopTick();
    try {
      const { data: r } = await api.post("/games/typing/submit", { session_id: session.session_id, typed: value });
      setRes(r);
      if (r.badge) toast.success("شارة جديدة: الأصابع الذهبية ⌨️");
      else if (r.xp_awarded) toast.success(`+${r.xp_awarded} XP · ${r.wpm} كلمة/دقيقة`);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  useEffect(() => {
    if (session && typed.length >= session.text.length && !res) submit(typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const original = session?.text || "";
  const progress = original ? Math.min(100, Math.round((typed.length / original.length) * 100)) : 0;

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 sm:p-7 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-14 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/25 px-3 py-1 text-[11px] font-black"><Keyboard className="w-3.5 h-3.5" /> سرعة ودقة</span>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-2.5">سباق الكتابة</h1>
                <p className="text-white/80 text-sm mt-1.5 max-w-lg leading-relaxed">اكتب النص كما هو بأسرع ما تستطيع · السرعة تُقاس بالكلمات في الدقيقة، والأخطاء تخفض نتيجتك</p>
              </div>
              <Link to="/games" className="pressable shrink-0 inline-flex items-center gap-1.5 px-3.5 min-h-[42px] rounded-xl bg-white/15 ring-1 ring-white/25 text-sm font-extrabold hover:bg-white/25">
                <ArrowRight className="w-4 h-4" /> الساحة
              </Link>
            </div>
          </div>
        </FadeUp>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          <FadeUp className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                  {[{ k: "ar", l: "العربية" }, { k: "en", l: "English" }].map((t) => (
                    <button key={t.k} onClick={() => { setLang(t.k); setSession(null); setRes(null); setTyped(""); stopTick(); }}
                      className={`pressable px-4 min-h-[38px] rounded-lg text-xs font-extrabold transition ${lang === t.k ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
                      {t.l}
                    </button>
                  ))}
                </div>
                {session && !res && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400">
                    <Gauge className="w-4 h-4" /> <span dir="ltr">{liveSec}s</span> · {progress}%
                  </span>
                )}
              </div>

              {!session && !res && (
                <div className="text-center py-10">
                  <span className="mx-auto w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 grid place-items-center"><Keyboard className="w-10 h-10" /></span>
                  <h2 className="font-head text-2xl font-black text-slate-800 mt-5">كم كلمة تكتب في الدقيقة؟</h2>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">يبدأ الزمن لحظة ظهور النص · اكتبه كاملاً وستُحسب نتيجتك فور انتهائك</p>
                  <button onClick={() => start()} disabled={busy}
                    className="pressable mt-6 inline-flex items-center gap-2 px-7 min-h-[52px] rounded-2xl bg-emerald-600 text-white font-head font-extrabold shadow-xl hover:bg-emerald-500 disabled:opacity-50">
                    <Play className="w-5 h-5" /> ابدأ السباق
                  </button>
                </div>
              )}

              {session && (
                <>
                  <div className="mt-5 rounded-2xl bg-slate-50 ring-1 ring-slate-100 p-4 sm:p-5" dir={session.lang === "en" ? "ltr" : "rtl"}>
                    <p className="text-lg sm:text-xl leading-[2.2] font-semibold select-none" aria-label="النص المطلوب كتابته">
                      {original.split("").map((ch, i) => {
                        let cls = "text-slate-400";
                        if (i < typed.length) cls = typed[i] === ch ? "text-emerald-600 bg-emerald-100/70 rounded" : "text-rose-600 bg-rose-100 rounded";
                        else if (i === typed.length) cls = "text-slate-700 underline decoration-emerald-400 decoration-2 underline-offset-4";
                        return <span key={i} className={cls}>{ch}</span>;
                      })}
                    </p>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {!res ? (
                    <textarea ref={areaRef} value={typed} dir={session.lang === "en" ? "ltr" : "rtl"}
                      onChange={(e) => setTyped(e.target.value.slice(0, original.length))}
                      onPaste={(e) => { e.preventDefault(); toast.info("اللصق ممنوع · اكتب بنفسك ⌨️"); }}
                      rows={3} placeholder={session.lang === "en" ? "Start typing here…" : "ابدأ الكتابة هنا…"}
                      className="mt-4 w-full rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 px-4 py-3 text-lg leading-relaxed outline-none focus:border-emerald-400 resize-none" />
                  ) : (
                    <div className="mt-6 text-center">
                      <div className="font-head text-lg font-extrabold text-slate-500">سرعتك</div>
                      <div className="font-head text-6xl sm:text-7xl font-black text-slate-900 mt-1"><span dir="ltr">{res.wpm}</span> <span className="text-2xl text-slate-400">كلمة/د</span></div>
                      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 px-3 py-1 text-xs font-black"><Target className="w-3.5 h-3.5" /> الدقة <span dir="ltr">{res.accuracy}%</span></span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-black">النتيجة <span dir="ltr">{res.score}</span></span>
                        {res.xp_awarded > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-white px-3 py-1 text-xs font-black shadow"><Zap className="w-3.5 h-3.5" /> +{res.xp_awarded} XP</span>}
                      </div>
                      {res.badge && <div className="mt-3 text-sm font-black text-emerald-700">شارة جديدة: الأصابع الذهبية ⌨️</div>}
                      <div className="mt-6 flex items-center justify-center gap-2.5 flex-wrap">
                        <button onClick={() => start()} disabled={busy} className="pressable inline-flex items-center gap-2 px-6 min-h-[50px] rounded-2xl bg-emerald-600 text-white font-head font-extrabold shadow-xl hover:bg-emerald-500 disabled:opacity-50">
                          <RotateCcw className="w-4.5 h-4.5" /> نص جديد
                        </button>
                        <ShareResultButton gameLabel="سباق الكتابة" title="سرعتي" score={`${res.wpm} wpm`}
                          lines={[`دقة ${res.accuracy}% في سباق الكتابة`, res.wpm >= 45 ? "من أصحاب الأصابع الذهبية" : "في طريقي للأصابع الذهبية", "تحدَّاني في مفكرو المستقبل"]} color="#059669" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </FadeUp>
          <FadeUp delay={0.08} className="lg:col-span-2">
            <BoardPanel game="typing" accent="#059669" />
          </FadeUp>
        </div>
      </div>
    </Layout>
  );
}
