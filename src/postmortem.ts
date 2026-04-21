/**
 * Postmortem grader.
 *
 * Reads the structured SimEvent stream produced during a run and emits a
 * qualitative grade letter plus 2–4 human-readable callouts. No new logging
 * surface is introduced; grading is a pure read over existing events.
 */

import type { TicketKind, RunResult } from './types';
import type { SimEvent } from './sim';

export type IncidentTiming = {
  kind: string;
  firedAtSec: number;
  mitigatedAtSec: number | null;
};

export type PostmortemGrade = {
  ttmSec: number;
  rootCauseAlignment: number; // 0..1
  preventionScore: number;    // 0..1
  letter: 'S' | 'A' | 'B' | 'C' | 'D';
  callouts: string[];
};

// Maps an incident message keyword to the ticket kind that represents
// "you actually addressed the root cause".
const INCIDENT_TO_TICKET: Array<[RegExp, TicketKind]> = [
  [/MITM/i, 'SECURITY_EXPOSURE'],
  [/IAP fraud/i, 'SECURITY_EXPOSURE'],
  [/SDK scandal|SDK issue/i, 'PRIVACY_COMPLAINTS'],
  [/Credential stuffing/i, 'SECURITY_EXPOSURE'],
  [/Session.*token/i, 'SECURITY_EXPOSURE'],
  [/A11y regression/i, 'A11Y_REGRESSION'],
  [/Memory leak/i, 'HEAP'],
  [/ANR escalation|ANR warning/i, 'ANR_RISK'],
  [/Push abuse/i, 'PRIVACY_COMPLAINTS'],
  [/Deep.link/i, 'SECURITY_EXPOSURE'],
  [/Cert rotated|Cert rotation/i, 'SECURITY_EXPOSURE'],
  [/Regional outage/i, 'COMPLIANCE_EU'],
];

function matchTicketKindForIncident(msg: string): TicketKind | null {
  for (const [re, kind] of INCIDENT_TO_TICKET) {
    if (re.test(msg)) return kind;
  }
  return null;
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

export function gradePostmortem(events: SimEvent[], run: RunResult): PostmortemGrade {
  const timings: IncidentTiming[] = [];
  for (const ev of events) {
    if (ev.type === 'EVENT' && ev.category === 'INCIDENT') {
      timings.push({ kind: ev.msg, firedAtSec: ev.atSec, mitigatedAtSec: null });
    }
    if (ev.type === 'TICKET_FIXED') {
      // Earliest unmatched incident whose ticket-kind matches gets mitigated here.
      for (const t of timings) {
        if (t.mitigatedAtSec !== null) continue;
        const expected = matchTicketKindForIncident(t.kind);
        if (expected && expected === ev.kind) {
          t.mitigatedAtSec = ev.atSec;
          break;
        }
      }
    }
  }

  const mitigated = timings.filter(t => t.mitigatedAtSec !== null);
  const ttmSec = mitigated.length === 0
    ? 0
    : mitigated.reduce((acc, t) => acc + (t.mitigatedAtSec! - t.firedAtSec), 0) / mitigated.length;

  const rootCauseAlignment = timings.length === 0
    ? 1
    : clamp(mitigated.length / timings.length, 0, 1);

  // Prevention: was the mitigating layer upgraded/purchased before the matching
  // incident hit? We proxy this via: of all incidents that fired, how many
  // found a component upgrade event *before* their fire time in the stream?
  const upgradeEvents = events.filter(ev => ev.type === 'PURCHASE' && ev.item === 'SHIELD');
  const prevented = timings.filter(t => upgradeEvents.some(u => u.atSec < t.firedAtSec)).length;
  const preventionScore = timings.length === 0
    ? 1
    : clamp(prevented / timings.length, 0, 1);

  const ttmScore = 1 - clamp(ttmSec / 120, 0, 1);
  const composite = 0.4 * preventionScore + 0.35 * rootCauseAlignment + 0.25 * ttmScore;

  const letter: PostmortemGrade['letter'] =
    composite > 0.85 ? 'S' :
    composite > 0.70 ? 'A' :
    composite > 0.50 ? 'B' :
    composite > 0.30 ? 'C' : 'D';

  const callouts: string[] = [];
  if (mitigated.length > 0) {
    const fastest = mitigated.reduce((best, t) => (t.mitigatedAtSec! - t.firedAtSec) < (best.mitigatedAtSec! - best.firedAtSec) ? t : best);
    const s = fastest.mitigatedAtSec! - fastest.firedAtSec;
    const label = fastest.kind.slice(0, 60);
    callouts.push(`Fast mitigation: ${label} in ${s}s.`);
  }
  if (timings.length === 0) {
    callouts.push('No incidents fired during the shift.');
  } else if (rootCauseAlignment < 0.5) {
    callouts.push(`Only ${mitigated.length}/${timings.length} incidents were root-caused during the shift.`);
  }
  if (run.rating >= 4.5) callouts.push(`Held rating at ${run.rating.toFixed(1)}★.`);
  if (run.architectureDebt === 0) callouts.push('Zero architecture debt at end of shift.');

  return {
    ttmSec,
    rootCauseAlignment,
    preventionScore,
    letter,
    callouts,
  };
}
