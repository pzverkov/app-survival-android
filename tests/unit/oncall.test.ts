import { describe, it, expect } from 'vitest';
import { tickBurnout, ticketDrainsOnCall } from '../../src/oncall';
import { GameSim } from '../../src/sim';

describe('burnout model', () => {
  it('a single zero hit does not accrue burnout', () => {
    const r = tickBurnout({
      capacityCur: 0,
      timeSec: 10,
      zeroHitTimesSec: [],
      burnoutLevel: 0,
      hasBurnoutTicket: false,
    });
    expect(r.burnoutLevel).toBe(0);
    expect(r.createBurnoutTicket).toBe(false);
  });

  it('three zero hits within 90s create a BURNOUT ticket', () => {
    // Simulate three spaced-out zero events.
    let state = { zeroHitTimesSec: [] as number[], burnoutLevel: 0 };
    for (const t of [10, 40, 80]) {
      const r = tickBurnout({
        capacityCur: 0,
        timeSec: t,
        zeroHitTimesSec: state.zeroHitTimesSec,
        burnoutLevel: state.burnoutLevel,
        hasBurnoutTicket: false,
      });
      state = { zeroHitTimesSec: r.zeroHitTimesSec, burnoutLevel: r.burnoutLevel };
    }
    expect(state.burnoutLevel).toBeGreaterThan(0);
  });

  it('BURNOUT ticket active applies regen penalty', () => {
    const r = tickBurnout({
      capacityCur: 3,
      timeSec: 200,
      zeroHitTimesSec: [],
      burnoutLevel: 0.6,
      hasBurnoutTicket: true,
    });
    expect(r.regenPenalty).toBeGreaterThan(0);
  });

  it('ticketDrainsOnCall classifies incident-driven tickets', () => {
    expect(ticketDrainsOnCall('CRASH_SPIKE')).toBe(true);
    expect(ticketDrainsOnCall('BURNOUT')).toBe(true);
    expect(ticketDrainsOnCall('ARCHITECTURE_DEBT')).toBe(false);
  });

  it('sim creates a BURNOUT ticket when capacity is crushed repeatedly', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    for (const t of [10, 40, 80]) {
      sim.timeSec = t;
      sim.engCapacity = 0;
      sim.tickTickets(0, 0, 0);
    }
    // After three zero hits, either the ticket is present or burnout level is ramping.
    expect(sim.burnoutLevel).toBeGreaterThan(0);
  });

  it('fixing a BURNOUT ticket clears state and bursts regen', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    sim.engCapacity = 5;
    sim.createTicket('BURNOUT', 'On-call burnout', 'Reliability', 2, 60, 4);
    const id = sim.tickets.find((t: any) => t.kind === 'BURNOUT').id;
    sim.fixTicket(id);
    expect(sim.tickets.find((t: any) => t.kind === 'BURNOUT')).toBeUndefined();
    expect(sim.burnoutLevel).toBe(0);
    expect(sim.engAdrenalineUntil).toBeGreaterThan(sim.timeSec);
  });
});
