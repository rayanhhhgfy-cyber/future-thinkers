import React, { useCallback, useEffect, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClipboardList, Printer, Users, Zap, BookOpen, Swords, Timer,
  ShieldAlert, GraduationCap, Search, Loader2,
} from "lucide-react";

/* تقرير المدرسة · a teacher/admin snapshot of their school: headline totals
   plus a per-student activity table, ready to print. Students get a polite
   access-denied card instead of an error. */
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
          <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center ft-shadow animate-fade-up">
            <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500"><ShieldAlert className="h-7 w-7" /></span>
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
          <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center ft-shadow animate-fade-up">
            <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><ClipboardList className="h-7 w-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">تعذر تحميل التقرير</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">حدثت مشكلة أثناء إعداد التقرير · حاول مرة أخرى بعد قليل.</p>
            <Button onClick={() => { setState("loading"); load(schoolParam); }} className="mt-5 min-h-[44px] rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold text-white">
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

  const totalTiles = [
    { icon: Users, label: "طلاب المدرسة", value: Number(totals.students ?? totals.students_count ?? students.length) },
    { icon: Zap, label: "مجموع نقاط الخبرة", value: Number(totals.xp ?? totals.total_xp ?? students.reduce((a, s) => a + s.xp, 0)) },
    { icon: BookOpen, label: "كتب مُنهاة", value: Number(totals.books ?? totals.books_finished ?? students.reduce((a, s) => a + s.books, 0)) },
    { icon: Swords, label: "مباريات شطرنج", value: Number(totals.chess_games ?? totals.chess ?? students.reduce((a, s) => a + s.chess, 0)) },
    { icon: Timer, label: "دقائق تركيز", value: Number(totals.focus_minutes ?? totals.focus ?? students.reduce((a, s) => a + s.focus, 0)) },
  ];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6 sm:pt-11 lg:pb-16 print:max-w-none print:py-4">
        {/* header */}
        <header className="rounded-3xl border border-slate-100 bg-white p-6 ft-shadow animate-fade-up sm:p-8 print:border-slate-200 print:p-5 print:shadow-none">
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-100">
              <ClipboardList className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="mb-1.5 inline-flex rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-400 ring-1 ring-slate-100">تقرير أداء رسمي</span>
              <h1 className="font-head text-2xl font-black leading-tight text-slate-900 sm:text-3xl">تقرير المدرسة</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <GraduationCap className="h-4 w-4 text-slate-400" /> {schoolName}
              </p>
            </div>
            <Button
              data-testid="class-report-print-btn"
              onClick={() => window.print()}
              className="min-h-[46px] rounded-2xl ft-btn-primary px-5 font-extrabold text-white print:hidden"
            >
              <Printer className="ml-1 h-4 w-4" /> طباعة التقرير
            </Button>
          </div>
        </header>

        {/* admin school switcher */}
        {isStaff && (
          <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-5 ft-shadow animate-fade-up d-1 sm:flex-row sm:items-center sm:p-6 print:hidden">
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
              <Button onClick={applySchool} disabled={reloading} variant="outline" className="min-h-[48px] shrink-0 rounded-2xl bg-white font-extrabold shadow-sm">
                {reloading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Search className="ml-1 h-4 w-4" />}
                عرض
              </Button>
            </div>
          </div>
        )}

        {/* totals */}
        <section aria-label="ملخص النشاط" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5 print:mt-5">
          {totalTiles.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className="rounded-3xl border border-slate-100 bg-white p-5 ft-shadow animate-fade-up print:shadow-none" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100"><Icon className="h-5 w-5" /></span>
              <div className="mt-3 font-head text-2xl font-black leading-none text-slate-900 tabular-nums sm:text-3xl">{value}</div>
              <div className="mt-1.5 text-[11px] font-extrabold text-slate-400">{label}</div>
            </div>
          ))}
        </section>

        {/* top students */}
        <section aria-label="نشاط الطلاب" className="mt-8 animate-fade-up d-1">
          <div className="mb-4 flex items-center justify-between gap-3 px-1">
            <h2 className="font-head text-lg font-extrabold text-slate-900">نشاط الطلاب ({students.length})</h2>
            <span className="hidden text-[11px] font-bold text-slate-400 sm:block">مرتّبون حسب نقاط الخبرة</span>
          </div>

          {students.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center ft-shadow">
              <span className="mb-3 inline-grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100"><GraduationCap className="h-7 w-7" /></span>
              <p className="font-head text-base font-extrabold text-slate-800">لا طلاب مسجلون من هذه المدرسة بعد</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">سيظهر نشاط الطلاب هنا فور انضمامهم وبدء نشاطهم على المنصة.</p>
            </div>
          ) : (
            <>
              {/* mobile · airy list */}
              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white ft-shadow sm:hidden print:hidden">
                <ul className="divide-y divide-slate-50">
                  {sortedStudents.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-4">
                      <span className={`w-6 shrink-0 text-center font-head text-sm font-black tabular-nums ${i === 0 ? "text-amber-500" : i < 3 ? "text-slate-700" : "text-slate-300"}`}>{i + 1}</span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-xs font-black text-slate-600 ring-1 ring-slate-100">{s.name?.[0] || "؟"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-head text-sm font-extrabold text-slate-800">{s.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-400 tabular-nums">
                          {s.books} كتاب · {s.chess} شطرنج · {s.focus} دقيقة تركيز
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

              {/* desktop + print · clean table */}
              <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white ft-shadow sm:block print:block print:rounded-none print:border-slate-300 print:shadow-none">
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full min-w-[720px] text-sm print:min-w-0">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-extrabold text-slate-400 print:bg-slate-100 print:text-slate-600">
                        <th className="w-14 px-5 py-3.5 text-right font-extrabold">#</th>
                        <th className="px-5 py-3.5 text-right font-extrabold">الطالب</th>
                        <th className="px-5 py-3.5 text-center font-extrabold">نقاط XP</th>
                        <th className="px-5 py-3.5 text-center font-extrabold">كتب مُنهاة</th>
                        <th className="px-5 py-3.5 text-center font-extrabold">مباريات شطرنج</th>
                        <th className="px-5 py-3.5 text-center font-extrabold">دقائق تركيز</th>
                        <th className="px-5 py-3.5 text-center font-extrabold">آخر نشاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((s, i) => (
                        <tr key={i} className="border-t border-slate-50 transition hover:bg-slate-50/60">
                          <td className="px-5 py-3.5">
                            <span className={`font-head text-sm font-black tabular-nums ${i === 0 ? "text-amber-500" : i < 3 ? "text-slate-700" : "text-slate-300"}`}>{i + 1}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-xs font-black text-slate-600 ring-1 ring-slate-100">{s.name?.[0] || "؟"}</span>
                              <span className="font-head font-extrabold text-slate-800">{s.name}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center font-black text-slate-900 tabular-nums">{s.xp}</td>
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

        <p className="mt-8 text-center text-[11px] font-semibold text-slate-300 print:mt-4">
          تقرير صادر من منصة مفكري المستقبل{schoolName ? ` · ${schoolName}` : ""}
        </p>
      </div>
    </Layout>
  );
}
