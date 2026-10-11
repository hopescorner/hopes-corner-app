'use client';

import { useEffect } from 'react';

export function useServiceScrollPosition(service: string) {
    useEffect(() => {
        const key = `service-scroll:${service}`;
        let lastPosition = window.scrollY;
        let frame = 0;
        try {
            const saved = Number(sessionStorage.getItem(key));
            if (Number.isFinite(saved) && saved > 0) {
                frame = window.requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'instant' }));
            }
        } catch { /* Scroll restoration is optional when storage is disabled. */ }
        const remember = () => { lastPosition = window.scrollY; };
        window.addEventListener('scroll', remember, { passive: true });
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', remember);
            try { sessionStorage.setItem(key, String(lastPosition)); } catch { /* Optional preference. */ }
        };
    }, [service]);
}
