import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { EVAL_PRESET } from '../../src/types';

describe('CoverageGate', () => {
  it('uses a higher threshold for Staff preset', () => {
    const sim = new GameSim();
    sim.setPreset(EVAL_PRESET.STAFF);
    const cov = sim.getCoverage();
    expect(cov.preset).toBe(EVAL_PRESET.STAFF);
    expect(cov.threshold).toBe(75);
  });

  it('drops coverage as complexity increases and creates a coverage ticket when below threshold', () => {
    const sim: any = new GameSim();
    sim.setPreset(EVAL_PRESET.SENIOR);

    // Deterministic: force an immediate gap below threshold.
    sim.coveragePct = 60;
    sim.lastCompCount = 0;

    // Add some components so the gate also applies complexity tax.
    for (let i = 0; i < 10; i++) sim.addComponent('UI', 20 + i, 20 + i);

    // Call the gate directly to avoid coupling to tick ordering.
    sim.tickCoverageGate();

    const tickets = sim.getTickets();
    expect(tickets.some((t: any) => t.kind === 'TEST_COVERAGE')).toBe(true);
  });

  it('can trigger an escaped regression when coverage drops fast', () => {
    const sim: any = new GameSim();
    sim.setPreset(EVAL_PRESET.SENIOR);

    // Force a sharp drop and enough time for the 30s cadence check.
    sim.coveragePct = 82;
    sim.lastCompCount = 0;

    // Add lots of components to create a large coverage swing.
    for (let i = 0; i < 60; i++) sim.addComponent('UI', 10 + i, 10);

    // Advance time to make the drop detection eligible.
    for (let t = 0; t < 35; t++) sim.tick();

    const tickets = sim.getTickets();
    expect(tickets.some(t => t.kind === 'CRASH_SPIKE' || t.title.toLowerCase().includes('regression'))).toBe(true);
  });
});
