// Service worker: caché primero para el shell estático y red primero para recursos dinámicos.
// Cada publicación incrementa CACHE; la instalación precarga el shell actualizado antes de activarlo.
const CACHE = 'micartera-v17';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'fiscal.js', 'glyphs.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'fonts/inter-latin.woff2', 'vendor/qrcode.js'];
const SHELL_URLS = new Set(SHELL.map((path) => new URL(path, self.registration.scope).href));

self.addEventListener('install', (event) => {
  // No se activa hasta que el usuario acepte la actualización.
  // Si falla la precarga, la instalación falla y la versión actual sigue funcionando.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('micartera-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;

  // HTML, CSS, JS, fuentes e iconos del shell ya se precargan en install.
  // Cache-first evita volver a descargar y validar todos esos archivos en cada apertura.
  if (SHELL_URLS.has(url.href)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // Para recursos no incluidos en el shell, se conserva red primero y respaldo offline.
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
