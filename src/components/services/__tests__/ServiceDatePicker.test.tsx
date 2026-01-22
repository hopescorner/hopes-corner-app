import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceDatePicker } from '../ServiceDatePicker';

// Mock date utilities
vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2024-01-15',
    pacificDateStringFrom: (isoStr: string) => isoStr.split('T')[0],
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

describe('ServiceDatePicker', () => {
    const mockOnDateChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should not render when user is not admin/staff', () => {
            const { container } = render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={false}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render when user is admin', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            // Check for navigation buttons
            expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
            expect(screen.getByLabelText('Next day')).toBeInTheDocument();
        });

        it('should show "Back to Today" button when viewing a past date', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-10"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            expect(screen.getByText('Back to Today')).toBeInTheDocument();
        });

        it('should not show "Back to Today" button when viewing today', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            expect(screen.queryByText('Back to Today')).not.toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate to previous day when clicking left arrow', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            fireEvent.click(screen.getByLabelText('Previous day'));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-01-14');
        });

        it('should navigate to next day when clicking right arrow', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-14"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            fireEvent.click(screen.getByLabelText('Next day'));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-01-15');
        });

        it('should disable next day button when viewing today', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            const nextButton = screen.getByLabelText('Next day');
            expect(nextButton).toBeDisabled();
        });

        it('should not disable next day button when viewing a past date', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-10"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            const nextButton = screen.getByLabelText('Next day');
            expect(nextButton).not.toBeDisabled();
        });

        it('should return to today when clicking "Back to Today" button', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-10"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            fireEvent.click(screen.getByText('Back to Today'));
            expect(mockOnDateChange).toHaveBeenCalledWith('2024-01-15');
        });
    });

    describe('Date Display', () => {
        it('should display "Today" for current date', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            expect(screen.getByText('Today')).toBeInTheDocument();
        });

        it('should display "Yesterday" for previous date', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-14"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            expect(screen.getByText('Yesterday')).toBeInTheDocument();
        });
    });

    describe('Calendar Toggle', () => {
        it('should open calendar dropdown when clicking calendar button', () => {
            render(
                <ServiceDatePicker
                    selectedDate="2024-01-15"
                    onDateChange={mockOnDateChange}
                    isAdmin={true}
                />
            );
            // Click the calendar toggle button
            const calendarButton = screen.getByLabelText('Toggle calendar');
            fireEvent.click(calendarButton);
            
            // Calendar should be visible with month navigation
            expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
            expect(screen.getByLabelText('Next month')).toBeInTheDocument();
        });
    });
});
