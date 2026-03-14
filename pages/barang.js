/**
 * pages/barang.js — Halaman Kelola Barang.
 */

import * as Svc          from '../modules/barang.service.js';
import { fmtRp, calcMargin, escHtml } from '../core/utils.js';
import { productItem, emptyState, filterChips } from '../components/html.js';
import { toast, setFab, showModal, closeModal }  from '../components/ui.js';

// ── state lokal halaman ──────────────────────────────────────────────────────
let _filter = 'semua';
let _search = '';

const EMOJIS   = ['📦','🌾','🍜','💧','🫙','🍬','🥫','🧴','🍞','🥛','🧹','💊'];
const FILTER_OPTIONS = (kat) => [
  { key: 'semua', label: 'Semua' },
  { key: 'ok',    label: 'Stok OK' },
  { key: 'low',   label: 'Menipis' },
  { key: 'habis', label: 'Habis' },
  ...kat.map(k => ({ key: k, label: k })),
];

// ── render utama ─────────────────────────────────────────────────────────────

export function render() {
  setFab(() => openForm(null));
  _renderList();
}

function _renderList() {
  const items = Svc.search(_search, _filter);
  const kat   = window.__db?.kategori ?? [];

  const chips = filterChips(FILTER_OPTIONS(kat), _filter, 'barangSetFilter');

  const listHtml = items.length
    ? items.map(b => productItem(b, `barangOpenForm('${b.id}')`)).join('')
    : emptyState('📦', 'Tidak ada barang ditemukan');

  document.getElementById('content').innerHTML = `
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-input" placeholder="Cari barang…"
        value="${escHtml(_search)}"
        oninput="barangSearch(this.value)">
    </div>
    ${chips}
    ${listHtml}
  `;
}

// ── form modal ────────────────────────────────────────────────────────────────

export function openForm(id) {
  const b    = id ? Svc.getById(id) : null;
  const kat  = window.__db?.kategori ?? [];

  const emojiPicker = EMOJIS.map(e =>
    `<span style="font-size:22px;cursor:pointer;padding:4px"
      onclick="barangSetEmoji('${e}')">${e}</span>`
  ).join('');

  const body = `
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

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Kategori</label>
        <select class="form-select" id="barang-kat">
          ${kat.map(k => `<option ${b?.kategori === k ? 'selected' : ''}>${escHtml(k)}</option>`).join('')}
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
          value="${b?.harga_beli ?? ''}" placeholder="0" oninput="barangCalcMargin()">
      </div>
      <div class="form-group">
        <label class="form-label">Harga Jual</label>
        <input class="form-input" id="barang-jual" type="number"
          value="${b?.harga_jual ?? ''}" placeholder="0" oninput="barangCalcMargin()">
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
      ${b ? `<button class="btn btn-danger btn-sm" style="flex:0 0 auto;width:auto;padding:13px 16px"
                onclick="barangDelete('${b.id}')">🗑</button>` : ''}
      <button class="btn btn-ghost" onclick="closeModal('modal-barang')">Batal</button>
      <button class="btn btn-primary" onclick="barangSave('${id ?? ''}')">Simpan</button>
    </div>
  `;

  showModal('modal-barang', {
    title:   b ? 'Edit Barang' : 'Tambah Barang',
    titleEl: 'modal-barang-title',
    body,
    bodyEl:  'modal-barang-body',
  });
  updateMarginUI();
}

// ── handlers (diekspor ke window agar bisa dipanggil dari inline onclick) ─────

export function setFilter(f)   { _filter = f; _renderList(); }
export function setSearch(val) { _search = val; _renderList(); }

export function setEmoji(e) {
  const inp = document.getElementById('barang-emoji');
  const pre = document.getElementById('emoji-preview');
  if (inp) inp.value = e;
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
    const ok = profit >= 0;
    if (box) box.style.borderColor = ok ? 'var(--green)33' : 'var(--red)33';
    val.style.color = ok ? 'var(--green)' : 'var(--red)';
  } else {
    val.textContent = '-';
  }
}

export function save(id) {
  const nama = document.getElementById('barang-nama')?.value?.trim();
  if (!nama) { toast('Nama barang wajib diisi', 'error'); return; }

  const fields = {
    nama,
    kategori:   document.getElementById('barang-kat')?.value,
    satuan:     document.getElementById('barang-satuan')?.value?.trim() || 'pcs',
    harga_beli: parseFloat(document.getElementById('barang-beli')?.value) || 0,
    harga_jual: parseFloat(document.getElementById('barang-jual')?.value) || 0,
    stok:       parseInt(document.getElementById('barang-stok')?.value) || 0,
    emoji:      document.getElementById('barang-emoji')?.value || '📦',
  };

  if (id) {
    Svc.update(id, fields);
    toast('✏️ Barang diperbarui');
  } else {
    Svc.add(fields);
    toast('✅ Barang ditambahkan');
  }

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
