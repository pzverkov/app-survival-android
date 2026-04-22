import { test, expect } from '@playwright/test';

test('preset switching updates coverage threshold', async ({ page }) => {
  await page.goto('/');

  await page.selectOption('#presetSelect', 'STAFF');
  await page.waitForTimeout(500);

  const hint = await page.locator('#coverageHint').innerText();
  expect(hint).toContain('75');
});

test('profile modal opens and closes', async ({ page }) => {
  await page.goto('/');

  // Open profile
  await page.click('#btnProfile');
  await expect(page.locator('#profileModal')).toBeVisible();

  // Close with close button
  await page.click('#btnCloseProfile');
  await expect(page.locator('#profileModal')).toBeHidden();
});

test('budget decreases while game is running', async ({ page }) => {
  await page.goto('/');

  const before = await page.locator('#budget').innerText();
  await page.click('#btnStart');
  await page.waitForTimeout(3200);
  await page.click('#btnPause');
  const after = await page.locator('#budget').innerText();

  const parseBudget = (s: string) => parseInt(s.replace(/[$,]/g, ''), 10);
  expect(parseBudget(after)).toBeLessThan(parseBudget(before));
});

test('tab buttons toggle selection state', async ({ page }) => {
  await page.goto('/');

  await page.click('#tabBtnSignals');
  await expect(page.locator('#tabBtnSignals')).toHaveClass(/is-selected/);
  await expect(page.locator('#tabBtnOverview')).not.toHaveClass(/is-selected/);

  await page.click('#tabBtnHistory');
  await expect(page.locator('#tabBtnHistory')).toHaveClass(/is-selected/);
  await expect(page.locator('#tabBtnSignals')).not.toHaveClass(/is-selected/);
});

test('daily seed button fills seed input', async ({ page }) => {
  await page.goto('/');

  await page.click('#btnDailySeed');
  const seedVal = await page.locator('#seedInput').inputValue();
  expect(seedVal).not.toBe('');
  expect(parseInt(seedVal, 10)).toBeGreaterThan(0);
});

test('score increases after running for a few ticks', async ({ page }) => {
  await page.goto('/');

  await page.click('#btnStart');
  await page.waitForTimeout(4200); // ~4 ticks
  await page.click('#btnPause');

  const score = parseInt(await page.locator('#score').innerText(), 10);
  expect(score).toBeGreaterThan(0);
});

test('end-run modal does not dismiss on backdrop click', async ({ page }) => {
  await page.goto('/');

  // Open the end-run modal directly — we're testing the backdrop-click
  // guard, not the run-ended trigger logic. Setting .hidden = false mirrors
  // what openModal() does for visibility purposes.
  await page.evaluate(() => {
    document.getElementById('endRunModal')!.hidden = false;
  });
  await expect(page.locator('#endRunModal')).toBeVisible();

  // Click the backdrop in a corner — the center of the backdrop is covered
  // by the modal panel. The modal must remain visible after the click.
  await page.locator('#endRunBackdrop').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#endRunModal')).toBeVisible();

  // The explicit Close button still dismisses as expected.
  await page.click('#endRunDismiss');
  await expect(page.locator('#endRunModal')).toBeHidden();
});

test('dashboard scroll drives h1 parallax', async ({ page }) => {
  await page.goto('/');

  // The parallax writes to --side-scroll on .sideHeader h1 via a rAF-
  // throttled scroll listener. At rest the ratio is 0 and opacity is 1.
  const atRest = await page.evaluate(() => {
    const h1 = document.querySelector('.sideHeader h1') as HTMLElement;
    return {
      ratio: h1.style.getPropertyValue('--side-scroll').trim(),
      opacity: Number(getComputedStyle(h1).opacity),
    };
  });
  expect(atRest.ratio).toBe('0.000');
  expect(atRest.opacity).toBeCloseTo(1, 1);

  // Scroll well past the 80px parallax saturation point.
  await page.evaluate(() => {
    document.getElementById('sideBody')!.scrollTop = 200;
  });
  // Allow the rAF callback to fire and the CSS transition to settle.
  await page.waitForTimeout(300);

  const afterScroll = await page.evaluate(() => {
    const h1 = document.querySelector('.sideHeader h1') as HTMLElement;
    return {
      ratio: Number(h1.style.getPropertyValue('--side-scroll')),
      opacity: Number(getComputedStyle(h1).opacity),
    };
  });
  // Ratio saturates at 1 once scrollTop exceeds the 80px range.
  expect(afterScroll.ratio).toBeGreaterThan(0.9);
  // Opacity at saturation should be ~0.55 (1 - 0.45).
  expect(afterScroll.opacity).toBeLessThan(0.7);
  expect(afterScroll.opacity).toBeGreaterThan(0.4);
});
