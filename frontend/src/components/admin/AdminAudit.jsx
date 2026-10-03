import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { timeAgo } from "@/components/NotificationsPanel";
import { ScrollText, Search, ChevronDown, History, Fingerprint, Globe, Hash, Bot } from "lucide-react";

/* سجل العمليات
   نفس البيانات حرفياً: GET /admin/audit-logs (page/limit=٢٥) ونفس الترشيح
   من جهة العميل داخل الصفحة الحالية (بحث + كيان) ونفس التصفح.
   سجلات الخادم تحمل: user_email · action · entity · entity_id · meta · ip ·
   user_agent · created_at (من services.audit_log) · تُعرض كلها عند التوسيع.
   الثوابت منسوخة كما هي من Admin.jsx (غير قابلة للاستيراد من هناك). */

const ACT_LABELS = {
  work_approve: "نشر عمل أدبي", work_reject: "رفض عمل أدبي", work_submit: "إرسال عمل للمراجعة",
  book_approve: "اعتماد كتاب", book_reject: "رفض كتاب", user_create: "إنشاء حساب",
  user_delete: "حذف حساب", role_change: "تغيير دور", teacher_approve: "قبول معلم", teacher_reject: "رفض معلم",
  campaign_send: "إرسال حملة إشعارات", badge_award: "منح شارة",
};

const AUDIT_ACTION_STYLE = [
  { match: ["delete", "reject", "remove"], bg: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500", ring: "ring-rose-100" },
  { match: ["create", "approve", "award", "send", "publish", "adjust"], bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500", ring: "ring-emerald-100" },
  { match: ["update", "edit", "change", "patch"], bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500", ring: "ring-blue-100" },
  { match: ["login"], bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", ring: "ring-slate-200" },
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
  return { bg: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500", ring: "ring-violet-100" };
}

const AVATAR_GRADS = [
  "from-blue-500 to-violet-500", "from-emerald-500 to-teal-500", "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400", "from-fuchsia-500 to-purple-500", "from-cyan-500 to-sky-500",
];
const avatarGrad = (seed = "") => AVATAR_GRADS[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_GRADS.length];
const actorInitial = (email) => {
  const name = String(email || "").split("@")[0].trim();
  return name ? name.charAt(0).toUpperCase() : "ن";
};

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
        <div className="relative overflow-hidden rounded-[28px] bg-slate-900 text-white p-5 sm:p-6 ft-shadow-lg">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 grid place-items-center shrink-0"><ScrollText className="w-6 h-6" /></span>
            <div className="flex-1 min-w-[200px]">
              <h2 className="font-head font-extrabold text-lg sm:text-xl">سجل العمليات</h2>
              <p className="text-[11px] text-white/60 font-bold mt-1 leading-relaxed">كل إجراء إداري موثّق بمنفّذه ووقته · اضغط أي سجل لعرض تفاصيله التقنية الكاملة.</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2.5 text-center" data-testid="admin-audit-total">
              <div className="font-head font-extrabold text-xl leading-none">{(data.total || 0).toLocaleString("en-US")}</div>
              <div className="text-[10px] text-white/60 font-bold mt-1">عملية موثّقة</div>
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.03}>
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد أو الإجراء أو الكيان..." className="rounded-xl pr-9 min-h-[44px]" data-testid="admin-audit-search" />
            </div>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="rounded-xl sm:w-44 min-h-[44px]" data-testid="admin-audit-entity"><SelectValue placeholder="كل الكيانات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الكيانات</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{AUDIT_ENTITY_LABEL[e] || e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-bold text-slate-400">
              <Fingerprint className="w-3.5 h-3.5" /> يعرض {items.length} سجلاً من هذه الصفحة بعد الترشيح
            </div>
          )}
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
        <Stagger className="relative space-y-3 before:absolute before:right-[41px] before:top-6 before:bottom-6 before:w-px before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent" data-testid="admin-audit-list">
          {items.map((l) => {
            const s = auditStyle(l.action);
            const open = expanded === l.id;
            const systemActor = !l.user_email;
            const meta = l.meta && typeof l.meta === "object" ? Object.entries(l.meta) : [];
            return (
              <Item key={l.id}>
                <div className="relative flex gap-3.5">
                  <span className={`relative z-10 w-[52px] h-[52px] rounded-2xl grid place-items-center shrink-0 text-white font-head font-extrabold shadow-md ring-4 ${s.ring} ${systemActor ? "bg-slate-700" : `bg-gradient-to-br ${avatarGrad(l.user_email)}`}`}>
                    {systemActor ? <Bot className="w-5 h-5" /> : actorInitial(l.user_email)}
                    <span className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full ${s.dot} ring-2 ring-white`} />
                  </span>
                  <button onClick={() => setExpanded(open ? null : l.id)} data-testid={`admin-audit-row-${l.id}`}
                    className="flex-1 min-w-0 text-right bg-white rounded-3xl border border-slate-100 ft-shadow p-4 transition-shadow hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${s.bg}`}>{ACT_LABELS[l.action] || l.action}</span>
                      {l.entity && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{AUDIT_ENTITY_LABEL[l.entity] || l.entity}</span>}
                      <span className="text-xs text-slate-400 mr-auto inline-flex items-center gap-1.5 shrink-0">
                        {timeAgo(l.created_at)}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-700 truncate">{l.user_email || "النظام"}</span>
                      {l.ip && <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0" dir="ltr"><Globe className="w-3 h-3" />{l.ip}</span>}
                    </div>
                    {open && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        {l.entity_id && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Hash className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span className="font-bold shrink-0">معرّف الكيان</span>
                            <span className="font-mono text-slate-700 break-all" dir="ltr">{String(l.entity_id)}</span>
                          </div>
                        )}
                        {meta.length > 0 ? meta.map(([k, v]) => (
                          <div key={k} className="flex items-start gap-2 text-xs text-slate-500">
                            <span className="w-3.5 shrink-0" />
                            <span className="font-bold shrink-0">{k}</span>
                            <span className="font-mono text-slate-700 break-all" dir="ltr">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        )) : <div className="text-xs text-slate-400">لا تفاصيل إضافية في هذا السجل</div>}
                        {l.ip && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span className="font-bold shrink-0">العنوان</span>
                            <span className="font-mono text-slate-700" dir="ltr">{l.ip}</span>
                          </div>
                        )}
                        {l.user_agent && (
                          <div className="flex items-start gap-2 text-xs text-slate-500">
                            <Bot className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                            <span className="font-bold shrink-0">المتصفح</span>
                            <span className="font-mono text-[11px] text-slate-500 break-all leading-relaxed" dir="ltr">{l.user_agent}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl min-h-[40px]">السابق</Button>
          <span className="text-sm text-slate-500 font-bold">صفحة {page} من {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl min-h-[40px]">التالي</Button>
        </div>
      )}
    </div>
  );
}
