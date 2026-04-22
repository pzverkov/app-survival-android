// Lazy wrapper around AchievementsTracker. Lives in its own module so
// main.ts never statically imports the achievements chunk, yet the stub
// keeps a stable surface for the hot UI path (setPreset / getProgress /
// getShopUnlocks / getViewsForPreset / onEvents). Events that land before
// the real tracker attaches are queued and replayed on attachReal() so no
// unlocks are lost during the warm-up window.
import type {
  AchievementsTracker,
  AchEvent,
  AchievementUnlock,
  AchievementView,
} from './achievements';
import { EVAL_PRESET, type EvalPreset } from './types';

export class AchStub {
  private preset: EvalPreset = EVAL_PRESET.SENIOR;
  private queued: AchEvent[] = [];
  private real: AchievementsTracker | null = null;
  private readyListeners: Array<(unlocked: AchievementUnlock[]) => void> = [];

  setPreset(p: EvalPreset): void {
    this.preset = p;
    if (this.real) this.real.setPreset(p);
  }

  getPreset(): EvalPreset {
    return this.preset;
  }

  onEvents(events: AchEvent[]): AchievementUnlock[] {
    if (this.real) return this.real.onEvents(events);
    this.queued.push(...events);
    return [];
  }

  getProgress(p: EvalPreset): { unlocked: number; total: number; bestSurvivalSec: number } {
    if (this.real) return this.real.getProgress(p);
    return { unlocked: 0, total: 0, bestSurvivalSec: 0 };
  }

  getShopUnlocks(p: EvalPreset): { booster: boolean; shield: boolean } {
    if (this.real) return this.real.getShopUnlocks(p);
    return { booster: false, shield: false };
  }

  getViewsForPreset(p: EvalPreset): AchievementView[] {
    if (this.real) return this.real.getViewsForPreset(p);
    return [];
  }

  isReady(): boolean {
    return this.real !== null;
  }

  /** For tests only. */
  pendingCount(): number {
    return this.queued.length;
  }

  onReady(cb: (unlocked: AchievementUnlock[]) => void): void {
    if (this.real) cb([]);
    else this.readyListeners.push(cb);
  }

  attachReal(real: AchievementsTracker): AchievementUnlock[] {
    this.real = real;
    real.setPreset(this.preset);
    const replayed = this.queued.length ? real.onEvents(this.queued) : [];
    this.queued = [];
    for (const cb of this.readyListeners) cb(replayed);
    this.readyListeners = [];
    return replayed;
  }
}
