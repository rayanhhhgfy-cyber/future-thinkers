import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { motion, AnimatePresence, animate } from "framer-motion";
import { EASE } from "@/components/anim";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Trophy, Crown, Flame, School, Building2, MapPin, Users,
  Sparkles, Rocket, Search, Medal, Swords, TrendingUp, Zap,
} from "lucide-react";

const TABS = [
  { v: "students", l: "الطلاب", icon: Users, accent: "emerald", hex: "#059669" },
  { v: "schools", l: "المدارس", icon: School, accent: "blue", hex: "#2563EB" },
  { v: "directorates", l: "المديريات", icon: Building2, accent: "violet", hex: "#7C3AED" },
  { v: "governorates", l: "المحافظات", icon: MapPin, accent: "rose", hex: "#E11D48" },
  { v: "chess", l: "الشطرنج", icon: Swords, accent: "amber", hex: "#D97706" },
  { v: "studio", l: "الاستوديو", icon: Sparkles, accent: "fuchsia", hex: "#C026D3" },
  { v: "ventures", l: "المشاريع", icon: Rocket, accent: "indigo", hex: "#4F46E5" },
  { v: "seasons", l: "المواسم", icon: Crown, accent: "orange", hex: "#EA580C" },
];
const PERIODS = [
  { v: "all", l: "كل الوقت" },
  { v: "weekly", l: "هذا الأسبوع" },
  { v: "monthly", l: "هذا الشهر" },
  { v: "yearly", l: "هذا العام" },
];
const VENTURE_STATUS = { open: "مفتوح", in_progress: "قيد التنفيذ", completed: "مكتمل", draft: "مسودة" };
const EMPTY_HINTS = {
  students: { t: "لا أبطال بعد", d: "كن أول من يتصدّر القائمة — اقرأ كتاباً أو سجّل حضورك اليومي واجمع النقاط." },
  schools: { t: "لا مدارس على القائمة بعد", d: "ستظهر المدارس هنا بمجرد أن يبدأ طلابها بجمع النقاط." },
  directorates: { t: "لا مديريات بعد", d: "تتنافس المديريات بمجموع نقاط طلابها." },
  governorates: { t: "لا محافظات بعد", d: "تتنافس المحافظات بمجموع نقاط طلابها." },
  chess: { t: "لا مباريات منتهية بعد", d: "أنهِ أول مباراة شطرنج وسيظهر اسمك هنا بتصنيفك الحقيقي.", cta: ["/clubs/chess", "إلى حلبة الشطرنج"] },
  studio: { t: "لا أعمال منشورة بعد", d: "انشر عملاً في الاستوديو واجمع الإعجابات لتتصدّر." },
  ventures: { t: "لا مشاريع بعد", d: "أطلق مشروعاً طلابياً واجمع الأصوات.", cta: ["/ventures", "تصفّح المشاريع"] },
  seasons: { t: "", d: "" },
};

const MONTH_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const MEDALS = ["🥇", "🥈", "🥉"];

