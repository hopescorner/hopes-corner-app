'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ShowerHead, WashingMachine } from 'lucide-react';
import { UserRole } from '@/lib/auth/types';
import { useServicesStore } from '@/stores/useServicesStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useBlockedSlotsStore } from '@/stores/useBlockedSlotsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';

// Subscribe to array lengths to ensure re-renders when records change
// This is a workaround for potential subscription issues with complex selectors
const useShowerRecordsLength = () => {
    return useSyncExternalStore(
        useServicesStore.subscribe,
        () => useServicesStore.getState().showerRecords.length,
        () => useServicesStore.getState().showerRecords.length
    );
};

const useLaundryRecordsLength = () => {
    return useSyncExternalStore(
        useServicesStore.subscribe,
        () => useServicesStore.getState().laundryRecords.length,
        () => useServicesStore.getState().laundryRecords.length
    );
};

interface ServiceStatusOverviewProps {
    onShowerClick?: () => void;
    onLaundryClick?: () => void;
}

// Extracted sub-components to avoid "Cannot create components during render"
interface CardContentProps {
    stats: any;
    nextSlotLabel: string;
    type: 'shower' | 'laundry';
}

const CardContent = ({ stats, nextSlotLabel, type }: CardContentProps) => {
    const isShower = type === 'shower';
    const Icon = isShower ? ShowerHead : WashingMachine;
    const label = isShower ? 'Showers' : 'Laundry';
    const colorClass = isShower ? 'blue' : 'purple';

    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stats.isFull ? 'bg-red-100 text-red-600' : `bg-${colorClass}-100 text-${colorClass}-600`}`}>
                        <Icon size={18} />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{label}</span>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${stats.isFull
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                    {stats.isFull ? 'FULL' : 'OPEN'}
                </div>
            </div>

            <div className="bg-white/80 rounded-lg p-3 border border-gray-100 flex items-center justify-between shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    {isShower ? (stats.available > 0 ? 'Available' : 'Waitlist') : 'Available'}
                </span>
                <span className={`text-2xl font-black ${isShower
                        ? (stats.available > 0 ? 'text-blue-600' : 'text-amber-600')
                        : (stats.onsiteAvailable > 0 ? 'text-purple-600' : 'text-gray-400')
                    }`}>
                    {isShower
                        ? (stats.available > 0 ? stats.available : stats.waitlisted)
                        : stats.onsiteAvailable
                    }
                </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 font-medium">{nextSlotLabel}</p>
        </>
    );
};

export function ServiceStatusOverview({ onShowerClick, onLaundryClick }: ServiceStatusOverviewProps) {
    const { showerRecords, laundryRecords } = useServicesStore();
    const { targets } = useSettingsStore();
    const todayString = todayPacificDateString();
    const getRecordDate = (record: { date?: string | null; scheduledFor?: string | null }) =>
        record.date || record.scheduledFor || null;

    // Force re-render when record counts change (ensures reactivity)
    const showerRecordsLength = useShowerRecordsLength();
    const laundryRecordsLength = useLaundryRecordsLength();

    const allShowerSlots = useMemo(() => generateShowerSlots(), []);
    const allLaundrySlots = useMemo(() => generateLaundrySlots(), []);
    const { isSlotBlocked, blockedSlots } = useBlockedSlotsStore();

    // Count blocked shower slots for today
    const blockedShowerSlotsCount = useMemo(() => {
        return blockedSlots.filter(
            (slot) => slot.serviceType === 'shower' && slot.date === todayString
        ).length;
    }, [blockedSlots, todayString]);

    // Count blocked laundry slots for today
    const blockedLaundrySlotsCount = useMemo(() => {
        return blockedSlots.filter(
            (slot) => slot.serviceType === 'laundry' && slot.date === todayString
        ).length;
    }, [blockedSlots, todayString]);

    // Calculate shower statistics
    const showerStats = useMemo(() => {
        const excludedStatuses = new Set(['waitlisted', 'cancelled']);
        const todaysRecords = (showerRecords || []).filter(
            (record: any) =>
                pacificDateStringFrom(getRecordDate(record) || new Date()) === todayString &&
                !excludedStatuses.has(record.status)
        );

        const totalSlots = allShowerSlots?.length || 0;
        const blockedCapacity = blockedShowerSlotsCount * 2;
        const totalCapacity = (totalSlots * 2) - blockedCapacity;
        const booked = todaysRecords.length;
        const available = Math.max(totalCapacity - booked, 0);
        const waitlisted = (showerRecords || []).filter(
            (record: any) =>
                record.status === 'waitlisted' &&
                pacificDateStringFrom(getRecordDate(record) || new Date()) === todayString
        ).length;

        return {
            totalCapacity,
            booked,
            available,
            waitlisted,
            isFull: available === 0,
            isNearlyFull: available <= 2 && available > 0,
        };
    }, [showerRecords, allShowerSlots, todayString, blockedShowerSlotsCount, showerRecordsLength]);

    // Calculate laundry statistics
    const laundryStats = useMemo(() => {
        const maxSlots = targets?.maxOnsiteLaundrySlots ?? 5;
        const todaysRecords = (laundryRecords || []).filter(
            (record: any) => pacificDateStringFrom(getRecordDate(record) || new Date()) === todayString
        );
        const onsiteSlotsTaken = todaysRecords.filter(
            (record: any) => (record.laundryType === 'onsite' || !record.laundryType)
        ).length;
        const effectiveMaxSlots = Math.max(maxSlots - blockedLaundrySlotsCount, 0);
        const onsiteAvailable = Math.max(effectiveMaxSlots - onsiteSlotsTaken, 0);

        return {
            totalCapacity: effectiveMaxSlots,
            onsiteBooked: onsiteSlotsTaken,
            onsiteAvailable,
            totalToday: todaysRecords.length,
            isFull: onsiteAvailable === 0,
            isNearlyFull: onsiteAvailable === 1,
        };
    }, [laundryRecords, todayString, targets, blockedLaundrySlotsCount, laundryRecordsLength]);

    // Find next available shower slot (any unbooked slot regardless of time)
    const nextAvailableShowerSlot = useMemo(() => {
        if (!allShowerSlots?.length || showerStats.available === 0) return null;
        const inactiveStatuses = new Set(['waitlisted', 'cancelled', 'done']);
        const todayActiveRecords = (showerRecords || []).filter(
            (record: any) =>
                pacificDateStringFrom(getRecordDate(record) || new Date()) === todayString &&
                !inactiveStatuses.has(record.status)
        );
        const slotCounts: Record<string, number> = {};
        todayActiveRecords.forEach((record: any) => {
            const time = record.scheduledTime || record.time;
            if (time) slotCounts[time] = (slotCounts[time] || 0) + 1;
        });
        for (const slot of allShowerSlots) {
            if (!slot || isSlotBlocked('shower', slot, todayString)) continue;
            if ((slotCounts[slot] || 0) < 2) return slot;
        }
        return null;
    }, [allShowerSlots, showerRecords, todayString, showerStats.available, isSlotBlocked, showerRecordsLength]);

    // Find next available laundry slot (any unbooked slot regardless of time)
    const nextAvailableLaundrySlot = useMemo(() => {
        if (!allLaundrySlots?.length || laundryStats.onsiteAvailable === 0) return null;
        const activeLaundryStatuses = new Set(['waiting', 'washer', 'dryer']);
        const todayLaundryRecords = (laundryRecords || []).filter(
            (record: any) =>
                pacificDateStringFrom(getRecordDate(record) || new Date()) === todayString &&
                record.laundryType === 'onsite' &&
                activeLaundryStatuses.has(record.status)
        );
        const bookedLaundrySlots = new Set(
            todayLaundryRecords.map((record: any) => record.slotLabel || record.time).filter(Boolean)
        );
        for (const slot of allLaundrySlots) {
            if (!slot || isSlotBlocked('laundry', slot, todayString)) continue;
            if (!bookedLaundrySlots.has(slot)) return slot;
        }
        return null;
    }, [allLaundrySlots, laundryRecords, todayString, laundryStats.onsiteAvailable, isSlotBlocked, laundryRecordsLength]);

    const nextShowerSlotLabel = nextAvailableShowerSlot
        ? `Next: ${formatSlotLabel(nextAvailableShowerSlot)}`
        : 'Waitlist only';

    const nextLaundrySlotLabel = nextAvailableLaundrySlot
        ? `Next: ${formatSlotLabel(nextAvailableLaundrySlot)}`
        : 'No more onsite slots';

    const { data: session } = useSession();
    const role = session?.user?.role as UserRole;
    const canNavigate = role === 'admin' || role === 'staff';

    const cardBaseClasses = "block w-full rounded-xl border p-4 transition-all duration-200 hover:shadow-md active:scale-[0.98] text-left";

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shower Status */}
            {canNavigate ? (
                <Link
                    href="/services?tab=showers"
                    prefetch={false}
                    className={`${cardBaseClasses} cursor-pointer ${showerStats.isFull
                        ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                        : 'bg-blue-50/30 border-blue-100 hover:bg-blue-50/50'
                        }`}
                >
                    <CardContent stats={showerStats} nextSlotLabel={nextShowerSlotLabel} type="shower" />
                </Link>
            ) : (
                <div
                    className={`${cardBaseClasses} cursor-default ${showerStats.isFull
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-blue-50/30 border-blue-100'
                        }`}
                >
                    <CardContent stats={showerStats} nextSlotLabel={nextShowerSlotLabel} type="shower" />
                </div>
            )}

            {/* Laundry Status */}
            {canNavigate ? (
                <Link
                    href="/services?tab=laundry"
                    prefetch={false}
                    className={`${cardBaseClasses} cursor-pointer ${laundryStats.isFull
                        ? 'bg-red-50/50 border-red-200 hover:bg-red-50'
                        : 'bg-purple-50/30 border-purple-100 hover:bg-purple-50/50'
                        }`}
                >
                    <CardContent stats={laundryStats} nextSlotLabel={nextLaundrySlotLabel} type="laundry" />
                </Link>
            ) : (
                <div
                    className={`${cardBaseClasses} cursor-default ${laundryStats.isFull
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-purple-50/30 border-purple-100'
                        }`}
                >
                    <CardContent stats={laundryStats} nextSlotLabel={nextLaundrySlotLabel} type="laundry" />
                </div>
            )}
        </div>
    );
}
