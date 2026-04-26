/**
 * Extracted simulation subsystem logic.
 *
 * Each function takes a read-only view of the state it needs and returns
 * a mutation descriptor. GameSim remains the orchestrator that applies
 * mutations and owns all mutable state.
 */

import type { PlatformState, RegionCode, EvalPreset, TicketKind, TicketSeverity } from './types';

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
// Staggered rollout phase (Android Play Console-style 10% / 50% / 100%)
// ---------------------------------------------------------------------------

export type RolloutPhase = 0 | 1 | 2 | 3;

export type RolloutInput = {
  phase: RolloutPhase;
  timeSec: number;
  qualityProcess: number; // 0..1 — higher = faster promotion
  newApiReleased: boolean; // resets phase to 0 (closed beta)
};

export function tickRolloutPhase(input: RolloutInput): { phase: RolloutPhase; pressureAmplifier: number } {
  let phase: RolloutPhase = input.phase;
  if (input.newApiReleased) {
    // Closed beta buffer; no promotion this tick.
    phase = 0;
    return { phase, pressureAmplifier: 0.25 };
  }
  // Promote one step every 60s once qualityProcess clears the bar for that step.
  if (input.timeSec > 0 && input.timeSec % 60 === 0 && phase < 3) {
    const bars = [0.0, 0.25, 0.50];
    if (input.qualityProcess >= bars[phase]!) phase = (phase + 1) as RolloutPhase;
  }
  // Pressure amplifier: closed beta (0) shields the population; 100% (3) fully
  // exposes it. Mid-phases attenuate platform pressure proportionally.
  const pressureAmplifier = [0.25, 0.5, 0.8, 1.0][phase]!;
  return { phase, pressureAmplifier };
}

// ---------------------------------------------------------------------------
// RegMatrix cross-region coupling
// ---------------------------------------------------------------------------

export type RegionCouplingInput = {
  regions: Array<{ code: RegionCode; compliance: number }>;
};

/**
 * Models cross-region regulatory coupling: EU below 60 drags UK down (GDPR
 * mirror), US below 55 drags IN/BR down (dominant-market dependence).
 * Returns per-region extra decay values for the caller to apply this tick.
 */
export function applyRegionCoupling(input: RegionCouplingInput): Record<RegionCode, number> {
  const out: Record<RegionCode, number> = { EU: 0, US: 0, UK: 0, IN: 0, BR: 0, GLOBAL: 0 };
  const eu = input.regions.find(r => r.code === 'EU');
  const us = input.regions.find(r => r.code === 'US');
  if (eu && eu.compliance < 60) out.UK += 0.15;
  if (us && us.compliance < 55) { out.IN += 0.05; out.BR += 0.05; }
  return out;
}

// ---------------------------------------------------------------------------
// Android-native realism surfaces
// ---------------------------------------------------------------------------

/** Returns jank dampening and startup-ms delta when the Baseline Profile is shipped. */
export function tickBaselineProfile(input: { active: boolean; r8Enabled: boolean }): { jankDamp: number; startupDelta: number } {
  let jankDamp = 1.0;
  let startupDelta = 0;
  if (input.active) {
    jankDamp *= 0.85;
    startupDelta -= 80;
  }
  if (input.r8Enabled) {
    jankDamp *= 0.92;
    startupDelta -= 40;
  }
  return { jankDamp, startupDelta };
}

/** Play Integrity: passive gate that dampens credential-stuffing / IAP-fraud damage. */
export function tickPlayIntegrity(input: { abuseTier: number; authTier: number }): { active: boolean; damageScale: number } {
  const active = input.abuseTier >= 2 && input.authTier >= 2;
  return { active, damageScale: active ? 0.6 : 1.0 };
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
  /** Optional prior flaky-test rate, 0..1. */
  flakyTestRate?: number;
};

