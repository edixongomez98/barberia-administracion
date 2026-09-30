/* ═══════════════════════════════════════════════════════════
   🪒 LA BARBER · SERVICE WORKER
   Cambia VERSION cada vez que actualices
   ═══════════════════════════════════════════════════════════ */

const VERSION = 'v1.1.0';
const CACHE_NAME = `labarber-pwa-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-512.png'
];

/* ─── INSTALL ─── */
self.addEventListener('install', (event) => {
  console.log(`📦 SW ${VERSION} instalando…`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(() => console.warn(`⚠️ No cacheado: ${url}`))
        )
      ))
      .then(() => {
        console.log(`✅ SW ${VERSION} instalado`);
        return self.skipWaiting();
      })
  );
});

/* ─── ACTIVATE ─── */
self.addEventListener('activate', (event) => {
  console.log(`🔄 SW ${VERSION} activando…`);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME)
            .map(k => {
              console.log(`🗑️ Caché antigua eliminada: ${k}`);
              return caches.delete(k);
            })
      ))
      .then(() => {
        console.log(`✅ SW ${VERSION} activo`);
        return self.clients.claim();
      })
  );
});

/* ─── FETCH ─── */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API de Google Apps Script → siempre red
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ ok: false, msg: 'Sin conexión' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Solo GET
  if (event.request.method !== 'GET') return;

  // Cache first para locales
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

/* ─── MENSAJES ─── */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});