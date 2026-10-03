import React, { useCallback, useEffect, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClipboardList, Printer, Users, Zap, BookOpen, Swords, Timer,
  ShieldAlert, GraduationCap, Search, Loader2, Crown,
} from "lucide-react";

/* تقرير المدرسة · a teacher/admin snapshot of their school: headline totals
   plus a per-student activity table, ready to print. Students get a polite
   access-denied card instead of an error. */

const AVATAR_GRADS = [
  "from-blue-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-fuchsia-500 to-purple-500",
];
const avatarGrad = (name) => AVATAR_GRADS[((name || "؟").trim().charCodeAt(0) || 0) % AVATAR_GRADS.length];

const RANK_TILE = [
  "bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-md shadow-amber-300/60",
  "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-sm",
  "bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm",
];

export default function ClassReport() {
  const { isStaff } = useAuth();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | denied | error
  const [schoolInput, setSchoolInput] = useState("");
  const [schoolParam, setSchoolParam] = useState("");
  const [reloading, setReloading] = useState(false);

  const load = useCallback(async (school) => {
    try {
      const { data: d } = await api.get("/reports/my-school", {
        params: school ? { school } : {},
      });
      setData(d);
      setState("ok");
    } catch (e) {
      const st = e?.response?.status;
      if (st === 403 || st === 401) {
        setState("denied");
      } else {
        setState((s) => (s === "ok" ? "ok" : "error"));
        toast.error(apiErr(e));
      }
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  const applySchool = async () => {
    const s = schoolInput.trim();
    setReloading(true);
    setSchoolParam(s);
    await load(s);
    setReloading(false);
  };

  if (state === "loading") return <Layout><PageLoader /></Layout>;

  if (state === "denied") {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 pb-28 pt-16 lg:pb-16">
          <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-10 text-center ft-shadow-lg animate-fade-up">
            <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200"><ShieldAlert className="h-7 w-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">تقرير المدرسة للمعلمين والإدارة</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              هذا التقرير يعرض نشاط طلاب المدرسة كاملاً، لذلك هو متاح لحسابات المعلمين والإدارة فقط. إذا كنت معلماً وتعتقد أن هذا خطأ، تواصل مع إدارة المنصة.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (state === "error" || !data) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 pb-28 pt-16 lg:pb-16">
          <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-10 text-center ft-shadow-lg animate-fade-up">
            <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200"><ClipboardList className="h-7 w-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل التقرير</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">حدثت مشكلة أثناء إعداد التقرير · حاول مرة أخرى بعد قليل.</p>
            <Button onClick={() => { setState("loading"); load(schoolParam); }} className="mt-5 min-h-[48px] rounded-2xl ft-btn-primary px-6 py-2.5 text-sm font-extrabold text-white shadow-lg">
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const schoolName = data.school || data.school_name || schoolParam || "مدرستي";
  const totals = data.totals || data.summary || {};
  const students = (Array.isArray(data.students) ? data.students : []).map((s) => ({
    name: s.name || s.user_name || "طالب",
    xp: Number(s.xp ?? s.total_xp ?? 0),
    books: Number(s.books ?? s.books_finished ?? s.books_count ?? 0),
    chess: Number(s.chess_games ?? s.chess?.games ?? 0),
    focus: Number(s.focus_minutes ?? s.focus?.minutes ?? 0),
    lastActive: s.last_active || s.last_seen || s.updated_at || "",
  }));
  const sortedStudents = [...students].sort((a, b) => b.xp - a.xp);
  const maxXp = sortedStudents.length ? Math.max(...sortedStudents.map((s) => s.xp), 1) : 1;

  const totalTiles = [
    { icon: Users, label: "طلاب المدرسة", value: Number(totals.students ?? totals.students_count ?? students.length), tile: "from-blue-500 to-indigo-500", shadow: "shadow-blue-200" },
    { icon: Zap, label: "مجموع نقاط الخبرة", value: Number(totals.xp ?? totals.total_xp ?? students.reduce((a, s) => a + s.xp, 0)), tile: "from-amber-400 to-orange-500", shadow: "shadow-amber-200" },
    { icon: BookOpen, label: "كتب مُنهاة", value: Number(totals.books ?? totals.books_finished ?? students.reduce((a, s) => a + s.books, 0)), tile: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-200" },
    { icon: Swords, label: "مباريات شطرنج", value: Number(totals.chess_games ?? totals.chess ?? students.reduce((a, s) => a + s.chess, 0)), tile: "from-rose-500 to-pink-500", shadow: "shadow-rose-200" },
    { icon: Timer, label: "دقائق تركيز", value: Number(totals.focus_minutes ?? totals.focus ?? students.reduce((a, s) => a + s.focus, 0)), tile: "from-cyan-500 to-sky-500", shadow: "shadow-cyan-200" },
  ];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-16 print:max-w-none print:py-4">
        {/* bold hero header */}
        <header className="ft-hero-gradient grain relative isolate overflow-hidden rounded-[2rem] p-6 text-white ft-shadow-lg animate-fade-up sm:rounded-[2.5rem] sm:p-9 print:rounded-none print:bg-none print:text-slate-900 print:shadow-none">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1.6px)] [background-size:22px_22px] print:hidden" />
          <div className="pointer-events-none absolute -top-24 right-[12%] h-56 w-56 rounded-full bg-white/15 blur-3xl print:hidden" />
          <ClipboardList className="pointer-events-none absolute -left-8 -bottom-10 h-44 w-44 -rotate-12 text-white/[0.08] print:hidden" />
          <div className="relative flex flex-wrap items-center gap-5">
            <span className="inline-grid h-14 w-14 shrink-0 place-items-center rounded-[1.15rem] bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md sm:h-16 sm:w-16 print:bg-slate-100 print:text-slate-600 print:ring-slate-200">
              <ClipboardList className="h-7 w-7 sm:h-8 sm:w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold text-white ring-1 ring-white/25 backdrop-blur print:bg-slate-100 print:text-slate-500 print:ring-slate-200">تقرير أداء رسمي</span>
              <h1 className="font-head text-3xl font-black leading-tight sm:text-4xl">تقرير المدرسة</h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-white/85 print:text-slate-500">
                <GraduationCap className="h-4 w-4" /> {schoolName}
              </p>
            </div>
            <Button
              data-testid="class-report-print-btn"
              onClick={() => window.print()}
              className="min-h-[48px] rounded-2xl bg-white px-6 font-extrabold text-slate-900 shadow-xl transition hover:bg-slate-50 pressable print:hidden"
            >
              <Printer className="ml-1 h-4 w-4" /> طباعة التقرير
            </Button>
          </div>
        </header>

        {/* admin school switcher */}
        {isStaff && (
          <div className="mt-5 flex flex-col gap-3 rounded-[1.75rem] border border-slate-100 bg-white p-5 ft-shadow animate-fade-up d-1 sm:flex-row sm:items-center sm:p-6 print:hidden">
            <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200 sm:grid"><Search className="h-5 w-5" /></span>
            <div className="flex-1">
              <div className="text-sm font-extrabold text-slate-800">عرض مدرسة أخرى (للإدارة)</div>
              <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-400">اكتب اسم المدرسة كما هو مسجل ثم اضغط عرض التقرير.</p>
            </div>
            <div className="flex w-full gap-2.5 sm:w-auto">
              <Input
                data-testid="class-report-school-input"
                value={schoolInput}
                onChange={(e) => setSchoolInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySchool()}
                placeholder="اسم المدرسة…"
                className="h-12 flex-1 rounded-2xl border-slate-200 bg-white sm:w-72"
              />
              <Button onClick={applySchool} disabled={reloading} className="min-h-[48px] shrink-0 rounded-2xl ft-btn-primary font-extrabold text-white shadow-lg">
                {reloading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Search className="ml-1 h-4 w-4" />}
                عرض
              </Button>
            </div>
          </div>
        )}

        {/* totals · rich stat tiles */}
        <section aria-label="ملخص النشاط" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5 print:mt-5">
          {totalTiles.map(({ icon: Icon, label, value, tile, shadow }, i) => (
            <div
              key={label}
              className={`group relative isolate overflow-hidden rounded-[1.6rem] border border-slate-100 bg-white p-5 ft-shadow animate-fade-up transition-shadow duration-300 hover:shadow-[0_22px_45px_-18px_rgba(15,23,42,0.28)] print:shadow-none ${i === 0 ? "col-span-2 md:col-span-1" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tile} opacity-[0.08] blur-xl transition-opacity group-hover:opacity-20 print:hidden`} />
              <span className={`relative inline-grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tile} text-white shadow-lg ${shadow} print:bg-slate-100 print:text-slate-500 print:shadow-none`}><Icon className="h-5 w-5" /></span>
              <div className="relative mt-3 font-head text-3xl font-black leading-none text-slate-900 tabular-nums">{value}</div>
              <div className="relative mt-1.5 text-[11px] font-extrabold text-slate-400">{label}</div>
            </div>
          ))}
        </section>

        {/* top students */}
        <section aria-label="نشاط الطلاب" className="mt-9 animate-fade-up d-1">
          <div className="mb-4 flex items-center gap-3 px-1">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200"><Crown className="h-5 w-5" /></span>
            <h2 className="font-head text-lg font-extrabold text-slate-900 sm:text-xl">نشاط الطلاب ({students.length})</h2>
            <span className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
            <span className="hidden text-[11px] font-bold text-slate-400 sm:block">مرتّبون حسب نقاط الخبرة</span>
          </div>

          {students.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-100 bg-white px-6 py-12 text-center ft-shadow-lg">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-300"><GraduationCap className="h-7 w-7" /></span>
              <p className="font-head text-base font-extrabold text-slate-800">لا طلاب مسجلون من هذه المدرسة بعد</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">سيظهر نشاط الطلاب هنا فور انضمامهم وبدء نشاطهم على المنصة.</p>
            </div>
          ) : (
            <>
              {/* mobile · rich list */}
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white ft-shadow-lg sm:hidden print:hidden">
                <ul className="divide-y divide-slate-50">
                  {sortedStudents.map((s, i) => (
                    <li key={i} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className="flex items-center gap-3 px-4 py-4 animate-fade-up">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-head text-sm font-black tabular-nums ${RANK_TILE[i] || "bg-slate-50 text-slate-400 ring-1 ring-slate-100"}`}>{i + 1}</span>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGrad(s.name)} text-sm font-black text-white shadow-md ring-2 ring-white`}>{s.name?.[0] || "؟"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-head text-sm font-extrabold text-slate-800">{s.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-400 tabular-nums">
                          {s.books} كتاب · {s.chess} شطرنج · {s.focus} دقيقة تركيز
                        </div>
                        <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${Math.max(4, Math.round((s.xp / maxXp) * 100))}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <div className="font-head text-base font-black text-slate-900 tabular-nums">{s.xp}</div>
                        <div className="text-[10px] font-bold text-slate-400">XP</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* desktop + print · table */}
              <div className="hidden overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white ft-shadow-lg sm:block print:block print:rounded-none print:border-slate-300 print:shadow-none">
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[720px] text-sm print:min-w-0">
                    <thead>
                      <tr className="border-b border-slate-100 bg-gradient-to-l from-slate-100/80 to-slate-50/40 text-xs font-extrabold text-slate-500 print:bg-slate-100 print:text-slate-600">
                        <th className="w-14 px-5 py-4 text-right font-extrabold">#</th>
                        <th className="px-5 py-4 text-right font-extrabold">الطالب</th>
                        <th className="px-5 py-4 text-center font-extrabold">نقاط XP</th>
                        <th className="px-5 py-4 text-center font-extrabold">كتب مُنهاة</th>
                        <th className="px-5 py-4 text-center font-extrabold">مباريات شطرنج</th>
                        <th className="px-5 py-4 text-center font-extrabold">دقائق تركيز</th>
                        <th className="px-5 py-4 text-center font-extrabold">آخر نشاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((s, i) => (
                        <tr key={i} className="border-t border-slate-50 transition hover:bg-slate-50/70">
                          <td className="px-5 py-3.5">
                            <span className={`grid h-8 w-8 place-items-center rounded-lg font-head text-sm font-black tabular-nums ${RANK_TILE[i] || "bg-slate-50 text-slate-400 ring-1 ring-slate-100 print:ring-slate-200"}`}>{i + 1}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-3">
                              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGrad(s.name)} text-xs font-black text-white shadow-md ring-2 ring-white print:bg-slate-100 print:text-slate-600 print:shadow-none print:ring-slate-200`}>{s.name?.[0] || "؟"}</span>
                              <span className="min-w-0">
                                <span className="block font-head font-extrabold text-slate-800">{s.name}</span>
                                <span className="mt-1 hidden h-1 w-20 overflow-hidden rounded-full bg-slate-100 print:hidden xl:block">
                                  <span className="block h-full rounded-full ft-grad-bar" style={{ width: `${Math.max(4, Math.round((s.xp / maxXp) * 100))}%` }} />
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-head text-base font-black text-slate-900 tabular-nums">{s.xp}</td>
                          <td className="px-5 py-3.5 text-center font-bold text-slate-600 tabular-nums">{s.books}</td>
                          <td className="px-5 py-3.5 text-center font-bold text-slate-600 tabular-nums">{s.chess}</td>
                          <td className="px-5 py-3.5 text-center font-bold text-slate-600 tabular-nums">{s.focus}</td>
                          <td className="px-5 py-3.5 text-center text-xs font-bold text-slate-400 tabular-nums" dir="ltr">
                            {s.lastActive ? String(s.lastActive).slice(0, 10) : "·"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="mt-8 text-center text-[11px] font-semibold text-slate-400 print:mt-4 print:text-slate-500">
          تقرير صادر من منصة مفكري المستقبل{schoolName ? ` · ${schoolName}` : ""}
        </p>
      </div>
    </Layout>
  );
}
