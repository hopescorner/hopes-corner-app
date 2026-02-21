import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTodayActionStatusMap } from '../todayStatusSelectors';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';

// Mock the action history store
vi.mock('@/stores/useActionHistoryStore');

describe('todayStatusSelectors', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useTodayActionStatusMap', () => {
        it('tracks MEAL_ADDED actions for undo', () => {
            const mockActionHistory = [
                {
                    id: 'action-1',
                    type: 'MEAL_ADDED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'meal-1', guestId: 'guest-1' },
                },
            ];

            vi.mocked(useActionHistoryStore).mockReturnValue(mockActionHistory);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            const guestActions = actionMap.get('guest-1');

            expect(guestActions).toBeDefined();
            expect(guestActions?.mealActionId).toBe('action-1');
        });

        it('tracks EXTRA_MEALS_ADDED actions for undo', () => {
            const mockActionHistory = [
                {
                    id: 'action-2',
                    type: 'EXTRA_MEALS_ADDED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'extra-1', guestId: 'guest-1' },
                },
            ];

            vi.mocked(useActionHistoryStore).mockReturnValue(mockActionHistory);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            const guestActions = actionMap.get('guest-1');

            expect(guestActions).toBeDefined();
            expect(guestActions?.mealActionId).toBe('action-2');
        });

        it('prioritizes most recent meal action when both MEAL_ADDED and EXTRA_MEALS_ADDED exist', () => {
            // Action history is ordered newest first
            const mockActionHistory = [
                {
                    id: 'action-extra',
                    type: 'EXTRA_MEALS_ADDED' as const,
                    timestamp: new Date(Date.now() + 1000).toISOString(), // More recent
                    data: { recordId: 'extra-1', guestId: 'guest-1' },
                },
                {
                    id: 'action-meal',
                    type: 'MEAL_ADDED' as const,
                    timestamp: new Date().toISOString(), // Older
                    data: { recordId: 'meal-1', guestId: 'guest-1' },
                },
            ];

            vi.mocked(useActionHistoryStore).mockReturnValue(mockActionHistory);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            const guestActions = actionMap.get('guest-1');

            expect(guestActions).toBeDefined();
            // Should be the most recent action (the extra meal)
            expect(guestActions?.mealActionId).toBe('action-extra');
        });

        it('handles multiple guests with different action types', () => {
            const mockActionHistory = [
                {
                    id: 'action-1',
                    type: 'MEAL_ADDED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'meal-1', guestId: 'guest-1' },
                },
                {
                    id: 'action-2',
                    type: 'EXTRA_MEALS_ADDED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'extra-1', guestId: 'guest-2' },
                },
            ];

            vi.mocked(useActionHistoryStore).mockReturnValue(mockActionHistory);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            
            const guest1Actions = actionMap.get('guest-1');
            expect(guest1Actions?.mealActionId).toBe('action-1');
            
            const guest2Actions = actionMap.get('guest-2');
            expect(guest2Actions?.mealActionId).toBe('action-2');
        });

        it('handles empty action history', () => {
            vi.mocked(useActionHistoryStore).mockReturnValue([]);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            expect(actionMap.size).toBe(0);
        });

        it('tracks multiple action types for the same guest', () => {
            const mockActionHistory = [
                {
                    id: 'action-shower',
                    type: 'SHOWER_BOOKED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'shower-1', guestId: 'guest-1' },
                },
                {
                    id: 'action-meal',
                    type: 'MEAL_ADDED' as const,
                    timestamp: new Date().toISOString(),
                    data: { recordId: 'meal-1', guestId: 'guest-1' },
                },
            ];

            vi.mocked(useActionHistoryStore).mockReturnValue(mockActionHistory);

            const { result } = renderHook(() => useTodayActionStatusMap());
            
            const actionMap = result.current;
            const guestActions = actionMap.get('guest-1');

            expect(guestActions).toBeDefined();
            expect(guestActions?.mealActionId).toBe('action-meal');
            expect(guestActions?.showerActionId).toBe('action-shower');
        });
    });
});
