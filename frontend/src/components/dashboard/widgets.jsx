import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl, apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FadeUp } from "@/components/anim";
import { useBookmarks } from "@/components/BookmarkButton";
import {
  Target, Pencil, BookOpen, Crown, MessagesSquare, Flame, CalendarClock, Trophy,
  Dices, Bookmark as BookmarkIcon, Trash2, Users, Sparkles, Award, Medal,
  MapPin, Timer, CheckCircle2, XCircle, Gift, ChevronLeft,
} from "lucide-react";
import * as Icons from "lucide-react";

const Section = ({ icon: Icon, title, color, link, linkLabel, children, className = "" }) => (
  <FadeUp>
    <section className={`bg-white rounded-2xl p-6 border border-slate-100 ft-shadow ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-head font-bold text-lg flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color }} /> {title}
        </h2>
        {link && <Link to={link} className="text-sm font-medium flex items-center gap-0.5" style={{ color }}>{linkLabel} <ChevronLeft className="w-4 h-4" /></Link>}
      </div>
      {children}
    </section>
  </FadeUp>
);

/* ---------------- 1. Weekly goals ---------------- */
const GOAL_DEFS = [
  { k: "books", label: "كتب", icon: BookOpen, color: "#2563EB" },
  { k: "chess", label: "مباريات شطرنج", icon: Crown, color: "#B45309" },
  { k: "discussions", label: "مشاركات نقاشية", icon: MessagesSquare, color: "#059669" },
];

function Ring({ pct, color, size = 92 }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="9" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} className="transition-all duration-700" />
    </svg>
  );
}

export function WeeklyGoals() {
  const [wg, setWg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ books: 2, chess: 3, discussions: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/goals/weekly").then((r) => {
      setWg(r.data);
      setForm({ books: r.data.goals.books, chess: r.data.goals.chess, discussions: r.data.goals.discussions });
    }).catch(() => {});
  }, []);

  const save = async () => {
    const payload = {
      books: Math.max(0, Math.min(50, Number(form.books) || 0)),
      chess: Math.max(0, Math.min(50, Number(form.chess) || 0)),
      discussions: Math.max(0, Math.min(50, Number(form.discussions) || 0)),
    };
    setSaving(true);
    try {
      const { data } = await api.put("/goals/weekly", payload);
      setWg(data); setForm({ books: data.goals.books, chess: data.goals.chess, discussions: data.goals.discussions });
      setOpen(false); toast.success("حُفظت أهداف الأسبوع 🎯");
    } catch { toast.error("تعذّر حفظ الأهداف"); }
    setSaving(false);
  };

  return (
    <Section icon={Target} title="أهداف الأسبوع" color="#7c3aed" linkLabel="">
      <div className="text-xs text-slate-400 mb-4 -mt-2">هذا الأسبوع · تُحتسب تلقائياً من نشاطك</div>
      {!wg ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div> : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {GOAL_DEFS.map((g) => {
              const target = wg.goals[g.k] || 0;
              const prog = wg.progress[g.k] || 0;
              const pct = target > 0 ? prog / target : 0;
              const GIcon = g.icon;
              return (
                <div key={g.k} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <Ring pct={pct} color={g.color} />
                    <div className="absolute inset-0 grid place-items-center">
                      <div>
                        <div className="text-lg font-extrabold font-head text-slate-900 leading-none">{prog}<span className="text-xs text-slate-400 font-normal">/{target}</span></div>
                        <GIcon className="w-4 h-4 mx-auto mt-1" style={{ color: g.color }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-2">{g.label}</div>
                  {pct >= 1 && target > 0 && <div className="text-[11px] font-bold text-emerald-600 mt-0.5">أُنجز! 🎉</div>}
                </div>
              );
            })}
          </div>
          <Button variant="outline" onClick={() => setOpen(true)} className="w-full mt-4 rounded-xl text-sm">
            <Pencil className="w-4 h-4 ml-1" /> تعديل الأهداف
          </Button>
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="font-head">أهداف هذا الأسبوع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {GOAL_DEFS.map((g) => (
              <div key={g.k}>
                <Label className="text-sm">{g.label}</Label>
                <Input type="number" min={0} max={50} value={form[g.k]}
                  onChange={(e) => setForm({ ...form, [g.k]: e.target.value })}
                  className="rounded-xl mt-1 text-base" />
              </div>
            ))}
            <Button onClick={save} disabled={saving} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700">
              {saving ? "جارٍ الحفظ…" : "حفظ الأهداف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

/* ---------------- 2. Activity heatmap ---------------- */
function heatColor(count) {
  if (count <= 0) return "bg-slate-100";
  if (count <= 2) return "bg-emerald-200";
  if (count <= 4) return "bg-emerald-400";
  if (count <= 7) return "bg-emerald-600";
  return "bg-emerald-800";
}

export function ActivityHeatmap() {
  const [days, setDays] = useState(null);
  useEffect(() => {
    api.get("/activity/heatmap").then((r) => setDays(r.data.days || [])).catch(() => setDays([]));
  }, []);
  const total = (days || []).reduce((s, d) => s + (d.count || 0), 0);
  const weeks = [];
  if (days) {
    const firstDow = new Date(days[0]?.date + "T12:00:00").getDay();
    const padded = [...Array(firstDow).fill(null), ...days];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  }
  return (
    <Section icon={Flame} title="خريطة نشاطك" color="#ea580c">
      {!days ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div> : days.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-6">ابدأ نشاطك لتظهر خريطتك 🗺️</div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2 -mx-1 px-1" dir="ltr">
            <div className="flex gap-1 w-max">
              {weeks.map((w, wi) => (
                <div key={wi} className="grid grid-rows-7 gap-1">
                  {w.map((d, di) => d ? (
                    <div key={d.date} title={`${d.date} · ${d.count} نشاط`}
                      className={`w-3.5 h-3.5 rounded-[4px] ${heatColor(d.count)} hover:ring-2 hover:ring-emerald-300 transition-transform hover:scale-110`} />
                  ) : <div key={`e-${di}`} className="w-3.5 h-3.5" />)}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <span>{total} نشاطاً خلال 120 يوماً</span>
            <span className="flex items-center gap-1">أقل
              {[0, 1, 3, 6, 9].map((c) => <span key={c} className={`w-3 h-3 rounded-[3px] ${heatColor(c)}`} />)}
              أكثر</span>
          </div>
        </>
      )}
    </Section>
  );
}

/* ---------------- 3. Upcoming & deadlines ---------------- */
function countdown(endAt) {
  const ms = new Date(endAt).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return { text: "انتهى", urgent: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return { text: `متبقي ${days} ${days === 1 ? "يوم" : days === 2 ? "يومان" : "أيام"}`, urgent: days <= 2 };
  if (hours > 0) return { text: `متبقي ${hours} ${hours === 1 ? "ساعة" : hours === 2 ? "ساعتان" : "ساعات"}`, urgent: true };
  return { text: "ينتهي قريباً", urgent: true };
}

export function UpcomingDeadlines() {
  const [events, setEvents] = useState(null);
  const [comps, setComps] = useState(null);
  useEffect(() => {
    api.get("/events/mine").then((r) => setEvents(r.data.items || [])).catch(() => setEvents([]));
    api.get("/competitions/mine").then((r) => setComps(r.data.items || [])).catch(() => setComps([]));
  }, []);
  const loading = events === null || comps === null;
  const empty = !loading && events.length === 0 && comps.length === 0;
  return (
    <Section icon={CalendarClock} title="مواعيدك القادمة" color="#d97706">
      {loading ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div>
        : empty ? <div className="text-sm text-slate-400 text-center py-6">لا توجد مواعيد قادمة 📅<br /><Link to="/events" className="text-amber-600 font-medium">تصفح الفعاليات</Link></div> : (
        <div className="space-y-2">
          {events.slice(0, 4).map((e) => (
            <Link key={`e-${e.id}`} to={`/events/${e.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 line-clamp-1">{e.title}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{e.date}{e.time ? ` · ${e.time}` : ""}</div>
              </div>
            </Link>
          ))}
          {comps.slice(0, 4).map((c) => {
            const cd = countdown(c.end_at);
            return (
              <Link key={`c-${c.id}`} to={`/competitions/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 grid place-items-center shrink-0"><Trophy className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 line-clamp-1">{c.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.type}</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${cd.urgent ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-emerald-100 text-emerald-700"}`}>
                  <Timer className="w-3 h-3" />{cd.text}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ---------------- 4. Daily challenge ---------------- */
export function DailyChallenge({ onXp }) {
  const [ch, setCh] = useState(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/challenge/today").then((r) => setCh(r.data)).catch(() => setCh(null));
  }, []);
  const answer = async (i) => {
    if (busy || !ch || ch.done) return;
    setBusy(true);
    try {
      const { data } = await api.post("/challenge/today/answer", { choice: i });
      setCh({ ...ch, done: true, was_correct: data.was_correct });
      setPicked(i);
      if (data.was_correct) {
        toast.success(`إجابة صحيحة! +${data.xp_awarded} نقطة خبرة 🎉`);
        onXp && onXp();
      } else toast.error("إجابة خاطئة — حاول غداً 💪");
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  return (
    <Section icon={Dices} title="تحدي اليوم" color="#0891b2" className="bg-gradient-to-br from-white to-cyan-50/60">
      {!ch ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div> : ch.done ? (
        <div className="text-center py-4">
          <div className={`w-16 h-16 mx-auto rounded-full grid place-items-center mb-3 ${ch.was_correct ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>
            {ch.was_correct ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>
          <div className="font-head font-bold text-slate-800">{ch.was_correct ? "أحسنت! أجبت بشكل صحيح 🎉" : "لم توفّق هذه المرة"}</div>
          <div className="text-sm text-slate-500 mt-1">عُد غداً لتحدٍّ جديد وسؤال جديد</div>
        </div>
      ) : (
        <div>
          <p className="font-head font-bold text-slate-900 leading-relaxed mb-4">{ch.q}</p>
          <div className="grid gap-2">
            {ch.options.map((o, i) => (
              <button key={i} disabled={busy} onClick={() => answer(i)}
                className="text-right p-3 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/60 transition-all text-sm font-medium text-slate-700 pressable disabled:opacity-60">
                <span className="inline-grid place-items-center w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold ml-2">{["أ", "ب", "ج", "د"][i]}</span>
                {o}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-amber-500" /> الإجابة الصحيحة تمنحك نقاط خبرة</div>
        </div>
      )}
    </Section>
  );
}

/* ---------------- 5. Saved items ---------------- */
const KIND_META = {
  book: { label: "كتب", icon: BookOpen, color: "#2563EB", link: (id) => `/books/${id}` },
  work: { label: "أعمال", icon: Sparkles, color: "#7c3aed", link: (id) => `/studio/${id}` },
  venture: { label: "مشاريع", icon: Trophy, color: "#e11d48", link: (id) => `/ventures/${id}` },
  event: { label: "فعاليات", icon: CalendarClock, color: "#d97706", link: (id) => `/events/${id}` },
  competition: { label: "مسابقات", icon: Medal, color: "#0891b2", link: (id) => `/competitions/${id}` },
  club: { label: "نوادٍ", icon: Users, color: "#059669", link: (id) => `/clubs/${id}` },
  news: { label: "أخبار", icon: BookmarkIcon, color: "#64748b", link: () => `/news` },
};

export function SavedItems() {
  const { map, removeById } = useBookmarks();
  const items = [...map.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const groups = {};
  items.forEach((b) => { (groups[b.kind] = groups[b.kind] || []).push(b); });
  return (
    <Section icon={BookmarkIcon} title="عناصرك المحفوظة" color="#b45309">
      {items.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-6">لا عناصر محفوظة بعد 📌<br /><span className="text-xs">اضغط أيقونة الحفظ على الكتب والأعمال والمشاريع</span></div>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pl-1">
          {Object.entries(groups).map(([kind, list]) => {
            const meta = KIND_META[kind] || KIND_META.news;
            const KIcon = meta.icon;
            return (
              <div key={kind}>
                <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                  <KIcon className="w-3.5 h-3.5" style={{ color: meta.color }} /> {meta.label} ({list.length})
                </div>
                <div className="space-y-1.5">
                  {list.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors group">
                      <Link to={meta.link(b.ref_id)} className="flex-1 min-w-0 text-sm font-medium text-slate-700 line-clamp-1 hover:text-slate-900">{b.title}</Link>
                      <button onClick={() => removeById(b.id, `${b.kind}:${b.ref_id}`)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" aria-label="إزالة">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ---------------- 6. Suggested for you ---------------- */
export function Suggestions() {
  const [s, setS] = useState(null);
  const [joining, setJoining] = useState(null);
  useEffect(() => {
    api.get("/suggestions").then((r) => setS(r.data)).catch(() => setS({ clubs: [], books: [], people: [] }));
  }, []);
  const join = async (slug) => {
    setJoining(slug);
    try {
      await api.post(`/clubs/${slug}/join`);
      toast.success("انضممت للنادي 🎉");
      setS((prev) => ({ ...prev, clubs: (prev.clubs || []).filter((c) => c.slug !== slug) }));
    } catch (e) { toast.error(apiErr(e)); }
    setJoining(null);
  };
  const empty = s && (s.clubs || []).length === 0 && (s.books || []).length === 0 && (s.people || []).length === 0;
  return (
    <Section icon={Sparkles} title="مقترح لك" color="#db2777">
      {!s ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div>
        : empty ? <div className="text-sm text-slate-400 text-center py-6">لا اقتراحات حالياً — واصل نشاطك ✨</div> : (
        <div className="grid md:grid-cols-3 gap-5">
          {(s.clubs || []).length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">نوادٍ قد تعجبك</div>
              <div className="space-y-2">
                {s.clubs.map((c) => {
                  const CIcon = Icons[c.icon] || Users;
                  return (
                    <div key={c.slug} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60">
                      <span className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: c.color || "#059669" }}>
                        <CIcon className="w-4.5 h-4.5" />
                      </span>
                      <Link to={`/clubs/${c.slug}`} className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 line-clamp-1">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.members_count || 0} عضو</div>
                      </Link>
                      <Button size="sm" onClick={() => join(c.slug)} disabled={joining === c.slug} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                        {joining === c.slug ? "…" : "انضم"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {(s.books || []).length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">كتب لك</div>
              <div className="grid grid-cols-4 md:grid-cols-2 gap-2">
                {s.books.map((b) => (
                  <Link key={b.id} to={`/books/${b.id}`} className="group">
                    <img src={fileUrl(b.cover_url)} alt={b.title} loading="lazy" className="w-full aspect-[3/4] object-cover rounded-xl bg-slate-100 group-hover:scale-[1.04] transition-transform" />
                    <div className="mt-1 text-[11px] font-medium text-slate-700 line-clamp-1">{b.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(s.people || []).length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">نشطاء مميزون</div>
              <div className="space-y-2">
                {s.people.map((p) => (
                  <Link key={p.user_id} to={`/profile/${p.user_id}`} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    {p.avatar ? <img src={fileUrl(p.avatar)} alt={p.name} className="w-9 h-9 rounded-full object-cover" />
                      : <span className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 grid place-items-center font-bold text-sm">{p.name?.trim()?.[0]}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 line-clamp-1">{p.name}</div>
                      <div className="text-[11px] text-slate-400">{p.level_title} · {p.xp} نقطة</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------------- 7. Achievements showcase ---------------- */
export function AchievementsShowcase() {
  const [achs, setAchs] = useState(null);
  useEffect(() => {
    api.get("/gamification/achievements").then((r) => setAchs(r.data || [])).catch(() => setAchs([]));
  }, []);
  const unlocked = (achs || []).filter((a) => a.unlocked);
  const locked = (achs || []).filter((a) => !a.unlocked);
  return (
    <Section icon={Award} title="قاعة إنجازاتك" color="#d97706" link="/points" linkLabel="صفحة النقاط">
      {!achs ? <div className="text-sm text-slate-400 text-center py-6">جارٍ التحميل…</div>
        : achs.length === 0 ? <div className="text-sm text-slate-400 text-center py-6">لا إنجازات معرّفة بعد 🏆</div> : (
        <>
          <div className="text-xs text-slate-400 mb-3 -mt-1">فتحت {unlocked.length} من {achs.length} إنجازاً</div>
          {unlocked.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
              {unlocked.map((a) => {
                const AIcon = Icons[a.icon] || Award;
                return (
                  <div key={a.key} className="relative overflow-hidden rounded-2xl p-4 text-center bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white ft-shadow">
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                    <div className="relative">
                      <div className="w-11 h-11 mx-auto rounded-full bg-white/25 grid place-items-center mb-2"><AIcon className="w-5.5 h-5.5" /></div>
                      <div className="text-sm font-bold font-head leading-tight">{a.title}</div>
                      {a.description && <div className="text-[11px] text-white/85 mt-1 line-clamp-2">{a.description}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {locked.length > 0 && (
            <>
              <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Medal className="w-3.5 h-3.5" /> بانتظارك</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {locked.slice(0, 8).map((a) => {
                  const AIcon = Icons[a.icon] || Award;
                  return (
                    <div key={a.key} className="rounded-2xl p-4 text-center bg-slate-50 border border-dashed border-slate-200 opacity-70">
                      <div className="w-11 h-11 mx-auto rounded-full bg-slate-200 grid place-items-center mb-2 text-slate-400"><AIcon className="w-5 h-5" /></div>
                      <div className="text-xs font-bold text-slate-500 leading-tight">{a.title}</div>
                      {a.description && <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{a.description}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  );
}
