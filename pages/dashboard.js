/**
 * pages/dashboard.js — Render halaman Dashboard.
 * Hanya boleh: ambil data dari service, build HTML, inject ke #content.
 */

import * as TxSvc  from '../modules/transaksi.service.js';
import * as BrgSvc from '../modules/barang.service.js';
import { fmtRp }   from '../core/utils.js';
import { productItem, txItem, emptyState } from '../components/html.js';

export function render() {
  const today        = TxSvc.statsToday();
  const chart        = TxSvc.statsByDay(7);
  const piutangTotal = TxSvc.totalPiutangUnpaid();
  const piutangCount = TxSvc.getPiutangUnpaid().length;
  const allBarang    = BrgSvc.getAll();
  const db           = window.__db;
  const stokMin      = db?.settings?.stok_min ?? 5;
  const stokKritis   = allBarang.filter(b => b.stok === 0 || b.stok <= stokMin);

  const maxChart  = Math.max(...chart.map(d => d.total), 1);
  const chartBars = chart.map(d => `
    <div class="chart-bar-wrap">
      <div class="chart-bar"
        style="height:${Math.max(8, (d.total / maxChart) * 100)}px"></div>
      <div class="chart-bar-label">${d.label}</div>
    </div>`).join('');

  const lowStockHtml = stokKritis.length
    ? stokKritis.slice(0, 4).map(b => productItem(b, `navigate('barang')`)).join('')
    : `<div class="empty"><div class="empty-text">Semua stok aman 👍</div></div>`;

  const recentTx   = TxSvc.getAll().slice(-4).reverse();
  const recentHtml = recentTx.length
    ? recentTx.map(tx => txItem(tx, `showTxDetail('${tx.id}')`)).join('')
    : emptyState('🧾', 'Belum ada transaksi');

  document.getElementById('content').innerHTML = `
    <div class="stat-grid fade-in">
      <div class="stat-card s-purple">
        <div class="stat-label">Omzet Hari Ini</div>
        <div class="stat-val" style="font-size:16px">${fmtRp(today.omzet)}</div>
        <div class="stat-sub">${today.count} transaksi</div>
      </div>
      <div class="stat-card s-yellow">
        <div class="stat-label">Total Piutang</div>
        <div class="stat-val" style="font-size:16px;color:var(--yellow)">
          ${fmtRp(piutangTotal)}
        </div>
        <div class="stat-sub">${piutangCount} pelanggan</div>
      </div>
      <div class="stat-card s-green">
        <div class="stat-label">Cash Hari Ini</div>
        <div class="stat-val" style="font-size:16px;color:var(--green)">
          ${fmtRp(today.cash)}
        </div>
        <div class="stat-sub">masuk kas</div>
      </div>
      <div class="stat-card s-red">
        <div class="stat-label">Stok Kritis</div>
        <div class="stat-val" style="color:var(--red)">${stokKritis.length}</div>
        <div class="stat-sub">
          ${allBarang.filter(b => b.stok === 0).length} habis
        </div>
      </div>
    </div>

    <div class="card fade-in">
      <div class="sec-header">
        <div class="sec-title">📈 Penjualan 7 Hari</div>
      </div>
      <div class="chart-bars">${chartBars}</div>
    </div>

    <div class="card fade-in" style="margin-bottom:14px">
      <div class="sec-header" style="margin-bottom:10px">
        <div class="sec-title">💰 Ringkasan Hari Ini</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--bg3);border-radius:10px;padding:12px;
                    border:1px solid var(--green)33">
          <div style="font-size:10px;color:var(--muted);font-weight:700;
                      text-transform:uppercase;margin-bottom:4px">💵 Cash</div>
          <div style="font-size:15px;font-weight:800;color:var(--green);
                      font-family:var(--mono)">${fmtRp(today.cash)}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:12px;
                    border:1px solid var(--yellow)33">
          <div style="font-size:10px;color:var(--muted);font-weight:700;
                      text-transform:uppercase;margin-bottom:4px">📋 Kredit</div>
          <div style="font-size:15px;font-weight:800;color:var(--yellow);
                      font-family:var(--mono)">${fmtRp(today.credit)}</div>
        </div>
      </div>
    </div>

    <div class="sec-header fade-in">
      <div class="sec-title">⚠️ Stok Menipis</div>
      <div class="sec-action" onclick="navigate('barang')">Lihat Semua</div>
    </div>
    ${lowStockHtml}

    <div class="sec-header fade-in" style="margin-top:16px">
      <div class="sec-title">🧾 Transaksi Terakhir</div>
      <div class="sec-action" onclick="navigate('log')">Lihat Semua</div>
    </div>
    ${recentHtml}
  `;
<<<<<<< HEAD
=======
}import * as TxSvc  from '../modules/transaksi.service.js';
import * as BrgSvc from '../modules/barang.service.js';
import { fmtRp, fmtDateTime } from '../core/utils.js';
import { productItem, txItem, emptyState } from '../components/html.js';
import * as DB from '../core/db.js';

