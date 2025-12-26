import './style.css';
import { GameSim } from './sim';
import { addScoreEntry, clearScoreboard, loadScoreboard } from './scoreboard';
import { MODE, Mode, ComponentType, Ticket, EvalPreset, EVAL_PRESET, RefactorAction } from './types';

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'theme';
const GLASS_KEY = 'glass';

function supportsGlass(): boolean {
  return (window.CSS && (CSS.supports('backdrop-filter: blur(1px)') || CSS.supports('-webkit-backdrop-filter: blur(1px)')));
}

function applyGlass(mode: 'on' | 'off') {
  const root = document.documentElement;
  if (mode === 'on' && supportsGlass()) root.setAttribute('data-glass', 'on');
  else root.removeAttribute('data-glass');
}


function getSystemIsDark(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return getSystemIsDark() ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);

  // Update theme-color to match the active background
  const meta = document.getElementById('themeColor') as HTMLMetaElement | null;
  if (meta) {
    const active = resolveTheme(mode);
    meta.content = active === 'dark' ? '#0f131c' : '#FFFBFE';
  }
}


type UIRefs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  modePill: HTMLElement;

  budget: HTMLElement;
  time: HTMLElement;
  rating: HTMLElement;
  score: HTMLElement;
  archDebt: HTMLElement;
  seedVal: HTMLElement;
  seedInput: HTMLInputElement;
  btnDailySeed: HTMLButtonElement;
  postmortem: HTMLElement;
  btnCopyRun: HTMLButtonElement;
  scoreboardList: HTMLElement;
  btnClearScoreboard: HTMLButtonElement;
  roadmap: HTMLElement;
  btnApplyNextRoadmap: HTMLButtonElement;
  fail: HTMLElement;
  anr: HTMLElement;
  lat: HTMLElement;
  bat: HTMLElement;
  jank: HTMLElement;
  heap: HTMLElement;
  gc: HTMLElement;
  oom: HTMLElement;

  privacyTrust: HTMLElement;
  securityPosture: HTMLElement;
  supportLoad: HTMLElement;
  a11yScore: HTMLElement;

  coverage: HTMLElement;
  coverageHint: HTMLElement;

  apiLatest: HTMLElement;
  apiMin: HTMLElement;
  oldShare: HTMLElement;
  lowRamShare: HTMLElement;
  advisoryText: HTMLElement;

  regPressure: HTMLElement;
  regionList: HTMLElement;
  ticketList: HTMLElement;
  reviewLog: HTMLElement;
  eventLog: HTMLElement;

  votesPerf: HTMLElement;
  votesReliability: HTMLElement;
  votesPrivacy: HTMLElement;
  votesA11y: HTMLElement;
  votesBattery: HTMLElement;

  capVal: HTMLElement;
  selName: HTMLElement;
  selStats: HTMLElement;
  buildInfo: HTMLElement;

  componentType: HTMLSelectElement;
  presetSelect: HTMLSelectElement;
  themeSelect: HTMLSelectElement;
  glassSelect: HTMLSelectElement;

  btnStart: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnReset: HTMLButtonElement;

  btnSelect: HTMLButtonElement;
  btnLink: HTMLButtonElement;
  btnUnlink: HTMLButtonElement;

  btnAdd: HTMLButtonElement;
  btnUpgrade: HTMLButtonElement;
  btnRepair: HTMLButtonElement;
  btnDelete: HTMLButtonElement;

  // Incident response overlay
  incidentOverlay: HTMLElement;
  incidentOverlayTitle: HTMLElement;
  incidentOverlayHint: HTMLElement;
  incidentOverlayDismiss: HTMLButtonElement;
  incidentOverlayBacklog: HTMLButtonElement;
  incidentOverlayTriage: HTMLButtonElement;
};


const sim = new GameSim();


// E2E / CI marker (used by Playwright). Keeps tests deterministic and reduces motion flake.
const IS_E2E = (import.meta as any).env?.VITE_E2E === '1';
(window as any).__E2E__ = IS_E2E;
if (IS_E2E) document.documentElement.classList.add('e2e');

const refs = bindUI();
if (IS_E2E) refs.seedInput.value = '12345';

