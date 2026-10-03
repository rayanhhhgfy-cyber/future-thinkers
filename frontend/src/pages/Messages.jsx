import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import {
  MessageCircle, Send, Search, X, PenSquare, ArrowRight, Loader2, Inbox,
  Smile, SmilePlus, Check, CheckCheck, MoreVertical, Reply, Pencil, Trash2, Ban,
} from "lucide-react";

const QUICK_REACT = ["❤️", "😂", "😮", "👍", "🔥", "👏"];
const EMOJIS = ["😀", "😂", "😍", "🤩", "😊", "🙂", "😉", "😎", "🥳", "😮", "😢", "😅", "👍", "👏", "🔥", "❤️", "💚", "✨", "🎉", "🙏", "💪", "📚", "☕", "🌟"];

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (sameDay(d, now)) return "اليوم";
  if (sameDay(d, new Date(now.getTime() - DAY_MS))) return "أمس";
  try {
    return d.toLocaleDateString("ar-JO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function clockTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeAgo(iso);
  try {
    return d.toLocaleTimeString("ar-JO", { hour: "numeric", minute: "2-digit" });
  } catch { return timeAgo(iso); }
}

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

function TypingDots({ light = false }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label="يكتب الآن">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full animate-pulse-soft ${light ? "bg-white/80" : "bg-slate-400"}`}
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
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
  const [otherTyping, setOtherTyping] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [reactFor, setReactFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
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
  const textareaRef = useRef(null);
  const lastPingRef = useRef(0);
  const pressTimerRef = useRef(null);
  const myId = user?.id;

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
    setOtherTyping(false);
    setReplyTo(null);
    setEditingId(null);
    setText("");
    setMenuFor(null);
    setReactFor(null);
    setHeaderMenu(false);
    setConvs((arr) => (arr ? arr.map((c) => (c.other?.id === otherId ? { ...c, unread: 0 } : c)) : arr));
    try {
      const { data } = await api.get(`/dm/with/${otherId}`);
      if (activeIdRef.current !== otherId) return;
      setMsgs(data?.items || data?.messages || []);
      setOtherTyping(!!data?.other_typing);
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

  /* initial load + quiet refresh of the list */
  useEffect(() => {
    if (!user) return undefined;
    loadConvs();
    const t = setInterval(() => loadConvs(true), 20000);
    return () => clearInterval(t);
  }, [user, loadConvs]);

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

  /* poll the open thread every 3s */
  useEffect(() => {
    if (!activeId) return undefined;
    const t = setInterval(async () => {
      try {
        const { data } = await api.get(`/dm/with/${activeId}`);
        if (activeIdRef.current !== activeId) return;
        const items = data?.items || data?.messages || [];
        setOtherTyping(!!data?.other_typing);
        setMsgs((prev) => {
          const pending = (prev || []).filter((x) => x._pending);
          return [...items, ...pending];
        });
      } catch { /* silent poll */ }
    }, 3000);
    return () => clearInterval(t);
  }, [activeId]);

  /* keep the view pinned to the newest message while the user is near the bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs, otherTyping]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  };

  /* auto-grow the composer */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text, activeId]);

  const pingTyping = useCallback(() => {
    if (!activeIdRef.current) return;
    const now = Date.now();
    if (now - lastPingRef.current < 2500) return;
    lastPingRef.current = now;
    api.post(`/dm/typing/${activeIdRef.current}`).catch(() => { /* heartbeat is best-effort */ });
  }, []);

  const onComposerChange = (e) => {
    setText(e.target.value);
    if (e.target.value.trim()) pingTyping();
  };

  const applySavedMessage = useCallback((tmpId, saved, fallbackBody) => {
    setMsgs((m) => (m || []).map((x) => (x.id === tmpId
      ? { ...x, ...saved, id: saved?.id || tmpId, from_me: true, body: saved?.body ?? x.body ?? fallbackBody, at: saved?.at || x.at, _pending: false }
      : x)));
  }, []);

  const submitEdit = async () => {
    const body = text.trim();
    const mid = editingId;
    if (!body || !mid || sending) return;
    setSending(true);
    try {
      const { data } = await api.patch(`/dm/messages/${mid}`, { body });
      const saved = data?.message || data || {};
      setMsgs((m) => (m || []).map((x) => (x.id === mid ? { ...x, ...saved, id: mid, body: saved?.body || body, edited: true } : x)));
      setEditingId(null);
      setText("");
    } catch (e) {
      toast.error(apiErr(e));
    }
    setSending(false);
  };

  const send = async () => {
    if (editingId) { submitEdit(); return; }
    const body = text.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setText("");
    stickRef.current = true;
    const reply = replyTo;
    setReplyTo(null);
    const tmp = {
      id: `tmp-${Date.now()}`,
      from_me: true,
      body,
      at: new Date().toISOString(),
      _pending: true,
      reply: reply ? { id: reply.id, name: reply.name, text: reply.text } : null,
    };
    setMsgs((m) => [...(m || []), tmp]);
    try {
      const payload = reply ? { body, reply_to: reply.id } : { body };
      const { data } = await api.post(`/dm/with/${activeId}`, payload);
      const saved = data?.message || data;
      applySavedMessage(tmp.id, saved && typeof saved === "object" ? saved : {}, body);
      if (saved?.id || saved?.body) {
        setMsgs((m) => (m || []).map((x) => (x.id === tmp.id ? { ...x, reply: x.reply || reply } : x)));
      }
      loadConvs(true);
    } catch (e) {
      toast.error(apiErr(e));
      setMsgs((m) => (m || []).filter((x) => x.id !== tmp.id));
      setText(body);
      if (reply) setReplyTo(reply);
    }
    setSending(false);
  };

  const toggleReact = async (m, emoji) => {
    setReactFor(null);
    if (!m || m.deleted || String(m.id).startsWith("tmp-")) return;
    const prev = m.reactions || {};
    const mine = Array.isArray(prev[emoji]) && myId ? prev[emoji].includes(myId) : false;
    const optimistic = { ...prev };
    const arr = Array.isArray(optimistic[emoji]) ? [...optimistic[emoji]] : [];
    if (myId) {
      if (mine) {
        const i = arr.indexOf(myId);
        if (i >= 0) arr.splice(i, 1);
      } else arr.push(myId);
    }
    if (arr.length) optimistic[emoji] = arr; else delete optimistic[emoji];
    setMsgs((list) => (list || []).map((x) => (x.id === m.id ? { ...x, reactions: optimistic } : x)));
    try {
      const { data } = await api.post(`/dm/messages/${m.id}/react`, { emoji });
      if (data?.reactions) {
        setMsgs((list) => (list || []).map((x) => (x.id === m.id ? { ...x, reactions: data.reactions } : x)));
      }
    } catch (e) {
      setMsgs((list) => (list || []).map((x) => (x.id === m.id ? { ...x, reactions: prev } : x)));
      toast.error(apiErr(e));
    }
  };

  const doDelete = async () => {
    const m = confirmDelete;
    setConfirmDelete(null);
    if (!m) return;
    try {
      await api.delete(`/dm/messages/${m.id}`);
      setMsgs((list) => (list || []).map((x) => (x.id === m.id ? { ...x, deleted: true, body: "", reactions: {} } : x)));
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const doBlock = async () => {
    setConfirmBlock(false);
    if (!activeId) return;
    try {
      const { data } = await api.post(`/dm/block/${activeId}`);
      const nowBlocked = typeof data?.blocked === "boolean" ? data.blocked : !blocked;
      setBlocked(nowBlocked);
      toast.success(nowBlocked ? "تم حظر المستخدم · لن تصلك رسائله" : "تم إلغاء الحظر");
      loadConvs(true);
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const startReply = (m) => {
    setMenuFor(null);
    setEditingId(null);
    const name = m.from_me ? "أنت" : (activeOther?.name || "مستخدم");
    setReplyTo({ id: m.id, name, text: (m.body || "").slice(0, 120) });
    textareaRef.current?.focus();
  };

  const startEdit = (m) => {
    setMenuFor(null);
    setReplyTo(null);
    setEditingId(m.id);
    setText(m.body || "");
    textareaRef.current?.focus();
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
    setBlocked(false);
    openConversation(person.id, { id: person.id, name: person.name, avatar_url: person.avatar_url });
  };

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) { setText((t) => t + emoji); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
    });
    if (next.trim()) pingTyping();
  };

  const beginLongPress = (m) => {
    if (m.deleted || String(m.id).startsWith("tmp-")) return;
    pressTimerRef.current = setTimeout(() => setReactFor(m.id), 480);
  };
  const cancelLongPress = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
  };

  /* flattened render list: day separators + grouping flags */
  const renderItems = useMemo(() => {
    const list = msgs || [];
    const out = [];
    let lastDay = "";
    list.forEach((m, i) => {
      const label = m.at ? dayLabel(m.at) : "";
      if (label && label !== lastDay) {
        out.push({ sep: true, key: `sep-${m.id}`, label });
        lastDay = label;
      }
      const prev = list[i - 1];
      const next = list[i + 1];
      const prevBreaks = !prev || prev.from_me !== m.from_me || (prev.at && m.at && dayLabel(prev.at) !== dayLabel(m.at));
      const nextBreaks = !next || next.from_me !== m.from_me || (next.at && m.at && dayLabel(next.at) !== dayLabel(m.at));
      out.push({ sep: false, key: m.id, m, firstInGroup: prevBreaks, lastInGroup: nextBreaks });
    });
    return out;
  }, [msgs]);

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
  const overlayOpen = menuFor !== null || reactFor !== null || headerMenu;

  const renderBubble = (m, firstInGroup, lastInGroup) => {
    const mine = !!m.from_me;
    const pending = !!m._pending;
    const deleted = !!m.deleted;
    const reactions = !deleted && m.reactions && typeof m.reactions === "object"
      ? Object.entries(m.reactions).filter(([, v]) => Array.isArray(v) && v.length > 0)
      : [];
    const canAct = !deleted && !pending;
    const tailMine = "rounded-ee-md";
    const tailOther = "rounded-es-md";
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"} ${firstInGroup ? "mt-3" : "mt-1"}`}>
        <div className={`relative max-w-[85%] sm:max-w-[72%] lg:max-w-[68%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
          {/* hover quick actions */}
          {canAct && (
            <div className={`absolute -top-3 z-20 ${mine ? "left-1" : "right-1"} flex items-center gap-0.5 rounded-full bg-white border border-slate-200 shadow-lg px-0.5 py-0.5 transition-all ${reactFor === m.id || menuFor === m.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}>
              <button
                type="button"
                aria-label="تفاعل سريع"
                onClick={() => { setReactFor(reactFor === m.id ? null : m.id); setMenuFor(null); }}
                className="pressable w-7 h-7 grid place-items-center rounded-full text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="خيارات الرسالة"
                onClick={() => { setMenuFor(menuFor === m.id ? null : m.id); setReactFor(null); }}
                className="pressable w-7 h-7 grid place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* quick react bar */}
          {reactFor === m.id && (
            <div className={`absolute -top-12 z-30 ${mine ? "left-0" : "right-0"} animate-scale-in flex items-center gap-0.5 rounded-full bg-white border border-slate-200 shadow-xl px-1.5 py-1`}>
              {QUICK_REACT.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleReact(m, e)}
                  className="pressable w-8 h-8 grid place-items-center rounded-full text-lg hover:bg-slate-100 hover:scale-125 transition"
                  aria-label={`تفاعل ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* actions menu */}
          {menuFor === m.id && (
            <div className={`absolute top-5 z-30 ${mine ? "left-0" : "right-0"} animate-scale-in w-40 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl py-1`}>
              <button type="button" onClick={() => startReply(m)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition text-start">
                <Reply className="w-4 h-4 -scale-x-100" /> ردّ
              </button>
              {mine && (
                <>
                  <button type="button" onClick={() => startEdit(m)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition text-start">
                    <Pencil className="w-4 h-4" /> تعديل
                  </button>
                  <button type="button" onClick={() => { setMenuFor(null); setConfirmDelete(m); }} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-rose-500 hover:bg-rose-50 transition text-start">
                    <Trash2 className="w-4 h-4" /> حذف
                  </button>
                </>
              )}
            </div>
          )}

          {/* bubble */}
          <div
            onPointerDown={() => beginLongPress(m)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={(e) => { if (canAct) { e.preventDefault(); setReactFor(m.id); setMenuFor(null); } }}
            className={`animate-fade-up px-4 py-2.5 rounded-[1.25rem] select-text ${mine
              ? `ft-btn-primary text-white shadow-md ${lastInGroup ? tailMine : ""}`
              : `bg-white border border-slate-100 text-slate-700 shadow-sm ${lastInGroup ? tailOther : ""}`
              } ${pending ? "opacity-75" : ""}`}
          >
            {deleted ? (
              <p className="text-[13px] italic text-slate-400 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 shrink-0" /> رسالة محذوفة
              </p>
            ) : (
              <>
                {m.reply && (m.reply.text || m.reply.name) && (
                  <div className={`mb-2 rounded-xl px-3 py-2 border-s-[3px] ${mine ? "bg-white/15 border-white/70" : "bg-slate-50 ft-border-accent"}`}>
                    <span className={`block text-[11px] font-bold ${mine ? "text-white" : "ft-text-accent"}`}>{m.reply.name || "رسالة"}</span>
                    <span className={`block text-[11px] leading-relaxed line-clamp-2 ${mine ? "text-white/75" : "text-slate-400"}`}>{m.reply.text}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
                <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${mine ? "text-white/60 justify-end" : "text-slate-300 justify-start"}`}>
                  {m.edited && !pending && <span>تم التعديل ·</span>}
                  <span>{m.at ? clockTime(m.at) : ""}</span>
                  {mine && (pending
                    ? <span>تُرسل الآن…</span>
                    : typeof m.seen === "boolean" && (m.seen
                      ? <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                      : <Check className="w-3.5 h-3.5" />))}
                </span>
              </>
            )}
          </div>

          {/* reaction chips */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 -mt-2 relative z-10 ${mine ? "justify-end pe-2" : "justify-start ps-2"}`}>
              {reactions.map(([emoji, users]) => {
                const mineReact = myId ? users.includes(myId) : false;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => toggleReact(m, emoji)}
                    className={`pressable inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-sm transition ${mineReact ? "ft-bg-soft ft-border-accent ft-text-accent" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}
                  >
                    <span className="text-[13px] leading-none">{emoji}</span> {users.length}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <div className="animate-fade-up d-1 relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg grid lg:grid-cols-[340px_minmax(0,1fr)] h-[min(720px,calc(100dvh-270px))] min-h-[430px]">
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
                const lastMine = !!(c.last_from_me ?? c.last_mine ?? c.last_by_me);
                const showSeen = lastMine && typeof c.last_seen === "boolean";
                return (
                  <button
                    key={c.id || o.id}
                    onClick={() => { setBlocked(false); openConversation(o.id, o); }}
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
                        {c.other_typing ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold ft-text-accent">
                            يكتب الآن <TypingDots />
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs truncate ${c.unread > 0 ? "text-slate-700 font-bold" : "text-slate-400"}`}>
                            {showSeen && (c.last_seen
                              ? <CheckCheck className="w-3.5 h-3.5 ft-text-accent shrink-0" />
                              : <Check className="w-3.5 h-3.5 text-slate-300 shrink-0" />)}
                            <span className="truncate">{lastMine && c.last_message ? `أنت: ${c.last_message}` : c.last_message || "ابدأ المحادثة"}</span>
                          </span>
                        )}
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
          <section className={`${activeId ? "flex" : "hidden lg:flex"} flex-col min-h-0 relative`}>
            {!activeId ? (
              <div className="flex-1 grid place-items-center p-6 bg-slate-50/50">
                <EmptyState icon={MessageCircle} title="اختر محادثة" desc="اختر محادثة من القائمة أو ابدأ رسالة جديدة" />
              </div>
            ) : (
              <>
                {/* chat header */}
                <div className="relative z-30 flex items-center gap-3 px-4 py-3 glass border-b border-slate-100 shrink-0">
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
                    {otherTyping ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold ft-text-accent animate-pulse-soft">
                        يكتب الآن <TypingDots />
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">محادثة خاصة</span>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setHeaderMenu((v) => !v)}
                      aria-label="خيارات المحادثة"
                      className="pressable w-10 h-10 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {headerMenu && (
                      <div className="absolute top-11 end-0 z-40 animate-scale-in w-48 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl py-1">
                        <Link
                          to={`/profile/${activeId}`}
                          onClick={() => setHeaderMenu(false)}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition text-start"
                        >
                          <MessageCircle className="w-4 h-4" /> عرض الملف الشخصي
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setHeaderMenu(false); setConfirmBlock(true); }}
                          className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold transition text-start ${blocked ? "text-slate-600 hover:bg-slate-50" : "text-rose-500 hover:bg-rose-50"}`}
                        >
                          <Ban className="w-4 h-4" /> {blocked ? "إلغاء الحظر" : "حظر هذا المستخدم"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* messages */}
                <div
                  ref={scrollRef}
                  onScroll={onScroll}
                  className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
                  style={{
                    backgroundColor: "#f8fafc",
                    backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.055) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                >
                  {overlayOpen && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => { setMenuFor(null); setReactFor(null); setHeaderMenu(false); }}
                    />
                  )}
                  {msgs === null ? (
                    <div className="grid place-items-center py-14 relative z-0"><Loader2 className="w-7 h-7 animate-spin ft-text-accent" /></div>
                  ) : threadError ? (
                    <ErrorState error={threadError} onRetry={() => openConversation(activeId, activeOther)} context="messages-thread" />
                  ) : msgs.length === 0 ? (
                    <EmptyState icon={MessageCircle} title="لا رسائل بعد" desc="أرسل أول رسالة وابدأ المحادثة" />
                  ) : (
                    <div className="relative z-20 max-w-3xl mx-auto w-full pb-1">
                      {renderItems.map((item) => (item.sep ? (
                        <div key={item.key} className="flex justify-center my-4">
                          <span className="px-3.5 py-1 rounded-full bg-white border border-slate-200/80 shadow-sm text-[11px] font-bold text-slate-400">
                            {item.label}
                          </span>
                        </div>
                      ) : (
                        <div key={item.key} className="group">
                          {renderBubble(item.m, item.firstInGroup, item.lastInGroup)}
                        </div>
                      )))}
                      {otherTyping && (
                        <div className="flex justify-start mt-3">
                          <div className="animate-fade-up bg-white border border-slate-100 shadow-sm rounded-[1.25rem] rounded-es-md px-4 py-3">
                            <TypingDots />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* composer */}
                <div className="relative z-20 p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.18)]">
                  <div className="max-w-3xl mx-auto w-full">
                    {editingId && (
                      <div className="animate-fade-up mb-2.5 flex items-center gap-2.5 rounded-2xl ft-bg-soft ft-border-accent border px-3.5 py-2.5">
                        <Pencil className="w-4 h-4 ft-text-accent shrink-0" />
                        <span className="flex-1 text-xs font-bold ft-text-accent">تعديل الرسالة</span>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setText(""); }}
                          aria-label="إلغاء التعديل"
                          className="pressable w-7 h-7 grid place-items-center rounded-full bg-white text-slate-400 hover:text-slate-600 shadow-sm"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {replyTo && !editingId && (
                      <div className="animate-fade-up mb-2.5 flex items-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 border-s-[3px] ft-border-accent px-3.5 py-2.5">
                        <Reply className="w-4 h-4 ft-text-accent shrink-0 -scale-x-100" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[11px] font-bold ft-text-accent">ردّ على {replyTo.name}</span>
                          <span className="block text-[11px] text-slate-400 truncate">{replyTo.text}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          aria-label="إلغاء الرد"
                          className="pressable w-7 h-7 grid place-items-center rounded-full bg-white text-slate-400 hover:text-slate-600 shadow-sm shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="relative flex items-end gap-2.5">
                      {/* emoji popover */}
                      {emojiOpen && (
                        <div className="absolute bottom-[calc(100%+10px)] start-0 z-40 animate-scale-in w-[290px] max-w-[86vw] rounded-3xl bg-white border border-slate-200 shadow-2xl p-3">
                          <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar rounded-t-3xl" />
                          <div className="grid grid-cols-8 gap-0.5 pt-1">
                            {EMOJIS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => insertEmoji(e)}
                                className="pressable w-8 h-8 grid place-items-center rounded-xl text-lg hover:bg-slate-100 hover:scale-110 transition"
                                aria-label={`إدراج ${e}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setEmojiOpen((v) => !v)}
                        aria-label="إيموجي"
                        className={`pressable shrink-0 w-12 h-12 grid place-items-center rounded-2xl border transition ${emojiOpen ? "ft-bg-soft ft-border-accent ft-text-accent" : "border-slate-200 bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={onComposerChange}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        rows={1}
                        maxLength={2000}
                        placeholder={editingId ? "عدّل رسالتك…" : "اكتب رسالتك…"}
                        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 ft-ring-accent focus:bg-white transition resize-none max-h-36"
                      />
                      <button
                        onClick={send}
                        disabled={sending || !text.trim()}
                        aria-label={editingId ? "حفظ التعديل" : "إرسال"}
                        className="pressable shrink-0 w-12 h-12 grid place-items-center rounded-2xl ft-btn-primary text-white shadow-lg disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : editingId ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 -scale-x-100" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* click-away for composer popovers */}
      {emojiOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
      )}

      {/* delete confirmation · styled dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in ft-shadow-lg p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-rose-600" />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 grid place-items-center">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="font-head font-extrabold text-slate-800 mt-4">حذف هذه الرسالة؟</h3>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">ستختفي الرسالة من المحادثة عند الطرفين ولن يمكن التراجع.</p>
            <div className="flex gap-2.5 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="pressable flex-1 min-h-[44px] rounded-full bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition">إلغاء</button>
              <button onClick={doDelete} className="pressable flex-1 min-h-[44px] rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg hover:bg-rose-600 transition">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* block confirmation · styled dialog */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setConfirmBlock(false)}>
          <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in ft-shadow-lg p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-rose-600" />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-500 grid place-items-center">
              <Ban className="w-7 h-7" />
            </div>
            <h3 className="font-head font-extrabold text-slate-800 mt-4">{blocked ? "إلغاء حظر هذا المستخدم؟" : "حظر هذا المستخدم؟"}</h3>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              {blocked ? "ستعود قادراً على تبادل الرسائل معه." : "لن تتمكنا من تبادل الرسائل بعد الآن حتى تلغي الحظر."}
            </p>
            <div className="flex gap-2.5 mt-6">
              <button onClick={() => setConfirmBlock(false)} className="pressable flex-1 min-h-[44px] rounded-full bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 transition">إلغاء</button>
              <button onClick={doBlock} className={`pressable flex-1 min-h-[44px] rounded-full text-sm font-bold text-white shadow-lg transition ${blocked ? "ft-btn-primary" : "bg-rose-500 hover:bg-rose-600"}`}>
                {blocked ? "إلغاء الحظر" : "حظر"}
              </button>
            </div>
          </div>
        </div>
      )}

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
