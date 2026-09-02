import { describe, it, expect } from 'vitest';
import {
    generateHolidayShopperToken,
    verifyHolidayShopperToken,
    generateShopperQRCodeDataUrl,
} from '../shopperToken';

describe('shopperToken', () => {
    const mockPayload = {
        ticketNumber: 42,
        timeSlot: '09:00 AM - 09:20 AM',
        children: [
            { id: 'c1', age: 3, ageGroup: 'toddler' as const, gender: 'female' },
            { id: 'c2', age: 15, ageGroup: 'teen_15' as const },
        ],
    };

    it('generates a signed shopper token starting with HCS1', () => {
        const token = generateHolidayShopperToken(mockPayload);
        expect(typeof token).toBe('string');
        expect(token.startsWith('HCS1.')).toBe(true);
        expect(token.split('.').length).toBe(3);
    });

    it('successfully verifies a valid shopper token and extracts non-PII payload', () => {
        const token = generateHolidayShopperToken(mockPayload);
        const result = verifyHolidayShopperToken(token);

        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.payload.ticketNumber).toBe(42);
            expect(result.payload.timeSlot).toBe('09:00 AM - 09:20 AM');
            expect(result.payload.children.length).toBe(2);
            expect(result.payload.children[0].age).toBe(3);
            expect(result.payload.children[0].ageGroup).toBe('toddler');
            expect(result.payload.children[0].gender).toBe('female');
            expect((result.payload as any).parentName).toBeUndefined();
            expect((result.payload as any).phone).toBeUndefined();
        }
    });

    it('rejects tampered tokens', () => {
        const token = generateHolidayShopperToken(mockPayload);
        const parts = token.split('.');
        const tampered = `${parts[0]}.${parts[1]}xyz.${parts[2]}`;

        const result = verifyHolidayShopperToken(tampered);
        expect(result.valid).toBe(false);
    });

    it('rejects tokens with invalid header or malformed string', () => {
        expect(verifyHolidayShopperToken('').valid).toBe(false);
        expect(verifyHolidayShopperToken('invalid').valid).toBe(false);
        expect(verifyHolidayShopperToken('OTHER.abc.123').valid).toBe(false);
    });

    it('generates a valid QR code data URL for a shopper URL', async () => {
        const url = 'https://app.hopescorner.org/holiday/shopper?token=test';
        const dataUrl = await generateShopperQRCodeDataUrl(url);
        expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });
});
