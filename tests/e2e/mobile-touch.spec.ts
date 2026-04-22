import { test, expect, devices } from '@playwright/test';

// Only runs under the `mobile` project (tests/e2e/mobile-*.spec.ts). Verifies
// that the canvas accepts real touch input end-to-end: adding a component via
// the Add button, then tapping it on the canvas selects it in Select mode.

test.use({
  ...devices['Pixel 7'],
  hasTouch: true,
});

test('tap on canvas selects a component (touch)', async ({ page }) => {
  await page.goto('/');

  // E2E mode already suppresses the welcome modal, but guard against drift.
  await expect(page.locator('#welcomeModal')).toBeHidden();

  // Add a component via the dashboard button — position is random-inside-canvas.
  await page.click('#btnAdd');

  // Resolve the component's current viewport coordinates from the exposed sim
  // and view transform. This is the tap target.
  const tap = await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    const view = (window as any).__VIEW__;
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    if (!sim || !view || !canvas || sim.components.length === 0) return null;
    const c = sim.components[sim.components.length - 1];
    const r = canvas.getBoundingClientRect();
    return {
      x: r.left + (c.x * view.scale + view.tx),
      y: r.top + (c.y * view.scale + view.ty),
    };
  });
  expect(tap).not.toBeNull();

  // Real touchscreen tap — exercises the Pointer Events pipeline (pointerdown
  // with pointerType: 'touch', capture, pointerup) end-to-end.
  await page.touchscreen.tap(tap!.x, tap!.y);

  // Selection updates #selName to the component name.
  await expect(page.locator('#selName')).not.toHaveText('None');
});

test('canvas suppresses browser pull-to-refresh gestures', async ({ page }) => {
  await page.goto('/');

  // `touch-action: none` and `overscroll-behavior: none` are both required —
  // verify they're present so a future CSS refactor doesn't silently regress
  // mobile drag behavior.
  const canvasTouchAction = await page.evaluate(() => {
    const el = document.getElementById('c');
    return el ? getComputedStyle(el).touchAction : '';
  });
  expect(canvasTouchAction).toBe('none');

  const bodyOverscroll = await page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY);
  expect(['none', 'contain']).toContain(bodyOverscroll);
});
