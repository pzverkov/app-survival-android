import { EVAL_PRESET, EvalPreset, TicketKind } from './types';

export type AchievementId = string;

export type AchievementTier = 0 | 1 | 2 | 3; // 0=none, 1=bronze, 2=silver, 3=gold
export type AchievementTierLabel = 'BRONZE' | 'SILVER' | 'GOLD';

export type AchievementVisibility = 'PUBLIC' | 'HIDDEN';

export type AchEvent =
  | { type: 'RUN_START'; atSec: number; budget: number; architectureDebt: number }
  | { type: 'RUN_END'; atSec: number; reason: string }
  | { type: 'TICK'; atSec: number; backlog: number; rating: number; capacityCur: number; capacityMax: number; budget: number; architectureDebt: number; components: string[] }
  | { type: 'INCIDENT'; atSec: number; msg: string }
  | { type: 'TICKET_FIXED'; atSec: number; kind: TicketKind; effort: number }
  | { type: 'PURCHASE'; atSec: number; item: 'REFILL' | 'REGEN' | 'HIRE' | 'BOOSTER' | 'SHIELD' };

export type AchievementReward = {
  // Small nudges only. Rewards are intentionally modest to avoid "must-grind" meta.
  budget?: number;
  score?: number;
};

export type AchievementDef = {
  // Base track id (tiers are tracked per id).
  id: AchievementId;
  title: string;
  visibility: AchievementVisibility;
  // Which preset this achievement belongs to (exactly one bucket).
  bucket: EvalPreset;
  tiers: Array<{
    tier: 1 | 2 | 3;
    label: AchievementTierLabel;
    description: string;
    reward?: AchievementReward;
  }>;
};

export type AchievementView = {
  id: AchievementId;
  tier: AchievementTier;
  title: string;
  // Description shown in profile (revealed for hidden achievements once unlocked)
  description: string;
  visibility: AchievementVisibility;
  // Next tier hint (if any)
  next?: { label: AchievementTierLabel; description: string; reward?: AchievementReward };
};

export type AchievementUnlock = {
  id: AchievementId;
  title: string;
  tier: 1 | 2 | 3;
  label: AchievementTierLabel;
  description: string;
  reward?: AchievementReward;
};

export type AchPersisted = {
  tiers: Record<string, AchievementTier>;
  // Tiny stats to help achievements (and profile UI) stay deterministic.
  bestSurvivalSec?: number;
};

const STORAGE_PREFIX = 'survival.achievements.';

export interface AchStorage {
  load(key: string): string | null;
  save(key: string, value: string): void;
}

