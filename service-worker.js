const CACHE_NAME = "verakai-shell-v1";
const CACHE_PREFIX = "verakai-shell-";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./offline.html",
  "./icons/verakai-192.png",
  "./icons/verakai-512.png",
  "./icons/verakai-maskable-512.png",
  "./icons/apple-touch-icon-180.png"
];

function isPostHogRequest(url) {
  return url.hostname.includes("posthog") || url.pathname.startsWith("/e/");
}

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async (asset) => {
    try {
      const response = await fetch(asset, { cache: "no-cache" });
      if (response.ok) await cache.put(asset, response.clone());
    } catch {
      // A missing optional asset must not prevent installation.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("./index.html")) || (await cache.match("./offline.html"));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || isPostHogRequest(url)) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
