
const COMPONENT_DEPS: Record<string, Array<'net' | 'image' | 'json' | 'auth' | 'analytics'>> = {
  UI: ['image'],
  VM: [],
  DOMAIN: ['json'],
  REPO: ['json'],
  CACHE: [],
  DB: [],
  NET: ['net', 'json'],
  WORK: ['net', 'json'],
  OBS: ['analytics'],
  FLAGS: [],
  AUTH: ['auth', 'net'],
  PINNING: ['net'],
  KEYSTORE: [],
  SANITIZER: ['json'],
  ABUSE: ['net'],
  A11Y: [],
  BILLING: ['net', 'json'],
  PUSH: ['net', 'json'],
  DEEPLINK: ['json'],
};

import { ACTION_KEYS, MODE, EVAL_PRESET } from './types';
import type { ActionDef, ActionKey, Link, Mode, Component, ComponentDef, ComponentType, Request, Ticket, TicketKind, TicketSeverity, Advisory, PlatformState, RegionState, RegionCode, EvalPreset, RunResult, EndReason, ScoreBonus, RefactorOption, RefactorAction, ArchViolation, RefactorRoadmapStep } from './types';
import { Rng } from './rng';
import { entropyPool } from './entropy';
import { tickPlatformPulse as platformPulseTick, tickCoverageGate as coverageGateTick, computeRegionTarget, evaluateCrossCheck, tickRolloutPhase, applyRegionCoupling, tickBaselineProfile, tickPlayIntegrity } from './subsystems';
import type { CoverageGateInput, CrossCheckInput, RolloutPhase } from './subsystems';
import { tickBurnout } from './oncall';
import { gradePostmortem } from './postmortem';
import type { PostmortemGrade } from './postmortem';
import { replayActionLog } from './actionlog';

export const ComponentDefs: Record<ComponentType, ComponentDef> = {
  // Core layers (Android mental model, not backend microservices)
  UI:     { baseCap: 18, baseLat:  6,  baseFail: 0.0025, cost: 40,  upgrade: [0, 65, 95, 0],  desc: 'Screens / Compose (main-thread budget)' },
  VM:     { baseCap: 14, baseLat:  4,  baseFail: 0.0022, cost: 55,  upgrade: [0, 70, 105, 0], desc: 'ViewModel (state + throttling)' },
  DOMAIN: { baseCap: 12, baseLat:  6,  baseFail: 0.0026, cost: 60,  upgrade: [0, 75, 115, 0], desc: 'UseCases (business rules)' },
  REPO:   { baseCap:  7, baseLat: 26,  baseFail: 0.0038, cost: 75,  upgrade: [0, 95, 140, 0], desc: 'Repository (I/O orchestration + caching policy)' },

  // Data/system
  CACHE:  { baseCap: 12, baseLat:  4,  baseFail: 0.0020, cost: 95,  upgrade: [0, 120, 170, 0], desc: 'Cache (memory/disk; hit rate matters)' },
  DB:     { baseCap:  4, baseLat: 42,  baseFail: 0.0065, cost: 130, upgrade: [0, 170, 240, 0], desc: 'Room DB (schema/indices/transactions)' },
  NET:    { baseCap:  3, baseLat: 140, baseFail: 0.0180, cost: 125, upgrade: [0, 160, 230, 0], desc: 'Network (OkHttp/Retrofit; retries/timeouts)' },
  WORK:   { baseCap:  2, baseLat: 90,  baseFail: 0.0100, cost: 85,  upgrade: [0, 120, 175, 0], desc: 'WorkManager (constraints + battery)' },

  // Sidecars (reduce incident impact; not in the critical path)
  OBS:    { baseCap: 99, baseLat:  6,  baseFail: 0.0010, cost: 65,  upgrade: [0, 90, 130, 0], desc: 'Observability (logging/tracing; cheaper repairs)' },
  FLAGS:  { baseCap: 99, baseLat:  3,  baseFail: 0.0010, cost: 65,  upgrade: [0, 90, 130, 0], desc: 'Feature flags (rollback + blast radius)' },

  // Security + trust
  AUTH:     { baseCap: 99, baseLat: 14, baseFail: 0.0015, cost: 75, upgrade: [0, 110, 160, 0], desc: 'Auth & sessions (token hygiene)' },
  PINNING:  { baseCap: 99, baseLat: 10, baseFail: 0.0015, cost: 85, upgrade: [0, 120, 175, 0], desc: 'TLS pinning (MITM resistance; rotations hurt)' },
  KEYSTORE: { baseCap: 99, baseLat: 18, baseFail: 0.0015, cost: 95, upgrade: [0, 130, 190, 0], desc: 'Keystore/Crypto (data-at-rest)' },
  SANITIZER:{ baseCap: 99, baseLat:  8, baseFail: 0.0015, cost: 75, upgrade: [0, 110, 150, 0], desc: 'Input sanitizer (deep links/payload hardening)' },
  ABUSE:    { baseCap: 99, baseLat:  9, baseFail: 0.0015, cost: 85, upgrade: [0, 120, 170, 0], desc: 'Abuse protection (rate limit / credential stuffing)' },

  // Accessibility
  A11Y:   { baseCap: 99, baseLat:  5,  baseFail: 0.0010, cost: 75, upgrade: [0, 110, 160, 0], desc: 'Accessibility (labels, focus order, contrast)' },

  // v0.3.0: monetization / engagement / entry-point realism
  BILLING:  { baseCap: 6,  baseLat: 22, baseFail: 0.0035, cost: 90, upgrade: [0, 120, 175, 0], desc: 'Billing / IAP (purchases, subscriptions, chargebacks)' },
  PUSH:     { baseCap: 8,  baseLat: 14, baseFail: 0.0028, cost: 80, upgrade: [0, 110, 160, 0], desc: 'Push / FCM (delivery, token hygiene)' },
  DEEPLINK: { baseCap: 12, baseLat:  6, baseFail: 0.0030, cost: 70, upgrade: [0, 100, 145, 0], desc: 'Deep link / App Links (intents, routes)' }
};


export const ActionTypes: Record<ActionKey, ActionDef> = {
  READ:   { cpu: 1.0, io: 1.0, net: 0.8, cacheable: true,  heavyCPU: false, label: 'READ' },
  WRITE:  { cpu: 1.2, io: 1.8, net: 0.3, cacheable: false, heavyCPU: false, label: 'WRITE' },
  SEARCH: { cpu: 1.8, io: 1.3, net: 0.6, cacheable: true,  heavyCPU: true,  label: 'SEARCH' },
  UPLOAD: { cpu: 2.2, io: 1.2, net: 1.6, cacheable: false, heavyCPU: true,  label: 'UPLOAD' },
  SCROLL: { cpu: 1.1, io: 0.9, net: 1.2, cacheable: true,  heavyCPU: false, label: 'SCROLL' },
  SYNC:   { cpu: 1.2, io: 1.3, net: 1.4, cacheable: false, heavyCPU: false, label: 'SYNC' }
};

type IncidentKind =
  | 'TRAFFIC_SPIKE'
  | 'NET_WOBBLE'
  | 'OEM_RESTRICTION'
  | 'MITM'
  | 'CERT_ROTATION'
  | 'TOKEN_THEFT'
  | 'CRED_STUFFING'
  | 'DEEP_LINK_ABUSE'
  | 'A11Y_REGRESSION'
  | 'SDK_SCANDAL'
  | 'MEMORY_LEAK'
  | 'REGION_OUTAGE'
  | 'ANR_ESCALATION'
  | 'IAP_FRAUD'
  | 'PUSH_ABUSE'
  | 'DEEP_LINK_EXPLOIT';

type IncidentTiers = {
  authTier: number;
  pinTier: number;
  keyTier: number;
  sanTier: number;
  abuseTier: number;
  a11yTier: number;
  flagsTier: number;
  obsTier: number;
  cacheTier: number;
  billingTier: number;
  pushTier: number;
  deeplinkTier: number;
};

export type Bounds = { width: number; height: number };

// Structured events for UI/achievements.
export type SimEvent =
  | { type: 'RUN_RESET'; atSec: number }
  | { type: 'RUN_END'; atSec: number; reason: EndReason }
  | { type: 'PURCHASE'; atSec: number; item: 'REFILL' | 'REGEN' | 'HIRE' | 'BOOSTER' | 'SHIELD' }
  | { type: 'TICKET_FIXED'; atSec: number; kind: TicketKind; effort: number }
  | { type: 'EVENT'; atSec: number; category: 'INCIDENT' | 'OTHER'; msg: string };

export class GameSim {
  private nextId = 1;


  // Deterministic run
  seed = 0;
  private rng = new Rng(0xC0FFEE);
  score = 0;
  architectureDebt = 0; // 0..100
  lastRun: RunResult | null = null;
  lastGrade: PostmortemGrade | null = null;
  getLastGrade(): PostmortemGrade | null { return this.lastGrade; }

  private archFindings: Array<{ from: ComponentType; to: ComponentType; kind: 'UPWARD' | 'SKIP' | 'UPWARD_SKIP'; atSec: number }> = [];

  private rand(): number { return this.rng.next(); }

  // TicketFlow
  engCapacity = 12;
  engCapacityMax = 12;
  // Capacity tuning / upgrades
  engRegenTier = 0; // 0..3 (process + tooling; increases regen)
  engHires = 0; // increases max capacity
  engRefillsUsed = 0;
  private engAdrenalineUntil = 0; // incident response burst
  private engRegenBoostUntil = 0; // temporary booster (non-stacking)
  private engBoosterBuys = 0; // increases booster cost to prevent spam
  private incidentShieldCharges = 0; // 0..1

  // On-call burnout state. Incidents that empty capacity repeatedly accrue
  // burnout; when it crosses a threshold, a BURNOUT ticket spawns and regen
  // is sapped until the team gets breathing room.
  burnoutLevel = 0;
  private burnoutZeroHits: number[] = [];

  tickets: Ticket[] = [];
  private nextTicketId = 1;
  // Multi-signal ticket gate: per-kind running counters + last cross-check reason
  // (so the UI can expose "why did this fire" and "almost fired" hints).
  private candidateTickets = new Map<TicketKind, { consecutive: number; firstSeenSec: number; lastReason: string }>();

  // Scenario mode: scripted incidents by wall-clock second. When a tick matches
  // a scripted marker, that incident fires directly without consuming rand().
  scenarioId: string | null = null;
  private scriptedIncidents = new Map<number, IncidentKind>();

  // ZeroDayPulse
  advisories: Advisory[] = [];
  private nextAdvisoryId = 1;

  // PlatformPulse
  platform: PlatformState = {
    latestApi: 37,
    minApi: 26,
    oldDeviceShare: 0.28,
    lowRamShare: 0.30,
    pressure: 0,
  };


  // RegMatrix
  regions: RegionState[] = [
    { code: 'EU', share: 0.40, compliance: 86, pressure: 0.0, frozenSec: 0 },
    { code: 'US', share: 0.35, compliance: 84, pressure: 0.0, frozenSec: 0 },
    { code: 'UK', share: 0.10, compliance: 85, pressure: 0.0, frozenSec: 0 },
    { code: 'IN', share: 0.08, compliance: 83, pressure: 0.0, frozenSec: 0 },
    { code: 'BR', share: 0.07, compliance: 83, pressure: 0.0, frozenSec: 0 },
  ];
  regPressure = 0;

  // CoverageGate
  preset: EvalPreset = EVAL_PRESET.SENIOR;
  coveragePct = 78;
  coverageThreshold = 70;
  coverageRiskMult = 1.0;
  private coverageHist: number[] = [];
  private lastCompCount = 0;
  private qualityProcess = 0.0; // 0..1 reduces coverage decay
  flakyTestRate = 0.02; // 0..1 probability a flaky suite masks a regression

  // PlatformPulse rollout (staggered deployment)
  rolloutPhase: RolloutPhase = 1; // start at 10% prod

  // Android-native realism surfaces (one-time unlockable purchases)
  baselineProfile = false;
  r8Enabled = false;
  bundleSplitEnabled = false;

  // Ticket applied patches (lightweight)
  private patch = {
    crash: 0,
    anr: 0,
    jank: 0,
    heap: 0,
    battery: 0,
    a11y: 0,
    privacy: 0,
    security: 0,
    compat: 0,
    zeroDay: 0,
  };

  mode: Mode = MODE.SELECT;
  running = false;
  timeSec = 0;

  // Starting budget is intentionally generous so tests (and players) can
  // explore large architectural changes without immediately hitting an
  // economy wall.
  budget = 3000;
  rating = 5.0;
  battery = 100;

  // Android realism (minimal)
  frameBudgetMs = 16.6;
  jankPct = 0; // 0..100
  heapMb = 64;
  heapMaxMb = 320;
  gcPauseMs = 0;
  oomCount = 0;

  // Perception metrics (0..100). These feed into user rating separately from pure tech metrics.
  a11yScore = 100;
  privacyTrust = 100;
  securityPosture = 100;
  supportLoad = 0;

  // User votes + review snippets (running totals)
  votes = { perf: 0, reliability: 0, privacy: 0, a11y: 0, battery: 0 };
  recentReviews: string[] = [];
  private nextReviewAt = 25;


  reqOk = 0;
  reqFail = 0;
  anrPoints = 0;
  latSamples: number[] = [];

  components: Component[] = [];
  links: Link[] = [];

  selectedId: number | null = null;
  linkFromId: number | null = null;

  // incident modifiers
  spawnMul = 1.0;
  netBadness = 1.0;
  workRestriction = 1.0;

  // Approx user traffic intensity (0..100). Used by heap/GC heuristics.
  traffic = 0;

  private lastEventAt = 0;
  private incidentCount = 0;
  private recentIncidentTimes: number[] = [];

  // Combo system: track recent ticket fix times for combo multiplier.
  private recentFixTimes: number[] = [];
  comboActive = false;
  comboCount = 0;
  comboUntil = 0;
  comboBonusAccum = 0;
  private eventLines: string[] = [];
  private eventStream: SimEvent[] = [];
  /** Full retained event log for the current run (used for postmortem grading). */
  private runEventLog: SimEvent[] = [];

  /**
   * Per-run action log. Every public mutator appends here so a fresh sim can
   * replay the run deterministically (see src/actionlog.ts). Cleared on reset().
   */
  private actionLog: Array<{ t: number; seq: number; kind: string; args: unknown[] }> = [];
  private actionSeq: number = 0;
  /** When true (set by the replayer), public mutators skip recording. */
  suppressActionLog: boolean = false;

  private recordAction(kind: string, args: unknown[]): void {
    if (this.suppressActionLog) return;
    this.actionLog.push({ t: this.timeSec, seq: this.actionSeq++, kind, args });
  }

  /** Read-only snapshot of the current run's action log. */
  getActionLog(): ReadonlyArray<{ t: number; seq: number; kind: string; args: unknown[] }> {
    return this.actionLog;
  }

  /** Sets the currently selected component id. Routes direct field mutation through a logged entry. */
  setSelected(id: number | null): void {
    if (this.selectedId === id) return;
    this.recordAction('setSelected', [id]);
    this.selectedId = id;
  }

  /** Sets the run's running flag. Routes direct field mutation through a logged entry. */
  setRunning(b: boolean): void {
    if (this.running === b) return;
    this.recordAction('setRunning', [b]);
    this.running = b;
  }

  /** Applies an external reward (budget + score delta), typically from an achievement unlock. */
  applyReward(budgetDelta: number, scoreDelta: number): void {
    this.recordAction('applyReward', [budgetDelta, scoreDelta]);
    this.budget += budgetDelta;
    this.score += scoreDelta;
  }

  private queues = new Map<number, Request[]>();

