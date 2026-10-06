import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import {
  KeyRound, Eye, EyeOff, Settings as SettingsIcon, BellRing, User, Target, Shield,
  Download, Palette, Sparkles, AlertTriangle, BookOpen, Crown, Rocket, Heart, Award, Check, Type, RotateCcw,
  Smartphone, Share, Zap, WifiOff, CheckCircle2, MoreVertical,
  ChevronDown,
} from "lucide-react";
import { usePwaInstall } from "@/lib/pwa";
import { APP_VERSION, CHANGELOG } from "@/lib/version";
import { FONT_SCALE_STEPS, getFontScale, applyFontScale } from "@/lib/fontscale";
import { isPushSupported, pushPermission, enablePush, disablePush, backendPushEnabled } from "@/lib/push";
import { COVERS, coverCls, FRAME_RING } from "@/lib/cosmetics";

const NOTIF_KINDS = [
  { k: "achievements", l: "الإنجازات والشهادات", icon: Award },
  { k: "chess", l: "الشطرنج والتحديات", icon: Crown },
  { k: "ventures", l: "المشاريع والفرق", icon: Rocket },
  { k: "books", l: "الكتب والقراءة", icon: BookOpen },
  { k: "social", l: "متابِعون جدد", icon: Heart },
];

function Toggle({ on, onClick, disabled, label }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} role="switch" aria-checked={!!on} aria-label={label}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 ${on ? "ft-btn-solid" : "bg-slate-300"}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-1" : "right-1"}`} />
    </button>
  );
}

