/**
 * pages/settings.js — Halaman pengaturan aplikasi.
 * - Konfigurasi Google Sheets sync (URL + Secret Key)
 * - Test koneksi langsung dari app
 * - Info toko (nama toko, stok minimum alert)
 * - Manajemen data (export, reset)
 * - Info versi app
 */

import * as Sync from '../core/sync.js';
import * as DB   from '../core/db.js';
import { toast, openModal, closeModal } from '../components/ui.js';
import { escHtml } from '../core/utils.js';

export function render() { _renderSettings(); }

// ── RENDER UTAMA ──────────────────────────────────────────────────────────────

function _renderSettings() {
  const cfg      = Sync.getConfig();
  const db       = DB.getDB();
  const settings = db.settings ?? {};
  const hasUrl   = !!cfg.url;
  const hasSecret = !!cfg.secret;

  document.getElementById('content').innerHTML = `

    <!-- ── Google Sheets Sync ── -->
    <div class="sec-header">
      <div class="sec-title">☁️ Google Sheets Sync</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">

      <!-- Status koneksi -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:700">Status Koneksi</div>
          <div id="sync-config-status" style="font-size:12px;margin-top:3px;color:var(--muted)">
            ${hasUrl && hasSecret
              ? `<span style="color:var(--green)">✓ Sudah dikonfigurasi</span>`
              : `<span style="color:var(--yellow)">⚠️ Belum dikonfigurasi</span>`}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="settingsTestSync()"
          ${!hasUrl || !hasSecret ? 'disabled style="opacity:.4"' : ''}>
          🔌 Test
        </button>
      </div>

      <!-- Apps Script URL -->
      <div class="form-group">
        <label class="form-label">
          Apps Script URL
          <span style="font-size:10px;color:var(--muted);font-weight:400;margin-left:6px">
            dari Deploy → Web App
          </span>
        </label>
        <div style="position:relative">
          <input class="form-input" id="cfg-url" type="url"
            placeholder="https://script.google.com/macros/s/…/exec"
            value="${escHtml(cfg.url)}"
            style="padding-right:44px;font-size:12px">
          <!-- Toggle show/hide URL -->
          <button onclick="settingsToggleUrl()"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                   background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px"
            id="btn-toggle-url">👁</button>
        </div>
      </div>

      <!-- Secret Key -->
      <div class="form-group">
        <label class="form-label">
          Secret Key
          <span style="font-size:10px;color:var(--muted);font-weight:400;margin-left:6px">
            dari Script Properties
          </span>
        </label>
        <div style="position:relative">
          <input class="form-input" id="cfg-secret" type="password"
            placeholder="Masukkan secret key kamu"
            value="${escHtml(cfg.secret)}"
            style="padding-right:44px">
          <button onclick="settingsToggleSecret()"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                   background:none;border:none;cursor:pointer;color:var(--muted);font-size:16px"
            id="btn-toggle-secret">👁</button>
        </div>
      </div>

      <button class="btn btn-primary" onclick="settingsSaveSync()">
        💾 Simpan Konfigurasi
      </button>

      ${hasUrl && hasSecret ? `
      <button class="btn btn-ghost" style="margin-top:8px" onclick="settingsForcSync()">
        🔄 Sync Sekarang
      </button>` : ''}
    </div>

    <!-- Panduan singkat -->
    <div class="card fade-in"
      style="margin-bottom:16px;background:var(--bg3);border-color:var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--muted2);margin-bottom:8px">
        📖 Cara dapat URL & Secret Key:
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        1. Buka Google Sheets → <b>Extensions → Apps Script</b><br>
        2. Paste kode <code>Code.gs</code> → Simpan<br>
        3. <b>Project Settings → Script Properties</b> → tambah <code>SECRET_KEY</code><br>
        4. <b>Deploy → New deployment → Web App</b><br>
        5. Copy URL → paste di atas
      </div>
    </div>

    <!-- ── Info Toko ── -->
    <div class="sec-header">
      <div class="sec-title">🏪 Info Toko</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <div class="form-group">
        <label class="form-label">Nama Toko</label>
        <input class="form-input" id="cfg-toko"
          placeholder="Nama toko kamu"
          value="${escHtml(settings.toko ?? 'TokoKu')}">
      </div>
      <div class="form-group">
        <label class="form-label">
          Batas Stok Minimum
          <span style="font-size:10px;color:var(--muted);font-weight:400;margin-left:6px">
            alert jika stok ≤ angka ini
          </span>
        </label>
        <input class="form-input" id="cfg-stok-min" type="number"
          min="1" max="100"
          value="${settings.stok_min ?? 5}">
      </div>
      <button class="btn btn-primary" onclick="settingsSaveToko()">
        💾 Simpan Info Toko
      </button>
    </div>

    <!-- ── Manajemen Kategori ── -->
    <div class="sec-header">
      <div class="sec-title">🏷️ Kategori Barang</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <div id="kategori-list">
        ${_renderKategoriList(db.kategori ?? [])}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="form-input" id="cfg-kat-baru"
          placeholder="Nama kategori baru…"
          style="flex:1">
        <button class="btn btn-primary btn-sm" style="flex-shrink:0"
          onclick="settingsTambahKategori()">
          + Tambah
        </button>
      </div>
    </div>

    <!-- ── Manajemen Data ── -->
    <div class="sec-header">
      <div class="sec-title">💾 Manajemen Data</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <!-- Ringkasan data -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
                  margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--accent2)">
            ${db.barang?.length ?? 0}
          </div>
          <div style="font-size:11px;color:var(--muted)">Barang</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--green)">
            ${db.transaksi?.length ?? 0}
          </div>
          <div style="font-size:11px;color:var(--muted)">Transaksi</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:800;color:var(--yellow)">
            ${db.piutang?.length ?? 0}
          </div>
          <div style="font-size:11px;color:var(--muted)">Piutang</div>
        </div>
      </div>

      <button class="btn btn-ghost" style="margin-bottom:8px" onclick="settingsExport()">
        📤 Export Data (JSON)
      </button>

      <button class="btn btn-ghost" style="margin-bottom:8px" onclick="settingsExportCSV()">
        📊 Export Barang (CSV)
      </button>

      <button class="btn btn-danger" onclick="settingsResetData()">
        🗑️ Reset Semua Data
      </button>
    </div>

    <!-- ── Tentang Aplikasi ── -->
    <div class="sec-header">
      <div class="sec-title">ℹ️ Tentang</div>
    </div>

    <div class="card fade-in" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
        <div style="width:52px;height:52px;border-radius:14px;
                    background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    display:flex;align-items:center;justify-content:center;
                    font-size:28px;flex-shrink:0">🏪</div>
        <div>
          <div style="font-size:16px;font-weight:800">${escHtml(settings.toko ?? 'TokoKu')}</div>
          <div style="font-size:12px;color:var(--muted)">Versi 3.0</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.7">
        Aplikasi manajemen inventaris & transaksi toko.<br>
        Data tersimpan lokal di perangkat ini.<br>
        Sync ke Google Sheets tersedia jika dikonfigurasi.
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);
                  font-size:11px;color:var(--muted)">
        localStorage: <span style="font-family:var(--mono);color:var(--muted2)">
          ${_storageSize()}
        </span>
      </div>
    </div>
  `;
}

