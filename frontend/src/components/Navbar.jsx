import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSiteConfig, sectionOfPath } from "@/lib/siteConfig";
import {
  Bell, Search, Menu, X, LogOut, User, LayoutDashboard, Shield, Settings,
  BookOpen, Sparkles, Users, Calendar, Trophy, Newspaper, Rocket, Crown,
  Gamepad2, Flame, ChevronLeft, ChevronDown, Puzzle, BarChart3, Route as RouteIcon, MessagesSquare, CalendarDays, Target, Timer, Award,
  Mail, HelpCircle, Zap, Bookmark,
  Layers, HeartHandshake, Radio, BookMarked, ArrowLeftRight, Wand2,
  Swords, Compass, GitBranch,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { wsUrl } from "@/lib/api";
import { toast } from "sonner";
import AchievementToast from "@/components/AchievementToast";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ShareButton } from "@/components/ShellExtras";

const DISCOVER_LINKS = [
  { to: "/library", label: "المكتبة", icon: BookOpen, tint: "bg-blue-100 text-blue-600" },
  { to: "/studio", label: "الاستوديو", icon: Sparkles, tint: "bg-purple-100 text-purple-600" },
  { to: "/clubs", label: "الأندية", icon: Users, tint: "bg-emerald-100 text-emerald-600" },
  { to: "/ventures", label: "المشاريع", icon: Rocket, tint: "bg-orange-100 text-orange-600" },
  { to: "/events", label: "الفعاليات", icon: Calendar, tint: "bg-violet-100 text-violet-600" },
  { to: "/competitions", label: "المسابقات", icon: Trophy, tint: "bg-amber-100 text-amber-600" },
  { to: "/leaderboard", label: "المتصدرون", icon: Crown, tint: "bg-yellow-100 text-yellow-600" },
  { to: "/news", label: "الأخبار", icon: Newspaper, tint: "bg-sky-100 text-sky-600" },
  { to: "/paths", label: "مسارات التعلم", icon: RouteIcon, tint: "bg-emerald-100 text-emerald-700" },
  { to: "/community", label: "ساحة المجتمع", icon: MessagesSquare, tint: "bg-rose-100 text-rose-600" },
  { to: "/calendar", label: "التقويم", icon: CalendarDays, tint: "bg-indigo-100 text-indigo-600" },
  { to: "/reading-challenges", label: "تحديات القراءة", icon: Target, tint: "bg-teal-100 text-teal-600" },
  { to: "/focus", label: "غرف التركيز", icon: Timer, tint: "bg-slate-200 text-slate-700" },
  { to: "/messages", label: "الرسائل", icon: Mail, tint: "bg-cyan-100 text-cyan-600" },
  { to: "/flashcards", label: "بطاقات المراجعة", icon: Layers, tint: "bg-violet-100 text-violet-600" },
  { to: "/buddies", label: "رفيق القراءة", icon: HeartHandshake, tint: "bg-rose-100 text-rose-600" },
  { to: "/live-sessions", label: "جلسات مباشرة", icon: Radio, tint: "bg-red-100 text-red-600" },
  { to: "/mini-books", label: "كتيّبات الطلاب", icon: BookMarked, tint: "bg-fuchsia-100 text-fuchsia-600" },
  { to: "/swap", label: "تبادل الكتب", icon: ArrowLeftRight, tint: "bg-teal-100 text-teal-600" },
  { to: "/games", label: "ساحة الألعاب", icon: Gamepad2, tint: "bg-orange-100 text-orange-600" },
  { to: "/stories", label: "قصص اختر مغامرتك", icon: GitBranch, tint: "bg-violet-100 text-violet-600" },
  { to: "/wrapped", label: "ملخص رحلتي", icon: Wand2, tint: "bg-amber-100 text-amber-600" },
];

