import React, { useEffect, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import {
  Trophy, Crown, Medal, Users, BookOpen, Zap, GraduationCap, Sparkles,
} from "lucide-react";

/* كأس المدارس · schools earn cup points from every member's reading, chess
   and coding across the season · live podium + full table. */
export default function SeasonCup() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let alive = true;
    api.get("/cups/schools")
      .then((r) => {
        if (!alive) return;
        const list = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.schools || []);
        setRows(list.map((s) => ({
          school: s.school || s.name || "مدرسة",
          members: Number(s.members ?? s.members_count ?? s.students ?? 0),
          books: Number(s.books ?? s.books_finished ?? s.books_count ?? 0),
          xp: Number(s.xp ?? s.points ?? s.total_xp ?? 0),
        })).sort((a, b) => b.xp - a.xp));
        setState("ok");
      })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);

  return (
    <Layout>
      {/* hero */}
      <div className="ft-hero-gradient relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(251,191,36,0.28),transparent_34%),radial-gradient(circle_at_86%_92%,rgba(255,255,255,0.12),transparent_34%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 right-[15%] w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-[10%] w-80 h-80 rounded-full bg-orange-500/15 blur-3xl" aria-hidden="true" />
        <Trophy className="pointer-events-none absolute -left-10 bottom-2 h-72 w-72 rotate-12 text-amber-300/[0.07]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1240px] px-4 py-14 text-center sm:px-6 sm:py-[4.5rem] lg:px-10">
          <span className="mb-5 inline-grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-slate-950 shadow-[0_20px_44px_-12px_rgba(217,119,6,0.8)] ring-4 ring-white/15 animate-fade-up sm:h-[4.5rem] sm:w-[4.5rem]">
            <Trophy className="h-8 w-8" />
          </span>
          <h1 className="ft-text-gradient mx-auto w-fit font-head text-4xl font-black leading-tight animate-fade-up d-1 sm:text-5xl lg:text-6xl" style={{ backgroundImage: "linear-gradient(to left,#fef3c7,#f59e0b,#fde68a)" }}>كأس المدارس</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-loose text-slate-100/85 animate-fade-up d-2 sm:text-lg">
            كل كتاب يُقرأ، وكل مباراة تُكسب، وكل دقيقة تركيز من طلاب مدرستك ترفعها في سباق الكأس
          </p>
          <div className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-2.5 animate-fade-up d-2" aria-hidden="true">
            <span className="glass rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-amber-100 shadow-lg">الموسم الحالي</span>
            <span className="glass rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white shadow-lg">منافسة مفتوحة</span>
            <span className="glass rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white shadow-lg">تحديث تلقائي</span>
          </div>
          {state === "ok" && rows.length > 0 && (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-slate-950/35 px-4 py-2 text-xs font-extrabold shadow-lg backdrop-blur animate-fade-up d-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {rows.length} مدرسة في المنافسة
            </span>
          )}
        </div>
        <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-300/80 to-transparent sm:inset-x-16" aria-hidden="true" />
      </div>

      <div className="mx-auto max-w-[1240px] px-4 py-9 sm:px-6 sm:py-14 lg:px-10">
        {state === "loading" && <PageLoader />}

        {state === "error" && (
          <div className="max-w-md mx-auto rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 mb-3"><Trophy className="w-7 h-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل جدول الكأس</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">حدثت مشكلة أثناء جلب الترتيب · حاول تحديث الصفحة بعد قليل.</p>
            <button onClick={() => window.location.reload()} className="pressable mt-5 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold min-h-[44px] text-white">
              إعادة المحاولة
            </button>
          </div>
        )}

        {state === "ok" && rows.length === 0 && (
          <div className="max-w-md mx-auto rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-3xl ft-icon-tile text-white shadow-lg mb-3"><GraduationCap className="w-7 h-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">الموسم لم يبدأ بعد</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">ستظهر المدارس هنا فور تسجيل أول نقاط في الموسم.</p>
          </div>
        )}

        {state === "ok" && rows.length > 0 && (
          <>
            {/* podium */}
            <div className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_42%),linear-gradient(180deg,#ffffff,#fffbeb)] p-5 ft-shadow-lg animate-fade-up sm:p-9">
              <div className="pointer-events-none absolute inset-x-10 top-0 h-1 rounded-b-full bg-gradient-to-l from-amber-300 via-yellow-500 to-amber-700" aria-hidden="true" />
              <h2 className="text-center font-head text-xl font-black text-slate-900 sm:text-2xl">منصة التتويج</h2>
              <p className="mt-1 text-center text-xs font-bold text-slate-400">أقوى ثلاث مدارس في سباق هذا الموسم</p>
              <div className="mt-9 flex items-end justify-center gap-3 sm:gap-6 lg:gap-8" dir="rtl">
                {[rows[1], rows[0], rows[2]].map((s, i) => {
                  if (!s) return <div key={i} className="w-28 sm:w-44 lg:w-56" />;
                  const rank = [2, 1, 3][i];
                  const heights = ["h-28 sm:h-32", "h-40 sm:h-44", "h-20 sm:h-24"];
                  const colors = ["from-slate-200 via-slate-300 to-slate-500", "from-amber-200 via-yellow-400 to-amber-600", "from-orange-200 via-amber-400 to-amber-700"];
                  return (
                    <div key={i} className={`w-28 text-center sm:w-44 lg:w-56 ${rank === 1 ? "-translate-y-2 sm:-translate-y-3" : ""}`}>
                      {rank === 1 && <Crown className="mx-auto mb-1.5 h-9 w-9 text-amber-500 drop-shadow animate-bounce" />}
                      <div className={`mx-auto grid place-items-center rounded-full ft-icon-tile font-black text-white shadow-xl ring-4 ring-white ${rank === 1 ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-12 w-12 sm:h-14 sm:w-14"}`}>
                        <GraduationCap className={rank === 1 ? "h-8 w-8" : "h-6 w-6"} />
                      </div>
                      <div className="mx-auto mt-3 min-h-[2.8em] max-w-[15rem] font-head text-sm font-extrabold leading-snug text-slate-800 line-clamp-2 sm:text-base lg:text-lg">{s.school}</div>
                      <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-white/85 px-3 py-1 text-xs font-black text-amber-700 shadow-sm tabular-nums">{s.xp} نقطة</div>
                      <div className={`mt-3 grid place-items-start justify-center rounded-t-[1.4rem] bg-gradient-to-b pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_16px_30px_-18px_rgba(120,53,15,0.55)] ${colors[i]} ${heights[i]}`}>
                        <span className="font-head text-2xl font-black text-white drop-shadow sm:text-3xl">{rank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* full table */}
            <div className="mt-7 overflow-hidden rounded-[2rem] border border-slate-100 bg-white ft-shadow-lg animate-fade-up d-1">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-white px-5 py-4 sm:px-7">
                <h2 className="font-head text-lg font-black text-slate-900">جدول الترتيب الكامل</h2>
                <span className="ft-chip rounded-full px-3.5 py-1.5 text-xs font-black">يُحدّث تلقائياً</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="bg-slate-950 text-left text-xs font-extrabold text-slate-200">
                      <th className="w-20 px-5 py-4 text-right font-extrabold">المركز</th>
                      <th className="px-5 py-4 text-right font-extrabold">المدرسة</th>
                      <th className="px-5 py-4 text-center font-extrabold"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> الطلاب</span></th>
                      <th className="px-5 py-4 text-center font-extrabold"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> كتب مُنهاة</span></th>
                      <th className="px-5 py-4 text-center font-extrabold"><span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> نقاط الكأس</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s, i) => (
                      <tr key={i} className={`border-t border-slate-100 transition hover:bg-amber-50/70 ${i === 0 ? "bg-amber-50/80" : i < 3 ? "bg-amber-50/40" : i % 2 ? "bg-slate-50/45" : "bg-white"}`}>
                        <td className="px-5 py-4">
                          <span className={`inline-flex min-h-9 min-w-11 items-center justify-center gap-1 rounded-full px-2.5 font-head font-black tabular-nums ${i === 0 ? "bg-gradient-to-l from-amber-300 to-yellow-500 text-slate-950 shadow" : i < 3 ? "bg-slate-950 text-amber-300" : "bg-slate-100 text-slate-600"}`}>
                            {i === 0 ? <Crown className="h-4 w-4" /> : i < 3 ? <Medal className="h-4 w-4" /> : null}
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-head font-extrabold text-slate-800 sm:text-base">{s.school}</td>
                        <td className="px-5 py-4 text-center font-bold text-slate-600 tabular-nums">{s.members}</td>
                        <td className="px-5 py-4 text-center font-bold text-slate-600 tabular-nums">{s.books}</td>
                        <td className="px-5 py-4 text-center"><span className="inline-flex rounded-full bg-slate-950 px-3.5 py-1.5 font-head font-black text-amber-300 shadow tabular-nums">{s.xp}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-center text-xs font-semibold text-slate-400 mt-6">
              تُحتسب نقاط الكأس من نشاط طلاب كل مدرسة على المنصة ويُحدَّث الترتيب تلقائياً
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
