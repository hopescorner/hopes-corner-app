/// <reference lib="webworker" />

// IMPORTANT: Update this version when APP_VERSION changes in src/lib/utils/appVersion.ts
const APP_VERSION = '0.7.0';
const STATIC_CACHE_NAME = `hopes-corner-static-v${APP_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching assets for version', APP_VERSION);
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Activate immediately so the new version takes over
    self.skipWaiting();
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            const oldCaches = cacheNames.filter((name) =>
                name.startsWith('hopes-corner-') && name !== STATIC_CACHE_NAME
            );
            return Promise.all(
                oldCaches.map((name) => caches.delete(name))
            ).then(() => {
                // Always notify all clients that a new SW activated
                // (covers both cache-name changes and fresh installs)
                self.clients.matchAll({ type: 'window' }).then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'SW_UPDATED',
                            version: APP_VERSION,
                        });
                    });
                });
            });
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    // Authenticated navigation always uses the network. The cache contains only
    // a neutral shell, never guest data or an authenticated RSC response.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match('/offline.html'))
        );
        return;
    }

    const isVersionedStaticAsset = url.pathname.startsWith('/_next/static/');
    const isPublicStaticAsset = url.pathname.startsWith('/icons/')
        || url.pathname === '/manifest.json'
        || url.pathname.endsWith('.svg');

    // Never cache APIs, RSC payloads, or arbitrary authenticated GET responses.
    if (request.method !== 'GET' || (!isVersionedStaticAsset && !isPublicStaticAsset)) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});

// Handle push notifications (future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
        });
    }
});
