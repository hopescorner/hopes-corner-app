import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HaircutsSection } from '../HaircutsSection';

const addHaircutRecordMock = vi.fn();
const deleteHaircutRecordMock = vi.fn();

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({ data: { user: { role: 'admin' } } })),
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: vi.fn(() => '2026-02-23'),
    pacificDateStringFrom: vi.fn((value: string) => {
        if (!value) return '2026-02-23';
        return value.split('T')[0];
    }),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        haircutRecords: [],
        addHaircutRecord: addHaircutRecordMock,
        deleteHaircutRecord: deleteHaircutRecordMock,
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { id: 'g1', preferredName: 'Jane' },
            { id: 'g2', preferredName: 'Victor' },
        ],
    })),
}));

describe('HaircutsSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        addHaircutRecordMock.mockResolvedValue({ id: 'hc1' });
        deleteHaircutRecordMock.mockResolvedValue(undefined);
    });

    it('renders haircut scheduler UI', () => {
        render(<HaircutsSection />);

        expect(screen.getByText('Haircut Schedule')).toBeDefined();
        expect(screen.getAllByText('Stylist 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Stylist 4').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Assign Slot' })).toBeDefined();
    });

    it('assigns a guest to a stylist slot', async () => {
        render(<HaircutsSection />);

        fireEvent.change(screen.getByLabelText('Guest'), { target: { value: 'g1' } });
        fireEvent.change(screen.getByLabelText('Stylist'), { target: { value: 'Stylist 2' } });
        fireEvent.change(screen.getByLabelText('Time Slot'), { target: { value: '09:30' } });
        fireEvent.click(screen.getByRole('button', { name: 'Assign Slot' }));

        expect(addHaircutRecordMock).toHaveBeenCalledWith('g1', {
            serviceDate: '2026-02-23',
            slotTime: '09:30',
            stylistName: 'Stylist 2',
        });
    });
});
