import React, { useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import {
  Users, BookOpen, GraduationCap, Download, FileSpreadsheet, Loader2, Info,
} from "lucide-react";

/* تصدير البيانات · نفس التصديرات في ExportPanel السابق:
   GET /admin/export/{users|books|certificates}.csv كملف Blob يُنزَّل فوراً */

const EXPORT_KINDS = [
  {
    k: "users", l: "المستخدمون", icon: Users, c: "#2563EB",
    d: "سجل الحسابات الكامل لاستخدامه في التقارير والمتابعة",
    cols: ["الاسم", "البريد", "الدور", "الحالة", "النقاط", "المستوى", "المدرسة", "المحافظة", "تاريخ التسجيل"],
  },
  {
    k: "books", l: "الكتب", icon: BookOpen, c: "#D97706",
    d: "مكتبة المنصة كاملة ببياناتها الوصفية وحالتها",
    cols: ["العنوان", "المؤلف", "التصنيف", "الحالة", "اللغة", "عدد الصفحات", "الرافع", "تاريخ الرفع"],
  },
  {
    k: "certificates", l: "الشهادات", icon: GraduationCap, c: "#059669",
    d: "كل الشهادات الصادرة عبر المنصة بتواريخ إصدارها",
    cols: ["الطالب", "نوع الشهادة", "المناسبة", "تاريخ الإصدار"],
  },
];

export default function AdminExports() {
  const [busy, setBusy] = useState(null);
  const run = async (kind) => {
    setBusy(kind);
    try {
      const { data } = await api.get(`/admin/export/${kind}.csv`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `future-thinkers-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success("بدأ تنزيل الملف 📥");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-head font-extrabold text-xl text-slate-900 flex items-center gap-2">
          <span className="w-9 h-9 rounded-2xl bg-emerald-600 text-white grid place-items-center"><Download className="w-5 h-5" /></span>
          تصدير البيانات
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">ملفات CSV تُبنى لحظياً على الخادم وتُحمَّل إلى جهازك مباشرة · متوافقة مع Excel وبالعربية.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {EXPORT_KINDS.map((d) => (
          <div key={d.k} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 flex flex-col hover-lift overflow-hidden relative">
            <span className="absolute -top-8 -left-8 w-28 h-28 rounded-full pointer-events-none" style={{ background: `${d.c}10` }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl grid place-items-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${d.c}, ${d.c}bb)` }}>
                <d.icon className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: d.c }} /> CSV
              </span>
            </div>
            <div className="relative font-head font-extrabold text-lg text-slate-900 mt-4">{d.l}</div>
            <div className="relative text-xs text-slate-400 mt-1 leading-relaxed">{d.d}</div>
            <div className="relative flex flex-wrap gap-1.5 mt-3.5">
              {d.cols.map((col) => (
                <span key={col} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">{col}</span>
              ))}
            </div>
            <button onClick={() => run(d.k)} disabled={busy === d.k}
              data-testid={`admin-export-${d.k}`}
              className="pressable relative mt-5 w-full min-h-[48px] rounded-2xl text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-md"
              style={{ background: `linear-gradient(135deg, ${d.c}, ${d.c}cc)` }}>
              {busy === d.k
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التجهيز…</>
                : <><Download className="w-4 h-4" /> تنزيل CSV</>}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-3xl px-5 py-4 flex items-start gap-3">
        <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 grid place-items-center shrink-0"><Info className="w-4 h-4 text-slate-400" /></span>
        <p className="text-xs text-slate-500 leading-relaxed">
          تُبنى الملفات لحظياً من قاعدة البيانات لحظة الضغط على الزر ولا تُحفظ أي نسخة على الخادم.
          تحمل الملفات بيانات المنصة الكاملة · احفظها في مكان آمن ولا تشاركها خارج فريق الإدارة.
        </p>
      </div>
    </div>
  );
}
