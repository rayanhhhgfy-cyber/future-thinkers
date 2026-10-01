import api from "@/lib/api";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // granted | denied | default
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getReadyRegistration() {
  // Our app registers /sw.js at the root scope.
  const reg =
    (await navigator.serviceWorker.getRegistration("/")) ||
    (await navigator.serviceWorker.ready);
  return reg;
}

/** Get the existing push subscription or create a new one. Must be called from a user gesture. */
async function getOrCreateSubscription() {
  const { data } = await api.get("/push/vapid-public-key");
  if (!data.publicKey) throw new Error("مفتاح الإشعارات غير مُعد على الخادم");

  const reg = await getReadyRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  return sub;
}

/** Subscribe this device for phone push notifications. Must be called from a user gesture. */
export async function enablePush() {
  if (!isPushSupported()) throw new Error("غير مدعوم على هذا المتصفح");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("تم رفض إذن الإشعارات");

  const sub = await getOrCreateSubscription();
  await api.post("/push/subscribe", { subscription: sub.toJSON() });
  return true;
}

/**
 * Subscribe this device for the teacher-approval push before the account is
 * approved. No login session needed — authorized by the single-purpose token
 * issued at teacher registration.
 */
export async function enablePendingPush(token) {
  if (!isPushSupported()) throw new Error("غير مدعوم على هذا المتصفح");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("تم رفض إذن الإشعارات");

  const sub = await getOrCreateSubscription();
  await api.post("/push/subscribe-pending", { token, subscription: sub.toJSON() });
  return true;
}

/** Remove this device's push subscription. */
export async function disablePush() {
  if (!isPushSupported()) return false;
  try {
    const reg = await getReadyRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try {
        await api.post("/push/unsubscribe", { subscription: sub.toJSON() });
      } catch {}
      await sub.unsubscribe();
    } else {
      await api.post("/push/unsubscribe", { subscription: {} });
    }
  } catch {}
  return false;
}

/** Whether the backend knows at least one device for the current user. */
export async function backendPushEnabled() {
  try {
    const { data } = await api.get("/push/status");
    return !!data.enabled;
  } catch {
    return false;
  }
}
