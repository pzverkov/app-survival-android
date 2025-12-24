export const MODE = {
  SELECT: 'SELECT',
  LINK: 'LINK',
  UNLINK: 'UNLINK'
} as const;
export type Mode = typeof MODE[keyof typeof MODE];

export const NODE_TYPES = [
  'UI','VM','DOMAIN','REPO','CACHE','DB','NET','WORK','OBS','FLAGS',
  'AUTH','PINNING','KEYSTORE','SANITIZER','ABUSE','A11Y'
] as const;
export type NodeType = typeof NODE_TYPES[number];

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

export type NodeDef = {
  baseCap: number;
  baseLat: number;
  baseFail: number;
  cost: number;
  upgrade: [number, number, number, number];
  desc: string;
};

export type Node = {
  id: number;
  type: NodeType;
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

  // Tech metrics
  battery: number;
  failureRate: number; // 0..1
  anrRisk: number; // 0..1
  p95LatencyMs: number;

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

