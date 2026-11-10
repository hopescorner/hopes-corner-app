import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HousingStatusBadge } from '../HousingStatusBadge';

describe('HousingStatusBadge', () => {
    it.each([
        ['Unhoused', 'lucide-tent'],
        ['Housed', 'lucide-house'],
        ['Temp. shelter', 'lucide-hotel'],
        ['RV or vehicle', 'lucide-caravan'],
    ])('renders %s with its category icon', (status, iconClass) => {
        const { container } = render(<HousingStatusBadge housingStatus={status} />);
        expect(screen.getByText(status)).toBeInTheDocument();
        expect(container.querySelector(`svg.${iconClass}`)).not.toBeNull();
    });

    it('normalizes messy input to the matching category icon', () => {
        const { container } = render(<HousingStatusBadge housingStatus="travel trailer rv" />);
        expect(screen.getByText('RV or vehicle')).toBeInTheDocument();
        expect(container.querySelector('svg.lucide-caravan')).not.toBeNull();
    });

    it('falls back to the help icon for missing status', () => {
        const { container } = render(<HousingStatusBadge housingStatus={null} />);
        expect(screen.getByText('Unknown')).toBeInTheDocument();
        expect(container.querySelector('svg.lucide-circle-question-mark')).not.toBeNull();
    });

    it('treats an explicit "unknown" value as the unknown state', () => {
        const { container } = render(<HousingStatusBadge housingStatus="unknown" />);
        expect(screen.getByText('Unknown')).toBeInTheDocument();
        expect(container.querySelector('svg.lucide-circle-question-mark')).not.toBeNull();
    });
});
