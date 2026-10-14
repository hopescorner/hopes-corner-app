'use client';

import React from 'react';
import {
    Home,
    MapPin,
    Clock,
    Sparkles,
    Bell,
    Link2,
    Check,
    Ban,
    Utensils,
    ShowerHead,
    WashingMachine,
    Scissors,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { getGuestInitials, getGuestAvatarColor } from '@/lib/utils/guestAvatar';
import { pacificDateStringFrom } from '@/lib/utils/date';
import { GuestWarningBadge } from './GuestWarnings';
import type { RecentGuestsMap, TodayMealStatus, TodayServiceStatus } from '@/stores/selectors/todayStatusSelectors';

export interface GuestIdentityProps {
    guest: any;
    displayName: string;
    fullName: string;
    showFullName: boolean;
    ageRange: string;
    genderPresentation: { Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>; shortLabel: string };
    compact?: boolean;
    isBanned: boolean;
    banDetails: any;
    today: string;
    warningBadgeCount: number;
    reminderBadgeCount: number;
    totalLinkedCount: number;
    linkedServedCount: number;
    totalMeals: number;
    todayShower: boolean;
    todayLaundry: boolean;
    todayHaircut: boolean;
    serviceStatus: TodayServiceStatus;
    mealStatus: TodayMealStatus;
    recentGuestsMap?: RecentGuestsMap;
    pulses: Record<string, number>;
    lastVisitLabel: string | null;
    lastVisitDateStr: string | null;
    isExpanded: boolean;
    onExpandWarnings: () => void;
    onOpenReminders: () => void;
}

export function GuestIdentity({
    guest,
    displayName,
    fullName,
    showFullName,
    ageRange,
    genderPresentation,
    compact = false,
    isBanned,
    banDetails,
    today,
    warningBadgeCount,
    reminderBadgeCount,
    totalLinkedCount,
    linkedServedCount,
    totalMeals,
    todayShower,
    todayLaundry,
    todayHaircut,
    serviceStatus,
    mealStatus,
    recentGuestsMap,
    pulses,
    lastVisitLabel,
    lastVisitDateStr,
    isExpanded,
    onExpandWarnings,
    onOpenReminders,
}: GuestIdentityProps) {
    const avatarColor = getGuestAvatarColor(guest?.id || displayName);
    const initials = getGuestInitials(guest);
    const isNewGuest = guest.createdAt && pacificDateStringFrom(guest.createdAt) === today;
    const isRecent = recentGuestsMap ? recentGuestsMap.has(guest.id) : false;

    return (
        <div
            role={compact ? undefined : 'group'}
            aria-label={compact ? undefined : 'Guest identity'}
            className={cn(
                'flex flex-1 min-w-0',
                compact
                    ? 'items-center gap-3'
                    : 'w-full items-start gap-3 px-4 pb-3 pt-4 md:w-auto md:items-center md:p-0'
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-center rounded-xl border shrink-0 transition-transform group-hover:scale-105 font-black select-none',
                    compact ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm',
                    isBanned
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : cn(avatarColor.bg, avatarColor.border, avatarColor.text)
                )}
            >
                {isBanned ? <Ban size={compact ? 18 : 22} /> : initials}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-col items-start gap-1 md:flex-row md:gap-2">
                    <div className="min-w-0 w-full md:w-auto">
                        <h3
                            className={cn(
                                'font-bold text-gray-900',
                                compact
                                    ? 'truncate text-sm'
                                    : 'break-words text-lg leading-tight md:truncate md:text-base'
                            )}
                        >
                            {displayName}
                        </h3>
                        {showFullName && (
                            <p
                                className={cn(
                                    'text-gray-500 truncate',
                                    compact ? 'text-[11px]' : 'text-xs'
                                )}
                            >
                                Full name: {fullName}
                            </p>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {isNewGuest && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold animate-pulse">
                                <Sparkles size={10} />
                                NEW
                            </span>
                        )}
                        <GuestWarningBadge
                            guestId={guest.id}
                            fallbackCount={warningBadgeCount}
                            onExpand={onExpandWarnings}
                        />
                        {reminderBadgeCount > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenReminders();
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 text-[10px] font-bold hover:from-blue-100 hover:to-purple-100 transition-colors"
                            >
                                <Bell size={10} className="animate-pulse" />
                                {reminderBadgeCount}
                            </button>
                        )}
                        {totalLinkedCount > 0 && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                                    linkedServedCount > 0 && linkedServedCount >= totalLinkedCount
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : linkedServedCount > 0
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                )}
                                title={
                                    linkedServedCount > 0
                                        ? `${linkedServedCount} of ${totalLinkedCount} linked ${totalLinkedCount === 1 ? 'buddy' : 'buddies'} served`
                                        : `${totalLinkedCount} linked ${totalLinkedCount === 1 ? 'buddy' : 'buddies'}`
                                }
                            >
                                {linkedServedCount > 0 && linkedServedCount >= totalLinkedCount ? (
                                    <Check size={10} />
                                ) : (
                                    <Link2 size={10} />
                                )}
                                <span>
                                    {linkedServedCount > 0
                                        ? `${linkedServedCount}/${totalLinkedCount} served`
                                        : totalLinkedCount}
                                </span>
                            </span>
                        )}
                        {isBanned && (
                            <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold"
                                title={banDetails.isAllProgramsBanned ? 'Banned from all programs' : `Banned from: ${banDetails.bannedSummary}`}
                            >
                                <Ban size={10} />
                                <span>BANNED</span>
                                {!banDetails.isAllProgramsBanned && (
                                    <span className="font-semibold text-red-600">({banDetails.bannedSummary})</span>
                                )}
                            </span>
                        )}
                        {isRecent && !mealStatus.hasMeal && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold">
                                <Utensils size={10} />
                                RECENT
                            </span>
                        )}
                        {totalMeals > 0 && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold",
                                    pulses.meal !== undefined && "animate-success-pulse"
                                )}
                                style={pulses.meal !== undefined ? { animationDelay: `${pulses.meal}ms` } : undefined}
                            >
                                <Check size={10} />
                                {totalMeals} MEAL{totalMeals > 1 ? 'S' : ''}
                            </span>
                        )}
                        {todayShower && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold",
                                    pulses.shower !== undefined && "animate-success-pulse"
                                )}
                                style={pulses.shower !== undefined ? { animationDelay: `${pulses.shower}ms` } : undefined}
                            >
                                <ShowerHead size={10} />
                                SHOWER{serviceStatus.showerRecord?.time ? ` @ ${serviceStatus.showerRecord.time}` : ''}
                            </span>
                        )}
                        {todayLaundry && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold",
                                    pulses.laundry !== undefined && "animate-success-pulse"
                                )}
                                style={pulses.laundry !== undefined ? { animationDelay: `${pulses.laundry}ms` } : undefined}
                            >
                                <WashingMachine size={10} />
                                LAUNDRY{serviceStatus.laundryRecord?.time ? ` @ ${serviceStatus.laundryRecord.time}` : ''}
                            </span>
                        )}
                        {todayHaircut && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                <Scissors size={10} />
                                HAIRCUT
                            </span>
                        )}
                    </div>
                </div>

                {/* Guest details */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-normal text-gray-400">
                    <span className="inline-flex items-center gap-1">
                        <Home size={11} className="text-gray-300" aria-hidden="true" />
                        {guest.housingStatus}
                    </span>
                    {guest.location && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin size={11} className="text-gray-300" aria-hidden="true" />
                            {guest.location}
                        </span>
                    )}
                    {guest.gender && (
                        <span
                            aria-label={`Gender: ${guest.gender}`}
                            className="inline-flex items-center gap-1"
                        >
                            <genderPresentation.Icon size={11} className="text-gray-300" aria-hidden="true" />
                            <span>{genderPresentation.shortLabel}</span>
                        </span>
                    )}
                    {ageRange && <span>{ageRange}</span>}
                    {lastVisitLabel && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400" title={`Last visit: ${lastVisitDateStr}`}>
                            <Clock size={10} className="text-gray-300" aria-hidden="true" />
                            Last visit: {lastVisitLabel}
                        </span>
                    )}
                </div>
            </div>

            {!compact && (
                <div className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-colors group-hover:text-emerald-500 md:hidden">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            )}
        </div>
    );
}
