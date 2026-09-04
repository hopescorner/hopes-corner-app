import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UndoTray } from '../UndoTray';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';
import { useGuestsStore } from '@/stores/useGuestsStore';

const mockApplyUndo = vi.fn();
let snapshotReady = false;

vi.mock('@/stores/useCheckInStore', () => ({
    useCheckInStore: (selector: any) => selector({
        isReady: snapshotReady,
        applyUndo: mockApplyUndo,
    }),
}));

describe('UndoTray', () => {
    const mockUndo = vi.fn().mockResolvedValue(true);

    const freshAction = () => ({
        id: 'act-1',
        type: 'MEAL_ADDED' as const,
        timestamp: new Date().toISOString(),
        data: { guestId: 'g1', recordId: 'rec-1' },
    });

    beforeEach(() => {
        vi.clearAllMocks();
        snapshotReady = false;
        useGuestsStore.setState({
            guests: [
                {
                    id: 'g1',
                    firstName: 'John',
                    lastName: 'Doe',
                    name: 'John Doe',
                    preferredName: 'Johnny',
                } as any,
            ],
        });
        useActionHistoryStore.setState({
            actionHistory: [freshAction()],
            undoAction: mockUndo as any,
        });
    });

    it('shows the latest action with the guest name', () => {
        render(<UndoTray />);
        expect(screen.getByText('Meal · Johnny')).toBeDefined();
        expect(screen.getByRole('button', { name: /undo/i })).toBeDefined();
    });

    it('renders null when there are no actions', () => {
        useActionHistoryStore.setState({ actionHistory: [] });
        const { container } = render(<UndoTray />);
        expect(container.firstChild).toBeNull();
    });

    it('renders null for a stale action outside the fresh window', () => {
        const stale = freshAction();
        stale.timestamp = new Date(Date.now() - 10_000).toISOString();
        useActionHistoryStore.setState({ actionHistory: [stale] });
        const { container } = render(<UndoTray />);
        expect(container.firstChild).toBeNull();
    });

    it('falls back to "Guest" when the guest is unknown', () => {
        useGuestsStore.setState({ guests: [] });
        render(<UndoTray />);
        expect(screen.getByText('Meal · Guest')).toBeDefined();
    });

    it('calls undoAction with the latest action id when undo is clicked', async () => {
        render(<UndoTray />);
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));

        await waitFor(() => {
            expect(mockUndo).toHaveBeenCalledWith('act-1');
        });
    });

    it('applies the snapshot undo when the check-in snapshot is ready', async () => {
        snapshotReady = true;
        render(<UndoTray />);
        fireEvent.click(screen.getByRole('button', { name: /undo/i }));

        await waitFor(() => {
            expect(mockApplyUndo).toHaveBeenCalledWith({
                type: 'MEAL_ADDED',
                guestId: 'g1',
                recordId: 'rec-1',
                quantity: undefined,
            });
        });
    });

    it('hides the tray when dismissed', () => {
        const { container } = render(<UndoTray />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(container.firstChild).toBeNull();
    });
});
