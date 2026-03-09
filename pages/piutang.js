/**
 * pages/piutang.js
 * - Satu kartu = satu pelanggan terakumulasi
 * - Sort: terbesar, terlama, nama A-Z
 * - Detail: semua riwayat per tanggal & barang
 * - Edit riwayat: ubah tanggal, jumlah, catatan, item barang
 * - Hapus per riwayat atau seluruh akun (jika lunas)
 */

import * as Svc  from '../modules/transaksi.service.js';
import * as BrgSvc from '../modules/barang.service.js';
import { fmtRp, fmtDate, fmtDateTime, daysDiff, escHtml } from '../core/utils.js';
import { emptyState } from '../components/html.js';
import { toast, showModal, openModal, closeModal } from '../components/ui.js';

let _sort = 'terbesar'; // 'terbesar' | 'terlama' | 'nama'

export function render() { _renderList(); }

// ── LIST ──────────────────────────────────────────────────────────────────────

function _renderList() {
  const unpaid = _sorted(Svc.getPiutangUnpaid());
  const paid   = Svc.getPiutangPaid();
  const total  = Svc.totalPiutangUnpaid();

  const sortChips = `
    <div class="filter-row" style="margin-bottom:12px">
      ${[
        { key: 'terbesar', label: '💰 Terbesar' },
        { key: 'terlama',  label: '⏰ Terlama'  },
        { key: 'nama',     label: '🔤 Nama A-Z' },
      ].map(s => `
        <div class="filter-chip ${_sort === s.key ? 'active' : ''}"
          onclick="piutangSetSort('${s.key}')">
          ${s.label}
        </div>`).join('')}
    </div>`;

  const unpaidHtml = unpaid.length
    ? unpaid.map(_cardUnpaid).join('')
    : emptyState('🎉', 'Tidak ada piutang yang belum lunas!');

  const paidSection = paid.length ? `
    <div class="sec-header" style="margin-top:20px">
      <div class="sec-title">✅ Sudah Lunas</div>
      <div style="font-size:11px;color:var(--muted)">${paid.length} pelanggan</div>
    </div>
    ${paid.slice().reverse().map(_cardPaid).join('')}` : '';

  document.getElementById('content').innerHTML = `
    ${unpaid.length ? `
    <div class="card fade-in"
      style="background:linear-gradient(135deg,#1e1b4b,#312e81);
             border-color:#4338ca55;margin-bottom:14px">
      <div class="stat-label">Total Piutang Belum Lunas</div>
      <div style="font-size:24px;font-weight:800;color:var(--yellow);
                  font-family:var(--mono);margin:4px 0">
        ${fmtRp(total)}
      </div>
      <div style="font-size:12px;color:var(--muted2)">
        ${unpaid.length} pelanggan belum bayar
      </div>
    </div>` : ''}

    ${unpaid.length ? `
    <div class="sec-header">
      <div class="sec-title">⏳ Belum Lunas</div>
    </div>
    ${sortChips}` : ''}

    ${unpaidHtml}
    ${paidSection}
  `;
}

function _sorted(list) {
  return [...list].sort((a, b) => {
    if (_sort === 'terbesar') return b.total - a.total;
    if (_sort === 'terlama')  return new Date(a.tanggalTerakhir ?? 0) - new Date(b.tanggalTerakhir ?? 0);
    if (_sort === 'nama')     return (a.pelanggan ?? '').localeCompare(b.pelanggan ?? '', 'id');
    return 0;
  });
}

export function setSort(s) { _sort = s; _renderList(); }

// ── KARTU BELUM LUNAS ─────────────────────────────────────────────────────────

