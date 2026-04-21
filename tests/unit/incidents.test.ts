import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { EVAL_PRESET } from '../../src/types';
import type { ComponentType } from '../../src/types';

// Cumulative weight midpoints for the roll in maybeIncident.
// Each value lies strictly inside the slice for its kind so boundary drift in
// the weight table doesn't silently mis-target handlers.
const ROLL: Record<string, number> = {
  TRAFFIC_SPIKE: 0.05,
  NET_WOBBLE: 0.19,
  OEM_RESTRICTION: 0.30,
  CRED_STUFFING: 0.38,
  TOKEN_THEFT: 0.45,
  DEEP_LINK_ABUSE: 0.52,
  MITM: 0.59,
  CERT_ROTATION: 0.65,
  A11Y_REGRESSION: 0.70,
  SDK_SCANDAL: 0.74,
  MEMORY_LEAK: 0.79,
  REGION_OUTAGE: 0.84,
  ANR_ESCALATION: 0.87,
  IAP_FRAUD: 0.91,
  PUSH_ABUSE: 0.95,
  DEEP_LINK_EXPLOIT: 0.99,
};

function makeSim(): any {
  const sim: any = new GameSim();
  sim.setPreset(EVAL_PRESET.SENIOR);
  sim.lastEventAt = -1000; // bypass 26s cooldown
  return sim;
}

// Monkey-patch rand() so dispatch is deterministic.
// First call = incidentChance gate (0.0 always passes).
// Second call = weighted roll (picks the kind).
// Additional values are consumed by the handler body when it rolls for
// damage magnitudes (MITM/A11Y_REGRESSION/DEEP_LINK_ABUSE).
function force(sim: any, kind: keyof typeof ROLL, extra: number[] = []) {
  const queue = [0.0, ROLL[kind]!, ...extra];
  sim.rand = () => (queue.length ? queue.shift()! : 0.5);
  sim.maybeIncident();
}

function setTier(sim: any, type: ComponentType, tier: 1 | 2 | 3) {
  const i = sim.components.findIndex((c: any) => c.type === type);
  if (i >= 0) sim.components.splice(i, 1);
  sim.components.push({
    id: sim.nextId++, type, x: 100, y: 100, r: 22,
    tier, health: 100, down: false,
    load: 0, queue: 0, cap: 99, lat: 10, fail: 0.001,
  });
}

describe('incident dispatcher weighted roll', () => {
  it.each([
    ['TRAFFIC_SPIKE', 0.01, (sim: any) => sim.spawnMul > 1.0],
    ['NET_WOBBLE', 0.19, (sim: any) => sim.netBadness > 1.0],
    ['REGION_OUTAGE', 0.84, (sim: any) => sim.regions.some((r: any) => r.frozenSec > 0)],
    ['ANR_ESCALATION', 0.87, (sim: any) => sim.anrPoints > 0 || sim.rating < 5.0],
  ])('roll=%f selects %s', (_kind, roll, predicate) => {
    const sim = makeSim();
    const q = [0.0, roll as number];
    sim.rand = () => (q.length ? q.shift()! : 0.5);
    sim.maybeIncident();
    expect(predicate(sim)).toBe(true);
  });
});

