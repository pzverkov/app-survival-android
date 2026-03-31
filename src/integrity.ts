const APP_SALT = 'asr:integrity:v1';
const VERSION_KEY = 'asr:integrity:version';
const CURRENT_VERSION = '1';

// ---------------------------------------------------------------------------
// Tamper flag (module-level singleton, sticky for session)
// ---------------------------------------------------------------------------

let tampered = false;
let tamperReason: string | null = null;
const listeners: Array<() => void> = [];

export function markTampered(reason: string): void {
  if (tampered) return;
  tampered = true;
  tamperReason = reason;
  for (const cb of listeners) cb();
}

export function getTamperState(): { tampered: boolean; reason: string | null } {
  return { tampered, reason: tamperReason };
}

export function onTamperDetected(cb: () => void): void {
  listeners.push(cb);
}

/** Reset tamper state — only for tests. */
export function _resetForTest(): void {
  tampered = false;
  tamperReason = null;
  listeners.length = 0;
}

// ---------------------------------------------------------------------------
// HMAC key derivation (Web Crypto)
// ---------------------------------------------------------------------------

export async function deriveKey(buildSha: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(APP_SALT + ':' + buildSha);
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

// ---------------------------------------------------------------------------
// HMAC sign / verify
// ---------------------------------------------------------------------------

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signPayload(key: CryptoKey, data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const sig = await crypto.subtle.sign('HMAC', key, encoded);
  return bufToHex(sig);
}

export async function verifyPayload(key: CryptoKey, data: string, sig: string): Promise<boolean> {
  const expected = await signPayload(key, data);
  if (expected.length !== sig.length) return false;
  // Constant-time-ish comparison (not security-critical, but good practice)
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// localStorage signature helpers
// ---------------------------------------------------------------------------

export async function sealStorageKey(lsKey: string, key: CryptoKey): Promise<void> {
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw === null) return;
    const sig = await signPayload(key, raw);
    localStorage.setItem(lsKey + ':sig', sig);
  } catch {
    // private browsing / quota — ignore
  }
}

/**
 * Verify a localStorage key against its companion :sig key.
 * Returns `true` (valid), `false` (tampered), or `null` (no data).
 */
export async function verifyStorageKey(lsKey: string, key: CryptoKey): Promise<boolean | null> {
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw === null) return null;
    const sig = localStorage.getItem(lsKey + ':sig');
    if (sig === null) return false; // data exists but no signature
    return verifyPayload(key, raw, sig);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Score sanity check
// ---------------------------------------------------------------------------

/** Max per-tick score is 12. Allow 25% tolerance for floating-point drift. */
export function isScoreSane(finalScore: number, durationSec: number, multiplier: number): boolean {
  const maxPossible = 12 * durationSec * multiplier * 1.25;
  return finalScore <= maxPossible;
}

// ---------------------------------------------------------------------------
// Migration: first load with integrity — seal existing data, don't flag
// ---------------------------------------------------------------------------

export function needsMigration(): boolean {
  try {
    return localStorage.getItem(VERSION_KEY) !== CURRENT_VERSION;
  } catch {
    return false;
  }
}

export function setMigrationDone(): void {
  try {
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  } catch {
    // ignore
  }
}
