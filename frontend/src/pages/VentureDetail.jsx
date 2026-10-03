import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowRight, UserPlus, UserMinus, Check, X, Plus, Pencil, Trash2, Megaphone, Rocket, Search, Info, CalendarDays, Loader2, Code, Briefcase, FlaskConical, Leaf, BookOpen, Palette, Target, MessageCircle, Send, Bell, BellRing, Sparkles, Share2, Crown } from "lucide-react";
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
  const [tab, setTab] = useState("story");
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
  const updatesCount = (v.updates || []).length;
  const msDoneCount = (milestones || []).filter(msIsDone).length;
  const msPct = milestones && milestones.length ? Math.round((msDoneCount / milestones.length) * 100) : 0;
  const commentsShown = typeof v.comments_count === "number" ? v.comments_count : (comments ? comments.length : 0);
  const RING_R = 26;
  const RING_C = 2 * Math.PI * RING_R;

  const statRows = [
    { icon: Heart, label: "الأصوات", value: v.votes_count || 0 },
    { icon: Megaphone, label: "التحديثات", value: updatesCount },
    ...(comments !== null || typeof v.comments_count === "number" ? [{ icon: MessageCircle, label: "التعليقات", value: commentsShown }] : []),
    ...(followOk ? [{ icon: Bell, label: "المتابعون", value: followersCount }] : []),
    ...(milestones !== null ? [{ icon: Target, label: "المراحل المنجزة", value: `${msDoneCount}/${milestones.length}` }] : []),
    ...(v.created_at ? [{ icon: CalendarDays, label: "تاريخ الإنشاء", value: new Date(v.created_at).toLocaleDateString("ar") }] : []),
  ];

  // ---- content tabs (data stays mounted via state · panels switch visually) ----
  const tabsAvail = [
    { k: "story", l: "القصة", icon: BookOpen },
    ...(milestones !== null && (milestones.length > 0 || canTeam) ? [{ k: "milestones", l: "المعالم", icon: Target, count: milestones.length }] : []),
    ...(updatesCount > 0 ? [{ k: "updates", l: "التحديثات", icon: Megaphone, count: updatesCount }] : []),
    ...(comments !== null ? [{ k: "comments", l: "التعليقات", icon: MessageCircle, count: comments.length }] : []),
  ];
  const activeTab = tabsAvail.some((t) => t.k === tab) ? tab : "story";

  // Primary contextual action inside the hero ACTION DOCK (static inline · never floating)
  const dockJoinAction = !user ? (
    <Button onClick={() => nav("/login")} className="rounded-full bg-white text-slate-900 font-extrabold text-base min-h-[54px] px-7 pressable shadow-xl hover:bg-slate-50">
      <UserPlus className="w-5 h-5 ml-1.5" /> سجّل الدخول للانضمام
    </Button>
  ) : v.is_owner ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/25 backdrop-blur-md px-5 min-h-[54px] text-sm font-extrabold">👑 هذا مشروعك · تابع طلبات الانضمام بالأسفل</span>
  ) : v.is_member ? (
    <Button variant="outline" onClick={() => setConfirmAction("leave")} className="rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-md font-extrabold text-base min-h-[54px] px-7 pressable">
      <UserMinus className="w-5 h-5 ml-1.5" /> مغادرة الفريق
    </Button>
  ) : v.request_pending ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/90 text-amber-950 px-5 min-h-[54px] text-sm font-extrabold shadow-lg shadow-amber-950/20">⏳ طلبك قيد مراجعة صاحب المشروع</span>
  ) : v.team_count >= v.max_members ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/25 backdrop-blur-md px-5 min-h-[54px] text-sm font-extrabold">اكتمل عدد الفريق</span>
  ) : (
    <Button onClick={() => setJoinOpen(true)} className="rounded-full ft-btn-primary font-extrabold text-base min-h-[54px] px-8 pressable shadow-2xl border border-white/25">
      <UserPlus className="w-5 h-5 ml-1.5" /> انضم للفريق
    </Button>
  );

  const teamAction = !user ? (
    <Button onClick={() => nav("/login")} className="w-full rounded-full ft-btn-primary text-white font-bold min-h-[48px] pressable"><UserPlus className="w-4 h-4 ml-1" /> سجّل الدخول للانضمام</Button>
  ) : v.is_owner ? (
    <p className="text-sm text-slate-400">هذا مشروعك · راجع طلبات الانضمام في تبويب «القصة» 👆</p>
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
      <div className="mx-auto w-full max-w-7xl xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 pb-28">
        {/* ============ IMMERSIVE HERO ============ */}
        <section data-testid="venture-hero" className="relative isolate overflow-hidden rounded-[2rem] sm:rounded-[2.75rem] text-white ft-shadow-lg mt-4 sm:mt-6 animate-fade-up">
          <div className={`absolute inset-0 bg-gradient-to-bl ${catGrad}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/5" />
          {/* animated mesh blobs */}
          <div className="pointer-events-none absolute -top-24 right-[10%] w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/20 blur-3xl animate-pulse [animation-duration:6s]" />
          <div className="pointer-events-none absolute -bottom-40 left-[15%] w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-slate-950/40 blur-3xl animate-pulse [animation-duration:9s]" />
          <div className="pointer-events-none absolute top-1/3 left-[45%] w-40 h-40 rounded-full bg-white/10 blur-2xl animate-pulse [animation-duration:7s]" />
          {/* floating watermark icon + grain dots */}
          <CategoryIcon className="pointer-events-none absolute -left-10 -bottom-14 w-64 h-64 sm:w-96 sm:h-96 lg:w-[30rem] lg:h-[30rem] text-white/10 -rotate-12 animate-float [animation-duration:11s]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1.6px)] [background-size:22px_22px]" />
          <span className="pointer-events-none absolute top-24 left-[10%] hidden sm:block"><Sparkles className="w-7 h-7 text-white/25 animate-float [animation-duration:7s]" /></span>

          <div className="relative px-5 pt-5 pb-24 sm:px-10 sm:pt-7 sm:pb-28 lg:px-12">
            {/* glass top chips row */}
            <div className="flex items-center gap-2">
              <Link to="/ventures" className="pressable inline-flex items-center gap-1.5 min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md px-4 text-sm font-bold text-white transition-colors">
                <ArrowRight className="w-4 h-4" /> كل المشاريع
              </Link>
              <span className="flex-1" />
              <button onClick={shareProject} aria-label="مشاركة المشروع"
                className="pressable w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md grid place-items-center text-white transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <span className="rounded-full bg-white/10 border border-white/25 backdrop-blur-md p-1">
                <BookmarkButton kind="venture" refId={v.id} title={v.title} className="text-white" />
              </span>
            </div>

            {/* glass chips */}
            <div className="mt-8 sm:mt-10 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full bg-white/15 border border-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-extrabold text-white`}>
                <span className={`w-2 h-2 rounded-full ml-1.5 ${STATUS_DOT[v.status] || "bg-slate-300"} animate-pulse`} />
                {v.status_label}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-extrabold text-white">
                <CategoryIcon className="w-3.5 h-3.5 ml-1.5" /> {v.category}
              </span>
              {v.is_owner && (
                <span className="inline-flex items-center rounded-full bg-gradient-to-l from-amber-300 to-yellow-400 text-amber-950 px-3.5 py-1.5 text-xs font-extrabold shadow-lg shadow-amber-950/20">
                  <Crown className="w-3.5 h-3.5 ml-1.5" /> مشروعك
                </span>
              )}
            </div>

            {/* GIANT display title */}
            <h1 className="font-head text-4xl leading-[1.12] sm:text-6xl lg:text-7xl font-extrabold mt-5 max-w-4xl drop-shadow-sm">{v.title}</h1>

            {/* owner glass card + meta */}
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-3 rounded-full bg-white/10 border border-white/25 backdrop-blur-md py-1.5 pl-2 pr-4 shadow-lg">
                <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white/40`}>
                  {(v.owner_name || "؟").trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-extrabold leading-tight truncate">{v.owner_name} <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" /></span>
                  {v.school_name && <span className="block text-[11px] text-white/70 leading-tight truncate">🏫 {v.school_name}</span>}
                </span>
              </span>
              {v.created_at && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/75">
                  <CalendarDays className="w-3.5 h-3.5" /> {new Date(v.created_at).toLocaleDateString("ar")}
                </span>
              )}
              {followOk && followersCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/75">
                  <Bell className="w-3.5 h-3.5" /> {followersCount} متابِع
                </span>
              )}
            </div>

            {/* ACTION DOCK · static inline inside hero */}
            <div className="mt-8 flex flex-wrap items-center gap-2.5 rounded-[1.75rem] sm:rounded-full bg-slate-950/35 border border-white/20 backdrop-blur-xl p-2.5 shadow-2xl w-fit max-w-full">
              {dockJoinAction}
              <button onClick={vote} disabled={voting}
                className={`pressable inline-flex items-center gap-2 rounded-full px-6 min-h-[54px] text-base font-extrabold border transition-all disabled:opacity-60 ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 border-rose-300/50 text-white shadow-lg shadow-rose-950/30" : "bg-white/10 border-white/25 text-white hover:bg-white/20 backdrop-blur-md"}`}>
                <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} />
                <span className="tabular-nums">{v.votes_count || 0}</span> صوّت
              </button>
              {followOk && (
                <button onClick={toggleFollow} disabled={followBusy}
                  className={`pressable inline-flex items-center gap-2 rounded-full px-6 min-h-[54px] text-base font-extrabold border transition-all disabled:opacity-60 ${following ? "bg-white border-white text-slate-900 shadow-lg" : "bg-white/10 border-white/25 text-white hover:bg-white/20 backdrop-blur-md"}`}>
                  {followBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : following ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  {following ? "تتابعه" : "تابع"}
                </button>
              )}
            </div>
          </div>
          <div className={`absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-white/40 to-white/10"}`} />
        </section>

        {/* ============ STATS BENTO · overlapping the hero edge ============ */}
        <div className="relative z-10 -mt-14 sm:-mt-16 px-1 sm:px-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* team */}
            <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400">
                <span className={`w-8 h-8 rounded-xl bg-gradient-to-br ${catGrad} text-white grid place-items-center shrink-0`}><Users className="w-4 h-4" /></span>
                <span className="text-xs font-extrabold">الفريق</span>
              </div>
              <div className="mt-3 font-head text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{v.team_count || 0}<span className="text-slate-300 text-lg">/{v.max_members || 0}</span></div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${teamPct}%` }} />
              </div>
              <div className="mt-2 text-[11px] font-bold text-slate-400">{seatsLeft > 0 ? `متبقّي ${seatsLeft} ${seatsLeft === 1 ? "مقعد" : "مقاعد"}` : "اكتمل الفريق 🎉"}</div>
            </div>
            {/* votes */}
            <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white grid place-items-center shrink-0"><Heart className="w-4 h-4" /></span>
                <span className="text-xs font-extrabold">الأصوات</span>
              </div>
              <div className="mt-3 font-head text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{v.votes_count || 0}</div>
              <div className="mt-3 text-[11px] font-bold text-slate-400 leading-relaxed">صوت داعم من مجتمع النادي 💪</div>
            </div>
            {/* milestones ring / updates fallback */}
            {milestones !== null && milestones.length > 0 ? (
              <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5 flex items-center gap-4">
                <span className="relative w-[68px] h-[68px] shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" className="stroke-slate-100" />
                    <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" strokeLinecap="round"
                      stroke="url(#vdMsGrad)" strokeDasharray={RING_C}
                      strokeDashoffset={RING_C - (msPct / 100) * RING_C}
                      className="transition-all duration-700" />
                    <defs>
                      <linearGradient id="vdMsGrad" x1="0" y1="0" x2="64" y2="64">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0d9488" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 grid place-items-center font-head text-sm font-extrabold text-slate-900 tabular-nums">{msPct}%</span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400"><Target className="w-3.5 h-3.5" /> إنجاز المراحل</span>
                  <span className="block mt-1.5 text-sm font-bold text-slate-600 tabular-nums">{msDoneCount} من {milestones.length} مراحل منجزة</span>
                </span>
              </div>
            ) : (
              <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white grid place-items-center shrink-0"><Megaphone className="w-4 h-4" /></span>
                  <span className="text-xs font-extrabold">التحديثات</span>
                </div>
                <div className="mt-3 font-head text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{updatesCount}</div>
                <div className="mt-3 text-[11px] font-bold text-slate-400 leading-relaxed">تحديث نشره الفريق حتى الآن</div>
              </div>
            )}
            {/* followers / comments fallback */}
            {followOk ? (
              <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white grid place-items-center shrink-0"><Bell className="w-4 h-4" /></span>
                  <span className="text-xs font-extrabold">المتابعون</span>
                </div>
                <div className="mt-3 font-head text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{followersCount}</div>
                <div className="mt-3 text-[11px] font-bold text-slate-400 leading-relaxed">يتابعون تقدّم هذا المشروع 🔔</div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] bg-white/90 backdrop-blur-xl border border-white ring-1 ring-slate-900/5 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white grid place-items-center shrink-0"><MessageCircle className="w-4 h-4" /></span>
                  <span className="text-xs font-extrabold">التعليقات</span>
                </div>
                <div className="mt-3 font-head text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{commentsShown}</div>
                <div className="mt-3 text-[11px] font-bold text-slate-400 leading-relaxed">تعليقاً على هذا المشروع</div>
              </div>
            )}
          </div>
        </div>

        {/* ============ SEGMENTED TABS ============ */}
        <div className="mt-8 sm:mt-10 animate-fade-up" style={{ animationDelay: "140ms" }}>
          <div className="flex gap-1 overflow-x-auto rounded-full bg-white/85 backdrop-blur-xl border border-slate-200/70 ring-1 ring-slate-900/5 shadow-lg p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabsAvail.map((t) => {
              const on = activeTab === t.k;
              return (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`pressable shrink-0 inline-flex items-center gap-2 rounded-full px-5 min-h-[48px] text-sm font-extrabold transition-all ${on ? "ft-grad-bar text-white shadow-lg" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                  <t.icon className="w-4 h-4" /> {t.l}
                  {typeof t.count === "number" && (
                    <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-extrabold tabular-nums ${on ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ TAB PANELS ============ */}
        <div className="mt-6 sm:mt-8">
          {activeTab === "story" && (
            <div className="animate-fade-up">
              <section className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 ft-shadow-lg p-6 sm:p-10">
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 flex items-center gap-2.5">
                  <span className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${catGrad} text-white grid place-items-center shrink-0 shadow-md`}><BookOpen className="w-5 h-5" /></span>
                  قصة المشروع
                </h2>
                <p className="mt-5 text-slate-600 leading-[2.1] whitespace-pre-wrap text-base sm:text-lg max-w-3xl">{v.description}</p>
                {v.looking_for && (
                  <div className="mt-7 relative overflow-hidden rounded-[1.5rem] bg-gradient-to-l from-violet-600 via-purple-600 to-fuchsia-500 text-white p-5 sm:p-6 shadow-xl shadow-violet-200">
                    <Search className="pointer-events-none absolute -left-4 -bottom-6 w-28 h-28 text-white/15 -rotate-12" />
                    <div className="relative flex items-start gap-3">
                      <span className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 backdrop-blur grid place-items-center shrink-0"><Search className="w-5 h-5" /></span>
                      <div className="min-w-0">
                        <div className="font-head font-extrabold">يبحث الفريق عن شركاء</div>
                        <p className="mt-1 text-sm text-white/85 leading-relaxed">{v.looking_for}</p>
                      </div>
                    </div>
                  </div>
                )}
                {canManage && (
                  <div className="mt-7 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={openEdit} className="rounded-full pressable min-h-[48px] px-5 font-bold text-slate-600"><Pencil className="w-4 h-4 ml-1.5" /> تعديل</Button>
                    <Button variant="outline" onClick={() => setUpdOpen(true)} className="rounded-full pressable min-h-[48px] px-5 font-bold text-slate-600"><Megaphone className="w-4 h-4 ml-1.5" /> تحديث تقدّم</Button>
                    <Button variant="outline" onClick={() => setConfirmAction("delete")} className="rounded-full text-red-600 hover:text-red-700 hover:bg-rose-50 hover:border-rose-200 pressable min-h-[48px] px-5 font-bold"><Trash2 className="w-4 h-4 ml-1.5" /> حذف</Button>
                  </div>
                )}
              </section>

              {/* طلبات الانضمام */}
              {v.is_owner && (v.join_requests || []).length > 0 && (
                <section className="mt-6 rounded-[2rem] bg-white border border-amber-100 ft-shadow-lg p-6 sm:p-8 relative overflow-hidden">
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 to-orange-400" />
                  <h2 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white grid place-items-center shrink-0 shadow-md shadow-amber-200"><UserPlus className="w-5 h-5" /></span>
                    طلبات الانضمام
                    <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold tabular-nums">{v.join_requests.length}</span>
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {v.join_requests.map((r) => {
                      const approving = busyKey === `decide:${r.id}:approve`;
                      const rejecting = busyKey === `decide:${r.id}:reject`;
                      const deciding = approving || rejecting;
                      return (
                        <div key={r.id} className="rounded-[1.5rem] bg-amber-50/60 border border-amber-100 p-4 flex items-start gap-3 flex-wrap">
                          <span className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGrad(r.name)} text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow`}>{(r.name || "؟").trim().charAt(0)}</span>
                          <div className="flex-1 min-w-[180px]">
                            <div className="font-extrabold text-slate-800 text-sm">{r.name}</div>
                            {r.message && <p className="mt-1 text-sm text-slate-500 leading-relaxed">"{r.message}"</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" disabled={deciding} onClick={() => decide(r.id, true)} className="rounded-full ft-btn-primary text-white font-bold pressable min-h-[44px] px-5 disabled:opacity-60 shadow">
                              {approving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Check className="w-4 h-4 ml-1" />} قبول
                            </Button>
                            <Button size="sm" variant="outline" disabled={deciding} onClick={() => decide(r.id, false)} className="rounded-full font-bold pressable min-h-[44px] px-5 text-slate-500 bg-white disabled:opacity-60">
                              {rejecting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <X className="w-4 h-4 ml-1" />} رفض
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "milestones" && milestones !== null && (
            <section data-testid="venture-milestones" className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 ft-shadow-lg p-6 sm:p-10 animate-fade-up">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar" />
              <div className="flex items-center gap-4 flex-wrap">
                <span className="relative w-[76px] h-[76px] shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" className="stroke-slate-100" />
                    <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" strokeLinecap="round"
                      stroke="url(#vdMsGrad2)" strokeDasharray={RING_C}
                      strokeDashoffset={RING_C - (msPct / 100) * RING_C}
                      className="transition-all duration-700" />
                    <defs>
                      <linearGradient id="vdMsGrad2" x1="0" y1="0" x2="64" y2="64">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#0d9488" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 grid place-items-center font-head text-base font-extrabold text-slate-900 tabular-nums">{msPct}%</span>
                </span>
                <div className="min-w-0">
                  <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900">رحلة المشروع</h2>
                  <p className="mt-1 text-sm font-bold text-slate-400 tabular-nums">{msDoneCount} من {milestones.length} مراحل منجزة · كل خطوة تقرّب الفريق من الإطلاق 🎯</p>
                </div>
              </div>

              {milestones.length > 0 ? (
                <div className="relative mt-8">
                  {/* journey track */}
                  <span className="pointer-events-none absolute top-2 bottom-2 right-[19px] w-[3px] rounded-full bg-slate-100 overflow-hidden">
                    <span className="block w-full ft-grad-bar transition-all duration-700" style={{ height: `${msPct}%` }} />
                  </span>
                  <div className="space-y-2">
                    {milestones.map((m, i) => {
                      const done = msIsDone(m);
                      const isNext = !done && milestones.slice(0, i).every(msIsDone);
                      const node = (
                        <span className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${done ? "ft-grad-bar text-white shadow-lg shadow-emerald-200" : isNext ? "bg-white border-[3px] border-emerald-400 text-emerald-500 shadow-lg shadow-emerald-100 animate-pulse" : "bg-white border-2 border-slate-200 text-slate-300"}`}>
                          {done ? <Check className="w-5 h-5" /> : <span className="font-head text-xs font-extrabold tabular-nums">{i + 1}</span>}
                        </span>
                      );
                      return (
                        <div key={m.id || i} className={`flex items-center gap-4 rounded-[1.25rem] px-2 py-2 transition-colors ${done ? "" : "hover:bg-slate-50"}`}>
                          {canTeam ? (
                            <button onClick={() => toggleMilestone(m)} aria-label={done ? "إلغاء إنجاز المرحلة" : "تعليم المرحلة كمنجزة"} className="pressable shrink-0 rounded-full">
                              {node}
                            </button>
                          ) : (
                            <span className="shrink-0">{node}</span>
                          )}
                          <span className={`flex-1 min-w-0 text-base sm:text-lg leading-relaxed ${done ? "line-through text-slate-400" : "font-bold text-slate-700"}`}>{msTitle(m)}</span>
                          {done ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1 text-[11px] font-extrabold"><Check className="w-3 h-3" /> منجزة</span>
                          ) : isNext ? (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-extrabold shadow-md shadow-emerald-200">التالي</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
                  <span className="mx-auto w-14 h-14 rounded-[1.1rem] bg-white border border-slate-200 grid place-items-center text-slate-300 shadow-sm"><Target className="w-7 h-7" /></span>
                  <p className="mt-3 text-sm font-bold text-slate-500">لا مراحل بعد · أضف أول مرحلة لتتبّع تقدّم المشروع خطوة بخطوة 🎯</p>
                </div>
              )}

              {canTeam && (
                <div className="mt-7 flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/80 p-1.5 focus-within:bg-white focus-within:ring-2 ft-ring-accent transition-all">
                  <span className="w-10 h-10 rounded-full ft-grad-bar text-white grid place-items-center shrink-0 shadow"><Plus className="w-5 h-5" /></span>
                  <Input value={msInput} onChange={(e) => setMsInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                    placeholder="أضف مرحلة جديدة · مثال: إطلاق النموذج الأولي" className="border-0 bg-transparent shadow-none focus-visible:ring-0 min-h-[48px] text-base flex-1 min-w-0" maxLength={120} />
                  <Button onClick={addMilestone} disabled={msBusy || msInput.trim().length < 2} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-6 pressable shrink-0 disabled:opacity-60 shadow">
                    {msBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                  </Button>
                </div>
              )}
              {!canTeam && milestones.length > 0 && (
                <p className="mt-5 text-[11px] font-bold text-slate-400">يحدّث فريق المشروع هذه المراحل أولاً بأول</p>
              )}
            </section>
          )}

          {activeTab === "updates" && updatesCount > 0 && (
            <section className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 ft-shadow-lg p-6 sm:p-10 animate-fade-up">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar" />
              <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 text-white grid place-items-center shrink-0 shadow-md shadow-sky-200"><Megaphone className="w-5 h-5" /></span>
                تحديثات الفريق
                <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-sky-50 border border-sky-100 text-sky-600 text-xs font-extrabold tabular-nums">{v.updates.length}</span>
              </h2>
              <div className="relative mt-7">
                <span className="pointer-events-none absolute top-3 bottom-3 right-[19px] w-[3px] rounded-full bg-gradient-to-b from-sky-200 via-slate-100 to-transparent" />
                <div className="space-y-7">
                  {v.updates.map((u, i) => (
                    <article key={u.id || i} className="relative flex gap-4">
                      <span className={`relative z-10 w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(u.author_name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0 ring-4 ring-white shadow-md`}>{(u.author_name || "؟").trim().charAt(0)}</span>
                      <div className="flex-1 min-w-0 rounded-[1.5rem] bg-slate-50/80 border border-slate-100 p-4 sm:p-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-700">{u.author_name}</span>
                          {u.created_at && <span className="text-[11px] font-bold text-slate-400">· {new Date(u.created_at).toLocaleDateString("ar")}</span>}
                        </div>
                        <h3 className="mt-2 font-head font-extrabold text-slate-900">{u.title}</h3>
                        <p className="mt-1.5 text-sm sm:text-base text-slate-600 leading-[1.95] whitespace-pre-wrap">{u.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "comments" && comments !== null && (
            <section data-testid="venture-comments" className="relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 ft-shadow-lg p-6 sm:p-10 animate-fade-up">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar" />
              <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white grid place-items-center shrink-0 shadow-md shadow-amber-200"><MessageCircle className="w-5 h-5" /></span>
                نقاش المشروع
                <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-xs font-extrabold tabular-nums">{comments.length}</span>
              </h2>

              {comments.length > 0 ? (
                <div className="mt-7 space-y-5">
                  {comments.map((c, i) => {
                    const cName = c.author_name || c.user_name || c.name || "عضو";
                    return (
                      <div key={c.id || i} className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                        <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(cName)} text-white text-xs font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow`}>{(cName || "؟").trim().charAt(0)}</span>
                        <div className="flex-1 min-w-0 rounded-[1.25rem] rounded-tr-md bg-slate-50 border border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-800">{cName}</span>
                            {c.created_at && <span className="text-[11px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString("ar")}</span>}
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
                <div className="mt-7 rounded-[1.5rem] bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
                  <span className="mx-auto w-14 h-14 rounded-[1.1rem] bg-white border border-slate-200 grid place-items-center text-slate-300 shadow-sm"><MessageCircle className="w-7 h-7" /></span>
                  <p className="mt-3 text-sm font-bold text-slate-500">لا تعليقات بعد · كن أول من يشجّع الفريق 💬</p>
                </div>
              )}

              {user ? (
                <div className="mt-7 flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGrad(user.name)} text-white text-xs font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow`}>{(user.name || "أ").trim().charAt(0)}</span>
                  <div className="flex-1 min-w-0 rounded-[1.5rem] bg-white border border-slate-200 p-2 shadow-sm focus-within:ring-2 ft-ring-accent transition-all">
                    <Textarea value={cInput} onChange={(e) => setCInput(e.target.value)}
                      placeholder="اكتب تعليقك هنا · كلمة تشجيع أو فكرة تساعد الفريق" className="border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-2xl text-base min-h-[72px]" maxLength={1000} />
                    <div className="flex items-center justify-between gap-3 px-2 pb-1">
                      <span className="text-[11px] font-bold text-slate-400 tabular-nums">{cInput.length}/1000</span>
                      <Button onClick={addComment} disabled={cBusy || !cInput.trim()} className="rounded-full ft-btn-primary text-white font-bold min-h-[48px] px-6 pressable disabled:opacity-60 shadow">
                        {cBusy ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ النشر...</> : <><Send className="w-4 h-4 ml-1.5" /> نشر التعليق</>}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-7">
                  <Button onClick={() => nav("/login")} className="rounded-full ft-btn-primary text-white font-bold min-h-[52px] px-7 pressable shadow-lg">
                    <MessageCircle className="w-4 h-4 ml-1.5" /> سجّل الدخول للتعليق
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ============ TEAM BENTO ============ */}
        <section data-testid="venture-team" className="mt-8 sm:mt-10 relative overflow-hidden rounded-[2rem] bg-white border border-slate-100 ft-shadow-lg p-6 sm:p-10 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar" />
          <div className="flex items-center gap-4 flex-wrap">
            <span className="relative w-[76px] h-[76px] shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" className="stroke-slate-100" />
                <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="6" strokeLinecap="round"
                  stroke="url(#vdTeamGrad)" strokeDasharray={RING_C}
                  strokeDashoffset={RING_C - (teamPct / 100) * RING_C}
                  className="transition-all duration-700" />
                <defs>
                  <linearGradient id="vdTeamGrad" x1="0" y1="0" x2="64" y2="64">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 grid place-items-center font-head text-sm font-extrabold text-slate-900 tabular-nums">{v.team_count || 0}/{v.max_members || 0}</span>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 flex items-center gap-2">فريق المشروع</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">{seatsLeft > 0 ? `متبقّي ${seatsLeft} ${seatsLeft === 1 ? "مقعد" : "مقاعد"} للانضمام إلى الفريق` : "اكتمل عدد الفريق 🎉"}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* owner card */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-bl from-amber-50 to-white border border-amber-100 p-4 flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white text-base font-extrabold flex items-center justify-center shrink-0 shadow-md`}>{(v.owner_name || "؟").trim().charAt(0)}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-extrabold text-slate-800">{v.owner_name}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-extrabold"><Crown className="w-3 h-3" /> صاحب المشروع</span>
              </span>
            </div>
            {(v.members || []).map((m) => (
              <div key={m.id} className="rounded-[1.5rem] bg-slate-50/80 border border-slate-100 p-4 flex items-center gap-3 transition-all hover:bg-white hover:shadow-md">
                <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGrad(m.name)} text-white text-base font-extrabold flex items-center justify-center shrink-0 shadow-md`}>{(m.name || "؟").trim().charAt(0)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-800">{m.name}</span>
                  <span className="mt-0.5 inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-extrabold">عضو بالفريق</span>
                </span>
              </div>
            ))}
            {/* empty seat placeholders */}
            {Array.from({ length: Math.min(Math.max(seatsLeft, 0), 3) }).map((_, i) => (
              <button key={`seat-${i}`} onClick={() => { if (!v.is_owner && !v.is_member && !v.request_pending) setJoinOpen(true); }}
                className="pressable rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-white/60 p-4 flex items-center gap-3 text-slate-300 hover:border-emerald-300 hover:text-emerald-400 transition-colors min-h-[76px]">
                <span className="w-12 h-12 rounded-2xl border-2 border-dashed border-current grid place-items-center shrink-0"><UserPlus className="w-5 h-5" /></span>
                <span className="text-sm font-extrabold">مقعد شاغر · انضم الآن</span>
              </button>
            ))}
          </div>

          <div className="mt-6">{teamAction}</div>

          {followOk && (
            <div className="mt-6 rounded-[1.5rem] bg-gradient-to-l from-slate-900 to-slate-800 text-white p-5 flex items-center gap-4 flex-wrap shadow-xl">
              <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur grid place-items-center shrink-0"><BellRing className="w-6 h-6" /></span>
              <div className="flex-1 min-w-[200px]">
                <div className="font-head font-extrabold">تابع رحلة هذا المشروع</div>
                <p className="mt-0.5 text-xs text-white/65 leading-relaxed">يصلك إشعار عند نشر تحديث أو إنجاز مرحلة · {followersCount} متابِع الآن</p>
              </div>
              {user ? (
                <Button data-testid="venture-follow-btn" onClick={toggleFollow} disabled={followBusy}
                  className={`rounded-full font-extrabold min-h-[52px] px-7 pressable disabled:opacity-60 shadow-lg ${following ? "bg-white text-slate-900 hover:bg-slate-100" : "ft-btn-primary text-white border border-white/25"}`}>
                  {followBusy
                    ? <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> جارٍ التحديث...</>
                    : following
                      ? <><BellRing className="w-4 h-4 ml-1.5" /> تتابع هذا المشروع · إلغاء</>
                      : <><Bell className="w-4 h-4 ml-1.5" /> تابع المشروع</>}
                </Button>
              ) : (
                <Button onClick={() => nav("/login")} className="rounded-full ft-btn-primary text-white font-extrabold min-h-[52px] px-7 pressable shadow-lg border border-white/25">
                  <Bell className="w-4 h-4 ml-1.5" /> سجّل الدخول للمتابعة
                </Button>
              )}
            </div>
          )}

          {/* quick stats chips + share */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {statRows.map((r) => (
              <span key={r.label} className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-100 px-4 min-h-[44px]">
                <r.icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-500">{r.label}</span>
                <span className="font-head font-extrabold text-slate-800 tabular-nums text-sm">{r.value}</span>
              </span>
            ))}
            <button onClick={shareProject}
              className="pressable inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white font-bold text-sm px-5 min-h-[44px] hover:bg-slate-800 transition-colors shadow">
              <Share2 className="w-4 h-4" /> مشاركة المشروع
            </button>
          </div>
        </section>

        {/* ============ SIMILAR · snap cards / grid ============ */}
        {similar.length > 0 && (
          <section data-testid="venture-similar" className="mt-10 sm:mt-12 animate-fade-up" style={{ animationDelay: "220ms" }}>
            <div className="flex items-center gap-3 flex-wrap px-1">
              <h2 className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl ft-icon-tile text-white grid place-items-center shrink-0 shadow-md"><Sparkles className="w-5 h-5" /></span>
                مشاريع مشابهة
              </h2>
              <span className="flex-1" />
              <Link to="/ventures" className="pressable inline-flex items-center min-h-[44px] rounded-full bg-white border border-slate-200 px-5 text-sm font-extrabold ft-text-accent shadow-sm hover:shadow transition-shadow">كل المشاريع</Link>
            </div>
            <div className="mt-5 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {similar.slice(0, 3).map((s) => {
                const SIcon = CATEGORY_ICONS[s.category] || Rocket;
                return (
                  <Link key={s.id} to={`/ventures/${s.id}`}
                    className="group relative isolate overflow-hidden shrink-0 w-[85%] sm:w-[46%] lg:w-auto snap-start rounded-[1.75rem] bg-white border border-slate-100 ft-shadow transition-all hover:ring-2 ft-ring-accent hover:shadow-[0_24px_50px_-16px_rgba(15,23,42,0.25)]">
                    <div className={`relative h-28 overflow-hidden bg-gradient-to-l ${CATEGORY_GRAD[s.category] || "from-slate-500 to-slate-600"}`}>
                      <SIcon className="pointer-events-none absolute -left-3 -bottom-6 w-24 h-24 text-white/20 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                      <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2">
                        {s.category && <span className="inline-flex items-center rounded-full bg-white/20 border border-white/30 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold text-white"><SIcon className="w-3 h-3 ml-1" /> {s.category}</span>}
                        {s.status_label && (
                          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 shadow-sm">
                            <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[s.status] || "bg-slate-300"}`} />
                            {s.status_label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-head font-extrabold text-slate-900 leading-snug line-clamp-2 group-hover:ft-text-accent transition-colors">{s.title}</h3>
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        {typeof s.team_count === "number" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 py-1.5 text-[11px] font-extrabold text-slate-500"><Users className="w-3.5 h-3.5" /> {s.team_count}{typeof s.max_members === "number" ? `/${s.max_members}` : ""}</span>
                        )}
                        {typeof s.votes_count === "number" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-3 py-1.5 text-[11px] font-extrabold text-rose-500"><Heart className="w-3.5 h-3.5" /> {s.votes_count}</span>
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
