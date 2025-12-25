import { test, expect } from '@playwright/test';

test('app loads and Start advances time', async ({ page }) => {
  await page.goto('/');

  // Basic sanity: key UI is present
  await expect(page.locator('#rating')).toBeVisible();
  await expect(page.locator('#time')).toBeVisible();

  const before = await page.locator('#time').innerText();

  await page.click('#btnStart');
  await page.waitForTimeout(2200);

  const after = await page.locator('#time').innerText();
  expect(after).not.toBe(before);
});
