import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, Download, ZoomIn, ZoomOut, Check, Loader2,
  AlertTriangle, ExternalLink, ChevronUp, BookOpen,
  Bookmark, BookmarkCheck, Trash2,
  Sun, Coffee, Moon, StickyNote, Plus, NotebookText, WifiOff,
} from "lucide-react";
import api, { apiErr } from "@/lib/api";
import { signUrl } from "@/lib/signing";
import { getOfflineBook } from "@/lib/offline";

// pdf.js is loaded on demand from CDN (never bundled, never pushed through
// the repo) · the reader chunk stays small and the main bundle is untouched.
const PDFJS_VERSION = "6.3.289";
const PDFJS_LIB_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

function loadPdfjs() {
  return import(/* webpackIgnore: true */ PDFJS_LIB_URL).then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return lib;
  });
}

const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];
const RENDER_AHEAD_BEHIND = 3; // pages rendered around the visible one

/* Reader backdrop themes · applied to the reader container/pages desk.
   The PDF pages themselves stay white; the theme colors the space around
   them so long reading sessions feel easy on the eyes. */
const READER_THEMES = [
  { id: "light", label: "فاتح", desk: "#E9E6DF", icon: Sun },
  { id: "sepia", label: "سيبيا", desk: "#F5E9D3", icon: Coffee },
  { id: "night", label: "ليلي", desk: "#111827", icon: Moon },
];

