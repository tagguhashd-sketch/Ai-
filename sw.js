/* ==========================================================================
   FeeFlow — service worker
   Makes the whole app work offline after the first visit. Data itself is
   already offline (localStorage); this caches the shell, fonts and icons.
   ========================================================================== */

const VERSION = 'feeflow-v1.0.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/fonts.css',
  'css/tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/views.css',
  'css/print.css',
  'js/core/util.js',
  'js/core/money.js',
  'js/core/importer.js',
  'js/core/store.js',
  'js/core/router.js',
  'js/ui/icons.js',
  'js/ui/toast.js',
  'js/ui/modal.js',
  'js/ui/charts.js',
  'js/ui/components.js',
  'js/ui/list.js',
  'js/views/dashboard.js',
  'js/views/students.js',
  'js/views/import.js',
  'js/views/months.js',
  'js/views/settings.js',
  'js/app.js',
  'assets/fonts/instrument-serif-latin-400-normal.woff2',
  'assets/fonts/instrument-serif-latin-400-italic.woff2',
  'assets/fonts/instrument-serif-latin-ext-400-normal.woff2',
  'assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2',
  'assets/fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2',
  'assets/fonts/jetbrains-mono-latin-wght-normal.woff2',
  'assets/fonts/jetbrains-mono-latin-ext-wght-normal.woff2',
  'assets/icons/favicon.svg',
  'assets/icons/favicon-32.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navigations: network first, fall back to the cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // everything else: cache first, then network (and cache it)
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
