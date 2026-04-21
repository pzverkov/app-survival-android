import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { tickBaselineProfile, tickPlayIntegrity, applyRegionCoupling, tickRolloutPhase } from '../../src/subsystems';

describe('Android-native realism surfaces', () => {
  it('Baseline Profile and R8 dampen jank multiplicatively', () => {
    const none = tickBaselineProfile({ active: false, r8Enabled: false });
    const bp = tickBaselineProfile({ active: true, r8Enabled: false });
    const both = tickBaselineProfile({ active: true, r8Enabled: true });
    expect(none.jankDamp).toBe(1.0);
    expect(bp.jankDamp).toBeLessThan(none.jankDamp);
    expect(both.jankDamp).toBeLessThan(bp.jankDamp);
  });

  it('Play Integrity activates only when ABUSE and AUTH are both tier >= 2', () => {
    expect(tickPlayIntegrity({ abuseTier: 0, authTier: 0 }).active).toBe(false);
    expect(tickPlayIntegrity({ abuseTier: 2, authTier: 1 }).active).toBe(false);
    expect(tickPlayIntegrity({ abuseTier: 2, authTier: 2 }).active).toBe(true);
    expect(tickPlayIntegrity({ abuseTier: 2, authTier: 2 }).damageScale).toBeLessThan(1.0);
  });

  it('region coupling: EU < 60 drags UK down', () => {
    const regions = [
      { code: 'EU' as const, compliance: 55 },
      { code: 'UK' as const, compliance: 80 },
    ];
    const d = applyRegionCoupling({ regions });
    expect(d.UK).toBeGreaterThan(0);
  });

  it('region coupling: US < 55 drags IN and BR', () => {
    const regions = [
      { code: 'US' as const, compliance: 50 },
      { code: 'IN' as const, compliance: 80 },
      { code: 'BR' as const, compliance: 80 },
    ];
    const d = applyRegionCoupling({ regions });
    expect(d.IN).toBeGreaterThan(0);
    expect(d.BR).toBeGreaterThan(0);
  });

  it('rollout phase: newApi resets phase to 0 (closed beta)', () => {
    const r = tickRolloutPhase({ phase: 3, timeSec: 180, qualityProcess: 1.0, newApiReleased: true });
    expect(r.phase).toBe(0);
  });

  it('rollout phase: high qualityProcess promotes phase on 60s boundary', () => {
    const r = tickRolloutPhase({ phase: 1, timeSec: 60, qualityProcess: 0.5, newApiReleased: false });
    expect(r.phase).toBe(2);
  });

  it('buyBaselineProfile consumes $250 and flips the flag', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    const before = sim.budget;
    const res = sim.buyBaselineProfile();
    expect(res.ok).toBe(true);
    expect(sim.baselineProfile).toBe(true);
    expect(sim.budget).toBe(before - 250);
    expect(sim.buyBaselineProfile().ok).toBe(false);
  });

  it('getAndroidSurfaces exposes rollout phase and play integrity state', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    const s = sim.getAndroidSurfaces();
    expect(s.rolloutPhase).toBeTypeOf('number');
    expect(s.playIntegrityActive).toBe(false);
  });
});
