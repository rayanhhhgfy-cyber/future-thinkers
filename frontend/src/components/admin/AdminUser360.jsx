import React, { useEffect, useState } from "react";
import api, { apiErr, fileUrl } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/components/NotificationsPanel";
import {
  Search, Award, ShieldCheck, Ban, GraduationCap, Sparkles, BookOpen, FileText,
  Swords, Trophy, Users, Rocket, PenLine, Smartphone, History, UserSearch, MapPin, School,
} from "lucide-react";

/* ملف المستخدم 360 · نفس نقاط النهاية في User360Panel السابق:
   بحث عبر GET /admin/users (q · limit) · ثم GET /admin/users/{id}/360
   إجراءات: POST /admin/users/{id}/adjust-xp · PUT /admin/users/{id}/status */

const fmt = (n) => (n ?? 0).toLocaleString("en-US");
const fmtDate = (iso) => {
  if (!iso) return "·";
  try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" }); }
  catch { return "·"; }
};

const ROLE_LABELS = { student: "طالب", teacher: "معلم", school_admin: "مدير مدرسة", directorate_admin: "مدير مديرية", moderator: "مشرف", admin: "مسؤول", super_admin: "مسؤول أعلى", custom: "صلاحيات مخصصة" };
const STATUS_META = {
  active: ["مفعّل", "bg-emerald-100 text-emerald-700"],
  banned: ["محظور", "bg-rose-100 text-rose-700"],
  suspended: ["موقوف مؤقتاً", "bg-amber-100 text-amber-700"],
  pending_approval: ["بانتظار الموافقة", "bg-amber-100 text-amber-700"],
  rejected: ["مرفوض", "bg-rose-100 text-rose-700"],
};
const COUNT_LABELS = {
  certificates: "شهادات", xp_transactions: "حركات النقاط", books_finished: "كتب منجزة",
  books_read: "كتب مقروءة", pages_read: "صفحات مقروءة", xp: "نقاط XP", works: "أعمال الاستوديو",
  studio_works: "أعمال الاستوديو", ventures: "مشاريع طلابية", chess_games: "مباريات شطرنج",
  chess_wins: "انتصارات شطرنج", events: "فعاليات", competitions: "مسابقات", comments: "تعليقات",
  discussions: "نقاشات", followers: "متابِعون", following: "يتابعهم", badges: "شارات",
  streak: "أيام متتالية", push_devices: "أجهزة الإشعارات",
};
const COUNT_META = {
  certificates: { icon: GraduationCap, c: "#059669" },
  xp_transactions: { icon: History, c: "#7C3AED" },
  books_finished: { icon: BookOpen, c: "#2563EB" },
  books_read: { icon: BookOpen, c: "#2563EB" },
  pages_read: { icon: FileText, c: "#0891B2" },
  xp: { icon: Sparkles, c: "#7C3AED" },
  works: { icon: PenLine, c: "#D97706" },
  studio_works: { icon: PenLine, c: "#D97706" },
  ventures: { icon: Rocket, c: "#0891B2" },
  chess_games: { icon: Swords, c: "#0A192F" },
  chess_wins: { icon: Trophy, c: "#D97706" },
  push_devices: { icon: Smartphone, c: "#E11D48" },
};

function Avatar({ user, className = "w-11 h-11 rounded-2xl text-base", ring }) {
  const [err, setErr] = useState(false);
  const url = user?.avatar_url;
  const src = url ? (String(url).startsWith("http") ? url : fileUrl(url)) : null;
  if (src && !err) {
    return <img src={src} alt="" onError={() => setErr(true)} className={`${className} object-cover shrink-0 ${ring || "ring-1 ring-slate-100"}`} />;
  }
  return (
    <span className={`${className} bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center font-head font-bold shrink-0 ${ring || ""}`}>
      {(user?.name || "؟").trim().charAt(0)}
    </span>
  );
}

function Empty({ t }) {
  return <div className="text-center py-10 text-slate-400 text-sm font-semibold">{t}</div>;
}