export class LocalStorageAchStorage implements AchStorage {
  load(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  save(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }
}

// Test-friendly storage (no DOM / localStorage required)
export class InMemoryAchStorage implements AchStorage {
  private m = new Map<string, string>();
  load(key: string): string | null {
    return this.m.get(key) ?? null;
  }
  save(key: string, value: string): void {
    this.m.set(key, value);
  }
}

function storageKey(preset: EvalPreset) {
  return `${STORAGE_PREFIX}${preset}`;
}

export function defaultPersisted(): AchPersisted {
  return { tiers: {}, bestSurvivalSec: 0 };
}

type LegacyPersisted = { unlocked?: Record<string, true>; bestSurvivalSec?: number };

function migrateLegacy(preset: EvalPreset, legacy: LegacyPersisted): AchPersisted {
  const tiers: Record<string, AchievementTier> = {};
  const u = legacy.unlocked ?? {};
  const best = Number.isFinite(legacy.bestSurvivalSec) ? Number(legacy.bestSurvivalSec) : 0;

  // Best-effort: map old (0.0.8) one-shot achievements into tiered tracks.
  const setMax = (id: string, tier: AchievementTier) => {
    const cur = tiers[id] ?? 0;
    tiers[id] = (Math.max(cur, tier) as AchievementTier);
  };

  if (preset === EVAL_PRESET.JUNIOR_MID) {
    if (u['J_FIRST_FIX']) setMax('JM_SHIP_IT', 1);
    if (u['J_SURVIVE_3M']) setMax('JM_SURVIVOR', 1);
    if (u['M_SURVIVE_5M']) setMax('JM_SURVIVOR', 2);
    if (u['M_NO_REFILL_4M']) setMax('JM_NO_REFILL', 1);
    if (u['J_FAST_RESPONSE']) setMax('JM_FAST_RESPONSE', 1);
    if (u['J_CLEAN_DESK']) setMax('JM_CLEAN_DESK', 1);
    if (u['M_BACKLOG_TAMER']) setMax('JM_BACKLOG_TAMER', 1);
    if (u['M_HIDDEN_PARANOID']) setMax('JM_TRUST_STACK', 1);
    if (best >= 420) setMax('JM_SURVIVOR', 3);
  }

  if (preset === EVAL_PRESET.SENIOR) {
    if (u['S_FIRST_FIX']) setMax('S_VELOCITY', 1);
    if (u['S_SURVIVE_7M']) setMax('S_SURVIVOR', 1);
    if (u['S_NO_REFILL_6M']) setMax('S_NO_REFILL', 1);
    if (u['S_STABLE_RATING']) setMax('S_STABLE_OPS', 1);
    if (best >= 540) setMax('S_SURVIVOR', 2);
    if (best >= 720) setMax('S_SURVIVOR', 3);
  }

  if (preset === EVAL_PRESET.STAFF) {
    if (u['ST_ARCH_DEBT_DROP']) setMax('ST_ARCH_SURGEON', 1);
    if (u['ST_HIDDEN_LEAN_RUN']) setMax('ST_LEAN_RUN', 1);
  }

  if (preset === EVAL_PRESET.PRINCIPAL) {
    if (u['P_MINIMAL_INTERVENTION']) setMax('P_MIN_INTERVENTION', 1);
    if (u['P_HIDDEN_BLACK_SWAN']) setMax('P_BLACK_SWAN', 1);
  }

  return { tiers, bestSurvivalSec: best };
}

export function loadPersisted(preset: EvalPreset, storage: AchStorage): AchPersisted {
  const raw = storage.load(storageKey(preset));
  if (!raw) return defaultPersisted();
  try {
    const parsed = JSON.parse(raw) as any;
    if (!parsed || typeof parsed !== 'object') return defaultPersisted();
    // New format
    if (parsed.tiers && typeof parsed.tiers === 'object') {
      return {
        tiers: { ...(parsed.tiers as Record<string, AchievementTier>) },
        bestSurvivalSec: Number.isFinite(parsed.bestSurvivalSec) ? parsed.bestSurvivalSec : 0,
      };
    }
    // Legacy format
    if (parsed.unlocked && typeof parsed.unlocked === 'object') {
      return migrateLegacy(preset, parsed as LegacyPersisted);
    }
    return defaultPersisted();
  } catch {
    return defaultPersisted();
  }
}

export function savePersisted(preset: EvalPreset, storage: AchStorage, data: AchPersisted) {
  storage.save(storageKey(preset), JSON.stringify(data));
}

// --- Catalog ----------------------------------------------------------------

// Tiered, anti-snowball design:
// - Bronze teaches the verb, silver/gold add constraints.
// - Unlocks reveal *options* (shop items) but do not grant permanent power.

export function achievementCatalog(): AchievementDef[] {
  return [
    // JUNIOR/MID (more tracks; learning loop)
    {
      id: 'JM_SHIP_IT',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'Ship It',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Fix 1 ticket in a run.', reward: { budget: 80 } },
        { tier: 2, label: 'SILVER', description: 'Fix 5 tickets in a run.', reward: { budget: 120 } },
        { tier: 3, label: 'GOLD', description: 'Fix 10 tickets in a run.', reward: { budget: 160 } },
      ],
    },
    {
      id: 'JM_SURVIVOR',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'Survivor',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 3 minutes.', reward: { budget: 120 } },
        { tier: 2, label: 'SILVER', description: 'Survive 5 minutes.', reward: { budget: 160 } },
        { tier: 3, label: 'GOLD', description: 'Survive 7 minutes.', reward: { budget: 220 } },
      ],
    },
    {
      id: 'JM_NO_REFILL',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'No Refill',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 4 minutes without buying a refill.', reward: { budget: 180 } },
        { tier: 2, label: 'SILVER', description: 'Survive 6 minutes without buying a refill.', reward: { budget: 240 } },
        { tier: 3, label: 'GOLD', description: 'Survive 8 minutes without buying a refill.', reward: { budget: 320 } },
      ],
    },
    {
      id: 'JM_FAST_RESPONSE',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'Fast Response',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Fix a ticket within 15s of an incident (1x).', reward: { budget: 120 } },
        { tier: 2, label: 'SILVER', description: 'Fix within 15s of an incident (2x in a run).', reward: { budget: 180 } },
        { tier: 3, label: 'GOLD', description: 'Fix within 15s of an incident (3x in a run).', reward: { budget: 240 } },
      ],
    },
    {
      id: 'JM_CLEAN_DESK',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'Clean Desk',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Keep backlog ≤2 for 30 seconds.', reward: { budget: 120 } },
        { tier: 2, label: 'SILVER', description: 'Keep backlog ≤2 for 60 seconds.', reward: { budget: 170 } },
        { tier: 3, label: 'GOLD', description: 'Keep backlog ≤2 for 90 seconds.', reward: { budget: 240 } },
      ],
    },
    {
      id: 'JM_BACKLOG_TAMER',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'PUBLIC',
      title: 'Backlog Tamer',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Reduce backlog from 8+ down to 4 or less.', reward: { budget: 160 } },
        { tier: 2, label: 'SILVER', description: 'Reduce backlog from 10+ down to 4 or less.', reward: { budget: 220 } },
        { tier: 3, label: 'GOLD', description: 'Reduce backlog from 12+ down to 3 or less.', reward: { budget: 300 } },
      ],
    },
    {
      id: 'JM_TRUST_STACK',
      bucket: EVAL_PRESET.JUNIOR_MID,
      visibility: 'HIDDEN',
      title: 'Trust Stack',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 5 minutes with all trust & security layers placed.', reward: { score: 250 } },
        { tier: 2, label: 'SILVER', description: 'Survive 7 minutes with all trust layers placed.', reward: { score: 380 } },
        { tier: 3, label: 'GOLD', description: 'Survive 10 minutes with all trust layers placed.', reward: { score: 520 } },
      ],
    },

    // SENIOR (fewer; constraints + consistency)
    {
      id: 'S_SURVIVOR',
      bucket: EVAL_PRESET.SENIOR,
      visibility: 'PUBLIC',
      title: 'Senior Stamina',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 7 minutes.', reward: { score: 200 } },
        { tier: 2, label: 'SILVER', description: 'Survive 9 minutes.', reward: { score: 320 } },
        { tier: 3, label: 'GOLD', description: 'Survive 12 minutes.', reward: { score: 460 } },
      ],
    },
    {
      id: 'S_NO_REFILL',
      bucket: EVAL_PRESET.SENIOR,
      visibility: 'PUBLIC',
      title: 'No Refill Run',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 6 minutes without buying a refill.', reward: { score: 260 } },
        { tier: 2, label: 'SILVER', description: 'Survive 8 minutes without buying a refill.', reward: { score: 360 } },
        { tier: 3, label: 'GOLD', description: 'Survive 10 minutes without buying a refill.', reward: { score: 520 } },
      ],
    },
    {
      id: 'S_STABLE_OPS',
      bucket: EVAL_PRESET.SENIOR,
      visibility: 'PUBLIC',
      title: 'Stable Ops',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Keep rating ≥4.6★ for 2 minutes.', reward: { score: 220 } },
        { tier: 2, label: 'SILVER', description: 'Keep rating ≥4.7★ for 2.5 minutes.', reward: { score: 340 } },
        { tier: 3, label: 'GOLD', description: 'Keep rating ≥4.8★ for 3 minutes.', reward: { score: 520 } },
      ],
    },
    {
      id: 'S_VELOCITY',
      bucket: EVAL_PRESET.SENIOR,
      visibility: 'PUBLIC',
      title: 'Velocity',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Fix 3 tickets in a run.', reward: { score: 120 } },
        { tier: 2, label: 'SILVER', description: 'Fix 9 tickets in a run.', reward: { score: 220 } },
        { tier: 3, label: 'GOLD', description: 'Fix 18 tickets in a run.', reward: { score: 420 } },
      ],
    },

    // STAFF
    {
      id: 'ST_ARCH_SURGEON',
      bucket: EVAL_PRESET.STAFF,
      visibility: 'PUBLIC',
      title: 'Architecture Surgeon',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Reduce architecture debt by 25+ in a run.', reward: { score: 320 } },
        { tier: 2, label: 'SILVER', description: 'Reduce architecture debt by 40+ in a run.', reward: { score: 520 } },
        { tier: 3, label: 'GOLD', description: 'Reduce architecture debt by 55+ in a run.', reward: { score: 820 } },
      ],
    },
    {
      id: 'ST_LEAN_RUN',
      bucket: EVAL_PRESET.STAFF,
      visibility: 'HIDDEN',
      title: 'Lean Run',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 8 minutes with 1 purchase or less.', reward: { score: 420 } },
        { tier: 2, label: 'SILVER', description: 'Survive 10 minutes with 1 purchase or less.', reward: { score: 650 } },
        { tier: 3, label: 'GOLD', description: 'Survive 12 minutes with 1 purchase or less.', reward: { score: 950 } },
      ],
    },

    // PRINCIPAL
    {
      id: 'P_MIN_INTERVENTION',
      bucket: EVAL_PRESET.PRINCIPAL,
      visibility: 'PUBLIC',
      title: 'Minimal Intervention',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 10 minutes with less than 2 refills.', reward: { score: 650 } },
        { tier: 2, label: 'SILVER', description: 'Survive 12 minutes with less than 2 refills.', reward: { score: 900 } },
        { tier: 3, label: 'GOLD', description: 'Survive 15 minutes with less than 1 refill.', reward: { score: 1300 } },
      ],
    },
    {
      id: 'P_BLACK_SWAN',
      bucket: EVAL_PRESET.PRINCIPAL,
      visibility: 'HIDDEN',
      title: 'Black Swan',
      tiers: [
        { tier: 1, label: 'BRONZE', description: 'Survive 10 minutes and fix 3 incident tickets within 20s.', reward: { score: 900 } },
        { tier: 2, label: 'SILVER', description: 'Survive 12 minutes and fix 4 incident tickets within 20s.', reward: { score: 1300 } },
        { tier: 3, label: 'GOLD', description: 'Survive 15 minutes and fix 5 incident tickets within 20s.', reward: { score: 1900 } },
      ],
    },
  ];
}

