import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowerDetailModal } from '../ShowerDetailModal';

// Mock stores
const mockFetchItemsForGuest = vi.fn();
const mockCheckAvailability = vi.fn(() => ({ available: true }));
const mockGiveItem = vi.fn();
const mockUndoItem = vi.fn();

vi.mock('@/stores/useItemsStore', () => ({
    useItemsStore: () => ({
        fetchItemsForGuest: mockFetchItemsForGuest,
        checkAvailability: mockCheckAvailability,
        giveItem: mockGiveItem,
        undoItem: mockUndoItem,
        distributedItems: [],
        isLoading: false,
    }),
}));

// Mock WaiverBadge with callback support
let mockOnModalOpen: (() => void) | undefined;
let mockOnModalClose: (() => void) | undefined;

vi.mock('@/components/ui/WaiverBadge', () => ({
    WaiverBadge: ({ onModalOpen, onModalClose }: { onModalOpen?: () => void; onModalClose?: () => void }) => {
        // Store callbacks for testing
        mockOnModalOpen = onModalOpen;
        mockOnModalClose = onModalClose;
        
        return (
            <div data-testid="waiver-badge">
                <button 
                    onClick={() => onModalOpen?.()} 
                    data-testid="open-waiver-modal"
                >
                    Waiver needed
                </button>
            </div>
        );
    },
}));

describe('ShowerDetailModal - Modal Stacking', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        record: {
            id: 'r1',
            guestId: 'g1',
            date: '2026-01-22',
            time: '08:00',
            status: 'booked',
        },
        guest: {
            id: 'g1',
            name: 'John Doe',
            preferredName: 'John',
            firstName: 'John',
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnModalOpen = undefined;
        mockOnModalClose = undefined;
    });

    it('should render shower detail modal by default', () => {
        render(<ShowerDetailModal {...defaultProps} />);
        
        expect(screen.getByText('Shower Details & Amenities')).toBeInTheDocument();
        expect(screen.getByTestId('waiver-badge')).toBeInTheDocument();
    });

    it('should hide shower detail modal when waiver modal opens', async () => {
        const user = userEvent.setup();
        render(<ShowerDetailModal {...defaultProps} />);
        
        // Modal should be visible initially
        expect(screen.getByText('Shower Details & Amenities')).toBeInTheDocument();
        
        // Click to open waiver modal
        const openWaiverButton = screen.getByTestId('open-waiver-modal');
        await user.click(openWaiverButton);
        
        // Verify the callback was received and called
        expect(mockOnModalOpen).toBeDefined();
        if (mockOnModalOpen) {
            mockOnModalOpen();
        }
        
        // Wait for shower detail modal to be hidden
        await waitFor(() => {
            expect(screen.queryByText('Shower Details & Amenities')).not.toBeInTheDocument();
        });
    });

    it('should restore shower detail modal when waiver modal closes', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<ShowerDetailModal {...defaultProps} />);
        
        // Open waiver modal
        const openWaiverButton = screen.getByTestId('open-waiver-modal');
        await user.click(openWaiverButton);
        
        // Simulate opening the waiver modal
        if (mockOnModalOpen) {
            mockOnModalOpen();
        }
        
        // Rerender to apply state change
        rerender(<ShowerDetailModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.queryByText('Shower Details & Amenities')).not.toBeInTheDocument();
        });
        
        // Simulate closing the waiver modal
        if (mockOnModalClose) {
            mockOnModalClose();
        }
        
        // Rerender again
        rerender(<ShowerDetailModal {...defaultProps} />);
        
        // Shower detail modal should be visible again
        await waitFor(() => {
            expect(screen.getByText('Shower Details & Amenities')).toBeInTheDocument();
        });
    });

    it('should pass onModalOpen and onModalClose callbacks to WaiverBadge', () => {
        render(<ShowerDetailModal {...defaultProps} />);
        
        // Callbacks should be defined
        expect(mockOnModalOpen).toBeDefined();
        expect(mockOnModalClose).toBeDefined();
    });

    it('should not render modal when isOpen is false', () => {
        render(<ShowerDetailModal {...defaultProps} isOpen={false} />);
        
        expect(screen.queryByText('Shower Details & Amenities')).not.toBeInTheDocument();
    });

    it('should not render modal when guest is null', () => {
        render(<ShowerDetailModal {...defaultProps} guest={null} />);
        
        expect(screen.queryByText('Shower Details & Amenities')).not.toBeInTheDocument();
    });
});
