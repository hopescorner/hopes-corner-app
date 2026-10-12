import { test, expect } from '@playwright/experimental-ct-react';
import { ShowersSectionStory } from '../__ct__/stories';
import { expectReadableText } from '../__ct__/readableText';

const guests = [
  { id: 'g1', firstName: 'John', lastName: 'Doe', preferredName: 'Johnny', name: 'John Doe' },
  { id: 'g2', firstName: 'Jane', lastName: 'Smith', preferredName: '', name: 'Jane Smith' },
];

test.describe('ShowersSection', () => {
  test('staff can access historical backfill actions', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} role="staff" />);
    await component.getByRole('button', { name: /Add Shower Record/ }).click();
    await expect(component.getByRole('button', { name: 'Add Done' })).toBeVisible();
  });

  test('shows Add Done action in admin backfill panel', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} />);
    await component.getByRole('button', { name: /Add Shower Record/ }).click();
    await expect(component.getByRole('button', { name: 'Add Done' })).toBeVisible();
  });

  test('submits completed shower for selected historical date', async ({ mount }) => {
    const component = await mount(<ShowersSectionStory guests={guests} />);

    await component.getByLabel('Previous day').click();
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();
    await component.getByRole('button', { name: /Add Shower Record/ }).click();

    await component.locator('select').first().selectOption('g1');
    await component.getByRole('button', { name: 'Add Done' }).click();

    const payload = component.getByTestId('last-shower-add');
    await expect(payload).toContainText('"guestId":"g1"');
    await expect(payload).toContainText('"initialStatus":"done"');
    await expect(payload).toContainText('"serviceDate":');
  });
});

test.describe('iPad showers', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('searches by legal name and keeps appointment minutes visible', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<ShowersSectionStory guests={guests} showerRecords={[
      { id: 's1', guestId: 'g1', date: today, dateKey: today, status: 'booked', time: '09:30' },
      { id: 's2', guestId: 'g2', date: today, dateKey: today, status: 'booked', time: '10:00' },
    ]} />);
    await component.getByRole('searchbox').fill('John Doe');
    await expect(component.getByText('Johnny', { exact: true })).toBeVisible();
    await expect(component.getByText('Jane Smith', { exact: true })).toHaveCount(0);
    await expect(component.getByText('9:30', { exact: false })).toBeVisible();
    const done = component.getByRole('button', { name: 'Complete shower', exact: true });
    expect((await component.getByTestId('showers-toolbar').boundingBox())!.height).toBeLessThanOrEqual(250);
    const end = component.getByRole('button', { name: /^End Showers/ });
    expect((await end.boundingBox())!.y).toBeGreaterThan((await done.boundingBox())!.y);
    await expectReadableText(component.getByText('booked', { exact: true }));
    await expectReadableText(component.getByText('Unknown', { exact: true }));
    await expectReadableText(done);
    await done.hover();
    await expectReadableText(done);
    await expectReadableText(component.getByText('Johnny', { exact: true }));
    const box = await done.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await end.click();
    const confirmation = component.getByRole('dialog', { name: 'End Shower Day?' });
    await expectReadableText(confirmation.getByRole('heading'));
    await expectReadableText(confirmation.getByRole('button', { name: 'End Service Day', exact: true }));
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(confirmation).toHaveCount(0);
    await page.screenshot({ path: '/tmp/hopes-showers-ipad-portrait.png', fullPage: true });
  });
});

test('empty states and disabled end-day controls stay readable', async ({ mount, page }) => {
  const component = await mount(<ShowersSectionStory guests={guests} showerRecords={[]} />);
  await expectReadableText(component.getByText('No showers in this list'));
  const end = component.getByRole('button', { name: 'End Showers', exact: true });
  await expect(end).toBeDisabled();
  await expectReadableText(end);
  await component.getByRole('button', { name: 'Toggle calendar' }).click();
  await expectReadableText(component.getByText('Su', { exact: true }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('status badges remain readable in every shower filter', async ({ mount }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const component = await mount(<ShowersSectionStory guests={guests} showerRecords={
    ['booked', 'done', 'waitlisted', 'cancelled', 'no_show'].map((status, index) => ({ id: `s${index}`, guestId: 'g1', date: today, dateKey: today, time: '09:30', status }))
  } />);
  for (const [filter, statuses] of [
    ['active', ['booked']], ['completed', ['done']], ['waitlist', ['waitlisted']], ['cancelled', ['cancelled', 'no_show']],
  ] as const) {
    await component.getByRole('button', { name: new RegExp(`^${filter}`, 'i') }).click();
    for (const status of statuses) await expectReadableText(component.getByText(status, { exact: true }));
  }
});
