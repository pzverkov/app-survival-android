import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

// Regression tests for Phase A bug sweep (v0.3.0).
//
// These guard small but consequential fixes in the sim that had slipped through
// earlier test coverage:
//  - duplicate RUN_RESET event on reset
//  - adrenaline set twice in the incident path
//  - shield compensation firing on non-incident events
//  - shield "compensation" being cosmetic rather than real mitigation

function makeSim(): any {
  const sim: any = new GameSim();
  sim.reset({ width: 800, height: 600 }, { seed: 12345 });
  return sim;
}

describe('sim bug sweep', () => {
  it('reset emits exactly one RUN_RESET event', () => {
    const sim = makeSim();
    const events = sim.drainEvents();
    const resetEvents = events.filter((e: any) => e.type === 'RUN_RESET');
    expect(resetEvents).toHaveLength(1);
  });

  it('incident dispatch does not double-set adrenaline', () => {
    const sim = makeSim();
    sim.lastEventAt = -1000; // bypass the 26s cooldown gate
    // Force TRAFFIC_SPIKE (cumulative weight <= 0.15).
    const queue = [0.0, 0.05];
    sim.rand = () => (queue.length ? queue.shift()! : 0.5);
    sim.maybeIncident();
    // Adrenaline window is exactly 22s; we should not exceed that.
    expect(sim.engAdrenalineUntil - sim.timeSec).toBe(22);
  });

  it('incident shield consumes only on INCIDENT_HEAD, not on cascading events', () => {
    const sim = makeSim();
    sim.incidentShieldCharges = 1;
    // Simulate a non-incident-head advisory event (the old bug path).
    sim.addEvent('Something happened', { category: 'INCIDENT' });
    // Shield should still be available since source != INCIDENT_HEAD.
    expect(sim.incidentShieldCharges).toBe(1);
  });

  it('shield softens incident damage rather than applying a cosmetic bump', () => {
    const withShield: any = new GameSim();
    withShield.reset({ width: 800, height: 600 }, { seed: 777 });
    withShield.lastEventAt = -1000;
    withShield.incidentShieldCharges = 1;

    const without: any = new GameSim();
    without.reset({ width: 800, height: 600 }, { seed: 777 });
    without.lastEventAt = -1000;

    // Force MITM (unprotected), which causes sizable privacy/security trust drops.
    // 0.59 lies inside the MITM slice of the v0.3.0 weight table.
    const forceMITM = (sim: any) => {
      const q = [0.0, 0.59, 0.5, 0.5];
      sim.rand = () => (q.length ? q.shift()! : 0.5);
      sim.maybeIncident();
    };
    forceMITM(withShield);
    forceMITM(without);

    // With the shield, both trust metrics should drop less.
    expect(100 - withShield.privacyTrust).toBeLessThan(100 - without.privacyTrust);
    expect(100 - withShield.securityPosture).toBeLessThan(100 - without.securityPosture);
    // And the charge should be consumed.
    expect(withShield.incidentShieldCharges).toBe(0);
  });
});
