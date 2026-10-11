'use client';

import { useEffect, useState } from 'react';

/** One clock per mounted service section, refreshed only while the page is visible. */
export function useServiceClock() {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
        const timer = window.setInterval(refresh, 60_000);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);
    return now;
}
