export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force into uint32.
    this.state = (seed >>> 0) || 0x12345678;
  }

  /** Returns a float in [0, 1). Deterministic for a given seed + call order. */
  next(): number {
    // mulberry32
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const out = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    // keep state as uint32
    this.state >>>= 0;
    return out;
  }

  int(minInclusive: number, maxInclusive: number): number {
    const a = Math.min(minInclusive, maxInclusive);
    const b = Math.max(minInclusive, maxInclusive);
    return a + Math.floor(this.next() * (b - a + 1));
  }

  pick<T>(arr: readonly T[]): T {
    if (!arr.length) throw new Error('Rng.pick: empty array');
    return arr[this.int(0, arr.length - 1)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
