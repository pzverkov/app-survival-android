/**
 * Passive entropy collector for seed generation.
 *
 * Gathers timing and positional data from user interactions (mouse, keyboard,
 * touch) and mixes them into a 32-bit hash. Used as a higher-quality default
 * seed when the user does not provide one manually.
 */

const TARGET_SAMPLES = 64;

class EntropyPool {
  private hash = 0x811c9dc5; // FNV offset basis
  private samples = 0;
  private listening = false;

  constructor() {
    if (typeof window !== 'undefined') this.startListening();
  }

  private mix(value: number): void {
    // FNV-1a-inspired mixing: XOR then multiply.
    this.hash ^= value & 0xff;
    this.hash = Math.imul(this.hash, 0x01000193) >>> 0;
    this.hash ^= (value >>> 8) & 0xff;
    this.hash = Math.imul(this.hash, 0x01000193) >>> 0;
    this.samples++;
    if (this.samples >= TARGET_SAMPLES) this.stopListening();
  }

  private onMouse = (e: MouseEvent): void => {
    this.mix(e.clientX ^ (e.clientY << 16));
    this.mix(e.timeStamp * 1000);
  };

  private onKey = (e: KeyboardEvent): void => {
    this.mix(e.keyCode ^ (e.timeStamp * 1000));
  };

  private onPointer = (e: PointerEvent): void => {
    this.mix(e.clientX ^ (e.clientY << 16));
    this.mix(e.timeStamp * 1000);
  };

  private startListening(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('mousemove', this.onMouse, { passive: true });
    window.addEventListener('keydown', this.onKey, { passive: true });
    window.addEventListener('pointerdown', this.onPointer, { passive: true });
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener('mousemove', this.onMouse);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointerdown', this.onPointer);
  }

  /** Feed arbitrary numeric data into the pool (useful for testing). */
  feed(value: number): void {
    this.mix(value);
  }

  /** Derive a uint32 seed from the collected entropy. Falls back to Date.now() if no events were collected. */
  seed(): number {
    if (this.samples === 0) {
      return (Date.now() & 0xffffffff) >>> 0;
    }
    // Final avalanche: mix in current time for extra uniqueness per call.
    let h = this.hash ^ ((Date.now() & 0xffff) * 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }
}

export const entropyPool = new EntropyPool();
