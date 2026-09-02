'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

interface LiveConnectionPillProps {
    className?: string;
}

const subscribe = (callback: () => void) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
};

const getSnapshot = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);
const getServerSnapshot = () => true;

export function LiveConnectionPill({ className = '' }: LiveConnectionPillProps) {
    const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!isOnline) {
        return (
            <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shadow-sm ${className}`}
                title="Device is offline. Changes will sync when reconnected."
            >
                <WifiOff size={13} className="text-red-500" aria-hidden="true" />
                <span>Offline</span>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm ${className}`}
            title="Realtime sync active"
        >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>Live Sync</span>
        </div>
    );
}
