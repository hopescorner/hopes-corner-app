import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { RunningTurkey } from '../RunningTurkey';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let observerCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
    constructor(cb: ObserverCallback) {
        observerCallback = cb;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
}

function triggerSentinel(isIntersecting: boolean) {
    if (!observerCallback) throw new Error('no observer captured');
    act(() => {
        observerCallback!([{ isIntersecting }]);
    });
}

describe('RunningTurkey', () => {
    beforeEach(() => {
        observerCallback = null;
        vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('renders nothing when the season is inactive', () => {
        const { container } = render(<RunningTurkey active={false} />);
        expect(container.firstChild).toBeNull();
        expect(screen.queryByTestId('running-turkey-sentinel')).toBeNull();
    });

    it('renders only the sentinel (no turkey) before scrolling to the bottom', () => {
        render(<RunningTurkey active={true} />);
        expect(screen.getByTestId('running-turkey-sentinel')).toBeDefined();
        expect(screen.queryByTestId('running-turkey-overlay')).toBeNull();
    });

    it('shows the turkey when the bottom sentinel becomes visible', () => {
        render(<RunningTurkey active={true} />);
        triggerSentinel(true);
        expect(screen.getByTestId('running-turkey-overlay')).toBeDefined();
        expect(screen.getByTestId('running-turkey-svg')).toBeDefined();
    });

    it('is non-interactable: pointer-events-none, aria-hidden, no controls', () => {
        render(<RunningTurkey active={true} />);
        triggerSentinel(true);
        const overlay = screen.getByTestId('running-turkey-overlay');
        expect(overlay.getAttribute('aria-hidden')).toBe('true');
        expect(overlay.className).toContain('pointer-events-none');
        expect(overlay.querySelector('button')).toBeNull();
        expect(overlay.querySelector('a')).toBeNull();
        expect(overlay.querySelector('input')).toBeNull();
        const svg = screen.getByTestId('running-turkey-svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('viewBox')).toBe('0 0 380 260');
        const sentinel = screen.getByTestId('running-turkey-sentinel');
        expect(sentinel.getAttribute('aria-hidden')).toBe('true');
    });

    it('removes the turkey when the run animation ends', () => {
        render(<RunningTurkey active={true} />);
        triggerSentinel(true);
        expect(screen.getByTestId('running-turkey-overlay')).toBeDefined();
        fireEvent.animationEnd(screen.getByTestId('running-turkey-runner'));
        expect(screen.queryByTestId('running-turkey-overlay')).toBeNull();
    });

    it('does not run again until the user scrolls away and back', () => {
        render(<RunningTurkey active={true} />);
        triggerSentinel(true);
        fireEvent.animationEnd(screen.getByTestId('running-turkey-runner'));
        // Still at the bottom: no second run.
        triggerSentinel(true);
        expect(screen.queryByTestId('running-turkey-overlay')).toBeNull();
        // Scroll away, then back: runs again.
        triggerSentinel(false);
        triggerSentinel(true);
        expect(screen.getByTestId('running-turkey-overlay')).toBeDefined();
    });
});