export function render() {
  _render();
}

function _render() {
  const today        = TxSvc.statsToday();
  const chart        = TxSvc.statsByDay(7);
  const piutangTotal = TxSvc.totalPiutangUnpaid();
  const piutangCount = TxSvc.getPiutangUnpaid().length;
  const allBarang    = BrgSvc.getAll();
  const stokMin      = window.__db?.settings?.stok_min ?? 5;
  const stokKritis   = allBarang.filter(b => b.stok === 0 || b.stok <= stokMin);

  // Chart 7 hari
  const maxChart  = Math.max(...chart.map(d => d.total), 1);
  const chartBars = chart.map(d => `
    <div class="chart-bar-wrap">
      <div class="chart-bar"
        style="height:${Math.max(8, (d.total / maxChart) * 100)}px"></div>
      <div class="chart-bar-label">${d.label}</div>
    </div>`).join('');

  // Stok kritis
  const lowStockHtml = stokKritis.length
    ? stokKritis.slice(0, 4).map(b => productItem(b, `navigate('barang')`)).join('')
    : `<div class="empty"><div class="empty-text">Semua stok aman 👍</div></div>`;

  // Transaksi terakhir
  const recentTx   = TxSvc.getAll().slice(-4).reverse();
  const recentHtml = recentTx.length
    ? recentTx.map(tx => txItem(tx, `showTxDetail('${tx.id}')`)).join('')
    : emptyState('🧾', 'Belum ada transaksi');

  // Omzet log — tampil 20 terbaru, urutkan terbaru di atas
  const omzetLogs    = [...DB.omzetLog()].reverse().slice(0, 20);
  const omzetLogHtml = omzetLogs.length
    ? omzetLogs.map(o => _omzetLogItem(o)).join('')
    : `<div style="font-size:12px;color:var(--muted);padding:12px 0;text-align:center">
         Belum ada catatan omzet
       </div>`;

  document.getElementById('content').innerHTML = `

    <!-- Stat cards -->
    <div class="stat-grid fade-in">
      <div class="stat-card s-purple">
        <div class="stat-label">Omzet Hari Ini</div>
        <div class="stat-val" style="font-size:16px">${fmtRp(today.omzet)}</div>
        <div class="stat-sub">${today.count} transaksi</div>
      </div>
      <div class="stat-card s-yellow">
        <div class="stat-label">Total Piutang</div>
        <div class="stat-val" style="font-size:16px;color:var(--yellow)">
          ${fmtRp(piutangTotal)}
        </div>
        <div class="stat-sub">${piutangCount} pelanggan</div>
      </div>
      <div class="stat-card s-green">
        <div class="stat-label">Cash Hari Ini</div>
        <div class="stat-val" style="font-size:16px;color:var(--green)">
          ${fmtRp(today.cash)}
        </div>
        <div class="stat-sub">masuk kas</div>
      </div>
      <div class="stat-card s-red">
        <div class="stat-label">Stok Kritis</div>
        <div class="stat-val" style="color:var(--red)">${stokKritis.length}</div>
        <div class="stat-sub">
          ${allBarang.filter(b => b.stok === 0).length} habis
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="card fade-in">
      <div class="sec-header">
        <div class="sec-title">📈 Penjualan 7 Hari</div>
      </div>
      <div class="chart-bars">${chartBars}</div>
    </div>

    <!-- Ringkasan hari ini -->
    <div class="card fade-in" style="margin-bottom:14px">
      <div class="sec-header" style="margin-bottom:10px">
        <div class="sec-title">💰 Ringkasan Hari Ini</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--bg3);border-radius:10px;padding:12px;
                    border:1px solid var(--green)33">
          <div style="font-size:10px;color:var(--muted);font-weight:700;
                      text-transform:uppercase;margin-bottom:4px">💵 Cash</div>
          <div style="font-size:15px;font-weight:800;color:var(--green);
                      font-family:var(--mono)">${fmtRp(today.cash)}</div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:12px;
                    border:1px solid var(--yellow)33">
          <div style="font-size:10px;color:var(--muted);font-weight:700;
                      text-transform:uppercase;margin-bottom:4px">📋 Kredit</div>
          <div style="font-size:15px;font-weight:800;color:var(--yellow);
                      font-family:var(--mono)">${fmtRp(today.credit)}</div>
        </div>
      </div>
    </div>

    <!-- ══ RIWAYAT OMZET — card terpisah dengan hapus sendiri ══ -->
    <div class="card fade-in" style="margin-bottom:14px">
      <div class="sec-header" style="margin-bottom:12px">
        <div class="sec-title">🧾 Riwayat Omzet</div>
        ${omzetLogs.length ? `
        <button onclick="dashboardClearOmzet()"
          style="font-size:11px;font-weight:700;color:var(--red);
                 background:var(--red)11;border:1px solid var(--red)33;
                 border-radius:6px;padding:4px 10px;cursor:pointer">
          🗑️ Hapus Semua
        </button>` : ''}
      </div>

      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;
                  background:var(--bg3);border-radius:8px;padding:8px 12px;
                  border-left:3px solid var(--accent)">
        💡 Riwayat omzet terpisah dari data transaksi.
        Menghapus transaksi tidak mempengaruhi omzet di sini.
      </div>

      <div id="omzet-log-list">
        ${omzetLogHtml}
      </div>
    </div>

    <!-- Stok menipis -->
    <div class="sec-header fade-in">
      <div class="sec-title">⚠️ Stok Menipis</div>
      <div class="sec-action" onclick="navigate('barang')">Lihat Semua</div>
    </div>
    ${lowStockHtml}

    <!-- Transaksi terakhir -->
    <div class="sec-header fade-in" style="margin-top:16px">
      <div class="sec-title">🧾 Transaksi Terakhir</div>
      <div class="sec-action" onclick="navigate('log')">Lihat Semua</div>
    </div>
    ${recentHtml}
  `;
}

