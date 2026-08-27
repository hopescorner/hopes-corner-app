import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DuplicateGuestResolutionModal } from '@/components/checkin/DuplicateGuestResolutionModal';

const first = {
    id: '11111111-1111-4111-8111-111111111111',
    guestId: 'LEGACY-101',
    firstName: 'Jordan',
    lastName: 'Lee',
    name: 'Jordan Lee',
    preferredName: '',
    createdAt: '2024-01-10T00:00:00.000Z',
};
const second = {
    ...first,
    id: '22222222-2222-4222-8222-222222222222',
    guestId: 'LEGACY-202',
    createdAt: '2025-02-11T00:00:00.000Z',
};

describe('DuplicateGuestResolutionModal', () => {
    it('requires the operator to choose the surviving profile and confirm before merging', async () => {
        const user = userEvent.setup();
        const onMerge = vi.fn().mockResolvedValue(undefined);
        render(
            <DuplicateGuestResolutionModal
                pair={{ first, second, reason: 'Exact name match', confidence: 1 }}
                onClose={vi.fn()}
                onMerge={onMerge}
                onDismiss={vi.fn()}
            />
        );

        const mergeButton = screen.getByRole('button', { name: /merge profiles/i });
        expect(mergeButton).toBeDisabled();

        await user.click(screen.getByRole('button', { name: /keep legacy-101/i }));
        expect(screen.getByText(/records from legacy-202 will transfer to legacy-101/i)).toBeInTheDocument();
        expect(mergeButton).toBeDisabled();

        await user.click(screen.getByRole('checkbox', { name: /i understand/i }));
        await user.click(mergeButton);

        expect(onMerge).toHaveBeenCalledWith({
            keepGuestId: first.id,
            duplicateGuestId: second.id,
        });
    });

    it('allows an operator to mark a false positive as two different people', async () => {
        const user = userEvent.setup();
        const onDismiss = vi.fn().mockResolvedValue(undefined);
        render(
            <DuplicateGuestResolutionModal
                pair={{ first, second, reason: 'Exact name match', confidence: 1 }}
                onClose={vi.fn()}
                onMerge={vi.fn()}
                onDismiss={onDismiss}
            />
        );

        await user.click(screen.getByRole('button', { name: /these are different people/i }));

        expect(onDismiss).toHaveBeenCalledWith({ firstGuestId: first.id, secondGuestId: second.id });
    });
});