function _cardUnpaid(p) {
  const txCount   = p.riwayat?.length ?? 0;
  const txBelum   = p.riwayat?.filter(r => !r.lunas).length ?? 0;
  const days      = daysDiff(p.tanggalTerakhir ?? p.tanggalMulai ?? Date.now());
  const daysLabel = days === 0 ? 'Hari ini' : `${days} hari lalu`;
  const ringkasan = _ringkasItems(p.riwayat?.filter(r => !r.lunas) ?? []);

  return `
    <div class="credit-card fade-in" style="cursor:pointer"
      onclick="piutangShowDetail('${p.id}')">
      <div style="display:flex;justify-content:space-between;
                  align-items:flex-start;margin-bottom:8px">
        <div style="min-width:0;flex:1;margin-right:10px">
          <div class="credit-customer" style="font-size:16px">
            ${escHtml(p.pelanggan)}
          </div>
          <div class="credit-date">
            Kredit pertama: ${fmtDate(p.tanggalMulai ?? '')}
          </div>
        </div>
        <button class="btn btn-success btn-sm" style="flex-shrink:0"
          onclick="event.stopPropagation();piutangBayarSemua('${p.id}')">
          Lunas ✓
        </button>
      </div>

      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px">
        <div class="credit-amount" style="margin:0">${fmtRp(p.total)}</div>
        <div style="background:var(--yellow)22;border:1px solid var(--yellow)44;
                    color:var(--yellow);font-size:10px;font-weight:700;
                    padding:2px 8px;border-radius:20px">
          ${txBelum} tagihan
        </div>
      </div>

      <div style="font-size:12px;color:var(--muted2);margin-bottom:6px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${ringkasan}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <div style="font-size:11px;color:var(--muted)">Terakhir: ${daysLabel}</div>
        <div style="font-size:10px;color:var(--accent2);font-weight:600">Tap detail →</div>
      </div>
    </div>`;
}

// ── KARTU SUDAH LUNAS ─────────────────────────────────────────────────────────

function _cardPaid(p) {
  const txCount   = p.riwayat?.length ?? 1;
  const totalAwal = p.riwayat?.reduce((a, r) => a + r.jumlah, 0) ?? p.total;
  return `
    <div class="tx-item fade-in" style="opacity:.7;cursor:pointer"
      onclick="piutangShowDetail('${p.id}')">
      <div class="tx-header">
        <div>
          <div class="tx-customer">${escHtml(p.pelanggan)}</div>
          <div class="tx-date">
            ${fmtDate(p.tanggalMulai ?? '')} · ${txCount}× kredit
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="tx-status paid">✓ Lunas</span>
          <button style="background:var(--red)22;border:1px solid var(--red)44;
              color:var(--red);border-radius:6px;padding:4px 8px;
              font-size:11px;font-weight:700;cursor:pointer"
            onclick="event.stopPropagation();piutangHapus('${p.id}')">
            🗑
          </button>
        </div>
      </div>
      <div class="tx-total" style="color:var(--muted2)">${fmtRp(totalAwal)}</div>
    </div>`;
}

// ── MODAL DETAIL ──────────────────────────────────────────────────────────────

