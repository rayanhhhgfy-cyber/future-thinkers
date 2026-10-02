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

  const inputCls = "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white transition w-full";
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-6 py-9 sm:px-10 sm:py-11 mb-8 ft-shadow-lg">
          <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-6 w-80 h-80 rounded-full bg-emerald-300/15 blur-3xl" />
          <BookOpen className="pointer-events-none absolute -left-8 -bottom-10 w-52 h-52 text-white/[0.07] -rotate-12" />
          <Flame className="pointer-events-none absolute left-8 top-6 w-10 h-10 text-amber-300/30 animate-float hidden sm:block" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/25 text-white text-xs font-bold backdrop-blur-sm"><BookOpen className="w-3.5 h-3.5" /> اقرأوا معاً، تنافسوا معاً</span>
            <h1 className="font-head text-4xl sm:text-5xl font-extrabold text-white mt-4 leading-tight">تحديات القراءة <span className="animate-gradient-text bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">الجماعية</span></h1>
            <p className="text-white/75 text-sm sm:text-base mt-3 max-w-xl leading-relaxed">أطلق تحدي صفحات وانضم مع زملائك · صفحاتك تُحتسب تلقائياً أثناء القراءة في المتصفح.</p>
            {items && items.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm"><Target className="w-3.5 h-3.5 text-amber-300" /> {items.length} تحدٍّ جارٍ</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm"><Users className="w-3.5 h-3.5 text-emerald-300" /> {items.reduce((s, c) => s + (c.member_count || 0), 0)} مشارك</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-white backdrop-blur-sm"><Flame className="w-3.5 h-3.5 text-orange-300" /> {items.reduce((s, c) => s + (c.target_pages || 0), 0)} صفحة هدف</span>
              </div>
            )}
          </div>
        </div>

        <div className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 mb-8">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400" />
          <h2 className="font-head font-extrabold text-slate-900 mb-5 flex items-center gap-2.5"><span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-md shadow-emerald-500/25"><Plus className="w-5 h-5" /></span> أطلق تحدّياً جديداً</h2>
          <div className="grid sm:grid-cols-[1fr_150px_130px_auto] gap-3 items-end">
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
            <button onClick={create} disabled={creating} className="pressable h-[46px] px-7 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 text-white text-sm font-bold disabled:opacity-50">{creating ? "…" : "إطلاق"}</button>
          </div>
        </div>

        {!items ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={BookOpen} title="لا تحديات جارية" desc="أطلق أول تحدٍّ ودعُ زملاءك" />
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Flame className="w-5 h-5" /></span>
              <h2 className="font-head font-extrabold text-slate-900 text-lg">التحديات الجارية</h2>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{items.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {items.map((c, ci) => {
                const leader = c.members?.[0];
                const finished = leader && leader.pages >= c.target_pages;
                const leaderPct = leader ? Math.min(100, Math.round((leader.pages / c.target_pages) * 100)) : 0;
                const daysLeft = (() => { const t = Date.parse(c.ends); if (Number.isNaN(t)) return null; const d = Math.ceil((t - Date.now()) / 86400000); return d >= 0 ? d : null; })();
                const R = 26, CIRC = 2 * Math.PI * R;
                return (
                  <section key={c.id} className="animate-fade-up relative overflow-hidden bg-white rounded-[1.8rem] border border-slate-100 ft-shadow hover-lift p-5 sm:p-6 flex flex-col" style={{ animationDelay: `${Math.min(ci, 8) * 60}ms` }}>
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-500 via-teal-400 to-amber-400 opacity-80" />
                    <div className="flex items-start gap-3.5">
                      <div className="relative w-16 h-16 shrink-0">
                        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" className="stroke-slate-100" />
                          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-emerald-500 transition-all duration-700" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - leaderPct / 100)} />
                        </svg>
                        <span className="absolute inset-0 grid place-items-center text-[11px] font-black text-emerald-700">{leaderPct}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-head font-extrabold text-slate-900 leading-snug">{c.title}</h3>
                        <div className="text-[11px] text-slate-400 mt-1.5 flex gap-x-3 gap-y-1 flex-wrap">
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {c.target_pages} صفحة</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.member_count} مشارك</span>
                          <span className="flex items-center gap-1"><CalendarRange className="w-3 h-3" /> حتى {c.ends}</span>
                          {daysLeft !== null && <span className="flex items-center gap-1 font-bold text-amber-600"><Flame className="w-3 h-3" /> باقي {daysLeft} يوم</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {finished && <span className="px-2.5 py-1 rounded-full bg-gradient-to-l from-amber-100 to-yellow-100 ring-1 ring-amber-200 text-amber-700 text-[11px] font-extrabold">حُقق الهدف 🏆</span>}
                      {leader && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 ring-1 ring-amber-100 text-amber-600 text-[11px] font-bold"><Crown className="w-3 h-3" /> المتصدر: {leader.name}</span>}
                      <span className="flex-1" />
                      {!c.joined && <button onClick={() => join(c.id)} className="pressable h-10 px-5 rounded-xl bg-gradient-to-l from-slate-900 to-slate-700 hover:from-emerald-600 hover:to-teal-600 shadow-md text-white text-xs font-bold transition-colors">انضم</button>}
                      {c.joined && <span className="px-3.5 py-2 rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-[11px] font-extrabold shadow-md shadow-emerald-500/25 shrink-0">مشارك ✓</span>}
                    </div>
                    <div className="mt-5 space-y-1.5 flex-1">
                      {(c.members || []).slice(0, 5).map((m, i) => {
                        const pct = Math.min(100, Math.round((m.pages / c.target_pages) * 100));
                        return (
                          <div key={m.user_id} className={`flex items-center gap-2.5 rounded-2xl px-2 py-1.5 ${i === 0 ? "bg-amber-50/70 ring-1 ring-amber-100" : ""}`}>
                            <span className={`w-6 text-center text-xs font-black shrink-0 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i === 0 ? <Crown className="w-4 h-4 mx-auto" /> : i + 1}</span>
                            <span className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-black text-white shrink-0 bg-gradient-to-br ${i === 0 ? "from-amber-400 to-orange-500" : i === 1 ? "from-slate-400 to-slate-500" : i === 2 ? "from-orange-300 to-amber-500" : "from-emerald-500 to-teal-600"}`}>{m.name?.[0] || "؟"}</span>
                            <Link to={`/profile/${m.user_id}`} className="text-xs font-bold text-slate-600 w-24 sm:w-28 truncate hover:text-emerald-700 shrink-0">{m.name}</Link>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-l ${i === 0 ? "from-amber-400 to-orange-400" : "from-emerald-500 to-teal-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 w-14 text-left shrink-0">{m.pages} ص</span>
                          </div>
                        );
                      })}
                      {c.member_count === 0 && <p className="text-xs text-slate-300">لا مشاركين بعد</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50/70 ring-1 ring-emerald-100 px-4 py-3.5 text-xs font-semibold text-emerald-800"><span className="w-8 h-8 rounded-xl bg-white text-emerald-600 grid place-items-center shrink-0 shadow-sm"><Clock className="w-4 h-4" /></span> تُحتسب الصفحات تلقائياً من قراءتك داخل الموقع · بدون أي إدخال يدوي.</div>
      </div>
    </Layout>
  );
}
