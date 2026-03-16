
const _routes   = new Map();   // name → { render, title }
let   _current  = null;
let   _onChange = null;

export function register(name, title, renderFn) {
  _routes.set(name, { title, render: renderFn });
}

export function onChange(fn) {
  _onChange = fn;
}

export function navigate(name) {
  const route = _routes.get(name);
  if (!route) { console.warn(`[Router] Unknown route: ${name}`); return; }

  _current = name;
  _onChange?.(name, route.title);
  route.render();
}

export function current() { return _current; }

export function refresh() {
  if (_current) navigate(_current);
}
