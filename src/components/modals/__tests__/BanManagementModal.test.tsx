import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BanManagementModal } from '../BanManagementModal';
import { useGuestsStore } from '@/stores/useGuestsStore';

// Mock dependencies
const mockBanGuest = vi.fn();
const mockClearGuestBan = vi.fn();

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        banGuest: mockBanGuest,
        clearGuestBan: mockClearGuestBan,
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
        div: ({ children, className, onClick }: any) => (
            <div className={className} onClick={onClick}>
                {children}
            </div>
        ),
    },
}));

describe('BanManagementModal Component', () => {
    const mockGuest = {
        id: '123',
        name: 'John Doe',
        preferredName: 'Johnny',
        isBanned: false,
    };
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly when guest is not banned', () => {
        render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);
        expect(screen.getByRole('heading', { name: 'Ban Guest' })).toBeDefined();
        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.getByPlaceholderText('Describe the reason for the ban...')).toBeDefined();
    });

    it('renders correctly when guest is already banned', () => {
        const bannedGuest = {
            ...mockGuest,
            isBanned: true,
            banReason: 'Bad behavior',
            bannedUntil: '2026-12-31',
            bannedFromMeals: false,
            bannedFromShower: true,
            bannedFromLaundry: true,
            bannedFromBicycle: false,
        };
        render(<BanManagementModal guest={bannedGuest} onClose={mockOnClose} />);
        expect(screen.getByRole('heading', { name: 'Manage Ban' })).toBeDefined();
        expect(screen.getByText('Currently Banned')).toBeDefined();
        expect(screen.getByText('Reason: Bad behavior')).toBeDefined();
        expect(screen.getByText('2 Restricted')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Lift Ban' })).toBeDefined();
    });

    it('validates ban reason is required', () => {
        render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ban Guest' }));

        expect(mockBanGuest).not.toHaveBeenCalled();
    });

    it('submits ban when reason provided', async () => {
        render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);

        fireEvent.change(screen.getByPlaceholderText('Describe the reason for the ban...'), {
            target: { value: 'Violation of rules' },
        });

        const banButton = screen.getByRole('button', { name: 'Ban Guest' });
        fireEvent.click(banButton);

        await waitFor(() => {
            expect(mockBanGuest).toHaveBeenCalledWith('123', expect.objectContaining({
                banReason: 'Violation of rules',
            }));
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('handles lifting ban', async () => {
        const bannedGuest = { ...mockGuest, isBanned: true };
        render(<BanManagementModal guest={bannedGuest} onClose={mockOnClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'Lift Ban' }));

        await waitFor(() => {
            expect(mockClearGuestBan).toHaveBeenCalledWith('123');
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('handles specific program bans', async () => {
        render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);

        fireEvent.change(screen.getByPlaceholderText('Describe the reason for the ban...'), {
            target: { value: 'Misused showers' },
        });

        // Click specific programs
        fireEvent.click(screen.getByText('Showers'));
        fireEvent.click(screen.getByText('Laundry'));

        const banButton = screen.getByRole('button', { name: 'Ban Guest' });
        fireEvent.click(banButton);

        await waitFor(() => {
            expect(mockBanGuest).toHaveBeenCalledWith('123', expect.objectContaining({
                bannedFromShower: true,
                bannedFromLaundry: true,
                bannedFromMeals: false,
                bannedFromBicycle: false,
            }));
        });
    });

    it('handles ban failure', async () => {
        const errorMockBanGuest = vi.fn().mockRejectedValue(new Error('Ban failed'));
        vi.mocked(useGuestsStore).mockReturnValue({
            banGuest: errorMockBanGuest,
            clearGuestBan: mockClearGuestBan,
        } as any);

        const { unmount } = render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);

        fireEvent.change(screen.getByPlaceholderText('Describe the reason for the ban...'), {
            target: { value: 'Violation' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Ban Guest' }));

        await waitFor(() => {
            expect(errorMockBanGuest).toHaveBeenCalled();
        });
        unmount();
    });

    it('handles lift ban failure', async () => {
        const errorMockClearGuestBan = vi.fn().mockRejectedValue(new Error('Lift failed'));
        vi.mocked(useGuestsStore).mockReturnValue({
            banGuest: mockBanGuest,
            clearGuestBan: errorMockClearGuestBan,
        } as any);

        const bannedGuest = { ...mockGuest, isBanned: true };
        render(<BanManagementModal guest={bannedGuest} onClose={mockOnClose} />);

        fireEvent.click(screen.getByRole('button', { name: 'Lift Ban' }));

        await waitFor(() => {
            expect(errorMockClearGuestBan).toHaveBeenCalled();
        });
    });

    it('updates inputs correctly', () => {
        const { container } = render(<BanManagementModal guest={mockGuest} onClose={mockOnClose} />);

        // Date input
        const dateInput = container.querySelector('input[type="date"]');
        if (dateInput) {
            fireEvent.change(dateInput, { target: { value: '2027-01-01' } });
        }

        // Checkboxes
        const mealsCheckbox = screen.getByLabelText(/Meals/i);
        fireEvent.click(mealsCheckbox);

        const bicycleCheckbox = screen.getByLabelText(/Bicycle/i);
        fireEvent.click(bicycleCheckbox);
    });
});
