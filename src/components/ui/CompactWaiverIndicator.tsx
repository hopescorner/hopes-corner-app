'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWaiverStore } from '@/stores/useWaiverStore';
import { WaiverBadge } from './WaiverBadge';

type ServiceType = 'shower' | 'laundry' | 'bicycle';

interface CompactWaiverIndicatorProps {
    guestId: string;
    serviceType: ServiceType;
}

/**
 * CompactWaiverIndicator - A small, compact indicator for kanban cards
 * Shows a small warning icon when a waiver is needed, with tooltip on hover
 * Clicking the indicator opens the waiver modal
 */
export function CompactWaiverIndicator({ guestId, serviceType }: CompactWaiverIndicatorProps) {
    const [needsWaiver, setNeedsWaiver] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showWaiverModal, setShowWaiverModal] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const { guestNeedsWaiverReminder, hasActiveWaiver, waiverVersion } = useWaiverStore();

    const isBicycleWaiver = serviceType === 'bicycle';

    useEffect(() => {
        const checkWaiver = async () => {
            if (!guestId || !serviceType || !guestNeedsWaiverReminder) {
                setLoading(false);
                setNeedsWaiver(false);
                return;
            }

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
                console.error('[CompactWaiverIndicator] Error checking waiver status:', error);
                setNeedsWaiver(false);
            } finally {
                setLoading(false);
            }
        };

        checkWaiver();
    }, [guestId, serviceType, guestNeedsWaiverReminder, hasActiveWaiver, isBicycleWaiver, waiverVersion]);

    // Don't render anything if loading or no waiver needed
    if (loading || !needsWaiver) {
        return null;
    }

    const tooltipText = serviceType === 'bicycle'
        ? 'Bicycle program waiver needed'
        : 'Services waiver needed (covers shower & laundry)';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click/drag events
        setShowWaiverModal(true);
    };

    const handleMouseEnter = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top - 8, // Position above the button with gap
                left: rect.left + rect.width / 2, // Center horizontally
            });
        }
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    return (
        <>
            <div
                className="relative inline-flex"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
            >
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleClick}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-300 cursor-pointer hover:bg-amber-200 hover:border-amber-400 transition-colors flex-shrink-0 text-amber-700 font-bold text-lg leading-none"
                    aria-label={`${tooltipText} - click to open waiver form`}
                >
                    !
                </button>
            </div>

            {/* Tooltip - rendered in portal to avoid overflow clipping */}
            {showTooltip && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        top: `${tooltipPosition.top}px`,
                        left: `${tooltipPosition.left}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        {tooltipText}
                        <div className="text-[9px] text-gray-300 mt-0.5">Click to sign waiver</div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900" />
                    </div>
                </div>,
                document.body
            )}

            {/* Waiver Modal - show WaiverBadge in modal mode */}
            {showWaiverModal && (
                <WaiverBadge
                    guestId={guestId}
                    serviceType={serviceType}
                    onDismissed={() => setShowWaiverModal(false)}
                />
            )}
        </>
    );
}

export default CompactWaiverIndicator;
