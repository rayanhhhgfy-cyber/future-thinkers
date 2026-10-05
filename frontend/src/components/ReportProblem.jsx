import React, { useRef, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { compressCoverImage, fileToBase64 } from "@/lib/chunkedUpload";
import { Bug, ImagePlus, Send, X } from "lucide-react";

/* «الإبلاغ عن مشكلة» · زر في التذييل يفتح نموذجًا بعنوان ووصف وصورة اختيارية.
   يصل البلاغ إلى سجل الأخطاء عند الإدارة (نفس نظام بلاغات الأخطاء) باسم
   «بلاغ مستخدم» مع اسم المُبلّغ إن كان مسجلًا · حتى يستطيع المشرف مراسلته. */
export default function ReportProblem() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pic, setPic] = useState(null); // { file, url }
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const pick = (f) => {
    if (!f) return;
    if (!String(f.type || "").startsWith("image/")) return toast.error("اختر ملف صورة فقط");
    setPic({ file: f, url: URL.createObjectURL(f) });
  };

  const close = () => {
    setOpen(false);
    setSubject(""); setDescription("");
    if (pic) URL.revokeObjectURL(pic.url);
    setPic(null);
  };

  const submit = async () => {
    const s = subject.trim(), d = description.trim();
    if (s.length < 3) return toast.error("اكتب موضوع المشكلة");
    if (d.length < 5) return toast.error("اشرح المشكلة بجملة أو أكثر");
    setBusy(true);
    try {
      let image = "", image_type = "";
      if (pic) {
        // ضغط الصورة في المتصفح حتى لا تتجاوز حد جسم الطلب
        const c = await fileToBase64(await compressCoverImage(pic.file));
        image = c.b64; image_type = c.type;
      }
      await api.post("/errors/report", {
        message: s,
        subject: s,
        detail: d,
        page: typeof window !== "undefined" ? window.location.pathname : "",
        source: "manual",
        context: "report-a-problem",
        image, image_type,
      });
      toast.success("وصلنا بلاغك · شكرًا لمساعدتنا نطوّر المنصة 🙏");
      close();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="report-problem-open"
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/20 hover:text-white transition-colors">
        <Bug className="w-3.5 h-3.5" /> الإبلاغ عن مشكلة
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={close}>
          <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-[26px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] text-right" dir="rtl" onClick={(e) => e.stopPropagation()} data-testid="report-problem-modal">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-amber-500" />
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-600 text-white">
                <Bug className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-head font-extrabold text-slate-900">الإبلاغ عن مشكلة</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">أخبرنا بما حدث وسنعمل على إصلاحه · يمكنك إرفاق لقطة شاشة لتوضيح المشكلة</p>
              </div>
              <button onClick={close} aria-label="إغلاق" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block mt-5 text-xs font-bold text-slate-600">موضوع المشكلة *</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} autoFocus
              data-testid="report-problem-subject"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm outline-none transition focus:border-rose-400 focus:bg-white"
              placeholder="مثال: زر القراءة لا يعمل في صفحة الكتاب" />

            <label className="block mt-4 text-xs font-bold text-slate-600">اشرح المشكلة *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000}
              data-testid="report-problem-description"
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm leading-relaxed outline-none transition focus:border-rose-400 focus:bg-white"
              placeholder="ماذا كنت تفعل؟ وماذا حدث بدل المتوقع؟" />

            <label className="block mt-4 text-xs font-bold text-slate-600">لقطة شاشة (اختياري)</label>
            {pic ? (
              <div className="relative mt-1.5 overflow-hidden rounded-2xl border border-slate-200">
                <img src={pic.url} alt="لقطة الشاشة المرفقة" className="max-h-44 w-full object-cover" />
                <button onClick={() => { URL.revokeObjectURL(pic.url); setPic(null); }} aria-label="إزالة الصورة"
                  className="absolute top-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} data-testid="report-problem-attach"
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 py-3.5 text-sm font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-600">
                <ImagePlus className="h-4.5 w-4.5" /> إرفاق صورة
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="report-problem-file"
              onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

            <div className="mt-5 flex gap-2">
              <button onClick={close} className="min-h-[44px] flex-1 rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200">إلغاء</button>
              <button onClick={submit} disabled={busy || subject.trim().length < 3 || description.trim().length < 5}
                data-testid="report-problem-submit"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 text-sm font-bold text-white shadow-lg transition hover:bg-rose-700 disabled:opacity-50">
                <Send className="h-4 w-4 -scale-x-100" /> {busy ? "جارٍ الإرسال…" : "إرسال البلاغ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
