import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { FadeUp, Stagger, Item, EASE } from "@/components/anim";
import {
  BookOpen, PenLine, Play, RotateCcw, Flag, Eye, GitBranch,
  CheckCircle2, Sparkles, X, Trash2, Pencil,
} from "lucide-react";
import { toast } from "sonner";

const COVERS = {
  "#7C3AED": "from-violet-500 to-fuchsia-600",
  "#2563EB": "from-blue-500 to-indigo-600",
  "#059669": "from-emerald-500 to-teal-600",
  "#D97706": "from-amber-500 to-orange-600",
  "#E11D48": "from-rose-500 to-red-600",
  "#0891B2": "from-cyan-500 to-sky-600",
  "#0A192F": "from-slate-800 to-slate-950",
};

export default function Stories() {
  const [stories, setStories] = useState(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/stories");
      setStories(data.stories || []);
    } catch { setStories([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!stories) return <Layout><PageLoader /></Layout>;
  const mine = stories.filter((s) => s.is_mine);
  const others = stories.filter((s) => !s.is_mine);

  return (
    <Layout>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 xl:py-10 space-y-8">
        <FadeUp>
          <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
            <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 w-72 h-72 bg-violet-500/25 rounded-full blur-3xl animate-float" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl" />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <GitBranch className="w-3.5 h-3.5 text-fuchsia-300" /> أنت تقرر ما يحدث بعد ذلك
                </span>
                <h1 className="font-head text-3xl sm:text-4xl lg:text-5xl font-black mt-3">قصص «اختر مغامرتك»</h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  قصص متفرعة يكتبها طلاب النادي · عند كل مشهد تختار الطريق بنفسك، وكل اختيار يغيّر النهاية · الوصول إلى نهاية يمنحك <span className="text-amber-300 font-black">+15 XP</span>
                </p>
              </div>
              <Link to="/stories/new" data-testid="story-write-btn"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-500 to-fuchsia-500 px-6 py-3.5 font-head font-black text-white shadow-lg shadow-fuchsia-500/30 transition hover:scale-[1.03] active:scale-95">
                <PenLine className="w-5 h-5" /> اكتب قصتك
              </Link>
            </div>
          </div>
        </FadeUp>

        {mine.length > 0 && (
          <section>
            <h2 className="font-head font-black text-xl flex items-center gap-2 mb-4"><PenLine className="w-5 h-5 text-violet-500" /> قصصي</h2>
            <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {mine.map((s) => <Item key={s.id}><StoryCard s={s} onRead={() => nav(`/stories/${s.id}`)} onChanged={load} /></Item>)}
            </Stagger>
          </section>
        )}

        <section>
          <h2 className="font-head font-black text-xl flex items-center gap-2 mb-4"><BookOpen className="w-5 h-5 text-violet-500" /> مكتبة المغامرات</h2>
          {others.length === 0 && mine.length === 0 ? (
            <FadeUp>
              <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-10 text-center">
                <GitBranch className="w-14 h-14 mx-auto text-slate-300" />
                <p className="font-head font-black text-xl mt-3">لا قصص منشورة بعد</p>
                <p className="text-slate-500 text-sm mt-1">كن أول من يكتب مغامرة متفرعة لزملائه</p>
              </div>
            </FadeUp>
          ) : (
            <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {others.map((s) => <Item key={s.id}><StoryCard s={s} onRead={() => nav(`/stories/${s.id}`)} /></Item>)}
            </Stagger>
          )}
        </section>
      </div>
    </Layout>
  );
}

function StoryCard({ s, onRead, onChanged }) {
  const grad = COVERS[s.color] || COVERS["#7C3AED"];
  const fin = s.my_progress?.finished;
  const started = !!s.my_progress && !fin;
  const del = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`حذف قصة «${s.title}»؟`)) return;
    try { await api.delete(`/stories/${s.id}`); toast.success("حُذفت القصة"); onChanged?.(); }
    catch (err) { toast.error(apiErr(err)); }
  };
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70 ft-shadow transition hover:-translate-y-1 hover:shadow-xl" data-testid="story-card">
      <button onClick={onRead} className="block w-full text-start">
        <div className={`relative h-36 bg-gradient-to-br ${grad} p-5 flex flex-col justify-between overflow-hidden`}>
          <GitBranch className="absolute -left-4 -bottom-6 w-36 h-36 text-white/10 rotate-12" />
          <div className="relative flex items-center gap-2">
            {s.status === "draft" && <span className="rounded-full bg-slate-900/60 text-white px-2.5 py-0.5 text-[10px] font-black">مسودة</span>}
            {fin && <span className="inline-flex items-center gap-1 rounded-full bg-white/90 text-emerald-600 px-2.5 py-0.5 text-[10px] font-black"><CheckCircle2 className="w-3 h-3" /> أنهيتها</span>}
            {started && <span className="rounded-full bg-white/90 text-amber-600 px-2.5 py-0.5 text-[10px] font-black">أكمل من حيث توقفت</span>}
          </div>
          <h3 className="relative font-head font-black text-white text-xl leading-snug line-clamp-2">{s.title}</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 min-h-[42px]">{s.desc || "مغامرة متفرعة بانتظار قراراتك…"}</p>
          <div className="flex items-center gap-4 mt-3 text-[11px] font-black text-slate-400">
            <span>بقلم {s.author_name}</span>
            <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {s.reads || 0} قراءة</span>
            <span className="inline-flex items-center gap-1"><Flag className="w-3.5 h-3.5" /> {s.finishes || 0} نهاية</span>
            <span className="inline-flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {s.nodes_count} مشهداً</span>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-black transition group-hover:scale-[1.03]">
            <Play className="w-4 h-4" /> {fin ? "العبها من جديد" : started ? "أكمل المغامرة" : "ابدأ المغامرة"}
          </span>
        </div>
      </button>
      {s.is_mine && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Link to={`/stories/${s.id}/edit`} onClick={(e) => e.stopPropagation()} aria-label="تعديل"
            className="w-8 h-8 grid place-items-center rounded-full bg-white/90 text-slate-600 shadow hover:text-slate-900"><Pencil className="w-4 h-4" /></Link>
          <button onClick={del} aria-label="حذف"
            className="w-8 h-8 grid place-items-center rounded-full bg-white/90 text-rose-500 shadow hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

/* ---------------- reader ---------------- */

export function StoryReader() {
  const [story, setStory] = useState(null);
  const [node, setNode] = useState(null);
  const [xpPop, setXpPop] = useState(0);
  const [err, setErr] = useState("");
  const { id: sid } = useParams();

  useEffect(() => {
    api.get(`/stories/${sid}`).then(({ data }) => {
      setStory(data);
      const cur = data.my_progress?.node || data.start;
      const n = data.nodes[cur];
      setNode({ key: cur, text: n.text, choices: n.choices || [], is_end: !(n.choices || []).length,
                finished: !!data.my_progress?.finished });
    }).catch((e) => setErr(apiErr(e)));
  }, [sid]);

  const choose = async (to) => {
    try {
      const { data } = await api.post(`/stories/${sid}/move`, { to });
      setNode({ key: data.node, text: data.text, choices: data.choices || [], is_end: data.is_end, finished: data.finished });
      if (data.xp_awarded) {
        setXpPop(data.xp_awarded);
        toast.success(`نهاية رائعة! +${data.xp_awarded} XP 🏁`);
        setTimeout(() => setXpPop(0), 2600);
      }
    } catch (e) { toast.error(apiErr(e)); }
  };

  const restart = async () => {
    try {
      const { data } = await api.post(`/stories/${sid}/restart`);
      setNode({ key: data.node, text: data.text, choices: data.choices || [], is_end: false, finished: node?.finished });
    } catch (e) { toast.error(apiErr(e)); }
  };

  if (err) return <Layout><div className="max-w-xl mx-auto px-4 py-16 text-center"><p className="text-rose-500 font-bold">{err}</p><Link to="/stories" className="inline-block mt-4 font-black text-slate-700">عودة إلى المكتبة</Link></div></Layout>;
  if (!story || !node) return <Layout><PageLoader /></Layout>;
  const grad = COVERS[story.color] || COVERS["#7C3AED"];

  return (
    <Layout>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <FadeUp>
          <div className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${grad} text-white p-6 sm:p-8 ft-shadow-lg`}>
            <GitBranch className="absolute -left-5 -bottom-8 w-44 h-44 text-white/10 rotate-12" />
            <div className="relative">
              <Link to="/stories" className="text-[11px] font-black text-white/80 hover:text-white">→ كل القصص</Link>
              <h1 className="font-head font-black text-2xl sm:text-4xl mt-2 leading-snug">{story.title}</h1>
              <p className="text-white/80 text-sm mt-1.5">بقلم {story.author_name} · {Object.keys(story.nodes || {}).length} مشهداً</p>
            </div>
            <AnimatePresence>
              {xpPop > 0 && (
                <motion.span initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: -6, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute top-5 left-5 inline-flex items-center gap-1 rounded-full bg-white text-emerald-600 px-3.5 py-1.5 font-black text-sm shadow-xl">
                  <Sparkles className="w-4 h-4" /> +{xpPop} XP
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </FadeUp>

        <div className="relative mt-5">
          <AnimatePresence mode="wait">
            <motion.div key={node.key + node.text.slice(0, 12)}
              initial={{ opacity: 0, y: 26, rotateX: 4 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="rounded-[1.75rem] bg-white ring-1 ring-slate-200/70 p-6 sm:p-9 ft-shadow" data-testid="story-scene">
              <p className="text-base sm:text-xl leading-[2.1] font-medium text-slate-800 whitespace-pre-wrap">{node.text}</p>

              {node.is_end ? (
                <div className="mt-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.15 }}
                    className="mx-auto w-16 h-16 rounded-full bg-amber-100 grid place-items-center">
                    <Flag className="w-8 h-8 text-amber-500" />
                  </motion.div>
                  <p className="font-head font-black text-xl mt-3">وصلت إلى نهاية هذا الطريق 🏁</p>
                  <p className="text-slate-500 text-sm mt-1">جرّب طريقاً آخر · لكل اختيار نهاية مختلفة</p>
                  <div className="flex flex-wrap justify-center gap-2.5 mt-5">
                    <button data-testid="story-restart-btn" onClick={restart}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-6 py-3 font-head font-black transition hover:scale-[1.03] active:scale-95">
                      <RotateCcw className="w-4 h-4" /> العب من البداية
                    </button>
                    <Link to="/stories" className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 font-head font-black text-slate-700 transition hover:bg-slate-200">
                      قصص أخرى
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-2.5" data-testid="story-choices">
                  <p className="text-[11px] font-black text-slate-400">ما قرارك؟ اختر بحكمة…</p>
                  {node.choices.map((c, i) => (
                    <motion.button key={i} data-testid="story-choice-btn" onClick={() => choose(c.to)}
                      initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.09, duration: 0.3, ease: EASE }}
                      whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                      className="w-full text-start rounded-2xl ring-1 ring-slate-200 bg-gradient-to-l from-slate-50 to-white px-5 py-4 font-head font-black text-slate-800 transition hover:ring-2 hover:ring-violet-400 hover:shadow-lg">
                      {c.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={restart} className="mt-4 mx-auto flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700 transition">
          <RotateCcw className="w-3.5 h-3.5" /> إعادة من أول مشهد
        </button>
      </div>
    </Layout>
  );
}
