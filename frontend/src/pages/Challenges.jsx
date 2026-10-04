import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FadeUp, Stagger, Item, EASE } from "@/components/anim";
import {
  Swords, Calculator, Keyboard, Trophy, Clock, Play, Search, X,
  CheckCircle2, Hourglass, Zap, Send,
} from "lucide-react";
import { toast } from "sonner";

const GAME_META = {
  math: { name: "سباق الحساب", icon: Calculator, grad: "from-blue-600 to-violet-600", tint: "bg-blue-100 text-blue-700" },
  typing: { name: "سباق الكتابة", icon: Keyboard, grad: "from-emerald-600 to-cyan-700", tint: "bg-emerald-100 text-emerald-700" },
};

function hoursLeft(iso) {
  const h = Math.floor((new Date(iso) - Date.now()) / 3600000);
  return h;
}

export default function Challenges() {
  const [list, setList] = useState(null);
  const [tab, setTab] = useState("active"); // active | done
  const [picker, setPicker] = useState(false);
  const [playing, setPlaying] = useState(null); // {challenge, play}

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/games/challenges/mine");
      setList(data.challenges || []);
    } catch { setList([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!list) return <Layout><PageLoader /></Layout>;

  const active = list.filter((c) => c.status !== "done");
  const done = list.filter((c) => c.status === "done");
  const shown = tab === "active" ? active : done;

  return (
    <Layout>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 xl:py-10 space-y-6">
        <FadeUp>
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl animate-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 w-72 h-72 bg-violet-500/25 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <Swords className="w-3.5 h-3.5 text-amber-300" /> نفس الأسئلة · نفس النص · الأفضل يفوز
                </span>
                <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black mt-3">تحدي صديق</h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  تحدَّ أي طالب في سباق الحساب أو سباق الكتابة · يلعب كلٌّ منكما متى ما أراد خلال 72 ساعة · الفائز يأخذ <span className="text-amber-300 font-black">15 XP</span> ووصيفه 5 XP
                </p>
              </div>
              <button data-testid="challenge-new-btn" onClick={() => setPicker(true)}
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-400 to-orange-500 px-6 py-3.5 font-head font-black text-slate-900 shadow-lg shadow-orange-500/30 transition hover:scale-[1.03] active:scale-95">
                <Swords className="w-5 h-5" /> تحدٍّ جديد
              </button>
            </div>
          </div>
        </FadeUp>

        <div className="flex items-center gap-2" data-testid="challenge-tabs">
          {[["active", `جارية (${active.length})`], ["done", `منتهية (${done.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${tab === k ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800"}`}>
              {l}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <FadeUp>
            <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-10 text-center" data-testid="challenge-empty">
              <Swords className="w-14 h-14 mx-auto text-slate-300" />
              <p className="font-head font-black text-xl mt-3">لا توجد تحديات هنا بعد</p>
              <p className="text-slate-500 text-sm mt-1">ابدأ أول تحدٍّ وادعُ صديقاً للمنازلة</p>
            </div>
          </FadeUp>
        ) : (
          <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {shown.map((c) => (
              <Item key={c.id}>
                <ChallengeCard c={c} onPlay={() => setPlaying({ challenge: c })} />
              </Item>
            ))}
          </Stagger>
        )}
      </div>

      <AnimatePresence>
        {picker && <Picker onClose={() => setPicker(false)} onDone={() => { setPicker(false); load(); }} />}
        {playing && <PlayArena sess={playing} onClose={() => { setPlaying(null); load(); }} />}
      </AnimatePresence>
    </Layout>
  );
}

function ChallengeCard({ c, onPlay }) {
  const M = GAME_META[c.game] || GAME_META.math;
  const Icon = M.icon;
  const hl = hoursLeft(c.expires_at);
  const mineScore = c.my_result?.score;
  const oppScore = c.opp_result?.score;
  let outcome = null;
  if (c.status === "done") {
    if (c.winner === "draw") outcome = { t: "تعادل 🤝", cls: "bg-slate-100 text-slate-600" };
    else if ((c.my_result && c.opp_result && mineScore > oppScore) || (!c.opp_result && c.my_result)) outcome = { t: "فزت 🏆", cls: "bg-amber-100 text-amber-700" };
    else if (!c.my_result && c.opp_result) outcome = { t: "انتهى الوقت", cls: "bg-slate-100 text-slate-500" };
    else outcome = { t: "خسرت هذه المرة", cls: "bg-rose-100 text-rose-600" };
  }
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 p-5 ft-shadow transition hover:-translate-y-1 hover:shadow-xl" data-testid="challenge-card">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${M.grad}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${M.tint}`}><Icon className="w-6 h-6" /></span>
          <div className="min-w-0">
            <p className="font-head font-black truncate">{M.name}</p>
            <p className="text-xs text-slate-500 truncate">ضد {c.opp_name}</p>
          </div>
        </div>
        {outcome && <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${outcome.cls}`}>{outcome.t}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <div className="text-center">
          <p className="text-[11px] text-slate-400 font-bold">نتيجتي</p>
          <p className="font-head font-black text-lg">{c.my_result ? mineScore : "—"}</p>
        </div>
        <Swords className="w-4 h-4 text-slate-300" />
        <div className="text-center">
          <p className="text-[11px] text-slate-400 font-bold">{c.opp_name}</p>
          <p className="font-head font-black text-lg">{c.status === "done" && c.opp_result ? oppScore : c.opp_result ? "؟" : "—"}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
          {c.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Hourglass className="w-3.5 h-3.5 text-amber-500" />}
          {c.status === "done" ? "منتهٍ" : hl > 0 ? `متبقٍ ${hl} ساعة` : "يُحسم قريباً"}
        </span>
        {c.my_turn && (
          <button data-testid="challenge-play-btn" onClick={onPlay}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black transition hover:scale-[1.03] active:scale-95">
            <Play className="w-4 h-4" /> العب حصتك
          </button>
        )}
        {!c.my_turn && c.status !== "done" && <span className="text-[11px] font-black text-slate-400">بانتظار خصمك…</span>}
      </div>
    </div>
  );
}

function Picker({ onClose, onDone }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [game, setGame] = useState("math");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async (qq) => {
    try {
      const { data } = await api.get(`/users/directory?q=${encodeURIComponent(qq)}&limit=24`);
      setItems(data.items || []);
    } catch (e) { setErr(apiErr(e)); }
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => { const t = setTimeout(() => load(q.trim()), 350); return () => clearTimeout(t); }, [q, load]);

  const send = async (uid) => {
    setBusy(uid);
    try {
      await api.post("/games/challenges", { to_user_id: uid, game });
      toast.success("أُرسل التحدي ⚔️ خصمك سيُشعَر فوراً");
      onDone();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(""); }
  };

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div data-testid="challenge-picker"
        initial={{ y: 60, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[1.75rem] sm:rounded-[1.75rem] bg-white p-5 sm:p-6 ft-shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-head font-black text-xl">اختر خصمك واللعبة</h3>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 hover:bg-slate-200" aria-label="إغلاق"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {Object.entries(GAME_META).map(([k, M]) => (
            <button key={k} onClick={() => setGame(k)}
              className={`flex items-center gap-2.5 rounded-2xl p-3.5 ring-2 transition text-start ${game === k ? "ring-slate-900 bg-slate-900 text-white" : "ring-slate-200 hover:ring-slate-300"}`}>
              <M.icon className="w-5 h-5 shrink-0" />
              <span className="font-head font-black text-sm">{M.name}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم طالب…"
            className="w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200 py-3 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        {err && <p className="text-rose-500 text-xs mt-2">{err}</p>}

        <div className="mt-3 space-y-1.5">
          {items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-slate-50 transition">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                : <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white grid place-items-center font-black">{(u.name || "ط")[0]}</span>}
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm truncate">{u.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{u.school || ""} · {u.xp ?? 0} XP</p>
              </div>
              <button data-testid="challenge-send-btn" disabled={busy === u.id} onClick={() => send(u.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-black disabled:opacity-50 transition hover:scale-[1.03] active:scale-95">
                <Send className="w-3.5 h-3.5" /> تحدَّه
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-center text-slate-400 text-sm py-6">لا نتائج مطابقة</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlayArena({ sess, onClose }) {
  const c = sess.challenge;
  const [play, setPlay] = useState(null);
  const [err, setErr] = useState("");
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [left, setLeft] = useState(60);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    api.post(`/games/challenges/${c.id}/play`).then(({ data }) => {
      setPlay(data);
      if (data.game === "math") {
        setLeft(data.seconds || 60);
        timer.current = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
      }
    }).catch((e) => setErr(apiErr(e)));
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const submitMath = useCallback(async (ans) => {
    clearInterval(timer.current);
    try {
      const { data } = await api.post(`/games/challenges/${c.id}/submit`, { answers: ans });
      setResult(data);
    } catch (e) { setErr(apiErr(e)); }
  }, [c.id]);

  useEffect(() => {
    if (play?.game === "math" && left === 0 && !result) submitMath(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const pick = (val) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
    if (idx + 1 < play.questions.length) setIdx(idx + 1);
    else submitMath(next);
  };

  const submitTyping = async () => {
    try {
      const { data } = await api.post(`/games/challenges/${c.id}/submit`, { typed });
      setResult(data);
    } catch (e) { setErr(apiErr(e)); }
  };

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={result ? onClose : undefined} />
      <motion.div data-testid="challenge-arena"
        initial={{ y: 40, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-[1.75rem] bg-white p-5 sm:p-7 ft-shadow-lg">
        {!play && !err && <p className="text-center text-slate-400 py-10">تجهيز ساحة التحدي…</p>}
        {err && (
          <div className="text-center py-8">
            <p className="text-rose-500 font-bold">{err}</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-slate-900 text-white px-5 py-2.5 font-black">إغلاق</button>
          </div>
        )}

        {play && !result && play.game === "math" && (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-head font-black">سؤال {idx + 1} / {play.questions.length}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${left <= 10 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>
                <Clock className="w-3.5 h-3.5" /> {left} ث
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
              <div className="h-full bg-gradient-to-l from-blue-500 to-violet-500 transition-all duration-300" style={{ width: `${((idx) / play.questions.length) * 100}%` }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}>
                <p dir="ltr" className="text-center font-head font-black text-4xl sm:text-5xl py-8">{play.questions[idx]} = ؟</p>
                <MathPad onPick={pick} />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {play && !result && play.game === "typing" && (
          <TypingDuel text={play.text} lang={play.lang} typed={typed} setTyped={setTyped} onDone={submitTyping} />
        )}

        {result && <ChallengeResult r={result} onClose={onClose} />}
      </motion.div>
    </motion.div>
  );
}

function MathPad({ onPick }) {
  const [val, setVal] = useState("");
  const press = (d) => {
    if (d === "del") setVal((v) => v.slice(0, -1));
    else if (d === "ok") { if (val !== "" && val !== "-") { onPick(parseInt(val, 10)); setVal(""); } }
    else if (d === "-") setVal((v) => (v === "" ? "-" : v));
    else if (val.replace("-", "").length < 6) setVal((v) => v + d);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "del"];
  return (
    <div>
      <div dir="ltr" data-testid="challenge-answer-view" className="mx-auto w-40 rounded-2xl bg-slate-900 text-white text-center font-head font-black text-3xl py-3 min-h-[64px]">
        {val || "…"}
      </div>
      <div dir="ltr" className="grid grid-cols-3 gap-2 mt-4 max-w-xs mx-auto">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)}
            className="rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition font-head font-black text-xl py-3.5">
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>
      <button data-testid="challenge-answer-ok" onClick={() => press("ok")}
        className="mt-3 w-full max-w-xs mx-auto block rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 text-white font-head font-black py-3.5 transition hover:scale-[1.02] active:scale-95">
        تأكيد الإجابة
      </button>
    </div>
  );
}

function TypingDuel({ text, lang, typed, setTyped, onDone }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const chars = text.split("");
  return (
    <div>
      <p className="font-head font-black flex items-center gap-2"><Keyboard className="w-5 h-5 text-emerald-600" /> اكتب النص كاملاً ثم اضغط إنهاء</p>
      <div dir={lang === "ar" ? "rtl" : "ltr"} className="mt-4 rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 leading-loose text-lg font-bold select-none">
        {chars.map((ch, i) => {
          let cls = "text-slate-400";
          if (i < typed.length) cls = typed[i] === ch ? "text-emerald-600" : "text-rose-500 bg-rose-100 rounded";
          else if (i === typed.length) cls = "text-slate-900 bg-amber-200 rounded px-0.5";
          return <span key={i} className={cls}>{ch}</span>;
        })}
      </div>
      <textarea ref={inputRef} data-testid="challenge-type-input" value={typed} rows={3}
        onChange={(e) => setTyped(e.target.value.slice(0, text.length))}
        onPaste={(e) => e.preventDefault()}
        placeholder="اكتب هنا… اللصق معطّل"
        className="mt-3 w-full rounded-2xl ring-1 ring-slate-200 p-3.5 outline-none focus:ring-2 focus:ring-emerald-500 text-base" />
      <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
        <div className="h-full bg-gradient-to-l from-emerald-500 to-cyan-500 transition-all" style={{ width: `${(typed.length / text.length) * 100}%` }} />
      </div>
      <button data-testid="challenge-type-done" disabled={typed.length < 8} onClick={onDone}
        className="mt-4 w-full rounded-2xl bg-gradient-to-l from-emerald-600 to-cyan-700 text-white font-head font-black py-3.5 disabled:opacity-40 transition hover:scale-[1.01] active:scale-95">
        إنهاء وإرسال النتيجة
      </button>
    </div>
  );
}

function ChallengeResult({ r, onClose }) {
  const { user } = useAuth();
  const done = r.status === "done";
  const my = r.my_result || {};
  const opp = r.opp_result;
  const won = done && opp && my.score > opp.score;
  const myXp = done && r.payouts && user ? r.payouts[user.id] : null;
  return (
    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: EASE }} className="text-center py-4" data-testid="challenge-result">
      <motion.div initial={{ rotate: -8, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 14 }}
        className={`mx-auto w-20 h-20 rounded-full grid place-items-center ${done && won ? "bg-amber-100" : "bg-slate-100"}`}>
        <Trophy className={`w-10 h-10 ${done && won ? "text-amber-500" : "text-slate-400"}`} />
      </motion.div>
      <h3 className="font-head font-black text-2xl mt-4">
        {done ? (r.winner === "draw" ? "تعادل! 🤝" : won ? "فزت بالتحدي! 🏆" : opp || my ? "انتهى التحدي" : "انتهى") : "أرسلت نتيجتك ⚔️"}
      </h3>
      <p className="text-slate-500 text-sm mt-1">
        {done ? "حُسمت النتيجة ووُزعت نقاط الخبرة" : "نتيجتك محفوظة بأمان · ستُحسم الجولة عندما يلعب خصمك حصته"}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 max-w-sm mx-auto">
        <div className="rounded-2xl bg-slate-900 text-white p-4">
          <p className="text-[11px] text-slate-300 font-bold">نتيجتي</p>
          <p className="font-head font-black text-3xl mt-1">{my.score ?? "—"}</p>
          {r.game === "typing" && my.wpm != null && <p className="text-[11px] text-slate-300 mt-1">{my.wpm} كلمة/د · دقة {my.accuracy}%</p>}
          {r.game === "math" && my.correct != null && <p className="text-[11px] text-slate-300 mt-1">{my.correct}/{my.total} صحيحة</p>}
        </div>
        <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
          <p className="text-[11px] text-slate-400 font-bold">{r.opp_name}</p>
          <p className="font-head font-black text-3xl mt-1">{done && opp ? opp.score : "؟؟"}</p>
          <p className="text-[11px] text-slate-400 mt-1">{done ? "النتيجة النهائية" : "مخفي حتى يلعب"}</p>
        </div>
      </div>
      {done && myXp != null && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 px-4 py-1.5 text-sm font-black">
          <Zap className="w-4 h-4" /> حصتك من الجائزة: +{myXp} XP
        </p>
      )}
      <button onClick={onClose} className="mt-6 w-full max-w-sm mx-auto block rounded-2xl bg-slate-900 text-white font-head font-black py-3.5 transition hover:scale-[1.01] active:scale-95">
        عودة إلى التحديات
      </button>
      <Link to="/games" className="block mt-3 text-sm font-black text-slate-400 hover:text-slate-700">إلى ساحة الألعاب</Link>
    </motion.div>
  );
}
