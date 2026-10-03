import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Copy, Check, Play, ArrowLeft, Users, Crown,
  Trophy, Medal, Timer, Radio, LogIn, Sparkles, ChevronLeft, Loader2,
  HelpCircle, Star,
} from "lucide-react";

/* مسابقات حية · a host builds a quiz, shares a short room code, and everyone
   races the 20-second clock. The room screen polls the server every 1.5s:
   lobby -> running -> finished podium. */

const QUESTION_SECONDS = 20;

const blankQuestion = () => ({ q: "", options: ["", "", "", ""], correct: 0 });

function normPlayers(room) {
  const list = room?.players || room?.participants || room?.scores || [];
  return (Array.isArray(list) ? list : []).map((p) => ({
    name: p.name || p.user_name || "لاعب",
    score: Number(p.score ?? p.points ?? 0),
  })).sort((a, b) => b.score - a.score);
}

/* game-show answer tiles · one identity per index (visual only) */
const TILES = [
  {
    badge: "bg-rose-500 shadow-rose-300",
    badgeShape: "rounded-[10px]",
    letterCls: "",
    tile: "hover:border-rose-400 hover:bg-rose-50/70 hover:shadow-rose-200/70",
    mine: "border-transparent bg-gradient-to-l from-rose-500 to-rose-400 text-white shadow-xl shadow-rose-300/70",
  },
  {
    badge: "bg-sky-500 shadow-sky-300",
    badgeShape: "rotate-45 rounded-[10px]",
    letterCls: "-rotate-45",
    tile: "hover:border-sky-400 hover:bg-sky-50/70 hover:shadow-sky-200/70",
    mine: "border-transparent bg-gradient-to-l from-sky-500 to-sky-400 text-white shadow-xl shadow-sky-300/70",
  },
  {
    badge: "bg-amber-500 shadow-amber-300",
    badgeShape: "rounded-full",
    letterCls: "",
    tile: "hover:border-amber-400 hover:bg-amber-50/80 hover:shadow-amber-200/70",
    mine: "border-transparent bg-gradient-to-l from-amber-500 to-amber-400 text-white shadow-xl shadow-amber-300/70",
  },
  {
    badge: "bg-emerald-500 shadow-emerald-300",
    badgeShape: "[clip-path:polygon(50%_2%,98%_98%,2%_98%)]",
    letterCls: "translate-y-[4px] text-[11px]",
    tile: "hover:border-emerald-400 hover:bg-emerald-50/70 hover:shadow-emerald-200/70",
    mine: "border-transparent bg-gradient-to-l from-emerald-500 to-emerald-400 text-white shadow-xl shadow-emerald-300/70",
  },
];

const AVATAR_GRADS = [
  "from-indigo-500 to-violet-500",
  "from-rose-500 to-orange-400",
  "from-sky-500 to-cyan-400",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-400",
  "from-fuchsia-500 to-pink-500",
];

const LETTERS = ["أ", "ب", "ج", "د"];

export default function QuizLive() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [screen, setScreen] = useState("home"); // home | room
  const [code, setCode] = useState("");

  if (user === null) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      {screen === "room" && code ? (
        <RoomScreen code={code} onLeave={() => { setScreen("home"); setCode(""); }} />
      ) : (
        <HomeScreen
          authed={!!user}
          onNeedLogin={() => nav("/login")}
          onEnter={(c) => { setCode(c); setScreen("room"); }}
        />
      )}
    </Layout>
  );
}

/* ------------------------------ home: create / join ------------------------------ */

