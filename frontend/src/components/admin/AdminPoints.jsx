import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { PageLoader } from "@/components/Layout";
import { FadeUp, Stagger, Item } from "@/components/anim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Star, MessageSquare, MessagesSquare, Heart, CalendarCheck, Trophy, Crown,
  Zap, Medal, Award, Upload, PenLine, Rocket, ThumbsUp, Flag, Users, Check, X, Search,
  Settings2, UserCog, Coins,
} from "lucide-react";

/* نظام النقاط
   إعادة تصميم بصرية فقط: نفس الجلب GET /admin/points-config ونفس الحفظ
   PUT /admin/points-config بنفس الحمولة، ونفس تعديل XP عبر بحث
   GET /admin/users ثم POST /admin/users/{id}/adjust-xp.
   testids محفوظة حرفياً: points-{key} و save-points-btn.
   POINTS_META منسوخة كما هي من Admin.jsx (بيانات ثابتة غير قابلة للاستيراد). */

const POINTS_META = {
  read_book: { l: "قراءة كتاب", icon: BookOpen, c: "#2563EB" },
  review_book: { l: "تقييم كتاب", icon: Star, c: "#D97706" },
  create_discussion: { l: "إنشاء نقاش", icon: MessageSquare, c: "#7C3AED" },
  reply_discussion: { l: "رد على نقاش", icon: MessagesSquare, c: "#0891B2" },
  receive_like: { l: "استلام إعجاب", icon: Heart, c: "#E11D48" },
  join_event: { l: "حضور فعالية", icon: CalendarCheck, c: "#059669" },
  win_chess: { l: "فوز بالشطرنج", icon: Trophy, c: "#D97706" },
  play_chess: { l: "لعب الشطرنج", icon: Crown, c: "#7C3AED" },
  daily_checkin: { l: "حضور يومي", icon: Zap, c: "#059669" },
  join_competition: { l: "دخول مسابقة", icon: Medal, c: "#0891B2" },
  win_competition: { l: "فوز بمسابقة", icon: Award, c: "#D97706" },
  upload_book_approved: { l: "قبول كتاب مرفوع", icon: Upload, c: "#2563EB" },
  work_published: { l: "نشر عمل في الاستوديو", icon: PenLine, c: "#7C3AED" },
  studio_review: { l: "مراجعة عمل أدبي", icon: Star, c: "#D97706" },
  venture_publish: { l: "نشر مشروع", icon: Rocket, c: "#E11D48" },
  venture_vote_received: { l: "تصويت لمشروعك", icon: ThumbsUp, c: "#059669" },
  venture_complete_owner: { l: "إتمام مشروع (مالك)", icon: Flag, c: "#2563EB" },
  venture_complete_member: { l: "إتمام مشروع (عضو)", icon: Users, c: "#0891B2" },
};

function CardShell({ icon: Icon, c, title, desc, children, testid }) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 ft-shadow" data-testid={testid}>
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-2xl grid place-items-center text-white shadow-sm shrink-0" style={{ background: `linear-gradient(135deg, ${c}, ${c}BB)` }}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block font-head font-extrabold text-slate-800">{title}</span>
          {desc && <span className="block text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</span>}
        </span>
      </div>
      {children}
    </div>
  );
}

