import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Lightbulb, Quote, MessagesSquare, BrainCircuit, Play, Check, X, Sparkles,
  ChevronLeft, Trophy, PencilLine, Plus, Trash2, Loader2, BookOpenCheck,
} from "lucide-react";

/* «قبل أن تقرأ» + «اختبر فهمك» · smart book insights and the comprehension
   quiz, in one glass panel family on the book page. Staff with book.edit
   get inline editors for both. */
export default function BookLearn({ book }) {
  const { user, hasPerm } = useAuth();
  const bid = book?.id;
  const staff = !!(user && hasPerm && hasPerm("book.edit"));
  const [insights, setInsights] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [tab, setTab] = useState("ideas");
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    if (!bid || !user) return;
    try {
      const [i, q] = await Promise.all([
        api.get(`/learn/books/${bid}/insights`),
        api.get(`/learn/books/${bid}/quiz`),
      ]);
      setInsights(i.data);
      setQuiz(q.data);
    } catch { /* sections simply hide */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [bid, user?.id]);

  if (!user || !insights) return null;

  const tabs = [
    { id: "ideas", label: "أفكار رئيسية", icon: Lightbulb },
    { id: "quotes", label: "اقتباسات ذهبية", icon: Quote },
    { id: "questions", label: "أسئلة نقاش", icon: MessagesSquare },
  ];

  return (
    <div className="mt-10 space-y-5">
      {/* ---------- قبل أن تقرأ ---------- */}
      <section className="relative overflow-hidden rounded-[28px] p-[1px] bg-gradient-to-br from-indigo-400/50 via-white/40 to-amber-300/50 ft-shadow">
        <div className="relative rounded-[27px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-7 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-indigo-400/20 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 w-52 h-52 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-head font-extrabold text-xl text-slate-900 flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center shadow-lg shadow-indigo-500/30"><Sparkles className="w-5 h-5" /></span>
                قبل أن تقرأ
              </h2>
              <div className="flex items-center gap-2">
                {insights.source === "auto" && <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-900/[0.06] text-slate-500">ملخص تلقائي</span>}
                {staff && (
                  <button onClick={() => setEditing((e) => !e)} className="pressable inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                    <PencilLine className="w-3.5 h-3.5" /> {editing ? "إغلاق المحرر" : "تحرير للمشرفين"}
                  </button>
                )}
              </div>
            </div>

            {!editing ? (
              <>
                <div className="flex gap-1.5 mt-5 p-1 rounded-2xl bg-slate-900/[0.05] w-fit max-w-full overflow-x-auto">
                  {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className={`pressable shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${active ? "bg-white text-indigo-700 shadow-md" : "text-slate-500 hover:text-slate-700"}`}>
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  {tab === "ideas" && (
                    <ul className="space-y-2.5">
                      {(insights.key_ideas || []).map((idea, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/70 ring-1 ring-slate-900/[0.04] px-4 py-3">
                          <span className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-white grid place-items-center text-[11px] font-black shadow">{i + 1}</span>
                          <span className="text-sm leading-relaxed text-slate-700 font-medium">{idea}</span>
                        </li>
                      ))}
                      {(insights.key_ideas || []).length === 0 && <p className="text-sm text-slate-400">لا أفكار مضافة بعد.</p>}
                    </ul>
                  )}
                  {tab === "quotes" && (
                    <div className="space-y-2.5">
                      {(insights.quotes || []).map((q, i) => (
                        <blockquote key={i} className="relative rounded-2xl bg-gradient-to-l from-amber-50/90 to-white/70 ring-1 ring-amber-900/[0.06] px-5 py-4">
                          <Quote className="w-5 h-5 text-amber-400 absolute top-3 left-3 opacity-60" />
                          <p className="font-head text-[15px] leading-relaxed text-slate-800 font-bold">«{q.text}»</p>
                          {q.page ? <div className="text-[11px] text-slate-400 mt-1.5 font-bold">صفحة {q.page}</div> : null}
                        </blockquote>
                      ))}
                      {(insights.quotes || []).length === 0 && <p className="text-sm text-slate-400">لا اقتباسات مضافة بعد · أضف أول اقتباس ذهبي من المحرر.</p>}
                    </div>
                  )}
                  {tab === "questions" && (
                    <ul className="space-y-2.5">
                      {(insights.questions || []).map((q, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/70 ring-1 ring-slate-900/[0.04] px-4 py-3">
                          <MessagesSquare className="w-4.5 h-4.5 w-5 h-5 shrink-0 text-violet-500 mt-0.5" />
                          <span className="text-sm leading-relaxed text-slate-700 font-medium">{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <InsightsEditor bid={bid} initial={insights} onSaved={() => { setEditing(false); load(); }} />
            )}
          </div>
        </div>
      </section>

      {/* ---------- اختبر فهمك ---------- */}
      <section className="relative overflow-hidden rounded-[28px] p-[1px] bg-gradient-to-br from-emerald-400/50 via-white/40 to-teal-300/50 ft-shadow">
        <div className="relative rounded-[27px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-7 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-lg shadow-emerald-500/30 shrink-0"><BrainCircuit className="w-6 h-6" /></span>
            <div className="flex-1 min-w-[180px]">
              <h3 className="font-head font-extrabold text-lg text-slate-900">{quiz?.exists ? quiz.title : "اختبر فهمك"}</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {quiz?.exists
                  ? `${quiz.questions.length} أسئلة · اجتز بنسبة ٧٠٪ واكسب +${quiz.xp_reward} نقطة خبرة (مرة واحدة)`
                  : "لا اختبار لهذا الكتاب بعد · المشرفون يستطيعون إنشاء واحد من هنا"}
              </p>
              {quiz?.my_best && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
                  <Trophy className="w-3.5 h-3.5" /> أفضل نتيجة: {quiz.my_best.score}/{quiz.my_best.total}{quiz.my_best.passed ? " · اجتزته" : ""}
                </div>
              )}
            </div>
            {quiz?.exists && (
              <button onClick={() => setPlaying(true)} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30">
                <Play className="w-4 h-4" /> ابدأ الاختبار
              </button>
            )}
            {staff && <QuizEditor bid={bid} quiz={quiz} onSaved={load} />}
          </div>
        </div>
      </section>

      {playing && quiz?.exists && (
        <QuizPlayer quiz={quiz} bid={bid} onClose={() => { setPlaying(false); load(); }} />
      )}
    </div>
  );
}

function InsightsEditor({ bid, initial, onSaved }) {
  const [ideas, setIdeas] = useState((initial.key_ideas || []).join("\n"));
  const [questions, setQuestions] = useState((initial.questions || []).join("\n"));
  const [quotes, setQuotes] = useState((initial.quotes || []).map((q) => ({ text: q.text || "", page: q.page || "" })));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/learn/books/${bid}/insights`, {
        key_ideas: ideas.split("\n").map((s) => s.trim()).filter(Boolean),
        questions: questions.split("\n").map((s) => s.trim()).filter(Boolean),
        quotes: quotes.filter((q) => q.text.trim()).map((q) => ({ text: q.text.trim(), page: q.page ? Number(q.page) : null })),
      });
      toast.success("حُفظ ملخص الكتاب");
      onSaved();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  const ta = "w-full rounded-2xl bg-white/80 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-indigo-400/50 outline-none px-4 py-3 text-sm leading-relaxed";
  return (
    <div className="mt-5 space-y-4">
      <div>
        <label className="text-xs font-extrabold text-slate-600">الأفكار الرئيسية (سطر لكل فكرة)</label>
        <textarea value={ideas} onChange={(e) => setIdeas(e.target.value)} rows={4} className={`${ta} mt-1.5`} />
      </div>
      <div>
        <label className="text-xs font-extrabold text-slate-600">اقتباسات ذهبية</label>
        <div className="space-y-2 mt-1.5">
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q.text} onChange={(e) => setQuotes((qs) => qs.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} placeholder="نص الاقتباس" className={`${ta} flex-1`} />
              <input value={q.page} onChange={(e) => setQuotes((qs) => qs.map((x, j) => j === i ? { ...x, page: e.target.value } : x))} placeholder="صفحة" inputMode="numeric" className={`${ta} w-20`} />
              <button onClick={() => setQuotes((qs) => qs.filter((_, j) => j !== i))} className="w-11 shrink-0 grid place-items-center rounded-2xl bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={() => setQuotes((qs) => [...qs, { text: "", page: "" }])} className="pressable inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 px-3 py-2 rounded-xl bg-indigo-50"><Plus className="w-3.5 h-3.5" /> اقتباس جديد</button>
        </div>
      </div>
      <div>
        <label className="text-xs font-extrabold text-slate-600">أسئلة النقاش (سطر لكل سؤال)</label>
        <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={4} className={`${ta} mt-1.5`} />
      </div>
      <button onClick={save} disabled={busy} className="pressable h-11 px-6 rounded-2xl bg-indigo-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/25 disabled:opacity-50 inline-flex items-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ الملخص
      </button>
    </div>
  );
}

function QuizEditor({ bid, quiz, onSaved }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(quiz?.title || "اختبر فهمك");
  const [xp, setXp] = useState(quiz?.xp_reward || 30);
  const [qs, setQs] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && quiz?.exists) {
      // staff fetch includes answers via PUT-shaped source: reload from server copy is not exposed;
      // start from scratch warning shown instead.
      setTitle(quiz.title); setXp(quiz.xp_reward);
    }
  }, [open ]); // eslint-disable-line
  const addQ = () => setQs((a) => [...a, { q: "", options: ["", "", "", ""], answer: 0, explain: "" }]);
  const save = async () => {
    const clean = qs.filter((x) => x.q.trim() && x.options.every((o) => o.trim()));
    if (!clean.length) { toast.error("أضف سؤالاً كاملاً واحداً على الأقل (٤ خيارات)"); return; }
    setBusy(true);
    try {
      await api.put(`/learn/books/${bid}/quiz`, { title: title.trim() || "اختبر فهمك", xp_reward: Number(xp) || 30, questions: clean });
      toast.success("حُفظ الاختبار");
      setOpen(false); setQs([]); onSaved();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  const inp = "w-full rounded-xl bg-white/80 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-emerald-400/50 outline-none px-3 py-2 text-sm";
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); if (!qs.length) addQ(); }} className="pressable inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-2 rounded-full bg-slate-900/[0.06] text-slate-600">
        <PencilLine className="w-3.5 h-3.5" /> {quiz?.exists ? "استبدال الاختبار" : "إنشاء اختبار (مشرف)"}
      </button>
    );
  }
  return (
    <div className="w-full mt-2 rounded-3xl bg-white/60 ring-1 ring-slate-900/[0.05] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-head font-extrabold text-sm text-slate-800">منشئ الاختبار</span>
        <span className="text-[11px] text-slate-400 font-bold">الحفظ يستبدل الاختبار الحالي كاملاً</span>
      </div>
      <div className="grid sm:grid-cols-[1fr_120px] gap-2 mt-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار" className={inp} />
        <input value={xp} onChange={(e) => setXp(e.target.value)} inputMode="numeric" placeholder="نقاط XP" className={inp} />
      </div>
      <div className="space-y-3 mt-3">
        {qs.map((x, i) => (
          <div key={i} className="rounded-2xl bg-white/80 ring-1 ring-slate-900/[0.05] p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">س{i + 1}</span>
              <input value={x.q} onChange={(e) => setQs((a) => a.map((y, j) => j === i ? { ...y, q: e.target.value } : y))} placeholder="نص السؤال" className={`${inp} flex-1`} />
              <button onClick={() => setQs((a) => a.filter((_, j) => j !== i))} className="w-9 h-9 grid place-items-center rounded-xl bg-rose-50 text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {x.options.map((o, oi) => (
                <label key={oi} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ring-1 ${x.answer === oi ? "ring-emerald-400 bg-emerald-50/70" : "ring-slate-900/[0.05] bg-white/60"}`}>
                  <input type="radio" name={`ans-${i}`} checked={x.answer === oi} onChange={() => setQs((a) => a.map((y, j) => j === i ? { ...y, answer: oi } : y))} className="accent-emerald-500" />
                  <input value={o} onChange={(e) => setQs((a) => a.map((y, j) => j === i ? { ...y, options: y.options.map((z, k) => k === oi ? e.target.value : z) } : y))} placeholder={`خيار ${oi + 1}`} className="flex-1 bg-transparent outline-none text-sm min-w-0" />
                </label>
              ))}
            </div>
            <input value={x.explain} onChange={(e) => setQs((a) => a.map((y, j) => j === i ? { ...y, explain: e.target.value } : y))} placeholder="لماذا هذه الإجابة؟ (يظهر بعد الحل)" className={`${inp} mt-2`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        <button onClick={addQ} className="pressable inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold"><Plus className="w-4 h-4" /> سؤال جديد</button>
        <button onClick={save} disabled={busy} className="pressable h-10 px-5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/25 disabled:opacity-50 inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ الاختبار</button>
        <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-500">إلغاء</button>
      </div>
    </div>
  );
}

function QuizPlayer({ quiz, bid, onClose }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const total = quiz.questions.length;
  const q = quiz.questions[i];

  const choose = (oi) => { if (picked === null) setPicked(oi); };
  const next = async () => {
    const nextAnswers = [...answers, picked];
    if (i + 1 < total) {
      setAnswers(nextAnswers); setPicked(null); setI(i + 1);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/learn/books/${bid}/quiz/attempt`, { answers: nextAnswers });
      setResult(data);
      if (data.xp_awarded) toast.success(`أحسنت! +${data.xp_awarded} نقطة خبرة 🎉`);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-white/[0.92] backdrop-blur-2xl backdrop-saturate-150 shadow-2xl p-5 sm:p-7">
        {!result ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700">سؤال {i + 1} من {total}</span>
              <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-slate-900/[0.05] text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900/[0.06] mt-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-400 transition-all duration-500" style={{ width: `${((i) / total) * 100}%` }} />
            </div>
            <h3 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 leading-relaxed mt-5">{q.q}</h3>
            <div className="space-y-2.5 mt-4">
              {q.options.map((o, oi) => {
                const isPicked = picked === oi;
                return (
                  <button key={oi} onClick={() => choose(oi)}
                    className={`pressable w-full text-start rounded-2xl px-4 py-3.5 ring-1 text-sm font-bold transition-all ${isPicked ? "bg-emerald-500 text-white ring-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-white/80 ring-slate-900/[0.06] text-slate-700 hover:ring-emerald-300"}`}>
                    {o}
                  </button>
                );
              })}
            </div>
            <button onClick={next} disabled={picked === null || busy}
              className="pressable w-full h-12 mt-5 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-40 inline-flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : i + 1 < total ? <>التالي <ChevronLeft className="w-4 h-4" /></> : "إنهاء ورؤية النتيجة"}
            </button>
          </>
        ) : (
          <>
            <div className="text-center pt-2">
              <span className={`w-20 h-20 mx-auto rounded-[24px] grid place-items-center text-white shadow-xl ${result.passed ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/40" : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40"}`}>
                {result.passed ? <BookOpenCheck className="w-10 h-10" /> : <BrainCircuit className="w-10 h-10" />}
              </span>
              <h3 className="font-head font-black text-2xl text-slate-900 mt-4">{result.score}/{result.total}</h3>
              <p className="text-sm text-slate-500 mt-1">{result.passed ? "ممتاز! أثبتّ فهمك للكتاب" : "محاولة جيدة · أعد قراءة الأجزاء المهمة وحاول ثانية"}</p>
              {result.xp_awarded > 0 && <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-400/15 text-amber-700 ring-1 ring-amber-400/30"><Sparkles className="w-4 h-4" /> +{result.xp_awarded} نقطة خبرة</div>}
            </div>
            <div className="space-y-2.5 mt-6">
              {quiz.questions.map((qq, qi) => {
                const r = result.results[qi];
                return (
                  <div key={qi} className={`rounded-2xl px-4 py-3 ring-1 ${r.ok ? "bg-emerald-50/80 ring-emerald-500/20" : "bg-rose-50/80 ring-rose-500/20"}`}>
                    <div className="flex items-start gap-2">
                      {r.ok ? <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{qq.q}</div>
                        <div className="text-xs text-slate-500 mt-0.5">الإجابة الصحيحة: <span className="font-extrabold text-slate-700">{qq.options[r.answer]}</span></div>
                        {r.explain ? <div className="text-xs text-slate-500 mt-1 leading-relaxed">{r.explain}</div> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} className="pressable w-full h-12 mt-6 rounded-2xl bg-slate-900 text-white font-extrabold text-sm">تم</button>
          </>
        )}
      </div>
    </div>
  );
}