describe('per-incident effects', () => {
  it('TRAFFIC_SPIKE raises spawnMul and support without ABUSE', () => {
    const sim = makeSim();
    const supportBefore = sim.supportLoad;
    const spawnBefore = sim.spawnMul;
    force(sim, 'TRAFFIC_SPIKE');
    expect(sim.spawnMul).toBeGreaterThan(spawnBefore);
    // bumpSupport(2 + 3) with -0.08 decay at top of maybeIncident.
    expect(sim.supportLoad).toBeGreaterThan(supportBefore + 4);
  });

  it('TRAFFIC_SPIKE is dampened when ABUSE tier >=1', () => {
    const unprotected = makeSim();
    const protected_ = makeSim();
    setTier(protected_, 'ABUSE', 1);
    force(unprotected, 'TRAFFIC_SPIKE');
    force(protected_, 'TRAFFIC_SPIKE');
    expect(protected_.spawnMul).toBeLessThan(unprotected.spawnMul);
    expect(protected_.supportLoad).toBeLessThan(unprotected.supportLoad);
  });

  it('NET_WOBBLE raises netBadness and is dampened by OBS', () => {
    const bare = makeSim();
    const obs = makeSim();
    setTier(obs, 'OBS', 1);
    force(bare, 'NET_WOBBLE');
    force(obs, 'NET_WOBBLE');
    expect(bare.netBadness).toBeGreaterThan(1.0);
    expect(obs.netBadness).toBeLessThan(bare.netBadness);
  });

  it('OEM_RESTRICTION raises workRestriction', () => {
    const sim = makeSim();
    force(sim, 'OEM_RESTRICTION');
    expect(sim.workRestriction).toBeGreaterThan(1.0);
  });

  it('MITM without pinning tanks trust and rating', () => {
    const sim = makeSim();
    force(sim, 'MITM', [0.5, 0.5]); // 2 rands inside the handler body
    expect(sim.privacyTrust).toBeLessThan(100);
    expect(sim.securityPosture).toBeLessThan(100);
    expect(sim.rating).toBeLessThanOrEqual(5.0 - 0.22);
  });

  it('MITM is mostly blocked with PINNING tier >=1', () => {
    const sim = makeSim();
    setTier(sim, 'PINNING', 1);
    force(sim, 'MITM');
    // No extra rands consumed on mitigated path. Trust untouched.
    expect(sim.privacyTrust).toBe(100);
    expect(sim.securityPosture).toBe(100);
    expect(sim.rating).toBe(5.0);
  });

  it('CERT_ROTATION: tier 1 is worse than tier 0 (transitional rotation)', () => {
    const noPin = makeSim();
    const pin1 = makeSim();
    const pin2 = makeSim();
    setTier(pin1, 'PINNING', 1);
    setTier(pin2, 'PINNING', 2);
    force(noPin, 'CERT_ROTATION');
    force(pin1, 'CERT_ROTATION');
    force(pin2, 'CERT_ROTATION');
    // pin1 path bumps support by 12 and drops rating; worst of the three.
    expect(pin1.rating).toBeLessThan(5.0);
    expect(pin1.supportLoad).toBeGreaterThan(noPin.supportLoad);
    expect(pin1.supportLoad).toBeGreaterThan(pin2.supportLoad);
    expect(noPin.rating).toBe(5.0);
    expect(pin2.rating).toBe(5.0);
  });

  it('TOKEN_THEFT tanks security with AUTH tier 0', () => {
    const bare = makeSim();
    const hardened = makeSim();
    setTier(hardened, 'AUTH', 1);
    force(bare, 'TOKEN_THEFT');
    force(hardened, 'TOKEN_THEFT');
    expect(bare.securityPosture).toBeLessThan(hardened.securityPosture);
    expect(bare.rating).toBeLessThan(5.0);
    expect(hardened.rating).toBe(5.0);
  });

  it('CRED_STUFFING raises netBadness; ABUSE dampens', () => {
    const bare = makeSim();
    const abuse = makeSim();
    setTier(abuse, 'ABUSE', 1);
    force(bare, 'CRED_STUFFING');
    force(abuse, 'CRED_STUFFING');
    expect(bare.netBadness).toBeGreaterThan(abuse.netBadness);
    expect(bare.supportLoad).toBeGreaterThan(abuse.supportLoad);
  });

  it('DEEP_LINK_ABUSE damages UI/VM/DOMAIN without SANITIZER', () => {
    const sim = makeSim();
    setTier(sim, 'UI', 1);
    setTier(sim, 'VM', 1);
    setTier(sim, 'DOMAIN', 1);
    // Handler rolls rand once per damaged component.
    force(sim, 'DEEP_LINK_ABUSE', [0.5, 0.5, 0.5]);
    for (const t of ['UI', 'VM', 'DOMAIN'] as ComponentType[]) {
      const n = sim.components.find((c: any) => c.type === t);
      expect(n.health).toBeLessThan(100);
    }
  });

  it('DEEP_LINK_ABUSE leaves components unharmed with SANITIZER', () => {
    const sim = makeSim();
    setTier(sim, 'UI', 1);
    setTier(sim, 'SANITIZER', 1);
    force(sim, 'DEEP_LINK_ABUSE');
    const ui = sim.components.find((c: any) => c.type === 'UI');
    expect(ui.health).toBe(100);
  });

  it('A11Y_REGRESSION damages a11yScore without A11Y layer', () => {
    const bare = makeSim();
    const layer = makeSim();
    setTier(layer, 'A11Y', 1);
    force(bare, 'A11Y_REGRESSION', [0.5]);
    force(layer, 'A11Y_REGRESSION', [0.5]);
    expect(bare.a11yScore).toBeLessThan(layer.a11yScore);
    expect(bare.rating).toBeLessThan(5.0);
  });

  it('SDK_SCANDAL: FLAGS tier>=2 halves the blast', () => {
    const bare = makeSim();
    const flagged = makeSim();
    setTier(flagged, 'FLAGS', 2);
    force(bare, 'SDK_SCANDAL');
    force(flagged, 'SDK_SCANDAL');
    expect(bare.privacyTrust).toBeLessThan(flagged.privacyTrust);
    expect(bare.rating).toBeLessThan(flagged.rating);
  });

  it('SDK_SCANDAL: KEYSTORE tier>=1 reduces trust damage', () => {
    const bare = makeSim();
    const key = makeSim();
    setTier(key, 'KEYSTORE', 1);
    force(bare, 'SDK_SCANDAL');
    force(key, 'SDK_SCANDAL');
    expect(bare.privacyTrust).toBeLessThan(key.privacyTrust);
  });

  it('MEMORY_LEAK severity scales inversely with CACHE tier', () => {
    const tier0 = makeSim();
    const tier1 = makeSim();
    const tier2 = makeSim();
    setTier(tier1, 'CACHE', 1);
    setTier(tier2, 'CACHE', 2);
    const heapBefore = tier0.heapMb;
    force(tier0, 'MEMORY_LEAK');
    force(tier1, 'MEMORY_LEAK');
    force(tier2, 'MEMORY_LEAK');
    const d0 = tier0.heapMb - heapBefore;
    const d1 = tier1.heapMb - heapBefore;
    const d2 = tier2.heapMb - heapBefore;
    expect(d0).toBeGreaterThan(d1);
    expect(d1).toBeGreaterThan(d2);
  });

  it('REGION_OUTAGE freezes a region for >=60s and drops compliance', () => {
    const sim = makeSim();
    const beforeCompliance = sim.regions.map((r: any) => r.compliance);
    force(sim, 'REGION_OUTAGE');
    const frozen = sim.regions.find((r: any) => r.frozenSec >= 60);
    expect(frozen).toBeDefined();
    const beforeC = beforeCompliance[sim.regions.indexOf(frozen)];
    expect(frozen.compliance).toBeLessThanOrEqual(beforeC - 7);
    expect(sim.rating).toBeLessThanOrEqual(5.0 - 0.06);
  });

  it('ANR_ESCALATION cascades into a crash ticket when anrPoints is high', () => {
    const sim = makeSim();
    sim.anrPoints = 50; // anrRisk = 50/120 > 0.30
    force(sim, 'ANR_ESCALATION');
    const t = sim.tickets.find((x: any) => x.kind === 'CRASH_SPIKE');
    expect(t).toBeDefined();
    expect(sim.rating).toBeLessThan(5.0);
  });

  it('ANR_ESCALATION just raises anrPoints when risk is low', () => {
    const sim = makeSim();
    sim.anrPoints = 0;
    force(sim, 'ANR_ESCALATION');
    expect(sim.anrPoints).toBeGreaterThan(0);
    expect(sim.tickets.find((x: any) => x.kind === 'CRASH_SPIKE')).toBeUndefined();
  });
});

