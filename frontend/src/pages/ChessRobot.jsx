import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Undo2, Plus, Bot, User, History, Gauge, BookOpenCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import { FILES, pieceSrc, useSyncedPieces, useChessTheme, capturedBy, materialOf, PlayerBar } from "@/components/chess/shared";
import ChessBoardView from "@/components/chess/ChessBoardView";
import { pickMoveElo, DIFFICULTIES } from "@/components/chess/engine";
import { detectOpening } from "@/components/chess/openings";
import ChessAnalysis from "@/components/chess/ChessAnalysis";
import { playChessSound } from "@/components/chess/sounds";

/* Play against the built-in robot: 3 difficulty levels. */
const ROBOT_HISTORY_KEY = "ft-robot-history";

export default function ChessRobot() {
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
  const [started, setStarted] = useState(false);
  const [myColor, setMyColor] = useState("w");
  const [difficulty] = useState("medium"); // legacy: old history labels only
  const [elo, setElo] = useState(() => {
    try { const v = Number(localStorage.getItem("ft-robot-elo")); return v >= 100 && v <= 3500 ? v : 1200; }
    catch { return 1200; }
  });
  const changeElo = (v) => {
    const n = Math.max(100, Math.min(3500, Math.round(Number(v) || 1200)));
    setElo(n);
    try { localStorage.setItem("ft-robot-elo", String(n)); } catch {}
  };
  const [analysis, setAnalysis] = useState(null); // {sans, myColor}
  const [thinking, setThinking] = useState(false);
  const [matchLog, setMatchLog] = useState(() => {
    try { const raw = JSON.parse(localStorage.getItem(ROBOT_HISTORY_KEY) || "[]"); return Array.isArray(raw) ? raw : []; }
    catch { return []; }
  });
  const recordedRef = useRef(false);
  const movesRef = useRef(null);
  const timerRef = useRef(null);

  const orientation = flipped ? (myColor === "w" ? "b" : "w") : myColor;
  const robotColor = myColor === "w" ? "b" : "w";
  const turn = chess.turn();
  const over = chess.isGameOver();
  const myTurn = started && !over && turn === myColor;

  useEffect(() => {
    if (movesRef.current) movesRef.current.scrollTop = movesRef.current.scrollHeight;
  }, [history.length]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const refresh = () => {
    setTick((t) => t + 1);
    const hist = chess.history({ verbose: true });
    setHistory(hist);
    if (hist.length) setLastMove({ from: hist[hist.length - 1].from, to: hist[hist.length - 1].to });
    else setLastMove(null);
  };

  const robotMove = () => {
    if (chess.isGameOver()) return;
    setThinking(true);
    timerRef.current = setTimeout(() => {
      const mv = pickMoveElo(chess, elo);
      setThinking(false);
      if (!mv) return;
      const move = chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || "q" });
      if (!move) return;
      if (chess.isGameOver()) playChessSound("end");
      else if (chess.isCheck?.() || chess.inCheck?.()) playChessSound("check");
      else playChessSound(move.captured ? "capture" : "move");
      refresh();
    }, 450);
  };

  const afterMyMove = () => {
    refresh();
    if (!chess.isGameOver()) robotMove();
  };

  const doMove = (from, to, promotion) => {
    const move = chess.move({ from, to, promotion });
    if (!move) return;
    if (chess.isGameOver()) playChessSound("end");
    else if (chess.isCheck?.() || chess.inCheck?.()) playChessSound("check");
    else playChessSound(move.captured ? "capture" : "move");
    setSel(null); setLegal([]); setPromo(null);
    afterMyMove();
  };

  const onSquareClick = (square) => {
    if (!myTurn || promo || thinking) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const cand = chess.moves({ square: sel, verbose: true }).filter((m) => m.to === square);
        if (cand.some((m) => m.promotion)) { setPromo({ from: sel, to: square, color: myColor }); return; }
        doMove(sel, square, "q");
        return;
      }
    }
    if (piece && piece.color === myColor) {
      if (sel !== square) playChessSound("select");
      setSel(square);
      setLegal(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else { setSel(null); setLegal([]); }
  };

  const startGame = (colorChoice) => {
    const color = colorChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    chess.reset();
    setMyColor(color);
    recordedRef.current = false;
    setFlipped(false);
    setSel(null); setLegal([]); setPromo(null);
    setStarted(true);
    refresh();
    if (color === "b") {
      /* robot (white) opens */
      setTimeout(() => {
        setThinking(true);
        timerRef.current = setTimeout(() => {
          const mv = pickMoveElo(chess, elo);
          setThinking(false);
          if (mv) { chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion || "q" }); playChessSound("move"); refresh(); }
        }, 500);
      }, 0);
    }
  };

  const newGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setThinking(false);
    setStarted(false);
    recordedRef.current = false;
    chess.reset();
    setSel(null); setLegal([]); setPromo(null);
    refresh();
  };

  const undo = () => {
    if (thinking || history.length === 0) return;
    chess.undo();
    if (chess.turn() !== myColor) chess.undo();
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

  const resultText = !over ? null
    : chess.isCheckmate()
      ? (turn === myColor ? "كش مات · فاز الروبوت 🤖" : "كش مات · فزت أنت! 🏆")
      : chess.isStalemate() ? "جمود · تعادل 🤝"
      : "انتهت المباراة · تعادل 🤝";
  const iWon = over && chess.isCheckmate() && turn !== myColor;

  const myCaps = capturedBy(chess, myColor);
  const robotCaps = capturedBy(chess, robotColor);
  const matDiff = materialOf(myCaps) - materialOf(robotCaps);

  const movePairs = [];
  history.forEach((m, i) => {
    if (i % 2 === 0) movePairs.push([m]);
    else movePairs[movePairs.length - 1].push(m);
  });

  const diffLabel = `ELO ${elo}`;
  const sansNow = history.map((m) => m.san);
  const openingNow = detectOpening(sansNow);
  const histLabel = (m) => (m.elo ? `روبوت ELO ${m.elo}` : (DIFFICULTIES.find((d) => d.id === m.difficulty)?.label || "الروبوت"));

  /* record each finished robot game once into the local match history */
  useEffect(() => {
    if (!over || !started || recordedRef.current) return;
    recordedRef.current = true;
    const result = iWon ? "win" : chess.isCheckmate() ? "loss" : "draw";
    const entry = { result, difficulty, elo, myColor, sans: history.map((m) => m.san), moves: history.length, date: new Date().toISOString() };
    setMatchLog((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      try { localStorage.setItem(ROBOT_HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, started]);

  const logWins = matchLog.filter((m) => m.result === "win").length;
  const logWinRate = matchLog.length ? Math.round((logWins / matchLog.length) * 100) : 0;

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] text-white relative overflow-hidden" dir="rtl"
        style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1b2b4a 0%, #0b1120 55%, #070b14 100%)" }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 right-1/4 w-[28rem] h-[28rem] bg-amber-500/[0.08] rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -35, 0], y: [0, 25, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-emerald-500/[0.08] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <button onClick={() => nav("/clubs/chess")} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </button>
            {started && (
              <div className="flex items-center gap-2">
                <Button onClick={undo} disabled={history.length === 0 || thinking} variant="outline"
                  className="rounded-full h-11 px-4 text-xs border-white/15 text-slate-200 bg-white/5 hover:bg-white/10 disabled:opacity-40">
                  <Undo2 className="w-4 h-4 ml-1" /> تراجع
                </Button>
                <Button onClick={newGame} className="rounded-full h-11 px-4 text-xs bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold">
                  <Plus className="w-4 h-4 ml-1" /> مباراة جديدة
                </Button>
              </div>
            )}
          </div>

          {!started ? (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}
              className="max-w-xl mx-auto mt-4 sm:mt-10">
              <div className="text-center mb-8">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 mx-auto rounded-[24px] grid place-items-center bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-300/30 shadow-[0_20px_50px_-15px_rgba(99,102,241,0.6)]">
                  <Bot className="w-10 h-10 text-indigo-300" />
                </motion.div>
                <h1 className="font-head text-3xl font-extrabold mt-5">العب ضد الروبوت 🤖</h1>
                <p className="text-slate-400 mt-2">بدون حدود، بدون نقاط، بدون تجارب. اختر مستواك وابدأ.</p>
              </div>

              <div className="rounded-3xl p-5 sm:p-6 bg-white/[0.05] border border-white/10 backdrop-blur-xl space-y-6">
                <div>
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <div className="text-sm font-bold text-slate-300">قوة الروبوت (ELO)</div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min="100" max="3500" step="10" value={elo} data-testid="robot-elo-input"
                        onChange={(e) => changeElo(e.target.value)}
                        className="w-24 rounded-xl bg-white/[0.06] border border-indigo-300/30 px-2.5 py-1.5 text-center font-head text-lg font-black text-white tabular-nums outline-none focus:border-indigo-300/70" dir="ltr" />
                    </div>
                  </div>
                  <input type="range" min="100" max="3500" step="10" value={elo} data-testid="robot-elo-slider"
                    onChange={(e) => changeElo(e.target.value)} dir="ltr"
                    className="w-full accent-indigo-500 h-2 cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold tabular-nums" dir="ltr"><span>100</span><span>3500</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[[300, "مبتدئ 🌱"], [800, "هاوٍ"], [1200, "متوسط ⚔️"], [1700, "قوي"], [2200, "خبير 🔥"], [2800, "أستاذ"], [3500, "خارق 👑"]].map(([v, l]) => (
                      <button key={v} onClick={() => changeElo(v)} data-testid={`robot-elo-${v}`}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold border transition-all ${elo === v
                          ? "bg-gradient-to-b from-indigo-500 to-violet-600 border-indigo-300/50 text-white scale-105"
                          : "bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.09]"}`}>
                        {l} · {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    {elo <= 500 ? "روبوت وديع يتعلم معك · يخطئ كثيراً" : elo <= 1100 ? "تحدٍّ لطيف للمبتدئين" : elo <= 1700 ? "خصم متوازن لأغلب اللاعبين" : elo <= 2400 ? "خصم شرس · فكّر قبل كل نقلة" : "أقصى قوة عند محرك المنصة · بالتوفيق 👑"}
                  </p>
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-300 mb-3">العب بـ</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button data-testid="robot-play-white" onClick={() => startGame("w")}
                      className="rounded-2xl px-3 py-4 border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] transition-all group">
                      <img src={pieceSrc("k", "w")} alt="" className="w-10 h-10 mx-auto drop-shadow-[0_4px_5px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" draggable={false} />
                      <div className="text-sm font-bold mt-2">الأبيض</div>
                    </button>
                    <button data-testid="robot-play-random" onClick={() => startGame("random")}
                      className="rounded-2xl px-3 py-4 border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] transition-all group">
                      <div className="flex justify-center -space-x-2">
                        <img src={pieceSrc("k", "w")} alt="" className="w-9 h-9 drop-shadow-[0_4px_5px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" draggable={false} />
                        <img src={pieceSrc("k", "b")} alt="" className="w-9 h-9 drop-shadow-[0_4px_5px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" draggable={false} />
                      </div>
                      <div className="text-sm font-bold mt-2.5">عشوائي 🎲</div>
                    </button>
                    <button data-testid="robot-play-black" onClick={() => startGame("b")}
                      className="rounded-2xl px-3 py-4 border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] transition-all group">
                      <img src={pieceSrc("k", "b")} alt="" className="w-10 h-10 mx-auto drop-shadow-[0_4px_5px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" draggable={false} />
                      <div className="text-sm font-bold mt-2">الأسود</div>
                    </button>
                  </div>
                </div>
              </div>

              {matchLog.length > 0 && (
                <div className="rounded-3xl p-5 sm:p-6 bg-white/[0.05] border border-white/10 backdrop-blur-xl mt-5" data-testid="robot-history-panel">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-head font-bold flex items-center gap-2 text-slate-200">
                      <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_6px_16px_-4px_rgba(245,158,11,0.6)]"><History className="w-4 h-4 text-white" /></span>
                      سجل مبارياتي ضد الروبوت
                    </h3>
                    <span className="rounded-full bg-amber-400/15 border border-amber-300/25 text-amber-200 px-3 py-1 text-[11px] font-extrabold tabular-nums">
                      نسبة الفوز {logWinRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-semibold">
                    <span><span className="text-slate-100 font-extrabold tabular-nums">{matchLog.length}</span> مباراة</span>
                    <span><span className="text-emerald-300 font-extrabold tabular-nums">{logWins}</span> فوز</span>
                    <span><span className="text-rose-300 font-extrabold tabular-nums">{matchLog.filter((m) => m.result === "loss").length}</span> خسارة</span>
                    <span><span className="text-slate-200 font-extrabold tabular-nums">{matchLog.filter((m) => m.result === "draw").length}</span> تعادل</span>
                  </div>
                  <div className="mt-3.5 space-y-1.5">
                    {matchLog.slice(0, 6).map((m, i) => (
                      <div key={`${m.date}-${i}`} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${m.result === "win" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25" : m.result === "loss" ? "bg-rose-500/15 text-rose-300 border border-rose-400/25" : "bg-slate-500/20 text-slate-300 border border-slate-400/25"}`}>
                          {m.result === "win" ? "فوز 🏆" : m.result === "loss" ? "خسارة" : "تعادل"}
                        </span>
                        <span className="flex-1 min-w-0 text-xs font-bold text-slate-300 truncate">
                          {histLabel(m)}
                        </span>
                        {Array.isArray(m.sans) && m.sans.length > 0 && (
                          <button onClick={() => setAnalysis({ sans: m.sans, myColor: m.myColor || "w" })}
                            className="shrink-0 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 px-2.5 py-1 text-[11px] font-extrabold hover:bg-violet-500/25 transition">
                            تحليل 🔍
                          </button>
                        )}
                        <span className="text-[11px] text-slate-500 tabular-nums">{m.moves} نقلة</span>
                        <span className="text-[11px] text-slate-500 tabular-nums" dir="ltr">{String(m.date || "").slice(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] gap-5 lg:gap-6 items-start">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="min-w-0">
                <PlayerBar name="الروبوت" rating={elo} active={thinking || (turn === robotColor && !over)} you={false}
                  caps={robotCaps} matAhead={matDiff < 0 ? -matDiff : 0} color={robotColor} />
                <div className="my-3 sm:my-4 lg:my-5">
                  <ChessBoardView
                    chess={chess} pieces={pieces} theme={theme} themeId={themeId} setTheme={setTheme}
                    orientation={orientation} flipped={flipped} setFlipped={setFlipped}
                    sel={sel} legal={legal} lastMove={lastMove} kingSq={kingSq}
                    onSquareClick={onSquareClick}
                    movableColor={myTurn ? myColor : null}
                    promo={promo}
                    onPromote={(t) => doMove(promo.from, promo.to, t)}
                    onCancelPromo={() => { setPromo(null); setSel(null); setLegal([]); }} />
                </div>
                <PlayerBar name={`${user?.name || "أنت"} (أنت)`} rating={user?.chess_rating} active={!!myTurn} you
                  caps={myCaps} matAhead={matDiff > 0 ? matDiff : 0} color={myColor} />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="space-y-4 min-w-0">
                <div className="rounded-3xl p-4 sm:p-5 lg:p-6 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                  <h3 className="font-head font-bold flex items-center gap-2 mb-3 text-indigo-300">
                    <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-indigo-400 to-violet-600 shadow-[0_6px_16px_-4px_rgba(99,102,241,0.6)]"><Bot className="w-4 h-4 text-white" /></span>
                    ضد الروبوت · {diffLabel}
                  </h3>
                  <AnimatePresence mode="wait">
                    <motion.div key={over ? "over" : thinking ? "think" : turn}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className={`relative overflow-hidden text-sm px-3 py-2.5 rounded-2xl font-medium border ${over
                        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                        : myTurn
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-indigo-500/15 text-indigo-200 border-indigo-500/30"}`}>
                      {!over && (
                        <motion.span className="absolute inset-0 pointer-events-none"
                          animate={{ x: ["-130%", "130%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
                          style={{ background: "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)" }} />
                      )}
                      <span className="relative">{over ? resultText : thinking ? "الروبوت يفكّر… 🤔" : myTurn ? "دورك · حرّك قطعة" : "…"}</span>
                    </motion.div>
                  </AnimatePresence>
                  {inCheck && !over && <div className="text-sm text-red-400 mt-2 font-bold animate-pulse">كش! 👑</div>}
                  {openingNow && (
                    <div data-testid="robot-opening" className="mt-3 flex items-start gap-2 rounded-2xl bg-violet-500/10 border border-violet-400/25 px-3 py-2.5">
                      <BookOpenCheck className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                      <p className="text-xs leading-5 text-slate-300">
                        الافتتاحية: <b className="text-white">{openingNow.ar}</b>
                        <span className="block text-slate-400" dir="ltr">{openingNow.name}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl p-4 sm:p-5 lg:p-6 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                  <h4 className="font-semibold text-sm mb-3 text-slate-300">النقلات ({history.length})</h4>
                  <div ref={movesRef} className="max-h-40 sm:max-h-48 lg:max-h-[380px] xl:max-h-[460px] overflow-y-auto pr-1" dir="ltr">
                    {movePairs.length === 0 ? (
                      <div className="text-sm text-slate-500 text-center py-4">لا نقلات بعد · ابدأ اللعب!</div>
                    ) : (
                      <div className="grid grid-cols-[2rem_1fr_1fr] gap-y-1 text-sm font-mono">
                        {movePairs.map((pair, i) => (
                          <React.Fragment key={i}>
                            <span className="text-slate-500">{i + 1}.</span>
                            <MoveCell san={pair[0]?.san} last={i * 2 === history.length - 1} />
                            <MoveCell san={pair[1]?.san} last={i * 2 + 1 === history.length - 1} />
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {analysis && (
            <ChessAnalysis sans={analysis.sans} myColor={analysis.myColor} opponentLabel="الروبوت"
              onClose={() => setAnalysis(null)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {started && over && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="relative overflow-hidden bg-slate-900 border border-indigo-300/25 rounded-[28px] p-8 max-w-sm w-full text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl"
                  style={{ background: iWon ? "rgba(252,211,77,0.18)" : "rgba(99,102,241,0.18)" }} />
                <div className="text-6xl mb-4 relative">{iWon ? "🏆" : chess.isCheckmate() ? "🤖" : "🤝"}</div>
                <h2 className="font-head text-2xl font-extrabold mb-1 relative">{resultText}</h2>
                <p className="text-slate-400 text-sm mb-6 relative">{history.length} نقلة · روبوت ELO {elo}</p>
                <button onClick={() => setAnalysis({ sans: sansNow, myColor })}
                  className="w-full relative mb-2 rounded-2xl h-11 bg-gradient-to-b from-violet-500 to-fuchsia-600 hover:from-violet-400 text-white font-bold text-sm inline-flex items-center justify-center gap-2">
                  <Gauge className="w-4 h-4" /> تحليل المباراة · كل نقلة وأفضل بديل 🔍
                </button>
                <div className="flex gap-2 relative">
                  <Button onClick={newGame} className="flex-1 rounded-2xl bg-gradient-to-b from-indigo-500 to-violet-600 hover:from-indigo-400 text-white font-bold">مباراة جديدة</Button>
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

function MoveCell({ san, last }) {
  if (!san) return <span />;
  return (
    <span className={`px-1.5 py-0.5 -mx-1.5 rounded-lg w-fit ${last ? "bg-amber-400/25 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.25)]" : "text-slate-200"}`}>
      {san}
    </span>
  );
}
