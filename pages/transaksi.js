import * as Svc    from '../modules/transaksi.service.js';
import * as BrgSvc from '../modules/barang.service.js';
import { fmtRp, fmtDateTime, escHtml } from '../core/utils.js';
import { txItem, emptyState, filterChips } from '../components/html.js';
import { toast, setFab, showModal, closeModal, openModal } from '../components/ui.js';
import { openScanner } from '../components/scanner.js';

let _filter     = 'semua';
let _cart       = [];
let _pelanggan  = '';
let _catatan    = '';
let _cariBarang = '';

const FILTER_OPTIONS = [
  { key: 'semua',  label: 'Semua'   },
  { key: 'cash',   label: 'Cash'    },
  { key: 'credit', label: 'Piutang' },
];


export function render() {
  setFab(openForm);
  _renderList();
  _initBackHandler();
}

function _initBackHandler() {
  window.removeEventListener('popstate', _onPopState);
  window.addEventListener('popstate', _onPopState);
}

function _onPopState(e) {
  // Cek DOM langsung — tutup overlay/modal yang terbuka
  const overlay = document.getElementById('overlay-pilih-barang');
  if (overlay) {
    overlay.remove();
    history.replaceState({ modal: 'transaksi' }, '');
    return;
  }

  const modalTx = document.getElementById('modal-transaksi');
  if (modalTx?.classList.contains('show')) {
    closeModal('modal-transaksi');
    history.replaceState({ page: 'transaksi' }, '');
    return;
  }
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
  _cart = []; _pelanggan = ''; _catatan = ''; _cariBarang = '';
  _renderForm();
  openModal('modal-transaksi');
  history.replaceState({ modal: 'transaksi' }, '');
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
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" style="flex:1"
          onclick="txOpenPilihBarang()">
          🔍 Cari &amp; Pilih Barang
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

// ── OVERLAY PILIH BARANG — z-index 500, di atas modal-transaksi ───────────────

export function openPilihBarang() {
  _cariBarang = '';
  document.getElementById('overlay-pilih-barang')?.remove();
  history.replaceState({ modal: 'pilih-barang' }, '');

  const semua = BrgSvc.getAll().filter(b => b.stok > 0);
  const el    = document.createElement('div');
  el.id       = 'overlay-pilih-barang';

  el.innerHTML = `
    <div id="pilih-barang-sheet">
      <div style="width:36px;height:4px;border-radius:2px;
                  background:var(--border);margin:14px auto 0;flex-shrink:0"></div>

      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:14px 16px 10px;flex-shrink:0">
        <div style="font-size:16px;font-weight:800" id="pilih-barang-title">
          🛒 Pilih Barang (${semua.length})
        </div>
        <button onclick="txTutupPilihBarang()"
          style="background:var(--bg3);border:none;color:var(--muted2);
                 border-radius:8px;padding:6px 14px;font-size:13px;
                 font-weight:700;cursor:pointer">
          ✕ Tutup
        </button>
      </div>

      <div style="padding:0 16px 8px;position:relative;flex-shrink:0">
        <svg style="position:absolute;left:27px;top:50%;transform:translateY(-50%);
                    width:15px;height:15px;"
          viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="tx-cari-barang"
          style="width:100%;background:var(--bg3);border:1px solid var(--border);
                 border-radius:var(--radius-sm);color:var(--text);
                 font-family:var(--font);font-size:14px;
                 padding:11px 13px 11px 36px;outline:none;box-sizing:border-box;"
          placeholder="Cari nama, kategori, barcode…"
          oninput="txCariBarang(this.value)"
          autocomplete="off">
      </div>

      <div style="padding:0 16px 6px;font-size:11px;color:var(--muted);flex-shrink:0">
        ${semua.length} barang tersedia · tap untuk tambah ke keranjang
      </div>

      <div id="tx-barang-list"
        style="flex:1;overflow-y:auto;padding:0 16px 16px;min-height:0">
        ${_buatListBarang(semua, '')}
      </div>
    </div>

    <style>
      #overlay-pilih-barang {
        position: fixed; inset: 0; z-index: 500;
        background: #00000099;
        display: flex; align-items: flex-end; justify-content: center;
        backdrop-filter: blur(4px);
        animation: fadeInOverlay .2s ease;
      }
      #pilih-barang-sheet {
        background: var(--bg2);
        border-radius: 20px 20px 0 0;
        width: 100%; max-width: 520px;
        height: 85dvh;
        display: flex; flex-direction: column;
        padding-bottom: env(safe-area-inset-bottom);
        animation: slideUpSheet .25s cubic-bezier(.32,.72,0,1);
      }
      @keyframes fadeInOverlay {
        from { opacity: 0; } to { opacity: 1; }
      }
      @keyframes slideUpSheet {
        from { transform: translateY(100%); } to { transform: translateY(0); }
      }
    </style>
  `;

  el.addEventListener('click', e => {
    if (e.target === el) txTutupPilihBarang();
  });

  document.body.appendChild(el);
  setTimeout(() => document.getElementById('tx-cari-barang')?.focus(), 300);
}

export function tutupPilihBarang() {
  document.getElementById('overlay-pilih-barang')?.remove();
}

export function cariBarang(val) {
  _cariBarang = val;
  const semua = BrgSvc.getAll().filter(b => b.stok > 0);
  const query = val.toLowerCase().trim();
  const hasil = query
    ? semua.filter(b =>
        b.nama.toLowerCase().includes(query) ||
        (b.kategori ?? '').toLowerCase().includes(query) ||
        (b.barcode  ?? '').toLowerCase().includes(query)
      )
    : semua;

  const titleEl = document.getElementById('pilih-barang-title');
  if (titleEl) titleEl.textContent = `🛒 Pilih Barang (${hasil.length})`;

  const listEl = document.getElementById('tx-barang-list');
  if (listEl) listEl.innerHTML = _buatListBarang(hasil, query);
}

function _buatListBarang(hasil, query) {
  if (!hasil.length) {
    return `
      <div style="text-align:center;padding:40px 0;
                  color:var(--muted);font-size:13px">
        ${query
          ? `🔍 Barang "${escHtml(query)}" tidak ditemukan`
          : '📦 Semua stok habis'}
      </div>`;
  }
  return hasil.map(b => `
    <div onclick="txPilihBarang('${b.id}')"
      style="display:flex;align-items:center;gap:12px;
             padding:11px 0;cursor:pointer;
             border-bottom:1px solid var(--border)"
      ontouchstart="this.style.background='var(--bg3)';this.style.borderRadius='8px'"
      ontouchend="this.style.background='';this.style.borderRadius=''">
      <div style="font-size:28px;width:42px;text-align:center;flex-shrink:0">
        ${escHtml(b.emoji ?? '📦')}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${escHtml(b.nama)}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">
          ${escHtml(b.kategori ?? '')}
          ${b.barcode
            ? `· <span style="font-family:var(--mono)">${escHtml(b.barcode)}</span>`
            : ''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:13px;font-weight:800;color:var(--accent2);
                    font-family:var(--mono)">
          ${fmtRp(b.harga_jual)}
        </div>
        <div style="font-size:11px;margin-top:2px;font-weight:700;
                    color:${b.stok <= (window.__db?.settings?.stok_min ?? 5)
                      ? 'var(--yellow)' : 'var(--green)'}">
          Stok: ${b.stok} ${escHtml(b.satuan ?? '')}
        </div>
      </div>
    </div>`).join('');
}

export function pilihBarang(id) {
  const b = BrgSvc.getById(id);
  if (!b) return;
  const existing = _cart.find(c => c.id === id);
  let msg = '';
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, b.stok);
    msg = `+1 ${b.nama} (×${existing.qty})`;
  } else {
    _cart.push({
      id: b.id, nama: b.nama, harga: b.harga_jual,
      qty: 1, satuan: b.satuan, stok_max: b.stok,
    });
    msg = `✅ ${b.nama} masuk keranjang`;
  }
  _updateCartSection();
  _toastDalamOverlay(msg);
}

