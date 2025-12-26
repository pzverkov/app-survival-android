export const MODE = {
  SELECT: 'SELECT',
  LINK: 'LINK',
  UNLINK: 'UNLINK'
} as const;
export type Mode = typeof MODE[keyof typeof MODE];

export const COMPONENT_TYPES = [
  'UI','VM','DOMAIN','REPO','CACHE','DB','NET','WORK','OBS','FLAGS',
  'AUTH','PINNING','KEYSTORE','SANITIZER','ABUSE','A11Y'
] as const;
export type ComponentType = typeof COMPONENT_TYPES[number];

export const ACTION_KEYS = [
  'READ','WRITE','SEARCH','UPLOAD','SCROLL','SYNC'
] as const;
export type ActionKey = typeof ACTION_KEYS[number];

export type Link = { from: number; to: number };

export type ActionDef = {
  cpu: number;
  io: number;
  net: number;
  cacheable: boolean;
  heavyCPU: boolean;
  label: string;
};

export type ComponentDef = {
  baseCap: number;
  baseLat: number;
  baseFail: number;
  cost: number;
  upgrade: [number, number, number, number];
  desc: string;
};

export type Component = {
  id: number;
  type: ComponentType;
  x: number;
  y: number;
  r: number;
  tier: 1 | 2 | 3;
  health: number;
  down: boolean;

  load: number;
  queue: number;

  cap: number;
  lat: number;
  fail: number;
};

export type Request = { type: ActionKey; ttl: number };

export type UIState = {
  mode: Mode;
  running: boolean;
  timeSec: number;

  budget: number;
  rating: number;

  // Run meta
  seed: number;
  score: number;
  architectureDebt: number;
  lastRun?: RunResult;

  // Tech metrics
  battery: number;
  failureRate: number; // 0..1
  anrRisk: number; // 0..1
  p95LatencyMs: number;
  jankPct: number; // 0..100
  heapMb: number;
  gcPauseMs: number;
  oomCount: number;

  // Perception metrics (0..100)
  a11yScore: number;
  privacyTrust: number;
  securityPosture: number;
  supportLoad: number;

  // User votes (running totals)
  votes: {
    perf: number;
    reliability: number;
    privacy: number;
    a11y: number;
    battery: number;
  };
  recentReviews: string[];

  selected?: {
    id: number;
    name: string;
    stats: string;
    canUpgrade: boolean;
    canRepair: boolean;
    canDelete: boolean;
  };

  eventsText: string;
};



export type TicketSeverity = 0 | 1 | 2 | 3;

export type TicketKind =
  | 'CRASH_SPIKE'
  | 'ANR_RISK'
  | 'JANK'
  | 'HEAP'
  | 'BATTERY'
  | 'A11Y_REGRESSION'
  | 'PRIVACY_COMPLAINTS'
  | 'SECURITY_EXPOSURE'
  | 'COMPAT_ANDROID'
  | 'COMPLIANCE_EU'
  | 'COMPLIANCE_US'
  | 'COMPLIANCE_UK'
  | 'STORE_REJECTION'
  | 'TEST_COVERAGE'
  | 'ARCHITECTURE_DEBT';

export type Ticket = {
  id: number;
  kind: TicketKind;
  title: string;
  category: 'Reliability' | 'Performance' | 'Accessibility' | 'Privacy' | 'Security' | 'Platform';
  severity: TicketSeverity;
  impact: number;   // 0..100
  effort: number;   // 1..8
  ageSec: number;
  deferred: boolean;
};

export type Advisory = {
  id: number;
  dep: 'net' | 'image' | 'json' | 'auth' | 'analytics';
  title: string;
  severity: TicketSeverity;
  ageSec: number;
  mitigated: boolean;
};

export type PlatformState = {
  latestApi: number;
  minApi: number;
  oldDeviceShare: number; // 0..1
  lowRamShare: number;    // 0..1
  pressure: number;       // 0..1
};


export type RegionCode = 'EU' | 'US' | 'UK' | 'IN' | 'BR' | 'GLOBAL';

export type RegionState = {
  code: RegionCode;
  share: number;        // 0..1
  compliance: number;   // 0..100
  pressure: number;     // 0..1
  frozenSec: number;    // seconds remaining of rollout freeze
};


export type EndReason =
  | 'BUDGET_DEPLETED'
  | 'RATING_COLLAPSED';

export type RunResult = {
  runId: string;
  seed: number;
  preset: EvalPreset;
  endReason: EndReason;
  endedAtTs: number;
  durationSec: number;

  rawScore: number;
  finalScore: number;
  multiplier: number;

  // End-of-run snapshot
  rating: number;
  budget: number;
  failureRate: number;
  anrRisk: number;
  p95LatencyMs: number;
  jankPct: number;
  heapMb: number;

  architectureDebt: number;
  ticketsOpen: number;

  // Human-readable postmortem
  summaryLines: string[];
};


export type ScoreEntry = Pick<
  RunResult,
  'runId' | 'seed' | 'preset' | 'endReason' | 'endedAtTs' | 'durationSec' | 'finalScore' | 'multiplier' | 'architectureDebt' | 'rating'
>;


export const EVAL_PRESET = {
  JUNIOR_MID: 'JUNIOR_MID',
  SENIOR: 'SENIOR',
  STAFF: 'STAFF',
  PRINCIPAL: 'PRINCIPAL'
} as const;
export type EvalPreset = typeof EVAL_PRESET[keyof typeof EVAL_PRESET];
