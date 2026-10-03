import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/components/NotificationsPanel";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Users, BookOpen, CalendarDays, Rocket, PenLine, Hourglass, ShieldCheck,
  UserPlus, Sparkles, FileText, Flag, Bug, ArrowLeft, BellRing, CheckCircle2,
} from "lucide-react";

/* نظرة عامة · مركز القيادة
   نفس مصادر بيانات OverviewPanel الحالية (analytics-v2 + system-health + errors)
   مع جلب دفاعي لمسار /admin/overview لأعداد الفعاليات والأعمال والأنشطة المعلّقة. */

const fmt = (n) => (n ?? 0).toLocaleString("en-US");
const TILE_COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dateStr = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
  const timeStr = new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
  return (
    <div className="text-left shrink-0" dir="rtl">
      <div className="font-head font-extrabold text-2xl sm:text-3xl tabular-nums leading-none" data-testid="admin-overview-clock">{timeStr}</div>
      <div className="text-[11px] sm:text-xs text-white/70 mt-1.5 font-medium">{dateStr}</div>
    </div>
  );
}

function ActivityFeed() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    const tick = () => api.get("/admin/activity/recent", { params: { limit: 15 } })
      .then((r) => { if (alive) setItems(r.data?.items || []); })
      .catch(() => { if (alive) setItems((p) => p || []); });
    tick();
    const t = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!items || items.length === 0) return null;
  return (
    <FadeUp>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5" data-testid="admin-overview-activity">
        <h3 className="font-head font-extrabold text-sm text-slate-700 flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" /></span>
          نشاط المنصة المباشر
          <span className="text-[10px] font-bold text-slate-400">يُحدّث كل ٣٠ ثانية</span>
        </h3>
        <div className="mt-3 divide-y divide-slate-50">
          {items.map((a, i) => (
            <div key={a.id || i} className="flex items-center gap-3 py-2.5">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-extrabold grid place-items-center shrink-0">{(a.user_name || "؟").trim().charAt(0)}</span>
              <p className="flex-1 min-w-0 text-xs text-slate-600 truncate"><span className="font-bold text-slate-800">{a.user_name}</span> {a.text}</p>
              <span className="text-[10px] text-slate-400 shrink-0">{a.created_at ? timeAgo(a.created_at) : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </FadeUp>
  );
}

export default function AdminOverview({ onJump, tabs = [] } = {}) {
  const { user } = useAuth();
  const [a, setA] = useState(null); // /admin/analytics-v2
  const [h, setH] = useState(null); // /admin/system-health
  const [ov, setOv] = useState(null); // /admin/overview (defensive extras)
  const [errOpen, setErrOpen] = useState(null);
  useEffect(() => {
    api.get("/admin/analytics-v2").then((r) => setA(r.data)).catch(() => setA({ days: [], totals_30d: {} }));
    api.get("/admin/system-health").then((r) => setH(r.data)).catch(() => setH({}));
    api.get("/admin/overview").then((r) => setOv(r.data)).catch(() => setOv(null));
    api.get("/admin/errors", { params: { status: "open", limit: 1 } })
      .then((r) => setErrOpen(r.data?.counts?.open ?? 0)).catch(() => setErrOpen(null));
  }, []);
  if (!a || !h) return <PageLoader />;

  const t = a.totals_30d || {};
  const col = h.collections || {};
  const pend = h.pending || {};
  const jump = (tab) => { if (onJump) onJump(tab); };
  const allowed = new Set((tabs || []).map((x) => x.k));

  const queue = [
    { l: "معلمون بانتظار الموافقة", v: pend.teachers ?? ov?.teachers_pending ?? 0, tab: "users", icon: UserPlus, c: "#7C3AED" },
    { l: "كتب بانتظار المراجعة", v: pend.books ?? ov?.books_pending ?? 0, tab: "moderation", icon: BookOpen, c: "#2563EB" },
    { l: "أعمال الاستوديو", v: ov?.works_pending ?? 0, tab: "studio", icon: PenLine, c: "#D97706" },
    { l: "أنشطة بانتظار المراجعة", v: ov?.activities_pending ?? 0, tab: "moderation", icon: Sparkles, c: "#059669" },
    { l: "بلاغات مفتوحة", v: pend.reports_open ?? ov?.reports_open ?? 0, tab: "reports", icon: Flag, c: "#dc2626" },
    { l: "أخطاء مفتوحة", v: errOpen ?? 0, tab: "errors", icon: Bug, c: "#D97706" },
  ].filter((q) => allowed.size === 0 || allowed.has(q.tab));
  const totalPending = queue.reduce((s, q) => s + (q.v || 0), 0);

  const stats = [
    { k: "users", l: "إجمالي المستخدمين", v: col.users, icon: Users, c: "#2563EB" },
    { k: "books", l: "إجمالي الكتب", v: col.books, icon: BookOpen, c: "#D97706" },
    ...(ov && ov.events != null ? [{ k: "events", l: "الفعاليات", v: ov.events, icon: CalendarDays, c: "#059669" }] : []),
    { k: "ventures", l: "المشاريع الطلابية", v: col.ventures, icon: Rocket, c: "#7C3AED" },
    { k: "works", l: "أعمال الاستوديو", v: col.works, icon: PenLine, c: "#0891B2" },
    { k: "pending", l: "بانتظار إجراءك", v: totalPending, icon: Hourglass, c: totalPending > 0 ? "#dc2626" : "#059669", hot: totalPending > 0 },
  ];

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? "صباح الخير" : hour >= 12 && hour < 18 ? "نهارك سعيد" : "مساء الخير";
  const quickTabs = (tabs || []).filter((x) => x.k !== "overview");

  return (
    <div className="space-y-5 sm:space-y-6" data-testid="admin-overview">
      {/* ===== Hero · مركز القيادة ===== */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-[28px] ft-hero-gradient text-white p-5 sm:p-7 ft-shadow-lg">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold backdrop-blur">
                <ShieldCheck className="w-3.5 h-3.5" /> مركز القيادة
              </div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3 leading-snug">
                {greeting}{user?.name ? <span className="text-emerald-200">، {user.name}</span> : ""}
              </h2>
              <p className="text-xs sm:text-sm text-white/70 mt-1.5 max-w-lg leading-relaxed">نبض المنصة في شاشة واحدة · أرقام حقيقية من آخر ٣٠ يوماً وطوابير بانتظار إجراءك.</p>
            </div>
            <LiveClock />
          </div>
          {totalPending > 0 ? (
            <button onClick={() => { const first = queue.find((q) => q.v > 0); if (first) jump(first.tab); }}
              className="relative mt-5 w-full flex items-center gap-2.5 rounded-2xl bg-amber-400/95 text-amber-950 px-4 py-3 text-right font-bold text-sm hover:bg-amber-300 transition-colors" data-testid="admin-overview-pending-strip">
              <BellRing className="w-5 h-5 shrink-0 animate-pulse" />
              <span className="flex-1">لديك <span className="font-head font-extrabold">{fmt(totalPending)}</span> عنصر بانتظار إجراءك · ابدأ المراجعة الآن</span>
              <ArrowLeft className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <div className="relative mt-5 flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 font-bold text-sm" data-testid="admin-overview-pending-strip">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
              <span>كل الطوابير فارغة · المنصة هادئة ومغطاة بالكامل</span>
            </div>
          )}
        </div>
      </FadeUp>

      {/* ===== Stat cards ===== */}
      <Stagger className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((k) => (
          <Item key={k.k}>
            <div className={`h-full bg-white rounded-3xl border p-4 ft-shadow transition-shadow hover:ft-shadow-lg ${k.hot ? "border-red-200 ring-1 ring-red-100" : "border-slate-100"}`} data-testid={`admin-stat-${k.k}`}>
              <div className="w-10 h-10 rounded-2xl grid place-items-center mb-3 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${k.c}, ${k.c}BB)` }}>
                <k.icon className="w-5 h-5" />
              </div>
              <div className="font-head font-extrabold text-[22px] leading-none text-slate-900">
                {typeof k.v === "number" ? <Counter value={k.v} /> : fmt(k.v)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 leading-tight font-medium">{k.l}</div>
            </div>
          </Item>
        ))}
      </Stagger>

      {/* ===== Chart + action queue ===== */}
      <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
        <FadeUp className="lg:col-span-2">
          <div className="h-full bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
            <h3 className="font-head font-bold mb-1">النمو والنشاط · آخر ٣٠ يوماً</h3>
            <p className="text-[11px] text-slate-400 mb-4">تسجيلات جديدة مقابل مستخدمين نشطين يومياً</p>
            {(a.days || []).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm font-semibold">لا بيانات نشاط بعد</div>
            ) : (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={a.days}>
                    <defs>
                      <linearGradient id="ovAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                      <linearGradient id="ovSign" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D97706" stopOpacity={0.35} /><stop offset="100%" stopColor="#D97706" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #EEF2F7", fontSize: 12 }} />
                    <Area type="monotone" dataKey="active_users" name="مستخدمون نشطون" stroke="#2563EB" fill="url(#ovAct)" strokeWidth={2} />
                    <Area type="monotone" dataKey="signups" name="تسجيلات جديدة" stroke="#D97706" fill="url(#ovSign)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex gap-2 mt-4 flex-wrap text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">ذروة نشطين يومياً: {fmt(t.active_users_peak)}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">مباريات شطرنج: {fmt(t.chess)}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">أعمال منشورة: {fmt(t.works)}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">حسابات مقفلة الآن: {h.security?.active_locks ?? "·"}</span>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="h-full bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-head font-bold">بانتظار إجراءك</h3>
              {totalPending > 0
                ? <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{fmt(totalPending)} عنصر</span>
                : <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">الكل مغطى ✅</span>}
            </div>
            <div className="space-y-2">
              {queue.map((q) => (
                <button key={q.l} onClick={() => jump(q.tab)} data-testid={`admin-queue-${q.tab}-${q.l}`}
                  className="w-full min-h-[52px] flex items-center justify-between gap-2 px-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-[0.99] transition text-right">
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 min-w-0">
                    <span className="w-8 h-8 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${q.c}, ${q.c}BB)` }}><q.icon className="w-4 h-4" /></span>
                    <span className="truncate">{q.l}</span>
                  </span>
                  <span className={`font-head font-extrabold text-lg ${q.v > 0 ? "text-slate-900" : "text-slate-300"}`}>{fmt(q.v)}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 mt-4 pt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-blue-50/70 py-2.5 px-1">
                <div className="font-head font-extrabold text-slate-900">{fmt(t.signups)}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">تسجيلات · ٣٠ يوم</div>
              </div>
              <div className="rounded-2xl bg-violet-50/70 py-2.5 px-1">
                <div className="font-head font-extrabold text-slate-900">{fmt(t.xp)}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">نقاط XP · ٣٠ يوم</div>
              </div>
              <div className="rounded-2xl bg-cyan-50/70 py-2.5 px-1">
                <div className="font-head font-extrabold text-slate-900">{fmt(t.pages)}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">صفحات مقروءة</div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ===== Quick actions · كل أقسام الإدارة ===== */}
      {quickTabs.length > 0 && (
        <FadeUp>
          <div>
            <h3 className="font-head font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> إجراءات سريعة · كل أقسام الإدارة
            </h3>
            <Stagger className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {quickTabs.map((n, i) => {
                const c = TILE_COLORS[i % TILE_COLORS.length];
                const Icon = n.icon;
                return (
                  <Item key={n.k}>
                    <button onClick={() => jump(n.k)} data-testid={`admin-quick-${n.k}`}
                      className="w-full h-full bg-white rounded-3xl border border-slate-100 ft-shadow p-3.5 sm:p-4 text-right hover:ft-shadow-lg active:scale-[0.98] transition group">
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl grid place-items-center text-white shadow-sm mb-2.5 block" style={{ background: `linear-gradient(135deg, ${c}, ${c}BB)` }}>
                        {Icon ? <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" /> : null}
                      </span>
                      <span className="flex items-center justify-between gap-1 text-[12px] sm:text-[13px] font-bold text-slate-700 leading-tight">
                        <span className="min-w-0">{n.l}</span>
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                      </span>
                    </button>
                  </Item>
                );
              })}
            </Stagger>
          </div>
        </FadeUp>
      )}

      {/* ===== Live activity ===== */}
      <ActivityFeed />
    </div>
  );
}
