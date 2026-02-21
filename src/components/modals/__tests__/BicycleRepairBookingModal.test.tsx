import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BicycleRepairBookingModal } from '../BicycleRepairBookingModal';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mutable guest list so tests can update it
let mockGuests: any[] = [];

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector: any) => {
        const state = { guests: mockGuests };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

// Modal store mock with mutable picker guest
let mockBicyclePickerGuest: any = null;
const mockSetBicyclePickerGuest = vi.fn((g: any) => { mockBicyclePickerGuest = g; });

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn(() => ({
        bicyclePickerGuest: mockBicyclePickerGuest,
        setBicyclePickerGuest: mockSetBicyclePickerGuest,
    })),
}));

const mockAddBicycleRecord = vi.fn();

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        addBicycleRecord: mockAddBicycleRecord,
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: vi.fn(() => ({
        addAction: vi.fn(),
    })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock ReminderIndicator
vi.mock('@/components/ui/ReminderIndicator', () => ({
    ServiceCardReminder: () => null,
}));

describe('BicycleRepairBookingModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGuests = [];
        mockBicyclePickerGuest = null;
    });

    it('does not render when no bicyclePickerGuest is set', () => {
        const { container } = render(<BicycleRepairBookingModal />);
        expect(container.innerHTML).toBe('');
    });

    it('renders when bicyclePickerGuest is set', () => {
        mockBicyclePickerGuest = { id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: 'Red Trek' };
        mockGuests = [{ id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: 'Red Trek' }];

        render(<BicycleRepairBookingModal />);
        expect(screen.getByText('Bicycle Repair')).toBeDefined();
        expect(screen.getByText('Red Trek')).toBeDefined();
    });

    it('reads fresh bicycle description from guests store, not stale modal snapshot', () => {
        // Simulate: modal was opened when guest had no bicycle description
        mockBicyclePickerGuest = { id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' };

        // But the guests store now has the updated description (guest was edited)
        mockGuests = [{ id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: 'Blue mountain bike, 26 inch' }];

        render(<BicycleRepairBookingModal />);

        // Should show the fresh description from the store, not "Missing Description"
        expect(screen.getByText('Blue mountain bike, 26 inch')).toBeDefined();
        expect(screen.queryByText('Missing Description')).toBeNull();
    });

    it('shows missing description when neither store nor snapshot has one', () => {
        mockBicyclePickerGuest = { id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' };
        mockGuests = [{ id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' }];

        render(<BicycleRepairBookingModal />);
        expect(screen.getByText('Missing Description')).toBeDefined();
    });

    it('falls back to modal snapshot when guest is not in the store', () => {
        mockBicyclePickerGuest = { id: 'g99', firstName: 'Ghost', name: 'Ghost Rider', bicycleDescription: 'Black Schwinn' };
        mockGuests = []; // Guest not in store

        render(<BicycleRepairBookingModal />);
        expect(screen.getByText('Black Schwinn')).toBeDefined();
    });

    it('disables Log Repair button when guest has no bicycle description', () => {
        mockBicyclePickerGuest = { id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' };
        mockGuests = [{ id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' }];

        render(<BicycleRepairBookingModal />);

        // Select a repair type
        fireEvent.click(screen.getByText('Flat Tire'));

        // Log Repair button should be disabled because there's no bike description
        const logButton = screen.getByText('Log Repair').closest('button') as HTMLButtonElement;
        expect(logButton?.disabled).toBe(true);
        expect(mockAddBicycleRecord).not.toHaveBeenCalled();
    });

    it('allows booking when fresh guest has bicycle description', async () => {
        mockBicyclePickerGuest = { id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: '' };
        mockGuests = [{ id: 'g1', firstName: 'Mike', name: 'Mike Jones', bicycleDescription: 'Red Trek' }];
        mockAddBicycleRecord.mockResolvedValue({ id: 'r1' });

        render(<BicycleRepairBookingModal />);

        // Select a repair type
        fireEvent.click(screen.getByText('Flat Tire'));

        // Book - should succeed because fresh store has the description
        fireEvent.click(screen.getByText('Log Repair'));

        await waitFor(() => {
            expect(mockAddBicycleRecord).toHaveBeenCalledWith('g1', expect.objectContaining({
                repairTypes: ['Flat Tire'],
            }));
        });
    });
});
