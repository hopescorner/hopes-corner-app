'use client';

import React from 'react';
import { ShowerHead, WashingMachine, Bike, Check, Clock, Scissors, Gift } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { UndoButton, DisabledAction } from './GuestActionControls';
import type { NextAvailableShowerSlot, NextAvailableLaundrySlot } from '@/lib/utils/nextAvailableSlot';

export interface GuestQuickServiceSlotsProps {
    guest: any;
    isPending: boolean;
    todayShower: boolean;
    todayLaundry: boolean;
    isBannedFromShower: boolean;
    isBannedFromLaundry: boolean;
    showerAction?: { id: string };
    laundryAction?: { id: string };
    nextAvailableShowerSlot?: NextAvailableShowerSlot | null;
    nextAvailableLaundrySlot?: NextAvailableLaundrySlot | null;
    onQuickShower: (e?: React.MouseEvent | React.KeyboardEvent) => void;
    onQuickLaundry: (e?: React.MouseEvent | React.KeyboardEvent) => void;
    onUndo: (e: React.MouseEvent | undefined, actionId: string, label: string) => void;
}

export function GuestQuickServiceSlots({
    isPending,
    todayShower,
    todayLaundry,
    isBannedFromShower,
    isBannedFromLaundry,
    showerAction,
    laundryAction,
    nextAvailableShowerSlot,
    nextAvailableLaundrySlot,
    onQuickShower,
    onQuickLaundry,
    onUndo,
}: GuestQuickServiceSlotsProps) {
    return (
        <div className="hidden md:flex items-center gap-1 px-1 py-1 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
            {/* Shower */}
            {isBannedFromShower ? (
                <DisabledAction label="Shower" reason="Banned" />
            ) : todayShower ? (
                <div className="flex items-center gap-1">
                    <div className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                        <Check size={14} />
                        <ShowerHead size={15} />
                    </div>
                    {showerAction && (
                        <UndoButton
                            title="Undo shower"
                            label="Undo shower"
                            onClick={(e) => onUndo(e, showerAction.id, 'Shower booking')}
                        />
                    )}
                </div>
            ) : (
                <button
                    onClick={onQuickShower}
                    disabled={isPending}
                    className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-white border border-gray-200 text-sky-600 font-bold text-sm hover:border-sky-300 hover:bg-sky-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                    title={nextAvailableShowerSlot ? `Quick book shower @ ${nextAvailableShowerSlot.label}` : 'Join shower waitlist'}
                >
                    <ShowerHead size={16} />
                    {nextAvailableShowerSlot ? (
                        <span className="text-[11px] ml-1 font-bold text-sky-700">{nextAvailableShowerSlot.slotTime}</span>
                    ) : (
                        <span className="text-[10px] ml-1 font-bold text-amber-600">Waitlist</span>
                    )}
                </button>
            )}

            {/* Laundry */}
            {isBannedFromLaundry ? (
                <DisabledAction label="Laundry" reason="Banned" />
            ) : todayLaundry ? (
                <div className="flex items-center gap-1">
                    <div className="flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm">
                        <Check size={14} />
                        <WashingMachine size={15} />
                    </div>
                    {laundryAction && (
                        <UndoButton
                            title="Undo laundry"
                            label="Undo laundry"
                            onClick={(e) => onUndo(e, laundryAction.id, 'Laundry booking')}
                        />
                    )}
                </div>
            ) : (
                <button
                    onClick={onQuickLaundry}
                    disabled={isPending}
                    className="flex items-center justify-center h-11 min-h-[44px] min-w-[44px] px-3 rounded-lg bg-white border border-gray-200 text-indigo-600 font-bold text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-95 touch-manipulation disabled:opacity-50"
                    title={nextAvailableLaundrySlot ? `Quick book on-site laundry @ ${nextAvailableLaundrySlot.label}` : 'Book laundry'}
                >
                    <WashingMachine size={16} />
                    {nextAvailableLaundrySlot && (
                        <span className="text-[10px] ml-1 font-bold text-indigo-700">{nextAvailableLaundrySlot.label.split(' - ')[0]}</span>
                    )}
                </button>
            )}
        </div>
    );
}