function AdjustXp() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/admin/users", { params: { q } }); setUsers(data.items || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const submit = async () => {
    if (!sel) return toast.error("اختر المستخدم أولاً");
    const n = Number(amount);
    if (!n) return toast.error("أدخل عدد النقاط (موجب للإضافة وسالب للخصم)");
    setSaving(true);
    try {
      await api.post(`/admin/users/${sel.id}/adjust-xp`, { amount: n, reason: reason.trim() || "تعديل إداري" });
      toast.success(`تم ${n > 0 ? "إضافة" : "خصم"} ${Math.abs(n)} نقطة ${n > 0 ? "إلى" : "من"} ${sel.name} ✅`);
      setSel(null); setQ(""); setAmount(""); setReason("");
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  return (
    <CardShell icon={UserCog} c="#D97706" title="تعديل نقاط مستخدم" desc="ابحث عن المستخدم ثم أضف أو اخصم نقاطاً بسبب واضح · يُسجل التعديل في سجل العمليات" testid="admin-points-adjust">
      <div className="max-w-xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد..." className="rounded-xl pr-9" />
        </div>
        {users.length > 0 && !sel && (
          <div className="border border-slate-100 rounded-2xl divide-y max-h-44 overflow-y-auto bg-white ft-shadow">
            {users.slice(0, 6).map((u) => (
              <button key={u.id} onClick={() => setSel(u)} className="w-full text-right px-3.5 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between gap-2 transition-colors">
                <span><span className="font-medium">{u.name}</span> <span className="text-slate-400 text-xs">{u.email}</span></span>
                <span className="text-xs text-amber-600 font-bold shrink-0">{u.xp ?? 0} نقطة</span>
              </button>
            ))}
          </div>
        )}
        {sel && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 rounded-2xl px-3.5 py-2.5">
            <Check className="w-4 h-4 text-emerald-600" />{sel.name}
            <span className="text-xs text-slate-400">({sel.xp ?? 0} نقطة حالياً)</span>
            <button onClick={() => setSel(null)} className="mr-auto text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>عدد النقاط <span className="text-slate-400 font-normal">(+ إضافة / − خصم)</span></Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 50 أو -20" className="rounded-xl mt-1 text-center font-bold" dir="ltr" /></div>
          <div><Label>السبب</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: فوز بتحدي القراءة" className="rounded-xl mt-1" /></div>
        </div>
        <Button onClick={submit} disabled={saving} className="rounded-xl bg-amber-600 hover:bg-amber-700">
          <Zap className="w-4 h-4 ml-1" /> {saving ? "جارٍ التنفيذ..." : "تنفيذ التعديل"}
        </Button>
      </div>
    </CardShell>
  );
}

export default function AdminPoints() {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/admin/points-config").then((r) => setCfg(r.data)); }, []);
  const save = async () => {
    setSaving(true);
    try { await api.put("/admin/points-config", cfg); toast.success("تم حفظ إعدادات النقاط ✅"); }
    catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };
  if (!cfg) return <PageLoader />;
  const keys = Object.keys(cfg);
  const totalValue = keys.reduce((s, k) => s + (Number(cfg[k]) || 0), 0);
  return (
    <div className="space-y-5" data-testid="admin-points">
      <FadeUp>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-head font-extrabold text-lg flex items-center gap-2 text-slate-900">
              <span className="w-8 h-8 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#D97706,#D97706BB)" }}><Coins className="w-4.5 h-4.5" /></span>
              نظام النقاط
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">قيمة كل نشاط بالنقاط · التغيير ينطبق على الأنشطة الجديدة فوراً دون المساس بأرصدة الطلاب الحالية.</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold" data-testid="admin-points-summary">
            {keys.length} قاعدة · مجموع القيم {totalValue} نقطة
          </span>
        </div>
      </FadeUp>

      <FadeUp delay={0.04}>
        <CardShell icon={Settings2} c="#2563EB" title="قيم النقاط لكل نشاط" desc="عدّل الرقم داخل كل بطاقة ثم احفظ · الرقم هو ما يكسبه الطالب عند إتمام النشاط" testid="admin-points-rules">
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {keys.map((k) => {
              const m = POINTS_META[k] || { l: k, icon: Zap, c: "#64748B" };
              const Icon = m.icon;
              return (
                <Item key={k}>
                  <div className="h-full flex items-center gap-3 bg-gradient-to-l from-slate-50 to-white rounded-3xl border border-slate-100 p-3.5 hover-lift">
                    <div className="w-11 h-11 rounded-2xl grid place-items-center text-white shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${m.c}, ${m.c}BB)` }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate">{m.l}</div>
                      <div className="text-[11px] text-slate-400" dir="ltr">{k}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input data-testid={`points-${k}`} type="number" value={cfg[k]} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-20 rounded-xl h-10 bg-white text-center font-bold" dir="ltr" />
                      <span className="text-xs text-slate-400">نقطة</span>
                    </div>
                  </div>
                </Item>
              );
            })}
          </Stagger>
          <Button data-testid="save-points-btn" onClick={save} disabled={saving} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700 min-h-[44px]">
            <Check className="w-4 h-4 ml-1" /> {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </Button>
        </CardShell>
      </FadeUp>

      <FadeUp delay={0.07}>
        <AdjustXp />
      </FadeUp>
    </div>
  );
}
