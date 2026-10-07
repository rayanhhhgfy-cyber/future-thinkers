import React from "react";
import { Trophy, ChevronLeft, X } from "lucide-react";

/**
 * Glass achievement toast: bottom-center, wide, warm aurora glass (no blue).
 * Rendered through sonner toast.custom on the dedicated "ft-ach" toaster,
 * which is positioned bottom-center with a wide --width. Dismiss + view
 * actions live here; auto-dismiss is handled by sonner.
 */
export default function AchievementToast({ title, body, link, onView, onDismiss }) {
  return (
    <div
      dir="rtl"
      className="relative w-full overflow-hidden rounded-[1.75rem] ft-shadow-lg"
      role="status"
    >
      {/* aurora glass layers */}
      <div className="absolute inset-0 bg-gradient-to-l from-amber-300/55 via-rose-300/40 to-violet-300/50" />
      <div className="absolute -top-12 -left-8 w-44 h-44 rounded-full bg-amber-300/60 blur-3xl" />
      <div className="absolute -bottom-14 right-16 w-44 h-44 rounded-full bg-violet-400/45 blur-3xl" />
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/50" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/70 rounded-[1.75rem]" />
      <div className="absolute top-0 right-8 left-8 h-px bg-gradient-to-l from-transparent via-white to-transparent" />

      <div className="relative flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5">
        <span className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/60">
          <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-300 ring-2 ring-white animate-ping" />
          <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-white" />
        </span>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-white/65 ring-1 ring-white/80 text-[9.5px] font-black text-amber-700 backdrop-blur">
              إنجاز جديد 🏆
            </span>
            <span className="text-[10px] font-bold text-slate-500">الآن ✨</span>
          </div>
          <div className="font-head font-black text-slate-900 text-[15px] sm:text-lg leading-snug mt-1 line-clamp-2">
            {title}
          </div>
          {body && (
            <p className="text-slate-600 text-[12px] sm:text-[13px] font-medium leading-relaxed mt-0.5 line-clamp-2">
              {body}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
          {link && (
            <button
              onClick={onView}
              className="pressable inline-flex items-center gap-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900 text-white text-[12px] sm:text-[13px] font-head font-black ft-shadow hover:scale-[1.04] active:scale-95 transition"
            >
              عرض
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDismiss}
            aria-label="إغلاق"
            className="pressable w-9 h-9 grid place-items-center rounded-full bg-white/60 ring-1 ring-white/80 text-slate-500 backdrop-blur hover:bg-white/85 active:scale-90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
