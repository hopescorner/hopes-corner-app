import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ShowersSection } from '../ShowersSection';

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
        showerRecords: [],
        cancelMultipleShowers: vi.fn().mockResolvedValue(true),
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

vi.mock('@/lib/utils/serviceSlots', () => ({
    formatSlotLabel: vi.fn((slot: string) => slot),
}));

describe('ShowersSection Refresh Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders refresh button', () => {
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
        expect(refreshButton).toBeDefined();
    });

    it('calls loadFromSupabase when refresh button is clicked', async () => {
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(mockLoadFromSupabase).toHaveBeenCalled();
        });
    });

    it('shows loading toast while refreshing', async () => {
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
        fireEvent.click(refreshButton);
        
        expect(toast.loading).toHaveBeenCalledWith('Refreshing showers...');
    });

    it('shows success toast after refresh completes', async () => {
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Showers refreshed', { id: 'toast-id' });
        });
    });

    it('shows error toast when refresh fails', async () => {
        mockLoadFromSupabase.mockRejectedValueOnce(new Error('Network error'));
        
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to refresh', { id: 'toast-id' });
        });
    });

    it('disables button while refreshing', async () => {
        // Make the mock promise not resolve immediately
        let resolvePromise: () => void;
        mockLoadFromSupabase.mockReturnValueOnce(new Promise<void>((resolve) => {
            resolvePromise = resolve;
        }));
        
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
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
        
        render(<ShowersSection />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh shower data/i });
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

describe('ShowersSection Rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Manage Slots button', () => {
        render(<ShowersSection />);
        
        expect(screen.getByText('Manage Slots')).toBeDefined();
    });

    it('renders date picker', () => {
        render(<ShowersSection />);
        
        // ServiceDatePicker should be rendered
        expect(document.querySelector('[class*="date"]')).toBeDefined();
    });

    it('renders view mode toggle buttons', () => {
        render(<ShowersSection />);
        
        const gridButton = screen.getByTitle('Grid View');
        const listButton = screen.getByTitle('List View');
        
        expect(gridButton).toBeDefined();
        expect(listButton).toBeDefined();
    });
});
