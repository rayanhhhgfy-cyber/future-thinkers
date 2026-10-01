import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { toast } from "sonner";
import { ArrowRight, Trash2, Star, MessageSquare, ShieldAlert } from "lucide-react";

function Stars({ value, className = "w-4 h-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${className} ${i <= Math.round(value || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 bg-slate-100 rounded" />
        <div className="h-4 w-20 bg-slate-100 rounded" />
      </div>
      <div className="h-3 w-full bg-slate-100 rounded mb-2" />
      <div className="h-3 w-2/3 bg-slate-100 rounded" />
    </div>
  );
}

export default function BookReviews() {
  const { bookId } = useParams();
  const { hasPerm } = useAuth();
  const nav = useNavigate();
  const allowed = hasPerm("book.edit") || hasPerm("book.delete");
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    if (!allowed) return;
    api.get(`/books/${bookId}`).then((r) => setBook(r.data)).catch(() => setBook(false));
    api.get(`/books/${bookId}/reviews`).then((r) => setReviews(r.data || [])).catch(() => setReviews([]));
  }, [bookId, allowed]);

  const delReview = async (r) => {
    if (!window.confirm(`حذف مراجعة "${r.user_name || "مستخدم"}"؟`)) return;
    try {
      await api.delete(`/books/${bookId}/reviews/${r.id}`);
      toast.success("تم حذف المراجعة");
      setReviews((arr) => arr.filter((x) => x.id !== r.id));
      // refresh book rating stats
      api.get(`/books/${bookId}`).then((res) => setBook(res.data)).catch(() => {});
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (!allowed) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="font-head text-xl font-bold text-slate-800">لا صلاحية لديك</h1>
          <p className="text-slate-400 text-sm mt-2">هذه الصفحة مخصصة لمن يملك صلاحية إدارة الكتب.</p>
          <Button onClick={() => nav("/admin/books")} className="mt-6 rounded-xl">عودة إلى الكتب</Button>
        </div>
      </Layout>
    );
  }

  if (book === null || reviews === null) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-52 rounded-3xl bg-slate-100 animate-pulse mb-8" />
          <div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        </div>
      </Layout>
    );
  }

  if (book === false) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-head text-xl font-bold text-slate-800">الكتاب غير موجود</h1>
          <Button onClick={() => nav("/admin/books")} className="mt-6 rounded-xl">عودة إلى الكتب</Button>
        </div>
      </Layout>
    );
  }

  const avg = book.rating_avg || 0;
  const count = book.rating_count || reviews.length;

  return (
    <Layout>
      {/* hero */}
      <div className="ft-navy-gradient grain text-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <FadeUp>
            <button onClick={() => nav("/admin/books")} className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors mb-5">
              <ArrowRight className="w-4 h-4" /> عودة إلى الكتب
            </button>
          </FadeUp>
          <FadeUp delay={0.08} className="flex flex-col sm:flex-row gap-5 sm:items-center">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-24 h-32 sm:w-28 sm:h-40 object-cover rounded-2xl shadow-2xl shrink-0" />
            ) : (
              <div className="w-24 h-32 sm:w-28 sm:h-40 rounded-2xl bg-white/10 grid place-items-center shrink-0">
                <MessageSquare className="w-10 h-10 text-white/40" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs text-emerald-300 font-medium mb-1">إدارة المراجعات</div>
              <h1 className="font-head text-2xl sm:text-3xl font-extrabold leading-snug">{book.title}</h1>
              <div className="text-slate-300 text-sm mt-1">{book.author}</div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-3.5 py-1.5 text-sm">
                  <Stars value={avg} /> <b>{avg.toFixed(1)}</b>
                </span>
                <span className="text-sm text-slate-300"><b className="text-white">{count}</b> مراجعة</span>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* reviews list */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <div className="font-bold text-slate-700">لا مراجعات بعد</div>
            <p className="text-sm text-slate-400 mt-1">عندما يقيّم الطلاب هذا الكتاب ستظهر مراجعاتهم هنا.</p>
          </div>
        ) : (
          <Stagger className="space-y-4">
            {reviews.map((r) => (
              <Item key={r.id} className="bg-white rounded-2xl border border-slate-100 ft-shadow p-5 hover-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">{r.user_name || "مستخدم"}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("ar-JO", { year: "numeric", month: "long", day: "numeric" }) : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Stars value={r.rating} />
                    <Button size="sm" variant="outline" onClick={() => delReview(r)} className="rounded-lg h-9 w-9 p-0 text-rose-600 border-rose-200" title="حذف المراجعة">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {r.text && <p className="text-sm text-slate-600 leading-relaxed mt-3 bg-slate-50 rounded-xl p-3.5">{r.text}</p>}
              </Item>
            ))}
          </Stagger>
        )}
      </div>
    </Layout>
  );
}
