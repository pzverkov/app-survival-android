import './style.css';
import { GameSim } from './sim';
import { AchievementsTracker, LocalStorageAchStorage, AchEvent, AchievementUnlock } from './achievements';
import { addScoreEntry, clearScoreboard, loadScoreboard } from './scoreboard';
import { MODE, Mode, ComponentType, Ticket, EvalPreset, EVAL_PRESET, RefactorAction } from './types';
import { applyTranslations, getLanguage, loadLanguage, populateLanguageSelect, setLanguage, t, type Lang } from './i18n';

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'theme';
const GLASS_KEY = 'glass';
const TAB_KEY = 'tab';

// Currency formatting (the in-game economy is USD by design, but we format
// according to the selected UI locale for readability).
const moneyFmtCache = new Map<string, Intl.NumberFormat>();
function fmtMoneyUSD(amount: number): string {
  const lang = getLanguage();
  const locale = (lang || 'en') as string;
  let fmt = moneyFmtCache.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    moneyFmtCache.set(locale, fmt);
  }
  return fmt.format(amount);
}

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

  sideBody: HTMLElement;
  modePill: HTMLElement;

  budget: HTMLElement;
  time: HTMLElement;
  shift: HTMLElement;
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
  capRegenHint: HTMLElement;
  btnCapRefill: HTMLButtonElement;
  btnCapBoost: HTMLButtonElement;
  btnCapHire: HTMLButtonElement;
  btnCapDrink: HTMLButtonElement;
  btnCapShield: HTMLButtonElement;
  selName: HTMLElement;
  selStats: HTMLElement;
  buildInfo: HTMLElement;

  componentType: HTMLSelectElement;
  presetSelect: HTMLSelectElement;
  themeSelect: HTMLSelectElement;
  glassSelect: HTMLSelectElement;
  langSelect: HTMLSelectElement;

  btnZoomIn: HTMLButtonElement;
  btnZoomOut: HTMLButtonElement;
  btnZoomFit: HTMLButtonElement;

  tabBtnOverview: HTMLButtonElement;
  tabBtnBacklog: HTMLButtonElement;
  tabBtnSignals: HTMLButtonElement;
  tabBtnHistory: HTMLButtonElement;
  tabOverview: HTMLElement;
  tabBacklog: HTMLElement;
  tabSignals: HTMLElement;
  tabHistory: HTMLElement;

  btnStart: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnReset: HTMLButtonElement;
  btnProfile: HTMLButtonElement;
  btnOpenProfile: HTMLButtonElement;

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
  incidentOverlayRefill: HTMLButtonElement;
  incidentOverlayTriage: HTMLButtonElement;

  // Achievements summary
  achPreset: HTMLElement;
  achUnlocked: HTMLElement;
  achTotal: HTMLElement;

  // Profile modal
  profileModal: HTMLElement;
  profileBackdrop: HTMLElement;
  profilePresetSelect: HTMLSelectElement;
  btnCloseProfile: HTMLButtonElement;
  profileUnlocked: HTMLElement;
  profileTotal: HTMLElement;
  profileBest: HTMLElement;
  profileAchList: HTMLElement;
};


const sim = new GameSim();


// E2E / CI marker (used by Playwright). Keeps tests deterministic and reduces motion flake.
const IS_E2E = (import.meta as any).env?.VITE_E2E === '1';
(window as any).__E2E__ = IS_E2E;
if (IS_E2E) document.documentElement.classList.add('e2e');

const refs = bindUI();
if (IS_E2E) refs.seedInput.value = '12345';

// --- Localization ---------------------------------------------------------
const initLang = loadLanguage();
populateLanguageSelect(refs.langSelect, initLang);
refs.langSelect.value = initLang;
document.documentElement.lang = initLang;
applyTranslations(document);
document.title = t('app.title');

// Build info (set by CI for GitHub Pages releases)
const sha = (import.meta.env.VITE_COMMIT_SHA ?? 'dev').toString();
const shortSha = sha === 'dev' ? 'dev' : sha.slice(0, 7);
refs.buildInfo.textContent = t('build.info', { sha: shortSha, base: String(import.meta.env.BASE_URL) });

let lastSavedRunId: string | null = null;

// Achievements are stored per preset.
const ach = new AchievementsTracker(EVAL_PRESET.SENIOR, new LocalStorageAchStorage());
let achLastTickSec = -1;
let achPrevRunning = false;

// Incident UX: brief highlight + action overlay when a new incident line appears.
let lastEventsText = '';
let incidentHotUntilMs = 0;

