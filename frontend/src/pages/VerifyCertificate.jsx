import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { Award, ShieldCheck, XCircle, CheckCircle2, Home, CalendarDays, Building2 } from "lucide-react";

/* Public certificate verification · anyone with the code (e.g. from a QR on
   the printed certificate) can confirm a certificate is genuine. */
export default function VerifyCertificate() {
  const { code } = useParams();
  const [state, setState] = useState("loading"); // loading | valid | invalid
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setState("loading"); setData(null);
    api.get(`/certificates/verify/${encodeURIComponent(code || "")}`)
      .then((r) => {
        if (!alive) return;
        if (r.data && r.data.valid) { setData(r.data); setState("valid"); }
        else setState("invalid");
      })
      .catch(() => { if (alive) setState("invalid"); });
    return () => { alive = false; };
  }, [code]);

  const dateStr = data?.created_at ? String(data.created_at).slice(0, 10) : "";

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-8 animate-fade-up">
          <span className="inline-grid place-items-center w-14 h-14 rounded-3xl ft-icon-tile text-white shadow-lg mb-3">
            <ShieldCheck className="w-7 h-7" />
          </span>
          <h1 className="font-head text-2xl sm:text-3xl font-black text-slate-900">التحقق من الشهادات</h1>
          <p className="text-sm text-slate-500 mt-1.5">نتحقق من صحة الشهادة المسجلة بهذا الرمز في منصة مفكري المستقبل</p>
          {code && (
            <span className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
              الرمز: <span dir="ltr" className="font-mono tracking-wide">{code}</span>
            </span>
          )}
        </div>

        {state === "loading" && (
          <div className="rounded-[26px] bg-white border border-slate-100 ft-shadow-lg p-8 animate-pulse" aria-hidden="true">
            <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto" />
            <div className="h-4 w-40 bg-slate-100 rounded-full mx-auto mt-6" />
            <div className="h-6 w-56 bg-slate-100 rounded-full mx-auto mt-3" />
            <div className="h-3 w-44 bg-slate-100 rounded-full mx-auto mt-3" />
            <div className="grid grid-cols-2 gap-3 mt-8">
              <div className="h-14 bg-slate-50 rounded-2xl" />
              <div className="h-14 bg-slate-50 rounded-2xl" />
            </div>
          </div>
        )}

        {state === "valid" && data && (
          <div className="relative rounded-[26px] p-[3px] bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-[0_20px_50px_-16px_rgba(217,119,6,0.55)] animate-fade-up">
            <div className="relative overflow-hidden rounded-[23px] bg-gradient-to-b from-[#FFFEF9] via-[#FFFDF4] to-[#FCF3DC] px-5 py-8 sm:px-8 text-center">
              <div className="pointer-events-none absolute inset-2.5 rounded-[18px] border border-amber-300/60" />
              <div className="pointer-events-none absolute inset-4 rounded-[14px] border border-amber-200/50" />
              <div className="relative mx-auto w-20 h-20">
                <span className="absolute -bottom-3 right-[32px] w-5 h-10 rounded-b-lg bg-gradient-to-b from-rose-400 to-rose-600 rotate-[16deg]" />
                <span className="absolute -bottom-3 left-[32px] w-5 h-10 rounded-b-lg bg-gradient-to-b from-amber-400 to-amber-600 -rotate-[16deg]" />
                <span className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 ring-4 ring-emerald-100 shadow-lg grid place-items-center text-white">
                  <CheckCircle2 className="w-10 h-10" />
                </span>
              </div>
              <span className="relative inline-flex items-center gap-1.5 mt-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1.5 text-xs font-black">
                <ShieldCheck className="w-4 h-4" /> شهادة موثّقة وأصلية
              </span>
              <div className="relative mt-4 text-[11px] font-bold tracking-wide text-amber-700">تُمنح هذه الشهادة إلى</div>
              <h2 className="relative font-head text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-snug">{data.user_name}</h2>
              <div className="relative font-head font-extrabold text-slate-800 mt-3 leading-snug">{data.title_line}</div>
              {data.subtitle && <p className="relative text-sm text-slate-500 mt-1 leading-relaxed">{data.subtitle}</p>}
              <div className="relative mt-4 flex items-center justify-center gap-2" aria-hidden="true">
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400" />
                <span className="w-1.5 h-1.5 rotate-45 bg-amber-500" />
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400" />
              </div>
              <div className="relative grid grid-cols-2 gap-3 mt-5 text-right">
                <div className="rounded-2xl bg-white/70 border border-amber-100 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><Building2 className="w-3.5 h-3.5" /> جهة الإصدار</div>
                  <div className="text-sm font-bold text-slate-700 mt-1">{data.org || "منصة مفكري المستقبل"}</div>
                </div>
                <div className="rounded-2xl bg-white/70 border border-amber-100 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><CalendarDays className="w-3.5 h-3.5" /> تاريخ الإصدار</div>
                  <div className="text-sm font-bold text-slate-700 mt-1" dir="ltr">{dateStr}</div>
                </div>
              </div>
              <p className="relative text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" /> تم التحقق إلكترونياً عبر منصة مفكري المستقبل
              </p>
            </div>
          </div>
        )}

        {state === "invalid" && (
          <div className="rounded-[26px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center animate-fade-up">
            <span className="inline-grid place-items-center w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-red-600 ring-4 ring-rose-100 shadow-lg text-white">
              <XCircle className="w-10 h-10" />
            </span>
            <h2 className="font-head text-xl sm:text-2xl font-black text-slate-900 mt-5">شهادة غير موجودة أو ملغاة</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              لم نعثر على شهادة بهذا الرمز في سجلاتنا · تأكد من كتابة الرمز كاملاً كما يظهر على الشهادة وحاول مجدداً.
            </p>
            <Link to="/" className="pressable inline-flex items-center gap-2 mt-6 rounded-2xl ft-btn-primary px-5 py-3 text-sm font-extrabold min-h-[48px]">
              <Home className="w-4 h-4" /> العودة إلى الرئيسية
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
