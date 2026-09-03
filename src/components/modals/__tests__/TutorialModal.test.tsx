import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TutorialModal } from '../TutorialModal';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual as any,
        // Ensure icons render as svgs or similar so they don't break
    };
});

describe('TutorialModal', () => {
    const mockOnClose = vi.fn();

    it('renders nothing when closed', () => {
        render(<TutorialModal isOpen={false} onClose={mockOnClose} />);
        expect(screen.queryByText("Welcome to Hope's Corner!")).toBeNull();
    });

    it('renders first step when open', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText("Welcome to Hope's Corner!")).toBeDefined();
        expect(screen.getByText(/Step 1 of/)).toBeDefined();
    });

    it('navigates through steps', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);

        // Initial state
        expect(screen.getByText("Welcome to Hope's Corner!")).toBeDefined();

        // Next
        fireEvent.click(screen.getByText('Next'));
        expect(screen.getByText('Search for a Guest')).toBeDefined();
        expect(screen.getByText(/Step 2 of/)).toBeDefined();

        // Back
        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByText("Welcome to Hope's Corner!")).toBeDefined();
    });

    it('closes on Skip tutorial click', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Skip tutorial'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes on Close (X) button click', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);

        const closeButton = screen.getByLabelText('Close tutorial');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('completes tutorial and closes', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);

        // Click Next until last step
        // We have 9 steps.
        // Step 1 -> Click Next -> Step 2
        // ...
        // Better way: check for "Get Started" button?
        // It only appears on last step.

        // Just loop clicks
        const steps = 9; // Based on array
        for (let i = 0; i < steps - 1; i++) {
            fireEvent.click(screen.getByText('Next'));
        }

        // Now should see "Get Started"
        expect(screen.getByText("You're Ready!")).toBeDefined();
        const getStartedBtn = screen.getByText('Get Started');

        fireEvent.click(getStartedBtn);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('navigates via progress dots', () => {
        render(<TutorialModal isOpen={true} onClose={mockOnClose} />);

        // Click 3rd dot (index 2)
        const dots = screen.getAllByLabelText(/Go to step/);
        fireEvent.click(dots[2]);

        expect(screen.getByText('Log Meals Fast')).toBeDefined();
    });
});
