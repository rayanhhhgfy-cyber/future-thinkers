import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import {
  Users, Plus, Copy, Check, Trash2, LogOut, Crown, Target, Trophy,
  X, Loader2, Search, Hash, ArrowRight, UserPlus, Sparkles,
} from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

function Avatar({ person, size = "w-11 h-11", text = "text-base" }) {
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt="" className={`${size} rounded-full object-cover ring-2 ring-white shrink-0`} />;
  }
  return (
    <span className={`${size} rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shrink-0 ${text}`}>
      {person?.name?.[0] || "؟"}
    </span>
  );
}

const RANK_STYLES = [
  "bg-amber-100 text-amber-600 ring-amber-200",
  "bg-slate-100 text-slate-500 ring-slate-200",
  "bg-orange-100 text-orange-600 ring-orange-200",
];

export default function Circles() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const load = useCallback(async (quiet = false) => {
    try {
      const { data } = await api.get("/circles");
      setItems(Array.isArray(data) ? data : data?.items || []);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e);
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const loadDetail = useCallback(async (id) => {
    setDetail(null);
    setDetailError(null);
    try {
      const { data } = await api.get(`/circles/${id}`);
      setDetail(data?.circle || data);
    } catch (e) {
      setDetailError(e);
    }
  }, []);

  const openCircle = (id) => { setActiveId(id); loadDetail(id); };
  const backToList = () => { setActiveId(null); setDetail(null); load(true); };

  const create = async () => {
    const n = name.trim();
    if (!n || creating) return;
    setCreating(true);
    try {
      const { data } = await api.post("/circles", { name: n, goal: goal.trim() });
      toast.success("تم إنشاء الدائرة بنجاح");
      setCreateOpen(false);
      setName(""); setGoal("");
      await load(true);
      const id = data?.id || data?.circle?.id;
      if (id) openCircle(id);
    } catch (e) { toast.error(apiErr(e)); }
    setCreating(false);
  };

  const join = async () => {
    const code = joinCode.trim();
    if (!code || joining) return;
    setJoining(true);
    try {
      const { data } = await api.post("/circles/join", { code });
      toast.success("أهلاً بك في الدائرة");
      setJoinCode("");
      await load(true);
      const id = data?.id || data?.circle?.id;
      if (id) openCircle(id);
    } catch (e) { toast.error(apiErr(e)); }
    setJoining(false);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("تم نسخ رمز الدائرة");
    } catch { toast.error("تعذّر النسخ"); }
  };

  const leave = async () => {
    if (!activeId || busyAction) return;
    setBusyAction(true);
    try {
      await api.post(`/circles/${activeId}/leave`);
      toast.success("غادرت الدائرة");
      backToList();
    } catch (e) { toast.error(apiErr(e)); }
    setBusyAction(false);
  };

  const remove = async () => {
    if (!activeId || busyAction) return;
    setBusyAction(true);
    try {
      await api.delete(`/circles/${activeId}`);
      toast.success("تم حذف الدائرة");
      setDeleteOpen(false);
      backToList();
    } catch (e) { toast.error(apiErr(e)); }
    setBusyAction(false);
  };

  if (!ready) return (<Layout><PageLoader /></Layout>);
  if (!user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <EmptyState
            icon={Users}
            title="سجّل دخولك أولاً"
            desc="دوائر الدراسة متاحة لأعضاء النادي المسجلين"
            action={<Link to="/login" className="pressable inline-flex min-h-[44px] items-center rounded-full ft-btn-primary px-6 text-sm font-bold text-white shadow-md">تسجيل الدخول</Link>}
          />
        </div>
      </Layout>
    );
  }

  /* ------------------------- detail view ------------------------- */
  if (activeId) {
    const members = [...(detail?.members || [])].sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
    const isOwner = detail && String(detail.owner_id) === String(user.id);
    return (
      <Layout>
        <div className="max-w-5xl xl:max-w-[1200px] mx-auto px-4 lg:px-6 py-6 sm:py-8">
          <button onClick={backToList} className="pressable inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:ft-text-accent transition mb-5 min-h-[44px]">
            <ArrowRight className="w-4 h-4" /> كل الدوائر
          </button>

          {detail === null && !detailError ? (
            <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin ft-text-accent" /></div>
          ) : detailError ? (
            <ErrorState error={detailError} onRetry={() => loadDetail(activeId)} context="circle-detail" />
          ) : (
            <>
              {/* circle header */}
              <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-5 py-7 sm:px-10 sm:py-9 mb-6">
                <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
                <Users className="pointer-events-none absolute -left-8 -bottom-12 w-44 h-44 text-white/[0.07] -rotate-12" />
                <Target className="pointer-events-none absolute right-10 -top-10 w-28 h-28 text-white/[0.05] rotate-12 hidden sm:block" aria-hidden="true" />
                <div className="relative">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold shadow-lg">
                    <Users className="w-3.5 h-3.5" /> دائرة دراسة
                  </span>
                  <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">{detail.name}</h1>
                  {detail.goal && (
                    <p className="flex items-center gap-1.5 text-white/75 text-sm sm:text-base mt-2 leading-relaxed">
                      <Target className="w-4 h-4 shrink-0" /> {detail.goal}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2.5 mt-5">
                    <button
                      onClick={() => copyCode(detail.code)}
                      className="pressable inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-white text-sm font-bold ft-text-accent shadow-lg hover:bg-white/90 transition"
                    >
                      <Hash className="w-4 h-4" /> رمز الدعوة: <span className="tracking-widest">{detail.code}</span>
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-xs font-bold">
                      <Users className="w-3.5 h-3.5" /> {members.length} عضو
                    </span>
                    {isOwner ? (
                      <button
                        onClick={() => setDeleteOpen(true)}
                        className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition"
                      >
                        <Trash2 className="w-4 h-4" /> حذف الدائرة
                      </button>
                    ) : (
                      <button
                        onClick={leave}
                        disabled={busyAction}
                        className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/25 text-white text-xs font-bold transition disabled:opacity-60"
                      >
                        {busyAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} مغادرة الدائرة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_310px] gap-5 items-start">
              {/* members leaderboard */}
              <div className="bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg overflow-hidden relative min-w-0">
                <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                <div className="flex items-center gap-2 px-5 sm:px-7 pt-6 pb-4">
                  <Trophy className="w-5 h-5 ft-text-accent" />
                  <h2 className="font-head font-extrabold text-lg text-slate-800">صدارة المساهمين</h2>
                  <span className="text-[11px] text-slate-400">حسب نقاط المساهمة داخل الدائرة</span>
                </div>
                {members.length === 0 ? (
                  <EmptyState icon={Users} title="لا أعضاء بعد" desc="شارك رمز الدعوة مع زملائك ليظهر الترتيب هنا" />
                ) : (
                  <ul className="px-3 sm:px-4 pb-5 space-y-1.5">
                    {members.map((m, i) => {
                      const me = String(m.id) === String(user.id);
                      return (
                        <li key={m.id}>
                          <div className={`flex items-center gap-3 p-3 rounded-2xl transition ${me ? "ft-bg-soft ring-1 ft-ring-accent" : i === 0 && (m.contribution || 0) > 0 ? "bg-amber-50/70 ring-1 ring-amber-200/60" : "hover:bg-slate-50"}`}>
                            <span className={`w-9 h-9 rounded-full grid place-items-center font-head font-extrabold text-sm shrink-0 ring-1 ${RANK_STYLES[i] || "bg-slate-50 text-slate-400 ring-slate-100"}`}>
                              {i + 1}
                            </span>
                            <Avatar person={m} size="w-10 h-10" text="text-sm" />
                            <div className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5">
                                <Link to={`/profile/${m.id}`} className="font-head font-bold text-[15px] text-slate-800 ft-hover-text-accent transition-colors truncate">{m.name}</Link>
                                {String(detail.owner_id) === String(m.id) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 text-[10px] font-bold shrink-0">
                                    <Crown className="w-3 h-3" /> القائد
                                  </span>
                                )}
                                {me && <span className="px-2 py-0.5 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-[10px] font-bold shrink-0">أنت</span>}
                              </span>
                              <span className="text-[11px] text-slate-400">مساهمة داخل الدائرة</span>
                              <span className="mt-1.5 block h-1.5 max-w-[180px] rounded-full bg-slate-100 overflow-hidden">
                                <span className="block h-full rounded-full ft-grad-bar transition-all duration-500" style={{ width: `${members[0]?.contribution ? Math.min(100, Math.round(((m.contribution || 0) / members[0].contribution) * 100)) : 0}%` }} />
                              </span>
                            </div>
                            <span className="text-end shrink-0">
                              <span className="block font-head font-extrabold text-slate-800">{fmt(m.contribution)}</span>
                              <span className="block text-[10px] text-slate-300 font-bold">XP</span>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* about rail */}
              <aside className="hidden lg:block sticky top-24">
                <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg p-6">
                  <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                  <Hash className="pointer-events-none absolute -left-6 -bottom-8 w-28 h-28 text-slate-900/[0.04] -rotate-12" aria-hidden="true" />
                  <h3 className="relative font-head font-extrabold text-slate-800 flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><Users className="w-4 h-4" /></span>
                    عن الدائرة
                  </h3>
                  <div className="relative mt-5 space-y-3">
                    {detail.goal && (
                      <div className="rounded-2xl ft-bg-soft ring-1 ft-ring-accent px-4 py-3">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold ft-text-accent"><Target className="w-3.5 h-3.5" /> الهدف المشترك</span>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed mt-1">{detail.goal}</p>
                      </div>
                    )}
                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Users className="w-3.5 h-3.5" /> الأعضاء</span>
                      <p className="font-head text-lg font-extrabold text-slate-800 mt-0.5">{members.length} عضو</p>
                    </div>
                    <button
                      onClick={() => copyCode(detail.code)}
                      className="pressable w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-md"
                    >
                      <Hash className="w-4 h-4" /> رمز الدعوة: <span className="tracking-widest">{detail.code}</span>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <p className="text-[11px] text-slate-300 text-center leading-relaxed">شارك الرمز مع زملائك لينضموا إلى الدائرة</p>
                  </div>
                </div>
              </aside>
              </div>
            </>
          )}
        </div>

        {/* delete confirm */}
        {deleteOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => !busyAction && setDeleteOpen(false)}>
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in ft-shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-500 grid place-items-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-head font-bold text-lg text-slate-800 mt-4">حذف الدائرة نهائيًا؟</h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">سيتم حذف «{detail?.name}» وترتيب أعضائها. لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
              <div className="flex gap-2.5 px-5 pb-5">
                <button onClick={() => setDeleteOpen(false)} disabled={busyAction} className="pressable flex-1 min-h-[44px] rounded-full border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60">إلغاء</button>
                <button onClick={remove} disabled={busyAction} className="pressable flex-1 min-h-[44px] rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-md transition disabled:opacity-60 inline-flex items-center justify-center gap-1.5">
                  {busyAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} حذف نهائي
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  /* ------------------------- list view ------------------------- */
  const visible = (items || []).filter((c) => !filter.trim()
    || (c.name || "").includes(filter.trim())
    || (c.leader_name || "").includes(filter.trim()));

  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1400px] mx-auto px-4 lg:px-6 py-6 sm:py-8 pb-24 lg:pb-8">
        {/* hero */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-5 py-7 sm:px-10 sm:py-9 mb-6">
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-16 w-80 h-80 rounded-full bg-teal-300/15 blur-3xl" />
          <Users className="pointer-events-none absolute -left-8 -bottom-12 w-44 h-44 text-white/[0.07] -rotate-12" />
          <Target className="pointer-events-none absolute right-10 -top-10 w-28 h-28 text-white/[0.05] rotate-12 hidden sm:block" aria-hidden="true" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold shadow-lg">
                <Sparkles className="w-3.5 h-3.5" /> ادرسوا معًا · تقدّموا معًا
              </span>
              <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">دوائر الدراسة</h1>
              <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">أنشئ دائرة مع زملائك، ضعوا هدفًا مشتركًا، وتنافسوا على صدارة المساهمين داخل دائرتكم.</p>
              {!!items?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <Users className="w-3.5 h-3.5" /> {items.length} دائرة
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <Trophy className="w-3.5 h-3.5" /> مجموع مساهماتك {fmt((items || []).reduce((s, c) => s + (c.my_contribution || 0), 0))} XP
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => setCreateOpen(true)} className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full bg-white text-sm font-bold ft-text-accent shadow-lg hover:bg-white/90 transition shrink-0">
              <Plus className="w-4 h-4" /> دائرة جديدة
            </button>
          </div>
        </div>

        {/* join + search */}
        <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-4 mb-6 sticky top-20 z-30 glass rounded-[1.6rem] p-2.5 ring-1 ring-slate-100 ft-shadow">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="ابحث في الدوائر…"
              className="w-full h-full min-h-[52px] rounded-2xl border border-slate-200 bg-white ps-4 pe-10 py-3 text-sm outline-none focus:ring-2 ft-ring-accent transition shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") join(); }}
                placeholder="رمز الدعوة…"
                className="w-full min-h-[52px] rounded-2xl border border-slate-200 bg-white ps-4 pe-10 py-3 text-sm outline-none focus:ring-2 ft-ring-accent transition shadow-sm tracking-widest"
              />
            </div>
            <button
              onClick={join}
              disabled={joining || !joinCode.trim()}
              className="pressable inline-flex items-center gap-1.5 min-h-[52px] px-5 rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-md disabled:opacity-50 shrink-0"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} انضم
            </button>
          </div>
        </div>

        {/* cards */}
        {items === null ? (
          <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin ft-text-accent" /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => load()} context="circles-list" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filter.trim() ? "لا نتائج مطابقة" : "لا دوائر بعد"}
            desc={filter.trim() ? "جرّب كلمة أخرى" : "أنشئ أول دائرة دراسة وادعُ زملاءك برمز الدعوة"}
            action={!filter.trim() && (
              <button onClick={() => setCreateOpen(true)} className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full ft-btn-primary px-5 text-xs font-bold text-white shadow-md">
                <Plus className="w-4 h-4" /> دائرة جديدة
              </button>
            )}
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((c, i) => (
              <button
                key={c.id}
                onClick={() => openCircle(c.id)}
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                className="pressable hover-lift animate-fade-up group relative overflow-hidden bg-white rounded-[1.75rem] border border-slate-100 ft-shadow-lg p-5 text-start"
              >
                <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                <span className="flex items-start justify-between gap-3">
                  <span className="w-12 h-12 rounded-2xl ft-navy-gradient text-white grid place-items-center shrink-0 shadow-lg transition duration-300 group-hover:scale-105">
                    <Users className="w-6 h-6" />
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-[11px] font-bold">
                    مساهمتي · {fmt(c.my_contribution)} XP
                  </span>
                </span>
                <h3 className="font-head font-extrabold text-lg text-slate-800 mt-3.5 truncate group-hover:ft-text-accent transition-colors">{c.name}</h3>
                {c.goal && <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate"><Target className="w-3.5 h-3.5 shrink-0" /> {c.goal}</p>}
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[11px] font-bold text-slate-400">
                  <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" /> {c.leader_name || "بدون قائد"}</span>
                  <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {fmt(c.members_count)} عضو</span>
                  <span className="inline-flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {c.code}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* mobile create FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="pressable lg:hidden fixed bottom-5 start-5 z-40 inline-flex items-center gap-1.5 min-h-[52px] px-5 rounded-full ft-btn-primary text-white text-sm font-bold shadow-2xl"
      >
        <Plus className="w-5 h-5" /> دائرة جديدة
      </button>

      {/* create dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)}>
          <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden animate-scale-in ft-shadow-lg" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar z-10" />
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-head font-bold flex items-center gap-2"><Users className="w-5 h-5 ft-text-accent" /> دائرة دراسة جديدة</h3>
              <button onClick={() => setCreateOpen(false)} aria-label="إغلاق" className="w-11 h-11 grid place-items-center rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الدائرة</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="مثال: أبطال الرياضيات"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">الهدف المشترك</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  maxLength={120}
                  placeholder="مثال: إنهاء 10 كتب هذا الفصل"
                  onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
              <button
                onClick={create}
                disabled={creating || !name.trim()}
                className="pressable w-full min-h-[48px] rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء الدائرة
              </button>
              <p className="text-[11px] text-slate-300 text-center">بعد الإنشاء ستحصل على رمز دعوة تشاركه مع زملائك</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
