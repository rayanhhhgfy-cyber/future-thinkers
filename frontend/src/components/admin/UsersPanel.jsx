import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Search, KeyRound, UserPlus, Clock } from "lucide-react";

const ROLES = [
  ["student", "طالب"],
  ["teacher", "معلم"],
  ["school_admin", "مدير مدرسة"],
  ["directorate_admin", "مدير مديرية"],
  ["moderator", "مشرف"],
  ["admin", "مسؤول"],
  ["super_admin", "مسؤول أعلى"],
  ["custom", "صلاحيات مخصصة"],
];
const roleLabel = (r) => (ROLES.find(([v]) => v === r) || [r, r])[1];

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" }); }
  catch { return "—"; }
};

/** Grouped checkbox picker for the permission catalog. */
function PermissionPicker({ groups, labels, value, onChange }) {
  const [q, setQ] = useState("");
  const norm = (s) => (s || "").toLowerCase();
  const toggle = (p) =>
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  const setGroup = (perms, on) => {
    const s = new Set(value);
    perms.forEach((p) => (on ? s.add(p) : s.delete(p)));
    onChange([...s]);
  };

  return (
    <div>
      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الصلاحيات…"
               className="rounded-xl pr-9" />
      </div>
      <div className="text-xs text-slate-500 mb-2">
        محدد: <b className="text-emerald-700">{value.length}</b> صلاحية
      </div>
      <div className="max-h-72 overflow-y-auto space-y-2 pl-1">
        {groups.map((g) => {
          const shown = g.permissions.filter(
            (p) => !q || norm(labels[p] || p).includes(norm(q)) || norm(p).includes(norm(q)));
          if (!shown.length) return null;
          const onCount = shown.filter((p) => value.includes(p)).length;
          const allOn = onCount === shown.length && shown.length > 0;
          return (
            <div key={g.key} className="border border-slate-200 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setGroup(shown, !allOn)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allOn ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"}`}>
                  {allOn && <Check className="w-3 h-3" />}
                </span>
                <span className="flex-1 text-right">{g.label}</span>
                <span className="text-[11px] font-normal text-slate-400">{onCount}/{shown.length}</span>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 p-2">
                {shown.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-[13px] text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)}
                           className="w-4 h-4 accent-emerald-600 shrink-0" />
                    <span className="leading-tight">{labels[p] || p}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UsersPanel() {
  const { hasPerm } = useAuth();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [pending, setPending] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "custom", permissions: [] });
  const [permEdit, setPermEdit] = useState(null); // { user, permissions }
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canApproveTeachers = hasPerm("teacher.approve");
  const canCreate = hasPerm("user.create");
  const canDelete = hasPerm("user.delete");
  const canEditPerms = hasPerm("role.manage");
  const canSeeCatalog = canCreate || canEditPerms;

  const load = async () => {
    const { data } = await api.get("/admin/users", { params: { q: q || undefined, role: role || undefined } });
    setData(data);
  };
  const loadPending = async () => {
    try { const { data } = await api.get("/admin/users/pending-teachers"); setPending(data.items); }
    catch { /* no permission — section stays hidden */ }
  };
  const loadCatalog = async () => {
    try { const { data } = await api.get("/admin/permissions"); setCatalog(data); }
    catch { /* no permission */ }
  };

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, role]);
  useEffect(() => {
    if (canApproveTeachers) loadPending();
    if (canSeeCatalog) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setUserRole = async (id, newRole) => {
    try { await api.put(`/admin/users/${id}/role`, { role: newRole }); toast.success("تم تحديث الدور"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const setStatus = async (id, status) => {
    try { await api.put(`/admin/users/${id}/status`, { status }); toast.success("تم"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const deleteUser = async (u) => {
    if (!window.confirm(`حذف حساب «${u.name}» نهائياً؟ لا يمكن التراجع عن هذا.`)) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success("تم حذف الحساب"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const approveTeacher = async (u) => {
    if (!window.confirm(`الموافقة على حساب المعلم «${u.name}» وتفعيله؟ سيصله إشعار بالموافقة.`)) return;
    try {
      await api.post(`/admin/users/${u.id}/approve-teacher`);
      toast.success("تمت الموافقة وتفعيل الحساب 🎉");
      setPending((p) => p.filter((x) => x.id !== u.id));
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const rejectTeacher = async () => {
    if (!rejecting) return;
    try {
      await api.post(`/admin/users/${rejecting.id}/reject-teacher`, { reason });
      toast.success("تم رفض الطلب");
      setRejecting(null); setReason("");
      setPending((p) => p.filter((x) => x.id !== rejecting.id));
    } catch (e) { toast.error(apiErr(e)); }
  };

  const createAccount = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("الاسم والبريد الإلكتروني مطلوبان"); return; }
    if (form.password.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setBusy(true);
    try {
      await api.post("/admin/users", {
        name: form.name.trim(), email: form.email.trim(),
        password: form.password, role: form.role, permissions: form.permissions,
      });
      toast.success("تم إنشاء الحساب بنجاح");
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "custom", permissions: [] });
      load();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const savePerms = async () => {
    if (!permEdit) return;
    try {
      await api.put(`/admin/users/${permEdit.user.id}/permissions`, { permissions: permEdit.permissions });
      toast.success("تم حفظ الصلاحيات");
      setPermEdit(null);
      load();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const roleBaseCount = (r) => catalog?.roles?.find((x) => x.key === r)?.permissions.length ?? 0;

  return (
    <div>
      {/* pending teacher approvals */}
      {canApproveTeachers && pending.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5" /> طلبات حسابات المعلمين بانتظار الموافقة ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="bg-white rounded-xl border border-amber-100 px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <div className="font-medium text-slate-800">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email} · {u.school_name || "بدون مدرسة"} · {fmtDate(u.created_at)}</div>
                </div>
                <Button size="sm" onClick={() => approveTeacher(u)} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white min-h-[40px]">
                  <Check className="w-4 h-4 ml-1" /> موافقة
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(u)} className="rounded-lg text-rose-600 min-h-[40px]">
                  <X className="w-4 h-4 ml-1" /> رفض
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input data-testid="user-search" value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="ابحث بالاسم أو البريد…" className="rounded-xl flex-1 min-w-[180px]" />
        <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الأدوار</SelectItem>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
            <UserPlus className="w-4 h-4 ml-1.5" /> حساب جديد
          </Button>
        )}
      </div>

      {!data ? <PageLoader /> : (
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-x-auto">
          {data.items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 flex-wrap min-w-0">
              <div className="flex-1 min-w-[160px]">
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  {u.name}
                  {u.status === "pending_approval" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">بانتظار الموافقة</span>}
                  {u.status === "rejected" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">مرفوض</span>}
                </div>
                <div className="text-xs text-slate-400">{u.email} · {u.school_name || "—"}</div>
              </div>
              {hasPerm("role.manage") ? (
                <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v)}>
                  <SelectTrigger data-testid={`role-select-${u.id}`} className="w-36 h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              ) : <span className="text-xs px-2 py-1 rounded bg-slate-100">{roleLabel(u.role)}</span>}
              {canEditPerms && (
                <Button size="sm" variant="ghost" title="تعديل الصلاحيات"
                        onClick={() => setPermEdit({ user: u, permissions: [...(u.extra_permissions || [])] })}
                        className="rounded-lg text-slate-500 min-h-[36px]">
                  <KeyRound className="w-4 h-4" />
                </Button>
              )}
              {hasPerm("user.manage") && (u.status === "banned"
                ? <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "active")} className="rounded-lg text-emerald-600">تفعيل</Button>
                : <Button size="sm" variant="outline" data-testid={`ban-${u.id}`} onClick={() => setStatus(u.id, "banned")} className="rounded-lg text-rose-600">حظر</Button>)}
              {canDelete && (
                <Button size="sm" variant="ghost" title="حذف الحساب" onClick={() => deleteUser(u)}
                        className="rounded-lg text-rose-400 hover:text-rose-600 min-h-[36px]">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* create account dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> إنشاء حساب جديد</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>الاسم الكامل *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 rounded-xl" placeholder="اسم المستخدم" /></div>
              <div><Label>البريد الإلكتروني *</Label><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 rounded-xl" placeholder="user@mail.com" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>كلمة المرور *</Label><Input type="password" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 rounded-xl" placeholder="6 أحرف على الأقل" /></div>
              <div>
                <Label>الدور</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {catalog ? (
              <div>
                <Label className="mb-1 block">
                  {form.role === "custom"
                    ? "صلاحيات الحساب — هذا الدور يبدأ من الصفر، فكل ما تحدده هنا هو كل ما يستطيع الحساب فعله"
                    : `صلاحيات إضافية فوق صلاحيات دور «${roleLabel(form.role)}» الأساسية (${roleBaseCount(form.role)} صلاحية)`}
                </Label>
                <div className="mt-1.5">
                  <PermissionPicker groups={catalog.groups} labels={catalog.labels}
                                    value={form.permissions}
                                    onChange={(p) => setForm({ ...form, permissions: p })} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">جاري تحميل دليل الصلاحيات…</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="min-h-[44px]">إلغاء</Button>
            <Button onClick={createAccount} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
              {busy ? "جاري الإنشاء…" : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit permissions dialog */}
      <Dialog open={!!permEdit} onOpenChange={(o) => !o && setPermEdit(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> صلاحيات «{permEdit?.user.name}»</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            الدور: <b>{roleLabel(permEdit?.user.role)}</b>
            {permEdit?.user.role === "custom"
              ? " — هذه القائمة هي كل صلاحيات الحساب."
              : ` (${roleBaseCount(permEdit?.user.role)} صلاحية أساسية) — ما تحدده هنا يُضاف فوقها.`}
          </p>
          {catalog ? (
            <PermissionPicker groups={catalog.groups} labels={catalog.labels}
                              value={permEdit?.permissions || []}
                              onChange={(p) => setPermEdit({ ...permEdit, permissions: p })} />
          ) : <p className="text-xs text-slate-400">جاري تحميل دليل الصلاحيات…</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermEdit(null)} className="min-h-[44px]">إلغاء</Button>
            <Button onClick={savePerms} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">حفظ الصلاحيات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* reject teacher dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>رفض طلب «{rejecting?.name}»</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-slate-500">سيظهر سبب الرفض للمعلم عند محاولته تسجيل الدخول.</p>
            <div><Label>سبب الرفض</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 rounded-xl" placeholder="مثال: يرجى التسجيل بالبريد المدرسي الرسمي" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} className="min-h-[44px]">تراجع</Button>
            <Button onClick={rejectTeacher} className="bg-rose-600 hover:bg-rose-700 text-white min-h-[44px]">تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
