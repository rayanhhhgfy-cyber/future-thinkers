import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import { ErrorState } from "@/components/ErrorState";
import { timeAgo } from "@/components/NotificationsPanel";
import { toast } from "sonner";
import {
  HelpCircle, Plus, X, Loader2, Search, MessageSquare, CheckCircle2,
  ChevronUp, ChevronDown, Send, Award, ArrowRight, Tag,
} from "lucide-react";

function Avatar({ person, size = "w-10 h-10", text = "text-sm" }) {
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt="" className={`${size} rounded-full object-cover ring-2 ring-white shrink-0`} />;
  }
  return (
    <span className={`${size} rounded-full ft-navy-gradient text-white grid place-items-center font-head font-bold ring-2 ring-white shrink-0 ${text}`}>
      {person?.name?.[0] || "؟"}
    </span>
  );
}

function TagChip({ label, active, onClick }) {
  const cls = active
    ? "ft-btn-primary text-white shadow"
    : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:ft-bg-soft hover:ft-text-accent";
  const inner = (
    <>
      <Tag className="w-3 h-3" /> {label}
    </>
  );
  if (!onClick) {
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}`}>{inner}</span>;
  }
  return (
    <button onClick={onClick} className={`pressable inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${cls}`}>{inner}</button>
  );
}

export default function HelpBoard() {
  const { user, ready } = useAuth();

  /* list state */
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [asking, setAsking] = useState(false);

  /* detail state */
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [detailError, setDetailError] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [answering, setAnswering] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async (q, tag, quiet = false) => {
    try {
      const { data } = await api.get("/qa/questions", { params: { q: q || "", tag: tag || "" } });
      setQuestions(Array.isArray(data) ? data : data?.items || []);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e);
      setQuestions((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => { if (user) load("", ""); }, [user, load]);

  /* debounced search + tag filter */
  useEffect(() => {
    if (!user) return undefined;
    const t = setTimeout(() => load(query, activeTag), 350);
    return () => clearTimeout(t);
  }, [query, activeTag, user, load]);

  const loadDetail = useCallback(async (id, quiet = false) => {
    if (!quiet) { setDetail(null); setAnswers([]); setDetailError(null); }
    try {
      const { data } = await api.get(`/qa/questions/${id}`);
      const q = data?.question || data;
      setDetail(q);
      setAnswers(data?.answers || q?.answers || []);
      setDetailError(null);
    } catch (e) {
      if (!quiet) { setDetailError(e); setDetail(null); setAnswers([]); }
    }
  }, []);

  const openQuestion = (id) => { setActiveId(id); setAnswerText(""); loadDetail(id); };
  const backToList = () => { setActiveId(null); setDetail(null); load(query, activeTag, true); };

  const ask = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b || asking) return;
    setAsking(true);
    try {
      const tagList = tags.split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 5);
      const { data } = await api.post("/qa/questions", { title: t, body: b, tags: tagList });
      toast.success("تم نشر سؤالك");
      setAskOpen(false);
      setTitle(""); setBody(""); setTags("");
      await load(query, activeTag, true);
      const id = data?.id || data?.question?.id;
      if (id) openQuestion(id);
    } catch (e) { toast.error(apiErr(e)); }
    setAsking(false);
  };

  const submitAnswer = async () => {
    const b = answerText.trim();
    if (!b || !activeId || answering) return;
    setAnswering(true);
    try {
      await api.post(`/qa/questions/${activeId}/answers`, { body: b });
      setAnswerText("");
      toast.success("تم نشر جوابك");
      await loadDetail(activeId, true);
    } catch (e) { toast.error(apiErr(e)); }
    setAnswering(false);
  };

  const vote = async (a, dir) => {
    const key = `vote-${a.id}`;
    if (busyKey) return;
    setBusyKey(key);
    setAnswers((arr) => arr.map((x) => (x.id === a.id ? { ...x, votes: (x.votes || 0) + dir } : x)));
    try {
      const { data } = await api.post(`/qa/answers/${a.id}/vote`, { dir });
      if (data && typeof data.votes === "number") {
        setAnswers((arr) => arr.map((x) => (x.id === a.id ? { ...x, votes: data.votes } : x)));
      } else {
        await loadDetail(activeId, true);
      }
    } catch (e) {
      toast.error(apiErr(e));
      await loadDetail(activeId, true);
    }
    setBusyKey(null);
  };

  const accept = async (a) => {
    const key = `accept-${a.id}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      await api.post(`/qa/answers/${a.id}/accept`);
      toast.success("تم اعتماد الجواب · منح صاحبه +25 نقطة");
      await loadDetail(activeId, true);
    } catch (e) { toast.error(apiErr(e)); }
    setBusyKey(null);
  };

  if (!ready) return (<Layout><PageLoader /></Layout>);
  if (!user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10">
          <EmptyState
            icon={HelpCircle}
            title="سجّل دخولك أولاً"
            desc="لوحة الأسئلة والأجوبة متاحة لأعضاء النادي المسجلين"
            action={<Link to="/login" className="pressable inline-flex min-h-[44px] items-center rounded-full ft-btn-primary px-6 text-sm font-bold text-white shadow-md">تسجيل الدخول</Link>}
          />
        </div>
      </Layout>
    );
  }

  /* ------------------------- detail view ------------------------- */
  if (activeId) {
    const isAsker = detail && String(detail.asker?.id) === String(user.id);
    return (
      <Layout>
        <div className="max-w-4xl xl:max-w-[1100px] mx-auto px-4 lg:px-6 py-6 sm:py-8">
          <button onClick={backToList} className="pressable inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:ft-text-accent transition mb-5 min-h-[44px]">
            <ArrowRight className="w-4 h-4" /> كل الأسئلة
          </button>

          {detail === null && !detailError ? (
            <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin ft-text-accent" /></div>
          ) : detailError ? (
            <ErrorState error={detailError} onRetry={() => loadDetail(activeId)} context="qa-detail" />
          ) : (
            <>
              {/* question card */}
              <div className="animate-fade-up relative overflow-hidden bg-white rounded-[2rem] border border-slate-100 ft-shadow-lg p-5 sm:p-8">
                <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                <div className="flex items-start gap-3.5">
                  <Avatar person={detail.asker} size="w-12 h-12" text="text-base" />
                  <div className="flex-1 min-w-0">
                    <h1 className="font-head text-2xl sm:text-3xl font-extrabold text-slate-800 leading-snug">{detail.title}</h1>
                    <p className="text-xs text-slate-400 mt-1.5">
                      سأل{" "}
                      {detail.asker?.id
                        ? <Link to={`/profile/${detail.asker.id}`} className="font-bold ft-text-accent hover:underline">{detail.asker.name}</Link>
                        : <span className="font-bold">{detail.asker?.name || "مستخدم"}</span>}
                      {detail.created_at ? ` · ${timeAgo(detail.created_at)}` : ""}
                    </p>
                  </div>
                  {detail.accepted && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 text-[11px] font-bold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> تم الحل
                    </span>
                  )}
                </div>
                {detail.body && <p className="text-[15px] text-slate-600 leading-loose mt-4 whitespace-pre-wrap break-words">{detail.body}</p>}
                {Array.isArray(detail.tags) && detail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {detail.tags.map((t) => <TagChip key={t} label={t} />)}
                  </div>
                )}
              </div>

              {/* answers */}
              <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start mt-8">
              <div className="min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 ft-text-accent" />
                <h2 className="font-head font-extrabold text-lg text-slate-800">الأجوبة</h2>
                <span className="text-xs text-slate-400 font-bold">{answers.length}</span>
                <span className="inline-flex items-center gap-1 ms-auto px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200 text-[11px] font-bold">
                  <Award className="w-3.5 h-3.5" /> أفضل جواب يمنح صاحبه +25 نقطة
                </span>
              </div>

              {answers.length === 0 ? (
                <EmptyState icon={MessageSquare} title="لا أجوبة بعد" desc="كن أول من يساعد بجواب مفيد بالأسفل" />
              ) : (
                <div className="space-y-3">
                  {answers.map((a, i) => {
                    const vBusy = busyKey === `vote-${a.id}`;
                    const aBusy = busyKey === `accept-${a.id}`;
                    return (
                      <div
                        key={a.id}
                        style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                        className={`animate-fade-up relative overflow-hidden bg-white rounded-[1.5rem] border p-4 sm:p-5 transition ${a.accepted ? "border-emerald-200 ring-1 ring-emerald-200 bg-emerald-50/30" : "border-slate-100 ft-shadow-lg"}`}
                      >
                        <div className="flex gap-3.5">
                          {/* vote rail */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => vote(a, 1)}
                              disabled={!!busyKey}
                              aria-label="تصويت مؤيد"
                              className="pressable w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:ft-bg-soft hover:ft-text-accent transition disabled:opacity-50"
                            >
                              <ChevronUp className="w-5 h-5" />
                            </button>
                            <span className="font-head font-extrabold text-sm text-slate-700 min-w-[2ch] text-center">{a.votes || 0}</span>
                            <button
                              onClick={() => vote(a, -1)}
                              disabled={!!busyKey}
                              aria-label="تصويت معارض"
                              className="pressable w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition disabled:opacity-50"
                            >
                              <ChevronDown className="w-5 h-5" />
                            </button>
                            {vBusy && <Loader2 className="w-3.5 h-3.5 animate-spin ft-text-accent" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <Avatar person={a.author} size="w-9 h-9" text="text-xs" />
                              {a.author?.id
                                ? <Link to={`/profile/${a.author.id}`} className="font-head font-bold text-sm text-slate-800 ft-hover-text-accent transition-colors">{a.author.name}</Link>
                                : <span className="font-head font-bold text-sm text-slate-800">{a.author?.name || "مستخدم"}</span>}
                              {a.mine && <span className="px-2 py-0.5 rounded-full ft-bg-soft ft-text-accent ring-1 ft-ring-accent text-[10px] font-bold">أنت</span>}
                              {a.accepted && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                                  <CheckCircle2 className="w-3 h-3" /> الجواب المعتمد
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mt-2.5 whitespace-pre-wrap break-words">{a.body}</p>
                            {isAsker && !a.accepted && (
                              <button
                                onClick={() => accept(a)}
                                disabled={!!busyKey}
                                className="pressable inline-flex items-center gap-1.5 mt-3 min-h-[44px] px-4 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-500 hover:text-white transition disabled:opacity-60"
                              >
                                {aBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} اعتماد كأفضل جواب
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* answer composer */}
              <div className="relative overflow-hidden bg-white rounded-[1.5rem] border border-slate-100 ft-shadow-lg p-4 sm:p-5 mt-6">
                <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                <label className="block font-head font-bold text-sm text-slate-700 mb-2.5">جوابك</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="اشرح الحل بوضوح… جوابك قد يكون الأفضل ويكسب +25 نقطة"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 ft-ring-accent focus:bg-white transition resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={submitAnswer}
                    disabled={answering || !answerText.trim()}
                    className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-6 rounded-full ft-btn-primary text-white text-sm font-bold shadow-md disabled:opacity-50"
                  >
                    {answering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -scale-x-100" />} نشر الجواب
                  </button>
                </div>
              </div>
              </div>

              {/* detail tips rail */}
              <aside className="hidden xl:block sticky top-24">
                <div className="relative overflow-hidden bg-white rounded-[1.75rem] border border-slate-100 ft-shadow-lg p-6">
                  <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
                  <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><Award className="w-4 h-4" /></span>
                    نصيحة سريعة
                  </h3>
                  <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-slate-500">
                    <li className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-lg ft-bg-soft ft-text-accent ring-1 ft-ring-accent grid place-items-center font-head text-[11px] font-extrabold shrink-0">١</span>
                      <span>اشرح الحل خطوة بخطوة · الجواب الواضح يُعتمد أسرع</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-lg ft-bg-soft ft-text-accent ring-1 ft-ring-accent grid place-items-center font-head text-[11px] font-extrabold shrink-0">٢</span>
                      <span>صوّت للأجوبة المفيدة لتبرز لزملائك في الأعلى</span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-200 grid place-items-center shrink-0"><Award className="w-3.5 h-3.5" /></span>
                      <span>الجواب المعتمد يمنح صاحبه +25 نقطة</span>
                    </li>
                  </ul>
                </div>
              </aside>
              </div>
            </>
          )}
        </div>
      </Layout>
    );
  }

  /* ------------------------- list view ------------------------- */
  const allTags = [...new Set((questions || []).flatMap((q) => q.tags || []))].slice(0, 12);
  return (
    <Layout>
      <div className="max-w-6xl xl:max-w-[1400px] mx-auto px-4 lg:px-6 py-6 sm:py-8 pb-24 lg:pb-8">
        {/* hero */}
        <div className="animate-fade-up relative overflow-hidden rounded-[2rem] ft-hero-gradient grain px-5 py-7 sm:px-10 sm:py-9 mb-6">
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-16 w-80 h-80 rounded-full bg-teal-300/15 blur-3xl" />
          <HelpCircle className="pointer-events-none absolute -left-8 -bottom-12 w-44 h-44 text-white/[0.07] -rotate-12" />
          <Award className="pointer-events-none absolute right-10 -top-10 w-28 h-28 text-white/[0.05] rotate-12 hidden sm:block" aria-hidden="true" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/25 text-white text-xs font-bold shadow-lg">
                <HelpCircle className="w-3.5 h-3.5" /> اسأل · أجب · اكسب
              </span>
              <h1 className="font-head text-3xl sm:text-4xl font-extrabold text-white mt-3 leading-tight">أسئلة وأجوبة</h1>
              <p className="text-white/75 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">عالق في واجب أو فقرة من كتاب؟ اسأل زملاءك، وساعد غيرك بجوابك · أفضل جواب يمنح صاحبه +25 نقطة.</p>
              {!!questions?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <MessageSquare className="w-3.5 h-3.5" /> {questions.length} سؤال
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {questions.filter((q) => q.accepted).length} تم حلّها
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => setAskOpen(true)} className="pressable inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full bg-white text-sm font-bold ft-text-accent shadow-lg hover:bg-white/90 transition shrink-0">
              <Plus className="w-4 h-4" /> اسأل سؤالاً
            </button>
          </div>
        </div>

        {/* search + tags */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الأسئلة…"
            className="w-full min-h-[52px] rounded-2xl border border-slate-200 bg-white ps-4 pe-10 py-3 text-sm outline-none focus:ring-2 ft-ring-accent transition shadow-sm"
          />
        </div>
        {(allTags.length > 0 || activeTag) && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {activeTag && <TagChip label={activeTag} active onClick={() => setActiveTag("")} />}
            {allTags.filter((t) => t !== activeTag).map((t) => (
              <TagChip key={t} label={t} onClick={() => setActiveTag(t)} />
            ))}
          </div>
        )}

        {/* list + tips rail */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 sm:gap-6 items-start">
        <div className="min-w-0">
        {questions === null ? (
          <div className="grid place-items-center py-20"><Loader2 className="w-8 h-8 animate-spin ft-text-accent" /></div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => load(query, activeTag)} context="qa-list" />
        ) : questions.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title={query.trim() || activeTag ? "لا أسئلة مطابقة" : "لا أسئلة بعد"}
            desc={query.trim() || activeTag ? "جرّب كلمات أخرى أو أزل الفلاتر" : "كن أول من يطرح سؤالاً ويفتح باب النقاش"}
            action={!(query.trim() || activeTag) && (
              <button onClick={() => setAskOpen(true)} className="pressable inline-flex min-h-[44px] items-center gap-1.5 rounded-full ft-btn-primary px-5 text-xs font-bold text-white shadow-md">
                <Plus className="w-4 h-4" /> اسأل سؤالاً
              </button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => openQuestion(q.id)}
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                className="pressable hover-lift animate-fade-up group relative w-full overflow-hidden bg-white rounded-[1.5rem] border border-slate-100 ft-shadow-lg p-4 sm:p-5 text-start"
              >
                <span className="absolute inset-y-0 start-0 w-1 ft-grad-bar" />
                <span className="flex items-start gap-3.5">
                  <Avatar person={q.asker} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-head font-extrabold text-base sm:text-lg text-slate-800 group-hover:ft-text-accent transition-colors leading-snug">{q.title}</span>
                      {q.accepted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 text-[10px] font-bold shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> تم الحل
                        </span>
                      )}
                    </span>
                    {q.body && <span className="block text-sm text-slate-400 leading-relaxed mt-1 line-clamp-2">{q.body}</span>}
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-[11px] font-bold text-slate-400">
                      <span>{q.asker?.name || "مستخدم"}</span>
                      {q.created_at && <span>{timeAgo(q.created_at)}</span>}
                      <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {q.answers_count || 0} جواب</span>
                    </span>
                    {Array.isArray(q.tags) && q.tags.length > 0 && (
                      <span className="flex flex-wrap gap-1.5 mt-2.5">
                        {q.tags.map((t) => <TagChip key={t} label={t} />)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        </div>

        {/* tips rail */}
        <aside className="hidden lg:block sticky top-24 space-y-4">
          <div className="relative overflow-hidden bg-white rounded-[1.75rem] border border-slate-100 ft-shadow-lg p-6">
            <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar" />
            <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl ft-icon-tile grid place-items-center shadow-md"><HelpCircle className="w-4 h-4" /></span>
              كيف تحصل على جواب رائع؟
            </h3>
            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-slate-500">
              <li className="flex gap-2.5">
                <span className="w-6 h-6 rounded-lg ft-bg-soft ft-text-accent ring-1 ft-ring-accent grid place-items-center font-head text-[11px] font-extrabold shrink-0">١</span>
                <span>اكتب عنوانًا واضحًا يلخّص مشكلتك في سطر واحد</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-6 h-6 rounded-lg ft-bg-soft ft-text-accent ring-1 ft-ring-accent grid place-items-center font-head text-[11px] font-extrabold shrink-0">٢</span>
                <span>اشرح ما جرّبته وأين توقفت بالضبط في التفاصيل</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-6 h-6 rounded-lg ft-bg-soft ft-text-accent ring-1 ft-ring-accent grid place-items-center font-head text-[11px] font-extrabold shrink-0">٣</span>
                <span>أضف وسومًا دقيقة ليسهل على زملائك العثور على سؤالك</span>
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] ft-navy-gradient grain ft-shadow-lg p-6">
            <Award className="pointer-events-none absolute -left-5 -bottom-7 w-24 h-24 text-white/[0.07] -rotate-12" aria-hidden="true" />
            <h3 className="relative font-head font-extrabold text-white flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-md shadow-amber-500/25"><Award className="w-4 h-4" /></span>
              اعتماد أفضل جواب
            </h3>
            <p className="relative text-[13px] leading-relaxed text-white/75 mt-3">عندما يعتمد السائل جوابك كأفضل جواب، تُمنح +25 نقطة فورًا · وتبرز إجابتك لزملائك.</p>
            <span className="relative inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-white text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" /> +25 نقطة لكل جواب معتمد
            </span>
          </div>
        </aside>
        </div>
      </div>

      {/* mobile ask FAB */}
      <button
        onClick={() => setAskOpen(true)}
        className="pressable lg:hidden fixed bottom-24 start-5 z-40 inline-flex items-center gap-1.5 min-h-[52px] px-5 rounded-full ft-btn-primary text-white text-sm font-bold shadow-2xl"
      >
        <Plus className="w-5 h-5" /> اسأل سؤالاً
      </button>

      {/* ask dialog */}
      {askOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => !asking && setAskOpen(false)}>
          <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in ft-shadow-lg" onClick={(e) => e.stopPropagation()}>
            <span className="absolute inset-x-0 top-0 h-1 ft-grad-bar z-10" />
            <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-head font-bold flex items-center gap-2"><HelpCircle className="w-5 h-5 ft-text-accent" /> سؤال جديد</h3>
              <button onClick={() => setAskOpen(false)} aria-label="إغلاق" className="w-11 h-11 grid place-items-center rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">عنوان السؤال</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="مثال: كيف أحل معادلة من الدرجة الثانية؟"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">تفاصيل السؤال</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="اشرح ما جربته وأين توقفت… كلما كان سؤالك أوضح، كان الجواب أفضل"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 ft-ring-accent focus:bg-white transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">وسوم · افصل بينها بفاصلة</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  maxLength={120}
                  placeholder="رياضيات، واجب، كتاب"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 ft-ring-accent focus:bg-white transition"
                />
              </div>
              <button
                onClick={ask}
                disabled={asking || !title.trim() || !body.trim()}
                className="pressable w-full min-h-[48px] rounded-2xl ft-btn-primary text-white text-sm font-bold shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -scale-x-100" />} نشر السؤال
              </button>
              <p className="flex items-center justify-center gap-1 text-[11px] text-slate-300 text-center">
                <Award className="w-3.5 h-3.5" /> أفضل جواب يمنح صاحبه +25 نقطة
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
