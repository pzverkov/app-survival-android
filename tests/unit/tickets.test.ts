import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

function makeSim(): any {
  const sim: any = new GameSim();
  return sim;
}

// Clears any fresh-start state that could create tickets on the first tick
// independent of the signal we're probing.
function clearSignals(sim: any) {
  sim.jankPct = 0;
  sim.heapMb = 0;
  sim.battery = 100;
  sim.a11yScore = 100;
  sim.privacyTrust = 100;
  sim.securityPosture = 100;
  sim.platform.pressure = 0;
  sim.patch.compat = 1;
}

// Default SENIOR preset requires 2 ticks for severity<3 tickets without
// corroborators; tick that many times for signals to latch.
function tickN(sim: any, n: number, failureRate = 0, anrRisk = 0, p95 = 0) {
  for (let i = 0; i < n; i++) sim.tickTickets(failureRate, anrRisk, p95);
}

describe('ticket generation', () => {
  describe('aging', () => {
    it('increments ageSec once per tickTickets call', () => {
      const sim = makeSim();
      clearSignals(sim);
      (sim as any).createTicket('JANK', 'x', 'Performance', 2, 1, 1);
      const t = sim.tickets[0];
      for (let i = 0; i < 5; i++) sim.tickTickets(0, 0, 0);
      expect(t.ageSec).toBe(5);
    });
  });

  describe('severity by signal', () => {
    it('CRASH_SPIKE when failureRate > 0.08 (severity 3, fires on single tick)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.tickTickets(0.10, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'CRASH_SPIKE');
      expect(t).toBeDefined();
      expect(t.severity).toBe(3);
    });

    it('ANR_RISK when anrRisk > 0.22 (severity 3, fires on single tick)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.tickTickets(0, 0.25, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'ANR_RISK');
      expect(t?.severity).toBe(3);
    });

    it('JANK requires multi-signal corroboration or debounce (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      tickN(sim, 2);
      const t = sim.tickets.find((x: any) => x.kind === 'JANK');
      expect(t?.severity).toBe(2);
    });

    it('HEAP when heap ratio > 0.78 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.heapMb = sim.heapMaxMb * 0.80;
      tickN(sim, 2);
      const t = sim.tickets.find((x: any) => x.kind === 'HEAP');
      expect(t?.severity).toBe(2);
    });

    it('BATTERY when battery < 25 (severity 1, requires 2 ticks)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.battery = 20;
      tickN(sim, 2);
      const t = sim.tickets.find((x: any) => x.kind === 'BATTERY');
      expect(t?.severity).toBe(1);
    });

    it('A11Y_REGRESSION when a11yScore < 80 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.a11yScore = 70;
      tickN(sim, 2);
      const t = sim.tickets.find((x: any) => x.kind === 'A11Y_REGRESSION');
      expect(t?.severity).toBe(2);
    });

    it('PRIVACY_COMPLAINTS when privacyTrust < 80 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.privacyTrust = 70;
      tickN(sim, 2);
      const t = sim.tickets.find((x: any) => x.kind === 'PRIVACY_COMPLAINTS');
      expect(t?.severity).toBe(2);
    });

    it('SECURITY_EXPOSURE when securityPosture < 78 (severity 3, fires on single tick)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.securityPosture = 70;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'SECURITY_EXPOSURE');
      expect(t?.severity).toBe(3);
    });
  });

  describe('cross-check gating', () => {
    it('single flap (one tick with jank > 28) does not fire a ticket', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      sim.tickTickets(0, 0, 0);
      // On SENIOR debounce of 2 without corroborating signals, ticket must wait.
      expect(sim.tickets.find((x: any) => x.kind === 'JANK')).toBeUndefined();
    });

    it('ticket carries a human-readable reason string', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.tickTickets(0.10, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'CRASH_SPIKE');
      expect(t?.reason).toBeTruthy();
      expect(typeof t.reason).toBe('string');
    });

    it('OBS tier 2 lowers corroboration bar (PRIVACY fires on single tick)', () => {
      const sim = makeSim();
      clearSignals(sim);
      // Place an OBS component at tier 2 so the corroboration discount kicks in.
      sim.components.push({
        id: sim.nextId++, type: 'OBS', x: 0, y: 0, r: 22,
        tier: 2, health: 100, down: false,
        load: 0, queue: 0, cap: 99, lat: 10, fail: 0.001,
      });
      sim.privacyTrust = 60;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'PRIVACY_COMPLAINTS');
      expect(t).toBeDefined();
    });

    it('candidate alerts expose gates that have not yet fired', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      sim.tickTickets(0, 0, 0);
      const alerts = sim.getCandidateAlerts();
      expect(alerts.some((a: any) => a.kind === 'JANK')).toBe(true);
    });
  });

  describe('dedup guard', () => {
    it('does not spawn a duplicate of an existing non-deferred ticket', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      tickN(sim, 3);
      const janks = sim.tickets.filter((x: any) => x.kind === 'JANK');
      expect(janks).toHaveLength(1);
    });
  });

  describe('deferred backlog pressure', () => {
    it('deferred tickets apply 0.6x support load vs active', () => {
      // Two sims with one identical ticket each; only the "defer" state differs.
      // Zero out signals and reset supportLoad so the only driver is the ticket.
      const active = makeSim();
      const deferred = makeSim();
      clearSignals(active);
      clearSignals(deferred);

      (active as any).createTicket('JANK', 'x', 'Performance', 2, 100, 4);
      (deferred as any).createTicket('JANK', 'x', 'Performance', 2, 100, 4);
      deferred.tickets[0].deferred = true;

      active.supportLoad = 0;
      deferred.supportLoad = 0;

      active.tickTickets(0, 0, 0);
      deferred.tickTickets(0, 0, 0);

      // Active > deferred because deferred multiplies backlogSupport by 0.6.
      // The unconditional -0.3 decay distorts the post-tick ratio; assert ordering.
      expect(active.supportLoad).toBeGreaterThan(deferred.supportLoad);
      expect(deferred.supportLoad).toBeLessThan(active.supportLoad * 0.7);
    });
  });
});
