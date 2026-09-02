import { Metadata } from 'next';
import Image from 'next/image';
import { AlertCircle, QrCode } from 'lucide-react';
import { verifyHolidayShopperToken } from '@/lib/holiday/shopperToken';
import ShopperChecklistClient from './ShopperChecklistClient';

export const metadata: Metadata = {
    title: "Volunteer Shopper Checklist | Hope's Corner",
    description: "Confidential gift shopping checklist for Hope's Corner Holiday Toy Distribution volunteers.",
};

interface ShopperPageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function HolidayShopperPage({ searchParams }: ShopperPageProps) {
    const resolvedParams = await searchParams;
    const token = resolvedParams?.token;

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <QrCode className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-950">No Shopper Token Provided</h1>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Please scan the QR code next to a family in the Staff Event Management Hub to view their shopping checklist.
                    </p>
                </div>
            </div>
        );
    }

    const verification = verifyHolidayShopperToken(token);

    if (!verification.valid) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-12 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-950">Invalid or Expired Shopper Link</h1>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        This checklist link could not be verified or was modified. Please ask event staff to rescan the family QR code.
                    </p>
                </div>
            </div>
        );
    }

    return <ShopperChecklistClient data={verification.payload} />;
}
