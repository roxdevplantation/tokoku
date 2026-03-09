import * as DB         from './core/db.js';
import * as Sync       from './core/sync.js';
import * as Router     from './core/router.js';
import { initSwipeClose, setSyncStatus, removeFab } from './components/ui.js';
import { seedIfEmpty } from './modules/seed.js';

import * as PageDashboard  from './pages/dashboard.js';
import * as PageBarang     from './pages/barang.js';
import * as PageTransaksi  from './pages/transaksi.js';
import * as PagePiutang    from './pages/piutang.js';
import * as PageLog        from './pages/log.js';          // ← baru
import * as TxSvc          from './modules/transaksi.service.js'

(function init() {
  DB.load();
  seedIfEmpty();
  TxSvc.migratePiutang() 
  window.__db = DB.getDB();
  Sync.init();
  Sync.onStatusChange(setSyncStatus);
  initSwipeClose();
  registerRoutes();
  bindWindowHandlers();
  Router.navigate('dashboard');
 // Service Worker + Auto-Update
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {

      // Cek update setiap 60 detik (cocok untuk aplikasi aktif lama)
      setInterval(() => reg.update(), 60 * 1000);

      // Deteksi SW baru tersedia
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          // SW baru sudah siap, tapi belum aktif
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            _showUpdateBanner(newWorker);
          }
        });
      });

    }).catch(() => {});

    // Jika SW baru sudah aktif (setelah skipWaiting), reload halaman
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Terima pesan dari SW untuk trigger sync
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'SYNC_NOW') Sync.attemptSync();
    });
  }})();

// ── Update Banner ─────────────────────────────────────────────────────────────

function _showUpdateBanner(newWorker) {
  // Buat banner sekali saja
  if (document.getElementById('update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <div style="position:fixed;bottom:80px;left:12px;right:12px;z-index:9999;
        background:linear-gradient(135deg,#1e3a5f,#1e4d8c);
        border:1px solid #3b82f644;border-radius:14px;
        padding:14px 16px;display:flex;align-items:center;gap:12px;
        box-shadow:0 8px 32px #0008">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:#fff">
          🆕 Update Tersedia
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">
          Versi baru sudah siap. Tap untuk memperbarui.
        </div>
      </div>
      <button id="update-btn"
        style="background:#3b82f6;color:#fff;border:none;border-radius:8px;
               padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;
               white-space:nowrap">
        Update ↻
      </button>
      <button id="update-dismiss"
        style="background:transparent;color:#94a3b8;border:none;
               font-size:18px;cursor:pointer;padding:4px;line-height:1">
        ×
      </button>
    </div>`;

  document.body.appendChild(banner);

  document.getElementById('update-btn').addEventListener('click', () => {
    // Kirim perintah ke SW baru untuk skipWaiting → trigger controllerchange → reload
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    banner.remove();
  });

  document.getElementById('update-dismiss').addEventListener('click', () => {
    banner.remove();
  });
} 

function registerRoutes() {
  Router.onChange((name, title) => {
    document.getElementById('page-title').textContent = title;
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.page === name)
    );
    document.getElementById('content').innerHTML = '';
    removeFab();
  });

  Router.register('dashboard', 'Dashboard',      PageDashboard.render);
  Router.register('barang',    'Kelola Barang',   PageBarang.render);
  Router.register('transaksi', 'Transaksi',       PageTransaksi.render);
  Router.register('piutang',   'Piutang',         PagePiutang.render);
  Router.register('log',       'Log Transaksi',   PageLog.render);   // ← baru
}

function bindWindowHandlers() {
  window.navigate = (page) => Router.navigate(page);

  // Barang
  window.barangOpenForm   = (id) => PageBarang.openForm(id ?? null);
  window.barangSave       = (id) => PageBarang.save(id || '');
  window.barangDelete     = (id) => PageBarang.del(id);
  window.barangSetFilter  = (f)  => PageBarang.setFilter(f);
  window.barangSearch     = (v)  => PageBarang.setSearch(v);
  window.barangSetEmoji   = (e)  => PageBarang.setEmoji(e);
  window.barangCalcMargin = ()   => PageBarang.updateMarginUI();

  // Transaksi
  window.txSetFilter      = (f)   => PageTransaksi.setFilter(f);
  window.txShowDetail     = (id)  => PageTransaksi.showDetail(id);
  window.txDelete         = (id)  => PageTransaksi.del(id);
  window.txCartAdd        = ()    => PageTransaksi.cartAdd();
  window.txCartRemove     = (i)   => PageTransaksi.cartRemove(i);
  window.txCartQty        = (i,v) => PageTransaksi.cartQty(i, v);
  window.txSimpan         = (m)   => PageTransaksi.simpan(m);
  window.txSavePelanggan  = (v)   => PageTransaksi.savePelanggan(v);
  window.txSaveCatatan    = (v)   => PageTransaksi.saveCatatan(v);

  // Piutang
 // Piutang
  window.piutangBayarSemua    = (id)       => PagePiutang.bayarSemua(id);
  window.piutangBayarSebagian = (pid, tid) => PagePiutang.bayarSebagian(pid, tid);
  window.piutangShowDetail    = (id)       => PagePiutang.showDetail(id);
  window.piutangHapus         = (id)       => PagePiutang.hapus(id);
  window.piutangSetSort       = (s)        => PagePiutang.setSort(s);
  window.piutangToggleRiwayat = (el, arr)  => PagePiutang.toggleRiwayat(el, arr);
  // Edit riwayat
  window.piutangEditRiwayat   = (pid, tid) => PagePiutang.editRiwayat(pid, tid);
  window.piutangSimpanEdit    = (pid, tid) => PagePiutang.simpanEdit(pid, tid);
  window.piutangHapusRiwayat  = (pid, tid) => PagePiutang.hapusRiwayat(pid, tid);
  window.piutangEditTambahItem = ()        => PagePiutang.editTambahItem();
  window.piutangEditUbahQty   = (idx, v)  => PagePiutang.editUbahQty(idx, v);
  window.piutangEditHapusItem = (idx)     => PagePiutang.editHapusItem(idx);
  window.piutangEditPreviewTotal = (v)    => PagePiutang.editPreviewTotal(v);  // Log
  window.logSetFilter  = (f) => PageLog.setFilter(f);
  window.logSetRange   = (r) => PageLog.setRange(r);
  window.logSearch     = (v) => PageLog.setSearch(v);
  window.logShowDetail = (id) => PageLog.showDetail(id);  // ← baru

  window.closeModal   = (id) => { import('./components/ui.js').then(m => m.closeModal(id)); };
  window.showTxDetail = (id) => PageTransaksi.showDetail(id);
}
