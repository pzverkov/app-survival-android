import { test, expect, devices, type Page } from '@playwright/test';

// Only runs under the `mobile` project (tests/e2e/mobile-*.spec.ts). Exercises
// the Pointer Events pipeline for touch input (tap, drag, link chain, pinch,
// two-finger pan) plus layout invariants (rotation, modal fit) and the CSS
// proxies that guarantee browser-level gesture suppression (touch-action,
// overscroll-behavior, input font-size).

test.use({
  ...devices['Pixel 7'],
  hasTouch: true,
});

// ---- test helpers ---------------------------------------------------------

type PointerStep = {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';
  id: number;
  x: number; // viewport coordinates
  y: number;
};

// Dispatches a sequence of synthesized PointerEvents at the target element.
// Playwright's page.touchscreen only supports single-tap; multi-touch and
// continuous drags require either CDP or direct event dispatch. We go with
// the latter — it drives exactly the handlers registered in src/main.ts.
async function pointerSeq(page: Page, steps: PointerStep[], selector = '#c') {
  await page.evaluate(
    ({ steps, selector }) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) throw new Error(`pointerSeq: element ${selector} not found`);
      for (const s of steps) {
        const evt = new PointerEvent(s.type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerType: 'touch',
          pointerId: s.id,
          isPrimary: true,
          clientX: s.x,
          clientY: s.y,
          button: 0,
          buttons: s.type === 'pointerup' || s.type === 'pointercancel' ? 0 : 1,
        });
        el.dispatchEvent(evt);
      }
    },
    { steps, selector },
  );
}

async function canvasCenter(page: Page) {
  return await page.evaluate(() => {
    const r = (document.getElementById('c') as HTMLElement).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

async function getView(page: Page) {
  return await page.evaluate(() => {
    const v = (window as any).__VIEW__;
    return { scale: v.scale, tx: v.tx, ty: v.ty };
  });
}

// Adds a component at a chosen canvas-screen position and returns both its
// sim id and its viewport coords (tap target).
async function addComponentAt(
  page: Page,
  type: string,
  screenX: number,
  screenY: number,
) {
  return await page.evaluate(
    ({ type, screenX, screenY }) => {
      const sim = (window as any).__SIM__;
      const v = (window as any).__VIEW__;
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const r = canvas.getBoundingClientRect();
      const worldX = (screenX - v.tx) / v.scale;
      const worldY = (screenY - v.ty) / v.scale;
      const res = sim.addComponent(type, worldX, worldY);
      if (!res.ok) throw new Error(`addComponent failed: ${res.reason}`);
      return { id: res.id as number, x: r.left + screenX, y: r.top + screenY };
    },
    { type, screenX, screenY },
  );
}

// ---- pointer event pipeline ----------------------------------------------

test('tap on canvas selects a component (touch)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#welcomeModal')).toBeHidden();

  await page.click('#btnAdd');
  const tap = await page.evaluate(() => {
    const sim = (window as any).__SIM__;
    const v = (window as any).__VIEW__;
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const c = sim.components[sim.components.length - 1];
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (c.x * v.scale + v.tx), y: r.top + (c.y * v.scale + v.ty) };
  });

  await page.touchscreen.tap(tap.x, tap.y);
  await expect(page.locator('#selName')).not.toHaveText('None');
});

