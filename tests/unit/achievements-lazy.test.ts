import { describe, it, expect } from 'vitest';
import { AchStub } from '../../src/achievements_lazy';
import { AchievementsTracker, InMemoryAchStorage } from '../../src/achievements';
import { EVAL_PRESET } from '../../src/types';

describe('AchStub queue-then-flush', () => {
  it('returns inert defaults before the real tracker attaches', () => {
    const stub = new AchStub();
    expect(stub.isReady()).toBe(false);
    expect(stub.getPreset()).toBe(EVAL_PRESET.SENIOR);
    expect(stub.getProgress(EVAL_PRESET.SENIOR)).toEqual({ unlocked: 0, total: 0, bestSurvivalSec: 0 });
    expect(stub.getShopUnlocks(EVAL_PRESET.SENIOR)).toEqual({ booster: false, shield: false });
    expect(stub.getViewsForPreset(EVAL_PRESET.SENIOR)).toEqual([]);
  });

  it('queues events submitted before attachReal and returns no unlocks in the meantime', () => {
    const stub = new AchStub();
    const immediate = stub.onEvents([{ type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 }]);
    expect(immediate).toEqual([]);
    expect(stub.pendingCount()).toBe(1);
  });

  it('flushes queued events through the real tracker on attachReal and awards unlocks', () => {
    const stub = new AchStub();
    stub.setPreset(EVAL_PRESET.JUNIOR_MID);

    // Queue a RUN_START + TICKET_FIXED that should earn JM_SHIP_IT bronze
    // (fix 1 ticket) once the real tracker attaches.
    stub.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      { type: 'TICKET_FIXED', atSec: 5, kind: 'ARCHITECTURE_DEBT', effort: 2 },
    ]);
    expect(stub.pendingCount()).toBe(2);
    expect(stub.isReady()).toBe(false);

    const real = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, new InMemoryAchStorage());
    const replayed = stub.attachReal(real);

    expect(stub.isReady()).toBe(true);
    expect(stub.pendingCount()).toBe(0);
    expect(replayed.length).toBeGreaterThanOrEqual(1);
    expect(replayed.some((u) => u.id === 'JM_SHIP_IT')).toBe(true);

    // Progress / shop / views now proxy to the real tracker.
    const progress = stub.getProgress(EVAL_PRESET.JUNIOR_MID);
    expect(progress.total).toBeGreaterThan(0);
    expect(progress.unlocked).toBeGreaterThanOrEqual(1);
  });

  it('after attach, new events go straight to the real tracker (no re-queue)', () => {
    const stub = new AchStub();
    stub.setPreset(EVAL_PRESET.JUNIOR_MID);
    const real = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, new InMemoryAchStorage());
    stub.attachReal(real);

    const unlocked = stub.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      { type: 'TICKET_FIXED', atSec: 5, kind: 'ARCHITECTURE_DEBT', effort: 2 },
    ]);
    expect(stub.pendingCount()).toBe(0);
    expect(unlocked.some((u) => u.id === 'JM_SHIP_IT')).toBe(true);
  });

  it('fires onReady listeners exactly once, with the replayed unlocks', () => {
    const stub = new AchStub();
    stub.setPreset(EVAL_PRESET.JUNIOR_MID);
    stub.onEvents([
      { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
      { type: 'TICKET_FIXED', atSec: 5, kind: 'ARCHITECTURE_DEBT', effort: 2 },
    ]);

    let captured: unknown = null;
    let fires = 0;
    stub.onReady((u) => { captured = u; fires++; });

    const real = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, new InMemoryAchStorage());
    stub.attachReal(real);

    expect(fires).toBe(1);
    expect(Array.isArray(captured)).toBe(true);
    expect((captured as Array<{ id: string }>).some((u) => u.id === 'JM_SHIP_IT')).toBe(true);
  });
});
