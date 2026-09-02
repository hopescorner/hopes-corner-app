import { test, expect } from '@playwright/experimental-ct-react';
import { ServiceStatusOverviewStory } from '../__ct__/stories';
import { todayPacificDateString } from '@/lib/utils/date';
import { generateShowerSlots, generateLaundrySlots, formatSlotLabel } from '@/lib/utils/serviceSlots';

test.describe('ServiceStatusOverview Component Tests', () => {
  test('renders Showers and Laundry cards with OPEN status', async ({ mount }) => {
    const component = await mount(<ServiceStatusOverviewStory />);

    await expect(component).toContainText('Showers');
    await expect(component).toContainText('Laundry');
    await expect(component).toContainText('OPEN');
  });

  test('reflects next unblocked slot when earlier slots are blocked for showers', async ({ mount }) => {
    const today = todayPacificDateString();
    const allSlots = generateShowerSlots();
    const firstSlot = allSlots[0];
    const secondSlot = allSlots[1];

    const component = await mount(
      <ServiceStatusOverviewStory
        blockedSlots={[
          { serviceType: 'shower', slotTime: firstSlot, date: today },
        ]}
      />
    );

    // Should skip firstSlot and show secondSlot
    await expect(component).toContainText(`Next: ${formatSlotLabel(secondSlot)}`);
  });

  test('reflects next unblocked slot when earlier slots are blocked for laundry', async ({ mount }) => {
    const today = todayPacificDateString();
    const allSlots = generateLaundrySlots();
    const firstSlot = allSlots[0];
    const secondSlot = allSlots[1];

    const component = await mount(
      <ServiceStatusOverviewStory
        blockedSlots={[
          { serviceType: 'laundry', slotTime: firstSlot, date: today },
        ]}
      />
    );

    // Should skip firstSlot and show secondSlot
    await expect(component).toContainText(`Next: ${formatSlotLabel(secondSlot)}`);
  });

  test('shows Waitlist only when all shower slots are blocked', async ({ mount }) => {
    const today = todayPacificDateString();
    const allSlots = generateShowerSlots();
    const blockedSlots = allSlots.map((slot) => ({
      serviceType: 'shower' as const,
      slotTime: slot,
      date: today,
    }));

    const component = await mount(
      <ServiceStatusOverviewStory blockedSlots={blockedSlots} />
    );

    await expect(component).toContainText('Waitlist only');
  });

  test('shows No more onsite slots when all laundry slots are blocked', async ({ mount }) => {
    const today = todayPacificDateString();
    const allSlots = generateLaundrySlots();
    const blockedSlots = allSlots.map((slot) => ({
      serviceType: 'laundry' as const,
      slotTime: slot,
      date: today,
    }));

    const component = await mount(
      <ServiceStatusOverviewStory blockedSlots={blockedSlots} />
    );

    await expect(component).toContainText('No more onsite slots');
  });
});