export type CoverageGateResult = {
  coveragePct: number;
  coverageHist: number[];
  lastCompCount: number;
  coverageRiskMult: number;
  belowThresholdTicket: boolean;
  regressionCrash: boolean;
  /** Updated flaky-test rate, 0..1. */
  flakyTestRate: number;
  /** True when the flaky suite masked a regression that slipped into prod. */
  flakyMaskedRegression: boolean;
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
  const p = PRESETS[input.preset] ?? PRESETS.SENIOR!;

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

  // Flaky-test rate drifts with complexity and is reduced by qualityProcess.
  // When the rate is high, the suite masks a regression even when coverage %
  // itself looks healthy — this rewards explicit investment in test quality.
  const prevFlaky = clamp(input.flakyTestRate ?? 0, 0, 1);
  const flakyDrift = (complexity - input.qualityProcess * 0.020);
  const flakyTestRate = clamp(prevFlaky + flakyDrift * 0.02, 0, 1);
  const flakyMaskedRegression = flakyTestRate > 0.10 && input.timeSec % 45 === 0;

  hist.push(coveragePct);
  if (hist.length > 90) hist.shift();

  return {
    coveragePct,
    coverageHist: hist,
    lastCompCount: input.componentCount,
    coverageRiskMult,
    belowThresholdTicket,
    regressionCrash,
    flakyTestRate,
    flakyMaskedRegression,
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
// CrossCheck: multi-signal corroboration gate for ticket generation
// ---------------------------------------------------------------------------

export type CrossCheckInput = {
  kind: TicketKind;
  severity: TicketSeverity;
  primarySignal: number; // 0..1 strength
  corroboratingSignals: Array<{ source: 'OBS' | 'COVERAGE' | 'REG' | 'TIME' | 'HEAP' | 'FAIL'; strength: number }>;
  obsTier: number;       // 0..3, lowers corroboration bar when >=2
  preset: EvalPreset;
  consecutiveTicks: number; // how many consecutive ticks the primary has been firing
};

export type CrossCheckResult = {
  fire: boolean;
  reason: string;
};

function debounceFor(preset: EvalPreset): number {
  if (preset === 'PRINCIPAL') return 1;
  if (preset === 'STAFF' || preset === 'SENIOR') return 2;
  return 3;
}

/**
 * Determines whether a candidate ticket should fire based on multi-signal corroboration.
 *
 * - Severity 3 (crash/ANR/security) fires on primary signal alone (safety escape hatch).
 * - Lower severity fires when corroborated by independent signals, or when the primary
 *   signal has been sustained for the preset-specific debounce window.
 * - OBS tier >= 2 lowers the required corroboration bar by 1 signal (rewards observability).
 *
 * Pure function: no rand() calls, fully deterministic given inputs.
 */
export function evaluateCrossCheck(input: CrossCheckInput): CrossCheckResult {
  const strong = input.corroboratingSignals.filter(s => s.strength >= 0.15);
  const obsBonus = input.obsTier >= 2 ? 1 : 0;

  if (input.severity >= 3) {
    return { fire: true, reason: `${input.kind}: severity-3 escape (primary=${input.primarySignal.toFixed(2)})` };
  }

  // With OBS >= 2, a single strong corroborator fires immediately.
  // Otherwise, we need either two strong corroborators or sustained repetition.
  const required = Math.max(1, 2 - obsBonus);
  const debounce = debounceFor(input.preset);
  const debounced = input.consecutiveTicks >= debounce;

  const corroborated = strong.length >= required;

  if (corroborated || debounced) {
    const parts: string[] = [
      `${input.kind}`,
      `primary ${input.primarySignal.toFixed(2)}`,
    ];
    if (strong.length) parts.push(`+${strong.length} signal${strong.length === 1 ? '' : 's'} (${strong.map(s => s.source).join(',')})`);
    if (debounced && !corroborated) parts.push(`${input.consecutiveTicks} ticks`);
    if (obsBonus) parts.push('OBS corroborated');
    return { fire: true, reason: parts.join(' ') };
  }

  return { fire: false, reason: `${input.kind}: awaiting corroboration (signals=${strong.length}/${required}, ticks=${input.consecutiveTicks}/${debounce})` };
}

// ---------------------------------------------------------------------------
// Shared utility
// ---------------------------------------------------------------------------

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
