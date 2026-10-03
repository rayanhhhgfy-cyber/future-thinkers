import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, Search, MessageCircle, Flame, BookOpen, Crown, Loader2,
  UserPlus, HeartHandshake, Swords, CalendarClock, LogOut, Sparkles,
} from "lucide-react";
import { FadeUp } from "@/components/anim";

/* رفيق القراءة · a weekly reading buddy: you get paired with a member and
   race on this week's pages. */
export default function Buddies() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const load = async () => {
    try {
      const { data: d } = await api.get("/growth/buddies/me");
      setData(d);
    } catch (e) { toast.error(apiErr(e)); }
  };
  useEffect(() => { load(); }, []);

  if (!data) return <Layout><PageLoader /></Layout>;

  const find = async () => {
    setBusy(true);
    try {
      const { data: d } = await api.post("/growth/buddies/find");
      if (d.state === "active") toast.success("وجدنا رفيق قراءة لك! 📚");
      else toast.info("أنت في قائمة الانتظار · سنعلمك فور توفر رفيق");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const leave = async () => {
    setBusy(true);
    try {
      await api.post("/growth/buddies/leave");
      setConfirmLeave(false);
      toast.success("انتهت الشراكة · بالتوفيق في القراءة");
      await load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };

  const b = data.buddy;
  const myPages = data.my_week_pages || 0;
  const buddyPages = data.buddy_week_pages || 0;
  const total = Math.max(1, myPages + buddyPages);
  const leading = myPages === buddyPages ? 0 : myPages > buddyPages ? 1 : -1;

  return (
    <Layout>
      <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FadeUp>
          <div className="relative overflow-hidden rounded-[28px] ft-navy-gradient grain text-white p-6 sm:p-8 ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-rose-500/25 rounded-full blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-rose-200"><HeartHandshake className="w-3.5 h-3.5" /> شراكة قراءة أسبوعية</div>
              <h1 className="font-head text-3xl sm:text-4xl font-black mt-3">رفيق القراءة</h1>
              <p className="text-slate-300 text-sm mt-1.5 max-w-lg leading-relaxed">طالب آخر يقرأ معك هذا الأسبوع: تنافسا على الصفحات، شجّعا بعضكما، واصعدا المتصدرين معاً.</p>
            </div>
          </div>
        </FadeUp>

        {data.state === "active" && b ? (
          <FadeUp>
            <div className="mt-6 relative overflow-hidden rounded-[30px] p-[1px] bg-gradient-to-br from-rose-400/50 via-white/40 to-sky-300/50 ft-shadow-lg">
              <div className="relative rounded-[29px] bg-white/70 backdrop-blur-2xl backdrop-saturate-150 p-5 sm:p-8 overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute -top-16 left-1/3 w-56 h-56 rounded-full bg-rose-400/15 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold text-slate-400">
                    <CalendarClock className="w-4 h-4" /> سباق آخر ٧ أيام · الصفحات تُحسب تلقائياً من قراءتك
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 mt-6">
                    <div className="text-center min-w-0">
                      <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto ring-4 ring-sky-400/30 shadow-xl">
                        {user?.avatar_url ? <AvatarImage src={user.avatar_url} /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-2xl font-black">{user?.name?.[0] || "أ"}</AvatarFallback>
                      </Avatar>
                      <div className="font-head font-extrabold text-slate-900 mt-3 truncate">{user?.name}</div>
                      <div className="text-[11px] font-bold text-slate-400">أنت · المستوى {user?.level || 1}</div>
                      <div className="font-head text-3xl sm:text-4xl font-black text-sky-600 mt-2 tabular-nums">{myPages}</div>
                      <div className="text-[11px] font-bold text-slate-400">صفحة هذا الأسبوع</div>
                    </div>
                    <div className="text-center">
                      <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white grid place-items-center shadow-lg shadow-rose-500/40 mx-auto"><Swords className="w-6 h-6 sm:w-7 sm:h-7" /></span>
                      <div className="text-[10px] font-black text-slate-400 mt-2">
                        {leading === 0 ? "تعادل!" : leading === 1 ? "أنت متقدم" : "رفيقك متقدم"}
                      </div>
                    </div>
                    <div className="text-center min-w-0">
                      <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto ring-4 ring-rose-400/30 shadow-xl">
                        {b.avatar_url ? <AvatarImage src={b.avatar_url} /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-rose-400 to-orange-500 text-white text-2xl font-black">{b.name?.[0] || "ر"}</AvatarFallback>
                      </Avatar>
                      <div className="font-head font-extrabold text-slate-900 mt-3 truncate">{b.name}</div>
                      <div className="text-[11px] font-bold text-slate-400 truncate">{b.school_name || "قارئ نشيط"} · المستوى {b.level}</div>
                      <div className="font-head text-3xl sm:text-4xl font-black text-rose-500 mt-2 tabular-nums">{buddyPages}</div>
                      <div className="text-[11px] font-bold text-slate-400">صفحة هذا الأسبوع</div>
                    </div>
                  </div>

                  <div className="mt-7">
                    <div className="flex h-3.5 rounded-full overflow-hidden ring-1 ring-slate-900/[0.05] bg-slate-100">
                      <div className="h-full bg-gradient-to-l from-sky-400 to-indigo-500 transition-all duration-700" style={{ width: `${(myPages / total) * 100}%` }} />
                      <div className="h-full bg-gradient-to-l from-rose-400 to-orange-400 transition-all duration-700" style={{ width: `${(buddyPages / total) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] font-extrabold mt-2">
                      <span className="text-sky-600 inline-flex items-center gap-1">{leading === 1 && <Crown className="w-3.5 h-3.5" />} حصتك {Math.round((myPages / total) * 100)}٪</span>
                      <span className="text-rose-500 inline-flex items-center gap-1">حصة رفيقك {Math.round((buddyPages / total) * 100)}٪ {leading === -1 && <Crown className="w-3.5 h-3.5" />}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2.5 mt-7">
                    <Link to={`/messages?to=${b.id}`} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 text-white text-sm font-extrabold shadow-lg shadow-rose-500/30">
                      <MessageCircle className="w-4 h-4" /> راسل رفيقك
                    </Link>
                    <Link to={`/profile/${b.id}`} className="pressable inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-white/80 ring-1 ring-slate-900/[0.06] text-slate-700 text-sm font-extrabold">
                      <BookOpen className="w-4 h-4" /> ملفه وإنجازاته
                    </Link>
                    {!confirmLeave ? (
                      <button onClick={() => setConfirmLeave(true)} className="pressable inline-flex items-center gap-2 h-12 px-5 rounded-2xl text-sm font-extrabold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <LogOut className="w-4 h-4" /> إنهاء الشراكة
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 h-12 px-4 rounded-2xl bg-rose-50 ring-1 ring-rose-200">
                        <span className="text-xs font-extrabold text-rose-600">متأكد؟</span>
                        <button onClick={leave} disabled={busy} className="text-xs font-extrabold text-white bg-rose-500 px-3 py-1.5 rounded-full disabled:opacity-50">نعم، إنهاء</button>
                        <button onClick={() => setConfirmLeave(false)} className="text-xs font-extrabold text-slate-500 px-2">تراجع</button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        ) : (
          <FadeUp>
            <div className="mt-6 rounded-[30px] bg-white/70 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] ft-shadow p-6 sm:p-10 text-center relative overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-rose-400/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-sky-400/15 blur-3xl" />
              <div className="relative">
                <span className="w-[72px] h-[72px] mx-auto rounded-[24px] bg-gradient-to-br from-rose-500 to-orange-500 text-white grid place-items-center shadow-xl shadow-rose-500/35"><Users className="w-9 h-9" /></span>
                {data.state === "waiting" ? (
                  <>
                    <h2 className="font-head font-black text-2xl text-slate-900 mt-5">أنت في قائمة الانتظار</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">بمجرد أن يطلب عضو آخر رفيقاً سنقارنكما فوراً ونعلمك. واصل القراءة في الأثناء فصفحاتك تُحسب منذ الآن.</p>
                    <div className="inline-flex items-center gap-2 mt-5 text-xs font-extrabold px-4 py-2.5 rounded-full bg-amber-400/15 text-amber-700 ring-1 ring-amber-400/30"><Loader2 className="w-4 h-4 animate-spin" /> بانتظار رفيق مناسب…</div>
                  </>
                ) : (
                  <>
                    <h2 className="font-head font-black text-2xl text-slate-900 mt-5">ليس لديك رفيق قراءة بعد</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">انقر الزر وسنقارنك بعضو نشيط. ستتنافسان على صفحات الأسبوع، وتستطيع مراسلته وتشجيعه في أي وقت.</p>
                    <button onClick={find} disabled={busy} className="pressable mt-6 inline-flex items-center gap-2 h-13 h-[52px] px-8 rounded-2xl bg-gradient-to-l from-rose-500 to-orange-500 text-white font-extrabold text-sm shadow-xl shadow-rose-500/35 disabled:opacity-50">
                      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} ابحث عن رفيق قراءة
                    </button>
                  </>
                )}
                <div className="grid sm:grid-cols-3 gap-3 mt-8 text-start">
                  {[
                    { icon: UserPlus, t: "مقارنة فورية", d: "نقارنك بعضو نشيط بمجرد توفره، دون أي إعدادات معقدة." },
                    { icon: Flame, t: "سباق أسبوعي حي", d: "صفحاتكما تُحسب تلقائياً من تقدم القراءة كل يوم." },
                    { icon: Sparkles, t: "تحفيز متبادل", d: "راسل رفيقك، تحدّه، واحتفلا معاً عند إنهاء الكتب." },
                  ].map((f) => (
                    <div key={f.t} className="rounded-3xl bg-white/70 ring-1 ring-slate-900/[0.04] p-4">
                      <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 grid place-items-center"><f.icon className="w-5 h-5" /></span>
                      <div className="font-head font-extrabold text-sm text-slate-800 mt-2.5">{f.t}</div>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{f.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        )}
      </div>
    </Layout>
  );
}
