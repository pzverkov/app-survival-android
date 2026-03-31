import type { ScoreEntry } from './types';
import { sealStorageKey, verifyStorageKey } from './integrity';

const KEY = 'asr:scoreboard:v1';
const MAX = 20;

export function loadScoreboard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ScoreEntry[];
  } catch {
    return [];
  }
}

export function saveScoreboard(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // ignore (private browsing / quota)
  }
}

export export function addScoreEntry(entry: ScoreEntry): ScoreEntry[] {
  const cur = loadScoreboard();
  const filtered = cur.filter(e => e.runId !== entry.runId);
  let comboMultiplier = 1;
  let streakBonus = 0;
  let fastResponseBonus = 0;
  let preventiveMaintenanceBonus = 0;
  let strategicLinkingBonus = 0;
  if (entry.comboCount >= 3 && entry.comboTime <= 60) comboMultiplier = 1.2;
  if (entry.comboCount >= 5 && entry.comboTime <= 90) comboMultiplier = 1.35;
  if (entry.fastResponseTime <= 15) fastResponseBonus = 50;
  if (entry.preventiveMaintenance) preventiveMaintenanceBonus = 5;
  if (entry.strategicLinking) strategicLinkingBonus = 100;
  const streak = getStreak();
  if (streak > 0) streakBonus = streak * 0.05;
  entry.finalScore = entry.baseScore * comboMultiplier + streakBonus + fastResponseBonus + preventiveMaintenanceBonus + strategicLinkingBonus;
  const next = [entry, ...filtered]
    .sort((a, b) => (b.finalScore - a.finalScore) || (b.durationSec - a.durationSec) || (b.endedAtTs - a.endedAtTs))
    .slice(0, MAX);
  saveScoreboard(next);
  updateStreak(streak + 1);
  return next;
}

function getStreak(): number {
  const streak = localStorage.getItem('streak');
  return streak ? parseInt(streak) : 0;
}

function updateStreak(streak: number): void {
  localStorage.setItem('streak', streak.toString());
}

export function clearScoreboard(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY + ':sig');
  } catch {
    // ignore
  }
}

export async function sealScoreboard(key: CryptoKey): Promise<void> {
  return sealStorageKey(KEY, key);
}

export async function verifyScoreboard(key: CryptoKey): Promise<boolean | null> {
  return verifyStorageKey(KEY, key);
}
