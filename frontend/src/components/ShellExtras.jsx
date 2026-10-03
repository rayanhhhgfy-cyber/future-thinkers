import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Share2 } from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* RouteProgress · hairline gradient bar at the very top that sweeps   */
/* on every route change. Subtle, fast, pointer-transparent.           */
/* ------------------------------------------------------------------ */
export function RouteProgress() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const timers = [
      setTimeout(() => { setVisible(true); setProgress(14); }, 0),
      setTimeout(() => setProgress(62), 110),
      setTimeout(() => setProgress(86), 300),
      setTimeout(() => setProgress(100), 460),
      setTimeout(() => setVisible(false), 700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 start-0 z-[120] h-[3px] pointer-events-none ft-grad-bar rounded-b-full shadow-[0_2px_12px_rgba(16,185,129,0.45)]"
      style={{
        width: `${progress}%`,
        opacity: visible ? 1 : 0,
        transition: "width .3s cubic-bezier(.22,1,.36,1), opacity .3s ease",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* BackToTop · glass circular button that floats in after 600px of     */
/* scroll. Sits above the mobile tab bar; stays under the reader       */
/* overlay (z-80) so it never intrudes on reading, and is hidden on    */
/* /messages which has its own composer dock.                          */
/* ------------------------------------------------------------------ */
export function BackToTop() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/messages")) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="back-to-top"
          initial={{ opacity: 0, y: 14, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.85 }}
          transition={{ duration: 0.22 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة إلى الأعلى"
          data-testid="back-to-top-btn"
          className="fixed bottom-24 lg:bottom-6 start-4 z-[70] w-11 h-11 rounded-full glass border border-white/60 ring-1 ring-slate-900/5 shadow-[0_14px_34px_-10px_rgba(15,23,42,0.45)] grid place-items-center ft-text-accent active:scale-90 transition-transform"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* sharePage · native share sheet when available, clipboard fallback.  */
/* ------------------------------------------------------------------ */
export async function sharePage({ title, text } = {}) {
  const url = window.location.href;
  const shareTitle = title || document.title || "مفكرو المستقبل";
  try {
    if (navigator.share) {
      await navigator.share({ title: shareTitle, text: text || shareTitle, url });
      return;
    }
    throw new Error("no-native-share");
  } catch (e) {
    if (e && e.name === "AbortError") return; // user dismissed the sheet
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ رابط الصفحة", { description: "شاركه مع أصدقائك أينما تريد" });
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast.success("تم نسخ رابط الصفحة"); }
      catch { toast.error("تعذّر نسخ الرابط"); }
      document.body.removeChild(ta);
    }
  }
}

/* ShareButton · compact glass icon button for the navbar and drawer. */
export function ShareButton({ className = "", testId = "share-page-btn" }) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label="مشاركة الصفحة"
      onClick={() => sharePage()}
      className={`w-10 h-10 rounded-xl grid place-items-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-90 ${className}`}
    >
      <Share2 className="w-5 h-5" />
    </button>
  );
}
