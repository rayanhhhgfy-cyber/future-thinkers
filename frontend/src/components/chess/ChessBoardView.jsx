import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Repeat, Volume2, VolumeX } from "lucide-react";
import { FILES, THEMES, PIECE_SETS, pieceFilterOf, pieceSrc, usePieceSet } from "./shared";
import { isMuted, setMuted as persistMuted } from "./sounds";

/**
 * The beautiful chess board. Fully presentational · the parent owns the Chess
 * instance and passes position/selection state.
 *
 * Props:
 *  chess, pieces, theme, themeId, setTheme, orientation ("w"|"b"),
 *  flipped, setFlipped, sel, legal, lastMove, kingSq,
 *  onSquareClick(square), promo {from,to,color}|null, onPromote(piece), onCancelPromo,
 *  movableColor ("w"|"b"|"both"), showToolbar (default true)
 */
export default function ChessBoardView({
  chess, pieces, theme, themeId, setTheme,
  orientation, flipped, setFlipped,
  sel, legal, lastMove, kingSq,
  onSquareClick, promo, onPromote, onCancelPromo,
  movableColor, showToolbar = true,
}) {
  const boardRef = useRef(null);
  const [pieceSetId, setPieceSet] = usePieceSet();
  const pieceFilter = (c) => pieceFilterOf(pieceSetId, c);
  const [drag, setDrag] = useState(null); // {square, type, color, x, y, active}
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    persistMuted(!next);
  };

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
  const squareFromPoint = (clientX, clientY) => {
    const el = boardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const fx = Math.min(7, Math.max(0, Math.floor(((clientX - r.left) / r.width) * 8)));
    const fy = Math.min(7, Math.max(0, Math.floor(((clientY - r.top) / r.height) * 8)));
    return `${ranks.f[fx]}${ranks.r[fy]}`;
  };

  const onPointerDown = (e, square) => {
    if (promo) return;
    onSquareClick(square);
    const pc = chess.get(square);
    if (!pc || !movableColor || (movableColor !== "both" && pc.color !== movableColor)) return;
    const rect = () => boardRef.current.getBoundingClientRect();
    const r = rect();
    setDrag({ square, type: pc.type, color: pc.color, x: e.clientX - r.left, y: e.clientY - r.top, active: false });
    const move = (ev) => {
      const rr = rect();
      setDrag((d) => (d ? { ...d, x: ev.clientX - rr.left, y: ev.clientY - rr.top, active: true } : d));
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const target = squareFromPoint(ev.clientX, ev.clientY);
      if (target && target !== square) onSquareClick(target);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div>
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-5">
          <div className="flex items-center gap-1.5 lg:gap-2 bg-white/[0.06] border border-white/10 rounded-full px-3 py-2 lg:px-4 lg:py-2.5 backdrop-blur-xl shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)]">
            {Object.values(THEMES).map((t) => (
              <button key={t.id} title={t.label} onClick={() => setTheme(t.id)}
                className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full transition-all duration-200 ${themeId === t.id ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 scale-110" : "ring-1 ring-white/20 hover:scale-110"}`}
                style={{ background: `linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)` }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2 bg-white/[0.06] border border-white/10 rounded-full px-3 py-2 lg:px-4 lg:py-2.5 backdrop-blur-xl shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)]">
            {PIECE_SETS.map((ps) => (
              <button key={ps.id} title={`قطع ${ps.label}`} onClick={() => setPieceSet(ps.id)} data-testid={`pieceset-${ps.id}`}
                className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full grid place-items-center bg-white/10 transition-all duration-200 ${pieceSetId === ps.id ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 scale-110" : "ring-1 ring-white/20 hover:scale-110"}`}>
                <img src={pieceSrc("k", "w", ps.id)} alt="" draggable={false} className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            ))}
          </div>
          <button title="قلب الرقعة" onClick={() => setFlipped((f) => !f)}
            className="w-11 h-11 lg:w-12 lg:h-12 grid place-items-center rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl text-slate-300 hover:text-white hover:bg-white/[0.12] hover:rotate-180 transition-all duration-300 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)]">
            <Repeat className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <button title={soundOn ? "كتم الصوت" : "تشغيل الصوت"} onClick={toggleSound}
            className={`w-11 h-11 lg:w-12 lg:h-12 grid place-items-center rounded-full border backdrop-blur-xl transition-all shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)] ${soundOn ? "bg-amber-400/20 border-amber-300/40 text-amber-300" : "bg-white/[0.06] border-white/10 text-slate-400 hover:text-white"}`}>
            {soundOn ? <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" /> : <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" />}
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[min(96vw,660px)] lg:max-w-[min(940px,calc(100dvh_-_170px))] xl:max-w-[min(1020px,calc(100dvh_-_150px))] mx-auto rounded-[28px] lg:rounded-[32px] p-2 sm:p-3 lg:p-4"
        style={{
          background: `
            repeating-linear-gradient(93deg, rgba(255,255,255,0.025) 0 3px, transparent 3px 9px),
            repeating-linear-gradient(88deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 14px),
            linear-gradient(145deg, #6b4c2e 0%, #3a2a1c 30%, #241811 55%, #120c07 80%, #4a3524 100%)`,
          boxShadow: "0 40px 90px -20px rgba(0,0,0,0.9), 0 0 70px -20px rgba(245,158,11,0.28), inset 0 2px 3px rgba(255,235,200,0.18), inset 0 -3px 6px rgba(0,0,0,0.5)",
        }}>
        <div className="rounded-[20px] p-[3px]" style={{ background: "linear-gradient(145deg, rgba(252,211,77,0.55), rgba(252,211,77,0.05) 35%, rgba(252,211,77,0.05) 65%, rgba(252,211,77,0.45))" }}>
          <div ref={boardRef} className="relative aspect-square w-full rounded-[17px] overflow-hidden select-none touch-none" dir="ltr"
            style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.28)" }}>
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
                  <button key={square} data-testid={`sq-${square}`} onPointerDown={(e) => onPointerDown(e, square)}
                    className="relative"
                    style={{
                      background: isKingCheck
                        ? "radial-gradient(circle at 50% 45%, #f87171 25%, #dc2626 60%, #991b1b 100%)"
                        : isSel
                          ? `linear-gradient(135deg, ${theme.selA}, ${theme.selB})`
                          : isLast
                            ? `linear-gradient(rgba(255,246,190,0.42), rgba(255,246,190,0.42)), ${darkSq ? theme.dark : theme.light}`
                            : (darkSq ? theme.dark : theme.light),
                      boxShadow: isSel
                        ? "inset 0 0 0 3px rgba(255,255,255,0.6), inset 0 0 22px rgba(0,0,0,0.3)"
                        : "inset 0 0 0 0 transparent",
                      transition: "filter 120ms ease",
                    }}
                    onMouseEnter={(e) => { if (!isSel && !isKingCheck) e.currentTarget.style.filter = "brightness(1.07)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}>
                    {showRank && (
                      <span className="absolute top-[4%] left-[7%] font-black leading-none tracking-wide"
                        style={{
                          fontSize: "clamp(8px,1.7vw,14px)",
                          color: isKingCheck ? "#fff" : darkSq ? theme.coordOnDark : theme.coordOnLight,
                          textShadow: darkSq ? "0 1px 2px rgba(0,0,0,0.4)" : "0 1px 1px rgba(255,255,255,0.5)",
                        }}>{rank}</span>
                    )}
                    {showFile && (
                      <span className="absolute bottom-[4%] right-[7%] font-black leading-none tracking-wide"
                        style={{
                          fontSize: "clamp(8px,1.7vw,14px)",
                          color: isKingCheck ? "#fff" : darkSq ? theme.coordOnDark : theme.coordOnLight,
                          textShadow: darkSq ? "0 1px 2px rgba(0,0,0,0.4)" : "0 1px 1px rgba(255,255,255,0.5)",
                        }}>{file}</span>
                    )}
                    {isLegal && !hasPiece && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className="absolute inset-0 m-auto rounded-full"
                        style={{
                          width: "30%", height: "30%",
                          background: `radial-gradient(circle, ${theme.dot} 55%, transparent 72%)`,
                          boxShadow: `0 0 12px ${theme.dot}`,
                        }} />
                    )}
                    {isLegal && hasPiece && (
                      <motion.span initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-[3%] rounded-full pointer-events-none"
                        style={{ border: `clamp(3px,0.8vw,7px) solid ${theme.cap}`, boxShadow: `0 0 14px ${theme.cap}, inset 0 0 14px ${theme.cap}` }} />
                    )}
                    {isKingCheck && (
                      <motion.span animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.1, repeat: Infinity }}
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 65%)" }} />
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
                const isDragged = drag && drag.square === p.square && drag.active;
                const isSelected = sel === p.square;
                return (
                  <motion.div key={p.id} initial={false}
                    animate={{ left: `${x * 12.5}%`, top: `${y * 12.5}%` }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute w-[12.5%] h-[12.5%] p-[0.8%]"
                    style={{ zIndex: isLastMoved ? 20 : 10, opacity: isDragged ? 0.3 : 1 }}>
                    <motion.img
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: isSelected ? 1.1 : 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      src={pieceSrc(p.type, p.color, pieceSetId)}
                      alt="" draggable={false}
                      className="w-full h-full"
                      style={{
                        filter: `${pieceFilter(p.color) ? pieceFilter(p.color) + " " : ""}${p.color === "w"
                          ? "drop-shadow(0 5px 5px rgba(0,0,0,0.45)) drop-shadow(0 1px 1px rgba(0,0,0,0.4))"
                          : "drop-shadow(0 6px 6px rgba(0,0,0,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))"}`,
                      }} />
                  </motion.div>
                );
              })}
            </div>
            {/* drag ghost */}
            {drag && drag.active && (
              <div className="absolute pointer-events-none z-30"
                style={{ left: drag.x, top: drag.y, width: "13.5%", aspectRatio: "1", transform: "translate(-50%, -55%)" }}>
                <img src={pieceSrc(drag.type, drag.color, pieceSetId)} alt="" draggable={false}
                  className="w-full h-full scale-110"
                  style={{ filter: `${pieceFilter(drag.color) ? pieceFilter(drag.color) + " " : ""}drop-shadow(0 14px 16px rgba(0,0,0,0.6))` }} />
              </div>
            )}
            {/* promotion picker */}
            <AnimatePresence>
              {promo && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 grid place-items-center bg-slate-950/70 backdrop-blur-[3px]">
                  <motion.div initial={{ scale: 0.8, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="bg-slate-900/95 border border-amber-300/25 rounded-3xl p-5 sm:p-6 lg:p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
                    <div className="text-center font-head font-bold lg:text-lg mb-4 lg:mb-5 text-amber-200">اختر القطعة 👑</div>
                    <div className="flex gap-2 sm:gap-3 lg:gap-3.5" dir="ltr">
                      {["q", "r", "b", "n"].map((t, i) => (
                        <motion.button key={t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                          whileHover={{ scale: 1.12, y: -4 }} whileTap={{ scale: 0.94 }}
                          onClick={() => onPromote(t)}
                          className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl grid place-items-center bg-gradient-to-b from-white/15 to-white/5 border border-white/15 hover:border-amber-300/60 hover:shadow-[0_0_28px_rgba(252,211,77,0.4)] transition-shadow">
                          <img src={pieceSrc(t, promo.color, pieceSetId)} alt={t} draggable={false}
                            style={{ filter: pieceFilter(promo.color) || undefined }}
                            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-[68px] lg:h-[68px] drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]" />
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
      </motion.div>
    </div>
  );
}
