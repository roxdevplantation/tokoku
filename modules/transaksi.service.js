/**
 * modules/transaksi.service.js — Business logic untuk Transaksi & Piutang.
 */

import * as DB     from '../core/db.js';
import * as Sync   from '../core/sync.js';
import * as Barang from './barang.service.js';
import { uid }     from '../core/utils.js';

// ── Transaksi ─────────────────────────────────────────────────────────────────

export function getAll()    { return DB.transaksi(); }
export function getById(id) { return DB.transaksi().find(t => t.id === id) ?? null; }

export function create({ pelanggan, items, metode, catatan = '' }) {
  for (const item of items) {
    const ok = Barang.deductStock(item.id, item.qty);
    if (!ok) throw new Error(`Stok ${item.nama} tidak cukup`);
  }

  const total = items.reduce((a, i) => a + i.qty * i.harga, 0);
  const tx = {
    id:        uid(),
    pelanggan: pelanggan || 'Umum',
    tanggal:   new Date().toISOString(),
    items,
    total,
    metode,
    status:    metode === 'cash' ? 'lunas' : 'belum_lunas',
    catatan,
  };

  const db = DB.getDB();
  db.transaksi.push(tx);
  if (metode === 'credit') addPiutang(tx);

  DB.save();
  DB.queueSync('add_transaksi', tx);
  Sync.attemptSync();
  return tx;
}

export function remove(id) {
  const db = DB.getDB();
  db.transaksi = db.transaksi.filter(t => t.id !== id);
  db.piutang   = db.piutang.filter(p => p.id !== id);
  DB.save();
  DB.queueSync('delete_transaksi', { id });
  Sync.attemptSync();
}

// ── Piutang ───────────────────────────────────────────────────────────────────
//
// Model: satu entri per pelanggan (per "akun piutang aktif").
// Struktur:
// {
//   id, pelanggan, status: 'belum_lunas'|'lunas',
//   total,               ← sisa yang belum dibayar
//   tanggalMulai,        ← tanggal kredit pertama di akun ini
//   tanggalTerakhir,     ← tanggal kredit terakhir
//   riwayat: [{
//     txId, tanggal, items, jumlah, catatan, lunas: bool
//   }]
// }

export function getAllPiutang()    { return DB.piutang(); }
export function getPiutangUnpaid() { return DB.piutang().filter(p => p.status === 'belum_lunas'); }
export function getPiutangPaid()   { return DB.piutang().filter(p => p.status === 'lunas'); }

/**
 * Tambah kredit baru ke akun piutang pelanggan.
 * Cari akun AKTIF (belum_lunas) dengan nama sama → akumulasi.
 * Jika tidak ada → buat akun baru.
 *
 * Normalisasi nama: trim + lowercase untuk pencocokan,
 * tapi simpan nama asli dari transaksi pertama.
 */
export function addPiutang(tx) {
  const db         = DB.getDB();
  const namaNormal = _normNama(tx.pelanggan);

  const existing = db.piutang.find(
    p => _normNama(p.pelanggan) === namaNormal && p.status === 'belum_lunas'
  );

  const entryBaru = {
    txId:    tx.id,
    tanggal: tx.tanggal,
    items:   tx.items,
    jumlah:  tx.total,
    catatan: tx.catatan || '',
    lunas:   false,         // ← selalu eksplisit
  };

  if (existing) {
    existing.riwayat.push(entryBaru);
    existing.total           = existing.riwayat
      .filter(r => !r.lunas)
      .reduce((a, r) => a + r.jumlah, 0);
    existing.tanggalTerakhir = tx.tanggal;
  } else {
    db.piutang.push({
      id:              uid(),
      pelanggan:       tx.pelanggan.trim(),
      status:          'belum_lunas',
      total:           tx.total,
      tanggalMulai:    tx.tanggal,
      tanggalTerakhir: tx.tanggal,
      riwayat:         [entryBaru],
    });
  }
  // Tidak perlu DB.save() di sini — caller (create) yang save
}

