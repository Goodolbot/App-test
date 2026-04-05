const CACHE_NAME = 'pretext-flow-v1';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './sketch.js',
  './manifest.json',
];

// Pre-cache app shell on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Remove old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for external (esm.sh CDN), cache-first for shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
