/**
 * pages/dashboard.js — Render halaman Dashboard.
 * Hanya boleh: ambil data dari service, build HTML, inject ke #content.
 */

import * as TxSvc    from '../modules/transaksi.service.js';
import * as BrgSvc   from '../modules/barang.service.js';
import { fmtRp }     from '../core/utils.js';
import { productItem, txItem, emptyState } from '../components/html.js';
import { navigate }  from '../core/router.js';

export function render() {
  const today      = TxSvc.statsToday();
  const chart      = TxSvc.statsByDay(7);
  const piutangTotal = TxSvc.totalPiutangUnpaid();
  const piutangCount = TxSvc.getPiutangUnpaid().length;
  const allBarang    = BrgSvc.getAll();
  const stokKritis   = allBarang.filter(b => b.stok === 0 || b.stok <= 5);

  const maxChart = Math.max(...chart.map(d => d.total), 1);
  const chartBars = chart.map(d => `
    <div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${Math.max(8, (d.total / maxChart) * 100)}px"></div>
      <div class="chart-bar-label">${d.label}</div>
    </div>`).join('');

  const lowStockHtml = stokKritis.length
    ? stokKritis.slice(0, 4).map(b => productItem(b, `navigate('barang')`)).join('')
    : `<div class="empty"><div class="empty-text">Semua stok aman 👍</div></div>`;

  const recentTx = TxSvc.getAll().slice(-4).reverse();
  const recentHtml = recentTx.length
    ? recentTx.map(tx => txItem(tx, `showTxDetail('${tx.id}')`)).join('')
    : emptyState('🧾', 'Belum ada transaksi');

  document.getElementById('content').innerHTML = `
    <div class="stat-grid fade-in">
      <div class="stat-card s-purple">
        <div class="stat-label">Omzet Hari Ini</div>
        <div class="stat-val" style="font-size:16px">${fmtRp(today.total)}</div>
        <div class="stat-sub">${today.count} transaksi</div>
      </div>
      <div class="stat-card s-yellow">
        <div class="stat-label">Total Piutang</div>
        <div class="stat-val" style="font-size:16px;color:var(--yellow)">${fmtRp(piutangTotal)}</div>
        <div class="stat-sub">${piutangCount} pelanggan</div>
      </div>
      <div class="stat-card s-green">
        <div class="stat-label">Total Barang</div>
        <div class="stat-val">${allBarang.length}</div>
        <div class="stat-sub">jenis produk</div>
      </div>
      <div class="stat-card s-red">
        <div class="stat-label">Stok Kritis</div>
        <div class="stat-val" style="color:var(--red)">${stokKritis.length}</div>
        <div class="stat-sub">${allBarang.filter(b => b.stok === 0).length} habis</div>
      </div>
    </div>

    <div class="card fade-in">
      <div class="sec-header"><div class="sec-title">Penjualan 7 Hari</div></div>
      <div class="chart-bars">${chartBars}</div>
    </div>

    <div class="sec-header fade-in">
      <div class="sec-title">⚠️ Stok Menipis</div>
      <div class="sec-action" onclick="navigate('barang')">Lihat Semua</div>
    </div>
    ${lowStockHtml}

    <div class="sec-header fade-in" style="margin-top:16px">
      <div class="sec-title">Transaksi Terakhir</div>
      <div class="sec-action" onclick="navigate('transaksi')">Lihat Semua</div>
    </div>
    ${recentHtml}
  `;
}
