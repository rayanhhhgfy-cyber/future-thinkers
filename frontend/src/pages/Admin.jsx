import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import AdminBooks from "@/components/admin/AdminBooks";
import AdminImporter from "@/components/admin/AdminImporter";
import AdminBadges from "@/components/admin/AdminBadges";
import AdminCertificates from "@/components/admin/AdminCertificates";
import AdminNews from "@/components/admin/AdminNews";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminLanding from "@/components/admin/AdminLanding";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminNotify from "@/components/admin/AdminNotify";
import AdminUser360 from "@/components/admin/AdminUser360";
import AdminExports from "@/components/admin/AdminExports";
import AdminEventsCompetitions from "@/components/admin/AdminEventsCompetitions";
import AdminCalendar from "@/components/admin/AdminCalendar";
import AdminCoding from "@/components/admin/AdminCoding";
import AdminPaths from "@/components/admin/AdminPaths";
import AdminClubs from "@/components/admin/AdminClubs";
import AdminTheme from "@/components/admin/AdminTheme";
import AdminReports from "@/components/admin/AdminReports";
import AdminErrors from "@/components/admin/AdminErrors";
import AdminGamesRadar from "@/components/admin/AdminGamesRadar";
import AdminControl from "@/components/admin/AdminControl";
import AdminHealth from "@/components/admin/AdminHealth";
import AdminPoints from "@/components/admin/AdminPoints";
import AdminAudit from "@/components/admin/AdminAudit";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { Gamepad2, LayoutDashboard, ShieldCheck, Users, BookOpen, Calendar, Trophy, Newspaper, Settings, ScrollText, Plus, Check, X, Megaphone, PenLine, Medal, Award, Upload, Trash2, Search, MessageSquare, MessagesSquare, Activity, Smartphone, UserPlus, FileCheck, Rocket, Zap, ArrowLeft, Star, Heart, ThumbsUp, Flag, CalendarCheck, Crown, Download, UserSearch, Link2, CalendarDays, Code2, FlaskConical, Terminal, Palette, Globe2, Route as RouteIcon, Bug, Copy, LayoutGrid, ChevronLeft, SlidersHorizontal, CloudDownload } from "lucide-react";
import { THEME_PRESETS, applyTheme } from "@/lib/theme";
import { timeAgo } from "@/components/NotificationsPanel";
import { motion, AnimatePresence } from "framer-motion";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { AnalyticsV2 } from "@/pages/AdminExtra";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminReviewDesk from "@/components/admin/AdminReviewDesk";
import AdminStudioReview from "@/components/admin/AdminStudioReview";
import { startChunkedUpload, uploadChunks, completeChunkedUpload, fileToBase64, compressCoverImage, CHUNK_THRESHOLD, MAX_PDF_SIZE } from "@/lib/chunkedUpload";

