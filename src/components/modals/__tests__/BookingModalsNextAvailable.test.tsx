import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShowerBookingModal } from '../ShowerBookingModal';
import { LaundryBookingModal } from '../LaundryBookingModal';
import { useServicesStore } from '@/stores/useServicesStore';
import { generateShowerSlots, generateLaundrySlots } from '@/lib/utils/serviceSlots';

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
const mockIsSlotBlocked = vi.fn((..._args: any[]) => false);

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        showerPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        laundryPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        setShowerPickerGuest: mockSetShowerPickerGuest,
        setLaundryPickerGuest: mockSetLaundryPickerGuest,
    })),
}));

const mockShowerRecords: any[] = [];
const mockLaundryRecords: any[] = [];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        showerRecords: mockShowerRecords,
        laundryRecords: mockLaundryRecords,
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
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
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

    it('displays next open time prominently with large text for readability', () => {
        render(<ShowerBookingModal />);
        // "Next open:" is now on its own line as a label
        const nextOpenLabel = screen.getByText('Next open:');
        expect(nextOpenLabel.tagName).toBe('P');
        // The time is rendered in a separate large element
        const timeElement = nextOpenLabel.nextElementSibling;
        expect(timeElement).toBeTruthy();
        expect(timeElement!.className).toContain('text-2xl');
        expect(timeElement!.className).toContain('font-black');
    });
});

describe('LaundryBookingModal — Book Next Available', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
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

    it('does not count past-day laundry records as booked slots', () => {
        // Push a past-date laundry record into the shared array
        mockLaundryRecords.push(
            { id: 'past-1', guestId: 'g2', time: '07:30 - 08:30', laundryType: 'onsite', status: 'done', date: '2020-01-01', createdAt: '2020-01-01T07:30:00Z' },
        );

        render(<LaundryBookingModal />);

        // The first slot (07:30 - 08:30) should still be available since the record is from 2020
        expect(screen.getByText('Book Next Available Slot')).toBeDefined();
        expect(screen.getByText(/Next open:/)).toBeDefined();
        expect(screen.getAllByText('7:30 AM - 8:30 AM').length).toBeGreaterThan(0);
    });

    it('displays next open time prominently with large text for readability', () => {
        render(<LaundryBookingModal />);
        const nextOpenLabel = screen.getByText('Next open:');
        expect(nextOpenLabel.tagName).toBe('P');
        const timeElement = nextOpenLabel.nextElementSibling;
        expect(timeElement).toBeTruthy();
        expect(timeElement!.className).toContain('text-2xl');
        expect(timeElement!.className).toContain('font-black');
    });
});

describe('ShowerBookingModal — Checkin Role', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'checkin';
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    it('shows "Book Next Slot" heading for checkin role', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Book Next Slot')).toBeDefined();
    });

    it('shows "Confirm Booking" button for checkin role', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText('Confirm Booking')).toBeDefined();
    });

    it('does not show manual slot grid for checkin role', () => {
        render(<ShowerBookingModal />);
        expect(screen.queryByText('Select an available time')).toBeNull();
        expect(screen.queryByText('or pick a time')).toBeNull();
    });

    it('shows fair distribution notice for checkin role', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByText(/fair service distribution/)).toBeDefined();
    });

    it('shows "Join Waitlist" when all slots are full in checkin role', () => {
        const todayISO = new Date().toISOString();
        const allSlots = generateShowerSlots();
        allSlots.forEach((s, i) => {
            mockShowerRecords.push({ id: `s1-${i}`, guestId: `ga${i}`, time: s, date: todayISO, status: 'booked' });
            mockShowerRecords.push({ id: `s2-${i}`, guestId: `gb${i}`, time: s, date: todayISO, status: 'booked' });
        });

        render(<ShowerBookingModal />);
        expect(screen.getByText('All slots are full for today')).toBeDefined();
        expect(screen.getByText('Join Waitlist')).toBeDefined();
    });

    it('calls handleBook with next available slot on Confirm Booking click', async () => {
        mockAddShowerRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<ShowerBookingModal />);

        const confirmBtn = screen.getByText('Confirm Booking').closest('button')!;
        fireEvent.click(confirmBtn);

        expect(mockAddShowerRecord).toHaveBeenCalledWith('g1', expect.any(String));
    });
});

