import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone, Rocket, Search, Info, CalendarDays, Loader2, Code, Briefcase, FlaskConical, Leaf, BookOpen, Palette, Target, CheckCircle2, MessageCircle, Send, Bell, BellRing, Sparkles } from "lucide-react";
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

const CATEGORY_GRAD = {
  "تقنية وبرمجة": "from-blue-500 to-indigo-500",
  "ريادة أعمال": "from-violet-500 to-purple-500",
  "علمي": "from-cyan-500 to-sky-500",
  "مجتمعي": "from-rose-500 to-pink-500",
  "بيئي": "from-emerald-500 to-green-500",
  "ثقافي وأدبي": "from-amber-500 to-orange-500",
  "فني وإعلامي": "from-fuchsia-500 to-pink-500",
};

const parseArr = (d) => (Array.isArray(d) ? d : d?.items || d?.results || d?.comments || d?.milestones || d?.data || []);
const msIsDone = (m) => !!(m?.done ?? m?.completed ?? m?.is_done ?? m?.checked);
const msTitle = (m) => m?.title || m?.text || m?.name || "";

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
  // New features state (milestones / comments / follow / similar)
  const [milestones, setMilestones] = useState(null); // null = endpoint unavailable
  const [msInput, setMsInput] = useState("");
  const [msBusy, setMsBusy] = useState(false);
  const [comments, setComments] = useState(null); // null = endpoint unavailable
  const [cInput, setCInput] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [followOk, setFollowOk] = useState(true);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get(`/ventures/${id}`);
      setV(data);
      if (typeof data?.following === "boolean") setFollowing(data.following);
      if (typeof data?.followers_count === "number") setFollowersCount(data.followers_count);
      if (Array.isArray(data?.milestones)) setMilestones((prev) => (prev === null ? data.milestones : prev));
    } catch (e) { setLoadError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const fetchMilestones = useCallback(async () => {
    try {
      const { data } = await api.get(`/ventures/${id}/milestones`);
      setMilestones(parseArr(data));
    } catch { /* section hides gracefully */ }
  }, [id]);

  const fetchComments = useCallback(async () => {
    try {
      const { data } = await api.get(`/ventures/${id}/comments`);
      setComments(parseArr(data));
    } catch { /* section hides gracefully */ }
  }, [id]);

  const fetchSimilar = useCallback(async () => {
    try {
      const { data } = await api.get(`/ventures/${id}/similar`);
      setSimilar(parseArr(data).filter((s) => s && s.id && s.id !== id));
    } catch { setSimilar([]); }
  }, [id]);

  useEffect(() => { fetchMilestones(); fetchComments(); fetchSimilar(); }, [fetchMilestones, fetchComments, fetchSimilar]);

  if (!v) {
    if (loadError) {
      return (
        <Layout>
          <div className="max-w-5xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
  const canTeam = !!(v.is_owner || v.is_member || isStaff);

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

  // ---- New: milestones ----
  const toggleMilestone = async (m) => {
    if (!canTeam || !m?.id) return;
    const nd = !msIsDone(m);
    setMilestones((prev) => (prev || []).map((x) => (x.id === m.id ? { ...x, done: nd, completed: nd } : x)));
    try {
      const { data } = await api.post(`/ventures/${v.id}/milestones/${m.id}/toggle`);
      const item = data?.milestone || data;
      if (item && typeof item === "object" && ("done" in item || "completed" in item || "is_done" in item)) {
        setMilestones((prev) => (prev || []).map((x) => (x.id === m.id ? { ...x, ...item } : x)));
      }
    } catch {
      setMilestones((prev) => (prev || []).map((x) => (x.id === m.id ? { ...x, done: !nd, completed: !nd } : x)));
      toast.error("تعذّر تحديث المرحلة");
    }
  };

  const addMilestone = async () => {
    const t = msInput.trim();
    if (t.length < 2 || msBusy) return;
    setMsBusy(true);
    try {
      const { data } = await api.post(`/ventures/${v.id}/milestones`, { title: t });
      const item = data?.milestone || data;
      if (item && (item.id || msTitle(item))) setMilestones((prev) => [...(prev || []), item]);
      else setMilestones((prev) => [...(prev || []), { id: `tmp-${Date.now()}`, title: t, done: false }]);
      setMsInput("");
      toast.success("أُضيفت مرحلة جديدة 🎯");
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر إضافة المرحلة"); }
    finally { setMsBusy(false); }
  };

  // ---- New: comments ----
  const addComment = async () => {
    const t = cInput.trim();
    if (!t || cBusy) return;
    setCBusy(true);
    try {
      const { data } = await api.post(`/ventures/${v.id}/comments`, { text: t });
      const item = data?.comment || data;
      if (item && (item.id || item.text || item.body)) setComments((prev) => [...(prev || []), item]);
      else await fetchComments();
      setCInput("");
      toast.success("تم نشر تعليقك 💬");
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر نشر التعليق"); }
    finally { setCBusy(false); }
  };

  const deleteComment = async (c) => {
    if (!c?.id) return;
    setComments((prev) => (prev || []).filter((x) => x.id !== c.id));
    try { await api.delete(`/ventures/${v.id}/comments/${c.id}`); toast.success("تم حذف التعليق"); }
    catch { toast.error("تعذّر حذف التعليق"); fetchComments(); }
  };

  const canDeleteComment = (c) => !!user && (v.is_owner || isStaff || c.user_id === user.id || c.author_id === user.id || c.user?.id === user.id);

  // ---- New: follow ----
  const toggleFollow = async () => {
    if (!user) { toast.info("سجّل الدخول للمتابعة"); nav("/login"); return; }
    if (followBusy) return;
    setFollowBusy(true);
    const nf = !following;
    setFollowing(nf);
    setFollowersCount((c) => Math.max(0, c + (nf ? 1 : -1)));
    try {
      const { data } = await api.post(`/ventures/${v.id}/follow`);
      if (data && typeof data === "object") {
        if (typeof data.following === "boolean") setFollowing(data.following);
        if (typeof data.followers_count === "number") setFollowersCount(data.followers_count);
        else if (typeof data.followers === "number") setFollowersCount(data.followers);
      }
      toast.success(nf ? "أنت تتابع هذا المشروع الآن 🔔" : "ألغيت متابعة المشروع");
    } catch (e) {
      setFollowing(!nf);
      setFollowersCount((c) => Math.max(0, c + (nf ? -1 : 1)));
      if (e.response?.status === 404) setFollowOk(false);
      toast.error(e.response?.data?.detail || "تعذّر تحديث المتابعة");
    } finally { setFollowBusy(false); }
  };

  const teamPct = v.max_members ? Math.min(100, Math.round((v.team_count / v.max_members) * 100)) : 0;
  const seatsLeft = (v.max_members || 0) - (v.team_count || 0);
  const CategoryIcon = CATEGORY_ICONS[v.category] || Rocket;
  const catGrad = CATEGORY_GRAD[v.category] || "from-slate-500 to-slate-600";
  const teamStack = [
    { name: v.owner_name, owner: true },
    ...(v.members || []).map((m) => ({ name: m.name, owner: false })),
  ];
  const updatesCount = (v.updates || []).length;
  const msDoneCount = (milestones || []).filter(msIsDone).length;
  const msPct = milestones && milestones.length ? Math.round((msDoneCount / milestones.length) * 100) : 0;
  const commentsShown = typeof v.comments_count === "number" ? v.comments_count : (comments ? comments.length : 0);

  const heroTiles = [
    { icon: Users, label: "أعضاء الفريق", value: `${v.team_count || 0}/${v.max_members || 0}` },
    { icon: Heart, label: "صوت", value: v.votes_count || 0 },
    { icon: Megaphone, label: "تحديث", value: updatesCount },
    ...(milestones !== null ? [{ icon: Target, label: "إنجاز المراحل", value: `${msPct}%` }] : []),
  ];

  const statRows = [
    { icon: Heart, label: "الأصوات", value: v.votes_count || 0 },
    { icon: Megaphone, label: "التحديثات", value: updatesCount },
    ...(comments !== null || typeof v.comments_count === "number" ? [{ icon: MessageCircle, label: "التعليقات", value: commentsShown }] : []),
    ...(followOk ? [{ icon: Bell, label: "المتابعون", value: followersCount }] : []),
    ...(milestones !== null ? [{ icon: Target, label: "المراحل المنجزة", value: `${msDoneCount}/${milestones.length}` }] : []),
    ...(v.created_at ? [{ icon: CalendarDays, label: "تاريخ الإنشاء", value: new Date(v.created_at).toLocaleDateString("ar") }] : []),
  ];

  return (
    <Layout>
      {/* ============ HERO · cinematic category band + frosted glass panel ============ */}
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <section data-testid="venture-hero" className="relative isolate overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] text-white ft-shadow-lg">
          <div className={`absolute inset-0 bg-gradient-to-bl ${catGrad}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-slate-950/10" />
          <CategoryIcon className="pointer-events-none absolute -left-10 -bottom-12 w-56 h-56 sm:w-80 sm:h-80 lg:w-[26rem] lg:h-[26rem] text-white/10 -rotate-12" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1.6px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute -top-24 right-[18%] w-64 h-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-[30%] w-64 h-64 rounded-full bg-slate-950/25 blur-3xl" />
          <div className="relative px-4 py-6 sm:px-8 sm:py-9 lg:px-12 lg:py-11">
            <Link to="/ventures" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-full bg-white/10 border border-white/25 backdrop-blur-md px-4 py-2 text-slate-100 hover:bg-white/20 hover:text-white text-sm font-bold pressable transition-colors">
              <ArrowRight className="w-4 h-4" /> كل المشاريع
            </Link>
            <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-slate-950/35 backdrop-blur-2xl ring-1 ring-white/25 shadow-2xl p-5 sm:p-8">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-white/80 via-white/40 to-white/10" />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full bg-white/95 font-bold border-0 shadow`}>
                  <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
                  {v.status_label}
                </Badge>
                <Badge className="rounded-full bg-white/15 text-white border border-white/25 backdrop-blur-md shadow font-bold">
                  <CategoryIcon className="w-3.5 h-3.5 ml-1" />
                  {v.category}
                </Badge>
                {v.is_owner && <Badge className="rounded-full bg-violet-500/80 text-white border border-violet-200/40 backdrop-blur-md shadow font-bold">مشروعك 👑</Badge>}
                <span className="flex-1" />
                <BookmarkButton kind="venture" refId={v.id} title={v.title} dark />
              </div>
              <h1 className="font-head text-3xl sm:text-[2.6rem] lg:text-6xl font-extrabold leading-snug mt-5 drop-shadow-sm">{v.title}</h1>
              <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md py-1.5 pr-1.5 pl-4 max-w-full">
                  <span className="w-8 h-8 rounded-full ft-icon-tile text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white/40 shadow">
                    {(v.owner_name || "؟").trim().charAt(0)}
                  </span>
                  <span className="text-sm font-bold truncate">👤 {v.owner_name}{v.school_name ? ` · 🏫 ${v.school_name}` : ""}</span>
                </span>
                {v.created_at && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold">
                    <CalendarDays className="w-3.5 h-3.5" /> {new Date(v.created_at).toLocaleDateString("ar")}
                  </span>
                )}
              </div>
              <div className="my-6 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent" />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
                <button onClick={vote} disabled={voting}
                  className={`pressable inline-flex items-center gap-2 rounded-full px-7 min-h-[52px] text-base font-extrabold transition-all disabled:opacity-60 disabled:pointer-events-none ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-xl shadow-rose-950/30 border border-rose-300/50" : "bg-white text-rose-600 shadow-xl hover:bg-rose-50"}`}>
                  <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count} · صوّت
                </button>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-white/85">
                    <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> اكتمال الفريق</span>
                    <span className="tabular-nums">{teamPct}% · {v.team_count}/{v.max_members}</span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm">
                    <div className="h-full rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.65)] transition-all duration-700" style={{ width: `${teamPct}%` }} />
                  </div>
                </div>
              </div>
              <div className={`mt-6 grid grid-cols-2 ${heroTiles.length > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-2.5 sm:gap-3`}>
                {heroTiles.map((t) => (
                  <div key={t.label} className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md px-3.5 py-3.5 shadow-inner">
                    <t.icon className="w-5 h-5 text-white/85" />
                    <div className="mt-1.5 font-head text-xl sm:text-2xl font-extrabold tabular-nums leading-none">{t.value}</div>
                    <div className="mt-1 text-[11px] font-bold text-white/75">{t.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`absolute bottom-0 right-0 left-0 h-2 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-white/40 to-white/10"}`} />
        </section>
      </div>

      {/* ============ BODY · content + sticky rail ============ */}
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-12">
        <div className="pt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ---- Main content column ---- */}
          <div className="min-w-0 space-y-6 lg:col-start-1">
            <div className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up isolate">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
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

            {v.is_owner && (v.join_requests || []).length > 0 && (
              <div className="relative isolate overflow-hidden bg-gradient-to-b from-amber-50/80 to-white rounded-[1.4rem] sm:rounded-3xl border border-amber-200 ft-shadow p-6 sm:p-8 animate-fade-up min-w-0" style={{ animationDelay: "60ms" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 to-orange-500 opacity-90" />
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
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-amber-100 ft-shadow p-4 flex-wrap">
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

            {milestones !== null && (milestones.length > 0 || canTeam) && (
              <div data-testid="venture-milestones" className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up isolate min-w-0" style={{ animationDelay: "120ms" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Target className="w-5 h-5" /></span>
                    مراحل المشروع
                    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full ft-chip text-xs font-extrabold">{milestones.length}</span>
                  </h2>
                  <span className="inline-flex items-center rounded-full ft-bg-soft ft-text-accent border ft-border-accent text-sm font-extrabold px-3.5 py-1.5 tabular-nums">{msPct}% منجز</span>
                </div>
                <div className="mt-5 h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner ring-1 ring-slate-200/60">
                  <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${msPct}%` }} />
                </div>
                {milestones.length > 0 ? (
                  <div className="mt-5 space-y-2.5">
                    {milestones.map((m, i) => {
                      const done = msIsDone(m);
                      return (
                        <div key={m.id || i} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors ${done ? "bg-emerald-50/60 border-emerald-100" : "bg-slate-50/70 border-slate-200/80 hover:bg-white"}`}>
                          {canTeam ? (
                            <button onClick={() => toggleMilestone(m)} aria-label={done ? "إلغاء إنجاز المرحلة" : "تعليم المرحلة كمنجزة"}
                              className="pressable shrink-0 w-11 h-11 flex items-center justify-center rounded-full">
                              {done
                                ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                : <span className="block w-6 h-6 rounded-full border-[2.5px] border-slate-300 hover:ft-border-accent transition-colors" />}
                            </button>
                          ) : (
                            <span className="shrink-0 w-11 h-11 flex items-center justify-center">
                              {done
                                ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                : <span className="block w-6 h-6 rounded-full border-[2.5px] border-slate-200" />}
                            </span>
                          )}
                          <span className={`flex-1 min-w-0 text-sm leading-relaxed ${done ? "line-through text-slate-400 font-medium" : "font-bold text-slate-700"}`}>{msTitle(m)}</span>
                          {done && <span className="shrink-0 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-1 shadow-sm">منجزة ✓</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-center text-sm font-bold text-slate-400">لا مراحل بعد · أضف أول مرحلة لتتبّع تقدّم المشروع خطوة بخطوة 🎯</p>
                )}
                {canTeam && (
                  <div className="mt-4 flex items-center gap-2">
                    <Input value={msInput} onChange={(e) => setMsInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                      placeholder="أضف مرحلة جديدة · مثال: إطلاق النموذج الأولي" className="rounded-xl min-h-[48px] text-base flex-1 min-w-0" maxLength={120} />
                    <Button onClick={addMilestone} disabled={msBusy || msInput.trim().length < 2} className="rounded-xl ft-btn-primary font-extrabold min-h-[48px] px-4 pressable shadow-md shrink-0 disabled:opacity-60">
                      {msBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> إضافة</>}
                    </Button>
                  </div>
                )}
                {!canTeam && milestones.length > 0 && (
                  <p className="mt-3 text-[11px] font-bold text-slate-400">يحدّث فريق المشروع هذه المراحل أولاً بأول</p>
                )}
              </div>
            )}

            {(v.updates || []).length > 0 && (
              <div className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up isolate min-w-0" style={{ animationDelay: "180ms" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Megaphone className="w-5 h-5" /></span>
                  آخر التحديثات
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full ft-chip text-xs font-extrabold">{v.updates.length}</span>
                </h2>
                <div className="relative mt-7">
                  <div className="absolute top-2 bottom-2 right-[11px] w-0.5 rounded-full [background-image:linear-gradient(to_bottom,var(--ft-accent),transparent)]" />
                  <div className="space-y-5">
                    {v.updates.map((u, i) => (
                      <div key={u.id || i} className="relative pr-10">
                        <span className={`absolute right-0 top-2 w-6 h-6 rounded-full ft-icon-tile ring-4 ring-white shadow-lg flex items-center justify-center`}>
                          <Megaphone className="w-3 h-3 text-white" />
                        </span>
                        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 ft-shadow p-4 sm:p-5">
                          <span className="pointer-events-none absolute inset-y-0 right-0 w-1 ft-grad-bar opacity-70" />
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

            {comments !== null && (
              <div data-testid="venture-comments" className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-8 animate-fade-up isolate min-w-0" style={{ animationDelay: "240ms" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><MessageCircle className="w-5 h-5" /></span>
                  التعليقات
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full ft-chip text-xs font-extrabold">{comments.length}</span>
                </h2>
                {comments.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    {comments.map((c, i) => {
                      const cName = c.author_name || c.user_name || c.name || "عضو";
                      return (
                        <div key={c.id || i} className="flex items-start gap-3">
                          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow shrink-0">{(cName || "؟").trim().charAt(0)}</span>
                          <div className="flex-1 min-w-0 rounded-2xl rounded-tr-md bg-slate-50/80 border border-slate-200/70 px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-800">{cName}</span>
                              {c.created_at && <span className="text-[11px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString("ar")}</span>}
                              <span className="flex-1" />
                              {canDeleteComment(c) && (
                                <button onClick={() => deleteComment(c)} aria-label="حذف التعليق"
                                  className="pressable shrink-0 w-9 h-9 -my-1 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.text || c.body || ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm font-bold text-slate-400">لا تعليقات بعد · شارك رأيك وشجّع الفريق 💬</p>
                )}
                {user ? (
                  <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5">
                    <span className="w-10 h-10 rounded-full ft-icon-tile text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow shrink-0">{(user.name || "أ").trim().charAt(0)}</span>
                    <div className="flex-1 min-w-0">
                      <Textarea value={cInput} onChange={(e) => setCInput(e.target.value)}
                        placeholder="اكتب تعليقك هنا · كلمة تشجيع أو فكرة تساعد الفريق" className="rounded-2xl text-base min-h-[76px]" maxLength={1000} />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums">{cInput.length}/1000</span>
                        <Button onClick={addComment} disabled={cBusy || !cInput.trim()} className="rounded-xl ft-btn-primary font-extrabold min-h-[44px] px-5 pressable shadow-md disabled:opacity-60">
                          {cBusy ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ النشر...</> : <><Send className="w-4 h-4 ml-1.5" /> نشر التعليق</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <Button onClick={() => nav("/login")} className="rounded-2xl ft-btn-primary font-extrabold min-h-[48px] px-6 pressable shadow-lg">
                      <MessageCircle className="w-4 h-4 ml-1.5" /> سجّل الدخول للتعليق
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- Sticky rail ---- */}
          <div className="min-w-0 isolate lg:col-start-2 order-first lg:order-none">
            <div className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
              <div data-testid="venture-team" className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-7 animate-fade-up isolate">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-head font-extrabold text-xl flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Users className="w-5 h-5" /></span>
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
                <div className="mt-3 flex items-center">
                  {Array.from({ length: Math.min(v.max_members || 0, 10) }).map((_, si) => (
                    <span key={si} style={{ marginInlineStart: si === 0 ? 0 : "-0.45rem", zIndex: 20 - si }}
                      className={`relative w-6 h-6 rounded-full ring-2 ring-white ${si < (v.team_count || 0) ? "ft-grad-bar shadow" : "bg-white border border-dashed border-slate-300"}`} />
                  ))}
                  {(v.max_members || 0) > 10 && (
                    <span className="text-[10px] font-extrabold text-slate-400 tabular-nums" style={{ marginInlineStart: "0.45rem" }}>+{(v.max_members || 0) - 10}</span>
                  )}
                </div>
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
                <div className="mt-5 space-y-2">
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 border border-emerald-100 px-3 py-2.5">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow shrink-0">{(v.owner_name || "؟").trim().charAt(0)}</span>
                    <span className="flex-1 min-w-0 truncate text-sm font-extrabold text-emerald-900">{v.owner_name}</span>
                    <span className="shrink-0 rounded-full bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[10px] font-extrabold px-2.5 py-1 shadow-md shadow-emerald-200">👑 صاحب المشروع</span>
                  </div>
                  {(v.members || []).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 px-3 py-2.5 hover:bg-white hover:border-slate-200 transition-colors">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-extrabold flex items-center justify-center ring-2 ring-white shadow shrink-0">{(m.name || "؟").trim().charAt(0)}</span>
                      <span className="flex-1 min-w-0 truncate text-sm font-bold text-slate-700">{m.name}</span>
                      <span className="shrink-0 ft-chip rounded-full px-2.5 py-1 text-[10px] font-extrabold">عضو</span>
                    </div>
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

              {followOk && (
                <div className="relative overflow-hidden ft-bg-soft rounded-[1.4rem] sm:rounded-3xl border ft-border-accent ft-shadow p-6 sm:p-7 animate-fade-up isolate" style={{ animationDelay: "80ms" }}>
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-head font-extrabold text-lg flex items-center gap-2.5">
                      <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><BellRing className="w-5 h-5" /></span>
                      متابعة المشروع
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border ft-border-accent ft-text-accent text-xs font-extrabold px-3 py-1.5 tabular-nums">
                      <Bell className="w-3.5 h-3.5" /> {followersCount} متابِع
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed">فعّل المتابعة ليصلك إشعار فور نشر تحديث جديد أو إنجاز مرحلة في هذا المشروع.</p>
                  {user ? (
                    <Button data-testid="venture-follow-btn" onClick={toggleFollow} disabled={followBusy}
                      className={`mt-4 w-full rounded-2xl font-extrabold text-base min-h-[52px] pressable disabled:opacity-60 ${following ? "bg-white ft-text-accent border ft-border-accent shadow-md hover:bg-white" : "ft-btn-primary text-white shadow-lg"}`}>
                      {followBusy
                        ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ التحديث...</>
                        : following
                          ? <><BellRing className="w-5 h-5 ml-1.5" /> تتابع هذا المشروع · إلغاء</>
                          : <><Bell className="w-5 h-5 ml-1.5" /> تابع المشروع</>}
                    </Button>
                  ) : (
                    <Button onClick={() => nav("/login")} className="mt-4 w-full rounded-2xl ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable shadow-lg">
                      <Bell className="w-5 h-5 ml-1.5" /> سجّل الدخول للمتابعة
                    </Button>
                  )}
                </div>
              )}

              <div className="relative overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-6 sm:p-7 animate-fade-up isolate" style={{ animationDelay: "140ms" }}>
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90" />
                <h2 className="font-head font-extrabold text-lg flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Sparkles className="w-5 h-5" /></span>
                  لمحة سريعة
                </h2>
                <div className="mt-4 divide-y divide-slate-100">
                  {statRows.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 py-2.5">
                      <span className="w-8 h-8 rounded-xl ft-bg-soft-2 ft-text-accent flex items-center justify-center shrink-0"><r.icon className="w-4 h-4" /></span>
                      <span className="flex-1 text-sm font-bold text-slate-500">{r.label}</span>
                      <span className="font-head font-extrabold text-slate-800 tabular-nums">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Similar projects ---- */}
        {similar.length > 0 && (
          <section data-testid="venture-similar" className="relative isolate pt-10 animate-fade-up">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0"><Sparkles className="w-5 h-5" /></span>
              <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-800">مشاريع مشابهة قد تعجبك</h2>
              <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
              <Link to="/ventures" className="text-sm font-extrabold ft-text-accent hover:underline pressable inline-flex items-center min-h-[44px]">كل المشاريع</Link>
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {similar.slice(0, 4).map((s) => {
                const SIcon = CATEGORY_ICONS[s.category] || Rocket;
                const sGrad = CATEGORY_GRAD[s.category] || "from-slate-500 to-slate-600";
                return (
                  <Link key={s.id} to={`/ventures/${s.id}`}
                    className="group relative isolate overflow-hidden bg-white rounded-[1.6rem] border border-slate-100 ft-shadow flex flex-col transition-shadow duration-300 hover:ring-2 ft-ring-accent hover:shadow-[0_24px_50px_-16px_color-mix(in_srgb,var(--ft-accent)_35%,transparent)]">
                    <div className={`relative isolate h-24 shrink-0 overflow-hidden bg-gradient-to-l ${sGrad}`}>
                      <SIcon className="pointer-events-none absolute -left-4 -bottom-7 w-28 h-28 text-white/20 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                      <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2">
                        {s.status_label ? (
                          <Badge variant="outline" className={`${STATUS_COLORS[s.status] || ""} rounded-full font-bold backdrop-blur shadow-sm`}>
                            <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[s.status] || "bg-slate-300"}`} />
                            {s.status_label}
                          </Badge>
                        ) : <span />}
                        <span className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md text-white flex items-center justify-center shadow"><SIcon className="w-5 h-5" /></span>
                      </div>
                      <div className={`absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-l ${STATUS_RIBBON[s.status] || "from-slate-300 to-slate-200"}`} />
                    </div>
                    <div className="relative px-5 py-4 flex flex-col flex-1">
                      <h3 className="font-head font-extrabold text-slate-800 leading-snug line-clamp-2 group-hover:ft-text-accent transition-colors">{s.title}</h3>
                      <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-400">
                        {s.category && <span className="ft-chip rounded-full px-2.5 py-1">{s.category}</span>}
                        {typeof s.team_count === "number" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1"><Users className="w-3 h-3" /> {s.team_count}{typeof s.max_members === "number" ? `/${s.max_members}` : ""}</span>
                        )}
                        {typeof s.votes_count === "number" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 text-rose-500 px-2.5 py-1"><Heart className="w-3 h-3" /> {s.votes_count}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky action bar · mirrors the in-card logic, phones only */}
      <div className="fixed bottom-0 inset-x-0 z-[45] lg:hidden pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="pointer-events-auto relative overflow-hidden mx-3 mb-3 rounded-[1.75rem] border border-white/60 bg-white/85 backdrop-blur-xl shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] p-2 flex items-center gap-2">
          <span className="pointer-events-none absolute inset-x-8 top-0 h-0.5 ft-grad-bar opacity-80 rounded-full" />
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
