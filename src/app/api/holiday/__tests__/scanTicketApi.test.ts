import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { generateHolidayTicketToken } from '@/lib/holiday/ticketToken';

const mockFrom = vi.fn();
const mockAuth = vi.fn();

vi.mock('@/lib/holiday/server', () => ({
    getHolidayServiceClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

vi.mock('@/lib/auth/config', () => ({
    auth: () => mockAuth(),
}));

describe('POST /api/holiday/staff/scan-ticket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXTAUTH_SECRET = 'holiday-scan-test-secret';
        mockAuth.mockResolvedValue({
            user: { id: 'staff-1', name: 'Staff User', email: 'staff@example.com', role: 'staff' },
        });
    });

    it('returns 401 when user is not authenticated', async () => {
        mockAuth.mockResolvedValueOnce(null);
        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({ token: 'HCT1.abc.def' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 403 when user is not staff/admin', async () => {
        mockAuth.mockResolvedValueOnce({
            user: { id: 'board-1', email: 'board@example.com', role: 'board' },
        });
        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({ token: 'HCT1.abc.def' }),
        });

        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it('returns 400 when token is missing', async () => {
        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toMatch(/Missing or invalid ticket QR token/i);
    });

    it('returns 400 when token signature is tampered with', async () => {
        const validToken = generateHolidayTicketToken({
            id: 'reg-1',
            ticketNumber: 5,
            eventYear: 2026,
            parentName: 'Alice',
            timeSlot: '09:00 AM - 09:20 AM',
            childrenCount: 1,
        });

        const tamperedToken = validToken.slice(0, -4) + '0000';

        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({ token: tamperedToken }),
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.tampered).toBe(true);
    });

    it('returns 200 and registration details when token is valid and found in database', async () => {
        const validToken = generateHolidayTicketToken({
            id: 'reg-valid-1',
            ticketNumber: 10,
            eventYear: 2026,
            parentName: 'Bob Smith',
            timeSlot: '10:00 AM - 10:20 AM',
            childrenCount: 1,
        });

        mockFrom.mockImplementation((table: string) => {
            if (table === 'holiday_registrations') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    id: 'reg-valid-1',
                                    ticket_number: 10,
                                    event_year: 2026,
                                    parent_name: 'Bob Smith',
                                    phone: '650-555-9999',
                                    city: 'Mountain View',
                                    housing_status: 'house_apartment',
                                    income_range: '0_40k',
                                    time_slot: '10:00 AM - 10:20 AM',
                                    language: 'en',
                                    status: 'registered',
                                    grocery_cards: 1,
                                    teen_cards: 0,
                                    notes: null,
                                    checked_in_at: null,
                                    checked_in_by: null,
                                    created_at: '2026-11-01T12:00:00Z',
                                    updated_at: '2026-11-01T12:00:00Z',
                                },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'holiday_children') {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => Promise.resolve({
                                data: [
                                    {
                                        id: 'c-1',
                                        registration_id: 'reg-valid-1',
                                        name: 'Child B',
                                        birthdate: null,
                                        age: 8,
                                        school: null,
                                        gender: null,
                                        age_group: 'child',
                                        created_at: '2026-11-01T12:00:00Z',
                                    },
                                ],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({ token: validToken }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.verified).toBe(true);
        expect(json.registration.ticketNumber).toBe(10);
        expect(json.registration.parentName).toBe('Bob Smith');
        expect(json.registration.children).toHaveLength(1);
    });

    it('returns 404 when validly signed token is not found in database', async () => {
        const validToken = generateHolidayTicketToken({
            id: 'reg-nonexistent',
            ticketNumber: 999,
            eventYear: 2026,
            parentName: 'Ghost User',
            timeSlot: '11:00 AM - 11:20 AM',
            childrenCount: 1,
        });

        mockFrom.mockImplementation((table: string) => {
            if (table === 'holiday_registrations') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: null,
                                error: { message: 'Not found' },
                            }),
                        }),
                    }),
                };
            }
            return {};
        });

        const { POST } = await import('../staff/scan-ticket/route');
        const req = new NextRequest('http://localhost:3000/api/holiday/staff/scan-ticket', {
            method: 'POST',
            body: JSON.stringify({ token: validToken }),
        });

        const res = await POST(req);
        expect(res.status).toBe(404);
    });
});
