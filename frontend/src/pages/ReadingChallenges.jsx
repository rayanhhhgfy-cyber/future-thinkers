import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { BookOpen, Plus, Users, Target, Clock, Crown, CalendarRange, Flame, UserPlus, Search, X, Award, Check, Loader2 } from "lucide-react";

const normMonthly = (d) => {
  if (!d || typeof d !== "object") return null;
  const lb = d.leaderboard || d.top || d.top10 || d.leaders || [];
  let daysLeft = d.days_left ?? d.daysLeft ?? null;
  if (daysLeft === null && (d.ends_at || d.ends || d.month_ends)) {
    const t = Date.parse(d.ends_at || d.ends || d.month_ends);
    if (!Number.isNaN(t)) daysLeft = Math.max(0, Math.ceil((t - Date.now()) / 86400000));
  }
  return {
    title: d.title || d.name || "تحدي القراءة الشهري",
    myBooks: d.my_books ?? d.books_read ?? d.my_books_count ?? d.progress?.books ?? d.my?.books ?? 0,
    target: d.goal_books ?? d.target_books ?? d.goal ?? 3,
    daysLeft,
    leaderboard: (Array.isArray(lb) ? lb : []).map((x) => ({
      id: x.user_id || x.id,
      name: x.name || x.user_name || "قارئ",
      avatar: x.avatar_url || x.avatar || x.user_avatar || null,
      books: x.books ?? x.books_read ?? x.pages ?? 0,
    })).filter((x) => x.id),
  };
};

const badgeNameOf = (c) => {
  const b = c?.badge ?? c?.badge_name;
  if (!b) return null;
  if (typeof b === "string") return b;
  return b.name || b.title || "شارة بطل القراءة";
};

