import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import { Users, Search, School, Sparkles, Crown, MessageCircle, Eye, Loader2 } from "lucide-react";

function Avatar({ m, rank }) {
  if (m?.avatar_url) {
    return <img src={m.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow" />;
  }
  return (
    <span className={`w-16 h-16 rounded-2xl grid place-items-center text-white font-head text-2xl font-black shadow ${rank === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-600" : rank === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" : rank === 2 ? "bg-gradient-to-br from-amber-600 to-orange-800" : "ft-navy-gradient"}`}>
      {m?.name?.[0] || "؟"}
    </span>
  );
}

export default function Members() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (qq, ss) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qq) params.set("q", qq);
      if (ss) params.set("school", ss);
      params.set("limit", "60");
      const { data } = await api.get(`/users/directory?${params.toString()}`);
      setItems(data.items || []);
      setErr("");
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load("", ""); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q.trim(), school.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, school]);

  return (
    <Layout>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pb-16">
        {/* hero */}
        <section className="relative overflow-hidden rounded-[28px] ft-hero-gradient text-white px-6 py-8 lg:px-10 lg:py-10 mt-2">
          <Users className="absolute -left-6 -bottom-10 w-52 h-52 text-white/10 rotate-12 pointer-events-none" />
          <div className="relative">
            <div className="ft-grad-bar w-16 mb-4" />
            <h1 className="font-head text-3xl lg:text-5xl font-black flex items-center gap-3">
              <span className="ft-icon-tile bg-white/15 text-white"><Users className="w-6 h-6" /></span>
              أعضاء النادي
            </h1>
            <p className="mt-3 text-white/85 max-w-2xl leading-relaxed">
              تعرّف على مفكري المستقبل من كل المدارس · افتح ملف أي عضو، تابع إنجازاته، أو راسله مباشرة.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 max-w-2xl">
              <label className="flex items-center gap-2 bg-white/95 text-slate-800 rounded-2xl px-4 py-3 flex-1 shadow">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم…" className="bg-transparent outline-none w-full text-sm font-semibold placeholder:text-slate-400" />
              </label>
              <label className="flex items-center gap-2 bg-white/95 text-slate-800 rounded-2xl px-4 py-3 sm:w-64 shadow">
                <School className="w-5 h-5 text-slate-400 shrink-0" />
                <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="المدرسة…" className="bg-transparent outline-none w-full text-sm font-semibold placeholder:text-slate-400" />
              </label>
            </div>
          </div>
        </section>

        {items === null && !err && <PageLoader />}
        {err && <ErrorState message={err} onRetry={() => load(q.trim(), school.trim())} />}
        {items && items.length === 0 && (
          <EmptyState icon={Users} title="لا أعضاء مطابقون" text="جرّب اسماً أو مدرسة أخرى." />
        )}

        {items && items.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m, i) => (
              <article key={m.id} className="group relative bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 ft-grad-bar opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar m={m} rank={i} />
                    {i < 3 && <span className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 rounded-full p-1 shadow"><Crown className="w-3.5 h-3.5" /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-head font-extrabold text-slate-900 truncate">{m.name}</h3>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="ft-chip">{m.role === "teacher" ? "معلم" : "طالب"}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5"><Sparkles className="w-3 h-3" /> مستوى {m.level || 1}</span>
                    </div>
                    {m.school_name && <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1 truncate"><School className="w-3.5 h-3.5 shrink-0" />{m.school_name}</p>}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 py-2">
                    <div className="font-head font-black text-slate-900">{Number(m.xp || 0).toLocaleString("ar-JO")}</div>
                    <div className="text-[10px] text-slate-500 font-bold">نقطة خبرة</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 py-2">
                    <div className="font-head font-black text-slate-900">{m.chess_rating || 1200}</div>
                    <div className="text-[10px] text-slate-500 font-bold">تصنيف الشطرنج</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/profile/${m.id}`} className="pressable flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl ft-btn-primary text-sm font-extrabold">
                    <Eye className="w-4 h-4" /> الملف
                  </Link>
                  {user && user.id !== m.id && (
                    <Link to={`/messages?to=${m.id}`} aria-label="مراسلة" className="pressable inline-flex items-center justify-center min-h-[44px] w-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {loading && items && (
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-sm font-bold">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحديث…
          </div>
        )}

        {!user && items && items.length > 0 && (
          <p className="mt-8 text-center text-sm text-slate-500">
            <Link to="/login" className="ft-text-accent font-extrabold">سجّل الدخول</Link> لمراسلة الأعضاء ومتابعتهم.
          </p>
        )}
      </div>
    </Layout>
  );
}
