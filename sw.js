/* ─── Massenstrom PWA – Service Worker ───────────────────────
   Strategie:
   - App Shell (HTML/Icons/Manifest) → Cache First + Update im BG
   - Navigation  → Network First, Fallback auf Cache
   - Alles andere → Cache First
─────────────────────────────────────────────────────────── */
const VERSION   = 'v3';
const CACHE     = `massenstrom-${VERSION}`;
const PRECACHE  = ['/', '/index.html', '/manifest.json', '/icon-192.svg', '/icon-512.svg', '/worker.js'];

/* ─── Install: Precache ───────────────────────────────────── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
});

/* ─── Activate: Purge old caches ─────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch: Cache Strategy ──────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or CDN requests
  if (!['https:', 'http:'].includes(url.protocol)) return;

  // Navigation: Network First → stale cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: Cache First → Network → update cache
  if (PRECACHE.some(p => url.pathname === p || url.pathname.endsWith(p))) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Update in background (Stale-While-Revalidate)
          fetch(request).then(fresh => {
            caches.open(CACHE).then(c => c.put(request, fresh));
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: Network First, cache as fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