export function catalogForPreset(preset: EvalPreset): AchievementDef[] {
  return achievementCatalog().filter(a => a.bucket === preset);
}

export type ShopUnlocks = { booster: boolean; shield: boolean };

// --- Tracker ----------------------------------------------------------------

type Runtime = {
  running: boolean;
  runStartSec: number;
  lastIncidentAt: number;
  refillsThisRun: number;
  purchasesThisRun: number;
  ticketsFixedThisRun: number;
  fast15Count: number;
  fast20Count: number;
  maxBacklogThisRun: number;
  cleanDeskStartAt: number;
  stableRatingStartAt: number;
  maxDebtThisRun: number;
};

function freshRuntime(): Runtime {
  return {
    running: false,
    runStartSec: 0,
    lastIncidentAt: -1e9,
    refillsThisRun: 0,
    purchasesThisRun: 0,
    ticketsFixedThisRun: 0,
    fast15Count: 0,
    fast20Count: 0,
    maxBacklogThisRun: 0,
    cleanDeskStartAt: -1,
    stableRatingStartAt: -1,
    maxDebtThisRun: 0,
  };
}

function tierLabel(tier: 1 | 2 | 3): AchievementTierLabel {
  return tier === 1 ? 'BRONZE' : tier === 2 ? 'SILVER' : 'GOLD';
}

