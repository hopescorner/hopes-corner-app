import { test, expect } from '@playwright/experimental-ct-react';
import { DonationsSectionStory } from '../__ct__/stories';

// Compute today's date key in Pacific time (matches component's todayPacificDateString())
const todayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const todayISO = `${todayKey}T12:00:00.000Z`;

test.describe('DonationsSection', () => {
  test('renders Donations header by default', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByRole('heading', { name: 'Donations' })).toBeVisible();
    await expect(component.getByText('Track trays and prepared food')).toBeVisible();
  });

  test('does not render legacy General/La Plaza tabs', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByRole('button', { name: 'General' })).toHaveCount(0);
    await expect(component.getByRole('button', { name: 'La Plaza' })).toHaveCount(0);
    await expect(component.getByText('La Plaza Donations')).toHaveCount(0);
  });

  test('shows empty state when no records', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByText('No records for this date')).toBeVisible();
    await expect(component.getByText('Add donations using the form on the left')).toBeVisible();
  });

  test('shows general donation form fields', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByText('Log New Item')).toBeVisible();
    await expect(component.getByText('Type', { exact: true })).toBeVisible();
    await expect(component.getByText('Item Name')).toBeVisible();
    await expect(component.getByText('Trays', { exact: true })).toBeVisible();
    await expect(component.getByText('Weight (lbs)', { exact: true }).first()).toBeVisible();
    await expect(component.getByText('Density')).toBeVisible();
    await expect(component.getByText('Donor / Source')).toBeVisible();
  });

  test('shows core donation form fields for single-mode flow', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByText('Type', { exact: true })).toBeVisible();
    await expect(component.getByText('Item Name')).toBeVisible();
    await expect(component.getByText('Donor / Source')).toBeVisible();
    const typeSelect = component.locator('select').first();
    await expect(typeSelect).toBeVisible();
  });

  test('donation type dropdown has all options', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    const typeSelect = component.locator('select').first();
    await expect(typeSelect.locator('option:text-is("Protein")')).toBeAttached();
    await expect(typeSelect.locator('option:text-is("Carbs")')).toBeAttached();
    await expect(typeSelect.locator('option:text-is("Vegetables")')).toBeAttached();
    await expect(typeSelect.locator('option:text-is("Fruit")')).toBeAttached();
    await expect(typeSelect.locator('option:text-is("Pastries")')).toBeAttached();
    await expect(typeSelect.locator('option:text-is("School Lunch")')).toBeAttached();
  });

  test('displays seeded donation records in grouped view', async ({ mount }) => {
    const component = await mount(
      <DonationsSectionStory
        donationRecords={[
          {
            id: 'd1', type: 'Protein', itemName: 'Chicken Breast', trays: 2,
            weightLbs: 10, servings: 40, donor: 'Waymo', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
        ]}
      />
    );
    await expect(component.getByRole('heading', { name: 'Chicken Breast' })).toBeVisible();
    await expect(component.getByText('10.0 lbs total')).toBeVisible();
    await expect(component.getByText('2 trays total')).toBeVisible();
    await expect(component.getByText('~40 servings')).toBeVisible();
  });

  test('shows daily summary with totals', async ({ mount }) => {
    const component = await mount(
      <DonationsSectionStory
        donationRecords={[
          {
            id: 'd1', type: 'Protein', itemName: 'Rice', trays: 3,
            weightLbs: 15, servings: 60, donor: 'LinkedIn', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
          {
            id: 'd2', type: 'Carbs', itemName: 'Bread', trays: 1,
            weightLbs: 5, servings: 20, donor: 'Bakery', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
        ]}
      />
    );
    // The daily summary section shows totals in a special styled container
    const summarySection = component.locator('.bg-emerald-50');
    // Total weight: 15 + 5 = 20
    await expect(summarySection.getByText('20.0')).toBeVisible();
    await expect(summarySection.getByText('lbs total', { exact: true })).toBeVisible();
    // Total trays: 3 + 1 = 4
    await expect(summarySection.getByText('4')).toBeVisible();
    await expect(summarySection.getByText('trays', { exact: true })).toBeVisible();
    // Unique items: 2
    await expect(summarySection.getByText('2', { exact: true })).toBeVisible();
    await expect(summarySection.getByText('unique items')).toBeVisible();
  });

  test('shows Copy Summary button when general records exist', async ({ mount }) => {
    const component = await mount(
      <DonationsSectionStory
        donationRecords={[
          {
            id: 'd1', type: 'Protein', itemName: 'Chicken', trays: 1,
            weightLbs: 5, servings: 20, donor: '', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
        ]}
      />
    );
    await expect(component.getByText('Copy Summary')).toBeVisible();
  });

  test('Save Record button is present in general form', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByRole('button', { name: 'Save Record' })).toBeVisible();
  });

  test('date navigation shows Today button when viewing past date', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    // Navigate to previous day
    await component.locator('button[title="Previous day"]').click();
    await expect(component.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('density dropdown shows servings per tray values', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    const densitySelect = component.locator('select').nth(1);
    await expect(densitySelect.locator('option', { hasText: 'Light (10 servings)' })).toBeAttached();
    await expect(densitySelect.locator('option', { hasText: 'Medium (20 servings)' })).toBeAttached();
    await expect(densitySelect.locator('option', { hasText: 'High (30 servings)' })).toBeAttached();
  });

  test('temperature field has F button for adding symbol', async ({ mount }) => {
    const component = await mount(<DonationsSectionStory />);
    await expect(component.getByRole('button', { name: '°F' })).toBeVisible();
  });

  test('groups multiple donations of the same type and item', async ({ mount }) => {
    const component = await mount(
      <DonationsSectionStory
        donationRecords={[
          {
            id: 'd1', type: 'Protein', itemName: 'Chicken', trays: 2,
            weightLbs: 10, servings: 40, donor: 'Waymo', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
          {
            id: 'd2', type: 'Protein', itemName: 'Chicken', trays: 1,
            weightLbs: 5, servings: 20, donor: 'LinkedIn', date: todayISO,
            dateKey: todayKey, donatedAt: todayISO, createdAt: todayISO,
          },
        ]}
      />
    );
    // Should show "2 entries" badge since they're grouped
    await expect(component.getByText('2 entries')).toBeVisible();
    // Should show combined totals: 15 lbs, 3 trays, 60 servings
    await expect(component.getByText('15.0 lbs total')).toBeVisible();
    await expect(component.getByText('3 trays total')).toBeVisible();
    await expect(component.getByText('~60 servings')).toBeVisible();
  });
});
