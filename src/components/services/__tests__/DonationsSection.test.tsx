import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DonationsSection, groupDonationsByItem, getRecentItemNames } from '../DonationsSection';
import { DonationRecord } from '@/types/database';

// Mock the stores
const mockDonationsStore = {
    donationRecords: [] as DonationRecord[],
    laPlazaRecords: [] as any[],
    addDonation: vi.fn().mockResolvedValue({ id: 'd-new' }),
    updateDonation: vi.fn().mockResolvedValue(true),
    deleteDonation: vi.fn().mockResolvedValue(true),
    addLaPlazaDonation: vi.fn().mockResolvedValue(true),
    updateLaPlazaDonation: vi.fn().mockResolvedValue(true),
    deleteLaPlazaDonation: vi.fn().mockResolvedValue(true),
};

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: () => mockDonationsStore
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2024-01-15',
    pacificDateStringFrom: (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

vi.mock('@/lib/utils/donationUtils', () => ({
    calculateServings: () => 20,
    deriveDonationDateKey: (record: any) => record.dateKey || '2024-01-15',
    formatProteinAndCarbsClipboardText: () => 'Mock clipboard text',
    DENSITY_SERVINGS: { light: 10, medium: 20, high: 30 }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
    },
});

// Create sample donation records for testing
const createDonationRecord = (overrides: Partial<DonationRecord> = {}): DonationRecord => ({
    id: `id-${Math.random().toString(36).substr(2, 9)}`,
    type: 'Protein',
    itemName: 'Chicken breast',
    trays: 2,
    weightLbs: 5.5,
    density: 'medium',
    servings: 20,
    temperature: '165°F',
    donor: 'LinkedIn',
    dateKey: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z',
    donatedAt: '2024-01-15T10:00:00Z',
    ...overrides
});

describe('groupDonationsByItem', () => {
    it('groups records by type and item name (case-insensitive)', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ type: 'Protein', itemName: 'Chicken', weightLbs: 5, trays: 2, servings: 20 }),
            createDonationRecord({ type: 'Protein', itemName: 'chicken', weightLbs: 3, trays: 1, servings: 10 }),
            createDonationRecord({ type: 'Protein', itemName: 'CHICKEN', weightLbs: 4, trays: 2, servings: 15 }),
            createDonationRecord({ type: 'Carbs', itemName: 'Rice', weightLbs: 10, trays: 3, servings: 30 })
        ];

        const grouped = groupDonationsByItem(records);

        expect(grouped).toHaveLength(2);
        
        const chickenGroup = grouped.find(g => g.itemName.toLowerCase() === 'chicken');
        expect(chickenGroup).toBeDefined();
        expect(chickenGroup!.entries).toHaveLength(3);
        expect(chickenGroup!.totalWeight).toBe(12);
        expect(chickenGroup!.totalTrays).toBe(5);
        expect(chickenGroup!.totalServings).toBe(45);

        const riceGroup = grouped.find(g => g.itemName.toLowerCase() === 'rice');
        expect(riceGroup).toBeDefined();
        expect(riceGroup!.entries).toHaveLength(1);
    });

    it('keeps different types separate even with same item name', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ type: 'Protein', itemName: 'Beans', weightLbs: 5 }),
            createDonationRecord({ type: 'Veggie Protein', itemName: 'Beans', weightLbs: 3 })
        ];

        const grouped = groupDonationsByItem(records);

        expect(grouped).toHaveLength(2);
        expect(grouped.find(g => g.type === 'Protein')).toBeDefined();
        expect(grouped.find(g => g.type === 'Veggie Protein')).toBeDefined();
    });

    it('sorts groups by type then item name', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ type: 'Carbs', itemName: 'Bread' }),
            createDonationRecord({ type: 'Protein', itemName: 'Chicken' }),
            createDonationRecord({ type: 'Carbs', itemName: 'Rice' }),
            createDonationRecord({ type: 'Protein', itemName: 'Beef' })
        ];

        const grouped = groupDonationsByItem(records);

        expect(grouped[0].type).toBe('Carbs');
        expect(grouped[0].itemName.toLowerCase()).toBe('bread');
        expect(grouped[1].type).toBe('Carbs');
        expect(grouped[1].itemName.toLowerCase()).toBe('rice');
        expect(grouped[2].type).toBe('Protein');
        expect(grouped[2].itemName.toLowerCase()).toBe('beef');
        expect(grouped[3].type).toBe('Protein');
        expect(grouped[3].itemName.toLowerCase()).toBe('chicken');
    });

    it('returns empty array for empty input', () => {
        const grouped = groupDonationsByItem([]);
        expect(grouped).toHaveLength(0);
    });

    it('handles records with missing or empty item names', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ type: 'Protein', itemName: '' }),
            createDonationRecord({ type: 'Protein', itemName: '  ' }),
            createDonationRecord({ type: 'Protein', itemName: 'Chicken' })
        ];

        const grouped = groupDonationsByItem(records);

        expect(grouped.length).toBeGreaterThanOrEqual(1);
        const chickenGroup = grouped.find(g => g.itemName === 'Chicken');
        expect(chickenGroup).toBeDefined();
    });

    it('calculates cumulative totals correctly with decimal weights', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ type: 'Protein', itemName: 'Fish', weightLbs: 2.5, trays: 1, servings: 10 }),
            createDonationRecord({ type: 'Protein', itemName: 'Fish', weightLbs: 3.7, trays: 2, servings: 15 }),
            createDonationRecord({ type: 'Protein', itemName: 'Fish', weightLbs: 1.8, trays: 1, servings: 8 })
        ];

        const grouped = groupDonationsByItem(records);
        const fishGroup = grouped.find(g => g.itemName === 'Fish')!;

        expect(fishGroup.totalWeight).toBeCloseTo(8.0, 1);
        expect(fishGroup.totalTrays).toBe(4);
        expect(fishGroup.totalServings).toBe(33);
    });
});