const NAV = [
  { k: "overview", l: "نظرة عامة", icon: LayoutDashboard, perm: "analytics.view" },
  { k: "moderation", l: "مراجعة المحتوى", icon: ShieldCheck, perm: "book.approve" },
  { k: "studio", l: "مراجعة الاستوديو", icon: PenLine, perm: "studio.review" },
  { k: "books", l: "الكتب", icon: BookOpen, perm: ["book.edit", "book.delete"] },
  { k: "importer", l: "مستورد الكتب", icon: CloudDownload, perm: "book.edit" },
  { k: "badges", l: "شارات المهارات", icon: Medal, perm: "badge.award" },
  { k: "certificates", l: "الشهادات", icon: Award, perm: "certificate.manage" },
  { k: "users", l: "المستخدمون", icon: Users, perm: "user.view" },
  { k: "user360", l: "ملف المستخدم 360", icon: UserSearch, perm: "user.view" },
  { k: "notify", l: "الإشعارات", icon: Megaphone, perm: "notification.broadcast" },
  { k: "content", l: "الفعاليات والمسابقات", icon: Calendar, perm: "event.create" },
  { k: "news", l: "الأخبار", icon: Newspaper, perm: "news.manage" },
  { k: "banners", l: "لافتات الإعلانات", icon: Flag, perm: "cms.manage" },
  { k: "theme", l: "مظهر الموقع", icon: Palette, perm: "cms.manage" },
  { k: "reports", l: "الإبلاغات", icon: Flag, perm: "report.manage" },
  { k: "errors", l: "سجل الأخطاء", icon: Bug, perm: "report.manage" },
  { k: "healthsys", l: "صحة النظام", icon: Activity, perm: "analytics.view" },
  { k: "landing", l: "صفحة الهبوط", icon: Globe2, perm: "cms.manage" },
  { k: "calendar", l: "التقويم", icon: CalendarDays, perm: "analytics.view" },
  { k: "coding", l: "تحديات البرمجة", icon: Code2, perm: "coding.manage" },
  { k: "paths", l: "مسارات التعلم", icon: RouteIcon, perm: "cms.manage" },
  { k: "exports", l: "تصدير البيانات", icon: Download, perm: "user.view" },
  { k: "clubs", l: "الأندية", icon: Users, perm: ["club.create", "club.edit", "club.delete", "club.manage"] },
  { k: "points", l: "نظام النقاط", icon: Settings, perm: "points.manage" },
  { k: "audit", l: "سجل العمليات", icon: ScrollText, perm: "audit.view" },
  { k: "gamesradar", l: "رادار الألعاب", icon: Gamepad2, perm: "analytics.view" },
  { k: "control", l: "غرفة التحكم", icon: SlidersHorizontal, perm: "analytics.view" },
];
const COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];
const NAV_GROUPS = [
  { l: "الرئيسية", icon: LayoutDashboard, keys: ["overview"] },
  { l: "المراجعة والمحتوى", icon: ShieldCheck, keys: ["moderation", "studio", "books", "news", "banners", "landing"] },
  { l: "الأعضاء والمجتمع", icon: Users, keys: ["users", "user360", "clubs", "notify"] },
  { l: "البرامج والأنشطة", icon: Rocket, keys: ["content", "calendar", "coding", "paths", "badges", "certificates", "gamesradar", "control"] },
  { l: "النظام", icon: Settings, keys: ["theme", "points", "reports", "errors", "healthsys", "exports", "audit"] },
];

