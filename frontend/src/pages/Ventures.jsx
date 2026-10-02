import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowLeft, Plus, Search, Lightbulb, Rocket, Sparkles, Cpu, Briefcase, FlaskConical, Leaf, BookOpen, Palette, Shapes, BadgeCheck, Compass, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import BookmarkButton from "@/components/BookmarkButton";
import { ErrorState } from "@/components/ErrorState";

export const VENTURE_CATEGORIES = ["الكل", "تقنية وبرمجة", "ريادة أعمال", "علمي", "بيئي", "مجتمعي", "ثقافي وأدبي", "فني وإعلامي", "أخرى"];
export const VENTURE_STATUSES = [
  { v: "all", l: "كل الحالات" },
  { v: "idea", l: "فكرة" },
  { v: "in_progress", l: "قيد التنفيذ" },
  { v: "completed", l: "مكتمل" },
];
export const STATUS_COLORS = {
  idea: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
export const STATUS_RIBBON = {
  idea: "from-amber-400 to-orange-400",
  in_progress: "from-blue-500 to-sky-400",
  completed: "from-emerald-500 to-teal-400",
};
export const STATUS_DOT = {
  idea: "bg-amber-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const SORT_OPTIONS = [
  { v: "votes", l: "الأعلى تصويتاً" },
  { v: "newest", l: "الأحدث" },
];

const CATEGORY_META = {
  "تقنية وبرمجة": { icon: Cpu, grad: "from-blue-500 to-indigo-500", shadow: "shadow-blue-200" },
  "ريادة أعمال": { icon: Briefcase, grad: "from-violet-500 to-purple-500", shadow: "shadow-violet-200" },
  "علمي": { icon: FlaskConical, grad: "from-cyan-500 to-sky-500", shadow: "shadow-cyan-200" },
  "بيئي": { icon: Leaf, grad: "from-emerald-500 to-green-500", shadow: "shadow-emerald-200" },
  "مجتمعي": { icon: Users, grad: "from-rose-500 to-pink-500", shadow: "shadow-rose-200" },
  "ثقافي وأدبي": { icon: BookOpen, grad: "from-amber-500 to-orange-500", shadow: "shadow-amber-200" },
  "فني وإعلامي": { icon: Palette, grad: "from-fuchsia-500 to-pink-500", shadow: "shadow-fuchsia-200" },
};
const CATEGORY_DEFAULT = { icon: Shapes, grad: "from-slate-500 to-slate-600", shadow: "shadow-slate-200" };

const AVATAR_GRADS = [
  "from-blue-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-fuchsia-500 to-purple-500",
];
const avatarGrad = (name) => AVATAR_GRADS[((name || "؟").trim().charCodeAt(0) || 0) % AVATAR_GRADS.length];

export default function Ventures() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [ventures, setVentures] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("الكل");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("votes");
  const [showNew, setShowNew] = useState(false);
  const [votingId, setVotingId] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "تقنية وبرمجة", looking_for: "", max_members: 5 });
  const [saving, setSaving] = useState(false);
  const reqSeq = useRef(0);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    try {
      const { data } = await api.get("/ventures", { params: { sort, category, status, q: debouncedQ || undefined } });
      if (seq !== reqSeq.current) return; // stale response · a newer request already won
      setVentures(data);
      setLoadError(false);
    } catch {
      if (seq !== reqSeq.current) return;
      setLoadError(true);
      toast.error("تعذّر تحميل المشاريع");
    }
  }, [sort, category, status, debouncedQ]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!user) { toast.info("سجّل الدخول أولاً لنشر مشروع"); nav("/login"); return; }
    if (form.title.trim().length < 3) { toast.error("العنوان قصير جداً"); return; }
    if (!form.description.trim()) { toast.error("اكتب وصفاً للمشروع"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/ventures", {
        title: form.title.trim(), description: form.description.trim(),
        category: form.category, looking_for: form.looking_for.trim(),
        max_members: Number(form.max_members) || 5,
      });
      setShowNew(false);
      setForm({ title: "", description: "", category: "تقنية وبرمجة", looking_for: "", max_members: 5 });
      toast.success("تم نشر مشروعك 🎉");
      nav(`/ventures/${data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر نشر المشروع"); }
    finally { setSaving(false); }
  };

  const vote = async (v) => {
    if (!user) { toast.info("سجّل الدخول للتصويت"); return; }
    if (votingId === v.id) return;
    setVotingId(v.id);
    try {
      const { data } = await api.post(`/ventures/${v.id}/vote`);
      setVentures((list) => list.map((x) => x.id === v.id
        ? { ...x, voted: data.voted, votes_count: x.votes_count + (data.voted ? 1 : -1) } : x));
    } catch { toast.error("تعذّر التصويت، حاول مجدداً"); }
    finally { setVotingId(null); }
  };

  const openCreate = () => { if (!user) { toast.info("سجّل الدخول أولاً"); nav("/login"); } else setShowNew(true); };
  const totalVotes = ventures ? ventures.reduce((s, x) => s + (x.votes_count || 0), 0) : 0;
  const completedCount = ventures ? ventures.filter((x) => x.status === "completed").length : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] text-white px-6 py-10 sm:px-10 sm:py-14 ft-shadow-lg">
          <Rocket className="pointer-events-none absolute -left-6 -bottom-8 w-44 h-44 sm:w-64 sm:h-64 text-white/10 -rotate-12" />
          <Sparkles className="pointer-events-none absolute left-[38%] top-8 w-8 h-8 text-white/15 hidden sm:block" />
          <div className="pointer-events-none absolute -top-20 right-[15%] w-56 h-56 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_20%,transparent)] blur-3xl animate-pulse [animation-duration:4s]" />
          <div className="pointer-events-none absolute -bottom-24 left-[30%] w-56 h-56 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_15%,transparent)] blur-3xl animate-pulse [animation-duration:5.5s]" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3.5 py-1.5 text-xs font-bold backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 ft-text-accent-bright" /> مشاريع طلابية
            </span>
            <h1 className="font-head text-4xl sm:text-5xl font-extrabold mt-5 leading-tight">
              مساحة <span className="ft-text-gradient">المشاريع</span> 🚀
            </h1>
            <p className="text-slate-200/90 mt-3 max-w-2xl leading-relaxed text-base sm:text-lg">
              اعرض فكرة مشروعك، كوّن فريقاً من طلاب المدارس الأخرى، وتابع التقدّم حتى الإنجاز.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button onClick={openCreate}
                className="rounded-2xl ft-btn-primary text-white font-extrabold pressable shadow-xl min-h-[52px] px-6 text-base border border-white/20">
                <Plus className="w-5 h-5 ml-1.5" /> اعرض مشروعك
              </Button>
              <a href="#ventures-toolbar"
                className="pressable inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md text-white font-bold min-h-[52px] px-5 text-sm transition-colors">
                <Compass className="w-5 h-5" /> تصفح المشاريع
              </a>
            </div>
            {ventures && (
              <div className="mt-8 flex flex-wrap gap-2.5 animate-fade-up">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold">
                  <Rocket className="w-4 h-4 ft-text-accent-bright" /> {ventures.length} مشروع
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold">
                  <BadgeCheck className="w-4 h-4 ft-text-accent-bright" /> {completedCount} مكتمل
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-bold">
                  <Heart className="w-4 h-4 text-rose-200" /> {totalVotes} صوت
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div id="ventures-toolbar" className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 scroll-mt-28">
          <div className="bg-white/85 backdrop-blur-xl rounded-[1.4rem] sm:rounded-3xl border border-white/60 ring-1 ring-slate-200/60 ft-shadow-lg p-4 sm:p-5 space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مشروع..."
                className="rounded-2xl pr-12 min-h-[52px] text-base border-slate-200 bg-white/80 shadow-inner focus-visible:bg-white transition-colors" />
            </div>
            <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              {VENTURE_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`pressable shrink-0 rounded-full px-4 min-h-[44px] inline-flex items-center text-xs sm:text-sm font-bold border transition-all ${category === c ? "bg-gradient-to-l from-slate-900 to-slate-700 text-white border-slate-900 shadow-lg shadow-slate-300" : "bg-white/70 text-slate-500 border-slate-200 hover:[border-color:color-mix(in_srgb,var(--ft-accent)_32%,white)] hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]"}`}>
                  {c}
                </button>
              ))}
            </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/80 to-transparent sm:hidden" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {VENTURE_STATUSES.map((s) => (
                <button key={s.v} onClick={() => setStatus(s.v)}
                  className={`pressable inline-flex items-center gap-1.5 rounded-full px-4 min-h-[44px] text-xs sm:text-sm font-bold border transition-all ${status === s.v ? "ft-btn-primary ft-border-accent text-white shadow-lg" : "bg-white/70 text-slate-500 border-slate-200 hover:[border-color:color-mix(in_srgb,var(--ft-accent)_32%,white)] hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]"}`}>
                  {s.v !== "all" && <span className={`w-2 h-2 rounded-full ${status === s.v ? "bg-white" : STATUS_DOT[s.v] || "bg-slate-300"}`} />}
                  {s.l}
                </button>
              ))}
              <span className="flex-1" />
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 p-1 ring-1 ring-slate-200/70 w-full sm:w-auto">
                {SORT_OPTIONS.map((s) => (
                  <button key={s.v} onClick={() => setSort(s.v)}
                    className={`pressable flex-1 sm:flex-none rounded-full px-4 min-h-[40px] text-xs sm:text-sm font-bold transition-all ${sort === s.v ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mt-6 animate-fade-up">
            <ErrorState message="تعذّر تحميل المشاريع" onRetry={load} context="ventures-list" className="max-w-xl mx-auto shadow-sm" />
          </div>
        ) : !ventures ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-6" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[1.6rem] border border-slate-100 ft-shadow overflow-hidden animate-pulse flex flex-col">
                <div className="h-28 sm:h-32 bg-slate-200/80 shrink-0" />
                <div className="px-5 pb-5 flex flex-col flex-1">
                  <div className="-mt-8 w-14 h-14 rounded-2xl bg-slate-200 ring-4 ring-white" />
                  <div className="flex gap-2 mt-3.5">
                    <div className="h-6 w-20 rounded-full bg-slate-200" />
                    <div className="h-6 w-16 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-5 w-3/4 rounded-lg bg-slate-200 mt-3" />
                  <div className="space-y-2 mt-2.5">
                    <div className="h-3.5 w-full rounded bg-slate-100" />
                    <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-2.5 mt-4">
                    <div className="w-9 h-9 rounded-full bg-slate-200" />
                    <div className="h-3.5 w-24 rounded bg-slate-100" />
                  </div>
                  <div className="mt-auto">
                    <div className="border-t border-slate-100 mt-4 pt-4 flex items-center justify-between">
                      <div className="h-9 w-16 rounded-full bg-slate-100" />
                      <div className="h-11 w-16 rounded-full bg-slate-100" />
                      <div className="h-4 w-14 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ventures.length === 0 ? (
          <div className="text-center py-20 text-slate-400 animate-fade-up">
            <div className="w-20 h-20 mx-auto mb-4 rounded-[1.4rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center shadow-inner">
              <Lightbulb className="w-10 h-10 text-amber-400" />
            </div>
            <p className="font-head font-bold text-lg text-slate-600">لا توجد مشاريع بعد</p>
            <p className="mt-1 text-sm">كن أول من يعرض فكرته ويكوّن فريقاً!</p>
            <Button onClick={openCreate}
              className="mt-6 rounded-2xl ft-btn-primary text-white font-extrabold pressable shadow-lg min-h-[52px] px-6">
              <Plus className="w-5 h-5 ml-1.5" /> اعرض مشروعك
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-7 mb-4 flex items-center gap-2 text-sm font-bold text-slate-400">
              <Sparkles className="w-4 h-4 ft-text-accent" />
              عرض {ventures.length} مشروع
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {ventures.map((v, i) => {
                const meta = CATEGORY_META[v.category] || CATEGORY_DEFAULT;
                const CatIcon = meta.icon;
                return (
                  <div key={v.id} style={{ animationDelay: `${Math.min(i, 11) * 60}ms` }}
                    className="group relative bg-white rounded-[1.6rem] border border-slate-100 ft-shadow hover-lift flex flex-col overflow-hidden animate-fade-up transition-shadow duration-300 hover:shadow-[0_24px_50px_-16px_color-mix(in_srgb,var(--ft-accent)_35%,transparent)]">
                    <div className={`relative h-28 sm:h-32 shrink-0 overflow-hidden bg-gradient-to-l ${meta.grad}`}>
                      <CatIcon className="pointer-events-none absolute -left-4 -bottom-7 w-32 h-32 text-white/20 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                      <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2">
                        <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full font-bold backdrop-blur shadow-sm`}>
                          <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
                          {v.status_label}
                        </Badge>
                        <BookmarkButton kind="venture" refId={v.id} title={v.title} className="shadow shrink-0" />
                      </div>
                      <div className={`absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-slate-300 to-slate-200"}`} />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tl from-[color:color-mix(in_srgb,var(--ft-accent)_7%,transparent)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative px-5 pb-5 flex flex-col flex-1">
                      <span className={`-mt-8 relative z-10 w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center shadow-xl ${meta.shadow} ring-4 ring-white transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}>
                        <CatIcon className="w-7 h-7" />
                      </span>
                      <div className="flex items-center gap-2 flex-wrap mt-3.5">
                        <Badge variant="secondary" className="rounded-full">{v.category}</Badge>
                        {v.is_owner && <Badge className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold">مشروعك</Badge>}
                        {v.votes_count >= 10 && (
                          <Badge className="rounded-full bg-gradient-to-l from-orange-500 to-rose-500 text-white border-0 font-bold shadow-md shadow-orange-200">
                            <Flame className="w-3 h-3 ml-1" /> رائج
                          </Badge>
                        )}
                      </div>
                      <Link to={`/ventures/${v.id}`} className="font-head font-extrabold text-lg text-slate-900 mt-3 hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)] line-clamp-1 transition-colors">{v.title}</Link>
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{v.description}</p>
                      {v.looking_for && (
                        <p className="mt-3 inline-flex items-start gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-2.5 py-1.5 line-clamp-1">
                          <Search className="w-3.5 h-3.5 shrink-0 mt-px" /> يبحث عن: {v.looking_for}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-2.5">
                        <span className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white text-sm font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow-md`}>
                          {(v.owner_name || "؟").trim().charAt(0)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium truncate">👤 {v.owner_name}{v.school_name ? ` · ${v.school_name}` : ""}</span>
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200/80 rounded-full px-3 min-h-[36px]">
                            <Users className="w-4 h-4 text-blue-500" />{v.team_count}/{v.max_members}
                          </span>
                          <button onClick={() => vote(v)} disabled={votingId === v.id}
                            className={`pressable flex items-center justify-center gap-1.5 text-sm font-extrabold rounded-full px-4 min-h-[44px] transition-all disabled:opacity-60 ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 border border-rose-400" : "text-slate-400 border border-slate-200 bg-white hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"}`}>
                            <Heart className={`w-4 h-4 ${v.voted ? "fill-current" : ""}`} />{v.votes_count}
                          </button>
                          <Link to={`/ventures/${v.id}`} className="pressable inline-flex items-center gap-1 ft-text-accent text-sm font-extrabold min-h-[44px] px-2 rounded-full hover:bg-[color:color-mix(in_srgb,var(--ft-accent)_9%,white)] transition-colors group/lnk">
                            التفاصيل <ArrowLeft className="w-4 h-4 transition-transform group-hover/lnk:-translate-x-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl ft-icon-tile text-white flex items-center justify-center shadow-lg shrink-0">
                <Rocket className="w-5 h-5" />
              </span>
              <DialogTitle className="font-head text-xl font-extrabold">اعرض مشروعك 🚀</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان المشروع</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: تطبيق لتبادل الكتب المدرسية" className="rounded-xl mt-1 text-base min-h-[48px]" maxLength={100} /></div>
            <div><Label>وصف المشروع</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="اشرح الفكرة، الهدف، وما الذي تحتاجه..." className="rounded-xl mt-1 text-base min-h-[120px]" maxLength={5000} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(c) => setForm({ ...form, category: c })}>
                  <SelectTrigger className="rounded-xl mt-1 min-h-[48px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{VENTURE_CATEGORIES.filter((c) => c !== "الكل").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>الحد الأقصى للفريق</Label>
                <Input type="number" min={2} max={20} value={form.max_members}
                  onChange={(e) => setForm({ ...form, max_members: e.target.value })}
                  className="rounded-xl mt-1 text-base min-h-[48px]" /></div>
            </div>
            <div><Label>من تبحث عنه؟ (اختياري)</Label>
              <Input value={form.looking_for} onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
                placeholder="مثال: مصمم ومبرمج وكاتب محتوى" className="rounded-xl mt-1 text-base min-h-[48px]" maxLength={500} /></div>
            <Button onClick={create} disabled={saving} className="w-full rounded-2xl ft-btn-primary font-extrabold text-base min-h-[52px] pressable shadow-lg">
              {saving ? "جارٍ النشر..." : "انشر المشروع"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
