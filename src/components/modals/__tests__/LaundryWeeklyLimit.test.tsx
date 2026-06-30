import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LaundryBookingModal } from '../LaundryBookingModal';

// Default role for these tests is 'staff' so we see the full slot picker +
// "Book Next Available" + "Book Off-site Now" controls.
let mockRole: 'checkin' | 'staff' | 'admin' = 'staff';

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

const mockSetLaundryPickerGuest = vi.fn();
const mockAddLaundryRecord = vi.fn();
const mockAddAction = vi.fn();
const mockFetchBlockedSlots = vi.fn();
const mockIsSlotBlocked = vi.fn((..._args: any[]) => false);

let mockWeeklyUsage: any = {
    count: 0,
    max: 2,
    remaining: 2,
    limitReached: false,
    weekStart: '2026-06-29',
    nextWeekStart: '2026-07-06',
};

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        laundryPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        setLaundryPickerGuest: mockSetLaundryPickerGuest,
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        laundryRecords: [],
        addLaundryRecord: mockAddLaundryRecord,
        loadFromSupabase: vi.fn(),
        getLaundryWeeklyUsage: () => mockWeeklyUsage,
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

describe('LaundryBookingModal — weekly limit UX', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRole = 'staff';
        mockWeeklyUsage = {
            count: 0,
            max: 2,
            remaining: 2,
            limitReached: false,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
    });

    it('shows the weekly usage banner with remaining count when under the limit', () => {
        mockWeeklyUsage = {
            count: 1,
            max: 2,
            remaining: 1,
            limitReached: false,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
        render(<LaundryBookingModal />);
        expect(screen.getByText(/1\/2 loads/i)).toBeTruthy();
        expect(screen.getByText(/1 remaining this week/i)).toBeTruthy();
        // Limit-reached banner should NOT render
        expect(screen.queryByText(/Weekly laundry limit reached/i)).toBeNull();
    });

    it('shows the limit-reached banner and disables the "Book Next Available" button when the cap is hit', () => {
        mockWeeklyUsage = {
            count: 2,
            max: 2,
            remaining: 0,
            limitReached: true,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
        render(<LaundryBookingModal />);
        // Limit-reached banner renders with the count...
        expect(screen.getByText(/Weekly laundry limit reached \(2\/2 loads\)/i)).toBeTruthy();
        // ...and mentions the next-Monday reset date
        expect(screen.getByText(/Monday/i)).toBeTruthy();
        // The "Book Next Available Slot" button exists but is disabled
        const nextBtn = screen.getByRole('button', { name: /Book Next Available Slot/i });
        expect(nextBtn).toBeTruthy();
        expect(nextBtn).toBeDisabled();
    });

    it('disables every on-site slot button in the grid when the weekly limit is reached', () => {
        mockWeeklyUsage = {
            count: 2,
            max: 2,
            remaining: 0,
            limitReached: true,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
        render(<LaundryBookingModal />);
        // All rendered slot buttons should be disabled
        const slotButtons = screen.getAllByRole('button').filter((b) =>
            /\d{1,2}:\d{2}\s+(AM|PM)/.test(b.textContent || '')
        );
        expect(slotButtons.length).toBeGreaterThan(0);
        slotButtons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it('disables the staff "Book Off-site Now" button when the weekly limit is reached', async () => {
        mockRole = 'staff';
        mockWeeklyUsage = {
            count: 2,
            max: 2,
            remaining: 0,
            limitReached: true,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
        render(<LaundryBookingModal />);
        // Switch to offsite by clicking the "offsite Service" toggle
        const offsiteToggle = screen.getByRole('button', { name: /offsite Service/i });
        fireEvent.click(offsiteToggle);
        const offsiteBtn = await screen.findByRole('button', { name: /Book Off-site Now/i });
        expect(offsiteBtn).toBeTruthy();
        expect(offsiteBtn).toBeDisabled();
    });

    it('shows the limit-reached banner and disables booking for the checkin role too', () => {
        mockRole = 'checkin';
        mockWeeklyUsage = {
            count: 2,
            max: 2,
            remaining: 0,
            limitReached: true,
            weekStart: '2026-06-29',
            nextWeekStart: '2026-07-06',
        };
        render(<LaundryBookingModal />);
        expect(screen.getByText(/Weekly laundry limit reached \(2\/2 loads\)/i)).toBeTruthy();
        // The checkin "Confirm Booking" button should be disabled
        const confirmBtn = screen.getByRole('button', { name: /Confirm Booking/i });
        expect(confirmBtn).toBeDisabled();
    });
});