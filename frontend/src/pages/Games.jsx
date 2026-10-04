import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { FadeUp } from "@/components/anim";
import {
  Gamepad2, BookOpen, Calculator, Keyboard, Crown, Zap, CheckCircle2,
  ArrowLeft, Flame, Trophy, Play,
} from "lucide-react";

const GAMES = [
  {
    game: "wordle", to: "/games/wordle", icon: BookOpen, name: "كلمة اليوم",
    desc: "خمّن الكلمة العربية من 5 أحرف في 6 محاولات · كلمة جديدة كل يوم",
    grad: "from-amber-500 via-orange-500 to-rose-500", ring: "ring-amber-100", accent: "#D97706",
  },
  {
    game: "math", to: "/games/math", icon: Calculator, name: "سباق الحساب",
    desc: "20 عملية حسابية ضد الساعة · كلما أسرعت وأصبت، ارتفع رصيدك",
    grad: "from-blue-600 via-indigo-600 to-violet-600", ring: "ring-blue-100", accent: "#2563EB",
  },
  {
    game: "typing", to: "/games/typing", icon: Keyboard, name: "سباق الكتابة",
    desc: "اكتب النص بأسرع ما يمكن وبدقة عالية · عربي وإنجليزي",
    grad: "from-emerald-600 via-teal-600 to-cyan-700", ring: "ring-emerald-100", accent: "#059669",
  },
];

export default function Games() {
  const [today, setToday] = useState(null);

  useEffect(() => {
    api.get("/games/today").then(({ data }) => setToday(data)).catch(() => setToday({ games: {} }));
  }, []);

  if (!today) return <Layout><PageLoader /></Layout>;
  const g = today.games || {};
  const doneCount = GAMES.filter(({ game }) => game === "wordle" ? g.wordle?.finished : g[game]?.played).length;

  return (
    <Layout>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 xl:py-10 space-y-5 sm:space-y-6">
        <FadeUp>
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <Gamepad2 className="w-3.5 h-3.5 text-amber-300" /> ثلاث ألعاب · تُحدّث كل يوم
                </span>
                <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black mt-3">ساحة الألعاب</h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  العب، اجمع نقاط الخبرة، ونافس مدرستك · الأوائل اليوم يحصدون الشارات: سيد الكلمات 🏆 الحاسوب البشري 🧮 الأصابع الذهبية ⌨️
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center px-5 py-3.5 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-2xl font-black font-head flex items-center justify-center gap-1.5">
                    <Flame className="w-5 h-5 text-orange-400" />{doneCount}/3
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">ألعاب اليوم منجزة</div>
                </div>
                <div className="text-center px-5 py-3.5 rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <div className="text-2xl font-black font-head flex items-center justify-center gap-1.5">
                    <Zap className="w-5 h-5 text-amber-300" />
                    {GAMES.filter(({ game }) => g[game]?.xp_available).length}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">جوائز XP بانتظارك</div>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {GAMES.map(({ game, to, icon: Icon, name, desc, grad, ring, accent }, i) => {
            const st = g[game] || {};
            const done = game === "wordle" ? st.finished : st.played;
            return (
              <FadeUp key={game} delay={i * 0.06}>
                <Link to={to} className={`group pressable block h-full bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden ring-1 ${ring} hover:-translate-y-1 transition-transform`}>
                  <div className={`relative bg-gradient-to-l ${grad} p-5 sm:p-6 text-white overflow-hidden`}>
                    <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/15 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="w-14 h-14 rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur grid place-items-center shadow-xl">
                        <Icon className="w-7 h-7" />
                      </span>
                      {done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white text-emerald-700 px-2.5 py-1 text-[11px] font-black shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" /> لعبت اليوم
                        </span>
                      ) : st.xp_available !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 ring-1 ring-white/25 px-2.5 py-1 text-[11px] font-black">
                          <Zap className="w-3.5 h-3.5" /> XP اليوم متاح
                        </span>
                      ) : null}
                    </div>
                    <h2 className="relative font-head text-2xl font-black mt-4">{name}</h2>
                    <p className="relative text-white/80 text-[13px] leading-relaxed mt-1 min-h-[40px]">{desc}</p>
                  </div>
                  <div className="p-5 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-slate-400">
                      {game === "wordle"
                        ? (st.finished ? (st.won ? "🏆 فزت اليوم! عد غداً" : "انتهت كلمة اليوم · حظاً أوفر غداً") : `محاولات مستخدمة: ${st.tries || 0}/6`)
                        : `أفضل نتيجة اليوم: `}
                      {game !== "wordle" && <b className="text-slate-700" dir="ltr">{st.best_score || 0}</b>}
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-head font-extrabold text-sm shrink-0" style={{ color: accent }}>
                      {done ? "العب مجدداً" : "العب الآن"} <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              </FadeUp>
            );
          })}

          <FadeUp delay={0.2}>
            <Link to="/chess/robot" className="group pressable block h-full bg-slate-900 rounded-3xl ft-shadow overflow-hidden hover:-translate-y-1 transition-transform">
              <div className="relative p-5 sm:p-6 text-white overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-10 w-44 h-44 rounded-full bg-amber-400/20 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <span className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 grid place-items-center">
                    <Crown className="w-7 h-7 text-amber-300" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30 px-2.5 py-1 text-[11px] font-black">
                    <Trophy className="w-3.5 h-3.5" /> تصنيف وبطولات
                  </span>
                </div>
                <h2 className="relative font-head text-2xl font-black mt-4">الشطرنج</h2>
                <p className="relative text-slate-300 text-[13px] leading-relaxed mt-1 min-h-[40px]">واجه الروبوت أو الزملاء، واصعد تصنيفك في لوحات الشطرنج</p>
              </div>
              <div className="px-5 pb-5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">لغز يومي وتصنيف عام</span>
                <span className="inline-flex items-center gap-1.5 font-head font-extrabold text-sm text-amber-300">
                  <Play className="w-4 h-4" /> العب الشطرنج
                </span>
              </div>
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.1}>
          <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-amber-400/20 ring-1 ring-amber-300/30 grid place-items-center shrink-0"><Trophy className="w-6 h-6 text-amber-300" /></span>
            <div className="flex-1 min-w-0">
              <div className="font-head font-extrabold">نقاط الألعاب ترفع مدرستك في كأس الموسم 🏆</div>
              <p className="text-slate-300 text-[13px] leading-relaxed mt-1">
                كل نقطة خبرة تكسبها هنا تُضاف لمجموعك، ومجموع طلاب مدرستك هو ما يقرر ترتيبها في الكأس · اللعب اليومي الكامل مرة واحدة يومياً بأقصى نقاط، وبعدها نقاط رمزية: المهارة أولاً، لا الطحن.
              </p>
            </div>
            <Link to="/season-cup" className="pressable shrink-0 inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-white text-slate-900 text-sm font-extrabold">
              كأس الموسم <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </FadeUp>
      </div>
    </Layout>
  );
}
