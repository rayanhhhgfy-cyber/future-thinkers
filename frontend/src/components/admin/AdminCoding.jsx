import React, { useEffect, useMemo, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { PythonEditor, PyErrorText } from "@/components/PythonCode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Code2, FlaskConical, Terminal, Plus, PenLine, Trash2, Zap,
  ListChecks, Gauge, Tag, Save,
} from "lucide-react";

/* تحديات البرمجة · إعادة تصميم CodingAdminPanel
   نفس النقاط: GET /coding/admin/problems · POST /coding/problems · PUT /coding/problems/{id}
   DELETE /coding/problems/{id} · POST /coding/problems/test-solution (المصحّح الآمن للحل المرجعي) */

const DIFF_META = [
  { l: "مبتدئ", c: "#059669" },
  { l: "سهل", c: "#0891B2" },
  { l: "متوسط", c: "#D97706" },
  { l: "صعب", c: "#E11D48" },
  { l: "خبير", c: "#7C3AED" },
];
const diffMeta = (d) => DIFF_META[Math.min(5, Math.max(1, Number(d) || 1)) - 1];

function StatCard({ icon: Icon, label, value, color, suffix }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 flex items-center gap-3.5 relative overflow-hidden">
      <span className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: color }} />
      <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}BB)` }}><Icon className="w-5 h-5" /></span>
      <div className="min-w-0">
        <div className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-none"><Counter value={value || 0} />{suffix && <span className="text-sm text-slate-400 font-bold"> {suffix}</span>}</div>
        <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

export default function AdminCoding() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // problem object or blank
  const [solCode, setSolCode] = useState("");
  const [testOut, setTestOut] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () => api.get("/coding/admin/problems").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const blank = { title: "", statement: "", difficulty: 1, xp: 30, tags: [], tests: [{ input: "", output: "" }] };
  const openEdit = (p) => { setEdit(p ? { ...p, tags: p.tags || [] } : { ...blank, tests: [{ input: "", output: "" }] }); setTestOut(null); setSolCode(""); };
  const closeEdit = () => { setEdit(null); setTestOut(null); };
  const setF = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setTest = (i, k, v) => setEdit((e) => ({ ...e, tests: e.tests.map((t, j) => (j === i ? { ...t, [k]: v } : t)) }));
  const addTest = () => setEdit((e) => ({ ...e, tests: [...e.tests, { input: "", output: "" }] }));
  const delTest = (i) => setEdit((e) => ({ ...e, tests: e.tests.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!edit.title.trim() || edit.tests.length === 0) return toast.error("العنوان وحالة اختبار واحدة على الأقل");
    setBusy("save");
    try {
      const payload = { title: edit.title, statement: edit.statement, difficulty: Number(edit.difficulty), xp: Number(edit.xp), tags: edit.tags, tests: edit.tests };
      if (edit.id) await api.put(`/coding/problems/${edit.id}`, payload);
      else await api.post("/coding/problems", payload);
      toast.success("حُفظ التحدي ✓");
      closeEdit(); load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };
  const remove = async (p) => {
    if (!window.confirm(`حذف تحدي «${p.title}» نهائياً؟`)) return;
    try { await api.delete(`/coding/problems/${p.id}`); toast.success("حُذف"); load(); } catch (e) { toast.error(apiErr(e)); }
  };
  const runSolution = async () => {
    if (!solCode.trim()) return toast.error("الصق حلاً مرجعياً أولاً");
    setBusy("test"); setTestOut(null);
    try { const { data } = await api.post("/coding/problems/test-solution", { code: solCode, tests: edit.tests }); setTestOut(data); }
    catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  const totalXp = useMemo(() => (items || []).reduce((s, p) => s + (Number(p.xp) || 0), 0), [items]);
  const totalTests = useMemo(() => (items || []).reduce((s, p) => s + ((p.tests || []).length), 0), [items]);
  const avgDiff = useMemo(() => (items?.length ? Math.round(((items || []).reduce((s, p) => s + (Number(p.difficulty) || 1), 0) / items.length) * 10) / 10 : 0), [items]);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition";

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="rounded-[28px] p-5 sm:p-7 text-white relative overflow-hidden bg-slate-950">
          <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(600px 200px at 85% -10%, rgba(16,185,129,0.35), transparent), radial-gradient(500px 220px at 10% 120%, rgba(124,58,237,0.35), transparent)" }} />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/10 backdrop-blur px-3 py-1.5 rounded-full ring-1 ring-white/15"><Terminal className="w-3.5 h-3.5 text-emerald-400" /> ساحة المبرمجين</div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3 flex items-center gap-2.5">تحديات البرمجة <span className="text-emerald-400 text-xl font-mono" dir="ltr">{`</>`}</span></h2>
              <p className="text-white/60 text-sm mt-1.5 max-w-lg leading-relaxed">صمّم مسائل برمجية بحالات اختبار دقيقة، وجرّب الحل المرجعي في المصحّح الآمن قبل النشر.</p>
            </div>
            <button data-testid="admin-coding-create-btn" onClick={() => openEdit(null)} className="pressable inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-extrabold shadow-lg shadow-emerald-500/30">
              <Plus className="w-4 h-4" /> تحدي جديد
            </button>
          </div>
        </div>
      </FadeUp>

      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Item><StatCard icon={Code2} label="تحدٍّ منشور" value={items?.length} color="#0f172a" /></Item>
        <Item><StatCard icon={Zap} label="مجموع نقاط XP المعروضة" value={totalXp} color="#D97706" /></Item>
        <Item><StatCard icon={ListChecks} label="حالة اختبار" value={totalTests} color="#0891B2" /></Item>
        <Item><StatCard icon={Gauge} label="متوسط الصعوبة" value={avgDiff} color="#7C3AED" suffix="/ 5" /></Item>
      </Stagger>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-slate-950 text-emerald-400 grid place-items-center shadow-lg mb-4"><Code2 className="w-8 h-8" /></span>
          <div className="font-head font-extrabold text-slate-800">لا تحديات بعد</div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">أنشئ أول مسألة برمجية ودع الطلاب يتنافسون على حلّها وكسب نقاط الخبرة.</p>
          <Button onClick={() => openEdit(null)} className="mt-5 rounded-xl bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 ml-1" /> إنشاء أول تحدي</Button>
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => {
            const dm = diffMeta(p.difficulty);
            return (
              <Item key={p.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover-lift">
                <div className="h-2" style={{ background: `linear-gradient(to left, ${dm.c}, ${dm.c}88)` }} />
                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-slate-950 text-emerald-400 grid place-items-center shrink-0 font-mono text-sm font-bold" dir="ltr">{`</>`}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-head font-extrabold text-slate-900 leading-snug line-clamp-2">{p.title}</div>
                      <div className="text-[11px] mt-1 font-bold" style={{ color: dm.c }}>{"★".repeat(p.difficulty || 1)}<span className="text-slate-300">{"★".repeat(5 - (p.difficulty || 1))}</span> <span className="text-slate-400">· {dm.l}</span></div>
                    </div>
                  </div>
                  {p.statement && <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{p.statement}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full"><Zap className="w-3 h-3" />+{p.xp} XP</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100"><ListChecks className="w-3 h-3" />{(p.tests || []).length} اختبار</span>
                    {(p.tags || []).slice(0, 3).map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full"><Tag className="w-3 h-3" />{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto pt-1">
                    <button onClick={() => openEdit(p)} className="pressable flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"><PenLine className="w-4 h-4" /> تعديل</button>
                    <button onClick={() => remove(p)} className="pressable flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold hover:bg-rose-100"><Trash2 className="w-4 h-4" /> حذف</button>
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-950 text-emerald-400 grid place-items-center"><Code2 className="w-4 h-4" /></span>
              {edit?.id ? "تعديل التحدي" : "تحدي جديد"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={edit.title} onChange={(e) => setF("title", e.target.value)} placeholder="عنوان التحدي" className={inputCls} />
                <div className="flex gap-2">
                  <select value={edit.difficulty} onChange={(e) => setF("difficulty", e.target.value)} className={inputCls}>
                    {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>صعوبة {"★".repeat(d)}</option>)}
                  </select>
                  <input type="number" value={edit.xp} onChange={(e) => setF("xp", e.target.value)} placeholder="XP" className={inputCls} />
                </div>
              </div>
              <textarea value={edit.statement} onChange={(e) => setF("statement", e.target.value)} placeholder="نص المسألة (اشرح المطلوب + صيغة الإدخال والإخراج)" rows={4} className={`${inputCls} mt-3`} />
              <input value={(edit.tags || []).join("، ")} onChange={(e) => setF("tags", e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean))} placeholder="وسوم (افصل بفاصلة): حلقات، رياضيات…" className={`${inputCls} mt-3`} />

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-sm font-bold text-slate-700">حالات الاختبار ({edit.tests.length}) · أول حالتين تظهران كأمثلة للطالب</span>
                  <button onClick={addTest} className="pressable text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full">+ حالة</button>
                </div>
                <div className="space-y-2">
                  {edit.tests.map((t, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2" dir="ltr">
                      <textarea value={t.input} onChange={(e) => setTest(i, "input", e.target.value)} placeholder="input" rows={2} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500 focus:bg-white transition" />
                      <textarea value={t.output} onChange={(e) => setTest(i, "output", e.target.value)} placeholder="expected output" rows={2} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500 focus:bg-white transition" />
                      <button onClick={() => delTest(i)} className="self-start px-2.5 py-2 rounded-lg bg-rose-50 text-rose-500 text-xs font-bold hover:bg-rose-100">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* المصحّح الآمن · اختبار الحل المرجعي */}
              <div className="mt-6 bg-slate-950 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 flex-wrap gap-2">
                  <span className="text-slate-300 text-xs flex items-center gap-2 font-bold"><Terminal className="w-4 h-4 text-emerald-400" /> المصحّح الآمن · اختبر حلاً مرجعياً قبل النشر</span>
                  <button onClick={runSolution} disabled={!!busy} className="pressable inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold disabled:opacity-50">
                    <FlaskConical className="w-3.5 h-3.5" /> {busy === "test" ? "يُشغّل…" : "تشغيل الاختبارات"}
                  </button>
                </div>
                <PythonEditor value={solCode} onChange={(e) => setSolCode(e.target.value)} minHeight={140}
                  placeholder={"# reference solution…\nn = int(input())\nprint(n * n)"} />
                {testOut && (
                  <div className="p-3 space-y-1.5 border-t border-slate-800">
                    <div className={`text-xs font-bold ${testOut.all_passed ? "text-emerald-400" : "text-amber-400"}`}>{testOut.all_passed ? "كل الاختبارات ناجحة · جاهز للنشر ✅" : "بعض الاختبارات فشلت · راجعها قبل النشر"}</div>
                    {testOut.results.map((r) => (
                      <div key={r.test} dir="ltr" className={`text-left font-mono text-[11px] px-3 py-2 rounded-lg ${r.passed ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                        Test {r.test}: {r.passed ? "PASS" : r.ran ? "WRONG OUTPUT" : "ERROR"} · got: {r.ran ? ((r.output || "").slice(0, 120) || "(empty)") : <PyErrorText text={(r.output || "").slice(0, 300) || "(empty)"} />}{!r.passed && ` · expected: ${String(r.expected).slice(0, 120)}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5 flex-wrap">
                <button onClick={save} disabled={!!busy} className="pressable inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                  <Save className="w-4 h-4" />{busy === "save" ? "جارٍ الحفظ…" : edit.id ? "حفظ التعديلات" : "نشر التحدي"}
                </button>
                <button onClick={closeEdit} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
