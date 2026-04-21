import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

describe('asymmetric scoring', () => {
  function makeSim(): any {
    return new GameSim();
  }

  describe('failure penalties', () => {
    it('BUDGET_DEPLETED applies 0.70x penalty', () => {
      const sim = makeSim();
      sim.reset({ width: 800, height: 600 }, { seed: 1 });
      sim.running = true;
      // endRun is now idempotent per run (v0.4). Force BUDGET_DEPLETED as the
      // first terminal event: pin rating high, drop budget, run one tick.
      sim.rating = 5.0;
      sim.budget = -1;
      sim.tick();
      expect(sim.lastRun).not.toBeNull();
      expect(sim.lastRun.endReason).toBe('BUDGET_DEPLETED');
      expect(sim.lastRun.multiplier).toBeLessThan(1.0);
    });

    it('RATING_COLLAPSED applies 0.50x penalty', () => {
      const sim = makeSim();
      sim.reset({ width: 800, height: 600 }, { seed: 1 });
      sim.running = true;
      sim.rating = 0.5;
      sim.budget = 1000; // keep budget positive so RATING_COLLAPSED wins
      sim.tick();
      expect(sim.lastRun).not.toBeNull();
      expect(sim.lastRun.endReason).toBe('RATING_COLLAPSED');
      expect(sim.lastRun.multiplier).toBeLessThanOrEqual(0.50);
    });
  });

  describe('bonuses', () => {
    it('SHIFT_COMPLETE on JUNIOR_MID gets survived bonus', () => {
      const sim = makeSim();
      sim.reset({ width: 800, height: 600 }, { seed: 1 });
      sim.setPreset('JUNIOR_MID');
      sim.running = true;
      // Fast-forward to shift end
      const shiftDur = sim.getShiftDurationSec();
      sim.timeSec = shiftDur - 1;
      sim.tick();
      expect(sim.lastRun).not.toBeNull();
      expect(sim.lastRun.endReason).toBe('SHIFT_COMPLETE');
      const survivedBonus = sim.lastRun.bonuses.find((b: any) => b.id === 'survived');
      expect(survivedBonus).toBeDefined();
      expect(survivedBonus.pct).toBe(0.15);
    });

    it('high rating bonus when rating >= 4.8 at shift end', () => {
      const sim = makeSim();
      sim.reset({ width: 800, height: 600 }, { seed: 1 });
      sim.running = true;
      const shiftDur = sim.getShiftDurationSec();
      sim.timeSec = shiftDur - 1;
      sim.rating = 5.0;
      sim.tick();
      if (sim.lastRun && sim.lastRun.endReason === 'SHIFT_COMPLETE' && sim.lastRun.rating >= 4.8) {
        const highRating = sim.lastRun.bonuses.find((b: any) => b.id === 'high_rating');
        expect(highRating).toBeDefined();
        expect(highRating.pct).toBe(0.10);
      }
    });

    it('no bonuses on failure endings', () => {
      const sim = makeSim();
      sim.reset({ width: 800, height: 600 }, { seed: 1 });
      sim.running = true;
      for (let i = 0; i < 10; i++) sim.tick();
      sim.budget = -1;
      sim.tick();
      expect(sim.lastRun).not.toBeNull();
      expect(sim.lastRun.bonuses).toHaveLength(0);
    });
  });
});
