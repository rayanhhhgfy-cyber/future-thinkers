import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { X, Plus, Check, ListMusic, Loader2 } from "lucide-react";

const COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

/** Dialog: add a book to one of my playlists (or create a new one). */
export function PlaylistPicker({ bookId, bookTitle, onClose }) {
  const { user } = useAuth();
  const [lists, setLists] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/library/playlists").then((r) => setLists(r.data)).catch(() => setLists([]));
  }, []);

  if (!user) return null;

  const createAndAdd = async () => {
    const n = name.trim();
    if (!n) return toast.error("اكتب اسم القائمة أولاً");
    setBusy(true);
    try {
      const { data } = await api.post("/library/playlists", { name: n, color });
      await api.post(`/library/playlists/${data.id}/books`, { book_id: bookId });
      toast.success(`أُضيف «${bookTitle}» إلى قائمة جديدة 🎵`);
      onClose?.();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const addTo = async (p) => {
    setBusy(true);
    try {
      await api.post(`/library/playlists/${p.id}/books`, { book_id: bookId });
      toast.success(`أُضيف إلى «${p.name}» 🎵`);
      onClose?.();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-head font-extrabold text-lg text-slate-900">أضف إلى قائمة 📚</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4 line-clamp-1">{bookTitle}</p>

        {!lists ? (
          <div className="py-8 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : lists.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">لا قوائم بعد · أنشئ أول قائمة لك تحت</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
            {lists.map((p) => {
              const inside = (p.books || []).some((b) => b.id === bookId);
              return (
                <button key={p.id} disabled={busy || inside} onClick={() => addTo(p)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-right transition-all ${inside ? "bg-emerald-50 border-emerald-200" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"}`}>
                  <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${p.color}1f`, color: p.color }}>
                    <ListMusic className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-slate-800 truncate">{p.name}</span>
                    <span className="block text-[11px] text-slate-400">{p.count} كتاب</span>
                  </span>
                  {inside
                    ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Check className="w-3.5 h-3.5" /> موجودة</span>
                    : <Plus className="w-4 h-4 text-slate-400" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <div className="text-xs font-bold text-slate-500 mb-2">قائمة جديدة</div>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم القائمة… مثل: كتب الصيف"
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            <button onClick={createAndAdd} disabled={busy}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء وإضافة"}
            </button>
          </div>
          <div className="flex gap-1.5 mt-3">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label="لون"
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-110"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
