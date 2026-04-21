import { test, expect } from '@playwright/test';

// Replaces the former "manual" plan items:
//   - start android-16-upgrade-week scenario, confirm scripted incidents fire
//     at 1:00 / 3:00 / 5:00 / 7:00 and the end-of-run modal shows a grade letter
//
// Uses the __SIM__ window hook (exposed only under VITE_E2E=1) to fast-forward
// the sim without waiting on the 1 Hz wall-clock tick loop.

test('Release Trains card lists the three launch scenarios', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#scenariosCard');
  await expect(card).toBeVisible();
  await expect(card.getByText('Android 16 Upgrade Week')).toBeVisible();
  await expect(card.getByText('EU DMA Audit')).toBeVisible();
  await expect(card.getByText('SDK Cascade Night')).toBeVisible();
});

test('android-16-upgrade-week: scripted incidents fire at 60/180/300/420s and grade letter appears', async ({ page }) => {
  await page.goto('/');

  // Start the scenario (pins seed + preset + incident script).
  const row = page.locator('[data-scenario-id="android-16-upgrade-week"]');
  await row.getByRole('button', { name: 'Start' }).click();

  // Confirm the sim is bound to the scenario.
  const scenarioId = await page.evaluate(() => (window as any).__SIM__?.scenarioId);
  expect(scenarioId).toBe('android-16-upgrade-week');

  // Fast-forward through the scripted ticks. The 4 markers are at 60/180/300/420;
  // after tick=420 we advance one more block so the 420s incident has been dispatched.
  await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    for (let i = 0; i < 425; i++) sim.tick();
  });

  // Check the run event log for each scripted incident.
  const incidentsByTick = await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    const log = sim.getRunEventLog();
    return log
      .filter((e: any) => e.type === 'EVENT' && e.category === 'INCIDENT')
      .map((e: any) => ({ atSec: e.atSec, msg: e.msg }));
  });
  const atSecs = new Set(incidentsByTick.map((x: any) => x.atSec));
  expect(atSecs.has(60)).toBeTruthy();
  expect(atSecs.has(180)).toBeTruthy();
  expect(atSecs.has(300)).toBeTruthy();
  expect(atSecs.has(420)).toBeTruthy();

  // Run to end-of-shift so the postmortem modal fires. SENIOR shift = 540s.
  await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    sim.running = true;
    while (sim.running && sim.timeSec < 1000) sim.tick();
  });

  // The end-of-run modal and grade letter should now be visible.
  await expect(page.locator('#endRunModal')).toBeVisible();
  const grade = await page.locator('#endRunGrade').innerText();
  expect(grade).toMatch(/^[SABCD]$/);
});
