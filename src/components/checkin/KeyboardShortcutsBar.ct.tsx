import { test, expect } from '@playwright/experimental-ct-react';
import { KeyboardShortcutsBar } from './KeyboardShortcutsBar';

test.describe('KeyboardShortcutsBar', () => {
  test('renders all keyboard shortcuts', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);

    await expect(component).toContainText('Ctrl+K');
    await expect(component).toContainText('Search');
    await expect(component).toContainText('↑↓');
    await expect(component).toContainText('Navigate');
    await expect(component).toContainText('Enter');
    await expect(component).toContainText('Expand');
    await expect(component).toContainText('Log meals');
    await expect(component).toContainText('Shower');
    await expect(component).toContainText('Laundry');
    await expect(component).toContainText('Bike');
    await expect(component).toContainText('History');
    await expect(component).toContainText('Undo');
    await expect(component).toContainText('Esc');
    await expect(component).toContainText('Clear');
  });

  test('renders kbd elements for all shortcuts', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);
    const kbds = component.locator('kbd');
    await expect(kbds).toHaveCount(11);
  });

  test('accepts custom className', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar className="my-custom" />);
    await expect(component).toHaveClass(/my-custom/);
  });
});
