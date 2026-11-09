import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { SlotBlockManager } from '../SlotBlockManager';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { useServicesStore } from '@/stores/useServicesStore';
import toast from 'react-hot-toast';

// Mock stores
const mockFetchBlockedSlots = vi.fn(() => Promise.resolve());
const mockBlockSlot = vi.fn(() => Promise.resolve(true));
const mockUnblockSlot = vi.fn(() => Promise.resolve(true));
const mockIsSlotBlocked = vi.fn((..._args: unknown[]) => false);
const mockSetBlockedCount = vi.fn(() => Promise.resolve(true));
// Keep the half/full block state derived from isSlotBlocked unless a test overrides it.
const mockGetBlockedCount = vi.fn((...args: unknown[]) => mockIsSlotBlocked(...args) ? 2 : 0);
const mockGetEffectiveCapacity = vi.fn(() => 2);

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        fetchBlockedSlots: mockFetchBlockedSlots,
        blockSlot: mockBlockSlot,
        unblockSlot: mockUnblockSlot,
        isSlotBlocked: mockIsSlotBlocked,
        setBlockedCount: mockSetBlockedCount,
        getBlockedCount: mockGetBlockedCount,
        getEffectiveCapacity: mockGetEffectiveCapacity,
    })),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        showerRecords: [],
        laundryRecords: [],
    })),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

/** Render and flush the loading promise so slots appear */
async function renderLoaded(ui: React.ReactElement) {
    await act(async () => {
        render(ui);
    });
}

/** The per-time segmented control is uniquely identified by its accessible name. */
const groupFor = (slot: string) =>
    screen.getByRole('group', { name: `Blocked spots at ${formatSlotLabel(slot)}` });

function resetStoreMocks() {
    mockIsSlotBlocked.mockImplementation((..._args: unknown[]) => false);
    mockBlockSlot.mockReset().mockResolvedValue(true);
    mockUnblockSlot.mockReset().mockResolvedValue(true);
    mockSetBlockedCount.mockReset().mockResolvedValue(true);
    mockGetBlockedCount.mockReset().mockImplementation((...args: unknown[]) => mockIsSlotBlocked(...args) ? 2 : 0);
    vi.mocked(useServicesStore).mockReturnValue({
        showerRecords: [],
        laundryRecords: [],
    } as any);
}

