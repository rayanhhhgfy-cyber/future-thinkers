import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Heart, Eye, Star, Feather, ScrollText, PenLine, BookOpen, Trash2, Send, Sparkles, MessageSquare } from "lucide-react";
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
  const [comments, setComments] = useState([]);
  const [commentsOn, setCommentsOn] = useState(false);
  const [cText, setCText] = useState("");
  const [cPosting, setCPosting] = useState(false);

  const normComments = (d) => (Array.isArray(d) ? d : (d?.items || d?.comments || []));
  const loadComments = async () => {
    try {
      const cm = await api.get(`/studio/works/${id}/comments`);
      setComments(normComments(cm.data)); setCommentsOn(true);
    } catch { setCommentsOn(false); }
  };

  const postComment = async () => {
    if (!user) return toast.info("سجّل الدخول للتعليق");
    if (!cText.trim()) return;
    setCPosting(true);
    try {
      await api.post(`/studio/works/${id}/comments`, { text: cText.trim() });
      setCText("");
      toast.success("نُشر تعليقك ✍️");
      loadComments();
    } catch (e) { toast.error(apiErr(e)); }
    setCPosting(false);
  };

  const delComment = async (c) => {
    if (!window.confirm("حذف تعليقك؟")) return;
    try {
      await api.delete(`/studio/works/${id}/comments/${c.id}`);
      setComments((cs) => cs.filter((x) => x.id !== c.id));
      toast.success("حُذف التعليق");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const cName = (c) => c.user_name || c.author_name || c.name || "قارئ";
  const cBody = (c) => c.text || c.body || "";
  const cMine = (c) => !!user && (c.mine || String(c.user_id ?? c.author_id ?? "") === String(user.id));
  const cWhen = (c) => {
    const d = c.created_at || c.at || c.date;
    if (!d) return "";
    try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }); } catch { return ""; }
  };

  const load = async () => {
    try {
      const { data } = await api.get(`/studio/works/${id}`);
      setWork(data); setLiked(!!data.liked); setLikes(data.likes || 0); setMyStars(data.my_stars || 0);
      const r = await api.get(`/studio/works/${id}/reviews`).catch(() => ({ data: [] }));
      setReviews(r.data || []);
      loadComments();
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
        <div className={`bg-gradient-to-l ${t.g} relative overflow-hidden grain`}>
          <div className="absolute inset-0 bg-black/25" />
          <TIcon className="absolute -left-10 -bottom-14 w-64 h-64 sm:w-80 sm:h-80 lg:w-[26rem] lg:h-[26rem] text-white/10 -rotate-12 pointer-events-none" />
          <TIcon className="absolute right-[6%] top-8 w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 text-white/10 rotate-12 pointer-events-none animate-float" />
          <Sparkles className="absolute left-[22%] top-10 w-8 h-8 lg:w-10 lg:h-10 text-white/25 pointer-events-none animate-float" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="relative max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-10 pb-16 sm:pb-20 lg:pt-14 lg:pb-24 text-white">
            <button onClick={() => nav("/studio")} className="pressable inline-flex min-h-[44px] items-center text-white/80 hover:text-white text-sm gap-1.5 mb-5 px-3 -mr-3 rounded-full hover:bg-white/10 transition-colors">
              <ArrowRight className="w-4 h-4" /> عودة للاستوديو
            </button>
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/25 text-xs font-bold">
                <TIcon className="w-3.5 h-3.5" />{t.l}
              </span>
              {(work.rating_count || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-black/25 backdrop-blur-md ring-1 ring-white/15 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{work.rating_avg} ({work.rating_count})
                </span>
              )}
              <BookmarkButton kind="work" refId={work.id} title={work.title} dark />
              <ReportButton entityType="work" entityId={work.id} className="text-white/50 hover:text-rose-300" />
            </div>
            <h1 className="font-head text-3xl sm:text-5xl lg:text-[3.4rem] xl:text-6xl font-extrabold leading-[1.2] xl:leading-[1.15] mb-6">{work.title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 text-sm">
              <span className="inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25">
                <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center font-extrabold">{work.author_name?.trim()?.[0]}</span>
                <span className="font-bold">{work.author_name}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 text-white/90"><Eye className="w-4 h-4" />{work.views} مشاهدة</span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 text-white/90"><Heart className="w-4 h-4" />{likes} إعجاب</span>
            </div>
          </motion.div>
          <div className="absolute -bottom-1 left-0 right-0">
            <svg viewBox="0 0 1440 48" className="w-full h-8 sm:h-12 text-slate-50" preserveAspectRatio="none"><path d="M0,48 C360,0 1080,0 1440,48 Z" fill="currentColor" /></svg>
          </div>
        </div>

        <div className="max-w-4xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 sm:py-10 lg:py-12 xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10 xl:items-start">
          {/* like bar */}
          <FadeUp className="xl:col-start-2 xl:row-start-1">
            <div className="relative flex flex-wrap items-center justify-between gap-3 glass rounded-[1.6rem] border border-white/70 ft-shadow-lg p-4 sm:px-5 mb-6 xl:mb-0 xl:p-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={toggleLike}
                    className={`w-12 h-12 rounded-2xl grid place-items-center transition-all ${liked ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-300" : "bg-rose-50 text-rose-500 hover:bg-rose-100"}`}
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
                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                  <span>تقييمك:</span>
                  <Stars value={myStars} readonly size="w-5 h-5" />
                </div>
              )}
            </div>
          </FadeUp>

          <main className="min-w-0 xl:col-start-1 xl:row-start-1">

          {/* content */}
          <FadeUp delay={0.05}>
            <article className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 ft-shadow-lg p-6 sm:p-10 lg:p-14 xl:px-16 xl:py-14 mb-8 overflow-hidden">
              <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l ${t.g}`} />
              <TIcon className="absolute -left-6 -bottom-8 w-36 h-36 lg:w-44 lg:h-44 text-slate-900/[0.035] -rotate-12 pointer-events-none" />
              <div className="relative prose prose-slate prose-lg lg:prose-xl max-w-none whitespace-pre-wrap leading-[2.2] lg:leading-[2.3] text-slate-700 font-medium">
                <span className={`float-right ml-4 mb-2 font-head text-[3.4rem] lg:text-6xl leading-[0.9] font-extrabold bg-gradient-to-br ${t.g} bg-clip-text text-transparent select-none`} aria-hidden="true">{work.content?.trim()?.[0] || ""}</span>{(work.content || "").trimStart().slice(1) || work.content}
              </div>
              <div className="relative mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.g} text-white grid place-items-center font-extrabold shadow-lg shrink-0`}>{work.author_name?.trim()?.[0]}</span>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-800 text-sm truncate">{work.author_name}</div>
                  <div className="flex items-center gap-1.5 text-amber-500 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs text-slate-400">نُشر في استوديو مفكري المستقبل</span>
                  </div>
                </div>
              </div>
            </article>
          </FadeUp>

          {/* rating + reviews */}
          <FadeUp>
            <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 ft-shadow-lg p-6 sm:p-8 lg:p-10 mb-8">
              <h2 className="font-head text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold mb-1 flex items-center gap-2.5 flex-wrap">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center shadow-lg shadow-amber-200"><Star className="w-5 h-5 text-white fill-white" /></span> التقييمات والمراجعات
                {reviews.length > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{reviews.length} مراجعة</span>}
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                {(work.rating_count || 0) > 0 ? `متوسط ${work.rating_avg} من 5 · ${work.rating_count} تقييم` : "كن أول من يقيّم هذا العمل"}
              </p>

              {user && (
                <div className="relative bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-100 rounded-[1.4rem] p-5 mb-6 overflow-hidden">
                  <Star className="absolute -left-3 -top-3 w-20 h-20 text-amber-200/40 fill-amber-200/40 -rotate-12 pointer-events-none" />
                  <div className="relative">
                  <div className="font-extrabold text-sm mb-3 text-slate-800">قيّم هذا العمل</div>
                  <Stars value={revStars} onRate={setRevStars} />
                  <Textarea value={revText} onChange={(e) => setRevText(e.target.value)}
                    placeholder="شارك رأيك بالعمل... ما الذي أعجبك؟" className="rounded-2xl mt-3 bg-white" rows={3} />
                  <Button onClick={submitReview} disabled={sending} className="pressable rounded-full min-h-[48px] px-6 mt-3 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200">
                    <Send className="w-4 h-4 ml-1" /> {sending ? "جارٍ النشر..." : "نشر التقييم"}
                  </Button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">لا مراجعات بعد · رأيك يهم الكاتب!</div>
              ) : (
                <Stagger className="space-y-3 xl:space-y-0 xl:grid xl:grid-cols-2 xl:gap-4">
                  {reviews.map((r) => (
                    <Item key={r.id}>
                      <div className="flex gap-3 p-4 rounded-[1.4rem] border border-slate-100 bg-white hover:border-amber-200 hover:shadow-lg hover:shadow-amber-100/70 transition-all">
                        <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white grid place-items-center font-extrabold text-sm shrink-0 shadow-lg shadow-violet-200 ring-2 ring-white self-start">
                          {r.user_name?.trim()?.[0]}
                        </span>
                        <div className="flex-1 min-w-0 bg-slate-50/80 rounded-2xl rounded-tr-md px-4 py-3.5 ring-1 ring-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-extrabold text-sm text-slate-800">{r.user_name}</span>
                              <Stars value={r.stars} readonly size="w-3.5 h-3.5" />
                            </div>
                            {user && (r.user_id === user.id) && (
                              <button onClick={() => delReview(r)} className="pressable text-slate-300 hover:text-rose-500 transition-colors p-1 shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {r.text && <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{r.text}</p>}
                        </div>
                      </div>
                    </Item>
                  ))}
                </Stagger>
              )}
            </section>
          </FadeUp>

          {/* comments */}
          {commentsOn && (
            <FadeUp>
              <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 ft-shadow-lg p-6 sm:p-8 lg:p-10 mb-8">
                <h2 className="font-head text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold mb-1 flex items-center gap-2.5 flex-wrap">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-200"><MessageSquare className="w-5 h-5 text-white" /></span> تعليقات القرّاء
                  {comments.length > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 ring-1 ring-violet-100">{comments.length} تعليق</span>}
                </h2>
                <p className="text-sm text-slate-400 mb-6">شارك الكاتب انطباعك وتساؤلاتك حول العمل</p>

                {user ? (
                  <div className="flex gap-3 mb-6">
                    <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white grid place-items-center font-extrabold text-sm shrink-0 shadow-lg shadow-violet-200 ring-2 ring-white self-start">{user.name?.trim()?.[0]}</span>
                    <div className="flex-1 min-w-0">
                      <Textarea value={cText} onChange={(e) => setCText(e.target.value)}
                        placeholder="اكتب تعليقك على هذا العمل..." className="rounded-2xl bg-slate-50/80 focus:bg-white" rows={3} />
                      <Button onClick={postComment} disabled={cPosting || !cText.trim()} className="pressable rounded-full min-h-[44px] px-5 mt-2.5 bg-gradient-to-l from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-200 disabled:opacity-50">
                        <Send className="w-4 h-4 ml-1" /> {cPosting ? "جارٍ النشر..." : "نشر التعليق"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => nav("/login")} className="pressable w-full mb-6 flex items-center gap-3 p-4 rounded-[1.4rem] border border-dashed border-violet-200 bg-violet-50/50 text-sm font-bold text-violet-700 hover:bg-violet-50 transition-colors">
                    <MessageSquare className="w-5 h-5 shrink-0" /> سجّل الدخول لتشارك في التعليقات
                  </button>
                )}

                {comments.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">لا تعليقات بعد · كن أول من يعلّق!</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c, i) => (
                      <div key={c.id || i} className="flex gap-3 animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                        <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${t.g} text-white grid place-items-center font-extrabold text-sm shrink-0 shadow-md ring-2 ring-white self-start`}>{cName(c).trim()?.[0]}</span>
                        <div className="flex-1 min-w-0 bg-violet-50/60 rounded-2xl rounded-tr-md px-4 py-3.5 ring-1 ring-violet-100/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-800">{cName(c)}</span>
                              {cMine(c) && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-600 text-white">أنت</span>}
                              {cWhen(c) && <span className="text-[11px] text-slate-400 font-semibold">{cWhen(c)}</span>}
                            </div>
                            {cMine(c) && (
                              <button onClick={() => delComment(c)} className="pressable text-slate-300 hover:text-rose-500 transition-colors p-1 shrink-0" aria-label="حذف التعليق">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed mt-1.5 whitespace-pre-wrap">{cBody(c)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </FadeUp>
          )}
          </main>

          {/* related */}
          {related.length > 0 && (
            <FadeUp className="xl:col-span-2">
              <section className="mb-8 xl:mt-12">
                <h2 className="font-head text-xl sm:text-2xl font-extrabold mb-5 flex items-center gap-2.5">
                  <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${t.g} grid place-items-center shadow-lg`}><TIcon className="w-5 h-5 text-white" /></span> أعمال مشابهة
                </h2>
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 xl:gap-6">
                  {related.map((w) => {
                    const rt = TYPES[w.type] || TYPES.article;
                    const RIcon = rt.icon;
                    return (
                    <Link key={w.id} to={`/studio/${w.id}`} className="group pressable bg-white rounded-[1.6rem] border border-slate-100 ft-shadow hover-lift overflow-hidden flex flex-col lg:transition-all lg:duration-300 lg:hover:-translate-y-1.5 lg:hover:shadow-2xl lg:hover:shadow-violet-200/60 lg:hover:border-violet-200">
                      <div className={`relative h-20 lg:h-24 bg-gradient-to-l ${rt.g} shrink-0 overflow-hidden`}>
                        <RIcon className="absolute -left-2 -bottom-5 w-20 h-20 lg:w-24 lg:h-24 text-white/15 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/25 text-white text-[11px] font-bold">
                          <RIcon className="w-3 h-3" />{rt.l}
                        </span>
                      </div>
                      <div className="p-4 sm:p-5 flex flex-col flex-1">
                        <div className="font-head font-extrabold text-slate-900 line-clamp-1 mb-1.5 group-hover:text-violet-700 transition-colors">{w.title}</div>
                        <p className="text-sm text-slate-500 line-clamp-3 flex-1 leading-relaxed">{w.excerpt}</p>
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                          <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${rt.g} ring-2 ring-white shadow text-white grid place-items-center font-extrabold text-[10px] shrink-0`}>{w.author_name?.trim()?.[0]}</span>
                          <span className="font-bold text-slate-500 truncate flex-1">{w.author_name}</span>
                          <span className="flex items-center gap-1 shrink-0"><Heart className="w-3.5 h-3.5" />{w.likes}</span>
                          {(w.rating_count || 0) > 0 && <span className="flex items-center gap-1 shrink-0"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{w.rating_avg}</span>}
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              </section>
            </FadeUp>
          )}
        </div>
      </div>
    </Layout>
  );
}
