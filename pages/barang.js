import * as Svc from '../modules/barang.service.js';
import { fmtRp, calcMargin, escHtml } from '../core/utils.js';
import { productItem, emptyState, filterChips } from '../components/html.js';
import { toast, setFab, showModal, closeModal } from '../components/ui.js';
import { openScanner } from '../components/scanner.js';

let _filter      = 'semua';
let _search      = '';
let _scanBarcode = '';

const EMOJIS = ['📦','🌾','🍜','💧','🫙','🍬','🥫','🧴','🍞','🥛','🧹','💊'];

const FILTER_OPTIONS = (kat) => [
  { key: 'semua', label: 'Semua'   },
  { key: 'ok',    label: 'Stok OK' },
  { key: 'low',   label: 'Menipis' },
  { key: 'habis', label: 'Habis'   },
  ...kat.map(k => ({ key: k, label: k })),
];

export function render() {
  setFab(() => openForm(null));
  _renderList();
}

function _renderList() {
  const items = Svc.search(_search, _filter);
  const kat   = window.__db?.kategori ?? [];

  document.getElementById('content').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div class="search-wrap" style="flex:1;margin-bottom:0">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="search-input" placeholder="Cari barang…"
          value="${escHtml(_search)}"
          oninput="barangSearch(this.value)">
      </div>
      <button onclick="barangScanTambah()"
        style="flex-shrink:0;display:flex;align-items:center;gap:6px;
               background:linear-gradient(135deg,var(--accent),var(--accent2));
               border:none;border-radius:var(--radius-sm);color:#fff;
               padding:0 14px;font-size:13px;font-weight:700;
               cursor:pointer;white-space:nowrap">
        📷 Scan
      </button>
    </div>

    ${filterChips(FILTER_OPTIONS(kat), _filter, 'barangSetFilter')}

    ${items.length
      ? items.map(b => productItem(b, `barangOpenForm('${b.id}')`)).join('')
      : emptyState('📦', 'Tidak ada barang ditemukan')}
  `;
}

export function scanTambah() {
  openScanner(code => {
    const trimmed  = code.trim();
    const existing = Svc.getAll().find(b => b.barcode === trimmed);
    if (existing) {
      toast(`📦 Ditemukan: ${existing.nama}`, 'info');
      openForm(existing.id);
    } else {
      _openFormRingkas(trimmed);
    }
  });
}

function _openFormRingkas(barcode) {
  _scanBarcode = barcode;
  const kat    = window.__db?.kategori ?? [];

  showModal('modal-barang', {
    title:   '➕ Tambah Barang Baru',
    titleEl: 'modal-barang-title',
    bodyEl:  'modal-barang-body',
    body: `
      <div style="background:var(--accent)11;border:1px solid var(--accent)33;
                  border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;
                  display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🏷️</span>
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:700;
                      text-transform:uppercase;letter-spacing:.4px">
            Kode Barcode Terdeteksi
          </div>
          <div style="font-size:14px;font-weight:800;font-family:var(--mono);
                      color:var(--accent2);margin-top:2px">
            ${escHtml(barcode)}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          Nama Barang <span style="color:var(--red)">*</span>
        </label>
        <input class="form-input" id="quick-nama"
          placeholder="e.g. Indomie Goreng, Aqua 600ml…">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">
            Kategori <span style="color:var(--red)">*</span>
          </label>
          <select class="form-select" id="quick-kat">
            ${kat.map(k => `<option>${escHtml(k)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Satuan</label>
          <input class="form-input" id="quick-satuan"
            placeholder="pcs/kg/botol" value="pcs">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Harga Beli</label>
          <input class="form-input" id="quick-beli" type="number"
            placeholder="0" inputmode="numeric"
            oninput="barangQuickCalcMargin()">
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual</label>
          <input class="form-input" id="quick-jual" type="number"
            placeholder="0" inputmode="numeric"
            oninput="barangQuickCalcMargin()">
        </div>
      </div>

      <div id="quick-margin-box"
        style="background:var(--green)11;border:1px solid var(--green)33;
               border-radius:var(--radius-sm);padding:10px 13px;
               display:flex;justify-content:space-between;align-items:center;
               margin-bottom:14px">
        <span style="font-size:12px;color:var(--muted2)">💰 Margin</span>
        <span id="quick-margin-val"
          style="font-size:14px;font-weight:800;color:var(--green);
                 font-family:var(--mono)">-</span>
      </div>

      <div class="form-group">
        <label class="form-label">Stok Awal</label>
        <input class="form-input" id="quick-stok" type="number"
          placeholder="0" inputmode="numeric" value="0">
      </div>

      <div class="btn-row">
        <button class="btn btn-ghost" onclick="closeModal('modal-barang')">
          Batal
        </button>
        <button class="btn btn-primary" onclick="barangQuickSave()">
          ✅ Simpan
        </button>
      </div>
    `,
  });

  setTimeout(() => document.getElementById('quick-nama')?.focus(), 320);
}

