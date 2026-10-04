import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  SlidersHorizontal, Power, Construction, Gamepad2, BookOpenText, Keyboard,
  Trophy, Target, Plus, Trash2, Save, RefreshCw, Crown, Archive, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const SECTIONS = [
  ["games", "ساحة الألعاب", "الألعاب والتحديات والمهمات"],
  ["stories", "قصص اختر مغامرتك", "مكتبة القصص والقارئ"],
  ["swap", "تبادل الكتب", "مبادلة الكتب بين الطلاب"],
  ["community", "ساحة المجتمع", "المجتمع والمناقشات"],
  ["ventures", "المشاريع الطلابية", "رواد المستقبل والمشاريع"],
  ["clubs", "الأندية الأدبية", "أندية الكتب والاجتماعات"],
  ["mini_books", "كتيّبات الطلاب", "الكتيّبات القصيرة"],
  ["live_sessions", "الجلسات المباشرة", "جلسات البث المباشر"],
];

const XP_FIELDS = [
  ["math_full_cap", "سقف XP اليومي · الحساب", "أعلى نقاط خبرة من سباق الحساب باليوم"],
  ["typing_full_cap", "سقف XP اليومي · الكتابة", "أعلى نقاط خبرة من سباق الكتابة باليوم"],
  ["wordle_lose_xp", "XP الخسارة · كلمة اليوم", "ما يأخذه من لم يخمن الكلمة"],
  ["challenge_win_xp", "XP الفوز · تحدي صديق", "جائزة الفائز"],
  ["challenge_draw_xp", "XP التعادل · تحدي صديق", "لكل طرف عند التعادل"],
  ["challenge_lose_xp", "XP الخسارة · تحدي صديق", "جائزة المشاركة"],
  ["story_finish_xp", "XP إنهاء قصة", "عند بلوغ أي نهاية"],
  ["mission_xp", "XP المهمة الواحدة", "للمهمات الافتراضية السبع"],
  ["chest_xp", "XP صندوق الكنز", "عند إكمال كل مهمات الأسبوع"],
];

const METRIC_LABELS = {
  wordle_wins: "انتصارات كلمة اليوم", math_points: "نقاط سباق الحساب", typing_wpm: "أفضل كلمة/دقيقة",
  pages: "صفحات مقروءة", play_days: "أيام لعب", xp_earned: "خبرة مكتسبة", books: "كتب منجزة",
};