export default function Admin() {
  const { hasPerm, user } = useAuth();
  const nav = useNavigate();
  const params = useParams();
  const tabs = NAV.filter((n) => Array.isArray(n.perm) ? n.perm.some((p) => hasPerm(p)) : hasPerm(n.perm));
  const urlTab = (params["*"] || "").split("/")[0];
  const validUrlTab = tabs.some((t) => t.k === urlTab) ? urlTab : null;
  const [tab, setTab] = useState(validUrlTab || tabs[0]?.k || "overview");
  const [sheet, setSheet] = useState(false);
  const [pend, setPend] = useState(null);

  // deep-link support: /admin/studio opens the studio review tab (used by notifications)
  useEffect(() => {
    if (validUrlTab && validUrlTab !== tab) setTab(validUrlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validUrlTab]);

  // pending counts for nav badges (same endpoint the overview uses · defensive)
  useEffect(() => {
    api.get("/admin/overview").then((r) => setPend(r.data || {})).catch(() => setPend(null));
  }, [tab]);

  const goTab = (k) => { setTab(k); nav(`/admin/${k}`, { replace: true }); };

  const pendCount = (k) => {
    if (!pend) return 0;
    if (k === "moderation") return (pend.books_pending || 0) + (pend.activities_pending || 0);
    if (k === "studio") return pend.works_pending || 0;
    if (k === "users") return pend.teachers_pending || 0;
    if (k === "reports") return pend.reports_open || 0;
    return 0;
  };
  const PEND_KEYS = ["moderation", "studio", "users", "reports"];
  const MOBILE_KEYS = ["overview", "moderation", "studio", "users"];
  const totalPending = PEND_KEYS.reduce((s, k) => s + pendCount(k), 0);
  const firstPendingTab = PEND_KEYS.find((k) => pendCount(k) > 0 && tabs.some((t) => t.k === k));

  // ---- navigation v2: icon rail + flyout (md+) · quick switcher · mobile bar ----
  const [fly, setFly] = useState(null);
  const [sq, setSq] = useState("");
  const [sOpen, setSOpen] = useState(false);
  const [sIdx, setSIdx] = useState(0);
  const switchRef = useRef(null);
  const groupOf = (k) => NAV_GROUPS.find((g) => g.keys.includes(k));
  const activeGroup = groupOf(tab);
  const groupPending = (g) => g.keys.reduce((s, k) => s + pendCount(k), 0);
  const sqMatches = (sq.trim() ? tabs.filter((t) => t.l.includes(sq.trim())) : tabs).slice(0, 9);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        if (switchRef.current && switchRef.current.offsetParent !== null) { e.preventDefault(); switchRef.current.focus(); setSOpen(true); }
      }
      if (e.key === "Escape") { setFly(null); setSOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jumpSection = (k) => { goTab(k); setFly(null); setSOpen(false); setSq(""); };
  const activeTab = tabs.find((t) => t.k === tab);
  const ActiveIcon = activeTab?.icon;
  const groupedTabs = NAV_GROUPS.map((g) => ({ ...g, items: g.keys.map((k) => tabs.find((t) => t.k === k)).filter(Boolean) })).filter((g) => g.items.length);
  const ungroupedTabs = tabs.filter((t) => !NAV_GROUPS.some((g) => g.keys.includes(t.k)));

  return (
    <Layout noFooter>
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-24 pt-4 sm:px-5 md:pb-10 lg:px-8 lg:pt-7">
        {/* app bar · slim on mobile, command header with quick switcher on md+ */}
        <header className="relative z-30 mb-4 rounded-[22px] border border-slate-200/80 bg-white/95 px-4 py-3.5 text-slate-900 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:px-5 md:mb-6 md:rounded-[26px] md:px-6 md:py-5">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <div className="absolute -top-16 -start-16 h-44 w-44 rounded-full bg-emerald-100/70 blur-3xl" />
            <div className="absolute -bottom-20 -end-10 h-48 w-48 rounded-full bg-teal-100/60 blur-3xl" />
          </div>
          <div className="relative flex items-center gap-3 sm:gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-600/20 md:h-12 md:w-12">
              <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="font-head text-base font-extrabold leading-tight md:text-xl">لوحة الإدارة</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 md:text-xs">
                {ActiveIcon && <ActiveIcon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{activeGroup ? `${activeGroup.l} · ` : ""}{activeTab?.l || "…"}{user?.name ? ` · أهلاً ${user.name}` : ""}</span>
              </p>
            </div>
            {/* quick switcher · انتقل إلى قسم · md+ */}
            <div className="relative ms-auto hidden w-full max-w-xs shrink md:block lg:max-w-sm">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input ref={switchRef} value={sq} data-testid="admin-switcher"
                onChange={(e) => { setSq(e.target.value); setSOpen(true); setSIdx(0); }}
                onFocus={() => setSOpen(true)}
                onBlur={() => setTimeout(() => setSOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSIdx((i) => Math.min(i + 1, sqMatches.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setSIdx((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && sqMatches.length) { jumpSection(sqMatches[Math.min(sIdx, sqMatches.length - 1)].k); }
                }}
                placeholder="انتقل إلى قسم…"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pe-14 ps-10 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/25" />
              <kbd className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-500 ring-1 ring-slate-200">⌘K</kbd>
              <AnimatePresence>
                {sOpen && sqMatches.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }}
                    className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white p-1.5 text-slate-800 shadow-2xl ring-1 ring-slate-900/10">
                    {sqMatches.map((n, i) => (
                      <button key={n.k} type="button" onMouseDown={(e) => { e.preventDefault(); jumpSection(n.k); }} onMouseEnter={() => setSIdx(i)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition ${i === Math.min(sIdx, sqMatches.length - 1) ? "bg-gradient-to-l from-emerald-600 to-teal-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                        <n.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{n.l}</span>
                        <span className={`ms-auto text-[10px] font-bold ${i === Math.min(sIdx, sqMatches.length - 1) ? "text-white/70" : "text-slate-400"}`}>{groupOf(n.k)?.l || ""}</span>
                        {pendCount(n.k) > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">{pendCount(n.k) > 99 ? "+99" : pendCount(n.k)}</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {totalPending > 0 && firstPendingTab && (
              <button type="button" onClick={() => goTab(firstPendingTab)} data-testid="admin-shell-pending" className="ms-auto flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-3.5 py-2 text-[13px] font-extrabold text-amber-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-300 md:ms-0 md:px-4 md:text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-700 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-800" />
                </span>
                {totalPending} بانتظار إجراءك
              </button>
            )}
          </div>
        </header>


        <div className="grid items-start gap-4 md:grid-cols-[76px_minmax(0,1fr)] md:gap-6">
          {/* icon rail + flyout · md+ */}
          <div className="relative z-40 hidden md:block" onMouseLeave={() => setFly(null)}>
            <aside className="sticky top-6 flex max-h-[calc(100dvh-4rem)] flex-col items-center gap-1 self-start overflow-y-auto rounded-[26px] bg-white/95 px-2 py-3 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {groupedTabs.map((g) => {
                const GIcon = g.icon;
                const isActiveGroup = activeGroup?.l === g.l;
                const gp = groupPending(g);
                return (
                  <button key={g.l} type="button" aria-label={g.l} title={g.l}
                    onMouseEnter={() => setFly(g.l)}
                    onClick={() => setFly(fly === g.l ? null : g.l)}
                    className={`relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl transition-all duration-200 ${fly === g.l ? "bg-slate-100 text-slate-900 ring-1 ring-slate-300" : isActiveGroup ? "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <GIcon className="h-[22px] w-[22px]" />
                    {gp > 0 && <span className="absolute -end-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">{gp > 99 ? "+99" : gp}</span>}
                  </button>
                );
              })}
              {ungroupedTabs.length > 0 && (
                <>
                  <div className="my-1.5 h-px w-8 bg-slate-200" />
                  {ungroupedTabs.map((n) => (
                    <button key={n.k} type="button" title={n.l} data-testid={`admin-tab-${n.k}`} onClick={() => jumpSection(n.k)}
                      className={`relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl transition-all duration-200 ${tab === n.k ? "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"}`}>
                      <n.icon className="h-[22px] w-[22px]" />
                    </button>
                  ))}
                </>
              )}
              <div className="my-1.5 h-px w-8 bg-slate-200" />
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">فت</span>
            </aside>

            {/* flyout · sections of the hovered/selected group */}
            <AnimatePresence>
              {fly && groupedTabs.some((g) => g.l === fly) && (() => {
                const g = groupedTabs.find((x) => x.l === fly);
                const GIcon = g.icon;
                const gi = groupedTabs.findIndex((x) => x.l === fly);
                return (
                  <motion.div key={g.l} initial={{ opacity: 0, x: 10, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 10, scale: 0.98 }} transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ top: gi * 56 }}
                    className="absolute end-full top-0 z-50 me-3 w-[272px] rounded-[24px] border border-slate-100 bg-white/95 p-2.5 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl">
                    <div className="flex items-center gap-2 px-2.5 pb-2 pt-1.5">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30"><GIcon className="h-4 w-4" /></span>
                      <span className="font-head text-sm font-extrabold text-slate-900">{g.l}</span>
                      {groupPending(g) > 0 && <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">{groupPending(g) > 99 ? "+99" : groupPending(g)}</span>}
                    </div>
                    <div className="space-y-0.5">
                      {g.items.map((n) => {
                        const active = tab === n.k;
                        return (
                          <button key={n.k} data-testid={`admin-tab-${n.k}`} onClick={() => jumpSection(n.k)} className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all ${active ? "bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                            <n.icon className="h-[18px] w-[18px] shrink-0" />
                            <span className="truncate">{n.l}</span>
                            {pendCount(n.k) > 0 && <span className={`ms-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-extrabold ${active ? "bg-white text-emerald-700" : "bg-rose-500 text-white"}`}>{pendCount(n.k) > 99 ? "+99" : pendCount(n.k)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* content frame · breadcrumb + panel */}
          <div className="min-w-0" key={tab}>
            <div className="mb-4 hidden items-center gap-1.5 text-[13px] font-bold text-slate-400 md:flex" data-testid="admin-breadcrumb">
              <span>لوحة الإدارة</span>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
              <span>{activeGroup?.l || "الأقسام"}</span>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
              <span className="flex items-center gap-1.5 font-extrabold text-slate-800">{ActiveIcon && <ActiveIcon className="h-4 w-4 text-emerald-600" />}{activeTab?.l || ""}</span>
            </div>
            <div className="animate-fade-in">
            {tab === "overview" && <AdminOverview onJump={goTab} tabs={tabs} />}
            {tab === "moderation" && <AdminReviewDesk />}
            {tab === "studio" && <AdminStudioReview />}
            {tab === "books" && <AdminBooks />}
            {tab === "importer" && <AdminImporter />}
            {tab === "badges" && <AdminBadges />}
            {tab === "certificates" && <AdminCertificates />}
            {tab === "users" && <AdminUsers />}
            {tab === "user360" && <AdminUser360 />}
            {tab === "notify" && <AdminNotify />}
            {tab === "content" && <AdminEventsCompetitions />}
            {tab === "news" && <AdminNews />}
            {tab === "banners" && <AdminBanners />}
            {tab === "theme" && <AdminTheme />}
            {tab === "reports" && <AdminReports />}
            {tab === "errors" && <AdminErrors />}
            {tab === "healthsys" && <AdminHealth />}
            {tab === "landing" && <AdminLanding />}
            {tab === "calendar" && <AdminCalendar />}
            {tab === "coding" && <AdminCoding />}
            {tab === "paths" && <AdminPaths />}
            {tab === "exports" && <AdminExports />}
            {tab === "clubs" && <AdminClubs />}
            {tab === "points" && <AdminPoints />}
            {tab === "audit" && <AdminAudit />}
            {tab === "gamesradar" && <AdminGamesRadar />}
        {tab === "control" && <AdminControl />}
            </div>
          </div>
        </div>
      </div>

      {/* mobile bottom navigation · the global tab bar is hidden on /admin, so this docks at the real bottom */}
      <nav className="fixed inset-x-0 z-[60] md:hidden" style={{ bottom: "calc(10px + env(safe-area-inset-bottom))" }} data-testid="admin-mobile-bar">
        <div className="mx-3 flex items-stretch justify-around gap-1 rounded-[24px] bg-white/95 px-2 py-2 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur-xl">
          {MOBILE_KEYS.filter((k) => tabs.some((t) => t.k === k)).map((k) => {
            const n = tabs.find((t) => t.k === k);
            const active = tab === k;
            return (
              <button key={k} type="button" data-testid={`admin-tab-${k}`} onClick={() => goTab(k)}
                className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-all ${active ? "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30" : "text-slate-400 active:bg-slate-100"}`}>
                <n.icon className="h-5 w-5" />
                <span className="text-[10px] font-extrabold leading-none">{n.l}</span>
                {pendCount(k) > 0 && <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">{pendCount(k) > 99 ? "+99" : pendCount(k)}</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => setSheet(true)} data-testid="admin-all-sections-btn" aria-label="كل الأقسام"
            className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-slate-400 transition-all active:bg-slate-100">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px] font-extrabold leading-none">الأقسام</span>
            {totalPending > 0 && <span className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
        </div>
      </nav>

      {/* mobile: all-sections bottom sheet */}
      {sheet && createPortal(
        <div className="fixed inset-0 z-[95] md:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-9 ft-shadow">
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-slate-300" onClick={() => setSheet(false)} />
            <div className="mb-4 flex items-center justify-between">
              <span className="font-head text-base font-extrabold text-slate-900">كل أقسام الإدارة</span>
              <button type="button" onClick={() => setSheet(false)} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              {groupedTabs.map((g) => (
                <div key={g.l}>
                  <div className="pb-2 text-[11px] font-extrabold tracking-wide text-slate-400">{g.l}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {g.items.map((n) => {
                      const active = tab === n.k;
                      return (
                        <button key={n.k} data-testid={`admin-tab-${n.k}`} onClick={() => { goTab(n.k); setSheet(false); }} className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-[11px] font-bold transition-all ${active ? "bg-gradient-to-b from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30" : "border border-slate-200 bg-slate-50/60 text-slate-600"}`}>
                          <n.icon className="h-5 w-5" />
                          <span className="text-center leading-tight">{n.l}</span>
                          {pendCount(n.k) > 0 && <span className={`absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold ${active ? "bg-white text-emerald-700" : "bg-rose-500 text-white"}`}>{pendCount(n.k) > 99 ? "+99" : pendCount(n.k)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
}

const ACT_LABELS = {
  work_approve: "نشر عمل أدبي", work_reject: "رفض عمل أدبي", work_submit: "إرسال عمل للمراجعة",
  book_approve: "اعتماد كتاب", book_reject: "رفض كتاب", user_create: "إنشاء حساب",
  user_delete: "حذف حساب", role_change: "تغيير دور", teacher_approve: "قبول معلم", teacher_reject: "رفض معلم",
  campaign_send: "إرسال حملة إشعارات", badge_award: "منح شارة",
};