export default function AdminUser360() {
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
    <div className="space-y-5">
      <div>
        <h2 className="font-head font-extrabold text-xl text-slate-900 flex items-center gap-2">
          <span className="w-9 h-9 rounded-2xl bg-emerald-600 text-white grid place-items-center"><UserSearch className="w-5 h-5" /></span>
          ملف المستخدم 360
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">ابحث عن أي حساب واعرض صورته الكاملة: بياناته ونشاطه وشهاداته وإجراءات سريعة.</p>
      </div>

      {/* search + picker */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد الإلكتروني…"
            data-testid="admin-user360-search"
            className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition" />
        </div>
        {results !== null && (
          results.length === 0
            ? <Empty t="لا نتائج مطابقة لبحثك" />
            : (
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {results.map((r) => (
                  <button key={r.id} onClick={() => openUser(r)}
                    className={`min-h-[60px] flex items-center gap-3 px-3 py-2.5 rounded-2xl text-right transition-all border ${selId === r.id ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100" : "border-transparent hover:bg-slate-50"}`}>
                    <Avatar user={r} className="w-10 h-10 rounded-xl text-sm" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-sm text-slate-800 truncate">{r.name}</span>
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
          {/* profile band */}
          <div className="relative overflow-hidden rounded-3xl ft-hero-gradient text-white ft-shadow">
            <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <Avatar user={u} className="w-20 h-20 rounded-[24px] text-3xl" ring="ring-4 ring-white/25" />
                <div className="flex-1 min-w-[200px]">
                  <div className="font-head font-extrabold text-2xl">{u.name}</div>
                  <div className="text-xs text-white/70 mt-0.5" dir="ltr">{u.email}</div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/15 text-white font-bold backdrop-blur">{ROLE_LABELS[u.role] || u.role}</span>
                    {st && <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${st[1]}`}>{st[0]}</span>}
                    {u.school_name && <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/15 text-white font-bold backdrop-blur inline-flex items-center gap-1"><School className="w-3 h-3" />{u.school_name}</span>}
                    {u.governorate_name && <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/15 text-white font-bold backdrop-blur inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{u.governorate_name}</span>}
                    {u.directorate_name && <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/15 text-white font-bold backdrop-blur">{u.directorate_name}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="rounded-2xl bg-white/12 backdrop-blur px-4 py-3 text-center min-w-[84px]">
                    <div className="font-head font-extrabold text-xl tabular-nums">{fmt(u.xp)}</div>
                    <div className="text-[10px] text-white/70 font-bold mt-0.5">نقطة XP</div>
                  </div>
                  {u.level != null && (
                    <div className="rounded-2xl bg-white/12 backdrop-blur px-4 py-3 text-center min-w-[84px]">
                      <div className="font-head font-extrabold text-xl tabular-nums">{u.level}</div>
                      <div className="text-[10px] text-white/70 font-bold mt-0.5">المستوى</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-white/60 mt-4">انضم في {fmtDate(u.created_at)}</div>
            </div>
          </div>

          {/* counts */}
          {p.counts && Object.keys(p.counts).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(p.counts).map(([k, v]) => {
                const meta = COUNT_META[k] || { icon: Sparkles, c: "#059669" };
                const Icon = meta.icon;
                return (
                  <div key={k} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 hover-lift">
                    <div className="w-9 h-9 rounded-2xl grid place-items-center mb-2.5" style={{ background: `${meta.c}15`, color: meta.c }}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="font-head font-extrabold text-xl text-slate-900 tabular-nums">{fmt(typeof v === "number" ? v : 0)}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{COUNT_LABELS[k] || k}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            {/* certificates */}
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
              <h3 className="font-head font-bold mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-emerald-600" /> الشهادات ({(p.certificates || []).length})</h3>
              {(p.certificates || []).length === 0 ? <Empty t="لا شهادات صادرة بعد" /> : (
                <div className="space-y-2">
                  {(p.certificates || []).map((c, i) => (
                    <div key={c.id || i} className="flex items-center gap-3 rounded-2xl bg-gradient-to-l from-amber-50 to-white border border-amber-100/70 px-3.5 py-3">
                      <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 grid place-items-center shrink-0"><Award className="w-5 h-5" /></span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{c.title || c.name || c.event_title || "شهادة"}</div>
                        <div className="text-[11px] text-slate-400">{fmtDate(c.issued_at || c.created_at)}</div>
                      </div>
                      {c.code && <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-white border border-amber-200 text-amber-700 shrink-0" dir="ltr">{c.code}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* recent activity */}
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
              <h3 className="font-head font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-600" /> أحدث النشاطات</h3>
              {(p.recent_activity || []).length === 0 ? <Empty t="لا نشاط مسجل بعد" /> : (
                <div className="relative">
                  <span className="absolute top-2 bottom-2 right-[5px] w-px bg-slate-100" />
                  <div className="space-y-1">
                    {(p.recent_activity || []).map((act, i) => (
                      <div key={act.id || i} className="relative flex items-start gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50">
                        <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-700 leading-relaxed">{act.text || act.title || act.label || act.action || act.type || "نشاط"}</div>
                          {(act.detail || act.description) && <div className="text-xs text-slate-400 truncate">{act.detail || act.description}</div>}
                        </div>
                        <span className="text-[10px] text-slate-300 font-bold shrink-0">{(act.created_at || act.at) ? timeAgo(act.created_at || act.at) : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* admin actions */}
          {(canAdjustXp || canManageStatus) && (
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6 space-y-5">
              <h3 className="font-head font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> إجراءات إدارية</h3>
              {canAdjustXp && (
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">تعديل النقاط (XP) · رقم موجب للإضافة أو سالب للخصم</div>
                  <div className="grid sm:grid-cols-[130px_1fr_auto] gap-2">
                    <input type="number" value={xpAmount} onChange={(e) => setXpAmount(e.target.value)} placeholder="+50"
                      data-testid="admin-user360-xp-amount"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" dir="ltr" />
                    <input value={xpReason} onChange={(e) => setXpReason(e.target.value)} placeholder="سبب التعديل (يُسجَّل في سجل العمليات)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white transition" />
                    <button onClick={adjustXp} disabled={busy === "xp"}
                      data-testid="admin-user360-xp-apply"
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
