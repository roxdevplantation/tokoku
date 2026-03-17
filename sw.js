const CACHE_NAME = 'tokoku-v4';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/core/db.js',
  '/core/utils.js',
  '/core/sync.js',
  '/core/router.js',
  '/components/ui.js',
  '/components/html.js',
  '/components/scanner.js',
  '/modules/barang.service.js',
  '/modules/transaksi.service.js',
  '/modules/seed.js',
  '/pages/dashboard.js',
  '/pages/barang.js',
  '/pages/transaksi.js',
  '/pages/piutang.js',
  '/pages/log.js',
  '/pages/settings.js',
];

// ── Install: cache semua file ─────────────────────────────────────────────────

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ── Activate: hapus cache lama ────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
    ])
  );
});

// ── Fetch: Cache-First dengan background update ───────────────────────────────

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        // Update cache di background (stale-while-revalidate)
        const networkFetch = fetch(event.request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        // Kalau ada di cache → langsung return (cepat!)
        // Network fetch jalan di background untuk update cache
        if (cached) return cached;

        // Kalau belum ada di cache → tunggu network
        return networkFetch.then(res => {
          if (res) return res;
          // Fallback ke index.html untuk navigasi SPA
          if (event.request.mode === 'navigate') {
            return cache.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    )
  );
});

// ── Pesan dari app ────────────────────────────────────────────────────────────

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'SYNC_NOW') {
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' }))
    );
  }
});
