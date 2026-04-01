import { test, expect } from '@playwright/test';

test('app loads and Start advances time', async ({ page }) => {
  await page.goto('/');

  // Basic sanity: primary metrics are visible
  await expect(page.locator('#rating')).toBeVisible();
  await expect(page.locator('#shift')).toBeVisible();

  const before = await page.locator('#shift').innerText();

  await page.click('#btnStart');
  await page.waitForTimeout(2200);

  const after = await page.locator('#shift').innerText();
  expect(after).not.toBe(before);
});
