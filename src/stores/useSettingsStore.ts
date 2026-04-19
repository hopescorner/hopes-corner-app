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
    updateTargets: (newTargets: Partial<Targets>) => Promise<void>;
    updateAutoMealAdditionsEnabled: (enabled: boolean) => Promise<void>;
    loadSettings: () => Promise<void>;
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

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            targets: DEFAULT_TARGETS,
            autoMealAdditionsEnabled: DEFAULT_AUTO_MEAL_ADDITIONS_ENABLED,

            updateTargets: async (newTargets) => {
                const updated = { ...get().targets, ...newTargets };
                set({ targets: updated });

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
                set({ autoMealAdditionsEnabled: enabled });

                const supabase = createClient();
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ id: 'global', auto_meal_additions_enabled: enabled });

                if (error) {
                    set({ autoMealAdditionsEnabled: previousValue });
                    console.error('Failed to save meal automation setting to Supabase:', error);
                    throw new Error('Unable to save meal automation setting');
                }
            },

            loadSettings: async () => {
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
                } else if (error && error.code !== 'PGRST116') {
                    console.error('Failed to load settings from Supabase:', error);
                }
            },
        }),
        {
            name: 'hopes-corner-settings',
        }
    )
);
