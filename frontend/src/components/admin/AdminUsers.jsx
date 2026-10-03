import React, { useEffect, useState } from "react";
import api, { apiErr, fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageLoader } from "@/components/Layout";
import { toast } from "sonner";
import {
  Plus, Trash2, Check, X, Search, KeyRound, UserPlus, Clock, GraduationCap,
  Sparkles, ChevronDown, UploadCloud, ShieldCheck, Ban, RotateCcw, School,
} from "lucide-react";

/* المستخدمون · إدارة الحسابات
   نفس نقاط النهاية والصلاحيات والإجراءات في UsersPanel السابق، بواجهة بطاقات حديثة:
   GET /admin/users (q · role · page · limit) · pending-teachers · permissions
   إنشاء حساب · استيراد CSV · تغيير الدور · الصلاحيات · الحظر · الحذف · موافقة المعلمين */

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
const ROLE_STYLE = {
  student: "bg-sky-50 text-sky-700 border-sky-100",
  teacher: "bg-violet-50 text-violet-700 border-violet-100",
  school_admin: "bg-cyan-50 text-cyan-700 border-cyan-100",
  directorate_admin: "bg-indigo-50 text-indigo-700 border-indigo-100",
  moderator: "bg-amber-50 text-amber-700 border-amber-100",
  admin: "bg-emerald-50 text-emerald-700 border-emerald-100",
  super_admin: "bg-rose-50 text-rose-700 border-rose-100",
  custom: "bg-slate-100 text-slate-600 border-slate-200",
};
const STATUS_META = {
  pending_approval: ["بانتظار الموافقة", "bg-amber-100 text-amber-700"],
  rejected: ["مرفوض", "bg-rose-100 text-rose-700"],
  banned: ["محظور", "bg-rose-100 text-rose-700"],
  suspended: ["موقوف مؤقتاً", "bg-amber-100 text-amber-700"],
};

