import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaiverBadge } from '../WaiverBadge';

// Mock stores
const mockGuestNeedsWaiverReminder = vi.fn();
const mockDismissWaiver = vi.fn();
const mockHasActiveWaiver = vi.fn();

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: () => ({
        guestNeedsWaiverReminder: mockGuestNeedsWaiverReminder,
        dismissWaiver: mockDismissWaiver,
        hasActiveWaiver: mockHasActiveWaiver,
        waiverVersion: 1,
    }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('WaiverBadge - Modal Callbacks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: guest needs waiver
        mockGuestNeedsWaiverReminder.mockResolvedValue(true);
        mockHasActiveWaiver.mockResolvedValue(false);
    });

    it('should call onModalOpen when badge is clicked', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
            />
        );

        // Wait for the badge to appear (after loading)
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });

        // Click the badge
        const badge = screen.getByText('Waiver needed');
        await user.click(badge);

        // onModalOpen should be called
        expect(onModalOpen).toHaveBeenCalledTimes(1);
        expect(onModalClose).not.toHaveBeenCalled();
    });

    it('should call onModalClose when modal is closed via X button', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
            />
        );

        // Wait for badge and open modal
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        const badge = screen.getByText('Waiver needed');
        await user.click(badge);

        // Wait for modal to open
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click close button
        const closeButton = screen.getByLabelText('Close');
        await user.click(closeButton);

        // onModalClose should be called
        expect(onModalClose).toHaveBeenCalledTimes(1);
    });

    it('should call onModalClose when modal is closed via Cancel button', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
            />
        );

        // Wait for badge and open modal
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        await user.click(screen.getByText('Waiver needed'));

        // Wait for modal and click Cancel
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        
        const cancelButton = screen.getByText('Cancel');
        await user.click(cancelButton);

        // onModalClose should be called
        expect(onModalClose).toHaveBeenCalledTimes(1);
    });

    it('should call onModalClose when modal is closed via backdrop click', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
            />
        );

        // Wait for badge and open modal
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        await user.click(screen.getByText('Waiver needed'));

        // Wait for modal
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click backdrop (the dialog container itself)
        const backdrop = screen.getByRole('dialog');
        await user.click(backdrop);

        // onModalClose should be called
        expect(onModalClose).toHaveBeenCalledTimes(1);
    });

    it('should call onModalClose and onDismissed when waiver is successfully confirmed', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();
        const onDismissed = vi.fn();
        
        mockDismissWaiver.mockResolvedValue(true);

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
                onDismissed={onDismissed}
            />
        );

        // Wait for badge and open modal
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        await user.click(screen.getByText('Waiver needed'));

        // Wait for modal
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click "Sign Waiver Online" to go to step 2
        const signButton = screen.getByText('Sign Waiver Online');
        await user.click(signButton);

        // Wait for "Confirm Signed" button to appear
        await waitFor(() => {
            expect(screen.getByText('Confirm Signed')).toBeInTheDocument();
        });

        // Click "Confirm Signed"
        const confirmButton = screen.getByText('Confirm Signed');
        await user.click(confirmButton);

        // Both callbacks should be called
        await waitFor(() => {
            expect(onModalClose).toHaveBeenCalled();
            expect(onDismissed).toHaveBeenCalled();
        });
    });

    it('should call onModalClose when going back from step 2', async () => {
        const user = userEvent.setup();
        const onModalOpen = vi.fn();
        const onModalClose = vi.fn();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
            />
        );

        // Wait for badge and open modal
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        await user.click(screen.getByText('Waiver needed'));

        // Click "Sign Waiver Online" to go to step 2
        await waitFor(() => {
            expect(screen.getByText('Sign Waiver Online')).toBeInTheDocument();
        });
        
        const signButton = screen.getByText('Sign Waiver Online');
        await user.click(signButton);

        // Wait for step 2 and click Back
        await waitFor(() => {
            expect(screen.getByText('Back')).toBeInTheDocument();
        });
        
        const backButton = screen.getByText('Back');
        await user.click(backButton);

        // onModalClose should be called
        expect(onModalClose).toHaveBeenCalled();
    });

    it('should work without callbacks (backward compatible)', async () => {
        const user = userEvent.setup();

        render(
            <WaiverBadge 
                guestId="g1" 
                serviceType="shower"
            />
        );

        // Wait for badge
        await waitFor(() => {
            expect(screen.getByText('Waiver needed')).toBeInTheDocument();
        });
        
        // Should not throw when clicking without callbacks
        const badge = screen.getByText('Waiver needed');
        await expect(user.click(badge)).resolves.not.toThrow();
    });
});
