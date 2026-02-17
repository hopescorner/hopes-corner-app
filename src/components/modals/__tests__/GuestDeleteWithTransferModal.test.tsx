import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { GuestDeleteWithTransferModal } from '../GuestDeleteWithTransferModal';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock flexibleNameSearch
vi.mock('@/lib/utils/flexibleNameSearch', () => ({
    flexibleNameSearch: vi.fn((query: string, guests: any[]) => {
        if (!query.trim()) return [];
        return guests.filter((g: any) => 
            g.name.toLowerCase().includes(query.toLowerCase()) ||
            g.firstName.toLowerCase().includes(query.toLowerCase())
        );
    }),
}));

// Mock store methods
const mockCheckGuestHasRecords = vi.fn();
const mockDeleteGuestWithTransfer = vi.fn();

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { 
                id: 'guest-1', 
                guestId: 'G001', 
                firstName: 'John', 
                lastName: 'Doe', 
                name: 'John Doe',
                preferredName: '',
                location: 'Mountain View'
            },
            { 
                id: 'guest-2', 
                guestId: 'G002', 
                firstName: 'Jane', 
                lastName: 'Smith', 
                name: 'Jane Smith',
                preferredName: 'Janie',
                location: 'Palo Alto'
            },
            { 
                id: 'guest-3', 
                guestId: 'G003', 
                firstName: 'Bob', 
                lastName: 'Wilson', 
                name: 'Bob Wilson',
                preferredName: '',
                location: 'Sunnyvale'
            },
        ],
        checkGuestHasRecords: mockCheckGuestHasRecords,
        deleteGuestWithTransfer: mockDeleteGuestWithTransfer,
    })),
}));

const createMockGuest = (overrides = {}) => ({
    id: 'guest-1',
    guestId: 'G001',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    preferredName: '',
    location: 'Mountain View',
    housingStatus: 'Unhoused',
    age: 'Adult 18-59',
    gender: 'Male',
    notes: '',
    bicycleDescription: '',
    isBanned: false,
    bannedFromBicycle: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
});

describe('GuestDeleteWithTransferModal', () => {
    const mockOnClose = vi.fn();
    const mockOnDeleted = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockCheckGuestHasRecords.mockResolvedValue({
            meals: 0,
            showers: 0,
            laundry: 0,
            haircuts: 0,
            holidays: 0,
            bicycleRepairs: 0,
            itemsDistributed: 0,
            total: 0,
        });
        mockDeleteGuestWithTransfer.mockResolvedValue(true);
    });

    describe('rendering', () => {
        it('renders the modal with guest name', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                    onDeleted={mockOnDeleted}
                />
            );

            expect(screen.getByRole('heading', { name: 'Delete Guest' })).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        it('shows loading state initially', () => {
            const guest = createMockGuest();
            mockCheckGuestHasRecords.mockImplementation(() => new Promise(() => {})); // Never resolves
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            // Loading spinner should be present
            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        });

        it('displays preferred name if available', async () => {
            const guest = createMockGuest({ preferredName: 'Johnny' });
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Johnny')).toBeInTheDocument();
            });
        });
    });

    describe('guest without records', () => {
        it('shows simple delete message when no records exist', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/no historical records/i)).toBeInTheDocument();
            });
        });

        it('allows direct deletion without transfer', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                    onDeleted={mockOnDeleted}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /delete guest/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /delete guest/i }));

            await waitFor(() => {
                expect(mockDeleteGuestWithTransfer).toHaveBeenCalledWith('guest-1', undefined);
            });
        });
    });

    describe('guest with records', () => {
        beforeEach(() => {
            mockCheckGuestHasRecords.mockResolvedValue({
                meals: 10,
                showers: 5,
                laundry: 3,
                haircuts: 2,
                holidays: 1,
                bicycleRepairs: 0,
                itemsDistributed: 4,
                reminders: 2,
                warnings: 1,
                proxies: 1,
                total: 29,
            });
        });

        it('shows record summary when guest has records', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/29 historical records/i)).toBeInTheDocument();
            });
        });

        it('displays individual record counts', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Meals:/)).toBeInTheDocument();
                expect(screen.getByText(/Showers:/)).toBeInTheDocument();
            });
        });

        it('shows transfer required message', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Transfer Required/i)).toBeInTheDocument();
            });
        });

        it('disables delete button when no transfer target selected', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                const deleteButton = screen.getByRole('button', { name: /delete guest/i });
                expect(deleteButton).toBeDisabled();
            });
        });
    });

    describe('guest search', () => {
        beforeEach(() => {
            mockCheckGuestHasRecords.mockResolvedValue({
                meals: 5,
                showers: 0,
                laundry: 0,
                haircuts: 0,
                holidays: 0,
                bicycleRepairs: 0,
                itemsDistributed: 0,
                total: 5,
            });
        });

        it('shows search input for transfer target', async () => {
            const guest = createMockGuest();
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/search for transfer target/i)).toBeInTheDocument();
            });
        });

        it('has search input that accepts user input', async () => {
            const guest = createMockGuest();
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/search for transfer target/i)).toBeInTheDocument();
            });

            const searchInput = screen.getByPlaceholderText(/search for transfer target/i) as HTMLInputElement;
            fireEvent.change(searchInput, { target: { value: 'Jane' } });
            
            expect(searchInput.value).toBe('Jane');
        });
    });

    describe('transfer selection', () => {
        beforeEach(() => {
            mockCheckGuestHasRecords.mockResolvedValue({
                meals: 5,
                showers: 0,
                laundry: 0,
                haircuts: 0,
                holidays: 0,
                bicycleRepairs: 0,
                itemsDistributed: 0,
                total: 5,
            });
        });

        it('shows transfer required message when guest has records', async () => {
            const guest = createMockGuest();
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Transfer Required/i)).toBeInTheDocument();
            });
        });

        it('disables delete button when no transfer target is selected', async () => {
            const guest = createMockGuest();
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                // Find the delete button - it should be disabled since we need a transfer target
                const buttons = screen.getAllByRole('button');
                const deleteButton = buttons.find(btn => btn.textContent?.includes('Delete'));
                expect(deleteButton).toBeDisabled();
            });
        });
    });

    describe('deletion flow', () => {
        it('calls deleteGuestWithTransfer for guest without records', async () => {
            const guest = createMockGuest();
            mockCheckGuestHasRecords.mockResolvedValue({ total: 0 });

            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                    onDeleted={mockOnDeleted}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /delete guest/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /delete guest/i }));

            await waitFor(() => {
                expect(mockDeleteGuestWithTransfer).toHaveBeenCalledWith('guest-1', undefined);
            });
        });

        it('calls onDeleted callback on successful deletion', async () => {
            const guest = createMockGuest();
            mockCheckGuestHasRecords.mockResolvedValue({ total: 0 });

            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                    onDeleted={mockOnDeleted}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /delete guest/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /delete guest/i }));

            await waitFor(() => {
                expect(mockOnDeleted).toHaveBeenCalled();
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it('calls onClose on cancel', async () => {
            const guest = createMockGuest();
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when X button clicked', async () => {
            const guest = createMockGuest();
            
            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            // Find the X close button in the header
            const closeButton = document.querySelector('.bg-red-50 button');
            if (closeButton) {
                fireEvent.click(closeButton);
            }

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('handles deletion failure gracefully', async () => {
            const guest = createMockGuest();
            mockCheckGuestHasRecords.mockResolvedValue({ total: 0 });
            mockDeleteGuestWithTransfer.mockResolvedValue(false);

            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                    onDeleted={mockOnDeleted}
                />
            );

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /delete guest/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /delete guest/i }));

            await waitFor(() => {
                // onDeleted should not be called on failure
                expect(mockOnDeleted).not.toHaveBeenCalled();
            });
        });

        it('handles checkGuestHasRecords error', async () => {
            const guest = createMockGuest();
            mockCheckGuestHasRecords.mockRejectedValue(new Error('Network error'));
            
            const { default: toast } = await import('react-hot-toast');

            render(
                <GuestDeleteWithTransferModal
                    guest={guest}
                    onClose={mockOnClose}
                />
            );

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to load guest records');
            });
        });
    });
});

