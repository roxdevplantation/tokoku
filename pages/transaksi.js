/**
 * pages/transaksi.js — Hanya tampilkan transaksi BELUM LUNAS (aktif).
 * Transaksi yang sudah lunas otomatis masuk ke halaman Log.
 */

import * as Svc       from '../modules/transaksi.service.js';
import * as BrgSvc    from '../modules/barang.service.js';
import { fmtRp, fmtDateTime, escHtml } from '../core/utils.js';
import { txItem, emptyState, filterChips } from '../components/html.js';
import { toast, setFab, showModal, closeModal, openModal } from '../components/ui.js';

let _filter    = 'semua';
let _cart      = [];
let _pelanggan = '';
let _catatan   = '';

const FILTER_OPTIONS = [
  { key: 'semua',  label: 'Semua Aktif' },
  { key: 'cash',   label: 'Cash' },
  { key: 'credit', label: 'Piutang' },
];

export function render() {
  setFab(openForm);
  _renderList();
}

function _renderList() {
  // Hanya tampilkan transaksi hari ini atau yang belum lunas (kredit)
  // Transaksi cash lama → sudah lunas → di Log saja
  const all = Svc.getAll().slice().reverse();

  // Filter: cash hanya hari ini, credit yang belum lunas + hari ini
  const today = new Date().toDateString();
  const active = all.filter(t => {
    if (_filter === 'cash'   && t.metode !== 'cash')   return false;
    if (_filter === 'credit' && t.metode !== 'credit') return false;
    // Cash: tampilkan hanya hari ini
    if (t.metode === 'cash')   return new Date(t.tanggal).toDateString() === today;
    // Credit: tampilkan yang belum lunas
    if (t.metode === 'credit') return t.status === 'belum_lunas';
    return false;
  });

  const chips    = filterChips(FILTER_OPTIONS, _filter, 'txSetFilter');
  const listHtml = active.length
    ? active.map(tx => txItem(tx, `txShowDetail('${tx.id}')`)).join('')
    : emptyState('🧾', 'Tidak ada transaksi aktif hari ini');

  document.getElementById('content').innerHTML = `
    ${chips}
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px;
        display:flex;align-items:center;gap:6px">
      <span>Cash = hari ini · Piutang = belum lunas</span>
      <span style="margin-left:auto;color:var(--accent2);cursor:pointer;font-weight:600"
        onclick="navigate('log')">Lihat Log →</span>
    </div>
    ${listHtml}
  `;
}

// ── form transaksi baru ───────────────────────────────────────────────────────

export function openForm() {
  _cart = []; _pelanggan = ''; _catatan = '';
  _renderFormFull();
  openModal('modal-transaksi');
}

