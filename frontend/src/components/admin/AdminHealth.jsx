import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import {
  Activity, ShieldCheck, RefreshCw, Hourglass, Lock, PlugZap, Database, Users,
  AlertTriangle, Send, BellRing, Smartphone, GraduationCap, BookOpen, Flag, ArrowLeft,
} from "lucide-react";

/* صحة النظام
   مصدر البيانات الوحيد: GET /admin/system-health كما يرجعه الخادم حرفياً:
   { collections{١٠ مفاتيح}, users_by_role{student,teacher,admin,super_admin},
     pending{teachers,books,reports_open}, security{active_locks,identities_with_failures},
     integrations{telegram_storage,push_vapid,push_devices}, checked_at }
   لا قيم مُخترعة: عند فشل الجلب تظهر حالة خطأ (الخادم يرجع null صراحة عندما
   يتعذّر عدّ مجموعة · تُعرض «·» لا صفراً) · ووقت الفحص يُعرض بالتوقيت المحلي.
   مفتاح توقيع الـ API عبر GET/PUT /admin/signing بأنماطه الثلاثة كما هو. */

const colAr = { users: "المستخدمون", books: "الكتب", works: "الأعمال", ventures: "المشاريع", chess_games: "مباريات الشطرنج", notifications: "الإشعارات", push_subscriptions: "أجهزة الدفع", certificates: "الشهادات", xp_transactions: "حركات النقاط", reports: "البلاغات" };
const ROLE_AR = { student: "طالب", teacher: "معلم", admin: "مشرف", super_admin: "مشرف عام" };
const fmt = (n) => (n === null || n === undefined ? "·" : Number(n).toLocaleString("en-US"));

