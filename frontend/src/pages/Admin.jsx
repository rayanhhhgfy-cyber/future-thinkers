import React, { useEffect, useState } from "react";
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
import NotifyPanel from "@/components/admin/NotifyPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import ClubsPanel from "@/components/admin/ClubsPanel";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from "recharts";
import { LayoutDashboard, ShieldCheck, Users, BookOpen, Calendar, Trophy, Newspaper, Settings, ScrollText, Plus, Check, X, Megaphone, PenLine, Medal, Award, Upload, Trash2, Search, MessageSquare, MessagesSquare, Activity, Smartphone, UserPlus, FileCheck, Rocket, Zap, ArrowLeft, Star, Heart, ThumbsUp, Flag, CalendarCheck, Crown, Download, UserSearch, Link2, CalendarDays, Code2, FlaskConical, Terminal, Palette, Globe2, Route as RouteIcon, Bug } from "lucide-react";
import { THEME_PRESETS, applyTheme } from "@/lib/theme";
import { timeAgo } from "@/components/NotificationsPanel";
import { motion } from "framer-motion";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { CodingAdminPanel, ThemePanel, ReportsPanel, HealthPanel, LandingPanel, PathsAdminPanel, AnalyticsV2, ErrorsPanel, CertificatesPanelV2 } from "@/pages/AdminExtra";
import { OverviewPanel, ExportPanel, User360Panel } from "@/pages/AdminPanels2";
import { startChunkedUpload, uploadChunks, completeChunkedUpload, fileToBase64, compressCoverImage, CHUNK_THRESHOLD, MAX_PDF_SIZE } from "@/lib/chunkedUpload";

const NAV = [
  { k: "overview", l: "نظرة عامة", icon: LayoutDashboard, perm: "analytics.view" },
  { k: "moderation", l: "مراجعة المحتوى", icon: ShieldCheck, perm: "book.approve" },
  { k: "studio", l: "مراجعة الاستوديو", icon: PenLine, perm: "studio.review" },
  { k: "books", l: "الكتب", icon: BookOpen, perm: ["book.edit", "book.delete"] },
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
];
const COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

