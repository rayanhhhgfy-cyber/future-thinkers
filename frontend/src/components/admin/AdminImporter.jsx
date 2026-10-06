import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CloudDownload, Power, Sparkles, Search, Play, Trash2, Plus, Save,
  RefreshCw, Check, X, BookOpen, ListChecks, ShieldCheck, Clock3,
  LibraryBig, AlertTriangle, Globe2, Layers, Zap,
} from "lucide-react";
import { PageLoader } from "@/components/Layout";

/* مستورد الكتب · يسحب كتباً ملكية عامة من مصادر مفتوحة (archive.org) إلى
   المكتبة عبر نفس مسار الرفع اليدوي (Telegram). تحكّم عميق: مصادر، حدود،
   جدولة، نشر تلقائي أو قائمة مراجعة، وسجل كامل · بلا تكرار أبداً. */

const CAT_NAMES = {
  science: "علوم", culture: "ثقافة", religion: "دين", history: "تاريخ",
  literature: "أدب", novels: "روايات", philosophy: "فلسفة", programming: "برمجة",
  ai: "ذكاء اصطناعي", economics: "اقتصاد", entrepreneurship: "ريادة أعمال",
  "self-dev": "تطوير الذات", arts: "فنون", technology: "تكنولوجيا", general: "عام",
};

const LANGS = [["any", "كل اللغات"], ["ar", "العربية"], ["en", "English"]];

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" },
});

const inp = "min-h-[46px] w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 placeholder:font-semibold placeholder:text-slate-300";

function Toggle({ label, on, onClick, busy, testid }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} data-testid={testid}
      disabled={busy} onClick={onClick}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-all duration-300 disabled:opacity-50 ${on ? "bg-gradient-to-l from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/40" : "bg-slate-200"}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${on ? "start-1" : "start-[26px]"}`} style={on ? { insetInlineStart: "26px" } : { insetInlineStart: "4px" }} />
    </button>
  );
}

function Panel({ icon: Icon, grad, shadow, title, sub, children, extra, i = 0 }) {
  return (
    <motion.section {...fadeUp(i)} className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_18px_44px_-20px_rgba(15,23,42,0.18)] sm:p-6">
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${grad}`} />
      <div className="mb-4 flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-lg ${shadow}`}>
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-head text-base font-black text-slate-900">{title}</h3>
          <p className="truncate text-[11px] font-bold text-slate-400">{sub}</p>
        </div>
        {extra}
      </div>
      {children}
    </motion.section>
  );
}

const stateChip = (st) => {
  if (st === "imported") return <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white">مستورد ✓</span>;
  if (st === "queued") return <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-900">بالانتظار</span>;
  if (st === "failed") return <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black text-white">فشل</span>;
  if (st === "skipped_dup") return <span className="rounded-full bg-slate-400 px-2.5 py-1 text-[10px] font-black text-white">مكرر · تخطّي</span>;
  if (st === "rejected") return <span className="rounded-full bg-slate-300 px-2.5 py-1 text-[10px] font-black text-slate-600">مرفوض</span>;
  return <span className="rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-black text-white">جديد</span>;
};

