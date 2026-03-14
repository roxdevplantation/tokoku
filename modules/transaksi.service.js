<<<<<<< HEAD
=======
/**
 * modules/transaksi.service.js — Business logic untuk Transaksi & Piutang.
 */

>>>>>>> 4514512 (perbaharui)
import * as DB   from '../core/db.js';
import * as Sync from '../core/sync.js';
import { uid }   from '../core/utils.js';

export function getAll()    { return DB.transaksi(); }
export function getById(id) { return DB.transaksi().find(t => t.id === id) ?? null; }

export function create({ pelanggan, items, metode, catatan = '' }) {
  const db = DB.getDB();

  for (const item of items) {
    const b = db.barang.find(x => x.id === item.id);
    if (!b) throw new Error(`Barang "${item.nama}" tidak ditemukan`);
    if (b.stok < item.qty) throw new Error(`Stok "${b.nama}" tidak cukup (tersisa ${b.stok})`);
  }

  for (const item of items) {
    const b = db.barang.find(x => x.id === item.id);
    b.stok -= item.qty;
  }

  const tx = {
    id:        uid(),
    pelanggan: pelanggan || 'Umum',
    items,
    total:     items.reduce((a, i) => a + i.qty * i.harga, 0),
    metode,
    catatan,
    tanggal:   new Date().toISOString(),
    status:    metode === 'cash' ? 'lunas' : 'belum_lunas',
  };

  db.transaksi.push(tx);
  DB.save();
  DB.queueSync('create_tx', tx);
  Sync.attemptSync();

  if (metode === 'credit') addPiutang(tx);
  return tx;
}

export function remove(id) {
  const db = DB.getDB();
  db.transaksi = db.transaksi.filter(t => t.id !== id);
  DB.save();
  DB.queueSync('delete_tx', { id });
  Sync.attemptSync();
}

export function getAllPiutang()    { return DB.piutang(); }
export function getPiutangUnpaid() { return DB.piutang().filter(p => p.status === 'belum_lunas'); }
export function getPiutangPaid()   { return DB.piutang().filter(p => p.status === 'lunas'); }

export function addPiutang(tx) {
  const db  = DB.getDB();
  const key = tx.pelanggan.trim().toLowerCase();

  const existing = db.piutang.find(p =>
    p.status === 'belum_lunas' &&
    p.pelanggan.trim().toLowerCase() === key
  );

  const entry = {
    txId:    tx.id,
    tanggal: tx.tanggal,
    items:   tx.items,
    jumlah:  tx.total,
    catatan: tx.catatan ?? '',
    lunas:   false,
  };

  if (existing) {
    existing.riwayat.push(entry);
    existing.total += tx.total;
    existing.tanggalTerakhir = tx.tanggal;
  } else {
    db.piutang.push({
      id:              uid(),
      pelanggan:       tx.pelanggan.trim(),
      status:          'belum_lunas',
      total:           tx.total,
      tanggalMulai:    tx.tanggal,
      tanggalTerakhir: tx.tanggal,
      riwayat:         [entry],
    });
  }
  DB.save();
}

export function bayar(id) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === id);
  if (!pi) return;

  pi.status = 'lunas';
  pi.total  = 0;
  (pi.riwayat ?? []).forEach(r => {
    r.lunas = true;
    const tx = db.transaksi.find(t => t.id === r.txId);
    if (tx) tx.status = 'lunas';
  });

  DB.save();
  DB.queueSync('bayar_piutang', { id });
  Sync.attemptSync();
}

export function bayarSebagian(piutangId, txId) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === piutangId);
  if (!pi) return;

  const entry = pi.riwayat.find(r => r.txId === txId);
  if (!entry || entry.lunas) return;

  entry.lunas = true;
  pi.total    = Math.max(0, pi.total - entry.jumlah);
  if (pi.total === 0) pi.status = 'lunas';

  const tx = db.transaksi.find(t => t.id === txId);
  if (tx) tx.status = 'lunas';

  DB.save();
  DB.queueSync('bayar_piutang_sebagian', { piutangId, txId });
  Sync.attemptSync();
}

export function updateRiwayat(piutangId, txId, perubahan) {
  const db = DB.getDB();
  const p  = db.piutang.find(x => x.id === piutangId);
  if (!p) return;
  const r  = (p.riwayat ?? []).find(x => x.txId === txId);
  if (!r) return;
  if (perubahan.tanggal !== undefined) r.tanggal = perubahan.tanggal;
  if (perubahan.catatan !== undefined) r.catatan = perubahan.catatan;
  if (perubahan.items   !== undefined) r.items   = perubahan.items;
  if (perubahan.jumlah  !== undefined) r.jumlah  = perubahan.jumlah;
  p.total = (p.riwayat ?? [])
    .filter(x => !x.lunas)
    .reduce((a, x) => a + x.jumlah, 0);
  DB.save();
}

