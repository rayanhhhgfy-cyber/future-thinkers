import React, { useEffect, useRef, useState } from "react";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Radio, CalendarClock, Users, Plus, X, Send, Clock3, BookOpen,
  Loader2, CircleDot, ChevronRight, Crown, Zap, MessageCircle,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* جلسات قراءة مباشرة · scheduled live reading sessions with a glass room,
   live chat (polled), attendance and XP for joining while live. */
export default function LiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", book_id: "", starts_at: "", duration_min: 45 });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/growth/sessions");
      setSessions(data);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!showCreate) return;
    api.get("/books", { params: { limit: 60 } }).then((r) => {
      const items = Array.isArray(r.data) ? r.data : r.data?.items || [];
      setBooks(items);
    }).catch(() => {});
  }, [showCreate]);

  if (!sessions) return <Layout><PageLoader /></Layout>;

  const canHost = (user?.level || 1) >= 3 || ["admin", "super_admin", "moderator", "teacher"].includes(user?.role || "");
  const live = sessions.filter((s) => s.state === "live");
  const upcoming = sessions.filter((s) => s.state === "scheduled");
  const past = sessions.filter((s) => s.state === "ended");

  const create = async () => {
    if (!form.title.trim() || !form.starts_at) { toast.error("أدخل العنوان ووقت البداية"); return; }
    setBusy(true);
    try {
      const starts = new Date(form.starts_at);
      await api.post("/growth/sessions", {
        title: form.title.trim(), description: form.description.trim(),
        book_id: form.book_id || null, starts_at: starts.toISOString(),
        duration_min: Number(form.duration_min) || 45,
      });
      toast.success("أُنشئت الجلسة وستظهر للجميع");
      setShowCreate(false);
      setForm({ title: "", description: "", book_id: "", starts_at: "", duration_min: 45 });
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const stateBadge = (s) => s.state === "live"
    ? <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse"><CircleDot className="w-3.5 h-3.5" /> مباشر الآن</span>
    : s.state === "scheduled"
      ? <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20"><CalendarClock className="w-3.5 h-3.5" /> قادمة</span>
      : <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-slate-900/[0.06] text-slate-400">انتهت</span>;

  const SessionCard = ({ s }) => (
    <button onClick={() => setOpenId(s.id)} className="pressable w-full text-start relative overflow-hidden rounded-[26px] p-[1px] bg-gradient-to-br from-white/60 via-white/30 to-rose-300/40 ft-shadow hover:-translate-y-0.5 transition-transform">
      <div className="relative rounded-[25px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-12 -left-12 w-36 h-36 rounded-full bg-rose-400/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            {stateBadge(s)}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400"><Users className="w-3.5 h-3.5" /> {s.attendees} مشارك</span>
          </div>
          <h3 className="font-head font-extrabold text-lg text-slate-900 leading-snug mt-3">{s.title}</h3>
          {s.book_title && <div className="text-xs font-bold text-rose-500 mt-1 inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {s.book_title}</div>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" /> {s.host_name}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {new Date(s.starts_at).toLocaleString("ar-JO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {s.duration_min} دقيقة</span>
            {s.joined && <span className="inline-flex items-center gap-1 text-emerald-600"><Zap className="w-3.5 h-3.5" /> انضممت</span>}
          </div>
        </div>
      </div>
    </button>
  );

  const Group = ({ title, items, icon: Icon, tint }) => items.length ? (
    <div className="mt-7">
      <h2 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2"><span className={`w-8 h-8 rounded-xl grid place-items-center ${tint}`}><Icon className="w-4.5 h-4.5 w-5 h-5" /></span> {title} <span className="text-xs font-bold text-slate-400">({items.length})</span></h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">{items.map((s) => <SessionCard key={s.id} s={s} />)}</div>
    </div>
  ) : null;

  return (
    <Layout>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[28px] ft-navy-gradient grain text-white p-6 sm:p-8 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 bg-rose-500/25 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 bg-indigo-400/25 rounded-full blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-rose-200"><Radio className="w-3.5 h-3.5" /> نقرأ معاً في نفس الوقت</div>
                <h1 className="font-head text-3xl sm:text-4xl font-black mt-3">جلسات قراءة مباشرة</h1>
                <p className="text-slate-300 text-sm mt-1.5 max-w-lg leading-relaxed">جلسات مجدولة يقودها أعضاء متميزون: انضم أثناء البث، ناقش في المحادثة، واكسب +١٠ نقاط حضور.</p>
              </div>
              {canHost && (
                <button onClick={() => setShowCreate((s) => !s)} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-rose-500 text-white text-sm font-extrabold shadow-xl shadow-rose-500/40">
                  <Plus className="w-5 h-5" /> استضف جلسة
                </button>
              )}
            </div>
          </div>
        </FadeUp>

        {showCreate && canHost && (
          <FadeUp>
            <div className="mt-5 rounded-[26px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-5 sm:p-6">
              <h3 className="font-head font-extrabold text-slate-900">جلسة جديدة</h3>
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان الجلسة" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-rose-400/50 outline-none px-4 py-3 text-sm sm:col-span-2" />
                <select value={form.book_id} onChange={(e) => setForm({ ...form, book_id: e.target.value })} className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] outline-none px-4 py-3 text-sm">
                  <option value="">بدون كتاب محدد (نقاش حر)</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] outline-none px-3 py-3 text-sm" />
                  <input type="number" min="10" max="240" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} placeholder="الدقائق" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] outline-none px-4 py-3 text-sm" />
                </div>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="نبذة عن الجلسة (اختياري)" className="rounded-2xl bg-white/85 ring-1 ring-slate-900/[0.06] focus:ring-2 focus:ring-rose-400/50 outline-none px-4 py-3 text-sm sm:col-span-2" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={create} disabled={busy} className="pressable h-11 px-6 rounded-2xl bg-rose-500 text-white text-sm font-extrabold shadow-lg shadow-rose-500/30 disabled:opacity-50 inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />} إنشاء الجلسة</button>
                <button onClick={() => setShowCreate(false)} className="h-11 px-5 rounded-2xl text-sm font-extrabold text-slate-500">إلغاء</button>
              </div>
            </div>
          </FadeUp>
        )}

        <Group title="مباشر الآن" items={live} icon={Radio} tint="bg-rose-500/10 text-rose-500" />
        <Group title="قادمة" items={upcoming} icon={CalendarClock} tint="bg-sky-500/10 text-sky-600" />
        <Group title="انتهت" items={past} icon={Clock3} tint="bg-slate-900/[0.05] text-slate-400" />
        {!live.length && !upcoming.length && !past.length && (
          <div className="mt-8 rounded-[30px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-10 text-center">
            <span className="w-16 h-16 mx-auto rounded-[22px] bg-gradient-to-br from-rose-500 to-orange-500 text-white grid place-items-center shadow-xl shadow-rose-500/30"><Radio className="w-8 h-8" /></span>
            <h2 className="font-head font-black text-xl text-slate-900 mt-4">لا جلسات بعد</h2>
            <p className="text-sm text-slate-500 mt-1.5">{canHost ? "كن أول من يستضيف جلسة قراءة للنادي." : "ترقّب أول جلسة قريباً من أعضاء النادي المتميزين."}</p>
          </div>
        )}
      </div>
      {openId && <SessionRoom sessionId={openId} onClose={() => { setOpenId(null); load(); }} />}
    </Layout>
  );
}

