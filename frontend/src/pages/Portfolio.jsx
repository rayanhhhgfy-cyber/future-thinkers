import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen, Swords, Timer, Zap, Award, ShieldCheck, GraduationCap,
  FolderKanban, Share2, Check, Printer, Sparkles, Trophy, CalendarDays,
  UserRound,
} from "lucide-react";

/* ملف الإنجاز · a public, printable portfolio for a student: hero stats,
   verified certificates, badges and shipped projects · one shareable link. */
export default function Portfolio() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setState("loading");
    api.get(`/portfolio/${id}`)
      .then((r) => { if (alive) { setData(r.data?.user ? { ...r.data, ...r.data.user } : r.data); setState("ok"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [id]);

  const share = async () => {
    const url = `${window.location.origin}/portfolio/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("نُسخ رابط ملف الإنجاز ✓");
      setTimeout(() => setCopied(false), 1600);
    } catch { toast.error("تعذّرت النسخ · انسخ الرابط من شريط العنوان"); }
  };

  if (state === "loading") return <Layout><PageLoader /></Layout>;

  if (state === "error" || !data) {
    return (
      <Layout>
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 mb-3"><UserRound className="w-7 h-7" /></span>
            <h2 className="font-head text-lg font-black text-slate-900">ملف الإنجاز غير متاح</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">ربما حُذف الحساب أو أن الرابط غير صحيح.</p>
            <Link to="/library" className="pressable inline-flex items-center gap-2 mt-5 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold min-h-[44px] text-white">
              تصفح المكتبة
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const name = data.name || "طالب متميز";
  const school = data.school || data.school_name || "";
  const level = data.level ?? null;
  const xp = Number(data.xp ?? data.total_xp ?? 0);
  const books = Number(data.books_finished ?? data.books_count ?? data.books ?? 0);
  const chessRating = data.chess_rating ?? data.chess?.rating ?? null;
  const chessGames = Number(data.chess_games ?? data.chess?.games ?? 0);
  const focusMinutes = Number(data.focus_minutes ?? data.focus?.minutes ?? 0);
  const certs = Array.isArray(data.certificates) ? data.certificates : [];
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];

  const stats = [
    { icon: BookOpen, label: "كتاب مُنهى", value: books, tint: "bg-emerald-50 text-emerald-600" },
    { icon: Swords, label: "تصنيف الشطرنج", value: chessRating ?? "·", tint: "bg-indigo-50 text-indigo-600" },
    { icon: Trophy, label: "مباريات شطرنج", value: chessGames, tint: "bg-amber-50 text-amber-600" },
    { icon: Timer, label: "دقائق تركيز", value: focusMinutes, tint: "bg-sky-50 text-sky-600" },
  ];

  return (
    <Layout>
      <div className="print:bg-white">
        {/* hero */}
        <div className="ft-hero-gradient relative overflow-hidden text-white print:border-b print:border-slate-200 print:text-slate-900 print:![background-image:none]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.24),transparent_34%),radial-gradient(circle_at_84%_90%,rgba(255,255,255,0.13),transparent_32%)] print:hidden" aria-hidden="true" />
          <div className="pointer-events-none absolute -top-24 right-[15%] w-80 h-80 rounded-full bg-amber-400/15 blur-3xl print:hidden" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 left-[10%] w-80 h-80 rounded-full bg-white/10 blur-3xl print:hidden" aria-hidden="true" />
          <GraduationCap className="pointer-events-none absolute -left-8 bottom-4 w-64 h-64 text-white/[0.06] rotate-12 print:hidden" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1240px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-[4.5rem]">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-8 lg:gap-10">
              <div className="relative mx-auto shrink-0 sm:mx-0">
                <div className="absolute -inset-3 rounded-[2.6rem] border border-amber-300/40 bg-white/5 shadow-[0_0_0_10px_rgba(255,255,255,0.04)] backdrop-blur-sm print:hidden" aria-hidden="true" />
                <div className="absolute -inset-1.5 rounded-[2.2rem] bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 opacity-80 print:hidden" aria-hidden="true" />
                <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] ft-icon-tile font-head text-5xl font-black shadow-2xl ring-4 ring-white/20 sm:h-32 sm:w-32 lg:h-36 lg:w-36 print:ring-slate-200">
                  {name?.[0] || "؟"}
                </div>
                {level != null && (
                  <span className="absolute -bottom-3 right-1/2 translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-l from-amber-300 to-yellow-500 px-3.5 py-1.5 text-[11px] font-black text-slate-950 shadow-xl shadow-amber-950/30 ring-2 ring-white/70 sm:-right-3 sm:translate-x-0 print:border print:border-amber-500">
                    المستوى {level}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 bg-white/10 px-3.5 py-1.5 text-[11px] font-extrabold shadow-inner backdrop-blur print:border-slate-300 print:bg-transparent">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 print:text-amber-600" /> ملف إنجاز موثّق
                </div>
                <h1 className="mt-4 font-head text-4xl font-black leading-[1.08] sm:text-5xl lg:text-6xl">{name}</h1>
                {school && <p className="mt-2.5 font-semibold text-slate-100/85 print:text-slate-500">{school}</p>}
                <div className="mt-5 inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 shadow-lg backdrop-blur print:border-slate-200">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400 text-slate-950 shadow"><Zap className="h-4 w-4" /></span>
                  <span className="font-head text-xl font-black tabular-nums">{xp}</span>
                  <span className="text-xs font-bold text-slate-200 print:text-slate-500">نقطة خبرة</span>
                </div>
              </div>
              <div className="flex shrink-0 justify-center gap-2.5 print:hidden sm:flex-col">
                <Button data-testid="portfolio-share-btn" onClick={share} className="min-h-[46px] rounded-2xl bg-white px-5 font-extrabold text-slate-900 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-amber-50">
                  {copied ? <Check className="ml-1 h-4 w-4 text-emerald-600" /> : <Share2 className="ml-1 h-4 w-4" />}
                  {copied ? "نُسخ!" : "مشاركة الملف"}
                </Button>
                <Link to={`/portfolio/${id}/print`} data-testid="portfolio-export-btn" className="inline-flex items-center justify-center glass min-h-[46px] rounded-2xl border border-white/30 bg-white/10 px-5 font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/20">
                  <Printer className="ml-1 h-4 w-4" /> تصدير PDF
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-300/80 to-transparent print:hidden sm:inset-x-16" aria-hidden="true" />
        </div>

        <div className="relative mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-11 lg:px-10 print:py-4">
          {/* stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:-mt-20 lg:grid-cols-4 print:mt-0">
            {stats.map(({ icon: Icon, label, value, tint }, i) => (
              <div key={label} className="group relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/95 p-5 ft-shadow-lg backdrop-blur animate-fade-up print:shadow-none sm:p-6" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="absolute inset-x-5 top-0 h-1 rounded-b-full ft-grad-bar opacity-90" aria-hidden="true" />
                <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl shadow-inner ${tint}`}><Icon className="h-6 w-6" /></span>
                <div className="mt-4 font-head text-3xl font-black leading-none text-slate-900 tabular-nums sm:text-4xl">{value}</div>
                <div className="mt-2 text-xs font-extrabold text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {/* certificates */}
          <section className="mt-12 print:mt-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="flex items-center gap-2.5 font-head text-2xl font-black text-slate-900 sm:text-[1.7rem]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-amber-300 shadow-lg shadow-amber-600/20"><Award className="h-6 w-6" /></span>
                الشهادات ({certs.length})
              </h2>
              <span className="hidden h-1 w-28 rounded-full bg-gradient-to-l from-amber-300 via-yellow-500 to-amber-700 sm:block" aria-hidden="true" />
            </div>
            {certs.length === 0 ? (
              <p className="text-sm text-slate-400 mt-4">لا شهادات بعد · ستظهر هنا فور إصدارها.</p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {certs.map((c, i) => {
                  const code = c.code || c.verify_code || "";
                  const dateStr = (c.date || c.created_at) ? String(c.date || c.created_at).slice(0, 10) : "";
                  const card = (
                    <div className="relative h-full overflow-hidden rounded-[1.15rem] bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.2),transparent_38%),linear-gradient(160deg,#020617,#172554_58%,#052e2b)] text-white">
                      <div className="pointer-events-none absolute inset-2 rounded-[0.9rem] border border-amber-300/60" />
                      <div className="pointer-events-none absolute inset-[1.15rem] rounded-[0.7rem] border border-amber-200/20" />
                      <div className="relative border-b border-amber-300/30 bg-white/[0.04] px-5 py-3 text-center backdrop-blur">
                        <span className="font-head text-[10px] font-black tracking-[0.18em] text-amber-200">منصة مفكري المستقبل</span>
                      </div>
                      <div className="relative px-5 py-5 text-center sm:py-6">
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-amber-300/50 bg-amber-400/10 shadow-[0_0_28px_rgba(245,158,11,0.25)]"><Award className="h-6 w-6 text-amber-300" /></span>
                        <div className="mt-3 font-head text-base font-extrabold leading-snug text-amber-50 line-clamp-2">{c.title_line || c.title || "شهادة تقدير"}</div>
                        {c.subtitle && <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300 line-clamp-1">{c.subtitle}</p>}
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 backdrop-blur">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300">
                            <CalendarDays className="h-3 w-3 text-amber-300" /><span className="tabular-nums" dir="ltr">{dateStr}</span>
                          </span>
                          {code ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300"><ShieldCheck className="h-3 w-3" /> {code}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300"><ShieldCheck className="h-3 w-3" /> موثّقة</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  const shell = "group relative block rounded-[1.35rem] bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-800 p-[3px] shadow-[0_22px_44px_-18px_rgba(146,64,14,0.65)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_54px_-18px_rgba(146,64,14,0.75)] print:shadow-none";
                  return code ? (
                    <Link key={c.id || code || i} to={`/verify/${encodeURIComponent(code)}`} className={shell} title="التحقق من الشهادة">{card}</Link>
                  ) : (
                    <div key={c.id || i} className={shell}>{card}</div>
                  );
                })}
              </div>
            )}
          </section>

          {/* badges */}
          <section className="mt-12 print:mt-7">
            <h2 className="flex items-center gap-2.5 font-head text-2xl font-black text-slate-900">
              <span className="grid h-11 w-11 place-items-center rounded-2xl ft-bg-soft ft-text-accent ring-1 ft-ring-accent"><Sparkles className="h-6 w-6" /></span>
              الأوسمة ({badges.length})
            </h2>
            {badges.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">لا أوسمة بعد.</p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {badges.map((b, i) => {
                  const label = typeof b === "string" ? b : (b.label || b.name || b.title || "وسام");
                  return (
                    <span key={b.id || i} className="inline-flex items-center gap-1.5 rounded-full ft-chip px-4 py-2.5 text-sm font-extrabold shadow-sm ring-1 ring-white/70">
                      <Award className="h-4 w-4" /> {label}
                    </span>
                  );
                })}
              </div>
            )}
          </section>

          {/* projects */}
          <section className="mt-12 print:mt-7">
            <h2 className="flex items-center gap-2.5 font-head text-2xl font-black text-slate-900">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><FolderKanban className="h-6 w-6" /></span>
              المشاريع ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">لا مشاريع منشورة بعد.</p>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {projects.map((p, i) => {
                  const title = p.title || p.name || "مشروع";
                  const inner = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-head font-extrabold leading-snug text-slate-900 sm:text-lg">{title}</h3>
                        {p.status && <span className="shrink-0 rounded-full border ft-border-accent ft-bg-soft px-2.5 py-1 text-[11px] font-extrabold ft-text-accent">{p.status}</span>}
                      </div>
                      {p.description && <p className="mt-2.5 text-sm leading-relaxed text-slate-500 line-clamp-3">{p.description}</p>}
                      {(p.category || p.members_count != null) && (
                        <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          {p.category && <span className="rounded-full bg-slate-950 px-2.5 py-1 text-amber-200">{p.category}</span>}
                          {p.members_count != null && <span>{p.members_count} عضو</span>}
                        </div>
                      )}
                    </>
                  );
                  const cls = "group relative block overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-6 ft-shadow transition duration-300 hover:-translate-y-1 hover:border-indigo-100 hover:shadow-xl print:shadow-none";
                  return p.id ? (
                    <Link key={p.id} to={`/ventures/${p.id}`} className={cls}>{inner}</Link>
                  ) : (
                    <div key={i} className={cls}>{inner}</div>
                  );
                })}
              </div>
            )}
          </section>

          <p className="text-center text-[11px] font-semibold text-slate-300 mt-12 print:mt-6">
            ملف إنجاز صادر من منصة مفكري المستقبل · الشهادات قابلة للتحقق برمزها
          </p>
        </div>
      </div>
    </Layout>
  );
}
