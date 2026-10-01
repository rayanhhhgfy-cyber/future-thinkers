import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Undo2, Plus, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import { FILES, useSyncedPieces, useChessTheme, capturedBy, materialOf, PlayerBar } from "@/components/chess/shared";
import ChessBoardView from "@/components/chess/ChessBoardView";

/* Solo practice: play both sides on one device, no opponent needed. */
export default function ChessPractice() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [chess] = useState(() => new Chess());
  const [tick, setTick] = useState(0);
  const pieces = useSyncedPieces(chess, tick);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promo, setPromo] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [theme, themeId, setTheme] = useChessTheme();
  const [history, setHistory] = useState([]);
  const movesRef = useRef(null);

  const orientation = flipped ? "b" : "w";
  const turn = chess.turn();

  useEffect(() => {
    if (movesRef.current) movesRef.current.scrollTop = movesRef.current.scrollHeight;
  }, [history.length]);

  const refresh = () => {
    setTick((t) => t + 1);
    setHistory(chess.history({ verbose: true }));
    const hist = chess.history({ verbose: true });
    if (hist.length) setLastMove({ from: hist[hist.length - 1].from, to: hist[hist.length - 1].to });
    else setLastMove(null);
  };

  const doMove = (from, to, promotion) => {
    const move = chess.move({ from, to, promotion });
    if (!move) return;
    setSel(null); setLegal([]); setPromo(null);
    refresh();
  };

  const onSquareClick = (square) => {
    if (promo || chess.isGameOver()) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const cand = chess.moves({ square: sel, verbose: true }).filter((m) => m.to === square);
        if (cand.some((m) => m.promotion)) { setPromo({ from: sel, to: square, color: chess.get(sel).color }); return; }
        doMove(sel, square, "q");
        return;
      }
    }
    if (piece && piece.color === turn) {
      setSel(square);
      setLegal(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else { setSel(null); setLegal([]); }
  };

  const undo = () => {
    chess.undo();
    setSel(null); setLegal([]); setPromo(null);
    refresh();
  };

  const newGame = () => {
    chess.reset();
    setSel(null); setLegal([]); setPromo(null);
    refresh();
  };

  const inCheck = chess.inCheck?.() || chess.isCheck?.();
  const kingSq = (() => {
    if (!inCheck) return null;
    for (const rank of [8, 7, 6, 5, 4, 3, 2, 1])
      for (const file of FILES) {
        const sq = `${file}${rank}`;
        const pc = chess.get(sq);
        if (pc && pc.type === "k" && pc.color === turn) return sq;
      }
    return null;
  })();

  const over = chess.isGameOver();
  const resultText = !over ? null
    : chess.isCheckmate() ? (turn === "w" ? "كش مات — فاز الأسود 🏆" : "كش مات — فاز الأبيض 🏆")
    : chess.isStalemate() ? "جمود — تعادل 🤝"
    : chess.isThreefoldRepetition() ? "تكرار — تعادل 🤝"
    : chess.isInsufficientMaterial() ? "مادة غير كافية — تعادل 🤝"
    : "انتهت المباراة — تعادل 🤝";

  const whiteCaps = capturedBy(chess, "w");
  const blackCaps = capturedBy(chess, "b");
  const matDiff = materialOf(whiteCaps) - materialOf(blackCaps);

  const movePairs = [];
  history.forEach((m, i) => {
    if (i % 2 === 0) movePairs.push([m]);
    else movePairs[movePairs.length - 1].push(m);
  });

  const youLabel = user?.name || "أنت";

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] text-white relative overflow-hidden" dir="rtl"
        style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1b2b4a 0%, #0b1120 55%, #070b14 100%)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-1/4 w-[28rem] h-[28rem] bg-amber-500/[0.07] rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-emerald-500/[0.07] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <button onClick={() => nav("/clubs/chess")} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </button>
            <div className="flex items-center gap-2">
              <Button onClick={undo} disabled={history.length === 0} variant="outline"
                className="rounded-full h-9 px-3 text-xs border-white/15 text-slate-200 bg-white/5 hover:bg-white/10 disabled:opacity-40">
                <Undo2 className="w-4 h-4 ml-1" /> تراجع
              </Button>
              <Button onClick={newGame} className="rounded-full h-9 px-3 text-xs bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold">
                <Plus className="w-4 h-4 ml-1" /> مباراة جديدة
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="min-w-0">
              <PlayerBar name={orientation === "w" ? `الأسود ♟` : `${youLabel} (الأبيض)`} rating={null}
                active={turn === "b"} you={false}
                caps={blackCaps} matAhead={matDiff < 0 ? -matDiff : 0} color="b" />
              <div className="my-3 sm:my-4">
                <ChessBoardView
                  chess={chess} pieces={pieces} theme={theme} themeId={themeId} setTheme={setTheme}
                  orientation={orientation} flipped={flipped} setFlipped={setFlipped}
                  sel={sel} legal={legal} lastMove={lastMove} kingSq={kingSq}
                  onSquareClick={onSquareClick}
                  promo={promo}
                  onPromote={(t) => doMove(promo.from, promo.to, t)}
                  onCancelPromo={() => { setPromo(null); setSel(null); setLegal([]); }} />
              </div>
              <PlayerBar name={orientation === "w" ? `${youLabel} (الأبيض)` : `الأسود ♟`} rating={null}
                active={turn === "w"} you
                caps={whiteCaps} matAhead={matDiff > 0 ? matDiff : 0} color="w" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="space-y-4 min-w-0">
              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h3 className="font-head font-bold flex items-center gap-2 mb-3 text-amber-300"><User className="w-5 h-5" /> تدريب فردي</h3>
                <AnimatePresence mode="wait">
                  <motion.div key={over ? "over" : turn}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className={`text-sm px-3 py-2.5 rounded-2xl font-medium border ${over
                      ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                      : turn === "w"
                        ? "bg-white/10 text-white border-white/20"
                        : "bg-slate-500/15 text-slate-200 border-slate-500/30"}`}>
                    {over ? resultText : turn === "w" ? "دور الأبيض — حرّك أي قطعة بيضاء" : "دور الأسود — حرّك أي قطعة سوداء"}
                  </motion.div>
                </AnimatePresence>
                {inCheck && !over && <div className="text-sm text-red-400 mt-2 font-bold animate-pulse">كش! 👑</div>}
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">العب باللونين بحرية — مثالي لتجربة الافتتاحيات والتكتيكات بدون خصم.</p>
              </div>

              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h4 className="font-semibold text-sm mb-3 text-slate-300">النقلات ({history.length})</h4>
                <div ref={movesRef} className="max-h-48 lg:max-h-64 overflow-y-auto pr-1" dir="ltr">
                  {movePairs.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">لا نقلات بعد — ابدأ اللعب!</div>
                  ) : (
                    <div className="grid grid-cols-[2rem_1fr_1fr] gap-y-1 text-sm font-mono">
                      {movePairs.map((pair, i) => (
                        <React.Fragment key={i}>
                          <span className="text-slate-500">{i + 1}.</span>
                          <span className="text-slate-200">{pair[0]?.san}</span>
                          <span className="text-slate-200">{pair[1]?.san || ""}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {over && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="relative overflow-hidden bg-slate-900 border border-amber-300/20 rounded-[28px] p-8 max-w-sm w-full text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl bg-amber-400/15" />
                <div className="text-6xl mb-4 relative">{chess.isCheckmate() ? "🏆" : "🤝"}</div>
                <h2 className="font-head text-2xl font-extrabold mb-1 relative">{resultText}</h2>
                <p className="text-slate-400 text-sm mb-6 relative">{history.length} نقلة في هذه المباراة</p>
                <div className="flex gap-2 relative">
                  <Button onClick={newGame} className="flex-1 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold">مباراة جديدة</Button>
                  <Button onClick={() => nav("/clubs/chess")} variant="outline" className="flex-1 rounded-2xl border-white/20 text-white bg-transparent hover:bg-white/10">عودة للحلبة</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
