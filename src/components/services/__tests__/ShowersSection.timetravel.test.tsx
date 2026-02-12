import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-auth session
let mockRole = 'admin';
vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { role: mockRole } },
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
const mockShowerRecords = [
    { id: '1', guestId: 'g1', date: '2024-01-15', status: 'booked', time: '09:00' },
    { id: '2', guestId: 'g2', date: '2024-01-15', status: 'done', time: '10:00' },
    { id: '3', guestId: 'g3', date: '2024-01-14', status: 'done', time: '09:00' },
    { id: '4', guestId: 'g4', date: '2024-01-14', status: 'cancelled', time: '10:00' },
];

const mockAddShowerRecord = vi.fn().mockResolvedValue({ id: 'new-shower' });
const mockAddShowerWaitlist = vi.fn().mockResolvedValue({ id: 'new-waitlist' });

vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: (selector: any) => {
        const state = {
            showerRecords: mockShowerRecords,
            cancelMultipleShowers: vi.fn(),
            addShowerRecord: mockAddShowerRecord,
            addShowerWaitlist: mockAddShowerWaitlist,
            deleteShowerRecord: vi.fn(),
            updateShowerStatus: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: (selector: any) => {
        const state = {
            guests: [
                { id: 'g1', name: 'John Doe', preferredName: '' },
                { id: 'g2', name: 'Jane Smith', preferredName: 'Janie' },
                { id: 'g3', name: 'Bob Wilson', preferredName: '' },
                { id: 'g4', name: 'Alice Brown', preferredName: '' },
            ],
        };
        return typeof selector === 'function' ? selector(state) : state;
    },
}));

// Mock child components to simplify tests
vi.mock('../CompactShowerList', () => ({
    default: () => <div data-testid="compact-shower-list">Compact List</div>,
}));

vi.mock('../ShowerDetailModal', () => ({
    ShowerDetailModal: () => null,
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
import { ShowersSection } from '../ShowersSection';

describe('ShowersSection Time Travel', () => {
    beforeEach(() => {
        mockRole = 'admin';
        vi.clearAllMocks();
    });

    it('allows staff to use historical add actions', () => {
        mockRole = 'staff';
        render(<ShowersSection />);
        expect(screen.getByRole('button', { name: 'Add Done' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add Shower' })).toBeInTheDocument();
    });

    it('adds a completed shower for a historical date', async () => {
        render(<ShowersSection />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('go-to-yesterday'));
        });

        fireEvent.change(screen.getByDisplayValue('Select guest'), {
            target: { value: 'g1' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Add Done' }));

        await waitFor(() => {
            expect(mockAddShowerRecord).toHaveBeenCalledWith('g1', undefined, '2024-01-14', 'done');
        });
    });

    describe('Date Picker Visibility', () => {
        it('should render date picker for admin users', () => {
            render(<ShowersSection />);
            expect(screen.getByTestId('service-date-picker')).toBeInTheDocument();
        });
    });

    describe('Today View (Default)', () => {
        it('should show today\'s records by default', () => {
            render(<ShowersSection />);
            // Default is today (2024-01-15), should show 2 records (1 active, 1 completed)
            expect(screen.getByTestId('selected-date')).toHaveTextContent('2024-01-15');
        });

        it('should show End Service Panel for today', () => {
            render(<ShowersSection />);
            expect(screen.getByTestId('end-service-panel')).toBeInTheDocument();
        });

        it('should not show historical data warning for today', () => {
            render(<ShowersSection />);
            expect(screen.queryByText(/Viewing Historical Data/)).not.toBeInTheDocument();
        });
    });

    describe('Historical View', () => {
        it('should show historical warning when viewing past date', async () => {
            render(<ShowersSection />);
            
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
            render(<ShowersSection />);
            
            // Click to go to yesterday
            await act(async () => {
                fireEvent.click(screen.getByTestId('go-to-yesterday'));
            });

            // End Service Panel should be hidden
            await waitFor(() => {
                expect(screen.queryByTestId('end-service-panel')).not.toBeInTheDocument();
            });
        });

        it('should show records from selected historical date', async () => {
            render(<ShowersSection />);
            
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
            render(<ShowersSection />);
            
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
        });
    });
});
