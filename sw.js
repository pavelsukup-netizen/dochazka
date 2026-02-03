const CACHE_NAME = "merch-log-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith("merch-log-") && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isIndex =
    url.pathname.endsWith("/dochazka/") ||
    url.pathname.endsWith("/dochazka/index.html");

  event.respondWith((async () => {
    // Index: network-first kvůli update
    if (isIndex) {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || new Response("Offline", { status: 200 });
      }
    }

    // ostatní: cache-first
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const resp = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, resp.clone());
      return resp;
    } catch {
      return (await caches.match("./index.html")) || new Response("Offline", { status: 200 });
    }
  })());
});
