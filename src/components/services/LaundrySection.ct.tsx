import { test, expect } from '@playwright/experimental-ct-react';
import { LaundrySectionStory } from '../__ct__/stories';

const guests = [
  { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', name: 'John Doe' },
  { id: 'g2', firstName: 'Jane', lastName: 'Smith', preferredName: '', name: 'Jane Smith' },
];

test.describe('LaundrySection', () => {
  test('staff can access historical backfill actions', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} role="staff" />);
    await component.getByRole('button', { name: /Add Laundry Record/ }).click();
    await expect(component.getByRole('button', { name: 'Add Completed' })).toBeVisible();
  });

  test('shows Add Completed action in admin backfill panel', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} />);
    await component.getByRole('button', { name: /Add Laundry Record/ }).click();
    await expect(component.getByRole('button', { name: 'Add Completed' })).toBeVisible();
  });

  test('submits completed offsite laundry for selected historical date', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} />);

    await component.getByLabel('Previous day').click();
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();
    await component.getByRole('button', { name: /Add Laundry Record/ }).click();

    await component.locator('select').first().selectOption('g1');
    await component.locator('select').nth(1).selectOption('offsite');
    await component.getByRole('button', { name: 'Add Completed' }).click();

    const payload = component.getByTestId('last-laundry-add');
    await expect(payload).toContainText('"guestId":"g1"');
    await expect(payload).toContainText('"washType":"offsite"');
    await expect(payload).toContainText('"initialStatus":"returned"');
    await expect(payload).toContainText('"serviceDate":');
  });
});

test.describe('iPad laundry workflows', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('portrait uses a list and landscape offers a board with large touch actions', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<LaundrySectionStory guests={guests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '09:00', bagNumber: 'B12' },
    ]} />);
    await expect(component.getByText('Laundry Overview')).toBeVisible();
    await expect(component.getByRole('button', { name: 'Advance to Washer' })).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    const start = component.getByRole('button', { name: 'Start washer' });
    await expect(start).toBeVisible();
    await expect.poll(async () => (await start.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(component.getByRole('button', { name: 'Move to dryer' })).toBeVisible();
    await expect(component.getByRole('button', { name: 'Mark picked up', exact: true })).toHaveCount(0);
    await page.screenshot({ path: '/tmp/hopes-laundry-ipad-landscape.png', fullPage: true });
  });

  test('bag dialog retains guest context and supports touch cancellation and save', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<LaundrySectionStory guests={guests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '09:00' },
    ]} />);
    await component.getByRole('button', { name: 'Advance to Washer' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bag number required' });
    await expect(dialog.getByText('Johnny')).toBeVisible();
    await expect(dialog.getByLabel('Bag number')).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await component.getByRole('button', { name: 'Advance to Washer' }).click();
    await dialog.getByLabel('Bag number').fill('B99');
    await page.screenshot({ path: '/tmp/hopes-laundry-ipad-bag-dialog.png', fullPage: true });
    await dialog.getByRole('button', { name: 'Save and continue' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(component.getByText('Bag #B99')).toBeVisible();
    await expect(component.getByRole('button', { name: 'Advance to Dryer' })).toBeVisible();
  });
});
