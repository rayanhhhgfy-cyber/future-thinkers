import React, { useEffect, useMemo, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar, CalendarDays, Clock, MapPin, Users, Plus, PenLine, Trash2, Trophy,
  Megaphone, Sparkles, MonitorSmartphone, Building2, Globe2, Landmark, School,
  HelpCircle, FlaskConical, BookOpen, Code2, MessagesSquare, CheckCircle2,
  Timer, Send, PartyPopper,
} from "lucide-react";

/* الفعاليات والمسابقات · إعادة تصميم مكوّن content
   نفس النقاط والصلاحيات والمعرّفات: GET /events · POST /events · PATCH /events/{id} · DELETE /events/{id}
   GET /competitions · POST /competitions · PATCH /competitions/{id} · DELETE /competitions/{id}
   POST /admin/competitions/{id}/finalize · POST /admin/broadcast */

const COMP_TYPES = [
  { v: "quiz", l: "اختبار سريع", icon: HelpCircle, c: "#2563EB" },
  { v: "science", l: "علوم", icon: FlaskConical, c: "#059669" },
  { v: "reading", l: "قراءة", icon: BookOpen, c: "#D97706" },
  { v: "programming", l: "برمجة", icon: Code2, c: "#7C3AED" },
  { v: "writing", l: "كتابة", icon: PenLine, c: "#E11D48" },
  { v: "debate", l: "مناظرة", icon: MessagesSquare, c: "#0891B2" },
];
const compType = (t) => COMP_TYPES.find((x) => x.v === t) || { l: t || "مسابقة", icon: Trophy, c: "#D97706" };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function eventStatus(e) {
  const d = String(e.date || "").slice(0, 10);
  if (!d) return { l: "بدون تاريخ", cls: "bg-slate-100 text-slate-500" };
  const t = todayStr();
  if (d < t) return { l: "انتهت", cls: "bg-slate-100 text-slate-500" };
  if (d === t) return { l: "اليوم", cls: "bg-emerald-100 text-emerald-700", live: true };
  return { l: "قادمة", cls: "bg-violet-100 text-violet-700" };
}

