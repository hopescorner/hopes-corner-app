'use client';

import { useMemo, useState } from 'react';
import { Scissors, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { ServiceDatePicker } from './ServiceDatePicker';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

const STYLISTS = ['Stylist 1', 'Stylist 2', 'Stylist 3', 'Stylist 4'];

const generateHaircutSlots = (): string[] => {
    const slots: string[] = [];
    const startMinutes = 8 * 60;
    const endMinutes = 10 * 60;

    for (let current = startMinutes; current <= endMinutes; current += 15) {
        const hours = Math.floor(current / 60);
        const minutes = current % 60;
        const label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push(label);
    }

    return slots;
};

const displaySlotTime = (slotTime: string) => {
    const [hoursRaw, minutesRaw] = slotTime.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function HaircutsSection() {
    const today = todayPacificDateString();
    const slots = useMemo(() => generateHaircutSlots(), []);

    const { haircutRecords, addHaircutRecord, deleteHaircutRecord } = useServicesStore();
    const { guests } = useGuestsStore();
    const { data: session } = useSession();

    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedGuestId, setSelectedGuestId] = useState('');
    const [selectedStylist, setSelectedStylist] = useState(STYLISTS[0]);
    const [selectedSlotTime, setSelectedSlotTime] = useState(slots[0] || '08:00');
    const [isSaving, setIsSaving] = useState(false);

    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    const guestNameById = useMemo(() => {
        const map = new Map<string, string>();
        (guests || []).forEach((guest) => {
            const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
            map.set(guest.id, displayName || 'Guest');
        });
        return map;
    }, [guests]);

    const selectableGuests = useMemo(() => {
        return (guests || [])
            .filter((guest) => guest?.id)
            .sort((firstGuest, secondGuest) => {
                const firstName = (firstGuest.preferredName || firstGuest.name || `${firstGuest.firstName || ''} ${firstGuest.lastName || ''}`).toString();
                const secondName = (secondGuest.preferredName || secondGuest.name || `${secondGuest.firstName || ''} ${secondGuest.lastName || ''}`).toString();
                return firstName.localeCompare(secondName);
            });
    }, [guests]);

    const recordsForDate = useMemo(() => {
        return (haircutRecords || []).filter((record) => {
            const recordDate = record.serviceDate || record.dateKey || pacificDateStringFrom(record.date);
            return recordDate === selectedDate;
        });
    }, [haircutRecords, selectedDate]);

    const scheduledRecords = useMemo(() => {
        return recordsForDate.filter((record) => record.slotTime && record.stylistName);
    }, [recordsForDate]);

    const unscheduledRecords = useMemo(() => {
        return recordsForDate.filter((record) => !record.slotTime || !record.stylistName);
    }, [recordsForDate]);

    const scheduleMap = useMemo(() => {
        const map = new Map<string, any>();
        scheduledRecords.forEach((record) => {
            const key = `${record.slotTime}|${record.stylistName}`;
            map.set(key, record);
        });
        return map;
    }, [scheduledRecords]);

    const guestsWithHaircutOnDate = useMemo(() => {
        const ids = new Set<string>();
        for (const record of recordsForDate) {
            ids.add(record.guestId);
        }
        return ids;
    }, [recordsForDate]);

    const selectedGuestAlreadyHasHaircut = !!selectedGuestId && guestsWithHaircutOnDate.has(selectedGuestId);

    const handleAssign = async () => {
        if (!selectedGuestId) {
            toast.error('Please select a guest');
            return;
        }

        if (guestsWithHaircutOnDate.has(selectedGuestId)) {
            toast.error('This guest already has a haircut for this date.');
            return;
        }

        setIsSaving(true);
        try {
            await addHaircutRecord(selectedGuestId, {
                serviceDate: selectedDate,
                slotTime: selectedSlotTime,
                stylistName: selectedStylist,
            });
            toast.success('Haircut slot assigned');
            setSelectedGuestId('');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to assign haircut slot');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (recordId: string) => {
        try {
            await deleteHaircutRecord(recordId);
            toast.success('Haircut slot cleared');
        } catch {
            toast.error('Failed to clear slot');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Haircut Schedule</h2>
                    <p className="text-sm text-gray-500">Assign guests to stylist slots in a paper-style grid.</p>
                </div>
                <ServiceDatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} isAdmin={isAdmin} />
            </div>

            {isAdmin && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Scissors size={16} className="text-violet-600" />
                        Assign Haircut Slot
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div>
                            <label htmlFor="haircut-guest" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Guest</label>
                            <select
                                id="haircut-guest"
                                value={selectedGuestId}
                                onChange={(event) => setSelectedGuestId(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            >
                                <option value="">Select guest</option>
                                {selectableGuests.map((guest) => {
                                    const displayName = guest.preferredName || guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`;
                                    const alreadyBooked = guestsWithHaircutOnDate.has(guest.id);
                                    return (
                                        <option key={guest.id} value={guest.id} disabled={alreadyBooked}>
                                            {displayName}{alreadyBooked ? ' (already scheduled)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="haircut-stylist" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Stylist</label>
                            <select
                                id="haircut-stylist"
                                value={selectedStylist}
                                onChange={(event) => setSelectedStylist(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            >
                                {STYLISTS.map((stylist) => (
                                    <option key={stylist} value={stylist}>{stylist}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="haircut-slot" className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Time Slot</label>
                            <select
                                id="haircut-slot"
                                value={selectedSlotTime}
                                onChange={(event) => setSelectedSlotTime(event.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            >
                                {slots.map((slot) => (
                                    <option key={slot} value={slot}>{displaySlotTime(slot)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={handleAssign}
                                disabled={isSaving || selectedGuestAlreadyHasHaircut}
                                className="w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? 'Assigning…' : 'Assign Slot'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-gray-600">Time</th>
                            {STYLISTS.map((stylist) => (
                                <th key={stylist} className="border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-gray-600 last:border-r-0">
                                    {stylist}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map((slot) => (
                            <tr key={slot}>
                                <td className="border-b border-r border-gray-100 px-3 py-3 text-sm font-bold text-gray-700">{displaySlotTime(slot)}</td>
                                {STYLISTS.map((stylist) => {
                                    const cellRecord = scheduleMap.get(`${slot}|${stylist}`);
                                    const guestName = cellRecord ? guestNameById.get(cellRecord.guestId) || 'Guest' : '';

                                    return (
                                        <td key={`${slot}-${stylist}`} className="border-b border-r border-gray-100 px-3 py-2 align-top last:border-r-0">
                                            {cellRecord ? (
                                                <div className="flex items-start justify-between gap-2 rounded-md bg-violet-50 p-2">
                                                    <span className="text-sm font-semibold text-gray-800">{guestName}</span>
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(cellRecord.id)}
                                                            className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600"
                                                            aria-label={`Clear ${stylist} at ${displaySlotTime(slot)}`}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStylist(stylist);
                                                        setSelectedSlotTime(slot);
                                                    }}
                                                    className="w-full rounded-md border border-dashed border-gray-200 px-2 py-2 text-left text-xs text-gray-400 hover:border-violet-300 hover:text-violet-600"
                                                >
                                                    Open
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {unscheduledRecords.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-bold text-amber-800">Unscheduled Haircut Logs</h3>
                    <p className="mt-1 text-xs text-amber-700">These records were logged without a stylist/slot and are shown for reference.</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                        {unscheduledRecords.map((record) => (
                            <li key={record.id}>{guestNameById.get(record.guestId) || 'Guest'}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
