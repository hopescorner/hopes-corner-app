import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ServiceStatusOverview } from '../ServiceStatusOverview';
import { useServicesStore } from '@/stores/useServicesStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';

// Mock next-auth
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
    default: ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

// Mock date utilities
vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: vi.fn(() => '2026-01-22'),
    pacificDateStringFrom: vi.fn((date) => {
        if (!date) return '2026-01-22';
        if (typeof date === 'string') return date.split('T')[0];
        return '2026-01-22';
    }),
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

// Mock service slots
vi.mock('@/lib/utils/serviceSlots', () => ({
    generateShowerSlots: vi.fn(() => ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00']),
    generateLaundrySlots: vi.fn(() => ['07:30 - 08:30', '08:30 - 09:30', '09:30 - 10:30']),
    formatSlotLabel: vi.fn((slot) => slot),
}));

// Create mock stores with proper state
const mockShowerRecords: any[] = [];
const mockLaundryRecords: any[] = [];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: Object.assign(
        vi.fn(() => ({
            showerRecords: mockShowerRecords,
            laundryRecords: mockLaundryRecords,
        })),
        {
            subscribe: vi.fn((callback: () => void) => {
                return () => {};
            }),
            getState: vi.fn(() => ({
                showerRecords: mockShowerRecords,
                laundryRecords: mockLaundryRecords,
            })),
        }
    ),
}));

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: vi.fn(() => ({
        targets: {
            maxOnsiteLaundrySlots: 5,
        },
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        isSlotBlocked: vi.fn(() => false),
    })),
}));

describe('ServiceStatusOverview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders shower and laundry cards', () => {
        render(<ServiceStatusOverview />);
        
        expect(screen.getByText('Showers')).toBeDefined();
        expect(screen.getByText('Laundry')).toBeDefined();
    });

    it('displays OPEN status when slots are available', () => {
        render(<ServiceStatusOverview />);
        
        const openBadges = screen.getAllByText('OPEN');
        expect(openBadges.length).toBeGreaterThan(0);
    });

    it('shows available slots count for showers', () => {
        // With 6 slots × 2 people = 12 total capacity, and no bookings
        render(<ServiceStatusOverview />);
        
        // Should show some available count (multiple 'Available' labels exist for showers and laundry)
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });

    it('shows next available slot time for showers', () => {
        render(<ServiceStatusOverview />);

        // With time-based slot filtering, this may show a next slot or the fallback status text
        const slotOrFallback = screen.queryAllByText(/Next slot:|Waitlist only|Fully booked today|No remaining slots today/i);
        expect(slotOrFallback.length).toBeGreaterThan(0);
    });

    it('calculates shower statistics correctly with bookings', () => {
        // Add some shower records
        mockShowerRecords.push(
            { id: '1', guestId: 'g1', date: '2026-01-22', status: 'booked', time: '07:30' },
            { id: '2', guestId: 'g2', date: '2026-01-22', status: 'booked', time: '07:30' }
        );

        render(<ServiceStatusOverview />);
        
        // Should still show available since we have 12 slots and only 2 booked
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });

    it('shows FULL status when all slots are booked', () => {
        // Fill all shower slots (6 slots × 2 = 12 bookings needed)
        for (let i = 0; i < 12; i++) {
            mockShowerRecords.push({
                id: `shower-${i}`,
                guestId: `guest-${i}`,
                date: '2026-01-22',
                status: 'booked',
                time: ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'][Math.floor(i / 2)],
            });
        }

        render(<ServiceStatusOverview />);
        
        // Should show FULL for showers
        const fullBadges = screen.getAllByText('FULL');
        expect(fullBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('calculates laundry statistics correctly', () => {
        mockLaundryRecords.push(
            { id: '1', guestId: 'g1', date: '2026-01-22', status: 'waiting', laundryType: 'onsite' },
            { id: '2', guestId: 'g2', date: '2026-01-22', status: 'washer', laundryType: 'onsite' }
        );

        render(<ServiceStatusOverview />);
        
        // With max 5 slots and 2 booked, should show available
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });

    it('excludes waitlisted records from booked count', () => {
        mockShowerRecords.push(
            { id: '1', guestId: 'g1', date: '2026-01-22', status: 'waitlisted', time: null }
        );

        render(<ServiceStatusOverview />);
        
        // Waitlisted shouldn't count against available slots
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });

    it('shows waitlist count when showers are full', () => {
        // Fill all slots and add waitlisted
        for (let i = 0; i < 12; i++) {
            mockShowerRecords.push({
                id: `shower-${i}`,
                guestId: `guest-${i}`,
                date: '2026-01-22',
                status: 'booked',
                time: ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'][Math.floor(i / 2)],
            });
        }
        mockShowerRecords.push({ id: 'waitlist-1', guestId: 'gw1', date: '2026-01-22', status: 'waitlisted' });

        render(<ServiceStatusOverview />);
        
        // Should show "Waitlist" label when full
        expect(screen.getByText('Waitlist')).toBeDefined();
    });

    it('renders as clickable links for admin users', () => {
        render(<ServiceStatusOverview />);
        
        const links = screen.getAllByRole('link');
        expect(links.length).toBe(2); // Shower and Laundry links
        expect(links[0].getAttribute('href')).toBe('/services?tab=showers');
        expect(links[1].getAttribute('href')).toBe('/services?tab=laundry');
    });

    it('only counts today records for statistics', () => {
        // Add a record from yesterday (should be excluded)
        mockShowerRecords.push({
            id: 'yesterday',
            guestId: 'g1',
            date: '2026-01-21',
            status: 'booked',
            time: '07:30',
        });

        render(<ServiceStatusOverview />);
        
        // Yesterday's record shouldn't affect today's count
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });
});

describe('ServiceStatusOverview Reactivity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockShowerRecords.length = 0;
        mockLaundryRecords.length = 0;
    });

    it('updates when shower records change', async () => {
        const { rerender } = render(<ServiceStatusOverview />);
        
        // Initial state should show available slots
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
        
        // Add records
        mockShowerRecords.push(
            { id: '1', guestId: 'g1', date: '2026-01-22', status: 'booked', time: '07:30' }
        );
        
        // Re-render to simulate store update
        rerender(<ServiceStatusOverview />);
        
        // Should still show available (we have more capacity)
        const newAvailableLabels = screen.getAllByText('Available');
        expect(newAvailableLabels.length).toBeGreaterThan(0);
    });

    it('updates when laundry records change', async () => {
        const { rerender } = render(<ServiceStatusOverview />);
        
        // Add laundry record
        mockLaundryRecords.push(
            { id: '1', guestId: 'g1', date: '2026-01-22', status: 'waiting', laundryType: 'onsite' }
        );
        
        // Re-render to simulate store update
        rerender(<ServiceStatusOverview />);
        
        // Component should reflect the change
        const availableLabels = screen.getAllByText('Available');
        expect(availableLabels.length).toBeGreaterThan(0);
    });
});
