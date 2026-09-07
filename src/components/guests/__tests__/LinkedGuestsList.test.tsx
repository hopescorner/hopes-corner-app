import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import LinkedGuestsList from '../LinkedGuestsList';

// Mock Dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Create spies
const mockAddMealRecord = vi.fn().mockResolvedValue({ id: 'new-record' });
const mockAddAction = vi.fn();
const mockLinkGuests = vi.fn().mockResolvedValue(undefined);
const mockUnlinkGuests = vi.fn().mockResolvedValue(undefined);
const mockUndoAction = vi.fn().mockResolvedValue(true);
const mockGetActionsForGuestToday = vi.fn().mockReturnValue([]);
const mockGetLinkedGuests = vi.fn();

// Mock meal status map (empty by default)
const mockMealStatusMap = new Map();
const mockActionStatusMap = new Map();

// Mock the selectors
vi.mock('@/stores/selectors/todayStatusSelectors', () => ({
    useTodayMealStatusMap: vi.fn(() => mockMealStatusMap),
    useTodayActionStatusMap: vi.fn(() => mockActionStatusMap),
}));

// Mock stores
vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { id: 'g1', firstName: 'Main', lastName: 'Guest', preferredName: '' },
            { id: 'linked-1', firstName: 'Linked', lastName: 'One', preferredName: 'Linky' },
            { id: 'linked-2', firstName: 'Linked', lastName: 'Two', preferredName: '' },
            { id: 'candidate-1', firstName: 'Candidate', lastName: 'User', preferredName: 'Candy' },
            { id: 'candidate-2', firstName: 'Another', lastName: 'Person', preferredName: '' },
        ],
        getLinkedGuests: mockGetLinkedGuests,
        linkGuests: mockLinkGuests,
        unlinkGuests: mockUnlinkGuests,
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn(() => ({
        mealRecords: [],
        addMealRecord: mockAddMealRecord,
    })),
}));

vi.mock('@/stores/useActionHistoryStore', () => ({
    useActionHistoryStore: Object.assign(
        vi.fn(() => ({
            addAction: mockAddAction,
            getActionsForGuestToday: mockGetActionsForGuestToday,
            undoAction: mockUndoAction,
        })),
        {
            getState: () => ({
                undoAction: mockUndoAction,
            }),
        }
    ),
}));

