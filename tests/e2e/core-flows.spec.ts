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

  // Backlog tab should become selected
  await page.click('#tabBtnBacklog');
  await expect(page.locator('#tabBtnBacklog')).toHaveClass(/is-selected/);
  await expect(page.locator('#tabBtnOverview')).not.toHaveClass(/is-selected/);

  // History tab
  await page.click('#tabBtnHistory');
  await expect(page.locator('#tabBtnHistory')).toHaveClass(/is-selected/);
  await expect(page.locator('#tabBtnBacklog')).not.toHaveClass(/is-selected/);
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
