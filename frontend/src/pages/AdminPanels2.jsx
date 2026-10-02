import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/components/NotificationsPanel";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, BookOpen, UserPlus, Sparkles, FileText, Flag, Bug, Download, Search, Award, ShieldCheck, Ban, Trophy, Swords, GraduationCap } from "lucide-react";

/* Panels for the admin console · Overview (مركز القيادة), Export center, User 360.
   Admin-only styling: white cards, slate text, emerald accents (matches Admin.jsx). */

const fmt = (n) => (n ?? 0).toLocaleString("en-US");
const fmtDate = (iso) => {
  if (!iso) return "·";
  try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" }); }
  catch { return "·"; }
};

function Empty({ t }) {
  return <div className="text-center py-10 text-slate-400 text-sm font-semibold">{t}</div>;
}

/* ---------------- 1) Overview · مركز القيادة ---------------- */
export function OverviewPanel({ onJump } = {}) {
  const [a, setA] = useState(null); // /admin/analytics-v2
  const [h, setH] = useState(null); // /admin/system-health
  const [errOpen, setErrOpen] = useState(null);
  useEffect(() => {
    api.get("/admin/analytics-v2").then((r) => setA(r.data)).catch(() => setA({ days: [], totals_30d: {} }));
    api.get("/admin/system-health").then((r) => setH(r.data)).catch(() => setH({}));
    api.get("/admin/errors", { params: { status: "open", limit: 1 } })
      .then((r) => setErrOpen(r.data?.counts?.open ?? 0)).catch(() => setErrOpen(null));
  }, []);
  if (!a || !h) return <PageLoader />;

  const t = a.totals_30d || {};
  const col = h.collections || {};
  const pend = h.pending || {};
  const kpis = [
    { l: "إجمالي المستخدمين", v: fmt(col.users), icon: Users, c: "#2563EB" },
    { l: "إجمالي الكتب", v: fmt(col.books), icon: BookOpen, c: "#D97706" },
    { l: "تسجيلات · آخر ٣٠ يوم", v: fmt(t.signups), icon: UserPlus, c: "#059669" },
    { l: "نقاط XP · آخر ٣٠ يوم", v: fmt(t.xp), icon: Sparkles, c: "#7C3AED" },
    { l: "صفحات مقروءة · آخر ٣٠ يوم", v: fmt(t.pages), icon: FileText, c: "#0891B2" },
  ];
  const queue = [
    { l: "معلمون بانتظار الموافقة", v: pend.teachers ?? 0, tab: "users", icon: UserPlus, c: "#7C3AED" },
    { l: "كتب بانتظار المراجعة", v: pend.books ?? 0, tab: "moderation", icon: BookOpen, c: "#2563EB" },
    { l: "بلاغات مفتوحة", v: pend.reports_open ?? 0, tab: "reports", icon: Flag, c: "#dc2626" },
    { l: "أخطاء مفتوحة", v: errOpen ?? 0, tab: "errors", icon: Bug, c: "#D97706" },
  ];
  const totalPending = queue.reduce((s, q) => s + (q.v || 0), 0);
  const shortcuts = [
    { l: "المستخدمون", tab: "users" }, { l: "الإشعارات", tab: "notify" },
    { l: "الشهادات", tab: "certificates" }, { l: "صحة النظام", tab: "healthsys" },
  ];
  const jump = (tab) => { if (onJump) onJump(tab); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> مركز القيادة</h2>
        <p className="text-xs text-slate-400 mt-1">نبض المنصة في شاشة واحدة · أرقام حقيقية من آخر ٣٠ يوماً وطوابير بانتظار إجراءك.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.l} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
            <div className="w-10 h-10 rounded-2xl grid place-items-center mb-3" style={{ background: `${k.c}15`, color: k.c }}>
              <k.icon className="w-5 h-5" />
            </div>
            <div className="font-head font-extrabold text-xl text-slate-900">{k.v}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{k.l}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 lg:col-span-2">
          <h3 className="font-head font-bold mb-1">النمو والنشاط · آخر ٣٠ يوماً</h3>
          <p className="text-[11px] text-slate-400 mb-4">تسجيلات جديدة مقابل مستخدمين نشطين يومياً</p>
          {(a.days || []).length === 0 ? <Empty t="لا بيانات نشاط بعد" /> : (
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

        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-head font-bold">بانتظار إجراءك</h3>
            {totalPending > 0
              ? <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{totalPending} عنصر</span>
              : <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">الكل مغطى ✅</span>}
          </div>
          <div className="space-y-2">
            {queue.map((q) => (
              <button key={q.l} onClick={() => jump(q.tab)}
                className="w-full min-h-[52px] flex items-center justify-between gap-2 px-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors text-right">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                  <span className="w-8 h-8 rounded-xl grid place-items-center shrink-0" style={{ background: `${q.c}15`, color: q.c }}><q.icon className="w-4 h-4" /></span>
                  {q.l}
                </span>
                <span className={`font-head font-extrabold ${q.v > 0 ? "text-slate-900" : "text-slate-300"}`}>{q.v}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-4 pt-4">
            <div className="text-[11px] font-bold text-slate-400 mb-2">اختصارات سريعة</div>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((s) => (
                <button key={s.tab} onClick={() => jump(s.tab)}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <LiveActivityCard />
    </div>
  );
}

function LiveActivityCard() {
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
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mt-4">
      <h3 className="font-head font-extrabold text-sm text-slate-700 flex items-center gap-2">
        <span className="relative flex w-2.5 h-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" /></span>
        نشاط المنصة المباشر
        <span className="text-[10px] font-bold text-slate-400">يُحدّث كل ٣٠ ثانية</span>
      </h3>
      <div className="mt-3 divide-y divide-slate-50">
        {items.map((a, i) => (
          <div key={a.id || i} className="flex items-center gap-3 py-2.5">
            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-xs font-extrabold grid place-items-center shrink-0">{(a.user_name || "؟").trim().charAt(0)}</span>
            <p className="flex-1 min-w-0 text-xs text-slate-600 truncate"><span className="font-bold text-slate-800">{a.user_name}</span> {a.text}</p>
            <span className="text-[10px] text-slate-400 shrink-0">{a.created_at ? new Date(a.created_at).toLocaleString("ar", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 2) Export center · مركز التصدير ---------------- */
const EXPORT_KINDS = [
  { k: "users", l: "المستخدمون", icon: Users, c: "#2563EB", d: "سجل الحسابات: الاسم · البريد · الدور · الحالة · المدرسة · المحافظة · النقاط · المستوى · تاريخ التسجيل" },
  { k: "books", l: "الكتب", icon: BookOpen, c: "#D97706", d: "مكتبة المنصة: العنوان · المؤلف · التصنيف · الحالة · اللغة · عدد الصفحات · الرافع · تاريخ الرفع" },
  { k: "certificates", l: "الشهادات", icon: GraduationCap, c: "#059669", d: "الشهادات الصادرة: الطالب · نوع الشهادة · المناسبة · تاريخ الإصدار" },
];

export function ExportPanel() {
  const [busy, setBusy] = useState(null);
  const run = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.get(`/admin/export/${kind}.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `future-thinkers-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success("بدأ تنزيل الملف 📥");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(null);
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2"><Download className="w-5 h-5 text-emerald-600" /> مركز التصدير</h2>
        <p className="text-xs text-slate-400 mt-1">ملفات CSV جاهزة من الخادم مباشرة · متوافقة مع Excel وبالعربية · تُحمَّل إلى جهازك فوراً.</p>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORT_KINDS.map((d) => (
          <div key={d.k} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 flex flex-col hover-lift">
            <div className="w-12 h-12 rounded-2xl grid place-items-center mb-3" style={{ background: `${d.c}15`, color: d.c }}>
              <d.icon className="w-6 h-6" />
            </div>
            <div className="font-head font-bold text-slate-900">{d.l}</div>
            <div className="text-xs text-slate-400 mt-1.5 leading-relaxed flex-1">{d.d}</div>
            <button onClick={() => run(d.k)} disabled={busy === d.k}
              className="pressable mt-4 w-full min-h-[44px] rounded-xl text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ background: d.c }}>
              <Download className="w-4 h-4" /> {busy === d.k ? "جارٍ التجهيز…" : "تنزيل CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 3) User 360 · ملف المستخدم الشامل ---------------- */
const ROLE_LABELS = { student: "طالب", teacher: "معلم", school_admin: "مدير مدرسة", directorate_admin: "مدير مديرية", moderator: "مشرف", admin: "مسؤول", super_admin: "مسؤول أعلى", custom: "صلاحيات مخصصة" };
const STATUS_META = {
  active: ["مفعّل", "bg-emerald-100 text-emerald-700"],
  banned: ["محظور", "bg-rose-100 text-rose-700"],
  suspended: ["موقوف مؤقتاً", "bg-amber-100 text-amber-700"],
  pending_approval: ["بانتظار الموافقة", "bg-amber-100 text-amber-700"],
  rejected: ["مرفوض", "bg-rose-100 text-rose-700"],
};
const COUNT_LABELS = {
  books_read: "كتب مقروءة", pages_read: "صفحات مقروءة", xp: "نقاط XP", works: "أعمال الاستوديو",
  ventures: "مشاريع طلابية", chess_games: "مباريات شطرنج", chess_wins: "انتصارات شطرنج",
  certificates: "شهادات", events: "فعاليات", competitions: "مسابقات", comments: "تعليقات",
  discussions: "نقاشات", followers: "متابِعون", following: "يتابعهم", badges: "شارات", streak: "أيام متتالية",
};
const COUNT_ICONS = { books_read: BookOpen, pages_read: FileText, xp: Sparkles, certificates: GraduationCap, chess_games: Swords, chess_wins: Trophy, works: Sparkles, ventures: Users };

export function User360Panel() {
  const { hasPerm } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [selId, setSelId] = useState(null);
  const [p, setP] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [xpAmount, setXpAmount] = useState("");
  const [xpReason, setXpReason] = useState("");
  const [busy, setBusy] = useState("");

  const canManageStatus = hasPerm("user.manage");
  const canAdjustXp = hasPerm("points.manage");

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/admin/users", { params: { q: q.trim(), limit: 12 } });
        setResults(data.items || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load360 = async (uid) => {
    setLoadErr("");
    try {
      const { data } = await api.get(`/admin/users/${uid}/360`);
      setP(data);
    } catch (e) {
      setP(null);
      setLoadErr(apiErr(e));
    }
  };
  const openUser = (u) => { setSelId(u.id); setP(null); load360(u.id); };

  const adjustXp = async () => {
    const n = Number(xpAmount);
    if (!selId || !Number.isFinite(n) || n === 0) return toast.error("أدخل عدد نقاط صحيحاً (موجب أو سالب)");
    setBusy("xp");
    try {
      await api.post(`/admin/users/${selId}/adjust-xp`, { amount: Math.trunc(n), reason: xpReason.trim() || "تعديل إداري" });
      toast.success("تم تعديل النقاط ✅");
      setXpAmount(""); setXpReason("");
      load360(selId);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };
  const setStatus = async (status) => {
    if (!selId) return;
    setBusy("status");
    try {
      await api.put(`/admin/users/${selId}/status`, { status });
      toast.success("تم تحديث حالة الحساب");
      load360(selId);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  const u = p?.user || null;
  const st = u ? (STATUS_META[u.status] || [u.status || "·", "bg-slate-100 text-slate-600"]) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2"><Search className="w-5 h-5 text-emerald-600" /> ملف المستخدم 360</h2>
        <p className="text-xs text-slate-400 mt-1">ابحث عن أي حساب واعرض صورته الكاملة: بياناته ونشاطه وشهاداته وإجراءات سريعة.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني…"
            className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 pr-10 pl-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition" />
        </div>
        {results !== null && (
          results.length === 0
            ? <Empty t="لا نتائج مطابقة لبحثك" />
            : (
              <div className="mt-3 divide-y divide-slate-50">
                {results.map((r) => (
                  <button key={r.id} onClick={() => openUser(r)}
                    className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 rounded-2xl text-right transition-colors ${selId === r.id ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center font-head font-bold shrink-0">
                      {(r.name || "؟").trim().charAt(0)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-sm text-slate-800 truncate">{r.name}</span>
                      <span className="block text-xs text-slate-400 truncate" dir="ltr">{r.email}</span>
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">{ROLE_LABELS[r.role] || r.role}</span>
                    {r.status && r.status !== "active" && (
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold shrink-0 ${(STATUS_META[r.status] || ["", "bg-slate-100 text-slate-600"])[1]}`}>{(STATUS_META[r.status] || [r.status])[0]}</span>
                    )}
                  </button>
                ))}
              </div>
            )
        )}
      </div>

      {selId && !p && !loadErr && <PageLoader />}
      {loadErr && (
        <div className="bg-white rounded-3xl border border-rose-100 ft-shadow p-6 text-center">
          <p className="text-sm font-bold text-rose-600 mb-3">تعذّر تحميل الملف الكامل لهذا المستخدم</p>
          <p className="text-xs text-slate-400 mb-4">{loadErr}</p>
          <button onClick={() => load360(selId)} className="pressable min-h-[44px] px-5 rounded-xl bg-slate-900 text-white text-sm font-bold">إعادة المحاولة</button>
        </div>
      )}

      {u && (
        <>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
            <div className="flex items-start gap-4 flex-wrap">
              <span className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center font-head font-extrabold text-2xl shrink-0">
                {(u.name || "؟").trim().charAt(0)}
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-head font-extrabold text-lg text-slate-900">{u.name}</div>
                <div className="text-xs text-slate-400" dir="ltr">{u.email}</div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">{ROLE_LABELS[u.role] || u.role}</span>
                  {st && <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${st[1]}`}>{st[0]}</span>}
                  {u.school_name && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{u.school_name}</span>}
                  {u.governorate_name && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-bold">{u.governorate_name}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="rounded-2xl bg-amber-50 px-4 py-2.5 text-center">
                  <div className="font-head font-extrabold text-amber-700">{fmt(u.xp)}</div>
                  <div className="text-[10px] text-amber-600 font-bold">نقطة XP</div>
                </div>
                {u.level != null && (
                  <div className="rounded-2xl bg-indigo-50 px-4 py-2.5 text-center">
                    <div className="font-head font-extrabold text-indigo-700">{u.level}</div>
                    <div className="text-[10px] text-indigo-600 font-bold">المستوى</div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-3">انضم في {fmtDate(u.created_at)}</div>
          </div>

          {p.counts && Object.keys(p.counts).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(p.counts).map(([k, v]) => {
                const Icon = COUNT_ICONS[k] || Sparkles;
                return (
                  <div key={k} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-2"><Icon className="w-4 h-4" /></div>
                    <div className="font-head font-extrabold text-lg text-slate-900">{fmt(typeof v === "number" ? v : 0) || v}</div>
                    <div className="text-[11px] text-slate-400">{COUNT_LABELS[k] || k}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
              <h3 className="font-head font-bold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-emerald-600" /> الشهادات ({(p.certificates || []).length})</h3>
              {(p.certificates || []).length === 0 ? <Empty t="لا شهادات صادرة بعد" /> : (
                <div className="space-y-2">
                  {(p.certificates || []).map((c, i) => (
                    <div key={c.id || i} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3">
                      <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 grid place-items-center shrink-0"><Award className="w-4.5 h-4.5" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{c.title || c.name || c.event_title || "شهادة"}</div>
                        <div className="text-[11px] text-slate-400">{fmtDate(c.issued_at || c.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
              <h3 className="font-head font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /> أحدث النشاطات</h3>
              {(p.recent_activity || []).length === 0 ? <Empty t="لا نشاط مسجل بعد" /> : (
                <div className="space-y-1">
                  {(p.recent_activity || []).map((act, i) => (
                    <div key={act.id || i} className="flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 leading-relaxed">{act.text || act.title || act.label || act.action || act.type || "نشاط"}</div>
                        {(act.detail || act.description) && <div className="text-xs text-slate-400 truncate">{act.detail || act.description}</div>}
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold shrink-0">{(act.created_at || act.at) ? timeAgo(act.created_at || act.at) : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(canAdjustXp || canManageStatus) && (
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6 space-y-5">
              <h3 className="font-head font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> إجراءات إدارية</h3>
              {canAdjustXp && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">تعديل النقاط (XP) · رقم موجب للإضافة أو سالب للخصم</div>
                  <div className="grid sm:grid-cols-[130px_1fr_auto] gap-2">
                    <input type="number" value={xpAmount} onChange={(e) => setXpAmount(e.target.value)} placeholder="+50"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" dir="ltr" />
                    <input value={xpReason} onChange={(e) => setXpReason(e.target.value)} placeholder="سبب التعديل (يُسجَّل في سجل العمليات)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" />
                    <button onClick={adjustXp} disabled={busy === "xp"}
                      className="pressable min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
                      {busy === "xp" ? "جارٍ التطبيق…" : "تطبيق"}
                    </button>
                  </div>
                </div>
              )}
              {canManageStatus && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">حالة الحساب</div>
                  <div className="flex gap-2 flex-wrap">
                    {u.status !== "active" && (
                      <button onClick={() => setStatus("active")} disabled={busy === "status"}
                        className="pressable min-h-[44px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">تفعيل الحساب</button>
                    )}
                    {u.status === "active" && (
                      <>
                        <button onClick={() => setStatus("suspended")} disabled={busy === "status"}
                          className="pressable min-h-[44px] px-4 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-50">إيقاف مؤقت</button>
                        <button onClick={() => setStatus("banned")} disabled={busy === "status"}
                          className="pressable min-h-[44px] px-4 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
                          <Ban className="w-4 h-4" /> حظر الحساب
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
