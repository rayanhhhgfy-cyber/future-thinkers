import React, { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { isPushSupported, pushPermission, enablePush, backendPushEnabled } from "@/lib/push";

const DISMISS_KEY = "ft_push_dismissed";

/**
 * One-time banner inviting logged-in users to enable phone push notifications.
 * Shown only when push is supported, permission not yet decided, and this
 * device isn't already subscribed. Dismissal is remembered per device.
 */
export default function PushBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !isPushSupported()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (pushPermission() !== "default") return;
    let alive = true;
    backendPushEnabled().then((on) => {
      if (alive && !on) setVisible(true);
    });
    return () => { alive = false; };
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const activate = async () => {
    setBusy(true);
    try {
      await enablePush();
      toast.success("تم تفعيل إشعارات الهاتف 🎉");
      setVisible(false);
    } catch (e) {
      toast.error(e.message || "تعذر تفعيل الإشعارات");
      if (pushPermission() === "denied") {
        // don't nag again; they can re-enable from account settings
        localStorage.setItem(DISMISS_KEY, "1");
        setVisible(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="fixed bottom-20 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-slate-900 text-white rounded-2xl p-4 ft-shadow-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 grid place-items-center shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">إشعارات على هاتفك؟</div>
          <div className="text-xs text-slate-300">وصّل تنبيهات المنصة مباشرة إلى هاتفك حتى لو كان التطبيق مغلقاً.</div>
        </div>
        <button
          onClick={activate}
          disabled={busy}
          data-testid="push-enable-btn"
          className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold"
        >
          {busy ? "جارٍ…" : "تفعيل"}
        </button>
        <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
