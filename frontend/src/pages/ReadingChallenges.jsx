import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { toast } from "sonner";
import { BookOpen, Plus, Users, Target, Clock, Crown, CalendarRange } from "lucide-react";

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
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient px-6 py-8 sm:px-10 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold"><BookOpen className="w-3.5 h-3.5" /> اقرأوا معاً، تنافسوا معاً</span>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-4">تحديات القراءة الجماعية</h1>
          <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl">أطلق تحدي صفحات وانضم مع زملائك · صفحاتك تُحتسب تلقائياً أثناء القراءة في المتصفح.</p>
          <BookOpen className="absolute -left-6 -bottom-8 w-44 h-44 text-white/10" />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6 mb-8">
          <h2 className="font-head font-bold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> أطلق تحدّياً جديداً</h2>
          <div className="grid sm:grid-cols-[1fr_140px_120px_auto] gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="اسم التحدي: ماراثون أكتوبر" className={inputCls} />
            <input type="number" min={50} max={100000} value={form.target_pages} onChange={(e) => setForm({ ...form, target_pages: e.target.value })} className={inputCls} />
            <select value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className={inputCls}>
              {[3, 7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} يوم</option>)}
            </select>
            <button onClick={create} disabled={creating} className="pressable px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">{creating ? "…" : "إطلاق"}</button>
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-slate-400"><span>الاسم</span><span>هدف الصفحات</span><span>المدة</span></div>
        </div>

        {!items ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={BookOpen} title="لا تحديات جارية" desc="أطلق أول تحدٍّ ودعُ زملاءك" />
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {items.map((c) => {
              const leader = c.members?.[0];
              const finished = leader && leader.pages >= c.target_pages;
              return (
                <section key={c.id} className="animate-fade-up bg-white rounded-[1.8rem] border border-slate-100 ft-shadow p-5 sm:p-6">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Target className="w-5 h-5" /></span>
                    <div className="flex-1 min-w-[180px]">
                      <h3 className="font-head font-extrabold text-slate-900">{c.title}</h3>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {c.target_pages} صفحة</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.member_count} مشارك</span>
                        <span className="flex items-center gap-1"><CalendarRange className="w-3 h-3" /> حتى {c.ends}</span>
                      </div>
                    </div>
                    {finished && <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-extrabold">حُقق الهدف 🏆</span>}
                    {!c.joined && <button onClick={() => join(c.id)} className="pressable px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shrink-0">انضم</button>}
                    {c.joined && <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold shrink-0">مشارك ✓</span>}
                  </div>
                  <div className="mt-4 space-y-2">
                    {(c.members || []).slice(0, 5).map((m, i) => {
                      const pct = Math.min(100, Math.round((m.pages / c.target_pages) * 100));
                      return (
                        <div key={m.user_id} className="flex items-center gap-2.5">
                          <span className={`w-6 text-center text-xs font-black ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>{i === 0 ? <Crown className="w-4 h-4 mx-auto" /> : i + 1}</span>
                          <Link to={`/users/${m.user_id}`} className="text-xs font-bold text-slate-600 w-28 truncate hover:text-emerald-700">{m.name}</Link>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-gradient-to-l from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 w-14 text-left">{m.pages} ص</span>
                        </div>
                      );
                    })}
                    {c.member_count === 0 && <p className="text-xs text-slate-300">لا مشاركين بعد</p>}
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Clock className="w-4 h-4" /> تُحتسب الصفحات تلقائياً من قراءتك داخل الموقع · بدون أي إدخال يدوي.</div>
      </div>
    </Layout>
  );
}
