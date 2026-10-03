import React, { useEffect, useRef, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { Award, Search, Save, ShieldCheck, X, CheckCircle2, Trash2, Users, FileBadge2, Palette } from "lucide-react";

/* الشهادات · المنح الفردي والجماعي وقالب الشهادة الرسمي وسجل الممنوحة
   نفس نقاط النهاية:
   GET /certificates/admin/template · PUT /certificates/admin/template
   GET /certificates/admin/awarded · DELETE /certificates/admin/awarded/{id}
   POST /certificates/admin/award · POST /certificates/admin/award-bulk
   بحث الطلاب: GET /admin/users?q= */

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:bg-white transition min-h-[44px]";
const HEX6 = /^#[0-9a-fA-F]{6}$/;

function EmptyState({ t }) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 grid place-items-center mb-3"><Award className="w-7 h-7 text-amber-300" /></div>
      <div className="font-bold text-slate-600 text-sm">{t}</div>
    </div>
  );
}

export default function AdminCertificates() {
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
  const withCode = (awarded || []).filter((c) => c.code).length;
  const lastAward = (awarded || []).reduce((acc, c) => (String(c.created_at || "") > acc ? String(c.created_at || "") : acc), "");

  const stats = [
    { l: "شهادة ممنوحة", v: awarded?.length || 0, icon: Award, cls: "bg-amber-500" },
    { l: "برمز تحقق", v: withCode, icon: ShieldCheck, cls: "bg-emerald-500" },
    { l: "وضع المنح", v: null, text: mode === "bulk" ? `جماعي · ${selUsers.length}/٥٠` : "فردي", icon: Users, cls: "bg-sky-500" },
    { l: "آخر منح", v: null, text: lastAward ? lastAward.slice(0, 10) : "·", icon: FileBadge2, cls: "bg-violet-500" },
  ];

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-gradient-to-l from-amber-500 via-yellow-600 to-amber-700" data-testid="admin-certificates-hero">
          <Award className="absolute -left-4 -bottom-6 w-36 h-36 text-white/10 rotate-12 pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <FileBadge2 className="w-3.5 h-3.5" /> المنح والقالب والسجل
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">الشهادات</h2>
              <p className="text-white/80 text-xs sm:text-sm mt-1.5 font-medium">امنح شهادات للطلاب · صمّم قالب الشهادة الرسمي بألوانك · راجع كل الشهادات الممنوحة · لكل شهادة رمز تحقق فريد يظهر عليها</p>
            </div>
            <div className="text-left shrink-0">
              <div className="font-head font-black text-3xl sm:text-4xl leading-none tabular-nums">{(awarded?.length || 0).toLocaleString("en-US")}</div>
              <div className="text-[11px] text-white/80 mt-1 font-medium">شهادة ممنوحة</div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* شريط إحصائيات */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Item key={s.l} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
            <span className={`w-10 h-10 rounded-2xl ${s.cls} text-white grid place-items-center mb-2.5 shadow`}><s.icon className="w-5 h-5" /></span>
            <span className="block font-head font-black text-2xl text-slate-900 leading-none tabular-nums">{s.v !== null ? s.v.toLocaleString("en-US") : s.text}</span>
            <span className="block text-[11px] font-bold text-slate-400 mt-1.5">{s.l}</span>
          </Item>
        ))}
      </Stagger>

      {/* منح شهادة */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
        <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Award className="w-4 h-4" /></span>
          منح شهادة جديدة
        </h3>
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button onClick={() => switchMode("single")} className={`pressable rounded-xl px-4 py-2 text-xs font-extrabold min-h-[40px] transition ${mode === "single" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}>فردي</button>
            <button onClick={() => switchMode("bulk")} className={`pressable rounded-xl px-4 py-2 text-xs font-extrabold min-h-[40px] transition ${mode === "bulk" ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}>
              جماعي{selUsers.length > 0 ? ` · ${selUsers.length}` : ""}
            </button>
          </div>
          {mode === "bulk" && <span className="text-[11px] text-slate-400 font-medium">ابحث وأضف حتى ٥٠ طالباً · تُمنح الشهادة نفسها للجميع دفعة واحدة</span>}
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
                  <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..."
                    className={`${inputCls} pr-10`} />
                </div>
                {results.length > 0 && (
                  <div className="absolute z-20 right-0 left-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {results.map((u) => {
                      const picked = mode === "bulk" && selUsers.some((x) => x.id === u.id);
                      return (
                        <button key={u.id} onClick={() => pickUser(u)}
                          className="pressable w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-amber-50/60 text-right transition-colors min-h-[52px]">
                          <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 grid place-items-center font-black shrink-0">{(u.name || "؟").charAt(0)}</span>
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
                {q.trim().length >= 2 && results.length === 0 && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">اكتب حرفين على الأقل وانتظر نتائج البحث</p>}
                {mode === "bulk" && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">المحددون: {selUsers.length} من ٥٠ كحد أقصى · اختر طالباً من النتائج لإضافته</p>}
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
          className="pressable mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-sm font-extrabold min-h-[48px] disabled:opacity-50 w-full sm:w-auto shadow">
          <Award className="w-4 h-4" /> {busy === "award" ? "جارٍ المنح..." : mode === "bulk" ? `منح جماعي${selUsers.length ? ` · ${selUsers.length} طالب` : ""}` : "منح الشهادة"}
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
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
          <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Palette className="w-4 h-4" /></span>
            قالب الشهادة الرسمي
          </h3>
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
                className="pressable mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 text-sm font-extrabold min-h-[48px] disabled:opacity-50 w-full sm:w-auto shadow">
                <Save className="w-4 h-4" /> {busy === "tpl" ? "جارٍ الحفظ..." : "حفظ القالب"}
              </button>
            </>
          )}
        </div>

        {/* معاينة حية تحاكي الـ PDF */}
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6 lg:sticky lg:top-4">
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
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-medium">المعاينة تقريبية لأغراض التصميم · ملف الـ PDF النهائي يُرسم بنفس الألوان والنصوص عند تحميل الطالب لشهادته.</p>
        </div>
      </div>

      {/* سجل الشهادات الممنوحة */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
        <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><FileBadge2 className="w-4 h-4" /></span>
          الشهادات الممنوحة ({awarded?.length || 0})
        </h3>
        {!awarded ? <PageLoader /> : awarded.length === 0 ? <EmptyState t="لا شهادات ممنوحة بعد · امنح أول شهادة من الأعلى 🏅" /> : (
          <div className="space-y-2.5">
            {awarded.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-l from-amber-50/70 to-white px-3.5 py-3 flex-wrap" data-testid={`admin-cert-row-${c.id}`}>
                <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center shrink-0 shadow">
                  <Award className="w-5 h-5" />
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
                  data-testid={`admin-cert-delete-${c.id}`}
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
