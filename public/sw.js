/**
 * Service worker: push (existente) + PWA segura.
 * — Não cacheia /api/*, checkout Stripe, login nem pedidos sensíveis.
 * — Documentos HTML: rede primeiro; offline → /offline.html
 * — /_next/static/* only: cache-first (assets com hash)
 */

const CORE_CACHE = "pg-pwa-core-v1";
const STATIC_CACHE = "pg-pwa-static-v1";

const PRECACHE_URLS = ["/offline.html"];

/** Rotas que nunca passam por cache (sessão, pagamentos, auth). */
const NETWORK_ONLY_PREFIXES = [
  "/api/",
  "/quiz/checkout",
  "/entrar",
  "/registo",
  "/esqueci-password",
  "/redefinir-password",
  "/onboarding",
];

function isNetworkOnlyPath(pathname) {
  return NETWORK_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pg-pwa-") && key !== CORE_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ——— Push (Web Push) ——— */
self.addEventListener("push", (event) => {
  let data = { title: "Protocolo Gelatina", body: "", tag: "pg-default", url: "/" };
  try {
    const text = event.data?.text();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        data = { ...data, ...parsed };
      }
    }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || "pg-default",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

/* ——— Fetch: apenas GET same-origin; resto deixa o browser ——— */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkOnlyPath(url.pathname)) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.searchParams.has("_rsc")) return;
  if (url.searchParams.has("_nextRouterPrefetch")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(req));
    return;
  }

  const dest = req.headers.get("Sec-Fetch-Dest");
  if (req.mode === "navigate" || dest === "document") {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match("/offline.html");
        return offline || Response.error();
      }),
    );
    return;
  }
});

async function cacheFirstStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}
