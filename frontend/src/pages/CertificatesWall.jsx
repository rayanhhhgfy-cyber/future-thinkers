import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api from "@/lib/api";
import { Award, ShieldCheck, CalendarDays, Sparkles, Medal } from "lucide-react";

/* جدار الشهادات · a public wall celebrating the latest certificates issued on
   the platform. Dense premium mini-certificates: ivory card, double gold
   frame, dark top band and a seal · fully responsive grid. */
export default function CertificatesWall() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let alive = true;
    api.get("/certificates/wall")
      .then((r) => {
        if (!alive) return;
        const list = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.certificates || []);
        setItems(list);
        setState("ok");
      })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);

  return (
    <Layout>
      {/* hero band */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-emerald-950 to-slate-900 text-white">
        <div className="pointer-events-none absolute -top-24 right-[15%] w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-[10%] w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
        <Award className="pointer-events-none absolute -left-8 bottom-4 w-52 h-52 text-amber-300/[0.06] rotate-12" aria-hidden="true" />
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 shadow-[0_16px_36px_-10px_rgba(217,119,6,0.7)] mb-4 animate-fade-up">
            <Medal className="w-7 h-7" />
          </span>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black animate-fade-up d-1">جدار الشهادات</h1>
          <p className="text-slate-300/90 mt-3 max-w-xl mx-auto leading-relaxed animate-fade-up d-2">
            نحتفي بإنجازات طلابنا · أحدث الشهادات الموثّقة الصادرة عبر منصة مفكري المستقبل
          </p>
          {state === "ok" && items.length > 0 && (
            <span className="inline-flex items-center gap-1.5 mt-5 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold animate-fade-up d-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {items.length} شهادة معلنة
            </span>
          )}
        </div>
        <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-400/60 to-transparent" aria-hidden="true" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {state === "loading" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[20px] bg-white border border-slate-100 ft-shadow overflow-hidden animate-pulse">
                <div className="h-10 bg-slate-900" />
                <div className="px-5 pb-5">
                  <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto -mt-6 ring-4 ring-white" />
                  <div className="h-4 w-32 bg-slate-100 rounded-full mx-auto mt-3" />
                  <div className="h-3 w-40 bg-slate-100 rounded-full mx-auto mt-2" />
                  <div className="h-9 bg-slate-50 rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="max-w-md mx-auto rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 mb-3">
              <Award className="w-7 h-7" />
            </span>
            <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل الجدار الآن</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">حدثت مشكلة أثناء جلب الشهادات · حاول تحديث الصفحة بعد قليل.</p>
            <button onClick={() => window.location.reload()} className="pressable mt-5 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold min-h-[44px]">
              إعادة المحاولة
            </button>
          </div>
        )}

        {state === "ok" && items.length === 0 && (
          <div className="max-w-md mx-auto rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-3xl ft-icon-tile text-white shadow-lg mb-3">
              <Award className="w-7 h-7" />
            </span>
            <h2 className="font-head text-lg font-black text-slate-900">لا شهادات معلنة بعد</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">ستظهر هنا أحدث الشهادات فور إصدارها · واصل التعلم وكن أول الأسماء على الجدار.</p>
            <Link to="/library" className="pressable inline-flex items-center gap-2 mt-5 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold min-h-[44px]">
              ابدأ من المكتبة
            </Link>
          </div>
        )}

        {state === "ok" && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {items.map((c, i) => (
              <CertCard key={c.id || c.code || i} cert={c} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function CertCard({ cert }) {
  const code = cert.code || cert.verify_code || "";
  const dateStr = cert.created_at ? String(cert.created_at).slice(0, 10) : "";
  const inner = (
    <>
      {/* mini dark band */}
      <div className="relative bg-gradient-to-l from-slate-950 via-emerald-950 to-slate-900 px-4 pt-2.5 pb-6 text-center">
        <span className="font-head text-[11px] font-black tracking-wide text-amber-200">منصة مفكري المستقبل</span>
        <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-400/70 to-transparent" aria-hidden="true" />
      </div>
      {/* seal */}
      <div className="relative z-10 mx-auto w-11 h-11 -mt-[22px]">
        <span className="absolute -bottom-2 right-[18px] w-3 h-6 rounded-b bg-gradient-to-b from-rose-400 to-rose-600 rotate-[16deg]" aria-hidden="true" />
        <span className="absolute -bottom-2 left-[18px] w-3 h-6 rounded-b bg-gradient-to-b from-amber-400 to-amber-600 -rotate-[16deg]" aria-hidden="true" />
        <span className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 ring-[3px] ring-[#C6A15B] shadow grid place-items-center text-white">
          <Award className="w-5 h-5" />
        </span>
      </div>
      <div className="px-4 pt-2 pb-4 text-center">
        <div className="text-[9px] font-bold tracking-wide text-amber-700">تُمنح هذه الشهادة إلى</div>
        <div className="font-head font-black text-slate-900 leading-snug mt-0.5 line-clamp-1">{cert.user_name || cert.name || "طالب متميز"}</div>
        <div className="font-head text-[13px] font-extrabold text-slate-700 leading-snug mt-1.5 line-clamp-2 min-h-[2.4em]">{cert.title_line || cert.title || ""}</div>
        {cert.subtitle && <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-1 mt-0.5">{cert.subtitle}</p>}
        <div className="flex items-center justify-center gap-1.5 mt-2" aria-hidden="true">
          <span className="h-px w-9 bg-gradient-to-l from-transparent to-amber-400" />
          <span className="w-1 h-1 rotate-45 bg-amber-500" />
          <span className="h-px w-9 bg-gradient-to-r from-transparent to-amber-400" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-white/70 px-2.5 py-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <CalendarDays className="w-3 h-3" />
            <span className="tabular-nums" dir="ltr">{dateStr}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
            <ShieldCheck className="w-3 h-3" /> موثّقة
          </span>
        </div>
      </div>
    </>
  );

  const shell = "relative block rounded-[20px] p-[2.5px] bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 shadow-[0_14px_34px_-14px_rgba(217,119,6,0.5)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-14px_rgba(217,119,6,0.6)]";
  const cardBody = (
    <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-b from-[#FFFEF9] to-[#FCF3DC] h-full">
      <div className="pointer-events-none absolute inset-1.5 rounded-[14px] border border-amber-300/60 z-10" />
      {inner}
    </div>
  );

  if (code) {
    return <Link to={`/verify/${encodeURIComponent(code)}`} className={shell} title="التحقق من الشهادة">{cardBody}</Link>;
  }
  return <div className={shell}>{cardBody}</div>;
}
