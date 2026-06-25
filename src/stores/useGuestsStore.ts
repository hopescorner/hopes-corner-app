import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@/lib/supabase/client';
import { fetchAllPaginated } from '@/lib/utils/supabasePagination';
import {
    getCachedGuests,
    getCachedGuestWarnings,
    getCachedGuestProxies,
    getCachedGuestFamilies,
    getCachedGuestFamilyMembers,
} from '@/lib/supabase/cachedQueries';
import toast from 'react-hot-toast';
import {
    toTitleCase,
    normalizePreferredName,
    normalizeBicycleDescription,
    normalizeHousingStatus,
    computeIsGuestBanned,
    normalizeDateInputToISO,
} from '@/lib/utils/normalizers';
import {
    mapGuestRow,
    mapGuestProxyRow,
    mapGuestWarningRow,
    mapGuestFamilyRow,
    mapGuestFamilyMemberRow,
} from '@/lib/utils/mappers';
import {
    HOUSING_STATUSES,
    AGE_GROUPS,
    GENDERS,
} from '@/lib/constants/constants';
import { clearSearchIndexCache } from '@/lib/utils/flexibleNameSearch';

const GUEST_IMPORT_CHUNK_SIZE = 100;
const MAX_LINKED_GUESTS = 3;

export interface Guest {
    id: string;
    guestId: string;
    firstName: string;
    lastName: string;
    name: string;
    preferredName: string;
    housingStatus: string;
    age: string;
    gender: string;
    location: string;
    notes: string;
    bicycleDescription: string;
    bannedAt?: string | null;
    bannedUntil?: string | null;
    banReason?: string;
    isBanned: boolean;
    bannedFromBicycle: boolean;
    bannedFromMeals: boolean;
    bannedFromShower: boolean;
    bannedFromLaundry: boolean;
    createdAt: string;
    updatedAt: string;
    docId?: string;
}

interface GuestProxy {
    id: string;
    guestId: string;
    proxyId: string;
    createdAt: string;
}

