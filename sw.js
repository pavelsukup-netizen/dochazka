const CACHE_NAME = "merch-log-v3"; // <-- když uděláš změny, zvedni číslo
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
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
    // smaž staré cache
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

  // Network-first pro index.html (ať update vždycky projde),
  // cache-first pro ostatní soubory.
  const url = new URL(event.request.url);
  const isIndex = url.pathname.endsWith("/dochazka/") || url.pathname.endsWith("/dochazka/index.html");

  event.respondWith((async () => {
    if (isIndex) {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 200 });
      }
    }

    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const resp = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, resp.clone());
      return resp;
    } catch {
      return caches.match("./index.html");
    }
  })());
});
