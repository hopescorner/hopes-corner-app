'use client';

import { useId, useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import {
    Clock,
    CheckCircle2,
    Printer,
    MapPin,
    AlertCircle,
    Plus,
    Trash2,
    Globe,
    Gift,
    Info,
    Download,
    FileText,
    CalendarDays,
    Search,
    X,
    Navigation,
    Tent,
    House,
    Hotel,
    Caravan,
    type LucideIcon,
} from 'lucide-react';
import {
    HolidayChild,
    HolidayLanguage,
    HolidayHousingStatus,
    HolidayIncomeRange,
    HolidayRegistration,
} from '@/types/holiday';
import { HOLIDAY_TRANSLATIONS } from '@/lib/holiday/translations';
import {
    HOLIDAY_CITIES,
    HOLIDAY_EVENT_YEAR,
    HOLIDAY_NO_SCHOOL_VALUE,
    MAX_PUBLIC_HOLIDAY_CHILDREN,
    getHolidayEventDate,
} from '@/lib/holiday/constants';
import { calculateAge, getHolidayAgeGroup } from '@/lib/holiday/ageGroups';
import { downloadTicketImage, downloadTicketPdf } from '@/lib/holiday/ticketImage';
import { formatHolidayPhone, normalizeHolidayPhoneDigits } from '@/lib/holiday/phone';
import { downloadHolidayEventIcs } from '@/lib/holiday/calendar';

interface ChildFormState {
    id: string;
    name: string;
    birthdate: string;
    age: number;
    school: string;
    notInSchool: boolean;
}

interface HolidayTicketLookupResult {
    ticketNumber: number;
    timeSlot: string;
    parentName: string;
    phone: string;
    city: string;
    childrenCount: number;
    language: HolidayLanguage;
    qrCodeDataUrl?: string;
}

type LookupStatus = 'idle' | 'searching' | 'not_found' | 'error';

// Icons matching the four main housing categories, mirroring HOUSING_STATUS_ICONS.
const HOUSING_OPTION_ICONS: Record<HolidayHousingStatus, LucideIcon> = {
    house_apartment: House,
    vehicle_rv_camper: Caravan,
    temp_shelter_motel: Hotel,
    outside: Tent,
};

const DRAFT_STORAGE_KEY = `holiday-registration-draft-${HOLIDAY_EVENT_YEAR}`;
const HOLIDAY_DIRECTIONS_URL =
    'https://www.google.com/maps/dir/?api=1&destination=748+Mercy+St,+Mountain+View,+CA+94041';

function toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function emptyChild(id: string): ChildFormState {
    return { id, name: '', birthdate: '', age: 0, school: '', notInSchool: false };
}

function resolveLanguage(value: unknown): HolidayLanguage {
    return value === 'en' || value === 'zh' || value === 'es' ? value : 'es';
}

export default function HolidayRegistrationClient() {
    const parentNameId = useId();
    const phoneId = useId();
    const otherCityId = useId();
    const childFieldsId = useId();
    const lookupParentNameId = useId();
    const lookupPhoneId = useId();

    const [language, setLanguage] = useState<HolidayLanguage>('es');
    const t = HOLIDAY_TRANSLATIONS[language];

    const [parentName, setParentName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>('Mountain View');
    const [otherCity, setOtherCity] = useState('');
    const [housingStatus, setHousingStatus] = useState<HolidayHousingStatus>('house_apartment');
    const [incomeRange, setIncomeRange] = useState<HolidayIncomeRange>('0_40k');
    const [website, setWebsite] = useState('');

    const [children, setChildren] = useState<ChildFormState[]>([emptyChild('1')]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorField, setErrorField] = useState<string | null>(null);
    const [childLimitNotice, setChildLimitNotice] = useState(false);
    const [confirmedRegistration, setConfirmedRegistration] = useState<HolidayRegistration | null>(null);
    const [isSavingImage, setIsSavingImage] = useState(false);
    const [isSavingPdf, setIsSavingPdf] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);

    const [lookupOpen, setLookupOpen] = useState(false);
    const [lookupParentName, setLookupParentName] = useState('');
    const [lookupPhone, setLookupPhone] = useState('');
    const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
    const [lookupMessage, setLookupMessage] = useState<string | null>(null);
    const [lookupResult, setLookupResult] = useState<HolidayTicketLookupResult | null>(null);

    const errorRef = useRef<HTMLDivElement | null>(null);
    const lastDuplicateCheckRef = useRef('');

    const now = new Date();
    const todayIso = toIsoDate(now);
    const minBirthdateIso = toIsoDate(
        new Date(now.getFullYear() - 19, now.getMonth(), now.getDate())
    );
    const eventDate = getHolidayEventDate(now);
    const eventDateLabel = eventDate
        ? new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(eventDate)
        : String(HOLIDAY_EVENT_YEAR);

    const childFieldId = (index: number, field: 'name' | 'birthdate' | 'age' | 'school') =>
        `${childFieldsId}-${field}-${index}`;

    const showError = (message: string, fieldId?: string) => {
        setErrorMessage(message);
        setErrorField(fieldId ?? null);
        if (fieldId) {
            window.setTimeout(() => document.getElementById(fieldId)?.focus(), 0);
        }
    };

    const clearError = () => {
        setErrorMessage(null);
        setErrorField(null);
    };

    // Keep our translated validation visible when the form is submitted from
    // the bottom of the page. Browser validation bubbles are disabled below.
    useEffect(() => {
        if (!errorMessage) return;
        const node = errorRef.current;
        if (node && typeof node.scrollIntoView === 'function') {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [errorMessage]);

    // Screen readers should pronounce the form in the selected language.
    useEffect(() => {
        const previous = document.documentElement.lang;
        document.documentElement.lang = language;
        return () => {
            document.documentElement.lang = previous;
        };
    }, [language]);

    // Restore an unfinished form from this device.
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
            if (raw) {
                const draft = JSON.parse(raw) as Record<string, unknown>;
                if (draft && typeof draft === 'object') {
                    setLanguage(resolveLanguage(draft.language));
                    if (typeof draft.parentName === 'string') setParentName(draft.parentName);
                    if (typeof draft.phone === 'string') setPhone(draft.phone);
                    if (typeof draft.selectedCity === 'string') setSelectedCity(draft.selectedCity);
                    if (typeof draft.otherCity === 'string') setOtherCity(draft.otherCity);
                    if (draft.housingStatus === 'house_apartment' || draft.housingStatus === 'vehicle_rv_camper' || draft.housingStatus === 'temp_shelter_motel' || draft.housingStatus === 'outside') {
                        setHousingStatus(draft.housingStatus);
                    }
                    if (draft.incomeRange === '0_40k' || draft.incomeRange === '41_65k' || draft.incomeRange === '66_90k' || draft.incomeRange === 'over_90k') {
                        setIncomeRange(draft.incomeRange);
                    }
                    if (Array.isArray(draft.children) && draft.children.length > 0) {
                        setChildren(
                            draft.children.slice(0, MAX_PUBLIC_HOLIDAY_CHILDREN).map((child, index) => {
                                const stored = (child ?? {}) as Record<string, unknown>;
                                return {
                                    id: typeof stored.id === 'string' ? stored.id : String(index + 1),
                                    name: typeof stored.name === 'string' ? stored.name : '',
                                    birthdate: typeof stored.birthdate === 'string' ? stored.birthdate : '',
                                    age: typeof stored.age === 'number' ? stored.age : 0,
                                    school: typeof stored.school === 'string' ? stored.school : '',
                                    notInSchool: Boolean(stored.notInSchool),
                                };
                            })
                        );
                    }
                }
            }
        } catch {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        } finally {
            setDraftLoaded(true);
        }
    }, []);

    // Save the draft as the family types so a refresh or accidental back does
    // not lose a long form.
    useEffect(() => {
        if (!draftLoaded || confirmedRegistration) return;
        try {
            window.localStorage.setItem(
                DRAFT_STORAGE_KEY,
                JSON.stringify({
                    language,
                    parentName,
                    phone,
                    selectedCity,
                    otherCity,
                    housingStatus,
                    incomeRange,
                    children,
                })
            );
        } catch {
            // Storage can be unavailable in private mode; the form still works.
        }
    }, [
        draftLoaded,
        confirmedRegistration,
        language,
        parentName,
        phone,
        selectedCity,
        otherCity,
        housingStatus,
        incomeRange,
        children,
    ]);

    useEffect(() => {
        if (!confirmedRegistration) return;
        void downloadTicketImage(
            {
                ticketNumber: confirmedRegistration.ticketNumber,
                timeSlot: confirmedRegistration.timeSlot,
                parentName: confirmedRegistration.parentName,
                phone: confirmedRegistration.phone,
                city: confirmedRegistration.city,
                qrCodeDataUrl: confirmedRegistration.qrCodeDataUrl,
                childrenCount: confirmedRegistration.children?.length || 0,
                language: confirmedRegistration.language,
            },
            { auto: true }
        );
    }, [confirmedRegistration]);

    const handleDownloadImage = async () => {
        if (!confirmedRegistration || isSavingImage) return;
        setIsSavingImage(true);
        try {
            await downloadTicketImage(
                {
                    ticketNumber: confirmedRegistration.ticketNumber,
                    timeSlot: confirmedRegistration.timeSlot,
                    parentName: confirmedRegistration.parentName,
                    phone: confirmedRegistration.phone,
                    city: confirmedRegistration.city,
                    qrCodeDataUrl: confirmedRegistration.qrCodeDataUrl,
                    childrenCount: confirmedRegistration.children?.length || 0,
                    language: confirmedRegistration.language,
                },
                { auto: false }
            );
        } finally {
            setIsSavingImage(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!confirmedRegistration || isSavingPdf) return;
        setIsSavingPdf(true);
        try {
            await downloadTicketPdf({
                ticketNumber: confirmedRegistration.ticketNumber,
                timeSlot: confirmedRegistration.timeSlot,
                parentName: confirmedRegistration.parentName,
                phone: confirmedRegistration.phone,
                city: confirmedRegistration.city,
                qrCodeDataUrl: confirmedRegistration.qrCodeDataUrl,
                childrenCount: confirmedRegistration.children?.length || 0,
                language: confirmedRegistration.language,
            });
        } finally {
            setIsSavingPdf(false);
        }
    };

    const handleAddChild = () => {
        if (children.length >= MAX_PUBLIC_HOLIDAY_CHILDREN) {
            setChildLimitNotice(true);
            return;
        }
        setChildLimitNotice(false);
        setChildren((prev) => [
            ...prev,
            emptyChild(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())),
        ]);
    };

    const handlePhoneChange = (val: string) => {
        setDuplicateWarning(false);
        setPhone(formatHolidayPhone(val));
    };

    const handlePhoneBlur = async () => {
        const digits = normalizeHolidayPhoneDigits(phone);
        if (digits.length !== 10 || lastDuplicateCheckRef.current === digits) return;

        lastDuplicateCheckRef.current = digits;
        try {
            const res = await fetch('/api/holiday/duplicate-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, language }),
            });
            if (!res.ok) {
                lastDuplicateCheckRef.current = '';
                return;
            }
            const data = await res.json();
            setDuplicateWarning(Boolean(data.exists));
        } catch {
            lastDuplicateCheckRef.current = '';
        }
    };

    const handleRemoveChild = (index: number) => {
        if (children.length <= 1) return;
        setChildLimitNotice(false);
        setChildren((prev) => prev.filter((_, i) => i !== index));
    };

    const handleChildChange = (index: number, field: keyof ChildFormState, value: any) => {
        setChildren((prev) => {
            const next = [...prev];
            const item = { ...next[index], [field]: value };
            if (field === 'birthdate' && value) {
                // Uncapped so over-age children are detected at submit time
                item.age = calculateAge(value, new Date(), 120);
            }
            next[index] = item;
            return next;
        });
    };

    const handleNotInSchoolChange = (index: number, checked: boolean) => {
        setChildren((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                notInSchool: checked,
                school: checked ? HOLIDAY_NO_SCHOOL_VALUE : '',
            };
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        // Validation
        if (!parentName.trim()) {
            showError(t.errors.parentNameRequired, parentNameId);
            return;
        }
        const phoneDigits = normalizeHolidayPhoneDigits(phone);
        if (!phoneDigits || phoneDigits.length !== 10) {
            showError(t.errors.phoneRequired, phoneId);
            return;
        }
        const effectiveCity = selectedCity === 'Other' ? otherCity.trim() : selectedCity;
        if (!effectiveCity) {
            showError(t.errors.cityRequired, otherCityId);
            return;
        }
        if (children.length === 0) {
            showError(t.errors.atLeastOneChild);
            return;
        }
        if (children.length > MAX_PUBLIC_HOLIDAY_CHILDREN) {
            showError(t.errors.childLimitReached);
            return;
        }
        for (const [index, child] of children.entries()) {
            if (!child.name.trim()) {
                showError(t.errors.childNameRequired, childFieldId(index, 'name'));
                return;
            }
            if (!child.birthdate || !child.birthdate.trim()) {
                showError(t.errors.childBirthdateRequired, childFieldId(index, 'birthdate'));
                return;
            }
            if (child.birthdate > todayIso) {
                showError(t.errors.childBirthdateInvalid, childFieldId(index, 'birthdate'));
                return;
            }
            if (!child.notInSchool && !child.school.trim()) {
                showError(t.errors.childSchoolRequired, childFieldId(index, 'school'));
                return;
            }
            if (child.age < 0) {
                showError(t.errors.childAgeRange, childFieldId(index, 'birthdate'));
                return;
            }
            if (child.age > 18) {
                const name = child.name.trim() || 'This child';
                showError(t.errors.childOverAge.replace('{name}', name), childFieldId(index, 'birthdate'));
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
                        school: c.notInSchool ? HOLIDAY_NO_SCHOOL_VALUE : c.school.trim(),
                    })),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                showError(data.error || t.errors.submissionFailed);
                setIsSubmitting(false);
                return;
            }

            try {
                window.localStorage.removeItem(DRAFT_STORAGE_KEY);
            } catch {
                // Ignore storage failures.
            }
            setConfirmedRegistration(data.registration);
            if (data.registration?.language) {
                setLanguage(data.registration.language);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Submission exception:', err);
            showError(t.errors.submissionFailed);
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
        setChildren([emptyChild('1')]);
        setErrorMessage(null);
        setErrorField(null);
        setChildLimitNotice(false);
        setDuplicateWarning(false);
        lastDuplicateCheckRef.current = '';
        try {
            window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            // Ignore storage failures.
        }
    };

    const closeLookup = () => {
        setLookupOpen(false);
        setLookupResult(null);
        setLookupStatus('idle');
        setLookupMessage(null);
        setLookupParentName('');
        setLookupPhone('');
    };

    const openLookup = () => {
        if (!lookupParentName && parentName) setLookupParentName(parentName);
        if (!lookupPhone && phone) setLookupPhone(phone);
        setLookupOpen(true);
    };

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLookupResult(null);
        setLookupMessage(null);

        const digits = normalizeHolidayPhoneDigits(lookupPhone);
        if (digits.length !== 10 || !lookupParentName.trim()) {
            setLookupStatus('error');
            setLookupMessage(t.findTicketMissingFields);
            return;
        }

        setLookupStatus('searching');
        try {
            const res = await fetch('/api/holiday/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: lookupPhone,
                    parentName: lookupParentName.trim(),
                    language,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setLookupStatus(res.status === 404 ? 'not_found' : 'error');
                setLookupMessage(data.error || t.findTicketError);
                return;
            }
            setLookupResult(data.registration as HolidayTicketLookupResult);
            setLookupStatus('idle');
        } catch {
            setLookupStatus('error');
            setLookupMessage(t.findTicketError);
        }
    };

    const lookupLanguage = lookupResult?.language ?? language;
    const lookupT = HOLIDAY_TRANSLATIONS[lookupLanguage];

    const handleDownloadLookupImage = async () => {
        if (!lookupResult) return;
        await downloadTicketImage({
            ticketNumber: lookupResult.ticketNumber,
            timeSlot: lookupResult.timeSlot,
            parentName: lookupResult.parentName,
            phone: lookupResult.phone,
            city: lookupResult.city,
            qrCodeDataUrl: lookupResult.qrCodeDataUrl,
            childrenCount: lookupResult.childrenCount,
            language: lookupResult.language,
        });
    };

    const handleDownloadLookupPdf = async () => {
        if (!lookupResult) return;
        await downloadTicketPdf({
            ticketNumber: lookupResult.ticketNumber,
            timeSlot: lookupResult.timeSlot,
            parentName: lookupResult.parentName,
            phone: lookupResult.phone,
            city: lookupResult.city,
            qrCodeDataUrl: lookupResult.qrCodeDataUrl,
            childrenCount: lookupResult.childrenCount,
            language: lookupResult.language,
        });
    };

    if (confirmedRegistration) {
        const confirmedChild = (child: HolidayChild) =>
            child.school === HOLIDAY_NO_SCHOOL_VALUE ? t.childNotInSchoolLabel : child.school;

        return (
            <div data-testid="holiday-registration-page" className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8 sm:py-12 print:bg-white print:py-0">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6 flex items-center justify-center print:hidden">
                        <Image
                            src="/hope-corner-logo-v2.svg"
                            alt="Hope's Corner"
                            width={172}
                            height={100}
                            className="h-16 w-auto"
                            priority
                        />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none">
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

                                {confirmedRegistration.qrCodeDataUrl && (
                                    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-white p-4 text-center shadow-xs">
                                        <div className="relative h-44 w-44 overflow-hidden rounded-lg border border-slate-100 bg-white p-1">
                                            <Image
                                                src={confirmedRegistration.qrCodeDataUrl}
                                                alt={t.ticketQrTitle}
                                                width={176}
                                                height={176}
                                                className="h-full w-full object-contain"
                                                unoptimized
                                            />
                                        </div>
                                        <span className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                                            {t.ticketQrTitle}
                                        </span>
                                        <span className="mt-0.5 max-w-xs text-[11px] text-slate-500">
                                            {t.ticketQrSubtitle}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 print:hidden">
                                <p className="flex items-start gap-2 text-sm leading-6 text-emerald-950">
                                    <Download className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <span>{t.autoSaveNotice}</span>
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadImage}
                                        disabled={isSavingImage}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-800 active:scale-95 disabled:opacity-50"
                                    >
                                        <Download className="h-4 w-4" />
                                        <span>{isSavingImage ? t.savingAction : t.downloadImageButton}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadPdf}
                                        disabled={isSavingPdf}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 bg-white px-5 py-3.5 text-sm font-bold text-emerald-900 transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span>{isSavingPdf ? t.generatingAction : t.downloadPdfButton}</span>
                                    </button>
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
                                                {child.school && <span className="block text-xs text-slate-500">{confirmedChild(child)}</span>}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                                                    {t.ageGroupLabels[child.ageGroup]}
                                                </span>
                                                <span className="text-xs font-medium text-slate-600">{t.childAgeShortLabel} {child.age}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <div className="flex items-start gap-2 text-slate-900">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <div>
                                        <span className="block font-semibold">{t.eventLocationLabel}</span>
                                        <span className="text-xs text-slate-600">{t.eventLocationValue}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-slate-900">
                                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                    <div>
                                        <span className="block font-semibold">{eventDate ? t.eventDateLabel : t.eventYearLabel}</span>
                                        <span className="text-xs text-slate-600">{eventDate ? eventDateLabel : String(HOLIDAY_EVENT_YEAR)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1 print:hidden">
                                    {eventDate && (
                                        <button
                                            type="button"
                                            onClick={() => downloadHolidayEventIcs(language, eventDate)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                                        >
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {t.addToCalendarButton}
                                        </button>
                                    )}
                                    <a
                                        href={HOLIDAY_DIRECTIONS_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Navigation className="h-3.5 w-3.5" />
                                        {t.directionsButton}
                                    </a>
                                </div>
                                <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                                    <span className="font-semibold text-slate-800">{t.importantNotesTitle}: </span>
                                    {t.importantNotesText}
                                </div>
                            </div>

                            <div className="space-y-3 pt-1">
                                <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <Printer className="h-4 w-4" />
                                        <span>{t.printTicketButton}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        {t.registerAnotherButton}
                                    </button>
                                </div>
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
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={openLookup}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                        >
                            <Search className="h-3.5 w-3.5" />
                            {t.findTicketButton}
                        </button>
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="sr-only">{t.languageLabel}</span>
                            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" aria-label={t.languageLabel}>
                                {(['en', 'es', 'zh'] as HolidayLanguage[]).map((lang) => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => setLanguage(lang)}
                                        aria-pressed={language === lang}
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
                </div>

                <header className="rounded-2xl border border-slate-200 border-t-4 border-t-emerald-700 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <Gift className="h-4 w-4" data-testid="holiday-gift-icon" />
                        </span>
                        <p className="text-sm font-semibold text-emerald-700">{t.registrationTitle}</p>
                    </div>
                    <h1 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                        {t.programTitle}
                    </h1>
                    <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <p className="leading-6">{t.registrationNotice}</p>
                    </div>
                </header>

                {/* Helpful Instructions & How It Works */}
                <section aria-labelledby="instructions-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                    <Image
                        src="/toy-drive-explainer.png"
                        alt={t.howItWorksImageAlt}
                        width={2170}
                        height={725}
                        className="h-auto w-full rounded-xl"
                        data-testid="how-it-works-illustration"
                    />
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                            <Info className="h-3.5 w-3.5" />
                        </span>
                        <h2 id="instructions-heading" className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                            {t.howItWorksTitle}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-black text-xs">
                                    1
                                </span>
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900">{t.step1Title}</h3>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed pl-8">
                                {t.step1Desc}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-black text-xs">
                                    2
                                </span>
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900">{t.step2Title}</h3>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed pl-8">
                                {t.step2Desc}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-black text-xs">
                                    3
                                </span>
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900">{t.step3Title}</h3>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed pl-8">
                                {t.step3Desc}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-2">
                        <h3 className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                            {t.guidelinesTitle}
                        </h3>
                        <ul className="text-xs text-emerald-900/90 space-y-1 list-disc pl-4 leading-relaxed">
                            <li>{t.guidelineScreenshot}</li>
                            <li>{t.guidelineArrival}</li>
                            <li>{t.guidelineHousehold}</li>
                        </ul>
                    </div>
                </section>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                        <div id="holiday-form-error" ref={errorRef} className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
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
                                    autoComplete="name"
                                    value={parentName}
                                    onChange={(e) => setParentName(e.target.value)}
                                    placeholder={t.parentNamePlaceholder}
                                    aria-invalid={errorField === parentNameId || undefined}
                                    aria-describedby={errorField === parentNameId ? 'holiday-form-error' : undefined}
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
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    maxLength={20}
                                    required
                                    value={phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    onBlur={handlePhoneBlur}
                                    placeholder={t.phonePlaceholder}
                                    aria-invalid={errorField === phoneId || undefined}
                                    aria-describedby={errorField === phoneId ? 'holiday-form-error' : undefined}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                                {duplicateWarning && (
                                    <p role="status" className="flex items-start gap-1.5 text-xs leading-5 text-amber-800">
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        {t.duplicateWarning}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* City */}
                        <fieldset className="space-y-1.5">
                            <legend className="block text-sm font-medium text-slate-700">
                                {t.cityLabel} <span className="text-rose-600">*</span>
                            </legend>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {HOLIDAY_CITIES.map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => setSelectedCity(city)}
                                        aria-pressed={selectedCity === city}
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
                                    aria-invalid={errorField === otherCityId || undefined}
                                    aria-describedby={errorField === otherCityId ? 'holiday-form-error' : undefined}
                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                />
                            )}
                        </fieldset>

                        {/* Housing Status */}
                        <fieldset className="space-y-2">
                            <legend className="block text-sm font-medium text-slate-700">{t.housingLabel}</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(
                                    [
                                        'house_apartment',
                                        'vehicle_rv_camper',
                                        'temp_shelter_motel',
                                        'outside',
                                    ] as HolidayHousingStatus[]
                                ).map((status) => {
                                    const HousingOptionIcon = HOUSING_OPTION_ICONS[status];
                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setHousingStatus(status)}
                                            aria-pressed={housingStatus === status}
                                            className={`flex items-center gap-2 rounded-lg border p-3 text-left text-xs font-medium transition-colors ${housingStatus === status
                                                ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            <HousingOptionIcon size={18} className="shrink-0 opacity-70" aria-hidden="true" />
                                            <span>{t.housingOptions[status]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {/* Annual Income */}
                        <fieldset className="space-y-2">
                            <legend className="block text-sm font-medium text-slate-700">{t.incomeLabel}</legend>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {(['0_40k', '41_65k', '66_90k', 'over_90k'] as HolidayIncomeRange[]).map((inc) => (
                                    <button
                                        key={inc}
                                        type="button"
                                        onClick={() => setIncomeRange(inc)}
                                        aria-pressed={incomeRange === inc}
                                        className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${incomeRange === inc
                                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {t.incomeOptions[inc]}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    </section>

                    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-950">{t.childSectionTitle}</h2>
                                <p className="mt-1 text-sm text-slate-500">{t.childSectionSubtitle}</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {(children.length === 1 ? t.childCountOne : t.childCountMany).replace('{count}', String(children.length))}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {children.map((child, index) => {
                                const ageGroup = getHolidayAgeGroup(child.age);
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
                                                    {t.ageGroupLabels[ageGroup]}
                                                </span>
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
                                                <label htmlFor={childFieldId(index, 'name')} className="block text-sm font-medium text-slate-700">
                                                    {t.childNameLabel} <span className="text-rose-600">*</span>
                                                </label>
                                                <input
                                                    id={childFieldId(index, 'name')}
                                                    type="text"
                                                    required
                                                    value={child.name}
                                                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                                                    placeholder={t.childNamePlaceholder}
                                                    aria-invalid={errorField === childFieldId(index, 'name') || undefined}
                                                    aria-describedby={errorField === childFieldId(index, 'name') ? 'holiday-form-error' : undefined}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label htmlFor={childFieldId(index, 'birthdate')} className="block text-sm font-medium text-slate-700">
                                                        {t.childBirthdateLabel} <span className="text-rose-600">*</span>
                                                    </label>
                                                    <input
                                                        id={childFieldId(index, 'birthdate')}
                                                        type="date"
                                                        required
                                                        autoComplete="bday"
                                                        min={minBirthdateIso}
                                                        max={todayIso}
                                                        value={child.birthdate}
                                                        onChange={(e) => handleChildChange(index, 'birthdate', e.target.value)}
                                                        aria-invalid={errorField === childFieldId(index, 'birthdate') || undefined}
                                                        aria-describedby={errorField === childFieldId(index, 'birthdate') ? 'holiday-form-error' : undefined}
                                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label htmlFor={childFieldId(index, 'age')} className="block text-sm font-medium text-slate-700">
                                                        {t.childAgeLabel}
                                                    </label>
                                                    <input
                                                        id={childFieldId(index, 'age')}
                                                        type="text"
                                                        readOnly
                                                        tabIndex={-1}
                                                        value={child.birthdate ? `${child.age}` : '—'}
                                                        aria-label={`${t.childAgeLabel}: ${child.birthdate ? child.age : '—'}`}
                                                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-700 select-none cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 space-y-1">
                                                <label htmlFor={childFieldId(index, 'school')} className="block text-sm font-medium text-slate-700">
                                                    {t.childSchoolLabel} <span className="text-rose-600">*</span>
                                                </label>
                                                <input
                                                    id={childFieldId(index, 'school')}
                                                    type="text"
                                                    required={!child.notInSchool}
                                                    disabled={child.notInSchool}
                                                    value={child.notInSchool ? '' : child.school}
                                                    onChange={(e) => handleChildChange(index, 'school', e.target.value)}
                                                    placeholder={t.childSchoolPlaceholder}
                                                    aria-invalid={errorField === childFieldId(index, 'school') || undefined}
                                                    aria-describedby={errorField === childFieldId(index, 'school') ? 'holiday-form-error' : undefined}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                />
                                                <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={child.notInSchool}
                                                        onChange={(e) => handleNotInSchoolChange(index, e.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                                    />
                                                    {t.childNotInSchoolLabel}
                                                </label>
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

                        {childLimitNotice && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                            >
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                                <span>{t.errors.childLimitReached}</span>
                            </div>
                        )}
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

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                                {t.privacyNoticeTitle}
                            </h2>
                            <p className="text-sm leading-6 text-slate-600">
                                {t.privacyNotice}
                            </p>
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

            {/* Find My Ticket */}
            {lookupOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="holiday-lookup-title"
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <div className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-emerald-700" />
                                <h2 id="holiday-lookup-title" className="text-lg font-bold text-slate-950">{t.findTicketTitle}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeLookup}
                                aria-label={t.findTicketCloseButton}
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {lookupResult ? (
                            <div className="space-y-4 p-5">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{lookupT.ticketNumberLabel}</div>
                                    <div className="mt-1 font-mono text-4xl font-bold text-emerald-950">#{lookupResult.ticketNumber}</div>
                                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white">
                                        <Clock className="h-4 w-4" />
                                        <span>{lookupResult.timeSlot}</span>
                                    </div>
                                    {lookupResult.qrCodeDataUrl && (
                                        <div className="mx-auto mt-4 h-40 w-40 overflow-hidden rounded-lg border border-emerald-200 bg-white p-1">
                                            <Image
                                                src={lookupResult.qrCodeDataUrl}
                                                alt={lookupT.ticketQrTitle}
                                                width={160}
                                                height={160}
                                                className="h-full w-full object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={handleDownloadLookupImage}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
                                    >
                                        <Download className="h-4 w-4" />
                                        {lookupT.downloadImageButton}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadLookupPdf}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                                    >
                                        <FileText className="h-4 w-4" />
                                        {lookupT.downloadPdfButton}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeLookup}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    {t.findTicketCloseButton}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleLookup} className="space-y-4 p-5" noValidate>
                                <p className="text-sm leading-6 text-slate-600">{t.findTicketDescription}</p>

                                {lookupMessage && (
                                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>{lookupMessage}</span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label htmlFor={lookupParentNameId} className="block text-sm font-medium text-slate-700">
                                        {t.findTicketParentNameLabel}
                                    </label>
                                    <input
                                        id={lookupParentNameId}
                                        type="text"
                                        required
                                        autoComplete="name"
                                        value={lookupParentName}
                                        onChange={(e) => setLookupParentName(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor={lookupPhoneId} className="block text-sm font-medium text-slate-700">
                                        {t.findTicketPhoneLabel}
                                    </label>
                                    <input
                                        id={lookupPhoneId}
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        maxLength={20}
                                        required
                                        value={lookupPhone}
                                        onChange={(e) => setLookupPhone(formatHolidayPhone(e.target.value))}
                                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                                    <button
                                        type="submit"
                                        disabled={lookupStatus === 'searching'}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                    >
                                        <Search className="h-4 w-4" />
                                        {lookupStatus === 'searching' ? t.findTicketSearchingButton : t.findTicketSubmitButton}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeLookup}
                                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        {t.findTicketCloseButton}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