export class AchievementsTracker {
  private preset: EvalPreset;
  private storage: AchStorage;
  private persisted: AchPersisted;
  private runtime: Runtime = freshRuntime();

  constructor(preset: EvalPreset, storage: AchStorage) {
    this.preset = preset;
    this.storage = storage;
    this.persisted = loadPersisted(preset, storage);
  }

  setPreset(preset: EvalPreset) {
    savePersisted(this.preset, this.storage, this.persisted);
    this.preset = preset;
    this.persisted = loadPersisted(preset, this.storage);
    this.runtime = freshRuntime();
  }

  getPreset(): EvalPreset { return this.preset; }

  getTier(id: AchievementId): AchievementTier {
    return (this.persisted.tiers[id] ?? 0) as AchievementTier;
  }

  isUnlocked(id: AchievementId): boolean {
    return this.getTier(id) > 0;
  }

  getViewsForPreset(preset: EvalPreset): AchievementView[] {
    const defs = catalogForPreset(preset);
    const persisted = loadPersisted(preset, this.storage);

    return defs.map(d => {
      const tier = (persisted.tiers[d.id] ?? 0) as AchievementTier;
      const unlocked = tier > 0;

      if (!unlocked && d.visibility === 'HIDDEN') {
        return {
          id: d.id,
          tier,
          visibility: d.visibility,
          title: 'Hidden achievement',
          description: 'Keep playing to reveal this one.',
          next: { label: 'BRONZE', description: 'Keep playing to reveal this one.' },
        };
      }

      const currentTierDef = tier > 0 ? d.tiers.find(x => x.tier === tier) : d.tiers[0];
      const nextTier = (tier < 3 ? (tier + 1) : 0) as AchievementTier;
      const nextDef = nextTier > 0 ? d.tiers.find(x => x.tier === nextTier) : undefined;

      return {
        id: d.id,
        tier,
        visibility: d.visibility,
        title: d.title,
        description: currentTierDef?.description ?? '',
        next: nextDef ? { label: tierLabel(nextDef.tier), description: nextDef.description, reward: nextDef.reward } : undefined,
      };
    });
  }

