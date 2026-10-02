import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Heart, Eye, Star, Feather, ScrollText, PenLine, BookOpen, Trash2, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookmarkButton from "@/components/BookmarkButton";
import ReportButton from "@/components/ReportButton";
import { FadeUp, Stagger, Item, EASE } from "@/components/anim";

const TYPES = {
  article: { l: "مقال", icon: ScrollText, g: "from-blue-500 to-indigo-600" },
  poetry: { l: "شعر", icon: Feather, g: "from-rose-500 to-pink-600" },
  essay: { l: "خاطرة", icon: PenLine, g: "from-amber-500 to-orange-600" },
  story: { l: "قصة قصيرة", icon: BookOpen, g: "from-emerald-500 to-teal-600" },
};

function Stars({ value, onRate, size = "w-8 h-8", readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <motion.button
          key={s}
          type="button"
          disabled={readonly}
          whileHover={readonly ? {} : { scale: 1.25, rotate: 12 }}
          whileTap={readonly ? {} : { scale: 0.85 }}
          onClick={() => onRate?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star className={`${size} transition-colors ${(hover || value) >= s ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
        </motion.button>
      ))}
    </div>
  );
}

export default function StudioWork() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [work, setWork] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [myStars, setMyStars] = useState(0);
  const [revText, setRevText] = useState("");
  const [revStars, setRevStars] = useState(5);
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [burst, setBurst] = useState(0);

  const load = async () => {
    try {
      const { data } = await api.get(`/studio/works/${id}`);
      setWork(data); setLiked(!!data.liked); setLikes(data.likes || 0); setMyStars(data.my_stars || 0);
      const r = await api.get(`/studio/works/${id}/reviews`).catch(() => ({ data: [] }));
      setReviews(r.data || []);
      if (data.status === "published") {
        const rel = await api.get("/studio/published", { params: { type: data.type, limit: 4 } }).catch(() => ({ data: { items: [] } }));
        setRelated((rel.data.items || []).filter((w) => w.id !== id).slice(0, 3));
      }
    } catch (e) { toast.error(apiErr(e)); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); window.scrollTo(0, 0); }, [id]);

  const toggleLike = async () => {
    if (!user) return toast.info("سجّل الدخول للإعجاب");
    try {
      const { data } = await api.post(`/studio/works/${id}/like`);
      setLiked(data.liked); setLikes((l) => l + (data.liked ? 1 : -1));
      if (data.liked) setBurst((b) => b + 1);
    } catch (e) { toast.error(apiErr(e)); }
  };

  const submitReview = async () => {
    if (!user) return toast.info("سجّل الدخول لتقييم العمل");
    if (!revText.trim() && revStars === 0) return toast.error("اكتب مراجعتك أو قيّم بالنجوم");
    setSending(true);
    try {
      await api.post(`/studio/works/${id}/reviews`, { stars: revStars, text: revText.trim() });
      toast.success("شكراً! تم نشر تقييمك ⭐");
      setRevText(""); setMyStars(revStars); load();
    } catch (e) { toast.error(apiErr(e)); }
    setSending(false);
  };

  const delReview = async (r) => {
    if (!window.confirm("حذف مراجعتك؟")) return;
    try { await api.delete(`/studio/works/${id}/reviews/${r.id}`); toast.success("حُذفت المراجعة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!work) return <Layout><PageLoader /></Layout>;
  const t = TYPES[work.type] || TYPES.article;
  const TIcon = t.icon;

  return (
    <Layout>
      <div className="relative overflow-hidden">
        {/* hero */}
        <div className={`bg-gradient-to-l ${t.g} relative`}>
          <div className="absolute inset-0 bg-black/25" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pb-20 text-white">
            <button onClick={() => nav("/studio")} className="text-white/70 hover:text-white text-sm flex items-center gap-1.5 mb-6 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للاستوديو
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-xs font-bold">
                <TIcon className="w-3.5 h-3.5" />{t.l}
              </span>
              {(work.rating_count || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/25 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{work.rating_avg} ({work.rating_count})
                </span>
              )}
              <BookmarkButton kind="work" refId={work.id} title={work.title} dark />
              <ReportButton entityType="work" entityId={work.id} className="text-white/50 hover:text-rose-300" />
            </div>
            <h1 className="font-head text-3xl sm:text-5xl font-extrabold leading-tight mb-4">{work.title}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/85 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-white/25 backdrop-blur grid place-items-center font-extrabold">{work.author_name?.trim()?.[0]}</span>
                <span className="font-bold">{work.author_name}</span>
              </span>
              <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{work.views} مشاهدة</span>
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{likes} إعجاب</span>
            </div>
          </motion.div>
          <div className="absolute -bottom-1 left-0 right-0">
            <svg viewBox="0 0 1440 48" className="w-full h-8 sm:h-12 text-slate-50" preserveAspectRatio="none"><path d="M0,48 C360,0 1080,0 1440,48 Z" fill="currentColor" /></svg>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* like bar */}
          <FadeUp>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 ft-shadow p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={toggleLike}
                    className={`w-12 h-12 rounded-2xl grid place-items-center transition-colors ${liked ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-500 hover:bg-rose-100"}`}
                  >
                    <Heart className={`w-6 h-6 ${liked ? "fill-current" : ""}`} />
                  </motion.button>
                  <AnimatePresence>
                    {burst > 0 && (
                      <motion.span key={burst}
                        initial={{ scale: 0.5, opacity: 1, y: 0 }}
                        animate={{ scale: 1.6, opacity: 0, y: -24 }}
                        exit={{ opacity: 0 }}
                        onAnimationComplete={() => setBurst(0)}
                        className="absolute inset-0 grid place-items-center pointer-events-none">
                        <Heart className="w-6 h-6 text-rose-500 fill-current" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{likes} إعجاب</div>
                  <div className="text-xs text-slate-400">{liked ? "أعجبك هذا العمل ❤" : "اضغط لدعم الكاتب"}</div>
                </div>
              </div>
              {myStars > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>تقييمك:</span>
                  <Stars value={myStars} readonly size="w-5 h-5" />
                </div>
              )}
            </div>
          </FadeUp>

          {/* content */}
          <FadeUp delay={0.05}>
            <article className="bg-white rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-10 mb-8">
              <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap leading-[2.2] text-slate-700 font-medium">
                {work.content}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-amber-500">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm text-slate-400">نُشر في استوديو مفكري المستقبل</span>
              </div>
            </article>
          </FadeUp>

          {/* rating + reviews */}
          <FadeUp>
            <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 mb-8">
              <h2 className="font-head text-xl font-extrabold mb-1 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> التقييمات والمراجعات
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {(work.rating_count || 0) > 0 ? `متوسط ${work.rating_avg} من 5 · ${work.rating_count} تقييم` : "كن أول من يقيّم هذا العمل"}
              </p>

              {user && (
                <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                  <div className="font-bold text-sm mb-3">قيّم هذا العمل</div>
                  <Stars value={revStars} onRate={setRevStars} />
                  <Textarea value={revText} onChange={(e) => setRevText(e.target.value)}
                    placeholder="شارك رأيك بالعمل... ما الذي أعجبك؟" className="rounded-xl mt-3 bg-white" rows={3} maxLength={1000} />
                  <Button onClick={submitReview} disabled={sending} className="rounded-xl mt-3 bg-amber-500 hover:bg-amber-600 text-white">
                    <Send className="w-4 h-4 ml-1" /> {sending ? "جارٍ النشر..." : "نشر التقييم"}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">لا مراجعات بعد — رأيك يهم الكاتب!</div>
              ) : (
                <Stagger className="space-y-3">
                  {reviews.map((r) => (
                    <Item key={r.id}>
                      <div className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-amber-200 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white grid place-items-center font-bold text-sm">
                              {r.user_name?.trim()?.[0]}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-slate-800">{r.user_name}</div>
                              <Stars value={r.stars} readonly size="w-3.5 h-3.5" />
                            </div>
                          </div>
                          {user && (r.user_id === user.id) && (
                            <button onClick={() => delReview(r)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {r.text && <p className="text-sm text-slate-600 leading-relaxed mt-1">{r.text}</p>}
                      </div>
                    </Item>
                  ))}
                </Stagger>
              )}
            </section>
          </FadeUp>

          {/* related */}
          {related.length > 0 && (
            <FadeUp>
              <section className="mb-8">
                <h2 className="font-head text-xl font-extrabold mb-4">أعمال مشابهة</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((w) => (
                    <Link key={w.id} to={`/studio/${w.id}`} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
                      <div className="font-bold text-slate-900 line-clamp-1 mb-1">{w.title}</div>
                      <p className="text-sm text-slate-500 line-clamp-2">{w.excerpt}</p>
                      <div className="mt-3 text-xs text-slate-400 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{w.likes}</span>
                        {(w.rating_count || 0) > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{w.rating_avg}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </FadeUp>
          )}
        </div>
      </div>
    </Layout>
  );
}