export function bayar(id) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === id);
  if (!pi) return;
  pi.riwayat.forEach(r => { r.lunas = true; });
  pi.status = 'lunas';
  pi.total  = 0;
  DB.save();
  DB.queueSync('bayar_piutang', { id });
  Sync.attemptSync();
}

export function bayarSebagian(piutangId, txId) {
  const db    = DB.getDB();
  const pi    = db.piutang.find(p => p.id === piutangId);
  if (!pi) return;
  const entry = pi.riwayat.find(r => r.txId === txId);
  if (!entry || entry.lunas) return;
  entry.lunas = true;
  // Hitung ulang total dari riwayat yang belum lunas
  pi.total = pi.riwayat.filter(r => !r.lunas).reduce((a, r) => a + r.jumlah, 0);
  if (pi.total === 0) pi.status = 'lunas';
  DB.save();
  DB.queueSync('bayar_piutang_sebagian', { piutangId, txId });
  Sync.attemptSync();
}

/**
 * Edit satu entri riwayat dalam akun piutang.
 * Field yang bisa diubah: tanggal, jumlah, catatan, items.
 * Total akun dihitung ulang otomatis dari semua riwayat yang belum lunas.
 */
export function updateRiwayat(piutangId, txId, perubahan) {
  const db    = DB.getDB();
  const pi    = db.piutang.find(p => p.id === piutangId);
  if (!pi) return false;

  const entry = pi.riwayat.find(r => r.txId === txId);
  if (!entry) return false;

  // Terapkan perubahan — hanya field yang dikirim
  if (perubahan.tanggal !== undefined) entry.tanggal = perubahan.tanggal;
  if (perubahan.jumlah  !== undefined) entry.jumlah  = perubahan.jumlah;
  if (perubahan.catatan !== undefined) entry.catatan  = perubahan.catatan;
  if (perubahan.items   !== undefined) entry.items    = perubahan.items;

  // Hitung ulang total akun dari riwayat belum lunas
  pi.total = pi.riwayat
    .filter(r => !r.lunas)
    .reduce((a, r) => a + r.jumlah, 0);

  // Update tanggal terakhir dari semua riwayat
  const tgl = pi.riwayat.map(r => r.tanggal).sort();
  pi.tanggalMulai    = tgl[0];
  pi.tanggalTerakhir = tgl[tgl.length - 1];

  // Jika total 0 dan semua sudah lunas, tandai akun lunas
  if (pi.total === 0 && pi.riwayat.every(r => r.lunas)) pi.status = 'lunas';

  DB.save();
  DB.queueSync('update_riwayat_piutang', { piutangId, txId, perubahan });
  Sync.attemptSync();
  return true;
}

/**
 * Hapus satu entri riwayat dari akun piutang.
 * Jika setelah dihapus tidak ada riwayat tersisa, hapus akun juga.
 */
export function hapusRiwayat(piutangId, txId) {
  const db = DB.getDB();
  const pi = db.piutang.find(p => p.id === piutangId);
  if (!pi) return;

  pi.riwayat = pi.riwayat.filter(r => r.txId !== txId);

   if (pi.riwayat.length === 0) {
    // Tidak ada riwayat tersisa — hapus akun
    db.piutang = db.piutang.filter(p => p.id !== piutangId);
  } else {
    // Hitung ulang total
    pi.total = pi.riwayat
      .filter(r => !r.lunas)
      .reduce((a, r) => a + r.jumlah, 0);
    if (pi.total === 0 && pi.riwayat.every(r => r.lunas)) pi.status = 'lunas';
  }

  DB.save();
  DB.queueSync('hapus_riwayat_piutang', { piutangId, txId });
  Sync.attemptSync();
}

export function removePiutang(id) {
  const db = DB.getDB();
  db.piutang = db.piutang.filter(p => p.id !== id);
  DB.save();
  DB.queueSync('delete_piutang', { id });
  Sync.attemptSync();
}