interface GuestWarning {
    id: string;
    guestId: string;
    message: string;
    severity: number;
    issuedBy?: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GuestFamily {
    id: string;
    primaryGuestId: string;
    enrolledInFamilyMeal: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface GuestFamilyMember {
    id: string;
    familyId: string;
    guestId: string;
    createdAt?: string;
}

export interface GuestRecordCounts {
    meals: number;
    showers: number;
    laundry: number;
    haircuts: number;
    holidays: number;
    bicycleRepairs: number;
    itemsDistributed: number;
    reminders: number;
    warnings: number;
    proxies: number;
    total: number;
}

interface GuestsState {
    guests: Guest[];
    guestProxies: GuestProxy[];
    guestFamilies: GuestFamily[];
    guestFamilyMembers: GuestFamilyMember[];
    warnings: GuestWarning[];
    isLoaded: boolean;
    isLoading: boolean;
    lastLoadedAt?: string;

    syncGuests: (externalGuests: Guest[]) => void;
    addGuest: (guest: any) => Promise<Guest>;
    checkGuestHasRecords: (guestId: string) => Promise<GuestRecordCounts>;
    transferGuestRecords: (fromGuestId: string, toGuestId: string) => Promise<boolean>;
    deleteGuestWithTransfer: (guestId: string, transferToGuestId?: string) => Promise<boolean>;
    updateGuest: (id: string, updates: any) => Promise<boolean>;
    removeGuest: (id: string) => Promise<void>;
    banGuest: (guestId: string, options: any) => Promise<boolean>;
    clearGuestBan: (guestId: string) => Promise<boolean>;
    ensureLoaded: (options?: { force?: boolean; since?: string }) => Promise<void>;
    loadFromSupabase: () => Promise<void>;
    loadGuestWarningsFromSupabase: () => Promise<void>;
    loadGuestProxiesFromSupabase: () => Promise<void>;
    loadGuestFamiliesFromSupabase: () => Promise<void>;
    clearGuests: () => void;
    getWarningsForGuest: (guestId: string) => GuestWarning[];
    addGuestWarning: (guestId: string, options: any) => Promise<GuestWarning>;
    removeGuestWarning: (warningId: string) => Promise<boolean>;
    getLinkedGuests: (guestId: string) => Guest[];
    getLinkedGuestsCount: (guestId: string) => number;
    linkGuests: (guestId: string, proxyId: string) => Promise<GuestProxy>;
    unlinkGuests: (guestId: string, proxyId: string) => Promise<boolean>;
    getFamilyForGuest: (guestId: string) => GuestFamily | null;
    getFamilyMembers: (familyId: string) => Guest[];
    getEnrolledFamilies: () => GuestFamily[];
    getFamilyMemberCount: (familyId: string) => number;
    createFamilyForPrimary: (primaryGuestId: string, enrolled?: boolean) => Promise<GuestFamily>;
    addGuestToFamily: (familyId: string, guestId: string) => Promise<GuestFamilyMember>;
    setFamilyEnrollment: (familyId: string, enrolled: boolean) => Promise<boolean>;
    fetchGuestById: (id: string) => Promise<Guest | null>;

    // Helpers
    generateGuestId: () => string;
}

export const useGuestsStore = create<GuestsState>()(
    devtools(
        persist(
            immer((set, get) => ({
                // State
                guests: [],
                guestProxies: [],
                guestFamilies: [],
                guestFamilyMembers: [],
                warnings: [],
                isLoaded: false,
                isLoading: false,
                lastLoadedAt: undefined,

                syncGuests: (externalGuests) => {
                    set((state) => {
                        state.guests = externalGuests;
                    });
                    clearSearchIndexCache();
                },

                fetchGuestById: async (id) => {
                    const existing = get().guests.find((g) => g.id === id);
                    if (existing) return existing;

                    const supabase = createClient();
                    const { data, error } = await supabase
                        .from('guests')
                        .select('*')
                        .eq('id', id)
                        .maybeSingle();

                    if (error || !data) {
                        return null;
                    }

                    const mapped = mapGuestRow(data) as any;
                    set((state) => {
                        if (!state.guests.some((g) => g.id === id)) {
                            state.guests.push(mapped);
                        }
                    });
                    clearSearchIndexCache();
                    return mapped;
                },

                generateGuestId: () => {
                    return (
                        'G' +
                        Date.now().toString(36).toUpperCase() +
                        Math.floor(Math.random() * 1000)
                            .toString()
                            .padStart(3, '0')
                    );
                },

                // Actions
                addGuest: async (guestData) => {
                    const { guests } = get();
                    const supabase = createClient();

                    let firstName = toTitleCase((guestData.firstName || '').trim());
                    let lastName = toTitleCase((guestData.lastName || '').trim());

                    if (!firstName && guestData.name) {
                        const nameParts = guestData.name.trim().split(/\s+/);
                        firstName = toTitleCase(nameParts[0] || '');
                        lastName = toTitleCase(nameParts.slice(1).join(' ') || '');
                    }

                    if (!firstName) {
                        throw new Error('First name is required.');
                    }

                    if (!lastName) {
                        lastName = firstName.charAt(0).toUpperCase();
                    }

                    // Prevent duplicate guests with exact same first and last name
                    const normalizedFirstName = firstName.toLowerCase().trim();
                    const normalizedLastName = lastName.toLowerCase().trim();
                    const existingDuplicate = guests.find((g) => {
                        const existingFirst = (g.firstName || '').toLowerCase().trim();
                        const existingLast = (g.lastName || '').toLowerCase().trim();
                        return existingFirst === normalizedFirstName && existingLast === normalizedLastName;
                    });

                    if (existingDuplicate) {
                        const existingName = `${existingDuplicate.firstName} ${existingDuplicate.lastName}`.trim();
                        throw new Error(
                            `A guest named "${existingName}" already exists.`
                        );
                    }

                    const legalName = `${firstName} ${lastName}`.trim();
                    const preferredName = normalizePreferredName(guestData.preferredName);
                    const bicycleDescription = normalizeBicycleDescription(guestData.bicycleDescription);


                    const finalGuestId = guestData.guestId || get().generateGuestId();

                    const payload = {
                        external_id: finalGuestId,
                        first_name: firstName,
                        last_name: lastName,
                        full_name: legalName,
                        preferred_name: preferredName,
                        housing_status: normalizeHousingStatus(guestData.housingStatus),
                        age_group: guestData.age,
                        gender: guestData.gender,
                        location: guestData.location || 'Mountain View',
                        notes: guestData.notes || '',
                        bicycle_description: bicycleDescription,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to add guest to Supabase:', error);
                        throw new Error('Unable to save guest.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        state.guests.push(mapped as any);
                    });
                    if (guestData.enrollInFamilyMeal) {
                        await get().createFamilyForPrimary((mapped as any).id, true);
                    } else if (guestData.familyId) {
                        await get().addGuestToFamily(guestData.familyId, (mapped as any).id);
                    }
                    clearSearchIndexCache();
                    return mapped as any;
                },

                updateGuest: async (id, updates) => {
                    const { guests } = get();
                    const supabase = createClient();
                    const target = guests.find((g) => g.id === id);
                    if (!target) return false;

                    const originalGuest = { ...target };

                    const payload: any = {};
                    if (updates.firstName !== undefined) payload.first_name = toTitleCase(updates.firstName);
                    if (updates.lastName !== undefined) payload.last_name = toTitleCase(updates.lastName);
                    if (updates.name !== undefined) payload.full_name = toTitleCase(updates.name);
                    if (updates.preferredName !== undefined) payload.preferred_name = normalizePreferredName(updates.preferredName);
                    if (updates.housingStatus !== undefined) payload.housing_status = normalizeHousingStatus(updates.housingStatus);
                    if (updates.age !== undefined) payload.age_group = updates.age;
                    if (updates.gender !== undefined) payload.gender = updates.gender;
                    if (updates.location !== undefined) payload.location = updates.location;
                    if (updates.notes !== undefined) payload.notes = updates.notes;
                    if (updates.bicycleDescription !== undefined) payload.bicycle_description = normalizeBicycleDescription(updates.bicycleDescription);
                    if (updates.guestId !== undefined) payload.external_id = updates.guestId;

                    // Optimistic update
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === id);
                        if (index !== -1) {
                            state.guests[index] = { ...state.guests[index], ...updates };
                        }
                    });

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', id)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to update guest in Supabase:', error);
                        set((state) => {
                            const index = state.guests.findIndex((g) => g.id === id);
                            if (index !== -1) {
                                state.guests[index] = originalGuest;
                            }
                        });
                        toast.error('Unable to update guest. Reverted changes.');
                        return false;
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === id);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    clearSearchIndexCache();
                    return true;
                },

                removeGuest: async (id) => {
                    const supabase = createClient();

                    set((state) => {
                        state.guests = state.guests.filter((g) => g.id !== id);
                        state.guestProxies = state.guestProxies.filter(p => p.guestId !== id && p.proxyId !== id);
                        state.guestFamilies = state.guestFamilies.filter(f => f.primaryGuestId !== id);
                        state.guestFamilyMembers = state.guestFamilyMembers.filter(m => m.guestId !== id);
                        state.warnings = state.warnings.filter(w => w.guestId !== id);
                    });
                    clearSearchIndexCache();

                    // Cleanup related data in Supabase
                    await supabase.from('guest_proxies').delete().or(`guest_id.eq.${id},proxy_id.eq.${id}`);
                    await supabase.from('guest_family_members').delete().eq('guest_id', id);
                    await supabase.from('guest_families').delete().eq('primary_guest_id', id);
                    await supabase.from('guest_warnings').delete().eq('guest_id', id);
                    await supabase.from('guest_reminders').delete().eq('guest_id', id);
                    const { error } = await supabase.from('guests').delete().eq('id', id);

                    if (error) {
                        console.error('Failed to delete guest from Supabase:', error);
                    }
                },

                checkGuestHasRecords: async (guestId) => {
                    const supabase = createClient();
                    
                    // Query all related tables in parallel
                    const [
                        mealsResult,
                        showersResult,
                        laundryResult,
                        haircutsResult,
                        holidaysResult,
                        bicycleResult,
                        itemsResult,
                        remindersResult,
                        warningsResult,
                        proxiesResult,
                    ] = await Promise.all([
                        supabase.from('meal_attendance').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('shower_reservations').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('laundry_bookings').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('haircut_visits').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('holiday_visits').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('bicycle_repairs').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('items_distributed').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('guest_reminders').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('guest_warnings').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
                        supabase.from('guest_proxies').select('id', { count: 'exact', head: true }).or(`guest_id.eq.${guestId},proxy_id.eq.${guestId}`)
                    ]);

                    const counts = {
                        meals: mealsResult.count || 0,
                        showers: showersResult.count || 0,
                        laundry: laundryResult.count || 0,
                        haircuts: haircutsResult.count || 0,
                        holidays: holidaysResult.count || 0,
                        bicycleRepairs: bicycleResult.count || 0,
                        itemsDistributed: itemsResult.count || 0,
                        reminders: remindersResult.count || 0,
                        warnings: warningsResult.count || 0,
                        proxies: proxiesResult.count || 0,
                        total: 0
                    };
                    counts.total = counts.meals + counts.showers + counts.laundry + 
                                   counts.haircuts + counts.holidays + counts.bicycleRepairs + counts.itemsDistributed +
                                   counts.reminders + counts.warnings + counts.proxies;
                    
                    return counts;
                },

                transferGuestRecords: async (fromGuestId, toGuestId) => {
                    const supabase = createClient();
                    
                    try {
                        // Transfer all records from one guest to another
                        const updates = await Promise.all([
                            supabase.from('meal_attendance').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('shower_reservations').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('laundry_bookings').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('haircut_visits').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('holiday_visits').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('bicycle_repairs').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('items_distributed').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('guest_reminders').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('guest_warnings').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('guest_proxies').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            supabase.from('guest_proxies').update({ proxy_id: toGuestId }).eq('proxy_id', fromGuestId),
                            supabase.from('guest_families').update({ primary_guest_id: toGuestId }).eq('primary_guest_id', fromGuestId),
                            supabase.from('guest_family_members').update({ guest_id: toGuestId }).eq('guest_id', fromGuestId),
                            // Also update meal pickups where this guest picked up meals for others
                            supabase.from('meal_attendance').update({ picked_up_by_guest_id: toGuestId }).eq('picked_up_by_guest_id', fromGuestId)
                        ]);

                        // Check if any updates failed
                        const hasErrors = updates.some(result => result.error);
                        if (hasErrors) {
                            console.error('Some record transfers failed:', updates.filter(r => r.error));
                            return false;
                        }

                        return true;
                    } catch (error) {
                        console.error('Failed to transfer guest records:', error);
                        return false;
                    }
                },

                deleteGuestWithTransfer: async (guestId, transferToGuestId) => {
                    const supabase = createClient();
                    
                    try {
                        // If a transfer target is provided, transfer records first
                        if (transferToGuestId) {
                            const transferSuccess = await get().transferGuestRecords(guestId, transferToGuestId);
                            if (!transferSuccess) {
                                toast.error('Failed to transfer guest records. Guest not deleted.');
                                return false;
                            }
                        }

                        // Now delete the guest (this will cascade to proxies and warnings)
                        set((state) => {
                            state.guests = state.guests.filter((g) => g.id !== guestId);
                            state.guestProxies = state.guestProxies.filter(p => p.guestId !== guestId && p.proxyId !== guestId);
                            state.guestFamilies = state.guestFamilies.filter(f => f.primaryGuestId !== guestId);
                            state.guestFamilyMembers = state.guestFamilyMembers.filter(m => m.guestId !== guestId);
                            state.warnings = state.warnings.filter(w => w.guestId !== guestId);
                        });
                        clearSearchIndexCache();

                        // Cleanup related data in Supabase
                        await supabase.from('guest_proxies').delete().or(`guest_id.eq.${guestId},proxy_id.eq.${guestId}`);
                        await supabase.from('guest_family_members').delete().eq('guest_id', guestId);
                        await supabase.from('guest_families').delete().eq('primary_guest_id', guestId);
                        await supabase.from('guest_warnings').delete().eq('guest_id', guestId);
                        await supabase.from('guest_reminders').delete().eq('guest_id', guestId);
                        const { error } = await supabase.from('guests').delete().eq('id', guestId);

                        if (error) {
                            console.error('Failed to delete guest from Supabase:', error);
                            toast.error('Failed to delete guest from database.');
                            return false;
                        }

                        return true;
                    } catch (error) {
                        console.error('Error in deleteGuestWithTransfer:', error);
                        toast.error('An error occurred while deleting the guest.');
                        return false;
                    }
                },

                banGuest: async (guestId, options) => {
                    const { guests } = get();
                    const supabase = createClient();
                    const target = guests.find((g) => g.id === guestId);
                    if (!target) return false;

                    const {
                        bannedUntil,
                        banReason = '',
                        bannedFromBicycle = false,
                        bannedFromMeals = false,
                        bannedFromShower = false,
                        bannedFromLaundry = false,
                    } = options;

                    const normalizedUntil = normalizeDateInputToISO(bannedUntil);
                    if (!normalizedUntil) throw new Error('Ban end time is required.');

                    const payload = {
                        ban_reason: banReason || null,
                        banned_until: normalizedUntil,
                        banned_at: new Date().toISOString(),
                        banned_from_bicycle: bannedFromBicycle,
                        banned_from_meals: bannedFromMeals,
                        banned_from_shower: bannedFromShower,
                        banned_from_laundry: bannedFromLaundry,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', guestId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to update ban in Supabase:', error);
                        throw new Error('Unable to update ban status.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === guestId);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    return true;
                },

                clearGuestBan: async (guestId) => {
                    const supabase = createClient();
                    const payload = {
                        ban_reason: null,
                        banned_until: null,
                        banned_at: null,
                        banned_from_bicycle: false,
                        banned_from_meals: false,
                        banned_from_shower: false,
                        banned_from_laundry: false,
                    };

                    const { data, error } = await supabase
                        .from('guests')
                        .update(payload)
                        .eq('id', guestId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to clear ban in Supabase:', error);
                        throw new Error('Unable to clear ban.');
                    }

                    const mapped = mapGuestRow(data);
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === guestId);
                        if (index !== -1) {
                            state.guests[index] = mapped as any;
                        }
                    });
                    return true;
                },

