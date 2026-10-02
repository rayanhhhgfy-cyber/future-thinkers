import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { Users, Heart, ArrowLeft, Plus, Search, Lightbulb, Rocket, Sparkles } from "lucide-react";
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
export const STATUS_RIBBON = {
  idea: "from-amber-400 to-orange-400",
  in_progress: "from-blue-500 to-sky-400",
  completed: "from-emerald-500 to-teal-400",
};
export const STATUS_DOT = {
  idea: "bg-amber-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const SORT_OPTIONS = [
  { v: "votes", l: "الأعلى تصويتاً" },
  { v: "newest", l: "الأحدث" },
];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="ft-hero-gradient grain relative overflow-hidden rounded-[2rem] text-white px-6 py-10 sm:px-10 sm:py-14">
          <Rocket className="pointer-events-none absolute -left-6 -bottom-8 w-44 h-44 sm:w-64 sm:h-64 text-white/10 -rotate-12" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="w-3.5 h-3.5" /> مشاريع طلابية
            </span>
            <h1 className="font-head text-3xl lg:text-4xl font-extrabold mt-4">مساحة المشاريع 🚀</h1>
            <p className="text-slate-200/90 mt-2 max-w-2xl leading-relaxed">
              اعرض فكرة مشروعك، كوّن فريقاً من طلاب المدارس الأخرى، وتابع التقدّم حتى الإنجاز.
            </p>
            <Button onClick={() => { if (!user) { toast.info("سجّل الدخول أولاً"); nav("/login"); } else setShowNew(true); }}
              className="mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold pressable shadow-lg shadow-emerald-900/20">
              <Plus className="w-4 h-4 ml-1" /> اعرض مشروعك
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow p-4 sm:p-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مشروع..."
              className="rounded-xl pr-9 text-base border-slate-200 bg-slate-50/60 focus-visible:bg-white transition-colors" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {VENTURE_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`pressable rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors ${category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {VENTURE_STATUSES.map((s) => (
              <button key={s.v} onClick={() => setStatus(s.v)}
                className={`pressable inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors ${status === s.v ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"}`}>
                {s.v !== "all" && <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s.v] || "bg-slate-300"}`} />}
                {s.l}
              </button>
            ))}
            <span className="flex-1" />
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
              {SORT_OPTIONS.map((s) => (
                <button key={s.v} onClick={() => setSort(s.v)}
                  className={`pressable rounded-full px-3 py-1 text-xs font-bold transition-colors ${sort === s.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!ventures ? <PageLoader /> : ventures.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-20 h-20 mx-auto mb-4 rounded-[1.4rem] bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Lightbulb className="w-10 h-10 text-amber-400" />
            </div>
            <p className="font-head font-bold text-lg text-slate-600">لا توجد مشاريع بعد</p>
            <p className="mt-1 text-sm">كن أول من يعرض فكرته ويكوّن فريقاً!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {ventures.map((v, i) => (
              <div key={v.id} style={{ animationDelay: `${Math.min(i, 11) * 60}ms` }}
                className="group relative bg-white rounded-[1.4rem] sm:rounded-3xl border border-slate-100 ft-shadow hover-lift flex flex-col overflow-hidden animate-fade-up">
                <div className={`h-1.5 bg-gradient-to-l ${STATUS_RIBBON[v.status] || "from-slate-300 to-slate-200"}`} />
                <div className="p-5 sm:p-6 pt-4 flex flex-col flex-1">
                  <BookmarkButton kind="venture" refId={v.id} title={v.title} className="absolute top-4 left-4 shadow z-10" />
                  <div className="flex items-center gap-2 flex-wrap ml-10">
                    <Badge variant="outline" className={`${STATUS_COLORS[v.status] || ""} rounded-full font-bold`}>{v.status_label}</Badge>
                    <Badge variant="secondary" className="rounded-full">{v.category}</Badge>
                    {v.is_owner && <Badge className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold">مشروعك</Badge>}
                  </div>
                  <Link to={`/ventures/${v.id}`} className="font-head font-extrabold text-lg text-slate-900 mt-3 hover:text-blue-700 line-clamp-1 transition-colors">{v.title}</Link>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1">{v.description}</p>
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-extrabold flex items-center justify-center shrink-0 ring-2 ring-white shadow">
                      {(v.owner_name || "؟").trim().charAt(0)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate">👤 {v.owner_name}{v.school_name ? ` · ${v.school_name}` : ""}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">
                      <Users className="w-3.5 h-3.5 text-blue-500" />{v.team_count}/{v.max_members}
                    </span>
                    <button onClick={() => vote(v)}
                      className={`pressable flex items-center gap-1 text-sm font-bold rounded-full px-3 py-1.5 transition-colors ${v.voted ? "bg-rose-50 text-rose-600 border border-rose-100" : "text-slate-400 border border-transparent hover:text-rose-500 hover:bg-rose-50"}`}>
                      <Heart className={`w-4 h-4 ${v.voted ? "fill-current" : ""}`} />{v.votes_count}
                    </button>
                    <Link to={`/ventures/${v.id}`} className="text-blue-600 text-sm font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      التفاصيل <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-head text-xl font-extrabold">اعرض مشروعك 🚀</DialogTitle></DialogHeader>
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
            <Button onClick={create} disabled={saving} className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold min-h-[48px] pressable">
              {saving ? "جارٍ النشر..." : "انشر المشروع"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
