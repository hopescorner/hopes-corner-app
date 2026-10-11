'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

const changeEvent = 'service-view-change';
function subscribe(callback: () => void) {
    window.addEventListener(changeEvent, callback);
    return () => window.removeEventListener(changeEvent, callback);
}
const serverSnapshot = () => null;

/** Remember service controls in this browser tab, including when storage is unavailable. */
export function useServiceViewState<T extends string | boolean>(key: string, initial: T, choices?: readonly T[]) {
    const [fallback, setFallback] = useState(initial);
    const read = useCallback(() => {
        try { return sessionStorage.getItem(`service-view:${key}`); } catch { return null; }
    }, [key]);
    const saved = useSyncExternalStore(subscribe, read, serverSnapshot);
    let value = fallback;
    try {
        const parsed = saved === null ? null : JSON.parse(saved);
        if (typeof parsed === typeof initial && (!choices || choices.includes(parsed))) value = parsed;
    } catch { /* Ignore invalid preferences. */ }
    const update = useCallback((next: T) => {
        setFallback(next);
        try {
            sessionStorage.setItem(`service-view:${key}`, JSON.stringify(next));
            window.dispatchEvent(new Event(changeEvent));
        } catch { /* Storage may be disabled on a shared iPad. */ }
    }, [key]);
    return [value, update] as const;
}