export function showDetail(id) {
  const p = Svc.getAllPiutang().find(x => x.id === id);
  if (!p) return;

  const riwayat    = p.riwayat ?? [];
  const totalAwal  = riwayat.reduce((a, r) => a + r.jumlah, 0);
  const sisaHutang = riwayat.filter(r => !r.lunas).reduce((a, r) => a + r.jumlah, 0);
  const txBelum    = riwayat.filter(r => !r.lunas).length;

  const riwayatHtml = [...riwayat]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .map((r, idx) => {
      const itemsHtml = (r.items ?? []).map(i => `
        <div style="display:flex;justify-content:space-between;
                    padding:3px 0;font-size:12px">
          <div style="color:var(--text)">
            ${escHtml(i.nama)}
            <span style="color:var(--muted)"> ×${i.qty}</span>
          </div>
          <div style="font-family:var(--mono);color:var(--muted2)">
            ${fmtRp((i.harga ?? 0) * i.qty)}
          </div>
        </div>`).join('');

      return `
        <div style="border-radius:10px;padding:12px;margin-bottom:8px;
            border:1px solid ${r.lunas ? 'var(--border)' : '#4338ca55'};
            background:${r.lunas
              ? 'var(--bg3)'
              : 'linear-gradient(135deg,#1e1b4b88,#312e8188)'};
            ${r.lunas ? 'opacity:.6' : ''}">

          <!-- Header: nomor, tanggal, jumlah, status -->
          <div style="display:flex;justify-content:space-between;
                      align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:10px;color:var(--muted);
                          text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">
                Pengambilan #${riwayat.length - idx}
              </div>
              <div style="font-size:13px;font-weight:700;font-family:var(--mono)">
                ${fmtDateTime(r.tanggal)}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:15px;font-weight:800;font-family:var(--mono);
                  color:${r.lunas ? 'var(--green)' : 'var(--yellow)'}">
                ${fmtRp(r.jumlah)}
              </div>
              <div style="font-size:10px;font-weight:600;margin-top:2px;
                  color:${r.lunas ? 'var(--green)' : 'var(--yellow)'}">
                ${r.lunas ? '✓ Lunas' : '⏳ Belum Lunas'}
              </div>
            </div>
          </div>

          <!-- Detail barang -->
          <div style="border-top:1px solid #ffffff18;padding-top:8px">
            ${itemsHtml}
          </div>

          <!-- Catatan -->
          ${r.catatan
            ? `<div style="margin-top:8px;font-size:11px;color:var(--muted);
                  padding:5px 8px;background:#ffffff08;border-radius:6px">
                 📝 ${escHtml(r.catatan)}
               </div>`
            : ''}

          <!-- Action buttons: Lunas + Edit + Hapus -->
          <div style="display:flex;gap:6px;margin-top:10px">
            ${!r.lunas && p.status === 'belum_lunas' ? `
              <button class="btn btn-success btn-sm" style="flex:1;font-size:11px"
                onclick="piutangBayarSebagian('${p.id}','${r.txId}')">
                ✓ Lunas
              </button>` : ''}
            <button class="btn btn-ghost btn-sm"
              style="flex:1;font-size:11px;
                     background:var(--accent)22;color:var(--accent2);
                     border-color:var(--accent)44"
              onclick="piutangEditRiwayat('${p.id}','${r.txId}')">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm"
              style="flex:0 0 auto;font-size:11px;padding:8px 12px"
              onclick="piutangHapusRiwayat('${p.id}','${r.txId}')">
              🗑
            </button>
          </div>
        </div>`;
    }).join('');

  showModal('modal-detail', {
    title:   escHtml(p.pelanggan),
    titleEl: 'modal-detail-title',
    bodyEl:  'modal-detail-body',
    body: `
      <!-- Ringkasan akun -->
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);
          border:1px solid #4338ca55;border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:10px;color:var(--muted2);text-transform:uppercase;
                        letter-spacing:.4px;margin-bottom:3px">Sisa Hutang</div>
            <div style="font-size:20px;font-weight:800;font-family:var(--mono);
                        color:${sisaHutang > 0 ? 'var(--yellow)' : 'var(--green)'}">
              ${fmtRp(sisaHutang)}
            </div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted2);text-transform:uppercase;
                        letter-spacing:.4px;margin-bottom:3px">Total Pernah</div>
            <div style="font-size:20px;font-weight:800;font-family:var(--mono);
                        color:var(--muted2)">
              ${fmtRp(totalAwal)}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;padding-top:10px;
                    border-top:1px solid #ffffff18">
          <div style="font-size:11px;color:var(--muted2)">
            📋 ${riwayat.length}× total pengambilan
          </div>
          <div style="font-size:11px;color:var(--yellow)">
            ⏳ ${txBelum} belum lunas
          </div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">
          Sejak ${fmtDate(p.tanggalMulai ?? '')}
        </div>
      </div>

      ${p.status === 'belum_lunas' && sisaHutang > 0 ? `
        <button class="btn btn-success" style="margin-bottom:14px"
          onclick="piutangBayarSemua('${p.id}');closeModal('modal-detail')">
          ✓ Lunas Semua ${fmtRp(sisaHutang)}
        </button>` : ''}

      <div class="sec-header" style="margin-bottom:10px">
        <div class="sec-title">📋 Riwayat Pengambilan</div>
        <div style="font-size:11px;color:var(--muted)">Terbaru di atas</div>
      </div>

      ${riwayatHtml}

      ${p.status === 'lunas' ? `
        <button class="btn btn-danger" style="margin-top:8px"
          onclick="piutangHapus('${p.id}');closeModal('modal-detail')">
          🗑 Hapus Data Piutang
        </button>` : ''}

      <button class="btn btn-ghost" style="margin-top:8px"
        onclick="closeModal('modal-detail')">Tutup</button>
    `,
  });
}

// ── FORM EDIT RIWAYAT ─────────────────────────────────────────────────────────

