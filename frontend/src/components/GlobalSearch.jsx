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
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[#02150f]/60 px-3 pt-[9vh] backdrop-blur-xl sm:px-4 sm:pt-[7vh]"
      onClick={onClose}
      data-testid="global-search"
    >
      <motion.div
        initial={{ opacity: 0, y: 34, scale: 0.965 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_50px_110px_-24px_rgba(1,10,7,0.7)] ring-1 ring-white/50 sm:max-h-[86vh] sm:rounded-[32px]"
      >
        {/* ===== gradient search header ===== */}
        <div className="ft-hero-gradient grain relative shrink-0 overflow-hidden px-4 pb-5 pt-[max(1.1rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pt-5">
          <div className="pointer-events-none absolute -top-20 start-1/4 h-56 w-56 rounded-full blur-3xl" style={{ background: "color-mix(in srgb, var(--ft-accent) 38%, transparent)" }} />
          <div className="pointer-events-none absolute -bottom-24 end-8 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40">
                <Sparkles className="h-4.5 w-4.5" />
              </span>
              <p className="font-head text-[15px] font-black leading-none">بحث المنصة الذكي</p>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-slate-200 ring-1 ring-white/15">كتب · مشاريع · أعضاء · فعاليات · أخبار</span>
              <span className="flex-1" />
              <button onClick={onClose} aria-label="إغلاق البحث"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-90">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-[22px] bg-white p-2 shadow-[0_20px_40px_-16px_rgba(1,10,7,0.55)] ring-1 ring-black/5 transition-shadow focus-within:shadow-[0_24px_48px_-14px_rgba(1,10,7,0.6)]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl ft-icon-tile text-white shadow-md">
                <Search className="h-5 w-5" />
              </span>
              <input
                ref={inputRef}
                data-testid="global-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="ابحث عن كتاب، مشروع، عضو، فعالية…"
                className="min-w-0 flex-1 bg-transparent text-base font-bold text-slate-800 outline-none placeholder:font-semibold placeholder:text-slate-300 sm:text-lg"
              />
              {loading
                ? <Loader2 className="ft-text-accent h-5 w-5 shrink-0 animate-spin" />
                : term && (
                  <button onClick={() => setQ("")} aria-label="مسح البحث"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 active:scale-90">
                    <X className="h-4 w-4" />
                  </button>
                )}
              <kbd className="hidden shrink-0 items-center rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-amber-300 sm:inline-flex">ESC</kbd>
            </div>
          </div>
        </div>

        {/* ===== body ===== */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-slate-50/60">
          {showRecents ? (
            <div className="p-4 sm:p-6">
              {recent.length > 0 && (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> عمليات بحث سابقة
                    </span>
                    <button onClick={clearRecent}
                      className="inline-flex min-h-[32px] items-center gap-1 px-2 text-[11px] font-bold text-slate-300 transition hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" /> مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => { setQ(r); inputRef.current?.focus(); }}
                        className="pressable inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-px hover:text-teal-700 hover:ring-teal-200">
                        <Clock className="h-3.5 w-3.5 text-teal-500" /> {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="ft-bg-soft ft-ring-accent mt-6 flex items-start gap-3 rounded-[24px] p-4 ring-1 sm:p-5">
                <span className="ft-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md"><Sparkles className="h-4.5 w-4.5" /></span>
                <p className="text-[13px] font-semibold leading-relaxed text-slate-500">
                  بحث واحد يغطي الموقع كله: جرّب اسم كتاب من المكتبة، مشروعاً من المشاريع، عضواً من الأعضاء، فعالية قادمة أو خبراً جديداً.
                </p>
              </div>
              {term.length === 1 && <p className="mt-4 text-center text-xs font-bold text-slate-300">اكتب حرفاً آخر لبدء البحث</p>}
            </div>
          ) : loading && flat.length === 0 ? (
            <div className="space-y-3 p-4 sm:p-6" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3">
                  <span className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-2/3 rounded-full bg-slate-100" />
                    <span className="block h-2.5 w-1/3 rounded-full bg-slate-50" />
                  </span>
                </div>
              ))}
            </div>
          ) : noResults ? (
            <div className="p-10 text-center sm:p-12">
              <span className="ft-hero-gradient mx-auto grid h-16 w-16 place-items-center rounded-[22px] text-white shadow-xl"><Search className="h-7 w-7" /></span>
              <p className="font-head mt-4 text-lg font-black text-slate-800">لا نتائج لـ «{term}»</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-400">جرّب كلمة أقصر أو تأكد من الإملاء</p>
            </div>
          ) : (
            groups.map((g) => {
              const GIcon = g.source.icon;
              return (
                <div key={g.source.key} className="px-2.5 py-2 sm:px-3.5">
                  <div className="flex items-center gap-2 px-2 pb-1.5 pt-2">
                    <span className={`grid h-6 w-6 place-items-center rounded-lg ${g.source.tint}`}><GIcon className="h-3.5 w-3.5" /></span>
                    <span className="text-[11px] font-black tracking-wide text-slate-500">{g.source.label}</span>
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{g.items.length}</span>
                    <span className="h-px flex-1 bg-gradient-to-l from-slate-200/80 to-transparent" />
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
                        className={`group flex w-full items-center gap-3 rounded-[20px] px-3 py-2.5 text-right transition-all duration-200 ${isActive ? "ft-bg-soft shadow-sm ring-1 ft-ring-accent" : "hover:bg-white"}`}
                      >
                        {it.book ? (
                          <BookCover book={it.book} className="h-14 w-10 shrink-0 overflow-hidden rounded-[10px] shadow-md ring-1 ring-black/5" imgClassName="h-full w-full object-cover" />
                        ) : it.user ? (
                          <Avatar user={it.user} tint={g.source.tint} />
                        ) : it.cover ? (
                          <img src={fileUrl(it.cover)} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ${g.source.tint}`}><Icon className="h-5 w-5" /></span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] font-bold ${isActive ? "ft-text-accent" : "text-slate-700"}`}>{it.title}</span>
                          {it.sub && <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">{it.sub}</span>}
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition ${isActive ? "ft-btn-primary text-white shadow-md" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/70"}`}>
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

        {/* ===== footer hints ===== */}
        <div className="hidden shrink-0 items-center gap-4 border-t border-slate-100 bg-white/80 px-6 py-3 text-[11px] font-bold text-slate-400 backdrop-blur sm:flex">
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-black text-slate-500 shadow-sm">↑↓</kbd> للتنقل</span>
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-black text-slate-500 shadow-sm">Enter</kbd> للفتح</span>
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-black text-slate-500 shadow-sm">Esc</kbd> للإغلاق</span>
          <span className="flex-1" />
          {searched && flat.length > 0 && <span className="ft-text-accent font-black">{flat.length} نتيجة</span>}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
