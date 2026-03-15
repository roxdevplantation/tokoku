const _routes        = new Map();   // name → { render, title }
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

// Inisialisasi popstate listener untuk tombol back Android
export function initBackHandler() {
  if (_popstateReady) return;
  _popstateReady = true;

  // Set initial state agar back pertama tidak langsung keluar app
  history.replaceState({ page: 'dashboard' }, '', '#dashboard');

  window.addEventListener('popstate', (e) => {
    const page = e.state?.page;

    if (page && _routes.has(page)) {
      // Navigasi ke halaman sebelumnya tanpa push history lagi
      navigate(page, false);
    } else {
      // Sudah di paling awal — push ulang biar tidak keluar
      history.pushState({ page: _current || 'dashboard' }, '', `#${_current || 'dashboard'}`);
    }
  });
}