describe('ShowerBookingModal — Blocked Slots in Staff Grid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    it('shows "Blocked" badge for blocked slots in the grid', () => {
        mockIsSlotBlocked.mockImplementation((...args: any[]) => args[1] === '08:00');

        render(<ShowerBookingModal />);
        expect(screen.getByText('Blocked')).toBeDefined();
    });

    it('disables blocked slot buttons', () => {
        mockIsSlotBlocked.mockImplementation((...args: any[]) => args[1] === '08:00');

        render(<ShowerBookingModal />);
        const blockedButtons = screen.getAllByRole('button').filter(b =>
            b.textContent?.includes('Blocked')
        );
        expect(blockedButtons.length).toBeGreaterThanOrEqual(1);
        expect(blockedButtons[0]).toBeDisabled();
    });

    it('shows "All slots are full for today" when all slots booked in staff view', () => {
        const todayISO = new Date().toISOString();
        const allSlots = generateShowerSlots();
        allSlots.forEach((s, i) => {
            mockShowerRecords.push({ id: `s1-${i}`, guestId: `ga${i}`, time: s, date: todayISO, status: 'booked' });
            mockShowerRecords.push({ id: `s2-${i}`, guestId: `gb${i}`, time: s, date: todayISO, status: 'booked' });
        });

        render(<ShowerBookingModal />);
        expect(screen.getByText('All slots are full for today')).toBeDefined();
    });
});

describe('LaundryBookingModal — Checkin Role', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'checkin';
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    it('shows "Next On-site Slot" heading for checkin role onsite', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Next On-site Slot')).toBeDefined();
    });

    it('shows "Confirm Booking" button for checkin role onsite', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByText('Confirm Booking')).toBeDefined();
    });

    it('does not show manual slot list for checkin role', () => {
        render(<LaundryBookingModal />);
        expect(screen.queryByText('Select an available slot')).toBeNull();
        expect(screen.queryByText('or pick a slot')).toBeNull();
    });

    it('shows "Off-site Laundry" heading when switching to offsite in checkin role', () => {
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);
        expect(screen.getByText('Off-site Laundry')).toBeDefined();
    });

    it('shows "Book Off-site" button for checkin offsite', () => {
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);
        expect(screen.getByText('Book Off-site')).toBeDefined();
    });

    it('calls addLaundryRecord with offsite type on Book Off-site click', async () => {
        mockAddLaundryRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);

        const bookBtn = screen.getByText('Book Off-site').closest('button')!;
        fireEvent.click(bookBtn);

        expect(mockAddLaundryRecord).toHaveBeenCalledWith('g1', 'offsite', undefined, '');
    });
});

describe('LaundryBookingModal — Staff Offsite & Blocked Slots', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    it('shows "Book Off-site Now" button in staff offsite mode', () => {
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);
        expect(screen.getByText('Book Off-site Now')).toBeDefined();
    });

    it('calls addLaundryRecord with offsite type on staff Book Off-site Now click', async () => {
        mockAddLaundryRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<LaundryBookingModal />);
        const offsiteTab = screen.getByRole('button', { name: /offsite service/i });
        fireEvent.click(offsiteTab);

        const bookBtn = screen.getByText('Book Off-site Now').closest('button')!;
        fireEvent.click(bookBtn);

        expect(mockAddLaundryRecord).toHaveBeenCalledWith('g1', 'offsite', undefined, '');
    });

    it('shows "Blocked" indicator for blocked laundry slots in staff grid', () => {
        mockIsSlotBlocked.mockImplementation((...args: any[]) =>
            args[1] === '07:30 - 08:30'
        );

        render(<LaundryBookingModal />);
        expect(screen.getByText('Blocked')).toBeDefined();
    });

    it('disables blocked laundry slot buttons', () => {
        mockIsSlotBlocked.mockImplementation((...args: any[]) =>
            args[1] === '07:30 - 08:30'
        );

        render(<LaundryBookingModal />);
        const blockedButtons = screen.getAllByRole('button').filter(b =>
            b.textContent?.includes('Blocked')
        );
        expect(blockedButtons.length).toBeGreaterThanOrEqual(1);
        expect(blockedButtons[0]).toBeDisabled();
    });

    it('shows "All on-site slots are booked" when all onsite slots are taken in staff view', () => {
        const todayISO = new Date().toISOString();
        const allSlots = generateLaundrySlots();
        allSlots.forEach((s, i) => {
            mockLaundryRecords.push({ id: `l-${i}`, guestId: `g${i}`, time: s, date: todayISO, status: 'waiting', laundryType: 'onsite' });
        });

        render(<LaundryBookingModal />);
        expect(screen.getByText('All on-site slots are booked')).toBeDefined();
    });

    it('passes bag number to addLaundryRecord', () => {
        mockAddLaundryRecord.mockResolvedValueOnce({ id: 'r1' });
        render(<LaundryBookingModal />);

        const bagInput = screen.getByPlaceholderText('Bag or Ticket Number');
        fireEvent.change(bagInput, { target: { value: 'BAG-42' } });

        const bookButton = screen.getByText('Book Next Available Slot').closest('button')!;
        fireEvent.click(bookButton);

        expect(mockAddLaundryRecord).toHaveBeenCalledWith('g1', 'onsite', expect.any(String), 'BAG-42');
    });
});
