import React from "react";

/**
 * Catches lazy-chunk load failures (classic after a new deploy, when an old
 * cached app shell asks for chunk files that no longer exist). Auto-reloads
 * ONCE per session to pick up the fresh build; if it still fails, shows a
 * friendly recovery card instead of an endless spinner or blank page.
 */
export default class ChunkBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError(error) {
    const msg = String((error && error.message) || error || "");
    const isChunk =
      /Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
    if (isChunk) {
      try {
        if (!sessionStorage.getItem("ft-chunk-reloaded")) {
          sessionStorage.setItem("ft-chunk-reloaded", "1");
          window.location.reload();
          return { failed: false };
        }
      } catch { /* private mode */ }
    }
    return { failed: true };
  }

  componentDidCatch() { /* state already set */ }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div dir="rtl" className="min-h-[60vh] grid place-items-center px-4 py-16">
        <div className="w-full max-w-md rounded-[1.75rem] bg-white ring-1 ring-slate-100 ft-shadow-lg p-7 text-center">
          <div className="text-5xl mb-3">🧩</div>
          <div className="font-head font-black text-xl text-slate-900">وصل تحديث جديد للموقع</div>
          <p className="text-sm text-slate-500 leading-relaxed mt-2">
            نسختك الحالية قديمة شوي. حدّث الصفحة وبتكمل من محلّك مباشرة.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem("ft-chunk-reloaded"); } catch {} window.location.reload(); }}
            className="pressable mt-5 px-6 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-head font-black ft-shadow hover:scale-[1.03] active:scale-95 transition"
          >
            تحديث الصفحة الآن
          </button>
        </div>
      </div>
    );
  }
}
