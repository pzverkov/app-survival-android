/**
 * Extracted simulation subsystem logic.
 *
 * Each function takes a read-only view of the state it needs and returns
 * a mutation descriptor. GameSim remains the orchestrator that applies
 * mutations and owns all mutable state.
 */

import type { PlatformState, RegionCode, EvalPreset } from './types';

// ---------------------------------------------------------------------------
// PlatformPulse
// ---------------------------------------------------------------------------

export type PlatformPulseResult = {
  platform: PlatformState;
  newApiReleased: boolean;
  deprecationTicket: boolean;
};

export function tickPlatformPulse(
  platform: PlatformState,
  timeSec: number,
  randFn: () => number,
): PlatformPulseResult {
  const p = { ...platform };
  p.oldDeviceShare = clamp(p.oldDeviceShare - 0.00018, 0.06, 0.40);
  p.lowRamShare = clamp(p.lowRamShare - 0.00015, 0.08, 0.45);

  let newApiReleased = false;
  if (timeSec > 0 && timeSec % 180 === 0 && randFn() < 0.35) {
    p.latestApi += 1;
    p.pressure = clamp(p.pressure + 0.65, 0, 1);
    newApiReleased = true;
  }

  p.pressure = clamp(p.pressure * 0.985 - 0.0005, 0, 1);

  const deprecationTicket = (
    timeSec % 240 === 0 &&
    p.oldDeviceShare < 0.12 &&
    p.minApi < p.latestApi - 9
  );

  return { platform: p, newApiReleased, deprecationTicket };
}

// ---------------------------------------------------------------------------
// CoverageGate
// ---------------------------------------------------------------------------

export type CoverageGateInput = {
  coveragePct: number;
  coverageHist: number[];
  lastCompCount: number;
  componentCount: number;
  preset: EvalPreset;
  platformPressure: number;
  regPressure: number;
  qualityProcess: number;
  coverageThreshold: number;
  timeSec: number;
};

export type CoverageGateResult = {
  coveragePct: number;
  coverageHist: number[];
  lastCompCount: number;
  coverageRiskMult: number;
  belowThresholdTicket: boolean;
  regressionCrash: boolean;
};

export function tickCoverageGate(input: CoverageGateInput): CoverageGateResult {
  const hist = [...input.coverageHist];
  if (hist.length === 0) hist.push(input.coveragePct);
  if (hist.length > 90) hist.shift();
  const maxRecentBefore = Math.max(...hist);

  let coveragePct = input.coveragePct;
  const added = Math.max(0, input.componentCount - input.lastCompCount);

  const PRESETS: Record<string, { addTax: number; baseDecay: number; severityW: number }> = {
    JUNIOR_MID: { addTax: 0.35, baseDecay: 0.010, severityW: 0.55 },
    SENIOR:     { addTax: 0.55, baseDecay: 0.016, severityW: 1.0 },
    STAFF:      { addTax: 0.70, baseDecay: 0.022, severityW: 1.20 },
    PRINCIPAL:  { addTax: 0.85, baseDecay: 0.026, severityW: 1.35 },
  };
  const p = PRESETS[input.preset] ?? PRESETS.SENIOR;

  if (added > 0) coveragePct = clamp(coveragePct - added * p.addTax, 0, 100);

  const churn = input.platformPressure * 0.030 + (input.regPressure / 100) * 0.010;
  const complexity = clamp(input.componentCount / 30, 0, 1) * 0.020;
  const decay = (p.baseDecay + churn + complexity) * (1 - input.qualityProcess * 0.55);
  coveragePct = clamp(coveragePct - decay, 0, 100);

  const below = Math.max(0, input.coverageThreshold - coveragePct);
  const penalty = clamp(below / input.coverageThreshold, 0, 1) * p.severityW;
  const coverageRiskMult = 1 + penalty * 0.40;

  const belowThresholdTicket = coveragePct < input.coverageThreshold;

  const drop = maxRecentBefore - coveragePct;
  const regressionCrash = drop >= 10 && input.timeSec % 30 === 0;

  hist.push(coveragePct);
  if (hist.length > 90) hist.shift();

  return {
    coveragePct,
    coverageHist: hist,
    lastCompCount: input.componentCount,
    coverageRiskMult,
    belowThresholdTicket,
    regressionCrash,
  };
}

// ---------------------------------------------------------------------------
// RegMatrix: region target computation
// ---------------------------------------------------------------------------

export type RegionTargetInput = {
  code: RegionCode;
  privacyTrust: number;
  securityPosture: number;
  a11yScore: number;
  flagsTier: number;
  obsTier: number;
  keystoreTier: number;
  sanitizerTier: number;
  platformPressure: number;
};

export function computeRegionTarget(input: RegionTargetInput): number {
  const base = 0.45 * input.privacyTrust + 0.40 * input.securityPosture + 0.15 * input.a11yScore;

  let strictPrivacy = 0;
  let strictSecurity = 0;
  if (input.code === 'EU') { strictPrivacy = 10; strictSecurity = 4; }
  if (input.code === 'UK') { strictPrivacy = 8; strictSecurity = 4; }
  if (input.code === 'US') { strictPrivacy = 2; strictSecurity = 10; }
  if (input.code === 'IN') { strictPrivacy = 4; strictSecurity = 6; }
  if (input.code === 'BR') { strictPrivacy = 6; strictSecurity = 6; }

  const hasFlags = input.flagsTier >= 1 ? 1 : 0;
  const hasObs = input.obsTier >= 1 ? 1 : 0;
  const hasKeystore = input.keystoreTier >= 1 ? 1 : 0;
  const hasSan = input.sanitizerTier >= 1 ? 1 : 0;

  const controlBoost = 2.0 * hasFlags + 1.5 * hasObs + 2.0 * hasKeystore + 1.5 * hasSan;
  const platformPenalty = input.platformPressure * 8;

  return clamp(base + controlBoost - platformPenalty - strictPrivacy - strictSecurity, 35, 98);
}

// ---------------------------------------------------------------------------
// Shared utility
// ---------------------------------------------------------------------------

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
