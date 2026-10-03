import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api, { fileUrl } from "@/lib/api";
import BookCover from "@/components/BookCover";
import { EASE } from "@/components/anim";
import {
  Search, X, BookOpen, Rocket, Users, CalendarDays, Newspaper,
  Clock, Trash2, Loader2, Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* GlobalSearch · glass command palette: one input fans out to books,  */
/* ventures, members, events and news with grouped results, full       */
/* keyboard navigation and recent searches kept in localStorage.       */
/* ------------------------------------------------------------------ */

const RECENT_KEY = "ft-recent-searches";
const PER_GROUP = 6;

function loadRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((s) => typeof s === "string" && s.trim()).slice(0, 6) : [];
  } catch { return []; }
}
function storeRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6))); } catch {}
}

const asList = (data) =>
  data?.items || data?.books || data?.ventures || data?.events || data?.news ||
  data?.users || (Array.isArray(data) ? data : []);

const SOURCES = [
  {
    key: "books", label: "كتب", icon: BookOpen, tint: "bg-blue-100 text-blue-600",
    run: (q) => api.get("/books", { params: { q, limit: PER_GROUP } }),
    map: (b) => ({ uid: `book-${b.id}`, title: b.title, sub: b.author, path: `/books/${b.id}`, book: b }),
  },
  {
    key: "ventures", label: "مشاريع", icon: Rocket, tint: "bg-orange-100 text-orange-600",
    run: (q) => api.get("/ventures", { params: { q, limit: PER_GROUP, sort: "votes" } }),
    map: (v) => ({ uid: `venture-${v.id}`, title: v.title, sub: v.category, path: `/ventures/${v.id}` }),
  },
  {
    key: "members", label: "أعضاء", icon: Users, tint: "bg-emerald-100 text-emerald-600",
    run: (q) => api.get("/users/directory", { params: { q, limit: PER_GROUP } }),
    map: (u) => ({
      uid: `user-${u.id}`, title: u.name,
      sub: u.school_name || u.school, path: `/profile/${u.id}`, user: u,
    }),
  },
  {
    key: "events", label: "فعاليات", icon: CalendarDays, tint: "bg-violet-100 text-violet-600",
    run: (q) => api.get("/events", { params: { q, limit: PER_GROUP } }),
    map: (e) => ({
      uid: `event-${e.id}`, title: e.title,
      sub: [e.date, e.time, e.location].filter(Boolean).join(" · "), path: `/events/${e.id}`,
    }),
  },
  {
    key: "news", label: "أخبار", icon: Newspaper, tint: "bg-sky-100 text-sky-600",
    run: (q) => api.get("/news", { params: { q, limit: PER_GROUP } }),
    map: (n) => ({ uid: `news-${n.id}`, title: n.title, sub: n.category, path: "/news", cover: n.cover_url }),
  },
];

function Avatar({ user, tint }) {
  if (user?.avatar_url) {
    return <img src={fileUrl(user.avatar_url)} alt="" className="w-10 h-10 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0" />;
  }
  return (
    <span className={`w-10 h-10 rounded-2xl grid place-items-center font-head font-extrabold shrink-0 ${tint}`}>
      {user?.name?.[0] || "؟"}
    </span>
  );
}

