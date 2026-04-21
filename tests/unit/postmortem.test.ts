import { describe, it, expect } from 'vitest';
import { gradePostmortem } from '../../src/postmortem';
import type { RunResult } from '../../src/types';

function run(reason: RunResult['endReason'] = 'SHIFT_COMPLETE', overrides: Partial<RunResult> = {}): RunResult {
  return {
    runId: '1',
    seed: 1,
    preset: 'SENIOR',
    endReason: reason,
    endedAtTs: 0,
    durationSec: 500,
    rawScore: 1000,
    finalScore: 1200,
    multiplier: 1.2,
    bonuses: [],
    rating: 4.6,
    budget: 1500,
    failureRate: 0.01,
    anrRisk: 0.05,
    p95LatencyMs: 120,
    jankPct: 5,
    heapMb: 120,
    architectureDebt: 0,
    ticketsOpen: 0,
    summaryLines: [],
    ...overrides,
  };
}

describe('gradePostmortem', () => {
  it('no incidents → S-grade by default', () => {
    const g = gradePostmortem([], run());
    expect(g.letter).toBe('S');
    expect(g.callouts.some(c => /No incidents fired/i.test(c))).toBe(true);
  });

  it('root-cause match lowers TTM and raises the grade', () => {
    const events = [
      { type: 'EVENT' as const, atSec: 30, category: 'INCIDENT' as const, msg: 'MITM attempt: user trust took a hit (add TLS pinning).' },
      { type: 'TICKET_FIXED' as const, atSec: 50, kind: 'SECURITY_EXPOSURE' as const, effort: 6 },
    ];
    const g = gradePostmortem(events, run());
    expect(g.rootCauseAlignment).toBe(1);
    expect(g.ttmSec).toBe(20);
    // Without a pre-incident shield purchase in the stream, prevention is 0;
    // composite lands in the B/C range with a perfect root-cause + fast TTM.
    expect(['S', 'A', 'B']).toContain(g.letter);
  });

  it('unmitigated incidents drag the grade down', () => {
    const events = [
      { type: 'EVENT' as const, atSec: 30, category: 'INCIDENT' as const, msg: 'MITM attempt: user trust took a hit.' },
      { type: 'EVENT' as const, atSec: 120, category: 'INCIDENT' as const, msg: 'Memory leak detected: heap growing.' },
      { type: 'EVENT' as const, atSec: 240, category: 'INCIDENT' as const, msg: 'A11y regression shipped.' },
    ];
    const g = gradePostmortem(events, run());
    expect(g.rootCauseAlignment).toBe(0);
    expect(['C', 'D']).toContain(g.letter);
  });

  it('callouts include a fast-mitigation highlight when applicable', () => {
    const events = [
      { type: 'EVENT' as const, atSec: 30, category: 'INCIDENT' as const, msg: 'MITM attempt: user trust took a hit.' },
      { type: 'TICKET_FIXED' as const, atSec: 45, kind: 'SECURITY_EXPOSURE' as const, effort: 6 },
    ];
    const g = gradePostmortem(events, run());
    expect(g.callouts.some(c => /Fast mitigation/i.test(c))).toBe(true);
  });
});