// ── SYNC CONFIG ───────────────────────────────────────────────────────────────

export function saveSync() {
  const url    = document.getElementById('cfg-url')?.value?.trim() ?? '';
  const secret = document.getElementById('cfg-secret')?.value?.trim() ?? '';

  if (url && !url.startsWith('https://script.google.com')) {
    toast('URL tidak valid — harus dari script.google.com', 'error');
    return;
  }

  Sync.saveConfig(url, secret);
  toast('✅ Konfigurasi sync disimpan');

  // Update status indicator
  const statusEl = document.getElementById('sync-config-status');
  if (statusEl) {
    statusEl.innerHTML = url && secret
      ? `<span style="color:var(--green)">✓ Sudah dikonfigurasi</span>`
      : `<span style="color:var(--yellow)">⚠️ Belum dikonfigurasi</span>`;
  }

  // Re-render untuk tampilkan tombol Sync Sekarang
  _renderSettings();
}

export async function testSync() {
  const url    = document.getElementById('cfg-url')?.value?.trim()    ?? Sync.getConfig().url;
  const secret = document.getElementById('cfg-secret')?.value?.trim() ?? Sync.getConfig().secret;

  if (!url || !secret) {
    toast('Isi URL dan Secret Key terlebih dahulu', 'error');
    return;
  }

  if (!navigator.onLine) {
    toast('Tidak ada koneksi internet', 'error');
    return;
  }

  // Simpan dulu sementara untuk test
  Sync.saveConfig(url, secret);

  toast('🔄 Menguji koneksi…');

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'ping', secret }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.ok) {
      toast('✅ Koneksi berhasil! Sheets terhubung');
      _renderSettings();
    } else {
      toast(`❌ ${data.error ?? 'Gagal'}`, 'error');
    }
  } catch (err) {
    if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
      // Apps Script sering return CORS error tapi sebenarnya berhasil
      toast('⚠️ Mungkin berhasil (CORS). Coba Sync Sekarang.', 'error');
    } else {
      toast(`❌ ${err.message}`, 'error');
    }
  }
}

