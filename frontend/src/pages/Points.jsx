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
  Target, Zap, ChevronDown, LogIn,
} from "lucide-react";

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
  { key: "upload_book_approved", label: "اعتماد كتاب ترفعه", pts: 40, icon: BookOpen, tint: "bg-emerald-100 text-emerald-600" },
];

const ACH_ICONS = { Award, Trophy, Medal, Star, Crown, Flame, BookOpen, Sparkles, Rocket, Target, Zap };

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
    // points table — may not exist yet; fall back to built-in defaults
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
          action={<Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold"><LogIn className="w-4 h-4" />تسجيل الدخول</Link>}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 text-white bg-gradient-to-bl from-violet-600 via-purple-600 to-fuchsia-600 ft-shadow"
        >
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
              className="w-24 h-24 rounded-3xl bg-white/15 border border-white/25 grid place-items-center shrink-0 backdrop-blur"
            >
              <div className="text-center">
                <div className="text-3xl font-extrabold">{gam?.level || 1}</div>
                <div className="text-[10px] text-white/80">المستوى</div>
              </div>
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-head text-2xl font-extrabold">{gam?.level_title || "…"}</h1>
                {(gam?.streak || 0) > 0 && (
                  <span className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-orange-300" />{gam.streak} يوم متتالي
                  </span>
                )}
              </div>
              <div className="mt-1 text-white/85 text-sm">
                <span className="font-extrabold text-xl text-white">{(gam?.xp || 0).toLocaleString("en-US")}</span> نقطة خبرة
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-white/80 mb-1.5">
                  <span>التقدم للمستوى {(gam?.level || 1) + 1}</span>
                  <span>باقٍ {(gam?.xp_to_next || 0).toLocaleString("en-US")} نقطة</span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden">
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
              className="shrink-0 px-6 py-3.5 rounded-2xl bg-white text-purple-700 font-extrabold text-sm shadow-lg disabled:opacity-60 flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              {checkedToday ? "تم تسجيل الحضور ✓" : checkingIn ? "جارٍ التسجيل…" : "حضور اليوم"}
            </motion.button>
          </div>
        </motion.div>

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: EASE }}
              className="bg-white rounded-3xl border border-slate-100 p-4 ft-shadow flex items-center gap-3"
            >
              <span className={`w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${s.grad} shrink-0`}>
                <s.icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-extrabold text-lg text-slate-800 leading-tight">{s.value}</span>
                <span className="block text-[11px] text-slate-400">{s.label}</span>
              </span>
            </motion.div>
          ))}
        </div>

        {/* achievements */}
        {achievements.length > 0 && (
          <section>
            <h2 className="font-head font-extrabold text-lg text-slate-800 mb-3 flex items-center gap-2">
              <Medal className="w-5 h-5 text-violet-600" /> الإنجازات
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {achievements.map((a, i) => {
                const Icon = ACH_ICONS[a.icon] || Award;
                return (
                  <motion.div
                    key={a.key}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.35, ease: EASE }}
                    className={`shrink-0 w-36 rounded-3xl border p-4 text-center ${a.unlocked ? "bg-white border-violet-100 ft-shadow" : "bg-slate-50 border-slate-100 opacity-60"}`}
                  >
                    <span className={`w-12 h-12 rounded-2xl grid place-items-center mx-auto mb-2 ${a.unlocked ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" : "bg-slate-200 text-slate-400"}`}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <div className="font-bold text-xs text-slate-800 leading-snug">{a.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{a.description}</div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* history */}
        <section>
          <h2 className="font-head font-extrabold text-lg text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> سجل النقاط
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
            {history.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">لا نشاط بعد — ابدأ بجمع النقاط اليوم! ✨</div>
            ) : (
              history.map((t, i) => {
                const pos = (t.amount || 0) >= 0;
                return (
                  <motion.div
                    key={`${t.created_at}-${i}`}
                    initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3, ease: EASE }}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-50 last:border-0"
                  >
                    <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${pos ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                      {pos ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800 truncate">{REASON_LABELS[t.reason] || t.reason || "نشاط"}</div>
                      <div className="text-[11px] text-slate-400">{timeAgo(t.created_at)}</div>
                    </div>
                    <div className={`font-extrabold shrink-0 ${pos ? "text-emerald-600" : "text-rose-600"}`} dir="ltr">
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
              className="mt-4 mx-auto flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition disabled:opacity-60"
            >
              <ChevronDown className="w-4 h-4" />{loadingMore ? "جارٍ التحميل…" : `عرض المزيد (${total - history.length} متبقٍ)`}
            </button>
          )}
        </section>

        {/* how to earn */}
        <section>
          <h2 className="font-head font-extrabold text-lg text-slate-800 mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" /> كيف تكسب النقاط؟
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {earnTable.map((e, i) => (
              <motion.div
                key={e.key}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: EASE }}
                className="bg-white rounded-3xl border border-slate-100 p-4 ft-shadow flex items-center gap-3"
              >
                <span className={`w-10 h-10 rounded-2xl grid place-items-center ${e.tint} shrink-0`}>
                  <e.icon className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-xs text-slate-700 leading-snug">{e.label}</span>
                  <span className="block text-sm font-extrabold text-emerald-600 mt-0.5">+{e.pts}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
