/* Free built-in chess robot · minimax with alpha-beta pruning.
   No APIs, no credits, no trials. Difficulty = search depth + blunder rate. */
import { Chess } from "chess.js";

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/* piece-square tables (from white's perspective, a8 → h1 order as chess.js board()) */
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function evaluate(chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100000 : 100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const table = PST[sq.type];
      const idx = sq.color === "w" ? r * 8 + f : (7 - r) * 8 + f;
      const v = VAL[sq.type] + table[idx];
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

/* order captures first (MVV-LVA-ish) so alpha-beta prunes harder */
function orderMoves(moves) {
  return moves.sort((a, b) => {
    const av = a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0;
    const bv = b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0;
    return bv - av;
  });
}

function search(chess, depth, alpha, beta) {
  if (depth === 0) return evaluate(chess);
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (moves.length === 0) return evaluate(chess);
  const maximizing = chess.turn() === "w";
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.max(best, search(chess, depth - 1, alpha, beta));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    chess.move(m);
    best = Math.min(best, search(chess, depth - 1, alpha, beta));
    chess.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export const DIFFICULTIES = [
  { id: "easy", label: "سهلة 🌱", depth: 1, blunder: 0.35, desc: "مناسبة للمبتدئين · الروبوت يخطئ أحياناً" },
  { id: "medium", label: "متوسطة ⚔️", depth: 2, blunder: 0.12, desc: "تحدٍّ متوازن لأغلب اللاعبين" },
  { id: "hard", label: "صعبة 🔥", depth: 3, blunder: 0, desc: "أقوى مستوى · فكّر جيداً قبل كل نقلة" },
];

/**
 * Pick the robot's move for the given difficulty.
 * Returns a chess.js move object (already applied? no · caller applies it).
 */
export function pickRobotMove(chess, difficultyId) {
  const diff = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1];
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  /* blunder: sometimes just play a random move */
  if (Math.random() < diff.blunder) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const maximizing = chess.turn() === "w";
  const scored = [];
  for (const m of orderMoves([...moves])) {
    chess.move(m);
    const s = search(chess, diff.depth - 1, -Infinity, Infinity);
    chess.undo();
    scored.push({ move: m, score: s });
  }
  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));

  /* easy/medium: pick from near-best moves so play feels human */
  if (diff.id !== "hard" && scored.length > 2) {
    const best = scored[0].score;
    const pool = scored.filter((s) => Math.abs(s.score - best) <= (diff.id === "easy" ? 90 : 40));
    return pool[Math.floor(Math.random() * pool.length)].move;
  }
  return scored[0].move;
}

export { Chess };

/* ---------------- ELO-driven robot ----------------
   One slider, honest mapping: low ELO = shallow search + frequent human
   mistakes, high ELO = deepest search this JS engine can do. */
export function eloToParams(elo) {
  const e = Math.max(100, Math.min(3500, Math.round(elo || 1200)));
  if (e <= 400) return { depth: 1, blunder: 0.45, spread: 260, random: 0.18 };
  if (e <= 800) return { depth: 1, blunder: 0.30, spread: 180, random: 0.08 };
  if (e <= 1200) return { depth: 2, blunder: 0.18, spread: 120, random: 0.03 };
  if (e <= 1600) return { depth: 2, blunder: 0.08, spread: 70, random: 0 };
  if (e <= 2000) return { depth: 3, blunder: 0.03, spread: 35, random: 0 };
  if (e <= 2400) return { depth: 3, blunder: 0, spread: 18, random: 0 };
  if (e <= 2900) return { depth: 4, blunder: 0, spread: 8, random: 0 };
  return { depth: 4, blunder: 0, spread: 0, random: 0 };
}

function rankRoot(chess, depth) {
  const moves = orderMoves(chess.moves({ verbose: true }));
  const maximizing = chess.turn() === "w";
  const scored = moves.map((m) => {
    chess.move(m);
    const s = search(chess, Math.max(0, depth - 1), -Infinity, Infinity);
    chess.undo();
    return { move: m, score: s };
  });
  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));
  return scored;
}

export function pickMoveElo(chess, elo) {
  const p = eloToParams(elo);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  if (Math.random() < p.random) return moves[Math.floor(Math.random() * moves.length)];
  const scored = rankRoot(chess, p.depth);
  if (Math.random() < p.blunder && scored.length > 3) {
    /* a human-like mistake: pick from the weaker half of the move list */
    const weak = scored.slice(Math.floor(scored.length / 2));
    return weak[Math.floor(Math.random() * weak.length)].move;
  }
  const best = scored[0].score;
  const pool = scored.filter((s) => Math.abs(s.score - best) <= p.spread);
  return pool[Math.floor(Math.random() * pool.length)].move;
}

/* ---------------- post-game analysis ----------------
   Replays the game with the platform engine and grades every move:
   best move available, centipawn loss of the played move, verdict. */
export const VERDICTS = [
  { id: "best", label: "الأفضل ⭐", max: 15 },
  { id: "good", label: "جيدة 👍", max: 45 },
  { id: "ok", label: "مقبولة", max: 95 },
  { id: "inaccuracy", label: "غير دقيقة ⚠️", max: 190 },
  { id: "mistake", label: "خطأ ✖", max: 380 },
  { id: "blunder", label: "غلطة فادحة 💥", max: Infinity },
];

export async function analyseGame(sans, { depth = 2, onProgress } = {}) {
  const chess = new Chess();
  const out = [];
  const totals = {
    w: { loss: 0, n: 0, counts: {} }, b: { loss: 0, n: 0, counts: {} },
  };
  for (let i = 0; i < sans.length; i++) {
    const mover = chess.turn();
    const ranked = rankRoot(chess, depth);
    if (!ranked.length) break;
    const best = ranked[0];
    const playedSan = sans[i];
    const playedMove = chess.move(playedSan);
    if (!playedMove) break;
    const actual = ranked.find((r) => r.move.from === playedMove.from && r.move.to === playedMove.to
      && (r.move.promotion || "q") === (playedMove.promotion || "q")) || best;
    let loss = mover === "w" ? best.score - actual.score : actual.score - best.score;
    loss = Math.max(0, Math.min(1500, loss));
    const verdict = VERDICTS.find((v) => loss <= v.max) || VERDICTS[VERDICTS.length - 1];
    const entry = {
      ply: i, san: playedSan, color: mover,
      bestSan: best.move.san, bestFrom: best.move.from, bestTo: best.move.to,
      isBest: best.move.from === playedMove.from && best.move.to === playedMove.to,
      loss, verdict: verdict.id,
      evalAfter: actual.score, /* centipawns, white perspective */
    };
    out.push(entry);
    const t = totals[mover];
    t.loss += loss; t.n += 1;
    t.counts[verdict.id] = (t.counts[verdict.id] || 0) + 1;
    if (onProgress) onProgress(i + 1, sans.length);
    /* stay responsive on long games */
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 0));
  }
  const accuracy = (c) => {
    const t = totals[c];
    if (!t.n) return null;
    return Math.max(1, Math.min(99, Math.round(100 * Math.exp(-0.004 * (t.loss / t.n)))));
  };
  return { moves: out, totals, accuracyW: accuracy("w"), accuracyB: accuracy("b") };
}
