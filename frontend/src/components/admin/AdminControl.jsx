import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  SlidersHorizontal, Power, Construction, Gamepad2, BookOpenText, Keyboard,
  Trophy, Target, Plus, Trash2, Save, RefreshCw, Crown, Archive, Sparkles,
  Calculator, Type, Swords, BookOpen, Gift, Users, Rocket, Layers, Radio,
  ArrowLeftRight, ShieldCheck, CalendarRange, ListChecks,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageLoader } from "@/components/Layout";

/* غرفة التحكم · كل المقابض الحية في مكان واحد: مفاتيح الأقسام، وضع الصيانة،
   مدير الموسم، جوائز الألعاب XP، بنك الكلمات ونصوص الكتابة، ومحرّك المهمات.
   التغييرات تسري فوراً على الموقع بلا نشر جديد. */

const SECTIONS = [
  ["games", "ساحة الألعاب", "الألعاب والتحديات والمهمات", Gamepad2, "from-violet-500 to-fuchsia-600", "shadow-violet-500/30"],
  ["stories", "قصص اختر مغامرتك", "مكتبة القصص والقارئ", BookOpenText, "from-sky-500 to-blue-600", "shadow-sky-500/30"],
  ["swap", "تبادل الكتب", "مبادلة الكتب بين الطلاب", ArrowLeftRight, "from-teal-500 to-emerald-600", "shadow-teal-500/30"],
  ["community", "ساحة المجتمع", "المجتمع والمناقشات", Users, "from-rose-500 to-pink-600", "shadow-rose-500/30"],
  ["ventures", "المشاريع الطلابية", "رواد المستقبل والمشاريع", Rocket, "from-amber-500 to-orange-600", "shadow-amber-500/30"],
  ["clubs", "الأندية الأدبية", "أندية الكتب والاجتماعات", BookOpen, "from-indigo-500 to-violet-600", "shadow-indigo-500/30"],
  ["mini_books", "كتيّبات الطلاب", "الكتيّبات القصيرة", Layers, "from-cyan-500 to-sky-600", "shadow-cyan-500/30"],
  ["live_sessions", "الجلسات المباشرة", "جلسات البث المباشر", Radio, "from-red-500 to-rose-600", "shadow-red-500/30"],
];

const XP_FIELDS = [
  ["math_full_cap", "سقف XP اليومي · الحساب", "أعلى نقاط خبرة من سباق الحساب باليوم", Calculator, "from-blue-500 to-indigo-600"],
  ["typing_full_cap", "سقف XP اليومي · الكتابة", "أعلى نقاط خبرة من سباق الكتابة باليوم", Keyboard, "from-cyan-500 to-sky-600"],
  ["wordle_lose_xp", "XP الخسارة · كلمة اليوم", "ما يأخذه من لم يخمن الكلمة", Type, "from-violet-500 to-purple-600"],
  ["challenge_win_xp", "XP الفوز · تحدي صديق", "جائزة الفائز", Trophy, "from-amber-500 to-orange-600"],
  ["challenge_draw_xp", "XP التعادل · تحدي صديق", "لكل طرف عند التعادل", Swords, "from-rose-500 to-red-600"],
  ["challenge_lose_xp", "XP الخسارة · تحدي صديق", "جائزة المشاركة", Users, "from-pink-500 to-rose-600"],
  ["story_finish_xp", "XP إنهاء قصة", "عند بلوغ أي نهاية", BookOpen, "from-teal-500 to-emerald-600"],
  ["mission_xp", "XP المهمة الواحدة", "للمهمات الافتراضية السبع", Target, "from-emerald-500 to-green-600"],
  ["chest_xp", "XP صندوق الكنز", "عند إكمال كل مهمات الأسبوع", Gift, "from-orange-500 to-amber-600"],
];

const METRIC_LABELS = {
  wordle_wins: "انتصارات كلمة اليوم", math_points: "نقاط سباق الحساب", typing_wpm: "أفضل كلمة/دقيقة",
  pages: "صفحات مقروءة", play_days: "أيام لعب", xp_earned: "خبرة مكتسبة", books: "كتب منجزة",
};

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" },
});

