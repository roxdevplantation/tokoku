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
    <div style="position:fixed;inset:0;background:#000d;z-index:500;
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;padding:20px">

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

      <!-- Viewfinder -->
      <div style="width:100%;max-width:420px;border-radius:14px;
                  overflow:hidden;background:#000;position:relative">
        <div id="scanner-view"></div>
        <div style="position:absolute;left:8%;right:8%;height:2px;top:50%;
                    background:linear-gradient(90deg,transparent,#ef4444,transparent);
                    animation:scanline 2s ease-in-out infinite;pointer-events:none">
        </div>
      </div>

      <div id="scanner-msg"
        style="margin-top:14px;font-size:13px;color:#94a3b8;text-align:center;
               min-height:20px">
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
      @keyframes scanline {
        0%,100% { transform:translateY(-40px); opacity:.8; }
        50%      { transform:translateY(40px);  opacity:.8; }
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

function _start() {
  try {
    _scanner = new Html5Qrcode('scanner-view');
    _scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 300, height: 100 },
        aspectRatio: 2.0,
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
    ).catch(() => {
      const msg = document.getElementById('scanner-msg');
      if (msg) msg.textContent = '⚠️ Tidak bisa akses kamera. Gunakan input manual.';
    });
  } catch {
    const msg = document.getElementById('scanner-msg');
    if (msg) msg.textContent = '⚠️ Scanner tidak tersedia. Gunakan input manual.';
  }
}

function _onResult(code) {
  const msg = document.getElementById('scanner-msg');
  if (msg) { msg.textContent = `✅ ${code}`; msg.style.color = '#10b981'; }
  if (navigator.vibrate) navigator.vibrate(80);
  setTimeout(() => {
    closeScanner();
    if (_callback) _callback(code);
  }, 350);
}

function _stop() {
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
