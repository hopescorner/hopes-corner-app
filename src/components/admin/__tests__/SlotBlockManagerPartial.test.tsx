import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { SlotBlockManager } from '../SlotBlockManager';
import { useServicesStore } from '@/stores/useServicesStore';

const mockFetchBlockedSlots = vi.fn(() => Promise.resolve());
const mockBlockSlot = vi.fn(() => Promise.resolve(true as any));
const mockUnblockSlot = vi.fn(() => Promise.resolve(true as any));
const mockSetBlockedCount = vi.fn(() => Promise.resolve(true as any));
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

async function renderLoaded() {
    await act(async () => {
        render(<SlotBlockManager serviceType="shower" />);
    });
}

describe('SlotBlockManager — partial blocking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.setSystemTime(new Date(2025, 0, 6, 9, 0));
        mockIsSlotBlocked.mockReturnValue(false);
        mockGetBlockedCount.mockReturnValue(0);
        mockGetEffectiveCapacity.mockReturnValue(2);
        mockSetBlockedCount.mockResolvedValue(true as any);
        vi.mocked(useServicesStore).mockReturnValue({
            showerRecords: [],
            laundryRecords: [],
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a Block 1 spot control for shower slots', async () => {
        await renderLoaded();
        const halfButtons = screen.getAllByRole('button').filter(b =>
            b.textContent?.includes('Block 1 spot')
        );
        // One per shower time slot
        expect(halfButtons.length).toBeGreaterThan(0);
    });

    it('blocks one spot via the half control', async () => {
        await renderLoaded();
        const halfButtons = screen.getAllByRole('button').filter(b =>
            b.textContent?.includes('Block 1 spot')
        );
        await act(async () => {
            fireEvent.click(halfButtons[0]);
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', expect.any(String), expect.any(String), 1);
    });

    it('shows bulk rest-of-day controls', async () => {
        await renderLoaded();
        expect(screen.getByText('Block 1 spot for rest of day')).toBeDefined();
        expect(screen.getByText('Unblock all for rest of day')).toBeDefined();
    });

    it('bulk block-one calls setBlockedCount with 1 for remaining slots', async () => {
        await renderLoaded();
        const bulk = screen.getByText('Block 1 spot for rest of day');
        await act(async () => {
            fireEvent.click(bulk);
        });
        expect(mockSetBlockedCount).toHaveBeenCalledWith('shower', expect.any(String), expect.any(String), 1);
    });

    it('half-blocked slot shows 1 Open', async () => {
        mockGetBlockedCount.mockImplementation((_s: string, slot: string) =>
            slot === '07:30' ? 1 : 0
        );
        mockIsSlotBlocked.mockReturnValue(false);

        await renderLoaded();
        expect(screen.getByText('1 Open')).toBeDefined();
    });
});
