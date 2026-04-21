import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

// Determinism replay test.
//
// Given the same seed, two fresh sims running identical tick counts must
// produce the same event stream byte-for-byte. This is the guard against
// any future "tiny helper" silently shifting rand() call order (which has
// happened before — see Phase A bug sweep notes).

function runAndCollect(seed: number, ticks: number) {
  const sim: any = new GameSim();
  sim.reset({ width: 800, height: 600 }, { seed });
  sim.running = true;
  for (let i = 0; i < ticks; i++) sim.tick();
  const events = sim.drainEvents();
  return {
    events,
    finalState: {
      rating: sim.rating,
      budget: sim.budget,
      heapMb: sim.heapMb,
      supportLoad: sim.supportLoad,
      incidentCount: sim.incidentCount,
      ticketCount: sim.tickets.length,
    },
  };
}

describe('seeded replay', () => {
  it('two runs at same seed produce identical event streams', () => {
    const a = runAndCollect(12345, 300);
    const b = runAndCollect(12345, 300);

    expect(a.events.length).toBe(b.events.length);
    for (let i = 0; i < a.events.length; i++) {
      expect(a.events[i]).toEqual(b.events[i]);
    }
    expect(a.finalState).toEqual(b.finalState);
  });

  it('different seeds produce different event streams', () => {
    const a = runAndCollect(12345, 300);
    const b = runAndCollect(99999, 300);
    // Not a byte-for-byte match (with overwhelming probability).
    const sameLen = a.events.length === b.events.length;
    const allSame = sameLen && a.events.every((e, i) => JSON.stringify(e) === JSON.stringify(b.events[i]));
    expect(allSame).toBe(false);
  });
});