function SeasonsBoard() {
  const [seasons, setSeasons] = useState(null);
  useEffect(() => { api.get("/seasons/champions").then((r) => setSeasons(r.data)).catch(() => setSeasons([])); }, []);
  if (!seasons) return <div className="text-center text-slate-300 py-8 font-bold">جارٍ تحميل الأبطال…</div>;
  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white ft-shadow mb-5">
        <Crown className="absolute -left-4 -bottom-8 w-40 h-40 text-white/15" />
        <h3 className="font-head font-extrabold text-2xl relative">قاعة مشاهير المواسم 🏆</h3>
        <p className="text-white/85 text-sm mt-1.5 relative max-w-lg">كل شهر يُتوَّج أبطال جديدون — أفضل 3 جامعي نقاط يخلّدون أسماءهم هنا للأبد. الشهر الحالي يُحسم مع نهايته.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {seasons.map((s) => {
          const [yy, mm] = s.month.split("-");
          return (
            <div key={s.month} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
              <div className="font-head font-extrabold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 grid place-items-center text-base">🗓️</span>
                {MONTH_AR[Number(mm) - 1]} {yy}
              </div>
              {s.champions.length === 0 ? (
                <p className="text-sm text-slate-300 mt-4">لا نشاط مسجل هذا الشهر</p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {s.champions.map((c, i) => (
                    <Link key={c.id} to={`/profile/${c.id}`} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50 transition p-2.5">
                      <span className="text-xl">{MEDALS[i]}</span>
                      <span className="flex-1 font-bold text-sm text-slate-700 truncate">{c.name}</span>
                      <span className="text-xs font-extrabold text-amber-600">{c.xp.toLocaleString("en-US")} XP</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const asArr = (d) => (Array.isArray(d) ? d : d?.items || []);

function normalize(tab, data) {
  const arr = asArr(data);
  switch (tab) {
    case "students":
      return arr.map((r) => ({
        rank: r.rank, uid: r.id, name: r.name, sub: r.school_name, score: r.xp, scoreLabel: "نقطة",
        link: r.id ? `/profile/${r.id}` : null, avatar: r.avatar_url, streak: r.streak,
        levelTitle: r.level_title, level: r.level,
      }));
    case "schools":
    case "directorates":
    case "governorates":
      return arr.map((r) => ({
        rank: r.rank, name: r.name, sub: `${(r.students || 0).toLocaleString("en-US")} طالب`,
        score: r.total_xp, scoreLabel: "نقطة",
      }));
    case "chess":
      return arr.map((r, i) => ({
        rank: i + 1, uid: r.user_id, name: r.name, sub: r.level_title, score: r.chess_rating,
        scoreLabel: "تصنيف", link: `/profile/${r.user_id}`, avatar: r.avatar, noBar: true,
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
        link: `/ventures/${r.id}`, extra: VENTURE_STATUS[r.status] || r.status, members: r.members_count,
      }));
    default:
      return [];
  }
}

function CountUp({ value, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const controls = animate(0, value || 0, {
      duration: 0.9, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString("en-US"); },
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref} className={className}>0</span>;
}

function BattleCard() {
  const [b, setB] = useState(null);
  useEffect(() => { api.get("/battles/weekly").then((r) => setB(r.data)).catch(() => {}); }, []);
  if (!b || !b.battle) return null;
  const { a, b: bb } = b.battle;
  const total = Math.max(1, a.xp + bb.xp);
  const aPct = Math.round((a.xp / total) * 100);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="mb-6 rounded-[28px] p-[1.5px] bg-gradient-to-l from-amber-400 via-rose-400 to-blue-500 shadow-lg shadow-rose-100">
      <div className="rounded-[26.5px] bg-slate-950 text-white px-6 py-5 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-rose-500/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/25 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-amber-400" />
            <h3 className="font-head font-extrabold">معركة المدارس — هذا الأسبوع</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">مباشر</span>
          </div>
          <div className="flex items-end justify-between gap-3 mb-2">
            <div className="text-center flex-1 min-w-0">
              <div className="font-head font-extrabold truncate">{a.school_name}</div>
              <div className="text-2xl font-black text-amber-300 font-head">{a.xp.toLocaleString("en-US")}</div>
              <div className="text-[11px] text-slate-400">{a.members} طالب نشط</div>
            </div>
            <div className="font-black text-slate-500 font-head pb-3">ضد</div>
            <div className="text-center flex-1 min-w-0">
              <div className="font-head font-extrabold truncate">{bb.school_name}</div>
              <div className="text-2xl font-black text-sky-300 font-head">{bb.xp.toLocaleString("en-US")}</div>
              <div className="text-[11px] text-slate-400">{bb.members} طالب نشط</div>
            </div>
          </div>
          <div className="flex h-3.5 rounded-full overflow-hidden bg-white/10" dir="ltr">
            <motion.div className="bg-gradient-to-r from-amber-500 to-rose-500" initial={{ width: "50%" }} animate={{ width: `${aPct}%` }} transition={{ duration: 1, ease: EASE }} />
            <div className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600" />
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-3">كل نقطة خبرة يجمعها طلاب مدرستك هذا الأسبوع تقرّبها من الكأس 🏆</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("students");
  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState(null);
  const [standing, setStanding] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (tab === "seasons") { setRows([]); return; }
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

  useEffect(() => {
    if (!user) { setStanding(null); return; }
    api.get("/leaderboard/my-standing").then((r) => setStanding(r.data)).catch(() => {});
  }, [user]);

  const tabMeta = TABS.find((t) => t.v === tab);
  const searching = q.trim().length > 0;
  const filtered = useMemo(() => {
    if (!rows) return null;
    if (!searching) return rows;
    const needle = q.trim();
    return rows.filter((r) => (r.name || "").includes(needle) || (r.sub || "").includes(needle));
  }, [rows, q, searching]);

  const top3 = !searching && filtered ? filtered.slice(0, 3) : [];
  const rest = filtered ? (searching ? filtered : filtered.slice(3)) : [];
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const maxScore = filtered && filtered.length ? Math.max(...filtered.map((r) => r.score || 0), 1) : 1;

  return (
    <Layout>
      {/* hero */}
      <div className="ft-navy-gradient grain text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-10 right-1/3 w-2 h-2 rounded-full bg-amber-300/60 animate-pulse" />
        <div className="absolute bottom-14 left-1/4 w-1.5 h-1.5 rounded-full bg-sky-300/50 animate-pulse" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="font-head text-3xl lg:text-4xl font-extrabold flex items-center gap-3"
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, 0], y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              className="w-12 h-12 rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/30 grid place-items-center"
            >
              <Trophy className="w-7 h-7 text-amber-400" />
            </motion.span>
            قوائم الصدارة
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
            className="text-slate-300 mt-3 max-w-2xl"
          >
            من يتألق الآن؟ ترتيب الطلاب والمدارس وأبطال الشطرنج وأجمل أعمال الاستوديو وأقوى المشاريع — كلها في مكان واحد، وتُحدَّث مع كل نقطة تُكتسب.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
            className="flex flex-wrap items-center gap-2 mt-5"
          >
            <span className="flex items-center gap-1.5 bg-white/10 ring-1 ring-white/15 rounded-full px-3 py-1.5 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> تحديث مباشر
            </span>
            {rows && (
              <span className="flex items-center gap-1.5 bg-white/10 ring-1 ring-white/15 rounded-full px-3 py-1.5 text-xs font-bold">
                <Users className="w-3.5 h-3.5 text-sky-300" /> {rows.length} متنافس في «{tabMeta.l}»
              </span>
            )}
            <Link to="/points" className="flex items-center gap-1.5 bg-amber-400/15 ring-1 ring-amber-300/30 text-amber-200 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-amber-400/25 transition">
              <Zap className="w-3.5 h-3.5" /> كيف أكسب النقاط؟
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* my standing */}
        {user && standing && <MyStandingCard standing={standing} user={user} />}

        {/* tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4" style={{ scrollbarWidth: "none" }}>
          {TABS.map((t) => {
            const active = tab === t.v;
            return (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                data-testid={`lb-tab-${t.v}`}
                className={`relative shrink-0 px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-1.5 transition-colors ${active ? "text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                {active && (
                  <motion.span
                    layoutId="lb-tab-pill"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-slate-900 shadow-lg"
                  />
                )}
                <t.icon className="w-4 h-4 relative" style={active ? { color: t.hex === "#D97706" ? "#FBBF24" : undefined } : { color: t.hex }} />
                <span className="relative">{t.l}</span>
              </button>
            );
          })}
        </div>

        {/* period + search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {tab === "students" && (
            <div className="flex bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              {PERIODS.map((p) => (
                <button
                  key={p.v} onClick={() => setPeriod(p.v)}
                  data-testid={`lb-period-${p.v}`}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${period === p.v ? "text-white" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {period === p.v && (
                    <motion.span layoutId="lb-period-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-emerald-600" />
                  )}
                  <span className="relative">{p.l}</span>
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم…"
              data-testid="lb-search"
              className="w-full bg-white border border-slate-200 rounded-full py-2.5 pr-10 pl-4 text-sm font-medium text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition"
            />
          </div>
        </div>

        {tab === "schools" && <BattleCard />}

        {tab === "seasons" && <SeasonsBoard />}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab + period + (searching ? "s" : "")}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {!filtered ? (
              <PodiumSkeleton />
            ) : filtered.length === 0 ? (
              searching ? (
                <EmptyState icon={Search} title="لا نتائج مطابقة" desc={`لا أحد باسم «${q.trim()}» في هذه القائمة بعد.`} />
              ) : (
                <EmptyState icon={Trophy} title={EMPTY_HINTS[tab].t} desc={EMPTY_HINTS[tab].d}
                  action={EMPTY_HINTS[tab].cta ? (
                    <Link to={EMPTY_HINTS[tab].cta[0]} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold">
                      {EMPTY_HINTS[tab].cta[1]}
                    </Link>
                  ) : undefined} />
              )
            ) : (
              <>
                {podiumOrder.length > 0 && <Podium order={podiumOrder} accent={tabMeta.hex} />}
                {searching && (
                  <div className="text-xs font-bold text-slate-400 mb-2">{filtered.length} نتيجة لـ «{q.trim()}»</div>
                )}
                <div className="bg-white rounded-[28px] border border-slate-100 ft-shadow overflow-hidden">
                  {rest.map((r, i) => (
                    <RowItem key={`${r.rank}-${r.name}-${i}`} r={r} i={i} tab={tab}
                      accent={tabMeta.hex} maxScore={maxScore} meId={user?.id} />
                  ))}
                  {rest.length === 0 && !searching && (
                    <div className="px-5 py-4 text-center text-xs text-slate-400 font-medium">المنافسة بدأت للتو — كن التالي على القائمة ✨</div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* earn footer */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mt-8 rounded-[28px] p-[1.5px] bg-gradient-to-l from-amber-300 via-yellow-500 to-amber-300"
        >
          <div className="rounded-[27px] bg-slate-900 text-white px-6 py-5 flex flex-wrap items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/30 grid place-items-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-300" />
            </span>
            <div className="flex-1 min-w-[200px]">
              <div className="font-head font-extrabold">تريد الصعود في الترتيب؟</div>
              <div className="text-xs text-slate-400 mt-0.5">كل كتاب تُنهيه، وكل مباراة تفوزها، وكل يوم تحضر فيه — نقاط حقيقية تصعد بك هنا.</div>
            </div>
            <Link to="/points" className="px-5 py-2.5 rounded-full bg-gradient-to-l from-amber-400 to-yellow-500 text-slate-900 text-sm font-extrabold shadow-lg hover:brightness-110 transition">
              جدولي النقاطي
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}

function MyStandingCard({ standing, user }) {
  const isStudent = standing.role === "student";
  const rank = isStudent ? standing.rank_students : standing.rank_all;
  const total = isStudent ? standing.total_students : standing.total_all;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="relative overflow-hidden rounded-[28px] p-5 sm:p-6 mb-6 text-white bg-gradient-to-bl from-emerald-600 via-teal-600 to-emerald-700 ft-shadow"
      data-testid="lb-my-standing"
    >
      <div className="absolute -top-14 -left-14 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -right-8 w-56 h-56 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/40 shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-2xl grid place-items-center bg-white/15 ring-2 ring-white/30 text-xl font-extrabold shrink-0">
            {(user.name || "؟")[0]}
          </span>
        )}
        <div className="flex-1 min-w-[180px]">
          <div className="text-[11px] font-bold text-emerald-100/90 flex items-center gap-1.5">
            <Medal className="w-3.5 h-3.5" /> ترتيبك الحالي
          </div>
          <div className="font-head text-xl font-extrabold mt-0.5 leading-snug">
            {rank ? <>المركز <span className="text-amber-300">#{rank}</span> <span className="text-sm font-bold text-emerald-100/80">من {total} {isStudent ? "طالب" : "عضو"}</span></> : "—"}
          </div>
          <div className="text-xs text-emerald-100/85 mt-0.5">{standing.level_title} · المستوى {standing.level}</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-center bg-white/10 ring-1 ring-white/20 rounded-2xl px-3.5 py-2">
            <div className="font-extrabold text-lg leading-none"><CountUp value={standing.xp} /></div>
            <div className="text-[10px] text-emerald-100/80 mt-1">نقطة خبرة</div>
          </div>
          {(standing.streak || 0) > 0 && (
            <div className="text-center bg-white/10 ring-1 ring-white/20 rounded-2xl px-3.5 py-2">
              <div className="font-extrabold text-lg leading-none flex items-center gap-1 justify-center">
                <Flame className="w-4 h-4 text-orange-300" />{standing.streak}
              </div>
              <div className="text-[10px] text-emerald-100/80 mt-1">يوم متتالٍ</div>
            </div>
          )}
          {standing.chess_rank && (
            <div className="text-center bg-white/10 ring-1 ring-white/20 rounded-2xl px-3.5 py-2">
              <div className="font-extrabold text-lg leading-none text-amber-300">#{standing.chess_rank}</div>
              <div className="text-[10px] text-emerald-100/80 mt-1">في الشطرنج · {standing.chess_rating}</div>
            </div>
          )}
          <Link to="/points" className="hidden sm:inline-flex px-4 py-2.5 rounded-full bg-white text-emerald-700 text-xs font-extrabold shadow hover:bg-emerald-50 transition">
            نقاطي
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

const MEDAL = [
  "from-amber-300 via-yellow-400 to-amber-500",
  "from-slate-100 via-slate-300 to-slate-400",
  "from-amber-500 via-amber-600 to-yellow-800",
];
const MEDAL_RING = ["ring-amber-300", "ring-slate-300", "ring-amber-500"];

function Podium({ order, accent }) {
  if (order.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-8" dir="rtl">
      {order.map((r, idx) => {
        const first = r.rank === 1;
        const h = first ? "h-40 sm:h-48" : r.rank === 2 ? "h-32 sm:h-40" : "h-28 sm:h-32";
        return (
          <motion.div
            key={r.rank}
            initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.13, type: "spring", stiffness: 240, damping: 23 }}
            className="text-center relative"
          >
            {first && (
              <motion.div
                animate={{ y: [0, -5, 0], rotate: [0, -4, 4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-9 left-1/2 -translate-x-1/2 z-10"
              >
                <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_4px_10px_rgba(245,158,11,0.55)]" fill="currentColor" />
              </motion.div>
            )}
            <div className={`relative ${first ? "w-[74px] h-[74px] sm:w-20 sm:h-20" : "w-14 h-14 sm:w-16 sm:h-16"} rounded-full mx-auto p-[3px] bg-gradient-to-br ${MEDAL[r.rank - 1]} shadow-xl mb-2`}>
              <div className="w-full h-full rounded-full bg-white grid place-items-center overflow-hidden">
                {r.avatar ? (
                  <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`font-extrabold ${first ? "text-2xl" : "text-lg"} text-slate-600`}>{(r.name || "؟")[0]}</span>
                )}
              </div>
              <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full bg-gradient-to-l ${MEDAL[r.rank - 1]} shadow ring-2 ring-white`}>
                {r.rank}
              </span>
            </div>
            <div className={`font-bold ${first ? "text-base" : "text-sm"} text-slate-800 line-clamp-1 px-1 mt-2.5`}>{r.name}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1 px-1">{r.sub}</div>
            <div className={`relative mt-2.5 ${h} rounded-t-[22px] bg-gradient-to-t ${MEDAL[r.rank - 1]} overflow-hidden`}>
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
              {first && <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-white/25 blur-xl" />}
              <div className="relative pt-3 text-white">
                <div className={`font-extrabold ${first ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} drop-shadow-sm`}>
                  <CountUp value={r.score || 0} />
                </div>
                <div className="text-[10px] font-bold opacity-85">{r.scoreLabel}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RowItem({ r, i, tab, accent, maxScore, meId }) {
  const isMe = r.uid && meId && r.uid === meId;
  const medal = r.rank <= 3 ? `bg-gradient-to-br ${MEDAL[r.rank - 1]} text-white shadow` : null;
  const pct = Math.max(4, Math.round(((r.score || 0) / maxScore) * 100));
  const content = (
    <motion.div
      initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(i * 0.045, 0.45), duration: 0.32, ease: EASE }}
      className={`relative flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-50 last:border-0 transition-colors ${isMe ? "bg-emerald-50/80 hover:bg-emerald-50" : "hover:bg-slate-50 active:bg-slate-100"}`}
    >
      {isMe && <span className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />}
      <span className={`w-9 h-9 rounded-xl grid place-items-center text-sm font-extrabold shrink-0 ${medal || "bg-slate-100 text-slate-500"}`}>{r.rank}</span>
      {r.avatar ? (
        <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-2xl object-cover shrink-0 bg-slate-100 ring-1 ring-slate-100" />
      ) : (
        <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 font-bold ring-1 ring-slate-100">
          {(r.name || "؟")[0]}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 truncate text-[15px]">{r.name}</span>
          {isMe && <span className="shrink-0 text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">أنت</span>}
          {r.levelTitle && <span className="hidden md:inline shrink-0 text-[10px] font-bold bg-violet-50 text-violet-600 ring-1 ring-violet-100 px-2 py-0.5 rounded-full">{r.levelTitle}</span>}
        </div>
        {r.sub && <div className="text-xs text-slate-400 truncate">{r.sub}</div>}
        {r.extra && <div className="text-[11px] text-amber-600 font-medium truncate mt-0.5">{r.extra}</div>}
        {!r.noBar && (
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[220px]">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ delay: 0.25 + Math.min(i * 0.045, 0.4), duration: 0.7, ease: EASE }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to left, ${accent}, ${accent}CC)` }}
            />
          </div>
        )}
      </div>
      {tab === "students" && r.streak > 0 && (
        <span className="text-xs text-orange-500 font-bold flex items-center gap-0.5 shrink-0 bg-orange-50 ring-1 ring-orange-100 rounded-full px-2 py-1">
          <Flame className="w-3.5 h-3.5" />{r.streak}
        </span>
      )}
      {tab === "ventures" && r.members > 0 && (
        <span className="text-[11px] text-slate-400 shrink-0 hidden sm:block">{r.members} أعضاء</span>
      )}
      <div className="text-left shrink-0">
        <div className="font-extrabold text-lg leading-none" style={{ color: accent }}>
          <CountUp value={r.score || 0} />
        </div>
        <div className="text-[10px] text-slate-400 mt-1">{r.scoreLabel}</div>
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
            <div className={`${i === 1 ? "h-40" : i === 0 ? "h-32" : "h-28"} rounded-t-[22px] bg-slate-200 mt-2`} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-[28px] border border-slate-100 overflow-hidden p-4 space-y-3">
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
