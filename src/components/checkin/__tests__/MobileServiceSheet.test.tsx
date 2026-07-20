import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MobileServiceSheet } from '../MobileServiceSheet';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('MobileServiceSheet', () => {
    const mockGuest = {
        id: 'guest-1',
        name: 'John Doe',
        preferredName: 'Johnny',
    };

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        guest: mockGuest,
        onMealSelect: vi.fn(),
        onShowerSelect: vi.fn(),
        onLaundrySelect: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset body overflow
        document.body.style.overflow = '';
    });

    it('renders guest name in the header', () => {
        render(<MobileServiceSheet {...defaultProps} />);
        expect(screen.getByText('Quick Add for Johnny')).toBeDefined();
    });

    it('does not render when guest is null', () => {
        const { container } = render(<MobileServiceSheet {...defaultProps} guest={null} />);
        expect(container.innerHTML).toBe('');
    });

    it('uses name if preferredName is not available', () => {
        const guestWithoutPreferred = { id: 'guest-2', name: 'Jane Smith' };
        render(<MobileServiceSheet {...defaultProps} guest={guestWithoutPreferred} />);
        expect(screen.getByText('Quick Add for Jane Smith')).toBeDefined();
    });

    describe('Meal Section', () => {
        it('shows meal buttons when no meal today', () => {
            render(<MobileServiceSheet {...defaultProps} hasMealToday={false} />);
            expect(screen.getByText('1 Meal')).toBeDefined();
            expect(screen.getByText('2 Meals')).toBeDefined();
        });

        it('shows meal count when meal already logged', () => {
            render(<MobileServiceSheet {...defaultProps} hasMealToday={true} mealCount={2} />);
            expect(screen.getByText('2 Meals Today')).toBeDefined();
        });

        it('calls onMealUndo and onClose when undo button clicked', () => {
            const onMealUndo = vi.fn();
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasMealToday={true}
                    mealCount={2}
                    onMealUndo={onMealUndo}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /undo/i }));
            expect(onMealUndo).toHaveBeenCalled();
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onMealSelect and onClose when meal button clicked', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            fireEvent.click(screen.getByText('1 Meal'));
            expect(defaultProps.onMealSelect).toHaveBeenCalledWith('guest-1', 1);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('shows banned message when banned from meals', () => {
            render(<MobileServiceSheet {...defaultProps} isBannedFromMeals={true} />);
            expect(screen.getByText('Banned from Meals')).toBeDefined();
        });

        it('disables meal buttons when pending', () => {
            render(<MobileServiceSheet {...defaultProps} isPendingMeal={true} />);
            const buttons = screen.getAllByRole('button');
            const mealButton = buttons.find(btn => btn.textContent?.includes('Meal'));
            expect(mealButton).toBeDefined();
            expect(mealButton?.hasAttribute('disabled')).toBe(true);
        });
    });

    describe('Shower Section', () => {
        it('shows book shower button when no shower today', () => {
            render(<MobileServiceSheet {...defaultProps} hasShowerToday={false} />);
            expect(screen.getByText('Book Shower')).toBeDefined();
        });

        it('shows booked message when shower already booked', () => {
            render(<MobileServiceSheet {...defaultProps} hasShowerToday={true} />);
            expect(screen.getByText('Shower Booked Today')).toBeDefined();
        });

        it('calls onShowerUndo and onClose when undo button clicked', () => {
            const onShowerUndo = vi.fn();
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasShowerToday={true}
                    onShowerUndo={onShowerUndo}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /undo/i }));
            expect(onShowerUndo).toHaveBeenCalled();
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onShowerSelect and onClose when shower button clicked', () => {
            render(<MobileServiceSheet {...defaultProps} hasShowerToday={false} />);
            fireEvent.click(screen.getByText('Book Shower'));
            expect(defaultProps.onShowerSelect).toHaveBeenCalledWith(mockGuest);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('shows banned message when banned from showers', () => {
            render(<MobileServiceSheet {...defaultProps} isBannedFromShower={true} />);
            expect(screen.getByText('Banned from Showers')).toBeDefined();
        });
    });

    describe('Laundry Section', () => {
        it('shows book laundry button when no laundry today', () => {
            render(<MobileServiceSheet {...defaultProps} hasLaundryToday={false} />);
            expect(screen.getByText('Book Laundry')).toBeDefined();
        });

        it('shows booked message when laundry already booked', () => {
            render(<MobileServiceSheet {...defaultProps} hasLaundryToday={true} />);
            expect(screen.getByText('Laundry Booked Today')).toBeDefined();
        });

        it('calls onLaundryUndo and onClose when undo button clicked', () => {
            const onLaundryUndo = vi.fn();
            render(
                <MobileServiceSheet
                    {...defaultProps}
                    hasLaundryToday={true}
                    onLaundryUndo={onLaundryUndo}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /undo/i }));
            expect(onLaundryUndo).toHaveBeenCalled();
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onLaundrySelect and onClose when laundry button clicked', () => {
            render(<MobileServiceSheet {...defaultProps} hasLaundryToday={false} />);
            fireEvent.click(screen.getByText('Book Laundry'));
            expect(defaultProps.onLaundrySelect).toHaveBeenCalledWith(mockGuest);
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('shows banned message when banned from laundry', () => {
            render(<MobileServiceSheet {...defaultProps} isBannedFromLaundry={true} />);
            expect(screen.getByText('Banned from Laundry')).toBeDefined();
        });
    });

    describe('Close functionality', () => {
        it('calls onClose when close button clicked', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            fireEvent.click(screen.getByLabelText('Close'));
            expect(defaultProps.onClose).toHaveBeenCalled();
        });

        it('calls onClose when backdrop clicked', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            // The backdrop is the first motion.div with aria-hidden
            const backdrop = document.querySelector('[aria-hidden="true"]');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(defaultProps.onClose).toHaveBeenCalled();
            }
        });

        it('calls onClose on Escape key', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });

    describe('Body scroll lock', () => {
        it('locks body scroll when open', () => {
            render(<MobileServiceSheet {...defaultProps} isOpen={true} />);
            expect(document.body.style.overflow).toBe('hidden');
        });

        it('unlocks body scroll when closed', () => {
            const { rerender } = render(<MobileServiceSheet {...defaultProps} isOpen={true} />);
            rerender(<MobileServiceSheet {...defaultProps} isOpen={false} />);
            expect(document.body.style.overflow).toBe('');
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA attributes', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            const dialog = screen.getByRole('dialog');
            expect(dialog.getAttribute('aria-modal')).toBe('true');
            expect(dialog.getAttribute('aria-labelledby')).toBe('mobile-service-sheet-title');
        });

        it('has labeled title', () => {
            render(<MobileServiceSheet {...defaultProps} />);
            const title = document.getElementById('mobile-service-sheet-title');
            expect(title).toBeDefined();
            expect(title?.textContent).toContain('Quick Add for Johnny');
        });
    });
});
