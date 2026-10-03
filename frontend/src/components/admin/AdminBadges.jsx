import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Medal, Plus, Check, X, Search, Award, Sparkles } from "lucide-react";

/* شارات المهارات · منح الشارات للطلاب وتعريف شارات جديدة
   نفس نقاط النهاية: GET/POST /badges · POST /badges/award · بحث المستخدمين /admin/users */

function Section({ title, icon: Icon, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
      <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2 mb-4">
        {Icon && <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function AdminBadges() {
  const { hasPerm } = useAuth();
  const [defs, setDefs] = useState([]);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [selBadge, setSelBadge] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "", criteria: "", icon: "Award", color: "#059669", seasonal: false, starts_at: "", ends_at: "", metric: "books", target: 1 });

  const load = async () => { const { data } = await api.get("/badges"); setDefs(data); };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/users", { params: { q } }); setUsers(data.items || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const award = async () => {
    if (!selUser || !selBadge) return toast.error("اختر المستخدم والشارة");
    setAwarding(true);
    try { await api.post("/badges/award", { user_id: selUser.id, badge_key: selBadge }); toast.success(`مُنحت شارة ${defs.find((d) => d.key === selBadge)?.name} لـ ${selUser.name} 🏅`); setSelUser(null); setQ(""); }
    catch (e) { toast.error(apiErr(e)); }
    setAwarding(false);
  };

  const create = async () => {
    if (!form.key.trim() || !form.name.trim()) return toast.error("المفتاح والاسم مطلوبان");
    if (form.seasonal && (!form.starts_at || !form.ends_at)) return toast.error("حدد بداية ونهاية الموسم");
    setCreating(true);
    const payload = {
      ...form,
      target: Number(form.target) || 1,
      starts_at: form.seasonal && form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.seasonal && form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    try { await api.post("/badges", payload); toast.success(form.seasonal ? "أُضيفت الشارة الموسمية" : "أُضيفت الشارة"); setForm({ key: "", name: "", description: "", criteria: "", icon: "Award", color: "#059669", seasonal: false, starts_at: "", ends_at: "", metric: "books", target: 1 }); load(); }
    catch (e) { toast.error(apiErr(e)); }
    setCreating(false);
  };

  const selBadgeDef = defs.find((d) => d.key === selBadge);

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-gradient-to-l from-amber-500 via-amber-600 to-yellow-600" data-testid="admin-badges-hero">
          <Medal className="absolute -left-4 -bottom-6 w-36 h-36 text-white/10 rotate-12 pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" /> التقدير والتحفيز
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">شارات المهارات</h2>
              <p className="text-white/75 text-xs sm:text-sm mt-1.5 font-medium">امنح شارات تقدير للطلاب المتميزين · وعرّف شارات جديدة بمعايير واضحة</p>
            </div>
            <div className="text-left shrink-0">
              <div className="font-head font-black text-3xl sm:text-4xl leading-none tabular-nums">{defs.length.toLocaleString("en-US")}</div>
              <div className="text-[11px] text-white/75 mt-1 font-medium">شارة معرّفة</div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* منح شارة */}
      <Section title="منح شارة لطالب" icon={Award}>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن طالب بالاسم أو البريد..." className="rounded-xl pr-10 min-h-[46px] bg-slate-50 focus:bg-white" />
        </div>
        {users.length > 0 && !selUser && (
          <div className="mt-2.5 border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 max-h-56 overflow-y-auto ft-shadow">
            {users.slice(0, 6).map((u) => (
              <button key={u.id} onClick={() => setSelUser(u)} className="pressable w-full text-right px-4 py-3 hover:bg-amber-50/60 transition-colors flex items-center gap-3 min-h-[52px]">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center text-xs font-black shrink-0">{(u.name || "؟").trim().charAt(0)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-sm text-slate-800 truncate">{u.name}</span>
                  <span className="block text-[11px] text-slate-400 truncate" dir="ltr">{u.email}</span>
                </span>
                {u.school_name && <span className="text-[10px] font-bold text-slate-400 shrink-0 hidden sm:block">{u.school_name}</span>}
              </button>
            ))}
          </div>
        )}
        {selUser && (
          <div className="mt-2.5 flex items-center gap-3 text-sm bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center text-xs font-black shrink-0">{(selUser.name || "؟").trim().charAt(0)}</span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-slate-800 truncate">{selUser.name}</span>
              <span className="block text-[11px] text-slate-500 truncate" dir="ltr">{selUser.email}</span>
            </span>
            <button onClick={() => setSelUser(null)} aria-label="إلغاء اختيار الطالب" className="pressable w-9 h-9 grid place-items-center rounded-full hover:bg-amber-100 text-slate-500 shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="mt-4">
          <div className="text-xs font-bold text-slate-500 mb-2.5 flex items-center gap-1.5"><Medal className="w-3.5 h-3.5 text-amber-500" /> اختر الشارة</div>
          {defs.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium">لا شارات معرّفة بعد · عرّف أول شارة من الأسفل</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {defs.map((d) => {
                const on = selBadge === d.key;
                return (
                  <button key={d.key} type="button" onClick={() => setSelBadge(d.key)}
                    data-testid={`admin-badge-pick-${d.key}`}
                    className={`pressable relative text-right p-3.5 rounded-2xl border transition-all min-h-[76px] ${on ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"}`}>
                    <span className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0 shadow" style={{ background: d.color || "#059669" }}><Medal className="w-4.5 h-4.5" /></span>
                      <span className="font-bold text-sm text-slate-800 leading-snug">{d.name}</span>
                    </span>
                    {on && <span className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-amber-500 text-white grid place-items-center"><Check className="w-3 h-3" /></span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={award} disabled={awarding || !selUser || !selBadge} className="pressable mt-4 rounded-xl bg-amber-600 hover:bg-amber-700 min-h-[48px] px-6 w-full sm:w-auto">
          <Medal className="w-4 h-4 ml-1.5" />
          {awarding ? "جارٍ المنح..." : selUser && selBadgeDef ? `منح «${selBadgeDef.name}» لـ ${selUser.name}` : "منح الشارة"}
        </Button>
        {(!selUser || !selBadge) && <p className="text-[11px] text-slate-400 font-medium mt-2">اختر طالباً وشارة لتفعيل زر المنح</p>}
      </Section>

      {/* تعريف شارة جديدة */}
      {hasPerm("badge.manage") && (
        <Section title="تعريف شارة جديدة" icon={Plus}>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div><Label>المفتاح (إنجليزي)</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.replace(/\s/g, "_") })} placeholder="leadership" className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" dir="ltr" /></div>
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="قائد ملهم" className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div className="sm:col-span-2"><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div className="sm:col-span-2"><Label>معايير الحصول عليها</Label><Input value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div>
              <Label>اللون</Label>
              <div className="flex items-center gap-2.5 mt-1.5">
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="rounded-xl h-11 w-16 p-1 cursor-pointer shrink-0" />
                <span className="text-xs font-mono text-slate-400" dir="ltr">{form.color}</span>
                <span className="w-10 h-10 rounded-xl grid place-items-center text-white shadow mr-auto" style={{ background: form.color }}><Medal className="w-5 h-5" /></span>
              </div>
            </div>
            <div><Label>الأيقونة (lucide)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Award" className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" dir="ltr" /></div>
            <div className="sm:col-span-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!form.seasonal} onChange={(e) => setForm({ ...form, seasonal: e.target.checked })} className="w-4.5 h-4.5 w-5 h-5 accent-amber-500" />
                <span className="text-sm font-extrabold text-slate-800">شارة موسمية · تُمنح تلقائياً عند بلوغ الهدف ثم تختفي</span>
              </label>
              {form.seasonal && (
                <div className="grid sm:grid-cols-2 gap-3 mt-3.5">
                  <div><Label>بداية الموسم</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-white" /></div>
                  <div><Label>نهاية الموسم</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-white" /></div>
                  <div><Label>يُقاس بـ</Label>
                    <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="w-full rounded-xl mt-1.5 min-h-[44px] bg-white border border-slate-200 px-3 text-sm outline-none">
                      <option value="books">كتب منتهية خلال الموسم</option>
                      <option value="pages">صفحات مقروءة خلال الموسم</option>
                      <option value="quizzes">اختبارات فهم ناجحة</option>
                    </select>
                  </div>
                  <div><Label>الهدف المطلوب</Label><Input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="rounded-xl mt-1.5 min-h-[44px] bg-white" /></div>
                </div>
              )}
            </div>
          </div>
          <Button onClick={create} disabled={creating} className="pressable mt-4 rounded-xl min-h-[46px] px-6 w-full sm:w-auto"><Plus className="w-4 h-4 ml-1.5" /> {creating ? "جارٍ الإضافة..." : "إضافة الشارة"}</Button>
        </Section>
      )}

      {/* الشارات المعرفة */}
      <Section title={`الشارات المعرّفة (${defs.length})`} icon={Medal}>
        {defs.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 grid place-items-center mb-3"><Medal className="w-7 h-7 text-amber-300" /></div>
            <div className="font-bold text-slate-600 text-sm">لا شارات معرّفة بعد</div>
            <p className="text-xs text-slate-400 mt-1">ستظهر هنا كل الشارات المتاحة للمنح</p>
          </div>
        ) : (
          <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {defs.map((d) => (
              <Item key={d.key} className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 bg-gradient-to-l from-slate-50/80 to-white hover:border-amber-200 transition-colors">
                <span className="w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0 shadow" style={{ background: d.color || "#059669" }}><Medal className="w-6 h-6" /></span>
                <div className="min-w-0">
                  <div className="font-head font-extrabold text-slate-800 leading-snug">{d.name}{d.seasonal ? <span className="mr-2 align-middle text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 ring-1 ring-amber-400/40">موسمية</span> : null}</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">{d.criteria || d.description || "شارة تقدير من إدارة المنصة"}</div>
                  <div className="text-[10px] font-mono text-slate-300 mt-1.5" dir="ltr">{d.key}</div>
                </div>
              </Item>
            ))}
          </Stagger>
        )}
      </Section>
    </div>
  );
}
