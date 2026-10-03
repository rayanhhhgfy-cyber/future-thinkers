import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { timeAgo } from "@/components/NotificationsPanel";
import { ScrollText, Search, ChevronDown, History } from "lucide-react";

/* سجل العمليات
   إعادة تصميم بصرية فقط: نفس الجلب GET /admin/audit-logs (page/limit=٢٥)
   ونفس الترشيح من جهة العميل داخل الصفحة الحالية (بحث + كيان) ونفس
   التوسيع لعرض meta و ip و entity_id ونفس التصفح.
   الثوابت منسوخة كما هي من Admin.jsx (غير قابلة للاستيراد من هناك). */

const ACT_LABELS = {
  work_approve: "نشر عمل أدبي", work_reject: "رفض عمل أدبي", work_submit: "إرسال عمل للمراجعة",
  book_approve: "اعتماد كتاب", book_reject: "رفض كتاب", user_create: "إنشاء حساب",
  user_delete: "حذف حساب", role_change: "تغيير دور", teacher_approve: "قبول معلم", teacher_reject: "رفض معلم",
  campaign_send: "إرسال حملة إشعارات", badge_award: "منح شارة",
};

const AUDIT_ACTION_STYLE = [
  { match: ["delete", "reject", "remove"], bg: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
  { match: ["create", "approve", "award", "send", "publish", "adjust"], bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  { match: ["update", "edit", "change", "patch"], bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  { match: ["login"], bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
];
const AUDIT_ENTITY_LABEL = {
  user: "مستخدم", book: "كتاب", news: "خبر", event: "فعالية", competition: "مسابقة",
  club: "نادٍ", notification: "إشعار", campaign: "حملة", badge: "شارة", certificate: "شهادة",
  points: "نقاط", xp: "نقاط", studio: "استوديو", work: "عمل أدبي", venture: "مشروع",
  discussion: "نقاش", report: "بلاغ", auth: "دخول",
};
function auditStyle(action = "") {
  const a = action.toLowerCase();
  for (const s of AUDIT_ACTION_STYLE) if (s.match.some((m) => a.includes(m))) return s;
  return { bg: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" };
}

const LIMIT = 25;

export default function AdminAudit() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const load = async (p = 1) => {
    setData(null);
    try { const { data } = await api.get("/admin/audit-logs", { params: { page: p, limit: LIMIT } }); setData(data); }
    catch { setData({ items: [], total: 0, page: p }); }
  };
  useEffect(() => { load(page); }, [page]);
  if (!data) return <PageLoader />;
  const entities = [...new Set(data.items.map((l) => l.entity).filter(Boolean))];
  const ql = q.trim().toLowerCase();
  const items = data.items.filter((l) => {
    if (entity !== "all" && l.entity !== entity) return false;
    if (!ql) return true;
    return [l.user_email, l.action, l.entity, l.entity_id].some((v) => String(v || "").toLowerCase().includes(ql));
  });
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / LIMIT));

  return (
    <div className="space-y-4" data-testid="admin-audit">
      <FadeUp>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#0A192F,#0A192FBB)" }}><ScrollText className="w-4.5 h-4.5" /></span>
              سجل العمليات
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">كل إجراء إداري موثّق بمنفّذه ووقته · اضغط أي سجل لعرض تفاصيله التقنية الكاملة.</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-bold" data-testid="admin-audit-total">
            {(data.total || 0).toLocaleString("en-US")} عملية موثّقة
          </span>
        </div>
      </FadeUp>

      <FadeUp delay={0.03}>
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد أو الإجراء أو الكيان..." className="rounded-xl pr-9" data-testid="admin-audit-search" />
            </div>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="rounded-xl sm:w-44" data-testid="admin-audit-entity"><SelectValue placeholder="كل الكيانات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكيانات</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{AUDIT_ENTITY_LABEL[e] || e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FadeUp>

      {items.length === 0 ? (
        <FadeUp>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow py-14 px-6 text-center" data-testid="admin-audit-empty">
            <span className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 grid place-items-center mx-auto mb-4"><History className="w-8 h-8" /></span>
            <div className="font-head font-extrabold text-slate-800">لا سجلات مطابقة</div>
            <p className="text-xs text-slate-400 mt-1.5">جرّب كلمة بحث مختلفة أو صفحة أخرى</p>
          </div>
        </FadeUp>
      ) : (
        <Stagger className="relative space-y-3 before:absolute before:right-[27px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200" data-testid="admin-audit-list">
          {items.map((l) => {
            const s = auditStyle(l.action);
            const open = expanded === l.id;
            const meta = l.meta && typeof l.meta === "object" ? Object.entries(l.meta) : [];
            return (
              <Item key={l.id} className="relative pr-14">
                <span className={`absolute right-[21px] top-5 w-3.5 h-3.5 rounded-full ${s.dot} ring-4 ring-slate-50 z-10`} />
                <button onClick={() => setExpanded(open ? null : l.id)} data-testid={`admin-audit-row-${l.id}`} className="w-full text-right bg-white rounded-3xl border border-slate-100 ft-shadow p-4 hover-lift">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg}`}>{ACT_LABELS[l.action] || l.action}</span>
                    {l.entity && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{AUDIT_ENTITY_LABEL[l.entity] || l.entity}</span>}
                    <span className="text-xs text-slate-400 mr-auto inline-flex items-center gap-1.5">{timeAgo(l.created_at)}<ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} /></span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2 truncate">{l.user_email || "النظام"}</div>
                  {open && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5" dir="ltr" style={{ textAlign: "right" }}>
                      {l.entity_id && <div>entity_id: <span className="font-mono">{String(l.entity_id)}</span></div>}
                      {meta.length > 0 ? meta.map(([k, v]) => (
                        <div key={k}>{k}: <span className="font-mono text-slate-700">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span></div>
                      )) : <div className="text-slate-400">لا تفاصيل إضافية</div>}
                      {l.ip && <div>ip: <span className="font-mono">{l.ip}</span></div>}
                    </div>
                  )}
                </button>
              </Item>
            );
          })}
        </Stagger>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl min-h-[40px]">السابق</Button>
          <span className="text-sm text-slate-500 font-bold">صفحة {page} من {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl min-h-[40px]">التالي</Button>
        </div>
      )}
    </div>
  );
}