function _omzetLogItem(o) {
  const badge = o.metode === 'cash'
    ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
                    background:var(--green)22;color:var(--green)">CASH</span>`
    : `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
                    background:var(--yellow)22;color:var(--yellow)">KREDIT</span>`;

  return `
    <div id="omzet-item-${o.id}"
      style="display:flex;align-items:center;gap:10px;
             padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          <span style="font-size:13px;font-weight:700;
                       white-space:nowrap;overflow:hidden;
                       text-overflow:ellipsis">${o.pelanggan}</span>
          ${badge}
        </div>
        <div style="font-size:11px;color:var(--muted);font-family:var(--mono)">
          ${fmtDateTime(o.tanggal)}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:800;font-family:var(--mono);
                    color:var(--accent2)">${fmtRp(o.total)}</div>
        <button onclick="dashboardHapusOmzet('${o.id}')"
          style="margin-top:4px;background:var(--red)11;
                 border:1px solid var(--red)33;color:var(--red);
                 border-radius:6px;padding:2px 8px;font-size:10px;
                 font-weight:700;cursor:pointer">
          🗑️ Hapus
        </button>
      </div>
    </div>`;
}

/** Hapus satu entri omzet log — dipanggil dari inline onclick */
export function hapusOmzet(id) {
  if (!confirm('Hapus catatan omzet ini?\nStat dashboard akan berkurang.')) return;
  TxSvc.removeOmzetLog(id);
  // Re-render hanya bagian omzet log tanpa reload seluruh halaman
  const item = document.getElementById(`omzet-item-${id}`);
  if (item) {
    item.style.transition = 'opacity .3s';
    item.style.opacity    = '0';
    setTimeout(() => { item.remove(); _updateOmzetStats(); }, 300);
  }
}

/** Hapus semua omzet log */
export function clearOmzet() {
  if (!confirm('Hapus SEMUA riwayat omzet?\nAngka di dashboard akan kembali ke 0.')) return;
  TxSvc.clearOmzetLog();
  _render();
}

/** Update angka stat cards tanpa full re-render */
function _updateOmzetStats() {
  const today = TxSvc.statsToday();
  // Tidak ada referensi DOM langsung ke stat-card nilai,
  // cukup re-render seluruh halaman agar konsisten
  _render();
>>>>>>> 4514512 (perbaharui)
}