                ensureLoaded: async ({ force = false }: { force?: boolean; since?: string } = {}) => {
                    if (!force && get().isLoaded) return;
                    if (get().isLoading) return;

                    set((state) => {
                        state.isLoading = true;
                    });

                    try {
                        // Use cached query to prevent duplicate fetches
                        const [guestsData, familiesData, membersData] = await Promise.all([
                            getCachedGuests(),
                            getCachedGuestFamilies(),
                            getCachedGuestFamilyMembers(),
                        ]);

                        set((state) => {
                            state.guests = (guestsData || []).map((g: any) => ({
                                ...g,
                                housingStatus: normalizeHousingStatus(g.housingStatus),
                            })) as any;
                            state.guestFamilies = familiesData as any;
                            state.guestFamilyMembers = membersData as any;
                            state.isLoaded = true;
                            state.lastLoadedAt = new Date().toISOString();
                        });
                        clearSearchIndexCache();
                    } catch (error) {
                        console.error('Failed to load guests from Supabase:', error);
                    } finally {
                        set((state) => {
                            state.isLoading = false;
                        });
                    }
                },

                loadFromSupabase: async () => {
                    await get().ensureLoaded({ force: true });
                },

                loadGuestWarningsFromSupabase: async () => {
                    try {
                        // Use cached query to prevent duplicate fetches
                        const warningsData = await getCachedGuestWarnings();

                        set((state) => {
                            state.warnings = (warningsData || []) as any;
                        });
                    } catch (error) {
                        console.error('Failed to load guest warnings from Supabase:', error);
                    }
                },