function compStatus(c) {
  if (c.status === "completed") return { l: "مكتملة", cls: "bg-slate-900 text-white" };
  const now = Date.now();
  const s = c.start_at ? new Date(c.start_at).getTime() : null;
  const e = c.end_at ? new Date(c.end_at).getTime() : null;
  if (s && now < s) return { l: "لم تبدأ بعد", cls: "bg-sky-100 text-sky-700" };
  if (e && now > e) return { l: "انتهت", cls: "bg-slate-100 text-slate-500" };
  return { l: "جارية الآن", cls: "bg-emerald-100 text-emerald-700", live: true };
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 flex items-center gap-3.5 overflow-hidden relative">
      <span className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: color }} />
      <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}BB)` }}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-none"><Counter value={value || 0} /></div>
        <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-1 truncate">{label}{sub ? ` · ${sub}` : ""}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center">
      <span className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-lg shadow-emerald-500/25 mb-4">
        <Icon className="w-8 h-8" />
      </span>
      <div className="font-head font-extrabold text-slate-800">{title}</div>
      <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">{hint}</p>
      {action}
    </div>
  );
}

const inputCls = "rounded-xl mt-1";

export default function AdminEventsCompetitions() {
  const { hasPerm } = useAuth();
  const canEditEvent = hasPerm("event.edit");
  const canDeleteEvent = hasPerm("event.delete");
  const canEditComp = hasPerm("competition.edit");
  const canDeleteComp = hasPerm("competition.delete");
  const canFinalize = hasPerm("competition.manage");

  const [view, setView] = useState("events"); // events | competitions | broadcast
  const [events, setEvents] = useState(null);
  const [comps, setComps] = useState(null);

  const loadEvents = async () => {
    try { const { data } = await api.get("/events", { params: { limit: 60 } }); setEvents(data.items || []); }
    catch { setEvents([]); }
  };
  const loadComps = async () => {
    try { const { data } = await api.get("/competitions", { params: { limit: 60 } }); setComps(data.items || []); }
    catch { setComps([]); }
  };
  useEffect(() => { loadEvents(); loadComps(); }, []);

  const totalRegistered = useMemo(() => (events || []).reduce((s, e) => s + (e.registered_count || 0), 0), [events]);
  const totalParticipants = useMemo(() => (comps || []).reduce((s, c) => s + (c.participants_count || 0), 0), [comps]);
  const liveComps = useMemo(() => (comps || []).filter((c) => compStatus(c).live).length, [comps]);

  const views = [
    { k: "events", l: "الفعاليات", icon: CalendarDays, count: events?.length },
    { k: "competitions", l: "المسابقات", icon: Trophy, count: comps?.length },
    { k: "broadcast", l: "إعلان عام", icon: Megaphone },
  ];

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="ft-hero-gradient rounded-[28px] p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-14 left-1/3 w-52 h-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full"><Sparkles className="w-3.5 h-3.5" /> برامج المنصة</div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3">الفعاليات والمسابقات</h2>
              <p className="text-white/70 text-sm mt-1.5 max-w-lg leading-relaxed">أنشئ فعاليات ومسابقات ملهمة، تابع التسجيلات والمشاركين، وأنهِ المسابقات بمنح الشهادات للفائزين.</p>
            </div>
            <div className="flex gap-2">
              <button data-testid="admin-ec-new-event" onClick={() => setView("events")} className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-emerald-800 text-sm font-extrabold shadow-lg shadow-black/10">
                <Calendar className="w-4 h-4" /> فعالية جديدة
              </button>
              <button data-testid="admin-ec-new-comp" onClick={() => setView("competitions")} className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur text-white text-sm font-extrabold ring-1 ring-white/30">
                <Trophy className="w-4 h-4" /> مسابقة جديدة
              </button>
            </div>
          </div>
        </div>
      </FadeUp>

      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Item><StatCard icon={CalendarDays} label="فعالية منشورة" value={events?.length} color="#7C3AED" /></Item>
        <Item><StatCard icon={Users} label="تسجيل في الفعاليات" value={totalRegistered} color="#2563EB" /></Item>
        <Item><StatCard icon={Trophy} label="مسابقة منشورة" value={comps?.length} color="#D97706" sub={liveComps ? `${liveComps} جارية` : undefined} /></Item>
        <Item><StatCard icon={PartyPopper} label="مشارك في المسابقات" value={totalParticipants} color="#059669" /></Item>
      </Stagger>

      <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-100 ft-shadow p-1.5 overflow-x-auto" data-testid="admin-ec-tabs">
        {views.map((v) => (
          <button key={v.k} data-testid={`admin-ec-tab-${v.k}`} onClick={() => setView(v.k)}
            className={`flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${view === v.k ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>
            <v.icon className="w-4 h-4" /> {v.l}
            {typeof v.count === "number" && <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${view === v.k ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{v.count}</span>}
          </button>
        ))}
      </div>

      {view === "events" && (
        <EventsSection events={events} reload={loadEvents} canEdit={canEditEvent} canDelete={canDeleteEvent} />
      )}
      {view === "competitions" && (
        <CompetitionsSection comps={comps} reload={loadComps} canEdit={canEditComp} canDelete={canDeleteComp} canFinalize={canFinalize} />
      )}
      {view === "broadcast" && <BroadcastSection />}
    </div>
  );
}

/* ------------------------------- الفعاليات ------------------------------- */

