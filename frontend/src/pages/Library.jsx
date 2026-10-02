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

export function BookCard({ b }) {
  return (
    <Link to={`/books/${b.id}`} data-testid={`book-card-${b.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden ft-shadow bg-slate-100">
        <BookCover book={b} className="w-full h-full" imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {b.status && b.status !== "approved" && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px]">{b.status === "pending" ? "قيد المراجعة" : "مرفوض"}</span>}
        <BookmarkButton kind="book" refId={b.id} title={b.title} className="absolute top-2 left-2 shadow" />
        {typeof b.progress === "number" && b.progress > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30">
            <div className="h-full bg-emerald-400" style={{ width: `${b.progress}%` }} />
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{b.title}</h3>
        <p className="text-xs text-slate-400 line-clamp-1">{b.author}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{b.rating_avg || "—"}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{b.views || 0}</span>
        </div>
      </div>
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
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-head text-3xl lg:text-4xl font-extrabold">المكتبة الرقمية</h1>
              <p className="text-slate-300 mt-2">اقرأ في العلوم والثقافة والأدب والبرمجة والفلسفة وأكثر.</p>
            </div>
            {user && <Button data-testid="upload-book-btn" asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Link to="/upload-book"><Upload className="w-4 h-4 ml-1" /> أضف كتاباً</Link></Button>}
          </div>
          <div className="mt-6 relative max-w-xl">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input data-testid="library-search" value={q} onChange={(e) => { setQ(e.target.value); setTab("browse"); }} placeholder="ابحث بالعنوان أو المؤلف…" className="pr-11 h-12 rounded-xl bg-white/95 text-slate-800 border-0" />
          </div>
          {user && (
            <div className="mt-6 flex gap-2">
              <button data-testid="tab-browse" onClick={() => setTab("browse")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === "browse" ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"}`}>
                <BookOpen className="w-4 h-4 inline ml-1" /> تصفح المكتبة
              </button>
              <button data-testid="tab-personal" onClick={() => setTab("personal")}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === "personal" ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"}`}>
                <LibraryIcon className="w-4 h-4 inline ml-1" /> مكتبتي الشخصية
              </button>
            </div>
          )}
        </div>
      </div>

      {featured && tab === "browse" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Link to={`/books/${featured.id}`} className="group relative overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 p-5 sm:p-6 flex items-center gap-4 sm:gap-6 text-white ft-shadow block hover:scale-[1.005] transition-transform">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-[11px] font-extrabold shrink-0 absolute top-4 left-4">⭐ كتاب الأسبوع</span>
            <BookCover book={featured} className="w-20 sm:w-24 shrink-0 rounded-xl shadow-2xl" />
            <div className="min-w-0">
              <div className="font-head font-extrabold text-xl sm:text-2xl truncate">{featured.title}</div>
              <div className="text-white/85 text-sm mt-1">{featured.author}</div>
              <div className="text-white/70 text-xs mt-1.5 line-clamp-2 max-w-xl">{featured.description}</div>
              <span className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-white text-orange-700 text-xs font-extrabold group-hover:gap-2.5 transition-all">ابدأ القراءة الآن <BookOpen className="w-4 h-4" /></span>
            </div>
          </Link>
        </div>
      )}

      {tab === "personal" && user ? (
        <PersonalLibrary />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCat("")} data-testid="cat-all" className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${!cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>الكل</button>
              {cats.map((c) => (
                <button key={c.slug} onClick={() => setCat(c.slug)} data-testid={`cat-${c.slug}`} className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${cat === c.slug ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={cat === c.slug ? { background: c.color } : {}}>{c.name}</button>
              ))}
            </div>
            <select data-testid="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>

          {!data ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{Array.from({ length: 10 }).map((_, i) => <div key={i}><Skeleton className="aspect-[3/4] rounded-2xl" /><Skeleton className="h-4 w-3/4 mt-2" /></div>)}</div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={BookOpen} title="لا توجد كتب" desc="جرّب تغيير التصنيف أو كلمات البحث" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{data.items.map((b) => <BookCard key={b.id} b={b} />)}</div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">السابق</Button>
                  <span className="px-4 py-2 text-sm text-slate-500">{page} / {totalPages}</span>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">التالي</Button>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => setOpenList(null)} className="text-sm text-slate-500 hover:text-slate-800 mb-5 flex items-center gap-1">→ كل قوائمي</button>
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <span className="w-14 h-14 rounded-2xl grid place-items-center" style={{ background: `${openList.color}1f`, color: openList.color }}>
            <ListMusic className="w-7 h-7" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-head text-2xl font-extrabold text-slate-900 truncate">{openList.name}</h2>
            <p className="text-sm text-slate-400">{openList.count} كتاب في هذه القائمة</p>
          </div>
          <Button variant="outline" onClick={() => deletePlaylist(openList)} className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 ml-1" /> حذف القائمة
          </Button>
        </div>
        {(openList.books || []).length === 0 ? (
          <EmptyState icon={ListMusic} title="القائمة فارغة" desc="افتح أي كتاب واضغط «أضف إلى قائمة» لإضافته هنا" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {openList.books.map((b) => (
              <div key={b.id} className="relative group">
                <BookCard b={b} />
                <button onClick={() => removeFromList(b.id)} aria-label="إزالة من القائمة"
                  className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 transition hover:bg-rose-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Shelf title="متابعة القراءة" icon={<BookOpen className="w-5 h-5 text-blue-600" />} books={reading} empty="لم تبدأ أي كتاب بعد — تصفح المكتبة وابدأ القراءة" />
      <Shelf title="أكمل لاحقاً" icon={<Clock className="w-5 h-5 text-amber-500" />} books={later} empty="لا كتب محفوظة للإكمال لاحقاً — من صفحة أي كتاب اضغط «أكمل لاحقاً»" testid="later-shelf" />
      <Shelf title="المفضلة" icon={<Heart className="w-5 h-5 text-rose-500" />} books={favs} empty="لا كتب مفضلة بعد" />

      <section>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-head font-bold text-xl flex items-center gap-2"><ListMusic className="w-5 h-5 text-violet-600" /> قوائمي</h2>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
          <div className="flex gap-2 flex-wrap">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم قائمة جديدة… مثل: كتب الصيف ☀️" className="flex-1 min-w-[200px] rounded-xl bg-white" />
            <div className="flex items-center gap-1.5">
              {PLAYLIST_COLORS.map((c) => (
                <button key={c} onClick={() => setNewColor(c)} aria-label="لون القائمة"
                  className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-110"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <Button onClick={createPlaylist} disabled={creating} className="rounded-xl bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4 ml-1" /> إنشاء قائمة
            </Button>
          </div>
        </div>
        {!playlists ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>
        ) : playlists.length === 0 ? (
          <EmptyState icon={ListMusic} title="لا قوائم بعد" desc="أنشئ قائمتك الأولى واجمع فيها كتبك المفضلة مثل قوائم سبوتيفاي" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((p) => (
              <button key={p.id} onClick={() => setOpenList(p)} className="text-right rounded-3xl border border-slate-200 bg-white p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0" style={{ background: `${p.color}1f`, color: p.color }}>
                    <ListMusic className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-bold text-slate-800 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.count} كتاب</div>
                  </div>
                </div>
                {(p.books || []).length > 0 && (
                  <div className="flex gap-1.5 mt-3">
                    {p.books.slice(0, 4).map((b) => (
                      <div key={b.id} className="w-10 aspect-[3/4] rounded-md overflow-hidden bg-slate-100">
                        <BookCover book={b} className="w-full h-full" imgClassName="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
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
    <section data-testid={testid}>
      <h2 className="font-head font-bold text-xl flex items-center gap-2 mb-4">{icon} {title}</h2>
      {!books ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{[1, 2, 3, 4, 5].map((i) => <div key={i}><Skeleton className="aspect-[3/4] rounded-2xl" /><Skeleton className="h-4 w-3/4 mt-2" /></div>)}</div>
      ) : books.length === 0 ? (
        <p className="text-sm text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{books.map((b) => <BookCard key={b.id} b={b} />)}</div>
      )}
    </section>
  );
}
