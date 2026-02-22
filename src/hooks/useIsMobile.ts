import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 640; // Tailwind `sm`

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

/**
 * Returns `true` when the viewport is narrower than Tailwind's `sm` breakpoint (640 px).
 * SSR-safe — defaults to `false` on the server.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
