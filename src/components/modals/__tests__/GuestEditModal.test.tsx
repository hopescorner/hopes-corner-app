import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GuestEditModal } from '../GuestEditModal';
import { useGuestsStore } from '@/stores/useGuestsStore';

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/stores/useGuestsStore');

describe('GuestEditModal Household Transitions', () => {
    const mockUpdateGuest = vi.fn().mockResolvedValue(true);
    const mockCreateFamilyForPrimary = vi.fn().mockResolvedValue({ id: 'fam-primary' });
    const mockAddGuestToFamily = vi.fn().mockResolvedValue({ id: 'member-1' });
    const mockSetFamilyEnrollment = vi.fn().mockResolvedValue(true);
    const mockRemoveGuestFromFamily = vi.fn().mockResolvedValue(true);
    const mockOnClose = vi.fn();

    const sampleGuest = {
        id: 'alice',
        guestId: 'G001',
        firstName: 'Alice',
        lastName: 'Smith',
        name: 'Alice Smith',
        preferredName: '',
        housingStatus: 'Unhoused',
        location: 'Mountain View',
        age: 'Adult 18-59',
        gender: 'Female',
        notes: '',
        bicycleDescription: '',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useGuestsStore as any).mockReturnValue({
            updateGuest: mockUpdateGuest,
            guests: [sampleGuest, { id: 'bob', name: 'Bob Jones', firstName: 'Bob', lastName: 'Jones' }],
            guestFamilies: [
                { id: 'family-a', primaryGuestId: 'alice', enrolledInFamilyMeal: true },
                { id: 'family-b', primaryGuestId: 'bob', enrolledInFamilyMeal: true },
            ],
            guestFamilyMembers: [
                { id: 'm-a', familyId: 'family-a', guestId: 'alice' },
                { id: 'm-b', familyId: 'family-b', guestId: 'bob' },
            ],
            createFamilyForPrimary: mockCreateFamilyForPrimary,
            addGuestToFamily: mockAddGuestToFamily,
            setFamilyEnrollment: mockSetFamilyEnrollment,
            removeGuestFromFamily: mockRemoveGuestFromFamily,
        });
    });

    it('cleans up old primary family when switching from primary of Family A to member of Family B', async () => {
        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        // Switch to member mode
        const memberButton = screen.getByRole('button', { name: /Member of Existing Family/i });
        fireEvent.click(memberButton);

        // Select Family B in family dropdown
        const familySelect = screen.getByLabelText(/Family household/i);
        fireEvent.change(familySelect, { target: { value: 'family-b' } });

        // Submit form
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalled();
            expect(mockRemoveGuestFromFamily).toHaveBeenCalledWith('alice');
            expect(mockAddGuestToFamily).toHaveBeenCalledWith('family-b', 'alice');
            expect(mockSetFamilyEnrollment).toHaveBeenCalledWith('family-b', true);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('removes guest from family when unchecking enrollment', async () => {
        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        // Uncheck family meal enrollment
        const enrollCheckbox = screen.getByLabelText(/Enroll household in Family Meal Program/i);
        fireEvent.click(enrollCheckbox);

        // Submit form
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalled();
            expect(mockRemoveGuestFromFamily).toHaveBeenCalledWith('alice');
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