// ── Migrasi data lama ─────────────────────────────────────────────────────────
//
// Data lama mungkin menyimpan piutang sebagai satu entri per transaksi
// (model lama: { id, pelanggan, items, total, metode, status, tanggal, ... })
// bukan model baru per pelanggan dengan riwayat[].
// Fungsi ini dipanggil sekali saat app.js bootstrap.

export function migratePiutang() {
  const db = DB.getDB();
  const perlu = db.piutang.some(p => !Array.isArray(p.riwayat));
  if (!perlu) return;  // sudah format baru semua, skip

  // Pisahkan yang sudah baru vs yang masih lama
  const sudahBaru = db.piutang.filter(p => Array.isArray(p.riwayat));
  const masihLama = db.piutang.filter(p => !Array.isArray(p.riwayat));

  // Kelompokkan entri lama per nama pelanggan + status
  const akunMap = new Map(); // key: `${namaNormal}__${status}`

  masihLama.forEach(p => {
    const key = `${_normNama(p.pelanggan)}__${p.status ?? 'belum_lunas'}`;
    if (!akunMap.has(key)) {
      akunMap.set(key, {
        id:              uid(),
        pelanggan:       p.pelanggan?.trim() ?? 'Umum',
        status:          p.status ?? 'belum_lunas',
        total:           0,
        tanggalMulai:    p.tanggal ?? new Date().toISOString(),
        tanggalTerakhir: p.tanggal ?? new Date().toISOString(),
        riwayat:         [],
      });
    }
    const akun = akunMap.get(key);

    // Bangun entri riwayat dari data lama
    const jumlah = p.total ?? 0;
    const isLunas = (p.status === 'lunas');
    akun.riwayat.push({
      txId:    p.id ?? uid(),
      tanggal: p.tanggal ?? new Date().toISOString(),
      items:   p.items ?? [],
      jumlah,
      catatan: p.catatan ?? '',
      lunas:   isLunas,
    });

    // Update tanggal terakhir jika lebih baru
    if (p.tanggal && p.tanggal > akun.tanggalTerakhir) {
      akun.tanggalTerakhir = p.tanggal;
    }
    if (p.tanggal && p.tanggal < akun.tanggalMulai) {
      akun.tanggalMulai = p.tanggal;
    }
  });

  // Hitung total sisa (hanya riwayat belum lunas) per akun
  akunMap.forEach(akun => {
    akun.total = akun.riwayat
      .filter(r => !r.lunas)
      .reduce((a, r) => a + r.jumlah, 0);
    if (akun.total === 0 && akun.riwayat.every(r => r.lunas)) {
      akun.status = 'lunas';
    }
  });

  // Gabungkan akun baru dari migrasi dengan yang sudah format baru
  db.piutang = [...sudahBaru, ...Array.from(akunMap.values())];
  DB.save();
  console.log(`[TokoKu] Migrasi piutang: ${masihLama.length} entri lama → ${akunMap.size} akun`);
}

// ── Statistik ─────────────────────────────────────────────────────────────────

export function statsToday() {
  const today   = new Date().toDateString();
  const todayTx = DB.transaksi().filter(t => new Date(t.tanggal).toDateString() === today);
  return {
    count: todayTx.length,
    total: todayTx.reduce((a, t) => a + t.total, 0),
  };
}

export function statsByDay(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const ds    = d.toDateString();
    const total = DB.transaksi()
      .filter(t => new Date(t.tanggal).toDateString() === ds)
      .reduce((a, t) => a + t.total, 0);
    return { label: d.toLocaleDateString('id-ID', { weekday: 'narrow' }), total };
  });
}

export function totalPiutangUnpaid() {
  return getPiutangUnpaid().reduce((a, p) => a + p.total, 0);
}

// ── internal ──────────────────────────────────────────────────────────────────

function _normNama(nama) {
  return (nama ?? '').trim().toLowerCase();
}
