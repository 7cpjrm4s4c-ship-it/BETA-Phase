/* ═══════════════════════════════════════════════════════
   sw.js — TechCalc Pro Service Worker
   Cache-First Strategie mit Netzwerk-Fallback
═══════════════════════════════════════════════════════ */
'use strict';

const BUILD_TS = '20260502-design-system-v3';
const CACHE_NAME = `techcalc-${BUILD_TS}`;

const PRECACHE = [
  'BETA-Phase/', './index.html',
  './tokens.css', './layout.css', './styles.css', './app.css',
  './app.js', './heating-cooling.js', './hx-engine.js', './pdf-export.js',
  './trinkwasser.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // Cache-first strategy
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Try network while serving cache
    const network = fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    if (cached) {
      network.catch(() => null);
      return cached;
    }

    const fresh = await network;
    if (fresh) return fresh;

    // Fallback for navigate requests
    if (request.mode === 'navigate') {
      return cache.match('./index.html');
    }

    return new Response('', { status: 408, statusText: 'Offline' });
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
