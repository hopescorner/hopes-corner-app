import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockAuth = vi.fn();

vi.mock('@/lib/holiday/server', () => ({
    getHolidayServiceClient: vi.fn(() => ({
        rpc: mockRpc,
        from: mockFrom,
    })),
}));

vi.mock('@/lib/auth/config', () => ({
    auth: () => mockAuth(),
}));

describe('Holiday API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXTAUTH_SECRET = 'holiday-api-test-secret';
        mockAuth.mockResolvedValue({
            user: { id: 'staff-1', name: 'Staff User', email: 'staff@example.com', role: 'staff' },
        });
        mockRpc.mockImplementation((functionName: string) => {
            if (functionName === 'consume_holiday_registration_attempt') {
                return Promise.resolve({ data: true, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });
    });

    describe('POST /api/holiday/register', () => {
        it('validates missing required fields', async () => {
            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({}),
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toMatch(/Parent\/Guardian name is required/i);
        });

        it('validates at least one child is required', async () => {
            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    children: [],
                }),
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toMatch(/At least one child is required/i);
        });

        it('rejects submissions with bot honeypot fields', async () => {
            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Bot Parent',
                    phone: '6505551234',
                    city: 'Mountain View',
                    website: 'http://spam.com',
                    children: [{ name: 'Child A', age: 5 }],
                }),
            });

            const res = await POST(req);
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toMatch(/Invalid submission/i);
        });

        it('returns 429 when the durable registration limiter rejects the client', async () => {
            mockRpc.mockImplementation((functionName: string) => {
                if (functionName === 'consume_holiday_registration_attempt') {
                    return Promise.resolve({ data: false, error: null });
                }
                return Promise.resolve({ data: { id: 'must-not-register' }, error: null });
            });

            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                headers: { 'x-forwarded-for': '203.0.113.10' },
                body: JSON.stringify({
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    children: [{ name: 'Child A', age: 7 }],
                }),
            });

            const res = await POST(req);

            expect(res.status).toBe(429);
            expect(mockRpc).not.toHaveBeenCalledWith('register_holiday_family', expect.anything());
        });

        it('rejects registrations with more than 20 children', async () => {
            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    children: Array.from({ length: 21 }, (_, index) => ({
                        name: `Child ${index + 1}`,
                        age: 7,
                    })),
                }),
            });

            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('rejects a non-string arrival time slot as malformed input', async () => {
            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    timeSlot: 900,
                    children: [{ name: 'Child A', age: 7 }],
                }),
            });

            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('invokes register_holiday_family RPC and returns assigned slot & ticket number', async () => {
            mockRpc.mockImplementation((functionName: string) => Promise.resolve(
                functionName === 'consume_holiday_registration_attempt'
                    ? { data: true, error: null }
                    : { data: {
                    id: 'new-reg-uuid',
                    ticketNumber: 1,
                    eventYear: 2026,
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    housingStatus: 'house_apartment',
                    incomeRange: '0_40k',
                    timeSlot: '09:00 AM - 09:20 AM',
                    language: 'en',
                    status: 'registered',
                    groceryCards: 1,
                    teenCards: 0,
                    children: [
                        { id: 'c-1', name: 'Child A', age: 7, ageGroup: 'child' },
                    ],
                    createdAt: '2026-11-01T12:00:00Z',
                    updatedAt: '2026-11-01T12:00:00Z',
                    }, error: null }
            ));

            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Jane Doe',
                    phone: '6505551234',
                    city: 'Mountain View',
                    language: 'en',
                    children: [{ name: 'Child A', age: 7 }],
                }),
            });

            const res = await POST(req);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(mockRpc).toHaveBeenCalledWith('register_holiday_family', expect.objectContaining({
                p_parent_name: 'Jane Doe',
                p_phone: '6505551234',
                p_city: 'Mountain View',
            }));
            expect(json.registration.timeSlot).toBe('09:00 AM - 09:20 AM');
            expect(json.registration.ticketNumber).toBe(1);
            expect(json.registration.ticketToken).toMatch(/^HCT1\./);
            expect(json.registration.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
        });

        it('returns 409 error when RPC returns ALL_SLOTS_FULL error', async () => {
            mockRpc.mockImplementation((functionName: string) => Promise.resolve(
                functionName === 'consume_holiday_registration_attempt'
                    ? { data: true, error: null }
                    : { data: null, error: { message: 'ALL_SLOTS_FULL' } }
            ));

            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Late Parent',
                    phone: '6505550000',
                    city: 'Mountain View',
                    children: [{ name: 'Child C', age: 5 }],
                }),
            });

            const res = await POST(req);
            expect(res.status).toBe(409);
            const json = await res.json();
            expect(json.error).toMatch(/full capacity/i);
        });

        it('returns 409 error when RPC returns SLOT_FULL error', async () => {
            mockRpc.mockImplementation((functionName: string) => Promise.resolve(
                functionName === 'consume_holiday_registration_attempt'
                    ? { data: true, error: null }
                    : { data: null, error: { message: 'SLOT_FULL' } }
            ));

            const { POST } = await import('../register/route');
            const req = new NextRequest('http://localhost:3000/api/holiday/register', {
                method: 'POST',
                body: JSON.stringify({
                    parentName: 'Late Parent',
                    phone: '6505550000',
                    city: 'Mountain View',
                    timeSlot: '09:00 AM - 09:20 AM',
                    children: [{ name: 'Child C', age: 5 }],
                }),
            });

            const res = await POST(req);
            expect(res.status).toBe(409);
            const json = await res.json();
            expect(json.error).toMatch(/specified time slot is full/i);
        });
    });

    describe('GET /api/holiday/slots', () => {
        it('queries get_holiday_slot_capacities RPC and returns 15 20-minute time slots', async () => {
            mockRpc.mockResolvedValueOnce({
                data: [
                    { time_slot: '09:00 AM - 09:20 AM', booked_count: 2 },
                ],
                error: null,
            });

            const { GET } = await import('../slots/route');
            const res = await GET();
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(mockRpc).toHaveBeenCalledWith('get_holiday_slot_capacities', { p_event_year: 2026 });
            expect(json.slots).toHaveLength(15);

            const firstSlot = json.slots.find((s: any) => s.slot === '09:00 AM - 09:20 AM');
            expect(firstSlot).toBeDefined();
            expect(firstSlot.bookedCount).toBe(2);
            expect(firstSlot.remaining).toBe(14);
            expect(firstSlot.isFull).toBe(false);
        });
    });

    describe('Staff API Routes', () => {
        describe('GET /api/holiday/staff/registrations', () => {
            it('returns 401 when user is not authenticated', async () => {
                mockAuth.mockResolvedValueOnce(null);
                const { GET } = await import('../staff/registrations/route');
                const res = await GET();
                expect(res.status).toBe(401);
            });

            it('returns registrations and children when authenticated', async () => {
                mockFrom.mockImplementation((table: string) => {
                    if (table === 'holiday_registrations') {
                        return {
                            select: () => ({
                                eq: () => ({
                                    order: () => Promise.resolve({
                                        data: [
                                            {
                                                id: 'reg-1',
                                                ticket_number: 1,
                                                event_year: 2026,
                                                parent_name: 'Parent One',
                                                phone: '650-555-1111',
                                                city: 'Mountain View',
                                                housing_status: 'house_apartment',
                                                income_range: '0_40k',
                                                time_slot: '09:00 AM - 09:20 AM',
                                                language: 'en',
                                                status: 'registered',
                                                grocery_cards: 1,
                                                teen_cards: 0,
                                            },
                                        ],
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === 'holiday_children') {
                        return {
                            select: () => ({
                                in: () => Promise.resolve({
                                    data: [
                                        {
                                            id: 'child-1',
                                            registration_id: 'reg-1',
                                            name: 'Kid A',
                                            age: 6,
                                            age_group: 'child',
                                        },
                                    ],
                                    error: null,
                                }),
                            }),
                        };
                    }
                    return {};
                });

                const { GET } = await import('../staff/registrations/route');
                const res = await GET();
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.registrations).toHaveLength(1);
                expect(json.registrations[0].parentName).toBe('Parent One');
                expect(json.registrations[0].children).toHaveLength(1);
            });
        });

        describe('POST /api/holiday/staff/check-in', () => {
            it('rejects negative or fractional card counts', async () => {
                const { POST } = await import('../staff/check-in/route');
                const req = new NextRequest('http://localhost:3000/api/holiday/staff/check-in', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: 'reg-1',
                        groceryCards: -1,
                        teenCards: 1.5,
                    }),
                });

                const res = await POST(req);

                expect(res.status).toBe(400);
            });

            it('updates registration to checked_in', async () => {
                mockFrom.mockImplementationOnce(() => ({
                    update: (updates: any) => ({
                        eq: () => ({
                            select: () => ({
                                single: () => Promise.resolve({
                                    data: { id: 'reg-1', status: 'checked_in', ...updates },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                }));

                const { POST } = await import('../staff/check-in/route');
                const req = new NextRequest('http://localhost:3000/api/holiday/staff/check-in', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: 'reg-1',
                        groceryCards: 1,
                        teenCards: 2,
                        notes: 'Picked up by aunt',
                    }),
                });

                const res = await POST(req);
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
            });
        });

        describe('POST /api/holiday/staff/undo-checkin', () => {
            it('reverts registration to registered', async () => {
                mockFrom.mockImplementationOnce(() => ({
                    update: () => ({
                        eq: () => Promise.resolve({ error: null }),
                    }),
                }));

                const { POST } = await import('../staff/undo-checkin/route');
                const req = new NextRequest('http://localhost:3000/api/holiday/staff/undo-checkin', {
                    method: 'POST',
                    body: JSON.stringify({ id: 'reg-1' }),
                });

                const res = await POST(req);
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
            });
        });

        describe('DELETE /api/holiday/staff/registrations/[id]', () => {
            it('deletes a registration', async () => {
                mockFrom.mockImplementationOnce(() => ({
                    delete: () => ({
                        eq: () => Promise.resolve({ error: null }),
                    }),
                }));

                const { DELETE } = await import('../staff/registrations/[id]/route');
                const req = new NextRequest('http://localhost:3000/api/holiday/staff/registrations/reg-1', {
                    method: 'DELETE',
                });

                const res = await DELETE(req, { params: Promise.resolve({ id: 'reg-1' }) });
                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.success).toBe(true);
            });
        });

        it.each([
            ['registrations', async () => {
                const { GET } = await import('../staff/registrations/route');
                return GET();
            }],
            ['check-in', async () => {
                const { POST } = await import('../staff/check-in/route');
                return POST(new NextRequest('http://localhost/api/holiday/staff/check-in', {
                    method: 'POST', body: JSON.stringify({ id: 'reg-1' }),
                }));
            }],
            ['undo check-in', async () => {
                const { POST } = await import('../staff/undo-checkin/route');
                return POST(new NextRequest('http://localhost/api/holiday/staff/undo-checkin', {
                    method: 'POST', body: JSON.stringify({ id: 'reg-1' }),
                }));
            }],
            ['notes', async () => {
                const { PATCH } = await import('../staff/notes/route');
                return PATCH(new NextRequest('http://localhost/api/holiday/staff/notes', {
                    method: 'PATCH', body: JSON.stringify({ id: 'reg-1', notes: 'test' }),
                }));
            }],
            ['walk-in', async () => {
                const { POST } = await import('../staff/walk-in/route');
                return POST(new NextRequest('http://localhost/api/holiday/staff/walk-in', {
                    method: 'POST',
                    body: JSON.stringify({
                        parentName: 'Parent', phone: '6505551234', city: 'Mountain View',
                        children: [{ name: 'Child', age: 7 }],
                    }),
                }));
            }],
            ['delete', async () => {
                const { DELETE } = await import('../staff/registrations/[id]/route');
                return DELETE(
                    new NextRequest('http://localhost/api/holiday/staff/registrations/reg-1', { method: 'DELETE' }),
                    { params: Promise.resolve({ id: 'reg-1' }) }
                );
            }],
        ])('returns 403 from the %s endpoint for a non-staff role', async (_name, invoke) => {
            mockAuth.mockResolvedValueOnce({
                user: { id: 'board-1', email: 'board@example.com', role: 'board' },
            });

            const res = await invoke();

            expect(res.status).toBe(403);
        });
    });
});
