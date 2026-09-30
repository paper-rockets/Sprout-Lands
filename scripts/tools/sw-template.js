// The offline helper for the built game. scripts/tools/pwa-plugin.mjs fills in the three
// values below and writes this out as dist/sw.js. Do not register it while developing.

const PREFIX = __PREFIX__; // this game's own storage names start with this
const CACHE = PREFIX + __VERSION__;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // A few at a time, so a slow tablet connection is not flooded.
      for (let i = 0; i < PRECACHE.length; i += 8) await cache.addAll(PRECACHE.slice(i, i + 8));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
      if (hit) return hit;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') cache.put(request, response.clone()); // e.g. a song, the first time it plays
        return response;
      } catch (err) {
        if (request.mode === 'navigate') {
          const page = await cache.match('./');
          if (page) return page;
        }
        throw err;
      }
    })
  );
});
