const _routes        = new Map();
let   _current       = null;
let   _onChange      = null;
let   _popstateReady = false;

export function register(name, title, renderFn) {
  _routes.set(name, { title, render: renderFn });
}

export function onChange(fn) {
  _onChange = fn;
}

export function navigate(name, pushHistory = true) {
  const route = _routes.get(name);
  if (!route) { console.warn(`[Router] Unknown route: ${name}`); return; }

  _current = name;
  _onChange?.(name, route.title);
  route.render();

  if (pushHistory) {
    history.pushState({ page: name }, '', `#${name}`);
  }
}

export function current() { return _current; }

export function refresh() {
  if (_current) navigate(_current, false);
}

export function initBackHandler() {
  if (_popstateReady) return;
  _popstateReady = true;

  history.replaceState({ page: 'dashboard' }, '', '#dashboard');

  window.addEventListener('popstate', (e) => {
  const page = e.state?.page;

  // Jika ada modal terbuka, biarkan ui.js yang handle
  const openModals = document.querySelectorAll('.modal-overlay.show');
  if (openModals.length > 0) return;

  // Jika ada scanner terbuka, biarkan scanner.js yang handle
  if (document.getElementById('modal-scanner')) return;

  if (page) {
    navigate(page, false);
  } else {
    // Sudah di paling awal — kalau di dashboard, keluar app
    if (_current === 'dashboard') {
      // Tidak push ulang, biarkan app tertutup natural
      return;
    }
    // Kalau di halaman lain, kembali ke dashboard
    navigate('dashboard', false);
    history.replaceState({ page: 'dashboard' }, '', '#dashboard');
  }
  });
}
