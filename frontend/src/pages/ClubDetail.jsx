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
import { Users, MessageSquare, Heart, Plus, Crown, Trophy, Swords, ArrowRight, Megaphone, Pin, Trash2, Send, Flame } from "lucide-react";
import { ChessArena } from "@/components/ChessArena";
import { CodingPanel, ProjectsPanel, DebatesPanel } from "@/components/ClubPanels";

const SPECIAL_INIT = { chess: "main", programming: "coding", innovation: "projects", debate: "debates" };

function fmtWhen(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; }
}

function ClubAnnouncements({ slug, club, color }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [gone, setGone] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const canManage = !!(
    (club && (club.is_manager || club.is_owner || club.is_admin ||
      ["manager", "owner", "admin"].includes(club.my_role) ||
      (user && club.manager_id && String(club.manager_id) === String(user.id)) ||
      (user && club.owner_id && String(club.owner_id) === String(user.id)) ||
      (user && Array.isArray(club.managers) && club.managers.some((m) => String((m && m.id) ?? m) === String(user.id))))) ||
    (user && (user.role === "admin" || user.role === "super_admin"))
  );

  const load = async () => {
    try {
      const { data } = await api.get(`/clubs/${slug}/announcements`);
      setItems(Array.isArray(data) ? data : (data.items || data.announcements || []));
    } catch { setGone(true); }
  };
  useEffect(() => { load(); }, [slug]);

  const post = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await api.post(`/clubs/${slug}/announcements`, { text: text.trim() });
      toast.success("نُشر الإعلان وسيصل الأعضاء إشعاراً 📣");
      setText("");
      load();
    } catch (e) { toast.error(apiErr(e)); }
    setPosting(false);
  };

  const remove = async (a) => {
    if (!window.confirm("حذف هذا الإعلان؟")) return;
    try {
      await api.delete(`/clubs/${slug}/announcements/${a.id}`);
      setItems((xs) => (xs || []).filter((x) => x.id !== a.id));
      toast.success("حُذف الإعلان");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const aText = (a) => a.text || a.body || "";
  const aName = (a) => a.author_name || a.user_name || a.name || "إدارة النادي";
  const canDel = (a) => canManage || (!!user && String(a.user_id ?? a.author_id ?? "") === String(user.id));

  if (gone || items === null) return null;
  if (!items.length && !canManage) return null;

  return (
    <section className="mb-6 animate-fade-up">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-10 h-10 rounded-2xl grid place-items-center text-white shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)`, boxShadow: `0 10px 22px -8px ${color}` }}><Megaphone className="w-5 h-5" /></span>
        <div>
          <h2 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 leading-tight">إعلانات النادي</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">أحدث مستجدات وإعلانات إدارة النادي</p>
        </div>
        {items.length > 0 && <span className="mr-auto text-[11px] font-extrabold px-2.5 py-1 rounded-full text-white shadow" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}>{items.length} إعلان</span>}
      </div>

      {canManage && (
        <div className="relative overflow-hidden bg-white rounded-3xl sm:rounded-[1.75rem] border border-slate-100 ft-shadow p-4 sm:p-5 mb-4">
          <span className="absolute inset-y-0 right-0 w-1.5" style={{ background: `linear-gradient(180deg, ${color}, ${color}66)` }} />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب إعلاناً لأعضاء النادي... اجتماع، مسابقة، موعد مهم" className="rounded-2xl bg-slate-50/70 focus:bg-white min-h-[84px]" />
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold">يصل الإعلان كإشعار لجميع أعضاء النادي</span>
            <Button onClick={post} disabled={posting || !text.trim()} className="pressable rounded-full min-h-[44px] px-5 text-white shadow-lg disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}>
              <Send className="w-4 h-4 ml-1" /> {posting ? "جارٍ النشر..." : "نشر الإعلان"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((a, i) => (
          <article key={a.id || i} className="group relative overflow-hidden bg-white rounded-3xl sm:rounded-[1.75rem] border border-slate-100 ft-shadow p-4 sm:p-5 animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
            <span className="absolute inset-y-0 right-0 w-1.5" style={{ background: `linear-gradient(180deg, ${color}, ${color}55)` }} />
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl text-white grid place-items-center font-head font-extrabold shrink-0 shadow-lg ring-4 ring-slate-50" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}>{aName(a).trim()?.[0]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}><Pin className="w-3 h-3" /> مثبّت</span>
                  <span className="font-extrabold text-sm text-slate-800">{aName(a)}</span>
                  {fmtWhen(a.created_at || a.at) && <span className="text-[11px] text-slate-400 font-semibold">{fmtWhen(a.created_at || a.at)}</span>}
                  {canDel(a) && (
                    <button onClick={() => remove(a)} className="pressable mr-auto text-slate-300 hover:text-rose-500 transition-colors p-1 shrink-0" aria-label="حذف الإعلان">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap">{aText(a)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClubLeaders({ slug, color }) {
  const [period, setPeriod] = useState("total");
  const [rows, setRows] = useState(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setGone(false);
    (async () => {
      try {
        const { data } = await api.get(`/clubs/${slug}/leaders`, { params: period === "month" ? { period: "month" } : {} });
        if (!alive) return;
        setRows(Array.isArray(data) ? data : (data.items || data.leaders || data.members || []));
      } catch {
        try {
          const { data } = await api.get(`/clubs/${slug}/members`);
          if (!alive) return;
          setRows(Array.isArray(data) ? data : (data.items || data.members || []));
        } catch { if (alive) setGone(true); }
      }
    })();
    return () => { alive = false; };
  }, [slug, period]);

  if (gone) return null;
  const val = (r) => (period === "month" ? (r.month_xp ?? r.monthly_xp ?? r.xp ?? 0) : (r.xp ?? r.total_xp ?? r.rating ?? 0));
  const sorted = rows ? [...rows].sort((a, b) => val(b) - val(a)).slice(0, 20) : null;
  const max = sorted && sorted.length ? Math.max(1, val(sorted[0])) : 1;
  const medals = ["from-amber-300 to-amber-500 shadow-amber-500/30", "from-slate-200 to-slate-400 shadow-slate-400/30", "from-orange-300 to-amber-600 shadow-orange-500/30"];

  return (
    <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow overflow-hidden animate-fade-up">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 flex-wrap" style={{ background: `linear-gradient(270deg, ${color}14, transparent 65%)` }}>
        <span className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-md shrink-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}><Trophy className="w-4 h-4" /></span>
        <div className="min-w-0">
          <div className="font-head font-extrabold text-slate-800 leading-tight">متصدرو النادي</div>
          <div className="text-[11px] text-slate-400 font-semibold">{period === "month" ? "سباق هذا الشهر بين الأعضاء" : "الترتيب الكلي حسب النقاط"}</div>
        </div>
        <div className="mr-auto flex items-center gap-1 rounded-full bg-slate-100/80 ring-1 ring-slate-200/60 p-1">
          {[["total", "الإجمالي"], ["month", "هذا الشهر"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} className={`pressable min-h-[34px] px-3.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition-all ${period === v ? "text-white shadow" : "text-slate-500 hover:text-slate-800"}`} style={period === v ? { background: `linear-gradient(135deg, ${color}, ${color}B3)` } : undefined}>
              {v === "month" && <Flame className="w-3 h-3" />}{l}
            </button>
          ))}
        </div>
      </div>

      {!sorted ? <PageLoader /> : sorted.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">لا أعضاء بعد في هذا الترتيب</div>
      ) : sorted.map((r, idx) => {
        const v = val(r);
        const rid = r.id || r.user_id;
        return (
          <Link key={rid || idx} to={rid ? `/profile/${rid}` : "#"} className={`group flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/70 ${idx === 0 ? "bg-amber-50/50" : idx === 1 ? "bg-slate-50/60" : idx === 2 ? "bg-orange-50/40" : ""}`}>
            <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl grid place-items-center text-sm font-extrabold shrink-0 ${idx < 3 ? `bg-gradient-to-br text-white shadow-lg ${medals[idx]}` : "bg-slate-100 text-slate-500"}`}>{idx + 1}</span>
            <span className={`rounded-full text-white grid place-items-center font-head font-extrabold shrink-0 ${idx === 0 ? "w-11 h-11 text-base ring-4 ring-amber-100" : "w-9 h-9 text-sm"}`} style={{ background: `linear-gradient(135deg, ${color}, ${color}B3)` }}>{r.name?.[0]}</span>
            <span className="flex-1 min-w-0">
              <span className="font-bold text-slate-800 truncate flex items-center gap-1.5">{r.name}{idx === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}</span>
              <span className="block text-xs text-slate-400 truncate">{r.school_name || ""}</span>
              <span className="mt-1.5 block h-1.5 max-w-[190px] rounded-full bg-slate-100 overflow-hidden">
                <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, Math.round((v / max) * 100))}%`, background: `linear-gradient(90deg, ${color}, ${color}B3)` }} />
              </span>
            </span>
            <span className="text-end shrink-0">
              <span className="block font-head font-extrabold text-slate-900">{v}</span>
              <span className="block text-[10px] font-bold text-slate-400">{period === "month" ? "XP الشهر" : "XP"}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

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
          <DialogTrigger asChild><Button data-testid="new-discussion-btn" className="pressable shrink-0 min-h-[44px] rounded-xl ft-btn-solid shadow-lg"><Plus className="w-4 h-4 ml-1" /> نقاش جديد</Button></DialogTrigger>
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
  const [gone, setGone] = useState(false);
  const [tab, setTab] = useState("main");

  const load = async () => {
    try {
      const { data } = await api.get(`/clubs/${slug}`);
      setClub(data);
    } catch { setGone(true); }
  };
  useEffect(() => { load(); setTab(SPECIAL_INIT[slug] || "main"); }, [slug]);

  const toggleMember = async () => {
    if (!user) return nav("/login");
    if (club.is_member) { await api.post(`/clubs/${slug}/leave`); } else { await api.post(`/clubs/${slug}/join`); toast.success("انضممت للنادي"); }
    load();
  };

  if (gone) return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="font-head font-black text-2xl">هذا النادي غير موجود</p>
        <p className="text-slate-500 text-sm mt-1.5">ربما حُذف أو تغيّر رابطه</p>
        <button onClick={() => nav("/clubs")} className="mt-6 rounded-2xl bg-slate-900 text-white px-6 py-3 font-head font-black transition hover:scale-[1.02] active:scale-95">
          عودة إلى الأندية
        </button>
      </div>
    </Layout>
  );
  if (!club) return <Layout><PageLoader /></Layout>;
  const Icon = Icons[club.icon] || Icons.Circle;

  const SPECIAL = {
    chess: [["main", "الحلبة"], ["leaderboard", "التصنيف"], ["forum", "النقاشات"]],
    programming: [["coding", "التحديات البرمجية"], ["leaderboard", "الصدارة"], ["forum", "النقاشات"]],
    innovation: [["projects", "المشاريع"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
    debate: [["debates", "المناظرات"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
  };
  const tabsBase = SPECIAL[slug] || [["forum", "النقاشات"], ["leaderboard", "الصدارة"], ["members", "الأعضاء"]];
  const tabs = [...tabsBase, ["leaders", "متصدرو النادي"]];
  const defaultTab = tabs[0][0];
  const activeTab = tab === "main" && slug !== "chess" ? defaultTab : (tab === "main" ? "main" : tab);
  const arenaWide = slug === "chess" && activeTab === "main";

  return (
    <Layout>
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${club.color}, #0A192F)` }}>
        <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 right-16 w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full blur-3xl pointer-events-none" style={{ background: `${club.color}55` }} />
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <Icon className="absolute -left-10 -bottom-12 w-56 h-56 sm:w-80 sm:h-80 text-white/[0.05] pointer-events-none -rotate-12" />
        <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 relative">
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

      <div className="max-w-7xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-[1.4rem] border border-slate-100 ft-shadow p-1.5 mb-6 flex gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(([v, l]) => (
            <button key={v} data-testid={`club-tab-${v}`} onClick={() => setTab(v)} className={`pressable shrink-0 min-h-[44px] px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === v ? "text-white shadow-lg scale-[1.02]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`} style={activeTab === v ? { background: `linear-gradient(135deg, ${club.color}, ${club.color}B3)`, boxShadow: `0 8px 20px -8px ${club.color}` } : undefined}>{l}</button>
          ))}
        </div>

        <div className={arenaWide ? "items-start" : "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 xl:gap-8 items-start"}>
          <div className="min-w-0">
            {slug === "science" && (
              <Link to="/clubs/science/lab" data-testid="science-lab-card"
                className="group block relative overflow-hidden rounded-[24px] mb-6 text-white shadow-[0_24px_50px_-18px_rgba(8,145,178,0.55)] hover:scale-[1.005] transition-transform">
                <div className="absolute inset-0 bg-gradient-to-l from-cyan-600 via-sky-700 to-violet-700" />
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(50%_120%_at_85%_10%,rgba(255,255,255,0.35),transparent),radial-gradient(40%_100%_at_10%_90%,rgba(34,211,238,0.5),transparent)]" />
                <div className="relative p-5 sm:p-7 flex items-center gap-4 sm:gap-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] bg-white/15 border border-white/25 backdrop-blur grid place-items-center text-4xl sm:text-5xl shrink-0 shadow-inner group-hover:rotate-6 transition-transform">⚗️</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-black tracking-wide text-cyan-100/90">جديد · نادي العلوم</div>
                    <div className="text-xl sm:text-3xl font-black mt-0.5 leading-snug">مختبر التفاعلات الكيميائية ثلاثي الأبعاد</div>
                    <p className="text-cyan-50/85 text-[13px] sm:text-sm mt-1 leading-relaxed">جدول دوري كامل ومركبات شائعة · اختر أي مواد وشاهد التفاعل يحدث ذرّةً ذرّة مع المعادلة والطاقة والحرارة</p>
                  </div>
                  <span className="hidden sm:grid w-12 h-12 rounded-full bg-white text-cyan-700 place-items-center font-black text-lg shrink-0 shadow-lg group-hover:-translate-x-1 transition-transform">←</span>
                </div>
              </Link>
            )}
            <ClubAnnouncements slug={slug} club={club} color={club.color} />
            {slug === "chess" && activeTab === "main" && <ChessArena />}
            {activeTab === "coding" && <CodingPanel />}
            {activeTab === "projects" && <ProjectsPanel />}
            {activeTab === "debates" && <DebatesPanel />}
            {activeTab === "forum" && <DialogueForum slug={slug} />}
            {activeTab === "leaderboard" && <ClubLeaderboard slug={slug} />}
            {activeTab === "members" && <MembersList slug={slug} />}
            {activeTab === "leaders" && <ClubLeaders slug={slug} color={club.color} />}
          </div>

          {!arenaWide && (
          <aside className="hidden lg:block space-y-4">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white ft-shadow">
              <div className="relative px-5 pb-5 pt-6 text-white" style={{ background: `linear-gradient(135deg, ${club.color}, #0A192F)` }}>
                <Icon className="pointer-events-none absolute -left-6 -bottom-8 h-28 w-28 -rotate-12 text-white/10" />
                <div className="relative flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur"><Icon className="h-6 w-6" /></span>
                  <div className="min-w-0">
                    <div className="truncate font-head text-base font-extrabold">{club.name}</div>
                    <div className="text-[11px] font-semibold text-white/70">{club.is_member ? "أنت عضو في هذا النادي" : "انضم وشارك في النشاطات"}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 text-center [&>*+*]:border-r [&>*+*]:border-slate-100">
                <div className="px-3 py-4">
                  <div className="flex items-center justify-center gap-1.5 font-head text-lg font-extrabold text-slate-900"><Users className="h-4 w-4" style={{ color: club.color }} />{club.members_count}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-400">عضو</div>
                </div>
                <div className="px-3 py-4">
                  <div className="flex items-center justify-center gap-1.5 font-head text-lg font-extrabold text-slate-900"><MessageSquare className="h-4 w-4" style={{ color: club.color }} />{club.discussions_count}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-400">نقاش</div>
                </div>
              </div>
              <p className="border-t border-slate-100 px-5 py-4 text-[13px] leading-relaxed text-slate-500 line-clamp-3">{club.description}</p>
              <div className="px-5 pb-5">
                <Button onClick={toggleMember} className={`pressable h-12 w-full rounded-2xl text-sm font-extrabold ${club.is_member ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "text-white shadow-lg"}`} style={club.is_member ? undefined : { background: `linear-gradient(135deg, ${club.color}, ${club.color}B3)` }}>
                  {club.is_member ? "مغادرة النادي" : "انضم للنادي الآن"}
                </Button>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-100 bg-white p-4 ft-shadow">
              <h3 className="px-1 font-head text-sm font-extrabold text-slate-800">أقسام النادي</h3>
              <div className="mt-3 space-y-1.5">
                {tabs.map(([v, l]) => (
                  <button key={v} onClick={() => setTab(v)} className={`pressable flex min-h-[44px] w-full items-center justify-between rounded-2xl px-4 text-sm font-bold transition-all ${activeTab === v ? "text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`} style={activeTab === v ? { background: `linear-gradient(135deg, ${club.color}, ${club.color}B3)` } : undefined}>
                    {l}
                    <ArrowRight className={`h-4 w-4 rotate-180 ${activeTab === v ? "text-white/80" : "text-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>
          </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MembersList({ slug }) {
  const [members, setMembers] = useState(null);
  useEffect(() => { api.get(`/clubs/${slug}/members`).then((r) => setMembers(r.data)).catch(() => {}); }, [slug]);
  if (!members) return <PageLoader />;
  if (!members.length) return <EmptyState icon={Users} title="لا أعضاء بعد" desc="كن أول المنضمين لهذا النادي" />;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {members.map((m, idx) => (
        <Link key={m.id} to={`/profile/${m.id}`} className="group flex items-center gap-3 bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow hover-lift pressable animate-fade-up" style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-head font-extrabold shrink-0 shadow-lg shadow-blue-500/25 ring-4 ring-blue-50/60 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">{m.name?.[0]}</div>
          <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{m.name}</div><div className="text-xs text-slate-400 truncate">{m.school_name}</div></div>
          <div className="text-[11px] ft-text-accent font-extrabold ft-bg-soft border ft-border-accent px-2.5 py-1 rounded-full shrink-0">مستوى {m.level}</div>
        </Link>
      ))}
    </div>
  );
}
