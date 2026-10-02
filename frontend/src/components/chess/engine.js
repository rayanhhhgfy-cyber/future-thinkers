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
