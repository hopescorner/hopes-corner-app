'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import {
    Gift,
    Clock,
    CheckCircle2,
    Printer,
    MapPin,
    AlertCircle,
    Plus,
    Trash2,
    Globe,
} from 'lucide-react';
import {
    HolidayLanguage,
    HolidayHousingStatus,
    HolidayIncomeRange,
    HolidayRegistration,
    HolidayTimeSlotInfo,
} from '@/types/holiday';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import { HOLIDAY_CITIES } from '@/lib/holiday/constants';
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
            <div data-testid="holiday-registration-page" className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:py-12">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6 flex items-center justify-center">
                        <Image
                            src="/hope-corner-logo-v2.svg"
                            alt="Hope's Corner"
                            width={172}
                            height={100}
                            className="h-16 w-auto"
                            priority
                        />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-7 text-center sm:px-8">
                            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t.confirmationTitle}</h1>
                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">{t.confirmationSubtitle}</p>
                        </div>

                        <div className="space-y-6 p-6 sm:p-8">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{t.ticketNumberLabel}</div>
                                <div className="mt-1 font-mono text-5xl font-bold tracking-tight text-emerald-950 sm:text-6xl">
                                    #{confirmedRegistration.ticketNumber}
                                </div>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white sm:text-base">
                                    <Clock className="h-4 w-4" />
                                    <span>{confirmedRegistration.timeSlot}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                                <div>
                                    <span className="block text-xs font-medium text-slate-500">{t.parentNameLabel}</span>
                                    <span className="mt-0.5 block font-semibold text-slate-900">{confirmedRegistration.parentName}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-medium text-slate-500">{t.phoneLabel}</span>
                                    <span className="mt-0.5 block font-semibold text-slate-900">{confirmedRegistration.phone}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-medium text-slate-500">{t.cityLabel}</span>
                                    <span className="mt-0.5 block font-semibold text-slate-900">{confirmedRegistration.city}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-medium text-slate-500">{t.housingLabel}</span>
                                    <span className="mt-0.5 block font-semibold text-slate-900">
                                        {t.housingOptions[confirmedRegistration.housingStatus] || confirmedRegistration.housingStatus}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                                    {t.childrenRegisteredTitle} ({confirmedRegistration.children?.length || 0})
                                </h2>
                                <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    {confirmedRegistration.children?.map((child, idx) => (
                                        <div key={child.id || idx} className="flex items-center justify-between gap-4 p-3.5 text-sm">
                                            <div>
                                                <span className="font-semibold text-slate-900">{child.name}</span>
                                                {child.school && <span className="block text-xs text-slate-500">{child.school}</span>}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                                                    {formatAgeGroupLabel(child.ageGroup)}
                                                </span>
                                                <span className="text-xs font-medium text-slate-600">Age {child.age}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                                    <Gift className="h-4 w-4 text-amber-700" />
                                    {t.entitlementsTitle}
                                </h3>
                                <ul className="space-y-1.5 text-sm text-amber-950">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                        <span>{t.groceryCardEntitlement}</span>
                                    </li>
                                    {confirmedRegistration.teenCards > 0 && (
                                        <li className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                            <span>{confirmedRegistration.teenCards}x {t.teenCardEntitlement}</span>
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <div className="flex items-start gap-2 text-slate-900">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <div>
                                        <span className="block font-semibold">{t.eventLocationLabel}</span>
                                        <span className="text-xs text-slate-600">{t.eventLocationValue}</span>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                                    <span className="font-semibold text-slate-800">{t.importantNotesTitle}: </span>
                                    {t.importantNotesText}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                                >
                                    <Printer className="h-5 w-5" />
                                    <span>{t.printTicketButton}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                                >
                                    {t.registerAnotherButton}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div data-testid="holiday-registration-page" className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-3xl space-y-5">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <Image
                        src="/hope-corner-logo-v2.svg"
                        alt="Hope's Corner"
                        width={155}
                        height={90}
                        className="h-14 w-auto"
                        priority
                    />
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="sr-only">{t.languageLabel}</span>
                        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" aria-label={t.languageLabel}>
                            {(['en', 'es', 'zh'] as HolidayLanguage[]).map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => setLanguage(lang)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${language === lang
                                        ? 'bg-emerald-700 text-white'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : '中文 (Mandarin)'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <header className="rounded-2xl border border-slate-200 border-t-4 border-t-emerald-700 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-sm font-semibold text-emerald-700">{t.registrationTitle}</p>
                    <h1 className="mt-2 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                        {t.programTitle}
                    </h1>
                    <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <p className="leading-6">{t.registrationNotice}</p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5">
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
                        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="border-b border-slate-200 pb-4">
                            <h2 className="text-xl font-semibold text-slate-950">{t.parentSectionTitle}</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor={parentNameId} className="block text-sm font-medium text-slate-700">
                                    {t.parentNameLabel} <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    id={parentNameId}
                                    type="text"
                                    required
                                    value={parentName}
                                    onChange={(e) => setParentName(e.target.value)}
                                    placeholder={t.parentNamePlaceholder}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor={phoneId} className="block text-sm font-medium text-slate-700">
                                    {t.phoneLabel} <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    id={phoneId}
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder={t.phonePlaceholder}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className="space-y-1.5">
                            <label htmlFor={cityId} className="block text-sm font-medium text-slate-700">
                                {t.cityLabel} <span className="text-rose-600">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {HOLIDAY_CITIES.map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => setSelectedCity(city)}
                                        className={`rounded-lg border px-3 py-2.5 text-center text-xs font-medium transition-colors ${selectedCity === city
                                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            )}
                        </div>

                        {/* Housing Status */}
                        <div className="space-y-2">
                            <label htmlFor={housingId} className="block text-sm font-medium text-slate-700">{t.housingLabel}</label>
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
                                        className={`rounded-lg border p-3 text-left text-xs font-medium transition-colors ${housingStatus === status
                                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {t.housingOptions[status]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Annual Income */}
                        <div className="space-y-2">
                            <label htmlFor={incomeId} className="block text-sm font-medium text-slate-700">{t.incomeLabel}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['0_40k', '41_65k', '66_90k', 'over_90k'] as HolidayIncomeRange[]).map((inc) => (
                                    <button
                                        key={inc}
                                        type="button"
                                        onClick={() => setIncomeRange(inc)}
                                        className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${incomeRange === inc
                                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {t.incomeOptions[inc]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">{t.childSectionTitle}</h2>
                                <p className="mt-1 text-sm text-slate-500">{t.childSectionSubtitle}</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                                        className="relative space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                                                    {index + 1}
                                                </span>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                                    {t.childNumberLabel} #{index + 1}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                                                    {formatAgeGroupLabel(ageGroup)}
                                                </span>
                                                {isTeen && (
                                                    <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                                                        Gift Card
                                                    </span>
                                                )}
                                                {children.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveChild(index)}
                                                        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                                        title={t.removeChildButton}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">
                                                    {t.childNameLabel} <span className="text-rose-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={child.name}
                                                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                                    placeholder={t.childNamePlaceholder}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="block text-sm font-medium text-slate-700">
                                                        {t.childBirthdateLabel}
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={child.birthdate}
                                                        onChange={(e) => handleChildChange(index, 'birthdate', e.target.value)}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-sm font-medium text-slate-700">
                                                        {t.childAgeLabel} <span className="text-rose-600">*</span>
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
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 space-y-1">
                                                <label className="block text-sm font-medium text-slate-700">
                                                    {t.childSchoolLabel}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={child.school}
                                                    onChange={(e) => handleChildChange(index, 'school', e.target.value)}
                                                    placeholder={t.childSchoolPlaceholder}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
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
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{t.addChildButton}</span>
                        </button>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                        <div className="flex items-start gap-3.5">
                            <div className="mt-0.5 shrink-0 rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                                    {t.arrivalInfoTitle}
                                </h2>
                                <p className="text-sm leading-6 text-slate-600">
                                    {t.arrivalInfoNotice}
                                </p>
                            </div>
                        </div>
                    </section>


                    {/* Submit Button */}
                    <div className="pb-6 pt-1">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-700 px-8 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{t.submittingButton}</span>
                                </>
                            ) : (
                                <span>{t.submitButton}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
