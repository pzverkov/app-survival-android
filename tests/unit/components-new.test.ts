import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { COMPONENT_TYPES } from '../../src/types';

describe('v0.3.0 new component types', () => {
  it('BILLING, PUSH, DEEPLINK are listed in COMPONENT_TYPES', () => {
    expect(COMPONENT_TYPES).toContain('BILLING');
    expect(COMPONENT_TYPES).toContain('PUSH');
    expect(COMPONENT_TYPES).toContain('DEEPLINK');
  });

  it('BILLING goes in the data layer (not a sidecar) and is addable', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    sim.budget = 500;
    const res = sim.addComponent('BILLING', 200, 200);
    expect(res.ok).toBe(true);
  });

  it('PUSH is addable and costs $80 base', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    const budgetBefore = sim.budget;
    const res = sim.addComponent('PUSH', 220, 220);
    expect(res.ok).toBe(true);
    expect(sim.budget).toBe(budgetBefore - 80);
  });

  it('DEEPLINK is sidecar-like (depending on it does not create arch debt)', () => {
    const sim: any = new GameSim();
    sim.reset({ width: 800, height: 600 }, { seed: 1 });
    // Add deeplink and link from UI to it. Sidecars are valid dependencies.
    const deep = sim.addComponent('DEEPLINK', 300, 300);
    const ui = sim.components.find((c: any) => c.type === 'UI');
    const debtBefore = sim.architectureDebt;
    sim.link(ui.id, deep.id!);
    expect(sim.architectureDebt).toBe(debtBefore);
  });
});
