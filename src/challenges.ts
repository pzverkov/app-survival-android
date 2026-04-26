/**
 * Daily and weekly challenge system.
 *
 * Challenges are deterministic per UTC date: everyone playing on the same day
 * gets the same seed and constraint. Weekly challenges rotate on Mondays.
 */

import type { EvalPreset, RunResult } from './types';

export type ChallengeConstraint =
  | 'NO_REFILLS'
  | 'NO_UPGRADES'
  | 'HIGH_RATING'
  | 'CLEAN_DESK'
  | 'SPEED_RUN'
  | 'LOW_BUDGET'
  | 'ZERO_DEBT';

export type ChallengeType = 'DAILY' | 'WEEKLY';

export type ChallengeDef = {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  constraint: ChallengeConstraint;
  seed: number;
  preset: EvalPreset;
  bonusMultiplier: number;
};

export type ChallengeResult = {
  challengeId: string;
  completed: boolean;
  finalScore: number;
  date: string; // YYYY-MM-DD
};

const DAILY_TEMPLATES: Array<{ constraint: ChallengeConstraint; title: string; description: string; preset: EvalPreset; bonus: number }> = [
  { constraint: 'NO_REFILLS', title: 'No Refills', description: 'Complete the shift without using any capacity refills.', preset: 'SENIOR', bonus: 1.20 },
  { constraint: 'HIGH_RATING', title: 'Five Stars', description: 'End the shift with rating >= 4.5.', preset: 'SENIOR', bonus: 1.15 },
  { constraint: 'CLEAN_DESK', title: 'Clean Desk', description: 'End the shift with zero open tickets.', preset: 'JUNIOR_MID', bonus: 1.25 },
  { constraint: 'LOW_BUDGET', title: 'Tight Budget', description: 'Complete the shift. Starting budget reduced to $1500.', preset: 'SENIOR', bonus: 1.30 },
  { constraint: 'ZERO_DEBT', title: 'Zero Debt', description: 'End the shift with architecture debt at 0.', preset: 'STAFF', bonus: 1.25 },
];

const WEEKLY_TEMPLATES: Array<{ constraint: ChallengeConstraint; title: string; description: string; preset: EvalPreset; bonus: number }> = [
  { constraint: 'NO_UPGRADES', title: 'Base Tier Only', description: 'Complete the shift without upgrading any component.', preset: 'SENIOR', bonus: 1.35 },
  { constraint: 'SPEED_RUN', title: 'Speed Run', description: 'Survive on Principal preset (8-minute shift).', preset: 'PRINCIPAL', bonus: 1.40 },
  { constraint: 'NO_REFILLS', title: 'Iron Will', description: 'Complete Staff preset with zero refills.', preset: 'STAFF', bonus: 1.35 },
];

function dateSeed(year: number, month: number, day: number): number {
  return ((year * 10000 + month * 100 + day) * 2654435761) >>> 0;
}

function weekNumber(d: Date): number {
  const start = new Date(d.getUTCFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

/** Get today's daily challenge (deterministic per UTC date). */
export function getDailyChallenge(): ChallengeDef {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const idx = (y * 366 + m * 31 + day) % DAILY_TEMPLATES.length;
  const tmpl = DAILY_TEMPLATES[idx]!;
  const seed = dateSeed(y, m, day);

  return {
    id: `daily-${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    type: 'DAILY',
    title: tmpl.title,
    description: tmpl.description,
    constraint: tmpl.constraint,
    seed,
    preset: tmpl.preset,
    bonusMultiplier: tmpl.bonus,
  };
}

/** Get this week's weekly challenge (rotates on Mondays). */
export function getWeeklyChallenge(): ChallengeDef {
  const d = new Date();
  const y = d.getUTCFullYear();
  const wk = weekNumber(d);
  const idx = (y * 53 + wk) % WEEKLY_TEMPLATES.length;
  const tmpl = WEEKLY_TEMPLATES[idx]!;
  const seed = dateSeed(y, wk, 0);

  return {
    id: `weekly-${y}-w${String(wk).padStart(2, '0')}`,
    type: 'WEEKLY',
    title: tmpl.title,
    description: tmpl.description,
    constraint: tmpl.constraint,
    seed,
    preset: tmpl.preset,
    bonusMultiplier: tmpl.bonus,
  };
}

/** Check if a completed run satisfies the challenge constraint. */
export function evaluateChallenge(challenge: ChallengeDef, run: RunResult, refillsUsed: number, upgradesUsed: number): ChallengeResult {
  const date = challenge.id.replace(/^(daily|weekly)-/, '');
  let completed = run.endReason === 'SHIFT_COMPLETE';

  if (completed) {
    switch (challenge.constraint) {
      case 'NO_REFILLS':
        completed = refillsUsed === 0;
        break;
      case 'NO_UPGRADES':
        completed = upgradesUsed === 0;
        break;
      case 'HIGH_RATING':
        completed = run.rating >= 4.5;
        break;
      case 'CLEAN_DESK':
        completed = run.ticketsOpen === 0;
        break;
      case 'SPEED_RUN':
        completed = true; // just surviving Principal is the challenge
        break;
      case 'LOW_BUDGET':
        completed = true; // constraint is applied at start (reduced budget)
        break;
      case 'ZERO_DEBT':
        completed = Math.round(run.architectureDebt) === 0;
        break;
    }
  }

  return {
    challengeId: challenge.id,
    completed,
    finalScore: completed ? Math.round(run.finalScore * challenge.bonusMultiplier) : run.finalScore,
    date,
  };
}

// --- Persistence ---

const CHALLENGE_KEY = 'asr:challenges:v1';

export function loadChallengeResults(): ChallengeResult[] {
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChallengeResult(result: ChallengeResult): void {
  try {
    const existing = loadChallengeResults();
    const filtered = existing.filter(r => r.challengeId !== result.challengeId);
    const next = [result, ...filtered].slice(0, 50);
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
