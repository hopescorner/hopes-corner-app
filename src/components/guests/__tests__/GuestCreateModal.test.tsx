import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { GuestCreateModal } from '../GuestCreateModal';

// Mock dependencies
vi.mock('@/hooks/useReducedMotion', () => ({
    useReducedMotion: () => false,
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

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

const mockAddGuest = vi.fn();
const mockGuestsList = [
    { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny' },
    { id: 'g2', firstName: 'Jane', lastName: 'Smith', preferredName: '' },
];
const mockGuestFamiliesList: any[] = [];
const mockStoreState = {
    guests: mockGuestsList,
    guestFamilies: mockGuestFamiliesList,
    addGuest: mockAddGuest,
};

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => mockStoreState),
}));

vi.mock('@/lib/constants/constants', () => ({
    HOUSING_STATUSES: ['Unhoused', 'Sheltered', 'Housed'],
    AGE_GROUPS: ['Adult 18-59', 'Senior 60+', 'Youth'],
    GENDERS: ['Unknown', 'Male', 'Female', 'Non-binary'],
}));

vi.mock('@/lib/utils/duplicateDetection', () => ({
    findPotentialDuplicates: vi.fn(() => []),
}));

import { findPotentialDuplicates } from '@/lib/utils/duplicateDetection';

