import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, ArrowRight, Timer, Users, Award, CheckCircle2, Crown, Zap, CalendarClock, ListChecks, Sparkles } from "lucide-react";
import { TYPE_META, compStatus } from "./Competitions";

const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

export default function CompetitionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [board, setBoard] = useState([]);
  const [answers, setAnswers] = useState({});
  const [taking, setTaking] = useState(false);

  const load = async () => {
    const [d, lb] = await Promise.all([api.get(`/competitions/${id}`), api.get(`/competitions/${id}/leaderboard`)]);
    setC(d.data); setBoard(lb.data);
  };
  useEffect(() => { load(); }, [id]);

  const register = async () => {
    if (!user) return nav("/login");
    try { await api.post(`/competitions/${id}/register`); toast.success("تم تسجيلك في المسابقة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const submit = async () => {
    const arr = c.questions.map((_, i) => answers[i] ?? -1);
    try { const { data } = await api.post(`/competitions/${id}/submit`, { answers: arr }); toast.success(`نتيجتك: ${data.score}% (${data.correct}/${data.total})`); setTaking(false); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const downloadCert = async () => {
    try {
      const res = await api.get(`/certificates/competition/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = `certificate-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (!c) return <Layout><PageLoader /></Layout>;
  const registered = !!c.my_entry;
  const submitted = c.my_entry?.submitted;
  const m = TYPE_META[c.type] || TYPE_META.quiz;
  const MIcon = m.icon;
  const st = compStatus(c);
  const answered = Object.keys(answers).length;
  const totalQ = c.questions?.length || 0;

  const stats = [
    { icon: Timer, label: "المدة", value: `${c.duration_minutes} دقيقة` },
    { icon: Users, label: "المشاركون", value: `${c.participants_count} مشارك` },
    { icon: ListChecks, label: "الأسئلة", value: `${c.question_count} سؤال` },
    { icon: CalendarClock, label: "الحالة", value: st ? st.label : "مفتوحة" },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <button onClick={() => nav(-1)} className="pressable mb-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:text-slate-900"><ArrowRight className="w-4 h-4" /> رجوع</button>

        <section className="overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow animate-fade-up">
          <div className="ft-navy-gradient grain relative overflow-hidden px-5 py-7 text-white sm:p-8 lg:p-10">
            <Trophy className="pointer-events-none absolute -bottom-14 -left-8 h-56 w-56 rotate-12 text-white/[0.07]" />
            <MIcon className="pointer-events-none absolute -top-8 right-10 h-36 w-36 -rotate-12 text-white/[0.05]" />
            <div className="pointer-events-none absolute -top-20 left-1/4 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-2xl ring-1 ring-white/20" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}BB)`, boxShadow: `0 16px 30px -12px ${m.color}` }}>
                  <MIcon className="h-7 w-7" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15 backdrop-blur">{m.label}</span>
                {st && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${st.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-200 ring-1 ring-amber-300/25 backdrop-blur"><Zap className="h-3.5 w-3.5" /> نقاط خبرة عند الإكمال</span>
              </div>
              <h1 className="font-head mt-4 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem]">{c.title}</h1>
              <p className="text-slate-200 mt-3 leading-loose whitespace-pre-wrap sm:text-lg">{c.description}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-amber-300/40 to-transparent" />
          </div>

          <div className="p-5 sm:p-8">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
              {stats.map((s) => {
                const SIcon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white ft-shadow" style={{ color: m.color }}><SIcon className="w-5 h-5" /></span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold text-slate-400">{s.label}</span>
                      <span className="block truncate font-head font-extrabold text-slate-800">{s.value}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {submitted ? (
              <div className="mt-6 space-y-3">
                <div className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 p-5 text-white shadow-xl shadow-emerald-600/25 sm:p-6">
                  <Trophy className="pointer-events-none absolute -bottom-8 -left-6 h-36 w-36 rotate-12 text-white/10" />
                  <div className="relative flex flex-wrap items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur"><Trophy className="h-7 w-7 text-amber-300" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start sm:items-center gap-2.5 font-semibold leading-relaxed"><CheckCircle2 className="w-5 h-5 shrink-0" /> أكملت المسابقة · نتيجتك {c.my_entry.score}% ({c.my_entry.correct}/{c.my_entry.total})</div>
                      <div className="mt-1 text-sm text-emerald-100">أحسنت! نتيجتك مسجلة في ترتيب المتسابقين بالأسفل.</div>
                    </div>
                    <div className="font-head text-4xl font-black text-white/95 sm:text-5xl">{c.my_entry.score}<span className="text-2xl">%</span></div>
                  </div>
                </div>
                <Button data-testid="download-cert-btn" onClick={downloadCert} variant="outline" className="pressable w-full rounded-xl h-12 font-bold border-emerald-200 text-emerald-700 ft-hover-bg-soft sm:w-auto sm:px-6"><Award className="w-4 h-4 ml-1" /> تنزيل شهادة المشاركة</Button>
              </div>
            ) : !registered ? (
              <Button data-testid="register-competition-btn" onClick={register} className="pressable mt-6 w-full rounded-2xl ft-btn-primary h-12 px-8 font-bold shadow-lg sm:w-auto">سجّل في المسابقة</Button>
            ) : !taking ? (
              c.question_count > 0 ? <Button data-testid="start-competition-btn" onClick={() => setTaking(true)} className="pressable mt-6 w-full rounded-2xl h-12 px-8 font-bold text-white shadow-lg sm:w-auto" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`, boxShadow: `0 14px 26px -12px ${m.color}` }}>ابدأ الاختبار</Button>
                : <div className="mt-6 rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-500 sm:p-5">أنت مسجّل. ستُتاح الأسئلة عند بدء المسابقة.</div>
            ) : null}
          </div>
        </section>

        {taking && !submitted && (
          <div className="mt-6 space-y-4 sm:space-y-5" data-testid="quiz-container">
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-slate-100 bg-white px-4 py-3.5 ft-shadow sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)` }}><ListChecks className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-slate-800">أجبت عن {answered} من {totalQ} سؤال</div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalQ ? (answered / totalQ) * 100 : 0}%`, background: `linear-gradient(90deg, ${m.color}, ${m.color}AA)` }} />
                </div>
              </div>
              <span className="shrink-0 rounded-full px-3 py-1 font-head text-sm font-extrabold" style={{ background: `${m.color}14`, color: m.color }}>{totalQ ? Math.round((answered / totalQ) * 100) : 0}%</span>
            </div>

            {c.questions.map((q, i) => (
              <section key={i} className={`bg-white rounded-[1.4rem] sm:rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow animate-fade-up d-${(i % 6) + 1}`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-head text-sm font-extrabold text-white shadow-md" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}CC)`, boxShadow: `0 10px 20px -10px ${m.color}` }}>{i + 1}</span>
                  <div className="font-head min-w-0 pt-1.5 font-bold leading-relaxed text-slate-900 sm:text-lg">{q.text}</div>
                </div>
                <div className="space-y-2.5">
                  {q.options.map((opt, oi) => {
                    const selected = answers[i] === oi;
                    return (
                      <button key={oi} data-testid={`q${i}-opt${oi}`} onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`pressable flex min-h-[3rem] w-full items-center gap-3 text-right px-4 py-3 rounded-2xl border text-sm font-semibold leading-relaxed transition-all sm:text-base ${selected ? "text-slate-900" : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
                        style={selected ? { borderColor: m.color, background: `${m.color}12`, boxShadow: `0 0 0 1px ${m.color}, 0 10px 22px -14px ${m.color}` } : {}}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-colors ${selected ? "text-white" : "bg-slate-100 text-slate-500"}`} style={selected ? { background: m.color } : {}}>{LETTERS[oi] || oi + 1}</span>
                        <span className="min-w-0 flex-1">{opt}</span>
                        {selected && <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: m.color }} />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="sticky bottom-4 z-10 flex flex-col gap-2.5 rounded-[1.4rem] border border-white/60 bg-white/90 p-2.5 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/60 backdrop-blur-xl sm:flex-row sm:items-center">
              <span className="hidden items-center gap-1.5 px-2 text-sm font-bold text-slate-500 sm:inline-flex"><Sparkles className="h-4 w-4 text-amber-500" /> أجبت عن {answered} من {totalQ}</span>
              <Button data-testid="submit-quiz-btn" onClick={submit} className="pressable ft-btn-primary w-full flex-1 rounded-2xl h-12 font-bold shadow-xl">إرسال الإجابات</Button>
            </div>
          </div>
        )}

        <section className="mt-8 sm:mt-10">
          <h2 className="font-head font-extrabold text-xl mb-4 flex items-center gap-2 text-slate-900"><Trophy className="w-5 h-5 text-amber-500" /> ترتيب المتسابقين</h2>
          {board.length === 0 ? <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/70 px-5 py-6 text-center text-slate-400 text-sm">لا نتائج بعد</p> : (
            <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
              {board.map((r) => {
                const medalClass = r.rank === 1
                  ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg shadow-amber-500/30"
                  : r.rank === 2
                    ? "bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-lg shadow-slate-400/30"
                    : r.rank === 3
                      ? "bg-gradient-to-br from-orange-300 to-amber-600 text-white shadow-lg shadow-orange-500/30"
                      : "bg-slate-100 text-slate-500";
                const rowTint = r.rank === 1 ? "bg-amber-50/60" : r.rank === 2 ? "bg-slate-50/70" : r.rank === 3 ? "bg-orange-50/50" : "";
                return (
                  <div key={r.rank} className={`flex items-center gap-3 px-4 py-4 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/80 sm:px-5 ${rowTint}`}>
                    <span className={`flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-sm font-extrabold ${medalClass}`}>
                      {r.rank === 1 ? <Crown className="h-4 w-4" /> : r.rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : null}
                      {r.rank}
                    </span>
                    <div className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-head font-extrabold text-white ${r.rank === 1 ? "h-11 w-11 text-base ring-2 ring-amber-300" : "h-9 w-9 text-sm"}`}>{r.user_name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">{r.user_name}{r.rank === 1 && <Crown className="h-4 w-4 shrink-0 text-amber-500" />}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{r.school_name}</div>
                    </div>
                    <div className={`shrink-0 rounded-full px-3 py-1 font-head font-extrabold ${r.rank === 1 ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-blue-50 text-blue-600"}`}>{r.score}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
