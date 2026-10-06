import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Crosshair, BookOpenCheck, Gauge } from "lucide-react";
import ChessBoardView from "./ChessBoardView";
import { useChessTheme, useSyncedPieces } from "./shared";
import { analyseGame, VERDICTS } from "./engine";
import { detectOpening } from "./openings";

const V_STYLE = {
  best: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  good: "bg-teal-500/15 text-teal-300 border-teal-400/30",
  ok: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  inaccuracy: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  mistake: "bg-orange-500/15 text-orange-300 border-orange-400/40",
  blunder: "bg-rose-500/20 text-rose-300 border-rose-400/45",
};
const vLabel = (id) => (VERDICTS.find((v) => v.id === id) || {}).label || id;

/** Full post-game analysis: every move graded, best move shown per position. */
export default function ChessAnalysis({ sans, myColor = "w", opponentLabel = "الخصم", onClose }) {
  const [theme, themeId, setTheme] = useChessTheme();
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selPly, setSelPly] = useState(-1);
  const [review, setReview] = useState(() => new Chess());
  const [rtick, setRtick] = useState(0);
  const pieces = useSyncedPieces(review, rtick);
  const cancelRef = useRef(false);
  const listRef = useRef(null);

  const opening = useMemo(() => detectOpening(sans), [sans]);

  useEffect(() => {
    cancelRef.current = false;
    setData(null); setProgress(0); setSelPly(-1);
    analyseGame(sans, {
      depth: 2,
      onProgress: (done, total) => { if (!cancelRef.current) setProgress(Math.round((done / total) * 100)); },
    }).then((res) => { if (!cancelRef.current) { setData(res); setProgress(100); } });
    return () => { cancelRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sans]);

  const jump = (ply) => {
    const c = new Chess();
    for (let i = 0; i <= ply && i < sans.length; i++) c.move(sans[i]);
    setReview(c); setRtick((t) => t + 1); setSelPly(ply);
  };

  const selMove = selPly >= 0 && data ? data.moves[selPly] : null;
  const lastMoveForBoard = (() => {
    if (selPly < 0) return null;
    const c = new Chess();
    for (let i = 0; i < selPly; i++) c.move(sans[i]);
    const mv = c.move(sans[selPly]);
    return mv ? { from: mv.from, to: mv.to } : null;
  })();

  const pairs = [];
  if (data) {
    data.moves.forEach((m, i) => {
      if (i % 2 === 0) pairs.push([m]);
      else pairs[pairs.length - 1].push(m);
    });
  }

  const myAcc = myColor === "w" ? data?.accuracyW : data?.accuracyB;
  const opAcc = myColor === "w" ? data?.accuracyB : data?.accuracyW;
  const myCounts = data ? data.totals[myColor].counts : {};
  const badCount = (myCounts.mistake || 0) + (myCounts.blunder || 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/85 backdrop-blur-md" dir="rtl">
      <div className="min-h-full w-full max-w-[1200px] mx-auto px-3 sm:px-6 py-5 lg:py-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-head text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-600/30">
              <Gauge className="w-5 h-5 text-white" />
            </span>
            تحليل المباراة
          </h2>
          <button onClick={onClose} className="w-11 h-11 grid place-items-center rounded-full bg-white/[0.07] border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.12] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!data ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-8 text-center">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-slate-200 font-bold mb-1">المحرك يراجع كل نقلة…</p>
            <p className="text-slate-400 text-sm mb-5">نقيّم {sans.length} نقلة ونطلع أفضل نقلة بكل موقف</p>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden max-w-md mx-auto" dir="ltr">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                animate={{ width: `${progress}%` }} transition={{ ease: "easeOut", duration: 0.3 }} />
            </div>
            <p className="text-violet-300 font-black mt-3 tabular-nums">{progress}%</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
            <div className="min-w-0">
              <ChessBoardView
                chess={review} pieces={pieces} theme={theme} themeId={themeId} setTheme={setTheme}
                orientation={myColor} flipped={false} setFlipped={() => {}}
                sel={null} legal={[]} lastMove={lastMoveForBoard} kingSq={null}
                onSquareClick={() => {}} movableColor={null} showToolbar={false}
                promo={null} onPromote={() => {}} onCancelPromo={() => {}} />
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => selPly > -1 && jump(selPly - 1)} disabled={selPly <= 0}
                  className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] border border-white/10 px-4 h-10 text-sm font-bold text-slate-200 hover:bg-white/[0.12] disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" /> السابق
                </button>
                <span className="text-xs text-slate-400 font-bold tabular-nums">{selPly < 0 ? "اختر نقلة من القائمة" : `النقلة ${selPly + 1} من ${sans.length}`}</span>
                <button onClick={() => selPly < sans.length - 1 && jump(selPly + 1)} disabled={selPly >= sans.length - 1}
                  className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] border border-white/10 px-4 h-10 text-sm font-bold text-slate-200 hover:bg-white/[0.12] disabled:opacity-40">
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              {selMove && (
                <motion.div key={selPly} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-white text-lg" dir="ltr">{selMove.san}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${V_STYLE[selMove.verdict]}`}>{vLabel(selMove.verdict)}</span>
                    {selMove.color === myColor
                      ? <span className="text-[11px] font-bold text-slate-400">نقلتك</span>
                      : <span className="text-[11px] font-bold text-slate-400">نقلة {opponentLabel}</span>}
                  </div>
                  {selMove.isBest ? (
                    <p className="text-emerald-300 text-sm font-bold mt-2.5">⭐ لعبت أفضل نقلة ممكنة بهالموقف</p>
                  ) : (
                    <p className="text-sm text-slate-300 mt-2.5">
                      الأفضل هنا كان <span className="font-mono font-black text-amber-300" dir="ltr">{selMove.bestSan}</span>
                      <span className="text-slate-400"> · خسارة التقييم {Math.round(selMove.loss)} (الأقل أفضل)</span>
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            <div className="space-y-4 min-w-0">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 sm:p-5">
                {opening && (
                  <p className="flex items-start gap-2 text-sm text-slate-200 mb-4">
                    <BookOpenCheck className="w-4.5 h-4.5 text-violet-300 shrink-0 mt-0.5" />
                    <span>الافتتاحية: <b className="text-white">{opening.ar}</b> <span className="text-slate-400" dir="ltr">· {opening.name}</span></span>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-emerald-400/25 p-3.5 text-center">
                    <div className="text-[11px] font-black text-emerald-300">دقّتك</div>
                    <div className="font-head text-3xl font-black text-white tabular-nums mt-1">{myAcc ?? "—"}%</div>
                    <div className="text-[11px] text-slate-400 mt-1">أخطاء وغلطات: {badCount}</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-indigo-500/20 to-indigo-500/5 border border-indigo-400/25 p-3.5 text-center">
                    <div className="text-[11px] font-black text-indigo-300">دقّة {opponentLabel}</div>
                    <div className="font-head text-3xl font-black text-white tabular-nums mt-1">{opAcc ?? "—"}%</div>
                    <div className="text-[11px] text-slate-400 mt-1">أخطاء وغلطات: {(data.totals[myColor === "w" ? "b" : "w"].counts.mistake || 0) + (data.totals[myColor === "w" ? "b" : "w"].counts.blunder || 0)}</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-5">التحليل بمحرك المنصة (عمق 2) · خسارة التقييم بوحدة البيدق ×100 وكل ما قلّت كان أفضل.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 sm:p-5">
                <h4 className="font-head font-bold text-slate-200 flex items-center gap-2 mb-3">
                  <Crosshair className="w-4 h-4 text-violet-300" /> كل النقلات · اضغط أي نقلة لعرض موقفها
                </h4>
                <div ref={listRef} className="max-h-[46dvh] lg:max-h-[520px] overflow-y-auto pr-1 space-y-1" dir="ltr">
                  {pairs.map((pair, i) => (
                    <div key={i} className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-1.5">
                      <span className="text-slate-500 text-xs font-bold">{i + 1}.</span>
                      {pair.map((m) => (
                        <button key={m.ply} onClick={() => jump(m.ply)}
                          className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left transition ${selPly === m.ply ? "bg-amber-400/20 border-amber-300/50" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08]"}`}>
                          <span className={`font-mono text-[13px] font-bold ${m.color === myColor ? "text-white" : "text-slate-300"}`}>{m.san}</span>
                          <span className={`mr-auto rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold ${V_STYLE[m.verdict]}`}>
                            {m.verdict === "best" ? "⭐" : m.verdict === "good" ? "👍" : m.verdict === "ok" ? "مقبولة" : m.verdict === "inaccuracy" ? "⚠️" : m.verdict === "mistake" ? "✖" : "💥"}
                          </span>
                        </button>
                      ))}
                      {pair.length === 1 && <span />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
