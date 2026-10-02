import React, { useState } from "react";
import { AlertTriangle, Flag, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiErr, errorDetail, reportError } from "@/lib/api";

/* Button shown next to an error: sends the FULL real error (stack / raw server
   response) to the admin error log. The user only sees a thank-you toast. */
export function ReportErrorButton({ error, message, detail, context, className = "" }) {
  const [state, setState] = useState("idle"); // idle | busy | sent
  const send = async () => {
    if (state !== "idle") return;
    setState("busy");
    const ok = await reportError({
      message: message || apiErr(error),
      detail: detail || errorDetail(error),
      context: context || "",
    });
    if (ok) {
      setState("sent");
      toast.success("وصل بلاغك · شكرًا لمساعدتنا على الإصلاح 🙏");
    } else {
      setState("idle");
      toast.error("تعذر إرسال البلاغ · تحقق من الاتصال");
    }
  };
  if (state === "sent") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold ${className}`}>
        <CheckCircle2 className="w-4 h-4" /> تم إرسال البلاغ
      </span>
    );
  }
  return (
    <button onClick={send} disabled={state === "busy"}
      className={`inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-500 border border-slate-200 hover:border-rose-300 rounded-full px-3 py-1.5 transition disabled:opacity-60 ${className}`}>
      {state === "busy" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
      إبلاغ عن هذا الخطأ
    </button>
  );
}

/* Friendly error card: short human message + retry + report button. */
export function ErrorState({ error, message, onRetry, context, className = "" }) {
  const friendly = message || apiErr(error);
  return (
    <div className={`rounded-2xl border border-rose-100 bg-rose-50/60 p-5 text-center ${className}`}>
      <div className="w-11 h-11 mx-auto rounded-full bg-rose-100 text-rose-500 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-700">{friendly}</p>
      <p className="mt-1 text-xs text-slate-400">إذا تكررت المشكلة، أرسل بلاغًا وسيصل الخطأ كاملًا لفريق الدعم</p>
      <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
        {onRetry && (
          <button onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 py-2 transition">
            <RotateCcw className="w-3.5 h-3.5" /> إعادة المحاولة
          </button>
        )}
        <ReportErrorButton error={error} message={friendly} context={context} />
      </div>
    </div>
  );
}

/* Catches render crashes anywhere below it: friendly screen, full stack
   auto-reported to the admin error log, manual report button too. */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    reportError({
      message: error?.message || "خطأ في عرض الصفحة",
      detail: `${error?.stack || error}\n\nأجزاء الواجهة:\n${info?.componentStack || ""}`,
      context: "react-crash",
      source: "auto",
    });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorState
            error={this.state.error}
            message="حدث خطأ أثناء عرض هذه الصفحة"
            context="react-crash"
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }
}

/* Auto-capture: uncaught JS errors + unhandled promise rejections are stored
   in the admin error log automatically (deduped + throttled, ResizeObserver
   noise ignored). Installed once from App. */
let reporterInstalled = false;
export function installErrorReporter() {
  if (reporterInstalled || typeof window === "undefined") return;
  reporterInstalled = true;
  const sentAt = new Map();
  const send = (message, detail) => {
    const key = String(message || "").slice(0, 120);
    const last = sentAt.get(key) || 0;
    if (Date.now() - last < 60000) return;
    sentAt.set(key, Date.now());
    reportError({ message, detail, context: "auto-capture", source: "auto" });
  };
  window.addEventListener("error", (ev) => {
    const msg = ev?.error?.message || ev?.message || "";
    if (!msg || /ResizeObserver loop/.test(msg)) return;
    send(msg, ev?.error?.stack || `${msg}\n${ev?.filename || ""}:${ev?.lineno || ""}`);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev?.reason;
    if (!r) return;
    const msg = apiErr(r);
    if (msg === "تعذر الاتصال بالخادم · تحقق من الإنترنت وحاول مجددًا") return; // offline noise
    send(r?.message || msg, errorDetail(r));
  });
}
