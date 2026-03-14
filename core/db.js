const DB_KEY      = 'tokoku_db';
const PENDING_KEY = 'tokoku_pending';

const DEFAULT_DB = {
  barang:    [],
  transaksi: [],
  piutang:   [],
  omzet_log: [],
  kategori:  ['Makanan', 'Minuman', 'Sembako', 'Elektronik', 'Lainnya'],
  settings:  { toko: 'TokoKu', stok_min: 5 },
};

let _db      = structuredClone(DEFAULT_DB);
let _pending = [];

export function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) _db = { ...DEFAULT_DB, ...JSON.parse(raw) };
    if (!Array.isArray(_db.omzet_log)) _db.omzet_log = [];
  } catch {}
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) _pending = JSON.parse(raw);
  } catch { _pending = []; }
}

export function getDB()      { return _db; }
export function getPending() { return _pending; }

export const barang    = () => _db.barang;
export const transaksi = () => _db.transaksi;
export const piutang   = () => _db.piutang;
export const omzetLog  = () => _db.omzet_log;
export const settings  = () => _db.settings;

export function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(_db));
}

export function queueSync(action, data) {
  _pending.push({ action, data, ts: Date.now() });
  localStorage.setItem(PENDING_KEY, JSON.stringify(_pending));
}

export function clearPending() {
  _pending = [];
  localStorage.setItem(PENDING_KEY, '[]');
}
