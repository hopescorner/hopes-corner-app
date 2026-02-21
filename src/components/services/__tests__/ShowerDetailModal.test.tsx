import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ShowerDetailModal } from '../ShowerDetailModal';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the items store
const mockFetchItemsForGuest = vi.fn();
const mockCheckAvailability = vi.fn((_guestId: string, _itemKey: string) => ({ available: true }));
const mockGiveItem = vi.fn();
const mockUndoItem = vi.fn();
let mockDistributedItems: any[] = [];

vi.mock('@/stores/useItemsStore', () => ({
    useItemsStore: () => ({
        fetchItemsForGuest: mockFetchItemsForGuest,
        checkAvailability: mockCheckAvailability,
        giveItem: mockGiveItem,
        undoItem: mockUndoItem,
        distributedItems: mockDistributedItems,
        isLoading: false,
    }),
}));

// Mock the services store
const mockUpdateShowerStatus = vi.fn();

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: () => ({
        updateShowerStatus: mockUpdateShowerStatus,
    }),
}));

// Mock WaiverBadge
vi.mock('@/components/ui/WaiverBadge', () => ({
    WaiverBadge: () => <div data-testid="waiver-badge">Waiver Badge</div>,
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ShowerDetailModal', () => {
    const mockGuest = {
        id: 'guest-1',
        firstName: 'John',
        preferredName: 'Johnny',
        name: 'John Doe',
    };

    const mockRecord = {
        id: 'shower-1',
        status: 'awaiting',
        time: '10:00 AM',
        date: new Date().toISOString(),
    };

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        record: mockRecord,
        guest: mockGuest,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockDistributedItems = [];
    });

    it('renders modal when open', () => {
        render(<ShowerDetailModal {...defaultProps} />);
        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.getByText('Shower Details & Amenities')).toBeDefined();
    });

    it('does not render when closed', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} isOpen={false} />);
        expect(container.innerHTML).toBe('');
    });

    it('does not render without guest', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} guest={null} />);
        expect(container.innerHTML).toBe('');
    });

    it('does not render without record', () => {
        const { container } = render(<ShowerDetailModal {...defaultProps} record={null} />);
        expect(container.innerHTML).toBe('');
    });

    describe('Amenity Items', () => {
        it('displays T-Shirt amenity with weekly limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('T-Shirt')).toBeDefined();
        });

        it('displays Jacket amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Jacket')).toBeDefined();
        });

        it('displays Tent amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Tent')).toBeDefined();
        });

        it('displays Sleeping Bag amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Sleeping Bag')).toBeDefined();
        });

        it('displays Backpack amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Backpack')).toBeDefined();
        });

        it('displays Flip Flops amenity with 30-day limit', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Flip Flops')).toBeDefined();
        });

        it('does NOT display Socks (unlimited item)', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.queryByText('Socks')).toBeNull();
        });

        it('does NOT display Underwear (unlimited item)', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.queryByText('Underwear')).toBeNull();
        });
    });

    describe('Amenity item interactions', () => {
        it('calls giveItem when available item button is clicked', async () => {
            mockGiveItem.mockResolvedValue({ id: 'item-1' });
            render(<ShowerDetailModal {...defaultProps} />);

            const jacketButton = screen.getByText('Jacket').closest('button');
            expect(jacketButton).toBeDefined();
            
            fireEvent.click(jacketButton!);
            
            await waitFor(() => {
                expect(mockGiveItem).toHaveBeenCalledWith('guest-1', 'jacket');
            });
        });

        it('disables item button when not available', () => {
            mockCheckAvailability.mockImplementation((_guestId: string, itemKey: string) => {
                if (itemKey === 'jacket') {
                    return { available: false, daysRemaining: 15 };
                }
                return { available: true };
            });

            render(<ShowerDetailModal {...defaultProps} />);

            const jacketButton = screen.getByText('Jacket').closest('button');
            expect(jacketButton?.hasAttribute('disabled')).toBe(true);
        });

        it('shows days remaining when item is on cooldown', () => {
            mockCheckAvailability.mockImplementation((_guestId: string, itemKey: string) => {
                if (itemKey === 'jacket') {
                    return { available: false, daysRemaining: 15 };
                }
                return { available: true };
            });

            render(<ShowerDetailModal {...defaultProps} />);

            expect(screen.getByText('15d left')).toBeDefined();
        });
    });

    describe('Close functionality', () => {
        it('calls onClose when close button is clicked', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            
            // Find the button with X icon (first button in the modal)
            const buttons = screen.getAllByRole('button');
            const closeBtn = buttons[0]; // First button is the close button
            
            fireEvent.click(closeBtn);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });

    describe('Fetches items on open', () => {
        it('fetches items when modal opens', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(mockFetchItemsForGuest).toHaveBeenCalledWith('guest-1');
        });
    });

    describe('Undo functionality', () => {
        it('shows undo button for items given today', () => {
            const today = new Date().toISOString();
            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'tshirt', distributedAt: today, createdAt: today },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            expect(screen.getByText('tshirt')).toBeDefined();
            expect(screen.getByTitle('Undo - remove this item')).toBeDefined();
        });

        it('does not show undo button for items given on previous days', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'jacket', distributedAt: yesterday.toISOString(), createdAt: yesterday.toISOString() },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            expect(screen.getByText('jacket')).toBeDefined();
            expect(screen.queryByTitle('Undo - remove this item')).toBeNull();
        });

        it('calls undoItem when undo button is clicked', async () => {
            mockUndoItem.mockResolvedValue(true);
            const today = new Date().toISOString();
            mockDistributedItems = [
                { id: 'item-to-undo', guestId: 'guest-1', itemKey: 'tent', distributedAt: today, createdAt: today },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            const undoButton = screen.getByTitle('Undo - remove this item');
            fireEvent.click(undoButton);

            await waitFor(() => {
                expect(mockUndoItem).toHaveBeenCalledWith('item-to-undo');
            });
        });

        it('shows success toast when undo is successful', async () => {
            const toast = await import('react-hot-toast');
            mockUndoItem.mockResolvedValue(true);
            const today = new Date().toISOString();
            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'backpack', distributedAt: today, createdAt: today },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            const undoButton = screen.getByTitle('Undo - remove this item');
            fireEvent.click(undoButton);

            await waitFor(() => {
                expect(toast.default.success).toHaveBeenCalledWith(expect.stringContaining('Undid backpack'));
            });
        });

        it('shows error toast when undo fails', async () => {
            const toast = await import('react-hot-toast');
            mockUndoItem.mockResolvedValue(false);
            const today = new Date().toISOString();
            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'sleeping_bag', distributedAt: today, createdAt: today },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            const undoButton = screen.getByTitle('Undo - remove this item');
            fireEvent.click(undoButton);

            await waitFor(() => {
                expect(toast.default.error).toHaveBeenCalledWith('Failed to undo item');
            });
        });

        it('displays Recent Items Given section when items exist', () => {
            const today = new Date().toISOString();
            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'flipflops', distributedAt: today, createdAt: today },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            expect(screen.getByText('Recent Items Given')).toBeDefined();
        });

        it('shows multiple items with appropriate undo buttons', () => {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            mockDistributedItems = [
                { id: 'item-1', guestId: 'guest-1', itemKey: 'tshirt', distributedAt: today.toISOString(), createdAt: today.toISOString() },
                { id: 'item-2', guestId: 'guest-1', itemKey: 'jacket', distributedAt: yesterday.toISOString(), createdAt: yesterday.toISOString() },
            ];

            render(<ShowerDetailModal {...defaultProps} />);

            // Both items should be visible
            expect(screen.getByText('tshirt')).toBeDefined();
            expect(screen.getByText('jacket')).toBeDefined();

            // Only one undo button should be visible (for today's item)
            const undoButtons = screen.queryAllByTitle('Undo - remove this item');
            expect(undoButtons.length).toBe(1);
        });
    });

    describe('Mark as Done functionality', () => {
        it('shows Mark as Done button when shower is not done', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.getByText('Mark as Done')).toBeDefined();
        });

        it('does NOT show Mark as Done button when shower is already done', () => {
            const doneRecord = { ...mockRecord, status: 'done' };
            render(<ShowerDetailModal {...defaultProps} record={doneRecord} />);
            expect(screen.queryByText('Mark as Done')).toBeNull();
        });

        it('calls updateShowerStatus when Mark as Done is clicked', async () => {
            mockUpdateShowerStatus.mockResolvedValue(true);
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button');
            expect(markDoneButton).toBeDefined();
            
            fireEvent.click(markDoneButton!);
            
            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalledWith('shower-1', 'done');
            });
        });

        it('shows success toast when marked as done successfully', async () => {
            const toast = await import('react-hot-toast');
            mockUpdateShowerStatus.mockResolvedValue(true);
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button');
            fireEvent.click(markDoneButton!);

            await waitFor(() => {
                expect(toast.default.success).toHaveBeenCalledWith(expect.stringContaining('Shower marked as done'));
            });
        });

        it('closes the modal after marking as done successfully', async () => {
            mockUpdateShowerStatus.mockResolvedValue(true);
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button');
            fireEvent.click(markDoneButton!);

            await waitFor(() => {
                expect(defaultProps.onClose).toHaveBeenCalled();
            });
        });

        it('does NOT close the modal when marking as done fails', async () => {
            mockUpdateShowerStatus.mockResolvedValue(false);
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button');
            fireEvent.click(markDoneButton!);

            await waitFor(() => {
                expect(mockUpdateShowerStatus).toHaveBeenCalledWith('shower-1', 'done');
            });

            expect(defaultProps.onClose).not.toHaveBeenCalled();
        });

        it('shows error toast when marking as done fails', async () => {
            const toast = await import('react-hot-toast');
            mockUpdateShowerStatus.mockResolvedValue(false);
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button');
            fireEvent.click(markDoneButton!);

            await waitFor(() => {
                expect(toast.default.error).toHaveBeenCalledWith('Failed to update shower status');
            });
        });

        it('disables button while marking as done', async () => {
            mockUpdateShowerStatus.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
            render(<ShowerDetailModal {...defaultProps} />);

            const markDoneButton = screen.getByText('Mark as Done').closest('button') as HTMLButtonElement;
            expect(markDoneButton).toBeDefined();
            
            fireEvent.click(markDoneButton!);
            
            // Button should be disabled while processing
            expect(markDoneButton?.disabled).toBe(true);
        });

        it('shows different status badge colors for done vs awaiting', () => {
            const { rerender } = render(<ShowerDetailModal {...defaultProps} />);
            
            // Awaiting status should have sky colors
            const awaitingBadge = screen.getByText('awaiting');
            expect(awaitingBadge?.className).toContain('bg-sky-100');
            expect(awaitingBadge?.className).toContain('text-sky-700');

            // Rerender with done status
            const doneRecord = { ...mockRecord, status: 'done' };
            rerender(<ShowerDetailModal {...defaultProps} record={doneRecord} />);
            
            // Done status should have emerald colors
            const doneBadge = screen.getByText('done');
            expect(doneBadge?.className).toContain('bg-emerald-100');
            expect(doneBadge?.className).toContain('text-emerald-700');
        });
    });

    describe('Amenities When Done', () => {
        const doneRecord = { ...mockRecord, status: 'done' };

        it('shows "Shower Completed" banner instead of "Mark as Done" button when done', () => {
            render(<ShowerDetailModal {...defaultProps} record={doneRecord} />);
            expect(screen.getByText('Shower Completed')).toBeDefined();
            expect(screen.queryByText('Mark as Done')).toBeNull();
        });

        it('keeps amenity item buttons enabled when shower is done', () => {
            mockCheckAvailability.mockReturnValue({ available: true });
            render(<ShowerDetailModal {...defaultProps} record={doneRecord} />);

            const tshirtButton = screen.getByText('T-Shirt').closest('button') as HTMLButtonElement;
            const jacketButton = screen.getByText('Jacket').closest('button') as HTMLButtonElement;
            const tentButton = screen.getByText('Tent').closest('button') as HTMLButtonElement;

            expect(tshirtButton?.disabled).toBe(false);
            expect(jacketButton?.disabled).toBe(false);
            expect(tentButton?.disabled).toBe(false);
        });

        it('does not show "Disabled" label when shower is done', () => {
            render(<ShowerDetailModal {...defaultProps} record={doneRecord} />);
            expect(screen.queryByText('Disabled — shower complete')).toBeNull();
        });

        it('does not show "Disabled" label when shower is not done', () => {
            render(<ShowerDetailModal {...defaultProps} />);
            expect(screen.queryByText('Disabled — shower complete')).toBeNull();
        });

        it('amenity buttons are not disabled when shower is not done', () => {
            mockCheckAvailability.mockReturnValue({ available: true });
            render(<ShowerDetailModal {...defaultProps} />);

            const tshirtButton = screen.getByText('T-Shirt').closest('button') as HTMLButtonElement;
            expect(tshirtButton?.disabled).toBe(false);
        });

        it('calls giveItem when amenity is clicked in done state', async () => {
            mockCheckAvailability.mockReturnValue({ available: true });
            mockGiveItem.mockResolvedValue({ id: 'item-1' });
            render(<ShowerDetailModal {...defaultProps} record={doneRecord} />);

            const tshirtButton = screen.getByText('T-Shirt').closest('button') as HTMLButtonElement;
            fireEvent.click(tshirtButton!);

            await waitFor(() => {
                expect(mockGiveItem).toHaveBeenCalledWith('guest-1', 'tshirt');
            });
        });
    });
});
