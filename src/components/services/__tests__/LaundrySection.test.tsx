import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LaundrySection } from '../LaundrySection';

const defaultLaundryRecords = [
    { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '1', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
    { id: 'l2', guestId: 'g2', status: 'washer', time: '10:00-10:30', bagNumber: '2', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T10:00:00Z' },
];

const defaultStoreData = {
    laundryRecords: defaultLaundryRecords,
    addLaundryRecord: vi.fn().mockResolvedValue({ id: 'l3' }),
    updateLaundryStatus: vi.fn().mockResolvedValue(true),
    updateLaundryBagNumber: vi.fn().mockResolvedValue(true),
    cancelMultipleLaundry: vi.fn().mockResolvedValue(true),
    loadFromSupabase: vi.fn().mockResolvedValue(undefined),
};

// Use vi.hoisted so the mock ref is available inside vi.mock factory
const { mockUseServicesStore } = vi.hoisted(() => {
    const fn: any = vi.fn();
    fn.getState = vi.fn();
    return { mockUseServicesStore: fn };
});

// Mock dependencies
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: mockUseServicesStore,
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [
            { id: 'g1', name: 'John Doe', preferredName: 'Johnny' },
            { id: 'g2', name: 'Jane Smith', preferredName: '' },
        ],
    })),
}));

vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => <span data-testid="waiver-indicator">Waiver</span>,
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2026-01-08',
    pacificDateStringFrom: (date: string) => date ? date.slice(0, 10) : null,
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

vi.mock('../EndServiceDayPanel', () => ({
    EndServiceDayPanel: ({ showLaundry, isAdmin }: any) => (
        showLaundry && isAdmin ? <div data-testid="end-service-panel">End Service Panel</div> : null
    ),
}));

vi.mock('../admin/SlotBlockModal', () => ({
    SlotBlockModal: () => null,
}));

