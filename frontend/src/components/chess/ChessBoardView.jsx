import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat } from "lucide-react";
import { FILES, THEMES, pieceSrc } from "./shared";

/**
 * The beautiful chess board. Fully presentational — the parent owns the Chess
 * instance and passes position/selection state.
 *
 * Props:
 *  chess, pieces, theme, themeId, setTheme, orientation ("w"|"b"),
 *  flipped, setFlipped, sel, legal, lastMove, kingSq,
 *  onSquareClick(square), promo {from,to,color}|null, onPromote(piece), onCancelPromo,
 *  showToolbar (default true)
 */
export default function ChessBoardView({
  chess, pieces, theme, themeId, setTheme,
  orientation, flipped, setFlipped,
  sel, legal, lastMove, kingSq,
  onSquareClick, promo, onPromote, onCancelPromo,
  showToolbar = true,
}) {
  const ranks = (() => {
    const r = [8, 7, 6, 5, 4, 3, 2, 1];
    const f = [...FILES];
    if (orientation === "b") { r.reverse(); f.reverse(); }
    return { r, f };
  })();
  const posOf = (square) => {
    let x = FILES.indexOf(square[0]);
    let y = 8 - parseInt(square[1], 10);
    if (orientation === "b") { x = 7 - x; y = 7 - y; }
    return { x, y };
  };

  return (
    <div>
      {showToolbar && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1.5">
            {Object.values(THEMES).map((t) => (
              <button key={t.id} title={t.label} onClick={() => setTheme(t.id)}
                className={`w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition-all ${themeId === t.id ? "ring-amber-300 scale-110" : "ring-transparent hover:scale-105"}`}
                style={{ background: `linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)` }} />
            ))}
          </div>
          <button title="قلب الرقعة" onClick={() => setFlipped((f) => !f)}
            className="w-9 h-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <Repeat className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full max-w-[620px] mx-auto rounded-[26px] p-2 sm:p-2.5 shadow-[0_35px_80px_-20px_rgba(0,0,0,0.85),0_0_60px_-20px_rgba(245,158,11,0.25)]"
        style={{ background: "linear-gradient(145deg, #5a4128 0%, #33241a 35%, #1d130c 70%, #3d2c1c 100%)" }}>
        <div className="rounded-[20px] p-[3px]" style={{ background: "linear-gradient(145deg, rgba(252,211,77,0.5), rgba(252,211,77,0.06) 40%, rgba(252,211,77,0.06) 60%, rgba(252,211,77,0.4))" }}>
          <div className="relative aspect-square w-full rounded-[17px] overflow-hidden select-none" dir="ltr">
            {/* squares */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
              {ranks.r.map((rank) => ranks.f.map((file) => {
                const square = `${file}${rank}`;
                const darkSq = (FILES.indexOf(file) + rank) % 2 === 0;
                const isSel = sel === square;
                const isLegal = legal.includes(square);
                const hasPiece = !!chess.get(square);
                const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
                const isKingCheck = kingSq === square;
                const showFile = rank === ranks.r[ranks.r.length - 1];
                const showRank = file === ranks.f[0];
                return (
                  <button key={square} data-testid={`sq-${square}`} onClick={() => onSquareClick(square)}
                    className="relative"
                    style={{
                      background: isKingCheck
                        ? "radial-gradient(circle, #ef4444 30%, #b91c1c 75%)"
                        : isSel
                          ? `linear-gradient(135deg, ${theme.selA}, ${theme.selB})`
                          : isLast
                            ? (darkSq ? theme.lastDark : theme.lastLight)
                            : (darkSq ? theme.dark : theme.light),
                      boxShadow: isSel ? "inset 0 0 0 3px rgba(255,255,255,0.55), inset 0 0 18px rgba(0,0,0,0.25)" : undefined,
                    }}>
                    {showRank && (
                      <span className="absolute top-[3%] left-[6%] text-[clamp(8px,1.6vw,11px)] font-extrabold leading-none"
                        style={{ color: isKingCheck ? "#fff" : darkSq ? theme.coordOnDark : theme.coordOnLight }}>{rank}</span>
                    )}
                    {showFile && (
                      <span className="absolute bottom-[3%] right-[6%] text-[clamp(8px,1.6vw,11px)] font-extrabold leading-none"
                        style={{ color: isKingCheck ? "#fff" : darkSq ? theme.coordOnDark : theme.coordOnLight }}>{file}</span>
                    )}
                    {isLegal && !hasPiece && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className="absolute inset-0 m-auto rounded-full"
                        style={{ width: "26%", height: "26%", background: theme.dot, boxShadow: `0 0 0 2px ${theme.dot}` }} />
                    )}
                    {isLegal && hasPiece && (
                      <span className="absolute inset-[4%] rounded-full pointer-events-none"
                        style={{ border: `clamp(3px,0.7vw,5px) solid ${theme.cap}` }} />
                    )}
                    {isKingCheck && (
                      <motion.span animate={{ opacity: [0.35, 0.75, 0.35] }} transition={{ duration: 1.1, repeat: Infinity }}
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 65%)" }} />
                    )}
                  </button>
                );
              }))}
            </div>
            {/* pieces (slide between squares) */}
            <div className="absolute inset-0 pointer-events-none">
              {pieces.map((p) => {
                const { x, y } = posOf(p.square);
                const isLastMoved = lastMove && lastMove.to === p.square;
                return (
                  <motion.div key={p.id} initial={false}
                    animate={{ left: `${x * 12.5}%`, top: `${y * 12.5}%` }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute w-[12.5%] h-[12.5%] p-[0.8%]"
                    style={{ zIndex: isLastMoved ? 20 : 10 }}>
                    <motion.img
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      src={pieceSrc(p.type, p.color)}
                      alt="" draggable={false}
                      className="w-full h-full"
                      style={{ filter: p.color === "w" ? "drop-shadow(0 3px 3px rgba(0,0,0,0.5))" : "drop-shadow(0 3px 4px rgba(0,0,0,0.55))" }} />
                  </motion.div>
                );
              })}
            </div>
            {/* promotion picker */}
            <AnimatePresence>
              {promo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 grid place-items-center bg-slate-950/70 backdrop-blur-[2px]">
                  <motion.div initial={{ scale: 0.8, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="bg-slate-900/95 border border-amber-300/25 rounded-3xl p-5 sm:p-6 shadow-2xl">
                    <div className="text-center font-head font-bold mb-4 text-amber-200">اختر القطعة 👑</div>
                    <div className="flex gap-2 sm:gap-3" dir="ltr">
                      {["q", "r", "b", "n"].map((t) => (
                        <motion.button key={t} whileHover={{ scale: 1.12, y: -4 }} whileTap={{ scale: 0.94 }}
                          onClick={() => onPromote(t)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl grid place-items-center bg-gradient-to-b from-white/15 to-white/5 border border-white/15 hover:border-amber-300/60 hover:shadow-[0_0_24px_rgba(252,211,77,0.35)] transition-shadow">
                          <img src={pieceSrc(t, promo.color)} alt={t} draggable={false} className="w-12 h-12 sm:w-14 sm:h-14" />
                        </motion.button>
                      ))}
                    </div>
                    <button onClick={onCancelPromo}
                      className="w-full mt-4 text-xs text-slate-400 hover:text-slate-200 transition-colors">إلغاء</button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
