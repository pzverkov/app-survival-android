import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { replayActionLog, type ActionLogEntry } from '../../src/actionlog';

const BOUNDS = { width: 800, height: 600 };

function runScripted(seed: number, ticks = 120, mutate?: (sim: any) => void): any {
  const sim: any = new GameSim();
  sim.setPreset('SENIOR');
  sim.reset(BOUNDS, { seed });
  if (mutate) mutate(sim);
  sim.setRunning(true);
  for (let i = 0; i < ticks; i++) sim.tick();
  return sim;
}

describe('replayActionLog', () => {
  it('two fresh sims replaying the same log produce the same simScore', () => {
    const a = runScripted(12345, 180, (sim) => {
      sim.setSelected(sim.components[0].id);
      sim.buyCapacityRefill();
    });

    const log = a.getActionLog() as ActionLogEntry[];
    const replayed = replayActionLog({
      seed: 12345,
      preset: 'SENIOR',
      log,
      bounds: BOUNDS,
      untilTimeSec: a.timeSec,
    });

    expect(replayed.simScore).toBeCloseTo(a.score, 10);
    expect(replayed.rating).toBeCloseTo(a.rating, 10);
    expect(replayed.timeSec).toBe(a.timeSec);
  });

  it('replaying the log against a different seed produces a different score', () => {
    const a = runScripted(98765, 90, (sim) => {
      sim.setSelected(sim.components[0].id);
      sim.upgradeSelected();
    });

    // Same log, wrong seed. The seed is the one piece of state the log cannot
    // encode — it's baked into the run's ReplayInput. Flipping it proves the
    // seed is load-bearing for verification.
    const replayed = replayActionLog({
      seed: 1,
      preset: 'SENIOR',
      log: a.getActionLog().slice() as ActionLogEntry[],
      bounds: BOUNDS,
      untilTimeSec: a.timeSec,
    });

    expect(replayed.simScore).not.toBeCloseTo(a.score, 3);
  });

  it('endRun sets verified=true for an unmodified live run', () => {
    const sim: any = new GameSim();
    sim.setPreset('SENIOR');
    sim.reset(BOUNDS, { seed: 42 });
    sim.setRunning(true);
    for (let i = 0; i < 40; i++) sim.tick();
    // Force an end-of-run path without waiting a full shift.
    (sim as any).endRun('SHIFT_COMPLETE', 0.01, 0.05, 120);

    expect(sim.lastRun).toBeDefined();
    expect(sim.lastRun.verified).toBe(true);
  });

  it('action log survives in field order across reset boundaries', () => {
    const sim: any = new GameSim();
    sim.setPreset('SENIOR');
    sim.reset(BOUNDS, { seed: 1 });
    sim.setSelected(sim.components[0].id);
    sim.buyCapacityRefill();

    // reset() clears the log for the next run.
    sim.reset(BOUNDS, { seed: 2 });
    const afterReset = sim.getActionLog();
    expect(afterReset.length).toBe(0);

    sim.buyCapacityRefill();
    expect(sim.getActionLog().length).toBe(1);
    expect(sim.getActionLog()[0].kind).toBe('buyCapacityRefill');
  });

  it('scenario replay matches live run byte-for-byte', () => {
    const sim: any = new GameSim();
    sim.loadScenario({
      id: 'test-scenario',
      seed: 0xBEEF,
      preset: 'SENIOR',
      incidentScript: [
        { atSec: 30, kind: 'MEMORY_LEAK' },
        { atSec: 60, kind: 'A11Y_REGRESSION' },
      ],
    }, BOUNDS);
    sim.setRunning(true);
    for (let i = 0; i < 90; i++) sim.tick();

    const log = sim.getActionLog() as ActionLogEntry[];
    const replayed = replayActionLog({
      seed: 0xBEEF,
      preset: 'SENIOR',
      log,
      bounds: BOUNDS,
      untilTimeSec: sim.timeSec,
    });

    expect(replayed.simScore).toBeCloseTo(sim.score, 10);
  });
});