function HomeScreen({ authed, onNeedLogin, onEnter }) {
  const [tab, setTab] = useState("create");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const setQ = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, oi, val) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, options: q.options.map((o, k) => (k === oi ? val : o)) } : q)));
  const addQ = () => setQuestions((qs) => [...qs, blankQuestion()]);
  const delQ = (i) => setQuestions((qs) => (qs.length > 1 ? qs.filter((_, j) => j !== i) : qs));

  const create = async () => {
    if (!authed) return onNeedLogin();
    const clean = questions
      .map((q) => ({ q: q.q.trim(), options: q.options.map((o) => o.trim()), correct: q.correct }))
      .filter((q) => q.q && q.options.every(Boolean));
    if (!title.trim()) return toast.error("أدخل عنوان المسابقة");
    if (clean.length === 0) return toast.error("أضف سؤالاً واحداً مكتملًا على الأقل (سؤال + ٤ خيارات)");
    setCreating(true);
    try {
      const { data } = await api.post("/quiz-live/rooms", { title: title.trim(), questions: clean });
      const c = data?.code || data?.room?.code || data?.room_code || "";
      if (!c) throw new Error("no-code");
      setCreatedCode(c);
      toast.success("أُنشئت الغرفة · شارك الرمز مع اللاعبين");
    } catch (e) { toast.error(apiErr(e)); }
    setCreating(false);
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(createdCode); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  const join = async () => {
    if (!authed) return onNeedLogin();
    const c = joinCode.trim().toUpperCase();
    if (!c) return toast.error("أدخل رمز الغرفة");
    setJoining(true);
    try {
      await api.post(`/quiz-live/rooms/${encodeURIComponent(c)}/join`);
      onEnter(c);
    } catch (e) { toast.error(apiErr(e)); }
    setJoining(false);
  };

  return (
    <div>
      {/* hero · event stage */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-indigo-950 to-slate-900 text-white grain">
        <div className="pointer-events-none absolute -top-24 right-[15%] w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-[10%] w-80 h-80 rounded-full ft-bg-soft blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute top-1/3 left-[38%] w-40 h-40 rounded-full bg-violet-400/10 blur-3xl" aria-hidden="true" />
        <Zap className="pointer-events-none absolute -left-8 bottom-4 w-52 h-52 text-indigo-300/[0.07] rotate-12" aria-hidden="true" />
        <Zap className="pointer-events-none absolute right-[6%] -top-10 w-32 h-32 text-indigo-300/[0.05] -rotate-12 hidden sm:block" aria-hidden="true" />
        {/* floating question motifs */}
        <HelpCircle className="pointer-events-none absolute right-[10%] top-10 w-10 h-10 text-indigo-200/25 animate-bounce" style={{ animationDuration: "5.5s" }} aria-hidden="true" />
        <HelpCircle className="pointer-events-none absolute left-[14%] top-16 w-7 h-7 text-violet-200/20 animate-bounce hidden sm:block" style={{ animationDuration: "7s", animationDelay: "0.8s" }} aria-hidden="true" />
        <HelpCircle className="pointer-events-none absolute left-[30%] bottom-8 w-8 h-8 text-indigo-200/[0.16] animate-bounce hidden md:block" style={{ animationDuration: "6.2s", animationDelay: "1.6s" }} aria-hidden="true" />
        <span className="pointer-events-none absolute right-[28%] bottom-10 w-12 h-12 rounded-full border border-white/[0.13] animate-bounce hidden lg:block" style={{ animationDuration: "8s", animationDelay: "0.4s" }} aria-hidden="true" />
        <span className="pointer-events-none absolute left-[6%] bottom-20 w-6 h-6 rounded-full bg-violet-300/10 animate-bounce hidden md:block" style={{ animationDuration: "6.8s", animationDelay: "2s" }} aria-hidden="true" />
        {/* floor glow */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-500/[0.13] to-transparent" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 text-center">
          <span className="relative inline-grid place-items-center w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-400 to-violet-600 text-white shadow-[0_16px_36px_-10px_rgba(99,102,241,0.8)] mb-4 animate-fade-up">
            <span className="absolute inset-0 rounded-3xl bg-indigo-400/30 animate-ping [animation-duration:2.6s]" aria-hidden="true" />
            <Zap className="relative w-7 h-7" />
          </span>
          <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black animate-fade-up d-1">مسابقات حية</h1>
          <p className="text-slate-300/90 mt-3 max-w-xl mx-auto leading-relaxed animate-fade-up d-2">
            أنشئ مسابقة، شارك الرمز، وتحدَّ أصدقاءك في سباق سرعة · ٢٠ ثانية لكل سؤال
          </p>
          <span className="inline-flex items-center gap-1.5 mt-5 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold animate-fade-up d-2">
            <Radio className="w-3.5 h-3.5 text-rose-300" /> غرف لحظية بنتائج مباشرة
          </span>
        </div>
        <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-l from-transparent via-indigo-400/60 to-transparent" aria-hidden="true" />
      </div>

      <div className="max-w-[1100px] xl:max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!authed && (
          <div className="mb-6 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center gap-3 animate-fade-up">
            <p className="text-sm font-bold text-amber-800 flex-1 min-w-[220px]">سجّل دخولك لإنشاء غرفة أو الانضمام إلى مسابقة.</p>
            <Button onClick={onNeedLogin} className="rounded-xl ft-btn-primary text-white min-h-[44px]"><LogIn className="w-4 h-4 ml-1" /> تسجيل الدخول</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
        {/* tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-white border border-slate-100 ft-shadow p-2 animate-fade-up">
          {[{ id: "create", label: "إنشاء مسابقة", icon: Sparkles }, { id: "join", label: "انضم برمز", icon: Users }].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`quiz-tab-${id}`}
              className={`min-h-[52px] rounded-2xl font-head font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition ${tab === id ? "ft-btn-primary text-white shadow-lg shadow-indigo-500/25" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <div className="relative overflow-hidden mt-6 rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-7 animate-fade-up d-1">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 via-violet-500 to-indigo-500" aria-hidden="true" />
            <label className="text-sm font-extrabold text-slate-700">عنوان المسابقة</label>
            <Input
              data-testid="quiz-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحدّي الثقافة العامة"
              className="mt-2 rounded-2xl h-[52px] text-base shadow-sm"
              maxLength={80}
            />

            <div className="mt-7 space-y-5">
              {questions.map((q, i) => (
                <div key={i} className="relative rounded-[22px] border border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/40 p-4 sm:p-5 shadow-sm ring-1 ring-white transition hover:ring-indigo-100 hover:shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-head grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-black shrink-0 shadow-md shadow-indigo-500/30">{i + 1}</span>
                    <Input
                      data-testid={`quiz-q-${i}`}
                      value={q.q}
                      onChange={(e) => setQ(i, { q: e.target.value })}
                      placeholder="نص السؤال…"
                      className="rounded-xl bg-white h-11 flex-1 shadow-sm"
                      maxLength={300}
                    />
                    <button
                      onClick={() => delQ(i)}
                      disabled={questions.length <= 1}
                      className="w-10 h-10 grid place-items-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition disabled:opacity-30 shrink-0"
                      aria-label="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer ${q.correct === oi ? "border-emerald-300 bg-emerald-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <span className={`grid place-items-center w-6 h-6 rounded-lg text-[11px] font-black shrink-0 ${TILES[oi].badge} ${TILES[oi].badgeShape}`}>
                          <span className={`text-white ${TILES[oi].letterCls}`}>{LETTERS[oi]}</span>
                        </span>
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={q.correct === oi}
                          onChange={() => setQ(i, { correct: oi })}
                          className="accent-emerald-600 w-4 h-4 shrink-0"
                          aria-label="الإجابة الصحيحة"
                        />
                        <Input
                          data-testid={`quiz-q-${i}-opt-${oi}`}
                          value={opt}
                          onChange={(e) => setOpt(i, oi, e.target.value)}
                          placeholder={`خيار ${oi + 1}`}
                          className="border-0 shadow-none focus-visible:ring-0 h-9 px-1 bg-transparent flex-1"
                          maxLength={120}
                        />
                        {q.correct === oi && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-2">حدّد الدائرة بجانب الإجابة الصحيحة.</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button onClick={addQ} variant="outline" className="rounded-xl min-h-[48px] font-bold"><Plus className="w-4 h-4 ml-1" /> أضف سؤالاً</Button>
              <Button
                data-testid="quiz-create-btn"
                onClick={create}
                disabled={creating}
                className="rounded-xl ft-btn-primary text-white min-h-[48px] font-extrabold px-7 shadow-lg shadow-indigo-500/30"
              >
                {creating ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Play className="w-4 h-4 ml-1" />}
                إنشاء الغرفة
              </Button>
            </div>

            {createdCode && (
              <div className="mt-7 rounded-[24px] overflow-hidden border border-indigo-300/40 shadow-[0_24px_50px_-20px_rgba(79,70,229,0.55)] animate-fade-up">
                <div className="relative bg-gradient-to-b from-slate-950 via-indigo-950 to-indigo-900 text-white px-5 py-7 sm:py-8 text-center grain overflow-hidden">
                  <Zap className="pointer-events-none absolute -right-4 -bottom-8 w-28 h-28 text-white/[0.08] rotate-12" aria-hidden="true" />
                  {/* floodlight dots */}
                  <div className="pointer-events-none absolute top-4 inset-x-0 flex justify-center gap-2.5" aria-hidden="true">
                    {[...Array(7)].map((_, d) => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-200/50 shadow-[0_0_10px_2px_rgba(253,230,138,0.35)]" />
                    ))}
                  </div>
                  <div className="relative mt-2 text-xs font-bold text-indigo-100">رمز الغرفة · شاركه مع اللاعبين</div>
                  <div className="relative font-head text-6xl sm:text-7xl font-black tracking-[0.18em] mt-3 tabular-nums [text-shadow:0_0_34px_rgba(129,140,248,0.65)]" dir="ltr">{createdCode}</div>
                  <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
                    <button onClick={copyCode} className="pressable inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-4 py-2 text-sm font-extrabold min-h-[44px] transition">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "نُسخ!" : "نسخ الرمز"}
                    </button>
                    <button onClick={() => onEnter(createdCode)} className="pressable inline-flex items-center gap-1.5 rounded-xl bg-white text-indigo-700 px-4 py-2 text-sm font-extrabold min-h-[44px] shadow transition hover:bg-indigo-50">
                      دخول الغرفة <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden mt-6 rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-7 animate-fade-up d-1">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 via-violet-500 to-indigo-500" aria-hidden="true" />
            <label className="text-sm font-extrabold text-slate-700">رمز الغرفة</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2.5">
              <Input
                data-testid="quiz-join-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="مثال: K7QX2"
                className="rounded-2xl text-center text-2xl sm:text-3xl font-black tracking-[0.3em] tabular-nums flex-1 py-4 shadow-inner bg-slate-50/60"
                maxLength={10}
                dir="ltr"
              />
              <Button
                data-testid="quiz-join-btn"
                onClick={join}
                disabled={joining || !joinCode.trim()}
                className="rounded-2xl ft-btn-primary text-white min-h-[56px] font-extrabold px-8 shadow-lg shadow-indigo-500/30"
              >
                {joining ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <LogIn className="w-4 h-4 ml-1" />}
                انضم الآن
              </Button>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-3">احصل على الرمز من مضيف المسابقة ثم انضم قبل أن تبدأ الجولة.</p>
          </div>
        )}
        </div>

        {/* how-to rail */}
        <aside className="hidden lg:block sticky top-24">
          <div className="relative overflow-hidden bg-white rounded-[1.75rem] border border-slate-100 ft-shadow-lg p-6">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 to-violet-500" />
            <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center shadow-md shadow-indigo-500/25"><Sparkles className="w-4 h-4" /></span>
              كيف تلعب؟
            </h3>
            <ul className="mt-5 space-y-4 text-[13px] leading-relaxed text-slate-500">
              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-xl ft-icon-tile grid place-items-center font-head text-xs font-extrabold shrink-0 shadow">١</span>
                <span><b className="text-slate-700">أنشئ مسابقة أو انضم برمز</b> · جهّز أسئلتك أو اطلب الرمز من المضيف</span>
              </li>
              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-xl ft-icon-tile grid place-items-center font-head text-xs font-extrabold shrink-0 shadow">٢</span>
                <span><b className="text-slate-700">شارك الرمز مع أصدقائك</b> · وانتظر انضمام اللاعبين في غرفة الانتظار</span>
              </li>
              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shrink-0 shadow-md shadow-amber-500/25"><Timer className="w-3.5 h-3.5" /></span>
                <span><b className="text-slate-700">أجب بسرعة ودقة</b> · ٢٠ ثانية لكل سؤال والنقاط تصعد مباشرة</span>
              </li>
            </ul>
            <div className="mt-5 rounded-2xl bg-indigo-50/70 ring-1 ring-indigo-100 px-4 py-3 flex items-center gap-2 text-[12px] font-bold text-indigo-700">
              <Radio className="w-4 h-4 shrink-0" /> غرف لحظية بنتائج مباشرة
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ room (polled) ------------------------------ */

