import axios from "axios";
import { signHeaders, signUrl, setSigKey, clearSigKey } from "@/lib/signing";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

/* Resolve the signable /api path for an axios config (no origin, no query). */
function signablePath(config) {
  let url = String(config?.url || "").split("?")[0];
  if (/^https?:\/\//i.test(url)) {
    try { return new URL(url).pathname; } catch { return url; }
  }
  const base = String(config?.baseURL || API);
  let basePath = base;
  if (/^https?:\/\//i.test(base)) {
    try { basePath = new URL(base).pathname; } catch { basePath = ""; }
  }
  basePath = basePath.replace(/\/$/, "");
  const rel = url.startsWith("/") ? url : `/${url}`;
  return `${basePath}${rel}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ft_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Sign every request (HMAC-SHA256) so scripted API abuse is rejected.
  try {
    const method = (config.method || "get").toUpperCase();
    let bodyStr = "";
    const d = config.data;
    if (typeof d === "string") {
      bodyStr = d;
    } else if (d != null && typeof d === "object") {
      const isForm = typeof FormData !== "undefined" && d instanceof FormData;
      const isBlob = typeof Blob !== "undefined" && d instanceof Blob;
      if (isForm || isBlob || d instanceof ArrayBuffer) {
        bodyStr = ""; // binary/multipart bodies sign with the empty-body hash
      } else {
        // Pin the exact bytes axios will send so the signature matches.
        bodyStr = JSON.stringify(d);
        config.data = bodyStr;
        config.transformRequest = [(x) => x];
        const ct = typeof config.headers?.get === "function"
          ? config.headers.get("Content-Type")
          : config.headers?.["Content-Type"];
        if (!ct) config.headers["Content-Type"] = "application/json";
      }
    }
    const sig = signHeaders(method, signablePath(config), bodyStr);
    config.headers["X-Ft-Ts"] = sig["X-Ft-Ts"];
    config.headers["X-Ft-Nonce"] = sig["X-Ft-Nonce"];
    config.headers["X-Ft-Sig"] = sig["X-Ft-Sig"];
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => {
    // The server rotates a per-session signing key in auth responses.
    try {
      const k = response?.data?.sig_key;
      if (typeof k === "string" && k) setSigKey(k);
    } catch {}
    const contentType = response.headers?.["content-type"] || "";
    if (contentType.includes("text/html")) {
      return Promise.reject(new Error("تعذر الوصول إلى واجهة المنصة. تحقق من مسارات API."));
    }
    return response;
  },
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;
    const url = original?.url || "";
    // Signature rejected (stale/rotated session key): drop the key, fetch a
    // fresh one from /auth/me (signed with the public key), then retry once.
    // The resend passes the request interceptor again, so it is re-signed.
    const sigCode = error?.response?.data?.code;
    if (
      status === 401 &&
      original &&
      !original._sigRetry &&
      typeof sigCode === "string" &&
      sigCode.startsWith("SIG_") &&
      !url.includes("/auth/me")
    ) {
      original._sigRetry = true;
      clearSigKey();
      try { await api.get("/auth/me"); } catch {}
      return api(original);
    }
    // Silent refresh: the access token (7 days) may expire while the
    // refresh cookie (30 days) is still valid. Try the refresh endpoint once,
    // then retry the original request with the new token.
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/register")
    ) {
      original._retry = true;
      try {
        const { data } = await api.post("/auth/refresh");
        if (data?.access_token) {
          localStorage.setItem("ft_token", data.access_token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.access_token}`;
        }
        return api(original);
      } catch {
        localStorage.removeItem("ft_token");
      }
    }
    return Promise.reject(error);
  }
);

/* Users only ever see short, friendly Arabic messages. Anything technical
   (tracebacks, axios internals, raw server text) is filtered out here, and
   the FULL real error stays available via errorDetail() for admin reports. */
const TECHY = /(traceback|exception|undefined|is not defined|cannot read prop|node_modules|socket|econn|etimedout|network error|request failed|response status|\.py\b|\.jsx?\b|at object|at async|internal server|objectid|pydantic|validation error|sql|mongo)/i;

const STATUS_MSGS = {
  400: "تعذر تنفيذ الطلب · تحقق من البيانات وحاول مجددًا",
  401: "سجل دخولك أولًا للمتابعة",
  403: "ليس لديك صلاحية لهذا الإجراء",
  404: "العنصر المطلوب غير موجود",
  408: "انتهت مهلة الطلب · حاول مجددًا",
  409: "حدث تعارض · حدّث الصفحة وحاول مجددًا",
  413: "الملف أكبر من الحد المسموح",
  422: "بعض البيانات ناقصة أو غير صحيحة · راجع المدخلات",
  429: "طلبات كثيرة في وقت قصير · انتظر قليلًا وحاول مجددًا",
  500: "حدث خطأ من جهتنا · تم تسجيله وسنعمل على إصلاحه",
  502: "الخادم غير متاح مؤقتًا · حاول بعد قليل",
  503: "الخدمة متوقفة مؤقتًا للصيانة · حاول بعد قليل",
  504: "الخادم تأخر في الرد · حاول مجددًا",
};

export function apiErr(e, fallback = "حدث خطأ ما · حاول مرة أخرى") {
  const res = e?.response;
  if (!res) {
    if (e?.code === "ECONNABORTED") return "انتهت مهلة الاتصال · تحقق من الإنترنت وحاول مجددًا";
    return "تعذر الاتصال بالخادم · تحقق من الإنترنت وحاول مجددًا";
  }
  const d = res.data?.detail;
  let raw = "";
  if (typeof d === "string") raw = d;
  else if (Array.isArray(d)) raw = d.map((x) => x?.msg || "").filter(Boolean).join(" ");
  else if (d?.msg) raw = d.msg;
  // A short human-language backend message (Arabic) is safe to show as-is.
  const hasArabic = /[\u0600-\u06FF]/.test(raw);
  if (raw && hasArabic && raw.length <= 140 && !TECHY.test(raw)) return raw;
  return STATUS_MSGS[res.status] || (res.status >= 500 ? STATUS_MSGS[500] : fallback);
}

export function errorDetail(e) {
  try {
    const parts = [];
    if (e?.config) parts.push(`الطلب: ${(e.config.method || "get").toUpperCase()} ${e.config.baseURL || ""}${e.config.url || ""}`);
    if (e?.response) {
      const data = e.response.data;
      parts.push(`حالة الخادم: ${e.response.status}\n${typeof data === "string" ? data : JSON.stringify(data)}`);
    }
    if (e?.stack) parts.push(String(e.stack));
    else if (e?.message) parts.push(String(e.message));
    return parts.join("\n\n").slice(0, 8000) || "لا تفاصيل";
  } catch { return String(e?.message || e || "خطأ غير معروف"); }
}

export async function reportError({ message, detail, context, source = "manual" }) {
  try {
    await api.post("/errors/report", {
      message: String(message || "خطأ غير معروف").slice(0, 300),
      detail: String(detail || "").slice(0, 20000),
      page: typeof window !== "undefined" ? window.location.pathname : "",
      source,
      context: context || "",
    }, { timeout: 8000 });
    return true;
  } catch { return false; }
}

export const fileUrl = (path) => (!path ? null : (path.startsWith("http") ? path : signUrl(`${API}/files/${path}`)));

export const wsUrl = (path) => {
  const base = (BACKEND_URL || window.location.origin).replace(/^http/, "ws");
  const token = localStorage.getItem("ft_token") || "";
  return `${base}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
};

export default api;
export { API };
