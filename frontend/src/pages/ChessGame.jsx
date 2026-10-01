import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr, wsUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, ArrowRight, Crown, Swords, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const pieceSrc = (t, c) => `${process.env.PUBLIC_URL}/pieces/${c}${t.toUpperCase()}.svg`;

const THEMES = {
  emerald: {
    id: "emerald", label: "زمردي",
    light: "#ebecd9", dark: "#739552",
    lastLight: "#f7f769", lastDark: "#c0d33f",
    selA: "rgba(22,101,52,0.62)", selB: "rgba(22,101,52,0.38)",
    dot: "rgba(27,67,50,0.42)", cap: "rgba(27,67,50,0.55)",
    coordOnLight: "#739552", coordOnDark: "#ebecd9",
  },
  walnut: {
    id: "walnut", label: "خشبي",
    light: "#f0d9b5", dark: "#b58863",
    lastLight: "#f5e265", lastDark: "#c9a227",
    selA: "rgba(120,72,20,0.55)", selB: "rgba(120,72,20,0.32)",
    dot: "rgba(90,50,10,0.40)", cap: "rgba(90,50,10,0.55)",
    coordOnLight: "#b58863", coordOnDark: "#f0d9b5",
  },
  midnight: {
    id: "midnight", label: "ليلي",
    light: "#dee3e6", dark: "#7d97a5",
    lastLight: "#ffe27a", lastDark: "#d9a92f",
    selA: "rgba(30,58,138,0.55)", selB: "rgba(30,58,138,0.32)",
    dot: "rgba(15,40,70,0.40)", cap: "rgba(15,40,70,0.55)",
    coordOnLight: "#7d97a5", coordOnDark: "#dee3e6",
  },
};

const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };

function boardMap(ch) {
  const m = {};
  ch.board().forEach((row) => row.forEach((s) => { if (s) m[s.square] = { type: s.type, color: s.color }; }));
  return m;
}

/* pieces captured BY the given color (opponent pieces missing from the board) */
function capturedBy(ch, byColor) {
  const counts = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  ch.board().forEach((row) => row.forEach((s) => {
    if (s && s.color !== byColor && START_COUNT[s.type] !== undefined) counts[s.type]++;
  }));
  const caps = [];
  for (const t of ["q", "r", "b", "n", "p"]) {
    for (let i = 0; i < START_COUNT[t] - counts[t]; i++) caps.push(t);
  }
  return caps;
}
const materialOf = (caps) => caps.reduce((a, t) => a + VAL[t], 0);

