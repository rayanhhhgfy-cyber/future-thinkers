import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import { useBookmarks } from "@/components/BookmarkButton";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bookmark, BookOpen, Sparkles, Rocket, Calendar, Trophy, Newspaper,
  Users, Trash2, ArrowLeft, BookmarkCheck, Compass, Layers,
} from "lucide-react";
import { timeAgo } from "@/components/NotificationsPanel";

/* kind → label, icon, gradient tile, target route */
const KIND_META = {
  book: { label: "الكتب", icon: BookOpen, grad: "from-blue-500 to-indigo-600", soft: "bg-blue-50 text-blue-600 ring-blue-100", to: (r) => `/books/${r}` },
  venture: { label: "المشاريع", icon: Rocket, grad: "from-orange-500 to-rose-500", soft: "bg-orange-50 text-orange-600 ring-orange-100", to: (r) => `/ventures/${r}` },
  work: { label: "أعمال الاستوديو", icon: Sparkles, grad: "from-violet-500 to-fuchsia-600", soft: "bg-violet-50 text-violet-600 ring-violet-100", to: (r) => `/studio/${r}` },
  event: { label: "الفعاليات", icon: Calendar, grad: "from-emerald-500 to-teal-600", soft: "bg-emerald-50 text-emerald-600 ring-emerald-100", to: (r) => `/events/${r}` },
  competition: { label: "المسابقات", icon: Trophy, grad: "from-amber-500 to-orange-600", soft: "bg-amber-50 text-amber-600 ring-amber-100", to: (r) => `/competitions/${r}` },
  news: { label: "الأخبار", icon: Newspaper, grad: "from-sky-500 to-cyan-600", soft: "bg-sky-50 text-sky-600 ring-sky-100", to: () => "/news" },
  club: { label: "الأندية", icon: Users, grad: "from-teal-500 to-emerald-600", soft: "bg-teal-50 text-teal-600 ring-teal-100", to: (r) => `/clubs/${r}` },
};
const KIND_ORDER = ["book", "venture", "work", "event", "competition", "news", "club"];
const FALLBACK_META = { label: "محفوظات", icon: Bookmark, grad: "from-slate-500 to-slate-700", soft: "bg-slate-50 text-slate-600 ring-slate-100", to: () => "#" };

export default function Saved() {
  const { user } = useAuth();
  const { map, removeById, loaded } = useBookmarks();
  const [removing, setRemoving] = useState(null);

  const groups = useMemo(() => {
    const by = new Map();
    (map ? [...map.values()] : []).forEach((b) => {
      if (!b || !b.kind) return;
      if (!by.has(b.kind)) by.set(b.kind, []);
      by.get(b.kind).push(b);
    });
    by.forEach((arr) => arr.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))));
    return KIND_ORDER.filter((k) => by.has(k)).map((k) => ({ kind: k, items: by.get(k) }));
  }, [map]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

  const remove = async (b) => {
    setRemoving(b.id);
    await removeById(b.id, `${b.kind}:${b.ref_id}`);
    setRemoving(null);
  };

  return (
    <Layout>
      {/* hero */}
      <div className="ft-navy-gradient grain relative overflow-hidden text-white">
        <BookmarkCheck className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rotate-12 text-white/[0.05] sm:h-96 sm:w-96" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:max-w-[1200px]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
              <Bookmark className="h-3.5 w-3.5" /> عناصر محفوظة لوقت لاحق
            </span>
            <h1 className="mt-4 font-head text-4xl font-extrabold leading-[1.15] sm:text-5xl">
              محفوظتي <span className="animate-gradient-text ft-hero-gradient-text">الخاصة</span>
            </h1>
            <p className="mt-3 max-w-xl leading-relaxed text-slate-300 sm:text-lg">
              كل الكتب والمشاريع والأعمال التي حفظتها من أنحاء النادي، في مكان واحد مرتب وجاهز للعودة إليه.
            </p>
            {loaded && total > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 animate-fade-up d-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur">
                  <BookmarkCheck className="h-4 w-4 ft-text-accent-bright" /> {total} عنصر محفوظ
                </span>
                {groups.map((g) => {
                  const M = KIND_META[g.kind] || FALLBACK_META;
                  const Icon = M.icon;
                  return (
                    <span key={g.kind} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur">
                      <Icon className="h-4 w-4 ft-text-accent-bright" /> {M.label} · {g.items.length}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:max-w-[1200px]">
        {!loaded ? (
          <div className="space-y-10">
            {[0, 1].map((s) => (
              <div key={s}>
                <Skeleton className="mb-4 h-8 w-40 rounded-full" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[1.4rem]" />)}
                </div>
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="لا عناصر محفوظة بعد"
            desc="تصفح المكتبة والمشاريع والاستوديو واضغط أيقونة الحفظ 📌 لتجد كل ما يعجبك هنا مرتباً وجاهزاً"
            action={
              <Link to="/library" className="pressable inline-flex min-h-[44px] items-center gap-2 rounded-full ft-btn-primary px-6 text-sm font-bold text-white shadow-md">
                <Compass className="h-4 w-4" /> ابدأ الاستكشاف
              </Link>
            }
          />
        ) : (
          <div className="space-y-12">
            {groups.map((g, gi) => {
              const M = KIND_META[g.kind] || FALLBACK_META;
              const Icon = M.icon;
              return (
                <section key={g.kind} className="animate-fade-up" style={{ animationDelay: `${gi * 70}ms` }} data-testid={`saved-group-${g.kind}`}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${M.grad} text-white shadow-lg`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-head text-xl font-extrabold leading-tight text-slate-900">{M.label}</h2>
                      <p className="text-[11px] font-bold text-slate-400">{g.items.length} عنصر</p>
                    </div>
                    <span className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((b, i) => (
                      <div
                        key={b.id}
                        className="group relative flex animate-fade-up items-stretch overflow-hidden rounded-[1.4rem] border border-slate-100 bg-white ft-shadow transition-all duration-300 hover:-translate-y-0.5 hover:ring-1 ft-ring-accent"
                        style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                      >
                        <Link to={M.to(b.ref_id)} className="flex min-w-0 flex-1 items-center gap-3.5 p-4" data-testid={`saved-item-${b.id}`}>
                          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ${M.soft}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-head text-[15px] font-bold leading-snug text-slate-800 transition-colors group-hover:[color:color-mix(in_srgb,var(--ft-accent)_66%,black)]">
                              {b.title || "عنصر محفوظ"}
                            </span>
                            <span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                              <span className={`rounded-full px-2 py-0.5 ring-1 ${M.soft}`}>{M.label}</span>
                              {b.created_at && <span>حُفظ {timeAgo(b.created_at)}</span>}
                            </span>
                          </span>
                          <ArrowLeft className="h-4 w-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:-translate-x-1 group-hover:[color:var(--ft-accent)]" />
                        </Link>
                        <button
                          onClick={() => remove(b)}
                          disabled={removing === b.id}
                          aria-label="إزالة من المحفوظات"
                          data-testid={`saved-remove-${b.id}`}
                          className="pressable grid w-11 shrink-0 place-items-center border-r border-slate-100 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            <div className="flex items-center justify-center gap-2 pt-2 text-center text-xs font-semibold text-slate-400">
              <Layers className="h-4 w-4" />
              {user ? "تُزامَن محفوظاتك مع حسابك وتظهر أينما سجلت دخولك" : ""}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
