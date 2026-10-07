import React, { useEffect, useRef } from "react";
import { EL, parseFormula } from "./chemData";

/* Pseudo-3D molecular theatre · canvas 2D with sphere shading + perspective.
   Atoms keep their identity across the reaction: you literally watch them
   regroup from reactants into products (conservation of atoms). */

function moleculeLayout(formula) {
  const comp = parseFormula(formula);
  const atoms = [];
  for (const [sym, n] of Object.entries(comp)) for (let i = 0; i < n; i++) atoms.push(sym);
  if (atoms.length === 1) return [{ sym: atoms[0], p: [0, 0, 0] }];
  // heaviest non-H is the hub
  const hubSym = atoms.reduce((best, s) => ((EL[s]?.mass || 0) > (EL[best]?.mass || 0) && s !== "H" ? s : best), atoms[0]);
  const hub = { sym: hubSym, p: [0, 0, 0] };
  const rest = atoms.filter((_, i) => i !== atoms.indexOf(hubSym));
  const R = atoms.length > 5 ? 1.9 : 1.55;
  const placed = rest.map((sym, i) => {
    const a = (i / Math.max(1, rest.length)) * Math.PI * 2 + (sym === "H" ? 0.45 : 0);
    const y = rest.length > 4 ? (i % 2 === 0 ? 0.7 : -0.7) : 0;
    return { sym, p: [Math.cos(a) * R, y + Math.sin(a) * 0.35, Math.sin(a) * R] };
  });
  return [hub, ...placed];
}

function expandSpecies(species, side) {
  // species: [{f, n}] · build visual molecules (cap the on-screen count)
  const mols = [];
  for (const { f, n } of species) {
    const show = Math.min(n, 4);
    const layout = moleculeLayout(f);
    for (let i = 0; i < show; i++) mols.push({ formula: f, layout, side });
  }
  return mols;
}

function slots(count, spread) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    out.push([t * spread, (i % 2 === 0 ? -1 : 1) * (count > 2 ? 1.8 : 0.6), (i % 3 - 1) * 1.6]);
  }
  return out;
}

