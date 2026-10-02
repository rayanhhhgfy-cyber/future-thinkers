import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Search, Menu, X, LogOut, User, LayoutDashboard, Shield, Settings,
  BookOpen, Sparkles, Users, Calendar, Trophy, Newspaper, Rocket, Crown,
  Gamepad2, Flame, ChevronLeft, Route as RouteIcon, MessagesSquare, CalendarDays, Target, Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { wsUrl } from "@/lib/api";
import { toast } from "sonner";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { GlobalSearch } from "@/components/GlobalSearch";

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
];

export function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [gam, setGam] = useState(null);

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

  // lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // gamification snapshot for the drawer user card
  useEffect(() => {
    if (open && user) api.get("/gamification/me").then((r) => setGam(r.data)).catch(() => {});
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
            toast(d.title, {
              description: d.body,
              ...(d.link ? { action: { label: "عرض", onClick: () => nav(d.link) } } : {}),
            });
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, [user, nav]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/70 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link to="/" data-testid="nav-home-link"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-1">
            {DISCOVER_LINKS.map((l) => (
              <Link key={l.to} to={l.to} data-testid={`nav-${l.to.slice(1)}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc.pathname.startsWith(l.to) ? "text-emerald-700 bg-emerald-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" data-testid="open-search-btn" onClick={() => setSearchOpen(true)} className="rounded-xl">
            <Search className="w-5 h-5" />
          </Button>

          {user ? (
            <>
              <div className="relative">
                <Button variant="ghost" size="icon" data-testid="notifications-btn" onClick={() => setNotifOpen((v) => !v)} className="rounded-xl relative">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">{unread}</span>}
                </Button>
                {notifOpen && <NotificationsPanel onClose={() => { setNotifOpen(false); loadUnread(); }} />}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-btn" className="flex items-center gap-2 pr-1 pl-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-blue-600 text-white text-xs">{user.name?.[0] || "؟"}</AvatarFallback></Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.level_title} · مستوى {user.level}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-dashboard" onClick={() => nav("/dashboard")}><LayoutDashboard className="w-4 h-4 ml-2" />لوحتي</DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => nav(`/profile/${user.id}`)}><User className="w-4 h-4 ml-2" />ملفي الشخصي</DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-settings" onClick={() => nav("/settings")}><Settings className="w-4 h-4 ml-2" />إعدادات الحساب</DropdownMenuItem>
                  {isStaff && <DropdownMenuItem data-testid="menu-admin" onClick={() => nav("/admin")}><Shield className="w-4 h-4 ml-2" />لوحة الإدارة</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-logout" onClick={async () => { await logout(); nav("/"); }} className="text-rose-600"><LogOut className="w-4 h-4 ml-2" />تسجيل الخروج</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" data-testid="nav-login-btn" onClick={() => nav("/login")} className="rounded-xl">دخول</Button>
              <Button data-testid="nav-register-btn" onClick={() => nav("/register")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">انضم الآن</Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" data-testid="mobile-menu-btn" onClick={() => setOpen((v) => !v)}>
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
  );
}

/* ------------------------------------------------------------------ */
/* MobileDrawer — reimagined hamburger: full-screen slide-in command    */
/* center with user card, quick actions, grouped nav and animations.   */
/* ------------------------------------------------------------------ */
function MobileDrawer({ open, onClose, user, gam, isStaff, pathname, nav, logout }) {
  const quick = [
    { to: "/dashboard", label: "لوحتي", icon: LayoutDashboard, grad: "from-emerald-500 to-teal-600" },
    { to: user ? `/profile/${user.id}` : "/login", label: "ملفي", icon: User, grad: "from-blue-500 to-indigo-600" },
    { to: "/points", label: "نقاطي", icon: Sparkles, grad: "from-amber-500 to-orange-600" },
    { to: "/settings", label: "الإعدادات", icon: Settings, grad: "from-slate-500 to-slate-700" },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="mnav" className="lg:hidden" initial={false}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 33 }}
            className="fixed top-0 bottom-0 right-0 z-[95] w-[88vw] max-w-[380px] bg-white rounded-l-[28px] shadow-2xl flex flex-col overflow-hidden"
            data-testid="mobile-drawer"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <Logo />
              <button onClick={onClose} aria-label="إغلاق"
                className="w-10 h-10 rounded-2xl bg-slate-100 grid place-items-center text-slate-600 active:scale-90 transition-transform">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
              {user ? (
                /* user card */
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, duration: 0.35, ease: EASE }}
                  className="rounded-3xl p-5 text-white bg-gradient-to-bl from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden"
                >
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
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${gam?.level_progress ?? 0}%` }}
                        transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
                        className="h-full rounded-full bg-gradient-to-l from-amber-300 to-yellow-400"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* guest card */
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, duration: 0.35, ease: EASE }}
                  className="rounded-3xl p-5 text-white bg-gradient-to-bl from-slate-900 via-slate-800 to-slate-700 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-emerald-500/20" />
                  <div className="relative font-extrabold text-lg">أهلاً بك في مفكري المستقبل 👋</div>
                  <p className="relative text-sm text-slate-300 mt-1">انضم لآلاف الطلاب: اقرأ، العب، ابنِ مشاريع واصعد الصدارة.</p>
                  <div className="relative flex gap-2 mt-4">
                    <Button className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600" onClick={() => nav("/register")}>انضم الآن</Button>
                    <Button variant="outline" className="flex-1 rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => nav("/login")}>دخول</Button>
                  </div>
                </motion.div>
              )}

              {/* quick actions */}
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 px-1">وصول سريع</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {quick.map((q, i) => (
                    <motion.button
                      key={q.label}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.3, ease: EASE }}
                      onClick={() => nav(q.to)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 active:scale-95 transition-transform text-right"
                    >
                      <span className={`w-9 h-9 rounded-xl grid place-items-center text-white bg-gradient-to-br ${q.grad} shrink-0`}>
                        <q.icon className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-bold text-slate-700">{q.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* discover */}
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 px-1">اكتشف</div>
                <div className="space-y-1">
                  {DISCOVER_LINKS.map((l, i) => {
                    const active = pathname === l.to || pathname.startsWith(l.to + "/");
                    return (
                      <motion.div
                        key={l.to}
                        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.14 + i * 0.04, duration: 0.3, ease: EASE }}
                      >
                        <Link
                          to={l.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition active:scale-[0.98] ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                        >
                          <span className={`w-10 h-10 rounded-2xl grid place-items-center ${l.tint} shrink-0`}><l.icon className="w-5 h-5" /></span>
                          <span className={`font-bold text-[15px] ${active ? "text-emerald-700" : "text-slate-700"}`}>{l.label}</span>
                          <ChevronLeft className="w-4 h-4 text-slate-300 mr-auto" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* play */}
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2 px-1">العب</div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3, ease: EASE }}
                >
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
                </motion.div>
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
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