// Build info (set by CI for GitHub Pages releases)
const sha = (import.meta.env.VITE_COMMIT_SHA ?? 'dev').toString();
const shortSha = sha === 'dev' ? 'dev' : sha.slice(0, 7);
refs.buildInfo.textContent = `Build ${shortSha} • base ${import.meta.env.BASE_URL}`;

let lastSavedRunId: string | null = null;

// Incident UX: brief highlight + action overlay when a new incident line appears.
let lastEventsText = '';
let incidentHotUntilMs = 0;

function setIncidentHot(active: boolean) {
  document.documentElement.classList.toggle('incident-hot', active);
  refs.incidentOverlay.hidden = !active;
}

function latestIncidentLine(eventsText: string): string {
  if (!eventsText || eventsText.startsWith('No incidents')) return '';
  return eventsText.split('\n')[0] ?? '';
}

function openBacklog() {
  const el = document.getElementById('backlogCard') ?? refs.ticketList;
  el.scrollIntoView({ behavior: IS_E2E ? 'auto' : 'smooth', block: 'start' });
}

function quickTriage() {
  const cap = sim.getCapacity();
  const tickets = sim.getTickets().filter(t => !t.deferred);
  if (!tickets.length) return;

  // Highest severity first, then impact, then age.
  tickets.sort((a, b) => (b.severity - a.severity) || (b.impact - a.impact) || (b.ageSec - a.ageSec));
  const t = tickets[0];
  if (!t) return;

  if (cap.cur + 1e-9 >= t.effort) sim.fixTicket(t.id);
  else sim.deferTicket(t.id);
}

refs.incidentOverlayDismiss.addEventListener('click', () => {
  incidentHotUntilMs = 0;
  setIncidentHot(false);
});
refs.incidentOverlayBacklog.addEventListener('click', () => {
  openBacklog();
});
refs.incidentOverlayTriage.addEventListener('click', () => {
  quickTriage();
  scheduleSync();
  openBacklog();
});


// Preset (difficulty expectations)
refs.presetSelect.value = EVAL_PRESET.SENIOR;
sim.setPreset(EVAL_PRESET.SENIOR);
refs.presetSelect.addEventListener('change', () => {
  sim.setPreset(refs.presetSelect.value as EvalPreset);
  scheduleSync();
});

// Theme (System / Light / Dark)
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const loadTheme = (): ThemeMode => ((localStorage.getItem(THEME_KEY) as ThemeMode) || 'system');

const setTheme = (mode: ThemeMode) => {
  localStorage.setItem(THEME_KEY, mode);
  refs.themeSelect.value = mode;
  applyTheme(mode);
};

setTheme(loadTheme());

refs.themeSelect.addEventListener('change', () => {
  setTheme(refs.themeSelect.value as ThemeMode);
});

// If user selected System, follow OS changes live
mq?.addEventListener?.('change', () => {
  const mode = loadTheme();
  if (mode === 'system') applyTheme('system');
});

const TICK_MS = 1000;
let tickHandle: number | null = null;
let uiPending = false;
let lastTicketsSig = '';
let lastRegionsSig = '';
let lastTicketsRenderMs = 0;
let lastRegionsRenderMs = 0;

function setText(el: HTMLElement, v: string) { if (el.textContent !== v) el.textContent = v; }
function setHTML(el: HTMLElement, v: string) { if (el.innerHTML !== v) el.innerHTML = v; }

function toast(msg: string) {
  const id = 'toast-host';
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement('div');
    host.id = id;
    host.style.position = 'fixed';
    host.style.left = '50%';
    host.style.bottom = '18px';
    host.style.transform = 'translateX(-50%)';
    host.style.zIndex = '9999';
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.textContent = msg;
  el.style.padding = '10px 12px';
  el.style.borderRadius = '12px';
  el.style.marginTop = '8px';
  el.style.background = 'rgba(20,24,34,0.92)';
  el.style.border = '1px solid rgba(255,255,255,0.14)';
  el.style.color = 'rgba(255,255,255,0.92)';
  el.style.font = '12px system-ui';
  el.style.backdropFilter = 'blur(8px)';
  (host as HTMLElement).appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity 220ms ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 260);
  }, 1100);
}
function requestUISync() {
  if (uiPending) return;
  uiPending = true;

  const run = () => {
    uiPending = false;
    syncUI();
    renderScoreboard();
  };

  // In headless E2E, rAF can be throttled; prefer a macrotask so DOM updates are observable.
  if (IS_E2E) {
    setTimeout(run, 0);
  } else {
    requestAnimationFrame(run);
  }
}


