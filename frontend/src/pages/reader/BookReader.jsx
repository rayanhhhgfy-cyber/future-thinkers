import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Download, ZoomIn, ZoomOut, Check, Loader2,
  AlertTriangle, ExternalLink, ChevronUp, BookOpen,
  Bookmark, BookmarkCheck, Trash2,
} from "lucide-react";
import api from "@/lib/api";

// pdf.js is loaded on demand from CDN (never bundled, never pushed through
// the repo) — the reader chunk stays small and the main bundle is untouched.
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

  const scrollRef = useRef(null);
  const pageTops = useRef({});
  const page1Width = useRef(0);
  const hideTimer = useRef(null);
  const jumpedOnce = useRef(false);
  const progressTimer = useRef(null);
  const pdfRef = useRef(null);

  const scale = fitScale * ZOOM_STEPS[zoomIdx];

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
  useEffect(() => {
    let dead = false;
    let loadingTask = null;
    let doc = null;
    setError(null); setLoadPct(0); setPdf(null);
    loadPdfjs().then((pdfjsLib) => {
      if (dead) return;
      loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
      loadingTask.onProgress = ({ loaded, total }) => {
        if (!dead && total > 0) setLoadPct(Math.round((loaded / total) * 100));
      };
      return loadingTask.promise;
    }).then((loadedDoc) => {
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
  }, [pdfUrl]);

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

  // Persist reading progress (debounced) — percent + current page.
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
    <div className="fixed inset-0 z-[80] bg-[#0b1020] text-white flex flex-col" dir="rtl" data-testid="pdf-reader">
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
            <a
              href={pdfUrl}
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
            <div className="max-w-sm w-full text-center bg-white/[0.06] border border-white/10 rounded-3xl p-8 backdrop-blur-md">
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
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" /> فتح في تبويب جديد
                </a>
                <a
                  href={pdfUrl}
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
            <div className="text-center">
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
            <div className="max-w-2xl mx-auto bg-white/[0.08] border border-white/10 backdrop-blur-xl rounded-2xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 shadow-2xl">
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
      )}
    </div>
  );
}
