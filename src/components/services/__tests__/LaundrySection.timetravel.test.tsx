import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-auth session
vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock date utilities
vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2024-01-15',
    pacificDateStringFrom: (date: string) => date.split('T')[0],
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

// Mock stores
const mockLaundryRecords = [
    { id: '1', guestId: 'g1', date: '2024-01-15', status: 'waiting', laundryType: 'onsite', bagNumber: null },
    { id: '2', guestId: 'g2', date: '2024-01-15', status: 'washer', laundryType: 'onsite', bagNumber: '101' },
    { id: '3', guestId: 'g3', date: '2024-01-15', status: 'picked_up', laundryType: 'onsite', bagNumber: '102' },
    { id: '4', guestId: 'g4', date: '2024-01-14', status: 'done', laundryType: 'onsite', bagNumber: '103' },
    { id: '5', guestId: 'g5', date: '2024-01-14', status: 'picked_up', laundryType: 'onsite', bagNumber: '104' },
];

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: () => ({
        laundryRecords: mockLaundryRecords,
        updateLaundryStatus: vi.fn(),
        updateLaundryBagNumber: vi.fn(),
        cancelMultipleLaundry: vi.fn(),
        deleteLaundryRecord: vi.fn(),
    }),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: () => ({
        guests: [
            { id: 'g1', name: 'John Doe', preferredName: '' },
            { id: 'g2', name: 'Jane Smith', preferredName: 'Janie' },
            { id: 'g3', name: 'Bob Wilson', preferredName: '' },
            { id: 'g4', name: 'Alice Brown', preferredName: '' },
            { id: 'g5', name: 'Charlie Davis', preferredName: '' },
        ],
    }),
}));

// Mock child components to simplify tests
vi.mock('../CompactLaundryList', () => ({
    default: () => <div data-testid="compact-laundry-list">Compact List</div>,
}));

vi.mock('../../admin/SlotBlockModal', () => ({
    SlotBlockModal: () => null,
}));

vi.mock('../EndServiceDayPanel', () => ({
    EndServiceDayPanel: ({ isAdmin }: any) =>
        isAdmin ? <div data-testid="end-service-panel">End Service Panel</div> : null,
}));

vi.mock('../ServiceDatePicker', () => ({
    ServiceDatePicker: ({ selectedDate, onDateChange, isAdmin }: any) =>
        isAdmin ? (
            <div data-testid="service-date-picker">
                <span data-testid="selected-date">{selectedDate}</span>
                <button
                    data-testid="go-to-yesterday"
                    onClick={() => onDateChange('2024-01-14')}
                >
                    Go to Yesterday
                </button>
                <button
                    data-testid="go-to-today"
                    onClick={() => onDateChange('2024-01-15')}
                >
                    Go to Today
                </button>
            </div>
        ) : null,
}));

vi.mock('@/components/ui/CompactWaiverIndicator', () => ({
    CompactWaiverIndicator: () => null,
}));

// Import component after mocks are set up
import { LaundrySection } from '../LaundrySection';

describe('LaundrySection Time Travel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Date Picker Visibility', () => {
        it('should render date picker for admin users', () => {
            render(<LaundrySection />);
            expect(screen.getByTestId('service-date-picker')).toBeInTheDocument();
        });
    });

    describe('Today View (Default)', () => {
        it('should show today\'s date by default', () => {
            render(<LaundrySection />);
            expect(screen.getByTestId('selected-date')).toHaveTextContent('2024-01-15');
        });

        it('should show End Service Panel for today', () => {
            render(<LaundrySection />);
            expect(screen.getByTestId('end-service-panel')).toBeInTheDocument();
        });

        it('should not show historical data warning for today', () => {
            render(<LaundrySection />);
            expect(screen.queryByText(/Viewing Historical Data/)).not.toBeInTheDocument();
        });

        it('should show Manage Slots button for today', () => {
            render(<LaundrySection />);
            expect(screen.getByText('Manage Slots')).toBeInTheDocument();
        });

        it('should show drag and drop instruction for today', () => {
            render(<LaundrySection />);
            expect(screen.getByText(/Drag and drop cards between columns/)).toBeInTheDocument();
        });
    });

    describe('Historical View', () => {
        it('should show historical warning when viewing past date', async () => {
            render(<LaundrySection />);

            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // Should show historical warning
            await waitFor(() => {
                expect(screen.getByText(/Viewing Historical Data/)).toBeInTheDocument();
            });
        });

        it('should hide End Service Panel when viewing past date', async () => {
            render(<LaundrySection />);

            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // End Service Panel should be hidden
            await waitFor(() => {
                expect(screen.queryByTestId('end-service-panel')).not.toBeInTheDocument();
            });
        });

        it('should hide Manage Slots button when viewing past date', async () => {
            render(<LaundrySection />);

            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // Manage Slots should be hidden
            await waitFor(() => {
                expect(screen.queryByText('Manage Slots')).not.toBeInTheDocument();
            });
        });

        it('should show historical status restriction message when viewing past date', async () => {
            render(<LaundrySection />);

            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // Should show read-only message
            await waitFor(() => {
                expect(screen.getByText(/Historical view - status updates disabled/)).toBeInTheDocument();
            });
        });

        it('should show records from selected historical date', async () => {
            render(<LaundrySection />);

            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // Selected date should be yesterday
            await waitFor(() => {
                expect(screen.getByTestId('selected-date')).toHaveTextContent('2024-01-14');
            });
        });

        it('should return to normal view when going back to today', async () => {
            render(<LaundrySection />);

            // Go to yesterday first
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });
            
            await waitFor(() => {
                expect(screen.getByText(/Viewing Historical Data/)).toBeInTheDocument();
            });

            // Go back to today
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-today'));
            });

            // Warning should be gone
            await waitFor(() => {
                expect(screen.queryByText(/Viewing Historical Data/)).not.toBeInTheDocument();
            });
            // End Service Panel should be back
            expect(screen.getByTestId('end-service-panel')).toBeInTheDocument();
            // Manage Slots should be back
            expect(screen.getByText('Manage Slots')).toBeInTheDocument();
        });
    });

    describe('Record Filtering', () => {
        it('should show all records from historical date including completed', async () => {
            render(<LaundrySection />);

            // Go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // Should be viewing yesterday's records
            await waitFor(() => {
                expect(screen.getByTestId('selected-date')).toHaveTextContent('2024-01-14');
            });
        });
    });
});
