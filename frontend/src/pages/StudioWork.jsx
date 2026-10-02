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
        <div className={`bg-gradient-to-l ${t.g} relative overflow-hidden grain`}>
          <div className="absolute inset-0 bg-black/25" />
          <TIcon className="absolute -left-10 -bottom-14 w-64 h-64 sm:w-80 sm:h-80 text-white/10 -rotate-12 pointer-events-none" />
          <TIcon className="absolute right-[6%] top-8 w-16 h-16 sm:w-24 sm:h-24 text-white/10 rotate-12 pointer-events-none animate-float" />
          <Sparkles className="absolute left-[22%] top-10 w-8 h-8 text-white/25 pointer-events-none animate-float" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 right-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pb-20 text-white">
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
            <h1 className="font-head text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.2] mb-6">{work.title}</h1>
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* like bar */}
          <FadeUp>
            <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-3 glass rounded-[1.6rem] border border-white/70 ft-shadow-lg p-4 sm:px-5 mb-6">
              <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>تقييمك:</span>
                  <Stars value={myStars} readonly size="w-5 h-5" />
                </div>
              )}
            </div>
          </FadeUp>

          {/* content */}
          <FadeUp delay={0.05}>
            <article className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 ft-shadow-lg p-6 sm:p-10 lg:p-12 mb-8 overflow-hidden">
              <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l ${t.g}`} />
              <TIcon className="absolute -left-6 -bottom-8 w-36 h-36 text-slate-900/[0.035] -rotate-12 pointer-events-none" />
              <div className="relative prose prose-slate prose-lg max-w-none whitespace-pre-wrap leading-[2.2] text-slate-700 font-medium">
                {work.content}
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
              <h2 className="font-head text-xl sm:text-2xl font-extrabold mb-1 flex items-center gap-2.5 flex-wrap">
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
                    placeholder="شارك رأيك بالعمل... ما الذي أعجبك؟" className="rounded-2xl mt-3 bg-white" rows={3} maxLength={1000} />
                  <Button onClick={submitReview} disabled={sending} className="pressable rounded-full min-h-[48px] px-6 mt-3 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200">
                    <Send className="w-4 h-4 ml-1" /> {sending ? "جارٍ النشر..." : "نشر التقييم"}
                  </Button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">لا مراجعات بعد · رأيك يهم الكاتب!</div>
              ) : (
                <Stagger className="space-y-3">
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

          {/* related */}
          {related.length > 0 && (
            <FadeUp>
              <section className="mb-8">
                <h2 className="font-head text-xl sm:text-2xl font-extrabold mb-5 flex items-center gap-2.5">
                  <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${t.g} grid place-items-center shadow-lg`}><TIcon className="w-5 h-5 text-white" /></span> أعمال مشابهة
                </h2>
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
                  {related.map((w) => {
                    const rt = TYPES[w.type] || TYPES.article;
                    const RIcon = rt.icon;
                    return (
                    <Link key={w.id} to={`/studio/${w.id}`} className="group pressable bg-white rounded-[1.6rem] border border-slate-100 ft-shadow hover-lift overflow-hidden flex flex-col">
                      <div className={`relative h-20 bg-gradient-to-l ${rt.g} shrink-0 overflow-hidden`}>
                        <RIcon className="absolute -left-2 -bottom-5 w-20 h-20 text-white/15 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
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
