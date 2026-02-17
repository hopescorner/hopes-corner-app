import { test, expect } from '@playwright/experimental-ct-react';
import { MealsSectionStory } from '../__ct__/stories';

// Compute today's date in Pacific time (matches component's todayPacificDateString())
const pacificToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

// Create an ISO timestamp that falls within today in Pacific time
const todayDate = `${pacificToday}T12:00:00.000Z`;

const sampleGuests = [
  { id: 'g1', firstName: 'John', lastName: 'Smith', preferredName: 'Johnny', name: 'John Smith' },
  { id: 'g2', firstName: 'Jane', lastName: 'Doe', preferredName: '', name: 'Jane Doe' },
];

test.describe('MealsSection', () => {
  test('renders header and title', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    await expect(component.getByText('Daily Meal Logs')).toBeVisible();
    await expect(component.getByText('Service Distribution Tracker')).toBeVisible();
  });

  test('shows Active Service Day label for today', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    await expect(component.getByText('Active Service Day')).toBeVisible();
  });

  test('displays zero stats when no records', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    // All stat cards should show 0
    const statCards = component.locator('text="0"');
    await expect(statCards.first()).toBeVisible();
  });

  test('shows "No meals logged" empty state when no records', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    await expect(component.getByText('No meals logged for this date')).toBeVisible();
  });

  test('displays stat card labels', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    // Primary stat cards
    await expect(component.getByText('Total Meals')).toBeVisible();
    await expect(component.getByText('Guest Meals')).toBeVisible();
    await expect(component.getByText('Proxy Pickups')).toBeVisible();
    await expect(component.getByText('Lunch Bags')).toBeVisible();
    // Distribution details (compact stats)
    await expect(component.getByText('Extra', { exact: true })).toBeVisible();
    await expect(component.getByText('RV', { exact: true })).toBeVisible();
    await expect(component.getByText('Day Worker', { exact: true })).toBeVisible();
    await expect(component.getByText('Shelter', { exact: true })).toBeVisible();
    await expect(component.getByText('United Effort', { exact: true })).toBeVisible();
  });

  test('highlights proxy pickups with handshake badge and picked-up-by text', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        mealRecords={[
          { id: 'm1', guestId: 'g1', pickedUpByGuestId: 'g2', count: 1, date: todayDate, createdAt: todayDate },
        ]}
        guests={sampleGuests}
      />
    );

    await expect(component.getByText('🤝 Proxy Pickup', { exact: true })).toBeVisible();
    await expect(component.getByText('Picked up by Jane', { exact: false })).toBeVisible();
  });

  test('computes stats from seeded meal records', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        mealRecords={[
          { id: 'm1', guestId: 'g1', count: 3, date: todayDate, createdAt: todayDate },
          { id: 'm2', guestId: 'g2', count: 2, date: todayDate, createdAt: todayDate },
        ]}
        rvMealRecords={[
          { id: 'rv1', guestId: 'bulk', count: 10, date: todayDate, createdAt: todayDate },
        ]}
        guests={sampleGuests}
      />
    );
    // Total should be 3 + 2 + 10 = 15
    await expect(component.getByText('15', { exact: true })).toBeVisible();
    // Guest count should be 5
    await expect(component.getByText('5', { exact: true })).toBeVisible();
    // RV count should be 10
    await expect(component.getByText('10', { exact: true })).toBeVisible();
  });

  test('shows activity log with meal records', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        mealRecords={[
          { id: 'm1', guestId: 'g1', count: 1, date: todayDate, createdAt: todayDate },
        ]}
        guests={sampleGuests}
      />
    );
    // Activity log header should show count
    await expect(component.getByText('Activity Log (1)')).toBeVisible();
    // Guest name should be displayed (preferredName = Johnny)
    await expect(component.getByText('Johnny')).toBeVisible();
  });

  test('displays guest name for meal records using firstName/lastName fallback', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        mealRecords={[
          { id: 'm1', guestId: 'g2', count: 1, date: todayDate, createdAt: todayDate },
        ]}
        guests={sampleGuests}
      />
    );
    // g2 has no preferredName, should show "Jane Doe"
    await expect(component.getByText('Jane Doe')).toBeVisible();
  });

  test('shows RV Meal Distribution label for RV records', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        rvMealRecords={[
          { id: 'rv1', guestId: 'bulk', count: 15, date: todayDate, createdAt: todayDate },
        ]}
      />
    );
    await expect(component.getByText('RV Meal Distribution')).toBeVisible();
  });

  test('shows Day Worker Center label for day worker records', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        dayWorkerMealRecords={[
          { id: 'dw1', guestId: 'bulk', count: 8, date: todayDate, createdAt: todayDate },
        ]}
      />
    );
    await expect(component.getByText('Day Worker Center')).toBeVisible();
  });

  test('Add Bulk Meals button toggles the quick add panel', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    // Panel should not be visible initially
    await expect(component.getByText('Quick Add Bulk Meals')).not.toBeVisible();
    // Click Add Bulk Meals button
    await component.getByRole('button', { name: 'Add Bulk Meals' }).click();
    // Panel should now be visible with all categories
    await expect(component.getByText('Quick Add Bulk Meals')).toBeVisible();
    await expect(component.getByText('RV deliveries')).toBeVisible();
    await expect(component.getByText('Shelter meals')).toBeVisible();
    await expect(component.getByText('Partner organization')).toBeVisible();
  });

  test('bulk add panel shows all 5 category cards', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    await component.getByRole('button', { name: 'Add Bulk Meals' }).click();
    await expect(component.getByText('RV deliveries')).toBeVisible();
    await expect(component.getByText('Day worker center')).toBeVisible();
    await expect(component.getByText('Shelter meals')).toBeVisible();
    await expect(component.getByText('To-go lunch bags')).toBeVisible();
    await expect(component.getByText('Partner organization')).toBeVisible();
  });

  test('Close button hides the bulk add panel', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    await component.getByRole('button', { name: 'Add Bulk Meals' }).click();
    await expect(component.getByText('Quick Add Bulk Meals')).toBeVisible();
    await component.getByRole('button', { name: 'Close' }).click();
    // Panel should be hidden after animation
    await expect(component.getByText('Quick Add Bulk Meals')).not.toBeVisible();
  });

  test('date navigation shifts to previous day', async ({ mount }) => {
    const component = await mount(<MealsSectionStory />);
    // Verify we start on today
    await expect(component.getByText('Active Service Day')).toBeVisible();
    // Click left arrow to go to previous day
    const prevButton = component.locator('button').first();
    await prevButton.click();
    // Should now show "Archived Records" since it's not today
    await expect(component.getByText('Archived Records')).toBeVisible();
  });

  test('shows type badge for different record types', async ({ mount }) => {
    const component = await mount(
      <MealsSectionStory
        shelterMealRecords={[
          { id: 's1', guestId: 'bulk', count: 5, date: todayDate, createdAt: todayDate },
        ]}
        lunchBagRecords={[
          { id: 'lb1', guestId: 'bulk', count: 3, date: todayDate, createdAt: todayDate },
        ]}
      />
    );
    // Activity log should show type badges (note: badges use CSS uppercase, DOM text is lowercase for shelter)
    await expect(component.locator(':text-is("shelter")').first()).toBeVisible();
    await expect(component.getByText('Lunch Bag', { exact: true })).toBeVisible();
  });
});
