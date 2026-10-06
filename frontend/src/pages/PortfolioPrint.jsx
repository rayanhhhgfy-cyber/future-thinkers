import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import {
  BookOpen, Swords, Trophy, Timer, Zap, Award, ShieldCheck,
  GraduationCap, FolderKanban, Printer, ArrowRight, Sparkles, UserRound,
} from "lucide-react";

/* تصدير ملف الإنجاز · printable A4 achievement file for a student.
   Standalone page (no app chrome) so the browser's "save as PDF" produces
   a clean document: identity, stats, certificates, badges, projects. */
export default function PortfolioPrint() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    api.get(`/portfolio/${id}`)
      .then((r) => { if (alive) { setData(r.data); setState("ok"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [id]);

  if (state === "loading") {
    return <div className="min-h-screen grid place-items-center text-slate-400 font-bold">جارٍ تجهيز الملف…</div>;
  }
  if (state === "error" || !data?.user) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 mb-3"><UserRound className="w-7 h-7" /></span>
          <h1 className="font-head text-lg font-black text-slate-900">ملف الإنجاز غير متاح</h1>
          <p className="text-sm text-slate-500 mt-2">ربما حُذف الحساب أو أن الرابط غير صحيح.</p>
          <Link to="/library" className="inline-flex mt-5 rounded-2xl bg-slate-900 text-white px-5 py-2.5 text-sm font-extrabold">تصفح المكتبة</Link>
        </div>
      </div>
    );
  }

  const u = data.user;
  const st = data.stats || {};
  const certs = data.certificates || [];
  const badges = data.badges || [];
  const projects = data.projects || [];
  const today = new Date().toISOString().slice(0, 10);

  const stats = [
    { icon: BookOpen, label: "كتاب مُنهى", value: st.books_finished ?? 0 },
    { icon: Swords, label: "تصنيف الشطرنج", value: st.chess_rating ?? 1200 },
    { icon: Trophy, label: "مباريات شطرنج", value: st.chess_games ?? 0 },
    { icon: Timer, label: "دقائق تركيز", value: st.focus_minutes ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-[820px] px-3 print:px-0">
        {/* toolbar · never printed */}
        <div className="print:hidden mb-4 flex items-center justify-between gap-3">
          <Link to={`/portfolio/${id}`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
            <ArrowRight className="w-4 h-4" /> عودة لملف الإنجاز
          </Link>
          <button onClick={() => window.print()} data-testid="print-save-pdf"
            className="pressable inline-flex items-center gap-2 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-lg min-h-[44px]">
            <Printer className="w-4 h-4" /> طباعة / حفظ PDF
          </button>
        </div>

        {/* the sheet */}
        <div className="print-sheet rounded-[1.4rem] bg-white shadow-xl print:shadow-none ring-1 ring-slate-200/70 print:ring-0 overflow-hidden" data-testid="portfolio-print-sheet">
          {/* header */}
          <div className="relative overflow-hidden bg-[#052e26] text-white px-7 py-7 sm:px-9">
            <GraduationCap className="pointer-events-none absolute -left-6 bottom-2 w-44 h-44 text-white/[0.06] rotate-12" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black tracking-wide text-emerald-300">منصة مفكري المستقبل · نادي مفكري المستقبل</p>
                <h1 className="mt-1.5 font-head text-2xl font-black">ملف إنجاز طالب</h1>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-400/10 px-3 py-1.5 text-[11px] font-black text-amber-200">
                <Sparkles className="w-3.5 h-3.5" /> ملف موثّق
              </span>
            </div>
            <div className="relative mt-6 flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 font-head text-2xl font-black text-slate-950 ring-2 ring-white/25">
                {u.name?.[0] || "؟"}
              </span>
              <div className="min-w-0">
                <p className="font-head text-xl font-black truncate">{u.name}</p>
                {u.school && <p className="mt-0.5 text-sm font-semibold text-slate-300 truncate">{u.school}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-black">
                    <Zap className="w-3.5 h-3.5 text-amber-300" /> {u.xp_total ?? 0} نقطة خبرة
                  </span>
                  <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-black">المستوى {u.level ?? 1}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-7 py-6 sm:px-9">
            {/* stats */}
            <div className="grid grid-cols-4 gap-3">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-150 border-slate-100 bg-slate-50/60 px-3 py-4 text-center">
                  <Icon className="mx-auto h-5 w-5 text-teal-700" />
                  <div className="mt-2 font-head text-xl font-black leading-none text-slate-900 tabular-nums">{value}</div>
                  <div className="mt-1.5 text-[10px] font-extrabold text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {/* certificates */}
            <h2 className="mt-7 flex items-center gap-2 font-head text-base font-black text-slate-900">
              <Award className="h-5 w-5 text-amber-500" /> الشهادات ({certs.length})
            </h2>
            {certs.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">لا شهادات بعد.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100">
                {certs.map((c, i) => (
                  <div key={c.code || i} className={`flex items-center gap-3 px-4 py-3 ${i % 2 ? "bg-slate-50/70" : "bg-white"}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Award className="h-4.5 w-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-800">{c.title || "شهادة تقدير"}</p>
                      {c.subtitle && <p className="truncate text-[11px] font-semibold text-slate-400">{c.subtitle}</p>}
                    </div>
                    {c.created_at && <span className="shrink-0 text-[11px] font-bold text-slate-400 tabular-nums" dir="ltr">{String(c.created_at).slice(0, 10)}</span>}
                    {c.code && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"><ShieldCheck className="h-3 w-3" /> {c.code}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* badges */}
            <h2 className="mt-7 flex items-center gap-2 font-head text-base font-black text-slate-900">
              <Sparkles className="h-5 w-5 text-teal-600" /> الأوسمة ({badges.length})
            </h2>
            {badges.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">لا أوسمة بعد.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {badges.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-2 text-xs font-extrabold text-teal-800 ring-1 ring-teal-100">
                    <Award className="h-3.5 w-3.5" /> {b}
                  </span>
                ))}
              </div>
            )}

            {/* projects */}
            <h2 className="mt-7 flex items-center gap-2 font-head text-base font-black text-slate-900">
              <FolderKanban className="h-5 w-5 text-indigo-500" /> المشاريع ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">لا مشاريع منشورة بعد.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><FolderKanban className="h-4.5 w-4.5" /></span>
                    <p className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-800">{p.title}</p>
                    {p.status && <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600">{p.status}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 border-t border-dashed border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-400">
              <span>صادر من منصة مفكري المستقبل · يمكن التحقق من الشهادات برموزها عبر المنصة</span>
              <span className="tabular-nums" dir="ltr">{today}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
