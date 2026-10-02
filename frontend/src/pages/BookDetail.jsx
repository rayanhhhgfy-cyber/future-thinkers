import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Heart, BookOpen, ArrowRight, Eye, Bookmark, BookmarkCheck, Clock, Check, ListPlus, MessageSquare, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useBookmarks } from "@/components/BookmarkButton";
import BookCover from "@/components/BookCover";
import ReportButton from "@/components/ReportButton";
import { PlaylistPicker } from "@/components/library/PlaylistPicker";

const BookReader = lazy(() => import("./reader/BookReader"));

function ReaderLoader() {
  return (
    <div className="fixed inset-0 z-[80] bg-[#0b1020] text-white flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <BookOpen className="w-10 h-10 mx-auto text-indigo-300 animate-pulse" />
        <p className="mt-3 text-sm text-slate-300">جارٍ تجهيز القارئ…</p>
      </div>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reading, setReading] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const { map: savedMap, toggle: toggleSaved } = useBookmarks();
  const isSaved = savedMap.has(`book:${id}`);

  const load = async () => {
    const [b, r] = await Promise.all([api.get(`/books/${id}`), api.get(`/books/${id}/reviews`)]);
    setBook(b.data); setReviews(r.data);
    api.get(`/books/${id}/comments`).then((res) => setComments(res.data.items || [])).catch(() => {});
  };
  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/books/${id}/comments`, { text: commentText.trim() });
      setComments((prev) => [data, ...prev]);
      setCommentText("");
    } catch (e) { toast.error(apiErr(e)); }
  };
  const deleteComment = async (cid) => {
    try {
      await api.delete(`/books/${id}/comments/${cid}`);
      setComments((prev) => prev.filter((c) => c.id !== cid));
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); }, [id]);

  const toggleFav = async () => {
    if (!user) return nav("/login");
    const { data } = await api.post(`/books/${id}/favorite`);
    setBook((b) => ({ ...b, is_favorite: data.favorite, favorites_count: b.favorites_count + (data.favorite ? 1 : -1) }));
  };

  const toggleLater = async () => {
    if (!user) return nav("/login");
    try {
      const { data } = await api.post(`/books/${id}/later`);
      setBook((b) => ({ ...b, is_later: data.later }));
      toast.success(data.later ? "أُضيف إلى «أكمل لاحقاً» ⏰" : "أُزيل من «أكمل لاحقاً»");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const saveProgress = async (percent, page = 1) => {
    await api.post(`/books/${id}/progress`, { page, percent });
    setBook((b) => ({ ...b, my_progress: percent }));
    if (percent >= 100) toast.success("أكملت الكتاب! +نقاط خبرة 🎉");
  };

  const submitReview = async () => {
    if (!rating) return toast.error("اختر تقييماً");
    try { await api.post(`/books/${id}/review`, { rating, text: reviewText }); toast.success("شكراً لتقييمك"); setReviewText(""); setRating(0); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!book) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl lg:max-w-7xl xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => nav(-1)} className="pressable min-h-[44px] text-slate-500 hover:text-slate-800 text-sm mb-6 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="grid md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)] gap-8 xl:gap-12 items-start">
          <div className="md:sticky md:top-24">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-3 rounded-[2rem] ft-bg-soft blur-xl" aria-hidden />
              <BookCover book={book} className="relative w-full aspect-[3/4] rounded-3xl ft-shadow-lg ring-1 ring-slate-900/10" imgClassName="w-full aspect-[3/4] object-cover rounded-3xl" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-3xl bg-gradient-to-t from-slate-950/35 to-transparent" />
              {book.my_progress > 0 && (
                <div className="absolute inset-x-4 bottom-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white"><span>تقدّمك</span><span>{book.my_progress}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/30"><div className="h-full rounded-full ft-grad-bar" style={{ width: `${book.my_progress}%` }} /></div>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              <Button data-testid="read-book-btn" onClick={() => (user ? setReading(true) : nav("/login"))} className="w-full rounded-xl ft-btn-primary text-white shadow-lg h-12 text-base font-extrabold"><BookOpen className="w-4 h-4 ml-1" /> {book.my_progress > 0 ? "متابعة القراءة" : "اقرأ الآن"}</Button>
              <Button data-testid="favorite-btn" onClick={toggleFav} variant="outline" className="w-full rounded-xl h-11"><Heart className={`w-4 h-4 ml-1 ${book.is_favorite ? "fill-rose-500 text-rose-500" : ""}`} /> {book.is_favorite ? "في المفضلة" : "أضف للمفضلة"}</Button>
              <Button data-testid="later-btn" onClick={toggleLater} variant="outline" className={`w-full rounded-xl h-11 ${book.is_later ? "border-amber-300 bg-amber-50 text-amber-700" : ""}`}>
                {book.is_later ? <Check className="w-4 h-4 ml-1 text-amber-600" /> : <Clock className="w-4 h-4 ml-1" />}
                {book.is_later ? "في قائمة «أكمل لاحقاً»" : "أكمل لاحقاً"}
              </Button>
              {user && (
                <Button data-testid="playlist-btn" onClick={() => setShowPlaylists(true)} variant="outline" className="w-full rounded-xl h-11">
                  <ListPlus className="w-4 h-4 ml-1" /> أضف إلى قائمة
                </Button>
              )}
              {user && (
                <Button onClick={() => toggleSaved("book", id, book.title)} variant="outline" className="w-full rounded-xl h-11">
                  {isSaved ? <BookmarkCheck className="w-4 h-4 ml-1 text-amber-500" /> : <Bookmark className="w-4 h-4 ml-1" />}
                  {isSaved ? "محفوظ في عناصرك" : "احفظ في عناصر محفوظة"}
                </Button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm ft-text-accent ft-bg-soft w-fit px-3 py-1 rounded-full mb-3 ring-1 ft-ring-accent font-bold">{book.category}</div>
            <h1 className="font-head text-3xl sm:text-4xl xl:text-[2.8rem] font-extrabold text-slate-900 leading-[1.2]">{book.title}</h1>
            <p className="text-slate-500 mt-2 lg:text-lg">تأليف: {book.author}</p>
            <div className="mt-4 h-1 w-24 rounded-full ft-grad-bar" />
            <div className="flex flex-wrap items-center gap-2.5 mt-5 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 font-bold ft-shadow"><Star className="w-4 h-4 text-amber-500 fill-amber-500" />{book.rating_avg || "·"} <span className="font-semibold text-slate-400">({book.rating_count})</span></span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 font-bold ft-shadow"><Eye className="w-4 h-4 ft-text-accent" />{book.views} قراءة</span>
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 font-bold ft-shadow"><Heart className="w-4 h-4 text-rose-500" />{book.favorites_count}</span>
            </div>
            <p className="mt-6 text-slate-700 leading-relaxed lg:text-[1.05rem] lg:leading-loose">{book.description}</p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[["الصفحات", book.pages || "·"], ["سنة النشر", book.year || "·"], ["اللغة", book.language], ["الفئة", book.age]].map(([k, v]) => (
                <div key={k} className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow"><div className="text-slate-400 text-xs font-semibold">{k}</div><div className="font-bold text-slate-800 mt-1">{v}</div></div>
              ))}
            </div>

            {/* Reviews */}
            <div className="mt-10 rounded-[1.75rem] border border-slate-100 bg-white p-5 ft-shadow sm:p-7">
              <h2 className="font-head font-bold text-xl mb-4">التقييمات والمراجعات</h2>
              {user && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-5">
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => <button key={s} data-testid={`rate-star-${s}`} onClick={() => setRating(s)}><Star className={`w-6 h-6 ${s <= rating ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} /></button>)}
                  </div>
                  <Textarea data-testid="review-text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="شاركنا رأيك في الكتاب…" className="rounded-xl bg-white" />
                  <Button data-testid="submit-review-btn" onClick={submitReview} className="mt-3 rounded-xl ft-btn-primary text-white shadow-md">أرسل التقييم</Button>
                </div>
              )}
              {reviews.length === 0 ? <p className="text-slate-400 text-sm">لا توجد مراجعات بعد. كن أول المقيّمين!</p> : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="flex gap-3">
                      <Avatar className="w-9 h-9"><AvatarFallback className="bg-slate-200 text-slate-600 text-xs">{r.user_name?.[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-semibold text-sm text-slate-800">{r.user_name}</span><span className="flex">{[1,2,3,4,5].map((s)=><Star key={s} className={`w-3.5 h-3.5 ${s<=r.rating?"text-amber-500 fill-amber-500":"text-slate-200"}`}/>)}</span></div>
                        {r.text && <p className="text-sm text-slate-600 mt-1">{r.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reader discussion */}
            <div className="mt-6 rounded-[1.75rem] border border-slate-100 bg-white p-5 ft-shadow sm:p-7">
              <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 ft-text-accent" /> نقاش القرّاء ({comments.length})</h2>
              {user ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5 flex items-start gap-3">
                  <Avatar className="w-9 h-9 shrink-0"><AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{user.name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="ماذا أعجبك في الكتاب؟ سؤال يراودك؟" className="rounded-xl bg-white" rows={2} />
                    <Button onClick={submitComment} disabled={!commentText.trim()} className="mt-2 rounded-xl bg-slate-900 hover:bg-slate-800">
                      <Send className="w-4 h-4 ml-1" /> انشر في النقاش
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-5">سجّل دخولك للانضمام إلى نقاش القرّاء.</p>
              )}
              {comments.length === 0 ? <p className="text-slate-400 text-sm">لا تعليقات بعد · ابدأ النقاش!</p> : (
                <div className="space-y-4">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3 group">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" /> : (
                        <Avatar className="w-9 h-9 shrink-0"><AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{c.user_name?.[0]}</AvatarFallback></Avatar>
                      )}
                      <div className="flex-1 bg-slate-50 rounded-2xl rounded-tr-sm px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{c.user_name}</span>
                          <span className="text-[11px] text-slate-400">{String(c.created_at || "").slice(0, 10)}</span>
                          {user && c.user_id === user.id && (
                            <button onClick={() => deleteComment(c.id)} className="mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500" aria-label="حذف التعليق"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                          {user && c.user_id !== user.id && <span className="mr-auto"><ReportButton entityType="comment" entityId={c.id} /></span>}
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {reading && (
        <Suspense fallback={<ReaderLoader />}>
          <BookReader
            book={book}
            pdfUrl={book.pdf_url}
            onClose={() => setReading(false)}
            onProgress={saveProgress}
            initialPercent={book.my_progress || 0}
          />
        </Suspense>
      )}
      {showPlaylists && (
        <PlaylistPicker bookId={id} bookTitle={book.title} onClose={() => setShowPlaylists(false)} />
      )}
    </Layout>
  );
}
