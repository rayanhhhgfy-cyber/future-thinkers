import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import {
  Layers, Sparkles, Plus, Trash2, RotateCcw, ThumbsUp, Zap, Check,
  BookOpen, StickyNote, PenLine, Trophy, RefreshCw, X,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* بطاقات المراجعة · spaced-repetition flashcards built from the member's
   own book notes and finished books, plus manual cards. */
export default function Flashcards() {
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ front: "", back: "" });
  const [reviewed, setReviewed] = useState(0);

  const load = async () => {
    try {
      const { data: d } = await api.get("/learn/flashcards/due");
      setData(d);
      setIdx(0);
      setFlipped(false);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><PageLoader /></Layout>;
  const card = data.cards[idx] || null;

  const generate = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.post("/learn/flashcards/generate");
      toast.success(r.created ? `أضفنا ${r.created} بطاقة جديدة من قراءاتك` : "لا بطاقات جديدة · بطاقاتك محدثة");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const grade = async (g) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await api.post(`/learn/flashcards/${card.id}/review`, { grade: g });
      if (g !== "again") setReviewed((n) => n + 1);
      setFlipped(false);
      if (idx + 1 < data.cards.length) {
        setIdx(idx + 1);
      } else {
        toast.success("أكملت كل بطاقات اليوم 🎉");
        await load();
      }
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/learn/flashcards/${id}`);
      toast.success("حُذفت البطاقة");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const addCard = async () => {
    if (!form.front.trim() || !form.back.trim()) return;
    setBusy(true);
    try {
      await api.post("/learn/flashcards", form);
      setForm({ front: "", back: "" });
      setShowAdd(false);
      toast.success("أُضيفت البطاقة");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const sourceMeta = {
    note: { label: "من ملاحظاتك", icon: StickyNote, cls: "bg-violet-500/10 text-violet-600" },
    book: { label: "من كتاب أنهيته", icon: BookOpen, cls: "bg-blue-500/10 text-blue-600" },
    manual: { label: "بطاقة يدوية", icon: PenLine, cls: "bg-amber-500/10 text-amber-600" },
  };

  return (
    <Layout>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[28px] ft-navy-gradient grain text-white p-6 sm:p-8 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-violet-500/25 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-amber-200"><Layers className="w-3.5 h-3.5" /> التكرار المتباعد</div>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-3">بطاقات المراجعة</h1>
                <p className="text-slate-300 text-sm mt-1.5 max-w-lg leading-relaxed">بطاقات تُبنى من ملاحظاتك وكتبك المنتهية، وتعود إليك في الوقت المثالي قبل أن تنسى.</p>
              </div>
              <div className="flex gap-2.5">
                {[
                  { n: data.due, l: "مستحقة اليوم", icon: Zap, c: "text-amber-300" },
                  { n: data.total, l: "كل البطاقات", icon: Layers, c: "text-sky-300" },
                  { n: data.mastered, l: "أتقنتها", icon: Trophy, c: "text-emerald-300" },
                ].map((s) => (
                  <div key={s.l} className="text-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md px-4 py-3 min-w-[86px]">
                    <div className={`font-head text-2xl font-black flex items-center justify-center gap-1 ${s.c}`}><s.icon className="w-5 h-5" />{s.n}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex flex-wrap gap-2 mt-6">
              <button onClick={generate} disabled={busy} className="pressable inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-amber-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-amber-500/30 disabled:opacity-50">
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} ولّد من قراءاتي
              </button>
              <button onClick={() => setShowAdd((s) => !s)} className="pressable inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-white/10 ring-1 ring-white/20 text-white text-sm font-extrabold backdrop-blur-md">
                <Plus className="w-4 h-4" /> بطاقة جديدة
              </button>
              {reviewed > 0 && <span className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-300/30 text-emerald-200 text-xs font-extrabold"><Check className="w-4 h-4" /> راجعت {reviewed} هذه الجلسة</span>}
            </div>
          </div>
        </FadeUp>

        {showAdd && (
          <FadeUp>
            <div className="mt-5 rounded-[26px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-5 sm:p-6">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-600">السؤال (وجه البطاقة)</label>
                  <textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} rows={3} className="w-full mt-1.5 rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-violet-400/50 outline-none px-4 py-3 text-sm" placeholder="مثال: ما الفكرة الرئيسية في الفصل الثالث؟" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-600">الإجابة (ظهر البطاقة)</label>
                  <textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} rows={3} className="w-full mt-1.5 rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-violet-400/50 outline-none px-4 py-3 text-sm" placeholder="اكتب الإجابة بكلماتك أنت…" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addCard} disabled={busy} className="pressable h-11 px-6 rounded-2xl ft-btn-solid text-white text-sm font-extrabold shadow-lg disabled:opacity-50">إضافة البطاقة</button>
                <button onClick={() => setShowAdd(false)} className="h-11 px-5 rounded-2xl text-sm font-extrabold text-slate-500">إلغاء</button>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp>
          {card ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-extrabold text-slate-400">بطاقة {idx + 1} من {data.cards.length}</span>
                <div className="flex-1 max-w-xs h-1.5 rounded-full bg-slate-900/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-fuchsia-400 transition-all duration-500" style={{ width: `${(idx / Math.max(1, data.cards.length)) * 100}%` }} />
                </div>
                {(() => { const m = sourceMeta[card.source] || sourceMeta.manual; const Icon = m.icon; return (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${m.cls}`}><Icon className="w-3.5 h-3.5" /> {m.label}</span> ); })()}
              </div>

              <button onClick={() => setFlipped((f) => !f)} className="pressable block w-full mt-4 [perspective:1400px]" aria-label="اقلب البطاقة">
                <div className={`relative w-full min-h-[290px] sm:min-h-[330px] transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
                  <div className="absolute inset-0 [backface-visibility:hidden] rounded-[30px] p-[1px] bg-gradient-to-br from-violet-400/60 via-white/40 to-fuchsia-300/50 ft-shadow-lg">
                    <div className="h-full rounded-[29px] bg-white/75 backdrop-blur-2xl backdrop-saturate-150 p-6 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-44 h-44 rounded-full bg-violet-400/15 blur-3xl" />
                      <span className="text-[11px] font-black tracking-wide text-violet-500 bg-violet-500/10 px-3 py-1 rounded-full">السؤال</span>
                      <p className="relative font-head text-xl sm:text-2xl font-extrabold text-slate-900 leading-relaxed mt-4">{card.front}</p>
                      <span className="relative text-[11px] font-bold text-slate-400 mt-5 inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> انقر لقلب البطاقة ورؤية الإجابة</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[30px] p-[1px] bg-gradient-to-br from-emerald-400/60 via-white/40 to-teal-300/50 ft-shadow-lg">
                    <div className="h-full rounded-[29px] bg-white/75 backdrop-blur-2xl backdrop-saturate-150 p-6 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div aria-hidden className="pointer-events-none absolute -top-14 -left-14 w-44 h-44 rounded-full bg-emerald-400/15 blur-3xl" />
                      <span className="text-[11px] font-black tracking-wide text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">الإجابة</span>
                      <p className="relative text-base sm:text-lg leading-loose text-slate-800 font-medium mt-4 whitespace-pre-wrap">{card.back}</p>
                      {card.book_id && <Link to={`/books/${card.book_id}`} className="relative mt-4 text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> افتح الكتاب</Link>}
                    </div>
                  </div>
                </div>
              </button>

              {flipped ? (
                <div className="grid grid-cols-3 gap-2.5 mt-4">
                  <button onClick={() => grade("again")} disabled={busy} className="pressable h-[52px] rounded-2xl bg-rose-500 text-white font-extrabold text-sm shadow-lg shadow-rose-500/30 disabled:opacity-50 flex flex-col items-center justify-center leading-tight">
                    <span className="inline-flex items-center gap-1"><RotateCcw className="w-4 h-4" /> أعدها</span><span className="text-[10px] opacity-80 font-bold">بعد ١٠ دقائق</span>
                  </button>
                  <button onClick={() => grade("good")} disabled={busy} className="pressable h-[52px] rounded-2xl bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white font-extrabold text-sm shadow-lg shadow-violet-500/30 disabled:opacity-50 flex flex-col items-center justify-center leading-tight">
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> أعرفها</span><span className="text-[10px] opacity-80 font-bold">+١ نقطة</span>
                  </button>
                  <button onClick={() => grade("easy")} disabled={busy} className="pressable h-[52px] rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex flex-col items-center justify-center leading-tight">
                    <span className="inline-flex items-center gap-1"><Zap className="w-4 h-4" /> سهلة جداً</span><span className="text-[10px] opacity-80 font-bold">تأجيل أطول</span>
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs font-bold text-slate-400 mt-4">حاول تذكّر الإجابة أولاً، ثم اقلب البطاقة وقيّم نفسك بصدق</p>
              )}

              <div className="flex justify-center mt-4">
                <button onClick={() => remove(card.id)} className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 hover:text-rose-500 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /> حذف هذه البطاقة</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[30px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-8 sm:p-12 text-center">
              <span className="w-16 h-16 mx-auto rounded-[22px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center shadow-xl shadow-violet-500/30"><Layers className="w-8 h-8" /></span>
              <h2 className="font-head font-black text-xl text-slate-900 mt-4">لا بطاقات مستحقة الآن</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">ولّد بطاقات من ملاحظاتك وكتبك المنتهية، أو أضف بطاقتك الأولى يدوياً وابدأ رحلة التثبيت.</p>
              <div className="flex justify-center gap-2 mt-5 flex-wrap">
                <button onClick={generate} disabled={busy} className="pressable h-11 px-5 rounded-2xl bg-amber-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-amber-500/30 inline-flex items-center gap-2 disabled:opacity-50"><Sparkles className="w-4 h-4" /> توليد من قراءاتي</button>
                <button onClick={() => setShowAdd(true)} className="pressable h-11 px-5 rounded-2xl bg-slate-900 text-white text-sm font-extrabold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> بطاقة يدوية</button>
              </div>
              {data.total > 0 && <p className="text-[11px] font-bold text-slate-400 mt-4 inline-flex items-center gap-1"><X className="w-3 h-3" /> لديك {data.total} بطاقة · كلها مجدولة لمواعيد قادمة</p>}
            </div>
          )}
        </FadeUp>
      </div>
    </Layout>
  );
}
