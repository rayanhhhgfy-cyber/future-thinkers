import React, { useEffect, useRef, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import { THEME_PRESETS, applyTheme, applyDesign, resolveColors, FONT_OPTIONS, RADIUS_OPTIONS, DENSITY_OPTIONS, SHADOW_OPTIONS, DESIGN_DEFAULTS } from "@/lib/theme";
import { PythonEditor, PyErrorText } from "@/components/PythonCode";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Code2, FlaskConical, Terminal, Palette, Flag, Activity, Globe2, Route as RouteIcon, Plus, Bug, Copy, Mail, CheckCircle2, Trash2, Award, Search, Save, ShieldCheck, X } from "lucide-react";

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
            <button onClick={save} disabled={!!busy} className="pressable px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">{busy === "save" ? "جارٍ الحفظ…" : edit.id ? "حفظ التعديلات" : "نشر التحدي"}</button>
            <button onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function DesignToggle({ on, onChange, label, desc }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className="flex items-center gap-3 w-full text-right min-h-[44px] py-1.5">
      <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "right-6" : "right-1"}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        {desc && <span className="block text-[11px] text-slate-400 mt-0.5">{desc}</span>}
      </span>
    </button>
  );
}

const THEME_COLOR_ROWS = [
  ["a", "البداية الداكنة", "أول لون في تدرجات الواجهات والأقسام الداكنة"],
  ["b", "التدرج", "اللون الأوسط الذي يبني التدرج"],
  ["c", "الأعمق", "أغمق درجة · قاعدة التدرج"],
  ["accent", "لون الإبراز", "الأزرار واللمسات البارزة في الموقع"],
];

