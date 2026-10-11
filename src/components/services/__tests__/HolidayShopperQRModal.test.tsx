import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HolidayShopperQRModal } from '../HolidayShopperQRModal';
import type { HolidayRegistration } from '@/types/holiday';

const registration = {
    id: 'registration-1', ticketNumber: 42, timeSlot: '09:00', children: [],
} as unknown as HolidayRegistration;

describe('HolidayShopperQRModal', () => {
    it('uses the server-signed token in the shopper link', () => {
        render(<HolidayShopperQRModal isOpen onClose={() => {}} registration={{ ...registration, shopperToken: 'HCS1.server.signature' }} />);
        expect(screen.getByRole('link', { name: 'Open View' })).toHaveAttribute('href', expect.stringContaining('token=HCS1.server.signature'));
    });

    it('asks staff to reload if the server token is unavailable', () => {
        render(<HolidayShopperQRModal isOpen onClose={() => {}} registration={registration} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Reload registrations');
        expect(screen.queryByRole('link', { name: 'Open View' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy Link' })).toBeDisabled();
    });
});
