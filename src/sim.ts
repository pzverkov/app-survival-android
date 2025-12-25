
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
};

import { ACTION_KEYS, ActionDef, ActionKey, Link, MODE, Mode, Component, ComponentDef, ComponentType, Request, Ticket, TicketKind, TicketSeverity, Advisory, PlatformState, RegionState, RegionCode, EvalPreset, EVAL_PRESET } from './types';

export const ComponentDefs: Record<ComponentType, ComponentDef> = {
  UI:       { baseCap: 14, baseLat: 10, baseFail: 0.004, cost: 40,  upgrade: [0, 60, 90, 0],   desc: 'Screens / Compose' },
  VM:       { baseCap: 12, baseLat:  8, baseFail: 0.003, cost: 45,  upgrade: [0, 70, 110, 0],  desc: 'State holder, throttling' },
  DOMAIN:   { baseCap: 11, baseLat:  9, baseFail: 0.003, cost: 55,  upgrade: [0, 80, 120, 0],  desc: 'UseCases / business rules' },
  REPO:     { baseCap: 10, baseLat: 10, baseFail: 0.004, cost: 70,  upgrade: [0, 95, 140, 0],  desc: 'Source of truth, routing' },
  CACHE:    { baseCap: 16, baseLat:  3, baseFail: 0.002, cost: 90,  upgrade: [0, 120, 170, 0], desc: 'Memory/disk cache (hit rate upgrades)' },
  DB:       { baseCap:  8, baseLat: 20, baseFail: 0.006, cost: 120, upgrade: [0, 160, 220, 0], desc: 'Room DB (indices matter)' },
  NET:      { baseCap:  9, baseLat: 25, baseFail: 0.010, cost: 110, upgrade: [0, 150, 210, 0], desc: 'OkHttp/Retrofit (retries can bite)' },
  WORK:     { baseCap:  6, baseLat: 18, baseFail: 0.008, cost: 80,  upgrade: [0, 120, 170, 0], desc: 'WorkManager (battery risk)' },

  // Sidecars (mostly reduce incident impact)
  OBS:      { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 60,  upgrade: [0, 80, 110, 0],  desc: 'Observability (lower failure impact, cheaper repairs)' },
  FLAGS:    { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 60,  upgrade: [0, 80, 110, 0],  desc: 'Feature flags (reduce blast radius / rollback)' },

  // Security + trust features
  AUTH:     { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 75,  upgrade: [0, 110, 160, 0], desc: 'Auth & sessions (limits token/replay damage)' },
  PINNING:  { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 85,  upgrade: [0, 120, 175, 0], desc: 'TLS pinning (blocks MITM; cert rotations hurt if weak)' },
  KEYSTORE: { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 95,  upgrade: [0, 130, 190, 0], desc: 'Keystore/Crypto (protects data-at-rest)' },
  SANITIZER:{ baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 70,  upgrade: [0, 105, 150, 0], desc: 'Input sanitizer (deep link/payload hardening)' },
  ABUSE:    { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 80,  upgrade: [0, 115, 165, 0], desc: 'Abuse protection (rate limit / credential stuffing)' },

  // Accessibility
  A11Y:     { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 70,  upgrade: [0, 100, 145, 0], desc: 'Accessibility layer (labels, contrast, focus order)' }
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
  | 'SDK_SCANDAL';

export type Bounds = { width: number; height: number };

export class GameSim {
  private nextId = 1;


  // TicketFlow
  engCapacity = 12;
  engCapacityMax = 12;
  tickets: Ticket[] = [];
  private nextTicketId = 1;

  // ZeroDayPulse
  advisories: Advisory[] = [];
  private nextAdvisoryId = 1;

  // PlatformPulse
  platform: PlatformState = {
    latestApi: 35,
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

  private lastEventAt = 0;
  private eventLines: string[] = [];

  private queues = new Map<number, Request[]>();

  reset(bounds: Bounds) {
    this.mode = MODE.SELECT;
    this.running = false;
    this.timeSec = 0;

    this.budget = 3000;
    this.rating = 5.0;
    this.battery = 100;


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

    this.lastEventAt = 0;
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

    this.link(nUI.id, nVM.id);
    this.link(nVM.id, nD.id);
    this.link(nD.id,  nR.id);
    this.link(nR.id,  nC.id);
    this.link(nC.id,  nDB.id);
    this.link(nR.id,  nN.id);
    this.link(nW.id,  nR.id);

    this.selectedId = nR.id;
  }

  // --- tickets / platform --------------------------------------------------
  getTickets(): Ticket[] { return this.tickets; }
  getCapacity() { return { cur: this.engCapacity, max: this.engCapacityMax }; }
  getPlatform(): PlatformState { return { ...this.platform }; }
  getRegions(): RegionState[] { return this.regions.map(r => ({ ...r })); }
  getRegPressure(): number { return this.regPressure; }
  getCoverage() { return { pct: this.coveragePct, threshold: this.coverageThreshold, preset: this.preset }; }
  setPreset(p: EvalPreset) {
    this.preset = p;
    this.coverageThreshold = (p === EVAL_PRESET.STAFF) ? 75 : 70;
  }
  getAdvisories(): Advisory[] { return this.advisories; }

  fixTicket(id: number) {
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
    }
    // If this was driven by a zero-day, mark advisories mitigated faster
    if (t.kind === 'SECURITY_EXPOSURE') {
      for (const a of this.advisories) a.mitigated = true;
      this.patch.zeroDay = clamp(this.patch.zeroDay + 0.60, 0, 1);
    }
    this.tickets = this.tickets.filter(x => x.id !== id);
    this.addEvent(`Fixed ticket: ${t.title}`);
  }

  deferTicket(id: number) {
    const t = this.tickets.find(x => x.id === id);
    if (!t) return;
    t.deferred = !t.deferred;
  }

  // --- public CRUD ----------------------------------------------------------
  addComponent(type: ComponentType, x: number, y: number): { ok: boolean; reason?: string; id?: number } {
    const def = ComponentDefs[type];
    if (this.budget < def.cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= def.cost;
    const n = this.createComponent(type, x, y);
    this.components.push(n);
    this.selectedId = n.id;
    return { ok: true, id: n.id };
  }

  deleteSelected(): boolean {
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
    if (from === to) return false;
    if (this.links.some(l => l.from === from && l.to === to)) return false;
    this.links.push({ from, to });
    return true;
  }

  unlink(from: number, to: number): boolean {
    const before = this.links.length;
    this.links = this.links.filter(l => !(l.from === from && l.to === to));
    return this.links.length !== before;
  }

  moveComponent(id: number, x: number, y: number) {
    const n = this.nodeById(id);
    if (!n) return;
    n.x = x; n.y = y;
  }

  private createTicket(kind: TicketKind, title: string, category: Ticket['category'], severity: TicketSeverity, impact: number, effort: number) {
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
    });
  }

  private tickTickets(failureRate: number, anrRisk: number, _p95: number) {
    // Engineering capacity regen: about 12 points per minute
    this.engCapacity = clamp(this.engCapacity + 0.20, 0, this.engCapacityMax);

    // Age tickets and apply compounding pressure (DebtInterest-lite)
    for (const t of this.tickets) t.ageSec += 1;
    for (const a of this.advisories) a.ageSec += 1;

    // Ticket generation from signals
    if (failureRate > 0.08) this.createTicket('CRASH_SPIKE', 'Crash spike', 'Reliability', 3, 85, 5);
    if (anrRisk > 0.22) this.createTicket('ANR_RISK', 'ANR risk elevated', 'Reliability', 3, 80, 5);
    if (this.jankPct > 28) this.createTicket('JANK', 'Jank regression', 'Performance', 2, 65, 4);
    if (this.heapMb / this.heapMaxMb > 0.78) this.createTicket('HEAP', 'Memory pressure', 'Performance', 2, 60, 4);
    if (this.battery < 25) this.createTicket('BATTERY', 'Battery complaints', 'Performance', 1, 45, 3);
    if (this.a11yScore < 80) this.createTicket('A11Y_REGRESSION', 'Accessibility regression', 'Accessibility', 2, 70, 4);
    if (this.privacyTrust < 80) this.createTicket('PRIVACY_COMPLAINTS', 'Privacy complaints', 'Privacy', 2, 70, 4);
    if (this.securityPosture < 78) this.createTicket('SECURITY_EXPOSURE', 'Security exposure', 'Security', 3, 90, 6);

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
    // Market shifts slowly away from old devices
    this.platform.oldDeviceShare = clamp(this.platform.oldDeviceShare - 0.00018, 0.06, 0.40);
    this.platform.lowRamShare = clamp(this.platform.lowRamShare - 0.00015, 0.08, 0.45);

    // New Android release event occasionally (kept frequent for game pacing)
    if (this.timeSec > 0 && this.timeSec % 180 === 0) {
      if (Math.random() < 0.35) {
        this.platform.latestApi += 1;
        this.platform.pressure = clamp(this.platform.pressure + 0.65, 0, 1);
        this.addEvent(`New Android API ${this.platform.latestApi} released`);
      }
    }

    // Pressure decays as teams patch and users update
    this.platform.pressure = clamp(this.platform.pressure * 0.985 - 0.0005, 0, 1);

    // Optional deprecation hint: if old share is small, dropping min SDK becomes tempting
    if (this.timeSec % 240 === 0 && this.platform.oldDeviceShare < 0.12 && this.platform.minApi < this.platform.latestApi - 9) {
      this.createTicket(
        'COMPAT_ANDROID',
        `Consider dropping API ${this.platform.minApi} support`,
        'Platform',
        1,
        35,
        3
      );
    }
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
      if (Math.random() < 0.28) {
        const deps: Advisory['dep'][] = ['net', 'image', 'json', 'auth', 'analytics'];
        const dep = deps[Math.floor(Math.random() * deps.length)];
        const sev: TicketSeverity = (Math.random() < 0.35 ? 3 : (Math.random() < 0.65 ? 2 : 1)) as TicketSeverity;

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
    const base = (
      0.45 * this.privacyTrust +
      0.40 * this.securityPosture +
      0.15 * this.a11yScore
    );

    let strictPrivacy = 0;
    let strictSecurity = 0;
    if (code === 'EU') { strictPrivacy = 10; strictSecurity = 4; }
    if (code === 'UK') { strictPrivacy = 8; strictSecurity = 4; }
    if (code === 'US') { strictPrivacy = 2; strictSecurity = 10; }
    if (code === 'IN') { strictPrivacy = 4; strictSecurity = 6; }
    if (code === 'BR') { strictPrivacy = 6; strictSecurity = 6; }

    const hasFlags = this.tierOf('FLAGS') >= 1 ? 1 : 0;
    const hasObs = this.tierOf('OBS') >= 1 ? 1 : 0;
    const hasKeystore = this.tierOf('KEYSTORE') >= 1 ? 1 : 0;
    const hasSan = this.tierOf('SANITIZER') >= 1 ? 1 : 0;

    const controlBoost = 2.0 * hasFlags + 1.5 * hasObs + 2.0 * hasKeystore + 1.5 * hasSan;
    const platformPenalty = this.platform.pressure * 8;

    return clamp(base + controlBoost - platformPenalty - strictPrivacy - strictSecurity, 35, 98);
  }

  private tickRegMatrix() {
    const zeroDayActive = this.advisories.some(a => !a.mitigated);
    const zPressure = zeroDayActive ? 0.55 : 0.0;

    let weighted = 0;
    for (const r of this.regions) {
      const target = this.regionTarget(r.code);
      const decay = (zPressure + this.platform.pressure * 0.35) * ((r.code === 'EU' || r.code === 'UK') ? 1.15 : 1.0);
      const delta = (target - r.compliance) * 0.04 - decay * 0.10;
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

    if (this.regPressure > 70 && this.timeSec % 60 === 0 && Math.random() < 0.20) {
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
      if (Math.random() < 0.25) {
        this.createTicket('STORE_REJECTION', 'Audit request', 'Platform', 2, 70, 5);
        this.addEvent('Audit request opened');
      }
      if (Math.random() < 0.18) {
        const fine = Math.round(1200 + Math.random() * 2600);
        this.budget = Math.max(0, this.budget - fine);
        this.addEvent(`Regulatory fine ${fine}`);
        this.rating = clamp(this.rating - 0.08, 1.0, 5.0);
      }
    }




  }

private tickCoverageGate() {
  // Track recent coverage so we can detect sharp drops ("escaped regressions").
  // Important: compute drop against the *previous* recent max (pre-current-tick mutations),
  // otherwise an instantaneous drop (e.g., adding many components at once) won't be visible.
  if (this.coverageHist.length === 0) this.coverageHist.push(this.coveragePct);
  if (this.coverageHist.length > 90) this.coverageHist.shift();
  const maxRecentBefore = Math.max(...this.coverageHist);

  const compCount = this.components.length;
  const added = Math.max(0, compCount - this.lastCompCount);
  this.lastCompCount = compCount;

  const addTax = (this.preset === EVAL_PRESET.JUNIOR_MID) ? 0.35 : (this.preset === EVAL_PRESET.SENIOR ? 0.55 : 0.70);
  if (added > 0) this.coveragePct = clamp(this.coveragePct - added * addTax, 0, 100);

  const baseDecay = (this.preset === EVAL_PRESET.JUNIOR_MID) ? 0.010 : (this.preset === EVAL_PRESET.SENIOR ? 0.016 : 0.022);
  const churn = (this.platform.pressure * 0.030) + (this.regPressure / 100) * 0.010;
  const complexity = clamp(compCount / 30, 0, 1) * 0.020;
  const decay = (baseDecay + churn + complexity) * (1 - this.qualityProcess * 0.55);
  this.coveragePct = clamp(this.coveragePct - decay, 0, 100);

  const below = Math.max(0, this.coverageThreshold - this.coveragePct);
  const severityW = (this.preset === EVAL_PRESET.JUNIOR_MID) ? 0.55 : (this.preset === EVAL_PRESET.SENIOR ? 1.0 : 1.20);
  const penalty = clamp(below / this.coverageThreshold, 0, 1) * severityW;
  this.coverageRiskMult = 1 + penalty * 0.40;

  if (this.coveragePct < this.coverageThreshold) {
    this.createTicket('TEST_COVERAGE', `Test coverage below ${this.coverageThreshold}%`, 'Reliability', 2, 68, 4);
  }

  const drop = maxRecentBefore - this.coveragePct;
  if (drop >= 10 && this.timeSec % 30 === 0) {
    this.addEvent('Escaped regression due to low coverage');
    this.createTicket('CRASH_SPIKE', 'Regression crash spike', 'Reliability', 3, 85, 5);
  }

  this.coverageHist.push(this.coveragePct);
  if (this.coverageHist.length > 90) this.coverageHist.shift();
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
        if (n.type === 'NET') failP *= 1.0 + (a.net * 0.25);
        if (n.type === 'DB')  failP *= 1.0 + (a.io * 0.20);
        if (this.hasOBS()) failP *= 0.92;

        const didFail = (Math.random() < failP) || req.ttl <= 0 || n.down;
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

    // OOM crash
    if (this.heapMb > this.heapMaxMb) {
      this.oomCount += 1;
      this.reqFail += 6;
      this.rating = clamp(this.rating - 0.20, 1.0, 5.0);
      this.budget = Math.max(0, this.budget - 25);
      this.heapMb = this.heapMaxMb * 0.55;
      this.addEvent('OOM crash');
    }

    // FrameGuard: jank estimate (how far over 16ms we go), include GC pause
    const over = Math.max(0, (mainThreadMs + this.gcPauseMs) - this.frameBudgetMs);
    const jankBase = clamp(over / this.frameBudgetMs, 0, 3) * 100;
    const jankNow = clamp(jankBase * (1 + this.platform.pressure * 0.30) * (1 - this.patch.jank * 0.35) * (1 + (this.coverageRiskMult - 1) * 0.25), 0, 300);
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

    // User reviews/votes happen periodically and tug rating in explainable ways.
    this.maybeReviewWave(failureRate, anrRisk, p95);

    const opsCost = 0.6 + (this.timeSec / 180) * 0.35;
    const incidentCost = failureRate > 0.2 ? 1.0 : 0;
    this.budget -= (opsCost + incidentCost);

    this.battery = clamp(this.battery + (this.running ? 0.06 : 0.12), 0, 100);

    if (this.budget <= 0 || this.rating <= 1.0) {
      this.budget = Math.max(0, this.budget);
      this.running = false;
      this.log('RUN ENDED: budget/rating collapsed.');
    }
  }

  // --- UI snapshot ----------------------------------------------------------
  getUIState() {
    const total = this.reqOk + this.reqFail;
    const failureRate = total > 0 ? (this.reqFail / total) : 0;
    const anrRisk = clamp(this.anrPoints / 120, 0, 1);
    const p95 = percentile(this.latSamples, 0.95);

    const mainThreadMs = this.calcMainThreadMs(p95);



    // HeapWatch: decay and GC
    const cacheTier = this.tierOf('CACHE');
    const heapDecay = 1.6 + cacheTier * 0.6;
    const heapDelta = this.calcHeapDelta();
    this.heapMb = clamp(this.heapMb + heapDelta - heapDecay, 0, this.heapMaxMb * 1.3);

    // Trigger GC when heap is high; GC pause shows up as jank
    this.gcPauseMs = 0;
    const heapRatio = this.heapMb / this.heapMaxMb;
    if (heapRatio > 0.78) {
      this.gcPauseMs = clamp((heapRatio - 0.70) * 140, 0, 80);
      this.heapMb = this.heapMb * 0.72;
    }

    // OOM crash
    if (this.heapMb > this.heapMaxMb) {
      this.oomCount += 1;
      this.reqFail += 6;
      this.rating = clamp(this.rating - 0.20, 1.0, 5.0);
      this.budget = Math.max(0, this.budget - 25);
      this.heapMb = this.heapMaxMb * 0.55;
      this.addEvent('OOM crash');
    }

    // FrameGuard: jank estimate (how far over 16ms we go), include GC pause
    const over = Math.max(0, (mainThreadMs + this.gcPauseMs) - this.frameBudgetMs);
    const jankBase = clamp(over / this.frameBudgetMs, 0, 3) * 100;
    const jankNow = clamp(jankBase * (1 + this.platform.pressure * 0.30) * (1 - this.patch.jank * 0.35) * (1 + (this.coverageRiskMult - 1) * 0.25), 0, 300);
    this.jankPct = this.jankPct * 0.85 + jankNow * 0.15;

    const sel = this.selected();
    const selected = sel ? {
      id: sel.id,
      name: `${sel.type}  #${sel.id} (Tier ${sel.tier})`,
      stats: this.describeComponent(sel),
      canUpgrade: (sel.tier < 3) && (this.budget >= this.upgradeCost(sel)),
      canRepair: ((sel.health < 100) || sel.down) && (this.budget >= this.repairCost(sel)),
      canDelete: true
    } : undefined;

    return {
      mode: this.mode,
      running: this.running,
      timeSec: this.timeSec,
      budget: this.budget,
      rating: this.rating,
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
      selected,
      eventsText: this.eventLines.length ? this.eventLines.join('\n') : 'No incidents… yet.'
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

  

  private addEvent(msg: string) {
    // Keep a lightweight incident/event log for the UI.
    // Newest first, capped to avoid unbounded growth.
    const tag = this.timeSec > 0 ? `t+${this.timeSec}s` : 't+0s';
    this.eventLines.unshift(`${tag}  ${msg}`);
    if (this.eventLines.length > 18) this.eventLines.length = 18;
    this.lastEventAt = this.timeSec;
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

  private computeComponentStats(n: Component) {
    const def = ComponentDefs[n.type];
    const tierMul = [0, 1.0, 1.45, 2.05][n.tier];
    n.cap = def.baseCap * tierMul;
    n.lat = def.baseLat * (n.type === 'DB' ? (1.0 / (1 + (n.tier - 1) * 0.15)) : 1.0);
    n.fail = def.baseFail * (1.0 / (1 + (n.tier - 1) * 0.55));
    if (n.type === 'NET') n.fail *= this.netBadness;
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
      const count = floor + (Math.random() < (want - floor) ? 1 : 0);
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
      return [outs[0].id];
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
      if (net && Math.random() < 0.25) targets.push(net.id);
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
    const isHit = cache ? (Math.random() < hit) : false;

    if (!isHit && db) targets.push(db.id);
    if (reqType === 'SCROLL' && net && Math.random() < 0.55) targets.push(net.id);
    if (reqType === 'SEARCH' && net && Math.random() < 0.20) targets.push(net.id);

    return targets.length ? targets : [outs[0].id];
  }


  private maybeReviewWave(failureRate: number, anrRisk: number, p95: number) {
    if (this.timeSec < this.nextReviewAt) return;

    // schedule next wave (reviews are "bursty")
    const nextIn = 22 + Math.floor(Math.random() * 16);
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
    const top = penalties[0];

    // If everything is fine, you still get the occasional "love it" review.
    if (top[1] < 0.12) {
      const positives = [
        'Smooth and stable lately. Nice.',
        'Fast, reliable, no drama. Keep it up.',
        'Works great on my device. Finally.',
        'No crashes, no battery drain — chef’s kiss.'
      ];
      const snippet = positives[Math.floor(Math.random() * positives.length)];
      this.recentReviews.unshift(snippet);
      this.recentReviews = this.recentReviews.slice(0, 6);
      this.rating = clamp(this.rating + 0.03, 1.0, 5.0);
      return;
    }

    const [topKey, topVal] = top;

    const sample = Math.round(30 + (this.timeSec / 30) + this.spawnMul * 15);
    const votes = Math.max(1, Math.round(sample * topVal * 0.6));
    this.votes[topKey] += votes;

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


  private maybeIncident() {
    // decay modifiers slowly
    this.spawnMul *= 0.985;
    this.netBadness *= 0.988;
    this.workRestriction *= 0.989;

    // reduce support load very slowly over time (support team is doing their best)
    this.supportLoad = clamp(this.supportLoad - 0.08, 0, 100);

    if (this.timeSec - this.lastEventAt < 26) return;

    // security posture influences how often weird things happen
    const incidentChance = clamp(0.44 + (1 - this.securityPosture / 100) * 0.10, 0.35, 0.60);
    if (Math.random() > incidentChance) return;

    this.lastEventAt = this.timeSec;

    const authTier = this.tierOf('AUTH');
    const pinTier = this.tierOf('PINNING');
    const keyTier = this.tierOf('KEYSTORE');
    const sanTier = this.tierOf('SANITIZER');
    const abuseTier = this.tierOf('ABUSE');
    const a11yTier = this.tierOf('A11Y');
    const flagsTier = this.tierOf('FLAGS');
    const obsTier = this.tierOf('OBS');

    // Weighted roll across incident types
    const roll = Math.random();
    const table: Array<[IncidentKind, number]> = [
      ['TRAFFIC_SPIKE',    0.18],
      ['NET_WOBBLE',       0.16],
      ['OEM_RESTRICTION',  0.14],
      ['CRED_STUFFING',    0.08],
      ['TOKEN_THEFT',      0.10],
      ['DEEP_LINK_ABUSE',  0.08],
      ['MITM',             0.10],
      ['CERT_ROTATION',    0.06],
      ['A11Y_REGRESSION',  0.06],
      ['SDK_SCANDAL',      0.04]
    ];

    let acc = 0;
    let kind: IncidentKind = table[0]![0];
    for (const [k, w] of table) {
      acc += w;
      if (roll <= acc) { kind = k; break; }
    }

    // Helpers
    const bumpSupport = (v: number) => { this.supportLoad = clamp(this.supportLoad + v, 0, 100); };
    const hitTrust = (privacyDelta: number, securityDelta: number, a11yDelta = 0) => {
      this.privacyTrust = clamp(this.privacyTrust + privacyDelta, 0, 100);
      this.securityPosture = clamp(this.securityPosture + securityDelta, 0, 100);
      this.a11yScore = clamp(this.a11yScore + a11yDelta, 0, 100);
    };

    switch (kind) {
      case 'TRAFFIC_SPIKE': {
        // Abuse protection reduces how bad the spike is.
        const damp = (abuseTier > 0) ? (0.65 - 0.08 * (abuseTier - 1)) : 1.0;
        this.spawnMul = clamp(this.spawnMul + 0.25 * damp, 1.0, 3.0);
        bumpSupport(2 + (abuseTier === 0 ? 3 : 1));
        this.log('Marketing spike: action load increased.');
        break;
      }

      case 'NET_WOBBLE': {
        const damp = (obsTier > 0) ? 0.85 : 1.0;
        this.netBadness = clamp(this.netBadness + 0.25 * damp, 1.0, 3.0);
        bumpSupport(3);
        this.log('Backend wobbles: network failures increased.');
        break;
      }

      case 'OEM_RESTRICTION': {
        this.workRestriction = clamp(this.workRestriction + 0.35, 1.0, 3.0);
        bumpSupport(2);
        this.log('OEM restriction: background work drains more.');
        break;
      }

      case 'MITM': {
        if (pinTier === 0) {
          const p = -(18 + Math.random() * 10);
          const s = -(22 + Math.random() * 10);
          hitTrust(p, s);
          this.netBadness = clamp(this.netBadness + 0.15, 1.0, 3.0);
          bumpSupport(10);
          this.rating = clamp(this.rating - 0.22, 1.0, 5.0);
          this.log('MITM attempt: user trust took a hit (add TLS pinning).');
        } else {
          // blocked, but strict pinning can increase fragility a bit
          this.netBadness = clamp(this.netBadness + 0.05, 1.0, 3.0);
          bumpSupport(2);
          this.log('MITM attempt blocked by TLS pinning.');
        }
        break;
      }

      case 'CERT_ROTATION': {
        if (pinTier === 0) {
          this.netBadness = clamp(this.netBadness + 0.18, 1.0, 3.0);
          bumpSupport(3);
          this.log('Cert rotation upstream: brief network turbulence.');
          break;
        }

        // Pinning exists: tier matters
        if (pinTier === 1) {
          this.netBadness = clamp(this.netBadness + 0.35, 1.0, 3.0);
          bumpSupport(12);
          this.rating = clamp(this.rating - 0.15, 1.0, 5.0);
          this.log('Cert rotated: pinning broke requests (upgrade pinning or use flags).');
        } else {
          this.netBadness = clamp(this.netBadness + 0.12, 1.0, 3.0);
          bumpSupport(4);
          this.log('Cert rotated: pinning handled it (minor hiccup).');
        }
        break;
      }

      case 'TOKEN_THEFT': {
        if (authTier === 0) {
          hitTrust(-8, -22);
          bumpSupport(15);
          this.rating = clamp(this.rating - 0.18, 1.0, 5.0);
          this.log('Session/token issue: account takeovers reported (add Auth hardening).');
        } else {
          bumpSupport(3);
          this.log('Suspicious sessions detected and contained by Auth.');
        }
        break;
      }

      case 'CRED_STUFFING': {
        if (abuseTier === 0) {
          this.netBadness = clamp(this.netBadness + 0.22, 1.0, 3.0);
          this.spawnMul = clamp(this.spawnMul + 0.12, 1.0, 3.0);
          bumpSupport(14);
          this.log('Credential stuffing: auth endpoints hammered (add Abuse protection).');
        } else {
          this.netBadness = clamp(this.netBadness + 0.10, 1.0, 3.0);
          bumpSupport(5);
          this.log('Credential stuffing mitigated by rate limiting.');
        }
        break;
      }

      case 'DEEP_LINK_ABUSE': {
        if (sanTier === 0) {
          // Damage "main thread-ish" nodes a bit and add support pain.
          for (const t of ['UI','VM','DOMAIN'] as const) {
            const n = this.components.find(n => n.type === t && !n.down);
            if (n) n.health = clamp(n.health - (12 + Math.random() * 10), 0, 100);
          }
          bumpSupport(10);
          this.rating = clamp(this.rating - 0.12, 1.0, 5.0);
          this.log('Deep link abuse: malformed inputs causing crashes (add Sanitizer).');
        } else {
          bumpSupport(3);
          this.log('Deep link abuse attempt sanitized.');
        }
        break;
      }

      case 'A11Y_REGRESSION': {
        if (a11yTier === 0) {
          hitTrust(0, 0, -(22 + Math.random() * 10));
          bumpSupport(8);
          this.rating = clamp(this.rating - 0.10, 1.0, 5.0);
          this.log('A11y regression shipped: labels/contrast complaints (add A11y layer).');
        } else {
          hitTrust(0, 0, -(6 + Math.random() * 6));
          bumpSupport(3);
          this.log('Minor accessibility regression caught (A11y layer helps).');
        }
        break;
      }

      case 'SDK_SCANDAL': {
        // Feature flags reduce blast radius of third-party scandals.
        const blast = flagsTier >= 2 ? 0.55 : 1.0;
        if (keyTier === 0) {
          hitTrust(-25 * blast, -10 * blast);
          bumpSupport(12);
          this.rating = clamp(this.rating - 0.18 * blast, 1.0, 5.0);
          this.log('3rd-party SDK scandal: privacy trust tanking (add Keystore/Crypto + flags).');
        } else {
          hitTrust(-10 * blast, -4 * blast);
          bumpSupport(6);
          this.rating = clamp(this.rating - 0.08 * blast, 1.0, 5.0);
          this.log('3rd-party SDK issue: reduced impact due to crypto hardening.');
        }
        break;
      }
    }
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
