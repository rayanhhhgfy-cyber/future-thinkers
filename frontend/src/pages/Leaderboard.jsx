import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/anim";
import api from "@/lib/api";
import {
  Trophy, Crown, Flame, School, Building2, MapPin, Users,
  Sparkles, Rocket,
} from "lucide-react";

const TABS = [
  { v: "students", l: "الطلاب", icon: Users },
  { v: "schools", l: "المدارس", icon: School },
  { v: "directorates", l: "المديريات", icon: Building2 },
  { v: "governorates", l: "المحافظات", icon: MapPin },
  { v: "chess", l: "الشطرنج", icon: Crown },
  { v: "studio", l: "الاستوديو", icon: Sparkles },
  { v: "ventures", l: "المشاريع", icon: Rocket },
];
const PERIODS = [{ v: "all", l: "الكل" }, { v: "weekly", l: "أسبوعي" }, { v: "monthly", l: "شهري" }, { v: "yearly", l: "سنوي" }];
const VENTURE_STATUS = { open: "مفتوح", in_progress: "قيد التنفيذ", completed: "مكتمل", draft: "مسودة" };

const asArr = (d) => (Array.isArray(d) ? d : d?.items || []);

function normalize(tab, data) {
  const arr = asArr(data);
  switch (tab) {
    case "students":
      return arr.map((r) => ({
        rank: r.rank, name: r.name, sub: r.school_name, score: r.xp, scoreLabel: "نقطة",
        link: r.id ? `/profile/${r.id}` : null, avatar: r.avatar_url, streak: r.streak,
      }));
    case "schools":
    case "directorates":
    case "governorates":
      return arr.map((r) => ({
        rank: r.rank, name: r.name, sub: `${r.students || 0} طالب`, score: r.total_xp, scoreLabel: "نقطة",
      }));
    case "chess":
      return arr.map((r, i) => ({
        rank: i + 1, name: r.name, sub: r.level_title, score: r.chess_rating, scoreLabel: "تصنيف",
        link: `/profile/${r.user_id}`, avatar: r.avatar,
      }));
    case "studio":
      return arr.map((r, i) => ({
        rank: i + 1, name: r.title, sub: r.author_name, score: r.likes, scoreLabel: "إعجاب",
        link: `/studio/${r.id}`, avatar: r.cover_url,
        extra: `${Number(r.rating_avg || 0).toFixed(1)} ★ (${r.rating_count || 0}) · ${(r.views || 0).toLocaleString("en-US")} مشاهدة`,
      }));
    case "ventures":
      return arr.map((r, i) => ({
        rank: i + 1, name: r.title, sub: r.owner_name, score: r.votes, scoreLabel: "صوت",
        link: `/ventures/${r.id}`,
        extra: VENTURE_STATUS[r.status] || r.status,
        members: r.members_count,
      }));
    default:
      return [];
  }
}

