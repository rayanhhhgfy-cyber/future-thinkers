import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VENTURE_CATEGORIES, VENTURE_STATUSES, STATUS_COLORS } from "./Ventures";
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

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/ventures" className="inline-flex items-center gap-1 text-slate-300 hover:text-white text-sm mb-4">
            <ArrowRight className="w-4 h-4" /> كل المشاريع
          </Link>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge variant="outline" className={`${STATUS_COLORS[v.status]} rounded-full bg-white/90`}>{v.status_label}</Badge>
            <Badge variant="secondary" className="rounded-full">{v.category}</Badge>
            <BookmarkButton kind="venture" refId={v.id} title={v.title} dark />
          </div>
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold leading-snug">{v.title}</h1>
          <p className="text-slate-300 mt-2 text-sm">👤 {v.owner_name}{v.school_name ? ` · 🏫 ${v.school_name}` : ""}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h2 className="font-head font-bold text-xl">عن المشروع</h2>
            <button onClick={vote}
              className={`flex items-center gap-1.5 font-bold rounded-xl px-4 py-2 transition-colors ${v.voted ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500 hover:text-rose-500"}`}>
              <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count}
            </button>
          </div>
          <p className="mt-3 text-slate-600 leading-loose whitespace-pre-wrap">{v.description}</p>
          {v.looking_for && (
            <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-4 text-sm text-violet-900">
              <span className="font-bold">🔍 يبحث الفريق عن:</span> {v.looking_for}
            </div>
          )}
          {canManage && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={openEdit} className="rounded-xl"><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
              <Button variant="outline" onClick={() => setUpdOpen(true)} className="rounded-xl"><Megaphone className="w-4 h-4 ml-1" /> تحديث تقدّم</Button>
              <Button variant="outline" onClick={remove} className="rounded-xl text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow p-6">
          <h2 className="font-head font-bold text-xl flex items-center gap-2">
            <Users className="w-5 h-5" /> الفريق <span className="text-sm font-normal text-slate-400">({v.team_count}/{v.max_members})</span>
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5">👑 {v.owner_name} (صاحب المشروع)</Badge>
            {(v.members || []).map((m) => (
              <Badge key={m.id} variant="secondary" className="rounded-full px-3 py-1.5">{m.name}</Badge>
            ))}
          </div>
          <div className="mt-4">
            {!user ? (
              <Button onClick={() => nav("/login")} className="rounded-xl"><UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام</Button>
            ) : v.is_owner ? (
              <p className="text-sm text-slate-400">هذا مشروعك — راجع طلبات الانضمام بالأسفل 👇</p>
            ) : v.is_member ? (
              <Button variant="outline" onClick={leave} className="rounded-xl text-slate-500"><UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق</Button>
            ) : v.request_pending ? (
              <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 px-4 py-2">⏳ طلبك قيد مراجعة صاحب المشروع</Badge>
            ) : v.team_count >= v.max_members ? (
              <Badge variant="outline" className="rounded-full bg-slate-100 text-slate-500 px-4 py-2">اكتمل عدد الفريق</Badge>
            ) : (
              <Button onClick={() => setJoinOpen(true)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px]">
                <UserPlus className="w-4 h-4 ml-1" /> اطلب الانضمام للفريق
              </Button>
            )}
          </div>
        </div>

        {v.is_owner && (v.join_requests || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 ft-shadow p-6">
            <h2 className="font-head font-bold text-xl">طلبات الانضمام ({v.join_requests.length})</h2>
            <div className="mt-4 space-y-3">
              {v.join_requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 flex-wrap">
                  <div>
                    <div className="font-bold text-slate-800">{r.name}</div>
                    {r.message && <div className="text-sm text-slate-500 mt-1">"{r.message}"</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(r.id, true)} className="rounded-xl bg-emerald-500 hover:bg-emerald-600"><Check className="w-4 h-4 ml-1" /> قبول</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r.id, false)} className="rounded-xl"><X className="w-4 h-4 ml-1" /> رفض</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(v.updates || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 ft-shadow p-6">
            <h2 className="font-head font-bold text-xl">آخر التحديثات</h2>
            <div className="mt-4 space-y-4">
              {v.updates.map((u, i) => (
                <div key={i} className="border-r-2 border-emerald-400 pr-4">
                  <div className="font-bold text-slate-800">{u.title}</div>
                  <div className="text-sm text-slate-500">{u.author_name}</div>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{u.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl">طلب انضمام</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>رسالة تعريفية (اختياري)</Label>
              <Textarea value={joinMsg} onChange={(e) => setJoinMsg(e.target.value)}
                placeholder="عرّف بنفسك وبما ستضيفه للفريق..." className="rounded-xl mt-1 text-base" maxLength={500} /></div>
            <Button onClick={join} disabled={busy} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px]">
              {busy ? "جارٍ الإرسال..." : "أرسل الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl">تعديل المشروع</DialogTitle></DialogHeader>
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
            <Button onClick={saveEdit} disabled={busy} className="w-full rounded-xl font-bold min-h-[48px]">
              {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updOpen} onOpenChange={setUpdOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl">تحديث تقدّم <Plus className="inline w-5 h-5" /></DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان التحديث</Label>
              <Input value={updForm.title} onChange={(e) => setUpdForm({ ...updForm, title: e.target.value })}
                placeholder="مثال: أنهينا النموذج الأولي" className="rounded-xl mt-1 text-base" maxLength={120} /></div>
            <div><Label>التفاصيل</Label>
              <Textarea value={updForm.text} onChange={(e) => setUpdForm({ ...updForm, text: e.target.value })}
                placeholder="ماذا أنجز الفريق؟" className="rounded-xl mt-1 text-base" maxLength={2000} /></div>
            <Button onClick={addUpdate} disabled={busy} className="w-full rounded-xl font-bold min-h-[48px]">
              {busy ? "جارٍ النشر..." : "انشر التحديث"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
