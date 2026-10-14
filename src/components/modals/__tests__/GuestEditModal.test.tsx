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
    const mockCountHouseholdMeals = vi.fn().mockResolvedValue(0);
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
        shelterGuest: false,
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
            countHouseholdMeals: mockCountHouseholdMeals,
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

    it('updates shelter guest enrollment from the profile', async () => {
        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        fireEvent.click(screen.getByLabelText(/Enroll as Shelter Guest/i));
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalledWith('alice', expect.objectContaining({ shelterGuest: true }));
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('unenrolls a shelter guest from the profile', async () => {
        render(<GuestEditModal guest={{ ...sampleGuest, shelterGuest: true }} onClose={mockOnClose} />);

        fireEvent.click(screen.getByLabelText(/Enroll as Shelter Guest/i));
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalledWith('alice', expect.objectContaining({ shelterGuest: false }));
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('keeps the modal open and shows an error when updateGuest returns false', async () => {
        mockUpdateGuest.mockResolvedValueOnce(false);
        const { default: toast } = await import('react-hot-toast');

        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        fireEvent.click(screen.getByLabelText(/Enroll as Shelter Guest/i));
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('Unable to save guest changes.');
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    it('unenrolling a primary with dependents keeps the household and just unenrolls it', async () => {
        (useGuestsStore as any).mockReturnValue({
            updateGuest: mockUpdateGuest,
            guests: [
                sampleGuest,
                { id: 'child', name: 'Kid Smith', firstName: 'Kid', lastName: 'Smith' },
            ],
            guestFamilies: [
                { id: 'family-a', primaryGuestId: 'alice', enrolledInFamilyMeal: true },
            ],
            guestFamilyMembers: [
                { id: 'm-a', familyId: 'family-a', guestId: 'alice' },
                { id: 'm-a2', familyId: 'family-a', guestId: 'child' },
            ],
            createFamilyForPrimary: mockCreateFamilyForPrimary,
            addGuestToFamily: mockAddGuestToFamily,
            setFamilyEnrollment: mockSetFamilyEnrollment,
            removeGuestFromFamily: mockRemoveGuestFromFamily,
            countHouseholdMeals: mockCountHouseholdMeals,
        });

        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        // Uncheck family meal enrollment
        fireEvent.click(screen.getByLabelText(/Enroll household in Family Meal Program/i));
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockUpdateGuest).toHaveBeenCalled();
            // Household is preserved: unenrolled, not removed.
            expect(mockSetFamilyEnrollment).toHaveBeenCalledWith('family-a', false);
            expect(mockRemoveGuestFromFamily).not.toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('blocks moving a primary with dependents into another household', async () => {
        (useGuestsStore as any).mockReturnValue({
            updateGuest: mockUpdateGuest,
            guests: [
                sampleGuest,
                { id: 'bob', name: 'Bob Jones', firstName: 'Bob', lastName: 'Jones' },
                { id: 'child', name: 'Kid Smith', firstName: 'Kid', lastName: 'Smith' },
            ],
            guestFamilies: [
                { id: 'family-a', primaryGuestId: 'alice', enrolledInFamilyMeal: true },
                { id: 'family-b', primaryGuestId: 'bob', enrolledInFamilyMeal: true },
            ],
            guestFamilyMembers: [
                { id: 'm-a', familyId: 'family-a', guestId: 'alice' },
                { id: 'm-a2', familyId: 'family-a', guestId: 'child' },
                { id: 'm-b', familyId: 'family-b', guestId: 'bob' },
            ],
            createFamilyForPrimary: mockCreateFamilyForPrimary,
            addGuestToFamily: mockAddGuestToFamily,
            setFamilyEnrollment: mockSetFamilyEnrollment,
            removeGuestFromFamily: mockRemoveGuestFromFamily,
            countHouseholdMeals: mockCountHouseholdMeals,
        });
        const { default: toast } = await import('react-hot-toast');

        render(<GuestEditModal guest={sampleGuest} onClose={mockOnClose} />);

        // Dependents are disclosed on the primary panel.
        expect(screen.getByText(/Heads a household with 1 dependent/i)).toBeInTheDocument();

        // Attempt the move anyway.
        fireEvent.click(screen.getByRole('button', { name: /Member of Existing Family/i }));
        fireEvent.change(screen.getByLabelText(/Family household/i), { target: { value: 'family-b' } });
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/dependent/i));
        });
        // Nothing is saved: neither the guest update nor any household change.
        expect(mockUpdateGuest).not.toHaveBeenCalled();
        expect(mockRemoveGuestFromFamily).not.toHaveBeenCalled();
        expect(mockAddGuestToFamily).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
