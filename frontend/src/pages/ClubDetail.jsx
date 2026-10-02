import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Users, MessageSquare, Heart, Plus, Crown, Trophy, Swords, ArrowRight } from "lucide-react";
import { ChessArena } from "@/components/ChessArena";
import { CodingPanel, ProjectsPanel, DebatesPanel } from "@/components/ClubPanels";

const SPECIAL_INIT = { chess: "main", programming: "coding", innovation: "projects", debate: "debates" };

function DialogueForum({ slug }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "مجتمع" });

  const load = async () => {
    const { data } = await api.get("/discussions", { params: { club_slug: slug, category: cat || undefined } });
    setItems(data.items);
  };
  useEffect(() => { api.get("/discussions/categories").then((r) => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [cat, slug]);

  const create = async () => {
    if (!user) return nav("/login");
    if (form.title.length < 3) return toast.error("العنوان قصير جداً");
    try { await api.post("/discussions", { ...form, club_slug: slug }); toast.success("تم نشر النقاش"); setOpen(false); setForm({ title: "", body: "", category: "مجتمع" }); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 -mb-1 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setCat("")} className={`pressable shrink-0 min-h-[40px] px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${!cat ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>الكل</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`pressable shrink-0 min-h-[40px] px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cat === c ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>{c}</button>)}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-discussion-btn" className="pressable shrink-0 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25"><Plus className="w-4 h-4 ml-1" /> نقاش جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء نقاش جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input data-testid="disc-title" placeholder="عنوان النقاش" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="disc-category" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea data-testid="disc-body" placeholder="اكتب تفاصيل النقاش…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="rounded-xl min-h-[120px]" />
            </div>
            <DialogFooter><Button data-testid="disc-submit" onClick={create} className="rounded-xl bg-blue-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <EmptyState icon={MessageSquare} title="لا نقاشات بعد" desc="كن أول من يبدأ نقاشاً في هذا النادي" />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {items.map((d, idx) => (
            <Link key={d.id} to={`/discussions/${d.id}`} data-testid={`discussion-${d.id}`} className="group relative block overflow-hidden bg-white rounded-3xl sm:rounded-[1.75rem] p-5 sm:p-6 border border-slate-100 ft-shadow hover-lift pressable animate-fade-up" style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}>
              <span className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-head font-extrabold shrink-0 shadow-lg shadow-blue-500/25 ring-4 ring-blue-50 transition-transform duration-300 group-hover:scale-105">{d.author_name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{d.category}</span>
                    <span className="text-xs text-slate-400">{d.author_name}</span>
                  </div>
                  <h3 className="font-head font-extrabold text-base sm:text-lg text-slate-900 mt-2 leading-snug group-hover:text-blue-700 transition-colors">{d.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">{d.body}</p>
                  <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full"><Heart className="w-3.5 h-3.5" />{d.likes_count}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full"><MessageSquare className="w-3.5 h-3.5" />{d.replies_count}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubLeaderboard({ slug }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (slug === "chess") api.get("/chess/leaderboard").then((r) => setRows(r.data.map((x, i) => ({ ...x, rank: i + 1, xp: x.rating }))));
    else api.get("/leaderboard", { params: { scope: "national", limit: 20 } }).then((r) => setRows(r.data));
  }, [slug]);
  if (!rows) return <PageLoader />;
  const medals = ["bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg shadow-amber-500/30", "bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-lg shadow-slate-400/30", "bg-gradient-to-br from-orange-300 to-amber-600 text-white shadow-lg shadow-orange-500/30"];
  return (
    <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow overflow-hidden animate-fade-up">
      <div className="px-5 py-4 bg-gradient-to-l from-amber-50 to-white border-b border-amber-100/70 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <span className="font-head font-extrabold text-slate-800">{slug === "chess" ? "تصنيف الشطرنج" : "صدارة النادي"}</span>
      </div>
      {rows.map((r, idx) => (
        <div key={r.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-50 last:border-0 transition-all duration-300 hover:bg-slate-50/70 hover:pr-6 ${idx === 0 ? "bg-amber-50/50" : idx === 1 ? "bg-slate-50/60" : idx === 2 ? "bg-orange-50/40" : ""}`}>
          <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center text-sm font-extrabold shrink-0 ${r.rank <= 3 ? medals[r.rank - 1] : "bg-slate-100 text-slate-500"}`}>{r.rank}</span>
          <div className={`rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-bold shrink-0 ${idx === 0 ? "w-11 h-11 text-base ring-4 ring-amber-100" : "w-9 h-9 text-sm"}`}>{r.name?.[0]}</div>
          <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate flex items-center gap-1.5">{r.name}{idx === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}</div><div className="text-xs text-slate-400 truncate">{r.school_name}</div></div>
          <div className="font-head font-extrabold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-sm shrink-0">{slug === "chess" ? `${r.rating || r.xp}` : `${r.xp} XP`}</div>
        </div>
      ))}
    </div>
  );
}