function Panel({ icon: Icon, grad, shadow, title, sub, children, extra, i = 0 }) {
  return (
    <motion.section {...fadeUp(i)} className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-[0_18px_44px_-20px_rgba(15,23,42,0.18)] sm:p-6">
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${grad}`} />
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-lg ${shadow}`}>
          <Icon className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-head text-[17px] font-black leading-tight text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-400">{sub}</p>
        </div>
        {extra}
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function Switch({ on, onClick, busy, testid }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} data-testid={testid} aria-pressed={on}
      className={`relative h-9 w-16 shrink-0 rounded-full transition-all duration-300 disabled:opacity-50 ${on ? "bg-gradient-to-l from-emerald-400 to-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.45)]" : "bg-slate-200 shadow-inner"}`}>
      <span className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-white shadow-md transition-all duration-300 ${on ? "end-1" : "start-1"}`}>
        <Power className={`h-3.5 w-3.5 ${on ? "text-emerald-500" : "text-slate-300"}`} />
      </span>
    </button>
  );
}

const inp = "w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-bold placeholder:text-slate-300 focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5";
const addBtn = "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 font-head text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:scale-[1.03] active:scale-95 disabled:opacity-40 sm:min-h-0";

export default function AdminControl() {
  const [cfg, setCfg] = useState(null);
  const [gc, setGc] = useState(null);
  const [words, setWords] = useState(null);
  const [texts, setTexts] = useState(null);
  const [season, setSeason] = useState(null);
  const [defs, setDefs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [newText, setNewText] = useState("");
  const [newTextLang, setNewTextLang] = useState("ar");
  const [seasonName, setSeasonName] = useState("");
  const [mForm, setMForm] = useState({ title: "", desc: "", icon: "Target", metric: "wordle_wins", target: 1, xp: 12 });
  const [busy, setBusy] = useState("");

  const load = async () => {
    try {
      const [c, g, w, t, s, m] = await Promise.all([
        api.get("/admin/controls/config"), api.get("/admin/controls/games-config"),
        api.get("/games/admin/words"), api.get("/games/admin/texts"),
        api.get("/admin/controls/season"), api.get("/admin/controls/missions"),
      ]);
      setCfg(c.data); setGc(g.data); setWords(w.data); setTexts(t.data);
      setSeason(s.data); setDefs(m.data.defs || []); setMetrics(m.data.metrics || []);
    } catch { toast.error("تعذّر تحميل غرفة التحكم"); }
  };
  useEffect(() => { load(); }, []);

  const act = async (key, fn, msg) => {
    setBusy(key);
    try { await fn(); if (msg) toast.success(msg); await load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "حدث خطأ"); }
    setBusy("");
  };

  if (!cfg) return <PageLoader />;

  const openCount = SECTIONS.filter(([k]) => cfg.toggles[k]).length;
  const activeMissions = defs.filter((d) => d.active).length;
  const maintOn = !!cfg.maintenance.on;

  const heroChips = [
    { dot: maintOn ? "bg-rose-400" : "bg-emerald-400", text: maintOn ? "وضع الصيانة مفعّل الآن" : "الموقع مفتوح للجميع" },
    { dot: "bg-sky-400", text: `الأقسام المفتوحة ${openCount} من ${SECTIONS.length}` },
    { dot: "bg-amber-400", text: season?.current ? `الموسم الجاري: ${season.current.name}` : "لا موسم جارٍ" },
    { dot: "bg-violet-400", text: `مهمات خاصة نشطة: ${activeMissions}` },
  ];

  return (
    <div className="space-y-5" data-testid="admin-control">
      {/* ===== ترويسة غرفة التحكم ===== */}
      <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_28px_60px_-24px_rgba(2,6,23,0.65)] sm:p-8">
        <motion.div aria-hidden className="absolute -top-24 -start-20 h-72 w-72 rounded-full bg-violet-600/35 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="absolute -bottom-28 end-10 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.25rem] bg-white/10 shadow-inner ring-1 ring-white/20 backdrop-blur">
              <SlidersHorizontal className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-head text-2xl font-black sm:text-3xl">غرفة التحكم</h2>
              <p className="mt-1 text-sm font-semibold text-slate-300">كل المقابض في مكان واحد · التغييرات تسري فوراً على الموقع بلا نشر جديد</p>
            </div>
            <button onClick={() => act("reload", async () => {}, null)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white/10 px-4 text-xs font-black ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20 sm:min-h-0 sm:py-2.5">
              <RefreshCw className={`h-4 w-4 ${busy === "reload" ? "animate-spin" : ""}`} /> تحديث
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {heroChips.map((c, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-[11px] font-black ring-1 ring-white/15 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${c.dot}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
                </span>
                {c.text}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid items-start gap-5 xl:grid-cols-5">
        {/* ===== مفاتيح الأقسام ===== */}
        <div className="xl:col-span-3">
          <Panel i={1} icon={Power} grad="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/30"
            title="مفاتيح الأقسام" sub="أطفئ أي قسم فوراً عند الحاجة · يختفي من التنقّل ويُحجب رابطه"
            extra={<span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-600 ring-1 ring-emerald-100">{openCount}/{SECTIONS.length} مفتوح</span>}>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTIONS.map(([k, label, sub, Icon, grad, shadow]) => {
                const on = !!cfg.toggles[k];
                return (
                  <div key={k} className={`group rounded-3xl border p-4 transition-all duration-300 ${on ? "border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.45)]" : "border-slate-100 bg-slate-50/60"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-lg ${shadow} transition-all duration-300 ${on ? "" : "opacity-35 saturate-50"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className={`truncate font-head text-sm font-black ${on ? "text-slate-900" : "text-slate-400"}`}>{label}</p>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{sub}</p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${on ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40" : "bg-rose-100 text-rose-600"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-white" : "bg-rose-400"}`} />
                        {on ? "مفتوح للطلاب" : "مقفل الآن"}
                      </span>
                      <Switch on={on} busy={busy === `t-${k}`} testid={`section-toggle-${k}`}
                        onClick={() => act(`t-${k}`, () => api.put("/admin/controls/config", { toggles: { [k]: !cfg.toggles[k] } }), cfg.toggles[k] ? `أُغلق قسم ${label}` : `فُتح قسم ${label}`)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-5 xl:col-span-2">
          {/* ===== وضع الصيانة ===== */}
          <Panel i={2} icon={Construction} grad="from-amber-500 to-rose-600" shadow="shadow-amber-500/30"
            title="وضع الصيانة" sub="يقفل الموقع على الطلاب والزوار · الفريق يدخل من صفحة الدخول">
            <div className={`rounded-3xl border p-4 transition-all duration-500 ${maintOn ? "border-rose-200 bg-gradient-to-b from-rose-50 to-white shadow-[0_16px_36px_-18px_rgba(244,63,94,0.5)]" : "border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white"}`}>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${maintOn ? "bg-rose-400" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex h-3 w-3 rounded-full ${maintOn ? "bg-rose-500" : "bg-emerald-500"}`} />
                </span>
                <p className={`flex-1 font-head text-sm font-black ${maintOn ? "text-rose-700" : "text-slate-700"}`}>
                  {maintOn ? "الموقع مغلق الآن على غير الفريق" : "الموقع مفتوح للجميع"}
                </p>
                <Switch on={maintOn} busy={busy === "maint"} testid="maintenance-toggle"
                  onClick={() => act("maint", () => api.put("/admin/controls/config", { maintenance: { on: !cfg.maintenance.on, message: cfg.maintenance.message || "" } }), cfg.maintenance.on ? "أُلغي وضع الصيانة" : "فُعّل وضع الصيانة · الموقع مغلق الآن")} />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={cfg.maintenance.message || ""} onChange={(e) => setCfg({ ...cfg, maintenance: { ...cfg.maintenance, message: e.target.value } })}
                  data-testid="maintenance-message"
                  placeholder="رسالة الصيانة (اختياري) · مثال: نعود بعد ساعة بتحديثات جديدة" className={inp} />
                <button onClick={() => act("maintmsg", () => api.put("/admin/controls/config", { maintenance: cfg.maintenance }), "حُفظت رسالة الصيانة")}
                  data-testid="maintenance-save"
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-amber-500 to-rose-600 px-4 font-head text-sm font-black text-white shadow-lg shadow-rose-500/25 transition hover:scale-[1.03] active:scale-95 sm:min-h-0">
                  <Save className="h-4 w-4" /> حفظ
                </button>
              </div>
            </div>
          </Panel>

          {/* ===== مدير الموسم ===== */}
          <Panel i={3} icon={Crown} grad="from-amber-400 to-yellow-600" shadow="shadow-amber-500/30"
            title="مدير الموسم · كأس المدارس" sub="الموسم الجاري يحسب الكأس من خبرة الطلاب منذ بدايته">
            {season?.current ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-4 text-white shadow-[0_18px_36px_-16px_rgba(245,158,11,0.6)]">
                <Trophy className="absolute -bottom-4 -start-3 h-24 w-24 text-white/15" />
                <div className="relative flex flex-wrap items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                    <Crown className="h-5.5 w-5.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-head text-base font-black">{season.current.name}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-amber-100">
                      بدأ {String(season.current.started_at).slice(0, 10)} · المتصدر الآن: {season.standings[0]?.school || "لا نتائج بعد"}
                    </p>
                  </div>
                  <button onClick={() => act("send", () => api.post("/admin/controls/season/end"), "انتهى الموسم وأُرشف")}
                    data-testid="season-end"
                    className="min-h-[44px] shrink-0 rounded-2xl bg-white px-4 font-head text-xs font-black text-amber-700 shadow-lg transition hover:scale-[1.03] active:scale-95 sm:min-h-0 sm:py-2.5">
                    إنهاء + أرشفة
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-3.5 text-sm font-bold text-amber-700">
                لا موسم جارٍ · الكأس يعرض مجموع الخبرة الكلي حالياً
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} data-testid="season-name"
                placeholder="اسم موسم جديد · مثال: موسم الفصل الثاني" className={inp} />
              <button disabled={!seasonName.trim() || busy === "sstart"} data-testid="season-start"
                onClick={() => act("sstart", () => api.post("/admin/controls/season/start", { name: seasonName }), "بدأ الموسم الجديد")}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-4 font-head text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:scale-[1.03] active:scale-95 disabled:opacity-40 sm:min-h-0">
                <CalendarRange className="h-4 w-4" /> بدء موسم
              </button>
            </div>
            {season?.archives?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-black tracking-wide text-slate-400">مواسم سابقة</p>
                {season.archives.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-500">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600"><Archive className="h-3.5 w-3.5" /></span>
                    <span className="truncate">{a.name} · انتهى {String(a.ended_at).slice(0, 10)}</span>
                    <span className="ms-auto shrink-0 text-slate-800">الفائز: {a.standings?.[0]?.school || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ===== تحكم الألعاب ===== */}
      {gc && (
        <Panel i={4} icon={Gamepad2} grad="from-violet-500 to-fuchsia-600" shadow="shadow-fuchsia-500/30"
          title="غرفة تحكم الألعاب · جوائز XP" sub="عدّل الجوائز من هنا وتسري فوراً · الحدود النظامية آمنة ضد الغش"
          extra={<span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-fuchsia-50 px-3 py-1.5 text-[11px] font-black text-fuchsia-600 ring-1 ring-fuchsia-100 sm:inline-flex"><ShieldCheck className="h-3.5 w-3.5" /> حماية ضد الغش مفعّلة</span>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {XP_FIELDS.map(([k, label, hint, Icon, grad]) => (
              <div key={k} className="rounded-3xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white p-4 transition hover:border-fuchsia-200 hover:shadow-[0_14px_30px_-18px_rgba(217,70,239,0.4)]">
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-md`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-head text-xs font-black leading-snug text-slate-800">{label}</span>
                </div>
                <p className="mt-2 text-[10px] font-bold leading-snug text-slate-400">{hint}</p>
                <div className="relative mt-3">
                  <input type="number" min="0" value={gc[k]} onChange={(e) => setGc({ ...gc, [k]: Number(e.target.value) })}
                    data-testid={`xp-input-${k}`}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pe-3 ps-14 text-center font-head text-lg font-black text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/10" />
                  <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 rounded-lg bg-fuchsia-600 px-2 py-1 text-[10px] font-black text-white shadow-md shadow-fuchsia-500/40">XP</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => act("gc", () => api.put("/admin/controls/games-config", gc), "حُفظت جوائز الألعاب")}
            data-testid="xp-save"
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-fuchsia-600 px-5 font-head text-sm font-black text-white shadow-[0_16px_32px_-12px_rgba(192,38,211,0.55)] transition hover:scale-[1.01] active:scale-95 sm:w-auto sm:min-h-0 sm:py-3">
            <Save className="h-4.5 w-4.5" /> حفظ كل الجوائز
          </button>
        </Panel>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* ===== بنك الكلمات ===== */}
        <Panel i={5} icon={BookOpenText} grad="from-violet-500 to-purple-600" shadow="shadow-violet-500/30"
          title="بنك كلمات «كلمة اليوم»" sub={words ? `${words.bank_size} كلمة صالحة في البنك` : ""}
          extra={words ? <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-600 ring-1 ring-violet-100">تغطي {words.bank_size} يوماً</span> : null}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={newWord} onChange={(e) => setNewWord(e.target.value)} data-testid="word-input"
              placeholder="كلمة عربية من 5 أحرف · مثال: برمجة" className={inp} />
            <button disabled={!newWord.trim() || busy === "wadd"} data-testid="word-add"
              onClick={() => act("wadd", () => api.post("/games/admin/words", { word: newWord }).then(() => setNewWord("")), "أُضيفت الكلمة للبنك")}
              className={addBtn}><Plus className="h-4 w-4" /> أضف</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {words?.custom?.length ? words.custom.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-violet-600 to-purple-600 py-1.5 pe-3 ps-2 text-xs font-black text-white shadow-md shadow-violet-500/30">
                <button disabled={busy === `wd-${w.id}`} data-testid={`word-del-${w.id}`} aria-label={`حذف ${w.word}`}
                  onClick={() => act(`wd-${w.id}`, () => api.delete(`/games/admin/words/${w.id}`), "حُذفت الكلمة")}
                  className="grid h-5 w-5 place-items-center rounded-full bg-white/20 transition hover:bg-rose-500">
                  <Trash2 className="h-3 w-3" />
                </button>
                {w.word}
              </span>
            )) : <p className="text-xs font-bold text-slate-400">لا كلمات مضافة بعد · البنك الأساسي {words?.builtin ?? ""} كلمة</p>}
          </div>
        </Panel>

        {/* ===== نصوص الكتابة ===== */}
        <Panel i={6} icon={Keyboard} grad="from-sky-500 to-cyan-600" shadow="shadow-sky-500/30"
          title="نصوص سباق الكتابة" sub={texts ? `${texts.builtin} نصاً أساسياً + ${texts.custom.length} مضافاً` : ""}
          extra={texts ? <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1.5 text-[11px] font-black text-sky-600 ring-1 ring-sky-100">{texts.builtin + texts.custom.length} نصاً جاهزاً</span> : null}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={newText} onChange={(e) => setNewText(e.target.value)} data-testid="text-input"
              placeholder="نص جديد للسباق (30 حرفاً على الأقل)" className={`${inp} flex-1`} />
            <div className="flex gap-2">
              <select value={newTextLang} onChange={(e) => setNewTextLang(e.target.value)} data-testid="text-lang"
                className="min-h-[44px] rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-black text-slate-700 outline-none transition focus:border-slate-900 sm:min-h-0">
                <option value="ar">عربي</option>
                <option value="en">EN</option>
              </select>
              <button disabled={newText.trim().length < 30 || busy === "tadd"} data-testid="text-add"
                onClick={() => act("tadd", () => api.post("/games/admin/texts", { text: newText, lang: newTextLang }).then(() => setNewText("")), "أُضيف النص")}
                className={addBtn}><Plus className="h-4 w-4" /> أضف</button>
            </div>
          </div>
          <div className="mt-4 max-h-48 space-y-2 overflow-auto pe-1">
            {texts?.custom?.length ? texts.custom.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 transition hover:border-sky-200">
                <p className="flex-1 text-xs font-bold leading-relaxed text-slate-600 line-clamp-2">{t.text}</p>
                <button disabled={busy === `td-${t.id}`} data-testid={`text-del-${t.id}`} aria-label="حذف النص"
                  onClick={() => act(`td-${t.id}`, () => api.delete(`/games/admin/texts/${t.id}`), "حُذف النص")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )) : <p className="text-xs font-bold text-slate-400">لا نصوص مضافة · الأساسية تخدم السباقات الآن</p>}
          </div>
        </Panel>
      </div>

      {/* ===== محرّك المهمات ===== */}
      <Panel i={7} icon={Target} grad="from-indigo-500 to-violet-600" shadow="shadow-indigo-500/30"
        title="محرّك المهمات · مهمات أسبوعية خاصة" sub="المهمات الافتراضية السبع تعمل دائماً · أضف فوقها مهماتك وتظهر للطلاب فوراً"
        extra={<span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-600 ring-1 ring-indigo-100 sm:inline-flex"><ListChecks className="h-3.5 w-3.5" /> {activeMissions} نشطة الآن</span>}>
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 via-violet-50/40 to-white p-4">
          <p className="mb-3 flex items-center gap-2 font-head text-xs font-black text-indigo-900">
            <Sparkles className="h-4 w-4 text-indigo-500" /> مهمة خاصة جديدة
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <input value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} data-testid="mission-title"
              placeholder="عنوان المهمة · مثال: أسبوع الرواية" className={inp} />
            <input value={mForm.desc} onChange={(e) => setMForm({ ...mForm, desc: e.target.value })} data-testid="mission-desc"
              placeholder="وصف قصير" className={inp} />
            <select value={mForm.metric} onChange={(e) => setMForm({ ...mForm, metric: e.target.value })} data-testid="mission-metric" className={inp}>
              {metrics.map((m) => <option key={m} value={m}>{METRIC_LABELS[m] || m}</option>)}
            </select>
            <div className="relative">
              <input type="number" min="1" value={mForm.target} onChange={(e) => setMForm({ ...mForm, target: Number(e.target.value) })}
                data-testid="mission-target" placeholder="الهدف" className={`${inp} ps-16`} />
              <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white">الهدف</span>
            </div>
            <div className="relative">
              <input type="number" min="0" value={mForm.xp} onChange={(e) => setMForm({ ...mForm, xp: Number(e.target.value) })}
                data-testid="mission-xp" placeholder="XP الجائزة" className={`${inp} ps-16`} />
              <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-black text-white shadow-md shadow-amber-500/40">XP</span>
            </div>
            <button disabled={mForm.title.trim().length < 3 || busy === "madd"} data-testid="mission-add"
              onClick={() => act("madd", () => api.post("/admin/controls/missions", mForm).then(() => setMForm({ title: "", desc: "", icon: "Target", metric: "wordle_wins", target: 1, xp: 12 })), "نُشرت المهمة الخاصة")}
              className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 px-4 font-head text-sm font-black text-white shadow-[0_14px_28px_-10px_rgba(99,102,241,0.6)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-40 sm:min-h-0">
              <Sparkles className="h-4 w-4" /> نشر المهمة
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
          {defs.length ? defs.map((d) => (
            <div key={d.id} className={`flex items-center gap-3 rounded-3xl border p-4 transition-all duration-300 ${d.active ? "border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white shadow-[0_14px_30px_-18px_rgba(99,102,241,0.45)]" : "border-slate-100 bg-slate-50/60"}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 ${d.active ? "" : "opacity-35 saturate-50"}`}>
                <Target className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-head text-sm font-black ${d.active ? "text-slate-900" : "text-slate-400"}`}>{d.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">{METRIC_LABELS[d.metric] || d.metric}</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">الهدف {d.target}</span>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm shadow-amber-500/40">{d.xp} XP</span>
                </div>
              </div>
              <Switch on={!!d.active} busy={busy === `ma-${d.id}`} testid={`mission-toggle-${d.id}`}
                onClick={() => act(`ma-${d.id}`, () => api.put(`/admin/controls/missions/${d.id}`, { ...d, active: !d.active }), d.active ? "أُوقفت المهمة" : "فُعّلت المهمة")} />
              <button disabled={busy === `md-${d.id}`} data-testid={`mission-del-${d.id}`} aria-label={`حذف ${d.title}`}
                onClick={() => act(`md-${d.id}`, () => api.delete(`/admin/controls/missions/${d.id}`), "حُذفت المهمة")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500">
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          )) : <p className="text-xs font-bold text-slate-400 lg:col-span-2">لا مهمات خاصة بعد</p>}
        </div>
      </Panel>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] font-bold text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        المفاتيح والصيانة والجوائز تتطلب صلاحية إدارة المحتوى · قراءة هذه الصفحة متاحة لصلاحية الإحصائيات
      </p>
    </div>
  );
}
