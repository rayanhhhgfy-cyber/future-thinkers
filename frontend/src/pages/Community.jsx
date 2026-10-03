import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import { Users, Heart, Send, Trash2, Sparkles, Swords, Handshake, MessageCircle, Flame, BookOpen, Trophy, CalendarDays, LayoutDashboard, Bell, BellRing, ChevronDown, Crown, Medal } from "lucide-react";

const ACT_ICON = { chess_win: Swords, badge: Sparkles, venture_joined: Handshake };
const ACT_DEFAULT = Sparkles;
const ACT_TILE = {
  chess_win: "bg-violet-50",
  badge: "bg-amber-50",
  venture_joined: "bg-sky-50",
};
const ACT_ICON_COLOR = { chess_win: "text-violet-600", badge: "text-amber-500", venture_joined: "text-sky-600" };
const ACT_TILE_DEFAULT = "ft-bg-soft";
const ACT_ICON_COLOR_DEFAULT = "ft-text-accent";

const SORTS = [
  { v: "newest", label: "الأحدث", heading: "أحدث المنشورات" },
  { v: "active", label: "الأكثر نشاطاً", heading: "الأكثر نشاطاً" },
  { v: "unanswered", label: "بلا ردود", heading: "منشورات تنتظر تفاعلك" },
];

const fmtNum = (n) => Number(n || 0).toLocaleString("en-US");

const normContrib = (d) => {
  const arr = Array.isArray(d) ? d : d?.items || d?.contributors || [];
  return arr.map((c) => ({
    id: c.id || c.user_id,
    name: c.name || c.user_name || "عضو",
    avatar: c.avatar_url || c.avatar || c.user_avatar || null,
    score: c.score ?? c.points ?? c.xp ?? 0,
  })).filter((c) => c.id);
};

