import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

describe('RegMatrix / PolicyGates', () => {
  it('freezes a region when compliance is critical', () => {
    const sim: any = new GameSim();

    // Force a low posture so regional targets fall.
    sim.privacyTrust = 35;
    sim.securityPosture = 35;
    sim.a11yScore = 40;

    // Run enough ticks for RegMatrix to update and apply freeze.
    for (let t = 0; t < 80; t++) sim.tick();

    const regions = sim.getRegions();
    expect(regions.some(r => r.frozenSec > 0)).toBe(true);
  });
});
