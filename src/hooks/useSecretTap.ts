import { useRef, useCallback } from 'react';

/**
 * Hook that detects a rapid sequence of taps/clicks on an element.
 * Returns an onClick handler to attach to the target element.
 *
 * @param onActivate - callback fired when the tap sequence completes
 * @param requiredTaps - number of taps needed (default 7)
 * @param windowMs - time window in ms for all taps (default 2000)
 */
export function useSecretTap(
  onActivate: () => void,
  requiredTaps = 7,
  windowMs = 2000,
) {
  const timestamps = useRef<number[]>([]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    // Keep only taps within the time window
    timestamps.current = timestamps.current.filter((t) => now - t < windowMs);
    timestamps.current.push(now);

    if (timestamps.current.length >= requiredTaps) {
      timestamps.current = [];
      onActivate();
    }
  }, [onActivate, requiredTaps, windowMs]);

  return handleClick;
}
