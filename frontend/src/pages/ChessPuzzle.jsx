import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightbulb, RotateCcw, Sparkles, Swords, Bot, Puzzle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import { FILES, useSyncedPieces, useChessTheme } from "@/components/chess/shared";
import ChessBoardView from "@/components/chess/ChessBoardView";
import { playChessSound } from "@/components/chess/sounds";
import api from "@/lib/api";

/* Daily mate-in-1 puzzles · every position verified: the side to move mates in one. */
const PUZZLES = [
  { fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", title: "مات الصف الأخير", hint: "القلعة تحسمها على الصف الثامن" },
  { fen: "6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1", title: "الملكة تقتحم", hint: "الملكة تصعد إلى الصف الأخير" },
  { fen: "7k/6pp/8/8/8/5Q2/8/6K1 w - - 0 1", title: "مات الزاوية", hint: "الملكة إلى f8 مباشرة" },
  { fen: "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1", title: "المات المخنوق الشهير", hint: "الحصان يقفز إلى f7" },
  { fen: "7k/6pp/8/8/2B5/8/8/3Q2K1 w - - 0 1", title: "بطارية الملكة والفيل", hint: "الفيل يغطي g8 · والملكة تنهيها" },
  { fen: "7k/5B2/6PK/8/8/8/8/8 w - - 0 1", title: "البيدق الحاسم", hint: "ادفع البيدق · الفيل يغلق g8 وملكك يحميه" },
  { fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1", title: "القلعة والملك", hint: "القلعة للصف الأخير · ملكك يحرس h7 وg7" },
];

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dayOfYear = () => { const n = new Date(); return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000); };
const CONFETTI = ["#f59e0b", "#10b981", "#38bdf8", "#f472b6", "#a78bfa", "#facc15"];

export default function ChessPuzzle() {
  const dailyIdx = dayOfYear() % PUZZLES.length;
  const [idx, setIdx] = useState(dailyIdx);
  const [chess, setChess] = useState(() => new Chess(PUZZLES[dailyIdx].fen));
  const [tick, setTick] = useState(0);
  const pieces = useSyncedPieces(chess, tick);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promo, setPromo] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [theme, themeId, setTheme] = useChessTheme();
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(() => { try { return localStorage.getItem(`ft-puzzle-${todayStr()}`) === String(dailyIdx); } catch { return false; } });
  const lockRef = useRef(false);

  const puzzle = PUZZLES[idx];
  const side = chess.turn();

  const resetPosition = (nextIdx) => {
    const c = new Chess(PUZZLES[nextIdx].fen);
    setChess(c); setTick((t) => t + 1);
    setSel(null); setLegal([]); setLastMove(null); setPromo(null);
    setAttempts(0); setShowHint(false); setSolved(false);
    lockRef.current = false;
  };

  const onSolved = () => {
    setSolved(true);
    playChessSound("end");
    try { localStorage.setItem(`ft-puzzle-${todayStr()}`, String(idx)); } catch { /* private mode */ }
    /* +XP claim: best-effort only, the board never waits on it */
    try { api.post("/chess/puzzle/claim", { puzzle: idx, attempts }).catch(() => {}); } catch { /* offline */ }
  };

  const doMove = (from, to, promotion) => {
    if (lockRef.current || solved) return;
    const move = chess.move({ from, to, promotion });
    if (!move) return;
    setSel(null); setLegal([]); setPromo(null);
    setLastMove({ from, to });
    setTick((t) => t + 1);
    if (chess.isCheckmate()) { onSolved(); return; }
    /* legal but not mate: count it, shake, take it back */
    setAttempts((a) => a + 1);
    setWrong((w) => w + 1);
    playChessSound(move.captured ? "capture" : "move");
    lockRef.current = true;
    setTimeout(() => {
      chess.undo();
      setLastMove(null);
      setTick((t) => t + 1);
      lockRef.current = false;
    }, 560);
  };

  const onSquareClick = (square) => {
    if (promo || solved || lockRef.current) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const cand = chess.moves({ square: sel, verbose: true }).filter((m) => m.to === square);
        if (cand.some((m) => m.promotion)) { setPromo({ from: sel, to: square, color: chess.get(sel).color }); return; }
        doMove(sel, square, "q");
        return;
      }
    }
    if (piece && piece.color === side) {
      if (sel !== square) playChessSound("select");
      setSel(square);
      setLegal(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else { setSel(null); setLegal([]); }
  };

  const inCheck = chess.inCheck?.() || chess.isCheck?.();
  const kingSq = (() => {
    if (!inCheck) return null;
    for (const rank of [8, 7, 6, 5, 4, 3, 2, 1])
      for (const file of FILES) {
        const sq = `${file}${rank}`;
        const pc = chess.get(sq);
        if (pc && pc.type === "k" && pc.color === side) return sq;
      }
    return null;
  })();

  const nextPuzzle = () => { const n = (idx + 1) % PUZZLES.length; setIdx(n); resetPosition(n); };

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] text-white relative overflow-hidden" dir="rtl"
        style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1b2b4a 0%, #0b1120 55%, #070b14 100%)" }}>
        <div className="pointer-events-none absolute -top-40 right-1/4 w-[26rem] h-[26rem] bg-amber-500/[0.07] rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 w-[26rem] h-[26rem] bg-indigo-500/[0.07] rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <Link to="/clubs/chess" className="pressable inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm min-h-[44px] transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/chess/practice" className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 min-h-[44px] text-xs font-bold text-slate-200"><Swords className="w-4 h-4" /> تدريب حر</Link>
              <Link to="/chess/robot" className="pressable inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 min-h-[44px] text-xs font-bold text-slate-200"><Bot className="w-4 h-4" /> العب ضد الروبوت</Link>
            </div>
          </div>

          <div className="text-center mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-300/25 text-amber-200 px-3.5 py-1.5 text-[11px] font-extrabold"><Puzzle className="w-3.5 h-3.5" /> لغز اليوم · مات في نقلة واحدة</span>
            <h1 className="font-head text-3xl sm:text-4xl font-black mt-3">{puzzle.title}</h1>
            <p className="text-slate-400 text-sm mt-2">الأبيض يلعب ويُمات فوراً · نقلة واحدة صحيحة فقط</p>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start max-w-4xl mx-auto">
            <motion.div key={wrong} animate={wrong ? { x: [0, -9, 9, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="min-w-0 relative">
              <ChessBoardView
                chess={chess} pieces={pieces} theme={theme} themeId={themeId} setTheme={setTheme}
                orientation="w" flipped={flipped} setFlipped={setFlipped}
                sel={sel} legal={legal} lastMove={lastMove} kingSq={kingSq}
                onSquareClick={onSquareClick}
                movableColor={solved ? undefined : side}
                promo={promo}
                onPromote={(t) => doMove(promo.from, promo.to, t)}
                onCancelPromo={() => { setPromo(null); setSel(null); setLegal([]); }} />
              <AnimatePresence>
                {solved && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-[2px] rounded-[1.4rem] overflow-hidden p-4">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <motion.span key={i} className="absolute top-0 w-2 h-3 rounded-[2px]"
                        style={{ right: `${(i * 53) % 100}%`, background: CONFETTI[i % CONFETTI.length] }}
                        initial={{ y: -20, opacity: 0, rotate: 0 }}
                        animate={{ y: 340, opacity: [0, 1, 1, 0.6], rotate: 220 + i * 30 }}
                        transition={{ duration: 1.6 + (i % 5) * 0.22, delay: (i % 6) * 0.07, ease: "easeOut" }} />
                    ))}
                    <motion.div initial={{ scale: 0.85, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      className="relative bg-slate-900 border border-amber-300/25 rounded-[24px] p-6 sm:p-7 max-w-xs w-full text-center shadow-2xl">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 grid place-items-center shadow-lg shadow-amber-500/30"><Check className="w-8 h-8 text-slate-950" strokeWidth={3} /></div>
                      <h2 className="font-head text-xl font-black mt-4">كش مات! أحسنت 🎉</h2>
                      <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{attempts === 0 ? "من أول محاولة · عين صقر!" : `حللت اللغز بعد ${attempts} ${attempts === 1 ? "محاولة قريبة" : "محاولات"}`}</p>
                      <div className="flex gap-2 mt-5">
                        <Button onClick={nextPuzzle} className="flex-1 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold min-h-[48px]">اللغز التالي</Button>
                        <Button onClick={() => resetPosition(idx)} variant="outline" className="rounded-2xl border-white/20 text-white bg-transparent hover:bg-white/10 min-h-[48px] px-4">إعادة</Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: EASE }} className="space-y-4 min-w-0">
              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl">
                <h3 className="font-head font-bold flex items-center gap-2 text-amber-300 mb-3">
                  <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-amber-300 to-orange-500"><Puzzle className="w-4 h-4 text-slate-950" /></span>
                  مهمّتك
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">حرّك أي قطعة بيضاء · إن لم تكن النقلة ماتاً فورياً ستعود القطعة مكانها وتُحتسب محاولة.</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-[11px] font-bold text-slate-300">المحاولات: {attempts}</span>
                  <span className="rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-[11px] font-bold text-slate-300">اللغز {idx + 1} من {PUZZLES.length}</span>
                  {idx === dailyIdx && <span className="rounded-full bg-amber-400/15 ring-1 ring-amber-300/30 px-3 py-1.5 text-[11px] font-extrabold text-amber-200">لغز اليوم</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => setShowHint((s) => !s)} className="pressable inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 min-h-[48px] text-xs font-bold text-slate-200"><Lightbulb className="w-4 h-4 text-amber-300" /> تلميح</button>
                  <button onClick={() => resetPosition(idx)} className="pressable inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 min-h-[48px] text-xs font-bold text-slate-200"><RotateCcw className="w-4 h-4" /> من جديد</button>
                </div>
                <AnimatePresence>
                  {showHint && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-xs text-amber-200/90 bg-amber-400/10 border border-amber-300/20 rounded-xl px-3 py-2.5 mt-3 leading-relaxed">
                      💡 {puzzle.hint}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl">
                <h4 className="font-head font-bold text-sm text-slate-200 flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-amber-300" /> ألغاز الأسبوع</h4>
                <div className="grid grid-cols-7 gap-1.5">
                  {PUZZLES.map((p, i) => (
                    <button key={p.fen} onClick={() => { setIdx(i); resetPosition(i); }}
                      className={`pressable aspect-square rounded-xl grid place-items-center text-xs font-black min-h-[44px] transition-all ${i === idx ? "bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25" : "bg-white/5 ring-1 ring-white/15 text-slate-300 hover:bg-white/12"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">يتجدد لغز اليوم تلقائياً كل يوم · حلّ لغز اليوم ليُحفظ إنجازك على جهازك.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