function ThemePanel() {
  const [preset, setPreset] = useState("emerald");
  const [colors, setColors] = useState({ a: "#052e26", b: "#065f46", c: "#043a2e", accent: "#10b981" });
  const [useCustom, setUseCustom] = useState(false);
  const [effects, setEffects] = useState({ grain: true, motion: true });
  const [design, setDesign] = useState({ ...DESIGN_DEFAULTS });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/theme").then((r) => {
      const d = r.data || {};
      const base = THEME_PRESETS.find((t) => t.key === d.preset) || THEME_PRESETS[0];
      setPreset(base.key);
      if (d.custom) {
        setColors({
          a: d.custom.a || base.a, b: d.custom.b || base.b,
          c: d.custom.c || base.c, accent: d.custom.accent || base.accent,
        });
        setUseCustom(true);
      } else {
        setColors({ a: base.a, b: base.b, c: base.c, accent: base.accent });
        setUseCustom(false);
      }
      if (d.effects) setEffects({ grain: d.effects.grain !== false, motion: d.effects.motion !== false });
      if (d.design) setDesign({ ...DESIGN_DEFAULTS, ...d.design });
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const eff = resolveColors({ preset, custom: useCustom ? colors : null });
  const selFont = FONT_OPTIONS.find((f) => f.key === design.font) || FONT_OPTIONS[0];
  const radiusCss = design.radius === "sharp" ? "6px" : design.radius === "round" ? "22px" : "12px";
  const setColor = (k, v) => setColors((c) => ({ ...c, [k]: v }));
  const pickPreset = (key) => { setPreset(key); setUseCustom(false); };

  const save = async () => {
    if (useCustom && ["a", "b", "c", "accent"].some((k) => !HEX_RE.test(colors[k] || ""))) {
      return toast.error("راجع صيغة الألوان · يجب أن تكون بصيغة #RRGGBB مثل #10b981");
    }
    setBusy(true);
    const cfg = { preset, custom: useCustom ? { ...colors } : null, effects, design };
    try {
      await api.put("/admin/theme", cfg);
      applyDesign(cfg);
      toast.success("طُبّق المظهر الجديد على الموقع كاملاً 🎨");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-1"><Palette className="w-5 h-5 text-violet-600" /> مظهر الموقع · مركز التحكم بالتصميم</h2>
      <p className="text-xs text-slate-400 mb-5">تحكم متقدم ببساطة: سمات جاهزة، ألوانك الخاصة، وتأثيرات · يصل التغيير كل الزوار فوراً وبأمان كامل.</p>

      {!loaded ? <PageLoader /> : (<>
        {/* ١ · السمات الجاهزة */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
          <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3">السمات الجاهزة</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {THEME_PRESETS.map((p) => (
              <button key={p.key} onClick={() => pickPreset(p.key)}
                className={`relative rounded-3xl overflow-hidden text-right transition-all ${preset === p.key ? "ring-4 ring-emerald-500 scale-[1.02]" : "hover:scale-[1.02]"}`}>
                <div className="h-28 sm:h-32 p-4 flex flex-col justify-between text-white" style={{ background: `linear-gradient(135deg, ${p.c} 0%, ${p.b} 50%, ${p.accent} 130%)` }}>
                  <span className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur grid place-items-center text-sm font-black">ف</span>
                  <span>
                    <span className="block font-head font-extrabold">{p.name}</span>
                    <span className="block text-[11px] text-white/70">لمسة: {p.accent}</span>
                  </span>
                </div>
                {preset === p.key && !useCustom && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white text-slate-900 text-[10px] font-black shadow">مفعّلة الآن ✓</span>}
                {preset === p.key && useCustom && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-black shadow">قاعدة الألوان</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ٢ · ألوان مخصصة */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
          <h3 className="font-head font-extrabold text-sm text-slate-700">ألوان مخصصة</h3>
          <DesignToggle on={useCustom} onChange={setUseCustom} label="استخدام ألواني" desc="تجاوز ألوان السمة الجاهزة بألوان تختارها بنفسك" />
          <div className={`space-y-4 mt-3 ${useCustom ? "" : "opacity-40 pointer-events-none"}`}>
            {THEME_COLOR_ROWS.map(([k, label, hint]) => (
              <div key={k}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-10 h-10 rounded-xl ring-1 ring-slate-200 shrink-0" style={{ background: HEX_RE.test(colors[k]) ? colors[k] : "#000000" }} />
                  <div className="flex-1 min-w-[130px]">
                    <div className="text-sm font-bold text-slate-700">{label}</div>
                    <div className="text-[11px] text-slate-400">{hint}</div>
                  </div>
                  <input type="color" value={HEX_RE.test(colors[k]) ? colors[k] : "#000000"} onChange={(e) => setColor(k, e.target.value)} aria-label={label}
                    className="w-14 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer p-1" />
                  <input dir="ltr" value={colors[k]} onChange={(e) => setColor(k, e.target.value)} placeholder="#10b981" aria-label={`${label} · كود اللون`}
                    className={`w-28 h-11 px-3 rounded-xl border text-left font-mono text-sm outline-none focus:ring-2 ${HEX_RE.test(colors[k]) ? "border-slate-200 focus:ring-emerald-200" : "border-rose-300 focus:ring-rose-200"}`} />
                </div>
                {!HEX_RE.test(colors[k]) && <p className="text-[11px] text-rose-500 ps-14 mt-1">صيغة غير صحيحة · مثال: #10b981</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ٣ · التأثيرات */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
          <h3 className="font-head font-extrabold text-sm text-slate-700">التأثيرات</h3>
          <DesignToggle on={effects.grain} onChange={(v) => setEffects((e) => ({ ...e, grain: v }))} label="حبيبات الخلفية" desc="ملمس خفيف فوق التدرجات يعطي عمقاً للأقسام الداكنة" />
          <DesignToggle on={effects.motion} onChange={(v) => setEffects((e) => ({ ...e, motion: v }))} label="الحركات والانتقالات" desc="حركات الظهور والطفو والانتقالات في كل الموقع" />
        </div>

        {/* ٤ · تصميم العناصر */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
          <h3 className="font-head font-extrabold text-sm text-slate-700">تصميم العناصر</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">الخطوط وشكل الزوايا وكثافة العرض وعمق الظلال · تنطبق على كل عناصر الموقع فوراً</p>

          <div className="text-xs font-bold text-slate-500 mb-2">خط الموقع</div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {FONT_OPTIONS.map((f) => (
              <button key={f.key} onClick={() => setDesign((d) => ({ ...d, font: f.key }))}
                className={`rounded-2xl border p-3.5 text-right transition-all min-h-[64px] ${design.font === f.key ? "border-slate-900 ring-2 ring-slate-900/15 bg-slate-50" : "border-slate-200 hover:border-slate-400 bg-white"}`}>
                <span className="block font-extrabold text-slate-800" style={{ fontFamily: f.head }}>{f.name}</span>
                <span className="block text-sm text-slate-600 mt-1" style={{ fontFamily: f.body }}>مفكرو المستقبل · أهلاً بكم ١٢٣</span>
                <span className="block text-[10px] text-slate-400 mt-1">{f.desc}</span>
              </button>
            ))}
          </div>

          <div className="text-xs font-bold text-slate-500 mb-2">شكل الزوايا</div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {RADIUS_OPTIONS.map((r) => (
              <button key={r.key} onClick={() => setDesign((d) => ({ ...d, radius: r.key }))}
                className={`rounded-2xl border p-3.5 text-right transition-all min-h-[64px] ${design.radius === r.key ? "border-slate-900 ring-2 ring-slate-900/15 bg-slate-50" : "border-slate-200 hover:border-slate-400 bg-white"}`}>
                <span className="block w-10 h-8 bg-gradient-to-br from-slate-700 to-slate-900 mb-2" style={{ borderRadius: r.key === "sharp" ? "4px" : r.key === "round" ? "16px" : "10px" }} />
                <span className="block font-extrabold text-slate-800 text-sm">{r.name}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{r.desc}</span>
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">كثافة العرض</div>
              <div className="flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/70">
                {DENSITY_OPTIONS.map((o) => (
                  <button key={o.key} onClick={() => setDesign((d) => ({ ...d, density: o.key }))} title={o.desc}
                    className={`flex-1 rounded-xl px-2 min-h-[44px] text-xs font-extrabold transition-all ${design.density === o.key ? "bg-white text-slate-900 shadow ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
                    {o.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{DENSITY_OPTIONS.find((o) => o.key === design.density)?.desc}</p>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">عمق الظلال</div>
              <div className="flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/70">
                {SHADOW_OPTIONS.map((o) => (
                  <button key={o.key} onClick={() => setDesign((d) => ({ ...d, shadow: o.key }))} title={o.desc}
                    className={`flex-1 rounded-xl px-2 min-h-[44px] text-xs font-extrabold transition-all ${design.shadow === o.key ? "bg-white text-slate-900 shadow ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
                    {o.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{SHADOW_OPTIONS.find((o) => o.key === design.shadow)?.desc}</p>
            </div>
          </div>
        </div>

        {/* ٥ · معاينة حية وحفظ */}
        <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3">معاينة حية · هكذا سيبدو الموقع</h3>
        <div className={`relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 ft-shadow-lg mb-4 ${effects.grain ? "grain" : ""}`}
          style={{ background: `linear-gradient(135deg, ${eff.c} 0%, ${eff.b} 55%, ${eff.a} 130%)`, fontFamily: selFont.body }}>
          <div className="relative">
            <span className="inline-flex px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-bold">نادي مفكري المستقبل</span>
            <div className="font-black text-xl sm:text-2xl mt-3" style={{ fontFamily: selFont.head }}>صمم مستقبلك بنفسك</div>
            <p className="text-white/75 text-xs mt-1">منصة الطلاب المبدعين · قراءة وبرمجة وشطرنج ومشاريع</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <span className="px-4 py-2 text-xs font-black text-white shadow-lg" style={{ background: eff.accent, borderRadius: radiusCss }}>ابدأ الآن</span>
              <span className="px-4 py-2 text-xs font-bold bg-white/15 backdrop-blur" style={{ borderRadius: radiusCss }}>تصفح الأقسام</span>
            </div>
          </div>
        </div>

        <button onClick={save} disabled={busy}
          className="pressable w-full min-h-[52px] rounded-2xl text-white font-head font-extrabold text-base disabled:opacity-50 shadow-xl mb-5"
          style={{ background: `linear-gradient(120deg, ${eff.b}, ${eff.accent})` }}>
          {busy ? "جارٍ التطبيق…" : "حفظ المظهر وتطبيقه"}
        </button>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed mb-3">
          🔒 آمن بتصميمه: لا توجد أي خانة CSS حرة · الخادم يقبل فقط أسماء سمات من قائمة مغلقة، وألواناً بصيغة #RRGGBB مفحوصة، ومفاتيح تأثيرات منطقية · أي قيمة غريبة تُرفض تلقائياً.
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed">
          💡 تشمل السمة: تدرجات الواجهات الرئيسية (الصفحة الافتتاحية، اللوحات، النوادي) وعناصر الإبراز. أغطية الملفات الشخصية تبقى اختياراً فردياً لكل طالب من إعداداته.
        </div>
      </>)}
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
  const [sigMode, setSigMode] = useState(null);
  const [sigBusy, setSigBusy] = useState(false);
  useEffect(() => { api.get("/admin/signing").then((r) => setSigMode(r.data?.mode || "warn")).catch(() => setSigMode(null)); }, []);
  const changeSigMode = async (m) => {
    setSigBusy(true);
    try { const { data } = await api.put("/admin/signing", { mode: m }); setSigMode(data.mode); toast.success("تم تحديث وضع توقيع الـ API"); }
    catch (e) { toast.error(apiErr(e)); }
    setSigBusy(false);
  };
  if (!h) return <PageLoader />;
  const colAr = { users: "المستخدمون", books: "الكتب", works: "الأعمال", ventures: "المشاريع", chess_games: "مباريات الشطرنج", notifications: "الإشعارات", push_subscriptions: "أجهزة الدفع", certificates: "الشهادات", xp_transactions: "حركات النقاط", reports: "البلاغات" };
  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-5"><Activity className="w-5 h-5 text-emerald-600" /> صحة النظام <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">آخر فحص: {String(h.checked_at || "").slice(11, 16)}</span></h2>
      {sigMode !== null && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 ft-shadow mb-6">
          <div className="flex items-center gap-2 font-head font-extrabold text-slate-800"><ShieldCheck className="w-5 h-5 text-emerald-600" /> توقيع طلبات الـ API · حماية ضد الأتمتة</div>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">كل طلب للموقع يُوقَّع تشفيرياً (HMAC-SHA256) مع منع إعادة التشغيل. «تحذير» يراقب دون رفض · فعّل «فرض» فقط بعد التأكد أن الموقع يعمل طبيعياً لأيام.</p>
          <div className="flex gap-2 mt-4 flex-wrap">
            {[["off", "إيقاف"], ["warn", "تحذير · مراقبة"], ["enforce", "فرض · حماية كاملة"]].map(([m, label]) => (
              <button key={m} disabled={sigBusy || sigMode === m} onClick={() => changeSigMode(m)}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-bold transition disabled:opacity-100 ${sigMode === m ? (m === "enforce" ? "bg-rose-600 text-white" : m === "warn" ? "bg-amber-500 text-white" : "bg-slate-700 text-white") : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"}`}>
                {label}
              </button>
            ))}
            <span className="text-[11px] font-bold text-slate-400 self-center">الوضع الحالي: {sigMode === "enforce" ? "فرض" : sigMode === "warn" ? "تحذير" : "إيقاف"}</span>
          </div>
        </div>
      )}
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

/* ---------------- الشهادات · منح + قالب + سجل ---------------- */
function CertificatesPanelV2() {
  const [tpl, setTpl] = useState(null);
  const [awarded, setAwarded] = useState(null);
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [mode, setMode] = useState("single"); // single | bulk
  const [selUsers, setSelUsers] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);
  const [aTitle, setATitle] = useState("");
  const [aSub, setASub] = useState("");
  const [aMeta, setAMeta] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const searchTimer = useRef(null);
  const delTimer = useRef(null);

  const loadAwarded = () => api.get("/certificates/admin/awarded").then((r) => setAwarded(r.data)).catch(() => setAwarded([]));
  useEffect(() => {
    api.get("/certificates/admin/template").then((r) => setTpl(r.data)).catch(() => setTpl({}));
    loadAwarded();
  }, []);

  const onSearch = (v) => {
    setQ(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(() => {
      api.get("/admin/users", { params: { q: v.trim() } })
        .then((r) => setResults(r.data.items || []))
        .catch(() => setResults([]));
    }, 300);
  };

  const award = async () => {
    if (!selUser) return toast.error("اختر الطالب أولاً من نتائج البحث");
    if (!aTitle.trim()) return toast.error("اكتب سطر عنوان الشهادة");
    setBusy("award");
    try {
      await api.post("/certificates/admin/award", {
        user_id: selUser.id,
        title_line: aTitle.trim(),
        subtitle: aSub.trim(),
        meta_lines: aMeta.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6),
      });
      toast.success(`مُنحت الشهادة لـ ${selUser.name} 🏅`);
      setSelUser(null); setQ(""); setResults([]); setATitle(""); setASub(""); setAMeta("");
      loadAwarded();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  const switchMode = (m) => { setMode(m); setResults([]); setQ(""); setBulkResult(null); };

  const pickUser = (u) => {
    if (mode === "bulk") {
      if (!selUsers.some((x) => x.id === u.id)) {
        if (selUsers.length >= 50) return toast.error("الحد الأقصى ٥٠ طالباً في المنح الجماعي الواحد");
        setSelUsers((prev) => [...prev, u]);
      }
      setQ(""); setResults([]);
    } else {
      setSelUser(u); setResults([]);
    }
  };

  const removeSelUser = (id) => setSelUsers((prev) => prev.filter((x) => x.id !== id));

  const awardBulk = async () => {
    if (selUsers.length === 0) return toast.error("أضف طالباً واحداً على الأقل من نتائج البحث");
    if (!aTitle.trim()) return toast.error("اكتب سطر عنوان الشهادة");
    setBusy("award");
    try {
      const { data } = await api.post("/certificates/admin/award-bulk", {
        user_ids: selUsers.map((u) => u.id),
        title_line: aTitle.trim(),
        subtitle: aSub.trim(),
      });
      setBulkResult(data);
      toast.success(`مُنحت ${data.awarded} شهادة جماعياً 🏅`);
      setSelUsers([]); setQ(""); setResults([]); setATitle(""); setASub(""); setAMeta("");
      loadAwarded();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  const saveTpl = async () => {
    if (!tpl) return;
    setBusy("tpl");
    try {
      const { data } = await api.put("/certificates/admin/template", tpl);
      setTpl(data);
      toast.success("حُفظ قالب الشهادة ✓ ستُطبع الشهادات الجديدة بهذا التصميم");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  const del = async (c) => {
    if (confirmDel !== c.id) {
      setConfirmDel(c.id);
      if (delTimer.current) clearTimeout(delTimer.current);
      delTimer.current = setTimeout(() => setConfirmDel(null), 3000);
      return;
    }
    if (delTimer.current) clearTimeout(delTimer.current);
    setConfirmDel(null);
    try {
      await api.delete(`/certificates/admin/awarded/${c.id}`);
      toast.success("حُذفت الشهادة");
      loadAwarded();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const setT = (k, v) => setTpl((t) => ({ ...(t || {}), [k]: v }));
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white transition min-h-[44px]";
  const HEX6 = /^#[0-9a-fA-F]{6}$/;
  const pc = tpl?.color_primary || "#059669";
  const dc = tpl?.color_dark || "#0A192F";
  const mc = tpl?.color_muted || "#64748B";
  const gc = tpl?.color_gold || "#C6A15B";
  const bgc = tpl?.bg_color || "#F6FBF9";
  const INK = "#1E293B";
  const previewName = mode === "bulk"
    ? (selUsers.length ? `${selUsers[0].name}${selUsers.length > 1 ? ` و${selUsers.length - 1} آخرون` : ""}` : "أسماء الطلاب")
    : (selUser?.name || "اسم الطالب");
  const previewMeta = aMeta.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const colorRows = [
    ["color_primary", "اللون الأساسي", "العناوين والأختام والإطارات"],
    ["color_dark", "اللون الداكن", "شريط الترويسة والنصوص القوية"],
    ["color_muted", "اللون الهادئ", "النصوص الفرعية والتواريخ"],
    ["color_gold", "اللون الذهبي", "الزخارف والختم وخطوط الاسم"],
    ["bg_color", "لون الخلفية", "خلفية ورقة الشهادة"],
  ];

  return (
    <div>
      <h2 className="font-head font-extrabold text-lg flex items-center gap-2 mb-1">
        <Award className="w-5 h-5 text-amber-500" /> الشهادات · المنح والقالب والسجل
      </h2>
      <p className="text-xs text-slate-400 mb-5">امنح شهادات للطلاب، صمّم قالب الشهادة الرسمي بألوانك، وراجع كل الشهادات الممنوحة · لكل شهادة رمز تحقق فريد يظهر عليها.</p>

      {/* منح شهادة */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
        <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3">منح شهادة جديدة</h3>
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button onClick={() => switchMode("single")} className={`pressable rounded-xl px-4 py-2 text-xs font-extrabold min-h-[40px] transition ${mode === "single" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}>فردي</button>
            <button onClick={() => switchMode("bulk")} className={`pressable rounded-xl px-4 py-2 text-xs font-extrabold min-h-[40px] transition ${mode === "bulk" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}>
              جماعي{selUsers.length > 0 ? ` · ${selUsers.length}` : ""}
            </button>
          </div>
          {mode === "bulk" && <span className="text-[11px] text-slate-400">ابحث وأضف حتى ٥٠ طالباً · تُمنح الشهادة نفسها للجميع دفعة واحدة</span>}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 block mb-1.5">{mode === "bulk" ? "الطلاب المستلمون" : "الطالب"}</label>
            {mode === "single" && selUser ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 min-h-[48px]">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center font-black shrink-0">{(selUser.name || "؟").charAt(0)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-800 truncate">{selUser.name}</span>
                  <span className="block text-[11px] text-slate-400 truncate" dir="ltr">{selUser.email}</span>
                </span>
                <button onClick={() => { setSelUser(null); setQ(""); }} className="pressable w-9 h-9 grid place-items-center rounded-full hover:bg-amber-100 text-slate-500 shrink-0" aria-label="إلغاء اختيار الطالب">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {mode === "bulk" && selUsers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {selUsers.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-1 pr-1 pl-1.5 text-xs font-bold text-slate-700 max-w-full">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center text-[10px] font-black shrink-0">{(u.name || "؟").charAt(0)}</span>
                        <span className="truncate max-w-[140px]">{u.name}</span>
                        <button onClick={() => removeSelUser(u.id)} aria-label={`إزالة ${u.name}`} className="pressable w-6 h-6 grid place-items-center rounded-full hover:bg-amber-100 text-slate-500 shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button onClick={() => setSelUsers([])} className="pressable text-[11px] font-bold text-rose-500 hover:text-rose-600 px-1.5 py-1">مسح الكل</button>
                  </div>
                )}
                <div className="relative">
                  <Search className="w-4.5 h-4.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..."
                    className={`${inputCls} pr-10`} />
                </div>
                {results.length > 0 && (
                  <div className="absolute z-20 right-0 left-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-100 ft-shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                    {results.map((u) => {
                      const picked = mode === "bulk" && selUsers.some((x) => x.id === u.id);
                      return (
                        <button key={u.id} onClick={() => pickUser(u)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-amber-50/60 text-right transition-colors min-h-[52px]">
                          <span className="w-9 h-9 rounded-full ft-bg-soft-2 ft-text-accent grid place-items-center font-black shrink-0">{(u.name || "؟").charAt(0)}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-sm text-slate-800 truncate">{u.name}</span>
                            <span className="block text-[11px] text-slate-400 truncate" dir="ltr">{u.email}</span>
                          </span>
                          {picked
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> مُضاف</span>
                            : (u.school_name && <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden sm:block">{u.school_name}</span>)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {q.trim().length >= 2 && results.length === 0 && <p className="text-[11px] text-slate-400 mt-1.5">اكتب حرفين على الأقل وانتظر نتائج البحث</p>}
                {mode === "bulk" && <p className="text-[11px] text-slate-400 mt-1.5">المحددون: {selUsers.length} من ٥٠ كحد أقصى · اختر طالباً من النتائج لإضافته</p>}
              </>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">سطر عنوان الشهادة</label>
            <input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="مثال: لتميّزه في مسابقة القراءة السنوية" className={inputCls} maxLength={200} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">سطر فرعي (اختياري)</label>
            <input value={aSub} onChange={(e) => setASub(e.target.value)} placeholder="مثال: المركز الأول على مستوى قصبة إربد الأولى" className={inputCls} maxLength={200} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">أسطر إضافية (اختياري · سطر في كل خانة نصية)</label>
            <textarea value={aMeta} onChange={(e) => setAMeta(e.target.value)} rows={2} placeholder={"بتاريخ ٢ أكتوبر ٢٠٢٦\nشكراً لمساهمتك في مجتمع مفكري المستقبل"}
              className={`${inputCls} resize-y`} />
          </div>
        </div>
        <button onClick={mode === "bulk" ? awardBulk : award} disabled={busy === "award"}
          className="pressable mt-4 inline-flex items-center gap-2 rounded-2xl ft-btn-primary px-6 py-3 text-sm font-extrabold min-h-[48px] disabled:opacity-50">
          <Award className="w-4.5 h-4.5" /> {busy === "award" ? "جارٍ المنح..." : mode === "bulk" ? `منح جماعي${selUsers.length ? ` · ${selUsers.length} طالب` : ""}` : "منح الشهادة"}
        </button>
        {bulkResult && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-emerald-900 min-w-0">
              <span className="font-extrabold">مُنحت {bulkResult.awarded} شهادة بنجاح 🏅</span>
              {bulkResult.skipped?.length > 0 && (
                <span className="block text-xs mt-1 text-emerald-700">تعذّر منح {bulkResult.skipped.length} شهادة · مستخدم غير موجود: <span dir="ltr" className="font-mono break-all">{bulkResult.skipped.join(", ")}</span></span>
              )}
            </div>
            <button onClick={() => setBulkResult(null)} aria-label="إغلاق نتيجة المنح الجماعي" className="pressable w-8 h-8 grid place-items-center rounded-full hover:bg-emerald-100 text-emerald-700 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* القالب + المعاينة */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4 items-start">
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
          <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3">قالب الشهادة الرسمي</h3>
          {!tpl ? <PageLoader /> : (
            <>
              <div className="space-y-3">
                {[
                  ["org_name", "اسم الجهة", "منصة مفكري المستقبل"],
                  ["country_line", "سطر الدولة", "المملكة الأردنية الهاشمية"],
                  ["main_title", "العنوان الرئيسي", "شهادة تقدير"],
                  ["award_label", "سطر المنح", "تُمنح هذه الشهادة إلى"],
                  ["footer_right", "تذييل الشهادة", "منصة مفكري المستقبل"],
                ].map(([k, label, ph]) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{label}</label>
                    <input value={tpl[k] || ""} onChange={(e) => setT(k, e.target.value)} placeholder={ph} className={inputCls} maxLength={120} />
                  </div>
                ))}
                {colorRows.map(([k, label, hint]) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{label} <span className="text-slate-300 font-semibold">· {hint}</span></label>
                    <div className="flex items-center gap-2.5">
                      <input type="color" value={HEX6.test(tpl[k] || "") ? tpl[k] : "#000000"} onChange={(e) => setT(k, e.target.value)} aria-label={label}
                        className="w-14 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer p-1 shrink-0" />
                      <input dir="ltr" value={tpl[k] || ""} onChange={(e) => setT(k, e.target.value)} placeholder="#059669" aria-label={`${label} · كود اللون`}
                        className={`${inputCls} font-mono text-left ${HEX6.test(tpl[k] || "") || !(tpl[k] || "") ? "" : "border-rose-300"}`} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={saveTpl} disabled={busy === "tpl"}
                className="pressable mt-4 inline-flex items-center gap-2 rounded-2xl ft-btn-primary px-6 py-3 text-sm font-extrabold min-h-[48px] disabled:opacity-50 w-full sm:w-auto justify-center">
                <Save className="w-4.5 h-4.5" /> {busy === "tpl" ? "جارٍ الحفظ..." : "حفظ القالب"}
              </button>
            </>
          )}
        </div>

        {/* معاينة حية تحاكي الـ PDF */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 lg:sticky lg:top-4">
          <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3 flex items-center gap-2">
            معاينة حية <span className="text-[10px] font-bold text-slate-400">· هكذا ستُطبع الشهادة</span>
          </h3>
          <div className="rounded-[20px] shadow-xl p-[5px]" style={{ background: pc }}>
            <div className="rounded-[15px] p-[2px]" style={{ background: `linear-gradient(135deg, ${gc}, ${pc} 55%, ${gc})` }}>
              <div className="relative overflow-hidden rounded-[13px] flex flex-col" style={{ background: bgc, aspectRatio: "1.414 / 1" }}>
                <div className="pointer-events-none absolute inset-[7px] rounded-[9px] border z-[5]" style={{ borderColor: `${dc}38` }} />
                {/* شريط الترويسة الداكن */}
                <div className="relative text-center px-3 pt-2 pb-1.5 shrink-0" style={{ background: dc, borderBottom: `3px solid ${gc}` }}>
                  <span className="absolute bottom-[3px] right-2.5 w-1 h-1 rotate-45" style={{ background: gc }} aria-hidden="true" />
                  <span className="absolute bottom-[3px] left-2.5 w-1 h-1 rotate-45" style={{ background: gc }} aria-hidden="true" />
                  <div className="font-head font-extrabold text-white text-[11px] sm:text-sm leading-tight truncate px-3">{tpl?.org_name || "منصة مفكري المستقبل"}</div>
                  <div className="text-[8px] sm:text-[9px] mt-0.5" style={{ color: gc }}>{tpl?.country_line || "المملكة الأردنية الهاشمية"}</div>
                </div>
                {/* جسم الشهادة */}
                <div className="relative flex-1 flex flex-col items-center justify-center text-center px-3 sm:px-5 py-1 min-h-0">
                  <svg viewBox="0 0 24 24" className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6 opacity-[0.13] pointer-events-none" fill={gc} aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                  <svg viewBox="0 0 24 24" className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6 opacity-[0.13] pointer-events-none" fill={gc} aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-px w-6 sm:w-10" style={{ background: gc }} aria-hidden="true" />
                    <span className="w-1 h-1 rotate-45 shrink-0" style={{ background: gc }} aria-hidden="true" />
                    <span className="w-[5px] h-[5px] rotate-45 shrink-0" style={{ background: pc }} aria-hidden="true" />
                    <span className="font-head font-black text-base sm:text-[22px] leading-none px-0.5" style={{ color: pc }}>{tpl?.main_title || "شهادة تقدير"}</span>
                    <span className="w-[5px] h-[5px] rotate-45 shrink-0" style={{ background: pc }} aria-hidden="true" />
                    <span className="w-1 h-1 rotate-45 shrink-0" style={{ background: gc }} aria-hidden="true" />
                    <span className="h-px w-6 sm:w-10" style={{ background: gc }} aria-hidden="true" />
                  </div>
                  <div className="text-[8px] sm:text-[10px] mt-1" style={{ color: mc }}>{tpl?.award_label || "تُمنح هذه الشهادة إلى"}</div>
                  <div className="font-head font-black text-sm sm:text-xl mt-0.5 leading-snug max-w-full truncate" style={{ color: INK }}>{previewName}</div>
                  <div className="relative mx-auto mt-1 w-24 sm:w-36 shrink-0" aria-hidden="true">
                    <div className="h-[2px] rounded-full" style={{ background: gc }} />
                    <div className="h-px mt-[3px] mx-3 rounded-full" style={{ background: gc }} />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-[3px] w-[7px] h-[7px] rotate-45" style={{ background: gc }} />
                  </div>
                  <div className="text-[9px] sm:text-[11px] font-bold mt-1.5 leading-relaxed" style={{ color: "#334155" }}>{aTitle.trim() || "سطر عنوان الشهادة يظهر هنا"}</div>
                  {aSub.trim() && <div className="text-[8px] sm:text-[10px] font-bold mt-0.5" style={{ color: pc }}>{aSub.trim()}</div>}
                  {previewMeta.map((l, i) => (
                    <div key={i} className="text-[7px] sm:text-[8px] mt-0.5 leading-snug" style={{ color: mc }}>{l}</div>
                  ))}
                </div>
                {/* المنطقة السفلية: توقيع · ختم · معلومات */}
                <div className="relative px-3 sm:px-4 pb-3 shrink-0">
                  <div className="flex items-center gap-1.5 mb-1.5" aria-hidden="true">
                    <span className="w-1 h-1 rotate-45 shrink-0" style={{ background: pc }} />
                    <span className="h-px flex-1" style={{ background: gc }} />
                    <span className="w-[5px] h-[5px] rotate-45 shrink-0" style={{ background: gc }} />
                    <span className="h-px flex-1" style={{ background: gc }} />
                    <span className="w-1 h-1 rotate-45 shrink-0" style={{ background: pc }} />
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:gap-3">
                    <div className="text-right flex-1 min-w-0">
                      <div className="text-[8px] sm:text-[10px] font-extrabold truncate" style={{ color: INK }}>{tpl?.org_name || "منصة مفكري المستقبل"}</div>
                      <div className="h-px w-16 sm:w-24 mt-1" style={{ background: mc }} />
                      <div className="text-[7px] sm:text-[8px] mt-0.5" style={{ color: mc }}>إدارة المنصة</div>
                      <div className="text-[7px] sm:text-[8px] mt-0.5 truncate" style={{ color: mc }}>{tpl?.footer_right || "منصة مفكري المستقبل"}</div>
                    </div>
                    <div className="relative shrink-0">
                      <span className="absolute -bottom-1.5 right-[10px] w-2 h-4 rounded-b-sm rotate-[14deg]" style={{ background: pc }} aria-hidden="true" />
                      <span className="absolute -bottom-1.5 left-[10px] w-2 h-4 rounded-b-sm -rotate-[14deg]" style={{ background: pc }} aria-hidden="true" />
                      <span className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full grid place-items-center" style={{ background: bgc, border: `2px solid ${gc}`, boxShadow: `inset 0 0 0 2px ${bgc}, inset 0 0 0 3px ${pc}` }}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill={gc} aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 rounded-md px-2 py-1.5 space-y-1" style={{ background: "rgba(255,255,255,0.65)", border: `1px solid ${gc}` }}>
                      <div>
                        <div className="text-[6.5px] sm:text-[7.5px] leading-none" style={{ color: mc }}>رمز التحقق</div>
                        <div className="text-[8px] sm:text-[9.5px] font-bold leading-tight font-mono" style={{ color: INK }} dir="ltr">A1B2C3</div>
                      </div>
                      <div>
                        <div className="text-[6.5px] sm:text-[7.5px] leading-none" style={{ color: mc }}>تاريخ الإصدار</div>
                        <div className="text-[8px] sm:text-[9.5px] font-bold leading-tight" style={{ color: INK }} dir="ltr">{new Date().toISOString().slice(0, 10)}</div>
                      </div>
                      <div>
                        <div className="text-[6.5px] sm:text-[7.5px] leading-none" style={{ color: mc }}>الجهة المانحة</div>
                        <div className="text-[8px] sm:text-[9.5px] font-bold leading-tight truncate" style={{ color: INK }}>{tpl?.org_name || "منصة مفكري المستقبل"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* معيّنات الزوايا */}
                <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] rotate-45 z-20" style={{ background: gc, boxShadow: `inset 0 0 0 2px ${dc}` }} aria-hidden="true" />
                <span className="absolute top-[5px] left-[5px] w-[7px] h-[7px] rotate-45 z-20" style={{ background: gc, boxShadow: `inset 0 0 0 2px ${dc}` }} aria-hidden="true" />
                <span className="absolute bottom-[5px] right-[5px] w-[7px] h-[7px] rotate-45 z-20" style={{ background: gc, boxShadow: `inset 0 0 0 2px ${bgc}` }} aria-hidden="true" />
                <span className="absolute bottom-[5px] left-[5px] w-[7px] h-[7px] rotate-45 z-20" style={{ background: gc, boxShadow: `inset 0 0 0 2px ${bgc}` }} aria-hidden="true" />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">المعاينة تقريبية لأغراض التصميم · ملف الـ PDF النهائي يُرسم بنفس الألوان والنصوص عند تحميل الطالب لشهادته.</p>
        </div>
      </div>

      {/* سجل الشهادات الممنوحة */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
        <h3 className="font-head font-extrabold text-sm text-slate-700 mb-3">الشهادات الممنوحة ({awarded?.length || 0})</h3>
        {!awarded ? <PageLoader /> : awarded.length === 0 ? <Empty t="لا شهادات ممنوحة بعد · امنح أول شهادة من الأعلى 🏅" /> : (
          <div className="space-y-2.5">
            {awarded.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-l from-amber-50/70 to-white px-3.5 py-3 flex-wrap">
                <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center shrink-0 shadow">
                  <Award className="w-5.5 h-5.5" />
                </span>
                <div className="flex-1 min-w-[170px]">
                  <div className="font-bold text-sm text-slate-800">{c.user_name}</div>
                  <div className="text-xs text-slate-500 truncate">{c.title_line}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">{String(c.created_at || "").slice(0, 10)}</span>
                    {c.code && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <ShieldCheck className="w-3 h-3" /><span dir="ltr" className="font-mono">{c.code}</span>
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => del(c)}
                  className={`pressable inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-extrabold min-h-[44px] transition-colors ${confirmDel === c.id ? "bg-rose-600 text-white shadow" : "bg-rose-50 text-rose-600 hover:bg-rose-100"}`}>
                  <Trash2 className="w-4 h-4" /> {confirmDel === c.id ? "متأكد؟ اضغط للحذف" : "حذف"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { CodingAdminPanel, ThemePanel, ReportsPanel, HealthPanel, LandingPanel, PathsAdminPanel, AnalyticsV2, ErrorsPanel, CertificatesPanelV2 };
