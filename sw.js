// Minimal offline shell (§15 Phase 7). Same-origin GET assets are cached
// stale-while-revalidate so the app boots offline after the first visit. The
// events payload and map tiles are left to the network — when they're
// unreachable, the app shows its error/empty state (§9), never a dead spinner.

const CACHE = 'signal-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Don't cache live data or cross-origin tiles/fonts — those need the network.
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.endsWith('/events.json')
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
