import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api, { fileUrl } from "@/lib/api";
import BookCover from "@/components/BookCover";
import { EASE } from "@/components/anim";
import {
  Search, X, BookOpen, Rocket, Users, CalendarDays, Newspaper,
  Clock, Trash2, Loader2, Sparkles, TrendingUp, ChevronLeft, CornerDownLeft,
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

const SUGGESTED = ["كتب", "شطرنج", "مسابقات", "مشاريع", "فعاليات", "نادي"];

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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 px-3 pt-[10vh] backdrop-blur-md sm:px-4 sm:pt-[12vh]"
      onClick={onClose}
      data-testid="global-search"
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-[26px] bg-white/[0.97] shadow-[0_40px_90px_-20px_rgba(2,20,14,0.55)] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl sm:max-h-[80vh]"
      >
        {/* ===== header: softly rounded typing field ===== */}
        <div className="relative shrink-0 px-4 pb-3.5 pt-4 sm:px-5">
          <div className="flex items-center gap-1.5 rounded-[22px] bg-slate-100/90 p-1.5 ring-1 ring-transparent transition-all duration-300 focus-within:bg-white focus-within:shadow-[0_14px_34px_-12px_rgba(4,120,87,0.4)] focus-within:ring-2 focus-within:ring-emerald-400/70">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[16px] bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <Search className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              data-testid="global-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ابحث عن كتاب، مشروع، عضو، فعالية…"
              aria-label="بحث المنصة"
              className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[17px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
            />
            {loading
              ? <Loader2 className="me-2 h-5 w-5 shrink-0 animate-spin text-emerald-600" />
              : term ? (
                <button onClick={() => setQ("")} aria-label="مسح البحث"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80 transition hover:text-rose-500 active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            <button onClick={onClose} aria-label="إغلاق البحث"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-600 hover:shadow-sm active:scale-90">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div className="mx-4 h-px shrink-0 bg-gradient-to-l from-transparent via-slate-200 to-transparent sm:mx-5" aria-hidden="true" />

        {/* ===== body ===== */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3">
          {showRecents ? (
            <div className="px-1.5 py-1">
              {recent.length > 0 && (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> بحثت عنه مؤخراً
                    </span>
                    <button onClick={clearRecent}
                      className="inline-flex min-h-[30px] items-center gap-1 px-1.5 text-[11px] font-bold text-slate-300 transition hover:text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" /> مسح الكل
                    </button>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {recent.map((r) => (
                      <button key={r} onClick={() => { setQ(r); inputRef.current?.focus(); }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-700">
                        <Clock className="h-3 w-3 text-slate-300" /> {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-slate-400">
                <TrendingUp className="h-3.5 w-3.5" /> جرّب تبحث عن
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((t) => (
                  <button key={t} onClick={() => { setQ(t); inputRef.current?.focus(); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:bg-emerald-100/80 hover:text-emerald-800">
                    <Sparkles className="h-3 w-3 text-emerald-500" /> {t}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-emerald-900 ring-1 ring-emerald-100">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>بحث واحد يغطي <b>الكتب والمشاريع والأعضاء والفعاليات والأخبار</b> · جرّب اسم كتاب أو اسم زميلك.</span>
              </div>
              {term.length === 1 && <p className="mt-4 text-center text-xs font-bold text-slate-300">اكتب حرفاً آخر لبدء البحث</p>}
            </div>
          ) : loading && flat.length === 0 ? (
            <div className="space-y-1.5 px-1.5 py-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                  <span className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                  <span className="flex-1 space-y-1.5">
                    <span className="block h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
                    <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-slate-100" />
                  </span>
                </div>
              ))}
              <p className="flex items-center gap-2 px-2 pt-1 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> جارٍ البحث في المنصة…</p>
            </div>
          ) : noResults ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[20px] bg-slate-100 text-slate-400"><Search className="h-6 w-6" /></span>
              <p className="font-head text-[16px] font-black text-slate-800">لا نتائج لـ «{term}»</p>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-slate-400">جرّب كلمة أقصر أو أعد صياغتها، أو تصفّح المكتبة والمشاريع مباشرة.</p>
            </div>
          ) : (
            groups.map((g) => {
              const GIcon = g.source.icon;
              return (
                <div key={g.source.key} className="mb-1.5 last:mb-0">
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/[0.97] px-2 pb-1 pt-2 backdrop-blur-2xl">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide text-slate-400">
                      <GIcon className="h-3.5 w-3.5 text-emerald-600" /> {g.source.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-black text-slate-500">{g.items.length}</span>
                    <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
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
                        className={`group relative flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-right transition ${isActive ? "bg-emerald-50/90 ring-1 ring-emerald-100" : "hover:bg-slate-50"}`}
                      >
                        <span aria-hidden="true" className={`absolute inset-y-2 right-0 w-[3px] rounded-full bg-emerald-500 transition ${isActive ? "opacity-100" : "opacity-0"}`} />
                        {it.book ? (
                          <BookCover book={it.book} className="h-12 w-9 shrink-0 rounded-lg shadow ring-1 ring-slate-900/5" imgClassName="h-12 w-9 rounded-lg object-cover" />
                        ) : it.user ? (
                          <Avatar user={it.user} tint={g.source.tint} />
                        ) : it.cover ? (
                          <img src={fileUrl(it.cover)} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
                        ) : (
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${isActive ? "bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100" : "bg-slate-100 text-slate-400"}`}><Icon className="h-[18px] w-[18px]" /></span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[14.5px] font-bold ${isActive ? "text-emerald-950" : "text-slate-800"}`}>{it.title}</span>
                          {it.sub && <span className="block truncate text-[12px] font-medium text-slate-400">{it.sub}</span>}
                        </span>
                        {isActive && <ChevronLeft className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ===== footer ===== */}
        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-semibold text-slate-400 sm:px-5">
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-slate-500 shadow-sm">↑↓</kbd> تنقّل
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <kbd className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-slate-500 shadow-sm"><CornerDownLeft className="h-3 w-3" /> Enter</kbd> افتح
          </span>
          <span className="ms-auto shrink-0 font-bold">
            {term ? (loading ? "جارٍ البحث…" : `${flat.length} نتيجة`) : "بحث المنصة"}
          </span>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
