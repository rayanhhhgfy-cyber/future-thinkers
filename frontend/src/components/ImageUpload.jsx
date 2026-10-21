import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * ImageUpload — direct photo upload (no URL pasting).
 * Props:
 *   value    — current image URL (string) or empty
 *   onChange — (url: string) called on successful upload
 *   label    — Arabic label shown above
 *   aspect   — "square" (avatar) | "wide" (cover)
 */
export function ImageUpload({ value, onChange, label, aspect = "square", testId }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const isWide = aspect === "wide";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("نوع الملف غير مدعوم — استخدم PNG أو JPEG أو WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة أكبر من 5MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setProgress(0);
    try {
      const { data } = await api.post("/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      onChange(data.url);
      toast.success("تم رفع الصورة بنجاح");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "فشل رفع الصورة");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div data-testid={testId}>
      {label && <div className="text-sm font-bold text-slate-700 mb-2">{label}</div>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer transition-all hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.99] ${
          isWide ? "aspect-[16/9]" : "aspect-square max-w-[200px]"
        }`}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
            <span className="w-12 h-12 rounded-2xl bg-white shadow-sm grid place-items-center">
              <ImagePlus className="w-6 h-6 text-emerald-600" />
            </span>
            <span className="text-xs font-bold text-center">اضغط لاختيار صورة</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <div className="w-3/4 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-600">{progress}%</span>
          </div>
        )}
        {value && !uploading && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            aria-label="إزالة الصورة"
            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-slate-900/70 text-white grid place-items-center hover:bg-rose-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
