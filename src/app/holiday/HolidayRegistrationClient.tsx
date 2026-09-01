'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import {
    Gift,
    Calendar,
    Clock,
    Users,
    CheckCircle2,
    Printer,
    MapPin,
    AlertCircle,
    Plus,
    Trash2,
    Globe,
    Home,
    DollarSign,
    Sparkles,
} from 'lucide-react';
import {
    HolidayLanguage,
    HolidayHousingStatus,
    HolidayIncomeRange,
    HolidayRegistration,
    HolidayTimeSlotInfo,
} from '@/types/holiday';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import { HOLIDAY_CITIES, HOLIDAY_TIME_SLOTS, MAX_PARENTS_PER_HOLIDAY_SLOT } from '@/lib/holiday/constants';
import { calculateAge, getHolidayAgeGroup, formatAgeGroupLabel, isTeen14Plus } from '@/lib/holiday/ageGroups';

interface ChildFormState {
    id: string;
    name: string;
    birthdate: string;
    age: number;
    school: string;
}

export default function HolidayRegistrationClient() {
    const parentNameId = useId();
    const phoneId = useId();
    const cityId = useId();
    const otherCityId = useId();
    const housingId = useId();
    const incomeId = useId();

    const [language, setLanguage] = useState<HolidayLanguage>('en');
    const t = HOLIDAY_TRANSLATIONS[language];

    const [parentName, setParentName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>('Mountain View');
    const [otherCity, setOtherCity] = useState('');
    const [housingStatus, setHousingStatus] = useState<HolidayHousingStatus>('house_apartment');
    const [incomeRange, setIncomeRange] = useState<HolidayIncomeRange>('0_40k');
    const [website, setWebsite] = useState('');

    const [children, setChildren] = useState<ChildFormState[]>([
        { id: '1', name: '', birthdate: '', age: 0, school: '' },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [confirmedRegistration, setConfirmedRegistration] = useState<HolidayRegistration | null>(null);


    const handleAddChild = () => {
        setChildren((prev) => [
            ...prev,
            { id: String(Date.now()), name: '', birthdate: '', age: 0, school: '' },
        ]);
    };

    const handleRemoveChild = (index: number) => {
        if (children.length <= 1) return;
        setChildren((prev) => prev.filter((_, i) => i !== index));
    };

    const handleChildChange = (index: number, field: keyof ChildFormState, value: any) => {
        setChildren((prev) => {
            const next = [...prev];
            const item = { ...next[index], [field]: value };
            if (field === 'birthdate' && value) {
                item.age = calculateAge(value);
            }
            next[index] = item;
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        // Validation
        if (!parentName.trim()) {
            setErrorMessage(t.errors.parentNameRequired);
            return;
        }
        if (!phone.trim()) {
            setErrorMessage(t.errors.phoneRequired);
            return;
        }
        const effectiveCity = selectedCity === 'Other' ? otherCity.trim() : selectedCity;
        if (!effectiveCity) {
            setErrorMessage(t.errors.cityRequired);
            return;
        }
        if (children.length === 0) {
            setErrorMessage(t.errors.atLeastOneChild);
            return;
        }
        for (const child of children) {
            if (!child.name.trim()) {
                setErrorMessage(t.errors.childNameRequired);
                return;
            }
            if (child.age < 0 || child.age > 18) {
                setErrorMessage(t.errors.childAgeRange);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/holiday/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parentName: parentName.trim(),
                    phone: phone.trim(),
                    city: effectiveCity,
                    housingStatus,
                    incomeRange,
                    language,
                    website,
                    children: children.map((c) => ({
                        name: c.name.trim(),
                        birthdate: c.birthdate || undefined,
                        age: c.age,
                        school: c.school.trim() || undefined,
                    })),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMessage(data.error || t.errors.submissionFailed);
                setIsSubmitting(false);
                return;
            }

            setConfirmedRegistration(data.registration);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Submission exception:', err);
            setErrorMessage(t.errors.submissionFailed);
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleReset = () => {
        setConfirmedRegistration(null);
        setParentName('');
        setPhone('');
        setSelectedCity('Mountain View');
        setOtherCity('');
        setHousingStatus('house_apartment');
        setIncomeRange('0_40k');
        setWebsite('');
        setChildren([{ id: '1', name: '', birthdate: '', age: 0, school: '' }]);
        setErrorMessage(null);
    };


    if (confirmedRegistration) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
                    {/* Header banner */}
                    <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl" />
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md mb-3 shadow-inner">
                            <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{t.confirmationTitle}</h1>
                        <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-lg mx-auto">{t.confirmationSubtitle}</p>
                    </div>

                    {/* Ticket Body */}
                    <div className="p-6 sm:p-8 space-y-6">
                        {/* Big Ticket Number & Slot Badge */}
                        <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-6 text-center space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                {t.ticketNumberLabel}
                            </div>
                            <div className="text-5xl sm:text-6xl font-black text-emerald-950 font-mono tracking-tight">
                                #{confirmedRegistration.ticketNumber}
                            </div>
                            <div className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm sm:text-base font-bold shadow-sm">
                                <Clock className="w-4 h-4" />
                                <span>{confirmedRegistration.timeSlot}</span>
                            </div>
                        </div>

                        {/* Registration Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-slate-500 block text-xs font-semibold uppercase">{t.parentNameLabel}</span>
                                <span className="font-bold text-slate-800 text-base">{confirmedRegistration.parentName}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs font-semibold uppercase">{t.phoneLabel}</span>
                                <span className="font-bold text-slate-800 text-base">{confirmedRegistration.phone}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs font-semibold uppercase">{t.cityLabel}</span>
                                <span className="font-bold text-slate-800 text-base">{confirmedRegistration.city}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs font-semibold uppercase">{t.housingLabel}</span>
                                <span className="font-bold text-slate-800 text-base">
                                    {t.housingOptions[confirmedRegistration.housingStatus] || confirmedRegistration.housingStatus}
                                </span>
                            </div>
                        </div>

                        {/* Children List */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-700" />
                                {t.childrenRegisteredTitle} ({confirmedRegistration.children?.length || 0})
                            </h2>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                                {confirmedRegistration.children?.map((child, idx) => (
                                    <div key={child.id || idx} className="p-3.5 flex items-center justify-between text-sm hover:bg-slate-50">
                                        <div>
                                            <span className="font-bold text-slate-900">{child.name}</span>
                                            {child.school && <span className="text-xs text-slate-500 block">{child.school}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                                                {formatAgeGroupLabel(child.ageGroup)}
                                            </span>
                                            <span className="text-xs font-medium text-slate-600">Age {child.age}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Entitlements Summary */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                <Gift className="w-4 h-4 text-amber-700" />
                                {t.entitlementsTitle}
                            </h3>
                            <ul className="text-sm text-amber-950 space-y-1 font-medium">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{t.groceryCardEntitlement}</span>
                                </li>
                                {confirmedRegistration.teenCards > 0 && (
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>
                                            {confirmedRegistration.teenCards}x {t.teenCardEntitlement}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Location & Guidelines */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm text-slate-700">
                            <div className="flex items-start gap-2 font-medium text-slate-900">
                                <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold block">{t.eventLocationLabel}</span>
                                    <span className="text-xs text-slate-600">{t.eventLocationValue}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
                                <span className="font-bold text-slate-800">{t.importantNotesTitle}: </span>
                                {t.importantNotesText}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-98"
                            >
                                <Printer className="w-5 h-5" />
                                <span>{t.printTicketButton}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 px-6 rounded-xl transition-all"
                            >
                                {t.registerAnotherButton}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 py-6 sm:py-12 px-3 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Language Switcher Bar */}
                <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-3 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Globe className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.languageLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {(['en', 'es', 'zh'] as HolidayLanguage[]).map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => setLanguage(lang)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === lang
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : '中文 (Mandarin)'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hero Header */}
                <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-3 relative overflow-hidden shadow-2xl">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Gift className="w-4 h-4 text-emerald-400" />
                        <span>Hope&apos;s Corner Inc.</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                        {t.programTitle}
                    </h1>
                    <p className="text-emerald-200/90 text-sm sm:text-base font-medium max-w-xl mx-auto">
                        {t.registrationTitle}
                    </p>
                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-xs sm:text-sm text-amber-200 text-left flex items-start gap-3 mt-4">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">{t.registrationNotice}</p>
                    </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                        <label htmlFor="holiday-website">Website</label>
                        <input
                            id="holiday-website"
                            name="website"
                            type="text"
                            value={website}
                            onChange={(event) => setWebsite(event.target.value)}
                            autoComplete="off"
                            tabIndex={-1}
                        />
                    </div>
                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 p-4 rounded-2xl flex items-center gap-3 text-sm animate-shake">
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* 1. Parent/Guardian Section */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="border-b border-slate-800 pb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-400" />
                                {t.parentSectionTitle}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor={parentNameId} className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                    {t.parentNameLabel} <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    id={parentNameId}
                                    type="text"
                                    required
                                    value={parentName}
                                    onChange={(e) => setParentName(e.target.value)}
                                    placeholder={t.parentNamePlaceholder}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor={phoneId} className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                    {t.phoneLabel} <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    id={phoneId}
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder={t.phonePlaceholder}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className="space-y-1.5">
                            <label htmlFor={cityId} className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                                {t.cityLabel} <span className="text-rose-400">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {HOLIDAY_CITIES.map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => setSelectedCity(city)}
                                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${selectedCity === city
                                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                            {selectedCity === 'Other' && (
                                <input
                                    id={otherCityId}
                                    type="text"
                                    required
                                    value={otherCity}
                                    onChange={(e) => setOtherCity(e.target.value)}
                                    placeholder={t.otherCityPlaceholder}
                                    className="w-full mt-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                            )}
                        </div>

                        {/* Housing Status */}
                        <div className="space-y-2">
                            <label htmlFor={housingId} className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <Home className="w-4 h-4 text-emerald-400" />
                                {t.housingLabel}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(
                                    [
                                        'house_apartment',
                                        'vehicle_rv_camper',
                                        'temp_shelter_motel',
                                        'outside',
                                    ] as HolidayHousingStatus[]
                                ).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setHousingStatus(status)}
                                        className={`p-3 rounded-xl text-xs font-medium border text-left transition-all ${housingStatus === status
                                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {t.housingOptions[status]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Annual Income */}
                        <div className="space-y-2">
                            <label htmlFor={incomeId} className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-amber-400" />
                                {t.incomeLabel}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['0_40k', '41_65k', '66_90k', 'over_90k'] as HolidayIncomeRange[]).map((inc) => (
                                    <button
                                        key={inc}
                                        type="button"
                                        onClick={() => setIncomeRange(inc)}
                                        className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${incomeRange === inc
                                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {t.incomeOptions[inc]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 2. Children Information Section */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Gift className="w-5 h-5 text-pink-400" />
                                    {t.childSectionTitle}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">{t.childSectionSubtitle}</p>
                            </div>
                            <span className="text-xs font-bold bg-pink-950/80 border border-pink-500/30 text-pink-300 px-3 py-1 rounded-full">
                                {children.length} {children.length === 1 ? 'Child' : 'Children'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {children.map((child, index) => {
                                const ageGroup = getHolidayAgeGroup(child.age);
                                const isTeen = isTeen14Plus(child.age);
                                return (
                                    <div
                                        key={child.id}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 relative"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                                                    {index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                                    {t.childNumberLabel} #{index + 1}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                                    {formatAgeGroupLabel(ageGroup)}
                                                </span>
                                                {isTeen && (
                                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30">
                                                        Gift Card
                                                    </span>
                                                )}
                                                {children.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveChild(index)}
                                                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                                        title={t.removeChildButton}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="block text-xs text-slate-400 font-semibold">
                                                    {t.childNameLabel} <span className="text-rose-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={child.name}
                                                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                                    placeholder={t.childNamePlaceholder}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="block text-xs text-slate-400 font-semibold">
                                                        {t.childBirthdateLabel}
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={child.birthdate}
                                                        onChange={(e) => handleChildChange(index, 'birthdate', e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-xs text-slate-400 font-semibold">
                                                        {t.childAgeLabel} <span className="text-rose-400">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={18}
                                                        required
                                                        value={child.age}
                                                        onChange={(e) =>
                                                            handleChildChange(
                                                                index,
                                                                'age',
                                                                Math.max(0, Math.min(18, parseInt(e.target.value, 10) || 0))
                                                            )
                                                        }
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 space-y-1">
                                                <label className="block text-xs text-slate-400 font-semibold">
                                                    {t.childSchoolLabel}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={child.school}
                                                    onChange={(e) => handleChildChange(index, 'school', e.target.value)}
                                                    placeholder={t.childSchoolPlaceholder}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddChild}
                            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-emerald-950/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{t.addChildButton}</span>
                        </button>
                    </div>

                    {/* 3. Arrival Window Notice */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20 shrink-0 mt-0.5">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-base sm:text-lg font-bold text-white">
                                    {t.arrivalInfoTitle}
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                    {t.arrivalInfoNotice}
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-base sm:text-lg py-4 px-8 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-98"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t.submittingButton}</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                    <span>{t.submitButton}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
