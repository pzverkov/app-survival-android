import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

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
});
