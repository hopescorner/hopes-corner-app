'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, Copy, ExternalLink, ShoppingBag, Check } from 'lucide-react';
import { HolidayRegistration } from '@/types/holiday';
import { generateHolidayShopperToken, generateShopperQRCodeDataUrl } from '@/lib/holiday/shopperToken';
import toast from 'react-hot-toast';

interface HolidayShopperQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    registration: HolidayRegistration | null;
}

export function HolidayShopperQRModal({
    isOpen,
    onClose,
    registration,
}: HolidayShopperQRModalProps) {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const shopperUrl = useMemo(() => {
        if (!registration) return '';
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const token =
            registration.shopperToken ||
            generateHolidayShopperToken({
                ticketNumber: registration.ticketNumber,
                timeSlot: registration.timeSlot,
                children: (registration.children || []).map((c) => ({
                    id: c.id,
                    age: c.age,
                    ageGroup: c.ageGroup,
                    gender: c.gender,
                })),
            });
        return `${origin}/holiday/shopper?token=${encodeURIComponent(token)}`;
    }, [registration]);

    useEffect(() => {
        if (!isOpen || !shopperUrl) {
            return;
        }

        let cancelled = false;
        void generateShopperQRCodeDataUrl(shopperUrl).then((dataUrl) => {
            if (!cancelled) {
                setQrCodeDataUrl(dataUrl);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isOpen, shopperUrl]);

    if (!isOpen || !registration) return null;

    const childrenCount = registration.children?.length || 0;

    const handleCopy = async () => {
        if (!shopperUrl) return;
        try {
            await navigator.clipboard.writeText(shopperUrl);
            setCopied(true);
            toast.success(`Shopper link copied for Ticket #${registration.ticketNumber}`);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-emerald-300">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                                Volunteer Shopper QR
                            </span>
                            <h2 className="text-lg font-black leading-tight">
                                Ticket #{registration.ticketNumber}
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-emerald-300 hover:text-white p-1 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 text-center space-y-4">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700">
                            {childrenCount} {childrenCount === 1 ? 'Child' : 'Children'} • {registration.timeSlot}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            Shopper scans with their phone camera to view the non-PII gift checklist.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <div className="relative h-56 w-56 overflow-hidden rounded-2xl border-2 border-emerald-100 bg-white p-2 shadow-xs flex items-center justify-center">
                            {qrCodeDataUrl ? (
                                <Image
                                    src={qrCodeDataUrl}
                                    alt={`Shopper QR Code for Ticket #${registration.ticketNumber}`}
                                    width={210}
                                    height={210}
                                    className="h-full w-full object-contain"
                                    unoptimized
                                />
                            ) : (
                                <div className="text-xs text-slate-400 animate-pulse">Generating QR code...</div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Link</span>
                                </>
                            )}
                        </button>
                        {shopperUrl && (
                            <a
                                href={shopperUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2.5 text-xs font-bold transition-colors shadow-sm"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open View</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