const MORE_GROUPS = [
  { title: "التنافس والنقاط", items: [
    { to: "/leaderboard", label: "المتصدرون", icon: Crown, tint: "bg-yellow-100 text-yellow-600" },
    { to: "/quiz-live", label: "مسابقات حية", icon: Zap, tint: "bg-orange-100 text-orange-600" },
    { to: "/season-cup", label: "كأس المدارس", icon: Trophy, tint: "bg-amber-100 text-amber-600" },
    { to: "/points", label: "نقاطي وإنجازاتي", icon: Sparkles, tint: "bg-amber-100 text-amber-600" },
    { to: "/chess/puzzle", label: "لغز اليوم", icon: Puzzle, tint: "bg-orange-100 text-orange-600" },
  ]},
  { title: "التعلم والنمو", items: [
    { to: "/paths", label: "مسارات التعلم", icon: RouteIcon, tint: "bg-emerald-100 text-emerald-700" },
    { to: "/flashcards", label: "بطاقات المراجعة", icon: Layers, tint: "bg-violet-100 text-violet-600" },
    { to: "/games", label: "ساحة الألعاب", icon: Gamepad2, tint: "bg-orange-100 text-orange-600" },
    { to: "/games/challenges", label: "تحدي صديق", icon: Swords, tint: "bg-orange-100 text-orange-600" },
    { to: "/games/missions", label: "مهمات الأسبوع", icon: Compass, tint: "bg-teal-100 text-teal-600" },
    { to: "/stories", label: "قصص اختر مغامرتك", icon: GitBranch, tint: "bg-violet-100 text-violet-600" },
    { to: "/buddies", label: "رفيق القراءة", icon: HeartHandshake, tint: "bg-rose-100 text-rose-600" },
    { to: "/live-sessions", label: "جلسات مباشرة", icon: Radio, tint: "bg-red-100 text-red-600" },
    { to: "/wrapped", label: "ملخص رحلتي", icon: Wand2, tint: "bg-amber-100 text-amber-600" },
    { to: "/circles", label: "دوائر الدراسة", icon: Users, tint: "bg-teal-100 text-teal-600" },
    { to: "/help", label: "أسئلة وأجوبة", icon: HelpCircle, tint: "bg-sky-100 text-sky-600" },
    { to: "/reading-challenges", label: "تحديات القراءة", icon: Target, tint: "bg-teal-100 text-teal-600" },
    { to: "/focus", label: "غرف التركيز", icon: Timer, tint: "bg-slate-200 text-slate-700" },
    { to: "/stats", label: "إحصائياتي", icon: BarChart3, tint: "bg-blue-100 text-blue-600" },
    { to: "/class-report", label: "تقرير المدرسة", icon: BarChart3, tint: "bg-indigo-100 text-indigo-600" },
  ]},
  { title: "المجتمع", items: [
    { to: "/community", label: "ساحة المجتمع", icon: MessagesSquare, tint: "bg-rose-100 text-rose-600" },
    { to: "/mini-books", label: "كتيّبات الطلاب", icon: BookMarked, tint: "bg-fuchsia-100 text-fuchsia-600" },
    { to: "/swap", label: "تبادل الكتب", icon: ArrowLeftRight, tint: "bg-teal-100 text-teal-600" },
    { to: "/messages", label: "رسائل خاصة", icon: Mail, tint: "bg-cyan-100 text-cyan-600" },
    { to: "/members", label: "الأعضاء", icon: Users, tint: "bg-emerald-100 text-emerald-600" },
    { to: "/news", label: "الأخبار", icon: Newspaper, tint: "bg-sky-100 text-sky-600" },
    { to: "/calendar", label: "التقويم", icon: CalendarDays, tint: "bg-indigo-100 text-indigo-600" },
    { to: "/certificates-wall", label: "جدار الشهادات", icon: Award, tint: "bg-amber-100 text-amber-600" },
  ]},
];

