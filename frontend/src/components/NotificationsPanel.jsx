import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Check, Trophy, BookOpen, Users, Calendar, MessageSquare, Sparkles,
  Heart, Star, ShieldCheck, Megaphone, X, Crown, Award, UserPlus, Newspaper,
  Target, Rocket, Info, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE } from "@/components/anim";

const TYPE_STYLE = {
  achievement: { icon: Trophy, bg: "bg-amber-100", fg: "text-amber-600" },
  certificate: { icon: Award, bg: "bg-yellow-100", fg: "text-yellow-600" },
  challenge: { icon: Target, bg: "bg-teal-100", fg: "text-teal-600" },
  circle_challenge_done: { icon: Target, bg: "bg-teal-100", fg: "text-teal-600" },
  book: { icon: BookOpen, bg: "bg-blue-100", fg: "text-blue-600" },
  club: { icon: Users, bg: "bg-emerald-100", fg: "text-emerald-600" },
  event: { icon: Calendar, bg: "bg-violet-100", fg: "text-violet-600" },
  discussion: { icon: MessageSquare, bg: "bg-sky-100", fg: "text-sky-600" },
  reply: { icon: MessagesSquare, bg: "bg-sky-100", fg: "text-sky-600" },
  follow: { icon: UserPlus, bg: "bg-cyan-100", fg: "text-cyan-600" },
  studio: { icon: Sparkles, bg: "bg-purple-100", fg: "text-purple-600" },
  like: { icon: Heart, bg: "bg-rose-100", fg: "text-rose-600" },
  review: { icon: Star, bg: "bg-yellow-100", fg: "text-yellow-600" },
  moderation: { icon: ShieldCheck, bg: "bg-orange-100", fg: "text-orange-600" },
  broadcast: { icon: Megaphone, bg: "bg-indigo-100", fg: "text-indigo-600" },
  system: { icon: Info, bg: "bg-slate-200", fg: "text-slate-600" },
  chess: { icon: Crown, bg: "bg-stone-200", fg: "text-stone-600" },
  news: { icon: Newspaper, bg: "bg-sky-100", fg: "text-sky-600" },
  competition: { icon: Trophy, bg: "bg-amber-100", fg: "text-amber-600" },
  activity: { icon: Sparkles, bg: "bg-emerald-100", fg: "text-emerald-600" },
};
const FALLBACK = { icon: Bell, bg: "bg-slate-100", fg: "text-slate-500" };

function styleFor(type) {
  if (!type) return FALLBACK;
  if (TYPE_STYLE[type]) return TYPE_STYLE[type];
  if (String(type).startsWith("venture_")) return { icon: Rocket, bg: "bg-orange-100", fg: "text-orange-600" };
  return FALLBACK;
}

/* Category filter · mapped onto the real notification types */
const ACHIEVEMENT_TYPES = new Set(["achievement", "certificate", "challenge", "circle_challenge_done"]);
const SYSTEM_TYPES = new Set(["system", "moderation", "broadcast"]);
function categoryOf(type) {
  if (ACHIEVEMENT_TYPES.has(type)) return "achievements";
  if (SYSTEM_TYPES.has(type)) return "system";
  return "interaction";
}
const CATEGORY_CHIPS = [
  { v: "all", l: "الكل" },
  { v: "interaction", l: "تفاعل" },
  { v: "achievements", l: "إنجازات" },
  { v: "system", l: "نظام" },
];

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  if (s < 86400 * 7) return `منذ ${Math.floor(s / 86400)} يوم`;
  return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "short" });
}

