import axios from "axios";
import {
  signUrl, setSigKey, clearSigKey, getSigKey, getDeviceId,
  signRequestV2, canonicalQuery, signEcDSA, ensureDeviceKey, solvePow, registerDeviceKey,
} from "@/lib/signing";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true, timeout: 20000 });

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

const POW_PATHS = new Set(["/api/auth/login", "/api/auth/register"]);

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("ft_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Sign every request (v2: hour-bucketed HMAC-SHA512 + ECDSA device key)
  // so scripted API abuse is rejected.
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
    const path = signablePath(config);
    const query = canonicalQuery(config.url, config.params);
    const rawCt = typeof config.headers?.get === "function"
      ? config.headers.get("Content-Type")
      : config.headers?.["Content-Type"];
    // Multipart bodies are serialized by the browser with a random boundary,
    // so the signed content type is the bare media type (the server canonical
    // drops parameters the same way).
    const dAny = config.data;
    const contentType = (typeof FormData !== "undefined" && dAny instanceof FormData)
      ? "multipart/form-data"
      : (typeof Blob !== "undefined" && dAny instanceof Blob)
        ? (dAny.type || "")
        : (typeof rawCt === "string" ? rawCt : "");
    const { headers, canonical } = await signRequestV2({
      method, path, query, bodyStr, contentType,
    });
    for (const k of Object.keys(headers)) config.headers[k] = headers[k];
    // Extra proof of work on the credential endpoints.
    if (POW_PATHS.has(path)) {
      const pow = await solvePow(headers["X-Ft-Ts"], getDeviceId(), path);
      if (pow) config.headers["X-Ft-Pow"] = pow;
    }
    // ECDSA device signature on session-signed traffic. When no device key
    // exists yet, kick off generation in the background and send without it.
    if (getSigKey()) {
      const esig = await signEcDSA(canonical);
      if (esig) config.headers["X-Ft-Esig"] = esig;
      else ensureDeviceKey().catch(() => {});
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => {
    // The server rotates a per-session signing key in auth responses.
    try {
      const k = response?.data?.sig_key;
      if (typeof k === "string" && k) {
        setSigKey(k);
        // Bind this device's ECDSA public key to the account (once per key).
        if (!String(response?.config?.url || "").includes("/auth/device-key")) {
          registerDeviceKey((u, body) => api.post(u, body)).catch(() => {});
        }
      }
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
    // Retry bookkeeping in a header: axios clones configs between retries
    // and drops custom props, which once turned this into an endless
    // sign-retry loop on the login request itself (permanent spinner).
    // Headers survive every merge. Auth endpoints never retry at all.
    const AUTH_PATH = /\/auth\/(login|register|refresh|me)(\?|$)/.test(url);
    const retryCount = Number(original?.headers?.["x-ft-retry"] || 0);
    const markRetry = (cfg) => {
      cfg.headers = cfg.headers || {};
      cfg.headers["x-ft-retry"] = String(retryCount + 1);
      return cfg;
    };
    // Signature rejected (stale/rotated session key): drop the key, fetch a
    // fresh one from /auth/me (signed with the public key), then retry once.
    // The resend passes the request interceptor again, so it is re-signed.
    const sigCode = error?.response?.data?.code;
    if (
      status === 401 &&
      original &&
      !AUTH_PATH &&
      retryCount < 1 &&
      typeof sigCode === "string" &&
      sigCode.startsWith("SIG_")
    ) {
      clearSigKey();
      try { await api.get("/auth/me"); } catch {}
      return api(markRetry(original));
    }
    // Silent refresh: the access token (7 days) may expire while the
    // refresh cookie (30 days) is still valid. Try the refresh endpoint once,
    // then retry the original request with the new token.
    if (
      status === 401 &&
      original &&
      !AUTH_PATH &&
      retryCount < 2
    ) {
      try {
        const { data } = await api.post("/auth/refresh");
        if (data?.access_token) {
          localStorage.setItem("ft_token", data.access_token);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.access_token}`;
        }
        return api(markRetry(original));
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