  getProgress(preset: EvalPreset) {
    const defs = catalogForPreset(preset);
    const persisted = loadPersisted(preset, this.storage);
    const unlockedCount = defs.filter(d => ((persisted.tiers[d.id] ?? 0) as AchievementTier) > 0).length;
    return { unlocked: unlockedCount, total: defs.length, bestSurvivalSec: persisted.bestSurvivalSec ?? 0 };
  }

  getShopUnlocks(preset: EvalPreset): ShopUnlocks {
    const persisted = loadPersisted(preset, this.storage);
    const tier = (id: string) => (persisted.tiers[id] ?? 0) as AchievementTier;

    // Booster = unlock early, but it's temporary + non-stacking.
    const survivorId =
      preset === EVAL_PRESET.JUNIOR_MID ? 'JM_SURVIVOR' :
      preset === EVAL_PRESET.SENIOR ? 'S_SURVIVOR' :
      preset === EVAL_PRESET.STAFF ? 'ST_LEAN_RUN' :
      'P_MIN_INTERVENTION';

    const booster = tier(survivorId) >= 1;

    // Shield unlocks a bit later (silver survivor, or stable ops bronze, or fast response silver).
    const shield =
      tier(survivorId) >= 2 ||
      tier('S_STABLE_OPS') >= 1 ||
      tier('JM_FAST_RESPONSE') >= 2;

    return { booster, shield };
  }

