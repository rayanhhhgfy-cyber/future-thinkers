import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import { Users, Heart, Send, Trash2, Sparkles, Swords, Handshake } from "lucide-react";

const ACT_ICON = { chess_win: Swords, badge: Sparkles, venture_joined: Handshake };
const ACT_DEFAULT = Sparkles;

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(null);
  const [feed, setFeed] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadPosts = () => api.get("/feed/posts").then((r) => setPosts(r.data)).catch(() => setPosts([]));
  useEffect(() => {
    loadPosts();
    api.get("/activity/feed", { params: { limit: 25 } }).then((r) => setFeed(r.data || [])).catch(() => {});
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient px-6 py-8 sm:px-10 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold"><Users className="w-3.5 h-3.5" /> حيّ النادي الاجتماعي</span>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-4">ساحة المجتمع</h1>
          <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl">شارك أفكارك وقراءاتك، واحتفل بإنجازات زملائك من كل مدارس المملكة.</p>
          <Users className="absolute -left-6 -bottom-8 w-44 h-44 text-white/10" />
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div>
            <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-5">
              <div className="flex gap-3">
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  : <span className="w-11 h-11 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold shrink-0">{user?.name?.[0]}</span>}
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000}
                  placeholder="شارك فكرة، كتاباً أنهيته، أو سؤالاً للنقاش…"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition resize-none" />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-slate-300">{text.length}/1000</span>
                <button onClick={post} disabled={posting} className="pressable inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
                  <Send className="w-4 h-4" /> {posting ? "يُنشر…" : "انشر"}
                </button>
              </div>
            </div>

            {!posts ? <PageLoader /> : posts.length === 0 ? (
              <EmptyState icon={Users} title="الساحة هادئة" desc="كن أول من يشارك منشوراً" />
            ) : (
              <div className="space-y-4">
                {posts.map((p) => (
                  <article key={p.id} className="animate-fade-up bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <Link to={`/users/${p.user_id}`} className="shrink-0">
                        {p.user_avatar
                          ? <img src={p.user_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : <span className="w-10 h-10 rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold">{p.user_name?.[0]}</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/users/${p.user_id}`} className="font-bold text-sm text-slate-800 hover:text-emerald-700">{p.user_name}</Link>
                        <div className="text-[11px] text-slate-400">{timeAgo(p.created_at)}</div>
                      </div>
                      {(p.user_id === user?.id) && (
                        <button onClick={() => remove(p)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <p className="mt-3 text-slate-700 leading-relaxed whitespace-pre-wrap">{p.text}</p>
                    <button onClick={() => like(p)} className={`pressable mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${p.liked ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-500"}`}>
                      <Heart className={`w-4 h-4 ${p.liked ? "fill-rose-500 text-rose-500" : ""}`} /> {p.likes}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 lg:sticky lg:top-24">
            <h3 className="font-head font-bold text-slate-800 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> نبض النادي الآن</h3>
            {feed.length === 0 ? <p className="text-sm text-slate-400">لا نشاط بعد</p> : (
              <div className="space-y-3.5">
                {feed.slice(0, 15).map((a) => {
                  const Icon = ACT_ICON[a.kind] || ACT_DEFAULT;
                  return (
                    <div key={a.id} className="flex gap-2.5 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-slate-50 grid place-items-center shrink-0"><Icon className="w-4 h-4 text-emerald-600" /></span>
                      <div className="min-w-0">
                        <p className="text-slate-600 leading-snug"><Link to={`/users/${a.user_id}`} className="font-bold text-slate-800 hover:text-emerald-700">{a.user_name}</Link> {a.text}</p>
                        <span className="text-[11px] text-slate-300">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
