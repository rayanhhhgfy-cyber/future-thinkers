import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import { THEME_PRESETS, applyTheme } from "@/lib/theme";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Code2, FlaskConical, Terminal, Palette, Flag, Activity, Globe2, Route as RouteIcon, Plus, Bug, Copy, Mail, CheckCircle2, Trash2 } from "lucide-react";

function Empty({ t }) {
  return <div className="text-center py-10 text-slate-400 text-sm font-semibold">{t}</div>;
}

function CodingAdminPanel() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null); // problem object or "new"
  const [solCode, setSolCode] = useState("");
  const [testOut, setTestOut] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () => api.get("/coding/admin/problems").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const blank = { title: "", statement: "", difficulty: 1, xp: 30, tags: [], tests: [{ input: "", output: "" }] };
  const openEdit = (p) => { setEdit(p ? { ...p, tags: p.tags || [] } : { ...blank }); setTestOut(null); setSolCode(""); };
  const setF = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setTest = (i, k, v) => setEdit((e) => ({ ...e, tests: e.tests.map((t, j) => j === i ? { ...t, [k]: v } : t) }));
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
      setEdit(null); load();
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

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition";
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2"><Code2 className="w-5 h-5 text-slate-900" /> تحديات البرمجة ({items?.length || 0})</h2>
        <button onClick={() => openEdit(null)} className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold"><Plus className="w-4 h-4" /> تحدي جديد</button>
      </div>
      {!items ? <PageLoader /> : items.length === 0 ? <Empty t="لا تحديات بعد" /> : (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0"><Code2 className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-800 truncate">{p.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{"★".repeat(p.difficulty || 1)} · +{p.xp} XP · {(p.tests || []).length} اختبار</div>
              </div>
              <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold hover:bg-slate-200">تعديل</button>
              <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100">حذف</button>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
          <h3 className="font-head font-bold mb-4">{edit.id ? "تعديل التحدي" : "تحدي جديد"}</h3>
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-700">حالات الاختبار ({edit.tests.length}) · أول حالتين تظهران كأمثلة للطالب</span>
              <button onClick={addTest} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">+ حالة</button>
            </div>
            <div className="space-y-2">
              {edit.tests.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2" dir="ltr">
                  <textarea value={t.input} onChange={(e) => setTest(i, "input", e.target.value)} placeholder="input" rows={2} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500" />
                  <textarea value={t.output} onChange={(e) => setTest(i, "output", e.target.value)} placeholder="expected output" rows={2} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500" />
                  <button onClick={() => delTest(i)} className="self-start px-2.5 py-2 rounded-lg bg-rose-50 text-rose-500 text-xs font-bold">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* secure debugger */}
          <div className="mt-6 bg-slate-950 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-slate-300 text-xs flex items-center gap-2"><Terminal className="w-4 h-4 text-emerald-400" /> المصحّح الآمن · اختبر حلاً مرجعياً قبل النشر</span>
              <button onClick={runSolution} disabled={!!busy} className="pressable inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50">
                <FlaskConical className="w-3.5 h-3.5" /> {busy === "test" ? "يُشغّل…" : "تشغيل الاختبارات"}
              </button>
            </div>
            <textarea value={solCode} onChange={(e) => setSolCode(e.target.value)} dir="ltr" spellCheck={false} autoCapitalize="off" autoCorrect="off"
              placeholder={"# reference solution…\nn = int(input())\nprint(n * n)"}
              className="w-full bg-slate-900 text-emerald-300 font-mono text-xs p-4 min-h-[140px] outline-none resize-y" />
            {testOut && (
              <div className="p-3 space-y-1.5 border-t border-slate-800">
                <div className={`text-xs font-bold ${testOut.all_passed ? "text-emerald-400" : "text-amber-400"}`}>{testOut.all_passed ? "كل الاختبارات ناجحة · جاهز للنشر ✅" : "بعض الاختبارات فشلت · راجعها قبل النشر"}</div>
                {testOut.results.map((r) => (
                  <div key={r.test} dir="ltr" className={`text-left font-mono text-[11px] px-3 py-2 rounded-lg ${r.passed ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                    Test {r.test}: {r.passed ? "PASS" : r.ran ? "WRONG OUTPUT" : "ERROR"} · got: {(r.output || "").slice(0, 120) || "(empty)"}{!r.passed && ` · expected: ${String(r.expected).slice(0, 120)}`}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5 flex-wrap">
            <button onClick={save} disabled={!!busy} className="pressable px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{busy === "save" ? "جارٍ الحفظ…" : edit.id ? "حفظ التعديلات" : "نشر التحدي"}</button>
            <button onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemePanel() {
  const [current, setCurrent] = useState(localStorage.getItem("ft-theme") || "emerald");
  const [busy, setBusy] = useState("");
  useEffect(() => { api.get("/theme").then((r) => setCurrent(r.data.preset || "emerald")).catch(() => {}); }, []);
  const apply = async (key) => {
    setBusy(key);
    try {
      await api.put("/admin/theme", { preset: key });
      setCurrent(key);
      localStorage.setItem("ft-theme", key);
      applyTheme(key);
      toast.success("طُبّقت السمة على الموقع كاملاً 🎨");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-1"><Palette className="w-5 h-5 text-violet-600" /> مظهر الموقع</h2>
      <p className="text-xs text-slate-400 mb-5">اختر سمة لونية واحدة · تتغير تدرجات البطولات والأقسام الداكنة في الموقع كاملاً فوراً لكل الزوار. آمن تماماً: القيم محفوظة كقائمة مغلقة.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {THEME_PRESETS.map((p) => (
          <button key={p.key} onClick={() => apply(p.key)} disabled={!!busy}
            className={`relative rounded-3xl overflow-hidden text-right transition-all ${current === p.key ? "ring-4 ring-emerald-500 scale-[1.02]" : "hover:scale-[1.02]"}`}>
            <div className="h-32 p-4 flex flex-col justify-between text-white" style={{ background: `linear-gradient(135deg, ${p.c} 0%, ${p.b} 50%, ${p.accent} 130%)` }}>
              <span className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur grid place-items-center text-sm font-black">ف</span>
              <span>
                <span className="block font-head font-extrabold">{p.name}</span>
                <span className="block text-[11px] text-white/70">لمسة: {p.accent}</span>
              </span>
            </div>
            {current === p.key && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-slate-900 text-[10px] font-black shadow">مفعّلة الآن ✓</span>}
            {busy === p.key && <span className="absolute inset-0 bg-black/30 grid place-items-center text-white text-sm font-bold">يُطبّق…</span>}
          </button>
        ))}
      </div>
      <div className="mt-5 bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed">
        💡 تشمل السمة: تدرجات الواجهات الرئيسية (الصفحة الافتتاحية، اللوحات، النوادي) وعناصر الإبراز. أغطية الملفات الشخصية تبقى اختياراً فردياً لكل طالب من إعداداته.
      </div>
    </div>
  );
}

const REPORT_KIND = { book: "كتاب", discussion: "نقاش", reply: "رد", user: "مستخدم", event: "فعالية", activity: "نشاط", work: "عمل أدبي", comment: "تعليق كتاب" };

function ReportsPanel() {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState(null);
  const load = () => { setItems(null); api.get("/reports", { params: { status } }).then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([])); };
  useEffect(load, [status]);
  const resolve = async (id, action) => {
    try { await api.post(`/reports/${id}/resolve`, { action }); toast.success(action === "delete" ? "حُذف المحتوى وأُغلق البلاغ" : "أُغلق البلاغ"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-4"><Flag className="w-5 h-5 text-rose-600" /> مركز البلاغات</h2>
      <div className="flex gap-1.5 mb-5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow w-fit">
        {[["open", "المفتوحة"], ["resolved", "المُغلقة"], ["dismissed", "المرفوضة"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`px-4 py-2 rounded-xl text-sm font-bold ${status === k ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{l}</button>
        ))}
        <button onClick={load} className="px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50">تحديث</button>
      </div>
      {!items ? <PageLoader /> : items.length === 0 ? <Empty t="لا بلاغات هنا 🎉" /> : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow flex flex-wrap items-start gap-3">
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-extrabold shrink-0">{REPORT_KIND[r.entity_type] || r.entity_type}</span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold text-sm text-slate-800">{r.reason}</div>
                {r.details && <div className="text-xs text-slate-500 mt-0.5">{r.details}</div>}
                <div className="text-[11px] text-slate-400 mt-1">أبلغ عنه: {r.reporter_name} · {timeAgo(r.created_at)}</div>
                {r.action && <div className="text-[11px] text-slate-400">الإجراء: {r.action}</div>}
              </div>
              {status === "open" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => resolve(r.id, "delete")} className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold">حذف المحتوى</button>
                  <button onClick={() => resolve(r.id, "dismiss")} className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">تجاهل</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthPanel() {
  const [h, setH] = useState(null);
  useEffect(() => { api.get("/admin/system-health").then((r) => setH(r.data)).catch(() => setH({})); }, []);
  if (!h) return <PageLoader />;
  const colAr = { users: "المستخدمون", books: "الكتب", works: "الأعمال", ventures: "المشاريع", chess_games: "مباريات الشطرنج", notifications: "الإشعارات", push_subscriptions: "أجهزة الدفع", certificates: "الشهادات", xp_transactions: "حركات النقاط", reports: "البلاغات" };
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-5"><Activity className="w-5 h-5 text-emerald-600" /> صحة النظام <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">آخر فحص: {String(h.checked_at || "").slice(11, 16)}</span></h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 rounded-3xl p-5 text-white ft-shadow">
          <div className="text-xs text-slate-400 mb-1">بانتظار إجراء</div>
          <div className="space-y-1.5 text-sm font-semibold">
            <div>معلمون: {h.pending?.teachers ?? "·"}</div>
            <div>كتب: {h.pending?.books ?? "·"}</div>
            <div>بلاغات مفتوحة: {h.pending?.reports_open ?? "·"}</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow">
          <div className="text-xs text-slate-400 mb-1">الأمان</div>
          <div className="space-y-1.5 text-sm font-semibold text-slate-700">
            <div>حسابات مقفلة الآن: {h.security?.active_locks ?? "·"}</div>
            <div>هويات بمحاولات فاشلة: {h.security?.identities_with_failures ?? "·"}</div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow">
          <div className="text-xs text-slate-400 mb-1">التكاملات</div>
          <div className="space-y-1.5 text-sm font-semibold text-slate-700">
            <div>تخزين تليجرام: {h.integrations?.telegram_storage ? "✅ مهيأ" : "⚠️ غير مهيأ"}</div>
            <div>دفع الهاتف (VAPID): {h.integrations?.push_vapid ? "✅ مهيأ" : "⚠️ غير مهيأ"}</div>
            <div>أجهزة مسجلة: {h.integrations?.push_devices ?? "·"}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
        <div className="text-sm font-bold text-slate-700 mb-3">أحجام المجموعات (عدد السجلات التقديري)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(h.collections || {}).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-50 p-3.5 text-center">
              <div className="font-head font-extrabold text-slate-900">{(v ?? 0).toLocaleString("en-US")}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{colAr[k] || k}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap text-[11px] font-bold">
          {Object.entries(h.users_by_role || {}).map(([r, n]) => (
            <span key={r} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">{r}: {n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingPanel() {
  const [cms, setCms] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/admin/cms/landing").then((r) => setCms(r.data?.value || r.data || {})).catch(() => setCms({})); }, []);
  if (!cms) return <PageLoader />;
  const f = (k) => cms[k] || "";
  const set = (k, v) => setCms((c) => ({ ...c, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...cms, goals: (cms.goalsText || "").split("\n").map((s) => s.trim()).filter(Boolean),
        activities: (cms.activitiesText || "").split("\n").map((s) => s.trim()).filter(Boolean) };
      delete payload.goalsText; delete payload.activitiesText;
      await api.put("/admin/cms/landing", payload);
      toast.success("حُفظت صفحة الهبوط · حدّث الموقع لتراها 🎉");
    } catch (e) { toast.error(apiErr(e)); }
    setSaving(false);
  };
  const ta = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition";
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-1"><Globe2 className="w-5 h-5 text-sky-600" /> محرر صفحة الهبوط</h2>
      <p className="text-xs text-slate-400 mb-5">حرّر نصوص الصفحة الرئيسية دون لمس الكود · تُحفظ فوراً وتنعكس على الموقع.</p>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={f("hero_badge")} onChange={(e) => set("hero_badge", e.target.value)} placeholder="شارة البطل (المنصة المعرفية…)" className={ta} />
          <input value={f("hero_title")} onChange={(e) => set("hero_title", e.target.value)} placeholder="العنوان الرئيسي" className={ta} />
        </div>
        <input value={f("hero_highlight")} onChange={(e) => set("hero_highlight", e.target.value)} placeholder="الجزء الملوّن من العنوان (ونصنع المستقبل)" className={ta} />
        <textarea value={f("hero_subtitle")} onChange={(e) => set("hero_subtitle", e.target.value)} placeholder="الفقرة التعريفية تحت العنوان" rows={2} className={ta} />
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">من نحن</label>
          <textarea value={f("about")} onChange={(e) => set("about", e.target.value)} rows={3} className={ta} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">رؤيتنا</label>
          <textarea value={f("vision")} onChange={(e) => set("vision", e.target.value)} rows={3} className={ta} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">رسالتنا</label>
          <textarea value={f("mission")} onChange={(e) => set("mission", e.target.value)} rows={3} className={ta} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">أهدافنا (هدف في كل سطر)</label>
          <textarea value={cms.goalsText ?? (f("goals") || []).join("\n")} onChange={(e) => set("goalsText", e.target.value)} rows={5} className={ta} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1.5">أنشطتنا (نشاط في كل سطر)</label>
          <textarea value={cms.activitiesText ?? (f("activities") || []).join("\n")} onChange={(e) => set("activitiesText", e.target.value)} rows={3} className={ta} />
        </div>
        <button onClick={save} disabled={saving} className="pressable px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{saving ? "جارٍ الحفظ…" : "حفظ صفحة الهبوط"}</button>
      </div>
    </div>
  );
}

function PathsAdminPanel() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const [catalog, setCatalog] = useState({ books: [], problems: [], competitions: [] });
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/paths").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => {
    load();
    api.get("/books", { params: { limit: 100 } }).then((r) => setCatalog((c) => ({ ...c, books: r.data.items || [] }))).catch(() => {});
    api.get("/coding/problems").then((r) => setCatalog((c) => ({ ...c, problems: r.data || [] }))).catch(() => {});
    api.get("/competitions").then((r) => { const d = r.data; setCatalog((c) => ({ ...c, competitions: Array.isArray(d) ? d : (d.items || []) })); }).catch(() => {});
  }, []);
  const blank = { title: "", desc: "", icon: "🛤️", color: "#059669", steps: [{ kind: "book", ref_id: "", title: "", xp: 20 }] };
  const openEdit = (p) => setEdit(p ? JSON.parse(JSON.stringify(p)) : { ...blank, steps: [{ kind: "book", ref_id: "", title: "", xp: 20 }] });
  const setF = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setStep = (i, k, v) => setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => j === i ? { ...s, [k]: v } : s) }));
  const pickRef = (i, kind, refId) => {
    const list = kind === "book" ? catalog.books : kind === "problem" ? catalog.problems : catalog.competitions;
    const found = list.find((x) => x.id === refId);
    setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => j === i ? { ...s, ref_id: refId, title: found ? found.title : s.title } : s) }));
  };
  const save = async () => {
    if (!edit.title.trim()) return toast.error("العنوان مطلوب");
    if (edit.steps.some((s) => !s.ref_id)) return toast.error("اختر مرجعاً لكل خطوة من القائمة");
    setBusy(true);
    try {
      const payload = { title: edit.title, desc: edit.desc, icon: edit.icon, color: edit.color, steps: edit.steps.map((s) => ({ ...s, xp: Number(s.xp) || 10 })) };
      if (edit.id) await api.put(`/paths/${edit.id}`, payload);
      else await api.post("/paths", payload);
      toast.success("حُفظ المسار ✓");
      setEdit(null); load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  const remove = async (p) => {
    if (!window.confirm(`حذف مسار «${p.title}»؟`)) return;
    try { await api.delete(`/paths/${p.id}`); load(); } catch (e) { toast.error(apiErr(e)); }
  };
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white transition";
  const refList = (kind) => kind === "book" ? catalog.books : kind === "problem" ? catalog.problems : catalog.competitions;
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2"><RouteIcon className="w-5 h-5 text-emerald-600" /> مسارات التعلم ({items?.length || 0})</h2>
        <button onClick={() => openEdit(null)} className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold"><Plus className="w-4 h-4" /> مسار جديد</button>
      </div>
      {!items ? <PageLoader /> : items.length === 0 && !edit ? <Empty t="لا مسارات بعد" /> : (
        <div className="space-y-3 mb-6">
          {(items || []).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow flex items-center gap-3 flex-wrap">
              <span className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0" style={{ background: `${p.color}22` }}>{p.icon}</span>
              <div className="flex-1 min-w-[160px]">
                <div className="font-bold text-sm text-slate-800">{p.title}</div>
                <div className="text-[11px] text-slate-400">{p.steps.length} خطوات</div>
              </div>
              <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold">تعديل</button>
              <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold">حذف</button>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
          <h3 className="font-head font-bold mb-4">{edit.id ? "تعديل المسار" : "مسار جديد"}</h3>
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
            <input value={edit.title} onChange={(e) => setF("title", e.target.value)} placeholder="عنوان المسار: رحلة القارئ الصغير" className={inputCls} />
            <input value={edit.icon} onChange={(e) => setF("icon", e.target.value)} placeholder="🛤️" className={`${inputCls} w-24 text-center`} />
            <input type="color" value={edit.color} onChange={(e) => setF("color", e.target.value)} className="w-14 h-[42px] rounded-xl border border-slate-200 cursor-pointer" />
          </div>
          <textarea value={edit.desc} onChange={(e) => setF("desc", e.target.value)} placeholder="وصف قصير للمسار" rows={2} className={`${inputCls} mt-3`} />
          <div className="mt-5 space-y-3">
            {edit.steps.map((s, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 grid sm:grid-cols-[130px_1fr_90px_auto] gap-2">
                <select value={s.kind} onChange={(e) => { setStep(i, "kind", e.target.value); setStep(i, "ref_id", ""); }} className={inputCls}>
                  <option value="book">كتاب</option>
                  <option value="problem">مسألة برمجة</option>
                  <option value="competition">مسابقة</option>
                </select>
                <select value={s.ref_id} onChange={(e) => pickRef(i, s.kind, e.target.value)} className={inputCls}>
                  <option value="">اختر من القائمة…</option>
                  {refList(s.kind).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                </select>
                <input type="number" value={s.xp} onChange={(e) => setStep(i, "xp", e.target.value)} placeholder="XP" className={inputCls} />
                <button onClick={() => setEdit((e) => ({ ...e, steps: e.steps.filter((_, j) => j !== i) }))} className="px-3 rounded-xl bg-rose-50 text-rose-500 text-xs font-bold">حذف</button>
                <input value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} placeholder="عنوان الخطوة كما يراها الطالب" className={`${inputCls} sm:col-span-4`} />
              </div>
            ))}
            <button onClick={() => setEdit((e) => ({ ...e, steps: [...e.steps, { kind: "book", ref_id: "", title: "", xp: 20 }] }))} className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full">+ خطوة</button>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={save} disabled={busy} className="pressable px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{busy ? "…" : "حفظ المسار"}</button>
            <button onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsV2() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/analytics-v2").then((r) => setD(r.data)).catch(() => setD({ days: [], totals_30d: {} })); }, []);
  if (!d) return null;
  const t = d.totals_30d || {};
  const cells = [
    { l: "تسجيلات (30 يوم)", v: t.signups || 0, c: "#2563EB" },
    { l: "نقاط XP موزعة", v: (t.xp || 0).toLocaleString("en-US"), c: "#059669" },
    { l: "صفحات مقروءة", v: (t.pages || 0).toLocaleString("en-US"), c: "#4F46E5" },
    { l: "مباريات شطرنج", v: t.chess || 0, c: "#0A192F" },
    { l: "أعمال منشورة", v: t.works || 0, c: "#7C3AED" },
    { l: "ذروة نشطين يومياً", v: t.active_users_peak || 0, c: "#D97706" },
  ];
  return (
    <FadeUp delay={0.2}>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6 mt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-head font-bold mb-1 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> نمو المنصة · آخر 30 يوماً</h3>
            <p className="text-[11px] text-slate-400 mb-4">نشاط حقيقي من حركات النقاط والتسجيلات والمباريات</p>
          </div>
          <button onClick={async () => { try { const { data } = await api.post("/admin/digest/send"); toast.success(`أُرسل الملخص الأسبوعي إلى ${data.sent} طالب 📊`); } catch (e) { toast.error(apiErr(e)); } }}
            className="pressable px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shrink-0">إرسال الملخص الأسبوعي الآن</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {cells.map((c) => (
            <div key={c.l} className="rounded-2xl bg-slate-50 p-3.5 text-center">
              <div className="font-head font-extrabold text-lg" style={{ color: c.c }}>{c.v}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{c.l}</div>
            </div>
          ))}
        </div>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.days}>
              <defs>
                <linearGradient id="gXp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.35} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #EEF2F7", fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" name="نقاط XP" stroke="#059669" fill="url(#gXp)" strokeWidth={2} />
              <Area type="monotone" dataKey="active_users" name="مستخدمون نشطون" stroke="#2563EB" fill="url(#gAct)" strokeWidth={2} />
              <Area type="monotone" dataKey="signups" name="تسجيلات" stroke="#D97706" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </FadeUp>
  );
}

function ErrorsPanel() {
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({ open: 0, resolved: 0, total: 0 });
  const [status, setStatus] = useState("open");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [contact, setContact] = useState(null); // error doc being contacted
  const [contactMsg, setContactMsg] = useState("");
  const [busy, setBusy] = useState("");
  const SRC = { server: ["خادم", "bg-rose-100 text-rose-700"], client: ["واجهة", "bg-sky-100 text-sky-700"], auto: ["تلقائي", "bg-amber-100 text-amber-700"], manual: ["بلاغ مستخدم", "bg-emerald-100 text-emerald-700"] };
  const load = async (p = page, st = status, src = source) => {
    try {
      const { data } = await api.get("/admin/errors", { params: { status: st, source: src, page: p, limit: 20 } });
      setItems(data.items); setCounts(data.counts); setPages(data.pages);
    } catch (e) { toast.error(apiErr(e)); setItems([]); }
  };
  useEffect(() => { load(1); setPage(1); /* eslint-disable-next-line */ }, [status, source]);
  const setSt = async (e, st) => {
    setBusy(e.id);
    try { await api.post(`/admin/errors/${e.id}/resolve`, { status: st }); load(); }
    catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };
  const del = async (e) => {
    if (!window.confirm("حذف سجل هذا الخطأ نهائيًا؟")) return;
    setBusy(e.id);
    try { await api.delete(`/admin/errors/${e.id}`); toast.success("تم الحذف"); load(); }
    catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };
  const copyFull = async (e) => {
    const text = `رسالة الخطأ: ${e.message}\nالمصدر: ${e.source}\nالصفحة: ${e.page}\nالمستخدم: ${e.user_name || "زائر"} (${e.user_email || ""})\nالوقت: ${e.created_at}\n\nالتفاصيل الكاملة:\n${e.detail || ""}`;
    try { await navigator.clipboard.writeText(text); toast.success("تم نسخ الخطأ كاملًا 📋"); }
    catch { toast.error("تعذر النسخ"); }
  };
  const sendContact = async () => {
    setBusy("contact");
    try {
      await api.post(`/admin/errors/${contact.id}/contact`, { message: contactMsg });
      toast.success("أُرسلت الرسالة للمستخدم عبر الإشعارات 🔔");
      setContact(null); setContactMsg(""); load();
    } catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-1"><Bug className="w-5 h-5 text-rose-600" /> سجل الأخطاء</h2>
      <p className="text-xs text-slate-400 mb-4">كل خطأ يحدث في الموقع يُسجل هنا بتفاصيله الحقيقية الكاملة · المستخدمون لا يرون إلا رسائل ودية قصيرة · المفتوحة: {counts.open} · تم حلها: {counts.resolved} · الإجمالي: {counts.total}</p>
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow w-fit">
          {[["open", "المفتوحة"], ["resolved", "تم حلها"], ["all", "الكل"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`px-4 py-2 rounded-xl text-sm font-bold ${status === k ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{l}{k === "open" && counts.open ? ` (${counts.open})` : ""}</button>
          ))}
        </div>
        <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow w-fit">
          {[["", "كل المصادر"], ["server", "الخادم"], ["client", "الواجهة"], ["auto", "تلقائي"], ["manual", "بلاغات"]].map(([k, l]) => (
            <button key={k || "all"} onClick={() => setSource(k)} className={`px-3 py-2 rounded-xl text-xs font-bold ${source === k ? "bg-rose-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => load()} className="px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-white">تحديث</button>
      </div>
      {!items ? <PageLoader /> : items.length === 0 ? <Empty t="لا أخطاء هنا 🎉" /> : (
        <div className="space-y-3">
          {items.map((e) => {
            const [sLabel, sCls] = SRC[e.source] || [e.source, "bg-slate-100 text-slate-600"];
            const opened = openId === e.id;
            return (
              <div key={e.id} className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 ${sCls}`}>{sLabel}</span>
                  <div className="flex-1 min-w-[220px]">
                    <div className="font-semibold text-sm text-slate-800 break-words">{e.message}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2">
                      <span dir="ltr">{e.page || ""}</span>
                      <span>·</span>
                      <span>{e.user_name ? `${e.user_name} (${e.user_email || ""})` : "زائر غير مسجل"}</span>
                      <span>·</span>
                      <span>{timeAgo(e.created_at)}</span>
                      {e.contacted_at && <span className="text-sky-600 font-bold">· تمت مراسلته</span>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 ${e.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{e.status === "resolved" ? "تم الحل" : "مفتوح"}</span>
                </div>
                {opened && (
                  <div className="mt-3">
                    <pre dir="ltr" className="text-left bg-slate-900 text-emerald-200/90 text-[11px] leading-relaxed rounded-xl p-3 max-h-72 overflow-auto whitespace-pre-wrap break-words">{e.detail || "لا توجد تفاصيل تقنية مرفقة"}</pre>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setOpenId(opened ? null : e.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold">{opened ? "إخفاء التفاصيل" : "عرض الخطأ كاملًا"}</button>
                  <button onClick={() => copyFull(e)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"><Copy className="w-3.5 h-3.5" /> نسخ الخطأ</button>
                  {e.user_id && <button onClick={() => { setContact(e); setContactMsg("مرحبًا، لاحظنا حدوث خطأ أثناء استخدامك المنصة وعملنا على إصلاحه. جرّب الآن وأخبرنا إن تكرر 🙏"); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"><Mail className="w-3.5 h-3.5" /> مراسلة المستخدم</button>}
                  {e.status === "open"
                    ? <button disabled={busy === e.id} onClick={() => setSt(e, "resolved")} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> تحديد كمحلول</button>
                    : <button disabled={busy === e.id} onClick={() => setSt(e, "open")} className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold disabled:opacity-50">إعادة فتح</button>}
                  <button disabled={busy === e.id} onClick={() => del(e)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold disabled:opacity-40">السابق</button>
          <span className="text-sm text-slate-500 font-bold">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold disabled:opacity-40">التالي</button>
        </div>
      )}
      {contact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setContact(null)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-md" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="font-head font-extrabold">مراسلة {contact.user_name || "المستخدم"}</h3>
            <p className="text-xs text-slate-400 mt-1">ستصله الرسالة كإشعار داخل المنصة بخصوص الخطأ: «{contact.message}»</p>
            <textarea value={contactMsg} onChange={(ev) => setContactMsg(ev.target.value)} rows={4}
              className="w-full mt-3 rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-400" placeholder="اكتب رسالتك..." />
            <div className="flex gap-2 mt-4">
              <button disabled={busy === "contact" || contactMsg.trim().length < 3} onClick={sendContact} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-50">إرسال الإشعار</button>
              <button onClick={() => setContact(null)} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { CodingAdminPanel, ThemePanel, ReportsPanel, HealthPanel, LandingPanel, PathsAdminPanel, AnalyticsV2, ErrorsPanel };
