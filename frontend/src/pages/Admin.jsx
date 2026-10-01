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
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { LayoutDashboard, ShieldCheck, Users, BookOpen, Calendar, Trophy, Newspaper, Settings, ScrollText, Plus, Check, X, Megaphone, PenLine, Medal, Award, Upload, Trash2, Search, MessageSquare, Activity, Smartphone, UserPlus, FileCheck, Rocket, Zap, ArrowLeft } from "lucide-react";
import { timeAgo } from "@/components/NotificationsPanel";
import { motion } from "framer-motion";
import { FadeUp, Stagger, Item } from "@/components/anim";

const NAV = [
  { k: "overview", l: "نظرة عامة", icon: LayoutDashboard, perm: "analytics.view" },
  { k: "moderation", l: "مراجعة المحتوى", icon: ShieldCheck, perm: "book.approve" },
  { k: "studio", l: "مراجعة الاستوديو", icon: PenLine, perm: "studio.review" },
  { k: "books", l: "الكتب", icon: BookOpen, perm: ["book.edit", "book.delete"] },
  { k: "badges", l: "شارات المهارات", icon: Medal, perm: "badge.award" },
  { k: "certificates", l: "الشهادات", icon: Award, perm: "certificate.manage" },
  { k: "users", l: "المستخدمون", icon: Users, perm: "user.view" },
  { k: "notify", l: "الإشعارات", icon: Megaphone, perm: "notification.broadcast" },
  { k: "content", l: "الفعاليات والمسابقات", icon: Calendar, perm: "event.create" },
  { k: "news", l: "الأخبار", icon: Newspaper, perm: "news.manage" },
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
            {tab === "overview" && <Overview />}
            {tab === "moderation" && <Moderation />}
            {tab === "studio" && <StudioPanel />}
            {tab === "books" && <BooksPanel />}
            {tab === "badges" && <BadgesPanel />}
            {tab === "certificates" && <CertificatesPanel />}
            {tab === "users" && <UsersPanel />}
            {tab === "notify" && <NotifyPanel />}
            {tab === "content" && <ContentPanel />}
            {tab === "news" && <NewsPanel />}
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
          {totalPending === 0 && <div className="text-center text-sm text-emerald-600 font-medium py-4">كل شيء مُراجع — أحسنت! ✨</div>}
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
                  <div className="text-xs text-slate-400">قاعدة البيانات: {health?.db === "up" ? "متصلة" : "—"}</div>
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
      <EventForm />
      <CompetitionForm />
      <BroadcastForm />
    </div>
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
  const submit = async () => { try { await api.post("/news", f); toast.success("تم نشر الخبر"); setF({ title: "", body: "", category: "منصة", cover_url: "" }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="نشر خبر">
      <Input data-testid="news-title" placeholder="عنوان الخبر" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mb-2" />
      <Input placeholder="رابط صورة (اختياري)" value={f.cover_url} onChange={(e) => setF((x) => ({ ...x, cover_url: e.target.value }))} className="rounded-xl mb-2" />
      <Textarea placeholder="نص الخبر" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl min-h-[140px]" />
      <Button data-testid="publish-news-btn" onClick={submit} className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />نشر</Button>
    </Section>
  );
}

function PointsPanel() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.get("/admin/points-config").then((r) => setCfg(r.data)); }, []);
  const LABELS = { read_book: "قراءة كتاب", review_book: "تقييم كتاب", create_discussion: "إنشاء نقاش", reply_discussion: "رد على نقاش", receive_like: "استلام إعجاب", join_event: "حضور فعالية", win_chess: "فوز بالشطرنج", play_chess: "لعب الشطرنج", daily_checkin: "حضور يومي", join_competition: "دخول مسابقة", win_competition: "فوز بمسابقة", upload_book_approved: "قبول كتاب مرفوع" };
  const save = async () => { await api.put("/admin/points-config", cfg); toast.success("تم حفظ إعدادات النقاط"); };
  if (!cfg) return <PageLoader />;
  return (
    <Section title="نظام النقاط (قابل للتعديل)">
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(cfg).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
            <span className="text-sm text-slate-700">{LABELS[k] || k}</span>
            <Input data-testid={`points-${k}`} type="number" value={v} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-24 rounded-lg h-9 bg-white" />
          </div>
        ))}
      </div>
      <Button data-testid="save-points-btn" onClick={save} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700">حفظ التغييرات</Button>
    </Section>
  );
}