export async function forceSync() {
  if (!navigator.onLine) { toast('Tidak ada koneksi internet', 'error'); return; }
  toast('🔄 Sinkronisasi…');
  // Queue semua data untuk sync
  const db = DB.getDB();
  DB.queueSync('full_sync', { ts: Date.now() });
  const ok = await Sync.attemptSync();
  toast(ok ? '✅ Sync berhasil!' : '❌ Sync gagal, cek koneksi', ok ? 'success' : 'error');
}

export function toggleUrl() {
  const inp = document.getElementById('cfg-url');
  const btn = document.getElementById('btn-toggle-url');
  if (!inp) return;
  inp.type = inp.type === 'url' ? 'text' : 'url';
  if (btn) btn.textContent = inp.type === 'url' ? '👁' : '🙈';
}

export function toggleSecret() {
  const inp = document.getElementById('cfg-secret');
  const btn = document.getElementById('btn-toggle-secret');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ── INFO TOKO ─────────────────────────────────────────────────────────────────

export function saveToko() {
  const toko    = document.getElementById('cfg-toko')?.value?.trim();
  const stokMin = parseInt(document.getElementById('cfg-stok-min')?.value) || 5;

  if (!toko) { toast('Nama toko wajib diisi', 'error'); return; }

  const db = DB.getDB();
  db.settings = { ...db.settings, toko, stok_min: stokMin };
  DB.save();

  // Update nama di topbar
  const logoEl = document.querySelector('.logo');
  if (logoEl) logoEl.textContent = toko;

  toast('✅ Info toko disimpan');
}

// ── KATEGORI ──────────────────────────────────────────────────────────────────

function _renderKategoriList(kategori) {
  if (!kategori.length) {
    return `<div style="font-size:12px;color:var(--muted)">Belum ada kategori.</div>`;
  }
  return kategori.map((k, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${escHtml(k)}</span>
      <button style="background:var(--red)22;border:1px solid var(--red)44;
          color:var(--red);border-radius:6px;padding:3px 10px;
          font-size:11px;font-weight:700;cursor:pointer"
        onclick="settingsHapusKategori(${idx})">
        Hapus
      </button>
    </div>`).join('');
}

export function tambahKategori() {
  const inp  = document.getElementById('cfg-kat-baru');
  const nama = inp?.value?.trim();
  if (!nama) { toast('Nama kategori kosong', 'error'); return; }

  const db = DB.getDB();
  if (db.kategori.includes(nama)) { toast('Kategori sudah ada', 'error'); return; }

  db.kategori.push(nama);
  DB.save();
  window.__db = db;
  if (inp) inp.value = '';

  const listEl = document.getElementById('kategori-list');
  if (listEl) listEl.innerHTML = _renderKategoriList(db.kategori);
  toast(`✅ Kategori "${nama}" ditambahkan`);
}

export function hapusKategori(idx) {
  const db = DB.getDB();
  const nama = db.kategori[idx];
  if (!confirm(`Hapus kategori "${nama}"?`)) return;
  db.kategori.splice(idx, 1);
  DB.save();
  window.__db = db;
  const listEl = document.getElementById('kategori-list');
  if (listEl) listEl.innerHTML = _renderKategoriList(db.kategori);
  toast(`🗑️ Kategori "${nama}" dihapus`);
}

// ── EXPORT & RESET ────────────────────────────────────────────────────────────

export function exportData() {
  const db   = DB.getDB();
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tokoku-backup-${_todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📤 Export berhasil');
}

export function exportCSV() {
  const db   = DB.getDB();
  const rows = [
    ['Nama', 'Kategori', 'Harga Beli', 'Harga Jual', 'Stok', 'Satuan'],
    ...(db.barang ?? []).map(b => [
      b.nama, b.kategori, b.harga_beli, b.harga_jual, b.stok, b.satuan,
    ]),
  ];
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tokoku-barang-${_todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('📊 Export CSV berhasil');
}

export function resetData() {
  if (!confirm('⚠️ Hapus SEMUA data (barang, transaksi, piutang)?\nAksi ini tidak bisa dibatalkan!')) return;
  if (!confirm('Yakin? Data akan hilang permanen.')) return;

  const db = DB.getDB();
  db.barang    = [];
  db.transaksi = [];
  db.piutang   = [];
  DB.save();
  DB.clearPending();

  toast('🗑️ Semua data telah direset');
  _renderSettings();
}

// ── INTERNAL ──────────────────────────────────────────────────────────────────

function _storageSize() {
  try {
    const raw = localStorage.getItem('tokoku_db') ?? '';
    const kb  = (new Blob([raw]).size / 1024).toFixed(1);
    return `${kb} KB`;
  } catch { return '–'; }
}

function _todayStr() {
  return new Date().toISOString().slice(0, 10);
}
