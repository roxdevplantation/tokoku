/**
 * core/utils.js — Pure helper functions, zero side-effects.
 * Tidak boleh import module lain dari project ini.
 */

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID');

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const daysDiff = (d) =>
  Math.floor((Date.now() - new Date(d)) / (1000 * 60 * 60 * 24));

export const calcMargin = (beli, jual) => {
  if (!beli || !jual) return { pct: 0, profit: 0 };
  return {
    pct:    +((jual - beli) / beli * 100).toFixed(1),
    profit: jual - beli,
  };
};

/** Clamp angka antara min dan max */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Escape HTML untuk mencegah XSS saat insert ke innerHTML */
export const escHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
