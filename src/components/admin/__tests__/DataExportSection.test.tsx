import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DataExportSection } from '../DataExportSection';

const {
    donationStoreState,
    ensureDonationsLoaded,
    toastError,
    toastSuccess,
} = vi.hoisted(() => {
    const donationRecord = {
        id: 'donation-1',
        type: 'Protein',
        itemName: 'Rice',
        trays: 2,
        weightLbs: 50,
        servings: 100,
        donor: 'Jane Doe',
        date: '2026-01-15T00:00:00.000Z',
    };

    const donationStoreState = {
        donationRecords: [] as typeof donationRecord[],
    };

    const ensureDonationsLoaded = vi.fn(async () => {
        donationStoreState.donationRecords = [donationRecord];
    });

    return {
        donationStoreState,
        ensureDonationsLoaded,
        toastError: vi.fn(),
        toastSuccess: vi.fn(),
    };
});

vi.mock('react-hot-toast', () => ({
    default: {
        error: toastError,
        success: toastSuccess,
    },
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: () => ({ guests: [] }),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: () => ({ mealRecords: [], familyMealRecords: [] }),
}));

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: () => ({ showerRecords: [], laundryRecords: [], bicycleRecords: [] }),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: Object.assign(
        (selector: (state: typeof donationStoreState & { ensureLoaded: typeof ensureDonationsLoaded }) => unknown) => {
            const state = {
                ...donationStoreState,
                ensureLoaded: ensureDonationsLoaded,
            };
            return typeof selector === 'function' ? selector(state) : state;
        },
        {
            getState: () => ({
                ...donationStoreState,
                ensureLoaded: ensureDonationsLoaded,
            }),
        }
    ),
}));

describe('DataExportSection donations export', () => {
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        donationStoreState.donationRecords = [];
        ensureDonationsLoaded.mockClear();
        toastError.mockClear();
        toastSuccess.mockClear();

        createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:donations');
        revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
        clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    afterEach(() => {
        createObjectURLSpy.mockRestore();
        revokeObjectURLSpy.mockRestore();
        clickSpy.mockRestore();
    });

    it('loads donations before exporting so an empty initial store does not fail the export', async () => {
        render(<DataExportSection />);

        const heading = screen.getByRole('heading', { name: /Donations Log/i });
        const card = heading.parentElement;
        expect(card).not.toBeNull();

        const downloadButton = within(card as HTMLElement).getByRole('button', { name: /Download CSV/i });
        fireEvent.click(downloadButton);

        await waitFor(() => expect(ensureDonationsLoaded).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(toastError).not.toHaveBeenCalledWith('No data to export');
        expect(toastSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows only the empty-state error without a success toast when there are no donations', async () => {
        ensureDonationsLoaded.mockImplementationOnce(async () => {
            donationStoreState.donationRecords = [];
        });

        render(<DataExportSection />);

        const heading = screen.getByRole('heading', { name: /Donations Log/i });
        const card = heading.parentElement;
        expect(card).not.toBeNull();

        const downloadButton = within(card as HTMLElement).getByRole('button', { name: /Download CSV/i });
        fireEvent.click(downloadButton);

        await waitFor(() => expect(ensureDonationsLoaded).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(toastError).toHaveBeenCalledWith('No data to export'));
        expect(createObjectURLSpy).not.toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
        expect(toastSuccess).not.toHaveBeenCalled();
    });
});
