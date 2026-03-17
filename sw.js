/**
 * sw.js — Service Worker dengan strategi auto-update.
 *
 * Cara kerja:
 * - Saat online: ambil dari network dulu (selalu dapat versi terbaru),
 *   simpan ke cache sebagai fallback offline.
 * - Saat offline: pakai cache.
 * - Saat ada SW baru (setelah push ke GitHub): langsung aktif tanpa perlu
 *   user tutup & buka ulang aplikasi.
 */

// Ganti versi ini setiap kali push perubahan besar — opsional,
// karena network-first sudah otomatis ambil file terbaru.
const CACHE_NAME = 'tokoku-v4';

// File-file yang di-precache saat install pertama kali
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
  '/modules/barang.service.js',
  '/modules/transaksi.service.js',
  '/modules/seed.js',
  '/pages/dashboard.js',
  '/pages/barang.js',
  '/pages/transaksi.js',
  '/pages/piutang.js',
  '/pages/log.js',
];

// ── Install: cache semua file ─────────────────────────────────────────────────

self.addEventListener('install', event => {
  // skipWaiting: SW baru langsung aktif tanpa tunggu tab lama ditutup
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ── Activate: hapus cache lama ────────────────────────────────────────────────

self.addEventListener('activate', event => {
  // clients.claim: SW baru langsung kontrol semua tab yang sudah terbuka
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Hapus cache versi lama
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
// ── Pesan dari app untuk trigger sync ────────────────────────────────────────

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'SYNC_NOW') {
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' }))
    );
  }
});
