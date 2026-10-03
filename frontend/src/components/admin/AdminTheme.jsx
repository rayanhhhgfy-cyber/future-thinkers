import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp } from "@/components/anim";
import { THEME_PRESETS, applyDesign, resolveColors, FONT_OPTIONS, RADIUS_OPTIONS, DENSITY_OPTIONS, SHADOW_OPTIONS, DESIGN_DEFAULTS } from "@/lib/theme";
import { Palette, Sparkles, ShieldCheck, Eye, Save, Droplets, Type, Shapes, Rows3, Layers } from "lucide-react";

/* مظهر الموقع · مركز التحكم بالتصميم
   إعادة تصميم بصرية فقط: نفس الجلب GET /theme ونفس الحفظ PUT /admin/theme
   بنفس الحمولة {preset, custom, effects, design} ونفس التحقق من صيغة الألوان
   ونفس applyDesign بعد النجاح. لا CSS حر · الخادم يقبل القيم المدرجة فقط. */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const THEME_COLOR_ROWS = [
  ["a", "البداية الداكنة", "أول لون في تدرجات الواجهات والأقسام الداكنة"],
  ["b", "التدرج", "اللون الأوسط الذي يبني التدرج"],
  ["c", "الأعمق", "أغمق درجة · قاعدة التدرج"],
  ["accent", "لون الإبراز", "الأزرار واللمسات البارزة في الموقع"],
];

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

function BlockTitle({ icon: Icon, c, title, desc }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-9 h-9 rounded-2xl grid place-items-center text-white shadow-sm shrink-0" style={{ background: `linear-gradient(135deg, ${c}, ${c}BB)` }}>
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block font-head font-extrabold text-sm text-slate-800">{title}</span>
        {desc && <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</span>}
      </span>
    </div>
  );
}