const fmt = (n) => (n ?? 0).toLocaleString("en-US");
const fmtDate = (iso) => {
  if (!iso) return "·";
  try { return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" }); }
  catch { return "·"; }
};

function Avatar({ user, className = "w-12 h-12 rounded-2xl text-lg" }) {
  const [err, setErr] = useState(false);
  const url = user?.avatar_url;
  const src = url ? (String(url).startsWith("http") ? url : fileUrl(url)) : null;
  if (src && !err) {
    return <img src={src} alt="" onError={() => setErr(true)} className={`${className} object-cover shrink-0 ring-1 ring-slate-100`} />;
  }
  return (
    <span className={`${className} bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center font-head font-bold shrink-0`}>
      {(user?.name || "؟").trim().charAt(0)}
    </span>
  );
}

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
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> محدد: {value.length} صلاحية
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-[11px] font-bold text-rose-500 hover:text-rose-600">مسح الكل</button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto space-y-2 pl-1">
        {groups.map((g) => {
          const shown = g.permissions.filter(
            (p) => !q || norm(labels[p] || p).includes(norm(q)) || norm(p).includes(norm(q)));
          if (!shown.length) return null;
          const onCount = shown.filter((p) => value.includes(p)).length;
          const allOn = onCount === shown.length && shown.length > 0;
          return (
            <div key={g.key} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button type="button" onClick={() => setGroup(shown, !allOn)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allOn ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"}`}>
                  {allOn && <Check className="w-3 h-3" />}
                </span>
                <span className="flex-1 text-right">{g.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${onCount ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-400 border border-slate-200"}`}>{onCount}/{shown.length}</span>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 p-2">
                {shown.map((p) => (
                  <label key={p} className={`flex items-center gap-2 text-[13px] px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${value.includes(p) ? "bg-emerald-50 text-emerald-800 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
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

export default function AdminUsers() {
  const { hasPerm } = useAuth();
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const canApproveTeachers = hasPerm("teacher.approve");
  const canCreate = hasPerm("user.create");
  const canDelete = hasPerm("user.delete");
  const canEditPerms = hasPerm("role.manage");
  const canSeeCatalog = canCreate || canEditPerms;

  const loadPage = async (pg, append) => {
    try {
      const { data } = await api.get("/admin/users", {
        params: { q: q || undefined, role: role || undefined, page: pg, limit: 20 },
      });
      setTotal(data.total ?? (data.items || []).length);
      setPage(pg);
      setItems((prev) => (append && prev ? [...prev, ...(data.items || [])] : (data.items || [])));
    } catch { if (!append) setItems([]); }
  };

  const loadPending = async () => {
    try { const { data } = await api.get("/admin/users/pending-teachers"); setPending(data.items); }
    catch { /* no permission · section stays hidden */ }
  };
  const loadCatalog = async () => {
    try { const { data } = await api.get("/admin/permissions"); setCatalog(data); }
    catch { /* no permission */ }
  };

  useEffect(() => {
    const t = setTimeout(() => loadPage(1, false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role]);
  useEffect(() => {
    if (canApproveTeachers) loadPending();
    if (canSeeCatalog) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => loadPage(1, false);

  const doImport = async () => {
    const rows = csv.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, email, password, grade, school_name] = l.split(",").map((s) => (s || "").trim());
      return { name, email, password: password || undefined, grade: grade ? Number(grade) : undefined, school_name: school_name || undefined };
    }).filter((r) => r.name && r.email);
    if (!rows.length) return toast.error("الصق سطور CSV أولاً");
    setImporting(true); setImportResult(null);
    try {
      const { data } = await api.post("/admin/users/bulk-import", { rows });
      setImportResult(data);
      toast.success(`أُنشئ ${data.created} حساب جديد 🎉`);
      reload();
    } catch (e) { toast.error(apiErr(e)); }
    setImporting(false);
  };

  const setUserRole = async (id, newRole) => {
    try { await api.put(`/admin/users/${id}/role`, { role: newRole }); toast.success("تم تحديث الدور"); reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const setStatus = async (id, status) => {
    try { await api.put(`/admin/users/${id}/status`, { status }); toast.success("تم"); reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };
  const deleteUser = async (u) => {
    if (!window.confirm(`حذف حساب «${u.name}» نهائياً؟ لا يمكن التراجع عن هذا.`)) return;
    try { await api.delete(`/admin/users/${u.id}`); toast.success("تم حذف الحساب"); reload(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const approveTeacher = async (u) => {
    if (!window.confirm(`الموافقة على حساب المعلم «${u.name}» وتفعيله؟ سيصله إشعار بالموافقة.`)) return;
    try {
      await api.post(`/admin/users/${u.id}/approve-teacher`);
      toast.success("تمت الموافقة وتفعيل الحساب 🎉");
      setPending((p) => p.filter((x) => x.id !== u.id));
      reload();
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
      reload();
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const savePerms = async () => {
    if (!permEdit) return;
    try {
      await api.put(`/admin/users/${permEdit.user.id}/permissions`, { permissions: permEdit.permissions });
      toast.success("تم حفظ الصلاحيات");
      setPermEdit(null);
      reload();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const roleBaseCount = (r) => catalog?.roles?.find((x) => x.key === r)?.permissions.length ?? 0;

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-head font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-emerald-600 text-white grid place-items-center"><GraduationCap className="w-5 h-5" /></span>
            المستخدمون
            {total > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{fmt(total)} حساب</span>}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">إدارة الحسابات والأدوار والصلاحيات وحالات التفعيل من مكان واحد.</p>
        </div>
      </div>

      {/* pending teacher approvals */}
      {canApproveTeachers && pending.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-l from-amber-50 via-white to-white p-4 sm:p-5 ft-shadow">
          <h3 className="font-head font-bold text-amber-900 flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-xl bg-amber-400/90 text-white grid place-items-center"><Clock className="w-4.5 h-4.5" /></span>
            طلبات حسابات المعلمين بانتظار الموافقة
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{pending.length}</span>
          </h3>
          <div className="grid gap-2.5">
            {pending.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl border border-amber-100 px-4 py-3 flex items-center gap-3 flex-wrap ft-shadow">
                <Avatar user={u} className="w-11 h-11 rounded-2xl text-base" />
                <div className="flex-1 min-w-[160px]">
                  <div className="font-bold text-slate-800 text-sm">{u.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span dir="ltr" className="inline-block">{u.email}</span>
                    <span className="inline-flex items-center gap-1"><School className="w-3 h-3" />{u.school_name || "بدون مدرسة"}</span>
                    <span>{fmtDate(u.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveTeacher(u)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-4 font-bold">
                    <Check className="w-4 h-4 ml-1" /> موافقة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(u)} className="rounded-xl text-rose-600 min-h-[44px] px-4 font-bold">
                    <X className="w-4 h-4 ml-1" /> رفض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-3.5 flex gap-2.5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input data-testid="user-search" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="ابحث بالاسم أو البريد…"
                 className="rounded-2xl pr-10 min-h-[48px] border-slate-200 bg-slate-50 focus:bg-white" />
        </div>
        <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 rounded-2xl min-h-[48px]"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الأدوار</SelectItem>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-5 font-bold">
            <UserPlus className="w-4 h-4 ml-1.5" /> حساب جديد
          </Button>
        )}
        {canCreate && (
          <Button variant="outline" onClick={() => setImportOpen((v) => !v)} className="rounded-2xl min-h-[48px] px-4 font-bold">
            <UploadCloud className="w-4 h-4 ml-1.5" /> استيراد جماعي
          </Button>
        )}
      </div>

      {importOpen && (
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow p-5">
          <h3 className="font-head font-bold text-slate-800 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-emerald-600" /> استيراد طلاب (CSV)</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">كل سطر: الاسم، البريد، كلمة المرور (اختياري · افتراضي Student123!)، الصف، اسم المدرسة. تُتخطى الحسابات الموجودة مسبقاً.</p>
          <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} dir="ltr" spellCheck={false}
            placeholder={"سارة أحمد, sara@school.jo, , 9, مدرسة الأمير حسن\nمحمد علي, mohammad@school.jo, Pass1234, 8, "}
            className="rounded-2xl font-mono text-xs mt-3" />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Button onClick={doImport} disabled={importing} className="rounded-xl bg-slate-900 text-white min-h-[44px] px-5 font-bold">
              {importing ? "يستورد…" : "ابدأ الاستيراد"}
            </Button>
            {importResult && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
                أُنشئ {importResult.created} حساب{importResult.skipped?.length ? ` · تُخطي ${importResult.skipped.length} (${importResult.skipped.map((s) => s.email).slice(0, 3).join("، ")}…)` : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* users list */}
      {items === null ? <PageLoader /> : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 ft-shadow py-14 text-center">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-50 grid place-items-center text-slate-300 mb-3"><Search className="w-7 h-7" /></div>
          <p className="font-head font-bold text-slate-600">لا حسابات مطابقة</p>
          <p className="text-xs text-slate-400 mt-1">جرّب تعديل كلمة البحث أو تصفية الدور.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((u) => {
            const st = STATUS_META[u.status];
            return (
              <div key={u.id} className="bg-white rounded-3xl border border-slate-100 ft-shadow px-4 py-3.5 flex items-center gap-3.5 flex-wrap hover-lift">
                <Avatar user={u} />
                <div className="flex-1 min-w-[180px]">
                  <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                    {u.name}
                    {st && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st[1]}`}>{st[0]}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                    <span dir="ltr" className="inline-block">{u.email}</span>
                    {u.school_name && <span className="inline-flex items-center gap-1"><School className="w-3 h-3" />{u.school_name}</span>}
                    <span>{fmtDate(u.created_at)}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ROLE_STYLE[u.role] || ROLE_STYLE.custom}`}>{roleLabel(u.role)}</span>
                    {u.xp != null && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-100 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />{fmt(u.xp)} XP</span>}
                    {u.level != null && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">المستوى {u.level}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasPerm("role.manage") ? (
                    <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v)}>
                      <SelectTrigger data-testid={`role-select-${u.id}`} className="w-36 h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : null}
                  {canEditPerms && (
                    <Button size="sm" variant="ghost" title="تعديل الصلاحيات"
                            onClick={() => setPermEdit({ user: u, permissions: [...(u.extra_permissions || [])] })}
                            className="rounded-xl text-slate-500 min-h-[40px] min-w-[40px]">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  )}
                  {hasPerm("user.manage") && (u.status === "banned"
                    ? <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "active")} className="rounded-xl text-emerald-600 min-h-[40px] font-bold"><RotateCcw className="w-3.5 h-3.5 ml-1" />تفعيل</Button>
                    : <Button size="sm" variant="outline" data-testid={`ban-${u.id}`} onClick={() => setStatus(u.id, "banned")} className="rounded-xl text-rose-600 min-h-[40px] font-bold"><Ban className="w-3.5 h-3.5 ml-1" />حظر</Button>)}
                  {canDelete && (
                    <Button size="sm" variant="ghost" title="حذف الحساب" onClick={() => deleteUser(u)}
                            className="rounded-xl text-rose-400 hover:text-rose-600 min-h-[40px] min-w-[40px]">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {items.length < total && (
            <button
              onClick={async () => { setLoadingMore(true); await loadPage(page + 1, true); setLoadingMore(false); }}
              disabled={loadingMore}
              className="pressable w-full min-h-[48px] rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <ChevronDown className="w-4 h-4" />
              {loadingMore ? "جارٍ التحميل…" : `عرض المزيد · أُظهر ${fmt(items.length)} من ${fmt(total)}`}
            </button>
          )}
        </div>
      )}

      {/* create account dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
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
                    ? "صلاحيات الحساب · هذا الدور يبدأ من الصفر، فكل ما تحدده هنا هو كل ما يستطيع الحساب فعله"
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
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="min-h-[44px] rounded-xl">إلغاء</Button>
            <Button onClick={createAccount} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl font-bold">
              {busy ? "جاري الإنشاء…" : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit permissions dialog */}
      <Dialog open={!!permEdit} onOpenChange={(o) => !o && setPermEdit(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> صلاحيات «{permEdit?.user.name}»</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            الدور: <b>{roleLabel(permEdit?.user.role)}</b>
            {permEdit?.user.role === "custom"
              ? " · هذه القائمة هي كل صلاحيات الحساب."
              : ` (${roleBaseCount(permEdit?.user.role)} صلاحية أساسية) · ما تحدده هنا يُضاف فوقها.`}
          </p>
          {catalog ? (
            <PermissionPicker groups={catalog.groups} labels={catalog.labels}
                              value={permEdit?.permissions || []}
                              onChange={(p) => setPermEdit({ ...permEdit, permissions: p })} />
          ) : <p className="text-xs text-slate-400">جاري تحميل دليل الصلاحيات…</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermEdit(null)} className="min-h-[44px] rounded-xl">إلغاء</Button>
            <Button onClick={savePerms} className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl font-bold">حفظ الصلاحيات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* reject teacher dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent dir="rtl" className="rounded-3xl">
          <DialogHeader><DialogTitle>رفض طلب «{rejecting?.name}»</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-slate-500">سيظهر سبب الرفض للمعلم عند محاولته تسجيل الدخول.</p>
            <div><Label>سبب الرفض</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 rounded-xl" placeholder="مثال: يرجى التسجيل بالبريد المدرسي الرسمي" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} className="min-h-[44px] rounded-xl">تراجع</Button>
            <Button onClick={rejectTeacher} className="bg-rose-600 hover:bg-rose-700 text-white min-h-[44px] rounded-xl font-bold">تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
