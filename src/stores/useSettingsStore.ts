import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

interface Targets {
    monthlyMeals: number;
    yearlyMeals: number;
    monthlyShowers: number;
    yearlyShowers: number;
    monthlyLaundry: number;
    yearlyLaundry: number;
    monthlyBicycles: number;
    yearlyBicycles: number;
    monthlyHaircuts: number;
    yearlyHaircuts: number;
    monthlyHolidays: number;
    yearlyHolidays: number;
    maxOnsiteLaundrySlots: number;
}

interface SettingsState {
    targets: Targets;
    autoMealAdditionsEnabled: boolean;
    hasLoadedSettings: boolean;
    isLoadingSettings: boolean;
    updateTargets: (newTargets: Partial<Targets>) => Promise<void>;
    updateAutoMealAdditionsEnabled: (enabled: boolean) => Promise<void>;
    loadSettings: () => Promise<boolean>;
    ensureSettingsLoaded: () => Promise<boolean>;
}

const DEFAULT_TARGETS: Targets = {
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

let settingsLoadPromise: Promise<boolean> | null = null;

const fetchSettingsFromSupabase = async (
    set: (partial: Partial<SettingsState>) => void
): Promise<boolean> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('app_settings')
        .select('targets, auto_meal_additions_enabled')
        .eq('id', 'global')
        .single();

    if (data?.targets) {
        set({ targets: data.targets });
    }

    if (typeof data?.auto_meal_additions_enabled === 'boolean') {
        set({ autoMealAdditionsEnabled: data.auto_meal_additions_enabled });
    }

    if (error && error.code !== 'PGRST116') {
        set({ hasLoadedSettings: false });
        console.error('Failed to load settings from Supabase:', error);
        return false;
    }

    set({ hasLoadedSettings: true });
    return true;
};

const runSettingsLoad = (
    set: (partial: Partial<SettingsState>) => void,
    get: () => SettingsState,
    force = false
) => {
    if (!force) {
        if (get().hasLoadedSettings) {
            return Promise.resolve(true);
        }

        if (settingsLoadPromise) {
            return settingsLoadPromise;
        }
    } else if (settingsLoadPromise) {
        return settingsLoadPromise;
    }

    set({ isLoadingSettings: true });

    const loadPromise = fetchSettingsFromSupabase(set).finally(() => {
        if (settingsLoadPromise === loadPromise) {
            settingsLoadPromise = null;
        }

        set({ isLoadingSettings: false });
    });

    settingsLoadPromise = loadPromise;
    return loadPromise;
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            targets: DEFAULT_TARGETS,
            autoMealAdditionsEnabled: DEFAULT_AUTO_MEAL_ADDITIONS_ENABLED,
            hasLoadedSettings: false,
            isLoadingSettings: false,

            updateTargets: async (newTargets) => {
                const updated = { ...get().targets, ...newTargets };
                set({ targets: updated, hasLoadedSettings: true });

                const supabase = createClient();
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ id: 'global', targets: updated });

                if (error) {
                    console.error('Failed to save settings to Supabase:', error);
                }
            },

            updateAutoMealAdditionsEnabled: async (enabled) => {
                const previousValue = get().autoMealAdditionsEnabled;
                const previousLoadedState = get().hasLoadedSettings;
                set({ autoMealAdditionsEnabled: enabled, hasLoadedSettings: true });

                const supabase = createClient();
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ id: 'global', auto_meal_additions_enabled: enabled });

                if (error) {
                    set({ autoMealAdditionsEnabled: previousValue, hasLoadedSettings: previousLoadedState });
                    console.error('Failed to save meal automation setting to Supabase:', error);
                    throw new Error('Unable to save meal automation setting');
                }
            },

            loadSettings: async () => {
                return runSettingsLoad(set, get, true);
            },

            ensureSettingsLoaded: async () => {
                return runSettingsLoad(set, get);
            },
        }),
        {
            name: 'hopes-corner-settings',
            partialize: (state) => ({
                targets: state.targets,
                autoMealAdditionsEnabled: state.autoMealAdditionsEnabled,
            }),
        }
    )
);