function _renderFormFull() {
  document.getElementById('modal-transaksi-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nama Pelanggan</label>
      <input class="form-input" id="tx-pelanggan"
        placeholder="e.g. Ibu Sari"
        oninput="txSavePelanggan(this.value)">
    </div>

    <div class="form-group">
      <label class="form-label">Pilih Barang</label>
      <select class="form-select" id="tx-barang-select">
        <option value="">-- Pilih barang --</option>
        ${BrgSvc.getAll()
          .filter(b => b.stok > 0)
          .map(b => `<option value="${b.id}">${escHtml(b.nama)} (Stok: ${b.stok})</option>`)
          .join('')}
      </select>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="txCartAdd()">
        + Tambah ke Keranjang
      </button>
    </div>

    <div class="section-divider"></div>
    <div id="tx-cart-section"></div>

    <div class="form-group">
      <label class="form-label">Metode Pembayaran</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-success" onclick="txSimpan('cash')">💵 Cash</button>
        <button class="btn" style="background:var(--yellow)22;color:var(--yellow);
            border:1px solid var(--yellow)44" onclick="txSimpan('credit')">📋 Piutang</button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Catatan (opsional)</label>
      <textarea class="form-textarea" id="tx-catatan"
        placeholder="Catatan tambahan…"
        oninput="txSaveCatatan(this.value)"></textarea>
    </div>

    <button class="btn btn-ghost" onclick="closeModal('modal-transaksi')">Batal</button>
  `;
  _refreshCartSection();
}

function _refreshCartSection() {
  const el = document.getElementById('tx-cart-section');
  if (!el) return;
  const total = _cart.reduce((a, c) => a + c.qty * c.harga, 0);
  el.innerHTML = `
    <div style="margin-bottom:12px">
      ${_cart.length
        ? _cart.map((c, i) => `
            <div class="cart-item">
              <button class="cart-remove" onclick="txCartRemove(${i})">×</button>
              <div class="cart-name">${escHtml(c.nama)}
                <br><span style="font-size:10px;color:var(--muted)">
                  ${fmtRp(c.harga)}/${escHtml(c.satuan)}</span>
              </div>
              <input class="cart-qty" type="number" min="1" max="${c.stok_max}"
                value="${c.qty}" onchange="txCartQty(${i}, this.value)">
            </div>`).join('')
        : `<div style="font-size:12px;color:var(--muted);padding:10px 0">
             Belum ada barang dipilih
           </div>`}
    </div>
    ${_cart.length ? `
    <div style="display:flex;justify-content:space-between;padding:10px 0;
        border-top:1px solid var(--border);margin-bottom:14px">
      <span style="font-weight:700">Total</span>
      <span style="font-size:17px;font-weight:800;font-family:var(--mono);color:var(--accent2)">
        ${fmtRp(total)}
      </span>
    </div>` : ''}
  `;
}

// ── cart handlers ─────────────────────────────────────────────────────────────

export function cartAdd() {
  const id = document.getElementById('tx-barang-select')?.value;
  if (!id) { toast('Pilih barang terlebih dahulu', 'error'); return; }
  const b = BrgSvc.getById(id);
  if (!b) return;
  const existing = _cart.find(c => c.id === id);
  if (existing) { existing.qty = Math.min(existing.qty + 1, b.stok); }
  else { _cart.push({ id: b.id, nama: b.nama, harga: b.harga_jual, qty: 1, satuan: b.satuan, stok_max: b.stok }); }
  _refreshCartSection();
}

export function cartRemove(i) { _cart.splice(i, 1); _refreshCartSection(); }
export function cartQty(i, v) {
  _cart[i].qty = Math.max(1, Math.min(parseInt(v) || 1, _cart[i].stok_max));
  _refreshCartSection();
}

export function savePelanggan(v) { _pelanggan = v; }
export function saveCatatan(v)   { _catatan   = v; }

// ── simpan ────────────────────────────────────────────────────────────────────

export function simpan(metode) {
  if (_cart.length === 0) { toast('Keranjang kosong', 'error'); return; }
  const pelanggan = document.getElementById('tx-pelanggan')?.value?.trim() || _pelanggan || 'Umum';
  const catatan   = document.getElementById('tx-catatan')?.value?.trim()   || _catatan   || '';
  try {
    Svc.create({
      pelanggan,
      items: _cart.map(c => ({ id: c.id, nama: c.nama, qty: c.qty, harga: c.harga })),
      metode, catatan,
    });
    closeModal('modal-transaksi');
    toast(metode === 'cash' ? '✅ Transaksi cash berhasil' : '📋 Piutang dicatat');
    _cart = []; _pelanggan = ''; _catatan = '';
    _renderList();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ── detail ────────────────────────────────────────────────────────────────────

export function showDetail(id) {
  const tx = Svc.getById(id);
  if (!tx) return;

  const itemRows = tx.items.map(i => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;
        border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:13px;font-weight:600">${escHtml(i.nama)}</div>
        <div style="font-size:11px;color:var(--muted)">${i.qty} × ${fmtRp(i.harga)}</div>
      </div>
      <div style="font-size:13px;font-weight:700;font-family:var(--mono)">
        ${fmtRp(i.qty * i.harga)}
      </div>
    </div>`).join('');

  const methodBadge = tx.metode === 'cash'
    ? `<span class="tx-method tx-cash">CASH</span>`
    : `<span class="tx-method tx-credit">PIUTANG</span>`;

  showModal('modal-detail', {
    title: 'Detail Transaksi', titleEl: 'modal-detail-title', bodyEl: 'modal-detail-body',
    body: `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:16px;font-weight:700">${escHtml(tx.pelanggan)}</div>
          ${methodBadge}
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;font-family:var(--mono)">
          ${fmtDateTime(tx.tanggal)}
        </div>
        ${itemRows}
        <div style="display:flex;justify-content:space-between;padding-top:12px">
          <div style="font-weight:700">TOTAL</div>
          <div style="font-size:17px;font-weight:800;color:var(--accent2);font-family:var(--mono)">
            ${fmtRp(tx.total)}
          </div>
        </div>
        ${tx.catatan
          ? `<div style="margin-top:10px;padding:10px;background:var(--bg3);
                border-radius:8px;font-size:12px;color:var(--muted2)">
               📝 ${escHtml(tx.catatan)}
             </div>`
          : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-danger" onclick="txDelete('${tx.id}')">🗑 Hapus</button>
        <button class="btn btn-ghost"  onclick="closeModal('modal-detail')">Tutup</button>
      </div>`,
  });
}

export function del(id) {
  Svc.remove(id);
  closeModal('modal-detail');
  toast('🗑️ Transaksi dihapus');
  _renderList();
}

export function setFilter(f) { _filter = f; _renderList(); }
