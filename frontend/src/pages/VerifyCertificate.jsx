import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { Award, ShieldCheck, XCircle, CheckCircle2, Home, CalendarDays, Building2, Hash, Sparkles } from "lucide-react";

/* Public certificate verification · anyone with the code (e.g. from a QR on
   the printed certificate) can confirm a certificate is genuine. The card
   mirrors the dense modern certificate: dark header band, gold flourishes,
   compact info box and a seal, with no big empty spaces. */
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
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-6 animate-fade-up">
          <span className="inline-grid place-items-center w-12 h-12 rounded-2xl ft-icon-tile text-white shadow-lg mb-2.5">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <h1 className="font-head text-2xl sm:text-3xl font-black text-slate-900">التحقق من الشهادات</h1>
          <p className="text-sm text-slate-500 mt-1">نتحقق من صحة الشهادة المسجلة بهذا الرمز في منصة مفكري المستقبل</p>
          {code && (
            <span className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-slate-900 text-amber-300 px-3.5 py-1.5 text-xs font-bold shadow">
              <Hash className="w-3.5 h-3.5" />
              <span dir="ltr" className="font-mono tracking-widest">{code}</span>
            </span>
          )}
        </div>

        {state === "loading" && (
          <div className="rounded-[24px] bg-white border border-slate-100 ft-shadow-lg overflow-hidden animate-pulse" aria-hidden="true">
            <div className="h-16 bg-slate-900" />
            <div className="px-6 pb-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto -mt-8 ring-4 ring-white" />
              <div className="h-3.5 w-24 bg-slate-100 rounded-full mx-auto mt-4" />
              <div className="h-6 w-52 bg-slate-100 rounded-full mx-auto mt-2.5" />
              <div className="h-3.5 w-40 bg-slate-100 rounded-full mx-auto mt-2.5" />
              <div className="h-16 bg-slate-50 rounded-2xl mt-5" />
            </div>
          </div>
        )}

        {state === "valid" && data && (
          <div className="relative rounded-[24px] p-[3px] bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 shadow-[0_24px_55px_-18px_rgba(217,119,6,0.55)] animate-fade-up">
            <div className="relative overflow-hidden rounded-[21px] bg-gradient-to-b from-[#FFFEF9] via-[#FFFDF4] to-[#FCF3DC]">
              {/* inner double gold frame */}
              <div className="pointer-events-none absolute inset-2 rounded-[16px] border border-amber-300/70 z-20" />
              <div className="pointer-events-none absolute inset-[13px] rounded-[12px] border border-amber-200/60 z-20" />
              {/* corner diamonds */}
              <span className="pointer-events-none absolute top-[7px] right-[7px] w-2 h-2 rotate-45 bg-amber-500 z-20" aria-hidden="true" />
              <span className="pointer-events-none absolute top-[7px] left-[7px] w-2 h-2 rotate-45 bg-amber-500 z-20" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-[7px] right-[7px] w-2 h-2 rotate-45 bg-amber-500 z-20" aria-hidden="true" />
              <span className="pointer-events-none absolute bottom-[7px] left-[7px] w-2 h-2 rotate-45 bg-amber-500 z-20" aria-hidden="true" />

              {/* dark header band */}
              <div className="relative bg-gradient-to-l from-slate-950 via-emerald-950 to-slate-900 px-5 pt-4 pb-9 text-center overflow-hidden">
                <Award className="pointer-events-none absolute -left-4 -bottom-7 w-28 h-28 text-amber-300/[0.08] rotate-12" aria-hidden="true" />
                <Award className="pointer-events-none absolute -right-4 -top-7 w-28 h-28 text-amber-300/[0.08] -rotate-12" aria-hidden="true" />
                <div className="relative flex items-center justify-center gap-2 text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-head text-base sm:text-lg font-black tracking-wide text-white">منصة مفكري المستقبل</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="relative text-[11px] font-bold text-amber-200/80 mt-1">شهادة إنجاز موثّقة رسمياً</div>
                <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-400/70 to-transparent" aria-hidden="true" />
              </div>

              {/* seal overlapping the band */}
              <div className="relative z-10 mx-auto w-16 h-16 -mt-8">
                <span className="absolute -bottom-2.5 right-[26px] w-4 h-8 rounded-b-md bg-gradient-to-b from-rose-400 to-rose-600 rotate-[16deg]" aria-hidden="true" />
                <span className="absolute -bottom-2.5 left-[26px] w-4 h-8 rounded-b-md bg-gradient-to-b from-amber-400 to-amber-600 -rotate-[16deg]" aria-hidden="true" />
                <span className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 ring-4 ring-[#C6A15B] shadow-[0_10px_24px_-8px_rgba(5,150,105,0.6)] grid place-items-center text-white">
                  <CheckCircle2 className="w-8 h-8" />
                </span>
              </div>

              <div className="relative px-5 sm:px-8 pt-3 pb-6 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3.5 py-1.5 text-[11px] font-black shadow-md shadow-emerald-600/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> شهادة موثّقة وأصلية
                </span>
                <div className="mt-3.5 text-[11px] font-bold tracking-wide text-amber-700">تُمنح هذه الشهادة إلى</div>
                <h2 className="font-head text-[1.65rem] sm:text-3xl font-black text-slate-900 mt-0.5 leading-snug">{data.user_name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1.5" aria-hidden="true">
                  <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-400" />
                  <span className="w-1.5 h-1.5 rotate-45 bg-amber-500" />
                  <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-400" />
                </div>
                <div className="font-head font-extrabold text-slate-800 mt-2.5 leading-snug">{data.title_line}</div>
                {data.subtitle && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{data.subtitle}</p>}

                {/* compact info box */}
                <div className="mt-5 rounded-2xl border border-amber-200 bg-white/70 overflow-hidden text-right">
                  <div className="grid grid-cols-3 divide-x divide-x-reverse divide-amber-100">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Hash className="w-3 h-3" /> رمز التحقق</div>
                      <div className="text-xs sm:text-sm font-black text-slate-700 mt-0.5 font-mono tracking-wider" dir="ltr">{code}</div>
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><CalendarDays className="w-3 h-3" /> تاريخ الإصدار</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5 tabular-nums" dir="ltr">{dateStr}</div>
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><Building2 className="w-3 h-3" /> جهة الإصدار</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5 leading-snug">{data.org || "منصة مفكري المستقبل"}</div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> تم التحقق إلكترونياً عبر منصة مفكري المستقبل
                </p>
              </div>
            </div>
          </div>
        )}

        {state === "invalid" && (
          <div className="rounded-[24px] bg-white border border-slate-100 ft-shadow-lg overflow-hidden text-center animate-fade-up">
            <div className="bg-gradient-to-l from-rose-950 via-rose-900 to-slate-900 px-6 py-4">
              <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-red-600 ring-4 ring-white/15 shadow-lg text-white">
                <XCircle className="w-8 h-8" />
              </span>
            </div>
            <div className="px-6 py-6">
              <h2 className="font-head text-xl sm:text-2xl font-black text-slate-900">شهادة غير موجودة أو ملغاة</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
                لم نعثر على شهادة بهذا الرمز في سجلاتنا · تأكد من كتابة الرمز كاملاً كما يظهر على الشهادة وحاول مجدداً.
              </p>
              <Link to="/" className="pressable inline-flex items-center gap-2 mt-5 rounded-2xl ft-btn-primary px-5 py-3 text-sm font-extrabold min-h-[48px]">
                <Home className="w-4 h-4" /> العودة إلى الرئيسية
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
