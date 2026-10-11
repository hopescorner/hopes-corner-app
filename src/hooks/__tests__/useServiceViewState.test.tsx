import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useServiceViewState } from '../useServiceViewState';
import { useServiceClock } from '../useServiceClock';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('service view preferences', () => {
    it('restores the last view after the section remounts', () => {
        const first = renderHook(() => useServiceViewState<string>('test-search', ''));
        act(() => first.result.current[1]('Jane'));
        first.unmount();
        const second = renderHook(() => useServiceViewState<string>('test-search', ''));
        expect(second.result.current[0]).toBe('Jane');
    });
    it('keeps controls usable when browser storage is unavailable', () => {
        vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('Disabled'); }, setItem: () => { throw new Error('Disabled'); } });
        const { result } = renderHook(() => useServiceViewState<string>('test-search', ''));
        act(() => result.current[1]('Jane'));
        expect(result.current[0]).toBe('Jane');
    });
    it('ignores corrupt or unsupported saved preferences', () => {
        sessionStorage.setItem('service-view:test-view', JSON.stringify('unknown'));
        const { result } = renderHook(() => useServiceViewState<'list' | 'grid'>('test-view', 'list', ['list', 'grid']));
        expect(result.current[0]).toBe('list');
    });
});

describe('service clock', () => {
    it('refreshes visible elapsed times and pauses updates in the background', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-11T16:00:00Z'));
        const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
        const { result, unmount } = renderHook(() => useServiceClock());
        act(() => vi.advanceTimersByTime(60_000));
        expect(result.current).toBe(Date.parse('2026-10-11T16:01:00Z'));
        visibility.mockReturnValue('hidden');
        act(() => vi.advanceTimersByTime(120_000));
        expect(result.current).toBe(Date.parse('2026-10-11T16:01:00Z'));
        visibility.mockReturnValue('visible');
        act(() => document.dispatchEvent(new Event('visibilitychange')));
        expect(result.current).toBe(Date.parse('2026-10-11T16:03:00Z'));
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });
});
