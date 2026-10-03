import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import {
  MessageCircle, Send, Search, X, PenSquare, ArrowRight, Loader2, Inbox,
} from "lucide-react";

function Avatar({ person, size = "w-11 h-11", text = "text-base" }) {
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt="" className={`${size} rounded-full object-cover ring-2 ring-white shadow-md shrink-0`} />;
  }
  return (
    <span className={`${size} rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shadow-md shrink-0 ${text}`}>
      {person?.name?.[0] || "؟"}
    </span>
  );
}

export default function Messages() {
  const { user, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const [convs, setConvs] = useState(null);
  const [convsError, setConvsError] = useState(null);
  const [filter, setFilter] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [activeOther, setActiveOther] = useState(null);
  const [msgs, setMsgs] = useState(null);
  const [threadError, setThreadError] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const deepLinkedRef = useRef(false);
  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const loadConvs = useCallback(async (quiet = false) => {
    try {
      const { data } = await api.get("/dm/conversations");
      setConvs(Array.isArray(data) ? data : data?.items || []);
      setConvsError(null);
    } catch (e) {
      if (!quiet) setConvsError(e);
      setConvs((prev) => prev ?? []);
    }
  }, []);

  const resolveName = useCallback(async (uid) => {
    try {
      const { data } = await api.get(`/users/${uid}/profile`);
      if (data?.name) {
        setActiveOther((o) => (o && o.id === uid
          ? { ...o, name: data.name, avatar_url: data.avatar_url || o.avatar_url }
          : o));
      }
    } catch { /* graceful: header falls back to a generic label */ }
  }, []);

  const openConversation = useCallback(async (otherId, otherObj) => {
    stickRef.current = true;
    setActiveId(otherId);
    setActiveOther(otherObj?.name ? otherObj : { id: otherId, name: otherObj?.name || "" });
    setMsgs(null);
    setThreadError(null);
    setConvs((arr) => (arr ? arr.map((c) => (c.other?.id === otherId ? { ...c, unread: 0 } : c)) : arr));
    try {
      const { data } = await api.get(`/dm/with/${otherId}`);
      if (activeIdRef.current !== otherId) return;
      setMsgs(data?.items || data?.messages || []);
      if (data?.other?.name) setActiveOther(data.other);
    } catch (e) {
      if (activeIdRef.current !== otherId) return;
      if (e?.response?.status === 404) {
        setMsgs([]); // brand-new thread · created by the first send
      } else {
        setThreadError(e);
        setMsgs([]);
      }
    }
    loadConvs(true);
    if (!otherObj?.name) resolveName(otherId);
  }, [loadConvs, resolveName]);

  /* initial load */
  useEffect(() => { if (user) loadConvs(); }, [user, loadConvs]);

  /* deep link /messages?to=<userId>: land straight in that chat */
  useEffect(() => {
    const to = searchParams.get("to");
    if (ready && user && to && !deepLinkedRef.current) {
      deepLinkedRef.current = true;
      if (to !== user.id) openConversation(to, null);
    }
  }, [ready, user, searchParams, openConversation]);

  /* fill the chat header name from the conversation list when it arrives */
  useEffect(() => {
    if (activeId && convs) {
      const c = convs.find((x) => x.other?.id === activeId);
      if (c?.other?.name && activeOther?.id === activeId && activeOther.name !== c.other.name) {
        setActiveOther(c.other);
      }
    }
  }, [convs, activeId, activeOther]);

  /* poll the open conversation every 5s */
  useEffect(() => {
    if (!activeId) return undefined;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/dm/with/${activeId}`);
        if (activeIdRef.current !== activeId) return;
        const items = data?.items || data?.messages || [];
        setMsgs((prev) => {
          const pending = (prev || []).filter((x) => x._pending);
          return [...items, ...pending];
        });
      } catch { /* silent poll */ }
    }, 5000);
    return () => clearInterval(t);
  }, [activeId]);

  /* keep the view pinned to the newest message while the user is at the bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setText("");
    stickRef.current = true;
    const tmp = { id: `tmp-${Date.now()}`, from_me: true, body, at: new Date().toISOString(), _pending: true };
    setMsgs((m) => [...(m || []), tmp]);
    try {
      const { data } = await api.post(`/dm/with/${activeId}`, { body });
      const saved = data?.message || data;
      setMsgs((m) => (m || []).map((x) => (x.id === tmp.id
        ? { ...x, ...saved, id: saved?.id || tmp.id, from_me: true, body: saved?.body || body, at: saved?.at || tmp.at, _pending: false }
        : x)));
      loadConvs(true);
    } catch (e) {
      toast.error(apiErr(e));
      setMsgs((m) => (m || []).filter((x) => x.id !== tmp.id));
      setText(body);
    }
    setSending(false);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerQuery("");
    setPickerResults(null);
    if (!suggestions) {
      try {
        const { data } = await api.get("/leaderboard", { params: { limit: 30 } });
        const rows = Array.isArray(data) ? data : data?.items || [];
        setSuggestions(rows.filter((x) => x.id !== user?.id));
      } catch { setSuggestions([]); }
    }
  };

  /* people search for the new-message picker */
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const q = pickerQuery.trim();
    if (q.length < 2) { setPickerResults(null); setPickerLoading(false); return undefined; }
    setPickerLoading(true);
    const t = setTimeout(async () => {
      try {
        let rows = [];
        try {
          const { data } = await api.get("/users/search", { params: { q } });
          rows = data?.items || data?.users || (Array.isArray(data) ? data : []);
        } catch {
          const { data } = await api.get("/search", { params: { q } });
          rows = data?.students || [];
        }
        setPickerResults((Array.isArray(rows) ? rows : []).filter((x) => x.id !== user?.id));
      } catch { setPickerResults([]); }
      setPickerLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [pickerQuery, pickerOpen, user]);

  const startChat = (person) => {
    setPickerOpen(false);
    openConversation(person.id, { id: person.id, name: person.name, avatar_url: person.avatar_url });
  };

  if (!ready) return (<Layout><PageLoader /></Layout>);
  if (!user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <EmptyState
            icon={MessageCircle}
            title="سجّل دخولك أولاً"
            desc="الرسائل الخاصة متاحة لأعضاء النادي المسجلين"
            action={<Link to="/login" className="pressable inline-flex min-h-[44px] items-center rounded-full ft-btn-primary px-6 text-sm font-bold text-white shadow-md">تسجيل الدخول</Link>}
          />
        </div>
      </Layout>
    );
  }

  const totalUnread = (convs || []).reduce((s, c) => s + (c.unread || 0), 0);
  const visibleConvs = (convs || []).filter((c) => !filter.trim() || (c.other?.name || "").includes(filter.trim()));
  const pickerList = pickerResults ?? suggestions ?? [];

  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1400px] mx-auto px-4 lg:px-6 py-6 sm:py-8">
        {/* hero */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-5 py-7 sm:px-10 sm:py-9 mb-6">
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-16 w-80 h-80 rounded-full bg-teal-300/15 blur-3xl" />
          <MessageCircle className="pointer-events-none absolute -left-8 -bottom-12 w-44 h-44 text-white/[0.07] -rotate-12" />
          <Send className="pointer-events-none absolute right-10 -top-10 w-28 h-28 text-white/[0.05] rotate-12 hidden sm:block" aria-hidden="true" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold shadow-lg">
                <MessageCircle className="w-3.5 h-3.5" /> تواصل مباشر وآمن
              </span>
              <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">الرسائل الخاصة</h1>
              <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">تحدّث مع زملائك في النادي، نسّقوا مشاريعكم، وتبادلوا الأفكار لحظة بلحظة.</p>
              {(totalUnread > 0 || !!convs?.length) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {totalUnread > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                      <Inbox className="w-3.5 h-3.5" /> لديك {totalUnread} رسالة غير مقروءة
                    </span>
                  )}
                  {!!convs?.length && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                      <MessageCircle className="w-3.5 h-3.5" /> {convs.length} محادثة
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={openPicker} className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full bg-white text-sm font-bold ft-text-accent shadow-lg hover:bg-white/90 transition shrink-0">
              <PenSquare className="w-4 h-4" /> رسالة جديدة
            </button>
          </div>
        </div>

        {/* two-pane messenger */}
        <div className="animate-fade-up d-1 relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg grid lg:grid-cols-[340px_minmax(0,1fr)] h-[min(700px,calc(100dvh-270px))] min-h-[430px]">
          <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar z-10" />

          {/* conversation list */}
          <aside className={`${activeId ? "hidden lg:flex" : "flex"} flex-col min-h-0 border-slate-100 lg:border-l bg-slate-50/60`}>
            <div className="p-3.5 pb-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="ابحث في محادثاتك…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 ps-4 pe-10 py-2.5 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1">
              {convs === null ? (
                <div className="grid place-items-center py-14"><Loader2 className="w-7 h-7 animate-spin ft-text-accent" /></div>
              ) : convsError ? (
                <ErrorState error={convsError} onRetry={() => loadConvs()} context="messages-list" />
              ) : visibleConvs.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title={filter.trim() ? "لا نتائج مطابقة" : "لا محادثات بعد"}
                  desc={filter.trim() ? "جرّب كلمة أخرى" : "ابدأ أول محادثة مع زميل في النادي"}
                  action={!filter.trim() && (
                    <button onClick={openPicker} className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full ft-btn-primary px-5 text-xs font-bold text-white shadow-md">
                      <PenSquare className="w-4 h-4" /> رسالة جديدة
                    </button>
                  )}
                />
              ) : visibleConvs.map((c, i) => {
                const o = c.other || {};
                const isActive = o.id === activeId;
                return (
                  <button
                    key={c.id || o.id}
                    onClick={() => openConversation(o.id, o)}
                    style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                    className={`animate-fade-up w-full flex items-center gap-3 p-3 rounded-2xl text-start transition ${isActive ? "ft-bg-soft ring-1 ft-ring-accent shadow-sm" : "hover:bg-white hover:shadow-sm"}`}
                  >
                    <Avatar person={o} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-head font-bold text-[15px] text-slate-800 truncate">{o.name || "مستخدم"}</span>
                        {c.last_at && <span className="text-[10px] text-slate-300 shrink-0">{timeAgo(c.last_at)}</span>}
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`text-xs truncate ${c.unread > 0 ? "text-slate-700 font-bold" : "text-slate-400"}`}>
                          {c.last_message || "ابدأ المحادثة"}
                        </span>
                        {c.unread > 0 && (
                          <span className="shrink-0 min-w-[22px] h-[22px] px-1 rounded-full ft-btn-primary text-white text-[11px] font-bold grid place-items-center shadow">
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* chat pane */}
          <section className={`${activeId ? "flex" : "hidden lg:flex"} flex-col min-h-0 bg-slate-50/50`}>
            {!activeId ? (
              <div className="flex-1 grid place-items-center p-6">
                <EmptyState icon={MessageCircle} title="اختر محادثة" desc="اختر محادثة من القائمة أو ابدأ رسالة جديدة" />
              </div>
            ) : (
              <>
                {/* chat header */}
                <div className="relative z-10 flex items-center gap-3 px-4 py-3 glass border-b border-slate-100 shrink-0">
                  <button
                    onClick={() => setActiveId(null)}
                    aria-label="رجوع إلى المحادثات"
                    className="pressable lg:hidden w-10 h-10 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition shrink-0"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <Avatar person={activeOther} size="w-10 h-10" text="text-sm" />
                  <div className="flex-1 min-w-0">
                    {activeOther?.name
                      ? <Link to={`/profile/${activeId}`} className="font-head font-bold text-[15px] text-slate-800 ft-hover-text-accent transition-colors block truncate">{activeOther.name}</Link>
                      : <span className="font-head font-bold text-[15px] text-slate-400 block">جارٍ التحميل…</span>}
                    <span className="text-[11px] text-slate-300">محادثة خاصة</span>
                  </div>
                </div>

                {/* messages */}
                <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                  {msgs === null ? (
                    <div className="grid place-items-center py-14"><Loader2 className="w-7 h-7 animate-spin ft-text-accent" /></div>
                  ) : threadError ? (
                    <ErrorState error={threadError} onRetry={() => openConversation(activeId, activeOther)} context="messages-thread" />
                  ) : msgs.length === 0 ? (
                    <EmptyState icon={MessageCircle} title="لا رسائل بعد" desc="أرسل أول رسالة وابدأ المحادثة" />
                  ) : (
                    <div className="space-y-2.5">
                      {msgs.map((m) => (
                        <div key={m.id} className={`flex animate-fade-up ${m.from_me ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-[1.25rem] ${m.from_me ? "ft-btn-primary text-white rounded-ee-md shadow-md" : "bg-white border border-slate-100 text-slate-700 rounded-es-md shadow-sm"}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                            <span className={`block mt-1 text-[10px] ${m.from_me ? "text-white/60 text-end" : "text-slate-300 text-start"}`}>
                              {m.at ? timeAgo(m.at) : ""}
                              {m._pending ? " · تُرسل الآن" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* composer */}
                <div className="relative z-10 p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.18)]">
                  <div className="flex items-end gap-2.5">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1}
                      maxLength={2000}
                      placeholder="اكتب رسالتك…"
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 ft-ring-accent focus:bg-white transition resize-none max-h-32"
                    />
                    <button
                      onClick={send}
                      disabled={sending || !text.trim()}
                      aria-label="إرسال"
                      className="pressable shrink-0 w-12 h-12 grid place-items-center rounded-2xl ft-btn-primary text-white shadow-lg disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -scale-x-100" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* new message picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="relative bg-white rounded-3xl w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col animate-scale-in ft-shadow-lg" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar z-10" />
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-head font-bold flex items-center gap-2"><PenSquare className="w-5 h-5 ft-text-accent" /> رسالة جديدة</h3>
              <button onClick={() => setPickerOpen(false)} aria-label="إغلاق" className="w-11 h-11 grid place-items-center rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-3.5 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="ابحث باسم زميل…"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 ps-4 pe-10 py-2.5 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
              {pickerQuery.trim().length < 2 && <p className="text-[11px] text-slate-300 mt-2">اكتب حرفين على الأقل للبحث · أو اختر من المتصدرين</p>}
            </div>
            <div className="overflow-y-auto p-3 pt-1 space-y-1 min-h-[120px]">
              {pickerLoading ? (
                <div className="grid place-items-center py-10"><Loader2 className="w-6 h-6 animate-spin ft-text-accent" /></div>
              ) : pickerList.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">{pickerResults ? "لا نتائج مطابقة" : "لا أسماء متاحة حالياً"}</p>
              ) : pickerList.map((p) => (
                <button key={p.id} onClick={() => startChat(p)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-start transition">
                  <Avatar person={p} size="w-10 h-10" text="text-sm" />
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-slate-800 truncate block">{p.name}</span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {p.school_name || (p.level ? `المستوى ${p.level}` : "")}{p.xp != null ? ` · ${p.xp} XP` : ""}
                    </span>
                  </span>
                  <MessageCircle className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
