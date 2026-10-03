import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { Stagger, Item, FadeUp } from "@/components/anim";
import { Newspaper, Plus, PenLine, Trash2, Search, Eye, LayoutGrid } from "lucide-react";

/* الأخبار · نشر وتحرير وحذف أخبار المنصة
   نفس نقاط النهاية: GET/POST /news · PATCH/DELETE /news/{id}
   الصلاحيات: التحرير news.edit · الحذف news.delete */

function Section({ title, icon: Icon, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-6">
      <h3 className="font-head font-extrabold text-base text-slate-800 flex items-center gap-2 mb-4">
        {Icon && <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function AdminNews() {
  const { hasPerm } = useAuth();
  const canEdit = hasPerm("news.edit");
  const canDelete = hasPerm("news.delete");
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ title: "", body: "", category: "منصة", cover_url: "" });
  const [publishing, setPublishing] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [ef, setEf] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/news", { params: { limit: 40 } }); setItems(data.items || []); }
    catch { setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setPublishing(true);
    try { await api.post("/news", f); toast.success("تم نشر الخبر"); setF({ title: "", body: "", category: "منصة", cover_url: "" }); load(); }
    catch (e) { toast.error(apiErr(e)); }
    setPublishing(false);
  };

  const openEdit = (n) => { setEditing(n); setEf({ title: n.title || "", body: n.body || "", category: n.category || "منصة", cover_url: n.cover_url || "" }); };
  const save = async () => {
    if (!ef.title.trim() || !ef.body.trim()) return toast.error("العنوان والنص مطلوبان");
    setSaving(true);
    try { await api.patch(`/news/${editing.id}`, ef); toast.success("تم حفظ التعديلات ✅"); setEditing(null); load(); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  const del = async (n) => {
    if (!window.confirm(`حذف خبر "${n.title}" نهائياً؟`)) return;
    try { await api.delete(`/news/${n.id}`); toast.success("تم حذف الخبر"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const cats = items ? [...new Set(items.map((n) => n.category || "منصة"))] : [];
  const withCover = items ? items.filter((n) => n.cover_url).length : 0;
  const shown = items ? items.filter((n) => !q.trim() || `${n.title} ${n.body || ""} ${n.category || ""}`.toLowerCase().includes(q.trim().toLowerCase())) : [];

  return (
    <div className="space-y-5">
      {/* ترويسة */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-gradient-to-l from-sky-600 via-blue-600 to-indigo-600" data-testid="admin-news-hero">
          <Newspaper className="absolute -left-4 -bottom-6 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold mb-3">
                <Newspaper className="w-3.5 h-3.5" /> غرفة الأخبار
              </div>
              <h2 className="font-head font-black text-2xl sm:text-3xl leading-tight">أخبار المنصة</h2>
              <p className="text-white/75 text-xs sm:text-sm mt-1.5 font-medium">انشر أخباراً وإعلانات تصل كل الطلاب · وحرّر أو احذف المنشورات السابقة</p>
            </div>
            <div className="flex items-end gap-5 shrink-0">
              <div className="text-left">
                <div className="font-head font-black text-3xl sm:text-4xl leading-none tabular-nums">{(items?.length || 0).toLocaleString("en-US")}</div>
                <div className="text-[11px] text-white/75 mt-1 font-medium">خبر منشور</div>
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-head font-black text-3xl sm:text-4xl leading-none tabular-nums">{cats.length.toLocaleString("en-US")}</div>
                <div className="text-[11px] text-white/75 mt-1 font-medium">تصنيف</div>
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* نشر خبر */}
      <Section title="نشر خبر جديد" icon={Plus}>
        <div className="grid lg:grid-cols-[1fr_240px] gap-4">
          <div className="space-y-3">
            <Input data-testid="news-title" placeholder="عنوان الخبر" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl min-h-[46px] bg-slate-50 focus:bg-white font-bold" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="التصنيف" value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} className="rounded-xl min-h-[44px] bg-slate-50 focus:bg-white" />
              <Input placeholder="رابط صورة (اختياري)" value={f.cover_url} onChange={(e) => setF((x) => ({ ...x, cover_url: e.target.value }))} className="rounded-xl min-h-[44px] bg-slate-50 focus:bg-white" dir="ltr" />
            </div>
            <Textarea placeholder="نص الخبر" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl min-h-[130px] bg-slate-50 focus:bg-white leading-relaxed" />
            <Button data-testid="publish-news-btn" onClick={submit} disabled={publishing} className="pressable rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[46px] px-6 w-full sm:w-auto">
              <Plus className="w-4 h-4 ml-1.5" /> {publishing ? "جارٍ النشر..." : "نشر الخبر"}
            </Button>
          </div>
          {/* معاينة */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> معاينة البطاقة</div>
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white ft-shadow">
              {f.cover_url ? (
                <img src={f.cover_url} alt="" className="h-28 w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="h-20 w-full bg-gradient-to-l from-sky-100 to-indigo-50 grid place-items-center"><Newspaper className="w-8 h-8 text-sky-300" /></div>
              )}
              <div className="p-3.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{f.category || "منصة"}</span>
                <div className="font-head font-extrabold text-slate-800 leading-snug mt-2 line-clamp-2 text-sm">{f.title || "عنوان الخبر سيظهر هنا"}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{f.body || "نص الخبر سيظهر هنا…"}</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-300 font-medium mt-2">معاينة تقريبية لبطاقة الخبر كما تظهر للطلاب</p>
          </div>
        </div>
      </Section>

      {/* الأخبار المنشورة */}
      <Section title={`الأخبار المنشورة (${items?.length || 0})`} icon={LayoutGrid}>
        {!items ? <PageLoader /> : (
          <>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في الأخبار المعروضة..." className="rounded-xl pr-10 min-h-[44px] bg-slate-50 focus:bg-white" />
            </div>
            {items.length > 0 && (
              <p className="-mt-1.5 mb-3.5 text-[11px] text-slate-400 font-medium">{withCover} خبر بصورة غلاف · تُعرض أحدث ٤٠ خبراً</p>
            )}
            {shown.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-sky-50 grid place-items-center mb-3"><Newspaper className="w-7 h-7 text-sky-300" /></div>
                <div className="font-bold text-slate-600 text-sm">{items.length === 0 ? "لا أخبار بعد" : "لا نتائج مطابقة للبحث"}</div>
                <p className="text-xs text-slate-400 mt-1">{items.length === 0 ? "انشر أول خبر من الأعلى" : "جرّب كلمة بحث مختلفة"}</p>
              </div>
            ) : (
              <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {shown.map((n) => (
                  <Item key={n.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow overflow-hidden flex flex-col hover:border-sky-200 transition-colors" data-testid={`admin-news-card-${n.id}`}>
                    {n.cover_url ? (
                      <img src={n.cover_url} alt={n.title} className="h-32 w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-24 w-full bg-gradient-to-l from-sky-100 to-indigo-50 grid place-items-center">
                        <Newspaper className="w-9 h-9 text-sky-300" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{n.category || "منصة"}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{String(n.created_at || "").slice(0, 10)}</span>
                        {(n.views > 0) && <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium"><Eye className="w-3.5 h-3.5" />{n.views}</span>}
                      </div>
                      <div className="font-head font-extrabold text-slate-800 leading-snug line-clamp-2">{n.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.body}</div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2 mt-auto pt-2">
                          {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(n)} data-testid={`admin-news-edit-${n.id}`} className="pressable rounded-xl flex-1 h-11"><PenLine className="w-4 h-4 ml-1" /> تعديل</Button>}
                          {canDelete && <Button size="sm" variant="outline" onClick={() => del(n)} data-testid={`admin-news-delete-${n.id}`} className="pressable rounded-xl flex-1 h-11 text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-4 h-4 ml-1" /> حذف</Button>}
                        </div>
                      )}
                    </div>
                  </Item>
                ))}
              </Stagger>
            )}
          </>
        )}
      </Section>

      {/* حوار التعديل */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-head font-extrabold">تعديل الخبر</DialogTitle></DialogHeader>
          <div className="space-y-3.5">
            <div><Label>العنوان</Label><Input value={ef.title || ""} onChange={(e) => setEf((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>التصنيف</Label><Input value={ef.category || ""} onChange={(e) => setEf((x) => ({ ...x, category: e.target.value }))} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" /></div>
            <div><Label>رابط الصورة</Label><Input value={ef.cover_url || ""} onChange={(e) => setEf((x) => ({ ...x, cover_url: e.target.value }))} className="rounded-xl mt-1.5 min-h-[44px] bg-slate-50 focus:bg-white" dir="ltr" /></div>
            {ef.cover_url && <img src={ef.cover_url} alt="" className="h-32 w-full object-cover rounded-2xl border border-slate-100" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
            <div><Label>نص الخبر</Label><Textarea value={ef.body || ""} onChange={(e) => setEf((x) => ({ ...x, body: e.target.value }))} className="rounded-xl mt-1.5 min-h-[140px] bg-slate-50 focus:bg-white leading-relaxed" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} className="pressable rounded-xl min-h-[44px]">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="pressable rounded-xl bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
