/* Future Thinkers PWA service worker.
   - Static assets (JS/CSS/images/fonts): cache-first, so the app shell loads instantly.
   - Navigations: network-first with cached-app-shell fallback for offline.
   - /api/* and websockets: never cached, always network. */
const VERSION = "ft-v2";
const STATIC_CACHE = `ft-static-${VERSION}`;
const SHELL_CACHE = `ft-shell-${VERSION}`;

const STATIC_RE = /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|eot|json|webmanifest)$/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("ft-") && k !== STATIC_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // third-party: leave alone
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return; // API: network only

  // Static assets: cache-first
  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      })()
    );
    return;
  }

  // Navigations (SPA routes): network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const res = await fetch(request);
          if (res.ok) cache.put("/index.html", res.clone());
          return res;
        } catch {
          const shell = await cache.match("/index.html");
          return shell || Response.error();
        }
      })()
    );
  }
});

// ---- Web Push: show the notification on the phone ----
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "مفكرو المستقبل", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "مفكرو المستقبل";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || "ft-push",
    renotify: true,
    dir: "rtl",
    lang: "ar",
    data: { link: data.link || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";
  const url = new URL(link, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (w.url === url) return w.focus();
      }
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) return w.navigate(url).then((c) => c && c.focus());
      }
      return clients.openWindow(url);
    })()
  );
});
