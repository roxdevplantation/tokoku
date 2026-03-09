/**
 * core/db.js — Storage layer (localStorage abstraction)
 * Semua baca/tulis data lewat sini. Tidak ada module lain yang boleh
 * akses localStorage langsung.
 */

const DB_KEY     = 'tokoku_db';
const PENDING_KEY = 'tokoku_pending';

const DEFAULT_DB = {
  barang:    [],
  transaksi: [],
  piutang:   [],
  kategori:  ['Makanan', 'Minuman', 'Sembako', 'Elektronik', 'Lainnya'],
  settings:  { toko: 'TokoKu', stok_min: 5 },
};

// ── internal state ──────────────────────────────────────────────────────────
let _db      = structuredClone(DEFAULT_DB);
let _pending = [];         // antrian operasi yang belum di-sync ke Sheets
let _dirty   = false;      // flag: ada perubahan belum di-flush?

// ── public API ──────────────────────────────────────────────────────────────

export function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) _db = { ...DEFAULT_DB, ...JSON.parse(raw) };
  } catch { /* korup → pakai default */ }

  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) _pending = JSON.parse(raw);
  } catch { _pending = []; }
}

export function getDB()      { return _db; }
export function getPending() { return _pending; }

/** Shortcut getters agar caller tidak perlu tulis db.getDB().barang */
export const barang    = () => _db.barang;
export const transaksi = () => _db.transaksi;
export const piutang   = () => _db.piutang;
export const settings  = () => _db.settings;

/** Tulis perubahan ke localStorage. Panggil setelah setiap mutasi. */
export function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(_db));
  _dirty = false;
}

/** Tambahkan operasi ke antrian sync & simpan. */
export function queueSync(action, data) {
  _pending.push({ action, data, ts: Date.now() });
  localStorage.setItem(PENDING_KEY, JSON.stringify(_pending));
}

/** Kosongkan antrian setelah sync berhasil. */
export function clearPending() {
  _pending = [];
  localStorage.setItem(PENDING_KEY, '[]');
}
