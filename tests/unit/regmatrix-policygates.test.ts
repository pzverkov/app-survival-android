import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

function stubRand(sim: any, values: number[]) {
  const q = [...values];
  sim.rand = () => (q.length ? q.shift()! : 0.5);
}

describe('RegMatrix / PolicyGates', () => {
  it('freezes a region when compliance is critical', () => {
    const sim: any = new GameSim();

    // Deterministic: force compliance to a critical state for at least one region.
    sim.regions[0].compliance = 40;
    sim.regions[0].frozenSec = 0;

    // Apply RegMatrix once.
    sim.tickRegMatrix();

    const regions = sim.getRegions();
    expect(regions.some((r: any) => r.frozenSec > 0)).toBe(true);
  });

  it('weighted compliance sets regPressure proportionally', () => {
    const sim: any = new GameSim();
    // Drive all regions to the same non-trivial compliance so the
    // weighted average is easy to reason about. With tiers at 0 and
    // trust metrics at 100, regionTarget lands near 85 for most codes,
    // so a tick below that pulls compliance upward by ~1-2 points.
    for (const r of sim.regions) r.compliance = 60;
    sim.privacyTrust = 100;
    sim.securityPosture = 100;
    sim.a11yScore = 100;
    // Block the enforcement branches so they don't consume rand or tickets.
    sim.timeSec = 1;

    sim.tickRegMatrix();

    // With all shares summing to 1.0 and compliance≈60-61 after one tick,
    // weighted ≈ 1.0 * 0.39 ≈ 0.39, so regPressure ≈ 0.39 * 140 ≈ 55.
    expect(sim.regPressure).toBeGreaterThan(48);
    expect(sim.regPressure).toBeLessThan(62);
  });

  it('issues a regulatory fine when regPressure > 78 at the 75-sec cadence', () => {
    const sim: any = new GameSim();
    for (const r of sim.regions) r.compliance = 35;
    sim.timeSec = 75;
    // [audit_guard=0.99 (skip), fine_guard=0.10 (hit), fine_amount=0.50]
    stubRand(sim, [0.99, 0.10, 0.50]);
    const budgetBefore = sim.budget;

    sim.tickRegMatrix();

    expect(sim.budget).toBeLessThan(budgetBefore);
    const events = sim.drainEvents().map((e: any) => e.msg);
    expect(events.some((m: string) => m.startsWith('Regulatory fine'))).toBe(true);
  });

  it('opens an audit request when regPressure > 78 at the 75-sec cadence', () => {
    const sim: any = new GameSim();
    for (const r of sim.regions) r.compliance = 35;
    sim.timeSec = 75;
    // [audit_guard=0.10 (hit), fine_guard=0.99 (skip)]
    stubRand(sim, [0.10, 0.99]);

    sim.tickRegMatrix();

    const audit = sim.tickets.find((t: any) => t.kind === 'STORE_REJECTION' && t.title === 'Audit request');
    expect(audit).toBeDefined();
    const events = sim.drainEvents().map((e: any) => e.msg);
    expect(events.some((m: string) => m === 'Audit request opened')).toBe(true);
  });

  it('frozen region thaws when compliance stays above the re-freeze threshold', () => {
    const sim: any = new GameSim();
    // Set compliance well above the 55 re-freeze threshold so the loop
    // does not keep re-arming the freeze on each tick.
    for (const r of sim.regions) r.compliance = 90;
    sim.regions[0].frozenSec = 3;
    sim.privacyTrust = 100;
    sim.securityPosture = 100;
    sim.a11yScore = 100;

    for (let i = 0; i < 3; i++) sim.tickRegMatrix();

    expect(sim.regions[0].frozenSec).toBe(0);
  });
});
