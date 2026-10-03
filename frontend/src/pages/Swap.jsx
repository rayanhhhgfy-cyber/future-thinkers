import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeftRight, Plus, Search, MessageCircle, Trash2, CheckCheck,
  Loader2, BookCopy, School, RefreshCw, Repeat2,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* تبادل الكتب الورقية · a physical book swap board between members. */
export default function Swap() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", condition: "جيدة", note: "", want: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/growth/swap", { params: { q, mine: tab === "mine" } });
      setItems(data);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [q, tab]); // eslint-disable-line

  if (!items) return <Layout><PageLoader /></Layout>;

  const create = async () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان الكتاب"); return; }
    setBusy(true);
    try {
      await api.post("/growth/swap", form);
      toast.success("نُشر إعلان التبادل");
      setShowCreate(false);
      setForm({ title: "", author: "", condition: "جيدة", note: "", want: "" });
      setTab("mine");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/growth/swap/${id}`, { status });
      toast.success(status === "exchanged" ? "مبروك التبادل! 🎉" : "أُعيد فتح الإعلان");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/growth/swap/${id}`);
      toast.success("حُذف الإعلان");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const condTint = (c) => c.includes("ممتاز") ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
    : c.includes("جديد") ? "bg-sky-500/10 text-sky-600 ring-sky-500/20"
      : "bg-amber-500/10 text-amber-600 ring-amber-500/20";

  return (
    <Layout>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[28px] ft-navy-gradient grain text-white p-6 sm:p-8 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-teal-400/25 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-teal-200"><Repeat2 className="w-3.5 h-3.5" /> كتابك القديم كنز لغيرك</div>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-3">تبادل الكتب الورقية</h1>
                <p className="text-slate-300 text-sm mt-1.5 max-w-lg leading-relaxed">اعرض كتاباً ورقياً تملكه للتبادل مع أعضاء النادي، ونسّق الاستلام بالرسائل الخاصة داخل المنصة.</p>
              </div>
              <button onClick={() => setShowCreate((s) => !s)} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-teal-400 text-slate-950 text-sm font-extrabold shadow-xl shadow-teal-500/30">
                <Plus className="w-5 h-5" /> اعرض كتاباً
              </button>
            </div>
          </div>
        </FadeUp>

        {showCreate && (
          <FadeUp>
            <div className="mt-5 rounded-[26px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-5 sm:p-6">
              <h3 className="font-head font-extrabold text-slate-900">إعلان تبادل جديد</h3>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الكتاب الورقي" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-teal-400/50 outline-none px-4 py-3 text-sm" />
                <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="المؤلف (اختياري)" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-teal-400/50 outline-none px-4 py-3 text-sm" />
                <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] outline-none px-4 py-3 text-sm">
                  <option>جديد تقريباً</option>
                  <option>ممتازة</option>
                  <option>جيدة</option>
                  <option>مقروء كثيراً</option>
                </select>
                <input value={form.want} onChange={(e) => setForm({ ...form, want: e.target.value })} placeholder="ما الكتاب الذي تبحث عنه بالمقابل؟ (اختياري)" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-teal-400/50 outline-none px-4 py-3 text-sm" />
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ملاحظة (اختياري)" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-teal-400/50 outline-none px-4 py-3 text-sm sm:col-span-2" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={create} disabled={busy} className="pressable h-11 px-6 rounded-2xl bg-teal-600 text-white text-sm font-extrabold shadow-lg shadow-teal-600/30 disabled:opacity-50 inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />} نشر الإعلان</button>
                <button onClick={() => setShowCreate(false)} className="h-11 px-5 rounded-2xl text-sm font-extrabold text-slate-500">إلغاء</button>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-900/[0.05]">
              {[{ id: "all", label: "سوق التبادل", icon: BookCopy }, { id: "mine", label: "إعلاناتي", icon: RefreshCw }].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`pressable inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${tab === t.id ? "bg-white text-teal-700 shadow-md" : "text-slate-500"}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
            <label className="flex-1 min-w-[200px] relative">
              <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن كتاب ورقي…" className="w-full h-12 rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-slate-900/[0.05] focus:ring-2 focus:ring-teal-400/50 outline-none ps-4 pe-11 text-sm ft-shadow" />
            </label>
          </div>
        </FadeUp>

        {items.length === 0 ? (
          <div className="mt-6 rounded-[30px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-10 text-center">
            <span className="w-16 h-16 mx-auto rounded-[22px] bg-gradient-to-br from-teal-500 to-emerald-600 text-white grid place-items-center shadow-xl shadow-teal-500/30"><ArrowLeftRight className="w-8 h-8" /></span>
            <h2 className="font-head font-black text-xl text-slate-900 mt-4">{tab === "mine" ? "لا إعلانات لك بعد" : "السوق فارغ الآن"}</h2>
            <p className="text-sm text-slate-500 mt-1.5">اعرض أول كتاب ورقي للتبادل وابدأ دورة جديدة لكتب النادي.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-6">
            {items.map((s) => (
              <FadeUp key={s.id}>
                <div className="relative overflow-hidden rounded-[26px] p-[1px] bg-gradient-to-br from-teal-300/60 via-white/40 to-amber-300/40 ft-shadow h-full hover:-translate-y-0.5 transition-transform">
                  <div className="relative rounded-[25px] bg-white/70 backdrop-blur-2xl p-5 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ring-1 ${condTint(s.condition)}`}>حالتها: {s.condition}</span>
                      {s.status === "exchanged" && <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-900 text-white">تم التبادل</span>}
                    </div>
                    <h3 className="font-head font-extrabold text-lg text-slate-900 leading-snug mt-3">{s.title}</h3>
                    {s.author && <div className="text-xs font-bold text-slate-400 mt-0.5">{s.author}</div>}
                    {s.want && <p className="text-xs text-slate-500 leading-relaxed mt-2.5 rounded-xl bg-teal-500/[0.07] ring-1 ring-teal-500/10 px-3 py-2"><span className="font-extrabold text-teal-700">يبحث عن:</span> {s.want}</p>}
                    {s.note && <p className="text-xs text-slate-500 leading-relaxed mt-2">{s.note}</p>}
                    <div className="mt-auto pt-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white grid place-items-center text-[10px] font-black shrink-0">{(s.user_name || "؟")[0]}</span>
                        <span className="truncate">{s.user_name}</span>
                        {s.school_name && <span className="inline-flex items-center gap-1 truncate"><School className="w-3.5 h-3.5 shrink-0" /> {s.school_name}</span>}
                      </div>
                      {s.mine ? (
                        <div className="flex gap-2 mt-3">
                          {s.status === "open" ? (
                            <button onClick={() => setStatus(s.id, "exchanged")} className="pressable flex-1 h-10 rounded-xl bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-500/30 inline-flex items-center justify-center gap-1.5"><CheckCheck className="w-4 h-4" /> تم التبادل</button>
                          ) : (
                            <button onClick={() => setStatus(s.id, "open")} className="pressable flex-1 h-10 rounded-xl bg-slate-900/[0.05] text-slate-600 text-xs font-extrabold">إعادة الفتح</button>
                          )}
                          <button onClick={() => remove(s.id)} className="pressable w-10 h-10 grid place-items-center rounded-xl bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <Link to={`/messages?to=${s.user_id}`} className="pressable mt-3 w-full h-11 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-teal-500/30 inline-flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" /> راسله للتبادل
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        )}
        <p className="text-center text-[11px] font-bold text-slate-400 mt-8">اتفقوا على مكان الاستلام داخل المدرسة أو في فعاليات النادي، وراسلوا بعضكم من داخل المنصة فقط.</p>
      </div>
    </Layout>
  );
}
