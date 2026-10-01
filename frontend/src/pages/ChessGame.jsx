import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr, wsUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, ArrowRight, Crown, Swords, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";

const PIECES = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚", P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function ChessGame() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(null);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
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
  const myTurn = game && game.status === "active" && game.turn === myColor;
  const ranks = (() => {
    const r = [8, 7, 6, 5, 4, 3, 2, 1];
    const f = [...FILES];
    if (myColor === "b") { r.reverse(); f.reverse(); }
    return { r, f };
  })();

  const onSquareClick = async (square) => {
    if (!myTurn || !chess) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const move = chess.move({ from: sel, to: square, promotion: "q" });
        if (move) {
          const over = chess.isGameOver();
          const nextTurn = chess.turn();
          setLastMove({ from: move.from, to: move.to });
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
        }
        setSel(null); setLegal([]);
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

  const movePairs = [];
  (game.moves || []).forEach((m, i) => {
    if (i % 2 === 0) movePairs.push([m]);
    else movePairs[movePairs.length - 1].push(m);
  });

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white relative overflow-hidden" dir="rtl">
        {/* ambient arena glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => nav("/clubs/chess")} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للحلبة
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Swords className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">مباراة شطرنج</span>
              <StatusPill myTurn={myTurn} finished={finished} />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <PlayerBar name={opponent} rating={oppRating} active={!myTurn && !finished} you={false} />
              <div className="my-3 relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-amber-500/25 via-transparent to-emerald-500/20 rounded-[28px] blur-xl" />
                <div className="relative aspect-square w-full max-w-[600px] mx-auto grid grid-cols-8 rounded-2xl overflow-hidden border-[6px] border-[#3d2b1f] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
                  {ranks.r.map((rank) => ranks.f.map((file) => {
                    const square = `${file}${rank}`;
                    const piece = chess.get(square);
                    const dark = (FILES.indexOf(file) + rank) % 2 === 0;
                    const isSel = sel === square;
                    const isLegal = legal.includes(square);
                    const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
                    const isKingCheck = kingSq === square;
                    const showFile = rank === ranks.r[ranks.r.length - 1];
                    const showRank = file === ranks.f[0];
                    return (
                      <button key={square} data-testid={`sq-${square}`} onClick={() => onSquareClick(square)}
                        className={`relative grid place-items-center transition-colors duration-150
                          ${dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"}
                          ${isLast ? (dark ? "!bg-[#b8a04a]" : "!bg-[#e8d06a]") : ""}
                          ${isSel ? "!bg-[#7fb069]" : ""}
                          ${isKingCheck ? "!bg-red-500" : ""}`}>
                        {showRank && <span className={`absolute top-0.5 right-1 text-[10px] font-bold ${dark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>{rank}</span>}
                        {showFile && <span className={`absolute bottom-0.5 left-1 text-[10px] font-bold ${dark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>{file}</span>}
                        {piece && (
                          <motion.span
                            key={piece.type + piece.color}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            className={`text-4xl sm:text-5xl leading-none select-none ${piece.color === "w" ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]" : "text-slate-900 drop-shadow-[0_2px_2px_rgba(255,255,255,0.25)]"}`}>
                            {PIECES[piece.color === "w" ? piece.type.toUpperCase() : piece.type]}
                          </motion.span>
                        )}
                        {isLegal && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute w-4 h-4 rounded-full bg-emerald-700/55 ring-2 ring-emerald-400/40"
                          />
                        )}
                        {isLegal && piece && (
                          <span className="absolute inset-0 rounded-none ring-4 ring-inset ring-emerald-500/70" />
                        )}
                      </button>
                    );
                  }))}
                </div>
              </div>
              <PlayerBar name={meName + " (أنت)"} rating={user.chess_rating} active={myTurn} you />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="space-y-4">
              <div className="bg-white/[0.06] backdrop-blur rounded-2xl p-5 border border-white/10">
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
                        className={`text-sm px-3 py-2.5 rounded-xl font-medium ${myTurn ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                        {myTurn ? "دورك الآن — حرّك قطعة ♟" : `بانتظار ${opponent}…`}
                      </motion.div>
                    </AnimatePresence>
                    {inCheck && <div className="text-sm text-red-400 mt-2 font-bold animate-pulse">كش! الملك تحت التهديد 👑</div>}
                    <Button data-testid="resign-btn" onClick={resign} variant="outline" className="w-full mt-3 rounded-xl text-red-300 border-red-500/30 bg-transparent hover:bg-red-500/10">
                      <Flag className="w-4 h-4 ml-1" /> انسحاب
                    </Button>
                  </>
                )}
              </div>

              <div className="bg-white/[0.06] backdrop-blur rounded-2xl p-5 border border-white/10">
                <h4 className="font-semibold text-sm mb-3 text-slate-300">النقلات ({(game.moves || []).length})</h4>
                <div ref={movesRef} className="max-h-56 overflow-y-auto pr-1" dir="ltr">
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
                className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }} className="text-6xl mb-4">
                  {game.result === "draw" ? "🤝" : iWon ? "🏆" : "♟"}
                </motion.div>
                <h2 className="font-head text-2xl font-extrabold mb-1">
                  {game.result === "draw" ? "انتهت بالتعادل" : iWon ? "مبروك الفوز!" : "انتهت المباراة"}
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  {game.result === "draw" ? "لا غالب ولا مغلوب هذه المرة" : `الفائز: ${game.result === "white" ? game.white_name : game.black_name}`}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => nav("/clubs/chess")} className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">عودة للحلبة</Button>
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
  if (finished) return <span className="px-2.5 py-1 rounded-full text-xs bg-white/10 text-slate-300">انتهت</span>;
  return myTurn
    ? <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">دورك</span>
    : <span className="px-2.5 py-1 rounded-full text-xs bg-white/10 text-slate-300">بانتظار الخصم</span>;
}

function PlayerBar({ name, rating, active, you }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={active ? { duration: 2, repeat: Infinity } : {}}
      className={`flex items-center justify-between px-4 py-3 rounded-2xl max-w-[600px] mx-auto border transition-colors
        ${active ? "bg-emerald-500/15 border-emerald-400/40 shadow-[0_0_24px_rgba(16,185,129,0.25)]" : "bg-white/[0.05] border-white/10"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full grid place-items-center font-extrabold text-lg ${you ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950" : "bg-gradient-to-br from-slate-600 to-slate-800 text-white"}`}>
          {name.trim()[0]}
        </div>
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {name}
            {active && <span className="flex gap-0.5">{[0, 1, 2].map((i) => <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />)}</span>}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" />{rating} ELO</div>
        </div>
      </div>
      {active && <span className="text-xs font-bold text-emerald-300">يفكّر…</span>}
    </motion.div>
  );
}
