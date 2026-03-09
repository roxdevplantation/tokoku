/**
 * components/ui.js — Reusable UI primitives: Toast, Modal, FAB.
 * Setiap fungsi hanya manipulasi DOM yang sudah ada di index.html.
 */

// ── Toast ────────────────────────────────────────────────────────────────────

let _toastTimer = null;

/**
 * @param {string} msg
 * @param {'success'|'error'|'info'} type
 */
export function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(_toastTimer);
  el.textContent = msg;
  el.className = `show ${type}`;
  _toastTimer = setTimeout(() => { el.className = ''; }, 2600);
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function openModal(id) {
  document.getElementById(id)?.classList.add('show');
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
}

/** Isi konten modal sekaligus buka. */
export function showModal(id, { title, titleEl, body, bodyEl }) {
  if (title && titleEl) {
    const t = document.getElementById(titleEl);
    if (t) t.textContent = title;
  }
  if (body && bodyEl) {
    const b = document.getElementById(bodyEl);
    if (b) b.innerHTML = body;
  }
  openModal(id);
}

// ── FAB ──────────────────────────────────────────────────────────────────────

let _currentFab = null;

export function setFab(onClick) {
  removeFab();
  const btn = document.createElement('button');
  btn.className = 'fab';
  btn.innerHTML = '+';
  btn.setAttribute('aria-label', 'Tambah baru');
  btn.addEventListener('click', onClick);
  document.body.appendChild(btn);
  _currentFab = btn;
}

export function removeFab() {
  _currentFab?.remove();
  _currentFab = null;
}

// ── Sync indicator ───────────────────────────────────────────────────────────

const STATUS_MAP = {
  online:  { cls: 'online',  text: 'Online' },
  offline: { cls: '',        text: 'Offline' },
  syncing: { cls: 'syncing', text: 'Syncing…' },
};

export function setSyncStatus(status) {
  const dot  = document.getElementById('sync-dot');
  const txt  = document.getElementById('sync-text');
  const banner = document.getElementById('offline-banner');
  const s = STATUS_MAP[status] ?? STATUS_MAP.offline;
  if (dot) dot.className = s.cls;
  if (txt) txt.textContent = s.text;
  if (banner) banner.classList.toggle('show', status === 'offline');
}

// ── Swipe-to-close for modals ────────────────────────────────────────────────

export function initSwipeClose() {
  document.querySelectorAll('.modal').forEach(modal => {
    let startY = 0;
    modal.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
    modal.addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 80) {
        const overlay = modal.closest('.modal-overlay');
        if (overlay) closeModal(overlay.id);
      }
    });
  });

  // Tap overlay to close
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
  });
}
