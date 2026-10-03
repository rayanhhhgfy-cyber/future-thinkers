import React, { useEffect, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import {
  Trophy, Crown, Users, BookOpen, GraduationCap,
} from "lucide-react";

/* كأس المدارس · schools earn cup points from every member's reading, chess
   and coding across the season · calm podium + clean standings list. */
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
          mine: !!(s.is_mine ?? s.mine ?? s.is_my_school ?? s.my_school ?? false),
        })).sort((a, b) => b.xp - a.xp));
        setState("ok");
      })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);

  const maxXp = rows.length ? Math.max(...rows.map((s) => s.xp), 1) : 1;
  const podium = rows.length ? [rows[1], rows[0], rows[2]] : [];
  const podiumRanks = [2, 1, 3];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
        {/* quiet header */}
        <header className="text-center animate-fade-up">
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <Trophy className="h-7 w-7" />
          </span>
          <div className="mt-4 flex items-center justify-center gap-2.5">
            <h1 className="font-head text-3xl font-black text-slate-900 sm:text-4xl">كأس المدارس</h1>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-extrabold text-white">الموسم الحالي</span>
          </div>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
            كل كتاب يُقرأ، وكل مباراة تُكسب، وكل دقيقة تركيز من طلاب مدرستك ترفعها في سباق الكأس
          </p>
          {state === "ok" && rows.length > 0 && (
            <p className="mt-3 text-xs font-bold text-slate-400 tabular-nums">{rows.length} مدرسة في المنافسة · يُحدّث تلقائياً</p>
          )}
        </header>

        <div className="mt-10">
          {state === "loading" && <PageLoader />}

          {state === "error" && (
            <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center ft-shadow">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><Trophy className="h-7 w-7" /></span>
              <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل جدول الكأس</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">حدثت مشكلة أثناء جلب الترتيب · حاول تحديث الصفحة بعد قليل.</p>
              <button onClick={() => window.location.reload()} className="pressable mt-5 min-h-[44px] rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold text-white">
                إعادة المحاولة
              </button>
            </div>
          )}

          {state === "ok" && rows.length === 0 && (
            <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center ft-shadow">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><GraduationCap className="h-7 w-7" /></span>
              <h2 className="font-head text-lg font-black text-slate-900">الموسم لم يبدأ بعد</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">ستظهر المدارس هنا فور تسجيل أول نقاط في الموسم.</p>
            </div>
          )}

          {state === "ok" && rows.length > 0 && (
            <>
              {/* podium · three calm cards */}
              <section aria-label="منصة التتويج" className="animate-fade-up">
                <div className="grid grid-cols-3 items-end gap-3 sm:gap-5" dir="rtl">
                  {podium.map((s, i) => {
                    const rank = podiumRanks[i];
                    if (!s) return <div key={i} />;
                    const first = rank === 1;
                    return (
                      <article
                        key={i}
                        className={`rounded-3xl border bg-white text-center ft-shadow ${
                          first
                            ? "border-amber-200 px-4 pb-6 pt-7 ring-1 ring-amber-300 sm:px-6 sm:pb-8 sm:pt-9"
                            : "border-slate-100 px-3 pb-5 pt-6 sm:px-5 sm:pb-6 sm:pt-7"
                        }`}
                      >
                        {first ? (
                          <Crown className="mx-auto h-6 w-6 text-amber-500" />
                        ) : (
                          <span className="mx-auto grid h-6 place-items-center font-head text-sm font-black text-slate-300 tabular-nums">{rank}</span>
                        )}
                        <span className={`mx-auto mt-3 grid place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100 ${first ? "h-14 w-14 sm:h-16 sm:w-16" : "h-11 w-11 sm:h-12 sm:w-12"}`}>
                          <GraduationCap className={first ? "h-7 w-7" : "h-5 w-5"} />
                        </span>
                        <h3 className={`mt-3 font-head font-extrabold leading-snug text-slate-800 line-clamp-2 ${first ? "text-sm sm:text-lg" : "text-xs sm:text-sm"}`}>{s.school}</h3>
                        <div className={`mt-2 font-head font-black text-slate-900 tabular-nums ${first ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>{s.xp}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-400">نقطة كأس</div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* standings */}
              <section aria-label="جدول الترتيب" className="mt-10 animate-fade-up d-1">
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <h2 className="font-head text-lg font-extrabold text-slate-900">جدول الترتيب</h2>
                  <span className="text-[11px] font-bold text-slate-400">يُحدّث تلقائياً</span>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white ft-shadow">
                  <ul className="divide-y divide-slate-50">
                    {rows.map((s, i) => (
                      <li key={i} className={`flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 ${s.mine ? "bg-emerald-50/60" : ""}`}>
                        <span className={`w-7 shrink-0 text-center font-head text-sm font-black tabular-nums ${i === 0 ? "text-amber-500" : i < 3 ? "text-slate-700" : "text-slate-300"}`}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate font-head text-sm font-extrabold text-slate-800 sm:text-base">{s.school}</span>
                            {s.mine && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">مدرستك</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-400">
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.members} طالب</span>
                            <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {s.books} كتاب مُنهى</span>
                          </div>
                          <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${i === 0 ? "bg-amber-400" : "bg-slate-300"}`}
                              style={{ width: `${Math.max(4, Math.round((s.xp / maxXp) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-left">
                          <div className="font-head text-base font-black text-slate-900 tabular-nums sm:text-lg">{s.xp}</div>
                          <div className="text-[10px] font-bold text-slate-400">نقطة</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-5 text-center text-xs font-semibold text-slate-400">
                  تُحتسب نقاط الكأس من نشاط طلاب كل مدرسة على المنصة ويُحدَّث الترتيب تلقائياً
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