                loadGuestProxiesFromSupabase: async () => {
                    try {
                        // Use cached query to prevent duplicate fetches
                        const proxiesData = await getCachedGuestProxies();

                        set((state) => {
                            state.guestProxies = proxiesData as any;
                        });
                    } catch (error) {
                        console.error('Failed to load guest proxies from Supabase:', error);
                    }
                },

                loadGuestFamiliesFromSupabase: async () => {
                    try {
                        const [familiesData, membersData] = await Promise.all([
                            getCachedGuestFamilies(),
                            getCachedGuestFamilyMembers(),
                        ]);

                        set((state) => {
                            state.guestFamilies = familiesData as any;
                            state.guestFamilyMembers = membersData as any;
                        });
                    } catch (error) {
                        console.error('Failed to load guest families from Supabase:', error);
                    }
                },

                clearGuests: () => {
                    set((state) => {
                        state.guests = [];
                        state.guestFamilies = [];
                        state.guestFamilyMembers = [];
                    });
                    clearSearchIndexCache();
                },

                getWarningsForGuest: (guestId) => {
                    const { warnings } = get();
                    return (warnings || []).filter((w) => w.guestId === guestId && w.active);
                },

                addGuestWarning: async (guestId, { message, severity = 1, issuedBy = null } = {}) => {
                    const supabase = createClient();
                    const payload = {
                        guest_id: guestId,
                        message: String(message).trim(),
                        severity: Number(severity) || 1,
                        issued_by: issuedBy,
                        active: true,
                    };

                    const { data, error } = await supabase
                        .from('guest_warnings')
                        .insert(payload)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to add warning to Supabase:', error);
                        throw new Error('Unable to save warning.');
                    }

