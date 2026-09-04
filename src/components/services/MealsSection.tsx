'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
    Utensils,
    Users,
    History,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    Filter,
    User,
    Heart,
    Truck,
    Home,
    Package,
    Building2,
    HandHeart,
    Handshake,
    Trash2,
    Search,
    CheckSquare,
    Square,
    Pencil,
    Zap,
} from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { todayPacificDateString, pacificDateStringFrom, formatTimeInPacific, parsePacificDateParts } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { MealServiceTimer } from '@/components/checkin/MealServiceTimer';
import { MAX_BASE_MEALS_PER_DAY } from '@/lib/constants/constants';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { HandshakeIcon } from '@/components/icons/HandshakeIcon';
import { ServiceDayNote } from './ServiceDayNote';
import type React from 'react';

// Meal category configurations
const MEAL_CATEGORIES = [
    { id: 'extra', label: 'Extra Meals', icon: Plus, color: 'orange', description: 'Surplus meals not tied to a guest' },
    { id: 'rv', label: 'RV Meals', icon: Truck, color: 'purple', description: 'RV deliveries' },
    { id: 'day_worker', label: 'Day Worker', icon: Building2, color: 'blue', description: 'Day worker center' },
    { id: 'shelter', label: 'Shelter', icon: Home, color: 'amber', description: 'Shelter meals' },
    { id: 'lunch_bag', label: 'Lunch Bags', icon: Package, color: 'emerald', description: 'To-go lunch bags' },
    { id: 'united_effort', label: 'United Effort', icon: HandHeart, color: 'rose', description: 'Partner organization' },
];

const getGuestDisplayName = (guest: any) => {
    if (!guest) return 'Unknown Guest';
    return guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
};

