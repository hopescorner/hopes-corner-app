import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LaundrySection } from '../LaundrySection';

// Mock next-auth
vi.mock('next-auth/react', () => ({
    useSession: vi.fn(() => ({
        data: { user: { role: 'admin' } },
        status: 'authenticated',
    })),
}));

// Mock toast - use inline object to avoid hoisting issues
vi.mock('react-hot-toast', () => ({
    default: {
        loading: vi.fn(() => 'toast-id'),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Import toast after mocking to get the mocked version
import toast from 'react-hot-toast';

// Create mock function for loadFromSupabase
const mockLoadFromSupabase = vi.fn().mockResolvedValue(undefined);

// Mock stores
vi.mock('@/stores/useServicesStore', () => ({
    useServicesStore: vi.fn(() => ({
        laundryRecords: [],
        updateLaundryStatus: vi.fn().mockResolvedValue(true),
        updateLaundryBagNumber: vi.fn().mockResolvedValue(true),
        cancelMultipleLaundry: vi.fn().mockResolvedValue(true),
        loadFromSupabase: mockLoadFromSupabase,
    })),
}));

vi.mock('@/stores/useGuestsStore', () => ({
    useGuestsStore: vi.fn(() => ({
        guests: [],
    })),
}));

vi.mock('@/stores/useBlockedSlotsStore', () => ({
    useBlockedSlotsStore: vi.fn(() => ({
        blockedSlots: [],
        isSlotBlocked: vi.fn(() => false),
        fetchBlockedSlots: vi.fn(),
    })),
}));

// Mock date utilities
vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: vi.fn(() => '2026-01-22'),
    pacificDateStringFrom: vi.fn((date: string | null) => {
        if (!date) return '2026-01-22';
        if (typeof date === 'string') return date.split('T')[0];
        return '2026-01-22';
    }),
    formatTimeInPacific: () => '12:00 PM',
    formatPacificTimeString: (timeStr: string) => timeStr,
}));

describe('LaundrySection Refresh Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders refresh button', () => {
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        expect(refreshButton).toBeDefined();
    });

    it('calls loadFromSupabase when refresh button is clicked', async () => {
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(mockLoadFromSupabase).toHaveBeenCalled();
        });
    });

    it('shows loading toast while refreshing', async () => {
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        expect(toast.loading).toHaveBeenCalledWith('Refreshing laundry...');
    });

    it('shows success toast after refresh completes', async () => {
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Laundry refreshed', { id: 'toast-id' });
        });
    });

    it('shows error toast when refresh fails', async () => {
        mockLoadFromSupabase.mockRejectedValueOnce(new Error('Network error'));
        
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to refresh', { id: 'toast-id' });
        });
    });

    it('disables button while refreshing', async () => {
        let resolvePromise: () => void;
        mockLoadFromSupabase.mockReturnValueOnce(new Promise<void>((resolve) => {
            resolvePromise = resolve;
        }));
        
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        // Button should be disabled while loading
        expect(refreshButton).toBeDisabled();
        
        // Resolve the promise
        resolvePromise!();
        
        await waitFor(() => {
            expect(refreshButton).not.toBeDisabled();
        });
    });

    it('shows spinning animation on refresh icon while loading', async () => {
        let resolvePromise: () => void;
        mockLoadFromSupabase.mockReturnValueOnce(new Promise<void>((resolve) => {
            resolvePromise = resolve;
        }));
        
        render(<LaundrySection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh laundry data/i });
        fireEvent.click(refreshButton);
        
        // Check for animate-spin class on the icon
        const refreshIcon = refreshButton.querySelector('svg');
        expect(refreshIcon?.classList.contains('animate-spin')).toBe(true);
        
        // Resolve and check animation stops
        resolvePromise!();
        
        await waitFor(() => {
            expect(refreshIcon?.classList.contains('animate-spin')).toBe(false);
        });
    });
});

describe('LaundrySection Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders On-site Laundry header', () => {
        render(<LaundrySection />);
        
        expect(screen.getByText(/On-site Laundry/i)).toBeDefined();
    });

    it('renders Manage Slots button when not viewing past', () => {
        render(<LaundrySection />);
        
        expect(screen.getByText('Manage Slots')).toBeDefined();
    });

    it('renders view mode toggle buttons', () => {
        render(<LaundrySection />);
        
        const kanbanButton = screen.getByTitle('Kanban View');
        const listButton = screen.getByTitle('List View');
        
        expect(kanbanButton).toBeDefined();
        expect(listButton).toBeDefined();
    });

    it('shows total count badge', () => {
        render(<LaundrySection />);
        
        expect(screen.getByText('0 total')).toBeDefined();
    });
});

describe('LaundrySection with Records', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays laundry records grouped by status in kanban view', () => {
        // This test verifies the kanban structure exists
        render(<LaundrySection />);
        
        // Status columns should be present
        expect(screen.getByText('Waiting')).toBeDefined();
        expect(screen.getByText('In Washer')).toBeDefined();
        expect(screen.getByText('In Dryer')).toBeDefined();
        expect(screen.getByText('Ready')).toBeDefined();
    });
});