describe('compound incidents', () => {
  it('rating and support take extra penalty on the 3rd incident within 60s', () => {
    const sim = makeSim();
    sim.timeSec = 100;
    sim.recentIncidentTimes = [50, 90]; // two prior incidents within 60s
    const ratingBefore = sim.rating;
    const supportBefore = sim.supportLoad;
    force(sim, 'TRAFFIC_SPIKE');
    // compound penalty = (3-2)*0.04 = 0.04; extra support = 3*2 = 6
    expect(sim.rating).toBeLessThanOrEqual(ratingBefore - 0.04);
    expect(sim.supportLoad).toBeGreaterThan(supportBefore + 6);
  });

  it('old incident timestamps expire after 60s (no compound penalty)', () => {
    const sim = makeSim();
    sim.timeSec = 100;
    sim.recentIncidentTimes = [30, 35]; // both >60s old relative to 100
    const ratingBefore = sim.rating;
    force(sim, 'TRAFFIC_SPIKE');
    // Only this incident remains in recentIncidentTimes (length=1, no compound).
    expect(sim.rating).toBe(ratingBefore);
    expect(sim.recentIncidentTimes.length).toBe(1);
  });
});

describe('REGION_OUTAGE freeze expiry', () => {
  it('frozen region thaws after ~60 tickRegMatrix calls when compliance stays high', () => {
    const sim = makeSim();
    // Raise all regions above the 55 threshold so tickRegMatrix does not
    // re-arm the freeze (sim.ts:1131).
    for (const r of sim.regions) r.compliance = 90;
    force(sim, 'REGION_OUTAGE');
    const frozenIdx = sim.regions.findIndex((r: any) => r.frozenSec >= 60);
    expect(frozenIdx).toBeGreaterThanOrEqual(0);
    // Drive only RegMatrix, not the full tick loop, to isolate freeze decay.
    for (let i = 0; i < 60; i++) sim.tickRegMatrix();
    expect(sim.regions[frozenIdx].frozenSec).toBe(0);
  });
});

describe('mitigation gating smoke test', () => {
  it('a fully mitigated sim survives each incident kind with rating near 5.0', () => {
    const sim = makeSim();
    for (const [type, tier] of [
      ['ABUSE', 2], ['OBS', 2], ['PINNING', 2], ['AUTH', 2],
      ['SANITIZER', 2], ['A11Y', 2], ['KEYSTORE', 2], ['FLAGS', 2],
      ['CACHE', 2], ['UI', 1], ['VM', 1], ['DOMAIN', 1],
      ['BILLING', 2], ['PUSH', 2], ['DEEPLINK', 2],
    ] as Array<[ComponentType, 1 | 2 | 3]>) {
      setTier(sim, type, tier);
    }
    for (const kind of Object.keys(ROLL)) {
      // Space out each incident past the 60s compound window so we isolate
      // per-handler mitigation behavior, not stacked compound penalties.
      sim.timeSec += 120;
      sim.lastEventAt = -1000;
      force(sim, kind as keyof typeof ROLL, [0.5, 0.5, 0.5, 0.5]);
    }
    // A fully mitigated run should not drop far below 5 stars even across all incidents.
    expect(sim.rating).toBeGreaterThanOrEqual(4.6);
  });
});
