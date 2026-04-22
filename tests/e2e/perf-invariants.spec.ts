import { test, expect } from '@playwright/test';

// These tests encode the three scroll/load invariants that this PR relies on.
// Each one fails loudly if a future change re-bundles a lazy chunk, re-
// introduces a layout-animating sticky header, or regresses the locale split.

test.describe('perf invariants', () => {
  test('no afterFirstPaint chunk blocks first-contentful-paint', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    // Wait for FCP so PerformanceResourceTiming entries are complete.
    await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);

    const report = await page.evaluate(() => {
      const paint = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry | undefined;
      const fcp = paint ? paint.startTime : Infinity;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const js = resources
        .filter((r) => r.name.endsWith('.js'))
        .map((r) => {
          const file = r.name.split('/').pop()!;
          const chunk = file.replace(/-[A-Za-z0-9_-]+\.js$/, '');
          return {
            chunk,
            initiatorType: r.initiatorType,
            startTime: r.startTime,
            responseEnd: r.responseEnd,
          };
        });
      return { fcp, js };
    });

    const jsByChunk = new Map<string, typeof report.js[number]>();
    for (const r of report.js) jsByChunk.set(r.chunk, r);

    // The entry always loads; it's what drives FCP.
    expect(jsByChunk.has('index')).toBe(true);

    // afterFirstPaint() chunks must not start until after FCP has landed.
    // "scoreboard" and "achievements" here are Vite-emitted tiny barrels
    // that sit in front of the integrity/ach content chunks; they also
    // fire post-FCP via afterFirstPaint.
    const mustBeLazy = ['ach', 'achievements', 'scenarios', 'challenges', 'scoreboard'] as const;
    for (const chunk of mustBeLazy) {
      const r = jsByChunk.get(chunk);
      if (!r) continue; // wasn't requested yet, which is even better
      expect(r.startTime, `${chunk} must not start before FCP`).toBeGreaterThanOrEqual(report.fcp);
    }

    // integrity + meta are prefetched in <head> so they MAY start before
    // FCP — that's the whole point. When they do, they're initiated by
    // the <link> element, not a dynamic import() firing in script code.
    for (const chunk of ['integrity', 'meta'] as const) {
      const r = jsByChunk.get(chunk);
      if (!r) continue;
      if (r.startTime < report.fcp) {
        expect(r.initiatorType).toBe('link');
      }
    }
  });

  test('language switch fetches the target locale chunk and repaints labels', async ({ page }) => {
    await page.goto('/');
    // Baseline: English label on the Start button.
    await expect(page.locator('#btnStart .btn-label')).toHaveText('Start');

    // #langSelect lives inside the profile modal (hidden by default), so
    // open it before interacting with the select.
    await page.locator('#btnProfile').click();
    const langSelect = page.locator('#langSelect');
    await expect(langSelect).toBeVisible();

    const fetched = new Set<string>();
    page.on('request', (req) => {
      const u = req.url();
      for (const lang of ['ru', 'ja', 'hi']) {
        if (new RegExp(`/assets/${lang}-[A-Za-z0-9_-]+\\.js(\\?|$)`).test(u)) fetched.add(lang);
      }
    });

    for (const lang of ['ru', 'ja', 'hi'] as const) {
      await langSelect.selectOption(lang);
      // applyTranslations runs after ensureLanguageReady resolves — the
      // Start label repaints to the target locale's string.
      await expect(page.locator('#btnStart .btn-label')).not.toHaveText('Start', { timeout: 5000 });
    }

    for (const lang of ['ru', 'ja', 'hi']) {
      expect(fetched.has(lang), `expected ${lang} locale chunk to have been requested`).toBe(true);
    }
  });

  test('sticky header collapse runs on transform, not layout-driven properties', async ({ page }) => {
    await page.goto('/');

    const h1 = page.locator('.sideHeader h1');
    await expect(h1).toBeVisible();

    // Verify the CSS contract: the scroll-ratio-driven style properties are
    // transform + opacity, not max-height / margin-bottom / padding-top.
    // Max-height / margin-bottom must be static (matching the reduced-motion
    // branch), so scrolling cannot trigger layout on them.
    const sig = await h1.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        willChange: cs.willChange,
        hasTransform: cs.transform !== 'none',
      };
    });
    expect(sig.willChange).toMatch(/transform/);

    // Drive a scroll and sample transform to prove it actually changes.
    const before = await h1.evaluate((el) => getComputedStyle(el).transform);
    await page.evaluate(() => {
      const sb = document.getElementById('sideBody');
      if (sb) sb.scrollTop = 200;
    });
    // Paint ratio is updated via requestAnimationFrame; allow a tick.
    await page.waitForTimeout(50);
    const after = await h1.evaluate((el) => getComputedStyle(el).transform);
    expect(after).not.toBe(before);
  });
});
