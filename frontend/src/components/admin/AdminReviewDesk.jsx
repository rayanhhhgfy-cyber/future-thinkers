import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import BookCover from "@/components/BookCover";
import { Check, X, Flag, BookOpen, Sparkles, ShieldCheck, RefreshCw, PartyPopper, EyeOff, Trash2 } from "lucide-react";

/* مراجعة المحتوى · مكتب المراجعة
   نفس نقاط النهاية والإجراءات تماماً كما كانت في Moderation داخل Admin.jsx:
   GET /books/pending · GET /activities/pending · GET /reports
   POST /books/{id}/{action} · POST /activities/{id}/{action} · POST /reports/{id}/resolve */

const ENTITY_LABELS = {
  book: "كتاب", discussion: "مناقشة", reply: "رد", user: "مستخدم",
  event: "فعالية", activity: "نشاط", work: "عمل أدبي", comment: "تعليق",
};

const FILTERS = [
  { k: "all", l: "الكل" },
  { k: "books", l: "كتب" },
  { k: "activities", l: "أنشطة" },
  { k: "reports", l: "بلاغات" },
];

function Avatar({ name, grad }) {
  return (
    <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${grad} text-white font-head font-extrabold grid place-items-center shrink-0 shadow-sm`}>
      {(name || "؟").trim().charAt(0)}
    </span>
  );
}

function DeskCard({ children, testid }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -56, scale: 0.97, transition: { duration: 0.22 } }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5" data-testid={testid}>
      {children}
    </motion.div>
  );
}

export default function AdminReviewDesk() {
  const [books, setBooks] = useState([]);
  const [acts, setActs] = useState([]);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(() => new Set());

  const load = async () => {
    const [b, a, r] = await Promise.all([
      api.get("/books/pending").catch(() => ({ data: [] })),
      api.get("/activities/pending").catch(() => ({ data: [] })),
      api.get("/reports").catch(() => ({ data: [] })),
    ]);
    setBooks(b.data); setActs(a.data); setReports(r.data);
  };
  useEffect(() => { load(); }, []);

  const markBusy = (key, on) => setBusy((prev) => {
    const next = new Set(prev);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

  const actBook = async (id, action, reason = "") => {
    const key = `book-${id}`;
    markBusy(key, true);
    try {
      await api.post(`/books/${id}/${action}`, action === "reject" ? { reason } : undefined);
      toast.success(action === "approve" ? "تمت الموافقة" : "تم الرفض");
      setBooks((prev) => prev.filter((b) => b.id !== id));
      load();
    } finally { markBusy(key, false); }
  };
  const actActivity = async (id, action) => {
    const key = `act-${id}`;
    markBusy(key, true);
    try {
      await api.post(`/activities/${id}/${action}`);
      toast.success("تم");
      setActs((prev) => prev.filter((a) => a.id !== id));
      load();
    } finally { markBusy(key, false); }
  };
  const resolveReport = async (id, action) => {
    const key = `rep-${id}`;
    markBusy(key, true);
    try {
      await api.post(`/reports/${id}/resolve`, { action, note: "" });
      toast.success("تم");
      setReports((prev) => prev.filter((r) => r.id !== id));
      load();
    } finally { markBusy(key, false); }
  };

  const total = books.length + acts.length + reports.length;
  const counts = { all: total, books: books.length, activities: acts.length, reports: reports.length };
  const show = (k) => filter === "all" || filter === k;

  const groupHead = (icon, title, n, chipCls) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className={`w-8 h-8 rounded-xl grid place-items-center ${chipCls}`}>{icon}</span>
      <h3 className="font-head font-bold text-slate-800">{title}</h3>
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold">{n}</span>
    </div>
  );
  const emptyLine = (t) => <div className="text-center py-8 text-slate-400 text-sm font-semibold bg-white rounded-3xl border border-dashed border-slate-200">{t}</div>;

  return (
    <div className="space-y-5" data-testid="admin-review-desk">
      {/* رأس المكتب */}
      <FadeUp>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-head font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> مكتب المراجعة
              {total > 0 && <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold">{total} بانتظار قرارك</span>}
            </h2>
            <p className="text-xs text-slate-400 mt-1">كتب وأنشطة وبلاغات بانتظار قرارك · وافق أو ارفض بضغطة واحدة.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl min-h-[40px]" data-testid="admin-review-refresh">
            <RefreshCw className="w-4 h-4 ml-1.5" /> تحديث
          </Button>
        </div>
      </FadeUp>

      {/* فلاتر النوع */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-testid="admin-review-filters">
        {FILTERS.map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} data-testid={`admin-review-filter-${f.k}`}
            className={`shrink-0 min-h-[42px] px-4 rounded-2xl text-sm font-bold transition active:scale-[0.97] ${filter === f.k ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {f.l}
            <span className={`mr-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${filter === f.k ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[f.k]}</span>
          </button>
        ))}
      </div>

      {total === 0 ? (
        <FadeUp>
          <div className="relative overflow-hidden bg-white rounded-[28px] border border-slate-100 ft-shadow p-8 sm:p-12 text-center" data-testid="admin-review-empty">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white grid place-items-center shadow-lg shadow-emerald-500/25">
              <PartyPopper className="w-8 h-8" />
            </div>
            <div className="font-head font-extrabold text-lg text-slate-900 mt-4">كل شيء مُراجَع 🎉</div>
            <p className="text-sm text-slate-400 mt-1.5">لا كتب ولا أنشطة ولا بلاغات بانتظارك الآن · عمل رائع.</p>
          </div>
        </FadeUp>
      ) : (
        <>
          {/* ===== الكتب ===== */}
          {show("books") && (
            <section>
              {groupHead(<BookOpen className="w-4 h-4" />, `كتب بانتظار المراجعة (${books.length})`, books.length, "bg-blue-50 text-blue-600")}
              {books.length === 0 ? emptyLine("لا كتب معلّقة") : (
                <Stagger className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {books.map((b) => {
                      const isBusy = busy.has(`book-${b.id}`);
                      return (
                        <Item key={b.id}>
                          <DeskCard testid={`admin-review-book-${b.id}`}>
                            <div className="flex gap-3.5">
                              <BookCover book={{ ...b, cover_url: b.cover_url || b.cover_path }} className="w-14 h-[76px] rounded-xl object-cover shrink-0 shadow-sm" imgClassName="w-14 h-[76px] rounded-xl object-cover" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <div className="font-head font-bold text-slate-900 leading-snug flex-1 min-w-[140px]">{b.title}</div>
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-extrabold shrink-0">كتاب</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{b.author} · رفعه {b.uploader_name}</div>
                                {b.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{b.description}</p>}
                                <div className="flex items-center gap-2 mt-2.5">
                                  <Avatar name={b.uploader_name} grad="from-blue-500 to-indigo-600" />
                                  <div className="text-[11px] text-slate-400 leading-tight">
                                    <div className="font-bold text-slate-600">{b.uploader_name}</div>
                                    <div>بانتظار المراجعة{b.created_at ? ` · ${timeAgo(b.created_at)}` : ""}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button disabled={isBusy} data-testid={`approve-book-${b.id}`} onClick={() => actBook(b.id, "approve")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold shadow-md shadow-emerald-600/20">
                                <Check className="w-5 h-5 ml-1.5" /> موافقة ونشر
                              </Button>
                              <Button disabled={isBusy} variant="outline" data-testid={`reject-book-${b.id}`} onClick={() => actBook(b.id, "reject", "لا يتوافق مع معايير النشر")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl text-rose-600 border-rose-200 hover:bg-rose-50 text-sm font-bold">
                                <X className="w-5 h-5 ml-1.5" /> رفض
                              </Button>
                            </div>
                          </DeskCard>
                        </Item>
                      );
                    })}
                  </AnimatePresence>
                </Stagger>
              )}
            </section>
          )}

          {/* ===== الأنشطة ===== */}
          {show("activities") && (
            <section>
              {groupHead(<Sparkles className="w-4 h-4" />, `أنشطة بانتظار المراجعة (${acts.length})`, acts.length, "bg-emerald-50 text-emerald-600")}
              {acts.length === 0 ? emptyLine("لا أنشطة معلّقة") : (
                <Stagger className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {acts.map((a) => {
                      const isBusy = busy.has(`act-${a.id}`);
                      return (
                        <Item key={a.id}>
                          <DeskCard testid={`admin-review-activity-${a.id}`}>
                            <div className="flex gap-3.5">
                              <Avatar name={a.author_name} grad="from-emerald-500 to-teal-600" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <div className="font-head font-bold text-slate-900 leading-snug flex-1 min-w-[140px]">{a.title}</div>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-extrabold shrink-0">نشاط</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{a.author_name} · {a.school_name}</div>
                                {a.description && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{a.description}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button disabled={isBusy} data-testid={`admin-approve-activity-${a.id}`} onClick={() => actActivity(a.id, "approve")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-sm font-bold shadow-md shadow-emerald-600/20">
                                <Check className="w-5 h-5 ml-1.5" /> موافقة ونشر
                              </Button>
                              <Button disabled={isBusy} variant="outline" data-testid={`admin-reject-activity-${a.id}`} onClick={() => actActivity(a.id, "reject")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl text-rose-600 border-rose-200 hover:bg-rose-50 text-sm font-bold">
                                <X className="w-5 h-5 ml-1.5" /> رفض
                              </Button>
                            </div>
                          </DeskCard>
                        </Item>
                      );
                    })}
                  </AnimatePresence>
                </Stagger>
              )}
            </section>
          )}

          {/* ===== البلاغات ===== */}
          {show("reports") && (
            <section>
              {groupHead(<Flag className="w-4 h-4" />, `بلاغات مفتوحة (${reports.length})`, reports.length, "bg-rose-50 text-rose-600")}
              {reports.length === 0 ? emptyLine("لا بلاغات") : (
                <Stagger className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {reports.map((r) => {
                      const isBusy = busy.has(`rep-${r.id}`);
                      return (
                        <Item key={r.id}>
                          <DeskCard testid={`admin-review-report-${r.id}`}>
                            <div className="flex gap-3.5">
                              <Avatar name={r.reporter_name} grad="from-rose-500 to-red-600" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <div className="font-head font-bold text-slate-900 leading-snug flex-1 min-w-[140px]">{r.reason}</div>
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-extrabold shrink-0">بلاغ · {ENTITY_LABELS[r.entity_type] || r.entity_type}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">بلّغ عنه: {r.reporter_name}{r.created_at ? ` · ${timeAgo(r.created_at)}` : ""}</div>
                                {r.details && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{r.details}</p>}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button disabled={isBusy} variant="outline" data-testid={`admin-dismiss-report-${r.id}`} onClick={() => resolveReport(r.id, "dismiss")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl text-sm font-bold">
                                <EyeOff className="w-5 h-5 ml-1.5" /> تجاهل
                              </Button>
                              <Button disabled={isBusy} data-testid={`admin-delete-report-${r.id}`} onClick={() => resolveReport(r.id, "delete")} className="flex-1 sm:flex-none min-h-[52px] px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-sm font-bold shadow-md shadow-rose-600/20">
                                <Trash2 className="w-5 h-5 ml-1.5" /> حذف المحتوى
                              </Button>
                            </div>
                          </DeskCard>
                        </Item>
                      );
                    })}
                  </AnimatePresence>
                </Stagger>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
