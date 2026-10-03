import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowLeft, Plus, Search, Lightbulb, Rocket, Sparkles, Cpu, Briefcase, FlaskConical, Leaf, BookOpen, Palette, Shapes, BadgeCheck, Flame, Check, Crown, Hourglass, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  "تقنية وبرمجة": { icon: Cpu, grad: "from-blue-500 to-indigo-500", shadow: "shadow-blue-300", tint: "bg-blue-50 text-blue-600" },
  "ريادة أعمال": { icon: Briefcase, grad: "from-violet-500 to-purple-500", shadow: "shadow-violet-300", tint: "bg-violet-50 text-violet-600" },
  "علمي": { icon: FlaskConical, grad: "from-cyan-500 to-sky-500", shadow: "shadow-cyan-300", tint: "bg-cyan-50 text-cyan-600" },
  "بيئي": { icon: Leaf, grad: "from-emerald-500 to-green-500", shadow: "shadow-emerald-300", tint: "bg-emerald-50 text-emerald-600" },
  "مجتمعي": { icon: Users, grad: "from-rose-500 to-pink-500", shadow: "shadow-rose-300", tint: "bg-rose-50 text-rose-600" },
  "ثقافي وأدبي": { icon: BookOpen, grad: "from-amber-500 to-orange-500", shadow: "shadow-amber-300", tint: "bg-amber-50 text-amber-600" },
  "فني وإعلامي": { icon: Palette, grad: "from-fuchsia-500 to-pink-500", shadow: "shadow-fuchsia-300", tint: "bg-fuchsia-50 text-fuchsia-600" },
};
const CATEGORY_DEFAULT = { icon: Shapes, grad: "from-slate-500 to-slate-600", shadow: "shadow-slate-300", tint: "bg-slate-100 text-slate-600" };
const CATEGORY_ALL = { icon: LayoutGrid, grad: "from-slate-700 to-slate-900", shadow: "shadow-slate-300", tint: "bg-slate-100 text-slate-700" };
const metaFor = (c) => (c === "الكل" ? CATEGORY_ALL : CATEGORY_META[c] || CATEGORY_DEFAULT);

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    try {
      const { data } = await api.get("/ventures", { params: { sort, category, status, q: debouncedQ || undefined } });
      if (seq !== reqSeq.current) return;
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
  const totalMembers = ventures ? ventures.reduce((s, x) => s + (x.team_count || 0), 0) : 0;
  const completedCount = ventures ? ventures.filter((x) => x.status === "completed").length : 0;
  const openTeams = ventures ? ventures.filter((x) => (x.team_count || 0) < (x.max_members || 0)).length : 0;

  const isDefaultView = sort === "votes" && category === "الكل" && status === "all" && !q && !debouncedQ;
  const featured = isDefaultView && ventures && ventures.length ? ventures[0] : null;
  const wallVentures = featured ? ventures.slice(1) : ventures;
  const catCount = (c) => (ventures || []).filter((v) => c === "الكل" || v.category === c).length;
  const filtersActive = category !== "الكل" || status !== "all" || q.trim() !== "";
  const resetFilters = () => { setQ(""); setCategory("الكل"); setStatus("all"); };

  const renderAvatarStack = (v, meta, size = "w-7 h-7 text-[11px]") => (
    <div className="flex items-center shrink-0">
      <span className={`${size} rounded-full bg-gradient-to-br ${avatarGrad(v.owner_name)} text-white font-extrabold flex items-center justify-center ring-2 ring-white/50 shadow shrink-0`}>
        {(v.owner_name || "؟").trim().charAt(0)}
      </span>
      {Array.from({ length: Math.max(0, Math.min((v.team_count || 0) - 1, 3)) }).map((_, i) => (
        <span key={i} style={{ marginInlineStart: "-0.5rem" }}
          className={`${size} rounded-full bg-gradient-to-br ${meta.grad} text-white flex items-center justify-center ring-2 ring-white/50 shadow shrink-0`}>
          <Users className="w-3.5 h-3.5" />
        </span>
      ))}
      {(v.team_count || 0) > 4 && (
        <span style={{ marginInlineStart: "-0.5rem" }} className={`${size} rounded-full bg-slate-900 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white/50 shadow shrink-0 tabular-nums`}>
          +{(v.team_count || 0) - 4}
        </span>
      )}
    </div>
  );

  const renderTeamBarGlass = (v) => {
    const pct = Math.min(100, Math.round(((v.team_count || 0) / Math.max(1, v.max_members || 1)) * 100));
    const full = (v.team_count || 0) >= (v.max_members || 1);
    return (
      <div>
        <div className="flex items-center justify-between text-[10px] font-bold text-white/75">
          <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> الفريق {v.team_count}/{v.max_members}</span>
          <span className={`tabular-nums ${full ? "text-emerald-300" : ""}`}>{full ? "اكتمل الفريق ✓" : `${pct}%`}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${full ? "bg-gradient-to-l from-emerald-300 to-teal-300" : "bg-white"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const renderVotePill = (v, big = false) => (
    <button onClick={() => vote(v)} disabled={votingId === v.id}
      className={`pressable shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full font-extrabold backdrop-blur-md transition-all disabled:opacity-60 ${big ? "px-5 min-h-[48px] text-sm" : "px-3.5 min-h-[38px] text-xs"} ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white border border-rose-300/60 shadow-lg shadow-rose-950/30" : "bg-white/15 hover:bg-white/25 text-white border border-white/30"}`}>
      <Heart className={`${big ? "w-5 h-5" : "w-4 h-4"} ${v.voted ? "fill-current" : ""}`} />{v.votes_count}
    </button>
  );

  const renderVotePillLight = (v) => (
    <button onClick={() => vote(v)} disabled={votingId === v.id}
      className={`pressable shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full font-extrabold px-5 min-h-[46px] text-sm transition-all disabled:opacity-60 ${v.voted ? "bg-gradient-to-l from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200 border border-rose-400" : "bg-white text-slate-500 border border-slate-200 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"}`}>
      <Heart className={`w-5 h-5 ${v.voted ? "fill-current" : ""}`} />{v.votes_count}
    </button>
  );

  const renderTeamBar = (v) => {
    const pct = Math.min(100, Math.round(((v.team_count || 0) / Math.max(1, v.max_members || 1)) * 100));
    const full = (v.team_count || 0) >= (v.max_members || 1);
    return (
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> الفريق {v.team_count}/{v.max_members}</span>
          <span className={`tabular-nums ${full ? "text-emerald-500" : ""}`}>{full ? "اكتمل الفريق ✓" : `${pct}%`}</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${full ? "bg-gradient-to-l from-emerald-400 to-teal-400" : "ft-grad-bar"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  /* ============ flowing rows wall · one editorial row ============ */
  const renderRow = (v, i) => {
    const meta = metaFor(v.category);
    const CatIcon = meta.icon;
    const flip = i % 2 === 1;
    return (
      <article key={v.id} style={{ animationDelay: `${Math.min(i, 11) * 60}ms` }}
        className="group relative isolate overflow-visible rounded-[1.75rem] bg-white border border-slate-100 ft-shadow animate-fade-up transition-shadow duration-300 hover:ring-2 ft-ring-accent hover:shadow-[0_28px_56px_-18px_color-mix(in_srgb,var(--ft-accent)_38%,transparent)]">
        <span aria-hidden className={`hidden md:block absolute top-10 z-20 w-4 h-4 rounded-full bg-gradient-to-br ${meta.grad} ring-4 ring-slate-100 shadow-lg`} style={{ insetInlineStart: "-2.9rem" }} />
        <div className={`flex flex-col ${flip ? "md:flex-row-reverse" : "md:flex-row"} rounded-[1.75rem] overflow-hidden`}>
          {/* category art panel · alternating side on desktop */}
          <div className={`relative isolate overflow-hidden bg-gradient-to-br ${meta.grad} h-40 md:h-auto md:min-h-[238px] md:w-[42%] shrink-0`}>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-white/10" />
            <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1.5px)] [background-size:18px_18px]" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <CatIcon className="absolute -left-5 -bottom-8 w-40 h-40 sm:w-48 sm:h-48 text-white/25 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
              <CatIcon className="absolute right-[14%] top-[16%] w-8 h-8 text-white/15 rotate-12 transition-transform duration-500 group-hover:rotate-45 hidden sm:block" />
            </div>
            <div className="absolute top-3 inset-x-3 z-10 flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/35 backdrop-blur-md border border-white/25 text-white text-[11px] font-extrabold px-2.5 py-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
                  {v.status_label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-2.5 py-1">
                  <CatIcon className="w-3 h-3" /> {v.category}
                </span>
              </div>
              <BookmarkButton kind="venture" refId={v.id} title={v.title} className="shadow shrink-0" />
            </div>
            <span className="absolute bottom-3 start-3 z-10 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white hidden md:flex items-center justify-center shadow-lg">
              <CatIcon className="w-5 h-5" />
            </span>
          </div>

          {/* glass content side */}
          <div className="relative flex-1 min-w-0 p-5 sm:p-6 flex flex-col bg-gradient-to-b from-white to-slate-50/60">
            {(v.is_owner || v.votes_count >= 10) && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                {v.is_owner && <span className="rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-extrabold px-2 py-0.5">مشروعك</span>}
                {v.votes_count >= 10 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-extrabold px-2 py-0.5">
                    <Flame className="w-3 h-3" /> رائج
                  </span>
                )}
              </div>
            )}
            <Link to={`/ventures/${v.id}`}
              className="font-head font-extrabold text-xl sm:text-2xl leading-snug text-slate-900 line-clamp-2 hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)] transition-colors">
              {v.title}
            </Link>
            <p className="mt-2 text-sm sm:text-[15px] text-slate-500 line-clamp-2 sm:line-clamp-3 leading-relaxed">{v.description}</p>
            {v.looking_for && (
              <p className="mt-3 inline-flex items-start gap-1.5 self-start max-w-full text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-2.5 py-1.5 line-clamp-1">
                <Search className="w-3.5 h-3.5 shrink-0 mt-px" /> يبحث عن: {v.looking_for}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2.5">
              {renderAvatarStack(v, meta, "w-8 h-8 text-xs")}
              <span className="text-xs sm:text-[13px] text-slate-500 font-medium truncate">
                {v.owner_name}{v.school_name ? ` · ${v.school_name}` : ""}
              </span>
            </div>
            <div className="mt-3">{renderTeamBar(v)}</div>
            <div className="mt-auto pt-5">
              <div className="flex items-center gap-2.5 flex-wrap border-t border-slate-100 pt-4">
                {renderVotePillLight(v)}
                <Link to={`/ventures/${v.id}`} className="pressable inline-flex items-center justify-center gap-1.5 rounded-full ft-btn-primary text-white text-sm font-extrabold px-5 min-h-[46px] shadow-lg group/flnk">
                  التفاصيل <ArrowLeft className="w-4 h-4 transition-transform group-hover/flnk:-translate-x-1" />
                </Link>
                <span className="ms-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 tabular-nums">
                  <Users className="w-3.5 h-3.5" /> {v.team_count}/{v.max_members} في الفريق
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  /* ============ featured row · full-width art banner + overlay ============ */
  const renderFeatureRow = (v) => {
    const meta = metaFor(v.category);
    const CatIcon = meta.icon;
    return (
      <article key={v.id} className="group relative isolate overflow-visible rounded-[2rem] ft-shadow-lg animate-fade-up transition-shadow duration-300 hover:ring-2 ft-ring-accent hover:shadow-[0_36px_72px_-20px_color-mix(in_srgb,var(--ft-accent)_45%,transparent)]">
        <span aria-hidden className={`hidden md:block absolute top-12 z-20 w-5 h-5 rounded-full bg-gradient-to-br ${meta.grad} ring-4 ring-slate-100 shadow-xl`} style={{ insetInlineStart: "-2.95rem" }} />
        <div className="relative overflow-hidden rounded-[2rem] isolate">
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.grad}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-slate-950/5" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1.5px)] [background-size:18px_18px]" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <CatIcon className="absolute -left-8 -bottom-12 w-64 h-64 sm:w-80 sm:h-80 text-white/20 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
            <CatIcon className="absolute left-[18%] top-[14%] w-10 h-10 text-white/10 rotate-12 transition-transform duration-500 group-hover:rotate-45 hidden sm:block" />
          </div>

          <div className="absolute top-4 inset-x-4 sm:top-5 sm:inset-x-6 z-10 flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-400 to-orange-400 text-white text-[11px] font-extrabold px-3 py-1.5 shadow-lg shadow-orange-950/20 border border-white/30">
                <Crown className="w-3.5 h-3.5" /> مشروع مميز
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/35 backdrop-blur-md border border-white/25 text-white text-[11px] font-extrabold px-2.5 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[v.status] || "bg-slate-300"}`} />
                {v.status_label}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-2.5 py-1">
                <CatIcon className="w-3 h-3" /> {v.category}
              </span>
            </div>
            <BookmarkButton kind="venture" refId={v.id} title={v.title} className="shadow shrink-0" />
          </div>

          <div className="relative flex flex-col justify-end min-h-[380px] sm:min-h-[430px] p-5 sm:p-8 pt-24 text-white">
            <Link to={`/ventures/${v.id}`}
              className="font-head font-extrabold text-3xl sm:text-4xl lg:text-[2.8rem] leading-[1.15] text-white line-clamp-2 hover:text-white/90 transition-colors">
              {v.title}
            </Link>
            <p className="mt-3 max-w-3xl text-white/85 text-sm sm:text-base line-clamp-3 leading-relaxed">{v.description}</p>

            {(v.is_owner || v.votes_count >= 10 || v.looking_for) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-4">
                {v.is_owner && <span className="rounded-full bg-violet-400/25 border border-violet-200/30 text-violet-100 text-[11px] font-extrabold px-2.5 py-1">مشروعك</span>}
                {v.votes_count >= 10 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/25 border border-orange-200/30 text-orange-100 text-[11px] font-extrabold px-2.5 py-1">
                    <Flame className="w-3 h-3" /> رائج
                  </span>
                )}
                {v.looking_for && (
                  <span className="inline-flex items-start gap-1.5 text-[11px] font-bold text-violet-100 bg-violet-400/20 border border-violet-200/25 rounded-lg px-2.5 py-1 line-clamp-1 max-w-full">
                    <Search className="w-3 h-3 shrink-0 mt-px" /> يبحث عن: {v.looking_for}
                  </span>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {renderAvatarStack(v, meta, "w-9 h-9 text-sm")}
                  <span className="text-xs sm:text-sm text-white/85 font-medium truncate">
                    {v.owner_name}{v.school_name ? ` · ${v.school_name}` : ""}
                  </span>
                </div>
                <div className="mt-3 w-64 max-w-full">{renderTeamBarGlass(v)}</div>
              </div>
              <div className="flex items-center gap-2.5 ms-auto">
                {renderVotePill(v, true)}
                <Link to={`/ventures/${v.id}`} className="pressable inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-slate-900 text-sm font-extrabold px-6 min-h-[48px] shadow-xl group/flnk">
                  التفاصيل <ArrowLeft className="w-4 h-4 transition-transform group-hover/flnk:-translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  };

  /* ============ create CTA row in the same rhythm ============ */
  const renderCreateRow = () => (
    <button key="create-row" onClick={openCreate}
      className="pressable group relative w-full text-start rounded-[1.75rem] border-2 border-dashed ft-shadow animate-fade-up transition-all hover:shadow-xl [border-color:color-mix(in_srgb,var(--ft-accent)_38%,white)] hover:[border-color:color-mix(in_srgb,var(--ft-accent)_65%,white)] bg-[color:color-mix(in_srgb,var(--ft-accent)_5%,white)]">
      <span aria-hidden className="hidden md:block absolute top-1/2 -translate-y-1/2 z-20 w-4 h-4 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-100 shadow-lg" style={{ insetInlineStart: "-2.9rem" }} />
      <span className="relative isolate flex items-center gap-4 p-5 sm:p-6 overflow-hidden rounded-[1.75rem]">
        <Rocket className="pointer-events-none absolute -right-5 -bottom-7 w-28 h-28 text-slate-900/[0.05] -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
        <span className="relative w-14 h-14 rounded-full ft-btn-primary text-white flex items-center justify-center shadow-xl shrink-0 transition-transform duration-300 group-hover:scale-110">
          <Plus className="w-7 h-7" />
        </span>
        <span className="relative flex-1 min-w-0">
          <span className="block font-head font-extrabold text-lg sm:text-xl text-slate-800">＋ ابدأ مشروعك</span>
          <span className="block text-xs sm:text-sm text-slate-400 font-medium leading-relaxed mt-0.5">حوّل فكرتك إلى مشروع حقيقي وابنِ فريقك من مدارس أخرى</span>
        </span>
        <span className="relative hidden sm:inline-flex items-center gap-1.5 rounded-full ft-btn-primary text-white text-sm font-extrabold px-5 min-h-[44px] shadow-lg shrink-0">
          انشر الآن <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        </span>
      </span>
    </button>
  );

  return (
    <Layout>
      {/* ============================ MASTHEAD · compact ============================ */}
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] ft-navy-gradient text-white ft-shadow-lg">
          <div className="pointer-events-none absolute inset-0 ft-gradient-pan bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.09)_50%,transparent_75%)] bg-[length:220%_220%] opacity-70" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1.6px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute -top-20 right-[8%] w-56 h-56 rounded-full bg-[color:color-mix(in_srgb,var(--ft-accent)_30%,transparent)] blur-3xl" />
          <Rocket className="pointer-events-none absolute -left-6 -bottom-8 w-36 h-36 text-white/[0.08] -rotate-12" />

          <div className="relative px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  جدار اكتشاف المشاريع · مباشر
                </span>
                <h1 className="font-head text-[1.9rem] leading-tight sm:text-4xl lg:text-[2.6rem] font-extrabold mt-2.5">
                  مشاريع <span className="ft-hero-gradient-text">الطلاب</span> 🚀
                </h1>
              </div>
              {ventures && (
                <div className="flex items-center gap-2 flex-wrap animate-fade-up">
                  {[
                    { icon: Rocket, n: ventures.length, l: "مشروع" },
                    { icon: Users, n: totalMembers, l: "عضو فريق" },
                    { icon: Heart, n: totalVotes, l: "صوت" },
                    { icon: BadgeCheck, n: completedCount, l: "مكتمل" },
                    { icon: Hourglass, n: openTeams, l: "فريق يبحث" },
                  ].map((s) => (
                    <span key={s.l} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white/85">
                      <s.icon className="w-3.5 h-3.5 ft-text-accent-bright" />
                      <span className="font-head font-extrabold tabular-nums text-white">{s.n}</span> {s.l}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* big search pill + sort + create */}
            <div className="mt-5 flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مشروع يلهمك..."
                  className="rounded-full pr-[52px] ps-12 min-h-[54px] text-base bg-white text-slate-900 border-white shadow-xl placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-white/30" />
                {q && (
                  <button onClick={() => setQ("")} aria-label="مسح البحث"
                    className="pressable absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-100 text-slate-500 grid place-items-center">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md p-1 flex-1 md:flex-none">
                  {SORT_OPTIONS.map((s) => (
                    <button key={s.v} onClick={() => setSort(s.v)}
                      className={`pressable flex-1 md:flex-none rounded-full px-4 min-h-[44px] text-xs sm:text-sm font-bold transition-all ${sort === s.v ? "bg-white text-slate-900 shadow-md" : "text-white/70 hover:text-white"}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
                <Button onClick={openCreate}
                  className="hidden md:inline-flex rounded-full bg-white text-slate-900 hover:bg-white/90 font-extrabold pressable shadow-xl min-h-[52px] px-6 text-sm border border-white/40">
                  <Plus className="w-5 h-5 ml-1.5" /> مشروع جديد
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ============================ BODY ============================ */}
      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative isolate">
        {/* ===== filter rail · bento category mini-tiles · static ===== */}
        <div id="ventures-toolbar" className="relative isolate scroll-mt-24 mt-6">
          <div className="flex items-center gap-3 mb-3.5">
            <span className="w-9 h-9 rounded-xl ft-icon-tile flex items-center justify-center shadow-md shrink-0">
              <LayoutGrid className="w-[18px] h-[18px]" />
            </span>
            <span className="font-head text-base sm:text-lg font-extrabold text-slate-800">تصفّح حسب التصنيف</span>
            <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
            {filtersActive && (
              <button onClick={resetFilters}
                className="pressable inline-flex items-center gap-1 rounded-full px-3.5 min-h-[36px] text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all shrink-0">
                مسح التصفية <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-2.5">
            {VENTURE_CATEGORIES.map((c) => {
              const m = metaFor(c);
              const Icon = m.icon;
              const active = category === c;
              return (
                <button key={c} onClick={() => setCategory(c)}
                  className={`pressable relative overflow-hidden rounded-2xl border p-2.5 sm:p-3 flex flex-col items-center gap-1.5 text-center transition-all min-h-[76px] sm:min-h-[84px] ${active ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 ft-shadow"}`}>
                  <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${m.grad} text-white flex items-center justify-center shadow-md shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-extrabold leading-tight ${active ? "text-white" : "text-slate-600"}`}>{c}</span>
                  {ventures && (
                    <span className={`text-[9px] font-extrabold tabular-nums rounded-full px-1.5 py-px ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"}`}>{catCount(c)}</span>
                  )}
                  {active && <Check className="absolute top-1.5 end-1.5 w-3.5 h-3.5 ft-text-accent-bright" />}
                </button>
              );
            })}
          </div>

          {/* status pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {VENTURE_STATUSES.map((s) => (
              <button key={s.v} onClick={() => setStatus(s.v)}
                className={`pressable inline-flex items-center gap-1.5 rounded-full px-4 min-h-[42px] text-xs sm:text-sm font-bold border transition-all ${status === s.v ? "ft-btn-primary ft-border-accent text-white shadow-lg" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                {s.v !== "all" && <span className={`w-2 h-2 rounded-full ${status === s.v ? "bg-white" : STATUS_DOT[s.v] || "bg-slate-300"}`} />}
                {s.l}
              </button>
            ))}
            {ventures && (
              <span className="ms-auto text-xs font-bold text-slate-400 tabular-nums">
                {filtersActive ? `${ventures.length} نتيجة` : `${ventures.length} مشروع على الجدار`}
              </span>
            )}
          </div>
        </div>

        {/* ===== states + bento wall ===== */}
        {loadError ? (
          <div className="mt-6 animate-fade-up">
            <ErrorState message="تعذّر تحميل المشاريع" onRetry={load} context="ventures-list" className="max-w-xl mx-auto shadow-sm" />
          </div>
        ) : !ventures ? (
          <div className="mt-7 space-y-5 sm:space-y-6" aria-hidden="true">
            <div className="h-[340px] sm:h-[300px] rounded-[2rem] bg-slate-200/80 animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col md:flex-row rounded-[1.75rem] overflow-hidden animate-pulse">
                <div className="h-40 md:h-auto md:min-h-[220px] md:w-[42%] bg-slate-200/80 shrink-0" />
                <div className="flex-1 bg-white border border-slate-100 border-t-0 md:border-t md:border-s-0 p-5 sm:p-6 space-y-3">
                  <div className="h-6 w-2/3 rounded-lg bg-slate-200" />
                  <div className="h-4 w-full rounded bg-slate-100" />
                  <div className="h-4 w-4/5 rounded bg-slate-100" />
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="w-8 h-8 rounded-full bg-slate-100 -ms-3" />
                    <div className="h-3.5 w-28 rounded bg-slate-100" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100" />
                  <div className="flex gap-2.5 pt-2">
                    <div className="h-[46px] w-28 rounded-full bg-slate-100" />
                    <div className="h-[46px] w-28 rounded-full bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ventures.length === 0 ? (
          <div className="mt-7 space-y-5 sm:space-y-6 animate-fade-up">
            {renderCreateRow()}
            <div className="relative overflow-hidden rounded-[1.75rem] bg-white border border-slate-100 ft-shadow flex flex-col items-center justify-center text-center p-8 sm:p-10 isolate">
              <Rocket className="pointer-events-none absolute -right-8 -bottom-10 w-44 h-44 text-slate-100 -rotate-12" />
              <div className="relative w-20 h-20 rounded-[1.4rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center shadow-inner">
                <Lightbulb className="w-10 h-10 text-amber-400" />
              </div>
              <p className="relative font-head font-bold text-lg text-slate-600 mt-4">
                {filtersActive ? "لا نتائج مطابقة لبحثك" : "لا توجد مشاريع بعد"}
              </p>
              <p className="relative mt-1 text-sm text-slate-400">
                {filtersActive ? "جرّب كلمة أخرى أو امسح التصفية لعرض كل المشاريع." : "كن أول من يعرض فكرته ويكوّن فريقاً!"}
              </p>
              {filtersActive && (
                <button onClick={resetFilters}
                  className="pressable relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-sm font-extrabold px-6 min-h-[46px] shadow-lg">
                  مسح التصفية <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 mb-4 flex items-center gap-3 animate-fade-up">
              <span className="h-8 w-1.5 rounded-full ft-grad-bar shrink-0 shadow" />
              <span className="inline-flex items-center gap-2 font-head text-lg sm:text-xl font-extrabold text-slate-800">
                <Sparkles className="w-5 h-5 ft-text-accent" />
                {filtersActive ? "نتائج التصفية" : "مسار المشاريع المتدفق"}
              </span>
              <span className="text-xs font-extrabold tabular-nums rounded-full bg-slate-900 text-white px-2.5 py-1">{ventures.length}</span>
              <span className="flex-1 h-px bg-gradient-to-l from-slate-200 to-transparent" />
            </div>

            <div className="relative isolate mt-2">
              {/* flowing gradient thread · desktop path feel */}
              <div aria-hidden="true"
                className="pointer-events-none absolute top-3 bottom-3 hidden md:block w-[3px] rounded-full [background:linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--ft-accent)_45%,transparent)_10%,color-mix(in_srgb,var(--ft-accent)_45%,transparent)_90%,transparent)]"
                style={{ insetInlineStart: "1.65rem" }} />
              <div className="space-y-5 sm:space-y-6 md:ps-16">
                {featured && renderFeatureRow(featured)}
                {renderCreateRow()}
                {(wallVentures || []).map((v, i) => renderRow(v, i))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============================ CREATE DIALOG ============================ */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[92dvh] flex flex-col gap-0 overflow-hidden rounded-[2rem] border-white/60 bg-white/95 backdrop-blur-xl p-0" dir="rtl">
          <div className="relative shrink-0 ft-navy-gradient text-white px-6 pt-6 pb-12 overflow-hidden isolate">
            <Rocket className="pointer-events-none absolute -left-6 -bottom-8 w-32 h-32 text-white/15 -rotate-12" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1.6px)] [background-size:20px_20px]" />
            <DialogHeader className="relative">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur text-white flex items-center justify-center shadow-lg shrink-0">
                  <Rocket className="w-5 h-5" />
                </span>
                <div className="text-start">
                  <DialogTitle className="font-head text-xl sm:text-2xl font-extrabold text-white">اعرض مشروعك 🚀</DialogTitle>
                  <p className="text-xs sm:text-sm text-white/70 mt-0.5">٣ خطوات ويصل مشروعك لكل الطلاب</p>
                </div>
              </div>
            </DialogHeader>
            <div className="relative flex items-center gap-2 mt-5">
              {["الفكرة", "التفاصيل", "الفريق"].map((s, i) => (
                <span key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur px-3 py-1.5 text-[11px] font-extrabold">
                    <span className="w-5 h-5 rounded-full bg-white text-slate-900 grid place-items-center text-[10px] font-black tabular-nums">{i + 1}</span>{s}
                  </span>
                  {i < 2 && <span className="flex-1 h-px bg-white/25" />}
                </span>
              ))}
            </div>
          </div>
          <div className="relative z-10 -mt-7 flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="bg-white rounded-[1.5rem] ring-1 ring-slate-200/70 ft-shadow-lg p-5 space-y-4">
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
              <Button onClick={create} disabled={saving} className="w-full rounded-full ft-btn-primary font-extrabold text-base min-h-[54px] pressable shadow-lg">
                {saving ? "جارٍ النشر..." : "انشر المشروع 🚀"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
