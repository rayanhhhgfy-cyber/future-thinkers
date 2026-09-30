import React, { useEffect, useState, useCallback } from "react";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "ft_pwa_install_dismissed";

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null);
  }, [deferred]);

  if (installed || dismissed) return null;

  // Android/desktop Chrome: native install prompt available
  if (deferred) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur px-4 py-3 shadow-2xl border border-white/10 max-w-md w-full">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold leading-tight">حمّل تطبيق مفكري المستقبل</p>
            <p className="text-slate-300 text-xs mt-0.5">ثبّته على جهازك لفتحه بسرعة في أي وقت</p>
          </div>
          <button
            onClick={install}
            data-testid="pwa-install-button"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            تثبيت
          </button>
          <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari: no native prompt — show manual instructions instead
  if (isIos() && !showIosHint) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur px-4 py-3 shadow-2xl border border-white/10 max-w-md w-full">
          <img src="/icons/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
          <p className="flex-1 text-white text-sm font-bold leading-snug">حمّل التطبيق على جهازك</p>
          <button
            onClick={() => setShowIosHint(true)}
            data-testid="pwa-install-button"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            تحميل
          </button>
          <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isIos() && showIosHint) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto rounded-2xl bg-slate-900/95 backdrop-blur px-5 py-4 shadow-2xl border border-white/10 max-w-md w-full">
          <div className="flex items-start justify-between gap-3">
            <p className="text-white text-sm font-bold">لتثبيت التطبيق على iPhone:</p>
            <button onClick={dismiss} aria-label="إغلاق" className="text-slate-400 hover:text-white p-1 -m-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="mt-2 space-y-1.5 text-slate-200 text-[13px] leading-relaxed list-none">
            <li className="flex items-center gap-2"><Share className="w-4 h-4 shrink-0 text-emerald-400" /> اضغط زر المشاركة في الأسفل</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
            <li>ثم اضغط «إضافة»</li>
          </ol>
        </div>
      </div>
    );
  }

  return null;
}
