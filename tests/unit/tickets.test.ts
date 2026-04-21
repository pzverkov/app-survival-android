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
    it('CRASH_SPIKE when failureRate > 0.08 (severity 3)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.tickTickets(0.10, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'CRASH_SPIKE');
      expect(t).toBeDefined();
      expect(t.severity).toBe(3);
    });

    it('ANR_RISK when anrRisk > 0.22 (severity 3)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.tickTickets(0, 0.25, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'ANR_RISK');
      expect(t?.severity).toBe(3);
    });

    it('JANK when jankPct > 28 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'JANK');
      expect(t?.severity).toBe(2);
    });

    it('HEAP when heap ratio > 0.78 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.heapMb = sim.heapMaxMb * 0.80;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'HEAP');
      expect(t?.severity).toBe(2);
    });

    it('BATTERY when battery < 25 (severity 1)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.battery = 20;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'BATTERY');
      expect(t?.severity).toBe(1);
    });

    it('A11Y_REGRESSION when a11yScore < 80 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.a11yScore = 70;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'A11Y_REGRESSION');
      expect(t?.severity).toBe(2);
    });

    it('PRIVACY_COMPLAINTS when privacyTrust < 80 (severity 2)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.privacyTrust = 70;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'PRIVACY_COMPLAINTS');
      expect(t?.severity).toBe(2);
    });

    it('SECURITY_EXPOSURE when securityPosture < 78 (severity 3)', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.securityPosture = 70;
      sim.tickTickets(0, 0, 0);
      const t = sim.tickets.find((x: any) => x.kind === 'SECURITY_EXPOSURE');
      expect(t?.severity).toBe(3);
    });
  });

  describe('dedup guard', () => {
    it('does not spawn a duplicate of an existing non-deferred ticket', () => {
      const sim = makeSim();
      clearSignals(sim);
      sim.jankPct = 30;
      sim.tickTickets(0, 0, 0);
      sim.tickTickets(0, 0, 0);
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

      // Active > deferred because deferred multiplies backlogSupport by 0.6
      // (sim.ts:1033). The unconditional -0.3 decay in tickTickets distorts
      // the post-tick ratio, so we assert ordering rather than a tight ratio.
      expect(active.supportLoad).toBeGreaterThan(deferred.supportLoad);
      expect(deferred.supportLoad).toBeLessThan(active.supportLoad * 0.7);
    });
  });
});
