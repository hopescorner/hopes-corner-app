import { test, expect } from '@playwright/experimental-ct-react';
import { TutorialModal } from './TutorialModal';

test.describe('TutorialModal', () => {
  test('does not render when isOpen is false', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={false} onClose={() => {}} />
    );
    await expect(component).toBeEmpty();
  });

  test('shows step 1 initially with welcome title', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    await expect(component.getByText("Welcome to Hope's Corner!")).toBeVisible();
    await expect(component.getByText('Step 1 of 8')).toBeVisible();
  });

  test('has 8 progress dots', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    for (let i = 1; i <= 8; i++) {
      await expect(component.getByLabel(`Go to step ${i}`)).toBeVisible();
    }
  });

  test('Back button is disabled on first step', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    const backBtn = component.getByRole('button', { name: /Back/i });
    await expect(backBtn).toBeDisabled();
  });

  test('Next button advances to step 2', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    await component.getByRole('button', { name: /Next/i }).click();
    await expect(component.getByText('Step 2 of 8')).toBeVisible();
    await expect(component.getByText('Search for a Guest')).toBeVisible();
  });

  test('Back button goes back after advancing', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    await component.getByRole('button', { name: /Next/i }).click();
    await expect(component.getByText('Step 2 of 8')).toBeVisible();

    await component.getByRole('button', { name: /Back/i }).click();
    await expect(component.getByText('Step 1 of 8')).toBeVisible();
  });

  test('clicking a progress dot navigates to that step', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    await component.getByLabel('Go to step 5').click();
    await expect(component.getByText('Step 5 of 8')).toBeVisible();
    await expect(component.getByText('Link Guests Together')).toBeVisible();
  });

  test('navigating through all 8 steps shows correct titles', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );

    const stepTitles = [
      "Welcome to Hope's Corner!",
      'Search for a Guest',
      'Quick Add Meals',
      'Add a New Guest',
      'Link Guests Together',
      'Ban Guests (Administrators)',
      'Keyboard Shortcuts',
      "You're Ready!",
    ];

    for (let i = 0; i < stepTitles.length; i++) {
      if (i > 0) {
        await component.getByLabel(`Go to step ${i + 1}`).click();
      }
      await expect(component.getByRole('heading', { name: stepTitles[i] })).toBeVisible();
      await expect(component.getByText(`Step ${i + 1} of 8`)).toBeVisible();
    }
  });

  test('last step shows "Get Started" instead of "Next"', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );
    // Jump to last step
    await component.getByLabel('Go to step 8').click();
    await expect(component.getByRole('button', { name: /Get Started/i })).toBeVisible();
    // "Next" button should not be visible
    await expect(component.getByRole('button', { name: /^Next$/i })).not.toBeVisible();
  });

  test('"Get Started" on last step calls onClose', async ({ mount }) => {
    let closeCalled = false;
    const component = await mount(
      <TutorialModal
        isOpen={true}
        onClose={() => { closeCalled = true; }}
      />
    );
    await component.getByLabel('Go to step 8').click();
    await component.getByRole('button', { name: /Get Started/i }).click();
    expect(closeCalled).toBe(true);
  });

  test('"Skip tutorial" calls onClose', async ({ mount }) => {
    let closeCalled = false;
    const component = await mount(
      <TutorialModal
        isOpen={true}
        onClose={() => { closeCalled = true; }}
      />
    );
    await component.getByText('Skip tutorial').click();
    expect(closeCalled).toBe(true);
  });

  test('close button (X) calls onClose', async ({ mount }) => {
    let closeCalled = false;
    const component = await mount(
      <TutorialModal
        isOpen={true}
        onClose={() => { closeCalled = true; }}
      />
    );
    await component.getByLabel('Close tutorial').click();
    expect(closeCalled).toBe(true);
  });

  test('step content includes relevant instructions', async ({ mount }) => {
    const component = await mount(
      <TutorialModal isOpen={true} onClose={() => {}} />
    );

    // Step 3 - Quick Add Meals
    await component.getByLabel('Go to step 3').click();
    await expect(component.getByText(/Click the/)).toBeVisible();
    await expect(component.getByText(/Only one meal entry/)).toBeVisible();

    // Step 7 - Keyboard Shortcuts
    await component.getByLabel('Go to step 7').click();
    await expect(component.getByText(/Speed up your workflow/)).toBeVisible();
  });
});
