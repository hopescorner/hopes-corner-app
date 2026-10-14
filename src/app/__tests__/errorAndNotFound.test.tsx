import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from '../error';
import NotFound from '../not-found';
import RootLoading from '../loading';

describe('Root App Boundaries', () => {
    it('renders error boundary and triggers reset when retry clicked', () => {
        const resetMock = vi.fn();
        const testError = new Error('Test crash message');

        render(<GlobalError error={testError} reset={resetMock} />);

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test crash message')).toBeInTheDocument();

        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);
        expect(resetMock).toHaveBeenCalledTimes(1);
    });

    it('renders not found boundary with check-in link', () => {
        render(<NotFound />);
        expect(screen.getByText('Page not found')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /return to check-in/i });
        expect(link).toHaveAttribute('href', '/check-in');
    });

    it('renders root loading boundary with accessible busy state', () => {
        render(<RootLoading />);
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('aria-busy', 'true');
    });
});
