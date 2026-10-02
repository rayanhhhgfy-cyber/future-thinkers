import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Globe, ArrowRight, Building2, QrCode, CheckCircle2, CalendarDays, Wifi, Clock } from "lucide-react";

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
      {/* full-bleed hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-emerald-600 text-white">
        {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-l from-slate-950/25 via-transparent to-transparent" />
        <CalendarDays className="pointer-events-none absolute -left-10 bottom-6 h-52 w-52 rotate-12 text-white/10 sm:h-64 sm:w-64" />

        <button onClick={() => nav(-1)} className="pressable absolute right-4 top-4 z-20 flex min-h-[2.75rem] items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/35 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/55 sm:right-6 sm:top-6">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>

        {(dateDay || dateMonth) && (
          <div className="absolute left-4 top-4 z-20 min-w-[4.25rem] rounded-[1.15rem] bg-white/90 px-3.5 py-3 text-center shadow-[0_18px_38px_-12px_rgba(2,6,23,0.55)] ring-1 ring-white/70 backdrop-blur-md sm:left-6 sm:top-6">
            <div className="font-head text-[1.7rem] font-extrabold leading-none text-slate-900">{dateDay}</div>
            <div className="mt-1.5 text-[11px] font-bold leading-none text-blue-600">{dateMonth}</div>
          </div>
        )}

        <div className="relative z-10 mx-auto flex min-h-[21rem] w-full max-w-6xl flex-col justify-end px-4 pb-7 pt-28 sm:min-h-[26rem] sm:px-6 sm:pb-9 lg:min-h-[29rem] lg:px-8 lg:pb-11">
          <div className="flex flex-wrap items-center gap-2 animate-fade-up">
            <span className="inline-flex min-h-[2.25rem] items-center rounded-full border border-white/40 bg-white/90 px-3 py-1 text-xs font-bold text-blue-700 shadow backdrop-blur">{e.scope === "national" ? "وطنية" : e.scope === "directorate" ? "مديرية" : "مدرسة"}</span>
            <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
              {e.mode === "online" ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {e.mode === "online" ? "عن بُعد" : "حضوري"}
            </span>
            <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md">
              <Clock className="h-3.5 w-3.5" />
              {e.date} {e.time}
            </span>
          </div>
          <h1 className="font-head mt-4 max-w-3xl text-3xl font-extrabold leading-[1.2] animate-fade-up d-1 sm:text-4xl sm:leading-[1.2] lg:text-[3.4rem]">{e.title}</h1>
          <p className="mt-3.5 flex items-center gap-2 font-semibold text-slate-200 animate-fade-up d-2">
            <Building2 className="h-5 w-5 shrink-0 text-emerald-300" />
            <span>تنظيم: {e.organizer}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* capacity + CTA (sticky action bar on mobile) */}
        <div className="sticky bottom-3 z-30 rounded-[1.4rem] border border-slate-100 bg-white/95 p-4 ft-shadow-lg backdrop-blur-xl animate-fade-up sm:p-6 lg:static">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 sm:text-sm">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-600" />{e.registered_count} / {e.capacity}</span>
                <span className="font-head text-base text-blue-600 sm:text-lg">{Math.round(capacityPct)}%</span>
              </div>
              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-l from-blue-600 via-cyan-500 to-emerald-500 transition-all duration-700" style={{ width: `${capacityPct}%` }} />
              </div>
              <div className="mt-2 hidden text-[11px] font-semibold text-slate-400 sm:block">نسبة المقاعد المحجوزة حتى الآن</div>
            </div>
            {e.is_registered ? (
              <Button data-testid="unregister-event-btn" onClick={unregister} variant="outline" className="pressable h-12 w-full shrink-0 rounded-2xl px-7 text-base font-bold lg:w-auto">إلغاء التسجيل</Button>
            ) : (
              <Button data-testid="register-event-btn" onClick={register} className="pressable h-12 w-full shrink-0 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-500 px-8 text-base font-bold shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-400 lg:w-auto">سجّل الآن</Button>
            )}
          </div>
        </div>

        <p className="mt-7 whitespace-pre-wrap leading-loose text-slate-700 animate-fade-up d-1 sm:mt-9 sm:text-lg">{e.description}</p>

        <div className="mt-7 grid grid-cols-2 gap-3 animate-fade-up d-2 sm:gap-4 lg:grid-cols-4">
          <Info icon={Calendar} label="التاريخ والوقت" value={`${e.date} ${e.time}`} />
          <Info icon={e.mode === "online" ? Globe : MapPin} label="المكان" value={e.mode === "online" ? "عن بُعد (أونلاين)" : e.location || "حضوري"} />
          <Info icon={Users} label="المقاعد" value={`${e.registered_count} / ${e.capacity}`} />
          <Info icon={Building2} label="الفئة المستهدفة" value={e.audience} />
        </div>

        {e.is_registered && e.qr_code && (
          <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-emerald-200/80 bg-gradient-to-l from-emerald-50 via-teal-50/60 to-blue-50 ft-shadow animate-fade-up d-3 sm:rounded-3xl sm:p-1.5">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-[1.4rem] bg-white ft-shadow ring-1 ring-emerald-100">
                <QrCode className="h-16 w-16 text-slate-800" />
              </div>
              <div className="min-w-0">
                <div className="font-head flex items-center gap-1.5 text-lg font-extrabold text-slate-900"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> رمز الحضور الخاص بك</div>
                <div className="mt-3 inline-block max-w-full break-all rounded-xl bg-white px-3.5 py-2 font-mono text-lg tracking-[0.2em] text-blue-700 ring-1 ring-blue-100">{e.qr_code}</div>
                <div className="mt-2.5 text-xs font-semibold text-slate-500">{e.checked_in ? "تم تسجيل حضورك ✓" : "أظهر هذا الرمز عند الدخول"}</div>
                <Button data-testid="download-event-cert-btn" onClick={downloadCert} variant="outline" size="sm" className="pressable mt-4 min-h-[2.75rem] rounded-xl border-emerald-200 bg-white/80 px-4 font-bold text-emerald-700 shadow-sm hover:bg-white"><CheckCircle2 className="ml-1 h-4 w-4" />تنزيل شهادة المشاركة</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const Info = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-[1.4rem] border border-slate-100 bg-white p-4 ft-shadow transition hover:-translate-y-0.5 sm:p-5">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/25"><Icon className="h-5 w-5" /></div>
    <div className="min-w-0">
      <div className="text-[11px] font-bold text-slate-400 sm:text-xs">{label}</div>
      <div className="mt-1 break-words text-[13px] font-bold leading-relaxed text-slate-800 sm:text-sm">{value}</div>
    </div>
  </div>
);