export function GlobalSearch({ onClose }) {
  const nav = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const seqRef = useRef(0);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(loadRecent);

  const term = q.trim();
  const flat = useMemo(
    () => groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.source }))),
    [groups]
  );

  /* focus + body scroll lock */
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, []);

  /* fan-out search, debounced, each source defensive */
  useEffect(() => {
    if (term.length < 2) { setGroups([]); setLoading(false); setSearched(false); return undefined; }
    const seq = ++seqRef.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const settled = await Promise.allSettled(SOURCES.map((s) => s.run(term)));
      if (seqRef.current !== seq) return;
      const ql = term.toLowerCase();
      const next = SOURCES.map((source, i) => {
        const r = settled[i];
        if (r.status !== "fulfilled") return { source, items: [] };
        let items = [];
        try {
          items = asList(r.value.data)
            .map(source.map)
            .filter((it) => it.title && String(it.title).toLowerCase().includes(ql))
            .slice(0, PER_GROUP);
        } catch { items = []; }
        return { source, items };
      }).filter((g) => g.items.length > 0);
      setGroups(next);
      setActive(0);
      setLoading(false);
      setSearched(true);
    }, 280);
    return () => clearTimeout(t);
  }, [term]);

  const remember = useCallback((value) => {
    const v = (value || "").trim();
    if (v.length < 2) return;
    setRecent((prev) => {
      const next = [v, ...prev.filter((s) => s !== v)].slice(0, 6);
      storeRecent(next);
      return next;
    });
  }, []);

  const go = useCallback((item) => {
    if (!item) return;
    remember(term);
    nav(item.path);
    onClose();
  }, [nav, onClose, remember, term]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (!flat.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + flat.length) % flat.length); }
    else if (e.key === "Enter") { e.preventDefault(); go(flat[active]); }
  };

  /* keep the active row in view */
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-gs-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const clearRecent = () => { setRecent([]); storeRecent([]); };

  const showRecents = term.length < 2;
  const noResults = searched && !loading && term.length >= 2 && flat.length === 0;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md flex items-stretch sm:items-start justify-center sm:pt-[7vh] sm:px-4"
      onClick={onClose}
      data-testid="global-search"
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.32, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[84vh] flex flex-col overflow-hidden bg-white/95 backdrop-blur-2xl sm:rounded-[28px] ring-1 ring-white/60 shadow-[0_40px_90px_-24px_rgba(2,6,23,0.55)]"
      >
        {/* search header */}
        <div className="relative shrink-0 px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4 pb-3 border-b border-slate-100">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-90 sm:rounded-t-[28px]" />
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl ft-icon-tile text-white grid place-items-center shadow-md shrink-0">
              <Search className="w-5 h-5" />
            </span>
            <input
              ref={inputRef}
              data-testid="global-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ابحث عن كتاب، مشروع، عضو، فعالية…"
              className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-lg font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-semibold"
            />
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin ft-text-accent shrink-0" />
              : term && (
                <button onClick={() => setQ("")} aria-label="مسح البحث"
                  className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-500 active:scale-90 transition shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            <button onClick={onClose} aria-label="إغلاق البحث"
              className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-500 active:scale-90 transition shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-3 mt-2.5 text-[11px] font-bold text-slate-300">
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-400">↑↓</kbd> للتنقل</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-400">Enter</kbd> للفتح</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-400">Esc</kbd> للإغلاق</span>
          </div>
        </div>

        {/* body */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
          {showRecents ? (
            <div className="p-4 sm:p-5">
              {recent.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-400">
                      <Clock className="w-3.5 h-3.5" /> عمليات بحث سابقة
                    </span>
                    <button onClick={clearRecent}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-rose-500 transition min-h-[32px] px-2">
                      <Trash2 className="w-3.5 h-3.5" /> مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => { setQ(r); inputRef.current?.focus(); }}
                        className="pressable inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full bg-slate-50 ring-1 ring-slate-100 text-sm font-bold text-slate-600 hover:ft-bg-soft hover:ft-text-accent transition">
                        <Clock className="w-3.5 h-3.5 text-slate-300" /> {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-6 rounded-3xl ft-bg-soft ring-1 ft-ring-accent p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl ft-icon-tile text-white grid place-items-center shrink-0"><Sparkles className="w-4 h-4" /></span>
                <p className="text-[13px] leading-relaxed text-slate-500 font-semibold">
                  بحث واحد يغطي الموقع كله: جرّب اسم كتاب من المكتبة، مشروعاً من المشاريع، عضواً من الأعضاء، فعالية قادمة أو خبراً جديداً.
                </p>
              </div>
              {term.length === 1 && <p className="mt-4 text-center text-xs font-bold text-slate-300">اكتب حرفاً آخر لبدء البحث</p>}
            </div>
          ) : loading && flat.length === 0 ? (
            <div className="p-4 sm:p-5 space-y-2.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <span className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-3 rounded-full bg-slate-100 w-2/3" />
                    <span className="block h-2.5 rounded-full bg-slate-50 w-1/3" />
                  </span>
                </div>
              ))}
            </div>
          ) : noResults ? (
            <div className="p-10 text-center">
              <span className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 grid place-items-center text-slate-300"><Search className="w-6 h-6" /></span>
              <p className="mt-3 font-head font-extrabold text-slate-700">لا نتائج لـ «{term}»</p>
              <p className="mt-1 text-[13px] text-slate-400 font-semibold">جرّب كلمة أقصر أو تأكد من الإملاء</p>
            </div>
          ) : (
            groups.map((g) => {
              const GIcon = g.source.icon;
              return (
                <div key={g.source.key} className="py-2">
                  <div className="px-4 sm:px-5 pt-2 pb-1 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400">
                    <GIcon className="w-3.5 h-3.5" /> {g.source.label}
                    <span className="text-slate-300">· {g.items.length}</span>
                  </div>
                  {g.items.map((it) => {
                    const idx = flat.findIndex((f) => f.uid === it.uid);
                    const isActive = idx === active;
                    const Icon = g.source.icon;
                    return (
                      <button
                        key={it.uid}
                        data-gs-idx={idx}
                        data-testid={`global-search-item-${it.uid}`}
                        onClick={() => go(it)}
                        onMouseEnter={() => setActive(idx)}
                        className={`w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-right transition-colors ${isActive ? "ft-bg-soft" : ""}`}
                      >
                        {it.book ? (
                          <BookCover book={it.book} className="w-9 h-12 rounded-lg overflow-hidden shadow-sm shrink-0" imgClassName="w-full h-full object-cover" />
                        ) : it.user ? (
                          <Avatar user={it.user} tint={g.source.tint} />
                        ) : it.cover ? (
                          <img src={fileUrl(it.cover)} alt="" className="w-10 h-10 rounded-2xl object-cover ring-1 ring-slate-200 shrink-0" />
                        ) : (
                          <span className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${g.source.tint}`}><Icon className="w-5 h-5" /></span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className={`block truncate text-sm font-bold ${isActive ? "ft-text-accent" : "text-slate-700"}`}>{it.title}</span>
                          {it.sub && <span className="block truncate text-[11px] font-semibold text-slate-400 mt-0.5">{it.sub}</span>}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full shrink-0 transition ${isActive ? "ft-btn-primary text-white" : "bg-slate-50 text-slate-300"}`}>
                          {g.source.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