function scheduleSync() { requestUISync(); }




function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function renderRegions() {
  const pressure = sim.getRegPressure();
  setText(refs.regPressure, `${Math.round(pressure)}`);
  const nowMs = performance.now();

  const regions = sim.getRegions()
    .slice()
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);


  const regionsSig = regions.map(r => `${r.code}:${Math.round(r.compliance)}:${Math.round(r.share*100)}:${r.frozenSec>0?1:0}`).join('|');
  const allow = (nowMs - lastRegionsRenderMs) > 450;
  if (!allow && regionsSig === lastRegionsSig) return;
  lastRegionsSig = regionsSig;
  lastRegionsRenderMs = nowMs;
  refs.regionList.innerHTML = regions.map(r => {
    const comp = Math.round(r.compliance);
    const share = Math.round(r.share * 100);
    const frozen = r.frozenSec > 0 ? 'freeze' : '';
    return `
      <div class="regionRow ${r.frozenSec > 0 ? 'freeze' : ''}">
        <div class="regionCode">${r.code}</div>
        <div class="regionMeta">${share}%</div>
        <div class="regionBar">
          <div class="regionFill" style="width:${clamp01(comp / 100) * 100}%"></div>
        </div>
        <div class="regionVal">${comp}</div>
        <div class="regionTag">${frozen}</div>
      </div>
    `;
  }).join('');
}

function renderTickets() {
  const cap = sim.getCapacity();
  const tickets = sim.getTickets()
    .slice()
    .sort((a: Ticket, b: Ticket) => (b.severity - a.severity) || (b.impact - a.impact) || (b.ageSec - a.ageSec))
    .slice(0, 7);

  setText(refs.capVal, `${cap.cur.toFixed(1)}/${cap.max.toFixed(0)}`);

  const nowMs = performance.now();
  const ticketsSig = tickets.map(t => `${t.id}:${t.severity}:${t.impact}:${Math.floor(t.ageSec)}:${t.deferred ? 1 : 0}`).join('|');
  // Throttle list DOM work even if we tick at 1Hz
  const allow = (nowMs - lastTicketsRenderMs) > 450;
  if (!allow && ticketsSig === lastTicketsSig) return;


  if (!tickets.length) {
    lastTicketsSig = 'empty';
    lastTicketsRenderMs = nowMs;
    setHTML(refs.ticketList, `<div class="small muted">No open tickets</div>`);
    return;
  }

  if (ticketsSig === lastTicketsSig && !allow) return;
  lastTicketsSig = ticketsSig;
  lastTicketsRenderMs = nowMs;

  refs.ticketList.innerHTML = tickets.map(t => {
    const sev = ['S0', 'S1', 'S2', 'S3'][t.severity] ?? 'S?';
    const age = Math.floor(t.ageSec / 60);
    const canFix = cap.cur + 1e-9 >= t.effort;
    const fixLabel = canFix ? `Fix (${t.effort})` : `Need ${t.effort}`;
    const deferLabel = t.deferred ? 'Undefer' : 'Defer';
    const isArch = t.kind === 'ARCHITECTURE_DEBT';
    return `
      <div class="ticket">
        <div class="ticketMain">
          <div class="ticketTitle"><span class="badge ${t.severity === 3 ? 's3' : t.severity === 2 ? 's2' : t.severity === 1 ? 's1' : 's0'}">${sev}</span> ${t.title}</div>
          <div class="ticketMeta"><span>${t.category}</span><span>impact ${t.impact}</span><span>age ${age}m</span>${t.deferred ? '<span class="badge">deferred</span>' : ''}</div>
        </div>
        <div class="ticketBtns">
          <button class="btn text ${canFix ? '' : 'is-disabled'}" data-fix="${t.id}" ${canFix ? '' : 'disabled'}>${fixLabel}</button>
          <button class="btn text" data-defer="${t.id}">${deferLabel}</button>
        </div>
      </div>
      ${isArch ? `
        <details class="ticketMore">
          <summary><span class="ticketMoreSummary">Refactor options</span></summary>
          <div class="ticketRefactors">
            <select class="input mono" data-target="${t.id}">
              <option value="">Auto-target (worst violation)</option>
              ${sim.getArchViolations().slice(0, 8).map(v => `<option value="${v.key}">${v.reason}</option>`).join('')}
            </select>
            ${sim.getRefactorOptions(t.id).map(o => `<button class="btn text" data-refactor="${t.id}" data-action="${o.action}" title="${o.title}
$${o.cost} • ${o.debtDelta} debt • +${o.scoreBonus} score

${o.description}">${o.action.replace('_',' ')} ($${o.cost}, ${o.debtDelta} debt)</button>`).join('')}
          </div>
        </details>
      ` : ''}
    `;
  }).join('');

  refs.ticketList.querySelectorAll<HTMLButtonElement>('button[data-fix]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number((e.currentTarget as HTMLElement).getAttribute('data-fix'));
      sim.fixTicket(id);
      syncUI();
    });
  });
  refs.ticketList.querySelectorAll<HTMLButtonElement>('button[data-defer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number((e.currentTarget as HTMLElement).getAttribute('data-defer'));
      sim.deferTicket(id);
      syncUI();
    });
  });
  refs.ticketList.querySelectorAll<HTMLButtonElement>('button[data-refactor]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      const id = Number(el.getAttribute('data-refactor'));
      const action = el.getAttribute('data-action') as RefactorAction;
      const sel = refs.ticketList.querySelector<HTMLSelectElement>(`select[data-target="${id}"]`);
      const targetKey = sel ? (sel.value || undefined) : undefined;
      sim.applyRefactor(id, action, targetKey);
      syncUI();
    });
  });

}

