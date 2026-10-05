import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { timeAgo } from "@/components/NotificationsPanel";
import { Bug, Copy, Mail, CheckCircle2, Trash2, RefreshCw, ChevronDown, Inbox, Wrench, Sigma, ShieldCheck, Send, X } from "lucide-react";

/* سجل الأخطاء
   الإجراءات: resolve و delete كما هي، و«مراسلة المستخدم» تفتح الآن محادثة
   خاصة مباشرة مع صاحب البلاغ (/messages?to=<user_id>) · تظهر دائمًا، وعند
   غياب حساب مسجل للبلاغ تشرح السبب بتنبيه بدل أن تختفي بصمت. */

const SRC = {
  server: ["خادم", "bg-rose-100 text-rose-700", "#E11D48"],
  client: ["واجهة", "bg-sky-100 text-sky-700", "#0284C7"],
  auto: ["تلقائي", "bg-amber-100 text-amber-700", "#D97706"],
  manual: ["بلاغ مستخدم", "bg-emerald-100 text-emerald-700", "#059669"],
};

/* صورة البلاغ المرفقة من نموذج «الإبلاغ عن مشكلة» · تُجلب عند فتح البطاقة
   فقط حتى تبقى قائمة الأخطاء خفيفة */
function ReportImage({ id }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get(`/admin/errors/${id}/image`)
      .then(({ data }) => { if (alive) setSrc(data.image || ""); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [id]);
  if (failed) return <p className="mt-3 text-[11px] font-bold text-rose-500">تعذر تحميل الصورة المرفقة</p>;
  if (!src) return <p className="mt-3 text-[11px] text-slate-400">جارٍ تحميل الصورة…</p>;
  return <img src={src} alt="لقطة شاشة البلاغ" className="mt-3 max-h-80 w-full rounded-2xl border border-slate-100 bg-slate-50 object-contain" />;
}

export default function AdminErrors() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({ open: 0, resolved: 0, total: 0 });
  const [status, setStatus] = useState("open");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState("");

  const load = async (p = page, st = status, src = source) => {
    try {
      const { data } = await api.get("/admin/errors", { params: { status: st, source: src, page: p, limit: 20 } });
      setItems(data.items); setCounts(data.counts); setPages(data.pages);
    } catch (e) { toast.error(apiErr(e)); setItems([]); }
  };
  useEffect(() => { load(1); setPage(1); /* eslint-disable-next-line */ }, [status, source]);

  const setSt = async (e, st) => {
    setBusy(e.id);
    try { await api.post(`/admin/errors/${e.id}/resolve`, { status: st }); load(); }
    catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };
  const del = async (e) => {
    if (!window.confirm("حذف سجل هذا الخطأ نهائيًا؟")) return;
    setBusy(e.id);
    try { await api.delete(`/admin/errors/${e.id}`); toast.success("تم الحذف"); load(); }
    catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };
  const copyFull = async (e) => {
    const text = `رسالة الخطأ: ${e.message}\nالمصدر: ${e.source}\nالصفحة: ${e.page}\nالمستخدم: ${e.user_name || "زائر"} (${e.user_email || ""})\nالوقت: ${e.created_at}\n\nالتفاصيل الكاملة:\n${e.detail || ""}`;
    try { await navigator.clipboard.writeText(text); toast.success("تم نسخ الخطأ كاملًا 📋"); }
    catch { toast.error("تعذر النسخ"); }
  };
  /* مراسلة صاحب البلاغ: نافذة رسالة مجهولة الهوية باسم «فريق المنصة» ·
     لا يرى الطالب اسم المشرف ولا بريده ولا ملفه أبداً، وتصله كإشعار. */
  const [contact, setContact] = useState(null); // error item being messaged
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(null); // conversation id after send
  const dmUser = (e) => {
    if (!e.user_id) {
      toast.error("هذا البلاغ من زائر غير مسجّل · لا يمكن مراسلته");
      return;
    }
    if (e.user_id === user?.id) {
      toast.info("هذا الخطأ حدث أثناء استخدامك أنت للمنصة · لا حاجة لمراسلة نفسك");
      return;
    }
    setContactSent(null);
    setContactMsg("مرحبًا، لاحظنا حدوث خطأ أثناء استخدامك المنصة وعملنا على إصلاحه. جرّب الآن وأخبرنا إن تكرر 🙏");
    setContact(e);
  };
  const sendContact = async () => {
    if (!contact || contactMsg.trim().length < 3) return;
    setBusy("contact");
    try {
      const { data } = await api.post("/dm/admin-conversations", { user_id: contact.user_id, body: contactMsg.trim() });
      setContactSent(data.conversation_id);
      toast.success("وصلت الرسالة باسم «فريق المنصة» · لن يظهر اسمك أو بريدك");
    } catch (er) { toast.error(apiErr(er)); }
    setBusy("");
  };

  const statCards = [
    { k: "open", l: "أخطاء مفتوحة", v: counts.open, icon: Inbox, c: "#E11D48", go: () => setStatus("open") },
    { k: "resolved", l: "تم حلها", v: counts.resolved, icon: Wrench, c: "#059669", go: () => setStatus("resolved") },
    { k: "total", l: "الإجمالي", v: counts.total, icon: Sigma, c: "#475569", go: () => setStatus("all") },
  ];

  return (
    <div data-testid="admin-errors">
      <FadeUp>
        <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
          <span className="w-8 h-8 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#E11D48,#E11D48BB)" }}><Bug className="w-4.5 h-4.5" /></span>
          سجل الأخطاء
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 mb-5 leading-relaxed">كل خطأ يحدث في الموقع يُسجل هنا بتفاصيله الحقيقية الكاملة · المستخدمون لا يرون إلا رسائل ودية قصيرة</p>
      </FadeUp>

      {/* عدّادات سريعة · تنقّل بين الحالات */}
      <Stagger className="grid grid-cols-3 gap-3 mb-5">
        {statCards.map(({ k, l, v, icon: Icon, c, go }) => (
          <Item key={k}>
            <button onClick={go} data-testid={`admin-errors-stat-${k}`}
              className={`w-full h-full text-right bg-white rounded-3xl border p-3.5 sm:p-4 ft-shadow transition-all ${status === k ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-100 hover:ft-shadow-lg"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-2xl grid place-items-center text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${c}, ${c}BB)` }}><Icon className="w-4.5 h-4.5" /></span>
                <span className="font-head font-extrabold text-xl sm:text-2xl leading-none text-slate-900">{v ?? 0}</span>
              </span>
              <span className="block text-[11px] sm:text-xs font-bold text-slate-500 mt-2.5">{l}</span>
            </button>
          </Item>
        ))}
      </Stagger>

      {/* المرشحات */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="flex flex-wrap gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow w-fit max-w-full">
          {[["open", "المفتوحة"], ["resolved", "تم حلها"], ["all", "الكل"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} data-testid={`admin-errors-status-${k}`} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${status === k ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{l}{k === "open" && counts.open ? ` (${counts.open})` : ""}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 bg-white rounded-2xl p-1.5 border border-slate-100 ft-shadow w-fit max-w-full">
          {[["", "كل المصادر"], ["server", "الخادم"], ["client", "الواجهة"], ["auto", "تلقائي"], ["manual", "بلاغات"]].map(([k, l]) => (
            <button key={k || "all"} onClick={() => setSource(k)} data-testid={`admin-errors-source-${k || "all"}`} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${source === k ? "bg-rose-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => load()} data-testid="admin-errors-refresh" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:bg-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> تحديث
        </button>
      </div>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <FadeUp>
          <div className="bg-white rounded-3xl border border-slate-100 ft-shadow py-14 px-6 text-center" data-testid="admin-errors-empty">
            <span className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 grid place-items-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8" /></span>
            <div className="font-head font-extrabold text-slate-800">لا أخطاء هنا 🎉</div>
            <p className="text-xs text-slate-400 mt-1.5">الموقع يعمل بسلاسة في هذا التصنيف</p>
          </div>
        </FadeUp>
      ) : (
        <div className="relative space-y-3 before:absolute before:right-[19px] before:top-5 before:bottom-5 before:w-px before:bg-slate-200/80" data-testid="admin-errors-list">
          {items.map((e) => {
            const [sLabel, sCls, sDot] = SRC[e.source] || [e.source, "bg-slate-100 text-slate-600", "#64748B"];
            const opened = openId === e.id;
            return (
              <FadeUp key={e.id}>
                <div className="relative pr-12">
                  <span className="absolute right-[13px] top-5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-50" style={{ background: sDot }} />
                  <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 ft-shadow">
                    <div className="flex flex-wrap items-start gap-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 ${sCls}`}>{sLabel}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0 ${e.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>{e.status === "resolved" ? "تم الحل" : "مفتوح"}</span>
                      <span className="text-[11px] text-slate-400 mr-auto pt-1">{timeAgo(e.created_at)}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-800 break-words mt-2.5 leading-relaxed">{e.message}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-2">
                      <span dir="ltr">{e.page || ""}</span>
                      <span>·</span>
                      <span>{e.user_name ? `${e.user_name} (${e.user_email || ""})` : "زائر غير مسجل"}</span>
                      {e.contacted_at && <span className="text-sky-600 font-bold">· تمت مراسلته</span>}
                    </div>
                    {opened && (
                      <div className="mt-3">
                        <pre dir="ltr" className="text-left bg-slate-900 text-emerald-200/90 text-[11px] leading-relaxed rounded-2xl p-3.5 max-h-72 overflow-auto whitespace-pre-wrap break-words">{e.detail || "لا توجد تفاصيل تقنية مرفقة"}</pre>
                        {e.has_image && <ReportImage id={e.id} />}
                      </div>
                    )}
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      <button onClick={() => setOpenId(opened ? null : e.id)} data-testid={`admin-error-toggle-${e.id}`} className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${opened ? "rotate-180" : ""}`} /> {opened ? "إخفاء التفاصيل" : "عرض الخطأ كاملًا"}
                      </button>
                      <button onClick={() => copyFull(e)} data-testid={`admin-error-copy-${e.id}`} className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"><Copy className="w-3.5 h-3.5" /> نسخ الخطأ</button>
                      <button onClick={() => dmUser(e)} data-testid={`admin-error-contact-${e.id}`} className={`inline-flex min-h-[42px] sm:min-h-0 items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-colors ${e.user_id ? "bg-sky-600 hover:bg-sky-700 text-white" : "bg-slate-100 text-slate-400"}`}><Mail className="w-3.5 h-3.5" /> مراسلة المستخدم</button>
                      {e.status === "open"
                        ? <button disabled={busy === e.id} onClick={() => setSt(e, "resolved")} data-testid={`admin-error-resolve-${e.id}`} className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /> تحديد كمحلول</button>
                        : <button disabled={busy === e.id} onClick={() => setSt(e, "open")} data-testid={`admin-error-reopen-${e.id}`} className="min-h-[42px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold disabled:opacity-50 transition-colors">إعادة فتح</button>}
                      <button disabled={busy === e.id} onClick={() => del(e)} data-testid={`admin-error-delete-${e.id}`} className="inline-flex min-h-[42px] sm:min-h-0 items-center gap-1 px-3 py-2 sm:py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold disabled:opacity-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /> حذف</button>
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold disabled:opacity-40">السابق</button>
          <span className="text-sm text-slate-500 font-bold">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-sm font-bold disabled:opacity-40">التالي</button>
        </div>
      )}

      {/* نافذة المراسلة المجهولة · باسم «فريق المنصة» */}
      {contact && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setContact(null)}>
          <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-[26px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]" onClick={(e) => e.stopPropagation()} data-testid="admin-error-compose">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-sky-400 to-indigo-500" />
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-head font-extrabold text-slate-900">مراسلة {contact.user_name || "المستخدم"}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  ستصل الرسالة باسم «فريق المنصة» فقط · لن يظهر اسمك ولا بريدك ولا ملفك الشخصي، وسيصله إشعار فوراً
                </p>
              </div>
              <button onClick={() => setContact(null)} aria-label="إغلاق" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {contactSent ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-bold text-emerald-800">أُرسلت الرسالة بنجاح</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-600">يمكنك متابعة الردود من صفحة الرسائل · ويستطيع أي طرف إنهاء المحادثة نهائياً في أي وقت</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setContact(null)} className="min-h-[44px] flex-1 rounded-full bg-white text-sm font-bold text-slate-600 ring-1 ring-slate-200">إغلاق</button>
                  <button onClick={() => nav(`/messages?conv=${contactSent}`)} className="min-h-[44px] flex-1 rounded-full bg-slate-900 text-sm font-bold text-white">فتح المحادثة</button>
                </div>
              </div>
            ) : (
              <>
                <textarea
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  autoFocus
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm leading-relaxed outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="اكتب رسالتك للمستخدم…"
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setContact(null)} className="min-h-[44px] flex-1 rounded-full bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200">إلغاء</button>
                  <button onClick={sendContact} disabled={busy === "contact" || contactMsg.trim().length < 3} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-sky-600 text-sm font-bold text-white shadow-lg transition hover:bg-sky-700 disabled:opacity-50">
                    <Send className="h-4 w-4 -scale-x-100" /> إرسال كفريق المنصة
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
