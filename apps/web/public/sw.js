// Minimal hand-rolled service worker (no build-time precache manifest — Vite's
// hashed asset filenames change every build, so caching is runtime-driven):
//
// - League data (/data/*.json): network-first, cache fallback. Mirrors the
//   site's own "show last known-good data when a source is unavailable"
//   behavior (see FreshnessBanner) — stay fresh when online, still usable
//   offline with the last synced snapshot.
// - Navigations (the app shell): network-first so a new deploy is picked up
//   immediately when online, falling back to the cached shell offline.
// - Same-origin static assets (hashed JS/CSS/fonts): cache-first — content
//   never changes under a given hashed filename.
const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `fantasy-hub-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `fantasy-hub-data-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== RUNTIME_CACHE && key !== DATA_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/data/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
