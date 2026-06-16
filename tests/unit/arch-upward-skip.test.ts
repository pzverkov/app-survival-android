import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';

// A dependency can be both upward (depends on a higher layer) and span more than
// one layer. Both archLint and getArchViolations must reach the UPWARD_SKIP case;
// it used to be dead because `skip` was measured in the opposite direction to
// `upward`, so `upward && skip` was always false.
describe('architecture lint: upward + layer skip', () => {
  it('archLint scores an upward dependency that also skips layers as UPWARD_SKIP', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    // DB (data layer 4) depending on UI (layer 0): upward and spans >1 layer.
    const res = sim.archLint('DB', 'UI');
    expect(res.debtAdd).toBe(16); // 10 upward + 6 skip
    expect(res.reason).toContain('upward + layer skip');
  });

  it('getArchViolations flags it as UPWARD_SKIP with skip-weighted severity', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    const db = sim.components.find((c: any) => c.type === 'DB');
    const ui = sim.components.find((c: any) => c.type === 'UI');
    sim.link(db.id, ui.id);
    const v = sim.getArchViolations().find((x: any) => x.fromType === 'DB' && x.toType === 'UI');
    expect(v).toBeTruthy();
    expect(v.kind).toBe('UPWARD_SKIP');
    expect(v.severityScore).toBe(140); // 100 upward + |0-4|*10 skip
  });
});
