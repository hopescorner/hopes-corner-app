import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AddFamilyMembersModal } from '../AddFamilyMembersModal';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className }: any) => <div className={className}>{children}</div>,
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/utils/flexibleNameSearch', () => ({
    flexibleNameSearch: (query: string, guests: any[]) => guests.filter((guest) =>
        `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(query.toLowerCase()),
    ),
}));

vi.mock('@/lib/utils/duplicateDetection', () => ({
    findPotentialDuplicates: vi.fn(() => []),
}));

// Clearly fictional fixture data; never use real guest names here.
const primary = {
    id: 'primary-1',
    firstName: 'Guardian',
    lastName: 'Example',
    name: 'Guardian Example',
    preferredName: '',
    age: 'Adult 18-59',
    gender: 'Female',
    housingStatus: 'Unhoused',
    location: 'Mountain View',
};

const existingGuest = {
    id: 'guest-2',
    firstName: 'Sample',
    lastName: 'Example',
    name: 'Sample Example',
    preferredName: '',
    age: 'Child 0-17',
    gender: 'Unknown',
    housingStatus: 'Unhoused',
    location: 'Mountain View',
};

const mockAddFamilyMembers = vi.fn();
const mockAddGuestToFamily = vi.fn().mockResolvedValue({});
const mockSetFamilyEnrollment = vi.fn().mockResolvedValue(true);

const storeState = {
    guests: [primary, existingGuest],
    guestFamilies: [
        { id: 'family-1', primaryGuestId: 'primary-1', enrolledInFamilyMeal: false },
    ],
    guestFamilyMembers: [
        { id: 'member-primary', familyId: 'family-1', guestId: 'primary-1' },
    ],
    addFamilyMembers: mockAddFamilyMembers,
    addGuestToFamily: mockAddGuestToFamily,
    setFamilyEnrollment: mockSetFamilyEnrollment,
};

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: () => storeState,
}));

import { findPotentialDuplicates } from '@/lib/utils/duplicateDetection';

describe('AddFamilyMembersModal', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddFamilyMembers.mockResolvedValue([
            { ...existingGuest, id: 'guest-new-1', firstName: 'New' },
        ]);
        vi.mocked(findPotentialDuplicates).mockReturnValue([]);
    });

    it('shows the household primary and member count', () => {
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        expect(screen.getByText("Guardian Example's household · 1 member")).toBeDefined();
        expect(screen.getByText(/Adding a member enrolls this household/i)).toBeDefined();
    });

    it('inherits the primary last name and contact defaults', () => {
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        expect((screen.getByLabelText('Last name 1') as HTMLInputElement).value).toBe('Example');
        fireEvent.click(screen.getByRole('button', { name: /more details/i }));
        expect((screen.getByLabelText('Location 1') as HTMLInputElement).value).toBe('Mountain View');
        expect((screen.getByLabelText('Housing status 1') as HTMLSelectElement).value).toBe('Unhoused');
    });

    it('adds a new person with the household preselected', async () => {
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        fireEvent.change(screen.getByLabelText('First name 1'), { target: { value: 'New' } });
        fireEvent.click(screen.getByRole('button', { name: /add 1 family member/i }));

        await waitFor(() => {
            expect(mockAddFamilyMembers).toHaveBeenCalledWith('family-1', [
                expect.objectContaining({
                    firstName: 'New',
                    lastName: 'Example',
                    age: 'Child 0-17',
                }),
            ]);
        });
        expect(await screen.findByText('Added 1 family member')).toBeDefined();
    });

    it('supports adding several people in one submit', async () => {
        mockAddFamilyMembers.mockResolvedValueOnce([
            { ...existingGuest, id: 'guest-new-1', firstName: 'New' },
            { ...existingGuest, id: 'guest-new-2', firstName: 'Second' },
        ]);
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        fireEvent.change(screen.getByLabelText('First name 1'), { target: { value: 'New' } });
        fireEvent.click(screen.getByRole('button', { name: /add another person/i }));
        fireEvent.change(screen.getByLabelText('First name 2'), { target: { value: 'Second' } });
        fireEvent.click(screen.getByRole('button', { name: /add 2 family members/i }));

        await waitFor(() => {
            expect(mockAddFamilyMembers).toHaveBeenCalledWith('family-1', [
                expect.objectContaining({ firstName: 'New' }),
                expect.objectContaining({ firstName: 'Second' }),
            ]);
        });
    });

    it('links an existing guest and enrolls the household', async () => {
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        fireEvent.click(screen.getByRole('button', { name: /existing guest/i }));
        fireEvent.change(screen.getByLabelText('Search existing guests'), { target: { value: 'Sample' } });
        fireEvent.click(await screen.findByRole('button', { name: /add sample example to household/i }));

        await waitFor(() => {
            expect(mockAddGuestToFamily).toHaveBeenCalledWith('family-1', 'guest-2');
            expect(mockSetFamilyEnrollment).toHaveBeenCalledWith('family-1', true);
        });
    });

    it('offers to use an existing guest when a possible duplicate is typed', async () => {
        vi.mocked(findPotentialDuplicates).mockReturnValue([
            { guest: existingGuest, reason: 'Exact name match', confidence: 1 },
        ]);
        render(<AddFamilyMembersModal familyId="family-1" onClose={onClose} />);

        fireEvent.change(screen.getByLabelText('First name 1'), { target: { value: 'Sample' } });
        expect(await screen.findByText(/possible existing guest/i)).toBeDefined();
        fireEvent.click(screen.getByRole('button', { name: /use existing/i }));

        await waitFor(() => {
            expect(mockAddGuestToFamily).toHaveBeenCalledWith('family-1', 'guest-2');
        });
    });
});
