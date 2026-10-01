import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { apiErr } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

const STATUS_STYLES = {
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
  rejected: "text-red-700 bg-red-50 border-red-200",
  none: "text-slate-600 bg-slate-100 border-slate-200",
};

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Teacher application status checker
  const [showStatus, setShowStatus] = useState(false);
  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data && data.just_approved) {
        toast.success("تمت الموافقة على حسابك كمعلم 🎉 أهلاً بك في مفكري المستقبل!");
        try { await api.post("/auth/ack-approval-notice"); } catch {}
      } else {
        toast.success("مرحباً بعودتك!");
      }
      nav("/dashboard");
    } catch (err) {
      toast.error(apiErr(err));
    } finally { setLoading(false); }
  };

  const checkStatus = async () => {
    if (!statusEmail.trim()) { toast.error("أدخل البريد الإلكتروني أولاً"); return; }
    setStatusLoading(true);
    try {
      const { data } = await api.get("/auth/teacher-application-status", { params: { email: statusEmail.trim() } });
      setStatusResult(data);
    } catch {
      setStatusResult({ status: "none", message: "تعذر التحقق الآن، حاول لاحقاً" });
    } finally { setStatusLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex ft-navy-gradient grain relative flex-col justify-between p-12 text-white overflow-hidden">
        <Link to="/"><Logo dark /></Link>
        <div className="relative z-10">
          <h1 className="font-head text-4xl font-extrabold leading-tight">أهلاً بك مجدداً في<br /><span className="text-emerald-400">مفكري المستقبل</span></h1>
          <p className="mt-4 text-slate-300 max-w-md">تابع رحلتك المعرفية، واصل القراءة، تحدَّ زملاءك، وتصدّر قوائم الصدارة الوطنية.</p>
        </div>
        <div className="text-slate-400 text-sm">المملكة الأردنية الهاشمية</div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo /></Link></div>
          <h2 className="font-head text-2xl font-bold text-slate-900">تسجيل الدخول</h2>
          <p className="text-slate-500 text-sm mt-1">ادخل بياناتك للوصول إلى حسابك</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 rounded-xl" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 rounded-xl" placeholder="••••••••" />
            </div>
            <Button type="submit" data-testid="login-submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "دخول"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link to="/register" data-testid="go-register-link" className="text-emerald-600 font-medium">أنشئ حساباً</Link></p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => setShowStatus((s) => !s)}
              className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
            >
              <span>قدمت طلب حساب معلم؟ تحقق من حالة طلبك</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showStatus ? "rotate-180" : ""}`} />
            </button>
            {showStatus && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={statusEmail}
                    onChange={(e) => setStatusEmail(e.target.value)}
                    placeholder="البريد الإلكتروني للطلب"
                    className="rounded-xl bg-white"
                  />
                  <Button type="button" onClick={checkStatus} disabled={statusLoading} className="rounded-xl shrink-0">
                    {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحقق"}
                  </Button>
                </div>
                {statusResult && (
                  <p className={`mt-3 text-sm rounded-xl border px-3 py-2 ${STATUS_STYLES[statusResult.status] || STATUS_STYLES.none}`}>
                    {statusResult.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
