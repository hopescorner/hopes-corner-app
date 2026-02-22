'use client';

import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useModalStore } from '@/stores/useModalStore';

const ShowerBookingModal = dynamic(() => import('@/components/modals/ShowerBookingModal').then((m) => m.ShowerBookingModal));
const LaundryBookingModal = dynamic(() => import('@/components/modals/LaundryBookingModal').then((m) => m.LaundryBookingModal));
const BicycleRepairBookingModal = dynamic(() => import('@/components/modals/BicycleRepairBookingModal').then((m) => m.BicycleRepairBookingModal));
const DailyNoteModal = dynamic(() => import('@/components/modals/DailyNoteModal').then((m) => m.DailyNoteModal));

export function ModalContainer() {
    const { showerPickerGuest, laundryPickerGuest, bicyclePickerGuest, notePickerContext } = useModalStore();

    return (
        <AnimatePresence>
            {showerPickerGuest && <ShowerBookingModal />}
            {laundryPickerGuest && <LaundryBookingModal />}
            {bicyclePickerGuest && <BicycleRepairBookingModal />}
            {notePickerContext && <DailyNoteModal />}
        </AnimatePresence>
    );
}
