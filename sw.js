/* ═══════════════════════════════════════════════════════
   sw.js — TechCalc Pro Service Worker
   Deployment: bash deploy.sh ersetzt BUILD_TS automatisch
═══════════════════════════════════════════════════════ */
'use strict';

const BUILD_TS   = '20260430-clean';
const CACHE_NAME = `techcalc-${BUILD_TS}`;

const BASE = '/BETA-Phase/';
const PRECACHE = [
  BASE, BASE + 'index.html',
  BASE + 'tokens.css', BASE + 'layout.css', BASE + 'components.css', BASE + 'style.css',
  BASE + 'app.js', BASE + 'pipe.js', BASE + 'units.js',
  BASE + 'heating-cooling.js', BASE + 'ventilation.js',
  BASE + 'wrg-mischluft.js', BASE + 'trinkwasser.js',
  BASE + 'mag.js', BASE + 'entwaesserung.js',
  BASE + 'pdf-export.js', BASE + 'hx-engine.js',
  BASE + 'manifest.json', BASE + 'favicon.ico', BASE + 'apple-touch-icon.png',
];

const BYPASS = ['workers.dev', 'analytics', 'cloudflare'];

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
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;
  if (BYPASS.some(b => url.hostname.includes(b))) return;

  event.respondWith((async () => {
    const cache  = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request).then(response => {
      if (response && response.status === 200 && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);

    if (cached) { network.catch(() => null); return cached; }
    const fresh = await network;
    if (fresh) return fresh;
    if (request.mode === 'navigate') return cache.match(BASE + 'index.html');
    return new Response('', { status: 408, statusText: 'Offline cache miss' });
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
