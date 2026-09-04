import { test, expect } from '@playwright/experimental-ct-react';
import { KeyboardShortcutsBar } from './KeyboardShortcutsBar';

test.describe('KeyboardShortcutsBar', () => {
  test('shows only essentials by default', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);
    // Scope to the desktop bar: the condensed mobile row also renders when
    // component tests run without the global stylesheet.
    const desktopBar = component.locator('#all-keyboard-shortcuts');

    await expect(desktopBar).toContainText('Ctrl+K');
    await expect(desktopBar).toContainText('Search');
    await expect(desktopBar).toContainText('Log meals');
    await expect(desktopBar).toContainText('Esc');
    await expect(desktopBar).toContainText('Clear');
    await expect(desktopBar).toContainText('All shortcuts');
    // Secondary hints stay hidden until expanded
    await expect(desktopBar).not.toContainText('Shower');
    await expect(desktopBar).not.toContainText('Laundry');
    await expect(desktopBar).not.toContainText('Navigate');
  });

  test('reveals all shortcuts when the "?" toggle is clicked', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);

    await component.getByRole('button', { name: /All shortcuts/ }).click();

    await expect(component).toContainText('Ctrl+K');
    await expect(component).toContainText('Navigate');
    await expect(component).toContainText('Expand');
    await expect(component).toContainText('Log meals');
    await expect(component).toContainText('Shower');
    await expect(component).toContainText('Laundry');
    await expect(component).toContainText('Bike');
    await expect(component).toContainText('History');
    await expect(component).toContainText('Undo');
    await expect(component).toContainText('Clear');
    await expect(component).toContainText('Fewer shortcuts');
  });

  test('toggles back to essentials', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);
    const desktopBar = component.locator('#all-keyboard-shortcuts');

    await component.getByRole('button', { name: /All shortcuts/ }).click();
    await expect(desktopBar).toContainText('Shower');

    await component.getByRole('button', { name: /Fewer shortcuts/ }).click();
    await expect(desktopBar).not.toContainText('Shower');
    await expect(desktopBar).toContainText('All shortcuts');
  });

  test('renders kbd elements for all shortcuts when expanded', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar />);

    // Collapsed: 3 essentials (Ctrl+K, 1, 2, Esc = 4 kbd) + "?" = 5 desktop,
    // plus 8 condensed mobile hints
    const collapsedKbds = await component.locator('kbd').count();
    expect(collapsedKbds).toBe(13);

    await component.getByRole('button', { name: /All shortcuts/ }).click();

    // Expanded: 12 desktop kbds + 8 mobile = 20
    const expandedKbds = await component.locator('kbd').count();
    expect(expandedKbds).toBe(20);
  });

  test('accepts custom className', async ({ mount }) => {
    const component = await mount(<KeyboardShortcutsBar className="my-custom" />);
    await expect(component).toHaveClass(/my-custom/);
  });
});
