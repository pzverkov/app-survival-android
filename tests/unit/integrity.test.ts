import { describe, it, expect, beforeEach } from 'vitest';
import {
  deriveKey,
  signPayload,
  verifyPayload,
  markTampered,
  getTamperState,
  onTamperDetected,
  isScoreSane,
  _resetForTest,
} from '../../src/integrity';

beforeEach(() => {
  _resetForTest();
});

describe('HMAC sign / verify', () => {
  it('round-trips: sign then verify returns true', async () => {
    const key = await deriveKey('test-sha');
    const data = '{"score":42}';
    const sig = await signPayload(key, data);
    expect(await verifyPayload(key, data, sig)).toBe(true);
  });

  it('rejects modified data', async () => {
    const key = await deriveKey('test-sha');
    const sig = await signPayload(key, '{"score":42}');
    expect(await verifyPayload(key, '{"score":99}', sig)).toBe(false);
  });

  it('rejects wrong signature', async () => {
    const key = await deriveKey('test-sha');
    expect(await verifyPayload(key, '{"score":42}', 'deadbeef')).toBe(false);
  });
});

describe('deriveKey', () => {
  it('produces a CryptoKey', async () => {
    const key = await deriveKey('abc123');
    expect(key).toBeDefined();
    expect(key.algorithm).toMatchObject({ name: 'HMAC' });
  });

  it('different SHAs produce different signatures', async () => {
    const keyA = await deriveKey('sha-A');
    const keyB = await deriveKey('sha-B');
    const data = 'same-data';
    const sigA = await signPayload(keyA, data);
    const sigB = await signPayload(keyB, data);
    expect(sigA).not.toBe(sigB);
  });
});

describe('tamper flag', () => {
  it('starts untampered', () => {
    expect(getTamperState().tampered).toBe(false);
    expect(getTamperState().reason).toBeNull();
  });

  it('markTampered sets flag and reason', () => {
    markTampered('scoreboard');
    expect(getTamperState().tampered).toBe(true);
    expect(getTamperState().reason).toBe('scoreboard');
  });

  it('flag is sticky — second call does not override reason', () => {
    markTampered('scoreboard');
    markTampered('runtime');
    expect(getTamperState().reason).toBe('scoreboard');
  });

  it('onTamperDetected callback fires', () => {
    let called = false;
    onTamperDetected(() => { called = true; });
    markTampered('test');
    expect(called).toBe(true);
  });
});

describe('isScoreSane', () => {
  it('accepts legitimate scores', () => {
    // 300 seconds * 12 max/tick * 1.0 multiplier = 3600 max
    expect(isScoreSane(2000, 300, 1.0)).toBe(true);
  });

  it('accepts scores near the limit', () => {
    // 100s * 12 * 1.12 * 1.25 = 1680
    expect(isScoreSane(1680, 100, 1.12)).toBe(true);
  });

  it('rejects impossible scores', () => {
    // 60 seconds * 12 * 1.0 * 1.25 = 900 max
    expect(isScoreSane(50000, 60, 1.0)).toBe(false);
  });

  it('rejects score of 10000 in 10 seconds', () => {
    // 10 * 12 * 1.0 * 1.25 = 150 max
    expect(isScoreSane(10000, 10, 1.0)).toBe(false);
  });
});
