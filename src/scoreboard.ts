import type { ScoreEntry } from './types';

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

export function addScoreEntry(entry: ScoreEntry): ScoreEntry[] {
  const cur = loadScoreboard();
  // De-dupe by runId.
  const filtered = cur.filter(e => e.runId !== entry.runId);
  const next = [entry, ...filtered]
    .sort((a, b) => (b.finalScore - a.finalScore) || (b.durationSec - a.durationSec) || (b.endedAtTs - a.endedAtTs))
    .slice(0, MAX);
  saveScoreboard(next);
  return next;
}

export function clearScoreboard(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
