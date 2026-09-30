import React from "react";

export function Logo({ className = "", showText = true, dark = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
      <img
        src="/icons/icon-192.png"
        alt="مفكرو المستقبل"
        className="w-9 h-9 rounded-xl shadow-md object-cover"
      />
      {showText && (
        <div className="leading-tight">
          <div className={`font-head font-extrabold text-[15px] ${dark ? "text-white" : "text-slate-900"}`}>مفكرو المستقبل</div>
          <div className={`text-[10px] ${dark ? "text-slate-300" : "text-slate-500"}`}>Future Thinkers</div>
        </div>
      )}
    </div>
  );
}
