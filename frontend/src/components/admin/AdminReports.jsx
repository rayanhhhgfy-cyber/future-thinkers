import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import { Flag, RefreshCw, Trash2, EyeOff, Inbox, CheckCircle2, XCircle, PartyPopper, MessagesSquare, X, TriangleAlert, PencilLine } from "lucide-react";

/* الإبلاغات · مركز البلاغات
   إعادة تصميم بصرية فقط: نفس الجلب GET /reports?status ونفس الحسم
   POST /reports/{id}/resolve {action: delete|dismiss} بنفس رسائل النجاح.
   عدّادات التبويبات تُحسب من نفس نقطة النهاية بحالاتها الثلاث. */

const REPORT_KIND = { book: "كتاب", discussion: "نقاش", reply: "رد", user: "مستخدم", event: "فعالية", activity: "نشاط", work: "عمل أدبي", comment: "تعليق كتاب", message: "رسالة" };
const KIND_COLORS = {
  book: "#2563EB", discussion: "#7C3AED", reply: "#0891B2", user: "#475569",
  event: "#059669", activity: "#D97706", work: "#C026D3", comment: "#0E7490", message: "#E11D48",
};
const STATUS_TABS = [
  { k: "open", l: "المفتوحة", icon: Inbox, c: "#E11D48" },
  { k: "resolved", l: "المُغلقة", icon: CheckCircle2, c: "#059669" },
  { k: "dismissed", l: "المرفوضة", icon: XCircle, c: "#64748B" },
];