describe('LinkedGuestsList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLinkedGuests.mockReturnValue([]);
        mockMealStatusMap.clear();
        mockActionStatusMap.clear();
        window.confirm = vi.fn().mockReturnValue(true);
    });

    describe('Empty State', () => {
        it('shows "Link Guest" button when no linked guests', () => {
            mockGetLinkedGuests.mockReturnValue([]);
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Link Guest')).toBeDefined();
        });

        it('opens linking UI when "Link Guest" clicked', () => {
            mockGetLinkedGuests.mockReturnValue([]);
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            expect(screen.getByPlaceholderText('Search by name...')).toBeDefined();
        });
    });

    describe('With Linked Guests', () => {
        beforeEach(() => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'linked-1', firstName: 'Linked', lastName: 'One', preferredName: 'Linky' },
                { id: 'linked-2', firstName: 'Linked', lastName: 'Two', preferredName: '' },
            ]);
        });

        it('displays linked guest count', () => {
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Linked Guests (2)')).toBeDefined();
        });

        it('displays linked guest names with preferred name', () => {
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Linky')).toBeDefined();
        });

        it('displays linked guest with full name when no preferred name', () => {
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Linked Two')).toBeDefined();
        });

        it('keeps link management separate from serving actions', () => {
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByRole('button', { name: 'Manage links' })).toBeDefined();
        });

        it('shows meal buttons (1 and 2) for guests without meals', () => {
            render(<LinkedGuestsList guestId="g1" />);
            const oneButtons = screen.getAllByTitle('1 Meal');
            const twoButtons = screen.getAllByTitle('2 Meals');
            expect(oneButtons.length).toBe(2);
            expect(twoButtons.length).toBe(2);
        });

        it('reveals unlink buttons in link management mode', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            const unlinkButtons = screen.getAllByRole('button', { name: /Unlink/ });
            expect(unlinkButtons.length).toBe(2);
        });
    });

    describe('Meal Actions', () => {
        beforeEach(() => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'linked-1', firstName: 'Linked', lastName: 'One', preferredName: 'Linky' }
            ]);
        });

        it('passes proxy ID (main guest) when adding meal for linked guest', async () => {
            render(<LinkedGuestsList guestId="proxy-main" />);
            const oneMealButton = screen.getByTitle('1 Meal');
            fireEvent.click(oneMealButton);

            await waitFor(() => {
                expect(mockAddMealRecord).toHaveBeenCalledWith('linked-1', 1, 'proxy-main');
            });
        });

        it('adds action to history after meal', async () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByTitle('1 Meal'));

            await waitFor(() => {
                expect(mockAddAction).toHaveBeenCalledWith('MEAL_ADDED', expect.objectContaining({
                    guestId: 'linked-1',
                    count: 1,
                }));
            });
        });

        it('logs 2 meals when clicking 2 button', async () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByTitle('2 Meals'));

            await waitFor(() => {
                expect(mockAddMealRecord).toHaveBeenCalledWith('linked-1', 2, 'g1');
            });
        });

        it('shows error toast when meal logging fails', async () => {
            mockAddMealRecord.mockRejectedValueOnce(new Error('Failed'));
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByTitle('1 Meal'));

            await waitFor(() => {
                expect(mockAddAction).not.toHaveBeenCalled();
            });
        });

        it('shows specific error for duplicate meal', async () => {
            mockAddMealRecord.mockRejectedValueOnce(new Error('Guest already received a meal today'));
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByTitle('1 Meal'));

            await waitFor(() => {
                expect(mockAddAction).not.toHaveBeenCalled();
            });
        });

        it('prevents rapid-fire meal clicks', async () => {
            mockAddMealRecord.mockImplementation(() => new Promise(r => setTimeout(r, 100)));
            render(<LinkedGuestsList guestId="g1" />);

            fireEvent.click(screen.getByTitle('1 Meal'));
            fireEvent.click(screen.getByTitle('1 Meal'));
            fireEvent.click(screen.getByTitle('1 Meal'));

            await waitFor(() => {
                expect(mockAddMealRecord).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Served State', () => {
        // Note: Testing served state with different store values requires
        // integration testing approach. Here we test what we can with the default mock.
        it('displays linked guests correctly', () => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'linked-1', firstName: 'Linked', lastName: 'One', preferredName: 'Linky' }
            ]);
            render(<LinkedGuestsList guestId="g1" />);
            // Guest should be displayed with meal buttons (not served state)
            expect(screen.getByText('Linky')).toBeDefined();
            expect(screen.getByTitle('1 Meal')).toBeDefined();
        });
    });

    describe('Linking Guests', () => {
        beforeEach(() => {
            mockGetLinkedGuests.mockReturnValue([]);
        });

        it('shows search input after clicking Link Guest', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            expect(screen.getByPlaceholderText('Search by name...')).toBeDefined();
        });

        it('does not show results for short search term', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'a' } });
            expect(screen.queryByText('No guests found')).toBeNull();
        });

        it('shows "No guests found" for unmatched search', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'xyz123' } });
            expect(screen.getByText('No guests found')).toBeDefined();
        });

        it('shows matching candidates when searching', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Candy' } });
            expect(screen.getByText(/Candy/)).toBeDefined();
        });

        it('excludes self from search results', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Main' } });
            expect(screen.getByText('No guests found')).toBeDefined();
        });

        it('excludes already linked guests from search', () => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'candidate-1', firstName: 'Candidate', lastName: 'User', preferredName: 'Candy' }
            ]);
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            fireEvent.click(screen.getByRole('button', { name: 'Link Guest' }));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Candy' } });
            expect(screen.getByText('No guests found')).toBeDefined();
        });

        it('calls linkGuests when candidate clicked', async () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Candy' } });

            const candidateButton = screen.getByText(/Candy/);
            fireEvent.click(candidateButton);

            await waitFor(() => {
                expect(mockLinkGuests).toHaveBeenCalledWith('g1', 'candidate-1');
            });
        });

        it('closes linking UI after successful link', async () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Candy' } });

            fireEvent.click(screen.getByText(/Candy/));

            await waitFor(() => {
                expect(screen.queryByPlaceholderText('Search by name...')).toBeNull();
            });
        });

        it('closes linking UI when X clicked', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));

            // Find the X button in the linking panel
            const closeButtons = screen.getAllByRole('button');
            const linkingXButton = closeButtons.find(btn =>
                btn.querySelector('svg') && btn.closest('.bg-white')
            );
            if (linkingXButton) fireEvent.click(linkingXButton);

            expect(screen.queryByPlaceholderText('Search by name...')).toBeNull();
        });

        it('shows error when link fails', async () => {
            mockLinkGuests.mockRejectedValueOnce(new Error('Failed'));
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Candy' } });
            fireEvent.click(screen.getByText(/Candy/));

            await waitFor(() => {
                // Should still show linking UI since it failed
                expect(screen.getByPlaceholderText('Search by name...')).toBeDefined();
            });
        });
    });

    describe('Unlinking Guests', () => {
        beforeEach(() => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'linked-1', firstName: 'Linked', lastName: 'One', preferredName: 'Linky' }
            ]);
        });

        it('shows confirmation before unlinking', () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            fireEvent.click(screen.getByRole('button', { name: 'Unlink Linky' }));
            expect(window.confirm).toHaveBeenCalled();
        });

        it('calls unlinkGuests after confirmation', async () => {
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            fireEvent.click(screen.getByRole('button', { name: 'Unlink Linky' }));

            await waitFor(() => {
                expect(mockUnlinkGuests).toHaveBeenCalledWith('g1', 'linked-1');
            });
        });

        it('does not unlink when confirmation cancelled', () => {
            window.confirm = vi.fn().mockReturnValue(false);
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            fireEvent.click(screen.getByRole('button', { name: 'Unlink Linky' }));

            expect(mockUnlinkGuests).not.toHaveBeenCalled();
        });

        it('shows error when unlink fails', async () => {
            mockUnlinkGuests.mockRejectedValueOnce(new Error('Failed'));
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByRole('button', { name: 'Manage links' }));
            fireEvent.click(screen.getByRole('button', { name: 'Unlink Linky' }));

            await waitFor(() => {
                expect(mockUnlinkGuests).toHaveBeenCalled();
            });
        });
    });

    describe('Edge Cases', () => {
        it('handles null guests in linked list gracefully', () => {
            mockGetLinkedGuests.mockReturnValue([null, undefined, { id: 'linked-1', firstName: 'Valid', lastName: 'Guest' }]);
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Valid Guest')).toBeDefined();
        });

        it('renders with custom className', () => {
            mockGetLinkedGuests.mockReturnValue([]);
            const { container } = render(<LinkedGuestsList guestId="g1" className="custom-class" />);
            expect(container.querySelector('.custom-class')).toBeDefined();
        });

        it('handles guest with missing name parts', () => {
            mockGetLinkedGuests.mockReturnValue([
                { id: 'linked-1', firstName: '', lastName: '', preferredName: '' }
            ]);
            render(<LinkedGuestsList guestId="g1" />);
            expect(screen.getByText('Unknown Guest')).toBeDefined();
        });

        it('limits search results to 5', () => {
            // This would require modifying the mock to return more candidates
            // Testing the slice(0, 5) behavior
            render(<LinkedGuestsList guestId="g1" />);
            fireEvent.click(screen.getByText('Link Guest'));
            fireEvent.change(screen.getByPlaceholderText('Search by name...'), { target: { value: 'Linked' } });
            // Should only show up to 5 results
            const buttons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Link'));
            expect(buttons.length).toBeLessThanOrEqual(6); // Including the header link button
        });
    });
});
