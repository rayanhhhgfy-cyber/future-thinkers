import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Check } from "lucide-react";

/**
 * Pull-to-refresh for list pages (touch only).
 * Wrap the page content: a downward pull while the page is at the very top
 * past THRESHOLD triggers onRefresh. Content follows the finger, then
 * settles into a spinner until onRefresh resolves.
 * Mouse/desktop untouched · vertical-dominant gestures only, so inner
 * horizontal scrollers keep working.
 */
const THRESHOLD = 70;
const MAX = 110;
const HOLD = 54;

export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const wrapRef = useRef(null);
  const gesture = useRef(null); // {x, y, active}
  const busyRef = useRef(false);
  const pullRef = useRef(0);
  const [pull, setPullState] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | refreshing | done

  const setPull = (v) => { pullRef.current = v; setPullState(v); };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !onRefresh) return;

    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 2;

    const start = (e) => {
      if (busyRef.current || e.touches.length !== 1 || !atTop()) { gesture.current = null; return; }
      const t = e.touches[0];
      gesture.current = { x: t.clientX, y: t.clientY, active: false };
    };

    const move = (e) => {
      const g = gesture.current;
      if (!g || busyRef.current) return;
      const t = e.touches[0];
      const dy = t.clientY - g.y;
      const dx = Math.abs(t.clientX - g.x);
      if (!g.active) {
        if (dy > 10 && dy > dx * 1.6 && atTop()) {
          g.active = true;
        } else if (dy < -4 || dx > 12) {
          gesture.current = null;
          return;
        } else {
          return;
        }
      }
      if (dy <= 0) { setPull(0); return; }
      if (e.cancelable) e.preventDefault(); // block native scroll/bounce mid-pull
      setPull(Math.min(MAX, dy * 0.5));
    };

    const release = async () => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || !g.active || busyRef.current) { setPull(0); return; }
      if (pullRef.current < THRESHOLD) { setPull(0); return; }
      busyRef.current = true;
      setPhase("refreshing");
      setPull(HOLD);
      const t0 = Date.now();
      try { await onRefresh(); } catch { /* the page surfaces its own errors */ }
      const wait = Math.max(0, 550 - (Date.now() - t0));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setPhase("done");
      setTimeout(() => {
        setPull(0);
        setPhase("idle");
        busyRef.current = false;
      }, 450);
    };

    const cancel = () => { gesture.current = null; if (!busyRef.current) setPull(0); };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", release);
    el.addEventListener("touchcancel", cancel);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", cancel);
    };
  }, [onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);
  const R = 11;
  const CIRC = 2 * Math.PI * R;

  return (
    <div ref={wrapRef} className={`relative ${className}`} data-testid="pull-to-refresh">
      {/* pull indicator */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
        style={{
          opacity: pull > 4 || phase !== "idle" ? 1 : 0,
          transform: `translateY(${Math.max(0, pull - 46)}px)`,
          transition: "transform .3s cubic-bezier(.22,1,.36,1), opacity .25s",
        }}
      >
        <div
          className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_10px_28px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
          style={{ transform: `scale(${0.6 + 0.4 * progress})` }}
        >
          {phase === "done" ? (
            <Check className="h-5 w-5 text-emerald-500" />
          ) : phase === "refreshing" ? (
            <RefreshCw className="h-5 w-5 animate-spin ft-text-accent" />
          ) : (
            <svg width="26" height="26" viewBox="0 0 26 26" className="-rotate-90">
              <circle cx="13" cy="13" r={R} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
              <circle
                cx="13" cy="13" r={R} fill="none" strokeWidth="2.5" strokeLinecap="round"
                stroke="var(--ft-accent, #059669)"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)}
              />
            </svg>
          )}
        </div>
      </div>
      {/* content follows the finger */}
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: pull === 0 ? "transform .35s cubic-bezier(.22,1,.36,1)" : undefined,
          willChange: pull > 0 ? "transform" : undefined,
        }}
      >
        {children}
      </div>
      {phase === "refreshing" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center">
          <span className="animate-fade-up rounded-full bg-slate-900/85 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur">جارٍ التحديث…</span>
        </div>
      )}
    </div>
  );
}
