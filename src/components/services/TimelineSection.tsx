'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShowerHead,
    WashingMachine,
    Bike,
    Clock,
    CheckCircle,
    AlertCircle,
    History,
    Calendar,
    User,
    Package,
    ArrowRight
} from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom, formatTimeInPacific } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

interface TimelineEvent {
    id: string;
    type: 'shower' | 'laundry' | 'bicycle' | 'waitlist';
    title: string;
    subtitle: string;
    timeLabel: string;
    status: string;
    timestamp: string;
    guestId: string;
}

export function TimelineSection() {
    const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore();
    const { guests } = useGuestsStore();

    const [filter, setFilter] = useState<'all' | 'showers' | 'laundry' | 'bicycles'>('all');

    const today = todayPacificDateString();

    const events = useMemo(() => {
        const allEvents: TimelineEvent[] = [];

        // Add Showers
        showerRecords.forEach(r => {
            if (pacificDateStringFrom(r.date) !== today) return;
            const guest = guests.find(g => g.id === r.guestId);
            allEvents.push({
                id: `showers-${r.id}`,
                type: r.status === 'waitlisted' ? 'waitlist' : 'shower',
                title: guest ? (guest.preferredName || guest.name) : 'Unknown Guest',
                subtitle: `Shower Reservation - ${r.time || 'Unscheduled'}`,
                timeLabel: r.time || 'Queue',
                status: r.status,
                timestamp: r.createdAt || r.date,
                guestId: r.guestId
            });
        });

        // Add Laundry
        laundryRecords.forEach(r => {
            if (pacificDateStringFrom(r.date) !== today) return;
            const guest = guests.find(g => g.id === r.guestId);
            allEvents.push({
                id: `laundry-${r.id}`,
                type: 'laundry',
                title: guest ? (guest.preferredName || guest.name) : 'Unknown Guest',
                subtitle: `${r.laundryType === 'onsite' ? 'On-site' : 'Off-site'} Laundry ${r.bagNumber ? `(Bag #${r.bagNumber})` : ''}`,
                timeLabel: r.time || 'Dropped off',
                status: r.status,
                timestamp: r.createdAt || r.date,
                guestId: r.guestId
            });
        });

        // Add Bicycles
        bicycleRecords.forEach(r => {
            if (pacificDateStringFrom(r.date) !== today) return;
            const guest = guests.find(g => g.id === r.guestId);
            const repairList = r.repairTypes || [r.repairType];
            allEvents.push({
                id: `bicycle-${r.id}`,
                type: 'bicycle',
                title: guest ? (guest.preferredName || guest.name) : 'Unknown Guest',
                subtitle: `Bicycle Repair: ${repairList.join(', ')}`,
                timeLabel: 'Service Day',
                status: r.status,
                timestamp: r.createdAt || r.date,
                guestId: r.guestId
            });
        });

        // Sort by timestamp (newest first)
        return allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [showerRecords, laundryRecords, bicycleRecords, guests, today]);

    const filteredEvents = events.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'showers') return e.type === 'shower' || e.type === 'waitlist';
        if (filter === 'laundry') return e.type === 'laundry';
        if (filter === 'bicycles') return e.type === 'bicycle';
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">Daily Operations</h2>
                        <p className="text-blue-100 font-medium mt-2 max-w-md">
                            Real-time feed of all service activities recorded across Hope&apos;s Corner today.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[120px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Events</p>
                            <p className="text-2xl font-black mt-1">{events.length}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[120px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Active</p>
                            <p className="text-2xl font-black mt-1">
                                {events.filter(e => !['done', 'picked_up', 'cancelled'].includes(e.status)).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'showers', 'laundry', 'bicycles'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-gray-900 text-white shadow-lg"
                                : "bg-white text-gray-500 border border-gray-100 hover:border-gray-300"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100" />

                <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                        {filteredEvents.map((event, idx) => (
                            <TimelineCard key={event.id} event={event} index={idx} />
                        ))}
                    </AnimatePresence>

                    {filteredEvents.length === 0 && (
                        <div className="py-20 text-center">
                            <History size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-400 font-bold">No events matching this filter</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TimelineCard({ event, index }: { event: TimelineEvent, index: number }) {
    const Icon = {
        shower: ShowerHead,
        waitlist: Clock,
        laundry: WashingMachine,
        bicycle: Bike
    }[event.type];

    const color = {
        shower: 'bg-sky-500',
        waitlist: 'bg-amber-500',
        laundry: 'bg-purple-500',
        bicycle: 'bg-amber-600'
    }[event.type];

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative pl-14"
        >
            <div className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-4 ring-gray-50",
                color
            )} />

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
                        <Icon size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-gray-900">{event.title}</h4>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                ['done', 'picked_up'].includes(event.status) ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"
                            )}>
                                {event.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">{event.subtitle}</p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                        {event.timeLabel}
                    </span>
                    <p className="text-xs text-gray-400 font-bold mt-1">
                        {formatTimeInPacific(event.timestamp, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
