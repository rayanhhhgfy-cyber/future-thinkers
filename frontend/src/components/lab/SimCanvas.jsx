import React, { useEffect, useRef } from "react";
import { EL, parseFormula } from "./chemData";

/* Pseudo-3D molecular theatre · canvas 2D with sphere shading + perspective.
   Atoms keep their identity across the reaction: you literally watch them
   regroup from reactants into products (conservation of atoms). */

/* pre-rendered atom sprites: sphere shading + symbol baked once per (element, size),
   then blitted with drawImage each frame · this is what keeps the stage smooth on phones */
const spriteCache = new Map();
function atomSprite(sym, r, withLabel) {
  const R = Math.max(9, Math.round(r * 2) / 2);
  const key = sym + "|" + R + (withLabel ? "t" : "p");
  let c = spriteCache.get(key);
  if (c) return c;
  const col = EL[sym]?.col || "#cbd5e1";
  const pad = Math.ceil(R * 0.5) + 3, D = (R + pad) * 2;
  c = document.createElement("canvas"); c.width = D; c.height = D;
  const g = c.getContext("2d"), cx = D / 2, cy = D / 2;
  const grad = g.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.15, cx, cy, R);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.25, col); grad.addColorStop(1, shade(col));
  g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(15,23,42,0.5)"; g.lineWidth = 1.4; g.stroke();
  g.beginPath(); g.ellipse(cx - R * 0.34, cy - R * 0.46, R * 0.32, R * 0.18, -0.6, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,255,255,0.45)"; g.fill();
  if (withLabel) {
    g.fillStyle = lum(col) > 0.62 ? "#0f172a" : "#f8fafc";
    g.font = `800 ${Math.max(8, R * (sym.length > 1 ? 0.62 : 0.78))}px system-ui`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(sym, cx, cy + 0.5);
  }
  c._R = R; c._pad = pad;
  if (spriteCache.size > 500) spriteCache.clear();
  spriteCache.set(key, c);
  return c;
}

/* Real molecular geometry (textbook shapes) + bond topology [i, j, order].
   H2O bent 104.5°, CO2 linear, CH4 tetrahedral, NH3 pyramidal, double bonds
   draw as twin lines, triple as three — the reaction is shown literally. */
