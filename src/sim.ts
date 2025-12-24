import { ACTION_KEYS, ActionDef, ActionKey, Link, MODE, Mode, Node, NodeDef, NodeType, Request } from './types';

export const NodeDefs: Record<NodeType, NodeDef> = {
  UI:     { baseCap: 14, baseLat: 10, baseFail: 0.004, cost: 40,  upgrade: [0, 60, 90, 0],  desc: 'Screens / Compose' },
  VM:     { baseCap: 12, baseLat:  8, baseFail: 0.003, cost: 45,  upgrade: [0, 70, 110, 0], desc: 'State holder, throttling' },
  DOMAIN: { baseCap: 11, baseLat:  9, baseFail: 0.003, cost: 55,  upgrade: [0, 80, 120, 0], desc: 'UseCases / business rules' },
  REPO:   { baseCap: 10, baseLat: 10, baseFail: 0.004, cost: 70,  upgrade: [0, 95, 140, 0], desc: 'Source of truth, routing' },
  CACHE:  { baseCap: 16, baseLat:  3, baseFail: 0.002, cost: 90,  upgrade: [0, 120, 170, 0],desc: 'Memory/disk cache' },
  DB:     { baseCap:  8, baseLat: 20, baseFail: 0.006, cost: 120, upgrade: [0, 160, 220, 0],desc: 'Room, indices matter' },
  NET:    { baseCap:  9, baseLat: 25, baseFail: 0.010, cost: 110, upgrade: [0, 150, 210, 0],desc: 'OkHttp/Retrofit' },
  WORK:   { baseCap:  6, baseLat: 18, baseFail: 0.008, cost: 80,  upgrade: [0, 120, 170, 0],desc: 'Sync jobs, battery risk' },
  OBS:    { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 60,  upgrade: [0, 80, 110, 0], desc: 'Metrics reduce damage' },
  FLAGS:  { baseCap: 99, baseLat:  0, baseFail: 0.001, cost: 60,  upgrade: [0, 80, 110, 0], desc: 'Kill switches reduce damage' }
};

export const ActionTypes: Record<ActionKey, ActionDef> = {
  READ:   { cpu: 1.0, io: 1.0, net: 0.8, cacheable: true,  heavyCPU: false, label: 'READ' },
  WRITE:  { cpu: 1.2, io: 1.8, net: 0.3, cacheable: false, heavyCPU: false, label: 'WRITE' },
  SEARCH: { cpu: 1.8, io: 1.3, net: 0.6, cacheable: true,  heavyCPU: true,  label: 'SEARCH' },
  UPLOAD: { cpu: 2.2, io: 1.2, net: 1.6, cacheable: false, heavyCPU: true,  label: 'UPLOAD' },
  SCROLL: { cpu: 1.1, io: 0.9, net: 1.2, cacheable: true,  heavyCPU: false, label: 'SCROLL' },
  SYNC:   { cpu: 1.2, io: 1.3, net: 1.4, cacheable: false, heavyCPU: false, label: 'SYNC' }
};

type IncidentKind = 'TRAFFIC_SPIKE' | 'NET_WOBBLE' | 'OEM_RESTRICTION';

export type Bounds = { width: number; height: number };

export class GameSim {
  private nextId = 1;

  mode: Mode = MODE.SELECT;
  running = false;
  timeSec = 0;

  budget = 500;
  rating = 5.0;
  battery = 100;

  reqOk = 0;
  reqFail = 0;
  anrPoints = 0;
  latSamples: number[] = [];

  nodes: Node[] = [];
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