export default function ChessGame() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promo, setPromo] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [themeId, setThemeId] = useState(() => localStorage.getItem("ft-chess-theme") || "emerald");
  const movesRef = useRef(null);
  const pidRef = useRef(1);
  const theme = THEMES[themeId] || THEMES.emerald;

  const setTheme = (t) => { setThemeId(t); try { localStorage.setItem("ft-chess-theme", t); } catch {} };

  /* match previous piece identities to the new position so movers slide */
  const syncPieces = useCallback((ch, prev) => {
    const cur = boardMap(ch);
    const next = [];
    const usedSq = new Set();
    const placed = new Set();
    for (const p of prev) {
      const c = cur[p.square];
      if (c && c.type === p.type && c.color === p.color && !usedSq.has(p.square)) {
        usedSq.add(p.square); placed.add(p.id);
        next.push(p);
      }
    }
    const rest = prev.filter((p) => !placed.has(p.id));
    for (const sq of Object.keys(cur)) {
      if (usedSq.has(sq)) continue;
      const c = cur[sq];
      const i = rest.findIndex((p) => !p._used && p.type === c.type && p.color === c.color);
      if (i >= 0) { rest[i]._used = true; next.push({ ...rest[i], square: sq }); }
      else next.push({ id: `p${pidRef.current++}`, type: c.type, color: c.color, square: sq });
    }
    return next;
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/chess/${"games"}/${id}`);
      setGame(data);
      const c = new Chess();
      try { c.load(data.fen); } catch {}
      setChess(c);
      setPieces((prev) => syncPieces(c, prev));
      const hist = c.history({ verbose: true });
      if (hist.length) setLastMove({ from: hist[hist.length - 1].from, to: hist[hist.length - 1].to });
    } catch (e) { toast.error(apiErr(e)); }
  }, [id, syncPieces]);

  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(wsUrl(`/api/ws/chess/${id}`));
      ws.onmessage = () => load();
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, [id, load]);

  useEffect(() => {
    if (movesRef.current) movesRef.current.scrollTop = movesRef.current.scrollHeight;
  }, [game?.moves?.length]);

  const myColor = game?.my_color;
  const orientation = flipped ? (myColor === "w" ? "b" : "w") : myColor;
  const myTurn = game && game.status === "active" && game.turn === myColor;
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

  const doMove = async (from, to, promotion) => {
    if (!chess) return;
    const move = chess.move({ from, to, promotion });
    if (!move) return;
    const over = chess.isGameOver();
    const nextTurn = chess.turn();
    setLastMove({ from: move.from, to: move.to });
    setPieces((prev) => syncPieces(chess, prev));
    setSel(null); setLegal([]); setPromo(null);
    try {
      await api.post(`/chess/games/${id}/move`, { fen: chess.fen(), san: move.san, pgn: chess.pgn(), turn: nextTurn });
      setGame((g) => ({ ...g, fen: chess.fen(), turn: nextTurn }));
      if (over) {
        let result = "draw";
        if (chess.isCheckmate()) result = move.color === "w" ? "white" : "black";
        await api.post(`/chess/games/${id}/result`, { result });
        toast.success(result === "draw" ? "تعادل!" : "كش مات!");
        load();
      }
    } catch (e) { toast.error(apiErr(e)); load(); }
  };

  const onSquareClick = (square) => {
    if (!myTurn || !chess || promo) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const cand = chess.moves({ square: sel, verbose: true }).filter((m) => m.to === square);
        if (cand.some((m) => m.promotion)) { setPromo({ from: sel, to: square }); return; }
        doMove(sel, square, "q");
        return;
      }
    }
    if (piece && piece.color === myColor) {
      setSel(square);
      setLegal(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else { setSel(null); setLegal([]); }
  };

  const resign = async () => {
    if (!window.confirm("متأكد من الانسحاب؟")) return;
    try { await api.post(`/chess/games/${id}/resign`); toast.info("انسحبت من المباراة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!game || !chess) return <Layout><PageLoader /></Layout>;

  const inCheck = chess.inCheck?.() || chess.isCheck?.();
  const kingSq = (() => {
    if (!inCheck) return null;
    const turn = chess.turn();
    for (const rank of [8, 7, 6, 5, 4, 3, 2, 1])
      for (const file of FILES) {
        const sq = `${file}${rank}`;
        const pc = chess.get(sq);
        if (pc && pc.type === "k" && pc.color === turn) return sq;
      }
    return null;
  })();
  const opponent = myColor === "w" ? game.black_name : game.white_name;
  const meName = myColor === "w" ? game.white_name : game.black_name;
  const oppRating = myColor === "w" ? game.black_rating : game.white_rating;
  const finished = game.status === "finished";
  const iWon = finished && game.result !== "draw" && game.winner_id === user.id;

  const myCaps = capturedBy(chess, myColor);
  const oppCaps = capturedBy(chess, myColor === "w" ? "b" : "w");
  const matDiff = materialOf(myCaps) - materialOf(oppCaps);

  const movePairs = [];
  (game.moves || []).forEach((m, i) => {
    if (i % 2 === 0) movePairs.push([m]);
    else movePairs[movePairs.length - 1].push(m);
  });

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] text-white relative overflow-hidden" dir="rtl"
        style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1b2b4a 0%, #0b1120 55%, #070b14 100%)" }}>
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-1/4 w-[28rem] h-[28rem] bg-amber-500/[0.07] rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-emerald-500/[0.07] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* header */}
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <button onClick={() => nav("/clubs/chess")} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </button>
            <div className="flex items-center gap-2">
              {/* theme swatches */}
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
              <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <Swords className="w-4 h-4 text-amber-400" />
                <StatusPill myTurn={myTurn} finished={finished} />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
            {/* board column */}
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="min-w-0">
              <PlayerBar name={opponent} rating={oppRating} active={!myTurn && !finished} you={false}
                caps={oppCaps} matAhead={matDiff < 0 ? -matDiff : 0} color={myColor === "w" ? "b" : "w"} />

              <div className="my-3 sm:my-4">
                <motion.div
                  animate={myTurn && !finished ? { scale: [1, 1.004, 1] } : { scale: 1 }}
                  transition={myTurn && !finished ? { duration: 3, repeat: Infinity } : {}}
                  className="w-full max-w-[620px] mx-auto rounded-[26px] p-2 sm:p-2.5 shadow-[0_35px_80px_-20px_rgba(0,0,0,0.85),0_0_60px_-20px_rgba(245,158,11,0.25)]"
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
                                    onClick={() => doMove(promo.from, promo.to, t)}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl grid place-items-center bg-gradient-to-b from-white/15 to-white/5 border border-white/15 hover:border-amber-300/60 hover:shadow-[0_0_24px_rgba(252,211,77,0.35)] transition-shadow">
                                    <img src={pieceSrc(t, myColor)} alt={t} draggable={false} className="w-12 h-12 sm:w-14 sm:h-14" />
                                  </motion.button>
                                ))}
                              </div>
                              <button onClick={() => { setPromo(null); setSel(null); setLegal([]); }}
                                className="w-full mt-4 text-xs text-slate-400 hover:text-slate-200 transition-colors">إلغاء</button>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </div>

              <PlayerBar name={meName + " (أنت)"} rating={user.chess_rating} active={!!myTurn} you
                caps={myCaps} matAhead={matDiff > 0 ? matDiff : 0} color={myColor} />
            </motion.div>

            {/* side panel */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="space-y-4 min-w-0">
              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h3 className="font-head font-bold flex items-center gap-2 mb-3 text-amber-300"><Crown className="w-5 h-5" /> حالة المباراة</h3>
                {finished ? (
                  <div className="text-center py-2">
                    <div className="text-xl font-extrabold">{game.result === "draw" ? "تعادل 🤝" : iWon ? "فزت! 🏆" : "خسرت المباراة"}</div>
                    <div className="text-sm text-slate-400 mt-1">الفائز: {game.result === "white" ? game.white_name : game.result === "black" ? game.black_name : "لا أحد"}</div>
                  </div>
                ) : (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.div key={myTurn ? "you" : "wait"}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className={`text-sm px-3 py-2.5 rounded-2xl font-medium ${myTurn ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                        {myTurn ? "دورك الآن — حرّك قطعة" : `بانتظار ${opponent}…`}
                      </motion.div>
                    </AnimatePresence>
                    {inCheck && <div className="text-sm text-red-400 mt-2 font-bold animate-pulse">كش! الملك تحت التهديد 👑</div>}
                    <Button data-testid="resign-btn" onClick={resign} variant="outline" className="w-full mt-3 rounded-2xl text-red-300 border-red-500/30 bg-transparent hover:bg-red-500/10">
                      <Flag className="w-4 h-4 ml-1" /> انسحاب
                    </Button>
                  </>
                )}
              </div>

              <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h4 className="font-semibold text-sm mb-3 text-slate-300">النقلات ({(game.moves || []).length})</h4>
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

        {/* game over overlay */}
        <AnimatePresence>
          {finished && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="relative overflow-hidden bg-slate-900 border border-amber-300/20 rounded-[28px] p-8 max-w-sm w-full text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl"
                  style={{ background: iWon ? "rgba(252,211,77,0.18)" : "rgba(148,163,184,0.12)" }} />
                <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }} className="text-6xl mb-4 relative">
                  {game.result === "draw" ? "🤝" : iWon ? "🏆" : <img src={pieceSrc("k", myColor === "w" ? "b" : "w")} alt="" className="w-16 h-16 mx-auto opacity-80" />}
                </motion.div>
                <h2 className="font-head text-2xl font-extrabold mb-1 relative">
                  {game.result === "draw" ? "انتهت بالتعادل" : iWon ? "مبروك الفوز!" : "انتهت المباراة"}
                </h2>
                <p className="text-slate-400 text-sm mb-6 relative">
                  {game.result === "draw" ? "لا غالب ولا مغلوب هذه المرة" : `الفائز: ${game.result === "white" ? game.white_name : game.black_name}`}
                </p>
                <div className="flex gap-2 relative">
                  <Button onClick={() => nav("/clubs/chess")} className="flex-1 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold shadow-[0_10px_30px_-8px_rgba(245,158,11,0.6)]">عودة للحلبة</Button>
                  <Button onClick={() => nav("/leaderboard")} variant="outline" className="flex-1 rounded-2xl border-white/20 text-white bg-transparent hover:bg-white/10">الترتيب</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function StatusPill({ myTurn, finished }) {
  if (finished) return <span className="text-xs text-slate-300">انتهت</span>;
  return myTurn
    ? <span className="text-xs font-bold text-emerald-300 animate-pulse">دورك الآن</span>
    : <span className="text-xs text-slate-300">بانتظار الخصم</span>;
}