function PageView({ pdf, pageNumber, scale, active, onSize }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null); // {w,h} at scale=1

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

  // Render to canvas only while the page is near the viewport.
  useEffect(() => {
    if (!active || !size) return;
    let dead = false;
    let task = null;
    pdf.getPage(pageNumber).then((page) => {
      if (dead) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      task = page.render({
        canvasContext: ctx,
        viewport,
        transform: [dpr, 0, 0, dpr, 0, 0],
      });
      task.promise.catch(() => {});
    }).catch(() => {});
    return () => { dead = true; if (task) { try { task.cancel(); } catch {} } };
  }, [pdf, pageNumber, scale, active, size]);

  const w = size ? size.w * scale : 600;
  const h = size ? size.h * scale : 800;

  return (
    <div
      ref={wrapRef}
      data-page={pageNumber}
      className="relative mx-auto rounded-lg overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.45)] bg-white"
      style={{ width: w, height: h, maxWidth: "100%" }}
    >
      {active ? (
        <canvas ref={canvasRef} className="block" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-slate-300">
          <BookOpen className="w-8 h-8" />
          <span className="text-xs font-medium">صفحة {pageNumber}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/55 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
        {pageNumber}
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
  const [zoomIdx, setZoomIdx] = useState(2); // 1x
  const [fitScale, setFitScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [barsVisible, setBarsVisible] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [pageBookmarks, setPageBookmarks] = useState([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [themeId, setThemeId] = useState(() => { try { return localStorage.getItem("ft-reader-theme") || "night"; } catch { return "night"; } });
  const [notes, setNotes] = useState([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesErr, setNotesErr] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [offlineReading, setOfflineReading] = useState(false);

  const scrollRef = useRef(null);
  const pageTops = useRef({});
  const page1Width = useRef(0);
  const hideTimer = useRef(null);
  const jumpedOnce = useRef(false);
  const progressTimer = useRef(null);
  const pdfRef = useRef(null);

  const scale = fitScale * ZOOM_STEPS[zoomIdx];
  const desk = (READER_THEMES.find((t) => t.id === themeId) || READER_THEMES[2]).desk;

  useEffect(() => {
    try { localStorage.setItem("ft-reader-theme", themeId); } catch {}
  }, [themeId]);

  const pokeBars = useCallback(() => {
    setBarsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBarsVisible(false), 3000);
  }, []);

  useEffect(() => { pokeBars(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [pokeBars]);

  // Measure the container to compute the fit-to-width scale (from page 1).
  const measure = useCallback(() => {
    const el = scrollRef.current;
    const w1 = page1Width.current;
    if (el && w1) setFitScale(Math.max(0.2, (el.clientWidth - 32) / w1));
  }, []);

  const handlePageSize = useCallback((n, w) => {
    if (n === 1 && w && page1Width.current !== w) {
      page1Width.current = w;
      measure();
    }
  }, [measure]);

  useEffect(() => { measure(); }, [measure, numPages]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

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
      loadingTask = pdfjsLib.getDocument(localData ? { data: localData } : { url: signedPdfUrl });
      if (localData) setOfflineReading(true);
      loadingTask.onProgress = ({ loaded, total }) => {
        if (!dead && total > 0) setLoadPct(Math.round((loaded / total) * 100));
      };
      return loadingTask.promise;
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

  // Lock body scroll while the reader is open (the pages scroll inside).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Track the current page from scroll position.
  const updateCurrent = useCallback(() => {
    const el = scrollRef.current;
    if (!el || numPages === 0) return;
    const probe = el.scrollTop + el.clientHeight * 0.35;
    let cur = 1;
    for (let n = 1; n <= numPages; n++) {
      const top = pageTops.current[n];
      if (top == null) continue;
      if (top <= probe) cur = n; else break;
    }
    setCurrentPage((prev) => (prev === cur ? prev : cur));
  }, [numPages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      pokeBars();
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; updateCurrent(); });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateCurrent, pokeBars]);

  // Measure each page's offsetTop once laid out (and re-measure after zoom
  // changes, since page heights change with the scale).
  useEffect(() => {
    if (!pdf || numPages === 0) return;
    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const map = {};
      el.querySelectorAll("[data-page]").forEach((d) => {
        map[Number(d.dataset.page)] = d.offsetTop;
      });
      pageTops.current = map;
      measure();
      updateCurrent();
      // Jump to the saved progress once.
      if (!jumpedOnce.current && initialPercent > 2) {
        jumpedOnce.current = true;
        const target = Math.min(numPages, Math.max(1, Math.round((initialPercent / 100) * numPages)));
        const top = map[target];
        if (top != null) el.scrollTop = Math.max(0, top - 12);
      } else {
        jumpedOnce.current = true;
      }
    }, 350);
    return () => clearTimeout(t);
  }, [pdf, numPages, zoomIdx, measure, updateCurrent, initialPercent]);

  // Persist reading progress (debounced) · percent + current page.
  useEffect(() => {
    if (!numPages || !onProgress) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      onProgress(Math.min(99, Math.round((currentPage / numPages) * 100)), currentPage);
    }, 900);
    return () => { if (progressTimer.current) clearTimeout(progressTimer.current); };
  }, [currentPage, numPages, onProgress]);

  const goToPage = (n) => {
    const el = scrollRef.current;
    const top = pageTops.current[n];
    if (el && top != null) el.scrollTop = Math.max(0, top - 12);
    setCurrentPage(n);
    pokeBars();
  };

  /* zoom presets · absolute scales (fit = current fit-to-width step) */
  const setAbsZoom = (abs) => {
    const target = abs / (fitScale || 1);
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

  const near = (n) => Math.abs(n - currentPage) <= RENDER_AHEAD_BEHIND;

  return (
    <div className="fixed inset-0 z-[80] text-white flex flex-col transition-colors duration-500" dir="rtl" data-testid="pdf-reader" style={{ background: desk }}>
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-indigo-600/25 rounded-full blur-[110px]" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[110px]" />
      </div>

      {/* top bar */}
      <div
        className={`relative z-10 transition-all duration-300 ${barsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
      >
        <div className="bg-gradient-to-b from-black/70 to-transparent px-3 sm:px-5 pt-3 pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              data-testid="reader-close-btn"
              className="w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm sm:text-base truncate">{book?.title}</div>
              <div className="text-[11px] sm:text-xs text-slate-300/80 truncate">{book?.author}</div>
            </div>
            <div className="shrink-0 text-xs font-bold bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 tabular-nums">
              {numPages > 0 ? `${currentPage} / ${numPages}` : "…"}
            </div>
            {offlineReading && (
              <span data-testid="reader-offline-chip" className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 rounded-full px-2.5 py-1.5">
                <WifiOff className="w-3.5 h-3.5" /> محمّل
              </span>
            )}
            <div className="relative shrink-0">
              <button
                onClick={togglePageBookmark}
                data-testid="reader-bookmark-btn"
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition ${currentBookmarked ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20"}`}
                aria-label="إشارة مرجعية لهذه الصفحة"
                title={currentBookmarked ? "إزالة الإشارة من هذه الصفحة" : "ضع إشارة على هذه الصفحة"}
              >
                {currentBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </button>
              {pageBookmarks.length > 0 && (
                <button
                  onClick={() => { setShowBookmarks((s) => !s); pokeBars(); }}
                  data-testid="reader-bookmarks-list-btn"
                  className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-[10px] font-extrabold grid place-items-center border-2 border-[#0b1020]"
                  aria-label="كل الإشارات"
                >
                  {pageBookmarks.length}
                </button>
              )}
              {showBookmarks && (
                <div className="absolute top-12 left-0 w-60 max-h-72 overflow-y-auto rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-2" dir="rtl">
                  <div className="text-[11px] font-bold text-slate-400 px-2 py-1.5">إشاراتي في هذا الكتاب</div>
                  {pageBookmarks.map((bm) => (
                    <div key={bm.id} className="flex items-center gap-1 rounded-xl hover:bg-white/[0.07] px-2 py-1.5 group">
                      <button
                        onClick={() => { goToPage(bm.page); setShowBookmarks(false); }}
                        className="flex-1 text-right text-sm flex items-center gap-2"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className={bm.page === currentPage ? "font-bold text-amber-300" : ""}>صفحة {bm.page}</span>
                      </button>
                      <button
                        onClick={() => deletePageBookmark(bm)}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition"
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
              className="relative w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition"
              aria-label="ملاحظاتي"
              title="ملاحظاتي على الكتاب"
            >
              <NotebookText className="w-5 h-5" />
              {notesLoaded && notes.length > 0 && (
                <span className="absolute -bottom-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold grid place-items-center border-2 border-transparent">
                  {notes.length}
                </span>
              )}
            </button>
            <a
              href={signedPdfUrl}
              download
              className="w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md hidden sm:flex items-center justify-center transition"
              aria-label="تحميل"
              title="تحميل الكتاب"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={markComplete}
              disabled={markingDone}
              data-testid="reader-complete-btn"
              className="h-10 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">{markingDone ? "جارٍ الحفظ…" : "أكملت الكتاب"}</span>
              <span className="sm:hidden">تم</span>
            </button>
          </div>
          {/* progress hairline */}
          <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-teal-300 transition-all duration-500"
              style={{ width: `${numPages ? Math.round((currentPage / numPages) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* pages */}
      <div
        ref={scrollRef}
        onPointerDown={pokeBars}
        onTouchStart={pokeBars}
        className="relative z-[5] flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {error ? (
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="max-w-sm w-full text-center bg-slate-950/85 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="font-bold text-lg mt-4">تعذر فتح الكتاب</h3>
              <p className="text-sm text-slate-300/80 mt-2 leading-relaxed">
                حدثت مشكلة أثناء تحميل صفحات الكتاب. يمكنك المحاولة مجدداً أو فتحه في تبويب جديد.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="h-11 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm transition"
                >
                  إعادة المحاولة
                </button>
                <a
                  href={signedPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" /> فتح في تبويب جديد
                </a>
                <a
                  href={signedPdfUrl}
                  download
                  className="h-11 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" /> تحميل الكتاب
                </a>
              </div>
            </div>
          </div>
        ) : !pdf ? (
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="text-center rounded-3xl bg-slate-950/85 border border-white/10 px-10 py-8 shadow-2xl">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/40 to-emerald-500/40 blur-xl" />
                <div className="relative w-20 h-20 rounded-3xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <Loader2 className="w-9 h-9 text-indigo-300 animate-spin" />
                </div>
              </div>
              <h3 className="font-bold text-lg mt-5">جارٍ تجهيز الكتاب…</h3>
              <p className="text-sm text-slate-300/70 mt-1 tabular-nums">{loadPct}%</p>
              <div className="w-56 h-1.5 mx-auto mt-4 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-indigo-400 to-emerald-300 transition-all duration-300"
                  style={{ width: `${loadPct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 space-y-5 pb-32">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <PageView
                key={`${n}-${zoomIdx}`}
                pdf={pdf}
                pageNumber={n}
                scale={scale}
                active={near(n)}
                onSize={handlePageSize}
              />
            ))}
          </div>
        )}
      </div>

      {/* bottom control bar */}
      {pdf && !error && (
        <div
          className={`relative z-10 transition-all duration-300 ${barsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
        >
          <div className="bg-gradient-to-t from-black/70 to-transparent px-3 sm:px-5 pt-8 pb-4">
            <div className="max-w-2xl mx-auto bg-white/[0.08] border border-white/10 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 shadow-2xl">
              {/* zoom presets + reader themes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap mb-2.5" dir="rtl">
                <button
                  onClick={() => { setZoomIdx(2); pokeBars(); }}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition ${zoomIdx === 2 ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20 text-slate-200"}`}
                >
                  ملاءمة الشاشة
                </button>
                <button
                  onClick={() => setAbsZoom(1)}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition tabular-nums ${Math.abs(scale - 1) < 0.12 ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20 text-slate-200"}`}
                >
                  100%
                </button>
                <button
                  onClick={() => setAbsZoom(1.5)}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold transition tabular-nums ${Math.abs(scale - 1.5) < 0.12 ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20 text-slate-200"}`}
                >
                  150%
                </button>
                <span className="w-px h-5 bg-white/15 mx-1 hidden sm:block" aria-hidden="true" />
                {READER_THEMES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      data-testid={`reader-theme-${t.id}`}
                      onClick={() => { setThemeId(t.id); pokeBars(); }}
                      className={`h-8 pl-2.5 pr-2 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${themeId === t.id ? "bg-amber-400 text-slate-950" : "bg-white/10 hover:bg-white/20 text-slate-200"}`}
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
                onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition"
                aria-label="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                disabled={zoomIdx === ZOOM_STEPS.length - 1}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition"
                aria-label="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-300 tabular-nums w-11 text-center shrink-0">
                {Math.round(ZOOM_STEPS[zoomIdx] * 100)}%
              </span>
              <input
                type="range"
                min={1}
                max={Math.max(1, numPages)}
                value={currentPage}
                onChange={(e) => goToPage(Number(e.target.value))}
                data-testid="reader-page-slider"
                className="flex-1 accent-emerald-400 h-1.5 cursor-pointer"
                aria-label="الصفحة"
              />
              <button
                onClick={() => goToPage(1)}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                aria-label="العودة للأعلى"
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
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] flex flex-col rounded-t-[28px] bg-slate-900/97 border-t border-white/10 shadow-2xl">
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-white/[0.07]">
              <span className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 grid place-items-center shrink-0">
                <NotebookText className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-head font-extrabold text-sm">ملاحظاتي</div>
                <div className="text-[11px] text-slate-400">أنت الآن في الصفحة {currentPage}</div>
              </div>
              <button
                onClick={() => setShowNotes(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition shrink-0"
                aria-label="إغلاق الملاحظات"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {notesErr && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-200 text-xs font-semibold px-3 py-2.5">{notesErr}</div>
              )}
              {!notesLoaded ? (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل ملاحظاتك…
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="w-9 h-9 mx-auto text-slate-600" />
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">لا ملاحظات بعد · اكتب أول ملاحظة لك على الصفحة {currentPage} وستجدها هنا دائماً.</p>
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id || n._id} className="flex items-start gap-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-3.5 py-3 group">
                    <button
                      onClick={() => { if (n.page) { goToPage(n.page); setShowNotes(false); } }}
                      className="shrink-0 rounded-full bg-amber-400/15 text-amber-300 text-[11px] font-extrabold px-2.5 py-1 tabular-nums"
                      title="الانتقال إلى الصفحة"
                    >
                      ص {n.page}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap break-words">{n.text}</p>
                      {n.created_at && <div className="text-[10px] text-slate-500 mt-1 tabular-nums">{String(n.created_at).slice(0, 10)}</div>}
                    </div>
                    <button
                      onClick={() => deleteNote(n)}
                      className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition"
                      aria-label="حذف الملاحظة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-white/[0.07] bg-slate-900">
              <div className="flex items-end gap-2">
                <textarea
                  data-testid="note-text-input"
                  value={noteText}
                  onChange={(ev) => setNoteText(ev.target.value)}
                  rows={2}
                  placeholder={`أضف ملاحظة على الصفحة ${currentPage}…`}
                  className="flex-1 resize-none rounded-2xl bg-white/[0.06] border border-white/10 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20 outline-none px-3.5 py-2.5 text-sm placeholder:text-slate-500"
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
