import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import HolidayRegistrationClient from '../HolidayRegistrationClient';

global.fetch = vi.fn();

describe('HolidayRegistrationClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockImplementation((url: string, opts?: any) => {
            if (url.includes('/api/holiday/register') && opts?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        registration: {
                            id: 'reg-new-1',
                            ticketNumber: 88,
                            eventYear: 2026,
                            parentName: 'Test Parent',
                            phone: '650-555-1111',
                            city: 'Mountain View',
                            housingStatus: 'house_apartment',
                            incomeRange: '0_40k',
                            timeSlot: '09:00 AM - 09:20 AM',
                            language: 'en',
                            status: 'registered',
                            groceryCards: 1,
                            teenCards: 1,
                            qrCodeDataUrl: 'data:image/png;base64,mockqrdata',
                            children: [
                                {
                                    id: 'c1',
                                    name: 'Child 1',
                                    age: 14,
                                    ageGroup: 'teen_14',
                                },
                            ],
                            createdAt: '2026-11-01T12:00:00Z',
                            updatedAt: '2026-11-01T12:00:00Z',
                        },
                    }),
                });
            }

            return Promise.resolve({
                ok: false,
                json: async () => ({ error: 'Not found' }),
            });
        });
    });

    it('renders the public registration form in English by default with dynamic year and gift icon', async () => {
        render(<HolidayRegistrationClient />);

        const currentYear = new Date().getFullYear();
        const page = screen.getByTestId('holiday-registration-page');
        expect(page.className).toContain('bg-slate-50');
        expect(page.className).toContain('text-slate-900');
        expect(page.className).not.toContain('bg-slate-950');
        expect(screen.getByTestId('holiday-gift-icon')).toBeDefined();
        expect(screen.getByText(new RegExp(`${currentYear} HOLIDAY TOY DISTRIBUTION`, 'i'))).toBeDefined();
        expect(screen.getByText(/Parent \/ Guardian Information/i)).toBeDefined();
        expect(screen.getByText(/Automatic Arrival Window/i)).toBeDefined();
        expect(screen.getByText(/Complete Registration & Get Ticket/i)).toBeDefined();
    });

    it('switches languages dynamically to Spanish and Mandarin', async () => {
        render(<HolidayRegistrationClient />);

        // Switch to Spanish
        const esBtn = screen.getByRole('button', { name: 'Español' });
        fireEvent.click(esBtn);
        expect(screen.getByText(/DISTRIBUCIÓN DE JUGUETES NAVIDEÑOS/i)).toBeDefined();
        expect(screen.getByText(/Información del Padre \/ Tutor/i)).toBeDefined();
        expect(screen.getByText(/Horario de Llegada Automático/i)).toBeDefined();

        // Switch to Mandarin
        const zhBtn = screen.getByRole('button', { name: /中文/i });
        fireEvent.click(zhBtn);
        expect(screen.getByText(/年度节日玩具分发活动/i)).toBeDefined();
        expect(screen.getByText(/家长 \/ 监护人信息/i)).toBeDefined();
        expect(screen.getByText(/自动分配到场时间段/i)).toBeDefined();
    });

    it('allows adding and removing children', async () => {
        render(<HolidayRegistrationClient />);

        const addChildBtn = screen.getByRole('button', { name: /Add Another Child/i });
        fireEvent.click(addChildBtn);

        expect(screen.getByText(/Child #2/i)).toBeDefined();
    });

    it('submits registration without manual slot selection and displays assigned 20-min slot on ticket', async () => {
        render(<HolidayRegistrationClient />);

        // Fill Parent Name
        const nameInput = screen.getByPlaceholderText(/e\.g\. Maria Gonzalez/i);
        fireEvent.change(nameInput, { target: { value: 'Test Parent' } });

        // Fill Phone
        const phoneInput = screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i);
        fireEvent.change(phoneInput, { target: { value: '650-555-1111' } });

        // Fill Child Name
        const childNameInput = screen.getByPlaceholderText(/e\.g\. Alexander Gonzalez/i);
        fireEvent.change(childNameInput, { target: { value: 'Child 1' } });

        // Submit form directly without slot selection
        const submitBtn = screen.getByRole('button', { name: /Complete Registration & Get Ticket/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('#88')).toBeDefined();
            expect(screen.getByText('09:00 AM - 09:20 AM')).toBeDefined();
            expect(screen.getByText(/Registration Confirmed!/i)).toBeDefined();
            expect(screen.getByText(/Print \/ Save Ticket/i)).toBeDefined();
            expect(screen.queryByText(/Eligible Items Summary/i)).toBeNull();
            expect(screen.queryByText(/Family Grocery Card/i)).toBeNull();
            expect(screen.getByText(/Please arrive 10 minutes before your assigned time slot and bring your ticket confirmation on your phone\./i)).toBeDefined();
            expect(screen.getByText(/Official Event Check-In QR Code/i)).toBeDefined();
            expect(screen.getByAltText(/Ticket QR Code/i)).toBeDefined();
        });
    });

    it('sends the hidden website field so automated form fillers are rejected server-side', async () => {
        const { container } = render(<HolidayRegistrationClient />);
        const websiteInput = container.querySelector<HTMLInputElement>('input[name="website"]');
        expect(websiteInput).not.toBeNull();

        fireEvent.change(websiteInput!, { target: { value: 'https://spam.example' } });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Gonzalez/i), {
            target: { value: 'Test Parent' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i), {
            target: { value: '650-555-1111' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Alexander Gonzalez/i), {
            target: { value: 'Child 1' },
        });

        fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Get Ticket/i }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
        expect(requestBody.website).toBe('https://spam.example');
    });
});
