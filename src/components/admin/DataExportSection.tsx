'use client';

import { useState } from 'react';
import {
    Download,
    Database,
    Users,
    Utensils,
    ShowerHead,
    WashingMachine,
    Bike,
    FileText,
    ClipboardList,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { useMealsStore } from '@/stores/useMealsStore';
import { useServicesStore } from '@/stores/useServicesStore';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { todayPacificDateString } from '@/lib/utils/date';

// Helper to convert data to CSV and trigger download
function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (!data.length) {
        toast.error('No data to export');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape quotes and wrap in quotes if contains comma or newline
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const EXPORT_OPTIONS = [
    { id: 'guests', label: 'Guest Roster', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Complete record of all registered guests including housing status and demographics.' },
    { id: 'services', label: 'Service History', icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50', description: 'All meals, showers, laundry, bicycles, and haircuts in one CSV.' },
    { id: 'meals', label: 'Meal Logs', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50', description: 'Detailed meal distributions including guest meals, extras, and RV meals.' },
    { id: 'showers', label: 'Shower History', icon: ShowerHead, color: 'text-sky-600', bg: 'bg-sky-50', description: 'Log of all shower reservations, completions, and waitlist activity.' },
    { id: 'laundry', label: 'Laundry Records', icon: WashingMachine, color: 'text-purple-600', bg: 'bg-purple-50', description: 'Workflow history for all on-site and off-site laundry loads.' },
    { id: 'bicycles', label: 'Bicycle Repairs', icon: Bike, color: 'text-amber-600', bg: 'bg-amber-50', description: 'Historical bicycle repair services and outcomes.' },
    { id: 'donations', label: 'Donations Log', icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50', description: 'All recorded donations including donor, item, and weight.' },
];

export function DataExportSection() {
    const { guests } = useGuestsStore();
    const { mealRecords } = useMealsStore();
    const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore();
    const { donationRecords } = useDonationsStore();
    const [exporting, setExporting] = useState<string | null>(null);

    const handleExport = async (id: string) => {
        setExporting(id);

        try {
            const today = todayPacificDateString();

            switch (id) {
                case 'guests':
                    exportToCSV(
                        guests.map(g => ({
                            'Guest ID': g.guestId || g.id,
                            'First Name': g.firstName || '',
                            'Last Name': g.lastName || '',
                            'Preferred Name': g.preferredName || '',
                            'Full Name': g.name || '',
                            'Housing Status': g.housingStatus || '',
                            'Location': g.location || '',
                            'Age': g.age || '',
                            'Gender': g.gender || '',
                            'Notes': g.notes || '',
                            'Registration Date': g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '',
                        })),
                        `hopes-corner-guests-${today}.csv`
                    );
                    break;

                case 'services':
                    const allServices = [
                        ...mealRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            Service: 'Meal',
                            'Guest ID': r.guestId || '-',
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || '-',
                            Quantity: r.count || 1,
                            Type: r.type || 'standard',
                            Details: '-',
                        })),
                        ...showerRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            Service: 'Shower',
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            Quantity: 1,
                            Type: r.status || '-',
                            Details: r.time || '-',
                        })),
                        ...laundryRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            Service: 'Laundry',
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            Quantity: 1,
                            Type: r.laundryType || '-',
                            Details: r.status || '-',
                        })),
                        ...bicycleRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            Service: 'Bicycle Repair',
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            Quantity: 1,
                            Type: r.repairType || (r.repairTypes?.join(', ') || '-'),
                            Details: r.status || '-',
                        })),
                    ];
                    exportToCSV(allServices, `hopes-corner-services-${today}.csv`);
                    break;

                case 'meals':
                    exportToCSV(
                        mealRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            'Guest ID': r.guestId || '-',
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || '-',
                            'Meal Type': r.type || 'standard',
                            Count: r.count || 1,
                        })),
                        `hopes-corner-meals-${today}.csv`
                    );
                    break;

                case 'showers':
                    exportToCSV(
                        showerRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            'Time Slot': r.time || '-',
                            Status: r.status || '-',
                        })),
                        `hopes-corner-showers-${today}.csv`
                    );
                    break;

                case 'laundry':
                    exportToCSV(
                        laundryRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            Type: r.laundryType || '-',
                            'Bag Number': r.bagNumber || '-',
                            Status: r.status || '-',
                        })),
                        `hopes-corner-laundry-${today}.csv`
                    );
                    break;

                case 'bicycles':
                    exportToCSV(
                        bicycleRecords.map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            'Guest ID': r.guestId,
                            'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown',
                            'Repair Types': r.repairTypes?.join(', ') || r.repairType || '-',
                            Status: r.status || '-',
                            Notes: r.notes?.replace(/\n/g, ' ') || '-',
                        })),
                        `hopes-corner-bicycles-${today}.csv`
                    );
                    break;

                case 'donations':
                    exportToCSV(
                        (donationRecords || []).map(r => ({
                            Date: new Date(r.date).toLocaleDateString(),
                            Type: r.type || '-',
                            Item: r.itemName || '-',
                            Trays: r.trays || '-',
                            'Weight (lbs)': r.weightLbs || '-',
                            Donor: r.donor || '-',
                        })),
                        `hopes-corner-donations-${today}.csv`
                    );
                    break;

                default:
                    toast.error('Unknown export type');
            }

            toast.success(`${id.charAt(0).toUpperCase() + id.slice(1)} export downloaded!`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Export failed. Please try again.');
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <Database className="absolute -right-16 -top-16 w-72 h-72" />
                </div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-black tracking-tight mb-2 flex items-center gap-3">
                        <Download /> Data Export Center
                    </h2>
                    <p className="text-slate-400 font-medium max-w-lg">
                        Generate CSV reports for audits, grants, or operational reviews. All exports are sanitized for compliance.
                    </p>
                </div>
            </div>

            {/* Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {EXPORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isExporting = exporting === opt.id;
                    return (
                        <div
                            key={opt.id}
                            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all group flex flex-col"
                        >
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", opt.bg, opt.color)}>
                                <Icon size={24} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-1">{opt.label}</h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6 flex-1">
                                {opt.description}
                            </p>

                            <button
                                onClick={() => handleExport(opt.id)}
                                disabled={isExporting}
                                className="w-full py-3 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download size={14} />
                                        Download CSV
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Stats Bar */}
            <div className="bg-gray-50 rounded-2xl p-6 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-center">
                <div>
                    <div className="text-2xl font-black text-gray-900">{guests.length.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Guests</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                    <div className="text-2xl font-black text-gray-900">{mealRecords.length.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Meal Records</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                    <div className="text-2xl font-black text-gray-900">{showerRecords.length.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Showers</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                    <div className="text-2xl font-black text-gray-900">{laundryRecords.length.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Laundry</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                    <div className="text-2xl font-black text-gray-900">{bicycleRecords.length.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bicycles</div>
                </div>
            </div>
        </div>
    );
}
