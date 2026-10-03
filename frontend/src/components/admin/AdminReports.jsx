import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import { Flag, RefreshCw, Trash2, EyeOff, Inbox, CheckCircle2, XCircle, PartyPopper } from "lucide-react";

/* الإبلاغات · مركز البلاغات
   إعادة تصميم بصرية فقط: نفس الجلب GET /reports?status ونفس الحسم
   POST /reports/{id}/resolve {action: delete|dismiss} بنفس رسائل النجاح.
   عدّادات التبويبات تُحسب من نفس نقطة النهاية بحالاتها الثلاث. */

const REPORT_KIND = { book: "كتاب", discussion: "نقاش", reply: "رد", user: "مستخدم", event: "فعالية", activity: "نشاط", work: "عمل أدبي", comment: "تعليق كتاب" };
const KIND_COLORS = {
  book: "#2563EB", discussion: "#7C3AED", reply: "#0891B2", user: "#475569",
  event: "#059669", activity: "#D97706", work: "#C026D3", comment: "#0E7490",
};
const STATUS_TABS = [
  { k: "open", l: "المفتوحة", icon: Inbox, c: "#E11D48" },
  { k: "resolved", l: "المُغلقة", icon: CheckCircle2, c: "#059669" },
  { k: "dismissed", l: "المرفوضة", icon: XCircle, c: "#64748B" },
];

export default function AdminReports() {
  const [status, setStatus] = useState("open");
  const [items, setItems] = useState(null);
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
      toast.success(action === "delete" ? "حُذف المحتوى وأُغلق البلاغ" : "أُغلق البلاغ");
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
                      </div>
                      {status === "open" && (
                        <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                          <button onClick={() => resolve(r.id, "delete")} data-testid={`admin-report-delete-${r.id}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors">
                            <Trash2 className="w-4 h-4" /> حذف المحتوى
                          </button>
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
      )}
    </div>
  );
}