function _toastDalamOverlay(msg) {
  const lama = document.getElementById('toast-overlay-barang');
  if (lama) { clearTimeout(lama._timer); lama.remove(); }

  const el = document.createElement('div');
  el.id    = 'toast-overlay-barang';
  el.textContent = msg;
  el.style.cssText = [
    'position:fixed',
    'bottom:calc(15dvh + 20px)',
    'left:50%',
    'transform:translateX(-50%) translateY(12px)',
    'background:var(--bg2)',
    'border:1px solid var(--green)66',
    'color:var(--green)',
    'border-radius:10px',
    'padding:10px 20px',
    'font-size:13px',
    'font-weight:700',
    'font-family:var(--font)',
    'z-index:600',
    'white-space:nowrap',
    'box-shadow:0 4px 20px #0008',
    'opacity:0',
    'transition:opacity .18s,transform .18s',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(el);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.opacity   = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  }));

  el._timer = setTimeout(() => {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => el.remove(), 200);
  }, 1800);
}


function _updateCartSection() {
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
  const total  = _cart.reduce((a, c) => a + c.qty * c.harga, 0);
  const cartEl = document.getElementById('tx-cart-section');
  if (cartEl) cartEl.innerHTML = _cartHtml(cartHtml, total);
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
      _cart.push({
        id: barang.id, nama: barang.nama, harga: barang.harga_jual,
        qty: 1, satuan: barang.satuan, stok_max: barang.stok,
      });
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
    Svc.create({
      pelanggan,
      items: _cart.map(c => ({
        id: c.id, nama: c.nama, qty: c.qty, harga: c.harga, satuan: c.satuan,
      })),
      metode, catatan,
    });
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
