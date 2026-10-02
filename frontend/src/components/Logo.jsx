import React from "react";

/* Brand logo · transparent inline SVG (no background baked in).
   Colors come from the live theme variables, so the mark recolors itself
   with every design change: book in --ft-grad-b, spark in --ft-accent. */
export function LogoMark({ className = "w-9 h-9" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true" data-testid="brand-logo-mark">
      <path
        d="M24 15.5C20.6 12.9 16.1 12.1 11 12.5v23c5.1-.4 9.6.4 13 3 3.4-2.6 7.9-3.4 13-3v-23c-5.1-.4-9.6.4-13 3Z"
        fill="var(--ft-grad-b, #065f46)"
      />
      <path d="M24 15.5v23" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.6" />
      <path
        d="M17.5 19.2c1.9.1 3.6.6 5 1.5M17.5 24.2c1.9.1 3.6.6 5 1.5M30.5 19.2c-1.9.1-3.6.6-5 1.5M30.5 24.2c-1.9.1-3.6.6-5 1.5"
        stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M24 1.8 25.8 6.4 30.4 8.2 25.8 10 24 14.6 22.2 10 17.6 8.2 22.2 6.4Z"
        fill="var(--ft-accent, #10b981)"
      />
    </svg>
  );
}

export function Logo({ className = "", showText = true, dark = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
      <LogoMark className="w-9 h-9 shrink-0 drop-shadow-sm" />
      {showText && (
        <div className="leading-tight">
          <div className={`font-head font-extrabold text-[15px] ${dark ? "text-white" : "text-slate-900"}`}>مفكرو المستقبل</div>
          <div className={`text-[10px] ${dark ? "text-slate-300" : "text-slate-500"}`}>Future Thinkers</div>
        </div>
      )}
    </div>
  );
}
