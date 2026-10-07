import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { initFontScale } from "@/lib/fontscale";

initFontScale();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// Register the PWA service worker (production only)
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  // When a NEW service worker takes control (fresh deploy), reload once so
  // nobody stays stuck on a stale app shell / endless spinner.
  let swReloaded = false;
  try { swReloaded = !!sessionStorage.getItem("ft-sw-reloaded"); } catch {}
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swReloaded) return;
    swReloaded = true;
    try { sessionStorage.setItem("ft-sw-reloaded", "1"); } catch {}
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
