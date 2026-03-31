const CACHE_VERSION = 'v4';
const STATIC_CACHE = `unitranslate-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `unitranslate-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [
    '/',
    OFFLINE_URL,
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/manifest.json',
    '/static/images/icon-192.png',
    '/static/images/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => key.startsWith('unitranslate-') && ![STATIC_CACHE, DYNAMIC_CACHE].includes(key))
                .map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    if (event.request.mode === 'navigate') {
        event.respondWith(handleNavigation(event.request));
        return;
    }

    if (url.origin === self.location.origin && url.pathname.startsWith('/static/')) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(event.request));
    }
});

async function handleNavigation(request) {
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }

        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    return cached || networkPromise || Response.error();
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response && response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
    }
}

