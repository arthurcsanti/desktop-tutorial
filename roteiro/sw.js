// Guarda o app no aparelho para abrir e escrever mesmo sem internet.
const CACHE = 'maquina-de-roteiro-v6';
const SHELL = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/app.js', './js/core.js', './js/db.js', './js/drive.js', './js/editor.js', './js/export.js',
  './js/files.js', './js/markdown.js', './js/model.js', './js/zip.js',
  './js/views/library.js', './js/views/moodboard.js', './js/views/referencias.js', './js/views/roteiro.js', './js/views/tabela.js',
  './js/views/planner.js', './js/views/publicacoes.js', './js/views/config.js', './js/config.js',
  './fonts/fonts.css', './fonts/courier-prime-400.woff2', './fonts/courier-prime-400-italic.woff2', './fonts/courier-prime-700.woff2', './fonts/special-elite-400.woff2',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // Só apaga caches deste app: o Lastro, no mesmo endereço, tem os dele.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('maquina-de-roteiro-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google Drive e login nunca passam pelo cache

  // Mostra o que está guardado na hora e atualiza por trás.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = req.mode === 'navigate' ? './index.html' : req;
      const cached = await cache.match(key);
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') cache.put(key, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