function AuditPanel() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setData(r.data)); }, []);
  if (!data) return <PageLoader />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-x-auto">
      {data.items.map((l) => (
        <div key={l.id} className="px-4 py-2.5 border-b border-slate-50 last:border-0 text-sm flex items-center gap-3 flex-wrap min-w-0">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{l.action}</span>
          <span className="text-slate-700">{l.user_email || "—"}</span>
          <span className="text-slate-400 text-xs">{l.entity} {l.entity_id ? `#${String(l.entity_id).slice(-6)}` : ""}</span>
          <span className="text-slate-300 text-xs mr-auto" dir="ltr">{new Date(l.created_at).toLocaleString("en-GB")}</span>
        </div>
      ))}
      {data.items.length === 0 && <Empty t="لا سجلات بعد" />}
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
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", category: "general", description: "" });
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPdf, setEditPdf] = useState(null);
  const [editCover, setEditCover] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [revBook, setRevBook] = useState(null);
  const [reviews, setReviews] = useState([]);

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
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title); fd.append("author", form.author);
      fd.append("category", form.category); fd.append("description", form.description);
      fd.append("pdf", pdf);
      if (cover) fd.append("cover", cover);
      const { data } = await api.post("/books", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(data.status === "approved" ? "تم رفع الكتاب ونشره مباشرة 📚" : "تم رفع الكتاب");
      setForm({ title: "", author: "", category: "general", description: "" });
      setPdf(null); setCover(null);
      load();
    } catch (err) { toast.error(apiErr(err)); } finally { setUploading(false); }
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
    setSavingEdit(true);
    try {
      const fd = new FormData();
      ["title", "author", "category", "description", "language", "publisher", "age", "tags"].forEach((k) => fd.append(k, editForm[k] ?? ""));
      if (editForm.pages !== "" && editForm.pages != null) fd.append("pages", editForm.pages);
      if (editForm.year !== "" && editForm.year != null) fd.append("year", editForm.year);
      if (editPdf) fd.append("pdf", editPdf);
      if (editCover) fd.append("cover", editCover);
      await api.patch(`/books/${editing.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("تم حفظ التعديلات ✅");
      setEditing(null); load();
    } catch (err) { toast.error(apiErr(err)); } finally { setSavingEdit(false); }
  };

  const openReviews = async (b) => {
    setRevBook(b); setReviews([]);
    try { const { data } = await api.get(`/books/${b.id}/reviews`); setReviews(data || []); }
    catch { setReviews([]); }
  };

  const delReview = async (r) => {
    if (!window.confirm(`حذف مراجعة "${r.user_name || "مستخدم"}"؟`)) return;
    try {
      await api.delete(`/books/${revBook.id}/reviews/${r.id}`);
      toast.success("تم حذف المراجعة");
      setReviews(reviews.filter((x) => x.id !== r.id));
    } catch (e) { toast.error(apiErr(e)); }
  };

  const statusLabel = { approved: "معتمد", pending: "معلّق", rejected: "مرفوض" };

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
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {books.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{b.title}</div>
                  <div className="text-xs text-slate-400">{b.author} · {statusLabel[b.status] || b.status} · {b.uploader_name || ""}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasPerm("book.edit") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="rounded-lg">
                        <PenLine className="w-4 h-4 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReviews(b)} className="rounded-lg">
                        <MessageSquare className="w-4 h-4 ml-1" /> المراجعات
                      </Button>
                    </>
                  )}
                  {hasPerm("book.delete") && (
                    <Button size="sm" variant="outline" onClick={() => del(b)} className="rounded-lg text-rose-600 border-rose-200">
                      <Trash2 className="w-4 h-4 ml-1" /> حذف
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
        </DialogContent>
      </Dialog>

      <Dialog open={!!revBook} onOpenChange={(o) => !o && setRevBook(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>مراجعات: {revBook?.title}</DialogTitle></DialogHeader>
          {reviews.length === 0 ? <Empty t="لا مراجعات بعد" /> : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm text-slate-700">{r.user_name || "مستخدم"}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-sm">{"★".repeat(r.rating || 0)}</span>
                      <Button size="sm" variant="outline" onClick={() => delReview(r)} className="rounded-lg text-rose-600 border-rose-200">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {r.text && <div className="text-sm text-slate-500 mt-1">{r.text}</div>}
                </div>
              ))}
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
