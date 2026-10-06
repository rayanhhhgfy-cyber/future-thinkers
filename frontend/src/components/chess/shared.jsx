import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const pieceSrc = (t, c) => `${process.env.PUBLIC_URL}/pieces/${c}${t.toUpperCase()}.svg`;

export const THEMES = {
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
  royal: {
    id: "royal", label: "ملكي",
    light: "#e9e5f7", dark: "#7768ae",
    lastLight: "#f2e7b8", lastDark: "#c9b978",
    selA: "rgba(76,29,149,0.55)", selB: "rgba(76,29,149,0.32)",
    dot: "rgba(49,25,105,0.40)", cap: "rgba(49,25,105,0.55)",
    coordOnLight: "#7768ae", coordOnDark: "#e9e5f7",
  },
  ocean: {
    id: "ocean", label: "محيطي",
    light: "#e2eff3", dark: "#4f8299",
    lastLight: "#f2e7b8", lastDark: "#c2af74",
    selA: "rgba(8,90,120,0.55)", selB: "rgba(8,90,120,0.32)",
    dot: "rgba(10,60,85,0.40)", cap: "rgba(10,60,85,0.55)",
    coordOnLight: "#4f8299", coordOnDark: "#e2eff3",
  },
  crimson: {
    id: "crimson", label: "قرمزي",
    light: "#f4e6e2", dark: "#a96055",
    lastLight: "#f5e9ba", lastDark: "#c9b878",
    selA: "rgba(127,29,29,0.50)", selB: "rgba(127,29,29,0.30)",
    dot: "rgba(100,25,20,0.38)", cap: "rgba(100,25,20,0.52)",
    coordOnLight: "#a96055", coordOnDark: "#f4e6e2",
  },
  sand: {
    id: "sand", label: "رملي",
    light: "#f6edd8", dark: "#c0a26f",
    lastLight: "#f8f0a8", lastDark: "#d3c078",
    selA: "rgba(133,77,14,0.50)", selB: "rgba(133,77,14,0.28)",
    dot: "rgba(105,70,20,0.36)", cap: "rgba(105,70,20,0.50)",
    coordOnLight: "#c0a26f", coordOnDark: "#f6edd8",
  },
  forest: {
    id: "forest", label: "غابي",
    light: "#eceeda", dark: "#5c7052",
    lastLight: "#f3ecb6", lastDark: "#bfc07a",
    selA: "rgba(30,64,32,0.55)", selB: "rgba(30,64,32,0.32)",
    dot: "rgba(24,50,26,0.40)", cap: "rgba(24,50,26,0.55)",
    coordOnLight: "#5c7052", coordOnDark: "#eceeda",
  },
};

/* piece-set themes · color/glow treatments layered over the base SVGs */
export const PIECE_SETS = [
  { id: "classic", label: "كلاسيكية", w: "", b: "" },
  { id: "gold", label: "ذهبية",
    w: "sepia(0.55) saturate(2.7) hue-rotate(-9deg) brightness(1.07) contrast(1.03)",
    b: "sepia(0.5) saturate(2.3) hue-rotate(-11deg) brightness(0.74) contrast(1.06)" },
  { id: "silver", label: "فضية",
    w: "grayscale(1) brightness(1.13) contrast(1.06)",
    b: "grayscale(1) brightness(0.55) contrast(1.12)" },
  { id: "neon", label: "نيون",
    w: "drop-shadow(0 0 5px rgba(34,211,238,0.95)) brightness(1.06)",
    b: "drop-shadow(0 0 5px rgba(244,114,182,0.95)) brightness(0.9)" },
  { id: "candy", label: "ملوّنة",
    w: "hue-rotate(165deg) saturate(1.5) brightness(1.05)",
    b: "hue-rotate(-35deg) saturate(1.6) brightness(0.8)" },
];
export const pieceFilterOf = (setId, color) => {
  const set = PIECE_SETS.find((x) => x.id === setId) || PIECE_SETS[0];
  return color === "w" ? set.w : set.b;
};
export function usePieceSet() {
  const [pieceSetId, setPieceSetIdState] = useState(() => {
    try { return localStorage.getItem("ft-chess-pieces") || "classic"; } catch { return "classic"; }
  });
  const setPieceSet = (id) => {
    setPieceSetIdState(id);
    try { localStorage.setItem("ft-chess-pieces", id); } catch {}
    try { window.dispatchEvent(new CustomEvent("ft-pieceset", { detail: id })); } catch {}
  };
  return [pieceSetId, setPieceSet];
}
export function useSyncedPieceSet() {
  const [id, setId] = useState(() => {
    try { return localStorage.getItem("ft-chess-pieces") || "classic"; } catch { return "classic"; }
  });
  useEffect(() => {
    const fn = (e) => setId((e && e.detail) || "classic");
    window.addEventListener("ft-pieceset", fn);
    return () => window.removeEventListener("ft-pieceset", fn);
  }, []);
  return id;
}

const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };

export function boardMap(ch) {
  const m = {};
  ch.board().forEach((row) => row.forEach((s) => { if (s) m[s.square] = { type: s.type, color: s.color }; }));
  return m;
}

/* pieces captured BY the given color (opponent pieces missing from the board) */
export function capturedBy(ch, byColor) {
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
export const materialOf = (caps) => caps.reduce((a, t) => a + VAL[t], 0);

/* match previous piece identities to the new position so movers slide instead of popping */
function syncPieces(ch, prev, pidRef) {
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
}

/* chess: a Chess instance. bump `version` whenever the same instance is mutated in place. */
export function useSyncedPieces(chess, version) {
  const pidRef = useRef(1);
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!chess) return;
    setPieces((prev) => syncPieces(chess, prev, pidRef));
  }, [chess, version]);
  return pieces;
}

export function useChessTheme() {
  const [themeId, setThemeId] = useState(() => {
    try { return localStorage.getItem("ft-chess-theme") || "emerald"; } catch { return "emerald"; }
  });
  const setTheme = (t) => { setThemeId(t); try { localStorage.setItem("ft-chess-theme", t); } catch {} };
  return [THEMES[themeId] || THEMES.emerald, themeId, setTheme];
}

export function StatusPill({ myTurn, finished, label }) {
  if (finished) return <span className="text-xs lg:text-sm text-slate-300">{label || "انتهت"}</span>;
  return myTurn
    ? <span className="text-xs lg:text-sm font-bold text-emerald-300 animate-pulse">دورك الآن</span>
    : <span className="text-xs lg:text-sm text-slate-300">{label || "بانتظار الخصم"}</span>;
}

export function PlayerBar({ name, rating, active, you, caps = [], matAhead = 0, color }) {
  const pieceSetId = useSyncedPieceSet();
  return (
    <motion.div
      animate={active ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={active ? { duration: 2.2, repeat: Infinity } : {}}
      className={`w-full max-w-[min(96vw,660px)] lg:max-w-[min(940px,calc(100dvh_-_170px))] xl:max-w-[min(1020px,calc(100dvh_-_150px))] mx-auto rounded-3xl p-[1.5px] transition-all duration-300
        ${active
          ? "bg-gradient-to-l from-emerald-400/70 via-emerald-400/20 to-emerald-400/70 shadow-[0_0_40px_-6px_rgba(16,185,129,0.55)]"
          : "bg-gradient-to-l from-white/15 via-white/5 to-white/15 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.8)]"}`}>
      <div className={`rounded-3xl px-4 py-3 lg:px-5 lg:py-4 backdrop-blur-xl ${active ? "bg-[#0d1f16]/90" : "bg-slate-900/70"}`}>
      <div className="flex items-center justify-between gap-3 lg:gap-4">
        <div className="flex items-center gap-3 lg:gap-3.5 min-w-0">
          <div className={`relative w-11 h-11 lg:w-12 lg:h-12 rounded-2xl grid place-items-center font-extrabold text-lg lg:text-xl shrink-0
            ${you
              ? "bg-gradient-to-br from-amber-200 via-amber-400 to-orange-600 text-slate-950 shadow-[0_6px_20px_-4px_rgba(245,158,11,0.6)]"
              : "bg-gradient-to-br from-slate-400 via-slate-600 to-slate-900 text-white shadow-[0_6px_20px_-4px_rgba(0,0,0,0.7)]"}
            ring-1 ring-white/25`}>
            {name.trim()[0]}
            {active && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.9)]" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm lg:text-base flex items-center gap-2 truncate text-white">
              <span className="truncate">{name}</span>
              {active && <ThinkingDots />}
            </div>
            <div className="text-xs lg:text-[13px] text-slate-400 mt-1 lg:mt-1.5 flex items-center gap-2">
              {rating != null && <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg bg-white/10 font-mono font-bold text-slate-200 ring-1 ring-white/10">{rating}</span>}
              {matAhead > 0 && <span className="text-emerald-300 font-extrabold">+{matAhead}</span>}
            </div>
          </div>
        </div>
        {caps.length > 0 && (
          <div className="flex items-center shrink-0 bg-black/25 rounded-full pl-3 pr-2 py-1 lg:pl-3.5 lg:pr-2.5 lg:py-1.5 ring-1 ring-white/10" dir="ltr" title="قطع مأسورة">
            {caps.slice(0, 10).map((t, i) => (
              <img key={i} src={pieceSrc(t, color === "w" ? "b" : "w")} alt=""
                style={{ filter: pieceFilterOf(pieceSetId, color === "w" ? "b" : "w") || undefined }}
                className="w-6 h-6 lg:w-7 lg:h-7 -ml-2.5 lg:-ml-3 first:ml-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" draggable={false} />
            ))}
            {caps.length > 10 && <span className="text-[10px] lg:text-[11px] text-slate-400 ml-1 font-bold">+{caps.length - 10}</span>}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
}

export function ThinkingDots() {
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
