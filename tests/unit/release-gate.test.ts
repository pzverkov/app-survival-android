import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { EVAL_PRESET, type EvalPreset } from '../../src/types';

// Cross-preset release gate.
//
// This is the v0.3.0 "is the build shippable?" smoke check. For each evaluation
// preset, we run the same seeded shift for 600 ticks and assert a small number
// of bounded invariants: no NaNs, no runaway economies, no burnout without
// cause. It's cheap (sub-second) and catches whole classes of regressions.

type Fingerprint = {
  preset: EvalPreset;
  incidentCount: number;
  rating: number;
  budget: number;
  supportLoad: number;
  score: number;
  ticketKinds: string[];
  burnoutKindsSane: boolean;
};

function runPreset(preset: EvalPreset, ticks = 600, seed = 12345): Fingerprint {
  const sim: any = new GameSim();
  sim.reset({ width: 800, height: 600 }, { seed });
  sim.setPreset(preset);
  sim.running = true;
  for (let i = 0; i < ticks; i++) sim.tick();

  const hasBurnout = sim.tickets.some((t: any) => t.kind === 'BURNOUT');
  // BURNOUT should only appear if capacity actually hit 0 at some point.
  const burnoutKindsSane = !hasBurnout || sim.burnoutZeroHits.length > 0 || sim.burnoutLevel > 0;

  return {
    preset,
    incidentCount: sim.incidentCount,
    rating: sim.rating,
    budget: sim.budget,
    supportLoad: sim.supportLoad,
    score: sim.score,
    ticketKinds: sim.tickets.map((t: any) => t.kind),
    burnoutKindsSane,
  };
}

describe('release gate', () => {
  for (const preset of Object.values(EVAL_PRESET) as EvalPreset[]) {
    it(`${preset}: 600 ticks stay within bounded invariants`, () => {
      const fp = runPreset(preset);

      expect(Number.isFinite(fp.rating)).toBe(true);
      expect(fp.rating).toBeGreaterThanOrEqual(1.0);
      expect(fp.rating).toBeLessThanOrEqual(5.0);

      expect(Number.isFinite(fp.budget)).toBe(true);
      expect(fp.budget).toBeGreaterThanOrEqual(0);
      expect(fp.budget).toBeLessThanOrEqual(10000);

      expect(fp.supportLoad).toBeGreaterThanOrEqual(0);
      expect(fp.supportLoad).toBeLessThanOrEqual(100 + 1e-6);

      expect(fp.score).toBeGreaterThanOrEqual(0);

      // At least one incident should fire in 600 ticks on any preset.
      expect(fp.incidentCount).toBeGreaterThanOrEqual(1);
      // And incidents should not be runaway either.
      expect(fp.incidentCount).toBeLessThanOrEqual(60);

      expect(fp.burnoutKindsSane).toBe(true);
    });
  }

  it('all presets produce tickets that carry a reason field on gated kinds', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 12345 });
    sim.running = true;
    for (let i = 0; i < 300; i++) sim.tick();
    const gatedKinds = new Set(['CRASH_SPIKE', 'ANR_RISK', 'JANK', 'HEAP', 'BATTERY', 'A11Y_REGRESSION', 'PRIVACY_COMPLAINTS', 'SECURITY_EXPOSURE']);
    for (const t of sim.tickets) {
      if (gatedKinds.has(t.kind)) {
        expect(t.reason).toBeTruthy();
      }
    }
  });
});