function syncRunButtons() {
  refs.btnStart.classList.toggle('is-active', sim.running);
  refs.btnPause.classList.toggle('is-active', !sim.running);

  // Optional UX: make the inactive action slightly less prominent
  refs.btnStart.disabled = sim.running;
  refs.btnPause.disabled = !sim.running;
}

function startTickLoop() {
  if (tickHandle !== null) return;
  tickHandle = window.setInterval(() => {
    if (!sim.running) {
      requestUISync();
      return;
    }
    sim.tick();
    requestUISync();
  }, TICK_MS);
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
sim.reset({ width: refs.canvas.getBoundingClientRect().width, height: refs.canvas.getBoundingClientRect().height }, IS_E2E ? { seed: 12345 } : undefined);
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
  const seedStr = (refs.seedInput.value ?? '').trim();
  const seed = seedStr ? Number(seedStr) : undefined;
  sim.reset(
    { width: refs.canvas.getBoundingClientRect().width, height: refs.canvas.getBoundingClientRect().height },
    (seed !== undefined && Number.isFinite(seed)) ? { seed } : undefined
  );
  syncUI();
};
refs.btnDailySeed.onclick = () => {
  // Deterministic daily seed (UTC date) so people can compare runs.
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1);
  const day = d.getUTCDate();
  const daily = (y * 10000 + m * 100 + day) >>> 0;
  refs.seedInput.value = String(daily);
  sim.running = false;
  sim.reset({ width: refs.canvas.getBoundingClientRect().width, height: refs.canvas.getBoundingClientRect().height }, { seed: daily });
  syncUI();
};


refs.btnSelect.onclick = () => setMode(MODE.SELECT);
refs.btnLink.onclick = () => setMode(MODE.LINK);
refs.btnUnlink.onclick = () => setMode(MODE.UNLINK);

refs.btnCopyRun.onclick = async () => {
  const s = sim.getUIState();
  if (!s.lastRun) return;
  const txt = JSON.stringify(s.lastRun, null, 2);
  try {
    await navigator.clipboard.writeText(txt);
    toast('Run JSON copied');
  } catch {
    // Fallback: prompt
    window.prompt('Copy run JSON:', txt);
  }
};

