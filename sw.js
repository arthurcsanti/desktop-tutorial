// Guarda todos os arquivos do app no aparelho: depois da primeira abertura, funciona sem internet.
// Ao publicar uma versão nova, troque VERSION para o iPhone baixar os arquivos atualizados.
const VERSION = 'lastro-1.1.0';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/vault.js', 'js/categorize.js', 'js/parsers.js', 'js/analysis.js', 'js/exports.js', 'js/sample.js',
  'icons/logo.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/pdf.min.js', 'vendor/pdf.worker.min.js', 'vendor/xlsx.full.min.js', 'vendor/mammoth.browser.min.js',
  'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
