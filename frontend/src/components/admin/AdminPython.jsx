import React, { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { renderArticle } from "@/lib/pythonContent";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  HelpCircle, Save, X, FileText, Sparkles, Check, GripVertical,
  BarChart3, BookOpen, Trophy, Clock, Search, Filter, Copy,
  ChevronLeft, AlertCircle, Star, Zap, Target, Layers, Settings2,
} from "lucide-react";

const BLUE = "#3776AB";
const BLUE_D = "#255a85";
const YELLOW = "#FFD43B";

const blankQ = () => ({ q: "", choices: ["", "", "", ""], answer: 0, explanation: "", points: 10 });

/* ================= Stats Dashboard ================= */
function StatsBar({ arts }) {
  const stats = useMemo(() => {
    const published = arts.filter((a) => a.is_published).length;
    const questions = arts.reduce((s, a) => s + (a.questions_count || 0), 0);
    const withExam = arts.filter((a) => (a.questions_count || 0) > 0).length;
    return [
      { icon: BookOpen, label: "مقالات", value: arts.length, grad: `linear-gradient(135deg,${BLUE},${BLUE_D})` },
      { icon: Eye, label: "منشورة", value: published, grad: "linear-gradient(135deg,#10b981,#059669)" },
      { icon: HelpCircle, label: "أسئلة امتحانات", value: questions, grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
      { icon: Trophy, label: "مقالات بامتحان", value: withExam, grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
    ];
  }, [arts]);
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="relative overflow-hidden rounded-[1.4rem] bg-white p-4 shadow-[0_10px_35px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-100 sm:p-5">
          <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: s.grad }} />
          <span className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-md sm:h-11 sm:w-11" style={{ background: s.grad }}>
            <s.icon className="h-5 w-5" />
          </span>
          <div className="mt-2.5 font-head text-2xl font-black text-slate-900 sm:text-[1.7rem]">{s.value}</div>
          <div className="text-[11.5px] font-bold text-slate-500">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ================= Exam Builder ================= */
function ExamEditor({ article, onClose, onSaved }) {
  const [qs, setQs] = useState([blankQ()]);
  const [passScore, setPassScore] = useState(60);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(0);

  useEffect(() => {
    api.get(`/python-learn/exams/${article.id}/admin`)
      .then((r) => {
        if (r.data?.questions?.length) {
          setQs(r.data.questions.map((q) => ({ ...blankQ(), ...q })));
          setExpanded(null);
        }
        setPassScore(r.data?.pass_score || 60);
      })
      .catch(() => {});
  }, [article.id]);

  const setQ = (i, patch) => setQs((p) => p.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setChoice = (i, ci, v) => setQs((p) => p.map((q, j) => (j === i ? { ...q, choices: q.choices.map((c, k) => (k === ci ? v : c)) } : q)));
  const duplicate = (i) => setQs((p) => [...p.slice(0, i + 1), { ...p[i], q: p[i].q + " (نسخة)" }, ...p.slice(i + 1)]);

  const save = async () => {
    const clean = qs.map((q) => ({ ...q, q: q.q.trim(), choices: q.choices.map((c) => c.trim()) }))
      .filter((q) => q.q && q.choices.every(Boolean));
    if (!clean.length) { toast.error("أضف سؤالاً مكتملاً واحداً على الأقل"); return; }
    setSaving(true);
    try {
      await api.put(`/python-learn/exams/${article.id}`, { questions: clean, pass_score: passScore });
      toast.success(`تم حفظ الامتحان (${clean.length} أسئلة)`);
      onSaved();
    } catch { toast.error("تعذر حفظ الامتحان"); }
    finally { setSaving(false); }
  };

  const totalPoints = qs.reduce((s, q) => s + (Number(q.points) || 0), 0);

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)] ring-1 ring-slate-100">
      {/* header */}
      <div className="relative overflow-hidden p-5 sm:p-6" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold text-white">
              <Target className="h-3.5 w-3.5" /> امتحان المقال
            </div>
            <div className="mt-2 truncate font-head text-lg font-black text-white sm:text-xl">{article.title}</div>
            <div className="mt-1 text-[12px] text-blue-100">المتعلم لا يجتاز المقال إلا باجتياز هذا الامتحان · {qs.length} أسئلة · {totalPoints} نقطة</div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-white/10 p-3 backdrop-blur">
          <label className="text-[13px] font-bold text-white">نسبة الاجتياز المطلوبة</label>
          <div className="flex items-center gap-1.5">
            <input type="range" min={10} max={100} step={5} value={passScore} onChange={(e) => setPassScore(Number(e.target.value))}
              className="h-2 w-28 cursor-pointer appearance-none rounded-full bg-white/25 accent-white sm:w-36" />
            <span className="min-w-[3rem] rounded-lg bg-white px-2 py-1 text-center text-sm font-black text-slate-900" dir="ltr">{passScore}%</span>
          </div>
        </div>
      </div>

      {/* questions */}
      <div className="space-y-3 p-4 sm:p-6">
        {qs.map((q, i) => {
          const isOpen = expanded === i;
          const complete = q.q.trim() && q.choices.every((c) => c.trim());
          return (
            <div key={i} className={`overflow-hidden rounded-2xl ring-1 transition ${complete ? "bg-white ring-slate-200" : "bg-amber-50/50 ring-amber-200"}`}>
              <button onClick={() => setExpanded(isOpen ? null : i)}
                className="flex w-full items-center gap-3 p-4 text-right">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-head text-sm font-black text-white shadow ${complete ? "" : "opacity-60"}`}
                  style={{ background: complete ? `linear-gradient(135deg,${BLUE},${BLUE_D})` : "#94a3b8" }}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-slate-700">{q.q.trim() || <span className="text-slate-400">سؤال جديد — اضغط للتحرير</span>}</span>
                {!complete && <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{q.points || 10} نقاط</span>
                <ChevronLeft className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "-rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 p-4">
                  <textarea value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} rows={2} placeholder="نص السؤال…"
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 p-3 text-[14px] font-bold outline-none transition focus:border-blue-300 focus:bg-white" />
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {q.choices.map((c, ci) => (
                      <div key={ci} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-2.5 transition ${q.answer === ci ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"}`}
                        onClick={() => setQ(i, { answer: ci })}>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black ${q.answer === ci ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {["أ", "ب", "ج", "د"][ci]}
                        </span>
                        <input value={c} onChange={(e) => setChoice(i, ci, e.target.value)} placeholder={`الخيار ${["أ", "ب", "ج", "د"][ci]}…`}
                          className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" onClick={(e) => e.stopPropagation()} />
                        {q.answer === ci && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-[1fr_110px]">
                    <input value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder="💡 شرح الإجابة (يظهر للمتعلم عند المراجعة)…"
                      className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 p-2.5 text-[13px] outline-none transition focus:border-blue-300 focus:bg-white" />
                    <label className="flex items-center gap-1.5 rounded-xl border-2 border-slate-100 bg-slate-50/50 px-2.5">
                      <span className="text-[11px] font-bold text-slate-500">النقاط</span>
                      <input type="number" min={1} max={100} value={q.points} onChange={(e) => setQ(i, { points: Number(e.target.value) })}
                        className="w-full bg-transparent py-2 text-center text-sm font-black outline-none" />
                    </label>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => duplicate(i)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11.5px] font-bold text-slate-600 hover:bg-slate-200">
                      <Copy className="h-3.5 w-3.5" /> نسخ
                    </button>
                    <button onClick={() => setQs((p) => p.filter((_, j) => j !== i))}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-100">
                      <Trash2 className="h-3.5 w-3.5" /> حذف السؤال
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button onClick={() => { setQs((p) => [...p, blankQ()]); setExpanded(qs.length); }}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-500 transition hover:border-blue-300 hover:text-blue-600">
            <Plus className="h-4 w-4" /> إضافة سؤال
          </button>
          <button onClick={save} disabled={saving}
            className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ…" : `حفظ الامتحان (${qs.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Article Editor ================= */
function ArticleEditor({ article, onClose, onSaved }) {
  const [title, setTitle] = useState(article?.title || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [content, setContent] = useState(article?.content || "");
  const [published, setPublished] = useState(article?.is_published ?? true);
  const [mode, setMode] = useState("split"); // write | split | preview
  const [saving, setSaving] = useState(false);

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.round(words / 200));
  const codeBlocks = (content.match(/```/g) || []).length / 2;

  const save = async () => {
    if (title.trim().length < 2) { toast.error("أدخل عنوان المقال"); return; }
    if (content.trim().length < 10) { toast.error("محتوى المقال قصير جداً"); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), summary: summary.trim(), content, is_published: published };
      if (article) await api.patch(`/python-learn/articles/${article.id}`, payload);
      else await api.post("/python-learn/articles", payload);
      toast.success("تم حفظ المقال");
      onSaved();
    } catch { toast.error("تعذر حفظ المقال"); }
    finally { setSaving(false); }
  };

  const insertMd = (before, after = "") => {
    const ta = document.getElementById("py-md-input");
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const nv = content.slice(0, s) + before + content.slice(s, e) + after + content.slice(e);
    setContent(nv);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, e + before.length); }, 0);
  };

  const onKeyDown = (e) => {
    if (e.key === "Tab") { e.preventDefault(); insertMd("  "); }
  };

  const fixPasted = () => {
    const count = (content.match(/```/g) || []).length;
    if (count % 2 === 1) {
      setContent(content.trimEnd() + "\n```\n");
      toast.success("تم إغلاق كتلة الكود المفتوحة ✓");
    } else toast.info("كل كتل الكود مغلقة ✓");
  };

  // slim icon toolbar button
  const TB = ({ title, onClick, children, active }) => (
    <button title={title} onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg transition active:scale-90 ${active ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
      {children}
    </button>
  );
  const Sep = () => <div className="h-5 w-px bg-slate-200" />;

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_70px_-24px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
      {/* ── top bar ── */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <button onClick={onClose} title="رجوع"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <ChevronLeft className="h-5 w-5 rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-extrabold text-slate-800">{article ? "تعديل المقال" : "مقال جديد"}</div>
          <div className="text-[10.5px] font-bold text-slate-400">محرر Markdown احترافي</div>
        </div>
        {/* mode tabs */}
        <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
          {[
            ["write", "كتابة", <Pencil key="w" className="h-3.5 w-3.5" />],
            ["split", "مقسّم", <Layers key="s" className="h-3.5 w-3.5" />],
            ["preview", "معاينة", <Eye key="p" className="h-3.5 w-3.5" />],
          ].map(([v, l, ic]) => (
            <button key={v} onClick={() => setMode(v)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-extrabold transition sm:px-3.5 ${mode === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {ic}<span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow transition hover:bg-slate-700 active:scale-95 disabled:opacity-60 sm:px-5">
          <Save className="h-4 w-4" /><span className="hidden sm:inline">{saving ? "جارٍ الحفظ…" : "حفظ"}</span>
        </button>
      </div>

      {/* ── title (Notion-style, borderless) ── */}
      <div className="border-b border-slate-100 px-4 pb-1 pt-4 sm:px-8 sm:pt-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان المقال…"
          className="w-full bg-transparent font-head text-2xl font-black text-slate-900 outline-none placeholder:text-slate-300 sm:text-[1.9rem]" />
        <input value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="ملخص قصير يظهر في بطاقة المرحلة…"
          className="mt-1.5 w-full bg-transparent text-[13.5px] text-slate-500 outline-none placeholder:text-slate-300" />
      </div>

      {/* ── slim toolbar ── */}
      {(mode !== "preview") && (
        <div className="sticky top-0 z-10 flex items-center gap-0.5 overflow-x-auto border-b border-slate-100 bg-white/95 px-2 py-1.5 backdrop-blur sm:px-4">
          <TB title="عنوان كبير" onClick={() => insertMd("# ", "")}><span className="font-black" dir="ltr">H1</span></TB>
          <TB title="عنوان متوسط" onClick={() => insertMd("## ", "")}><span className="font-black" dir="ltr">H2</span></TB>
          <TB title="عنوان صغير" onClick={() => insertMd("### ", "")}><span className="font-black" dir="ltr">H3</span></TB>
          <Sep />
          <TB title="عريض" onClick={() => insertMd("**", "**")}><span className="font-black" dir="ltr">B</span></TB>
          <TB title="مائل" onClick={() => insertMd("*", "*")}><span className="font-black italic" dir="ltr">I</span></TB>
          <TB title="مشطوب" onClick={() => insertMd("~~", "~~")}><span className="font-black line-through" dir="ltr">S</span></TB>
          <TB title="كود قصير" onClick={() => insertMd("`", "`")}><span className="font-mono font-black" dir="ltr">&lt;/&gt;</span></TB>
          <Sep />
          <TB title="قائمة نقطية" onClick={() => insertMd("- ", "")}><span className="text-lg leading-none">•</span></TB>
          <TB title="قائمة مرقمة" onClick={() => insertMd("1. ", "")}><span className="font-black" dir="ltr">1.</span></TB>
          <TB title="اقتباس" onClick={() => insertMd("> ", "")}><span className="font-black text-amber-500" dir="ltr">”</span></TB>
          <TB title="فاصل" onClick={() => insertMd("\n---\n", "")}><span className="font-black text-slate-400" dir="ltr">―</span></TB>
          <Sep />
          <TB title="بلوك بايثون 🐍" onClick={() => insertMd("\n```python\n", "\n```\n")}><span className="text-base">🐍</span></TB>
          <TB title="جدول" onClick={() => insertMd("\n| العمود 1 | العمود 2 |\n|---|---|\n| قيمة | قيمة |\n", "")}><span className="text-base">📊</span></TB>
          <TB title="رابط" onClick={() => { const u = prompt("رابط URL:"); if (u) insertMd("[", `](${u})`); }}><span className="text-base">🔗</span></TB>
          <Sep />
          <TB title="إصلاح كتل الكود المفتوحة" onClick={fixPasted}><span className="text-base">🔧</span></TB>
        </div>
      )}

      {/* ── editor / preview ── */}
      <div className={`grid ${mode === "split" ? "lg:grid-cols-2" : ""}`}>
        {mode !== "preview" && (
          <div className={mode === "split" ? "border-b border-slate-100 lg:border-b-0 lg:border-l" : ""}>
            <textarea id="py-md-input" value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={onKeyDown}
              dir="auto" placeholder={"ابدأ الكتابة هنا…\n\nانسخ أي نص من ChatGPT والصقه مباشرة — كل التنسيق يعمل تلقائياً.\n\n## مثال على عنوان\n\n```python\nname = \"أحمد\"\nprint(f\"مرحباً {name}\")\n```"}
              className="min-h-[420px] w-full resize-y bg-white p-4 font-mono text-[13.5px] leading-[2] text-slate-800 outline-none placeholder:text-slate-300 sm:p-8 lg:min-h-[540px]" />
          </div>
        )}
        {mode !== "write" && (
          <div className="max-h-[560px] min-h-[300px] overflow-y-auto bg-[#fbfaf8] p-4 sm:p-8 lg:max-h-[640px]">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[10.5px] font-extrabold text-white shadow">
              <Eye className="h-3 w-3" /> معاينة حية — كما يراها المتعلم
            </div>
            {content.trim() ? renderArticle(content) : <div className="py-16 text-center text-[13px] text-slate-400">ابدأ الكتابة لترى المعاينة الحية هنا ✨</div>}
          </div>
        )}
      </div>

      {/* ── status bar ── */}
      <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold text-slate-500 sm:px-6">
        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> <span dir="ltr">{words}</span> كلمة</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~<span dir="ltr">{readMin}</span> دقائق</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> <span dir="ltr">{codeBlocks}</span> بلوك كود</span>
        <button onClick={() => setPublished((v) => !v)}
          className={`mr-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition active:scale-95 ${published ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
          <span className={`h-2 w-2 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"}`} />
          {published ? "منشور" : "مسودة"}
        </button>
      </div>
    </div>
  );
}

/* ================= Main ================= */
export default function AdminPython() {
  const [arts, setArts] = useState([]);
  const [view, setView] = useState({ name: "list" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/python-learn/admin/articles").then((r) => setArts(r.data || [])).catch(() => setArts([]));
  useEffect(load, []);

  const filtered = arts.filter((a) => {
    const q = query.trim();
    if (q && !(a.title || "").includes(q)) return false;
    if (filter === "published") return a.is_published;
    if (filter === "draft") return !a.is_published;
    if (filter === "noexam") return !(a.questions_count > 0);
    return true;
  });

  const remove = async (a) => {
    if (!window.confirm(`حذف "${a.title}" وامتحانه نهائياً؟`)) return;
    try { await api.delete(`/python-learn/articles/${a.id}`); toast.success("تم الحذف"); load(); }
    catch { toast.error("تعذر الحذف"); }
  };
  const move = async (i, dir) => {
    const ids = filtered.map((a) => a.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await api.post("/python-learn/articles/reorder", { ids }); load(); }
    catch { toast.error("تعذر إعادة الترتيب"); }
  };
  const togglePub = async (a) => {
    try {
      await api.patch(`/python-learn/articles/${a.id}`, {
        title: a.title, summary: a.summary || "",
        content: a.content && a.content.length >= 10 ? a.content : "محتوى المقال — عدّله من زر التعديل.",
        is_published: !a.is_published,
      });
      toast.success(a.is_published ? "أُخفي المقال" : "نُشر المقال");
      load();
    } catch { toast.error("تعذر التحديث"); }
  };

  if (view.name === "edit")
    return <ArticleEditor article={view.article} onClose={() => setView({ name: "list" })} onSaved={() => { setView({ name: "list" }); load(); }} />;
  if (view.name === "exam")
    return <ExamEditor article={view.article} onClose={() => setView({ name: "list" })} onSaved={load} />;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-lg sm:p-6" style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D} 70%,#1a3a5c)` }}>
        <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-4xl shadow-inner ring-1 ring-white/25 backdrop-blur sm:h-16 sm:w-16">🐍</span>
          <div className="min-w-0 flex-1">
            <div className="font-head text-xl font-black sm:text-2xl">إدارة رحلة بايثون</div>
            <div className="mt-0.5 text-[12.5px] text-blue-100">أنشئ المراحل ورتّبها وابنِ امتحاناتها — كل شيء يظهر فوراً للمتعلمين</div>
          </div>
          <button onClick={() => setView({ name: "edit", article: null })}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-5 py-3 text-[13.5px] font-black shadow-lg transition hover:scale-[1.03] active:scale-95"
            style={{ color: BLUE_D }}>
            <Plus className="h-4 w-4" strokeWidth={3} /> مقال جديد
          </button>
        </div>
      </div>

      <StatsBar arts={arts} />

      {/* search + filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المقالات…"
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-2.5 pl-4 pr-10 text-[13.5px] outline-none transition focus:border-blue-300" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {[["all", "الكل"], ["published", "منشورة"], ["draft", "مسودات"], ["noexam", "بلا امتحان"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[12px] font-extrabold transition ${filter === v ? "text-white shadow" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
              style={filter === v ? { background: `linear-gradient(135deg,${BLUE},${BLUE_D})` } : undefined}>{l}</button>
          ))}
        </div>
      </div>

      {/* articles */}
      <div className="space-y-2.5">
        {filtered.map((a, i) => {
          const hasExam = (a.questions_count || 0) > 0;
          return (
            <div key={a.id} className="group flex items-center gap-3 rounded-[1.4rem] bg-white p-3.5 shadow-[0_10px_35px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 transition hover:shadow-[0_16px_45px_-15px_rgba(55,118,171,0.3)] sm:gap-4 sm:p-4">
              <div className="flex shrink-0 flex-col gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="تحريك للأعلى"
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-20"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === filtered.length - 1} title="تحريك للأسفل"
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-20"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-head text-[15px] font-black text-white shadow sm:h-12 sm:w-12"
                style={{ background: a.is_published ? `linear-gradient(135deg,${BLUE},${BLUE_D})` : "linear-gradient(135deg,#94a3b8,#64748b)" }}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-head text-[14.5px] font-extrabold text-slate-900">{a.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {!a.is_published && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-500">📝 مسودة</span>}
                  {a.is_published && <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-600 ring-1 ring-emerald-100">● منشور</span>}
                  <span className={`rounded-lg px-2 py-0.5 text-[10.5px] font-extrabold ring-1 ${hasExam ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-rose-50 text-rose-500 ring-rose-100"}`}>
                    {hasExam ? `✦ ${a.questions_count} أسئلة` : "⚠ بلا امتحان"}
                  </span>
                  <span className="hidden text-[10.5px] font-bold text-slate-400 sm:inline" dir="ltr">/{a.slug}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <button title="امتحان المقال" onClick={() => setView({ name: "exam", article: a })}
                  className="rounded-xl p-2.5 text-amber-500 transition hover:scale-110 hover:bg-amber-50"><Sparkles className="h-[18px] w-[18px]" /></button>
                <button title={a.is_published ? "إخفاء" : "نشر"} onClick={() => togglePub(a)}
                  className="rounded-xl p-2.5 text-slate-400 transition hover:scale-110 hover:bg-slate-100">
                  {a.is_published ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                </button>
                <button title="تعديل" onClick={() => setView({ name: "edit", article: a })}
                  className="rounded-xl p-2.5 transition hover:scale-110 hover:bg-blue-50" style={{ color: BLUE }}>
                  <Pencil className="h-[18px] w-[18px]" /></button>
                <button title="حذف" onClick={() => remove(a)}
                  className="rounded-xl p-2.5 text-rose-400 transition hover:scale-110 hover:bg-rose-50"><Trash2 className="h-[18px] w-[18px]" /></button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center">
            <div className="text-4xl">🐍</div>
            <div className="mt-2 font-head text-[15px] font-extrabold text-slate-700">{query || filter !== "all" ? "لا نتائج مطابقة" : "لا توجد مقالات بعد"}</div>
            <div className="mt-1 text-[12.5px] text-slate-400">{query || filter !== "all" ? "جرّب بحثاً مختلفاً" : "ابدأ بإضافة أول مقال في الرحلة"}</div>
            {!query && filter === "all" && (
              <button onClick={() => setView({ name: "edit", article: null })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px] font-extrabold text-white shadow"
                style={{ background: `linear-gradient(135deg,${BLUE},${BLUE_D})` }}>
                <Plus className="h-4 w-4" /> إضافة مقال
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[1.4rem] bg-gradient-to-l from-amber-50 to-orange-50/50 p-4 text-[12.5px] leading-relaxed text-amber-800 ring-1 ring-amber-100">
        <span className="font-extrabold">💡 كيف تعمل الرحلة:</span> المتعلم يقرأ المقال ثم يجتاز امتحانه (بالنسبة التي تحددها) لتُفتح المرحلة التالية.
        رتّب المراحل بأسهم التحريك — الترتيب يحدد تسلسل الفتح.
      </div>
    </div>
  );
}
