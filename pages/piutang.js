/**
 * pages/piutang.js
 * - Satu kartu = satu pelanggan terakumulasi
 * - Sort: terbesar, terlama, nama A-Z
 * - Detail: semua riwayat per tanggal & barang
 * - Edit riwayat: ubah tanggal, jumlah, catatan, item barang
 * - Hapus per riwayat atau seluruh akun (jika lunas)
 */
import * as Svc from '../modules/transaksi.service.js';
import { fmtRp, fmtDate, fmtDateTime, daysDiff, escHtml } from '../core/utils.js';
import { emptyState } from '../components/html.js';
import { toast, showModal, closeModal } from '../components/ui.js';

let _sort      = 'terlama';
let _editItems = [];
let _editPid   = '';
let _editTxId  = '';

export function render() { _renderList(); }

function _renderList() {
  let unpaid = Svc.getPiutangUnpaid();
  const paid = Svc.getPiutangPaid();
  const total = Svc.totalPiutangUnpaid();

  unpaid = [...unpaid].sort((a, b) => {
    if (_sort === 'terbesar') return b.total - a.total;
    if (_sort === 'nama')     return a.pelanggan.localeCompare(b.pelanggan);
    return new Date(a.tanggalTerakhir ?? 0) - new Date(b.tanggalTerakhir ?? 0);
  });

  const sortChips = ['terlama','terbesar','nama'].map(s => `
    <button class="filter-chip ${_sort===s?'active':''}"
      onclick="piutangSetSort('${s}')">
      ${s==='terlama'?'🕐 Terlama':s==='terbesar'?'💰 Terbesar':'🔤 Nama A-Z'}
    </button>`).join('');

  document.getElementById('content').innerHTML = `
    ${unpaid.length ? `
    <div class="card fade-in"
      style="background:linear-gradient(135deg,#1e1b4b,#312e81);
             border-color:#4338ca55;margin-bottom:16px">
      <div class="stat-label">Total Piutang Belum Lunas</div>
      <div style="font-size:24px;font-weight:800;color:var(--yellow);
                  font-family:var(--mono);margin:4px 0">${fmtRp(total)}</div>
      <div style="font-size:12px;color:var(--muted2)">
        ${unpaid.length} pelanggan belum bayar
      </div>
    </div>
    <div class="filter-row">${sortChips}</div>
    <div class="sec-header">
      <div class="sec-title">⏳ Belum Lunas</div>
    </div>` : ''}

    ${unpaid.length
      ? unpaid.map(_creditCard).join('')
      : emptyState('🎉', 'Tidak ada piutang yang belum lunas!')}

    ${paid.length ? `
    <div class="sec-header" style="margin-top:16px">
      <div class="sec-title">✅ Sudah Lunas</div>
    </div>
    ${paid.slice(-10).reverse().map(p => `
      <div class="tx-item fade-in" style="opacity:.7">
        <div class="tx-header">
          <div style="flex:1;min-width:0">
            <div class="tx-customer">${escHtml(p.pelanggan)}</div>
            <div class="tx-date">${fmtDate(p.tanggalMulai ?? '')}
              ${(p.riwayat?.length ?? 0) > 1 ? `· ${p.riwayat.length}× kredit` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="tx-status paid">✓ Lunas</span>
            <button
              onclick="event.stopPropagation();piutangHapus('${p.id}')"
              style="background:var(--red)22;border:1px solid var(--red)44;
                     color:var(--red);border-radius:6px;padding:4px 10px;
                     font-size:11px;font-weight:700;cursor:pointer">
              🗑️
            </button>
          </div>
        </div>
      </div>`).join('')}` : ''}
  `;
}