export default function ReadingChallenges() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [form, setForm] = useState({ title: "", target_pages: 200, days: 7 });
  const [creating, setCreating] = useState(false);
  const [inviteFor, setInviteFor] = useState(null);
  const [mQuery, setMQuery] = useState("");
  const [mResults, setMResults] = useState([]);
  const [mLoading, setMLoading] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [invitedIds, setInvitedIds] = useState({});
  const load = () => api.get("/reading-challenges").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get("/reading-challenges/monthly").then((r) => setMonthly(normMonthly(r.data))).catch(() => setMonthly(null));
  }, []);

  useEffect(() => {
    if (!inviteFor) return;
    const t = setTimeout(async () => {
      setMLoading(true);
      try {
        const params = new URLSearchParams();
        if (mQuery.trim()) params.set("q", mQuery.trim());
        params.set("limit", "20");
        const { data } = await api.get(`/users/directory?${params.toString()}`);
        setMResults(data.items || []);
      } catch { setMResults([]); }
      setMLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [mQuery, inviteFor]);

  const invite = async (m) => {
    if (!inviteFor || invitingId) return;
    setInvitingId(m.id);
    try {
      await api.post(`/reading-challenges/${inviteFor.id}/invite`, { user_id: m.id });
      setInvitedIds((s) => ({ ...s, [m.id]: true }));
      toast.success(`أُرسلت الدعوة إلى ${m.name} 📚`);
    } catch (e) { toast.error(apiErr(e)); }
    setInvitingId(null);
  };

  const openInvite = (c) => { setInviteFor(c); setMQuery(""); setMResults([]); };

  const create = async () => {
    if (form.title.trim().length < 3) return toast.error("عنوان التحدي قصير");
    setCreating(true);
    try { await api.post("/reading-challenges", { ...form, target_pages: Number(form.target_pages), days: Number(form.days) }); setForm({ title: "", target_pages: 200, days: 7 }); load(); toast.success("أُطلق التحدي · أنت أول المشاركين 🚀"); }
    catch (e) { toast.error(apiErr(e)); }
    setCreating(false);
  };
  const join = async (id) => {
    try { await api.post(`/reading-challenges/${id}/join`); load(); toast.success("انضممت للتحدي · بالتوفيق 📚"); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const inputCls = "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 lg:px-4 lg:py-3 text-sm lg:text-[15px] outline-none ft-focus-border-accent focus:bg-white transition w-full min-h-[44px]";
  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 lg:py-10 xl:py-12">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-14 xl:px-16 xl:py-16 mb-8 lg:mb-10 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-6 w-80 h-80 rounded-full bg-emerald-300/15 blur-3xl" />
          <BookOpen className="pointer-events-none absolute -left-8 -bottom-10 w-52 h-52 text-white/[0.07] -rotate-12" />
          <Flame className="pointer-events-none absolute left-8 top-6 w-10 h-10 text-amber-300/30 animate-float hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 text-white text-xs font-bold backdrop-blur-sm"><BookOpen className="w-3.5 h-3.5" /> اقرأوا معاً، تنافسوا معاً</span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold text-white mt-4 leading-tight">تحديات القراءة <span className="animate-gradient-text bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">الجماعية</span></h1>
            <p className="text-white/75 text-sm sm:text-base lg:text-lg mt-3 max-w-xl lg:max-w-2xl xl:max-w-3xl leading-relaxed">أطلق تحدي صفحات وانضم مع زملائك · صفحاتك تُحتسب تلقائياً أثناء القراءة في المتصفح.</p>
            {items && items.length > 0 && (
              <div className="mt-6 lg:mt-8 flex flex-wrap gap-2 lg:gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Target className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-amber-300" /> {items.length} تحدٍّ جارٍ</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Users className="w-3.5 h-3.5 lg:w-5 lg:h-5 ft-text-accent-bright" /> {items.reduce((s, c) => s + (c.member_count || 0), 0)} مشارك</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Flame className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-orange-300" /> {items.reduce((s, c) => s + (c.target_pages || 0), 0)} صفحة هدف</span>
              </div>
            )}
          </div>
        </div>

        {/* monthly challenge hero */}
        {monthly && (monthly.myBooks > 0 || monthly.target > 0 || monthly.leaderboard.length > 0) && (() => {
          const mPct = monthly.target > 0 ? Math.min(100, Math.round((monthly.myBooks / monthly.target) * 100)) : 0;
          const MR = 34, MC = 2 * Math.PI * MR;
          return (
            <div data-testid="monthly-challenge" className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-amber-100 ft-shadow-lg mb-8 lg:mb-10">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-yellow-500 to-emerald-500" />
              <div className="pointer-events-none absolute -top-20 -left-16 w-64 h-64 rounded-full bg-amber-300/15 blur-3xl" />
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)]">
                <div className="relative p-5 sm:p-6 lg:p-8 flex items-center gap-5">
                  <div className="relative w-[84px] h-[84px] lg:w-[104px] lg:h-[104px] shrink-0">
                    <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
                      <circle cx="42" cy="42" r={MR} fill="none" strokeWidth="7" className="stroke-slate-100" />
                      <circle cx="42" cy="42" r={MR} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-amber-500 transition-all duration-700" strokeDasharray={MC} strokeDashoffset={MC * (1 - mPct / 100)} />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center text-center">
                      <span>
                        <span className="block font-head text-lg lg:text-2xl font-black text-slate-900 leading-none">{monthly.myBooks}<span className="text-slate-300">/{monthly.target}</span></span>
                        <span className="block text-[10px] font-bold text-slate-400 mt-1">كتب هذا الشهر</span>
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-l from-amber-400 to-orange-500 text-white text-[11px] font-extrabold shadow-md shadow-amber-500/25"><Flame className="w-3.5 h-3.5" /> تحدي الشهر</span>
                    <h2 className="font-head text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mt-2.5 leading-snug">{monthly.title}</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">أنجزت <b className="text-slate-800">{monthly.myBooks}</b> من <b className="text-slate-800">{monthly.target}</b> كتب مستهدفة هذا الشهر · أكمل التحدي واحصد شارة بطل القراءة.</p>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      {monthly.daysLeft !== null && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 ring-1 ring-amber-100 text-amber-700 text-[11px] font-extrabold"><Clock className="w-3.5 h-3.5" /> تبقّى {monthly.daysLeft} يوم</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full ft-bg-soft ring-1 ft-ring-accent ft-text-accent text-[11px] font-extrabold"><Target className="w-3.5 h-3.5" /> {mPct}% من الهدف</span>
                      <Link to="/library" className="pressable inline-flex items-center gap-1.5 px-4 min-h-[36px] rounded-full ft-btn-primary text-white text-[11px] font-extrabold shadow-md"><BookOpen className="w-3.5 h-3.5" /> اختر كتابك التالي</Link>
                    </div>
                  </div>
                </div>
                {monthly.leaderboard.length > 0 && (
                  <div className="relative border-t lg:border-t-0 lg:border-s border-slate-100 bg-slate-50/50 p-5 sm:p-6 lg:p-7">
                    <h3 className="font-head font-extrabold text-slate-800 text-sm mb-3.5 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Crown className="w-3.5 h-3.5" /></span>
                      صدارة الشهر
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {monthly.leaderboard.slice(0, 10).map((m, i) => (
                        <div key={m.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${i === 0 ? "bg-amber-50 ring-1 ring-amber-100" : ""}`}>
                          <span className={`w-5 text-center text-[11px] font-black shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i === 0 ? <Crown className="w-3.5 h-3.5 mx-auto" /> : i + 1}</span>
                          {m.avatar
                            ? <img src={m.avatar} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow shrink-0" />
                            : <span className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-black text-white shrink-0 ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "ft-icon-tile"}`}>{m.name?.[0] || "؟"}</span>}
                          <Link to={`/profile/${m.id}`} className="flex-1 min-w-0 text-[11px] font-bold text-slate-600 truncate ft-hover-text-accent">{m.name}</Link>
                          <span className="text-[10px] font-extrabold text-slate-400 shrink-0">{m.books} كتاب</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {items && items.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 gap-5 xl:gap-6 mb-8 xl:mb-10">
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl ft-bg-soft ft-text-accent grid place-items-center shrink-0"><Target className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.length}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">تحدٍّ جارٍ</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Users className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.reduce((s, c) => s + (c.member_count || 0), 0)}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">مشارك في التحديات</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Flame className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.reduce((s, c) => s + (c.target_pages || 0), 0)}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">صفحة هدف إجمالية</div>
              </div>
            </div>
          </div>
        )}

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 lg:p-7 xl:p-8 mb-8 lg:mb-10">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400" />
          <h2 className="font-head font-extrabold text-slate-900 text-lg lg:text-xl mb-5 lg:mb-6 flex items-center gap-2.5"><span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl ft-icon-tile grid place-items-center shadow-md"><Plus className="w-5 h-5 lg:w-6 lg:h-6" /></span> أطلق تحدّياً جديداً</h2>
          <div className="grid sm:grid-cols-[1fr_150px_130px_auto] lg:grid-cols-[1fr_180px_160px_auto] xl:grid-cols-[1fr_200px_170px_auto] gap-3 lg:gap-4 items-end">
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">الاسم</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="اسم التحدي: ماراثون أكتوبر" className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">هدف الصفحات</span>
              <input type="number" min={50} max={100000} value={form.target_pages} onChange={(e) => setForm({ ...form, target_pages: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">المدة</span>
              <select value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className={inputCls}>
                {[3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} يوم</option>)}
              </select>
            </label>
            <button onClick={create} disabled={creating} className="pressable h-[46px] lg:h-[52px] px-7 lg:px-9 rounded-xl ft-btn-primary shadow-lg text-sm lg:text-base font-bold disabled:opacity-50 min-w-[44px]">{creating ? "…" : "إطلاق"}</button>
          </div>
        </div>

        {!items ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={BookOpen} title="لا تحديات جارية" desc="أطلق أول تحدٍّ ودعُ زملاءك" />
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-5 lg:mb-7">
              <span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Flame className="w-5 h-5 lg:w-6 lg:h-6" /></span>
              <h2 className="font-head font-extrabold text-slate-900 text-lg lg:text-2xl">التحديات الجارية</h2>
              <span className="text-[11px] lg:text-xs font-bold px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full bg-slate-100 text-slate-500">{items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 lg:gap-6 xl:gap-7">
              {items.map((c, ci) => {
                const leader = c.members?.[0];
                const finished = leader && leader.pages >= c.target_pages;
                const badgeName = badgeNameOf(c);
                const leaderPct = leader ? Math.min(100, Math.round((leader.pages / c.target_pages) * 100)) : 0;
                const daysLeft = (() => { const t = Date.parse(c.ends); if (Number.isNaN(t)) return null; const d = Math.ceil((t - Date.now()) / 86400000); return d >= 0 ? d : null; })();
                const R = 26, CIRC = 2 * Math.PI * R;
                return (
                  <section key={c.id} className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 lg:p-7 flex flex-col" style={{ animationDelay: `${Math.min(ci, 8) * 60}ms` }}>
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400 opacity-80" />
                    <div className="flex items-start gap-3.5 lg:gap-4">
                      <div className="relative w-16 h-16 lg:w-20 lg:h-20 shrink-0">
                        <svg viewBox="0 0 64 64" className="w-16 h-16 lg:w-20 lg:h-20 -rotate-90">
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-slate-100" />
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-emerald-500 transition-all duration-700" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - leaderPct / 100)} />
                        </svg>
                        <span className="absolute inset-0 grid place-items-center text-[11px] lg:text-sm font-black text-emerald-700">{leaderPct}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-head font-extrabold text-slate-900 lg:text-lg leading-snug">{c.title}</h3>
                        <div className="text-[11px] lg:text-xs text-slate-400 mt-1.5 lg:mt-2 flex gap-x-3 gap-y-1 flex-wrap">
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {c.target_pages} صفحة</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.member_count} مشارك</span>
                          <span className="flex items-center gap-1"><CalendarRange className="w-3 h-3" /> حتى {c.ends}</span>
                          {daysLeft !== null && <span className="flex items-center gap-1 font-bold text-amber-600"><Flame className="w-3 h-3" /> باقي {daysLeft} يوم</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 lg:mt-5 flex items-center gap-2 flex-wrap">
                      {badgeName && <span className="inline-flex items-center gap-1 px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-gradient-to-l from-amber-400 via-yellow-500 to-amber-500 text-white text-[11px] font-extrabold shadow-md shadow-amber-500/30 ring-1 ring-amber-300"><Award className="w-3.5 h-3.5" /> {badgeName}</span>}
                      {finished && <span className="px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-gradient-to-l from-amber-100 to-yellow-100 ring-1 ring-amber-200 text-amber-700 text-[11px] font-extrabold">حُقق الهدف 🏆</span>}
                      {leader && <span className="inline-flex items-center gap-1 px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-amber-50 ring-1 ring-amber-100 text-amber-600 text-[11px] font-bold"><Crown className="w-3 h-3" /> المتصدر: {leader.name}</span>}
                      <span className="flex-1" />
                      {!c.joined && <button onClick={() => join(c.id)} className="pressable h-10 lg:h-11 px-5 lg:px-6 rounded-xl bg-gradient-to-l from-slate-900 to-slate-700 hover:from-emerald-600 hover:to-teal-600 shadow-md text-white text-xs lg:text-sm font-bold transition-colors min-w-[44px]">انضم</button>}
                      {c.joined && (
                        <>
                          <button data-testid={`invite-open-${c.id}`} onClick={() => openInvite(c)} className="pressable inline-flex items-center gap-1.5 h-10 lg:h-11 px-4 lg:px-5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-amber-300 hover:text-amber-600 hover:bg-amber-50 shadow-sm text-xs lg:text-sm font-bold transition-colors min-w-[44px]">
                            <UserPlus className="w-4 h-4" /> ادعُ صديقاً
                          </button>
                          <span className="px-3.5 py-2 lg:px-4 lg:py-2.5 lg:text-xs rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-[11px] font-extrabold shadow-md shadow-emerald-500/25 shrink-0">مشارك ✓</span>
                        </>
                      )}
                    </div>
                    <div className="mt-5 lg:mt-6 space-y-1.5 lg:space-y-2 flex-1">
                      {(c.members || []).slice(0, 5).map((m, i) => {
                        const pct = Math.min(100, Math.round((m.pages / c.target_pages) * 100));
                        return (
                          <div key={m.user_id} className={`flex items-center gap-2.5 lg:gap-3 rounded-2xl px-2 py-1.5 lg:px-3 lg:py-2 ${i === 0 ? "bg-amber-50/70 ring-1 ring-amber-100" : ""}`}>
                            <span className={`w-6 lg:w-7 text-center text-xs lg:text-sm font-black shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i === 0 ? <Crown className="w-4 h-4 lg:w-5 lg:h-5 mx-auto" /> : i + 1}</span>
                            <span className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full grid place-items-center text-[11px] lg:text-xs font-black text-white shrink-0 ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" : i === 2 ? "bg-gradient-to-br from-orange-300 to-amber-500" : "ft-icon-tile"}`}>{m.name?.[0] || "؟"}</span>
                            <Link to={`/profile/${m.user_id}`} className="text-xs lg:text-sm font-bold text-slate-600 w-24 sm:w-28 lg:w-32 truncate ft-hover-text-accent shrink-0 min-h-[44px] inline-flex items-center">{m.name}</Link>
                            <div className="flex-1 h-2 lg:h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-gradient-to-l from-amber-400 to-orange-400" : "ft-grad-bar"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] lg:text-xs font-bold text-slate-400 w-14 lg:w-16 text-left shrink-0">{m.pages} ص</span>
                          </div>
                        );
                      })}
                      {c.member_count === 0 && <p className="text-xs lg:text-sm text-slate-300">لا مشاركين بعد</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-8 lg:mt-10 flex items-center gap-3 rounded-2xl lg:rounded-[1.4rem] ft-bg-soft ring-1 ft-ring-accent px-4 py-3.5 lg:px-6 lg:py-5 text-xs lg:text-sm font-semibold ft-text-accent"><span className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-white ft-text-accent grid place-items-center shrink-0 shadow-sm"><Clock className="w-4 h-4 lg:w-5 lg:h-5" /></span> تُحتسب الصفحات تلقائياً من قراءتك داخل الموقع · بدون أي إدخال يدوي.</div>
      </div>

      {/* invite a friend dialog */}
      {inviteFor && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setInviteFor(null)}>
          <div data-testid="challenge-invite-dialog" className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden animate-scale-in ft-shadow-lg" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-yellow-500 to-emerald-500 z-10" />
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-head font-bold flex items-center gap-2 text-slate-800"><span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><UserPlus className="w-4 h-4" /></span> ادعُ صديقاً إلى «{inviteFor.title}»</h3>
              <button onClick={() => setInviteFor(null)} aria-label="إغلاق" className="pressable w-11 h-11 grid place-items-center rounded-full hover:bg-slate-100 shrink-0"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input autoFocus value={mQuery} onChange={(e) => setMQuery(e.target.value)} placeholder="ابحث باسم الصديق…"
                  className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 ps-4 pe-10 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition" />
              </div>
              <div className="mt-3 max-h-72 overflow-y-auto space-y-1.5 pe-0.5">
                {mLoading ? (
                  <div className="grid place-items-center py-8"><Loader2 className="w-6 h-6 animate-spin ft-text-accent" /></div>
                ) : mResults.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">{mQuery.trim() ? "لا نتائج مطابقة · جرّب اسماً آخر" : "اكتب اسم صديق لعرض النتائج"}</p>
                ) : mResults.filter((m) => m.id !== user?.id).map((m) => {
                  const alreadyMember = (inviteFor.members || []).some((mm) => mm.user_id === m.id);
                  const invited = !!invitedIds[m.id];
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2 ring-1 ring-slate-100 bg-white">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow shrink-0" />
                        : <span className="w-10 h-10 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shadow shrink-0">{m.name?.[0]}</span>}
                      <span className="flex-1 min-w-0">
                        <span className="block font-head font-bold text-sm text-slate-800 truncate">{m.name}</span>
                        {m.school_name && <span className="block text-[10px] text-slate-400 truncate">{m.school_name}</span>}
                      </span>
                      {alreadyMember ? (
                        <span className="inline-flex items-center gap-1 px-3 min-h-[38px] rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 text-[11px] font-extrabold shrink-0"><Check className="w-3.5 h-3.5" /> مشارك</span>
                      ) : invited ? (
                        <span className="inline-flex items-center gap-1 px-3 min-h-[38px] rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100 text-[11px] font-extrabold shrink-0"><Check className="w-3.5 h-3.5" /> أُرسلت الدعوة</span>
                      ) : (
                        <button onClick={() => invite(m)} disabled={invitingId === m.id}
                          className="pressable inline-flex items-center gap-1.5 px-4 min-h-[38px] rounded-full ft-btn-primary text-white text-[11px] font-extrabold shadow-md disabled:opacity-60 shrink-0">
                          {invitingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} دعوة
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-300 text-center mt-3">سيصل صديقك إشعار بالدعوة ويمكنه الانضمام بنقرة واحدة</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
