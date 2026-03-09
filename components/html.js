/**
 * components/html.js — Shared HTML snippet builders.
 * Semua fungsi return string HTML. Tidak ada side-effect DOM di sini.
 */

import { fmtRp, fmtDateTime, escHtml } from '../core/utils.js';
import { settings } from '../core/db.js';

// ── Barang ───────────────────────────────────────────────────────────────────

export function stockBadge(b) {
  const s = settings();
  if (b.stok === 0)            return `<div class="stock-badge stock-out">0</div>`;
  if (b.stok <= s.stok_min)    return `<div class="stock-badge stock-low">${b.stok}</div>`;
  return                              `<div class="stock-badge stock-ok">${b.stok}</div>`;
}

export function productItem(b, onClick = '') {
  const margin = b.harga_beli
    ? Math.round((b.harga_jual - b.harga_beli) / b.harga_beli * 100)
    : 0;
  return `
    <div class="product-item fade-in" onclick="${onClick}">
      <div class="product-icon">${escHtml(b.emoji || '📦')}</div>
      <div class="product-info">
        <div class="product-name">${escHtml(b.nama)}</div>
        <div class="product-cat">${escHtml(b.kategori)} · Margin ${margin}%</div>
        <div class="product-price">${fmtRp(b.harga_jual)}/${escHtml(b.satuan)}</div>
      </div>
      <div class="product-stock">
        ${stockBadge(b)}
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${escHtml(b.satuan)}</div>
      </div>
    </div>`;
}

// ── Transaksi ────────────────────────────────────────────────────────────────

export function txMethodBadge(metode) {
  return metode === 'cash'
    ? `<span class="tx-method tx-cash">CASH</span>`
    : `<span class="tx-method tx-credit">PIUTANG</span>`;
}

export function txStatusBadge(status) {
  return status === 'lunas'
    ? `<div class="tx-status paid">✓ Lunas</div>`
    : `<div class="tx-status unpaid">⏳ Belum Lunas</div>`;
}

export function txItem(tx, onClick = '') {
  const itemsLabel = tx.items.map(i => `${escHtml(i.nama)} ×${i.qty}`).join(', ');
  return `
    <div class="tx-item fade-in" onclick="${onClick}">
      <div class="tx-header">
        <div>
          <div class="tx-customer">${escHtml(tx.pelanggan)}</div>
          <div class="tx-date">${fmtDateTime(tx.tanggal)}</div>
        </div>
        ${txMethodBadge(tx.metode)}
      </div>
      <div class="tx-items-list">${itemsLabel}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="tx-total">${fmtRp(tx.total)}</div>
        ${txStatusBadge(tx.status)}
      </div>
    </div>`;
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function emptyState(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-text">${escHtml(text)}</div></div>`;
}

// ── Filter chips ─────────────────────────────────────────────────────────────

export function filterChips(options, active, onClickFn) {
  return `<div class="filter-row">
    ${options.map(({ key, label }) =>
      `<div class="filter-chip ${active === key ? 'active' : ''}"
        onclick="${onClickFn}('${key}')">${escHtml(label)}</div>`
    ).join('')}
  </div>`;
}
