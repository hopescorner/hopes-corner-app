import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShowerBookingModal } from '../ShowerBookingModal';
import { LaundryBookingModal } from '../LaundryBookingModal';

let mockRole: 'checkin' | 'staff' = 'checkin';

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
        mockRole = 'checkin';
    });

    it('renders quick-book button for check-in role', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Confirm Booking')).toBeDefined();
    });

    it('shows the next open slot time', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText(/The next available shower is at/i)).toBeDefined();
    });

    it('shows the quick-book title', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Book Next Slot')).toBeDefined();
    });

    it('does not show manual slot grid for check-in role', () => {
        render(<ShowerBookingModal />);
        expect(screen.queryByText('Select an available time')).toBeNull();
    });

    it('shows fairness guidance for check-in role', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText(/only book the next available slot/i)).toBeDefined();
    });

    it('calls handleBook when clicking the next-available button', async () => {
        mockAddShowerRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<ShowerBookingModal />);

        const bookButton = screen.getByRole('button', { name: /confirm booking/i });
        fireEvent.click(bookButton);

        // Should have attempted to book
        expect(mockAddShowerRecord).toHaveBeenCalledWith('g1', expect.any(String));
    });

    it('does not show waitlist option in check-in quick-book flow', () => {
        render(<ShowerBookingModal />);
        expect(screen.queryByText('Add to Waitlist')).toBeNull();
    });
});

describe('LaundryBookingModal — Book Next Available', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'checkin';
    });

    it('renders quick-book button for check-in role in onsite mode', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Confirm Booking')).toBeDefined();
    });

    it('shows the next open slot time for onsite', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText(/Next available at/i)).toBeDefined();
    });

    it('shows onsite quick-book title', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Next On-site Slot')).toBeDefined();
    });

    it('does not show manual slot list for check-in role', () => {
        render(<LaundryBookingModal />);
        expect(screen.queryByText('Select an available slot')).toBeNull();
    });

    it('hides onsite next-available copy when switching to offsite mode', () => {
        render(<LaundryBookingModal />);
        // Switch to offsite
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);

        expect(screen.queryByText('Next On-site Slot')).toBeNull();
        expect(screen.getByText('Book Off-site')).toBeDefined();
    });

    it('calls handleBook when clicking the next-available button', async () => {
        mockAddLaundryRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<LaundryBookingModal />);

        const bookButton = screen.getByRole('button', { name: /confirm booking/i });
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
        expect(screen.getByText('Confirm Booking')).toBeDefined();
        expect(screen.getByText(/Next available at/i)).toBeDefined();
        expect(screen.getByText('7:30 AM - 8:30 AM')).toBeDefined();
    });
});
