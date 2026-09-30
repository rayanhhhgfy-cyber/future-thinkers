import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Send, Clock, Trash2, Pencil, Plus, BellRing, XCircle, CheckCircle2 } from "lucide-react";

const inputCls = "w-full";

export default function NotifyPanel() {
  const [presets, setPresets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // compose form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/dashboard");
  const [scope, setScope] = useState("all");
  const [scopeId, setScopeId] = useState("");
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
      const [pr, ca] = await Promise.all([
        api.get("/admin/notify/presets"),
        api.get("/admin/notify/campaigns"),
      ]);
      setPresets(pr.data.items || []);
      setCampaigns(ca.data.items || []);
    } catch (e) {
      toast.error(apiErr(e, "تعذر تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        toast.success("تم إنشاء القالب");
      } else {
        await api.put(`/admin/notify/presets/${dlg.preset.id}`, { name: pName.trim(), title: pTitle.trim(), body: pBody, link: pLink || "/dashboard" });
        toast.success("تم حفظ القالب");
      }
      setDlg(null);
      load();
    } catch (e) { toast.error(apiErr(e, "تعذر حفظ القالب")); }
  };

  const deletePreset = async (p) => {
    if (!window.confirm(`حذف القالب "${p.name}"؟`)) return;
    try {
      await api.delete(`/admin/notify/presets/${p.id}`);
      toast.success("تم حذف القالب");
      load();
    } catch (e) { toast.error(apiErr(e, "تعذر الحذف")); }
  };

  const payload = () => ({
    title: title.trim(),
    body,
    link: link || "/dashboard",
    scope,
    scope_id: scopeId.trim() || null,
  });

  const sendNow = async () => {
    if (!title.trim()) return toast.error("اكتب عنوان الإشعار");
    setSending(true);
    try {
      const { data } = await api.post("/admin/notify/send", payload());
      toast.success(`تم إرسال الإشعار إلى ${data.sent} مستخدم 🎉`);
      setTitle(""); setBody("");
      load();
    } catch (e) { toast.error(apiErr(e, "تعذر الإرسال")); }
    finally { setSending(false); }
  };

  const schedule = async () => {
    if (!title.trim()) return toast.error("اكتب عنوان الإشعار");
    if (!sendAt) return toast.error("حدد تاريخ ووقت الإرسال");
    const when = new Date(sendAt);
    if (isNaN(when) || when <= new Date()) return toast.error("الموعد يجب أن يكون في المستقبل");
    setSending(true);
    try {
      await api.post("/admin/notify/schedule", { ...payload(), send_at: when.toISOString() });
      toast.success("تمت جدولة الإشعار ⏰");
      setTitle(""); setBody(""); setSendAt(""); setScheduleMode(false);
      load();
    } catch (e) { toast.error(apiErr(e, "تعذر الجدولة")); }
    finally { setSending(false); }
  };

  const cancelCampaign = async (c) => {
    if (!window.confirm("إلغاء هذا الإشعار المجدول؟")) return;
    try {
      await api.delete(`/admin/notify/campaigns/${c.id}`);
      toast.success("تم الإلغاء");
      load();
    } catch (e) { toast.error(apiErr(e, "تعذر الإلغاء")); }
  };

  if (loading) return <div className="text-slate-500 text-sm">جارٍ التحميل…</div>;

  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  const sent = campaigns.filter((c) => c.status !== "scheduled");
  const fmtDT = (iso) => { try { return new Date(iso).toLocaleString("ar-JO", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; } };

  return (
    <div dir="rtl" className="space-y-6">
      {/* compose */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
        <h3 className="font-head font-bold text-lg flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-emerald-600" /> إرسال إشعار
        </h3>

        {presets.length > 0 && (
          <div className="mb-4">
            <Label>استخدم قالباً جاهزاً</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100">
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <div><Label>العنوان *</Label><Input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مسابقة جديدة بانتظاركم 🏆" /></div>
          <div><Label>النص</Label><Textarea className={inputCls} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل الإشعار…" /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>الرابط عند الضغط</Label><Input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dashboard" dir="ltr" /></div>
            <div>
              <Label>الجمهور</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الجميع</SelectItem>
                  <SelectItem value="school">مدرسة (معرّف)</SelectItem>
                  <SelectItem value="directorate">مديرية (معرّف)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope !== "all" && (
              <div><Label>معرّف {scope === "school" ? "المدرسة" : "المديرية"}</Label><Input className={inputCls} value={scopeId} onChange={(e) => setScopeId(e.target.value)} placeholder="اختياري" dir="ltr" /></div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={scheduleMode} onChange={(e) => setScheduleMode(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
            جدولة الإرسال لوقت لاحق
          </label>
          {scheduleMode && (
            <div><Label>تاريخ ووقت الإرسال</Label><Input type="datetime-local" className={inputCls} value={sendAt} onChange={(e) => setSendAt(e.target.value)} /></div>
          )}

          <div>
            {scheduleMode ? (
              <Button onClick={schedule} disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Clock className="w-4 h-4 ml-2" /> {sending ? "جارٍ…" : "جدولة الإشعار"}
              </Button>
            ) : (
              <Button onClick={sendNow} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="w-4 h-4 ml-2" /> {sending ? "جارٍ الإرسال…" : "إرسال الآن للجميع"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* scheduled */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
        <h3 className="font-head font-bold text-lg flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-500" /> إشعارات مجدولة ({scheduled.length})
        </h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-slate-400">لا توجد إشعارات مجدولة.</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900">{c.title}</div>
                  {c.body && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{c.body}</div>}
                  <div className="text-xs text-amber-700 mt-1">⏰ {fmtDT(c.send_at)}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => cancelCampaign(c)} className="text-red-600 shrink-0">
                  <XCircle className="w-4 h-4 ml-1" /> إلغاء
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* presets manager */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-head font-bold text-lg flex items-center gap-2">
            <BellRing className="w-5 h-5 text-emerald-600" /> القوالب الجاهزة ({presets.length})
          </h3>
          <Button size="sm" onClick={() => openPresetDlg("new")} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 ml-1" /> قالب جديد
          </Button>
        </div>
        <div className="space-y-2">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="min-w-0">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-xs text-slate-500 truncate">{p.title}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => applyPreset(p)}>استخدام</Button>
                <Button variant="ghost" size="sm" onClick={() => openPresetDlg("edit", p)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => deletePreset(p)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* history */}
      <section className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
        <h3 className="font-head font-bold text-lg flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-slate-500" /> سجل الإشعارات المرسلة
        </h3>
        {sent.length === 0 ? (
          <p className="text-sm text-slate-400">لا يوجد سجل بعد.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sent.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-sm text-slate-900">{c.title}</div>
                {c.body && <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{c.body}</div>}
                <div className="text-[11px] text-slate-400 mt-1">
                  {c.recipient_count ?? "—"} مستلم • {c.sent_at ? fmtDT(c.sent_at) : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* preset dialog */}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{dlg?.mode === "new" ? "قالب جديد" : "تعديل القالب"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>اسم القالب *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="مثال: 📚 كتاب جديد" /></div>
            <div><Label>عنوان الإشعار *</Label><Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} /></div>
            <div><Label>النص</Label><Textarea rows={3} value={pBody} onChange={(e) => setPBody(e.target.value)} /></div>
            <div><Label>الرابط</Label><Input value={pLink} onChange={(e) => setPLink(e.target.value)} dir="ltr" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>إلغاء</Button>
            <Button onClick={savePreset} className="bg-emerald-600 hover:bg-emerald-700 text-white">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
