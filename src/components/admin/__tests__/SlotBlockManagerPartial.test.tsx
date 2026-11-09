import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { SlotBlockManager } from '../SlotBlockManager';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { useServicesStore } from '@/stores/useServicesStore';
import toast from 'react-hot-toast';

const mockFetchBlockedSlots = vi.fn(() => Promise.resolve());
const mockBlockSlot = vi.fn(() => Promise.resolve(true));
const mockUnblockSlot = vi.fn(() => Promise.resolve(true));
const mockSetBlockedCount = vi.fn(() => Promise.resolve(true));
const mockIsSlotBlocked = vi.fn((_s: string, _slot: string, _date: string) => false);
const mockGetBlockedCount = vi.fn((_s: string, _slot: string, _date: string) => 0);
const mockGetEffectiveCapacity = vi.fn((_s: string, _slot: string, _date: string) => 2);

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        fetchBlockedSlots: mockFetchBlockedSlots,
        blockSlot: mockBlockSlot,
        unblockSlot: mockUnblockSlot,
        setBlockedCount: mockSetBlockedCount,
        isSlotBlocked: mockIsSlotBlocked,
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

async function renderLoaded(serviceType: 'shower' | 'laundry' = 'shower') {
    await act(async () => {
        render(<SlotBlockManager serviceType={serviceType} />);
    });
}

/** Move to a future day so the whole schedule is selectable regardless of the clock. */
async function renderFutureDay(serviceType: 'shower' | 'laundry' = 'shower') {
    await renderLoaded(serviceType);
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    });
}

const fromSelect = () => screen.getByRole('combobox', { name: 'From' }) as HTMLSelectElement;
const toSelect = () => screen.getByRole('combobox', { name: 'To' }) as HTMLSelectElement;
const selectableValues = () => Array.from(fromSelect().options).map((o) => o.value);
const applyOne = () => screen.getByRole('button', { name: /^Block 1 spot ·/ });
const applyBoth = () => screen.getByRole('button', { name: /^Block both spots ·/ });
const applyLaundry = () => screen.getByRole('button', { name: /^Block \d+ times?/ });
const unblockPeriod = () => screen.getByRole('button', { name: /^Unblock period$/ });
const toggleBoth = () => screen.getByRole('button', { name: /^Both spots$/ });
const toggleOne = () => screen.getByRole('button', { name: /^1 spot$/ });
const groupFor = (slot: string) =>
    screen.getByRole('group', { name: `Blocked spots at ${formatSlotLabel(slot)}` });

