import { test, expect } from '@playwright/test';

// Replaces the former "manual" plan item:
//   - hover the reason on a gated ticket (JANK/HEAP/PRIVACY) to confirm the
//     cross-check reason string renders.
//
// We fast-forward the sim via the __SIM__ hook, force a gated condition that
// produces a JANK or PRIVACY_COMPLAINTS ticket, then assert the ticket card
// carries a non-empty title/data-reason attribute and an "ⓘ" meta badge.

test('gated tickets expose a cross-check reason string on the card', async ({ page }) => {
  await page.goto('/');

  // Push conditions that guarantee at least one gated (severity<3) ticket fires.
  // We drive the sim directly so we don't depend on incident randomness.
  await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    sim.privacyTrust = 60;    // triggers PRIVACY_COMPLAINTS primary signal
    sim.jankPct = 35;         // triggers JANK primary signal
    // SENIOR debounce = 2, so two tick passes through the cross-check gate are enough.
    for (let i = 0; i < 3; i++) sim.tick();
  });

  // The backlog list must show at least one ticket with a reason attr.
  // Scroll the backlog tab into view so the list renders.
  await page.click('#tabBtnBacklog');
  await page.waitForTimeout(200);

  const reasonTicket = page.locator('#ticketList .ticket[data-reason]').first();
  await expect(reasonTicket).toBeVisible();

  const reason = await reasonTicket.getAttribute('data-reason');
  expect(reason).toBeTruthy();
  expect(reason!.length).toBeGreaterThan(5);

  // The card renders the "ⓘ" meta indicator.
  await expect(reasonTicket.locator('.ticketReason').first()).toBeVisible();

  // And the native title attribute carries the same reason (accessibility hover).
  const title = await reasonTicket.getAttribute('title');
  expect(title).toBe(reason);
});