export default function SimCanvas({ result, runId, playing, speed = 1, ambient = 25, onTemp, onPhase }) {
  const ref = useRef(null);
  const stateRef = useRef({ yaw: 0.5, pitch: -0.25, drag: null, t: 0, lastTemp: null, lastPhase: "" });

  useEffect(() => { stateRef.current.t = 0; }, [runId]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf; let last = performance.now();
    const S = stateRef.current;

    const eq = result?.eq;
    const reacts = !!result?.reacts;
    const rMols = eq ? expandSpecies(eq.reactants, "r") : [];
    const pMols = eq && reacts ? expandSpecies(eq.products, "p") : [];
    const rSlots = slots(rMols.length, 11);
    const pSlots = slots(pMols.length, 11);
    // atom identity map: reactant atoms -> product slots (by element, in order)
    const flat = (mols, sl) => {
      const arr = [];
      mols.forEach((m, mi) => m.layout.forEach((a) => arr.push({ sym: a.sym, local: a.p, slot: sl[mi], mol: mi })));
      return arr;
    };
    const rAtoms = flat(rMols, rSlots);
    let pAtoms = flat(pMols, pSlots);
    // match product atoms to reactant atoms; leftover product atoms (shouldn't happen when balanced) fade in
    const used = new Set();
    pAtoms = pAtoms.map((pa) => {
      const idx = rAtoms.findIndex((ra, i) => ra.sym === pa.sym && !used.has(i));
      if (idx >= 0) used.add(idx);
      return { ...pa, from: idx };
    });
    const maxT = 7; // seconds per full run
    const sparks = Array.from({ length: 60 }, (_, i) => ({ a: (i / 60) * Math.PI * 2, r: 0.4 + (i % 7) * 0.14, s: 0.6 + ((i * 37) % 10) / 9 }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rot = (p, yaw, pitch) => {
      const [x, y, z] = p;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return [x1, y2, z2];
    };
    const smooth = (x) => x * x * (3 - 2 * x);
    const clamp01 = (x) => Math.max(0, Math.min(1, x));

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing) S.t = (S.t + dt * speed) % (maxT + 2.2);
      const t = S.t / maxT; // 0..1 run progress, >1 = hold on products
      const W = canvas.getBoundingClientRect().width, H = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, W, H);
      // backdrop glow
      const glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      const flash = reacts && t > 0.36 && t < 0.55 ? Math.sin((t - 0.36) / 0.19 * Math.PI) : 0;
      const exo = (result?.dH ?? 0) < 0;
      glow.addColorStop(0, flash > 0.1 ? (exo ? `rgba(249,115,22,${0.14 + flash * 0.22})` : `rgba(56,189,248,${0.12 + flash * 0.2})`) : "rgba(56,189,248,0.07)");
      glow.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      if (!S.drag) S.yaw += dt * 0.12;
      const f = Math.min(W, H) * 0.085;
      const proj = (p) => { const s = f * 9.5 / (9.5 + p[2] + 6); return [W / 2 + p[0] * s, H / 2 + p[1] * s, s, p[2]]; };

      // temperature + phase reporting
      const peakT = result?.peak ?? (result?.dH ? ambient + Math.min(900, Math.abs(result.dH) * (exo ? 0.9 : -0.35)) : ambient);
      const env = reacts ? (t < 0.36 ? 0 : t < 0.62 ? smooth((t - 0.36) / 0.26) : Math.max(0.25, 1 - (t - 0.62) / 0.9)) : 0;
      const temp = Math.round(ambient + (peakT - ambient) * Math.min(1, env) + Math.sin(now / 300) * (reacts && t < 1 ? 2 : 0));
      if (onTemp && temp !== S.lastTemp) { S.lastTemp = temp; onTemp(temp); }
      const phase = !reacts ? "idle" : t < 0.3 ? "approach" : t < 0.45 ? "collide" : t < 0.72 ? "rearrange" : "products";
      if (onPhase && phase !== S.lastPhase) { S.lastPhase = phase; onPhase(phase); }

      const atoms = [];
      const gather = t < 0.3 ? smooth(t / 0.3) * 0.82 : t < 0.45 ? 0.82 + Math.sin((t - 0.3) / 0.15 * Math.PI * 6) * 0.05 : 0.88;
      const blend = reacts ? smooth(clamp01((t - 0.45) / 0.27)) : 0;
      const spreadP = reacts ? smooth(clamp01((t - 0.72) / 0.28)) : 0;

      const worldOf = (a, sideT) => {
        const wig = Math.sin(now / 420 + a.slot[0] * 2 + a.local[1]) * 0.08 * (1 + Math.max(0, temp - ambient) / 260);
        const base = [a.slot[0] * (sideT === "r" ? (1 - gather) : (0.12 + spreadP * 0.88)) + wig,
                      a.slot[1] * (sideT === "r" ? (1 - gather * 0.7) : (0.3 + spreadP * 0.7)) + Math.sin(now / 700 + a.mol) * 0.14,
                      a.slot[2]];
        const local = rot(a.local, S.yaw + a.mol * 0.6, S.pitch);
        return [base[0] + local[0], base[1] + local[1], base[2] + local[2]];
      };

      rAtoms.forEach((a, i) => {
        const pr = worldOf(a, "r");
        const pm = pAtoms.find((x) => x.from === i);
        let pos = pr, alpha = 1;
        if (pm && blend > 0) { const pp = worldOf(pm, "p"); pos = pr.map((v, k) => v + (pp[k] - v) * blend); }
        atoms.push({ sym: a.sym, pos, alpha });
      });
      pAtoms.filter((x) => x.from < 0).forEach((a) => {
        atoms.push({ sym: a.sym, pos: worldOf(a, "p"), alpha: blend });
      });

      ctx.lineCap = "round";
      const drawnAll = atoms.map((a, i) => ({ ...a, idx: i, pr: proj(rot(a.pos, S.yaw, S.pitch)) }));
      const drawn = [...drawnAll].sort((x, y) => x.pr[3] - y.pr[3]);
      // bonds: lines between atoms sharing a molecule index in the current frame
      const byMol = new Map();
      atoms.forEach((a, i) => {
        const molKey = blend < 0.5 ? rAtoms[i]?.mol : (pAtoms.find((x) => x.from === i)?.mol ?? -1);
        if (molKey == null || molKey < 0) return;
        if (!byMol.has(molKey)) byMol.set(molKey, []);
        byMol.get(molKey).push(drawnAll[i]);
      });
      ctx.strokeStyle = "rgba(226,232,240,0.5)";
      byMol.forEach((arr) => {
        if (arr.length < 2) return;
        const hub = arr[0];
        for (let i = 1; i < arr.length; i++) {
          ctx.lineWidth = Math.max(1.5, hub.pr[2] * 0.09);
          ctx.beginPath(); ctx.moveTo(hub.pr[0], hub.pr[1]); ctx.lineTo(arr[i].pr[0], arr[i].pr[1]); ctx.stroke();
        }
      });

      // sparks during collision
      if (flash > 0.05) {
        sparks.forEach((sp) => {
          const rr = sp.r * flash * 3.2;
          const x = W / 2 + Math.cos(sp.a + S.yaw) * rr * f * 0.9, y = H / 2 + Math.sin(sp.a * 1.3) * rr * f * 0.55;
          ctx.fillStyle = exo ? `rgba(251,191,36,${flash * 0.85})` : `rgba(125,211,252,${flash * 0.85})`;
          ctx.beginPath(); ctx.arc(x, y, 1 + flash * 2.4 * sp.s, 0, Math.PI * 2); ctx.fill();
        });
      }

      drawn.forEach((a) => {
        const [x, y, s] = a.pr;
        const el = EL[a.sym];
        const col = el?.col || "#cbd5e1";
        const r = Math.max(9, s * (0.42 + Math.min(0.5, (el?.mass || 12) / 130)));
        ctx.globalAlpha = a.alpha;
        const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, col); g.addColorStop(1, shade(col));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(15,23,42,0.55)"; ctx.lineWidth = 1; ctx.stroke();
        const dark = lum(col) > 0.62;
        ctx.fillStyle = dark ? "#0f172a" : "#f8fafc";
        ctx.font = `800 ${Math.max(8, r * (a.sym.length > 1 ? 0.62 : 0.78))}px system-ui`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(a.sym, x, y + 0.5);
        ctx.globalAlpha = 1;
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, runId, playing, speed, ambient]);

  // pointer orbit
  const down = (e) => { stateRef.current.drag = { x: e.clientX, y: e.clientY }; };
  const move = (e) => {
    const S = stateRef.current;
    if (!S.drag) return;
    S.yaw += (e.clientX - S.drag.x) * 0.008;
    S.pitch = Math.max(-1.1, Math.min(1.1, S.pitch + (e.clientY - S.drag.y) * 0.006));
    S.drag = { x: e.clientX, y: e.clientY };
  };
  const up = () => { stateRef.current.drag = null; };

  return (
    <canvas ref={ref} className="w-full h-full block touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
  );
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 70), g = Math.max(0, ((n >> 8) & 255) - 70), b = Math.max(0, (n & 255) - 70);
  return `rgb(${r},${g},${b})`;
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
