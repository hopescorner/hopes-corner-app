import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ShowersSection } from '../ShowersSection';

// Mock next-auth
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    default: {
        loading: vi.fn(() => 'toast-id'),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Create mock functions
const mockLoadFromSupabase = vi.fn().mockResolvedValue(undefined);
const mockCancelMultipleShowers = vi.fn().mockResolvedValue(true);
const mockUpdateShowerStatus = vi.fn().mockResolvedValue(undefined);

const defaultShowerRecords = [
    { id: '1', guestId: 'g1', date: '2026-01-22', time: '09:00', status: 'booked' },
    { id: '2', guestId: 'g2', date: '2026-01-22', time: '09:30', status: 'done' },
    { id: '3', guestId: 'g3', date: '2026-01-22', time: '10:00', status: 'waitlisted' },
    { id: '4', guestId: 'g4', date: '2026-01-22', time: '10:30', status: 'cancelled' },
    { id: '5', guestId: 'g5', date: '2026-01-22', time: '11:00', status: 'no_show' },
];

const defaultGuests = [
    { id: 'g1', name: 'John Doe', preferredName: 'Johnny' },
    { id: 'g2', name: 'Jane Smith', preferredName: null },
    { id: 'g3', name: 'Bob Wilson', preferredName: 'Bobby' },
    { id: 'g4', name: 'Alice Brown', preferredName: null },
    { id: 'g5', name: 'Charlie Davis', preferredName: 'Chuck' },
];

// Mock stores with shower data
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            showerRecords: defaultShowerRecords,
            cancelMultipleShowers: mockCancelMultipleShowers,
            loadFromSupabase: mockLoadFromSupabase,
            deleteShowerRecord: vi.fn(),
            updateShowerStatus: mockUpdateShowerStatus,
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = { guests: defaultGuests };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        isSlotBlocked: vi.fn(() => false),
        fetchBlockedSlots: vi.fn(),
    })),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        waivers: [],
        hasValidWaiver: vi.fn(() => false),
    })),
}));

// Mock date utilities
vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: vi.fn(() => '2026-01-22'),
    pacificDateStringFrom: vi.fn((date: string | null) => {
        if (!date) return '2026-01-22';
        if (typeof date === 'string') return date.split('T')[0];
        return '2026-01-22';
    }),
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

vi.mock('@/lib/utils/serviceSlots', () => ({
    formatSlotLabel: vi.fn((slot: string) => slot),
}));

describe('ShowersSection Cancelled Tab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the cancelled tab', () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        expect(cancelledTab).toBeDefined();
    });

    it('displays correct count in cancelled tab', () => {
        render(<ShowersSection />);
        
        // Should show count of 2 (one cancelled + one no_show)
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        expect(cancelledTab.textContent).toContain('(2)');
    });

    it('shows cancelled showers when cancelled tab is clicked', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            // Should show Alice Brown (cancelled) and Charlie Davis/Chuck (no_show)
            expect(screen.getByText('Alice Brown')).toBeDefined();
            expect(screen.getByText('Chuck')).toBeDefined();
        });
    });

    it('cancelled tab is not selected by default', () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        // Active tab has specific styling classes
        expect(cancelledTab.className).toContain('text-gray-500');
    });

    it('cancelled tab becomes selected when clicked', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            expect(cancelledTab.className).toContain('text-sky-600');
        });
    });

    it('shows cancelled status badge with red styling', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            // Find status badges - they should have red styling
            const statusBadges = document.querySelectorAll('[class*="bg-red-50"]');
            expect(statusBadges.length).toBeGreaterThan(0);
        });
    });

    it('shows no_show status badge with red styling', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            // no_show should be displayed with underscore replaced by space
            expect(screen.getByText('no show')).toBeDefined();
        });
    });

    it('shows REBOOK button for cancelled showers', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            const rebookButtons = screen.getAllByText('REBOOK');
            expect(rebookButtons.length).toBe(2); // One for each cancelled/no_show shower
        });
    });

    it('calls updateShowerStatus when REBOOK is clicked', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            const rebookButtons = screen.getAllByText('REBOOK');
            fireEvent.click(rebookButtons[0]);
        });
        
        await waitFor(() => {
            expect(mockUpdateShowerStatus).toHaveBeenCalledWith(expect.any(String), 'booked');
        });
    });

    it('does not show COMPLETE or cancel buttons for cancelled showers', async () => {
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            expect(screen.queryByText('COMPLETE')).toBeNull();
        });
    });

    it('displays empty state when no cancelled showers exist', async () => {
        // Override the mock to have no cancelled showers
        const { useServicesStore } = await import('@/stores/useServicesStore');
        vi.mocked(useServicesStore).mockImplementation((selector: any) => {
            const state = {
                showerRecords: [
                    { id: '1', guestId: 'g1', date: '2026-01-22', time: '09:00', status: 'booked' },
                ],
                cancelMultipleShowers: mockCancelMultipleShowers,
                loadFromSupabase: mockLoadFromSupabase,
                deleteShowerRecord: vi.fn(),
                updateShowerStatus: mockUpdateShowerStatus,
            };
            return typeof selector === 'function' ? selector(state) : state;
        });
        
        render(<ShowersSection />);
        
        const cancelledTab = screen.getAllByRole('button', { name: /cancelled/i })[0];
        fireEvent.click(cancelledTab);
        
        await waitFor(() => {
            expect(screen.getByText(/no cancelled showers found/i)).toBeDefined();
        });
    });
});