export function NotificationsPanel({ onClose }) {
  const [items, setItems] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    try { const { data } = await api.get("/notifications"); setItems(data); } catch { setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const openItem = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.link) { nav(n.link); onClose?.(); }
    else load();
  };

  const unread = (items || []).filter((n) => !n.read).length;

  // The panel is rendered inside <header class="glass"> (backdrop-filter).
  // backdrop-filter makes the header a containing block for position:fixed
  // descendants, so the overlay + mobile sheet must be portaled to
  // document.body to position against the real viewport.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <>
      {/* desktop dropdown · absolute, so it stays anchored to the bell */}
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="hidden sm:block absolute left-0 mt-3 w-[400px] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden"
        data-testid="notifications-panel"
      >
        <PanelBody items={items} unread={unread} markAll={markAll} openItem={openItem} onClose={onClose} />
      </motion.div>
      {createPortal(
        <>
          {/* overlay · z-40 sits below the header (z-50) so the desktop dropdown
              stays clickable, and below the mobile sheet (z-[100]) */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose}
          />
          {/* mobile bottom sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="sm:hidden fixed inset-x-0 bottom-0 z-[100] bg-white rounded-t-[28px] shadow-2xl border-t border-slate-200 max-h-[82dvh] flex flex-col"
            data-testid="notifications-panel"
          >
            <div className="pt-2.5 pb-1 grid place-items-center shrink-0" onClick={onClose}>
              <div className="w-11 h-1.5 rounded-full bg-slate-300" />
            </div>
            <PanelBody items={items} unread={unread} markAll={markAll} openItem={openItem} onClose={onClose} sheet />
          </motion.div>
        </>,
        document.body
      )}
    </>
  );
}

function PanelBody({ items, unread, markAll, openItem, onClose, sheet }) {
  const [cat, setCat] = useState("all");
  const counts = { all: 0, interaction: 0, achievements: 0, system: 0 };
  (items || []).forEach((n) => { counts.all++; counts[categoryOf(n.type)]++; });
  const visible = cat === "all" ? items : (items || []).filter((n) => categoryOf(n.type) === cat);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white shrink-0">
        <span className="font-extrabold font-head flex items-center gap-2 text-slate-900">
          <span className="w-8 h-8 rounded-xl bg-slate-900 text-white grid place-items-center"><Bell className="w-4 h-4" /></span>
          الإشعارات
          {unread > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="min-w-6 h-6 px-1.5 rounded-full bg-rose-500 text-white text-xs grid place-items-center font-bold">
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <Button variant="ghost" size="sm" data-testid="mark-all-read-btn" onClick={markAll} className="text-xs text-blue-600 rounded-xl">
              <Check className="w-3.5 h-3.5 ml-1" />تحديد الكل كمقروء
            </Button>
          )}
          {sheet && (
            <button onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full bg-slate-100 grid place-items-center text-slate-500"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>
      {items !== null && items.length > 0 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-1 shrink-0" data-testid="notif-category-chips">
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.v}
              data-testid={`notif-cat-${c.v}`}
              onClick={() => setCat(c.v)}
              className={`pressable min-h-[34px] rounded-full px-3.5 text-xs font-bold transition-all ${cat === c.v ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {c.l}
              <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${cat === c.v ? "bg-white/20 text-white" : "bg-white text-slate-400"}`}>{counts[c.v]}</span>
            </button>
          ))}
        </div>
      )}
      <div className={`${sheet ? "flex-1 overflow-y-auto" : "max-h-[440px] overflow-y-auto"}`}>
        {items === null ? (
          <div className="p-8 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3 rounded bg-slate-100 w-3/4" /><div className="h-2.5 rounded bg-slate-100 w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
              className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 grid place-items-center text-slate-400 mb-3"
            >
              <Bell className="w-8 h-8" />
            </motion.div>
            <div className="font-bold text-slate-700">كل شيء هادئ هنا 🔕</div>
            <div className="text-xs text-slate-400 mt-1">ستصلك إشعارات الأنشطة والفعاليات هنا</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 grid place-items-center text-slate-400 mb-3">
              <Bell className="w-7 h-7" />
            </div>
            <div className="font-bold text-slate-700">لا إشعارات في هذا التصنيف</div>
            <div className="text-xs text-slate-400 mt-1">جرّب تصنيفاً آخر أو عد لاحقاً</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((n, i) => {
              const st = styleFor(n.type);
              const Icon = st.icon;
              const isAch = ACHIEVEMENT_TYPES.has(n.type);
              const read = n.read;
              if (isAch) {
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
                    onClick={() => openItem(n)}
                    className={`group relative w-full text-right mx-3 my-2 rounded-[1.4rem] overflow-hidden transition-transform hover:scale-[1.012] active:scale-[0.99] ${read ? "opacity-90" : ""}`}
                    style={{ width: "calc(100% - 1.5rem)" }}
                  >
                    {/* aurora glass backdrop: warm, no blue anywhere */}
                    <span className="absolute inset-0 bg-gradient-to-l from-amber-300/50 via-rose-300/35 to-violet-300/45" />
                    <span className="absolute -top-10 -left-6 w-36 h-36 rounded-full bg-amber-300/50 blur-2xl" />
                    <span className="absolute -bottom-12 right-10 w-36 h-36 rounded-full bg-violet-300/45 blur-2xl" />
                    <span className="absolute inset-0 backdrop-blur-xl bg-white/45" />
                    <span className="absolute inset-0 ring-1 ring-inset ring-white/60 rounded-[1.4rem]" />
                    <span className="absolute top-0 right-6 left-6 h-px bg-gradient-to-l from-transparent via-white/90 to-transparent" />
                    <span className="relative flex gap-3 sm:gap-3.5 px-4 sm:px-5 py-4">
                      <span className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl grid place-items-center shrink-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/50 group-hover:rotate-6 group-hover:scale-105 transition-transform">
                        <Icon className="w-5.5 h-5.5 sm:w-6 sm:h-6" style={{ width: 22, height: 22 }} />
                        {!read && <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-head font-black text-[13.5px] sm:text-sm text-slate-900 leading-snug">{n.title}</span>
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/60 ring-1 ring-white/70 text-[9.5px] font-black text-amber-700 backdrop-blur">إنجاز 🏆</span>
                        </span>
                        {n.body && <span className="block text-[11.5px] sm:text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed font-medium">{n.body}</span>}
                        <span className="block text-[10.5px] text-slate-500/90 mt-1.5 font-semibold">{timeAgo(n.created_at)}{!read && " · جديد ✨"}</span>
                      </span>
                    </span>
                  </motion.button>
                );
              }
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
                  onClick={() => openItem(n)}
                  className={`w-full text-right px-4 sm:px-5 py-3.5 border-b border-slate-50 flex gap-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 ${!n.read ? "bg-amber-50/70" : ""}`}
                >
                  <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${st.bg} ${st.fg}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800 leading-snug">{n.title}</span>
                      {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1.5 animate-pulse" />}
                    </span>
                    {n.body && <span className="block text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.body}</span>}
                    <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</span>
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
