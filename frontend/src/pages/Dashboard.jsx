import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Flame, Trophy, BookOpen, Crown, Calendar, Zap, Award, TrendingUp, Sparkles, MessagesSquare, Medal, PenLine, Rocket, Bell, Quote, ArrowLeft, Star } from "lucide-react";
import * as Icons from "lucide-react";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { WeeklyGoals, ActivityHeatmap, UpcomingDeadlines, DailyChallenge, SavedItems, Suggestions, AchievementsShowcase } from "@/components/dashboard/widgets";
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
  <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></div>
    </div>
    <div className="mt-3 text-2xl font-extrabold font-head text-slate-900">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
    {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero card */}
        <FadeUp>
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-3xl p-8 text-white mb-6">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-slate-300 text-sm">أهلاً بك،</div>
              <h1 className="font-head text-3xl font-extrabold">{user.name}</h1>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" /> {gam.level_title} · المستوى {gam.level}
              </div>
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{gam.xp} نقطة خبرة</span><span>باقٍ {gam.xp_to_next} للمستوى التالي</span></div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${gam.level_progress}%` }} /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-5 py-3 rounded-2xl bg-white/10">
                <div className="text-2xl font-extrabold font-head flex items-center gap-1"><Flame className="w-5 h-5 text-orange-400" />{gam.streak}</div>
                <div className="text-[11px] text-slate-300">سلسلة أيام</div>
              </div>
              <Button data-testid="checkin-btn" onClick={checkin} disabled={checkedIn} className="pressable rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12">
                <Zap className="w-4 h-4 ml-1" /> حضور اليوم
              </Button>
            </div>
          </div>
        </div>
        </FadeUp>

        {/* stats */}
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Item><StatCard icon={Trophy} label="ترتيبك الوطني" value={`#${data.national_rank}`} color="#D97706" sub={data.school_rank ? `مدرستك: #${data.school_rank}` : ""} /></Item>
          <Item><StatCard icon={BookOpen} label="كتب مقروءة" value={data.books_read} color="#2563EB" /></Item>
          <Item><StatCard icon={Crown} label="تصنيف الشطرنج" value={data.chess_rating} color="#0A192F" /></Item>
          <Item><StatCard icon={MessagesSquare} label="مشاركاتك" value={data.posts} color="#059669" /></Item>
        </Stagger>

        {/* NEW: ventures + chess + daily quote */}
        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Item>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-head font-bold flex items-center gap-2 text-sm"><Rocket className="w-4.5 h-4.5 text-rose-500" /> مشاريعي</h3>
                <Link to="/ventures" className="text-xs text-rose-600 font-medium flex items-center gap-0.5">الكل <ArrowLeft className="w-3 h-3" /></Link>
              </div>
              {(data.my_ventures || []).length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">لم تنضم لأي مشروع بعد<br /><Link to="/ventures" className="text-rose-600 font-medium">اكتشف المشاريع 🚀</Link></div>
              ) : data.my_ventures.map((v) => (
                <Link key={v.id} to={`/ventures/${v.id}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-medium text-slate-700 line-clamp-1">{v.title}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${VSTATUS_C[v.status] || "bg-slate-100 text-slate-600"}`}>{VSTATUS[v.status] || v.status}</span>
                </Link>
              ))}
            </div>
          </Item>
          <Item>
            <button onClick={() => nav("/clubs/chess")} className="w-full text-right bg-slate-900 rounded-2xl p-5 text-white ft-shadow h-full relative overflow-hidden group">
              <div className="absolute -top-8 -left-8 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
              <div className="relative">
                <h3 className="font-head font-bold flex items-center gap-2 text-sm mb-2"><Crown className="w-4.5 h-4.5 text-amber-400" /> حلبة الشطرنج</h3>
                <div className="text-3xl font-extrabold font-head">{data.active_chess || 0}</div>
                <div className="text-xs text-slate-400">مباريات نشطة بانتظارك</div>
                {(data.chess_challenges || 0) > 0 && <div className="mt-2 text-xs font-bold text-amber-300">⚔ {data.chess_challenges} تحديات جديدة!</div>}
              </div>
            </button>
          </Item>
          <Item>
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white ft-shadow h-full relative overflow-hidden sm:col-span-2 lg:col-span-1">
              <Quote className="absolute -bottom-3 -left-3 w-24 h-24 text-white/10" />
              <div className="relative">
                <h3 className="font-head font-bold text-sm mb-2 opacity-90">حكمة اليوم 💡</h3>
                <p className="font-head text-lg font-bold leading-relaxed">"{quote.t}"</p>
                <p className="text-xs text-violet-200 mt-2">— {quote.a}</p>
              </div>
            </div>
          </Item>
        </Stagger>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> متابعة القراءة</h2>
                <Link to="/library" className="text-sm text-blue-600">المكتبة</Link>
              </div>
              {data.currently_reading.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">لم تبدأ أي كتاب بعد. <Link to="/library" className="text-blue-600">ابدأ القراءة الآن</Link></div>
              ) : (
                <div className="space-y-3">
                  {data.currently_reading.map((b) => (
                    <Link key={b.id} to={`/books/${b.id}`} className="flex items-center gap-4 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <BookCover book={b} className="w-12 h-16 rounded-lg" imgClassName="w-12 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{b.title}</div>
                        <div className="text-xs text-slate-500 mb-1.5">{b.author}</div>
                        <Progress value={b.progress} className="h-1.5" />
                      </div>
                      <div className="text-sm font-bold text-blue-600">{Math.round(b.progress)}%</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-emerald-600" /> موصى لك</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recs.slice(0, 4).map((b) => (
                  <Link key={b.id} to={`/books/${b.id}`} className="group">
                    <BookCover book={b} className="w-full aspect-[3/4] rounded-xl ft-shadow" imgClassName="w-full aspect-[3/4] object-cover rounded-xl ft-shadow group-hover:scale-[1.03] transition-transform" />
                    <div className="mt-2 text-sm font-medium text-slate-800 line-clamp-1">{b.title}</div>
                    <div className="text-xs text-slate-400 line-clamp-1">{b.author}</div>
                  </Link>
                ))}
              </div>
            </section>
            </FadeUp>
            {/* NEW: trending studio works */}
            {trending.length > 0 && (
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2"><PenLine className="w-5 h-5 text-violet-600" /> رائج في الاستوديو</h2>
                <Link to="/studio" className="text-sm text-violet-600">الاستوديو</Link>
              </div>
              <div className="space-y-2">
                {trending.map((w) => (
                  <Link key={w.id} to={`/studio/${w.id}`} className="block p-3 rounded-xl hover:bg-slate-50 bg-slate-50/50 transition-colors">
                    <div className="font-medium text-sm text-slate-800 line-clamp-1">{w.title}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>{w.author_name}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{(w.likes || 0)} إعجاب</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            </FadeUp>
            )}
          </div>
          <div className="space-y-6">
            {/* NEW: recent notifications */}
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" /> آخر الإشعارات
                  {(data.unread_notifications || 0) > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] grid place-items-center font-bold">{data.unread_notifications}</span>}
                </h2>
              </div>
              {(data.recent_notifications || []).length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">لا إشعارات حديثة 🔕</div>
              ) : data.recent_notifications.map((n) => (
                <button key={n.id} onClick={() => n.link ? nav(n.link) : null}
                  className={`w-full text-right block p-3 rounded-xl mb-2 transition-colors ${n.link ? "hover:bg-slate-50 cursor-pointer" : ""} ${!n.read ? "bg-blue-50/60" : "bg-slate-50/50"}`}>
                  <div className="font-medium text-sm text-slate-800 flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    <span className="line-clamp-1">{n.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</div>
                </button>
              ))}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-amber-600" /> فعاليات قادمة</h2>
              {data.upcoming_events.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا فعاليات حالياً</div> : data.upcoming_events.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block p-3 rounded-xl hover:bg-slate-50 border-r-2 border-amber-500 mb-2 bg-slate-50/50 transition-colors">
                  <div className="font-medium text-sm text-slate-800">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.date} · {e.mode === "online" ? "عن بُعد" : "حضوري"}</div>
                </Link>
              ))}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-blue-600" /> منافسات مفتوحة</h2>
              {data.open_competitions.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا مسابقات حالياً</div> : data.open_competitions.map((c) => (
                <Link key={c.id} to={`/competitions/${c.id}`} className="block p-3 rounded-xl hover:bg-slate-50 mb-2 bg-slate-50/50 transition-colors">
                  <div className="font-medium text-sm text-slate-800">{c.title}</div>
                  <div className="text-xs text-slate-400">{c.type}</div>
                </Link>
              ))}
              {data.chess_challenges > 0 && (
                <Link to="/clubs/chess" className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">
                  <Crown className="w-4 h-4" /> لديك {data.chess_challenges} تحدي شطرنج
                </Link>
              )}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-emerald-600" /> إنجازاتك</h2>
              {gam.badges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">اجمع إنجازك الأول!</div> : (
                <div className="flex flex-wrap gap-2">
                  {gam.badges.map((b, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{b}</span>)}
                </div>
              )}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2"><Medal className="w-5 h-5 text-amber-600" /> شارات مهاراتي</h2>
                <Link to={`/profile/${user.id}`} className="text-sm text-amber-600">ملفي</Link>
              </div>
              {myBadges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">تُمنح الشارات من المشرفين للتميز 🏅</div> : (
                <div className="flex flex-wrap gap-2">
                  {myBadges.slice(0, 6).map((b) => {
                    const Icon = Icons[b.icon] || Icons.Medal;
                    return (
                      <span key={b.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium" style={{ background: b.color }}>
                        <Icon className="w-3.5 h-3.5" />{b.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>
            </FadeUp>
            <FadeUp>
            <section className="bg-gradient-to-l from-violet-600 to-purple-700 rounded-2xl p-6 text-white ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-2"><PenLine className="w-5 h-5" /> استوديو النشر</h2>
              <p className="text-sm text-violet-200 mb-4">
                {myWorks.length === 0 ? "انشر مقالاتك وأشعارك وخواطرك" : `لديك ${myWorks.length} ${myWorks.length === 1 ? "عمل" : "أعمال"} · ${myWorks.filter((w) => w.status === "published").length} منشور`}
              </p>
              <Link to="/studio" className="pressable inline-flex items-center gap-1.5 bg-white text-violet-700 text-sm font-bold px-4 py-2.5 rounded-xl">
                {myWorks.length === 0 ? "ابدأ الكتابة" : "افتح الاستوديو"}
              </Link>
            </section>
            </FadeUp>
          </div>
        </div>

        {/* NEW: personal progress wave */}
        <div className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <WeeklyGoals />
            <DailyChallenge onXp={() => { refresh(); }} />
          </div>
          <ActivityHeatmap />
          <div className="grid lg:grid-cols-2 gap-6">
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