export function MealsSection() {
    const [selectedDate, setSelectedDate] = useState(todayPacificDateString());
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [addingType, setAddingType] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [individualGuestId, setIndividualGuestId] = useState('');
    const [individualMealCount, setIndividualMealCount] = useState(1);
    const [isPendingIndividual, setIsPendingIndividual] = useState(false);
    const [activityFilter, setActivityFilter] = useState<string>('all');
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isSavingAutoMealAdditions, setIsSavingAutoMealAdditions] = useState(false);

    // Multi-guest bulk add state
    const [bulkGuestSearch, setBulkGuestSearch] = useState('');
    const [bulkGuestMealFilter, setBulkGuestMealFilter] = useState<'all' | 'has_meal' | 'can_add_more'>('all');
    const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
    const [bulkGuestMealCount, setBulkGuestMealCount] = useState(1);
    const [isBulkAddingGuests, setIsBulkAddingGuests] = useState(false);

    const [familySearch, setFamilySearch] = useState('');
    const [showUnenrolledFamilies, setShowUnenrolledFamilies] = useState(false);
    const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(new Set());
    const [familyMealCounts, setFamilyMealCounts] = useState<Record<string, number>>({});
    const [isAddingFamilyMeals, setIsAddingFamilyMeals] = useState(false);

    const {
        mealRecords,
        rvMealRecords,
        extraMealRecords,
        dayWorkerMealRecords,
        shelterMealRecords,
        unitedEffortMealRecords,
        lunchBagRecords,
        familyMealRecords,
        deleteMealRecord,
        deleteExtraMealRecord,
        addBulkMealRecord,
        deleteBulkMealRecord,
        updateBulkMealRecord,
        updateMealRecord,
        addFamilyMealRecord,
        updateFamilyMealRecord,
        deleteFamilyMealRecord,
        checkAndAddAutomaticMeals,
        addMealRecord,
        mealsDataIsLoaded,
    } = useMealsStore(useShallow((s) => ({
        mealsDataIsLoaded: s.isLoaded,
        mealRecords: s.mealRecords,
        rvMealRecords: s.rvMealRecords,
        extraMealRecords: s.extraMealRecords,
        dayWorkerMealRecords: s.dayWorkerMealRecords,
        shelterMealRecords: s.shelterMealRecords,
        unitedEffortMealRecords: s.unitedEffortMealRecords,
        lunchBagRecords: s.lunchBagRecords,
        familyMealRecords: s.familyMealRecords || [],
        deleteMealRecord: s.deleteMealRecord,
        deleteExtraMealRecord: s.deleteExtraMealRecord,
        addBulkMealRecord: s.addBulkMealRecord,
        deleteBulkMealRecord: s.deleteBulkMealRecord,
        updateBulkMealRecord: s.updateBulkMealRecord,
        updateMealRecord: s.updateMealRecord,
        addFamilyMealRecord: s.addFamilyMealRecord,
        updateFamilyMealRecord: s.updateFamilyMealRecord,
        deleteFamilyMealRecord: s.deleteFamilyMealRecord,
        checkAndAddAutomaticMeals: s.checkAndAddAutomaticMeals,
        addMealRecord: s.addMealRecord,
    })));

    const {
        autoMealAdditionsEnabled,
        updateAutoMealAdditionsEnabled,
        loadSettings,
    } = useSettingsStore(useShallow((s) => ({
        autoMealAdditionsEnabled: s.autoMealAdditionsEnabled,
        updateAutoMealAdditionsEnabled: s.updateAutoMealAdditionsEnabled,
        loadSettings: s.loadSettings,
    })));

    const { guests, guestFamilies, guestFamilyMembers } = useGuestsStore(useShallow((s) => ({
        guests: s.guests,
        guestFamilies: s.guestFamilies,
        guestFamilyMembers: s.guestFamilyMembers,
    })));

    useEffect(() => {
        const initializeMealAutomation = async () => {
            await loadSettings();
            await checkAndAddAutomaticMeals();
        };

        void initializeMealAutomation();
    }, [loadSettings, checkAndAddAutomaticMeals]);

    const handleToggleAutoMealAdditions = async () => {
        const nextValue = !autoMealAdditionsEnabled;
        setIsSavingAutoMealAdditions(true);

        try {
            await updateAutoMealAdditionsEnabled(nextValue);
            if (nextValue) {
                await checkAndAddAutomaticMeals();
            }
            toast.success(nextValue ? 'Automatic RV, lunch bag, and day worker additions resumed' : 'Automatic RV, lunch bag, and day worker additions paused');
        } catch (error) {
            console.error('Failed to update meal automation setting:', error);
            toast.error('Failed to update meal automation setting');
        } finally {
            setIsSavingAutoMealAdditions(false);
        }
    };

    const guestMap = useMemo(() => {
        const map = new Map<string, (typeof guests)[number]>();
        for (const g of guests) {
            if (g?.id) map.set(g.id, g);
        }
        return map;
    }, [guests]);

    const familyMembersByFamilyId = useMemo(() => {
        const map = new Map<string, typeof guestFamilyMembers>();
        for (const member of guestFamilyMembers || []) {
            if (!member?.familyId) continue;
            const list = map.get(member.familyId) || [];
            map.set(member.familyId, [...list, member]);
        }
        return map;
    }, [guestFamilyMembers]);

    const isToday = selectedDate === todayPacificDateString();

    const familyMealRecordByFamilyId = useMemo(() => {
        const map = new Map<string, any>();
        for (const record of familyMealRecords || []) {
            if ((record?.dateKey || pacificDateStringFrom(record.date)) === selectedDate) {
                map.set(record.familyId, record);
            }
        }
        return map;
    }, [familyMealRecords, selectedDate]);

    const familyRows = useMemo(() => {
        const query = familySearch.trim().toLowerCase();
        return (guestFamilies || [])
            .filter((family) => showUnenrolledFamilies || family.enrolledInFamilyMeal)
            .map((family) => {
                const memberships = familyMembersByFamilyId.get(family.id) || [];
                const memberGuests = memberships
                    .map((member) => guestMap.get(member.guestId))
                    .filter(Boolean) as (typeof guests)[number][];
                const primaryGuest = guestMap.get(family.primaryGuestId) || memberGuests[0];
                const memberNames = memberGuests.map(getGuestDisplayName);
                const searchableText = [
                    getGuestDisplayName(primaryGuest),
                    ...memberNames,
                ].join(' ').toLowerCase();
                return {
                    family,
                    primaryGuest,
                    memberGuests,
                    memberCount: Math.max(1, memberships.length),
                    memberNames,
                    existingRecord: familyMealRecordByFamilyId.get(family.id),
                    searchableText,
                };
            })
            .filter((row) => !query || row.searchableText.includes(query))
            .sort((a, b) => getGuestDisplayName(a.primaryGuest).localeCompare(getGuestDisplayName(b.primaryGuest)));
    }, [familySearch, showUnenrolledFamilies, guestFamilies, familyMembersByFamilyId, guestMap, guests, familyMealRecordByFamilyId]);

    // RV meals are not distributed on Wednesdays
    const isWednesdayDate = parsePacificDateParts(selectedDate)?.dayOfWeek === 3;

    // Set of guest IDs that already have a guest meal record on the selected date
    const guestsWithMealOnDateSet = useMemo(() => {
        const set = new Set<string>();
        mealRecords
            .filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate)
            .forEach((r) => { if (r.guestId) set.add(r.guestId); });
        return set;
    }, [mealRecords, selectedDate]);

    // Map of guest ID → total meal count on the selected date (for display in multi-guest list)
    const guestMealCountOnDate = useMemo(() => {
        const map = new Map<string, number>();
        mealRecords
            .filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate)
            .forEach((r) => {
                if (r.guestId) {
                    map.set(r.guestId, (map.get(r.guestId) || 0) + (r.count || 1));
                }
            });
        return map;
    }, [mealRecords, selectedDate]);

    // Filtered + sorted guest list for the multi-guest bulk add panel.
    // Base is scoped to guests who have a meal record on the selected date so staff
    // only see guests relevant to that service day.
    const filteredBulkGuests = useMemo(() => {
        // Start from guests who are present on the selected date (have a guest meal record).
        const guestsById = new Map<string, (typeof guests)[number]>();
        for (const g of guests) {
            if (g?.id) guestsById.set(g.id, g);
        }

        let list = [...guestsWithMealOnDateSet]
            .map((id) => guestsById.get(id))
            .filter((g): g is (typeof guests)[number] => !!g && !g.bannedFromMeals);

        if (bulkGuestMealFilter === 'has_meal') {
            list = list.filter((g) => guestsWithMealOnDateSet.has(g.id));
        } else if (bulkGuestMealFilter === 'can_add_more') {
            list = list.filter((g) => (guestMealCountOnDate.get(g.id) || 0) < MAX_BASE_MEALS_PER_DAY);
        }

        if (bulkGuestSearch.trim()) {
            const query = bulkGuestSearch.toLowerCase();
            list = list.filter((g) => {
                const name = (g.preferredName || g.name || `${g.firstName || ''} ${g.lastName || ''}`).toLowerCase();
                return name.includes(query);
            });
        }

        return [...list].sort((a, b) => {
            const aName = (a.preferredName || a.name || `${a.firstName || ''} ${a.lastName || ''}`).toLowerCase();
            const bName = (b.preferredName || b.name || `${b.firstName || ''} ${b.lastName || ''}`).toLowerCase();
            return aName.localeCompare(bName);
        });
    }, [guests, bulkGuestSearch, bulkGuestMealFilter, guestsWithMealOnDateSet]);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);

    const dayMetrics = useMemo(() => {
        const filterByDate = (records: any[]) =>
            records.filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate);
        // ... same existing logic ...
        const guestMeals = filterByDate(mealRecords);
        const rvMeals = filterByDate(rvMealRecords);
        const extraMeals = filterByDate(extraMealRecords);
        const dayWorkerMeals = filterByDate(dayWorkerMealRecords);
        const shelterMeals = filterByDate(shelterMealRecords);
        const ueMeals = filterByDate(unitedEffortMealRecords);
        const lunchBags = filterByDate(lunchBagRecords);
        const familyMeals = filterByDate(familyMealRecords);

        const sumCount = (arr: any[]) => arr.reduce((sum, r) => sum + (r.count || 0), 0);

const proxyPickerIds = new Set<string>();
        let proxyPickupCount = 0;
        guestMeals.forEach((r) => {
            if (r?.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId) {
                proxyPickerIds.add(r.pickedUpByGuestId);
                proxyPickupCount += r.count || 0;
            }
        });
        const proxyPickerSelfMeals = guestMeals.reduce((sum, r) => {
            if (r && proxyPickerIds.has(r.guestId)) return sum + (r.count || 0);
            return sum;
        }, 0);
        const guestCount = sumCount(guestMeals);
        const proxyPickupPercent = guestCount > 0 ? Math.round((proxyPickupCount / guestCount) * 100) : 0;

        return {
            total: sumCount([...guestMeals, ...rvMeals, ...extraMeals, ...dayWorkerMeals, ...shelterMeals, ...ueMeals, ...familyMeals]),
            guestCount,
            familyCount: sumCount(familyMeals),
            familyHouseholds: familyMeals.length,
            rvCount: sumCount(rvMeals),
            dayWorkerCount: sumCount(dayWorkerMeals),
            shelterCount: sumCount(shelterMeals),
            ueCount: sumCount(ueMeals),
            lunchBagCount: sumCount(lunchBags),
            extraCount: sumCount(extraMeals),
            proxyPickups: proxyPickupCount,
            proxyPickupPercent,
            directGuestMeals: guestCount - proxyPickupCount,
            uniqueGuests: new Set(guestMeals.map(r => r.guestId)).size,
            proxyPickerCount: proxyPickerIds.size,
            proxyPickerSelfMeals,
        };
    }, [selectedDate, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, familyMealRecords]);

    const history = useMemo(() => {
        const allRecords = [
            ...mealRecords.map(r => ({
                ...r,
                type: 'guest',
                isProxyPickup: Boolean(r?.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId),
            })),
            ...rvMealRecords.map(r => ({ ...r, type: 'rv', isProxyPickup: false })),
            ...extraMealRecords.map(r => ({ ...r, type: 'extra', isProxyPickup: false })),
            ...dayWorkerMealRecords.map(r => ({ ...r, type: 'day_worker', isProxyPickup: false })),
            ...shelterMealRecords.map(r => ({ ...r, type: 'shelter', isProxyPickup: false })),
            ...unitedEffortMealRecords.map(r => ({ ...r, type: 'united_effort', isProxyPickup: false })),
            ...lunchBagRecords.map(r => ({ ...r, type: 'lunch_bag', isProxyPickup: false })),
            ...familyMealRecords.map(r => ({ ...r, type: 'family', isProxyPickup: false })),
        ];
        return allRecords
            .filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate)
            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    }, [selectedDate, mealRecords, rvMealRecords, extraMealRecords, dayWorkerMealRecords, shelterMealRecords, unitedEffortMealRecords, lunchBagRecords, familyMealRecords]);

    const filteredHistory = useMemo(() => {
        if (activityFilter === 'all') return history;
        return history.filter((r) => r.type === activityFilter);
    }, [history, activityFilter]);

    const guestNameById = (id?: string | null) => {
        if (!id) return null;
        const guest = guestMap.get(id);
        if (!guest) return null;
        return guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || null;
    };

    // Per-bag assignment detail for the selected date: who each lunch bag was
    // assigned to (auto-added bags carry the guest) and when.
    const lunchBagDetail = useMemo(() => {
        const bags = lunchBagRecords
            .filter((r) => (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate)
            .map((r) => ({
                id: r.id,
                count: r.count || 1,
                guestName: r.guestId ? guestNameById(r.guestId) : null,
                assignedAt: r.recordedAt || r.createdAt || null,
            }))
            .sort((a, b) => new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime());
        const assignedBags = bags.filter((b) => b.guestName);
        const bulkBags = bags.filter((b) => !b.guestName);
        return {
            bags,
            assignedCount: assignedBags.reduce((sum, b) => sum + b.count, 0),
            bulkCount: bulkBags.reduce((sum, b) => sum + b.count, 0),
        };
         
    }, [lunchBagRecords, selectedDate, guestMap]);

    // Who picked up meals for whom on the selected date, with times.
    const proxyPickupDetail = useMemo(() => {
        return mealRecords
            .filter((r) =>
                (r?.dateKey || pacificDateStringFrom(r.date)) === selectedDate
                && r.pickedUpByGuestId && r.pickedUpByGuestId !== r.guestId
            )
            .map((r) => ({
                id: r.id,
                count: r.count || 1,
                recipient: guestNameById(r.guestId) || 'Guest',
                picker: guestNameById(r.pickedUpByGuestId) || 'Buddy',
                pickedUpAt: r.recordedAt || r.createdAt || null,
            }))
            .sort((a, b) => new Date(b.pickedUpAt || 0).getTime() - new Date(a.pickedUpAt || 0).getTime());
         
    }, [mealRecords, selectedDate, guestMap]);

    // Composition of the day's served meals, rendered as lightweight CSS bars
    // (no chart library on this hot path).
    const serviceMix = useMemo(() => {
        const items: { label: string; value: number; icon: IconComponentType; iconClass: string; barClass: string }[] = [
            { label: 'Guest', value: dayMetrics.guestCount, icon: Users, iconClass: 'bg-blue-50 text-blue-600', barClass: 'bg-blue-500' },
            { label: 'Extra', value: dayMetrics.extraCount, icon: Plus, iconClass: 'bg-orange-50 text-orange-600', barClass: 'bg-orange-500' },
            { label: 'RV', value: dayMetrics.rvCount, icon: Truck, iconClass: 'bg-purple-50 text-purple-600', barClass: 'bg-purple-500' },
            { label: 'Day Worker', value: dayMetrics.dayWorkerCount, icon: Building2, iconClass: 'bg-sky-50 text-sky-600', barClass: 'bg-sky-500' },
            { label: 'Shelter', value: dayMetrics.shelterCount, icon: Home, iconClass: 'bg-amber-50 text-amber-600', barClass: 'bg-amber-500' },
            { label: 'United Effort', value: dayMetrics.ueCount, icon: HandHeart, iconClass: 'bg-rose-50 text-rose-600', barClass: 'bg-rose-500' },
            { label: 'Family', value: dayMetrics.familyCount, icon: Heart, iconClass: 'bg-teal-50 text-teal-600', barClass: 'bg-teal-500' },
        ];
        const max = Math.max(1, ...items.map((i) => i.value));
        return { items, max };
    }, [dayMetrics]);

    const handleBatchDeleteLunchBags = async () => {
        const lunchBagItems = history.filter((r) => r.type === 'lunch_bag');
        if (lunchBagItems.length === 0) {
            toast.error('No lunch bag records to delete');
            return;
        }
        if (!confirm(`Delete all ${lunchBagItems.length} lunch bag record${lunchBagItems.length > 1 ? 's' : ''} for this date?`)) return;

        setIsBatchDeleting(true);
        try {
            await Promise.all(lunchBagItems.map((r) => deleteBulkMealRecord(r.id, 'lunch_bag')));
            toast.success(`Deleted ${lunchBagItems.length} lunch bag record${lunchBagItems.length > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Failed to batch delete lunch bags:', error);
            toast.error('Failed to delete some lunch bag records');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        setEditValue(record.type === 'family' ? (record.mealsPerMember || 1) : (record.count || 0));
    };

    const handleSaveEdit = async (record: any) => {
        if (!editingId) return;

        try {
            const type = record.type;
            if (type === 'family') {
                await updateFamilyMealRecord(editingId, {
                    mealsPerMember: Math.max(1, editValue),
                    memberCountSnapshot: record.memberCountSnapshot || 1,
                });
            } else if (['rv', 'day_worker', 'shelter', 'lunch_bag', 'united_effort', 'extra'].includes(type)) {
                await updateBulkMealRecord(editingId, type, { count: editValue });
            } else {
                await updateMealRecord(editingId, { count: editValue });
            }
            toast.success('Record updated');
            setEditingId(null);
        } catch (error) {
            console.error('Failed to update record:', error);
            toast.error('Failed to update record');
        }
    };

    // ... handleDelete, handleAddBulkMeal, shiftDate, getDisplayName ...
    const handleDelete = async (record: any) => {
        if (!confirm('Are you sure you want to delete this meal record?')) return;

        try {
            const type = record.type;
            if (type === 'family') {
                await deleteFamilyMealRecord(record.id);
            } else if (type === 'rv' || type === 'day_worker' || type === 'shelter' || type === 'lunch_bag' || type === 'united_effort') {
                await deleteBulkMealRecord(record.id, type);
            } else if (type === 'extra') {
                await deleteExtraMealRecord(record.id);
            } else {
                await deleteMealRecord(record.id);
            }
            toast.success('Meal record deleted');
        } catch (error) {
            console.error('Failed to delete record:', error);
            toast.error('Failed to delete record');
        }
    };

    const handleAddFamilyMeals = async () => {
        if (selectedFamilyIds.size === 0) {
            toast.error('Please select at least one family');
            return;
        }

        const selectedRows = familyRows.filter((row) => selectedFamilyIds.has(row.family.id));
        if (selectedRows.length === 0) {
            toast.error('No visible selected families');
            return;
        }

        setIsAddingFamilyMeals(true);
        const results = await Promise.allSettled(
            selectedRows.map((row) => {
                const mealsPerMember = Math.max(1, familyMealCounts[row.family.id] ?? row.existingRecord?.mealsPerMember ?? 1);
                return addFamilyMealRecord(row.family.id, mealsPerMember, row.memberCount, selectedDate);
            })
        );
        setIsAddingFamilyMeals(false);

        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failCount = results.length - successCount;
        if (successCount > 0) {
            toast.success(`Saved family meal${successCount > 1 ? 's' : ''} for ${successCount} household${successCount > 1 ? 's' : ''}`);
            setSelectedFamilyIds(new Set());
        }
        if (failCount > 0) {
            toast.error(`${failCount} family meal record${failCount > 1 ? 's' : ''} failed to save`);
        }
    };

    const handleAddBulkMeal = async (mealType: string) => {
        const quantity = quantities[mealType] || 0;
        if (quantity <= 0) {
            toast.error('Please enter a quantity greater than 0');
            return;
        }

        setAddingType(mealType);
        try {
            const category = MEAL_CATEGORIES.find(c => c.id === mealType);
            await addBulkMealRecord(mealType, quantity, category?.label, undefined, selectedDate);
            toast.success(`Added ${quantity} ${category?.label || mealType}${!isToday ? ` for ${selectedDate}` : ''}`);
            setQuantities(prev => ({ ...prev, [mealType]: 0 }));
        } catch (error) {
            console.error('Failed to add meal record:', error);
            toast.error('Failed to add meal record');
        } finally {
            setAddingType(null);
        }
    };

    const handleAddIndividualMeal = async () => {
        if (!individualGuestId) {
            toast.error('Please select a guest');
            return;
        }

        if (individualMealCount <= 0) {
            toast.error('Meal count must be at least 1');
            return;
        }

        // Client-side pre-check: skip the Supabase call if the guest is already at the limit
        const currentCount = guestMealCountOnDate.get(individualGuestId) || 0;
        if (currentCount + individualMealCount > MAX_BASE_MEALS_PER_DAY) {
            toast.error(`Guest already has ${currentCount} base meal${currentCount !== 1 ? 's' : ''} today (max ${MAX_BASE_MEALS_PER_DAY})`);
            return;
        }

        setIsPendingIndividual(true);
        try {
            await addMealRecord(individualGuestId, individualMealCount, null, selectedDate);
            toast.success(`Added meal record${!isToday ? ` for ${selectedDate}` : ''}`);
            setIndividualGuestId('');
            setIndividualMealCount(1);
        } catch (error) {
            console.error('Failed to add individual meal:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add individual meal');
        } finally {
            setIsPendingIndividual(false);
        }
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + days);
        setSelectedDate(pacificDateStringFrom(d));
    };

    const handleBulkAddGuestMeals = async () => {
        if (selectedGuestIds.size === 0) {
            toast.error('Please select at least one guest');
            return;
        }

        // Pre-filter: skip guests already at the base meal limit
        const allSelected = [...selectedGuestIds];
        const eligible = allSelected.filter((guestId) => {
            const currentCount = guestMealCountOnDate.get(guestId) || 0;
            return currentCount + bulkGuestMealCount <= MAX_BASE_MEALS_PER_DAY;
        });
        const skippedCount = allSelected.length - eligible.length;

        if (eligible.length === 0) {
            toast.error(`All ${allSelected.length} selected guest${allSelected.length > 1 ? 's' : ''} already at the ${MAX_BASE_MEALS_PER_DAY} base meals/day limit`);
            return;
        }

        setIsBulkAddingGuests(true);

        // Process in small batches to avoid overwhelming Supabase with
        // hundreds of concurrent requests (each call may also trigger a
        // lunch-bag auto-add, doubling the request count).
        const BATCH_SIZE = 10;
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
            const batch = eligible.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map((guestId) =>
                    addMealRecord(guestId, bulkGuestMealCount, null, selectedDate)
                )
            );
            successCount += results.filter((r) => r.status === 'fulfilled').length;
            failCount += results.filter((r) => r.status === 'rejected').length;
        }

        setIsBulkAddingGuests(false);

        if (successCount > 0) {
            const parts: string[] = [];
            parts.push(`Added ${bulkGuestMealCount} meal${bulkGuestMealCount > 1 ? 's' : ''} to ${successCount} guest${successCount > 1 ? 's' : ''}${!isToday ? ` for ${selectedDate}` : ''}`);
            if (skippedCount > 0) {
                parts.push(`${skippedCount} already at ${MAX_BASE_MEALS_PER_DAY} base meals/day limit`);
            }
            toast.success(parts.join('. '));
            setSelectedGuestIds(new Set());
        }
        if (failCount > 0) {
            toast.error(`${failCount} guest${failCount > 1 ? 's' : ''} failed to update`);
        }
    };

    const getDisplayName = (record: any) => {
        const type = record.type;
        if (type === 'family') {
            const family = guestFamilies.find((item) => item.id === record.familyId);
            const primaryGuest = guestMap.get(record.primaryGuestId || family?.primaryGuestId || '');
            return `${getGuestDisplayName(primaryGuest)} Household`;
        }
        if (type === 'rv') return 'RV Meal Distribution';
        if (type === 'day_worker') return 'Day Worker Center';
        if (type === 'shelter') return 'Shelter Meals';
        if (type === 'lunch_bag') {
            const guest = record.guestId ? guestMap.get(record.guestId) : null;
            return guest ? `Lunch Bag · ${guest.preferredName || guest.firstName || guest.name}` : 'Lunch Bags';
        }
        if (type === 'united_effort') return 'United Effort';
        if (type === 'extra') {
            const guest = guestMap.get(record.guestId);
            return `${guest ? (guest.preferredName || guest.firstName) : 'Guest'} (Extra)`;
        }
        const guest = guestMap.get(record.guestId);
        return getGuestDisplayName(guest);
    };

    const getPickedUpByName = (record: any) => {
        const pickupId = record?.pickedUpByGuestId;
        if (!pickupId) return null;
        const pickupGuest = guestMap.get(pickupId);
        if (!pickupGuest) return 'Buddy';
        const preferred = pickupGuest.preferredName || pickupGuest.firstName;
        if (preferred) return preferred;
        return pickupGuest.name || 'Buddy';
    };

    // ... getRecordIcon, getRecordColor ...

    const getRecordIcon = (type: string) => {
        if (type === 'family') return Users;
        const category = MEAL_CATEGORIES.find(c => c.id === type);
        if (category) return category.icon;
        return User;
    };

    const getRecordColor = (type: string) => {
        const colorMap: Record<string, string> = {
            rv: 'bg-purple-100 text-purple-600',
            day_worker: 'bg-blue-100 text-blue-600',
            shelter: 'bg-amber-100 text-amber-600',
            lunch_bag: 'bg-emerald-100 text-emerald-600',
            united_effort: 'bg-rose-100 text-rose-600',
            family: 'bg-teal-100 text-teal-700',
            extra: 'bg-orange-100 text-orange-600',
            guest: 'bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600',
        };
        return colorMap[type] || colorMap.guest;
    };


    return (
        <div className="space-y-6">
            {/* Toolbar: title, date navigation, service timer, add button */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                        <Utensils size={22} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight truncate">Daily Meal Logs</h2>
                        <p className="text-xs text-gray-500 font-medium">Service Distribution Tracker</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Date navigation */}
                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
                        <button
                            onClick={() => shiftDate(-1)}
                            aria-label="Previous day"
                            className="p-2 rounded-lg hover:bg-white transition-all text-gray-500 hover:text-gray-900"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="text-center px-2 sm:px-3 min-w-[8rem]">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className={cn(
                                "text-[11px] font-bold mt-0.5",
                                isToday ? 'text-emerald-600' : 'text-gray-400'
                            )}>
                                {isToday ? 'Active Service Day' : 'Archived Records'}
                            </p>
                        </div>
                        <button
                            onClick={() => shiftDate(1)}
                            aria-label="Next day"
                            className="p-2 rounded-lg hover:bg-white transition-all text-gray-500 hover:text-gray-900"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    {!isToday && (
                        <button
                            onClick={() => setSelectedDate(todayPacificDateString())}
                            className="px-3 py-2 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                        >
                            Today
                        </button>
                    )}

                    {/* Meal Service Timer - subtle indicator for volunteers */}
                    <MealServiceTimer />

                    <button
                        onClick={() => setShowAddPanel(!showAddPanel)}
                        className={cn(
                            "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                            showAddPanel
                                ? "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm"
                        )}
                    >
                        {showAddPanel ? 'Close' : <><Plus size={14} /> Add Bulk Meals</>}
                    </button>
                </div>
            </div>

            <ServiceDayNote date={selectedDate} serviceType="meals" />

            {/* Meal Automation - slim one-line control */}
            <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        autoMealAdditionsEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    )}>
                        <Zap size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">Meal Automation</p>
                        <p className="text-xs text-gray-500">Automatic RV, lunch bag, and day worker additions. Turn off to pause auto-added lunch bags on guest meal entry.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                    <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider",
                        autoMealAdditionsEnabled ? 'text-emerald-700' : 'text-amber-700'
                    )}>
                        {isSavingAutoMealAdditions ? 'Saving' : autoMealAdditionsEnabled ? 'Enabled' : 'Paused'}
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={autoMealAdditionsEnabled}
                        aria-label="Automatic RV, lunch bag, and day worker additions"
                        disabled={isSavingAutoMealAdditions}
                        onClick={handleToggleAutoMealAdditions}
                        className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
                            isSavingAutoMealAdditions ? 'cursor-wait opacity-70' : 'cursor-pointer',
                            autoMealAdditionsEnabled ? 'bg-emerald-500' : 'bg-amber-400'
                        )}
                    >
                        <span
                            className={cn(
                                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                                autoMealAdditionsEnabled ? 'translate-x-5' : 'translate-x-0'
                            )}
                        />
                    </button>
                </div>
            </div>
            {/* Quick Add Panel */}
            <AnimatePresence>
                {/* ... Panel Content ... */}
                {showAddPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm space-y-5">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <Plus size={16} className="text-emerald-600" /> Quick Add Bulk Meals
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 -mt-3" title="All entries in this panel save to the date selected above.">
                                Entries save to selected date: {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                                <div className="space-y-5 min-w-0">
                                    {/* Individual Meal Entry */}
                                    <section className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                                            <User size={13} /> Individual Meal Entry
                                        </p>
                                        <p className="text-[11px] text-gray-400 mb-3">Log a meal for one guest. Max 2 base meals per guest per day.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_160px] gap-3">
                                            <select
                                                value={individualGuestId}
                                                onChange={(e) => setIndividualGuestId(e.target.value)}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                            >
                                                <option value="">Select guest</option>
                                                {guests
                                                    .filter((guest) => guest?.id)
                                                    .sort((firstGuest, secondGuest) => {
                                                        const firstName = (firstGuest.preferredName || firstGuest.name || `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`).toString();
                                                        const secondName = (secondGuest.preferredName || secondGuest.name || `${secondGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                                                        return firstName.localeCompare(secondName);
                                                    })
                                                    .map((guest) => {
                                                        const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
                                                        return (
                                                            <option key={guest.id} value={guest.id}>
                                                                {displayName}
                                                            </option>
                                                        );
                                                    })}
                                            </select>
                                            <input
                                                type="number"
                                                min={1}
                                                value={individualMealCount}
                                                onChange={(e) => setIndividualMealCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                                aria-label="Individual meal quantity"
                                            />
                                            <button
                                                onClick={handleAddIndividualMeal}
                                                disabled={!individualGuestId || isPendingIndividual}
                                                className={cn(
                                                    "w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                                                    !individualGuestId || isPendingIndividual
                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                                        : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                                                )}
                                            >
                                                {isPendingIndividual ? 'Adding...' : `Add${!isToday ? ` for ${selectedDate}` : ''}`}
                                            </button>
                                        </div>
                                    </section>

                                    {/* Multi-Guest Meal Entry */}
                                    <section className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                    <Users size={13} /> Multi-Guest Meal Entry
                                </p>

                                {/* Filter row */}
                                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search guests…"
                                            value={bulkGuestSearch}
                                            onChange={(e) => setBulkGuestSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                            aria-label="Search guests for bulk meal add"
                                        />
                                    </div>
                                    <select
                                        value={bulkGuestMealFilter}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'all' || value === 'has_meal' || value === 'can_add_more') {
                                                setBulkGuestMealFilter(value);
                                            }
                                            setSelectedGuestIds(new Set());
                                        }}
                                        className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                        aria-label="Filter by meal status"
                                    >
                                        <option value="all">All from This Date</option>
                                        <option value="can_add_more">Can Add More</option>
                                        <option value="has_meal">Has Meal</option>
                                    </select>
                                </div>

                                {/* Select all / deselect all */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wide">
                                        {filteredBulkGuests.length} guest{filteredBulkGuests.length !== 1 ? 's' : ''} shown
                                        {selectedGuestIds.size > 0 && ` · ${selectedGuestIds.size} selected`}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedGuestIds(new Set(filteredBulkGuests.map((g) => g.id)))}
                                            disabled={filteredBulkGuests.length === 0}
                                            className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                                            aria-label="Select all visible guests"
                                        >
                                            Select All
                                        </button>
                                        {selectedGuestIds.size > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedGuestIds(new Set())}
                                                className="text-[11px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
                                                aria-label="Deselect all guests"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Guest list */}
                                <div data-testid="multi-guest-list" className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 mb-3">
                                    {filteredBulkGuests.length === 0 ? (
                                        <p className="py-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No guests served on this date</p>
                                    ) : (
                                        filteredBulkGuests.map((guest) => {
                                            const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';
                                            const mealCount = guestMealCountOnDate.get(guest.id) || 0;
                                            const atLimit = mealCount >= MAX_BASE_MEALS_PER_DAY;
                                            const checked = selectedGuestIds.has(guest.id);
                                            return (
                                                <button
                                                    key={guest.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGuestIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(guest.id)) next.delete(guest.id);
                                                            else next.add(guest.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                                        checked ? "bg-emerald-50" : "hover:bg-gray-50"
                                                    )}
                                                    aria-pressed={checked}
                                                >
                                                    {checked
                                                        ? <CheckSquare size={16} className="shrink-0 text-emerald-600" />
                                                        : <Square size={16} className="shrink-0 text-gray-300" />
                                                    }
                                                    <span className="flex-1 text-sm font-medium text-gray-900 truncate">{displayName}</span>
                                                    {mealCount > 0 && (
                                                        <span className={cn(
                                                            "shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                            atLimit
                                                                ? "text-amber-600 bg-amber-50"
                                                                : "text-emerald-600 bg-emerald-50"
                                                        )}>
                                                            {mealCount} meal{mealCount !== 1 ? 's' : ''}{atLimit ? ' (limit)' : ''}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Quantity + submit row */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 shrink-0">Add meals</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={bulkGuestMealCount}
                                            onChange={(e) => setBulkGuestMealCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 p-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                            aria-label="Meals per guest"
                                        />
                                        <button
                                            onClick={handleBulkAddGuestMeals}
                                            disabled={selectedGuestIds.size === 0 || isBulkAddingGuests}
                                            className={cn(
                                                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                                selectedGuestIds.size > 0 && !isBulkAddingGuests
                                                    ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                            )}
                                        >
                                            {isBulkAddingGuests
                                                ? 'Adding…'
                                                : selectedGuestIds.size > 0
                                                    ? `Add ${bulkGuestMealCount} to ${selectedGuestIds.size} Guest${selectedGuestIds.size > 1 ? 's' : ''}`
                                                    : 'Select Guests Above'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">
                                        Adds {bulkGuestMealCount} additional meal{bulkGuestMealCount !== 1 ? 's' : ''} per guest (e.g. guest with 1 meal → {1 + bulkGuestMealCount} meals). Max 2 base meals per guest per day.
                                    </p>
                                </div>
                                </section>
                            </div>

                                {/* Family Meal Program */}
                                <section className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 min-w-0">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                            <Users size={13} /> Family Meal Program
                                        </p>
                                        <label className="inline-flex items-center gap-2 text-[11px] font-bold text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={showUnenrolledFamilies}
                                                onChange={(event) => setShowUnenrolledFamilies(event.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            Show unenrolled
                                        </label>
                                    </div>

                                    <div className="relative mb-3">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Search enrolled families..."
                                            value={familySearch}
                                            onChange={(event) => setFamilySearch(event.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                            aria-label="Search family meal program households"
                                        />
                                    </div>

                                    <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 mb-3">
                                    {familyRows.length === 0 ? (
                                        <p className="py-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {showUnenrolledFamilies ? 'No families found' : 'No enrolled families found'}
                                        </p>
                                    ) : (
                                        familyRows.map((row) => {
                                            const checked = selectedFamilyIds.has(row.family.id);
                                            const mealsPerMember = Math.max(1, familyMealCounts[row.family.id] ?? row.existingRecord?.mealsPerMember ?? 1);
                                            const totalMeals = mealsPerMember * row.memberCount;
                                            const memberPreview = row.memberNames.slice(0, 3).join(', ');
                                            return (
                                                <div
                                                    key={row.family.id}
                                                    className={cn(
                                                        "flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center",
                                                        checked ? "bg-emerald-50" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFamilyIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(row.family.id)) next.delete(row.family.id);
                                                                else next.add(row.family.id);
                                                                return next;
                                                            });
                                                        }}
                                                        className="flex flex-1 items-start gap-3 text-left"
                                                        aria-pressed={checked}
                                                    >
                                                        {checked
                                                            ? <CheckSquare size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                                                            : <Square size={16} className="mt-0.5 shrink-0 text-gray-300" />
                                                        }
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-black text-gray-900 truncate">{getGuestDisplayName(row.primaryGuest)} Household</span>
                                                            <span className="mt-0.5 block text-xs font-medium text-gray-500 truncate">
                                                                {row.memberCount} member{row.memberCount !== 1 ? 's' : ''}{memberPreview ? ` · ${memberPreview}` : ''}
                                                            </span>
                                                            {row.existingRecord && (
                                                                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                                    Existing: {row.existingRecord.count} meal{row.existingRecord.count !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                            {!row.family.enrolledInFamilyMeal && (
                                                                <span className="ml-2 mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                                    Unenrolled
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                    <div className="flex items-center gap-2 sm:w-56">
                                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Per Person</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={mealsPerMember}
                                                            onChange={(event) => {
                                                                const next = Math.max(1, parseInt(event.target.value) || 1);
                                                                setFamilyMealCounts((prev) => ({ ...prev, [row.family.id]: next }));
                                                            }}
                                                            className="w-16 rounded-xl border border-gray-200 bg-white p-2 text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                                                            aria-label={`Meals per member for ${getGuestDisplayName(row.primaryGuest)} household`}
                                                        />
                                                        <span className="text-xs font-bold text-emerald-700">{totalMeals} total</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleAddFamilyMeals}
                                        disabled={selectedFamilyIds.size === 0 || isAddingFamilyMeals}
                                        className={cn(
                                            "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                                            selectedFamilyIds.size > 0 && !isAddingFamilyMeals
                                                ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                        )}
                                    >
                                        {isAddingFamilyMeals
                                            ? 'Saving...'
                                            : selectedFamilyIds.size > 0
                                                ? `Save ${selectedFamilyIds.size} Family Meal${selectedFamilyIds.size > 1 ? 's' : ''}`
                                                : 'Select Families Above'}
                                    </button>
                                </section>
                            </div>

                            {/* Bulk Meal Entry - compact rows, scannable list */}
                            <section className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                                    <Package size={13} /> Bulk Meal Entry
                                </p>
                                <p className="text-[11px] text-gray-400 mb-3">Count-based entries not tied to a specific guest. RV is hidden on Wednesdays.</p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {MEAL_CATEGORIES.filter((category) => !(category.id === 'rv' && isWednesdayDate)).map((category) => {
                                    const Icon = category.icon;
                                    const qty = quantities[category.id] || 0;
                                    const isAdding = addingType === category.id;

                                    return (
                                        <div
                                            key={category.id}
                                            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={cn(
                                                    "p-2.5 rounded-xl shrink-0",
                                                    category.color === 'orange' && "bg-orange-100 text-orange-600",
                                                    category.color === 'purple' && "bg-purple-100 text-purple-600",
                                                    category.color === 'blue' && "bg-blue-100 text-blue-600",
                                                    category.color === 'amber' && "bg-amber-100 text-amber-600",
                                                    category.color === 'emerald' && "bg-emerald-100 text-emerald-600",
                                                    category.color === 'rose' && "bg-rose-100 text-rose-600",
                                                )}>
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-gray-900 text-sm truncate">{category.label}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{category.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:shrink-0">
                                                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                                                    <button
                                                        onClick={() => setQuantities(prev => ({ ...prev, [category.id]: Math.max(0, qty - 10) }))}
                                                        aria-label={`Decrease ${category.label} quantity by 10`}
                                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={qty || ''}
                                                        onChange={(e) => setQuantities(prev => ({ ...prev, [category.id]: parseInt(e.target.value) || 0 }))}
                                                        className="w-16 text-center font-bold text-base text-gray-900 bg-transparent focus:outline-none placeholder-gray-200"
                                                        placeholder="0"
                                                        min={0}
                                                        aria-label={`${category.label} quantity`}
                                                    />
                                                    <button
                                                        onClick={() => setQuantities(prev => ({ ...prev, [category.id]: qty + 10 }))}
                                                        aria-label={`Increase ${category.label} quantity by 10`}
                                                        className="p-2 rounded-lg hover:bg-white text-gray-400 hover:text-gray-900 transition-colors shrink-0"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleAddBulkMeal(category.id)}
                                                    disabled={qty <= 0 || isAdding}
                                                    className={cn(
                                                        "w-24 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0",
                                                        qty > 0
                                                            ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-95"
                                                            : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                                    )}
                                                >
                                                    {isAdding ? 'Adding...' : 'Add'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </section>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Service Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <StatCard label="Total Meals" value={dayMetrics.total} color="emerald" icon={Utensils} />
                    <StatCard label="Guests Served" value={dayMetrics.uniqueGuests} color="purple" icon={User} />
                    <StatCard label="Guest Meals" value={dayMetrics.guestCount} color="blue" icon={Users} />
                    <StatCard label="Family Meals" value={dayMetrics.familyCount} color="teal" icon={Heart} />
                    <StatCard label="Proxy Pickups" value={dayMetrics.proxyPickups} color="indigo" icon={HandshakeIcon} />
                    <StatCard label="Lunch Bags" value={dayMetrics.lunchBagCount} color="amber" icon={Package} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Proxy pickups: headline metrics plus who picked up for whom */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-col gap-3">
                            <div>
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" aria-hidden />
                                    Proxy Pickup Activity
                                </p>
                                {dayMetrics.proxyPickups > 0 ? (
                                    <>
                                        <p className="mt-1 text-xl font-bold tracking-tight text-indigo-700">
                                            {dayMetrics.proxyPickerCount.toLocaleString()} {dayMetrics.proxyPickerCount === 1 ? 'person' : 'people'} picked up {dayMetrics.proxyPickups.toLocaleString()} meal{dayMetrics.proxyPickups === 1 ? '' : 's'} for others
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-gray-500">
                                            {dayMetrics.proxyPickerSelfMeals.toLocaleString()} meal{dayMetrics.proxyPickerSelfMeals === 1 ? '' : 's'} also collected for themselves · {dayMetrics.proxyPickupPercent}% of guest meals.
                                        </p>
                                    </>
                                ) : mealsDataIsLoaded ? (
                                    <p className="mt-1 text-xl font-bold tracking-tight text-indigo-700">
                                        No proxy pickups logged for this date.
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xl font-bold tracking-tight text-gray-400 animate-pulse">
                                        Loading pickup activity…
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                                <CompactStat label="Proxy Pickers" value={dayMetrics.proxyPickerCount} color="indigo" icon={Users} />
                                <CompactStat label="Self Meals" value={dayMetrics.proxyPickerSelfMeals} color="blue" icon={User} />
                                <CompactStat label="Collective Pickups" value={dayMetrics.proxyPickups} color="emerald" icon={HandshakeIcon} />
                            </div>
                            {proxyPickupDetail.length > 0 && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50/60 divide-y divide-gray-100 max-h-56 overflow-y-auto">
                                    {proxyPickupDetail.map((pickup) => (
                                        <div key={pickup.id} className="flex items-center gap-3 px-3 py-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                                <Handshake size={14} aria-hidden />
                                            </span>
                                            <p className="min-w-0 flex-1 text-xs font-bold text-gray-700 truncate">
                                                <span className="text-indigo-700">{pickup.picker}</span>
                                                {' picked up '}
                                                {pickup.count} meal{pickup.count !== 1 ? 's' : ''}
                                                {' for '}
                                                <span className="text-indigo-700">{pickup.recipient}</span>
                                            </p>
                                            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                {pickup.pickedUpAt ? formatTimeInPacific(pickup.pickedUpAt, { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lunch bags: per-guest assignment with times */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-col gap-3">
                            <div>
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                                    Lunch Bag Assignments
                                </p>
                                {dayMetrics.lunchBagCount > 0 ? (
                                    <>
                                        <p className="mt-1 text-xl font-bold tracking-tight text-emerald-700">
                                            {dayMetrics.lunchBagCount.toLocaleString()} lunch bag{dayMetrics.lunchBagCount === 1 ? '' : 's'} handed out
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-gray-500">
                                            {lunchBagDetail.assignedCount.toLocaleString()} assigned to guests · {lunchBagDetail.bulkCount.toLocaleString()} from bulk entries.
                                        </p>
                                    </>
                                ) : mealsDataIsLoaded ? (
                                    <p className="mt-1 text-xl font-bold tracking-tight text-emerald-700">
                                        No lunch bags logged for this date.
                                    </p>
                                ) : (
                                    <p className="mt-1 text-xl font-bold tracking-tight text-gray-400 animate-pulse">
                                        Loading lunch bag activity…
                                    </p>
                                )}
                            </div>
                            {lunchBagDetail.bags.length > 0 && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50/60 divide-y divide-gray-100 max-h-72 overflow-y-auto">
                                    {lunchBagDetail.bags.map((bag) => (
                                        <div key={bag.id} className="flex items-center gap-3 px-3 py-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                <Package size={14} aria-hidden />
                                            </span>
                                            <p className="min-w-0 flex-1 text-xs font-bold text-gray-700 truncate">
                                                {bag.guestName
                                                    ? <span className="text-emerald-700">{bag.guestName}</span>
                                                    : <span className="text-gray-500">Bulk entry</span>}
                                                {bag.count > 1 && <span className="text-gray-400"> · {bag.count} bags</span>}
                                            </p>
                                            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                {bag.assignedAt ? formatTimeInPacific(bag.assignedAt, { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Service Mix</p>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{dayMetrics.total.toLocaleString()} meals served</p>
                    </div>
                    <div className="space-y-2">
                        {serviceMix.items.map(({ label, value, icon: Icon, iconClass, barClass }) => (
                            <div key={label} className="flex items-center gap-3">
                                <span
                                    aria-label={`${label} icon`}
                                    role="img"
                                    className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", iconClass)}
                                >
                                    <Icon size={14} strokeWidth={2.25} aria-hidden />
                                </span>
                                <span className="w-20 sm:w-28 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{label}</span>
                                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-[width] duration-300", barClass)}
                                        style={{ width: `${Math.round((value / serviceMix.max) * 100)}%` }}
                                    />
                                </div>
                                <span className="w-12 shrink-0 text-right text-sm font-black text-gray-700">{value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <History size={15} className="text-gray-400" /> Activity Log ({filteredHistory.length}{activityFilter !== 'all' ? ` of ${history.length}` : ''})
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-2 py-1.5">
                            <Filter size={12} className="text-gray-400" />
                            <select
                                value={activityFilter}
                                onChange={(e) => setActivityFilter(e.target.value)}
                                className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                                aria-label="Filter activity log"
                            >
                                <option value="all">All Types</option>
                                <option value="guest">Guest Meals</option>
                                <option value="extra">Extra Meals</option>
                                <option value="rv">RV Meals</option>
                                <option value="day_worker">Day Worker</option>
                                <option value="shelter">Shelter</option>
                                <option value="lunch_bag">Lunch Bags</option>
                                <option value="united_effort">United Effort</option>
                                <option value="family">Family Meals</option>
                            </select>
                        </div>
                        {activityFilter === 'lunch_bag' && filteredHistory.length > 0 && (
                            <button
                                onClick={handleBatchDeleteLunchBags}
                                disabled={isBatchDeleting}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all",
                                    isBatchDeleting
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                )}
                            >
                                <Trash2 size={12} />
                                {isBatchDeleting ? 'Deleting...' : `Delete All (${filteredHistory.length})`}
                            </button>
                        )}
                    </div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.map((record) => {
                            const Icon = getRecordIcon(record.type);
                            const isEditing = editingId === record.id;

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={record.id}
                                    className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-all group"
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                        getRecordColor(record.type)
                                    )}>
                                        <Icon size={18} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-gray-900 text-sm truncate">{getDisplayName(record)}</h4>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                record.type === 'rv' && "bg-purple-100 text-purple-700",
                                                record.type === 'day_worker' && "bg-blue-100 text-blue-700",
                                                record.type === 'shelter' && "bg-amber-100 text-amber-700",
                                                record.type === 'lunch_bag' && "bg-emerald-100 text-emerald-700",
                                                record.type === 'united_effort' && "bg-rose-100 text-rose-700",
                                                record.type === 'family' && "bg-teal-100 text-teal-700",
                                                record.type === 'extra' && "bg-orange-100 text-orange-700",
                                                record.type === 'guest' && !record?.isProxyPickup && "bg-gray-100 text-gray-700",
                                                record.type === 'guest' && record?.isProxyPickup && "bg-emerald-100 text-emerald-700",
                                            )}>
                                                {record.type === 'guest' && record?.isProxyPickup
                                                    ? 'Proxy Pickup'
                                                    : record.type === 'day_worker'
                                                        ? 'Day Worker'
                                                        : record.type === 'lunch_bag'
                                                            ? 'Lunch Bag'
                                                            : record.type === 'united_effort'
                                                                ? 'United Effort'
                                                                : record.type === 'family'
                                                                    ? 'Family Meal'
                                                                    : record.type === 'extra'
                                                                        ? 'Extra'
                                                                        : record.type === 'guest'
                                                                            ? 'Guest'
                                                                            : record.type}
                                            </span>
                                        </div>

                                        {isEditing ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                                    className="w-16 px-2 py-1 text-xs font-bold border border-gray-300 rounded focus:border-emerald-500 outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveEdit(record)} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">Cancel</button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 font-medium tabular-nums cursor-pointer hover:text-gray-800 transition-colors w-fit" onClick={() => handleEdit(record)} title="Click to edit count">
                                                {record.type === 'family'
                                                    ? `${(record as any).mealsPerMember || 0} per member · ${record.count} total`
                                                    : `${record.count} Meal${record.count > 1 ? 's' : ''}`
                                                } · {formatTimeInPacific(record.createdAt || record.date, { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}

                                        {record?.isProxyPickup && (
                                            <p className="text-xs text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                                                <Handshake size={12} aria-hidden />
                                                <span>Picked up by {getPickedUpByName(record)}</span>
                                            </p>
                                        )}
                                    </div>

                                    {!isEditing && (
                                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => handleEdit(record)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit Record"
                                                aria-label="Edit Record"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record)}
                                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete Record"
                                                aria-label="Delete Record"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredHistory.length === 0 && (
                        <div className="py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                                <Utensils size={24} className="text-gray-300" />
                            </div>
                            <p className="font-bold text-sm text-gray-400">
                                {activityFilter !== 'all' ? `No ${activityFilter.replace('_', ' ')} records for this date` : 'No meals logged for this date'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

type StatColor = 'emerald' | 'blue' | 'indigo' | 'purple' | 'sky' | 'amber' | 'rose' | 'teal';

type IconComponentType = LucideIcon | React.ComponentType<{
    size?: number;
    className?: string;
    strokeWidth?: number;
    'aria-hidden'?: boolean;
}>;

const STAT_COLOR_STYLES: Record<StatColor, { text: string; chip: string }> = {
    emerald: { text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    blue: { text: 'text-blue-600', chip: 'bg-blue-50 text-blue-600' },
    indigo: { text: 'text-indigo-600', chip: 'bg-indigo-50 text-indigo-600' },
    purple: { text: 'text-purple-600', chip: 'bg-purple-50 text-purple-600' },
    sky: { text: 'text-sky-600', chip: 'bg-sky-50 text-sky-600' },
    amber: { text: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
    rose: { text: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
    teal: { text: 'text-teal-600', chip: 'bg-teal-50 text-teal-600' },
};

function StatCard({ label, value, color, icon: Icon }: { label: string, value: number, color: StatColor, icon: IconComponentType }) {
    const styles = STAT_COLOR_STYLES[color];

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3 min-w-0">
            <span
                aria-label={`${label} icon`}
                role="img"
                className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", styles.chip)}
            >
                <Icon size={17} strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 leading-tight truncate">{label}</p>
                <p className={cn("text-xl font-bold tracking-tight tabular-nums leading-tight", styles.text)}>{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

function CompactStat({ label, value, color, icon: Icon }: { label: string, value: number, color: StatColor, icon: IconComponentType }) {
    const styles = STAT_COLOR_STYLES[color];

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 flex items-center justify-between gap-3">
            <span className="min-w-0 flex items-center gap-2">
                <span
                    aria-label={`${label} icon`}
                    role="img"
                    className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", styles.chip)}
                >
                    <Icon size={13} strokeWidth={2.25} aria-hidden />
                </span>
                <span className="truncate text-[11px] font-semibold text-gray-500">{label}</span>
            </span>
            <span className={cn('text-sm font-bold tabular-nums', styles.text)}>{value.toLocaleString()}</span>
        </div>
    );
}
