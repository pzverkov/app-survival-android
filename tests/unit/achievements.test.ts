import { describe, expect, test } from 'vitest';
import { AchievementsTracker, InMemoryAchStorage } from '../../src/achievements';
import { EVAL_PRESET } from '../../src/types';

describe('achievements', () => {
  test('unlocks first fix per preset', () => {
    const store = new InMemoryAchStorage();
    const t = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, store);

    const unlocked0 = t.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      { type: 'TICKET_FIXED', atSec: 10, kind: 'BUG' as any, effort: 4 },
    ]);

    expect(unlocked0.map(a => `${a.id}:${a.tier}`)).toContain('JM_SHIP_IT:1');

    // Switching preset should not leak unlocked state.
    t.setPreset(EVAL_PRESET.SENIOR);
    const unlockedSenior = t.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      { type: 'TICKET_FIXED', atSec: 10, kind: 'BUG' as any, effort: 4 },
      { type: 'TICKET_FIXED', atSec: 12, kind: 'BUG' as any, effort: 4 },
      { type: 'TICKET_FIXED', atSec: 14, kind: 'BUG' as any, effort: 4 },
    ]);
    expect(unlockedSenior.map(a => `${a.id}:${a.tier}`)).toContain('S_VELOCITY:1');
  });

  test('hidden achievements remain hidden until unlocked', () => {
    const store = new InMemoryAchStorage();
    const t = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, store);

    const viewsLocked = t.getViewsForPreset(EVAL_PRESET.JUNIOR_MID);
    const hiddenLocked = viewsLocked.find(v => v.id === 'JM_TRUST_STACK');
    expect(hiddenLocked).toBeTruthy();
    expect(hiddenLocked!.title).toBe('Hidden achievement');

    // Unlock it (survive 5 min with all trust layers)
    t.onEvents([{ type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 }]);

    const unlocked = t.onEvents([
      {
        type: 'TICK',
        atSec: 300,
        backlog: 3,
        rating: 4.8,
        capacityCur: 10,
        capacityMax: 12,
        budget: 2000,
        architectureDebt: 0,
        components: ['AUTH', 'PINNING', 'KEYSTORE', 'SANITIZER', 'ABUSE', 'OBS', 'FLAGS'] as any,
      },
    ]);
    expect(unlocked.map(u => `${u.id}:${u.tier}`)).toContain('JM_TRUST_STACK:1');

    const viewsUnlocked = t.getViewsForPreset(EVAL_PRESET.JUNIOR_MID);
    const hiddenUnlocked = viewsUnlocked.find(v => v.id === 'JM_TRUST_STACK');
    expect(hiddenUnlocked).toBeTruthy();
    expect(hiddenUnlocked!.title).not.toBe('Hidden achievement');
  });

  test('achievements unlock shop items without persisting across presets', () => {
    const store = new InMemoryAchStorage();
    const t = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, store);

    // Before: locked
    expect(t.getShopUnlocks(EVAL_PRESET.JUNIOR_MID).booster).toBe(false);

    // Unlock bronze survivor (3m)
    t.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      {
        type: 'TICK',
        atSec: 180,
        backlog: 2,
        rating: 4.8,
        capacityCur: 10,
        capacityMax: 12,
        budget: 2500,
        architectureDebt: 0,
        components: ['AUTH'] as any,
      },
    ]);
    expect(t.getShopUnlocks(EVAL_PRESET.JUNIOR_MID).booster).toBe(true);

    // Senior starts locked (separate progression)
    expect(t.getShopUnlocks(EVAL_PRESET.SENIOR).booster).toBe(false);
  });
});