  /**
   * Feed tracker events. Returns newly unlocked tiers (one entry per tier).
   */
  onEvents(events: AchEvent[]): AchievementUnlock[] {
    const defs = catalogForPreset(this.preset);
    const unlockedNow: AchievementUnlock[] = [];

    for (const ev of events) {
      this.updateRuntime(ev);

      for (const def of defs) {
        const cur = (this.persisted.tiers[def.id] ?? 0) as AchievementTier;
        let next = (cur + 1) as AchievementTier;

        while (next >= 1 && next <= 3) {
          if (!this.shouldUnlockTier(def.id, next as 1 | 2 | 3, ev)) break;

          const tierDef = def.tiers.find(t => t.tier === next) ?? def.tiers[0];
          this.persisted.tiers[def.id] = next;
          unlockedNow.push({
            id: def.id,
            title: def.title,
            tier: next as 1 | 2 | 3,
            label: tierLabel(next as 1 | 2 | 3),
            description: tierDef.description,
            reward: tierDef.reward,
          });

          next = (next + 1) as AchievementTier;
        }
      }
    }

    savePersisted(this.preset, this.storage, this.persisted);
    return unlockedNow;
  }

  private updateRuntime(ev: AchEvent) {
    if (ev.type === 'RUN_START') {
      this.runtime = freshRuntime();
      this.runtime.running = true;
      this.runtime.runStartSec = ev.atSec;
      this.runtime.maxDebtThisRun = ev.architectureDebt;
    }

    if (ev.type === 'RUN_END') {
      this.runtime.running = false;
      const survived = Math.max(0, ev.atSec - this.runtime.runStartSec);
      this.persisted.bestSurvivalSec = Math.max(this.persisted.bestSurvivalSec ?? 0, survived);
    }

    if (ev.type === 'INCIDENT') {
      this.runtime.lastIncidentAt = ev.atSec;
    }

    if (ev.type === 'PURCHASE') {
      this.runtime.purchasesThisRun += 1;
      if (ev.item === 'REFILL') this.runtime.refillsThisRun += 1;
    }

    if (ev.type === 'TICKET_FIXED') {
      this.runtime.ticketsFixedThisRun += 1;
      const dt = ev.atSec - this.runtime.lastIncidentAt;
      if (dt >= 0 && dt <= 15) this.runtime.fast15Count += 1;
      if (dt >= 0 && dt <= 20) this.runtime.fast20Count += 1;
    }

    if (ev.type === 'TICK') {
      this.runtime.maxBacklogThisRun = Math.max(this.runtime.maxBacklogThisRun, ev.backlog);
      this.runtime.maxDebtThisRun = Math.max(this.runtime.maxDebtThisRun, ev.architectureDebt);
      this.runtime.maxDebtThisRun = Math.max(this.runtime.maxDebtThisRun, ev.architectureDebt);

      if (ev.backlog <= 2) {
        if (this.runtime.cleanDeskStartAt < 0) this.runtime.cleanDeskStartAt = ev.atSec;
      } else {
        this.runtime.cleanDeskStartAt = -1;
      }

      // Stable rating window starts once you're above threshold; if you drop below, reset.
      if (ev.rating >= 4.6) {
        if (this.runtime.stableRatingStartAt < 0) this.runtime.stableRatingStartAt = ev.atSec;
      } else {
        this.runtime.stableRatingStartAt = -1;
      }
    }
  }

