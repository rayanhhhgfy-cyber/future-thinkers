import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowLeft, Plus, Search, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import BookmarkButton from "@/components/BookmarkButton";

export const VENTURE_CATEGORIES = ["الكل", "تقنية وبرمجة", "ريادة أعمال", "علمي", "بيئي", "مجتمعي", "ثقافي وأدبي", "فني وإعلامي", "أخرى"];
export const VENTURE_STATUSES = [
  { v: "all", l: "كل الحالات" },
  { v: "idea", l: "فكرة" },
  { v: "in_progress", l: "قيد التنفيذ" },
  { v: "completed", l: "مكتمل" },
];
export const STATUS_COLORS = {
  idea: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Ventures() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [ventures, setVentures] = useState(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("الكل");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("votes");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "تقنية وبرمجة", looking_for: "", max_members: 5 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/ventures", { params: { sort, category, status, q: q || undefined } });
      setVentures(data);
    } catch { toast.error("تعذّر تحميل المشاريع"); }
  }, [sort, category, status, q]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!user) { toast.info("سجّل الدخول أولاً لنشر مشروع"); nav("/login"); return; }
    if (form.title.trim().length < 3) { toast.error("العنوان قصير جداً"); return; }
    if (!form.description.trim()) { toast.error("اكتب وصفاً للمشروع"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/ventures", {
        title: form.title.trim(), description: form.description.trim(),
        category: form.category, looking_for: form.looking_for.trim(),
        max_members: Number(form.max_members) || 5,
      });
      setShowNew(false);
      setForm({ title: "", description: "", category: "تقنية وبرمجة", looking_for: "", max_members: 5 });
      toast.success("تم نشر مشروعك 🎉");
      nav(`/ventures/${data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || "تعذّر نشر المشروع"); }
    finally { setSaving(false); }
  };

  const vote = async (v) => {
    if (!user) { toast.info("سجّل الدخول للتصويت"); return; }
    try {
      const { data } = await api.post(`/ventures/${v.id}/vote`);
      setVentures((list) => list.map((x) => x.id === v.id
        ? { ...x, voted: data.voted, votes_count: x.votes_count + (data.voted ? 1 : -1) } : x));
    } catch {}
  };

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold">مساحة المشاريع 🚀</h1>
          <p className="text-slate-300 mt-2 max-w-2xl leading-relaxed">
            اعرض فكرة مشروعك، كوّن فريقاً من طلاب المدارس الأخرى، وتابع التقدّم حتى الإنجاز.
          </p>
          <Button onClick={() => { if (!user) { toast.info("سجّل الدخول أولاً"); nav("/login"); } else setShowNew(true); }}
            className="mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
            <Plus className="w-4 h-4 ml-1" /> اعرض مشروعك
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-slate-100 ft-shadow p-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مشروع..."
              className="rounded-xl pr-9 text-base" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{VENTURE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{VENTURE_STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">الأعلى تصويتاً</SelectItem>
              <SelectItem value="newest">الأحدث</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!ventures ? <PageLoader /> : ventures.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-head font-bold text-lg text-slate-600">لا توجد مشاريع بعد</p>
            <p className="mt-1 text-sm">كن أول من يعرض فكرته ويكوّن فريقاً!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {ventures.map((v) => (
              <div key={v.id} className="group relative bg-white rounded-2xl p-6 border border-slate-100 ft-shadow hover-lift flex flex-col">
                <BookmarkButton kind="venture" refId={v.id} title={v.title} className="absolute top-4 left-4 shadow z-10" />
                <div className="flex items-center gap-2 flex-wrap ml-10">
                  <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full`}>{v.status_label}</Badge>
                  <Badge variant="secondary" className="rounded-full">{v.category}</Badge>
                  {v.is_owner && <Badge className="rounded-full bg-violet-100 text-violet-700">مشروعك</Badge>}
                </div>
                <Link to={`/ventures/${v.id}`} className="font-head font-bold text-lg text-slate-900 mt-3 hover:text-blue-700 line-clamp-1">{v.title}</Link>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1">{v.description}</p>
                <div className="mt-3 text-xs text-slate-400">👤 {v.owner_name}{v.school_name ? ` · ${v.school_name}` : ""}</div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{v.team_count}/{v.max_members}</span>
                  <button onClick={() => vote(v)}
                    className={`flex items-center gap-1 text-sm font-medium rounded-xl px-3 py-1.5 transition-colors ${v.voted ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"}`}>
                    <Heart className={`w-4 h-4 ${v.voted ? "fill-current" : ""}`} />{v.votes_count}
                  </button>
                  <Link to={`/ventures/${v.id}`} className="text-blue-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    التفاصيل <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl">اعرض مشروعك 🚀</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان المشروع</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: تطبيق لتبادل الكتب المدرسية" className="rounded-xl mt-1 text-base" maxLength={100} /></div>
            <div><Label>وصف المشروع</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="اشرح الفكرة، الهدف، وما الذي تحتاجه..." className="rounded-xl mt-1 text-base min-h-[120px]" maxLength={5000} /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(c) => setForm({ ...form, category: c })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{VENTURE_CATEGORIES.filter((c) => c !== "الكل").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>الحد الأقصى للفريق</Label>
                <Input type="number" min={2} max={20} value={form.max_members}
                  onChange={(e) => setForm({ ...form, max_members: e.target.value })}
                  className="rounded-xl mt-1 text-base" /></div>
            </div>
            <div><Label>من تبحث عنه؟ (اختياري)</Label>
              <Input value={form.looking_for} onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
                placeholder="مثال: مصمم ومبرمج وكاتب محتوى" className="rounded-xl mt-1 text-base" maxLength={500} /></div>
            <Button onClick={create} disabled={saving} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px]">
              {saving ? "جارٍ النشر..." : "انشر المشروع"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