describe('LaundrySection Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseServicesStore.mockReturnValue({ ...defaultStoreData });
        mockUseServicesStore.getState.mockReturnValue({ ...defaultStoreData });
    });

    describe('Rendering', () => {
        it('renders component without crashing', () => {
            render(<LaundrySection />);
            const container = document.querySelector('.space-y-8');
            expect(container).not.toBeNull();
        });

        it('shows guest names in cards', () => {
            render(<LaundrySection />);
            expect(screen.getAllByText('Johnny').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
        });
    });

    describe('Drag and Drop', () => {
        it('renders cards with cursor-grab class for dragging', () => {
            render(<LaundrySection />);
            const grabCards = document.querySelectorAll('.cursor-grab');
            expect(grabCards.length).toBeGreaterThan(0);
        });

        it('renders grip vertical icons as visual drag indicators', () => {
            render(<LaundrySection />);
            const gripHandles = document.querySelectorAll('[aria-label="Drag to reorder"]');
            expect(gripHandles.length).toBeGreaterThan(0);
        });

        it('entire card is the drag target not just the grip icon', () => {
            render(<LaundrySection />);
            // The cursor-grab card should be the same element that has the drag listener
            // (in @dnd-kit it attaches onPointerDown etc.)
            const grabCards = document.querySelectorAll('.cursor-grab');
            grabCards.forEach(card => {
                // The grip icon should NOT have its own separate pointer-down handler
                const grip = card.querySelector('[aria-label="Drag to reorder"]');
                if (grip) {
                    // Grip should just be a visual indicator, not the drag handle
                    expect(grip.classList.contains('cursor-grab')).toBe(false);
                }
            });
        });
    });

    describe('View Toggle', () => {
        it('shows view toggle buttons', () => {
            render(<LaundrySection />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

    describe('Waiver Indicators', () => {
        it('shows waiver indicators', () => {
            render(<LaundrySection />);
            const indicators = screen.getAllByTestId('waiver-indicator');
            expect(indicators.length).toBeGreaterThan(0);
        });
    });

    describe('End Service Day Panel', () => {
        it('shows end service day panel for admin', () => {
            render(<LaundrySection />);
            expect(screen.getByTestId('end-service-panel')).toBeDefined();
        });
    });

    describe('Legacy Laundry Section', () => {
        it('does not show legacy section when all records are from today', () => {
            render(<LaundrySection />);
            expect(screen.queryByTestId('legacy-laundry-section')).toBeNull();
        });

        it('shows legacy section when past-day records have active status', async () => {
            const legacyRecords = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '1', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
                // Past-day record that is still "done" and needs pickup
                { id: 'l-legacy', guestId: 'g2', status: 'done', time: '10:00-10:30', bagNumber: '5', date: '2026-01-07', laundryType: 'onsite', createdAt: '2026-01-07T10:00:00Z' },
            ];
            const legacyStoreData = { ...defaultStoreData, laundryRecords: legacyRecords };
            mockUseServicesStore.mockReturnValue(legacyStoreData);
            mockUseServicesStore.getState.mockReturnValue(legacyStoreData);

            render(<LaundrySection />);
            expect(screen.getByTestId('legacy-laundry-section')).toBeDefined();
            expect(screen.getByText(/Previous Day Laundry/)).toBeDefined();
        });

        it('does not show legacy section for past-day records that are picked up', async () => {
            const pickedUpRecords = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '1', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
                // Past-day record that has been picked up — should not appear in legacy
                { id: 'l-old', guestId: 'g2', status: 'picked_up', time: '10:00-10:30', bagNumber: '5', date: '2026-01-07', laundryType: 'onsite', createdAt: '2026-01-07T10:00:00Z' },
            ];
            const pickedUpStoreData = { ...defaultStoreData, laundryRecords: pickedUpRecords };
            mockUseServicesStore.mockReturnValue(pickedUpStoreData);
            mockUseServicesStore.getState.mockReturnValue(pickedUpStoreData);

            render(<LaundrySection />);
            expect(screen.queryByTestId('legacy-laundry-section')).toBeNull();
        });
    });

    describe('Bag Number Validation in Kanban', () => {
        it('does not prompt for bag number when record already has one (status dropdown)', async () => {
            // Record in "waiting" with bag number already set
            const records = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: 'B42', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
            ];
            const storeData = { ...defaultStoreData, laundryRecords: records };
            mockUseServicesStore.mockReturnValue(storeData);
            mockUseServicesStore.getState.mockReturnValue(storeData);

            const promptSpy = vi.spyOn(window, 'prompt');
            render(<LaundrySection />);

            // Expand the card to access the status dropdown
            const expandBtn = screen.getByLabelText('Expand laundry details');
            fireEvent.click(expandBtn);

            // Change status from waiting to washer via dropdown
            const dropdown = screen.getByDisplayValue('Waiting');
            fireEvent.change(dropdown, { target: { value: 'washer' } });

            await waitFor(() => {
                expect(promptSpy).not.toHaveBeenCalled();
                expect(storeData.updateLaundryStatus).toHaveBeenCalledWith('l1', 'washer');
            });

            promptSpy.mockRestore();
        });

        it('reads fresh record from store getState to avoid stale closures', async () => {
            // Simulate stale closure: hook-level record has NO bag number
            const staleRecords = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
            ];
            // But getState returns the FRESH record with a bag number
            const freshRecords = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: 'B99', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
            ];
            const staleStoreData = { ...defaultStoreData, laundryRecords: staleRecords };
            const freshStoreData = { ...defaultStoreData, laundryRecords: freshRecords };
            mockUseServicesStore.mockReturnValue(staleStoreData);
            mockUseServicesStore.getState.mockReturnValue(freshStoreData);

            const promptSpy = vi.spyOn(window, 'prompt');
            render(<LaundrySection />);

            // Expand card and change status
            const expandBtn = screen.getByLabelText('Expand laundry details');
            fireEvent.click(expandBtn);

            const dropdown = screen.getByDisplayValue('Waiting');
            fireEvent.change(dropdown, { target: { value: 'washer' } });

            await waitFor(() => {
                // Should NOT prompt because getState() has the fresh record with bag number
                expect(promptSpy).not.toHaveBeenCalled();
                expect(freshStoreData.updateLaundryStatus).toHaveBeenCalledWith('l1', 'washer');
            });

            promptSpy.mockRestore();
        });

        it('prompts for bag number when record has no bag number', async () => {
            const records = [
                { id: 'l1', guestId: 'g1', status: 'waiting', time: '09:00-09:30', bagNumber: '', date: '2026-01-08', laundryType: 'onsite', createdAt: '2026-01-08T09:00:00Z' },
            ];
            const storeData = { ...defaultStoreData, laundryRecords: records };
            mockUseServicesStore.mockReturnValue(storeData);
            mockUseServicesStore.getState.mockReturnValue(storeData);

            const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('B77');
            render(<LaundrySection />);

            // Expand card and change status
            const expandBtn = screen.getByLabelText('Expand laundry details');
            fireEvent.click(expandBtn);

            const dropdown = screen.getByDisplayValue('Waiting');
            fireEvent.change(dropdown, { target: { value: 'washer' } });

            await waitFor(() => {
                expect(promptSpy).toHaveBeenCalled();
                expect(storeData.updateLaundryBagNumber).toHaveBeenCalledWith('l1', 'B77');
            });

            promptSpy.mockRestore();
        });
    });
});
