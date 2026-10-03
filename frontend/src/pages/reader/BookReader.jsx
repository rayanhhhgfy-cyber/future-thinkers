import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Download, ZoomIn, ZoomOut, Check, Loader2,
  AlertTriangle, ExternalLink, ChevronUp, ChevronLeft, ChevronRight, BookOpen,
  Bookmark, BookmarkCheck, Trash2, PanelLeft,
  Sun, Coffee, Moon, StickyNote, Plus, NotebookText, WifiOff,
} from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { signUrl } from "@/lib/signing";
import { getOfflineBook, deleteOfflineBook } from "@/lib/offline";

// pdf.js is self-hosted under /pdfjs (same-origin, copied from the pinned
// npm package) · no external CDN at runtime, so the reader works on any
// network and the font-decoding assets below can never be blocked.
const PDFJS_LIB_URL = `/pdfjs/pdf.mjs`;
const PDFJS_WORKER_URL = `/pdfjs/pdf.worker.min.mjs`;
/* Font-decoding assets (same-origin). Without these, pdf.js cannot decode
   CID-encoded text or substitute the standard 14 fonts, so books whose
   fonts are not fully embedded (most non-Arabic PDFs) render as
   symbols/tofu instead of letters. */
const PDFJS_CMAP_URL = `/pdfjs/cmaps/`;
const PDFJS_STANDARD_FONTS_URL = `/pdfjs/standard_fonts/`;
const PDFJS_DOC_OPTIONS = {
  cMapUrl: PDFJS_CMAP_URL,
  cMapPacked: true,
  standardFontDataUrl: PDFJS_STANDARD_FONTS_URL,
};

function loadPdfjs() {
  // pdf.js 6.3.289 calls Map.prototype.getOrInsertComputed (ES2025) and
  // crashes with "loading failed" on any browser that lacks it · polyfill
  // before importing so the reader works everywhere.
  try {
    const install = (proto) => {
      if (proto && typeof proto.getOrInsertComputed !== "function") {
        proto.getOrInsertComputed = function (k, fn) {
          if (!this.has(k)) this.set(k, fn(k));
          return this.get(k);
        };
      }
      if (proto && typeof proto.getOrInsert !== "function") {
        proto.getOrInsert = function (k, v) {
          if (!this.has(k)) this.set(k, v);
          return this.get(k);
        };
      }
    };
    install(typeof Map !== "undefined" && Map.prototype);
    install(typeof WeakMap !== "undefined" && WeakMap.prototype);
  } catch {}
  return import(/* webpackIgnore: true */ PDFJS_LIB_URL).then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return lib;
  });
}

const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
const PRELOAD = 1; // neighbor pages kept rendered so page turns are instant

/* Reader backdrop themes · applied to the reader container/pages desk.
   The PDF pages themselves stay white; the theme colors the space around
   them so long reading sessions feel easy on the eyes. */
const READER_THEMES = [
  { id: "light", label: "فاتح", desk: "#F8F5EF", icon: Sun },
  { id: "sepia", label: "سيبيا", desk: "#EDDCB8", icon: Coffee },
  { id: "night", label: "ليلي", desk: "#0B1120", icon: Moon },
];

/* Per-theme chrome (bars, dock, rail, sheets) · the theme tints the studio
   around the pages while the PDF sheets themselves stay paper-white. */
const THEME_UI = {
  night: {
    text: "text-white",
    glass: "bg-slate-950/70 border-white/10 text-white backdrop-blur-xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]",
    btn: "bg-white/10 hover:bg-white/20 text-white",
    chip: "bg-white/10 text-slate-100",
    muted: "text-slate-300/75",
    rail: "bg-slate-950/60 border-white/10 backdrop-blur-xl shadow-[0_18px_50px_-16px_rgba(0,0,0,0.75)]",
    track: "bg-white/10",
    hoverSoft: "hover:bg-white/[0.07]",
    glowA: "bg-indigo-600/25",
    glowB: "bg-emerald-600/20",
    sheet: "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_55px_rgba(251,191,36,0.06),0_28px_60px_-15px_rgba(0,0,0,0.85)]",
    sheetRing: "",
    vignette: true,
    sheetNote: "bg-slate-900/[0.97] border-white/10 text-white",
    sheetRow: "bg-white/[0.05] border-white/[0.07]",
    sheetText: "text-slate-100",
    sheetInput: "bg-white/[0.06] border-white/10 text-white placeholder:text-slate-500 focus:border-amber-300/50 focus:ring-amber-300/20",
    sheetMuted: "text-slate-400",
    sheetSub: "text-slate-500",
  },
  light: {
    text: "text-slate-800",
    glass: "bg-white/75 border-slate-900/[0.06] text-slate-800 backdrop-blur-xl shadow-[0_18px_45px_-14px_rgba(70,55,25,0.35)]",
    btn: "bg-slate-900/[0.06] hover:bg-slate-900/10 text-slate-700",
    chip: "bg-slate-900/[0.06] text-slate-700",
    muted: "text-slate-500",
    rail: "bg-white/70 border-slate-900/[0.06] backdrop-blur-xl shadow-[0_18px_45px_-16px_rgba(70,55,25,0.3)]",
    track: "bg-slate-900/10",
    hoverSoft: "hover:bg-slate-900/[0.05]",
    glowA: "bg-amber-200/40",
    glowB: "bg-white/50",
    sheet: "shadow-[0_1px_3px_rgba(60,45,20,0.12),0_18px_45px_-12px_rgba(60,45,20,0.35)] ring-1 ring-slate-900/[0.06]",
    sheetRing: "",
    vignette: false,
    sheetNote: "bg-white/[0.97] border-slate-900/10 text-slate-800",
    sheetRow: "bg-slate-900/[0.04] border-slate-900/[0.06]",
    sheetText: "text-slate-700",
    sheetInput: "bg-slate-900/[0.04] border-slate-900/10 text-slate-800 placeholder:text-slate-400 focus:border-amber-500/50 focus:ring-amber-500/20",
    sheetMuted: "text-slate-500",
    sheetSub: "text-slate-400",
  },
  sepia: {
    text: "text-[#43301b]",
    glass: "bg-[#fff8ea]/85 border-amber-900/10 text-[#43301b] backdrop-blur-xl shadow-[0_18px_45px_-14px_rgba(90,60,20,0.4)]",
    btn: "bg-amber-900/[0.08] hover:bg-amber-900/[0.14] text-[#5b4125]",
    chip: "bg-amber-900/[0.08] text-[#5b4125]",
    muted: "text-[#8a6b48]",
    rail: "bg-[#fff6e3]/80 border-amber-900/10 backdrop-blur-xl shadow-[0_18px_45px_-16px_rgba(90,60,20,0.35)]",
    track: "bg-amber-900/10",
    hoverSoft: "hover:bg-amber-900/[0.07]",
    glowA: "bg-amber-500/25",
    glowB: "bg-orange-500/15",
    sheet: "shadow-[0_2px_6px_rgba(90,60,20,0.18),0_22px_50px_-12px_rgba(90,60,20,0.45)] ring-1 ring-amber-900/10",
    sheetRing: "",
    vignette: false,
    sheetNote: "bg-[#fff8ea]/[0.98] border-amber-900/15 text-[#43301b]",
    sheetRow: "bg-amber-900/[0.05] border-amber-900/[0.08]",
    sheetText: "text-[#4a3520]",
    sheetInput: "bg-amber-900/[0.05] border-amber-900/15 text-[#43301b] placeholder:text-[#a07d52] focus:border-amber-600/50 focus:ring-amber-600/20",
    sheetMuted: "text-[#8a6b48]",
    sheetSub: "text-[#a5835c]",
  },
};