export function quickCalcMargin() {
  const beli = parseFloat(document.getElementById('quick-beli')?.value) || 0;
  const jual = parseFloat(document.getElementById('quick-jual')?.value) || 0;
  const box  = document.getElementById('quick-margin-box');
  const val  = document.getElementById('quick-margin-val');
  if (!val) return;
  if (beli && jual) {
    const { pct, profit } = calcMargin(beli, jual);
    val.textContent = `${pct}% (${fmtRp(profit)})`;
    val.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
    if (box) box.style.borderColor = profit >= 0 ? 'var(--green)33' : 'var(--red)33';
  } else {
    val.textContent = '-';
    val.style.color = 'var(--green)';
  }
}

export function quickSave() {
  const nama = document.getElementById('quick-nama')?.value?.trim();
  if (!nama) {
    toast('Nama barang wajib diisi', 'error');
    document.getElementById('quick-nama')?.focus();
    return;
  }
  const kat       = document.getElementById('quick-kat')?.value ?? '';
  const satuan    = document.getElementById('quick-satuan')?.value?.trim() || 'pcs';
  const hargaBeli = parseFloat(document.getElementById('quick-beli')?.value) || 0;
  const hargaJual = parseFloat(document.getElementById('quick-jual')?.value) || 0;
  const stok      = parseInt(document.getElementById('quick-stok')?.value)   || 0;

  Svc.add({
    nama, barcode: _scanBarcode, kategori: kat,
    satuan, harga_beli: hargaBeli, harga_jual: hargaJual,
    stok, emoji: '📦',
  });
  toast(`✅ "${nama}" ditambahkan`);
  closeModal('modal-barang');
  _scanBarcode = '';
  _renderList();
}

