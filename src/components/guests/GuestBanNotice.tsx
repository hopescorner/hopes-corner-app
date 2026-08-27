'use client';

import React from 'react';
import { AlertCircle, Ban, Bike, Check, ShowerHead, Utensils, WashingMachine } from 'lucide-react';
import { getGuestBanDetails, GuestBanInput, ProgramBanKey } from '@/lib/utils/banUtils';
import { cn } from '@/lib/utils/cn';

interface GuestBanNoticeProps {
    guest: GuestBanInput;
    className?: string;
    title?: string;
    showTitle?: boolean;
    compact?: boolean;
}

const PROGRAM_ICONS: Record<ProgramBanKey, React.ComponentType<{ size?: number; className?: string }>> = {
    meals: Utensils,
    shower: ShowerHead,
    laundry: WashingMachine,
    bicycle: Bike,
};

export function GuestBanNotice({
    guest,
    className,
    title = 'Guest is banned',
    showTitle = true,
    compact = false,
}: GuestBanNoticeProps) {
    const banDetails = getGuestBanDetails(guest);

    if (!banDetails.isBanned) return null;

    const formattedDate = guest.bannedUntil ? new Date(guest.bannedUntil).toLocaleDateString() : null;

    return (
        <div className={cn("p-4 rounded-xl border border-red-200 bg-red-50/90 text-left space-y-3", className)}>
            <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    {showTitle && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-red-700">
                                <span>{title}</span>
                                {formattedDate && (
                                    <span className="font-medium text-red-600 ml-1.5">
                                        until {formattedDate}
                                    </span>
                                )}
                            </p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                {banDetails.isAllProgramsBanned ? 'All Programs' : `${banDetails.bannedPrograms.length} Restricted`}
                            </span>
                        </div>
                    )}
                    {guest.banReason && (
                        <p className="text-sm text-red-600 mt-0.5">
                            Reason: {guest.banReason}
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-2 border-t border-red-200/70">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-800/90 mb-2">
                    Program Access
                </p>
                <div className={cn(
                    "grid gap-2",
                    compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
                )}>
                    {banDetails.programs.map((program) => {
                        const Icon = PROGRAM_ICONS[program.key];
                        return (
                            <div
                                key={program.key}
                                className={cn(
                                    "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
                                    program.isBanned
                                        ? "bg-red-100/90 border-red-200 text-red-900 font-semibold"
                                        : "bg-emerald-50/90 border-emerald-200 text-emerald-900 font-medium"
                                )}
                            >
                                <div className="flex items-center gap-1.5 truncate">
                                    <Icon
                                        size={14}
                                        className={cn(
                                            "shrink-0",
                                            program.isBanned ? "text-red-600" : "text-emerald-600"
                                        )}
                                    />
                                    <span className="truncate">{program.label}</span>
                                </div>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0",
                                        program.isBanned
                                            ? "bg-red-200 text-red-800"
                                            : "bg-emerald-200 text-emerald-800"
                                    )}
                                >
                                    {program.isBanned ? (
                                        <>
                                            <Ban size={10} />
                                            Banned
                                        </>
                                    ) : (
                                        <>
                                            <Check size={10} />
                                            Allowed
                                        </>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
