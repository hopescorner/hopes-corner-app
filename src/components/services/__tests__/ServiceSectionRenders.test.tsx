import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ShowersSection } from '../ShowersSection';
import { LaundrySection } from '../LaundrySection';
import { BicycleSection } from '../BicycleSection';
import { MealsSection } from '../MealsSection';
import { DonationsSection } from '../DonationsSection';

// Mock stores
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn((selector) => {
        const state = {
            showerRecords: [],
            laundryRecords: [],
            bicycleRecords: [],
            haircutRecords: [],
            holidayRecords: [],
            isLoaded: true,
            addShowerRecord: vi.fn(),
            updateShowerStatus: vi.fn(),
            deleteShowerRecord: vi.fn(),
            cancelMultipleShowers: vi.fn(),
            loadFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useWaiverStore', () => ({
    useWaiverStore: vi.fn(() => ({
        waiverVersion: 1,
    })),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [],
            rvMealRecords: [],
            extraMealRecords: [],
            unitedEffortMealRecords: [],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            lunchBagRecords: [],
            holidayRecords: [],
            haircutRecords: [],
            checkAndAddAutomaticMeals: vi.fn(),
            updateMealRecord: vi.fn(),
            deleteMealRecord: vi.fn(),
            deleteExtraMealRecord: vi.fn(),
            addBulkMealRecord: vi.fn(),
            deleteBulkMealRecord: vi.fn(),
            updateBulkMealRecord: vi.fn(),
            loadFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn((selector) => {
        const state = {
            guests: [],
            warnings: [],
            guestProxies: [],
            loadGuestWarningsFromSupabase: vi.fn(),
            loadFromSupabase: vi.fn(),
            loadGuestProxiesFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: vi.fn(() => ({
        donationRecords: [],
        laPlazaRecords: [],
        loadFromSupabase: vi.fn(),
    })),
}));

describe('Service Section Rendering', () => {
    it('ShowersSection renders correctly', () => {
        render(<ShowersSection />);
        expect(screen.getByText(/Manage Slots/i)).toBeDefined();
    });

    it('LaundrySection renders correctly', () => {
        render(<LaundrySection />);
        expect(screen.getByText(/On-site Laundry/i)).toBeDefined();
    });

    it('BicycleSection renders correctly', () => {
        render(<BicycleSection />);
        expect(screen.getByText(/Bicycle Repairs/i)).toBeDefined();
    });

    it('MealsSection renders correctly', () => {
        render(<MealsSection />);
        expect(screen.getByText(/Daily Meal Logs/i)).toBeDefined();
    });

    it('DonationsSection renders correctly', () => {
        render(<DonationsSection />);
        expect(screen.getByText(/General Donations/i)).toBeDefined();
    });
});
