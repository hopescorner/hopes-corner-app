import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import HolidayRegistrationClient from '../HolidayRegistrationClient';

vi.mock('@/lib/holiday/ticketImage', () => ({
    downloadTicketImage: vi.fn().mockResolvedValue(true),
    downloadTicketPdf: vi.fn().mockResolvedValue(true),
}));

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
        expect(screen.getByText(/How Registration & Event Day Works/i)).toBeDefined();
        expect(screen.getByText(/1\. Register Your Family/i)).toBeDefined();
        expect(screen.getByText(/2\. Receive Arrival Ticket/i)).toBeDefined();
        expect(screen.getByText(/3\. Shop with a Volunteer/i)).toBeDefined();
        expect(screen.getByText(/Helpful Registration Instructions & Guidelines/i)).toBeDefined();
        expect(screen.getByText(/Parent \/ Guardian Information/i)).toBeDefined();
        expect(screen.getByText(/Automatic Arrival Window/i)).toBeDefined();
        expect(screen.getByText(/Complete Registration & Get Ticket/i)).toBeDefined();
    });

    it('switches languages dynamically to Spanish and Mandarin including instructions', async () => {
        render(<HolidayRegistrationClient />);

        // Switch to Spanish
        const esBtn = screen.getByRole('button', { name: 'Español' });
        fireEvent.click(esBtn);
        expect(screen.getByText(/DISTRIBUCIÓN DE JUGUETES NAVIDEÑOS/i)).toBeDefined();
        expect(screen.getByText(/Cómo Funciona el Registro y el Día del Evento/i)).toBeDefined();
        expect(screen.getByText(/1\. Inscriba a su Familia/i)).toBeDefined();
        expect(screen.getByText(/Información del Padre \/ Tutor/i)).toBeDefined();
        expect(screen.getByText(/Horario de Llegada Automático/i)).toBeDefined();

        // Switch to Mandarin
        const zhBtn = screen.getByRole('button', { name: /中文/i });
        fireEvent.click(zhBtn);
        expect(screen.getByText(/年度节日玩具分发活动/i)).toBeDefined();
        expect(screen.getByText(/活动登记与参与流程说明/i)).toBeDefined();
        expect(screen.getByText(/1\. 填写家庭信息/i)).toBeDefined();
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

        // Fill Child Birthdate
        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(birthdateInput, { target: { value: '2012-05-15' } });

        // Submit form directly without slot selection
        const submitBtn = screen.getByRole('button', { name: /Complete Registration & Get Ticket/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('#88')).toBeDefined();
            expect(screen.getByText('09:00 AM - 09:20 AM')).toBeDefined();
            expect(screen.getByText(/Registration Confirmed!/i)).toBeDefined();
            expect(screen.getByRole('button', { name: /Save \/ Download Image/i })).toBeDefined();
            expect(screen.getByRole('button', { name: /Download PDF/i })).toBeDefined();
            expect(screen.getByRole('button', { name: /Print Ticket/i })).toBeDefined();
            expect(screen.queryByText(/Eligible Items Summary/i)).toBeNull();
            expect(screen.queryByText(/Family Grocery Card/i)).toBeNull();
            expect(screen.getByText(/Please arrive 10 minutes before your assigned time slot and bring your ticket confirmation on your phone\./i)).toBeDefined();
            expect(screen.getByText(/Official Event Check-In QR Code/i)).toBeDefined();
            expect(screen.getByAltText(/Ticket QR Code/i)).toBeDefined();
        });
    });

    it('requires child birthdate and shows error when missing', async () => {
        render(<HolidayRegistrationClient />);

        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Gonzalez/i), {
            target: { value: 'Test Parent' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i), {
            target: { value: '650-555-1111' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Alexander Gonzalez/i), {
            target: { value: 'Child 1' },
        });

        // Submit form without entering birthdate
        const submitBtn = screen.getByRole('button', { name: /Complete Registration & Get Ticket/i });
        fireEvent.submit(submitBtn.closest('form')!);

        await waitFor(() => {
            expect(screen.getByText(/Please enter the child's birthdate\./i)).toBeDefined();
        });
    });

    it('auto-populates read-only age when birthdate is entered', () => {
        render(<HolidayRegistrationClient />);

        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        expect(birthdateInput.required).toBe(true);

        const ageInput = screen.getByLabelText(/Age \(0–18\)/i) as HTMLInputElement;
        expect(ageInput.readOnly).toBe(true);
        expect(ageInput.value).toBe('—');

        const currentYear = new Date().getFullYear();
        fireEvent.change(birthdateInput, { target: { value: `${currentYear - 8}-01-01` } });

        expect(ageInput.value).toContain('8');
    });

    it('does not display gift card or grocery card badges for children or teens during registration', () => {
        render(<HolidayRegistrationClient />);

        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        const currentYear = new Date().getFullYear();
        // Set teen age (16 years old)
        fireEvent.change(birthdateInput, { target: { value: `${currentYear - 16}-01-01` } });

        expect(screen.queryByText(/Gift Card/i)).toBeNull();
        expect(screen.queryByText(/Grocery Card/i)).toBeNull();
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
        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(birthdateInput, { target: { value: '2015-06-01' } });

        fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Get Ticket/i }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
        expect(requestBody.website).toBe('https://spam.example');
    });

    it('limits phone number to 10 digits and formats standard US display', () => {
        render(<HolidayRegistrationClient />);

        const phoneInput = screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i) as HTMLInputElement;

        // Type 12 digits — should be capped at 10 digits
        fireEvent.change(phoneInput, { target: { value: '650555123499' } });
        expect(phoneInput.value).toBe('(650) 555-1234');
    });

    it('shows error when phone number has fewer than 10 digits', async () => {
        render(<HolidayRegistrationClient />);

        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Gonzalez/i), {
            target: { value: 'Test Parent' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i), {
            target: { value: '650-555' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Alexander Gonzalez/i), {
            target: { value: 'Child 1' },
        });
        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(birthdateInput, { target: { value: '2015-06-01' } });

        fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Get Ticket/i }));

        await waitFor(() => {
            expect(screen.getByText(/Please enter a valid phone number\./i)).toBeDefined();
        });
    });

    it('supports saving ticket as image and downloading as PDF', async () => {
        const { downloadTicketImage, downloadTicketPdf } = await import('@/lib/holiday/ticketImage');
        render(<HolidayRegistrationClient />);

        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Maria Gonzalez/i), {
            target: { value: 'Test Parent' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. \(650\) 555-0123/i), {
            target: { value: '650-555-1111' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e\.g\. Alexander Gonzalez/i), {
            target: { value: 'Child 1' },
        });
        const birthdateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(birthdateInput, { target: { value: '2015-06-01' } });

        fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Get Ticket/i }));

        await waitFor(() => {
            expect(screen.getByText('#88')).toBeDefined();
        });

        expect(downloadTicketImage).toHaveBeenCalledWith(
            expect.objectContaining({ ticketNumber: 88 }),
            { auto: true }
        );

        const saveImgBtn = screen.getByRole('button', { name: /Save \/ Download Image/i });
        fireEvent.click(saveImgBtn);

        await waitFor(() => {
            expect(downloadTicketImage).toHaveBeenCalledWith(
                expect.objectContaining({ ticketNumber: 88 }),
                { auto: false }
            );
        });

        const downloadPdfBtn = screen.getByRole('button', { name: /Download PDF/i });
        fireEvent.click(downloadPdfBtn);

        await waitFor(() => {
            expect(downloadTicketPdf).toHaveBeenCalledWith(
                expect.objectContaining({ ticketNumber: 88 })
            );
        });
    });
});
