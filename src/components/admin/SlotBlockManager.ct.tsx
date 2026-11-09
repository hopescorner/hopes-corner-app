import { test, expect } from '@playwright/experimental-ct-react';
import { SlotBlockManagerStory } from '../__ct__/stories';

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

test('shows clear period controls and per-time open-spot states', async ({ mount, page }) => {
  const component = await mount(
    <SlotBlockManagerStory
      blockedSlots={[
        { id: 'b1', serviceType: 'shower', slotTime: '08:00', date: todayKey(), blockedCount: 1 },
        { id: 'b2', serviceType: 'shower', slotTime: '08:30', date: todayKey(), blockedCount: 2 },
      ]}
      showerRecords={[
        { id: 's1', guestId: 'g1', time: '09:00', date: todayKey(), status: 'booked' },
      ]}
    />
  );

  await expect(component.getByText('Block a time period')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Both spots', exact: true })).toBeVisible();
  await expect(component.getByRole('button', { name: '1 spot', exact: true })).toBeVisible();
  await expect(component.getByRole('combobox', { name: 'From' })).toBeVisible();
  await expect(component.getByRole('combobox', { name: 'To' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Unblock period', exact: true })).toBeVisible();

  // Half blocked, fully blocked, and an existing booking are all readable.
  await expect(component.getByText('1 of 2 spots open')).toBeVisible();
  await expect(component.getByText('0 of 2 spots open')).toBeVisible();
  await expect(component.getByTitle('1 active bookings')).toBeVisible();

  // The panel and cards stay inside the modal without sideways scrolling.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  if (process.env.SLOT_MANAGER_SCREENSHOT) {
    await page.screenshot({ path: process.env.SLOT_MANAGER_SCREENSHOT, fullPage: true });
  }
});

test('blocking both spots for a period closes every time in that period', async ({ mount, page }) => {
  const component = await mount(<SlotBlockManagerStory />);

  // Move to a future day so the whole schedule is available.
  await component.getByRole('button', { name: 'Next day' }).click();
  await expect(component.getByText('2 of 2 spots open').first()).toBeVisible();

  if (process.env.SLOT_MANAGER_SCREENSHOT_FUTURE) {
    await page.screenshot({ path: process.env.SLOT_MANAGER_SCREENSHOT_FUTURE, fullPage: true });
  }

  await component.getByRole('button', { name: 'Both spots', exact: true }).click();
  const apply = component.getByRole('button', { name: /^Block both spots/ });
  await expect(apply).toBeVisible();
  await apply.click();

  await expect(component.getByText('0 of 2 spots open').first()).toBeVisible();
  await expect(component.getByText('2 of 2 spots open')).toHaveCount(0);
});