function localTime(iso) {
  if (!iso) return "·";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "·" : d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function GaugeRing({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative w-[92px] h-[92px] shrink-0" data-testid="admin-health-gauge">
      <svg viewBox="0 0 92 92" className="w-full h-full -rotate-90">
        <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" />
        <circle cx="46" cy="46" r={R} fill="none" stroke={pct === 100 ? "#34D399" : "#FBBF24"} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-head font-extrabold text-xl leading-none">{pct}٪</div>
          <div className="text-[9px] text-white/60 font-bold mt-1">جاهزية التكاملات</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ ok, okText, badText }) {
  return ok
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-extrabold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{okText}</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{badText}</span>;
}

function PendingCard({ icon: Icon, label, value, to, testid, delay }) {
  const waiting = (value || 0) > 0;
  return (
    <FadeUp delay={delay}>
      <Link to={to} data-testid={testid}
        className={`group flex items-center gap-3.5 h-full rounded-3xl border p-4 transition-all hover:-translate-y-0.5 ${waiting ? "bg-amber-50/70 border-amber-200 ft-shadow" : "bg-white border-slate-100 ft-shadow"}`}>
        <span className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${waiting ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-bold text-slate-400">{label}</span>
          <span className={`block font-head font-extrabold text-2xl leading-tight ${waiting ? "text-amber-600" : "text-slate-300"}`}>{fmt(value)}</span>
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold shrink-0 ${waiting ? "text-amber-600" : "text-slate-300"}`}>
          {waiting ? "يحتاج إجراءك" : "لا شيء معلّق"}
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        </span>
      </Link>
    </FadeUp>
  );
}

export default function AdminHealth() {
  const [h, setH] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sigMode, setSigMode] = useState(null);
  const [sigBusy, setSigBusy] = useState(false);

  const loadHealth = () => api.get("/admin/system-health")
    .then((r) => { setH(r.data); setLoadErr(false); })
    .catch(() => { setLoadErr(true); })
    .finally(() => setRefreshing(false));
  const loadSig = () => api.get("/admin/signing").then((r) => setSigMode(r.data?.mode || "warn")).catch(() => setSigMode(null));
  useEffect(() => { loadHealth(); }, []);
  useEffect(() => { loadSig(); }, []);

  const refresh = () => { setRefreshing(true); loadHealth(); loadSig(); };

  const changeSigMode = async (m) => {
    setSigBusy(true);
    try { const { data } = await api.put("/admin/signing", { mode: m }); setSigMode(data.mode); toast.success("تم تحديث وضع توقيع الـ API"); }
    catch (e) { toast.error(apiErr(e)); }
    setSigBusy(false);
  };

  const header = (
    <FadeUp>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
          <span className="w-8 h-8 rounded-xl grid place-items-center text-white bg-gradient-to-br from-emerald-500 to-teal-600"><Activity className="w-4 h-4" /></span>
          صحة النظام
          {h && !loadErr && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700" data-testid="admin-health-checked-at">آخر فحص: {localTime(h.checked_at)}</span>
          )}
        </h2>
        <button onClick={refresh} disabled={refreshing} data-testid="admin-health-refresh"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-100 ft-shadow text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-60">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> إعادة الفحص
        </button>
      </div>
    </FadeUp>
  );

  const signingCard = sigMode !== null && (
    <FadeUp delay={0.04}>
      <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow mb-5" data-testid="admin-health-signing">
        <div className="flex items-center gap-2 font-head font-extrabold text-slate-800"><ShieldCheck className="w-5 h-5 text-emerald-600" /> توقيع طلبات الـ API · حماية ضد الأتمتة</div>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">كل طلب للموقع يُوقَّع تشفيرياً (HMAC-SHA256) مع منع إعادة التشغيل. «تحذير» يراقب دون رفض · فعّل «فرض» فقط بعد التأكد أن الموقع يعمل طبيعياً لأيام.</p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {[["off", "إيقاف"], ["warn", "تحذير · مراقبة"], ["enforce", "فرض · حماية كاملة"]].map(([m, label]) => (
            <button key={m} disabled={sigBusy || sigMode === m} onClick={() => changeSigMode(m)} data-testid={`admin-signing-${m}`}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-bold transition disabled:opacity-100 ${sigMode === m ? (m === "enforce" ? "bg-rose-600 text-white" : m === "warn" ? "bg-amber-500 text-white" : "bg-slate-700 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"}`}>
              {label}
            </button>
          ))}
          <span className="text-[11px] font-bold text-slate-400 self-center">الوضع الحالي: {sigMode === "enforce" ? "فرض" : sigMode === "warn" ? "تحذير" : "إيقاف"}</span>
        </div>
      </div>
    </FadeUp>
  );

  if (!h && !loadErr) return <PageLoader />;

  if (loadErr) {
    return (
      <div data-testid="admin-health">
        {header}
        <FadeUp>
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 sm:p-8 text-center" data-testid="admin-health-error">
            <span className="w-14 h-14 rounded-3xl bg-rose-100 text-rose-500 grid place-items-center mx-auto mb-3"><AlertTriangle className="w-7 h-7" /></span>
            <div className="font-head font-extrabold text-slate-800">تعذّر جلب حالة النظام</div>
            <p className="text-xs text-rose-500 mt-1.5 leading-relaxed">لم تصل بيانات الفحص من الخادم، لذلك لا نعرض أي أرقام بدلاً من عرض أصفار غير حقيقية.</p>
            <button onClick={refresh} className="mt-4 inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-bold">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> حاول مجدداً
            </button>
          </div>
        </FadeUp>
        {signingCard}
      </div>
    );
  }

  const integ = h.integrations || {};
  const integReady = (integ.telegram_storage ? 1 : 0) + (integ.push_vapid ? 1 : 0);
  const pend = h.pending || {};
  const pendTotal = (pend.teachers || 0) + (pend.books || 0) + (pend.reports_open || 0);
  const cols = Object.entries(h.collections || {});
  const colMax = Math.max(1, ...cols.map(([, v]) => v || 0));

  return (
    <div data-testid="admin-health">
      {header}

      {/* بطاقة الحالة العامة */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-[28px] bg-slate-900 text-white p-5 sm:p-6 ft-shadow-lg mb-5">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-10 w-56 h-56 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center gap-5">
            <GaugeRing value={integReady} total={2} />
            <div className="flex-1 min-w-[220px]">
              <div className="font-head font-extrabold text-lg sm:text-xl">{integReady === 2 ? "كل التكاملات مهيأة · النظام جاهز بالكامل" : "بعض التكاملات تحتاج تهيئة"}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold" data-testid="admin-health-telegram">
                  <Send className="w-3.5 h-3.5 text-white/60" /> تخزين الكتب (تليجرام) <StatusPill ok={!!integ.telegram_storage} okText="مهيأ" badText="غير مهيأ" />
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold" data-testid="admin-health-vapid">
                  <BellRing className="w-3.5 h-3.5 text-white/60" /> دفع الهاتف (VAPID) <StatusPill ok={!!integ.push_vapid} okText="مهيأ" badText="غير مهيأ" />
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold" data-testid="admin-health-push-devices">
                  <Smartphone className="w-3.5 h-3.5 text-white/60" /> أجهزة دفع مسجلة: {fmt(integ.push_devices)}
                </span>
              </div>
            </div>
            <div className="flex sm:flex-col gap-2 text-center">
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2.5 min-w-[104px]" data-testid="admin-health-pending-total">
                <div className="font-head font-extrabold text-xl leading-none">{fmt(pendTotal)}</div>
                <div className="text-[10px] text-white/60 font-bold mt-1">بانتظار إجراء</div>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2.5 min-w-[104px]" data-testid="admin-health-locks">
                <div className="font-head font-extrabold text-xl leading-none">{fmt(h.security?.active_locks)}</div>
                <div className="text-[10px] text-white/60 font-bold mt-1">حسابات مقفلة الآن</div>
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      {signingCard}

      {/* بانتظار إجراءك · بطاقات تنقّل */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3">
        <Hourglass className="w-4 h-4 text-amber-500" /> بانتظار إجراءك
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <PendingCard icon={GraduationCap} label="معلمون بانتظار الاعتماد" value={pend.teachers} to="/admin/users" testid="admin-health-pending-teachers" delay={0.05} />
        <PendingCard icon={BookOpen} label="كتب بانتظار الاعتماد" value={pend.books} to="/admin/books" testid="admin-health-pending-books" delay={0.08} />
        <PendingCard icon={Flag} label="بلاغات مفتوحة" value={pend.reports_open} to="/admin/reports" testid="admin-health-pending-reports" delay={0.11} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <FadeUp delay={0.13}>
          <div className="h-full bg-white rounded-3xl p-5 border border-slate-100 ft-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3"><Lock className="w-4 h-4 text-rose-500" /> الأمان</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                <span className="text-sm font-semibold text-slate-700">حسابات مقفلة الآن</span>
                <span className="font-head font-extrabold text-slate-900">{fmt(h.security?.active_locks)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                <span className="text-sm font-semibold text-slate-700">هويات سجّلت محاولات دخول فاشلة</span>
                <span className="font-head font-extrabold text-slate-900">{fmt(h.security?.identities_with_failures)}</span>
              </div>
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.16}>
          <div className="h-full bg-white rounded-3xl p-5 border border-slate-100 ft-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3"><Users className="w-4 h-4 text-indigo-500" /> المستخدمون حسب الدور</div>
            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(h.users_by_role || {}).map(([r, n]) => (
                <div key={r} className="rounded-2xl bg-indigo-50/70 px-3.5 py-2.5 text-center">
                  <div className="font-head font-extrabold text-indigo-900">{fmt(n)}</div>
                  <div className="text-[11px] text-indigo-400 font-bold mt-0.5">{ROLE_AR[r] || r}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>

      <FadeUp delay={0.18}>
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1"><Database className="w-4 h-4 text-blue-600" /> أحجام المجموعات</div>
          <p className="text-[11px] text-slate-400 mb-4">عدد السجلات التقديري لكل مجموعة · طول الشريط نسبي لأكبر مجموعة</p>
          <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cols.map(([k, v]) => (
              <Item key={k}>
                <div className="rounded-2xl bg-slate-50 p-3.5 h-full">
                  <div className="font-head font-extrabold text-slate-900 text-center">{fmt(v)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 text-center">{colAr[k] || k}</div>
                  <div className="h-1.5 rounded-full bg-slate-200/80 mt-2.5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-blue-500 to-cyan-400 transition-all duration-700" style={{ width: v ? `${Math.max(3, Math.round((v / colMax) * 100))}%` : "0%" }} />
                  </div>
                </div>
              </Item>
            ))}
          </Stagger>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-4">
          <PlugZap className="w-3.5 h-3.5" /> تُجمع هذه الأرقام لحظة فتح الصفحة من قاعدة البيانات مباشرة · آخر فحص {localTime(h.checked_at)} بتوقيت جهازك.
        </p>
      </FadeUp>
    </div>
  );
}
