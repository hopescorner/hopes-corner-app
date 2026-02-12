import { test, expect } from '@playwright/experimental-ct-react';
import { LaundrySectionStory } from '../__ct__/stories';

const guests = [
  { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', name: 'John Doe' },
  { id: 'g2', firstName: 'Jane', lastName: 'Smith', preferredName: '', name: 'Jane Smith' },
];

test.describe('LaundrySection', () => {
  test('staff can access historical backfill actions', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} role="staff" />);
    await expect(component.getByRole('button', { name: 'Add Completed' })).toBeVisible();
  });

  test('shows Add Completed action in admin backfill panel', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} />);
    await expect(component.getByRole('button', { name: 'Add Completed' })).toBeVisible();
  });

  test('submits completed offsite laundry for selected historical date', async ({ mount }) => {
    const component = await mount(<LaundrySectionStory guests={guests} />);

    await component.getByLabel('Previous day').click();
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();

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