const RANK_TILE = [
  "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md",
  "bg-gradient-to-br from-orange-300 to-amber-500 text-white shadow-md",
];

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [feed, setFeed] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [sort, setSort] = useState("newest");
  const [contributors, setContributors] = useState(null);
  const [showContrib, setShowContrib] = useState(false);

  const loadPosts = (s) => api.get("/feed/posts", { params: { sort: s || sort } }).then((r) => setPosts(r.data)).catch(() => setPosts([]));
  useEffect(() => {
    loadPosts("newest");
    api.get("/activity/feed", { params: { limit: 25 } }).then((r) => setFeed(r.data?.items || [])).catch(() => {});
    api.get("/community/contributors").then((r) => setContributors(normContrib(r.data))).catch(() => setContributors([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeSort = (s) => {
    if (s === sort) return;
    setSort(s);
    setPosts(null);
    loadPosts(s);
  };

  const post = async () => {
    if (text.trim().length < 2) return toast.error("اكتب شيئاً أولاً");
    setPosting(true);
    try { await api.post("/feed/posts", { text: text.trim() }); setText(""); loadPosts(); toast.success("نُشر في الساحة 🎉"); }
    catch (e) { toast.error(apiErr(e)); }
    setPosting(false);
  };
  const like = async (p) => {
    try {
      const { data } = await api.post(`/feed/posts/${p.id}/like`);
      setPosts((arr) => arr.map((x) => x.id === p.id ? { ...x, liked: data.liked, likes: x.likes + (data.liked ? 1 : -1) } : x));
    } catch (e) { toast.error(apiErr(e)); }
  };
  const remove = async (p) => {
    if (!window.confirm("حذف المنشور؟")) return;
    try { await api.delete(`/feed/posts/${p.id}`); setPosts((arr) => arr.filter((x) => x.id !== p.id)); } catch (e) { toast.error(apiErr(e)); }
  };
  const followPost = async (p) => {
    if (!user) return;
    const next = !p.following;
    setPosts((arr) => arr.map((x) => x.id === p.id ? { ...x, following: next } : x));
    try {
      const { data } = await api.post(`/community/posts/${p.id}/follow`);
      const following = typeof data?.following === "boolean" ? data.following : next;
      setPosts((arr) => arr.map((x) => x.id === p.id ? { ...x, following, followers_count: typeof data?.followers_count === "number" ? data.followers_count : x.followers_count } : x));
      toast.success(following ? "تتابع هذا الموضوع الآن · سنعلمك بالردود الجديدة 🔔" : "ألغيت متابعة الموضوع");
    } catch (e) {
      setPosts((arr) => arr.map((x) => x.id === p.id ? { ...x, following: !next } : x));
      toast.error(apiErr(e));
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1400px] mx-auto px-4 lg:px-6 py-6 sm:py-8">
        {/* hero */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-5 py-8 sm:px-10 sm:py-11 mb-6 sm:mb-8 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-16 w-80 h-80 rounded-full bg-teal-300/15 blur-3xl" />
          <MessageCircle className="pointer-events-none absolute -left-8 -bottom-12 w-48 h-48 sm:w-60 sm:h-60 text-white/[0.07] -rotate-12" />
          <Users className="pointer-events-none absolute left-10 -top-8 w-28 h-28 text-white/[0.05] rotate-12 hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold shadow-lg">
              <Users className="w-3.5 h-3.5" /> حيّ النادي الاجتماعي
            </span>
            <h1 className="font-head text-4xl sm:text-5xl font-extrabold text-white mt-4 leading-tight">ساحة المجتمع</h1>
            <p className="text-white/75 text-sm sm:text-base mt-2.5 max-w-xl leading-relaxed">شارك أفكارك وقراءاتك، واحتفل بإنجازات زملائك من كل مدارس المملكة.</p>
            {(!!posts?.length || feed.length > 0) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {!!posts?.length && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <MessageCircle className="w-3.5 h-3.5" /> {posts.length} منشور في الساحة
                  </span>
                )}
                {feed.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <Flame className="w-3.5 h-3.5" /> {feed.length} نشاط حديث
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* top contributors · mobile strip */}
        {!!contributors?.length && (
          <div className="lg:hidden mb-5 sm:mb-6 relative overflow-hidden bg-white rounded-[1.75rem] border border-slate-100 ft-shadow-lg">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-yellow-500 to-amber-500" />
            <button onClick={() => setShowContrib((v) => !v)} aria-expanded={showContrib} className="pressable w-full flex items-center gap-2.5 px-4 py-3.5 min-h-[52px] text-start">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25 shrink-0"><Trophy className="w-4 h-4" /></span>
              <span className="font-head font-extrabold text-sm text-slate-800 flex-1">أبرز المساهمين</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">{contributors.length}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showContrib ? "rotate-180" : ""}`} />
            </button>
            {showContrib && (
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-fade-up">
                {contributors.slice(0, 10).map((c, i) => (
                  <Link key={c.id} to={`/profile/${c.id}`} className="pressable shrink-0 flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50/80 ring-1 ring-slate-100 px-3 py-3 w-[92px]">
                    <span className="relative">
                      {c.avatar
                        ? <img src={c.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow" />
                        : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shadow">{c.name?.[0]}</span>}
                      <span className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full grid place-items-center text-[10px] font-black ring-2 ring-white ${RANK_TILE[i] || "bg-slate-100 text-slate-500"}`}>{i === 0 ? <Crown className="w-3 h-3" /> : i + 1}</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center">{c.name}</span>
                    <span className="text-[10px] font-extrabold text-amber-600">{fmtNum(c.score)} نقطة</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_330px] xl:grid-cols-[290px_minmax(0,1fr)_340px] gap-5 sm:gap-6 items-start">
          {/* desktop profile rail */}
          <aside className="hidden xl:block">
            <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg p-6">
              <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
              {user ? (
                <>
                  <div className="flex flex-col items-center text-center">
                    <span className="rounded-full p-[3px] ft-icon-tile shadow-lg">
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-white block" />
                        : <span className="w-16 h-16 rounded-full ft-navy-gradient text-white grid place-items-center font-head text-xl font-extrabold ring-2 ring-white">{user.name?.[0]}</span>}
                    </span>
                    <div className="mt-3 font-head text-lg font-extrabold text-slate-900">{user.name}</div>
                    <Link to={`/profile/${user.id}`} className="pressable mt-3 inline-flex min-h-[44px] items-center rounded-full ft-btn-primary px-5 text-xs font-bold text-white shadow-md">عرض ملفي الشخصي</Link>
                  </div>
                  <div className="mt-6 space-y-1.5 border-t border-slate-100 pt-5">
                    {[
                      { to: "/dashboard", label: "لوحتي", icon: LayoutDashboard },
                      { to: "/library", label: "المكتبة", icon: BookOpen },
                      { to: "/leaderboard", label: "المتصدرون", icon: Trophy },
                      { to: "/clubs", label: "الأندية", icon: Users },
                      { to: "/events", label: "الفعاليات", icon: CalendarDays },
                    ].map((l) => (
                      <Link key={l.to} to={l.to} className="pressable flex min-h-[44px] items-center gap-3 rounded-2xl px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 ft-hover-text-accent">
                        <l.icon className="h-4 w-4 ft-text-accent" /> {l.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full ft-icon-tile shadow-lg"><Users className="h-6 w-6" /></span>
                  <div className="mt-3 font-head text-base font-extrabold text-slate-900">انضم إلى الساحة</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">سجّل دخولك لتشارك أفكارك وتتفاعل مع زملائك.</p>
                  <Link to="/login" className="pressable mt-4 inline-flex min-h-[44px] items-center rounded-full ft-btn-primary px-6 text-xs font-bold text-white shadow-md">تسجيل الدخول</Link>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            {/* composer */}
            <div className="relative overflow-hidden bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-4 sm:p-6 mb-6">
              <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
              <div className="flex gap-3">
                <span className="shrink-0 rounded-full p-[2px] ft-icon-tile self-start shadow-md">
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white block" />
                    : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white">{user?.name?.[0]}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000}
                    placeholder="شارك فكرة، كتاباً أنهيته، أو سؤالاً للنقاش…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 ft-ring-accent focus:bg-white transition resize-none" />
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">{text.length}/1000</span>
                      <span className="hidden sm:block h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                        <span className={`block h-full rounded-full transition-all duration-300 ${text.length > 900 ? "bg-gradient-to-l from-rose-500 to-red-500" : "ft-grad-bar"}`} style={{ width: `${Math.min(100, text.length / 10)}%` }} />
                      </span>
                    </div>
                    <button onClick={post} disabled={posting} className="pressable inline-flex items-center justify-center gap-1.5 min-h-[44px] px-6 rounded-2xl ft-btn-primary text-sm font-bold shadow-lg disabled:opacity-50 shrink-0">
                      <Send className="w-4 h-4" /> {posting ? "يُنشر…" : "انشر"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* feed heading + sort */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><MessageCircle className="w-4 h-4" /></span>
              <h2 className="font-head font-extrabold text-slate-800">{SORTS.find((s) => s.v === sort)?.heading}</h2>
              {!!posts?.length && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent">{posts.length} منشور</span>}
              <span className="flex-1" />
              <div data-testid="community-sort" className="flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-200/80 p-1 shadow-sm w-full sm:w-auto">
                {SORTS.map((s) => (
                  <button key={s.v} onClick={() => changeSort(s.v)} aria-pressed={sort === s.v}
                    className={`pressable flex-1 sm:flex-none rounded-full px-4 min-h-[38px] text-xs font-bold transition-all ${sort === s.v ? "ft-btn-primary text-white shadow-md" : "text-slate-500 hover:text-slate-800"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {!posts ? <PageLoader /> : posts.length === 0 ? (
              <EmptyState icon={Users}
                title={sort === "unanswered" ? "الكل حظي بردود" : "الساحة هادئة"}
                desc={sort === "unanswered" ? "لا منشورات بانتظار رد الآن · جرّب تبويب الأحدث" : "كن أول من يشارك منشوراً"} />
            ) : (
              <div className="space-y-4">
                {posts.map((p, i) => (
                  <article key={p.id} className="animate-fade-up bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-4 sm:p-6" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${p.user_id}`} className="shrink-0 rounded-full p-[2px] ft-icon-tile shadow-md transition hover:scale-105">
                        {p.user_avatar
                          ? <img src={p.user_avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white block" />
                          : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white">{p.user_name?.[0]}</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${p.user_id}`} className="font-head font-bold text-[15px] text-slate-800 ft-hover-text-accent transition-colors block truncate">{p.user_name}</Link>
                        <span className="inline-flex items-center mt-1 text-[11px] font-semibold text-slate-400 bg-slate-50 ring-1 ring-slate-100 rounded-full px-2 py-0.5">{timeAgo(p.created_at)}</span>
                      </div>
                      {(p.user_id === user?.id) && (
                        <button onClick={() => remove(p)} aria-label="حذف المنشور" className="pressable shrink-0 w-10 h-10 grid place-items-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <p className="mt-3.5 text-[15px] text-slate-700 leading-loose whitespace-pre-wrap">{p.text}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button onClick={() => like(p)} className={`pressable inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-bold ring-1 transition-all ${p.liked ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white ring-rose-300 shadow-md shadow-rose-500/25" : "bg-slate-50 text-slate-500 ring-slate-100 hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-100"}`}>
                        <Heart className={`w-4 h-4 transition-transform duration-200 ${p.liked ? "fill-white text-white scale-110" : ""}`} /> {p.likes}
                      </button>
                      {user && p.user_id !== user.id && (
                        <button data-testid={`follow-post-${p.id}`} onClick={() => followPost(p)} aria-pressed={!!p.following}
                          className={`pressable inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-bold ring-1 transition-all ${p.following ? "bg-gradient-to-l from-amber-400 to-orange-500 text-white ring-amber-300 shadow-md shadow-amber-500/25" : "bg-slate-50 text-slate-500 ring-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:ring-amber-200"}`}>
                          {p.following ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                          {p.following ? "متابَع" : "متابعة الموضوع"}
                          {typeof p.followers_count === "number" && p.followers_count > 0 && <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${p.following ? "bg-white/25" : "bg-amber-100 text-amber-600"}`}>{p.followers_count}</span>}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* side rail: activity + top contributors */}
          <div className="space-y-5 sm:space-y-6 min-w-0">
          <aside className="relative overflow-hidden bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 sm:p-6">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-orange-400 to-amber-500" />
            <h3 className="font-head font-extrabold text-slate-800 mb-5 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Sparkles className="w-4 h-4" /></span>
              نبض النادي الآن
            </h3>
            {feed.length === 0 ? <p className="text-sm text-slate-400">لا نشاط بعد</p> : (
              <div className="relative">
                <span className="pointer-events-none absolute right-[17px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-200 via-slate-100 to-transparent" />
                <div className="space-y-4">
                  {feed.slice(0, 15).map((a) => {
                    const Icon = ACT_ICON[a.kind] || ACT_DEFAULT;
                    return (
                      <div key={a.id} className="relative flex gap-3 text-sm">
                        <span className={`relative z-10 w-9 h-9 rounded-xl ring-4 ring-white grid place-items-center shrink-0 shadow ${ACT_TILE[a.kind] || ACT_TILE_DEFAULT}`}><Icon className={`w-4 h-4 ${ACT_ICON_COLOR[a.kind] || ACT_ICON_COLOR_DEFAULT}`} /></span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-slate-600 leading-snug"><Link to={`/profile/${a.user_id}`} className="font-bold text-slate-800 ft-hover-text-accent transition-colors">{a.user_name}</Link> {a.text}</p>
                          <span className="text-[11px] text-slate-300">{timeAgo(a.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* top contributors · desktop rail */}
          {!!contributors?.length && (
            <aside data-testid="community-contributors" className="hidden lg:block relative overflow-hidden bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 sm:p-6">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-yellow-500 to-amber-500" />
              <h3 className="font-head font-extrabold text-slate-800 mb-2 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Trophy className="w-4 h-4" /></span>
                أبرز المساهمين
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">أكثر الأعضاء نشاطاً وتفاعلاً في الساحة</p>
              <div className="space-y-1.5">
                {contributors.slice(0, 8).map((c, i) => (
                  <Link key={c.id} to={`/profile/${c.id}`} className={`pressable flex items-center gap-3 rounded-2xl px-2.5 py-2 min-h-[52px] transition ${i === 0 ? "bg-amber-50/80 ring-1 ring-amber-100" : "hover:bg-slate-50"}`}>
                    <span className={`w-8 h-8 rounded-full grid place-items-center text-xs font-black shrink-0 ring-1 ${RANK_TILE[i] || "bg-slate-50 text-slate-400 ring-slate-100"}`}>{i === 0 ? <Crown className="w-4 h-4" /> : i + 1}</span>
                    {c.avatar
                      ? <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow shrink-0" />
                      : <span className="w-10 h-10 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shadow shrink-0">{c.name?.[0]}</span>}
                    <span className="flex-1 min-w-0">
                      <span className="block font-head font-bold text-sm text-slate-800 truncate">{c.name}</span>
                      <span className="block text-[10px] text-slate-400 font-bold">{i === 0 ? "نجم الساحة" : i === 1 ? "مساهم ذهبي" : i === 2 ? "مساهم نشيط" : "مساهم"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100 text-[11px] font-extrabold shrink-0">
                      <Medal className="w-3 h-3" /> {fmtNum(c.score)}
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
