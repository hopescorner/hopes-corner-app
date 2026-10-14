import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuestMealActions, GuestExtraMealSection } from '../GuestMealActions';
import { GuestQuickServiceSlots, GuestServiceSlots, GuestAdditionalServices } from '../GuestServiceSlots';
import { GuestWarningBadge, GuestWarningsPanel } from '../GuestWarnings';
import { useGuestsStore } from '@/stores/useGuestsStore';

describe('GuestSubcomponents', () => {
    describe('GuestMealActions', () => {
        it('renders 1 and 2 meal buttons when no meal logged', () => {
            const onMealAdd = vi.fn();
            render(
                <GuestMealActions
                    guest={{ id: 'g1' }}
                    todayMeal={false}
                    baseMealCount={0}
                    extraMealsCount={0}
                    totalMeals={0}
                    hasReachedMealLimit={false}
                    hasReachedExtraMealLimit={false}
                    isBannedFromMeals={false}
                    isPending={false}
                    onMealAdd={onMealAdd}
                    onExtraMealAdd={vi.fn()}
                    onUndo={vi.fn()}
                />
            );

            const meal1Buttons = screen.getAllByRole('button', { name: /log 1 meal/i });
            expect(meal1Buttons.length).toBeGreaterThan(0);
            fireEvent.click(meal1Buttons[0]);
            expect(onMealAdd).toHaveBeenCalledWith(expect.anything(), 1);
        });

        it('renders disabled state when banned from meals', () => {
            render(
                <GuestMealActions
                    guest={{ id: 'g1' }}
                    todayMeal={false}
                    baseMealCount={0}
                    extraMealsCount={0}
                    totalMeals={0}
                    hasReachedMealLimit={false}
                    hasReachedExtraMealLimit={false}
                    isBannedFromMeals={true}
                    isPending={false}
                    onMealAdd={vi.fn()}
                    onExtraMealAdd={vi.fn()}
                    onUndo={vi.fn()}
                />
            );

            expect(screen.getAllByText(/meals/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/banned/i).length).toBeGreaterThan(0);
        });
    });

    describe('GuestExtraMealSection', () => {
        it('renders extra meal button and handles clicks', () => {
            const onExtraMealAdd = vi.fn();
            render(
                <GuestExtraMealSection
                    todayMeal={true}
                    hasReachedMealLimit={false}
                    hasReachedExtraMealLimit={false}
                    totalMeals={1}
                    extraMealsCount={0}
                    isPending={false}
                    isBannedFromMeals={false}
                    onExtraMealAdd={onExtraMealAdd}
                    onUndo={vi.fn()}
                />
            );

            const btn = screen.getByRole('button', { name: /add extra meal/i });
            fireEvent.click(btn);
            expect(onExtraMealAdd).toHaveBeenCalled();
        });

        it('shows limit notice when meal limit is reached', () => {
            render(
                <GuestExtraMealSection
                    todayMeal={true}
                    hasReachedMealLimit={true}
                    hasReachedExtraMealLimit={false}
                    totalMeals={4}
                    extraMealsCount={2}
                    isPending={false}
                    isBannedFromMeals={false}
                    onExtraMealAdd={vi.fn()}
                    onUndo={vi.fn()}
                />
            );

            expect(screen.getByText(/daily meal limit reached/i)).toBeDefined();
        });
    });

    describe('GuestQuickServiceSlots', () => {
        it('renders shower and laundry quick action buttons', () => {
            const onQuickShower = vi.fn();
            const onQuickLaundry = vi.fn();
            render(
                <GuestQuickServiceSlots
                    guest={{ id: 'g1' }}
                    isPending={false}
                    todayShower={false}
                    todayLaundry={false}
                    isBannedFromShower={false}
                    isBannedFromLaundry={false}
                    onQuickShower={onQuickShower}
                    onQuickLaundry={onQuickLaundry}
                    onUndo={vi.fn()}
                />
            );

            const showerBtn = screen.getByTitle(/waitlist/i);
            fireEvent.click(showerBtn);
            expect(onQuickShower).toHaveBeenCalled();

            const laundryBtn = screen.getByTitle(/book laundry/i);
            fireEvent.click(laundryBtn);
            expect(onQuickLaundry).toHaveBeenCalled();
        });
    });

    describe('GuestServiceSlots', () => {
        it('renders expanded grid of shower, laundry, and bicycle slots', () => {
            const onOpenBicyclePicker = vi.fn();
            render(
                <GuestServiceSlots
                    guest={{ id: 'g1' }}
                    todayShower={false}
                    todayLaundry={false}
                    todayBicycle={false}
                    isBannedFromShower={false}
                    isBannedFromLaundry={false}
                    isBannedFromBicycle={false}
                    onQuickShower={vi.fn()}
                    onQuickLaundry={vi.fn()}
                    onOpenShowerPicker={vi.fn()}
                    onOpenLaundryPicker={vi.fn()}
                    onOpenBicyclePicker={onOpenBicyclePicker}
                    onUndo={vi.fn()}
                />
            );

            const bikeBtn = screen.getByRole('button', { name: /bicycle/i });
            fireEvent.click(bikeBtn);
            expect(onOpenBicyclePicker).toHaveBeenCalled();
        });
    });

    describe('GuestAdditionalServices', () => {
        it('renders haircut and holiday actions', () => {
            const onHaircutAdd = vi.fn();
            const onHolidayAdd = vi.fn();
            render(
                <GuestAdditionalServices
                    guestId="g1"
                    todayHaircut={false}
                    todayHoliday={false}
                    isPending={false}
                    isBannedFromAllServices={false}
                    hasHaircutForSelectedDate={false}
                    haircutDate="2026-10-14"
                    today="2026-10-14"
                    onHaircutDateChange={vi.fn()}
                    onHaircutAdd={onHaircutAdd}
                    onHolidayAdd={onHolidayAdd}
                    onUndo={vi.fn()}
                />
            );

            const holidayBtn = screen.getByRole('button', { name: /holiday service/i });
            fireEvent.click(holidayBtn);
            expect(onHolidayAdd).toHaveBeenCalled();
        });
    });

    describe('GuestWarnings', () => {
        it('renders warning badge and panel', () => {
            useGuestsStore.setState({
                warnings: [
                    { id: 'w1', guestId: 'g1', active: true, severity: 2, message: 'Warning message', createdAt: '2026-10-14' } as any,
                ],
            });

            const onExpand = vi.fn();
            render(
                <div>
                    <GuestWarningBadge guestId="g1" fallbackCount={1} onExpand={onExpand} />
                    <GuestWarningsPanel guestId="g1" onManage={vi.fn()} />
                </div>
            );

            const badge = screen.getByTestId('warning-badge');
            fireEvent.click(badge);
            expect(onExpand).toHaveBeenCalled();

            expect(screen.getByTestId('warnings-panel')).toBeDefined();
            expect(screen.getByText('Warning message')).toBeDefined();
        });
    });
});
