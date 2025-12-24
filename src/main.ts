import './style.css';
import { GameSim } from './sim';
import { MODE, Mode, NodeType } from './types';

type UIRefs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  modePill: HTMLElement;
  budget: HTMLElement;
  rating: HTMLElement;
  fail: HTMLElement;
  anr: HTMLElement;
  lat: HTMLElement;
  bat: HTMLElement;

  buildInfo: HTMLElement;

  selName: HTMLElement;
  selStats: HTMLElement;
  btnUpgrade: HTMLButtonElement;
  btnRepair: HTMLButtonElement;
  btnDelete: HTMLButtonElement;

  eventLog: HTMLElement;

  nodeType: HTMLSelectElement;

  btnStart: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnReset: HTMLButtonElement;

  btnSelect: HTMLButtonElement;
  btnLink: HTMLButtonElement;
  btnUnlink: HTMLButtonElement;

  btnAdd: HTMLButtonElement;
};

const sim = new GameSim();

const refs = bindUI();

// Build info (set by CI for GitHub Pages releases)
const sha = (import.meta.env.VITE_COMMIT_SHA ?? 'dev').toString();
const shortSha = sha === 'dev' ? 'dev' : sha.slice(0, 7);
refs.buildInfo.textContent = `Build ${shortSha} • base ${import.meta.env.BASE_URL}`;

const TICK_MS = 1000;
let tickHandle: number | null = null;

function startTickLoop() {
  if (tickHandle !== null) return;
  tickHandle = window.setInterval(() => {
    if (!sim.running) {
      syncUI();
      return;
    }
    sim.tick();
    syncUI();
  }, TICK_MS);
}

function stopTickLoop() {
  if (tickHandle === null) return;
  window.clearInterval(tickHandle);
  tickHandle = null;
}

// canvas sizing
function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const r = refs.canvas.getBoundingClientRect();
  refs.canvas.width = Math.floor(r.width * dpr);
  refs.canvas.height = Math.floor(r.height * dpr);
  refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // also reset the simulation layout when first load
  // (but only if it hasn't been initialized)
}

window.addEventListener('resize', () => {
  resize();
});
resize();

// initialize game
sim.reset({ width: refs.canvas.getBoundingClientRect().width, height: refs.canvas.getBoundingClientRect().height });
startTickLoop();
syncUI();

// buttons
refs.btnStart.onclick = () => {
  sim.running = true;
  startTickLoop();
  syncUI();
};
refs.btnPause.onclick = () => {
  sim.running = false;
  syncUI();
};
refs.btnReset.onclick = () => {
  sim.running = false;
  sim.reset({ width: refs.canvas.getBoundingClientRect().width, height: refs.canvas.getBoundingClientRect().height });
  syncUI();
};

refs.btnSelect.onclick = () => setMode(MODE.SELECT);
refs.btnLink.onclick = () => setMode(MODE.LINK);
refs.btnUnlink.onclick = () => setMode(MODE.UNLINK);

refs.btnAdd.onclick = () => {
  const type = refs.nodeType.value as NodeType;
  const r = refs.canvas.getBoundingClientRect();
  const x = r.width * (0.2 + Math.random() * 0.55);
  const y = r.height * (0.2 + Math.random() * 0.60);
  const res = sim.addNode(type, x, y);
  if (!res.ok) {
    // light feedback via events panel
    // (sim logs major things; add a soft hint by toggling selection)
  }
  syncUI();
};

refs.btnUpgrade.onclick = () => {
  sim.upgradeSelected();
  syncUI();
};
refs.btnRepair.onclick = () => {
  sim.repairSelected();
  syncUI();
};
refs.btnDelete.onclick = () => {
  sim.deleteSelected();
  syncUI();
};

function setMode(m: Mode) {
  sim.setMode(m);
  syncUI();
}

// interactions
let draggingId: number | null = null;
let dragOffX = 0;
let dragOffY = 0;