function FullTranscript({ report, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/dm/admin/conversations/${report.conversation_id}/full`)
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [], conversation: null, failed: true }));
  }, [report.conversation_id]);
  if (!data) return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="rounded-3xl bg-white px-8 py-6 text-sm font-bold text-slate-500 shadow-2xl">جارٍ تحميل المحادثة كاملة…</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="font-head font-extrabold text-slate-800 flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-rose-500" /> المحادثة كاملة
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              {(data.conversation?.members || []).map((m) => m.name).join(" ↔ ")} · كل الرسائل منذ البداية · تشمل المحذوفة والمعدّلة
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 px-4 py-4" dir="rtl">
          {data.failed && <div className="py-10 text-center text-sm font-bold text-rose-500">تعذّر تحميل المحادثة</div>}
          {!data.failed && (data.items || []).length === 0 && <div className="py-10 text-center text-sm text-slate-400">لا رسائل في هذه المحادثة</div>}
          {(data.items || []).map((m) => {
            const reported = report.entity_type === "message" && m.id === report.entity_id;
            const mine = m.sender_id !== report.reporter_id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ring-1 sm:max-w-[75%] ${
                  reported ? "bg-rose-50 ring-2 ring-rose-400" : m.deleted ? "bg-slate-100 text-slate-500 ring-slate-200" : "bg-white text-slate-700 ring-slate-100"}`}>
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <span>{m.sender_name}</span>
                    <span>·</span><span>{new Date(m.at).toLocaleString("ar-EG")}</span>
                    {reported && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-white">الرسالة المُبلَّغ عنها</span>}
                    {m.deleted && <span className="rounded-full bg-slate-500 px-1.5 py-0.5 text-white">محذوفة · النص الأصلي ظاهر لك فقط</span>}
                    {m.edited && !m.deleted && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">معدّلة</span>}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.body || "·"}</div>
                  {m.edited && m.original_body && m.original_body !== m.body && (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-600">
                      <PencilLine className="mt-0.5 h-3 w-3 shrink-0" /> قبل التعديل: {m.original_body}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState(null);
  const [viewReport, setViewReport] = useState(null);
  const [counts, setCounts] = useState({ open: null, resolved: null, dismissed: null });

  const loadCounts = () => {
    Promise.all(["open", "resolved", "dismissed"].map((s) =>
      api.get("/reports", { params: { status: s } })
        .then((r) => [s, Array.isArray(r.data) ? r.data.length : 0])
        .catch(() => [s, null])
    )).then((pairs) => setCounts((c) => ({ ...c, ...Object.fromEntries(pairs) })));
  };
  const load = () => {
    setItems(null);
    api.get("/reports", { params: { status } })
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]));
  };
  useEffect(load, [status]);
  useEffect(loadCounts, []);

  const resolve = async (id, action) => {
    try {
      await api.post(`/reports/${id}/resolve`, { action });
      toast.success(action === "delete" ? "حُذف المحتوى وأُغلق البلاغ" : action === "warn" ? "أُرسل التحذير وأُغلق البلاغ" : "أُغلق البلاغ");
      load(); loadCounts();
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div data-testid="admin-reports">
      <FadeUp>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#E11D48,#E11D48BB)" }}><Flag className="w-4.5 h-4.5" /></span>
              مركز البلاغات
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">بلاغات الأعضاء عن المحتوى · راجعها واحسمها: حذف المحتوى المخالف أو تجاهل البلاغ.</p>
          </div>
          <button onClick={() => { load(); loadCounts(); }} data-testid="admin-reports-refresh"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-100 ft-shadow text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
      </FadeUp>

      {/* مؤشرات الحالة · تعمل كمرشحات */}
      <Stagger className="grid grid-cols-3 gap-3 mb-5">
        {STATUS_TABS.map(({ k, l, icon: Icon, c }) => (
          <Item key={k}>
            <button onClick={() => setStatus(k)} data-testid={`admin-reports-tab-${k}`}
              className={`w-full h-full text-right bg-white rounded-3xl border p-3.5 sm:p-4 ft-shadow transition-all ${status === k ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-100 hover:ft-shadow-lg"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-2xl grid place-items-center text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${c}, ${c}BB)` }}><Icon className="w-4.5 h-4.5" /></span>
                <span className="font-head font-extrabold text-xl sm:text-2xl leading-none text-slate-900">{counts[k] ?? "·"}</span>
              </span>
              <span className="block text-[11px] sm:text-xs font-bold text-slate-500 mt-2.5">{l}</span>
            </button>
          </Item>
        ))}
      </Stagger>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <FadeUp>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow py-14 px-6 text-center" data-testid="admin-reports-empty">
            <span className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 grid place-items-center mx-auto mb-4"><PartyPopper className="w-8 h-8" /></span>
            <div className="font-head font-extrabold text-slate-800">لا بلاغات هنا 🎉</div>
            <p className="text-xs text-slate-400 mt-1.5">كل شيء هادئ في هذا القسم · أحسنت أنت والمجتمع</p>
          </div>
        </FadeUp>
      ) : (
        <>
        {viewReport && <FullTranscript report={viewReport} onClose={() => setViewReport(null)} />}
        <div className="relative space-y-3 before:absolute before:right-[19px] before:top-5 before:bottom-5 before:w-px before:bg-slate-200/80" data-testid="admin-reports-list">
          {items.map((r) => {
            const kc = KIND_COLORS[r.entity_type] || "#64748B";
            return (
              <FadeUp key={r.id}>
                <div className="relative pr-12">
                  <span className="absolute right-[13px] top-5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-50" style={{ background: kc }} />
                  <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="w-10 h-10 rounded-2xl grid place-items-center text-white text-sm font-extrabold shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${kc}, ${kc}BB)` }}>
                        {(r.reporter_name || "؟").trim().charAt(0)}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold" style={{ background: `${kc}14`, color: kc }}>{REPORT_KIND[r.entity_type] || r.entity_type}</span>
                          {status !== "open" && r.action && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">الإجراء: {r.action}</span>}
                        </div>
                        <div className="font-semibold text-sm text-slate-800 mt-2 leading-relaxed">{r.reason}</div>
                        {r.details && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.details}</div>}
                        <div className="text-[11px] text-slate-400 mt-1.5">أبلغ عنه: {r.reporter_name} · {timeAgo(r.created_at)}</div>
                        {(r.entity_type === "message" || r.entity_type === "user") && (
                          <div className="mt-2.5 space-y-2">
                            {r.reported_name && <div className="text-xs text-slate-500">المُبلَّغ عنه: <span className="font-bold text-slate-700">{r.reported_name}</span></div>}
                            {r.message_snapshot?.body && (
                              <div className="rounded-2xl bg-rose-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 ring-1 ring-rose-100">
                                <span className="mb-0.5 block text-[10px] font-extrabold text-rose-400">نص الرسالة وقت الإبلاغ{r.message_snapshot.deleted ? " · محذوفة" : ""}</span>
                                {r.message_snapshot.body}
                              </div>
                            )}
                            {r.conversation_id && (
                              <button onClick={() => setViewReport(r)} data-testid={`admin-report-view-${r.id}`}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-slate-700">
                                <MessagesSquare className="h-4 w-4" /> عرض المحادثة كاملة
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {status === "open" && (
                        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                          <button onClick={() => resolve(r.id, "delete")} data-testid={`admin-report-delete-${r.id}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors">
                            <Trash2 className="w-4 h-4" /> {r.entity_type === "message" ? "حذف الرسالة" : r.entity_type === "user" ? "إغلاق البلاغ" : "حذف المحتوى"}
                          </button>
                          {(r.entity_type === "message" || r.entity_type === "user") && (
                            <button onClick={() => resolve(r.id, "warn")} data-testid={`admin-report-warn-${r.id}`}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
                              <TriangleAlert className="w-4 h-4" /> تحذير المستخدم
                            </button>
                          )}
                          <button onClick={() => resolve(r.id, "dismiss")} data-testid={`admin-report-dismiss-${r.id}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                            <EyeOff className="w-4 h-4" /> تجاهل
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