  reset(bounds: Bounds, opts?: { seed?: number }) {
    this.mode = MODE.SELECT;
    this.running = false;
    this.timeSec = 0;
    // Structured event so UI can reset achievements state in a deterministic way.
    this.eventStream = [{ type: 'RUN_RESET', atSec: 0 }];
    this.runEventLog = [{ type: 'RUN_RESET', atSec: 0 }];

    // Deterministic seed: same seed => same run.
    const s = (opts?.seed ?? entropyPool.seed()) >>> 0;
    this.seed = s;
    this.rng = new Rng(s);
    this.score = 0;
    this.architectureDebt = 0;

    this.budget = 3000;
    this.rating = 5.0;
    this.battery = 100;


    // TicketFlow + capacity economy reset
    this.engCapacityMax = 12;
    this.engCapacity = 12;
    this.engRegenTier = 0;
    this.engHires = 0;
    this.engRefillsUsed = 0;
    this.engAdrenalineUntil = 0;
    this.engRegenBoostUntil = 0;
    this.engBoosterBuys = 0;
    this.incidentShieldCharges = 0;
    this.burnoutLevel = 0;
    this.burnoutZeroHits = [];

    this.tickets = [];
    this.nextTicketId = 1;
    this.candidateTickets.clear();
    // Scenario state is reset-by-default; callers can re-apply loadScenario() after.
    this.scenarioId = null;
    this.scriptedIncidents.clear();

    // Action log is per-run: reset erases prior actions so the log reflects only
    // the upcoming run. The seed itself is implicit in the run's ReplayInput.
    this.actionLog = [];
    this.actionSeq = 0;

    // ZeroDayPulse
    this.advisories = [];
    this.nextAdvisoryId = 1;

    // PlatformPulse
    this.platform = {
      latestApi: 37,
      minApi: 26,
      oldDeviceShare: 0.28,
      lowRamShare: 0.30,
      pressure: 0,
    };

    // RegMatrix
    this.regions = [
      { code: 'EU', share: 0.40, compliance: 86, pressure: 0.0, frozenSec: 0 },
      { code: 'US', share: 0.35, compliance: 84, pressure: 0.0, frozenSec: 0 },
      { code: 'UK', share: 0.10, compliance: 85, pressure: 0.0, frozenSec: 0 },
      { code: 'IN', share: 0.08, compliance: 83, pressure: 0.0, frozenSec: 0 },
      { code: 'BR', share: 0.07, compliance: 83, pressure: 0.0, frozenSec: 0 },
    ];
    this.regPressure = 0;

    // CoverageGate baseline
    this.coveragePct = 78;
    this.coverageRiskMult = 1.0;
    this.coverageHist = [];
    this.lastCompCount = 0;
    this.qualityProcess = 0.0;
    this.flakyTestRate = 0.02;
    this.rolloutPhase = 1;
    this.baselineProfile = false;
    this.r8Enabled = false;
    this.bundleSplitEnabled = false;

    // Clear applied patches
    this.patch = {
      crash: 0, anr: 0, jank: 0, heap: 0, battery: 0,
      a11y: 0, privacy: 0, security: 0, compat: 0, zeroDay: 0,
    };


    this.a11yScore = 100;
    this.privacyTrust = 100;
    this.securityPosture = 100;
    this.supportLoad = 0;

    this.votes = { perf: 0, reliability: 0, privacy: 0, a11y: 0, battery: 0 };
    this.recentReviews = [];
    this.nextReviewAt = 25;

    this.reqOk = 0;
    this.reqFail = 0;
    this.anrPoints = 0;
    this.latSamples = [];

    this.components = [];
    this.links = [];

    this.selectedId = null;
    this.linkFromId = null;

    this.spawnMul = 1.0;
    this.netBadness = 1.0;
    this.workRestriction = 1.0;

    this.traffic = 0;

    this.lastEventAt = 0;
    this.incidentCount = 0;
    this.recentIncidentTimes = [];
    this.recentFixTimes = [];
    this.comboActive = false;
    this.comboCount = 0;
    this.comboUntil = 0;
    this.comboBonusAccum = 0;
    this.eventLines = [];

    this.queues.clear();

    // starter layout
    const cx = bounds.width * 0.40;
    const cy = bounds.height * 0.50;

    const nUI = this.createComponent('UI',     cx - 260, cy - 20);
    const nVM = this.createComponent('VM',     cx - 150, cy - 20);
    const nD  = this.createComponent('DOMAIN', cx -  40, cy - 20);
    const nR  = this.createComponent('REPO',   cx +  70, cy - 20);
    const nC  = this.createComponent('CACHE',  cx + 190, cy - 80);
    const nDB = this.createComponent('DB',     cx + 310, cy - 80);
    const nN  = this.createComponent('NET',    cx + 190, cy + 60);
    const nW  = this.createComponent('WORK',   cx -  40, cy + 110);
    const nO  = this.createComponent('OBS',    cx - 260, cy + 120);
    const nF  = this.createComponent('FLAGS',  cx + 310, cy + 60);

    this.components.push(nUI, nVM, nD, nR, nC, nDB, nN, nW, nO, nF);

    // Starter layout: these are part of the reset's initial state, not user
    // actions. Suppress recording so the action log only contains player input.
    const wasSuppressed = this.suppressActionLog;
    this.suppressActionLog = true;
    this.link(nUI.id, nVM.id);
    this.link(nVM.id, nD.id);
    this.link(nD.id,  nR.id);
    this.link(nR.id,  nC.id);
    this.link(nC.id,  nDB.id);
    this.link(nR.id,  nN.id);
    this.link(nW.id,  nR.id);
    this.suppressActionLog = wasSuppressed;

    this.selectedId = nR.id;
  }

  // --- tickets / platform --------------------------------------------------
  getTickets(): Ticket[] { return this.tickets; }
  getCapacity() {
    const regenPerSec = this.capacityRegenPerSec();
    const boosterActive = this.timeSec < this.engRegenBoostUntil;
    return {
      cur: this.engCapacity,
      max: this.engCapacityMax,
      regenPerMin: regenPerSec * 60,
      tier: this.engRegenTier,
      adrenaline: this.timeSec < this.engAdrenalineUntil,
      boosterActive,
      boosterRemainingSec: boosterActive ? (this.engRegenBoostUntil - this.timeSec) : 0,
      shieldCharges: this.incidentShieldCharges,
    };
  }

  getCapacityShop() {
    const refillCost = Math.round(120 + this.engRefillsUsed * 35);
    const regenUpgradeCost = Math.round(350 + this.engRegenTier * 300);
    const hireCost = Math.round(600 + this.engHires * 450);

    // Achievement-unlocked items are deliberately "anti-snowball":
    // - Booster is temporary and non-stacking, cost ramps.
    // - Shield is a 1-charge consumable (no hoarding), cost ramps.
    const boosterCost = Math.round(240 + this.engBoosterBuys * 80);
    const shieldCost = Math.round(320 + (this.engBoosterBuys * 35));

    const boosterActive = this.timeSec < this.engRegenBoostUntil;

    return {
      refillCost,
      regenUpgradeCost,
      hireCost,
      boosterCost,
      shieldCost,
      boosterActive,
      boosterRemainingSec: boosterActive ? (this.engRegenBoostUntil - this.timeSec) : 0,
      shieldCharges: this.incidentShieldCharges,
      canBuyBooster: !boosterActive,
      canBuyShield: this.incidentShieldCharges < 1,
      canRegenUpgrade: this.engRegenTier < 3,
      canHire: this.engCapacityMax < 30,
    };
  }

