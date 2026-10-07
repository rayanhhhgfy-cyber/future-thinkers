import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import {
  ChevronLeft, Atom, Rocket, Play, RotateCcw, Volume2, VolumeX, Check, X,
  Trophy, Timer, Activity, Triangle,
} from "lucide-react";
import { Layout } from "@/components/Layout";

import { fmt, chips, cardCls, gradBtn, ghostBtn, head3, Stat, Slider, Steps, numIn, selIn, useSimCanvas, LazyMount, usePrefersReducedMotion, NOOP, roundRect, arrow, PLANETS, planetById, RANKS, rankOf, BADGES, SPECTRUM, QUIZ_BANK, FACTS, FACT_CATS, LS_KEY, blankStore, loadStore, PhysCtx, usePhys, todayStr, lamText, sciHz } from "@/components/lab/physCore";
export function ProjectileSim({ challenge = false, targetM = 0, onLand, onFire }) {
  const { recordExperiment, award } = usePhys();
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(24);
  const [planetId, setPlanetId] = useState("earth");
  const [landed, setLanded] = useState(null);
  const [dragOn, setDragOn] = useState(true);
  const [wind, setWind] = useState(0);
  const rm = usePrefersReducedMotion();
  const planet = planetById(challenge ? "earth" : planetId);
  const g = planet.g;
  const P = useRef({});
  P.current = { angle, speed, g, targetM, challenge, dragOn: challenge ? false : dragOn, wind: challenge ? 0 : wind };
  const onLandRef = useRef(onLand);
  onLandRef.current = onLand;
  const [canvasRef, world] = useSimCanvas(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, flying: false, trail: [], landedNow: false, counted: true, smoke: [] }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      const groundY = h - 44, x0 = 56;
      const rad = (p.angle * Math.PI) / 180;
      const KDRAG = p.dragOn ? 0.0042 : 0;
      const accel = (vx, vy) => {
        const rx = vx - p.wind, ry = vy;
        const sp = Math.hypot(rx, ry);
        return [-KDRAG * sp * rx, -p.g - KDRAG * sp * ry];
      };
      const pred = (p.speed * p.speed * Math.sin(2 * rad)) / p.g;
      const need = p.challenge ? p.targetM * 1.3 : Math.max(pred * (p.dragOn ? 0.82 : 1), 40);
      const px = Math.max(0.35, Math.min(6, (w - 130) / Math.max(need, 1)));
      // sky · dawn gradient with a soft sun glow
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#dbeafe"); sky.addColorStop(0.55, "#eef2ff"); sky.addColorStop(0.85, "#fdf4e3"); sky.addColorStop(1, "#ede9fe");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      const sun = ctx.createRadialGradient(w - 64, 42, 4, w - 64, 42, 90);
      sun.addColorStop(0, "rgba(253,224,71,0.5)"); sun.addColorStop(1, "rgba(253,224,71,0)");
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < groundY; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      // wind flag
      if (p.wind !== 0) {
        ctx.fillStyle = "rgba(14,116,144,0.85)"; ctx.font = "900 10.5px sans-serif"; ctx.textAlign = "left";
        ctx.fillText((p.wind > 0 ? "رياح خلفية ← " : "رياح أمامية → ") + fmt(Math.abs(p.wind), 0) + " m/s", 12, 18);
      }
      // predicted dashed path · numeric integration with the same drag and wind
      ctx.strokeStyle = "rgba(124,58,237,0.5)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath();
      {
        let sx2 = 0, sy2 = 0, svx = p.speed * Math.cos(rad), svy = p.speed * Math.sin(rad);
        ctx.moveTo(x0, groundY);
        const sdt = 0.03;
        for (let i = 0; i < 500 && sy2 >= 0; i++) {
          const [ax, ay] = accel(svx, svy);
          svx += ax * sdt; svy += ay * sdt; sx2 += svx * sdt; sy2 += svy * sdt;
          if (i % 3 === 0) ctx.lineTo(x0 + sx2 * px, groundY - Math.max(0, sy2) * px);
          if (sy2 < 0) break;
        }
      }
      ctx.stroke(); ctx.setLineDash([]);
      // integrate with substeps for stable drag physics
      if (W.flying) {
        const sub = 5, sdt = dt / sub;
        for (let i = 0; i < sub; i++) {
          const [ax, ay] = accel(W.vx, W.vy);
          W.vx += ax * sdt; W.vy += ay * sdt;
          W.x += W.vx * sdt; W.y += W.vy * sdt;
          if (W.y <= 0) break;
        }
        W.trail.push({ x: W.x, y: W.y });
        if (W.trail.length > 90) W.trail.shift();
        if (W.y <= 0 && W.vy < 0) {
          W.y = 0; W.flying = false; W.landedNow = true;
          if (!W.counted) { W.counted = true; onLandRef.current && onLandRef.current(W.x); }
        }
      }
      // launch smoke particles · coordinates are px offsets from the muzzle
      for (let i = W.smoke.length - 1; i >= 0; i--) {
        const s = W.smoke[i];
        s.life -= dt; s.fx += s.vx * dt; s.fy += s.vy * dt; s.vy -= 16 * dt; s.vx *= (1 - 1.6 * dt); s.r += 30 * dt;
        if (s.life <= 0) { W.smoke.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(100,116,139,${0.32 * Math.max(0, s.life)})`;
        ctx.beginPath(); ctx.arc(x0 + s.fx, groundY - s.fy, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // target
      if (p.challenge && p.targetM) {
        const tx = x0 + p.targetM * px;
        ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tx, groundY - 12, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(tx, groundY - 12, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#e11d48"; ctx.beginPath(); ctx.arc(tx, groundY - 12, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#9f1239"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(fmt(p.targetM, 0) + " m", tx, groundY + 16);
      }
      // ground + ruler
      ctx.fillStyle = "#ddd6fe"; ctx.fillRect(0, groundY, w, h - groundY);
      ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
      ctx.fillStyle = "#7c3aed"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center";
      for (let m = 0; m * px < w - x0; m += 10) {
        const x = x0 + m * px;
        ctx.fillRect(x, groundY, 1.4, 6);
        if (m > 0) ctx.fillText(m + "", x, groundY + 17);
      }
      // trail
      W.trail.forEach((pt, i) => {
        ctx.fillStyle = `rgba(124,58,237,${0.12 + (i / W.trail.length) * 0.5})`;
        ctx.beginPath(); ctx.arc(x0 + pt.x * px, groundY - pt.y * px, 2.4, 0, Math.PI * 2); ctx.fill();
      });
      // cannon
      const bx = x0, by = groundY;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-rad);
      const barrel = ctx.createLinearGradient(0, -6, 46, 6);
      barrel.addColorStop(0, "#4c1d95"); barrel.addColorStop(1, "#7c3aed");
      ctx.fillStyle = barrel; roundRect(ctx, 0, -6, 46, 12, 6); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#312e81"; ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e1b4b"; ctx.fillRect(bx - 14, by, 30, 7);
      // ground shadow under the shell · tightens and darkens as it falls
      {
        const shScale = Math.max(0.3, 1 - W.y / 55);
        ctx.fillStyle = `rgba(49,46,129,${0.10 + 0.22 * shScale})`;
        ctx.beginPath(); ctx.ellipse(x0 + W.x * px, groundY + 7, 15 * shScale + 4, 4.2 * shScale + 1.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // ball
      const sx = x0 + W.x * px, sy = groundY - W.y * px;
      const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 20);
      glow.addColorStop(0, "rgba(245,158,11,0.85)"); glow.addColorStop(1, "rgba(245,158,11,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff7ed"; ctx.beginPath(); ctx.arc(sx - 2.4, sy - 2.4, 2.4, 0, Math.PI * 2); ctx.fill();
      if (W.landedNow) {
        ctx.strokeStyle = "#059669"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, groundY - 4, 14 + 3 * Math.sin(performance.now() / 160), 0, Math.PI * 2); ctx.stroke();
      }
    }
  );
  const rad = (angle * Math.PI) / 180;
  const R = (speed * speed * Math.sin(2 * rad)) / g;
  const H = (Math.pow(speed * Math.sin(rad), 2)) / (2 * g);
  const T = (2 * speed * Math.sin(rad)) / g;
  const fire = () => {
    const W = world.current;
    W.x = 0; W.y = 0;
    W.vx = speed * Math.cos(rad); W.vy = speed * Math.sin(rad);
    W.flying = true; W.trail = []; W.landedNow = false; W.counted = false;
    W.smoke = [];
    for (let i = 0, n = rm ? 0 : 16; i < n; i++) {
      W.smoke.push({
        fx: Math.cos(rad) * 44 + (Math.random() - 0.5) * 8,
        fy: Math.sin(rad) * 44 + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.72) * 30, vy: 8 + Math.random() * 26,
        r: 3 + Math.random() * 5, life: 0.55 + Math.random() * 0.5,
      });
    }
    setLanded(null);
    recordExperiment("projectile");
    award("first-flight", 10, "أطلقت أول مقذوف", "first-flight");
    if (onFire) onFire();
  };
  return (
    <div>
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[270px] sm:h-[320px] block touch-none" data-testid="phys-projectile-canvas" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="المدى R" value={fmt(landed != null ? landed : R)} unit="m" />
        <Stat label="أقصى ارتفاع H" value={fmt(H)} unit="m" tone="from-indigo-50 ring-indigo-100" />
        <Stat label="زمن الطيران T" value={fmt(T)} unit="s" tone="from-cyan-50 ring-cyan-100" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <Slider label="زاوية الإطلاق" value={angle} set={setAngle} min={5} max={85} unit="°" />
        <Slider label="السرعة الابتدائية" value={speed} set={setSpeed} min={5} max={60} unit="m/s" tone="accent-indigo-600" />
        {!challenge && (
          <label className="block">
            <span className="block text-[12px] font-black text-slate-600 mb-1">الكوكب (الجاذبية)</span>
            <select value={planetId} onChange={(e) => setPlanetId(e.target.value)} className={selIn}>
              {PLANETS.map((p) => <option key={p.id} value={p.id}>{p.name} · g = {p.g}</option>)}
            </select>
          </label>
        )}
      </div>
      {!challenge && (
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mt-3">
          <Slider label="رياح أفقية (سالب = أمامية)" value={wind} set={setWind} min={-10} max={10} step={0.5} unit="m/s" tone="accent-cyan-600" />
          <button onClick={() => setDragOn((d) => !d)} className={chips(dragOn)}>مقاومة الهواء التربيعية {dragOn ? "· مفعّلة" : "· معطّلة"}</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button onClick={fire} className={gradBtn}><Rocket className="w-4 h-4" /> إطلاق</button>
        <span className="text-[11.5px] text-slate-400 font-bold" dir="ltr">R = v²·sin(2θ)/g · H = (v·sinθ)²/2g · T = 2v·sinθ/g</span>
        {landed != null && <span className="px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-[12px] font-black">هبطت عند {fmt(landed)} م · المتوقع {fmt(R)} م ✓</span>}
      </div>
    </div>
  );
}
export function ProjectileLab() {
  return (
    <div className={cardCls} data-testid="phys-projectile">
      {head3("🚀", "مختبر المقذوفات", "زوايا وسرعات وكواكب · الخط المتقطع هو المسار المتوقع قبل الإطلاق")}
      <ProjectileSim onLand={NOOP} />
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">فعّل مقاومة الهواء لترى القوس الحقيقي ينحني ويسقط أقرب، لأن المقاومة تكبر مع مربع السرعة · والرياح الخلفية تدفع المقذوف أبعد والأمامية تقصّر مداه · بلا مقاومة يكون أكبر مدى عند 45° دائماً · وعلى سطح القمر يطير المقذوف أبعد بست مرات تقريباً لأن g أصغر · كواكبنا: القمر 1.62 · المريخ 3.71 · الزهرة 8.87 · الأرض 9.81 · المشتري 24.79 م/ثا².</p>
    </div>
  );
}

/* ============ FEATURE 2 · collisions & momentum theatre ============ */
export function CollisionLab() {
  const { recordExperiment, award } = usePhys();
  const [m1, setM1] = useState(3), [v1, setV1] = useState(7);
  const [m2, setM2] = useState(2), [v2, setV2] = useState(-4);
  const [mode, setMode] = useState("elastic");
  const [rest, setRest] = useState(1);
  const [snap, setSnap] = useState({ v1: 7, v2: -4, hit: false });
  const P = useRef({});
  P.current = { m1, v1, m2, v2, mode, rest };
  const [canvasRef, world] = useSimCanvas(
    () => ({ x1: 7, x2: 53, cv1: 7, cv2: -4, hit: false, running: false, flash: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      const trackY = h - 74, px = (w - 60) / 60;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#eef2ff"); sky.addColorStop(1, "#f5f3ff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(99,102,241,0.10)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < trackY; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      ctx.fillStyle = "#c7d2fe"; ctx.fillRect(0, trackY + 34, w, h - trackY - 34);
      ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, trackY + 34); ctx.lineTo(w, trackY + 34); ctx.stroke();
      ctx.strokeStyle = "#a5b4fc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(16, trackY + 40); ctx.lineTo(16, trackY + 52); ctx.moveTo(w - 16, trackY + 40); ctx.lineTo(w - 16, trackY + 52); ctx.stroke();
      const w1 = 24 + p.m1 * 4, w2 = 24 + p.m2 * 4;
      if (W.running) {
        W.x1 += W.cv1 * dt; W.x2 += W.cv2 * dt;
        const gap = W.x2 - W.x1, need = (w1 + w2) / 2 / px;
        if (!W.hit && gap <= need && W.cv1 > W.cv2) {
          W.hit = true; W.flash = 1;
          // restitution e: 1 means perfectly elastic, 0 means they stick together
          const e = p.rest, M = p.m1 + p.m2, Pmom = p.m1 * p.v1 + p.m2 * p.v2;
          const f1 = (Pmom + p.m2 * e * (p.v2 - p.v1)) / M;
          const f2 = (Pmom + p.m1 * e * (p.v1 - p.v2)) / M;
          W.cv1 = f1; W.cv2 = f2;
          setSnap({ v1: f1, v2: f2, hit: true });
        }
        if (W.x1 < -6 || W.x2 > 66 || W.x1 > 66 || W.x2 < -6) W.running = false;
      }
      W.flash = Math.max(0, W.flash - dt * 3.2);
      const drawCart = (xM, mass, vel, c1, c2, label) => {
        const cx = 30 + xM * px, cw = (24 + mass * 4) * (1 - W.flash * 0.16), chh = 30 * (1 - W.flash * 0.10), cy = trackY;
        const grad = ctx.createLinearGradient(cx, cy - 26, cx, cy + 10);
        grad.addColorStop(0, c1); grad.addColorStop(0.55, c2); grad.addColorStop(1, c2);
        ctx.save();
        ctx.shadowColor = "rgba(49,46,129,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
        ctx.fillStyle = grad; roundRect(ctx, cx - cw / 2, cy - 24 + (30 - chh), cw, chh, 8); ctx.fill();
        ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; roundRect(ctx, cx - cw / 2 + 4, cy - 24 + (30 - chh) + 3.5, cw - 8, 5, 3); ctx.fill();
        // wheels with rotating spokes
        [-cw / 4, cw / 4].forEach((off) => {
          const wx = cx + off, wy = cy + 12, rot = xM * 1.4;
          ctx.fillStyle = "#1e1b4b"; ctx.beginPath(); ctx.arc(wx, wy, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#c7d2fe"; ctx.lineWidth = 1.6;
          for (let sIdx = 0; sIdx < 3; sIdx++) {
            const a2 = rot + (sIdx * Math.PI * 2) / 3;
            ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 5 * Math.cos(a2), wy + 5 * Math.sin(a2)); ctx.stroke();
          }
        });
        ctx.fillStyle = "#1e1b4b"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(label, cx, cy - 34);
        // momentum arrow drawn to scale · length grows with p = m·v
        const pv = mass * vel;
        if (Math.abs(pv) > 0.4) {
          const alen = Math.max(-w * 0.30, Math.min(w * 0.30, pv * Math.max(1.1, px * 0.16)));
          arrow(ctx, cx, cy - 46, cx + alen, cy - 46, "#7c3aed", 2.8);
          ctx.fillStyle = "#5b21b6"; ctx.font = "900 9.5px sans-serif";
          ctx.fillText("p=" + fmt(pv, 0), cx + alen / 2, cy - 52);
        }
      };
      drawCart(W.x1, p.m1, W.cv1, "#c4b5fd", "#7c3aed", "1");
      drawCart(W.x2, p.m2, W.cv2, "#a5f3fc", "#0891b2", "2");
      if (W.flash > 0.02) {
        const fx = 30 + ((W.x1 + W.x2) / 2) * px, fy = trackY - 16;
        const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy, 42 * W.flash + 8);
        fg.addColorStop(0, `rgba(254,240,138,${0.85 * W.flash})`); fg.addColorStop(0.5, `rgba(245,158,11,${0.5 * W.flash})`); fg.addColorStop(1, "rgba(245,158,11,0)");
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, 42 * W.flash + 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(217,119,6,${0.75 * W.flash})`; ctx.lineWidth = 2.4;
        for (let sIdx = 0; sIdx < 8; sIdx++) {
          const a2 = (sIdx / 8) * Math.PI * 2 + 0.3, rr = 10 + (1 - W.flash) * 34;
          ctx.beginPath();
          ctx.moveTo(fx + Math.cos(a2) * (rr - 6), fy + Math.sin(a2) * (rr - 6));
          ctx.lineTo(fx + Math.cos(a2) * rr, fy + Math.sin(a2) * rr);
          ctx.stroke();
        }
      }
      if (W.hit) {
        ctx.fillStyle = "rgba(245,158,11,0.9)"; ctx.font = "900 20px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💥", 30 + ((W.x1 + W.x2) / 2) * px, trackY - 68);
      }
    }
  );
  const run = () => {
    const W = world.current;
    W.x1 = 7; W.x2 = 53; W.cv1 = v1; W.cv2 = v2; W.hit = false; W.running = true;
    setSnap({ v1, v2, hit: false });
    recordExperiment("collision");
    award("momentum-run", 10, "شاهدت حفظ الزخم", "momentum");
  };
  const pBefore = m1 * v1 + m2 * v2, pAfter = m1 * snap.v1 + m2 * snap.v2;
  const keB = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  const keA = 0.5 * m1 * snap.v1 * snap.v1 + 0.5 * m2 * snap.v2 * snap.v2;
  const maxP = Math.max(Math.abs(pBefore), Math.abs(pAfter), 1);
  return (
    <div className={cardCls} data-testid="phys-collision">
      {head3("🚗", "مسرح التصادمات والزخم", "عربتان على مسار · الزخم محفوظ دائماً · والطاقة تحكي قصة أخرى")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[250px] sm:h-[290px] block touch-none" />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-3">
        <Slider label="كتلة العربة 1" value={m1} set={setM1} min={1} max={10} unit="kg" />
        <Slider label="سرعة العربة 1 (يمين +)" value={v1} set={setV1} min={0} max={12} unit="m/s" tone="accent-indigo-600" />
        <Slider label="كتلة العربة 2" value={m2} set={setM2} min={1} max={10} unit="kg" />
        <Slider label="سرعة العربة 2 (يسار −)" value={v2} set={setV2} min={-12} max={0} unit="m/s" tone="accent-cyan-600" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button onClick={() => { setMode("elastic"); setRest(1); }} className={chips(mode === "elastic")}>مرن تماماً · e = 1</button>
        <button onClick={() => { setMode("inelastic"); setRest(0); }} className={chips(mode === "inelastic")}>غير مرن · تلتصقان · e = 0</button>
        <button onClick={run} className={gradBtn}><Play className="w-4 h-4" /> تشغيل التصادم</button>
      </div>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mt-2">
        <Slider label="معامل الارتداد e (0 لاصق · 1 مرن تماماً)" value={rest} set={(v) => { setRest(v); setMode(v === 1 ? "elastic" : v === 0 ? "inelastic" : "semi"); }} min={0} max={1} step={0.05} tone="accent-fuchsia-500" />
        <span className="px-3 py-2 rounded-xl bg-fuchsia-50 ring-1 ring-fuchsia-100 text-fuchsia-700 text-[11.5px] font-black">{rest === 1 ? "تصادم مرن · الطاقة محفوظة" : rest === 0 ? "تصادم لاصق · أقصى فقد للطاقة" : "تصادم واقعي بينهما"}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-3">
          <div className="text-[11px] font-black text-slate-500 mb-2">الزخم الكلي p = m₁v₁ + m₂v₂ (كغ·م/ثا)</div>
          {[["قبل", pBefore], ["بعد", pAfter]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-black text-slate-500 w-8">{k}</span>
              <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><motion.span animate={{ scaleX: Math.min(1, Math.abs(v) / Math.max(maxP, 1)) }} className={`block h-full w-full origin-left rounded-full ${v < 0 ? "bg-cyan-400" : "bg-violet-500"}`} /></span>
              <span className="text-[12px] font-black text-slate-800 w-14" dir="ltr">{fmt(v, 1)}</span>
            </div>
          ))}
          <p className="text-[11px] text-emerald-600 font-black">الزخم قبل = بعد دائماً ✓ قانون حفظ الزخم</p>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-3">
          <div className="text-[11px] font-black text-slate-500 mb-2">الطاقة الحركية KE (جول)</div>
          {[["قبل", keB, 1], ["بعد", keA, 1]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-black text-slate-500 w-8">{k}</span>
              <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden" dir="ltr"><motion.span animate={{ scaleX: Math.min(1, v / Math.max(keB, 1)) }} className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-300 to-orange-500" /></span>
              <span className="text-[12px] font-black text-slate-800 w-14" dir="ltr">{fmt(v, 1)}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 font-bold">{!snap.hit ? "شغّل التصادم وقارن الطاقة قبل وبعد" : rest === 1 ? "عند e = 1 تبقى الطاقة الحركية كما هي · تصادم مثالي نادر" : `فُقد ${fmt(keB > 0 ? ((keB - keA) / keB) * 100 : 0, 0)}% من الطاقة الحركية حرارة وصوتاً وتشوهاً · لكن الزخم لا يضيع أبداً مهما كان e`}</p>
        </div>
      </div>
      {snap.hit && <p className="text-[12px] font-black text-slate-600 mt-2">بعد التصادم: سرعة 1 = <span dir="ltr">{fmt(snap.v1)}</span> م/ثا · سرعة 2 = <span dir="ltr">{fmt(snap.v2)}</span> م/ثا</p>}
    </div>
  );
}

/* ============ FEATURE 3 · circuit builder ============ */
function filamentColor(k) {
  const stops = [[0, "#475569"], [0.12, "#7f1d1d"], [0.4, "#ea580c"], [0.7, "#f59e0b"], [1, "#fffbeb"]];
  const x = Math.max(0, Math.min(1, k));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
      const t = (x - x0) / Math.max(0.0001, x1 - x0);
      const rgb = (hx) => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
      const A = rgb(c0), B = rgb(c1);
      return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
    }
  }
  return "#fffbeb";
}
function MeterDial({ label, value, max, unit }) {
  const frac = Math.max(0, Math.min(1, value / Math.max(0.001, max)));
  const needle = -118 + frac * 236;
  const cx = 70, cy = 66, R = 48;
  const polar = (deg, rr) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-2.5 text-center ft-shadow">
      <svg viewBox="0 0 140 84" className="w-full" dir="ltr" role="img" aria-label={label}>
        <path d={`M ${polar(-118, R)[0]} ${polar(-118, R)[1]} A ${R} ${R} 0 1 1 ${polar(118, R)[0]} ${polar(118, R)[1]}`} fill="none" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
        <path d={`M ${polar(-118, R)[0]} ${polar(-118, R)[1]} A ${R} ${R} 0 ${frac * 236 > 180 ? 1 : 0} 1 ${polar(needle, R)[0]} ${polar(needle, R)[1]}`} fill="none" stroke="#7c3aed" strokeWidth="7" strokeLinecap="round" />
        {Array.from({ length: 9 }).map((_, i) => {
          const d = -118 + (i / 8) * 236;
          const [x1, y1] = polar(d, R - 8), [x2, y2] = polar(d, R - 15);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1.8" />;
        })}
        <g transform={`rotate(${needle} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - R + 12} stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="5" fill="#1e293b" />
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#64748b">{unit}</text>
      </svg>
      <div className="text-[15px] font-black font-head text-slate-900 -mt-1" dir="ltr">{fmt(value)} <span className="text-[10px] text-slate-400">{unit}</span></div>
      <div className="text-[10px] text-slate-400 font-black">{label} · المقياس حتى {fmt(max, 0)}</div>
    </div>
  );
}
export function CircuitLab() {
  const { recordExperiment } = usePhys();
  const [volts, setVolts] = useState(9);
  const [rs, setRs] = useState([10, 20, 30]);
  const [layout, setLayout] = useState("series");
  const [on, setOn] = useState(true);
  const [rInt, setRInt] = useState(0.5);
  const P = useRef({});
  const calc = useMemo(() => {
    if (!on) {
      return { Rt: layout === "series" ? rs.reduce((a, b) => a + b, 0) : 1 / rs.reduce((a, r) => a + 1 / r, 0), Itot: 0, Vt: 0, bulbs: rs.map((r) => ({ r, i: 0, v: 0, p: 0 })) };
    }
    if (layout === "series") {
      const Rt = rs.reduce((a, b) => a + b, 0);
      const I = volts / (Rt + rInt);
      return { Rt, Itot: I, Vt: I * Rt, bulbs: rs.map((r) => ({ r, i: I, v: I * r, p: I * I * r })) };
    }
    const Rt = 1 / rs.reduce((a, r) => a + 1 / r, 0);
    const Itot = volts / (Rt + rInt);
    const Vt = Itot * Rt;
    return { Rt, Itot, Vt, bulbs: rs.map((r) => ({ r, i: Vt / r, v: Vt, p: (Vt * Vt) / r })) };
  }, [volts, rs, layout, on, rInt]);
  P.current = { volts, rs, layout, on, calc, rInt };
  const [canvasRef] = useSimCanvas(
    () => ({ tsec: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      W.tsec += dt;
      ctx.fillStyle = "#171233"; ctx.fillRect(0, 0, w, h);
      const bgGlow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGlow.addColorStop(0, "rgba(124,58,237,0.16)"); bgGlow.addColorStop(1, "rgba(23,18,51,0)");
      ctx.fillStyle = bgGlow; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 0; gy < h; gy += 22) ctx.fillRect(gx, gy, 1.4, 1.4);
      const L = 26, Rr = w - 26, T = 42, B = h - 42;
      // copper wire: dark outline pass then bright copper pass
      const strokeWire = () => {
        ctx.strokeStyle = "#6d3410"; ctx.lineWidth = 4.6; ctx.stroke();
        const cg = ctx.createLinearGradient(L, T, Rr, B);
        cg.addColorStop(0, "#f0a35e"); cg.addColorStop(0.5, "#c47b4a"); cg.addColorStop(1, "#e89b5a");
        ctx.strokeStyle = cg; ctx.lineWidth = 2.4; ctx.stroke();
      };
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const bulbDraw = (x, y, power) => {
        const k = Math.max(0, Math.min(1, power / 8));
        const col = filamentColor(k);
        if (k > 0.02) {
          const gr = 18 + k * 36;
          const g = ctx.createRadialGradient(x, y, 2, x, y, gr);
          g.addColorStop(0, col.replace("rgb", "rgba").replace(")", `,${0.32 + k * 0.45})`));
          g.addColorStop(1, "rgba(254,240,138,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
        }
        // glass envelope with a soft top highlight
        ctx.beginPath(); ctx.arc(x, y, 12.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,232,240,${0.10 + k * 0.13})`; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(x - 4, y - 5, 2.6, 0, Math.PI * 2); ctx.fill();
        // tungsten filament · its colour follows the real power
        ctx.save();
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.shadowColor = col; ctx.shadowBlur = k * 16;
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 5); ctx.lineTo(x - 3, y - 3); ctx.lineTo(x, y + 5); ctx.lineTo(x + 3, y - 3); ctx.lineTo(x + 6, y + 5);
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = "rgba(203,213,225,0.8)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - 6, y + 9); ctx.lineTo(x - 6, y + 5); ctx.moveTo(x + 6, y + 9); ctx.lineTo(x + 6, y + 5); ctx.stroke();
        // screw base
        ctx.fillStyle = "#94a3b8"; ctx.fillRect(x - 4.5, y + 12, 9, 5);
        ctx.fillStyle = "#64748b"; ctx.fillRect(x - 4.5, y + 14, 9, 1.2);
      };
      // electron drift · speed grows with the actual current
      const dots = (x1, y1, x2, y2, n, current, seed) => {
        if (!p.on || current <= 0.001) return;
        const rate = 0.12 + current * 0.85;
        ctx.fillStyle = "#fde68a";
        for (let i = 0; i < n; i++) {
          const u = (((i / n) + W.tsec * rate + seed) % 1 + 1) % 1;
          ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 2.3, 0, Math.PI * 2); ctx.fill();
        }
      };
      if (p.layout === "series") {
        ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(Rr, T); ctx.lineTo(Rr, B); ctx.lineTo(L, B); ctx.closePath(); strokeWire();
        const xs = [0.25, 0.5, 0.75].map((f) => L + (Rr - L) * f);
        xs.forEach((x, i) => bulbDraw(x, T, p.calc.bulbs[i].p));
        dots(L, B, Rr, B, 7, p.calc.Itot, 0); dots(Rr, B, Rr, T, 4, p.calc.Itot, 0.4); dots(L, T, L, B, 4, p.calc.Itot, 0.7);
      } else {
        ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(Rr, T); ctx.moveTo(L, B); ctx.lineTo(Rr, B); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.moveTo(Rr, T); ctx.lineTo(Rr, B); strokeWire();
        const xs = [0.25, 0.5, 0.75].map((f) => L + (Rr - L) * f);
        xs.forEach((x, i) => {
          ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, B); strokeWire();
          bulbDraw(x, (T + B) / 2, p.calc.bulbs[i].p);
          dots(x, T, x, B, 3, p.calc.bulbs[i].i, i * 0.3);
        });
        dots(L, B, Rr, B, 7, p.calc.Itot, 0);
      }
      // battery with its internal resistance drawn inside
      const byy = (T + B) / 2;
      ctx.fillStyle = "#f8fafc"; roundRect(ctx, L - 15, byy - 19, 30, 38, 6); ctx.fill();
      ctx.fillStyle = "#1e1b4b"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("+", L - 7, byy - 9); ctx.fillText("−", L + 7, byy - 9);
      if (p.rInt > 0) {
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(L - 9, byy + 4);
        ctx.lineTo(L - 5.5, byy - 1); ctx.lineTo(L - 2, byy + 7); ctx.lineTo(L + 1.5, byy - 1); ctx.lineTo(L + 5, byy + 7); ctx.lineTo(L + 9, byy + 2);
        ctx.stroke();
        if (p.on && p.calc.Itot > 0.01) {
          ctx.fillStyle = `rgba(249,115,22,${0.35 + 0.3 * Math.sin(W.tsec * 9)})`;
          ctx.font = "900 8px sans-serif"; ctx.fillText("r تسخن", L, byy + 16);
        }
      }
      ctx.fillStyle = "#e0e7ff"; ctx.font = "900 10px sans-serif";
      ctx.fillText(fmt(p.volts, 1) + " V", L, byy + 31);
      ctx.fillStyle = p.on ? "#4ade80" : "#f87171"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(p.on ? "الدائرة مغلقة · التيار يسري" : "الدائرة مفتوحة", Rr, 22);
    }
  );
  const setR = (i, v) => setRs((r) => r.map((x, j) => (j === i ? v : x)));
  return (
    <div className={cardCls} data-testid="phys-circuit">
      {head3("💡", "باني الدوائر الكهربائية", "بطارية وثلاثة مصابيح · توالٍ أو توازٍ · لاحظ من يسرق الضوء من من")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-900/30 ft-shadow">
        <div className="h-1.5 bg-gradient-to-l from-amber-300 via-yellow-400 to-amber-500" />
        <canvas ref={canvasRef} className="w-full h-[250px] sm:h-[290px] block" />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4 mt-3">
        <Slider label="جهد البطارية" value={volts} set={setVolts} min={2} max={24} step={0.5} unit="V" tone="accent-amber-500" />
        {rs.map((r, i) => (
          <Slider key={i} label={`مقاومة المصباح ${i + 1}`} value={r} set={(v) => setR(i, v)} min={4} max={60} unit="Ω" tone="accent-indigo-600" />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-2 items-start">
        <Slider label="المقاومة الداخلية للبطارية r" value={rInt} set={setRInt} min={0} max={3} step={0.1} unit="Ω" tone="accent-rose-500" />
        <div className="grid grid-cols-2 gap-2">
          <MeterDial label="أميتر · التيار الكلي" value={calc.Itot} max={6} unit="A" />
          <MeterDial label="فولتميتر · جهد الطرفين" value={calc.Vt} max={24} unit="V" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button onClick={() => setLayout("series")} className={chips(layout === "series")}>على التوالي (سلسلة)</button>
        <button onClick={() => setLayout("parallel")} className={chips(layout === "parallel")}>على التوازي (فروع)</button>
        <button onClick={() => { setOn((o) => !o); recordExperiment("circuit"); }} className={on ? ghostBtn : gradBtn}>{on ? "فتح الدائرة" : "إغلاق الدائرة"}</button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="المقاومة الكلية" value={fmt(calc.Rt, 1)} unit="Ω" tone="from-amber-50 ring-amber-100" />
        <Stat label="جهد طرفي البطارية" value={fmt(calc.Vt, 1)} unit="V" tone="from-rose-50 ring-rose-100" />
        <Stat label="القدرة الكلية" value={fmt(calc.bulbs.reduce((a, b) => a + b.p, 0), 1)} unit="W" tone="from-cyan-50 ring-cyan-100" />
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mt-2">
        {calc.bulbs.map((b, i) => (
          <div key={i} className="rounded-2xl bg-white ring-1 ring-slate-100 p-3 text-center">
            <div className="text-[12px] font-black text-slate-700">المصباح {i + 1} · <span dir="ltr">{b.r}Ω</span></div>
            <div className="text-[11.5px] text-slate-500 font-bold mt-1" dir="ltr">V={fmt(b.v, 1)} · I={fmt(b.i)} A · P={fmt(b.p, 1)} W</div>
            <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden" dir="ltr">
              <motion.span animate={{ scaleX: Math.min(1, b.p * 0.04) }} className="block h-full w-full origin-left bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-100 p-3.5 mt-3">
        <div className="text-[12px] font-black text-violet-800 mb-1.5">مثلث قانون أوم · غطِّ المجهول</div>
        <div className="flex flex-wrap gap-1.5 text-[12px] font-black">
          <span className="px-3 py-2 rounded-xl bg-white ring-1 ring-violet-100" dir="ltr">V = I × R</span>
          <span className="px-3 py-2 rounded-xl bg-white ring-1 ring-violet-100" dir="ltr">I = V ÷ R</span>
          <span className="px-3 py-2 rounded-xl bg-white ring-1 ring-violet-100" dir="ltr">R = V ÷ I</span>
          <span className="px-3 py-2 rounded-xl bg-white ring-1 ring-violet-100" dir="ltr">P = V × I</span>
        </div>
        <p className="text-[11.5px] text-slate-500 font-semibold leading-relaxed mt-2">بالتوالي يتقاسم المصابيح الجهد فيخفت من مقاومته أكبر · وبالتوازي يأخذ كل مصباح الجهد كاملاً فيضيء بكامل قوته · لهذا توصَل بيوتنا على التوازي · ولون فتيل المصباح نفسه يخبرك بقدرته: أحمر خافت ثم برتقالي ثم أبيض ساطع كلما سخن أكثر · والبطارية الحقيقية ليست مثالية: مقاومتها الداخلية تسخن وتسرق جزءاً من جهدها، فكلما سحبت تياراً أكبر هبط جهد الطرفين أكثر · أسلاك التوصيل نحاسية لأن النحاس من أفضل الموصلات.</p>
      </div>
    </div>
  );
}

/* ============ FEATURE 4 · waves & sound studio ============ */
export function WaveStudio() {
  const { recordExperiment, award } = usePhys();
  const [lam, setLam] = useState(2);
  const [medium, setMedium] = useState(343);
  const [amp, setAmp] = useState(30);
  const [standing, setStanding] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const f = medium / lam;
  const P = useRef({});
  P.current = { lam, amp, standing, medium };
  const waveBand = f < 20 ? { ar: "تحت صوتية · Infrasound", cls: "bg-slate-700 text-white ring-slate-600" } : f <= 20000 ? { ar: "مسموعة · Audible", cls: "bg-emerald-500 text-white ring-emerald-400" } : { ar: "فوق صوتية · Ultrasound", cls: "bg-fuchsia-600 text-white ring-fuchsia-500" };
  const [canvasRef] = useSimCanvas(
    () => ({ t: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      W.t += dt;
      const isWater = p.medium === 1480;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      if (isWater) { sky.addColorStop(0, "#a5f3fc"); sky.addColorStop(0.45, "#e0f2fe"); sky.addColorStop(1, "#bae6fd"); }
      else { sky.addColorStop(0, "#eef2ff"); sky.addColorStop(1, "#fdf4ff"); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      if (isWater) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const yy = 18 + i * ((h - 36) / 6);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 14) {
            const y2 = yy + Math.sin(x * 0.045 + W.t * 2.1 + i * 1.6) * 2.4;
            if (x === 0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
          }
          ctx.globalAlpha = 0.32; ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "rgba(14,116,144,0.55)"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "right";
        ctx.fillText("وسط مائي · الصوت أسرع هنا", w - 14, 18);
      } else {
        ctx.fillStyle = "rgba(167,139,250,0.12)";
        for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < h; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      }
      const midY = h / 2, x0 = 18, x1 = w - 18;
      const wavesShown = 2.4;
      const lamPx = (x1 - x0) / wavesShown;
      const k = (Math.PI * 2) / lamPx;
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke(); ctx.setLineDash([]);
      const wave = (fn, col, width, glow) => {
        ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = "round";
        if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
        ctx.beginPath();
        for (let x = x0; x <= x1; x += 3) {
          const y = midY + fn(x - x0);
          if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
      };
      if (p.standing) {
        wave((dx) => p.amp * Math.sin(k * dx) * Math.cos(W.t * 3.2) * 0.9, "#a855f7", 3, true);
        wave((dx) => p.amp * Math.sin(k * dx), "rgba(168,85,247,0.25)", 1.6, false);
        wave((dx) => -p.amp * Math.sin(k * dx), "rgba(168,85,247,0.25)", 1.6, false);
        // nodes stay frozen at multiples of λ/2, antinodes swing widest between them
        const segments = Math.round(wavesShown * 2);
        for (let nIdx = 0; nIdx <= segments; nIdx++) {
          const nx = x0 + (nIdx * lamPx) / 2;
          ctx.fillStyle = "#dc2626";
          ctx.beginPath(); ctx.arc(nx, midY, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(220,38,38,0.4)"; ctx.lineWidth = 1.3; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(nx, midY - p.amp - 4); ctx.lineTo(nx, midY + p.amp + 4); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "#b91c1c"; ctx.font = "900 9.5px sans-serif"; ctx.textAlign = "center";
          if (nIdx % 2 === 0) ctx.fillText("عقدة", nx, midY + p.amp + 52);
          if (nIdx < segments) {
            const ax = nx + lamPx / 4;
            ctx.fillStyle = "#059669";
            ctx.beginPath(); ctx.arc(ax, midY, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#047857";
            if (nIdx % 2 === 0) ctx.fillText("بطن", ax, midY - p.amp - 10);
          }
        }
      } else {
        wave((dx) => p.amp * Math.sin(k * dx - W.t * 3.4), "#7c3aed", 3.2, true);
      }
      // wavelength marker
      const mx = x0 + lamPx * 0.24;
      ctx.strokeStyle = "#0891b2"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, midY + p.amp + 16); ctx.lineTo(mx + lamPx, midY + p.amp + 16); ctx.stroke();
      arrow(ctx, mx, midY + p.amp + 16, mx + 8, midY + p.amp + 16, "#0891b2", 2);
      arrow(ctx, mx + lamPx, midY + p.amp + 16, mx + lamPx - 8, midY + p.amp + 16, "#0891b2", 2);
      ctx.fillStyle = "#0e7490"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("λ = " + fmt(p.lam) + " m", mx + lamPx / 2, midY + p.amp + 34);
      // particles for sound feel
      if (!p.standing) {
        ctx.fillStyle = "rgba(124,58,237,0.5)";
        for (let i = 0; i < 26; i++) {
          const baseX = x0 + ((i / 26) * (x1 - x0));
          const off = Math.sin(k * (baseX - x0) - W.t * 3.4) * 12;
          ctx.beginPath(); ctx.arc(baseX + off, h - 24, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  );
  useEffect(() => () => { if (audioRef.current) { try { audioRef.current.osc.stop(); audioRef.current.ctx.close(); } catch { /* done */ } audioRef.current = null; } }, []);
  const toggleTone = () => {
    if (playing) {
      try { audioRef.current.osc.stop(); audioRef.current.ctx.close(); } catch { /* done */ }
      audioRef.current = null; setPlaying(false); return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctxA = new AC();
    const osc = ctxA.createOscillator();
    const gain = ctxA.createGain();
    osc.type = "sine";
    osc.frequency.value = Math.max(30, Math.min(4000, f));
    gain.gain.value = 0.06;
    osc.connect(gain); gain.connect(ctxA.destination);
    osc.start();
    audioRef.current = { ctx: ctxA, osc };
    setPlaying(true);
    recordExperiment("waves");
    award("wave-tone", 10, "سمعت موجة صوتية صنعتها", "wave-rider");
  };
  return (
    <div className={cardCls} data-testid="phys-waves">
      {head3("🌊", "استوديو الموجات والصوت", "ارسم الموجة بيدك ثم اسمع صوتها الحقيقي من سماعتك")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-fuchsia-400 via-violet-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[240px] sm:h-[280px] block" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <Slider label="الطول الموجي λ" value={lam} set={setLam} min={0.3} max={15} step={0.1} unit="m" />
        <Slider label="السعة (ارتفاع الموجة)" value={amp} set={setAmp} min={8} max={46} unit="px" tone="accent-fuchsia-500" />
        <label className="block">
          <span className="block text-[12px] font-black text-slate-600 mb-1">وسط الانتشار</span>
          <select value={medium} onChange={(e) => setMedium(+e.target.value)} className={selIn}>
            <option value={343}>هواء · 343 م/ثا</option>
            <option value={1480}>ماء · 1480 م/ثا</option>
            <option value={5960}>حديد · 5960 م/ثا</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="السرعة v" value={fmt(medium, 0)} unit="m/s" />
        <Stat label="التردد f = v ÷ λ" value={fmt(f, 1)} unit="Hz" tone="from-fuchsia-50 ring-fuchsia-100" />
        <Stat label="الزمن الدوري T" value={fmt(1 / f, 4)} unit="s" tone="from-cyan-50 ring-cyan-100" />
      </div>
      <div className="mt-3 rounded-2xl bg-white ring-1 ring-slate-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-[11.5px] font-black ring-1 ${waveBand.cls}`}>{waveBand.ar}</span>
          <span className="text-[11px] text-slate-400 font-bold">نطاقات السمع الحقيقية: تحت صوتية أقل من 20Hz · مسموعة حتى 20kHz · فوق صوتية أعلى من ذلك</span>
        </div>
        <div className="relative h-3 rounded-full mt-2.5 overflow-hidden ring-1 ring-slate-200" dir="ltr"
          style={{ background: "linear-gradient(90deg,#334155 0%,#334155 16%,#10b981 16%,#10b981 72%,#c026d3 72%,#c026d3 100%)" }}>
          <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white ring-2 ring-slate-900 shadow"
            style={{ left: `${Math.max(1.5, Math.min(98.5, ((Math.log10(Math.max(0.5, f)) + 1) / 6.3) * 100))}%` }} />
        </div>
        <div className="flex justify-between text-[9.5px] font-black text-slate-400 mt-1" dir="ltr">
          <span>0.1 Hz</span><span>20 Hz</span><span>20 kHz</span><span>100 kHz</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <button onClick={toggleTone} className={playing ? ghostBtn : gradBtn}>
          {playing ? <><VolumeX className="w-4 h-4" /> إيقاف النغمة</> : <><Volume2 className="w-4 h-4" /> اسمع التردد {fmt(Math.max(30, Math.min(4000, f)), 0)} Hz</>}
        </button>
        <button onClick={() => { setStanding((s) => !s); recordExperiment("waves-standing"); }} className={chips(standing)}>الموجة المستقرة (انعكاس)</button>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">سرعة الموجة = التردد × الطول الموجي · الصوت أسرع بالماء منه بالهواء بنحو 4 مرات، وبالحديد 17 مرة · والموجة المستقرة تظهر على أوتار العود والغيتار · اخفض الصوت إن كان التردد عالياً.</p>
    </div>
  );
}

/* ============ FEATURE 5 · optics bench ============ */
export function OpticsBench() {
  const { recordExperiment } = usePhys();
  const [kind, setKind] = useState("convex");
  const [dObj, setDObj] = useState(30);
  const [fLen, setFLen] = useState(15);
  const [screenCm, setScreenCm] = useState(30);
  const isMirror = kind === "mirror";
  const f = kind === "concave" ? -fLen : fLen;
  const diRaw = 1 / (1 / f - 1 / dObj);
  const di = Math.max(-300, Math.min(300, diRaw));
  const m = -di / dObj;
  const real = di > 0;
  const SC = 5.0, AXIS = 140, CX = 360, objH = 52;
  const objX = CX - dObj * SC;
  const imgX = isMirror ? CX - di * SC : CX + di * SC;
  const imgH = objH * m;
  const F1x = CX - fLen * SC, F2x = CX + fLen * SC;
  const line = (x1, y1, x2, y2, col, dash, wdt = 2) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={wdt} strokeDasharray={dash ? "5 5" : ""} strokeLinecap="round" />
  );
  const topY = AXIS - objH;
  const imgTopY = AXIS - imgH;
  const screenX = Math.max(18, Math.min(662, isMirror ? CX - screenCm * SC : CX + screenCm * SC));
  const defocusCm = real && isFinite(di) ? Math.abs(screenCm - Math.abs(di)) : null;
  const blurR = defocusCm == null ? 0 : Math.min(26, defocusCm * 1.15);
  const screenTipY = AXIS + (objH * screenCm) / Math.max(1, dObj);
  const ext = (x1, y1, x2, y2, xT) => { const t = (xT - x1) / (x2 - x1 || 0.0001); return [xT, y1 + (y2 - y1) * t]; };
  const rayEls = [];
  if (!isMirror) {
    // 1) parallel ray, then through far focal (or diverging from near focal)
    rayEls.push(line(objX, topY, CX, topY, "#f59e0b", false, 2.4));
    if (real) rayEls.push(line(CX, topY, imgX, imgTopY, "#f59e0b", false, 2.4));
    else {
      const [ex, ey] = ext(imgX, imgTopY, CX, topY, 672);
      rayEls.push(line(CX, topY, ex, ey, "#f59e0b", false, 2.4));
      rayEls.push(line(CX, topY, imgX, imgTopY, "#f59e0b", true, 1.6));
    }
    // 2) central ray, straight through the optical centre
    if (real) rayEls.push(line(objX, topY, imgX, imgTopY, "#38bdf8", false, 2.4));
    else {
      rayEls.push(line(objX, topY, CX, AXIS, "#38bdf8", false, 2.4));
      const [ex, ey] = ext(imgX, imgTopY, CX, AXIS, 672);
      rayEls.push(line(CX, AXIS, ex, ey, "#38bdf8", false, 2.4));
      rayEls.push(line(CX, AXIS, imgX, imgTopY, "#38bdf8", true, 1.6));
    }
    // 3) focal ray, emerges parallel to the axis
    rayEls.push(line(objX, topY, CX, imgTopY, "#a78bfa", false, 2.4));
    rayEls.push(line(CX, imgTopY, real ? imgX : 672, imgTopY, "#a78bfa", false, 2.4));
  } else {
    // mirror: rays travel right, reflect back left
    rayEls.push(line(objX, topY, CX, topY, "#f59e0b", false, 2.4));
    if (real) rayEls.push(line(CX, topY, imgX, imgTopY, "#f59e0b", false, 2.4));
    else {
      const [ex, ey] = ext(imgX, imgTopY, CX, topY, 8);
      rayEls.push(line(CX, topY, ex, ey, "#f59e0b", false, 2.4));
      rayEls.push(line(CX, topY, imgX, imgTopY, "#f59e0b", true, 1.6));
    }
    rayEls.push(line(objX, topY, CX, AXIS, "#38bdf8", false, 2.4));
    if (real) rayEls.push(line(CX, AXIS, imgX, imgTopY, "#38bdf8", false, 2.4));
    else {
      const [ex, ey] = ext(imgX, imgTopY, CX, AXIS, 8);
      rayEls.push(line(CX, AXIS, ex, ey, "#38bdf8", false, 2.4));
      rayEls.push(line(CX, AXIS, imgX, imgTopY, "#38bdf8", true, 1.6));
    }
    rayEls.push(line(objX, topY, CX, imgTopY, "#a78bfa", false, 2.4));
    rayEls.push(line(CX, imgTopY, real ? imgX : 8, imgTopY, "#a78bfa", false, 2.4));
  }
  return (
    <div className={cardCls} data-testid="phys-optics">
      {head3("🔍", "منضدة البصريات", "عدسات ومرايا · أين تتكون الصورة؟ حقيقية أم وهمية؟ مكبرة أم مصغرة؟")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950">
        <div className="h-1.5 bg-gradient-to-l from-amber-300 via-cyan-300 to-violet-400" />
        <svg viewBox="0 0 680 300" className="w-full block" dir="ltr" role="img" aria-label="مخطط أشعة بصري">
          <line x1={10} y1={AXIS} x2={670} y2={AXIS} stroke="#64748b" strokeWidth="1.4" strokeDasharray="7 6" />
          {/* focal points */}
          {(isMirror ? [F1x] : [F1x, F2x]).map((fx, i) => (
            <g key={i}><circle cx={fx} cy={AXIS} r="3.4" fill="#f472b6" /><text x={fx} y={AXIS + 20} fill="#f9a8d4" fontSize="11" fontWeight="900" textAnchor="middle">F</text></g>
          ))}
          {/* lens / mirror · real glass with edge highlight and silvered backing */}
          <defs>
            <radialGradient id="lensGlass" cx="38%" cy="32%" r="80%">
              <stop offset="0%" stopColor="rgba(224,242,254,0.55)" />
              <stop offset="55%" stopColor="rgba(125,211,252,0.22)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.34)" />
            </radialGradient>
            <radialGradient id="screenGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(244,114,182,0.95)" />
              <stop offset="60%" stopColor="rgba(244,114,182,0.45)" />
              <stop offset="100%" stopColor="rgba(244,114,182,0)" />
            </radialGradient>
          </defs>
          {isMirror ? (
            <g>
              {[-64, -44, -24, -4, 16, 36, 56, 76].map((dy) => (
                <line key={dy} x1={CX + 17 + Math.abs(dy) * 0.14} y1={AXIS + dy} x2={CX + 27 + Math.abs(dy) * 0.14} y2={AXIS + dy - 8} stroke="#64748b" strokeWidth="2" />
              ))}
              <path d={`M ${CX} ${AXIS - 86} Q ${CX + 26} ${AXIS} ${CX} ${AXIS + 86}`} fill="none" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
              <path d={`M ${CX - 1.5} ${AXIS - 80} Q ${CX + 21} ${AXIS} ${CX - 1.5} ${AXIS + 80}`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ) : kind === "convex" ? (
            <g>
              <path d={`M ${CX} ${AXIS - 86} Q ${CX + 22} ${AXIS} ${CX} ${AXIS + 86} Q ${CX - 22} ${AXIS} ${CX} ${AXIS - 86} Z`} fill="url(#lensGlass)" stroke="#7dd3fc" strokeWidth="2.4" />
              <path d={`M ${CX - 8} ${AXIS - 62} Q ${CX + 6} ${AXIS} ${CX - 8} ${AXIS + 62}`} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
              <line x1={CX} y1={AXIS - 92} x2={CX} y2={AXIS - 86} stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" />
              <line x1={CX} y1={AXIS + 86} x2={CX} y2={AXIS + 92} stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              <path d={`M ${CX} ${AXIS - 86} Q ${CX - 16} ${AXIS} ${CX} ${AXIS + 86} M ${CX} ${AXIS - 86} Q ${CX + 16} ${AXIS} ${CX} ${AXIS + 86}`} fill="rgba(125,211,252,0.12)" stroke="#7dd3fc" strokeWidth="2.4" />
              <path d={`M ${CX - 13} ${AXIS - 58} Q ${CX - 4} ${AXIS} ${CX - 13} ${AXIS + 58}`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" />
              <path d={`M ${CX + 13} ${AXIS - 58} Q ${CX + 4} ${AXIS} ${CX + 13} ${AXIS + 58}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          )}
          {rayEls}
          {/* object */}
          <line x1={objX} y1={AXIS} x2={objX} y2={topY} stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
          <path d={`M ${objX} ${topY - 9} l -5 10 h 10 Z`} fill="#4ade80" />
          <text x={objX} y={AXIS + 20} fill="#86efac" fontSize="11" fontWeight="900" textAnchor="middle">الجسم</text>
          {/* image */}
          {isFinite(imgX) && Math.abs(imgX) < 690 && (
            <>
              <line x1={imgX} y1={AXIS} x2={imgX} y2={AXIS - imgH} stroke={real ? "#f472b6" : "#f9a8d4"} strokeWidth="4" strokeLinecap="round" strokeDasharray={real ? "" : "4 3"} />
              <text x={imgX} y={AXIS + 20} fill="#f9a8d4" fontSize="11" fontWeight="900" textAnchor="middle">الصورة</text>
            </>
          )}
          {/* projection screen · the image is sharp only when the screen sits at the image plane */}
          <g>
            <rect x={screenX - 5} y={AXIS - 78} width={10} height={156} rx={4} fill="rgba(248,250,252,0.92)" stroke="#cbd5e1" strokeWidth="1.4" />
            <line x1={screenX} y1={AXIS + 78} x2={screenX} y2={AXIS + 92} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            {real && isFinite(di) && Math.abs(di) < 300 ? (
              <g>
                <ellipse cx={screenX} cy={(AXIS + screenTipY) / 2} rx={7 + blurR * 1.5} ry={Math.abs(screenTipY - AXIS) / 2 + 6 + blurR} fill="url(#screenGlow)" opacity={blurR < 2 ? 0.95 : Math.max(0.3, 0.8 - blurR * 0.02)} />
                {blurR < 2.5 && (
                  <line x1={screenX} y1={AXIS} x2={screenX} y2={screenTipY} stroke="#f472b6" strokeWidth="3.4" strokeLinecap="round" />
                )}
              </g>
            ) : (
              <text x={screenX} y={AXIS - 88} fill="#94a3b8" fontSize="9.5" fontWeight="900" textAnchor="middle">لا صورة على الشاشة</text>
            )}
            <text x={screenX} y={AXIS + 108} fill="#e2e8f0" fontSize="10" fontWeight="900" textAnchor="middle">الشاشة</text>
          </g>
          {/* optical bench with a cm ruler · zero sits under the element */}
          <rect x={10} y={AXIS + 116} width={660} height={15} rx={4} fill="#1e293b" stroke="#475569" />
          {Array.from({ length: 133 }).map((_, i) => {
            const x = 12 + i * 5;
            const cm = (x - CX) / SC;
            return <line key={i} x1={x} y1={AXIS + 116} x2={x} y2={AXIS + 116 + (Math.round(cm) % 5 === 0 ? 8 : 4)} stroke="#64748b" strokeWidth="1" />;
          })}
          {Array.from({ length: 13 }).map((_, i) => {
            const cmVal = -60 + i * 10;
            const x = CX + cmVal * SC;
            if (x < 16 || x > 664) return null;
            return <text key={i} x={x} y={AXIS + 142} fill="#94a3b8" fontSize="8.5" fontWeight="900" textAnchor="middle">{Math.abs(cmVal)}</text>;
          })}
          <text x={CX} y={AXIS + 155} fill="#64748b" fontSize="8.5" fontWeight="900" textAnchor="middle">مسطرة المنضدة بالسنتيمتر · الصفر تحت العنصر البصري</text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {[["convex", "عدسة محدبة"], ["concave", "عدسة مقعرة"], ["mirror", "مرآة مقعرة"]].map(([id, ar]) => (
          <button key={id} onClick={() => { setKind(id); recordExperiment("optics"); }} className={chips(kind === id)}>{ar}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-2">
        <Slider label="بعد الجسم عن العدسة/المرآة" value={dObj} set={setDObj} min={8} max={55} unit="cm" />
        <Slider label="البعد البؤري f" value={fLen} set={setFLen} min={8} max={28} unit="cm" tone="accent-indigo-600" />
        <Slider label="موضع شاشة العرض" value={screenCm} set={setScreenCm} min={5} max={60} unit="cm" tone="accent-pink-500" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <button onClick={() => { if (real && isFinite(di)) setScreenCm(Math.round(Math.max(5, Math.min(60, Math.abs(di))))); recordExperiment("optics-screen"); }} className={chips(false)}>ضع الشاشة عند مستوى الصورة</button>
        <span className={`px-3 py-1.5 rounded-full text-[11.5px] font-black ring-1 ${defocusCm == null ? "bg-slate-100 text-slate-500 ring-slate-200" : defocusCm < 1.5 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : defocusCm < 6 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-rose-50 text-rose-600 ring-rose-200"}`}>
          {defocusCm == null ? "الصورة وهمية · لا تلتقطها شاشة" : defocusCm < 1.5 ? "الصورة حادة تماماً على الشاشة" : `الصورة ضبابية · الشاشة بعيدة ${fmt(defocusCm, 1)} سم عن مستواها`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="بعد الصورة" value={Math.abs(diRaw) >= 300 ? "في اللانهاية" : fmt(Math.abs(diRaw), 1)} unit="cm" tone="from-pink-50 ring-pink-100" />
        <Stat label="التكبير m" value={fmt(Math.abs(m))} unit="×" tone="from-indigo-50 ring-indigo-100" />
        <Stat label="النوع" value={real ? "حقيقية" : "وهمية"} tone="from-cyan-50 ring-cyan-100" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">{real ? "حقيقية · تلتقط على شاشة" : "وهمية · تراها العين فقط"}</span>
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">{m < 0 ? "مقلوبة" : "معتدلة"}</span>
        <span className="px-3 py-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[12px] font-black">{Math.abs(m) > 1 ? "مكبّرة" : Math.abs(m) < 1 ? "مصغّرة" : "بنفس الحجم"}</span>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3" dir="auto">معادلة العدسات والمرايا: ‎<span dir="ltr">1/f = 1/do + 1/di</span>‎ والتكبير <span dir="ltr">m = -di/do</span> · جرب وضع الجسم أقرب من البعد البؤري للمحدبة لترى صورة وهمية مكبرة كما في العدسة المكبرة · القيم تقريبية بنموذج العدسة الرقيقة.</p>
    </div>
  );
}

/* ============ FEATURE 6 · pendulum & gravity clock ============ */
export function PendulumLab() {
  const { recordExperiment, award } = usePhys();
  const [len, setLen] = useState(1);
  const [planetId, setPlanetId] = useState("earth");
  const [measured, setMeasured] = useState(null);
  const [damp, setDamp] = useState(0.03);
  const planet = planetById(planetId);
  const Ttheory = 2 * Math.PI * Math.sqrt(len / planet.g);
  const awardedRef = useRef(false);
  const P = useRef({});
  P.current = { len, g: planet.g, damp };
  const [canvasRef, world] = useSimCanvas(
    () => ({ t: 0, lastCross: 0, prev: 0, period: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      W.t += dt;
      const omega = Math.sqrt(p.g / p.len);
      // viscous damping: the swing envelope decays exponentially like a real pendulum in air
      const env = Math.exp(-p.damp * W.t);
      const th = 0.65 * env * Math.cos(omega * W.t);
      // measure period by zero crossings (same direction)
      const s = Math.sign(Math.cos(omega * W.t));
      if (W.prev <= 0 && s > 0 && W.t > 0.2) {
        if (W.lastCross > 0) {
          const per = W.t - W.lastCross;
          if (Math.abs(per - W.period) > 0.02) { W.period = per; setMeasured(per); }
        }
        W.lastCross = W.t;
      }
      W.prev = s;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#eef2ff"); sky.addColorStop(1, "#f5f3ff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(99,102,241,0.10)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < h; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      const pivotX = w / 2, pivotY = 26;
      const Lp = 60 + p.len * 78;
      const bx = pivotX + Math.sin(th) * Lp, by = pivotY + Math.cos(th) * Lp;
      ctx.strokeStyle = "rgba(124,58,237,0.3)"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + Lp + 24); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(pivotX - 44, pivotY - 4); ctx.lineTo(pivotX + 44, pivotY - 4); ctx.stroke();
      // protractor arc with degree ticks around the pivot
      ctx.strokeStyle = "rgba(8,145,178,0.55)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(pivotX, pivotY, 56, Math.PI / 2 - 0.72, Math.PI / 2 + 0.72); ctx.stroke();
      for (let dk = -45; dk <= 45; dk += 15) {
        const a2 = Math.PI / 2 + (dk * Math.PI) / 180;
        const long = dk % 45 === 0 || dk === 0;
        ctx.strokeStyle = "rgba(8,145,178,0.75)"; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(pivotX + 56 * Math.cos(a2), pivotY + 56 * Math.sin(a2));
        ctx.lineTo(pivotX + (56 - (long ? 9 : 5)) * Math.cos(a2), pivotY + (56 - (long ? 9 : 5)) * Math.sin(a2));
        ctx.stroke();
        if (long) {
          ctx.fillStyle = "#0e7490"; ctx.font = "900 8.5px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(Math.abs(dk) + "°", pivotX + 68 * Math.cos(a2), pivotY + 68 * Math.sin(a2) + 3);
        }
      }
      // soft shadow racing along the floor under the bob
      const floorY = h - 20;
      const closeness = Math.max(0.25, 1 - Math.abs(floorY - by) / Math.max(1, floorY));
      ctx.fillStyle = `rgba(49,46,129,${0.08 + closeness * 0.16})`;
      ctx.beginPath(); ctx.ellipse(bx, floorY + 8, 20 * closeness + 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bx, by); ctx.stroke();
      const grad = ctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, 19);
      grad.addColorStop(0, "#ddd6fe"); grad.addColorStop(0.5, "#8b5cf6"); grad.addColorStop(1, "#5b21b6");
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(bx, by, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.arc(bx - 5.5, by - 6, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#312e81"; ctx.beginPath(); ctx.arc(pivotX, pivotY, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#5b21b6"; ctx.font = "900 10.5px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("θ = " + fmt((th * 180) / Math.PI, 1) + "° · السعة الآن " + fmt(env * 100, 0) + "%", 12, 20);
      ctx.fillStyle = "#ede9fe"; ctx.fillRect(0, h - 20, w, 20);
      ctx.fillStyle = "#6d28d9"; ctx.font = "900 10.5px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("⏱️ البندول لا يعتمد زمنه على الكتلة أبداً · فقط الطول والجاذبية", w / 2, h - 7);
    }
  );
  useEffect(() => {
    if (measured && !awardedRef.current && Math.abs(measured - Ttheory) / Ttheory < 0.06) {
      awardedRef.current = true;
      award("pendulum-measure", 15, "قارنت الزمن المقاس بالنظري", "pendulum");
    }
  }, [measured, Ttheory, award]);
  return (
    <div className={cardCls} data-testid="phys-pendulum">
      {head3("⏱️", "البندول وساعة الجاذبية", "غيّر الطول والكوكب · وقارن الساعة بما تقوله المعادلة")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[250px] sm:h-[290px] block" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <Slider label="طول البندول L" value={len} set={(v) => { setLen(v); }} min={0.2} max={2} step={0.05} unit="m" />
        <Slider label="تخميد الهواء اللزج" value={damp} set={setDamp} min={0} max={0.22} step={0.01} unit="1/s" tone="accent-cyan-600" />
        <label className="block">
          <span className="block text-[12px] font-black text-slate-600 mb-1">الكوكب</span>
          <select value={planetId} onChange={(e) => setPlanetId(e.target.value)} className={selIn}>
            {PLANETS.map((p) => <option key={p.id} value={p.id}>{p.name} · g = {p.g}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="الزمن النظري T = 2π√(L/g)" value={fmt(Ttheory)} unit="s" />
        <Stat label="المقاس بالمشاهدة" value={measured ? fmt(measured) : "-"} unit="s" tone="from-emerald-50 ring-emerald-100" />
        <Stat label="التردد f = 1/T" value={fmt(1 / Ttheory)} unit="Hz" tone="from-cyan-50 ring-cyan-100" />
      </div>
      <button onClick={() => { const W = world.current; W.t = 0; W.lastCross = 0; W.period = 0; setMeasured(null); recordExperiment("pendulum"); }} className={ghostBtn + " mt-3"}><Timer className="w-4 h-4" /> أعد الأرجحة من جديد</button>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">ساعات الجد القديمة تعمل بهذا القانون · على القمر يتأرجح البندول أبطأ بمرتين ونصف لأن g أصغر · ولو نقلت ساعة بندول للأرض إلى المريخ لتأخرت كل يوم · التخميد يجعل السعة تتناقص أسّياً مع الزمن كما يحدث في الهواء الحقيقي، أما الزمن الدوري فيبقى شبه ثابت · القيم تقريبية لزوايا صغيرة.</p>
    </div>
  );
}

/* ============ FEATURE 7 · orbits & gravity ============ */
export function OrbitLab() {
  const { recordExperiment, award } = usePhys();
  const [speed, setSpeed] = useState(26);
  const [outcome, setOutcome] = useState("جاهز للإطلاق");
  const awardedRef = useRef(false);
  const rm = usePrefersReducedMotion();
  const P = useRef({});
  P.current = { speed, rm };
  const [canvasRef, world] = useSimCanvas(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, flying: false, trail: [], stable: 0, tt: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      W.tt += dt;
      const space = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, Math.max(w, h) * 0.75);
      space.addColorStop(0, "#1b1140"); space.addColorStop(0.6, "#0d0724"); space.addColorStop(1, "#05030f");
      ctx.fillStyle = space; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const sx = (i * 173.3) % w, sy = (i * 311.7) % h;
        const tw = p.rm ? 0.55 : 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(W.tt * (1 + (i % 4) * 0.4) + i * 1.7));
        ctx.fillStyle = i % 9 === 0 ? `rgba(165,243,252,${tw})` : `rgba(255,255,255,${tw})`;
        const ss = i % 11 === 0 ? 2.3 : 1.4;
        ctx.fillRect(sx, sy, ss, ss);
      }
      const cx = w / 2, cy = h / 2, MU = 62000, RP = 30, R0 = 118;
      if (W.flying) {
        const step = dt * 2.2;
        const dx = W.x - cx, dy = W.y - cy;
        const r = Math.max(9, Math.hypot(dx, dy));
        const a = -MU / (r * r);
        W.vx += (a * dx / r) * step; W.vy += (a * dy / r) * step;
        W.x += W.vx * step; W.y += W.vy * step;
        W.trail.push({ x: W.x, y: W.y });
        if (W.trail.length > 260) W.trail.shift();
        if (r < RP + 5) { W.flying = false; setOutcome("💥 تحطم على سطح الكوكب · السرعة قليلة فغلبته الجاذبية"); }
        else if (r > Math.max(w, h) * 0.75) { W.flying = false; setOutcome("🚀 هرب من الجاذبية · تجاوز سرعة الهروب وصار مسافراً بين الكواكب"); }
        else {
          W.stable += dt;
          if (W.stable > 7 && !awardedRef.current) {
            awardedRef.current = true;
            setOutcome("🛰️ مدار مستقر! القمر الصناعي يدور بثبات");
            award("orbit-stable", 25, "وضعت قمراً في مدار مستقر", "orbit");
          } else if (W.stable <= 7) setOutcome("🛰️ يدور الآن · راقب إن أكمل 7 ثوانٍ بثبات");
        }
      }
      // orbit guide
      ctx.strokeStyle = "rgba(148,163,184,0.35)"; ctx.lineWidth = 1.4; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // fading comet-like trail · brighter and thicker near the satellite
      W.trail.forEach((pt, i) => {
        const f = i / Math.max(1, W.trail.length);
        ctx.fillStyle = `rgba(103,232,249,${0.04 + f * 0.7})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 0.7 + f * 2.3, 0, Math.PI * 2); ctx.fill();
      });
      // planet with radial shading and a thin atmosphere halo
      const halo = ctx.createRadialGradient(cx, cy, RP, cx, cy, RP + 13);
      halo.addColorStop(0, "rgba(56,189,248,0.30)"); halo.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, RP + 13, 0, Math.PI * 2); ctx.fill();
      const pg = ctx.createRadialGradient(cx - 9, cy - 9, 3, cx, cy, RP + 8);
      pg.addColorStop(0, "#e0f2fe"); pg.addColorStop(0.35, "#7dd3fc"); pg.addColorStop(0.75, "#0284c7"); pg.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, RP, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.arc(cx - 9, cy - 6, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 11, cy + 9, 5, 0, Math.PI * 2); ctx.fill();
      // launch pad point + satellite
      const sx = W.flying || W.trail.length ? W.x : cx + R0, sy = W.flying || W.trail.length ? W.y : cy;
      // velocity vector of the satellite
      if (W.flying) {
        const vm = Math.hypot(W.vx, W.vy) || 1;
        arrow(ctx, sx, sy, sx + (W.vx / vm) * 30, sy + (W.vy / vm) * 30, "#4ade80", 2.6);
        ctx.fillStyle = "#86efac"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("v", sx + (W.vx / vm) * 38, sy + (W.vy / vm) * 38 + 3);
      }
      ctx.fillStyle = "#fbbf24";
      ctx.save(); ctx.translate(sx, sy);
      ctx.shadowColor = "rgba(251,191,36,0.8)"; ctx.shadowBlur = 9;
      ctx.fillRect(-6, -3, 12, 6);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e0f2fe"; ctx.fillRect(-11, -1.4, 5, 2.8); ctx.fillRect(6, -1.4, 5, 2.8);
      ctx.restore();
      ctx.fillStyle = "#e0e7ff"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("نقطة الإطلاق", cx + R0, cy + 22);
    }
  );
  const launch = () => {
    const W = world.current;
    const cv = canvasRef.current;
    W.x = (cv ? cv.clientWidth : 600) / 2 + 118; W.y = (cv ? cv.clientHeight : 300) / 2;
    W.vx = 0; W.vy = -speed; W.flying = true; W.trail = []; W.stable = 0;
    awardedRef.current = false;
    setOutcome("انطلق · راقب مصيره");
    recordExperiment("orbit");
  };
  const vc = Math.sqrt(62000 / 118);
  const ve = vc * Math.SQRT2;
  return (
    <div className={cardCls} data-testid="phys-orbit">
      {head3("🛰️", "مدارات وجاذبية", "أطلق قمراً صناعياً · أبطأ يتحطم · أسرع يهرب · وبينهما مدار ذهبي")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-900/40 ft-shadow">
        <div className="h-1.5 bg-gradient-to-l from-cyan-400 via-sky-400 to-violet-500" />
        <canvas ref={canvasRef} className="w-full h-[260px] sm:h-[310px] block" />
      </div>
      <Slider label="سرعة الإطلاق العرضية" value={speed} set={setSpeed} min={10} max={55} unit="وحدة/ثا" />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button onClick={launch} className={gradBtn}><Rocket className="w-4 h-4" /> إطلاق القمر</button>
        <span className="text-[11.5px] text-slate-400 font-bold">المدار الدائري عند <span dir="ltr">{fmt(vc, 1)}</span> · والهروب فوق <span dir="ltr">{fmt(ve, 1)}</span></span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={outcome} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-black text-slate-700 mt-3 rounded-2xl bg-indigo-50/80 ring-1 ring-indigo-100 px-3.5 py-2.5">{outcome}</motion.p>
      </AnimatePresence>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-2">قوانين كبلر: الكواكب تدور بإهليج الشمس في بؤرته، وتسرع قربها وتبطئ بعيداً عنها · محطة الفضاء الدولية تدور حول الأرض كل 90 دقيقة بسرعة 28 ألف كم/ساعة · سرعة الهروب أكبر من الدائرية بمعامل جذر 2 دائماً · تنبيه: المسافات والأحجام في هذا النموذج ليست بالمقياس الحقيقي، فقد ضغطناها لتدخل في الشاشة.</p>
    </div>
  );
}

/* ============ FEATURE 8 · springs & Hooke ============ */
export function SpringLab() {
  const { recordExperiment } = usePhys();
  const [k, setK] = useState(40);
  const [mass, setMass] = useState(2);
  const [dampS, setDampS] = useState(0.015);
  const P = useRef({});
  P.current = { k, mass, dampS };
  const [canvasRef, world] = useSimCanvas(
    () => ({ t: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      W.t += dt;
      const omega = Math.sqrt(p.k / p.mass);
      const envS = Math.exp(-p.dampS * W.t);
      const A = 62, x0 = w * 0.34, x = A * envS * Math.cos(omega * W.t);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#eef2ff"); sky.addColorStop(1, "#f5f3ff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(99,102,241,0.10)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < h; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      const midY = h * 0.46, wallX = 30;
      ctx.fillStyle = "#c7d2fe"; ctx.fillRect(0, midY + 44, w, h - midY - 44);
      ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, midY + 44); ctx.lineTo(w, midY + 44); ctx.stroke();
      ctx.strokeStyle = "rgba(124,58,237,0.35)"; ctx.lineWidth = 1.4; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(x0, 14); ctx.lineTo(x0, midY + 40); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#6d28d9"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("موضع الاتزان", x0, midY + 54);
      // wall
      ctx.fillStyle = "#312e81"; ctx.fillRect(14, midY - 52, 16, 96);
      ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(17, midY - 52, 3, 96);
      // spring coil · shaded body pass, then a metallic gradient, then a top highlight
      const endX = x0 + x - 34;
      const coils = 9, sw = Math.max(20, endX - wallX);
      const traceCoil = (dyOff) => {
        ctx.beginPath(); ctx.moveTo(wallX, midY + dyOff);
        for (let i = 1; i <= coils; i++) {
          const xx = wallX + (sw * i) / (coils + 1);
          ctx.lineTo(xx, midY + dyOff + (i % 2 === 0 ? -13 : 13));
        }
        ctx.lineTo(endX, midY + dyOff);
      };
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(76,29,149,0.45)"; ctx.lineWidth = 6.5; traceCoil(2.2); ctx.stroke();
      const coilGrad = ctx.createLinearGradient(wallX, midY - 14, wallX, midY + 14);
      coilGrad.addColorStop(0, "#c4b5fd"); coilGrad.addColorStop(0.5, "#7c3aed"); coilGrad.addColorStop(1, "#4c1d95");
      ctx.strokeStyle = coilGrad; ctx.lineWidth = 3.4; traceCoil(0); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.3; traceCoil(-2.6); ctx.stroke();
      // mass
      const mw = 46 + p.mass * 4;
      const grad = ctx.createLinearGradient(endX, midY - 26, endX, midY + 26);
      grad.addColorStop(0, "#a78bfa"); grad.addColorStop(1, "#6d28d9");
      ctx.fillStyle = grad; roundRect(ctx, endX, midY - 26, mw, 52, 10); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 12px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(fmt(p.mass, 1) + " kg", endX + mw / 2, midY + 4);
      // energy bars
      const keF = Math.pow(Math.sin(omega * W.t), 2), peF = 1 - keF;
      const bar = (bx, frac, col, label, valTxt) => {
        ctx.fillStyle = "#e2e8f0"; roundRect(ctx, bx, h - 46, 110, 13, 6); ctx.fill();
        ctx.fillStyle = col; if (frac > 0.01) { roundRect(ctx, bx, h - 46, Math.max(8, 110 * frac), 13, 6); ctx.fill(); }
        ctx.fillStyle = "#334155"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "right";
        ctx.fillText(label, bx - 6, h - 35);
        ctx.fillStyle = "#64748b"; ctx.textAlign = "left";
        ctx.fillText(valTxt, bx + 2, h - 56);
      };
      const E = 0.5 * p.k * Math.pow(0.62, 2) * envS * envS;
      bar(w * 0.3, keF, "#f59e0b", "حركية", fmt(keF * E, 1) + " J");
      bar(w * 0.62, peF, "#38bdf8", "مرنة", fmt(peF * E, 1) + " J");
    }
  );
  const T = 2 * Math.PI * Math.sqrt(mass / k);
  const F1 = k * 0.1;
  return (
    <div className={cardCls} data-testid="phys-spring">
      {head3("🌀", "النوابض وقانون هوك", "شدّ وارتخاء بلا توقف · والطاقة تتنقل بين مرنة وحركية")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[250px] sm:h-[290px] block touch-none" />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <Slider label="ثابت النابض k" value={k} set={setK} min={5} max={120} unit="N/m" />
        <Slider label="الكتلة m" value={mass} set={setMass} min={0.5} max={10} step={0.5} unit="kg" tone="accent-indigo-600" />
        <Slider label="تخميد الاحتكاك" value={dampS} set={setDampS} min={0} max={0.2} step={0.005} unit="1/s" tone="accent-cyan-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="الزمن الدوري T" value={fmt(T)} unit="s" />
        <Stat label="التردد f" value={fmt(1 / T)} unit="Hz" tone="from-indigo-50 ring-indigo-100" />
        <Stat label="قوة الشد عند 10 سم" value={fmt(F1, 1)} unit="N" tone="from-cyan-50 ring-cyan-100" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <button onClick={() => { world.current.t = 0; recordExperiment("spring"); }} className={ghostBtn}><RotateCcw className="w-4 h-4" /> شدّ النابض من جديد</button>
        <button onClick={() => recordExperiment("spring")} className={ghostBtn}><Activity className="w-4 h-4" /> شغّلت النابض</button>
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">قانون هوك: القوة = ثابت النابض × الاستطالة (F = kx) ما دام ضمن حد المرونة · نابض أقسى أو كتلة أخف يعني اهتزازاً أسرع · سيارتك تركب على أربعة نوابض عملاقة بهذا المبدأ · القيم تقريبية.</p>
    </div>
  );
}

/* ============ FEATURE 9 · friction ramp ============ */
export function RampLab() {
  const { recordExperiment } = usePhys();
  const [deg, setDeg] = useState(28);
  const [mu, setMu] = useState(0.3);
  const [mat, setMat] = useState("wood");
  const MATERIALS = [
    { id: "ice", ar: "جليد", mu: 0.03 },
    { id: "wood", ar: "خشب", mu: 0.3 },
    { id: "woodwood", ar: "خشب على خشب", mu: 0.4 },
    { id: "rubber", ar: "مطاط على أسفلت", mu: 0.7 },
  ];
  const P = useRef({});
  P.current = { deg, mu, mat };
  const slides = Math.tan((deg * Math.PI) / 180) > mu;
  const a = slides ? 9.81 * (Math.sin((deg * Math.PI) / 180) - mu * Math.cos((deg * Math.PI) / 180)) : 0;
  const [canvasRef] = useSimCanvas(
    () => ({ s: 0, v: 0 }),
    (ctx, w, h, dt, W) => {
      const p = P.current;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#eef2ff"); sky.addColorStop(1, "#f5f3ff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(99,102,241,0.10)";
      for (let gx = 0; gx < w; gx += 22) for (let gy = 8; gy < h; gy += 22) ctx.fillRect(gx, gy, 1.6, 1.6);
      const rad = (p.deg * Math.PI) / 180;
      const baseY = h - 34, xL = 26, xR = w - 26;
      const topY = baseY - Math.tan(rad) * (xR - xL) * 0.82;
      const rx = xR - (xR - xL) * 0.06;
      const topClamped = Math.max(26, topY);
      // slope body in the surface material, textured like the real thing
      const slopeGrad = ctx.createLinearGradient(xL, baseY, rx, topClamped);
      if (p.mat === "ice") { slopeGrad.addColorStop(0, "#e0f2fe"); slopeGrad.addColorStop(1, "#7dd3fc"); }
      else if (p.mat === "rubber") { slopeGrad.addColorStop(0, "#64748b"); slopeGrad.addColorStop(1, "#334155"); }
      else if (p.mat === "woodwood") { slopeGrad.addColorStop(0, "#fbbf24"); slopeGrad.addColorStop(1, "#b45309"); }
      else if (p.mat === "wood") { slopeGrad.addColorStop(0, "#fde68a"); slopeGrad.addColorStop(1, "#d97706"); }
      else { slopeGrad.addColorStop(0, "#ddd6fe"); slopeGrad.addColorStop(1, "#c4b5fd"); }
      ctx.fillStyle = slopeGrad;
      ctx.beginPath(); ctx.moveTo(xL, baseY); ctx.lineTo(rx, topClamped); ctx.lineTo(rx, baseY); ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(xL, baseY); ctx.lineTo(rx, topClamped); ctx.lineTo(rx, baseY); ctx.closePath(); ctx.clip();
      if (p.mat === "ice") {
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const yy = topClamped + 14 + i * ((baseY - topClamped) / 5);
          ctx.beginPath(); ctx.moveTo(xL + 10, yy); ctx.lineTo(rx - 16, yy - Math.tan(rad) * (rx - xL) * 0.1); ctx.stroke();
        }
      } else if (p.mat === "rubber") {
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        for (let i = 0; i < 60; i++) {
          ctx.fillRect(xL + ((i * 53) % (rx - xL)), topClamped + ((i * 29) % Math.max(10, baseY - topClamped)), 2, 2);
        }
      } else if (p.mat === "wood" || p.mat === "woodwood") {
        ctx.strokeStyle = p.mat === "wood" ? "rgba(146,64,14,0.5)" : "rgba(69,26,3,0.55)"; ctx.lineWidth = 1.6;
        const rows = 5;
        for (let i = 1; i <= rows; i++) {
          const off = (i * Math.max(12, baseY - topClamped)) / (rows + 1);
          ctx.beginPath(); ctx.moveTo(xL, baseY + off); ctx.lineTo(rx, topClamped + off); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.strokeStyle = p.mat === "ice" ? "#38bdf8" : p.mat === "rubber" ? "#1e293b" : "#8b5cf6"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xL, baseY); ctx.lineTo(rx, topClamped); ctx.stroke();
      ctx.fillStyle = "#c7d2fe"; ctx.fillRect(0, baseY, w, h - baseY);
      // angle arc
      ctx.strokeStyle = "#0891b2"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(xL, baseY, 46, -rad, 0); ctx.stroke();
      ctx.fillStyle = "#0e7490"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(fmt(p.deg, 0) + "°", xL + 52, baseY - 8);
      // block motion
      const sliding = Math.tan(rad) > p.mu;
      const acc = sliding ? 3.2 * (Math.sin(rad) - p.mu * Math.cos(rad)) * 4 : 0;
      if (sliding) {
        W.v += acc * dt; W.s += W.v * dt;
        if (W.s > 0.86) { W.s = 0; W.v = 0; }
      } else { W.s = 0; W.v = 0; }
      const sx = xL + (rx - xL) * (0.14 + W.s * 0.7);
      const sy = baseY - Math.tan(rad) * (sx - xL) - 16;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad);
      const grad = ctx.createLinearGradient(0, -15, 0, 15);
      grad.addColorStop(0, "#a78bfa"); grad.addColorStop(1, "#6d28d9");
      ctx.fillStyle = grad; roundRect(ctx, -22, -15, 44, 30, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("2 kg", 0, 3.5);
      ctx.restore();
      // forces drawn to one scale · 2 px per newton for a 2 kg block
      const cxp = sx, cyp = sy - 4;
      const SCL = 2.0, WT = 19.6, NN = WT * Math.cos(rad), COMP = WT * Math.sin(rad);
      const fricMag = sliding ? p.mu * NN : Math.min(COMP, p.mu * NN);
      arrow(ctx, cxp, cyp, cxp, cyp + WT * SCL, "#dc2626", 3);
      ctx.fillStyle = "#dc2626"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText("الوزن mg", cxp + 6, cyp + WT * SCL - 2);
      const nx = Math.sin(rad), ny = -Math.cos(rad);
      arrow(ctx, cxp, cyp, cxp + nx * NN * SCL, cyp + ny * NN * SCL, "#0891b2", 3);
      ctx.fillStyle = "#0891b2"; ctx.fillText("العمودية N", cxp + nx * (NN * SCL + 6), cyp + ny * (NN * SCL + 6));
      const ux = Math.cos(rad), uy = -Math.sin(rad);
      ctx.strokeStyle = "rgba(220,38,38,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp - ux * COMP * SCL, cyp - uy * COMP * SCL); ctx.stroke(); ctx.setLineDash([]);
      arrow(ctx, cxp, cyp, cxp - ux * COMP * SCL, cyp - uy * COMP * SCL, "rgba(220,38,38,0.55)", 2);
      if (fricMag > 0.3) {
        arrow(ctx, cxp, cyp, cxp + ux * fricMag * SCL, cyp + uy * fricMag * SCL, "#d97706", 3);
        ctx.fillStyle = "#d97706"; ctx.textAlign = "left";
        ctx.fillText("الاحتكاك", cxp + ux * (fricMag * SCL + 6), cyp + uy * (fricMag * SCL + 6));
      }
      ctx.fillStyle = sliding ? "#059669" : "#dc2626"; ctx.font = "900 12px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(sliding ? "⚡ ينزلق للأسفل" : "🔒 ثابت · الاحتكاك الساكن يكفي", w - 16, 24);
    }
  );
  const m = 2, th = (deg * Math.PI) / 180;
  return (
    <div className={cardCls} data-testid="phys-ramp">
      {head3("📐", "منحدر الاحتكاك", "متى يبقى الصندوق مكانه ومتى ينزلق؟ جرّب الحدود بنفسك")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <canvas ref={canvasRef} className="w-full h-[250px] sm:h-[290px] block touch-none" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {MATERIALS.map((mt) => (
          <button key={mt.id} onClick={() => { setMat(mt.id); setMu(mt.mu); }} className={chips(mat === mt.id)}>{mt.ar} · μ={fmt(mt.mu)}</button>
        ))}
        <button onClick={() => setMat("custom")} className={chips(mat === "custom")}>مخصص</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        <Slider label="زاوية المنحدر" value={deg} set={setDeg} min={5} max={50} unit="°" />
        <Slider label="معامل الاحتكاك μ" value={mu} set={(v) => { setMu(v); setMat("custom"); }} min={0} max={0.9} step={0.01} tone="accent-amber-500" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
        <Stat label="مركبة الوزن على المنحدر" value={fmt(m * 9.81 * Math.sin(th), 1)} unit="N" />
        <Stat label="القوة العمودية N" value={fmt(m * 9.81 * Math.cos(th), 1)} unit="N" tone="from-cyan-50 ring-cyan-100" />
        <Stat label="أقصى احتكاك ساكن" value={fmt(mu * m * 9.81 * Math.cos(th), 1)} unit="N" tone="from-amber-50 ring-amber-100" />
        <Stat label="التسارع a" value={fmt(a)} unit="m/s²" tone="from-emerald-50 ring-emerald-100" />
      </div>
      <button onClick={() => recordExperiment("ramp")} className={ghostBtn + " mt-3"}><Triangle className="w-4 h-4" /> جرّبت المنحدر</button>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">ينزلق الصندوق عندما تتغلب مركبة الوزن على أقصى احتكاك: الشرط <span dir="ltr">tanθ &gt; μ</span> · لهذا تنعطف طرق الجبال الأردنية كالملوكي بزوايا صغيرة وتُفرش بالحصى شتاءً لرفع الاحتكاك · القيم تقريبية لكتلة 2 كغ.</p>
    </div>
  );
}

/* ============ FEATURE 10 · free-body force diagram ============ */
let FORCE_ID = 0;
export function ForcesLab() {
  const { recordExperiment } = usePhys();
  const [mass, setMass] = useState(4);
  const [mu, setMu] = useState(0.25);
  const [forces, setForces] = useState([
    { id: ++FORCE_ID, name: "دفع", mag: 20, dir: 0 },
  ]);
  const DIRS = [[0, "يمين →"], [90, "أعلى ↑"], [180, "يسار ←"], [270, "أسفل ↓"], [45, "قطري 45°"]];
  const addForce = (name, dir) => { setForces((f) => [...f, { id: ++FORCE_ID, name, mag: 15, dir }]); recordExperiment("forces"); };
  const removeForce = (id) => setForces((f) => f.filter((x) => x.id !== id));
  const setForce = (id, patch) => setForces((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const calc = useMemo(() => {
    let fx = 0, fy = 0;
    forces.forEach((fr) => {
      const r = (fr.dir * Math.PI) / 180;
      fx += fr.mag * Math.cos(r); fy += fr.mag * Math.sin(r);
    });
    const weight = mass * 9.81;
    const normal = Math.max(0, weight - fy);
    let fric = 0;
    if (Math.abs(fx) > 0.01) fric = -Math.sign(fx) * Math.min(mu * normal, Math.abs(fx));
    const netX = fx + fric, netY = fy + normal - weight;
    const net = Math.hypot(netX, netY);
    return { fx, fy, weight, normal, fric, netX, netY, net, a: net / mass };
  }, [forces, mass, mu]);
  const CX = 340, CY = 176, SC = 2.1;
  const arrowSvg = (x1, y1, x2, y2, col, key, dash) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    return (
      <g key={key}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={dash ? "5 4" : ""} />
        <path d={`M ${x2} ${y2} L ${x2 - 10 * Math.cos(ang - 0.4)} ${y2 - 10 * Math.sin(ang - 0.4)} L ${x2 - 10 * Math.cos(ang + 0.4)} ${y2 - 10 * Math.sin(ang + 0.4)} Z`} fill={col} />
      </g>
    );
  };
  return (
    <div className={cardCls} data-testid="phys-forces">
      {head3("🎯", "مخطط القوى الحر", "أضف قوى بسِّهمها · وشاهد المحصلة تقرر مصير الصندوق")}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-indigo-100 ft-shadow bg-gradient-to-b from-indigo-50/80 to-white">
        <div className="h-1.5 bg-gradient-to-l from-violet-500 via-indigo-400 to-cyan-400" />
        <svg viewBox="0 0 680 300" className="w-full block" dir="ltr" role="img" aria-label="مخطط قوى حر">
          <line x1={10} y1={CY + 44} x2={670} y2={CY + 44} stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" />
          {Array.from({ length: 30 }).map((_, i) => (
            <line key={i} x1={20 + i * 22} y1={CY + 48} x2={14 + i * 22} y2={CY + 58} stroke="#c7d2fe" strokeWidth="2" />
          ))}
          <ellipse cx={CX} cy={CY + 50} rx={48} ry={6} fill="rgba(30,27,75,0.16)" />
          <rect x={CX - 34} y={CY - 44} width={68} height={88} rx={12} fill="url(#fgrad)" stroke="#6d28d9" strokeWidth={2} />
          <defs>
            <linearGradient id="fgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ddd6fe" /><stop offset="45%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <text x={CX} y={CY + 5} fill="#fff" fontSize="14" fontWeight="900" textAnchor="middle">{fmt(mass, 0)} kg</text>
          {forces.map((fr) => {
            const r = (fr.dir * Math.PI) / 180;
            const ux = Math.cos(r), uy = -Math.sin(r);
            const tx = CX + ux * fr.mag * SC, ty = CY + uy * fr.mag * SC;
            const edgeOff = Math.min(42, fr.mag * SC * 0.85);
            const ex = CX + ux * edgeOff, ey = CY + uy * edgeOff * 1.08;
            return (
              <g key={"rope" + fr.id}>
                <line x1={ex} y1={ey} x2={tx} y2={ty} stroke="#92400e" strokeWidth="4.5" strokeLinecap="round" opacity="0.8" />
                <circle cx={ex} cy={ey} r="4.2" fill="#78350f" />
                <circle cx={tx} cy={ty} r="3.4" fill="#b45309" />
                {arrowSvg(CX, CY, tx, ty, "#f59e0b", "f" + fr.id)}
              </g>
            );
          })}
          {arrowSvg(CX, CY, CX, CY + calc.weight * SC * 0.55, "#dc2626", "w")}
          {calc.normal > 0.5 && arrowSvg(CX, CY, CX, CY - calc.normal * SC * 0.55, "#0891b2", "n")}
          {Math.abs(calc.fric) > 0.3 && arrowSvg(CX, CY, CX + calc.fric * SC, CY, "#d97706", "fr")}
          {calc.net > 0.5 && arrowSvg(CX, CY, CX + calc.netX * SC * 1.25, CY - calc.netY * SC * 1.25, "#059669", "net", true)}
          <text x={CX + 10} y={CY + 64} fill="#dc2626" fontSize="11" fontWeight="900">الوزن</text>
          <text x={CX + 10} y={CY - 52} fill="#0891b2" fontSize="11" fontWeight="900">العمودية</text>
          {calc.net > 0.5 && <text x={CX + calc.netX * SC * 1.25 - 8} y={CY - calc.netY * SC * 1.25 - 12} fill="#059669" fontSize="12" fontWeight="900">المحصلة</text>}
        </svg>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Slider label="كتلة الصندوق" value={mass} set={setMass} min={1} max={20} unit="kg" />
        <Slider label="معامل الاحتكاك μ" value={mu} set={setMu} min={0} max={0.9} step={0.02} tone="accent-amber-500" />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button onClick={() => addForce("دفع", 0)} className={chips(false)}>+ دفع يمين</button>
        <button onClick={() => addForce("سحب", 45)} className={chips(false)}>+ سحب قطري</button>
        <button onClick={() => addForce("رفع", 90)} className={chips(false)}>+ رفع أعلى</button>
        <button onClick={() => addForce("دفع", 180)} className={chips(false)}>+ دفع يسار</button>
      </div>
      <div className="space-y-2 mt-3">
        {forces.map((fr) => (
          <div key={fr.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white ring-1 ring-slate-100 px-3 py-2">
            <span className="text-[12px] font-black text-slate-700">{fr.name}</span>
            <span className="flex-1 min-w-[130px]">
              <input type="range" min={0} max={60} value={fr.mag} onChange={(e) => setForce(fr.id, { mag: +e.target.value })} className="w-full accent-amber-500 h-8 cursor-pointer" aria-label="مقدار القوة" />
            </span>
            <span className="text-[12px] font-black text-amber-600" dir="ltr">{fr.mag} N</span>
            <select value={fr.dir} onChange={(e) => setForce(fr.id, { dir: +e.target.value })} className="px-2 py-2 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[12px] font-black min-h-[40px]">
              {DIRS.map(([v, ar]) => <option key={v} value={v}>{ar}</option>)}
            </select>
            <button onClick={() => removeForce(fr.id)} className="pressable w-10 h-10 grid place-items-center rounded-xl bg-rose-50 ring-1 ring-rose-100 text-rose-500 active:scale-90" aria-label="حذف القوة"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="القوة العمودية N" value={fmt(calc.normal, 1)} unit="N" tone="from-cyan-50 ring-cyan-100" />
        <Stat label="الاحتكاك" value={fmt(Math.abs(calc.fric), 1)} unit="N" tone="from-amber-50 ring-amber-100" />
        <Stat label="التسارع a = F/m" value={fmt(calc.a)} unit="m/s²" tone="from-emerald-50 ring-emerald-100" />
      </div>
      <p className="text-[12px] text-slate-400 font-semibold leading-relaxed mt-3">إذا تساوت القوى فالمحصلة صفر ويبقى الصندوق ساكناً أو متحركاً بسرعة ثابتة (قانون نيوتن الأول) · ارفع الصندوق جزئياً بقوة لأعلى ولاحظ أن العمودية والاحتكاك ينقصان · القيم تقريبية بنموذج احتكاك بسيط.</p>
    </div>
  );
}

/* ============ FEATURE 11 · EM spectrum explorer ============ */
