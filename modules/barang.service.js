/**
 * modules/barang.service.js — Business logic untuk entitas Barang.
 * Tidak boleh menyentuh DOM. Return data, bukan HTML.
 */

import * as DB   from '../core/db.js';
import * as Sync from '../core/sync.js';
import { uid }   from '../core/utils.js';

export function getAll()      { return DB.barang(); }
export function getById(id)   { return DB.barang().find(b => b.id === id) ?? null; }

export function add(fields) {
  const item = { id: uid(), ...fields };
  DB.getDB().barang.unshift(item);
  DB.save();
  DB.queueSync('add_barang', item);
  Sync.attemptSync();
  return item;
}

export function update(id, fields) {
  const db  = DB.getDB();
  const idx = db.barang.findIndex(b => b.id === id);
  if (idx < 0) return null;
  const updated = { ...db.barang[idx], ...fields };
  db.barang[idx] = updated;
  DB.save();
  DB.queueSync('update_barang', updated);
  Sync.attemptSync();
  return updated;
}

export function remove(id) {
  const db = DB.getDB();
  db.barang = db.barang.filter(b => b.id !== id);
  DB.save();
  DB.queueSync('delete_barang', { id });
  Sync.attemptSync();
}

/** Kurangi stok sejumlah qty. Return false jika stok tidak cukup. */
export function deductStock(id, qty) {
  const b = getById(id);
  if (!b || b.stok < qty) return false;
  update(id, { stok: b.stok - qty });
  return true;
}

export function search(query, filter) {
  const s = DB.settings();
  return DB.barang().filter(b => {
    const matchQ = !query || b.nama.toLowerCase().includes(query.toLowerCase());
    const matchF =
      filter === 'semua' ? true :
      filter === 'ok'    ? b.stok > s.stok_min :
      filter === 'low'   ? b.stok > 0 && b.stok <= s.stok_min :
      filter === 'habis' ? b.stok === 0 :
      b.kategori === filter;
    return matchQ && matchF;
  });
}