describe('getRecentItemNames', () => {
    it('returns unique item names sorted by most recent first', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ itemName: 'Oldest Item', donatedAt: '2024-01-10T10:00:00Z' }),
            createDonationRecord({ itemName: 'Middle Item', donatedAt: '2024-01-12T10:00:00Z' }),
            createDonationRecord({ itemName: 'Newest Item', donatedAt: '2024-01-15T10:00:00Z' })
        ];

        const recent = getRecentItemNames(records, 5);

        expect(recent[0]).toBe('Newest Item');
        expect(recent[1]).toBe('Middle Item');
        expect(recent[2]).toBe('Oldest Item');
    });

    it('returns only unique item names (case-insensitive)', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ itemName: 'Chicken', donatedAt: '2024-01-15T12:00:00Z' }),
            createDonationRecord({ itemName: 'CHICKEN', donatedAt: '2024-01-15T11:00:00Z' }),
            createDonationRecord({ itemName: 'chicken', donatedAt: '2024-01-15T10:00:00Z' }),
            createDonationRecord({ itemName: 'Beef', donatedAt: '2024-01-14T10:00:00Z' })
        ];

        const recent = getRecentItemNames(records, 5);

        expect(recent).toHaveLength(2);
        expect(recent[0]).toBe('Chicken');
        expect(recent[1]).toBe('Beef');
    });

    it('respects the limit parameter', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ itemName: 'Item 1', donatedAt: '2024-01-15T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item 2', donatedAt: '2024-01-14T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item 3', donatedAt: '2024-01-13T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item 4', donatedAt: '2024-01-12T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item 5', donatedAt: '2024-01-11T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item 6', donatedAt: '2024-01-10T10:00:00Z' })
        ];

        const recent = getRecentItemNames(records, 3);

        expect(recent).toHaveLength(3);
        expect(recent).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('skips empty item names', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ itemName: '', donatedAt: '2024-01-15T12:00:00Z' }),
            createDonationRecord({ itemName: '   ', donatedAt: '2024-01-15T11:00:00Z' }),
            createDonationRecord({ itemName: 'Valid Item', donatedAt: '2024-01-15T10:00:00Z' })
        ];

        const recent = getRecentItemNames(records, 5);

        expect(recent).toHaveLength(1);
        expect(recent[0]).toBe('Valid Item');
    });

    it('returns empty array for empty input', () => {
        const recent = getRecentItemNames([], 5);
        expect(recent).toHaveLength(0);
    });

    it('uses createdAt as fallback when donatedAt is missing', () => {
        const records: DonationRecord[] = [
            createDonationRecord({ itemName: 'Item A', donatedAt: undefined, createdAt: '2024-01-15T10:00:00Z' }),
            createDonationRecord({ itemName: 'Item B', donatedAt: undefined, createdAt: '2024-01-14T10:00:00Z' })
        ];

        const recent = getRecentItemNames(records, 5);

        expect(recent[0]).toBe('Item A');
        expect(recent[1]).toBe('Item B');
    });
});