  private shouldUnlockTier(id: AchievementId, tier: 1 | 2 | 3, ev: AchEvent): boolean {
    const t = ev.atSec;
    const survived = t - this.runtime.runStartSec;

    const hasAllTrustLayers = (components: string[]) => {
      const have = new Set(components);
      const need = ['AUTH', 'PINNING', 'KEYSTORE', 'SANITIZER', 'ABUSE', 'OBS', 'FLAGS'];
      return need.every(n => have.has(n));
    };

    switch (id) {
      // JUNIOR/MID
      case 'JM_SHIP_IT': {
        if (ev.type !== 'TICKET_FIXED') return false;
        const need = tier === 1 ? 1 : tier === 2 ? 5 : 10;
        return this.runtime.ticketsFixedThisRun >= need;
      }
      case 'JM_SURVIVOR': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 180 : tier === 2 ? 300 : 420;
        return survived >= need;
      }
      case 'JM_NO_REFILL': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 240 : tier === 2 ? 360 : 480;
        return survived >= need && this.runtime.refillsThisRun === 0;
      }
      case 'JM_FAST_RESPONSE': {
        if (ev.type !== 'TICKET_FIXED') return false;
        const need = tier === 1 ? 1 : tier === 2 ? 2 : 3;
        return this.runtime.fast15Count >= need;
      }
      case 'JM_CLEAN_DESK': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 30 : tier === 2 ? 60 : 90;
        return this.runtime.cleanDeskStartAt >= 0 && (t - this.runtime.cleanDeskStartAt) >= need;
      }
      case 'JM_BACKLOG_TAMER': {
        if (ev.type !== 'TICK') return false;
        const spikeNeed = tier === 1 ? 8 : tier === 2 ? 10 : 12;
        const target = tier === 3 ? 3 : 4;
        return this.runtime.maxBacklogThisRun >= spikeNeed && ev.backlog <= target;
      }
      case 'JM_TRUST_STACK': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 300 : tier === 2 ? 420 : 600;
        return survived >= need && hasAllTrustLayers(ev.components);
      }

      // SENIOR
      case 'S_SURVIVOR': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 420 : tier === 2 ? 540 : 720;
        return survived >= need;
      }
      case 'S_NO_REFILL': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 360 : tier === 2 ? 480 : 600;
        return survived >= need && this.runtime.refillsThisRun === 0;
      }
      case 'S_STABLE_OPS': {
        if (ev.type !== 'TICK') return false;
        const thresholds = tier === 1 ? { r: 4.6, dur: 120 } : tier === 2 ? { r: 4.7, dur: 150 } : { r: 4.8, dur: 180 };
        if (ev.rating < thresholds.r) return false;
        // runtime.stableRatingStartAt is managed at 4.6; if you drop below, it resets.
        return this.runtime.stableRatingStartAt >= 0 && (t - this.runtime.stableRatingStartAt) >= thresholds.dur;
      }
      case 'S_VELOCITY': {
        if (ev.type !== 'TICKET_FIXED') return false;
        const need = tier === 1 ? 3 : tier === 2 ? 9 : 18;
        return this.runtime.ticketsFixedThisRun >= need;
      }

      // STAFF
      case 'ST_ARCH_SURGEON': {
        if (ev.type !== 'TICK') return false;
        const drop = this.runtime.maxDebtThisRun - ev.architectureDebt;
        const need = tier === 1 ? 25 : tier === 2 ? 40 : 55;
        return drop >= need;
      }
      case 'ST_LEAN_RUN': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 480 : tier === 2 ? 600 : 720;
        return survived >= need && this.runtime.purchasesThisRun <= 1;
      }

      // PRINCIPAL
      case 'P_MIN_INTERVENTION': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 600 : tier === 2 ? 720 : 900;
        const refillLimit = tier === 3 ? 1 : 2;
        return survived >= need && this.runtime.refillsThisRun < refillLimit;
      }
      case 'P_BLACK_SWAN': {
        if (ev.type !== 'TICK') return false;
        const need = tier === 1 ? 600 : tier === 2 ? 720 : 900;
        const fastNeed = tier === 1 ? 3 : tier === 2 ? 4 : 5;
        return survived >= need && this.runtime.fast20Count >= fastNeed;
      }
    }

    return false;
  }
}
