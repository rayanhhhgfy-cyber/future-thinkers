import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Flame, Trophy, BookOpen, Crown, Calendar, Zap, Award, TrendingUp, Sparkles, MessagesSquare, Medal, PenLine, EyeOff, Eye, ChevronUp, ChevronDown, Settings2, Check } from "lucide-react";
import * as Icons from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></div>
    </div>
    <div className="mt-3 text-2xl font-extrabold font-head text-slate-900">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
    {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

const DEFAULT_ORDER = ["stats", "reading", "recommendations", "events", "competitions", "achievements", "badges", "studio"];
const WIDGET_META = {
  stats: { label: "الإحصائيات", col: "full" },
  reading: { label: "متابعة القراءة", col: "main" },
  recommendations: { label: "موصى لك", col: "main" },
  events: { label: "فعاليات قادمة", col: "side" },
  competitions: { label: "منافسات مفتوحة", col: "side" },
  achievements: { label: "إنجازاتك", col: "side" },
  badges: { label: "شارات مهاراتي", col: "side" },
  studio: { label: "استوديو النشر", col: "side" },
};

function WidgetShell({ id, editMode, onMove, onHide, canUp, canDown, children }) {
  return (
    <div className={`relative ${editMode ? "ring-2 ring-dashed ring-violet-400 rounded-2xl" : ""}`}>
      {editMode && (
        <div className="absolute -top-3 left-3 z-10 flex items-center gap-1 bg-white rounded-full border border-slate-200 shadow px-1.5 py-1" dir="ltr">
          <button onClick={() => onMove(-1)} disabled={!canUp} className="p-1 disabled:opacity-30" title="أعلى"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={() => onMove(1)} disabled={!canDown} className="p-1 disabled:opacity-30" title="أسفل"><ChevronDown className="w-4 h-4" /></button>
          <button onClick={onHide} className="p-1 text-rose-500" title="إخفاء"><EyeOff className="w-4 h-4" /></button>
        </div>
      )}
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [gam, setGam] = useState(null);
  const [recs, setRecs] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [myWorks, setMyWorks] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    const [d, g, r, b, w, p] = await Promise.all([
      api.get("/dashboard"), api.get("/gamification/me"), api.get("/books/me/recommendations"),
      api.get("/badges/me").catch(() => ({ data: [] })),
      api.get("/studio/works/me").catch(() => ({ data: [] })),
      api.get("/widgets/prefs").catch(() => ({ data: { widgets: DEFAULT_ORDER } })),
    ]);
    setData(d.data); setGam(g.data); setRecs(r.data);
    setMyBadges(b.data); setMyWorks(w.data);
    const saved = (p.data.widgets || []).filter((k) => DEFAULT_ORDER.includes(k));
    setOrder(saved.length ? saved : DEFAULT_ORDER);
  };
  useEffect(() => { load(); }, []);

  const checkin = async () => {
    try {
      const { data: res } = await api.post("/gamification/checkin");
      if (res.already) toast.info("سجّلت حضورك اليوم بالفعل");
      else { toast.success(`سلسلة ${res.streak} أيام! +نقاط خبرة`); refresh(); load(); }
      setCheckedIn(true);
    } catch { toast.error("تعذّر تسجيل الحضور"); }
  };

  const move = (id, dir) => {
    const col = WIDGET_META[id].col;
    const idxs = order.map((k, i) => (WIDGET_META[k].col === col ? i : -1)).filter((i) => i >= 0);
    const pos = idxs.indexOf(order.indexOf(id));
    const swapPos = pos + dir;
    if (swapPos < 0 || swapPos >= idxs.length) return;
    const next = [...order];
    const a = idxs[pos], b = idxs[swapPos];
    [next[a], next[b]] = [next[b], next[a]];
    setOrder(next); setDirty(true);
  };
  const hide = (id) => { setOrder(order.filter((k) => k !== id)); setDirty(true); };
  const show = (id) => {
    const col = WIDGET_META[id].col;
    const next = [...order];
    const lastInCol = next.map((k, i) => (WIDGET_META[k].col === col ? i : -1)).filter((i) => i >= 0).pop();
    if (lastInCol === undefined) next.push(id);
    else next.splice(lastInCol + 1, 0, id);
    setOrder(next); setDirty(true);
  };
  const saveLayout = async () => {
    try { await api.put("/widgets/prefs", { widgets: order }); toast.success("حُفظ تخطيط لوحتك 🎨"); setEditMode(false); setDirty(false); }
    catch { toast.error("تعذّر الحفظ"); }
  };
  const resetLayout = () => { setOrder(DEFAULT_ORDER); setDirty(true); };

  if (!data || !gam) return <Layout><PageLoader /></Layout>;

  const hidden = DEFAULT_ORDER.filter((k) => !order.includes(k));
  const colOf = (col) => order.filter((k) => WIDGET_META[k].col === col);
  const shellProps = (id) => {
    const col = WIDGET_META[id].col;
    const ids = colOf(col);
    const pos = ids.indexOf(id);
    return { id, editMode, onMove: (d) => move(id, d), onHide: () => hide(id), canUp: pos > 0, canDown: pos < ids.length - 1 };
  };

  const widgets = {
    stats: (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Trophy} label="ترتيبك الوطني" value={`#${data.national_rank}`} color="#D97706" sub={data.school_rank ? `مدرستك: #${data.school_rank}` : ""} />
        <StatCard icon={BookOpen} label="كتب مقروءة" value={data.books_read} color="#2563EB" />
        <StatCard icon={Crown} label="تصنيف الشطرنج" value={data.chess_rating} color="#0A192F" />
        <StatCard icon={MessagesSquare} label="مشاركاتك" value={data.posts} color="#059669" />
      </div>
    ),
    reading: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-head font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> متابعة القراءة</h2>
          <Link to="/library" className="text-sm text-blue-600">المكتبة</Link>
        </div>
        {data.currently_reading.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">لم تبدأ أي كتاب بعد. <Link to="/library" className="text-blue-600">ابدأ القراءة الآن</Link></div>
        ) : (
          <div className="space-y-3">
            {data.currently_reading.map((b) => (
              <Link key={b.id} to={`/books/${b.id}`} className="flex items-center gap-4 p-2 rounded-xl hover:bg-slate-50">
                <img src={fileUrl(b.cover_url)} alt={b.title} className="w-12 h-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{b.title}</div>
                  <div className="text-xs text-slate-500 mb-1.5">{b.author}</div>
                  <Progress value={b.progress} className="h-1.5" />
                </div>
                <div className="text-sm font-bold text-blue-600">{Math.round(b.progress)}%</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    ),
    recommendations: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-emerald-600" /> موصى لك</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recs.slice(0, 4).map((b) => (
            <Link key={b.id} to={`/books/${b.id}`} className="group">
              <img src={fileUrl(b.cover_url)} alt={b.title} className="w-full aspect-[3/4] object-cover rounded-xl ft-shadow group-hover:scale-[1.03] transition-transform" />
              <div className="mt-2 text-sm font-medium text-slate-800 line-clamp-1">{b.title}</div>
              <div className="text-xs text-slate-400 line-clamp-1">{b.author}</div>
            </Link>
          ))}
        </div>
      </section>
    ),
    events: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-amber-600" /> فعاليات قادمة</h2>
        {data.upcoming_events.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا فعاليات حالياً</div> : data.upcoming_events.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`} className="block p-3 rounded-xl hover:bg-slate-50 border-r-2 border-amber-500 mb-2 bg-slate-50/50">
            <div className="font-medium text-sm text-slate-800">{e.title}</div>
            <div className="text-xs text-slate-400">{e.date} · {e.mode === "online" ? "عن بُعد" : "حضوري"}</div>
          </Link>
        ))}
      </section>
    ),
    competitions: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-blue-600" /> منافسات مفتوحة</h2>
        {data.open_competitions.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا مسابقات حالياً</div> : data.open_competitions.map((c) => (
          <Link key={c.id} to={`/competitions/${c.id}`} className="block p-3 rounded-xl hover:bg-slate-50 mb-2 bg-slate-50/50">
            <div className="font-medium text-sm text-slate-800">{c.title}</div>
            <div className="text-xs text-slate-400">{c.type}</div>
          </Link>
        ))}
        {data.chess_challenges > 0 && (
          <Link to="/clubs/chess" className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">
            <Crown className="w-4 h-4" /> لديك {data.chess_challenges} تحدي شطرنج
          </Link>
        )}
      </section>
    ),
    achievements: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-emerald-600" /> إنجازاتك</h2>
        {gam.badges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">اجمع إنجازك الأول!</div> : (
          <div className="flex flex-wrap gap-2">
            {gam.badges.map((b, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{b}</span>)}
          </div>
        )}
      </section>
    ),
    badges: (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-head font-bold text-lg flex items-center gap-2"><Medal className="w-5 h-5 text-amber-600" /> شارات مهاراتي</h2>
          <Link to={`/profile/${user.id}`} className="text-sm text-amber-600">ملفي</Link>
        </div>
        {myBadges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">تُمنح الشارات من المشرفين للتميز 🏅</div> : (
          <div className="flex flex-wrap gap-2">
            {myBadges.slice(0, 6).map((b) => {
              const Icon = Icons[b.icon] || Icons.Medal;
              return (
                <span key={b.key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium" style={{ background: b.color }}>
                  <Icon className="w-3.5 h-3.5" />{b.name}
                </span>
              );
            })}
          </div>
        )}
      </section>
    ),
    studio: (
      <section className="bg-gradient-to-l from-violet-600 to-purple-700 rounded-2xl p-6 text-white ft-shadow">
        <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-2"><PenLine className="w-5 h-5" /> استوديو النشر</h2>
        <p className="text-sm text-violet-200 mb-4">
          {myWorks.length === 0 ? "انشر مقالاتك وأشعارك وخواطرك" : `لديك ${myWorks.length} ${myWorks.length === 1 ? "عمل" : "أعمال"} · ${myWorks.filter((w) => w.status === "published").length} منشور`}
        </p>
        <Link to="/studio" className="inline-flex items-center gap-1.5 bg-white text-violet-700 text-sm font-bold px-4 py-2.5 rounded-xl">
          {myWorks.length === 0 ? "ابدأ الكتابة" : "افتح الاستوديو"}
        </Link>
      </section>
    ),
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero card */}
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-3xl p-8 text-white mb-6">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-slate-300 text-sm">أهلاً بك،</div>
              <h1 className="font-head text-3xl font-extrabold">{user.name}</h1>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" /> {gam.level_title} · المستوى {gam.level}
              </div>
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{gam.xp} نقطة خبرة</span><span>باقٍ {gam.xp_to_next} للمستوى التالي</span></div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${gam.level_progress}%` }} /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-5 py-3 rounded-2xl bg-white/10">
                <div className="text-2xl font-extrabold font-head flex items-center gap-1"><Flame className="w-5 h-5 text-orange-400" />{gam.streak}</div>
                <div className="text-[11px] text-slate-300">سلسلة أيام</div>
              </div>
              <Button data-testid="checkin-btn" onClick={checkin} disabled={checkedIn} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12">
                <Zap className="w-4 h-4 ml-1" /> حضور اليوم
              </Button>
            </div>
          </div>
        </div>

        {/* Customize bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-sm text-slate-500">{editMode ? "رتّب الودجت وأخفِ ما لا تحتاجه، ثم احفظ" : "لوحتك، بطريقتك 🎨"}</div>
          <div className="flex gap-2">
            {editMode && (
              <>
                <Button size="sm" variant="outline" onClick={resetLayout} className="rounded-xl">إعادة الافتراضي</Button>
                <Button size="sm" onClick={saveLayout} disabled={!dirty} className="rounded-xl bg-violet-600 hover:bg-violet-700"><Check className="w-4 h-4 ml-1" /> حفظ التخطيط</Button>
              </>
            )}
            <Button size="sm" variant={editMode ? "default" : "outline"} onClick={() => { setEditMode(!editMode); setDirty(false); }} className="rounded-xl">
              <Settings2 className="w-4 h-4 ml-1" /> {editMode ? "إنهاء التخصيص" : "تخصيص اللوحة"}
            </Button>
          </div>
        </div>

        {editMode && hidden.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-dashed border-slate-300 mb-4">
            <div className="text-sm font-bold text-slate-600 mb-2">ودجت مخفية — اضغط لإظهارها:</div>
            <div className="flex flex-wrap gap-2">
              {hidden.map((k) => (
                <button key={k} onClick={() => show(k)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  <Eye className="w-3.5 h-3.5" />{WIDGET_META[k].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* full-width widgets */}
        {colOf("full").map((k) => (
          <WidgetShell key={k} {...shellProps(k)}>{widgets[k]}</WidgetShell>
        ))}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {colOf("main").map((k) => (
              <WidgetShell key={k} {...shellProps(k)}>{widgets[k]}</WidgetShell>
            ))}
          </div>
          <div className="space-y-6">
            {colOf("side").map((k) => (
              <WidgetShell key={k} {...shellProps(k)}>{widgets[k]}</WidgetShell>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
