import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

// Mock Supabase client
const mockUpsert = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            upsert: mockUpsert,
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
        }),
    }),
}));

describe('useSettingsStore', () => {
    const DEFAULT_TARGETS = {
        monthlyMeals: 1500,
        yearlyMeals: 18000,
        monthlyShowers: 300,
        yearlyShowers: 3600,
        monthlyLaundry: 200,
        yearlyLaundry: 2400,
        monthlyBicycles: 50,
        yearlyBicycles: 600,
        monthlyHaircuts: 100,
        yearlyHaircuts: 1200,
        monthlyHolidays: 80,
        yearlyHolidays: 960,
        maxOnsiteLaundrySlots: 5,
    };
    const DEFAULT_AUTO_MEAL_ADDITIONS_ENABLED = true;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store to initial state
        useSettingsStore.setState({
            targets: { ...DEFAULT_TARGETS },
            autoMealAdditionsEnabled: DEFAULT_AUTO_MEAL_ADDITIONS_ENABLED,
            hasLoadedSettings: false,
            isLoadingSettings: false,
        });

        // Default mock implementations
        mockUpsert.mockResolvedValue({ error: null });
        mockSelect.mockReturnThis();
        mockEq.mockReturnThis();
        mockSingle.mockResolvedValue({ data: null, error: null });
    });

    describe('initial state', () => {
        it('has default targets', () => {
            const { targets, autoMealAdditionsEnabled, hasLoadedSettings } = useSettingsStore.getState() as any;

            expect(targets.monthlyMeals).toBe(1500);
            expect(targets.yearlyMeals).toBe(18000);
            expect(targets.monthlyShowers).toBe(300);
            expect(targets.yearlyShowers).toBe(3600);
            expect(targets.monthlyLaundry).toBe(200);
            expect(targets.yearlyLaundry).toBe(2400);
            expect(targets.monthlyBicycles).toBe(50);
            expect(targets.yearlyBicycles).toBe(600);
            expect(targets.monthlyHaircuts).toBe(100);
            expect(targets.yearlyHaircuts).toBe(1200);
            expect(targets.monthlyHolidays).toBe(80);
            expect(targets.yearlyHolidays).toBe(960);
            expect(targets.maxOnsiteLaundrySlots).toBe(5);
            expect(autoMealAdditionsEnabled).toBe(true);
            expect(hasLoadedSettings).toBe(false);
        });
    });

    describe('updateTargets', () => {
        it('updates partial targets', async () => {
            const { updateTargets } = useSettingsStore.getState();

            await updateTargets({ monthlyMeals: 2000 });

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(2000);
            // Other targets should remain unchanged
            expect(targets.yearlyMeals).toBe(18000);
        });

        it('can update multiple targets at once', async () => {
            const { updateTargets } = useSettingsStore.getState();

            await updateTargets({
                monthlyMeals: 2000,
                monthlyShowers: 400,
                maxOnsiteLaundrySlots: 6,
            });

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(2000);
            expect(targets.monthlyShowers).toBe(400);
            expect(targets.maxOnsiteLaundrySlots).toBe(6);
        });

        it('saves updated targets to Supabase', async () => {
            const { updateTargets } = useSettingsStore.getState();

            await updateTargets({ monthlyMeals: 2500 });

            expect(mockUpsert).toHaveBeenCalledWith({
                id: 'global',
                targets: expect.objectContaining({ monthlyMeals: 2500 }),
            });
        });

        it('handles Supabase save error gracefully', async () => {
            mockUpsert.mockResolvedValueOnce({ error: { message: 'Save failed' } });

            const { updateTargets } = useSettingsStore.getState();

            // Should not throw
            await updateTargets({ monthlyMeals: 2500 });

            // State should still be updated locally
            expect(useSettingsStore.getState().targets.monthlyMeals).toBe(2500);
        });
    });

    describe('updateAutoMealAdditionsEnabled', () => {
        it('updates and saves the meal automation toggle', async () => {
            const { updateAutoMealAdditionsEnabled } = useSettingsStore.getState();

            await updateAutoMealAdditionsEnabled(false);

            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(false);
            expect(mockUpsert).toHaveBeenCalledWith({
                id: 'global',
                auto_meal_additions_enabled: false,
            });
        });

        it('reverts and throws when the toggle cannot be saved', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockUpsert.mockResolvedValueOnce({ error: { message: 'Save failed' } });

            const { updateAutoMealAdditionsEnabled } = useSettingsStore.getState();

            await expect(updateAutoMealAdditionsEnabled(false)).rejects.toThrow('Unable to save meal automation setting');

            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to save meal automation setting to Supabase:',
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });
    });

    describe('loadSettings', () => {
        it('loads settings from Supabase', async () => {
            mockSingle.mockResolvedValueOnce({
                data: {
                    targets: {
                        ...DEFAULT_TARGETS,
                        monthlyMeals: 3000,
                        yearlyMeals: 36000,
                    },
                    auto_meal_additions_enabled: false,
                },
                error: null,
            });

            const { loadSettings } = useSettingsStore.getState();
            await loadSettings();

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(3000);
            expect(targets.yearlyMeals).toBe(36000);
            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(false);
            expect((useSettingsStore.getState() as any).hasLoadedSettings).toBe(true);
        });

        it('keeps default settings if no data returned', async () => {
            mockSingle.mockResolvedValueOnce({ data: null, error: null });

            const { loadSettings } = useSettingsStore.getState();
            await loadSettings();

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(1500);
            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(true);
        });

        it('keeps default settings if targets field is null', async () => {
            mockSingle.mockResolvedValueOnce({ data: { targets: null }, error: null });

            const { loadSettings } = useSettingsStore.getState();
            await loadSettings();

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(1500);
            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(true);
        });

        it('handles PGRST116 error silently (no row found)', async () => {
            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
            });

            const { loadSettings } = useSettingsStore.getState();

            // Should not throw
            await loadSettings();

            // Targets should remain at defaults
            expect(useSettingsStore.getState().targets.monthlyMeals).toBe(1500);
        });

        it('logs error for non-PGRST116 errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'OTHER_ERROR', message: 'Some error' },
            });

            const { loadSettings } = useSettingsStore.getState();
            await loadSettings();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to load settings from Supabase:',
                expect.any(Object)
            );

            consoleSpy.mockRestore();
        });

        it('ensureSettingsLoaded hydrates once and skips duplicate fetches', async () => {
            mockSingle.mockResolvedValueOnce({
                data: {
                    targets: {
                        ...DEFAULT_TARGETS,
                        monthlyMeals: 1750,
                    },
                    auto_meal_additions_enabled: false,
                },
                error: null,
            });

            const ensureSettingsLoaded = (useSettingsStore.getState() as any).ensureSettingsLoaded;

            await expect(ensureSettingsLoaded()).resolves.toBe(true);
            await expect(ensureSettingsLoaded()).resolves.toBe(true);

            expect(mockSingle).toHaveBeenCalledTimes(1);
            expect(useSettingsStore.getState().targets.monthlyMeals).toBe(1750);
            expect(useSettingsStore.getState().autoMealAdditionsEnabled).toBe(false);
            expect((useSettingsStore.getState() as any).hasLoadedSettings).toBe(true);
        });
    });
});