/* One page sheet on the stage. Renders its canvas at the given scale and
   reports the page's natural size so the parent can compute fit-contain.
   Neighbor pages stay mounted (hidden) so turning is instant. */
function StagePage({ pdf, pageNumber, scale, onSize, isCurrent, theme, animateCls }) {
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null); // {w,h} at scale=1
  const [dim, setDim] = useState(null); // rendered CSS size at `scale`
  const [ready, setReady] = useState(false);

  // Learn the page's natural size once (cheap: no rendering yet).
  useEffect(() => {
    let dead = false;
    pdf.getPage(pageNumber).then((page) => {
      if (dead) return;
      const vp = page.getViewport({ scale: 1 });
      setSize({ w: vp.width, h: vp.height });
      onSize(pageNumber, vp.width, vp.height);
    }).catch(() => {});
    return () => { dead = true; };
  }, [pdf, pageNumber, onSize]);

  // Render to canvas at the stage scale (fit-contain × zoom multiplier).
  // Neighbor pages pre-render at a cheaper preview scale/DPR so a turn is
  // instant; on promotion to current they re-render crisp. In-flight
  // renders are cancelled when the page changes so rapid turns stay cheap.
  useEffect(() => {
    if (!scale) return;
    let dead = false;
    let task = null;
    setReady(false);
    const renderScale = isCurrent ? scale : scale * 0.62;
    pdf.getPage(pageNumber).then((page) => {
      if (dead) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const viewport = page.getViewport({ scale: renderScale });
      const dpr = Math.min(window.devicePixelRatio || 1, isCurrent ? 2 : 1.25);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      setDim({ w: viewport.width, h: viewport.height });
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      task = page.render({
        canvasContext: ctx,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
      task.promise.then(() => { if (!dead) setReady(true); }).catch(() => {});
    }).catch(() => {});
    return () => { dead = true; if (task) { try { task.cancel(); } catch {} } };
  }, [pdf, pageNumber, scale, isCurrent]);

  const ui = THEME_UI[theme] || THEME_UI.light;
  const w = dim ? dim.w : size ? size.w * (scale || 1) : 600;
  const h = dim ? dim.h : size ? size.h * (scale || 1) : 800;

  return (
    <div
      data-page={pageNumber}
      className={`relative shrink-0 m-auto rounded-md lg:rounded-lg overflow-hidden bg-white ${ui.sheet} ${animateCls || ""}`}
      style={{ width: w, height: h }}
    >
      <canvas ref={canvasRef} className="block" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-slate-300">
          <BookOpen className="w-8 h-8 animate-pulse" />
          <span className="text-xs font-medium">صفحة {pageNumber}</span>
        </div>
      )}
      {theme === "sepia" && (
        <div className="absolute inset-0 pointer-events-none bg-amber-300/10 mix-blend-multiply" aria-hidden="true" />
      )}
      <div
        className={`absolute bottom-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md tabular-nums transition-colors ${isCurrent ? "bg-amber-400 text-slate-950 shadow-lg" : "bg-black/50 text-white/90"}`}
      >
        {isCurrent ? `صفحة ${pageNumber}` : pageNumber}
      </div>
    </div>
  );
}