refs.btnClearScoreboard.onclick = () => {
  clearScoreboard();
  renderScoreboard();
  toast('Scoreboard cleared');
};

refs.btnApplyNextRoadmap.onclick = () => {  const steps = sim.getRefactorRoadmap();
  if (!steps.length) return;

  // Apply the first step using any open ARCHITECTURE_DEBT ticket.
  const ticketId = sim.getFirstArchitectureDebtTicketId();
  if (!ticketId) {
    toast('No architecture debt ticket to refactor');
    return;
  }
  const next = steps[0];
  sim.applyRefactor(ticketId, next.action);
  syncUI();
};

refs.btnAdd.onclick = () => {
  const type = refs.componentType.value as ComponentType;
  const r = refs.canvas.getBoundingClientRect();
  const x = r.width * (0.2 + Math.random() * 0.55);
  const y = r.height * (0.2 + Math.random() * 0.60);
  const res = sim.addComponent(type, x, y);
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
  const hit = hitComponent(pt.x, pt.y);

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
  sim.moveComponent(draggingId, pt.x - dragOffX, pt.y - dragOffY);
});

window.addEventListener('mouseup', () => {
  draggingId = null;
});

function screenToCanvas(e: MouseEvent) {
  const r = refs.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitComponent(x: number, y: number) {
  for (let i = sim.components.length - 1; i >= 0; i--) {
    const n = sim.components[i];
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
    const a = sim.components.find(n => n.id === l.from);
    const b = sim.components.find(n => n.id === l.to);
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

  // components
  for (const n of sim.components) {
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
  // The component labels set textAlign = 'center' above.
  // Reset to left here so the hint doesn't get clipped off-screen.
  refs.ctx.textAlign = 'left';
  refs.ctx.textBaseline = 'top';
  const hint =
    sim.mode === MODE.LINK
      ? 'Link mode: click source → destination'
      : sim.mode === MODE.UNLINK
        ? 'Unlink mode: click source → destination'
        : 'Select mode: drag components, click to select';
  refs.ctx.fillText(hint, 16, 12);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);


function renderScoreboard() {
  const entries = loadScoreboard();
  if (!entries.length) {
    refs.scoreboardList.textContent = 'No scores yet.';
    return;
  }
  const lines = entries.slice(0, 12).map((e, i) => {
    const when = new Date(e.endedAtTs).toLocaleString();
    return `${String(i + 1).padStart(2, '0')}. ${e.finalScore} pts • ${e.preset} • debt ${Math.round(e.architectureDebt)}/100 • rating ${e.rating.toFixed(1)}★ • ${e.durationSec}s • seed ${e.seed} • ${e.endReason} • ${when}`;
  });
  refs.scoreboardList.textContent = lines.join('\n');
}

function syncUI() {
  const s = sim.getUIState();

  // Segmented mode buttons (Material 3-ish)
  refs.btnSelect.classList.toggle('is-selected', s.mode === MODE.SELECT);
  refs.btnLink.classList.toggle('is-selected', s.mode === MODE.LINK);
  refs.btnUnlink.classList.toggle('is-selected', s.mode === MODE.UNLINK);

  refs.modePill.innerHTML = `Mode: <b>${s.mode === MODE.SELECT ? 'Select' : s.mode === MODE.LINK ? 'Link' : 'Unlink'}</b>`;
  setText(refs.budget, `$${s.budget.toFixed(0)}`);
  setText(refs.time, `${s.timeSec}s`);
  setText(refs.rating, `${s.rating.toFixed(1)} ★`);
  setText(refs.seedVal, `${s.seed}`);
  setText(refs.score, `${Math.round(s.score)}`);
  setText(refs.archDebt, `${Math.round(s.architectureDebt)}`);
  setText(refs.fail, `${(s.failureRate * 100).toFixed(1)}%`);
  setText(refs.anr, `${(s.anrRisk * 100).toFixed(1)}%`);
  setText(refs.lat, `${Math.round(s.p95LatencyMs)} ms`);
  setText(refs.bat, `${Math.round(s.battery)}`);
  setText(refs.jank, `${Math.round(s.jankPct)}%`);
  setText(refs.heap, `${Math.round(s.heapMb)} MB`);
  setText(refs.gc, `${Math.round(s.gcPauseMs)}`);
  setText(refs.oom, `${s.oomCount}`);

  setText(refs.a11yScore, `${Math.round(s.a11yScore)}`);
  setText(refs.privacyTrust, `${Math.round(s.privacyTrust)}`);
  setText(refs.securityPosture, `${Math.round(s.securityPosture)}`);
  setText(refs.supportLoad, `${Math.round(s.supportLoad)}`);

  setText(refs.votesPerf, `${s.votes.perf}`);
  setText(refs.votesReliability, `${s.votes.reliability}`);
  setText(refs.votesPrivacy, `${s.votes.privacy}`);
  setText(refs.votesA11y, `${s.votes.a11y}`);
  setText(refs.votesBattery, `${s.votes.battery}`);

  setText(refs.reviewLog, s.recentReviews.length ? s.recentReviews.join('\n') : 'No reviews yet.');

  setText(refs.eventLog, s.eventsText);

  // Incident UX: detect a new incident line and briefly surface response actions.
  if (s.eventsText && s.eventsText !== lastEventsText) {
    const line = latestIncidentLine(s.eventsText);
    if (line) {
      refs.incidentOverlayTitle.textContent = line;
      incidentHotUntilMs = Date.now() + 14_000;
    }
    lastEventsText = s.eventsText;
  }
  const incidentHot = Date.now() < incidentHotUntilMs;
  if (document.documentElement.classList.contains('incident-hot') !== incidentHot) {
    setIncidentHot(incidentHot);
  }


  // Refactor roadmap (high-signal Staff/Principal mechanic)
  const steps = sim.getRefactorRoadmap();
  if (!steps.length) {
    refs.roadmap.textContent = 'No roadmap yet.';
  } else {
    refs.roadmap.textContent = steps.map((s, i) => `${i + 1}. ${s.title}\n   - Action: ${s.action.replace('_',' ')}\n   - Why: ${s.rationale}`).join('\n\n');
  }

  // Postmortem + persistence
  if (s.lastRun) {
    refs.postmortem.textContent = s.lastRun.summaryLines.join('\n');

    if (s.lastRun.runId && s.lastRun.runId !== lastSavedRunId) {
      lastSavedRunId = s.lastRun.runId;
      addScoreEntry({
        runId: s.lastRun.runId,
        seed: s.lastRun.seed,
        preset: s.lastRun.preset,
        endReason: s.lastRun.endReason,
        endedAtTs: s.lastRun.endedAtTs,
        durationSec: s.lastRun.durationSec,
        finalScore: s.lastRun.finalScore,
        multiplier: s.lastRun.multiplier,
        architectureDebt: s.lastRun.architectureDebt,
        rating: s.lastRun.rating,
      });
      renderScoreboard();
    }
  } else {
    refs.postmortem.textContent = 'No run yet.';
  }
  refs.eventLog.classList.add('mono');

  if (!s.selected) {
    setText(refs.selName, 'None');
    setText(refs.selStats, '—');
    refs.btnUpgrade.disabled = true;
    refs.btnRepair.disabled = true;
    refs.btnDelete.disabled = true;
  } else {
    setText(refs.selName, s.selected.name);
    setText(refs.selStats, s.selected.stats);
    refs.btnUpgrade.disabled = !s.selected.canUpgrade;
    refs.btnRepair.disabled = !s.selected.canRepair;
    refs.btnDelete.disabled = !s.selected.canDelete;
  }
  // CoverageGate
  const cov = sim.getCoverage();
  setText(refs.coverage, `${Math.round(cov.pct)}%`);
  setText(refs.coverageHint, cov.pct < cov.threshold ? `Below ${cov.threshold}% increases regressions` : `Target ${cov.threshold}%+ for stable releases`);

  // PlatformPulse
  const p = sim.getPlatform();
  setText(refs.apiLatest, String(p.latestApi));
  setText(refs.apiMin, String(p.minApi));
  setText(refs.oldShare, String(Math.round(p.oldDeviceShare * 100)));
  setText(refs.lowRamShare, String(Math.round(p.lowRamShare * 100)));

  // ZeroDayPulse
  const adv = sim.getAdvisories().filter(a => !a.mitigated).slice(0, 1);
  setText(refs.advisoryText, adv.length ? `Active: ${adv[0].title}` : '');

  renderTickets();
  renderRegions();
  syncRunButtons();
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
    time: must('time'),
    rating: must('rating'),
    score: must('score'),
    archDebt: must('archDebt'),
    seedVal: must('seedVal'),
    seedInput: must('seedInput') as HTMLInputElement,
    btnDailySeed: must('btnDailySeed') as HTMLButtonElement,
    postmortem: must('postmortem'),
    btnCopyRun: must('btnCopyRun') as HTMLButtonElement,
    scoreboardList: must('scoreboardList'),
    btnClearScoreboard: must('btnClearScoreboard') as HTMLButtonElement,
    roadmap: must('roadmap'),
    btnApplyNextRoadmap: must('btnApplyNextRoadmap') as HTMLButtonElement,
    fail: must('fail'),
    anr: must('anr'),
    lat: must('lat'),
    bat: must('bat'),
    jank: must('jank'),
    heap: must('heap'),
    gc: must('gc'),
    oom: must('oom'),

    a11yScore: must('a11yScore'),
    privacyTrust: must('privacyTrust'),
    securityPosture: must('securityPosture'),
    supportLoad: must('supportLoad'),

    votesPerf: must('votesPerf'),
    votesReliability: must('votesReliability'),
    votesPrivacy: must('votesPrivacy'),
    votesA11y: must('votesA11y'),
    votesBattery: must('votesBattery'),
    reviewLog: must('reviewLog'),

    buildInfo: must('buildInfo'),

    presetSelect: must('presetSelect') as HTMLSelectElement,
    themeSelect: must('themeSelect') as HTMLSelectElement,
    glassSelect: must('glassSelect') as HTMLSelectElement,

    coverage: must('coverage'),
    coverageHint: must('coverageHint'),

    capVal: must('capVal'),
    ticketList: must('ticketList'),
    apiLatest: must('apiLatest'),
    apiMin: must('apiMin'),
    oldShare: must('oldShare'),
    lowRamShare: must('lowRamShare'),
    advisoryText: must('advisoryText'),
    regPressure: must('regPressure'),
    regionList: must('regionList'),
    selName: must('selName'),
    selStats: must('selStats'),
    btnUpgrade: must<HTMLButtonElement>('btnUpgrade'),
    btnRepair: must<HTMLButtonElement>('btnRepair'),
    btnDelete: must<HTMLButtonElement>('btnDelete'),

    eventLog: must('eventLog'),

    componentType: must<HTMLSelectElement>('componentType'),

    btnStart: must<HTMLButtonElement>('btnStart'),
    btnPause: must<HTMLButtonElement>('btnPause'),
    btnReset: must<HTMLButtonElement>('btnReset'),

    btnSelect: must<HTMLButtonElement>('btnSelect'),
    btnLink: must<HTMLButtonElement>('btnLink'),
    btnUnlink: must<HTMLButtonElement>('btnUnlink'),

    btnAdd: must<HTMLButtonElement>('btnAdd'),

    incidentOverlay: must('incidentOverlay'),
    incidentOverlayTitle: must('incidentOverlayTitle'),
    incidentOverlayHint: must('incidentOverlayHint'),
    incidentOverlayDismiss: must<HTMLButtonElement>('incidentOverlayDismiss'),
    incidentOverlayBacklog: must<HTMLButtonElement>('incidentOverlayBacklog'),
    incidentOverlayTriage: must<HTMLButtonElement>('incidentOverlayTriage')
  };
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

// LiquidGlass
const savedGlass = (localStorage.getItem(GLASS_KEY) as ('on' | 'off')) || 'off';
refs.glassSelect.value = supportsGlass() ? savedGlass : 'off';
if (!supportsGlass()) {
  refs.glassSelect.disabled = true;
  refs.glassSelect.title = 'Liquid glass not supported in this browser';
}
applyGlass(refs.glassSelect.value as ('on' | 'off'));
refs.glassSelect.addEventListener('change', () => {
  const g = refs.glassSelect.value as ('on' | 'off');
  localStorage.setItem(GLASS_KEY, g);
  applyGlass(g);
});