describe('GuestCreateModal Component', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the modal with header', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            expect(screen.getByText('Add New Guest')).toBeDefined();
            expect(screen.getByText('Create a new guest record in the system')).toBeDefined();
        });

        it('renders all form fields', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            expect(screen.getByPlaceholderText('e.g. John')).toBeDefined();
            expect(screen.getByPlaceholderText('e.g. Smith')).toBeDefined();
            expect(screen.getByPlaceholderText('The name they want us to call them')).toBeDefined();
            expect(screen.getByText('Housing Status')).toBeDefined();
            expect(screen.getByText('Age Group')).toBeDefined();
            expect(screen.getByText('Gender')).toBeDefined();
        });

        it('renders location and notes fields', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            expect(screen.getByText('Primary Location')).toBeDefined();
            expect(screen.getByPlaceholderText('Any important information staff should know...')).toBeDefined();
            expect(screen.getByPlaceholderText('Color, brand, distinguishing features...')).toBeDefined();
        });

        it('renders action buttons', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            expect(screen.getByText('Cancel')).toBeDefined();
            expect(screen.getByText('Create Guest')).toBeDefined();
        });
    });

    describe('Initial Values', () => {
        it('parses initialName into firstName and lastName', () => {
            render(<GuestCreateModal onClose={mockOnClose} initialName="John Smith" />);
            const firstNameInput = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            const lastNameInput = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
            expect(firstNameInput.value).toBe('John');
            expect(lastNameInput.value).toBe('Smith');
        });

        it('handles single word initialName', () => {
            render(<GuestCreateModal onClose={mockOnClose} initialName="John" />);
            const firstNameInput = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            const lastNameInput = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
            expect(firstNameInput.value).toBe('John');
            expect(lastNameInput.value).toBe('');
        });

        it('handles multi-word last name', () => {
            render(<GuestCreateModal onClose={mockOnClose} initialName="John Van Der Berg" />);
            const firstNameInput = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            const lastNameInput = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
            expect(firstNameInput.value).toBe('John');
            expect(lastNameInput.value).toBe('Van Der Berg');
        });

        it('sets default location when provided', () => {
            render(<GuestCreateModal onClose={mockOnClose} defaultLocation="San Jose" />);
            const selects = screen.getAllByRole('combobox');
            // Location is the 4th select (index 3): Housing, Age, Gender, Location
            const locationSelect = selects[3] as HTMLSelectElement;
            expect(locationSelect.value).toBe('San Jose');
        });

        it('handles empty initialName', () => {
            render(<GuestCreateModal onClose={mockOnClose} initialName="" />);
            const firstNameInput = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            expect(firstNameInput.value).toBe('');
        });
    });

    describe('Form Interactions', () => {
        it('updates firstName on input', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'alice' } });
            expect(input.value).toBe('Alice'); // Title case
        });

        it('updates lastName on input', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'johnson' } });
            expect(input.value).toBe('Johnson'); // Title case
        });

        it('updates preferredName on input', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('The name they want us to call them') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'Ally' } });
            expect(input.value).toBe('Ally');
        });

        it('updates housingStatus on select', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
            fireEvent.change(select, { target: { value: 'Sheltered' } });
            expect(select.value).toBe('Sheltered');
        });

        it('updates ageGroup on select', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const select = screen.getAllByRole('combobox')[1] as HTMLSelectElement;
            fireEvent.change(select, { target: { value: 'Senior 60+' } });
            expect(select.value).toBe('Senior 60+');
        });

        it('updates gender on select', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const select = screen.getAllByRole('combobox')[2] as HTMLSelectElement;
            fireEvent.change(select, { target: { value: 'Male' } });
            expect(select.value).toBe('Male');
        });

        it('updates location on select', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const select = screen.getAllByRole('combobox')[3] as HTMLSelectElement;
            fireEvent.change(select, { target: { value: 'Sunnyvale' } });
            expect(select.value).toBe('Sunnyvale');
        });

        it('updates notes on input', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const textarea = screen.getByPlaceholderText('Any important information staff should know...') as HTMLTextAreaElement;
            fireEvent.change(textarea, { target: { value: 'Test notes' } });
            expect(textarea.value).toBe('Test notes');
        });

        it('updates bicycleDescription on input', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('Color, brand, distinguishing features...') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'Red bike' } });
            expect(input.value).toBe('Red bike');
        });
    });

    describe('Close Actions', () => {
        it('calls onClose when X button clicked', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when Cancel button clicked', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            fireEvent.click(screen.getByText('Cancel'));
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Form Submission', () => {
        it('calls addGuest with form data on submit', async () => {
            mockAddGuest.mockResolvedValueOnce({ id: 'new-guest' });
            render(<GuestCreateModal onClose={mockOnClose} />);

            // Fill required fields
            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'Test' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'User' } });

            // Submit
            fireEvent.click(screen.getByText('Create Guest'));

            await waitFor(() => {
                expect(mockAddGuest).toHaveBeenCalledWith(expect.objectContaining({
                    firstName: 'Test',
                    lastName: 'User',
                }));
            });
        });

        it('closes on successful submit', async () => {
            mockAddGuest.mockResolvedValueOnce({ id: 'new-guest' });
            render(<GuestCreateModal onClose={mockOnClose} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'Test' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'User' } });
            fireEvent.click(screen.getByText('Create Guest'));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it('does not close on submission failure', async () => {
            mockAddGuest.mockRejectedValueOnce(new Error('Database error'));
            render(<GuestCreateModal onClose={mockOnClose} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'Test' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'User' } });
            fireEvent.click(screen.getByText('Create Guest'));

            await waitFor(() => {
                expect(mockAddGuest).toHaveBeenCalled();
            });

            // onClose should not have been called
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Duplicate Detection', () => {
        it('calls findPotentialDuplicates when names are long enough', async () => {
            const mockFindDuplicates = findPotentialDuplicates as ReturnType<typeof vi.fn>;
            mockFindDuplicates.mockReturnValue([]);

            render(<GuestCreateModal onClose={mockOnClose} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'Doe' } });

            await waitFor(() => {
                expect(mockFindDuplicates).toHaveBeenCalled();
            }, { timeout: 1500 });
        });

        it('does not check duplicates for short first name', async () => {
            const mockFindDuplicates = findPotentialDuplicates as ReturnType<typeof vi.fn>;
            render(<GuestCreateModal onClose={mockOnClose} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'J' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'Doe' } });

            await new Promise(r => setTimeout(r, 600));

            // Should not be called because first name is too short
            expect(mockFindDuplicates).not.toHaveBeenCalled();
        });

        it('does not check duplicates for short last name', async () => {
            const mockFindDuplicates = findPotentialDuplicates as ReturnType<typeof vi.fn>;
            render(<GuestCreateModal onClose={mockOnClose} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'D' } });

            await new Promise(r => setTimeout(r, 600));

            // Should not be called because last name is too short
            expect(mockFindDuplicates).not.toHaveBeenCalled();
        });

        it('renders Check In Instead button when duplicate matches exist and calls onSelectExisting', async () => {
            const mockFindDuplicates = findPotentialDuplicates as ReturnType<typeof vi.fn>;
            const duplicateGuest = {
                id: 'dup-1',
                firstName: 'John',
                lastName: 'Doe',
                preferredName: 'Johnny',
                housingStatus: 'Unhoused',
                location: 'Mountain View',
            };
            mockFindDuplicates.mockReturnValue([
                { guest: duplicateGuest, reason: 'Exact name match', confidence: 'high' }
            ]);

            const mockOnSelectExisting = vi.fn();
            render(<GuestCreateModal onClose={mockOnClose} onSelectExisting={mockOnSelectExisting} />);

            fireEvent.change(screen.getByPlaceholderText('e.g. John'), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText('e.g. Smith'), { target: { value: 'Doe' } });

            await waitFor(() => {
                expect(screen.getByText('Possible Existing Profile Found')).toBeDefined();
            }, { timeout: 1500 });

            const checkInBtn = screen.getByText('Check In Instead');
            expect(checkInBtn).toBeDefined();

            fireEvent.click(checkInBtn);
            expect(mockOnSelectExisting).toHaveBeenCalledWith(duplicateGuest);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Title Case Conversion', () => {
        it('converts lowercase first name to title case', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('e.g. John') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'mary jane' } });
            expect(input.value).toBe('Mary Jane');
        });

        it('capitalizes first letter of each word', () => {
            render(<GuestCreateModal onClose={mockOnClose} />);
            const input = screen.getByPlaceholderText('e.g. Smith') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'van der berg' } });
            expect(input.value).toBe('Van Der Berg');
        });
    });
});