export default function BookReader({ book, pdfUrl, onClose, onProgress, initialPercent = 0 }) {
  // Media GETs cannot carry headers, so the PDF URL is signed once
  // (fts/fnonce/fsig query params) for pdf.js and the download links.
  const signedPdfUrl = useMemo(() => signUrl(pdfUrl), [pdfUrl]);
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loadPct, setLoadPct] = useState(0);
  const [error, setError] = useState(null);
  const [zoomIdx, setZoomIdx] = useState(2); // 1x · multiplier on fit-contain
  const [currentPage, setCurrentPage] = useState(1);
  const [navDir, setNavDir] = useState(0); // 1 next · -1 prev · drives the sheet transition
  const [dims, setDims] = useState({}); // natural page sizes {n: {w,h}}
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });
  const [barsVisible, setBarsVisible] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [pageBookmarks, setPageBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  // Default theme is light (paper-white stage) · a stored choice from an
  // earlier visit is always respected.
  const [themeId, setThemeId] = useState(() => { try { return localStorage.getItem("ft-reader-theme") || "light"; } catch { return "light"; } });
  const [notes, setNotes] = useState([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesErr, setNotesErr] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [offlineReading, setOfflineReading] = useState(false);
  const [railOpen, setRailOpen] = useState(true);

  const stageRef = useRef(null);
  const panWrapRef = useRef(null);
  const resumedRef = useRef(false);
  const hideTimer = useRef(null);
  const progressTimer = useRef(null);
  const pdfRef = useRef(null);
  const wheelAcc = useRef(0);
  const wheelLastAt = useRef(0);
  const wheelLockUntil = useRef(0);
  const touchStart = useRef(null);

  const zoomStep = ZOOM_STEPS[zoomIdx];
  const zoomed = zoomStep > 1;
  // Fit the whole page inside the stage: never clipped, nothing to scroll
  // at the 1.0 multiplier. Derived live from the stage box + page size.
  const fitContain = useMemo(() => {
    const d = dims[currentPage];
    if (!d || !stageBox.w || !stageBox.h) return null;
    return Math.max(0.05, Math.min((stageBox.w - 36) / d.w, (stageBox.h - 36) / d.h));
  }, [dims, currentPage, stageBox]);
  const effScale = fitContain ? fitContain * zoomStep : null;
  const scaleUi = effScale || 1;
  // Non-Arabic books read left-to-right: arrow keys, dock arrows and the
  // page-turn slide follow the book's own direction. UI labels stay Arabic.
  const isLtrBook = !!book?.language && !/عرب|arab/i.test(String(book.language));
  const animFwd = isLtrBook ? "reader-page-prev" : "reader-page-next";
  const animBack = isLtrBook ? "reader-page-next" : "reader-page-prev";
  const theme = READER_THEMES.find((t) => t.id === themeId) || READER_THEMES[0];
  const desk = theme.desk;
  const ui = THEME_UI[theme.id] || THEME_UI.light;
  const pct = numPages ? Math.round((currentPage / numPages) * 100) : 0;

  useEffect(() => {
    try { localStorage.setItem("ft-reader-theme", themeId); } catch {}
  }, [themeId]);

  const pokeBars = useCallback(() => {
    setBarsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarsVisible(false), 3000);
  }, []);

  useEffect(() => { pokeBars(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [pokeBars]);

  // Measure the stage so fit-contain always matches the real box (window
  // resizes and rail toggles both flow through the ResizeObserver).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    setStageBox({ w: el.clientWidth, h: el.clientHeight });
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageBox({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePageSize = useCallback((n, w, h) => {
    setDims((prev) => (prev[n] && prev[n].w === w && prev[n].h === h ? prev : { ...prev, [n]: { w, h } }));
  }, []);

  // Load the document (pdf.js itself is fetched from CDN on first open).
  // A locally downloaded copy (IndexedDB) wins over the network so a saved
  // book opens fully offline; otherwise pdf.js streams the signed URL.
  const offlineBookId = book?.id;
  useEffect(() => {
    let dead = false;
    let loadingTask = null;
    let doc = null;
    setError(null); setLoadPct(0); setPdf(null); setOfflineReading(false);
    (async () => {
      let localData = null;
      try {
        const rec = offlineBookId ? await getOfflineBook(offlineBookId) : null;
        if (rec?.blob) localData = new Uint8Array(await rec.blob.arrayBuffer());
      } catch {}
      if (dead) return null;
      const pdfjsLib = await loadPdfjs();
      if (dead) return null;
      const open = (src) => {
        loadingTask = pdfjsLib.getDocument(src);
        loadingTask.onProgress = ({ loaded, total }) => {
          if (!dead && total > 0) setLoadPct(Math.round((loaded / total) * 100));
        };
        return loadingTask.promise;
      };
      if (localData) {
        setOfflineReading(true);
        try {
          return await open({ data: localData, ...PDFJS_DOC_OPTIONS });
        } catch (e) {
          // Saved copy is corrupt/partial · drop it and fall back to the
          // network copy instead of failing the book forever.
          try { if (offlineBookId) await deleteOfflineBook(offlineBookId); } catch {}
          if (dead) return null;
          setOfflineReading(false); setLoadPct(0);
          return open({ url: signedPdfUrl, ...PDFJS_DOC_OPTIONS });
        }
      }
      return open({ url: signedPdfUrl, ...PDFJS_DOC_OPTIONS });
    })().then((loadedDoc) => {
      if (!loadedDoc || dead) { if (loadedDoc) loadedDoc.destroy(); return; }
      doc = loadedDoc;
      pdfRef.current = doc;
      setPdf(doc);
      setNumPages(doc.numPages);
      setLoadPct(100);
    }).catch((e) => {
      if (!dead) setError(e?.message || "تعذر تحميل الملف");
    });
    return () => {
      dead = true;
      try { loadingTask?.destroy(); } catch {}
      if (pdfRef.current) { try { pdfRef.current.destroy(); } catch {} pdfRef.current = null; }
    };
  }, [pdfUrl, signedPdfUrl, offlineBookId]);

  // Lock body scroll while the reader is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // The current page is the single source of truth · every navigation
  // (dock, slider, wheel, swipe, keyboard, bookmarks) goes through here.
  const goToPage = useCallback((n) => {
    const target = numPages ? Math.min(numPages, Math.max(1, n)) : Math.max(1, n);
    setNavDir(target > currentPage ? 1 : target < currentPage ? -1 : 0);
    setCurrentPage(target);
    pokeBars();
  }, [currentPage, numPages, pokeBars]);

  // Resume once at the saved progress.
  useEffect(() => {
    if (!pdf || numPages === 0 || resumedRef.current) return;
    resumedRef.current = true;
    if (initialPercent > 2) {
      setCurrentPage(Math.min(numPages, Math.max(1, Math.round((initialPercent / 100) * numPages))));
    }
  }, [pdf, numPages, initialPercent]);

  // Keep the page in range when the document changes.
  useEffect(() => {
    if (numPages && currentPage > numPages) setCurrentPage(numPages);
  }, [numPages, currentPage]);

  // A fresh page starts its pan at the top when zoomed in.
  useEffect(() => {
    const w = panWrapRef.current;
    if (w) { w.scrollTop = 0; w.scrollLeft = 0; }
  }, [currentPage]);

  // Desktop keyboard: arrows / PageUp / PageDown / Space turn pages,
  // + and - zoom, 0 or F returns to fit. Ignored while typing in inputs.
  useEffect(() => {
    if (!pdf || error) return;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (showNotes) return;
      const fwdKey = isLtrBook ? "ArrowRight" : "ArrowLeft";
      const backKey = isLtrBook ? "ArrowLeft" : "ArrowRight";
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === fwdKey || (e.key === " " && !e.shiftKey)) {
        if (t && t.tagName === "BUTTON" && e.key === " ") return;
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === backKey || (e.key === " " && e.shiftKey)) {
        if (t && t.tagName === "BUTTON" && e.key === " ") return;
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === "+" || e.key === "=") {
        setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
        pokeBars();
      } else if (e.key === "-" || e.key === "_") {
        setZoomIdx((i) => Math.max(0, i - 1));
        pokeBars();
      } else if (e.key === "0" || e.key === "f" || e.key === "F") {
        setZoomIdx(2);
        pokeBars();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdf, error, pokeBars, showNotes, goToPage, currentPage, isLtrBook]);

  // Persist reading progress (debounced) · percent + current page.
  useEffect(() => {
    if (!numPages || !onProgress) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      onProgress(Math.min(99, Math.round((currentPage / numPages) * 100)), currentPage);
    }, 900);
    return () => { if (progressTimer.current) clearTimeout(progressTimer.current); };
  }, [currentPage, numPages, onProgress]);

  // Mouse wheel turns pages at fit zoom (accumulate, then lock briefly so
  // one gesture = one page). When zoomed in, the wheel pans the page.
  const handleWheel = (e) => {
    if (zoomed || !pdf || error) return;
    pokeBars();
    const now = Date.now();
    if (now - wheelLastAt.current > 250) wheelAcc.current = 0;
    wheelLastAt.current = now;
    wheelAcc.current += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (now < wheelLockUntil.current) return;
    if (Math.abs(wheelAcc.current) >= 40) {
      const dir = wheelAcc.current > 0 ? 1 : -1;
      wheelAcc.current = 0;
      wheelLockUntil.current = now + 400;
      goToPage(currentPage + dir);
    }
  };

  // Vertical swipe turns pages at fit zoom; when zoomed, touch pans.
  const handleTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
    pokeBars();
  };
  const handleTouchEnd = (e) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s || zoomed || !pdf || error) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dy = s.y - t.clientY;
    const dx = s.x - t.clientX;
    if (Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx)) {
      goToPage(currentPage + (dy > 0 ? 1 : -1));
    }
  };

  /* zoom presets · absolute scales (fit = current fit-contain step) */
  const setAbsZoom = (abs) => {
    const target = abs / (fitContain || 1);
    let best = 2, bd = Infinity;
    ZOOM_STEPS.forEach((s, i) => { const d = Math.abs(s - target); if (d < bd) { bd = d; best = i; } });
    setZoomIdx(best);
    pokeBars();
  };

  /* ---- personal notes per page ---- */
  const loadNotes = useCallback(async () => {
    const bid = book?.id;
    if (!bid) return;
    try {
      const { data } = await api.get(`/books/${bid}/notes`);
      setNotes(Array.isArray(data) ? data : (data?.items || []));
      setNotesErr("");
    } catch (err) {
      setNotesErr(apiErr(err));
    }
    setNotesLoaded(true);
  }, [book?.id]);

  const openNotes = () => {
    setShowNotes(true);
    pokeBars();
    if (!notesLoaded) loadNotes();
  };

  const addNote = async () => {
    const bid = book?.id;
    const text = noteText.trim();
    if (!text || !bid || addingNote) return;
    setAddingNote(true);
    try {
      await api.post(`/books/${bid}/notes`, { text, page: currentPage });
      setNoteText("");
      setNotesLoaded(false);
      await loadNotes();
    } catch (err) {
      setNotesErr(apiErr(err));
    }
    setAddingNote(false);
  };

  const deleteNote = async (note) => {
    const bid = book?.id;
    const nid = note.id || note._id;
    if (!nid || !bid) return;
    try {
      await api.delete(`/books/${bid}/notes/${nid}`);
      setNotes((ns) => ns.filter((n) => (n.id || n._id) !== nid));
    } catch (err) {
      setNotesErr(apiErr(err));
    }
  };

  /* ---- page bookmarks ---- */
  const bookId = book?.id;
  useEffect(() => {
    if (!bookId) return;
    api.get(`/books/${bookId}/page-bookmarks`)
      .then((r) => setPageBookmarks(r.data || []))
      .catch(() => {});
  }, [bookId]);

  const currentBookmarked = pageBookmarks.some((b) => b.page === currentPage);

  const togglePageBookmark = async () => {
    if (!bookId) return;
    pokeBars();
    try {
      const { data } = await api.post(`/books/${bookId}/page-bookmarks`, { page: currentPage });
      if (data.bookmarked) {
        setPageBookmarks((bs) => [...bs.filter((b) => b.page !== currentPage), data].sort((a, b) => a.page - b.page));
      } else {
        setPageBookmarks((bs) => bs.filter((b) => b.page !== currentPage));
      }
    } catch {}
  };

  const deletePageBookmark = async (bm) => {
    try {
      await api.delete(`/books/${bookId}/page-bookmarks/${bm.id}`);
      setPageBookmarks((bs) => bs.filter((b) => b.id !== bm.id));
    } catch {}
  };

  const markComplete = async () => {
    if (!onProgress) return;
    setMarkingDone(true);
    try { await onProgress(100); } finally { setMarkingDone(false); }
  };

  const setPanRef = (el) => { panWrapRef.current = el; };

  const stagePages = pdf && !error
    ? [currentPage - PRELOAD, currentPage, currentPage + PRELOAD].filter((n) => n >= 1 && n <= numPages)
    : [];

  const ringC = 2 * Math.PI * 30;

  return (
    <div
      className={`fixed inset-0 z-[80] flex flex-col transition-colors duration-500 ${ui.text}`}
      dir="rtl"
      data-testid="pdf-reader"
      style={{ background: desk }}
      onMouseMove={pokeBars}
      onPointerDown={pokeBars}
    >
      <style>{`
        /* UI chrome uses a full-coverage stack (Arabic + Latin) · any PDF
           text-layer span must inherit positioning/fonts, never be forced
           into an Arabic-only family (that turns Latin glyphs into tofu). */
        [data-testid="pdf-reader"] { font-family: var(--ft-font-body, 'IBM Plex Sans Arabic'), 'Segoe UI', Tahoma, system-ui, sans-serif; }
        [data-testid="pdf-reader"] .textLayer span { font-family: inherit !important; }
        @keyframes reader-in-next { from { opacity: 0; transform: translateX(-30px) scale(0.995); } to { opacity: 1; transform: none; } }
        @keyframes reader-in-prev { from { opacity: 0; transform: translateX(30px) scale(0.995); } to { opacity: 1; transform: none; } }
        @keyframes reader-in-fade { from { opacity: 0; } to { opacity: 1; } }
        .reader-page-next { animation: reader-in-next 0.32s cubic-bezier(0.22, 0.8, 0.3, 1) both; }
        .reader-page-prev { animation: reader-in-prev 0.32s cubic-bezier(0.22, 0.8, 0.3, 1) both; }
        .reader-page-fade { animation: reader-in-fade 0.25s ease both; }
      `}</style>

      {/* ambient glow + vignette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-32 right-1/4 w-96 h-96 rounded-full blur-[110px] transition-colors duration-500 ${ui.glowA}`} />
        <div className={`absolute -bottom-32 left-1/4 w-96 h-96 rounded-full blur-[110px] transition-colors duration-500 ${ui.glowB}`} />
        {ui.vignette && (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.5) 100%)" }} />
        )}
      </div>

      {/* top bar */}
      <div className={`relative z-10 transition-all duration-300 ${barsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="px-2.5 sm:px-5 pt-2.5 sm:pt-3.5">
          <div className={`border rounded-[22px] px-3 sm:px-4 py-2.5 ${ui.glass}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                data-testid="reader-close-btn"
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${ui.btn}`}
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm sm:text-base truncate">{book?.title}</div>
                <div className={`text-[11px] sm:text-xs truncate ${ui.muted}`}>{book?.author}</div>
              </div>
              <div className={`shrink-0 text-xs font-bold rounded-full px-3 py-1.5 tabular-nums ${ui.chip}`}>
                {numPages > 0 ? `${currentPage} / ${numPages}` : "…"}
              </div>
              {offlineReading && (
                <span data-testid="reader-offline-chip" className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-200 border border-emerald-500/30 rounded-full px-2.5 py-1.5">
                  <WifiOff className="w-3.5 h-3.5" /> محمّل
                </span>
              )}
              <div className="relative shrink-0">
                <button
                  onClick={togglePageBookmark}
                  data-testid="reader-bookmark-btn"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition ${currentBookmarked ? "bg-amber-400 text-slate-950 shadow-lg" : ui.btn}`}
                  aria-label="إشارة مرجعية لهذه الصفحة"
                  title={currentBookmarked ? "إزالة الإشارة من هذه الصفحة" : "ضع إشارة على هذه الصفحة"}
                >
                  {currentBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>
                {pageBookmarks.length > 0 && (
                  <button
                    onClick={() => { setShowBookmarks((s) => !s); pokeBars(); }}
                    data-testid="reader-bookmarks-list-btn"
                    className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold grid place-items-center border-2 border-white/70 shadow"
                    aria-label="كل الإشارات"
                  >
                    {pageBookmarks.length}
                  </button>
                )}
                {showBookmarks && (
                  <div className={`absolute top-12 left-0 w-60 max-h-72 overflow-y-auto rounded-2xl border p-2 shadow-2xl ${ui.glass}`} dir="rtl">
                    <div className={`text-[11px] font-bold px-2 py-1.5 ${ui.muted}`}>إشاراتي في هذا الكتاب</div>
                    {pageBookmarks.map((bm) => (
                      <div key={bm.id} className={`flex items-center gap-1 rounded-xl px-2 py-1.5 group transition ${ui.hoverSoft}`}>
                        <button
                          onClick={() => { goToPage(bm.page); setShowBookmarks(false); }}
                          className="flex-1 text-right text-sm flex items-center gap-2"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span className={bm.page === currentPage ? "font-bold text-amber-500" : ""}>صفحة {bm.page}</span>
                        </button>
                        <button
                          onClick={() => deletePageBookmark(bm)}
                          className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
                          aria-label="حذف الإشارة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={openNotes}
                data-testid="reader-notes-btn"
                className={`relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition ${ui.btn}`}
                aria-label="ملاحظاتي"
                title="ملاحظاتي على الكتاب"
              >
                <NotebookText className="w-5 h-5" />
                {notesLoaded && notes.length > 0 && (
                  <span className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold grid place-items-center border-2 border-white/70 shadow">
                    {notes.length}
                  </span>
                )}
              </button>
              <a
                href={signedPdfUrl}
                download
                className={`w-10 h-10 shrink-0 rounded-full hidden sm:flex items-center justify-center transition ${ui.btn}`}
                aria-label="تحميل"
                title="تحميل الكتاب"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => { setRailOpen((o) => !o); pokeBars(); }}
                className={`w-10 h-10 shrink-0 rounded-full hidden xl:flex items-center justify-center transition ${ui.btn}`}
                aria-label={railOpen ? "إخفاء لوحة القراءة" : "إظهار لوحة القراءة"}
                title={railOpen ? "إخفاء لوحة القراءة" : "إظهار لوحة القراءة"}
              >
                <PanelLeft className="w-5 h-5" />
              </button>
              <button
                onClick={markComplete}
                disabled={markingDone}
                data-testid="reader-complete-btn"
                className="h-10 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 flex items-center gap-1.5 transition disabled:opacity-60 shadow-lg shadow-emerald-500/25"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{markingDone ? "جارٍ الحفظ…" : "أكملت الكتاب"}</span>
                <span className="sm:hidden">تم</span>
              </button>
            </div>
            {/* progress hairline */}
            <div className={`mt-2.5 h-1 rounded-full overflow-hidden ${ui.track}`}>
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* desk: page stage + reading rail */}
      <div className="relative z-[5] flex flex-1 min-h-0">
        {/* stage · one whole page at a time, movement only between pages */}
        <div
          ref={stageRef}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative flex-1 min-w-0 overflow-hidden overscroll-contain ${zoomed ? "" : "touch-none"}`}
        >
          {error ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className={`max-w-sm w-full text-center border rounded-[28px] p-8 ${ui.glass}`}>
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="font-bold text-lg mt-4">تعذر فتح الكتاب</h3>
                <p className={`text-sm mt-2 leading-relaxed ${ui.muted}`}>
                  حدثت مشكلة أثناء تحميل صفحات الكتاب. يمكنك المحاولة مجدداً أو فتحه في تبويب جديد.
                </p>
                <div className="flex flex-col gap-2 mt-6">
                  <button
                    onClick={() => window.location.reload()}
                    className={`h-11 rounded-xl font-bold text-sm transition border border-transparent ${ui.btn}`}
                  >
                    إعادة المحاولة
                  </button>
                  <a
                    href={signedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink className="w-4 h-4" /> فتح في تبويب جديد
                  </a>
                  <a
                    href={signedPdfUrl}
                    download
                    className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition border border-transparent ${ui.btn}`}
                  >
                    <Download className="w-4 h-4" /> تحميل الكتاب
                  </a>
                </div>
              </div>
            </div>
          ) : !pdf ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className={`text-center border rounded-[28px] px-8 sm:px-12 py-9 max-w-sm w-full ${ui.glass}`}>
                {book?.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book?.title || "غلاف الكتاب"}
                    className="w-24 h-36 object-cover mx-auto rounded-lg shadow-[0_16px_35px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
                  />
                ) : (
                  <div className="w-[4.5rem] h-[6.75rem] mx-auto rounded-lg bg-gradient-to-br from-indigo-500/70 to-emerald-500/70 flex items-center justify-center shadow-[0_16px_35px_-10px_rgba(0,0,0,0.55)]">
                    <BookOpen className="w-8 h-8 text-white/90" />
                  </div>
                )}
                <h3 className="font-bold text-base sm:text-lg mt-5 leading-snug">{book?.title || "جارٍ تجهيز الكتاب…"}</h3>
                {book?.author && <p className={`text-xs sm:text-sm mt-1 ${ui.muted}`}>{book.author}</p>}
                <div className="relative w-[76px] h-[76px] mx-auto mt-6">
                  <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
                    <circle cx="38" cy="38" r="30" fill="none" strokeWidth="6" className="stroke-slate-400/25" />
                    <circle
                      cx="38" cy="38" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
                      stroke="url(#reader-load-grad)"
                      strokeDasharray={ringC}
                      strokeDashoffset={ringC * (1 - loadPct / 100)}
                      className="transition-all duration-300"
                    />
                    <defs>
                      <linearGradient id="reader-load-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-sm font-extrabold tabular-nums">{loadPct}%</span>
                  </div>
                </div>
                <p className={`text-[11px] mt-3 flex items-center justify-center gap-1.5 ${ui.muted}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ تجهيز صفحات الكتاب…
                </p>
              </div>
            </div>
          ) : (
            stagePages.map((n) => {
              const isCur = n === currentPage;
              return (
                <div
                  key={n}
                  ref={isCur ? setPanRef : undefined}
                  aria-hidden={!isCur}
                  className={`absolute inset-0 flex ${isCur ? (zoomed ? "overflow-auto" : "overflow-hidden") : "overflow-hidden invisible pointer-events-none"}`}
                  style={{ zIndex: isCur ? 2 : 1 }}
                >
                  <StagePage
                    pdf={pdf}
                    pageNumber={n}
                    scale={effScale}
                    onSize={handlePageSize}
                    isCurrent={isCur}
                    theme={themeId}
                    animateCls={isCur ? (navDir > 0 ? animFwd : navDir < 0 ? animBack : "reader-page-fade") : ""}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* reading rail · desktop only */}
        {pdf && !error && railOpen && (
          <aside className="hidden xl:flex w-[292px] shrink-0 flex-col gap-4 overflow-y-auto py-5 pe-5 ps-1">
            <div className={`border rounded-[24px] p-5 ${ui.rail}`}>
              <div className="flex items-center gap-4">
                <div className="relative w-[68px] h-[68px] shrink-0">
                  <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
                    <circle cx="38" cy="38" r="30" fill="none" strokeWidth="6" className="stroke-slate-400/25" />
                    <circle
                      cx="38" cy="38" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
                      stroke="url(#reader-rail-grad)"
                      strokeDasharray={ringC}
                      strokeDashoffset={ringC * (1 - pct / 100)}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="reader-rail-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#2dd4bf" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-[13px] font-extrabold tabular-nums">{pct}%</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold tabular-nums">صفحة {currentPage} من {numPages}</div>
                  <div className={`text-[11px] mt-1 ${ui.muted}`}>
                    {numPages - currentPage > 0 ? `تبقّى ${numPages - currentPage} صفحة على النهاية` : "وصلت إلى آخر صفحة"}
                  </div>
                </div>
              </div>
              <div className={`mt-4 h-1.5 rounded-full overflow-hidden ${ui.track}`}>
                <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className={`border rounded-[24px] p-4 ${ui.rail}`}>
              <div className={`text-[11px] font-bold px-1 pb-2.5 ${ui.muted}`}>مظهر القراءة</div>
              <div className="flex gap-2">
                {READER_THEMES.map((t) => {
                  const TIcon = t.icon;
                  const activeTheme = themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setThemeId(t.id); pokeBars(); }}
                      className={`flex-1 h-11 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition ${activeTheme ? "bg-amber-400 text-slate-950 shadow-lg" : ui.btn}`}
                      title={`مظهر ${t.label}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/15 shrink-0" style={{ background: t.desk }} />
                      <TIcon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`border rounded-[24px] p-4 ${ui.rail}`}>
              <div className="flex items-center justify-between px-1 pb-2.5">
                <span className={`text-[11px] font-bold ${ui.muted}`}>صفحاتي المعلّمة</span>
                <span className={`text-[10px] font-extrabold rounded-full px-2 py-0.5 tabular-nums ${ui.chip}`}>{pageBookmarks.length}</span>
              </div>
              {pageBookmarks.length === 0 ? (
                <p className={`text-[11px] leading-relaxed px-1 ${ui.muted}`}>لا إشارات بعد · اضغط زر الإشارة أثناء القراءة وستجد صفحاتك هنا للرجوع السريع.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {pageBookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => goToPage(bm.page)}
                      className={`h-9 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition tabular-nums ${bm.page === currentPage ? "bg-amber-400 text-slate-950 shadow" : ui.btn}`}
                    >
                      <Bookmark className="w-3 h-3 fill-amber-400 text-amber-500" />
                      صفحة {bm.page}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={openNotes}
              className={`border rounded-[24px] p-4 text-start transition ${ui.rail} ${ui.hoverSoft}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-500 grid place-items-center shrink-0">
                  <NotebookText className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold">ملاحظاتي</div>
                  <div className={`text-[11px] mt-0.5 ${ui.muted}`}>
                    {notesLoaded ? (notes.length ? `${notes.length} ملاحظة محفوظة` : "لا ملاحظات بعد") : "دوّن أفكارك أثناء القراءة"}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 opacity-50 shrink-0" />
              </div>
            </button>
          </aside>
        )}
      </div>

      {/* bottom floating control dock */}
      {pdf && !error && (
        <div className={`relative z-10 transition-all duration-300 ${barsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}>
          <div className="px-2.5 sm:px-5 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:pb-5">
            <div className={`max-w-3xl mx-auto border rounded-[26px] px-3 sm:px-5 py-3 ${ui.glass}`}>
              {/* zoom presets + reader themes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-3" dir="rtl">
                <button
                  onClick={() => { setZoomIdx(2); pokeBars(); }}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition ${zoomIdx === 2 ? "bg-amber-400 text-slate-950" : ui.btn}`}
                >
                  ملاءمة الشاشة
                </button>
                <button
                  onClick={() => setAbsZoom(1)}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition tabular-nums ${Math.abs(scaleUi - 1) < 0.12 ? "bg-amber-400 text-slate-950" : ui.btn}`}
                >
                  100%
                </button>
                <button
                  onClick={() => setAbsZoom(1.5)}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition tabular-nums ${Math.abs(scaleUi - 1.5) < 0.12 ? "bg-amber-400 text-slate-950" : ui.btn}`}
                >
                  150%
                </button>
                <span className={`w-px h-5 mx-1 hidden sm:block ${ui.track}`} aria-hidden="true" />
                {READER_THEMES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      data-testid={`reader-theme-${t.id}`}
                      onClick={() => { setThemeId(t.id); pokeBars(); }}
                      className={`h-8 pl-2.5 pr-2 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${themeId === t.id ? "bg-amber-400 text-slate-950" : ui.btn}`}
                      title={`مظهر ${t.label}`}
                    >
                      <TIcon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => goToPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className={`h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-2xl flex items-center justify-center transition disabled:opacity-30 ${ui.btn}`}
                  aria-label="الصفحة السابقة"
                  title="الصفحة السابقة"
                >
                  {isLtrBook ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, numPages)}
                  value={currentPage}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  data-testid="reader-page-slider"
                  className="flex-1 accent-emerald-400 h-1.5 cursor-pointer min-w-0"
                  aria-label="الصفحة"
                />
                <button
                  onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage >= numPages}
                  className={`h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-2xl flex items-center justify-center transition disabled:opacity-30 ${ui.btn}`}
                  aria-label="الصفحة التالية"
                  title="الصفحة التالية"
                >
                  {isLtrBook ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
                <span className={`hidden md:inline-flex shrink-0 items-center text-[11px] font-bold rounded-full px-3 py-1.5 tabular-nums ${ui.chip}`}>
                  صفحة {currentPage} من {numPages} · {pct}٪
                </span>
                <span className={`w-px h-5 hidden sm:block ${ui.track}`} aria-hidden="true" />
                <button
                  onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                  disabled={zoomIdx === 0}
                  className={`h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-2xl disabled:opacity-30 flex items-center justify-center transition ${ui.btn}`}
                  aria-label="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className={`text-[11px] font-bold tabular-nums w-11 text-center shrink-0 hidden sm:inline ${ui.muted}`}>
                  {Math.round(ZOOM_STEPS[zoomIdx] * 100)}%
                </span>
                <button
                  onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                  disabled={zoomIdx === ZOOM_STEPS.length - 1}
                  className={`h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-2xl disabled:opacity-30 flex items-center justify-center transition ${ui.btn}`}
                  aria-label="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(1)}
                  className={`h-11 w-11 sm:h-10 sm:w-10 shrink-0 rounded-2xl hidden sm:flex items-center justify-center transition ${ui.btn}`}
                  aria-label="العودة للأول"
                  title="العودة لأول صفحة"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* notes bottom sheet */}
      {showNotes && (
        <div className="absolute inset-0 z-30" dir="rtl">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setShowNotes(false)} />
          <div className={`absolute inset-x-0 bottom-0 max-h-[78vh] flex flex-col rounded-t-[28px] border-t shadow-2xl ${ui.sheetNote}`}>
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-current/10">
              <span className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-500 grid place-items-center shrink-0">
                <NotebookText className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-head font-extrabold text-sm">ملاحظاتي</div>
                <div className={`text-[11px] ${ui.sheetMuted}`}>أنت الآن في الصفحة {currentPage}</div>
              </div>
              <button
                onClick={() => setShowNotes(false)}
                className={`w-9 h-9 rounded-full grid place-items-center transition shrink-0 ${ui.btn}`}
                aria-label="إغلاق الملاحظات"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {notesErr && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-500 text-xs font-semibold px-3 py-2.5">{notesErr}</div>
              )}
              {!notesLoaded ? (
                <div className={`flex items-center justify-center gap-2 py-8 text-sm ${ui.sheetMuted}`}>
                  <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل ملاحظاتك…
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className={`w-9 h-9 mx-auto ${ui.sheetSub}`} />
                  <p className={`text-sm mt-3 leading-relaxed ${ui.sheetMuted}`}>لا ملاحظات بعد · اكتب أول ملاحظة لك على الصفحة {currentPage} وستجدها هنا دائماً.</p>
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id || n._id} className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 group ${ui.sheetRow}`}>
                    <button
                      onClick={() => { if (n.page) { goToPage(n.page); setShowNotes(false); } }}
                      className="shrink-0 rounded-full bg-amber-400/15 text-amber-600 text-[11px] font-extrabold px-2.5 py-1 tabular-nums"
                      title="الانتقال إلى الصفحة"
                    >
                      ص {n.page}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${ui.sheetText}`}>{n.text}</p>
                      {n.created_at && <div className={`text-[10px] mt-1 tabular-nums ${ui.sheetSub}`}>{String(n.created_at).slice(0, 10)}</div>}
                    </div>
                    <button
                      onClick={() => deleteNote(n)}
                      className={`w-8 h-8 shrink-0 grid place-items-center rounded-lg transition ${ui.sheetSub} hover:text-rose-500 hover:bg-rose-500/10`}
                      aria-label="حذف الملاحظة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-current/10">
              <div className="flex items-end gap-2">
                <textarea
                  data-testid="note-text-input"
                  value={noteText}
                  onChange={(ev) => setNoteText(ev.target.value)}
                  rows={2}
                  placeholder={`أضف ملاحظة على الصفحة ${currentPage}…`}
                  className={`flex-1 resize-none rounded-2xl border focus:ring-2 outline-none px-3.5 py-2.5 text-sm ${ui.sheetInput}`}
                />
                <button
                  data-testid="add-note-btn"
                  onClick={addNote}
                  disabled={!noteText.trim() || addingNote}
                  className="h-11 shrink-0 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold px-4 flex items-center gap-1.5 transition disabled:opacity-40"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
