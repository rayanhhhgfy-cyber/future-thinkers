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
      {/* hero */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-950 via-indigo-950 to-slate-900 text-white grain">
        <div className="pointer-events-none absolute -top-24 right-[15%] w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-[10%] w-80 h-80 rounded-full ft-bg-soft blur-3xl" aria-hidden="true" />
        <Zap className="pointer-events-none absolute -left-8 bottom-4 w-52 h-52 text-indigo-300/[0.07] rotate-12" aria-hidden="true" />
        <Zap className="pointer-events-none absolute right-[6%] -top-10 w-32 h-32 text-indigo-300/[0.05] -rotate-12 hidden sm:block" aria-hidden="true" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 text-center">
          <span className="inline-grid place-items-center w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-400 to-violet-600 text-white shadow-[0_16px_36px_-10px_rgba(99,102,241,0.8)] mb-4 animate-fade-up">
            <Zap className="w-7 h-7" />
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

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!authed && (
          <div className="mb-6 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 flex flex-wrap items-center gap-3 animate-fade-up">
            <p className="text-sm font-bold text-amber-800 flex-1 min-w-[220px]">سجّل دخولك لإنشاء غرفة أو الانضمام إلى مسابقة.</p>
            <Button onClick={onNeedLogin} className="rounded-xl ft-btn-primary text-white min-h-[44px]"><LogIn className="w-4 h-4 ml-1" /> تسجيل الدخول</Button>
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="min-w-0">
        {/* tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-white border border-slate-100 ft-shadow p-2 animate-fade-up">
          {[{ id: "create", label: "إنشاء مسابقة", icon: Sparkles }, { id: "join", label: "انضم برمز", icon: Users }].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-testid={`quiz-tab-${id}`}
              className={`min-h-[48px] rounded-2xl font-head font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition ${tab === id ? "ft-btn-primary text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <div className="mt-6 rounded-[24px] bg-white border border-slate-100 ft-shadow p-5 sm:p-7 animate-fade-up d-1">
            <label className="text-sm font-extrabold text-slate-700">عنوان المسابقة</label>
            <Input
              data-testid="quiz-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تحدّي الثقافة العامة"
              className="mt-2 rounded-xl h-12 text-base"
              maxLength={80}
            />

            <div className="mt-7 space-y-5">
              {questions.map((q, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 shadow-sm transition hover:ring-1 hover:ring-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-head grid place-items-center w-8 h-8 rounded-xl ft-icon-tile text-white text-sm font-black shrink-0">{i + 1}</span>
                    <Input
                      data-testid={`quiz-q-${i}`}
                      value={q.q}
                      onChange={(e) => setQ(i, { q: e.target.value })}
                      placeholder="نص السؤال…"
                      className="rounded-xl bg-white h-11 flex-1"
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
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer ${q.correct === oi ? "border-emerald-300 bg-emerald-50/80" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
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
              <Button onClick={addQ} variant="outline" className="rounded-xl min-h-[44px] font-bold"><Plus className="w-4 h-4 ml-1" /> أضف سؤالاً</Button>
              <Button
                data-testid="quiz-create-btn"
                onClick={create}
                disabled={creating}
                className="rounded-xl ft-btn-primary text-white min-h-[44px] font-extrabold px-6 shadow-md"
              >
                {creating ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Play className="w-4 h-4 ml-1" />}
                إنشاء الغرفة
              </Button>
            </div>

            {createdCode && (
              <div className="mt-7 rounded-[20px] overflow-hidden border border-indigo-100 animate-fade-up">
                <div className="relative bg-gradient-to-l from-indigo-600 to-violet-600 text-white px-5 py-4 text-center grain overflow-hidden">
                  <Zap className="pointer-events-none absolute -right-4 -bottom-8 w-28 h-28 text-white/[0.08] rotate-12" aria-hidden="true" />
                  <div className="text-xs font-bold text-indigo-100">رمز الغرفة · شاركه مع اللاعبين</div>
                  <div className="font-head text-5xl sm:text-6xl font-black tracking-[0.18em] mt-2 tabular-nums" dir="ltr">{createdCode}</div>
                  <div className="mt-4 flex flex-wrap justify-center gap-2.5">
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
          <div className="mt-6 rounded-[24px] bg-white border border-slate-100 ft-shadow p-5 sm:p-7 animate-fade-up d-1">
            <label className="text-sm font-extrabold text-slate-700">رمز الغرفة</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2.5">
              <Input
                data-testid="quiz-join-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
                placeholder="مثال: K7QX2"
                className="rounded-xl text-center text-xl font-black tracking-[0.25em] tabular-nums flex-1 py-3.5"
                maxLength={10}
                dir="ltr"
              />
              <Button
                data-testid="quiz-join-btn"
                onClick={join}
                disabled={joining || !joinCode.trim()}
                className="rounded-xl ft-btn-primary text-white min-h-[52px] font-extrabold px-7 shadow-md"
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

  return (
    <div className="max-w-[980px] lg:max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
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
          {/* header */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-l from-indigo-600 to-violet-600 text-white px-5 sm:px-7 py-5 ft-shadow-lg flex flex-wrap items-center gap-4 grain">
            <Zap className="pointer-events-none absolute -left-6 -bottom-10 w-36 h-36 text-white/[0.07] rotate-12" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h1 className="font-head text-xl sm:text-2xl font-black truncate">{room?.title || "مسابقة حية"}</h1>
              <div className="text-indigo-100 text-xs font-bold mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {players.length} لاعب</span>
                {isHost && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2 py-0.5"><Crown className="w-3 h-3" /> أنت المضيف</span>}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/20 px-2 py-0.5">
                  {status === "lobby" ? "في الانتظار" : status === "running" ? "جارية الآن" : "انتهت"}
                </span>
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="text-[10px] font-bold text-indigo-100">رمز الغرفة</div>
              <div className="font-head text-3xl font-black tracking-[0.15em] tabular-nums" dir="ltr">{code}</div>
            </div>
          </div>

          {/* LOBBY */}
          {status === "lobby" && (
            <div className="relative overflow-hidden mt-6 rounded-[24px] bg-white border border-slate-100 ft-shadow p-5 sm:p-7 animate-fade-up">
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 to-violet-500" />
              <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 ft-text-accent" /> اللاعبون في الانتظار ({players.length})</h2>
              {players.length === 0 ? (
                <p className="text-sm text-slate-400 mt-4">لا لاعبين بعد · شارك الرمز وانتظر انضمام أصدقائك.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <span key={i} style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }} className="inline-flex items-center gap-1.5 rounded-full ft-bg-soft border ft-border-accent px-3.5 py-1.5 text-sm font-bold text-slate-700 animate-fade-up">
                      <span className="w-6 h-6 rounded-full ft-icon-tile text-white grid place-items-center text-[11px] font-black">{p.name?.[0] || "؟"}</span>
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
                  className="mt-6 rounded-xl ft-btn-primary text-white min-h-[48px] px-7 font-extrabold shadow-md w-full sm:w-auto"
                >
                  {busy === "start" ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Play className="w-4 h-4 ml-1" />}
                  ابدأ المسابقة
                </Button>
              ) : (
                <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> بانتظار أن يبدأ المضيف…</p>
              )}
            </div>
          )}

          {/* RUNNING */}
          {status === "running" && (
            <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
              <div key={qIndex} className="relative overflow-hidden rounded-[24px] bg-white border border-slate-100 ft-shadow p-5 sm:p-7 animate-fade-up">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-500 to-violet-500" />
                <div className="sticky top-[84px] z-10 flex items-center justify-between gap-3 text-xs font-extrabold text-slate-400 glass rounded-full px-3.5 py-2 ring-1 ring-slate-100 shadow-sm">
                  <span>السؤال {qIndex + 1}{totalQ ? ` من ${totalQ}` : ""}</span>
                  <span className={`inline-flex items-center gap-1 tabular-nums rounded-full px-2 py-0.5 ring-1 ${remain <= 5 ? "bg-rose-50 text-rose-500 ring-rose-100" : "bg-slate-50 ring-slate-100"}`}><Timer className="w-3.5 h-3.5" /> {Math.ceil(remain)} ث</span>
                </div>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-[width] duration-200 ${remain <= 5 ? "bg-rose-500 animate-pulse" : "bg-gradient-to-l from-indigo-500 to-violet-500"}`}
                    style={{ width: `${Math.max(0, Math.min(100, (remain / QUESTION_SECONDS) * 100))}%` }}
                  />
                </div>

                {q ? (
                  <>
                    <h2 className="font-head text-xl sm:text-2xl font-black text-slate-900 leading-relaxed mt-5">{q.q || q.text || q.question}</h2>
                    <div className="grid sm:grid-cols-2 gap-3 mt-6">
                      {(q.options || []).map((opt, i) => {
                        const mine = answeredFor === qIndex && myAnswer === i;
                        const locked = answeredFor === qIndex;
                        return (
                          <button
                            key={i}
                            data-testid={`quiz-answer-${i}`}
                            onClick={() => answer(i)}
                            disabled={locked}
                            className={`pressable min-h-[64px] rounded-2xl border-2 px-4 py-3 text-right font-extrabold text-[15px] transition-all flex items-center gap-3 ${
                              mine
                                ? "border-indigo-500 bg-indigo-50 text-indigo-800 shadow-md ring-2 ring-indigo-200"
                                : locked
                                  ? "border-slate-100 bg-slate-50 text-slate-400"
                                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/60 hover:shadow-md hover:-translate-y-0.5"
                            }`}
                          >
                            <span className={`grid place-items-center w-8 h-8 rounded-xl text-sm font-black shrink-0 ${mine ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{["أ", "ب", "ج", "د"][i] || i + 1}</span>
                            <span className="flex-1">{opt}</span>
                            {mine && <Check className="w-5 h-5 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {answeredFor === qIndex && (
                      <p className="mt-4 text-sm font-bold ft-text-accent flex items-center gap-1.5 animate-fade-up"><Check className="w-4 h-4" /> سُجّلت إجابتك · انتظر السؤال التالي</p>
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
                    className="mt-6 rounded-xl ft-btn-primary text-white min-h-[48px] px-7 font-extrabold shadow-md w-full sm:w-auto"
                  >
                    {busy === "next" ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <ChevronLeft className="w-4 h-4 ml-1" />}
                    السؤال التالي
                  </Button>
                )}
              </div>

              {/* live scores */}
              <div className="relative overflow-hidden rounded-[24px] bg-white border border-slate-100 ft-shadow p-5 animate-fade-up d-1 lg:sticky lg:top-24">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-orange-400 to-amber-500" />
                <h3 className="font-head font-extrabold text-slate-900 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> النتائج المباشرة</h3>
                <div className="mt-4 space-y-2">
                  {players.slice(0, 10).map((p, i) => (
                    <div key={i} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${i === 0 ? "bg-amber-50 border border-amber-100" : i === 1 ? "bg-slate-100/80 border border-slate-200/60" : i === 2 ? "bg-orange-50 border border-orange-100" : "bg-slate-50"}`}>
                      <span className={`font-head w-6 text-center text-sm font-black ${i === 0 ? "text-amber-600" : i === 1 ? "text-slate-500" : i === 2 ? "text-orange-600" : "text-slate-400"}`}>{i + 1}</span>
                      <span className="flex-1 truncate text-sm font-bold text-slate-700">{p.name}</span>
                      <span className="text-sm font-black text-slate-900 tabular-nums">{p.score}</span>
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
              <div className="relative overflow-hidden rounded-[24px] bg-white border border-slate-100 ft-shadow-lg p-5 sm:p-8">
                <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-amber-400 via-orange-400 to-amber-500" />
                <Trophy className="pointer-events-none absolute -right-6 -top-8 w-32 h-32 text-amber-500/[0.05] rotate-12" aria-hidden="true" />
                <h2 className="relative font-head text-center text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" /> النتائج النهائية
                </h2>
                {players.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 mt-4">انتهت المسابقة دون لاعبين.</p>
                ) : (
                  <>
                    {/* podium */}
                    <div className="mt-8 flex items-end justify-center gap-3 sm:gap-5" dir="rtl">
                      {[players[1], players[0], players[2]].map((p, i) => {
                        if (!p) return <div key={i} className="w-24 sm:w-32" />;
                        const rank = [2, 1, 3][i];
                        const heights = ["h-20", "h-28", "h-14"];
                        const colors = [
                          "from-slate-300 to-slate-400",
                          "from-amber-300 to-amber-500",
                          "from-orange-300 to-amber-600",
                        ];
                        return (
                          <div key={i} style={{ animationDelay: `${i * 120}ms` }} className="w-24 sm:w-32 text-center animate-fade-up">
                            {rank === 1 && <Crown className="w-7 h-7 text-amber-500 mx-auto mb-1 animate-bounce" />}
                            <div className={`w-11 h-11 mx-auto rounded-full ft-icon-tile text-white grid place-items-center font-black ring-4 shadow ${rank === 1 ? "ring-amber-200 scale-110" : "ring-white"}`}>{p.name?.[0] || "؟"}</div>
                            <div className="font-head font-extrabold text-sm text-slate-800 mt-1.5 truncate">{p.name}</div>
                            <div className="text-xs font-black text-amber-600 tabular-nums">{p.score} نقطة</div>
                            <div className={`mt-2 rounded-t-2xl bg-gradient-to-b ${colors[i]} ${heights[i]} grid place-items-start justify-center pt-2 shadow-inner`}>
                              <span className="font-head text-white font-black text-lg drop-shadow">{rank}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* full scores */}
                    <div className="mt-8 space-y-2 max-w-lg sm:max-w-xl mx-auto w-full">
                      {players.map((p, i) => (
                        <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${i < 3 ? "bg-amber-50/70 border border-amber-100" : "bg-slate-50"}`}>
                          <span className="font-head w-7 text-center font-black text-slate-500">{i + 1}</span>
                          {i === 0 ? <Crown className="w-4 h-4 text-amber-500 shrink-0" /> : i < 3 ? <Medal className="w-4 h-4 text-slate-400 shrink-0" /> : <span className="w-4 shrink-0" />}
                          <span className="flex-1 truncate text-sm font-bold text-slate-700">{p.name}</span>
                          <span className="text-sm font-black text-slate-900 tabular-nums">{p.score}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="text-center mt-8">
                  <Button onClick={onLeave} className="rounded-xl ft-btn-primary text-white min-h-[48px] px-7 font-extrabold shadow-md">مسابقة جديدة</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