function useNavLinks() {
  const { toggles } = useSiteConfig();
  return useMemo(() => {
    const navVisible = (l) => {
      const sec = sectionOfPath(l.to);
      return !sec || toggles[sec] !== false;
    };
    const discover = DISCOVER_LINKS.filter(navVisible);
    const groups = MORE_GROUPS
      .map((g) => ({ ...g, items: g.items.filter(navVisible) }))
      .filter((g) => g.items.length > 0);
    return { discover, primary: discover.slice(0, 6), groups };
  }, [toggles]);
}

export function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const { primary: NAV_PRIMARY, groups: NAV_GROUPS } = useNavLinks();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [gam, setGam] = useState(null);
  const [achToasts, setAchToasts] = useState([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // desktop nav links: mouse wheel scrolls the link row horizontally
  const navScrollRef = useRef(null);
  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += (getComputedStyle(el).direction === "rtl" ? -1 : 1) * e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const loadUnread = useCallback(async () => {
    if (!user) return;
    try { const { data } = await api.get("/notifications/unread-count"); setUnread(data.count); } catch {}
  }, [user]);

  useEffect(() => { loadUnread(); const t = setInterval(loadUnread, 20000); return () => clearInterval(t); }, [loadUnread, loc.pathname]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // private-message unread count for the mobile tab bar
  useEffect(() => {
    if (!user) { setDmUnread(0); return undefined; }
    let alive = true;
    const fetchDm = async () => {
      try { const { data } = await api.get("/dm/unread-count"); if (alive) setDmUnread(data?.count || 0); } catch {}
    };
    fetchDm();
    const t = setInterval(fetchDm, 25000);
    return () => { alive = false; clearInterval(t); };
  }, [user, loc.pathname]);

  // lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // gamification snapshot for the drawer user card + desktop user chip
  useEffect(() => {
    if (user) api.get("/gamification/me").then((r) => setGam(r.data)).catch(() => {});
  }, [open, user]);

  // real-time notifications via WebSocket (polling above stays as fallback)
  useEffect(() => {
    if (!user) return;
    let ws;
    try {
      ws = new WebSocket(wsUrl("/api/ws/notifications"));
      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.kind === "notification") {
            setUnread((n) => n + 1);
            const ACH = ["achievement", "certificate", "challenge", "circle_challenge_done", "competition"];
            const isAch = ACH.includes(d.type) || /وسام|شهادة|إنجاز|🏆|تحدّ|بطول/.test(d.title || "");
            if (isAch) {
              const aid = `ach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              setAchToasts((prev) => [...prev.slice(-1), { id: aid, title: d.title, body: d.body, link: d.link }]);
              setTimeout(() => setAchToasts((prev) => prev.filter((x) => x.id !== aid)), 7000);
            } else {
              toast(d.title, {
                description: d.body,
                ...(d.link ? { action: { label: "عرض", onClick: () => nav(d.link) } } : {}),
              });
            }
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, [user, nav]);

  // on /admin: keep the full user header, hide ONLY the bottom mobile tab bar (admin has its own bottom bar)
  const inAdmin = loc.pathname.startsWith("/admin");

  return (
  <>
    {/* achievement glass toasts: fixed bottom-center, wide, warm glass */}
    <div dir="rtl" className="fixed inset-x-0 bottom-[84px] xl:bottom-6 z-[95] flex flex-col items-center gap-2 px-2.5 pointer-events-none">
      <AnimatePresence>
        {achToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 48, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="pointer-events-auto w-full max-w-[700px]"
          >
            <AchievementToast
              title={t.title}
              body={t.body}
              link={t.link}
              onView={() => { setAchToasts((prev) => prev.filter((x) => x.id !== t.id)); if (t.link) nav(t.link); }}
              onDismiss={() => setAchToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>

    {/* ============ premium glass header ============ */}
    <header className="sticky top-0 z-50 px-3 sm:px-5 lg:px-8 pt-[max(0.6rem,env(safe-area-inset-top))]">
      <div className={`max-w-[1440px] mx-auto rounded-[20px] border backdrop-blur-2xl transition-all duration-300 px-3.5 sm:px-5 h-16 lg:h-[70px] flex items-center justify-between gap-3 ${
        scrolled
          ? "bg-white/85 border-white/70 shadow-[0_20px_55px_-18px_rgba(6,78,59,0.38)]"
          : "bg-white/65 border-white/50 shadow-[0_10px_34px_-14px_rgba(15,23,42,0.25)]"
      }`}>
        <div className="flex items-center gap-6 xl:gap-8 min-w-0">
          <Link to="/" data-testid="nav-home-link" className="shrink-0 transition-transform duration-200 hover:scale-[1.04] active:scale-95"><Logo /></Link>

          {/* ---- desktop nav (xl+) · CSS-only micro-interactions ---- */}
          <nav className="hidden xl:flex items-center gap-1 min-w-0" aria-label="التنقل الرئيسي">
            <div ref={navScrollRef} className="nav-scroll flex items-center gap-1 overflow-x-auto min-w-0 py-1">
              {NAV_PRIMARY.map((l) => {
                const active = loc.pathname.startsWith(l.to);
                const Icon = l.icon;
                return (
                  <Link key={l.to} to={l.to} data-testid={`nav-${l.to.slice(1)}`}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-extrabold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                      active
                        ? "text-white shadow-[0_12px_26px_-10px_rgba(16,185,129,0.75)]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.05]"
                    }`}>
                    {active && <span className="absolute inset-0 rounded-full bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-500" aria-hidden />}
                    {active && <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" aria-hidden />}
                    <span className={`relative w-7 h-7 rounded-full grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 ${
                      active ? "bg-white/20 text-white" : l.tint
                    }`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="relative">{l.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* ---- استكشف · mega menu ---- */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="nav-more-btn"
                  className="group flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-extrabold text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.05] transition-all duration-200 active:scale-95 data-[state=open]:text-slate-900 data-[state=open]:bg-slate-900/[0.06]">
                  <span className="w-7 h-7 rounded-full grid place-items-center bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  استكشف
                  <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={14}
                className="w-[46rem] max-w-[94vw] p-5 rounded-[26px] bg-white/95 backdrop-blur-2xl border border-white/70 shadow-[0_36px_90px_-24px_rgba(15,23,42,0.4)]">
                <div className="grid grid-cols-3 gap-5">
                  {NAV_GROUPS.map((g) => (
                    <div key={g.title} className="min-w-0">
                      <div className="flex items-center gap-2 px-2.5 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400" />
                        <div className="text-[11px] font-black tracking-wide text-slate-400">{g.title}</div>
                      </div>
                      <div className="space-y-0.5">
                        {g.items.map((l) => {
                          const Icon = l.icon;
                          const itemActive = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
                          return (
                            <DropdownMenuItem key={l.to} data-testid={`nav-more-${l.to.slice(1).replace(/\//g, "-")}`}
                              onClick={() => nav(l.to)}
                              className={`group/item flex items-center gap-3 rounded-2xl px-2.5 py-2.5 cursor-pointer transition-colors duration-150 ${
                                itemActive ? "bg-emerald-50" : "hover:bg-slate-50 focus:bg-slate-50"
                              }`}>
                              <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${l.tint} transition-transform duration-200 group-hover/item:scale-110 group-hover/item:-rotate-6 ${itemActive ? "ring-2 ring-emerald-300" : ""}`}>
                                <Icon className="w-5 h-5" />
                              </span>
                              <span className={`text-sm font-extrabold ${itemActive ? "text-emerald-700" : "text-slate-600 group-hover/item:text-slate-900"}`}>{l.label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between px-2.5">
                  <p className="text-xs font-bold text-slate-400">كل أقسام المنصة في مكان واحد</p>
                  <button onClick={() => nav("/dashboard")}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1">
                    لوحتي <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* ---- actions ---- */}
        <div className="flex items-center gap-2">
          {/* search pill (desktop) */}
          <button data-testid="open-search-pill" onClick={() => setSearchOpen(true)} aria-label="بحث سريع"
            className="group hidden h-11 w-60 items-center gap-2.5 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.07] ps-2 pe-2.5 text-slate-400 backdrop-blur transition-all duration-300 hover:w-72 hover:bg-white hover:border-emerald-200 hover:text-slate-500 hover:shadow-[0_14px_34px_-14px_rgba(16,185,129,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 xl:flex 2xl:w-72">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-[0_6px_14px_-4px_rgba(16,185,129,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Search className="w-4 h-4" />
            </span>
            <span className="flex-1 text-right text-sm font-bold">ابحث في المنصة…</span>
            <kbd className="hidden shrink-0 items-center rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-400 shadow-sm 2xl:inline-flex">
              Ctrl K
            </kbd>
          </button>
          {/* search button (mobile/tablet) */}
          <span className="xl:hidden">
            <Button aria-label="بحث" variant="ghost" size="icon" data-testid="open-search-btn" onClick={() => setSearchOpen(true)}
              className="h-10 w-10 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.07] text-slate-600 backdrop-blur transition hover:bg-white hover:text-emerald-700 hover:border-emerald-200 active:scale-90">
              <Search className="w-5 h-5" />
            </Button>
          </span>
          <ShareButton className="hidden sm:grid" />

          {user ? (
            <>
              {/* notifications */}
              <div className="relative">
                <Button variant="ghost" size="icon" data-testid="notifications-btn" aria-label="الإشعارات" onClick={() => setNotifOpen((v) => !v)}
                  className="relative h-11 w-11 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.07] text-slate-600 backdrop-blur transition-all hover:bg-white hover:text-slate-900 hover:border-slate-200 hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.35)] active:scale-90">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[10px] font-black grid place-items-center ring-2 ring-white shadow-md">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Button>
                {notifOpen && <NotificationsPanel onClose={() => { setNotifOpen(false); loadUnread(); }} />}
              </div>

              {/* user chip */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-btn"
                    className="group flex items-center gap-2.5 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.07] py-1 pe-1.5 ps-1.5 xl:pe-3 transition-all duration-200 hover:bg-white hover:border-slate-200 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.97]">
                    <Avatar className="w-9 h-9 ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-white shadow-md transition-transform duration-200 group-hover:scale-105">
                      <AvatarFallback className="ft-icon-tile text-white text-xs font-black">{user.name?.[0] || "؟"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden xl:block text-right leading-tight">
                      <span className="block text-[13px] font-extrabold text-slate-800 max-w-[120px] truncate">{user.name}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                        <span className="text-emerald-700">{user.level_title}</span> · مستوى {user.level}
                        {(gam?.streak || 0) > 0 && <span className="inline-flex items-center gap-0.5 text-orange-500"><Flame className="w-3 h-3" />{gam.streak}</span>}
                      </span>
                    </span>
                    <ChevronDown className="hidden xl:block w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="w-64 p-2 rounded-[20px] bg-white/95 backdrop-blur-2xl border border-white/70 shadow-[0_28px_70px_-20px_rgba(15,23,42,0.35)]">
                  <DropdownMenuLabel className="px-3 py-2.5">
                    <div className="font-extrabold text-slate-800">{user.name}</div>
                    <div className="text-xs text-slate-500 font-bold mt-0.5">
                      <span className="text-emerald-700">{user.level_title}</span> · مستوى {user.level}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem data-testid="menu-dashboard" onClick={() => nav("/dashboard")}
                    className="rounded-xl px-3 py-2.5 font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition-colors">
                    <LayoutDashboard className="w-4 h-4 ml-2 text-emerald-600" />لوحتي
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => nav(`/profile/${user.id}`)}
                    className="rounded-xl px-3 py-2.5 font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition-colors">
                    <User className="w-4 h-4 ml-2 text-blue-600" />ملفي الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-settings" onClick={() => nav("/settings")}
                    className="rounded-xl px-3 py-2.5 font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition-colors">
                    <Settings className="w-4 h-4 ml-2 text-slate-500" />إعدادات الحساب
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-saved" onClick={() => nav("/saved")}
                    className="rounded-xl px-3 py-2.5 font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition-colors">
                    <Bookmark className="w-4 h-4 ml-2 text-amber-500" />محفوظتي
                  </DropdownMenuItem>
                  {isStaff && <DropdownMenuItem data-testid="menu-admin" onClick={() => nav("/admin")}
                    className="rounded-xl px-3 py-2.5 font-bold text-violet-700 hover:bg-violet-50 cursor-pointer transition-colors">
                    <Shield className="w-4 h-4 ml-2 text-violet-600" />لوحة الإدارة
                  </DropdownMenuItem>}
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem data-testid="menu-logout" onClick={async () => { await logout(); nav("/"); }}
                    className="rounded-xl px-3 py-2.5 font-bold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors">
                    <LogOut className="w-4 h-4 ml-2" />تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" data-testid="nav-login-btn" onClick={() => nav("/login")}
                className="rounded-full font-extrabold px-5 h-11 text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.05] transition-all active:scale-95">دخول</Button>
              <Button data-testid="nav-register-btn" onClick={() => nav("/register")}
                className="rounded-full ft-btn-primary text-white font-extrabold px-6 h-11 shadow-[0_14px_30px_-10px_rgba(16,185,129,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-10px_rgba(16,185,129,0.85)] active:translate-y-0 active:scale-95">انضم الآن</Button>
            </div>
          )}
          <Button aria-label="القائمة" variant="ghost" size="icon" data-testid="mobile-menu-btn" onClick={() => setOpen((v) => !v)}
            className="xl:hidden h-10 w-10 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.07] text-slate-700 active:scale-90 transition">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        user={user}
        gam={gam}
        isStaff={isStaff}
        pathname={loc.pathname}
        nav={nav}
        logout={logout}
      />

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
    {!inAdmin && <MobileTabBar user={user} pathname={loc.pathname} dmUnread={dmUnread} onExplore={() => setOpen(true)} />}
  </>
  );
}

/* ------------------------------------------------------------------ */
/* MobileTabBar · app-style bottom navigation for phones: every major  */
/* section one thumb away, with a live private-message badge.          */
/* (unchanged — kept as-is per spec)                                   */
/* ------------------------------------------------------------------ */
function MobileTabBar({ user, pathname, dmUnread, onExplore }) {
  if (/^\/ventures\/.+/.test(pathname)) return null;
  const tabs = [
    { to: user ? "/dashboard" : "/", label: "الرئيسية", icon: LayoutDashboard },
    { to: "/library", label: "المكتبة", icon: BookOpen },
    { to: "/messages", label: "الرسائل", icon: Mail, badge: user ? dmUnread : 0 },
    { action: onExplore, label: "استكشف", icon: Sparkles },
    { to: user ? `/profile/${user.id}` : "/login", label: "حسابي", icon: User },
  ];
  return (
    <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} data-testid="mobile-tabbar">
      <div className="mx-3 mb-3 rounded-[26px] glass border border-white/60 ring-1 ring-slate-900/5 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.4)] px-2 py-1.5 grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.to && (pathname === t.to || (t.to !== "/" && pathname.startsWith(t.to + "/")));
          const Inner = (
            <>
              <span className={`relative w-11 h-8 grid place-items-center rounded-full transition-all ${active ? "ft-icon-tile text-white shadow-md scale-105" : "text-slate-500"}`}>
                <t.icon className="w-5 h-5" />
                {!!t.badge && (
                  <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black grid place-items-center ring-2 ring-white shadow">{t.badge > 99 ? "99+" : t.badge}</span>
                )}
              </span>
              <span className={`text-[10px] font-extrabold leading-none ${active ? "ft-text-accent" : "text-slate-500"}`}>{t.label}</span>
            </>
          );
          return t.action ? (
            <button key={t.label} onClick={t.action} className="pressable flex flex-col items-center gap-1 py-1.5 rounded-2xl active:bg-slate-100/70 min-h-[52px] justify-center">{Inner}</button>
          ) : (
            <Link key={t.label} to={t.to} className="pressable flex flex-col items-center gap-1 py-1.5 rounded-2xl active:bg-slate-100/70 min-h-[52px] justify-center">{Inner}</Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* MobileDrawer · lag-free command center.                             */
/* Zero framer-motion: pure CSS transitions only. The drawer itself    */
/* slides via translate-x (160ms), the overlay fades (150ms). Every    */
/* list item renders instantly — no stagger animations, no springs,    */
/* no exit animation blocking React Router navigation.                */
/* ------------------------------------------------------------------ */
function MobileDrawer({ open, onClose, user, gam, isStaff, pathname, nav, logout }) {
  const { discover: NAV_DISCOVER, groups: NAV_GROUPS } = useNavLinks();
  // mount/unmount choreography without AnimatePresence:
  //  - open: mount, then rAF → transition in
  //  - close: transition out (160ms), then unmount. Navigation never waits.
  const [render, setRender] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setRender(false), 170);
    return () => clearTimeout(t);
  }, [open]);

  const quick = [
    { to: "/dashboard", label: "لوحتي", icon: LayoutDashboard, grad: "from-emerald-500 to-teal-600" },
    { to: user ? `/profile/${user.id}` : "/login", label: "ملفي", icon: User, grad: "from-blue-500 to-indigo-600" },
    { to: "/points", label: "نقاطي", icon: Sparkles, grad: "from-amber-500 to-orange-600" },
    { to: "/settings", label: "الإعدادات", icon: Settings, grad: "from-slate-500 to-slate-700" },
  ];

  if (!render) return null;

  return createPortal(
    <div className="xl:hidden">
      {/* overlay · pure CSS fade */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm transition-opacity duration-150 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      {/* panel · pure CSS slide (no spring physics) */}
      <aside
        data-testid="mobile-drawer"
        className={`fixed top-0 bottom-0 right-0 z-[95] w-[88vw] max-w-[380px] bg-white rounded-l-[28px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-[160ms] ease-out will-change-transform ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <Logo />
          <div className="flex items-center gap-2">
            <ShareButton testId="share-page-drawer-btn" className="bg-slate-100 rounded-2xl" />
            <button onClick={onClose} aria-label="إغلاق"
              className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-slate-600 active:scale-90 transition-transform">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
          {user ? (
            /* user card · instant render, XP bar via CSS width transition */
            <div className="rounded-3xl p-5 text-white ft-hero-gradient relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 -right-6 w-44 h-44 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <Avatar className="w-14 h-14 border-2 border-white/40 shrink-0">
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">{user.name?.[0] || "؟"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-extrabold truncate">{user.name}</div>
                  <div className="text-xs text-white/80">{gam?.level_title || user.level_title} · مستوى {gam?.level || user.level}</div>
                </div>
                {(gam?.streak || 0) > 0 && (
                  <span className="mr-auto flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-1 text-xs font-bold shrink-0">
                    <Flame className="w-3.5 h-3.5 text-orange-300" />{gam.streak}
                  </span>
                )}
              </div>
              <div className="relative mt-4">
                <div className="flex justify-between text-[11px] text-white/85 mb-1.5">
                  <span>{(gam?.xp ?? 0).toLocaleString("en-US")} نقطة خبرة</span>
                  <span>باقٍ {(gam?.xp_to_next ?? 0).toLocaleString("en-US")} للمستوى التالي</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    style={{ width: shown ? `${gam?.level_progress ?? 0}%` : "0%" }}
                    className="h-full rounded-full bg-gradient-to-l from-amber-300 to-yellow-400 transition-[width] duration-700 ease-out"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* guest card · instant render */
            <div className="rounded-3xl p-5 text-white bg-gradient-to-bl from-slate-900 via-slate-800 to-slate-700 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10" />
              <div className="relative font-extrabold text-lg">أهلاً بك في مفكري المستقبل 👋</div>
              <p className="relative text-sm text-slate-300 mt-1">انضم لآلاف الطلاب: اقرأ، العب، ابنِ مشاريع واصعد الصدارة.</p>
              <div className="relative flex gap-2 mt-4">
                <Button className="flex-1 rounded-2xl ft-btn-solid" onClick={() => nav("/register")}>انضم الآن</Button>
                <Button variant="outline" className="flex-1 rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => nav("/login")}>دخول</Button>
              </div>
            </div>
          )}

          {/* quick actions · instant grid */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2 px-1">وصول سريع</div>
            <div className="grid grid-cols-2 gap-2.5">
              {quick.map((q) => (
                <button
                  key={q.label}
                  onClick={() => nav(q.to)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-right"
                >
                  <span className={`w-9 h-9 rounded-xl grid place-items-center text-white bg-gradient-to-br ${q.grad} shrink-0`}>
                    <q.icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-bold text-slate-700">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* discover · instant list (no stagger) */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2 px-1">اكتشف</div>
            <div className="space-y-1">
              {NAV_DISCOVER.map((l) => {
                const active = pathname === l.to || pathname.startsWith(l.to + "/");
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition active:scale-[0.98] ${active ? "ft-bg-soft" : "hover:bg-slate-50"}`}
                  >
                    <span className={`w-10 h-10 rounded-2xl grid place-items-center ${l.tint} shrink-0`}><l.icon className="w-5 h-5" /></span>
                    <span className={`font-bold text-[15px] ${active ? "ft-text-accent" : "text-slate-700"}`}>{l.label}</span>
                    <ChevronLeft className="w-4 h-4 text-slate-300 mr-auto" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* every section · grouped (mirrors the desktop explore menu) · instant grid */}
          {NAV_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-xs font-bold text-slate-400 mb-2 px-1">{g.title}</div>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((l) => {
                  const active = pathname === l.to || pathname.startsWith(l.to + "/");
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      className={`flex flex-col gap-2 p-3.5 rounded-3xl border active:scale-[0.97] transition ${active ? "ft-bg-soft ft-border-accent" : "bg-slate-50 border-slate-100 hover:bg-slate-100/70"}`}
                    >
                      <span className={`w-10 h-10 rounded-2xl grid place-items-center ${l.tint} shrink-0`}><l.icon className="w-5 h-5" /></span>
                      <span className={`font-bold text-[13px] leading-tight ${active ? "ft-text-accent" : "text-slate-700"}`}>{l.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* play */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2 px-1">العب</div>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-gradient-to-l from-slate-900 to-slate-800 text-white active:scale-[0.98] transition"
            >
              <span className="w-10 h-10 rounded-2xl grid place-items-center bg-white/10 shrink-0"><Gamepad2 className="w-5 h-5 text-amber-400" /></span>
              <span>
                <span className="font-bold text-[15px] block">ساحة الشطرنج</span>
                <span className="text-[11px] text-slate-400">العب مباريات وحسّن تصنيفك</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-500 mr-auto" />
            </Link>
          </div>

          {isStaff && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-600 active:scale-[0.98] transition"
            >
              <Shield className="w-5 h-5 text-violet-600" />
              <span className="font-bold text-sm">لوحة الإدارة</span>
            </Link>
          )}
        </div>

        {user && (
          <div className="p-5 pt-3 border-t border-slate-100 shrink-0 bg-white">
            <button
              onClick={async () => { await logout(); nav("/"); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 text-rose-600 font-bold active:scale-[0.98] transition"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
