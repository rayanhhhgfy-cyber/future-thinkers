import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { renderArticle } from "@/lib/pythonContent";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  HelpCircle, Save, X, FileText, Sparkles, Check, GripVertical,
} from "lucide-react";

const blankQ = () => ({ q: "", choices: ["", "", "", ""], answer: 0, explanation: "" });

function ExamEditor({ article, onClose, onSaved }) {
  const [qs, setQs] = useState([blankQ()]);
  const [passScore, setPassScore] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/python-learn/exams/${article.id}/admin`)
      .then((r) => {
        if (r.data?.questions?.length) setQs(r.data.questions.map((q) => ({ ...blankQ(), ...q })));
        setPassScore(r.data?.pass_score || 60);
      })
      .catch(() => {});
  }, [article.id]);

  const setQ = (i, patch) => setQs((p) => p.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setChoice = (i, ci, v) => setQs((p) => p.map((q, j) => (j === i ? { ...q, choices: q.choices.map((c, k) => (k === ci ? v : c)) } : q)));

  const save = async () => {
    const clean = qs.map((q) => ({ ...q, q: q.q.trim(), choices: q.choices.map((c) => c.trim()) }))
      .filter((q) => q.q && q.choices.every(Boolean));
    if (!clean.length) { toast.error("أضف سؤالاً مكتملاً واحداً على الأقل (السؤال + 4 خيارات)"); return; }
    setSaving(true);
    try {
      await api.put(`/python-learn/exams/${article.id}`, { questions: clean, pass_score: passScore });
      toast.success(`تم حفظ الامتحان (${clean.length} أسئلة)`);
      onSaved();
    } catch { toast.error("تعذر حفظ الامتحان"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-head text-lg font-extrabold text-slate-900">امتحان: {article.title}</div>
          <div className="mt-0.5 text-[12px] text-slate-500">المتعلم لا يجتاز المقال إلا باجتياز هذا الامتحان</div>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3.5">
        <label className="text-[13px] font-bold text-slate-600">نسبة الاجتياز</label>
        <input type="number" min={10} max={100} value={passScore} onChange={(e) => setPassScore(Number(e.target.value))}
          className="w-20 rounded-xl border border-slate-200 px-2.5 py-1.5 text-center text-sm font-extrabold" />
        <span className="text-[12px] text-slate-400">%</span>
      </div>

      <div className="mt-4 space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-extrabold text-slate-400">السؤال {i + 1}</span>
              <button onClick={() => setQs((p) => p.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} rows={2} placeholder="نص السؤال…"
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-[14px] outline-none focus:border-emerald-400" />
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {q.choices.map((c, ci) => (
                <label key={ci} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition ${q.answer === ci ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                  <input type="radio" name={`ans${i}`} checked={q.answer === ci} onChange={() => setQ(i, { answer: ci })} className="h-4 w-4 accent-emerald-600" />
                  <input value={c} onChange={(e) => setChoice(i, ci, e.target.value)} placeholder={`الخيار ${["أ", "ب", "ج", "د"][ci]}…`}
                    className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" />
                  {q.answer === ci && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </label>
              ))}
            </div>
            <input value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder="💡 شرح الإجابة (يظهر للمتعلم عند المراجعة)…"
              className="mt-2.5 w-full rounded-xl border border-slate-200 p-2.5 text-[13px] outline-none focus:border-emerald-400" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button onClick={() => setQs((p) => [...p, blankQ()])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-[13px] font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-600">
          <Plus className="h-4 w-4" /> إضافة سؤال
        </button>
        <button onClick={save} disabled={saving}
          className="mr-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ…" : "حفظ الامتحان"}
        </button>
      </div>
    </div>
  );
}

function ArticleEditor({ article, onClose, onSaved }) {
  const [title, setTitle] = useState(article?.title || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [content, setContent] = useState(article?.content || "");
  const [published, setPublished] = useState(article?.is_published ?? true);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="font-head text-lg font-extrabold text-slate-900">{article ? "تعديل المقال" : "مقال جديد"}</div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 grid gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المقال — مثال: المتغيرات وأنواع البيانات"
          className="w-full rounded-2xl border border-slate-200 p-3.5 font-head text-[15px] font-extrabold outline-none focus:border-emerald-400" />
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ملخص قصير يظهر في بطاقة المرحلة…"
          className="w-full rounded-2xl border border-slate-200 p-3 text-[13.5px] outline-none focus:border-emerald-400" />
        <div className="flex items-center justify-between">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11.5px] leading-relaxed text-slate-500">
            تنسيق مدعوم: <b># عنوان</b> · <b>## عنوان فرعي</b> · <b>- نقطة</b> · <b>**عريض**</b> · <b>`كود`</b> · <b>```python</b> لتلوين الكود
          </div>
          <button onClick={() => setPreview((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[12.5px] font-bold text-slate-600 hover:border-emerald-300">
            <Eye className="h-4 w-4" /> {preview ? "إخفاء المعاينة" : "معاينة حية"}
          </button>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} dir="auto"
          placeholder={"اشرح هنا…\n\n## مثال\n\n```python\nname = \"أحمد\"\nprint(f\"مرحباً {name}\")\n```\n\n- نقطة أولى\n- نقطة ثانية"}
          className="w-full rounded-2xl border border-slate-200 p-4 font-mono text-[13.5px] leading-[1.9] outline-none focus:border-emerald-400" />
        {preview && (
          <div className="rounded-2xl border border-emerald-200 bg-[#faf8f4] p-5 sm:p-8">
            <div className="mb-3 text-[12px] font-extrabold text-emerald-700">👁 معاينة المتعلم</div>
            {renderArticle(content || "_لا يوجد محتوى بعد_")}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-bold text-slate-600">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4.5 w-4.5 h-5 w-5 accent-emerald-600" />
          منشور (يظهر للمتعلمين في الرحلة)
        </label>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60">
          <Save className="h-5 w-5" /> {saving ? "جارٍ الحفظ…" : "حفظ المقال"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPython() {
  const [arts, setArts] = useState([]);
  const [view, setView] = useState({ name: "list" });

  const load = () => api.get("/python-learn/admin/articles").then((r) => setArts(r.data || [])).catch(() => setArts([]));
  useEffect(load, []);

  const remove = async (a) => {
    if (!window.confirm(`حذف "${a.title}" وامتحانه نهائياً؟`)) return;
    try { await api.delete(`/python-learn/articles/${a.id}`); toast.success("تم الحذف"); load(); }
    catch { toast.error("تعذر الحذف"); }
  };
  const move = async (i, dir) => {
    const ids = arts.map((a) => a.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setArts((p) => { const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    try { await api.post("/python-learn/articles/reorder", { ids }); }
    catch { toast.error("تعذر إعادة الترتيب"); load(); }
  };
  const togglePub = async (a) => {
    try {
      await api.patch(`/python-learn/articles/${a.id}`, {
        title: a.title, summary: a.summary || "",
        content: a.content && a.content.length >= 10 ? a.content : "محتوى المقال — عدّله من زر التعديل.",
        is_published: !a.is_published,
      });
      load();
    } catch { toast.error("تعذر التحديث"); }
  };

  if (view.name === "edit")
    return <ArticleEditor article={view.article} onClose={() => setView({ name: "list" })} onSaved={() => { setView({ name: "list" }); load(); }} />;
  if (view.name === "exam")
    return <ExamEditor article={view.article} onClose={() => setView({ name: "list" })} onSaved={load} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="font-head text-lg font-extrabold text-slate-900">🐍 رحلة تعلّم بايثون</div>
          <div className="text-[12.5px] text-slate-500">{arts.length} مقالات · تُعرض للمتعلمين بالترتيب</div>
        </div>
        <button onClick={() => setView({ name: "edit", article: null })}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-[13.5px] font-extrabold text-white">
          <Plus className="h-4 w-4" /> مقال جديد
        </button>
      </div>

      <div className="space-y-2.5">
        {arts.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="flex flex-col gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === arts.length - 1} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 font-head text-sm font-black text-white">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-head text-[14.5px] font-extrabold text-slate-900">{a.title}</span>
                {!a.is_published && <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-extrabold text-slate-500">مسودة</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2.5 text-[11.5px] font-bold text-slate-400">
                <span className="inline-flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" /> {a.questions_count || 0} أسئلة</span>
                <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {a.slug}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button title="امتحان المقال" onClick={() => setView({ name: "exam", article: a })}
                className="rounded-xl p-2.5 text-amber-500 hover:bg-amber-50"><Sparkles className="h-[18px] w-[18px]" /></button>
              <button title={a.is_published ? "إخفاء" : "نشر"} onClick={() => togglePub(a)}
                className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100">
                {a.is_published ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
              </button>
              <button title="تعديل" onClick={() => setView({ name: "edit", article: a })}
                className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-[18px] w-[18px]" /></button>
              <button title="حذف" onClick={() => remove(a)}
                className="rounded-xl p-2.5 text-rose-400 hover:bg-rose-50"><Trash2 className="h-[18px] w-[18px]" /></button>
            </div>
          </div>
        ))}
        {arts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-[13.5px] text-slate-400">
            لا توجد مقالات بعد — ابدأ بإضافة أول مقال في الرحلة 🐍
          </div>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-800">
        💡 <b>كيف تعمل الرحلة:</b> المتعلم يقرأ المقال ثم يجتاز امتحانه (تحتاج نسبة الاجتياز التي تحددها) لتُفتح المرحلة التالية.
        اختبار تحديد المستوى يولّد تلقائياً أسئلة شاملة من امتحانات المقالات التي يختارها المتعلم.
      </div>
    </div>
  );
}
