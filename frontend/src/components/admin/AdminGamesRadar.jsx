import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import {
  Radar, BookOpen, Calculator, Keyboard, Flame, Crown, Swords,
  AlertTriangle, Send, RefreshCw, Zap, Users,
} from "lucide-react";

const fmt = (n) => (n === null || n === undefined ? "·" : Number(n).toLocaleString("en-US"));
const GAME_AR = {
  wordle: { name: "كلمة اليوم", icon: BookOpen, grad: "from-amber-500 to-rose-500" },
  math: { name: "سباق الحساب", icon: Calculator, grad: "from-blue-600 to-violet-600" },
  typing: { name: "سباق الكتابة", icon: Keyboard, grad: "from-emerald-600 to-cyan-700" },
};

export default function AdminGamesRadar() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/games/admin/radar");
      setData(data);
      setErr("");
    } catch (e) { setErr(apiErr(e)); }
  };

  useEffect(() => { load(); }, []);

  const streakSaver = async () => {
    setSending(true);
    try {
      const { data } = await api.post("/games/admin/streak-saver", {});
      toast.success(`تذكير السلسلة: أُرسل إلى ${data.sent} طالباً (من ${data.candidates} مرشحاً)`);
    } catch (e) { toast.error(apiErr(e)); } finally { setSending(false); }
  };

  if (err && !data) {
    return (
      <div className="rounded-3xl bg-white ring-1 ring-rose-100 p-8 text-center" data-testid="games-radar">
        <AlertTriangle className="w-10 h-10 mx-auto text-rose-400" />
        <p className="font-black mt-3 text-rose-500">{err}</p>
        <button onClick={load} className="mt-4 rounded-xl bg-slate-900 text-white px-5 py-2.5 font-black text-sm">إعادة المحاولة</button>
      </div>
    );
  }
  if (!data) return <PageLoader />;

  const totalPlaysToday = Object.values(data.per_game).reduce((a, g) => a + g.plays_today, 0);

  return (
    <div className="space-y-5" data-testid="games-radar">
      <FadeUp>
        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 text-white p-5 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-head font-black text-2xl flex items-center gap-2"><Radar className="w-6 h-6 text-orange-400" /> رادار الألعاب</h3>
              <p className="text-slate-400 text-sm mt-1">نشاط اليوم ({data.day}) والأيام السبعة الماضية · XP المصروفة من الألعاب والتحديات والمهمات</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 transition" aria-label="تحديث"><RefreshCw className="w-4 h-4" /></button>
              <button data-testid="radar-streak-btn" disabled={sending} onClick={streakSaver}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-400 to-rose-500 px-4 py-2.5 font-black text-sm disabled:opacity-50 transition hover:scale-[1.02] active:scale-95">
                <Send className="w-4 h-4" /> {sending ? "جارٍ الإرسال…" : "إرسال تذكير السلسلة الآن"}
              </button>
            </div>
          </div>
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {[
              { l: "جولات اليوم", v: fmt(totalPlaysToday), i: Zap },
              { l: "XP مصروفة (7 أيام)", v: fmt(data.xp_total_7d), i: Crown },
              { l: "تحديات مفتوحة", v: fmt(data.challenges.open), i: Swords },
              { l: "تحديات منجزة", v: fmt(data.challenges.done), i: Flame },
            ].map(({ l, v, i: Icon }) => (
              <div key={l} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                <Icon className="w-5 h-5 text-amber-300" />
                <p className="font-head font-black text-2xl mt-2">{v}</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>

      <Stagger className="grid md:grid-cols-3 gap-4">
        {Object.entries(GAME_AR).map(([k, M]) => {
          const g = data.per_game[k] || {};
          return (
            <Item key={k}>
              <div className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 ft-shadow">
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${M.grad}`} />
                <div className="flex items-center gap-2.5">
                  <M.icon className="w-5 h-5 text-slate-700" />
                  <p className="font-head font-black">{M.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-center">
                  <div className="rounded-2xl bg-slate-50 py-3"><p className="font-head font-black text-xl">{fmt(g.plays_today)}</p><p className="text-[10px] text-slate-400 font-bold">جولات اليوم</p></div>
                  <div className="rounded-2xl bg-slate-50 py-3"><p className="font-head font-black text-xl">{fmt(g.players_today)}</p><p className="text-[10px] text-slate-400 font-bold">لاعبون اليوم</p></div>
                  <div className="rounded-2xl bg-slate-50 py-3"><p className="font-head font-black text-xl">{fmt(g.plays_7d)}</p><p className="text-[10px] text-slate-400 font-bold">جولات 7 أيام</p></div>
                  <div className="rounded-2xl bg-slate-50 py-3"><p className="font-head font-black text-xl">{fmt(g.players_7d)}</p><p className="text-[10px] text-slate-400 font-bold">لاعبون 7 أيام</p></div>
                </div>
                <p className="mt-3 text-[11px] font-black text-slate-400 inline-flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> XP من هذه اللعبة (7 أيام): {fmt(data.xp_by_reason[M.name] || 0)}
                </p>
              </div>
            </Item>
          );
        })}
      </Stagger>

      <div className="grid lg:grid-cols-2 gap-4">
        <FadeUp>
          <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 ft-shadow h-full">
            <h4 className="font-head font-black flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> أبطال اليوم عبر الألعاب</h4>
            <div className="mt-4 space-y-2">
              {data.top_today.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">لا نشاط اليوم بعد</p>}
              {data.top_today.map((t, i) => (
                <div key={t.user_id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2.5">
                  <span className={`w-8 h-8 rounded-full grid place-items-center font-head font-black text-sm ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{i + 1}</span>
                  <span className="font-black text-sm flex-1 min-w-0 truncate">{t.name}</span>
                  <span className="text-[11px] text-slate-400 font-bold">{fmt(t.plays)} جولة</span>
                  <span className="font-head font-black">{fmt(t.score)}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 ft-shadow h-full">
            <h4 className="font-head font-black flex items-center gap-2"><Users className="w-5 h-5 text-slate-500" /> نشاط مكثّف اليوم <span className="text-[10px] font-black text-slate-400">(٢٠ جولة فأكثر · للمراجعة لا للعقاب)</span></h4>
            <div className="mt-4 space-y-2">
              {data.heavy_players.length === 0 && <p className="text-slate-400 text-sm py-4 text-center">لا نشاط مكثّف اليوم 🎉</p>}
              {data.heavy_players.map((h) => (
                <div key={h.user_id} className="flex items-center gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-100 px-4 py-2.5">
                  <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-black text-sm flex-1 min-w-0 truncate">{h.name}</span>
                  <span className="font-head font-black text-orange-600">{fmt(h.plays)} جولة</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-4 leading-relaxed">
              تذكير: XP الكاملة تُمنح مرة واحدة يومياً لكل لعبة، وما بعدها رمزي (3 XP)؛ القائمة هنا لملاحظة الأنماط فقط.
            </p>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
