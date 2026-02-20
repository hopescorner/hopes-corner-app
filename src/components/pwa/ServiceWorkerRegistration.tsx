'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerRegistration() {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const handleRefresh = useCallback(() => {
        window.location.reload();
    }, []);

    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker after page load
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[SW] Service Worker registered with scope:', registration.scope);

                        // Check for updates periodically
                        setInterval(() => {
                            registration.update();
                        }, 60 * 60 * 1000); // Check every hour

                        // Detect a waiting service worker (new version ready)
                        if (registration.waiting) {
                            setUpdateAvailable(true);
                        }

                        // Listen for new service worker installing
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'activated') {
                                        setUpdateAvailable(true);
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        console.error('[SW] Service Worker registration failed:', error);
                    });
            });

            // Listen for SW_UPDATED message from new service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'SW_UPDATED') {
                    setUpdateAvailable(true);
                }
            });

            // Handle controller change (new SW took over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[SW] New service worker activated');
                setUpdateAvailable(true);
            });
        }
    }, []);

    if (!updateAvailable) return null;

    return (
        <div
            role="alert"
            className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-700 text-white px-4 py-3 shadow-lg"
        >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <RefreshCw size={16} className="shrink-0 animate-spin-slow" />
                    <p className="text-sm font-semibold truncate">
                        A new version of the app is available
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="shrink-0 px-4 py-1.5 bg-white text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg hover:bg-emerald-50 transition-colors"
                >
                    Refresh Now
                </button>
            </div>
        </div>
    );
}
