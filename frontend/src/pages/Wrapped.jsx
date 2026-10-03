import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import {
  Sparkles, BookOpen, FileText, Flame, Trophy, BrainCircuit, Layers,
  Feather, Users, Share2, Download, Crown, CalendarHeart, LibraryBig, Swords,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* ملخص رحلتي · a personal "year in books" wrapped page with a shareable
   story card rendered on canvas. */
export default function Wrapped() {
  const [w, setW] = useState(null);
  const [sharing, setSharing] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get("/growth/wrapped").then((r) => setW(r.data)).catch((e) => toast.error(apiErr(e)));
  }, []);

  if (!w) return <Layout><PageLoader /></Layout>;

  const stats = [
    { icon: BookOpen, label: "كتاب أنهيته", value: w.finished_count, tint: "from-blue-500 to-indigo-600", ring: "shadow-blue-500/30" },
    { icon: FileText, label: "صفحة قرأتها", value: w.pages_read, tint: "from-emerald-500 to-teal-600", ring: "shadow-emerald-500/30" },
    { icon: Flame, label: "يوم سلسلة", value: w.streak, tint: "from-orange-500 to-rose-500", ring: "shadow-orange-500/30" },
    { icon: Trophy, label: "شارة مهارة", value: w.badges, tint: "from-amber-400 to-amber-600", ring: "shadow-amber-500/30" },
    { icon: BrainCircuit, label: "اختبار فهم ناجح", value: w.quizzes_passed, tint: "from-teal-500 to-cyan-600", ring: "shadow-teal-500/30" },
    { icon: Layers, label: "بطاقة أتقنتها", value: w.cards_mastered, tint: "from-violet-500 to-fuchsia-600", ring: "shadow-violet-500/30" },
    { icon: Feather, label: "كتيّب من تأليفك", value: w.mini_books, tint: "from-fuchsia-500 to-pink-600", ring: "shadow-fuchsia-500/30" },
    { icon: Swords, label: "تصنيف الشطرنج", value: w.chess_rating, tint: "from-slate-600 to-slate-800", ring: "shadow-slate-500/30" },
  ];

  const drawCard = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const W = 1080, H = 1350;
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b1026"); g.addColorStop(0.55, "#1e1b4b"); g.addColorStop(1, "#4c1d95");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const blob = (bx, by, r, color) => { const rg = x.createRadialGradient(bx, by, 0, bx, by, r); rg.addColorStop(0, color); rg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = rg; x.fillRect(bx - r, by - r, r * 2, r * 2); };
    blob(120, 160, 420, "rgba(217,119,6,0.35)");
    blob(980, 1150, 460, "rgba(34,211,238,0.25)");
    x.direction = "rtl";
    x.textAlign = "center";
    x.fillStyle = "rgba(255,255,255,0.65)";
    x.font = "700 34px system-ui, sans-serif";
    x.fillText("نادي مفكري المستقبل · رحلتي القرائية", W / 2, 120);
    x.fillStyle = "#fbbf24";
    x.font = "900 54px system-ui, sans-serif";
    x.fillText("ملخص رحلتي", W / 2, 200);
    x.fillStyle = "#ffffff";
    x.font = "900 72px system-ui, sans-serif";
    const name = w.name || "قارئ";
    x.fillText(name.length > 22 ? name.slice(0, 22) + "…" : name, W / 2, 320);
    x.fillStyle = "rgba(255,255,255,0.75)";
    x.font = "700 34px system-ui, sans-serif";
    x.fillText(`المستوى ${w.level} · ${w.level_title || ""} · ${w.xp} نقطة خبرة`, W / 2, 385);
    const rows = [
      ["كتاباً أنهيت", String(w.finished_count)], ["صفحة قرأت", String(w.pages_read)],
      ["يوماً في سلسلتي", String(w.streak)], ["شارة كسبت", String(w.badges)],
    ];
    rows.forEach(([label, val], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = col === 0 ? W * 0.72 : W * 0.28;
      const cy = 560 + row * 235;
      x.fillStyle = "rgba(255,255,255,0.08)";
      x.beginPath(); x.roundRect(cx - 215, cy - 95, 430, 185, 36); x.fill();
      x.strokeStyle = "rgba(255,255,255,0.18)"; x.stroke();
      x.fillStyle = "#ffffff"; x.font = "900 84px system-ui, sans-serif";
      x.fillText(val, cx, cy + 8);
      x.fillStyle = "rgba(255,255,255,0.7)"; x.font = "700 30px system-ui, sans-serif";
      x.fillText(label, cx, cy + 62);
    });
    x.fillStyle = "rgba(255,255,255,0.85)";
    x.font = "800 36px system-ui, sans-serif";
    const extra = [];
    if (w.top_category) extra.push(`فئتي المفضلة: ${w.top_category}`);
    if (w.longest_book) extra.push(`أطول كتاب: ${String(w.longest_book.title).slice(0, 30)}`);
    extra.forEach((t, i) => x.fillText(t, W / 2, 1130 + i * 55));
    x.fillStyle = "rgba(255,255,255,0.45)";
    x.font = "700 27px system-ui, sans-serif";
    x.fillText("f-thinkers.vercel.app", W / 2, 1290);
    return c;
  };

  const share = async () => {
    setSharing(true);
    try {
      const c = drawCard();
      if (!c) return;
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      const file = new File([blob], "my-reading-journey.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "ملخص رحلتي القرائية" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "my-reading-journey.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success("حُمّلت بطاقة رحلتك · شاركها أينما تريد");
      }
    } catch { /* user dismissed the share sheet */ }
    setSharing(false);
  };

  const download = () => {
    const c = drawCard();
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "my-reading-journey.png";
    a.click();
  };

  return (
    <Layout>
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[30px] ft-navy-gradient grain text-white p-6 sm:p-10 ft-shadow-lg text-center">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-28 right-1/5 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-amber-200"><Sparkles className="w-3.5 h-3.5" /> ملخصك الشخصي الحي</div>
              <h1 className="font-head text-3xl sm:text-5xl font-black mt-4 leading-tight">رحلة {w.name?.split(" ")[0] || "القارئ"} القرائية</h1>
              <p className="text-slate-300 text-sm mt-2">
                {w.school_name ? `${w.school_name} · ` : ""}المستوى {w.level} · {w.level_title} · <span className="text-amber-300 font-extrabold">{w.xp} نقطة خبرة</span>
              </p>
              <div className="flex justify-center gap-2.5 mt-6 flex-wrap">
                <button onClick={share} disabled={sharing} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-amber-400 text-slate-950 text-sm font-extrabold shadow-xl shadow-amber-500/30 disabled:opacity-50">
                  <Share2 className="w-4.5 h-4.5 w-5 h-5" /> شارك بطاقتي
                </button>
                <button onClick={download} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-white/10 ring-1 ring-white/20 text-white text-sm font-extrabold backdrop-blur-md">
                  <Download className="w-5 h-5" /> تحميل كصورة
                </button>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6">
          {stats.map((s, i) => (
            <FadeUp key={s.label}>
              <div className="relative overflow-hidden rounded-[24px] p-[1px] bg-gradient-to-br from-white/60 via-white/30 to-slate-300/40 ft-shadow">
                <div className="relative rounded-[23px] bg-white/70 backdrop-blur-2xl p-4 sm:p-5 h-full">
                  <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.tint} text-white grid place-items-center shadow-lg ${s.ring}`}><s.icon className="w-5.5 h-5.5 w-6 h-6" /></span>
                  <div className="font-head text-[26px] sm:text-3xl font-black text-slate-900 mt-3 tabular-nums">{(s.value || 0).toLocaleString("ar-JO")}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">{s.label}</div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mt-5">
          <FadeUp>
            <div className="relative overflow-hidden rounded-[26px] p-[1px] bg-gradient-to-br from-amber-300/60 via-white/40 to-orange-300/40 ft-shadow h-full">
              <div className="relative rounded-[25px] bg-white/70 backdrop-blur-2xl p-5 sm:p-6 h-full">
                <h3 className="font-head font-extrabold text-slate-900 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> أبرز كتبك المنتهية</h3>
                {w.finished_books?.length ? (
                  <div className="space-y-2.5 mt-4">
                    {w.finished_books.map((b, i) => (
                      <Link key={b.id} to={`/books/${b.id}`} className="pressable flex items-center gap-3 rounded-2xl bg-white/70 ring-1 ring-slate-900/[0.04] px-4 py-3">
                        <span className={`w-8 h-8 rounded-xl grid place-items-center text-xs font-black text-white shrink-0 ${i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-500/40" : "bg-slate-900/[0.07] !text-slate-500"}`}>{i + 1}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-head font-bold text-sm text-slate-800 truncate">{b.title}</span>
                          <span className="block text-[11px] font-bold text-slate-400">{b.pages} صفحة · {b.category}</span>
                        </span>
                        <BookOpen className="w-4 h-4 text-slate-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-4 leading-relaxed">لم تُنهِ كتاباً بعد · أول كتاب تنهيه سيتصدّر هذه القائمة. ابدأ من <Link to="/library" className="text-amber-600 font-extrabold">المكتبة</Link>.</p>
                )}
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className="relative overflow-hidden rounded-[26px] p-[1px] bg-gradient-to-br from-cyan-300/60 via-white/40 to-violet-300/40 ft-shadow h-full">
              <div className="relative rounded-[25px] bg-white/70 backdrop-blur-2xl p-5 sm:p-6 h-full">
                <h3 className="font-head font-extrabold text-slate-900 flex items-center gap-2"><CalendarHeart className="w-5 h-5 text-cyan-600" /> بصمتك القرائية</h3>
                <div className="space-y-3 mt-4">
                  {[
                    { label: "فئتك المفضلة", value: w.top_category || "لم تتضح بعد", icon: LibraryBig, tint: "bg-cyan-500/10 text-cyan-600" },
                    { label: "أفضل شهر قراءة", value: w.best_month ? `${w.best_month} (${w.best_month_books} كتب)` : "لا بيانات بعد", icon: CalendarHeart, tint: "bg-violet-500/10 text-violet-600" },
                    { label: "أطول كتاب قهرته", value: w.longest_book ? `${w.longest_book.title} · ${w.longest_book.pages} صفحة` : "قريباً", icon: Trophy, tint: "bg-amber-500/10 text-amber-600" },
                    { label: "كتب قيد القراءة الآن", value: `${w.in_progress} كتاب`, icon: BookOpen, tint: "bg-emerald-500/10 text-emerald-600" },
                    { label: "رفقاء قراءة رافقتهم", value: `${w.buddies}`, icon: Users, tint: "bg-rose-500/10 text-rose-500" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-white/70 ring-1 ring-slate-900/[0.04] px-4 py-3">
                      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${r.tint}`}><r.icon className="w-4.5 h-4.5 w-5 h-5" /></span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-400">{r.label}</div>
                        <div className="font-head font-bold text-sm text-slate-800 truncate">{r.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>

        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>
    </Layout>
  );
}
