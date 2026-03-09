import * as Sync from '../core/sync.js';
import * as DB   from '../core/db.js';
import { toast } from '../components/ui.js';
import { escHtml } from '../core/utils.js';

export function render() { _render(); }

function _render() {
  const cfg      = Sync.getConfig();
  const db       = DB.getDB();
  const settings = db.settings ?? {};
  const hasSync  = !!(cfg.url && cfg.secret);

  document.getElementById('content').innerHTML = `

    <div class="sec-header">
      <div class="sec-title">☁️ Google Sheets Sync</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding-bottom:14px;margin-bottom:14px;
                  border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:700">Status Konfigurasi</div>
          <div style="font-size:12px;margin-top:3px">
            ${hasSync
              ? `<span style="color:var(--green)">✓ Sudah dikonfigurasi</span>`
              : `<span style="color:var(--yellow)">⚠️ Belum dikonfigurasi</span>`}
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="settingsTestSync()"
          ${!hasSync ? 'disabled style="opacity:.4;pointer-events:none"' : ''}>
          🔌 Test
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Apps Script URL</label>
        <div style="position:relative">
          <input class="form-input" id="cfg-url" type="password"
            placeholder="https://script.google.com/macros/s/…/exec"
            value="${escHtml(cfg.url)}"
            style="padding-right:44px;font-size:12px">
          <button onclick="settingsToggleUrl()" id="btn-toggle-url"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                   background:none;border:none;cursor:pointer;
                   color:var(--muted);font-size:16px;line-height:1">👁</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Secret Key</label>
        <div style="position:relative">
          <input class="form-input" id="cfg-secret" type="password"
            placeholder="Masukkan secret key kamu"
            value="${escHtml(cfg.secret)}"
            style="padding-right:44px">
          <button onclick="settingsToggleSecret()" id="btn-toggle-secret"
            style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
                   background:none;border:none;cursor:pointer;
                   color:var(--muted);font-size:16px;line-height:1">👁</button>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="settingsSaveSync()">
          💾 Simpan
        </button>
        ${hasSync
          ? `<button class="btn btn-ghost" onclick="settingsForceSync()">
               🔄 Sync Sekarang
             </button>`
          : ''}
      </div>
    </div>

    <div class="card fade-in" style="margin-bottom:16px;background:var(--bg3)">
      <div style="font-size:12px;font-weight:700;color:var(--muted2);margin-bottom:8px">
        📖 Cara setup:
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.9">
        1. Google Sheets → <b>Extensions → Apps Script</b><br>
        2. Paste kode <code style="background:var(--bg2);padding:1px 5px;
           border-radius:4px">Code.gs</code> → Simpan<br>
        3. <b>⚙️ Project Settings → Script Properties</b><br>
        &nbsp;&nbsp;&nbsp;Tambah: <code style="background:var(--bg2);padding:1px 5px;
           border-radius:4px">SECRET_KEY</code> = kunci rahasia kamu<br>
        4. <b>Deploy → New deployment → Web App</b><br>
        &nbsp;&nbsp;&nbsp;Execute as: <i>Me</i> · Access: <i>Anyone</i><br>
        5. Copy URL → paste di atas
      </div>
    </div>

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
        <label class="form-label">Batas Stok Minimum</label>
        <input class="form-input" id="cfg-stok-min"
          type="number" min="1" max="999"
          value="${settings.stok_min ?? 5}">
      </div>
      <button class="btn btn-primary" onclick="settingsSaveToko()">
        💾 Simpan Info Toko
      </button>
    </div>

    <div class="sec-header">
      <div class="sec-title">🏷️ Kategori Barang</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <div id="cfg-kat-list">
        ${_renderKatList(db.kategori ?? [])}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input class="form-input" id="cfg-kat-baru"
          placeholder="Nama kategori baru…" style="flex:1">
        <button class="btn btn-primary btn-sm" style="flex-shrink:0"
          onclick="settingsTambahKat()">+ Tambah</button>
      </div>
    </div>

    <div class="sec-header">
      <div class="sec-title">💾 Manajemen Data</div>
    </div>

    <div class="card fade-in" style="margin-bottom:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
                  margin-bottom:14px;padding-bottom:14px;
                  border-bottom:1px solid var(--border)">
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
      <button class="btn btn-ghost" style="margin-bottom:8px"
        onclick="settingsExportJSON()">📤 Export Backup (JSON)</button>
      <button class="btn btn-ghost" style="margin-bottom:8px"
        onclick="settingsExportCSV()">📊 Export Barang (CSV)</button>
      <button class="btn btn-danger" onclick="settingsResetData()">
        🗑️ Reset Semua Data
      </button>
    </div>

    <div class="sec-header">
      <div class="sec-title">ℹ️ Tentang</div>
    </div>

    <div class="card fade-in" style="margin-bottom:32px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
        <div style="width:52px;height:52px;border-radius:14px;
                    background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    display:flex;align-items:center;justify-content:center;
                    font-size:28px">🏪</div>
        <div>
          <div style="font-size:16px;font-weight:800">
            ${escHtml(settings.toko ?? 'TokoKu')}
          </div>
          <div style="font-size:12px;color:var(--muted)">Versi 3.0</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        Data tersimpan lokal di perangkat ini.<br>
        Sync ke Google Sheets tersedia jika dikonfigurasi.
      </div>
      <div style="margin-top:12px;padding-top:12px;
                  border-top:1px solid var(--border);
                  font-size:11px;color:var(--muted)">
        Penyimpanan: <span style="font-family:var(--mono);color:var(--muted2)">
          ${_storageSize()}
        </span>
      </div>
    </div>
  `;
}

