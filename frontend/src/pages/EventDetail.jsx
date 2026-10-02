import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Globe, ArrowRight, Building2, QrCode, CheckCircle2 } from "lucide-react";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [e, setE] = useState(null);

  const load = async () => { try { const { data } = await api.get(`/events/${id}`); setE(data); } catch { nav("/events"); } };
  useEffect(() => { load(); }, [id]);

  const register = async () => {
    if (!user) return nav("/login");
    try { const { data } = await api.post(`/events/${id}/register`); toast.success(data.waitlist ? "أُضفت لقائمة الانتظار" : "تم تسجيلك بنجاح!"); load(); }
    catch (err) { toast.error(apiErr(err)); }
  };
  const unregister = async () => { await api.post(`/events/${id}/unregister`); toast.info("ألغيت تسجيلك"); load(); };
  const downloadCert = async () => {
    try {
      const res = await api.get(`/certificates/event/${id}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = `event-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(apiErr(err)); }
  };

  if (!e) return <Layout><PageLoader /></Layout>;

  const dateParts = String(e.date || "").split("-");
  const dateDay = dateParts[2]?.slice(0, 2) || "";
  const dateMonth = MONTHS[Number(dateParts[1]) - 1] || dateParts[1] || "";
  const capacity = Number(e.capacity) || 0;
  const registered = Number(e.registered_count) || 0;
  const capacityPct = capacity > 0 ? Math.min(100, Math.max(0, (registered / capacity) * 100)) : 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <button onClick={() => nav(-1)} className="pressable text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1.5 font-semibold"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <article className="overflow-hidden bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow animate-fade-up">
          <div className="relative flex min-h-[300px] items-end overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 sm:min-h-[360px]">
            {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/10" />
            <Calendar className="absolute -left-8 top-8 h-44 w-44 rotate-12 text-white/10" />
            <span className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700 shadow backdrop-blur sm:right-6 sm:top-6">{e.scope === "national" ? "وطنية" : e.scope === "directorate" ? "مديرية" : "مدرسة"}</span>
            {(dateDay || dateMonth) && (
              <div className="absolute left-4 top-4 z-10 min-w-[4rem] rounded-2xl bg-white/95 px-3 py-2.5 text-center shadow-xl backdrop-blur sm:left-6 sm:top-6">
                <div className="font-head text-2xl font-extrabold leading-none text-slate-900">{dateDay}</div>
                <div className="mt-1 text-[11px] font-bold leading-none text-blue-600">{dateMonth}</div>
              </div>
            )}
            <div className="relative z-10 w-full p-5 pt-28 text-white sm:p-8 sm:pt-36 lg:p-10">
              <h1 className="font-head max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{e.title}</h1>
              <p className="text-slate-200 mt-3 font-medium">تنظيم: {e.organizer}</p>
            </div>
          </div>
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 rounded-[1.4rem] border border-slate-100 bg-slate-50/80 p-4 sm:p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 sm:text-sm">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-600" />{e.registered_count} / {e.capacity}</span>
                  <span className="font-head text-blue-600">{Math.round(capacityPct)}%</span>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                  <div className="h-full rounded-full bg-gradient-to-l from-blue-600 to-emerald-500 transition-all duration-500" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
              {e.is_registered ? (
                <Button data-testid="unregister-event-btn" onClick={unregister} variant="outline" className="pressable w-full shrink-0 rounded-xl h-12 px-7 font-bold lg:w-auto">إلغاء التسجيل</Button>
              ) : (
                <Button data-testid="register-event-btn" onClick={register} className="pressable w-full shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-12 px-8 font-bold shadow-lg shadow-emerald-600/20 lg:w-auto">سجّل الآن</Button>
              )}
            </div>
            <p className="mt-7 text-slate-700 leading-loose whitespace-pre-wrap sm:text-lg">{e.description}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <Info icon={Calendar} label="التاريخ والوقت" value={`${e.date} ${e.time}`} />
              <Info icon={e.mode === "online" ? Globe : MapPin} label="المكان" value={e.mode === "online" ? "عن بُعد (أونلاين)" : e.location || "حضوري"} />
              <Info icon={Users} label="المقاعد" value={`${e.registered_count} / ${e.capacity}`} />
              <Info icon={Building2} label="الفئة المستهدفة" value={e.audience} />
            </div>
            {e.is_registered && e.qr_code && (
              <div className="mt-6 flex flex-col gap-5 rounded-[1.4rem] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-blue-50 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="w-24 h-24 shrink-0 bg-white rounded-2xl grid place-items-center ft-shadow"><QrCode className="w-14 h-14 text-slate-800" /></div>
                <div className="min-w-0">
                  <div className="font-head font-bold text-slate-900 flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> رمز الحضور الخاص بك</div>
                  <div className="font-mono text-lg tracking-widest text-blue-700 mt-2 break-all">{e.qr_code}</div>
                  <div className="text-xs text-slate-500 mt-1.5">{e.checked_in ? "تم تسجيل حضورك ✓" : "أظهر هذا الرمز عند الدخول"}</div>
                  <Button data-testid="download-event-cert-btn" onClick={downloadCert} variant="outline" size="sm" className="pressable mt-3 rounded-lg border-emerald-200 bg-white/70 font-bold text-emerald-700"><CheckCircle2 className="w-4 h-4 ml-1" />تنزيل شهادة المشاركة</Button>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </Layout>
  );
}

const Info = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
    <div className="w-11 h-11 shrink-0 rounded-2xl bg-white grid place-items-center ft-shadow"><Icon className="w-5 h-5 text-blue-600" /></div>
    <div className="min-w-0">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="font-bold text-slate-800 text-sm mt-1 break-words leading-relaxed">{value}</div>
    </div>
  </div>
);
