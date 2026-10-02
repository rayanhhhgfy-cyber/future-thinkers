import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { BookOpen, Plus, Users, Target, Clock, Crown, CalendarRange, Flame } from "lucide-react";

export default function ReadingChallenges() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ title: "", target_pages: 200, days: 7 });
  const [creating, setCreating] = useState(false);
  const load = () => api.get("/reading-challenges").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (form.title.trim().length < 3) return toast.error("عنوان التحدي قصير");
    setCreating(true);
    try { await api.post("/reading-challenges", { ...form, target_pages: Number(form.target_pages), days: Number(form.days) }); setForm({ title: "", target_pages: 200, days: 7 }); load(); toast.success("أُطلق التحدي · أنت أول المشاركين 🚀"); }
    catch (e) { toast.error(apiErr(e)); }
    setCreating(false);
  };
  const join = async (id) => {
    try { await api.post(`/reading-challenges/${id}/join`); load(); toast.success("انضممت للتحدي · بالتوفيق 📚"); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const inputCls = "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 lg:px-4 lg:py-3 text-sm lg:text-[15px] outline-none ft-focus-border-accent focus:bg-white transition w-full min-h-[44px]";
  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 lg:py-10 xl:py-12">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-14 xl:px-16 xl:py-16 mb-8 lg:mb-10 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-6 w-80 h-80 rounded-full bg-emerald-300/15 blur-3xl" />
          <BookOpen className="pointer-events-none absolute -left-8 -bottom-10 w-52 h-52 text-white/[0.07] -rotate-12" />
          <Flame className="pointer-events-none absolute left-8 top-6 w-10 h-10 text-amber-300/30 animate-float hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 text-white text-xs font-bold backdrop-blur-sm"><BookOpen className="w-3.5 h-3.5" /> اقرأوا معاً، تنافسوا معاً</span>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-extrabold text-white mt-4 leading-tight">تحديات القراءة <span className="animate-gradient-text bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">الجماعية</span></h1>
            <p className="text-white/75 text-sm sm:text-base lg:text-lg mt-3 max-w-xl lg:max-w-2xl xl:max-w-3xl leading-relaxed">أطلق تحدي صفحات وانضم مع زملائك · صفحاتك تُحتسب تلقائياً أثناء القراءة في المتصفح.</p>
            {items && items.length > 0 && (
              <div className="mt-6 lg:mt-8 flex flex-wrap gap-2 lg:gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Target className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-amber-300" /> {items.length} تحدٍّ جارٍ</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Users className="w-3.5 h-3.5 lg:w-5 lg:h-5 ft-text-accent-bright" /> {items.reduce((s, c) => s + (c.member_count || 0), 0)} مشارك</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-5 lg:py-2.5 lg:text-sm rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm min-h-[44px]"><Flame className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-orange-300" /> {items.reduce((s, c) => s + (c.target_pages || 0), 0)} صفحة هدف</span>
              </div>
            )}
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 gap-5 xl:gap-6 mb-8 xl:mb-10">
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl ft-bg-soft ft-text-accent grid place-items-center shrink-0"><Target className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.length}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">تحدٍّ جارٍ</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Users className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.reduce((s, c) => s + (c.member_count || 0), 0)}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">مشارك في التحديات</div>
              </div>
            </div>
            <div className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow p-6 xl:p-7 flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Flame className="w-7 h-7" /></span>
              <div className="min-w-0">
                <div className="font-head text-3xl xl:text-4xl font-extrabold text-slate-900 leading-none">{items.reduce((s, c) => s + (c.target_pages || 0), 0)}</div>
                <div className="text-xs xl:text-sm font-bold text-slate-400 mt-1.5">صفحة هدف إجمالية</div>
              </div>
            </div>
          </div>
        )}

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 lg:p-7 xl:p-8 mb-8 lg:mb-10">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400" />
          <h2 className="font-head font-extrabold text-slate-900 text-lg lg:text-xl mb-5 lg:mb-6 flex items-center gap-2.5"><span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl ft-icon-tile grid place-items-center shadow-md"><Plus className="w-5 h-5 lg:w-6 lg:h-6" /></span> أطلق تحدّياً جديداً</h2>
          <div className="grid sm:grid-cols-[1fr_150px_130px_auto] lg:grid-cols-[1fr_180px_160px_auto] xl:grid-cols-[1fr_200px_170px_auto] gap-3 lg:gap-4 items-end">
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">الاسم</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="اسم التحدي: ماراثون أكتوبر" className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">هدف الصفحات</span>
              <input type="number" min={50} max={100000} value={form.target_pages} onChange={(e) => setForm({ ...form, target_pages: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">المدة</span>
              <select value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className={inputCls}>
                {[3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} يوم</option>)}
              </select>
            </label>
            <button onClick={create} disabled={creating} className="pressable h-[46px] lg:h-[52px] px-7 lg:px-9 rounded-xl ft-btn-primary shadow-lg text-sm lg:text-base font-bold disabled:opacity-50 min-w-[44px]">{creating ? "…" : "إطلاق"}</button>
          </div>
        </div>

        {!items ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={BookOpen} title="لا تحديات جارية" desc="أطلق أول تحدٍّ ودعُ زملاءك" />
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-5 lg:mb-7">
              <span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Flame className="w-5 h-5 lg:w-6 lg:h-6" /></span>
              <h2 className="font-head font-extrabold text-slate-900 text-lg lg:text-2xl">التحديات الجارية</h2>
              <span className="text-[11px] lg:text-xs font-bold px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-full bg-slate-100 text-slate-500">{items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 lg:gap-6 xl:gap-7">
              {items.map((c, ci) => {
                const leader = c.members?.[0];
                const finished = leader && leader.pages >= c.target_pages;
                const leaderPct = leader ? Math.min(100, Math.round((leader.pages / c.target_pages) * 100)) : 0;
                const daysLeft = (() => { const t = Date.parse(c.ends); if (Number.isNaN(t)) return null; const d = Math.ceil((t - Date.now()) / 86400000); return d >= 0 ? d : null; })();
                const R = 26, CIRC = 2 * Math.PI * R;
                return (
                  <section key={c.id} className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] lg:rounded-[2rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 lg:p-7 flex flex-col" style={{ animationDelay: `${Math.min(ci, 8) * 60}ms` }}>
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400 opacity-80" />
                    <div className="flex items-start gap-3.5 lg:gap-4">
                      <div className="relative w-16 h-16 lg:w-20 lg:h-20 shrink-0">
                        <svg viewBox="0 0 64 64" className="w-16 h-16 lg:w-20 lg:h-20 -rotate-90">
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-slate-100" />
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-emerald-500 transition-all duration-700" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - leaderPct / 100)} />
                        </svg>
                        <span className="absolute inset-0 grid place-items-center text-[11px] lg:text-sm font-black text-emerald-700">{leaderPct}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-head font-extrabold text-slate-900 lg:text-lg leading-snug">{c.title}</h3>
                        <div className="text-[11px] lg:text-xs text-slate-400 mt-1.5 lg:mt-2 flex gap-x-3 gap-y-1 flex-wrap">
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {c.target_pages} صفحة</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.member_count} مشارك</span>
                          <span className="flex items-center gap-1"><CalendarRange className="w-3 h-3" /> حتى {c.ends}</span>
                          {daysLeft !== null && <span className="flex items-center gap-1 font-bold text-amber-600"><Flame className="w-3 h-3" /> باقي {daysLeft} يوم</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 lg:mt-5 flex items-center gap-2 flex-wrap">
                      {finished && <span className="px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-gradient-to-l from-amber-100 to-yellow-100 ring-1 ring-amber-200 text-amber-700 text-[11px] font-extrabold">حُقق الهدف 🏆</span>}
                      {leader && <span className="inline-flex items-center gap-1 px-2.5 py-1 lg:px-3 lg:py-1.5 lg:text-xs rounded-full bg-amber-50 ring-1 ring-amber-100 text-amber-600 text-[11px] font-bold"><Crown className="w-3 h-3" /> المتصدر: {leader.name}</span>}
                      <span className="flex-1" />
                      {!c.joined && <button onClick={() => join(c.id)} className="pressable h-10 lg:h-11 px-5 lg:px-6 rounded-xl bg-gradient-to-l from-slate-900 to-slate-700 hover:from-emerald-600 hover:to-teal-600 shadow-md text-white text-xs lg:text-sm font-bold transition-colors min-w-[44px]">انضم</button>}
                      {c.joined && <span className="px-3.5 py-2 lg:px-4 lg:py-2.5 lg:text-xs rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-[11px] font-extrabold shadow-md shadow-emerald-500/25 shrink-0">مشارك ✓</span>}
                    </div>
                    <div className="mt-5 lg:mt-6 space-y-1.5 lg:space-y-2 flex-1">
                      {(c.members || []).slice(0, 5).map((m, i) => {
                        const pct = Math.min(100, Math.round((m.pages / c.target_pages) * 100));
                        return (
                          <div key={m.user_id} className={`flex items-center gap-2.5 lg:gap-3 rounded-2xl px-2 py-1.5 lg:px-3 lg:py-2 ${i === 0 ? "bg-amber-50/70 ring-1 ring-amber-100" : ""}`}>
                            <span className={`w-6 lg:w-7 text-center text-xs lg:text-sm font-black shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i === 0 ? <Crown className="w-4 h-4 lg:w-5 lg:h-5 mx-auto" /> : i + 1}</span>
                            <span className={`w-8 h-8 lg:w-9 lg:h-9 rounded-full grid place-items-center text-[11px] lg:text-xs font-black text-white shrink-0 ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" : i === 2 ? "bg-gradient-to-br from-orange-300 to-amber-500" : "ft-icon-tile"}`}>{m.name?.[0] || "؟"}</span>
                            <Link to={`/profile/${m.user_id}`} className="text-xs lg:text-sm font-bold text-slate-600 w-24 sm:w-28 lg:w-32 truncate ft-hover-text-accent shrink-0 min-h-[44px] inline-flex items-center">{m.name}</Link>
                            <div className="flex-1 h-2 lg:h-2.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-gradient-to-l from-amber-400 to-orange-400" : "ft-grad-bar"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] lg:text-xs font-bold text-slate-400 w-14 lg:w-16 text-left shrink-0">{m.pages} ص</span>
                          </div>
                        );
                      })}
                      {c.member_count === 0 && <p className="text-xs lg:text-sm text-slate-300">لا مشاركين بعد</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-8 lg:mt-10 flex items-center gap-3 rounded-2xl lg:rounded-[1.4rem] ft-bg-soft ring-1 ft-ring-accent px-4 py-3.5 lg:px-6 lg:py-5 text-xs lg:text-sm font-semibold ft-text-accent"><span className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-white ft-text-accent grid place-items-center shrink-0 shadow-sm"><Clock className="w-4 h-4 lg:w-5 lg:h-5" /></span> تُحتسب الصفحات تلقائياً من قراءتك داخل الموقع · بدون أي إدخال يدوي.</div>
      </div>
    </Layout>
  );
}
