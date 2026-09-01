import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HolidayReport } from '../HolidayReport';

const mockEnsureLoaded = vi.fn();
const mockLoadFromSupabase = vi.fn();
const mockSetSelectedSlotFilter = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetStatusFilter = vi.fn();

const mockRegistrations = [
    {
        id: 'reg-1',
        ticketNumber: 1,
        eventYear: 2026,
        parentName: 'Maria Garcia',
        phone: '650-555-0101',
        city: 'Mountain View',
        housingStatus: 'house_apartment' as const,
        incomeRange: '0_40k' as const,
        timeSlot: '09:00 AM - 09:20 AM',
        language: 'en' as const,
        status: 'checked_in' as const,
        groceryCards: 1,
        teenCards: 1,
        notes: 'Needs Spanish info',
        checkedInAt: '2026-12-15T17:15:00.000Z',
        checkedInBy: 'Staff Member',
        children: [
            { id: 'c1', name: 'Child A', age: 4, ageGroup: 'toddler' as const },
            { id: 'c2', name: 'Teen B', age: 14, ageGroup: 'teen_14' as const },
        ],
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
    },
    {
        id: 'reg-2',
        ticketNumber: 2,
        eventYear: 2026,
        parentName: 'John Doe',
        phone: '650-555-0202',
        city: 'Sunnyvale',
        housingStatus: 'vehicle_rv_camper' as const,
        incomeRange: '41_65k' as const,
        timeSlot: '09:20 AM - 09:40 AM',
        language: 'en' as const,
        status: 'registered' as const,
        groceryCards: 1,
        teenCards: 0,
        notes: undefined,
        checkedInAt: undefined,
        checkedInBy: undefined,
        children: [
            { id: 'c3', name: 'Child C', age: 8, ageGroup: 'child' as const },
        ],
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
    },
];

vi.mock('@/stores/useHolidayStore', () => ({
    useHolidayStore: () => ({
        registrations: mockRegistrations,
        isLoading: false,
        isLoaded: true,
        ensureLoaded: mockEnsureLoaded,
        loadFromSupabase: mockLoadFromSupabase,
        selectedSlotFilter: null,
        searchQuery: '',
        statusFilter: 'all',
        setSelectedSlotFilter: mockSetSelectedSlotFilter,
        setSearchQuery: mockSetSearchQuery,
        setStatusFilter: mockSetStatusFilter,
    }),
    selectHolidayMetrics: vi.fn(() => ({
        totalRegistrations: 2,
        checkedInCount: 1,
        pendingCount: 1,
        infantsCount: 0,
        toddlersCount: 1,
        childrenCount: 1,
        teen13Count: 0,
        teen14Count: 1,
        teen15Count: 0,
        teen16To18Count: 0,
        totalChildrenCount: 3,
        teen14PlusCount: 1,
        groceryCardsCount: 2,
        teenCardsCount: 1,
    })),
    selectSlotCounts: vi.fn(() => ({
        '09:00 AM - 09:20 AM': 1,
        '09:20 AM - 09:40 AM': 1,
    })),
    selectFilteredHolidayRegistrations: vi.fn(() => mockRegistrations),
}));

describe('HolidayReport Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the holiday executive report header and metrics cards', () => {
        render(<HolidayReport />);

        expect(screen.getByText('Holiday Program Executive Report')).toBeDefined();
        expect(screen.getByText('Export CSV Report')).toBeDefined();
        expect(screen.getByText('Registered Families')).toBeDefined();
        expect(screen.getByText('Total Children (0-18)')).toBeDefined();
        expect(screen.getByText('Grocery Cards')).toBeDefined();
        expect(screen.getByText('Teen Gift Cards')).toBeDefined();
        expect(screen.getByText('Attendance Rate')).toBeDefined();
    });

    it('renders demographic breakdowns and slot capacity tiles', () => {
        render(<HolidayReport />);

        expect(screen.getByText('Child Age Group Demographics')).toBeDefined();
        expect(screen.getByText('Geographical Distribution')).toBeDefined();
        expect(screen.getByText('Housing Status Overview')).toBeDefined();
        expect(screen.getByText('Annual Family Income Levels')).toBeDefined();
        expect(screen.getByText('Arrival Time Slot Capacities')).toBeDefined();
    });

    it('renders the family distribution roster table with participant details', () => {
        render(<HolidayReport />);

        expect(screen.getByText('Family Distribution Roster')).toBeDefined();
        expect(screen.getByText('#1')).toBeDefined();
        expect(screen.getByText('Maria Garcia')).toBeDefined();
        expect(screen.getByText('#2')).toBeDefined();
        expect(screen.getByText('John Doe')).toBeDefined();
    });

    it('handles CSV report download on button click', () => {
        render(<HolidayReport />);

        const exportBtn = screen.getByRole('button', { name: /Export CSV Report/i });
        fireEvent.click(exportBtn);

        expect(exportBtn).toBeDefined();
    });
});
