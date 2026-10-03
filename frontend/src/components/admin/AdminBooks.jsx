import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Stagger, Item, FadeUp } from "@/components/anim";
import BookCover from "@/components/BookCover";
import {
  BookOpen, Upload, Search, PenLine, Trash2, MessageSquare, Star, Eye,
  CheckCircle2, Hourglass, XCircle, LibraryBig, FileUp, ImagePlus, X,
} from "lucide-react";
import { startChunkedUpload, uploadChunks, completeChunkedUpload, fileToBase64, compressCoverImage, CHUNK_THRESHOLD, MAX_PDF_SIZE } from "@/lib/chunkedUpload";

/* الكتب · إدارة مكتبة المنصة
   نفس نقاط النهاية والصلاحيات ونفس منطق الرفع المجزأ وحوار التعديل والمراجعات. */

const CATEGORIES = [
  ["general", "عام"], ["novels", "روايات"], ["culture", "ثقافة"],
  ["science", "علوم"], ["selfdev", "تطوير ذات"], ["kids", "أطفال"],
];
const CAT_LABEL = Object.fromEntries(CATEGORIES);
const STATUS_LABEL = { approved: "معتمد", pending: "معلّق", rejected: "مرفوض" };
const STATUS_STYLE = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};
const STATUS_DOT = { approved: "bg-emerald-500", pending: "bg-amber-500", rejected: "bg-rose-500" };
function Section({ title, icon: Icon, children, action }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2">
          {Icon && <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 grid place-items-center mb-3">
        <LibraryBig className="w-8 h-8 text-slate-300" />
      </div>
      <div className="font-bold text-slate-600 text-sm">{text}</div>
      <p className="text-xs text-slate-400 mt-1">جرّب تعديل البحث أو ارفع كتاباً جديداً من الأعلى</p>
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(value || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

function ProgressBar({ pct, label }) {
  if (!pct) return null;
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-gradient-to-l from-emerald-500 to-teal-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-slate-500 text-center font-medium">{label} {pct}%</div>
    </div>
  );
}

export default function AdminBooks() {
  const { hasPerm } = useAuth();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editProgress, setEditProgress] = useState(0);
  const [form, setForm] = useState({ title: "", author: "", category: "general", description: "" });
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPdf, setEditPdf] = useState(null);
  const [editCover, setEditCover] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // حوار المراجعات
  const [revBook, setRevBook] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [revStats, setRevStats] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/books", { params: { q: q || undefined, status, limit: 100 } });
      setBooks(data.items || []); setTotal(data.total || 0);
    } catch { setBooks([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const upload = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) return toast.error("العنوان والمؤلف مطلوبان");
    if (!pdf) return toast.error("اختر ملف PDF");
    if (pdf.size > MAX_PDF_SIZE) return toast.error("حجم ملف الـ PDF يتجاوز الحد الأقصى 100MB");
    setUploading(true);
    setUploadProgress(0);
    try {
      let data;
      if (pdf.size > CHUNK_THRESHOLD) {
        // ملفات كبيرة: رفع مجزأ قابل للاستئناف (حتى 100MB)
        const { upload_id, chunk_size, total_parts } = await startChunkedUpload(pdf);
        await uploadChunks(pdf, upload_id, chunk_size, total_parts, (done, totalParts) =>
          setUploadProgress(Math.round((done / totalParts) * 100)));
        let cover_b64 = null, cover_ct = null;
        if (cover) {
          const c = await fileToBase64(await compressCoverImage(cover));
          cover_b64 = c.b64; cover_ct = c.type;
        }
        data = await completeChunkedUpload(upload_id, "book_create", {
          title: form.title, author: form.author, category: form.category,
          description: form.description, cover_b64, cover_ct,
        });
      } else {
        const fd = new FormData();
        fd.append("title", form.title); fd.append("author", form.author);
        fd.append("category", form.category); fd.append("description", form.description);
        fd.append("pdf", pdf);
        if (cover) fd.append("cover", await compressCoverImage(cover));
        ({ data } = await api.post("/books", fd));
      }
      toast.success(data.status === "approved" ? "تم رفع الكتاب ونشره مباشرة 📚" : "تم رفع الكتاب");
      setForm({ title: "", author: "", category: "general", description: "" });
      setPdf(null); setCover(null);
      load();
    } catch (err) { toast.error(apiErr(err)); } finally { setUploading(false); setUploadProgress(0); }
  };

  const del = async (b) => {
    if (!window.confirm(`حذف "${b.title}" نهائياً؟`)) return;
    try { await api.delete(`/books/${b.id}`); toast.success("تم حذف الكتاب"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const openEdit = async (b) => {
    try {
      const { data } = await api.get(`/books/${b.id}`);
      setEditing(data);
      setEditForm({
        title: data.title || "", author: data.author || "", category: data.category || "general",
        description: data.description || "", language: data.language || "العربية",
        pages: data.pages || "", year: data.year || "", publisher: data.publisher || "",
        age: data.age || "عام", tags: (data.tags || []).join(", "),
      });
      setEditPdf(null); setEditCover(null);
    } catch { toast.error("تعذر تحميل بيانات الكتاب"); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.author.trim()) return toast.error("العنوان والمؤلف مطلوبان");
    if (editPdf && editPdf.size > MAX_PDF_SIZE) return toast.error("حجم ملف الـ PDF يتجاوز الحد الأقصى 100MB");
    setSavingEdit(true);
    setEditProgress(0);
    try {
      if (editPdf && editPdf.size > CHUNK_THRESHOLD) {
        // استبدال ملف PDF كبير: رفع مجزأ ثم حفظ بيانات الكتاب
        const { upload_id, chunk_size, total_parts } = await startChunkedUpload(editPdf);
        await uploadChunks(editPdf, upload_id, chunk_size, total_parts, (done, totalParts) =>
          setEditProgress(Math.round((done / totalParts) * 100)));
        await completeChunkedUpload(upload_id, "book_replace", { book_id: editing.id });
        const fd = new FormData();
        ["title", "author", "category", "description", "language", "publisher", "age", "tags"].forEach((k) => fd.append(k, editForm[k] ?? ""));
        if (editForm.pages !== "" && editForm.pages != null) fd.append("pages", editForm.pages);
        if (editForm.year !== "" && editForm.year != null) fd.append("year", editForm.year);
        if (editCover) fd.append("cover", await compressCoverImage(editCover));
        await api.patch(`/books/${editing.id}`, fd);
      } else {
        const fd = new FormData();
        ["title", "author", "category", "description", "language", "publisher", "age", "tags"].forEach((k) => fd.append(k, editForm[k] ?? ""));
        if (editForm.pages !== "" && editForm.pages != null) fd.append("pages", editForm.pages);
        if (editForm.year !== "" && editForm.year != null) fd.append("year", editForm.year);
        if (editPdf) fd.append("pdf", editPdf);
        if (editCover) fd.append("cover", await compressCoverImage(editCover));
        await api.patch(`/books/${editing.id}`, fd);
      }
      toast.success("تم حفظ التعديلات ✅");
      setEditing(null); load();
    } catch (err) { toast.error(apiErr(err)); } finally { setSavingEdit(false); setEditProgress(0); }
  };

  const openReviews = async (b) => {
    setRevBook(b); setReviews(null); setRevStats(null);
    try {
      const [bk, rv] = await Promise.all([
        api.get(`/books/${b.id}`).catch(() => null),
        api.get(`/books/${b.id}/reviews`).catch(() => null),
      ]);
      if (bk) setRevStats(bk.data);
      setReviews(rv?.data || []);
    } catch { setReviews([]); }
  };

  const delReview = async (r) => {
    if (!window.confirm(`حذف مراجعة "${r.user_name || "مستخدم"}"؟`)) return;
    try {
      await api.delete(`/books/${revBook.id}/reviews/${r.id}`);
      toast.success("تم حذف المراجعة");
      setReviews((arr) => (arr || []).filter((x) => x.id !== r.id));
      // تحديث إحصائيات التقييم
      api.get(`/books/${revBook.id}`).then((res) => setRevStats(res.data)).catch(() => {});
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const counts = {
    approved: books.filter((b) => b.status === "approved").length,
    pending: books.filter((b) => b.status === "pending").length,
    rejected: books.filter((b) => b.status === "rejected").length,
  };

  const stats = [
    { k: "all", l: "كل الكتب", v: total, icon: LibraryBig, bg: "bg-slate-900", ring: "hover:border-slate-300" },
    { k: "approved", l: "معتمدة", v: counts.approved, icon: CheckCircle2, bg: "bg-emerald-500", ring: "hover:border-emerald-300" },
    { k: "pending", l: "بانتظار الاعتماد", v: counts.pending, icon: Hourglass, bg: "bg-amber-500", ring: "hover:border-amber-300" },
    { k: "rejected", l: "مرفوضة", v: counts.rejected, icon: XCircle, bg: "bg-rose-500", ring: "hover:border-rose-300" },
  ];

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-3xl text-white p-5 sm:p-7" data-testid="admin-books-hero">
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <LibraryBig className="w-3.5 h-3.5" /> مكتبة المنصة
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">إدارة الكتب</h2>
              <p className="text-white/70 text-xs sm:text-sm mt-1.5 font-medium">ارفع كتباً جديدة · عدّل البيانات والأغلفة والملفات · راجع تقييمات الطلاب</p>
            </div>
            <div className="text-left shrink-0">
              <div className="font-head font-black text-3xl sm:text-4xl leading-none tabular-nums">{total.toLocaleString("en-US")}</div>
              <div className="text-[11px] text-white/70 mt-1 font-medium">كتاب في المكتبة</div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* شريط إحصائيات · ينقلك للتصفية */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Item key={s.k}>
            <button
              type="button"
              onClick={() => setStatus(s.k)}
              data-testid={`admin-books-stat-${s.k}`}
              className={`pressable w-full text-right bg-white rounded-3xl border p-4 transition-colors ${s.ring} ${status === s.k ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-100 ft-shadow"}`}
            >
              <span className={`w-10 h-10 rounded-2xl ${s.bg} text-white grid place-items-center mb-2.5 shadow`}>
                <s.icon className="w-5 h-5" />
              </span>
              <span className="block font-head font-black text-2xl text-slate-900 leading-none tabular-nums">{(s.v || 0).toLocaleString("en-US")}</span>
              <span className="block text-[11px] font-bold text-slate-400 mt-1.5">{s.l}</span>
            </button>
          </Item>
        ))}
      </Stagger>
      <p className="-mt-2 text-[11px] text-slate-400 font-medium px-1">الأعداد حسب الحالة تُحسب من الكتب المعروضة حالياً · اضغط أي بطاقة للتصفية</p>

      {/* رفع كتاب جديد */}
      <Section title="رفع كتاب جديد" icon={FileUp}>
        <form onSubmit={upload} className="grid sm:grid-cols-2 gap-3.5">
          <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" placeholder="عنوان الكتاب" /></div>
          <div><Label>المؤلف *</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" placeholder="اسم المؤلف" /></div>
          <div>
            <Label>التصنيف</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ملف PDF *</Label>
            <label className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 min-h-[44px] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 truncate flex-1">{pdf ? pdf.name : "اختر ملف PDF · حتى 100MB"}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdf(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div>
            <Label>صورة الغلاف</Label>
            <label className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 min-h-[44px] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
              <ImagePlus className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 truncate flex-1">{cover ? cover.name : "اختر صورة غلاف · اختياري"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1.5 bg-slate-50 focus:bg-white" rows={2} placeholder="نبذة قصيرة عن الكتاب" /></div>
          <div className="sm:col-span-2 space-y-3">
            <Button type="submit" disabled={uploading} className="pressable rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[46px] px-6 w-full sm:w-auto">
              <Upload className="w-4 h-4 ml-1.5" /> {uploading ? "جارٍ الرفع..." : "رفع الكتاب"}
            </Button>
            {uploading && <ProgressBar pct={uploadProgress} label="جارٍ رفع الملف…" />}
          </div>
        </form>
      </Section>

      {/* كل الكتب */}
      <Section title={`كل الكتب (${total})`} icon={BookOpen}>
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعنوان أو المؤلف..." className="rounded-xl pr-10 min-h-[44px] bg-slate-50 focus:bg-white" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="rounded-xl sm:w-44 min-h-[44px] bg-slate-50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem><SelectItem value="approved">معتمدة</SelectItem>
              <SelectItem value="pending">معلّقة</SelectItem><SelectItem value="rejected">مرفوضة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {books.length === 0 ? <EmptyState text="لا كتب مطابقة" /> : (
          <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {books.map((b) => (
              <Item key={b.id} className="group bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover:border-emerald-200 transition-colors">
                <div className="flex gap-3.5 p-4 pb-0">
                  <BookCover book={b} className="w-16 h-[5.5rem] rounded-xl object-cover shrink-0 shadow" imgClassName="w-full h-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-head font-extrabold text-slate-800 leading-snug line-clamp-2">{b.title}</div>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLE[b.status] || "bg-slate-50 text-slate-600 border-slate-100"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] || "bg-slate-400"}`} />
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate font-medium">{b.author}{b.uploader_name ? ` · رفع: ${b.uploader_name}` : ""}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{CAT_LABEL[b.category] || b.category || "عام"}</span>
                      {(b.rating_avg > 0) && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <Stars value={b.rating_avg} /> {Number(b.rating_avg).toFixed(1)} <span className="text-slate-400 font-medium">({b.rating_count || 0})</span>
                        </span>
                      )}
                      {(b.views > 0) && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium"><Eye className="w-3.5 h-3.5" />{b.views}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4 mt-auto">
                  {hasPerm("book.edit") && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="pressable rounded-xl h-11 text-xs sm:text-sm">
                        <PenLine className="w-4 h-4 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReviews(b)} data-testid={`admin-books-reviews-${b.id}`} className="pressable rounded-xl h-11 text-xs sm:text-sm">
                        <MessageSquare className="w-4 h-4 ml-1" /> المراجعات
                      </Button>
                    </>
                  )}
                  {hasPerm("book.delete") && (
                    <Button size="sm" variant="outline" onClick={() => del(b)} className={`pressable rounded-xl h-11 text-xs sm:text-sm text-rose-600 border-rose-200 hover:bg-rose-50 ${hasPerm("book.edit") ? "" : "col-span-3"}`}>
                      <Trash2 className="w-4 h-4 ml-1" /> حذف
                    </Button>
                  )}
                </div>
              </Item>
            ))}
          </Stagger>
        )}
      </Section>

      {/* حوار التعديل */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-head font-extrabold">تعديل الكتاب</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="grid sm:grid-cols-2 gap-3.5">
            <div><Label>العنوان *</Label><Input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>المؤلف *</Label><Input value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div>
              <Label>التصنيف</Label>
              <Select value={editForm.category || "general"} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>اللغة</Label><Input value={editForm.language || ""} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>عدد الصفحات</Label><Input type="number" min="0" value={editForm.pages ?? ""} onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>سنة النشر</Label><Input type="number" min="0" value={editForm.year ?? ""} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>دار النشر</Label><Input value={editForm.publisher || ""} onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>الفئة العمرية</Label><Input value={editForm.age || ""} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div className="sm:col-span-2"><Label>الوسوم (افصل بفاصلة)</Label><Input value={editForm.tags || ""} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="rounded-xl mt-1.5 bg-slate-50 focus:bg-white" rows={3} /></div>
            <div>
              <Label>استبدال ملف PDF <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالي)</span></Label>
              <label className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 min-h-[44px] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate flex-1">{editPdf ? editPdf.name : "اختر ملفاً جديداً"}</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setEditPdf(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <Label>استبدال الغلاف <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالي)</span></Label>
              <label className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 min-h-[44px] cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                <ImagePlus className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 truncate flex-1">{editCover ? editCover.name : "اختر غلافاً جديداً"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditCover(e.target.files?.[0] || null)} />
              </label>
            </div>
          </form>
          {savingEdit && <div className="mt-3"><ProgressBar pct={editProgress} label="جارٍ رفع الملف…" /></div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="pressable rounded-xl min-h-[44px]">إلغاء</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="pressable rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
              {savingEdit ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار المراجعات */}
      <Dialog open={!!revBook} onOpenChange={(o) => !o && setRevBook(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl" data-testid="admin-books-reviews-dialog">
          <DialogHeader>
            <DialogTitle className="font-head font-extrabold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> مراجعات القرّاء
            </DialogTitle>
          </DialogHeader>
          {revBook && (
            <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 border border-slate-100 p-3.5">
              <BookCover book={revBook} className="w-11 h-16 rounded-lg object-cover shrink-0 shadow" imgClassName="w-full h-full object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-head font-extrabold text-slate-800 truncate">{revBook.title}</div>
                <div className="text-xs text-slate-400 font-medium truncate">{revBook.author}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Stars value={revStats?.rating_avg ?? revBook.rating_avg} />
                  <span className="text-xs font-bold text-slate-600">{Number(revStats?.rating_avg ?? revBook.rating_avg ?? 0).toFixed(1)}</span>
                  <span className="text-[11px] text-slate-400 font-medium">({revStats?.rating_count ?? revBook.rating_count ?? reviews?.length ?? 0} مراجعة)</span>
                </div>
              </div>
            </div>
          )}
          {reviews === null ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-4 animate-pulse">
                  <div className="h-4 w-32 bg-slate-100 rounded mb-2.5" />
                  <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-50 grid place-items-center mb-3">
                <MessageSquare className="w-7 h-7 text-slate-300" />
              </div>
              <div className="font-bold text-slate-600 text-sm">لا مراجعات بعد</div>
              <p className="text-xs text-slate-400 mt-1">عندما يقيّم الطلاب هذا الكتاب ستظهر مراجعاتهم هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-100 p-4 hover:border-slate-200 transition-colors" data-testid={`admin-books-review-${r.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-extrabold grid place-items-center shrink-0">{(r.user_name || "؟").trim().charAt(0)}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{r.user_name || "مستخدم"}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("ar-JO", { year: "numeric", month: "long", day: "numeric" }) : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Stars value={r.rating} />
                      <Button size="sm" variant="outline" onClick={() => delReview(r)} data-testid={`admin-books-review-delete-${r.id}`} className="pressable rounded-lg h-9 w-9 p-0 text-rose-600 border-rose-200 hover:bg-rose-50" title="حذف المراجعة">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {r.text && <p className="text-sm text-slate-600 leading-relaxed mt-3 bg-slate-50 rounded-xl p-3.5">{r.text}</p>}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevBook(null)} className="pressable rounded-xl min-h-[44px] w-full sm:w-auto">
              <X className="w-4 h-4 ml-1" /> إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
