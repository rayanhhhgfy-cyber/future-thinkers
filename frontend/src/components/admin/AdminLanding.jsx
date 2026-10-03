import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp } from "@/components/anim";
import { Globe2, Save, Sparkles, Info, Eye, Target, Rocket, ListChecks, PartyPopper, Type } from "lucide-react";

/* صفحة الهبوط · محرر نصوص الصفحة الرئيسية (CMS)
   نفس نقاط النهاية: GET /admin/cms/landing · PUT /admin/cms/landing
   الحقول: hero_badge · hero_title · hero_highlight · hero_subtitle ·
   about · vision · mission · goals[] · activities[]
   (وتُحرَّر المصفوفات كنص · سطر لكل عنصر) */

const ta = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition leading-relaxed";

function Card({ title, icon: Icon, hint, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
      <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2">
        {Icon && <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>}
        {title}
      </h3>
      {hint && <p className="text-[11px] text-slate-400 font-medium mt-1.5">{hint}</p>}
      <div className="mt-4 space-y-3.5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function AdminLanding() {
  const [cms, setCms] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/admin/cms/landing").then((r) => setCms(r.data?.value || r.data || {})).catch(() => setCms({})); }, []);
  if (!cms) return <PageLoader />;
  const f = (k) => cms[k] || "";
  const set = (k, v) => setCms((c) => ({ ...c, [k]: v }));

  const goalsText = cms.goalsText ?? (f("goals") || []).join("\n");
  const activitiesText = cms.activitiesText ?? (f("activities") || []).join("\n");
  const lines = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean).length;

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

  const fields = ["hero_badge", "hero_title", "hero_highlight", "hero_subtitle", "about", "vision", "mission"];
  const filled = fields.filter((k) => String(f(k)).trim()).length + (lines(goalsText) > 0 ? 1 : 0) + (lines(activitiesText) > 0 ? 1 : 0);
  const pct = Math.round((filled / 9) * 100);

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-3xl text-white p-5 sm:p-7" data-testid="admin-landing-hero">
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <Globe2 className="w-3.5 h-3.5" /> واجهة الموقع العامة
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">محرر صفحة الهبوط</h2>
              <p className="text-white/70 text-xs sm:text-sm mt-1.5 font-medium">حرّر نصوص الصفحة الرئيسية دون لمس الكود · تُحفظ فوراً وتنعكس على الموقع</p>
            </div>
            {/* اكتمال المحتوى */}
            <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 shrink-0 min-w-[170px]">
              <div className="flex items-center justify-between text-[11px] font-bold text-white/80 mb-2">
                <span>اكتمال المحتوى</span><span className="tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-teal-200 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-white/60 font-medium mt-2">{filled} من ٩ أقسام مكتملة</div>
            </div>
          </div>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* قسم البطل */}
          <Card title="قسم البطل · أعلى الصفحة" icon={Sparkles} hint="أول ما يراه الزائر عند فتح الموقع">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="شارة البطل"><input value={f("hero_badge")} onChange={(e) => set("hero_badge", e.target.value)} placeholder="شارة البطل (المنصة المعرفية…)" className={ta} /></Field>
              <Field label="العنوان الرئيسي"><input value={f("hero_title")} onChange={(e) => set("hero_title", e.target.value)} placeholder="العنوان الرئيسي" className={ta} /></Field>
            </div>
            <Field label="الجزء الملوّن من العنوان"><input value={f("hero_highlight")} onChange={(e) => set("hero_highlight", e.target.value)} placeholder="الجزء الملوّن من العنوان (ونصنع المستقبل)" className={ta} /></Field>
            <Field label="الفقرة التعريفية"><textarea value={f("hero_subtitle")} onChange={(e) => set("hero_subtitle", e.target.value)} placeholder="الفقرة التعريفية تحت العنوان" rows={2} className={ta} /></Field>
          </Card>

          {/* من نحن */}
          <Card title="من نحن" icon={Info}>
            <Field label="نص التعريف"><textarea value={f("about")} onChange={(e) => set("about", e.target.value)} rows={3} className={ta} /></Field>
          </Card>

          {/* الرؤية والرسالة */}
          <Card title="الرؤية والرسالة" icon={Target}>
            <Field label="رؤيتنا"><textarea value={f("vision")} onChange={(e) => set("vision", e.target.value)} rows={3} className={ta} /></Field>
            <Field label="رسالتنا"><textarea value={f("mission")} onChange={(e) => set("mission", e.target.value)} rows={3} className={ta} /></Field>
          </Card>

          {/* الأهداف والأنشطة */}
          <Card title="الأهداف والأنشطة" icon={ListChecks} hint="عنصر في كل سطر · تظهر كقوائم مرقّمة/بطاقات في الصفحة">
            <Field label={`أهدافنا · ${lines(goalsText)} هدف`}><textarea value={goalsText} onChange={(e) => set("goalsText", e.target.value)} rows={5} className={ta} placeholder="هدف في كل سطر" /></Field>
            <Field label={`أنشطتنا · ${lines(activitiesText)} نشاط`}><textarea value={activitiesText} onChange={(e) => set("activitiesText", e.target.value)} rows={3} className={ta} placeholder="نشاط في كل سطر" /></Field>
          </Card>

          <button onClick={save} disabled={saving} data-testid="admin-landing-save-btn"
            className="pressable w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold disabled:opacity-50 min-h-[50px] shadow">
            <Save className="w-4 h-4" /> {saving ? "جارٍ الحفظ…" : "حفظ صفحة الهبوط"}
          </button>
        </div>

        {/* معاينة حية لقسم البطل */}
        <div className="lg:sticky lg:top-4 min-w-0">
          <Card title="معاينة قسم البطل" icon={Eye} hint="تقريبية · حدّث الموقع بعد الحفظ لرؤية النتيجة الفعلية">
            <div className="ft-hero-gradient grain relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 text-center">
              <div className="relative">
                {String(f("hero_badge")).trim() && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> {f("hero_badge")}
                  </span>
                )}
                <div className="font-head font-black text-2xl sm:text-3xl leading-snug mt-4">
                  {f("hero_title") || "عنوان الصفحة الرئيسي"}
                  {String(f("hero_highlight")).trim() && <> <span className="text-emerald-300">{f("hero_highlight")}</span></>}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mt-3 max-w-md mx-auto">{f("hero_subtitle") || "الفقرة التعريفية ستظهر هنا…"}</p>
                <div className="flex items-center justify-center gap-2.5 mt-5">
                  <span className="rounded-xl bg-white text-slate-900 px-4 py-2.5 text-xs font-extrabold inline-flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> ابدأ الآن</span>
                  <span className="rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-extrabold">اكتشف المنصة</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Type, l: "الأقسام النصية", v: `${fields.filter((k) => String(f(k)).trim()).length}/٧` },
                { icon: Target, l: "الأهداف", v: `${lines(goalsText)}` },
                { icon: PartyPopper, l: "الأنشطة", v: `${lines(activitiesText)}` },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-slate-50 border border-slate-100 py-3 px-2">
                  <s.icon className="w-4 h-4 mx-auto text-emerald-600" />
                  <div className="font-head font-black text-slate-800 mt-1.5 leading-none tabular-nums">{s.v}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">الأقسام الطويلة (من نحن · الرؤية · الرسالة) تظهر في الصفحة مع زر «اقرأ المزيد» كما هي دون اختصار أي كلمة.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