  buyCapacityRefill(): { ok: boolean; reason?: string } {
    this.recordAction('buyCapacityRefill', []);
    const { refillCost } = this.getCapacityShop();
    if (this.engCapacity >= this.engCapacityMax - 1e-6) return { ok: false, reason: 'Capacity already full' };
    if (this.budget < refillCost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= refillCost;
    this.engCapacity = this.engCapacityMax;
    this.engRefillsUsed += 1;
    this.log(`Bought capacity refill (-$${refillCost}).`);
    this.eventStream.push({ type: 'PURCHASE', atSec: this.timeSec, item: 'REFILL' });
    return { ok: true };
  }

  buyCapacityRegenUpgrade(): { ok: boolean; reason?: string } {
    this.recordAction('buyCapacityRegenUpgrade', []);
    const { regenUpgradeCost } = this.getCapacityShop();
    if (this.engRegenTier >= 3) return { ok: false, reason: 'Regen already maxed' };
    if (this.budget < regenUpgradeCost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= regenUpgradeCost;
    this.engRegenTier += 1;
    this.log(`Upgraded capacity regen to Tier ${this.engRegenTier} (-$${regenUpgradeCost}).`);
    this.eventStream.push({ type: 'PURCHASE', atSec: this.timeSec, item: 'REGEN' });
    return { ok: true };
  }

  hireMoreCapacity(): { ok: boolean; reason?: string } {
    this.recordAction('hireMoreCapacity', []);
    const { hireCost } = this.getCapacityShop();
    if (this.engCapacityMax >= 30) return { ok: false, reason: 'Capacity already at max' };
    if (this.budget < hireCost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= hireCost;
    this.engHires += 1;
    this.engCapacityMax = clamp(this.engCapacityMax + 2, 8, 30);
    this.engCapacity = clamp(this.engCapacity + 2, 0, this.engCapacityMax);
    this.log(`Hired extra hands (+2 max capacity, -$${hireCost}).`);
    this.eventStream.push({ type: 'PURCHASE', atSec: this.timeSec, item: 'HIRE' });
    return { ok: true };
  }

  buyRegenBooster(): { ok: boolean; reason?: string } {
    this.recordAction('buyRegenBooster', []);
    const { boosterCost, canBuyBooster } = this.getCapacityShop();
    if (!canBuyBooster) return { ok: false, reason: 'Booster already active' };
    if (this.budget < boosterCost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= boosterCost;
    this.engBoosterBuys += 1;
    // 45s of extra regen: meaningful, but not a permanent snowball.
    this.engRegenBoostUntil = this.timeSec + 45;
    this.log(`Bought energy drink (regen boosted for 45s, -$${boosterCost}).`);
    this.eventStream.push({ type: 'PURCHASE', atSec: this.timeSec, item: 'BOOSTER' });
    return { ok: true };
  }

  buyIncidentShield(): { ok: boolean; reason?: string } {
    this.recordAction('buyIncidentShield', []);
    const { shieldCost, canBuyShield } = this.getCapacityShop();
    if (!canBuyShield) return { ok: false, reason: 'Shield already ready' };
    if (this.budget < shieldCost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= shieldCost;
    this.incidentShieldCharges = 1;
    this.log(`Bought incident shield (blocks next incident penalty once, -$${shieldCost}).`);
    this.eventStream.push({ type: 'PURCHASE', atSec: this.timeSec, item: 'SHIELD' });
    return { ok: true };
  }

  // v0.3.0 Android-native one-time build surfaces.
  buyBaselineProfile(): { ok: boolean; reason?: string } {
    this.recordAction('buyBaselineProfile', []);
    if (this.baselineProfile) return { ok: false, reason: 'Already shipped' };
    if (this.budget < 250) return { ok: false, reason: 'Not enough budget' };
    this.budget -= 250;
    this.baselineProfile = true;
    this.log('Shipped Baseline Profile (-$250). Startup + jank reduced.');
    return { ok: true };
  }

  buyR8(): { ok: boolean; reason?: string } {
    this.recordAction('buyR8', []);
    if (this.r8Enabled) return { ok: false, reason: 'R8 already enabled' };
    if (this.budget < 200) return { ok: false, reason: 'Not enough budget' };
    this.budget -= 200;
    this.r8Enabled = true;
    this.log('Enabled R8 / ProGuard (-$200). Heap + startup reduced.');
    return { ok: true };
  }

  buyBundleSplit(): { ok: boolean; reason?: string } {
    this.recordAction('buyBundleSplit', []);
    if (this.bundleSplitEnabled) return { ok: false, reason: 'Bundle split already enabled' };
    if (this.budget < 180) return { ok: false, reason: 'Not enough budget' };
    this.budget -= 180;
    this.bundleSplitEnabled = true;
    this.log('Enabled App Bundle split delivery (-$180).');
    return { ok: true };
  }

  /** Returns the current state of Android-native realism surfaces for the UI. */
  getAndroidSurfaces(): { baselineProfile: boolean; r8Enabled: boolean; bundleSplitEnabled: boolean; rolloutPhase: RolloutPhase; playIntegrityActive: boolean } {
    const playIntegrity = tickPlayIntegrity({
      abuseTier: this.tierOf('ABUSE'),
      authTier: this.tierOf('AUTH'),
    });
    return {
      baselineProfile: this.baselineProfile,
      r8Enabled: this.r8Enabled,
      bundleSplitEnabled: this.bundleSplitEnabled,
      rolloutPhase: this.rolloutPhase,
      playIntegrityActive: playIntegrity.active,
    };
  }

  private capacityRegenPerSec(): number {
    // Mid-game pacing: avoid the "stagnation valley" where you're stuck waiting.
    // Strategy: increase regen gently as time passes, and add a rubber-band bonus when backlog is high.
    const base = 0.22; // ~13.2/min baseline
    const timeRamp = clamp(this.timeSec / 300, 0, 1) * 0.07; // up to +4.2/min after ~5 min
    const tierBonus = this.engRegenTier * 0.03; // +1.8/min per tier
    const backlogBonus = clamp((this.tickets.length - 4) / 8, 0, 1) * 0.05; // up to +3/min when drowning
    const adrenaline = this.timeSec < this.engAdrenalineUntil ? 0.08 : 0; // incident burst (~+4.8/min)
    const booster = this.timeSec < this.engRegenBoostUntil ? 0.06 : 0; // temporary (~+3.6/min)
    // Burnout penalty: active BURNOUT ticket saps regen until fixed.
    const burnoutPenalty = this.tickets.some(t => t.kind === 'BURNOUT') ? 0.10 : 0;

    return Math.max(0, base + timeRamp + tierBonus + backlogBonus + adrenaline + booster - burnoutPenalty);
  }

  getPlatform(): PlatformState { return { ...this.platform }; }
  getRegions(): RegionState[] { return this.regions.map(r => ({ ...r })); }
  getRegPressure(): number { return this.regPressure; }
  getCoverage() { return { pct: this.coveragePct, threshold: this.coverageThreshold, preset: this.preset }; }
  setPreset(p: EvalPreset) {
    this.recordAction('setPreset', [p]);
    this.preset = p;
    this.coverageThreshold =
      (p === EVAL_PRESET.PRINCIPAL) ? 80 :
      (p === EVAL_PRESET.STAFF) ? 75 : 70;
  }

  /**
   * Target session length ("shift") per evaluation level.
   * Goal: keep runs in the ~8–10 minute range while still allowing different difficulty feels.
   */
  getShiftDurationSec(): number {
    switch (this.preset) {
      case EVAL_PRESET.JUNIOR_MID: return 600; // 10:00
      case EVAL_PRESET.SENIOR: return 540;     // 09:00
      case EVAL_PRESET.STAFF: return 510;      // 08:30
      case EVAL_PRESET.PRINCIPAL: return 480;  // 08:00
      default: return 540;
    }
  }
  getAdvisories(): Advisory[] { return this.advisories; }

  fixTicket(id: number) {
    this.recordAction('fixTicket', [id]);
    const t = this.tickets.find(x => x.id === id);
    if (!t) return;
    const cost = t.effort;
    if (this.engCapacity + 1e-9 < cost) return;
    this.engCapacity = Math.max(0, this.engCapacity - cost);
    // Apply lightweight patch by kind
    switch (t.kind) {
      case 'CRASH_SPIKE': this.patch.crash = clamp(this.patch.crash + 0.35, 0, 1); break;
      case 'ANR_RISK': this.patch.anr = clamp(this.patch.anr + 0.35, 0, 1); break;
      case 'JANK': this.patch.jank = clamp(this.patch.jank + 0.35, 0, 1); break;
      case 'HEAP': this.patch.heap = clamp(this.patch.heap + 0.35, 0, 1); break;
      case 'BATTERY': this.patch.battery = clamp(this.patch.battery + 0.30, 0, 1); break;
      case 'A11Y_REGRESSION': this.patch.a11y = clamp(this.patch.a11y + 0.50, 0, 1); break;
      case 'PRIVACY_COMPLAINTS': this.patch.privacy = clamp(this.patch.privacy + 0.50, 0, 1); break;
      case 'SECURITY_EXPOSURE': this.patch.security = clamp(this.patch.security + 0.55, 0, 1); break;
      case 'COMPAT_ANDROID': this.patch.compat = clamp(this.patch.compat + 0.55, 0, 1); break;
      case 'COMPLIANCE_EU': this.patch.privacy = clamp(this.patch.privacy + 0.35, 0, 1); this.patch.security = clamp(this.patch.security + 0.20, 0, 1); break;
      case 'COMPLIANCE_US': this.patch.security = clamp(this.patch.security + 0.35, 0, 1); break;
      case 'COMPLIANCE_UK': this.patch.privacy = clamp(this.patch.privacy + 0.30, 0, 1); this.patch.security = clamp(this.patch.security + 0.25, 0, 1); break;
      case 'STORE_REJECTION': this.patch.compat = clamp(this.patch.compat + 0.25, 0, 1); this.patch.privacy = clamp(this.patch.privacy + 0.25, 0, 1); break;
      case 'TEST_COVERAGE':
        this.coveragePct = clamp(this.coveragePct + 9, 0, 100);
        this.qualityProcess = clamp(this.qualityProcess + 0.18, 0, 1);
        break;
      case 'ARCHITECTURE_DEBT':
        this.architectureDebt = clamp(this.architectureDebt - 25, 0, 100);
        this.qualityProcess = clamp(this.qualityProcess + 0.06, 0, 1);
        break;
      case 'BURNOUT':
        // Fixing burnout clears the penalty and gives a one-time regen burst.
        this.burnoutLevel = 0;
        this.burnoutZeroHits = [];
        this.engAdrenalineUntil = this.timeSec + 30;
        break;
    }
    // If this was driven by a zero-day, mark advisories mitigated faster
    if (t.kind === 'SECURITY_EXPOSURE') {
      for (const a of this.advisories) a.mitigated = true;
      this.patch.zeroDay = clamp(this.patch.zeroDay + 0.60, 0, 1);
    }
    this.tickets = this.tickets.filter(x => x.id !== id);
    this.addEvent(`Fixed ticket: ${t.title}`);
    this.eventStream.push({ type: 'TICKET_FIXED', atSec: this.timeSec, kind: t.kind, effort: t.effort });

    // Combo tracking: 3 fixes within 60s triggers a combo.
    this.recentFixTimes = this.recentFixTimes.filter(ft => this.timeSec - ft < 60);
    this.recentFixTimes.push(this.timeSec);
    if (this.recentFixTimes.length >= 3 && !this.comboActive) {
      this.comboActive = true;
      this.comboCount++;
      this.comboUntil = this.timeSec + 30;
    }
  }

  deferTicket(id: number) {
    this.recordAction('deferTicket', [id]);
    const t = this.tickets.find(x => x.id === id);
    if (!t) return;
    t.deferred = !t.deferred;
  }

  // --- public CRUD ----------------------------------------------------------
  addComponent(type: ComponentType, x: number, y: number): { ok: boolean; reason?: string; id?: number } {
    this.recordAction('addComponent', [type, x, y]);
    const def = ComponentDefs[type];
    if (this.budget < def.cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= def.cost;
    const n = this.createComponent(type, x, y);
    this.components.push(n);
    this.selectedId = n.id;
    return { ok: true, id: n.id };
  }

  deleteSelected(): boolean {
    this.recordAction('deleteSelected', []);
    const id = this.selectedId;
    if (!id) return false;
    this.links = this.links.filter(l => l.from !== id && l.to !== id);
    this.queues.delete(id);
    this.components = this.components.filter(n => n.id !== id);
    this.selectedId = null;
    this.log(`Deleted component #${id}.`);
    return true;
  }

  upgradeSelected(): { ok: boolean; reason?: string } {
    this.recordAction('upgradeSelected', []);
    const n = this.selected();
    if (!n) return { ok: false, reason: 'Nothing selected' };
    if (n.tier >= 3) return { ok: false, reason: 'Already max tier' };
    const cost = this.upgradeCost(n);
    if (this.budget < cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= cost;
    n.tier = (n.tier + 1) as 2 | 3;
    this.log(`${n.type} upgraded to Tier ${n.tier}.`);
    return { ok: true };
  }

  repairSelected(): { ok: boolean; reason?: string } {
    this.recordAction('repairSelected', []);
    const n = this.selected();
    if (!n) return { ok: false, reason: 'Nothing selected' };
    if (n.health >= 100 && !n.down) return { ok: false, reason: 'Already healthy' };
    const cost = this.repairCost(n);
    if (this.budget < cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= cost;
    n.health = 100;
    n.down = false;
    this.log(`${n.type} repaired.`);
    return { ok: true };
  }

  setMode(m: Mode) { this.mode = m; this.linkFromId = null; }

  link(from: number, to: number): boolean {
    this.recordAction('link', [from, to]);
    if (from === to) return false;
    if (this.links.some(l => l.from === from && l.to === to)) return false;

    const a = this.components.find(c => c.id === from);
    const b = this.components.find(c => c.id === to);
    if (!a || !b) return false;

    const { ok, debtAdd, reason, blocksInPrincipal } = this.archLint(a.type, b.type);

    if (!ok) {
      // Record debt even if blocked (Principal mode).
      if (debtAdd > 0) {
        this.architectureDebt = clamp(this.architectureDebt + debtAdd, 0, 100);
        this.recordArchFinding(a.type, b.type, reason);
        this.createTicket(
          'ARCHITECTURE_DEBT',
          `Architecture debt: ${reason}`,
          'Platform',
          blocksInPrincipal ? 2 : 1,
          40 + debtAdd * 2,
          blocksInPrincipal ? 5 : 3
        );
        this.log(`Architecture debt created (${debtAdd}): ${reason}`);
      }
      return false;
    }

    // If link is allowed but still incurs debt (Staff tolerates, Principal may allow minor skip)
    if (debtAdd > 0) {
      this.architectureDebt = clamp(this.architectureDebt + debtAdd, 0, 100);
        this.recordArchFinding(a.type, b.type, reason);
      this.createTicket(
        'ARCHITECTURE_DEBT',
        `Architecture debt: ${reason}`,
        'Platform',
        1,
        35 + debtAdd * 2,
        3
      );
      this.log(`Architecture debt added (${debtAdd}): ${reason}`);
    }

    this.links.push({ from, to });
    return true;
  }

  private archLint(fromType: ComponentType, toType: ComponentType): { ok: boolean; debtAdd: number; reason: string; blocksInPrincipal: boolean } {
    // Sidecars can be depended on from anywhere.
    const sidecars = new Set<ComponentType>(['OBS', 'FLAGS', 'A11Y', 'DEEPLINK']);
    if (sidecars.has(toType)) return { ok: true, debtAdd: 0, reason: 'sidecar ok', blocksInPrincipal: false };

    const layer = (t: ComponentType): number => {
      switch (t) {
        case 'UI': return 0;
        case 'VM': return 1;
        case 'DOMAIN': return 2;
        case 'REPO': return 3;
        // "Data/system" layer
        case 'CACHE':
        case 'DB':
        case 'NET':
        case 'WORK':
        case 'AUTH':
        case 'PINNING':
        case 'KEYSTORE':
        case 'SANITIZER':
        case 'ABUSE':
        case 'BILLING':
        case 'PUSH':
          return 4;
        default:
          return 4;
      }
    };

    const a = layer(fromType);
    const b = layer(toType);

    // Higher layers should depend on lower layers: UI(0)->VM(1)->DOMAIN(2)->REPO(3)->DATA(4)
    const upward = a > b;
    const skip = (b - a) > 1;

    if (!upward && !skip) return { ok: true, debtAdd: 0, reason: 'ok', blocksInPrincipal: false };

    const debtAdd = (upward ? 10 : 0) + (skip ? 6 : 0);
    const reason =
      upward && skip ? `${fromType} -> ${toType} (upward + layer skip)` :
      upward ? `${fromType} -> ${toType} (upward dependency)` :
      `${fromType} -> ${toType} (layer skip)`;

    const principal = this.preset === EVAL_PRESET.PRINCIPAL;
    // Principal blocks all upward deps and large skips; Staff allows but taxes.
    const blocksInPrincipal = principal && (upward || (b - a) >= 3);
    if (blocksInPrincipal) return { ok: false, debtAdd, reason, blocksInPrincipal: true };

    // Allowed but taxed.
    return { ok: true, debtAdd, reason, blocksInPrincipal: false };
  }

  private recordArchFinding(from: ComponentType, to: ComponentType, reason: string) {
    const kind: 'UPWARD' | 'SKIP' | 'UPWARD_SKIP' =
      reason.includes('upward') && reason.includes('skip') ? 'UPWARD_SKIP' :
      reason.includes('upward') ? 'UPWARD' : 'SKIP';

    this.archFindings.unshift({ from, to, kind, atSec: this.timeSec });
    this.archFindings = this.archFindings.slice(0, 20);
  }

  private chooseWorstViolation(): { fromId: number; toId: number; fromType: ComponentType; toType: ComponentType } | null {
    // Heuristic: remove an "upward" dependency first, then large layer skips.
    const layer = (t: ComponentType): number => {
      switch (t) {
        case 'UI': return 0;
        case 'VM': return 1;
        case 'DOMAIN': return 2;
        case 'REPO': return 3;
        default: return 4;
      }
    };

    let best: { fromId: number; toId: number; score: number; fromType: ComponentType; toType: ComponentType } | null = null;

    for (const l of this.links) {
      const a = this.components.find(c => c.id === l.from);
      const b = this.components.find(c => c.id === l.to);
      if (!a || !b) continue;

      const la = layer(a.type);
      const lb = layer(b.type);
      const upward = la > lb;
      const skip = (lb - la) > 1;

      if (!upward && !skip) continue;

      const s = (upward ? 100 : 0) + (skip ? (lb - la) * 10 : 0);
      if (!best || s > best.score) best = { fromId: l.from, toId: l.to, score: s, fromType: a.type, toType: b.type };
    }

    return best ? { fromId: best.fromId, toId: best.toId, fromType: best.fromType, toType: best.toType } : null;
  }


  getArchViolations(): ArchViolation[] {
    const layer = (t: ComponentType): number => {
      switch (t) {
        case 'UI': return 0;
        case 'VM': return 1;
        case 'DOMAIN': return 2;
        case 'REPO': return 3;
        default: return 4;
      }
    };

    const out: ArchViolation[] = [];
    for (const l of this.links) {
      const a = this.components.find(c => c.id === l.from);
      const b = this.components.find(c => c.id === l.to);
      if (!a || !b) continue;

      const la = layer(a.type);
      const lb = layer(b.type);
      const upward = la > lb;
      const skip = (lb - la) > 1;
      if (!upward && !skip) continue;

      const kind: 'UPWARD' | 'SKIP' | 'UPWARD_SKIP' = upward && skip ? 'UPWARD_SKIP' : upward ? 'UPWARD' : 'SKIP';
      const reason =
        upward && skip ? `${a.type} → ${b.type} (upward + layer skip)` :
        upward ? `${a.type} → ${b.type} (upward dependency)` :
        `${a.type} → ${b.type} (layer skip)`;

      const severityScore = (upward ? 100 : 0) + (skip ? (lb - la) * 10 : 0);
      out.push({
        key: `${l.from}->${l.to}`,
        fromId: l.from,
        toId: l.to,
        fromType: a.type,
        toType: b.type,
        kind,
        reason,
        severityScore
      });
    }

    return out.sort((x, y) => y.severityScore - x.severityScore);
  }


  getFirstArchitectureDebtTicketId(): number | null {
    const t = this.tickets.find(x => x.kind === 'ARCHITECTURE_DEBT');
    return t ? t.id : null;
  }

  getRefactorRoadmap(): RefactorRoadmapStep[] {
    // A simple, interview-friendly strategy:
    // 1) Fix upward deps (boundaries)
    // 2) Remove layer skips (mapping/middleware)
    // 3) Reduce blast radius (split repo)
    // 4) Create a boundary (feature module)
    const hasUpward = this.getArchViolations().some(v => v.kind === 'UPWARD' || v.kind === 'UPWARD_SKIP');
    const hasSkip = this.getArchViolations().some(v => v.kind === 'SKIP' || v.kind === 'UPWARD_SKIP');

    const steps: RefactorRoadmapStep[] = [];
    if (hasUpward) {
      steps.push({
        action: 'ADD_BOUNDARY',
        title: 'Introduce interface boundaries (Dependency Inversion)',
        rationale: 'Eliminate upward dependencies and enforce the Clean Architecture direction.',
      });
    }
    if (hasSkip) {
      steps.push({
        action: 'MOVE_MAPPING',
        title: 'Remove layer skips by moving mapping to Data',
        rationale: 'Kill UI→DB/NET shortcuts and keep transformations at the proper layer.',
      });
    }
    steps.push({
      action: 'SPLIT_REPO',
      title: 'Split repositories (single responsibility)',
      rationale: 'Reduce blast radius and improve testability by shrinking the “god repo”.',
    });
    steps.push({
      action: 'FEATURE_MODULE',
      title: 'Extract a feature module boundary',
      rationale: 'Reduce transitive deps and isolate failures behind a module wall.',
    });
    return steps;
  }

  private unlinkViolation(key: string): boolean {
    const [a, b] = key.split('->').map(n => Number(n));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return this.unlink(a!, b!);
  }

  getRefactorOptions(ticketId: number): RefactorOption[] {
    const t = this.tickets.find(x => x.id === ticketId);
    if (!t || t.kind !== 'ARCHITECTURE_DEBT') return [];

    const debt = this.architectureDebt;
    const hasUpward = this.archFindings.some(f => f.kind === 'UPWARD' || f.kind === 'UPWARD_SKIP');
    const hasSkip = this.archFindings.some(f => f.kind === 'SKIP' || f.kind === 'UPWARD_SKIP');

    const baseCost = this.preset === EVAL_PRESET.PRINCIPAL ? 120 : this.preset === EVAL_PRESET.STAFF ? 90 : 70;

    const principal = this.preset === EVAL_PRESET.PRINCIPAL;
    const cleanBonus = principal ? clamp(1 - debt / 100, 0, 1) : 1;

    const opts: RefactorOption[] = [
      {
        action: 'ADD_BOUNDARY',
        title: 'Introduce interface boundary (Dependency Inversion)',
        description: hasUpward
          ? 'Fix upward dependencies by extracting an interface in Domain and implementing it in Data.'
          : 'Strengthen layer boundaries to prevent future upward dependencies.',
        cost: baseCost + (hasUpward ? 40 : 0),
        debtDelta: -(hasUpward ? 35 : 20),
        scoreBonus: Math.round((principal ? 140 : 90) * cleanBonus),
      },
      {
        action: 'MOVE_MAPPING',
        title: 'Move mapping/DTOs to Data layer',
        description: hasSkip
          ? 'Remove UI→DB/NET shortcuts by moving mapping and composing through Repo/UseCase boundaries.'
          : 'Reduce layer skips by consolidating mapping in the correct layer.',
        cost: baseCost + (hasSkip ? 30 : 0),
        debtDelta: -(hasSkip ? 30 : 18),
        scoreBonus: Math.round((principal ? 120 : 80) * cleanBonus),
      },
      {
        action: 'SPLIT_REPO',
        title: 'Split repository (single responsibility)',
        description: 'Break a “god repo” into smaller repos to reduce blast radius and improve testability.',
        cost: baseCost + 60,
        debtDelta: -22,
        scoreBonus: Math.round((principal ? 160 : 100) * cleanBonus),
      },
      {
        action: 'FEATURE_MODULE',
        title: 'Extract feature module boundary',
        description: 'Create a module boundary to reduce transitive dependencies and isolate incidents.',
        cost: baseCost + 80,
        debtDelta: -28,
        scoreBonus: Math.round((principal ? 190 : 120) * cleanBonus),
      }
    ];

    // Keep only affordable options.
    return opts.filter(o => o.cost <= (this.budget + 1e-9));
  }

  applyRefactor(ticketId: number, action: RefactorAction, targetKey?: string): { ok: boolean; reason?: string } {
    this.recordAction('applyRefactor', [ticketId, action, targetKey]);
    const t = this.tickets.find(x => x.id === ticketId);
    if (!t) return { ok: false, reason: 'Ticket not found' };
    if (t.kind !== 'ARCHITECTURE_DEBT') return { ok: false, reason: 'Not an architecture debt ticket' };

    const opt = this.getRefactorOptions(ticketId).find(o => o.action === action);
    if (!opt) return { ok: false, reason: 'Refactor option not available (budget/constraints)' };

    if (this.budget < opt.cost) return { ok: false, reason: 'Not enough budget' };

    // Spend budget and apply effects.
    this.budget -= opt.cost;
    this.architectureDebt = clamp(this.architectureDebt + opt.debtDelta, 0, 100);
    this.score += opt.scoreBonus;

    // Refactors improve quality process a bit (slows coverage decay etc.)
    this.qualityProcess = clamp(this.qualityProcess + 0.10, 0, 1);

    // Internal unlink calls are a side effect of the refactor action; suppress
    // their own recordAction so replay doesn't double-apply them.
    const wasSuppressed = this.suppressActionLog;
    this.suppressActionLog = true;
    switch (action) {
      case 'ADD_BOUNDARY': {
        if (targetKey && this.unlinkViolation(targetKey)) {
          this.log('Refactor: removed selected illegal dependency edge.');
        } else {
          const worst = this.chooseWorstViolation();
          if (worst) {
            this.unlink(worst.fromId, worst.toId);
            this.log(`Refactor: removed illegal dependency ${worst.fromType} → ${worst.toType}`);
          }
        }
        break;
      }
      case 'MOVE_MAPPING': {
        if (targetKey && this.unlinkViolation(targetKey)) {
          this.log('Refactor: eliminated selected layer-skip edge.');
        } else {
          const worst = this.chooseWorstViolation();
          if (worst) {
            this.unlink(worst.fromId, worst.toId);
            this.log(`Refactor: eliminated layer skip ${worst.fromType} → ${worst.toType}`);
          }
        }
        this.jankPct = clamp(this.jankPct * 0.92, 0, 100);
        break;
      }
      case 'SPLIT_REPO': {
        this.spawnMul = clamp(this.spawnMul * 0.92, 0.5, 2.0);
        this.log('Refactor: repository split reduced incident blast radius.');
        break;
      }
      case 'FEATURE_MODULE': {
        this.spawnMul = clamp(this.spawnMul * 0.88, 0.5, 2.0);
        this.engCapacityMax = clamp(this.engCapacityMax + 1, 8, 30);
        this.log('Refactor: feature module boundary improved isolation and throughput.');
        break;
      }
    }
    this.suppressActionLog = wasSuppressed;

    // Close the debt ticket (completed refactor).
    this.tickets = this.tickets.filter(x => x.id !== ticketId);
    this.log(`Refactor complete: ${opt.title} (+${opt.scoreBonus} score)`);
    return { ok: true };
  }



  unlink(from: number, to: number): boolean {
    this.recordAction('unlink', [from, to]);
    const before = this.links.length;
    this.links = this.links.filter(l => !(l.from === from && l.to === to));
    return this.links.length !== before;
  }

  moveComponent(id: number, x: number, y: number) {
    const n = this.nodeById(id);
    if (!n) return;
    n.x = x; n.y = y;
  }

  private createTicket(kind: TicketKind, title: string, category: Ticket['category'], severity: TicketSeverity, impact: number, effort: number, reason?: string) {
    // Avoid duplicates of the same kind unless the existing one is deferred and old
    const existing = this.tickets.find(t => t.kind === kind && !t.deferred);
    if (existing) return;
    this.tickets.push({
      id: this.nextTicketId++,
      kind,
      title,
      category,
      severity,
      impact: clamp(impact, 0, 100),
      effort: clamp(effort, 1, 8),
      ageSec: 0,
      deferred: false,
      reason,
    });
  }

  /**
   * Run one tick of the cross-check gate for a signal-driven ticket. Bumps/decays
   * the candidate counter; on fire, creates the ticket with a reason string.
   */
  private gateSignalTicket(params: {
    kind: TicketKind;
    title: string;
    category: Ticket['category'];
    severity: TicketSeverity;
    impact: number;
    effort: number;
    active: boolean;
    primarySignal: number;
    corroborating: Array<{ source: 'OBS' | 'COVERAGE' | 'REG' | 'TIME' | 'HEAP' | 'FAIL'; strength: number }>;
  }): void {
    const prev = this.candidateTickets.get(params.kind);
    if (!params.active) {
      if (prev) this.candidateTickets.delete(params.kind);
      return;
    }
    const consecutive = (prev?.consecutive ?? 0) + 1;
    const firstSeenSec = prev?.firstSeenSec ?? this.timeSec;

    const input: CrossCheckInput = {
      kind: params.kind,
      severity: params.severity,
      primarySignal: clamp(params.primarySignal, 0, 1),
      corroboratingSignals: params.corroborating,
      obsTier: this.tierOf('OBS'),
      preset: this.preset,
      consecutiveTicks: consecutive,
    };
    const result = evaluateCrossCheck(input);

    this.candidateTickets.set(params.kind, { consecutive, firstSeenSec, lastReason: result.reason });

    if (result.fire) {
      this.createTicket(params.kind, params.title, params.category, params.severity, params.impact, params.effort, result.reason);
      // Once fired, clear the candidate so re-detection after a fix has fresh counters.
      this.candidateTickets.delete(params.kind);
    }
  }

  /** Loads a scripted scenario. The sim is reset with the scenario's seed + preset. */
  loadScenario(scenario: { id: string; seed: number; preset: EvalPreset; incidentScript: Array<{ atSec: number; kind: IncidentKind }> }, bounds: Bounds): void {
    this.setPreset(scenario.preset);
    this.reset(bounds, { seed: scenario.seed });
    this.scenarioId = scenario.id;
    this.scriptedIncidents.clear();
    for (const marker of scenario.incidentScript) {
      this.scriptedIncidents.set(marker.atSec, marker.kind);
    }
    // Log after reset so the entry survives into the run's action log. Encode
    // the scripted incident list so replay can reconstruct the same schedule.
    this.recordAction('loadScenario', [
      scenario.id,
      scenario.seed,
      scenario.preset,
      scenario.incidentScript.map(m => [m.atSec, m.kind] as [number, IncidentKind]),
    ]);
  }

  /** Returns the list of signals currently accumulating but not yet firing a ticket. */
  getCandidateAlerts(): Array<{ kind: TicketKind; reason: string; ticks: number }> {
    const out: Array<{ kind: TicketKind; reason: string; ticks: number }> = [];
    for (const [kind, c] of this.candidateTickets) {
      // Only surface candidates that aren't already live tickets.
      if (this.tickets.some(t => t.kind === kind && !t.deferred)) continue;
      out.push({ kind, reason: c.lastReason, ticks: c.consecutive });
    }
    return out;
  }

  private tickTickets(failureRate: number, anrRisk: number, _p95: number) {
    // Burnout check must see pre-regen capacity so a freshly-drained team counts
    // as a "zero hit" before regen tops it back up above 0.
    const preRegenCap = this.engCapacity;

    // Engineering capacity regen (can be upgraded, and gets a short burst during incidents)
    const regen = this.capacityRegenPerSec();
    this.engCapacity = clamp(this.engCapacity + regen, 0, this.engCapacityMax);

    // Age tickets and apply compounding pressure (DebtInterest-lite)
    for (const t of this.tickets) t.ageSec += 1;
    for (const a of this.advisories) a.ageSec += 1;

    // Burnout check: repeated zero-capacity moments within 90s accrue burnout.
    const hasBurnoutTicket = this.tickets.some(t => t.kind === 'BURNOUT');
    const burn = tickBurnout({
      capacityCur: preRegenCap,
      timeSec: this.timeSec,
      zeroHitTimesSec: this.burnoutZeroHits,
      burnoutLevel: this.burnoutLevel,
      hasBurnoutTicket,
    });
    this.burnoutZeroHits = burn.zeroHitTimesSec;
    this.burnoutLevel = burn.burnoutLevel;
    if (burn.createBurnoutTicket) {
      this.createTicket('BURNOUT', 'On-call burnout', 'Reliability', 2, 60, 4, 'Capacity hit zero 3+ times within 90s');
      this.addEvent('On-call team is burning out');
    }

    // Ticket generation runs through the cross-check layer: signal-level tickets
    // require corroboration from independent signals (cuts single-signal flapping).
    const heapRatio = this.heapMb / this.heapMaxMb;
    const coverageCorroboration = this.coverageRiskMult > 1.15 ? clamp((this.coverageRiskMult - 1) / 0.4, 0, 1) : 0;
    const obsTier = this.tierOf('OBS');
    const obsStrength = obsTier >= 1 ? 0.2 + obsTier * 0.15 : 0;
    const advisoryCount = this.advisories.filter(a => !a.mitigated).length;
    const advisoryStrength = clamp(advisoryCount / 2, 0, 1);
    const regStrength = clamp(this.regPressure / 100, 0, 1);

    this.gateSignalTicket({
      kind: 'CRASH_SPIKE', title: 'Crash spike', category: 'Reliability', severity: 3, impact: 85, effort: 5,
      active: failureRate > 0.08, primarySignal: failureRate,
      corroborating: [
        { source: 'COVERAGE', strength: coverageCorroboration },
        { source: 'OBS', strength: obsStrength },
        { source: 'FAIL', strength: clamp((failureRate - 0.08) / 0.08, 0, 1) },
      ],
    });
    this.gateSignalTicket({
      kind: 'ANR_RISK', title: 'ANR risk elevated', category: 'Reliability', severity: 3, impact: 80, effort: 5,
      active: anrRisk > 0.22, primarySignal: anrRisk,
      corroborating: [
        { source: 'HEAP', strength: clamp((heapRatio - 0.55) / 0.2, 0, 1) },
        { source: 'OBS', strength: obsStrength },
      ],
    });
    this.gateSignalTicket({
      kind: 'JANK', title: 'Jank regression', category: 'Performance', severity: 2, impact: 65, effort: 4,
      active: this.jankPct > 28, primarySignal: clamp(this.jankPct / 100, 0, 1),
      corroborating: [
        { source: 'HEAP', strength: clamp((heapRatio - 0.7) / 0.2, 0, 1) },
        { source: 'TIME', strength: clamp(this.gcPauseMs / 50, 0, 1) },
      ],
    });
    this.gateSignalTicket({
      kind: 'HEAP', title: 'Memory pressure', category: 'Performance', severity: 2, impact: 60, effort: 4,
      active: heapRatio > 0.78, primarySignal: heapRatio,
      corroborating: [
        { source: 'HEAP', strength: clamp(this.oomCount / 2, 0, 1) },
        { source: 'TIME', strength: clamp(this.gcPauseMs / 50, 0, 1) },
      ],
    });
    this.gateSignalTicket({
      kind: 'BATTERY', title: 'Battery complaints', category: 'Performance', severity: 1, impact: 45, effort: 3,
      active: this.battery < 25, primarySignal: clamp((25 - this.battery) / 25, 0, 1),
      corroborating: [{ source: 'TIME', strength: clamp(this.supportLoad / 100, 0, 1) }],
    });
    this.gateSignalTicket({
      kind: 'A11Y_REGRESSION', title: 'Accessibility regression', category: 'Accessibility', severity: 2, impact: 70, effort: 4,
      active: this.a11yScore < 80, primarySignal: clamp((80 - this.a11yScore) / 80, 0, 1),
      corroborating: [{ source: 'REG', strength: regStrength }],
    });
    this.gateSignalTicket({
      kind: 'PRIVACY_COMPLAINTS', title: 'Privacy complaints', category: 'Privacy', severity: 2, impact: 70, effort: 4,
      active: this.privacyTrust < 80, primarySignal: clamp((80 - this.privacyTrust) / 80, 0, 1),
      corroborating: [
        { source: 'REG', strength: regStrength },
        { source: 'OBS', strength: obsStrength },
      ],
    });
    this.gateSignalTicket({
      kind: 'SECURITY_EXPOSURE', title: 'Security exposure', category: 'Security', severity: 3, impact: 90, effort: 6,
      active: this.securityPosture < 78, primarySignal: clamp((78 - this.securityPosture) / 78, 0, 1),
      corroborating: [
        { source: 'REG', strength: regStrength },
        { source: 'OBS', strength: advisoryStrength },
      ],
    });

    // Platform compatibility tickets when new Android arrives
    if (this.platform.pressure > 0.55 && this.patch.compat < 0.40) {
      this.createTicket('COMPAT_ANDROID', `Compat on Android API ${this.platform.latestApi}`, 'Platform', 2, 60, 5);
    }

    // Apply backlog pressure into user perception and support load
    let backlogImpact = 0;
    let backlogSupport = 0;
    for (const t of this.tickets) {
      const age = clamp(t.ageSec / 240, 0, 2); // grows over ~4 minutes
      const sev = (t.severity + 1);
      const defer = t.deferred ? 0.6 : 1.0;
      backlogImpact += (t.impact / 100) * sev * 0.010 * (1 + 0.25 * age) * defer;
      backlogSupport += (t.impact / 100) * sev * 0.22 * (1 + 0.40 * age) * defer;
    }
    this.supportLoad = clamp(this.supportLoad + backlogSupport - 0.3, 0, 100);
    // Backlog nudges rating down slightly (review waves amplify it)
    this.rating = clamp(this.rating - backlogImpact, 1.0, 5.0);
  }

  private tickPlatformPulse() {
    const result = platformPulseTick(this.platform, this.timeSec, () => this.rand());
    this.platform = result.platform;
    if (result.newApiReleased) {
      this.addEvent(`New Android API ${this.platform.latestApi} released`);
    }
    if (result.deprecationTicket) {
      this.createTicket('COMPAT_ANDROID', `Consider dropping API ${this.platform.minApi} support`, 'Platform', 1, 35, 3);
    }

    // Staggered rollout phase amplifies or softens platform pressure on the live
    // population. Closed-beta buffer means a fresh API bump doesn't immediately
    // hit 100% of users — reward players who invest in qualityProcess.
    const rollout = tickRolloutPhase({
      phase: this.rolloutPhase,
      timeSec: this.timeSec,
      qualityProcess: this.qualityProcess,
      newApiReleased: result.newApiReleased,
    });
    this.rolloutPhase = rollout.phase;
    this.platform.pressure = clamp(this.platform.pressure * rollout.pressureAmplifier, 0, 1);
  }

  private tickZeroDayPulse() {
    // If we already have an active unmitigated advisory, keep pressure on
    const active = this.advisories.some(a => !a.mitigated);
    if (active) {
      const exposure = clamp(1 - (this.patch.security * 0.6 + this.patch.zeroDay * 0.6), 0, 1);
      this.securityPosture = clamp(this.securityPosture - 0.10 * exposure, 0, 100);
      this.privacyTrust = clamp(this.privacyTrust - 0.06 * exposure, 0, 100);
    }

    // Rare new advisory
    if (this.timeSec > 30 && this.timeSec % 210 === 0) {
      if (this.rand() < 0.28) {
        const deps: Advisory['dep'][] = ['net', 'image', 'json', 'auth', 'analytics'];
        const dep = deps[this.rng.int(0, deps.length - 1)]!;
        const sev: TicketSeverity = (this.rand() < 0.35 ? 3 : (this.rand() < 0.65 ? 2 : 1)) as TicketSeverity;

        // Determine exposure: if any placed component carries this dep, and we lack mitigations
        const hasDep = this.components.some(c => (COMPONENT_DEPS[c.type] ?? []).includes(dep));
        const mitigatedBy = (
          (dep === 'net' && (this.tierOf('PINNING') >= 2 || this.tierOf('ABUSE') >= 2)) ||
          (dep === 'auth' && this.tierOf('AUTH') >= 2) ||
          (dep === 'json' && this.tierOf('SANITIZER') >= 2) ||
          (dep === 'image' && this.patch.heap > 0.2) ||
          (dep === 'analytics' && this.tierOf('OBS') >= 2)
        );

        if (hasDep && !mitigatedBy) {
          const a: Advisory = {
            id: this.nextAdvisoryId++,
            dep,
            title: `Zero-day in ${dep.toUpperCase()} dependency`,
            severity: sev,
            ageSec: 0,
            mitigated: false,
          };
          this.advisories.push(a);
          this.addEvent(a.title);

          // Immediate trust hit
          this.securityPosture = clamp(this.securityPosture - (sev + 1) * 6, 0, 100);
          this.privacyTrust = clamp(this.privacyTrust - (sev + 1) * 4, 0, 100);

          // Create ticket
          this.createTicket('SECURITY_EXPOSURE', `Patch zero-day: ${dep}`, 'Security', 3, 92, 6);
        }
      }
    }
  }


  private regionTarget(code: RegionCode) {
    return computeRegionTarget({
      code,
      privacyTrust: this.privacyTrust,
      securityPosture: this.securityPosture,
      a11yScore: this.a11yScore,
      flagsTier: this.tierOf('FLAGS'),
      obsTier: this.tierOf('OBS'),
      keystoreTier: this.tierOf('KEYSTORE'),
      sanitizerTier: this.tierOf('SANITIZER'),
      platformPressure: this.platform.pressure,
    });
  }

  private tickRegMatrix() {
    const zeroDayActive = this.advisories.some(a => !a.mitigated);
    const zPressure = zeroDayActive ? 0.55 : 0.0;
    const coupling = applyRegionCoupling({ regions: this.regions });

    let weighted = 0;
    for (const r of this.regions) {
      const target = this.regionTarget(r.code);
      const decay = (zPressure + this.platform.pressure * 0.35) * ((r.code === 'EU' || r.code === 'UK') ? 1.15 : 1.0);
      const couplingDecay = coupling[r.code] ?? 0;
      const delta = (target - r.compliance) * 0.04 - decay * 0.10 - couplingDecay;
      r.compliance = clamp(r.compliance + delta, 0, 100);

      r.pressure = clamp((100 - r.compliance) / 60 + decay * 0.8, 0, 1);

      if (r.compliance < 55) {
        r.frozenSec = Math.max(r.frozenSec, 45);
        if (r.code === 'EU') this.createTicket('COMPLIANCE_EU', 'EU compliance gap', 'Platform', 2, 70, 5);
        if (r.code === 'US') this.createTicket('COMPLIANCE_US', 'US compliance gap', 'Platform', 2, 60, 4);
        if (r.code === 'UK') this.createTicket('COMPLIANCE_UK', 'UK compliance gap', 'Platform', 2, 65, 5);
      }

      if (r.frozenSec > 0) r.frozenSec = Math.max(0, r.frozenSec - 1);

      weighted += r.share * (1 - r.compliance / 100);
    }

    this.regPressure = clamp(weighted * 140 + (zeroDayActive ? 12 : 0), 0, 100);

    if (this.regPressure > 70 && this.timeSec % 60 === 0 && this.rand() < 0.20) {
      this.createTicket('STORE_REJECTION', 'Store policy risk', 'Platform', 2, 75, 5);
      this.addEvent('Policy enforcement risk increased');
      this.rating = clamp(this.rating - 0.06, 1.0, 5.0);
    }

    // Stronger effects when pressure is high
    if (this.regPressure > 55) {
      const extra = (this.regPressure - 55) / 100;
      this.supportLoad = clamp(this.supportLoad + extra * 0.9, 0, 100);
      this.rating = clamp(this.rating - extra * 0.012, 1.0, 5.0);
    }

    // Enforcement: audits and fines (minimalistic)
    if (this.regPressure > 78 && this.timeSec % 75 === 0) {
      if (this.rand() < 0.25) {
        this.createTicket('STORE_REJECTION', 'Audit request', 'Platform', 2, 70, 5);
        this.addEvent('Audit request opened');
      }
      if (this.rand() < 0.18) {
        const fine = Math.round(1200 + this.rand() * 2600);
        this.budget = Math.max(0, this.budget - fine);
        this.addEvent(`Regulatory fine ${fine}`);
        this.rating = clamp(this.rating - 0.08, 1.0, 5.0);
      }
    }




  }

private tickCoverageGate() {
  const input: CoverageGateInput = {
    coveragePct: this.coveragePct,
    coverageHist: this.coverageHist,
    lastCompCount: this.lastCompCount,
    componentCount: this.components.length,
    preset: this.preset,
    platformPressure: this.platform.pressure,
    regPressure: this.regPressure,
    qualityProcess: this.qualityProcess,
    coverageThreshold: this.coverageThreshold,
    timeSec: this.timeSec,
    flakyTestRate: this.flakyTestRate,
  };
  const result = coverageGateTick(input);
  this.coveragePct = result.coveragePct;
  this.coverageHist = result.coverageHist;
  this.lastCompCount = result.lastCompCount;
  this.coverageRiskMult = result.coverageRiskMult;
  this.flakyTestRate = result.flakyTestRate;
  if (result.belowThresholdTicket) {
    this.createTicket('TEST_COVERAGE', `Test coverage below ${this.coverageThreshold}%`, 'Reliability', 2, 68, 4);
  }
  if (result.regressionCrash) {
    this.addEvent('Escaped regression due to low coverage');
    this.createTicket('CRASH_SPIKE', 'Regression crash spike', 'Reliability', 3, 85, 5);
  }
  if (result.flakyMaskedRegression) {
    this.addEvent('Flaky suite masked a regression — shipped to users');
    this.createTicket('TEST_COVERAGE', 'Flaky suite masked regression', 'Reliability', 2, 72, 5, 'Flaky test rate > 10% allowed a regression past CI');
  }
}


  

  // --- realism helpers
  private calcMainThreadMs(p95: number): number {
    // Base UI work + extra cost from complexity, platform pressure, and regression risk.
    const complexity = this.components.length;
    const platform = this.platform.pressure; // 0..1
    const coveragePenalty = (this.coverageRiskMult - 1) * 6;
    const backlogPenalty = clamp(this.tickets.length / 10, 0, 1) * 3;
    const latencyPenalty = clamp((p95 - 140) / 400, 0, 1) * 4;
    return clamp(6 + complexity * 0.28 + platform * 8 + coveragePenalty + backlogPenalty + latencyPenalty, 4, 42);
  }

  private calcHeapDelta(): number {
    // Heap churn driven by traffic, complexity, device mix, and unmitigated incidents.
    const complexity = this.components.length;
    const lowRam = this.platform.lowRamShare; // 0..1
    const traffic = this.traffic; // 0..100
    const cacheTier = this.tierOf('CACHE');
    const cacheRelief = cacheTier * 0.35;
    const ticketHeat = clamp(this.tickets.length / 16, 0, 1) * 0.9;
    return clamp(traffic * 0.045 + complexity * 0.08 + lowRam * 2.2 + ticketHeat - cacheRelief, 0, 12);
  }
// --- simulation tick ------------------------------------------------------
  tick() {
    this.timeSec += 1;

    // Slow-moving world pressures.
    this.tickPlatformPulse();
    this.tickZeroDayPulse();

    this.tickCoverageGate();

    this.maybeIncident();

    // Android realism: frame budget, main-thread strictness, heap/GC
    let mainThreadMs = 0;
    let ioOnMain = 0;
    let heapDelta = 0;

    // compute component derived stats and sync queue lengths
    for (const n of this.components) {
      this.computeComponentStats(n);
      n.load = 0;
      n.queue = this.getQueue(n.id).length;
    }

    this.spawnRequests();

    const components = [...this.components].sort((a, b) => a.id - b.id);

    let ok = 0;
    let fail = 0;
    let anrPoints = 0;
    const latThisTick: number[] = [];

    for (const n of components) {
      const q = this.getQueue(n.id);
      if (q.length === 0) continue;

      const isMain = (n.type === 'UI' || n.type === 'VM' || n.type === 'DOMAIN');

      const cap = Math.floor(n.cap);
      const canProcess = Math.min(cap, q.length);
      const overflow = q.length - canProcess;

      if (overflow > 0 && isMain) anrPoints += overflow * 0.9;

      for (let i = 0; i < canProcess; i++) {
        const req = q.shift();
        if (!req) break;
        req.ttl -= 1;

        const a = ActionTypes[req.type] ?? ActionTypes.READ;

        const weight =
          (a.cpu * (isMain ? 1.2 : 1.0)) +
          (a.io * (n.type === 'DB' ? 1.3 : 0.4)) +
          (a.net * (n.type === 'NET' ? 1.4 : 0.2));

        n.load += weight;

        const queuePenalty = overflow > 0 ? overflow * 2.5 : 0;
        const latency = n.lat + queuePenalty + (a.heavyCPU ? 4 : 0);
        latThisTick.push(latency);

        // FrameGuard: approximate main thread time from CPU and heavy work
        if (isMain) {
          mainThreadMs += a.cpu * 4 + (a.heavyCPU ? 2 : 0);
        }

        // MainThreadGuard: IO on main increases ANR risk and jank
        if (isMain && (a.io + a.net) > 1.2) {
          ioOnMain += (a.io + a.net);
          anrPoints += (a.io + a.net) * 1.2;
          mainThreadMs += (a.io + a.net) * 2.5;
        }

        // HeapWatch: memory pressure from user actions
        heapDelta += memCostForAction(req.type) * (isMain ? 1.0 : 0.6);

        let failP = n.fail;
        // Architecture debt makes everything a bit more fragile.
        failP *= 1.0 + (this.architectureDebt / 100) * 0.25;
        if (n.type === 'NET') failP *= 1.0 + (a.net * 0.25);
        if (n.type === 'DB')  failP *= 1.0 + (a.io * 0.20);
        if (this.hasOBS()) failP *= 0.92;

        const didFail = (this.rand() < failP) || req.ttl <= 0 || n.down;
        if (didFail) {
          fail++;
          const blast = this.hasFLAGS() ? 0.55 : 1.0;
          n.health -= (6 + weight * 1.2) * blast;
          if (n.health <= 0) {
            n.down = true;
            n.health = 0;
            this.log(`${n.type} went DOWN.`);
          }
        } else {
          ok++;
          const targets = this.routeFrom(n, req.type);
          for (const tid of targets) {
            const tn = this.nodeById(tid);
            if (!tn || tn.down) continue;
            this.getQueue(tid).push(req);
          }
        }
      }

      const stress = (n.load > n.cap) ? (n.load - n.cap) : 0;
      if (stress > 0) n.health -= stress * 0.7;
      if (n.health <= 0) {
        n.down = true;
        n.health = 0;
      }

      if (n.type === 'WORK') {
        const workDrain = (canProcess + overflow * 0.5) * 0.06 * this.workRestriction;
        this.battery -= workDrain;
      }
    }

    this.reqOk = this.reqOk * 0.85 + ok * 0.15;
    this.reqFail = this.reqFail * 0.85 + fail * 0.15;
    this.anrPoints = this.anrPoints * 0.80 + anrPoints * 0.20;

    if (latThisTick.length) {
      this.latSamples.push(...latThisTick);
      this.latSamples = this.latSamples.slice(-400);
    }

    const total = this.reqOk + this.reqFail;
    const failureRate = total > 0 ? (this.reqFail / total) : 0;
    const anrRisk = clamp(this.anrPoints / 120, 0, 1);
    const p95 = percentile(this.latSamples, 0.95);

    // TicketFlow: generate/age tickets from current signals.
    this.tickTickets(failureRate, anrRisk, p95);

    mainThreadMs = Math.max(mainThreadMs, this.calcMainThreadMs(p95));




    // HeapWatch: decay and GC
    const cacheTier = this.tierOf('CACHE');
    const heapDecay = 1.6 + cacheTier * 0.6;
    heapDelta += this.calcHeapDelta();
    this.heapMb = clamp(this.heapMb + heapDelta - heapDecay, 0, this.heapMaxMb * 1.3);

    // Trigger GC when heap is high; GC pause shows up as jank
    this.gcPauseMs = 0;
    const heapRatio = this.heapMb / this.heapMaxMb;
    if (heapRatio > 0.78) {
      this.gcPauseMs = clamp((heapRatio - 0.70) * 140, 0, 80);
      this.heapMb = this.heapMb * 0.72;
    }

    // OOM crash (cascades into ANR spike)
    if (this.heapMb > this.heapMaxMb) {
      this.oomCount += 1;
      this.reqFail += 6;
      this.anrPoints = clamp(this.anrPoints + 20, 0, 120);
      this.rating = clamp(this.rating - 0.20, 1.0, 5.0);
      this.budget = Math.max(0, this.budget - 25);
      this.heapMb = this.heapMaxMb * 0.55;
      this.addEvent('OOM crash (ANR spike triggered)');
    }

    // FrameGuard: jank estimate (how far over 16ms we go), include GC pause
    const over = Math.max(0, (mainThreadMs + this.gcPauseMs) - this.frameBudgetMs);
    const jankBase = clamp(over / this.frameBudgetMs, 0, 3) * 100;
    const baseline = tickBaselineProfile({ active: this.baselineProfile, r8Enabled: this.r8Enabled });
    const jankNow = clamp(jankBase * (1 + this.platform.pressure * 0.30) * (1 - this.patch.jank * 0.35) * (1 + (this.coverageRiskMult - 1) * 0.25) * baseline.jankDamp, 0, 300);
    this.jankPct = this.jankPct * 0.85 + jankNow * 0.15;
    const slowPenalty = clamp((p95 - 120) / 500, 0, 1);

    // Support load: rises when the app hurts users; decays slowly when stable.
    const supportUp = failureRate * 18 + anrRisk * 10 + slowPenalty * 6;
    const supportDown = (failureRate < 0.05 && anrRisk < 0.15) ? 1.2 : 0.5;
    this.supportLoad = clamp(this.supportLoad + supportUp - supportDown, 0, 100);

    // Perception penalties (0..1)
    const a11yPenalty = clamp((100 - this.a11yScore) / 100, 0, 1);
    const privacyPenalty = clamp((100 - this.privacyTrust) / 100, 0, 1);
    const securityPenalty = clamp((100 - this.securityPosture) / 100, 0, 1);
    const supportPenalty = clamp(this.supportLoad / 100, 0, 1);

    const ratingDrop =
      failureRate * 0.35 +
      anrRisk * 0.25 +
      slowPenalty * 0.18 +
      (this.battery < 20 ? 0.08 : 0) +
      a11yPenalty * 0.10 +
      privacyPenalty * 0.12 +
      securityPenalty * 0.10 +
      supportPenalty * 0.06;

    const ratingGain =
      (failureRate < 0.03 &&
        anrRisk < 0.10 &&
        p95 < 160 &&
        this.a11yScore > 90 &&
        this.privacyTrust > 90 &&
        this.securityPosture > 90) ? 0.012 : 0.0;

    this.rating = clamp(this.rating - ratingDrop + ratingGain, 1.0, 5.0);

    // Slow natural recovery of perception metrics when things are stable.
    const stable = (failureRate < 0.05 && anrRisk < 0.15 && p95 < 220);

    const a11yTier = this.tierOf('A11Y');
    const authTier = this.tierOf('AUTH');
    const pinTier = this.tierOf('PINNING');
    const keyTier = this.tierOf('KEYSTORE');

    const a11yBoost = (a11yTier > 0) ? (0.10 + 0.06 * (a11yTier - 1)) : 0.02;
    const secBoost = (authTier > 0 ? 0.05 : 0) + (pinTier > 0 ? 0.04 : 0) + (keyTier > 0 ? 0.06 : 0);

    this.a11yScore = clamp(this.a11yScore + (stable ? a11yBoost : -slowPenalty * 0.5), 0, 100);
    this.securityPosture = clamp(this.securityPosture + (stable ? (0.06 + secBoost) : -failureRate * 3.5), 0, 100);
    this.privacyTrust = clamp(this.privacyTrust + (stable ? (0.05 + (keyTier > 0 ? 0.05 : 0)) : -failureRate * 2.2), 0, 100);

    // RegMatrix: update region compliance and store pressure.
    this.tickRegMatrix();

    // User reviews/votes happen periodically and tug rating in explainable ways.
    this.maybeReviewWave(failureRate, anrRisk, p95);

    const opsCost = 0.6 + (this.timeSec / 180) * 0.35;
    const incidentCost = failureRate > 0.2 ? 1.0 : 0;
    this.budget -= (opsCost + incidentCost);

    this.battery = clamp(this.battery + (this.running ? 0.06 : 0.12), 0, 100);

    // Score: accumulate per tick while the run is alive.
    // Combo multiplier: +20% score per tick while combo is active.
    if (this.comboActive && this.timeSec > this.comboUntil) {
      this.comboActive = false;
    }
    const comboMul = this.comboActive ? 1.20 : 1.0;
    const tickScore = this.calcTickScore(failureRate, anrRisk, p95) * comboMul;
    if (this.comboActive) this.comboBonusAccum += tickScore - this.calcTickScore(failureRate, anrRisk, p95);
    this.score += tickScore;

    // Shift complete: end the run in the target 8–10 minute window (per preset).
    // Only applies to active runs so unit tests that call tick() directly remain deterministic.
    if (this.running && this.timeSec >= this.getShiftDurationSec()) {
      this.endRun('SHIFT_COMPLETE', failureRate, anrRisk, p95);
      return;
    }

    if (this.budget <= 0 || this.rating <= 1.0) {
      this.budget = Math.max(0, this.budget);
      const reason: EndReason = (this.budget <= 0) ? 'BUDGET_DEPLETED' : 'RATING_COLLAPSED';
      this.endRun(reason, failureRate, anrRisk, p95);
    }
  }

  // --- UI snapshot ----------------------------------------------------------
  // --- UI snapshot ----------------------------------------------------------
  drainEvents(): SimEvent[] {
    const out = this.eventStream;
    // Preserve the full log so the postmortem grader can replay the run once
    // the UI has drained events (achievements/sparklines consume them on each sync).
    for (const ev of out) this.runEventLog.push(ev);
    this.eventStream = [];
    return out;
  }

  /** Returns a snapshot of the full retained event log for the current run. */
  getRunEventLog(): SimEvent[] {
    // Include any events still buffered in eventStream so callers get a complete view.
    return [...this.runEventLog, ...this.eventStream];
  }

  getUIState() {
    const total = this.reqOk + this.reqFail;
    const failureRate = total > 0 ? (this.reqFail / total) : 0;
    const anrRisk = clamp(this.anrPoints / 120, 0, 1);
    const p95 = percentile(this.latSamples, 0.95);
    const selected = this.selected();
    return {
      mode: this.mode,
      running: this.running,
      timeSec: this.timeSec,
      budget: this.budget,
      rating: this.rating,
      seed: this.seed,
      score: this.score,
      architectureDebt: this.architectureDebt,
      lastRun: this.lastRun ?? undefined,

      battery: this.battery,
      failureRate,
      anrRisk,
      p95LatencyMs: p95,
      jankPct: this.jankPct,
      heapMb: this.heapMb,
      gcPauseMs: this.gcPauseMs,
      oomCount: this.oomCount,

      a11yScore: this.a11yScore,
      privacyTrust: this.privacyTrust,
      securityPosture: this.securityPosture,
      supportLoad: this.supportLoad,

      votes: { ...this.votes },
      recentReviews: [...this.recentReviews],

      selected: selected ? {
        id: selected.id,
        name: selected.type,
        stats: this.componentStats(selected),
        canUpgrade: selected.tier < 3,
        canRepair: selected.health < 100 || selected.down,
        canDelete: true
      } : undefined,

      eventsText: this.eventLines.length ? this.eventLines.join('\n') : 'No incidents… yet.',

      comboActive: this.comboActive,
      comboCount: this.comboCount,
      comboUntilSec: this.comboUntil,
    };
  }

  describeComponent(n: Component): string {
    const def = ComponentDefs[n.type];
    return (
      `health=${n.health.toFixed(0)}  down=${n.down ? 'yes' : 'no'}\n` +
      `cap=${n.cap.toFixed(1)}  load=${n.load.toFixed(1)}  queue=${this.getQueue(n.id).length}\n` +
      `fail=${(n.fail * 100).toFixed(2)}%  lat~${n.lat.toFixed(0)}ms\n` +
      `${def.desc}`
    );
  }

  

  private addEvent(
    msg: string,
    opts?: { category?: 'INCIDENT' | 'OTHER'; source?: 'INCIDENT_HEAD' }
  ) {
    // Keep a lightweight incident/event log for the UI.
    // Newest first, capped to avoid unbounded growth.
    const category: 'INCIDENT' | 'OTHER' = opts?.category ?? ((
      msg.startsWith('Fixed ticket:') ||
      msg.startsWith('New Android API')
    ) ? 'OTHER' : 'INCIDENT');

    // Shield now gates on INCIDENT_HEAD source — it only fires on the top-level
    // incident dispatch, not on cascading sub-events like OOM/advisory/review waves.
    // The actual damage softening happens in softenIncident() called by maybeIncident.
    if (opts?.source === 'INCIDENT_HEAD' && this.incidentShieldCharges > 0) {
      msg = `🛡 Shield softened: ${msg}`;
    }

    const tag = this.timeSec > 0 ? `t+${this.timeSec}s` : 't+0s';
    this.eventLines.unshift(`${tag}  ${msg}`);
    if (this.eventLines.length > 18) this.eventLines.length = 18;
    this.lastEventAt = this.timeSec;
    if (category === 'INCIDENT') this.incidentCount++;
    // On-call adrenaline: a brief capacity regen burst when incidents hit.
    // addEvent is the single writer so incident-category cascades also ramp regen.
    if (category === 'INCIDENT') this.engAdrenalineUntil = this.timeSec + 22;

    this.eventStream.push({ type: 'EVENT', atSec: this.timeSec, category, msg });
  }

  // Snapshot + soften helpers for the incident shield.
  private snapshotShieldState() {
    return {
      rating: this.rating,
      budget: this.budget,
      privacyTrust: this.privacyTrust,
      securityPosture: this.securityPosture,
      a11yScore: this.a11yScore,
      supportLoad: this.supportLoad,
      spawnMul: this.spawnMul,
      netBadness: this.netBadness,
      workRestriction: this.workRestriction,
      heapMb: this.heapMb,
      jankPct: this.jankPct,
      gcPauseMs: this.gcPauseMs,
      anrPoints: this.anrPoints,
      reqFail: this.reqFail,
    };
  }

  private softenIncident(pre: ReturnType<GameSim['snapshotShieldState']>) {
    // Shield dampener: roll back 60% of the observable damage this incident caused.
    // Leaves 40% of the damage — matches the ×0.4 scaling the design calls for.
    const down = (preV: number, curV: number) => curV < preV ? curV + (preV - curV) * 0.6 : curV;
    const up = (preV: number, curV: number) => curV > preV ? curV - (curV - preV) * 0.6 : curV;

    this.rating = down(pre.rating, this.rating);
    this.budget = down(pre.budget, this.budget);
    this.privacyTrust = down(pre.privacyTrust, this.privacyTrust);
    this.securityPosture = down(pre.securityPosture, this.securityPosture);
    this.a11yScore = down(pre.a11yScore, this.a11yScore);
    this.supportLoad = up(pre.supportLoad, this.supportLoad);
    this.spawnMul = up(pre.spawnMul, this.spawnMul);
    this.netBadness = up(pre.netBadness, this.netBadness);
    this.workRestriction = up(pre.workRestriction, this.workRestriction);
    this.heapMb = up(pre.heapMb, this.heapMb);
    this.jankPct = up(pre.jankPct, this.jankPct);
    this.gcPauseMs = up(pre.gcPauseMs, this.gcPauseMs);
    this.anrPoints = up(pre.anrPoints, this.anrPoints);
    this.reqFail = up(pre.reqFail, this.reqFail);
  }

// --- internal helpers -----------------------------------------------------
  private selected(): Component | undefined {
    if (!this.selectedId) return undefined;
    return this.nodeById(this.selectedId) ?? undefined;
  }

  private nodeById(id: number): Component | undefined {
    return this.components.find(n => n.id === id);
  }

  private outLinks(id: number): number[] {
    return this.links.filter(l => l.from === id).map(l => l.to);
  }

  private getQueue(id: number): Request[] {
    const existing = this.queues.get(id);
    if (existing) return existing;
    const fresh: Request[] = [];
    this.queues.set(id, fresh);
    return fresh;
  }

  private createComponent(type: ComponentType, x: number, y: number): Component {
    return {
      id: this.nextId++,
      type,
      x, y,
      r: 22,
      tier: 1,
      health: 100,
      down: false,
      load: 0,
      queue: 0,
      cap: 0,
      lat: 0,
      fail: 0
    };
  }


  private componentStats(n: Component): string {
    // NOTE: Internally this sim uses generic queue/cap/lat/fail.
    // Here we *present* those in Android-ish language so "Repository" doesn't look like an HTTP server.
    this.computeComponentStats(n);

    const downstream = this.outLinks(n.id).length;
    const cap = n.cap;
    const lat = n.lat;
    const fail = n.fail * 100;
    const q = n.queue;

    const health = `${Math.round(n.health)}%${n.down ? ' (DOWN)' : ''}`;
    const tier = `Tier ${n.tier}`;

    const fmt = (label: string, value: string) => `${label} ${value}`;

    // Label map per component type (Android mental model)
    let capLabel = 'Ops/tick';
    let latLabel = 'Latency';
    let failLabel = 'Error rate';
    let qLabel = 'Backlog';

    switch (n.type) {
      case 'UI':
        capLabel = 'UI events/tick';
        latLabel = 'Render cost';
        failLabel = 'Crash risk';
        qLabel = 'Main-thread backlog';
        break;
      case 'VM':
        capLabel = 'State updates/tick';
        latLabel = 'Dispatch latency';
        failLabel = 'Exception rate';
        qLabel = 'Pending intents';
        break;
      case 'DOMAIN':
        capLabel = 'Use-cases/tick';
        latLabel = 'CPU time';
        failLabel = 'Logic error rate';
        qLabel = 'Pending work';
        break;
      case 'REPO':
        capLabel = 'Data calls/tick';
        latLabel = 'I/O latency';
        failLabel = 'Exception rate';
        qLabel = 'Request backlog';
        break;
      case 'CACHE':
        capLabel = 'Reads/tick';
        latLabel = 'Cache access';
        failLabel = 'Miss penalty';
        qLabel = 'Pending reads';
        break;
      case 'DB':
        capLabel = 'Queries/tick';
        latLabel = 'Query latency';
        failLabel = 'DB error rate';
        qLabel = 'Pending queries';
        break;
      case 'NET':
        capLabel = 'Requests/tick';
        latLabel = 'Network RTT';
        failLabel = 'Timeout rate';
        qLabel = 'Pending requests';
        break;
      case 'WORK':
        capLabel = 'Jobs/tick';
        latLabel = 'Job duration';
        failLabel = 'Retry rate';
        qLabel = 'Queued jobs';
        break;
      case 'AUTH':
      case 'PINNING':
      case 'KEYSTORE':
        capLabel = 'Auth ops/tick';
        latLabel = 'Crypto latency';
        failLabel = 'Auth error rate';
        qLabel = 'Pending ops';
        break;
      case 'SANITIZER':
        capLabel = 'Events/tick';
        latLabel = 'Sanitize cost';
        failLabel = 'Leak risk';
        qLabel = 'Pending events';
        break;
      case 'OBS':
        capLabel = 'Spans/tick';
        latLabel = 'Tracing overhead';
        failLabel = 'Drop rate';
        qLabel = 'Buffered spans';
        break;
      case 'FLAGS':
        capLabel = 'Reads/tick';
        latLabel = 'Lookup latency';
        failLabel = 'Stale rate';
        qLabel = 'Pending reads';
        break;
      case 'A11Y':
        capLabel = 'Checks/tick';
        latLabel = 'Audit overhead';
        failLabel = 'Violation rate';
        qLabel = 'Pending checks';
        break;
      case 'ABUSE':
        capLabel = 'Reports/tick';
        latLabel = 'Triage latency';
        failLabel = 'False-negative rate';
        qLabel = 'Pending reports';
        break;
      case 'BILLING':
        capLabel = 'Purchases/tick';
        latLabel = 'Settle latency';
        failLabel = 'Chargeback risk';
        qLabel = 'Pending settlements';
        break;
      case 'PUSH':
        capLabel = 'Notifications/tick';
        latLabel = 'Delivery latency';
        failLabel = 'Drop rate';
        qLabel = 'Pending pushes';
        break;
      case 'DEEPLINK':
        capLabel = 'Intents/tick';
        latLabel = 'Route latency';
        failLabel = 'Rejected rate';
        qLabel = 'Pending intents';
        break;
    }

    // Units: present lat as ms, cap as integer, fail as percent.
    const line1 = `${tier} • Health ${health}`;
    const line2 = `${fmt(capLabel + ' •', `${cap.toFixed(0)}`)} • ${fmt(latLabel + ' •', `${Math.round(lat)}ms`)} • ${fmt(failLabel + ' •', `${fail.toFixed(2)}%`)}`;
    const line3 = `${fmt(qLabel + ' •', `${q}`)} • Downstream deps ${downstream}`;

    return [line1, line2, line3].join('\n');
  }

  private computeComponentStats(n: Component) {
    const def = ComponentDefs[n.type];
    const tierMul = [0, 1.0, 1.35, 1.85][n.tier]!;

    // Throughput scales strongly with tier, but health/down can crush it.
    n.cap = def.baseCap * tierMul * (n.down ? 0 : (0.35 + (n.health / 100) * 0.65));

    // Latency improves with tier for I/O-ish components; degrades when health is low.
    const ioish = (n.type === 'REPO' || n.type === 'DB' || n.type === 'NET' || n.type === 'WORK' || n.type === 'CACHE');
    const tierLatMul = ioish ? (1.0 / (1 + (n.tier - 1) * 0.22)) : (1.0 / (1 + (n.tier - 1) * 0.12));
    const healthLatMul = 1.0 + (1 - (n.health / 100)) * 0.55;
    n.lat = def.baseLat * tierLatMul * healthLatMul;

    // Failure rate improves with tier, worsens with low health.
    const tierFailMul = 1.0 / (1 + (n.tier - 1) * 0.55);
    const healthFailMul = 1.0 + (1 - (n.health / 100)) * 1.25;
    n.fail = def.baseFail * tierFailMul * healthFailMul;

    // Global network badness impacts NET and anything that depends heavily on NET.
    if (n.type === 'NET') n.fail *= this.netBadness;

    // Clamp to sensible ranges.
    n.fail = clamp(n.fail, 0.0005, 0.25);
    n.lat = clamp(n.lat, 0, 2000);
    if (n.down) n.cap = 0;
  }


  private hasOBS(): boolean { return this.has('OBS'); }

  private hasFLAGS(): boolean { return this.has('FLAGS'); }

  private tierOf(type: ComponentType): 0 | 1 | 2 | 3 {
    const n = this.components.find(n => n.type === type && !n.down);
    return (n ? n.tier : 0) as 0 | 1 | 2 | 3;
  }

  private has(type: ComponentType): boolean {
    return this.tierOf(type) > 0;
  }

  private upgradeCost(n: Component): number {
    const def = ComponentDefs[n.type];
    return def.upgrade[n.tier] ?? 999;
  }

  private repairCost(n: Component): number {
    const base = (100 - n.health) * 0.6 + (n.down ? 40 : 0);
    const obsMult = this.hasOBS() ? 0.85 : 1.0;
    const supportMult = clamp(1.0 + (this.supportLoad / 180), 1.0, 1.6);
    return Math.ceil(base * obsMult * supportMult);
  }

  private spawnRequests() {
    const growth = 1 + (this.timeSec / 90);
    const base = 7.5 * growth * this.spawnMul;

    // Expose a simple 0..100 "traffic" signal for other heuristics (heap/GC, etc).
    // Rough mapping: base ~7.5 at t=0 => traffic ~45.
    this.traffic = clamp(base * 6, 0, 100);

    const mix: Array<[ActionKey, number]> = [
      ['SCROLL', 0.28],
      ['READ',   0.24],
      ['WRITE',  0.15],
      ['SEARCH', 0.15],
      ['UPLOAD', 0.10],
      ['SYNC',   0.08]
    ];

    const uiComponent = this.components.find(n => n.type === 'UI');
    const workComponent = this.components.find(n => n.type === 'WORK');
    if (!uiComponent || uiComponent.down) return;

    for (const [t, p] of mix) {
      const want = base * p;
      const floor = Math.floor(want);
      const count = floor + (this.rand() < (want - floor) ? 1 : 0);
      if (count <= 0) continue;

      for (let i = 0; i < count; i++) {
        const origin = (t === 'SYNC' && workComponent && !workComponent.down) ? workComponent : uiComponent;
        this.getQueue(origin.id).push({ type: t, ttl: 20 });
      }
    }
  }

  private routeFrom(component: Component, reqType: ActionKey): number[] {
    const outs = this.outLinks(component.id)
      .map(id => this.nodeById(id))
      .filter((n): n is Component => Boolean(n))
      .filter(n => !n.down);

    if (outs.length === 0) return [];

    if (component.type !== 'REPO') {
      return [outs[0]!.id];
    }

    const cache = outs.find(n => n.type === 'CACHE');
    const db = outs.find(n => n.type === 'DB');
    const net = outs.find(n => n.type === 'NET');

    const targets: number[] = [];

    if (reqType === 'UPLOAD') {
      if (net) targets.push(net.id);
      return targets;
    }

    if (reqType === 'WRITE') {
      if (db) targets.push(db.id);
      if (net && this.rand() < 0.25) targets.push(net.id);
      return targets;
    }

    if (reqType === 'SYNC') {
      if (net) targets.push(net.id);
      if (db) targets.push(db.id);
      return targets;
    }

    // READ/SCROLL/SEARCH
    if (cache) targets.push(cache.id);

    const cacheTier = cache ? cache.tier : 0;
    const baseHit = reqType === 'SEARCH' ? 0.15 : 0.40;
    const hit = clamp(baseHit + (cacheTier - 1) * 0.18, 0, 0.88);
    const isHit = cache ? (this.rand() < hit) : false;

    if (!isHit && db) targets.push(db.id);
    if (reqType === 'SCROLL' && net && this.rand() < 0.55) targets.push(net.id);
    if (reqType === 'SEARCH' && net && this.rand() < 0.20) targets.push(net.id);

    return targets.length ? targets : [outs[0]!.id];
  }


  private maybeReviewWave(failureRate: number, anrRisk: number, p95: number) {
    if (this.timeSec < this.nextReviewAt) return;

    // schedule next wave (reviews are "bursty")
    const nextIn = 22 + Math.floor(this.rand() * 16);
    this.nextReviewAt = this.timeSec + nextIn;

    const perfPenalty = clamp((p95 - 160) / 480, 0, 1) + anrRisk * 0.35;
    const reliabilityPenalty = clamp(failureRate * 3.2 + anrRisk * 0.45, 0, 1);
    const privacyPenalty = clamp((100 - this.privacyTrust) / 100, 0, 1);
    const a11yPenalty = clamp((100 - this.a11yScore) / 100, 0, 1);
    const batteryPenalty = clamp((100 - this.battery) / 100, 0, 1);

    const penalties: Array<['perf'|'reliability'|'privacy'|'a11y'|'battery', number]> = [
      ['perf', perfPenalty],
      ['reliability', reliabilityPenalty],
      ['privacy', privacyPenalty],
      ['a11y', a11yPenalty],
      ['battery', batteryPenalty]
    ];

    penalties.sort((a, b) => b[1] - a[1]);
    const top = penalties[0]!;

    // If everything is fine, you still get the occasional "love it" review.
    if (top[1] < 0.12) {
      const positives = [
        'Smooth and stable lately. Nice.',
        'Fast, reliable, no drama. Keep it up.',
        'Works great on my device. Finally.',
        'No crashes, no battery drain - chef’s kiss.'
      ];
      const snippet = positives[this.rng.int(0, positives.length - 1)]!;
      this.recentReviews.unshift(snippet);
      this.recentReviews = this.recentReviews.slice(0, 6);
      this.rating = clamp(this.rating + 0.03, 1.0, 5.0);
      return;
    }

    const [topKey, topVal] = top;

    const sample = Math.round(30 + (this.timeSec / 30) + this.spawnMul * 15);
    const votes = Math.max(1, Math.round(sample * topVal * 0.6));
    this.votes[topKey as keyof typeof this.votes] += votes;

    // rating nudge (reviews are noisy, so keep it small per wave)
    this.rating = clamp(this.rating - (0.10 * topVal), 1.0, 5.0);

    const snippet = this.makeReviewSnippet(topKey, topVal, p95, failureRate, anrRisk);
    this.recentReviews.unshift(snippet);
    this.recentReviews = this.recentReviews.slice(0, 6);
  }

  private makeReviewSnippet(
    kind: 'perf'|'reliability'|'privacy'|'a11y'|'battery',
    severity01: number,
    p95: number,
    failureRate: number,
    anrRisk: number
  ): string {
    const sev = severity01 < 0.35 ? 'meh' : severity01 < 0.70 ? 'bad' : 'awful';

    switch (kind) {
      case 'perf':
        return `${sev}: Feels laggy/janky. p95 ~${Math.round(p95)}ms.`;
      case 'reliability':
        return `${sev}: Crashes/ANRs after the update (${(failureRate * 100).toFixed(1)}% failures, ${(anrRisk * 100).toFixed(1)}% ANR risk).`;
      case 'privacy':
        return `${sev}: Privacy vibes are off. Trust=${Math.round(this.privacyTrust)}/100.`;
      case 'a11y':
        return `${sev}: Accessibility issues (labels/contrast/focus). A11y=${Math.round(this.a11yScore)}/100.`;
      case 'battery':
        return `${sev}: Battery drain is wild. Battery=${Math.round(this.battery)}/100.`;
    }
  }


  private bumpSupport(v: number) {
    this.supportLoad = clamp(this.supportLoad + v, 0, 100);
  }

  // Route an incident-handler headline through addEvent so it flows into the
  // eventStream (achievements + shield gating) and fires the adrenaline burst.
  private incidentHead(msg: string) {
    this.addEvent(msg, { category: 'INCIDENT', source: 'INCIDENT_HEAD' });
  }

  private hitTrust(privacyDelta: number, securityDelta: number, a11yDelta = 0) {
    this.privacyTrust = clamp(this.privacyTrust + privacyDelta, 0, 100);
    this.securityPosture = clamp(this.securityPosture + securityDelta, 0, 100);
    this.a11yScore = clamp(this.a11yScore + a11yDelta, 0, 100);
  }

  private readonly incidentHandlers: Record<IncidentKind, (tiers: IncidentTiers) => void> = {
    TRAFFIC_SPIKE: ({ abuseTier }) => {
      const damp = (abuseTier > 0) ? (0.65 - 0.08 * (abuseTier - 1)) : 1.0;
      this.spawnMul = clamp(this.spawnMul + 0.25 * damp, 1.0, 3.0);
      this.bumpSupport(2 + (abuseTier === 0 ? 3 : 1));
      this.incidentHead('Marketing spike: action load increased.');
    },

    NET_WOBBLE: ({ obsTier }) => {
      const damp = (obsTier > 0) ? 0.85 : 1.0;
      this.netBadness = clamp(this.netBadness + 0.25 * damp, 1.0, 3.0);
      this.bumpSupport(3);
      this.incidentHead('Backend wobbles: network failures increased.');
    },

    OEM_RESTRICTION: () => {
      this.workRestriction = clamp(this.workRestriction + 0.35, 1.0, 3.0);
      this.bumpSupport(2);
      this.incidentHead('OEM restriction: background work drains more.');
    },

    MITM: ({ pinTier }) => {
      if (pinTier === 0) {
        const p = -(18 + this.rand() * 10);
        const s = -(22 + this.rand() * 10);
        this.hitTrust(p, s);
        this.netBadness = clamp(this.netBadness + 0.15, 1.0, 3.0);
        this.bumpSupport(10);
        this.rating = clamp(this.rating - 0.22, 1.0, 5.0);
        this.incidentHead('MITM attempt: user trust took a hit (add TLS pinning).');
      } else {
        this.netBadness = clamp(this.netBadness + 0.05, 1.0, 3.0);
        this.bumpSupport(2);
        this.incidentHead('MITM attempt blocked by TLS pinning.');
      }
    },

    CERT_ROTATION: ({ pinTier }) => {
      if (pinTier === 0) {
        this.netBadness = clamp(this.netBadness + 0.18, 1.0, 3.0);
        this.bumpSupport(3);
        this.incidentHead('Cert rotation upstream: brief network turbulence.');
        return;
      }
      if (pinTier === 1) {
        this.netBadness = clamp(this.netBadness + 0.35, 1.0, 3.0);
        this.bumpSupport(12);
        this.rating = clamp(this.rating - 0.15, 1.0, 5.0);
        this.incidentHead('Cert rotated: pinning broke requests (upgrade pinning or use flags).');
      } else {
        this.netBadness = clamp(this.netBadness + 0.12, 1.0, 3.0);
        this.bumpSupport(4);
        this.incidentHead('Cert rotated: pinning handled it (minor hiccup).');
      }
    },

    TOKEN_THEFT: ({ authTier }) => {
      if (authTier === 0) {
        this.hitTrust(-8, -22);
        this.bumpSupport(15);
        this.rating = clamp(this.rating - 0.18, 1.0, 5.0);
        this.incidentHead('Session/token issue: account takeovers reported (add Auth hardening).');
      } else {
        this.bumpSupport(3);
        this.incidentHead('Suspicious sessions detected and contained by Auth.');
      }
    },

    CRED_STUFFING: ({ abuseTier }) => {
      if (abuseTier === 0) {
        this.netBadness = clamp(this.netBadness + 0.22, 1.0, 3.0);
        this.spawnMul = clamp(this.spawnMul + 0.12, 1.0, 3.0);
        this.bumpSupport(14);
        this.incidentHead('Credential stuffing: auth endpoints hammered (add Abuse protection).');
      } else {
        this.netBadness = clamp(this.netBadness + 0.10, 1.0, 3.0);
        this.bumpSupport(5);
        this.incidentHead('Credential stuffing mitigated by rate limiting.');
      }
    },

    DEEP_LINK_ABUSE: ({ sanTier }) => {
      if (sanTier === 0) {
        for (const t of ['UI','VM','DOMAIN'] as const) {
          const n = this.components.find(n => n.type === t && !n.down);
          if (n) n.health = clamp(n.health - (12 + this.rand() * 10), 0, 100);
        }
        this.bumpSupport(10);
        this.rating = clamp(this.rating - 0.12, 1.0, 5.0);
        this.incidentHead('Deep link abuse: malformed inputs causing crashes (add Sanitizer).');
      } else {
        this.bumpSupport(3);
        this.incidentHead('Deep link abuse attempt sanitized.');
      }
    },

    A11Y_REGRESSION: ({ a11yTier }) => {
      if (a11yTier === 0) {
        this.hitTrust(0, 0, -(22 + this.rand() * 10));
        this.bumpSupport(8);
        this.rating = clamp(this.rating - 0.10, 1.0, 5.0);
        this.incidentHead('A11y regression shipped: labels/contrast complaints (add A11y layer).');
      } else {
        this.hitTrust(0, 0, -(6 + this.rand() * 6));
        this.bumpSupport(3);
        this.incidentHead('Minor accessibility regression caught (A11y layer helps).');
      }
    },

    SDK_SCANDAL: ({ keyTier, flagsTier }) => {
      const blast = flagsTier >= 2 ? 0.55 : 1.0;
      if (keyTier === 0) {
        this.hitTrust(-25 * blast, -10 * blast);
        this.bumpSupport(12);
        this.rating = clamp(this.rating - 0.18 * blast, 1.0, 5.0);
        this.incidentHead('3rd-party SDK scandal: privacy trust tanking (add Keystore/Crypto + flags).');
      } else {
        this.hitTrust(-10 * blast, -4 * blast);
        this.bumpSupport(6);
        this.rating = clamp(this.rating - 0.08 * blast, 1.0, 5.0);
        this.incidentHead('3rd-party SDK issue: reduced impact due to crypto hardening.');
      }
    },

    MEMORY_LEAK: ({ cacheTier }) => {
      const severity = cacheTier >= 2 ? 0.5 : (cacheTier >= 1 ? 0.75 : 1.0);
      this.heapMb = clamp(this.heapMb + 30 * severity, 0, this.heapMaxMb);
      this.jankPct = clamp(this.jankPct + 8 * severity, 0, 100);
      this.gcPauseMs = clamp(this.gcPauseMs + 12 * severity, 0, 80);
      this.bumpSupport(4);
      if (cacheTier === 0) {
        this.incidentHead('Memory leak detected: heap growing, jank increasing (add Cache).');
      } else {
        this.incidentHead('Memory leak detected: cache layer limiting impact.');
      }
    },

    REGION_OUTAGE: () => {
      const regionIdx = this.rng.int(0, this.regions.length - 1);
      const region = this.regions[regionIdx]!;
      region.frozenSec = Math.max(region.frozenSec, 60);
      region.compliance = clamp(region.compliance - 8, 0, 100);
      this.bumpSupport(6);
      this.rating = clamp(this.rating - 0.06, 1.0, 5.0);
      this.incidentHead(`Regional outage: ${region.code} store frozen for 60s.`);
    },

    ANR_ESCALATION: ({ obsTier }) => {
      const anrRisk = clamp(this.anrPoints / 120, 0, 1);
      if (anrRisk > 0.30) {
        this.reqFail += 4;
        this.rating = clamp(this.rating - 0.15, 1.0, 5.0);
        this.jankPct = clamp(this.jankPct + 12, 0, 100);
        this.bumpSupport(10);
        this.incidentHead('ANR escalation: watchdog killed process, crash storm triggered.');
        this.createTicket('CRASH_SPIKE', 'ANR watchdog crash cascade', 'Reliability', 3, 90, 6);
      } else {
        this.anrPoints = clamp(this.anrPoints + 15, 0, 120);
        this.bumpSupport(3);
        const damp = obsTier > 0 ? ' (OBS helping)' : '';
        this.incidentHead(`ANR warning: main thread under pressure${damp}.`);
      }
    },

    IAP_FRAUD: ({ billingTier, abuseTier, authTier }) => {
      const hardened = billingTier >= 2 && abuseTier >= 1;
      const playIntegrity = tickPlayIntegrity({ abuseTier, authTier });
      if (!hardened) {
        const fine = Math.round((80 + this.rand() * 60) * playIntegrity.damageScale);
        this.budget = Math.max(0, this.budget - fine);
        this.hitTrust(-4 * playIntegrity.damageScale, -8 * playIntegrity.damageScale);
        this.bumpSupport(9 * playIntegrity.damageScale);
        this.rating = clamp(this.rating - 0.12 * playIntegrity.damageScale, 1.0, 5.0);
        const head = playIntegrity.active ? ' (Play Integrity helping)' : '';
        this.incidentHead(`IAP fraud wave: $${fine} chargebacks + security hit${head}.`);
        this.createTicket('SECURITY_EXPOSURE', 'IAP fraud chargebacks', 'Security', 3, 88, 6);
      } else {
        this.bumpSupport(2);
        this.incidentHead('IAP fraud wave: BILLING+ABUSE contained the damage.');
      }
    },

    PUSH_ABUSE: ({ pushTier, sanTier }) => {
      const hardened = pushTier >= 2 && sanTier >= 1;
      if (!hardened) {
        this.hitTrust(-10, 0);
        this.votes.privacy += Math.max(1, Math.round(4 + this.rand() * 3));
        this.bumpSupport(8);
        this.rating = clamp(this.rating - 0.12, 1.0, 5.0);
        this.incidentHead('Push abuse: notification spam complaints (harden PUSH + SANITIZER).');
        this.createTicket('PRIVACY_COMPLAINTS', 'Push notification abuse', 'Privacy', 2, 72, 4);
      } else {
        this.bumpSupport(2);
        this.incidentHead('Push abuse: token hygiene + sanitization contained it.');
      }
    },

    DEEP_LINK_EXPLOIT: ({ deeplinkTier, sanTier }) => {
      const hardened = deeplinkTier >= 2 || sanTier >= 2;
      if (!hardened) {
        for (const t of ['UI','VM','DOMAIN'] as const) {
          const n = this.components.find(n => n.type === t && !n.down);
          if (n) n.health = clamp(n.health - (10 + this.rand() * 8), 0, 100);
        }
        this.bumpSupport(10);
        this.rating = clamp(this.rating - 0.15, 1.0, 5.0);
        this.incidentHead('Deep-link exploit: targeted intent crashed main pipeline (add DEEPLINK or SANITIZER).');
      } else {
        this.bumpSupport(2);
        this.incidentHead('Deep-link exploit rejected at the entry point.');
      }
    },
  };

  private maybeIncident() {
    // decay modifiers slowly
    this.spawnMul *= 0.985;
    this.netBadness *= 0.988;
    this.workRestriction *= 0.989;

    // reduce support load very slowly over time (support team is doing their best)
    this.supportLoad = clamp(this.supportLoad - 0.08, 0, 100);

    // Scenario scripted incidents fire at exact ticks and bypass the roll gates.
    // rand() is not consumed so same seed + same scenario = identical sequence.
    const scripted = this.scriptedIncidents.get(this.timeSec);
    if (scripted) {
      this.lastEventAt = this.timeSec;
      this.recentIncidentTimes = this.recentIncidentTimes.filter(t => this.timeSec - t < 60);
      this.recentIncidentTimes.push(this.timeSec);
      const tiers: IncidentTiers = {
        authTier: this.tierOf('AUTH'),
        pinTier: this.tierOf('PINNING'),
        keyTier: this.tierOf('KEYSTORE'),
        sanTier: this.tierOf('SANITIZER'),
        abuseTier: this.tierOf('ABUSE'),
        a11yTier: this.tierOf('A11Y'),
        flagsTier: this.tierOf('FLAGS'),
        obsTier: this.tierOf('OBS'),
        cacheTier: this.tierOf('CACHE'),
        billingTier: this.tierOf('BILLING'),
        pushTier: this.tierOf('PUSH'),
        deeplinkTier: this.tierOf('DEEPLINK'),
      };
      this.dispatchIncident(scripted, tiers);
      return;
    }

    if (this.timeSec - this.lastEventAt < 26) return;

    // security posture influences how often weird things happen
    const incidentChance = clamp(0.44 + (1 - this.securityPosture / 100) * 0.10, 0.35, 0.60);
    if (this.rand() > incidentChance) return;

    this.lastEventAt = this.timeSec;

    // Compound damage: incidents within 60s of each other hit harder.
    this.recentIncidentTimes = this.recentIncidentTimes.filter(t => this.timeSec - t < 60);
    this.recentIncidentTimes.push(this.timeSec);
    const compoundCount = this.recentIncidentTimes.length;
    if (compoundCount >= 3) {
      const compoundPenalty = (compoundCount - 2) * 0.04;
      this.rating = clamp(this.rating - compoundPenalty, 1.0, 5.0);
      this.supportLoad = clamp(this.supportLoad + compoundCount * 2, 0, 100);
    }

    const tiers: IncidentTiers = {
      authTier: this.tierOf('AUTH'),
      pinTier: this.tierOf('PINNING'),
      keyTier: this.tierOf('KEYSTORE'),
      sanTier: this.tierOf('SANITIZER'),
      abuseTier: this.tierOf('ABUSE'),
      a11yTier: this.tierOf('A11Y'),
      flagsTier: this.tierOf('FLAGS'),
      obsTier: this.tierOf('OBS'),
      cacheTier: this.tierOf('CACHE'),
      billingTier: this.tierOf('BILLING'),
      pushTier: this.tierOf('PUSH'),
      deeplinkTier: this.tierOf('DEEPLINK'),
    };

    // Weighted roll across incident types. Order and call-count of this.rand()
    // must stay identical to preserve seeded determinism.
    const roll = this.rand();
    const table: Array<[IncidentKind, number]> = [
      ['TRAFFIC_SPIKE',    0.13],
      ['NET_WOBBLE',       0.12],
      ['OEM_RESTRICTION',  0.10],
      ['CRED_STUFFING',    0.06],
      ['TOKEN_THEFT',      0.08],
      ['DEEP_LINK_ABUSE',  0.06],
      ['MITM',             0.08],
      ['CERT_ROTATION',    0.05],
      ['A11Y_REGRESSION',  0.04],
      ['SDK_SCANDAL',      0.04],
      ['MEMORY_LEAK',      0.06],
      ['REGION_OUTAGE',    0.04],
      ['ANR_ESCALATION',   0.03],
      // v0.3.0 monetization / engagement / entry-point incidents
      ['IAP_FRAUD',        0.04],
      ['PUSH_ABUSE',       0.04],
      ['DEEP_LINK_EXPLOIT',0.03],
    ];

    let acc = 0;
    let kind: IncidentKind = table[0]![0];
    for (const [k, w] of table) {
      acc += w;
      if (roll <= acc) { kind = k; break; }
    }

    this.dispatchIncident(kind, tiers);
  }

  private dispatchIncident(kind: IncidentKind, tiers: IncidentTiers) {
    const shieldActive = this.incidentShieldCharges > 0;
    const snap = shieldActive ? this.snapshotShieldState() : null;
    this.incidentHandlers[kind](tiers);
    if (shieldActive && snap) {
      this.softenIncident(snap);
      this.incidentShieldCharges -= 1;
    }
  }


  private calcTickScore(failureRate: number, anrRisk: number, p95: number): number {
    const stability =
      clamp(1 - failureRate * 1.8, 0, 1) *
      clamp(1 - anrRisk * 0.9, 0, 1) *
      clamp(1 - (this.jankPct / 100) * 0.9, 0, 1) *
      clamp(1 - (p95 / 450), 0, 1);

    const quality =
      clamp(this.a11yScore / 100, 0, 1) *
      clamp(this.privacyTrust / 100, 0, 1) *
      clamp(this.securityPosture / 100, 0, 1);

    let comp = 1.0;
    if (this.regions.length) {
      const sumShare = this.regions.reduce((s, r) => s + r.share, 0) || 1;
      const weighted = this.regions.reduce((s, r) => s + (r.compliance / 100) * r.share, 0) / sumShare;
      comp = clamp(weighted, 0, 1);
    }

    const debtPenalty = 1 - (this.architectureDebt / 100) * 0.30;
    const base = (stability * 0.60 + quality * 0.20 + comp * 0.20) * 10;
    return clamp(base * debtPenalty, 0, 12);
  }

  private scoreMultiplier(): number {
    if (this.preset === EVAL_PRESET.STAFF) return 1.12;
    if (this.preset === EVAL_PRESET.PRINCIPAL) {
      const mult = 1.22 - (this.architectureDebt / 100) * 0.50;
      return clamp(mult, 0.72, 1.22);
    }
    return 1.0;
  }

  private evaluateBonuses(reason: EndReason): ScoreBonus[] {
    const bonuses: ScoreBonus[] = [];
    if (reason !== 'SHIFT_COMPLETE') return bonuses;

    // Preset-specific bonus objectives
    if (this.preset === EVAL_PRESET.JUNIOR_MID) {
      bonuses.push({ id: 'survived', label: 'Survived the shift', pct: 0.15 });
    }
    if (this.preset === EVAL_PRESET.SENIOR && this.engRefillsUsed === 0) {
      bonuses.push({ id: 'no_refills', label: 'Zero refills used', pct: 0.20 });
    }
    if (this.preset === EVAL_PRESET.STAFF && Math.round(this.architectureDebt) === 0) {
      bonuses.push({ id: 'zero_debt', label: 'Zero architecture debt', pct: 0.25 });
    }
    if (this.preset === EVAL_PRESET.PRINCIPAL && this.incidentCount === 0 && this.rating >= 4.8) {
      bonuses.push({ id: 'flawless', label: 'Flawless (zero incidents, rating >= 4.8)', pct: 0.30 });
    }

    // Universal bonuses (any preset, SHIFT_COMPLETE only)
    if (this.tickets.length === 0) {
      bonuses.push({ id: 'clean_desk', label: 'Clean desk (zero open tickets)', pct: 0.10 });
    }
    if (this.rating >= 4.8) {
      bonuses.push({ id: 'high_rating', label: 'High rating (>= 4.8)', pct: 0.10 });
    }

    return bonuses;
  }

  private endRunMultiplier(reason: EndReason): number {
    if (reason === 'BUDGET_DEPLETED') return 0.70;
    if (reason === 'RATING_COLLAPSED') return 0.50;
    return 1.0;
  }

  private endRun(reason: EndReason, failureRate: number, anrRisk: number, p95: number) {
    // endRun is idempotent per run: once lastRun exists, subsequent invocations
    // (from post-terminal ticks re-checking rating/budget) are no-ops. Prevents
    // redundant replay verification on every tick past the true end.
    if (this.lastRun) return;
    this.running = false;
    this.eventStream.push({ type: 'RUN_END', atSec: this.timeSec, reason });

    const baseMult = this.scoreMultiplier();
    const endMult = this.endRunMultiplier(reason);
    const bonuses = this.evaluateBonuses(reason);
    const bonusMult = 1 + bonuses.reduce((sum, b) => sum + b.pct, 0);
    const totalMult = baseMult * endMult * bonusMult;

    const raw = Math.max(0, this.score);
    const finalScore = Math.round(raw * totalMult);
    const runId = `${this.seed}-${Date.now()}`;

    const summary: string[] = [
      `END: ${reason.replace('_', ' ')}`,
      `Preset: ${this.preset}`,
      `Seed: ${this.seed}`,
      `Duration: ${Math.floor(this.timeSec)}s`,
      `Final score: ${finalScore} (x${totalMult.toFixed(2)})`,
      `Rating: ${this.rating.toFixed(1)}★ • Budget: $${Math.round(this.budget)}`,
      `Failure: ${(failureRate * 100).toFixed(1)}% • ANR: ${(anrRisk * 100).toFixed(1)}% • P95: ${Math.round(p95)}ms`,
      `Jank: ${Math.round(this.jankPct)}% • Heap: ${Math.round(this.heapMb)}MB`,
      `Architecture debt: ${Math.round(this.architectureDebt)}/100 • Tickets open: ${this.tickets.length}`,
    ];

    if (reason !== 'SHIFT_COMPLETE') {
      summary.push(`Failure penalty: x${endMult.toFixed(2)}`);
    }
    if (bonuses.length) {
      summary.push('Bonuses:');
      for (const b of bonuses) summary.push(`  +${Math.round(b.pct * 100)}% ${b.label}`);
    }

    const top = this.tickets
      .slice()
      .sort((a, b) => (b.severity - a.severity) || (b.impact - a.impact) || (b.ageSec - a.ageSec))
      .slice(0, 3);
    if (top.length) {
      summary.push('Top issues:');
      for (const t of top) summary.push(`- ${t.kind}: ${t.title}`);
    }

    this.lastRun = {
      runId,
      seed: this.seed,
      preset: this.preset,
      endReason: reason,
      endedAtTs: Date.now(),
      durationSec: Math.floor(this.timeSec),
      rawScore: Math.round(raw),
      finalScore,
      multiplier: totalMult,
      bonuses,
      rating: this.rating,
      budget: this.budget,
      failureRate,
      anrRisk,
      p95LatencyMs: p95,
      jankPct: this.jankPct,
      heapMb: this.heapMb,
      architectureDebt: this.architectureDebt,
      ticketsOpen: this.tickets.length,
      summaryLines: summary
    };

    // Compute the postmortem grade and append its callouts to the human summary.
    const grade = gradePostmortem(this.getRunEventLog(), this.lastRun);
    this.lastRun.summaryLines.push(`Postmortem grade: ${grade.letter}`);
    for (const c of grade.callouts) this.lastRun.summaryLines.push(`- ${c}`);
    this.lastGrade = grade;

    // Replay verification: run the action log against a fresh sim and compare
    // sim-side score. Any mismatch points at tampered state or a missed
    // recordAction hook. Skip when we're already inside a replay
    // (suppressActionLog = true) to avoid infinite recursion, and when the
    // run was never actually started (action log may be empty or minimal).
    if (!this.suppressActionLog && this.actionLog.length > 0) {
      try {
        const liveSimScore = this.score;
        const replayed = replayActionLog({
          seed: this.seed,
          preset: this.preset,
          log: this.actionLog.slice(),
          bounds: { width: 800, height: 600 },
          untilTimeSec: this.timeSec,
        });
        // Accept small float drift (the sim has compounding multiplications).
        const drift = Math.abs(replayed.simScore - liveSimScore);
        this.lastRun.verified = drift < 1e-6;
      } catch {
        this.lastRun.verified = false;
      }
    }

    // Make the end visible in the on-screen log.
    this.log('RUN ENDED.');
    this.log(`POSTMORTEM\n${summary.join('\n')}`);
  }

  private log(msg: string) {
    this.eventLines.unshift(`[t=${this.timeSec.toFixed(0)}] ${msg}`);
    this.eventLines = this.eventLines.slice(0, 6);
  }
}


function memCostForAction(t: ActionKey): number {
  switch (t) {
    case 'SCROLL': return 0.6;
    case 'UPLOAD': return 2.2;
    case 'SEARCH': return 1.2;
    case 'WRITE': return 0.9;
    case 'READ': return 0.5;
    case 'SYNC': return 0.8;
    default: return 0.6;
  }
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.floor((a.length - 1) * p);
  return a[idx] ?? 0;
}

// keep ACTION_KEYS referenced so tree-shaking doesn't confuse users reading code
void ACTION_KEYS;