import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { FadeUp } from "@/components/anim";
import { BoardPanel, ShareResultButton } from "@/components/GameExtras";
import { BookOpen, ArrowRight, Delete, CornerDownLeft, Trophy, Zap, Eraser } from "lucide-react";

/* كلمة اليوم · Arabic Wordle, judged entirely by the server. */
const ROWS = 6, COLS = 5;
const KEYS = ["ضصثقفغعهخحجشسيبلاتنمكط", "ذدزروةىلأإآؤئ"];
const TILE = {
  correct: "bg-emerald-500 text-white border-emerald-600 shadow-lg",
  present: "bg-amber-400 text-white border-amber-500 shadow-lg",
  absent: "bg-slate-300 text-slate-500 border-slate-300",
};
const KEYC = {
  correct: "bg-emerald-500 text-white",
  present: "bg-amber-400 text-white",
  absent: "bg-slate-200 text-slate-400",
};

export default function WordGame() {
  const [data, setData] = useState(null);
  const [cur, setCur] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const load = async () => {
    try {
      const { data: d } = await api.get("/games/wordle/today");
      setData(d);
    } catch (e) { toast.error(apiErr(e)); setData({ tries: [], finished: true }); }
  };
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><PageLoader /></Layout>;
  const tries = data.tries || [];
  const finished = data.finished;
  const keyState = {};
  tries.forEach((t) => t.guess.split("").forEach((ch, i) => {
    const r = t.result[i];
    if (keyState[ch] === "correct") return;
    if (keyState[ch] === "present" && r !== "correct") return;
    keyState[ch] = r;
  }));

  const push = (ch) => { if (!finished && cur.length < COLS) setCur((c) => c + ch); };
  const pop = () => setCur((c) => c.slice(0, -1));

  const submit = async () => {
    if (cur.length !== COLS) return toast.info("أكمل الكلمة · 5 أحرف");
    setBusy(true);
    try {
      const { data: r } = await api.post("/games/wordle/guess", { guess: cur });
      setCur("");
      setResult(r);
      await load();
      if (r.badge) toast.success("شارة جديدة: سيد الكلمات 🏆");
      else if (r.won) toast.success(`أحسنت! فزت بـ ${r.tries_used} محاولات · +${r.xp_awarded} XP 🎉`);
      else if (r.finished) toast.info(`انتهت كلمة اليوم · الكلمة كانت «${r.answer}»`);
      else if (r.xp_awarded) toast.success(`+${r.xp_awarded} XP`);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const t = tries[r];
    const cells = [];
    for (let c = 0; c < COLS; c++) {
      let ch = "", cls = "bg-white/80 border-slate-200 text-slate-800";
      if (t) { ch = t.guess[c]; cls = TILE[t.result[c]]; }
      else if (r === tries.length && !finished) { ch = cur[c] || ""; cls = ch ? "bg-white border-amber-300 text-slate-900 shadow" : "bg-white/60 border-slate-200"; }
      cells.push(
        <div key={c} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 grid place-items-center text-xl sm:text-2xl font-black transition-all ${cls}`}>
          {ch}
        </div>
      );
    }
    grid.push(<div key={r} className="flex gap-1.5 sm:gap-2 justify-center">{cells}</div>);
  }

  const xpNote = result?.won ? `+${result.xp_awarded} XP` : "";

  return (
    <Layout>
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 text-white p-5 sm:p-7 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-14 -left-14 w-52 h-52 bg-white/15 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/25 px-3 py-1 text-[11px] font-black"><BookOpen className="w-3.5 h-3.5" /> لعبة اليوم</span>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-2.5">كلمة اليوم</h1>
                <p className="text-white/80 text-sm mt-1.5 max-w-lg leading-relaxed">خمّن الكلمة السرية من 5 أحرف في 6 محاولات · الأخضر حرف صحيح في مكانه، والأصفر موجود لكن في مكان آخر</p>
              </div>
              <Link to="/games" className="pressable shrink-0 inline-flex items-center gap-1.5 px-3.5 min-h-[42px] rounded-xl bg-white/15 ring-1 ring-white/25 text-sm font-extrabold hover:bg-white/25">
                <ArrowRight className="w-4 h-4" /> الساحة
              </Link>
            </div>
          </div>
        </FadeUp>

        <div className="grid lg:grid-cols-5 gap-5 items-start">
          <FadeUp className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
              <div className="space-y-1.5 sm:space-y-2">{grid}</div>

              {finished ? (
                <div className="mt-6 text-center space-y-4">
                  <div className={`rounded-2xl px-4 py-4 ${data.won ? "bg-emerald-50 ring-1 ring-emerald-100" : "bg-rose-50 ring-1 ring-rose-100"}`}>
                    <div className="font-head font-black text-lg text-slate-800 flex items-center justify-center gap-2">
                      {data.won ? <><Trophy className="w-5 h-5 text-amber-500" /> فزت بكلمة اليوم!</> : "انتهت محاولاتك اليوم"}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      الكلمة كانت <b className="text-slate-800">«{data.answer}»</b>
                      {data.won && <> · من {tries.length} محاولات {xpNote && <span className="inline-flex items-center gap-1 text-amber-600 font-black"><Zap className="w-3.5 h-3.5" />{xpNote}</span>}</>}
                      {" "}· عد غداً لكلمة جديدة
                    </p>
                  </div>
                  <ShareResultButton gameLabel="كلمة اليوم" title={data.won ? "فزت 🎉" : "حاولت اليوم"} score={data.won ? `${tries.length}/6` : "X/6"}
                    lines={[data.won ? `خمنت كلمة اليوم من ${tries.length} محاولات` : `الكلمة كانت ${data.answer}`, "تحدَّاني غداً في مفكرو المستقبل"]} color="#D97706" />
                </div>
              ) : (
                <>
                  <input ref={inputRef} value={cur} onChange={(e) => setCur(e.target.value.replace(/\s/g, "").slice(0, COLS))}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    placeholder="اكتب كلمتك هنا ثم Enter…"
                    className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 min-h-[50px] text-center text-lg font-black tracking-widest outline-none focus:ring-2 ring-amber-300 placeholder:text-sm placeholder:font-bold placeholder:tracking-normal" />
                  <div className="mt-4 space-y-2 select-none">
                    {KEYS.map((row, ri) => (
                      <div key={ri} className="flex gap-1.5 justify-center flex-wrap">
                        {row.split("").map((ch) => (
                          <button key={ch} onClick={() => push(ch)}
                            className={`pressable w-9 h-11 sm:w-10 sm:h-12 rounded-xl text-base font-black shadow-sm transition ${keyState[ch] ? KEYC[keyState[ch]] : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                            {ch}
                          </button>
                        ))}
                        {ri === 1 && (
                          <>
                            <button onClick={submit} disabled={busy} aria-label="إرسال"
                              className="pressable w-11 h-11 sm:h-12 rounded-xl bg-amber-500 text-white grid place-items-center shadow disabled:opacity-50">
                              <CornerDownLeft className="w-5 h-5" />
                            </button>
                            <button onClick={pop} aria-label="حذف"
                              className="pressable w-11 h-11 sm:h-12 rounded-xl bg-slate-700 text-white grid place-items-center shadow">
                              <Delete className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
                    <Eraser className="w-3 h-3" /> تُحتسب الحروف المهموزة والمشدّدة بمرونة · المحاولة {Math.min(tries.length + 1, 6)} من 6
                  </p>
                </>
              )}
            </div>
          </FadeUp>
          <FadeUp delay={0.08} className="lg:col-span-2">
            <BoardPanel game="wordle" accent="#D97706" />
          </FadeUp>
        </div>
      </div>
    </Layout>
  );
}
