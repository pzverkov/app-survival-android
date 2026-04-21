import { describe, it, expect } from 'vitest';
import { evaluateCrossCheck } from '../../src/subsystems';

// Unit tests for the cross-check ticket gate.
//
// The gate is a pure function that decides whether a candidate ticket should
// fire based on primary signal strength, corroboration from independent signals,
// OBS tier discount, and debounce windows keyed to the evaluation preset.

describe('evaluateCrossCheck', () => {
  it('severity-3 escape fires unconditionally on primary signal alone', () => {
    const r = evaluateCrossCheck({
      kind: 'CRASH_SPIKE',
      severity: 3,
      primarySignal: 0.12,
      corroboratingSignals: [],
      obsTier: 0,
      preset: 'SENIOR',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(true);
    expect(r.reason).toMatch(/severity-3/);
  });

  it('severity-2 without corroboration fires after debounce window (SENIOR=2)', () => {
    const input = {
      kind: 'JANK' as const,
      severity: 2 as const,
      primarySignal: 0.30,
      corroboratingSignals: [],
      obsTier: 0,
      preset: 'SENIOR' as const,
    };
    expect(evaluateCrossCheck({ ...input, consecutiveTicks: 1 }).fire).toBe(false);
    expect(evaluateCrossCheck({ ...input, consecutiveTicks: 2 }).fire).toBe(true);
  });

  it('PRINCIPAL preset has the tightest debounce (1 tick)', () => {
    const r = evaluateCrossCheck({
      kind: 'JANK',
      severity: 2,
      primarySignal: 0.30,
      corroboratingSignals: [],
      obsTier: 0,
      preset: 'PRINCIPAL',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(true);
  });

  it('JUNIOR_MID preset requires 3 sustained ticks', () => {
    const input = {
      kind: 'JANK' as const,
      severity: 2 as const,
      primarySignal: 0.30,
      corroboratingSignals: [],
      obsTier: 0,
      preset: 'JUNIOR_MID' as const,
    };
    expect(evaluateCrossCheck({ ...input, consecutiveTicks: 2 }).fire).toBe(false);
    expect(evaluateCrossCheck({ ...input, consecutiveTicks: 3 }).fire).toBe(true);
  });

  it('OBS tier 2 lowers the corroboration bar (single strong signal fires immediately)', () => {
    const r = evaluateCrossCheck({
      kind: 'PRIVACY_COMPLAINTS',
      severity: 2,
      primarySignal: 0.30,
      corroboratingSignals: [{ source: 'REG', strength: 0.5 }],
      obsTier: 2,
      preset: 'SENIOR',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(true);
    expect(r.reason).toMatch(/OBS/);
  });

  it('OBS tier 0 with single signal must still wait for debounce', () => {
    const r = evaluateCrossCheck({
      kind: 'PRIVACY_COMPLAINTS',
      severity: 2,
      primarySignal: 0.30,
      corroboratingSignals: [{ source: 'REG', strength: 0.5 }],
      obsTier: 0,
      preset: 'SENIOR',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(false);
  });

  it('two strong corroborating signals fire immediately', () => {
    const r = evaluateCrossCheck({
      kind: 'PRIVACY_COMPLAINTS',
      severity: 2,
      primarySignal: 0.30,
      corroboratingSignals: [
        { source: 'REG', strength: 0.5 },
        { source: 'OBS', strength: 0.5 },
      ],
      obsTier: 0,
      preset: 'SENIOR',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(true);
  });

  it('weak signals (strength < 0.15) do not count as corroboration', () => {
    const r = evaluateCrossCheck({
      kind: 'PRIVACY_COMPLAINTS',
      severity: 2,
      primarySignal: 0.30,
      corroboratingSignals: [
        { source: 'REG', strength: 0.05 },
        { source: 'OBS', strength: 0.10 },
      ],
      obsTier: 0,
      preset: 'SENIOR',
      consecutiveTicks: 1,
    });
    expect(r.fire).toBe(false);
  });
});
