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

/* Aurora Messenger · keyframes that index.css does not provide */
const MSG_CSS = `
@keyframes msg-in-other { from { opacity: 0; transform: translateX(16px) translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes msg-in-me { from { opacity: 0; transform: translateX(-16px) translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
.msg-in-other { animation: msg-in-other .38s cubic-bezier(.22,1,.36,1) both; }
.msg-in-me { animation: msg-in-me .38s cubic-bezier(.22,1,.36,1) both; }
@keyframes msg-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }
.msg-pop { animation: msg-pop .32s cubic-bezier(.22,1,.36,1) both; }
@keyframes msg-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
.msg-dot { animation: msg-dot 1.15s ease-in-out infinite; }
@keyframes msg-slide-layer { from { opacity: .35; transform: translateX(-30px); } to { opacity: 1; transform: none; } }
.msg-slide-layer { animation: msg-slide-layer .4s cubic-bezier(.22,1,.36,1) both; }
@keyframes aurora-drift { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(26px,-20px) scale(1.09); } }
.aurora-blob { animation: aurora-drift 15s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .msg-in-me, .msg-in-other, .msg-pop, .msg-slide-layer, .aurora-blob, .msg-dot { animation: none !important; }
}
`;

/* deterministic per-user cover gradients for the thread header */
const COVER_GRADIENTS = [
  "linear-gradient(120deg,#0ea5e9,#6366f1 55%,#a855f7)",
  "linear-gradient(120deg,#059669,#0d9488 55%,#38bdf8)",
  "linear-gradient(120deg,#f59e0b,#f97316 55%,#ef4444)",
  "linear-gradient(120deg,#8b5cf6,#6366f1 55%,#0ea5e9)",
  "linear-gradient(120deg,#ec4899,#f43f5e 55%,#f59e0b)",
  "linear-gradient(120deg,#0d9488,#22c55e 55%,#a3e635)",
  "linear-gradient(120deg,#334155,#0f766e 55%,#10b981)",
  "linear-gradient(120deg,#7c3aed,#2563eb 55%,#06b6d4)",
];

