import { test, expect } from '@playwright/test';

// Automated visual smoke for the component-circle restyle:
// - With a tier-3 component on screen and the sim running, the pulse rAF
//   loop is active and the canvas actually paints a gold-ish ring around
//   the component (above the base fill).
// - Pausing the sim terminates the pulse loop within a couple of frames.
//
// The sine phase is pinned to 0.5 in IS_E2E (see draw() in src/main.ts),
// so the ring that gets painted each frame is deterministic — this test
// doesn't rely on animation timing, just on presence.
test('tier-3 component drives a pulse loop, ring renders, pause stops it', async ({ page }) => {
  await page.goto('/');

  // Place a UI component at a known world coordinate and force it to
  // tier 3 directly. We bypass upgradeSelected() on purpose — this test
  // cares about the rendering path, not the upgrade economy.
  const placed = await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    const res = sim.addComponent('UI', 400, 300);
    const n = sim.components.find((c: { id: number }) => c.id === res.id);
    n.tier = 3;
    n.health = 100;
    return { id: res.id, x: n.x, y: n.y, r: n.r };
  });
  expect(placed.id).toBeGreaterThan(0);

  await page.click('#btnStart');

  // The pulse rAF loop registers within one or two frames of draw().
  await page.waitForFunction(() => {
    const p = (window as any).__PULSE__;
    return !!p && p.active === true;
  }, undefined, { timeout: 2000 });

  // Sample a window around the component's screen position. A pixel in
  // that region should match the tier-3 ring colour (gold: high R, high
  // G, low B) above the noise floor of the base UI colour (cool blue).
  const gold = await page.evaluate((placed) => {
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const view = (window as any).__VIEW__ as { scale: number; tx: number; ty: number };
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const deviceX = (placed.x * view.scale + view.tx) * dpr;
    const deviceY = (placed.y * view.scale + view.ty) * dpr;
    // A 120-device-px square comfortably covers the component (~2r) plus
    // its tier-3 ring (r + 7..+11).
    const half = 60;
    const x0 = Math.max(0, Math.round(deviceX - half));
    const y0 = Math.max(0, Math.round(deviceY - half));
    const w = Math.min(half * 2, canvas.width - x0);
    const h = Math.min(half * 2, canvas.height - y0);
    const data = ctx.getImageData(x0, y0, w, h).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      // Gold rgba(255,220,100,α): R very high, G high, B noticeably lower.
      if (r > 220 && g > 180 && b < 160 && a > 20) return true;
    }
    return false;
  }, placed);
  expect(gold, 'expected a gold tier-3 ring pixel near the component').toBe(true);

  // Pause: the loop must self-terminate on the next frame boundary.
  await page.click('#btnPause');
  await page.waitForFunction(() => {
    const p = (window as any).__PULSE__;
    return !!p && p.active === false;
  }, undefined, { timeout: 2000 });
});