export function hapusRiwayat(piutangId, txId) {
  const db = DB.getDB();
  const p  = db.piutang.find(x => x.id === piutangId);
  if (!p) return;
  p.riwayat = (p.riwayat ?? []).filter(x => x.txId !== txId);
  if (p.riwayat.length === 0) {
    db.piutang = db.piutang.filter(x => x.id !== piutangId);
  } else {
    p.total = p.riwayat.filter(x => !x.lunas).reduce((a, x) => a + x.jumlah, 0);
    if (p.total === 0) p.status = 'lunas';
  }
  DB.save();
}

export function removePiutang(id) {
  const db = DB.getDB();
  db.piutang = db.piutang.filter(p => p.id !== id);
  DB.save();
  DB.queueSync('delete_piutang', { id });
  Sync.attemptSync();
}

export function migratePiutang() {
  const db    = DB.getDB();
  const perlu = db.piutang.some(p => !Array.isArray(p.riwayat));
  if (!perlu) return;

  const sudahBaru = db.piutang.filter(p =>  Array.isArray(p.riwayat));
  const masihLama = db.piutang.filter(p => !Array.isArray(p.riwayat));
  const akunMap   = new Map();

  masihLama.forEach(p => {
    const key = `${(p.pelanggan ?? '').trim().toLowerCase()}__${p.status ?? 'belum_lunas'}`;
    if (!akunMap.has(key)) {
      akunMap.set(key, {
        id:              uid(),
        pelanggan:       (p.pelanggan ?? 'Umum').trim(),
        status:          p.status ?? 'belum_lunas',
        total:           0,
        tanggalMulai:    p.tanggal ?? new Date().toISOString(),
        tanggalTerakhir: p.tanggal ?? new Date().toISOString(),
        riwayat:         [],
      });
    }
    const akun = akunMap.get(key);
    akun.riwayat.push({
      txId:    p.id ?? uid(),
      tanggal: p.tanggal ?? new Date().toISOString(),
      items:   p.items   ?? [],
      jumlah:  p.total   ?? 0,
      catatan: p.catatan ?? '',
      lunas:   p.status === 'lunas',
    });
    if (p.tanggal && p.tanggal > akun.tanggalTerakhir) akun.tanggalTerakhir = p.tanggal;
    if (p.tanggal && p.tanggal < akun.tanggalMulai)    akun.tanggalMulai    = p.tanggal;
  });

  akunMap.forEach(akun => {
    akun.total = akun.riwayat.filter(r => !r.lunas).reduce((a, r) => a + r.jumlah, 0);
    if (akun.total === 0 && akun.riwayat.every(r => r.lunas)) akun.status = 'lunas';
  });

  db.piutang = [...sudahBaru, ...Array.from(akunMap.values())];
  DB.save();
}

export function statsToday() {
  const today   = new Date().toDateString();
  const todayTx = DB.transaksi().filter(t =>
    new Date(t.tanggal).toDateString() === today
  );
  const omzet = todayTx.reduce((a, t) => a + t.total, 0);
  return {
    count:  todayTx.length,
    total:  omzet,
    omzet,
    cash:   todayTx.filter(t => t.metode === 'cash').reduce((a, t) => a + t.total, 0),
    credit: todayTx.filter(t => t.metode === 'credit').reduce((a, t) => a + t.total, 0),
  };
}

