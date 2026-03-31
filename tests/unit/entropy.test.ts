import { describe, it, expect } from 'vitest';
import { entropyPool } from '../../src/entropy';

describe('entropyPool', () => {
  it('seed() returns a uint32 number', () => {
    const s = entropyPool.seed();
    expect(typeof s).toBe('number');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(s)).toBe(true);
  });

  it('feeding different data produces different seeds', () => {
    entropyPool.feed(111);
    const s1 = entropyPool.seed();
    entropyPool.feed(999);
    const s2 = entropyPool.seed();
    expect(s1).not.toBe(s2);
  });

  it('seed() returns non-zero values', () => {
    entropyPool.feed(42);
    const s = entropyPool.seed();
    expect(s).not.toBe(0);
  });
});
