import * as DB from './db.js';

const GS_URL_KEY    = 'gs_url';
const GS_SECRET_KEY = 'gs_secret';

let _isSyncing = false;
let _callbacks = { statusChange: [] };

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

export function init() {
  window.addEventListener('online',  _handleOnline);
  window.addEventListener('offline', _handleOffline);
  _emit('statusChange', _getStatus());
}

export function destroy() {
  window.removeEventListener('online',  _handleOnline);
  window.removeEventListener('offline', _handleOffline);
}

export async function attemptSync() {
  const cfg = getConfig();
  if (!cfg.url || !isOnline() || _isSyncing) return;

  const pending = DB.getPending();
  if (pending.length === 0) return;

  _isSyncing = true;
  _emit('statusChange', 'syncing');

  try {
    await fetch(cfg.url, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:    'sync',
        secret:  cfg.secret,
        payload: pending,
        db:      DB.getDB(),
      }),
    });
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

// ── PULL — ambil data dari Sheets untuk restore ───────────────────────────────

export async function pullFromSheets() {
  const cfg = getConfig();
  if (!cfg.url || !cfg.secret) {
    return { ok: false, error: 'Belum dikonfigurasi' };
  }
  if (!isOnline()) {
    return { ok: false, error: 'Tidak ada koneksi internet' };
  }
  try {
    const url  = `${cfg.url}?secret=${encodeURIComponent(cfg.secret)}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.error ?? 'Gagal' };
    return { ok: true, data: json.data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

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
