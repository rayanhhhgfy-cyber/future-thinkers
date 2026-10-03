import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Check, X, PenLine, MessageSquare, BookOpenText, PartyPopper } from "lucide-react";

/* مراجعة الاستوديو · معرض الأعمال
   نفس نقاط النهاية والإجراءات تماماً كما كانت في StudioPanel داخل Admin.jsx:
   GET /studio/queue · POST /studio/works/{id}/approve|reject {note} */

const TYPE_ART = {
  article: { grad: "from-blue-600 via-indigo-600 to-violet-600", soft: "bg-blue-50 text-blue-600" },
  poetry: { grad: "from-violet-600 via-purple-600 to-fuchsia-500", soft: "bg-violet-50 text-violet-600" },
  essay: { grad: "from-amber-500 via-orange-500 to-rose-500", soft: "bg-amber-50 text-amber-600" },
  story: { grad: "from-emerald-600 via-teal-600 to-cyan-600", soft: "bg-emerald-50 text-emerald-600" },
};
const FALLBACK_ART = { grad: "from-slate-600 via-slate-700 to-slate-900", soft: "bg-slate-100 text-slate-600" };
const artOf = (w) => TYPE_ART[w.type] || FALLBACK_ART;

const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
};

function AuthorRow({ w, light }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur border border-white/25 text-white font-head font-extrabold grid place-items-center shrink-0 text-sm">
        {(w.author_name || "؟").trim().charAt(0)}
      </span>
      <div className="min-w-0 leading-tight">
        <div className={`text-[13px] font-bold truncate ${light ? "text-white" : "text-slate-800"}`}>{w.author_name}</div>
        <div className={`text-[10px] ${light ? "text-white/70" : "text-slate-400"}`}>{fmtDate(w.submitted_at || w.created_at)}</div>
      </div>
      {typeof w.comments_count === "number" && (
        <span className={`mr-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${light ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
          <MessageSquare className="w-3 h-3" /> {w.comments_count}
        </span>
      )}
    </div>
  );
}

export default function AdminStudioReview() {
  const [queue, setQueue] = useState(null);
  const [note, setNote] = useState({});
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(() => new Set());

  const load = async () => {
    try { const { data } = await api.get("/studio/queue"); setQueue(data); }
    catch { setQueue([]); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e) => { if (e.key === "Escape") setViewing(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  const review = async (id, action) => {
    setBusy((prev) => new Set(prev).add(id));
    try {
      await api.post(`/studio/works/${id}/${action}`, { note: note[id] || "" });
      toast.success(action === "approve" ? "تم النشر 🎉" : "تم الرفض مع الملاحظة");
      setNote({ ...note, [id]: "" });
      setViewing((v) => (v && v.id === id ? null : v));
      load();
    } catch (e) { toast.error(apiErr(e)); }
    finally {
      setBusy((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  if (!queue) return <PageLoader />;

  const actionButtons = (w, big) => {
    const isBusy = busy.has(w.id);
    return (
      <div className="flex gap-2">
        <Button disabled={isBusy} data-testid={`admin-studio-approve-${w.id}`} onClick={() => review(w.id, "approve")}
          className={`flex-1 ${big ? "min-h-[56px] text-base" : "min-h-[52px]"} rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md shadow-emerald-600/20`}>
          <Check className="w-5 h-5 ml-1.5" /> نشر العمل
        </Button>
        <Button disabled={isBusy} variant="outline" data-testid={`admin-studio-reject-${w.id}`} onClick={() => review(w.id, "reject")}
          className={`flex-1 ${big ? "min-h-[56px] text-base" : "min-h-[52px]"} rounded-2xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold`}>
          <X className="w-5 h-5 ml-1.5" /> رفض
        </Button>
      </div>
    );
  };
  const noteInput = (w) => (
    <Input value={note[w.id] || ""} onChange={(e) => setNote({ ...note, [w.id]: e.target.value })}
      placeholder="ملاحظة للكاتب (تظهر عند الرفض، اختيارية عند القبول)..." className="rounded-xl min-h-[48px]"
      data-testid={`admin-studio-note-${w.id}`} />
  );

  return (
    <div className="space-y-5" data-testid="admin-studio-review">
      <FadeUp>
        <div>
          <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <PenLine className="w-5 h-5 text-violet-600" /> مراجعة الاستوديو
            {queue.length > 0 && <span className="px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-extrabold">{queue.length} عمل بانتظارك</span>}
          </h2>
          <p className="text-xs text-slate-400 mt-1">اقرأ العمل كاملاً في نافذة القراءة، اكتب ملاحظتك للكاتب، ثم انشر أو ارفض.</p>
        </div>
      </FadeUp>

      {queue.length === 0 ? (
        <FadeUp>
          <div className="relative overflow-hidden bg-white rounded-[28px] border border-slate-100 ft-shadow p-8 sm:p-12 text-center" data-testid="admin-studio-empty">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white grid place-items-center shadow-lg shadow-violet-500/25">
              <PartyPopper className="w-8 h-8" />
            </div>
            <div className="font-head font-extrabold text-lg text-slate-900 mt-4">لا أعمال بانتظار المراجعة 🎉</div>
            <p className="text-sm text-slate-400 mt-1.5">طابور الاستوديو فارغ · كل الأعمال مُراجعة.</p>
          </div>
        </FadeUp>
      ) : (
        <Stagger className="grid md:grid-cols-2 gap-4 sm:gap-5">
          {queue.map((w) => {
            const art = artOf(w);
            return (
              <Item key={w.id}>
                <article className="h-full flex flex-col bg-white rounded-[26px] border border-slate-100 ft-shadow overflow-hidden" data-testid={`admin-studio-card-${w.id}`}>
                  {/* غلاف العمل */}
                  <button type="button" onClick={() => setViewing(w)} data-testid={`admin-studio-read-${w.id}`}
                    className={`relative block w-full text-right bg-gradient-to-br ${art.grad} text-white p-5 sm:p-6 overflow-hidden group`}>
                    <PenLine className="absolute -bottom-5 -left-3 w-28 h-28 text-white/10 rotate-12 pointer-events-none" />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur text-[10px] font-extrabold">{w.type_label}</span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/85 group-hover:text-white transition-colors">
                          <BookOpenText className="w-4 h-4" /> قراءة النص
                        </span>
                      </div>
                      <h3 className="font-head font-extrabold text-xl leading-snug line-clamp-2 min-h-[3.4rem]">{w.title}</h3>
                      <p className="text-xs text-white/75 leading-relaxed line-clamp-2 mt-2 min-h-[2rem]">{w.excerpt || (w.content || "").slice(0, 160)}</p>
                      <div className="mt-4"><AuthorRow w={w} light /></div>
                    </div>
                  </button>
                  {/* إجراءات */}
                  <div className="flex-1 flex flex-col gap-3 p-4 sm:p-5">
                    {noteInput(w)}
                    {actionButtons(w, false)}
                  </div>
                </article>
              </Item>
            );
          })}
        </Stagger>
      )}

      {/* ===== نافذة قراءة العمل ===== */}
      <AnimatePresence>
        {viewing && (
          <motion.div key="studio-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setViewing(null)} data-testid="admin-studio-modal">
            <motion.div initial={{ y: 48, opacity: 0, scale: 0.99 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 48, opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.28 }}
              className="w-full max-w-3xl max-h-[92dvh] sm:max-h-[88dvh] bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col ft-shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              <div className={`relative bg-gradient-to-br ${artOf(viewing).grad} text-white p-5 sm:p-7 shrink-0 overflow-hidden`}>
                <PenLine className="absolute -bottom-6 -left-4 w-36 h-36 text-white/10 rotate-12 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur text-[10px] font-extrabold">{viewing.type_label}</span>
                    <button onClick={() => setViewing(null)} data-testid="admin-studio-modal-close"
                      className="w-9 h-9 rounded-full bg-white/15 border border-white/20 backdrop-blur grid place-items-center hover:bg-white/25 transition-colors shrink-0" aria-label="إغلاق">
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>
                  <h3 className="font-head font-extrabold text-2xl sm:text-3xl leading-snug mt-3">{viewing.title}</h3>
                  <div className="mt-4"><AuthorRow w={viewing} light /></div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="whitespace-pre-wrap text-[15px] text-slate-700 leading-loose">{viewing.content}</div>
              </div>
              <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-3">
                {noteInput(viewing)}
                {actionButtons(viewing, true)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
