import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flame, Trophy, BookOpen, Crown, Calendar, Zap, Sparkles, MessagesSquare, Rocket, ArrowLeft, Target, Upload, Puzzle, Timer } from "lucide-react";
import * as Icons from "lucide-react";
import { FadeUp } from "@/components/anim";
import { ContinueRail, StarterChecklist } from "@/components/dashboard/ux";
import BookCover from "@/components/BookCover";

const VSTATUS = { idea: "فكرة", in_progress: "قيد التنفيذ", completed: "مكتمل" };
const VSTATUS_C = { idea: "bg-sky-100 text-sky-700", in_progress: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700" };

/* One cell of the stats bento band · horizontal, px-fixed so it stays dense
   at any user font-scale setting. */
const StatCell = ({ icon: Icon, label, value, color, sub }) => (
  <div className="min-w-0 bg-white flex items-center gap-[10px] px-[14px] py-[12px]">
    <div className="w-[38px] h-[38px] rounded-[12px] grid place-items-center shrink-0" style={{ background: `${color}16`, color }}><Icon className="w-[19px] h-[19px]" /></div>
    <div className="min-w-0">
      <div className="text-[21px] leading-[1.05] font-extrabold font-head text-slate-900 truncate">{value}</div>
      <div className="text-[11px] leading-tight text-slate-500 truncate">{label}</div>
      {sub ? <div className="text-[10px] leading-tight text-slate-400 truncate">{sub}</div> : null}
    </div>
  </div>
);

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [gam, setGam] = useState(null);
  const [recs, setRecs] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [quests, setQuests] = useState([]);
  const [online, setOnline] = useState(0);
  const [featured, setFeatured] = useState(null);

  const load = async () => {
    const [d, g, r] = await Promise.all([
      api.get("/dashboard").catch(() => ({ data: null })),
      api.get("/gamification/me").catch(() => ({ data: { xp: 0, level: 1, level_title: "", xp_to_next: 0, level_progress: 0, streak: 0 } })),
      api.get("/books/me/recommendations").catch(() => ({ data: [] })),
    ]);
    if (d.data) setData(d.data);
    if (g.data) setGam(g.data);
    setRecs(Array.isArray(r.data) ? r.data : []);
    api.get("/quests/today").then((r) => setQuests(r.data.quests || [])).catch(() => {});
    api.get("/presence/online").then((r) => setOnline(r.data.online || 0)).catch(() => {});
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
  useEffect(() => { api.get("/site/featured-book").then((r) => setFeatured(r.data?.book || null)).catch(() => {}); }, []);

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
     Dashboard · main things only (mobile-first single column in
     DOM order; at xl a 12-col bento: hero + stats full width,
     main stack 8, rail 4). Every book/project/event title is
     truncated to one line so long names can never stretch a card.
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

        {/* ============ 2 · Stats bento band · one panel, hairline dividers ============ */}
        <FadeUp className="min-w-0 xl:col-span-12">
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100">
              <StatCell icon={Trophy} label="ترتيبك الوطني" value={`#${data.national_rank}`} color="#D97706" sub={data.school_rank ? `مدرستك: #${data.school_rank}` : ""} />
              <StatCell icon={BookOpen} label="كتب مقروءة" value={data.books_read} color="#2563EB" />
              <StatCell icon={Crown} label="تصنيف الشطرنج" value={data.chess_rating} color="#0A192F" />
              <StatCell icon={MessagesSquare} label="مشاركاتك" value={data.posts} color="#059669" />
            </div>
          </div>
        </FadeUp>

        {/* ============ Book of the week ============ */}
        {featured && (
          <FadeUp className="min-w-0 xl:col-span-12">
            <section data-testid="featured-book-card" className="relative overflow-hidden rounded-3xl ft-hero-gradient grain text-white p-5 sm:p-6">
              <div className="pointer-events-none absolute -top-16 left-1/4 w-72 h-72 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 26%, transparent)" }} />
              <div className="relative flex flex-col sm:flex-row items-start gap-5">
                <Link to={`/books/${featured.id}`} className="shrink-0 mx-auto sm:mx-0">
                  <BookCover book={featured} className="w-28 sm:w-32 aspect-[3/4] rounded-2xl shadow-2xl ring-1 ring-white/30" imgClassName="w-28 sm:w-32 aspect-[3/4] object-cover rounded-2xl" />
                </Link>
                <div className="min-w-0 flex-1 text-center sm:text-start w-full">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-slate-950 px-3 py-1 text-[11px] font-black shadow-lg shadow-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5" /> كتاب الأسبوع
                  </span>
                  <h2 className="mt-3 font-head text-2xl sm:text-3xl font-black leading-snug">{featured.title}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-300">{featured.author}</p>
                  {featured.description && <p className="mt-2.5 text-sm leading-relaxed text-slate-300 line-clamp-2 max-w-2xl">{featured.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {featured.pages > 0 && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">{featured.pages} صفحة</span>}
                    {featured.category && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">{featured.category}</span>}
                    {featured.rating_count > 0 && <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold">★ {Number(featured.rating_avg).toFixed(1)} · {featured.rating_count} تقييم</span>}
                  </div>
                </div>
                <Link to={`/books/${featured.id}`} className="pressable shrink-0 mx-auto sm:mx-0 sm:self-center inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-5 py-3 text-sm font-black shadow-xl transition hover:-translate-y-0.5 min-h-[48px]">
                  <BookOpen className="w-4.5 h-4.5" /> ابدأ القراءة
                </Link>
              </div>
            </section>
          </FadeUp>
        )}

        {/* ============ 3 · Main column (8 on xl): continue, starter, recommended ============ */}
        <div className="min-w-0 xl:col-span-8 flex flex-col gap-5 sm:gap-6">
          <ContinueRail data={data} />
          <StarterChecklist data={data} />
          {recs.length > 0 && (
            <FadeUp>
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
                <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Sparkles className="w-5 h-5 ft-text-accent shrink-0" /> موصى لك</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recs.slice(0, 4).map((b) => (
                    <Link key={b.id} to={`/books/${b.id}`} className="group min-w-0">
                      <BookCover book={b} className="w-full aspect-[3/4] rounded-xl ft-shadow" imgClassName="w-full aspect-[3/4] object-cover rounded-xl ft-shadow group-hover:scale-[1.03] transition-transform" />
                      <div className="mt-2 text-sm font-medium text-slate-800 truncate">{b.title}</div>
                      <div className="text-xs text-slate-400 truncate">{b.author}</div>
                    </Link>
                  ))}
                </div>
              </section>
            </FadeUp>
          )}
        </div>

        {/* ============ 4 · Rail column (4 on xl): quests, my projects, events ============ */}
        <div className="min-w-0 xl:col-span-4 flex flex-col gap-5 sm:gap-6">
          <FadeUp className="min-w-0">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
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

          <FadeUp className="min-w-0">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-head font-bold text-slate-800 flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl grid place-items-center bg-rose-50 text-rose-600 shrink-0"><Rocket className="w-5 h-5" /></span>
                  مشاريعي
                </h3>
                <Link to="/ventures" className="text-xs text-rose-600 font-medium flex items-center gap-0.5 shrink-0">الكل <ArrowLeft className="w-3 h-3" /></Link>
              </div>
              {(data.my_ventures || []).length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-4">لم تنضم لأي مشروع بعد<br /><Link to="/ventures" className="text-rose-600 font-medium">اكتشف المشاريع 🚀</Link></div>
              ) : (data.my_ventures || []).slice(0, 4).map((v) => (
                <Link key={v.id} to={`/ventures/${v.id}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors min-w-0">
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 truncate">{v.title}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${VSTATUS_C[v.status] || "bg-slate-100 text-slate-600"}`}>{VSTATUS[v.status] || v.status}</span>
                </Link>
              ))}
            </section>
          </FadeUp>

          <FadeUp className="min-w-0">
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4 min-w-0"><Calendar className="w-5 h-5 text-amber-600 shrink-0" /> فعاليات قادمة</h2>
              {(data.upcoming_events || []).length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا فعاليات حالياً</div> : data.upcoming_events.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block min-w-0 p-3 rounded-xl hover:bg-slate-50 border-r-2 border-amber-500 mb-2 bg-slate-50/50 transition-colors">
                  <div className="font-medium text-sm text-slate-800 truncate">{e.title}</div>
                  <div className="text-xs text-slate-400 truncate">{e.date} · {e.mode === "online" ? "عن بُعد" : "حضوري"}</div>
                </Link>
              ))}
            </section>
          </FadeUp>
        </div>

      </div>
    </Layout>
  );
}
