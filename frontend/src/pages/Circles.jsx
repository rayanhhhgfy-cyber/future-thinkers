import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import {
  Users, Plus, Copy, Check, Trash2, LogOut, Crown, Target, Trophy,
  X, Loader2, Search, Hash, ArrowRight, UserPlus, Sparkles,
  MessageCircle, Send, Lock, Pencil, Swords, PartyPopper, Timer, Flame,
} from "lucide-react";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const timeFmt = (iso) => {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return ""; }
};

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

  /* detail tabs + new features */
  const [tab, setTab] = useState("members");
  const [messages, setMessages] = useState(null);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatState, setChatState] = useState("idle"); // idle | ok | forbidden | hidden
  const chatScrollRef = useRef(null);
  const [goalInput, setGoalInput] = useState("");
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [chTitle, setChTitle] = useState("");
  const [chTarget, setChTarget] = useState("");
  const [chDays, setChDays] = useState("");
  const [chSaving, setChSaving] = useState(false);

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

  const openCircle = (id) => {
    setTab("members");
    setMessages(null);
    setChatState("idle");
    setChatText("");
    setGoalEditing(false);
    setActiveId(id);
    loadDetail(id);
  };
  const backToList = () => { setActiveId(null); setDetail(null); load(true); };

  /* ---- circle chat ---- */
  const loadChat = useCallback(async (quiet = false) => {
    if (!activeId) return;
    try {
      const { data } = await api.get(`/circles/${activeId}/messages`);
      setMessages(Array.isArray(data) ? data : data?.items || []);
      setChatState("ok");
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403) setChatState("forbidden");
      else if (!quiet) setChatState("hidden");
    }
  }, [activeId]);

  useEffect(() => {
    if (!activeId || chatState === "forbidden" || chatState === "hidden") return;
    loadChat();
    const t = setInterval(() => loadChat(true), 4000);
    return () => clearInterval(t);
  }, [activeId, chatState, loadChat]);

  useEffect(() => {
    if (chatState === "hidden" && tab === "chat") setTab("members");
  }, [chatState, tab]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el && tab === "chat") el.scrollTop = el.scrollHeight;
  }, [messages, tab]);

  const sendChat = async () => {
    const text = chatText.trim();
    if (!text || sending || !activeId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/circles/${activeId}/messages`, { text });
      setChatText("");
      const msg = data?.message || data;
      if (msg && msg.id) setMessages((prev) => [...(prev || []), msg]);
      else await loadChat(true);
    } catch (e) {
      if (e?.response?.status === 403) setChatState("forbidden");
      else toast.error(apiErr(e));
    }
    setSending(false);
  };

  /* ---- weekly goal ---- */
  const saveGoal = async () => {
    const xp = Number(goalInput);
    if (!xp || xp <= 0) { toast.error("أدخل هدفًا صحيحًا بالنقاط"); return; }
    if (goalSaving || !activeId) return;
    setGoalSaving(true);
    try {
      await api.put(`/circles/${activeId}/weekly-goal`, { xp });
      toast.success("تم تعيين هدف الأسبوع");
      setGoalEditing(false);
      await loadDetail(activeId);
    } catch (e) { toast.error(apiErr(e)); }
    setGoalSaving(false);
  };

  /* ---- circle challenge ---- */
  const createChallenge = async () => {
    const title = chTitle.trim();
    const target_xp = Number(chTarget);
    const days = Number(chDays);
    if (!title || !target_xp || target_xp <= 0 || !days || days <= 0) { toast.error("أكمل بيانات التحدي أولاً"); return; }
    if (chSaving || !activeId) return;
    setChSaving(true);
    try {
      await api.post(`/circles/${activeId}/challenge`, { title, target_xp, days });
      toast.success("بدأ تحدي الدائرة");
      setChTitle(""); setChTarget(""); setChDays("");
      await loadDetail(activeId);
    } catch (e) { toast.error(apiErr(e)); }
    setChSaving(false);
  };

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

    /* weekly goal */
    const weeklyGoal = detail?.weekly_goal != null ? Number(detail.weekly_goal) : null;
    const weekTotal = Number(detail?.week_total || 0);
    const goalPct = weeklyGoal ? Math.min(100, Math.round((weekTotal / weeklyGoal) * 100)) : 0;
    const showGoalCard = weeklyGoal != null || isOwner;
    const RING_R = 52;
    const RING_C = 2 * Math.PI * RING_R;

    /* challenge */
    const challenge = detail?.challenge || null;
    const chPct = challenge?.target ? Math.min(100, Math.round(((challenge.progress || 0) / challenge.target) * 100)) : 0;
    const chDaysLeft = challenge?.ends_at
      ? Math.max(0, Math.ceil((new Date(challenge.ends_at).getTime() - Date.now()) / 86400000))
      : null;

    const tabs = [
      { key: "members", label: "الأعضاء والهدف", icon: Users, dot: false },
      ...(chatState !== "hidden" ? [{ key: "chat", label: "المحادثة", icon: MessageCircle, dot: false }] : []),
      { key: "challenge", label: "التحدي", icon: Swords, dot: !!(challenge && !challenge.done) },
    ];

    const goalCard = showGoalCard ? (
      <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg p-6" data-testid="weekly-goal">
        <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
        <Target className="pointer-events-none absolute -left-6 -bottom-8 w-28 h-28 text-slate-900/[0.04] -rotate-12" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
          <div className="relative shrink-0">
            <svg viewBox="0 0 120 120" className="w-28 h-28 sm:w-32 sm:h-32 -rotate-90">
              <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="10" className="stroke-slate-100" />
              <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="10" strokeLinecap="round"
                stroke="var(--ft-accent)" strokeDasharray={RING_C}
                strokeDashoffset={RING_C - (RING_C * goalPct) / 100}
                className="transition-all duration-700" />
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              <span className="text-center">
                <span className="block font-head text-2xl font-extrabold text-slate-800">{goalPct}%</span>
                <span className="block text-[10px] font-bold text-slate-400">من الهدف</span>
              </span>
            </span>
          </div>
          <div className="flex-1 w-full text-center sm:text-start">
            <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2 justify-center sm:justify-start">
              <Target className="w-5 h-5 ft-text-accent" /> هدف الأسبوع
            </h3>
            {weeklyGoal ? (
              <>
                <p className="font-head text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2">
                  هدف الأسبوع: {fmt(weekTotal)} <span className="text-slate-300 text-lg">/ {fmt(weeklyGoal)} نقطة</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {weekTotal >= weeklyGoal
                    ? "أنجزتم هدف هذا الأسبوع · عمل رائع"
                    : `متبقي ${fmt(Math.max(0, weeklyGoal - weekTotal))} نقطة للوصول إلى الهدف`}
                </p>
                <span className="mt-3 block h-2.5 rounded-full bg-slate-100 overflow-hidden max-w-md mx-auto sm:mx-0">
                  <span className="block h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${goalPct}%` }} />
                </span>
              </>
            ) : (
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">لم يحدد القائد هدفًا لهذا الأسبوع بعد</p>
            )}
            {isOwner && (
              goalEditing ? (
                <div className="flex flex-wrap items-center gap-2 mt-4 justify-center sm:justify-start">
                  <input
                    type="number" min="1" inputMode="numeric" autoFocus
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); }}
                    placeholder="الهدف بالنقاط"
                    className="w-40 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                  />
                  <button onClick={saveGoal} disabled={goalSaving} className="pressable min-h-[44px] px-4 rounded-xl ft-btn-primary text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md disabled:opacity-60">
                    {goalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ الهدف
                  </button>
                  <button onClick={() => setGoalEditing(false)} disabled={goalSaving} className="pressable min-h-[44px] px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition disabled:opacity-60">إلغاء</button>
                </div>
              ) : (
                <button
                  onClick={() => { setGoalInput(weeklyGoal ? String(weeklyGoal) : ""); setGoalEditing(true); }}
                  className="pressable mt-4 inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-xs font-bold"
                >
                  <Pencil className="w-3.5 h-3.5" /> {weeklyGoal ? "تعديل الهدف" : "تعيين الهدف"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    ) : null;

    const chatPanel = (
      <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg" data-testid="circle-chat">
        <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
        <div className="flex items-center gap-2.5 px-5 sm:px-7 pt-6 pb-4">
          <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><MessageCircle className="w-4 h-4" /></span>
          <h2 className="font-head font-extrabold text-lg text-slate-800">محادثة الدائرة</h2>
          <span className="text-[11px] text-slate-400">حديث الأعضاء داخل الدائرة</span>
        </div>
        {chatState === "forbidden" ? (
          <div className="px-6 pb-9 pt-3 text-center">
            <div className="w-14 h-14 mx-auto rounded-full ft-bg-soft ring-1 ft-ring-accent grid place-items-center ft-text-accent">
              <Lock className="w-6 h-6" />
            </div>
            <p className="font-head font-bold text-slate-700 mt-3">المحادثة للأعضاء فقط</p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">انضم إلى الدائرة لتشارك في الحديث مع الأعضاء</p>
          </div>
        ) : (
          <>
            <div ref={chatScrollRef} className="h-[360px] sm:h-[430px] overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-white">
              {messages === null ? (
                <div className="grid place-items-center h-full"><Loader2 className="w-6 h-6 animate-spin ft-text-accent" /></div>
              ) : messages.length === 0 ? (
                <div className="grid place-items-center h-full text-center px-6">
                  <div>
                    <span className="w-14 h-14 mx-auto rounded-full bg-white ring-1 ring-slate-100 grid place-items-center ft-shadow">
                      <MessageCircle className="w-6 h-6 text-slate-300" />
                    </span>
                    <p className="text-sm font-bold text-slate-400 mt-3">لا رسائل بعد</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">كن أول من يبدأ الحديث في الدائرة</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = msg.mine != null ? !!msg.mine : String(msg.user?.id) === String(user.id);
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 animate-fade-up ${mine ? "flex-row-reverse" : ""}`}>
                      {!mine && <Avatar person={msg.user} size="w-8 h-8" text="text-xs" />}
                      <div className={`max-w-[78%] sm:max-w-[68%] px-3.5 py-2.5 shadow-sm ${mine
                        ? "ft-btn-primary text-white rounded-3xl rounded-bl-md"
                        : "bg-white ring-1 ring-slate-100 text-slate-700 rounded-3xl rounded-br-md"}`}>
                        {!mine && <span className="block text-[10px] font-bold ft-text-accent mb-0.5">{msg.user?.name}</span>}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        <span className={`block text-[9px] mt-1 text-end font-bold ${mine ? "text-white/70" : "text-slate-300"}`}>{timeFmt(msg.at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-slate-100 p-3 sm:p-4 flex items-center gap-2 bg-white">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder="اكتب رسالة للدائرة…"
                data-testid="circle-chat-input"
                className="flex-1 min-w-0 min-h-[48px] rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
              />
              <button
                onClick={sendChat}
                disabled={sending || !chatText.trim()}
                aria-label="إرسال الرسالة"
                className="pressable w-12 h-12 shrink-0 rounded-full ft-btn-primary text-white grid place-items-center shadow-md disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -scale-x-100" />}
              </button>
            </div>
          </>
        )}
      </div>
    );

    const challengePanel = challenge?.done ? (
      <div className="relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-9 text-center ft-shadow-lg" data-testid="circle-challenge">
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="relative">
          <span className="w-16 h-16 mx-auto rounded-full bg-white/15 backdrop-blur ring-1 ring-white/30 grid place-items-center shadow-xl">
            <PartyPopper className="w-8 h-8 text-amber-200" />
          </span>
          <h2 className="font-head text-2xl sm:text-3xl font-extrabold text-white mt-4">اكتمل التحدي</h2>
          <p className="text-white/85 font-bold mt-1.5">{challenge.title}</p>
          <p className="text-white/60 text-sm mt-2">حققت الدائرة {fmt(challenge.progress)} من {fmt(challenge.target)} نقطة · أحسنتم جميعًا</p>
          <span className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold">
            <Trophy className="w-3.5 h-3.5" /> تحدٍّ منجز
          </span>
        </div>
      </div>
    ) : challenge ? (
      <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg" data-testid="circle-challenge">
        <div className="relative overflow-hidden ft-hero-gradient grain px-6 py-6 sm:px-8">
          <div className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-orange-400/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 grid place-items-center shadow-lg">
              <Swords className="w-5 h-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-white/60">تحدي الدائرة الجاري</span>
              <h2 className="font-head font-extrabold text-white text-lg sm:text-xl leading-snug truncate">{challenge.title}</h2>
            </div>
            {chDaysLeft != null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-[11px] font-bold shrink-0">
                <Timer className="w-3.5 h-3.5" /> {chDaysLeft > 0 ? `متبقي ${fmt(chDaysLeft)} يوم` : "اليوم الأخير"}
              </span>
            )}
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <p className="font-head text-3xl font-extrabold text-slate-800">
              {fmt(challenge.progress)} <span className="text-slate-300 text-lg">/ {fmt(challenge.target)} نقطة</span>
            </p>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-xs font-bold">
              <Flame className="w-3.5 h-3.5" /> {chPct}% من الهدف
            </span>
          </div>
          <span className="mt-4 block h-3.5 rounded-full bg-slate-100 overflow-hidden">
            <span className="block h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${chPct}%` }} />
          </span>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            {chPct >= 100
              ? "وصلتم إلى الهدف · بانتظار إعلان الاكتمال"
              : `متبقي ${fmt(Math.max(0, (challenge.target || 0) - (challenge.progress || 0)))} نقطة · كل مساهمة من الأعضاء تقرّب الدائرة من خط النهاية`}
          </p>
        </div>
      </div>
    ) : isOwner ? (
      <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg p-6 sm:p-7" data-testid="circle-challenge">
        <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
        <h2 className="font-head font-extrabold text-lg text-slate-800 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><Swords className="w-4 h-4" /></span>
          إطلاق تحدٍّ للدائرة
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">حدّد هدفًا جماعيًا بالنقاط ومدة زمنية، وتابعوا تقدم الدائرة معًا حتى خط النهاية</p>
        <div className="space-y-3.5 mt-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">عنوان التحدي</label>
            <input
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              maxLength={80}
              placeholder="مثال: ماراثون الألف نقطة"
              className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">الهدف (نقاط XP)</label>
              <input
                type="number" min="1" inputMode="numeric"
                value={chTarget}
                onChange={(e) => setChTarget(e.target.value)}
                placeholder="1000"
                className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">المدة (أيام)</label>
              <input
                type="number" min="1" inputMode="numeric"
                value={chDays}
                onChange={(e) => setChDays(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createChallenge(); }}
                placeholder="7"
                className="w-full min-h-[48px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
              />
            </div>
          </div>
          <button
            onClick={createChallenge}
            disabled={chSaving || !chTitle.trim() || !chTarget || !chDays}
            className="pressable w-full min-h-[48px] rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {chSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />} بدء التحدي
          </button>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg">
        <EmptyState icon={Swords} title="لا تحدٍّ نشط حاليًا" desc="حين يطلق قائد الدائرة تحدٍّ جماعيًا سيظهر تقدمه هنا" />
      </div>
    );

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

              {/* detail tabs */}
              <div className="flex gap-1.5 p-1.5 mb-5 rounded-full bg-white border border-slate-100 ft-shadow overflow-x-auto animate-fade-up" role="tablist">
                {tabs.map((t) => {
                  const TabIcon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.key)}
                      className={`pressable relative flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition ${active ? "ft-btn-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                    >
                      <TabIcon className="w-4 h-4 shrink-0" /> {t.label}
                      {t.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-amber-300" : "bg-orange-400 animate-pulse"}`} />}
                    </button>
                  );
                })}
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_310px] gap-5 items-start">
              <div className="min-w-0 space-y-5">
              {tab === "members" && (
                <>
                {goalCard}
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
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-slate-400">مساهمة داخل الدائرة</span>
                                {m.week_xp != null && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-[10px] font-bold">
                                    <Flame className="w-3 h-3" /> هذا الأسبوع · {fmt(m.week_xp)} XP
                                  </span>
                                )}
                              </span>
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
                </>
              )}
              {tab === "chat" && chatState !== "hidden" && chatPanel}
              {tab === "challenge" && challengePanel}
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