describe('DonationsSection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDonationsStore.donationRecords = [];
        mockDonationsStore.laPlazaRecords = [];
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Rendering', () => {
        it('renders the header and view mode toggle', () => {
            render(<DonationsSection />);

            expect(screen.getByText('General Donations')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'La Plaza' })).toBeInTheDocument();
        });

        it('displays empty state when no records exist', () => {
            render(<DonationsSection />);

            expect(screen.getByText('No records for this date')).toBeInTheDocument();
            expect(screen.getByText('Add donations using the form on the left')).toBeInTheDocument();
        });

        it('renders form with all fields', () => {
            render(<DonationsSection />);

            // Use getByText for labels instead of getByLabelText since there's no 'for' attribute
            expect(screen.getByText('Type')).toBeInTheDocument();
            expect(screen.getByText('Item Name')).toBeInTheDocument();
            expect(screen.getByText('Trays')).toBeInTheDocument();
            expect(screen.getByText(/Weight/)).toBeInTheDocument();
            expect(screen.getByText('Density')).toBeInTheDocument();
            expect(screen.getByText(/Donor/)).toBeInTheDocument();
        });
    });

    describe('Grouped Display', () => {
        it('renders grouped donation cards when records exist', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ type: 'Protein', itemName: 'Chicken', weightLbs: 5 }),
                createDonationRecord({ type: 'Protein', itemName: 'Chicken', weightLbs: 3 }),
                createDonationRecord({ type: 'Carbs', itemName: 'Rice', weightLbs: 10 })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            // Use getAllBy since items appear both as quick select button and card header
            const chickenElements = screen.getAllByText('Chicken');
            expect(chickenElements.length).toBeGreaterThanOrEqual(1);
            
            const riceElements = screen.getAllByText('Rice');
            expect(riceElements.length).toBeGreaterThanOrEqual(1);
            
            expect(screen.getByText('2 entries')).toBeInTheDocument();
            expect(screen.getByText('8.0 lbs total')).toBeInTheDocument();
        });

        it('shows daily summary totals when records exist', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ weightLbs: 5, trays: 2, servings: 20 }),
                createDonationRecord({ weightLbs: 3, trays: 1, servings: 10 })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText('8.0')).toBeInTheDocument();
            expect(screen.getByText('lbs total')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('trays')).toBeInTheDocument();
        });
    });

    describe('Quick Select Feature', () => {
        it('displays quick select buttons for recent items', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ itemName: 'Chicken', donatedAt: '2024-01-15T12:00:00Z' }),
                createDonationRecord({ itemName: 'Beef', donatedAt: '2024-01-14T10:00:00Z' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText('Quick Select')).toBeInTheDocument();
            const quickSelectChicken = screen.getByRole('button', { name: 'Chicken' });
            const quickSelectBeef = screen.getByRole('button', { name: 'Beef' });

            expect(quickSelectChicken).toBeInTheDocument();
            expect(quickSelectBeef).toBeInTheDocument();
        });

        it('fills item name input when quick select button is clicked', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ itemName: 'Chicken', donatedAt: '2024-01-15T12:00:00Z' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const quickSelectButton = screen.getByRole('button', { name: 'Chicken' });
            const itemNameInput = screen.getByPlaceholderText('e.g. Chicken breast') as HTMLInputElement;

            expect(itemNameInput.value).toBe('');

            await act(async () => {
                fireEvent.click(quickSelectButton);
            });

            expect(itemNameInput.value).toBe('Chicken');
        });

        it('does not show quick select when no recent items exist', async () => {
            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
        });

        it('highlights currently selected quick select button', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ itemName: 'Item A' }),
                createDonationRecord({ itemName: 'Item B' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const itemAButton = screen.getByRole('button', { name: 'Item A' });
            await act(async () => {
                fireEvent.click(itemAButton);
            });

            expect(itemAButton).toHaveClass('bg-emerald-100');
        });

        it('limits quick select to 5 recent items', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ itemName: 'Item 1', donatedAt: '2024-01-15T10:00:00Z' }),
                createDonationRecord({ itemName: 'Item 2', donatedAt: '2024-01-15T09:00:00Z' }),
                createDonationRecord({ itemName: 'Item 3', donatedAt: '2024-01-15T08:00:00Z' }),
                createDonationRecord({ itemName: 'Item 4', donatedAt: '2024-01-15T07:00:00Z' }),
                createDonationRecord({ itemName: 'Item 5', donatedAt: '2024-01-15T06:00:00Z' }),
                createDonationRecord({ itemName: 'Item 6', donatedAt: '2024-01-15T05:00:00Z' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const quickSelectButtons = screen.getAllByRole('button').filter(btn => 
                btn.textContent?.startsWith('Item ')
            );
            expect(quickSelectButtons).toHaveLength(5);
            expect(screen.queryByRole('button', { name: 'Item 6' })).not.toBeInTheDocument();
        });
    });

    describe('Card Expansion', () => {
        it('expands grouped card to show individual entries', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: '1', itemName: 'Chicken', weightLbs: 5, donor: 'LinkedIn' }),
                createDonationRecord({ id: '2', itemName: 'Chicken', weightLbs: 3, donor: 'Waymo' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const expandButton = screen.getByLabelText('Expand entries');
            expect(expandButton).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(expandButton);
            });

            expect(screen.getByText(/LinkedIn/)).toBeInTheDocument();
            expect(screen.getByText(/Waymo/)).toBeInTheDocument();
        });

        it('shows edit/delete buttons for single entry groups', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: '1', itemName: 'Unique Item' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const editButtons = screen.getAllByLabelText('Edit entry');
            const deleteButtons = screen.getAllByLabelText('Delete entry');

            expect(editButtons.length).toBeGreaterThan(0);
            expect(deleteButtons.length).toBeGreaterThan(0);
        });

        it('auto-expands single entry groups', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: '1', itemName: 'Solo Item', donor: 'Donor1' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.queryByLabelText('Expand entries')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Collapse entries')).not.toBeInTheDocument();
        });

        it('toggles expansion on header click for multi-entry groups', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: '1', itemName: 'Grouped', donor: 'Donor A' }),
                createDonationRecord({ id: '2', itemName: 'Grouped', donor: 'Donor B' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            // Initially collapsed
            expect(screen.queryByText(/Donor A/)).not.toBeInTheDocument();

            // Click to expand
            const expandButton = screen.getByLabelText('Expand entries');
            await act(async () => {
                fireEvent.click(expandButton);
            });

            // Now expanded
            expect(screen.getByText(/Donor A/)).toBeInTheDocument();
            expect(screen.getByText(/Donor B/)).toBeInTheDocument();

            // Click to collapse
            const collapseButton = screen.getByLabelText('Collapse entries');
            await act(async () => {
                fireEvent.click(collapseButton);
            });

            // Collapsed again
            expect(screen.queryByText(/Donor A/)).not.toBeInTheDocument();
        });
    });

    describe('Tab Switching', () => {
        it('switches between General and La Plaza view modes', async () => {
            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText('General Donations')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'La Plaza' }));
            });

            expect(screen.getByText('La Plaza Donations')).toBeInTheDocument();
        });
    });

    describe('Edit/Delete Operations', () => {
        it('calls deleteDonation when delete button is clicked and confirmed', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: 'test-id-1', itemName: 'Test Item' })
            ];

            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

            await act(async () => {
                render(<DonationsSection />);
            });

            const deleteButton = screen.getByLabelText('Delete entry');

            await act(async () => {
                fireEvent.click(deleteButton);
            });

            expect(confirmSpy).toHaveBeenCalledWith('Delete this record?');
            expect(mockDonationsStore.deleteDonation).toHaveBeenCalledWith('test-id-1');

            confirmSpy.mockRestore();
        });

        it('does not delete when confirmation is cancelled', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: 'test-id-1', itemName: 'Test Item' })
            ];

            const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

            await act(async () => {
                render(<DonationsSection />);
            });

            const deleteButton = screen.getByLabelText('Delete entry');

            await act(async () => {
                fireEvent.click(deleteButton);
            });

            expect(mockDonationsStore.deleteDonation).not.toHaveBeenCalled();

            confirmSpy.mockRestore();
        });

        it('populates form when edit button is clicked', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({
                    id: 'test-id-1',
                    itemName: 'Chicken',
                    type: 'Protein',
                    trays: 3,
                    weightLbs: 7.5,
                    donor: 'Test Donor'
                })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            const editButton = screen.getByLabelText('Edit entry');

            await act(async () => {
                fireEvent.click(editButton);
            });

            expect(screen.getByText('Edit Record')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Chicken')).toBeInTheDocument();
            expect(screen.getByDisplayValue('3')).toBeInTheDocument();
            expect(screen.getByDisplayValue('7.5')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test Donor')).toBeInTheDocument();
        });

        it('shows cancel button and resets form when editing', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: 'test-id-1', itemName: 'Chicken' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            await act(async () => {
                fireEvent.click(screen.getByLabelText('Edit entry'));
            });

            expect(screen.getByText('Cancel')).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByText('Cancel'));
            });

            expect(screen.queryByText('Edit Record')).not.toBeInTheDocument();
            expect(screen.getByText('Log New Item')).toBeInTheDocument();
        });

        it('calls updateDonation when editing existing record', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ id: 'edit-id', itemName: 'Original' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            await act(async () => {
                fireEvent.click(screen.getByLabelText('Edit entry'));
            });

            const itemNameInput = screen.getByDisplayValue('Original');
            await act(async () => {
                fireEvent.change(itemNameInput, { target: { value: 'Updated' } });
            });

            const updateButton = screen.getByRole('button', { name: /Update Record/ });
            await act(async () => {
                fireEvent.click(updateButton);
            });

            expect(mockDonationsStore.updateDonation).toHaveBeenCalledWith(
                'edit-id',
                expect.objectContaining({
                    item_name: 'Updated'
                })
            );
        });
    });

    describe('Date Navigation', () => {
        it('navigates dates with prev/next buttons', async () => {
            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();

            const prevButton = screen.getByTitle('Previous day');
            await act(async () => {
                fireEvent.click(prevButton);
            });

            expect(screen.getByText(/January 14, 2024/)).toBeInTheDocument();

            const nextButton = screen.getByTitle('Next day');
            await act(async () => {
                fireEvent.click(nextButton);
            });

            expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
        });

        it('shows Today button when not on current date', async () => {
            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByTitle('Previous day'));
            });

            expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: 'Today' }));
            });

            expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('submits new donation and calls addDonation', async () => {
            await act(async () => {
                render(<DonationsSection />);
            });

            const itemNameInput = screen.getByPlaceholderText('e.g. Chicken breast');
            const traysInput = screen.getByPlaceholderText('0');
            const weightInput = screen.getByPlaceholderText('0.0');

            await act(async () => {
                fireEvent.change(itemNameInput, { target: { value: 'Test Food' } });
                fireEvent.change(traysInput, { target: { value: '2' } });
                fireEvent.change(weightInput, { target: { value: '5' } });
            });

            const submitButton = screen.getByRole('button', { name: /Save Record/ });

            await act(async () => {
                fireEvent.click(submitButton);
            });

            expect(mockDonationsStore.addDonation).toHaveBeenCalledWith(
                expect.objectContaining({
                    item_name: 'Test Food',
                    trays: 2,
                    weight_lbs: 5,
                    donation_type: 'Protein'
                })
            );
        });
    });

    describe('Daily Totals Calculation', () => {
        it('calculates correct totals for multiple records', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ weightLbs: 10.5, trays: 3, servings: 50 }),
                createDonationRecord({ weightLbs: 5.5, trays: 2, servings: 25 }),
                createDonationRecord({ weightLbs: 4.0, trays: 1, servings: 15 })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText('20.0')).toBeInTheDocument();
            expect(screen.getByText('6')).toBeInTheDocument();
            expect(screen.getByText('~90')).toBeInTheDocument();
        });

        it('shows unique items count in daily totals', async () => {
            mockDonationsStore.donationRecords = [
                createDonationRecord({ itemName: 'Chicken', type: 'Protein' }),
                createDonationRecord({ itemName: 'Chicken', type: 'Protein' }),
                createDonationRecord({ itemName: 'Rice', type: 'Carbs' }),
                createDonationRecord({ itemName: 'Bread', type: 'Carbs' })
            ];

            await act(async () => {
                render(<DonationsSection />);
            });

            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('unique items')).toBeInTheDocument();
        });
    });
});