refs.canvas.addEventListener('mousedown', (e) => {
  const pt = screenToCanvas(e);
  const hit = hitNode(pt.x, pt.y);

  if (!hit) {
    sim.selectedId = null;
    sim.linkFromId = null;
    syncUI();
    return;
  }

  if (sim.mode === MODE.SELECT) {
    sim.selectedId = hit.id;
    draggingId = hit.id;
    dragOffX = pt.x - hit.x;
    dragOffY = pt.y - hit.y;
    syncUI();
    return;
  }

  // Link/Unlink
  if (!sim.linkFromId) {
    sim.linkFromId = hit.id;
    sim.selectedId = hit.id;
    syncUI();
    return;
  }

  const from = sim.linkFromId;
  const to = hit.id;

  if (sim.mode === MODE.LINK) {
    sim.link(from, to);
  } else if (sim.mode === MODE.UNLINK) {
    sim.unlink(from, to);
  }

  sim.linkFromId = null;
  syncUI();
});

window.addEventListener('mousemove', (e) => {
  if (!draggingId) return;
  const pt = screenToCanvas(e);
  sim.moveNode(draggingId, pt.x - dragOffX, pt.y - dragOffY);
});

window.addEventListener('mouseup', () => {
  draggingId = null;
});

function screenToCanvas(e: MouseEvent) {
  const r = refs.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitNode(x: number, y: number) {
  for (let i = sim.nodes.length - 1; i >= 0; i--) {
    const n = sim.nodes[i];
    const dx = x - n.x;
    const dy = y - n.y;
    if (dx * dx + dy * dy <= n.r * n.r) return n;
  }
  return null;
}

// render
function draw() {
  const r = refs.canvas.getBoundingClientRect();
  refs.ctx.clearRect(0, 0, r.width, r.height);

  // links
  for (const l of sim.links) {
    const a = sim.nodes.find(n => n.id === l.from);
    const b = sim.nodes.find(n => n.id === l.to);
    if (!a || !b) continue;

    const selectedPath =
      (sim.selectedId === a.id || sim.selectedId === b.id) ||
      (sim.linkFromId === a.id);

    refs.ctx.lineWidth = selectedPath ? 2.2 : 1.4;
    refs.ctx.strokeStyle = selectedPath ? 'rgba(200,220,255,.65)' : 'rgba(255,255,255,.18)';

    refs.ctx.beginPath();
    refs.ctx.moveTo(a.x, a.y);
    refs.ctx.lineTo(b.x, b.y);
    refs.ctx.stroke();

    // arrow head
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = b.x - ux * 26;
    const py = b.y - uy * 26;

    refs.ctx.fillStyle = selectedPath ? 'rgba(200,220,255,.65)' : 'rgba(255,255,255,.18)';
    refs.ctx.beginPath();
    refs.ctx.moveTo(px, py);
    refs.ctx.lineTo(px - uy * 6 - ux * 10, py + ux * 6 - uy * 10);
    refs.ctx.lineTo(px + uy * 6 - ux * 10, py - ux * 6 - uy * 10);
    refs.ctx.closePath();
    refs.ctx.fill();
  }

  // nodes
  for (const n of sim.nodes) {
    const sel = (sim.selectedId === n.id);
    const lf = (sim.linkFromId === n.id);
    const glow = sel || lf;

    const health = n.health / 100;

    if (glow) {
      refs.ctx.beginPath();
      refs.ctx.arc(n.x, n.y, n.r + 10, 0, Math.PI * 2);
      refs.ctx.fillStyle = 'rgba(180,210,255,.08)';
      refs.ctx.fill();
    }

    refs.ctx.beginPath();
    refs.ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    refs.ctx.fillStyle = n.down ? 'rgba(120,60,80,.55)' : `rgba(30,44,74,${0.55 + health * 0.25})`;
    refs.ctx.fill();

    refs.ctx.lineWidth = sel ? 2.2 : 1.2;
    refs.ctx.strokeStyle = n.down ? 'rgba(255,120,160,.50)' : 'rgba(255,255,255,.22)';
    refs.ctx.stroke();

    refs.ctx.fillStyle = 'rgba(255,255,255,.90)';
    refs.ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New"';
    refs.ctx.textAlign = 'center';
    refs.ctx.fillText(n.type, n.x, n.y + 4);

    refs.ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New"';
    refs.ctx.fillStyle = 'rgba(255,255,255,.60)';
    refs.ctx.fillText(`T${n.tier}`, n.x, n.y - 18);

    // health bar
    refs.ctx.fillStyle = 'rgba(255,255,255,.10)';
    refs.ctx.fillRect(n.x - 18, n.y + 20, 36, 4);
    refs.ctx.fillStyle = n.down ? 'rgba(255,120,160,.65)' : 'rgba(180,255,210,.65)';
    refs.ctx.fillRect(n.x - 18, n.y + 20, 36 * health, 4);
  }

  // hint
  refs.ctx.fillStyle = 'rgba(255,255,255,.28)';
  refs.ctx.font = '12px system-ui';
  const hint =
    sim.mode === MODE.LINK
      ? 'Link mode: click source → destination'
      : sim.mode === MODE.UNLINK
        ? 'Unlink mode: click source → destination'
        : 'Select mode: drag nodes, click to select';
  refs.ctx.fillText(hint, 16, 20);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

function syncUI() {
  const s = sim.getUIState();

  refs.modePill.innerHTML = `Mode: <b>${s.mode === MODE.SELECT ? 'Select' : s.mode === MODE.LINK ? 'Link' : 'Unlink'}</b>`;
  refs.budget.textContent = `$${s.budget.toFixed(0)}`;
  refs.rating.textContent = `${s.rating.toFixed(1)} ★`;
  refs.fail.textContent = `${(s.failureRate * 100).toFixed(1)}%`;
  refs.anr.textContent = `${(s.anrRisk * 100).toFixed(1)}%`;
  refs.lat.textContent = `${Math.round(s.p95LatencyMs)} ms`;
  refs.bat.textContent = `${Math.round(s.battery)}`;

  refs.eventLog.textContent = s.eventsText;
  refs.eventLog.classList.add('mono');

  if (!s.selected) {
    refs.selName.textContent = 'None';
    refs.selStats.textContent = '—';
    refs.btnUpgrade.disabled = true;
    refs.btnRepair.disabled = true;
    refs.btnDelete.disabled = true;
  } else {
    refs.selName.textContent = s.selected.name;
    refs.selStats.textContent = s.selected.stats;
    refs.btnUpgrade.disabled = !s.selected.canUpgrade;
    refs.btnRepair.disabled = !s.selected.canRepair;
    refs.btnDelete.disabled = !s.selected.canDelete;
  }
}

function bindUI(): UIRefs {
  const canvas = must<HTMLCanvasElement>('c');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');

  return {
    canvas,
    ctx,

    modePill: must('modePill'),
    budget: must('budget'),
    rating: must('rating'),
    fail: must('fail'),
    anr: must('anr'),
    lat: must('lat'),
    bat: must('bat'),


    buildInfo: must('buildInfo'),
    selName: must('selName'),
    selStats: must('selStats'),
    btnUpgrade: must<HTMLButtonElement>('btnUpgrade'),
    btnRepair: must<HTMLButtonElement>('btnRepair'),
    btnDelete: must<HTMLButtonElement>('btnDelete'),

    eventLog: must('eventLog'),

    nodeType: must<HTMLSelectElement>('nodeType'),

    btnStart: must<HTMLButtonElement>('btnStart'),
    btnPause: must<HTMLButtonElement>('btnPause'),
    btnReset: must<HTMLButtonElement>('btnReset'),

    btnSelect: must<HTMLButtonElement>('btnSelect'),
    btnLink: must<HTMLButtonElement>('btnLink'),
    btnUnlink: must<HTMLButtonElement>('btnUnlink'),

    btnAdd: must<HTMLButtonElement>('btnAdd')
  };
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
