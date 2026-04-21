/**
 * Release Trains scenarios.
 *
 * A scenario pins seed + preset and injects a scripted incident timeline,
 * producing repeatable, interview-style drills. Scripted incidents fire at
 * exact seconds and bypass the weighted-roll dispatcher (so rand() call order
 * stays identical for the same scenario).
 */

import type { EvalPreset } from './types';

export type ScenarioIncidentKind =
  | 'TRAFFIC_SPIKE' | 'NET_WOBBLE' | 'OEM_RESTRICTION' | 'MITM' | 'CERT_ROTATION'
  | 'TOKEN_THEFT' | 'CRED_STUFFING' | 'DEEP_LINK_ABUSE' | 'A11Y_REGRESSION'
  | 'SDK_SCANDAL' | 'MEMORY_LEAK' | 'REGION_OUTAGE' | 'ANR_ESCALATION'
  | 'IAP_FRAUD' | 'PUSH_ABUSE' | 'DEEP_LINK_EXPLOIT';

export type ScenarioIncidentMarker = { atSec: number; kind: ScenarioIncidentKind };

export type ScenarioGoal =
  | { kind: 'RATING'; threshold: number }
  | { kind: 'COMPLIANCE'; region: 'EU' | 'US' | 'UK' | 'IN' | 'BR'; threshold: number }
  | { kind: 'ZERO_DEBT' }
  | { kind: 'NO_CRASH_TICKETS' };

export type ScenarioDef = {
  id: string;
  title: string;
  brief: string;
  seed: number;
  preset: EvalPreset;
  incidentScript: ScenarioIncidentMarker[];
  goal: ScenarioGoal;
  bonusMultiplier: number;
};

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'android-16-upgrade-week',
    title: 'Android 16 Upgrade Week',
    brief: 'A fresh API drop lands mid-shift, compat regressions follow, and a cert rotation compounds things. Hold rating ≥ 4.3 at end of shift.',
    seed: 0x16A0000 | 0,
    preset: 'SENIOR',
    incidentScript: [
      { atSec: 60,  kind: 'SDK_SCANDAL' },
      { atSec: 180, kind: 'CERT_ROTATION' },
      { atSec: 300, kind: 'A11Y_REGRESSION' },
      { atSec: 420, kind: 'MEMORY_LEAK' },
    ],
    goal: { kind: 'RATING', threshold: 4.3 },
    bonusMultiplier: 1.35,
  },
  {
    id: 'eu-dma-audit',
    title: 'EU DMA Audit',
    brief: 'A Digital Markets Act audit starts with pressure in EU and tightening across UK. Keep EU compliance at ≥ 80 to pass.',
    seed: 0xEDA0000 | 0,
    preset: 'STAFF',
    incidentScript: [
      { atSec: 90,  kind: 'REGION_OUTAGE' },
      { atSec: 210, kind: 'SDK_SCANDAL' },
      { atSec: 330, kind: 'PUSH_ABUSE' },
    ],
    goal: { kind: 'COMPLIANCE', region: 'EU', threshold: 80 },
    bonusMultiplier: 1.40,
  },
  {
    id: 'sdk-cascade-night',
    title: 'SDK Cascade Night',
    brief: 'Three 3rd-party SDKs leak trust in quick succession, then a memory leak locks up WorkManager. Close the shift with zero open crash tickets.',
    seed: 0xCAD0000 | 0,
    preset: 'PRINCIPAL',
    incidentScript: [
      { atSec: 90,  kind: 'SDK_SCANDAL' },
      { atSec: 180, kind: 'SDK_SCANDAL' },
      { atSec: 240, kind: 'MEMORY_LEAK' },
      { atSec: 300, kind: 'SDK_SCANDAL' },
    ],
    goal: { kind: 'NO_CRASH_TICKETS' },
    bonusMultiplier: 1.45,
  },
];

export function listScenarios(): ScenarioDef[] {
  return SCENARIOS.slice();
}

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find(s => s.id === id);
}

const SCENARIOS_KEY = 'asr:scenarios:v1';

export type ScenarioResult = {
  scenarioId: string;
  completed: boolean;
  finalScore: number;
  endedAtTs: number;
};

export function loadScenarioResults(): ScenarioResult[] {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScenarioResult(result: ScenarioResult): void {
  try {
    const existing = loadScenarioResults().filter(r => r.scenarioId !== result.scenarioId);
    const next = [result, ...existing].slice(0, 30);
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(next));
  } catch {
    // best effort
  }
}