export default function ClubDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [club, setClub] = useState(null);
  const [tab, setTab] = useState("main");

  const load = async () => { const { data } = await api.get(`/clubs/${slug}`); setClub(data); };
  useEffect(() => { load(); setTab(SPECIAL_INIT[slug] || "main"); }, [slug]);

  const toggleMember = async () => {
    if (!user) return nav("/login");
    if (club.is_member) { await api.post(`/clubs/${slug}/leave`); } else { await api.post(`/clubs/${slug}/join`); toast.success("انضممت للنادي"); }
    load();
  };

  if (!club) return <Layout><PageLoader /></Layout>;
  const Icon = Icons[club.icon] || Icons.Circle;

  const SPECIAL = {
    chess: [["main", "الحلبة"], ["leaderboard", "التصنيف"], ["forum", "النقاشات"]],
    programming: [["coding", "التحديات البرمجية"], ["leaderboard", "الصدارة"], ["forum", "النقاشات"]],
    innovation: [["projects", "المشاريع"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
    debate: [["debates", "المناظرات"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
  };
  const tabs = SPECIAL[slug] || [["forum", "النقاشات"], ["leaderboard", "الصدارة"], ["members", "الأعضاء"]];
  const defaultTab = tabs[0][0];
  const activeTab = tab === "main" && slug !== "chess" ? defaultTab : (tab === "main" ? "main" : tab);

  return (
    <Layout>
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${club.color}, #0A192F)` }}>
        <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 right-16 w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full blur-3xl pointer-events-none" style={{ background: `${club.color}55` }} />
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <Icon className="absolute -left-10 -bottom-12 w-56 h-56 sm:w-80 sm:h-80 text-white/[0.05] pointer-events-none -rotate-12" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 relative">
          <Link to="/clubs" className="pressable inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white/75 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-3.5 py-2 backdrop-blur transition-colors mb-5 sm:mb-6"><ArrowRight className="w-4 h-4" /> كل الأندية</Link>
          <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-up">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-[1.4rem] sm:rounded-[1.75rem] bg-white/15 border border-white/25 backdrop-blur grid place-items-center shrink-0 shadow-2xl overflow-hidden"><span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" /><Icon className="w-8 h-8 sm:w-12 sm:h-12 relative drop-shadow" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-head text-2xl sm:text-3xl lg:text-[2.6rem] font-extrabold leading-tight">{club.name}</h1>
                  {club.is_member && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-slate-900 shadow">أنت عضو</span>}
                </div>
                <p className="text-white/85 mt-2 sm:mt-3 max-w-xl leading-relaxed sm:leading-loose text-sm sm:text-base">{club.description}</p>
                <div className="mt-4 sm:mt-5 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/10 border border-white/15 rounded-full px-3.5 py-2 backdrop-blur"><Users className="w-4 h-4" />{club.members_count} عضو</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/10 border border-white/15 rounded-full px-3.5 py-2 backdrop-blur"><MessageSquare className="w-4 h-4" />{club.discussions_count} نقاش</span>
                </div>
              </div>
            </div>
            <Button data-testid="join-club-btn" onClick={toggleMember} className={`pressable rounded-2xl h-12 sm:h-14 px-6 sm:px-8 text-base font-extrabold shrink-0 ${club.is_member ? "bg-white/15 hover:bg-white/25 text-white border border-white/25" : "bg-white text-slate-900 hover:bg-white/90 shadow-2xl"}`}>
              {club.is_member ? "مغادرة النادي" : "انضم للنادي"}
            </Button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-l from-transparent via-white/30 to-transparent relative" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="sticky top-16 z-40 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-[1.4rem] border border-slate-100 ft-shadow p-1.5 mb-6 flex gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(([v, l]) => (
            <button key={v} data-testid={`club-tab-${v}`} onClick={() => setTab(v)} className={`pressable shrink-0 min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === v ? "text-white shadow-lg scale-[1.02]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`} style={activeTab === v ? { background: `linear-gradient(135deg, ${club.color}, ${club.color}B3)`, boxShadow: `0 8px 20px -8px ${club.color}` } : undefined}>{l}</button>
          ))}
        </div>

        {slug === "chess" && activeTab === "main" && <ChessArena />}
        {activeTab === "coding" && <CodingPanel />}
        {activeTab === "projects" && <ProjectsPanel />}
        {activeTab === "debates" && <DebatesPanel />}
        {activeTab === "forum" && <DialogueForum slug={slug} />}
        {activeTab === "leaderboard" && <ClubLeaderboard slug={slug} />}
        {activeTab === "members" && <MembersList slug={slug} />}
      </div>
    </Layout>
  );
}

function MembersList({ slug }) {
  const [members, setMembers] = useState(null);
  useEffect(() => { api.get(`/clubs/${slug}/members`).then((r) => setMembers(r.data)); }, [slug]);
  if (!members) return <PageLoader />;
  if (!members.length) return <EmptyState icon={Users} title="لا أعضاء بعد" desc="كن أول المنضمين لهذا النادي" />;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {members.map((m, idx) => (
        <Link key={m.id} to={`/profile/${m.id}`} className="group flex items-center gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow hover-lift pressable animate-fade-up" style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-head font-extrabold shrink-0 shadow-lg shadow-blue-500/25 ring-4 ring-blue-50/60 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{m.name?.[0]}</div>
          <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{m.name}</div><div className="text-xs text-slate-400 truncate">{m.school_name}</div></div>
          <div className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">مستوى {m.level}</div>
        </Link>
      ))}
    </div>
  );
}
