import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Cookie } from "lucide-react";

const KEY = "ft_cookie_notice";

/* Transparency notice: the platform uses strictly-essential cookies only,
   so this informs rather than gates. Dismissal is remembered on the device. */
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); }
  }, []);

  if (!show || pathname.startsWith("/messages")) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setShow(false);
  };

  return (
    <div
      className="fixed inset-x-3 bottom-[92px] z-40 sm:inset-x-6 lg:inset-x-auto lg:left-6 lg:bottom-6 lg:w-[26rem]"
      role="region"
      aria-label="إشعار ملفات الارتباط"
      data-testid="cookie-notice"
    >
      <div className="rounded-[1.6rem] bg-white/92 backdrop-blur-xl shadow-[0_24px_50px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 p-4 sm:p-5 animate-fade-up">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl ft-icon-tile grid place-items-center shrink-0">
            <Cookie className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-head font-extrabold text-slate-900 text-[15px]">ملفات الارتباط</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
              نستخدم ملفات ارتباط أساسية فقط لتشغيل المنصة وحفظ دخولك وتفضيلاتك على جهازك · لا تتبّع ولا إعلانات.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={dismiss}
            data-testid="cookie-notice-accept"
            className="pressable flex-1 h-11 rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-lg transition hover:scale-[1.02]"
          >
            حسناً، فهمت
          </button>
          <Link
            to="/cookies"
            className="pressable inline-flex h-11 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            التفاصيل
          </Link>
        </div>
      </div>
    </div>
  );
}
