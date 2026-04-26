/**
 * On-call capacity / burnout model.
 *
 * The current sim uses a single capacity pool. Rather than a disruptive split
 * into oncall/feature pools (which would touch every shop affordance), v0.3.0
 * adds a burnout layer on top: when capacity hits zero repeatedly, the team
 * accrues burnout which saps regen and can spawn a BURNOUT ticket. Fixing it
 * restores regen — making incident-heavy runs force a real triage decision.
 */

import type { TicketKind } from './types';

export type BurnoutInput = {
  capacityCur: number;
  timeSec: number;
  zeroHitTimesSec: number[]; // rolling window of times capacity hit 0
  burnoutLevel: number;      // 0..1
  hasBurnoutTicket: boolean;
};

export type BurnoutResult = {
  zeroHitTimesSec: number[];
  burnoutLevel: number;
  createBurnoutTicket: boolean;
  regenPenalty: number; // fraction subtracted from regen/s, e.g. 0.10
};

/** Window (seconds) within which repeated cap-0 hits compound into burnout. */
const WINDOW_SEC = 90;

export function tickBurnout(input: BurnoutInput): BurnoutResult {
  const zeroHits = input.zeroHitTimesSec.filter(t => input.timeSec - t < WINDOW_SEC);
  if (input.capacityCur <= 0 && (zeroHits.length === 0 || input.timeSec - zeroHits[zeroHits.length - 1]! >= 5)) {
    zeroHits.push(input.timeSec);
  }

  let burnoutLevel = input.burnoutLevel;
  if (zeroHits.length >= 3 && !input.hasBurnoutTicket) {
    burnoutLevel = Math.min(1, burnoutLevel + 0.2);
  } else {
    // Slowly relax when not under pressure.
    burnoutLevel = Math.max(0, burnoutLevel - 0.001);
  }

  const createBurnoutTicket = burnoutLevel >= 0.5 && !input.hasBurnoutTicket;
  const regenPenalty = input.hasBurnoutTicket ? 0.10 : 0;

  return { zeroHitTimesSec: zeroHits, burnoutLevel, createBurnoutTicket, regenPenalty };
}

export function ticketDrainsOnCall(kind: TicketKind): boolean {
  // For the purpose of classification (UI / postmortem).
  return (
    kind === 'CRASH_SPIKE' || kind === 'ANR_RISK' || kind === 'JANK' ||
    kind === 'HEAP' || kind === 'SECURITY_EXPOSURE' || kind === 'BURNOUT' ||
    kind === 'COMPLIANCE_EU' || kind === 'COMPLIANCE_US' || kind === 'COMPLIANCE_UK'
  );
}
