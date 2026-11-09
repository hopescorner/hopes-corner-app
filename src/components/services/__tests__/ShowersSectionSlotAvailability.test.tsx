import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2024-01-15',
    pacificDateStringFrom: (date: string) => String(date).split('T')[0],
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

const mockShowerRecords = [
    { id: '1', guestId: 'g1', date: '2024-01-15', dateKey: '2024-01-15', status: 'booked', time: '09:00' },
];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: (selector: any) => {
        const state = {
            showerRecords: mockShowerRecords,
            cancelMultipleShowers: vi.fn(),
            addShowerRecord: vi.fn().mockResolvedValue({ id: 'new-shower' }),
            addShowerWaitlist: vi.fn().mockResolvedValue({ id: 'new-waitlist' }),
            deleteShowerRecord: vi.fn(),
            updateShowerStatus: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: (selector: any) => {
        const state = {
            guests: [{ id: 'g1', name: 'John Doe', preferredName: '' }],
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

const blockedSlots = [
    { id: 'b1', serviceType: 'shower', slotTime: '09:00', date: '2024-01-15', blockedCount: 1 },
    { id: 'b2', serviceType: 'shower', slotTime: '09:30', date: '2024-01-15', blockedCount: 1 },
    { id: 'b3', serviceType: 'shower', slotTime: '10:00', date: '2024-01-15', blockedCount: 2 },
];

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: (selector: any) => {
        const state = {
            blockedSlots,
            isSlotBlocked: () => false,
            fetchBlockedSlots: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('../CompactShowerList', () => ({
    default: () => <div data-testid="compact-shower-list">Compact List</div>,
}));
vi.mock('../ShowerDetailModal', () => ({
    ShowerDetailModal: () => null,
}));
vi.mock('../../admin/SlotBlockModal', () => ({
    SlotBlockModal: () => null,
}));
vi.mock('../EndServiceDayPanel', () => ({
    EndServiceDayPanel: () => null,
}));
vi.mock('../ServiceDatePicker', () => ({
    ServiceDatePicker: () => null,
}));
vi.mock('../ServiceDayNote', () => ({
    ServiceDayNote: () => null,
}));
vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => null,
}));

vi.mock('@/lib/utils/serviceSlots', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/utils/serviceSlots')>();
    return {
        ...actual,
        generateShowerSlots: () => ['09:00', '09:30', '10:00', '10:30', '11:00'],
        formatSlotLabel: (slot: string) => slot,
    };
});

import { ShowersSection } from '../ShowersSection';

describe('ShowersSection backfill slot availability (partial blocking)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marks half-blocked slots by remaining spots and disables full/blocked options', () => {
        render(<ShowersSection />);
        fireEvent.click(screen.getByRole('button', { name: /Add Shower Record/ }));

        // Half-blocked + 1 occupant => full (1/1), disabled
        const fullOption = screen.getByRole('option', { name: /09:00.*Full \(1\/1\)/ });
        expect(fullOption).toBeDisabled();

        // Half-blocked + 0 occupants => 1 spot left, still selectable
        const halfOption = screen.getByRole('option', { name: /09:30.*1 spot left \(0\/1\)/ });
        expect(halfOption).not.toBeDisabled();

        // Fully blocked => disabled as Blocked
        const blockedOption = screen.getByRole('option', { name: /10:00.*Blocked/ });
        expect(blockedOption).toBeDisabled();

        // Open 2-spot slot stays selectable without annotation
        const openOption = screen.getByRole('option', { name: '10:30', exact: true });
        expect(openOption).not.toBeDisabled();
    });
});
