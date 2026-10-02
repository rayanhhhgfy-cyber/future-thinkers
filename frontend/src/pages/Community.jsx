import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import { Users, Heart, Send, Trash2, Sparkles, Swords, Handshake, MessageCircle, Flame } from "lucide-react";

const ACT_ICON = { chess_win: Swords, badge: Sparkles, venture_joined: Handshake };
const ACT_DEFAULT = Sparkles;
const ACT_TILE = {
  chess_win: "bg-violet-50",
  badge: "bg-amber-50",
  venture_joined: "bg-sky-50",
};
const ACT_ICON_COLOR = { chess_win: "text-violet-600", badge: "text-amber-500", venture_joined: "text-sky-600" };
const ACT_TILE_DEFAULT = "bg-emerald-50";
const ACT_ICON_COLOR_DEFAULT = "text-emerald-600";

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [feed, setFeed] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadPosts = () => api.get("/feed/posts").then((r) => setPosts(r.data)).catch(() => setPosts([]));
  useEffect(() => {
    loadPosts();
    api.get("/activity/feed", { params: { limit: 25 } }).then((r) => setFeed(r.data?.items || [])).catch(() => {});
  }, []);

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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
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

        <div className="grid lg:grid-cols-[1fr_330px] gap-5 sm:gap-6 items-start">
          <div className="min-w-0">
            {/* composer */}
            <div className="relative overflow-hidden bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-4 sm:p-6 mb-6">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-500" />
              <div className="flex gap-3">
                <span className="shrink-0 rounded-full p-[2px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 self-start shadow-md shadow-emerald-500/25">
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white block" />
                    : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white">{user?.name?.[0]}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000}
                    placeholder="شارك فكرة، كتاباً أنهيته، أو سؤالاً للنقاش…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition resize-none" />
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">{text.length}/1000</span>
                      <span className="hidden sm:block h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                        <span className={`block h-full rounded-full transition-all duration-300 ${text.length > 900 ? "bg-gradient-to-l from-rose-500 to-red-500" : "bg-gradient-to-l from-emerald-500 to-teal-400"}`} style={{ width: `${Math.min(100, text.length / 10)}%` }} />
                      </span>
                    </div>
                    <button onClick={post} disabled={posting} className="pressable inline-flex items-center justify-center gap-1.5 min-h-[44px] px-6 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 disabled:opacity-50 shrink-0">
                      <Send className="w-4 h-4" /> {posting ? "يُنشر…" : "انشر"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* feed heading */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-md shadow-emerald-500/25"><MessageCircle className="w-4 h-4" /></span>
              <h2 className="font-head font-extrabold text-slate-800">أحدث المنشورات</h2>
              {!!posts?.length && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">{posts.length} منشور</span>}
            </div>

            {!posts ? <PageLoader /> : posts.length === 0 ? (
              <EmptyState icon={Users} title="الساحة هادئة" desc="كن أول من يشارك منشوراً" />
            ) : (
              <div className="space-y-4">
                {posts.map((p, i) => (
                  <article key={p.id} className="animate-fade-up bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-4 sm:p-6" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${p.user_id}`} className="shrink-0 rounded-full p-[2px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-md shadow-emerald-500/20 transition hover:scale-105">
                        {p.user_avatar
                          ? <img src={p.user_avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white block" />
                          : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white">{p.user_name?.[0]}</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${p.user_id}`} className="font-head font-bold text-[15px] text-slate-800 hover:text-emerald-700 transition-colors block truncate">{p.user_name}</Link>
                        <span className="inline-flex items-center mt-1 text-[11px] font-semibold text-slate-400 bg-slate-50 ring-1 ring-slate-100 rounded-full px-2 py-0.5">{timeAgo(p.created_at)}</span>
                      </div>
                      {(p.user_id === user?.id) && (
                        <button onClick={() => remove(p)} aria-label="حذف المنشور" className="pressable shrink-0 w-10 h-10 grid place-items-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <p className="mt-3.5 text-[15px] text-slate-700 leading-loose whitespace-pre-wrap">{p.text}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => like(p)} className={`pressable inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full text-xs font-bold ring-1 transition-all ${p.liked ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white ring-rose-300 shadow-md shadow-rose-500/25" : "bg-slate-50 text-slate-500 ring-slate-100 hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-100"}`}>
                        <Heart className={`w-4 h-4 transition-transform duration-200 ${p.liked ? "fill-white text-white scale-110" : ""}`} /> {p.likes}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* activity rail */}
          <aside className="relative overflow-hidden bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 sm:p-6 lg:sticky lg:top-24">
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
                          <p className="text-slate-600 leading-snug"><Link to={`/profile/${a.user_id}`} className="font-bold text-slate-800 hover:text-emerald-700 transition-colors">{a.user_name}</Link> {a.text}</p>
                          <span className="text-[11px] text-slate-300">{timeAgo(a.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
