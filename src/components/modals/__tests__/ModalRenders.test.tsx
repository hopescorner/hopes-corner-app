import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GuestEditModal } from '../GuestEditModal';
import { BanManagementModal } from '../BanManagementModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { ShowerBookingModal } from '../ShowerBookingModal';
import { LaundryBookingModal } from '../LaundryBookingModal';
import { ShowerDetailModal } from '../../services/ShowerDetailModal';
import { BicycleRepairBookingModal } from '../BicycleRepairBookingModal';
import { WarningManagementModal } from '../WarningManagementModal';
import { WhatsNewModal } from '../WhatsNewModal';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
    SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

// Mock stores
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
        updateGuest: vi.fn(),
        deleteGuest: vi.fn(),
        banGuest: vi.fn(),
        clearGuestBan: vi.fn(),
        getWarningsForGuest: vi.fn(() => []),
        addGuestWarning: vi.fn(),
        removeGuestWarning: vi.fn(),
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        loading: false,
        fetchBlockedSlots: vi.fn(),
        isSlotBlocked: vi.fn(() => false),
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        addShowerRecord: vi.fn(),
        addLaundryRecord: vi.fn(),
        addBicycleRecord: vi.fn(),
        addShowerWaitlist: vi.fn(),
        loadFromSupabase: vi.fn(),
        showerRecords: [],
        laundryRecords: [],
        bicycleRecords: [],
    })),
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        bicyclePickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe', bicycleDescription: 'Red Trek' },
        showerPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        laundryPickerGuest: { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' },
        setBicyclePickerGuest: vi.fn(),
        setShowerPickerGuest: vi.fn(),
        setLaundryPickerGuest: vi.fn(),
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(() => ({
        addAction: vi.fn(),
    })),
}));

vi.mock('@/stores/useItemsStore', () => ({
    useItemsStore: vi.fn(() => ({
        fetchItemsForGuest: vi.fn(),
        checkAvailability: vi.fn(() => ({ available: true })),
        giveItem: vi.fn(),
        distributedItems: [],
        isLoading: false,
    })),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        hasActiveWaiver: vi.fn(async () => true),
        guestNeedsWaiverReminder: vi.fn(async () => false),
        waiverVersion: 1,
    })),
}));

const mockGuest = { id: 'g1', firstName: 'John', lastName: 'Doe', name: 'John Doe' };

describe('Modal Rendering', () => {
    it('GuestEditModal renders correctly', () => {
        render(<GuestEditModal guest={mockGuest as any} onClose={vi.fn()} />);
        expect(screen.getByRole('heading', { name: /Edit Guest/i })).toBeDefined();
    });

    it('BanManagementModal renders correctly', () => {
        render(<BanManagementModal guest={mockGuest as any} onClose={vi.fn()} />);
        expect(screen.getByRole('heading', { name: /Ban Guest/i })).toBeDefined();
    });

    it('DeleteConfirmationModal renders correctly', () => {
        render(<DeleteConfirmationModal isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} title="Delete Guest" message="Are you sure?" />);
        expect(screen.getByText(/Delete Guest/i)).toBeDefined();
    });

    it('ShowerBookingModal renders correctly', () => {
        render(<ShowerBookingModal />);
        expect(screen.getByRole('heading', { name: /Book a Shower/i })).toBeDefined();
    });

    it('LaundryBookingModal renders correctly', () => {
        render(<LaundryBookingModal />);
        expect(screen.getByRole('heading', { name: /Laundry Booking/i })).toBeDefined();
    });

    // For BicycleRepairBookingModal, it uses a global store for state
    it('BicycleRepairBookingModal renders correctly', () => {
        render(<BicycleRepairBookingModal />);
        expect(screen.getByText(/Bicycle Repair/i)).toBeDefined();
    });

    it('WarningManagementModal renders correctly', () => {
        render(<WarningManagementModal guest={mockGuest as any} onClose={vi.fn()} />);
        expect(screen.getByText(/Manage Warnings/i)).toBeDefined();
    });

    it('WhatsNewModal renders correctly', () => {
        render(<WhatsNewModal isOpen={true} onClose={vi.fn()} />);
        expect(screen.getByText(/What's New/i)).toBeDefined();
    });

    it('ShowerDetailModal renders correctly', () => {
        render(<ShowerDetailModal
            isOpen={true}
            onClose={vi.fn()}
            record={{
                id: 's1',
                guestId: 'g1',
                status: 'active',
                time: '10:00 AM'
            }}
            guest={mockGuest as any}
        />);
        expect(screen.getByText(/Shower Details & Amenities/i)).toBeDefined();
    });
});
