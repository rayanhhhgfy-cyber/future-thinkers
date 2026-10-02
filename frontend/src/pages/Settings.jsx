import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import {
  KeyRound, Eye, EyeOff, Settings as SettingsIcon, BellRing, User, Target, Shield,
  Download, Palette, Sparkles, AlertTriangle, BookOpen, Crown, Rocket, Heart, Award, Check,
} from "lucide-react";
import { isPushSupported, pushPermission, enablePush, disablePush, backendPushEnabled } from "@/lib/push";
import { COVERS, coverCls, FRAME_RING } from "@/lib/cosmetics";

const NOTIF_KINDS = [
  { k: "achievements", l: "الإنجازات والشهادات", icon: Award },
  { k: "chess", l: "الشطرنج والتحديات", icon: Crown },
  { k: "ventures", l: "المشاريع والفرق", icon: Rocket },
  { k: "books", l: "الكتب والقراءة", icon: BookOpen },
  { k: "social", l: "متابِعون جدد", icon: Heart },
];

function Toggle({ on, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} role="switch" aria-checked={!!on}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-1" : "right-1"}`} />
    </button>
  );
}

function Card({ icon: Icon, color, title, desc, children }) {
  return (
    <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-2xl grid place-items-center shrink-0" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></span>
        <h2 className="font-head font-bold text-base sm:text-lg text-slate-900">{title}</h2>
      </div>
      {desc && <p className="text-xs text-slate-500 mb-4 mr-[52px]">{desc}</p>}
      {children}
    </section>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition";

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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 relative">
          <div className="flex items-center gap-4 flex-wrap">
            {avatar ? <img src={avatar} alt="" className={`w-20 h-20 rounded-3xl object-cover ring-4 ${frameCls}`} />
              : <div className={`w-20 h-20 rounded-3xl bg-white/15 grid place-items-center text-3xl font-extrabold ring-4 ${frameCls}`}>{user.name?.[0]}</div>}
            <div className="flex-1 min-w-[200px]">
              <h1 className="font-head text-2xl sm:text-3xl font-extrabold flex items-center gap-2"><SettingsIcon className="w-6 h-6" /> إعدادات الحساب</h1>
              <p className="text-white/75 text-sm mt-1">{user.email} · {user.level_title} · المستوى {user.level}</p>
              {user.cosmetics?.title && <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-400/90 text-amber-950 text-[11px] font-extrabold">✦ {user.cosmetics.title}</span>}
            </div>
            <Link to={`/profile/${user.id}`} className="pressable px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-sm font-bold backdrop-blur">عرض ملفي</Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* profile */}
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
              className="pressable w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">
              {saving === "profile" ? "جارٍ الحفظ…" : "حفظ الملف"}
            </button>
          </div>
        </Card>

        {/* cover + cosmetics */}
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
          <Link to="/points" className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:text-violet-800">
            <Sparkles className="w-4 h-4" /> افتح متجر النقاط للإطارات والألقاب
          </Link>
        </Card>

        {/* reading goal */}
        <Card icon={Target} color="#059669" title="هدف القراءة اليومي" desc="عدد الصفحات التي تطمح لقراءتها كل يوم · يظهر تقدمه في لوحتك.">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button onClick={() => setGoal((g) => Math.max(5, g - 5))} className="w-10 h-10 rounded-xl bg-slate-100 text-lg font-bold hover:bg-slate-200">−</button>
              <span className="w-20 text-center font-head text-2xl font-extrabold text-slate-900">{goal}</span>
              <button onClick={() => setGoal((g) => Math.min(300, g + 5))} className="w-10 h-10 rounded-xl bg-slate-100 text-lg font-bold hover:bg-slate-200">+</button>
            </div>
            <span className="text-sm text-slate-500">صفحة يومياً</span>
            <button onClick={() => save("goal", { daily_goal_pages: goal }, "حُفظ هدفك اليومي 🎯")} disabled={saving === "goal"}
              className="pressable px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
              {saving === "goal" ? "…" : "حفظ الهدف"}
            </button>
          </div>
          <div className="flex gap-1.5 mt-4">
            {[10, 20, 30, 50, 100].map((n) => (
              <button key={n} onClick={() => setGoal(n)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${goal === n ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>{n}</button>
            ))}
          </div>
        </Card>

        {/* notifications */}
        <Card icon={BellRing} color="#D97706" title="الإشعارات" desc="تحكّم فيما يصلك على هاتفك وداخل المنصة.">
          <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
            <div>
              <div className="font-semibold text-sm text-slate-800">إشعارات الهاتف (Push)</div>
              <div className="text-[11px] text-slate-400">
                {!pushSupported ? "غير مدعومة على هذا المتصفح" : pushDenied ? "رُفض الإذن من المتصفح · فعّله من إعداداته" : pushOn ? "مفعّلة على هذا الجهاز" : "متوقفة على هذا الجهاز"}
              </div>
            </div>
            <Toggle on={!!pushOn} onClick={togglePush} disabled={pushBusy || !pushSupported || pushDenied || pushOn === null} />
          </div>
          {pushOn && <button onClick={testPush} disabled={pushBusy} className="mt-3 min-h-[40px] px-4 rounded-xl bg-amber-100 text-amber-800 text-sm font-bold disabled:opacity-40">🔔 إرسال إشعار اختبار</button>}
          <p className="text-[11px] text-slate-400 mt-2">على iPhone: ثبّت التطبيق على الشاشة الرئيسية أولاً لتفعيل إشعارات الهاتف.</p>
          <div className="mt-4 space-y-1">
            <div className="text-xs font-bold text-slate-400 mb-1">أنواع التنبيهات</div>
            {NOTIF_KINDS.map(({ k, l, icon: Icon }) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="w-4 h-4 text-slate-400" />{l}</span>
                <Toggle on={prefs[k] !== false} onClick={() => {
                  const updated = { ...prefs, [k]: prefs[k] === false };
                  setPrefs(updated); save("prefs", { notify_prefs: updated }, "حُفظت تفضيلات الإشعارات");
                }} />
              </div>
            ))}
          </div>
        </Card>

        {/* privacy */}
        <Card icon={Shield} color="#0891B2" title="الخصوصية" desc="ما يظهر للزوار في صفحتك الشخصية العامة.">
          {[
            { k: "show_school", l: "إظهار مدرستي ومديريتي" },
            { k: "show_activity", l: "إظهار إحصاءات نشاطي (كتب، صفحات، مشاركات)" },
          ].map(({ k, l }) => (
            <div key={k} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm font-medium text-slate-700">{l}</span>
              <Toggle on={privacy[k] !== false} onClick={() => {
                const updated = { ...privacy, [k]: privacy[k] === false };
                setPrivacy(updated); save("privacy", { privacy: updated }, "حُفظت الخصوصية");
              }} />
            </div>
          ))}
        </Card>

        {/* my data */}
        <Card icon={Download} color="#4F46E5" title="بياناتي" desc="نسخة كاملة من كل ما تملكه المنصة عنك: ملفك، نقاطك، قراءاتك، أعمالك وشهاداتك.">
          <button onClick={exportData} className="pressable px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">تنزيل بياناتي (JSON)</button>
        </Card>

        {/* password */}
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
            <button type="submit" disabled={pwSaving} data-testid="change-password-submit" className="pressable w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 transition-colors">
              {pwSaving ? "جارٍ الحفظ…" : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        </Card>

        {/* danger zone */}
        <section className="rounded-3xl p-5 sm:p-6 border-2 border-rose-100 bg-rose-50/50">
          <h2 className="font-head font-bold text-base sm:text-lg text-rose-700 flex items-center gap-2 mb-1"><AlertTriangle className="w-5 h-5" /> منطقة الخطر</h2>
          <p className="text-xs text-rose-500 mb-4">تعطيل الحساب يمنع تسجيل الدخول فوراً. تستطيع الإدارة إعادة تفعيله عند الطلب · بياناتك لا تُحذف.</p>
          {!confirmDeactivate ? (
            <button onClick={() => setConfirmDeactivate(true)} className="px-5 py-2.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-sm font-bold hover:bg-rose-100">تعطيل حسابي</button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-rose-700">متأكد؟</span>
              <button onClick={deactivate} className="pressable px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold">نعم، عطّل الحساب</button>
              <button onClick={() => setConfirmDeactivate(false)} className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold">تراجع</button>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
