import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { HolidayQRScannerModal } from '../HolidayQRScannerModal';

global.fetch = vi.fn();

describe('HolidayQRScannerModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSelectRegistration = vi.fn();
    const mockOnFastCheckIn = vi.fn();

    const mockVerifiedReg = {
        id: 'reg-scan-1',
        ticketNumber: 77,
        eventYear: 2026,
        parentName: 'Maria Lopez',
        phone: '650-555-4321',
        city: 'Mountain View',
        housingStatus: 'house_apartment' as const,
        incomeRange: '0_40k' as const,
        timeSlot: '09:40 AM - 10:00 AM',
        language: 'en' as const,
        status: 'registered' as const,
        groceryCards: 1,
        teenCards: 1,
        children: [{ id: 'c1', name: 'Kid A', age: 14, ageGroup: 'teen_14' as const }],
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnFastCheckIn.mockResolvedValue(true);
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <HolidayQRScannerModal
                isOpen={false}
                onClose={mockOnClose}
                onSelectRegistration={mockOnSelectRegistration}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders scanner modal and manual input when isOpen is true', () => {
        render(
            <HolidayQRScannerModal
                isOpen={true}
                onClose={mockOnClose}
                onSelectRegistration={mockOnSelectRegistration}
            />
        );

        expect(screen.getByText('Scan Ticket QR Code')).toBeDefined();
        expect(screen.getByPlaceholderText(/Scan with USB reader or paste token\.\.\./i)).toBeDefined();
    });

    it('allows verifying a token manually and displays verified ticket details', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                verified: true,
                registration: mockVerifiedReg,
            }),
        });

        render(
            <HolidayQRScannerModal
                isOpen={true}
                onClose={mockOnClose}
                onSelectRegistration={mockOnSelectRegistration}
            />
        );

        const input = screen.getByPlaceholderText(/Scan with USB reader or paste token\.\.\./i);
        fireEvent.change(input, { target: { value: 'HCT1.payload.signature' } });

        const verifyBtn = screen.getByRole('button', { name: 'Verify' });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(screen.getByText('Verified Official Ticket')).toBeDefined();
            expect(screen.getByText('#77')).toBeDefined();
            expect(screen.getByText('Maria Lopez')).toBeDefined();
            expect(screen.getByText(/Complete Check-In/i)).toBeDefined();
        });

        const completeBtn = screen.getByRole('button', { name: /Complete Check-In/i });
        fireEvent.click(completeBtn);

        expect(mockOnSelectRegistration).toHaveBeenCalledWith(mockVerifiedReg);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('displays error banner when verification fails or token is tampered', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                success: false,
                error: 'Invalid signature - token has been tampered with',
            }),
        });

        render(
            <HolidayQRScannerModal
                isOpen={true}
                onClose={mockOnClose}
                onSelectRegistration={mockOnSelectRegistration}
            />
        );

        const input = screen.getByPlaceholderText(/Scan with USB reader or paste token\.\.\./i);
        fireEvent.change(input, { target: { value: 'HCT1.tampered.signature' } });

        const verifyBtn = screen.getByRole('button', { name: 'Verify' });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(screen.getByText(/Security Warning: Ticket Verification Failed/i)).toBeDefined();
            expect(screen.getByText(/tampered/i)).toBeDefined();
        });
    });

    it('triggers fast check-in automatically when auto check-in checkbox is enabled', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                verified: true,
                registration: mockVerifiedReg,
            }),
        });

        render(
            <HolidayQRScannerModal
                isOpen={true}
                onClose={mockOnClose}
                onSelectRegistration={mockOnSelectRegistration}
                onFastCheckIn={mockOnFastCheckIn}
            />
        );

        // Check auto check-in checkbox
        const checkbox = screen.getByLabelText(/Auto Check-In/i);
        fireEvent.click(checkbox);

        const input = screen.getByPlaceholderText(/Scan with USB reader or paste token\.\.\./i);
        fireEvent.change(input, { target: { value: 'HCT1.fast.signature' } });

        const verifyBtn = screen.getByRole('button', { name: 'Verify' });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(mockOnFastCheckIn).toHaveBeenCalledWith(mockVerifiedReg);
        });
    });
});
