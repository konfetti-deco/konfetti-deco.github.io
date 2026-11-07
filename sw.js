/* Konfetti Deco — offline cache. The page itself: network first (a new version shows as soon as there is a connection),
   the cached copy when offline. Icons, fonts and the PDF library: from the cache, fetched once. */
const CACHE = 'konfetti-202611072151';  // LA CHEF lives on the same address: only caches named konfetti-* are ever touched
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-64.png'];
/* the browser keeps GitHub's pages in its own cache for up to 10 minutes: the page is always asked from the server
   (cache: 'no-cache' — a quick «has it changed?» check), so a new version shows on the next opening */
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))); self.skipWaiting() });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('konfetti-') && k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim() });
self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('firebasedatabase.app')) return;            // the shared projects: always live
  if (r.mode === 'navigate' || u.pathname.endsWith('.webmanifest')) {   // the page and the app description: always fresh when online
    if (r.mode !== 'navigate') { e.respondWith(fetch(r, { cache: 'no-cache' }).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); return res }).catch(() => caches.match(r))); return }
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => { if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)) } return res }).catch(() => caches.match('./index.html')));
    return;
  }
  const cacheable = u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$/.test(u.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)) } return res })));
});
