import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSecretTap } from '../useSecretTap';

describe('useSecretTap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires callback after required number of rapid taps', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useSecretTap(onActivate, 7, 2000));

    // Simulate 7 rapid clicks
    act(() => {
      for (let i = 0; i < 7; i++) {
        result.current();
      }
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire if taps are too slow (outside window)', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useSecretTap(onActivate, 7, 2000));

    // Simulate 4 taps, then wait too long, then 4 more
    act(() => {
      for (let i = 0; i < 4; i++) {
        result.current();
      }
    });

    // Advance time past the window
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    act(() => {
      for (let i = 0; i < 3; i++) {
        result.current();
      }
    });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('resets after successful activation', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useSecretTap(onActivate, 3, 2000));

    // First activation
    act(() => {
      for (let i = 0; i < 3; i++) {
        result.current();
      }
    });
    expect(onActivate).toHaveBeenCalledTimes(1);

    // One more tap should not re-trigger (counter was reset)
    act(() => {
      result.current();
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('uses custom tap count', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() => useSecretTap(onActivate, 3, 2000));

    act(() => {
      for (let i = 0; i < 3; i++) {
        result.current();
      }
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
