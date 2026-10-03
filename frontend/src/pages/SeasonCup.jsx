import React, { useEffect, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import {
  Trophy, Crown, Users, BookOpen, GraduationCap, Sparkles, Medal,
} from "lucide-react";

/* كأس المدارس · schools earn cup points from every member's reading, chess
   and coding across the season · bold podium + rich standings. */
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
  const totalXp = rows.reduce((a, s) => a + s.xp, 0);
  const podium = rows.length ? [rows[1], rows[0], rows[2]] : [];
  const podiumRanks = [2, 1, 3];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-16">
        {/* bold hero */}
        <header className="ft-hero-gradient grain relative isolate overflow-hidden rounded-[2rem] px-6 py-9 text-center text-white ft-shadow-lg animate-fade-up sm:rounded-[2.5rem] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1.6px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[18%] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <Trophy className="pointer-events-none absolute -left-8 -bottom-10 h-44 w-44 -rotate-12 text-white/[0.08] sm:h-60 sm:w-60" />
          <div className="relative">
            <span className="inline-grid h-16 w-16 place-items-center rounded-[1.25rem] bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-xl shadow-orange-950/30 ring-1 ring-white/40 animate-float [animation-duration:6s] sm:h-[4.5rem] sm:w-[4.5rem]">
              <Trophy className="h-8 w-8 sm:h-9 sm:w-9" />
            </span>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <h1 className="font-head text-3xl font-black sm:text-5xl">كأس المدارس</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-extrabold ring-1 ring-white/30 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> الموسم الحالي
              </span>
            </div>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              كل كتاب يُقرأ، وكل مباراة تُكسب، وكل دقيقة تركيز من طلاب مدرستك ترفعها في سباق الكأس
            </p>
            {state === "ok" && rows.length > 0 && (
              <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-2.5 sm:gap-3">
                {[
                  { n: rows.length, l: "مدرسة منافسة" },
                  { n: totalXp, l: "نقطة كأس" },
                  { n: rows.reduce((a, s) => a + s.members, 0), l: "طالب مشارك" },
                ].map((t) => (
                  <div key={t.l} className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/20 backdrop-blur-md">
                    <div className="font-head text-lg font-black tabular-nums sm:text-xl">{t.n}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-white/70">{t.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="mt-8 sm:mt-10">
          {state === "loading" && <PageLoader />}

          {state === "error" && (
            <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white px-6 py-10 text-center ft-shadow-lg animate-fade-up">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200"><Trophy className="h-7 w-7" /></span>
              <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل جدول الكأس</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">حدثت مشكلة أثناء جلب الترتيب · حاول تحديث الصفحة بعد قليل.</p>
              <button onClick={() => window.location.reload()} className="pressable mt-5 min-h-[48px] rounded-2xl ft-btn-primary px-6 py-2.5 text-sm font-extrabold text-white shadow-lg">
                إعادة المحاولة
              </button>
            </div>
          )}

          {state === "ok" && rows.length === 0 && (
            <div className="mx-auto max-w-md rounded-[2rem] border border-slate-100 bg-white px-6 py-10 text-center ft-shadow-lg animate-fade-up">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-300"><GraduationCap className="h-7 w-7" /></span>
              <h2 className="font-head text-lg font-black text-slate-900">الموسم لم يبدأ بعد</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">ستظهر المدارس هنا فور تسجيل أول نقاط في الموسم.</p>
            </div>
          )}

          {state === "ok" && rows.length > 0 && (
            <>
              {/* podium · celebratory */}
              <section aria-label="منصة التتويج" className="animate-fade-up">
                <div className="grid grid-cols-3 items-end gap-3 sm:gap-5" dir="rtl">
                  {podium.map((s, i) => {
                    const rank = podiumRanks[i];
                    if (!s) return <div key={i} />;
                    const first = rank === 1;
                    const medalTile = first
                      ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg shadow-amber-300/60"
                      : rank === 2
                        ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-md shadow-slate-300"
                        : "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-md shadow-orange-200";
                    return (
                      <article
                        key={i}
                        style={{ animationDelay: `${i * 90}ms` }}
                        className={`group relative isolate overflow-hidden rounded-[1.75rem] text-center animate-fade-up transition-shadow duration-300 ${
                          first
                            ? "bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 px-4 pb-7 pt-9 text-white shadow-[0_28px_55px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-300 sm:px-6 sm:pb-9 sm:pt-11"
                            : "border border-slate-100 bg-white px-3 pb-6 pt-7 ft-shadow hover:shadow-[0_22px_45px_-18px_rgba(15,23,42,0.25)] sm:px-5 sm:pb-7 sm:pt-8"
                        }`}
                      >
                        {first && <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1.5px)] [background-size:16px_16px]" />}
                        <div className="relative">
                          {first ? (
                            <span className="relative mx-auto grid h-8 place-items-center">
                              <Crown className="h-8 w-8 text-white drop-shadow animate-float [animation-duration:5s]" />
                            </span>
                          ) : (
                            <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full font-head text-sm font-black tabular-nums ${rank === 2 ? "bg-slate-100 text-slate-500" : "bg-orange-50 text-orange-500"}`}>{rank}</span>
                          )}
                          <span className={`mx-auto mt-3 grid place-items-center rounded-full ring-4 ${medalTile} ${first ? "h-16 w-16 ring-white/30 sm:h-20 sm:w-20" : "h-12 w-12 ring-white sm:h-14 sm:w-14"}`}>
                            <GraduationCap className={first ? "h-8 w-8 sm:h-9 sm:w-9" : "h-6 w-6"} />
                          </span>
                          <h3 className={`mt-3 font-head font-extrabold leading-snug line-clamp-2 ${first ? "text-sm text-white sm:text-xl" : "text-xs text-slate-800 sm:text-base"}`}>{s.school}</h3>
                          <div className={`mt-2 font-head font-black tabular-nums ${first ? "text-3xl sm:text-4xl" : "text-xl text-slate-900 sm:text-2xl"}`}>{s.xp}</div>
                          <div className={`mt-0.5 text-[11px] font-bold ${first ? "text-white/80" : "text-slate-400"}`}>نقطة كأس</div>
                          <div className={`mt-3 flex items-center justify-center gap-3 text-[10px] font-bold ${first ? "text-white/75" : "text-slate-400"}`}>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.members}</span>
                            <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {s.books}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {/* podium base */}
                <div className="mx-auto mt-3 h-2.5 max-w-2xl rounded-full bg-gradient-to-l from-amber-200 via-amber-400 to-amber-200 opacity-70 blur-[1px]" />
              </section>

              {/* standings */}
              <section aria-label="جدول الترتيب" className="mt-10 animate-fade-up d-1 sm:mt-12">
                <div className="mb-4 flex items-center gap-3 px-1">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl ft-icon-tile text-white shadow-md shrink-0"><Medal className="h-5 w-5" /></span>
                  <h2 className="font-head text-lg font-extrabold text-slate-900 sm:text-xl">جدول الترتيب</h2>
                  <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> يُحدّث تلقائياً
                  </span>
                </div>
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white ft-shadow-lg">
                  <ul className="divide-y divide-slate-50">
                    {rows.map((s, i) => (
                      <li
                        key={i}
                        style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                        className={`group flex items-center gap-3 px-4 py-4 animate-fade-up transition-colors sm:gap-4 sm:px-6 ${s.mine ? "bg-gradient-to-l from-emerald-50 via-emerald-50/60 to-transparent" : "hover:bg-slate-50/70"}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-head text-sm font-black tabular-nums ${
                          i === 0
                            ? "bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-md shadow-amber-300/60"
                            : i === 1
                              ? "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-sm"
                              : i === 2
                                ? "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-400 ring-1 ring-slate-100"
                        }`}>
                          {i + 1}
                        </span>
                        <span className={`hidden h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-md sm:grid ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-slate-500 to-slate-700"}`}>
                          <GraduationCap className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate font-head text-sm font-extrabold text-slate-800 sm:text-base">{s.school}</span>
                            {s.mine && <span className="rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm shadow-emerald-200">مدرستك</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-400">
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {s.members} طالب</span>
                            <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {s.books} كتاب مُنهى</span>
                          </div>
                          <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${i === 0 ? "bg-gradient-to-l from-amber-300 to-orange-500" : "ft-grad-bar"}`}
                              style={{ width: `${Math.max(4, Math.round((s.xp / maxXp) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-left">
                          <div className={`font-head text-lg font-black tabular-nums sm:text-xl ${i === 0 ? "text-amber-500" : "text-slate-900"}`}>{s.xp}</div>
                          <div className="text-[10px] font-bold text-slate-400">نقطة</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-5 text-center text-xs font-semibold leading-relaxed text-slate-400">
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
