import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShowerBookingModal } from '../ShowerBookingModal';
import { LaundryBookingModal } from '../LaundryBookingModal';

let mockRole: 'checkin' | 'staff' = 'staff';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: mockRole } },
        status: 'authenticated',
    })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// --- Store mocks ---

const mockSetShowerPickerGuest = vi.fn();
const mockSetLaundryPickerGuest = vi.fn();
const mockAddShowerRecord = vi.fn();
const mockAddShowerWaitlist = vi.fn();
const mockAddLaundryRecord = vi.fn();
const mockAddAction = vi.fn();
const mockFetchBlockedSlots = vi.fn();
const mockIsSlotBlocked = vi.fn(() => false);

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        showerPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        laundryPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        setShowerPickerGuest: mockSetShowerPickerGuest,
        setLaundryPickerGuest: mockSetLaundryPickerGuest,
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        showerRecords: [],
        laundryRecords: [],
        addShowerRecord: mockAddShowerRecord,
        addShowerWaitlist: mockAddShowerWaitlist,
        addLaundryRecord: mockAddLaundryRecord,
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(() => ({
        addAction: mockAddAction,
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        fetchBlockedSlots: mockFetchBlockedSlots,
        isSlotBlocked: mockIsSlotBlocked,
    })),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        hasActiveWaiver: vi.fn(async () => true),
        guestNeedsWaiverReminder: vi.fn(async () => false),
        waiverVersion: 1,
    })),
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: vi.fn(() => ({
        reminders: [],
        loadFromSupabase: vi.fn(),
    })),
}));

vi.mock('@/components/ui/ReminderIndicator', () => ({
    ServiceCardReminder: () => null,
}));

describe('ShowerBookingModal — Book Next Available', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
    });

    it('renders "Book Next Available Slot" button for staff', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Book Next Available Slot')).toBeDefined();
    });

    it('shows the next open slot time', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText(/Next open:/)).toBeDefined();
    });

    it('shows "or pick a time" divider', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('or pick a time')).toBeDefined();
    });

    it('shows the manual slot grid below the quick-book button', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Select an available time')).toBeDefined();
        expect(screen.getByText('2 GUESTS PER SLOT')).toBeDefined();
    });

    it('shows "Book" badge on the next-available button when a slot exists', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Book')).toBeDefined();
    });

    it('calls handleBook when clicking the next-available button', async () => {
        mockAddShowerRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<ShowerBookingModal />);

        const bookButton = screen.getByText('Book Next Available Slot').closest('button')!;
        fireEvent.click(bookButton);

        // Should have attempted to book
        expect(mockAddShowerRecord).toHaveBeenCalledWith('g1', expect.any(String));
    });

    it('still shows the waitlist option', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Add to Waitlist')).toBeDefined();
    });
});

describe('LaundryBookingModal — Book Next Available', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
    });

    it('renders "Book Next Available Slot" button for staff in onsite mode', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Book Next Available Slot')).toBeDefined();
    });

    it('shows the next open slot time for onsite', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText(/Next open:/)).toBeDefined();
    });

    it('shows "or pick a slot" divider in onsite mode', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('or pick a slot')).toBeDefined();
    });

    it('shows the manual slot list below the quick-book button', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Select an available slot')).toBeDefined();
    });

    it('hides next-available button when switching to offsite mode', () => {
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);

        expect(screen.queryByText('Book Next Available Slot')).toBeNull();
    });

    it('calls handleBook when clicking the next-available button', async () => {
        mockAddLaundryRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<LaundryBookingModal />);

        const bookButton = screen.getByText('Book Next Available Slot').closest('button')!;
        fireEvent.click(bookButton);

        // Should have attempted to book with onsite type and slot label
        expect(mockAddLaundryRecord).toHaveBeenCalledWith('g1', 'onsite', expect.any(String), '');
    });

    it('does not count past-day laundry records as booked slots', async () => {
        // Set up laundry records from a past date occupying a slot
        const { useServicesStore } = await import('@/stores/useServicesStore');
        (useServicesStore as any).mockReturnValueOnce({
            showerRecords: [],
            laundryRecords: [
                { id: 'past-1', guestId: 'g2', time: '07:30 - 08:30', laundryType: 'onsite', status: 'done', date: '2020-01-01', createdAt: '2020-01-01T07:30:00Z' },
            ],
            addShowerRecord: mockAddShowerRecord,
            addShowerWaitlist: mockAddShowerWaitlist,
            addLaundryRecord: mockAddLaundryRecord,
        });

        render(<LaundryBookingModal />);

        // The first slot (07:30 - 08:30) should still be available since the record is from 2020
        expect(screen.getByText('Book Next Available Slot')).toBeDefined();
        expect(screen.getByText(/Next open:/)).toBeDefined();
        expect(screen.getAllByText('7:30 AM - 8:30 AM').length).toBeGreaterThan(0);
    });
});
