import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr, wsUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, ArrowRight, Crown, Swords } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import { FILES, pieceSrc, useSyncedPieces, useChessTheme, capturedBy, materialOf, PlayerBar, StatusPill } from "@/components/chess/shared";
import ChessBoardView from "@/components/chess/ChessBoardView";

export default function ChessGame() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(null);
  const [tick, setTick] = useState(0);
  const pieces = useSyncedPieces(chess, tick);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [promo, setPromo] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [theme, themeId, setTheme] = useChessTheme();
  const movesRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/chess/${"games"}/${id}`);
      setGame(data);
      const c = new Chess();
      try { c.load(data.fen); } catch {}
      setChess(c);
      const hist = c.history({ verbose: true });
      if (hist.length) setLastMove({ from: hist[hist.length - 1].from, to: hist[hist.length - 1].to });
    } catch (e) { toast.error(apiErr(e)); }
  }, [id]);

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

  const doMove = async (from, to, promotion) => {
    if (!chess) return;
    const move = chess.move({ from, to, promotion });
    if (!move) return;
    const over = chess.isGameOver();
    const nextTurn = chess.turn();
    setLastMove({ from: move.from, to: move.to });
    setTick((t) => t + 1);
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
        if (cand.some((m) => m.promotion)) { setPromo({ from: sel, to: square, color: myColor }); return; }
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 right-1/4 w-[28rem] h-[28rem] bg-amber-500/[0.08] rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -35, 0], y: [0, 25, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] bg-emerald-500/[0.08] rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, 25, 0], y: [0, 35, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/2 w-[22rem] h-[22rem] bg-indigo-500/[0.05] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <button onClick={() => nav("/clubs/chess")} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </button>
            <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Swords className="w-4 h-4 text-amber-400" />
              <StatusPill myTurn={myTurn} finished={finished} />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="min-w-0">
              <PlayerBar name={opponent} rating={oppRating} active={!myTurn && !finished} you={false}
                caps={oppCaps} matAhead={matDiff < 0 ? -matDiff : 0} color={myColor === "w" ? "b" : "w"} />
              <div className="my-3 sm:my-4">
                <ChessBoardView
                  chess={chess} pieces={pieces} theme={theme} themeId={themeId} setTheme={setTheme}
                  orientation={orientation} flipped={flipped} setFlipped={setFlipped}
                  sel={sel} legal={legal} lastMove={lastMove} kingSq={kingSq}
                  onSquareClick={onSquareClick}
                  movableColor={myColor}
                  promo={promo}
                  onPromote={(t) => doMove(promo.from, promo.to, t)}
                  onCancelPromo={() => { setPromo(null); setSel(null); setLegal([]); }} />
              </div>
              <PlayerBar name={meName + " (أنت)"} rating={user.chess_rating} active={!!myTurn} you
                caps={myCaps} matAhead={matDiff > 0 ? matDiff : 0} color={myColor} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="space-y-4 min-w-0">
              <div className="rounded-3xl p-4 sm:p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h3 className="font-head font-bold flex items-center gap-2 mb-3 text-amber-300">
                  <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_6px_16px_-4px_rgba(245,158,11,0.6)]"><Crown className="w-4 h-4 text-slate-950" /></span>
                  حالة المباراة
                </h3>
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
                        className={`relative overflow-hidden text-sm px-3 py-2.5 rounded-2xl font-medium ${myTurn ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                        {myTurn && (
                          <motion.span className="absolute inset-0 pointer-events-none"
                            animate={{ x: ["-130%", "130%"] }}
                            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.4 }}
                            style={{ background: "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.16) 50%, transparent 75%)" }} />
                        )}
                        <span className="relative">{myTurn ? "دورك الآن — حرّك قطعة" : `بانتظار ${opponent}…`}</span>
                      </motion.div>
                    </AnimatePresence>
                    {inCheck && <div className="text-sm text-red-400 mt-2 font-bold animate-pulse">كش! الملك تحت التهديد 👑</div>}
                    <Button data-testid="resign-btn" onClick={resign} variant="outline" className="w-full mt-3 rounded-2xl text-red-300 border-red-500/30 bg-transparent hover:bg-red-500/10">
                      <Flag className="w-4 h-4 ml-1" /> انسحاب
                    </Button>
                  </>
                )}
              </div>

              <div className="rounded-3xl p-4 sm:p-5 border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <h4 className="font-semibold text-sm mb-3 text-slate-300">النقلات ({(game.moves || []).length})</h4>
                <div ref={movesRef} className="max-h-40 sm:max-h-48 lg:max-h-64 overflow-y-auto pr-1" dir="ltr">
                  {movePairs.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">لا نقلات بعد — ابدأ اللعب!</div>
                  ) : (
                    <div className="grid grid-cols-[2rem_1fr_1fr] gap-y-1 text-sm font-mono">
                      {movePairs.map((pair, i) => (
                        <React.Fragment key={i}>
                          <span className="text-slate-500">{i + 1}.</span>
                          <MoveCell san={pair[0]?.san} last={i * 2 === (game.moves || []).length - 1} />
                          <MoveCell san={pair[1]?.san} last={i * 2 + 1 === (game.moves || []).length - 1} />
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

function MoveCell({ san, last }) {
  if (!san) return <span />;
  return (
    <span className={`px-1.5 py-0.5 -mx-1.5 rounded-lg w-fit ${last ? "bg-amber-400/25 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.25)]" : "text-slate-200"}`}>
      {san}
    </span>
  );
}
