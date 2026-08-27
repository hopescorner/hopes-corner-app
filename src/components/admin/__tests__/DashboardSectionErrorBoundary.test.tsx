import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DashboardSectionErrorBoundary } from '../DashboardSectionErrorBoundary';

function Boom({ message }: { message: string }) {
    throw new Error(message);
}

beforeEach(() => {
    // Keep the noisy componentDidCatch console.error out of the test output.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('DashboardSectionErrorBoundary', () => {
    it('renders children when no error occurs', () => {
        render(
            <DashboardSectionErrorBoundary sectionLabel="Analytics">
                <div data-testid="child">ok</div>
            </DashboardSectionErrorBoundary>
        );
        expect(screen.getByTestId('child')).toBeDefined();
        expect(screen.queryByTestId('dashboard-section-error-fallback')).toBeNull();
    });

    it('renders a graceful fallback instead of crashing when a child throws', () => {
        render(
            <DashboardSectionErrorBoundary sectionLabel="Analytics">
                <Boom message="infinite render loop #185" />
            </DashboardSectionErrorBoundary>
        );
        const fallback = screen.getByTestId('dashboard-section-error-fallback');
        expect(fallback).toBeDefined();
        expect(fallback.getAttribute('role')).toBe('alert');
        expect(screen.getByText(/Analytics couldn/i)).toBeDefined();
        // Original error message is not shown to users (kept in console only).
        expect(screen.queryByText(/#185/i)).toBeNull();
    });

    it('invokes the onError hook with the error and component info', () => {
        const onError = vi.fn();
        render(
            <DashboardSectionErrorBoundary sectionLabel="Compare" onError={onError}>
                <Boom message="kaboom" />
            </DashboardSectionErrorBoundary>
        );
        expect(onError).toHaveBeenCalledTimes(1);
        const [err, info] = onError.mock.calls[0];
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('kaboom');
        expect(typeof info.componentStack).toBe('string');
    });

    it('lets the user retry via the Try again button', () => {
        let shouldBoom = true;
        function MaybeBoom() {
            if (shouldBoom) throw new Error('boom');
            return <div data-testid="recovered">recovered</div>;
        }

        render(
            <DashboardSectionErrorBoundary sectionLabel="Summary">
                <MaybeBoom />
            </DashboardSectionErrorBoundary>
        );
        expect(screen.getByTestId('dashboard-section-error-fallback')).toBeDefined();

        // Recover the child, then click retry — boundary resets and re-renders child.
        shouldBoom = false;
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(screen.getByTestId('recovered')).toBeDefined();
        expect(screen.queryByTestId('dashboard-section-error-fallback')).toBeNull();
    });

    it('uses a generic label when sectionLabel is omitted', () => {
        render(
            <DashboardSectionErrorBoundary>
                <Boom message="x" />
            </DashboardSectionErrorBoundary>
        );
        expect(screen.getByText(/This section couldn/i)).toBeDefined();
    });
});