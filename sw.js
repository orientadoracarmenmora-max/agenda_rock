const scope = self.registration.scope;
const prefix = 'carmen-agenda:' + scope;
const cacheName = prefix + ':red-primero-v2';
const home = new URL('./', scope).href;
const files = ["./", "./assets/fonts/20fc9b6fc618e7c3.woff2", "./assets/fonts/5bc49d41f32810a1.woff2", "./assets/fonts/7a0049db01fdd8fc.woff2", "./assets/fonts/94b0e8fc568c1361.woff2", "./assets/fonts/e3e520cb7468f2ef.woff2", "./assets/fonts/f273cf2c9ce9bc7d.woff2", "./assets/fonts/licenses/barlowcondensed-OFL.txt", "./assets/fonts/licenses/caveat-OFL.txt", "./assets/fonts/licenses/dmserifdisplay-OFL.txt", "./assets/fonts/licenses/nunito-OFL.txt", "./assets/fonts.css", "./assets/icons/apple-touch-icon.png", "./assets/icons/favicon-32.png", "./assets/icons/icon-192-heavy.png", "./assets/icons/icon-192.png", "./assets/icons/icon-512-heavy.png", "./assets/icons/icon-512.png", "./assets/icons/icon.svg", "./index.html", "./manifest.webmanifest", "./pwa.css", "./pwa.js?v=agenda-update-v3"];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.add(new Request(home, {cache:'reload'}));
    await Promise.allSettled(files.filter(file => new URL(file, scope).href !== home)
      .map(file => cache.add(new Request(new URL(file, scope), {cache:'reload'}))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== cacheName &&
      (key.startsWith(prefix + ':') || key.startsWith(prefix + '-'))).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const isHome = url.pathname === new URL(home).pathname ||
        url.pathname === new URL('index.html', scope).pathname;
      try {
        const response = await fetch(request, {cache:'reload'});
        if (response.ok && isHome) await cache.put(home, response.clone()).catch(() => {});
        return response;
      } catch {
        const saved = await cache.match(isHome ? home : request);
        return saved || new Response('Conéctate a internet para abrir la agenda.', {
          status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}
        });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(request)) || fetch(request);
  })());
});
