/**
 * pages/log.js — Log semua riwayat transaksi (cash lunas + kredit lunas).
 * Filter: tanggal, metode, pencarian nama pelanggan.
 */

import * as Svc      from '../modules/transaksi.service.js';
import { fmtRp, fmtDate, fmtDateTime, escHtml } from '../core/utils.js';
import { emptyState, filterChips } from '../components/html.js';
import { toast, showModal, closeModal } from '../components/ui.js';

let _filter = 'semua';
let _search = '';
let _range  = '7';  // '7' | '30' | 'all'

const FILTER_OPTIONS = [
  { key: 'semua',  label: 'Semua' },
  { key: 'cash',   label: 'Cash' },
  { key: 'credit', label: 'Kredit' },
];

const RANGE_OPTIONS = [
  { key: '7',   label: '7 Hari' },
  { key: '30',  label: '30 Hari' },
  { key: 'all', label: 'Semua' },
];

export function render() { _renderLog(); }

function _renderLog() {
  const allTx  = Svc.getAll().slice().reverse();
  const cutoff = _getCutoff();

  const filtered = allTx.filter(tx => {
    const matchFilter = _filter === 'semua' ? true
      : _filter === 'cash'   ? tx.metode === 'cash'
      : tx.metode === 'credit';

    const matchSearch = !_search
      || tx.pelanggan.toLowerCase().includes(_search.toLowerCase())
      || tx.items.some(i => i.nama.toLowerCase().includes(_search.toLowerCase()));

    const matchRange = cutoff ? new Date(tx.tanggal) >= cutoff : true;

    return matchFilter && matchSearch && matchRange;
  });

  // Statistik periode
  const totalOmzet   = filtered.reduce((a, t) => a + t.total, 0);
  const totalCash    = filtered.filter(t => t.metode === 'cash').reduce((a, t) => a + t.total, 0);
  const totalKredit  = filtered.filter(t => t.metode === 'credit').reduce((a, t) => a + t.total, 0);

  const filterChipsHtml  = filterChips(FILTER_OPTIONS, _filter, 'logSetFilter');
  const rangeChipsHtml   = filterChips(RANGE_OPTIONS,  _range,  'logSetRange');

  const listHtml = filtered.length
    ? filtered.map(_logItem).join('')
    : emptyState('📋', 'Tidak ada transaksi ditemukan');

  document.getElementById('content').innerHTML = `
    <!-- Search -->
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input class="search-input" placeholder="Cari pelanggan atau barang…"
        value="${escHtml(_search)}" oninput="logSearch(this.value)">
    </div>

    <!-- Filter metode -->
    ${filterChipsHtml}

    <!-- Range tanggal -->
    ${rangeChipsHtml}

    <!-- Statistik ringkas -->
    <div class="stat-grid fade-in" style="margin-bottom:14px">
      <div class="stat-card s-purple">
        <div class="stat-label">Total Omzet</div>
        <div class="stat-val" style="font-size:15px">${fmtRp(totalOmzet)}</div>
        <div class="stat-sub">${filtered.length} transaksi</div>
      </div>
      <div class="stat-card s-green">
        <div class="stat-label">Cash</div>
        <div class="stat-val" style="font-size:15px">${fmtRp(totalCash)}</div>
        <div class="stat-sub">${filtered.filter(t => t.metode === 'cash').length} tx</div>
      </div>
    </div>

    <!-- List -->
    ${listHtml}
  `;
}

function _logItem(tx) {
  const itemsLabel = tx.items.map(i => `${escHtml(i.nama)} ×${i.qty}`).join(', ');
  const methodBadge = tx.metode === 'cash'
    ? `<span class="tx-method tx-cash">CASH</span>`
    : `<span class="tx-method tx-credit">KREDIT</span>`;

  return `
    <div class="tx-item fade-in" onclick="logShowDetail('${tx.id}')">
      <div class="tx-header">
        <div>
          <div class="tx-customer">${escHtml(tx.pelanggan)}</div>
          <div class="tx-date">${fmtDateTime(tx.tanggal)}</div>
        </div>
        ${methodBadge}
      </div>
      <div class="tx-items-list">${itemsLabel}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="tx-total">${fmtRp(tx.total)}</div>
        <div style="font-size:11px;color:var(--muted)">${fmtDate(tx.tanggal)}</div>
      </div>
    </div>`;
}

function _getCutoff() {
  if (_range === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(_range));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── detail dari log ───────────────────────────────────────────────────────────

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

  showModal('modal-detail', {
    title: 'Detail Transaksi', titleEl: 'modal-detail-title', bodyEl: 'modal-detail-body',
    body: `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:16px;font-weight:700">${escHtml(tx.pelanggan)}</div>
          <span class="tx-method ${tx.metode === 'cash' ? 'tx-cash' : 'tx-credit'}">
            ${tx.metode === 'cash' ? 'CASH' : 'KREDIT'}
          </span>
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
      <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Tutup</button>`,
  });
}

// ── handlers ──────────────────────────────────────────────────────────────────

export function setFilter(f) { _filter = f; _renderLog(); }
export function setRange(r)  { _range  = r; _renderLog(); }
export function setSearch(v) { _search = v; _renderLog(); }
