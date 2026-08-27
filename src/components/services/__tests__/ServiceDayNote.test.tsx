import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockOpenNoteModal, state } = vi.hoisted(() => ({
    mockOpenNoteModal: vi.fn(),
    state: {
        notes: [] as Array<{
            id: string;
            noteDate: string;
            noteEndDate?: string | null;
            serviceType: 'meals' | 'showers' | 'laundry' | 'general';
            noteText: string;
        }>,
    },
}));

vi.mock('@/stores/useDailyNotesStore', () => ({
    useDailyNotesStore: (selector: (store: unknown) => unknown) => selector({
        notes: state.notes,
    }),
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: (selector: (store: unknown) => unknown) => selector({
        openNoteModal: mockOpenNoteModal,
    }),
}));

import { ServiceDayNote } from '../ServiceDayNote';

describe('ServiceDayNote', () => {
    beforeEach(() => {
        state.notes = [];
        vi.clearAllMocks();
    });

    it.each([
        ['meals', 'Meal'],
        ['showers', 'Shower'],
        ['laundry', 'Laundry'],
    ] as const)('shows an existing %s note for the selected date', (serviceType, label) => {
        state.notes = [{
            id: 'note-1',
            noteDate: '2026-07-11',
            serviceType,
            noteText: `${label} service was limited`,
        }];

        render(<ServiceDayNote date="2026-07-11" serviceType={serviceType} />);

        expect(screen.getByText(`${label} note`)).toBeInTheDocument();
        expect(screen.getByText(`${label} service was limited`)).toBeInTheDocument();
    });

    it('opens the note editor on the selected historical date when no note exists', () => {
        render(<ServiceDayNote date="2026-07-13" serviceType="showers" />);

        fireEvent.click(screen.getByRole('button', { name: 'Add shower note' }));

        expect(mockOpenNoteModal).toHaveBeenCalledWith('2026-07-13', 'showers');
    });

    it('edits a multi-day note from its original start date', () => {
        state.notes = [{
            id: 'note-range',
            noteDate: '2026-07-10',
            noteEndDate: '2026-07-13',
            serviceType: 'laundry',
            noteText: 'Dryer unavailable',
        }];

        render(<ServiceDayNote date="2026-07-13" serviceType="laundry" />);
        fireEvent.click(screen.getByRole('button', { name: 'Edit laundry note' }));

        expect(mockOpenNoteModal).toHaveBeenCalledWith('2026-07-10', 'laundry');
    });

});
