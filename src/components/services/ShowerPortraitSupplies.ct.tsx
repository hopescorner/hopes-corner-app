import { test, expect } from '@playwright/experimental-ct-react';
import { ShowersSectionStory } from '../__ct__/stories';

const longNameGuest = [
  { id: 'g1', firstName: 'Alexander', lastName: 'Montgomery-Johnson', preferredName: 'Alex Montgomery-Johnson', name: 'Alexander Montgomery-Johnson' },
];

const shortNameGuest = [
  { id: 'g1', firstName: 'Al', lastName: 'Jo', preferredName: 'Al Jo', name: 'Al Jo' },
];

function fiveDaysAgoISO() {
  return new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
}

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function mountWithBlockedSupplies(mount: any, guests: any) {
  const today = todayKey();
  const distributedAt = fiveDaysAgoISO();
  return mount(<ShowersSectionStory
    guests={guests}
    showerRecords={[
      { id: 's1', guestId: 'g1', date: today, dateKey: today, status: 'booked', time: '09:30' },
    ]}
    distributedItems={[
      { id: 'i1', guestId: 'g1', itemKey: 'jacket', distributedAt },
      { id: 'i2', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt },
      { id: 'i3', guestId: 'g1', itemKey: 'tent', distributedAt },
    ]}
  />);
}

async function expectBadgesOnOwnLineBelowName(component: any, page: any, guestName: string) {
  const badge = component.getByTestId('ineligible-supply-jacket');
  await expect(badge).toBeVisible();
  const badgeBox = await badge.boundingBox();
  const nameBox = await component.getByText(guestName, { exact: true }).boundingBox();
  expect(badgeBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  // Badges take a full-width line below the guest name on narrow screens,
  // so they are never squeezed beside the name or hidden behind the actions.
  expect(badgeBox!.y).toBeGreaterThanOrEqual(nameBox!.y + nameBox!.height - 1);
  const viewport = page.viewportSize();
  for (const key of ['jacket', 'sleeping_bag', 'tent']) {
    const other = component.getByTestId(`ineligible-supply-${key}`);
    await expect(other).toBeVisible();
    const otherBox = await other.boundingBox();
    expect(otherBox!.x).toBeGreaterThanOrEqual(0);
    expect(otherBox!.x + otherBox!.width).toBeLessThanOrEqual(viewport.width + 1);
  }
  // Row must not force horizontal scrolling.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function mountCrowdedRow(mount: any) {
  const today = todayKey();
  const distributedAt = fiveDaysAgoISO();
  return mount(<ShowersSectionStory
    guests={longNameGuest}
    showerRecords={[
      { id: 's1', guestId: 'g1', date: today, dateKey: today, status: 'booked', time: '09:30' },
    ]}
    distributedItems={[
      { id: 'i1', guestId: 'g1', itemKey: 'jacket', distributedAt },
      { id: 'i2', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt },
      { id: 'i3', guestId: 'g1', itemKey: 'tent', distributedAt },
    ]}
    reminders={[
      { id: 'rem1', guestId: 'g1', message: 'Allergic to scented soap', appliesTo: ['shower'] },
    ]}
    waiverNeededGuestIds={['g1']}
  />);
}

test.describe('showers portrait supply badges', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('unavailable supply badges get their own line on phone portrait', async ({ mount, page }) => {
    const component = await mountWithBlockedSupplies(mount, longNameGuest);
    await expectBadgesOnOwnLineBelowName(component, page, 'Alex Montgomery-Johnson');
  });

  test('badges get their own line even for short names on phone portrait', async ({ mount, page }) => {
    const component = await mountWithBlockedSupplies(mount, shortNameGuest);
    await expectBadgesOnOwnLineBelowName(component, page, 'Al Jo');
  });

  test('crowded rows keep supply badges on screen without sideways scrolling', async ({ mount, page }) => {
    const component = await mountCrowdedRow(mount);
    await expectBadgesOnOwnLineBelowName(component, page, 'Alex Montgomery-Johnson');
  });
});

test.describe('showers ipad portrait supply badges', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('unavailable supply badges stay on screen in ipad portrait', async ({ mount, page }) => {
    const component = await mountWithBlockedSupplies(mount, longNameGuest);
    const badge = component.getByTestId('ineligible-supply-jacket');
    await expect(badge).toBeVisible();
    const badgeBox = await badge.boundingBox();
    const viewport = page.viewportSize();
    expect(badgeBox!.x).toBeGreaterThanOrEqual(0);
    expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
