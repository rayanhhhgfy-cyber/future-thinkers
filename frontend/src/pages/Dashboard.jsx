import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Flame, Trophy, BookOpen, Crown, Calendar, Zap, Award, TrendingUp, TrendingDown, BarChart3, Sparkles, MessagesSquare, Medal, PenLine, Rocket, Bell, Quote, ArrowLeft, Star, Clock, ListMusic, FileText, Target, Activity, Users, Upload, Puzzle, Timer } from "lucide-react";
import * as Icons from "lucide-react";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { WeeklyGoals, ActivityHeatmap, UpcomingDeadlines, DailyChallenge, SavedItems, Suggestions, AchievementsShowcase } from "@/components/dashboard/widgets";
import { ContinueRail, StarterChecklist, MyActivityTimeline } from "@/components/dashboard/ux";
import { timeAgo } from "@/components/NotificationsPanel";
import BookCover from "@/components/BookCover";

const VSTATUS = { idea: "فكرة", in_progress: "قيد التنفيذ", completed: "مكتمل" };
const VSTATUS_C = { idea: "bg-sky-100 text-sky-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700" };

const QUOTES = [
  { t: "العلم في الصغر كالنقش على الحجر", a: "حكمة عربية" },
  { t: "من جدّ وجد، ومن زرع حصد", a: "مثل عربي" },
  { t: "القراءة تصنع الإنسان الكامل", a: "فرانسيس بيكون" },
  { t: "لا تؤجل عمل اليوم إلى الغد", a: "حكمة" },
  { t: "العقل السليم في الجسم السليم", a: "حكمة لاتينية" },
  { t: "خير جليس في الزمان كتاب", a: "المتنبي" },
  { t: "اطلبوا العلم من المهد إلى اللحد", a: "حديث شريف" },
];

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="h-full w-full min-w-0 flex flex-col bg-white rounded-3xl p-4 border border-slate-100 ft-shadow hover-lift">
    <div className="w-10 h-10 rounded-2xl grid place-items-center shrink-0" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></div>
    <div className="mt-2.5 text-2xl sm:text-[26px] leading-none font-extrabold font-head text-slate-900">{value}</div>
    <div className="text-xs leading-tight text-slate-500 mt-1.5">{label}</div>
    {sub && <div className="text-[11px] leading-tight text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

/* "My week in numbers" card · hides silently until /stats/my-week answers. */
function WeeklyNumbers() {
  const [w, setW] = useState(null);
  useEffect(() => {
    api.get("/stats/my-week").then((r) => setW(r.data)).catch(() => {});
  }, []);
  if (!w) return null;
  const delta = (w.pages_this_week || 0) - (w.pages_last_week || 0);
  const pct = w.pages_last_week > 0 ? Math.round((delta / w.pages_last_week) * 100) : null;
  const mini = [
    { label: "صفحات هذا الأسبوع", value: w.pages_this_week ?? 0, icon: BookOpen, tint: "bg-sky-50 text-sky-600" },
    { label: "نقاط الأسبوع", value: w.xp_this_week ?? 0, icon: Zap, tint: "bg-amber-50 text-amber-600" },
    { label: "دقائق تركيز", value: w.focus_min_week ?? 0, icon: Clock, tint: "bg-violet-50 text-violet-600" },
    { label: "أيام نشطة", value: `${w.active_days ?? 0}/7`, icon: Calendar, tint: "bg-emerald-50 text-emerald-600" },
  ];
  return (
    <FadeUp>
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-xl ft-icon-tile text-white grid place-items-center shrink-0"><BarChart3 className="w-5 h-5" /></span>
            أسبوعي في أرقام
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {pct !== null ? (
              <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                القراءة {delta >= 0 ? "+" : ""}{pct}% عن الأسبوع الماضي
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">أسبوعك الأول · بداية موفقة!</span>
            )}
            <Link to="/stats" className="pressable inline-flex items-center gap-1 text-[11px] font-extrabold ft-text-accent min-h-[44px] px-2">كل إحصائياتي <ArrowLeft className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mini.map((m) => (
            <div key={m.label} className="min-w-0 rounded-2xl bg-slate-50/70 ring-1 ring-slate-100 px-3.5 py-3.5">
              <span className={`w-8 h-8 rounded-lg grid place-items-center ${m.tint}`}><m.icon className="w-4 h-4" /></span>
              <div className="font-head text-xl font-black text-slate-900 mt-2 leading-none">{m.value}</div>
              <div className="text-[10px] font-bold text-slate-400 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      </section>
    </FadeUp>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [gam, setGam] = useState(null);
  const [recs, setRecs] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [myWorks, setMyWorks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [quests, setQuests] = useState([]);
  const [feed, setFeed] = useState([]);
  const [online, setOnline] = useState(0);
  const [followFeed, setFollowFeed] = useState([]);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  const load = async () => {
    const [d, g, r, b, w, t] = await Promise.all([
      api.get("/dashboard"), api.get("/gamification/me"), api.get("/books/me/recommendations"),
      api.get("/badges/me").catch(() => ({ data: [] })),
      api.get("/studio/works/me").catch(() => ({ data: [] })),
      api.get("/studio/published", { params: { limit: 3 } }).catch(() => ({ data: { items: [] } })),
    ]);
    setData(d.data); setGam(g.data); setRecs(r.data);
    setMyBadges(b.data); setMyWorks(w.data);
    setTrending((t.data.items || []).sort((x, y) => (y.likes || 0) - (x.likes || 0)).slice(0, 3));
    api.get("/quests/today").then((r) => setQuests(r.data.quests || [])).catch(() => {});
    api.get("/activity/feed", { params: { limit: 8 } }).then((r) => setFeed(r.data.items || [])).catch(() => {});
    api.get("/presence/online").then((r) => setOnline(r.data.online || 0)).catch(() => {});
    api.get("/feed/following").then((r) => setFollowFeed(r.data.items || [])).catch(() => {});
  };
  const claimQuest = async (q) => {
    try {
      const { data: res } = await api.post("/quests/claim", { key: q.key });
      toast.success(`أحسنت! +${res.xp} نقطة خبرة 🎉`);
      setQuests((prev) => prev.map((x) => x.key === q.key ? { ...x, claimed: true } : x));
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّرت المطالبة"); }
  };
  useEffect(() => { load(); }, []);

  const checkin = async () => {
    try {
      const { data: res } = await api.post("/gamification/checkin");
      if (res.already) toast.info("سجّلت حضورك اليوم بالفعل");
      else { toast.success(`سلسلة ${res.streak} أيام! +نقاط خبرة`); refresh(); load(); }
      setCheckedIn(true);
    } catch { toast.error("تعذّر تسجيل الحضور"); }
  };

  if (!data || !gam) return <Layout><PageLoader /></Layout>;

  /* ============================================================
     Layout system · mobile-first single column in DOM order.
     At xl the same children become a 12-col bento: hero + stats
     full width, main stack 8, engage rail 4 (spans continue +
     weekly rows), content 8 + rail 4, wave full width.
     ============================================================ */
  return (
    <Layout>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 xl:py-10 flex flex-col gap-5 sm:gap-6 xl:grid xl:grid-cols-12 xl:items-start">

        {/* ============ 1 · Hero ============ */}
        <FadeUp className="min-w-0 xl:col-span-12">
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 sm:w-80 sm:h-80 bg-white/10 rounded-full blur-3xl animate-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-20 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full border-[26px] border-white/5" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="text-slate-300 text-sm">أهلاً بك،</div>
                  <h1 className="font-head text-[26px] leading-snug sm:text-3xl lg:text-4xl font-extrabold break-words">{user.name}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm min-w-0">
                      <Sparkles className="w-4 h-4 ft-text-accent-bright shrink-0" /> <span className="truncate">{gam.level_title} · المستوى {gam.level}</span>
                    </span>
                    {online > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" /> {online} على المنصة الآن
                      </span>
                    )}
                  </div>
                  <div className="mt-5 w-full max-w-xl">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-300 mb-1.5">
                      <span>{gam.xp} نقطة خبرة</span>
                      <span>باقٍ {gam.xp_to_next} للمستوى التالي</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full ft-grad-bar rounded-full transition-all duration-700" style={{ width: `${gam.level_progress}%` }} /></div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {(() => {
                    const goal = data.daily_goal || 20;
                    const today = data.pages_today || 0;
                    const pct = Math.min(100, (today / goal) * 100);
                    const R = 26, C = 2 * Math.PI * R;
                    return (
                      <div className="relative w-[72px] h-[72px] shrink-0" title={`هدف اليوم: ${today}/${goal} صفحة`}>
                        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
                          <circle cx="32" cy="32" r={R} fill="none" stroke={pct >= 100 ? "#34D399" : "#FBBF24"} strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 grid place-items-center text-center px-1">
                          <div>
                            <div className="text-sm font-extrabold font-head leading-none">{today}</div>
                            <div className="text-[9px] text-slate-300 mt-0.5">من {goal} صفحة</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="text-center px-5 py-3 rounded-2xl bg-white/10 border border-white/10 shrink-0">
                    <div className="text-2xl font-extrabold font-head flex items-center justify-center gap-1.5"><Flame className="w-5 h-5 text-orange-400 shrink-0" />{gam.streak}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">سلسلة أيام</div>
                  </div>
                  <Button data-testid="checkin-btn" onClick={checkin} disabled={checkedIn} className="pressable rounded-2xl ft-btn-solid h-12 px-5 shrink-0">
                    <Zap className="w-4 h-4 ml-1 shrink-0" /> حضور اليوم
                  </Button>
                </div>
              </div>
              {/* Quick actions · all screens: 2×2 on mobile, 4 across on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <Link to="/upload-book" className="pressable flex items-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 sm:px-4 py-3 min-h-[52px] min-w-0 text-sm font-bold text-white transition-colors">
                  <Upload className="w-5 h-5 ft-text-accent-bright shrink-0" /> <span className="truncate">رفع كتاب</span>
                </Link>
                <Link to="/chess/puzzle" className="pressable flex items-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 sm:px-4 py-3 min-h-[52px] min-w-0 text-sm font-bold text-white transition-colors">
                  <Puzzle className="w-5 h-5 ft-text-accent-bright shrink-0" /> <span className="truncate">لغز اليوم</span>
                </Link>
                <Link to="/focus" className="pressable flex items-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 sm:px-4 py-3 min-h-[52px] min-w-0 text-sm font-bold text-white transition-colors">
                  <Timer className="w-5 h-5 ft-text-accent-bright shrink-0" /> <span className="truncate">غرف التركيز</span>
                </Link>
                <Link to="/competitions" className="pressable flex items-center gap-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 sm:px-4 py-3 min-h-[52px] min-w-0 text-sm font-bold text-white transition-colors">
                  <Trophy className="w-5 h-5 ft-text-accent-bright shrink-0" /> <span className="truncate">المسابقات</span>
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ============ 2 · Stat cards · 2×2 mobile → 4 across ============ */}
        <Stagger className="min-w-0 xl:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Item className="h-full min-w-0"><StatCard icon={Trophy} label="ترتيبك الوطني" value={`#${data.national_rank}`} color="#D97706" sub={data.school_rank ? `مدرستك: #${data.school_rank}` : ""} /></Item>
          <Item className="h-full min-w-0"><StatCard icon={BookOpen} label="كتب مقروءة" value={data.books_read} color="#2563EB" /></Item>
          <Item className="h-full min-w-0"><StatCard icon={Crown} label="تصنيف الشطرنج" value={data.chess_rating} color="#0A192F" /></Item>
          <Item className="h-full min-w-0"><StatCard icon={MessagesSquare} label="مشاركاتك" value={data.posts} color="#059669" /></Item>
        </Stagger>

        {/* ============ 3 · Continue + starter checklist (main 8 on xl) ============ */}
        <div className="min-w-0 xl:col-span-8 flex flex-col gap-5 sm:gap-6">
          <ContinueRail data={data} />
          <StarterChecklist data={data} />
        </div>

        {/* ============ 4 · Daily quests + live feed + platform now (rail 4 on xl) ============ */}
        <div className="min-w-0 w-full self-start xl:col-span-4 xl:row-span-2 flex flex-col gap-5 sm:gap-6">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-5 xl:grid-cols-1 min-w-0">
            <FadeUp className="min-w-0 lg:col-span-3 xl:col-span-1">
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow h-full">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-xl grid place-items-center bg-rose-50 text-rose-600 shrink-0"><Target className="w-5 h-5" /></span>
                    مهام اليوم
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700 shrink-0">تتجدّد يومياً</span>
                </div>
                {quests.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">جارٍ تجهيز مهامك…</p>
                ) : (
                  <div className="space-y-3">
                    {quests.map((q) => {
                      const Icon = Icons[q.icon] || Icons.Target;
                      const pct = Math.min(100, ((q.progress || 0) / (q.target || 1)) * 100);
                      return (
                        <div key={q.key} className="flex items-center gap-3 min-w-0">
                          <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${q.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}><Icon className="w-4 h-4" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-700 truncate">{q.title}</span>
                              <span className="text-[11px] text-slate-400 shrink-0">{q.progress}/{q.target}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                              <div className={`h-full rounded-full transition-all duration-700 ${q.done ? "bg-emerald-500" : "bg-rose-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {q.claimed ? (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">تم ✓</span>
                          ) : q.done ? (
                            <button onClick={() => claimQuest(q)} className="pressable shrink-0 text-[11px] font-extrabold text-white ft-btn-solid px-3 py-1.5 rounded-full">خذ +{q.reward}</button>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full shrink-0">+{q.reward} XP</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </FadeUp>
            <FadeUp className="min-w-0 lg:col-span-2 xl:col-span-1">
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow h-full">
                <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 mb-4 min-w-0">
                  <span className="w-9 h-9 rounded-xl grid place-items-center bg-sky-50 text-sky-600 shrink-0"><Activity className="w-5 h-5" /></span>
                  نشاط المنصة الآن
                </h3>
                {feed.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">كن أول من يصنع نشاطاً اليوم ✨</p>
                ) : (
                  <div className="space-y-2.5">
                    {feed.slice(0, 6).map((f) => (
                      <div key={f.id} className="flex items-start gap-2.5 text-sm min-w-0">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white grid place-items-center text-[11px] font-bold shrink-0">{(f.user_name || "؟").slice(0, 1)}</span>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-700">{f.user_name}</span>{" "}
                          <span className="text-slate-500 break-words">{f.text}</span>
                          <div className="text-[11px] text-slate-400">{timeAgo(f.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </FadeUp>
          </div>
          <section className="hidden xl:block bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
            <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 mb-3 min-w-0">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-emerald-50 text-emerald-600 shrink-0"><Users className="w-5 h-5" /></span>
              المنصة الآن
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-head text-2xl font-black text-slate-900">{online}</span>
              <span className="text-sm text-slate-500">مستخدم على المنصة الآن</span>
            </div>
            <Link to="/community" className="pressable inline-flex items-center gap-1 text-xs font-bold ft-text-accent mt-2 min-h-[44px]">ادخل ساحة المجتمع <ArrowLeft className="w-3.5 h-3.5" /></Link>
          </section>
        </div>

        {/* ============ 5 · My week in numbers (main 8 on xl) ============ */}
        <div className="min-w-0 xl:col-span-8">
          <WeeklyNumbers />
        </div>

        {/* ============ 6 · My library trio ============ */}
        <Stagger className="min-w-0 xl:col-span-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Item className="min-w-0 h-full">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow h-full">
              <div className="flex items-center gap-2 mb-3 min-w-0">
                <span className="w-9 h-9 rounded-xl grid place-items-center bg-indigo-50 text-indigo-600 shrink-0"><FileText className="w-5 h-5" /></span>
                <h3 className="font-head font-bold text-slate-800">صفحاتي المقروءة</h3>
              </div>
              <div className="text-3xl font-extrabold font-head text-slate-900">{(data.pages_read || 0).toLocaleString("en-US")}</div>
              <div className="text-xs text-slate-400 mt-1">صفحة قرأتها حتى اليوم · {data.books_read || 0} كتاب مكتمل</div>
              <Link to="/library?tab=personal" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 mt-3">افتح مكتبتي الشخصية <ArrowLeft className="w-3.5 h-3.5" /></Link>
            </div>
          </Item>
          <Item className="min-w-0 h-full">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow h-full">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl grid place-items-center bg-amber-50 text-amber-600 shrink-0"><Clock className="w-5 h-5" /></span>
                  <h3 className="font-head font-bold text-slate-800">أكمل لاحقاً</h3>
                </div>
                {data.later_count > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">{data.later_count}</span>}
              </div>
              {(data.later_books || []).length === 0 ? (
                <p className="text-sm text-slate-400">لا كتب بانتظارك · من صفحة أي كتاب اضغط «أكمل لاحقاً» وسيظهر هنا.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.later_books.map((b) => (
                    <Link key={b.id} to={`/books/${b.id}`} title={b.title} className="w-14 aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 shrink-0 hover:scale-105 transition-transform">
                      <BookCover book={b} className="w-full h-full" imgClassName="w-full h-full object-cover" />
                    </Link>
                  ))}
                  {data.later_count > 4 && (
                    <Link to="/library?tab=personal" className="w-14 aspect-[3/4] rounded-lg bg-amber-50 text-amber-700 grid place-items-center text-xs font-extrabold shrink-0">+{data.later_count - 4}</Link>
                  )}
                </div>
              )}
            </div>
          </Item>
          <Item className="min-w-0 h-full">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow h-full">
              <div className="flex items-center gap-2 mb-3 min-w-0">
                <span className="w-9 h-9 rounded-xl grid place-items-center bg-violet-50 text-violet-600 shrink-0"><ListMusic className="w-5 h-5" /></span>
                <h3 className="font-head font-bold text-slate-800">قوائم كتبي</h3>
              </div>
              {(data.my_playlists || []).length === 0 ? (
                <p className="text-sm text-slate-400">أنشئ قوائم كتبك الخاصة مثل قوائم سبوتيفاي من مكتبتك الشخصية.</p>
              ) : (
                <div className="space-y-2">
                  {data.my_playlists.map((p) => (
                    <Link key={p.id} to="/library?tab=personal" className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-slate-50 hover:bg-violet-50 transition-colors min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="flex-1 min-w-0 font-semibold text-sm text-slate-700 truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{p.count} كتاب</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Item>
        </Stagger>

        {/* ============ 7 · Ventures + chess + daily quote trio ============ */}
        <Stagger className="min-w-0 xl:col-span-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Item className="min-w-0 h-full">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow h-full">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-head font-bold flex items-center gap-2 text-sm min-w-0"><Rocket className="w-4 h-4 text-rose-500 shrink-0" /> مشاريعي</h3>
                <Link to="/ventures" className="text-xs text-rose-600 font-medium flex items-center gap-0.5 shrink-0">الكل <ArrowLeft className="w-3 h-3" /></Link>
              </div>
              {(data.my_ventures || []).length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">لم تنضم لأي مشروع بعد<br /><Link to="/ventures" className="text-rose-600 font-medium">اكتشف المشاريع 🚀</Link></div>
              ) : data.my_ventures.map((v) => (
                <Link key={v.id} to={`/ventures/${v.id}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors min-w-0">
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 line-clamp-1">{v.title}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${VSTATUS_C[v.status] || "bg-slate-100 text-slate-600"}`}>{VSTATUS[v.status] || v.status}</span>
                </Link>
              ))}
            </div>
          </Item>
          <Item className="min-w-0 h-full">
            <button onClick={() => nav("/clubs/chess")} className="w-full min-w-0 text-right bg-slate-900 rounded-3xl p-5 text-white ft-shadow h-full relative overflow-hidden group">
              <div aria-hidden className="pointer-events-none absolute -top-8 -left-8 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
              <div className="relative">
                <h3 className="font-head font-bold flex items-center gap-2 text-sm mb-2"><Crown className="w-4 h-4 text-amber-400 shrink-0" /> حلبة الشطرنج</h3>
                <div className="text-3xl font-extrabold font-head">{data.active_chess || 0}</div>
                <div className="text-xs text-slate-400">مباريات نشطة بانتظارك</div>
                {(data.chess_challenges || 0) > 0 && <div className="mt-2 text-xs font-bold text-amber-300">⚔ {data.chess_challenges} تحديات جديدة!</div>}
              </div>
            </button>
          </Item>
          <Item className="min-w-0 h-full sm:col-span-2 lg:col-span-1">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-5 text-white ft-shadow h-full relative overflow-hidden">
              <Quote aria-hidden className="pointer-events-none absolute -bottom-3 -left-3 w-24 h-24 text-white/10" />
              <div className="relative">
                <h3 className="font-head font-bold text-sm mb-2 opacity-90">حكمة اليوم 💡</h3>
                <p className="font-head text-lg font-bold leading-relaxed break-words">"{quote.t}"</p>
                <p className="text-xs text-violet-200 mt-2">· {quote.a}</p>
              </div>
            </div>
          </Item>
        </Stagger>

        {/* ============ 8 · Reading content column (8 on xl) ============ */}
        <div className="min-w-0 xl:col-span-8 flex flex-col gap-5 sm:gap-6">
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 min-w-0"><BookOpen className="w-5 h-5 text-blue-600 shrink-0" /> متابعة القراءة</h2>
                <Link to="/library" className="text-sm text-blue-600 shrink-0">المكتبة</Link>
              </div>
              {data.currently_reading.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">لم تبدأ أي كتاب بعد. <Link to="/library" className="text-blue-600">ابدأ القراءة الآن</Link></div>
              ) : (
                <div className="space-y-3">
                  {data.currently_reading.map((b) => (
                    <Link key={b.id} to={`/books/${b.id}`} className="flex items-center gap-3 sm:gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-colors min-w-0">
                      <BookCover book={b} className="w-12 h-16 rounded-lg shrink-0" imgClassName="w-12 h-16 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{b.title}</div>
                        <div className="text-xs text-slate-500 mb-1.5 truncate">{b.author}</div>
                        <Progress value={b.progress} className="h-1.5" />
                      </div>
                      <div className="text-sm font-bold text-blue-600 shrink-0">{Math.round(b.progress)}%</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Sparkles className="w-5 h-5 ft-text-accent shrink-0" /> موصى لك</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recs.slice(0, 4).map((b) => (
                  <Link key={b.id} to={`/books/${b.id}`} className="group min-w-0">
                    <BookCover book={b} className="w-full aspect-[3/4] rounded-xl ft-shadow" imgClassName="w-full aspect-[3/4] object-cover rounded-xl ft-shadow group-hover:scale-[1.03] transition-transform" />
                    <div className="mt-2 text-sm font-medium text-slate-800 line-clamp-1">{b.title}</div>
                    <div className="text-xs text-slate-400 line-clamp-1">{b.author}</div>
                  </Link>
                ))}
              </div>
            </section>
          </FadeUp>
          {trending.length > 0 && (
            <FadeUp>
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h2 className="font-head font-bold text-lg flex items-center gap-2 min-w-0"><PenLine className="w-5 h-5 text-violet-600 shrink-0" /> رائج في الاستوديو</h2>
                  <Link to="/studio" className="text-sm text-violet-600 shrink-0">الاستوديو</Link>
                </div>
                <div className="space-y-2">
                  {trending.map((w) => (
                    <Link key={w.id} to={`/studio/${w.id}`} className="block min-w-0 p-3 rounded-xl hover:bg-slate-50 bg-slate-50/50 transition-colors">
                      <div className="font-medium text-sm text-slate-800 line-clamp-1">{w.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span className="truncate">{w.author_name}</span>
                        <span className="flex items-center gap-1 shrink-0"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{(w.likes || 0)} إعجاب</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </FadeUp>
          )}
          {followFeed.length > 0 && (
            <FadeUp>
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Users className="w-5 h-5 ft-text-accent shrink-0" /> جديد ممن تتابعهم</h2>
                <div className="space-y-2">
                  {followFeed.slice(0, 5).map((f) => (
                    <Link key={`${f.kind}-${f.id}`} to={f.kind === "work" ? `/studio/${f.id}` : `/ventures/${f.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 bg-slate-50/50 transition-colors min-w-0">
                      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${f.kind === "work" ? "bg-violet-50 text-violet-600" : "bg-rose-50 text-rose-600"}`}>
                        {f.kind === "work" ? <PenLine className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-sm text-slate-800 truncate">{f.title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{f.author_name} · {f.kind === "work" ? "عمل جديد" : "مشروع"}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </FadeUp>
          )}
        </div>

        {/* ============ 9 · Rail column (4 on xl) ============ */}
        <div className="min-w-0 xl:col-span-4 flex flex-col gap-5 sm:gap-6">
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 min-w-0">
                  <Bell className="w-5 h-5 text-blue-600 shrink-0" /> آخر الإشعارات
                  {(data.unread_notifications || 0) > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] grid place-items-center font-bold shrink-0">{data.unread_notifications}</span>}
                </h2>
              </div>
              {(data.recent_notifications || []).length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">لا إشعارات حديثة 🔕</div>
              ) : data.recent_notifications.map((n) => (
                <button key={n.id} onClick={() => n.link ? nav(n.link) : null}
                  className={`w-full min-w-0 text-right block p-3 rounded-xl mb-2 transition-colors ${n.link ? "hover:bg-slate-50 cursor-pointer" : ""} ${!n.read ? "bg-blue-50/60" : "bg-slate-50/50"}`}>
                  <div className="font-medium text-sm text-slate-800 flex items-start gap-2 min-w-0">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    <span className="line-clamp-1 min-w-0 flex-1">{n.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</div>
                </button>
              ))}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Calendar className="w-5 h-5 text-amber-600 shrink-0" /> فعاليات قادمة</h2>
              {data.upcoming_events.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا فعاليات حالياً</div> : data.upcoming_events.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block min-w-0 p-3 rounded-xl hover:bg-slate-50 border-r-2 border-amber-500 mb-2 bg-slate-50/50 transition-colors">
                  <div className="font-medium text-sm text-slate-800 break-words">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.date} · {e.mode === "online" ? "عن بُعد" : "حضوري"}</div>
                </Link>
              ))}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><TrendingUp className="w-5 h-5 text-blue-600 shrink-0" /> منافسات مفتوحة</h2>
              {data.open_competitions.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا مسابقات حالياً</div> : data.open_competitions.map((c) => (
                <Link key={c.id} to={`/competitions/${c.id}`} className="block min-w-0 p-3 rounded-xl hover:bg-slate-50 mb-2 bg-slate-50/50 transition-colors">
                  <div className="font-medium text-sm text-slate-800 break-words">{c.title}</div>
                  <div className="text-xs text-slate-400">{c.type}</div>
                </Link>
              ))}
              {data.chess_challenges > 0 && (
                <Link to="/clubs/chess" className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium min-w-0">
                  <Crown className="w-4 h-4 shrink-0" /> <span className="min-w-0">لديك {data.chess_challenges} تحدي شطرنج</span>
                </Link>
              )}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Award className="w-5 h-5 ft-text-accent shrink-0" /> إنجازاتك</h2>
              {gam.badges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">اجمع إنجازك الأول!</div> : (
                <div className="flex flex-wrap gap-2">
                  {gam.badges.map((b, i) => <span key={i} className="px-3 py-1.5 rounded-full ft-bg-soft ft-text-accent text-xs font-medium">{b}</span>)}
                </div>
              )}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 min-w-0"><Medal className="w-5 h-5 text-amber-600 shrink-0" /> شارات مهاراتي</h2>
                <Link to={`/profile/${user.id}`} className="text-sm text-amber-600 shrink-0">ملفي</Link>
              </div>
              {myBadges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">تُمنح الشارات من المشرفين للتميز 🏅</div> : (
                <div className="flex flex-wrap gap-2">
                  {myBadges.slice(0, 6).map((b) => {
                    const Icon = Icons[b.icon] || Icons.Medal;
                    return (
                      <span key={b.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium" style={{ background: b.color }}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />{b.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>
          </FadeUp>
          <FadeUp>
            <section className="bg-gradient-to-l from-violet-600 to-purple-700 rounded-3xl p-5 sm:p-6 text-white ft-shadow relative overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
              <div className="relative">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-2 min-w-0"><PenLine className="w-5 h-5 shrink-0" /> استوديو النشر</h2>
                <p className="text-sm text-violet-200 mb-4">
                  {myWorks.length === 0 ? "انشر مقالاتك وأشعارك وخواطرك" : `لديك ${myWorks.length} ${myWorks.length === 1 ? "عمل" : "أعمال"} · ${myWorks.filter((w) => w.status === "published").length} منشور`}
                </p>
                <Link to="/studio" className="pressable inline-flex items-center gap-1.5 bg-white text-violet-700 text-sm font-bold px-4 py-2.5 rounded-xl">
                  {myWorks.length === 0 ? "ابدأ الكتابة" : "افتح الاستوديو"}
                </Link>
              </div>
            </section>
          </FadeUp>
          <MyActivityTimeline />
        </div>

        {/* ============ 10 · Personal progress wave ============ */}
        <div className="min-w-0 xl:col-span-12 flex flex-col gap-5 sm:gap-6">
          <div className="grid lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <WeeklyGoals />
            <DailyChallenge onXp={() => { refresh(); }} />
          </div>
          <ActivityHeatmap />
          <div className="grid lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
            <UpcomingDeadlines />
            <SavedItems />
          </div>
          <Suggestions />
          <AchievementsShowcase />
        </div>

      </div>
    </Layout>
  );
}
