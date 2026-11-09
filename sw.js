// Jissr service worker: lets the app open offline and be installed.
// Strategy: network first (so new versions show immediately), fall back to the saved copy when offline.
// Bump VERSION on every release so old saved copies are cleared.
const VERSION = 'jissr-v29';
const SHELL = [
  '/', '/index.html', '/patient.html', '/staff.html', '/metrics.html', '/review.html', '/trust.html', '/impact.html', '/pilot.html', '/roles.html', '/app.html', '/care.html', '/app-shell.css', '/styles.css', '/manifest.webmanifest',
  '/core/rules.mjs', '/core/cases.mjs', '/core/data.mjs', '/core/store.mjs', '/core/templates.mjs', '/core/ui.mjs', '/core/fhir.mjs', '/core/programmes.mjs', '/core/pwa.mjs', '/core/art.mjs', '/core/tour.mjs', '/core/roles.mjs',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png',
  '/fonts/readex-pro-latin-400-normal.woff2', '/fonts/readex-pro-latin-500-normal.woff2', '/fonts/readex-pro-latin-600-normal.woff2',
  '/fonts/readex-pro-arabic-400-normal.woff2', '/fonts/readex-pro-arabic-500-normal.woff2', '/fonts/readex-pro-arabic-600-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return; // AI calls are never cached
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/patient.html') : Response.error())))
  );
});
