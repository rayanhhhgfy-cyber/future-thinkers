import React, { useEffect, useMemo, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { PageLoader } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Route as RouteIcon, Plus, PenLine, Trash2, Sparkles, BookOpen, Code2, Trophy,
  Zap, Footprints, Save, Flag,
} from "lucide-react";

/* مسارات التعلم · إعادة تصميم PathsAdminPanel
   نفس النقاط: GET /paths · POST /paths · PUT /paths/{id} · DELETE /paths/{id}
   الكتالوجات: GET /books · GET /coding/problems · GET /competitions (قوائم اختيار بالعناوين · لا IDs يدوية) */

const KIND_META = {
  book: { l: "كتاب", icon: BookOpen, c: "#2563EB" },
  problem: { l: "مسألة برمجة", icon: Code2, c: "#7C3AED" },
  competition: { l: "مسابقة", icon: Trophy, c: "#D97706" },
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 flex items-center gap-3.5 relative overflow-hidden">
      <span className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: color }} />
      <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}BB)` }}><Icon className="w-5 h-5" /></span>
      <div className="min-w-0">
        <div className="font-head font-extrabold text-xl sm:text-2xl text-slate-900 leading-none"><Counter value={value || 0} /></div>
        <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPaths() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const [catalog, setCatalog] = useState({ books: [], problems: [], competitions: [] });
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/paths").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => {
    load();
    api.get("/books", { params: { limit: 100 } }).then((r) => setCatalog((c) => ({ ...c, books: r.data.items || [] }))).catch(() => {});
    api.get("/coding/problems").then((r) => setCatalog((c) => ({ ...c, problems: r.data || [] }))).catch(() => {});
    api.get("/competitions").then((r) => { const d = r.data; setCatalog((c) => ({ ...c, competitions: Array.isArray(d) ? d : (d.items || []) })); }).catch(() => {});
  }, []);

  const blank = { title: "", desc: "", icon: "🛤️", color: "#059669", steps: [{ kind: "book", ref_id: "", title: "", xp: 20 }] };
  const openEdit = (p) => setEdit(p ? JSON.parse(JSON.stringify(p)) : { ...blank, steps: [{ kind: "book", ref_id: "", title: "", xp: 20 }] });
  const setF = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setStep = (i, k, v) => setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const changeKind = (i, kind) => setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => (j === i ? { ...s, kind, ref_id: "" } : s)) }));
  const pickRef = (i, kind, refId) => {
    const list = kind === "book" ? catalog.books : kind === "problem" ? catalog.problems : catalog.competitions;
    const found = list.find((x) => x.id === refId);
    setEdit((e) => ({ ...e, steps: e.steps.map((s, j) => (j === i ? { ...s, ref_id: refId, title: found ? found.title : s.title } : s)) }));
  };
  const save = async () => {
    if (!edit.title.trim()) return toast.error("العنوان مطلوب");
    if (edit.steps.some((s) => !s.ref_id)) return toast.error("اختر مرجعاً لكل خطوة من القائمة");
    setBusy(true);
    try {
      const payload = { title: edit.title, desc: edit.desc, icon: edit.icon, color: edit.color, steps: edit.steps.map((s) => ({ ...s, xp: Number(s.xp) || 10 })) };
      if (edit.id) await api.put(`/paths/${edit.id}`, payload);
      else await api.post("/paths", payload);
      toast.success("حُفظ المسار ✓");
      setEdit(null); load();
    } catch (e) { toast.error(apiErr(e)); }
    setBusy(false);
  };
  const remove = async (p) => {
    if (!window.confirm(`حذف مسار «${p.title}»؟`)) return;
    try { await api.delete(`/paths/${p.id}`); load(); } catch (e) { toast.error(apiErr(e)); }
  };

  const totalSteps = useMemo(() => (items || []).reduce((s, p) => s + (p.steps?.length || 0), 0), [items]);
  const totalXp = useMemo(() => (items || []).reduce((s, p) => s + (p.steps || []).reduce((a, st) => a + (Number(st.xp) || 0), 0), 0), [items]);

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition";
  const refList = (kind) => (kind === "book" ? catalog.books : kind === "problem" ? catalog.problems : catalog.competitions);

  return (
    <div className="space-y-5">
      <FadeUp>
        <div className="ft-hero-gradient rounded-[28px] p-5 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-14 left-1/3 w-52 h-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full"><Sparkles className="w-3.5 h-3.5" /> رحلات تعلّم موجّهة</div>
              <h2 className="font-head font-extrabold text-2xl sm:text-3xl mt-3">مسارات التعلم</h2>
              <p className="text-white/70 text-sm mt-1.5 max-w-lg leading-relaxed">ابنِ رحلات متدرجة من كتب ومسائل ومسابقات، خطوة بخطوة، حتى خط النهاية والشهادة.</p>
            </div>
            <button data-testid="admin-paths-create-btn" onClick={() => openEdit(null)} className="pressable inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-white text-emerald-800 text-sm font-extrabold shadow-lg shadow-black/10">
              <Plus className="w-4 h-4" /> مسار جديد
            </button>
          </div>
        </div>
      </FadeUp>

      <Stagger className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Item><StatCard icon={RouteIcon} label="مسار منشور" value={items?.length} color="#059669" /></Item>
        <Item><StatCard icon={Footprints} label="خطوة تعليمية" value={totalSteps} color="#2563EB" /></Item>
        <Item><StatCard icon={Zap} label="مجموع XP في المسارات" value={totalXp} color="#D97706" /></Item>
        <Item><StatCard icon={Flag} label="كتاب متاح للخطوات" value={catalog.books.length} color="#7C3AED" /></Item>
      </Stagger>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <span className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-lg shadow-emerald-500/25 mb-4 text-3xl">🛤️</span>
          <div className="font-head font-extrabold text-slate-800">لا مسارات بعد</div>
          <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">صمّم أول رحلة تعلم واربط فيها كتاباً ومسألة ومسابقة في تسلسل واحد ممتع.</p>
          <Button onClick={() => openEdit(null)} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> إنشاء أول مسار</Button>
        </div>
      ) : (
        <Stagger className="grid lg:grid-cols-2 gap-4">
          {(items || []).map((p) => {
            const steps = p.steps || [];
            const xpSum = steps.reduce((a, s) => a + (Number(s.xp) || 0), 0);
            return (
              <Item key={p.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 flex flex-col gap-4 hover-lift">
                <div className="flex items-start gap-3.5">
                  <span className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl grid place-items-center text-2xl shrink-0 shadow-inner" style={{ background: `${p.color || "#059669"}22` }}>{p.icon || "🛤️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-head font-extrabold text-slate-900 leading-snug">{p.title}</div>
                    {p.desc && <p className="text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2">{p.desc}</p>}
                  </div>
                  <span className="w-3 h-10 rounded-full shrink-0" style={{ background: p.color || "#059669" }} />
                </div>

                {/* معاينة الرحلة */}
                <div className="flex items-center gap-0 overflow-x-auto pb-1 -mx-1 px-1">
                  {steps.slice(0, 6).map((s, i) => {
                    const km = KIND_META[s.kind] || KIND_META.book;
                    const KIcon = km.icon;
                    return (
                      <React.Fragment key={i}>
                        <span className="flex flex-col items-center gap-1 shrink-0 w-12" title={s.title}>
                          <span className="w-9 h-9 rounded-full grid place-items-center ring-2 ring-white shadow" style={{ background: `${km.c}18`, color: km.c }}><KIcon className="w-4 h-4" /></span>
                          <span className="text-[9px] font-bold text-slate-400 max-w-[48px] truncate">{s.title || km.l}</span>
                        </span>
                        {i < Math.min(steps.length, 6) - 1 && <span className="h-0.5 flex-1 min-w-[10px] rounded bg-gradient-to-l from-slate-200 to-slate-100 -mt-3.5" />}
                      </React.Fragment>
                    );
                  })}
                  {steps.length > 6 && <span className="text-[10px] font-extrabold text-slate-400 shrink-0 -mt-3.5">+{steps.length - 6}</span>}
                  <span className="flex flex-col items-center gap-1 shrink-0 w-12">
                    <span className="w-9 h-9 rounded-full grid place-items-center text-white shadow" style={{ background: p.color || "#059669" }}><Flag className="w-4 h-4" /></span>
                    <span className="text-[9px] font-bold text-slate-400">النهاية</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full ring-1 ring-slate-100"><Footprints className="w-3 h-3" />{steps.length} خطوات</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full"><Zap className="w-3 h-3" />{xpSum} XP</span>
                  {Object.keys(KIND_META).map((k) => {
                    const n = steps.filter((s) => s.kind === k).length;
                    if (!n) return null;
                    const km = KIND_META[k];
                    return <span key={k} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${km.c}12`, color: km.c }}>{n} {km.l}</span>;
                  })}
                </div>

                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEdit(p)} className="pressable flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200"><PenLine className="w-4 h-4" /> تعديل</button>
                  <button onClick={() => remove(p)} className="pressable flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold hover:bg-rose-100"><Trash2 className="w-4 h-4" /> حذف</button>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg grid place-items-center text-lg" style={{ background: `${edit?.color || "#059669"}22` }}>{edit?.icon || "🛤️"}</span>
              {edit?.id ? "تعديل المسار" : "مسار جديد"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div>
              <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
                <input value={edit.title} onChange={(e) => setF("title", e.target.value)} placeholder="عنوان المسار: رحلة القارئ الصغير" className={inputCls} />
                <input value={edit.icon} onChange={(e) => setF("icon", e.target.value)} placeholder="🛤️" className={`${inputCls} w-24 text-center`} />
                <input type="color" value={edit.color} onChange={(e) => setF("color", e.target.value)} className="w-14 h-[42px] rounded-xl border border-slate-200 cursor-pointer bg-white" />
              </div>
              <textarea value={edit.desc} onChange={(e) => setF("desc", e.target.value)} placeholder="وصف قصير للمسار" rows={2} className={`${inputCls} mt-3`} />

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">خطوات الرحلة ({edit.steps.length})</span>
                  <span className="text-[11px] font-bold text-slate-400">اختر المرجع من القائمة · العنوان يُملأ تلقائياً وقابل للتعديل</span>
                </div>
                {edit.steps.map((s, i) => {
                  const km = KIND_META[s.kind] || KIND_META.book;
                  const KIcon = km.icon;
                  return (
                    <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-7 h-7 rounded-full text-white text-xs font-extrabold grid place-items-center shrink-0" style={{ background: edit.color || "#059669" }}>{i + 1}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: `${km.c}14`, color: km.c }}><KIcon className="w-3 h-3" />{km.l}</span>
                        <span className="flex-1" />
                        <button onClick={() => setEdit((e) => ({ ...e, steps: e.steps.filter((_, j) => j !== i) }))} className="pressable px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-500 text-[11px] font-bold hover:bg-rose-100">حذف الخطوة</button>
                      </div>
                      <div className="grid sm:grid-cols-[150px_1fr_90px] gap-2">
                        <select value={s.kind} onChange={(e) => changeKind(i, e.target.value)} className={inputCls}>
                          <option value="book">كتاب</option>
                          <option value="problem">مسألة برمجة</option>
                          <option value="competition">مسابقة</option>
                        </select>
                        <select value={s.ref_id} onChange={(e) => pickRef(i, s.kind, e.target.value)} className={inputCls}>
                          <option value="">اختر من القائمة…</option>
                          {refList(s.kind).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                        </select>
                        <input type="number" value={s.xp} onChange={(e) => setStep(i, "xp", e.target.value)} placeholder="XP" className={inputCls} />
                      </div>
                      <input value={s.title} onChange={(e) => setStep(i, "title", e.target.value)} placeholder="عنوان الخطوة كما يراها الطالب" className={`${inputCls} mt-2`} />
                    </div>
                  );
                })}
                <button onClick={() => setEdit((e) => ({ ...e, steps: [...e.steps, { kind: "book", ref_id: "", title: "", xp: 20 }] }))} className="pressable text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full">+ خطوة</button>
              </div>

              <div className="flex gap-2 mt-5 flex-wrap">
                <button onClick={save} disabled={busy} className="pressable inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                  <Save className="w-4 h-4" />{busy ? "…" : "حفظ المسار"}
                </button>
                <button onClick={() => setEdit(null)} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200">إلغاء</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
