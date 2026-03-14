/**
 * pages/transaksi.js — Hanya tampilkan transaksi BELUM LUNAS (aktif).
 * Transaksi yang sudah lunas otomatis masuk ke halaman Log.
 */
import * as Svc    from '../modules/transaksi.service.js';
import * as BrgSvc from '../modules/barang.service.js';
import { fmtRp, fmtDateTime, escHtml } from '../core/utils.js';
import { txItem, emptyState, filterChips } from '../components/html.js';
import { toast, setFab, showModal, closeModal, openModal } from '../components/ui.js';
import { openScanner } from '../components/scanner.js';

let _filter    = 'semua';
let _cart      = [];
let _pelanggan = '';
let _catatan   = '';

const FILTER_OPTIONS = [
  { key: 'semua',  label: 'Semua'   },
  { key: 'cash',   label: 'Cash'    },
  { key: 'credit', label: 'Piutang' },
];

export function render() {
  setFab(openForm);
  _renderList();
}

function _renderList() {
  const all   = Svc.getAll().slice().reverse();
  const items = all.filter(t =>
    _filter === 'semua'  ? true :
    _filter === 'cash'   ? t.metode === 'cash' :
    t.metode === 'credit'
  );
  document.getElementById('content').innerHTML =
    filterChips(FILTER_OPTIONS, _filter, 'txSetFilter') +
    (items.length
      ? items.map(tx => txItem(tx, `txShowDetail('${tx.id}')`)).join('')
      : emptyState('🧾', 'Belum ada transaksi'));
}

export function openForm() {
  _cart = []; _pelanggan = ''; _catatan = '';
  _renderForm();
  openModal('modal-transaksi');
}

function _renderForm() {
  const cartHtml = _cart.length
    ? _cart.map((c, i) => `
        <div class="cart-item">
          <button class="cart-remove" onclick="txCartRemove(${i})">×</button>
          <div class="cart-name">${escHtml(c.nama)}
            <br><span style="font-size:10px;color:var(--muted)">
              ${fmtRp(c.harga)}/${escHtml(c.satuan)}
            </span>
          </div>
          <input class="cart-qty" type="number" min="1" max="${c.stok_max}"
            value="${c.qty}" onchange="txCartQty(${i}, this.value)">
        </div>`).join('')
    : `<div style="font-size:12px;color:var(--muted);padding:10px 0">
         Belum ada barang dipilih
       </div>`;

  const total    = _cart.reduce((a, c) => a + c.qty * c.harga, 0);
  const existing = document.getElementById('modal-transaksi-body');
  const isUpdate = existing && document.getElementById('tx-pelanggan');

  if (isUpdate) {
    _pelanggan = document.getElementById('tx-pelanggan').value;
    _catatan   = document.getElementById('tx-catatan')?.value ?? _catatan;
    const cartEl = document.getElementById('tx-cart-section');
    if (cartEl) cartEl.innerHTML = _cartHtml(cartHtml, total);
    return;
  }

  existing.innerHTML = `
    <div class="form-group">
      <label class="form-label">Nama Pelanggan</label>
      <input class="form-input" id="tx-pelanggan"
        placeholder="e.g. Ibu Sari"
        value="${escHtml(_pelanggan)}"
        oninput="txSavePelanggan(this.value)">
    </div>

    <div class="form-group">
      <label class="form-label">Pilih Barang</label>
      <select class="form-select" id="tx-barang-select">
        <option value="">-- Pilih barang --</option>
        ${BrgSvc.getAll()
          .filter(b => b.stok > 0)
          .map(b => `<option value="${b.id}">
            ${escHtml(b.nama)} (Stok: ${b.stok})
          </option>`).join('')}
      </select>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost" style="flex:1" onclick="txCartAdd()">
          + Tambah ke Keranjang
        </button>
        <button onclick="txScanBarcode()" title="Scan barcode"
          style="background:var(--accent)22;border:1px solid var(--accent)44;
                 color:var(--accent2);border-radius:var(--radius-sm);
                 padding:0 18px;font-size:20px;cursor:pointer;flex-shrink:0">
          📷
        </button>
      </div>
    </div>

    <div class="section-divider"></div>
    <div id="tx-cart-section">${_cartHtml(cartHtml, total)}</div>

    <div class="form-group">
      <label class="form-label">Metode Pembayaran</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-success" onclick="txSimpan('cash')">💵 Cash</button>
        <button class="btn"
          style="background:var(--yellow)22;color:var(--yellow);
                 border:1px solid var(--yellow)44"
          onclick="txSimpan('credit')">📋 Piutang</button>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Catatan (opsional)</label>
      <textarea class="form-textarea" id="tx-catatan"
        placeholder="Catatan tambahan…"
        oninput="txSaveCatatan(this.value)">${escHtml(_catatan)}</textarea>
    </div>

    <button class="btn btn-ghost" onclick="closeModal('modal-transaksi')">Batal</button>
  `;
}

