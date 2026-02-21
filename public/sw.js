/// <reference lib="webworker" />

// IMPORTANT: Update this version when APP_VERSION changes in src/lib/utils/appVersion.ts
const APP_VERSION = '0.5.1';
const CACHE_NAME = `hopes-corner-v${APP_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/check-in',
    '/services',
    '/dashboard',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
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
            const oldCaches = cacheNames.filter((name) => name !== CACHE_NAME);
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

    // Skip API requests - always go to network
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // For navigation requests, try network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/');
                    });
                })
        );
        return;
    }

    // For other requests, use stale-while-revalidate strategy
    // Only cache GET requests - POST, PUT, DELETE etc. cannot be cached
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            const networkFetch = fetch(request).then((response) => {
                // Cache successful GET responses only
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            });

            return cached || networkFetch;
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