describe('SlotBlockManager — blocking 1 or both spots in a time period', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        mockIsSlotBlocked.mockReset().mockReturnValue(false);
        mockGetBlockedCount.mockReset().mockReturnValue(0);
        mockGetEffectiveCapacity.mockReset().mockReturnValue(2);
        mockSetBlockedCount.mockReset().mockResolvedValue(true);
        mockBlockSlot.mockReset().mockResolvedValue(true);
        mockUnblockSlot.mockReset().mockResolvedValue(true);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [],
            laundryRecords: [],
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders clear controls for choosing spots and the time period', async () => {
        await renderFutureDay();
        expect(screen.getByText('Block a time period')).toBeDefined();
        expect(toggleOne()).toBeDefined();
        expect(toggleBoth()).toBeDefined();
        expect(fromSelect()).toBeDefined();
        expect(toSelect()).toBeDefined();
        expect(applyOne()).toBeDefined();
        expect(unblockPeriod()).toBeDefined();
        expect(screen.getByText(/Only NEW bookings are stopped/)).toBeDefined();
    });

    it('defaults to blocking 1 spot across the whole remaining day', async () => {
        await renderFutureDay();
        expect(toggleOne().getAttribute('aria-pressed')).toBe('true');
        const values = selectableValues();
        expect(values.length).toBeGreaterThan(3);

        await act(async () => { fireEvent.click(applyOne()); });

        expect(mockSetBlockedCount.mock.calls.length).toBe(values.length);
        for (const slot of values) {
            expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', slot, expect.any(String), 1);
        }
    });

    it('blocks BOTH spots at every time in the period when no staff are on-site', async () => {
        await renderFutureDay();
        await act(async () => { fireEvent.click(toggleBoth()); });
        expect(toggleBoth().getAttribute('aria-pressed')).toBe('true');

        const values = selectableValues();
        await act(async () => { fireEvent.click(applyBoth()); });

        expect(mockSetBlockedCount.mock.calls.length).toBe(values.length);
        for (const slot of values) {
            expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', slot, expect.any(String), 2);
        }
        expect(mockSetBlockedCount).not.toHaveBeenCalledWith('shower', expect.any(String), expect.any(String), 1);
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('both spots'));
    });

    it('upgrades a half-blocked time to a full block and leaves fully blocked times alone', async () => {
        await renderFutureDay();
        const values = selectableValues();
        mockGetBlockedCount.mockImplementation((_s: string, slot: string) =>
            slot === values[1] ? 1 : slot === values[2] ? 2 : 0
        );

        await act(async () => { fireEvent.click(toggleBoth()); });
        await act(async () => { fireEvent.click(applyBoth()); });

        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', values[0], expect.any(String), 2);
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', values[1], expect.any(String), 2);
        expect(mockSetBlockedCount).not.toHaveBeenCalledWith('shower', values[2], expect.any(String), 2);
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1 already blocked'));
    });

    it('never downgrades a fully blocked time when blocking only 1 spot', async () => {
        await renderFutureDay();
        const values = selectableValues();
        mockGetBlockedCount.mockImplementation((_s: string, slot: string) =>
            slot === values[2] ? 2 : 0
        );

        await act(async () => { fireEvent.click(applyOne()); });

        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', values[0], expect.any(String), 1);
        expect(mockSetBlockedCount).not.toHaveBeenCalledWith('shower', values[2], expect.any(String), 1);
    });

    it('only blocks times inside the chosen From / To window', async () => {
        await renderFutureDay();
        const values = selectableValues();

        await act(async () => { fireEvent.change(fromSelect(), { target: { value: values[1] } }); });
        await act(async () => { fireEvent.change(toSelect(), { target: { value: values[3] } }); });
        await act(async () => { fireEvent.click(applyOne()); });

        expect(mockSetBlockedCount.mock.calls.map((call) => call[1])).toEqual(values.slice(1, 4));
    });

    it('refuses to apply a period whose start time is after its end time', async () => {
        await renderFutureDay();
        const values = selectableValues();

        await act(async () => { fireEvent.change(fromSelect(), { target: { value: values[values.length - 1] } }); });
        await act(async () => { fireEvent.change(toSelect(), { target: { value: values[0] } }); });

        expect((applyOne() as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText(/not after the end time/)).toBeDefined();
    });

    it('reopens blocked times in the period without touching open ones', async () => {
        await renderFutureDay();
        const values = selectableValues();
        mockGetBlockedCount.mockImplementation((_s: string, slot: string) =>
            slot === values[1] ? 1 : slot === values[2] ? 2 : 0
        );

        await act(async () => { fireEvent.click(unblockPeriod()); });

        expect(mockSetBlockedCount.mock.calls.length).toBe(2);
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', values[1], expect.any(String), 0);
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', values[2], expect.any(String), 0);
        expect(mockSetBlockedCount).not.toHaveBeenCalledWith('shower', values[0], expect.any(String), 0);
    });

    it('warns about existing bookings before blocking a period and aborts when cancelled', async () => {
        await renderFutureDay();
        const values = selectableValues();
        const future = new Date();
        future.setDate(future.getDate() + 1);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [
                { id: 's1', date: pacificDateStringFrom(future), time: values[0], status: 'booked' },
            ],
            laundryRecords: [],
        } as any);
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

        // Re-render so the manager sees the booking before applying.
        await act(async () => { fireEvent.click(toggleBoth()); });
        await act(async () => { fireEvent.click(applyBoth()); });

        expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('already have bookings'));
        expect(mockSetBlockedCount).not.toHaveBeenCalled();
    });

    it('reports partial bulk failures instead of calling them already blocked', async () => {
        await renderFutureDay();
        mockSetBlockedCount.mockResolvedValueOnce(false);

        await act(async () => { fireEvent.click(applyOne()); });

        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('1 time failed'));
    });

    it('lets staff set 1 spot, both spots, or reopen a single time', async () => {
        await renderFutureDay();
        const slot = selectableValues()[0];

        await act(async () => {
            fireEvent.click(within(groupFor(slot)).getByRole('button', { name: '1 open' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', slot, expect.any(String), 1);

        mockSetBlockedCount.mockClear();
        await act(async () => {
            fireEvent.click(within(groupFor(slot)).getByRole('button', { name: 'Blocked' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', slot, expect.any(String), 2);

        mockGetBlockedCount.mockReturnValue(2);
        mockSetBlockedCount.mockClear();
        await act(async () => {
            fireEvent.click(within(groupFor(slot)).getByRole('button', { name: '2 open' }));
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', slot, expect.any(String), 0);
    });

    it('shows a half-blocked time as having 1 of 2 spots open', async () => {
        mockGetBlockedCount.mockImplementation((_s: string, slot: string) => slot === '07:30' ? 1 : 0);
        await renderLoaded();
        expect(screen.getByText('1 of 2 spots open')).toBeDefined();
    });

    it('does not count cancelled or waitlisted showers as occupied spots', async () => {
        vi.mocked(useServicesStore).mockReturnValue({
            laundryRecords: [],
            showerRecords: [
                { date: pacificDateStringFrom(new Date()), time: '07:30', status: 'cancelled' },
                { date: pacificDateStringFrom(new Date()), time: '07:30', status: 'waitlisted' },
            ],
        } as any);
        await renderLoaded();
        expect(screen.queryByTitle('2 active bookings')).not.toBeInTheDocument();
    });

    it('reports a failed per-time save without a success message', async () => {
        mockSetBlockedCount.mockResolvedValueOnce(false);
        await renderLoaded();
        const slot = screen.getAllByRole('group', { name: /Blocked spots at/ })[0];
        await act(async () => {
            fireEvent.click(within(slot).getByRole('button', { name: 'Blocked' }));
        });
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
    });

    it('explains that there are no times left today instead of showing a range error', async () => {
        // 16:00 Pacific on a weekday: every shower time has already passed.
        vi.setSystemTime(new Date('2025-01-07T00:00:00Z'));
        await renderLoaded();

        expect(screen.getByText(/No times left today/)).toBeDefined();
        expect(screen.queryByText(/not after the end time/)).toBeNull();
        expect((applyOne() as HTMLButtonElement).disabled).toBe(true);
    });

    it('disables the period controls for a past date', async () => {
        await renderLoaded();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
        });
        expect((applyOne() as HTMLButtonElement).disabled).toBe(true);
        expect(fromSelect().disabled).toBe(true);
        expect(screen.getByText(/Choose today or a future date/)).toBeDefined();
    });

    it('does not offer a spots choice for laundry, which has only 1 spot per time', async () => {
        await renderLoaded('laundry');
        expect(screen.queryByRole('button', { name: /^Both spots$/ })).toBeNull();
        expect(screen.getByText('Block a time period')).toBeDefined();
    });

    it('keeps the laundry booking count visible after its time is blocked', async () => {
        mockIsSlotBlocked.mockImplementation((service, slot) => service === 'laundry' && slot === '07:30 - 08:30');
        mockGetBlockedCount.mockReturnValue(1);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [],
            laundryRecords: [
                { id: 'l1', date: pacificDateStringFrom(new Date()), time: '07:30 - 08:30', status: 'waiting', laundryType: 'onsite' },
                { id: 'l2', date: pacificDateStringFrom(new Date()), time: '07:30 - 08:30', status: 'cancelled', laundryType: 'onsite' },
            ],
        } as any);
        await renderLoaded('laundry');
        expect(screen.getByText('1 booked')).toBeVisible();
    });

    it('blocks the single laundry spot across the whole period', async () => {
        await renderFutureDay('laundry');
        const values = selectableValues();
        expect(values.length).toBe(5);

        await act(async () => { fireEvent.click(applyLaundry()); });

        expect(mockSetBlockedCount.mock.calls.length).toBe(values.length);
        for (const slot of values) {
            expect(mockSetBlockedCount).toHaveBeenCalledWith('laundry', slot, expect.any(String), 1);
        }
    });
});