function Card({ icon: Icon, color, title, desc, children }) {
  return (
    <section className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 xl:p-8 border border-slate-100 ft-shadow">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></span>
        <h2 className="font-head font-bold text-base sm:text-lg lg:text-xl text-slate-900">{title}</h2>
      </div>
      {desc && <p className="text-xs lg:text-sm text-slate-500 mb-4 mr-[52px] lg:mr-[56px]">{desc}</p>}
      {children}
    </section>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 lg:py-3 text-sm lg:text-[15px] text-slate-900 outline-none ft-focus-border-accent focus:ring-2 ft-ring-accent focus:bg-white transition";

export default function Settings() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("navy");
  const [goal, setGoal] = useState(20);
  const [prefs, setPrefs] = useState({});
  const [privacy, setPrivacy] = useState({});
  const [saving, setSaving] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pushOn, setPushOn] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [fontScale, setFontScale] = useState(() => getFontScale());
  const { standalone: isAppMode, canInstall: canInstallPwa, install: promptPwaInstall, isIos: isIosDevice, isAndroid: isAndroidDevice } = usePwaInstall();
  const [pwaBusy, setPwaBusy] = useState(false);
  const [pwaAccepted, setPwaAccepted] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const pushSupported = isPushSupported();
  const pushDenied = pushSupported && pushPermission() === "denied";

  useEffect(() => {
    if (!user) return;
    setName(user.name || ""); setBio(user.bio || ""); setAvatar(user.avatar_url || "");
    setCover(user.cover_theme || "navy"); setGoal(user.daily_goal_pages || 20);
    setPrefs(user.notify_prefs || {}); setPrivacy(user.privacy || {});
  }, [user]);

  useEffect(() => {
    if (!pushSupported) { setPushOn(false); return; }
    backendPushEnabled().then(setPushOn);
  }, []);

  // Deep link from the user menu / dashboard: /settings#settings-app
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const t = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
    return () => clearTimeout(t);
  }, []);

  const save = async (key, payload, msg) => {
    setSaving(key);
    try {
      await api.put("/auth/me", payload);
      await refresh();
      toast.success(msg || "تم الحفظ ✓");
    } catch (e) { toast.error(apiErr(e, "تعذّر الحفظ")); }
    setSaving("");
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); toast.success("أُوقفت إشعارات الهاتف على هذا الجهاز"); }
      else { await enablePush(); setPushOn(true); toast.success("فُعّلت إشعارات الهاتف 🎉"); }
    } catch (e) { toast.error(e.message || "تعذّر تغيير الإعداد"); }
    setPushBusy(false);
  };

  const testPush = async () => {
    setPushBusy(true);
    try {
      const { data } = await api.post("/push/test");
      if (data.ok) toast.success("وصلك إشعار الاختبار؟ إذاً الدفع يعمل 🎉");
      else toast.error("فشل اختبار الدفع · تأكد من تفعيل الإشعارات");
    } catch (e) { toast.error(apiErr(e, "تعذّر اختبار الدفع")); }
    setPushBusy(false);
  };

  const pickFontScale = (key) => {
    setFontScale(applyFontScale(key));
    toast.success("تم تطبيق حجم الخط على المنصة ✓");
  };

  const handlePwaInstall = async () => {
    setPwaBusy(true);
    try {
      const choice = await promptPwaInstall();
      if (choice?.outcome === "accepted") {
        setPwaAccepted(true);
        toast.success("تم قبول التثبيت 🎉 افتح التطبيق من الشاشة الرئيسية");
      }
    } finally { setPwaBusy(false); }
  };

  const exportData = async () => {
    try {
      const { data } = await api.get("/auth/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "future-thinkers-my-data.json"; a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل بياناتك 📦");
    } catch { toast.error("تعذّر تصدير البيانات"); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (next.length < 6) return toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
    if (next !== confirm) return toast.error("تأكيد كلمة المرور غير متطابق");
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) { toast.error(apiErr(err, "تعذر تغيير كلمة المرور")); }
    setPwSaving(false);
  };

  const deactivate = async () => {
    try {
      await api.post("/auth/me/deactivate");
      toast.success("تم تعطيل الحساب. نراك قريباً 👋");
      window.location.href = "/";
    } catch { toast.error("تعذّر تعطيل الحساب"); }
  };

  if (!user) return <Layout><div className="py-20 text-center text-slate-400">جارٍ التحميل…</div></Layout>;
  const frameCls = FRAME_RING[user.cosmetics?.frame] || "ring-white/25";

  return (
    <Layout>
      {/* hero */}
      <div className={`relative overflow-hidden bg-gradient-to-l ${coverCls(cover)} text-white`}>
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="max-w-3xl lg:max-w-5xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-10 lg:py-14 relative">
          <div className="flex items-center gap-4 lg:gap-5 flex-wrap">
            {avatar ? <img src={avatar} alt="" className={`w-20 h-20 lg:w-24 lg:h-24 rounded-3xl object-cover ring-4 ${frameCls}`} />
              : <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-white/15 grid place-items-center text-3xl lg:text-4xl font-extrabold ring-4 ${frameCls}`}>{user.name?.[0]}</div>}
            <div className="flex-1 min-w-[200px]">
              <h1 className="font-head text-2xl sm:text-3xl lg:text-4xl font-extrabold flex items-center gap-2"><SettingsIcon className="w-6 h-6 lg:w-8 lg:h-8" /> إعدادات الحساب</h1>
              <p className="text-white/75 text-sm lg:text-base mt-1">{user.email} · {user.level_title} · المستوى {user.level}</p>
              {user.cosmetics?.title && <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-400/90 text-amber-950 text-[11px] font-extrabold">✦ {user.cosmetics.title}</span>}
            </div>
            <Link to={`/profile/${user.id}`} className="pressable inline-flex items-center px-4 py-2 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 text-sm font-bold backdrop-blur">عرض ملفي</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl lg:max-w-5xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 lg:py-12 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start">
        {/* desktop sticky nav rail · تنقّل سريع بين أقسام الإعدادات · مخفي على الجوال حتى لا تتغيّر تجربة الجوال */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <nav className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
            <div className="px-3 pt-2 pb-3 text-xs font-black text-slate-400">أقسام الإعدادات</div>
            <div className="space-y-1">
              <a href="#settings-profile" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><User className="w-4 h-4 text-slate-400" />الملف الشخصي</a>
              <a href="#settings-appearance" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Palette className="w-4 h-4 text-slate-400" />غلاف الملف والإطارات</a>
              <a href="#settings-goal" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Target className="w-4 h-4 text-slate-400" />هدف القراءة اليومي</a>
              <a href="#settings-display" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Type className="w-4 h-4 text-slate-400" />حجم الخط</a>
              {!isAppMode && <a href="#settings-app" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Smartphone className="w-4 h-4 text-slate-400" />تثبيت التطبيق</a>}
              <a href="#settings-notifications" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><BellRing className="w-4 h-4 text-slate-400" />الإشعارات</a>
              <a href="#settings-privacy" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Shield className="w-4 h-4 text-slate-400" />الخصوصية</a>
              <a href="#settings-data" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><Download className="w-4 h-4 text-slate-400" />بياناتي</a>
              <a href="#settings-password" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"><KeyRound className="w-4 h-4 text-slate-400" />تغيير كلمة المرور</a>
              <a href="#settings-danger" className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"><AlertTriangle className="w-4 h-4" />منطقة الخطر</a>
            </div>
          </nav>
          <div className="mt-4 rounded-3xl ft-bg-soft border border-slate-100 p-5">
            <div className="flex items-center gap-2 font-head font-bold text-sm ft-text-accent"><Sparkles className="w-4 h-4" /> تلميح سريع</div>
            <p className="text-xs leading-6 text-slate-500 mt-2">تغييرات ملفك وغلافك تظهر فوراً في صفحتك العامة · جرّب زر «عرض ملفي» في الأعلى لرؤية النتيجة.</p>
          </div>
        </aside>

        <div className="space-y-5 lg:space-y-6 min-w-0">
        {/* profile */}
        <div id="settings-profile" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={User} color="#2563EB" title="الملف الشخصي" desc="الاسم والنبذة والصورة التي تظهر للجميع في ملفك العام.">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={60} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">نبذة عنك</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} rows={2} maxLength={240} placeholder="طالب شغوف بالقراءة والشطرنج…" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">رابط الصورة الشخصية</label>
              <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className={inputCls} dir="ltr" placeholder="https://…" />
            </div>
            <button onClick={() => save("profile", { name, bio, avatar_url: avatar }, "حُفظ ملفك الشخصي ✓")} disabled={saving === "profile"}
              className="pressable w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
              {saving === "profile" ? "جارٍ الحفظ…" : "حفظ الملف"}
            </button>
          </div>
        </Card>
        </div>

        {/* cover + cosmetics */}
        <div id="settings-appearance" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Palette} color="#7C3AED" title="غلاف الملف والإطارات" desc="اختر لون غلاف صفحتك الشخصية · واشترِ إطارات وألقاباً من متجر النقاط.">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {COVERS.map((c) => (
              <button key={c.key} onClick={() => { setCover(c.key); save("cover", { cover_theme: c.key }, "حُفظ لون الغلاف 🎨"); }}
                className={`relative h-14 rounded-2xl bg-gradient-to-l ${c.cls} transition-all ${cover === c.key ? "ring-4 ring-violet-400 scale-[1.03]" : "hover:scale-[1.02]"}`} aria-label={c.name}>
                {cover === c.key && <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />}
                <span className="absolute bottom-1 right-2 text-[10px] font-bold text-white/90">{c.name}</span>
              </button>
            ))}
          </div>
          <Link to="/points" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-violet-700 hover:text-violet-800">
            <Sparkles className="w-4 h-4" /> افتح متجر النقاط للإطارات والألقاب
          </Link>
        </Card>
        </div>

        {/* reading goal */}
        <div id="settings-goal" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Target} color="#059669" title="هدف القراءة اليومي" desc="عدد الصفحات التي تطمح لقراءتها كل يوم · يظهر تقدمه في لوحتك.">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setGoal((g) => Math.max(5, g - 5))} className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-100 text-lg font-bold hover:bg-slate-200">−</button>
              <span className="w-20 text-center font-head text-2xl lg:text-3xl font-extrabold text-slate-900">{goal}</span>
              <button onClick={() => setGoal((g) => Math.min(300, g + 5))} className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-100 text-lg font-bold hover:bg-slate-200">+</button>
            </div>
            <span className="text-sm text-slate-500">صفحة يومياً</span>
            <button onClick={() => save("goal", { daily_goal_pages: goal }, "حُفظ هدفك اليومي 🎯")} disabled={saving === "goal"}
              className="pressable px-5 py-2.5 min-h-[44px] rounded-xl ft-btn-solid text-sm font-bold disabled:opacity-50">
              {saving === "goal" ? "…" : "حفظ الهدف"}
            </button>
          </div>
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {[10, 20, 30, 50, 100].map((n) => (
              <button key={n} onClick={() => setGoal(n)} className={`px-3 py-1.5 min-h-[40px] lg:px-4 rounded-full text-xs lg:text-sm font-bold ${goal === n ? "ft-btn-solid" : "bg-slate-100 text-slate-600 ft-hover-bg-soft"}`}>{n}</button>
            ))}
          </div>
        </Card>
        </div>

        {/* font size */}
        <div id="settings-display" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Type} color="#DB2777" title="حجم الخط" desc="كبّر أو صغّر نصوص المنصة كلها لتصبح القراءة أريح لعينيك · يُطبّق فوراً ويُحفظ على هذا الجهاز.">
          <div className="grid grid-cols-4 gap-2 mb-4" role="radiogroup" aria-label="حجم الخط">
            {FONT_SCALE_STEPS.map((s) => (
              <button key={s.key} type="button" role="radio" aria-checked={fontScale === s.key} onClick={() => pickFontScale(s.key)}
                className={`relative flex flex-col items-center justify-center gap-1 min-h-[76px] rounded-2xl border transition-all ${fontScale === s.key ? "border-pink-400 bg-pink-50 ring-2 ring-pink-200" : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"}`}>
                <span className={`font-head font-extrabold text-slate-800 leading-none ${s.glyphCls}`}>{s.glyph}</span>
                <span className="text-[11px] font-bold text-slate-500">{s.label}</span>
                {fontScale === s.key && <Check className="w-3.5 h-3.5 text-pink-600 absolute top-2 left-2" />}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3.5 mb-4">
            <div className="font-head font-bold text-slate-800">هكذا تبدو نصوص المنصة</div>
            <p className="text-sm text-slate-500 leading-relaxed">القراءة اليومية تصنع عقلاً أقوى · جرّب الأحجام واختر ما يريح عينك أثناء تصفّح الكتب والمشاريع.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => pickFontScale(FONT_SCALE_STEPS[Math.max(0, FONT_SCALE_STEPS.findIndex((s) => s.key === fontScale) - 1)].key)}
              className="pressable inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-slate-100 text-slate-700 text-sm font-extrabold hover:bg-slate-200">A− تصغير</button>
            <button onClick={() => pickFontScale(FONT_SCALE_STEPS[Math.min(FONT_SCALE_STEPS.length - 1, FONT_SCALE_STEPS.findIndex((s) => s.key === fontScale) + 1)].key)}
              className="pressable inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-slate-100 text-slate-700 text-sm font-extrabold hover:bg-slate-200">A+ تكبير</button>
            {fontScale !== "m" && (
              <button onClick={() => pickFontScale("m")} className="pressable inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-pink-700 text-sm font-bold hover:bg-pink-50">
                <RotateCcw className="w-4 h-4" /> إعادة تعيين
              </button>
            )}
          </div>
        </Card>
        </div>

        {/* install app · يختفي كلياً عند فتح الموقع من التطبيق المثبّت */}
        {!isAppMode && (
        <div id="settings-app" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Smartphone} color="#059669" title="تثبيت التطبيق" desc="ثبّت «مفكري المستقبل» على شاشتك الرئيسية · يفتح أسرع، تصلك الإشعارات، ويعمل حتى مع اتصال ضعيف.">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-emerald-100 bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 sm:p-6">
            <div className="pointer-events-none absolute -top-14 -left-14 w-44 h-44 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-10 w-48 h-48 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <img src="/icons/icon-192.png" alt="" className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[1.2rem] shadow-2xl ring-1 ring-white/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-head font-extrabold text-lg sm:text-xl leading-tight">مفكرو المستقبل</div>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed mt-1">التطبيق على جهازك · بلا متجر وبلا تحميل طويل</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-bold"><Zap className="w-3 h-3" /> فتح فوري</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-bold"><BellRing className="w-3 h-3" /> إشعارات الهاتف</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur px-2.5 py-1 text-[11px] font-bold"><WifiOff className="w-3 h-3" /> يعمل بمرونة</span>
                </div>
              </div>
            </div>
            <div className="relative mt-5">
              {pwaAccepted ? (
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur px-4 py-3.5">
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-200" />
                  <p className="text-sm font-bold leading-relaxed">تم قبول التثبيت ✓ أغلق المتصفح وافتح «مفكرو المستقبل» من الشاشة الرئيسية · سيختفي هذا الخيار تلقائياً داخل التطبيق.</p>
                </div>
              ) : canInstallPwa ? (
                <button onClick={handlePwaInstall} disabled={pwaBusy} data-testid="settings-pwa-install"
                  className="pressable w-full min-h-[52px] rounded-2xl bg-white text-emerald-800 font-head font-extrabold text-base shadow-xl hover:bg-emerald-50 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition">
                  <Download className="w-5 h-5" /> {pwaBusy ? "جارٍ فتح نافذة التثبيت…" : "تثبيت التطبيق الآن"}
                </button>
              ) : isIosDevice ? (
                <div className="rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur px-4 py-4">
                  <p className="text-sm font-extrabold mb-2.5">على iPhone أو iPad · ثلاث خطوات:</p>
                  <ol className="space-y-2 text-[13px] font-semibold text-white/90 list-none">
                    <li className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-lg bg-white/20 grid place-items-center shrink-0 text-[11px] font-black">1</span><Share className="w-4 h-4 shrink-0" /> اضغط زر «مشاركة» في شريط Safari</li>
                    <li className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-lg bg-white/20 grid place-items-center shrink-0 text-[11px] font-black">2</span> اختر «إضافة إلى الشاشة الرئيسية»</li>
                    <li className="flex items-center gap-2.5"><span className="w-6 h-6 rounded-lg bg-white/20 grid place-items-center shrink-0 text-[11px] font-black">3</span> اضغط «إضافة» · ثم افتح التطبيق من الشاشة الرئيسية</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur px-4 py-4">
                  <p className="text-sm font-bold leading-relaxed flex items-start gap-2">
                    <MoreVertical className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>افتح قائمة المتصفح <b>(⋮)</b> ثم اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>{isAndroidDevice ? "" : ""} · بعد التثبيت افتح الموقع من أيقونة التطبيق وسيختفي هذا الخيار تلقائياً.</span>
                  </p>
                </div>
              )}
            </div>

          </div>
        </Card>
        </div>
        )}

        {/* notifications */}
        <div id="settings-notifications" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={BellRing} color="#D97706" title="الإشعارات" desc="تحكّم فيما يصلك على هاتفك وداخل المنصة.">
          <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
            <div>
              <div className="font-semibold text-sm text-slate-800">إشعارات الهاتف (Push)</div>
              <div className="text-[11px] text-slate-400">
                {!pushSupported ? "غير مدعومة على هذا المتصفح" : pushDenied ? "رُفض الإذن من المتصفح · فعّله من إعداداته" : pushOn ? "مفعّلة على هذا الجهاز" : "متوقفة على هذا الجهاز"}
              </div>
            </div>
            <Toggle label="إشعارات الهاتف (Push)" on={!!pushOn} onClick={togglePush} disabled={pushBusy || !pushSupported || pushDenied || pushOn === null} />
          </div>
          {pushOn && <button onClick={testPush} disabled={pushBusy} className="mt-3 min-h-[44px] px-4 rounded-xl bg-amber-100 text-amber-800 text-sm font-bold disabled:opacity-40">🔔 إرسال إشعار اختبار</button>}
          <p className="text-[11px] text-slate-400 mt-2">على iPhone: ثبّت التطبيق على الشاشة الرئيسية أولاً لتفعيل إشعارات الهاتف.</p>
          <div className="mt-4 space-y-1">
            <div className="text-xs font-bold text-slate-400 mb-1">أنواع التنبيهات</div>
            {NOTIF_KINDS.map(({ k, l, icon: Icon }) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="w-4 h-4 text-slate-400" />{l}</span>
                <Toggle label={l} on={prefs[k] !== false} onClick={() => {
                  const updated = { ...prefs, [k]: prefs[k] === false };
                  setPrefs(updated); save("prefs", { notify_prefs: updated }, "حُفظت تفضيلات الإشعارات");
                }} />
              </div>
            ))}
          </div>
        </Card>
        </div>

        {/* privacy */}
        <div id="settings-privacy" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Shield} color="#0891B2" title="الخصوصية" desc="ما يظهر للزوار في صفحتك الشخصية العامة.">
          {[
            { k: "show_school", l: "إظهار مدرستي ومديريتي" },
            { k: "show_activity", l: "إظهار إحصاءات نشاطي (كتب، صفحات، مشاركات)" },
          ].map(({ k, l }) => (
            <div key={k} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm font-medium text-slate-700">{l}</span>
              <Toggle label={l} on={privacy[k] !== false} onClick={() => {
                const updated = { ...privacy, [k]: privacy[k] === false };
                setPrivacy(updated); save("privacy", { privacy: updated }, "حُفظت الخصوصية");
              }} />
            </div>
          ))}
        </Card>
        </div>

        {/* my data */}
        <div id="settings-data" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={Download} color="#4F46E5" title="بياناتي" desc="نسخة كاملة من كل ما تملكه المنصة عنك: ملفك، نقاطك، قراءاتك، أعمالك وشهاداتك.">
          <button onClick={exportData} className="pressable inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-bold">تنزيل بياناتي (JSON)</button>
        </Card>
        </div>

        {/* password */}
        <div id="settings-password" className="scroll-mt-24 lg:scroll-mt-28">
        <Card icon={KeyRound} color="#0A192F" title="تغيير كلمة المرور" desc={user?.email ? `الحساب: ${user.email}` : ""}>
          <form onSubmit={submitPassword} className="space-y-3" data-testid="change-password-form">
            <div className="relative">
              <input type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} required placeholder="كلمة المرور الحالية" autoComplete="current-password" data-testid="current-password" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label="إظهار/إخفاء" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} required minLength={6} placeholder="كلمة المرور الجديدة" autoComplete="new-password" data-testid="new-password" />
            <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} required minLength={6} placeholder="تأكيد كلمة المرور الجديدة" autoComplete="new-password" data-testid="confirm-password" />
            <button type="submit" disabled={pwSaving} data-testid="change-password-submit" className="pressable w-full min-h-[44px] rounded-xl ft-btn-solid disabled:opacity-50 font-bold py-2.5 transition-colors">
              {pwSaving ? "جارٍ الحفظ…" : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        </Card>
        </div>

        {/* danger zone */}
        <div id="settings-danger" className="scroll-mt-24 lg:scroll-mt-28">
        <section className="rounded-3xl p-5 sm:p-6 lg:p-7 border-2 border-rose-100 bg-rose-50/50">
          <h2 className="font-head font-bold text-base sm:text-lg lg:text-xl text-rose-700 flex items-center gap-2 mb-1"><AlertTriangle className="w-5 h-5" /> منطقة الخطر</h2>
          <p className="text-xs lg:text-sm text-rose-500 mb-4">تعطيل الحساب يمنع تسجيل الدخول فوراً. تستطيع الإدارة إعادة تفعيله عند الطلب · بياناتك لا تُحذف.</p>
          {!confirmDeactivate ? (
            <button onClick={() => setConfirmDeactivate(true)} className="inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-xl bg-white border border-rose-300 text-rose-700 text-sm font-bold hover:bg-rose-100">تعطيل حسابي</button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-rose-700">متأكد؟</span>
              <button onClick={deactivate} className="pressable inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-bold">نعم، عطّل الحساب</button>
              <button onClick={() => setConfirmDeactivate(false)} className="inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold">تراجع</button>
            </div>
          )}
        </section>
        </div>

        {/* version + what's new */}
        <div className="text-center pt-1 pb-2" data-testid="settings-version-line">
          <div className="text-xs font-bold text-slate-400">مفكرو المستقبل · إصدار التطبيق <span dir="ltr">{APP_VERSION}</span></div>
          <button onClick={() => setShowWhatsNew((v) => !v)} aria-expanded={showWhatsNew}
            className="pressable inline-flex items-center gap-1 mt-1.5 text-xs font-extrabold ft-text-accent min-h-[36px] px-3">
            ما الجديد؟ <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhatsNew ? "rotate-180" : ""}`} />
          </button>
          {showWhatsNew && (
            <div className="mt-3 text-start bg-white rounded-3xl border border-slate-100 ft-shadow p-5 space-y-4">
              {CHANGELOG.map((rel) => (
                <div key={rel.version}>
                  <div className="font-head font-extrabold text-sm text-slate-800">إصدار <span dir="ltr">{rel.version}</span></div>
                  <ul className="mt-1.5 space-y-1">
                    {rel.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-slate-500 leading-relaxed"><Check className="w-3.5 h-3.5 mt-1 shrink-0 text-emerald-500" />{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
}