function PlayerBar({ name, rating, active, you, caps = [], matAhead = 0, color }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={active ? { duration: 2.2, repeat: Infinity } : {}}
      className={`w-full max-w-[620px] mx-auto rounded-3xl px-4 py-3 border backdrop-blur-xl transition-all
        ${active
          ? "bg-emerald-500/[0.12] border-emerald-400/40 shadow-[0_0_36px_-6px_rgba(16,185,129,0.45)]"
          : "bg-white/[0.05] border-white/10 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative w-11 h-11 rounded-2xl grid place-items-center font-extrabold text-lg shrink-0 shadow-lg
            ${you ? "bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950" : "bg-gradient-to-br from-slate-500 to-slate-800 text-white"}`}>
            {name.trim()[0]}
            {active && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm flex items-center gap-2 truncate">
              <span className="truncate">{name}</span>
              {active && <ThinkingDots />}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 font-mono">{rating || 1200}</span>
              {matAhead > 0 && <span className="text-emerald-300 font-bold">+{matAhead}</span>}
            </div>
          </div>
        </div>
        {caps.length > 0 && (
          <div className="flex items-center shrink-0" dir="ltr" title="قطع مأسورة">
            {caps.slice(0, 10).map((t, i) => (
              <img key={i} src={pieceSrc(t, color === "w" ? "b" : "w")} alt=""
                className="w-6 h-6 -ml-2.5 first:ml-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" draggable={false} />
            ))}
            {caps.length > 10 && <span className="text-[10px] text-slate-400 ml-1">+{caps.length - 10}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      ))}
    </span>
  );
}