function EventsSection({ events, reload, canEdit, canDelete }) {
  const [dialog, setDialog] = useState(null); // {mode:"create"} | {mode:"edit", event}
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const openCreate = () => { setDialog({ mode: "create" }); setF({ title: "", description: "", date: "", time: "", location: "", mode: "online", scope: "national", capacity: 100 }); };
  const openEdit = (e) => {
    setDialog({ mode: "edit", event: e });
    setF({ title: e.title || "", description: e.description || "", date: e.date || "", time: e.time || "", location: e.location || "", mode: e.mode || "online", scope: e.scope || "national", capacity: e.capacity || 100 });
  };

  const submitCreate = async () => {
    try { await api.post("/events", { ...f, capacity: Number(f.capacity) }); toast.success("تم إنشاء الفعالية"); setDialog(null); reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const submitEdit = async () => {
    if (!f.title.trim()) return toast.error("العنوان مطلوب");
    setSaving(true);
    try { await api.patch(`/events/${dialog.event.id}`, { ...f, capacity: Number(f.capacity) || 0 }); toast.success("تم حفظ التعديلات ✅"); setDialog(null); reload(); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (e) => {
    if (!window.confirm(`حذف فعالية "${e.title}" نهائياً؟ سيتم إلغاء تسجيلات المشاركين.`)) return;
    try { await api.delete(`/events/${e.id}`); toast.success("تم حذف الفعالية"); reload(); }
    catch (e2) { toast.error(apiErr(e2)); }
  };

  if (!events) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-violet-600" /> كل الفعاليات <span className="text-slate-400 text-sm font-bold">({events.length})</span></h3>
        <Button data-testid="admin-events-create-btn" onClick={openCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> فعالية جديدة</Button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="لا فعاليات بعد" hint="أنشئ أول فعالية لتجمع الطلاب حول تجربة ملهمة · ستظهر فوراً في صفحة الفعاليات والتقويم."
          action={<Button onClick={openCreate} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> إنشاء أول فعالية</Button>} />
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => {
            const st = eventStatus(e);
            const cap = Number(e.capacity) || 0;
            const reg = e.registered_count || 0;
            const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
            return (
              <Item key={e.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover-lift">
                <div className="h-2 ft-grad-bar" />
                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 grid place-items-center shrink-0"><Calendar className="w-5 h-5" /></span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${st.cls}`}>
                      {st.live && <span className="relative flex w-2 h-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" /></span>}
                      {st.l}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-head font-extrabold text-slate-900 leading-snug line-clamp-2">{e.title}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-400 font-semibold">
                      {(e.date || e.time) && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{e.date || ""}{e.time ? ` · ${e.time}` : ""}</div>}
                      {e.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{e.location}</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100">
                      {e.mode === "onsite" ? <Building2 className="w-3 h-3" /> : <MonitorSmartphone className="w-3 h-3" />}{e.mode === "onsite" ? "حضوري" : "عن بُعد"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100">
                      {e.scope === "school" ? <School className="w-3 h-3" /> : e.scope === "directorate" ? <Landmark className="w-3 h-3" /> : <Globe2 className="w-3 h-3" />}
                      {e.scope === "school" ? "مدرسة" : e.scope === "directorate" ? "مديرية" : "وطنية"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full"><Users className="w-3 h-3" />{reg} مشارك</span>
                  </div>
                  {cap > 0 && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1"><span>نسبة الإشغال</span><span>{pct}%</span></div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full ft-grad-bar transition-all" style={{ width: `${pct}%` }} /></div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto pt-1">
                    {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(e)} className="rounded-xl flex-1 h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                    {canDelete && <Button size="sm" variant="outline" onClick={() => del(e)} className="rounded-xl flex-1 h-10 text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog?.mode === "edit" ? "تعديل الفعالية" : "إنشاء فعالية جديدة"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>العنوان</Label>
              {dialog?.mode === "create"
                ? <Input data-testid="event-title" placeholder="عنوان الفعالية" value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className={inputCls} />
                : <Input value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className={inputCls} />}
            </div>
            <div>
              <Label>التاريخ</Label>
              {dialog?.mode === "create"
                ? <Input data-testid="event-date" type="date" value={f.date || ""} onChange={(e) => set("date")(e.target.value)} className={inputCls} />
                : <Input type="date" value={f.date || ""} onChange={(e) => set("date")(e.target.value)} className={inputCls} />}
            </div>
            <div><Label>الوقت</Label><Input placeholder="الوقت (مثال: 10:00 ص)" value={f.time || ""} onChange={(e) => set("time")(e.target.value)} className={inputCls} /></div>
            <div><Label>المكان</Label><Input placeholder="المكان" value={f.location || ""} onChange={(e) => set("location")(e.target.value)} className={inputCls} /></div>
            <div><Label>السعة</Label><Input type="number" min="0" value={f.capacity ?? ""} onChange={(e) => set("capacity")(e.target.value)} className={inputCls} /></div>
            <div>
              <Label>النمط</Label>
              <Select value={f.mode || "online"} onValueChange={set("mode")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">عن بُعد</SelectItem><SelectItem value="onsite">حضوري</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label>النطاق</Label>
              <Select value={f.scope || "national"} onValueChange={set("scope")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">وطنية</SelectItem><SelectItem value="directorate">مديرية</SelectItem><SelectItem value="school">مدرسة</SelectItem></SelectContent></Select>
            </div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea placeholder="الوصف" value={f.description || ""} onChange={(e) => set("description")(e.target.value)} className={inputCls} rows={3} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} className="rounded-xl">إلغاء</Button>
            {dialog?.mode === "create"
              ? <Button data-testid="create-event-btn" onClick={submitCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء الفعالية</Button>
              : <Button onClick={submitEdit} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- المسابقات ------------------------------- */

function CompetitionsSection({ comps, reload, canEdit, canDelete, canFinalize }) {
  const [dialog, setDialog] = useState(null); // {mode:"create"} | {mode:"edit", comp}
  const [f, setF] = useState({});
  const [qs, setQs] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const openCreate = () => {
    setDialog({ mode: "create" });
    setF({ title: "", description: "", type: "quiz", start_at: "", end_at: "", duration_minutes: 30 });
    setQs([{ text: "", options: ["", "", "", ""], correct: 0 }]);
  };
  const openEdit = (c) => {
    setDialog({ mode: "edit", comp: c });
    setF({ title: c.title || "", description: c.description || "", type: c.type || "quiz", start_at: (c.start_at || "").slice(0, 16), end_at: (c.end_at || "").slice(0, 16), duration_minutes: c.duration_minutes || 30 });
  };

  const submitCreate = async () => {
    const questions = qs.filter((q) => q.text.trim());
    try {
      await api.post("/competitions", { ...f, duration_minutes: Number(f.duration_minutes), start_at: f.start_at || new Date().toISOString(), end_at: f.end_at || new Date(Date.now() + 7 * 864e5).toISOString(), questions });
      toast.success("تم إنشاء المسابقة"); setDialog(null); reload();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const submitEdit = async () => {
    if (!f.title.trim()) return toast.error("العنوان مطلوب");
    setSaving(true);
    try {
      await api.patch(`/competitions/${dialog.comp.id}`, {
        title: f.title, description: f.description, type: f.type,
        start_at: f.start_at ? new Date(f.start_at).toISOString() : undefined,
        end_at: f.end_at ? new Date(f.end_at).toISOString() : undefined,
        duration_minutes: Number(f.duration_minutes) || 30,
      });
      toast.success("تم حفظ التعديلات ✅"); setDialog(null); reload();
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (c) => {
    if (!window.confirm(`حذف مسابقة "${c.title}" نهائياً؟ سيتم حذف المشاركات والنتائج المرتبطة.`)) return;
    try { await api.delete(`/competitions/${c.id}`); toast.success("تم حذف المسابقة"); reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const finalizeComp = async (c) => {
    if (!window.confirm(`إنهاء مسابقة "${c.title}"؟ سيحصل أفضل 3 على نقاط وشهادات تلقائياً.`)) return;
    try {
      const { data } = await api.post(`/admin/competitions/${c.id}/finalize`);
      toast.success(`اكتملت المسابقة · ${data.winners.length} فائز حصلوا على شهادات 🏆`);
      reload();
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (!comps) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> كل المسابقات <span className="text-slate-400 text-sm font-bold">({comps.length})</span></h3>
        <Button data-testid="admin-comps-create-btn" onClick={openCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> مسابقة جديدة</Button>
      </div>

      {comps.length === 0 ? (
        <EmptyState icon={Trophy} title="لا مسابقات بعد" hint="أطلق مسابقة اختبار سريعة أو تحدّي قراءة وحفّز الطلاب على المنافسة الشريفة وصدارة الترتيب."
          action={<Button onClick={openCreate} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> إنشاء أول مسابقة</Button>} />
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {comps.map((c) => {
            const st = compStatus(c);
            const meta = compType(c.type);
            const MetaIcon = meta.icon;
            return (
              <Item key={c.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover-lift">
                <div className="h-2" style={{ background: `linear-gradient(to left, ${meta.c}, ${meta.c}88)` }} />
                <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${meta.c}18`, color: meta.c }}><MetaIcon className="w-5 h-5" /></span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${st.cls}`}>
                      {st.live && <span className="relative flex w-2 h-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" /></span>}
                      {st.l}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-head font-extrabold text-slate-900 leading-snug line-clamp-2">{c.title}</div>
                    <div className="mt-2 space-y-1 text-xs text-slate-400 font-semibold">
                      {c.start_at && <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />تبدأ {String(c.start_at).slice(0, 10)}</div>}
                      {c.end_at && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />تنتهي {String(c.end_at).slice(0, 10)}</div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${meta.c}14`, color: meta.c }}>{meta.l}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full"><Users className="w-3 h-3" />{c.participants_count || 0} مشارك</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100"><Timer className="w-3 h-3" />{c.duration_minutes || 30} دقيقة</span>
                    {(c.questions || []).length > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100"><HelpCircle className="w-3 h-3" />{(c.questions || []).length} سؤال</span>}
                  </div>
                  <div className="flex gap-2 mt-auto pt-1 flex-wrap">
                    {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="rounded-xl flex-1 h-10"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                    {canDelete && <Button size="sm" variant="outline" onClick={() => del(c)} className="rounded-xl flex-1 h-10 text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
                    {canFinalize && c.status !== "completed" && (
                      <Button size="sm" onClick={() => finalizeComp(c)} className="rounded-xl flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white">إنهاء + شهادات 🏆</Button>
                    )}
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialog?.mode === "edit" ? "تعديل المسابقة" : "إنشاء مسابقة (اختبار)"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>العنوان</Label>
              {dialog?.mode === "create"
                ? <Input data-testid="comp-title" placeholder="عنوان المسابقة" value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className={inputCls} />
                : <Input value={f.title || ""} onChange={(e) => set("title")(e.target.value)} className={inputCls} />}
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={f.type || "quiz"} onValueChange={set("type")}><SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger><SelectContent>{COMP_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>المدة (دقائق)</Label><Input type="number" min="1" value={f.duration_minutes ?? ""} onChange={(e) => set("duration_minutes")(e.target.value)} className={inputCls} /></div>
            <div><Label>تبدأ</Label><Input type="datetime-local" value={f.start_at || ""} onChange={(e) => set("start_at")(e.target.value)} className={inputCls} /></div>
            <div><Label>تنتهي</Label><Input type="datetime-local" value={f.end_at || ""} onChange={(e) => set("end_at")(e.target.value)} className={inputCls} /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Textarea placeholder="الوصف" value={f.description || ""} onChange={(e) => set("description")(e.target.value)} className={inputCls} rows={3} /></div>
          </div>

          {dialog?.mode === "create" && (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-bold text-slate-700">أسئلة المسابقة <span className="text-slate-400 font-semibold">({qs.filter((q) => q.text.trim()).length})</span></div>
              {qs.map((q, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <Input data-testid={`comp-q-${i}`} placeholder={`السؤال ${i + 1}`} value={q.text} onChange={(e) => setQs((arr) => arr.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="rounded-lg mb-2 bg-white" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${q.correct === oi ? "bg-emerald-50 ring-1 ring-emerald-200" : ""}`}>
                        <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => setQs((arr) => arr.map((x, j) => (j === i ? { ...x, correct: oi } : x)))} />
                        <Input placeholder={`خيار ${oi + 1}`} value={opt} onChange={(e) => setQs((arr) => arr.map((x, j) => (j === i ? { ...x, options: x.options.map((o, k) => (k === oi ? e.target.value : o)) } : x)))} className="rounded-lg h-9 bg-white" />
                        {q.correct === oi && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setQs((a) => [...a, { text: "", options: ["", "", "", ""], correct: 0 }])} className="rounded-lg"><Plus className="w-4 h-4 ml-1" />سؤال آخر</Button>
            </div>
          )}
          {dialog?.mode === "edit" && <p className="text-xs text-slate-400 mt-3">ملاحظة: تعديل الأسئلة يتم عند إنشاء مسابقة جديدة · هنا تُعدَّل البيانات الأساسية فقط.</p>}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} className="rounded-xl">إلغاء</Button>
            {dialog?.mode === "create"
              ? <Button data-testid="create-comp-btn" onClick={submitCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء المسابقة</Button>
              : <Button onClick={submitEdit} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- إعلان عام ------------------------------- */

function BroadcastSection() {
  const [f, setF] = useState({ title: "", body: "" });
  const [sending, setSending] = useState(false);
  const submit = async () => {
    setSending(true);
    try { const { data } = await api.post("/admin/broadcast", { ...f, scope: "all" }); toast.success(`أُرسل إلى ${data.sent} مستخدم`); setF({ title: "", body: "" }); }
    catch (e) { toast.error(apiErr(e)); } finally { setSending(false); }
  };
  return (
    <FadeUp>
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-7 max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-lg shadow-blue-600/25"><Megaphone className="w-6 h-6" /></span>
          <div>
            <h3 className="font-head font-extrabold text-slate-900">إعلان عام</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">يصل كإشعار فوري إلى جميع المستخدمين في المنصة.</p>
          </div>
        </div>
        <div className="space-y-3">
          <Input placeholder="عنوان الإعلان" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl" />
          <Textarea placeholder="نص الإعلان" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl min-h-[110px]" />
        </div>
        <Button data-testid="broadcast-btn" onClick={submit} disabled={sending} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 h-11 px-6">
          <Send className="w-4 h-4 ml-1.5" />{sending ? "جارٍ الإرسال..." : "إرسال الإعلان"}
        </Button>
      </div>
    </FadeUp>
  );
}