describe('SlotBlockManager — day-aware slot generation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        resetStoreMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders correct weekday shower slots when today is a weekday', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        expect(groupFor('07:30')).toBeDefined();
    });

    it('renders correct Saturday shower slots after navigating to Saturday', async () => {
        // Start on Friday
        vi.setSystemTime(new Date(2025, 0, 3, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        fireEvent.click(screen.getByRole('button', { name: 'Next day' }));

        // Saturday shower slots start at 08:30
        const saturdaySlots = generateShowerSlots(new Date(2025, 0, 4));
        expect(groupFor(saturdaySlots[0])).toBeDefined();
        expect(groupFor('08:30')).toBeDefined();
    });

    it('renders correct weekday laundry slots', async () => {
        vi.setSystemTime(new Date(2025, 0, 8, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="laundry" />);

        const weekdaySlots = generateLaundrySlots(new Date(2025, 0, 8));
        expect(weekdaySlots.length).toBe(5);
        expect(groupFor(weekdaySlots[0])).toBeDefined();
    });

    it('renders correct Saturday laundry slots after navigating to Saturday', async () => {
        vi.setSystemTime(new Date(2025, 0, 3, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="laundry" />);

        fireEvent.click(screen.getByRole('button', { name: 'Next day' }));

        const saturdaySlots = generateLaundrySlots(new Date(2025, 0, 4));
        expect(groupFor(saturdaySlots[0])).toBeDefined();
    });

    it('Saturday shower slots differ from weekday shower slots', () => {
        const weekdaySlots = generateShowerSlots(new Date(2025, 0, 6)); // Monday
        const saturdaySlots = generateShowerSlots(new Date(2025, 0, 4)); // Saturday

        expect(weekdaySlots[0]).not.toBe(saturdaySlots[0]);
        expect(weekdaySlots[0]).toBe('07:30');
        expect(saturdaySlots[0]).toBe('08:30');
    });

    it('Saturday laundry slots differ from weekday laundry slots', () => {
        const weekdaySlots = generateLaundrySlots(new Date(2025, 0, 6)); // Monday
        const saturdaySlots = generateLaundrySlots(new Date(2025, 0, 4)); // Saturday

        expect(weekdaySlots[0]).not.toBe(saturdaySlots[0]);
    });

    it('shows correct header for shower service', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        expect(screen.getByText('Manage Shower Slots')).toBeDefined();
    });

    it('shows correct header for laundry service', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="laundry" />);
        expect(screen.getByText('Manage Laundry Slots')).toBeDefined();
    });

    it('shows every shower time as fully open by default', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        const weekdaySlots = generateShowerSlots(new Date(2025, 0, 6));
        expect(screen.getAllByText('2 of 2 spots open').length).toBe(weekdaySlots.length);
    });

    it('shows a fully blocked time as having no open spots', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        mockIsSlotBlocked.mockImplementation((...args: unknown[]) => (args[1] as string) === '08:00');

        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        expect(screen.getByText('0 of 2 spots open')).toBeDefined();
        expect(within(groupFor('08:00')).getByRole('button', { name: 'Blocked' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('displays date navigation correctly', async () => {
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        expect(screen.getByText(/Monday/i)).toBeDefined();
        expect(screen.getByText(/January/i)).toBeDefined();
    });
});

describe('SlotBlockManager — per-time controls and booking warnings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0)); // Monday
        resetStoreMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders one explicit control per shower time', async () => {
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        const groups = screen.getAllByRole('group', { name: /Blocked spots at/ });
        expect(groups.length).toBe(generateShowerSlots(new Date(2025, 0, 6)).length);
    });

    it('blocks 1 spot at a single time', async () => {
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: '1 open' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', '07:30', expect.any(String), 1);
    });

    it('blocks both spots at a single time', async () => {
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: 'Blocked' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', '07:30', expect.any(String), 2);
    });

    it('reopens a fully blocked time', async () => {
        mockIsSlotBlocked.mockImplementation((...args: unknown[]) => (args[1] as string) === '07:30');
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: '2 open' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', '07:30', expect.any(String), 0);
    });

    it('shows booking count badge when a slot has active bookings', async () => {
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [
                { id: 's1', guestId: 'g1', date: pacificDateStringFrom(new Date()), status: 'booked', time: '07:30' },
            ],
            laundryRecords: [],
        } as any);

        await renderLoaded(<SlotBlockManager serviceType="shower" />);

        expect(screen.getByTitle('1 active bookings')).toBeDefined();
    });

    it('shows confirm dialog when blocking a slot with bookings', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [
                { id: 's1', guestId: 'g1', date: pacificDateStringFrom(new Date()), status: 'booked', time: '07:30' },
            ],
            laundryRecords: [],
        } as any);

        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: 'Blocked' }));
        });

        expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('active booking'));
        expect(mockSetBlockedCount).toHaveBeenCalled();
    });

    it('does not block slot when confirm dialog is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [
                { id: 's1', guestId: 'g1', date: pacificDateStringFrom(new Date()), status: 'booked', time: '07:30' },
            ],
            laundryRecords: [],
        } as any);

        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: 'Blocked' }));
        });

        expect(mockSetBlockedCount).not.toHaveBeenCalled();
    });

    it('shows error toast when a per-time save fails', async () => {
        mockSetBlockedCount.mockRejectedValueOnce(new Error('network'));
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: 'Blocked' }));
        });
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to update slot status');
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows error toast when a per-time save returns false', async () => {
        mockSetBlockedCount.mockResolvedValueOnce(false);
        await renderLoaded(<SlotBlockManager serviceType="shower" />);
        await act(async () => {
            fireEvent.click(within(groupFor('07:30')).getByRole('button', { name: 'Blocked' }));
        });
        expect(toast.error).toHaveBeenCalledWith('Failed to update slot status');
        expect(toast.success).not.toHaveBeenCalled();
    });
});
