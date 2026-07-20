'use client';

import dynamic from 'next/dynamic';

const ModalContainer = dynamic(
    () => import('@/components/modals/ModalContainer').then((module) => module.ModalContainer),
    { ssr: false },
);

export function ProtectedOverlays() {
    return <ModalContainer />;
}