export default function Leaderboard() {
  const [tab, setTab] = useState("students");
  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    let url = "/leaderboard";
    let params = {};
    if (tab === "students") params = { scope: "national", period };
    else if (tab === "schools") url = "/leaderboard/schools";
    else if (tab === "directorates") url = "/leaderboard/directorates";
    else if (tab === "governorates") url = "/leaderboard/governorates";
    else if (tab === "chess") url = "/leaderboard/chess";
    else if (tab === "studio") url = "/leaderboard/studio";
    else if (tab === "ventures") url = "/leaderboard/ventures";
    let alive = true;
    api.get(url, { params }).then((r) => { if (alive) setRows(normalize(tab, r.data)); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [tab, period]);

  const top3 = rows?.slice(0, 3) || [];
  const rest = rows?.slice(3) || [];
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <Layout>
      {/* hero */}
      <div className="ft-navy-gradient grain text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="font-head text-3xl lg:text-4xl font-extrabold flex items-center gap-3"
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              className="w-12 h-12 rounded-2xl bg-amber-400/15 grid place-items-center"
            >
              <Trophy className="w-7 h-7 text-amber-400" />
            </motion.span>
            قوائم الصدارة
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
            className="text-slate-300 mt-3 max-w-2xl"
          >
            من يتألق هذا الأسبوع؟ ترتيب الطلاب والمدارس وأبطال الشطرنج وأجمل أعمال الاستوديو وأقوى المشاريع — كلها في مكان واحد.
          </motion.p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => {
            const active = tab === t.v;
            return (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                data-testid={`lb-tab-${t.v}`}
                className={`relative shrink-0 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 transition-colors ${active ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {active && (
                  <motion.span
                    layoutId="lb-tab-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-slate-900"
                  />
                )}
                <t.icon className="w-4 h-4 relative" />
                <span className="relative">{t.l}</span>
              </button>
            );
          })}
        </div>

        {/* period pills (students only) */}
        {tab === "students" && (
          <div className="flex gap-1.5 mb-6 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.v} onClick={() => setPeriod(p.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${period === p.v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {p.l}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab + period}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {!rows ? (
              <PodiumSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState icon={Trophy} title="لا توجد بيانات بعد" desc="كن أول من يتصدر هذه القائمة!" />
            ) : (
              <>
                <Podium order={podiumOrder} />
                <div className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
                  {rest.map((r, i) => (
                    <RowItem key={`${r.rank}-${r.name}`} r={r} i={i} tab={tab} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}

const MEDAL = [
  "from-amber-300 to-yellow-500",
  "from-slate-200 to-slate-400",
  "from-amber-600 to-yellow-800",
];

function Podium({ order }) {
  if (order.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8">
      {order.map((r, idx) => {
        const h = r.rank === 1 ? "h-36 sm:h-44" : r.rank === 2 ? "h-28 sm:h-36" : "h-24 sm:h-28";
        return (
          <motion.div
            key={r.rank}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.12, type: "spring", stiffness: 260, damping: 24 }}
            className="text-center"
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto grid place-items-center text-white text-lg font-extrabold bg-gradient-to-br ${MEDAL[r.rank - 1]} mb-2 ft-shadow ring-4 ring-white overflow-hidden`}>
              {r.avatar ? (
                <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
              ) : r.rank === 1 ? (
                <Crown className="w-7 h-7" />
              ) : (
                r.rank
              )}
            </div>
            <div className="font-bold text-sm text-slate-800 line-clamp-1 px-1">{r.name}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1 px-1">{r.sub}</div>
            <div className={`mt-2 ${h} rounded-t-2xl bg-gradient-to-t ${MEDAL[r.rank - 1]} grid place-items-start justify-center pt-2.5 text-white font-extrabold text-sm sm:text-base`}>
              {(r.score || 0).toLocaleString("en-US")}
              <span className="text-[10px] font-medium opacity-80 -mt-4">{r.scoreLabel}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RowItem({ r, i, tab }) {
  const badge =
    r.rank <= 3
      ? `bg-gradient-to-br ${MEDAL[r.rank - 1]} text-white`
      : "bg-slate-100 text-slate-500";
  const content = (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.3, ease: EASE }}
      className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <span className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-extrabold shrink-0 ${badge}`}>{r.rank}</span>
      {r.avatar ? (
        <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-2xl object-cover shrink-0 bg-slate-100" />
      ) : (
        <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0 bg-slate-100 text-slate-500 font-bold">
          {(r.name || "؟")[0]}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800 truncate text-[15px]">{r.name}</div>
        {r.sub && <div className="text-xs text-slate-400 truncate">{r.sub}</div>}
        {r.extra && <div className="text-[11px] text-amber-600 font-medium truncate mt-0.5">{r.extra}</div>}
      </div>
      {tab === "students" && r.streak > 0 && (
        <span className="text-xs text-orange-500 font-bold flex items-center gap-0.5 shrink-0">
          <Flame className="w-3.5 h-3.5" />{r.streak}
        </span>
      )}
      {tab === "ventures" && r.members > 0 && (
        <span className="text-[11px] text-slate-400 shrink-0 hidden sm:block">{r.members} أعضاء</span>
      )}
      <div className="text-left shrink-0">
        <div className="font-extrabold text-blue-600">{(r.score || 0).toLocaleString("en-US")}</div>
        <div className="text-[10px] text-slate-400">{r.scoreLabel}</div>
      </div>
    </motion.div>
  );
  return r.link ? <Link to={r.link} data-testid={`lb-row-${r.rank}`}>{content}</Link> : content;
}

function PodiumSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-3 gap-4 items-end mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center">
            <div className="w-14 h-14 rounded-full bg-slate-200 mx-auto mb-2" />
            <div className="h-3 rounded bg-slate-200 w-2/3 mx-auto mb-1" />
            <div className={`${i === 1 ? "h-36" : i === 0 ? "h-28" : "h-24"} rounded-t-2xl bg-slate-200 mt-2`} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden p-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-9 h-9 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2"><div className="h-3 rounded bg-slate-200 w-1/2" /><div className="h-2 rounded bg-slate-100 w-1/3" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
