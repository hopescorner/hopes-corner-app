'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { APP_VERSION } from '@/lib/utils/appVersion';

/** How often to poll /api/version (5 minutes) */
const VERSION_POLL_INTERVAL = 5 * 60 * 1000;

export function ServiceWorkerRegistration() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleRefresh = useCallback(() => {
        window.location.reload();
    }, []);

    useEffect(() => {
        // ── Version polling (works regardless of SW) ──────────────
        // Fetches /api/version and compares with the client-side
        // APP_VERSION constant. This catches every new deployment
        // even when the service-worker byte-comparison misses it.
        const checkForNewVersion = async () => {
            try {
                const res = await fetch('/api/version', { cache: 'no-store' });
                if (!res.ok) return;
                const { version } = await res.json();
                if (version && version !== APP_VERSION) {
                    setUpdateAvailable(true);
                }
            } catch {
                // Network error — skip silently
            }
        };

        // Start polling after a short initial delay
        const initialTimer = setTimeout(checkForNewVersion, 10_000);
        intervalRef.current = setInterval(checkForNewVersion, VERSION_POLL_INTERVAL);

        // ── Service Worker registration ───────────────────────────
        if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[SW] Service Worker registered with scope:', registration.scope);

                        // Check for updates every hour
                        setInterval(() => {
                            registration.update();
                        }, 60 * 60 * 1000);

                        // Detect a waiting service worker (new version ready)
                        if (registration.waiting) {
                            setUpdateAvailable(true);
                        }

                        // Listen for new service worker installing
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    // 'installed' means a new SW is waiting (or will skipWaiting)
                                    if (newWorker.state === 'installed' || newWorker.state === 'activated') {
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

        return () => {
            clearTimeout(initialTimer);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
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