function coverGradient(seed) {
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

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
          className={`msg-dot w-1.5 h-1.5 rounded-full ${light ? "bg-white/85" : "bg-slate-400"}`}
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

  /* warm up people suggestions once · powers the quick-start rail + picker */
  useEffect(() => {
    if (!user || suggestions) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/leaderboard", { params: { limit: 30 } });
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.items || [];
        setSuggestions(rows.filter((x) => x.id !== user?.id));
      } catch { if (!cancelled) setSuggestions([]); }
    })();
    return () => { cancelled = true; };
  }, [user, suggestions]);

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

  const quickStart = (person) => {
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

  /* quick-start people: conversation partners first, then suggested members */
  const quickPeople = useMemo(() => {
    const seen = new Set();
    const out = [];
    const push = (p) => {
      if (p?.id && p.id !== myId && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
    };
    (convs || []).forEach((c) => push(c.other));
    (suggestions || []).forEach((p) => push(p));
    return out.slice(0, 12);
  }, [convs, suggestions, myId]);

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
  const cover = coverGradient(activeId || activeOther?.name);

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
      <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${firstInGroup ? "mt-3.5" : "mt-1"}`}>
        {!mine && (lastInGroup ? (
          <span className="shrink-0 rounded-full shadow-md">
            <Avatar person={activeOther} size="w-8 h-8" text="text-[11px]" />
          </span>
        ) : (
          <span aria-hidden="true" className="w-8 shrink-0" />
        ))}
        <div className={`relative flex max-w-[80%] flex-col sm:max-w-[70%] lg:max-w-[64%] ${mine ? "msg-in-me items-end" : "msg-in-other items-start"}`}>
          {/* hover quick actions */}
          {canAct && (
            <div className={`absolute -top-3 z-20 ${mine ? "left-1" : "right-1"} flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur px-0.5 py-0.5 shadow-lg ring-1 ring-white/70 transition-all ${reactFor === m.id || menuFor === m.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}>
              <button
                type="button"
                aria-label="تفاعل سريع"
                onClick={() => { setReactFor(reactFor === m.id ? null : m.id); setMenuFor(null); }}
                className="pressable grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-amber-50 hover:text-amber-500"
              >
                <SmilePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="خيارات الرسالة"
                onClick={() => { setMenuFor(menuFor === m.id ? null : m.id); setReactFor(null); }}
                className="pressable grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* quick react bar */}
          {reactFor === m.id && (
            <div className={`absolute -top-12 z-30 ${mine ? "left-0" : "right-0"} flex items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-1 shadow-[0_16px_36px_-12px_rgba(15,23,42,0.4)] ring-1 ring-white/70 backdrop-blur`}>
              {QUICK_REACT.map((e, i) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleReact(m, e)}
                  style={{ animationDelay: `${i * 35}ms` }}
                  className="msg-pop pressable grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-slate-100"
                  aria-label={`تفاعل ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* actions menu */}
          {menuFor === m.id && (
            <div className={`absolute top-5 z-30 ${mine ? "left-0" : "right-0"} w-40 animate-scale-in overflow-hidden rounded-2xl bg-white/95 py-1 shadow-[0_16px_36px_-12px_rgba(15,23,42,0.4)] ring-1 ring-white/60 backdrop-blur-xl`}>
              <button type="button" onClick={() => startReply(m)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">
                <Reply className="h-4 w-4 -scale-x-100" /> ردّ
              </button>
              {mine && (
                <>
                  <button type="button" onClick={() => startEdit(m)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">
                    <Pencil className="h-4 w-4" /> تعديل
                  </button>
                  <button type="button" onClick={() => { setMenuFor(null); setConfirmDelete(m); }} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-semibold text-rose-500 transition hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" /> حذف
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
            className={`select-text rounded-[22px] px-4 py-3 ${deleted
              ? "bg-white/70 text-slate-400 shadow-sm ring-1 ring-white/80 backdrop-blur"
              : mine
                ? `ft-btn-primary text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.45)] ${lastInGroup ? tailMine : ""}`
                : `bg-white/90 text-slate-700 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.28)] ring-1 ring-white backdrop-blur ${lastInGroup ? tailOther : ""}`
              } ${pending ? "opacity-75" : ""}`}
          >
            {deleted ? (
              <p className="flex items-center gap-1.5 text-[13px] italic">
                <Ban className="h-3.5 w-3.5 shrink-0" /> رسالة محذوفة
              </p>
            ) : (
              <>
                {m.reply && (m.reply.text || m.reply.name) && (
                  <div className={`mb-2 rounded-xl border-s-[3px] px-3 py-2 ${mine ? "border-white/70 bg-white/15" : "ft-border-accent bg-slate-50"}`}>
                    <span className={`block text-[11px] font-bold ${mine ? "text-white" : "ft-text-accent"}`}>{m.reply.name || "رسالة"}</span>
                    <span className={`block text-[11px] leading-relaxed line-clamp-2 ${mine ? "text-white/75" : "text-slate-400"}`}>{m.reply.text}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${mine ? "justify-end text-white/60" : "justify-start text-slate-300"}`}>
                  {m.edited && !pending && <span>تم التعديل ·</span>}
                  <span>{m.at ? clockTime(m.at) : ""}</span>
                  {mine && (pending
                    ? <span>تُرسل الآن…</span>
                    : typeof m.seen === "boolean" && (m.seen
                      ? <CheckCheck className="h-3.5 w-3.5 text-sky-200" />
                      : <Check className="h-3.5 w-3.5" />))}
                </span>
              </>
            )}
          </div>

          {/* reaction chips · float over the bubble's bottom edge */}
          {reactions.length > 0 && (
            <div className={`relative z-10 -mt-2.5 flex flex-wrap gap-1 ${mine ? "justify-end pe-2" : "justify-start ps-2"}`}>
              {reactions.map(([emoji, users]) => {
                const mineReact = myId ? users.includes(myId) : false;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => toggleReact(m, emoji)}
                    className={`pressable inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-sm backdrop-blur transition ${mineReact ? "ft-bg-soft ft-border-accent ft-text-accent" : "border-slate-200 bg-white/90 text-slate-500 hover:border-slate-300"}`}
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
      <style>{MSG_CSS}</style>
      <div className="relative mx-auto max-w-[1440px] px-3 pb-6 pt-3 sm:px-5 sm:pt-4 lg:px-8">
        {/* aurora stage */}
        <section
          className="grain relative overflow-hidden rounded-[30px] px-3 py-4 sm:rounded-[38px] sm:px-5 sm:py-5 lg:px-6"
          style={{
            background:
              "radial-gradient(760px 440px at 10% -10%, color-mix(in srgb, var(--ft-accent, #10b981) 22%, transparent), transparent 62%)," +
              "radial-gradient(720px 460px at 98% 112%, color-mix(in srgb, var(--ft-grad-b, #065f46) 20%, transparent), transparent 64%)," +
              "radial-gradient(520px 320px at 82% -18%, rgba(56,189,248,.16), transparent 62%)," +
              "linear-gradient(165deg, #f4f8f6 0%, #e9f1ed 58%, #eef4f1 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="aurora-blob pointer-events-none absolute -top-28 start-[8%] h-72 w-72 rounded-full blur-3xl"
            style={{ background: "color-mix(in srgb, var(--ft-accent, #10b981) 26%, transparent)" }}
          />
          <div
            aria-hidden="true"
            className="aurora-blob pointer-events-none absolute -bottom-32 end-[4%] h-80 w-80 rounded-full blur-3xl"
            style={{ background: "rgba(56,189,248,.18)", animationDelay: "-6s" }}
          />

          <div className="relative z-10">
            {/* compact title row */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <span className="ft-icon-tile grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-lg">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="font-head text-2xl font-extrabold leading-tight text-slate-800 sm:text-3xl">الرسائل</h1>
                  <p className="text-xs text-slate-500 sm:text-[13px]">تحدّث مع زملائك في النادي لحظة بلحظة</p>
                </div>
              </div>
              <button
                onClick={openPicker}
                className="pressable inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full ft-btn-primary px-5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03]"
              >
                <PenSquare className="h-4 w-4" /> رسالة جديدة
              </button>
            </div>

            {/* floating glass panels */}
            <div className="relative grid h-[calc(100dvh-262px)] min-h-[440px] gap-4 lg:h-[calc(100dvh-244px)] lg:min-h-[540px] lg:grid-cols-[372px_minmax(0,1fr)] lg:gap-5">
              {/* ── list panel ── */}
              <aside className="flex min-h-0 animate-fade-up flex-col overflow-hidden rounded-[28px] bg-white/70 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] ring-1 ring-white/60 backdrop-blur-xl">
                <div className="px-4 pb-3 pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar person={user} size="w-11 h-11" text="text-base" />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-head text-[15px] font-extrabold text-slate-800">محادثاتي</h2>
                      <p className="truncate text-[11px] text-slate-400">{user?.name || ""}</p>
                    </div>
                    {totalUnread > 0 && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full ft-btn-primary px-3 py-1.5 text-[11px] font-bold text-white"
                        style={{ boxShadow: "0 8px 20px -6px color-mix(in srgb, var(--ft-accent, #10b981) 70%, transparent)" }}
                      >
                        <Inbox className="h-3.5 w-3.5" /> {totalUnread} غير مقروءة
                      </span>
                    )}
                    {!!convs?.length && totalUnread === 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-white/70 backdrop-blur">
                        <MessageCircle className="h-3.5 w-3.5" /> {convs.length} محادثة
                      </span>
                    )}
                  </div>

                  {/* quick-start avatar rail */}
                  {quickPeople.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-bold text-slate-400">ابدأ بسرعة</p>
                      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {quickPeople.map((p) => {
                          const conv = (convs || []).find((c) => c.other?.id === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => quickStart(p)}
                              className="pressable group flex w-[62px] shrink-0 flex-col items-center gap-1.5"
                            >
                              <span
                                className="relative rounded-full p-[2.5px] shadow-md transition duration-300 group-hover:scale-105"
                                style={{ background: "linear-gradient(135deg, var(--ft-grad-b, #065f46), var(--ft-accent, #10b981))" }}
                              >
                                <Avatar person={p} size="w-12 h-12" text="text-base" />
                                {(conv?.unread || 0) > 0 && (
                                  <span
                                    className="absolute -end-0.5 -top-0.5 h-3.5 w-3.5 rounded-full ft-btn-primary ring-2 ring-white"
                                    style={{ boxShadow: "0 0 0 4px color-mix(in srgb, var(--ft-accent, #10b981) 30%, transparent)" }}
                                  />
                                )}
                              </span>
                              <span className="w-full truncate text-center text-[10px] font-semibold text-slate-500 transition group-hover:text-slate-700">
                                {(p.name || "مستخدم").split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* glass search */}
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="ابحث في محادثاتك…"
                      className="w-full rounded-full border border-white/70 bg-white/60 py-2.5 pe-10 ps-4 text-sm shadow-inner outline-none backdrop-blur transition focus:bg-white/90 focus:ring-2 ft-ring-accent"
                    />
                  </div>
                </div>

                {/* conversation cards */}
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                  {convs === null ? (
                    <div className="grid place-items-center py-14"><Loader2 className="h-7 w-7 animate-spin ft-text-accent" /></div>
                  ) : convsError ? (
                    <ErrorState error={convsError} onRetry={() => loadConvs()} context="messages-list" />
                  ) : visibleConvs.length === 0 ? (
                    <EmptyState
                      icon={MessageCircle}
                      title={filter.trim() ? "لا نتائج مطابقة" : "لا محادثات بعد"}
                      desc={filter.trim() ? "جرّب كلمة أخرى" : "ابدأ أول محادثة مع زميل في النادي"}
                      action={!filter.trim() && (
                        <button onClick={openPicker} className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full ft-btn-primary px-5 text-xs font-bold text-white shadow-md">
                          <PenSquare className="h-4 w-4" /> رسالة جديدة
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
                        style={{
                          animationDelay: `${Math.min(i, 8) * 50}ms`,
                          ...(isActive ? {
                            boxShadow:
                              "inset 0 0 0 2px color-mix(in srgb, var(--ft-accent, #10b981) 55%, white)," +
                              "0 16px 34px -16px color-mix(in srgb, var(--ft-accent, #10b981) 60%, transparent)",
                          } : undefined),
                        }}
                        className={`flex w-full animate-fade-up items-center gap-3 rounded-3xl p-3 text-start ring-1 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_14px_30px_-12px_rgba(15,23,42,0.25)] ${isActive
                          ? "bg-white/85 ring-white/80"
                          : "bg-white/55 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.18)] ring-white/70"}`}
                      >
                        <Avatar person={o} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-head text-[15px] font-bold text-slate-800">{o.name || "مستخدم"}</span>
                            {c.last_at && <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(c.last_at)}</span>}
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            {c.other_typing ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold ft-text-accent">
                                يكتب الآن <TypingDots />
                              </span>
                            ) : (
                              <span className={`flex items-center gap-1 truncate text-xs ${c.unread > 0 ? "font-bold text-slate-700" : "text-slate-400"}`}>
                                {showSeen && (c.last_seen
                                  ? <CheckCheck className="h-3.5 w-3.5 shrink-0 ft-text-accent" />
                                  : <Check className="h-3.5 w-3.5 shrink-0 text-slate-300" />)}
                                <span className="truncate">{lastMine && c.last_message ? `أنت: ${c.last_message}` : c.last_message || "ابدأ المحادثة"}</span>
                              </span>
                            )}
                            {c.unread > 0 && (
                              <span
                                className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full px-1 text-[11px] font-bold text-white ft-btn-primary"
                                style={{ boxShadow: "0 6px 16px -4px color-mix(in srgb, var(--ft-accent, #10b981) 65%, transparent)" }}
                              >
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

              {/* ── thread panel ── */}
              <section
                className={`min-h-0 flex-col overflow-hidden rounded-[28px] bg-white/70 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] ring-1 ring-white/60 backdrop-blur-xl ${activeId
                  ? "msg-slide-layer absolute inset-0 z-20 flex lg:relative lg:inset-auto lg:z-auto"
                  : "hidden animate-fade-up d-1 lg:relative lg:flex"}`}
              >
                {!activeId ? (
                  <div className="grid flex-1 place-items-center p-6">
                    <EmptyState icon={MessageCircle} title="اختر محادثة" desc="اختر محادثة من القائمة أو ابدأ رسالة جديدة" />
                  </div>
                ) : (
                  <>
                    {/* cover header */}
                    <div className="relative shrink-0">
                      <div
                        className="h-[84px] sm:h-[94px]"
                        style={{
                          backgroundImage: `radial-gradient(rgba(255,255,255,.22) 1.2px, transparent 1.4px), ${cover}`,
                          backgroundSize: "16px 16px, cover",
                        }}
                      />
                      <button
                        onClick={() => setActiveId(null)}
                        aria-label="رجوع إلى المحادثات"
                        className="pressable absolute start-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/40 lg:hidden"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </button>
                      <div className="absolute end-3 top-3 z-30">
                        <button
                          onClick={() => setHeaderMenu((v) => !v)}
                          aria-label="خيارات المحادثة"
                          className="pressable grid h-10 w-10 place-items-center rounded-full bg-white/25 text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/40"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        {headerMenu && (
                          <div className="absolute end-0 top-12 z-40 w-48 animate-scale-in overflow-hidden rounded-2xl bg-white/95 py-1 shadow-[0_16px_36px_-12px_rgba(15,23,42,0.4)] ring-1 ring-white/60 backdrop-blur-xl">
                            <Link
                              to={`/profile/${activeId}`}
                              onClick={() => setHeaderMenu(false)}
                              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <MessageCircle className="h-4 w-4" /> عرض الملف الشخصي
                            </Link>
                            <button
                              type="button"
                              onClick={() => { setHeaderMenu(false); setConfirmBlock(true); }}
                              className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-start text-[13px] font-semibold transition ${blocked ? "text-slate-600 hover:bg-slate-50" : "text-rose-500 hover:bg-rose-50"}`}
                            >
                              <Ban className="h-4 w-4" /> {blocked ? "إلغاء الحظر" : "حظر هذا المستخدم"}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="relative z-10 -mt-9 flex items-end gap-3 px-4 pb-3">
                        <span className="shrink-0 rounded-full shadow-[0_12px_26px_-10px_rgba(15,23,42,0.55)]">
                          <Avatar person={activeOther} size="w-16 h-16" text="text-xl" />
                        </span>
                        <div className="min-w-0 flex-1 pb-0.5">
                          {activeOther?.name
                            ? <Link to={`/profile/${activeId}`} className="ft-hover-text-accent block truncate font-head text-base font-bold text-slate-800 transition-colors">{activeOther.name}</Link>
                            : <span className="block font-head text-base font-bold text-slate-400">جارٍ التحميل…</span>}
                          {otherTyping ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-bold ft-text-accent">
                              يكتب الآن <TypingDots />
                            </span>
                          ) : blocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                              <Ban className="h-3 w-3" /> محظور
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">محادثة خاصة</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* message canvas */}
                    <div
                      ref={scrollRef}
                      onScroll={onScroll}
                      className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle, rgba(15,23,42,0.05) 1px, transparent 1.2px)," +
                          "radial-gradient(420px 220px at 0% 0%, color-mix(in srgb, var(--ft-accent, #10b981) 7%, transparent), transparent 70%)," +
                          "radial-gradient(420px 220px at 100% 100%, color-mix(in srgb, var(--ft-grad-b, #065f46) 6%, transparent), transparent 70%)",
                        backgroundSize: "22px 22px, 100% 100%, 100% 100%",
                      }}
                    >
                      {overlayOpen && (
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => { setMenuFor(null); setReactFor(null); setHeaderMenu(false); }}
                        />
                      )}
                      {msgs === null ? (
                        <div className="relative z-0 grid place-items-center py-14"><Loader2 className="h-7 w-7 animate-spin ft-text-accent" /></div>
                      ) : threadError ? (
                        <ErrorState error={threadError} onRetry={() => openConversation(activeId, activeOther)} context="messages-thread" />
                      ) : msgs.length === 0 ? (
                        <EmptyState icon={MessageCircle} title="لا رسائل بعد" desc="أرسل أول رسالة وابدأ المحادثة" />
                      ) : (
                        <div className="relative z-20 mx-auto w-full max-w-3xl pb-1">
                          {renderItems.map((item) => (item.sep ? (
                            <div key={item.key} className="my-4 flex justify-center">
                              <span className="rounded-full bg-white/70 px-3.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-white/70 backdrop-blur">
                                {item.label}
                              </span>
                            </div>
                          ) : (
                            <div key={item.key} className="group">
                              {renderBubble(item.m, item.firstInGroup, item.lastInGroup)}
                            </div>
                          )))}
                          {otherTyping && (
                            <div className="mt-3.5 flex items-end gap-2">
                              <span className="shrink-0 rounded-full shadow-md">
                                <Avatar person={activeOther} size="w-8 h-8" text="text-[11px]" />
                              </span>
                              <div className="animate-fade-up rounded-[20px] rounded-es-md bg-white/90 px-4 py-3 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.28)] ring-1 ring-white backdrop-blur">
                                <TypingDots />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* floating composer dock */}
                    <div className="relative z-20 shrink-0 px-3 pb-[max(0.8rem,env(safe-area-inset-bottom))] pt-1 sm:px-4">
                      <div className="relative mx-auto w-full max-w-3xl rounded-[26px] bg-white/80 p-2 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.4)] ring-1 ring-white/70 backdrop-blur-xl">
                        {emojiOpen && (
                          <div className="absolute bottom-[calc(100%+10px)] start-0 z-40 w-[290px] max-w-[86vw] animate-scale-in rounded-3xl bg-white/95 p-3 shadow-2xl ring-1 ring-white/60 backdrop-blur-xl">
                            <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl ft-grad-bar" />
                            <div className="grid grid-cols-8 gap-0.5 pt-1">
                              {EMOJIS.map((e) => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => insertEmoji(e)}
                                  className="pressable grid h-8 w-8 place-items-center rounded-xl text-lg transition hover:scale-110 hover:bg-slate-100"
                                  aria-label={`إدراج ${e}`}
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {editingId && (
                          <div className="ft-border-accent ft-bg-soft mb-2 flex animate-fade-up items-center gap-2.5 rounded-2xl border px-3.5 py-2.5">
                            <Pencil className="h-4 w-4 shrink-0 ft-text-accent" />
                            <span className="flex-1 text-xs font-bold ft-text-accent">تعديل الرسالة</span>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); setText(""); }}
                              aria-label="إلغاء التعديل"
                              className="pressable grid h-7 w-7 place-items-center rounded-full bg-white text-slate-400 shadow-sm hover:text-slate-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {replyTo && !editingId && (
                          <div className="ft-border-accent mb-2 flex animate-fade-up items-center gap-2.5 rounded-2xl border border-slate-200/80 border-s-[3px] bg-slate-50/80 px-3.5 py-2.5">
                            <Reply className="h-4 w-4 shrink-0 -scale-x-100 ft-text-accent" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[11px] font-bold ft-text-accent">ردّ على {replyTo.name}</span>
                              <span className="block truncate text-[11px] text-slate-400">{replyTo.text}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setReplyTo(null)}
                              aria-label="إلغاء الرد"
                              className="pressable grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-sm hover:text-slate-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEmojiOpen((v) => !v)}
                            aria-label="إيموجي"
                            className={`pressable grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${emojiOpen ? "ft-bg-soft ft-text-accent" : "text-slate-400 hover:bg-amber-50 hover:text-amber-500"}`}
                          >
                            <Smile className="h-5 w-5" />
                          </button>
                          <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={onComposerChange}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            rows={1}
                            maxLength={2000}
                            placeholder={editingId ? "عدّل رسالتك…" : "اكتب رسالتك…"}
                            className="max-h-36 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm leading-relaxed outline-none placeholder:text-slate-400 focus:ring-0"
                          />
                          <button
                            onClick={send}
                            disabled={sending || !text.trim()}
                            aria-label={editingId ? "حفظ التعديل" : "إرسال"}
                            className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full ft-btn-primary text-white shadow-lg transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                            style={{ boxShadow: "0 10px 24px -8px color-mix(in srgb, var(--ft-accent, #10b981) 70%, transparent)" }}
                          >
                            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : editingId ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5 -scale-x-100" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </section>
      </div>

      {/* click-away for composer popovers */}
      {emojiOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
      )}

      {/* delete confirmation · styled glass dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="relative w-full max-w-sm animate-scale-in overflow-hidden rounded-[26px] bg-white/90 p-6 text-center shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/60 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-rose-600" />
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-head font-extrabold text-slate-800">حذف هذه الرسالة؟</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">ستختفي الرسالة من المحادثة عند الطرفين ولن يمكن التراجع.</p>
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)} className="pressable min-h-[44px] flex-1 rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200">إلغاء</button>
              <button onClick={doDelete} className="pressable min-h-[44px] flex-1 rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg transition hover:bg-rose-600">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* block confirmation · styled glass dialog */}
      {confirmBlock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setConfirmBlock(false)}>
          <div className="relative w-full max-w-sm animate-scale-in overflow-hidden rounded-[26px] bg-white/90 p-6 text-center shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/60 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-rose-600" />
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
              <Ban className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-head font-extrabold text-slate-800">{blocked ? "إلغاء حظر هذا المستخدم؟" : "حظر هذا المستخدم؟"}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {blocked ? "ستعود قادراً على تبادل الرسائل معه." : "لن تتمكنا من تبادل الرسائل بعد الآن حتى تلغي الحظر."}
            </p>
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setConfirmBlock(false)} className="pressable min-h-[44px] flex-1 rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200">إلغاء</button>
              <button onClick={doBlock} className={`pressable min-h-[44px] flex-1 rounded-full text-sm font-bold text-white shadow-lg transition ${blocked ? "ft-btn-primary" : "bg-rose-500 hover:bg-rose-600"}`}>
                {blocked ? "إلغاء الحظر" : "حظر"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* new message picker · glass */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setPickerOpen(false)}>
          <div className="relative flex max-h-[75vh] w-full max-w-md animate-scale-in flex-col overflow-hidden rounded-[26px] bg-white/90 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/60 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 z-10 h-1 ft-grad-bar" />
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="flex items-center gap-2 font-head font-bold"><PenSquare className="h-5 w-5 ft-text-accent" /> رسالة جديدة</h3>
              <button onClick={() => setPickerOpen(false)} aria-label="إغلاق" className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3.5 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="ابحث باسم زميل…"
                  className="w-full rounded-full border border-white/70 bg-white/60 py-2.5 pe-10 ps-4 text-sm shadow-inner outline-none backdrop-blur transition focus:bg-white/90 focus:ring-2 ft-ring-accent"
                />
              </div>
              {pickerQuery.trim().length < 2 && <p className="mt-2 text-[11px] text-slate-400">اكتب حرفين على الأقل للبحث · أو اختر من المتصدرين</p>}
            </div>
            <div className="min-h-[120px] space-y-1 overflow-y-auto p-3 pt-1">
              {pickerLoading ? (
                <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin ft-text-accent" /></div>
              ) : pickerList.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">{pickerResults ? "لا نتائج مطابقة" : "لا أسماء متاحة حالياً"}</p>
              ) : pickerList.map((p) => (
                <button key={p.id} onClick={() => startChat(p)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition hover:bg-white/80">
                  <Avatar person={p} size="w-10 h-10" text="text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{p.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {p.school_name || (p.level ? `المستوى ${p.level}` : "")}{p.xp != null ? ` · ${p.xp} XP` : ""}
                    </span>
                  </span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
