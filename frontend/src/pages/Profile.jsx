import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Trophy, Flame, BookOpen, Crown, MessageSquare, School, MapPin, Award, Sparkles, Medal, Download, UserPlus, UserCheck, Users, PenLine, Rocket, X, FileText } from "lucide-react";
import { FadeUp } from "@/components/anim";

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [skillBadges, setSkillBadges] = useState([]);
  const [certs, setCerts] = useState([]);
  const [listModal, setListModal] = useState(null); // "followers" | "following"
  const [listItems, setListItems] = useState([]);
  const isMine = user?.id === id;

  const load = () => {
    api.get(`/users/${id}/profile`).then((r) => setP(r.data));
    api.get(`/badges/user/${id}`).then((r) => setSkillBadges(r.data)).catch(() => {});
    api.get(`/certificates/user/${id}`).then((r) => setCerts(r.data)).catch(() => setCerts([]));
  };
  useEffect(() => { setP(null); load(); }, [id]);
  if (!p) return <Layout><PageLoader /></Layout>;

  const downloadCert = async (certId) => {
    try {
      const { data } = await api.get(`/certificates/${certId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `certificate-${certId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const toggleFollow = async () => {
    try {
      const { data } = await api.post(`/users/${id}/follow`);
      setP((prev) => ({ ...prev, is_following: data.following, followers_count: data.followers_count }));
      toast.success(data.following ? `أنت تتابع ${p.name} الآن 🤝` : "ألغيت المتابعة");
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر تنفيذ الإجراء"); }
  };

  const openList = async (kind) => {
    setListModal(kind); setListItems([]);
    try {
      const { data } = await api.get(`/users/${id}/${kind}`);
      setListItems(data.items || []);
    } catch {}
  };

  const stats = [
    { icon: Trophy, label: "الترتيب الوطني", value: `#${p.national_rank}`, color: "#D97706" },
    { icon: Sparkles, label: "نقاط الخبرة", value: p.xp.toLocaleString("en-US"), color: "#2563EB" },
    { icon: BookOpen, label: "كتب مقروءة", value: p.stats?.books_read || 0, color: "#059669" },
    { icon: FileText, label: "صفحات مقروءة", value: (p.stats?.pages_read || 0).toLocaleString("en-US"), color: "#4F46E5" },
    { icon: Crown, label: "تصنيف الشطرنج", value: p.chess_rating, color: "#0A192F" },
    { icon: Flame, label: "سلسلة الأيام", value: p.streak, color: "#EA580C" },
  ];

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-float" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative shrink-0">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/20" />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-white/15 grid place-items-center text-4xl font-extrabold ring-4 ring-white/10">{p.name?.[0]}</div>
              )}
              <span className="absolute -bottom-2 right-1/2 translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold whitespace-nowrap shadow">مستوى {p.level}</span>
            </div>
            <div className="flex-1 min-w-[220px]">
              <h1 className="font-head text-3xl font-extrabold">{p.name}</h1>
              {p.title_badge && <div className="mt-1 text-amber-300 text-sm font-bold">✦ {p.title_badge}</div>}
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">{p.level_title}</div>
              <div className="mt-2 text-slate-300 text-sm flex items-center gap-4 flex-wrap">
                {p.school_name && <span className="flex items-center gap-1"><School className="w-4 h-4" />{p.school_name}</span>}
                {p.governorate_name && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{p.governorate_name}</span>}
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <button onClick={() => openList("followers")} className="hover:text-emerald-300 transition-colors"><b className="font-head">{p.followers_count || 0}</b> متابِع</button>
                <button onClick={() => openList("following")} className="hover:text-emerald-300 transition-colors"><b className="font-head">{p.following_count || 0}</b> يتابَع</button>
                {!isMine && user && (
                  <button onClick={toggleFollow} className={`pressable inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${p.is_following ? "bg-white/15 text-white" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}>
                    {p.is_following ? <><UserCheck className="w-4 h-4" /> تتابعه</> : <><UserPlus className="w-4 h-4" /> متابعة</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {p.bio && <p className="text-slate-600 mb-6 bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">{p.bio}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${s.color}15`, color: s.color }}><s.icon className="w-5 h-5" /></div>
              <div className="text-2xl font-extrabold font-head text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {(p.works || []).length > 0 && (
          <FadeUp>
            <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><PenLine className="w-5 h-5 text-violet-600" /> الأعمال المنشورة</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {p.works.map((w) => (
                <Link key={w.id} to={`/studio/${w.id}`} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 ft-shadow hover-lift">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 grid place-items-center shrink-0"><PenLine className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{w.title}</div>
                    <div className="text-xs text-slate-400">{w.likes || 0} إعجاب{w.rating_avg ? ` · ⭐ ${w.rating_avg}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          </FadeUp>
        )}

        {(p.ventures || []).length > 0 && (
          <FadeUp>
            <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><Rocket className="w-5 h-5 text-rose-600" /> المشاريع</h2>
            <div className="flex flex-wrap gap-2 mb-8">
              {p.ventures.map((v) => (
                <Link key={v.id} to={`/ventures/${v.id}`} className="px-3.5 py-2 rounded-full bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors">{v.title}</Link>
              ))}
            </div>
          </FadeUp>
        )}

        <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><Medal className="w-5 h-5 text-amber-600" /> شارات المهارات ({skillBadges.length})</h2>
        {skillBadges.length === 0 ? <p className="text-slate-400 text-sm mb-8">لا شارات مهارات بعد — تُمنح من المشرفين للتميز في الخطابة والكتابة والقيادة وغيرها</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {skillBadges.map((b) => {
              const Icon = Icons[b.icon] || Icons.Medal;
              return (
                <div key={b.key} className="flex items-center gap-3 bg-gradient-to-l from-amber-50 to-white rounded-2xl p-4 border border-amber-100 ft-shadow">
                  <div className="w-12 h-12 rounded-2xl text-white grid place-items-center shrink-0" style={{ background: b.color }}><Icon className="w-6 h-6" /></div>
                  <div><div className="font-bold text-slate-800 text-sm">{b.name}</div><div className="text-xs text-slate-400">{b.criteria || b.description}</div></div>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-emerald-600" /> الشهادات ({certs.length})</h2>
        {certs.length === 0 ? (
          <p className="text-slate-400 text-sm mb-8">لا شهادات بعد — تُمنح من لوحة الإدارة للتميز والمشاركة 🏅</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {certs.map((c) => (
              <div key={c.id} className="flex items-center gap-3 bg-gradient-to-l from-emerald-50 to-white rounded-2xl p-4 border border-emerald-100 ft-shadow">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white grid place-items-center shrink-0"><Award className="w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{c.title_line}</div>
                  <div className="text-xs text-slate-400">{c.subtitle ? `${c.subtitle} · ` : ""}{String(c.created_at || "").slice(0, 10)}</div>
                </div>
                {isMine && (
                  <button onClick={() => downloadCert(c.id)} className="pressable shrink-0 w-9 h-9 rounded-xl bg-emerald-600 text-white grid place-items-center" aria-label="تحميل الشهادة PDF">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-emerald-600" /> الإنجازات ({p.achievements.length})</h2>
        {p.achievements.length === 0 ? <p className="text-slate-400 text-sm">لا إنجازات بعد</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.achievements.map((a) => {
              const Icon = Icons[a.icon] || Icons.Award;
              return (
                <div key={a.key} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 ft-shadow">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center"><Icon className="w-5 h-5" /></div>
                  <div><div className="font-semibold text-slate-800 text-sm">{a.title}</div><div className="text-xs text-slate-400">{a.badge}</div></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {listModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setListModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-head font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />{listModal === "followers" ? "المتابِعون" : "يتابَعهم"}</h3>
              <button onClick={() => setListModal(null)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {listItems.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">لا أحد هنا بعد</p> : listItems.map((u) => (
                <Link key={u.id} to={`/profile/${u.id}`} onClick={() => setListModal(null)} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-bold">{u.name?.[0]}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-400">المستوى {u.level} · {u.xp} XP</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
