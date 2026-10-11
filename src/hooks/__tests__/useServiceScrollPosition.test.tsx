import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useServiceScrollPosition } from '../useServiceScrollPosition';

afterEach(() => vi.restoreAllMocks());

it('restores the service scroll position after switching away and back', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { frame = callback; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const y = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    const first = renderHook(() => useServiceScrollPosition('showers'));
    y.mockReturnValue(640);
    act(() => window.dispatchEvent(new Event('scroll')));
    first.unmount();
    y.mockReturnValue(0);
    renderHook(() => useServiceScrollPosition('showers'));
    act(() => frame?.(0));
    expect(scroll).toHaveBeenCalledWith({ top: 640, behavior: 'instant' });
});
