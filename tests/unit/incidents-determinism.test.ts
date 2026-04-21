import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

// Regression guard for the maybeIncident dispatcher.
//
// The incident-pick logic consumes one rand() for the cooldown gate and
// a second for the weighted roll; several handlers then consume more for
// damage magnitudes. Any change to that call order will cascade through
// the RNG sequence and alter downstream state.
//
// This snapshot captures a deterministic fingerprint of sim state after
// a fixed number of ticks under a known seed. If you touch maybeIncident
// and this test fails, your refactor changed observable behavior or the
// rand() call order. Re-derive the snapshot only if the change is intentional.
describe('incident dispatcher determinism', () => {
  it('produces a stable state fingerprint after 600 ticks (seed 12345)', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 12345 });
    sim.running = true;

    for (let i = 0; i < 600; i++) sim.tick();

    const fp = {
      timeSec: sim.timeSec,
      rating: +sim.rating.toFixed(4),
      budget: sim.budget,
      supportLoad: +sim.supportLoad.toFixed(4),
      privacyTrust: +sim.privacyTrust.toFixed(4),
      securityPosture: +sim.securityPosture.toFixed(4),
      a11yScore: +sim.a11yScore.toFixed(4),
      spawnMul: +sim.spawnMul.toFixed(4),
      netBadness: +sim.netBadness.toFixed(4),
      workRestriction: +sim.workRestriction.toFixed(4),
      heapMb: +sim.heapMb.toFixed(2),
      anrPoints: +sim.anrPoints.toFixed(2),
      ticketKinds: sim.tickets.map((t: any) => t.kind).sort().join(','),
      regionFrozen: sim.regions.map((r: any) => r.frozenSec).join(','),
      regionCompliance: sim.regions.map((r: any) => Math.round(r.compliance)).join(','),
      incidentCount: sim.incidentCount,
    };

    expect(fp).toMatchInlineSnapshot(`
      {
        "a11yScore": 65.9945,
        "anrPoints": 21.6,
        "budget": 2289.416666666666,
        "heapMb": 209.85,
        "incidentCount": 0,
        "netBadness": 0.5274,
        "privacyTrust": 61.1575,
        "rating": 1,
        "regionCompliance": "43,45,45,47,45",
        "regionFrozen": "44,44,44,44,44",
        "securityPosture": 37.3524,
        "spawnMul": 0.6649,
        "supportLoad": 100,
        "ticketKinds": "A11Y_REGRESSION,ANR_RISK,ARCHITECTURE_DEBT,COMPAT_ANDROID,COMPLIANCE_EU,COMPLIANCE_UK,COMPLIANCE_US,JANK,PRIVACY_COMPLAINTS,SECURITY_EXPOSURE,TEST_COVERAGE",
        "timeSec": 600,
        "workRestriction": 1,
      }
    `);
  });
});
