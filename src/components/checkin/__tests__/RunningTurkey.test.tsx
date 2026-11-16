import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunningTurkey } from '../RunningTurkey';

const overlay = () => screen.queryByTestId('running-turkey-overlay');
const endRun = () => fireEvent.animationEnd(screen.getByTestId('running-turkey-runner'));

function scrollTo(top: number) {
    document.documentElement.scrollTop = top;
    fireEvent.scroll(window);
}

describe('RunningTurkey', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-16T20:00:00Z'));
        window.localStorage.clear();
        document.documentElement.scrollTop = 0;
        vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
        vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders nothing when the season is inactive', () => {
        const { container } = render(<RunningTurkey active={false} />);
        scrollTo(1200);
        expect(container.firstChild).toBeNull();
    });

    it('runs a decorative sprite only when a scroll reaches the page bottom', () => {
        render(<RunningTurkey active />);
        expect(overlay()).toBeNull();
        scrollTo(1100);
        expect(overlay()).toBeNull();
        scrollTo(1200);
        expect(overlay()).toHaveAttribute('aria-hidden', 'true');
        expect(overlay()).toHaveClass('pointer-events-none');
        endRun();
        expect(overlay()).toBeNull();
    });

    it('waits 15 minutes and another trip to the bottom, even after remounting', () => {
        const { unmount } = render(<RunningTurkey active />);
        scrollTo(1200);
        endRun();
        unmount();

        render(<RunningTurkey active />);
        vi.advanceTimersByTime(14 * 60_000 + 59_999);
        scrollTo(0);
        scrollTo(1200);
        expect(overlay()).toBeNull();

        vi.advanceTimersByTime(1);
        scrollTo(1200);
        expect(overlay()).toBeNull();
        scrollTo(0);
        scrollTo(1200);
        expect(overlay()).toBeInTheDocument();
    });
});
