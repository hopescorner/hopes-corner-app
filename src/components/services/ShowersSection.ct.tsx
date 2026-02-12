import { test, expect } from '@playwright/experimental-ct-react';
import { ShowersSectionStory } from '../__ct__/stories';

const guests = [
  { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', name: 'John Doe' },
  { id: 'g2', firstName: 'Jane', lastName: 'Smith', preferredName: '', name: 'Jane Smith' },
];

test.describe('ShowersSection', () => {
  test('staff can access historical backfill actions', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} role="staff" />);
    await expect(component.getByRole('button', { name: 'Add Done' })).toBeVisible();
  });

  test('shows Add Done action in admin backfill panel', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} />);
    await expect(component.getByRole('button', { name: 'Add Done' })).toBeVisible();
  });

  test('submits completed shower for selected historical date', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} />);

    await component.getByLabel('Previous day').click();
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();

    await component.locator('select').first().selectOption('g1');
    await component.getByRole('button', { name: 'Add Done' }).click();

    const payload = component.getByTestId('last-shower-add');
    await expect(payload).toContainText('"guestId":"g1"');
    await expect(payload).toContainText('"initialStatus":"done"');
    await expect(payload).toContainText('"serviceDate":');
  });
});
