import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/anim";
import api from "@/lib/api";

const DISMISSED_KEY = "ft-banners-dismissed";

function AnnouncementBar() {
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/announcements");
        let dismissed = [];
        try { dismissed = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]"); } catch {}
        setBanners((data.banners || []).filter((b) => !dismissed.includes(b.id)));
      } catch { /* silent · banner is non-critical */ }
    })();
  }, []);
  const dismiss = (id) => {
    setBanners((bs) => bs.filter((b) => b.id !== id));
    try {
      const d = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...d, id]));
    } catch {}
  };
  if (!banners.length) return null;
  return (
    <AnimatePresence initial={false}>
      {banners.map((b) => (
        <motion.div key={b.id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }} className="overflow-hidden">
          <div className="relative" style={{ background: b.bg || "#059669" }}>
            {b.link ? (
              <a href={b.link} className="block text-center text-white text-[13px] sm:text-sm font-bold py-2 px-10 hover:brightness-110 transition">{b.text}</a>
            ) : (
              <div className="text-center text-white text-[13px] sm:text-sm font-bold py-2 px-10">{b.text}</div>
            )}
            <button onClick={() => dismiss(b.id)} aria-label="إغلاق الإعلان"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export function Layout({ children, noFooter }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <div className="min-h-screen flex flex-col pb-[86px] lg:pb-0">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        {reduce ? children : (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            {children}
          </motion.div>
        )}
      </main>
      {!noFooter && <Footer />}
    </div>
  );
}

export function PageLoader() {
  return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

export function Protected({ children, staff, perm }) {
  const { user, ready, hasPerm, isStaff } = useAuth();
  if (!ready) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (staff && !isStaff) return <Navigate to="/dashboard" replace />;
  if (perm && !hasPerm(perm)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="text-center py-16 px-4" data-testid="empty-state">
      {Icon && <div className="w-16 h-16 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4"><Icon className="w-8 h-8 text-slate-400" /></div>}
      <h3 className="font-head font-bold text-lg text-slate-800">{title}</h3>
      {desc && <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
