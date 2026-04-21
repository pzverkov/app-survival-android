import { describe, it, expect } from 'vitest';
import { tickPlatformPulse, tickCoverageGate, computeRegionTarget } from '../../src/subsystems';

describe('PlatformPulse', () => {
  it('decays old device share over time', () => {
    const platform = { latestApi: 37, minApi: 26, oldDeviceShare: 0.28, lowRamShare: 0.30, pressure: 0 };
    const result = tickPlatformPulse(platform, 1, () => 0.5);
    expect(result.platform.oldDeviceShare).toBeLessThan(0.28);
    expect(result.platform.lowRamShare).toBeLessThan(0.30);
  });

  it('triggers new API release at correct interval', () => {
    const platform = { latestApi: 37, minApi: 26, oldDeviceShare: 0.28, lowRamShare: 0.30, pressure: 0 };
    const result = tickPlatformPulse(platform, 180, () => 0.1); // rand < 0.35
    expect(result.newApiReleased).toBe(true);
    expect(result.platform.latestApi).toBe(38);
  });

  it('does not trigger API release when rand is high', () => {
    const platform = { latestApi: 37, minApi: 26, oldDeviceShare: 0.28, lowRamShare: 0.30, pressure: 0 };
    const result = tickPlatformPulse(platform, 180, () => 0.9);
    expect(result.newApiReleased).toBe(false);
  });
});

describe('CoverageGate', () => {
  it('decays coverage each tick', () => {
    const result = tickCoverageGate({
      coveragePct: 80,
      coverageHist: [80],
      lastCompCount: 5,
      componentCount: 5,
      preset: 'SENIOR',
      platformPressure: 0,
      regPressure: 0,
      qualityProcess: 0,
      coverageThreshold: 70,
      timeSec: 10,
    });
    expect(result.coveragePct).toBeLessThan(80);
    expect(result.belowThresholdTicket).toBe(false);
  });

  it('flags below-threshold', () => {
    const result = tickCoverageGate({
      coveragePct: 60,
      coverageHist: [60],
      lastCompCount: 0,
      componentCount: 0,
      preset: 'SENIOR',
      platformPressure: 0,
      regPressure: 0,
      qualityProcess: 0,
      coverageThreshold: 70,
      timeSec: 10,
    });
    expect(result.belowThresholdTicket).toBe(true);
  });

  it('applies component add tax', () => {
    const result = tickCoverageGate({
      coveragePct: 80,
      coverageHist: [80],
      lastCompCount: 3,
      componentCount: 6, // +3 added
      preset: 'SENIOR',
      platformPressure: 0,
      regPressure: 0,
      qualityProcess: 0,
      coverageThreshold: 70,
      timeSec: 10,
    });
    // 3 added * 0.55 tax = 1.65 drop + decay
    expect(result.coveragePct).toBeLessThan(78.35);
  });
});

describe('computeRegionTarget', () => {
  it('returns higher target for stable trust metrics', () => {
    const target = computeRegionTarget({
      code: 'US',
      privacyTrust: 100,
      securityPosture: 100,
      a11yScore: 100,
      flagsTier: 0,
      obsTier: 0,
      keystoreTier: 0,
      sanitizerTier: 0,
      platformPressure: 0,
    });
    expect(target).toBeGreaterThan(80);
  });

  it('EU has stricter privacy requirements', () => {
    const base = { privacyTrust: 80, securityPosture: 80, a11yScore: 80, flagsTier: 0, obsTier: 0, keystoreTier: 0, sanitizerTier: 0, platformPressure: 0 };
    const eu = computeRegionTarget({ ...base, code: 'EU' });
    const us = computeRegionTarget({ ...base, code: 'US' });
    // EU has stricter privacy (10 vs 2) but less security (4 vs 10)
    // Net: EU penalty = 14, US penalty = 12, so EU target should be lower
    expect(eu).toBeLessThan(us);
  });

  it('component tiers boost target', () => {
    const base = { code: 'US' as const, privacyTrust: 60, securityPosture: 60, a11yScore: 60, platformPressure: 0 };
    const without = computeRegionTarget({ ...base, flagsTier: 0, obsTier: 0, keystoreTier: 0, sanitizerTier: 0 });
    const withTiers = computeRegionTarget({ ...base, flagsTier: 1, obsTier: 1, keystoreTier: 1, sanitizerTier: 1 });
    expect(withTiers).toBeGreaterThan(without);
  });
});
