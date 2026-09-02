import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentCheckinsBar } from '../RecentCheckinsBar';
import { useActionHistoryStore } from '@/stores/useActionHistoryStore';

describe('RecentCheckinsBar', () => {
    const mockGuests: any[] = [
        { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny' },
        { id: 'g2', firstName: 'Jane', lastName: 'Smith' },
    ];

    beforeEach(() => {
        useActionHistoryStore.setState({
            actionHistory: [
                {
                    id: 'act-1',
                    type: 'MEAL_ADDED',
                    timestamp: new Date().toISOString(),
                    data: { guestId: 'g1', recordId: 'rec-1' },
                },
                {
                    id: 'act-2',
                    type: 'SHOWER_BOOKED',
                    timestamp: new Date().toISOString(),
                    data: { guestId: 'g2', recordId: 'rec-2' },
                },
            ],
        });
    });

    it('renders recent checkins with guest names', () => {
        render(<RecentCheckinsBar guests={mockGuests} onSelectGuest={vi.fn()} />);
        expect(screen.getByText('Johnny')).toBeDefined();
        expect(screen.getByText('Jane Smith')).toBeDefined();
        expect(screen.getByText('Meal')).toBeDefined();
        expect(screen.getByText('Shower')).toBeDefined();
    });

    it('calls onSelectGuest when clicked', () => {
        const onSelect = vi.fn();
        render(<RecentCheckinsBar guests={mockGuests} onSelectGuest={onSelect} />);
        
        fireEvent.click(screen.getByText('Johnny'));
        expect(onSelect).toHaveBeenCalledWith(mockGuests[0]);
    });

    it('renders null when there are no actions', () => {
        useActionHistoryStore.setState({ actionHistory: [] });
        const { container } = render(<RecentCheckinsBar guests={mockGuests} onSelectGuest={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });
});
