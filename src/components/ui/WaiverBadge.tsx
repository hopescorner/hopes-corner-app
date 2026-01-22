'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, ShowerHead, WashingMachine, Bike, ExternalLink, CheckCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useWaiverStore } from '@/stores/useWaiverStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

type ServiceType = 'shower' | 'laundry' | 'bicycle';

interface WaiverBadgeProps {
    guestId: string;
    serviceType: ServiceType;
    onDismissed?: () => void;
    onModalOpen?: () => void;
    onModalClose?: () => void;
}

const WAIVER_URLS = {
    shower: 'https://hopes-corner-waiver-submission-next.vercel.app/',
    laundry: 'https://hopes-corner-waiver-submission-next.vercel.app/',
    bicycle: 'https://hopes-corner-bicycle-waiver.vercel.app/',
};

/**
 * WaiverBadge - Displays a badge for guests needing waiver acknowledgment
 * Shows for guests who have used shower/laundry/bicycle services but haven't signed waivers
 * Staff dismisses the badge after confirming external waiver is signed
 * 
 * IMPORTANT: Shower and laundry share a common waiver. If one is signed, both are covered.
 * Bicycle has a separate waiver.
 */
export function WaiverBadge({ guestId, serviceType, onDismissed, onModalOpen, onModalClose }: WaiverBadgeProps) {
    const [needsWaiver, setNeedsWaiver] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [dismissing, setDismissing] = useState(false);
    const [waiverStep, setWaiverStep] = useState<'initial' | 'submitted'>('initial');

    const { guestNeedsWaiverReminder, dismissWaiver, hasActiveWaiver, waiverVersion } = useWaiverStore();

    const isBicycleWaiver = serviceType === 'bicycle';
    const isShowerLaundryWaiver = serviceType === 'shower' || serviceType === 'laundry';

    // Check if guest needs waiver on mount and when dependencies change
    useEffect(() => {
        const checkWaiver = async () => {
            setLoading(true);
            try {
                const needsForThisService = await guestNeedsWaiverReminder(guestId, serviceType);

                if (!needsForThisService) {
                    setNeedsWaiver(false);
                    setLoading(false);
                    return;
                }

                // For bicycle, just check this service (separate waiver)
                if (isBicycleWaiver) {
                    setNeedsWaiver(true);
                    setLoading(false);
                    return;
                }

                // Since shower and laundry share a common waiver, check if the OTHER service
                // already has an active (dismissed) waiver this year
                const otherService = serviceType === 'shower' ? 'laundry' : 'shower';
                const hasOtherWaiver = await hasActiveWaiver(guestId, otherService);

                // If the other service has an active waiver, this service doesn't need one
                setNeedsWaiver(!hasOtherWaiver);
            } catch (error) {
                console.error('[WaiverBadge] Error checking waiver status:', error);
                setNeedsWaiver(false);
            } finally {
                setLoading(false);
            }
        };

        if (guestId && serviceType) {
            checkWaiver();
        }
    }, [guestId, serviceType, guestNeedsWaiverReminder, hasActiveWaiver, isBicycleWaiver, waiverVersion]);

    const handleDismiss = async () => {
        setDismissing(true);
        try {
            const success = await dismissWaiver(guestId, serviceType, 'signed_by_staff');

            if (success) {
                // For shower/laundry, also dismiss the other service type since they share a waiver
                if (isShowerLaundryWaiver) {
                    const otherService = serviceType === 'shower' ? 'laundry' : 'shower';
                    await dismissWaiver(guestId, otherService, 'shared_waiver');
                    toast.success('Services waiver confirmed for this year (covers both shower & laundry)');
                } else {
                    toast.success('Bicycle program waiver confirmed for this year');
                }

                setNeedsWaiver(false);
                setShowModal(false);
                setWaiverStep('initial');
                onModalClose?.();
                onDismissed?.();
            } else {
                toast.error('Failed to confirm waiver');
            }
        } catch (error) {
            console.error('Error dismissing waiver:', error);
            toast.error('Failed to confirm waiver');
        } finally {
            setDismissing(false);
        }
    };

    const handleOpenWaiverLink = () => {
        window.open(WAIVER_URLS[serviceType], 'waiver_window');
        setWaiverStep('submitted');
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setShowModal(false);
            onModalClose?.();
        }
    };

    if (loading || !needsWaiver) {
        return null;
    }

    const serviceName = serviceType === 'shower' ? 'Shower' : serviceType === 'laundry' ? 'Laundry' : 'Bicycle';
    const waiverTitle = isBicycleWaiver ? 'Bicycle Program Waiver' : 'Services Waiver';
    const waiverDescription = isBicycleWaiver
        ? 'Confirm bicycle waiver is signed for this year'
        : 'Confirm waiver is signed for this year';
    const badgeTitle = isBicycleWaiver
        ? 'Bicycle program waiver required'
        : 'Services waiver required (covers shower & laundry)';

    return (
        <>
            {/* Badge */}
            <button
                onClick={() => {
                    setShowModal(true);
                    onModalOpen?.();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-full hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                title={badgeTitle}
            >
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span className="hidden sm:inline">Waiver needed</span>
                <span className="sm:hidden">⚠️</span>
            </button>

            {/* Modal Dialog */}
            {showModal && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
                    onClick={handleBackdropClick}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl my-auto">
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setShowModal(false);
                                onModalClose?.();
                            }}
                            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 z-10"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>

                        {/* Content */}
                        <div className="p-6 pt-8 max-h-[calc(100vh-120px)] overflow-y-auto">
                            {/* STEP 1: Initial - Show waiver info and link */}
                            {waiverStep === 'initial' && (
                                <>
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex-shrink-0 pt-0.5">
                                            <AlertTriangle size={24} className="text-amber-600" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">{waiverTitle}</h2>
                                            <p className="text-sm text-gray-500 mt-1">{waiverDescription}</p>
                                        </div>
                                    </div>

                                    {/* Waiver info box */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            This guest has used {serviceName.toLowerCase()} services. They need to sign the waiver form.
                                        </p>
                                    </div>

                                    {/* Service-specific notice */}
                                    {isBicycleWaiver ? (
                                        <div className="bg-sky-50 border border-sky-200 rounded-md p-4 mb-6">
                                            <div className="flex items-start gap-3">
                                                <Bike size={16} className="text-sky-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-sky-800">Bicycle Program Waiver</p>
                                                    <p className="text-xs text-sky-700 mt-1">
                                                        This waiver is specific to the bicycle repair program. Shower and laundry services require a separate waiver.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                                            <div className="flex items-start gap-3">
                                                <div className="flex gap-1.5 flex-shrink-0">
                                                    <ShowerHead size={16} className="text-blue-600" />
                                                    <WashingMachine size={16} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-blue-800">Common Waiver</p>
                                                    <p className="text-xs text-blue-700 mt-1">
                                                        Shower and laundry share the same waiver. Confirming this will cover both services for the year.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500 mb-6 text-center">
                                        This waiver requirement will reset on January 1st of next year.
                                    </p>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowModal(false);
                                                onModalClose?.();
                                            }}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleOpenWaiverLink}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={16} />
                                            Sign Waiver Online
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* STEP 2: Submitted - Waiting for confirmation after returning */}
                            {waiverStep === 'submitted' && (
                                <>
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="flex-shrink-0 pt-0.5">
                                            <AlertTriangle size={24} className="text-amber-600" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Waiver Submitted</h2>
                                            <p className="text-sm text-gray-500 mt-1">Confirming waiver signature</p>
                                        </div>
                                    </div>

                                    {/* Info box */}
                                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-green-800">Waiver link has been opened</p>
                                                <p className="text-xs text-green-700 mt-1">
                                                    Once the guest has completed the waiver form online, click the button below to confirm.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowModal(false);
                                                setWaiverStep('initial');
                                                onModalClose?.();
                                            }}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleDismiss}
                                            disabled={dismissing}
                                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {dismissing ? 'Confirming...' : (
                                                <>
                                                    <Check size={16} />
                                                    Confirm Signed
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default WaiverBadge;
