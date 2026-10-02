import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { motion } from "framer-motion";
import { EASE } from "@/components/anim";
import api from "@/lib/api";
import { timeAgo } from "@/components/NotificationsPanel";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Sparkles, Flame, Coins, Award, Medal, Crown, BookOpen, Star, Rocket, Heart,
  Trophy, Calendar, MessageSquare, Gamepad2, TrendingUp, TrendingDown, Gift,
  Target, Zap, ChevronDown, LogIn, Library, GraduationCap, ShoppingBag, Check, Lock,
} from "lucide-react";

const FRAME_STYLES = {
  frame_emerald: "ring-emerald-400 shadow-emerald-200",
  frame_gold: "ring-amber-400 shadow-amber-200",
  frame_galaxy: "ring-violet-500 shadow-violet-300",
};

function StoreSection() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { api.get("/store").then((r) => setData(r.data)).catch(() => setData({ items: [], xp: 0 })); }, []);
  if (!data) return null;
  const frames = data.items.filter((i) => i.kind === "frame");
  const titles = data.items.filter((i) => i.kind === "title");
  const tools = data.items.filter((i) => i.kind === "item");

  const buy = async (item) => {
    setBusy(item.key);
    try {
      await api.post("/store/buy", { key: item.key });
      toast.success(`مبروك! اشتريت «${item.name}» 🎉`);
      const r = await api.get("/store"); setData(r.data); refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّرت عملية الشراء"); }
    setBusy("");
  };
  const equip = async (item, on) => {
    setBusy(item.key);
    try {
      await api.post("/store/equip", { kind: item.kind, key: on ? item.key : null });
      const r = await api.get("/store"); setData(r.data); refresh();
      toast.success(on ? "تم التفعيل ✨" : "تمت الإزالة");
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر التفعيل"); }
    setBusy("");
  };

  const renderItem = (item) => (
    <div key={item.key} className={`rounded-2xl border p-4 lg:p-6 flex flex-col items-center text-center gap-2 transition-all ${item.equipped ? "border-emerald-300 bg-emerald-50/60" : "border-slate-100 bg-slate-50/60"}`}>
      {item.kind === "frame" ? (
        <span className={`w-14 h-14 lg:w-[72px] lg:h-[72px] rounded-full bg-white grid place-items-center text-xl lg:text-2xl font-extrabold text-slate-700 ring-4 shadow-lg ${FRAME_STYLES[item.key] || "ring-slate-200"}`}>{user?.name?.[0] || "؟"}</span>
      ) : item.kind === "item" ? (
        <span className="w-14 h-14 lg:w-[72px] lg:h-[72px] rounded-2xl bg-sky-50 grid place-items-center text-3xl lg:text-4xl">❄️</span>
      ) : (
        <span className="px-3 py-1.5 rounded-full bg-gradient-to-l from-amber-400 to-yellow-500 text-amber-950 text-xs lg:text-sm font-extrabold shadow">✦ {item.name}</span>
      )}
      <div className="font-bold text-sm lg:text-base text-slate-800">{item.name}</div>
      {!item.owned ? (
        <button onClick={() => buy(item)} disabled={busy === item.key || data.xp < item.cost}
          className={`pressable inline-flex items-center gap-1.5 px-4 py-1.5 lg:px-5 lg:py-2.5 min-h-[44px] rounded-full text-xs lg:text-sm font-extrabold ${data.xp >= item.cost ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>
          {data.xp >= item.cost ? <Coins className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {item.cost} XP
        </button>
      ) : item.equipped ? (
        <button onClick={() => equip(item, false)} disabled={busy === item.key} className="pressable inline-flex items-center gap-1 px-4 py-1.5 lg:px-5 lg:py-2.5 min-h-[44px] rounded-full text-xs lg:text-sm font-extrabold ft-btn-solid"><Check className="w-3.5 h-3.5" /> مفعّل</button>
      ) : (
        <button onClick={() => equip(item, true)} disabled={busy === item.key} className="pressable px-4 py-1.5 lg:px-5 lg:py-2.5 min-h-[44px] rounded-full text-xs lg:text-sm font-extrabold ft-chip">تفعيل</button>
      )}
    </div>
  );

  return (
    <section>
      <h2 className="font-head font-extrabold text-lg lg:text-2xl text-slate-800 mb-1 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-violet-600" /> متجر النقاط
      </h2>
      <p className="text-xs lg:text-sm text-slate-400 mb-3 lg:mb-4">رصيدك: <b className="text-slate-600">{(data.xp || 0).toLocaleString("en-US")} XP</b> · كافئ نفسك بإطار صورة ولقب يظهر في ملفك ولوحات الشرف</p>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 lg:p-8">
        <div className="text-xs lg:text-sm font-bold text-slate-400 mb-2">إطارات الصورة</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-7">{frames.map(renderItem)}</div>
        <div className="text-xs lg:text-sm font-bold text-slate-400 mb-2">ألقاب الملف</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-7">{titles.map(renderItem)}</div>
        <div className="text-xs lg:text-sm font-bold text-slate-400 mb-2">أدوات تحمي تقدمك · تملك {data.streak_freezes || 0} حماية سلسلة</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">{tools.map(renderItem)}</div>
        <p className="text-[11px] lg:text-xs text-slate-300 mt-3">حماية السلسلة تُستخدم تلقائياً عندما تغيب يوماً واحداً فتحافظ على سلسلة أيامك.</p>
      </div>
    </section>
  );
}

/* Arabic labels for XP transaction reasons (falls back to the raw reason) */
const REASON_LABELS = {
  read_book: "قراءة كتاب",
  review_book: "مراجعة كتاب",
  studio_review: "مراجعة عمل في الاستوديو",
  work_published: "نشر عمل في الاستوديو",
  venture_publish: "نشر مشروع",
  venture_vote_received: "تصويت لمشروعك",
  venture_complete_owner: "إتمام مشروع (قائد الفريق)",
  venture_complete_member: "إتمام مشروع (عضو)",
  daily_checkin: "حضور يومي",
  win_chess: "فوز في الشطرنج",
  play_chess: "مباراة شطرنج",
  join_event: "المشاركة في فعالية",
  join_competition: "الانضمام لمسابقة",
  win_competition: "الفوز بمسابقة",
  create_discussion: "بدء نقاش",
  reply_discussion: "الرد على نقاش",
  receive_like: "إعجاب تلقاه منشورك",
  upload_book_approved: "اعتماد كتاب رفعته",
};

/* Built-in fallback for the "how to earn" table if the endpoint is missing */
const FALLBACK_EARN = [
  { key: "read_book", label: "قراءة كتاب", pts: 50, icon: BookOpen, tint: "bg-blue-100 text-blue-600" },
  { key: "review_book", label: "مراجعة كتاب", pts: 20, icon: Star, tint: "bg-yellow-100 text-yellow-600" },
  { key: "daily_checkin", label: "الحضور اليومي", pts: 5, icon: Flame, tint: "bg-orange-100 text-orange-600" },
  { key: "studio_review", label: "مراجعة عمل في الاستوديو", pts: 10, icon: Sparkles, tint: "bg-purple-100 text-purple-600" },
  { key: "work_published", label: "نشر عمل في الاستوديو", pts: 60, icon: Gift, tint: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "venture_publish", label: "نشر مشروع طلابي", pts: 20, icon: Rocket, tint: "bg-indigo-100 text-indigo-600" },
  { key: "venture_vote_received", label: "تصويت لمشروعك", pts: 3, icon: Heart, tint: "bg-rose-100 text-rose-600" },
  { key: "venture_complete_owner", label: "إتمام مشروع (قائد)", pts: 30, icon: Trophy, tint: "bg-amber-100 text-amber-600" },
  { key: "win_chess", label: "الفوز بمباراة شطرنج", pts: 30, icon: Crown, tint: "bg-yellow-100 text-yellow-700" },
  { key: "play_chess", label: "لعب مباراة شطرنج", pts: 10, icon: Gamepad2, tint: "bg-slate-200 text-slate-600" },
  { key: "join_event", label: "المشاركة في فعالية", pts: 25, icon: Calendar, tint: "bg-violet-100 text-violet-600" },
  { key: "join_competition", label: "الانضمام لمسابقة", pts: 20, icon: Medal, tint: "bg-cyan-100 text-cyan-600" },
  { key: "win_competition", label: "الفوز بمسابقة", pts: 100, icon: Trophy, tint: "bg-amber-100 text-amber-700" },
  { key: "create_discussion", label: "بدء نقاش", pts: 15, icon: MessageSquare, tint: "bg-sky-100 text-sky-600" },
  { key: "upload_book_approved", label: "اعتماد كتاب ترفعه", pts: 40, icon: BookOpen, tint: "ft-bg-soft-2 ft-text-accent" },
];

const ACH_ICONS = { Award, Trophy, Medal, Star, Crown, Flame, BookOpen, Sparkles, Rocket, Target, Zap, Library, GraduationCap };

export default function Points() {
  const { user, ready } = useAuth();
  const [gam, setGam] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [earnTable, setEarnTable] = useState(FALLBACK_EARN);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get("/gamification/me").then((r) => setGam(r.data)).catch(() => {});
    api.get("/gamification/achievements").then((r) => setAchievements(r.data || [])).catch(() => {});
    // points table · may not exist yet; fall back to built-in defaults
    api.get("/gamification/points-table")
      .then((r) => {
        const pts = r.data?.points;
        if (pts && typeof pts === "object") {
          setEarnTable(FALLBACK_EARN.map((e) => ({ ...e, pts: pts[e.key] ?? e.pts })));
        }
      })
      .catch(() => {});
  }, [user]);

  const loadHistory = async (p) => {
    setLoadingMore(true);
    try {
      const { data } = await api.get("/gamification/history", { params: { page: p, limit: 15 } });
      setHistory((h) => (p === 1 ? data.items : [...h, ...data.items]));
      setTotal(data.total || 0);
      setPage(p);
    } catch {
      toast.error("تعذر تحميل سجل النقاط");
    } finally {
      setLoadingMore(false);
    }
  };
  useEffect(() => { if (user) loadHistory(1); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkin = async () => {
    setCheckingIn(true);
    try {
      const { data } = await api.post("/gamification/checkin");
      if (data.already) {
        toast.info("سجلت حضورك اليوم مسبقاً 👍");
      } else {
        toast.success(`تم تسجيل حضورك! سلسلة ${data.streak} يوم 🔥`);
        const { data: g } = await api.get("/gamification/me");
        setGam(g);
        loadHistory(1);
      }
      setCheckedToday(true);
    } catch {
      toast.error("تعذر تسجيل الحضور");
    } finally {
      setCheckingIn(false);
    }
  };

  if (!ready) return <Layout><PageLoader /></Layout>;
  if (!user) {
    return (
      <Layout>
        <EmptyState
          icon={Coins}
          title="سجل الدخول لرؤية نقاطك"
          desc="نقاط الخبرة والمستويات وسجل النشاط بانتظارك."
          action={<Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl ft-btn-solid font-bold"><LogIn className="w-4 h-4" />تسجيل الدخول</Link>}
        />
      </Layout>
    );
  }

  const stats = [
    { label: "مجموع النقاط", value: (gam?.xp || 0).toLocaleString("en-US"), icon: Coins, grad: "from-amber-500 to-orange-600" },
    { label: "الشارات", value: gam?.badges?.length ?? 0, icon: Award, grad: "from-blue-500 to-indigo-600" },
    { label: "الإنجازات", value: gam?.achievements?.length ?? 0, icon: Medal, grad: "from-violet-500 to-purple-600" },
    { label: "تصنيف الشطرنج", value: gam?.chess_rating || 1200, icon: Crown, grad: "from-slate-600 to-slate-800" },
  ];

  return (
    <Layout>
      <div className="max-w-4xl lg:max-w-6xl xl:max-w-[1280px] 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 lg:py-12 space-y-8 lg:space-y-12">
        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative overflow-hidden rounded-[32px] lg:rounded-[40px] p-6 sm:p-8 lg:p-10 xl:p-12 text-white bg-gradient-to-bl from-violet-600 via-purple-600 to-fuchsia-600 ft-shadow"
        >
          <div className="absolute -top-16 -left-16 w-56 h-56 lg:w-80 lg:h-80 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-10 w-64 h-64 lg:w-96 lg:h-96 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-10">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
              className="w-24 h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-3xl lg:rounded-[32px] bg-white/15 border border-white/25 grid place-items-center shrink-0 backdrop-blur"
            >
              <div className="text-center">
                <div className="text-3xl lg:text-5xl font-extrabold">{gam?.level || 1}</div>
                <div className="text-[10px] lg:text-xs text-white/80">المستوى</div>
              </div>
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-head text-2xl lg:text-4xl xl:text-[40px] font-extrabold">{gam?.level_title || "…"}</h1>
                {(gam?.streak || 0) > 0 && (
                  <span className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1 lg:px-4 lg:py-1.5 text-xs lg:text-sm font-bold">
                    <Flame className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-300" />{gam.streak} يوم متتالي
                  </span>
                )}
              </div>
              <div className="mt-1 lg:mt-2 text-white/85 text-sm lg:text-base">
                <span className="font-extrabold text-xl lg:text-3xl text-white">{(gam?.xp || 0).toLocaleString("en-US")}</span> نقطة خبرة
              </div>
              <div className="mt-3 lg:mt-5 lg:max-w-2xl">
                <div className="flex justify-between text-[11px] lg:text-sm text-white/80 mb-1.5">
                  <span>التقدم للمستوى {(gam?.level || 1) + 1}</span>
                  <span>باقٍ {(gam?.xp_to_next || 0).toLocaleString("en-US")} نقطة</span>
                </div>
                <div className="h-3 lg:h-4 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${gam?.level_progress || 0}%` }}
                    transition={{ delay: 0.3, duration: 1, ease: EASE }}
                    className="h-full rounded-full bg-gradient-to-l from-amber-300 to-yellow-400"
                  />
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={checkin}
              disabled={checkingIn || checkedToday}
              className="shrink-0 px-6 py-3.5 lg:px-8 lg:py-4 min-h-[44px] rounded-2xl bg-white text-purple-700 font-extrabold text-sm lg:text-base shadow-lg disabled:opacity-60 flex items-center gap-2"
            >
              <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500" />
              {checkedToday ? "تم تسجيل الحضور ✓" : checkingIn ? "جارٍ التسجيل…" : "حضور اليوم"}
            </motion.button>
          </div>
        </motion.div>

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: EASE }}
              className="bg-white rounded-3xl border border-slate-100 p-4 lg:p-6 ft-shadow flex items-center gap-3 lg:gap-4"
            >
              <span className={`w-11 h-11 lg:w-14 lg:h-14 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${s.grad} shrink-0`}>
                <s.icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </span>
              <span>
                <span className="block font-extrabold text-lg lg:text-2xl text-slate-800 leading-tight">{s.value}</span>
                <span className="block text-[11px] lg:text-xs text-slate-400">{s.label}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* achievements */}
        {achievements.length > 0 && (
          <section>
            <h2 className="font-head font-extrabold text-lg lg:text-2xl text-slate-800 mb-3 lg:mb-5 flex items-center gap-2">
              <Medal className="w-5 h-5 lg:w-6 lg:h-6 text-violet-600" /> الإنجازات
            </h2>
            <div className="flex lg:grid lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 lg:mx-0 px-1 lg:px-0" style={{ scrollbarWidth: "none" }}>
              {achievements.map((a, i) => {
                const Icon = ACH_ICONS[a.icon] || Award;
                return (
                  <motion.div
                    key={a.key}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.35, ease: EASE }}
                    className={`shrink-0 lg:shrink w-36 lg:w-auto rounded-3xl border p-4 lg:p-5 text-center ${a.unlocked ? "bg-white border-violet-100 ft-shadow" : "bg-slate-50 border-slate-100 opacity-60"}`}
                  >
                    <span className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl grid place-items-center mx-auto mb-2 ${a.unlocked ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                      <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                    </span>
                    <div className="font-bold text-xs lg:text-sm text-slate-800 leading-snug">{a.title}</div>
                    <div className="text-[10px] lg:text-[11px] text-slate-400 mt-1 line-clamp-2">{a.description}</div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* points store */}
        <StoreSection />

        {/* history + earn · stacked on mobile, two columns on desktop */}
        <div className="grid gap-8 lg:gap-10 lg:grid-cols-5 items-start">
        {/* history */}
        <section className="lg:col-span-3 min-w-0">
          <h2 className="font-head font-extrabold text-lg lg:text-2xl text-slate-800 mb-3 lg:mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 ft-text-accent" /> سجل النقاط
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
            {history.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">لا نشاط بعد · ابدأ بجمع النقاط اليوم! ✨</div>
            ) : (
              history.map((t, i) => {
                const pos = (t.amount || 0) >= 0;
                return (
                  <motion.div
                    key={`${t.created_at}-${i}`}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3, ease: EASE }}
                    className="flex items-center gap-3 lg:gap-4 px-4 sm:px-5 lg:px-6 py-3 lg:py-4 border-b border-slate-50 last:border-0"
                  >
                    <span className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl grid place-items-center shrink-0 ${pos ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                      {pos ? <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" /> : <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm lg:text-[15px] text-slate-800 truncate">{REASON_LABELS[t.reason] || t.reason || "نشاط"}</div>
                      <div className="text-[11px] lg:text-xs text-slate-400">{timeAgo(t.created_at)}</div>
                    </div>
                    <div className={`font-extrabold lg:text-lg shrink-0 ${pos ? "text-emerald-600" : "text-rose-600"}`} dir="ltr">
                      {pos ? "+" : ""}{t.amount}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          {history.length < total && (
            <button
              onClick={() => loadHistory(page + 1)}
              disabled={loadingMore}
              className="mt-4 mx-auto flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition disabled:opacity-60"
            >
              <ChevronDown className="w-4 h-4" />{loadingMore ? "جارٍ التحميل…" : `عرض المزيد (${total - history.length} متبقٍ)`}
            </button>
          )}
        </section>

        {/* how to earn */}
        <section className="lg:col-span-2 min-w-0">
          <h2 className="font-head font-extrabold text-lg lg:text-2xl text-slate-800 mb-3 lg:mb-5 flex items-center gap-2">
            <Gift className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" /> كيف تكسب النقاط؟
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 lg:gap-4">
            {earnTable.map((e, i) => (
              <motion.div
                key={e.key}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: EASE }}
                className="bg-white rounded-3xl border border-slate-100 p-4 lg:p-5 ft-shadow flex items-center gap-3"
              >
                <span className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl grid place-items-center ${e.tint} shrink-0`}>
                  <e.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-xs lg:text-[13px] text-slate-700 leading-snug">{e.label}</span>
                  <span className="block text-sm lg:text-base font-extrabold text-emerald-600 mt-0.5">+{e.pts}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </section>
        </div>
      </div>
    </Layout>
  );
}
