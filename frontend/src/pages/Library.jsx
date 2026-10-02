import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Search, Upload, BookOpen, Eye, Clock, Heart, ListMusic, Plus, Trash2, X, Library as LibraryIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import BookmarkButton from "@/components/BookmarkButton";
import BookCover from "@/components/BookCover";

const SORTS = [{ v: "recent", l: "الأحدث" }, { v: "popular", l: "الأكثر قراءة" }, { v: "rating", l: "الأعلى تقييماً" }, { v: "title", l: "أبجدي" }];
const PLAYLIST_COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

export function BookCard({ b, i = 0, catName }) {
  return (
    <Link to={`/books/${b.id}`} data-testid={`book-card-${b.id}`} className="group block animate-fade-up" style={{ animationDelay: `${(i % 10) * 45}ms` }}>
      <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white ft-shadow hover-lift group-hover:ring-1 ft-ring-accent">
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200">
          <BookCover book={b} className="w-full h-full" imgClassName="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent transition-opacity duration-300 group-hover:from-slate-950/70" />
          {b.status && b.status !== "approved" && <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">{b.status === "pending" ? "قيد المراجعة" : "مرفوض"}</span>}
          <BookmarkButton kind="book" refId={b.id} title={b.title} className="absolute left-2 top-2 z-10 shadow" />
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-slate-950/55 px-2 py-1 text-[11px] font-bold text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{b.rating_avg || "·"}</span>
          {catName && <span className="absolute bottom-2 right-2 z-10 max-w-[55%] truncate rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-slate-700 shadow ring-1 ring-white/60 backdrop-blur-sm">{catName}</span>}
          {typeof b.progress === "number" && b.progress > 0 && (
            <>
              <span className={`absolute right-2 z-10 rounded-full bg-slate-950/55 px-2 py-0.5 text-[10px] font-bold ft-text-accent-bright ring-1 ring-white/25 backdrop-blur-sm ${catName ? "bottom-9" : "bottom-3"}`}>{b.progress}%</span>
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30">
                <div className="h-full ft-grad-bar" style={{ width: `${b.progress}%` }} />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-3.5">
          <h3 className="font-head font-bold leading-snug text-slate-800 line-clamp-2 transition-colors group-hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]">{b.title}</h3>
          <p className="mt-1 text-xs text-slate-400 line-clamp-1">{b.author}</p>
          <div className="mt-auto flex items-center gap-2 pt-3 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-semibold text-slate-500 ring-1 ring-slate-100"><Eye className="h-3.5 w-3.5" />{b.views || 0}</span>
            <span className="mr-auto inline-flex translate-x-1 items-center gap-1 font-bold ft-text-accent opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">اقرأ الآن <BookOpen className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* "Because you read" strip · renders only when recommendations exist. */
function RecommendedStrip() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/books/recommended")
      .then((r) => setItems(r.data?.items || r.data?.books || (Array.isArray(r.data) ? r.data : [])))
      .catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <section className="mb-6 animate-fade-up">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl ft-icon-tile text-white shadow-md"><Sparkles className="h-4 w-4" /></span>
        <h3 className="font-head text-base font-extrabold text-slate-900">لأنك قرأت</h3>
        <span className="rounded-full ft-bg-soft px-2.5 py-1 text-[10px] font-bold ft-text-accent ring-1 ft-ring-accent">مقترحة لك شخصياً</span>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 10).map((b) => (
          <Link key={b.id} to={`/books/${b.id}`} className="group w-28 shrink-0 snap-start sm:w-32">
            <div className="overflow-hidden rounded-2xl ft-shadow ring-1 ring-slate-100 transition-transform duration-300 group-hover:-translate-y-1">
              <BookCover book={b} className="aspect-[3/4] w-full" imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
            </div>
            <div className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-slate-800 transition-colors group-hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]">{b.title}</div>
            {b.author && <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{b.author}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Library() {
  const { user } = useAuth();
  const [tab, setTab] = useState(() => (new URLSearchParams(window.location.search).get("tab") === "personal" ? "personal" : "browse"));
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [featured, setFeatured] = useState(null);

  useEffect(() => { api.get("/books/categories").then((r) => setCats(r.data)); }, []);
  useEffect(() => { api.get("/books/featured").then((r) => setFeatured(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setData(null);
    const { data } = await api.get("/books", { params: { category: cat || undefined, q: q || undefined, sort, page, limit: 15 } });
    setData(data);
  }, [cat, q, sort, page]);

  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { setPage(1); }, [cat, sort]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <Layout>
      <div className="ft-navy-gradient grain relative overflow-hidden text-white">
        <LibraryIcon className="pointer-events-none absolute -bottom-24 -left-12 h-80 w-80 rotate-12 text-white/[0.05] sm:h-96 sm:w-96" />
        <BookOpen className="animate-float pointer-events-none absolute -top-10 right-[38%] hidden h-28 w-28 -rotate-12 text-white/[0.04] lg:block" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-1/3 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
                <LibraryIcon className="h-3.5 w-3.5" /> مكتبة النادي
              </span>
              <h1 className="mt-4 font-head text-4xl font-extrabold leading-[1.15] sm:text-5xl lg:text-6xl">المكتبة <span className="animate-gradient-text ft-text-gradient">الرقمية</span></h1>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-300 sm:text-lg">اقرأ في العلوم والثقافة والأدب والبرمجة والفلسفة وأكثر.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {data && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur"><BookOpen className="h-4 w-4 ft-text-accent-bright" /> {data.total} كتاب متاح</span>}
                {cats.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur"><LibraryIcon className="h-4 w-4 ft-text-accent-bright" /> {cats.length} تصنيف</span>}
                {featured && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur"><Star className="h-4 w-4 fill-amber-300 text-amber-300" /> كتاب مميز هذا الأسبوع</span>}
              </div>
            </div>
            {user && <Button data-testid="upload-book-btn" asChild className="pressable h-12 rounded-full ft-btn-primary px-6 font-bold text-white shadow-lg ring-1 ring-white/20"><Link to="/upload-book"><Upload className="w-4 h-4 ml-1" /> أضف كتاباً</Link></Button>}
          </div>

          <div className="relative mt-8 max-w-xl rounded-[1.4rem] bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur transition-shadow focus-within:ring-2 ft-ring-accent">
            <Search className="absolute right-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input data-testid="library-search" value={q} onChange={(e) => { setQ(e.target.value); setTab("browse"); }} placeholder="ابحث بالعنوان أو المؤلف…" className="h-[52px] rounded-[1.1rem] border-0 bg-white/95 pr-11 text-slate-800 shadow-inner placeholder:text-slate-400 focus-visible:ring-2 ft-ring-accent" />
          </div>

          {user && (
            <div className="relative mt-6 grid w-full max-w-sm grid-cols-2 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
              <span aria-hidden className="absolute inset-y-1 rounded-full bg-white shadow-md transition-all duration-300 ease-out" style={{ insetInlineStart: tab === "browse" ? "4px" : "50%", width: "calc(50% - 4px)" }} />
              <button data-testid="tab-browse" onClick={() => setTab("browse")}
                className={`pressable relative z-10 min-h-[44px] w-full whitespace-nowrap rounded-full px-4 py-2 text-center text-sm font-bold transition-colors sm:px-5 ${tab === "browse" ? "text-slate-900" : "text-white hover:text-white/90"}`}>
                <BookOpen className="w-4 h-4 inline ml-1" /> تصفح المكتبة
              </button>
              <button data-testid="tab-personal" onClick={() => setTab("personal")}
                className={`pressable relative z-10 min-h-[44px] w-full whitespace-nowrap rounded-full px-4 py-2 text-center text-sm font-bold transition-colors sm:px-5 ${tab === "personal" ? "text-slate-900" : "text-white hover:text-white/90"}`}>
                <LibraryIcon className="w-4 h-4 inline ml-1" /> مكتبتي الشخصية
              </button>
            </div>
          )}
        </div>
      </div>

      {featured && tab === "browse" && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:mt-8 sm:px-6 lg:px-8">
          <Link to={`/books/${featured.id}`} className="group relative block overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 p-6 text-white ft-shadow-lg transition-transform duration-300 hover:scale-[1.005] sm:rounded-[2rem] sm:p-8">
            <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-yellow-200/25 blur-3xl" />
            <Star className="pointer-events-none absolute -bottom-8 left-6 h-36 w-36 rotate-12 text-white/10" />
            <span className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur ring-1 ring-white/25 sm:left-6 sm:top-6">⭐ كتاب الأسبوع</span>
            <div className="relative flex flex-col items-start gap-5 pt-8 sm:flex-row sm:items-center sm:gap-7 sm:pt-6">
              <div className="shrink-0 -rotate-3 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-[1.03]">
                <BookCover book={featured} className="w-24 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/25 sm:w-32" />
              </div>
              <div className="min-w-0">
                <div className="font-head text-2xl font-extrabold leading-snug sm:text-3xl lg:text-4xl">{featured.title}</div>
                <div className="mt-1.5 text-sm text-white/85 sm:text-base">{featured.author}</div>
                <div className="mt-2 line-clamp-3 max-w-xl text-xs leading-relaxed text-white/75 sm:line-clamp-2 sm:text-sm">{featured.description}</div>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-extrabold text-orange-700 shadow-lg transition-all group-hover:gap-2.5">ابدأ القراءة الآن <BookOpen className="w-4 h-4" /></span>
                  {featured.rating_avg ? <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-2 text-xs font-bold ring-1 ring-white/25 backdrop-blur"><Star className="h-4 w-4 fill-amber-300 text-amber-300" /> {featured.rating_avg}</span> : null}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {tab === "personal" && user ? (
        <PersonalLibrary />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="sticky top-3 z-30 mb-6 rounded-[1.6rem] border border-slate-100 bg-white/90 px-4 py-4 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:top-4 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 font-head text-lg font-extrabold text-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl ft-icon-tile shadow-md"><BookOpen className="h-5 w-5" /></span>
                تصفح الكتب
              </h2>
              {data && <span className="rounded-full ft-bg-soft px-3 py-1.5 text-[11px] font-bold ft-text-accent ring-1 ft-ring-accent">{data.total} كتاب</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="-mx-1 flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button onClick={() => setCat("")} data-testid="cat-all" className={`pressable min-h-[42px] shrink-0 snap-start rounded-full px-4 text-sm font-bold transition-all ${!cat ? "ft-btn-primary text-white shadow-md" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-200"}`}>الكل</button>
                {cats.map((c) => (
                  <button key={c.slug} onClick={() => setCat(c.slug)} data-testid={`cat-${c.slug}`} className={`pressable min-h-[42px] shrink-0 snap-start whitespace-nowrap rounded-full px-4 text-sm font-bold transition-all ${cat === c.slug ? "text-white shadow-md" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-200"}`} style={cat === c.slug ? { background: c.color } : {}}>{c.name}</button>
                ))}
              </div>
              <select data-testid="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 shrink-0 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:[border-color:color-mix(in_srgb,var(--ft-accent)_32%,white)] focus:ring-2 ft-ring-accent">
                {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>

          <RecommendedStrip />

          {!data ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white ft-shadow"><Skeleton className="aspect-[3/4] rounded-none" /><div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /><Skeleton className="mt-3 h-6 w-16 rounded-full" /></div></div>)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد كتب" desc="جرّب تغيير التصنيف أو كلمات البحث" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">{data.items.map((b, i) => <BookCard key={b.id} b={b} i={i} catName={cats.find((c) => c.slug === b.category)?.name} />)}</div>
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white p-1.5 ft-shadow">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="pressable h-11 rounded-full border-0 bg-slate-50 px-5 hover:bg-slate-100 disabled:opacity-40">السابق</Button>
                    <span className="min-w-14 px-2 text-center text-sm font-bold text-slate-600">{page} / {totalPages}</span>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="pressable h-11 rounded-full border-0 ft-btn-solid px-5 text-white disabled:opacity-40">التالي</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}

/* ---------------- Personal library: shelves + playlists ---------------- */

function PersonalLibrary() {
  const [reading, setReading] = useState(null);
  const [later, setLater] = useState(null);
  const [favs, setFavs] = useState(null);
  const [playlists, setPlaylists] = useState(null);
  const [openList, setOpenList] = useState(null); // playlist object
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PLAYLIST_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    const [r, l, f, p] = await Promise.all([
      api.get("/books/me/reading"), api.get("/books/me/later"),
      api.get("/books/me/favorites"), api.get("/library/playlists"),
    ]);
    setReading(r.data); setLater(l.data); setFavs(f.data); setPlaylists(p.data);
  }, []);

  useEffect(() => { loadAll().catch(() => {}); }, [loadAll]);

  const createPlaylist = async () => {
    const n = newName.trim();
    if (!n) return toast.error("اكتب اسم القائمة");
    setCreating(true);
    try {
      const { data } = await api.post("/library/playlists", { name: n, color: newColor });
      setPlaylists((ps) => [data, ...(ps || [])]);
      setNewName("");
      toast.success("أُنشئت القائمة 🎵");
    } catch (e) { toast.error(apiErr(e)); } finally { setCreating(false); }
  };

  const deletePlaylist = async (p) => {
    if (!window.confirm(`حذف قائمة «${p.name}»؟`)) return;
    try {
      await api.delete(`/library/playlists/${p.id}`);
      setPlaylists((ps) => ps.filter((x) => x.id !== p.id));
      if (openList?.id === p.id) setOpenList(null);
      toast.success("حُذفت القائمة");
    } catch (e) { toast.error(apiErr(e)); }
  };

  const removeFromList = async (bookId) => {
    try {
      const { data } = await api.delete(`/library/playlists/${openList.id}/books/${bookId}`);
      setOpenList(data);
      setPlaylists((ps) => ps.map((x) => (x.id === data.id ? data : x)));
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (openList) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => setOpenList(null)} className="pressable mb-5 flex min-h-[44px] items-center gap-1 rounded-full py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800">→ كل قوائمي</button>
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[1.8rem] border border-slate-100 p-5 ft-shadow sm:p-6" style={{ background: `linear-gradient(135deg, ${openList.color}26, #ffffff 58%)` }}>
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.3rem] text-white shadow-lg ring-4 ring-white/60" style={{ background: `linear-gradient(135deg, ${openList.color}, ${openList.color}cc)` }}>
            <ListMusic className="h-8 w-8" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-head text-2xl font-extrabold text-slate-900 sm:text-3xl">{openList.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{openList.count} كتاب في هذه القائمة</p>
          </div>
          <Button variant="outline" onClick={() => deletePlaylist(openList)} className="pressable h-11 rounded-full border-rose-200 px-5 text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 ml-1" /> حذف القائمة
          </Button>
        </div>
        {(openList.books || []).length === 0 ? (
          <EmptyState icon={ListMusic} title="القائمة فارغة" desc="افتح أي كتاب واضغط «أضف إلى قائمة» لإضافته هنا" />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">
            {openList.books.map((b, i) => (
              <div key={b.id} className="group relative">
                <BookCard b={b} i={i} />
                <button onClick={() => removeFromList(b.id)} aria-label="إزالة من القائمة"
                  className="pressable absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-rose-600 focus-visible:opacity-100 group-hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <Shelf title="متابعة القراءة" icon={<BookOpen className="w-5 h-5 text-blue-600" />} books={reading} empty="لم تبدأ أي كتاب بعد · تصفح المكتبة وابدأ القراءة" />
      <Shelf title="أكمل لاحقاً" icon={<Clock className="w-5 h-5 text-amber-500" />} books={later} empty="لا كتب محفوظة للإكمال لاحقاً · من صفحة أي كتاب اضغط «أكمل لاحقاً»" testid="later-shelf" />
      <Shelf title="المفضلة" icon={<Heart className="w-5 h-5 text-rose-500" />} books={favs} empty="لا كتب مفضلة بعد" />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 font-head text-xl font-extrabold text-slate-900">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50 to-fuchsia-50 ft-shadow"><ListMusic className="h-5 w-5 text-violet-600" /></span>
            قوائمي
          </h2>
          {playlists && <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">{playlists.length} قائمة</span>}
        </div>

        <div className="mb-5 rounded-[1.6rem] border border-slate-100 bg-white p-4 ft-shadow sm:p-5">
          <div className="flex flex-wrap gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم قائمة جديدة… مثل: كتب الصيف ☀️" className="h-12 min-w-[200px] flex-1 rounded-full bg-slate-50 px-4 ft-ring-accent" />
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-100">
              {PLAYLIST_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} aria-label="لون القائمة"
                  className={`pressable h-7 w-7 rounded-full transition-transform ${newColor === c ? "scale-110 ring-2 ring-slate-400 ring-offset-2" : "hover:scale-110"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <Button onClick={createPlaylist} disabled={creating} className="pressable h-12 rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 px-6 font-bold shadow-md shadow-violet-600/25 hover:from-violet-700 hover:to-fuchsia-700">
              <Plus className="w-4 h-4 ml-1" /> إنشاء قائمة
            </Button>
          </div>
        </div>

        {!playlists ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-[1.5rem]" />)}</div>
        ) : playlists.length === 0 ? (
          <EmptyState icon={ListMusic} title="لا قوائم بعد" desc="أنشئ قائمتك الأولى واجمع فيها كتبك المفضلة مثل قوائم سبوتيفاي" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p, i) => (
              <button key={p.id} onClick={() => setOpenList(p)} className="group pressable animate-fade-up overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white text-right ft-shadow hover-lift hover:ring-1 hover:ring-violet-200/70" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}99)` }} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-inner transition-transform duration-300 group-hover:scale-105" style={{ background: `${p.color}1f`, color: p.color }}>
                      <ListMusic className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-head text-base font-bold text-slate-800">{p.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{p.count} كتاب</div>
                    </div>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4" style={{ background: p.color, "--tw-ring-color": `${p.color}22` }} />
                  </div>
                  {(p.books || []).length > 0 && (
                    <div className="mt-5 flex items-end px-1 pb-1" dir="ltr">
                      {p.books.slice(0, 4).map((b, bi) => (
                        <div key={b.id} className="relative aspect-[3/4] w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 shadow-md ring-2 ring-white transition-transform duration-300"
                          style={{ transform: `rotate(${(bi - 1.5) * 5}deg)`, marginLeft: bi === 0 ? 0 : -10, zIndex: 4 - bi }}>
                          <BookCover book={b} className="h-full w-full" imgClassName="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Shelf({ title, icon, books, empty, testid }) {
  return (
    <section data-testid={testid} className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-head text-xl font-extrabold text-slate-900">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 ft-shadow">{icon}</span>
          {title}
        </h2>
        {books && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200/70">{books.length} كتاب</span>}
      </div>
      {!books ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white ft-shadow"><Skeleton className="aspect-[3/4] rounded-none" /><div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /><Skeleton className="mt-3 h-6 w-16 rounded-full" /></div></div>)}</div>
      ) : books.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-8 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white ft-shadow ring-1 ring-slate-100">{icon}</span>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400">{empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">{books.map((b, i) => <BookCard key={b.id} b={b} i={i} />)}</div>
      )}
    </section>
  );
}
