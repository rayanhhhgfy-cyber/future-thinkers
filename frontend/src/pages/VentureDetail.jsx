import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone, Rocket, Search, Info, CalendarDays, Loader2, Code, Briefcase, FlaskConical, Leaf, BookOpen, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VENTURE_CATEGORIES, VENTURE_STATUSES, STATUS_COLORS, STATUS_RIBBON, STATUS_DOT } from "./Ventures";
import BookmarkButton from "@/components/BookmarkButton";
import { ErrorState } from "@/components/ErrorState";

const CATEGORY_ICONS = {
  "تقنية وبرمجة": Code,
  "ريادة أعمال": Briefcase,
  "علمي": FlaskConical,
  "مجتمعي": Users,
  "بيئي": Leaf,
  "ثقافي وأدبي": BookOpen,
  "فني وإعلامي": Palette,
};

export default function VentureDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isStaff } = useAuth();
  const [v, setV] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // null | "leave" | "delete"
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updOpen, setUpdOpen] = useState(false);
  const [updForm, setUpdForm] = useState({ title: "", text: "" });
  const [busyKey, setBusyKey] = useState("");
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try { const { data } = await api.get(`/ventures/${id}`); setV(data); }
    catch (e) { setLoadError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!v) {
    if (loadError) {
      return (
        <Layout>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <ErrorState error={loadError} message="تعذّر تحميل هذا المشروع" onRetry={load} context="venture-detail-load" />
            <div className="mt-5 flex justify-center">
              <Button onClick={() => nav("/ventures")} className="rounded-2xl ft-btn-primary font-extrabold min-h-[48px] px-6 pressable shadow-lg">
                <ArrowRight className="w-4 h-4 ml-1.5" /> كل المشاريع
              </Button>
            </div>
          </div>
        </Layout>
      );
    }
    return <Layout><PageLoader /></Layout>;
  }
  const canManage = v.is_owner || isStaff;

  const vote = async () => {
    if (!user) { toast.info("سجّل الدخول للتصويت"); return; }
    if (voting) return;
    setVoting(true);
    try {
      const { data } = await api.post(`/ventures/${v.id}/vote`);
      setV({ ...v, voted: data.voted, votes_count: v.votes_count + (data.voted ? 1 : -1) });
    } catch {}
    finally { setVoting(false); }
  };

  const join = async () => {
    if (!user) { toast.info("سجّل الدخول أولاً"); nav("/login"); return; }
    setBusyKey("join");
    try {
      await api.post(`/ventures/${v.id}/join`, { message: joinMsg.trim() });
      setJoinOpen(false); setJoinMsg("");
      toast.success("تم إرسال طلب الانضمام ✅");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر إرسال الطلب"); }
    finally { setBusyKey(""); }
  };

  const decide = async (uid, ok) => {
    setBusyKey(`decide:${uid}:${ok ? "approve" : "reject"}`);
    try {
      await api.post(`/ventures/${v.id}/requests/${uid}/${ok ? "approve" : "reject"}`);
      toast.success(ok ? "تم قبول العضو 🎉" : "تم رفض الطلب");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
    finally { setBusyKey(""); }
  };

  const leave = async () => {
    setBusyKey("leave");
    try {
      await api.post(`/ventures/${v.id}/leave`);
      toast.success("غادرت الفريق");
      setConfirmAction(null);
      load();
    }
    catch (e) { toast.error(e.response?.data?.detail || "حدث خطأ"); }
    finally { setBusyKey(""); }
  };

  const saveEdit = async () => {
    setBusyKey("save");
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
    finally { setBusyKey(""); }
  };

  const remove = async () => {
    setBusyKey("delete");
    try {
      await api.delete(`/ventures/${v.id}`);
      toast.success("تم حذف المشروع");
      setConfirmAction(null);
      nav("/ventures");
    }
    catch (e) { toast.error(e.response?.data?.detail || "تعذّر الحذف"); }
    finally { setBusyKey(""); }
  };

  const addUpdate = async () => {
    if (updForm.title.trim().length < 3 || !updForm.text.trim()) { toast.error("أكمل عنوان ونص التحديث"); return; }
    setBusyKey("update");
    try {
      await api.post(`/ventures/${v.id}/updates`, { title: updForm.title.trim(), text: updForm.text.trim() });
      setUpdOpen(false); setUpdForm({ title: "", text: "" });
      toast.success("تم نشر التحديث"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر النشر"); }
    finally { setBusyKey(""); }
  };

  const openEdit = () => {
    setEditForm({ description: v.description, category: v.category, looking_for: v.looking_for || "", max_members: v.max_members, status: v.status });
    setEditOpen(true);
  };

  const teamPct = v.max_members ? Math.min(100, Math.round((v.team_count / v.max_members) * 100)) : 0;
  const seatsLeft = (v.max_members || 0) - (v.team_count || 0);
  const CategoryIcon = CATEGORY_ICONS[v.category] || Rocket;
  const teamStack = [
    { name: v.owner_name, owner: true },
    ...(v.members || []).map((m) => ({ name: m.name, owner: false })),
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] text-white px-6 py-10 sm:px-10 sm:py-14 ft-shadow-lg">
          <CategoryIcon className="pointer-events-none absolute -left-8 -bottom-10 w-48 h-48 sm:w-72 sm:h-72 text-white/10 -rotate-12" />
          <div className="pointer-events-none absolute -top-24 right-[20%] w-64 h-64 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_20%,transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[35%] w-64 h-64 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_15%,transparent)] blur-3xl" />
          <div className="relative">
            <Link to="/ventures" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 text-slate-100 hover:bg-white/20 hover:text-white text-sm font-bold pressable transition-colors">
              <ArrowRight className="w-4 h-4" /> كل المشاريع
            </Link>
            <div className="flex items-center gap-2 flex-wrap mt-6">
              <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full bg-white/95 font-bold border-0 shadow`}>
                <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
                {v.status_label}
              </Badge>
              <Badge variant="secondary" className="rounded-full shadow">
                <CategoryIcon className="w-3.5 h-3.5 ml-1" />
                {v.category}
              </Badge>
              <BookmarkButton kind="venture" refId={v.id} title={v.title} dark />
            </div>
            <h1 className="font-head text-3xl sm:text-[2.6rem] font-extrabold leading-snug mt-4">{v.title}</h1>
            <div className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md py-1.5 pr-1.5 pl-4 max-w-full">
              <span className="w-8 h-8 rounded-full ft-icon-tile text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white/40 shadow">
                {(v.owner_name || "؟").trim().charAt(0)}
              </span>
              <span className="text-sm font-bold truncate">👤 {v.owner_name}{v.school_name ? ` · 🏫 ${v.school_name}` : ""}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3.5 py-2 text-xs font-bold backdrop-blur-md">
                <Users className="w-4 h-4 text-sky-200" /> {v.team_count}/{v.max_members}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3.5 py-2 text-xs font-bold backdrop-blur-md">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[v.status] || "bg-white/70"}`} /> {v.status_label}
              </span>
              <button onClick={vote} disabled={voting}
                className={`pressable inline-flex items-center gap-2 rounded-full px-6 min-h-[48px] text-base font-extrabold transition-all disabled:opacity-60 disabled:pointer-events-none ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-xl shadow-rose-950/30 border border-rose-300/50" : "bg-white text-rose-600 shadow-xl hover:bg-rose-50"}`}>
                <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count}
              </button>
            </div>
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-white/85">
                <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> اكتمال الفريق</span>
                <span className="tabular-nums">{teamPct}% · {v.team_count}/{v.max_members}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm">
                <div className="h-full rounded-full bg-white shadow transition-all duration-700" style={{ width: `${teamPct}%` }} />
              </div>
            </div>
          </div>
          <div className={`absolute bottom-0 right-0 left-0 h-2 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-white/40 to-white/10"}`} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-10 space-y-6">
        <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Info className="w-5 h-5" /></span>
              عن المشروع
            </h2>
            <button onClick={vote} disabled={voting}
              className={`pressable flex items-center gap-2 font-extrabold rounded-full px-5 min-h-[48px] text-base transition-all disabled:opacity-60 disabled:pointer-events-none ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200" : "bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100"}`}>
              <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count}
            </button>
          </div>
          <p className="mt-4 text-slate-600 leading-loose whitespace-pre-wrap text-base">{v.description}</p>
          {v.looking_for && (
            <div className="mt-5 relative overflow-hidden rounded-2xl bg-gradient-to-l from-violet-50 to-fuchsia-50 border border-violet-100 p-4 sm:p-5 text-sm text-violet-900 flex items-start gap-3">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-200"><Search className="w-5 h-5" /></span>
              <p className="leading-relaxed pt-1.5"><span className="font-bold">🔍 يبحث الفريق عن:</span> {v.looking_for}</p>
            </div>
          )}
          {canManage && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <Button variant="outline" onClick={openEdit} className="rounded-xl pressable min-h-[44px] hover:border-blue-300 hover:text-blue-700"><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
              <Button variant="outline" onClick={() => setUpdOpen(true)} className="rounded-xl pressable min-h-[44px] hover:[border-color:color-mix(in_srgb,var(--ft-accent)_32%,white)] hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]"><Megaphone className="w-4 h-4 ml-1" /> تحديث تقدّم</Button>
              <Button variant="outline" onClick={() => setConfirmAction("delete")} className="rounded-xl text-red-600 hover:text-red-700 hover:bg-rose-50 hover:border-rose-200 pressable min-h-[44px]"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0"><Users className="w-5 h-5" /></span>
              الفريق <span className="text-sm font-bold text-slate-400">({v.team_count}/{v.max_members})</span>
            </h2>
            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-extrabold px-3.5 py-1.5 tabular-nums">{teamPct}%</span>
          </div>
          <div className="mt-5 h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner ring-1 ring-slate-200/60">
            <div className={`h-full rounded-full bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-blue-500 to-sky-400"} transition-all duration-700`} style={{ width: `${teamPct}%` }} />
          </div>
          <p className="mt-2.5 text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" />
            {seatsLeft > 0
              ? <>متبقّي {seatsLeft} {seatsLeft === 1 ? "مقعد" : "مقاعد"} في الفريق</>
              : <>اكتمل عدد الفريق · لا توجد مقاعد شاغرة</>}
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div className="flex items-center">
              {teamStack.slice(0, 6).map((m, i) => (
                <span key={i} className="relative shrink-0" style={{ marginInlineStart: i === 0 ? 0 : "-0.65rem", zIndex: 20 - i }}>
                  <span className={`w-10 h-10 rounded-full text-white text-xs font-extrabold flex items-center justify-center ring-[2.5px] ring-white shadow ${m.owner ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-gradient-to-br from-blue-500 to-violet-500"}`}>
                    {(m.name || "؟").trim().charAt(0)}
                  </span>
                  {m.owner && <span className="absolute -top-2 -right-1 text-[11px] leading-none drop-shadow">👑</span>}
                </span>
              ))}
              {teamStack.length > 6 && (
                <span className="relative shrink-0 w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-extrabold flex items-center justify-center ring-[2.5px] ring-white shadow" style={{ marginInlineStart: "-0.65rem" }}>
                  +{teamStack.length - 6}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-400">{teamStack.length} {teamStack.length === 1 ? "عضو" : "أعضاء"} في الفريق حتى الآن</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 pl-4 pr-1.5 py-1.5">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow">{(v.owner_name || "؟").trim().charAt(0)}</span>
              <span className="text-xs font-bold text-emerald-800">👑 {v.owner_name} (صاحب المشروع)</span>
            </span>
            {(v.members || []).map((m) => (
              <span key={m.id} className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 pl-4 pr-1.5 py-1.5">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow">{(m.name || "؟").trim().charAt(0)}</span>
                <span className="text-xs font-bold text-slate-700">{m.name}</span>
              </span>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            {!user ? (
              <Button onClick={() => nav("/login")} className="rounded-xl pressable min-h-[48px]"><UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام</Button>
            ) : v.is_owner ? (
              <p className="text-sm text-slate-400">هذا مشروعك · راجع طلبات الانضمام بالأسفل 👇</p>
            ) : v.is_member ? (
              <Button variant="outline" onClick={() => setConfirmAction("leave")} className="rounded-xl text-slate-500 pressable min-h-[48px]"><UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق</Button>
            ) : v.request_pending ? (
              <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-200 px-4 py-2.5 font-bold">⏳ طلبك قيد مراجعة صاحب المشروع</Badge>
            ) : v.team_count >= v.max_members ? (
              <Badge variant="outline" className="rounded-full bg-slate-100 text-slate-500 border-slate-200 px-4 py-2.5 font-bold">اكتمل عدد الفريق</Badge>
            ) : (
              <Button onClick={() => setJoinOpen(true)} className="rounded-2xl ft-btn-primary font-extrabold text-base min-h-[52px] px-6 pressable shadow-lg">
                <UserPlus className="w-5 h-5 ml-1.5" /> اطلب الانضمام للفريق
              </Button>
            )}
          </div>
        </div>

        {v.is_owner && (v.join_requests || []).length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/80 to-white rounded-[1.4rem] sm:rounded-3xl border border-amber-200 ft-shadow p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5 flex-wrap">
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 shrink-0"><UserPlus className="w-5 h-5" /></span>
              طلبات الانضمام
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-gradient-to-l from-amber-500 to-orange-500 text-white text-xs font-extrabold shadow-md shadow-amber-200">{v.join_requests.length}</span>
            </h2>
            <div className="mt-5 space-y-3">
              {v.join_requests.map((r) => {
                const approving = busyKey === `decide:${r.id}:approve`;
                const rejecting = busyKey === `decide:${r.id}:reject`;
                const deciding = approving || rejecting;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-amber-100 ft-shadow hover-lift p-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-base font-extrabold flex items-center justify-center shrink-0 ring-2 ring-amber-100 shadow">{(r.name || "؟").trim().charAt(0)}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800">{r.name}</div>
                        {r.message && (
                          <div className="relative mt-1.5 text-sm text-slate-600 leading-relaxed bg-amber-50/90 border border-amber-100 rounded-2xl rounded-tr-md px-3.5 py-2.5 shadow-sm">
                            <span className="block text-[10px] font-extrabold text-amber-500 mb-0.5">رسالة الانضمام</span>
                            "{r.message}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" disabled={deciding} onClick={() => decide(r.id, true)} className="rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-extrabold pressable min-h-[44px] px-4 shadow-md shadow-emerald-200 disabled:opacity-60">
                        {approving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Check className="w-4 h-4 ml-1" />} قبول
                      </Button>
                      <Button size="sm" disabled={deciding} onClick={() => decide(r.id, false)} className="rounded-xl bg-gradient-to-l from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-extrabold pressable min-h-[44px] px-4 shadow-md shadow-rose-200 disabled:opacity-60">
                        {rejecting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <X className="w-4 h-4 ml-1" />} رفض
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(v.updates || []).length > 0 && (
          <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Megaphone className="w-5 h-5" /></span>
              آخر التحديثات
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full ft-chip text-xs font-extrabold">{v.updates.length}</span>
            </h2>
            <div className="relative mt-7">
              <div className="absolute top-2 bottom-2 right-[9px] w-0.5 rounded-full [background-image:linear-gradient(to_bottom,var(--ft-accent),transparent)]" />
              <div className="space-y-5">
                {v.updates.map((u, i) => (
                  <div key={u.id || i} className="relative pr-10">
                    <span className={`absolute right-0 top-2 w-5 h-5 rounded-full ring-4 ft-ring-accent border-2 border-white shadow-md flex items-center justify-center ${STATUS_DOT[v.status] || "bg-emerald-500"}`}>
                      <Megaphone className="w-2.5 h-2.5 text-white" />
                    </span>
                    <div className="rounded-2xl bg-white border border-slate-100 ft-shadow hover-lift p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="font-extrabold text-slate-800">{u.title}</div>
                        {u.created_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                            <CalendarDays className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString("ar")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white shadow">{(u.author_name || "؟").trim().charAt(0)}</span>
                        <span className="text-xs font-bold text-slate-400">{u.author_name}</span>
                      </div>
                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{u.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky action bar · mirrors the in-card logic, phones only */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="pointer-events-auto mx-3 mb-3 rounded-[1.75rem] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] p-2 flex items-center gap-2">
          <button onClick={vote} disabled={voting} aria-label="التصويت للمشروع"
            className={`pressable shrink-0 flex items-center gap-1.5 font-extrabold rounded-2xl px-4 min-h-[48px] text-base transition-all disabled:opacity-60 disabled:pointer-events-none ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200" : "bg-rose-50 text-rose-500 border border-rose-100"}`}>
            <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> <span className="tabular-nums">{v.votes_count}</span>
          </button>
          <div className="flex-1 min-w-0">
            {!user ? (
              <Button onClick={() => nav("/login")} className="w-full rounded-2xl ft-btn-primary font-extrabold text-sm min-h-[48px] pressable shadow-lg">
                <UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام
              </Button>
            ) : v.is_owner ? (
              <p className="text-center text-xs font-bold text-slate-500 px-1 leading-relaxed">هذا مشروعك · راجع طلبات الانضمام بالأسفل 👇</p>
            ) : v.is_member ? (
              <Button variant="outline" onClick={() => setConfirmAction("leave")} className="w-full rounded-2xl text-slate-600 font-extrabold text-sm min-h-[48px] pressable">
                <UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق
              </Button>
            ) : v.request_pending ? (
              <p className="text-center text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-3">⏳ طلبك قيد مراجعة صاحب المشروع</p>
            ) : v.team_count >= v.max_members ? (
              <p className="text-center text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 rounded-2xl px-3 py-3">اكتمل عدد الفريق</p>
            ) : (
              <Button onClick={() => setJoinOpen(true)} className="w-full rounded-2xl ft-btn-primary font-extrabold text-sm min-h-[48px] pressable shadow-lg">
                <UserPlus className="w-4 h-4 ml-1" /> اطلب الانضمام للفريق
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!o && !busyKey) setConfirmAction(null); }}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${confirmAction === "delete" ? "bg-gradient-to-br from-rose-500 to-red-500 shadow-rose-200" : "bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-200"}`}>
                {confirmAction === "delete" ? <Trash2 className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
              </span>
              <DialogTitle className="font-head text-xl font-extrabold">
                {confirmAction === "delete" ? "حذف المشروع نهائياً" : "مغادرة الفريق"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-500 leading-relaxed pt-2">
              {confirmAction === "delete"
                ? <>حذف المشروع نهائياً؟ لا يمكن التراجع. سيختفي «{v.title}» من قائمة المشاريع.</>
                : <>متأكد من مغادرة الفريق؟ ستغادر فريق «{v.title}» ولن تظهر ضمن أعضائه.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={busyKey === "leave" || busyKey === "delete"} className="rounded-2xl pressable min-h-[48px] px-5 font-bold">
              إلغاء
            </Button>
            {confirmAction === "delete" ? (
              <Button onClick={remove} disabled={busyKey === "delete"} className="rounded-2xl bg-gradient-to-l from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-extrabold pressable min-h-[48px] px-5 shadow-lg shadow-rose-200 disabled:opacity-60">
                {busyKey === "delete" ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ الحذف...</> : <><Trash2 className="w-4 h-4 ml-1" /> حذف نهائياً</>}
              </Button>
            ) : (
              <Button onClick={leave} disabled={busyKey === "leave"} className="rounded-2xl bg-gradient-to-l from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-extrabold pressable min-h-[48px] px-5 shadow-lg disabled:opacity-60">
                {busyKey === "leave" ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ المغادرة...</> : <><UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-200 shrink-0">
                <UserPlus className="w-5 h-5" />
              </span>
              <DialogTitle className="font-head text-xl font-extrabold">طلب انضمام</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>رسالة تعريفية (اختياري)</Label>
              <Textarea value={joinMsg} onChange={(e) => setJoinMsg(e.target.value)}
                placeholder="عرّف بنفسك وبما ستضيفه للفريق..." className="rounded-xl mt-1 text-base" maxLength={500} />
              <div className="mt-1 text-left text-[11px] font-medium text-slate-400 tabular-nums">{joinMsg.length}/500</div></div>
            <Button onClick={join} disabled={busyKey === "join"} className="w-full rounded-2xl ft-btn-primary font-extrabold text-base min-h-[52px] pressable shadow-lg disabled:opacity-60">
              {busyKey === "join" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ الإرسال...</> : "أرسل الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                <Pencil className="w-5 h-5" />
              </span>
              <DialogTitle className="font-head text-xl font-extrabold">تعديل المشروع</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>الحالة</Label>
              <Select value={editForm.status} onValueChange={(s) => setEditForm({ ...editForm, status: s })}>
                <SelectTrigger className="rounded-xl mt-1 min-h-[48px]"><SelectValue /></SelectTrigger>
                <SelectContent>{VENTURE_STATUSES.filter((s) => s.v !== "all").map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>الوصف</Label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="rounded-xl mt-1 text-base min-h-[120px]" maxLength={5000} />
              <div className="mt-1 text-left text-[11px] font-medium text-slate-400 tabular-nums">{(editForm.description || "").length}/5000</div></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>التصنيف</Label>
                <Select value={editForm.category} onValueChange={(c) => setEditForm({ ...editForm, category: c })}>
                  <SelectTrigger className="rounded-xl mt-1 min-h-[48px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{VENTURE_CATEGORIES.filter((c) => c !== "الكل").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>الحد الأقصى للفريق</Label>
                <Input type="number" min={2} max={20} value={editForm.max_members || 5}
                  onChange={(e) => setEditForm({ ...editForm, max_members: e.target.value })} className="rounded-xl mt-1 text-base min-h-[48px]" /></div>
            </div>
            <div><Label>من تبحث عنه؟</Label>
              <Input value={editForm.looking_for || ""} onChange={(e) => setEditForm({ ...editForm, looking_for: e.target.value })}
                className="rounded-xl mt-1 text-base min-h-[48px]" maxLength={500} />
              <div className="mt-1 text-left text-[11px] font-medium text-slate-400 tabular-nums">{(editForm.looking_for || "").length}/500</div></div>
            <Button onClick={saveEdit} disabled={busyKey === "save"} className="w-full rounded-2xl ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable shadow-lg disabled:opacity-60">
              {busyKey === "save" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ الحفظ...</> : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updOpen} onOpenChange={setUpdOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0">
                <Megaphone className="w-5 h-5" />
              </span>
              <DialogTitle className="font-head text-xl font-extrabold">تحديث تقدّم <Plus className="inline w-5 h-5" /></DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان التحديث</Label>
              <Input value={updForm.title} onChange={(e) => setUpdForm({ ...updForm, title: e.target.value })}
                placeholder="مثال: أنهينا النموذج الأولي" className="rounded-xl mt-1 text-base min-h-[48px]" maxLength={120} />
              <div className="mt-1 text-left text-[11px] font-medium text-slate-400 tabular-nums">{updForm.title.length}/120</div></div>
            <div><Label>التفاصيل</Label>
              <Textarea value={updForm.text} onChange={(e) => setUpdForm({ ...updForm, text: e.target.value })}
                placeholder="ماذا أنجز الفريق؟" className="rounded-xl mt-1 text-base" maxLength={2000} />
              <div className="mt-1 text-left text-[11px] font-medium text-slate-400 tabular-nums">{updForm.text.length}/2000</div></div>
            <Button onClick={addUpdate} disabled={busyKey === "update"} className="w-full rounded-2xl ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable shadow-lg disabled:opacity-60">
              {busyKey === "update" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ النشر...</> : "انشر التحديث"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