export interface GuestServiceSlotsProps {
    guest: any;
    todayShower: boolean;
    todayLaundry: boolean;
    todayBicycle: boolean;
    isBannedFromShower: boolean;
    isBannedFromLaundry: boolean;
    isBannedFromBicycle: boolean;
    showerAction?: { id: string };
    laundryAction?: { id: string };
    bicycleAction?: { id: string };
    nextAvailableShowerSlot?: NextAvailableShowerSlot | null;
    nextAvailableLaundrySlot?: NextAvailableLaundrySlot | null;
    onQuickShower: (e?: React.MouseEvent | React.KeyboardEvent) => void;
    onQuickLaundry: (e?: React.MouseEvent | React.KeyboardEvent) => void;
    onOpenShowerPicker: () => void;
    onOpenLaundryPicker: () => void;
    onOpenBicyclePicker: () => void;
    onUndo: (e: React.MouseEvent | undefined, actionId: string, label: string) => void;
}

export function GuestServiceSlots({
    todayShower,
    todayLaundry,
    todayBicycle,
    isBannedFromShower,
    isBannedFromLaundry,
    isBannedFromBicycle,
    showerAction,
    laundryAction,
    bicycleAction,
    nextAvailableShowerSlot,
    nextAvailableLaundrySlot,
    onQuickShower,
    onQuickLaundry,
    onOpenShowerPicker,
    onOpenLaundryPicker,
    onOpenBicyclePicker,
    onUndo,
}: GuestServiceSlotsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Shower Slot Card */}
            <div
                role="button"
                tabIndex={isBannedFromShower || !!todayShower ? -1 : 0}
                onClick={onQuickShower}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onQuickShower();
                    }
                }}
                aria-disabled={isBannedFromShower || !!todayShower}
                className={cn(
                    "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation cursor-pointer select-none",
                    todayShower
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : isBannedFromShower
                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white border-gray-100 hover:border-sky-200 hover:bg-sky-50"
                )}
            >
                {todayShower ? (
                    <>
                        <Check size={20} className="text-emerald-500 mb-1.5" />
                        {showerAction && (
                            <UndoButton
                                title="Undo shower"
                                label="Undo shower"
                                className="absolute top-1.5 right-1.5"
                                onClick={(e) => onUndo(e, showerAction.id, 'Shower booking')}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <ShowerHead size={20} className={isBannedFromShower ? "text-gray-400 mb-1.5" : "text-sky-500 mb-1.5"} />
                        {!isBannedFromShower && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpenShowerPicker(); }}
                                className="absolute top-1.5 right-1.5 p-1.5 text-gray-400 hover:text-sky-600 rounded-md hover:bg-sky-50 transition-colors"
                                title="Choose specific shower time"
                            >
                                <Clock size={14} />
                            </button>
                        )}
                    </>
                )}
                <span className="text-xs font-bold">
                    {isBannedFromShower ? 'Shower · Banned' : todayShower ? 'Shower Done' : nextAvailableShowerSlot ? `Shower (${nextAvailableShowerSlot.slotTime})` : 'Join Waitlist'}
                </span>
            </div>

            {/* Laundry Slot Card */}
            <div
                role="button"
                tabIndex={isBannedFromLaundry || !!todayLaundry ? -1 : 0}
                onClick={onQuickLaundry}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onQuickLaundry();
                    }
                }}
                aria-disabled={isBannedFromLaundry || !!todayLaundry}
                className={cn(
                    "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation cursor-pointer select-none",
                    todayLaundry
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : isBannedFromLaundry
                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50"
                )}
            >
                {todayLaundry ? (
                    <>
                        <Check size={20} className="text-emerald-500 mb-1.5" />
                        {laundryAction && (
                            <UndoButton
                                title="Undo laundry"
                                label="Undo laundry"
                                className="absolute top-1.5 right-1.5"
                                onClick={(e) => onUndo(e, laundryAction.id, 'Laundry booking')}
                            />
                        )}
                    </>
                ) : (
                    <>
                        <WashingMachine size={20} className={isBannedFromLaundry ? "text-gray-400 mb-1.5" : "text-indigo-500 mb-1.5"} />
                        {!isBannedFromLaundry && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onOpenLaundryPicker(); }}
                                className="absolute top-1.5 right-1.5 p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                                title="Choose laundry options"
                            >
                                <Clock size={14} />
                            </button>
                        )}
                    </>
                )}
                <span className="text-xs font-bold">
                    {isBannedFromLaundry ? 'Laundry · Banned' : todayLaundry ? 'Laundry Done' : nextAvailableLaundrySlot ? `Laundry (${nextAvailableLaundrySlot.label.split(' - ')[0]})` : 'Laundry'}
                </span>
            </div>

            {/* Bicycle Card */}
            <button
                onClick={(e) => { e.stopPropagation(); onOpenBicyclePicker(); }}
                disabled={isBannedFromBicycle || !!todayBicycle}
                className={cn(
                    "relative flex flex-col items-center justify-center min-h-[84px] p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] touch-manipulation",
                    todayBicycle
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : isBannedFromBicycle
                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50"
                )}
            >
                {todayBicycle ? (
                    <>
                        <Check size={20} className="text-emerald-500 mb-1.5" />
                        {bicycleAction && (
                            <UndoButton
                                title="Undo bicycle"
                                label="Undo bicycle"
                                className="absolute top-1.5 right-1.5"
                                onClick={(e) => onUndo(e, bicycleAction.id, 'Bicycle booking')}
                            />
                        )}
                    </>
                ) : (
                    <Bike size={20} className={isBannedFromBicycle ? "text-gray-400 mb-1.5" : "text-amber-500 mb-1.5"} />
                )}
                <span className="text-xs font-bold text-gray-700">
                    {isBannedFromBicycle ? 'Bicycle · Banned' : todayBicycle ? 'Bicycle Done' : 'Bicycle'}
                </span>
            </button>
        </div>
    );
}

