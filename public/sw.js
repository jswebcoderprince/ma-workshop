/*
 * MA Engine Lab planner service worker. Makes the app installable and quick to open.
 * It does not make the planner work offline (not in v1): pages and data always come from the server,
 * and without a connection the owner sees /offline.html instead of the browser's error page.
 */
const CACHE = 'maw-v1';
const PRECACHE = ['/offline.html', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Built JS and CSS have a hash in the name, so a cached copy never goes stale.
    if (url.origin === location.origin && url.pathname.startsWith('/build/')) {
        event.respondWith(
            caches.match(req).then(
                (hit) =>
                    hit ||
                    fetch(req).then((res) => {
                        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
                        return res;
                    }),
            ),
        );
        return;
    }

    // Fonts: use the cached copy and refresh it in the background.
    if (url.hostname === 'fonts.bunny.net') {
        event.respondWith(
            caches.open(CACHE).then((c) =>
                c.match(req).then((hit) => {
                    const fresh = fetch(req)
                        .then((res) => {
                            if (res.ok) c.put(req, res.clone());
                            return res;
                        })
                        .catch(() => hit);
                    return hit || fresh;
                }),
            ),
        );
        return;
    }

    // Page loads always go to the server; only when that fails, show the offline page.
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    }
});
