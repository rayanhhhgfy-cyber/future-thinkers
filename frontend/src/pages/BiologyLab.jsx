import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dna, Microscope, HeartPulse, Shield,
  Calculator, Trophy, Sparkles, RotateCcw, Check, X, Lightbulb, ChevronLeft, FlaskConical,
  Zap, Timer, Award, Sun, Play, Pause,
} from "lucide-react";
import { Layout } from "@/components/Layout";

/* ================= shared bits ================= */
import { cardCls, chips, fmt, SecHead, Steps, gradBtn, useReducedMotion, LazyMount, RANKS, BADGES, FACTS, loadProfile, todayStr, AA, CODON, BASE_COMP, cleanDna, translateDna } from "@/components/lab/bioCore";
import { CellExplorer, MicroscopeLab, TaxonomyExplorer, DnaLab, MutationLab, PunnettLab, TraitGame, BodyExplorer, HeartSim } from "@/components/lab/bioSims";
import { DigestionJourney, EvolutionTimeline, GeologicStrip, FoodWebBuilder, PhotosynthesisLab, JordanSpecies, ClassifyGame, OrganelleMatch, BioCalculator, DailyQuiz } from "@/components/lab/bioSims2";
export default function BiologyLab() {
  const [tab, setTab] = useState("cell");
  const [dna, setDna] = useState("ATGGCTTATCGACAGTAA");
  const [profile, setProfile] = useState(loadProfile);
  const [toast, setToast] = useState(null);
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * FACTS.length));
  const seenRef = useRef(new Set());
  const toastTimer = useRef(null);

  useEffect(() => { try { localStorage.setItem("ft-bio-xp", JSON.stringify(profile)); } catch { /* private */ } }, [profile]);

  const showToast = useCallback((t) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const award = useCallback((amount, key) => {
    if (key) { if (seenRef.current.has(key)) return; seenRef.current.add(key); }
    setProfile((p) => ({ ...p, xp: p.xp + amount }));
    showToast({ xp: amount });
  }, [showToast]);
  const awardBadge = useCallback((id) => {
    let fresh = false;
    setProfile((p) => {
      if (p.badges.includes(id)) return p;
      fresh = true;
      return { ...p, badges: [...p.badges, id] };
    });
    if (fresh) { const b = BADGES.find((x) => x.id === id); showToast({ badge: b }); }
  }, [showToast]);
  const seen = useCallback((recordKey, id) => {
    let count = 0;
    setProfile((p) => {
      const arr = p.records[recordKey] || [];
      if (arr.includes(id)) { count = arr.length; return p; }
      count = arr.length + 1;
      return { ...p, records: { ...p.records, [recordKey]: [...arr, id] } };
    });
    return count;
  }, []);
  const recordMax = useCallback((key, val) => setProfile((p) => ({ ...p, records: { ...p.records, [key]: Math.max(p.records[key] || 0, val) } })), []);
  const recordSet = useCallback((key, val) => setProfile((p) => ({ ...p, records: { ...p.records, [key]: val } })), []);
  const act = useMemo(() => ({ award, awardBadge, seen, recordMax, recordSet, records: profile.records }), [award, awardBadge, seen, recordMax, recordSet, profile.records]);

  const rank = useMemo(() => {
    let cur = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) { if (profile.xp >= RANKS[i].xp) { cur = RANKS[i]; next = RANKS[i + 1] || null; } }
    return { cur, next };
  }, [profile.xp]);

  const TABS = [
    ["cell", "🧫", "الخلية والمجهر"],
    ["dna", "🧬", "الوراثة والحمض النووي"],
    ["body", "🫀", "جسم الإنسان"],
    ["eco", "🌍", "البيئة والتطور"],
    ["play", "🎮", "ألعاب وحاسبة"],
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24 overflow-x-clip" dir="rtl">
        {/* ===== hero ===== */}
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-[1.75rem] sm:rounded-3xl p-5 sm:p-8 lg:p-10 text-white ft-shadow-lg">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-lime-400/25 blur-3xl" />
          <div className="absolute -bottom-24 right-10 w-80 h-80 rounded-full bg-rose-500/25 blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-lime-400 via-rose-400 to-amber-400" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1.3px)] [background-size:24px_24px]" />
          <div className="relative">
            <Link to="/clubs/science" className="inline-flex items-center gap-1.5 text-lime-200/80 hover:text-lime-100 text-[13px] font-bold mb-4 transition"><ChevronLeft className="w-4 h-4 rotate-180" /> نادي العلوم</Link>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-[11px] font-black">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-300" /> مختبر نادي العلوم التفاعلي
                </span>
                <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-black mt-3 leading-tight">مختبر <span className="text-transparent bg-clip-text bg-gradient-to-l from-lime-300 via-rose-300 to-amber-300">علوم الحياة</span></h1>
                <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">من الخلية الأولى إلى شجرة الحياة كلها: 20 ميزة تفاعلية حيّة · وراثة حقيقية بجدول أكواد كامل، جسم إنسان ينبض أمامك، وكائنات الأردن البرية</p>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-3 shrink-0 w-full lg:w-auto">
                {[["20", "ميزة تفاعلية", "text-lime-200"], ["64", "كودوناً وراثياً", "text-rose-200"], ["6", "كائنات أردنية نادرة", "text-amber-200"], ["7", "رتب علمية", "text-emerald-200"]].map(([n, ar, cls]) => (
                  <div key={ar} className="text-center px-3 sm:px-5 py-3 rounded-2xl bg-white/[0.12] backdrop-blur ring-1 ring-white/25 ft-shadow hover:bg-white/20 hover:scale-[1.04] transition-all">
                    <div className={`text-xl sm:text-2xl font-black font-head drop-shadow ${cls}`}>{n}</div>
                    <div className="text-[10px] text-slate-300 font-bold mt-0.5">{ar}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-400 text-slate-950 text-[12.5px] font-black ft-shadow">
                {rank.cur.icon} {rank.cur.ar} · {profile.xp} خبرة أحياء
              </span>
              {rank.next && (
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 ring-1 ring-white/15">
                  <span className="w-24 h-2 rounded-full bg-white/15 overflow-hidden" dir="ltr">
                    <span className="block h-full bg-gradient-to-r from-lime-300 to-rose-300 rounded-full transition-all" style={{ width: `${Math.min(100, ((profile.xp - rank.cur.xp) / (rank.next.xp - rank.cur.xp)) * 100)}%` }} />
                  </span>
                  <span className="text-[11px] font-bold text-slate-200">الرتبة التالية عند {rank.next.xp}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 ring-1 ring-white/15 text-[12.5px] font-black">
                🏅 {profile.badges.length} / {BADGES.length} أوسمة
              </span>
            </div>
          </div>
        </div>

        {/* ===== tabs ===== */}
        <div className="mt-6 bg-white rounded-[1.75rem] sm:rounded-3xl border border-slate-100 ft-shadow-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-l from-lime-400 via-rose-400 to-amber-400" />
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 mb-6">
              {TABS.map(([id, icon, ar]) => (
                <button key={id} onClick={() => setTab(id)} data-testid={`bio-tab-${id}`}
                  className={`pressable px-3 py-3 rounded-2xl text-[12.5px] font-black transition text-right min-h-[52px] ${tab === id ? "text-white ft-shadow scale-[1.02] bg-gradient-to-l from-lime-600 via-green-600 to-emerald-700 ring-1 ring-white/30" : "bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-200 text-slate-600 hover:ring-lime-200"}`}>
                  <span className="text-lg block sm:inline">{icon}</span> {ar}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="space-y-6">
                {tab === "cell" && (<>
                  <CellExplorer act={act} />
                  <LazyMount minH={620} icon="🔬" grad="from-sky-500 to-blue-600"><MicroscopeLab act={act} /></LazyMount>
                  <LazyMount minH={420} icon="🌳" grad="from-green-500 to-lime-600"><TaxonomyExplorer act={act} /></LazyMount>
                </>)}
                {tab === "dna" && (<>
                  <DnaLab dna={dna} setDna={setDna} act={act} />
                  <LazyMount minH={560} icon="🧫" grad="from-fuchsia-500 to-purple-600"><MutationLab dna={dna} act={act} /></LazyMount>
                  <LazyMount minH={640} icon="🌸" grad="from-rose-400 to-pink-500"><PunnettLab act={act} /></LazyMount>
                  <LazyMount minH={480} icon="🎯" grad="from-violet-500 to-indigo-600"><TraitGame act={act} /></LazyMount>
                </>)}
                {tab === "body" && (<>
                  <BodyExplorer act={act} />
                  <LazyMount minH={660} icon="❤️" grad="from-rose-500 to-red-600"><HeartSim act={act} /></LazyMount>
                  <LazyMount minH={560} icon="🍽️" grad="from-amber-500 to-orange-600"><DigestionJourney act={act} /></LazyMount>
                </>)}
                {tab === "eco" && (<>
                  <EvolutionTimeline act={act} />
                  <LazyMount minH={480} icon="🪨" grad="from-stone-500 to-stone-700"><GeologicStrip act={act} /></LazyMount>
                  <LazyMount minH={980} icon="🕸️" grad="from-emerald-500 to-teal-600"><FoodWebBuilder act={act} /></LazyMount>
                  <LazyMount minH={760} icon="☀️" grad="from-amber-400 to-yellow-500"><PhotosynthesisLab act={act} /></LazyMount>
                  <LazyMount minH={520} icon="🦅" grad="from-amber-500 to-orange-600"><JordanSpecies act={act} /></LazyMount>
                </>)}
                {tab === "play" && (<>
                  <ClassifyGame act={act} />
                  <LazyMount minH={600} icon="⏱️" grad="from-sky-500 to-indigo-600"><OrganelleMatch act={act} /></LazyMount>
                  <LazyMount minH={520} icon="🧮" grad="from-teal-500 to-cyan-600"><BioCalculator act={act} /></LazyMount>
                  <LazyMount minH={520} icon="📅" grad="from-amber-500 to-orange-600"><DailyQuiz act={act} profile={profile} setProfile={setProfile} /></LazyMount>
                </>)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ===== badges + records + fact (feature 20) ===== */}
        <LazyMount minH={720} icon="🏆" grad="from-amber-400 to-orange-500" className="mt-6"><section data-testid="bio-badges">
          <div className="rounded-[1.75rem] sm:rounded-3xl bg-gradient-to-b from-amber-50/80 via-white to-lime-50/60 ring-1 ring-amber-100 ft-shadow-lg p-5 sm:p-7">
            <SecHead icon="🏆" grad="from-amber-400 to-orange-500" title="أوسمة الأحياء وسجلّ المختبر" sub="كل وسام قصة تجربة أنجزتها بنفسك · وسجلّك محفوظ على جهازك" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {BADGES.map((b) => {
                const got = profile.badges.includes(b.id);
                return (
                  <div key={b.id} className={`rounded-3xl p-3.5 text-center ring-1 transition ${got ? "bg-gradient-to-b from-amber-100 to-white ring-amber-300 ft-shadow" : "bg-white/70 ring-slate-200 opacity-60"}`}>
                    <div className={`text-3xl ${got ? "" : "grayscale"}`}>{b.icon}</div>
                    <div className="text-[12.5px] font-black text-slate-800 mt-1.5 leading-tight">{b.ar}</div>
                    <div className="text-[10px] text-slate-400 font-bold leading-snug mt-0.5">{b.desc}</div>
                    <span className={`inline-block mt-2 text-[9.5px] font-black px-2 py-0.5 rounded-full ${got ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-400"}`}>{got ? "محقق 🏆" : "مقفل"}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
              {[
                ["🎮", "أفضل نتيجة تصنيف", profile.records.classifyBest ? `${profile.records.classifyBest} / 12` : "لم تلعب بعد"],
                ["⏱️", "أسرع مطابقة عضيّات", profile.records.matchBest ? `${profile.records.matchBest} ثانية` : "لم تنهِ بعد"],
                ["🔬", "عضيّات اكتشفتها", `${(profile.records.cellSeen || []).length} / 10`],
                ["🦅", "كائنات أردنية عرفتها", `${(profile.records.jordanSeen || []).length} / 6`],
              ].map(([i, k, v]) => (
                <div key={k} className="rounded-3xl bg-white ring-1 ring-slate-100 p-4 flex items-center gap-3">
                  <span className="text-2xl">{i}</span>
                  <span><span className="block text-[15px] font-black text-slate-900">{v}</span><span className="block text-[10.5px] text-slate-400 font-black">{k}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-3xl bg-gradient-to-l from-lime-600 via-green-700 to-emerald-800 text-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="w-12 h-12 shrink-0 grid place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 text-2xl">💡</span>
              <AnimatePresence mode="wait">
                <motion.p key={factIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[13.5px] leading-relaxed font-semibold flex-1">{FACTS[factIdx]}</motion.p>
              </AnimatePresence>
              <button onClick={() => setFactIdx((i) => (i + 1) % FACTS.length)} className="pressable shrink-0 px-4 py-2.5 rounded-2xl bg-white text-green-800 text-[12px] font-head font-black active:scale-95 min-h-[44px]">حقيقة جديدة</button>
            </div>
          </div>
        </section></LazyMount>
      </div>

      {/* ===== XP toast ===== */}
      <div className="fixed inset-x-0 bottom-[86px] sm:bottom-24 z-[95] pointer-events-none px-2.5">
        <div className="max-w-[700px] mx-auto">
          <AnimatePresence>
            {toast && (
              <motion.div key="biotoast" initial={{ y: 60, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="pointer-events-auto relative overflow-hidden rounded-[1.75rem] ft-shadow-lg">
                <span className="absolute inset-0 bg-gradient-to-l from-amber-200/95 via-lime-100/95 to-emerald-100/95 backdrop-blur-xl" />
                <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/70 rounded-[1.75rem]" />
                <span className="pointer-events-none absolute -top-10 -left-6 w-36 h-36 rounded-full bg-amber-300/40 blur-3xl" />
                <span className="pointer-events-none absolute -bottom-12 right-16 w-40 h-40 rounded-full bg-lime-300/40 blur-3xl" />
                <div className="relative px-4 py-3.5 sm:px-6 flex items-center gap-3">
                  <span className="w-11 h-11 shrink-0 grid place-items-center rounded-2xl bg-white/80 ring-1 ring-amber-200 ft-shadow"><Trophy className="w-5 h-5 text-amber-600" /></span>
                  <div className="min-w-0 flex-1 text-right">
                    {toast.xp != null && (<>
                      <div className="font-head font-black text-green-950 text-[15px]">+{toast.xp} خبرة أحياء 🌿</div>
                      <div className="text-[11.5px] text-green-900/70 font-bold">أحسنت · كل تجربة ترفع رتبتك العلمية</div>
                    </>)}
                    {toast.badge && (<>
                      <div className="font-head font-black text-green-950 text-[15px]">وسام جديد: {toast.badge.ar} {toast.badge.icon}</div>
                      <div className="text-[11.5px] text-green-900/70 font-bold">{toast.badge.desc}</div>
                    </>)}
                  </div>
                  <button onClick={() => setToast(null)} className="pressable w-8 h-8 shrink-0 grid place-items-center rounded-full bg-white/70 ring-1 ring-amber-200 text-green-900 active:scale-90" aria-label="إغلاق"><X className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}

/* ================= 1 · interactive cell explorer ================= */
