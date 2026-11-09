import { Toaster } from 'react-hot-toast';
import { test, expect } from '@playwright/experimental-ct-react';
import { LaundrySectionStory } from '../__ct__/stories';
import { expectReadableText } from '../__ct__/readableText';

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

  test('Today advances overnight while an explicitly chosen historical date stays selected', async ({ mount, page }) => {
    await page.clock.install({ time: new Date('2026-11-09T23:59:45-08:00') });
    const component = await mount(<LaundrySectionStory guests={guests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: '2026-11-09', status: 'waiting', laundryType: 'onsite', time: '07:30 - 08:30', bagNumber: 'OLD-DAY' },
      { id: 'l2', guestId: 'g2', date: '2026-11-10', status: 'waiting', laundryType: 'onsite', time: '08:00 - 09:00', bagNumber: 'NEW-DAY' },
    ]} />);
    await expect(component.getByText('Jane Smith', { exact: true })).toHaveCount(0);
    await page.clock.fastForward(60_000);
    await expect(component.getByText('Jane Smith', { exact: true })).toBeVisible();
    await expect(component.getByText('Viewing Historical Data')).toHaveCount(0);

    await component.getByLabel('Previous day').click();
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();
    await page.clock.fastForward(86_400_000);
    await expect(component.getByText('Johnny', { exact: true })).toBeVisible();
    await expect(component.getByText('Jane Smith', { exact: true })).toHaveCount(0);
    await expect(component.getByText('Viewing Historical Data')).toBeVisible();
  });

  test('blocked laundry keeps its booking visible and usable in both layouts', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<LaundrySectionStory guests={guests}
      blockedSlots={[{ id: 'block1', serviceType: 'laundry', slotTime: '07:30 - 08:30', date: today, blockedCount: 1 }]}
      laundryRecords={[{ id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '07:30 - 08:30', bagNumber: 'B12' }]} />);
    await expect(component.getByText('Johnny', { exact: true })).toBeVisible();
    await component.getByRole('button', { name: 'Manage Slots' }).click();
    await expect(component.getByText('1 booked', { exact: true })).toBeVisible();
    await component.getByRole('button', { name: 'Close', exact: true }).click();
    await component.getByRole('button', { name: 'Advance to Washer' }).click();
    await expect(component.getByRole('button', { name: 'Advance to Dryer' })).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(component.getByText('Johnny', { exact: true })).toBeVisible();
    await expect(component.getByRole('button', { name: 'Move to dryer' })).toBeVisible();
    await page.screenshot({ path: '/tmp/hopes-blocked-laundry-ipad.png', fullPage: true });
  });

  test('saved pickup and search filters can be cleared to recover waiting bookings', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    await page.evaluate(() => {
      sessionStorage.setItem('service-view:laundry-ready', 'true');
      sessionStorage.setItem('service-view:laundry-search', JSON.stringify('missing guest'));
    });
    const component = await mount(<LaundrySectionStory guests={guests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '07:30 - 08:30', bagNumber: 'B12' },
    ]} />);
    await expect(component.getByText('Johnny', { exact: true })).toHaveCount(0);
    await component.getByRole('button', { name: 'Clear filters' }).click();
    await expect(component.getByText('Johnny', { exact: true })).toBeVisible();
    await expect(component.getByRole('button', { name: 'Advance to Washer' })).toBeVisible();
  });

  test('portrait uses a list and landscape offers a board with large touch actions', async ({ mount, page }) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<LaundrySectionStory guests={guests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '09:00', bagNumber: 'B12' },
    ]} />);
    await expect(component.getByText('Laundry Overview')).toBeVisible();
    expect((await component.getByTestId('laundry-toolbar').boundingBox())!.height).toBeLessThanOrEqual(250);
    await expect(component.getByRole('button', { name: 'Advance to Washer' })).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    const start = component.getByRole('button', { name: 'Start washer' });
    await expect(start).toBeVisible();
    await expect.poll(async () => (await start.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(component.getByRole('button', { name: 'Move to dryer' })).toBeVisible();
    await expect(component.getByRole('button', { name: 'Mark picked up', exact: true })).toHaveCount(0);
    await expectReadableText(component.getByText('Johnny', { exact: true }).first());
    await expectReadableText(component.getByText('John Doe • 09:00', { exact: true }).first());
    await expectReadableText(component.getByText('Bag #B12', { exact: true }).first());
    await expectReadableText(component.getByRole('button', { name: 'Move to dryer' }));
    await page.screenshot({ path: '/tmp/hopes-laundry-ipad-landscape.png', fullPage: true });
  });

  test('long guest names stay on one line so cards line up in list and board layouts', async ({ mount, page }) => {
    const longGuests = [
      { id: 'g1', firstName: 'Alexander', lastName: 'Montgomery-Johnson', name: 'Alexander Montgomery-Johnson', preferredName: '' },
      { id: 'g2', firstName: 'Christopher', lastName: 'Bartholomew-Fitzgerald', name: 'Christopher Bartholomew-Fitzgerald', preferredName: '' },
      { id: 'g3', firstName: 'Al', lastName: 'Jo', name: 'Al Jo', preferredName: '' },
    ];
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const component = await mount(<LaundrySectionStory guests={longGuests} laundryRecords={[
      { id: 'l1', guestId: 'g1', date: today, status: 'waiting', laundryType: 'onsite', time: '07:30 - 08:30', bagNumber: 'B1' },
      { id: 'l2', guestId: 'g2', date: today, status: 'waiting', laundryType: 'onsite', time: '08:00 - 09:00', bagNumber: 'B2' },
      { id: 'l3', guestId: 'g3', date: today, status: 'waiting', laundryType: 'onsite', time: '08:30 - 09:45', bagNumber: 'B3' },
    ]} />);

    // Portrait list view: a long name is a single line and the full name is on hover.
    const listName = component.getByText('Alexander Montgomery-Johnson', { exact: true }).first();
    await expect(listName).toBeVisible();
    await expect(listName).toHaveAttribute('title', 'Alexander Montgomery-Johnson');
    const listBox = (await listName.boundingBox())!;
    expect(listBox.height).toBeLessThanOrEqual(28);

    // Landscape board view: the same name is still one line, and short names match its height.
    await page.setViewportSize({ width: 1024, height: 768 });
    const boardName = component.getByText('Alexander Montgomery-Johnson', { exact: true }).first();
    await expect(boardName).toBeVisible();
    await expect(boardName).toHaveAttribute('title', 'Alexander Montgomery-Johnson');
    await expect.poll(async () => (await boardName.boundingBox())?.height ?? 0).toBeGreaterThan(0);
    const boardBox = (await boardName.boundingBox())!;
    expect(boardBox.height).toBeLessThanOrEqual(28);

    const shortName = component.getByText('Al Jo', { exact: true }).first();
    await expect(shortName).toBeVisible();
    await expect.poll(async () => (await shortName.boundingBox())?.height ?? 0).toBeGreaterThan(0);
    const shortBox = (await shortName.boundingBox())!;
    expect(Math.abs(shortBox.height - boardBox.height)).toBeLessThanOrEqual(1);
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
    await expectReadableText(dialog.getByRole('heading'));
    await expectReadableText(dialog.getByRole('button', { name: 'Save and continue' }));
    await expectReadableText(dialog.getByRole('button', { name: 'Cancel', exact: true }));
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

test('ready pickup filter includes carryover and Undo restores a picked-up load', async ({ mount, page }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const component = await mount(<><Toaster /><LaundrySectionStory guests={guests} laundryRecords={[
    { id: 'l1', guestId: 'g1', date: today, status: 'done', laundryType: 'onsite', time: '09:00', bagNumber: 'B12' },
    { id: 'l2', guestId: 'g2', date: '2026-01-01', status: 'returned', laundryType: 'offsite', bagNumber: 'B42' },
  ]} /></>);
  const ready = component.getByRole('button', { name: 'Ready for pickup (2)' });
  await ready.click();
  await expectReadableText(ready);
  await expect(component.getByText('Jane Smith', { exact: true })).toBeVisible();
  const pickup = component.getByRole('button', { name: /^(Advance to Picked Up|Mark picked up)$/ }).last();
  const end = component.getByRole('button', { name: /^End Laundry/ });
  expect((await end.boundingBox())!.y).toBeGreaterThan((await pickup.boundingBox())!.y);
  await pickup.click();
  await expect(component.getByRole('button', { name: 'Ready for pickup (1)' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(component.getByRole('button', { name: 'Ready for pickup (2)' })).toBeVisible();
  await expect(component.getByText('Bag #B12')).toBeVisible();
});