function _cartHtml(cartHtml, total) {
  return `
    <div style="margin-bottom:12px">${cartHtml}</div>
    ${_cart.length ? `
    <div style="display:flex;justify-content:space-between;padding:10px 0;
        border-top:1px solid var(--border);margin-bottom:14px">
      <span style="font-weight:700">Total</span>
      <span style="font-size:17px;font-weight:800;font-family:var(--mono);
                   color:var(--accent2)">${fmtRp(total)}</span>
    </div>` : ''}
  `;
}

export function cartAdd() {
  const id = document.getElementById('tx-barang-select')?.value;
  if (!id) { toast('Pilih barang terlebih dahulu', 'error'); return; }
  const b = BrgSvc.getById(id);
  if (!b) return;
  const existing = _cart.find(c => c.id === id);
  if (existing) { existing.qty = Math.min(existing.qty + 1, b.stok); }
  else { _cart.push({ id: b.id, nama: b.nama, harga: b.harga_jual, qty: 1, satuan: b.satuan, stok_max: b.stok }); }
  _renderForm();
}

export function cartRemove(i) { _cart.splice(i, 1); _renderForm(); }

export function cartQty(i, v) {
  const val = parseInt(v) || 1;
  _cart[i].qty = Math.min(Math.max(1, val), _cart[i].stok_max);
  _renderForm();
}

export function scanBarcode() {
  openScanner(code => {
    const barang = BrgSvc.getAll().find(b => b.barcode && b.barcode === code && b.stok > 0);
    if (!barang) {
      toast(`⚠️ Barcode "${code}" tidak ditemukan`, 'error');
      return;
    }
    const existing = _cart.find(c => c.id === barang.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + 1, barang.stok);
      toast(`+1 ${barang.nama}`);
    } else {
      _cart.push({ id: barang.id, nama: barang.nama, harga: barang.harga_jual,
                   qty: 1, satuan: barang.satuan, stok_max: barang.stok });
      toast(`✅ ${barang.nama} masuk keranjang`);
    }
    _renderForm();
  });
}

export function simpan(metode) {
  if (_cart.length === 0) { toast('Keranjang masih kosong', 'error'); return; }
  const pelanggan = document.getElementById('tx-pelanggan')?.value?.trim() || 'Umum';
  const catatan   = document.getElementById('tx-catatan')?.value?.trim()   || '';
  try {
    Svc.create({ pelanggan, items: _cart.map(c => ({
      id: c.id, nama: c.nama, qty: c.qty, harga: c.harga, satuan: c.satuan,
    })), metode, catatan });
    toast(metode === 'cash' ? '✅ Transaksi berhasil!' : '📋 Dicatat sebagai piutang');
    closeModal('modal-transaksi');
    _cart = []; _pelanggan = ''; _catatan = '';
    _renderList();
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function showDetail(id) {
  const tx = Svc.getById(id);
  if (!tx) return;
  const itemRows = (tx.items ?? []).map(i => `
    <div style="display:flex;justify-content:space-between;
                padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:13px;font-weight:600">${escHtml(i.nama)}</div>
        <div style="font-size:11px;color:var(--muted)">${i.qty} × ${fmtRp(i.harga)}</div>
      </div>
      <div style="font-size:13px;font-weight:700;font-family:var(--mono)">
        ${fmtRp(i.qty * i.harga)}
      </div>
    </div>`).join('');

  showModal('modal-detail', {
    title: 'Detail Transaksi', titleEl: 'modal-detail-title', bodyEl: 'modal-detail-body',
    body: `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:16px;font-weight:700">${escHtml(tx.pelanggan)}</div>
          <span class="tx-method ${tx.metode==='cash'?'tx-cash':'tx-credit'}">
            ${tx.metode==='cash'?'CASH':'KREDIT'}
          </span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;
                    font-family:var(--mono)">${fmtDateTime(tx.tanggal)}</div>
        ${itemRows}
        <div style="display:flex;justify-content:space-between;padding-top:12px">
          <div style="font-weight:700">TOTAL</div>
          <div style="font-size:17px;font-weight:800;color:var(--accent2);
                      font-family:var(--mono)">${fmtRp(tx.total)}</div>
        </div>
        ${tx.catatan
          ? `<div style="margin-top:10px;padding:10px;background:var(--bg3);
                border-radius:8px;font-size:12px;color:var(--muted2)">
               📝 ${escHtml(tx.catatan)}</div>` : ''}
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

export function savePelanggan(v) { _pelanggan = v; }
export function saveCatatan(v)   { _catatan   = v; }
export function setFilter(f)     { _filter = f; _renderList(); }
