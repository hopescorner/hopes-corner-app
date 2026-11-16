'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isTurkeySeason } from '@/lib/seasonal';

const schedules = {
    checkin: { cooldownMs: 15 * 60_000, key: 'hopes-corner:running-turkey:last-run' },
    services: { cooldownMs: 60 * 60_000, key: 'hopes-corner:running-turkey:services-last-run' },
};
type Mode = keyof typeof schedules;
const lastRunWithoutStorage: Partial<Record<Mode, number>> = {};

export function RunningTurkey({ active, mode = 'checkin' }: { active?: boolean; mode?: Mode }) {
    const timeoutRef = useRef<number | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const finishRun = useCallback(() => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsRunning(false);
    }, []);

    useEffect(() => {
        const { key, cooldownMs } = schedules[mode];
        let wasAtBottom = false;

        const getLastRun = () => {
            const fallback = lastRunWithoutStorage[mode];
            try {
                const stored = Number(window.localStorage.getItem(key) ?? NaN);
                return Number.isFinite(stored) ? Math.max(stored, fallback ?? -Infinity) : fallback;
            } catch {
                return fallback;
            }
        };

        const saveLastRun = (time: number) => {
            try {
                window.localStorage.setItem(key, String(time));
                delete lastRunWithoutStorage[mode];
            } catch {
                lastRunWithoutStorage[mode] = time;
            }
        };

        const startRun = (now: number) => {
            if (!(active ?? isTurkeySeason()) ||
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

            saveLastRun(now);
            setIsRunning(true);
            timeoutRef.current = window.setTimeout(finishRun, 4600);
        };

        const onScroll = () => {
            const page = document.scrollingElement ?? document.documentElement;
            const atBottom = page.scrollTop > 0 &&
                page.scrollHeight - page.clientHeight - page.scrollTop <= 1;
            const reachedBottom = atBottom && !wasAtBottom;
            wasAtBottom = atBottom;

            if (!reachedBottom) return;
            const now = Date.now();
            if (now - (getLastRun() ?? -Infinity) >= cooldownMs) startRun(now);
        };

        let hourlyTimer: number | undefined;
        const scheduleHourlyRun = () => {
            window.clearTimeout(hourlyTimer);
            if (document.hidden) return;

            const now = Date.now();
            const lastRun = getLastRun();
            // Start the first hour when either service tab is first opened.
            if (lastRun === undefined) saveLastRun(now);

            const remaining = (lastRun ?? now) + cooldownMs - now;
            if (remaining <= 0) startRun(now);
            hourlyTimer = window.setTimeout(scheduleHourlyRun, remaining > 0 ? remaining : cooldownMs);
        };

        if (mode === 'services') {
            document.addEventListener('visibilitychange', scheduleHourlyRun);
            scheduleHourlyRun();
        } else {
            window.addEventListener('scroll', onScroll, { passive: true });
        }
        return () => {
            document.removeEventListener('visibilitychange', scheduleHourlyRun);
            window.clearTimeout(hourlyTimer);
            window.removeEventListener('scroll', onScroll);
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        };
    }, [active, finishRun, mode]);

    if (!isRunning) return null;

    return (
        <div
            data-testid="running-turkey-overlay"
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-[9.5rem] z-20 select-none overflow-hidden md:bottom-6 motion-reduce:hidden"
        >
            <div
                data-testid="running-turkey-runner"
                onAnimationEnd={finishRun}
                className="turkey-run-across w-28 sm:w-36 md:w-44"
            >
                <div className="turkey-run-sprite aspect-square" />
            </div>
        </div>
    );
}
