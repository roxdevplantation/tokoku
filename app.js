import * as DB            from './core/db.js';
import * as Sync          from './core/sync.js';
import * as Router        from './core/router.js';
import { initBackHandler } from './core/router.js';
import { initSwipeClose, setSyncStatus, removeFab } from './components/ui.js';
import { seedIfEmpty }     from './modules/seed.js';
import * as TxSvc          from './modules/transaksi.service.js';
import * as PageDashboard  from './pages/dashboard.js';
import * as PageBarang     from './pages/barang.js';
import * as PageTransaksi  from './pages/transaksi.js';
import * as PagePiutang    from './pages/piutang.js';
import * as PageLog        from './pages/log.js';
import * as PageSettings   from './pages/settings.js';

(function init() {
  DB.load();
  seedIfEmpty();
  TxSvc.migratePiutang();
  window.__db = DB.getDB();
  Sync.init();
  Sync.onStatusChange(setSyncStatus);
  initSwipeClose();
  _registerRoutes();
  _bindHandlers();
  initBackHandler();
  Router.navigate('dashboard', false);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      setInterval(() => reg.update(), 60_000);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller)
            _showUpdateBanner(sw);
        });
      });
    }).catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'SYNC_NOW') Sync.attemptSync();
    });
  }
})();

function _registerRoutes() {
  Router.onChange((name, title) => {
    document.getElementById('page-title').textContent = title;
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.page === name)
    );
    document.getElementById('content').innerHTML = '';
    removeFab();
  });
  Router.register('dashboard', 'Dashboard',    PageDashboard.render);
  Router.register('barang',    'Kelola Barang', PageBarang.render);
  Router.register('transaksi', 'Transaksi',     PageTransaksi.render);
  Router.register('piutang',   'Piutang',       PagePiutang.render);
  Router.register('log',       'Log Transaksi', PageLog.render);
  Router.register('settings',  'Pengaturan',    PageSettings.render);
}

function _bindHandlers() {
  window.navigate = (page) => Router.navigate(page);

  // Barang
  window.barangOpenForm        = (id)  => PageBarang.openForm(id ?? null);
  window.barangSave            = (id)  => PageBarang.save(id || '');
  window.barangDelete          = (id)  => PageBarang.del(id);
  window.barangSetFilter       = (f)   => PageBarang.setFilter(f);
  window.barangSearch          = (v)   => PageBarang.setSearch(v);
  window.barangSetEmoji        = (e)   => PageBarang.setEmoji(e);
  window.barangCalcMargin      = ()    => PageBarang.updateMarginUI();
  window.barangScanBarcode     = ()    => PageBarang.scanBarcode();
  window.barangScanTambah      = ()    => PageBarang.scanTambah();
  window.barangQuickSave       = ()    => PageBarang.quickSave();
  window.barangQuickCalcMargin = ()    => PageBarang.quickCalcMargin();

  // Transaksi
  window.txSetFilter       = (f)   => PageTransaksi.setFilter(f);
  window.txShowDetail      = (id)  => PageTransaksi.showDetail(id);
  window.txDelete          = (id)  => PageTransaksi.del(id);
  window.txCartAdd         = ()    => PageTransaksi.cartAdd();
  window.txCartRemove      = (i)   => PageTransaksi.cartRemove(i);
  window.txCartQty         = (i,v) => PageTransaksi.cartQty(i, v);
  window.txSimpan          = (m)   => PageTransaksi.simpan(m);
  window.txSavePelanggan   = (v)   => PageTransaksi.savePelanggan(v);
  window.txSaveCatatan     = (v)   => PageTransaksi.saveCatatan(v);
  window.txScanBarcode     = ()    => PageTransaksi.scanBarcode();

  // Piutang
  window.piutangBayarSemua       = (id)       => PagePiutang.bayarSemua(id);
  window.piutangBayarSebagian    = (pid, tid) => PagePiutang.bayarSebagian(pid, tid);
  window.piutangShowDetail       = (id)       => PagePiutang.showDetail(id);
  window.piutangHapus            = (id)       => PagePiutang.hapus(id);
  window.piutangSetSort          = (s)        => PagePiutang.setSort(s);
  window.piutangToggleRiwayat    = (el, arr)  => PagePiutang.toggleRiwayat(el, arr);
  window.piutangEditRiwayat      = (pid, tid) => PagePiutang.editRiwayat(pid, tid);
  window.piutangSimpanEdit       = (pid, tid) => PagePiutang.simpanEdit(pid, tid);
  window.piutangHapusRiwayat     = (pid, tid) => PagePiutang.hapusRiwayat(pid, tid);
  window.piutangEditTambahItem   = ()         => PagePiutang.editTambahItem();
  window.piutangEditUbahQty      = (idx, v)   => PagePiutang.editUbahQty(idx, v);
  window.piutangEditHapusItem    = (idx)      => PagePiutang.editHapusItem(idx);
  window.piutangEditPreviewTotal = (v)        => PagePiutang.editPreviewTotal(v);

  // Log
  window.logSetFilter  = (f)  => PageLog.setFilter(f);
  window.logSetRange   = (r)  => PageLog.setRange(r);
  window.logSearch     = (v)  => PageLog.setSearch(v);
  window.logShowDetail = (id) => PageLog.showDetail(id);

  // Settings
  window.settingsSaveSync     = ()    => PageSettings.saveSync();
  window.settingsTestSync     = ()    => PageSettings.testSync();
  window.settingsForceSync    = ()    => PageSettings.forceSync();
  window.settingsToggleUrl    = ()    => PageSettings.toggleUrl();
  window.settingsToggleSecret = ()    => PageSettings.toggleSecret();
  window.settingsSaveToko     = ()    => PageSettings.saveToko();
  window.settingsTambahKat    = ()    => PageSettings.tambahKat();
  window.settingsHapusKat     = (idx) => PageSettings.hapusKat(idx);
  window.settingsExportJSON   = ()    => PageSettings.exportJSON();
  window.settingsExportCSV    = ()    => PageSettings.exportCSV();
  window.settingsResetData    = ()    => PageSettings.resetData();

  // UI
  window.closeModal   = (id) => import('./components/ui.js').then(m => m.closeModal(id));
  window.showTxDetail = (id) => PageTransaksi.showDetail(id);

  // Dashboard omzet
  window.dashboardHapusOmzet = (id) => PageDashboard.hapusOmzet(id);
  window.dashboardClearOmzet = ()   => PageDashboard.clearOmzet();
}

function _showUpdateBanner(newWorker) {
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
        <div style="font-size:13px;font-weight:700;color:#fff">🆕 Update Tersedia</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">Tap untuk memperbarui.</div>
      </div>
      <button id="update-btn"
        style="background:#3b82f6;color:#fff;border:none;border-radius:8px;
               padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer">
        Update ↻
      </button>
      <button id="update-dismiss"
        style="background:transparent;color:#94a3b8;border:none;
               font-size:20px;cursor:pointer;padding:2px 6px;line-height:1">×</button>
    </div>`;
  document.body.appendChild(banner);
  document.getElementById('update-btn').addEventListener('click', () => {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
    banner.remove();
  });
  document.getElementById('update-dismiss').addEventListener('click', () => banner.remove());
}