const GEO = {
  H2: [[0, 1, 1]], O2: [[0, 1, 2]], N2: [[0, 1, 3]], Cl2: [[0, 1, 1]], Br2: [[0, 1, 1]], I2: [[0, 1, 1]], F2: [[0, 1, 1]],
  H2O: [[0, 1, 1], [0, 2, 1]], H2O2: [[0, 2, 1], [0, 1, 1], [2, 3, 1]],
  CO2: [[0, 1, 2], [0, 2, 2]], CO: [[0, 1, 3]], SO2: [[0, 1, 2], [0, 2, 1]],
  CH4: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
  NH3: [[0, 1, 1], [0, 2, 1], [0, 3, 1]],
  HCl: [[0, 1, 1]], HBr: [[0, 1, 1]], HF: [[0, 1, 1]],
  NaCl: [[0, 1, 1]], KCl: [[0, 1, 1]],
  H2SO4: [[0, 1, 2], [0, 2, 2], [0, 3, 1], [0, 4, 1], [3, 5, 1], [4, 6, 1]],
  HNO3: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [3, 4, 1]],
  NaOH: [[0, 1, 1], [1, 2, 1]], KOH: [[0, 1, 1], [1, 2, 1]],
  "Ca(OH)2": [[0, 1, 1], [1, 3, 1], [0, 2, 1], [2, 4, 1]],
  CaCO3: [[1, 2, 2], [1, 3, 1], [1, 4, 1], [0, 3, 1]],
  NaHCO3: [[2, 3, 2], [2, 4, 1], [2, 5, 1], [0, 4, 1], [5, 1, 1]],
  CH3COOH: [[0, 2, 1], [2, 3, 2], [2, 4, 1], [4, 5, 1], [0, 1, 1], [0, 6, 1], [0, 7, 1]],
  C2H5OH: [[0, 2, 1], [2, 3, 1], [3, 4, 1], [0, 1, 1], [0, 5, 1], [0, 6, 1], [4, 7, 1], [4, 8, 1], [4, 9, 1]],
  C3H8: [[0, 3, 1], [3, 6, 1]], C2H6: [[0, 2, 1]], C2H4: [[0, 2, 2]], C2H2: [[0, 2, 3]],
};
function geoPos(formula, atoms) {
  const n = atoms.length, ctr = [0, 0, 0];
  const P = (x, y, z) => [x, y, z];
  if (formula === "H2O" || formula === "H2S") return [P(0, 0, 0), P(-1.15, 0.75, 0.35), P(1.15, 0.75, -0.35)]; // bent
  if (formula === "CO2" || formula === "CS2") return [P(0, 0, 0), P(-1.55, 0, 0), P(1.55, 0, 0)]; // linear
  if (formula === "CH4") return [P(0, 0, 0), P(1, 1, 1), P(1, -1, -1), P(-1, 1, -1), P(-1, -1, 1)].map((p) => p.map((v) => v * 0.95)); // tetrahedral
  if (formula === "NH3") return [P(0, 0.3, 0), P(-1.15, -0.5, 0.55), P(1.15, -0.5, 0.55), P(0, -0.5, -1.25)]; // pyramidal
  if (formula === "H2SO4" || formula === "H3PO4") return [P(0, 0, 0), P(1.35, 0.75, 0), P(-1.35, 0.75, 0), P(0, -0.85, 1.15), P(0, -0.85, -1.15), P(0.45, -1.6, 1.5), P(-0.45, -1.6, -1.5)];
  const R = n > 5 ? 1.95 : 1.55;
  return atoms.map((sym, i) => {
    if (i === 0) return [...ctr];
    const a = ((i - 1) / Math.max(1, n - 1)) * Math.PI * 2 + (sym === "H" ? 0.45 : 0);
    const y = n > 5 ? ((i % 2 === 0 ? 0.75 : -0.75)) : 0;
    return [Math.cos(a) * R, y + Math.sin(a) * 0.35, Math.sin(a) * R];
  });
}
function moleculeLayout(formula) {
  const comp = parseFormula(formula);
  const atoms = [];
  for (const [sym, n] of Object.entries(comp)) for (let i = 0; i < n; i++) atoms.push(sym);
  if (atoms.length === 1) return { atoms: [{ sym: atoms[0], p: [0, 0, 0] }], bonds: [] };
  const pos = geoPos(formula, atoms);
  const spec = atoms.map((sym, i) => ({ sym, p: pos[i] || [0, 0, 0] }));
  // relocate hub: geoPos assumes index0 = central atom; parse order may differ (H first for acids)
  const heavy = atoms.reduce((bi, s, i) => ((EL[s]?.mass || 0) > (EL[atoms[bi]]?.mass || 0) && s !== "H" ? i : bi), 0);
  if (heavy !== 0 && !GEO[formula]) { const t = spec[0]; spec[0] = spec[heavy]; spec[heavy] = t; }
  let bonds = GEO[formula] || null;
  if (!bonds) {
    const hubI = spec.reduce((bi, a, i) => ((EL[a.sym]?.mass || 0) > (EL[spec[bi].sym]?.mass || 0) ? i : bi), 0);
    bonds = spec.map((_, i) => i).filter((i) => i !== hubI).map((i) => [hubI, i, 1]);
    if (atoms.length === 2) bonds = [[0, 1, atoms[0] === atoms[1] && (atoms[0] === "O" || atoms[0] === "N") ? (atoms[0] === "N" ? 3 : 2) : 1]];
  }
  return { atoms: spec, bonds };
}

