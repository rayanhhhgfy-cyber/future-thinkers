import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Globe, ArrowRight, Building2, QrCode, CheckCircle2, CalendarDays, Wifi, Clock, CalendarPlus, Loader2, ScanLine, BadgeCheck, Star, Share2, Link2, Hourglass } from "lucide-react";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function EventDetail() {
  const { id } = useParams();
  const { user, hasPerm } = useAuth();
  const nav = useNavigate();
  const [e, setE] = useState(null);
  const [myReg, setMyReg] = useState(null);
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState("");
  const [myStars, setMyStars] = useState(0);
  const [rateText, setRateText] = useState("");
  const [rateBusy, setRateBusy] = useState(false);
  const [rated, setRated] = useState(false);

  const load = async () => { try { const { data } = await api.get(`/events/${id}`); setE(data); } catch { nav("/events"); } };
  useEffect(() => { load(); }, [id]);

  /* My personal check-in code (from my-registration) · falls back to the
     event payload's qr_code when the endpoint has nothing extra. */
  useEffect(() => {
    if (!user || !e?.is_registered) { setMyReg(null); return; }
    let alive = true;
    api.get(`/events/${id}/my-registration`)
      .then((r) => {
        if (!alive) return;
        const reg = r.data?.registration || r.data || {};
        setMyReg({
          code: reg.code || reg.checkin_code || reg.qr_code || "",
          attended: !!(reg.attended ?? reg.checked_in ?? reg.attended_at),
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id, user, e?.is_registered]);

  /* Prefill my existing rating (when the API returns one) once per event. */
  useEffect(() => {
    if (!e?.id) return;
    const mine = e.my_rating;
    const stars = typeof mine === "number" ? mine : mine?.stars;
    if (stars) { setMyStars(Number(stars) || 0); setRated(true); }
    const txt = (typeof mine === "object" && mine?.text) || e.my_rating_text;
    if (txt) setRateText(txt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e?.id]);

  const canManage = !!user && (hasPerm("event.manage") || ["admin", "super_admin"].includes(user.role));

  const doCheckin = async () => {
    const code = checkinCode.trim();
    if (!code || checkinBusy) return;
    setCheckinBusy(true);
    try {
      const { data } = await api.post(`/events/${id}/checkin`, { code });
      const name = data?.name || data?.user_name || data?.attendee?.name || data?.attendee_name || "";
      setLastCheckedIn(name || "أحد المسجلين");
      toast.success(name ? `تم تسجيل حضور ${name} ✓` : "تم تسجيل الحضور ✓");
      setCheckinCode("");
      load();
    } catch (err) { toast.error(apiErr(err)); }
    setCheckinBusy(false);
  };

  const register = async () => {
    if (!user) return nav("/login");
    try {
      const { data } = await api.post(`/events/${id}/register`);
      const wl = data.waitlisted ?? data.waitlist;
      const pos = data.position ?? data.waitlist_position;
      toast.success(wl ? `أُضفت إلى قائمة الانتظار${pos ? ` · رقم ${pos}` : ""}` : "تم تسجيلك بنجاح!");
      load();
    }
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

  /* Share the event · native share sheet when available, clipboard copy
     as fallback, always with toast feedback. */
  const copyLink = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); toast.success("تم نسخ رابط الفعالية"); return; }
    catch { /* clipboard unavailable (permissions / insecure context) */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("تم نسخ رابط الفعالية");
    } catch { toast.error("تعذّر نسخ الرابط"); }
  };
  const shareEvent = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: e.title, text: e.title, url }); return; }
      catch { return; /* user dismissed the share sheet */ }
    }
    copyLink();
  };

  /* Submit (or update) the attendee rating for this event. */
  const submitRate = async () => {
    if (!myStars || rateBusy) return;
    setRateBusy(true);
    try {
      const { data } = await api.post(`/events/${id}/rate`, { stars: myStars, text: rateText.trim() || undefined });
      setRated(true);
      toast.success("شكراً · تم حفظ تقييمك");
      if (data && (data.rating_avg != null || data.rating_count != null)) {
        setE((prev) => (prev ? { ...prev, rating_avg: data.rating_avg ?? prev.rating_avg, rating_count: data.rating_count ?? prev.rating_count } : prev));
      }
    } catch (err) { toast.error(apiErr(err)); }
    setRateBusy(false);
  };

  /* Build an .ics calendar file client-side from the event date/time and
     download it · defaults to 10:00 +03 (Asia/Amman) for two hours when the
     event has no parseable time. */
  const addToCalendar = () => {
    const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const d = String(e.date || "").replace(/[^0-9]/g, "").slice(0, 8);
    const tm = String(e.time || "").match(/(\d{1,2})[:.](\d{2})/);
    let hh = 10, mm = 0;
    if (tm) { hh = Math.min(23, Number(tm[1])); mm = Math.min(59, Number(tm[2])); }
    const p2 = (n) => String(n).padStart(2, "0");
    const start = `${d}T${p2(hh)}${p2(mm)}00`;
    const end = `${d}T${p2((hh + 2) % 24)}${p2(mm)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const loc = e.mode === "online" ? "عن بُعد (أونلاين)" : (e.location || "");
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FutureThinkers//Events//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Amman",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000",
      "TZOFFSETFROM:+0300",
      "TZOFFSETTO:+0300",
      "TZNAME:EET",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      `UID:event-${e.id}@future-thinkers`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Amman:${start}`,
      `DTEND;TZID=Asia/Amman:${end}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.description)}`,
      `LOCATION:${esc(loc)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `event-${e.id}.ics`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل ملف التقويم · افتحه لإضافة الفعالية");
  };

  if (!e) return <Layout><PageLoader /></Layout>;

  const dateParts = String(e.date || "").split("-");
  const dateDay = dateParts[2]?.slice(0, 2) || "";
  const dateMonth = MONTHS[Number(dateParts[1]) - 1] || dateParts[1] || "";
  const capacity = Number(e.capacity) || 0;
  const registered = Number(e.registered_count) || 0;
  const capacityPct = capacity > 0 ? Math.min(100, Math.max(0, (registered / capacity) * 100)) : 0;
  /* Registration state for the current user · my_status from the API when
     present, otherwise the legacy is_registered flag. */
  const myStatus = e.my_status || null;
  const isWaitlisted = myStatus === "waitlisted" || myStatus === "waitlist";
  const isRegistered = !isWaitlisted && (myStatus === "registered" || myStatus === "confirmed" || !!e.is_registered);
  const waitPos = e.waitlist_position ?? e.my_waitlist_position ?? null;
  const isFull = capacity > 0 && registered >= capacity;
  const ratingAvg = Number(e.rating_avg) || 0;
  const ratingCount = Number(e.rating_count) || 0;
  const attended = !!(myReg?.attended || e.checked_in);

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

        <div className="relative z-10 mx-auto flex min-h-[21rem] w-full max-w-6xl flex-col justify-end px-4 pb-7 pt-28 sm:min-h-[26rem] sm:px-6 sm:pb-9 lg:min-h-[29rem] lg:px-8 lg:pb-11 xl:max-w-[1440px]">
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
            {ratingCount > 0 && (
              <span className="inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {ratingAvg.toFixed(1)} · {ratingCount} تقييم
              </span>
            )}
          </div>
          <h1 className="font-head mt-4 max-w-3xl text-3xl font-extrabold leading-[1.2] animate-fade-up d-1 sm:text-4xl sm:leading-[1.2] lg:text-[3.4rem] xl:max-w-4xl 2xl:text-6xl">{e.title}</h1>
          <p className="mt-3.5 flex items-center gap-2 font-semibold text-slate-200 animate-fade-up d-2">
            <Building2 className="h-5 w-5 shrink-0 ft-text-accent-bright" />
            <span>تنظيم: {e.organizer}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start lg:gap-8 lg:px-8 lg:py-10 xl:max-w-[1440px] xl:gap-10">
        {/* capacity + CTA (registration card · scrolls with the page) */}
        <div className="relative rounded-[1.4rem] border border-slate-100 bg-white/95 p-4 ft-shadow-lg backdrop-blur-xl animate-fade-up sm:p-6 lg:col-start-2 lg:row-start-1">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500 sm:text-sm">
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-blue-600" />{e.registered_count} / {e.capacity}</span>
                <span className="font-head text-base text-blue-600 sm:text-lg">{Math.round(capacityPct)}%</span>
              </div>
              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full ft-grad-bar transition-all duration-700" style={{ width: `${capacityPct}%` }} />
              </div>
              <div className="mt-2 hidden text-[11px] font-semibold text-slate-400 sm:block">نسبة المقاعد المحجوزة حتى الآن</div>
              {Number(e.waitlist_count) > 0 && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200/70">
                  <Hourglass className="h-3.5 w-3.5" /> {e.waitlist_count} في قائمة الانتظار
                </div>
              )}
            </div>
            {isRegistered ? (
              <Button data-testid="unregister-event-btn" onClick={unregister} variant="outline" className="pressable h-12 w-full shrink-0 rounded-2xl px-7 text-base font-bold">إلغاء التسجيل</Button>
            ) : isWaitlisted ? (
              <div className="w-full shrink-0 space-y-2.5">
                <div data-testid="event-waitlist-state" className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-extrabold text-amber-800">
                  <Hourglass className="h-4 w-4 shrink-0" />
                  أنت في قائمة الانتظار{waitPos ? ` · رقم ${waitPos}` : ""}
                </div>
                <Button data-testid="cancel-waitlist-btn" onClick={unregister} variant="outline" className="pressable h-12 w-full rounded-2xl px-7 text-base font-bold">إلغاء الانتظار</Button>
              </div>
            ) : (
              <Button data-testid="register-event-btn" onClick={register} className="pressable h-12 w-full shrink-0 rounded-2xl ft-btn-primary px-8 text-base font-bold shadow-lg">{isFull ? "انضم لقائمة الانتظار" : "سجّل الآن"}</Button>
            )}
            <button
              data-testid="add-to-calendar-btn"
              onClick={addToCalendar}
              className="pressable flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/70 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <CalendarPlus className="h-4 w-4" /> أضف إلى التقويم
            </button>
            {/* share row */}
            <div className="flex gap-2.5">
              <button
                data-testid="share-event-btn"
                onClick={shareEvent}
                className="pressable flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
              >
                <Share2 className="h-4 w-4" /> مشاركة
              </button>
              <button
                data-testid="copy-event-link-btn"
                onClick={copyLink}
                className="pressable flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" /> نسخ الرابط
              </button>
            </div>
          </div>
        </div>

        {/* quick details rail (desktop only) */}
        <div className="hidden lg:col-start-2 lg:mt-5 lg:block">
          <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 ft-shadow animate-fade-up d-1">
            <div className="font-head text-sm font-extrabold text-slate-900">تفاصيل سريعة</div>
            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Calendar className="h-4 w-4" /></span>
                <span className="font-semibold text-slate-600">{e.date} {e.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ft-bg-soft ft-text-accent">{e.mode === "online" ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}</span>
                <span className="font-semibold text-slate-600">{e.mode === "online" ? "عن بُعد (أونلاين)" : e.location || "حضوري"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Users className="h-4 w-4" /></span>
                <span className="font-semibold text-slate-600">{Math.max(0, capacity - registered)} مقعد متبقٍ من {capacity}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-500"><Star className="h-4 w-4" /></span>
                <span className="font-semibold text-slate-600">{ratingCount > 0 ? `${ratingAvg.toFixed(1)} من 5 · ${ratingCount} تقييم` : "لا تقييمات بعد"}</span>
              </div>
              {Number(e.waitlist_count) > 0 && (
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-500"><Hourglass className="h-4 w-4" /></span>
                  <span className="font-semibold text-slate-600">{e.waitlist_count} في قائمة الانتظار</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-7 whitespace-pre-wrap leading-loose text-slate-700 animate-fade-up d-1 sm:mt-9 sm:text-lg lg:col-start-1 lg:row-start-1 lg:mt-1 lg:text-xl lg:leading-loose">{e.description}</p>

        <div className="mt-7 grid grid-cols-2 gap-3 animate-fade-up d-2 sm:gap-4 lg:col-start-1 lg:grid-cols-2 2xl:grid-cols-4">
          <Info icon={Calendar} label="التاريخ والوقت" value={`${e.date} ${e.time}`} />
          <Info icon={e.mode === "online" ? Globe : MapPin} label="المكان" value={e.mode === "online" ? "عن بُعد (أونلاين)" : e.location || "حضوري"} />
          <Info icon={Users} label="المقاعد" value={`${e.registered_count} / ${e.capacity}`} />
          <Info icon={Building2} label="الفئة المستهدفة" value={e.audience} />
        </div>

        {e.is_registered && (myReg?.code || e.qr_code) && (
          <div className="relative mt-7 overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-[2px] shadow-[0_24px_48px_-20px_rgba(2,44,34,0.55)] animate-fade-up d-3 sm:rounded-[2rem] lg:col-start-1">
            <div className="relative overflow-hidden rounded-[calc(1.7rem-2px)] bg-[radial-gradient(circle_at_12%_10%,rgba(52,211,153,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.94))] sm:rounded-[calc(2rem-2px)]">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-1 rounded-b-full ft-grad-bar" aria-hidden="true" />
              <div className="pointer-events-none absolute -left-4 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-slate-950 sm:block" aria-hidden="true" />
              <div className="pointer-events-none absolute -right-4 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full bg-slate-950 sm:block" aria-hidden="true" />
              <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-7">
                <div className="relative mx-auto grid h-32 w-32 shrink-0 place-items-center rounded-[1.6rem] bg-slate-950 shadow-xl ring-4 ring-emerald-100 sm:mx-0 sm:h-36 sm:w-36">
                  <div className="absolute inset-2 rounded-[1.25rem] border border-dashed border-emerald-300/50" aria-hidden="true" />
                  <QrCode className="relative h-[4.5rem] w-[4.5rem] text-white sm:h-20 sm:w-20" />
                </div>
                <div className="hidden w-px self-stretch bg-[repeating-linear-gradient(to_bottom,rgba(100,116,139,0.45)_0_7px,transparent_7px_14px)] sm:block" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-center sm:text-right">
                  <div className="font-head flex items-center justify-center gap-2 text-xl font-black text-slate-950 sm:justify-start"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"><CheckCircle2 className="h-5 w-5" /></span> رمز الحضور</div>
                  <div className="mt-4 inline-block max-w-full break-all rounded-2xl border border-dashed border-slate-300 bg-slate-950 px-5 py-3 font-mono text-xl tracking-[0.24em] text-amber-300 shadow-inner ring-4 ring-white/70">{myReg?.code || e.qr_code}</div>
                  {(myReg?.attended || e.checked_in) ? (
                    <div className="mt-4">
                      <span data-testid="event-attended-badge" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30">
                        <BadgeCheck className="h-4 w-4" /> تم تسجيل الحضور
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs font-bold leading-relaxed text-slate-500">أظهر هذا الرمز عند الدخول ليتم تسجيل حضورك</div>
                  )}
                  <Button data-testid="download-event-cert-btn" onClick={downloadCert} variant="outline" size="sm" className="pressable mt-5 min-h-[2.85rem] rounded-xl border-emerald-200 bg-white/90 px-4 font-extrabold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:bg-white"><CheckCircle2 className="ml-1 h-4 w-4" />تنزيل شهادة المشاركة</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* attendee rating · appears after check-in */}
        {user && attended && (
          <div data-testid="event-rate-card" className="relative mt-7 overflow-hidden rounded-[1.7rem] border border-amber-100 bg-gradient-to-bl from-amber-50/90 via-white to-white p-6 ft-shadow-lg animate-fade-up d-3 sm:rounded-[2rem] sm:p-7 lg:col-start-1">
            <div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-l from-amber-300 via-amber-400 to-amber-300" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25"><Star className="h-6 w-6" /></span>
              <div>
                <div className="font-head text-lg font-black text-slate-900">قيّم الفعالية</div>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-400">حضرت الفعالية · رأيك يساعدنا نطوّر الفعاليات القادمة</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-1.5" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} data-testid={`rate-star-${n}`} onClick={() => setMyStars(n)} aria-label={`تقييم ${n} من 5`} className="pressable grid h-11 w-11 place-items-center rounded-2xl transition hover:bg-amber-100">
                  <Star className={`h-7 w-7 transition-all duration-200 ${n <= myStars ? "scale-110 fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
              {myStars > 0 && <span className="ms-2 font-head text-lg font-extrabold text-amber-600">{myStars}/5</span>}
            </div>
            <textarea
              data-testid="rate-text"
              value={rateText}
              onChange={(ev) => setRateText(ev.target.value)}
              rows={2}
              maxLength={500}
              placeholder="اكتب انطباعك باختصار · اختياري"
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-inner outline-none transition focus:ring-2 focus:ring-amber-300"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                data-testid="rate-submit-btn"
                onClick={submitRate}
                disabled={!myStars || rateBusy}
                className="pressable h-11 min-h-[44px] rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 px-6 font-extrabold text-white shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
              >
                {rateBusy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Star className="ml-1 h-4 w-4" />}
                {rated ? "تحديث تقييمي" : "إرسال التقييم"}
              </Button>
              {rated && <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> تم حفظ تقييمك · شكراً</span>}
            </div>
          </div>
        )}

        {/* staff check-in desk */}
        {canManage && (
          <div className="relative mt-7 overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-white p-6 ft-shadow-lg animate-fade-up d-3 sm:rounded-[2rem] sm:p-7 lg:col-start-1">
            <div className="absolute inset-x-6 top-0 h-1 rounded-b-full ft-grad-bar" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ft-icon-tile text-white shadow-lg"><ScanLine className="h-6 w-6" /></span>
              <div>
                <div className="font-head text-lg font-black text-slate-900">مكتب تسجيل الحضور</div>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-400">أدخل رمز حضور المشارك كما يظهر في هاتفه ثم اضغط تسجيل.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 rounded-[1.3rem] border border-dashed border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center">
              <Input
                data-testid="event-checkin-input"
                value={checkinCode}
                onChange={(ev) => setCheckinCode(ev.target.value)}
                onKeyDown={(ev) => ev.key === "Enter" && doCheckin()}
                placeholder="رمز الحضور…"
                className="h-[3.25rem] flex-1 rounded-2xl border-slate-200 bg-white text-center font-mono text-lg tracking-[0.18em] shadow-inner"
                dir="ltr"
              />
              <Button
                data-testid="event-checkin-btn"
                onClick={doCheckin}
                disabled={!checkinCode.trim() || checkinBusy}
                className="pressable h-[3.25rem] shrink-0 rounded-2xl ft-btn-primary px-7 font-extrabold shadow-lg"
              >
                {checkinBusy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <BadgeCheck className="ml-1 h-4 w-4" />}
                تسجيل الحضور
              </Button>
            </div>
            {lastCheckedIn && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 shadow-sm animate-fade-up">
                <CheckCircle2 className="h-4 w-4" /> آخر تسجيل: {lastCheckedIn}
              </div>
            )}
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
