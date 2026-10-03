import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Send, Clock, Trash2, Pencil, Plus, BellRing, XCircle, CheckCircle2, Smartphone,
  Bell, Layers, ChevronsUpDown, Check, Users, X, Megaphone, AlertTriangle, Eye,
} from "lucide-react";

/* الإشعارات · مؤلّف البث
   نفس نقاط النهاية والإجراءات في NotifyPanel السابق:
   presets · campaigns · stats · audience-count · send · schedule · send-now
   الرابط من قائمة وجهات (أو مخصص) · المدرسة والمديرية بمنتقي بحث خادمي ·
   معاينة حية لعدد الجمهور · حوار القوالب · سجل المرسلات. */

const inputCls = "w-full text-base"; // text-base prevents iOS auto-zoom on focus

// Where a tapped notification can take the user · picked from a dropdown,
// never typed by hand.
const LINK_DESTINATIONS = [
  { path: "/", label: "الصفحة الرئيسية" },
  { path: "/dashboard", label: "لوحة التحكم" },
  { path: "/studio", label: "الاستوديو" },
  { path: "/library", label: "المكتبة" },
  { path: "/upload-book", label: "رفع كتاب" },
  { path: "/events", label: "الفعاليات" },
  { path: "/competitions", label: "المسابقات" },
  { path: "/leaderboard", label: "المتصدرون" },
  { path: "/news", label: "الأخبار" },
  { path: "/clubs", label: "الأندية" },
  { path: "/settings", label: "الإعدادات" },
];

function LinkSelect({ value, onChange }) {
  const [forceCustom, setForceCustom] = useState(false);
  const isKnown = LINK_DESTINATIONS.some((d) => d.path === value);
  const custom = forceCustom || !isKnown;
  const selValue = custom ? "__custom" : (value || "/dashboard");
  return (
    <div className="space-y-2">
      <Select
        value={selValue}
        onValueChange={(v) => {
          if (v === "__custom") setForceCustom(true);
          else { setForceCustom(false); onChange(v); }
        }}
      >
        <SelectTrigger className="text-base"><SelectValue placeholder="اختر الوجهة" /></SelectTrigger>
        <SelectContent>
          {LINK_DESTINATIONS.map((d) => (
            <SelectItem key={d.path} value={d.path}>
              {d.label} <span className="text-slate-400 text-xs" dir="ltr">{d.path}</span>
            </SelectItem>
          ))}
          <SelectItem value="__custom">✏️ رابط مخصص…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value)}
          placeholder="/مسار-داخلي أو https://…" dir="ltr" />
      )}
    </div>
  );
}