export default function AdminImporter() {
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState("");
  const [jobs, setJobs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [srcForm, setSrcForm] = useState({ label: "", query: "", lang: "any", category: "auto", max_items: 5 });
  const [q, setQ] = useState("");
  const [qLang, setQLang] = useState("any");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState({});

  const load = async () => {
    try {
      const [c, j, qq] = await Promise.all([
        api.get("/admin/importer/config"),
        api.get("/admin/importer/jobs", { params: { limit: 60 } }),
        api.get("/admin/importer/jobs", { params: { status: "queued", limit: 50 } }),
      ]);
      setCfg(c.data); setJobs(j.data.jobs || []); setQueue(qq.data.jobs || []);
    } catch (e) { toast.error(apiErr(e, "تعذّر تحميل المستورد")); }
  };
  useEffect(() => { load(); }, []);

  const act = async (key, fn, msg) => {
    setBusy(key);
    try { await fn(); if (msg) toast.success(msg); await load(); }
    catch (e) { toast.error(apiErr(e, "حدث خطأ")); }
    setBusy("");
  };

  if (!cfg) return <PageLoader />;
  const st = cfg.stats || {};
  const cats = cfg.categories || Object.keys(CAT_NAMES);
  const pickedIds = results.filter((r) => picked[r.archive_id] && r.state === "new");

  const doSearch = async () => {
    if (q.trim().length < 2) return toast.error("اكتب كلمتين للبحث على الأقل");
    setBusy("search");
    try {
      const { data } = await api.get("/admin/importer/config").catch(() => ({ data: null }));
      const r = await api.post("/admin/importer/search", { query: q.trim(), lang: qLang, rows: 24 });
      setResults(r.data.items || []); setPicked({});
      if (!(r.data.items || []).length) toast("لا نتائج · جرّب كلمات أخرى");
    } catch (e) { toast.error(apiErr(e, "فشل البحث")); }
    setBusy("");
  };

  const doImportPicked = async () => {
    if (!pickedIds.length) return;
    setBusy("import");
    try {
      const { data } = await api.post("/admin/importer/import", { items: pickedIds });
      const res = data.results || [];
      const done = res.filter((x) => x.status === "imported").length;
      const qd = res.filter((x) => x.status === "queued").length;
      const failed = res.filter((x) => x.status === "failed").length;
      toast.success(`انتهى الاستيراد · نُشر ${done}${qd ? ` · بالانتظار ${qd}` : ""}${failed ? ` · فشل ${failed}` : ""}`);
      await load();
      const r2 = await api.post("/admin/importer/search", { query: q.trim(), lang: qLang, rows: 24 }).catch(() => null);
      if (r2) { setResults(r2.data.items || []); setPicked({}); }
    } catch (e) { toast.error(apiErr(e, "فشل الاستيراد")); }
    setBusy("");
  };

  return (
    <div className="space-y-5">
      {/* hero */}
      <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] ft-hero-gradient grain p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -top-16 left-1/4 h-64 w-64 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 30%, transparent)" }} />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 ring-1 ring-white/20"><CloudDownload className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-head text-2xl font-black">مستورد الكتب</h2>
            <p className="mt-0.5 text-sm font-semibold text-slate-300">يسحب كتباً ملكية عامة عربية وإنجليزية من مصادر مفتوحة، يرفعها إلى Telegram، ويضيفها للمكتبة كاملة البيانات · بلا تكرار</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black ring-1 ${cfg.enabled ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/40" : "bg-white/10 text-slate-300 ring-white/15"}`}>
            <span className={`h-2 w-2 rounded-full ${cfg.enabled ? "bg-emerald-300 animate-pulse" : "bg-slate-400"}`} />
            {cfg.enabled ? "الفحص المستمر مفعّل" : "الفحص المستمر متوقف"}
          </span>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {[
            [LibraryBig, `مستوردة: ${st.imported || 0}`],
            [Clock3, `بالانتظار: ${queue.length}`],
            [AlertTriangle, `فاشلة: ${st.failed || 0}`],
            [Globe2, `مصادر نشطة: ${(cfg.sources || []).filter((s) => s.active).length}/${(cfg.sources || []).length}`],
            [Layers, `تصنيف افتراضي: ${CAT_NAMES[cfg.default_category] || cfg.default_category}`],
          ].map(([Icon, text]) => (
            <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black ring-1 ring-white/15">
              <Icon className="h-3.5 w-3.5" /> {text}
            </span>
          ))}
        </div>
      </motion.div>

      {/* general controls */}
      <Panel i={1} icon={Power} grad="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/30"
        title="التحكم العام" sub="التفعيل، النشر، والحدود · تحفظ فوراً وتسري على كل تشغيل">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-head text-sm font-black text-slate-900">تفعيل المستورد والفحص المستمر</p>
              <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-slate-400">عند التفعيل يفحص المصادر كل {cfg.interval_hours} ساعة ويستورد الجديد تلقائياً</p>
            </div>
            <Toggle label="تفعيل المستورد" testid="imp-enabled" on={!!cfg.enabled} busy={busy === "cfg"}
              onClick={() => act("cfg", () => api.put("/admin/importer/config", { enabled: !cfg.enabled }), cfg.enabled ? "أُوقف الفحص المستمر" : "فُعّل الفحص المستمر")} />
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-slate-50/50 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-head text-sm font-black text-slate-900">النشر المباشر</p>
              <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-slate-400">{cfg.auto_publish ? "الكتب المستوردة تظهر في المكتبة فوراً" : "الكتب تدخل قائمة المراجعة أولاً ولا تُنشر إلا بموافقتك"}</p>
            </div>
            <Toggle label="النشر المباشر" testid="imp-autopublish" on={!!cfg.auto_publish} busy={busy === "cfg"}
              onClick={() => act("cfg", () => api.put("/admin/importer/config", { auto_publish: !cfg.auto_publish }), cfg.auto_publish ? "صار النشر بمراجعة أولاً" : "صار النشر مباشراً")} />
          </div>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-400">التصنيف الافتراضي</span>
            <select value={cfg.default_category} data-testid="imp-defcat" className={inp}
              onChange={(e) => act("cfg", () => api.put("/admin/importer/config", { default_category: e.target.value }), "حُفظ التصنيف الافتراضي")}>
              {cats.map((c) => <option key={c} value={c}>{CAT_NAMES[c] || c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-400">أقصى حجم ملف (MB)</span>
            <input type="number" min="5" max="100" defaultValue={cfg.max_file_mb} data-testid="imp-maxmb" className={inp}
              onBlur={(e) => { const v = Number(e.target.value); if (v && v !== cfg.max_file_mb) act("cfg", () => api.put("/admin/importer/config", { max_file_mb: v }), "حُفظ حد الحجم"); }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-400">كتب كل تشغيل (كل المصادر)</span>
            <input type="number" min="1" max="50" defaultValue={cfg.per_run} data-testid="imp-perrun" className={inp}
              onBlur={(e) => { const v = Number(e.target.value); if (v && v !== cfg.per_run) act("cfg", () => api.put("/admin/importer/config", { per_run: v }), "حُفظ عدد كل تشغيل"); }} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black text-slate-400">فترة الفحص (ساعة)</span>
            <input type="number" min="1" max="168" defaultValue={cfg.interval_hours} data-testid="imp-interval" className={inp}
              onBlur={(e) => { const v = Number(e.target.value); if (v && v !== cfg.interval_hours) act("cfg", () => api.put("/admin/importer/config", { interval_hours: v }), "حُفظت فترة الفحص"); }} />
          </label>
        </div>
        <button disabled={busy === "runall"} data-testid="imp-runall"
          onClick={() => act("runall", () => api.post("/admin/importer/run-now"), "اكتمل فحص كل المصادر")}
          className="pressable mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-l from-teal-500 to-emerald-600 px-6 font-head text-sm font-black text-white shadow-[0_14px_28px_-10px_rgba(20,184,166,0.55)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-40">
          {busy === "runall" ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Play className="h-4.5 w-4.5" />} تشغيل فحص كل المصادر الآن
        </button>
        {cfg.last_run_at && <p className="mt-2 text-[11px] font-bold text-slate-400">آخر فحص شامل: <span dir="ltr">{String(cfg.last_run_at).slice(0, 16).replace("T", " ")}</span></p>}
      </Panel>

      {/* sources */}
      <Panel i={2} icon={Globe2} grad="from-sky-500 to-blue-600" shadow="shadow-sky-500/30"
        title="مصادر الاستيراد" sub="كل مصدر = بحث أو مجموعة في Archive.org · يُفحص دورياً ويستورد الأحدث فقط">
        <div className="grid gap-2.5">
          {(cfg.sources || []).length === 0 && <p className="text-sm font-bold text-slate-400">لا مصادر بعد · أضف أول مصدر من النموذج تحت.</p>}
          {(cfg.sources || []).map((s) => (
            <div key={s.key} className={`flex flex-wrap items-center gap-3 rounded-3xl border p-4 transition ${s.active ? "border-sky-100 bg-gradient-to-b from-sky-50/70 to-white" : "border-slate-100 bg-slate-50/60"}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 ${s.active ? "" : "opacity-35 saturate-50"}`}><Globe2 className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-head text-sm font-black ${s.active ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
                <p className="truncate text-[11px] font-bold text-slate-400" dir="ltr">{s.query}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700">{(LANGS.find(([v]) => v === s.lang) || LANGS[0])[1]}</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{s.category === "auto" ? "تصنيف تلقائي" : (CAT_NAMES[s.category] || s.category)}</span>
                  <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-black text-white">حتى {s.max_items} كل فحص</span>
                  {s.last_stats && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">{s.last_stats}</span>}
                </div>
              </div>
              <Toggle label={`تفعيل مصدر ${s.label}`} testid={`imp-src-toggle-${s.key}`} on={!!s.active} busy={busy === `src-${s.key}`}
                onClick={() => act(`src-${s.key}`, () => api.put(`/admin/importer/sources/${s.key}`, { ...s, active: !s.active }), s.active ? "أُوقف المصدر" : "فُعّل المصدر")} />
              <button disabled={busy === `run-${s.key}`} data-testid={`imp-src-run-${s.key}`}
                onClick={() => act(`run-${s.key}`, () => api.post("/admin/importer/run-now", null, { params: { source_key: s.key } }), `اكتمل فحص «${s.label}»`)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-sky-500 px-3.5 text-xs font-black text-white shadow-md shadow-sky-500/40 transition hover:bg-sky-600 disabled:opacity-40">
                <Play className="h-3.5 w-3.5" /> فحص الآن
              </button>
              <button disabled={busy === `del-${s.key}`} data-testid={`imp-src-del-${s.key}`} aria-label={`حذف مصدر ${s.label}`}
                onClick={() => act(`del-${s.key}`, () => api.delete(`/admin/importer/sources/${s.key}`), "حُذف المصدر")}
                className="grid h-10 w-10 place-items-center rounded-2xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40">
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-4">
          <p className="mb-3 flex items-center gap-2 font-head text-xs font-black text-sky-900"><Sparkles className="h-4 w-4 text-sky-500" /> مصدر جديد</p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <input value={srcForm.label} onChange={(e) => setSrcForm({ ...srcForm, label: e.target.value })} data-testid="imp-src-label"
              placeholder="اسم المصدر · مثال: كلاسيكيات الأدب العربي" className={inp} />
            <input value={srcForm.query} onChange={(e) => setSrcForm({ ...srcForm, query: e.target.value })} data-testid="imp-src-query" dir="ltr"
              placeholder="collection:opensource أو كلمات بحث" className={inp} />
            <select value={srcForm.lang} onChange={(e) => setSrcForm({ ...srcForm, lang: e.target.value })} data-testid="imp-src-lang" className={inp} aria-label="لغة المصدر">
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={srcForm.category} onChange={(e) => setSrcForm({ ...srcForm, category: e.target.value })} data-testid="imp-src-cat" className={inp} aria-label="تصنيف المصدر">
              <option value="auto">تصنيف تلقائي من الموضوع</option>
              {cats.map((c) => <option key={c} value={c}>{CAT_NAMES[c] || c}</option>)}
            </select>
            <input type="number" min="1" max="50" value={srcForm.max_items} onChange={(e) => setSrcForm({ ...srcForm, max_items: Number(e.target.value) })} data-testid="imp-src-max"
              placeholder="أقصى كتب كل فحص" className={inp} aria-label="أقصى كتب كل فحص" />
            <button disabled={srcForm.label.trim().length < 2 || srcForm.query.trim().length < 2 || busy === "srcadd"} data-testid="imp-src-add"
              onClick={() => act("srcadd", () => api.post("/admin/importer/sources", srcForm).then(() => setSrcForm({ label: "", query: "", lang: "any", category: "auto", max_items: 5 })), "أُضيف المصدر")}
              className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-sky-500 to-blue-600 px-4 font-head text-sm font-black text-white shadow-[0_14px_28px_-10px_rgba(14,165,233,0.55)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-40">
              <Plus className="h-4 w-4" /> إضافة المصدر
            </button>
          </div>
          <p className="mt-2.5 text-[11px] font-bold leading-relaxed text-slate-400">أمثلة للمصادر: <span dir="ltr">collection:opensource</span> لأحدث الإضافات المفتوحة، أو كلمات مثل «ديوان» للشعر، أو <span dir="ltr">Shakespeare</span> للإنجليزية الكلاسيكية. الكتب ملكية عامة من Archive.org.</p>
        </div>
      </Panel>

      {/* manual search */}
      <Panel i={3} icon={Search} grad="from-violet-500 to-purple-600" shadow="shadow-violet-500/30"
        title="بحث واستيراد يدوي" sub="ابحث في Archive.org، علّم على الكتب، واستوردها دفعة واحدة بكل بياناتها وأغلفتها">
        <div className="flex flex-wrap gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-300" />
            <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="imp-q" placeholder="عنوان كتاب أو مؤلف · عربي أو English…"
              className={`${inp} ps-11`} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
          </div>
          <select value={qLang} onChange={(e) => setQLang(e.target.value)} data-testid="imp-qlang" className={`${inp} w-auto`} aria-label="لغة البحث">
            {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button disabled={busy === "search"} onClick={doSearch} data-testid="imp-search"
            className="inline-flex min-h-[46px] items-center gap-1.5 rounded-2xl bg-gradient-to-l from-violet-500 to-purple-600 px-5 font-head text-sm font-black text-white shadow-[0_14px_28px_-10px_rgba(139,92,246,0.55)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-40">
            {busy === "search" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} بحث
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
              {results.map((r) => (
                <label key={r.archive_id} className={`flex cursor-pointer items-start gap-3 rounded-3xl border p-3.5 transition ${picked[r.archive_id] && r.state === "new" ? "border-violet-300 bg-violet-50/70" : "border-slate-100 bg-white hover:border-violet-100"}`}>
                  <input type="checkbox" disabled={r.state !== "new"} checked={!!picked[r.archive_id]} data-testid={`imp-pick-${r.archive_id}`}
                    onChange={(e) => setPicked({ ...picked, [r.archive_id]: e.target.checked })}
                    className="mt-1.5 h-5 w-5 shrink-0 accent-violet-600 disabled:opacity-30" />
                  <img src={r.cover_url} alt={r.title} loading="lazy" className="h-16 w-11 shrink-0 rounded-md object-cover shadow ring-1 ring-slate-100" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-800">{r.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-400">{r.author || "مؤلف غير معروف"}{r.year ? ` · ${r.year}` : ""} · {r.language}</span>
                    {r.description && <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-slate-400">{r.description}</span>}
                  </span>
                  {stateChip(r.state)}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button disabled={!pickedIds.length || busy === "import"} onClick={doImportPicked} data-testid="imp-import"
                className="pressable inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-l from-violet-500 to-purple-600 px-6 font-head text-sm font-black text-white shadow-[0_14px_28px_-10px_rgba(139,92,246,0.55)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-40">
                {busy === "import" ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <CloudDownload className="h-4.5 w-4.5" />}
                {cfg.auto_publish ? `استيراد ونشر المحدد (${pickedIds.length})` : `إرسال المحدد للمراجعة (${pickedIds.length})`}
              </button>
              <span className="text-[11px] font-bold text-slate-400">الاستيراد يرفع الملف إلى Telegram وقد يأخذ ثوانٍ لكل كتاب كبير</span>
            </div>
          </>
        )}
      </Panel>

      {/* review queue */}
      <Panel i={4} icon={ListChecks} grad="from-amber-400 to-yellow-600" shadow="shadow-amber-500/30"
        title="قائمة المراجعة" sub="تظهر عندما يكون النشر المباشر متوقفاً · وافق لينشر الكتاب في المكتبة"
        extra={<span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-600 ring-1 ring-amber-100 sm:inline-flex"><ListChecks className="h-3.5 w-3.5" /> {queue.length} بانتظارك</span>}>
        {queue.length === 0 ? (
          <p className="text-sm font-bold text-slate-400">القائمة فارغة · كل شيء منشور أو لا توجد استيرادات معلّقة.</p>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {queue.map((j) => (
              <div key={j.id} className="flex items-start gap-3 rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50/70 to-white p-3.5">
                {j.cover_url ? <img src={j.cover_url} alt={j.title} className="h-16 w-11 shrink-0 rounded-md object-cover shadow ring-1 ring-amber-100" /> :
                  <span className="grid h-16 w-11 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-600"><BookOpen className="h-5 w-5" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{j.title}</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{j.author || "مؤلف غير معروف"} · {j.source_label || "استيراد يدوي"}</p>
                  <div className="mt-2.5 flex gap-2">
                    <button disabled={busy === `qa-${j.id}`} data-testid={`imp-approve-${j.id}`}
                      onClick={() => act(`qa-${j.id}`, () => api.post(`/admin/importer/jobs/${j.id}/approve`), "نُشر الكتاب في المكتبة")}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-500 px-3.5 text-xs font-black text-white shadow-md shadow-emerald-500/40 transition hover:bg-emerald-600 disabled:opacity-40">
                      <Check className="h-3.5 w-3.5" /> موافقة ونشر
                    </button>
                    <button disabled={busy === `qr-${j.id}`} data-testid={`imp-reject-${j.id}`}
                      onClick={() => act(`qr-${j.id}`, () => api.post(`/admin/importer/jobs/${j.id}/reject`), "رُفض الكتاب")}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-white px-3.5 text-xs font-black text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-50 disabled:opacity-40">
                      <X className="h-3.5 w-3.5" /> رفض
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* log */}
      <Panel i={5} icon={ShieldCheck} grad="from-slate-700 to-slate-900" shadow="shadow-slate-900/30"
        title="سجل الاستيراد" sub="آخر العمليات بنتائجها · الأخطاء ظاهرة لتعرف سبب أي فشل">
        {jobs.length === 0 ? (
          <p className="text-sm font-bold text-slate-400">لا عمليات بعد.</p>
        ) : (
          <div className="grid gap-2">
            {jobs.filter((j) => j.status !== "queued").slice(0, 25).map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                {stateChip(j.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800">{j.title}</p>
                  <p className="truncate text-[11px] font-bold text-slate-400">
                    {j.source_label || (j.via === "manual" ? "استيراد يدوي" : j.via === "schedule" ? "فحص مجدول" : "تشغيل يدوي")} · <span dir="ltr">{String(j.created_at || "").slice(0, 16).replace("T", " ")}</span>
                  </p>
                  {j.error && <p className="mt-1 flex items-start gap-1 text-[11px] font-bold leading-relaxed text-rose-500"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {j.error}</p>}
                </div>
                {j.book_id && (
                  <Link to={`/books/${j.book_id}`} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-teal-50 px-3.5 text-xs font-black text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100">
                    <BookOpen className="h-3.5 w-3.5" /> فتح الكتاب
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] font-bold text-slate-400">
        <Zap className="h-3.5 w-3.5" />
        المستورد يعمل بصلاحية تعديل الكتب · المصادر مفتوحة الترخيص فقط، والفحص المستمر يحتاج تفعيل المفتاح الرئيسي
      </p>
    </div>
  );
}