export default function AdminTheme() {
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
  const shadowCss = design.shadow === "soft" ? "0 4px 14px rgba(2,20,16,.10)" : design.shadow === "bold" ? "0 22px 48px rgba(2,20,16,.30)" : "0 12px 30px rgba(2,20,16,.18)";
  const padCls = design.density === "compact" ? "p-3.5" : design.density === "spacious" ? "p-6" : "p-5";
  const presetName = THEME_PRESETS.find((p) => p.key === preset)?.name || preset;
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
    <div data-testid="admin-theme">
      <FadeUp>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#7C3AEDBB)" }}><Palette className="w-4.5 h-4.5" /></span>
              مظهر الموقع · مركز التحكم بالتصميم
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">تحكم متقدم ببساطة: سمات جاهزة، ألوانك الخاصة، وتأثيرات · يصل التغيير كل الزوار فوراً وبأمان كامل.</p>
          </div>
          {loaded && (
            <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold" data-testid="admin-theme-active">
              السمة الحالية: {presetName}{useCustom ? " · بألوان مخصصة" : ""}
            </span>
          )}
        </div>
      </FadeUp>

      {!loaded ? <PageLoader /> : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
          {/* ===== عمود التحكم ===== */}
          <div className="space-y-4 min-w-0">
            {/* ١ · السمات الجاهزة */}
            <FadeUp>
              <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
                <BlockTitle icon={Sparkles} c="#7C3AED" title="السمات الجاهزة" desc="اثنتا عشرة هوية لونية كاملة · اختر واحدة وستتحدث المعاينة فوراً" />
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((p) => (
                    <button key={p.key} onClick={() => pickPreset(p.key)} data-testid={`admin-theme-preset-${p.key}`}
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
            </FadeUp>

            {/* ٢ · ألوان مخصصة */}
            <FadeUp delay={0.05}>
              <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
                <BlockTitle icon={Droplets} c="#0891B2" title="ألوان مخصصة" desc="تجاوز ألوان السمة الجاهزة بألوان تختارها بنفسك" />
                <div className="rounded-2xl bg-slate-50 px-3.5">
                  <DesignToggle on={useCustom} onChange={setUseCustom} label="استخدام ألواني" desc="عند التفعيل تُبنى التدرجات من ألوانك الأربعة بدل ألوان السمة" />
                </div>
                <div className={`space-y-4 mt-4 ${useCustom ? "" : "opacity-40 pointer-events-none"}`}>
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
            </FadeUp>

            {/* ٣ · التأثيرات */}
            <FadeUp delay={0.08}>
              <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
                <BlockTitle icon={Layers} c="#D97706" title="التأثيرات" desc="لمسات بصرية فوق التدرجات وفي حركة العناصر" />
                <DesignToggle on={effects.grain} onChange={(v) => setEffects((e) => ({ ...e, grain: v }))} label="حبيبات الخلفية" desc="ملمس خفيف فوق التدرجات يعطي عمقاً للأقسام الداكنة" />
                <div className="border-t border-slate-50" />
                <DesignToggle on={effects.motion} onChange={(v) => setEffects((e) => ({ ...e, motion: v }))} label="الحركات والانتقالات" desc="حركات الظهور والطفو والانتقالات في كل الموقع" />
              </div>
            </FadeUp>

            {/* ٤ · تصميم العناصر */}
            <FadeUp delay={0.1}>
              <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5">
                <BlockTitle icon={Shapes} c="#2563EB" title="تصميم العناصر" desc="الخطوط وشكل الزوايا وكثافة العرض وعمق الظلال · تنطبق على كل عناصر الموقع فوراً" />

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2"><Type className="w-3.5 h-3.5" /> خط الموقع</div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.key} onClick={() => setDesign((d) => ({ ...d, font: f.key }))} data-testid={`admin-theme-font-${f.key}`}
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
                    <button key={r.key} onClick={() => setDesign((d) => ({ ...d, radius: r.key }))} data-testid={`admin-theme-radius-${r.key}`}
                      className={`rounded-2xl border p-3.5 text-right transition-all min-h-[64px] ${design.radius === r.key ? "border-slate-900 ring-2 ring-slate-900/15 bg-slate-50" : "border-slate-200 hover:border-slate-400 bg-white"}`}>
                      <span className="block w-10 h-8 bg-gradient-to-br from-slate-700 to-slate-900 mb-2" style={{ borderRadius: r.key === "sharp" ? "4px" : r.key === "round" ? "16px" : "10px" }} />
                      <span className="block font-extrabold text-slate-800 text-sm">{r.name}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2"><Rows3 className="w-3.5 h-3.5" /> كثافة العرض</div>
                    <div className="flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/70">
                      {DENSITY_OPTIONS.map((o) => (
                        <button key={o.key} onClick={() => setDesign((d) => ({ ...d, density: o.key }))} title={o.desc} data-testid={`admin-theme-density-${o.key}`}
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
                        <button key={o.key} onClick={() => setDesign((d) => ({ ...d, shadow: o.key }))} title={o.desc} data-testid={`admin-theme-shadow-${o.key}`}
                          className={`flex-1 rounded-xl px-2 min-h-[44px] text-xs font-extrabold transition-all ${design.shadow === o.key ? "bg-white text-slate-900 shadow ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
                          {o.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">{SHADOW_OPTIONS.find((o) => o.key === design.shadow)?.desc}</p>
                  </div>
                </div>
              </div>
            </FadeUp>

            <div className="bg-amber-50 border border-amber-100 rounded-3xl p-4 text-xs text-amber-700 leading-relaxed flex gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>🔒 آمن بتصميمه: لا توجد أي خانة CSS حرة · الخادم يقبل فقط أسماء سمات من قائمة مغلقة، وألواناً بصيغة #RRGGBB مفحوصة، ومفاتيح تأثيرات منطقية · أي قيمة غريبة تُرفض تلقائياً.</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 text-xs text-slate-500 leading-relaxed">
              💡 تشمل السمة: تدرجات الواجهات الرئيسية (الصفحة الافتتاحية، اللوحات، النوادي) وعناصر الإبراز. أغطية الملفات الشخصية تبقى اختياراً فردياً لكل طالب من إعداداته.
            </div>
          </div>

          {/* ===== سكة المعاينة الحية ===== */}
          <div className="lg:sticky lg:top-24 space-y-4 min-w-0">
            <FadeUp delay={0.06}>
              <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5" data-testid="admin-theme-preview">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-violet-600" />
                  <h3 className="font-head font-extrabold text-sm text-slate-700">معاينة حية · هكذا سيبدو الموقع</h3>
                </div>
                <div className={`relative overflow-hidden rounded-3xl text-white ${padCls} mb-3 ${effects.grain ? "grain" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${eff.c} 0%, ${eff.b} 55%, ${eff.a} 130%)`, fontFamily: selFont.body, boxShadow: shadowCss }}>
                  <div className="relative">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-bold">نادي مفكري المستقبل</span>
                    <div className="font-black text-xl mt-3" style={{ fontFamily: selFont.head }}>صمم مستقبلك بنفسك</div>
                    <p className="text-white/75 text-xs mt-1">منصة الطلاب المبدعين · قراءة وبرمجة وشطرنج ومشاريع</p>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <span className="px-4 py-2 text-xs font-black text-white shadow-lg" style={{ background: eff.accent, borderRadius: radiusCss }}>ابدأ الآن</span>
                      <span className="px-4 py-2 text-xs font-bold bg-white/15 backdrop-blur" style={{ borderRadius: radiusCss }}>تصفح الأقسام</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl bg-white border border-slate-100 p-4" style={{ borderRadius: radiusCss, boxShadow: shadowCss, fontFamily: selFont.body }}>
                  <div className="font-extrabold text-sm text-slate-800" style={{ fontFamily: selFont.head }}>بطاقة محتوى تجريبية</div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">هكذا ستبدو البطاقات والأزرار والظلال مع الخط والزوايا والكثافة المختارة.</p>
                  <div className="flex gap-2 mt-3">
                    <span className="px-3 py-1.5 text-[11px] font-black text-white" style={{ background: eff.accent, borderRadius: radiusCss }}>زر رئيسي</span>
                    <span className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600" style={{ borderRadius: radiusCss }}>زر ثانوي</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4 text-[10px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">السمة: {presetName}</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">{useCustom ? "ألوان مخصصة" : "ألوان السمة"}</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">الخط: {selFont.name}</span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600">الزوايا: {RADIUS_OPTIONS.find((r) => r.key === design.radius)?.name}</span>
                </div>
              </div>
            </FadeUp>
            <button onClick={save} disabled={busy} data-testid="admin-theme-save"
              className="pressable w-full min-h-[52px] rounded-3xl text-white font-head font-extrabold text-base disabled:opacity-50 shadow-xl"
              style={{ background: `linear-gradient(120deg, ${eff.b}, ${eff.accent})` }}>
              <span className="inline-flex items-center gap-2">{busy ? "جارٍ التطبيق…" : <><Save className="w-5 h-5" /> حفظ المظهر وتطبيقه</>}</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">يطبّق الحفظ على كل الزوار فوراً · الألوان تُفحص بصيغة #RRGGBB قبل الإرسال</p>
          </div>
        </div>
      )}
    </div>
  );
}