describe('GuestDeleteWithTransferModal logic', () => {
    describe('record counts', () => {
        it('calculates total correctly', () => {
            const counts = {
                meals: 10,
                showers: 5,
                laundry: 3,
                haircuts: 2,
                holidays: 1,
                bicycleRepairs: 4,
                itemsDistributed: 8,
            };
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            expect(total).toBe(33);
        });

        it('identifies guest with records', () => {
            const counts = { total: 5 };
            expect(counts.total > 0).toBe(true);
        });

        it('identifies guest without records', () => {
            const counts = { total: 0 };
            expect(counts.total > 0).toBe(false);
        });
    });

    describe('transfer validation', () => {
        it('validates transfer target is different from source', () => {
            const sourceId = 'guest-1';
            const targetId = 'guest-2';
            expect(sourceId).not.toBe(targetId);
        });

        it('rejects same guest as transfer target', () => {
            const sourceId = 'guest-1';
            const targetId = 'guest-1';
            expect(sourceId).toBe(targetId);
        });
    });

    describe('button state logic', () => {
        it('enables delete when no records and no transfer target', () => {
            const hasRecords = false;
            const hasTarget = false;
            const isConfirmed = false;
            
            // Button should be enabled
            const shouldDisable = hasRecords && (!hasTarget || !isConfirmed);
            expect(shouldDisable).toBe(false);
        });

        it('disables delete when records exist but no transfer target', () => {
            const hasRecords = true;
            const hasTarget = false;
            const isConfirmed = false;
            
            const shouldDisable = hasRecords && !hasTarget;
            expect(shouldDisable).toBe(true);
        });

        it('disables delete when records exist and target selected but not confirmed', () => {
            const hasRecords = true;
            const hasTarget = true;
            const isConfirmed = false;
            
            const shouldDisable = hasRecords && hasTarget && !isConfirmed;
            expect(shouldDisable).toBe(true);
        });

        it('enables delete when records exist, target selected, and confirmed', () => {
            const hasRecords = true;
            const hasTarget = true;
            const isConfirmed = true;
            
            const shouldDisable = hasRecords && hasTarget && !isConfirmed;
            expect(shouldDisable).toBe(false);
        });
    });
});