export function editRiwayat(piutangId, txId) {
  const p = Svc.getAllPiutang().find(x => x.id === piutangId);
  if (!p) return;
  const r = p.riwayat.find(x => x.txId === txId);
  if (!r) return;

  // Format tanggal ke format input datetime-local: "YYYY-MM-DDTHH:MM"
  const tglInput = _toDatetimeLocal(r.tanggal);

  // Bangun baris item yang sudah ada
  const itemRows = (r.items ?? []).map((item, idx) => _itemRow(idx, item)).join('');

  // Daftar barang untuk dropdown tambah item
  const barangOptions = BrgSvc.getAll()
    .map(b => `<option value="${b.id}"
      data-nama="${escHtml(b.nama)}"
      data-harga="${b.harga_jual}"
      data-satuan="${escHtml(b.satuan)}">
      ${escHtml(b.nama)} — ${fmtRp(b.harga_jual)}
    </option>`).join('');

  // Pakai modal-barang sebagai form edit (modal-detail sedang dipakai untuk list)
  document.getElementById('modal-barang-title').textContent = '✏️ Edit Riwayat Piutang';
  document.getElementById('modal-barang-body').innerHTML = `
    <!-- Tanggal pengambilan -->
    <div class="form-group">
      <label class="form-label">Tanggal Pengambilan</label>
      <input class="form-input" type="datetime-local" id="edit-tanggal"
        value="${tglInput}">
    </div>

    <!-- Catatan -->
    <div class="form-group">
      <label class="form-label">Catatan</label>
      <textarea class="form-textarea" id="edit-catatan"
        placeholder="Catatan pengambilan…">${escHtml(r.catatan ?? '')}</textarea>
    </div>

    <!-- Daftar item barang -->
    <div class="form-group">
      <label class="form-label">Barang yang Diambil</label>
      <div id="edit-items-wrap">
        ${itemRows}
      </div>
    </div>

    <!-- Tambah item baru -->
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:flex-end">
      <div style="flex:1">
        <label class="form-label">Tambah Barang</label>
        <select class="form-select" id="edit-barang-tambah">
          <option value="">-- Pilih barang --</option>
          ${barangOptions}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" style="flex-shrink:0;margin-bottom:0"
        onclick="piutangEditTambahItem()">
        + Tambah
      </button>
    </div>

    <!-- Jumlah total (auto-hitung, bisa di-override manual) -->
    <div class="form-group">
      <label class="form-label">Total Jumlah (Rp)</label>
      <input class="form-input" type="number" id="edit-jumlah"
        value="${r.jumlah}" placeholder="0"
        oninput="piutangEditPreviewTotal(this.value)">
      <div style="font-size:11px;color:var(--muted);margin-top:4px">
        Dari barang: <span id="edit-total-preview" style="color:var(--cyan);font-weight:600">
          ${fmtRp(_hitungTotalItems(r.items ?? []))}
        </span>
        — atau ubah manual jika berbeda
      </div>
    </div>

    <!-- Buttons -->
    <div class="btn-row">
      <button class="btn btn-ghost"
        onclick="closeModal('modal-barang');piutangShowDetail('${piutangId}')">
        Batal
      </button>
      <button class="btn btn-primary"
        onclick="piutangSimpanEdit('${piutangId}','${txId}')">
        💾 Simpan
      </button>
    </div>
  `;

  // Simpan konteks edit di window sementara (bersih setelah simpan/batal)
  window._editCtx = { piutangId, txId, items: JSON.parse(JSON.stringify(r.items ?? [])) };

  openModal('modal-barang');
}

// Render satu baris item di form edit
function _itemRow(idx, item) {
  return `
    <div class="cart-item" id="edit-item-${idx}" style="margin-bottom:8px">
      <button class="cart-remove"
        onclick="piutangEditHapusItem(${idx})">×</button>
      <div class="cart-name" style="flex:1">
        ${escHtml(item.nama)}
        <br><span style="font-size:10px;color:var(--muted)">
          ${fmtRp(item.harga ?? 0)}/${escHtml(item.satuan ?? 'pcs')}
        </span>
      </div>
      <input class="cart-qty" type="number" min="1" value="${item.qty}"
        onchange="piutangEditUbahQty(${idx}, this.value)"
        style="width:60px">
    </div>`;
}

// Tambah item ke form edit
export function editTambahItem() {
  if (!window._editCtx) return;
  const sel = document.getElementById('edit-barang-tambah');
  const id  = sel?.value;
  if (!id) { toast('Pilih barang terlebih dahulu', 'error'); return; }

  const opt  = sel.options[sel.selectedIndex];
  const nama = opt.dataset.nama ?? opt.text;
  const harga = parseFloat(opt.dataset.harga) || 0;
  const satuan = opt.dataset.satuan ?? 'pcs';

  // Cek apakah sudah ada
  const existing = window._editCtx.items.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    window._editCtx.items.push({ id, nama, harga, satuan, qty: 1 });
  }

  _refreshEditItems();
}

