import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FadeUp } from "@/components/anim";
import BookCover from "@/components/BookCover";
import { timeAgo } from "@/components/NotificationsPanel";
import {
  Play, BookOpen, Route, Rocket, CheckCircle2, PartyPopper, History, Zap,
  Award, Sparkles, Timer, Users, User, X, ChevronLeft,
} from "lucide-react";

/* ============================================================
   1) «تابع من حيث توقفت» · continuation rail
   Book comes from the /dashboard aggregate (currently_reading is already
   sorted by last update); the in-progress learning path is fetched from
   /paths defensively; the venture comes from dashboard.my_ventures.
   Cards without data hide; the whole rail hides when all three are empty.
   ============================================================ */
const VSTATUS = { idea: "فكرة", in_progress: "قيد التنفيذ", completed: "مكتمل" };
const VSTATUS_C = { idea: "bg-sky-100 text-sky-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700" };

export function ContinueRail({ data }) {
  const [path, setPath] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/paths")
      .then((r) => {
        if (!alive) return;
        const arr = Array.isArray(r.data) ? r.data : r.data?.items || [];
        const best = arr
          .map((p) => ({ p, total: (p.steps || []).length, done: p.done_steps || 0 }))
          .filter((x) => x.total > 0 && x.done > 0 && x.done < x.total)
          .sort((a, b) => b.done / b.total - a.done / a.total)[0];
        setPath(best || null);
      })
      .catch(() => { if (alive) setPath(null); });
    return () => { alive = false; };
  }, []);

  const book = data?.currently_reading?.[0] || null;
  const venture = data?.my_ventures?.[0] || null;
  if (!book && !venture && !path) return null;

  return (
    <FadeUp>
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="font-head font-bold text-lg flex items-center gap-2.5 text-slate-900">
            <span className="w-9 h-9 rounded-xl ft-icon-tile text-white grid place-items-center shrink-0"><Play className="w-4.5 h-4.5" /></span>
            تابع من حيث توقفت
          </h2>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">نقرة واحدة وتكمل</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {book && (
            <Link to={`/books/${book.id}`} className="pressable group flex items-center gap-3.5 rounded-2xl ring-1 ring-slate-100 bg-gradient-to-l from-blue-50/80 to-white p-3.5 hover:ring-blue-200 transition-all min-w-0">
              <BookCover book={book} className="w-12 h-[68px] rounded-lg shrink-0 ft-shadow" imgClassName="w-12 h-[68px] object-cover rounded-lg" />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-blue-600"><BookOpen className="w-3 h-3" /> كتاب تقرؤه</span>
                <span className="block font-bold text-sm text-slate-800 truncate mt-0.5">{book.title}</span>
                <span className="block text-[11px] text-slate-400 truncate">{book.author}</span>
                <span className="flex items-center gap-2 mt-1.5">
                  <span className="flex-1 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, book.progress || 0)}%` }} />
                  </span>
                  <span className="text-[11px] font-extrabold text-blue-600">{Math.round(book.progress || 0)}%</span>
                </span>
              </span>
              <span className="w-9 h-9 rounded-full bg-blue-600 text-white grid place-items-center shrink-0 shadow-md shadow-blue-200 group-hover:scale-110 transition-transform"><Play className="w-4 h-4" /></span>
            </Link>
          )}
          {path && (
            <Link to="/paths" className="pressable group flex items-center gap-3.5 rounded-2xl ring-1 ring-slate-100 bg-gradient-to-l from-teal-50/80 to-white p-3.5 hover:ring-teal-200 transition-all min-w-0">
              <span className="w-12 h-[68px] rounded-lg shrink-0 bg-gradient-to-br from-teal-500 to-emerald-600 text-white grid place-items-center ft-shadow"><Route className="w-6 h-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-teal-600"><Route className="w-3 h-3" /> مسار تعلّم</span>
                <span className="block font-bold text-sm text-slate-800 truncate mt-0.5">{path.p.title}</span>
                <span className="block text-[11px] text-slate-400">أنجزت {path.done} من {path.total} خطوات</span>
                <span className="flex items-center gap-2 mt-1.5">
                  <span className="flex-1 h-1.5 rounded-full bg-teal-100 overflow-hidden">
                    <span className="block h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${(path.done / path.total) * 100}%` }} />
                  </span>
                  <span className="text-[11px] font-extrabold text-teal-600">{Math.round((path.done / path.total) * 100)}%</span>
                </span>
              </span>
              <span className="w-9 h-9 rounded-full bg-teal-600 text-white grid place-items-center shrink-0 shadow-md shadow-teal-200 group-hover:scale-110 transition-transform"><Play className="w-4 h-4" /></span>
            </Link>
          )}
          {venture && (
            <Link to={`/ventures/${venture.id}`} className="pressable group flex items-center gap-3.5 rounded-2xl ring-1 ring-slate-100 bg-gradient-to-l from-rose-50/80 to-white p-3.5 hover:ring-rose-200 transition-all min-w-0">
              <span className="w-12 h-[68px] rounded-lg shrink-0 bg-gradient-to-br from-rose-500 to-orange-500 text-white grid place-items-center ft-shadow"><Rocket className="w-6 h-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-600"><Rocket className="w-3 h-3" /> {venture.is_owner ? "مشروعك" : "مشروع تشارك فيه"}</span>
                <span className="block font-bold text-sm text-slate-800 truncate mt-0.5">{venture.title}</span>
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${VSTATUS_C[venture.status] || "bg-slate-100 text-slate-600"}`}>{VSTATUS[venture.status] || venture.status}</span>
                <span className="block text-[11px] font-bold text-rose-600 mt-1.5">افتح المشروع وتابع العمل</span>
              </span>
              <span className="w-9 h-9 rounded-full bg-rose-500 text-white grid place-items-center shrink-0 shadow-md shadow-rose-200 group-hover:scale-110 transition-transform"><ChevronLeft className="w-4 h-4" /></span>
            </Link>
          )}
        </div>
      </section>
    </FadeUp>
  );
}

/* ============================================================
   2) «قائمة انطلاقك» · new-member starter checklist
   Every item is computed from real endpoints; nothing is stored
   server-side. Dismissal persists in localStorage (ft-checklist-dismissed).
   ============================================================ */
const DISMISS_KEY = "ft-checklist-dismissed";

function MiniRing({ pct, size = 58 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="7" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={pct >= 100 ? "#10B981" : "#F59E0B"} strokeWidth="7" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-head text-sm font-black text-slate-800">{Math.round(pct)}%</div>
    </div>
  );
}

export function StarterChecklist({ data }) {
  const { user } = useAuth();
  const [checks, setChecks] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [clubs, circles, focus, ventures] = await Promise.allSettled([
        api.get("/clubs"), api.get("/circles"),
        api.get("/focus/stats/me"), api.get("/ventures"),
      ]);
      if (!alive) return;
      const clubList = clubs.status === "fulfilled" ? (Array.isArray(clubs.value.data) ? clubs.value.data : []) : [];
      const circleList = circles.status === "fulfilled" ? (circles.value.data?.items || []) : [];
      const focusStats = focus.status === "fulfilled" ? focus.value.data : null;
      const ventureList = ventures.status === "fulfilled"
        ? (Array.isArray(ventures.value.data) ? ventures.value.data : ventures.value.data?.items || []) : [];
      setChecks({
        profile: Boolean(user?.name && (user?.bio || "").trim() && user?.avatar_url),
        book: (data?.books_read || 0) > 0 || (data?.currently_reading || []).length > 0,
        club: clubList.some((c) => c.is_member) || circleList.some((c) => c.is_member),
        focus: (focusStats?.sessions || 0) > 0 || (focusStats?.week_min || 0) > 0,
        venture: (data?.my_ventures || []).length > 0 || ventureList.some((v) => v.voted),
      });
    })();
    return () => { alive = false; };
  }, [user, data]);

  if (dismissed || !checks) return null;

  const items = [
    { key: "profile", icon: User, label: "أكمل ملفك الشخصي", hint: "نبذة وصورة تظهر للجميع", to: "/settings", cta: "أكمل الآن" },
    { key: "book", icon: BookOpen, label: "اقرأ أول كتاب", hint: "اختر كتاباً من المكتبة وابدأ", to: "/library", cta: "تصفّح المكتبة" },
    { key: "club", icon: Users, label: "انضم إلى نادٍ أو دائرة دراسة", hint: "التعلّم مع الزملاء أسرع وأمتع", to: "/clubs", cta: "اكتشف الأندية" },
    { key: "focus", icon: Timer, label: "أنجز أول جلسة تركيز", hint: "جرّب غرف التركيز المؤقّتة", to: "/focus", cta: "ابدأ جلسة" },
    { key: "venture", icon: Rocket, label: "صوّت لمشروع أو انضم إليه", hint: "ادعم أفكار زملائك أو شاركها", to: "/ventures", cta: "اكتشف المشاريع" },
  ];
  const doneCount = items.filter((i) => checks[i.key]).length;
  const pct = (doneCount / items.length) * 100;
  const complete = doneCount === items.length;

  /* Dashboard stays main-things-only: once every step is done the
     checklist retires itself instead of lingering as clutter. */
  if (complete) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <FadeUp>
      <section className={`relative overflow-hidden rounded-3xl border ft-shadow ${complete ? "ft-hero-gradient text-white border-transparent" : "bg-white border-slate-100"}`}>
        {complete && <div className="absolute -top-14 -left-14 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />}
        <button onClick={dismiss} aria-label="إخفاء القائمة"
          className={`pressable absolute top-3.5 left-3.5 z-10 w-8 h-8 rounded-full grid place-items-center transition-colors ${complete ? "bg-white/15 text-white hover:bg-white/25" : "bg-slate-50 text-slate-400 hover:text-slate-600"}`}>
          <X className="w-4 h-4" />
        </button>
        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-4 mb-5">
            <MiniRing pct={pct} />
            <div className="min-w-0">
              <h2 className="font-head font-bold text-lg flex items-center gap-2">
                {complete ? <PartyPopper className="w-5 h-5 text-amber-300" /> : <Sparkles className={`w-5 h-5 ${complete ? "" : "ft-text-accent"}`} />}
                {complete ? "أكملت قائمة الانطلاق!" : "قائمة انطلاقك"}
              </h2>
              <p className={`text-xs sm:text-sm mt-0.5 ${complete ? "text-white/75" : "text-slate-400"}`}>
                {complete
                  ? "رائع · أنت الآن عضو فعّال في النادي. أخفِ هذه القائمة وتصفّح كل الأقسام بحرّية."
                  : `أنجزت ${doneCount} من ${items.length} خطوات · خطوات صغيرة تصنع عضواً فعّالاً`}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => {
              const done = checks[it.key];
              const Icon = it.icon;
              const body = (
                <>
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 font-head text-xs font-black ${
                    done
                      ? "bg-emerald-500 text-white"
                      : complete ? "bg-white/15 text-white" : "bg-slate-100 text-slate-400"
                  }`}>
                    {done ? <CheckCircle2 className="w-4.5 h-4.5" /> : idx + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-bold truncate ${done ? (complete ? "text-white/85" : "text-slate-500") : (complete ? "text-white" : "text-slate-800")}`}>{it.label}</span>
                    {!done && <span className={`block text-[11px] truncate ${complete ? "text-white/60" : "text-slate-400"}`}>{it.hint}</span>}
                  </span>
                  {done
                    ? <span className={`shrink-0 text-[10px] font-extrabold px-2 py-1 rounded-full ${complete ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"}`}>تم</span>
                    : <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1.5 rounded-full ${complete ? "bg-white text-emerald-700" : "ft-btn-solid text-white"}`}>{it.cta} <ChevronLeft className="w-3 h-3" /></span>}
                </>
              );
              const cls = `flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors ${
                done
                  ? complete ? "bg-white/10" : "bg-emerald-50/50"
                  : complete ? "bg-white/10 hover:bg-white/15" : "bg-slate-50/70 hover:bg-slate-100/80"
              }`;
              return done
                ? <div key={it.key} className={cls}>{body}</div>
                : <Link key={it.key} to={it.to} className={`pressable ${cls}`}>{body}</Link>;
            })}
          </div>
        </div>
      </section>
    </FadeUp>
  );
}

/* ============================================================
   3) «نشاطي» · my activity timeline
   Primary source: /gamification/history (XP ledger). If it is
   unavailable, falls back to certificates + recent notifications
   merged from /certificates/mine and the /dashboard aggregate.
   ============================================================ */
export function MyActivityTimeline() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/gamification/history", { params: { limit: 8 } });
        if (!alive) return;
        setItems((data.items || []).map((t) => ({
          kind: "xp", amount: t.amount || 0,
          text: t.reason || "نقاط خبرة", at: t.created_at,
        })));
      } catch {
        const [certs, dash] = await Promise.allSettled([api.get("/certificates/mine"), api.get("/dashboard")]);
        if (!alive) return;
        const merged = [];
        if (certs.status === "fulfilled") {
          (Array.isArray(certs.value.data) ? certs.value.data : []).forEach((c) =>
            merged.push({ kind: "cert", text: c.title_line || "شهادة جديدة", at: c.created_at }));
        }
        if (dash.status === "fulfilled") {
          (dash.value.data?.recent_notifications || []).forEach((n) =>
            merged.push({ kind: "notif", text: n.title || "إشعار", at: n.created_at }));
        }
        merged.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        setItems(merged.slice(0, 8));
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!items) return null;

  return (
    <FadeUp>
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-head font-bold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" /> نشاطي
          </h2>
          <Link to="/points" className="pressable inline-flex items-center gap-0.5 text-sm font-medium text-indigo-600 min-h-[40px]">سجل النقاط <ChevronLeft className="w-4 h-4" /></Link>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 grid place-items-center mx-auto mb-2.5"><Zap className="w-6 h-6" /></div>
            <p className="text-sm text-slate-500 font-medium">لا نشاط بعد · اقرأ صفحة أو سجّل حضورك وستظهر مكاسبك هنا</p>
          </div>
        ) : (
          <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:start-[7px] before:w-px before:bg-slate-100">
            {items.map((it, i) => {
              const positive = it.kind === "xp" ? it.amount >= 0 : true;
              return (
                <li key={i} className="relative ps-7">
                  <span className={`absolute start-0 top-1 w-[15px] h-[15px] rounded-full ring-4 ring-white ${
                    it.kind === "cert" ? "bg-amber-400" : positive ? "bg-emerald-500" : "bg-rose-400"
                  }`} />
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-start gap-1.5 min-w-0">
                      {it.kind === "cert"
                        ? <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        : <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${positive ? "text-emerald-500" : "text-rose-400"}`} />}
                      <span className="text-sm font-medium text-slate-700 leading-snug">{it.text}</span>
                    </span>
                    {it.kind === "xp" && it.amount !== 0 && (
                      <span className={`shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                        {positive ? "+" : ""}{it.amount} XP
                      </span>
                    )}
                  </div>
                  {it.at && <div className="text-[11px] text-slate-400 mt-0.5">{timeAgo(it.at)}</div>}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </FadeUp>
  );
}