function expandSpecies(species, side) {
  // species: [{f, n}] · build visual molecules (cap the on-screen count)
  const mols = [];
  for (const { f, n } of species) {
    const show = Math.min(n, 4);
    const layout = moleculeLayout(f);
    for (let i = 0; i < show; i++) mols.push({ formula: f, layout: layout.atoms, bonds: layout.bonds, side });
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

export default function SimCanvas({ result, runId, playing, speed = 1, ambient = 25, onTemp, onPhase, light = false, labels = true, autoRotate = true, zoomRef }) {
  const ref = useRef(null);
  const stateRef = useRef({ yaw: 0.5, pitch: -0.25, drag: null, t: 0, lastTemp: null, lastPhase: "", ptrs: new Map(), pd: 0, visible: true });
  const liveRef = useRef({ labels: true, autoRotate: true });
  liveRef.current = { labels, autoRotate };

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
      mols.forEach((m, mi) => m.layout.forEach((a, li) => arr.push({ sym: a.sym, local: a.p, slot: sl[mi], mol: mi, li })));
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
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((en) => { S.visible = en[0].isIntersecting; }, { threshold: 0.04 });
    io.observe(canvas);
    const wheel = (e) => { e.preventDefault(); if (zoomRef?.current) zoomRef.current.v = Math.max(0.65, Math.min(1.9, zoomRef.current.v * (e.deltaY < 0 ? 1.09 : 0.92))); };
    canvas.addEventListener("wheel", wheel, { passive: false });

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
      if (!S.visible || document.hidden) { raf = requestAnimationFrame(draw); return; }
      if (playing) S.t = (S.t + dt * speed) % (maxT + 2.2);
      const t = S.t / maxT; // 0..1 run progress, >1 = hold on products
      const W = canvas.getBoundingClientRect().width, H = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, W, H);
      // backdrop glow
      const glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      const flash = reacts && t > 0.36 && t < 0.55 ? Math.sin((t - 0.36) / 0.19 * Math.PI) : 0;
      const exo = (result?.dH ?? 0) < 0;
      glow.addColorStop(0, flash > 0.1 ? (exo ? `rgba(249,115,22,${0.14 + flash * 0.22})` : `rgba(56,189,248,${0.12 + flash * 0.2})`) : (light ? "rgba(14,165,233,0.10)" : "rgba(56,189,248,0.07)"));
      glow.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      if (!S.drag && liveRef.current.autoRotate) S.yaw += dt * 0.12;
      const f = Math.min(W, H) * 0.148 * (zoomRef?.current?.v || 1);
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

      /* floor shadow: grounds the molecules on the stage */
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.86, Math.min(W, H) * 0.34, Math.min(W, H) * 0.055, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,42,0.07)"; ctx.fill();

      /* reaction heat aura around the action (orange exo / icy blue endo) */
      if (reacts && env > 0.02) {
        const aura = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, f * 4.6);
        aura.addColorStop(0, exo ? `rgba(249,115,22,${0.16 * env})` : `rgba(56,189,248,${0.15 * env})`);
        aura.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = aura; ctx.fillRect(0, 0, W, H);
      }
      /* ignition shockwave ring */
      if (reacts && t > 0.44 && t < 0.64) {
        const k = (t - 0.44) / 0.2;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, k * f * 3.6, 0, Math.PI * 2);
        ctx.strokeStyle = exo ? `rgba(251,146,60,${(1 - k) * 0.55})` : `rgba(125,211,252,${(1 - k) * 0.5})`;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5; ctx.stroke();
      }

      /* literal bonds: orders 1/2/3 drawn as 1/2/3 strokes; reactant bonds
         stretch & dissolve as the collision breaks them, product bonds
         draw themselves in (dashed while forming) */
      const bondStroke = (A, B, order, alpha, dashed) => {
        if (alpha <= 0.02) return;
        const dx = B.pr[0] - A.pr[0], dy = B.pr[1] - A.pr[1];
        const len = Math.hypot(dx, dy) || 1, ux = -dy / len, uy = dx / len;
        const lw = Math.max(1.6, A.pr[2] * 0.10);
        ctx.strokeStyle = light ? `rgba(30,41,59,${0.55 * alpha})` : `rgba(226,232,240,${0.6 * alpha})`;
        ctx.lineWidth = lw;
        ctx.setLineDash(dashed ? [5, 4] : []);
        const offs = order === 1 ? [0] : order === 2 ? [-lw * 0.95, lw * 0.95] : [-lw * 1.7, 0, lw * 1.7];
        offs.forEach((o) => {
          ctx.beginPath();
          ctx.moveTo(A.pr[0] + ux * o, A.pr[1] + uy * o);
          ctx.lineTo(B.pr[0] + ux * o, B.pr[1] + uy * o);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      };
      const breakK = reacts ? clamp01((t - 0.38) / 0.2) : 0; // old bonds gone by collide end
      // reactant molecules: atoms keep their drawnAll index (rAtoms order)
      rMols.forEach((m, mi) => {
        const mine = rAtoms.map((a, i) => ({ a, i })).filter(({ a }) => a.mol === mi);
        const at = (li) => { const hit = mine.find(({ a }) => a.li === li); return hit ? drawnAll[hit.i] : null; };
        m.bonds.forEach(([i, j, o]) => { const A = at(i), B = at(j); if (A && B) bondStroke(A, B, o, 1 - breakK, false); });
      });
      // product molecules: matched atoms sit at their reactant index; newcomers appended
      const newcomerBase = rAtoms.length;
      pMols.forEach((m, mi) => {
        const mine = pAtoms.map((a, k) => ({ a, k })).filter(({ a }) => a.mol === mi);
        const at = (li) => {
          const hit = mine.find(({ a }) => a.li === li);
          if (!hit) return null;
          const idx = hit.a.from >= 0 ? hit.a.from : newcomerBase + pAtoms.filter((x, q) => x.from < 0 && q < hit.k).length;
          return drawnAll[idx] || null;
        };
        m.bonds.forEach(([i, j, o]) => { const A = at(i), B = at(j); if (A && B) bondStroke(A, B, o, blend, blend < 0.97); });
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

      if (liveRef.current.labels && atoms.length > 0) {
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        const labelFor = (mols, atomsArr, pickIdx) => {
          mols.forEach((m, mi) => {
            const group = atomsArr.map((a, i) => ({ a, i })).filter(({ a }) => a.mol === mi);
            if (!group.length) return;
            const pts = group.map(({ i }) => drawnAll[pickIdx(i)]).filter(Boolean);
            if (!pts.length) return;
            const cx = pts.reduce((s2, p) => s2 + p.pr[0], 0) / pts.length;
            const cy = Math.max(...pts.map((p) => p.pr[1] + p.pr[2] * 0.62)) + 12;
            ctx.font = "800 13px system-ui";
            ctx.fillStyle = "rgba(15,23,42,0.55)";
            ctx.fillText(m.formula, cx, cy);
          });
        };
        if (blend < 0.5) labelFor(rMols, rAtoms, (i) => i);
        else labelFor(pMols, pAtoms, (i) => { const pa = pAtoms[i]; return pa ? (pa.from >= 0 ? pa.from : newcomerBase + pAtoms.filter((x, q) => x.from < 0 && q < i).length) : i; });
      }

      drawn.forEach((a) => {
        const [x, y, s] = a.pr;
        const el = EL[a.sym];
        const r = Math.max(11, s * (0.52 + Math.min(0.55, (el?.mass || 12) / 120)));
        const sp = atomSprite(a.sym, r, liveRef.current.labels);
        const D = (sp._R + sp._pad) * 2, k = r / sp._R;
        ctx.globalAlpha = a.alpha;
        ctx.drawImage(sp, x - (D / 2) * k, y - (D / 2) * k, D * k, D * k);
        ctx.globalAlpha = 1;
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.removeEventListener("wheel", wheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, runId, playing, speed, ambient]);

  // pointer orbit
  const down = (e) => {
    const S = stateRef.current;
    S.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    S.drag = { x: e.clientX, y: e.clientY };
  };
  const move = (e) => {
    const S = stateRef.current;
    if (S.ptrs.has(e.pointerId)) S.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (S.ptrs.size === 2) {
      const [a, b] = [...S.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (S.pd && zoomRef?.current) zoomRef.current.v = Math.max(0.65, Math.min(1.9, zoomRef.current.v * (d / S.pd)));
      S.pd = d; return;
    }
    if (!S.drag) return;
    S.yaw += (e.clientX - S.drag.x) * 0.008;
    S.pitch = Math.max(-1.1, Math.min(1.1, S.pitch + (e.clientY - S.drag.y) * 0.006));
    S.drag = { x: e.clientX, y: e.clientY };
  };
  const up = (e) => {
    const S = stateRef.current;
    S.ptrs.delete(e.pointerId); S.pd = 0;
    if (S.ptrs.size === 0) S.drag = null;
  };

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
