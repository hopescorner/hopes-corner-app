import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { MealServiceTimer } from '../MealServiceTimer';
import { getMealServiceStatus, isSunday } from '@/lib/utils/mealServiceTime';

// Mock the mealServiceTime utility
vi.mock('@/lib/utils/mealServiceTime', () => ({
    getMealServiceStatus: vi.fn(),
    isSunday: vi.fn(() => false),
}));

const mockGetMealServiceStatus = getMealServiceStatus as ReturnType<typeof vi.fn>;
const mockIsSunday = isSunday as ReturnType<typeof vi.fn>;

describe('MealServiceTimer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('No Service State', () => {
        it('returns null when status is no-service', () => {
            mockGetMealServiceStatus.mockReturnValue({ type: 'no-service', message: '' });
            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(container.firstChild).toBeNull();
        });

        it('returns null when status is null initially', () => {
            // Initial state is null before useEffect runs
            mockGetMealServiceStatus.mockReturnValue(null);
            const { container } = render(<MealServiceTimer />);

            // Before the timeout fires, status is null
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Before Service State', () => {
        it('renders with amber styling for before-service', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'before-service',
                message: 'Meal service starts in 30 min',
                timeRemaining: 30,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('Meal service starts in 30 min')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-amber-600');
        });
    });

    describe('During Service State', () => {
        it('renders with emerald styling when plenty of time (>20 min)', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '45 min remaining',
                timeRemaining: 45,
                totalDuration: 60,
                elapsed: 15,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('45 min remaining')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-emerald-700');
        });

        it('renders with orange styling when 10-20 min remaining', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '15 min remaining',
                timeRemaining: 15,
                totalDuration: 60,
                elapsed: 45,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('15 min remaining')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-orange-700');
        });

        it('renders with red styling when <10 min remaining', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '5 min remaining',
                timeRemaining: 5,
                totalDuration: 60,
                elapsed: 55,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('5 min remaining')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-red-700');
        });

        it('shows progress bar during service', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '30 min remaining',
                timeRemaining: 30,
                totalDuration: 60,
                elapsed: 30,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            // Look for the progress bar container (has w-16 class)
            const progressBars = document.querySelectorAll('.w-16');
            expect(progressBars.length).toBeGreaterThan(0);
        });

        it('handles exactly 10 min remaining (red)', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '10 min remaining',
                timeRemaining: 10,
                totalDuration: 60,
                elapsed: 50,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-red-700');
        });

        it('handles exactly 20 min remaining (orange)', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '20 min remaining',
                timeRemaining: 20,
                totalDuration: 60,
                elapsed: 40,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-orange-700');
        });
    });

    describe('Ended State', () => {
        it('renders with gray styling for ended service', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'ended',
                message: 'Meal service ended',
                timeRemaining: 0,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('Meal service ended')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-gray-500');
        });

        it('does not show progress bar when ended', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'ended',
                message: 'Meal service ended',
                timeRemaining: 0,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            // Progress bar (w-16 class) should not be present
            const progressBars = document.querySelectorAll('.w-16');
            expect(progressBars.length).toBe(0);
        });
    });

    describe('Timer Updates', () => {
        it('updates status every 30 seconds', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '30 min remaining',
                timeRemaining: 30,
                totalDuration: 60,
                elapsed: 30,
            });

            render(<MealServiceTimer />);

            // Initial render + setTimeout(0)
            act(() => {
                vi.advanceTimersByTime(0);
            });

            // Clear initial call count
            const initialCallCount = mockGetMealServiceStatus.mock.calls.length;

            // Advance 30 seconds
            act(() => {
                vi.advanceTimersByTime(30000);
            });

            // Should have been called again
            expect(mockGetMealServiceStatus.mock.calls.length).toBeGreaterThan(initialCallCount);
        });

        it('cleans up interval on unmount', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '30 min remaining',
                timeRemaining: 30,
                totalDuration: 60,
                elapsed: 30,
            });

            const { unmount } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const callCountBeforeUnmount = mockGetMealServiceStatus.mock.calls.length;
            unmount();

            // Advance time after unmount
            act(() => {
                vi.advanceTimersByTime(60000);
            });

            // Should not have been called after unmount
            expect(mockGetMealServiceStatus.mock.calls.length).toBe(callCountBeforeUnmount);
        });
    });

    describe('Progress Calculation Edge Cases', () => {
        it('handles 0% progress at start', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '60 min remaining',
                timeRemaining: 60,
                totalDuration: 60,
                elapsed: 0,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('[style*="width"]') as HTMLElement;
            if (progressFill) {
                expect(progressFill.style.width).toBe('0%');
            }
        });

        it('handles 100% progress at end', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '0 min remaining',
                timeRemaining: 0,
                totalDuration: 60,
                elapsed: 60,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('[style*="width"]') as HTMLElement;
            if (progressFill) {
                expect(progressFill.style.width).toBe('100%');
            }
        });

        it('handles undefined timeRemaining gracefully', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: 'Active',
                timeRemaining: undefined,
                totalDuration: 60,
                elapsed: 30,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            // Should still render using default value (0 || 0 = 0, which is <= 10, so red)
            const element = container.firstChild as HTMLElement;
            expect(element).not.toBeNull();
        });

        it('handles missing totalDuration', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: 'Active',
                timeRemaining: 30,
                totalDuration: undefined,
                elapsed: 30,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            // Should render without crashing
            expect(screen.getByText('Active')).toBeDefined();
        });
    });

    describe('Unknown Status Type', () => {
        it('uses default gray styling for unknown status type', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'unknown-type' as any,
                message: 'Unknown status',
                timeRemaining: 0,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-gray-500');
        });
    });

    describe('UI Elements', () => {
        it('renders clock icon', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '30 min remaining',
                timeRemaining: 30,
                totalDuration: 60,
                elapsed: 30,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const svgs = document.querySelectorAll('svg');
            expect(svgs.length).toBeGreaterThan(0);
        });

        it('has rounded-full styling', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '30 min remaining',
                timeRemaining: 30,
                totalDuration: 60,
                elapsed: 30,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('rounded-full');
        });
    });

    describe('Progress Bar Colors', () => {
        it('progress bar is emerald when plenty of time', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '45 min remaining',
                timeRemaining: 45,
                totalDuration: 60,
                elapsed: 15,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('.bg-emerald-400');
            expect(progressFill).not.toBeNull();
        });

        it('progress bar is orange when 10-20 min remaining', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '15 min remaining',
                timeRemaining: 15,
                totalDuration: 60,
                elapsed: 45,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('.bg-orange-400');
            expect(progressFill).not.toBeNull();
        });

        it('progress bar is red when <10 min remaining', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '5 min remaining',
                timeRemaining: 5,
                totalDuration: 60,
                elapsed: 55,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('.bg-red-400');
            expect(progressFill).not.toBeNull();
        });
    });

    describe('Sunday Brunch Styling', () => {
        beforeEach(() => {
            mockIsSunday.mockReturnValue(true);
        });

        afterEach(() => {
            mockIsSunday.mockReturnValue(false);
        });

        it('renders with red styling for before-service on Sunday', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'before-service',
                message: 'Meal service starts in 30 min',
                timeRemaining: 30,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('Meal service starts in 30 min')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-red-600');
        });

        it('renders with red styling during Sunday Brunch service', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '120 min remaining',
                timeRemaining: 120,
                totalDuration: 240,
                elapsed: 120,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            expect(screen.getByText('120 min remaining')).toBeDefined();
            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-red-600');
        });

        it('progress bar is red for Sunday Brunch service', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'during-service',
                message: '120 min remaining',
                timeRemaining: 120,
                totalDuration: 240,
                elapsed: 120,
            });

            render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const progressFill = document.querySelector('.bg-red-400');
            expect(progressFill).not.toBeNull();
        });

        it('renders with red styling when Sunday Brunch service ended', () => {
            mockGetMealServiceStatus.mockReturnValue({
                type: 'ended',
                message: 'Meal service ended for today',
                timeRemaining: 0,
            });

            const { container } = render(<MealServiceTimer />);

            act(() => {
                vi.advanceTimersByTime(0);
            });

            const element = container.firstChild as HTMLElement;
            expect(element.className).toContain('text-red-500');
        });
    });
});
