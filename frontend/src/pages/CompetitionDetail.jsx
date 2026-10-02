import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, ArrowRight, Timer, Users, Award, CheckCircle2 } from "lucide-react";

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <button onClick={() => nav(-1)} className="pressable text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1.5 font-semibold"><ArrowRight className="w-4 h-4" /> رجوع</button>

        <section className="overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow animate-fade-up">
          <div className="ft-navy-gradient grain relative overflow-hidden px-5 py-7 text-white sm:p-8 lg:p-10">
            <Trophy className="pointer-events-none absolute -bottom-12 -left-8 h-52 w-52 rotate-12 text-white/10" />
            <div className="relative">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                <Trophy className="h-6 w-6 text-amber-300" />
              </div>
              <h1 className="font-head text-3xl font-extrabold leading-tight sm:text-4xl">{c.title}</h1>
              <p className="text-slate-200 mt-3 leading-loose whitespace-pre-wrap sm:text-lg">{c.description}</p>
            </div>
          </div>
          <div className="p-5 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 ft-shadow"><Timer className="w-5 h-5" /></span>
                <span className="font-head font-extrabold text-slate-800">{c.duration_minutes} دقيقة</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 ft-shadow"><Users className="w-5 h-5" /></span>
                <span className="font-head font-extrabold text-slate-800">{c.participants_count} مشارك</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 ft-shadow"><Award className="w-5 h-5" /></span>
                <span className="font-head font-extrabold text-slate-800">{c.question_count} سؤال</span>
              </div>
            </div>

            {submitted ? (
              <div className="mt-6 space-y-3">
                <div className="p-4 sm:p-5 rounded-[1.4rem] border border-emerald-100 bg-emerald-50 text-emerald-700 flex items-start sm:items-center gap-2.5 font-semibold leading-relaxed"><CheckCircle2 className="w-5 h-5 shrink-0" /> أكملت المسابقة · نتيجتك {c.my_entry.score}% ({c.my_entry.correct}/{c.my_entry.total})</div>
                <Button data-testid="download-cert-btn" onClick={downloadCert} variant="outline" className="pressable w-full rounded-xl h-12 font-bold border-emerald-200 text-emerald-700 sm:w-auto sm:px-6"><Award className="w-4 h-4 ml-1" /> تنزيل شهادة المشاركة</Button>
              </div>
            ) : !registered ? (
              <Button data-testid="register-competition-btn" onClick={register} className="pressable mt-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-12 px-8 font-bold shadow-lg shadow-emerald-600/20 sm:w-auto">سجّل في المسابقة</Button>
            ) : !taking ? (
              c.question_count > 0 ? <Button data-testid="start-competition-btn" onClick={() => setTaking(true)} className="pressable mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-12 px-8 font-bold shadow-lg shadow-blue-600/20 sm:w-auto">ابدأ الاختبار</Button>
                : <div className="mt-6 rounded-[1.4rem] border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-500 sm:p-5">أنت مسجّل. ستُتاح الأسئلة عند بدء المسابقة.</div>
            ) : null}
          </div>
        </section>

        {taking && !submitted && (
          <div className="mt-6 space-y-4 sm:space-y-5" data-testid="quiz-container">
            {c.questions.map((q, i) => (
              <section key={i} className={`bg-white rounded-[1.4rem] sm:rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow animate-fade-up d-${(i % 6) + 1}`}>
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 font-head text-sm font-extrabold text-white shadow-md shadow-blue-600/20">{i + 1}</span>
                  <div className="font-head min-w-0 font-bold leading-relaxed text-slate-900 sm:text-lg">{q.text}</div>
                </div>
                <div className="space-y-2.5">
                  {q.options.map((opt, oi) => (
                    <button key={oi} data-testid={`q${i}-opt${oi}`} onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={`pressable flex min-h-[3rem] w-full items-center justify-between gap-3 text-right px-4 py-3 rounded-2xl border text-sm font-semibold leading-relaxed transition-all sm:text-base ${answers[i] === oi ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10" : "border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-slate-50"}`}>
                      <span className="min-w-0">{opt}</span>
                      {answers[i] === oi && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </section>
            ))}
            <Button data-testid="submit-quiz-btn" onClick={submit} className="pressable sticky bottom-4 z-10 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12 font-bold shadow-xl shadow-emerald-600/25">إرسال الإجابات</Button>
          </div>
        )}

        <section className="mt-8 sm:mt-10">
          <h2 className="font-head font-extrabold text-xl mb-4 flex items-center gap-2 text-slate-900"><Trophy className="w-5 h-5 text-amber-500" /> ترتيب المتسابقين</h2>
          {board.length === 0 ? <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/70 px-5 py-6 text-center text-slate-400 text-sm">لا نتائج بعد</p> : (
            <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow overflow-hidden">
              {board.map((r) => {
                const medalClass = r.rank === 1
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                  : r.rank === 2
                    ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    : r.rank === 3
                      ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200"
                      : "bg-slate-100 text-slate-500";
                return (
                  <div key={r.rank} className="flex items-center gap-3 px-4 py-4 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/80 sm:px-5">
                    <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-sm font-extrabold ${medalClass}`}>
                      {r.rank <= 3 && <Trophy className="h-3.5 w-3.5" />}
                      {r.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{r.user_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{r.school_name}</div>
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-3 py-1 font-head font-extrabold text-blue-600">{r.score}%</div>
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
