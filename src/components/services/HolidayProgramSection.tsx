'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import {
    Gift,
    Clock,
    Search,
    UserCheck,
    Users,
    Download,
    Plus,
    CheckCircle2,
    RotateCcw,
    MapPin,
    Phone,
    Share2,
    X,
    Filter,
    Edit3,
    FileSpreadsheet,
    QrCode,
    ShoppingBag,
    AlertCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
    useHolidayStore,
    selectHolidayMetrics,
    selectSlotCounts,
    selectFilteredHolidayRegistrations,
} from '@/stores/useHolidayStore';
import {
    HolidayRegistration,
    HolidayRegistrationInput,
    HolidayHousingStatus,
    HolidayIncomeRange,
    HolidayLanguage,
} from '@/types/holiday';
import {
    HOLIDAY_TIME_SLOTS,
    MAX_PARENTS_PER_HOLIDAY_SLOT,
    HOLIDAY_CITIES,
} from '@/lib/holiday/constants';
import {
    formatAgeGroupLabel,
    isTeen14Plus,
    getHolidayAgeGroup,
    calculateRecommendedCards,
} from '@/lib/holiday/ageGroups';
import { HolidayQRScannerModal } from '@/components/services/HolidayQRScannerModal';
import { HolidayShopperQRModal } from '@/components/services/HolidayShopperQRModal';
import toast from 'react-hot-toast';

