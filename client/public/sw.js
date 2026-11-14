/* Clock me Out service worker.
   Keeps the app shell (pages, icons, scripts, fonts) available offline.
   Your saved data is never cached here: it lives in the API (another origin) and the app loads it from the cloud first.
   Update VERSION with every release so old caches are cleared. */
const VERSION = '3.12.1';
const CACHE = `clock-me-out-${VERSION}`;
const PRECACHE = ['/', '/app.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/favicon.svg', '/mascot-dir.webp', '/mascot-react.webp'];
const EXTERNAL = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('clock-me-out-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function remember(req, res) {
  if (res && (res.ok || res.type === 'opaque')) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

// Pages: always try the network first so updates show straight away; fall back to the saved copy when offline.
async function networkFirst(req, fallback) {
  try { return await remember(req, await Promise.race([fetch(req), timeout(5000)])); }
  catch { return (await caches.match(req)) || (fallback && (await caches.match(fallback))) || Response.error(); }
}
// Files that never change under the same URL (hashed scripts, images).
async function cacheFirst(req) {
  return (await caches.match(req)) || remember(req, await fetch(req));
}
// Everything else: show the saved copy now, refresh it in the background.
async function staleWhileRevalidate(req) {
  const hit = await caches.match(req);
  const fresh = fetch(req).then((res) => remember(req, res)).catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === '/sw.js') return;
    if (req.mode === 'navigate') return event.respondWith(networkFirst(req, url.pathname.startsWith('/app') ? '/app.html' : '/'));
    if (url.pathname === '/app.html') return event.respondWith(networkFirst(req, '/app.html'));
    if (url.pathname.startsWith('/assets/') || /\.(?:png|webp|svg|ico)$/.test(url.pathname)) return event.respondWith(cacheFirst(req));
    return event.respondWith(staleWhileRevalidate(req));
  }
  if (EXTERNAL.includes(url.hostname)) event.respondWith(staleWhileRevalidate(req));
});
