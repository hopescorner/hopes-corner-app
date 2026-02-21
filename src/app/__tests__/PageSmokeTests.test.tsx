import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/dynamic to avoid async chunk loader side effects in smoke tests
vi.mock('next/dynamic', () => ({
    default: (loader: unknown, options?: { loading?: React.ComponentType }) => {
        const MockDynamicComponent = () => {
            const Loading = options?.loading;
            return Loading ? <Loading /> : null;
        };
        return MockDynamicComponent;
    },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
}));

// Keep check-in smoke test lightweight and deterministic
vi.mock('@tanstack/react-virtual', () => ({
    useWindowVirtualizer: () => ({
        getTotalSize: () => 0,
        getVirtualItems: () => [],
        scrollToIndex: vi.fn(),
        measure: vi.fn(),
        measureElement: vi.fn(),
    }),
}));

vi.mock('@/components/checkin/MealServiceTimer', () => ({ MealServiceTimer: () => null }));
vi.mock('@/components/checkin/TodayStats', () => ({ TodayStats: () => null }));
vi.mock('@/components/checkin/ServiceStatusOverview', () => ({ ServiceStatusOverview: () => null }));
vi.mock('@/components/checkin/DailyNotesSection', () => ({ DailyNotesSection: () => null }));
vi.mock('../(protected)/check-in/page', () => ({
    default: () => <div>Find or Add Guests</div>,
}));

// Mock admin components to prevent async import leaks during test teardown
vi.mock('@/components/admin/reports/MonthlyReportGenerator', () => ({ default: () => null }));
vi.mock('@/components/admin/reports/MealReport', () => ({ MealReport: () => null }));
vi.mock('@/components/admin/reports/MonthlySummaryReport', () => ({ default: () => null }));
vi.mock('@/components/admin/DataExportSection', () => ({ DataExportSection: () => null }));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { role: 'admin', name: 'Admin' } }, status: 'authenticated' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock auth from config (for server components)
vi.mock('@/lib/auth/config', () => ({
    auth: vi.fn(async () => ({ user: { role: 'admin', name: 'Admin' } })),
}));

// Mock Supabase client to prevent unhandled fetches
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => ({ data: [], error: null }))
            }))
        }))
    }))
}));

// Mock stores
const mockShowerRecords: any[] = [];
const mockLaundryRecords: any[] = [];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: Object.assign(
        vi.fn((selector) => {
            const state = {
                showerRecords: mockShowerRecords,
                laundryRecords: mockLaundryRecords,
                bicycleRecords: [],
                haircutRecords: [],
                holidayRecords: [],
                fetchTodaysRecords: vi.fn(),
                ensureLoaded: vi.fn(),
                loadFromSupabase: vi.fn(),
            };
            return typeof selector === 'function' ? selector(state) : state;
        }),
        {
            subscribe: vi.fn(() => () => { }),
            getState: vi.fn(() => ({
                showerRecords: mockShowerRecords,
                laundryRecords: mockLaundryRecords,
            })),
        }
    ),
}));

vi.mock('@/stores/useMealsStore', () => ({
    useMealsStore: vi.fn((selector) => {
        const state = {
            mealRecords: [],
            rvMealRecords: [],
            extraMealRecords: [],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            lunchBagRecords: [],
            holidayRecords: [],
            haircutRecords: [],
            ensureLoaded: vi.fn(),
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
            searchGuests: vi.fn(),
            ensureLoaded: vi.fn(),
            loadFromSupabase: vi.fn(),
            loadGuestWarningsFromSupabase: vi.fn(),
            loadGuestProxiesFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useSettingsStore', () => ({
    useSettingsStore: vi.fn(() => ({
        loadSettings: vi.fn(),
        targets: {
            dailyMeals: 100,
            monthlyMeals: 2000,
            monthlyShowers: 500,
            monthlyLaundry: 200,
            monthlyBicycles: 50,
            yearlyMeals: 25000,
            yearlyShowers: 6000,
            yearlyLaundry: 2400,
            yearlyBicycles: 600,
        },
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        fetchBlockedSlots: vi.fn(() => Promise.resolve()),
        isSlotBlocked: vi.fn(() => false),
    })),
}));

vi.mock('@/stores/useDonationsStore', () => ({
    useDonationsStore: vi.fn((selector) => {
        const state = {
            donationRecords: [],
            ensureLoaded: vi.fn(),
            loadFromSupabase: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useModalStore', () => ({
    useModalStore: vi.fn((selector) => {
        const state = { openNoteModal: vi.fn() };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useRemindersStore', () => ({
    useRemindersStore: vi.fn((selector) => {
        const state = {
            reminders: [],
            loadFromSupabase: vi.fn(() => Promise.resolve()),
            getActiveRemindersForGuest: vi.fn(() => []),
            hasActiveReminder: vi.fn(() => false),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

vi.mock('@/stores/useDailyNotesStore', () => ({
    useDailyNotesStore: vi.fn(() => ({
        notes: [],
        isLoading: false,
        isLoaded: true,
        ensureLoaded: vi.fn(() => Promise.resolve()),
        loadFromSupabase: vi.fn(() => Promise.resolve()),
        subscribeToRealtime: vi.fn(() => () => { }),
        addOrUpdateNote: vi.fn(() => Promise.resolve()),
        deleteNote: vi.fn(() => Promise.resolve()),
        getNotesForDate: vi.fn(() => []),
        getNoteForDateAndService: vi.fn(() => null),
        getNotesForDateRange: vi.fn(() => []),
        hasNoteForDate: vi.fn(() => false),
    })),
}));

// Mock the selectors for check-in page
vi.mock('@/stores/selectors/todayStatusSelectors', () => ({
    useTodayMealStatusMap: vi.fn(() => new Map()),
    useTodayActionStatusMap: vi.fn(() => new Map()),
    useTodayServiceStatusMap: vi.fn(() => new Map()),
    useTodayStatusMaps: vi.fn(() => ({
        mealStatus: new Map(),
        serviceStatus: new Map(),
        actionStatus: new Map(),
    })),
    defaultMealStatus: {
        hasMeal: false,
        mealCount: 0,
        extraMealCount: 0,
        totalMeals: 0,
    },
    defaultServiceStatus: {
        hasShower: false,
        hasLaundry: false,
        hasBicycle: false,
        hasHaircut: false,
        hasHoliday: false,
    },
    defaultActionStatus: {},
}));

// Import pages
import HomePage from '../page';
import LoginPage from '../(auth)/login/page';
import DashboardPage from '../(protected)/dashboard/page';
import CheckInPage from '../(protected)/check-in/page';

describe('Page Smoke Tests', () => {
    it('HomePage redirects correctly (Server Component)', async () => {
        const { redirect } = await import('next/navigation');
        await HomePage();
        expect(redirect).toHaveBeenCalled();
    });

    it('LoginPage renders correctly', () => {
        render(<LoginPage />);
        // Get the header, not the button
        expect(screen.getByRole('heading', { name: /Sign In/i })).toBeDefined();
    });

    it('DashboardPage renders correctly', () => {
        render(<DashboardPage />);
        expect(screen.getByText(/Mission Intelligence/i)).toBeDefined();
    });

    it('CheckInPage renders correctly', () => {
        render(<CheckInPage />);
        expect(screen.getByText(/Find or Add Guests/i)).toBeDefined();
    });
});
