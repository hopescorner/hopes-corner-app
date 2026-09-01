import { describe, it, expect } from 'vitest';
import {
    generateHolidayTicketToken,
    verifyHolidayTicketToken,
    generateTicketQRCodeDataUrl,
} from '../ticketToken';

describe('ticketToken cryptographic utilities', () => {
    const mockPayload = {
        id: 'reg-uuid-123',
        ticketNumber: 42,
        eventYear: 2026,
        parentName: 'Jane Doe',
        timeSlot: '09:00 AM - 09:20 AM',
        childrenCount: 2,
    };

    it('generates a valid HCT1 token with base64url payload and HMAC signature', () => {
        const token = generateHolidayTicketToken(mockPayload);
        expect(token).toMatch(/^HCT1\.[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    });

    it('verifies a valid token and extracts the payload correctly', () => {
        const token = generateHolidayTicketToken(mockPayload);
        const result = verifyHolidayTicketToken(token);

        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.payload.id).toBe('reg-uuid-123');
            expect(result.payload.ticketNumber).toBe(42);
            expect(result.payload.eventYear).toBe(2026);
            expect(result.payload.parentName).toBe('Jane Doe');
            expect(result.payload.timeSlot).toBe('09:00 AM - 09:20 AM');
            expect(result.payload.childrenCount).toBe(2);
            expect(result.payload.v).toBe(1);
            expect(typeof result.payload.iat).toBe('number');
        }
    });

    it('rejects tampered tokens when the payload is modified', () => {
        const token = generateHolidayTicketToken(mockPayload);
        const parts = token.split('.');

        // Tamper with payload: alter ticket number to 999
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        decoded.ticketNumber = 999;
        const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');
        const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

        const result = verifyHolidayTicketToken(tamperedToken);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.error).toMatch(/tampered/i);
        }
    });

    it('rejects tampered tokens when the signature is modified', () => {
        const token = generateHolidayTicketToken(mockPayload);
        const parts = token.split('.');

        // Change last character of signature
        const alteredSig = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
        const tamperedToken = `${parts[0]}.${parts[1]}.${alteredSig}`;

        const result = verifyHolidayTicketToken(tamperedToken);
        expect(result.valid).toBe(false);
    });

    it('rejects invalid or empty token inputs', () => {
        expect(verifyHolidayTicketToken('').valid).toBe(false);
        expect(verifyHolidayTicketToken('not-a-token').valid).toBe(false);
        expect(verifyHolidayTicketToken('HCT2.abc.123').valid).toBe(false);
    });

    it('generates a valid QR code Data URL image for the token', async () => {
        const token = generateHolidayTicketToken(mockPayload);
        const qrDataUrl = await generateTicketQRCodeDataUrl(token);

        expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
});