// Ubah qty item di form edit
export function editUbahQty(idx, val) {
  if (!window._editCtx) return;
  const qty = Math.max(1, parseInt(val) || 1);
  if (window._editCtx.items[idx]) {
    window._editCtx.items[idx].qty = qty;
  }
  _refreshEditPreview();
}

// Hapus item dari form edit
export function editHapusItem(idx) {
  if (!window._editCtx) return;
  window._editCtx.items.splice(idx, 1);
  _refreshEditItems();
}

// Preview total dari items
export function editPreviewTotal(val) {
  // user override manual — tidak perlu apa-apa, input sudah reactive
}

function _refreshEditItems() {
  const wrap = document.getElementById('edit-items-wrap');
  if (!wrap || !window._editCtx) return;
  wrap.innerHTML = window._editCtx.items.map((item, idx) => _itemRow(idx, item)).join('');
  _refreshEditPreview();
}

function _refreshEditPreview() {
  const el = document.getElementById('edit-total-preview');
  if (!el || !window._editCtx) return;
  const total = _hitungTotalItems(window._editCtx.items);
  el.textContent = fmtRp(total);
  // Sync ke input jumlah jika user belum override
  const inp = document.getElementById('edit-jumlah');
  if (inp) inp.value = total;
}

function _hitungTotalItems(items) {
  return (items ?? []).reduce((a, i) => a + (i.harga ?? 0) * (i.qty ?? 1), 0);
}

// Simpan perubahan edit
export function simpanEdit(piutangId, txId) {
  if (!window._editCtx) return;

  const tanggalRaw = document.getElementById('edit-tanggal')?.value;
  const catatan    = document.getElementById('edit-catatan')?.value?.trim() ?? '';
  const jumlah     = parseFloat(document.getElementById('edit-jumlah')?.value) || 0;

  if (!tanggalRaw) { toast('Tanggal wajib diisi', 'error'); return; }
  if (jumlah <= 0) { toast('Jumlah harus lebih dari 0', 'error'); return; }

  const perubahan = {
    tanggal: new Date(tanggalRaw).toISOString(),
    catatan,
    jumlah,
    items: window._editCtx.items,
  };

  const ok = Svc.updateRiwayat(piutangId, txId, perubahan);
  if (!ok) { toast('Gagal menyimpan perubahan', 'error'); return; }

  window._editCtx = null;
  closeModal('modal-barang');
  toast('✅ Riwayat berhasil diperbarui');
  showDetail(piutangId);   // refresh modal detail
  _renderList();
}

// Hapus satu riwayat (dengan konfirmasi)
export function hapusRiwayat(piutangId, txId) {
  if (!confirm('Hapus data pengambilan ini?')) return;
  Svc.hapusRiwayat(piutangId, txId);
  toast('🗑️ Data pengambilan dihapus');
  // Cek apakah akun masih ada (mungkin sudah dihapus jika riwayat kosong)
  const masihAda = Svc.getAllPiutang().find(p => p.id === piutangId);
  if (masihAda) showDetail(piutangId);
  else closeModal('modal-detail');
  _renderList();
}

// ── HANDLERS LAIN ─────────────────────────────────────────────────────────────

export function bayarSemua(id) {
  Svc.bayar(id);
  toast('✅ Seluruh piutang ditandai lunas');
  _renderList();
}

export function bayarSebagian(piutangId, txId) {
  Svc.bayarSebagian(piutangId, txId);
  toast('✅ Tagihan ini ditandai lunas');
  showDetail(piutangId);
  _renderList();
}

export function hapus(id) {
  if (!confirm('Hapus data piutang ini?')) return;
  Svc.removePiutang(id);
  toast('🗑️ Data piutang dihapus');
  _renderList();
}

export function toggleRiwayat(elId, arrowId) {
  const el    = document.getElementById(elId);
  const arrow = document.getElementById(arrowId);
  if (!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display             = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────

function _ringkasItems(riwayat) {
  const map = new Map();
  riwayat.forEach(r =>
    (r.items ?? []).forEach(i =>
      map.set(i.nama, (map.get(i.nama) ?? 0) + i.qty)
    )
  );
  if (!map.size) return '-';
  return [...map.entries()]
    .map(([nama, qty]) => `${escHtml(nama)} ×${qty}`)
    .join(', ');
}

// Convert ISO string ke format "YYYY-MM-DDTHH:MM" untuk input datetime-local
function _toDatetimeLocal(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  // Offset ke waktu lokal
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 16);
}