export function HolidayProgramSection() {
    const searchInputId = useId();
    const walkinParentNameId = useId();
    const walkinPhoneId = useId();
    const walkinCityId = useId();
    const walkinHousingId = useId();
    const walkinIncomeId = useId();
    const walkinTimeSlotId = useId();
    const checkinGroceryCardsId = useId();
    const checkinTeenCardsId = useId();
    const checkinNotesId = useId();
    const editParentNameId = useId();
    const editPhoneId = useId();
    const editCityId = useId();
    const editHousingId = useId();
    const editIncomeId = useId();

    const { data: session } = useSession();
    const staffName = session?.user?.name || session?.user?.email || 'Staff';

    const {
        registrations,
        isLoading,
        isLoaded,
        ensureLoaded,
        loadFromSupabase,
        selectedSlotFilter,
        searchQuery,
        statusFilter,
        setSelectedSlotFilter,
        setSearchQuery,
        setStatusFilter,
        checkInRegistration,
        undoCheckIn,
        addWalkInRegistration,
        updateFamilyRegistration,
    } = useHolidayStore();

    useEffect(() => {
        void ensureLoaded();
    }, [ensureLoaded]);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible') void loadFromSupabase();
        };
        const onVisibilityChange = () => refresh();

        window.addEventListener('online', refresh);
        document.addEventListener('visibilitychange', onVisibilityChange);
        const interval = window.setInterval(refresh, 30_000);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('online', refresh);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [loadFromSupabase]);

    // Active modals
    const [checkInModalReg, setCheckInModalReg] = useState<HolidayRegistration | null>(null);
    const [checkInGroceryCards, setCheckInGroceryCards] = useState<number>(1);
    const [checkInTeenCards, setCheckInTeenCards] = useState<number>(0);
    const [checkInNotes, setCheckInNotes] = useState<string>('');

    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [clearTestRegistrations, setClearTestRegistrations] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [shopperQRModalReg, setShopperQRModalReg] = useState<HolidayRegistration | null>(null);

    const resetTicketCounter = useHolidayStore((s) => s.resetTicketCounter);

    // Walk-in form state
    const [walkInParentName, setWalkInParentName] = useState('');
    const [walkInPhone, setWalkInPhone] = useState('');
    const [walkInCity, setWalkInCity] = useState('Mountain View');
    const [walkInHousing, setWalkInHousing] = useState<HolidayHousingStatus>('house_apartment');
    const [walkInIncome, setWalkInIncome] = useState<HolidayIncomeRange>('0_40k');
    const [walkInSlot, setWalkInSlot] = useState<string>(HOLIDAY_TIME_SLOTS[0].id);
    const [walkInChildren, setWalkInChildren] = useState<
        Array<{ name: string; age: number; school: string }>
    >([{ name: '', age: 0, school: '' }]);

    const metrics = useMemo(() => selectHolidayMetrics(registrations), [registrations]);
    const slotCounts = useMemo(() => selectSlotCounts(registrations), [registrations]);
    const filteredRegistrations = useMemo(
        () =>
            selectFilteredHolidayRegistrations(
                registrations,
                searchQuery,
                selectedSlotFilter,
                statusFilter
            ),
        [registrations, searchQuery, selectedSlotFilter, statusFilter]
    );

    const openCheckInModal = (reg: HolidayRegistration) => {
        setCheckInModalReg(reg);
        const rec = calculateRecommendedCards(reg.children || []);
        setCheckInGroceryCards(reg.status === 'checked_in' ? reg.groceryCards : (reg.groceryCards || rec.groceryCards));
        setCheckInTeenCards(reg.status === 'checked_in' ? reg.teenCards : (reg.teenCards ?? rec.teenCards));
        setCheckInNotes(reg.notes || '');
    };

    const handleConfirmCheckIn = async () => {
        if (!checkInModalReg) return;
        const success = await checkInRegistration(checkInModalReg.id, {
            groceryCards: checkInGroceryCards,
            teenCards: checkInTeenCards,
            notes: checkInNotes,
            checkedInBy: staffName,
        });

        if (success) {
            toast.success(`Checked in Ticket #${checkInModalReg.ticketNumber} (${checkInModalReg.parentName})`);
            setCheckInModalReg(null);
        } else {
            toast.error('Failed to check in registration');
        }
    };

    const handleFastCheckIn = async (reg: HolidayRegistration): Promise<boolean> => {
        const rec = calculateRecommendedCards(reg.children || []);
        const grocery = reg.groceryCards || rec.groceryCards || 1;
        const teen = reg.teenCards ?? rec.teenCards ?? 0;
        return checkInRegistration(reg.id, {
            groceryCards: grocery,
            teenCards: teen,
            notes: reg.notes || '',
            checkedInBy: staffName,
        });
    };

    const handleUndoCheckIn = async (reg: HolidayRegistration) => {
        const success = await undoCheckIn(reg.id);
        if (success) {
            toast.success(`Check-in undone for Ticket #${reg.ticketNumber}`);
        } else {
            toast.error('Failed to undo check-in');
        }
    };

    const handleAddWalkInChild = () => {
        setWalkInChildren((prev) => [...prev, { name: '', age: 0, school: '' }]);
    };

    const handleRemoveWalkInChild = (idx: number) => {
        if (walkInChildren.length <= 1) return;
        setWalkInChildren((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleWalkInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!walkInParentName.trim()) {
            toast.error('Please enter parent name');
            return;
        }
        const phoneDigits = walkInPhone.replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        const input: HolidayRegistrationInput = {
            parentName: walkInParentName.trim(),
            phone: walkInPhone.trim(),
            city: walkInCity,
            housingStatus: walkInHousing,
            incomeRange: walkInIncome,
            timeSlot: walkInSlot,
            language: 'en' as HolidayLanguage,
            children: walkInChildren.map((c) => ({
                name: c.name.trim() || 'Child',
                age: c.age,
                school: c.school.trim() || undefined,
            })),
        };

        const res = await addWalkInRegistration(input);
        if (res) {
            toast.success(`Registered Ticket #${res.ticketNumber} for ${res.parentName}`);
            setIsWalkInModalOpen(false);
            setWalkInParentName('');
            setWalkInPhone('');
            setWalkInChildren([{ name: '', age: 0, school: '' }]);
        } else {
            toast.error('Failed to add walk-in registration');
        }
    };

    // Edit-registration form state (prefilled when the modal opens)
    const [editModalReg, setEditModalReg] = useState<HolidayRegistration | null>(null);
    const [editParentName, setEditParentName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editCity, setEditCity] = useState('Mountain View');
    const [editHousing, setEditHousing] = useState<HolidayHousingStatus>('house_apartment');
    const [editIncome, setEditIncome] = useState<HolidayIncomeRange>('0_40k');
    const [editChildren, setEditChildren] = useState<
        Array<{ name: string; age: number; birthdate: string; school: string }>
    >([{ name: '', age: 0, birthdate: '', school: '' }]);

    const openEditModal = (reg: HolidayRegistration) => {
        if (reg.status !== 'registered') {
            toast.error('Only registrations waiting for check-in can be edited');
            return;
        }
        setEditModalReg(reg);
        setEditParentName(reg.parentName);
        setEditPhone(reg.phone);
        setEditCity(reg.city);
        setEditHousing(reg.housingStatus);
        setEditIncome(reg.incomeRange);
        setEditChildren(
            (reg.children || []).map((c) => ({
                name: c.name,
                age: c.age,
                birthdate: c.birthdate || '',
                school: c.school || '',
            }))
        );
    };

    const handleAddEditChild = () => {
        setEditChildren((prev) => [...prev, { name: '', age: 0, birthdate: '', school: '' }]);
    };

    const handleRemoveEditChild = (idx: number) => {
        if (editChildren.length <= 1) return;
        setEditChildren((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModalReg) return;
        if (!editParentName.trim()) {
            toast.error('Please enter parent name');
            return;
        }
        const phoneDigits = editPhone.replace(/\D/g, '');
        if (!phoneDigits || phoneDigits.length !== 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        const input: HolidayRegistrationInput = {
            parentName: editParentName.trim(),
            phone: editPhone.trim(),
            city: editCity,
            housingStatus: editHousing,
            incomeRange: editIncome,
            timeSlot: editModalReg.timeSlot,
            language: editModalReg.language,
            children: editChildren.map((c) => ({
                name: c.name.trim() || 'Child',
                birthdate: c.birthdate || undefined,
                age: c.age,
                school: c.school.trim() || undefined,
            })),
        };

        const res = await updateFamilyRegistration(editModalReg.id, input);
        if (res) {
            toast.success(`Updated Ticket #${res.ticketNumber} (${res.parentName})`);
            setEditModalReg(null);
        } else {
            toast.error('Failed to update registration');
        }
    };

    const handleConfirmReset = async () => {
        setIsResetting(true);
        try {
            const res = await resetTicketCounter({
                clearRegistrations: clearTestRegistrations,
                targetNumber: 1,
            });
            if (res && res.success) {
                toast.success(
                    res.deletedRegistrations
                        ? `Cleared ${res.deletedRegistrations} test registration(s) and restarted ticket counter to #1`
                        : 'Ticket counter reset to #1'
                );
                setIsResetModalOpen(false);
            } else {
                toast.error('Failed to reset ticket counter');
            }
        } catch {
            toast.error('Error resetting ticket counter');
        } finally {
            setIsResetting(false);
        }
    };

    const handleExportCSV = () => {
        if (registrations.length === 0) {
            toast.error('No registrations to export');
            return;
        }

        const headers = [
            'Ticket #',
            'Parent / Guardian Name',
            'Phone',
            'City',
            'Housing Status',
            'Income Range',
            'Time Slot',
            '# of Infant (0-1)',
            '# of Toddler (1-4)',
            '# of child (5-12)',
            '# of Teen (13)',
            '# of Teen (14)',
            '# of Teen (15)',
            '# of Teen (16-18)',
            'Total Children',
            'Grocery Card',
            'Teen 14+ Cards',
            'Status',
            'Checked In At',
            'Checked In By',
            'Notes',
        ];

        const rows = registrations.map((r) => {
            const children = r.children || [];
            let infants = 0;
            let toddlers = 0;
            let childCount = 0;
            let t13 = 0;
            let t14 = 0;
            let t15 = 0;
            let t16_18 = 0;

            for (const c of children) {
                switch (c.ageGroup) {
                    case 'infant':
                        infants++;
                        break;
                    case 'toddler':
                        toddlers++;
                        break;
                    case 'child':
                        childCount++;
                        break;
                    case 'teen_13':
                        t13++;
                        break;
                    case 'teen_14':
                        t14++;
                        break;
                    case 'teen_15':
                        t15++;
                        break;
                    case 'teen_16_18':
                        t16_18++;
                        break;
                }
            }

            return [
                r.ticketNumber,
                `"${(r.parentName || '').replace(/"/g, '""')}"`,
                `"${r.phone || ''}"`,
                `"${r.city || ''}"`,
                `"${r.housingStatus || ''}"`,
                `"${r.incomeRange || ''}"`,
                `"${r.timeSlot || ''}"`,
                infants,
                toddlers,
                childCount,
                t13,
                t14,
                t15,
                t16_18,
                children.length,
                r.groceryCards || 0,
                r.teenCards || 0,
                r.status,
                r.checkedInAt ? new Date(r.checkedInAt).toLocaleString() : '',
                `"${(r.checkedInBy || '').replace(/"/g, '""')}"`,
                `"${(r.notes || '').replace(/"/g, '""')}"`,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `hopes_corner_holiday_toy_distribution_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Holiday distribution spreadsheet exported');
    };

    return (
        <div className="space-y-6">
            {/* Top Hub Banner */}
            <div className="relative overflow-hidden bg-emerald-950 rounded-2xl border border-emerald-800/40 shadow-sm">
                <div
                    className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 via-emerald-950/0 to-slate-900/60 pointer-events-none"
                    aria-hidden="true"
                />
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 px-5 sm:px-7 py-6">
                    <div className="max-w-xl space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-300/80">
                            <Gift className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                                Holiday Toy &amp; Gift Distribution Program
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                            Staff Event Management Hub
                        </h1>
                        <p className="text-sm text-emerald-100/60 leading-relaxed">
                            Manage parent check-ins, distribute grocery &amp; teen gift cards, and track toy inventory.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            type="button"
                            onClick={() => setIsScanModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                            title="Scan guest ticket QR code with camera or barcode scanner"
                        >
                            <QrCode className="w-4 h-4" />
                            <span>Scan Ticket QR</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsWalkInModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-100 border border-emerald-300/20 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Walk-In</span>
                        </button>
                        <div className="hidden sm:block w-px h-6 bg-white/10 mx-1" aria-hidden="true" />
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-emerald-100/80 hover:text-white border border-white/10 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                            title="Download distribution spreadsheet matching reporting format"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsShareModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-emerald-100/80 hover:text-white border border-white/10 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                            title="Share public sign-up link & QR code"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Public Link</span>
                            <span className="sm:hidden">Share</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsResetModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 hover:bg-rose-500/10 text-rose-300/70 hover:text-rose-200 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
                            title="Reset all test registrations and restart ticket sequence at #1"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset Test Data &amp; Ticket #1</span>
                            <span className="sm:hidden">Reset Test Data</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Stats Bar matching Image 2 breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Registered Families
                    </span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                        {metrics.totalRegistrations}
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold">
                        {metrics.checkedInCount} Checked In ({metrics.pendingCount} Pending)
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Total Children
                    </span>
                    <div className="text-2xl font-black text-purple-900 mt-1">
                        {metrics.totalChildrenCount}
                    </div>
                    <span className="text-xs text-purple-600 font-semibold">
                        {metrics.teen14PlusCount} Teens (14–18)
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Grocery Cards
                    </span>
                    <div className="text-2xl font-black text-emerald-900 mt-1">
                        {metrics.groceryCardsCount}
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold">Allocated / Logged</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Teen 14+ Gift Cards
                    </span>
                    <div className="text-2xl font-black text-amber-900 mt-1">
                        {metrics.teenCardsCount}
                    </div>
                    <span className="text-xs text-amber-700 font-semibold">Allocated / Logged</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-4 lg:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Children Age Breakdown
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-center">
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Infant (0-1)</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.infantsCount}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Toddler (1-4)</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.toddlersCount}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Child (5-12)</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.childrenCount}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Teen 13</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.teen13Count}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Teen 14</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.teen14Count}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Teen 15</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.teen15Count}</span>
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">Teen 16-18</span>
                            <span className="font-bold text-xs text-slate-900">{metrics.teen16To18Count}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Slot Filter Pills */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Time Slots (9:00 AM – 2:00 PM)
                    </span>
                    {selectedSlotFilter && (
                        <button
                            type="button"
                            onClick={() => setSelectedSlotFilter(null)}
                            className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold lowercase"
                        >
                            clear slot filter
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                        type="button"
                        onClick={() => setSelectedSlotFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedSlotFilter === null
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        All Slots ({metrics.totalRegistrations})
                    </button>
                    {HOLIDAY_TIME_SLOTS.map((s) => {
                        const count = slotCounts[s.id] || 0;
                        const isSelected = selectedSlotFilter === s.id;
                        const isFull = count >= MAX_PARENTS_PER_HOLIDAY_SLOT;

                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedSlotFilter(s.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${isSelected
                                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                                    : isFull
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                <span>{s.label}</span>
                                <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected
                                        ? 'bg-white/20 text-white'
                                        : isFull
                                            ? 'bg-rose-200 text-rose-900 font-extrabold'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                >
                                    {count}/{MAX_PARENTS_PER_HOLIDAY_SLOT}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Input & Quick Scan Button */}
                <div className="flex items-center gap-2 w-full sm:max-w-lg">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <label htmlFor={searchInputId} className="sr-only">
                            Search by ticket number, parent, phone, child, or city
                        </label>
                        <input
                            id={searchInputId}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by ticket #, parent, phone, child, city..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsScanModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-2xs"
                        title="Scan Ticket QR code"
                    >
                        <QrCode className="w-4 h-4" />
                        <span className="hidden sm:inline">Scan QR</span>
                    </button>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto justify-center">
                    {(['all', 'registered', 'checked_in'] as const).map((st) => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === st
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            {st === 'all' ? 'All' : st === 'registered' ? 'Registered / Waiting' : 'Checked In'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Registrations List / Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading && !isLoaded ? (
                    <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                        Loading registrations...
                    </div>
                ) : filteredRegistrations.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 space-y-2">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-sm">No registrations match your search / filter</p>
                        <p className="text-xs text-slate-400">Try changing the time slot or search terms.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Ticket</th>
                                        <th className="py-3 px-4">Shopper QR</th>
                                        <th className="py-3 px-4">Parent / Guardian</th>
                                        <th className="py-3 px-4">Contact &amp; City</th>
                                        <th className="py-3 px-4">Time Slot</th>
                                        <th className="py-3 px-4">Children Details</th>
                                        <th className="py-3 px-4 text-center">Cards</th>
                                        <th className="py-3 px-4">Notes</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRegistrations.map((reg) => {
                                        const isCheckedIn = reg.status === 'checked_in';
                                        const children = reg.children || [];

                                        return (
                                            <tr
                                                key={reg.id}
                                                className={`hover:bg-slate-50/80 transition-colors ${isCheckedIn ? 'bg-emerald-50/30' : ''
                                                    }`}
                                            >
                                                {/* Ticket # */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="font-mono font-black text-base text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                        #{reg.ticketNumber}
                                                    </span>
                                                </td>

                                                {/* Shopper QR */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShopperQRModalReg(reg)}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95"
                                                        title="Volunteer Shopper QR Code (Non-PII)"
                                                    >
                                                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                                                        <span>Shopper QR</span>
                                                    </button>
                                                </td>

                                                {/* Parent Name */}
                                                <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                    {reg.parentName}
                                                </td>

                                                {/* Contact & City */}
                                                <td className="py-3.5 px-4 text-xs space-y-0.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 text-slate-700">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{reg.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-500">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{reg.city}</span>
                                                    </div>
                                                </td>

                                                {/* Time Slot */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        <Clock className="w-3 h-3 text-slate-500" />
                                                        {reg.timeSlot}
                                                    </span>
                                                </td>

                                                {/* Children breakdown */}
                                                <td className="py-3.5 px-4 text-xs">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {children.map((child, cIdx) => (
                                                            <span
                                                                key={child.id || cIdx}
                                                                className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-medium text-[11px]"
                                                                title={`${child.name} (Age ${child.age})${child.school ? ` - ${child.school}` : ''}`}
                                                            >
                                                                <span>{child.name}</span>
                                                                <span className="text-purple-600 font-bold">({child.age}y)</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* Cards */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap text-xs">
                                                    <div className="space-y-0.5">
                                                        <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                                            {reg.groceryCards} Grocery
                                                        </span>
                                                        {reg.teenCards > 0 && (
                                                            <span className="inline-block bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded ml-1">
                                                                {reg.teenCards} Teen
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Notes */}
                                                <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                                                    {reg.notes || <span className="text-slate-300 italic">None</span>}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {isCheckedIn ? (
                                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Checked In
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold text-xs px-2.5 py-1 rounded-full">
                                                            Registered
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    {isCheckedIn ? (
                                                        <div className="inline-flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openCheckInModal(reg)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                                                title="Edit cards or notes"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUndoCheckIn(reg)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                title="Undo Check-In"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(reg)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                                                title="Edit registration (add or remove children)"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openCheckInModal(reg)}
                                                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                                                            >
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                <span>Check In</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards List */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {filteredRegistrations.map((reg) => {
                                const isCheckedIn = reg.status === 'checked_in';
                                const children = reg.children || [];

                                return (
                                    <div
                                        key={reg.id}
                                        data-testid={`mobile-reg-card-${reg.ticketNumber}`}
                                        className={`p-4 space-y-3 transition-colors ${isCheckedIn ? 'bg-emerald-50/40' : 'bg-white'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-black text-lg text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                    #{reg.ticketNumber}
                                                </span>
                                                <span className="font-bold text-slate-900 text-sm">{reg.parentName}</span>
                                            </div>
                                            <div>
                                                {isCheckedIn ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Checked In
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                                                        Registered
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-1 text-slate-700">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <a href={`tel:${reg.phone}`} className="font-medium hover:text-emerald-700 underline decoration-slate-300">
                                                    {reg.phone}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-700">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{reg.city}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-700 col-span-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="font-semibold">{reg.timeSlot}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                                Children ({children.length})
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {children.map((child, cIdx) => (
                                                    <span
                                                        key={child.id || cIdx}
                                                        className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-medium text-[11px]"
                                                        title={`${child.name} (Age ${child.age})${child.school ? ` - ${child.school}` : ''}`}
                                                    >
                                                        <span>{child.name}</span>
                                                        <span className="text-purple-600 font-bold">({child.age}y)</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                                    {reg.groceryCards} Grocery
                                                </span>
                                                {reg.teenCards > 0 && (
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">
                                                        {reg.teenCards} Teen
                                                    </span>
                                                )}
                                            </div>
                                            {reg.notes && (
                                                <span className="text-[11px] text-slate-500 italic truncate max-w-[180px]">
                                                    {reg.notes}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setShopperQRModalReg(reg)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
                                                title="View Volunteer Shopper QR Code (Non-PII)"
                                            >
                                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                                                <span>Shopper QR</span>
                                            </button>

                                            {isCheckedIn ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openCheckInModal(reg)}
                                                        className="p-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                                                        title="Edit cards or notes"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUndoCheckIn(reg)}
                                                        className="p-2.5 rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                                                        title="Undo Check-In"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-1 items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(reg)}
                                                        className="p-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                                                        title="Edit registration (add or remove children)"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openCheckInModal(reg)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        <span>Check In</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Check-In Modal Dialog */}
            {checkInModalReg && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="bg-emerald-800 text-white p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                                    Event Day Check-In
                                </div>
                                <h2 className="text-xl font-black mt-0.5">
                                    Ticket #{checkInModalReg.ticketNumber} – {checkInModalReg.parentName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCheckInModalReg(null)}
                                className="text-emerald-200 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Children Summary */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                                    Registered Children ({checkInModalReg.children?.length || 0})
                                </span>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto bg-slate-50">
                                    {checkInModalReg.children?.map((c, i) => (
                                        <div key={c.id || i} className="p-2.5 flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-bold text-slate-800">{c.name}</span>
                                                {c.school && <span className="text-[10px] text-slate-500 block">{c.school}</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                                                    {formatAgeGroupLabel(c.ageGroup)}
                                                </span>
                                                <span className="text-slate-600 font-semibold">Age {c.age}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card Distribution Controls */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor={checkinGroceryCardsId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Grocery Cards
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id={checkinGroceryCardsId}
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={checkInGroceryCards}
                                            onChange={(e) => setCheckInGroceryCards(parseInt(e.target.value, 10) || 0)}
                                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center font-bold text-base text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500">1 per family</span>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor={checkinTeenCardsId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Teen 14+ Cards
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id={checkinTeenCardsId}
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={checkInTeenCards}
                                            onChange={(e) => setCheckInTeenCards(parseInt(e.target.value, 10) || 0)}
                                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center font-bold text-base text-slate-900 focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500">1 per teen (ages 14-18)</span>
                                </div>
                            </div>

                            {/* Event Day Notes */}
                            <div className="space-y-1.5">
                                <label htmlFor={checkinNotesId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Event Day Notes / Card Serial Numbers
                                </label>
                                <textarea
                                    id={checkinNotesId}
                                    rows={3}
                                    value={checkInNotes}
                                    onChange={(e) => setCheckInNotes(e.target.value)}
                                    placeholder="Enter notes, gift card numbers, jacket pickup, or proxy details..."
                                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Dialog Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCheckInModalReg(null)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCheckIn}
                                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Complete Check-In</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Walk-In Registration Modal */}
            {isWalkInModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="bg-emerald-900 text-white p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                                    In-Person Walk-In
                                </div>
                                <h2 className="text-xl font-black mt-0.5">Register Family On-Site</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsWalkInModalOpen(false)}
                                className="text-emerald-200 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleWalkInSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={walkinParentNameId} className="block text-xs font-bold uppercase text-slate-600">
                                        Parent Name *
                                    </label>
                                    <input
                                        id={walkinParentNameId}
                                        type="text"
                                        required
                                        value={walkInParentName}
                                        onChange={(e) => setWalkInParentName(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={walkinPhoneId} className="block text-xs font-bold uppercase text-slate-600">
                                        Phone *
                                    </label>
                                    <input
                                        id={walkinPhoneId}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={14}
                                        required
                                        value={walkInPhone}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            if (digits.length <= 3) {
                                                setWalkInPhone(digits);
                                            } else if (digits.length <= 6) {
                                                setWalkInPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
                                            } else {
                                                setWalkInPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
                                            }
                                        }}
                                        placeholder="e.g. (650) 555-0123"
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={walkinCityId} className="block text-xs font-bold uppercase text-slate-600">City</label>
                                    <select
                                        id={walkinCityId}
                                        value={walkInCity}
                                        onChange={(e) => setWalkInCity(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        {HOLIDAY_CITIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={walkinHousingId} className="block text-xs font-bold uppercase text-slate-600">Housing</label>
                                    <select
                                        id={walkinHousingId}
                                        value={walkInHousing}
                                        onChange={(e) => setWalkInHousing(e.target.value as HolidayHousingStatus)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="house_apartment">House / Apartment</option>
                                        <option value="vehicle_rv_camper">Vehicle / RV / Camper</option>
                                        <option value="temp_shelter_motel">Temp Shelter / Motel</option>
                                        <option value="outside">Outside / Unhoused</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={walkinIncomeId} className="block text-xs font-bold uppercase text-slate-600">Income</label>
                                    <select
                                        id={walkinIncomeId}
                                        value={walkInIncome}
                                        onChange={(e) => setWalkInIncome(e.target.value as HolidayIncomeRange)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="0_40k">$0 - $40,000</option>
                                        <option value="41_65k">$41,000 - $65,000</option>
                                        <option value="66_90k">$66,000 - $90,000</option>
                                        <option value="over_90k">Over $90,000</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={walkinTimeSlotId} className="block text-xs font-bold uppercase text-slate-600">Time Slot</label>
                                    <select
                                        id={walkinTimeSlotId}
                                        value={walkInSlot}
                                        onChange={(e) => setWalkInSlot(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        {HOLIDAY_TIME_SLOTS.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Children */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase text-slate-700">Children</span>
                                    <button
                                        type="button"
                                        onClick={handleAddWalkInChild}
                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                                    >
                                        + Add Child
                                    </button>
                                </div>
                                {walkInChildren.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Child Name"
                                            required
                                            value={c.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setWalkInChildren((prev) => {
                                                    const n = [...prev];
                                                    n[i].name = val;
                                                    return n;
                                                });
                                            }}
                                            className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Age"
                                            min={0}
                                            max={18}
                                            required
                                            value={c.age}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10) || 0;
                                                setWalkInChildren((prev) => {
                                                    const n = [...prev];
                                                    n[i].age = val;
                                                    return n;
                                                });
                                            }}
                                            className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center text-slate-900"
                                        />
                                        {walkInChildren.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveWalkInChild(i)}
                                                className="text-slate-400 hover:text-rose-600 p-1"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsWalkInModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md"
                                >
                                    Save Walk-In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Registration Modal */}
            {editModalReg && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="bg-emerald-900 text-white p-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                                    Edit Registration
                                </div>
                                <h2 className="text-xl font-black mt-0.5">
                                    Ticket #{editModalReg.ticketNumber} – {editModalReg.timeSlot}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditModalReg(null)}
                                className="text-emerald-200 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={editParentNameId} className="block text-xs font-bold uppercase text-slate-600">
                                        Parent Name *
                                    </label>
                                    <input
                                        id={editParentNameId}
                                        type="text"
                                        required
                                        value={editParentName}
                                        onChange={(e) => setEditParentName(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={editPhoneId} className="block text-xs font-bold uppercase text-slate-600">
                                        Phone *
                                    </label>
                                    <input
                                        id={editPhoneId}
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={14}
                                        required
                                        value={editPhone}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            if (digits.length <= 3) {
                                                setEditPhone(digits);
                                            } else if (digits.length <= 6) {
                                                setEditPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
                                            } else {
                                                setEditPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
                                            }
                                        }}
                                        placeholder="e.g. (650) 555-0123"
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={editCityId} className="block text-xs font-bold uppercase text-slate-600">City</label>
                                    <select
                                        id={editCityId}
                                        value={HOLIDAY_CITIES.includes(editCity as (typeof HOLIDAY_CITIES)[number]) ? editCity : 'Other'}
                                        onChange={(e) => setEditCity(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        {HOLIDAY_CITIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor={editHousingId} className="block text-xs font-bold uppercase text-slate-600">Housing</label>
                                    <select
                                        id={editHousingId}
                                        value={editHousing}
                                        onChange={(e) => setEditHousing(e.target.value as HolidayHousingStatus)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="house_apartment">House / Apartment</option>
                                        <option value="vehicle_rv_camper">Vehicle / RV / Camper</option>
                                        <option value="temp_shelter_motel">Temp Shelter / Motel</option>
                                        <option value="outside">Outside / Unhoused</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor={editIncomeId} className="block text-xs font-bold uppercase text-slate-600">Income</label>
                                    <select
                                        id={editIncomeId}
                                        value={editIncome}
                                        onChange={(e) => setEditIncome(e.target.value as HolidayIncomeRange)}
                                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="0_40k">$0 - $40,000</option>
                                        <option value="41_65k">$41,000 - $65,000</option>
                                        <option value="66_90k">$66,000 - $90,000</option>
                                        <option value="over_90k">Over $90,000</option>
                                    </select>
                                </div>
                            </div>

                            {/* Children */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase text-slate-700">Children</span>
                                    <button
                                        type="button"
                                        onClick={handleAddEditChild}
                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
                                    >
                                        + Add Child
                                    </button>
                                </div>
                                {editChildren.map((c, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Child Name"
                                            required
                                            value={c.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditChildren((prev) => {
                                                    const n = [...prev];
                                                    n[i].name = val;
                                                    return n;
                                                });
                                            }}
                                            className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Age"
                                            min={0}
                                            max={18}
                                            required
                                            value={c.age}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10) || 0;
                                                setEditChildren((prev) => {
                                                    const n = [...prev];
                                                    n[i].age = val;
                                                    return n;
                                                });
                                            }}
                                            className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-center text-slate-900"
                                        />
                                        <input
                                            type="date"
                                            title="Birthdate"
                                            value={c.birthdate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditChildren((prev) => {
                                                    const n = [...prev];
                                                    n[i].birthdate = val;
                                                    return n;
                                                });
                                            }}
                                            className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                                        />
                                        {editChildren.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEditChild(i)}
                                                className="text-slate-400 hover:text-rose-600 p-1"
                                                title="Remove child"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <p className="text-[11px] text-slate-500">
                                    Ticket #{editModalReg.ticketNumber} and the arrival time stay the same. Gift cards update automatically.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditModalReg(null)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Public Form Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="inline-flex p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                            <QrCode className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Public Registration Link</h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Share this link with parents or print it out. The registration form is available in English, Spanish, and Mandarin.
                        </p>
                        <div className="bg-slate-100 p-3 rounded-xl font-mono text-xs text-slate-800 break-all select-all border border-slate-200">
                            {typeof window !== 'undefined' ? `${window.location.origin}/holiday` : '/holiday'}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        navigator.clipboard.writeText(`${window.location.origin}/holiday`);
                                        toast.success('Registration link copied to clipboard!');
                                    }
                                }}
                                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                            >
                                Copy Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Holiday Ticket QR Scanner Modal */}
            <HolidayQRScannerModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                onSelectRegistration={openCheckInModal}
                onFastCheckIn={handleFastCheckIn}
            />

            {/* Volunteer Shopper QR Modal */}
            <HolidayShopperQRModal
                isOpen={Boolean(shopperQRModalReg)}
                onClose={() => setShopperQRModalReg(null)}
                registration={shopperQRModalReg}
            />

            {/* Reset Ticket Counter Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
                        <div className="bg-rose-900 text-white p-6 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-800 text-rose-200">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
                                        Testing & Launch Setup
                                    </div>
                                    <h2 className="text-lg font-black leading-tight">
                                        Reset Test Data & Ticket Counter
                                    </h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isResetting && setIsResetModalOpen(false)}
                                className="text-rose-200 hover:text-white p-1 rounded-lg"
                                disabled={isResetting}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
                                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Clear Test Data & Restart at Ticket #1</span>
                                </p>
                                <p className="leading-relaxed">
                                    This clears all test family registrations, resets registration rate limits, and restarts the sequence so the next registration starts cleanly at <strong>Ticket #1</strong>.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={clearTestRegistrations}
                                    onChange={(e) => setClearTestRegistrations(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                    disabled={isResetting}
                                />
                                <div className="text-xs space-y-0.5">
                                    <span className="font-bold text-slate-900 block">
                                        Delete all test registrations
                                    </span>
                                    <span className="text-slate-500 block">
                                        Deletes all 2026 holiday registrations and children records from the database to avoid ticket number collisions.
                                    </span>
                                </div>
                            </label>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsResetModalOpen(false)}
                                    disabled={isResetting}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmReset}
                                    disabled={isResetting}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>{isResetting ? 'Resetting...' : 'Reset Test Data & Start at #1'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