export default function Admin() {
  const { hasPerm } = useAuth();
  const nav = useNavigate();
  const params = useParams();
  const tabs = NAV.filter((n) => Array.isArray(n.perm) ? n.perm.some((p) => hasPerm(p)) : hasPerm(n.perm));
  const urlTab = (params["*"] || "").split("/")[0];
  const validUrlTab = tabs.some((t) => t.k === urlTab) ? urlTab : null;
  const [tab, setTab] = useState(validUrlTab || tabs[0]?.k || "overview");

  // deep-link support: /admin/studio opens the studio review tab (used by notifications)
  useEffect(() => {
    if (validUrlTab && validUrlTab !== tab) setTab(validUrlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validUrlTab]);

  const goTab = (k) => { setTab(k); nav(`/admin/${k}`, { replace: true }); };

  return (
    <Layout noFooter>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <h1 className="font-head text-2xl font-extrabold text-slate-900 mb-6">لوحة الإدارة</h1>
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
          <aside className="lg:sticky lg:top-20 self-start min-w-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto bg-white rounded-2xl p-2 border border-slate-100 ft-shadow">
              {tabs.map((n) => (
                <button key={n.k} data-testid={`admin-tab-${n.k}`} onClick={() => goTab(n.k)} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === n.k ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                  <n.icon className="w-4 h-4" />{n.l}
                </button>
              ))}
            </div>
          </aside>
          <div className="min-w-0" key={tab}>
            <div className="animate-fade-in">
            {tab === "overview" && <OverviewPanel onJump={goTab} />}
            {tab === "moderation" && <Moderation />}
            {tab === "studio" && <StudioPanel />}
            {tab === "books" && <BooksPanel />}
            {tab === "badges" && <BadgesPanel />}
            {tab === "certificates" && <CertificatesPanelV2 />}
            {tab === "users" && <UsersPanel />}
            {tab === "user360" && <User360Panel />}
            {tab === "notify" && <NotifyPanel />}
            {tab === "content" && <ContentPanel />}
            {tab === "news" && <NewsPanel />}
            {tab === "banners" && <BannersPanel />}
            {tab === "theme" && <ThemePanel />}
            {tab === "reports" && <ReportsPanel />}
            {tab === "errors" && <ErrorsPanel />}
            {tab === "healthsys" && <HealthPanel />}
            {tab === "landing" && <LandingPanel />}
            {tab === "calendar" && <CalendarPanel />}
            {tab === "coding" && <CodingAdminPanel />}
            {tab === "paths" && <PathsAdminPanel />}
            {tab === "exports" && <ExportPanel />}
            {tab === "clubs" && <ClubsPanel />}
            {tab === "points" && <PointsPanel />}
            {tab === "audit" && <AuditPanel />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const ACT_LABELS = {
  work_approve: "نشر عمل أدبي", work_reject: "رفض عمل أدبي", work_submit: "إرسال عمل للمراجعة",
  book_approve: "اعتماد كتاب", book_reject: "رفض كتاب", user_create: "إنشاء حساب",
  user_delete: "حذف حساب", role_change: "تغيير دور", teacher_approve: "قبول معلم", teacher_reject: "رفض معلم",
  campaign_send: "إرسال حملة إشعارات", badge_award: "منح شارة",
};







function Overview() {
  const [o, setO] = useState(null);
  const [a, setA] = useState(null);
  const [act, setAct] = useState(null);
  const [health, setHealth] = useState(null);
  const nav = useNavigate();
  useEffect(() => {
    api.get("/admin/overview").then((r) => setO(r.data));
    api.get("/admin/analytics").then((r) => setA(r.data));
    api.get("/admin/activity").then((r) => setAct(r.data)).catch(() => setAct([]));
    api.get("/health").then((r) => setHealth(r.data)).catch(() => setHealth({ status: "down" }));
  }, []);
  if (!o || !a) return <PageLoader />;
  const cards = [
    { l: "الطلاب", v: o.students, icon: Users, c: "#2563EB" }, { l: "المدارس", v: o.schools, icon: BookOpen, c: "#059669" },
    { l: "الكتب", v: o.books, icon: BookOpen, c: "#D97706" }, { l: "الفعاليات", v: o.events, icon: Calendar, c: "#7C3AED" },
    { l: "المسابقات", v: o.competitions, icon: Trophy, c: "#0891B2" }, { l: "النقاشات", v: o.discussions, icon: Users, c: "#E11D48" },
    { l: "بلاغات مفتوحة", v: o.reports_open, icon: ShieldCheck, c: "#dc2626" }, { l: "بانتظار المراجعة", v: o.books_pending + o.activities_pending, icon: ShieldCheck, c: "#f59e0b" },
  ];
  // NEW: pulse metrics
  const pulse = [
    { l: "معلمون بانتظار الموافقة", v: o.teachers_pending || 0, icon: UserPlus, c: "#7C3AED", tab: "users" },
    { l: "أعمال أدبية قيد المراجعة", v: o.works_pending || 0, icon: FileCheck, c: "#D97706", tab: "studio" },
    { l: "مستخدمون جدد (7 أيام)", v: o.new_users_7d || 0, icon: Zap, c: "#059669", tab: "users" },
    { l: "أجهزة إشعارات الهاتف", v: o.push_devices || 0, icon: Smartphone, c: "#0891B2", tab: "notify" },
    { l: "مشاريع طلابية", v: o.ventures || 0, icon: Rocket, c: "#E11D48", link: "/ventures" },
  ];
  const queue = [
    { l: "طلبات المعلمين", v: o.teachers_pending || 0, tab: "users", c: "#7C3AED" },
    { l: "أعمال الاستوديو", v: o.works_pending || 0, tab: "studio", c: "#D97706" },
    { l: "الكتب المقترحة", v: o.books_pending || 0, tab: "moderation", c: "#2563EB" },
    { l: "الأنشطة", v: o.activities_pending || 0, tab: "moderation", c: "#059669" },
    { l: "البلاغات", v: o.reports_open || 0, tab: "moderation", c: "#dc2626" },
  ];
  const totalPending = queue.reduce((s, q) => s + q.v, 0);
  const quick = [
    { l: "بث إشعار", icon: Megaphone, tab: "notify", c: "#7C3AED" },
    { l: "حساب جديد", icon: Plus, tab: "users", c: "#2563EB" },
    { l: "فعالية / مسابقة", icon: Calendar, tab: "content", c: "#059669" },
    { l: "خبر جديد", icon: Newspaper, tab: "news", c: "#D97706" },
    { l: "منح شارة", icon: Medal, tab: "badges", c: "#E11D48" },
    { l: "سجل العمليات", icon: ScrollText, tab: "audit", c: "#0A192F" },
  ];
  return (
    <div className="space-y-6">
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Item key={c.l}>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
            <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${c.c}15`, color: c.c }}><c.icon className="w-5 h-5" /></div>
            <div className="text-2xl font-extrabold font-head text-slate-900">{c.v}</div>
            <div className="text-xs text-slate-500">{c.l}</div>
          </div>
          </Item>
        ))}
      </Stagger>

      {/* NEW 1: live pulse metrics */}
      <FadeUp>
      <div>
        <h3 className="font-head font-bold mb-3 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> نبض المنصة</h3>
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pulse.map((p) => (
            <Item key={p.l}>
            <button onClick={() => p.tab ? nav(`/admin/${p.tab}`) : nav(p.link)}
              className="w-full text-right bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-100 ft-shadow hover-lift">
              <div className="w-9 h-9 rounded-xl grid place-items-center mb-2" style={{ background: `${p.c}15`, color: p.c }}><p.icon className="w-4.5 h-4.5" /></div>
              <div className="text-xl font-extrabold font-head text-slate-900">{p.v}</div>
              <div className="text-[11px] text-slate-500 leading-tight">{p.l}</div>
            </button>
            </Item>
          ))}
        </Stagger>
      </div>
      </FadeUp>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold mb-4">الطلاب حسب المحافظة</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.students_by_governorate}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold mb-4">الكتب حسب التصنيف</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={a.books_by_category} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {a.books_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* NEW 2: approval queue */}
        <FadeUp className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-600" /> طابور الموافقات</h3>
            {totalPending > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{totalPending} بانتظارك</span>}
          </div>
          <div className="space-y-2">
            {queue.map((q) => (
              <button key={q.l} onClick={() => nav(`/admin/${q.tab}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: q.c }} />{q.l}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-slate-900">{q.v}</span>
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:-translate-x-0.5 transition-all" />
                </span>
              </button>
            ))}
          </div>
          {totalPending === 0 && <div className="text-center text-sm text-emerald-600 font-medium py-4">كل شيء مُراجع · أحسنت! ✨</div>}
        </div>
        </FadeUp>

        {/* NEW 3: recent activity */}
        <FadeUp className="lg:col-span-1" delay={0.05}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /> آخر النشاطات</h3>
            <button onClick={() => nav("/admin/audit")} className="text-xs text-blue-600 font-medium">السجل الكامل</button>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {!act ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div>
              : act.length === 0 ? <div className="text-sm text-slate-400 text-center py-6">لا نشاطات مسجلة بعد</div>
              : act.slice(0, 8).map((e, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0 text-xs font-bold">
                    {(e.user_name || "?").trim()[0]}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] text-slate-700"><span className="font-bold">{e.user_name}</span> · {ACT_LABELS[e.action] || e.action}</div>
                    <div className="text-[11px] text-slate-400">{timeAgo(e.created_at)}</div>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
        </FadeUp>

        <div className="space-y-6">
          {/* NEW 4: quick actions */}
          <FadeUp delay={0.1}>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
            <h3 className="font-head font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-violet-600" /> إجراءات سريعة</h3>
            <div className="grid grid-cols-3 gap-2">
              {quick.map((q) => (
                <button key={q.l} onClick={() => nav(`/admin/${q.tab}`)}
                  className="flex flex-col items-center gap-1.5 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <span className="w-10 h-10 rounded-xl grid place-items-center group-hover:scale-110 transition-transform" style={{ background: `${q.c}15`, color: q.c }}>
                    <q.icon className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-600">{q.l}</span>
                </button>
              ))}
            </div>
          </div>
          </FadeUp>

          {/* analytics v2 growth */}
          <AnalyticsV2 />

          {/* NEW 5: platform health */}
          <FadeUp delay={0.15}>
          <div className="bg-slate-900 rounded-2xl p-6 text-white ft-shadow relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <h3 className="font-head font-bold mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-emerald-400" /> صحة المنصة</h3>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${health?.status === "healthy" ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${health?.status === "healthy" ? "bg-emerald-500" : "bg-rose-500"}`} />
                </span>
                <div>
                  <div className="font-bold text-sm">{!health ? "يفحص…" : health.status === "healthy" ? "المنصة تعمل بشكل سليم ✅" : "مشكلة في الاتصال ⚠️"}</div>
                  <div className="text-xs text-slate-400">قاعدة البيانات: {health?.db === "up" ? "متصلة" : "·"}</div>
                </div>
              </div>
            </div>
          </div>
          </FadeUp>
        </div>
      </div>
    </div>
  );
}

function Moderation() {
  const [books, setBooks] = useState([]);
  const [acts, setActs] = useState([]);
  const [reports, setReports] = useState([]);
  const load = async () => {
    const [b, a, r] = await Promise.all([
      api.get("/books/pending").catch(() => ({ data: [] })),
      api.get("/activities/pending").catch(() => ({ data: [] })),
      api.get("/reports").catch(() => ({ data: [] })),
    ]);
    setBooks(b.data); setActs(a.data); setReports(r.data);
  };
  useEffect(() => { load(); }, []);
  const actBook = async (id, action, reason = "") => { await api.post(`/books/${id}/${action}`, action === "reject" ? { reason } : undefined); toast.success(action === "approve" ? "تمت الموافقة" : "تم الرفض"); load(); };
  const actActivity = async (id, action) => { await api.post(`/activities/${id}/${action}`); toast.success("تم"); load(); };
  const resolveReport = async (id, action) => { await api.post(`/reports/${id}/resolve`, { action, note: "" }); toast.success("تم"); load(); };

  return (
    <div className="space-y-6">
      <Section title={`كتب بانتظار المراجعة (${books.length})`}>
        {books.length === 0 ? <Empty t="لا كتب معلّقة" /> : books.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{b.title}</div><div className="text-xs text-slate-400">{b.author} · {b.uploader_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" data-testid={`approve-book-${b.id}`} onClick={() => actBook(b.id, "approve")} className="rounded-lg bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" data-testid={`reject-book-${b.id}`} onClick={() => actBook(b.id, "reject", "لا يتوافق مع معايير النشر")} className="rounded-lg text-rose-600"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </Section>
      <Section title={`أنشطة بانتظار المراجعة (${acts.length})`}>
        {acts.length === 0 ? <Empty t="لا أنشطة معلّقة" /> : acts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{a.title}</div><div className="text-xs text-slate-400">{a.author_name} · {a.school_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => actActivity(a.id, "approve")} className="rounded-lg bg-emerald-600"><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => actActivity(a.id, "reject")} className="rounded-lg text-rose-600"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </Section>
      <Section title={`بلاغات مفتوحة (${reports.length})`}>
        {reports.length === 0 ? <Empty t="لا بلاغات" /> : reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{r.entity_type} · {r.reason}</div><div className="text-xs text-slate-400">بلّغ عنه: {r.reporter_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, "dismiss")} className="rounded-lg">تجاهل</Button>
              <Button size="sm" onClick={() => resolveReport(r.id, "delete")} className="rounded-lg bg-rose-600 hover:bg-rose-700">حذف المحتوى</Button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function ContentPanel() {
  return (
    <div className="space-y-6">
      <EventsManager />
      <EventForm />
      <CompetitionsManager />
      <CompetitionForm />
      <BroadcastForm />
    </div>
  );
}

function EventsManager() {
  const { hasPerm } = useAuth();
  const canEdit = hasPerm("event.edit");
  const canDelete = hasPerm("event.delete");
  const [events, setEvents] = useState(null);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { const { data } = await api.get("/events", { params: { limit: 60 } }); setEvents(data.items || []); }
    catch { setEvents([]); }
  };
  useEffect(() => { load(); }, []);
  const openEdit = (e) => {
    setEditing(e);
    setF({ title: e.title || "", description: e.description || "", date: e.date || "", time: e.time || "", location: e.location || "", mode: e.mode || "online", scope: e.scope || "national", capacity: e.capacity || 100 });
  };
  const save = async () => {
    if (!f.title.trim()) return toast.error("العنوان مطلوب");
    setSaving(true);
    try { await api.patch(`/events/${editing.id}`, { ...f, capacity: Number(f.capacity) || 0 }); toast.success("تم حفظ التعديلات ✅"); setEditing(null); load(); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (e) => {
    if (!window.confirm(`حذف فعالية "${e.title}" نهائياً؟ سيتم إلغاء تسجيلات المشاركين.`)) return;
    try { await api.delete(`/events/${e.id}`); toast.success("تم حذف الفعالية"); load(); }
    catch (e2) { toast.error(apiErr(e2)); }
  };
  if (!events) return <PageLoader />;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Section title={`الفعاليات (${events.length})`}>
      {events.length === 0 ? <Empty t="لا فعاليات بعد" /> : (
        <Stagger className="space-y-2 max-h-[420px] overflow-y-auto pl-1">
          {events.map((e) => (
            <Item key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-violet-100 grid place-items-center shrink-0"><Calendar className="w-5 h-5 text-violet-600" /></div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{e.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{e.date || ""}{e.time ? ` · ${e.time}` : ""}{e.location ? ` · ${e.location}` : ""}{e.registered_count ? ` · ${e.registered_count} مشارك` : ""}</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(e)} className="rounded-xl flex-1 sm:flex-none h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                {canDelete && <Button size="sm" variant="outline" onClick={() => del(e)} className="rounded-xl flex-1 sm:flex-none h-10 text-rose-600 border-rose-200"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
              </div>
            </Item>
          ))}
        </Stagger>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الفعالية</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>العنوان</Label><Input value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>التاريخ</Label><Input type="date" value={f.date || ""} onChange={(e) => set("date")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>الوقت</Label><Input value={f.time || ""} onChange={(e) => set("time")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>المكان</Label><Input value={f.location || ""} onChange={(e) => set("location")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>السعة</Label><Input type="number" min="0" value={f.capacity ?? ""} onChange={(e) => set("capacity")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div>
              <Label>النمط</Label>
              <Select value={f.mode || "online"} onValueChange={set("mode")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">عن بُعد</SelectItem><SelectItem value="onsite">حضوري</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label>النطاق</Label>
              <Select value={f.scope || "national"} onValueChange={set("scope")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">وطنية</SelectItem><SelectItem value="directorate">مديرية</SelectItem><SelectItem value="school">مدرسة</SelectItem></SelectContent></Select>
            </div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={f.description || ""} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-1" rows={3} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function CompetitionsManager() {
  const { hasPerm } = useAuth();
  const canEdit = hasPerm("competition.edit");
  const canDelete = hasPerm("competition.delete");
  const [comps, setComps] = useState(null);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { const { data } = await api.get("/competitions", { params: { limit: 60 } }); setComps(data.items || []); }
    catch { setComps([]); }
  };
  useEffect(() => { load(); }, []);
  const openEdit = (c) => {
    setEditing(c);
    // NOTE: question editing is intentionally out of scope here · edit the metadata only.
    setF({ title: c.title || "", description: c.description || "", type: c.type || "quiz", start_at: (c.start_at || "").slice(0, 16), end_at: (c.end_at || "").slice(0, 16), duration_minutes: c.duration_minutes || 30 });
  };
  const save = async () => {
    if (!f.title.trim()) return toast.error("العنوان مطلوب");
    setSaving(true);
    try {
      await api.patch(`/competitions/${editing.id}`, {
        title: f.title, description: f.description, type: f.type,
        start_at: f.start_at ? new Date(f.start_at).toISOString() : undefined,
        end_at: f.end_at ? new Date(f.end_at).toISOString() : undefined,
        duration_minutes: Number(f.duration_minutes) || 30,
      });
      toast.success("تم حفظ التعديلات ✅"); setEditing(null); load();
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (c) => {
    if (!window.confirm(`حذف مسابقة "${c.title}" نهائياً؟ سيتم حذف المشاركات والنتائج المرتبطة.`)) return;
    try { await api.delete(`/competitions/${c.id}`); toast.success("تم حذف المسابقة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const finalizeComp = async (c) => {
    if (!window.confirm(`إنهاء مسابقة "${c.title}"؟ سيحصل أفضل 3 على نقاط وشهادات تلقائياً.`)) return;
    try {
      const { data } = await api.post(`/admin/competitions/${c.id}/finalize`);
      toast.success(`اكتملت المسابقة · ${data.winners.length} فائز حصلوا على شهادات 🏆`);
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };
  if (!comps) return <PageLoader />;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Section title={`المسابقات (${comps.length})`}>
      {comps.length === 0 ? <Empty t="لا مسابقات بعد" /> : (
        <Stagger className="space-y-2 max-h-[420px] overflow-y-auto pl-1">
          {comps.map((c) => (
            <Item key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-amber-100 grid place-items-center shrink-0"><Trophy className="w-5 h-5 text-amber-600" /></div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{c.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.type || ""}{c.start_at ? ` · تبدأ ${String(c.start_at).slice(0, 10)}` : ""}</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="rounded-xl flex-1 sm:flex-none h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                {canDelete && <Button size="sm" variant="outline" onClick={() => del(c)} className="rounded-xl flex-1 sm:flex-none h-10 text-rose-600 border-rose-200"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
                {hasPerm("competition.manage") && c.status !== "completed" && (
                  <Button size="sm" onClick={() => finalizeComp(c)} className="rounded-xl flex-1 sm:flex-none h-10 bg-amber-500 hover:bg-amber-600 text-white">إنهاء + شهادات 🏆</Button>
                )}
              </div>
            </Item>
          ))}
        </Stagger>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل المسابقة</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>العنوان</Label><Input value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div>
              <Label>النوع</Label>
              <Select value={f.type || "quiz"} onValueChange={set("type")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent>{["quiz", "science", "reading", "programming", "writing", "debate"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>المدة (دقائق)</Label><Input type="number" min="1" value={f.duration_minutes ?? ""} onChange={(e) => set("duration_minutes")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>تبدأ</Label><Input type="datetime-local" value={f.start_at || ""} onChange={(e) => set("start_at")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>تنتهي</Label><Input type="datetime-local" value={f.end_at || ""} onChange={(e) => set("end_at")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={f.description || ""} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-1" rows={3} /></div>
            <p className="sm:col-span-2 text-xs text-slate-400">ملاحظة: تعديل الأسئلة يتم عند إنشاء مسابقة جديدة · هنا تُعدَّل البيانات الأساسية فقط.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function EventForm() {
  const [f, setF] = useState({ title: "", description: "", date: "", time: "", location: "", mode: "online", scope: "national", capacity: 100 });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => { try { await api.post("/events", { ...f, capacity: Number(f.capacity) }); toast.success("تم إنشاء الفعالية"); setF({ title: "", description: "", date: "", time: "", location: "", mode: "online", scope: "national", capacity: 100 }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="إنشاء فعالية">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input data-testid="event-title" placeholder="عنوان الفعالية" value={f.title} onChange={(e) => set("title")(e.target.value)} className="rounded-xl" />
        <Input data-testid="event-date" type="date" value={f.date} onChange={(e) => set("date")(e.target.value)} className="rounded-xl" />
        <Input placeholder="الوقت (مثال: 10:00 ص)" value={f.time} onChange={(e) => set("time")(e.target.value)} className="rounded-xl" />
        <Input placeholder="المكان" value={f.location} onChange={(e) => set("location")(e.target.value)} className="rounded-xl" />
        <Select value={f.mode} onValueChange={set("mode")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">عن بُعد</SelectItem><SelectItem value="onsite">حضوري</SelectItem></SelectContent></Select>
        <Select value={f.scope} onValueChange={set("scope")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">وطنية</SelectItem><SelectItem value="directorate">مديرية</SelectItem><SelectItem value="school">مدرسة</SelectItem></SelectContent></Select>
      </div>
      <Textarea placeholder="الوصف" value={f.description} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-3" />
      <Button data-testid="create-event-btn" onClick={submit} className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء الفعالية</Button>
    </Section>
  );
}

function CompetitionForm() {
  const [f, setF] = useState({ title: "", description: "", type: "quiz", start_at: "", end_at: "", duration_minutes: 30 });
  const [qs, setQs] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const questions = qs.filter((q) => q.text.trim());
    try { await api.post("/competitions", { ...f, duration_minutes: Number(f.duration_minutes), start_at: f.start_at || new Date().toISOString(), end_at: f.end_at || new Date(Date.now() + 7 * 864e5).toISOString(), questions }); toast.success("تم إنشاء المسابقة"); setF({ title: "", description: "", type: "quiz", start_at: "", end_at: "", duration_minutes: 30 }); setQs([{ text: "", options: ["", "", "", ""], correct: 0 }]); }
    catch (e) { toast.error(apiErr(e)); }
  };
  return (
    <Section title="إنشاء مسابقة (اختبار)">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input data-testid="comp-title" placeholder="عنوان المسابقة" value={f.title} onChange={(e) => set("title")(e.target.value)} className="rounded-xl" />
        <Select value={f.type} onValueChange={set("type")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["quiz", "science", "reading", "programming", "writing", "debate"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
      </div>
      <Textarea placeholder="الوصف" value={f.description} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-3" />
      <div className="mt-4 space-y-3">
        {qs.map((q, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Input data-testid={`comp-q-${i}`} placeholder={`السؤال ${i + 1}`} value={q.text} onChange={(e) => setQs((arr) => arr.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} className="rounded-lg mb-2 bg-white" />
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-1.5">
                  <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => setQs((arr) => arr.map((x, j) => j === i ? { ...x, correct: oi } : x))} />
                  <Input placeholder={`خيار ${oi + 1}`} value={opt} onChange={(e) => setQs((arr) => arr.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? e.target.value : o) } : x))} className="rounded-lg h-9 bg-white" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setQs((a) => [...a, { text: "", options: ["", "", "", ""], correct: 0 }])} className="rounded-lg"><Plus className="w-4 h-4 ml-1" />سؤال آخر</Button>
      </div>
      <Button data-testid="create-comp-btn" onClick={submit} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء المسابقة</Button>
    </Section>
  );
}

function BroadcastForm() {
  const [f, setF] = useState({ title: "", body: "" });
  const submit = async () => { try { const { data } = await api.post("/admin/broadcast", { ...f, scope: "all" }); toast.success(`أُرسل إلى ${data.sent} مستخدم`); setF({ title: "", body: "" }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="إعلان عام">
      <Input placeholder="عنوان الإعلان" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mb-2" />
      <Textarea placeholder="نص الإعلان" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl" />
      <Button data-testid="broadcast-btn" onClick={submit} className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700"><Megaphone className="w-4 h-4 ml-1" />إرسال الإعلان</Button>
    </Section>
  );
}

function NewsPanel() {
  const [f, setF] = useState({ title: "", body: "", category: "منصة", cover_url: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const submit = async () => { try { await api.post("/news", f); toast.success("تم نشر الخبر"); setF({ title: "", body: "", category: "منصة", cover_url: "" }); setRefreshKey((k) => k + 1); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <div className="space-y-6">
      <NewsManager refreshKey={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
      <Section title="نشر خبر">
        <Input data-testid="news-title" placeholder="عنوان الخبر" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mb-2" />
        <Input placeholder="رابط صورة (اختياري)" value={f.cover_url} onChange={(e) => setF((x) => ({ ...x, cover_url: e.target.value }))} className="rounded-xl mb-2" />
        <Textarea placeholder="نص الخبر" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl min-h-[140px]" />
        <Button data-testid="publish-news-btn" onClick={submit} className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />نشر</Button>
      </Section>
    </div>
  );
}

function NewsManager({ refreshKey, onChanged }) {
  const { hasPerm } = useAuth();
  const canEdit = hasPerm("news.edit");
  const canDelete = hasPerm("news.delete");
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { const { data } = await api.get("/news", { params: { limit: 40 } }); setItems(data.items || []); }
    catch { setItems([]); }
  };
  useEffect(() => { load(); }, [refreshKey]);
  const openEdit = (n) => { setEditing(n); setF({ title: n.title || "", body: n.body || "", category: n.category || "منصة", cover_url: n.cover_url || "" }); };
  const save = async () => {
    if (!f.title.trim() || !f.body.trim()) return toast.error("العنوان والنص مطلوبان");
    setSaving(true);
    try { await api.patch(`/news/${editing.id}`, f); toast.success("تم حفظ التعديلات ✅"); setEditing(null); onChanged(); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (n) => {
    if (!window.confirm(`حذف خبر "${n.title}" نهائياً؟`)) return;
    try { await api.delete(`/news/${n.id}`); toast.success("تم حذف الخبر"); onChanged(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  if (!items) return <PageLoader />;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Section title={`الأخبار المنشورة (${items.length})`}>
      {items.length === 0 ? <Empty t="لا أخبار بعد" /> : (
        <Stagger className="grid sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pl-1">
          {items.map((n) => (
            <Item key={n.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col hover-lift">
              {n.cover_url ? (
                <img src={n.cover_url} alt={n.title} className="h-32 w-full object-cover" />
              ) : (
                <div className="h-20 w-full bg-gradient-to-l from-sky-100 to-indigo-50 grid place-items-center">
                  <Newspaper className="w-8 h-8 text-sky-300" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{n.category || "منصة"}</span>
                  <span className="text-[11px] text-slate-400">{String(n.created_at || "").slice(0, 10)}</span>
                </div>
                <div className="font-bold text-slate-800 leading-snug line-clamp-2">{n.title}</div>
                <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.body}</div>
                <div className="flex gap-2 mt-auto pt-2">
                  {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(n)} className="rounded-xl flex-1 h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                  {canDelete && <Button size="sm" variant="outline" onClick={() => del(n)} className="rounded-xl flex-1 h-10 text-rose-600 border-rose-200"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
                </div>
              </div>
            </Item>
          ))}
        </Stagger>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الخبر</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان</Label><Input value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>التصنيف</Label><Input value={f.category || ""} onChange={(e) => set("category")(e.target.value)} className="rounded-xl mt-1" /></div>
            <div><Label>رابط الصورة</Label><Input value={f.cover_url || ""} onChange={(e) => set("cover_url")(e.target.value)} className="rounded-xl mt-1" dir="ltr" /></div>
            <div><Label>نص الخبر</Label><Textarea value={f.body || ""} onChange={(e) => set("body")(e.target.value)} className="rounded-xl mt-1 min-h-[140px]" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

const POINTS_META = {
  read_book: { l: "قراءة كتاب", icon: BookOpen, c: "#2563EB" },
  review_book: { l: "تقييم كتاب", icon: Star, c: "#D97706" },
  create_discussion: { l: "إنشاء نقاش", icon: MessageSquare, c: "#7C3AED" },
  reply_discussion: { l: "رد على نقاش", icon: MessagesSquare, c: "#0891B2" },
  receive_like: { l: "استلام إعجاب", icon: Heart, c: "#E11D48" },
  join_event: { l: "حضور فعالية", icon: CalendarCheck, c: "#059669" },
  win_chess: { l: "فوز بالشطرنج", icon: Trophy, c: "#D97706" },
  play_chess: { l: "لعب الشطرنج", icon: Crown, c: "#7C3AED" },
  daily_checkin: { l: "حضور يومي", icon: Zap, c: "#059669" },
  join_competition: { l: "دخول مسابقة", icon: Medal, c: "#0891B2" },
  win_competition: { l: "فوز بمسابقة", icon: Award, c: "#D97706" },
  upload_book_approved: { l: "قبول كتاب مرفوع", icon: Upload, c: "#2563EB" },
  work_published: { l: "نشر عمل في الاستوديو", icon: PenLine, c: "#7C3AED" },
  studio_review: { l: "مراجعة عمل أدبي", icon: Star, c: "#D97706" },
  venture_publish: { l: "نشر مشروع", icon: Rocket, c: "#E11D48" },
  venture_vote_received: { l: "تصويت لمشروعك", icon: ThumbsUp, c: "#059669" },
  venture_complete_owner: { l: "إتمام مشروع (مالك)", icon: Flag, c: "#2563EB" },
  venture_complete_member: { l: "إتمام مشروع (عضو)", icon: Users, c: "#0891B2" },
};

function PointsPanel() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/admin/points-config").then((r) => setCfg(r.data)); }, []);
  const save = async () => {
    setSaving(true);
    try { await api.put("/admin/points-config", cfg); toast.success("تم حفظ إعدادات النقاط ✅"); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  if (!cfg) return <PageLoader />;
  const keys = Object.keys(cfg);
  return (
    <div className="space-y-6">
      <Section title="قيم النقاط لكل نشاط">
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {keys.map((k) => {
            const m = POINTS_META[k] || { l: k, icon: Zap, c: "#64748B" };
            const Icon = m.icon;
            return (
              <Item key={k} className="flex items-center gap-3 bg-gradient-to-l from-slate-50 to-white rounded-2xl border border-slate-100 p-3.5 hover-lift">
                <div className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: m.c }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-700 truncate">{m.l}</div>
                  <div className="text-[11px] text-slate-400" dir="ltr">{k}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Input data-testid={`points-${k}`} type="number" value={cfg[k]} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-20 rounded-xl h-10 bg-white text-center font-bold" dir="ltr" />
                  <span className="text-xs text-slate-400">نقطة</span>
                </div>
              </Item>
            );
          })}
        </Stagger>
        <Button data-testid="save-points-btn" onClick={save} disabled={saving} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700">
          <Check className="w-4 h-4 ml-1" /> {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </Button>
      </Section>
      <AdjustXp />
    </div>
  );
}

function AdjustXp() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/users", { params: { q } }); setUsers(data.items || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const submit = async () => {
    if (!sel) return toast.error("اختر المستخدم أولاً");
    const n = Number(amount);
    if (!n) return toast.error("أدخل عدد النقاط (موجب للإضافة وسالب للخصم)");
    setSaving(true);
    try {
      await api.post(`/admin/users/${sel.id}/adjust-xp`, { amount: n, reason: reason.trim() || "تعديل إداري" });
      toast.success(`تم ${n > 0 ? "إضافة" : "خصم"} ${Math.abs(n)} نقطة ${n > 0 ? "إلى" : "من"} ${sel.name} ✅`);
      setSel(null); setQ(""); setAmount(""); setReason("");
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  return (
    <Section title="تعديل نقاط مستخدم">
      <div className="max-w-xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد..." className="rounded-xl pr-9" />
        </div>
        {users.length > 0 && !sel && (
          <div className="border border-slate-100 rounded-xl divide-y max-h-44 overflow-y-auto bg-white">
            {users.slice(0, 6).map((u) => (
              <button key={u.id} onClick={() => setSel(u)} className="w-full text-right px-3 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between gap-2">
                <span><span className="font-medium">{u.name}</span> <span className="text-slate-400 text-xs">{u.email}</span></span>
                <span className="text-xs text-amber-600 font-medium shrink-0">{u.xp ?? 0} نقطة</span>
              </button>
            ))}
          </div>
        )}
        {sel && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 rounded-xl px-3 py-2.5">
            <Check className="w-4 h-4 text-emerald-600" />{sel.name}
            <span className="text-xs text-slate-400">({sel.xp ?? 0} نقطة حالياً)</span>
            <button onClick={() => setSel(null)} className="mr-auto text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>عدد النقاط <span className="text-slate-400 font-normal">(+ إضافة / − خصم)</span></Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 50 أو -20" className="rounded-xl mt-1 text-center font-bold" dir="ltr" /></div>
          <div><Label>السبب</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: فوز بتحدي القراءة" className="rounded-xl mt-1" /></div>
        </div>
        <Button onClick={submit} disabled={saving} className="rounded-xl bg-amber-600 hover:bg-amber-700">
          <Zap className="w-4 h-4 ml-1" /> {saving ? "جارٍ التنفيذ..." : "تنفيذ التعديل"}
        </Button>
      </div>
    </Section>
  );
}

const AUDIT_ACTION_STYLE = [
  { match: ["delete", "reject", "remove"], bg: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
  { match: ["create", "approve", "award", "send", "publish", "adjust"], bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  { match: ["update", "edit", "change", "patch"], bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  { match: ["login"], bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
];
const AUDIT_ENTITY_LABEL = {
  user: "مستخدم", book: "كتاب", news: "خبر", event: "فعالية", competition: "مسابقة",
  club: "نادٍ", notification: "إشعار", campaign: "حملة", badge: "شارة", certificate: "شهادة",
  points: "نقاط", xp: "نقاط", studio: "استوديو", work: "عمل أدبي", venture: "مشروع",
  discussion: "نقاش", report: "بلاغ", auth: "دخول",
};
function auditStyle(action = "") {
  const a = action.toLowerCase();
  for (const s of AUDIT_ACTION_STYLE) if (s.match.some((m) => a.includes(m))) return s;
  return { bg: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" };
}

function AuditPanel() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 25;
  const load = async (p = 1) => {
    setData(null);
    try { const { data } = await api.get("/admin/audit-logs", { params: { page: p, limit: LIMIT } }); setData(data); }
    catch { setData({ items: [], total: 0, page: p }); }
  };
  useEffect(() => { load(page); }, [page]);
  if (!data) return <PageLoader />;
  const entities = [...new Set(data.items.map((l) => l.entity).filter(Boolean))];
  const ql = q.trim().toLowerCase();
  const items = data.items.filter((l) => {
    if (entity !== "all" && l.entity !== entity) return false;
    if (!ql) return true;
    return [l.user_email, l.action, l.entity, l.entity_id].some((v) => String(v || "").toLowerCase().includes(ql));
  });
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / LIMIT));
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 ft-shadow p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد أو الإجراء أو الكيان..." className="rounded-xl pr-9" />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="rounded-xl sm:w-44"><SelectValue placeholder="كل الكيانات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الكيانات</SelectItem>
              {entities.map((e) => <SelectItem key={e} value={e}>{AUDIT_ENTITY_LABEL[e] || e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow"><Empty t="لا سجلات مطابقة" /></div>
      ) : (
        <Stagger className="relative space-y-3 before:absolute before:right-[27px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200">
          {items.map((l) => {
            const s = auditStyle(l.action);
            const open = expanded === l.id;
            const meta = l.meta && typeof l.meta === "object" ? Object.entries(l.meta) : [];
            return (
              <Item key={l.id} className="relative pr-14">
                <span className={`absolute right-[21px] top-5 w-3.5 h-3.5 rounded-full ${s.dot} ring-4 ring-white`} />
                <button onClick={() => setExpanded(open ? null : l.id)} className="w-full text-right bg-white rounded-2xl border border-slate-100 ft-shadow p-4 hover-lift">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg}`}>{ACT_LABELS[l.action] || l.action}</span>
                    {l.entity && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{AUDIT_ENTITY_LABEL[l.entity] || l.entity}</span>}
                    <span className="text-xs text-slate-400 mr-auto">{timeAgo(l.created_at)}</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2 truncate">{l.user_email || "النظام"}</div>
                  {open && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5" dir="ltr" style={{ textAlign: "right" }}>
                      {l.entity_id && <div>entity_id: <span className="font-mono">{String(l.entity_id)}</span></div>}
                      {meta.length > 0 ? meta.map(([k, v]) => (
                        <div key={k}>{k}: <span className="font-mono text-slate-700">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span></div>
                      )) : <div className="text-slate-400">لا تفاصيل إضافية</div>}
                      {l.ip && <div>ip: <span className="font-mono">{l.ip}</span></div>}
                    </div>
                  )}
                </button>
              </Item>
            );
          })}
        </Stagger>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">السابق</Button>
          <span className="text-sm text-slate-500">صفحة {page} من {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">التالي</Button>
        </div>
      )}
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
    <h3 className="font-head font-bold text-lg mb-4">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);
const Empty = ({ t }) => <div className="text-center py-6 text-slate-400 text-sm">{t}</div>;

function StudioPanel() {
  const [queue, setQueue] = useState(null);
  const [note, setNote] = useState({});
  const [expanded, setExpanded] = useState(null);
  const load = async () => { const { data } = await api.get("/studio/queue"); setQueue(data); };
  useEffect(() => { load(); }, []);
  const review = async (id, action) => {
    try {
      await api.post(`/studio/works/${id}/${action}`, { note: note[id] || "" });
      toast.success(action === "approve" ? "تم النشر 🎉" : "تم الرفض مع الملاحظة");
      setNote({ ...note, [id]: "" }); load();
    } catch (e) { toast.error(apiErr(e)); }
  };
  if (!queue) return <PageLoader />;
  return (
    <div className="space-y-4">
      {queue.length === 0 && <Empty t="لا أعمال بانتظار المراجعة 🎉" />}
      {queue.map((w) => (
        <div key={w.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="font-bold text-slate-900">{w.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{w.author_name} · {w.type_label}</div>
            </div>
            <button onClick={() => setExpanded(expanded === w.id ? null : w.id)} className="text-sm text-violet-600 font-medium">
              {expanded === w.id ? "إخفاء النص" : "قراءة النص"}
            </button>
          </div>
          {expanded === w.id && <div className="whitespace-pre-wrap text-sm text-slate-600 leading-loose bg-slate-50 rounded-xl p-4 mb-3 max-h-64 overflow-y-auto">{w.content}</div>}
          <Input value={note[w.id] || ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })} placeholder="ملاحظة للكاتب (تظهر عند الرفض، اختيارية عند القبول)..." className="rounded-xl mb-3" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => review(w.id, "approve")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 ml-1" /> نشر</Button>
            <Button size="sm" variant="outline" onClick={() => review(w.id, "reject")} className="rounded-xl text-rose-600 border-rose-200"><X className="w-4 h-4 ml-1" /> رفض</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgesPanel() {
  const { hasPerm } = useAuth();
  const [defs, setDefs] = useState([]);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [selBadge, setSelBadge] = useState("");
  const [form, setForm] = useState({ key: "", name: "", description: "", criteria: "", icon: "Award", color: "#059669" });
  const load = async () => { const { data } = await api.get("/badges"); setDefs(data); };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/users", { params: { q } }); setUsers(data.items || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const award = async () => {
    if (!selUser || !selBadge) return toast.error("اختر المستخدم والشارة");
    try { await api.post("/badges/award", { user_id: selUser.id, badge_key: selBadge }); toast.success(`مُنحت شارة ${defs.find((d) => d.key === selBadge)?.name} لـ ${selUser.name} 🏅`); setSelUser(null); setQ(""); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const create = async () => {
    if (!form.key.trim() || !form.name.trim()) return toast.error("المفتاح والاسم مطلوبان");
    try { await api.post("/badges", form); toast.success("أُضيفت الشارة"); setForm({ key: "", name: "", description: "", criteria: "", icon: "Award", color: "#059669" }); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  return (
    <div className="space-y-6">
      <Section title="منح شارة لطالب">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن طالب بالاسم أو البريد..." className="rounded-xl" />
        {users.length > 0 && !selUser && (
          <div className="border border-slate-100 rounded-xl divide-y max-h-44 overflow-y-auto">
            {users.slice(0, 6).map((u) => (
              <button key={u.id} onClick={() => setSelUser(u)} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-sm">
                <span className="font-medium">{u.name}</span> <span className="text-slate-400 text-xs">{u.email}</span>
              </button>
            ))}
          </div>
        )}
        {selUser && <div className="flex items-center gap-2 text-sm bg-emerald-50 rounded-xl px-3 py-2"><Check className="w-4 h-4 text-emerald-600" />{selUser.name}<button onClick={() => setSelUser(null)} className="mr-auto text-slate-400"><X className="w-4 h-4" /></button></div>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {defs.map((d) => (
            <button key={d.key} onClick={() => setSelBadge(d.key)} className={`p-3 rounded-xl border text-sm transition-colors ${selBadge === d.key ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>
              <div className="font-bold">{d.name}</div>
            </button>
          ))}
        </div>
        <Button onClick={award} className="rounded-xl bg-amber-600 hover:bg-amber-700"><Medal className="w-4 h-4 ml-1" /> منح الشارة</Button>
      </Section>

      {hasPerm("badge.manage") && (
        <Section title="تعريف شارة جديدة">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>المفتاح (إنجليزي)</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.replace(/\s/g, "_") })} placeholder="leadership" className="rounded-xl mt-1" dir="ltr" /></div>
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="قائد ملهم" className="rounded-xl mt-1" /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1" /></div>
            <div className="sm:col-span-2"><Label>معايير الحصول عليها</Label><Input value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>اللون</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl mt-1 h-10" /></div>
            <div><Label>الأيقونة (lucide)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Award" className="rounded-xl mt-1" dir="ltr" /></div>
          </div>
          <Button onClick={create} className="rounded-xl"><Plus className="w-4 h-4 ml-1" /> إضافة الشارة</Button>
        </Section>
      )}

      <Section title={`الشارات المعرفة (${defs.length})`}>
        <div className="grid sm:grid-cols-2 gap-2">
          {defs.map((d) => (
            <div key={d.key} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: d.color }}><Medal className="w-5 h-5" /></div>
              <div className="text-sm"><div className="font-bold text-slate-800">{d.name}</div><div className="text-xs text-slate-400">{d.criteria || d.description}</div></div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function BooksPanel() {
  const { hasPerm } = useAuth();
  const nav = useNavigate();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editProgress, setEditProgress] = useState(0);
  const [form, setForm] = useState({ title: "", author: "", category: "general", description: "" });
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPdf, setEditPdf] = useState(null);
  const [editCover, setEditCover] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/books", { params: { q: q || undefined, status, limit: 100 } });
      setBooks(data.items || []); setTotal(data.total || 0);
    } catch { setBooks([]); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const upload = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) return toast.error("العنوان والمؤلف مطلوبان");
    if (!pdf) return toast.error("اختر ملف PDF");
    if (pdf.size > MAX_PDF_SIZE) return toast.error("حجم ملف الـ PDF يتجاوز الحد الأقصى 100MB");
    setUploading(true);
    setUploadProgress(0);
    try {
      let data;
      if (pdf.size > CHUNK_THRESHOLD) {
        // ملفات كبيرة: رفع مجزأ قابل للاستئناف (حتى 100MB)
        const { upload_id, chunk_size, total_parts } = await startChunkedUpload(pdf);
        await uploadChunks(pdf, upload_id, chunk_size, total_parts, (done, total) =>
          setUploadProgress(Math.round((done / total) * 100)));
        let cover_b64 = null, cover_ct = null;
        if (cover) {
          const c = await fileToBase64(await compressCoverImage(cover));
          cover_b64 = c.b64; cover_ct = c.type;
        }
        data = await completeChunkedUpload(upload_id, "book_create", {
          title: form.title, author: form.author, category: form.category,
          description: form.description, cover_b64, cover_ct,
        });
      } else {
        const fd = new FormData();
        fd.append("title", form.title); fd.append("author", form.author);
        fd.append("category", form.category); fd.append("description", form.description);
        fd.append("pdf", pdf);
        if (cover) fd.append("cover", await compressCoverImage(cover));
        ({ data } = await api.post("/books", fd));
      }
      toast.success(data.status === "approved" ? "تم رفع الكتاب ونشره مباشرة 📚" : "تم رفع الكتاب");
      setForm({ title: "", author: "", category: "general", description: "" });
      setPdf(null); setCover(null);
      load();
    } catch (err) { toast.error(apiErr(err)); } finally { setUploading(false); setUploadProgress(0); }
  };

  const del = async (b) => {
    if (!window.confirm(`حذف "${b.title}" نهائياً؟`)) return;
    try { await api.delete(`/books/${b.id}`); toast.success("تم حذف الكتاب"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const openEdit = async (b) => {
    try {
      const { data } = await api.get(`/books/${b.id}`);
      setEditing(data);
      setEditForm({
        title: data.title || "", author: data.author || "", category: data.category || "general",
        description: data.description || "", language: data.language || "العربية",
        pages: data.pages || "", year: data.year || "", publisher: data.publisher || "",
        age: data.age || "عام", tags: (data.tags || []).join(", "),
      });
      setEditPdf(null); setEditCover(null);
    } catch { toast.error("تعذر تحميل بيانات الكتاب"); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.author.trim()) return toast.error("العنوان والمؤلف مطلوبان");
    if (editPdf && editPdf.size > MAX_PDF_SIZE) return toast.error("حجم ملف الـ PDF يتجاوز الحد الأقصى 100MB");
    setSavingEdit(true);
    setEditProgress(0);
    try {
      if (editPdf && editPdf.size > CHUNK_THRESHOLD) {
        // استبدال ملف PDF كبير: رفع مجزأ ثم حفظ بيانات الكتاب
        const { upload_id, chunk_size, total_parts } = await startChunkedUpload(editPdf);
        await uploadChunks(editPdf, upload_id, chunk_size, total_parts, (done, total) =>
          setEditProgress(Math.round((done / total) * 100)));
        await completeChunkedUpload(upload_id, "book_replace", { book_id: editing.id });
        const fd = new FormData();
        ["title", "author", "category", "description", "language", "publisher", "age", "tags"].forEach((k) => fd.append(k, editForm[k] ?? ""));
        if (editForm.pages !== "" && editForm.pages != null) fd.append("pages", editForm.pages);
        if (editForm.year !== "" && editForm.year != null) fd.append("year", editForm.year);
        if (editCover) fd.append("cover", await compressCoverImage(editCover));
        await api.patch(`/books/${editing.id}`, fd);
      } else {
        const fd = new FormData();
        ["title", "author", "category", "description", "language", "publisher", "age", "tags"].forEach((k) => fd.append(k, editForm[k] ?? ""));
        if (editForm.pages !== "" && editForm.pages != null) fd.append("pages", editForm.pages);
        if (editForm.year !== "" && editForm.year != null) fd.append("year", editForm.year);
        if (editPdf) fd.append("pdf", editPdf);
        if (editCover) fd.append("cover", await compressCoverImage(editCover));
        await api.patch(`/books/${editing.id}`, fd);
      }
      toast.success("تم حفظ التعديلات ✅");
      setEditing(null); load();
    } catch (err) { toast.error(apiErr(err)); } finally { setSavingEdit(false); setEditProgress(0); }
  };

  const statusLabel = { approved: "معتمد", pending: "معلّق", rejected: "مرفوض" };
  const statusColor = { approved: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", rejected: "bg-rose-50 text-rose-700" };

  return (
    <div className="space-y-6">
      <Section title="رفع كتاب جديد">
        <form onSubmit={upload} className="grid sm:grid-cols-2 gap-3">
          <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl mt-1" /></div>
          <div><Label>المؤلف *</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="rounded-xl mt-1" /></div>
          <div>
            <Label>التصنيف</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">عام</SelectItem><SelectItem value="novels">روايات</SelectItem>
                <SelectItem value="culture">ثقافة</SelectItem><SelectItem value="science">علوم</SelectItem>
                <SelectItem value="selfdev">تطوير ذات</SelectItem><SelectItem value="kids">أطفال</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>ملف PDF *</Label><Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] || null)} className="rounded-xl mt-1" /></div>
          <div><Label>صورة الغلاف</Label><Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} className="rounded-xl mt-1" /></div>
          <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1" rows={2} /></div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={uploading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <Upload className="w-4 h-4 ml-1" /> {uploading ? "جارٍ الرفع..." : "رفع الكتاب"}
            </Button>
            {uploading && uploadProgress > 0 && (
              <div className="space-y-1.5 mt-3">
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-xs text-slate-500 text-center">جارٍ رفع الملف… {uploadProgress}%</div>
              </div>
            )}
          </div>
        </form>
      </Section>

      <Section title={`كل الكتب (${total})`}>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعنوان أو المؤلف..." className="rounded-xl pr-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-xl sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem><SelectItem value="approved">معتمدة</SelectItem>
              <SelectItem value="pending">معلّقة</SelectItem><SelectItem value="rejected">مرفوضة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {books.length === 0 ? <Empty t="لا كتب" /> : (
          <Stagger className="space-y-3 max-h-[560px] overflow-y-auto pl-1">
            {books.map((b) => (
              <Item key={b.id} className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 hover-lift">
                <div className="flex gap-3">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-14 h-20 sm:w-16 sm:h-24 object-cover rounded-xl shrink-0" />
                  ) : (
                    <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 grid place-items-center shrink-0">
                      <BookOpen className="w-6 h-6 text-emerald-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-bold text-slate-800 truncate">{b.title}</div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[b.status] || "bg-slate-100 text-slate-600"}`}>
                        {statusLabel[b.status] || b.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate">{b.author}{b.uploader_name ? ` · رفع: ${b.uploader_name}` : ""}</div>
                    {(b.rating_avg > 0 || b.views > 0) && (
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        {b.rating_avg > 0 && <span className="text-amber-500 font-medium">★ {Number(b.rating_avg).toFixed(1)} <span className="text-slate-400">({b.rating_count || 0})</span></span>}
                        {b.views > 0 && <span>{b.views} مشاهدة</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {hasPerm("book.edit") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="rounded-xl h-10 text-xs sm:text-sm">
                        <PenLine className="w-4 h-4 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => nav(`/admin/books/${b.id}/reviews`)} className="rounded-xl h-10 text-xs sm:text-sm">
                        <MessageSquare className="w-4 h-4 ml-1" /> المراجعات
                      </Button>
                    </>
                  )}
                  {hasPerm("book.delete") && (
                    <Button size="sm" variant="outline" onClick={() => del(b)} className={`rounded-xl h-10 text-xs sm:text-sm text-rose-600 border-rose-200 ${hasPerm("book.edit") ? "" : "col-span-3"}`}>
                      <Trash2 className="w-4 h-4 ml-1" /> حذف
                    </Button>
                  )}
                </div>
              </Item>
            ))}
          </Stagger>
        )}
      </Section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل الكتاب</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="grid sm:grid-cols-2 gap-3">
            <div><Label>العنوان *</Label><Input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>المؤلف *</Label><Input value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} className="rounded-xl mt-1" /></div>
            <div>
              <Label>التصنيف</Label>
              <Select value={editForm.category || "general"} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">عام</SelectItem><SelectItem value="novels">روايات</SelectItem>
                  <SelectItem value="culture">ثقافة</SelectItem><SelectItem value="science">علوم</SelectItem>
                  <SelectItem value="selfdev">تطوير ذات</SelectItem><SelectItem value="kids">أطفال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>اللغة</Label><Input value={editForm.language || ""} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>عدد الصفحات</Label><Input type="number" min="0" value={editForm.pages ?? ""} onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>سنة النشر</Label><Input type="number" min="0" value={editForm.year ?? ""} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>دار النشر</Label><Input value={editForm.publisher || ""} onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })} className="rounded-xl mt-1" /></div>
            <div><Label>الفئة العمرية</Label><Input value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="rounded-xl mt-1" /></div>
            <div className="sm:col-span-2"><Label>الوسوم (افصل بفاصلة)</Label><Input value={editForm.tags || ""} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="rounded-xl mt-1" /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="rounded-xl mt-1" rows={3} /></div>
            <div><Label>استبدال ملف PDF <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالي)</span></Label><Input type="file" accept="application/pdf" onChange={(e) => setEditPdf(e.target.files?.[0] || null)} className="rounded-xl mt-1" /></div>
            <div><Label>استبدال الغلاف <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالي)</span></Label><Input type="file" accept="image/*" onChange={(e) => setEditCover(e.target.files?.[0] || null)} className="rounded-xl mt-1" /></div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {savingEdit ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
          {savingEdit && editProgress > 0 && (
            <div className="space-y-1.5 mt-2">
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${editProgress}%` }} />
              </div>
              <div className="text-xs text-slate-500 text-center">جارٍ رفع الملف… {editProgress}%</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

const CERT_TEXT_FIELDS = [
  { k: "org_name", l: "اسم المنصة (أعلى الشهادة)" },
  { k: "country_line", l: "السطر الثاني (الدولة)" },
  { k: "main_title", l: "العنوان الرئيسي" },
  { k: "award_label", l: "عبارة المنح" },
  { k: "footer_right", l: "تذييل الشهادة" },
];
const CERT_COLOR_FIELDS = [
  { k: "color_primary", l: "اللون الرئيسي" },
  { k: "color_dark", l: "اللون الداكن" },
  { k: "color_muted", l: "اللون الباهت" },
  { k: "bg_color", l: "لون الخلفية" },
];

function CertificatesPanel() {
  const [tpl, setTpl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [awardForm, setAwardForm] = useState({ title_line: "", subtitle: "", meta: "" });
  const [awarded, setAwarded] = useState([]);

  const load = async () => {
    try {
      const [{ data: t }, { data: a }] = await Promise.all([
        api.get("/certificates/admin/template"),
        api.get("/certificates/admin/awarded"),
      ]);
      setTpl(t); setAwarded(a);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/users", { params: { q } }); setUsers(data.items || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const saveTpl = async () => {
    setSaving(true);
    try { const { data } = await api.put("/certificates/admin/template", tpl); setTpl(data); toast.success("حُفظ قالب الشهادة 🎨"); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };

  const award = async () => {
    if (!selUser) return toast.error("اختر المستخدم");
    if (!awardForm.title_line.trim()) return toast.error("اكتب سبب الشهادة");
    try {
      await api.post("/certificates/admin/award", {
        user_id: selUser.id,
        title_line: awardForm.title_line,
        subtitle: awardForm.subtitle,
        meta_lines: awardForm.meta.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast.success(`مُنحت الشهادة لـ ${selUser.name} 🏅`);
      setSelUser(null); setQ(""); setAwardForm({ title_line: "", subtitle: "", meta: "" });
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const del = async (c) => {
    if (!window.confirm(`حذف شهادة "${c.title_line}" لـ ${c.user_name}؟`)) return;
    try { await api.delete(`/certificates/admin/awarded/${c.id}`); toast.success("حُذفت الشهادة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!tpl) return <Empty t="جارٍ التحميل..." />;

  return (
    <div className="space-y-6">
      <Section title="تخصيص قالب الشهادة">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {CERT_TEXT_FIELDS.map((f) => (
              <div key={f.k}><Label>{f.l}</Label>
                <Input value={tpl[f.k] || ""} onChange={(e) => setTpl({ ...tpl, [f.k]: e.target.value })} className="rounded-xl mt-1" />
              </div>
            ))}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CERT_COLOR_FIELDS.map((f) => (
                <div key={f.k}><Label>{f.l}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="color" value={tpl[f.k] || "#000000"} onChange={(e) => setTpl({ ...tpl, [f.k]: e.target.value })} className="rounded-xl h-10 w-14 p-1" />
                    <span className="text-xs text-slate-400" dir="ltr">{tpl[f.k]}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={saveTpl} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <Check className="w-4 h-4 ml-1" /> {saving ? "جارٍ الحفظ..." : "حفظ القالب"}
            </Button>
          </div>
          {/* live preview */}
          <div>
            <Label>معاينة حية</Label>
            <div className="mt-1 rounded-2xl border-8 p-6 text-center relative overflow-hidden" style={{ borderColor: tpl.color_primary, background: tpl.bg_color }}>
              <div className="absolute inset-2 border rounded-xl pointer-events-none" style={{ borderColor: tpl.color_dark }} />
              <div className="font-bold text-lg" style={{ color: tpl.color_primary }}>{tpl.org_name}</div>
              <div className="text-xs" style={{ color: tpl.color_muted }}>{tpl.country_line}</div>
              <div className="font-extrabold text-3xl my-4" style={{ color: tpl.color_dark }}>{tpl.main_title}</div>
              <div className="text-sm" style={{ color: tpl.color_muted }}>{tpl.award_label}</div>
              <div className="font-bold text-2xl my-2" style={{ color: tpl.color_primary }}>اسم الطالب</div>
              <div className="text-xs mt-4 flex justify-between" style={{ color: tpl.color_muted }}>
                <span>{new Date().toISOString().slice(0, 10)}</span><span>{tpl.footer_right}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="منح شهادة لمستخدم">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مستخدم بالاسم أو البريد..." className="rounded-xl" />
        {users.length > 0 && !selUser && (
          <div className="border border-slate-100 rounded-xl divide-y max-h-44 overflow-y-auto">
            {users.slice(0, 6).map((u) => (
              <button key={u.id} onClick={() => setSelUser(u)} className="w-full text-right px-3 py-2 hover:bg-slate-50 text-sm">
                <span className="font-medium">{u.name}</span> <span className="text-slate-400 text-xs">{u.email}</span>
              </button>
            ))}
          </div>
        )}
        {selUser && <div className="flex items-center gap-2 text-sm bg-emerald-50 rounded-xl px-3 py-2"><Check className="w-4 h-4 text-emerald-600" />{selUser.name}<button onClick={() => setSelUser(null)} className="mr-auto text-slate-400"><X className="w-4 h-4" /></button></div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>سبب الشهادة *</Label><Input value={awardForm.title_line} onChange={(e) => setAwardForm({ ...awardForm, title_line: e.target.value })} placeholder="مثال: لتفوقه في مسابقة القراءة" className="rounded-xl mt-1" /></div>
          <div><Label>سطر إضافي (اختياري)</Label><Input value={awardForm.subtitle} onChange={(e) => setAwardForm({ ...awardForm, subtitle: e.target.value })} placeholder="مثال: المركز الأول" className="rounded-xl mt-1" /></div>
          <div className="sm:col-span-2"><Label>تفاصيل (سطر لكل سطر)</Label><Textarea value={awardForm.meta} onChange={(e) => setAwardForm({ ...awardForm, meta: e.target.value })} placeholder={"مثال:\nالنتيجة: 95%\nبتاريخ 2026-09-30"} className="rounded-xl mt-1" rows={3} /></div>
        </div>
        <Button onClick={award} className="rounded-xl bg-amber-600 hover:bg-amber-700"><Award className="w-4 h-4 ml-1" /> منح الشهادة</Button>
      </Section>

      <Section title={`الشهادات الممنوحة (${awarded.length})`}>
        {awarded.length === 0 ? <Empty t="لا شهادات ممنوحة بعد" /> : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {awarded.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{c.user_name}</div>
                  <div className="text-xs text-slate-400 truncate">{c.title_line}{c.subtitle ? ` · ${c.subtitle}` : ""} · {String(c.created_at || "").slice(0, 10)}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => del(c)} className="rounded-lg text-rose-600 border-rose-200 shrink-0">
                  <Trash2 className="w-4 h-4 ml-1" /> حذف
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------------- Announcement banners manager ---------------- */
const BG_PRESETS = ["#059669", "#2563EB", "#7C3AED", "#D97706", "#E11D48", "#0891B2", "#0A192F"];

function bannerStatus(b) {
  if (!b.active) return { l: "معطّل", c: "bg-slate-100 text-slate-500" };
  const now = new Date();
  if (b.ends_at && new Date(b.ends_at) < now) return { l: "منتهي", c: "bg-rose-50 text-rose-700" };
  if (b.starts_at && new Date(b.starts_at) > now) return { l: "مجدول", c: "bg-amber-50 text-amber-700" };
  return { l: "نشط", c: "bg-emerald-50 text-emerald-700" };
}

function BannersPanel() {
  const [banners, setBanners] = useState(null);
  const [dialog, setDialog] = useState(null); // null | "new" | banner obj
  const [f, setF] = useState({ text: "", link: "", bg: BG_PRESETS[0], starts_at: "", ends_at: "", active: true });
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { const { data } = await api.get("/admin/announcements"); setBanners(data.banners || []); }
    catch { setBanners([]); }
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const openNew = () => { setF({ text: "", link: "", bg: BG_PRESETS[0], starts_at: "", ends_at: "", active: true }); setDialog("new"); };
  const openEdit = (b) => {
    setF({
      text: b.text || "", link: b.link || "", bg: b.bg || BG_PRESETS[0],
      starts_at: (b.starts_at || "").slice(0, 16), ends_at: (b.ends_at || "").slice(0, 16),
      active: b.active !== false,
    });
    setDialog(b);
  };
  const toISO = (v) => (v ? new Date(v).toISOString() : null);
  const save = async () => {
    if (!f.text.trim()) return toast.error("نص اللافتة مطلوب");
    setSaving(true);
    try {
      const payload = { text: f.text.trim(), link: f.link.trim() || null, bg: f.bg, starts_at: toISO(f.starts_at), ends_at: toISO(f.ends_at), active: !!f.active };
      if (dialog === "new") { await api.post("/admin/announcements", payload); toast.success("أُضيفت اللافتة 📢"); }
      else { await api.patch(`/admin/announcements/${dialog.id}`, payload); toast.success("تم حفظ التعديلات ✅"); }
      setDialog(null); load();
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (b) => {
    if (!window.confirm("حذف هذه اللافتة نهائياً؟")) return;
    try { await api.delete(`/admin/announcements/${b.id}`); toast.success("تم حذف اللافتة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  if (!banners) return <PageLoader />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">لافتات تظهر أعلى الموقع لجميع الزوار · مثالية للتنبيهات المهمة.</p>
        <Button onClick={openNew} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> لافتة جديدة</Button>
      </div>
      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow"><Empty t="لا لافتات بعد · أنشئ أول لافتة بالأعلى" /></div>
      ) : (
        <Stagger className="space-y-3">
          {banners.map((b) => {
            const s = bannerStatus(b);
            return (
              <Item key={b.id} className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
                {/* live preview */}
                <div className="py-2.5 px-4 text-center text-white text-sm font-bold" style={{ background: b.bg || "#059669" }}>
                  {b.text}
                </div>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${s.c}`}>{s.l}</span>
                  <div className="text-xs text-slate-400 flex-1 min-w-0 space-y-1">
                    {b.link && <div className="flex items-center gap-1 truncate" dir="ltr"><Link2 className="w-3.5 h-3.5 shrink-0" />{b.link}</div>}
                    {(b.starts_at || b.ends_at) && (
                      <div>من {b.starts_at ? String(b.starts_at).slice(0, 16).replace("T", " ") : "·"} إلى {b.ends_at ? String(b.ends_at).slice(0, 16).replace("T", " ") : "·"}</div>
                    )}
                    <div>أُنشئت {String(b.created_at || "").slice(0, 10)}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="rounded-xl h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>
                    <Button size="sm" variant="outline" onClick={() => del(b)} className="rounded-xl h-10 text-rose-600 border-rose-200"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog === "new" ? "لافتة إعلان جديدة" : "تعديل اللافتة"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* live preview inside dialog */}
            <div>
              <Label>معاينة حية</Label>
              <div className="mt-1.5 py-2.5 px-4 rounded-xl text-center text-white text-sm font-bold" style={{ background: f.bg }}>
                {f.text.trim() || "نص اللافتة سيظهر هنا…"}
              </div>
            </div>
            <div><Label>النص *</Label><Textarea value={f.text} onChange={(e) => set("text")(e.target.value)} rows={2} className="rounded-xl mt-1" placeholder="مثال: التسجيل في مسابقة القراءة مفتوح الآن! 🎉" /></div>
            <div><Label>الرابط (اختياري · عند النقر على اللافتة)</Label><Input value={f.link} onChange={(e) => set("link")(e.target.value)} dir="ltr" className="rounded-xl mt-1" placeholder="/competitions" /></div>
            <div>
              <Label>لون الخلفية</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {BG_PRESETS.map((c) => (
                  <button key={c} type="button" onClick={() => set("bg")(c)}
                    className={`w-9 h-9 rounded-xl transition-transform ${f.bg === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"}`}
                    style={{ background: c }} aria-label={c} />
                ))}
                <input type="color" value={f.bg} onChange={(e) => set("bg")(e.target.value)} className="w-9 h-9 rounded-xl cursor-pointer border border-slate-200" title="لون مخصص" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>تبدأ (اختياري)</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at")(e.target.value)} className="rounded-xl mt-1" /></div>
              <div><Label>تنتهي (اختياري)</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at")(e.target.value)} className="rounded-xl mt-1" /></div>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
              <button type="button" role="switch" aria-checked={f.active} onClick={() => set("active")(!f.active)}
                className={`w-11 h-6 rounded-full transition-colors relative ${f.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${f.active ? "right-0.5" : "left-0.5"}`} />
              </button>
              لافتة مفعّلة
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ اللافتة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Data export center ---------------- */
const EXPORT_DEFS = [
  { k: "users", l: "المستخدمون", d: "الاسم، البريد، الدور، النقاط، المدرسة…", icon: Users, c: "#2563EB", path: "/admin/users",
    cols: [{ k: "name", l: "الاسم" }, { k: "email", l: "البريد" }, { k: "role", l: "الدور" }, { k: "xp", l: "النقاط" }, { k: "level", l: "المستوى" }, { k: "school_name", l: "المدرسة" }, { k: "governorate", l: "المحافظة" }, { k: "created_at", l: "تاريخ التسجيل" }] },
  { k: "books", l: "الكتب", d: "العنوان، المؤلف، التصنيف، الحالة…", icon: BookOpen, c: "#D97706", path: "/books",
    cols: [{ k: "title", l: "العنوان" }, { k: "author", l: "المؤلف" }, { k: "category", l: "التصنيف" }, { k: "status", l: "الحالة" }, { k: "language", l: "اللغة" }, { k: "pages", l: "الصفحات" }, { k: "year", l: "السنة" }, { k: "uploader_name", l: "الرافع" }, { k: "created_at", l: "تاريخ الرفع" }] },
  { k: "events", l: "الفعاليات", d: "العنوان، التاريخ، المكان، المشاركون…", icon: Calendar, c: "#7C3AED", path: "/events",
    cols: [{ k: "title", l: "العنوان" }, { k: "date", l: "التاريخ" }, { k: "time", l: "الوقت" }, { k: "location", l: "المكان" }, { k: "mode", l: "النمط" }, { k: "scope", l: "النطاق" }, { k: "capacity", l: "السعة" }, { k: "registered_count", l: "المسجلون" }] },
  { k: "competitions", l: "المسابقات", d: "العنوان، النوع، البداية، النهاية…", icon: Trophy, c: "#0891B2", path: "/competitions",
    cols: [{ k: "title", l: "العنوان" }, { k: "type", l: "النوع" }, { k: "start_at", l: "تبدأ" }, { k: "end_at", l: "تنتهي" }, { k: "duration_minutes", l: "المدة (د)" }] },
  { k: "clubs", l: "الأندية", d: "الاسم، الرابط، الوصف، الأعضاء…", icon: Users, c: "#059669", path: "/clubs",
    cols: [{ k: "name", l: "الاسم" }, { k: "slug", l: "الرابط" }, { k: "description", l: "الوصف" }, { k: "members_count", l: "الأعضاء" }] },
];

const fetchAll = async (path) => {
  const items = [];
  let page = 1;
  for (;;) {
    const { data } = await api.get(path, { params: { page, limit: 500 } });
    if (Array.isArray(data)) { items.push(...data); break; }
    const chunk = data.items || [];
    items.push(...chunk);
    if (chunk.length < 500 || (data.total && items.length >= data.total)) break;
    page++;
    if (page > 40) break;
  }
  return items;
};

const rowsToCSV = (cols, rows) => {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("؛ ") : (typeof v === "object" ? JSON.stringify(v) : String(v));
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = cols.map((c) => esc(c.l)).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c.k])).join(","));
  return "﻿" + [head, ...body].join("\n");
};

const downloadCSV = (filename, csv) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

function ExportsPanel() {
  const [busy, setBusy] = useState(null);
  const run = async (def) => {
    setBusy(def.k);
    try {
      const items = await fetchAll(def.path);
      if (items.length === 0) return toast.info("لا بيانات للتصدير");
      downloadCSV(`future-thinkers-${def.k}-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCSV(def.cols, items));
      toast.success(`تم تنزيل ${items.length} سجلاً ✅`);
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(null); }
  };
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">تصدير فوري لبيانات المنصة بصيغة CSV (متوافقة مع Excel بالعربية) · تُحمَّل مباشرة من جهازك.</p>
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORT_DEFS.map((d) => (
          <Item key={d.k} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift flex flex-col">
            <div className="w-12 h-12 rounded-2xl grid place-items-center mb-3" style={{ background: `${d.c}15`, color: d.c }}>
              <d.icon className="w-6 h-6" />
            </div>
            <div className="font-head font-bold text-slate-900">{d.l}</div>
            <div className="text-xs text-slate-400 mt-1 flex-1">{d.d}</div>
            <Button onClick={() => run(d)} disabled={!!busy} className="mt-4 rounded-xl w-full h-11" style={{ background: d.c }}>
              {busy === d.k ? "جارٍ التجهيز…" : <><Download className="w-4 h-4 ml-1" /> تنزيل CSV</>}
            </Button>
          </Item>
        ))}
      </Stagger>
    </div>
  );
}

/* ---------------- Content calendar ---------------- */
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
const CAL_TYPE_META = {
  event: { l: "فعالية", c: "#7C3AED", link: (i) => `/events/${i.ref}` },
  comp: { l: "مسابقة", c: "#D97706", link: (i) => `/competitions/${i.ref}` },
  news: { l: "خبر", c: "#0891B2", link: () => "/news" },
};

function CalendarPanel() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [items, setItems] = useState(null);
  const [selDay, setSelDay] = useState(null);
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const [ev, co, nw] = await Promise.all([
          api.get("/events", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
          api.get("/competitions", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
          api.get("/news", { params: { limit: 1000 } }).catch(() => ({ data: { items: [] } })),
        ]);
        const norm = [];
        (ev.data.items || []).forEach((e) => {
          const d = String(e.date || "").slice(0, 10);
          if (d) norm.push({ type: "event", date: d, title: e.title, ref: e.id, sub: [e.time, e.location].filter(Boolean).join(" · ") });
        });
        (co.data.items || []).forEach((c) => {
          const d = String(c.start_at || "").slice(0, 10);
          if (d) norm.push({ type: "comp", date: d, title: c.title, ref: c.id, sub: c.end_at ? `تنتهي ${String(c.end_at).slice(0, 10)}` : "" });
        });
        (nw.data.items || []).forEach((n) => {
          const d = String(n.created_at || "").slice(0, 10);
          if (d) norm.push({ type: "news", date: d, title: n.title, ref: null, sub: n.category || "" });
        });
        setItems(norm);
      } catch { setItems([]); }
    })();
  }, []);
  const { y, m } = ym;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = (first.getDay() + 1) % 7; // Saturday-first week
  const byDate = {};
  (items || []).forEach((i) => { (byDate[i.date] = byDate[i.date] || []).push(i); });
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const shift = (d) => { const dt = new Date(y, m + d); setYm({ y: dt.getFullYear(), m: dt.getMonth() }); };
  const selItems = selDay ? byDate[selDay] || [] : [];
  if (!items) return <PageLoader />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-head font-bold text-lg">تقويم المحتوى · <span className="text-emerald-700">{AR_MONTHS[m]} {y}</span></h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => shift(-1)} className="rounded-xl">الشهر السابق</Button>
          <Button size="sm" variant="outline" onClick={() => { setYm({ y: now.getFullYear(), m: now.getMonth() }); }} className="rounded-xl">اليوم</Button>
          <Button size="sm" variant="outline" onClick={() => shift(1)} className="rounded-xl">الشهر التالي</Button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        {Object.entries(CAL_TYPE_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: v.c }} />{v.l}</span>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 ft-shadow p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {AR_WEEKDAYS.map((d) => <div key={d} className="text-center text-[11px] sm:text-xs font-bold text-slate-400 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayItems = byDate[ds] || [];
            const isToday = ds === todayStr;
            return (
              <button key={day} onClick={() => dayItems.length && setSelDay(ds)}
                className={`min-h-[52px] sm:min-h-[86px] rounded-xl border p-1 sm:p-1.5 text-right transition-colors flex flex-col ${isToday ? "border-emerald-400 bg-emerald-50/50" : "border-slate-100 bg-slate-50/60 hover:bg-slate-100"} ${dayItems.length ? "cursor-pointer" : "cursor-default"}`}>
                <span className={`text-xs sm:text-sm font-bold w-6 h-6 grid place-items-center rounded-full ${isToday ? "bg-emerald-600 text-white" : "text-slate-600"}`}>{day}</span>
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayItems.slice(0, 2).map((it, j) => (
                    <div key={j} className="flex items-center gap-1 text-[10px] sm:text-[11px] leading-tight">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CAL_TYPE_META[it.type].c }} />
                      <span className="truncate text-slate-600">{it.title}</span>
                    </div>
                  ))}
                  {dayItems.length > 2 && <div className="text-[10px] text-slate-400 font-medium">+{dayItems.length - 2} المزيد</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <Dialog open={!!selDay} onOpenChange={(o) => !o && setSelDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>محتوى يوم {selDay}</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {selItems.map((it, i) => {
              const meta = CAL_TYPE_META[it.type];
              return (
                <button key={i} onClick={() => { setSelDay(null); nav(meta.link(it)); }}
                  className="w-full text-right flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.c }} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-slate-800 truncate">{it.title}</span>
                    <span className="block text-[11px] text-slate-400">{meta.l}{it.sub ? ` · ${it.sub}` : ""}</span>
                  </span>
                  <ArrowLeft className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