    const nUI = this.createNode('UI',     cx - 260, cy - 20);
    const nVM = this.createNode('VM',     cx - 150, cy - 20);
    const nD  = this.createNode('DOMAIN', cx -  40, cy - 20);
    const nR  = this.createNode('REPO',   cx +  70, cy - 20);
    const nC  = this.createNode('CACHE',  cx + 190, cy - 80);
    const nDB = this.createNode('DB',     cx + 310, cy - 80);
    const nN  = this.createNode('NET',    cx + 190, cy + 60);
    const nW  = this.createNode('WORK',   cx -  40, cy + 110);
    const nO  = this.createNode('OBS',    cx - 260, cy + 120);
    const nF  = this.createNode('FLAGS',  cx + 310, cy + 60);

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
  addNode(type: NodeType, x: number, y: number): { ok: boolean; reason?: string; id?: number } {
    const def = NodeDefs[type];
    if (this.budget < def.cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= def.cost;
    const n = this.createNode(type, x, y);
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
    this.log(`Deleted node #${id}.`);
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

  moveNode(id: number, x: number, y: number) {
    const n = this.nodeById(id);
    if (!n) return;
    n.x = x; n.y = y;
  }

  // --- simulation tick ------------------------------------------------------
  tick() {
    this.timeSec += 1;

    this.maybeIncident();

    // compute node derived stats and sync queue lengths
    for (const n of this.nodes) {
      this.computeNodeStats(n);
      n.load = 0;
      n.queue = this.getQueue(n.id).length;
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
    const slowPenalty = clamp((p95 - 120) / 500, 0, 1);

    const ratingDrop = failureRate * 0.35 + anrRisk * 0.25 + slowPenalty * 0.18 + (this.battery < 20 ? 0.08 : 0);
    const ratingGain = (failureRate < 0.03 && anrRisk < 0.10 && p95 < 160) ? 0.01 : 0.0;
    this.rating = clamp(this.rating - ratingDrop + ratingGain, 1.0, 5.0);

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

    const sel = this.selected();
    const selected = sel ? {
      id: sel.id,
      name: `${sel.type}  #${sel.id} (Tier ${sel.tier})`,
      stats: this.describeNode(sel),
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
      selected,
      eventsText: this.eventLines.length ? this.eventLines.join('\n') : 'No incidents… yet.'
    };
  }

  describeNode(n: Node): string {
    const def = NodeDefs[n.type];
    return (
      `health=${n.health.toFixed(0)}  down=${n.down ? 'yes' : 'no'}\n` +
      `cap=${n.cap.toFixed(1)}  load=${n.load.toFixed(1)}  queue=${this.getQueue(n.id).length}\n` +
      `fail=${(n.fail * 100).toFixed(2)}%  lat~${n.lat.toFixed(0)}ms\n` +
      `${def.desc}`
    );
  }

  // --- internal helpers -----------------------------------------------------
  private selected(): Node | undefined {
    if (!this.selectedId) return undefined;
    return this.nodeById(this.selectedId) ?? undefined;
  }

  private nodeById(id: number): Node | undefined {
    return this.nodes.find(n => n.id === id);
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

  private createNode(type: NodeType, x: number, y: number): Node {
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

  private computeNodeStats(n: Node) {
    const def = NodeDefs[n.type];
    const tierMul = [0, 1.0, 1.45, 2.05][n.tier];
    n.cap = def.baseCap * tierMul;
    n.lat = def.baseLat * (n.type === 'DB' ? (1.0 / (1 + (n.tier - 1) * 0.15)) : 1.0);
    n.fail = def.baseFail * (1.0 / (1 + (n.tier - 1) * 0.55));
    if (n.type === 'NET') n.fail *= this.netBadness;
    if (n.down) n.cap = 0;
  }

  private hasOBS(): boolean {
    return this.nodes.some(n => n.type === 'OBS' && !n.down);
  }

  private hasFLAGS(): boolean {
    return this.nodes.some(n => n.type === 'FLAGS' && !n.down);
  }

  private upgradeCost(n: Node): number {
    const def = NodeDefs[n.type];
    return def.upgrade[n.tier] ?? 999;
  }

  private repairCost(n: Node): number {
    const base = (100 - n.health) * 0.6 + (n.down ? 40 : 0);
    const mult = this.hasOBS() ? 0.85 : 1.0;
    return Math.ceil(base * mult);
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

    const uiNode = this.nodes.find(n => n.type === 'UI');
    const workNode = this.nodes.find(n => n.type === 'WORK');
    if (!uiNode || uiNode.down) return;

    for (const [t, p] of mix) {
      const want = base * p;
      const floor = Math.floor(want);
      const count = floor + (Math.random() < (want - floor) ? 1 : 0);
      if (count <= 0) continue;

      for (let i = 0; i < count; i++) {
        const origin = (t === 'SYNC' && workNode && !workNode.down) ? workNode : uiNode;
        this.getQueue(origin.id).push({ type: t, ttl: 20 });
      }
    }
  }

  private routeFrom(node: Node, reqType: ActionKey): number[] {
    const outs = this.outLinks(node.id)
      .map(id => this.nodeById(id))
      .filter((n): n is Node => Boolean(n))
      .filter(n => !n.down);

    if (outs.length === 0) return [];

    if (node.type !== 'REPO') {
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

  private maybeIncident() {
    // decay modifiers slowly
    this.spawnMul *= 0.985;
    this.netBadness *= 0.988;
    this.workRestriction *= 0.989;

    if (this.timeSec - this.lastEventAt < 28) return;
    if (Math.random() > 0.45) return;

    this.lastEventAt = this.timeSec;
    const r = Math.random();

    let kind: IncidentKind;
    if (r < 0.33) {
      kind = 'TRAFFIC_SPIKE';
      this.spawnMul = clamp(this.spawnMul + 0.25, 1.0, 3.0);
      this.log('Marketing spike: action load increased.');
    } else if (r < 0.66) {
      kind = 'NET_WOBBLE';
      this.netBadness = clamp(this.netBadness + 0.25, 1.0, 3.0);
      this.log('Backend wobbles: network failures increased.');
    } else {
      kind = 'OEM_RESTRICTION';
      this.workRestriction = clamp(this.workRestriction + 0.35, 1.0, 3.0);
      this.log('OEM restriction: background work drains more.');
    }

    // unused currently, but kept for future: switch (kind) { ... }
    void kind;
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
