import { useCallback, useEffect, useState } from "react";

/* Shared PWA install state · one global beforeinstallprompt listener so the
   floating banner and the Settings card never compete for the prompt. */

let deferredPrompt = null;
let installedFlag = false;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      window.matchMedia?.("(display-mode: minimal-ui)").matches ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

if (typeof window !== "undefined" && !window.__ftPwaInit) {
  window.__ftPwaInit = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installedFlag = true;
    deferredPrompt = null;
    notify();
  });
}

export function usePwaInstall() {
  const [standalone, setStandalone] = useState(() => isStandalone());
  const [canInstall, setCanInstall] = useState(() => !!deferredPrompt);
  const [installed, setInstalled] = useState(() => installedFlag || isStandalone());

  useEffect(() => {
    const update = () => {
      setStandalone(isStandalone());
      setCanInstall(!!deferredPrompt);
      setInstalled(installedFlag || isStandalone());
    };
    listeners.add(update);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", update);
    window.addEventListener("appinstalled", update);
    update();
    return () => {
      listeners.delete(update);
      mq?.removeEventListener?.("change", update);
      window.removeEventListener("appinstalled", update);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return { outcome: "unavailable" };
    const prompt = deferredPrompt;
    deferredPrompt = null;
    setCanInstall(false);
    notify();
    prompt.prompt();
    try {
      return (await prompt.userChoice) || { outcome: "dismissed" };
    } catch {
      return { outcome: "dismissed" };
    }
  }, []);

  return {
    standalone,
    installed,
    canInstall,
    install,
    isIos: isIos(),
    isAndroid: isAndroid(),
  };
}