export interface GuestAdditionalServicesProps {
    guestId: string;
    todayHaircut: boolean;
    todayHoliday: boolean;
    isPending: boolean;
    isBannedFromAllServices: boolean;
    hasHaircutForSelectedDate: boolean;
    haircutDate: string;
    today: string;
    haircutAction?: { id: string };
    holidayAction?: { id: string };
    onHaircutDateChange: (date: string) => void;
    onHaircutAdd: (e: React.MouseEvent) => void;
    onHolidayAdd: (e: React.MouseEvent) => void;
    onUndo: (e: React.MouseEvent | undefined, actionId: string, label: string) => void;
}

export function GuestAdditionalServices({
    guestId,
    todayHaircut,
    todayHoliday,
    isPending,
    isBannedFromAllServices,
    hasHaircutForSelectedDate,
    haircutDate,
    today,
    haircutAction,
    holidayAction,
    onHaircutDateChange,
    onHaircutAdd,
    onHolidayAdd,
    onUndo,
}: GuestAdditionalServicesProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {todayHaircut ? (
                <div className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl">
                    <Check size={14} />
                    Haircut
                    {haircutAction && (
                        <UndoButton
                            title="Undo haircut"
                            label="Undo haircut"
                            className="ml-1"
                            onClick={(e) => onUndo(e, haircutAction.id, 'Haircut')}
                        />
                    )}
                </div>
            ) : (
                <div className="inline-flex items-center gap-2">
                    <label htmlFor={`haircut-date-${guestId}`} className="sr-only">Haircut date</label>
                    <input
                        id={`haircut-date-${guestId}`}
                        aria-label="Haircut date"
                        type="date"
                        value={haircutDate}
                        max={today}
                        onChange={(e) => onHaircutDateChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-10 min-h-[40px] rounded-xl border border-gray-200 px-2.5 text-xs sm:text-sm text-gray-600 touch-manipulation"
                        disabled={isPending || isBannedFromAllServices || hasHaircutForSelectedDate}
                    />
                    <button
                        onClick={onHaircutAdd}
                        disabled={isPending || isBannedFromAllServices || hasHaircutForSelectedDate}
                        title={isBannedFromAllServices ? 'Banned from all programs' : undefined}
                        className={cn(
                            "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation border border-transparent",
                            isBannedFromAllServices || hasHaircutForSelectedDate
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                        )}
                    >
                        <Scissors size={14} />
                        {hasHaircutForSelectedDate ? 'Haircut Done' : isBannedFromAllServices ? 'Haircut · Banned' : 'Haircut'}
                    </button>
                </div>
            )}

            {todayHoliday ? (
                <div className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold text-pink-700 bg-pink-50 border border-pink-200 rounded-xl">
                    <Check size={14} />
                    Holiday
                    {holidayAction && (
                        <UndoButton
                            title="Undo holiday visit"
                            label="Undo holiday visit"
                            className="ml-1"
                            onClick={(e) => onUndo(e, holidayAction.id, 'Holiday visit')}
                        />
                    )}
                </div>
            ) : (
                <button
                    onClick={onHolidayAdd}
                    disabled={isPending || isBannedFromAllServices}
                    title={isBannedFromAllServices ? 'Banned from all programs' : undefined}
                    className={cn(
                        "inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 touch-manipulation border border-transparent",
                        isBannedFromAllServices
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                    )}
                >
                    <Gift size={14} />
                    {isBannedFromAllServices ? 'Holiday · Banned' : 'Holiday Service'}
                </button>
            )}
        </div>
    );
}
