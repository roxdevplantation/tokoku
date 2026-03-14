/**
 * modules/seed.js — Data demo untuk first-run.
 * Hanya dipanggil sekali jika db.barang kosong.
 */

import * as DB from '../core/db.js';
import { uid } from '../core/utils.js';

export function seedIfEmpty() {
  const db = DB.getDB();
  if (db.barang.length > 0) return;

  // const barang = [
  //   { id: uid(), nama: 'Beras 5kg',        kategori: 'Sembako',  harga_beli: 60000, harga_jual: 68000, stok: 25, satuan: 'karung', emoji: '🌾' },
  //   { id: uid(), nama: 'Minyak Goreng 2L', kategori: 'Sembako',  harga_beli: 28000, harga_jual: 32000, stok: 3,  satuan: 'botol',  emoji: '🫙' },
  //   { id: uid(), nama: 'Indomie Goreng',   kategori: 'Makanan',  harga_beli: 3200,  harga_jual: 3500,  stok: 0,  satuan: 'bks',    emoji: '🍜' },
  //   { id: uid(), nama: 'Aqua 600ml',       kategori: 'Minuman',  harga_beli: 2500,  harga_jual: 3000,  stok: 48, satuan: 'botol',  emoji: '💧' },
  //   { id: uid(), nama: 'Gula Pasir 1kg',   kategori: 'Sembako',  harga_beli: 14000, harga_jual: 16000, stok: 8,  satuan: 'kg',     emoji: '🍬' },
  // ];

  // const tx = {
  //   id: uid(), pelanggan: 'Ibu Sari', tanggal: new Date().toISOString(),
  //   items: [{ id: barang[0].id, nama: barang[0].nama, qty: 2, harga: barang[0].harga_jual }],
  //   total: 136000, metode: 'cash', status: 'lunas', catatan: '',
  // };
  //
  // const pi = {
  //   id: uid(), pelanggan: 'Pak Budi',
  //   tanggal: new Date(Date.now() - 3 * 86400000).toISOString(),
  //   items: [{ id: barang[1].id, nama: barang[1].nama, qty: 3, harga: barang[1].harga_jual }],
  //   total: 96000, metode: 'credit', status: 'belum_lunas', catatan: 'Janji bayar minggu depan',
  // };

  db.barang    = barang;
  db.transaksi = [tx];
  db.piutang   = [pi];
  DB.save();
}
