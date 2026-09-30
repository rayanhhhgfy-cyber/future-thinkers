import React, { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 6) return toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
    if (next !== confirm) return toast.error("تأكيد كلمة المرور غير متطابق");
    setSaving(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(apiErr(err, "تعذر تغيير كلمة المرور"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-head text-2xl font-extrabold text-slate-900 flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-emerald-600" /> إعدادات الحساب
        </h1>

        <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-emerald-600" /> تغيير كلمة المرور
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            {user?.email ? `الحساب: ${user.email}` : "اختر كلمة مرور جديدة لحسابك"}
          </p>
          <form onSubmit={submit} className="space-y-4" data-testid="change-password-form">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className={inputCls}
                  required
                  autoComplete="current-password"
                  data-testid="current-password"
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label="إظهار/إخفاء"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">كلمة المرور الجديدة</label>
              <input
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className={inputCls}
                required
                minLength={6}
                autoComplete="new-password"
                data-testid="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                required
                minLength={6}
                autoComplete="new-password"
                data-testid="confirm-password"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              data-testid="change-password-submit"
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 transition-colors"
            >
              {saving ? "جارٍ الحفظ…" : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
}