function _renderKatList(kat) {
  if (!kat.length) return `<div style="font-size:12px;color:var(--muted)">Belum ada kategori.</div>`;
  return kat.map((k, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px">${escHtml(k)}</span>
      <button style="background:var(--red)22;border:1px solid var(--red)44;
          color:var(--red);border-radius:6px;padding:3px 10px;
          font-size:11px;font-weight:700;cursor:pointer"
        onclick="settingsHapusKat(${idx})">Hapus</button>
    </div>`).join('');
}

export function saveSync() {
  const url    = document.getElementById('cfg-url')?.value?.trim()    ?? '';
  const secret = document.getElementById('cfg-secret')?.value?.trim() ?? '';
  if (url && !url.startsWith('https://script.google.com')) {
    toast('URL tidak valid — harus dari script.google.com', 'error'); return;
  }
  Sync.saveConfig(url, secret);
  toast('✅ Konfigurasi sync disimpan');
  _render();
}

export async function testSync() {
  const url    = document.getElementById('cfg-url')?.value?.trim()    || Sync.getConfig().url;
  const secret = document.getElementById('cfg-secret')?.value?.trim() || Sync.getConfig().secret;
  if (!url || !secret) { toast('Isi URL dan Secret Key dulu', 'error'); return; }
  if (!navigator.onLine) { toast('Tidak ada koneksi internet', 'error'); return; }
  Sync.saveConfig(url, secret);
  toast('🔄 Menguji koneksi…');
  try {
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ping', secret }),
    });
    const data = await res.json();
    if (data.ok) { toast('✅ Koneksi berhasil!'); _render(); }
    else         { toast(`❌ ${data.error ?? 'Gagal'}`, 'error'); }
  } catch {
    toast('⚠️ Mungkin berhasil (CORS). Coba Sync Sekarang.');
  }
}

export async function forceSync() {
  if (!navigator.onLine) { toast('Tidak ada koneksi internet', 'error'); return; }
  toast('🔄 Sinkronisasi…');
  DB.queueSync('full_sync', { ts: Date.now() });
  const ok = await Sync.attemptSync();
  toast(ok ? '✅ Sync berhasil!' : '❌ Sync gagal', ok ? 'success' : 'error');
}

export function toggleUrl() {
  const inp = document.getElementById('cfg-url');
  const btn = document.getElementById('btn-toggle-url');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

export function toggleSecret() {
  const inp = document.getElementById('cfg-secret');
  const btn = document.getElementById('btn-toggle-secret');
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

export function saveToko() {
  const toko    = document.getElementById('cfg-toko')?.value?.trim();
  const stokMin = parseInt(document.getElementById('cfg-stok-min')?.value) || 5;
  if (!toko) { toast('Nama toko wajib diisi', 'error'); return; }
  const db = DB.getDB();
  db.settings = { ...db.settings, toko, stok_min: stokMin };
  DB.save();
  const logoEl = document.querySelector('.logo');
  if (logoEl) logoEl.textContent = toko;
  toast('✅ Info toko disimpan');
}

export function tambahKat() {
  const inp  = document.getElementById('cfg-kat-baru');
  const nama = inp?.value?.trim();
  if (!nama) { toast('Nama kategori kosong', 'error'); return; }
  const db = DB.getDB();
  if (db.kategori.includes(nama)) { toast('Kategori sudah ada', 'error'); return; }
  db.kategori.push(nama);
  DB.save();
  window.__db = db;
  if (inp) inp.value = '';
  const el = document.getElementById('cfg-kat-list');
  if (el) el.innerHTML = _renderKatList(db.kategori);
  toast(`✅ Kategori "${nama}" ditambahkan`);
}

export function hapusKat(idx) {
  const db   = DB.getDB();
  const nama = db.kategori[idx];
  if (!confirm(`Hapus kategori "${nama}"?`)) return;
  db.kategori.splice(idx, 1);
  DB.save();
  window.__db = db;
  const el = document.getElementById('cfg-kat-list');
  if (el) el.innerHTML = _renderKatList(db.kategori);
  toast(`🗑️ Kategori "${nama}" dihapus`);
}

export function exportJSON() {
  _download(`tokoku-backup-${_today()}.json`, JSON.stringify(DB.getDB(), null, 2), 'application/json');
  toast('📤 Export berhasil');
}

export function exportCSV() {
  const rows = [
    ['Nama','Kategori','Harga Beli','Harga Jual','Stok','Satuan'],
    ...(DB.getDB().barang ?? []).map(b =>
      [b.nama, b.kategori, b.harga_beli, b.harga_jual, b.stok, b.satuan]
    ),
  ];
  _download(`tokoku-barang-${_today()}.csv`,
    rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n'), 'text/csv');
  toast('📊 Export CSV berhasil');
}

export function resetData() {
  if (!confirm('⚠️ Hapus SEMUA data?\nTidak bisa dibatalkan!')) return;
  if (!confirm('Yakin? Data akan hilang permanen.')) return;
  const db = DB.getDB();
  db.barang = []; db.transaksi = []; db.piutang = [];
  DB.save(); DB.clearPending();
  toast('🗑️ Semua data telah direset');
  _render();
}

function _storageSize() {
  try {
    return `${(new Blob([localStorage.getItem('tokoku_db') ?? '']).size / 1024).toFixed(1)} KB`;
  } catch { return '–'; }
}

function _today() { return new Date().toISOString().slice(0, 10); }

function _download(filename, content, mime) {
  const a  = document.createElement('a');
  a.href   = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