                    const mapped = mapGuestWarningRow(data);
                    set((state) => {
                        state.warnings.unshift(mapped as any);
                    });
                    return mapped as any;
                },

                removeGuestWarning: async (warningId) => {
                    const supabase = createClient();

                    set((state) => {
                        state.warnings = state.warnings.filter(w => w.id !== warningId);
                    });

                    const { error } = await supabase.from('guest_warnings').delete().eq('id', warningId);
                    if (error) {
                        console.error('Failed to delete warning from Supabase:', error);
                        return false;
                    }
                    return true;
                },

                getLinkedGuests: (guestId) => {
                    const { guests, guestProxies } = get();
                    const linkedIds = guestProxies
                        .filter(p => p.guestId === guestId)
                        .map(p => p.proxyId);
                    const reverseLinkedIds = guestProxies
                        .filter(p => p.proxyId === guestId)
                        .map(p => p.guestId);

                    const allLinkedIds = new Set([...linkedIds, ...reverseLinkedIds]);
                    return guests.filter(g => g && allLinkedIds.has(g.id));
                },

                getLinkedGuestsCount: (guestId) => {
                    const { guestProxies } = get();
                    const linkedIds = new Set();
                    guestProxies.forEach(p => {
                        if (p.guestId === guestId) linkedIds.add(p.proxyId);
                        if (p.proxyId === guestId) linkedIds.add(p.guestId);
                    });
                    return linkedIds.size;
                },

                linkGuests: async (guestId, proxyId) => {
                    const supabase = createClient();

                    const { data, error } = await supabase
                        .from('guest_proxies')
                        .insert({ guest_id: guestId, proxy_id: proxyId })
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to link guests in Supabase:', error);
                        throw new Error('Failed to link guests.');
                    }

                    const mapped = mapGuestProxyRow(data);
                    set((state) => {
                        state.guestProxies.push(mapped as any);
                    });
                    return mapped as any;
                },

                unlinkGuests: async (guestId, proxyId) => {
                    const supabase = createClient();

                    const { error } = await supabase
                        .from('guest_proxies')
                        .delete()
                        .or(`and(guest_id.eq.${guestId},proxy_id.eq.${proxyId}),and(guest_id.eq.${proxyId},proxy_id.eq.${guestId})`);

                    if (error) {
                        console.error('Failed to unlink guests in Supabase:', error);
                        return false;
                    }

                    set((state) => {
                        state.guestProxies = state.guestProxies.filter(
                            p => !(p.guestId === guestId && p.proxyId === proxyId) &&
                                !(p.guestId === proxyId && p.proxyId === guestId)
                        );
                    });
                    return true;
                },

                getFamilyForGuest: (guestId) => {
                    const { guestFamilies, guestFamilyMembers } = get();
                    const membership = guestFamilyMembers.find((m) => m.guestId === guestId);
                    if (membership) {
                        return guestFamilies.find((f) => f.id === membership.familyId) || null;
                    }
                    return guestFamilies.find((f) => f.primaryGuestId === guestId) || null;
                },

                getFamilyMembers: (familyId) => {
                    const { guests, guestFamilyMembers } = get();
                    const memberIds = new Set(
                        guestFamilyMembers
                            .filter((m) => m.familyId === familyId)
                            .map((m) => m.guestId)
                    );
                    return guests.filter((g) => g && memberIds.has(g.id));
                },

                getEnrolledFamilies: () => {
                    return get().guestFamilies.filter((f) => f.enrolledInFamilyMeal);
                },

                getFamilyMemberCount: (familyId) => {
                    return get().guestFamilyMembers.filter((m) => m.familyId === familyId).length;
                },

                createFamilyForPrimary: async (primaryGuestId, enrolled = false) => {
                    const existing = get().guestFamilies.find((f) => f.primaryGuestId === primaryGuestId);
                    if (existing) {
                        if (existing.enrolledInFamilyMeal !== enrolled) {
                            await get().setFamilyEnrollment(existing.id, enrolled);
                        }
                        if (!get().guestFamilyMembers.some((m) => m.familyId === existing.id && m.guestId === primaryGuestId)) {
                            await get().addGuestToFamily(existing.id, primaryGuestId);
                        }
                        return get().guestFamilies.find((f) => f.id === existing.id) || existing;
                    }

                    const supabase = createClient();
                    const { data, error } = await supabase
                        .from('guest_families')
                        .insert({ primary_guest_id: primaryGuestId, enrolled_in_family_meal: enrolled })
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to create guest family in Supabase:', error);
                        throw new Error('Unable to create family.');
                    }

                    const mapped = mapGuestFamilyRow(data);
                    set((state) => {
                        state.guestFamilies.push(mapped as any);
                    });
                    await get().addGuestToFamily((mapped as any).id, primaryGuestId);
                    return mapped as any;
                },

                addGuestToFamily: async (familyId, guestId) => {
                    const existing = get().guestFamilyMembers.find((m) => m.familyId === familyId && m.guestId === guestId);
                    if (existing) return existing;

                    const supabase = createClient();
                    const { data, error } = await supabase
                        .from('guest_family_members')
                        .upsert({ family_id: familyId, guest_id: guestId }, { onConflict: 'guest_id' })
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to add guest family member in Supabase:', error);
                        throw new Error('Unable to add family member.');
                    }

                    const mapped = mapGuestFamilyMemberRow(data);
                    set((state) => {
                        state.guestFamilyMembers = [
                            ...state.guestFamilyMembers.filter((m) => m.guestId !== guestId),
                            mapped as any,
                        ];
                    });
                    return mapped as any;
                },

                setFamilyEnrollment: async (familyId, enrolled) => {
                    const supabase = createClient();
                    const { data, error } = await supabase
                        .from('guest_families')
                        .update({ enrolled_in_family_meal: enrolled })
                        .eq('id', familyId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Failed to update family enrollment in Supabase:', error);
                        return false;
                    }

                    const mapped = mapGuestFamilyRow(data);
                    set((state) => {
                        const idx = state.guestFamilies.findIndex((f) => f.id === familyId);
                        if (idx === -1) state.guestFamilies.push(mapped as any);
                        else state.guestFamilies[idx] = mapped as any;
                    });
                    return true;
                },
            })),
            {
                name: 'hopes-corner-guests-v2',
                partialize: () => ({}),
            }
        ),
        { name: 'GuestsStore' }
    )
);