export function openForm(id) {
  const b   = id ? Svc.getById(id) : null;
  const kat = window.__db?.kategori ?? [];

  const emojiPicker = EMOJIS.map(e =>
    `<span style="font-size:22px;cursor:pointer;padding:4px"
      onclick="barangSetEmoji('${e}')">${e}</span>`
  ).join('');

  showModal('modal-barang', {
    title:   b ? 'Edit Barang' : 'Tambah Barang',
    titleEl: 'modal-barang-title',
    bodyEl:  'modal-barang-body',
    body: `
      <div class="form-group">
        <label class="form-label">Ikon</label>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span id="emoji-preview" style="font-size:32px">${b?.emoji ?? '📦'}</span>
          <div style="flex:1;display:flex;flex-wrap:wrap;gap:2px">${emojiPicker}</div>
        </div>
        <input type="hidden" id="barang-emoji" value="${b?.emoji ?? '📦'}">
      </div>

      <div class="form-group">
        <label class="form-label">Nama Barang</label>
        <input class="form-input" id="barang-nama"
          value="${escHtml(b?.nama ?? '')}" placeholder="e.g. Beras 5kg">
      </div>

      <div class="form-group">
        <label class="form-label">
          Kode Barcode
          <span style="font-size:10px;color:var(--muted);
                       font-weight:400;margin-left:4px">opsional</span>
        </label>
        <div style="display:flex;gap:8px">
          <input class="form-input" id="barang-barcode"
            value="${escHtml(b?.barcode ?? '')}"
            placeholder="Scan atau ketik kode…"
            style="flex:1;font-family:var(--mono)">
          <button onclick="barangScanBarcode()"
            style="background:var(--accent)22;border:1px solid var(--accent)44;
                   color:var(--accent2);border-radius:var(--radius-sm);
                   padding:0 14px;font-size:20px;cursor:pointer;flex-shrink:0">
            📷
          </button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kategori</label>
          <select class="form-select" id="barang-kat">
            ${kat.map(k =>
              `<option ${b?.kategori === k ? 'selected' : ''}>${escHtml(k)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Satuan</label>
          <input class="form-input" id="barang-satuan"
            value="${escHtml(b?.satuan ?? 'pcs')}" placeholder="pcs/kg/botol">
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Harga Beli</label>
          <input class="form-input" id="barang-beli" type="number"
            value="${b?.harga_beli ?? ''}" placeholder="0"
            oninput="barangCalcMargin()">
        </div>
        <div class="form-group">
          <label class="form-label">Harga Jual</label>
          <input class="form-input" id="barang-jual" type="number"
            value="${b?.harga_jual ?? ''}" placeholder="0"
            oninput="barangCalcMargin()">
        </div>
        <div class="form-group">
          <label class="form-label">Stok</label>
          <input class="form-input" id="barang-stok" type="number"
            value="${b?.stok ?? ''}" placeholder="0">
        </div>
      </div>

      <div class="margin-box" id="margin-box">
        <span class="margin-label">💰 Margin Keuntungan</span>
        <span class="margin-val" id="margin-val">-</span>
      </div>

      <div class="btn-row">
        ${b ? `<button class="btn btn-danger btn-sm"
                 style="flex:0 0 auto;width:auto;padding:13px 16px"
                 onclick="barangDelete('${b.id}')">🗑</button>` : ''}
        <button class="btn btn-ghost"
          onclick="closeModal('modal-barang')">Batal</button>
        <button class="btn btn-primary"
          onclick="barangSave('${id ?? ''}')">Simpan</button>
      </div>
    `,
  });
  updateMarginUI();
}

export function scanBarcode() {
  openScanner(code => {
    const inp = document.getElementById('barang-barcode');
    if (inp) { inp.value = code.trim(); toast(`📷 ${code}`, 'info'); }
  });
}

export function setFilter(f)   { _filter = f; _renderList(); }
export function setSearch(val) { _search = val; _renderList(); }

export function setEmoji(e) {
  const inp = document.getElementById('barang-emoji');
  const pre = document.getElementById('emoji-preview');
  if (inp) inp.value       = e;
  if (pre) pre.textContent = e;
}

export function updateMarginUI() {
  const beli = parseFloat(document.getElementById('barang-beli')?.value) || 0;
  const jual = parseFloat(document.getElementById('barang-jual')?.value) || 0;
  const box  = document.getElementById('margin-box');
  const val  = document.getElementById('margin-val');
  if (!val) return;
  if (beli && jual) {
    const { pct, profit } = calcMargin(beli, jual);
    val.textContent = `${pct}% (${fmtRp(profit)})`;
    val.style.color = profit >= 0 ? 'var(--green)' : 'var(--red)';
    if (box) box.style.borderColor = profit >= 0 ? 'var(--green)33' : 'var(--red)33';
  } else {
    val.textContent = '-';
  }
}

export function save(id) {
  const nama = document.getElementById('barang-nama')?.value?.trim();
  if (!nama) { toast('Nama barang wajib diisi', 'error'); return; }
  const fields = {
    nama,
    barcode:    document.getElementById('barang-barcode')?.value?.trim() || '',
    kategori:   document.getElementById('barang-kat')?.value,
    satuan:     document.getElementById('barang-satuan')?.value?.trim() || 'pcs',
    harga_beli: parseFloat(document.getElementById('barang-beli')?.value) || 0,
    harga_jual: parseFloat(document.getElementById('barang-jual')?.value) || 0,
    stok:       parseInt(document.getElementById('barang-stok')?.value)   || 0,
    emoji:      document.getElementById('barang-emoji')?.value || '📦',
  };
  if (id) { Svc.update(id, fields); toast('✏️ Barang diperbarui'); }
  else    { Svc.add(fields);        toast('✅ Barang ditambahkan'); }
  closeModal('modal-barang');
  _renderList();
}

export function del(id) {
  if (!confirm('Hapus barang ini?')) return;
  Svc.remove(id);
  closeModal('modal-barang');
  toast('🗑️ Barang dihapus');
  _renderList();
}