function _creditCard(p) {
  const days      = daysDiff(p.tanggalTerakhir ?? p.tanggal ?? Date.now());
  const daysLabel = days === 0 ? 'Transaksi hari ini' : `Terakhir ${days} hari lalu`;
  const txCount   = p.riwayat?.length ?? 1;

  const riwayatHtml = (p.riwayat ?? []).map(r => {
    const itemsLabel = (r.items ?? [])
      .map(i => `${escHtml(i.nama)} ×${i.qty}`).join(', ');
    return `
      <div style="padding:10px 0;border-bottom:1px solid #ffffff11;
                  ${r.lunas ? 'opacity:.5;' : ''}">
        <div style="display:flex;justify-content:space-between;
                    align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--muted2);
                        font-family:var(--mono);margin-bottom:3px">
              ${fmtDateTime(r.tanggal)}
            </div>
            <div style="font-size:12px;color:var(--muted2)">${itemsLabel}</div>
            ${r.catatan
              ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">
                   📝 ${escHtml(r.catatan)}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:700;font-family:var(--mono);
                color:${r.lunas ? 'var(--green)' : 'var(--yellow)'}">
              ${fmtRp(r.jumlah)}
            </div>
            ${!r.lunas ? `
              <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
                <button class="btn btn-ghost btn-sm"
                  style="font-size:10px;padding:3px 8px"
                  onclick="event.stopPropagation();piutangEditRiwayat('${p.id}','${r.txId}')">
                  ✏️ Edit
                </button>
                <button class="btn btn-success btn-sm"
                  style="font-size:10px;padding:3px 8px"
                  onclick="event.stopPropagation();piutangBayarSebagian('${p.id}','${r.txId}')">
                  Lunas ✓
                </button>
              </div>` : `
              <div style="font-size:10px;color:var(--green);margin-top:4px">
                ✓ Lunas
              </div>`}
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="credit-card fade-in">
      <div style="display:flex;justify-content:space-between;
                  align-items:flex-start;margin-bottom:6px">
        <div>
          <div class="credit-customer">${escHtml(p.pelanggan)}</div>
          <div class="credit-date">${daysLabel}</div>
        </div>
        <button class="btn btn-success btn-sm"
          onclick="piutangBayarSemua('${p.id}')">Lunas Semua ✓</button>
      </div>

      <div style="display:flex;align-items:baseline;gap:8px;margin:6px 0 8px">
        <div class="credit-amount" style="margin:0">${fmtRp(p.total)}</div>
        <div style="font-size:11px;color:var(--muted2)">${txCount}× kredit</div>
      </div>

      <div style="margin-top:8px">
        <div style="font-size:11px;color:var(--muted);font-weight:700;
            text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;
            cursor:pointer;display:flex;align-items:center;gap:4px"
          onclick="piutangToggleRiwayat('riwayat-${p.id}',this)">
          <span id="arrow-${p.id}"
            style="transition:transform .2s;transform:rotate(0deg)">▶</span>
          Riwayat Transaksi
        </div>
        <div id="riwayat-${p.id}" style="display:none">
          ${riwayatHtml}
        </div>
      </div>
    </div>`;
}

export function setSort(s) { _sort = s; _renderList(); }

export function toggleRiwayat(elId, trigger) {
  const el    = document.getElementById(elId);
  const arrow = trigger?.querySelector('span') ??
    document.getElementById('arrow-' + elId.replace('riwayat-', ''));
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
}


export function bayarSemua(id) {
  const p = Svc.getAllPiutang().find(x => x.id === id);
  if (!p) return;

  const jumlahBelumLunas = p.riwayat?.filter(r => !r.lunas).length ?? 0;
  const totalFmt = fmtRp(p.total);

  // Hapus modal lama jika ada
  document.getElementById('overlay-konfirmasi-lunas')?.remove();

  const el = document.createElement('div');
  el.id    = 'overlay-konfirmasi-lunas';
  el.innerHTML = `
    <div id="konfirmasi-sheet">

      <!-- Icon -->
      <div style="width:64px;height:64px;border-radius:50%;
                  background:linear-gradient(135deg,var(--green)22,var(--green)11);
                  border:2px solid var(--green)44;
                  display:flex;align-items:center;justify-content:center;
                  font-size:30px;margin:0 auto 16px">
        ✅
      </div>

      <!-- Judul -->
      <div style="font-size:18px;font-weight:800;text-align:center;
                  margin-bottom:6px">
        Lunasi Semua Piutang?
      </div>

      <!-- Nama pelanggan -->
      <div style="font-size:13px;color:var(--muted2);text-align:center;
                  margin-bottom:20px">
        ${escHtml(p.pelanggan)}
      </div>

      <!-- Info card -->
      <div style="background:var(--bg3);border-radius:var(--radius-sm);
                  padding:14px 16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;
                    align-items:center;margin-bottom:10px">
          <span style="font-size:12px;color:var(--muted)">Tagihan belum lunas</span>
          <span style="font-size:13px;font-weight:700">
            ${jumlahBelumLunas} transaksi
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;
                    align-items:center;padding-top:10px;
                    border-top:1px solid var(--border)">
          <span style="font-size:12px;color:var(--muted)">Total dilunasi</span>
          <span style="font-size:16px;font-weight:800;color:var(--green);
                       font-family:var(--mono)">
            ${totalFmt}
          </span>
        </div>
      </div>

      <!-- Peringatan -->
      <div style="display:flex;align-items:center;gap:8px;
                  background:var(--yellow)11;border:1px solid var(--yellow)33;
                  border-radius:var(--radius-sm);padding:10px 13px;
                  margin-bottom:24px">
        <span style="font-size:16px">⚠️</span>
        <span style="font-size:11px;color:var(--muted2);line-height:1.5">
          Tindakan ini akan menandai semua tagihan sebagai lunas
          dan <b>tidak bisa dibatalkan</b>.
        </span>
      </div>

      <!-- Tombol -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="document.getElementById('overlay-konfirmasi-lunas').remove()"
          style="padding:13px;border-radius:var(--radius-sm);border:1px solid var(--border);
                 background:var(--bg3);color:var(--muted2);font-family:var(--font);
                 font-size:14px;font-weight:700;cursor:pointer">
          Batal
        </button>
        <button id="btn-konfirmasi-lunas"
          style="padding:13px;border-radius:var(--radius-sm);border:none;
                 background:linear-gradient(135deg,var(--green),#34d399);
                 color:#fff;font-family:var(--font);
                 font-size:14px;font-weight:700;cursor:pointer">
          ✓ Ya, Lunasi
        </button>
      </div>

    </div>

    <style>
      #overlay-konfirmasi-lunas {
        position: fixed;
        inset: 0;
        z-index: 400;
        background: #00000088;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        backdrop-filter: blur(6px);
        animation: fadeInOverlay .2s ease;
      }
      #konfirmasi-sheet {
        background: var(--bg2);
        border-radius: 20px;
        padding: 28px 20px 20px;
        width: 100%;
        max-width: 360px;
        animation: popIn .25s cubic-bezier(.34,1.56,.64,1);
      }
      @keyframes fadeInOverlay {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes popIn {
        from { opacity: 0; transform: scale(.85); }
        to   { opacity: 1; transform: scale(1); }
      }
    </style>
  `;

  // Tap area gelap = tutup
  el.addEventListener('click', e => {
    if (e.target === el) el.remove();
  });

  // Tombol konfirmasi
  el.querySelector('#btn-konfirmasi-lunas').addEventListener('click', () => {
    el.remove();
    Svc.bayar(id);
    toast('✅ Seluruh piutang ditandai lunas');
    _renderList();
  });

  document.body.appendChild(el);
}
export function bayarSebagian(piutangId, txId) {
  Svc.bayarSebagian(piutangId, txId);
  toast('✅ Transaksi ini ditandai lunas');
  _renderList();
}

export function hapus(id) {
  if (!confirm('Hapus data piutang ini?')) return;
  Svc.removePiutang(id);
  toast('🗑️ Piutang dihapus');
  _renderList();
}

export function showDetail(id) {
  const p = Svc.getAllPiutang().find(x => x.id === id);
  if (!p) return;

  const riwayatRows = (p.riwayat ?? []).map(r => {
    const itemsLabel = (r.items ?? [])
      .map(i => `${escHtml(i.nama)} ×${i.qty} @${fmtRp(i.harga)}`).join('<br>');
    return `
      <div style="padding:12px 0;border-bottom:1px solid var(--border);
                  ${r.lunas ? 'opacity:.5' : ''}">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;color:var(--muted);font-family:var(--mono)">
            ${fmtDateTime(r.tanggal)}
          </span>
          <span style="font-size:13px;font-weight:700;font-family:var(--mono);
              color:${r.lunas ? 'var(--green)' : 'var(--yellow)'}">
            ${fmtRp(r.jumlah)}
          </span>
        </div>
        <div style="font-size:12px;color:var(--muted2)">${itemsLabel}</div>
        ${r.catatan
          ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">
               📝 ${escHtml(r.catatan)}</div>` : ''}
        <div style="font-size:11px;margin-top:4px;
            color:${r.lunas ? 'var(--green)' : 'var(--yellow)'}">
          ${r.lunas ? '✓ Sudah Lunas' : '⏳ Belum Lunas'}
        </div>
      </div>`;
  }).join('');

  showModal('modal-detail', {
    title:   `Piutang — ${p.pelanggan}`,
    titleEl: 'modal-detail-title',
    bodyEl:  'modal-detail-body',
    body: `
      <div class="card" style="margin-bottom:14px;
        background:linear-gradient(135deg,#1e1b4b,#312e81);border-color:#4338ca55">
        <div style="font-size:12px;color:var(--muted2);margin-bottom:4px">
          Total Sisa Piutang
        </div>
        <div style="font-size:22px;font-weight:800;color:var(--yellow);
                    font-family:var(--mono)">${fmtRp(p.total)}</div>
        <div style="font-size:11px;color:var(--muted2);margin-top:4px">
          ${p.riwayat?.length ?? 1} transaksi kredit
        </div>
      </div>
      <div class="sec-header"><div class="sec-title">Riwayat Kredit</div></div>
      ${riwayatRows}
      <div class="btn-row" style="margin-top:16px">
        ${p.status === 'belum_lunas'
          ? `<button class="btn btn-success"
               onclick="piutangBayarSemua('${p.id}');closeModal('modal-detail')">
               ✓ Lunas Semua</button>` : ''}
        <button class="btn btn-ghost"
          onclick="closeModal('modal-detail')">Tutup</button>
      </div>`,
  });
}

export function editRiwayat(piutangId, txId) {
  const p = Svc.getAllPiutang().find(x => x.id === piutangId);
  if (!p) return;
  const r = (p.riwayat ?? []).find(x => x.txId === txId);
  if (!r) return;

  _editPid   = piutangId;
  _editTxId  = txId;
  _editItems = (r.items ?? []).map(i => ({ ...i }));

  showModal('modal-barang', {
    title:   'Edit Riwayat Piutang',
    titleEl: 'modal-barang-title',
    bodyEl:  'modal-barang-body',
    body:    _editFormHtml(r),
  });
}

function _editFormHtml(r) {
  const total = _editItems.reduce((a, i) => a + i.qty * i.harga, 0);
  return `
    <div class="form-group">
      <label class="form-label">Tanggal</label>
      <input class="form-input" id="edit-tanggal" type="datetime-local"
        value="${_toLocalInput(r.tanggal)}">
    </div>

    <div class="form-group">
      <label class="form-label">Item Barang</label>
      <div id="edit-items">${_itemRowsHtml()}</div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 0;border-top:1px solid var(--border);margin-bottom:14px">
      <span style="font-weight:700;font-size:13px">Total</span>
      <span id="edit-total-preview"
        style="font-size:16px;font-weight:800;color:var(--accent2);
               font-family:var(--mono)">${fmtRp(total)}</span>
    </div>

    <div class="form-group">
      <label class="form-label">Catatan</label>
      <textarea class="form-textarea" id="edit-catatan"
        placeholder="Catatan tambahan…">${escHtml(r.catatan ?? '')}</textarea>
    </div>

    <div class="btn-row">
      <button class="btn btn-danger btn-sm"
        style="flex:0 0 auto;width:auto;padding:13px 14px"
        onclick="piutangHapusRiwayat('${_editPid}','${_editTxId}')">🗑</button>
      <button class="btn btn-ghost"
        onclick="closeModal('modal-barang')">Batal</button>
      <button class="btn btn-primary"
        onclick="piutangSimpanEdit('${_editPid}','${_editTxId}')">Simpan</button>
    </div>
  `;
}

function _itemRowsHtml() {
  return _editItems.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="flex:1;font-size:13px;font-weight:600">${escHtml(item.nama)}</div>
      <input type="number" min="1" value="${item.qty}"
        style="width:60px;background:var(--bg3);border:1px solid var(--border);
               border-radius:6px;color:var(--text);padding:6px 8px;
               font-size:13px;text-align:center;outline:none"
        onchange="piutangEditUbahQty(${idx}, this.value)">
      <span style="font-size:12px;color:var(--muted);min-width:70px;
                   text-align:right;font-family:var(--mono)">
        ${fmtRp(item.harga)}
      </span>
      <button onclick="piutangEditHapusItem(${idx})"
        style="background:var(--red)22;border:1px solid var(--red)44;
               color:var(--red);border-radius:6px;padding:4px 8px;
               font-size:13px;cursor:pointer">✕</button>
    </div>`).join('');
}

function _refreshEditItems() {
  const el    = document.getElementById('edit-items');
  const total = _editItems.reduce((a, i) => a + i.qty * i.harga, 0);
  if (el) el.innerHTML = _itemRowsHtml();
  const totalEl = document.getElementById('edit-total-preview');
  if (totalEl) totalEl.textContent = fmtRp(total);
}

export function editUbahQty(idx, val) {
  _editItems[idx].qty = Math.max(1, parseInt(val) || 1);
  _refreshEditItems();
}

export function editHapusItem(idx) {
  _editItems.splice(idx, 1);
  _refreshEditItems();
}

export function editTambahItem()   {}
export function editPreviewTotal() {}

export function simpanEdit(piutangId, txId) {
  if (_editItems.length === 0) { toast('Minimal 1 item', 'error'); return; }
  const tanggalVal = document.getElementById('edit-tanggal')?.value;
  const catatan    = document.getElementById('edit-catatan')?.value?.trim() ?? '';
  const tanggal    = tanggalVal ? new Date(tanggalVal).toISOString() : undefined;
  const jumlah     = _editItems.reduce((a, i) => a + i.qty * i.harga, 0);

  Svc.updateRiwayat(piutangId, txId, { items: _editItems, jumlah, tanggal, catatan });
  toast('✅ Riwayat diperbarui');
  closeModal('modal-barang');
  _renderList();
}

export function hapusRiwayat(piutangId, txId) {
  if (!confirm('Hapus riwayat ini?')) return;
  Svc.hapusRiwayat(piutangId, txId);
  toast('🗑️ Riwayat dihapus');
  closeModal('modal-barang');
  _renderList();
}

function _toLocalInput(iso) {
  if (!iso) return '';
  try {
    const d   = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}
