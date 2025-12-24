import { ACTION_KEYS, ActionDef, ActionKey, Link, MODE, Mode, Component, ComponentDef, ComponentType, Request } from './types';

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

  mode: Mode = MODE.SELECT;
  running = false;
  timeSec = 0;

  budget = 500;
  rating = 5.0;
  battery = 100;

  // Perception metrics (0..100) These feed into user rating separately from pure tech metrics.
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

  nodes: component[] = [];
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

    this.budget = 500;
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

    this.nodes = [];
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

    this.nodes.push(nUI, nVM, nD, nR, nC, nDB, nN, nW, nO, nF);

    this.link(nUI.id, nVM.id);
    this.link(nVM.id, nD.id);
    this.link(nD.id,  nR.id);
    this.link(nR.id,  nC.id);
    this.link(nC.id,  nDB.id);
    this.link(nR.id,  nN.id);
    this.link(nW.id,  nR.id);

    this.selectedId = nR.id;
  }

  // --- public CRUD ----------------------------------------------------------
  addComponent(type: ComponentType, x: number, y: number): { ok: boolean; reason?: string; id?: number } {
    const def = ComponentDefs[type];
    if (this.budget < def.cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= def.cost;
    const n = this.createComponent(type, x, y);
    this.nodes.push(n);
    this.selectedId = n.id;
    return { ok: true, id: n.id };
  }

  deleteSelected(): boolean {
    const id = this.selectedId;
    if (!id) return false;
    this.links = this.links.filter(l => l.from !== id && l.to !== id);
    this.queues.delete(id);
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.selectedId = null;
    this.log(`Deleted component #${id}`);
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
    this.log(`${n.type} upgraded to Tier ${n.tier}`);
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
    this.log(`${n.type} repaired`);
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

  // --- simulation tick ------------------------------------------------------
  tick() {
    this.timeSec += 1;

    this.maybeIncident();

    // compute component derived stats and sync queue lengths
    for (const n of this.nodes) {
      this.computeComponentStats(n);
      n.load = 0;
      n.queue = this.getQueue(n.id)length;
    }

    this.spawnRequests();

    const nodes = [...this.nodes].sort((a, b) => a.id - b.id);

    let ok = 0;
    let fail = 0;
    let anrPoints = 0;
    const latThisTick: number[] = [];

    for (const n of nodes) {
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
            this.log(`${n.type} went DOWN`);
          }
        } else {
          ok++;
          const targets = this.routeFrom(n, req.type);
          for (const tid of targets) {
            const tn = this.nodeById(tid);
            if (!tn || tn.down) continue;
            this.getQueue(tid)push(req);
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
      this.log('RUN ENDED: budget/rating collapsed');
    }
  }

  // --- UI snapshot ----------------------------------------------------------
  getUIState() {
    const total = this.reqOk + this.reqFail;
    const failureRate = total > 0 ? (this.reqFail / total) : 0;
    const anrRisk = clamp(this.anrPoints / 120, 0, 1);
    const p95 = percentile(this.latSamples, 0.95);

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
      a11yScore: this.a11yScore,
      privacyTrust: this.privacyTrust,
      securityPosture: this.securityPosture,
      supportLoad: this.supportLoad,
      votes: { ...this.votes },
      recentReviews: [...this.recentReviews],
      selected,
      eventsText: this.eventLines.length ? this.eventLines.join('\n') : 'No incidents… yet'
    };
  }

  describeComponent(n: Component): string {
    const def = ComponentDefs[n.type];
    return (
      `health=${n.health.toFixed(0)}  down=${n.down ? 'yes' : 'no'}\n` +
      `cap=${n.cap.toFixed(1)}  load=${n.load.toFixed(1)}  queue=${this.getQueue(n.id)length}\n` +
      `fail=${(n.fail * 100)toFixed(2)}%  lat~${n.lat.toFixed(0)}ms\n` +
      `${def.desc}`
    );
  }

  // --- internal helpers -----------------------------------------------------
  private selected(): Component | undefined {
    if (!this.selectedId) return undefined;
    return this.nodeById(this.selectedId) ?? undefined;
  }

  private nodeById(id: number): Component | undefined {
    return this.nodes.find(n => n.id === id);
  }

  private outLinks(id: number): number[] {
    return this.links.filter(l => l.from === id)map(l => l.to);
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
    const n = this.nodes.find(n => n.type === type && !n.down);
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

    const uiComponent = this.nodes.find(n => n.type === 'UI');
    const workComponent = this.nodes.find(n => n.type === 'WORK');
    if (!uiComponent || uiComponent.down) return;

    for (const [t, p] of mix) {
      const want = base * p;
      const floor = Math.floor(want);
      const count = floor + (Math.random() < (want - floor) ? 1 : 0);
      if (count <= 0) continue;

      for (let i = 0; i < count; i++) {
        const origin = (t === 'SYNC' && workComponent && !workComponent.down) ? workComponent : uiComponent;
        this.getQueue(origin.id)push({ type: t, ttl: 20 });
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
        'Smooth and stable lately. Nice',
        'Fast, reliable, no drama. Keep it up',
        'Works great on my device. Finally',
        'No crashes, no battery drain — chef’s kiss'
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
        return `${sev}: Crashes/ANRs after the update (${(failureRate * 100)toFixed(1)}% failures, ${(anrRisk * 100)toFixed(1)}% ANR risk)`;
      case 'privacy':
        return `${sev}: Privacy vibes are off. Trust=${Math.round(this.privacyTrust)}/100.`;
      case 'a11y':
        return `${sev}: Accessibility issues (labels/contrast/focus) A11y=${Math.round(this.a11yScore)}/100.`;
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
        this.log('Marketing spike: action load increased');
        break;
      }

      case 'NET_WOBBLE': {
        const damp = (obsTier > 0) ? 0.85 : 1.0;
        this.netBadness = clamp(this.netBadness + 0.25 * damp, 1.0, 3.0);
        bumpSupport(3);
        this.log('Backend wobbles: network failures increased');
        break;
      }

      case 'OEM_RESTRICTION': {
        this.workRestriction = clamp(this.workRestriction + 0.35, 1.0, 3.0);
        bumpSupport(2);
        this.log('OEM restriction: background work drains more');
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
          this.log('MITM attempt: user trust took a hit (add TLS pinning)');
        } else {
          // blocked, but strict pinning can increase fragility a bit
          this.netBadness = clamp(this.netBadness + 0.05, 1.0, 3.0);
          bumpSupport(2);
          this.log('MITM attempt blocked by TLS pinning');
        }
        break;
      }

      case 'CERT_ROTATION': {
        if (pinTier === 0) {
          this.netBadness = clamp(this.netBadness + 0.18, 1.0, 3.0);
          bumpSupport(3);
          this.log('Cert rotation upstream: brief network turbulence');
          break;
        }

        // Pinning exists: tier matters
        if (pinTier === 1) {
          this.netBadness = clamp(this.netBadness + 0.35, 1.0, 3.0);
          bumpSupport(12);
          this.rating = clamp(this.rating - 0.15, 1.0, 5.0);
          this.log('Cert rotated: pinning broke requests (upgrade pinning or use flags)');
        } else {
          this.netBadness = clamp(this.netBadness + 0.12, 1.0, 3.0);
          bumpSupport(4);
          this.log('Cert rotated: pinning handled it (minor hiccup)');
        }
        break;
      }

      case 'TOKEN_THEFT': {
        if (authTier === 0) {
          hitTrust(-8, -22);
          bumpSupport(15);
          this.rating = clamp(this.rating - 0.18, 1.0, 5.0);
          this.log('Session/token issue: account takeovers reported (add Auth hardening)');
        } else {
          bumpSupport(3);
          this.log('Suspicious sessions detected and contained by Auth');
        }
        break;
      }

      case 'CRED_STUFFING': {
        if (abuseTier === 0) {
          this.netBadness = clamp(this.netBadness + 0.22, 1.0, 3.0);
          this.spawnMul = clamp(this.spawnMul + 0.12, 1.0, 3.0);
          bumpSupport(14);
          this.log('Credential stuffing: auth endpoints hammered (add Abuse protection)');
        } else {
          this.netBadness = clamp(this.netBadness + 0.10, 1.0, 3.0);
          bumpSupport(5);
          this.log('Credential stuffing mitigated by rate limiting');
        }
        break;
      }

      case 'DEEP_LINK_ABUSE': {
        if (sanTier === 0) {
          // Damage "main thread-ish" nodes a bit and add support pain.
          for (const t of ['UI','VM','DOMAIN'] as const) {
            const n = this.nodes.find(n => n.type === t && !n.down);
            if (n) n.health = clamp(n.health - (12 + Math.random() * 10), 0, 100);
          }
          bumpSupport(10);
          this.rating = clamp(this.rating - 0.12, 1.0, 5.0);
          this.log('Deep link abuse: malformed inputs causing crashes (add Sanitizer)');
        } else {
          bumpSupport(3);
          this.log('Deep link abuse attempt sanitized');
        }
        break;
      }

      case 'A11Y_REGRESSION': {
        if (a11yTier === 0) {
          hitTrust(0, 0, -(22 + Math.random() * 10));
          bumpSupport(8);
          this.rating = clamp(this.rating - 0.10, 1.0, 5.0);
          this.log('A11y regression shipped: labels/contrast complaints (add A11y layer)');
        } else {
          hitTrust(0, 0, -(6 + Math.random() * 6));
          bumpSupport(3);
          this.log('Minor accessibility regression caught (A11y layer helps)');
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
          this.log('3rd-party SDK scandal: privacy trust tanking (add Keystore/Crypto + flags)');
        } else {
          hitTrust(-10 * blast, -4 * blast);
          bumpSupport(6);
          this.rating = clamp(this.rating - 0.08 * blast, 1.0, 5.0);
          this.log('3rd-party SDK issue: reduced impact due to crypto hardening');
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
