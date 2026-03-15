const LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';

let _scanner  = null;
let _callback = null;

export function openScanner(onResult) {
  _callback = onResult;
  _ensureLib().then(_showModal);
}

export function closeScanner() {
  _stop();
  document.getElementById('modal-scanner')?.remove();
}

function _showModal() {
  document.getElementById('modal-scanner')?.remove();

  const el = document.createElement('div');
  el.id    = 'modal-scanner';
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:#000e;z-index:500;
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:20px">

      <!-- Header -->
      <div style="width:100%;max-width:420px;display:flex;
                  justify-content:space-between;align-items:center;
                  margin-bottom:12px">
        <div style="font-size:15px;font-weight:700;color:#fff">
          📷 Scan Barcode Produk
        </div>
        <button onclick="closeScanner()"
          style="background:#ffffff22;border:none;color:#fff;border-radius:8px;
                 padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer">
          ✕ Tutup
        </button>
      </div>

      <!-- Viewfinder wrapper -->
      <div style="width:100%;max-width:420px;border-radius:14px;
                  overflow:hidden;background:#000;position:relative"
           id="scanner-wrapper">

        <!-- Video dari html5-qrcode -->
        <div id="scanner-view"></div>

        <!-- Canvas overlay — digambar via JS agar konsisten di WebView & Chrome -->
        <canvas id="scan-overlay"
          style="position:absolute;top:0;left:0;
                 width:100%;height:100%;pointer-events:none"></canvas>

      </div>

      <!-- Pesan status -->
      <div id="scanner-msg"
        style="margin-top:14px;font-size:13px;color:#94a3b8;
               text-align:center;min-height:20px">
        Arahkan kamera ke barcode produk…
      </div>

      <!-- Input manual -->
      <div style="width:100%;max-width:420px;margin-top:16px">
        <div style="font-size:11px;color:#475569;text-align:center;margin-bottom:8px">
          Kamera tidak tersedia? Ketik manual:
        </div>
        <div style="display:flex;gap:8px">
          <input id="scanner-manual"
            type="text" inputmode="numeric"
            placeholder="Ketik kode barcode…"
            onkeydown="if(event.key==='Enter')_scanManual()"
            style="flex:1;background:#1e293b;border:1px solid #334155;
                   color:#f1f5f9;border-radius:8px;padding:11px 13px;
                   font-size:14px;outline:none;font-family:monospace">
          <button onclick="_scanManual()"
            style="background:#6366f1;color:#fff;border:none;border-radius:8px;
                   padding:11px 18px;font-size:13px;font-weight:700;cursor:pointer">
            OK
          </button>
        </div>
      </div>
    </div>

    <style>
      #scanner-view {
        width: 100% !important;
      }
      #scanner-view video {
        width: 100% !important;
        display: block !important;
        object-fit: cover !important;
      }
      /* Hide semua bawaan html5-qrcode */
      #scanner-view__scan_region {
        display: none !important;
      }
      #scanner-view__dashboard {
        display: none !important;
      }
      #scanner-view__header_message {
        display: none !important;
      }
    </style>
  `;
  document.body.appendChild(el);

  window.closeScanner = closeScanner;
  window._scanManual  = () => {
    const v = document.getElementById('scanner-manual')?.value?.trim();
    if (v) _onResult(v);
  };

  _start();
}

function _drawOverlay() {
  const wrapper = document.getElementById('scanner-wrapper');
  const canvas  = document.getElementById('scan-overlay');
  if (!wrapper || !canvas) return;

  const W = wrapper.offsetWidth;
  const H = wrapper.offsetHeight;

  // Tunggu sampai video benar-benar render dan punya tinggi
  if (H < 10) {
    setTimeout(_drawOverlay, 300);
    return;
  }

  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');

  // Ukuran kotak scan
  const bw = Math.min(W * 0.85, 320);
  const bh = Math.round(bw * 0.33);
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;

  ctx.clearRect(0, 0, W, H);

  // Overlay gelap di luar kotak
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, by);           // atas
  ctx.fillRect(0, by + bh, W, H);      // bawah
  ctx.fillRect(0, by, bx, bh);         // kiri
  ctx.fillRect(bx + bw, by, W, bh);    // kanan

  // Sudut merah
  const cs = 22; // panjang sudut
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'square';

  // Kiri atas
  ctx.beginPath();
  ctx.moveTo(bx, by + cs);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + cs, by);
  ctx.stroke();

  // Kanan atas
  ctx.beginPath();
  ctx.moveTo(bx + bw - cs, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + cs);
  ctx.stroke();

  // Kiri bawah
  ctx.beginPath();
  ctx.moveTo(bx, by + bh - cs);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + cs, by + bh);
  ctx.stroke();

  // Kanan bawah
  ctx.beginPath();
  ctx.moveTo(bx + bw - cs, by + bh);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw - cs, by + bh);
  ctx.stroke();

  // Animasi scanline
  _animateScanline(ctx, bx, by, bw, bh);
}

let _scanlineAnim = null;
let _scanlineY    = 0;
let _scanlineDir  = 1;

function _animateScanline(ctx, bx, by, bw, bh) {
  if (_scanlineAnim) cancelAnimationFrame(_scanlineAnim);

  _scanlineY   = by + 2;
  _scanlineDir = 1;

  function draw() {
    if (!document.getElementById('scan-overlay')) return;

    // Hapus hanya area scanline sebelumnya
    ctx.clearRect(bx + 1, by + 1, bw - 2, bh - 2);

    // Gambar ulang overlay gelap dalam kotak (biar tidak bocor)
    // — tidak perlu, scanline di atas overlay transparan

    // Gambar scanline
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0,    'transparent');
    grad.addColorStop(0.3,  '#ef4444');
    grad.addColorStop(0.5,  '#ff6b6b');
    grad.addColorStop(0.7,  '#ef4444');
    grad.addColorStop(1,    'transparent');

    ctx.fillStyle = grad;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur  = 6;
    ctx.fillRect(bx, _scanlineY, bw, 2);
    ctx.shadowBlur  = 0;

    // Gerakkan scanline
    _scanlineY += _scanlineDir * 1.2;
    if (_scanlineY >= by + bh - 4) _scanlineDir = -1;
    if (_scanlineY <= by + 2)      _scanlineDir =  1;

    _scanlineAnim = requestAnimationFrame(draw);
  }

  draw();
}

function _start() {
  try {
    _scanner = new Html5Qrcode('scanner-view');
    _scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: (vw, vh) => {
          const w = Math.min(vw * 0.85, 320);
          const h = Math.round(w * 0.33);
          return { width: w, height: h };
        },
        aspectRatio: 1.5,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ],
      },
      (code) => _onResult(code),
      () => {},
    ).then(() => {
      // Tunggu video render lalu gambar overlay
      setTimeout(_drawOverlay, 800);
    }).catch(() => {
      const msg = document.getElementById('scanner-msg');
      if (msg) msg.textContent = '⚠️ Tidak bisa akses kamera. Gunakan input manual.';
    });
  } catch {
    const msg = document.getElementById('scanner-msg');
    if (msg) msg.textContent = '⚠️ Scanner tidak tersedia. Gunakan input manual.';
  }
}

function _onResult(code) {
  if (_scanlineAnim) {
    cancelAnimationFrame(_scanlineAnim);
    _scanlineAnim = null;
  }
  const msg = document.getElementById('scanner-msg');
  if (msg) { msg.textContent = `✅ ${code}`; msg.style.color = '#10b981'; }
  if (navigator.vibrate) navigator.vibrate(80);
  setTimeout(() => {
    closeScanner();
    if (_callback) _callback(code);
  }, 350);
}

function _stop() {
  if (_scanlineAnim) {
    cancelAnimationFrame(_scanlineAnim);
    _scanlineAnim = null;
  }
  if (_scanner) { _scanner.stop().catch(() => {}); _scanner = null; }
}

function _ensureLib() {
  return new Promise((resolve, reject) => {
    if (window.Html5Qrcode) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = LIB_URL;
    s.onload   = resolve;
    s.onerror  = reject;
    document.head.appendChild(s);
  });
}
