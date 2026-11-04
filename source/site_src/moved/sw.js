/* Konfetti Deco moved to konfetti-deco.github.io. This worker removes the old Konfetti Deco caches (loulou-*, konfetti-*) and itself,
   then reloads the open window, which forwards to the new address. Caches of other apps on this address are left alone. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys(); await Promise.all(ks.filter((k) => (k.startsWith('loulou-') || k.startsWith('konfetti-'))).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach((c) => c.navigate(c.url));
  })());
});
self.addEventListener('fetch', () => {});
