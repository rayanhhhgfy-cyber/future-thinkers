import React, { createContext, useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Construction, ShieldCheck } from "lucide-react";

const SiteConfigContext = createContext({ toggles: {}, maintenance: { on: false }, loaded: false });

export function SiteConfigProvider({ children }) {
  const [cfg, setCfg] = useState({ toggles: {}, maintenance: { on: false, message: "" }, loaded: false });

  useEffect(() => {
    let alive = true;
    api.get("/site/config", { headers: { "Cache-Control": "no-cache" } })
      .then(({ data }) => { if (alive) setCfg({ toggles: data.toggles || {}, maintenance: data.maintenance || { on: false }, loaded: true }); })
      .catch(() => { if (alive) setCfg((c) => ({ ...c, loaded: true })); });
    return () => { alive = false; };
  }, []);

  return <SiteConfigContext.Provider value={cfg}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

/** Maps a route to its admin toggle key. */
export function sectionOfPath(path) {
  if (path.startsWith("/games")) return "games";
  if (path.startsWith("/stories")) return "stories";
  if (path.startsWith("/swap")) return "swap";
  if (path.startsWith("/community") || path.startsWith("/discussions")) return "community";
  if (path.startsWith("/ventures")) return "ventures";
  if (path.startsWith("/clubs")) return "clubs";
  if (path.startsWith("/mini-books")) return "mini_books";
  if (path.startsWith("/live-sessions")) return "live_sessions";
  return null;
}

export function SectionGate({ section, children }) {
  const { toggles, loaded } = useSiteConfig();
  if (loaded && toggles[section] === false) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="mx-auto w-16 h-16 rounded-3xl bg-amber-100 grid place-items-center">
          <Construction className="w-8 h-8 text-amber-600" />
        </span>
        <p className="font-head font-black text-2xl mt-5">هذا القسم متوقف مؤقتاً</p>
        <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">نعمل على تحسينه الآن · عد لاحقاً وستجده أجمل</p>
        <Link to="/dashboard" className="inline-block mt-6 rounded-2xl bg-slate-900 text-white px-6 py-3 font-head font-black transition hover:scale-[1.02] active:scale-95">
          عودة إلى لوحتي
        </Link>
      </div>
    );
  }
  return children;
}

export function MaintenanceGate({ children }) {
  const { maintenance, loaded } = useSiteConfig();
  const { user, isStaff } = useAuth();
  const loc = useLocation();
  const exempt = ["/login", "/register"].includes(loc.pathname) || loc.pathname.startsWith("/admin");
  if (loaded && maintenance?.on && !isStaff && !exempt) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
        <div className="max-w-md w-full text-center text-white">
          <span className="mx-auto w-20 h-20 rounded-[1.75rem] bg-amber-400/15 ring-1 ring-amber-300/30 grid place-items-center animate-float">
            <Construction className="w-10 h-10 text-amber-300" />
          </span>
          <h1 className="font-head font-black text-3xl mt-6">الموقع في وضع الصيانة</h1>
          <p className="text-slate-300 leading-relaxed mt-3">
            {maintenance.message || "نطوّر المنصة الآن لتجربة أجمل · نعود إليكم قريباً جداً"}
          </p>
          <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-black text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" /> فريق المنصة والمشرفون يمكنهم الدخول من صفحة تسجيل الدخول
          </p>
          {!user && (
            <Link to="/login" className="block mt-4 text-sm font-black text-amber-300 hover:text-amber-200">دخول الفريق</Link>
          )}
        </div>
      </div>
    );
  }
  return children;
}
