import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Search, Upload, BookOpen, Eye, Clock, Heart, ListMusic, Plus, Trash2, X, Library as LibraryIcon } from "lucide-react";
import { toast } from "sonner";
import BookmarkButton from "@/components/BookmarkButton";
import BookCover from "@/components/BookCover";

const SORTS = [{ v: "recent", l: "الأحدث" }, { v: "popular", l: "الأكثر قراءة" }, { v: "rating", l: "الأعلى تقييماً" }, { v: "title", l: "أبجدي" }];
const PLAYLIST_COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

export function BookCard({ b, i = 0 }) {
  return (
    <Link to={`/books/${b.id}`} data-testid={`book-card-${b.id}`} className="group block animate-fade-up" style={{ animationDelay: `${(i % 10) * 45}ms` }}>
      <article className="h-full overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white ft-shadow hover-lift">
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          <BookCover book={b} className="w-full h-full" imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {b.status && b.status !== "approved" && <span className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">{b.status === "pending" ? "قيد المراجعة" : "مرفوض"}</span>}
          <BookmarkButton kind="book" refId={b.id} title={b.title} className="absolute top-2 left-2 shadow" />
          {typeof b.progress === "number" && b.progress > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30">
              <div className="h-full bg-gradient-to-l from-emerald-400 to-teal-300" style={{ width: `${b.progress}%` }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-head font-bold text-slate-800 line-clamp-1 transition-colors group-hover:text-emerald-700">{b.title}</h3>
          <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{b.author}</p>
          <div className="mt-2.5 flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700 ring-1 ring-amber-100"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{b.rating_avg || "·"}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-semibold text-slate-500 ring-1 ring-slate-100"><Eye className="w-3.5 h-3.5" />{b.views || 0}</span>
          </div>
        </div>
      </article>
    </Link>
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
        <LibraryIcon className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rotate-12 text-white/[0.05]" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
                <LibraryIcon className="h-3.5 w-3.5" /> مكتبة النادي
              </span>
              <h1 className="mt-4 font-head text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem]">المكتبة الرقمية</h1>
              <p className="mt-2 leading-relaxed text-slate-300">اقرأ في العلوم والثقافة والأدب والبرمجة والفلسفة وأكثر.</p>
            </div>
            {user && <Button data-testid="upload-book-btn" asChild className="pressable h-11 rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 px-5 font-bold text-white shadow-lg shadow-emerald-950/20 hover:from-emerald-600 hover:to-teal-600"><Link to="/upload-book"><Upload className="w-4 h-4 ml-1" /> أضف كتاباً</Link></Button>}
          </div>

          <div className="relative mt-7 max-w-xl rounded-[1.35rem] bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur">
            <Search className="absolute right-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input data-testid="library-search" value={q} onChange={(e) => { setQ(e.target.value); setTab("browse"); }} placeholder="ابحث بالعنوان أو المؤلف…" className="h-12 rounded-[1.05rem] border-0 bg-white/95 pr-11 text-slate-800 shadow-inner placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-300" />
          </div>

          {user && (
            <div className="mt-6 inline-flex max-w-full flex-wrap gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
              <button data-testid="tab-browse" onClick={() => setTab("browse")}
                className={`pressable rounded-full px-4 py-2 text-sm font-bold transition-all ${tab === "browse" ? "bg-white text-slate-900 shadow" : "text-white hover:bg-white/15"}`}>
                <BookOpen className="w-4 h-4 inline ml-1" /> تصفح المكتبة
              </button>
              <button data-testid="tab-personal" onClick={() => setTab("personal")}
                className={`pressable rounded-full px-4 py-2 text-sm font-bold transition-all ${tab === "personal" ? "bg-white text-slate-900 shadow" : "text-white hover:bg-white/15"}`}>
                <LibraryIcon className="w-4 h-4 inline ml-1" /> مكتبتي الشخصية
              </button>
            </div>
          )}
        </div>
      </div>

      {featured && tab === "browse" && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to={`/books/${featured.id}`} className="group relative block overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 p-5 text-white ft-shadow transition-transform hover:scale-[1.005] sm:p-7">
            <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-yellow-200/25 blur-3xl" />
            <Star className="pointer-events-none absolute -bottom-8 left-6 h-36 w-36 rotate-12 text-white/10" />
            <span className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold backdrop-blur ring-1 ring-white/25 sm:left-6 sm:top-6">⭐ كتاب الأسبوع</span>
            <div className="relative flex items-center gap-4 sm:gap-6">
              <div className="shrink-0 -rotate-2 transition-transform duration-300 group-hover:rotate-0">
                <BookCover book={featured} className="w-20 shrink-0 overflow-hidden rounded-xl shadow-2xl ring-4 ring-white/25 sm:w-24" />
              </div>
              <div className="min-w-0 pt-5 sm:pt-6">
                <div className="truncate font-head text-xl font-extrabold sm:text-2xl lg:text-3xl">{featured.title}</div>
                <div className="mt-1 text-sm text-white/85">{featured.author}</div>
                <div className="mt-1.5 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/70 sm:text-sm">{featured.description}</div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-orange-700 shadow-lg transition-all group-hover:gap-2.5">ابدأ القراءة الآن <BookOpen className="w-4 h-4" /></span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {tab === "personal" && user ? (
        <PersonalLibrary />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-[1.4rem] border border-slate-100 bg-white/85 px-4 py-4 ft-shadow backdrop-blur sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-head text-lg font-extrabold text-slate-900">تصفح الكتب</h2>
              {data && <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">{data.total} كتاب</span>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCat("")} data-testid="cat-all" className={`pressable rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${!cat ? "bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-200"}`}>الكل</button>
                {cats.map((c) => (
                  <button key={c.slug} onClick={() => setCat(c.slug)} data-testid={`cat-${c.slug}`} className={`pressable rounded-full px-3.5 py-1.5 text-sm font-bold transition-all ${cat === c.slug ? "text-white shadow-md" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-200"}`} style={cat === c.slug ? { background: c.color } : {}}>{c.name}</button>
                ))}
              </div>
              <select data-testid="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>

          {!data ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white p-0 ft-shadow"><Skeleton className="aspect-[3/4] rounded-none" /><div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /></div></div>)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد كتب" desc="جرّب تغيير التصنيف أو كلمات البحث" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">{data.items.map((b, i) => <BookCard key={b.id} b={b} i={i} />)}</div>
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white p-1.5 ft-shadow">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="pressable rounded-full border-0 bg-slate-50 hover:bg-slate-100 disabled:opacity-40">السابق</Button>
                    <span className="min-w-14 px-2 text-center text-sm font-bold text-slate-600">{page} / {totalPages}</span>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="pressable rounded-full border-0 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">التالي</Button>
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
        <button onClick={() => setOpenList(null)} className="pressable mb-5 flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-800">→ كل قوائمي</button>
        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[1.6rem] border border-slate-100 p-5 ft-shadow" style={{ background: `linear-gradient(135deg, ${openList.color}18, #ffffff 62%)` }}>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: openList.color }}>
            <ListMusic className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-head text-2xl font-extrabold text-slate-900">{openList.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{openList.count} كتاب في هذه القائمة</p>
          </div>
          <Button variant="outline" onClick={() => deletePlaylist(openList)} className="pressable rounded-full border-rose-200 text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 ml-1" /> حذف القائمة
          </Button>
        </div>
        {(openList.books || []).length === 0 ? (
          <EmptyState icon={ListMusic} title="القائمة فارغة" desc="افتح أي كتاب واضغط «أضف إلى قائمة» لإضافته هنا" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {openList.books.map((b, i) => (
              <div key={b.id} className="group relative">
                <BookCard b={b} i={i} />
                <button onClick={() => removeFromList(b.id)} aria-label="إزالة من القائمة"
                  className="pressable absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100">
                  <X className="h-3.5 w-3.5" />
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
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-100 bg-violet-50 ft-shadow"><ListMusic className="h-5 w-5 text-violet-600" /></span>
            قوائمي
          </h2>
          {playlists && <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">{playlists.length} قائمة</span>}
        </div>

        <div className="mb-5 rounded-[1.4rem] border border-slate-100 bg-white p-4 ft-shadow">
          <div className="flex flex-wrap gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم قائمة جديدة… مثل: كتب الصيف ☀️" className="min-w-[200px] flex-1 rounded-full bg-slate-50 px-4 focus-visible:ring-emerald-200" />
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 ring-1 ring-slate-100">
              {PLAYLIST_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} aria-label="لون القائمة"
                  className={`pressable h-6 w-6 rounded-full transition-transform ${newColor === c ? "scale-110 ring-2 ring-slate-400 ring-offset-2" : "hover:scale-110"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <Button onClick={createPlaylist} disabled={creating} className="pressable rounded-full bg-gradient-to-l from-violet-600 to-fuchsia-600 font-bold shadow-md shadow-violet-600/20 hover:from-violet-700 hover:to-fuchsia-700">
              <Plus className="w-4 h-4 ml-1" /> إنشاء قائمة
            </Button>
          </div>
        </div>

        {!playlists ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-[1.4rem]" />)}</div>
        ) : playlists.length === 0 ? (
          <EmptyState icon={ListMusic} title="لا قوائم بعد" desc="أنشئ قائمتك الأولى واجمع فيها كتبك المفضلة مثل قوائم سبوتيفاي" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p, i) => (
              <button key={p.id} onClick={() => setOpenList(p)} className="pressable animate-fade-up overflow-hidden rounded-[1.4rem] border border-slate-100 bg-white text-right ft-shadow hover-lift" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}99)` }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-inner" style={{ background: `${p.color}1f`, color: p.color }}>
                      <ListMusic className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-head font-bold text-slate-800">{p.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{p.count} كتاب</div>
                    </div>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4" style={{ background: p.color, "--tw-ring-color": `${p.color}22` }} />
                  </div>
                  {(p.books || []).length > 0 && (
                    <div className="mt-4 flex items-end gap-1.5">
                      {p.books.slice(0, 4).map((b, bi) => (
                        <div key={b.id} className="aspect-[3/4] w-10 overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-100 transition-transform group-hover:-translate-y-0.5" style={{ transform: `rotate(${(bi - 1.5) * 2}deg)` }}>
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
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-100 bg-white ft-shadow">{icon}</span>
          {title}
        </h2>
        {books && <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200/70">{books.length} كتاب</span>}
      </div>
      {!books ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white ft-shadow"><Skeleton className="aspect-[3/4] rounded-none" /><div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /></div></div>)}</div>
      ) : books.length === 0 ? (
        <p className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-7 text-center text-sm leading-relaxed text-slate-400">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">{books.map((b, i) => <BookCard key={b.id} b={b} i={i} />)}</div>
      )}
    </section>
  );
}
