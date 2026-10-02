import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { ReportErrorButton } from "@/components/ErrorState";
import { PythonEditor, PyErrorText, Terminal, TermLines } from "@/components/PythonCode";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageLoader, EmptyState } from "@/components/Layout";
import {
  Code2, Play, CheckCircle2, Lightbulb, ThumbsUp, Scale, Plus, ArrowRight, Loader2,
  Terminal as TerminalIcon, FlaskConical, Search, Zap, XCircle, Trophy, Sparkles, Target,
} from "lucide-react";

/* ============ نادي البرمجة · Coding challenges ============ */
const DIFF = {
  1: { label: "سهلة", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", grad: "from-emerald-500 to-teal-500", star: "text-emerald-500" },
  2: { label: "متوسطة", chip: "bg-amber-50 text-amber-700 ring-amber-200", grad: "from-amber-500 to-orange-500", star: "text-amber-500" },
  3: { label: "صعبة", chip: "bg-rose-50 text-rose-700 ring-rose-200", grad: "from-rose-500 to-red-600", star: "text-rose-500" },
};

export function CodingPanel() {
  const [problems, setProblems] = useState(null);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState("");
  const [diff, setDiff] = useState(0);
  useEffect(() => { api.get("/coding/problems").then((r) => setProblems(r.data)).catch(() => setProblems([])); }, []);
  const reload = () => api.get("/coding/problems").then((r) => setProblems(r.data)).catch(() => {});
  if (active) return <ProblemView pid={active} onBack={() => { setActive(null); reload(); }} />;
  if (!problems) return <PageLoader />;

  const solved = problems.filter((p) => p.solved).length;
  const xpLeft = problems.filter((p) => !p.solved).reduce((s, p) => s + (p.xp || 0), 0);
  const shown = problems.filter((p) =>
    (diff === 0 || p.difficulty === diff) &&
    (!query.trim() || p.title.includes(query.trim())));

  return (
    <div>
      {/* hero strip */}
      <div className="relative overflow-hidden rounded-[1.8rem] bg-slate-950 text-white px-5 py-6 sm:px-7 mb-5">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-10 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center shadow-lg shadow-emerald-500/30">
              <Code2 className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-head font-extrabold text-lg leading-tight">تحديات البرمجة</h3>
              <p className="text-slate-400 text-xs mt-0.5">حلّل، اكتب بـ Python، واجمع نقاط الخبرة</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] ring-1 ring-white/10"><Target className="w-3.5 h-3.5 text-sky-300" /> {problems.length} مسألة</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] ring-1 ring-white/10"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> حللت {solved}</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.07] ring-1 ring-white/10"><Zap className="w-3.5 h-3.5 text-amber-300" /> حتى +{xpLeft} نقطة بانتظارك</span>
          </div>
          <div className="w-full sm:w-56 mr-auto">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1.5"><span>تقدّمك</span><span>{problems.length ? Math.round((solved / problems.length) * 100) : 0}%</span></div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-400 transition-all duration-700" style={{ width: `${problems.length ? (solved / problems.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن مسألة…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[[0, "الكل"], [1, "سهلة"], [2, "متوسطة"], [3, "صعبة"]].map(([v, l]) => (
            <button key={v} onClick={() => setDiff(v)}
              className={`pressable px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition ${diff === v ? "bg-slate-900 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              {l}{v > 0 && <span className={diff === v ? "text-amber-300" : DIFF[v].star}> {"★".repeat(v)}</span>}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Code2} title="لا مسائل مطابقة" desc="جرّب كلمة بحث أو صعوبة مختلفة" />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((p, i) => {
            const d = DIFF[p.difficulty] || DIFF[1];
            return (
              <button key={p.id} data-testid={`coding-problem-${p.id}`} onClick={() => setActive(p.id)}
                className="animate-fade-up group relative text-right bg-white rounded-[1.4rem] p-5 border border-slate-100 ft-shadow hover-lift overflow-hidden"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${d.grad} opacity-80`} />
                <div className="flex items-start justify-between gap-2">
                  <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${d.grad} text-white grid place-items-center shadow-md`}><Code2 className="w-5 h-5" /></span>
                  {p.solved
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> محلولة</span>
                    : <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${d.chip}`}>{d.label}</span>}
                </div>
                <h3 className="font-head font-bold text-slate-900 mt-3.5 leading-snug group-hover:text-emerald-700 transition-colors">{p.title}</h3>
                <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-bold">
                  <span className={`${d.star} tracking-tight`}>{"★".repeat(p.difficulty)}<span className="text-slate-200">{"★".repeat(3 - p.difficulty)}</span></span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700"><Zap className="w-3 h-3" /> +{p.xp} خبرة</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-500"><CheckCircle2 className="w-3 h-3" /> {p.solved_count} حل</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProblemView({ pid, onBack }) {
  const [p, setP] = useState(null);
  const [code, setCode] = useState("# اكتب حلك هنا\n");
  const [result, setResult] = useState(null);
  const [runResults, setRunResults] = useState(null);
  const [running, setRunning] = useState("");
  const [stdin, setStdin] = useState("");
  const [consoleOut, setConsoleOut] = useState(null);
  useEffect(() => { api.get(`/coding/problems/${pid}`).then((r) => setP(r.data)); }, [pid]);
  const submit = async () => {
    setRunning("submit"); setResult(null);
    try { const { data } = await api.post(`/coding/problems/${pid}/submit`, { code }); setResult(data); if (data.verdict === "accepted") toast.success("حل مقبول! 🎉"); }
    catch (e) { toast.error(apiErr(e)); } finally { setRunning(""); }
  };
  const runSamples = async () => {
    setRunning("samples"); setRunResults(null);
    try { const { data } = await api.post(`/coding/problems/${pid}/run`, { code }); setRunResults(data.results); }
    catch (e) { toast.error(apiErr(e)); } finally { setRunning(""); }
  };
  const runCustom = async () => {
    setRunning("play"); setConsoleOut(null);
    try { const { data } = await api.post(`/coding/run`, { code, stdin }); setConsoleOut(data); }
    catch (e) { toast.error(apiErr(e)); } finally { setRunning(""); }
  };
  if (!p) return <PageLoader />;
  const d = DIFF[p.difficulty] || DIFF[1];
  const samplesOk = runResults ? runResults.every((r) => r.passed) : false;
  const onKeys = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !running) { e.preventDefault(); submit(); } };

  return (
    <div onKeyDown={onKeys}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={onBack} className="pressable inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition">
          <ArrowRight className="w-4 h-4" /> كل المسائل
        </button>
        <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full ring-1 ${d.chip}`}>{d.label} <span className={d.star}>{"★".repeat(p.difficulty)}</span></span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200"><Zap className="w-3.5 h-3.5" /> +{p.xp} نقطة خبرة</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200"><CheckCircle2 className="w-3.5 h-3.5" /> {p.solved_count} طالب حلّها</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* statement */}
        <div className="bg-white rounded-[1.6rem] p-5 sm:p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-snug">{p.title}</h3>
          <p className="mt-3 text-slate-600 leading-loose whitespace-pre-wrap text-[15px]">{p.statement}</p>

          {p.sample_tests?.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-head font-bold text-slate-700 mb-2.5 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> أمثلة على الإدخال والإخراج</div>
              <div className="space-y-2.5">
                {p.sample_tests.map((t, i) => (
                  <div key={i} className="grid grid-cols-2 rounded-2xl overflow-hidden ring-1 ring-slate-800/60 font-mono text-xs" dir="ltr">
                    <div className="bg-slate-950 text-left p-3">
                      <div className="text-[10px] font-bold tracking-widest text-sky-400 mb-1.5">INPUT</div>
                      <pre className="text-slate-200 whitespace-pre-wrap break-all">{t.input || " "}</pre>
                    </div>
                    <div className="bg-slate-900 text-left p-3 border-l border-white/10">
                      <div className="text-[10px] font-bold tracking-widest text-emerald-400 mb-1.5">OUTPUT</div>
                      <pre className="text-emerald-200 whitespace-pre-wrap break-all">{t.output || " "}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* debugger */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-2 text-sm font-head font-bold text-slate-700"><TerminalIcon className="w-4 h-4 text-emerald-600" /> المصحّح · جرّب بإدخال مخصص</span>
              <button onClick={runCustom} disabled={!!running}
                className="pressable inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/25 disabled:opacity-50">
                {running === "play" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} تشغيل
              </button>
            </div>
            <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} dir="ltr" spellCheck={false} autoCapitalize="off" autoCorrect="off"
              placeholder={"stdin… e.g. 7"} rows={2}
              className="w-full bg-slate-950 text-slate-200 font-mono text-xs p-3.5 rounded-2xl ring-1 ring-slate-800 outline-none resize-none placeholder:text-slate-600 focus:ring-emerald-500/50 transition text-left" />
            <Terminal className="mt-3" title="debugger · stdout"
              status={running === "play" ? "running" : consoleOut ? (consoleOut.ok ? "ok" : "error") : "idle"}
              rawText={consoleOut?.output || ""}>
              {consoleOut && <TermLines text={consoleOut.output || "(لا مخرجات)"} error={!consoleOut.ok} okClass="text-emerald-200" />}
            </Terminal>
          </div>
        </div>

        {/* editor + results */}
        <div>
          <div className="rounded-[1.4rem] overflow-hidden ring-1 ring-slate-800 shadow-[0_24px_60px_-24px_rgba(2,6,23,0.55)]">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-white/[0.06]" dir="ltr">
              <span className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" /><span className="w-3 h-3 rounded-full bg-[#febc2e]" /><span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </span>
              <span className="font-mono text-xs text-slate-300">main.py</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20"><Code2 className="w-3 h-3" /> Python 3 · بيئة معزولة آمنة</span>
            </div>
            <PythonEditor testId="code-editor" value={code} onChange={(e) => setCode(e.target.value)} minHeight={300} />
            <div className="px-4 py-2 bg-slate-900 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500" dir="ltr">
              <span className="font-mono">{code.length} chars · {code.split("\n").length} lines</span>
              <span>Tab = مسافتان · Ctrl+Enter = إرسال</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Button data-testid="run-samples-btn" onClick={runSamples} disabled={!!running} variant="outline"
              className="rounded-2xl h-12 border-slate-300 bg-white font-bold hover:border-emerald-400 hover:text-emerald-700">
              {running === "samples" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FlaskConical className="w-4 h-4 ml-1.5" /> تجربة الأمثلة</>}
            </Button>
            <Button data-testid="run-code-btn" onClick={submit} disabled={!!running}
              className="rounded-2xl h-12 font-bold bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25">
              {running === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 ml-1.5" /> إرسال الحل</>}
            </Button>
          </div>

          {runResults && (
            <Terminal className="mt-4" title="sample tests · نتائج الأمثلة"
              status={running === "samples" ? "running" : samplesOk ? "ok" : "error"}
              rawText={runResults.map((r) => `Test ${r.test}: ${r.passed ? "PASS" : r.ran ? "WRONG OUTPUT" : "ERROR"}\ngot: ${r.output || ""}`).join("\n")}>
              <div>
                {runResults.map((r) => (
                  <div key={r.test} className="px-4 py-3 border-b border-white/[0.05] last:border-0">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {r.passed
                        ? <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Test {r.test} · PASS</span>
                        : <span className="inline-flex items-center gap-1.5 text-rose-300"><XCircle className="w-4 h-4" /> Test {r.test} · {r.ran ? "WRONG OUTPUT" : "ERROR"}</span>}
                    </div>
                    <div className="mt-2 grid gap-1.5 text-xs">
                      <div className="flex gap-2"><span className="text-slate-500 font-bold w-16 shrink-0">got:</span>
                        <span className="flex-1 whitespace-pre-wrap break-all">{r.ran ? <span className={r.passed ? "text-emerald-200" : "text-slate-200"}>{r.output || "(empty)"}</span> : <PyErrorText text={r.output || "(empty)"} trail={false} />}</span>
                      </div>
                      {!r.passed && <div className="flex gap-2"><span className="text-slate-500 font-bold w-16 shrink-0">expected:</span><span className="flex-1 text-amber-200 whitespace-pre-wrap break-all">{r.expected}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </Terminal>
          )}

          {result && (
            <div className={`mt-4 rounded-[1.4rem] p-5 ring-1 ${result.verdict === "accepted" ? "bg-gradient-to-br from-emerald-50 to-teal-50 ring-emerald-200" : "bg-gradient-to-br from-rose-50 to-red-50 ring-rose-200"}`} data-testid="code-result">
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-2xl grid place-items-center text-white shadow-md ${result.verdict === "accepted" ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-rose-500 to-red-600"}`}>
                  {result.verdict === "accepted" ? <Trophy className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </span>
                <div>
                  <div className={`font-head font-extrabold ${result.verdict === "accepted" ? "text-emerald-800" : "text-rose-800"}`}>
                    {result.verdict === "accepted" ? "حل مقبول · أحسنت! 🎉" : result.verdict === "wrong_answer" ? "إجابة خاطئة" : "خطأ في التنفيذ"}
                  </div>
                  <div className={`text-xs mt-0.5 ${result.verdict === "accepted" ? "text-emerald-600" : "text-rose-500"}`}>نجح {result.passed} من {result.total} اختبار</div>
                </div>
              </div>
              {result.detail && (
                <Terminal className="mt-4" title="judge detail · تفاصيل الحكم" status="error" rawText={result.detail}>
                  <TermLines text={result.detail} error />
                </Terminal>
              )}
              {result.verdict !== "accepted" && (
                <div className="mt-3.5">
                  <ReportErrorButton message={`حكم الحل: ${result.verdict} · ${result.detail || ""}`}
                    detail={`المشكلة: ${pid}\nالحكم: ${result.verdict}\nالرسالة: ${result.detail || ""}\n\nالكود المرسل:\n${(code || "").slice(0, 4000)}`}
                    context={`مشكلة برمجة ${pid}`} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ نادي الابتكار · Projects + voting ============ */
export function ProjectsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "" });
  const load = () => api.get("/projects").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { if (f.title.length < 3) return toast.error("العنوان قصير"); try { await api.post("/projects", f); toast.success("تم نشر المشروع"); setOpen(false); setF({ title: "", description: "" }); load(); } catch (e) { toast.error(apiErr(e)); } };
  const vote = async (id) => { const { data } = await api.post(`/projects/${id}/vote`); setItems((arr) => arr.map((p) => p.id === id ? { ...p, voted: data.voted, votes_count: p.votes_count + (data.voted ? 1 : -1) } : p)); };
  if (!items) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-project-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> مشروع جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نشر مشروع ابتكاري</DialogTitle></DialogHeader>
            <Input data-testid="project-title" placeholder="عنوان المشروع" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl" />
            <Textarea data-testid="project-desc" placeholder="اشرح فكرتك…" value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} className="rounded-xl min-h-[120px]" />
            <DialogFooter><Button data-testid="project-submit" onClick={create} className="rounded-xl bg-emerald-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <EmptyState icon={Lightbulb} title="لا مشاريع بعد" desc="شارك فكرتك الابتكارية الأولى" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center mb-3"><Lightbulb className="w-5 h-5" /></div>
              <h3 className="font-head font-bold text-slate-900">{p.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-3 mt-1">{p.description}</p>
              <div className="mt-3 text-xs text-slate-400">{p.author_name} · {p.school_name || "·"}</div>
              <Button data-testid={`vote-project-${p.id}`} onClick={() => vote(p.id)} variant={p.voted ? "default" : "outline"} size="sm" className={`mt-3 rounded-xl ${p.voted ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}><ThumbsUp className="w-4 h-4 ml-1" /> {p.votes_count} تصويت</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ نادي المناظرات · Debate topics + side voting ============ */
export function DebatesPanel() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", side_a: "مؤيد", side_b: "معارض" });
  const load = () => api.get("/debates").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { if (f.title.length < 3) return toast.error("العنوان قصير"); try { await api.post("/debates", f); toast.success("تم طرح المناظرة"); setOpen(false); setF({ title: "", description: "", side_a: "مؤيد", side_b: "معارض" }); load(); } catch (e) { toast.error(apiErr(e)); } };
  const vote = async (id, side) => { const { data } = await api.post(`/debates/${id}/vote?side=${side}`); setItems((arr) => arr.map((d) => d.id === id ? { ...d, my_vote: data.my_vote, votes_a: data.votes_a, votes_b: data.votes_b } : d)); };
  if (!items) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-debate-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> موضوع مناظرة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>طرح موضوع مناظرة</DialogTitle></DialogHeader>
            <Input data-testid="debate-title" placeholder="عنوان المناظرة (مثال: التعلّم عن بُعد أفضل من الحضوري)" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl" />
            <Textarea placeholder="وصف مختصر" value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} className="rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="الطرف الأول" value={f.side_a} onChange={(e) => setF((x) => ({ ...x, side_a: e.target.value }))} className="rounded-xl" />
              <Input placeholder="الطرف الثاني" value={f.side_b} onChange={(e) => setF((x) => ({ ...x, side_b: e.target.value }))} className="rounded-xl" />
            </div>
            <DialogFooter><Button data-testid="debate-submit" onClick={create} className="rounded-xl bg-emerald-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <EmptyState icon={Scale} title="لا مناظرات بعد" desc="اطرح أول موضوع للنقاش والتصويت" /> : (
        <div className="space-y-4">
          {items.map((d) => {
            const total = (d.votes_a || 0) + (d.votes_b || 0);
            const pa = total ? Math.round((d.votes_a / total) * 100) : 50;
            return (
              <div key={d.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
                <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-violet-600" /><h3 className="font-head font-bold text-slate-900">{d.title}</h3></div>
                {d.description && <p className="text-sm text-slate-500 mt-1">{d.description}</p>}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-emerald-700 font-medium">{d.side_a} ({d.votes_a || 0})</span><span className="text-rose-700 font-medium">{d.side_b} ({d.votes_b || 0})</span></div>
                  <div className="h-2.5 rounded-full bg-rose-200 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pa}%` }} /></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button data-testid={`vote-a-${d.id}`} onClick={() => vote(d.id, "a")} variant={d.my_vote === "a" ? "default" : "outline"} className={`rounded-xl ${d.my_vote === "a" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>أؤيد: {d.side_a}</Button>
                  <Button data-testid={`vote-b-${d.id}`} onClick={() => vote(d.id, "b")} variant={d.my_vote === "b" ? "default" : "outline"} className={`rounded-xl ${d.my_vote === "b" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}>أؤيد: {d.side_b}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
