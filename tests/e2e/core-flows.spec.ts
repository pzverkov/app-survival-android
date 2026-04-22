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

test('dashboard scroll drives sticky-header parallax', async ({ page }) => {
  await page.goto('/');

  // The parallax writes to --side-scroll on the .sideHeader block via a
  // rAF-throttled scroll listener. The h1 hero collapses visually (transform
  // + opacity) as the ratio saturates, while the remaining controls
  // (buttons, mode row, tabs, status chips) stay fully opaque so they
  // don't look disabled. The collapse is intentionally layout-free —
  // h1.offsetHeight stays constant so scroll frames never trigger layout.
  const atRest = await page.evaluate(() => {
    const header = document.querySelector('.sideHeader') as HTMLElement;
    const h1 = header.querySelector('h1') as HTMLElement;
    const cs = getComputedStyle(h1);
    return {
      ratio: header.style.getPropertyValue('--side-scroll').trim(),
      headerOpacity: Number(getComputedStyle(header).opacity),
      h1Height: h1.offsetHeight,
      h1Opacity: Number(cs.opacity),
      h1Transform: cs.transform,
      h1WillChange: cs.willChange,
    };
  });
  expect(atRest.ratio).toBe('0.000');
  expect(atRest.headerOpacity).toBeCloseTo(1, 1);
  expect(atRest.h1Height).toBeGreaterThan(30);
  expect(atRest.h1Opacity).toBeCloseTo(1, 1);
  // Compositor-only contract: the browser is hinted that transform and
  // opacity are the animated properties — not layout-triggering ones.
  expect(atRest.h1WillChange).toMatch(/transform/);

  // Scroll well past the 80px parallax saturation point.
  await page.evaluate(() => {
    document.getElementById('sideBody')!.scrollTop = 200;
  });
  // Allow the rAF callback to fire and the CSS transition to settle.
  await page.waitForTimeout(300);

  const afterScroll = await page.evaluate(() => {
    const header = document.querySelector('.sideHeader') as HTMLElement;
    const h1 = header.querySelector('h1') as HTMLElement;
    const cs = getComputedStyle(h1);
    return {
      ratio: Number(header.style.getPropertyValue('--side-scroll')),
      headerOpacity: Number(getComputedStyle(header).opacity),
      h1Height: h1.offsetHeight,
      h1Opacity: Number(cs.opacity),
      h1Transform: cs.transform,
    };
  });
  // Ratio saturates at 1 once scrollTop exceeds the 80px range.
  expect(afterScroll.ratio).toBeGreaterThan(0.9);
  // h1 fades out visually via opacity — but its layout box stays sized
  // the same as at rest (compositor-only collapse, no layout on scroll).
  expect(afterScroll.h1Opacity).toBeLessThan(0.1);
  expect(afterScroll.h1Height).toBe(atRest.h1Height);
  // Transform has changed from the at-rest state — the scale+translate
  // driven by --side-scroll is what visually shrinks the title.
  expect(afterScroll.h1Transform).not.toBe(atRest.h1Transform);
  expect(afterScroll.h1Transform).not.toBe('none');
  // Invariant: the header itself (buttons/tabs/chips) stays fully opaque
  // so interactive controls never look disabled.
  expect(afterScroll.headerOpacity).toBeGreaterThan(0.95);
});