// Searchable dropdown for schools / directorates (server-side search).
function EntityPicker({ endpoint, selectedId, selectedName, onPick, onClear, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(endpoint, { params: { q: q.trim() || undefined, limit: 20 } });
        setItems(Array.isArray(data) ? data : (data.items || data.docs || []));
      } catch { setItems([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, endpoint]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button"
          className="w-full justify-between text-base min-h-[48px] font-normal rounded-xl">
          <span className="truncate">
            {selectedName || <span className="text-slate-400">{placeholder}</span>}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {selectedName && (
              <span role="button" tabIndex={0} aria-label="مسح الاختيار"
                className="p-1.5 -m-1.5 text-slate-400 hover:text-red-500"
                onClick={(e) => { e.stopPropagation(); onClear(); }}>
                <X className="w-4 h-4" />
              </span>
            )}
            <ChevronsUpDown className="w-4 h-4 text-slate-400" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="ابحث بالاسم…" value={q} onValueChange={setQ} className="text-base" />
          <CommandList>
            <CommandEmpty>{searching ? "جارٍ البحث…" : "لا توجد نتائج مطابقة"}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={item.id} onSelect={() => { onPick(item.id, item.name); setOpen(false); }}
                  className="text-sm cursor-pointer min-h-[44px]">
                  <Check className={`w-4 h-4 ml-2 shrink-0 text-emerald-600 ${item.id === selectedId ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const CHANNELS = [
  { k: "both", label: "الاثنان معاً", icon: Layers, desc: "دفع للهاتف + تنبيه داخل التطبيق" },
  { k: "push", label: "دفع للهاتف فقط", icon: Smartphone, desc: "إشعار نظام على الهاتف" },
  { k: "inapp", label: "داخل التطبيق فقط", icon: Bell, desc: "تنبيه بجرس التطبيق" },
];
const channelLabel = (k) => (CHANNELS.find((c) => c.k === k) || CHANNELS[0]).label;
const fmt = (n) => (n ?? 0).toLocaleString("en-US");

function SectionTitle({ icon: Icon, color, children, extra }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-head font-extrabold text-base text-slate-900 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl grid place-items-center text-white shrink-0" style={{ background: color }}><Icon className="w-4.5 h-4.5" /></span>
        {children}
      </h3>
      {extra}
    </div>
  );
}

export default function AdminNotify() {
  const { hasPerm } = useAuth();
  const canDeleteHistory = hasPerm("notification.delete");
  const [presets, setPresets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ push_devices: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Show the error both as a toast AND as a persistent inline banner,
  // so it stays readable on mobile even if a toast is missed.
  const fail = (e, fallback) => {
    const msg = apiErr(e, fallback);
    const code = e?.response?.status;
    setLastError(code ? `خطأ ${code}: ${msg}` : msg);
    toast.error(msg);
  };

  // compose form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [scope, setScope] = useState("all");
  const [scopeId, setScopeId] = useState("");
  const [scopeName, setScopeName] = useState("");
  const [audCount, setAudCount] = useState(null);
  const [channel, setChannel] = useState("both");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [sendAt, setSendAt] = useState("");

  // preset dialog
  const [dlg, setDlg] = useState(null); // null | {mode:'new'|'edit', preset?}
  const [pName, setPName] = useState("");
  const [pTitle, setPTitle] = useState("");
  const [pBody, setPBody] = useState("");
  const [pLink, setPLink] = useState("/dashboard");

  const load = async () => {
    try {
      const [pr, ca, st] = await Promise.all([
        api.get("/admin/notify/presets"),
        api.get("/admin/notify/campaigns"),
        api.get("/admin/notify/stats").catch(() => ({ data: {} })),
      ]);
      setPresets(pr.data.items || []);
      setCampaigns(ca.data.items || []);
      setStats({ push_devices: st.data.push_devices || 0, users: st.data.users || 0 });
    } catch (e) {
      fail(e, "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Live recipient-count preview when a specific school/directorate is picked.
  useEffect(() => {
    if (scope === "all" || !scopeId) { setAudCount(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/admin/notify/audience-count", { params: { scope, scope_id: scopeId } });
        setAudCount(data.count);
      } catch { setAudCount(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [scope, scopeId]);

  const changeScope = (v) => { setScope(v); setScopeId(""); setScopeName(""); setAudCount(null); };

  const applyPreset = (p) => {
    setTitle(p.title || "");
    setBody(p.body || "");
    setLink(p.link || "/dashboard");
    toast.success("تم تعبئة النموذج من القالب");
  };

  const openPresetDlg = (mode, preset) => {
    setDlg({ mode, preset });
    setPName(preset?.name || "");
    setPTitle(preset?.title || "");
    setPBody(preset?.body || "");
    setPLink(preset?.link || "/dashboard");
  };

  const savePreset = async () => {
    if (!pName.trim() || !pTitle.trim()) return toast.error("الاسم والعنوان مطلوبان");
    try {
      if (dlg.mode === "new") {
        await api.post("/admin/notify/presets", { name: pName.trim(), title: pTitle.trim(), body: pBody, link: pLink || "/dashboard" });
        setLastError(null); toast.success("تم إنشاء القالب");
      } else {
        await api.put(`/admin/notify/presets/${dlg.preset.id}`, { name: pName.trim(), title: pTitle.trim(), body: pBody, link: pLink || "/dashboard" });
        setLastError(null); toast.success("تم حفظ القالب");
      }
      setDlg(null);
      load();
    } catch (e) { fail(e, "تعذر حفظ القالب"); }
  };

  const deletePreset = async (p) => {
    if (!window.confirm(`حذف القالب "${p.name}"؟`)) return;
    try {
      await api.delete(`/admin/notify/presets/${p.id}`);
      setLastError(null); toast.success("تم حذف القالب");
      load();
    } catch (e) { fail(e, "تعذر الحذف"); }
  };

  const payload = () => ({
    title: title.trim(),
    body,
    link: link || "/dashboard",
    scope,
    scope_id: scopeId.trim() || null,
    channel,
  });

  const resultMsg = (data) => {
    const parts = [];
    if (data.channel !== "push") parts.push(`${data.inapp ?? data.sent} داخل التطبيق`);
    if (data.channel !== "inapp") parts.push(`${data.push ?? 0} دفع للهاتف`);
    return `تم الإرسال إلى ${data.sent} مستخدم (${parts.join(" · ")}) 🎉`;
  };

  const sendNow = async () => {
    if (!title.trim()) return toast.error("اكتب عنوان الإشعار");
    setSending(true);
    try {
      const { data } = await api.post("/admin/notify/send", payload());
      toast.success(resultMsg(data));
      setTitle(""); setBody("");
      load();
    } catch (e) { fail(e, "تعذر الإرسال"); }
    finally { setSending(false); }
  };

  const schedule = async () => {
    if (!title.trim()) return toast.error("اكتب عنوان الإشعار");
    if (!sendAt) return toast.error("حدد تاريخ ووقت الإرسال");
    const when = new Date(sendAt);
    if (isNaN(when.getTime()) || when <= new Date()) return toast.error("الموعد يجب أن يكون في المستقبل");
    setSending(true);
    try {
      await api.post("/admin/notify/schedule", { ...payload(), send_at: when.toISOString() });
      toast.success(`تمت جدولة الإشعار (${channelLabel(channel)}) ⏰`);
      setTitle(""); setBody(""); setSendAt(""); setScheduleMode(false);
      load();
    } catch (e) { fail(e, "تعذر الجدولة"); }
    finally { setSending(false); }
  };

  const cancelCampaign = async (c) => {
    if (!window.confirm("إلغاء هذا الإشعار المجدول؟")) return;
    try {
      await api.delete(`/admin/notify/campaigns/${c.id}`);
      setLastError(null); toast.success("تم الإلغاء");
      load();
    } catch (e) { fail(e, "تعذر الإلغاء"); }
  };

  const deleteFromHistory = async (c) => {
    if (!window.confirm(`حذف «${c.title}» من سجل الإشعارات نهائياً؟`)) return;
    try {
      await api.delete(`/admin/notify/campaigns/${c.id}`);
      setLastError(null); toast.success("تم الحذف من السجل");
      load();
    } catch (e) { fail(e, "تعذر الحذف"); }
  };

  const sendScheduledNow = async (c) => {
    if (!window.confirm(`إرسال "${c.title}" الآن فوراً؟`)) return;
    setSending(true);
    try {
      const { data } = await api.post(`/admin/notify/campaigns/${c.id}/send-now`);
      setLastError(null);
      toast.success(`تم إرسال الإشعار المجدول (${data.inapp ?? 0} داخل التطبيق · ${data.push ?? 0} دفع للهاتف) 🎉`);
      load();
    } catch (e) { fail(e, "تعذر الإرسال"); }
    finally { setSending(false); }
  };

  if (loading) return <div className="text-slate-500 text-sm py-10 text-center font-semibold">جارٍ التحميل…</div>;

  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  const sent = campaigns.filter((c) => c.status !== "scheduled");
  const fmtDT = (iso) => { try { return new Date(iso).toLocaleString("ar-JO", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; } };
  const isOverdue = (c) => { try { return new Date(c.send_at) <= new Date(); } catch { return false; } };
  const audienceCount = scope === "all" ? stats.users : audCount;

  return (
    <div dir="rtl" className="space-y-5">
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-head font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-emerald-600 text-white grid place-items-center"><Megaphone className="w-5 h-5" /></span>
            الإشعارات
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">بثّ إشعارات فورية أو مجدولة لكل المنصة أو لمدرسة أو مديرية بعينها.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-100 ft-shadow text-xs font-bold text-slate-600">
            <Smartphone className="w-4 h-4 text-emerald-600" /> أجهزة دفع مفعّلة: <b className="text-slate-900 tabular-nums">{fmt(stats.push_devices)}</b>
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-100 ft-shadow text-xs font-bold text-slate-600">
            <Users className="w-4 h-4 text-emerald-600" /> مستخدمون: <b className="text-slate-900 tabular-nums">{fmt(stats.users)}</b>
          </span>
        </div>
      </div>

      {lastError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex items-start justify-between gap-3">
          <span className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {lastError}</span>
          <button onClick={() => setLastError(null)} aria-label="إغلاق" className="text-rose-400 hover:text-rose-600 font-bold shrink-0 min-w-[44px] min-h-[44px] grid place-items-center -m-2"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* compose */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
        <SectionTitle icon={Send} color="#059669">إرسال إشعار</SectionTitle>

        {presets.length > 0 && (
          <div className="mb-4">
            <Label>استخدم قالباً جاهزاً</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className="pressable px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-100 min-h-[36px]">
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-5">
          <div className="grid gap-4 content-start">
            <div><Label>العنوان *</Label><Input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مسابقة جديدة بانتظاركم 🏆" /></div>
            <div><Label>النص</Label><Textarea className={inputCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل الإشعار…" /></div>

            <div>
              <Label>طريقة الإرسال</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {CHANNELS.map(({ k, label, icon: Icon, desc }) => (
                  <button key={k} type="button" onClick={() => setChannel(k)}
                    className={`rounded-2xl border p-3 min-h-[76px] flex flex-col items-center justify-center gap-1 transition-all ${channel === k ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold leading-tight">{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight hidden sm:block">{desc}</span>
                  </button>
                ))}
              </div>
              {(channel === "push" || channel === "both") && stats.push_devices === 0 && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  لا توجد أجهزة مفعّلة للدفع بعد · لن يصل إشعار الهاتف لأحد حتى يفعّل المستخدمون الإشعارات من أجهزتهم.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div><Label>الرابط عند الضغط</Label><div className="mt-1.5"><LinkSelect value={link} onChange={setLink} /></div></div>
              <div>
                <Label>الجمهور</Label>
                <Select value={scope} onValueChange={changeScope}>
                  <SelectTrigger className="text-base mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الجميع</SelectItem>
                    <SelectItem value="school">🏫 مدرسة محددة</SelectItem>
                    <SelectItem value="directorate">🗺️ مديرية محددة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope !== "all" && (
                <div>
                  <Label>{scope === "school" ? "اختر المدرسة" : "اختر المديرية"}</Label>
                  <div className="mt-1.5">
                    <EntityPicker
                      key={scope}
                      endpoint={scope === "school" ? "/geo/schools" : "/geo/directorates"}
                      selectedId={scopeId}
                      selectedName={scopeName}
                      onPick={(id, name) => { setScopeId(id); setScopeName(name); }}
                      onClear={() => { setScopeId(""); setScopeName(""); }}
                      placeholder={scope === "school" ? "ابحث عن مدرسة…" : "ابحث عن مديرية…"}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* audience preview pill */}
            <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap ${audienceCount != null ? "bg-gradient-to-l from-emerald-600 to-teal-600 text-white" : "bg-slate-50 border border-slate-100 text-slate-500"}`}
              data-testid="admin-notify-audience">
              <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${audienceCount != null ? "bg-white/15" : "bg-white border border-slate-200"}`}>
                <Users className={`w-4.5 h-4.5 ${audienceCount != null ? "text-white" : "text-slate-400"}`} />
              </span>
              <div className="flex-1 min-w-[140px]">
                <div className="text-[10px] font-bold opacity-80">سيصل الإشعار إلى</div>
                <div className="font-head font-extrabold text-sm leading-tight">
                  {audienceCount != null ? `${fmt(audienceCount)} مستخدم` : "اختر الجمهور لعرض العدد"}
                  {scopeName ? <span className="font-bold opacity-80"> · {scopeName}</span> : scope === "all" ? <span className="font-bold opacity-80"> · كل المنصة</span> : null}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/15">{channelLabel(channel)}</span>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer min-h-[44px]">
              <input type="checkbox" checked={scheduleMode} onChange={(e) => setScheduleMode(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
              جدولة الإرسال لوقت لاحق ⏰
            </label>
            {scheduleMode && (
              <div>
                <Label>تاريخ ووقت الإرسال</Label>
                <Input type="datetime-local" className={`${inputCls} mt-1.5 min-h-[48px]`} value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">بتوقيت جهازك · سيُرسل تلقائياً عند حلول الموعد.</p>
              </div>
            )}

            <div>
              {scheduleMode ? (
                <Button onClick={schedule} disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto min-h-[48px] text-base rounded-2xl px-6 font-bold">
                  <Clock className="w-4 h-4 ml-2" /> {sending ? "جارٍ…" : "جدولة الإشعار"}
                </Button>
              ) : (
                <Button onClick={sendNow} disabled={sending} data-testid="admin-notify-send" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto min-h-[48px] text-base rounded-2xl px-6 font-bold">
                  <Send className="w-4 h-4 ml-2" /> {sending ? "جارٍ الإرسال…" : "إرسال الآن"}
                </Button>
              )}
            </div>
          </div>

          {/* live phone preview */}
          <div className="content-start">
            <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> معاينة على هاتف المستخدم</div>
            <div className="mx-auto w-full max-w-[270px] rounded-[28px] border-[6px] border-slate-900 bg-slate-100 p-2.5 shadow-xl">
              <div className="rounded-[20px] bg-gradient-to-b from-slate-200 to-slate-50 px-3 pt-6 pb-4 min-h-[190px]">
                <div className="text-center text-[10px] font-bold text-slate-500 mb-3">{new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" })}</div>
                <div className="bg-white/85 backdrop-blur rounded-2xl p-3 shadow-sm border border-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white grid place-items-center shrink-0"><Bell className="w-3.5 h-3.5" /></span>
                    <span className="text-[10px] font-bold text-slate-500 flex-1">مفكرو المستقبل</span>
                    <span className="text-[9px] text-slate-400">الآن</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 leading-snug">{title.trim() || "عنوان الإشعار يظهر هنا"}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{body.trim() || "نص الإشعار يظهر هنا للمستخدم…"}</div>
                </div>
                <div className="text-center text-[9px] text-slate-400 mt-3" dir="ltr">{link || "/dashboard"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-2 gap-5 items-start">
        {/* scheduled */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
          <SectionTitle icon={Clock} color="#D97706">إشعارات مجدولة ({scheduled.length})</SectionTitle>
          {scheduled.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-semibold">لا توجد إشعارات مجدولة.</p>
          ) : (
            <div className="space-y-3">
              {scheduled.map((c) => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900">{c.title}</div>
                      {c.body && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{c.body}</div>}
                      <div className="text-xs text-amber-700 font-bold mt-1.5">⏰ {fmtDT(c.send_at)}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700 font-bold">{channelLabel(c.channel)}</span>
                        {isOverdue(c) && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">حان موعده · يُرسل الآن…</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => sendScheduledNow(c)} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px] rounded-xl font-bold flex-1">
                      <Send className="w-3.5 h-3.5 ml-1" /> إرسال الآن
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => cancelCampaign(c)} className="text-red-600 min-h-[40px] rounded-xl font-bold flex-1">
                      <XCircle className="w-3.5 h-3.5 ml-1" /> إلغاء
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* presets manager */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
          <SectionTitle icon={BellRing} color="#7C3AED" extra={
            <Button size="sm" onClick={() => openPresetDlg("new")} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px] rounded-xl font-bold">
              <Plus className="w-4 h-4 ml-1" /> قالب جديد
            </Button>
          }>القوالب الجاهزة ({presets.length})</SectionTitle>
          {presets.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center font-semibold">لا قوالب بعد · أنشئ أول قالب لتسريع إرسالاتك المتكررة.</p>
          ) : (
            <div className="space-y-2">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate">{p.title}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => applyPreset(p)} className="min-h-[40px] rounded-xl font-bold text-emerald-700">استخدام</Button>
                    <Button variant="ghost" size="sm" onClick={() => openPresetDlg("edit", p)} className="min-h-[40px] rounded-xl"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePreset(p)} className="text-red-600 min-h-[40px] rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* history */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
        <SectionTitle icon={CheckCircle2} color="#475569">سجل الإشعارات المرسلة</SectionTitle>
        {sent.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center font-semibold">لا يوجد سجل بعد.</p>
        ) : (
          <div className="relative">
            <span className="absolute top-3 bottom-3 right-[7px] w-px bg-slate-100" />
            <div className="space-y-2 max-h-96 overflow-y-auto pl-1">
              {sent.map((c) => (
                <div key={c.id} className="relative flex gap-3 pr-0">
                  <span className="relative z-10 w-[15px] h-[15px] rounded-full bg-emerald-100 border-[3px] border-emerald-500 shrink-0 mt-3" />
                  <div className="flex-1 min-w-0 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-start gap-2">
                      <div className="font-bold text-sm text-slate-900 flex-1">{c.title}</div>
                      {canDeleteHistory && (
                        <Button variant="ghost" size="sm" title="حذف من السجل"
                                onClick={() => deleteFromHistory(c)}
                                className="text-rose-400 hover:text-rose-600 shrink-0 min-h-[32px] px-2 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {c.body && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{c.body}</div>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold">{c.recipient_count ?? "·"} مستلم</span>
                      {c.inapp_count != null && c.channel !== "push" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold">{c.inapp_count} داخل التطبيق</span>}
                      {c.push_count != null && c.channel !== "inapp" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold">{c.push_count} دفع للهاتف</span>}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold">{channelLabel(c.channel)}</span>
                      {c.sent_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-400 font-bold">{fmtDT(c.sent_at)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* preset dialog */}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent dir="rtl" className="rounded-3xl">
          <DialogHeader><DialogTitle>{dlg?.mode === "new" ? "قالب جديد" : "تعديل القالب"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>اسم القالب *</Label><Input className={inputCls} value={pName} onChange={(e) => setPName(e.target.value)} placeholder="مثال: 📚 كتاب جديد" /></div>
            <div><Label>عنوان الإشعار *</Label><Input className={inputCls} value={pTitle} onChange={(e) => setPTitle(e.target.value)} /></div>
            <div><Label>النص</Label><Textarea className={inputCls} rows={3} value={pBody} onChange={(e) => setPBody(e.target.value)} /></div>
            <div><Label>الرابط</Label><div className="mt-1.5"><LinkSelect value={pLink} onChange={setPLink} /></div></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)} className="min-h-[44px] rounded-xl">إلغاء</Button>
            <Button onClick={savePreset} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl font-bold">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
