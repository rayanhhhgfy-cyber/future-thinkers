import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Swords, Crown, Loader2, Check, X, Play, User, Trophy, Target, Flame, ChevronLeft, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { EASE } from "@/components/anim";
import { pieceSrc } from "@/components/chess/shared";

export function ChessArena() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [challenges, setChallenges] = useState({ incoming: [], outgoing: [] });
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [top, setTop] = useState([]);
  const [q, setQ] = useState("");
  const [matching, setMatching] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [c, g] = await Promise.all([api.get("/chess/challenges"), api.get("/chess/games")]);
    setChallenges(c.data); setGames(g.data);
  }, [user]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!user) return;
    api.get("/leaderboard/chess", { params: { limit: 5 } })
      .then((r) => setTop(r.data.items || []))
      .catch(() => {});
  }, [user]);
  useEffect(() => { if (!user) return; const t = setTimeout(() => api.get("/chess/players", { params: { q } }).then((r) => setPlayers(r.data)), 300); return () => clearTimeout(t); }, [q, user]);

  if (!user) return <div className="text-center py-16 text-slate-500">سجّل الدخول للعب الشطرنج. <button onClick={() => nav("/login")} className="text-blue-600">دخول</button></div>;

  const quickMatch = async () => {
    setMatching(true);
    try {
      const { data } = await api.post("/chess/challenge", { opponent_id: null });
      if (data.game_id) { toast.success("تم إيجاد خصم!"); nav(`/chess/${data.game_id}`); }
      else { toast.info("بانتظار خصم… سيبدأ تلقائياً عند انضمام لاعب"); load(); }
    } catch (e) { toast.error(apiErr(e)); } finally { setMatching(false); }
  };

  const challenge = async (id) => {
    try { await api.post("/chess/challenge", { opponent_id: id }); toast.success("تم إرسال التحدي"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const accept = async (cid) => { const { data } = await api.post(`/chess/challenges/${cid}/accept`); nav(`/chess/${data.game_id}`); };
  const decline = async (cid) => { await api.post(`/chess/challenges/${cid}/decline`); load(); };

  const activeGames = games.filter((g) => g.status === "active");
  const finishedGames = games.filter((g) => g.status === "finished");
  const wins = finishedGames.filter((g) => g.winner_id === user.id).length;
  const draws = finishedGames.filter((g) => g.result === "draw").length;
  const losses = finishedGames.length - wins - draws;
  const winRate = finishedGames.length ? Math.round((wins / finishedGames.length) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-[28px] text-white"
      style={{ background: "radial-gradient(1100px 550px at 50% -10%, #1b2b4a 0%, #0b1120 55%, #070b14 100%)" }}>
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div animate={{ x: [0, 35, 0], y: [0, -25, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 right-1/4 w-80 h-80 bg-amber-500/[0.09] rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 left-1/4 w-80 h-80 bg-emerald-500/[0.09] rounded-full blur-3xl" />
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8">
        {/* ===== hero ===== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <motion.div animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl grid place-items-center shrink-0 ring-1 ring-amber-300/40"
                style={{ background: "linear-gradient(145deg, rgba(252,211,77,0.25), rgba(245,158,11,0.08))", boxShadow: "0 14px 34px -10px rgba(245,158,11,0.45)" }}>
                <img src={pieceSrc("n", "w")} alt="" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]" draggable={false} />
              </motion.div>
              <div className="min-w-0">
                <h2 className="font-head text-2xl sm:text-3xl font-extrabold leading-tight">
                  حلبة الشطرنج
                  <span className="block text-sm sm:text-base font-medium text-slate-400 mt-0.5">تحدَّ أذكى العقول واصعد التصنيف</span>
                </h2>
              </div>
            </div>
            <div className="mr-auto flex items-center gap-2 sm:gap-3">
              <StatChip icon={<Crown className="w-4 h-4 text-amber-300" />} label="تصنيفك" value={`${user.chess_rating || 1200}`} />
              <StatChip icon={<Trophy className="w-4 h-4 ft-text-accent-bright" />} label="نسبة الفوز" value={`${winRate}%`} />
            </div>
          </div>

          {/* quick actions */}
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <motion.button data-testid="quick-match-btn" onClick={quickMatch} disabled={matching}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-3xl p-5 text-right disabled:opacity-60 group"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)", boxShadow: "0 20px 44px -14px rgba(245,158,11,0.55)" }}>
              <div className="absolute -left-3 -bottom-6 opacity-25 group-hover:opacity-40 transition-opacity">
                <img src={pieceSrc("q", "w")} alt="" className="w-28 h-28" draggable={false} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 font-head font-extrabold text-lg text-slate-950">
                  {matching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  مباراة سريعة
                </div>
                <p className="text-sm text-slate-900/70 mt-1 font-medium">اعثر على خصم بمستواك فوراً</p>
              </div>
            </motion.button>
            <motion.button onClick={() => nav("/chess/practice")}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-3xl p-5 text-right bg-white/[0.06] border border-white/10 backdrop-blur-xl group hover:bg-white/[0.09] transition-colors">
              <div className="absolute -left-3 -bottom-6 opacity-15 group-hover:opacity-25 transition-opacity">
                <img src={pieceSrc("k", "w")} alt="" className="w-28 h-28" draggable={false} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 font-head font-extrabold text-lg text-white">
                  <User className="w-5 h-5 ft-text-accent-bright" />
                  تدريب فردي
                </div>
                <p className="text-sm text-slate-400 mt-1">العب باللونين وحدك · جرّب الافتتاحيات والتكتيكات</p>
              </div>
            </motion.button>
            <motion.button onClick={() => nav("/chess/robot")}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-3xl p-5 text-right border border-indigo-300/30 backdrop-blur-xl group transition-colors"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.14))" }}>
              <div className="absolute -left-3 -bottom-6 opacity-20 group-hover:opacity-35 transition-opacity">
                <img src={pieceSrc("q", "b")} alt="" className="w-28 h-28" draggable={false} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 font-head font-extrabold text-lg text-white">
                  <Bot className="w-5 h-5 text-indigo-300" />
                  ضد الروبوت 🤖
                </div>
                <p className="text-sm text-indigo-200/70 mt-1">3 مستويات صعوبة</p>
              </div>
            </motion.button>
          </div>

          {/* stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <MiniStat icon={<Swords className="w-4 h-4 text-sky-300" />} label="مباريات" value={games.length} delay={0.05} />
            <MiniStat icon={<Trophy className="w-4 h-4 ft-text-accent-bright" />} label="انتصارات" value={wins} delay={0.1} />
            <MiniStat icon={<Target className="w-4 h-4 text-slate-300" />} label="تعادل" value={draws} delay={0.15} />
            <MiniStat icon={<Flame className="w-4 h-4 text-rose-300" />} label="خسائر" value={losses} delay={0.2} />
          </div>
        </motion.div>

        <TournamentsSection />

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mt-6">
          {/* ===== main column ===== */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5 min-w-0">
            {activeGames.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }}>
                <SectionTitle>مبارياتك النشطة</SectionTitle>
                <div className="space-y-2">
                  {activeGames.map((g) => (
                    <button key={g.id} data-testid={`active-game-${g.id}`} onClick={() => nav(`/chess/${g.id}`)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl p-4 bg-white/[0.06] border border-white/10 backdrop-blur-xl hover:bg-white/[0.1] ft-hover-border-accent/40 transition-all group">
                      <span className="flex items-center gap-3 min-w-0">
                        <img src={pieceSrc("p", "w")} alt="" className="w-8 h-8 shrink-0 drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]" draggable={false} />
                        <span className="font-medium text-white truncate">{g.white_name} <span className="text-slate-500 font-normal">ضد</span> {g.black_name}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold ft-text-accent-bright shrink-0">
                        العب الآن <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      </span>
                    </button>
                  ))}
                </div>
              </motion.section>
            )}

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: EASE }}>
              <SectionTitle>تحدَّ لاعباً</SectionTitle>
              <div className="rounded-3xl p-4 sm:p-5 bg-white/[0.06] border border-white/10 backdrop-blur-xl">
                <Input data-testid="player-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن طالب بالاسم…"
                  className="rounded-2xl mb-3 bg-white/[0.07] border-white/15 text-white placeholder:text-slate-500 focus-visible:ring-amber-400/50 h-11" />
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl grid place-items-center font-extrabold text-sm shrink-0 bg-gradient-to-br from-slate-400 to-slate-700 text-white ring-1 ring-white/20">
                          {p.name.trim()[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white text-sm truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.rating} ELO</div>
                        </div>
                      </div>
                      <Button size="sm" data-testid={`challenge-${p.id}`} onClick={() => challenge(p.id)}
                        className="rounded-xl shrink-0 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-bold shadow-[0_8px_20px_-6px_rgba(245,158,11,0.55)]">
                        <Swords className="w-3.5 h-3.5 ml-1" /> تحدّي
                      </Button>
                    </div>
                  ))}
                  {q && players.length === 0 && <div className="text-sm text-slate-500 text-center py-4">لا نتائج بهذا الاسم</div>}
                  {!q && players.length === 0 && <div className="text-sm text-slate-500 text-center py-4">اكتب اسماً للبحث عن لاعبين</div>}
                </div>
              </div>
            </motion.section>

            {finishedGames.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35, ease: EASE }}>
                <SectionTitle>سجل المباريات</SectionTitle>
                <div className="space-y-2">
                  {finishedGames.slice(0, 8).map((g) => {
                    const won = g.winner_id === user.id;
                    return (
                      <div key={g.id} className="flex items-center justify-between gap-3 rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08] text-sm">
                        <span className="text-slate-200 truncate">{g.white_name} <span className="text-slate-500">ضد</span> {g.black_name}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${g.result === "draw" ? "bg-slate-400/20 text-slate-300" : won ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"}`}>
                          {g.result === "draw" ? "تعادل" : won ? "فوز 🏆" : "خسارة"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </div>

          {/* ===== side column ===== */}
          <div className="space-y-4 sm:space-y-5 min-w-0">
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease: EASE }}>
              <div className={`rounded-3xl p-4 sm:p-5 backdrop-blur-xl border ${challenges.incoming.length ? "bg-amber-400/[0.08] border-amber-300/30 shadow-[0_0_40px_-12px_rgba(245,158,11,0.5)]" : "bg-white/[0.06] border-white/10"}`}>
                <h3 className="font-head font-bold flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_6px_16px_-4px_rgba(245,158,11,0.6)]"><Crown className="w-4 h-4 text-slate-950" /></span>
                  تحديات واردة
                  {challenges.incoming.length > 0 && (
                    <span className="mr-auto text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">{challenges.incoming.length}</span>
                  )}
                </h3>
                {challenges.incoming.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-3">لا تحديات جديدة</p>
                ) : challenges.incoming.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 p-3 mb-2 rounded-2xl bg-white/[0.07] border border-white/10">
                    <span className="text-sm font-bold text-white truncate">{c.challenger_name}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="icon" data-testid={`accept-${c.id}`} onClick={() => accept(c.id)}
                        className="w-9 h-9 rounded-xl ft-btn-primary shadow-lg">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" data-testid={`decline-${c.id}`} onClick={() => decline(c.id)}
                        className="w-9 h-9 rounded-xl border-white/20 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {challenges.outgoing.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4, ease: EASE }}>
                <div className="rounded-3xl p-4 sm:p-5 bg-white/[0.06] border border-white/10 backdrop-blur-xl">
                  <h3 className="font-head font-bold mb-3">تحديات مُرسلة</h3>
                  {challenges.outgoing.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="text-slate-300 truncate">{c.opponent_name || "بحث عن خصم…"}</span>
                      <span className="flex items-center gap-1.5 text-amber-300 text-xs font-bold shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" /> قيد الانتظار
                      </span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {top.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45, ease: EASE }}>
                <div className="rounded-3xl p-4 sm:p-5 bg-white/[0.06] border border-white/10 backdrop-blur-xl">
                  <h3 className="font-head font-bold flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_6px_16px_-4px_rgba(245,158,11,0.6)]"><Trophy className="w-4 h-4 text-slate-950" /></span>
                    أفضل اللاعبين
                  </h3>
                  <div className="space-y-1.5">
                    {top.map((p, i) => {
                      const isMe = p.user_id === user.id;
                      return (
                        <div key={p.user_id} className={`flex items-center gap-3 p-2.5 rounded-2xl ${isMe ? "bg-amber-400/[0.12] border border-amber-300/30" : "hover:bg-white/[0.05]"} transition-colors`}>
                          <span className="text-base w-6 text-center shrink-0">{["🥇", "🥈", "🥉"][i] || <span className="text-slate-500 font-bold text-sm">{i + 1}</span>}</span>
                          <div className="w-8 h-8 rounded-lg grid place-items-center font-extrabold text-xs shrink-0 bg-gradient-to-br from-slate-400 to-slate-700 text-white ring-1 ring-white/20">
                            {(p.name || "?").trim()[0]}
                          </div>
                          <span className="font-medium text-sm text-white truncate flex-1 min-w-0">
                            {p.name}
                            {isMe && <span className="mr-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold">أنت</span>}
                          </span>
                          <span className="font-mono font-bold text-sm text-amber-200 shrink-0">{p.chess_rating}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => nav("/leaderboard")} className="w-full mt-3 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] transition-colors">
                    لوحة الترتيب الكاملة <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.section>
            )}

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5, ease: EASE }}>
              <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 border border-white/10 bg-white/[0.06] backdrop-blur-xl">
                <img src={pieceSrc("q", "b")} alt="" className="absolute -left-4 -bottom-8 w-28 h-28 opacity-[0.12] rotate-12 pointer-events-none" draggable={false} />
                <h3 className="font-head font-bold mb-2 relative">نصيحة اليوم ♟</h3>
                <p className="text-sm text-slate-400 leading-relaxed relative">تحكّم في مركز الرقعة مبكراً، طوّر قطعك قبل الهجوم، ولا تنسَ تحريك الملك للتبييت. المركز القوي يفوز بالمباريات.</p>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 bg-white/[0.06] border border-white/10 backdrop-blur-xl">
      <span className="w-8 h-8 rounded-xl grid place-items-center bg-white/[0.08] ring-1 ring-white/10">{icon}</span>
      <span>
        <span className="block text-[10px] text-slate-400 leading-none">{label}</span>
        <span className="block font-head font-extrabold text-base leading-tight">{value}</span>
      </span>
    </div>
  );
}

function MiniStat({ icon, label, value, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: EASE }}
      className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 bg-white/[0.05] border border-white/[0.08]">
      {icon}
      <span className="min-w-0">
        <span className="block font-head font-extrabold leading-none">{value}</span>
        <span className="block text-[10px] text-slate-400 mt-1 leading-none">{label}</span>
      </span>
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="font-head font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
      <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-orange-500" />
      {children}
    </h3>
  );
}

