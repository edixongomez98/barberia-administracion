/* ═══════════════════════════════════════════════════════════
   🪒 LA BARBER · SERVICE WORKER
   Cambia SOLO la línea VERSION cuando actualices
   ═══════════════════════════════════════════════════════════ */

const VERSION = 'v1.4.0';                    // 👈 ÚNICO lugar
const CACHE_NAME = `labarber-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './agendar.html',
  './admin.html',
  './config.js',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-maskable-512.png'
];

// ─── INSTALL ───
self.addEventListener('install', (event) => {
  console.log(`📦 SW ${VERSION} instalando…`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`⚠️ No se pudo cachear ${url}`))
        )
      ))
      .then(() => {
        console.log(`✅ SW ${VERSION} instalado`);
        return self.skipWaiting();
      })
  );
});

// ─── ACTIVATE ───
self.addEventListener('activate', (event) => {
  console.log(`🔄 SW ${VERSION} activando…`);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log(`🗑️ Eliminando caché antigua: ${key}`);
              return caches.delete(key);
            })
      ))
      .then(() => {
        console.log(`✅ SW ${VERSION} activo`);
        // Notificar a clientes abiertos
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              version: VERSION
            });
          });
        });
        return self.clients.claim();
      })
  );
});

// ─── FETCH ───
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

  if (event.request.method !== 'GET') return;

  // Google Fonts → red primero
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Recursos locales → cache first
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// ─── MENSAJES ───
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('⏭️ Saltando espera…');
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});