function RoomScreen({ code, onLeave }) {
  const [room, setRoom] = useState(null);
  const [err, setErr] = useState(false);
  const [answeredFor, setAnsweredFor] = useState(-1); // question index I answered
  const [myAnswer, setMyAnswer] = useState(null);
  const [remain, setRemain] = useState(QUESTION_SECONDS);
  const [busy, setBusy] = useState("");
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/quiz-live/rooms/${encodeURIComponent(code)}`);
      if (aliveRef.current) { setRoom(data?.room || data); setErr(false); }
    } catch { if (aliveRef.current) setErr(true); }
  }, [code]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    const t = setInterval(load, 1500);
    return () => { aliveRef.current = false; clearInterval(t); };
  }, [load]);

  const status = room?.status || room?.state || "lobby";
  const isHost = !!(room?.is_host ?? room?.host);
  const players = useMemo(() => normPlayers(room), [room]);
  const q = room?.question || room?.current_question || null;
  const qIndex = room?.question_index ?? q?.index ?? 0;
  const totalQ = room?.total_questions ?? q?.total ?? room?.questions_count ?? 0;
  const endsAt = q?.ends_at || room?.ends_at || null;
  const topScore = players.length ? players[0].score : 0;

  // countdown ticker
  useEffect(() => {
    if (!endsAt || status !== "running") return;
    const tick = () => setRemain(Math.max(0, (new Date(endsAt).getTime() - Date.now()) / 1000));
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [endsAt, status, qIndex]);

  const answer = async (idx) => {
    if (answeredFor === qIndex || busy) return;
    setAnsweredFor(qIndex); setMyAnswer(idx);
    try { await api.post(`/quiz-live/rooms/${encodeURIComponent(code)}/answer`, { index: idx }); }
    catch (e) { toast.error(apiErr(e)); setAnsweredFor(-1); setMyAnswer(null); }
  };

  const hostAction = async (action) => {
    setBusy(action);
    try { await api.post(`/quiz-live/rooms/${encodeURIComponent(code)}/${action}`); load(); }
    catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };

  if (!room && !err) return <PageLoader />;

  const remainFrac = Math.max(0, Math.min(1, remain / QUESTION_SECONDS));
  const RING_C = 2 * Math.PI * 20;

  return (
    <div className="max-w-[980px] lg:max-w-[1180px] xl:max-w-[1340px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <button onClick={onLeave} className="pressable min-h-[44px] text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1 font-bold">
        <ArrowLeft className="w-4 h-4 rotate-180" /> مغادرة الغرفة
      </button>

      {err && !room ? (
        <div className="max-w-md mx-auto rounded-[24px] bg-white border border-slate-100 ft-shadow-lg px-6 py-10 text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-rose-50 text-rose-500 mb-3"><Zap className="w-7 h-7" /></span>
          <h2 className="font-head text-lg font-black text-slate-900">تعذر الاتصال بالغرفة</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">تحقق من الرمز أو من اتصالك ثم حاول مجدداً.</p>
          <Button onClick={load} className="mt-5 rounded-2xl ft-btn-primary px-5 py-2.5 text-sm font-extrabold min-h-[44px]">إعادة المحاولة</Button>
        </div>
      ) : (
        <>
          {/* header · stadium board */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-600 text-white px-5 sm:px-7 py-5 sm:py-6 ft-shadow-lg flex flex-wrap items-center gap-4 grain">
            <Zap className="pointer-events-none absolute -left-6 -bottom-10 w-36 h-36 text-white/[0.07] rotate-12" aria-hidden="true" />
            <HelpCircle className="pointer-events-none absolute left-[38%] -top-6 w-20 h-20 text-white/[0.05] -rotate-12 hidden md:block" aria-hidden="true" />
            <div className="min-w-0 flex-1 relative">
              <h1 className="font-head text-xl sm:text-2xl lg:text-3xl font-black truncate">{room?.title || "مسابقة حية"}</h1>
              <div className="text-indigo-100 text-xs font-bold mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {players.length} لاعب</span>
                {isHost && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2 py-0.5"><Crown className="w-3 h-3" /> أنت المضيف</span>}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2 py-0.5">
                  {status === "lobby" ? "في الانتظار" : status === "running" ? "جارية الآن" : "انتهت"}
                </span>
              </div>
            </div>
            <div className="relative shrink-0 rounded-2xl bg-slate-950/35 border border-white/25 px-4 sm:px-5 py-2.5 text-center shadow-inner backdrop-blur-sm">
              <div className="flex justify-center gap-1.5 mb-1" aria-hidden="true">
                {[...Array(5)].map((_, d) => (
                  <span key={d} className="w-1 h-1 rounded-full bg-amber-200/60" />
                ))}
              </div>
              <div className="text-[10px] font-bold text-indigo-100">رمز الغرفة</div>
              <div className="font-head text-3xl sm:text-4xl font-black tracking-[0.15em] tabular-nums [text-shadow:0_0_22px_rgba(129,140,248,0.7)]" dir="ltr">{code}</div>
            </div>
          </div>

          {/* LOBBY */}
          {status === "lobby" && (
            <div className="relative overflow-hidden mt-6 rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-7 animate-fade-up">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 to-violet-500" />
              <h2 className="font-head font-extrabold text-lg sm:text-xl text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 ft-text-accent" /> اللاعبون في الانتظار ({players.length})</h2>

              {/* avatar stack */}
              {players.length > 0 && (
                <div className="mt-5 flex items-center">
                  {players.slice(0, 8).map((p, i) => (
                    <span
                      key={i}
                      title={p.name}
                      style={{ marginInlineStart: i === 0 ? 0 : "-0.65rem", zIndex: 20 - i, animationDelay: `${Math.min(i, 8) * 60}ms` }}
                      className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} text-white grid place-items-center font-head text-sm font-black ring-[3px] ring-white shadow-md animate-fade-up`}
                    >
                      {p.name?.[0] || "؟"}
                    </span>
                  ))}
                  {players.length > 8 && (
                    <span style={{ marginInlineStart: "-0.65rem", zIndex: 10 }} className="relative w-11 h-11 rounded-full bg-slate-800 text-white grid place-items-center font-head text-xs font-black ring-[3px] ring-white shadow-md">
                      +{players.length - 8}
                    </span>
                  )}
                </div>
              )}

              {players.length === 0 ? (
                <div className="mt-6 flex flex-col items-center text-center py-4">
                  <span className="relative grid place-items-center w-16 h-16">
                    <span className="absolute inset-0 rounded-full bg-indigo-100 animate-ping [animation-duration:2.2s]" aria-hidden="true" />
                    <span className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center shadow-lg shadow-indigo-500/30"><Users className="w-6 h-6" /></span>
                  </span>
                  <p className="text-sm text-slate-400 mt-4">لا لاعبين بعد · شارك الرمز وانتظر انضمام أصدقائك.</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <span key={i} style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }} className="inline-flex items-center gap-2 rounded-full ft-bg-soft border ft-border-accent ps-1.5 pe-3.5 py-1.5 text-sm font-bold text-slate-700 animate-fade-up shadow-sm">
                      <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} text-white grid place-items-center text-[11px] font-black shadow`}>{p.name?.[0] || "؟"}</span>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
              {isHost ? (
                <Button
                  data-testid="quiz-start-btn"
                  onClick={() => hostAction("start")}
                  disabled={busy === "start"}
                  className="mt-7 rounded-2xl ft-btn-primary text-white min-h-[56px] px-9 text-base font-extrabold shadow-[0_20px_44px_-12px_rgba(99,102,241,0.75)] ring-1 ring-white/30 w-full sm:w-auto hover:scale-[1.02] active:scale-[0.99] transition-transform"
                >
                  {busy === "start" ? <Loader2 className="w-5 h-5 ml-1 animate-spin" /> : <Play className="w-5 h-5 ml-1" />}
                  ابدأ المسابقة
                </Button>
              ) : (
                <div className="mt-7 flex items-center gap-3">
                  <span className="flex items-end gap-1.5" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <span key={d} style={{ animationDelay: `${d * 180}ms` }} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                    ))}
                  </span>
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-400">بانتظار أن يبدأ المضيف…</p>
                </div>
              )}
            </div>
          )}

          {/* RUNNING */}
          {status === "running" && (
            <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              {/* mobile sticky score strip */}
              {players.length > 0 && (
                <div className="lg:hidden sticky top-[84px] z-20 flex items-center gap-2 overflow-x-auto rounded-full glass ring-1 ring-slate-200/80 shadow-md px-3 py-2">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  {players.slice(0, 3).map((p, i) => (
                    <span key={i} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${i === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                      <span className="tabular-nums">{i + 1}</span> {p.name} · <span className="tabular-nums">{p.score}</span>
                    </span>
                  ))}
                </div>
              )}

              <div key={qIndex} className="relative overflow-hidden rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-7 lg:p-9 animate-fade-up flex flex-col">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 to-violet-500" />
                {/* meta row · question counter + countdown ring */}
                <div className="sticky top-[84px] lg:top-0 z-10 flex items-center justify-between gap-3 glass rounded-full ps-4 pe-2 py-1.5 ring-1 ring-slate-100 shadow-sm">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-500">السؤال {qIndex + 1}{totalQ ? ` من ${totalQ}` : ""}</span>
                  <span className={`relative grid place-items-center w-12 h-12 shrink-0 ${remain <= 5 ? "animate-pulse" : ""}`}>
                    <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" fill="none" strokeWidth="5" className="stroke-slate-100" />
                      <circle
                        cx="24" cy="24" r="20" fill="none" strokeWidth="5" strokeLinecap="round"
                        className={`transition-[stroke-dashoffset] duration-200 ${remain <= 5 ? "stroke-rose-500" : "stroke-indigo-500"}`}
                        strokeDasharray={RING_C}
                        strokeDashoffset={RING_C * (1 - remainFrac)}
                      />
                    </svg>
                    <span className={`absolute font-head text-sm font-black tabular-nums ${remain <= 5 ? "text-rose-500" : "text-slate-700"}`}>{Math.ceil(remain)}</span>
                  </span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ${remain <= 5 ? "bg-rose-500 animate-pulse" : "bg-gradient-to-l from-indigo-500 to-violet-500"}`}
                    style={{ width: `${Math.max(0, Math.min(100, remainFrac * 100))}%` }}
                  />
                </div>

                {q ? (
                  <>
                    <h2 className="font-head text-2xl sm:text-3xl lg:text-[2.6rem] font-black text-slate-900 leading-snug lg:leading-snug mt-6 lg:mt-8">{q.q || q.text || q.question}</h2>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-7 lg:mt-9">
                      {(q.options || []).map((opt, i) => {
                        const mine = answeredFor === qIndex && myAnswer === i;
                        const locked = answeredFor === qIndex;
                        const t = TILES[i % TILES.length];
                        return (
                          <button
                            key={i}
                            data-testid={`quiz-answer-${i}`}
                            onClick={() => answer(i)}
                            disabled={locked}
                            className={`pressable min-h-[68px] sm:min-h-[76px] lg:min-h-[96px] rounded-[22px] border-2 px-4 py-3.5 text-right font-extrabold text-base lg:text-lg transition-all flex items-center gap-3.5 ${
                              mine
                                ? `${t.mine} scale-[1.02]`
                                : locked
                                  ? "border-slate-100 bg-slate-50 text-slate-400"
                                  : `border-slate-200 bg-white text-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 ${t.tile}`
                            }`}
                          >
                            <span className={`relative grid place-items-center w-10 h-10 sm:w-11 sm:h-11 shrink-0 ${mine ? "bg-white/25 shadow-inner" : `${t.badge} shadow-md`} ${t.badgeShape}`}>
                              <span className={`text-white text-sm sm:text-base font-black ${t.letterCls}`}>{LETTERS[i] || i + 1}</span>
                            </span>
                            <span className="flex-1">{opt}</span>
                            {mine && (
                              <span className="grid place-items-center w-7 h-7 rounded-full bg-white text-indigo-700 shadow shrink-0 animate-fade-up">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {answeredFor === qIndex && (
                      <div className="mt-6 flex items-center gap-3 animate-fade-up">
                        <p className="text-sm sm:text-base font-bold ft-text-accent flex items-center gap-1.5"><Check className="w-4 h-4" /> سُجّلت إجابتك · انتظر السؤال التالي</p>
                        <span className="flex items-end gap-1" aria-hidden="true">
                          {[0, 1, 2].map((d) => (
                            <span key={d} style={{ animationDelay: `${d * 180}ms` }} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                          ))}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-6 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحضير السؤال…</p>
                )}

                {isHost && (
                  <Button
                    data-testid="quiz-next-btn"
                    onClick={() => hostAction("next")}
                    disabled={busy === "next"}
                    className="mt-7 rounded-2xl ft-btn-primary text-white min-h-[52px] px-8 font-extrabold shadow-lg shadow-indigo-500/30 w-full sm:w-auto"
                  >
                    {busy === "next" ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <ChevronLeft className="w-4 h-4 ml-1" />}
                    السؤال التالي
                  </Button>
                )}
              </div>

              {/* live scores */}
              <div className="relative overflow-hidden rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 animate-fade-up d-1 lg:sticky lg:top-24">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-orange-400 to-amber-500" />
                <h3 className="font-head font-extrabold text-slate-900 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> النتائج المباشرة</h3>
                <div className="mt-4 space-y-2">
                  {players.slice(0, 10).map((p, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2 transition ${i === 0 ? "bg-amber-50 border border-amber-100 shadow-sm" : i === 1 ? "bg-slate-100/80 border border-slate-200/60" : i === 2 ? "bg-orange-50 border border-orange-100" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`font-head w-6 text-center text-sm font-black ${i === 0 ? "text-amber-600" : i === 1 ? "text-slate-500" : i === 2 ? "text-orange-600" : "text-slate-400"}`}>{i + 1}</span>
                        {i === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                        <span className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} text-white grid place-items-center text-[11px] font-black shrink-0`}>{p.name?.[0] || "؟"}</span>
                        <span className="flex-1 truncate text-sm font-bold text-slate-700">{p.name}</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums">{p.score}</span>
                      </div>
                      <div className="mt-1.5 ms-8 h-1 rounded-full bg-slate-200/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${i === 0 ? "bg-gradient-to-l from-amber-400 to-orange-400" : "bg-gradient-to-l from-indigo-400 to-violet-400"}`}
                          style={{ width: `${topScore > 0 ? Math.max(4, Math.round((p.score / topScore) * 100)) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-xs text-slate-400">لا نتائج بعد.</p>}
                </div>
              </div>
            </div>
          )}

          {/* FINISHED */}
          {status === "finished" && (
            <div className="mt-6 animate-fade-up">
              <div className="relative overflow-hidden rounded-[28px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-8 lg:p-10">
                <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-amber-400 via-orange-400 to-amber-500" />
                <Trophy className="pointer-events-none absolute -right-6 -top-8 w-32 h-32 text-amber-500/[0.05] rotate-12" aria-hidden="true" />
                {/* confetti accents */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden="true">
                  {[
                    { l: "6%", c: "bg-amber-400", d: "0s", r: "rotate-12" },
                    { l: "14%", c: "bg-indigo-400", d: "0.5s", r: "-rotate-12" },
                    { l: "24%", c: "bg-rose-400", d: "1.1s", r: "rotate-45" },
                    { l: "36%", c: "bg-emerald-400", d: "0.3s", r: "rotate-12" },
                    { l: "48%", c: "bg-amber-500", d: "0.9s", r: "-rotate-45" },
                    { l: "58%", c: "bg-sky-400", d: "0.2s", r: "rotate-45" },
                    { l: "68%", c: "bg-violet-400", d: "1.3s", r: "rotate-12" },
                    { l: "78%", c: "bg-orange-400", d: "0.6s", r: "-rotate-12" },
                    { l: "88%", c: "bg-rose-400", d: "1s", r: "rotate-45" },
                    { l: "94%", c: "bg-amber-400", d: "0.4s", r: "-rotate-45" },
                  ].map((p, i) => (
                    <span
                      key={i}
                      style={{ left: p.l, animationDelay: p.d, animationDuration: "2.8s" }}
                      className={`absolute top-3 w-2 h-3 rounded-[2px] opacity-60 animate-bounce ${p.c} ${p.r}`}
                    />
                  ))}
                </div>
                <h2 className="relative font-head text-center text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" /> النتائج النهائية
                </h2>
                {players.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 mt-4">انتهت المسابقة دون لاعبين.</p>
                ) : (
                  <>
                    {/* podium · stadium tiers */}
                    <div className="relative mt-10 flex items-end justify-center gap-3 sm:gap-6" dir="rtl">
                      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full bg-amber-300/20 blur-3xl" aria-hidden="true" />
                      {[players[1], players[0], players[2]].map((p, i) => {
                        if (!p) return <div key={i} className="w-24 sm:w-36" />;
                        const rank = [2, 1, 3][i];
                        const heights = ["h-24", "h-36", "h-16"];
                        const colors = [
                          "from-slate-300 to-slate-400",
                          "from-amber-300 via-amber-400 to-amber-500",
                          "from-orange-300 to-amber-600",
                        ];
                        const isWinner = rank === 1;
                        return (
                          <div key={i} style={{ animationDelay: `${i * 120}ms` }} className="relative w-24 sm:w-36 text-center animate-fade-up">
                            {isWinner && (
                              <>
                                <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-amber-300/40 blur-2xl" aria-hidden="true" />
                                <Crown className="relative w-8 h-8 text-amber-500 mx-auto mb-1 animate-bounce" />
                              </>
                            )}
                            <div className={`relative mx-auto rounded-full bg-gradient-to-br ${AVATAR_GRADS[(rank - 1) % AVATAR_GRADS.length]} text-white grid place-items-center font-black ring-4 shadow-lg ${isWinner ? "w-16 h-16 text-xl ring-amber-200 scale-110" : "w-11 h-11 ring-white"}`}>{p.name?.[0] || "؟"}</div>
                            <div className="font-head font-extrabold text-sm sm:text-base text-slate-800 mt-2 truncate">{p.name}</div>
                            <div className="text-xs sm:text-sm font-black text-amber-600 tabular-nums flex items-center justify-center gap-1">
                              {isWinner && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                              {p.score} نقطة
                            </div>
                            <div className={`relative mt-2.5 rounded-t-[20px] bg-gradient-to-b ${colors[i]} ${heights[i]} grid place-items-start justify-center pt-2.5 shadow-[inset_0_2px_10px_rgba(255,255,255,0.45)]`}>
                              <span className="font-head text-white font-black text-xl sm:text-2xl drop-shadow">{rank}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* full scores */}
                    <div className="mt-10 space-y-2 max-w-lg sm:max-w-xl mx-auto w-full">
                      {players.map((p, i) => (
                        <div key={i} className={`rounded-xl px-4 py-2.5 ${i < 3 ? "bg-amber-50/70 border border-amber-100" : "bg-slate-50"}`}>
                          <div className="flex items-center gap-3">
                            <span className="font-head w-7 text-center font-black text-slate-500">{i + 1}</span>
                            {i === 0 ? <Crown className="w-4 h-4 text-amber-500 shrink-0" /> : i < 3 ? <Medal className="w-4 h-4 text-slate-400 shrink-0" /> : <span className="w-4 shrink-0" />}
                            <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} text-white grid place-items-center text-xs font-black shrink-0`}>{p.name?.[0] || "؟"}</span>
                            <span className="flex-1 truncate text-sm font-bold text-slate-700">{p.name}</span>
                            <span className="text-sm font-black text-slate-900 tabular-nums">{p.score}</span>
                          </div>
                          <div className="mt-1.5 ms-10 h-1 rounded-full bg-slate-200/50 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-[width] duration-500 ${i === 0 ? "bg-gradient-to-l from-amber-400 to-orange-400" : "bg-gradient-to-l from-indigo-400 to-violet-400"}`}
                              style={{ width: `${topScore > 0 ? Math.max(4, Math.round((p.score / topScore) * 100)) : 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="text-center mt-10">
                  <Button onClick={onLeave} className="rounded-2xl ft-btn-primary text-white min-h-[52px] px-8 font-extrabold shadow-lg shadow-indigo-500/30">مسابقة جديدة</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
