import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { Trophy, Medal, Share2, Crown, Loader2 } from "lucide-react";

/* Shared leaderboard panel for the three games · today / all-time / my school. */
export function BoardPanel({ game, accent = "#059669" }) {
  const [scope, setScope] = useState("today");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (sc) => {
    setBusy(true);
    try {
      const { data: d } = await api.get(`/games/boards/${game}?scope=${sc}`);
      setData(d);
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  useEffect(() => { load(scope); }, [scope, game]);

  const tabs = [
    { k: "today", l: "اليوم" },
    { k: "all", l: "كل الأوقات" },
    { k: "school", l: "مدرستي" },
  ];
  const medal = ["#F59E0B", "#94A3B8", "#D97706"];
  return (
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-head font-extrabold text-slate-800 flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0" style={{ background: accent }}><Trophy className="w-4.5 h-4.5" /></span>
          لوحة الصدارة
        </h3>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setScope(t.k)}
              className={`pressable px-3 min-h-[36px] rounded-lg text-xs font-extrabold transition ${scope === t.k ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-1.5 min-h-[120px]">
        {busy && <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…</div>}
        {!busy && data && data.board.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">لا نتائج بعد هنا · كن أول من يلعب اليوم 🎯</p>
        )}
        {!busy && data && data.board.map((r) => (
          <div key={r.user_id + r.rank}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.me ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-50/70"}`}>
            <span className="w-8 h-8 rounded-full grid place-items-center text-xs font-black shrink-0 text-white"
              style={{ background: r.rank <= 3 ? medal[r.rank - 1] : "#CBD5E1", color: r.rank <= 3 ? "#fff" : "#475569" }}>
              {r.rank <= 3 ? <Medal className="w-4 h-4" /> : r.rank}
            </span>
            <span className="w-9 h-9 rounded-full ft-icon-tile text-white grid place-items-center text-xs font-black shrink-0 overflow-hidden">
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : (r.name?.[0] || "؟")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-slate-800 truncate">{r.name} {r.me && <span className="text-emerald-600 text-[10px]">(أنت)</span>}</div>
              <div className="text-[11px] text-slate-400 truncate">{r.school_name}</div>
            </div>
            <span className="font-head font-black text-slate-800 shrink-0" dir="ltr">{r.score}</span>
          </div>
        ))}
      </div>
      {data && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-400 flex items-center justify-between">
          <span>{data.total_players} لاعب في هذه اللوحة</span>
          <span>{data.my_rank ? <>ترتيبك: <b className="text-slate-700">#{data.my_rank}</b></> : "العب اليوم لتظهر هنا"}</span>
        </div>
      )}
    </div>
  );
}

/* Canvas result card (1080x1350) · share via Web Share when possible, else download. */
export function ShareResultButton({ gameLabel, title, score, lines = [], color = "#059669", label = "شارك نتيجتي" }) {
  const [busy, setBusy] = useState(false);
  const draw = async () => {
    setBusy(true);
    try {
      const c = document.createElement("canvas");
      c.width = 1080; c.height = 1350;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 1080, 1350);
      g.addColorStop(0, "#0A192F"); g.addColorStop(0.55, color); g.addColorStop(1, "#0F766E");
      x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
      x.fillStyle = "rgba(255,255,255,0.08)";
      x.beginPath(); x.arc(920, 180, 260, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(120, 1180, 300, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#fff"; x.textAlign = "center";
      x.font = "900 64px 'Segoe UI', Tahoma, sans-serif";
      x.fillText("مفكرو المستقبل", 540, 190);
      x.font = "700 40px 'Segoe UI', Tahoma, sans-serif";
      x.fillStyle = "rgba(255,255,255,0.75)";
      x.fillText(gameLabel, 540, 260);
      x.font = "900 92px 'Segoe UI', Tahoma, sans-serif";
      x.fillStyle = "#fff";
      x.fillText(title, 540, 470);
      x.font = "900 230px 'Segoe UI', Tahoma, sans-serif";
      x.fillText(String(score), 540, 760);
      x.font = "700 44px 'Segoe UI', Tahoma, sans-serif";
      x.fillStyle = "rgba(255,255,255,0.9)";
      lines.slice(0, 4).forEach((ln, i) => x.fillText(ln, 540, 880 + i * 72));
      x.font = "700 38px 'Segoe UI', Tahoma, sans-serif";
      x.fillStyle = "rgba(255,255,255,0.6)";
      x.fillText("f-thinkers.vercel.app", 540, 1240);
      const blob = await new Promise((res) => c.toBlob(res, "image/png"));
      const file = new File([blob], "ft-result.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "نتيجتي في مفكرو المستقبل" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "ft-result.png"; a.click();
        URL.revokeObjectURL(url);
        toast.success("تم تنزيل بطاقة النتيجة 📸");
      }
    } catch { /* user cancelled share */ }
    setBusy(false);
  };
  return (
    <button onClick={draw} disabled={busy}
      className="pressable inline-flex items-center gap-2 px-5 min-h-[46px] rounded-2xl bg-slate-900 text-white text-sm font-extrabold shadow-xl hover:bg-slate-800 disabled:opacity-50">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} {label}
    </button>
  );
}
