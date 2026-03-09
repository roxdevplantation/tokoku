/**
 * core/sync.js — Online/offline detection & Google Sheets sync engine.
 * Bertanggung jawab atas satu hal: mengirim data ke Sheets saat ada internet.
 */

import * as DB from './db.js';

const GS_URL_KEY    = 'gs_url';
const GS_SECRET_KEY = 'gs_secret';

// ── internal state ──────────────────────────────────────────────────────────
let _isSyncing = false;
let _callbacks = { statusChange: [] };

// ── public API ──────────────────────────────────────────────────────────────

/** Daftarkan callback untuk perubahan status (online/offline/syncing). */
export function onStatusChange(fn) {
  _callbacks.statusChange.push(fn);
}

export function isOnline() { return navigator.onLine; }

export function getConfig() {
  return {
    url:    localStorage.getItem(GS_URL_KEY)    || '',
    secret: localStorage.getItem(GS_SECRET_KEY) || '',
  };
}

export function saveConfig(url, secret) {
  localStorage.setItem(GS_URL_KEY, url);
  localStorage.setItem(GS_SECRET_KEY, secret);
}

/** Inisialisasi listener. Panggil sekali saat app start. */
export function init() {
  window.addEventListener('online',  _handleOnline);
  window.addEventListener('offline', _handleOffline);
  _emit('statusChange', _getStatus());
}

export function destroy() {
  window.removeEventListener('online',  _handleOnline);
  window.removeEventListener('offline', _handleOffline);
}

/**
 * Coba sync semua pending operation ke Google Sheets.
 * Idempoten — aman dipanggil berkali-kali.
 */
export async function attemptSync() {
  const cfg = getConfig();
  if (!cfg.url || !isOnline() || _isSyncing) return;

  const pending = DB.getPending();
  if (pending.length === 0) return;

  _isSyncing = true;
  _emit('statusChange', 'syncing');

  try {
    const res = await fetch(cfg.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:    'sync',
        secret:  cfg.secret,
        payload: pending,
        db:      DB.getDB(),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    DB.clearPending();
    _emit('statusChange', 'online');
    return true;
  } catch (err) {
    console.warn('[TokoKu Sync]', err.message);
    _emit('statusChange', 'online');
    return false;
  } finally {
    _isSyncing = false;
  }
}

// ── internal ─────────────────────────────────────────────────────────────────

function _handleOnline()  {
  _emit('statusChange', 'online');
  attemptSync();
}
function _handleOffline() { _emit('statusChange', 'offline'); }

function _getStatus() {
  if (!isOnline()) return 'offline';
  return 'online';
}

function _emit(event, payload) {
  _callbacks[event]?.forEach(fn => fn(payload));
}