function Card({ icon: Icon, title, sub, children }) {
  return (
    <section className="rounded-[1.75rem] bg-white shadow-[0_10px_34px_rgba(15,23,42,.07)] p-5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-slate-900 grid place-items-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </span>
        <div className="min-w-0">
          <h3 className="font-head font-black text-slate-900 leading-tight">{title}</h3>
          <p className="text-[11px] font-bold text-slate-400 leading-tight mt-0.5">{sub}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Switch({ on, onClick, busy }) {
  return (
    <button type="button" disabled={busy} onClick={onClick}
      className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "end-0.5" : "start-0.5"}`} />
    </button>
  );
}

const inp = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900 transition";

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

  if (!cfg) return <p className="text-slate-500 py-10 text-center">جارٍ التحميل…</p>;

  return (
    <div className="space-y-5" data-testid="admin-control">
      <div className="rounded-[2rem] bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute -top-16 -start-16 w-64 h-64 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="relative flex items-center gap-3 flex-wrap">
          <span className="w-12 h-12 rounded-2xl bg-white/10 grid place-items-center"><SlidersHorizontal className="w-6 h-6" /></span>
          <div>
            <h2 className="font-head font-black text-2xl">غرفة التحكم</h2>
            <p className="text-slate-300 text-sm mt-0.5">كل المقابض في مكان واحد · التغييرات تسري فوراً على الموقع بلا نشر جديد</p>
          </div>
          <button onClick={() => act("reload", async () => {}, null)} className="ms-auto rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-black inline-flex items-center gap-1.5 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${busy === "reload" ? "animate-spin" : ""}`} /> تحديث
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={Power} title="مفاتيح الأقسام" sub="أطفئ أي قسم فوراً عند الحاجة · يختفي من التنقّل ويُحجب رابطه">
          <div className="space-y-2">
            {SECTIONS.map(([k, label, sub]) => (
              <div key={k} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-head font-black text-sm text-slate-800 truncate">{label}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{sub}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.toggles[k] ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {cfg.toggles[k] ? "مفتوح" : "مقفل"}
                </span>
                <Switch on={!!cfg.toggles[k]} busy={busy === `t-${k}`}
                  onClick={() => act(`t-${k}`, () => api.put("/admin/controls/config", { toggles: { [k]: !cfg.toggles[k] } }), cfg.toggles[k] ? `أُغلق قسم ${label}` : `فُتح قسم ${label}`)} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card icon={Construction} title="وضع الصيانة" sub="يقفل الموقع على الطلاب والزوار · الفريق يدخل من صفحة الدخول">
            <div className="flex items-center gap-3">
              <Switch on={!!cfg.maintenance.on} busy={busy === "maint"}
                onClick={() => act("maint", () => api.put("/admin/controls/config", { maintenance: { on: !cfg.maintenance.on, message: cfg.maintenance.message || "" } }), cfg.maintenance.on ? "أُلغي وضع الصيانة" : "فُعّل وضع الصيانة · الموقع مغلق الآن")} />
              <p className="text-sm font-bold text-slate-600">{cfg.maintenance.on ? "الموقع مغلق الآن على غير الفريق" : "الموقع مفتوح للجميع"}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <input value={cfg.maintenance.message || ""} onChange={(e) => setCfg({ ...cfg, maintenance: { ...cfg.maintenance, message: e.target.value } })}
                placeholder="رسالة الصيانة (اختياري) · مثال: نعود بعد ساعة بتحديثات جديدة" className={inp} />
              <button onClick={() => act("maintmsg", () => api.put("/admin/controls/config", { maintenance: cfg.maintenance }), "حُفظت رسالة الصيانة")}
                className="rounded-xl bg-slate-900 text-white px-4 font-head font-black text-sm shrink-0 inline-flex items-center gap-1.5"><Save className="w-4 h-4" /> حفظ</button>
            </div>
          </Card>

          <Card icon={Crown} title="مدير الموسم · كأس المدارس" sub="الموسم الجاري يحسب الكأس من خبرة الطلاب منذ بدايته">
            {season?.current ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 flex items-center gap-3 flex-wrap">
                <Crown className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-head font-black text-sm text-amber-900">{season.current.name}</p>
                  <p className="text-[11px] font-bold text-amber-600">بدأ {String(season.current.started_at).slice(0, 10)} · المتصدر الآن: {season.standings[0]?.school || "لا نتائج بعد"}</p>
                </div>
                <button onClick={() => act("send", () => api.post("/admin/controls/season/end"), "انتهى الموسم وأُرشف")}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-black transition">إنهاء + أرشفة</button>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-500">لا موسم جارٍ · الكأس يعرض مجموع الخبرة الكلي حالياً</p>
            )}
            <div className="flex gap-2 mt-3">
              <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="اسم موسم جديد · مثال: موسم الفصل الثاني" className={inp} />
              <button disabled={!seasonName.trim() || busy === "sstart"}
                onClick={() => act("sstart", () => api.post("/admin/controls/season/start", { name: seasonName }), "بدأ الموسم الجديد")}
                className="rounded-xl bg-slate-900 text-white px-4 font-head font-black text-sm shrink-0 disabled:opacity-40">بدء موسم</button>
            </div>
            {season?.archives?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {season.archives.map((a) => (
                  <p key={a._id} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Archive className="w-3.5 h-3.5" /> {a.name} · انتهى {String(a.ended_at).slice(0, 10)} · الفائز: <span className="text-slate-800">{a.standings?.[0]?.school || "—"}</span>
                  </p>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {gc && (
        <Card icon={Gamepad2} title="غرفة تحكم الألعاب · جوائز XP" sub="عدّل الجوائز من هنا وتسري فوراً · الحدود النظامية آمنة ضد الغش">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {XP_FIELDS.map(([k, label, hint]) => (
              <label key={k} className="rounded-2xl bg-slate-50 px-3.5 py-3 block">
                <span className="font-head font-black text-xs text-slate-800 block">{label}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{hint}</span>
                <input type="number" min="0" value={gc[k]} onChange={(e) => setGc({ ...gc, [k]: Number(e.target.value) })}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-black outline-none focus:border-slate-900" />
              </label>
            ))}
          </div>
          <button onClick={() => act("gc", () => api.put("/admin/controls/games-config", gc), "حُفظت جوائز الألعاب")}
            className="mt-4 rounded-2xl bg-slate-900 text-white px-5 py-2.5 font-head font-black text-sm inline-flex items-center gap-2 transition hover:scale-[1.02] active:scale-95">
            <Save className="w-4 h-4" /> حفظ كل الجوائز
          </button>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={BookOpenText} title="بنك كلمات «كلمة اليوم»" sub={words ? `${words.bank_size} كلمة صالحة · تغطي ${words.bank_size} يوماً` : ""}>
          <div className="flex gap-2">
            <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="كلمة عربية من 5 أحرف · مثال: برمجة" className={inp} />
            <button disabled={!newWord.trim() || busy === "wadd"}
              onClick={() => act("wadd", () => api.post("/games/admin/words", { word: newWord }).then(() => setNewWord("")), "أُضيفت الكلمة للبنك")}
              className="rounded-xl bg-slate-900 text-white px-4 font-head font-black text-sm shrink-0 disabled:opacity-40 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> أضف</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {words?.custom?.length ? words.custom.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 px-2.5 py-1 text-xs font-black">
                {w.word}
                <button disabled={busy === `wd-${w.id}`} onClick={() => act(`wd-${w.id}`, () => api.delete(`/games/admin/words/${w.id}`), "حُذفت الكلمة")} className="hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            )) : <p className="text-xs font-bold text-slate-400">لا كلمات مضافة بعد · البنك الأساسي {words?.builtin ?? ""} كلمة</p>}
          </div>
        </Card>

        <Card icon={Keyboard} title="نصوص سباق الكتابة" sub={texts ? `${texts.builtin} نصاً أساسياً + ${texts.custom.length} مضافاً` : ""}>
          <div className="flex gap-2">
            <input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="نص جديد للسباق (30 حرفاً على الأقل)" className={inp} />
            <select value={newTextLang} onChange={(e) => setNewTextLang(e.target.value)} className="rounded-xl border border-slate-200 px-2 text-sm font-black">
              <option value="ar">عربي</option>
              <option value="en">EN</option>
            </select>
            <button disabled={newText.trim().length < 30 || busy === "tadd"}
              onClick={() => act("tadd", () => api.post("/games/admin/texts", { text: newText, lang: newTextLang }).then(() => setNewText("")), "أُضيف النص")}
              className="rounded-xl bg-slate-900 text-white px-4 font-head font-black text-sm shrink-0 disabled:opacity-40 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> أضف</button>
          </div>
          <div className="mt-3 space-y-1.5 max-h-44 overflow-auto pe-1">
            {texts?.custom?.length ? texts.custom.map((t) => (
              <div key={t.id} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold text-slate-600 leading-relaxed flex-1 line-clamp-2">{t.text}</p>
                <button disabled={busy === `td-${t.id}`} onClick={() => act(`td-${t.id}`, () => api.delete(`/games/admin/texts/${t.id}`), "حُذف النص")} className="text-slate-300 hover:text-rose-500 shrink-0 pt-0.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )) : <p className="text-xs font-bold text-slate-400">لا نصوص مضافة · الأساسية تخدم السباقات الآن</p>}
          </div>
        </Card>
      </div>

      <Card icon={Target} title="محرّك المهمات · مهمات أسبوعية خاصة" sub="المهمات الافتراضية السبع تعمل دائماً · أضف فوقها مهماتك وتظهر للطلاب فوراً">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input value={mForm.title} onChange={(e) => setMForm({ ...mForm, title: e.target.value })} placeholder="عنوان المهمة · مثال: أسبوع الرواية" className={inp} />
          <input value={mForm.desc} onChange={(e) => setMForm({ ...mForm, desc: e.target.value })} placeholder="وصف قصير" className={inp} />
          <select value={mForm.metric} onChange={(e) => setMForm({ ...mForm, metric: e.target.value })} className={inp}>
            {metrics.map((m) => <option key={m} value={m}>{METRIC_LABELS[m] || m}</option>)}
          </select>
          <input type="number" min="1" value={mForm.target} onChange={(e) => setMForm({ ...mForm, target: Number(e.target.value) })} placeholder="الهدف" className={inp} />
          <input type="number" min="0" value={mForm.xp} onChange={(e) => setMForm({ ...mForm, xp: Number(e.target.value) })} placeholder="XP الجائزة" className={inp} />
          <button disabled={mForm.title.trim().length < 3 || busy === "madd"}
            onClick={() => act("madd", () => api.post("/admin/controls/missions", mForm).then(() => setMForm({ title: "", desc: "", icon: "Target", metric: "wordle_wins", target: 1, xp: 12 })), "نُشرت المهمة الخاصة")}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 font-head font-black text-sm disabled:opacity-40 inline-flex items-center justify-center gap-1.5 transition">
            <Sparkles className="w-4 h-4" /> نشر المهمة
          </button>
        </div>
        <div className="mt-4 space-y-1.5">
          {defs.length ? defs.map((d) => (
            <div key={d._id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-2.5">
              <Target className="w-4 h-4 text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-head font-black text-sm text-slate-800 truncate">{d.title}</p>
                <p className="text-[11px] font-bold text-slate-400">{METRIC_LABELS[d.metric] || d.metric} · الهدف {d.target} · {d.xp} XP</p>
              </div>
              <Switch on={!!d.active} busy={busy === `ma-${d._id}`}
                onClick={() => act(`ma-${d._id}`, () => api.put(`/admin/controls/missions/${d._id}`, { ...d, active: !d.active }), d.active ? "أُوقفت المهمة" : "فُعّلت المهمة")} />
              <button disabled={busy === `md-${d._id}`} onClick={() => act(`md-${d._id}`, () => api.delete(`/admin/controls/missions/${d._id}`), "حُذفت المهمة")} className="text-slate-300 hover:text-rose-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )) : <p className="text-xs font-bold text-slate-400">لا مهمات خاصة بعد</p>}
        </div>
      </Card>

      <p className="text-[11px] font-bold text-slate-400 text-center">المفاتيح والصيانة والجوائز تتطلب صلاحية إدارة المحتوى · قراءة هذه الصفحة متاحة لصلاحية الإحصائيات</p>
    </div>
  );
}