test('drag in Select mode moves the component with the finger', async ({ page }) => {
  await page.goto('/');

  // Place a fresh component at a known screen position so we don't collide
  // with the starter graph layout.
  const canvasRect = await page.evaluate(() => {
    const r = (document.getElementById('c') as HTMLElement).getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  const comp = await addComponentAt(page, 'UI', canvasRect.w * 0.25, canvasRect.h * 0.4);

  const dx = 80;
  const dy = 50;
  await pointerSeq(page, [
    { type: 'pointerdown', id: 1, x: comp.x, y: comp.y },
    { type: 'pointermove', id: 1, x: comp.x + dx / 2, y: comp.y + dy / 2 },
    { type: 'pointermove', id: 1, x: comp.x + dx, y: comp.y + dy },
    { type: 'pointerup', id: 1, x: comp.x + dx, y: comp.y + dy },
  ]);

  // World position of the component should have moved by roughly (dx,dy) in
  // screen space (which equals dx/scale in world space). Check the screen
  // position after re-running the view transform.
  const moved = await page.evaluate((id) => {
    const sim = (window as any).__SIM__;
    const v = (window as any).__VIEW__;
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const r = canvas.getBoundingClientRect();
    const c = sim.components.find((n: any) => n.id === id);
    return { x: r.left + (c.x * v.scale + v.tx), y: r.top + (c.y * v.scale + v.ty) };
  }, comp.id);

  expect(Math.abs(moved.x - (comp.x + dx))).toBeLessThan(4);
  expect(Math.abs(moved.y - (comp.y + dy))).toBeLessThan(4);
});

test('link mode: tap source then tap target creates an edge (touch)', async ({ page }) => {
  await page.goto('/');

  const rect = await page.evaluate(() => {
    const r = (document.getElementById('c') as HTMLElement).getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  // Two isolated fresh components, well-separated. UI → VM is an
  // architecturally-clean pair so the link always succeeds regardless of
  // preset strictness. Both are placed in the lower-left / lower-center
  // region so HUD islands pinned at the top of the canvas don't intercept
  // real-touchscreen taps.
  const a = await addComponentAt(page, 'UI', rect.w * 0.25, rect.h * 0.75);
  const b = await addComponentAt(page, 'VM', rect.w * 0.6, rect.h * 0.85);

  // Switch to Link mode.
  await page.click('#btnLink');

  // Dispatch pointerdown/up directly at the canvas — bypasses DOM hit-
  // testing so overlapping HUD islands can't swallow the tap.
  await pointerSeq(page, [
    { type: 'pointerdown', id: 1, x: a.x, y: a.y },
    { type: 'pointerup', id: 1, x: a.x, y: a.y },
  ]);
  await pointerSeq(page, [
    { type: 'pointerdown', id: 2, x: b.x, y: b.y },
    { type: 'pointerup', id: 2, x: b.x, y: b.y },
  ]);

  const linked = await page.evaluate(
    ({ aId, bId }) => {
      const sim = (window as any).__SIM__;
      return sim.links.some(
        (l: any) =>
          (l.from === aId && l.to === bId) || (l.from === bId && l.to === aId),
      );
    },
    { aId: a.id, bId: b.id },
  );
  expect(linked).toBe(true);
});

test('pinch zooms about the midpoint without drifting the world point', async ({ page }) => {
  await page.goto('/');

  const mid = await canvasCenter(page);
  const before = await getView(page);

  // Start with fingers 40px apart, spread to 160px apart — expect ~2x zoom.
  const gap0 = 40;
  const gap1 = 160;
  await pointerSeq(page, [
    { type: 'pointerdown', id: 1, x: mid.x - gap0, y: mid.y },
    { type: 'pointerdown', id: 2, x: mid.x + gap0, y: mid.y },
    { type: 'pointermove', id: 1, x: mid.x - gap1, y: mid.y },
    { type: 'pointermove', id: 2, x: mid.x + gap1, y: mid.y },
    { type: 'pointerup', id: 1, x: mid.x - gap1, y: mid.y },
    { type: 'pointerup', id: 2, x: mid.x + gap1, y: mid.y },
  ]);

  const after = await getView(page);
  expect(after.scale).toBeGreaterThan(before.scale);

  // Invariant: the world point under the midpoint should stay put. Compute
  // it before and after — they must match (within sub-pixel float noise).
  const canvasLeft = await page.evaluate(
    () => (document.getElementById('c') as HTMLElement).getBoundingClientRect().left,
  );
  const canvasTop = await page.evaluate(
    () => (document.getElementById('c') as HTMLElement).getBoundingClientRect().top,
  );
  const mcx = mid.x - canvasLeft;
  const mcy = mid.y - canvasTop;
  const wBefore = { x: (mcx - before.tx) / before.scale, y: (mcy - before.ty) / before.scale };
  const wAfter = { x: (mcx - after.tx) / after.scale, y: (mcy - after.ty) / after.scale };
  expect(Math.abs(wBefore.x - wAfter.x)).toBeLessThan(1);
  expect(Math.abs(wBefore.y - wAfter.y)).toBeLessThan(1);
});

test('two-finger drag pans the view without changing zoom', async ({ page }) => {
  await page.goto('/');

  const mid = await canvasCenter(page);
  const before = await getView(page);

  const gap = 50;
  const dx = 80;
  await pointerSeq(page, [
    { type: 'pointerdown', id: 1, x: mid.x - gap, y: mid.y },
    { type: 'pointerdown', id: 2, x: mid.x + gap, y: mid.y },
    { type: 'pointermove', id: 1, x: mid.x - gap + dx, y: mid.y },
    { type: 'pointermove', id: 2, x: mid.x + gap + dx, y: mid.y },
    { type: 'pointerup', id: 1, x: mid.x - gap + dx, y: mid.y },
    { type: 'pointerup', id: 2, x: mid.x + gap + dx, y: mid.y },
  ]);

  const after = await getView(page);
  // Distance between fingers unchanged → scale preserved.
  expect(Math.abs(after.scale - before.scale)).toBeLessThan(0.01);
  // Midpoint moved right by dx → tx shifts right by dx.
  expect(after.tx - before.tx).toBeGreaterThan(dx * 0.8);
});

// ---- layout invariants ---------------------------------------------------

test('rotation reflows the canvas and layout', async ({ page }) => {
  await page.goto('/');
  const portrait = await page.evaluate(() => {
    const r = (document.getElementById('c') as HTMLElement).getBoundingClientRect();
    return { w: r.width, h: r.height };
  });

  // Pixel 7 portrait is ~412x915; rotate to landscape.
  await page.setViewportSize({ width: 915, height: 412 });
  // The resize handler runs synchronously in the E2E build path, but give the
  // layout engine a tick to settle before measuring.
  await page.waitForTimeout(100);

  const landscape = await page.evaluate(() => {
    const r = (document.getElementById('c') as HTMLElement).getBoundingClientRect();
    return { w: r.width, h: r.height };
  });

  // Canvas width should grow significantly going landscape; height should shrink.
  expect(landscape.w).toBeGreaterThan(portrait.w + 100);
  expect(landscape.h).toBeLessThan(portrait.h);
});

test('profile modal fits within the viewport and can scroll internally', async ({ page }) => {
  await page.goto('/');
  await page.click('#btnProfile');
  await expect(page.locator('#profileModal')).toBeVisible();

  const m = await page.evaluate(() => {
    const panel = document.querySelector('#profileModal .modalPanel') as HTMLElement;
    const rect = panel.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      vh: window.innerHeight,
      overflowY: getComputedStyle(panel).overflowY,
    };
  });

  expect(m.top).toBeGreaterThanOrEqual(0);
  // Allow a 1px rounding slack — iOS/Android browsers report fractional bottoms.
  expect(m.bottom).toBeLessThanOrEqual(m.vh + 1);
  // Modal must be scrollable if content ever exceeds max-height.
  expect(['auto', 'scroll']).toContain(m.overflowY);
});

// ---- CSS proxies (browser gestures we can't observe directly) ------------

test('canvas suppresses browser pull-to-refresh gestures', async ({ page }) => {
  await page.goto('/');

  const canvasTouchAction = await page.evaluate(() => {
    return getComputedStyle(document.getElementById('c') as HTMLElement).touchAction;
  });
  expect(canvasTouchAction).toBe('none');

  const bodyOverscroll = await page.evaluate(
    () => getComputedStyle(document.body).overscrollBehaviorY,
  );
  expect(['none', 'contain']).toContain(bodyOverscroll);
});

test('buttons defeat 300ms tap delay via touch-action: manipulation', async ({ page }) => {
  await page.goto('/');
  const ta = await page.evaluate(
    () => getComputedStyle(document.querySelector('.btn') as HTMLElement).touchAction,
  );
  // Computed values may normalize to `manipulation` or the longhand pan set.
  expect(ta).toContain('manipulation');
});

test('seed input renders at 16px to defeat iOS focus auto-zoom', async ({ page }) => {
  await page.goto('/');
  const fontSize = await page.evaluate(
    () => getComputedStyle(document.getElementById('seedInput') as HTMLElement).fontSize,
  );
  expect(fontSize).toBe('16px');
});
