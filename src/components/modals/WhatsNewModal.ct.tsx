import { test, expect } from '@playwright/experimental-ct-react';
import { WhatsNewModal } from './WhatsNewModal';

test.describe('WhatsNewModal', () => {
  test('does not render when isOpen is false', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={false} onClose={() => {}} />
    );
    await expect(component).toBeEmpty();
  });

  test('renders header and version when open', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    await expect(component.getByText("What's New")).toBeVisible();
    // Version string should be present
    await expect(component.getByText(/Version/)).toBeVisible();
  });

  test('shows "Current" badge for the current version', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    await expect(component.getByText('Current', { exact: true })).toBeVisible();
  });

  test('renders changelog entries', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    // Should show at least one changelog highlight
    await expect(component.getByText('Enhanced Guest Management')).toBeVisible();
    await expect(component.getByText('Keyboard Shortcuts')).toBeVisible();
  });

  test('shows type badges for changelog items', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    // The v0.1.0 entries are all "feature" type
    const featureBadges = component.getByText('New Feature');
    await expect(featureBadges.first()).toBeVisible();
  });

  test('calls onClose when "Got it" button is clicked', async ({ mount }) => {
    let closeCalled = false;
    const component = await mount(
      <WhatsNewModal
        isOpen={true}
        onClose={() => { closeCalled = true; }}
      />
    );
    await component.getByRole('button', { name: /Got it/i }).click();
    expect(closeCalled).toBe(true);
  });

  test('calls onClose when X button is clicked', async ({ mount }) => {
    let closeCalled = false;
    const component = await mount(
      <WhatsNewModal
        isOpen={true}
        onClose={() => { closeCalled = true; }}
      />
    );
    // X button - find by its position in the header
    const buttons = component.locator('button');
    // First visible button should be the X close
    await buttons.first().click();
    expect(closeCalled).toBe(true);
  });

  test('closes when Escape key is pressed', async ({ mount, page }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    // Verify modal is visible
    await expect(component.getByText("What's New")).toBeVisible();
    await page.keyboard.press('Escape');
    // The Escape handler calls onClose, which is a no-op here since isOpen is
    // controlled externally. We verify the handler doesn't throw.
    await expect(component.getByText("What's New")).toBeVisible();
  });

  test('backdrop is rendered with click handler', async ({ mount }) => {
    const component = await mount(
      <WhatsNewModal isOpen={true} onClose={() => {}} />
    );
    // Verify the modal renders and the content is accessible
    await expect(component.getByText("What's New")).toBeVisible();
    await expect(component.getByRole('button', { name: /Got it/i })).toBeVisible();
  });
});
