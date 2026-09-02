import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { HolidayProgramSection } from '../HolidayProgramSection';
import { useHolidayStore } from '@/stores/useHolidayStore';
import { HolidayRegistration } from '@/types/holiday';

vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { name: 'Staff Member', email: 'staff@hopescorner.org' } },
    })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockRegistrations: HolidayRegistration[] = [
    {
        id: 'reg-1',
        ticketNumber: 1,
        eventYear: 2026,
        parentName: 'Carlos Ramirez',
        phone: '650-555-0101',
        city: 'Mountain View',
        housingStatus: 'house_apartment',
        incomeRange: '0_40k',
        timeSlot: '09:00 AM - 09:20 AM',
        language: 'es',
        status: 'registered',
        groceryCards: 1,
        teenCards: 1,
        notes: undefined,
        children: [
            { id: 'c1', name: 'Sofia', age: 14, ageGroup: 'teen_14', school: 'Graham Middle' },
        ],
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
    },
    {
        id: 'reg-2',
        ticketNumber: 2,
        eventYear: 2026,
        parentName: 'Amy Tan',
        phone: '408-555-0202',
        city: 'Sunnyvale',
        housingStatus: 'vehicle_rv_camper',
        incomeRange: '41_65k',
        timeSlot: '09:20 AM - 09:40 AM',

        language: 'zh',
        status: 'checked_in',
        groceryCards: 1,
        teenCards: 0,
        notes: 'Picked up early',
        children: [
            { id: 'c2', name: 'Leo', age: 7, ageGroup: 'child' },
        ],
        createdAt: '2026-11-01T10:05:00Z',
        updatedAt: '2026-11-01T10:05:00Z',
    },
];

describe('HolidayProgramSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useHolidayStore.setState({
            registrations: [...mockRegistrations],
            isLoading: false,
            isLoaded: true,
            selectedSlotFilter: null,
            searchQuery: '',
            statusFilter: 'all',
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            loadFromSupabase: vi.fn().mockResolvedValue(undefined),
            checkInRegistration: vi.fn().mockResolvedValue(true),
            undoCheckIn: vi.fn().mockResolvedValue(true),
            addWalkInRegistration: vi.fn().mockResolvedValue(mockRegistrations[0]),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the staff hub and summary metrics bar', () => {
        render(<HolidayProgramSection />);

        expect(screen.getByText('Staff Event Management Hub')).toBeDefined();
        expect(screen.getByText('Registered Families')).toBeDefined();
        expect(screen.getAllByText('Carlos Ramirez').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Amy Tan').length).toBeGreaterThan(0);
    });

    it('filters registrations by searching parent or ticket', () => {
        render(<HolidayProgramSection />);

        const searchInput = screen.getByPlaceholderText(/Search by ticket #/i);
        fireEvent.change(searchInput, { target: { value: 'Carlos' } });

        expect(screen.getAllByText('Carlos Ramirez').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Amy Tan').length).toBe(0);
    });

    it('opens check-in modal and completes check-in with notes', async () => {
        const checkInSpy = vi.fn().mockResolvedValue(true);
        useHolidayStore.setState({ checkInRegistration: checkInSpy });

        render(<HolidayProgramSection />);

        const checkInButton = screen.getAllByRole('button', { name: /^Check In$/i })[0];
        fireEvent.click(checkInButton);

        await waitFor(() => {
            expect(screen.getByText('Event Day Check-In')).toBeDefined();
            expect(screen.getByRole('heading', { name: /Ticket #1 – Carlos Ramirez/i })).toBeDefined();
        });

        const notesTextarea = screen.getByPlaceholderText(/Enter notes/i);
        fireEvent.change(notesTextarea, { target: { value: 'Handed grocery card #4421' } });

        const confirmBtn = screen.getByRole('button', { name: /Complete Check-In/i });
        fireEvent.click(confirmBtn);

        expect(checkInSpy).toHaveBeenCalledWith('reg-1', expect.objectContaining({
            notes: 'Handed grocery card #4421',
        }));
    });

    it('renders mobile cards and opens shopper QR modal', async () => {
        render(<HolidayProgramSection />);

        expect(screen.getByTestId('mobile-reg-card-1')).toBeDefined();
        expect(screen.getByTestId('mobile-reg-card-2')).toBeDefined();

        const shopperQrButtons = screen.getAllByRole('button', { name: /Shopper QR/i });
        expect(shopperQrButtons.length).toBeGreaterThan(0);

        fireEvent.click(shopperQrButtons[0]);

        await waitFor(() => {
            expect(screen.getByText(/Volunteer Shopper QR/i)).toBeDefined();
            expect(screen.getAllByText(/Ticket #1/i).length).toBeGreaterThan(0);
            expect(screen.getByRole('button', { name: /Copy Link/i })).toBeDefined();
        });
    });

    it('opens walk-in modal', async () => {
        render(<HolidayProgramSection />);

        const walkInBtn = screen.getByRole('button', { name: /Add Walk-In/i });
        fireEvent.click(walkInBtn);

        await waitFor(() => {
            expect(screen.getByText('Register Family On-Site')).toBeDefined();
        });
    });

    it('shows edit buttons only for registrations waiting for check-in', () => {
        render(<HolidayProgramSection />);

        // reg-1 is registered (desktop table + mobile card), reg-2 is checked in
        const editButtons = screen.getAllByTitle(/Edit registration/i);
        expect(editButtons).toHaveLength(2);
    });

    it('opens edit modal prefilled and saves family changes', async () => {
        const updateSpy = vi.fn().mockResolvedValue(mockRegistrations[0]);
        useHolidayStore.setState({ updateFamilyRegistration: updateSpy });

        render(<HolidayProgramSection />);

        fireEvent.click(screen.getAllByTitle(/Edit registration/i)[0]);

        await waitFor(() => {
            expect(screen.getByText('Edit Registration')).toBeDefined();
        });

        const nameInput = screen.getByDisplayValue('Carlos Ramirez');
        fireEvent.change(nameInput, { target: { value: 'Carlos R. Updated' } });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(updateSpy).toHaveBeenCalledWith('reg-1', expect.objectContaining({
                parentName: 'Carlos R. Updated',
                timeSlot: '09:00 AM - 09:20 AM',
            }));
        });
    });

    it('opens reset modal and confirms resetting ticket counter to #1', async () => {
        const resetSpy = vi.fn().mockResolvedValue({ success: true, deletedRegistrations: 2, nextTicketNumber: 1 });
        useHolidayStore.setState({ resetTicketCounter: resetSpy });

        render(<HolidayProgramSection />);

        const resetBtn = screen.getByRole('button', { name: /Reset Test Data/i });
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Reset Test Data & Ticket Counter/i })).toBeDefined();
            expect(screen.getByText(/Delete all test registrations/i)).toBeDefined();
        });

        const confirmBtn = screen.getByRole('button', { name: /Reset Test Data & Start at #1/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(resetSpy).toHaveBeenCalledWith({
                clearRegistrations: true,
                targetNumber: 1,
            });
        });
    });

    it('refreshes registrations from the protected API every 30 seconds', async () => {
        vi.useFakeTimers();
        const reload = vi.fn().mockResolvedValue(undefined);
        useHolidayStore.setState({ loadFromSupabase: reload });

        render(<HolidayProgramSection />);

        await act(async () => {
            vi.advanceTimersByTime(30_000);
        });

        expect(reload).toHaveBeenCalledTimes(1);
    });
});