export function statsByDay(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
<<<<<<< HEAD
    d.setDate(d.getDate() - (days - 1 - i));
    const ds    = d.toDateString();
=======
 /**
 * modules/transaksi.service.js — Business logic untuk Transaksi & Piutang.
 */

import * as DB   from '../core/db.js';
import * as Sync from '../core/sync.js';
import { uid }   from '../core/utils.js';

export function getAll()    { return DB.transaksi(); }
export function getById(id) { return DB.transaksi().find(t => t.id === id) ?? null; }

export function create({ pelanggan, items, metode, catatan = '' }) {
  const db = DB.getDB();

  // Validasi stok
  for (const item of items) {
    const b = db.barang.find(x => x.id === item.id);
    if (!b) throw new Error(`Barang "${item.nama}" tidak ditemukan`);
    if (b.stok < item.qty) throw new Error(`Stok "${b.nama}" tidak cukup (tersisa ${b.stok})`);
  }

  // Kurangi stok
  for (const item of items) {
    const b = db.barang.find(x => x.id === item.id);
    b.stok -= item.qty;
  }

  const total = items.reduce((a, i) => a + i.qty * i.harga, 0);

  const tx = {
    id:        uid(),
    pelanggan: pelanggan || 'Umum',
    items,
    total,
    metode,
    catatan,
    tanggal:   new Date().toISOString(),
    status:    metode === 'cash' ? 'lunas' : 'belum_lunas',
  };

  db.transaksi.push(tx);

  // ── Catat ke omzet_log (permanen, tidak ikut hapus transaksi) ──────────────
  db.omzet_log.push({
    id:        uid(),
    txId:      tx.id,
    tanggal:   tx.tanggal,
    total,
    metode,
    pelanggan: tx.pelanggan,
  });

  DB.save();
  DB.queueSync('create_tx', tx);
  Sync.attemptSync();

  if (metode === 'credit') addPiutang(tx);
  return tx;
}

/** Hapus transaksi dari list — omzet_log TIDAK tersentuh */
export function remove(id) {
  const db = DB.getDB();
  db.transaksi = db.transaksi.filter(t => t.id !== id);
  DB.save();
  DB.queueSync('delete_tx', { id });
  Sync.attemptSync();
}

/** Hapus satu entri omzet_log — aksi terpisah dari menu dashboard */
export function removeOmzetLog(id) {
  const db = DB.getDB();
  db.omzet_log = db.omzet_log.filter(o => o.id !== id);
  DB.save();
}

/** Hapus semua omzet_log sekaligus (tombol "Bersihkan Semua" di dashboard) */
export function clearOmzetLog() {
  DB.getDB().omzet_log = [];
  DB.save();
}

// ── Piutang ───────────────────────────────────────────────────────────────────

export function getAllPiutang()    { return DB.piutang(); }
export function getPiutangUnpaid() { return DB.piutang().filter(p => p.status === 'belum_lunas'); }
export function getPiutangPaid()   { return DB.piutang().filter(p => p.status === 'lunas'); }

export function addPiutang(tx) {
  const db  = DB.getDB();
  const key = tx.pelanggan.trim().toLowerCase();

  const existing = db.piutang.find(p =>
    p.status === 'belum_lunas' &&
    p.pelanggan.trim().toLowerCase() === key
  );

  const entry = {
    txId:    tx.id,
    tanggal: tx.tanggal,
    items:   tx.items,
    jumlah:  tx.total,
    catatan: tx.catatan ?? '',
    lunas:   false,
  };

  if (existing) {
    existing.riwayat.push(entry);
    existing.total += tx.total;
    existing.tanggalTerakhir = tx.tanggal;
  } else {
    db.piutang.push({
      id:              uid(),
      pelanggan:       tx.pelanggan.trim(),
      status:          'belum_lunas',
      total:           tx.total,
      tanggalMulai:    tx.tanggal,
      tanggalTerakhir: tx.tanggal,
      riwayat:         [entry],
    });
  }
  DB.save();
}

export function bayar(id) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === id);
  if (!pi) return;
  pi.status = 'lunas';
  pi.total  = 0;
  (pi.riwayat ?? []).forEach(r => {
    r.lunas = true;
    const tx = db.transaksi.find(t => t.id === r.txId);
    if (tx) tx.status = 'lunas';
  });
  DB.save();
  DB.queueSync('bayar_piutang', { id });
  Sync.attemptSync();
}

export function bayarSebagian(piutangId, txId) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === piutangId);
  if (!pi) return;
  const entry = pi.riwayat.find(r => r.txId === txId);
  if (!entry || entry.lunas) return;
  entry.lunas = true;
  pi.total    = Math.max(0, pi.total - entry.jumlah);
  if (pi.total === 0) pi.status = 'lunas';
  const tx = db.transaksi.find(t => t.id === txId);
  if (tx) tx.status = 'lunas';
  DB.save();
  DB.queueSync('bayar_piutang_sebagian', { piutangId, txId });
  Sync.attemptSync();
}

export function updateRiwayat(piutangId, txId, perubahan) {
  const db = DB.getDB();
  const p  = db.piutang.find(x => x.id === piutangId);
  if (!p) return;
  const r  = (p.riwayat ?? []).find(x => x.txId === txId);
  if (!r) return;
  if (perubahan.tanggal !== undefined) r.tanggal = perubahan.tanggal;
  if (perubahan.catatan !== undefined) r.catatan = perubahan.catatan;
  if (perubahan.items   !== undefined) r.items   = perubahan.items;
  if (perubahan.jumlah  !== undefined) r.jumlah  = perubahan.jumlah;
  p.total = (p.riwayat ?? [])
    .filter(x => !x.lunas)
    .reduce((a, x) => a + x.jumlah, 0);
  DB.save();
}