function setIncidentHot(active: boolean) {
  document.documentElement.classList.toggle('incident-hot', active);
  refs.incidentOverlay.hidden = !active;
}

function latestIncidentLine(eventsText: string): string {
  const none = t('signals.noIncidents');
  if (!eventsText || eventsText.startsWith(none)) return '';
  return eventsText.split('\n')[0] ?? '';
}

function openBacklog() {
  scrollToTab('backlog', IS_E2E ? 'auto' : 'smooth');
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

refs.incidentOverlayRefill.addEventListener('click', () => {
  sim.buyCapacityRefill();
  scheduleSync();
});

refs.btnCapRefill.addEventListener('click', () => {
  sim.buyCapacityRefill();
  scheduleSync();
});
refs.btnCapBoost.addEventListener('click', () => {
  sim.buyCapacityRegenUpgrade();
  scheduleSync();
});
refs.btnCapHire.addEventListener('click', () => {
  sim.hireMoreCapacity();
  scheduleSync();
});

refs.btnCapDrink.addEventListener('click', () => {
  sim.buyRegenBooster();
  scheduleSync();
});

refs.btnCapShield.addEventListener('click', () => {
  sim.buyIncidentShield();
  scheduleSync();
});


// Preset (difficulty expectations)
refs.presetSelect.value = EVAL_PRESET.SENIOR;
sim.setPreset(EVAL_PRESET.SENIOR);
ach.setPreset(EVAL_PRESET.SENIOR);
renderAchievementSummary(EVAL_PRESET.SENIOR);
refs.presetSelect.addEventListener('change', () => {
  const p = refs.presetSelect.value as EvalPreset;
  sim.setPreset(p);
  ach.setPreset(p);
  renderAchievementSummary(p);
  scheduleSync();
});

// Tabs --------------------------------------------------------------------
type TabId = 'overview' | 'backlog' | 'signals' | 'history';

const tabSections: Record<TabId, HTMLElement> = {
  overview: refs.tabOverview,
  backlog: refs.tabBacklog,
  signals: refs.tabSignals,
  history: refs.tabHistory,
};

const tabButtons: Record<TabId, HTMLButtonElement> = {
  overview: refs.tabBtnOverview,
  backlog: refs.tabBtnBacklog,
  signals: refs.tabBtnSignals,
  history: refs.tabBtnHistory,
};

function setActiveTab(id: TabId) {
  try { localStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  for (const k of Object.keys(tabButtons) as TabId[]) {
    const btn = tabButtons[k];
    const on = k === id;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  }
}

function scrollToTab(id: TabId, behavior: ScrollBehavior = 'smooth') {
  const section = tabSections[id];
  if (!section) return;
  setActiveTab(id);

  // `offsetTop` can be misleading inside flex/scroll containers; compute the
  // target position relative to the scroll container instead.
  const parent = refs.sideBody;
  const parentRect = parent.getBoundingClientRect();
  const rect = section.getBoundingClientRect();
  const top = Math.max(0, parent.scrollTop + (rect.top - parentRect.top) - 8);
  parent.scrollTo({ top, behavior });
}

const initialTab = (() => {
  try { return (localStorage.getItem(TAB_KEY) as TabId) || 'overview'; } catch { return 'overview'; }
})();

// highlight based on scroll position
let tabRAF = 0;
refs.sideBody.addEventListener('scroll', () => {
  if (tabRAF) return;
  tabRAF = window.requestAnimationFrame(() => {
    tabRAF = 0;
    const st = refs.sideBody.scrollTop;
    let best: TabId = 'overview';
    let bestDist = Number.POSITIVE_INFINITY;
    const parentRect = refs.sideBody.getBoundingClientRect();
    for (const id of Object.keys(tabSections) as TabId[]) {
      const rect = tabSections[id].getBoundingClientRect();
      const top = refs.sideBody.scrollTop + (rect.top - parentRect.top);
      const dist = Math.abs(top - st);
      if (dist < bestDist) { bestDist = dist; best = id; }
    }
    setActiveTab(best);
  });
}, { passive: true });

refs.tabBtnOverview.addEventListener('click', () => scrollToTab('overview'));
refs.tabBtnBacklog.addEventListener('click', () => scrollToTab('backlog'));
refs.tabBtnSignals.addEventListener('click', () => scrollToTab('signals'));
refs.tabBtnHistory.addEventListener('click', () => scrollToTab('history'));

// Initial jump (no smooth) once layout is ready
requestAnimationFrame(() => scrollToTab(initialTab, 'auto'));

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

// Language (stored in localStorage via i18n.ts)
refs.langSelect.addEventListener('change', () => {
  const l = refs.langSelect.value as Lang;
  setLanguage(l);
  document.documentElement.lang = getLanguage();
  applyTranslations(document);
  document.title = t('app.title');
  scheduleSync();
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

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function formatReward(r?: { budget?: number; score?: number }): string {
  if (!r) return '';
  const parts: string[] = [];
  if (r.budget) parts.push(`+$${r.budget}`);
  if (r.score) parts.push(`+${r.score} score`);
  return parts.join(' • ');
}

function applyAchievementRewards(unlocked: AchievementUnlock[]) {
  if (!unlocked.length) return;
  for (const a of unlocked) {
    if (a.reward?.budget) sim.budget += a.reward.budget;
    if (a.reward?.score) sim.score += a.reward.score;
    const reward = formatReward(a.reward);
    const tier = a.label ? ` ${a.label}` : '';
    const rewardSuffix = reward ? ` (${reward})` : '';
    toast(t('toast.achievementUnlocked', { title: a.title, tier, reward: rewardSuffix }));
  }
}

function renderAchievementSummary(preset: EvalPreset) {
  const prog = ach.getProgress(preset);
  setText(refs.achPreset, preset);
  setText(refs.achUnlocked, String(prog.unlocked));
  setText(refs.achTotal, String(prog.total));
}

function renderProfile(preset: EvalPreset) {
  const prog = ach.getProgress(preset);
  setText(refs.profileUnlocked, String(prog.unlocked));
  setText(refs.profileTotal, String(prog.total));
  setText(refs.profileBest, `${Math.round(prog.bestSurvivalSec)}s`);

  const views = ach.getViewsForPreset(preset);
  refs.profileAchList.innerHTML = views.map(v => {
    const icon = v.tier > 0 ? '✓' : '•';
    const tierBadge = v.tier === 0 ? '' : (v.tier === 1 ? 'BRONZE' : v.tier === 2 ? 'SILVER' : 'GOLD');
    const next = v.next ? `Next: ${v.next.label} - ${v.next.description}` : '';
    const reward = formatReward(v.next?.reward);
    return `
      <div class="achItem ${v.tier > 0 ? 'is-unlocked' : 'is-locked'}">
        <div class="achBadge">${icon}</div>
        <div>
          <div class="achTitle">${escapeHtml(v.title)}</div>
          <div class="achDesc small">${escapeHtml(v.description)}${next ? `<div class="small muted" style="margin-top:4px;">${escapeHtml(next)}</div>` : ''}</div>
        </div>
        <div class="achReward small mono">${tierBadge}${reward ? (tierBadge ? `<div>${escapeHtml(reward)}</div>` : escapeHtml(reward)) : ''}</div>
      </div>
    `;
  }).join('');
}




function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

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
  const shop = sim.getCapacityShop();
  const unlocks = ach.getShopUnlocks(refs.presetSelect.value as EvalPreset);
  const tickets = sim.getTickets()
    .slice()
    .sort((a: Ticket, b: Ticket) => (b.severity - a.severity) || (b.impact - a.impact) || (b.ageSec - a.ageSec))
    .slice(0, 7);

  setText(refs.capVal, `${cap.cur.toFixed(1)}/${cap.max.toFixed(0)}`);
  setText(refs.capRegenHint, `+${cap.regenPerMin.toFixed(1)}/min${cap.adrenaline ? ' ⚡' : ''}${cap.boosterActive ? ' 🧃' : ''}${cap.shieldCharges > 0 ? ' 🛡' : ''}`);

  const canRefill = (cap.cur < cap.max - 1e-6) && (sim.budget >= shop.refillCost);
  refs.btnCapRefill.disabled = !canRefill;
  refs.btnCapRefill.textContent = cap.cur >= cap.max - 1e-6
    ? t('shop.full')
    : t('shop.refillCost', { cost: fmtMoneyUSD(shop.refillCost) });

  const canBoost = shop.canRegenUpgrade && (sim.budget >= shop.regenUpgradeCost);
  refs.btnCapBoost.disabled = !canBoost;
  refs.btnCapBoost.textContent = shop.canRegenUpgrade
    ? t('shop.boostCost', { cost: fmtMoneyUSD(shop.regenUpgradeCost) })
    : t('shop.boostMax');

  const canHire = shop.canHire && (sim.budget >= shop.hireCost);
  refs.btnCapHire.disabled = !canHire;
  refs.btnCapHire.textContent = shop.canHire
    ? t('shop.hireCost', { cost: fmtMoneyUSD(shop.hireCost) })
    : t('shop.hireMax');

  // Unlockable (achievement-gated) shop items.
  refs.btnCapDrink.hidden = !unlocks.booster;
  if (!refs.btnCapDrink.hidden) {
    const canDrink = shop.canBuyBooster && (sim.budget >= shop.boosterCost);
    refs.btnCapDrink.disabled = !canDrink;
    refs.btnCapDrink.textContent = shop.boosterActive
      ? t('shop.boosterActive', { sec: Math.ceil(shop.boosterRemainingSec) })
      : t('shop.energyDrinkCost', { cost: fmtMoneyUSD(shop.boosterCost) });
  }

  refs.btnCapShield.hidden = !unlocks.shield;
  if (!refs.btnCapShield.hidden) {
    const canShield = shop.canBuyShield && (sim.budget >= shop.shieldCost);
    refs.btnCapShield.disabled = !canShield;
    refs.btnCapShield.textContent = shop.shieldCharges > 0
      ? t('shop.shieldReady')
      : t('shop.shieldCost', { cost: fmtMoneyUSD(shop.shieldCost) });
  }

  // Keep overlay action in sync (incident response quick button)
  if ((refs as any).incidentOverlayRefill) {
    (refs as any).incidentOverlayRefill.disabled = !canRefill;
    (refs as any).incidentOverlayRefill.textContent = t('shop.refillCost', { cost: fmtMoneyUSD(shop.refillCost) });
  }

  const nowMs = performance.now();
  const ticketsSig = tickets.map(t => `${t.id}:${t.severity}:${t.impact}:${Math.floor(t.ageSec)}:${t.deferred ? 1 : 0}`).join('|');
  // Throttle list DOM work even if we tick at 1Hz
  const allow = (nowMs - lastTicketsRenderMs) > 450;
  if (!allow && ticketsSig === lastTicketsSig) return;


  if (!tickets.length) {
    lastTicketsSig = 'empty';
    lastTicketsRenderMs = nowMs;
    setHTML(refs.ticketList, `<div class="small muted">${t('backlog.noTickets')}</div>`);
    return;
  }

  if (ticketsSig === lastTicketsSig && !allow) return;
  lastTicketsSig = ticketsSig;
  lastTicketsRenderMs = nowMs;

  refs.ticketList.innerHTML = tickets.map(ticket => {
    const sev = ['S0', 'S1', 'S2', 'S3'][ticket.severity] ?? 'S?';
    const age = Math.floor(ticket.ageSec / 60);
    const canFix = cap.cur + 1e-9 >= ticket.effort;
    const fixLabel = canFix ? t('ticket.fix', { effort: ticket.effort }) : t('ticket.need', { effort: ticket.effort });
    const deferLabel = ticket.deferred ? t('ticket.undefer') : t('ticket.defer');
    const isArch = ticket.kind === 'ARCHITECTURE_DEBT';
    return `
      <div class="ticket">
        <div class="ticketMain">
          <div class="ticketTitle"><span class="badge ${ticket.severity === 3 ? 's3' : ticket.severity === 2 ? 's2' : ticket.severity === 1 ? 's1' : 's0'}">${sev}</span> ${ticket.title}</div>
          <div class="ticketMeta"><span>${ticket.category}</span><span>${t('ticket.impact', { impact: ticket.impact })}</span><span>${t('ticket.age', { minutes: age })}</span>${ticket.deferred ? `<span class="badge">${t('ticket.deferred')}</span>` : ''}</div>
        </div>
        <div class="ticketBtns">
          <button class="btn text ${canFix ? '' : 'is-disabled'}" data-fix="${ticket.id}" ${canFix ? '' : 'disabled'}>${fixLabel}</button>
          <button class="btn text" data-defer="${ticket.id}">${deferLabel}</button>
        </div>
      </div>
      ${isArch ? `
        <details class="ticketMore">
          <summary><span class="ticketMoreSummary">${t('ticket.refactorOptions')}</span></summary>
          <div class="ticketRefactors">
            <select class="input mono" data-target="${ticket.id}">
              <option value="">${t('ticket.autoTarget')}</option>
              ${sim.getArchViolations().slice(0, 8).map(v => `<option value="${v.key}">${v.reason}</option>`).join('')}
            </select>
            ${sim.getRefactorOptions(ticket.id).map(o => `<button class="btn text" data-refactor="${ticket.id}" data-action="${o.action}" title="${o.title}
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


// --- Canvas viewport (pan/zoom) + sizing ---------------------------------
// World coordinates are the same units as the original "px" layout; the view transform maps them into screen px.
const view = { scale: 1, tx: 0, ty: 0 };
let canvasCssW = 1;
let canvasCssH = 1;
let canvasDpr = 1;

function syncCanvasSize() {
  const r = refs.canvas.getBoundingClientRect();
  canvasCssW = Math.max(1, r.width);
  canvasCssH = Math.max(1, r.height);
  // Cap DPR for perf on laptops + 4K screens.
  canvasDpr = Math.min(Math.max(1, window.devicePixelRatio || 1), 1.5);
  refs.canvas.width = Math.floor(canvasCssW * canvasDpr);
  refs.canvas.height = Math.floor(canvasCssH * canvasDpr);
  refs.ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function getCanvasBounds() {
  return { width: canvasCssW, height: canvasCssH };
}

function fitToView(paddingPx = 56) {
  if (!sim.components.length) {
    view.scale = 1;
    view.tx = 0;
    view.ty = 0;
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of sim.components) {
    minX = Math.min(minX, n.x - n.r);
    minY = Math.min(minY, n.y - n.r);
    maxX = Math.max(maxX, n.x + n.r);
    maxY = Math.max(maxY, n.y + n.r);
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const sx = (canvasCssW - paddingPx * 2) / w;
  const sy = (canvasCssH - paddingPx * 2) / h;
  const s = Math.max(0.35, Math.min(1.6, Math.min(sx, sy)));
  view.scale = s;
  view.tx = (canvasCssW - w * s) / 2 - minX * s;
  view.ty = (canvasCssH - h * s) / 2 - minY * s;
}

let drawScheduled = false;
let needsDraw = true;
function requestDraw() {
  needsDraw = true;
  if (drawScheduled) return;
  drawScheduled = true;

  const run = () => {
    drawScheduled = false;
    if (!needsDraw) return;
    needsDraw = false;
    draw();
  };

  if (IS_E2E) setTimeout(run, 0);
  else requestAnimationFrame(run);
}

window.addEventListener('resize', () => {
  syncCanvasSize();
  fitToView();
  requestDraw();
});

syncCanvasSize();

// initialize game
sim.reset(getCanvasBounds(), IS_E2E ? { seed: 12345 } : undefined);
fitToView();
startTickLoop();
syncUI();
requestDraw();

// buttons
refs.btnStart.onclick = () => {
  const preset = refs.presetSelect.value as EvalPreset;
  if (ach.getPreset() !== preset) ach.setPreset(preset);
  achLastTickSec = -1;
  applyAchievementRewards(ach.onEvents([{ type: 'RUN_START', atSec: sim.timeSec, budget: sim.budget, architectureDebt: sim.architectureDebt }]));
  sim.running = true;
  startTickLoop();
  syncUI();
};
refs.btnPause.onclick = () => {
  sim.running = false;
  syncUI();
};
refs.btnReset.onclick = () => {
  // Treat reset as run end for achievements tracking.
  applyAchievementRewards(ach.onEvents([{ type: 'RUN_END', atSec: sim.timeSec, reason: 'RESET' }]));
  sim.running = false;
  achLastTickSec = -1;
  const seedStr = (refs.seedInput.value ?? '').trim();
  const seed = seedStr ? Number(seedStr) : undefined;
  sim.reset(
    getCanvasBounds(),
    (seed !== undefined && Number.isFinite(seed)) ? { seed } : undefined
  );
  fitToView();
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
  sim.reset(getCanvasBounds(), { seed: daily });
  fitToView();
  syncUI();
};

function openProfile(preset: EvalPreset) {
  refs.profileModal.hidden = false;
  refs.profilePresetSelect.value = preset;
  renderProfile(preset);
}
function closeProfile() {
  refs.profileModal.hidden = true;
}

refs.btnProfile.onclick = () => openProfile(refs.presetSelect.value as EvalPreset);
refs.btnOpenProfile.onclick = () => openProfile(refs.presetSelect.value as EvalPreset);
refs.btnCloseProfile.onclick = closeProfile;
refs.profileBackdrop.onclick = closeProfile;
refs.profilePresetSelect.addEventListener('change', () => {
  renderProfile(refs.profilePresetSelect.value as EvalPreset);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !refs.profileModal.hidden) closeProfile();
});


refs.btnSelect.onclick = () => setMode(MODE.SELECT);
refs.btnLink.onclick = () => setMode(MODE.LINK);
refs.btnUnlink.onclick = () => setMode(MODE.UNLINK);

refs.btnCopyRun.onclick = async () => {
  const s = sim.getUIState();
  if (!s.lastRun) return;
  const txt = JSON.stringify(s.lastRun, null, 2);
  try {
    await navigator.clipboard.writeText(txt);
    toast(t('toast.runCopied'));
  } catch {
    // Fallback: prompt
    window.prompt(t('history.copyPrompt'), txt);
  }
};

refs.btnClearScoreboard.onclick = () => {
  clearScoreboard();
  renderScoreboard();
  toast(t('toast.scoreboardCleared'));
};

refs.btnApplyNextRoadmap.onclick = () => {  const steps = sim.getRefactorRoadmap();
  if (!steps.length) return;

  // Apply the first step using any open ARCHITECTURE_DEBT ticket.
  const ticketId = sim.getFirstArchitectureDebtTicketId();
  if (!ticketId) {
    toast(t('toast.noRoadmapTicket'));
    return;
  }
  const next = steps[0];
  sim.applyRefactor(ticketId, next.action);
  syncUI();
};

refs.btnAdd.onclick = () => {
  const type = refs.componentType.value as ComponentType;
  const sx = canvasCssW * (0.2 + Math.random() * 0.55);
  const sy = canvasCssH * (0.2 + Math.random() * 0.60);
  const x = (sx - view.tx) / view.scale;
  const y = (sy - view.ty) / view.scale;
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
let panning = false;
let panStartX = 0;
let panStartY = 0;
let panStartTx = 0;
let panStartTy = 0;

refs.canvas.addEventListener('mousedown', (e) => {
  // Alt/right/middle mouse => pan
  if (e.button === 1 || e.button === 2 || e.altKey) {
    panning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartTx = view.tx;
    panStartTy = view.ty;
    e.preventDefault();
    return;
  }

  const pt = screenToWorld(e);
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
  if (panning) {
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    view.tx = panStartTx + dx;
    view.ty = panStartTy + dy;
    requestDraw();
    return;
  }
  if (!draggingId) return;
  const pt = screenToWorld(e);
  sim.moveComponent(draggingId, pt.x - dragOffX, pt.y - dragOffY);
  requestDraw();
});

window.addEventListener('mouseup', () => {
  draggingId = null;
  panning = false;
});

refs.canvas.addEventListener('contextmenu', (e) => {
  // Allow right-drag to pan without popping the menu.
  e.preventDefault();
});

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.2;

function zoomAt(factor: number, sx: number, sy: number) {
  const old = view.scale;
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, old * factor));
  if (Math.abs(next - old) < 1e-6) return;

  const wx = (sx - view.tx) / old;
  const wy = (sy - view.ty) / old;

  view.scale = next;
  view.tx = sx - wx * next;
  view.ty = sy - wy * next;
  requestDraw();
}

refs.btnZoomIn.addEventListener('click', () => zoomAt(1.15, canvasCssW / 2, canvasCssH / 2));
refs.btnZoomOut.addEventListener('click', () => zoomAt(1 / 1.15, canvasCssW / 2, canvasCssH / 2));
refs.btnZoomFit.addEventListener('click', () => {
  fitToView();
  requestDraw();
});

refs.canvas.addEventListener('wheel', (e) => {
  // Zoom with mouse wheel/trackpad while keeping the cursor world point stable.
  // (Ctrl+wheel is often "pinch" on trackpads; treat it the same.)
  const pt = screenToWorld(e);
  const factor = Math.pow(1.0015, -e.deltaY);
  zoomAt(factor, pt.sx, pt.sy);
  e.preventDefault();
}, { passive: false });

function screenToWorld(e: MouseEvent | WheelEvent) {
  const r = refs.canvas.getBoundingClientRect();
  const sx = e.clientX - r.left;
  const sy = e.clientY - r.top;
  return { x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale, sx, sy };
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
  // Clear in device pixels.
  refs.ctx.setTransform(1, 0, 0, 1, 0, 0);
  refs.ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);

  // World transform (world px -> screen px -> device px).
  const s = view.scale * canvasDpr;
  refs.ctx.setTransform(s, 0, 0, s, view.tx * canvasDpr, view.ty * canvasDpr);

  // Build an id->node map once per frame (cheap) to avoid O(n^2) find() calls.
  const byId = new Map<number, typeof sim.components[number]>();
  for (const n of sim.components) byId.set(n.id, n);

  // links
  for (const l of sim.links) {
    const a = byId.get(l.from);
    const b = byId.get(l.to);
    if (!a || !b) continue;

    const selectedPath =
      (sim.selectedId === a.id || sim.selectedId === b.id) ||
      (sim.linkFromId === a.id);

    // Keep link strokes roughly constant in screen px.
    refs.ctx.lineWidth = (selectedPath ? 2.2 : 1.4) / view.scale;
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

    refs.ctx.lineWidth = (sel ? 2.2 : 1.2) / view.scale;
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

  // UI overlay layer in screen px.
  refs.ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  refs.ctx.fillStyle = 'rgba(255,255,255,.28)';
  refs.ctx.font = '12px system-ui';
  refs.ctx.textAlign = 'left';
  refs.ctx.textBaseline = 'top';
  const hint =
    sim.mode === MODE.LINK
      ? t('hint.link')
      : sim.mode === MODE.UNLINK
        ? t('hint.unlink')
        : t('hint.select');
  refs.ctx.fillText(hint, 16, 12);
}


function renderScoreboard() {
  const entries = loadScoreboard();
  if (!entries.length) {
    refs.scoreboardList.textContent = t('history.noScores');
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

  // --- Achievements -------------------------------------------------------
  const currentPreset = refs.presetSelect.value as EvalPreset;
  if (ach.getPreset() !== currentPreset) ach.setPreset(currentPreset);

  const achEvents: AchEvent[] = [];
  if (sim.running && !achPrevRunning) {
    achEvents.push({ type: 'RUN_START', atSec: s.timeSec, budget: s.budget, architectureDebt: s.architectureDebt });
  }
  achPrevRunning = sim.running;
  for (const ev of sim.drainEvents()) {
    if (ev.type === 'PURCHASE') achEvents.push({ type: 'PURCHASE', atSec: ev.atSec, item: ev.item });
    if (ev.type === 'TICKET_FIXED') achEvents.push({ type: 'TICKET_FIXED', atSec: ev.atSec, kind: ev.kind, effort: ev.effort });
    if (ev.type === 'RUN_END') achEvents.push({ type: 'RUN_END', atSec: ev.atSec, reason: ev.reason });
    if (ev.type === 'EVENT' && ev.category === 'INCIDENT') achEvents.push({ type: 'INCIDENT', atSec: ev.atSec, msg: ev.msg });
  }

  // Feed a single tick event per second while the sim is running (so achievements remain stable).
  if (sim.running && s.timeSec !== achLastTickSec) {
    achLastTickSec = s.timeSec;
    const components = Array.from(new Set(sim.components.map(n => n.type)));
    achEvents.push({
      type: 'TICK',
      atSec: s.timeSec,
      backlog: sim.tickets.length,
      rating: s.rating,
      capacityCur: sim.engCapacity,
      capacityMax: sim.engCapacityMax,
      budget: s.budget,
      architectureDebt: s.architectureDebt,
      components,
    });
  }

  if (achEvents.length) {
    const unlocked = ach.onEvents(achEvents);
    applyAchievementRewards(unlocked);
  }

  renderAchievementSummary(currentPreset);
  if (!refs.profileModal.hidden) {
    renderProfile(refs.profilePresetSelect.value as EvalPreset);
  }

  // Segmented mode buttons (Material 3-ish)
  refs.btnSelect.classList.toggle('is-selected', s.mode === MODE.SELECT);
  refs.btnLink.classList.toggle('is-selected', s.mode === MODE.LINK);
  refs.btnUnlink.classList.toggle('is-selected', s.mode === MODE.UNLINK);

  const modeLabel = s.mode === MODE.SELECT ? t('mode.select') : (s.mode === MODE.LINK ? t('mode.link') : t('mode.unlink'));
  refs.modePill.innerHTML = `${t('mode.label')} <b>${modeLabel}</b>`;
  setText(refs.budget, `$${s.budget.toFixed(0)}`);
  setText(refs.time, fmtClock(s.timeSec));
  const shiftTotal = sim.getShiftDurationSec();
  setText(refs.shift, `${fmtClock(s.timeSec)} / ${fmtClock(shiftTotal)}`);
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

  setText(refs.reviewLog, s.recentReviews.length ? s.recentReviews.join('\n') : t('signals.noReviews'));

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
    refs.roadmap.textContent = t('history.noRoadmap');
  } else {
    refs.roadmap.textContent = steps.map((s, i) => `${i + 1}. ${s.title}\n   - ${t('roadmap.action')}: ${s.action.replace('_',' ')}\n   - ${t('roadmap.why')}: ${s.rationale}`).join('\n\n');
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
    refs.postmortem.textContent = t('history.noRun');
  }
  refs.eventLog.classList.add('mono');

  if (!s.selected) {
    setText(refs.selName, t('sel.none'));
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
  setText(refs.coverageHint, cov.pct < cov.threshold ? t('coverage.below', { threshold: cov.threshold }) : t('coverage.target', { threshold: cov.threshold }));

  // PlatformPulse
  const p = sim.getPlatform();
  setText(refs.apiLatest, String(p.latestApi));
  setText(refs.apiMin, String(p.minApi));
  setText(refs.oldShare, String(Math.round(p.oldDeviceShare * 100)));
  setText(refs.lowRamShare, String(Math.round(p.lowRamShare * 100)));

  // ZeroDayPulse
  const adv = sim.getAdvisories().filter(a => !a.mitigated).slice(0, 1);
  setText(refs.advisoryText, adv.length ? t('advisory.active', { title: adv[0].title }) : '');

  renderTickets();
  renderRegions();
  syncRunButtons();
  requestDraw();
}
function bindUI(): UIRefs {
  const canvas = must<HTMLCanvasElement>('c');
  const ctx = canvas.getContext('2d');

  const sideBody = must<HTMLElement>('sideBody');
  if (!ctx) throw new Error('2D context not available');

  return {
    canvas,
    ctx,
    sideBody,

    modePill: must('modePill'),
    budget: must('budget'),
    time: must('time'),
    shift: must('shift'),
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
    langSelect: must('langSelect') as HTMLSelectElement,

    btnZoomIn: must('btnZoomIn') as HTMLButtonElement,
    btnZoomOut: must('btnZoomOut') as HTMLButtonElement,
    btnZoomFit: must('btnZoomFit') as HTMLButtonElement,

    tabBtnOverview: must('tabBtnOverview') as HTMLButtonElement,
    tabBtnBacklog: must('tabBtnBacklog') as HTMLButtonElement,
    tabBtnSignals: must('tabBtnSignals') as HTMLButtonElement,
    tabBtnHistory: must('tabBtnHistory') as HTMLButtonElement,
    tabOverview: must('tabOverview'),
    tabBacklog: must('tabBacklog'),
    tabSignals: must('tabSignals'),
    tabHistory: must('tabHistory'),

    coverage: must('coverage'),
    coverageHint: must('coverageHint'),

    capVal: must('capVal'),
    capRegenHint: must('capRegenHint'),
    btnCapRefill: must<HTMLButtonElement>('btnCapRefill'),
    btnCapBoost: must<HTMLButtonElement>('btnCapBoost'),
    btnCapHire: must<HTMLButtonElement>('btnCapHire'),
    btnCapDrink: must<HTMLButtonElement>('btnCapDrink'),
    btnCapShield: must<HTMLButtonElement>('btnCapShield'),
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
    btnProfile: must<HTMLButtonElement>('btnProfile'),
    btnOpenProfile: must<HTMLButtonElement>('btnOpenProfile'),

    btnSelect: must<HTMLButtonElement>('btnSelect'),
    btnLink: must<HTMLButtonElement>('btnLink'),
    btnUnlink: must<HTMLButtonElement>('btnUnlink'),

    btnAdd: must<HTMLButtonElement>('btnAdd'),

    incidentOverlay: must('incidentOverlay'),
    incidentOverlayTitle: must('incidentOverlayTitle'),
    incidentOverlayHint: must('incidentOverlayHint'),
    incidentOverlayDismiss: must<HTMLButtonElement>('incidentOverlayDismiss'),
    incidentOverlayBacklog: must<HTMLButtonElement>('incidentOverlayBacklog'),
    incidentOverlayRefill: must<HTMLButtonElement>('incidentOverlayRefill'),
    incidentOverlayTriage: must<HTMLButtonElement>('incidentOverlayTriage'),
    achPreset: must('achPreset'),
    achUnlocked: must('achUnlocked'),
    achTotal: must('achTotal'),
    profileModal: must('profileModal'),
    profileBackdrop: must('profileBackdrop'),
    profilePresetSelect: must<HTMLSelectElement>('profilePresetSelect'),
    btnCloseProfile: must<HTMLButtonElement>('btnCloseProfile'),
    profileUnlocked: must('profileUnlocked'),
    profileTotal: must('profileTotal'),
    profileBest: must('profileBest'),
    profileAchList: must('profileAchList')
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
  refs.glassSelect.title = t('glass.unsupported');
}
applyGlass(refs.glassSelect.value as ('on' | 'off'));
refs.glassSelect.addEventListener('change', () => {
  const g = refs.glassSelect.value as ('on' | 'off');
  localStorage.setItem(GLASS_KEY, g);
  applyGlass(g);
});
