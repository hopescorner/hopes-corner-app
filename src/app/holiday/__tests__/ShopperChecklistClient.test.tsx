import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ShopperChecklistClient from '../shopper/ShopperChecklistClient';
import { HolidayShopperPayload } from '@/lib/holiday/shopperToken';

describe('ShopperChecklistClient', () => {
    const mockData: HolidayShopperPayload = {
        v: 1,
        ticketNumber: 104,
        timeSlot: '10:00 AM - 10:20 AM',
        children: [
            { id: 'child-1', age: 3, ageGroup: 'toddler', gender: 'girl' },
            { id: 'child-2', age: 8, ageGroup: 'child' },
            { id: 'child-3', age: 16, ageGroup: 'teen_16_18' },
        ],
        iat: 123456789,
    };

    beforeEach(() => {
        localStorage.clear();
    });

    it('renders ticket number, arrival time slot, and non-PII checklist items', () => {
        render(<ShopperChecklistClient data={mockData} />);

        expect(screen.getByText('#104')).toBeDefined();
        expect(screen.getByText('10:00 AM - 10:20 AM')).toBeDefined();
        expect(screen.getByText(/Volunteer Shopper/i)).toBeDefined();

        expect(screen.getByText('Child 1')).toBeDefined();
        expect(screen.getByText('Child 2')).toBeDefined();
        expect(screen.getByText('Child 3')).toBeDefined();

        expect(screen.getByText(/Age 3/i)).toBeDefined();
        expect(screen.getByText(/Age 8/i)).toBeDefined();
        expect(screen.getByText(/Age 16/i)).toBeDefined();

        expect(screen.getByText('Toddler (1-4)')).toBeDefined();
        expect(screen.getByText('Child (5-12)')).toBeDefined();
        expect(screen.getByText('Teen (16-18)')).toBeDefined();

        expect(screen.getByText(/Teen Gift Card \(14–18\)/i)).toBeDefined();

        expect(screen.queryByText(/Carlos/i)).toBeNull();
        expect(screen.queryByText(/Ramirez/i)).toBeNull();
        expect(screen.queryByText(/650-/i)).toBeNull();
    });

    it('toggles child items and updates progress', () => {
        render(<ShopperChecklistClient data={mockData} />);

        expect(screen.getByText('0 of 3 Items (0%)')).toBeDefined();

        const child1Btn = screen.getByRole('button', { name: /Child 1/i });
        fireEvent.click(child1Btn);

        expect(screen.getByText('1 of 3 Items (33%)')).toBeDefined();

        const child2Btn = screen.getByRole('button', { name: /Child 2/i });
        fireEvent.click(child2Btn);

        const child3Btn = screen.getByRole('button', { name: /Child 3/i });
        fireEvent.click(child3Btn);

        expect(screen.getByText('3 of 3 Items (100%)')).toBeDefined();
        expect(screen.getByTestId('shopper-complete-card')).toBeDefined();
        expect(screen.getByText(/All Gifts Selected for Ticket #104!/i)).toBeDefined();
    });

    it('allows resetting the checklist', () => {
        render(<ShopperChecklistClient data={mockData} />);

        const child1Btn = screen.getByRole('button', { name: /Child 1/i });
        fireEvent.click(child1Btn);
        expect(screen.getByText('1 of 3 Items (33%)')).toBeDefined();

        const resetBtn = screen.getByRole('button', { name: /Reset/i });
        fireEvent.click(resetBtn);

        expect(screen.getByText('0 of 3 Items (0%)')).toBeDefined();
    });
});