export function hapusRiwayat(piutangId, txId) {
  const db = DB.getDB();
  const p  = db.piutang.find(x => x.id === piutangId);
  if (!p) return;
  p.riwayat = (p.riwayat ?? []).filter(x => x.txId !== txId);
  if (p.riwayat.length === 0) {
    db.piutang = db.piutang.filter(x => x.id !== piutangId);
  } else {
    p.total = p.riwayat.filter(x => !x.lunas).reduce((a, x) => a + x.jumlah, 0);
    if (p.total === 0) p.status = 'lunas';
  }
  DB.save();
}

export function removePiutang(id) {
  const db = DB.getDB();
  db.piutang = db.piutang.filter(p => p.id !== id);
  DB.save();
  DB.queueSync('delete_piutang', { id });
  Sync.attemptSync();
}

export function migratePiutang() {
  const db    = DB.getDB();
  const perlu = db.piutang.some(p => !Array.isArray(p.riwayat));
  if (!perlu) return;

  const sudahBaru = db.piutang.filter(p =>  Array.isArray(p.riwayat));
  const masihLama = db.piutang.filter(p => !Array.isArray(p.riwayat));
  const akunMap   = new Map();

  masihLama.forEach(p => {
    const key = `${(p.pelanggan ?? '').trim().toLowerCase()}__${p.status ?? 'belum_lunas'}`;
    if (!akunMap.has(key)) {
      akunMap.set(key, {
        id:              uid(),
        pelanggan:       (p.pelanggan ?? 'Umum').trim(),
        status:          p.status ?? 'belum_lunas',
        total:           0,
        tanggalMulai:    p.tanggal ?? new Date().toISOString(),
        tanggalTerakhir: p.tanggal ?? new Date().toISOString(),
        riwayat:         [],
      });
    }
    const akun = akunMap.get(key);
    akun.riwayat.push({
      txId:    p.id ?? uid(),
      tanggal: p.tanggal ?? new Date().toISOString(),
      items:   p.items   ?? [],
      jumlah:  p.total   ?? 0,
      catatan: p.catatan ?? '',
      lunas:   p.status === 'lunas',
    });
    if (p.tanggal && p.tanggal > akun.tanggalTerakhir) akun.tanggalTerakhir = p.tanggal;
    if (p.tanggal && p.tanggal < akun.tanggalMulai)    akun.tanggalMulai    = p.tanggal;
  });

  akunMap.forEach(akun => {
    akun.total = akun.riwayat.filter(r => !r.lunas).reduce((a, r) => a + r.jumlah, 0);
    if (akun.total === 0 && akun.riwayat.every(r => r.lunas)) akun.status = 'lunas';
  });

  db.piutang = [...sudahBaru, ...Array.from(akunMap.values())];
  DB.save();
}

// ── Stats — baca dari omzet_log, bukan transaksi ──────────────────────────────

export function statsToday() {
  const today = new Date().toDateString();
  const logs  = DB.omzetLog().filter(o =>
    new Date(o.tanggal).toDateString() === today
  );
  const omzet = logs.reduce((a, o) => a + o.total, 0);
  return {
    count:  logs.length,
    total:  omzet,
    omzet,
    cash:   logs.filter(o => o.metode === 'cash').reduce((a, o) => a + o.total, 0),
    credit: logs.filter(o => o.metode === 'credit').reduce((a, o) => a + o.total, 0),
  };
}

export function statsByDay(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d  = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const ds    = d.toDateString();
    const total = DB.omzetLog()
      .filter(o => new Date(o.tanggal).toDateString() === ds)
      .reduce((a, o) => a + o.total, 0);
    return {
      label: d.toLocaleDateString('id-ID', { weekday: 'narrow' }),
      total,
    };
  });
}

export function totalPiutangUnpaid() {
  return getPiutangUnpaid().reduce((a, p) => a + p.total, 0);
}   d.setDate(d.getDate() - (days - 1 - i));
    const ds    = d.toDateString();
>>>>>>> 4514512 (perbaharui)
    const total = DB.transaksi()
      .filter(t => new Date(t.tanggal).toDateString() === ds)
      .reduce((a, t) => a + t.total, 0);
    return {
      label: d.toLocaleDateString('id-ID', { weekday: 'narrow' }),
      total,
    };
  });
}

export function totalPiutangUnpaid() {
  return getPiutangUnpaid().reduce((a, p) => a + p.total, 0);
}