function TournamentsSection() {
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const load = () => api.get("/chess/tournaments").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (name.trim().length < 3) return toast.error("اسم البطولة قصير");
    setBusy("create");
    try { await api.post("/chess/tournaments", { name: name.trim(), max_players: 8 }); setName(""); load(); toast.success("أُنشئت البطولة · شارك الرابط مع اللاعبين 🏆"); }
    catch (e) { toast.error(apiErr(e)); }
    setBusy("");
  };
  const act = async (path, msg) => {
    try { const { data } = await api.post(path); if (data.game_id) nav(`/chess/${data.game_id}`); else { toast.success(msg); load(); } }
    catch (e) { toast.error(apiErr(e)); }
  };

  const rounds = (t) => {
    const by = {};
    (t.matches || []).forEach((m) => { (by[m.round] = by[m.round] || []).push(m); });
    return Object.entries(by).sort((a, b) => a[0] - b[0]);
  };

  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }} className="mt-6">
      <SectionTitle>بطولات الشطرنج 🏆</SectionTitle>
      <div className="rounded-3xl bg-white/[0.05] border border-white/10 backdrop-blur-xl p-4 sm:p-5">
        <div className="flex gap-2 flex-wrap mb-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم بطولة جديدة: كأس الجمعة"
            className="flex-1 min-w-[200px] bg-white/10 border-white/15 text-white placeholder:text-slate-500 rounded-xl" />
          <Button onClick={create} disabled={busy === "create"} className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
            <Trophy className="w-4 h-4 ml-1" /> إنشاء بطولة
          </Button>
        </div>
        {!items ? <div className="text-slate-500 text-sm py-4 text-center">جارٍ التحميل…</div> : items.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">لا بطولات بعد · أنشئ أول بطولة ودعُ زملاءك</p>
        ) : (
          <div className="space-y-4">
            {items.map((t) => (
              <div key={t.id} className="rounded-2xl bg-slate-950/50 border border-white/[0.07] p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center text-slate-950 shrink-0"><Trophy className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-head font-extrabold text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-400">{(t.players || []).length}/{t.max_players} لاعب · منشئ: {t.creator_name}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${t.status === "registration" ? "bg-sky-500/15 text-sky-300" : t.status === "running" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {t.status === "registration" ? "التسجيل مفتوح" : t.status === "running" ? "جارية ⚔️" : `انتهت · البطل: ${t.champion_name || ""} 🏆`}
                  </span>
                  {t.status === "registration" && !t.joined && (
                    <button onClick={() => act(`/chess/tournaments/${t.id}/join`, "انضممت للبطولة ✓")} className="pressable px-4 py-2 rounded-xl ft-btn-solid text-xs font-bold">انضم</button>
                  )}
                  {t.status === "registration" && t.joined && (
                    <button onClick={() => act(`/chess/tournaments/${t.id}/start`, "بدأت البطولة!")} className="pressable px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold">بدء البطولة</button>
                  )}
                  {t.joined && t.status === "registration" && <span className="text-[11px] font-bold text-emerald-300">مسجل ✓</span>}
                </div>
                {t.status !== "registration" && rounds(t).map(([rnd, ms]) => (
                  <div key={rnd} className="mt-3">
                    <div className="text-[11px] font-extrabold text-slate-500 mb-1.5">{Number(rnd) === 1 && (t.matches || []).length <= 2 ? "النهائي" : `الجولة ${rnd}`}</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {ms.map((m) => (
                        <div key={m.idx} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm">
                          <span className={`flex-1 truncate ${m.winner_id === m.a_id ? "text-amber-300 font-extrabold" : "text-slate-200"}`}>{m.a_name}</span>
                          <span className="text-slate-600 text-xs font-bold">ضد</span>
                          <span className={`flex-1 truncate text-left ${m.winner_id === m.b_id ? "text-amber-300 font-extrabold" : "text-slate-200"}`}>{m.b_name || "· (تأهل تلقائي)"}</span>
                          {m.status === "done" && m.winner_id && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                          {(m.status === "pending" || m.status === "playing") && (
                            <button onClick={() => act(`/chess/tournaments/${t.id}/matches/${m.idx}/play`, "")}
                              className="pressable px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-extrabold shrink-0">
                              {m.status === "playing" ? "استكمال" : "العب"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