function SessionRoom({ sessionId, onClose }) {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  const load = async (silent) => {
    try {
      const { data } = await api.get(`/growth/sessions/${sessionId}`);
      setS(data);
    } catch (e) { if (!silent) toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); const t = setInterval(() => load(true), 4000); return () => clearInterval(t); }, []); // eslint-disable-line
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [s?.messages?.length]);

  if (!s) {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center" dir="rtl">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
        <Loader2 className="relative w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  const join = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/growth/sessions/${sessionId}/join`);
      if (data.xp_awarded) toast.success(`+${data.xp_awarded} نقطة لحضورك المباشر 🎉`);
      else toast.success("انضممت إلى الجلسة");
      await load(true);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await api.post(`/growth/sessions/${sessionId}/messages`, { text: t });
      setText("");
      await load(true);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const end = async () => {
    setBusy(true);
    try { await api.post(`/growth/sessions/${sessionId}/end`); toast.success("انتهت الجلسة"); await load(true); }
    catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const joined = s.joined;
  const ended = s.state === "ended";

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6" dir="rtl">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-white/[0.94] backdrop-blur-2xl backdrop-saturate-150 shadow-2xl overflow-hidden">
        <div className="relative overflow-hidden px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-l from-rose-600/10 via-transparent to-indigo-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {s.state === "live"
                  ? <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse"><CircleDot className="w-3.5 h-3.5" /> مباشر الآن</span>
                  : s.state === "scheduled"
                    ? <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20"><CalendarClock className="w-3.5 h-3.5" /> تبدأ {new Date(s.starts_at).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                    : <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-900/[0.06] text-slate-400">انتهت الجلسة</span>}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400"><Users className="w-3.5 h-3.5" /> {s.attendees} مشارك</span>
              </div>
              <h3 className="font-head font-black text-xl text-slate-900 leading-snug mt-2.5">{s.title}</h3>
              <div className="text-xs font-bold text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" /> المضيف: {s.host_name}</span>
                {s.book_title && <span className="inline-flex items-center gap-1 text-rose-500"><BookOpen className="w-3.5 h-3.5" /> {s.book_title}</span>}
                <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {s.duration_min} دقيقة</span>
              </div>
              {s.description && <p className="text-sm text-slate-600 leading-relaxed mt-2">{s.description}</p>}
            </div>
            <button onClick={onClose} className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-slate-900/[0.05] text-slate-500"><X className="w-4 h-4" /></button>
          </div>
          {!joined && !ended && (
            <button onClick={join} disabled={busy} className="pressable w-full h-11 mt-4 rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 text-white text-sm font-extrabold shadow-lg shadow-rose-500/30 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} انضم إلى الجلسة{s.state === "live" ? " واكسب +١٠ نقاط" : ""}
            </button>
          )}
          {s.is_host && !ended && (
            <button onClick={end} disabled={busy} className="w-full h-10 mt-3 rounded-2xl bg-slate-900/[0.05] text-slate-600 text-xs font-extrabold">إنهاء الجلسة (المضيف)</button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3 bg-slate-50/60">
          {(s.messages || []).length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <MessageCircle className="w-9 h-9 mx-auto opacity-50" />
              <p className="text-sm font-bold mt-2">لا رسائل بعد · ابدأ النقاش بسؤال عن الكتاب</p>
            </div>
          )}
          {(s.messages || []).map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start flex-row-reverse" : "justify-start"} gap-2`}>
                <span className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-black text-white shrink-0 ${mine ? "bg-gradient-to-br from-rose-500 to-orange-500" : "bg-gradient-to-br from-sky-400 to-indigo-500"}`}>{(m.user_name || "؟")[0]}</span>
                <div className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${mine ? "bg-gradient-to-l from-rose-500 to-orange-500 text-white rounded-tr-md shadow-lg shadow-rose-500/20" : "bg-white ring-1 ring-slate-900/[0.05] text-slate-700 rounded-tl-md ft-shadow"}`}>
                  {!mine && <div className="text-[10px] font-black text-sky-600 mb-0.5">{m.user_name}</div>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 sm:px-5 py-3.5 border-t border-slate-900/[0.05] bg-white/80 backdrop-blur-xl">
          {ended ? (
            <p className="text-center text-xs font-bold text-slate-400 py-1.5">انتهت هذه الجلسة · شكراً لكل من حضر</p>
          ) : !joined ? (
            <p className="text-center text-xs font-bold text-slate-400 py-1.5">انضم إلى الجلسة لتشارك في المحادثة</p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="شارك فكرة أو سؤالاً…"
                className="flex-1 resize-none max-h-28 rounded-2xl bg-slate-900/[0.04] ring-1 ring-slate-900/[0.05] focus:ring-2 focus:ring-rose-400/50 outline-none px-4 py-3 text-sm" />
              <button onClick={send} disabled={busy || !text.trim()} className="pressable w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 text-white grid place-items-center shadow-lg shadow-rose-500/30 disabled:opacity-40">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -scale-x-100" />}
              </button>
            </div>
          )}
          <div className="text-center mt-2">
            <button onClick={onClose} className="text-[11px] font-extrabold text-slate-400 inline-flex items-center gap-1">إغلاق <ChevronRight className="w-3 h-3 rotate-180" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
