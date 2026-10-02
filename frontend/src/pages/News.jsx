import React, { useEffect, useState } from "react";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, User, CalendarDays } from "lucide-react";

export default function News() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/news").then((r) => setData(r.data)); }, []);
  const featured = data?.items?.[0];
  const rest = data?.items?.slice(1) || [];

  return (
    <Layout>
      <div className="ft-hero-gradient grain relative overflow-hidden text-white">
        <Newspaper className="pointer-events-none absolute -bottom-14 -left-10 h-72 w-72 rotate-12 text-white/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
            <Newspaper className="h-6 w-6" />
          </div>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">الأخبار</h1>
          <p className="text-emerald-50/80 mt-3 max-w-2xl leading-relaxed sm:text-lg">أخبار المنصة والفعاليات وإنجازات الطلاب والمدارس والأندية.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {!data ? (
          <div className="space-y-5">
            <Skeleton className="h-80 rounded-[1.4rem] sm:rounded-3xl lg:h-96" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-[1.4rem] sm:rounded-3xl" />)}</div>
          </div>
        )
          : data.items.length === 0 ? <EmptyState icon={Newspaper} title="لا أخبار بعد" desc="تابعنا لآخر المستجدات" />
          : (
            <>
              {featured && (
                <article className="group mb-5 grid overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow hover-lift animate-fade-up lg:grid-cols-2 xl:mb-6">
                  <div className="relative min-h-60 overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 sm:min-h-72 lg:min-h-full">
                    {featured.cover_url && <img src={fileUrl(featured.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                    <Newspaper className="absolute -bottom-8 left-4 h-36 w-36 rotate-12 text-white/15" />
                    <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700 shadow backdrop-blur">{featured.category}</span>
                  </div>
                  <div className="flex flex-col p-5 sm:p-8 lg:p-10">
                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{featured.category}</span>
                    <h3 className="font-head font-extrabold text-2xl leading-snug text-slate-900 mt-4 line-clamp-3 sm:text-3xl">{featured.title}</h3>
                    <p className="text-sm leading-loose text-slate-500 line-clamp-4 mt-3 sm:text-base">{featured.body}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 text-xs font-medium text-slate-400 sm:text-sm">
                      <span className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-blue-600"><User className="h-4 w-4" /></span>
                        {featured.author_name}
                      </span>
                      {(featured.date || featured.created_at) && (
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-600" />{featured.date || String(featured.created_at).slice(0, 10)}</span>
                      )}
                    </div>
                  </div>
                </article>
              )}
              {rest.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                  {rest.map((n, i) => (
                    <article key={n.id} className={`group flex h-full flex-col overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow hover-lift animate-fade-up d-${((i + 1) % 6) + 1}`}>
                      <div className="relative h-44 shrink-0 overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 sm:h-48">
                        {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
                        <Newspaper className="absolute -bottom-7 left-3 h-28 w-28 rotate-12 text-white/15" />
                        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-blue-700 shadow backdrop-blur">{n.category}</span>
                      </div>
                      <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{n.category}</span>
                        <h3 className="font-head font-bold text-lg leading-snug text-slate-900 mt-3 line-clamp-2">{n.title}</h3>
                        <p className="text-sm leading-relaxed text-slate-500 line-clamp-3 mt-2">{n.body}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-5 text-xs font-medium text-slate-400">
                          <span className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-600"><User className="h-3.5 w-3.5" /></span>
                            {n.author_name}
                          </span>
                          {(n.date || n.created_at) && (
                            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-blue-600" />{n.date || String(n.created_at).slice(0, 10)}</span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
      </div>
    </Layout>
  );
}
