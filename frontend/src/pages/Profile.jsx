import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Trophy, Flame, BookOpen, Crown, School, MapPin, Award, Sparkles, Medal, Download, UserPlus, UserCheck, Users, PenLine, Rocket, X, FileText, LayoutGrid, BadgeCheck, Swords, Copy, ShieldCheck, Share2 } from "lucide-react";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { coverCls, FRAME_RING } from "@/lib/cosmetics";
import { ActivityHeatmap } from "@/components/dashboard/widgets";

const TABS = [
  { k: "works", l: "الأعمال والمشاريع", icon: LayoutGrid },
  { k: "honors", l: "الشارات والشهادات", icon: BadgeCheck },
  { k: "achievements", l: "الإنجازات", icon: Trophy },
];

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [skillBadges, setSkillBadges] = useState([]);
  const [certs, setCerts] = useState([]);
  const [tab, setTab] = useState("works");
  const [listModal, setListModal] = useState(null);
  const [listItems, setListItems] = useState([]);
  const isMine = user?.id === id;

  useEffect(() => {
    setP(null);
    api.get(`/users/${id}/profile`).then((r) => setP(r.data));
    api.get(`/badges/user/${id}`).then((r) => setSkillBadges(r.data)).catch(() => {});
    api.get(`/certificates/user/${id}`).then((r) => setCerts(r.data)).catch(() => setCerts([]));
  }, [id]);
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

  const copyCertCode = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success("نُسخ رمز التحقق ✓"); }
    catch { toast.error("تعذّر النسخ · انسخ الرمز يدوياً"); }
  };

  const shareCertImage = (c) => {
    try {
      const W = 1280, H = 900;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const x = cv.getContext("2d");
      x.direction = "rtl";
      x.textAlign = "center";
      x.textBaseline = "middle";
      // ivory background
      const wash = x.createLinearGradient(0, 0, 0, H);
      wash.addColorStop(0, "#FFFEF9"); wash.addColorStop(1, "#FCF3DC");
      x.fillStyle = wash; x.fillRect(0, 0, W, H);
      // gold double frame
      const gold = x.createLinearGradient(0, 0, W, H);
      gold.addColorStop(0, "#FBBF24"); gold.addColorStop(0.5, "#D97706"); gold.addColorStop(1, "#F59E0B");
      x.strokeStyle = gold; x.lineWidth = 10; x.strokeRect(22, 22, W - 44, H - 44);
      x.lineWidth = 2; x.strokeRect(46, 46, W - 92, H - 92);
      // dark header band with org name
      x.fillStyle = "#0A192F"; x.fillRect(46, 46, W - 92, 118);
      x.fillStyle = "#FBBF24"; x.fillRect(46, 158, W - 92, 6);
      x.fillStyle = "#FFFFFF";
      x.font = "800 46px 'Segoe UI', Tahoma, Arial, sans-serif";
      x.fillText("منصة مفكري المستقبل", W / 2, 106);
      // certificate title
      x.fillStyle = "#B45309";
      x.font = "800 54px 'Segoe UI', Tahoma, Arial, sans-serif";
      x.fillText("شهادة تقدير", W / 2, 248);
      // recipient name (big)
      x.fillStyle = "#0F172A";
      x.font = "800 68px 'Segoe UI', Tahoma, Arial, sans-serif";
      x.fillText(p.name || "", W / 2, 348);
      // achievement line + subtitle
      x.fillStyle = "#334155";
      x.font = "700 34px 'Segoe UI', Tahoma, Arial, sans-serif";
      x.fillText(c.title_line || "", W / 2, 428);
      if (c.subtitle) {
        x.fillStyle = "#64748B";
        x.font = "400 26px 'Segoe UI', Tahoma, Arial, sans-serif";
        x.fillText(c.subtitle, W / 2, 478);
      }
      // ornament divider
      x.strokeStyle = "#D97706"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(W / 2 - 190, 528); x.lineTo(W / 2 - 26, 528); x.stroke();
      x.beginPath(); x.moveTo(W / 2 + 26, 528); x.lineTo(W / 2 + 190, 528); x.stroke();
      x.save(); x.translate(W / 2, 528); x.rotate(Math.PI / 4);
      x.fillStyle = "#F59E0B"; x.fillRect(-9, -9, 18, 18); x.restore();
      // seal: gold circle with star
      const sx = W / 2, sy = 648, sr = 66;
      const sealGrad = x.createRadialGradient(sx - 18, sy - 18, 8, sx, sy, sr);
      sealGrad.addColorStop(0, "#FDE68A"); sealGrad.addColorStop(0.55, "#F59E0B"); sealGrad.addColorStop(1, "#B45309");
      x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.fillStyle = sealGrad; x.fill();
      x.lineWidth = 4; x.strokeStyle = "#FFFBEB"; x.stroke();
      x.beginPath(); x.arc(sx, sy, sr - 12, 0, Math.PI * 2); x.lineWidth = 2; x.strokeStyle = "rgba(120,53,15,0.55)"; x.stroke();
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 30 : 13;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = sx + r * Math.cos(a), py = sy + r * Math.sin(a);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath(); x.fillStyle = "#FFFBEB"; x.fill();
      // date + verify code
      x.fillStyle = "#475569";
      x.font = "700 24px 'Segoe UI', Tahoma, Arial, sans-serif";
      const dateStr = String(c.created_at || "").slice(0, 10);
      x.fillText(dateStr ? `تاريخ المنح: ${dateStr}` : "", W / 2, 762);
      if (c.code) {
        x.fillStyle = "#92400E";
        x.font = "700 24px 'Courier New', monospace";
        x.fillText(`رمز التحقق: ${c.code}`, W / 2, 806);
      }
      cv.toBlob((blob) => {
        if (!blob) { toast.error("تعذّر إنشاء الصورة"); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `cert-${c.code || c.id}.png`; a.click();
        URL.revokeObjectURL(url);
        toast.success("تم إنشاء صورة الشهادة · بدأ التنزيل 🖼");
      }, "image/png");
    } catch { toast.error("تعذّر إنشاء الصورة"); }
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
    { icon: Swords, label: "انتصارات الشطرنج", value: p.stats?.chess_wins || 0, color: "#B45309" },
    { icon: Flame, label: "سلسلة الأيام", value: p.streak, color: "#EA580C" },
  ];
  const frameCls = FRAME_RING[p.frame] || "ring-white/25";

  return (
    <Layout>
      {/* cover hero */}
      <div className={`relative overflow-hidden bg-gradient-to-l ${coverCls(p.cover_theme)} text-white`}>
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-28 -right-16 w-72 h-72 bg-black/20 rounded-full blur-3xl" />
        <div className="max-w-5xl lg:max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-10 pb-20 sm:pb-24 lg:pt-14 lg:pb-32 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 lg:gap-7">
            <div className="relative shrink-0 self-start">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className={`w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-[28px] lg:rounded-[36px] object-cover ring-4 ${frameCls}`} />
              ) : (
                <div className={`w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-[28px] lg:rounded-[36px] bg-white/15 backdrop-blur grid place-items-center text-5xl lg:text-6xl font-extrabold ring-4 ${frameCls}`}>{p.name?.[0]}</div>
              )}
              <span className="absolute -bottom-2.5 right-1/2 translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black whitespace-nowrap shadow-lg">⭐ مستوى {p.level}</span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">{p.name}</h1>
              {p.title_badge && <div className="mt-1 lg:mt-2 text-amber-300 font-bold text-sm lg:text-base">✦ {p.title_badge}</div>}
              <div className="mt-2 lg:mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 lg:px-3.5 lg:py-1.5 rounded-full bg-white/15 backdrop-blur text-sm font-semibold"><Sparkles className="w-3.5 h-3.5" />{p.level_title}</span>
                {p.school_name && <span className="inline-flex items-center gap-1 px-3 py-1 lg:px-3.5 lg:py-1.5 rounded-full bg-white/10 text-xs lg:text-[13px]"><School className="w-3.5 h-3.5" />{p.school_name}</span>}
                {p.governorate_name && <span className="inline-flex items-center gap-1 px-3 py-1 lg:px-3.5 lg:py-1.5 rounded-full bg-white/10 text-xs lg:text-[13px]"><MapPin className="w-3.5 h-3.5" />{p.governorate_name}</span>}
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0 pb-1">
              <div className="flex items-center gap-4 text-sm bg-white/10 backdrop-blur rounded-2xl px-4 py-2.5">
                <button onClick={() => openList("followers")} className="text-center ft-hover-text-bright transition-colors min-h-[44px] min-w-[52px]">
                  <div className="font-head font-extrabold text-base lg:text-lg leading-none">{p.followers_count || 0}</div>
                  <div className="text-[10px] text-white/70 mt-1">متابِع</div>
                </button>
                <span className="w-px h-8 bg-white/20" />
                <button onClick={() => openList("following")} className="text-center ft-hover-text-bright transition-colors min-h-[44px] min-w-[52px]">
                  <div className="font-head font-extrabold text-base lg:text-lg leading-none">{p.following_count || 0}</div>
                  <div className="text-[10px] text-white/70 mt-1">يُتابَع</div>
                </button>
              </div>
              {!isMine && user && (
                <button onClick={toggleFollow} className={`pressable inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-full text-sm font-extrabold shadow-lg ${p.is_following ? "bg-white/20 text-white backdrop-blur" : "ft-btn-solid"}`}>
                  {p.is_following ? <><UserCheck className="w-4 h-4" /> تتابعه</> : <><UserPlus className="w-4 h-4" /> متابعة</>}
                </button>
              )}
              {isMine && (
                <Link to="/settings" className="pressable inline-flex items-center px-5 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur text-sm font-bold hover:bg-white/25">تعديل ملفي</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl lg:max-w-6xl xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start">
        {/* desktop sticky profile rail · الستاتس والنبذة · hidden identity head keeps mobile DOM order untouched */}
        <div className="lg:col-start-1 lg:row-start-1 lg:sticky lg:top-24 lg:self-start min-w-0">
          {/* rail identity card · desktop only */}
          <div className="hidden lg:block relative z-10 -mt-16 xl:-mt-20 mb-5 bg-white rounded-[28px] border border-slate-100 ft-shadow-lg p-6 text-center">
            <div className="relative inline-block">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={p.name} className={`w-24 h-24 rounded-[26px] object-cover ring-4 ${frameCls}`} />
              ) : (
                <div className={`w-24 h-24 rounded-[26px] bg-slate-100 grid place-items-center text-4xl font-extrabold text-slate-700 ring-4 ${frameCls}`}>{p.name?.[0]}</div>
              )}
              <span className="absolute -bottom-2.5 right-1/2 translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black whitespace-nowrap shadow-lg">⭐ مستوى {p.level}</span>
            </div>
            <h2 className="font-head text-xl font-black text-slate-900 mt-5 leading-snug">{p.name}</h2>
            <div className="mt-1.5 text-sm font-bold ft-text-accent">{p.level_title}</div>
            {p.title_badge && <div className="mt-1 text-amber-600 font-bold text-xs">✦ {p.title_badge}</div>}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => openList("followers")} className="min-h-[44px] px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center">
                <span className="block font-head font-extrabold text-slate-900 leading-none">{p.followers_count || 0}</span>
                <span className="block text-[10px] text-slate-400 mt-1">متابِع</span>
              </button>
              <button onClick={() => openList("following")} className="min-h-[44px] px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center">
                <span className="block font-head font-extrabold text-slate-900 leading-none">{p.following_count || 0}</span>
                <span className="block text-[10px] text-slate-400 mt-1">يُتابَع</span>
              </button>
            </div>
            {!isMine && user && (
              <button onClick={toggleFollow} className={`pressable mt-4 w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-full text-sm font-extrabold shadow-lg ${p.is_following ? "bg-slate-100 text-slate-700" : "ft-btn-solid"}`}>
                {p.is_following ? <><UserCheck className="w-4 h-4" /> تتابعه</> : <><UserPlus className="w-4 h-4" /> متابعة</>}
              </button>
            )}
            {isMine && (
              <Link to="/settings" className="pressable mt-4 w-full inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">تعديل ملفي</Link>
            )}
          </div>
          {/* floating stat band */}
          <div className="-mt-12 sm:-mt-14 lg:mt-0 relative z-10">
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-7 lg:grid-cols-2 md:overflow-visible lg:overflow-visible lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.map((s) => (
                <div key={s.label} className="snap-start shrink-0 w-[118px] md:w-auto bg-white rounded-2xl p-3.5 lg:p-4 border border-slate-100 ft-shadow hover-lift text-center">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 mx-auto rounded-xl grid place-items-center mb-2" style={{ background: `${s.color}15`, color: s.color }}><s.icon className="w-4.5 h-4.5" /></div>
                  <div className="text-lg lg:text-xl font-extrabold font-head text-slate-900 leading-none">{s.value}</div>
                  <div className="text-[10px] lg:text-[11px] text-slate-500 mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {p.bio && <FadeUp><p className="text-slate-600 mt-5 bg-white rounded-2xl p-5 lg:p-6 border border-slate-100 ft-shadow leading-relaxed lg:leading-8">{p.bio}</p></FadeUp>}
        </div>

        {/* tabbed content column */}
        <div className="lg:col-start-2 lg:row-start-1 min-w-0">
        {/* tabs */}
        <div className="sticky top-16 lg:top-20 z-20 mt-6 lg:mt-2 -mx-1 px-1 py-2 bg-[#F8FAFC]/85 backdrop-blur-md">
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] lg:py-3 rounded-xl text-sm lg:text-[15px] font-bold whitespace-nowrap transition-all ${tab === t.k ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>
                <t.icon className="w-4 h-4" />{t.l}
                {t.k === "honors" && (skillBadges.length + certs.length) > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === t.k ? "bg-white/20" : "bg-slate-100"}`}>{skillBadges.length + certs.length}</span>}
                {t.k === "achievements" && p.achievements.length > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === t.k ? "bg-white/20" : "bg-slate-100"}`}>{p.achievements.length}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="py-6 lg:py-8">
          {tab === "works" && (
            <div className="space-y-8 lg:space-y-10">
              <div>
                <h2 className="font-head font-bold text-lg lg:text-xl mb-3 flex items-center gap-2"><PenLine className="w-5 h-5 text-violet-600" /> الأعمال المنشورة</h2>
                {(p.works || []).length === 0 ? <p className="text-slate-400 text-sm bg-white rounded-2xl p-6 text-center border border-slate-100">لا أعمال منشورة بعد ✍️</p> : (
                  <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {p.works.map((w) => (
                      <Item key={w.id}>
                        <Link to={`/studio/${w.id}`} className="block bg-white rounded-2xl p-4 border border-slate-100 ft-shadow hover-lift h-full">
                          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 grid place-items-center mb-2.5"><PenLine className="w-5 h-5" /></div>
                          <div className="font-semibold text-slate-800 text-sm line-clamp-2">{w.title}</div>
                          <div className="text-xs text-slate-400 mt-1.5">{w.likes || 0} إعجاب{w.rating_avg ? ` · ⭐ ${w.rating_avg}` : ""}</div>
                        </Link>
                      </Item>
                    ))}
                  </Stagger>
                )}
              </div>
              <div>
                <h2 className="font-head font-bold text-lg lg:text-xl mb-3 flex items-center gap-2"><Rocket className="w-5 h-5 text-rose-600" /> المشاريع</h2>
                {(p.ventures || []).length === 0 ? <p className="text-slate-400 text-sm bg-white rounded-2xl p-6 text-center border border-slate-100">لا مشاريع بعد 🚀</p> : (
                  <div className="flex flex-wrap gap-2">
                    {p.ventures.map((v) => (
                      <Link key={v.id} to={`/ventures/${v.id}`} className="px-4 py-2 rounded-full bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors">{v.title}</Link>
                    ))}
                  </div>
                )}
              </div>
              {isMine && <ActivityHeatmap />}
            </div>
          )}

          {tab === "honors" && (
            <div className="space-y-8 lg:space-y-10">
              <div>
                <h2 className="font-head font-bold text-lg lg:text-xl mb-3 flex items-center gap-2"><Medal className="w-5 h-5 text-amber-600" /> شارات المهارات ({skillBadges.length})</h2>
                {skillBadges.length === 0 ? <p className="text-slate-400 text-sm bg-white rounded-2xl p-6 text-center border border-slate-100">تُمنح من المشرفين للتميز في الخطابة والكتابة والقيادة 🏅</p> : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              </div>
              <div>
                <h2 className="font-head font-bold text-lg lg:text-xl mb-3 flex items-center gap-2"><Award className="w-5 h-5 ft-text-accent" /> الشهادات ({certs.length})</h2>
                {certs.length === 0 ? <p className="text-slate-400 text-sm bg-white rounded-2xl p-6 text-center border border-slate-100">لا شهادات بعد · تُمنح للتميز والمشاركة 🏅</p> : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {certs.map((c) => (
                      <div key={c.id} className="relative rounded-[22px] p-[3px] bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-[0_14px_34px_-12px_rgba(217,119,6,0.5)] hover-lift">
                        <div className="relative overflow-hidden rounded-[19px] bg-gradient-to-b from-[#FFFEF9] via-[#FFFDF4] to-[#FCF3DC] px-4 pt-4 pb-4 text-center h-full">
                          <div className="pointer-events-none absolute inset-2 rounded-2xl border border-amber-300/60" />
                          <div className="pointer-events-none absolute inset-[13px] rounded-[13px] border border-amber-200/50" />
                          <div className="relative mx-auto w-12 h-12">
                            <span className="absolute -bottom-2 right-[20px] w-3 h-6 rounded-b-lg bg-gradient-to-b from-rose-400 to-rose-600 rotate-[16deg]" />
                            <span className="absolute -bottom-2 left-[20px] w-3 h-6 rounded-b-lg bg-gradient-to-b from-amber-400 to-amber-600 -rotate-[16deg]" />
                            <span className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 ring-4 ring-amber-100 shadow-lg grid place-items-center text-white">
                              <Award className="w-6 h-6" />
                            </span>
                          </div>
                          <div className="relative mt-3 font-head font-extrabold text-slate-800 leading-snug">{c.title_line}</div>
                          {c.subtitle && <div className="relative mt-1 text-xs text-slate-500 leading-relaxed">{c.subtitle}</div>}
                          <div className="relative mt-2.5 flex items-center justify-center gap-2" aria-hidden="true">
                            <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400" />
                            <span className="w-1.5 h-1.5 rotate-45 bg-amber-500" />
                            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400" />
                          </div>
                          <div className="relative mt-2.5 flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400">{String(c.created_at || "").slice(0, 10)}</span>
                            {c.code && (
                              <button onClick={() => copyCertCode(c.code)} title="نسخ رمز التحقق"
                                className="pressable inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors min-h-[32px]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span dir="ltr" className="font-mono tracking-wide">{c.code}</span>
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="relative mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                            {isMine && (
                              <button onClick={() => downloadCert(c.id)} title="تحميل الشهادة PDF"
                                className="pressable inline-flex items-center gap-1.5 rounded-full ft-btn-primary px-3 py-1.5 text-[11px] font-bold min-h-[36px]">
                                <Download className="w-3.5 h-3.5" /> PDF
                              </button>
                            )}
                            <button onClick={() => shareCertImage(c)} title="مشاركة الشهادة كصورة"
                              className="pressable inline-flex items-center gap-1.5 rounded-full bg-white border border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50 transition-colors min-h-[36px]">
                              <Share2 className="w-3.5 h-3.5" /> مشاركة كصورة
                            </button>
                            {c.code && (
                              <a href={`/verify/${c.code}`} target="_blank" rel="noreferrer" title="صفحة التحقق العامة"
                                className="pressable inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors min-h-[36px]">
                                <ShieldCheck className="w-3.5 h-3.5" /> تحقق
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "achievements" && (
            <div>
              <h2 className="font-head font-bold text-lg lg:text-xl mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-600" /> الإنجازات ({p.achievements.length})</h2>
              {p.achievements.length === 0 ? <p className="text-slate-400 text-sm bg-white rounded-2xl p-6 text-center border border-slate-100">لا إنجازات بعد · أول إنجاز أقرب مما تظن ✨</p> : (
                <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {p.achievements.map((a) => {
                    const Icon = Icons[a.icon] || Icons.Award;
                    return (
                      <Item key={a.key}>
                        <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 ft-shadow hover-lift h-full">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center shrink-0"><Icon className="w-5 h-5" /></div>
                          <div><div className="font-semibold text-slate-800 text-sm">{a.title}</div><div className="text-xs text-slate-400">{a.badge}</div></div>
                        </div>
                      </Item>
                    );
                  })}
                </Stagger>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {listModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setListModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-head font-bold flex items-center gap-2"><Users className="w-5 h-5 ft-text-accent" />{listModal === "followers" ? "المتابِعون" : "يتابَعهم"}</h3>
              <button onClick={() => setListModal(null)} className="w-11 h-11 grid place-items-center rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {listItems.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">لا أحد هنا بعد</p> : listItems.map((u) => (
                <Link key={u.id} to={`/profile/${u.id}`} onClick={() => setListModal(null)} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 rounded-full ft-bg-soft-2 ft-text-accent grid place-items-center font-bold">{u.name?.[0]}</span>}
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
