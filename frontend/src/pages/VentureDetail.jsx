import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone, Rocket, Search, Info, CalendarDays, Loader2, Code, Briefcase, FlaskConical, Leaf, BookOpen, Palette, Target, MessageCircle, Send, Bell, BellRing, Sparkles, Share2 } from "lucide-react";
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

const AVATAR_GRADS = [
  "from-blue-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-fuchsia-500 to-purple-500",
];
const avatarGrad = (name) => AVATAR_GRADS[((name || "؟").trim().charCodeAt(0) || 0) % AVATAR_GRADS.length];

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

  const shareProject = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: v.title, url }); } catch {}
      return;
    }
    try { await navigator.clipboard.writeText(url); toast.success("تم نسخ رابط المشروع 🔗"); }
    catch { toast.error("تعذّر نسخ الرابط"); }
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
  const RING_R = 26;
  const RING_C = 2 * Math.PI * RING_R;

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

  // Primary contextual action · calm inline button row, never floating
  const joinAction = !user ? (
    <Button onClick={() => nav("/login")} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-6 pressable">
      <UserPlus className="w-4 h-4 ml-1.5" /> سجّل الدخول للانضمام
    </Button>
  ) : v.is_owner ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-600 px-4 min-h-[48px] text-sm font-bold">👑 هذا مشروعك</span>
  ) : v.is_member ? (
    <Button variant="outline" onClick={() => setConfirmAction("leave")} className="rounded-full font-bold min-h-[48px] px-6 pressable text-slate-600">
      <UserMinus className="w-4 h-4 ml-1.5" /> مغادرة الفريق
    </Button>
  ) : v.request_pending ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-4 min-h-[48px] text-sm font-bold">⏳ طلبك قيد مراجعة صاحب المشروع</span>
  ) : v.team_count >= v.max_members ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-500 px-4 min-h-[48px] text-sm font-bold">اكتمل عدد الفريق</span>
  ) : (
    <Button onClick={() => setJoinOpen(true)} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-7 pressable">
      <UserPlus className="w-4 h-4 ml-1.5" /> انضم للفريق
    </Button>
  );

  const teamAction = !user ? (
    <Button onClick={() => nav("/login")} className="w-full rounded-full ft-btn-primary text-white font-bold min-h-[48px] pressable"><UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام</Button>
  ) : v.is_owner ? (
    <p className="text-sm text-slate-400">هذا مشروعك · راجع طلبات الانضمام في الأعلى 👆</p>
  ) : v.is_member ? (
    <Button variant="outline" onClick={() => setConfirmAction("leave")} className="w-full rounded-full text-slate-500 font-bold pressable min-h-[48px]"><UserMinus className="w-4 h-4 ml-1" /> مغادرة الفريق</Button>
  ) : v.request_pending ? (
    <Badge variant="outline" className="w-full justify-center rounded-full bg-amber-50 text-amber-700 border-amber-200 px-4 py-3 font-bold">⏳ طلبك قيد مراجعة صاحب المشروع</Badge>
  ) : v.team_count >= v.max_members ? (
    <Badge variant="outline" className="w-full justify-center rounded-full bg-slate-100 text-slate-500 border-slate-200 px-4 py-3 font-bold">اكتمل عدد الفريق</Badge>
  ) : (
    <Button onClick={() => setJoinOpen(true)} className="w-full rounded-full ft-btn-primary text-white font-bold min-h-[48px] pressable">
      <UserPlus className="w-4 h-4 ml-1.5" /> اطلب الانضمام للفريق
    </Button>
  );

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* ============ QUIET HEADER ============ */}
        <section data-testid="venture-hero" className="pt-6 sm:pt-10 animate-fade-up">
          <div className="flex items-center gap-2">
            <Link to="/ventures" className="inline-flex items-center gap-1.5 min-h-[40px] rounded-full px-3 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 pressable transition-colors">
              <ArrowRight className="w-4 h-4" /> كل المشاريع
            </Link>
            <span className="flex-1" />
            <button onClick={shareProject} aria-label="مشاركة المشروع"
              className="pressable w-10 h-10 rounded-full border border-slate-200 grid place-items-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            <BookmarkButton kind="venture" refId={v.id} title={v.title} />
          </div>

          <div className="mt-8 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full font-bold`}>
              <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
              {v.status_label}
            </Badge>
            <Badge variant="secondary" className="rounded-full font-bold">
              <CategoryIcon className="w-3.5 h-3.5 ml-1" /> {v.category}
            </Badge>
            {v.is_owner && <Badge className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold">مشروعك 👑</Badge>}
          </div>

          <h1 className="font-head text-4xl leading-[1.15] sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mt-4 max-w-3xl">{v.title}</h1>

          <div className="mt-5 flex items-center gap-2.5 flex-wrap text-sm text-slate-500">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>
                {(v.owner_name || "؟").trim().charAt(0)}
              </span>
              <span className="font-bold text-slate-700 truncate">{v.owner_name}</span>
            </span>
            {v.school_name && <span className="inline-flex items-center gap-1">· 🏫 {v.school_name}</span>}
            {v.created_at && (
              <span className="inline-flex items-center gap-1">
                · <CalendarDays className="w-3.5 h-3.5" /> {new Date(v.created_at).toLocaleDateString("ar")}
              </span>
            )}
            {followOk && followersCount > 0 && (
              <span className="inline-flex items-center gap-1">· <Bell className="w-3.5 h-3.5" /> {followersCount} متابِع</span>
            )}
          </div>

          {/* calm action row */}
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {joinAction}
            <button onClick={vote} disabled={voting}
              className={`pressable inline-flex items-center gap-2 rounded-full px-6 min-h-[48px] text-sm font-bold border transition-all disabled:opacity-60 ${v.voted ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600" : "bg-white border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600"}`}>
              <Heart className={`w-4 h-4 ${v.voted ? "fill-current" : ""}`} /> {v.votes_count} · صوّت
            </button>
            {followOk && (
              <button onClick={toggleFollow} disabled={followBusy}
                className={`pressable inline-flex items-center gap-2 rounded-full px-5 min-h-[48px] text-sm font-bold border transition-all disabled:opacity-60 ${following ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {followBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : following ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {following ? "تتابعه" : "تابع المشروع"}
              </button>
            )}
          </div>

          {/* quiet numbers + thin progress */}
          <div className="mt-9 border-y border-slate-100 py-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-head text-xl font-extrabold text-slate-900 tabular-nums">{v.team_count || 0}/{v.max_members || 0}</span>
                <span className="text-xs font-bold text-slate-400">أعضاء الفريق</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-head text-xl font-extrabold text-slate-900 tabular-nums">{v.votes_count || 0}</span>
                <span className="text-xs font-bold text-slate-400">صوت</span>
              </span>
              {milestones !== null && milestones.length > 0 && (
                <span className="inline-flex items-baseline gap-1.5">
                  <span className="font-head text-xl font-extrabold text-slate-900 tabular-nums">{msPct}%</span>
                  <span className="text-xs font-bold text-slate-400">إنجاز المراحل</span>
                </span>
              )}
              <span className="inline-flex items-baseline gap-1.5">
                <span className="font-head text-xl font-extrabold text-slate-900 tabular-nums">{seatsLeft > 0 ? seatsLeft : 0}</span>
                <span className="text-xs font-bold text-slate-400">{seatsLeft > 0 ? "مقاعد متبقية" : "اكتمل الفريق"}</span>
              </span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-xl">
              <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${teamPct}%` }} />
            </div>
          </div>
        </section>

        {/* ============ BODY · single calm column ============ */}
        <div className="mx-auto w-full max-w-3xl">
          {/* قصة المشروع */}
          <section className="pt-10 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <h2 className="font-head font-extrabold text-lg text-slate-900">قصة المشروع</h2>
            <p className="mt-4 text-slate-600 leading-[2] whitespace-pre-wrap text-base sm:text-lg">{v.description}</p>
            {v.looking_for && (
              <div className="mt-6 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3.5 text-sm text-violet-900 flex items-start gap-2.5">
                <Search className="w-4 h-4 text-violet-500 shrink-0 mt-1" />
                <p className="leading-relaxed"><span className="font-extrabold">يبحث الفريق عن:</span> {v.looking_for}</p>
              </div>
            )}
            {canManage && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="outline" onClick={openEdit} className="rounded-full pressable min-h-[44px] font-bold text-slate-600"><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
                <Button variant="outline" onClick={() => setUpdOpen(true)} className="rounded-full pressable min-h-[44px] font-bold text-slate-600"><Megaphone className="w-4 h-4 ml-1" /> تحديث تقدّم</Button>
                <Button variant="outline" onClick={() => setConfirmAction("delete")} className="rounded-full text-red-600 hover:text-red-700 hover:bg-rose-50 hover:border-rose-200 pressable min-h-[44px] font-bold"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>
              </div>
            )}
          </section>

          {/* طلبات الانضمام */}
          {v.is_owner && (v.join_requests || []).length > 0 && (
            <section className="pt-12 animate-fade-up" style={{ animationDelay: "90ms" }}>
              <div className="border-t border-slate-100 pt-10">
                <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  طلبات الانضمام
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold">{v.join_requests.length}</span>
                </h2>
                <div className="mt-5 divide-y divide-slate-100">
                  {v.join_requests.map((r) => {
                    const approving = busyKey === `decide:${r.id}:approve`;
                    const rejecting = busyKey === `decide:${r.id}:reject`;
                    const deciding = approving || rejecting;
                    return (
                      <div key={r.id} className="py-4 flex items-start gap-3 flex-wrap">
                        <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(r.name)} text-white text-sm font-extrabold flex items-center justify-center shrink-0`}>{(r.name || "؟").trim().charAt(0)}</span>
                        <div className="flex-1 min-w-[180px]">
                          <div className="font-bold text-slate-800 text-sm">{r.name}</div>
                          {r.message && <p className="mt-1 text-sm text-slate-500 leading-relaxed">"{r.message}"</p>}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" disabled={deciding} onClick={() => decide(r.id, true)} className="rounded-full ft-btn-primary text-white font-bold pressable min-h-[40px] px-4 disabled:opacity-60">
                            {approving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Check className="w-4 h-4 ml-1" />} قبول
                          </Button>
                          <Button size="sm" variant="outline" disabled={deciding} onClick={() => decide(r.id, false)} className="rounded-full font-bold pressable min-h-[40px] px-4 text-slate-500 disabled:opacity-60">
                            {rejecting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <X className="w-4 h-4 ml-1" />} رفض
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* المعالم · قائمة بسيطة */}
          {milestones !== null && (milestones.length > 0 || canTeam) && (
            <section data-testid="venture-milestones" className="pt-12 animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="border-t border-slate-100 pt-10">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h2 className="font-head font-extrabold text-lg text-slate-900">المعالم</h2>
                  {milestones.length > 0 && (
                    <span className="text-xs font-bold text-slate-400 tabular-nums">{msDoneCount} من {milestones.length} منجزة · {msPct}%</span>
                  )}
                </div>
                {milestones.length > 0 && (
                  <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${msPct}%` }} />
                  </div>
                )}
                {milestones.length > 0 ? (
                  <div className="mt-4 divide-y divide-slate-100">
                    {milestones.map((m, i) => {
                      const done = msIsDone(m);
                      const box = (
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "ft-grad-bar border-transparent text-white" : "border-slate-300 bg-white"}`}>
                          {done && <Check className="w-3.5 h-3.5" />}
                        </span>
                      );
                      return (
                        <div key={m.id || i} className="py-3.5 flex items-center gap-3">
                          {canTeam ? (
                            <button onClick={() => toggleMilestone(m)} aria-label={done ? "إلغاء إنجاز المرحلة" : "تعليم المرحلة كمنجزة"} className="pressable shrink-0 rounded-full">
                              {box}
                            </button>
                          ) : (
                            <span className="shrink-0">{box}</span>
                          )}
                          <span className={`flex-1 min-w-0 text-sm sm:text-base leading-relaxed ${done ? "line-through text-slate-400" : "font-bold text-slate-700"}`}>{msTitle(m)}</span>
                          {done && <span className="shrink-0 text-[11px] font-bold text-emerald-600">منجزة</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">لا مراحل بعد · أضف أول مرحلة لتتبّع تقدّم المشروع خطوة بخطوة 🎯</p>
                )}
                {canTeam && (
                  <div className="mt-5 flex items-center gap-2">
                    <Input value={msInput} onChange={(e) => setMsInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                      placeholder="أضف مرحلة جديدة · مثال: إطلاق النموذج الأولي" className="rounded-full min-h-[48px] text-base flex-1 min-w-0" maxLength={120} />
                    <Button onClick={addMilestone} disabled={msBusy || msInput.trim().length < 2} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-5 pressable shrink-0 disabled:opacity-60">
                      {msBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> إضافة</>}
                    </Button>
                  </div>
                )}
                {!canTeam && milestones.length > 0 && (
                  <p className="mt-3 text-[11px] font-bold text-slate-400">يحدّث فريق المشروع هذه المراحل أولاً بأول</p>
                )}
              </div>
            </section>
          )}

          {/* التحديثات */}
          {(v.updates || []).length > 0 && (
            <section className="pt-12 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <div className="border-t border-slate-100 pt-10">
                <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  التحديثات
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-extrabold">{v.updates.length}</span>
                </h2>
                <div className="mt-5 divide-y divide-slate-100">
                  {v.updates.map((u, i) => (
                    <article key={u.id || i} className="py-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGrad(u.author_name)} text-white text-[10px] font-extrabold flex items-center justify-center shrink-0`}>{(u.author_name || "؟").trim().charAt(0)}</span>
                        <span className="text-xs font-bold text-slate-500">{u.author_name}</span>
                        {u.created_at && <span className="text-[11px] text-slate-400">· {new Date(u.created_at).toLocaleDateString("ar")}</span>}
                      </div>
                      <h3 className="mt-2.5 font-extrabold text-slate-800">{u.title}</h3>
                      <p className="mt-1.5 text-sm sm:text-base text-slate-600 leading-[1.9] whitespace-pre-wrap">{u.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* التعليقات */}
          {comments !== null && (
            <section data-testid="venture-comments" className="pt-12 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="border-t border-slate-100 pt-10">
                <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  التعليقات
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-extrabold">{comments.length}</span>
                </h2>
                {comments.length > 0 ? (
                  <div className="mt-6 space-y-6">
                    {comments.map((c, i) => {
                      const cName = c.author_name || c.user_name || c.name || "عضو";
                      return (
                        <div key={c.id || i} className="flex items-start gap-3">
                          <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(cName)} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>{(cName || "؟").trim().charAt(0)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-800">{cName}</span>
                              {c.created_at && <span className="text-[11px] text-slate-400">{new Date(c.created_at).toLocaleDateString("ar")}</span>}
                              <span className="flex-1" />
                              {canDeleteComment(c) && (
                                <button onClick={() => deleteComment(c)} aria-label="حذف التعليق"
                                  className="pressable shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-sm sm:text-base text-slate-600 leading-[1.9] whitespace-pre-wrap">{c.text || c.body || ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">لا تعليقات بعد · شارك رأيك وشجّع الفريق 💬</p>
                )}
                {user ? (
                  <div className="mt-8 flex items-start gap-3">
                    <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(user.name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>{(user.name || "أ").trim().charAt(0)}</span>
                    <div className="flex-1 min-w-0">
                      <Textarea value={cInput} onChange={(e) => setCInput(e.target.value)}
                        placeholder="اكتب تعليقك هنا · كلمة تشجيع أو فكرة تساعد الفريق" className="rounded-2xl text-base min-h-[72px]" maxLength={1000} />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-400 tabular-nums">{cInput.length}/1000</span>
                        <Button onClick={addComment} disabled={cBusy || !cInput.trim()} className="rounded-full ft-btn-primary text-white font-bold min-h-[44px] px-5 pressable disabled:opacity-60">
                          {cBusy ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ النشر...</> : <><Send className="w-4 h-4 ml-1.5" /> نشر التعليق</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <Button onClick={() => nav("/login")} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-6 pressable">
                      <MessageCircle className="w-4 h-4 ml-1.5" /> سجّل الدخول للتعليق
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ============ TEAM · simple card below content ============ */}
        <div className="mx-auto w-full max-w-3xl">
          <section data-testid="venture-team" className="pt-12 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <div className="border-t border-slate-100 pt-10">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h2 className="font-head font-extrabold text-lg text-slate-900">الفريق</h2>
                <span className="text-xs font-bold text-slate-400 tabular-nums">{v.team_count}/{v.max_members} · {seatsLeft > 0 ? `متبقّي ${seatsLeft} ${seatsLeft === 1 ? "مقعد" : "مقاعد"}` : "اكتمل الفريق"}</span>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <div className="py-3 flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>{(v.owner_name || "؟").trim().charAt(0)}</span>
                  <span className="flex-1 min-w-0 truncate text-sm font-extrabold text-slate-800">{v.owner_name}</span>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">👑 صاحب المشروع</span>
                </div>
                {(v.members || []).map((m) => (
                  <div key={m.id} className="py-3 flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(m.name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0`}>{(m.name || "؟").trim().charAt(0)}</span>
                    <span className="flex-1 min-w-0 truncate text-sm font-bold text-slate-700">{m.name}</span>
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">عضو</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">{teamAction}</div>

              {followOk && (
                <div className="mt-8 border-t border-slate-100 pt-6 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm font-extrabold text-slate-800">متابعة المشروع</div>
                    <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">يصلك إشعار عند نشر تحديث أو إنجاز مرحلة · {followersCount} متابِع</p>
                  </div>
                  {user ? (
                    <Button data-testid="venture-follow-btn" onClick={toggleFollow} disabled={followBusy}
                      className={`rounded-full font-bold min-h-[44px] px-5 pressable disabled:opacity-60 ${following ? "bg-slate-900 text-white hover:bg-slate-800" : "ft-btn-primary text-white"}`}>
                      {followBusy
                        ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ التحديث...</>
                        : following
                          ? <><BellRing className="w-4 h-4 ml-1.5" /> تتابع هذا المشروع · إلغاء</>
                          : <><Bell className="w-4 h-4 ml-1.5" /> تابع المشروع</>}
                    </Button>
                  ) : (
                    <Button onClick={() => nav("/login")} className="rounded-full ft-btn-primary text-white font-bold min-h-[44px] px-5 pressable">
                      <Bell className="w-4 h-4 ml-1.5" /> سجّل الدخول للمتابعة
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="divide-y divide-slate-50">
                  {statRows.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 py-2">
                      <r.icon className="w-4 h-4 text-slate-300 shrink-0" />
                      <span className="flex-1 text-sm text-slate-500">{r.label}</span>
                      <span className="font-head font-extrabold text-slate-800 tabular-nums text-sm">{r.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={shareProject}
                  className="pressable mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 text-slate-500 font-bold text-sm min-h-[44px] hover:bg-slate-50 transition-colors">
                  <Share2 className="w-4 h-4" /> مشاركة المشروع
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ============ SIMILAR · minimal cards ============ */}
        {similar.length > 0 && (
          <section data-testid="venture-similar" className="pt-14 animate-fade-up" style={{ animationDelay: "280ms" }}>
            <div className="border-t border-slate-100 pt-10">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="font-head font-extrabold text-lg text-slate-900">مشاريع مشابهة</h2>
                <span className="flex-1" />
                <Link to="/ventures" className="text-sm font-bold ft-text-accent hover:underline pressable inline-flex items-center min-h-[40px]">كل المشاريع</Link>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similar.slice(0, 3).map((s) => {
                  const SIcon = CATEGORY_ICONS[s.category] || Rocket;
                  return (
                    <Link key={s.id} to={`/ventures/${s.id}`}
                      className="group rounded-3xl border border-slate-200/80 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${CATEGORY_GRAD[s.category] || "from-slate-500 to-slate-600"} text-white flex items-center justify-center shrink-0`}>
                          <SIcon className="w-4 h-4" />
                        </span>
                        {s.category && <span className="text-[11px] font-bold text-slate-400">{s.category}</span>}
                        <span className="flex-1" />
                        {s.status_label && (
                          <span className="inline-flex items-center text-[11px] font-bold text-slate-400">
                            <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[s.status] || "bg-slate-300"}`} />
                            {s.status_label}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3.5 font-head font-extrabold text-slate-800 leading-snug line-clamp-2 group-hover:ft-text-accent transition-colors">{s.title}</h3>
                      <div className="mt-3.5 flex items-center gap-3 text-[11px] font-bold text-slate-400">
                        {typeof s.team_count === "number" && (
                          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {s.team_count}{typeof s.max_members === "number" ? `/${s.max_members}` : ""}</span>
                        )}
                        {typeof s.votes_count === "number" && (
                          <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {s.votes_count}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!o && !busyKey) setConfirmAction(null); }}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center shrink-0 ${confirmAction === "delete" ? "bg-gradient-to-br from-rose-500 to-red-500" : "bg-gradient-to-br from-slate-500 to-slate-600"}`}>
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
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={busyKey === "leave" || busyKey === "delete"} className="rounded-full pressable min-h-[48px] px-5 font-bold">
              إلغاء
            </Button>
            {confirmAction === "delete" ? (
              <Button onClick={remove} disabled={busyKey === "delete"} className="rounded-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold pressable min-h-[48px] px-5 disabled:opacity-60">
                {busyKey === "delete" ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ الحذف...</> : <><Trash2 className="w-4 h-4 ml-1" /> حذف نهائياً</>}
              </Button>
            ) : (
              <Button onClick={leave} disabled={busyKey === "leave"} className="rounded-full bg-slate-700 hover:bg-slate-800 text-white font-extrabold pressable min-h-[48px] px-5 disabled:opacity-60">
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
              <span className="w-11 h-11 rounded-2xl ft-icon-tile text-white flex items-center justify-center shrink-0">
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
            <Button onClick={join} disabled={busyKey === "join"} className="w-full rounded-full ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable disabled:opacity-60">
              {busyKey === "join" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ الإرسال...</> : "أرسل الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shrink-0">
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
            <Button onClick={saveEdit} disabled={busyKey === "save"} className="w-full rounded-full ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable disabled:opacity-60">
              {busyKey === "save" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ الحفظ...</> : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updOpen} onOpenChange={setUpdOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl ft-icon-tile text-white flex items-center justify-center shrink-0">
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
            <Button onClick={addUpdate} disabled={busyKey === "update"} className="w-full rounded-full ft-btn-primary text-white font-extrabold text-base min-h-[52px] pressable disabled:opacity-60">
              {busyKey === "update" ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ النشر...</> : "انشر التحديث"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
