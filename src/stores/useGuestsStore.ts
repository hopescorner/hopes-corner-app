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
    /** Meal distributions recorded for the household this guest heads. Counted in `total` so history is preserved via transfer. */
    familyMeals: number;
    /**
     * Household links (primary ownership + member row). Reported for context only —
     * membership alone never forces a transfer since it is removed automatically on delete.
     */
    familyLinks: number;
    total: number;
}

/**
 * Error message thrown when a household primary with dependents is moved,
 * unlinked, or deleted. Callers surface `message` directly to staff.
 */
export function primaryHasDependentsMessage(primaryName: string, dependentNames: string[]): string {
    const list = dependentNames.slice(0, 5).join(', ');
    const more = dependentNames.length > 5 ? ` and ${dependentNames.length - 5} more` : '';
    return `${primaryName} heads a household with ${dependentNames.length} dependent${dependentNames.length === 1 ? '' : 's'} (${list}${more}). Delete the dependents first, then delete ${primaryName}.`;
}

function displayNameOf(guest: Guest | undefined | null): string {
    if (!guest) return 'Unknown Guest';
    return guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
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
    /** 'primary' when the guest heads a household, 'member' when they are a dependent, null when in no household. */
    getFamilyRole: (guestId: string) => 'primary' | 'member' | null;
    /** Dependents of a household primary (members excluding the primary itself). Empty for non-primaries. */
    getDependentsForPrimary: (primaryGuestId: string) => Guest[];
    /** True when the guest heads a household that still has dependents. */
    isPrimaryWithDependents: (guestId: string) => boolean;
    /**
     * Robust household snapshot: primary guest, all members (primary included
     * even when its member row is missing), and dependent count.
     */
    getFamilyDetail: (familyId: string) => {
        family: GuestFamily;
        primaryGuest: Guest | undefined;
        members: Guest[];
        memberCount: number;
        dependentCount: number;
    } | null;
    createFamilyForPrimary: (primaryGuestId: string, enrolled?: boolean) => Promise<GuestFamily>;
    addGuestToFamily: (familyId: string, guestId: string) => Promise<GuestFamilyMember>;
    setFamilyEnrollment: (familyId: string, enrolled: boolean) => Promise<boolean>;
    /** Recorded family-meal count for a household (0 when unknown). Used to validate moves before saving. */
    countHouseholdMeals: (familyId: string) => Promise<number>;
    removeGuestFromFamily: (guestId: string) => Promise<boolean>;
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

                    let { data, error } = await supabase
                        .from('guests')
                        .insert(payload)
                        .select()
                        .single();

                    // external_id is client-generated; on the rare collision (or a
                    // parallel device racing the same id), regenerate and retry once.
                    if (error && error.code === '23505' && !guestData.guestId) {
                        const retryPayload = { ...payload, external_id: get().generateGuestId() };
                        ({ data, error } = await supabase
                            .from('guests')
                            .insert(retryPayload)
                            .select()
                            .single());
                    }

                    if (error) {
                        console.error('Failed to add guest to Supabase:', error);
                        throw new Error('Unable to save guest.');
                    }

                    const mapped = mapGuestRow(data);
                    if (guestData.familyId) {
                        const targetFamily = get().guestFamilies.find((f) => f.id === guestData.familyId);
                        if (!targetFamily) {
                            // Guest row was already created; keep it but report the bad link
                            // instead of failing silently so staff can retry the household step.
                            set((state) => {
                                state.guests.push(mapped as any);
                            });
                            clearSearchIndexCache();
                            throw new Error('Guest created, but the selected household no longer exists. Please add them to a household from Edit Guest.');
                        }
                    }
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

                    const mapped = mapGuestRow(data) as Guest;
                    // The update succeeded server-side; the echo only refreshes
                    // local state. If it comes back for a different id, ignore
                    // it entirely — every household, proxy, and warning link
                    // keys off the guest id, and the optimistic state already
                    // holds the intended values.
                    const reconciled = !mapped || (mapped as any).id !== id
                        ? ({ ...target, ...updates } as any)
                        : ({ ...(mapped as any), id, guestId: (mapped as any)?.guestId || target.guestId } as any);
                    if (!mapped || (mapped as any).id !== id) {
                        console.error('Guest update returned a mismatched id; keeping local state.', { id, echo: (mapped as any)?.id });
                    }
                    set((state) => {
                        const index = state.guests.findIndex((g) => g.id === id);
                        if (index !== -1) {
                            state.guests[index] = reconciled;
                        }
                    });
                    clearSearchIndexCache();
                    return true;
                },

                removeGuest: async (id) => {
                    const supabase = createClient();

                    const dependents = get().getDependentsForPrimary(id);
                    if (dependents.length > 0) {
                        const primary = get().guests.find((g) => g.id === id);
                        toast.error(primaryHasDependentsMessage(displayNameOf(primary), dependents.map(displayNameOf)));
                        return;
                    }

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

                    // Query all related tables in parallel, plus the household rows
                    // needed to count family-meal history (household distributions
                    // belong to the primary's family, not to any single member).
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
                        primaryFamilyResult,
                        memberRowResult,
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
                        supabase.from('guest_proxies').select('id', { count: 'exact', head: true }).or(`guest_id.eq.${guestId},proxy_id.eq.${guestId}`),
                        supabase.from('guest_families').select('id').eq('primary_guest_id', guestId).maybeSingle(),
                        supabase.from('guest_family_members').select('family_id').eq('guest_id', guestId).maybeSingle(),
                    ]);

                    const primaryFamilyId =
                        (primaryFamilyResult as any)?.data?.id
                        || get().guestFamilies.find((f) => f.primaryGuestId === guestId)?.id
                        || null;
                    const hasMemberRow = Boolean(
                        (memberRowResult as any)?.data?.family_id
                        || get().guestFamilyMembers.some((m) => m.guestId === guestId),
                    );

                    let familyMeals = 0;
                    if (primaryFamilyId) {
                        try {
                            const { count } = await supabase
                                .from('family_meal_distributions')
                                .select('id', { count: 'exact', head: true })
                                .eq('family_id', primaryFamilyId);
                            familyMeals = count || 0;
                        } catch (error) {
                            console.error('Failed to count family meal records:', error);
                        }
                    }

                    const counts: GuestRecordCounts = {
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
                        familyMeals,
                        familyLinks: (primaryFamilyId ? 1 : 0) + (hasMemberRow ? 1 : 0),
                        total: 0
                    };
                    // Household links are excluded from the total: membership alone
                    // never forces a transfer since it is removed automatically on
                    // delete. Family meal history IS included so it is preserved.
                    counts.total = counts.meals + counts.showers + counts.laundry +
                                   counts.haircuts + counts.holidays + counts.bicycleRepairs + counts.itemsDistributed +
                                   counts.reminders + counts.warnings + counts.proxies + counts.familyMeals;

                    return counts;
                },

                transferGuestRecords: async (fromGuestId, toGuestId) => {
                    const supabase = createClient();

                    if (fromGuestId === toGuestId) {
                        toast.error('Cannot transfer records to the same guest.');
                        return false;
                    }

                    const targetExists = get().guests.some((g) => g.id === toGuestId);
                    if (!targetExists) {
                        try {
                            const fetched = await get().fetchGuestById(toGuestId);
                            if (!fetched) {
                                toast.error('Transfer target guest no longer exists.');
                                return false;
                            }
                        } catch {
                            toast.error('Transfer target guest no longer exists.');
                            return false;
                        }
                    }

                    // Household transfers are validated up front: moving a primary
                    // with dependents (or merging two household heads) would orphan
                    // dependents or silently drop meal history, so refuse with a
                    // message that tells staff exactly how to resolve it.
                    try {
                        const sourceFamily = get().guestFamilies.find((f) => f.primaryGuestId === fromGuestId);
                        if (sourceFamily) {
                            const dependents = get().getDependentsForPrimary(fromGuestId);
                            if (dependents.length > 0) {
                                const source = get().guests.find((g) => g.id === fromGuestId);
                                toast.error(primaryHasDependentsMessage(
                                    displayNameOf(source),
                                    dependents.map(displayNameOf),
                                ));
                                return false;
                            }
                        }
                        const targetPrimaryFamily = get().guestFamilies.find((f) => f.primaryGuestId === toGuestId);
                        const targetMembership = get().guestFamilyMembers.find((m) => m.guestId === toGuestId);
                        if (sourceFamily && (targetPrimaryFamily || targetMembership)) {
                            toast.error('Both guests belong to households. Merge the households manually first (move or remove members), then retry the transfer.');
                            return false;
                        }
                    } catch (error) {
                        console.error('Failed to validate household transfer:', error);
                        toast.error('Could not verify household state. Please try again.');
                        return false;
                    }

                    try {
                        // Transfer all records from one guest to another.
                        // Household membership is handled separately below so a
                        // duplicate link never violates the one-household-per-guest
                        // rule; meal history follows the household, not the member.
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
                            // Also update meal pickups where this guest picked up meals for others
                            supabase.from('meal_attendance').update({ picked_up_by_guest_id: toGuestId }).eq('picked_up_by_guest_id', fromGuestId)
                        ]);

                        // Check if any updates failed
                        const hasErrors = updates.some(result => result.error);
                        if (hasErrors) {
                            const failedUpdates = updates.filter(result => result.error);
                            console.error('Some record transfers failed:', failedUpdates);
                            const message = failedUpdates[0]?.error?.message || 'The database rejected the transfer';
                            toast.error(`Could not transfer guest records: ${message}`);
                            return false;
                        }

                        // Household links last: at this point the source is either a
                        // single-member primary (safe to re-head) or a plain member.
                        const sourceFamily = get().guestFamilies.find((f) => f.primaryGuestId === fromGuestId);
                        if (sourceFamily) {
                            const { error } = await supabase
                                .from('guest_families')
                                .update({ primary_guest_id: toGuestId })
                                .eq('id', sourceFamily.id);
                            if (error) {
                                console.error('Failed to transfer household ownership:', error);
                                toast.error(`Could not transfer household: ${error.message || 'The database rejected the transfer'}`);
                                return false;
                            }
                            const memberRow = get().guestFamilyMembers.find(
                                (m) => m.familyId === sourceFamily.id && m.guestId === fromGuestId,
                            );
                            if (memberRow) {
                                const targetHasRow = get().guestFamilyMembers.some((m) => m.guestId === toGuestId);
                                if (targetHasRow) {
                                    await supabase.from('guest_family_members').delete().eq('id', memberRow.id);
                                } else {
                                    await supabase.from('guest_family_members').update({ guest_id: toGuestId }).eq('id', memberRow.id);
                                }
                            }
                            set((state) => {
                                const family = state.guestFamilies.find((f) => f.id === sourceFamily.id);
                                if (family) family.primaryGuestId = toGuestId;
                                const row = state.guestFamilyMembers.find(
                                    (m) => m.familyId === sourceFamily.id && m.guestId === fromGuestId,
                                );
                                if (row) {
                                    if (state.guestFamilyMembers.some((m) => m.guestId === toGuestId && m !== row)) {
                                        state.guestFamilyMembers = state.guestFamilyMembers.filter((m) => m !== row);
                                    } else {
                                        row.guestId = toGuestId;
                                    }
                                }
                            });
                        } else {
                            const sourceMembership = get().guestFamilyMembers.find((m) => m.guestId === fromGuestId);
                            if (sourceMembership) {
                                const targetHasRow = get().guestFamilyMembers.some((m) => m.guestId === toGuestId);
                                if (targetHasRow) {
                                    // Duplicate link: drop the source row instead of
                                    // violating the one-household-per-guest rule.
                                    await supabase.from('guest_family_members').delete().eq('guest_id', fromGuestId);
                                    set((state) => {
                                        state.guestFamilyMembers = state.guestFamilyMembers.filter((m) => m.guestId !== fromGuestId);
                                    });
                                } else {
                                    const { error } = await supabase
                                        .from('guest_family_members')
                                        .update({ guest_id: toGuestId })
                                        .eq('guest_id', fromGuestId);
                                    if (error) {
                                        console.error('Failed to transfer household membership:', error);
                                        toast.error(`Could not transfer household membership: ${error.message || 'The database rejected the transfer'}`);
                                        return false;
                                    }
                                    set((state) => {
                                        const row = state.guestFamilyMembers.find((m) => m.guestId === fromGuestId);
                                        if (row) row.guestId = toGuestId;
                                    });
                                }
                            }
                        }

                        return true;
                    } catch (error) {
                        console.error('Failed to transfer guest records:', error);
                        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
                        toast.error(`Could not transfer guest records: ${message}`);
                        return false;
                    }
                },

                deleteGuestWithTransfer: async (guestId, transferToGuestId) => {
                    const supabase = createClient();

                    try {
                        // A household primary with dependents can never be deleted
                        // directly — not even with a transfer target, since the
                        // transfer would orphan the dependents or hand them to an
                        // unrelated guest. Staff must delete the dependents first.
                        const dependents = get().getDependentsForPrimary(guestId);
                        if (dependents.length > 0) {
                            const primary = get().guests.find((g) => g.id === guestId);
                            toast.error(primaryHasDependentsMessage(displayNameOf(primary), dependents.map(displayNameOf)));
                            return false;
                        }
                        // If a transfer target is provided, transfer records first
                        if (transferToGuestId) {
                            const transferSuccess = await get().transferGuestRecords(guestId, transferToGuestId);
                            if (!transferSuccess) {
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
                            toast.error(`Could not delete guest: ${error.message || 'The database rejected the deletion'}`);
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
                        const byMembership = guestFamilies.find((f) => f.id === membership.familyId);
                        if (byMembership) return byMembership;
                        // Stale member row pointing at a deleted household: fall
                        // through to the primary lookup instead of returning null.
                    }
                    return guestFamilies.find((f) => f.primaryGuestId === guestId) || null;
                },

                getFamilyMembers: (familyId) => {
                    const { guests, guestFamilies, guestFamilyMembers } = get();
                    const memberIds = new Set(
                        guestFamilyMembers
                            .filter((m) => m.familyId === familyId)
                            .map((m) => m.guestId)
                    );
                    // The primary is always part of the household, even when its
                    // member row is missing (older data, failed writes).
                    const family = guestFamilies.find((f) => f.id === familyId);
                    if (family?.primaryGuestId) memberIds.add(family.primaryGuestId);
                    return guests.filter((g) => g && memberIds.has(g.id));
                },

                getEnrolledFamilies: () => {
                    return get().guestFamilies.filter((f) => f.enrolledInFamilyMeal);
                },

                getFamilyMemberCount: (familyId) => {
                    const { guestFamilies, guestFamilyMembers } = get();
                    const memberIds = new Set(
                        guestFamilyMembers.filter((m) => m.familyId === familyId).map((m) => m.guestId)
                    );
                    const family = guestFamilies.find((f) => f.id === familyId);
                    if (family?.primaryGuestId) memberIds.add(family.primaryGuestId);
                    return memberIds.size;
                },

                getFamilyRole: (guestId) => {
                    const { guestFamilies, guestFamilyMembers } = get();
                    if (guestFamilies.some((f) => f.primaryGuestId === guestId)) return 'primary';
                    if (guestFamilyMembers.some((m) => m.guestId === guestId)) return 'member';
                    return null;
                },

                getDependentsForPrimary: (primaryGuestId) => {
                    const { guests, guestFamilies, guestFamilyMembers } = get();
                    const family = guestFamilies.find((f) => f.primaryGuestId === primaryGuestId);
                    if (!family) return [];
                    const memberIds = new Set(
                        guestFamilyMembers
                            .filter((m) => m.familyId === family.id && m.guestId !== primaryGuestId)
                            .map((m) => m.guestId)
                    );
                    return guests.filter((g) => g && memberIds.has(g.id));
                },

                isPrimaryWithDependents: (guestId) => {
                    return get().getDependentsForPrimary(guestId).length > 0;
                },

                getFamilyDetail: (familyId) => {
                    const { guests, guestFamilies } = get();
                    const family = guestFamilies.find((f) => f.id === familyId);
                    if (!family) return null;
                    const members = get().getFamilyMembers(familyId);
                    const primaryGuest = guests.find((g) => g.id === family.primaryGuestId);
                    return {
                        family,
                        primaryGuest,
                        members,
                        memberCount: members.length > 0 ? members.length : 1,
                        dependentCount: members.filter((m) => m.id !== family.primaryGuestId).length,
                    };
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

                    // A guest can only head one household and cannot head one
                    // while living as a dependent in another.
                    const strayMembership = get().guestFamilyMembers.find((m) => m.guestId === primaryGuestId);
                    if (strayMembership) {
                        const hostFamily = get().guestFamilies.find((f) => f.id === strayMembership.familyId);
                        const hostPrimary = hostFamily ? get().guests.find((g) => g.id === hostFamily.primaryGuestId) : undefined;
                        throw new Error(
                            `${displayNameOf(get().guests.find((g) => g.id === primaryGuestId))} is already a member of ${displayNameOf(hostPrimary)}'s household. Remove them from that household first.`,
                        );
                    }

                    const supabase = createClient();
                    const { data, error } = await supabase
                        .from('guest_families')
                        .insert({ primary_guest_id: primaryGuestId, enrolled_in_family_meal: enrolled })
                        .select()
                        .single();

                    if (error) {
                        // Another device may have created the household first:
                        // recover by loading the winner instead of failing.
                        if ((error as any)?.code === '23505') {
                            const { data: winner } = await supabase
                                .from('guest_families')
                                .select()
                                .eq('primary_guest_id', primaryGuestId)
                                .maybeSingle();
                            if (winner) {
                                const mappedWinner = mapGuestFamilyRow(winner);
                                set((state) => {
                                    if (!state.guestFamilies.some((f) => f.id === (mappedWinner as any).id)) {
                                        state.guestFamilies.push(mappedWinner as any);
                                    }
                                });
                                if (!get().guestFamilyMembers.some((m) => m.familyId === (mappedWinner as any).id && m.guestId === primaryGuestId)) {
                                    try {
                                        await get().addGuestToFamily((mappedWinner as any).id, primaryGuestId);
                                    } catch {
                                        // Member row will be repaired on next load; household itself exists.
                                    }
                                }
                                return get().guestFamilies.find((f) => f.id === (mappedWinner as any).id) || (mappedWinner as any);
                            }
                        }
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
                    const { guestFamilies, guests } = get();
                    const targetFamily = guestFamilies.find((f) => f.id === familyId);
                    if (!targetFamily) {
                        throw new Error('The selected household no longer exists. Please choose another household.');
                    }
                    const guest = guests.find((g) => g.id === guestId);
                    if (!guest) {
                        throw new Error('Guest not found. Please reload and try again.');
                    }

                    const currentMembership = get().guestFamilyMembers.find((m) => m.guestId === guestId);
                    if (currentMembership?.familyId === familyId) {
                        const same = get().guestFamilyMembers.find((m) => m.familyId === familyId && m.guestId === guestId);
                        if (same) return same;
                    }

                    // Moving a household primary would strand its dependents and
                    // drop its meal history, so refuse with actionable guidance.
                    const oldPrimaryFamily = guestFamilies.find((f) => f.primaryGuestId === guestId && f.id !== familyId);
                    if (oldPrimaryFamily) {
                        const dependents = get().getDependentsForPrimary(guestId);
                        if (dependents.length > 0) {
                            throw new Error(primaryHasDependentsMessage(displayNameOf(guest), dependents.map(displayNameOf)));
                        }
                        const supabaseForHistory = createClient();
                        let historyCount = 0;
                        try {
                            const { count } = await supabaseForHistory
                                .from('family_meal_distributions')
                                .select('id', { count: 'exact', head: true })
                                .eq('family_id', oldPrimaryFamily.id);
                            historyCount = count || 0;
                        } catch (error) {
                            console.error('Failed to check household meal history:', error);
                        }
                        if (historyCount > 0) {
                            throw new Error(
                                `${displayNameOf(guest)} heads a household with recorded family meals. Transfer or resolve that meal history before moving them to another household.`,
                            );
                        }
                        await get().removeGuestFromFamily(guestId);
                    }

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

                removeGuestFromFamily: async (guestId) => {
                    const { guestFamilies, guestFamilyMembers, guests } = get();
                    const supabase = createClient();

                    const primaryFamily = guestFamilies.find((f) => f.primaryGuestId === guestId);
                    if (primaryFamily) {
                        // Deleting the household row cascades to every member and
                        // all of its meal history, so a primary with dependents is
                        // never removed implicitly — staff delete dependents first.
                        const dependents = get().getDependentsForPrimary(guestId);
                        if (dependents.length > 0) {
                            throw new Error(primaryHasDependentsMessage(
                                displayNameOf(guests.find((g) => g.id === guestId)),
                                dependents.map(displayNameOf),
                            ));
                        }
                        // A single-member household with recorded meals is
                        // unenrolled instead of deleted so history survives.
                        try {
                            const { count } = await supabase
                                .from('family_meal_distributions')
                                .select('id', { count: 'exact', head: true })
                                .eq('family_id', primaryFamily.id);
                            if ((count || 0) > 0) {
                                await get().setFamilyEnrollment(primaryFamily.id, false);
                                return true;
                            }
                        } catch (error) {
                            console.error('Failed to check household meal history:', error);
                        }
                        const { error } = await supabase
                            .from('guest_families')
                            .delete()
                            .eq('id', primaryFamily.id);

                        if (error) {
                            console.error('Failed to remove guest family from Supabase:', error);
                            throw new Error('Unable to remove family.');
                        }

                        set((state) => {
                            state.guestFamilies = state.guestFamilies.filter((f) => f.id !== primaryFamily.id);
                            state.guestFamilyMembers = state.guestFamilyMembers.filter((m) => m.familyId !== primaryFamily.id);
                        });
                        return true;
                    }

                    const membership = guestFamilyMembers.find((m) => m.guestId === guestId);
                    if (membership) {
                        const { error } = await supabase
                            .from('guest_family_members')
                            .delete()
                            .eq('guest_id', guestId);

                        if (error) {
                            console.error('Failed to remove family member from Supabase:', error);
                            throw new Error('Unable to remove family member.');
                        }

                        set((state) => {
                            state.guestFamilyMembers = state.guestFamilyMembers.filter((m) => m.guestId !== guestId);
                        });
                        return true;
                    }

                    return true;
                },

                countHouseholdMeals: async (familyId) => {
                    const supabase = createClient();
                    try {
                        const { count } = await supabase
                            .from('family_meal_distributions')
                            .select('id', { count: 'exact', head: true })
                            .eq('family_id', familyId);
                        return count || 0;
                    } catch (error) {
                        console.error('Failed to count household meals:', error);
                        return 0;
                    }
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
                    // The update only flips the enrollment flag, so reconcile
                    // against current state: a surprising echo must never drop
                    // the household's primary or rewrite its enrollment.
                    const current = get().guestFamilies.find((f) => f.id === familyId);
                    const reconciled = {
                        ...(mapped as any),
                        id: familyId,
                        primaryGuestId: (mapped as any)?.primaryGuestId || current?.primaryGuestId,
                        enrolledInFamilyMeal: enrolled,
                        createdAt: (mapped as any)?.createdAt || current?.createdAt,
                        updatedAt: (mapped as any)?.updatedAt || current?.updatedAt,
                    };
                    set((state) => {
                        const idx = state.guestFamilies.findIndex((f) => f.id === familyId);
                        if (idx === -1) state.guestFamilies.push(reconciled);
                        else state.guestFamilies[idx] = reconciled;
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
