import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone, Rocket, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VENTURE_CATEGORIES, VENTURE_STATUSES, STATUS_COLORS, STATUS_RIBBON, STATUS_DOT } from "./Ventures";
import BookmarkButton from "@/components/BookmarkButton";

export default function VentureDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isStaff } = useAuth();
  const [v, setV] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updOpen, setUpdOpen] = useState(false);
  const [updForm, setUpdForm] = useState({ title: "", text: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/ventures/${id}`); setV(data); }
    catch { toast.error("المشروع غير موجود"); nav("/ventures"); }
  }, [id, nav]);
  useEffect(() => { load(); }, [load]);

  if (!v) return <Layout><PageLoader /></Layout>;
  const canManage = v.is_owner || isStaff;

  const vote = async () => {
    if (!user) { toast.info("سجّل الدخول للتصويت"); return; }
    try {
      const { data } = await api.post(`/ventures/${v.id}/vote`);
      setV({ ...v, voted: data.voted, votes_count: v.votes_count + (data.voted ? 1 : -1) });
    } catch {}
  };

  const join = async () => {
    if (!user) { toast.info("سجّل الدخول أولاً"); nav("/login"); return; }
    setBusy(true);
    try {
      await api.post(`/ventures/${v.id}/join`, { message: joinMsg.trim() });
      setJoinOpen(false); setJoinMsg("");
      toast.success("تم إرسال طلب الانضمام ✅");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر إرسال الطلب"); }
    finally { setBusy(false); }
  };

  const decide = async (uid, ok) => {
    try {
      await api.post(`/ventures/${v.id}/requests/${uid}/${ok ? "approve" : "reject"}`);
      toast.success(ok ? "تم قبول العضو 🎉" : "تم رفض الطلب");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
  };

  const leave = async () => {
    if (!window.confirm("متأكد من مغادرة الفريق؟")) return;
    try { await api.post(`/ventures/${v.id}/leave`); toast.success("غادرت الفريق"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/ventures/${v.id}`, {
        description: editForm.description?.trim() || undefined,
        category: editForm.category, looking_for: editForm.looking_for?.trim(),
        max_members: Number(editForm.max_members) || undefined,
        status: editForm.status,
      });
      setV(data); setEditOpen(false);
      toast.success("تم حفظ التعديلات");
      if (editForm.status === "completed" && v.status !== "completed") toast.success("مبروك إنجاز المشروع! 🎉 +30 نقطة");
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر الحفظ"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("حذف المشروع نهائياً؟ لا يمكن التراجع.")) return;
    try { await api.delete(`/ventures/${v.id}`); toast.success("تم حذف المشروع"); nav("/ventures"); }
    catch (e) { toast.error(e.response?.data?.detail || "تعذّر الحذف"); }
  };

  const addUpdate = async () => {
    if (updForm.title.trim().length < 3 || !updForm.text.trim()) { toast.error("أكمل عنوان ونص التحديث"); return; }
    setBusy(true);
    try {
      await api.post(`/ventures/${v.id}/updates`, { title: updForm.title.trim(), text: updForm.text.trim() });
      setUpdOpen(false); setUpdForm({ title: "", text: "" });
      toast.success("تم نشر التحديث"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر النشر"); }
    finally { setBusy(false); }
  };

  const openEdit = () => {
    setEditForm({ description: v.description, category: v.category, looking_for: v.looking_for || "", max_members: v.max_members, status: v.status });
    setEditOpen(true);
  };

  const teamPct = v.max_members ? Math.min(100, Math.round((v.team_count / v.max_members) * 100)) : 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] text-white px-6 py-9 sm:px-10 sm:py-12">
          <Rocket className="pointer-events-none absolute -left-8 -bottom-10 w-48 h-48 sm:w-72 sm:h-72 text-white/10 -rotate-12" />
          <div className="relative">
            <Link to="/ventures" className="inline-flex items-center gap-1 text-slate-200 hover:text-white text-sm font-bold mb-5 pressable">
              <ArrowRight className="w-4 h-4" /> كل المشاريع
            </Link>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full bg-white/95 font-bold border-0`}>{v.status_label}</Badge>
              <Badge variant="secondary" className="rounded-full">{v.category}</Badge>
              <BookmarkButton kind="venture" refId={v.id} title={v.title} dark />
            </div>
            <h1 className="font-head text-3xl lg:text-4xl font-extrabold leading-snug">{v.title}</h1>
            <p className="text-slate-200 mt-2 text-sm">👤 {v.owner_name}{v.school_name ? ` · 🏫 ${v.school_name}` : ""}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Users className="w-3.5 h-3.5" /> {v.team_count}/{v.max_members}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Heart className="w-3.5 h-3.5" /> {v.votes_count}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status] || "bg-white/70"}`} /> {v.status_label}
              </span>
            </div>
          </div>
          <div className={`absolute bottom-0 right-0 left-0 h-1.5 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-white/40 to-white/10"}`} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h2 className="font-head font-extrabold text-xl">عن المشروع</h2>
            <button onClick={vote}
              className={`pressable flex items-center gap-1.5 font-extrabold rounded-full px-4 py-2 transition-colors ${v.voted ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"}`}>
              <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count}
            </button>
          </div>
          <p className="mt-3 text-slate-600 leading-loose whitespace-pre-wrap">{v.description}</p>
          {v.looking_for && (
            <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-100 p-4 text-sm text-violet-900 flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"><Search className="w-4 h-4" /></span>
              <p className="leading-relaxed"><span className="font-bold">🔍 يبحث الفريق عن:</span> {v.looking_for}</p>
            </div>
          )}
          {canManage && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={openEdit} className="rounded-xl pressable"><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
              <Button variant="outline" onClick={() => setUpdOpen(true)} className="rounded-xl pressable"><Megaphone className="w-4 h-4 ml-1" /> تحديث تقدّم</Button>
              <Button variant="outline" onClick={remove} className="rounded-xl text-red-600 hover:text-red-700 hover:bg-rose-50 pressable"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-5 h-5" /></span> الفريق <span className="text-sm font-normal text-slate-400">({v.team_count}/{v.max_members})</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">{teamPct}%</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-blue-500 to-sky-400"} transition-all duration-500`} style={{ width: `${teamPct}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 pl-4 pr-1.5 py-1.5">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white shadow">{(v.owner_name || "؟").trim().charAt(0)}</span>
              <span className="text-xs font-bold text-emerald-800">👑 {v.owner_name} (صاحب المشروع)</span>
            </span>
            {(v.members || []).map((m) => (
              <span key={m.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 pl-4 pr-1.5 py-1.5">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white shadow">{(m.name || "؟").trim().charAt(0)}</span>
                <span className="text-xs font-bold text-slate-700">{m.name}</span>
              </span>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            {!user ? (
              <Button onClick={() => nav("/login")} className="rounded-xl pressable"><UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام</Button>
            ) : v.is_owner ? (
              <p className="text-sm text-slate-400">هذا مشروعك · راجع طلبات الانضمام بالأسفل 👇</p>
            ) : v.is_member ? (
              <Button variant="outline" onClick={leave} className="rounded-xl text-slate-500 pressable"><UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق</Button>
            ) : v.request_pending ? (
              <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-200 px-4 py-2 font-bold">⏳ طلبك قيد مراجعة صاحب المشروع</Badge>
            ) : v.team_count >= v.max_members ? (
              <Badge variant="outline" className="rounded-full bg-slate-100 text-slate-500 border-slate-200 px-4 py-2 font-bold">اكتمل عدد الفريق</Badge>
            ) : (
              <Button onClick={() => setJoinOpen(true)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px] pressable shadow-lg shadow-emerald-200">
                <UserPlus className="w-4 h-4 ml-1" /> اطلب الانضمام للفريق
              </Button>
            )}
          </div>
        </div>

        {v.is_owner && (v.join_requests || []).length > 0 && (
          <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-amber-200 ft-shadow p-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><UserPlus className="w-5 h-5" /></span>
              طلبات الانضمام ({v.join_requests.length})
            </h2>
            <div className="mt-4 space-y-3">
              {v.join_requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50/60 border border-amber-100 p-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow">{(r.name || "؟").trim().charAt(0)}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800">{r.name}</div>
                      {r.message && <div className="text-sm text-slate-500 mt-1 leading-relaxed">"{r.message}"</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => decide(r.id, true)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold pressable"><Check className="w-4 h-4 ml-1" /> قبول</Button>
                    <Button size="sm" onClick={() => decide(r.id, false)} className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold pressable"><X className="w-4 h-4 ml-1" /> رفض</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(v.updates || []).length > 0 && (
          <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Megaphone className="w-5 h-5" /></span> آخر التحديثات
            </h2>
            <div className="relative mt-6">
              <div className="absolute top-2 bottom-2 right-[7px] w-0.5 rounded-full bg-gradient-to-b from-emerald-300 via-emerald-200 to-transparent" />
              <div className="space-y-6">
                {v.updates.map((u, i) => (
                  <div key={i} className="relative pr-9">
                    <span className={`absolute right-0 top-1.5 w-4 h-4 rounded-full ring-4 ring-emerald-50 border-2 border-white shadow ${STATUS_DOT[v.status] || "bg-emerald-500"}`} />
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-100 p-4">
                      <div className="font-bold text-slate-800">{u.title}</div>
                      <div className="text-xs font-bold text-slate-400 mt-0.5">{u.author_name}</div>
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{u.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl font-extrabold">طلب انضمام</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>رسالة تعريفية (اختياري)</Label>
              <Textarea value={joinMsg} onChange={(e) => setJoinMsg(e.target.value)}
                placeholder="عرّف بنفسك وبما ستضيفه للفريق..." className="rounded-xl mt-1 text-base" maxLength={500} /></div>
            <Button onClick={join} disabled={busy} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px] pressable">
              {busy ? "جارٍ الإرسال..." : "أرسل الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl font-extrabold">تعديل المشروع</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={(s) => setEditForm({ ...editForm, status: s })}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{VENTURE_STATUSES.filter((s) => s.v !== "all").map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>الوصف</Label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="rounded-xl mt-1 text-base min-h-[120px]" maxLength={5000} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>التصنيف</Label>
                <Select value={editForm.category} onValueChange={(c) => setEditForm({ ...editForm, category: c })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{VENTURE_CATEGORIES.filter((c) => c !== "الكل").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>الحد الأقصى للفريق</Label>
                <Input type="number" min={2} max={20} value={editForm.max_members || 5}
                  onChange={(e) => setEditForm({ ...editForm, max_members: e.target.value })} className="rounded-xl mt-1 text-base" /></div>
            </div>
            <div><Label>من تبحث عنه؟</Label>
              <Input value={editForm.looking_for || ""} onChange={(e) => setEditForm({ ...editForm, looking_for: e.target.value })}
                className="rounded-xl mt-1 text-base" maxLength={500} /></div>
            <Button onClick={saveEdit} disabled={busy} className="w-full rounded-xl font-bold min-h-[48px] pressable">
              {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updOpen} onOpenChange={setUpdOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl font-extrabold">تحديث تقدّم <Plus className="inline w-5 h-5" /></DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان التحديث</Label>
              <Input value={updForm.title} onChange={(e) => setUpdForm({ ...updForm, title: e.target.value })}
                placeholder="مثال: أنهينا النموذج الأولي" className="rounded-xl mt-1 text-base" maxLength={120} /></div>
            <div><Label>التفاصيل</Label>
              <Textarea value={updForm.text} onChange={(e) => setUpdForm({ ...updForm, text: e.target.value })}
                placeholder="ماذا أنجز الفريق؟" className="rounded-xl mt-1 text-base" maxLength={2000} /></div>
            <Button onClick={addUpdate} disabled={busy} className="w-full rounded-xl font-bold min-h-[48px] pressable">
              {busy ? "جارٍ النشر..." : "انشر التحديث"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
