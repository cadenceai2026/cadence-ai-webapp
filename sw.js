const CACHE_NAME = 'cadence-ai-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.html',
  '/login.html',
  '/css/landing.css',
  '/css/game.css',
  '/js/main.js',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate strategy for UI assets
  if (event.request.method === 'GET' && !event.request.url.includes('/supabase/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
