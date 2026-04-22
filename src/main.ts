import './style.css';
import { GameSim } from './sim';
import { MODE, Mode, ComponentType, Ticket, EvalPreset, EVAL_PRESET, RefactorAction } from './types';
import './entropy';
import { Sparkline } from './sparkline';
import {
  applyTranslations,
  ensureLanguageReady,
  getLanguage,
  loadLanguage,
  populateLanguageSelect,
  setLanguage,
  t,
  type Lang,
} from './i18n';

import type { AchEvent, AchievementUnlock } from './achievements';
import type * as ScoreboardModule from './scoreboard';
import type * as IntegrityModule from './integrity';
import type { ChallengeDef } from './challenges';
import type { ScenarioDef } from './scenarios';
import { AchStub } from './achievements_lazy';

type ThemeMode = 'system' | 'light' | 'dark';
const THEME_KEY = 'theme';
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
  backlogDetails: HTMLDetailsElement;
  backlogSummaryChips: HTMLElement;
  reviewLog: HTMLElement;
  eventLog: HTMLElement;

  votesPerf: HTMLElement;
  votesReliability: HTMLElement;
  votesPrivacy: HTMLElement;
  votesA11y: HTMLElement;
  votesBattery: HTMLElement;

  capVal: HTMLElement;
  capRegenHint: HTMLElement;
  capBarFill: HTMLElement;
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
  langSelect: HTMLSelectElement;

  btnZoomIn: HTMLButtonElement;
  btnZoomOut: HTMLButtonElement;
  btnZoomFit: HTMLButtonElement;

  tabBtnOverview: HTMLButtonElement;
  tabBtnSignals: HTMLButtonElement;
  tabBtnHistory: HTMLButtonElement;
  tabOverview: HTMLElement;
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

  // Refactor modal (architecture debt)
  refactorModal: HTMLElement;
  refactorBackdrop: HTMLElement;
  btnCloseRefactor: HTMLButtonElement;
  refactorTicketTitle: HTMLElement;
  refactorTargetSelect: HTMLSelectElement;
  refactorOptions: HTMLElement;

  // Integrity
  integrityBadge: HTMLElement;

  // Sparklines
  sparkRating: HTMLElement;
  sparkFail: HTMLElement;
  sparkJank: HTMLElement;
  sparkHeap: HTMLElement;

  // Combo
  comboIndicator: HTMLElement;

  // End-of-run modal
  endRunModal: HTMLElement;
  endRunBackdrop: HTMLElement;
  endRunTitle: HTMLElement;
  endRunScore: HTMLElement;
  endRunBreakdown: HTMLElement;
  endRunRating: HTMLElement;
  endRunDuration: HTMLElement;
  endRunDebt: HTMLElement;
  endRunTickets: HTMLElement;
  endRunBonuses: HTMLElement;
  endRunPlayAgain: HTMLButtonElement;
  endRunReplay: HTMLButtonElement;
  endRunDismiss: HTMLButtonElement;

  // Welcome
  welcomeModal: HTMLElement;
  welcomeBackdrop: HTMLElement;
  welcomeDismiss: HTMLButtonElement;

  // Challenges
  challengeDaily: HTMLElement;
  challengeWeekly: HTMLElement;
  btnStartDaily: HTMLButtonElement;
  btnStartWeekly: HTMLButtonElement;
  challengeResults: HTMLElement;

  // Scenarios (v0.3.0)
  scenarioList: HTMLElement;

  // End-of-run grade (v0.3.0)
  endRunGrade: HTMLElement;
  endRunGradeCallouts: HTMLElement;

  // End-of-run replay verification (v0.4)
  endRunVerified: HTMLElement;
};


// --- Lazy module loaders ---------------------------------------------------
// These chunks are deferred until the browser is idle after first paint, so
// the initial module graph parses only what the opening canvas + dashboard
// actually need. See vite.config.ts build.rollupOptions.output.manualChunks
// for the Rollup-level split.

function afterFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    const schedule = () => {
      const ric = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
      if (ric) ric(() => resolve(), { timeout: 500 });
      else setTimeout(() => resolve(), 200);
    };
    // Prefer the real first-contentful-paint signal via PerformanceObserver
    // (buffered:true replays entries that fired before we subscribed).
    // Falls back to a double-rAF + idle schedule when the paint entry type
    // isn't supported, and hard-caps with a setTimeout so a browser that
    // never fires the paint entry (or a canvas-only flow that never paints
    // "contentful" content) still eventually drops its lazy chunks.
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      schedule();
    };
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            po.disconnect();
            done();
            return;
          }
        }
      });
      po.observe({ type: 'paint', buffered: true });
    } catch {
      requestAnimationFrame(() => requestAnimationFrame(done));
    }
    // Safety net for environments with no paint entry (e.g. canvas-only,
    // headless browsers with content-blindness). One second is past every
    // normal cold-start on a desktop and won't impact real first paint.
    setTimeout(done, 1000);
  });
}

let integrityMod: typeof IntegrityModule | null = null;
const integrityModPromise: Promise<typeof IntegrityModule> = afterFirstPaint()
  .then(() => import('./integrity'))
  .then((m) => { integrityMod = m; return m; });

let scoreboardMod: typeof ScoreboardModule | null = null;
const scoreboardModPromise: Promise<typeof ScoreboardModule> = afterFirstPaint()
  .then(() => import('./scoreboard'))
  .then((m) => { scoreboardMod = m; return m; });

let challengesModPromise: Promise<typeof import('./challenges')> | null = null;
function loadChallengesModule(): Promise<typeof import('./challenges')> {
  if (!challengesModPromise) challengesModPromise = import('./challenges');
  return challengesModPromise;
}

let scenariosModPromise: Promise<typeof import('./scenarios')> | null = null;
function loadScenariosModule(): Promise<typeof import('./scenarios')> {
  if (!scenariosModPromise) scenariosModPromise = import('./scenarios');
  return scenariosModPromise;
}

let achievementsModPromise: Promise<typeof import('./achievements')> | null = null;
function loadAchievementsModule(): Promise<typeof import('./achievements')> {
  if (!achievementsModPromise) {
    achievementsModPromise = afterFirstPaint().then(() => import('./achievements'));
  }
  return achievementsModPromise;
}

// Integrity helpers that degrade safely before the chunk lands.
// getTamperState returns a no-tamper state, markTampered queues until ready.
const pendingTamperReasons: string[] = [];
function integrityGetTamperState(): { tampered: boolean; reason: string | null } {
  if (integrityMod) return integrityMod.getTamperState();
  return { tampered: false, reason: null };
}
function integrityMarkTampered(reason: string): void {
  if (integrityMod) integrityMod.markTampered(reason as any);
  else pendingTamperReasons.push(reason);
}
function integrityClearTamperIf(reasons: string[]): void {
  if (integrityMod) integrityMod.clearTamperIf(reasons as any);
}
function integrityIsScoreSane(score: number, durationSec: number, multiplier: number): boolean {
  if (integrityMod) return integrityMod.isScoreSane(score, durationSec, multiplier);
  return true;
}

// Convenience helpers that lazy-chain the integrity + scoreboard modules
// together with the derived key. Callers stay terse without committing
// these chunks to the initial load.
function sealAchievementStorage(preset: EvalPreset): void {
  Promise.all([integrityModPromise, integrityKeyPromise]).then(
    ([m, key]) => m.sealStorageKey(ACH_PREFIX + preset, key)
  );
}
function sealScoreboardNow(): void {
  Promise.all([scoreboardModPromise, integrityKeyPromise]).then(
    ([m, key]) => m.sealScoreboard(key)
  );
}

const sim = new GameSim();


// E2E / CI marker (used by Playwright). Keeps tests deterministic and reduces motion flake.
const IS_E2E = (import.meta as any).env?.VITE_E2E === '1';
(window as any).__E2E__ = IS_E2E;
if (IS_E2E) document.documentElement.classList.add('e2e');

// E2E test hook: expose the sim so scripted tests can fast-forward deterministically
// without waiting on the 1 Hz wall-clock tick loop. Never exposed in production.
if (IS_E2E) (window as any).__SIM__ = sim;

const refs = bindUI();
if (IS_E2E) refs.seedInput.value = '12345';

// One delegated click listener on the ticket list — replaces the per-row
// listeners that were being re-attached on every renderTickets() pass.
setupTicketDelegation();

// --- Sparklines -----------------------------------------------------------
const sparkRating = new Sparkline();
const sparkFail = new Sparkline();
const sparkJank = new Sparkline();
const sparkHeap = new Sparkline();
sparkRating.bind(refs.sparkRating);
sparkFail.bind(refs.sparkFail);
sparkJank.bind(refs.sparkJank);
sparkHeap.bind(refs.sparkHeap);

// --- Localization ---------------------------------------------------------
// Top-level await (es2022) lets the first paint use the correct locale's
// dict. For English this resolves synchronously (inline dict); for other
// locales it pays one extra <lang>.js round-trip, acceptable in exchange
// for a much smaller core chunk.
const initLang = await loadLanguage();
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

// --- Integrity (tamper protection v1) -------------------------------------
const ACH_PREFIX = 'survival.achievements.';
// deriveKey itself is async + uses WebCrypto; chaining it off the lazy-
// loaded integrity chunk keeps it out of the initial module graph.
const integrityKeyPromise: Promise<CryptoKey> = integrityModPromise.then((m) => m.deriveKey(sha));

// Per-run action log archive. Keyed by runId, capped at RUNS_MAX entries so
// the scoreboard card stays small and future Phase 2 submissions have a
// well-defined history to read from.
const RUNS_KEY = 'asr:runs:v1';
const RUNS_MAX = 20;

function persistRunActionLog(runId: string, seed: number, preset: string, log: ReadonlyArray<unknown>): void {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const existing: Array<{ runId: string }> = raw ? (JSON.parse(raw) || []) : [];
    const next = [{ runId, seed, preset, savedAt: Date.now(), log }, ...existing.filter(e => e.runId !== runId)].slice(0, RUNS_MAX);
    localStorage.setItem(RUNS_KEY, JSON.stringify(next));
  } catch {
    // private browsing / quota — ignore
  }
}

Promise.all([integrityModPromise, scoreboardModPromise, integrityKeyPromise]).then(async ([iMod, sbMod, key]) => {
  // Drain any markTampered calls that fired before the integrity chunk
  // landed so the badge state matches the real runtime.
  for (const r of pendingTamperReasons) iMod.markTampered(r as any);
  pendingTamperReasons.length = 0;

  if (iMod.needsMigration()) {
    // First load with integrity — seal existing data silently.
    await sbMod.sealScoreboard(key);
    for (const p of Object.values(EVAL_PRESET)) {
      await iMod.sealStorageKey(ACH_PREFIX + p, key);
    }
    iMod.setMigrationDone();
  } else {
    const sbOk = await sbMod.verifyScoreboard(key);
    if (sbOk === false) iMod.markTampered('scoreboard');
    for (const p of Object.values(EVAL_PRESET)) {
      const achOk = await iMod.verifyStorageKey(ACH_PREFIX + p, key);
      if (achOk === false) iMod.markTampered('achievements');
    }
  }
  // Tamper badge may have flipped; re-sync UI to reflect it.
  scheduleSync();
});

// Paused-state snapshot for runtime tamper detection.
let pausedSnapshot: { budget: number; score: number; rating: number } | null = null;

// Achievements are stored per preset. The stub queues events until the
// real AchievementsTracker chunk loads after first paint, then flushes
// them so no unlocks are lost during the warm-up window.
const ach = new AchStub();
let achLastTickSec = -1;
let achPrevRunning = false;

// Kick off achievements chunk load, attach when ready, flush queued events.
loadAchievementsModule().then((mod) => {
  const real = new mod.AchievementsTracker(ach.getPreset(), new mod.LocalStorageAchStorage());
  const replayed = ach.attachReal(real);
  applyAchievementRewards(replayed);
  renderAchievementSummary(ach.getPreset());
  scheduleSync();
});

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

// Tracks whether the player has explicitly opened or closed the Backlog
// drawer. Once they have, we stop fighting them with auto-open/close.
let backlogUserToggled = false;
let backlogAutoToggling = false;
refs.backlogDetails.addEventListener('toggle', () => {
  if (!backlogAutoToggling) backlogUserToggled = true;
});
function setBacklogOpen(open: boolean) {
  if (refs.backlogDetails.open === open) return;
  backlogAutoToggling = true;
  refs.backlogDetails.open = open;
  backlogAutoToggling = false;
}

function openBacklog() {
  backlogUserToggled = true;
  setBacklogOpen(true);
  refs.backlogDetails.scrollIntoView({ behavior: IS_E2E ? 'auto' : 'smooth', block: 'start' });
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
type TabId = 'overview' | 'signals' | 'history';

const tabSections: Record<TabId, HTMLElement> = {
  overview: refs.tabOverview,
  signals: refs.tabSignals,
  history: refs.tabHistory,
};

const tabButtons: Record<TabId, HTMLButtonElement> = {
  overview: refs.tabBtnOverview,
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

function scrollToTab(id: TabId, _behavior: ScrollBehavior = 'smooth') {
  const section = tabSections[id];
  if (!section) return;

  const apply = () => {
    setActiveTab(id);
    for (const k of Object.keys(tabSections) as TabId[]) {
      const panel = tabSections[k];
      const on = k === id;
      panel.classList.toggle('is-active', on);
      panel.hidden = !on;
    }
    refs.sideBody.scrollTop = 0;
  };

  const startVT = (document as any).startViewTransition;
  if (!IS_E2E && typeof startVT === 'function') {
    startVT.call(document, apply);
  } else {
    apply();
  }
}

const initialTab: TabId = (() => {
  try {
    const stored = localStorage.getItem(TAB_KEY);
    if (stored === 'overview' || stored === 'signals' || stored === 'history') return stored;
    return 'overview';
  } catch { return 'overview'; }
})();

refs.tabBtnOverview.addEventListener('click', () => scrollToTab('overview'));
refs.tabBtnSignals.addEventListener('click', () => scrollToTab('signals'));
refs.tabBtnHistory.addEventListener('click', () => scrollToTab('history'));

// Initial activation once layout is ready
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
refs.langSelect.addEventListener('change', async () => {
  const l = refs.langSelect.value as Lang;
  setLanguage(l);
  document.documentElement.lang = getLanguage();
  // Wait for the lazy locale chunk before repainting translated labels so
  // users don't see English text flash before the target language lands.
  await ensureLanguageReady(l);
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
let lastBacklogSummarySig = '';
let lastTicketsRenderMs = 0;
let lastRegionsRenderMs = 0;

// Which ticket has its overflow menu open, if any. Persisted across the 1Hz
// re-renders so the menu doesn't flicker closed when renderTickets rewrites
// the list via innerHTML.
let openTicketMenuId: number | null = null;

// Ticket title expand/collapse state (kept across re-renders).
// Only used for non-architecture tickets (architecture debt titles are always fully visible).
const expandedTicketTitles = new Set<number>();

function setText(el: HTMLElement, v: string) { if (el.textContent !== v) el.textContent = v; }
function setHTML(el: HTMLElement, v: string) { if (el.innerHTML !== v) el.innerHTML = v; } // only called with trusted game-generated strings

// Buttons now have an SVG <i class="btn-icon"/> + <span class="btn-label"/>
// structure. Setting textContent on the button directly would obliterate the
// icon. setBtnLabel writes to the inner label span when present, and falls
// back to textContent for the handful of plain-text buttons (incident overlay).
function setBtnLabel(btn: HTMLElement, v: string) {
  const span = btn.querySelector<HTMLElement>('.btn-label');
  if (span) {
    if (span.textContent !== v) span.textContent = v;
  } else if (btn.textContent !== v) {
    btn.textContent = v;
  }
}

// --- Modal focus management ------------------------------------------------
let previousFocus: Element | null = null;

function openModal(modal: HTMLElement): void {
  previousFocus = document.activeElement;
  modal.hidden = false;
  const first = modal.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  first?.focus();
  modal.addEventListener('keydown', trapFocus);
}

function closeModal(modal: HTMLElement): void {
  modal.hidden = true;
  modal.removeEventListener('keydown', trapFocus);
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
  previousFocus = null;
}

function trapFocus(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  const modal = e.currentTarget as HTMLElement;
  const focusable = modal.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Briefly flash a CSS animation class on an element. */
function flashAnim(el: HTMLElement, cls: string, ms = 400) {
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

let prevBudget = 3000;
let prevRating = 5.0;

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

function closeAllTicketMenus() {
  openTicketMenuId = null;
  refs.ticketList.querySelectorAll<HTMLElement>('.ticketMenu').forEach((m) => {
    if (!m.hidden) m.hidden = true;
  });
  refs.ticketList.querySelectorAll<HTMLButtonElement>('button[data-overflow]').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
  });
}

// Re-open the menu the user had open before the last innerHTML rewrite.
function restoreOpenTicketMenu() {
  if (openTicketMenuId === null) return;
  const btn = refs.ticketList.querySelector<HTMLButtonElement>(`button[data-overflow="${openTicketMenuId}"]`);
  const menu = btn?.closest('.ticket')?.querySelector<HTMLElement>('.ticketMenu');
  if (!btn || !menu) {
    // Ticket was resolved/removed; clear the memo.
    openTicketMenuId = null;
    return;
  }
  menu.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null;
  if (!t) return;
  if (t.closest('.ticketMenu') || t.closest('.ticketOverflow')) return;
  closeAllTicketMenus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllTicketMenus();
});

function renderBacklogSummary(totals: { s3: number; s2: number; s1: number; s0: number; deferred: number; total: number }) {
  const chipsEl = refs.backlogSummaryChips;
  if (totals.total === 0) {
    setHTML(chipsEl, `<span class="backlogSummary-empty small muted">${escapeHtml(t('backlog.noTickets'))}</span>`);
    return;
  }
  const parts: string[] = [];
  parts.push(`<span class="backlogSummary-total mono">${escapeHtml(t('backlog.summary.total', { n: totals.total }))}</span>`);
  if (totals.s3 > 0) parts.push(`<span class="badge s3 backlogSummary-chip">S3×${totals.s3}</span>`);
  if (totals.s2 > 0) parts.push(`<span class="badge s2 backlogSummary-chip">S2×${totals.s2}</span>`);
  if (totals.s1 > 0) parts.push(`<span class="badge s1 backlogSummary-chip">S1×${totals.s1}</span>`);
  if (totals.s0 > 0) parts.push(`<span class="badge s0 backlogSummary-chip">S0×${totals.s0}</span>`);
  if (totals.deferred > 0) parts.push(`<span class="backlogSummary-chip backlogSummary-chip--muted mono small">${escapeHtml(t('backlog.summary.deferred', { n: totals.deferred }))}</span>`);
  setHTML(chipsEl, parts.join(''));
}

function renderTicketTitleHtml(ticket: Ticket): string {
  const raw = (ticket.title ?? '').toString();
  if (ticket.kind === 'ARCHITECTURE_DEBT') {
    // Show the “reason” on its own line to avoid truncation (especially once localized).
    const idx = raw.indexOf(':');
    if (idx > 0 && idx < raw.length - 1) {
      const prefix = raw.slice(0, idx).trim();
      const reason = raw.slice(idx + 1).trim();
      return `<span class="ticketTitlePrefix">${escapeHtml(prefix)}:</span><br><span class="ticketTitleReason mono">${escapeHtml(reason)}</span>`;
    }
  }
  return escapeHtml(raw);
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
    // Route through sim.applyReward so the mutation lands in the action log
    // and replay verification reproduces the same score.
    const b = a.reward?.budget ?? 0;
    const s = a.reward?.score ?? 0;
    if (b !== 0 || s !== 0) sim.applyReward(b, s);
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
    const tierBadge = v.tier === 0 ? '' : (v.tier === 1 ? t('tier.bronze') : v.tier === 2 ? t('tier.silver') : t('tier.gold'));
    const nextTierKey = v.next ? `tier.${String(v.next.label).toLowerCase()}` : '';
    const nextTierTranslated = v.next ? t(nextTierKey) : '';
    const nextTierLabel = v.next ? (nextTierTranslated === nextTierKey ? v.next.label : nextTierTranslated) : '';
    const next = v.next ? `${t('profile.next')} ${nextTierLabel} - ${v.next.description}` : '';
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
  setBtnLabel(refs.btnCapRefill, cap.cur >= cap.max - 1e-6
    ? t('shop.full')
    : t('shop.refillCost', { cost: fmtMoneyUSD(shop.refillCost) }));

  const canBoost = shop.canRegenUpgrade && (sim.budget >= shop.regenUpgradeCost);
  refs.btnCapBoost.disabled = !canBoost;
  setBtnLabel(refs.btnCapBoost, shop.canRegenUpgrade
    ? t('shop.boostCost', { cost: fmtMoneyUSD(shop.regenUpgradeCost) })
    : t('shop.boostMax'));

  const canHire = shop.canHire && (sim.budget >= shop.hireCost);
  refs.btnCapHire.disabled = !canHire;
  setBtnLabel(refs.btnCapHire, shop.canHire
    ? t('shop.hireCost', { cost: fmtMoneyUSD(shop.hireCost) })
    : t('shop.hireMax'));

  // Unlockable (achievement-gated) shop items.
  refs.btnCapDrink.hidden = !unlocks.booster;
  if (!refs.btnCapDrink.hidden) {
    const canDrink = shop.canBuyBooster && (sim.budget >= shop.boosterCost);
    refs.btnCapDrink.disabled = !canDrink;
    setBtnLabel(refs.btnCapDrink, shop.boosterActive
      ? t('shop.boosterActive', { sec: Math.ceil(shop.boosterRemainingSec) })
      : t('shop.energyDrinkCost', { cost: fmtMoneyUSD(shop.boosterCost) }));
  }

  refs.btnCapShield.hidden = !unlocks.shield;
  if (!refs.btnCapShield.hidden) {
    const canShield = shop.canBuyShield && (sim.budget >= shop.shieldCost);
    refs.btnCapShield.disabled = !canShield;
    setBtnLabel(refs.btnCapShield, shop.shieldCharges > 0
      ? t('shop.shieldReady')
      : t('shop.shieldCost', { cost: fmtMoneyUSD(shop.shieldCost) }));
  }

  // Keep overlay action in sync (incident response quick button)
  if ((refs as any).incidentOverlayRefill) {
    (refs as any).incidentOverlayRefill.disabled = !canRefill;
    setBtnLabel((refs as any).incidentOverlayRefill, t('shop.refillCost', { cost: fmtMoneyUSD(shop.refillCost) }));
  }

  // Capacity progress bar: live fill width + low/med/high color band.
  if (refs.capBarFill) {
    const pct = cap.max > 0 ? Math.max(0, Math.min(100, (cap.cur / cap.max) * 100)) : 0;
    refs.capBarFill.style.width = `${pct}%`;
    refs.capBarFill.classList.toggle('is-low', pct < 33);
    refs.capBarFill.classList.toggle('is-med', pct >= 33 && pct < 66);
    const bar = refs.capBarFill.parentElement?.parentElement;
    if (bar) bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  // Summary chips reflect the full ticket population, not the top-7 slice.
  const allTickets = sim.getTickets();
  const totals = { s3: 0, s2: 0, s1: 0, s0: 0, deferred: 0, total: allTickets.length };
  for (const tk of allTickets) {
    if (tk.deferred) totals.deferred++;
    if (tk.severity === 3) totals.s3++;
    else if (tk.severity === 2) totals.s2++;
    else if (tk.severity === 1) totals.s1++;
    else totals.s0++;
  }

  // Auto-open the drawer when tickets appear (so tests & players see them),
  // auto-close when the backlog clears — respecting any manual toggle.
  const incidentHot = document.documentElement.classList.contains('incident-hot');
  if (!backlogUserToggled) {
    if (totals.total > 0 || incidentHot) setBacklogOpen(true);
    else setBacklogOpen(false);
  }

  const nowMs = performance.now();
  const langSig = getLanguage();

  // Throttle the summary chips: only the counts (+locale) matter, and we do
  // not want to repaint the canvas HUD every 1Hz tick.
  const summarySig = `${totals.s3}:${totals.s2}:${totals.s1}:${totals.s0}:${totals.deferred}:${totals.total}|${langSig}`;
  if (summarySig !== lastBacklogSummarySig) {
    lastBacklogSummarySig = summarySig;
    renderBacklogSummary(totals);
  }

  // Include UI locale in the signature so a language switch re-renders ticket copy immediately.
  // Age is displayed in whole minutes, so bucket ageSec by minute — otherwise
  // we'd trash the ticket DOM (and any open overflow menu) every second.
  const ticketsSig = tickets.map(t => `${t.id}:${t.severity}:${t.impact}:${Math.floor(t.ageSec / 60)}:${t.deferred ? 1 : 0}`).join('|') + `|lang:${langSig}`;
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
    const isExpanded = !isArch && expandedTicketTitles.has(ticket.id);
    const titleHtml = renderTicketTitleHtml(ticket);
    const sevClass = ticket.severity === 3 ? 'sev-critical' : ticket.severity === 2 ? 'sev-medium' : 'sev-low';
    const deferredClass = ticket.deferred ? 'is-deferred' : '';
    const reasonAttr = ticket.reason ? ` title="${escapeHtml(ticket.reason)}" data-reason="${escapeHtml(ticket.reason)}"` : '';
    const sevBadgeClass = ticket.severity === 3 ? 's3' : ticket.severity === 2 ? 's2' : ticket.severity === 1 ? 's1' : 's0';
    return `
      <div class="ticket ${isArch ? 'is-arch' : ''} ${isExpanded ? 'is-expanded' : ''} ${sevClass} ${deferredClass}"${reasonAttr}>
        <div class="ticketMain">
          <div class="ticketTitle"><span class="badge ${sevBadgeClass}">${sev}</span> <span class="ticketTitleText" dir="auto">${titleHtml}</span></div>
          ${!isArch ? `<button class="ticketTitleToggle" data-toggle-title="${ticket.id}" ${isExpanded ? '' : 'hidden'} aria-expanded="${isExpanded ? 'true' : 'false'}">${isExpanded ? t('ticket.collapseTitle') : t('ticket.expandTitle')}</button>` : ''}
          <div class="ticketMeta"><span class="ticketMetaChip">${ticket.category}</span><span class="ticketMetaChip">${t('ticket.impact', { impact: ticket.impact })}</span><span class="ticketMetaChip">${t('ticket.age', { minutes: age })}</span>${ticket.deferred ? `<span class="badge ticketMetaChip">${t('ticket.deferred')}</span>` : ''}${ticket.reason ? `<span class="badge ticketReason ticketMetaChip" aria-label="Why it fired">ⓘ</span>` : ''}</div>
        </div>
        <div class="ticketBtns">
          <button class="btn filled ${canFix ? '' : 'is-disabled'}" data-fix="${ticket.id}" ${canFix ? '' : 'disabled'}>${fixLabel}</button>
          <button class="btn text ticketOverflow" data-overflow="${ticket.id}" aria-haspopup="menu" aria-expanded="false" aria-label="${t('ticket.more')}">⋯</button>
        </div>
        <div class="ticketMenu" role="menu" hidden>
          <button class="btn outlined" role="menuitem" data-defer="${ticket.id}">${deferLabel}</button>
          ${isArch ? `<button class="btn tonal" role="menuitem" data-open-refactor="${ticket.id}">${t('ticket.refactorOptions')}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Click handlers for fix / defer / overflow / refactor / title-toggle are
  // bound once via delegation in setupTicketDelegation() so the per-ticket
  // innerHTML rewrite in this function doesn't spray fresh listeners on
  // every frame.
  restoreOpenTicketMenu();
  updateTicketTitleToggles();
}

function setupTicketDelegation() {
  refs.ticketList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest<HTMLButtonElement>(
      'button[data-fix],button[data-defer],button[data-overflow],button[data-open-refactor],button[data-toggle-title]'
    );
    if (!btn || !refs.ticketList.contains(btn)) return;

    if (btn.hasAttribute('data-fix')) {
      if (btn.disabled) return;
      const id = Number(btn.getAttribute('data-fix'));
      sim.fixTicket(id);
      syncUI();
      return;
    }

    if (btn.hasAttribute('data-defer')) {
      const id = Number(btn.getAttribute('data-defer'));
      openTicketMenuId = null;
      sim.deferTicket(id);
      syncUI();
      return;
    }

    if (btn.hasAttribute('data-open-refactor')) {
      const id = Number(btn.getAttribute('data-open-refactor'));
      openTicketMenuId = null;
      openRefactor(id);
      return;
    }

    if (btn.hasAttribute('data-overflow')) {
      // Stop the document-level click listener from immediately closing the
      // menu we are about to open.
      e.stopPropagation();
      const id = Number(btn.getAttribute('data-overflow'));
      const card = btn.closest('.ticket') as HTMLElement | null;
      const menu = card?.querySelector<HTMLElement>('.ticketMenu');
      if (!menu) return;
      const willOpen = menu.hidden;
      closeAllTicketMenus();
      if (willOpen) {
        openTicketMenuId = id;
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    if (btn.hasAttribute('data-toggle-title')) {
      const id = Number(btn.getAttribute('data-toggle-title'));
      const card = btn.closest('.ticket') as HTMLElement | null;
      if (!card) return;
      const nowExpanded = !card.classList.contains('is-expanded');
      card.classList.toggle('is-expanded', nowExpanded);
      if (nowExpanded) expandedTicketTitles.add(id);
      else expandedTicketTitles.delete(id);
      btn.textContent = nowExpanded ? t('ticket.collapseTitle') : t('ticket.expandTitle');
      btn.setAttribute('aria-expanded', nowExpanded ? 'true' : 'false');
      updateTicketTitleToggles();
    }
  });
}

function updateTicketTitleToggles() {
  const cards = Array.from(refs.ticketList.querySelectorAll<HTMLElement>('.ticket'));
  for (const card of cards) {
    if (card.classList.contains('is-arch')) continue;

    const title = card.querySelector<HTMLElement>('.ticketTitle');
    const toggle = card.querySelector<HTMLButtonElement>('button.ticketTitleToggle[data-toggle-title]');
    if (!title || !toggle) continue;

    const expanded = card.classList.contains('is-expanded');
    if (expanded) {
      toggle.hidden = false;
      toggle.textContent = t('ticket.collapseTitle');
      toggle.setAttribute('aria-expanded', 'true');
      continue;
    }

    // Ensure label is correct even if language changed.
    toggle.textContent = t('ticket.expandTitle');
    toggle.setAttribute('aria-expanded', 'false');

    // Detect line-clamp overflow.
    const truncated = (title.scrollHeight - title.clientHeight) > 1;
    toggle.hidden = !truncated;
  }
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
// Expose the live view transform under E2E so touch tests can convert a
// component's world position to a viewport tap coordinate.
if (IS_E2E) (window as any).__VIEW__ = view;
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
  // Layout changes can affect whether a title is truncated.
  updateTicketTitleToggles();
});

// Parallax: tie the entire sticky dashboard header block to the scroll
// position of .sideBody so the header (title + controls + tabs + status
// strip) subtly drifts up and fades as the user scrolls the card list
// underneath. CSS reads --side-scroll as a 0..1 ratio.
{
  const header = document.querySelector<HTMLElement>('.sideHeader');
  if (header) {
    const PARALLAX_RANGE = 80; // px of scroll over which the effect saturates
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const ratio = Math.min(1, Math.max(0, refs.sideBody.scrollTop / PARALLAX_RANGE));
      header.style.setProperty('--side-scroll', ratio.toFixed(3));
    };
    refs.sideBody.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }
}

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
  sealAchievementStorage(preset);
  sim.setRunning(true);
  startTickLoop();
  syncUI();
};
refs.btnPause.onclick = () => {
  sim.setRunning(false);
  syncUI();
};
refs.btnReset.onclick = () => {
  // Treat reset as run end for achievements tracking.
  applyAchievementRewards(ach.onEvents([{ type: 'RUN_END', atSec: sim.timeSec, reason: 'RESET' }]));
  sealAchievementStorage(refs.presetSelect.value as EvalPreset);
  sim.setRunning(false);
  achLastTickSec = -1;
  const seedStr = (refs.seedInput.value ?? '').trim();
  const seed = seedStr ? Number(seedStr) : undefined;
  sim.reset(
    getCanvasBounds(),
    (seed !== undefined && Number.isFinite(seed)) ? { seed } : undefined
  );
  sparkRating.reset(); sparkFail.reset(); sparkJank.reset(); sparkHeap.reset();
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
  sim.setRunning(false);
  sim.reset(getCanvasBounds(), { seed: daily });
  fitToView();
  syncUI();
};

// --- Challenges -------------------------------------------------------------
let activeChallenge: ChallengeDef | null = null;
let challengesMod: typeof import('./challenges') | null = null;

function renderChallenges() {
  if (!challengesMod) {
    refs.challengeDaily.textContent = '…';
    refs.challengeWeekly.textContent = '…';
    refs.challengeResults.textContent = '';
    return;
  }
  const daily = challengesMod.getDailyChallenge();
  const weekly = challengesMod.getWeeklyChallenge();
  refs.challengeDaily.textContent = `${daily.title} (${daily.preset}, seed ${daily.seed})`;
  refs.challengeWeekly.textContent = `${weekly.title} (${weekly.preset}, seed ${weekly.seed})`;

  const results = challengesMod.loadChallengeResults().slice(0, 5);
  if (results.length) {
    refs.challengeResults.textContent = results.map(r =>
      `${r.challengeId}: ${r.completed ? 'COMPLETED' : 'FAILED'} (${r.finalScore} pts)`
    ).join('\n');
  } else {
    refs.challengeResults.textContent = '';
  }
}

function startChallenge(challenge: ChallengeDef) {
  activeChallenge = challenge;
  sim.setRunning(false);
  refs.presetSelect.value = challenge.preset;
  sim.setPreset(challenge.preset);
  ach.setPreset(challenge.preset);
  refs.seedInput.value = String(challenge.seed);
  sim.reset(getCanvasBounds(), { seed: challenge.seed });
  if (challenge.constraint === 'LOW_BUDGET') {
    // LOW_BUDGET drops the default starting budget to $1500. Route through
    // applyReward so replay reproduces the same delta and verification passes.
    sim.applyReward(1500 - sim.budget, 0);
  }
  sparkRating.reset(); sparkFail.reset(); sparkJank.reset(); sparkHeap.reset();
  fitToView();
  syncUI();
}

refs.btnStartDaily.onclick = async () => {
  const mod = await loadChallengesModule();
  startChallenge(mod.getDailyChallenge());
};
refs.btnStartWeekly.onclick = async () => {
  const mod = await loadChallengesModule();
  startChallenge(mod.getWeeklyChallenge());
};

renderChallenges();
// Fetch the challenges chunk after first paint; render fills in once ready.
afterFirstPaint().then(() => loadChallengesModule()).then((mod) => {
  challengesMod = mod;
  renderChallenges();
});

// --- Scenarios (Release Trains) --------------------------------------------
let activeScenario: ScenarioDef | null = null;
let scenariosMod: typeof import('./scenarios') | null = null;

function renderScenarios() {
  if (!scenariosMod) {
    setHTML(refs.scenarioList, `<div class="small muted">…</div>`);
    return;
  }
  const scenarios = scenariosMod.listScenarios();
  const results = scenariosMod.loadScenarioResults();
  const html = scenarios.map(s => {
    const completed = results.some(r => r.scenarioId === s.id && r.completed);
    const badge = completed ? ' ✓' : '';
    return `
      <div class="scenarioRow" data-scenario-id="${escapeHtml(s.id)}">
        <div>
          <div class="k">${escapeHtml(s.title)}${badge}</div>
          <div class="small muted" style="margin-top:4px;">${escapeHtml(s.brief)}</div>
          <div class="small mono" style="margin-top:4px;">${escapeHtml(s.preset)} • seed ${s.seed} • bonus x${s.bonusMultiplier.toFixed(2)}</div>
        </div>
        <div class="row" style="margin-top:8px;">
          <button class="btn tonal" data-start-scenario="${escapeHtml(s.id)}">Start</button>
        </div>
      </div>
    `;
  }).join('');
  setHTML(refs.scenarioList, html);

  refs.scenarioList.querySelectorAll<HTMLButtonElement>('button[data-start-scenario]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-start-scenario');
      const scenario = scenarios.find(x => x.id === id);
      if (scenario) startScenario(scenario);
    });
  });
}

function startScenario(scenario: ScenarioDef) {
  activeScenario = scenario;
  sim.setRunning(false);
  refs.presetSelect.value = scenario.preset;
  ach.setPreset(scenario.preset);
  sim.loadScenario(
    { id: scenario.id, seed: scenario.seed, preset: scenario.preset, incidentScript: scenario.incidentScript },
    getCanvasBounds()
  );
  refs.seedInput.value = String(scenario.seed);
  sparkRating.reset(); sparkFail.reset(); sparkJank.reset(); sparkHeap.reset();
  fitToView();
  sim.setRunning(true);
  syncUI();
}

renderScenarios();
afterFirstPaint().then(() => loadScenariosModule()).then((mod) => {
  scenariosMod = mod;
  renderScenarios();
});

// --- Welcome modal (first visit only) -------------------------------------
const WELCOME_KEY = 'asr:welcomed:v1';
if (!IS_E2E && !localStorage.getItem(WELCOME_KEY)) {
  openModal(refs.welcomeModal);
}
function closeWelcome() {
  closeModal(refs.welcomeModal);
  try { localStorage.setItem(WELCOME_KEY, '1'); } catch { /* ignore */ }
}
refs.welcomeDismiss.onclick = closeWelcome;
refs.welcomeBackdrop.onclick = closeWelcome;

function openProfile(preset: EvalPreset) {
  openModal(refs.profileModal);
  refs.profilePresetSelect.value = preset;
  renderProfile(preset);
}
function closeProfile() {
  closeModal(refs.profileModal);
}

function showEndRunModal() {
  const run = sim.lastRun;
  if (!run) return;

  // Title styling by outcome
  const titleEl = refs.endRunTitle;
  titleEl.classList.remove('is-success', 'is-failure', 'is-budget');
  if (run.endReason === 'SHIFT_COMPLETE') {
    titleEl.textContent = 'Shift Complete';
    titleEl.classList.add('is-success');
  } else if (run.endReason === 'RATING_COLLAPSED') {
    titleEl.textContent = 'Rating Collapsed';
    titleEl.classList.add('is-failure');
  } else {
    titleEl.textContent = 'Budget Depleted';
    titleEl.classList.add('is-budget');
  }

  refs.endRunScore.textContent = String(run.finalScore);

  // Breakdown
  const lines = [`Base score: ${run.rawScore}`, `Multiplier: x${run.multiplier.toFixed(2)}`];
  if (run.bonuses && run.bonuses.length) {
    for (const b of run.bonuses) lines.push(`+${Math.round(b.pct * 100)}% ${b.label}`);
  }
  refs.endRunBreakdown.textContent = lines.join('\n');

  // Key stats
  refs.endRunRating.textContent = `${run.rating.toFixed(1)} ★`;
  refs.endRunDuration.textContent = fmtClock(run.durationSec);
  refs.endRunDebt.textContent = `${Math.round(run.architectureDebt)}/100`;
  refs.endRunTickets.textContent = String(run.ticketsOpen);

  // Bonuses section
  if (run.bonuses && run.bonuses.length) {
    refs.endRunBonuses.textContent = run.bonuses.map(b => `+${Math.round(b.pct * 100)}% ${b.label}`).join('\n');
  } else {
    refs.endRunBonuses.textContent = '';
  }

  // Postmortem grade letter + callouts (v0.3.0)
  const grade = sim.getLastGrade();
  if (grade) {
    refs.endRunGrade.textContent = grade.letter;
    refs.endRunGradeCallouts.textContent = grade.callouts.join('\n');
  } else {
    refs.endRunGrade.textContent = '-';
    refs.endRunGradeCallouts.textContent = '';
  }

  // Replay verification badge (v0.4)
  if (run.verified === true) {
    refs.endRunVerified.textContent = '✓ Verified (replay matches)';
    refs.endRunVerified.classList.remove('is-failure');
    refs.endRunVerified.classList.add('is-success');
  } else if (run.verified === false) {
    refs.endRunVerified.textContent = '✗ Replay mismatch';
    refs.endRunVerified.classList.remove('is-success');
    refs.endRunVerified.classList.add('is-failure');
  } else {
    refs.endRunVerified.textContent = '';
  }

  openModal(refs.endRunModal);
}

function closeEndRun() {
  closeModal(refs.endRunModal);
}

refs.endRunDismiss.onclick = closeEndRun;
// Deliberately no backdrop-to-close for the end-run modal: the postmortem
// is the only moment to read the run result, and a stray outside-tap was
// silently dismissing it. Users close via the explicit Close button or by
// starting the next run via Play Again / Replay Seed.

refs.endRunPlayAgain.onclick = () => {
  closeEndRun();
  sim.setRunning(false);
  sim.reset(getCanvasBounds());
  sparkRating.reset(); sparkFail.reset(); sparkJank.reset(); sparkHeap.reset();
  fitToView();
  syncUI();
};

refs.endRunReplay.onclick = () => {
  closeEndRun();
  const seed = sim.lastRun?.seed;
  sim.setRunning(false);
  sim.reset(getCanvasBounds(), seed ? { seed } : undefined);
  if (seed) refs.seedInput.value = String(seed);
  sparkRating.reset(); sparkFail.reset(); sparkJank.reset(); sparkHeap.reset();
  fitToView();
  syncUI();
};

function renderRefactorModal(ticketId: number) {
  const ticket = sim.getTickets().find(t => t.id === ticketId);
  if (!ticket || ticket.kind !== 'ARCHITECTURE_DEBT') {
    toast(t('toast.noRoadmapTicket'));
    closeRefactor();
    return;
  }

  const sev = ['S0', 'S1', 'S2', 'S3'][ticket.severity] ?? 'S?';
  const badgeCls = (ticket.severity === 3 ? 's3' : ticket.severity === 2 ? 's2' : ticket.severity === 1 ? 's1' : 's0');
  const age = Math.floor(ticket.ageSec / 60);
  const titleHtml = renderTicketTitleHtml(ticket);
  setHTML(refs.refactorTicketTitle, `
    <div class="ticketTitle ticketTitleModal">
      <span class="badge ${badgeCls}">${sev}</span>
      <span class="ticketTitleText" dir="auto">${titleHtml}</span>
    </div>
    <div class="ticketMeta" style="margin-top:6px;">
      <span>${escapeHtml(ticket.category)}</span>
      <span>${t('ticket.impact', { impact: ticket.impact })}</span>
      <span>${t('ticket.age', { minutes: age })}</span>
    </div>
  `);

  // Target selector: worst violation by default, or user-selected.
  const violations = sim.getArchViolations().slice(0, 8);
  refs.refactorTargetSelect.innerHTML = [
    `<option value="">${escapeHtml(t('ticket.autoTarget'))}</option>`,
    ...violations.map(v => `<option value="${escapeHtml(v.key)}">${escapeHtml(v.reason)}</option>`)
  ].join('');

  const opts = sim.getRefactorOptions(ticketId);
  if (!opts.length) {
    setHTML(refs.refactorOptions, `<div class="small muted">${escapeHtml(t('toast.noRoadmapTicket'))}</div>`);
    return;
  }

  refs.refactorOptions.innerHTML = opts.map(o => `
    <button class="refactorOption" data-refactor="${ticketId}" data-action="${o.action}">
      <div class="refactorOptionTop">
        <div class="refactorOptionTitle">${escapeHtml(o.title)}</div>
        <div class="refactorOptionChips">
          <span class="chip mono">${escapeHtml(fmtMoneyUSD(o.cost))}</span>
          <span class="chip mono">${escapeHtml(`${o.debtDelta} debt`)}</span>
          <span class="chip mono">${escapeHtml(`+${o.scoreBonus} score`)}</span>
        </div>
      </div>
      <div class="refactorOptionDesc small muted">${escapeHtml(o.description)}</div>
    </button>
  `).join('');

  refs.refactorOptions.querySelectorAll<HTMLButtonElement>('button[data-refactor]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      const id = Number(el.getAttribute('data-refactor'));
      const action = el.getAttribute('data-action') as RefactorAction;
      const targetKey = refs.refactorTargetSelect.value || undefined;
      const res = sim.applyRefactor(id, action, targetKey);
      if (!res.ok) toast(res.reason || 'Refactor failed');
      closeRefactor();
      syncUI();
    });
  });
}

function openRefactor(ticketId: number) {
  openModal(refs.refactorModal);
  renderRefactorModal(ticketId);
}

function closeRefactor() {
  closeModal(refs.refactorModal);
}

refs.btnProfile.onclick = () => openProfile(refs.presetSelect.value as EvalPreset);
refs.btnOpenProfile.onclick = () => openProfile(refs.presetSelect.value as EvalPreset);
refs.btnCloseProfile.onclick = closeProfile;
refs.profileBackdrop.onclick = closeProfile;
refs.profilePresetSelect.addEventListener('change', () => {
  renderProfile(refs.profilePresetSelect.value as EvalPreset);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!refs.refactorModal.hidden) closeRefactor();
  else if (!refs.profileModal.hidden) closeProfile();
});

refs.btnCloseRefactor.onclick = closeRefactor;
refs.refactorBackdrop.onclick = closeRefactor;


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

refs.btnClearScoreboard.onclick = async () => {
  const sb = await scoreboardModPromise;
  sb.clearScoreboard();
  sealScoreboardNow();
  // Clearing the scoreboard resolves scoreboard-origin tamper reasons. Other
  // reasons (achievements, runtime) stay sticky since their data is untouched.
  integrityClearTamperIf(['scoreboard', 'score']);
  refs.integrityBadge.hidden = !integrityGetTamperState().tampered;
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
  // Mode change implicitly cancels an in-progress link pick.
  clearLinkPreview();
  refs.canvas.style.cursor = canvasCursorForMode();
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

// While in Link / Unlink mode and the user has clicked a source component,
// track the mouse in world coords plus the hover target so draw() can render
// a live dashed preview. Cleared on click completion, mode change, or Escape.
type LinkPreviewState = { mx: number; my: number; hoverId: number | null };
let linkPreview: LinkPreviewState | null = null;

// Multi-pointer tracking. Each entry is the latest client-space coords for
// one pointerId. Gesture (pinch / two-finger pan) activates at size >= 2.
const pointers = new Map<number, { x: number; y: number }>();
type PinchState = {
  startDist: number;
  startScale: number;
  // World point under the pinch midpoint when the gesture began. Keeping
  // this point under the live midpoint yields zoom + two-finger pan in one.
  startMidWorld: { x: number; y: number };
};
let pinchState: PinchState | null = null;

function clearLinkPreview() {
  if (linkPreview) {
    linkPreview = null;
    requestDraw();
  }
}

function canvasCursorForMode(): string {
  if (sim.mode === MODE.LINK || sim.mode === MODE.UNLINK) return 'crosshair';
  return '';
}

function firstTwoPointers() {
  const it = pointers.values();
  const a = it.next().value as { x: number; y: number };
  const b = it.next().value as { x: number; y: number };
  return { a, b };
}

function beginPinch() {
  const { a, b } = firstTwoPointers();
  const mxClient = (a.x + b.x) / 2;
  const myClient = (a.y + b.y) / 2;
  const r = refs.canvas.getBoundingClientRect();
  const midX = mxClient - r.left;
  const midY = myClient - r.top;
  pinchState = {
    startDist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    startScale: view.scale,
    startMidWorld: {
      x: (midX - view.tx) / view.scale,
      y: (midY - view.ty) / view.scale,
    },
  };
  // Entering gesture mode cancels any in-flight single-pointer interaction
  // so lifting a finger doesn't drop a component or stamp a link.
  draggingId = null;
  panning = false;
  clearLinkPreview();
  refs.canvas.style.cursor = canvasCursorForMode();
}

function updatePinch() {
  if (!pinchState) return;
  const { a, b } = firstTwoPointers();
  const mxClient = (a.x + b.x) / 2;
  const myClient = (a.y + b.y) / 2;
  const r = refs.canvas.getBoundingClientRect();
  const midX = mxClient - r.left;
  const midY = myClient - r.top;
  const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
  const ratio = dist / pinchState.startDist;
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchState.startScale * ratio));
  view.scale = next;
  // Keep the world point that was under the initial midpoint pinned under
  // the current midpoint — translation and zoom fall out of the same math.
  view.tx = midX - pinchState.startMidWorld.x * next;
  view.ty = midY - pinchState.startMidWorld.y * next;
  requestDraw();
}

refs.canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  // Pointer capture keeps events coming to the canvas even when the finger
  // leaves its rect, and makes pointerup/pointercancel reliable on touch.
  try { refs.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }

  if (pointers.size >= 2) {
    beginPinch();
    e.preventDefault();
    return;
  }

  // Mouse-only: alt/middle/right-button drag pans the view.
  if (e.pointerType === 'mouse' && (e.button === 1 || e.button === 2 || e.altKey)) {
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
    sim.setSelected(null);
    sim.linkFromId = null;
    clearLinkPreview();
    syncUI();
    return;
  }

  if (sim.mode === MODE.SELECT) {
    sim.setSelected(hit.id);
    draggingId = hit.id;
    dragOffX = pt.x - hit.x;
    dragOffY = pt.y - hit.y;
    refs.canvas.style.cursor = 'grabbing';
    syncUI();
    return;
  }

  // Link/Unlink
  if (!sim.linkFromId) {
    sim.linkFromId = hit.id;
    sim.setSelected(hit.id);
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
  clearLinkPreview();
  syncUI();
});

refs.canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pinchState && pointers.size >= 2) {
    updatePinch();
    e.preventDefault();
    return;
  }

  if (panning) {
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    view.tx = panStartTx + dx;
    view.ty = panStartTy + dy;
    requestDraw();
    return;
  }
  if (draggingId) {
    const pt = screenToWorld(e);
    sim.moveComponent(draggingId, pt.x - dragOffX, pt.y - dragOffY);
    requestDraw();
    return;
  }
  // Live link-preview: once the user has picked a source in LINK / UNLINK mode,
  // the pointer drives a dashed line so the target is obvious before committing.
  if (sim.linkFromId != null && (sim.mode === MODE.LINK || sim.mode === MODE.UNLINK)) {
    const pt = screenToWorld(e);
    const hover = hitComponent(pt.x, pt.y);
    const hoverId = hover && hover.id !== sim.linkFromId ? hover.id : null;
    linkPreview = { mx: pt.x, my: pt.y, hoverId };
    requestDraw();
  } else if (linkPreview) {
    clearLinkPreview();
  }
});

function endPointer(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  try { refs.canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

  // Exiting gesture mode: the surviving pointer (if any) becomes a fresh
  // anchor on its next interaction — we deliberately do not resume drag.
  if (pointers.size < 2) pinchState = null;

  if (pointers.size === 0) {
    draggingId = null;
    panning = false;
    refs.canvas.style.cursor = canvasCursorForMode();
  }
}

refs.canvas.addEventListener('pointerup', endPointer);
refs.canvas.addEventListener('pointercancel', endPointer);

// Escape bails out of an in-progress link-pick, matching convention.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sim.linkFromId != null) {
    sim.linkFromId = null;
    clearLinkPreview();
    syncUI();
  }
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

function screenToWorld(e: { clientX: number; clientY: number }) {
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
// Category colors for component types
const COMP_COLORS: Record<string, string> = {
  // Core pipeline (blue)
  UI: 'rgba(100,160,255,0.75)', VM: 'rgba(100,160,255,0.70)',
  DOMAIN: 'rgba(100,160,255,0.65)', REPO: 'rgba(100,160,255,0.60)',
  // Data layer (teal)
  CACHE: 'rgba(80,200,200,0.70)', DB: 'rgba(80,200,200,0.65)',
  NET: 'rgba(80,200,200,0.60)', WORK: 'rgba(80,200,200,0.55)',
  // Security (purple)
  AUTH: 'rgba(180,140,255,0.70)', PINNING: 'rgba(180,140,255,0.65)',
  KEYSTORE: 'rgba(180,140,255,0.60)', SANITIZER: 'rgba(180,140,255,0.55)',
  ABUSE: 'rgba(180,140,255,0.50)',
  // Sidecars (amber)
  OBS: 'rgba(255,200,80,0.65)', FLAGS: 'rgba(255,200,80,0.60)',
  // Accessibility (green)
  A11Y: 'rgba(140,230,140,0.65)',
  // v0.3.0 new surfaces
  BILLING: 'rgba(180,140,255,0.55)',     // security/monetization purple
  PUSH: 'rgba(100,160,255,0.55)',        // core pipeline blue
  DEEPLINK: 'rgba(255,200,80,0.58)',     // sidecar amber
};

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New"';

function draw() {
  const ctx = refs.ctx;

  // Clear in device pixels.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);

  // Dot grid background (screen space)
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  const gridStep = 30 * canvasDpr;
  const offX = (view.tx * canvasDpr) % gridStep;
  const offY = (view.ty * canvasDpr) % gridStep;
  for (let gx = offX; gx < refs.canvas.width; gx += gridStep) {
    for (let gy = offY; gy < refs.canvas.height; gy += gridStep) {
      ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);
    }
  }

  // World transform (world px -> screen px -> device px).
  const s = view.scale * canvasDpr;
  ctx.setTransform(s, 0, 0, s, view.tx * canvasDpr, view.ty * canvasDpr);

  // Build an id->node map once per frame.
  const byId = new Map<number, typeof sim.components[number]>();
  for (const n of sim.components) byId.set(n.id, n);

  // Links
  for (const l of sim.links) {
    const a = byId.get(l.from);
    const b = byId.get(l.to);
    if (!a || !b) continue;

    const selectedPath =
      (sim.selectedId === a.id || sim.selectedId === b.id) ||
      (sim.linkFromId === a.id);

    ctx.lineWidth = (selectedPath ? 2.5 : 1.4) / view.scale;

    if (selectedPath) {
      ctx.strokeStyle = 'rgba(200,220,255,.65)';
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = b.x - ux * 26;
    const py = b.y - uy * 26;

    ctx.fillStyle = selectedPath ? 'rgba(200,220,255,.65)' : 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - uy * 6 - ux * 10, py + ux * 6 - uy * 10);
    ctx.lineTo(px + uy * 6 - ux * 10, py - ux * 6 - uy * 10);
    ctx.closePath();
    ctx.fill();
  }

  // Link preview: dashed line from the picked source to the mouse or snapped
  // target. Green when committing would create a valid link, red when the
  // mode is UNLINK or the target is invalid, soft blue when tracking empty
  // space. Drawn under components so the node body still reads clearly.
  if (sim.linkFromId != null && linkPreview) {
    const from = byId.get(sim.linkFromId);
    if (from) {
      const target = linkPreview.hoverId != null ? byId.get(linkPreview.hoverId) : null;
      const tx = target ? target.x : linkPreview.mx;
      const ty = target ? target.y : linkPreview.my;
      const isUnlink = sim.mode === MODE.UNLINK;
      const validTarget = !!target && target.id !== from.id;
      ctx.save();
      ctx.setLineDash([6 / view.scale, 5 / view.scale]);
      ctx.lineWidth = 2 / view.scale;
      ctx.strokeStyle = isUnlink
        ? 'rgba(255,120,140,0.85)'
        : validTarget ? 'rgba(140,230,160,0.85)' : 'rgba(200,220,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      if (target) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = isUnlink
          ? 'rgba(255,120,140,0.65)'
          : validTarget ? 'rgba(140,230,160,0.65)' : 'rgba(255,120,140,0.65)';
        ctx.lineWidth = 2 / view.scale;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Components
  let anyPulsingTier3 = false;
  for (const n of sim.components) {
    const sel = (sim.selectedId === n.id);
    const lf = (sim.linkFromId === n.id);
    const glow = sel || lf;
    const health = n.health / 100;
    const compColor = COMP_COLORS[n.type] ?? 'rgba(100,160,255,0.65)';

    // Tier glow ring. T2 is a static subtle ring; T3 breathes on a ~0.6Hz
    // sine so mastered components stand out without strobing — the
    // lineWidth and alpha modulate together, radius gets a small amount.
    if (n.tier >= 2 && !n.down) {
      const isT3 = n.tier === 3;
      let alpha = isT3 ? 0.28 : 0.12;
      let extraR = isT3 ? 8 : 5;
      if (isT3) {
        anyPulsingTier3 = true;
        const phase = IS_E2E
          ? 0.5
          : 0.5 + 0.5 * Math.sin(performance.now() / 1000 * Math.PI * 1.2);
        alpha = 0.18 + phase * 0.22;
        extraR = 7 + phase * 4;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + extraR, 0, Math.PI * 2);
      ctx.strokeStyle = isT3
        ? `rgba(255,220,100,${alpha.toFixed(3)})`
        : 'rgba(200,210,255,.12)';
      ctx.lineWidth = (isT3 ? 2.5 : 1.5) / view.scale;
      ctx.stroke();
    }

    // Selection glow
    if (glow) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,210,255,.10)';
      ctx.fill();
    }

    // Component body: base fill with a soft drop shadow (save/restore
    // keeps shadow state from bleeding into the stroke / label / badge
    // we draw on the same component next).
    ctx.save();
    if (!n.down) {
      ctx.shadowColor = 'rgba(0,0,0,0.40)';
      ctx.shadowBlur = 9 / view.scale;
      ctx.shadowOffsetY = 2 / view.scale;
    }
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = n.down ? 'rgba(120,60,80,.55)' : compColor;
    ctx.fill();
    ctx.restore();

    // Top-left highlight via a radial gradient overlay — gives the body
    // a subtle "lit from above" feel without touching the base color.
    if (!n.down) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      const hl = ctx.createRadialGradient(
        n.x - n.r * 0.35, n.y - n.r * 0.45, n.r * 0.08,
        n.x - n.r * 0.15, n.y - n.r * 0.20, n.r * 1.05
      );
      hl.addColorStop(0, 'rgba(255,255,255,0.26)');
      hl.addColorStop(0.55, 'rgba(255,255,255,0.06)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.lineWidth = (sel ? 2.5 : 1.2) / view.scale;
    ctx.strokeStyle = n.down ? 'rgba(255,120,160,.60)' : 'rgba(255,255,255,.25)';
    ctx.stroke();

    // Health ring (arc around component, clockwise fill)
    if (!n.down && health < 0.95) {
      const ringR = n.r + 2;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * health;

      // Background ring
      ctx.beginPath();
      ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 3 / view.scale;
      ctx.stroke();

      // Health fill
      ctx.beginPath();
      ctx.arc(n.x, n.y, ringR, startAngle, endAngle);
      const hColor = health > 0.7 ? 'rgba(140,230,140,.60)' :
                     health > 0.3 ? 'rgba(255,200,80,.60)' :
                                    'rgba(255,100,100,.70)';
      ctx.strokeStyle = hColor;
      ctx.lineWidth = 3 / view.scale;
      ctx.stroke();
    }

    // Down indicator: pulsing red ring
    if (n.down) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,80,100,.45)';
      ctx.lineWidth = 2 / view.scale;
      ctx.stroke();
    }

    // Label (type name)
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `11px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.type, n.x, n.y);

    // Tier badge (bottom-right)
    if (n.tier > 1) {
      const badgeX = n.x + n.r * 0.6;
      const badgeY = n.y + n.r * 0.6;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 7, 0, Math.PI * 2);
      ctx.fillStyle = n.tier === 3 ? 'rgba(255,200,60,.85)' : 'rgba(180,200,255,.70)';
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.85)';
      ctx.font = `bold 8px ${MONO_FONT}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${n.tier}`, badgeX, badgeY);
    }
  }

  // UI overlay layer in screen px.
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const hint =
    sim.mode === MODE.LINK
      ? t('hint.link')
      : sim.mode === MODE.UNLINK
        ? t('hint.unlink')
        : t('hint.select');
  ctx.fillText(hint, 16, 12);

  // Keep the tier-3 ring breathing as long as any mastered component is
  // on screen and the sim is running. The loop self-terminates once
  // neither is true, so idle / paused runs cost nothing.
  if (anyPulsingTier3 && sim.running) ensurePulseLoop();
}

let pulseRafId: number | null = null;
function ensurePulseLoop() {
  if (IS_E2E || pulseRafId !== null) return;
  const step = () => {
    pulseRafId = null;
    const stillPulsing = sim.running && sim.components.some(n => n.tier === 3 && !n.down);
    if (!stillPulsing) return;
    requestDraw();
    pulseRafId = requestAnimationFrame(step);
  };
  pulseRafId = requestAnimationFrame(step);
}


function renderScoreboard() {
  // Before the scoreboard chunk lands there is nothing to read; the empty-
  // state message is also what localStorage would resolve to, so users see
  // no flicker when the module finally attaches.
  if (!scoreboardMod) {
    refs.scoreboardList.textContent = t('history.noScores');
    return;
  }
  const entries = scoreboardMod.loadScoreboard();
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
    if (ach.isReady()) sealAchievementStorage(currentPreset);
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
  if (sim.running && s.budget < prevBudget - 50) flashAnim(refs.budget, 'anim-flash-red');
  prevBudget = s.budget;
  setText(refs.time, fmtClock(s.timeSec));
  const shiftTotal = sim.getShiftDurationSec();
  setText(refs.shift, `${fmtClock(s.timeSec)} / ${fmtClock(shiftTotal)}`);
  setText(refs.rating, `${s.rating.toFixed(1)} ★`);
  if (sim.running && s.rating < prevRating - 0.15) flashAnim(refs.rating, 'anim-flash-red');
  prevRating = s.rating;
  setText(refs.seedVal, `${s.seed}`);
  setText(refs.score, `${Math.round(s.score)}`);
  refs.comboIndicator.hidden = !s.comboActive;
  if (s.comboActive) {
    refs.comboIndicator.textContent = `COMBO x${s.comboCount}`;
  }
  setText(refs.archDebt, `${Math.round(s.architectureDebt)}`);
  setText(refs.fail, `${(s.failureRate * 100).toFixed(1)}%`);
  setText(refs.anr, `${(s.anrRisk * 100).toFixed(1)}%`);
  setText(refs.lat, `${Math.round(s.p95LatencyMs)} ms`);
  setText(refs.bat, `${Math.round(s.battery)}`);
  setText(refs.jank, `${Math.round(s.jankPct)}%`);
  setText(refs.heap, `${Math.round(s.heapMb)} MB`);
  setText(refs.gc, `${Math.round(s.gcPauseMs)}`);
  setText(refs.oom, `${s.oomCount}`);

  // Sparklines: sparkRating lives in the always-visible sticky header, so
  // keep pushing it. The other three live inside the Overview tab panels;
  // skip their push() calls when Overview isn't the active tab so hidden
  // SVG point-lists aren't rewritten four times per tick.
  if (sim.running) {
    sparkRating.push(s.rating);
    if (refs.tabOverview.classList.contains('is-active')) {
      sparkFail.push(s.failureRate * 100);
      sparkJank.push(s.jankPct);
      sparkHeap.push(s.heapMb);
    }
  }

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
      const lastRun = s.lastRun;
      lastSavedRunId = lastRun.runId;
      showEndRunModal();
      if (!integrityIsScoreSane(lastRun.finalScore, lastRun.durationSec, lastRun.multiplier)) {
        integrityMarkTampered('score');
      }
      scoreboardModPromise.then((sb) => {
        sb.addScoreEntry({
          runId: lastRun.runId,
          seed: lastRun.seed,
          preset: lastRun.preset,
          endReason: lastRun.endReason,
          endedAtTs: lastRun.endedAtTs,
          durationSec: lastRun.durationSec,
          finalScore: lastRun.finalScore,
          multiplier: lastRun.multiplier,
          architectureDebt: lastRun.architectureDebt,
          rating: lastRun.rating,
        });
        sealScoreboardNow();
        renderScoreboard();
      });
      persistRunActionLog(lastRun.runId, lastRun.seed, lastRun.preset, sim.getActionLog());

      // Evaluate active challenge
      if (activeChallenge && lastRun.seed === activeChallenge.seed) {
        const maxTier = sim.components.reduce((mx, c) => Math.max(mx, c.tier), 0);
        const challenge = activeChallenge;
        loadChallengesModule().then((mod) => {
          const result = mod.evaluateChallenge(challenge, lastRun, sim.engRefillsUsed, maxTier > 1 ? 1 : 0);
          mod.saveChallengeResult(result);
          renderChallenges();
        });
        activeChallenge = null;
      }

      // Evaluate active scenario
      if (activeScenario && lastRun.seed === activeScenario.seed) {
        const goal = activeScenario.goal;
        let completed = lastRun.endReason === 'SHIFT_COMPLETE';
        if (completed) {
          if (goal.kind === 'RATING') completed = lastRun.rating >= goal.threshold;
          else if (goal.kind === 'ZERO_DEBT') completed = Math.round(lastRun.architectureDebt) === 0;
          else if (goal.kind === 'NO_CRASH_TICKETS') {
            completed = !sim.tickets.some(t => t.kind === 'CRASH_SPIKE');
          } else if (goal.kind === 'COMPLIANCE') {
            const r = sim.getRegions().find(x => x.code === goal.region);
            completed = (r?.compliance ?? 0) >= goal.threshold;
          }
        }
        const scenario = activeScenario;
        loadScenariosModule().then((mod) => {
          mod.saveScenarioResult({
            scenarioId: scenario.id,
            completed,
            finalScore: Math.round(lastRun.finalScore * (completed ? scenario.bonusMultiplier : 1)),
            endedAtTs: lastRun.endedAtTs,
          });
          renderScenarios();
        });
        activeScenario = null;
      }
    }
  } else {
    refs.postmortem.textContent = t('history.noRun');
  }
  refs.eventLog.classList.add('mono');

  if (!s.selected) {
    setText(refs.selName, t('sel.none'));
    setText(refs.selStats, '-');
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

  // --- Integrity: paused-state tamper check --------------------------------
  if (!sim.running && sim.timeSec > 0) {
    if (pausedSnapshot) {
      if (sim.budget !== pausedSnapshot.budget ||
          sim.score !== pausedSnapshot.score ||
          sim.rating !== pausedSnapshot.rating) {
        integrityMarkTampered('runtime');
      }
    }
    pausedSnapshot = { budget: sim.budget, score: sim.score, rating: sim.rating };
  } else {
    pausedSnapshot = null;
  }
  refs.integrityBadge.hidden = !integrityGetTamperState().tampered;

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
    langSelect: must('langSelect') as HTMLSelectElement,

    btnZoomIn: must('btnZoomIn') as HTMLButtonElement,
    btnZoomOut: must('btnZoomOut') as HTMLButtonElement,
    btnZoomFit: must('btnZoomFit') as HTMLButtonElement,

    tabBtnOverview: must('tabBtnOverview') as HTMLButtonElement,
    tabBtnSignals: must('tabBtnSignals') as HTMLButtonElement,
    tabBtnHistory: must('tabBtnHistory') as HTMLButtonElement,
    tabOverview: must('tabOverview'),
    tabSignals: must('tabSignals'),
    tabHistory: must('tabHistory'),

    coverage: must('coverage'),
    coverageHint: must('coverageHint'),

    capVal: must('capVal'),
    capRegenHint: must('capRegenHint'),
    capBarFill: must('capBarFill'),
    btnCapRefill: must<HTMLButtonElement>('btnCapRefill'),
    btnCapBoost: must<HTMLButtonElement>('btnCapBoost'),
    btnCapHire: must<HTMLButtonElement>('btnCapHire'),
    btnCapDrink: must<HTMLButtonElement>('btnCapDrink'),
    btnCapShield: must<HTMLButtonElement>('btnCapShield'),
    ticketList: must('ticketList'),
    backlogDetails: must<HTMLDetailsElement>('backlogDetails'),
    backlogSummaryChips: must('backlogSummaryChips'),
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
    profileAchList: must('profileAchList'),

    refactorModal: must('refactorModal'),
    refactorBackdrop: must('refactorBackdrop'),
    btnCloseRefactor: must<HTMLButtonElement>('btnCloseRefactor'),
    refactorTicketTitle: must('refactorTicketTitle'),
    refactorTargetSelect: must<HTMLSelectElement>('refactorTargetSelect'),
    refactorOptions: must('refactorOptions'),

    integrityBadge: must('integrityBadge'),

    sparkRating: must('sparkRating'),
    sparkFail: must('sparkFail'),
    sparkJank: must('sparkJank'),
    sparkHeap: must('sparkHeap'),

    comboIndicator: must('comboIndicator'),

    endRunModal: must('endRunModal'),
    endRunBackdrop: must('endRunBackdrop'),
    endRunTitle: must('endRunTitle'),
    endRunScore: must('endRunScore'),
    endRunBreakdown: must('endRunBreakdown'),
    endRunRating: must('endRunRating'),
    endRunDuration: must('endRunDuration'),
    endRunDebt: must('endRunDebt'),
    endRunTickets: must('endRunTickets'),
    endRunBonuses: must('endRunBonuses'),
    endRunPlayAgain: must<HTMLButtonElement>('endRunPlayAgain'),
    endRunReplay: must<HTMLButtonElement>('endRunReplay'),
    endRunDismiss: must<HTMLButtonElement>('endRunDismiss'),

    welcomeModal: must('welcomeModal'),
    welcomeBackdrop: must('welcomeBackdrop'),
    welcomeDismiss: must<HTMLButtonElement>('welcomeDismiss'),

    challengeDaily: must('challengeDaily'),
    challengeWeekly: must('challengeWeekly'),
    btnStartDaily: must<HTMLButtonElement>('btnStartDaily'),
    btnStartWeekly: must<HTMLButtonElement>('btnStartWeekly'),
    challengeResults: must('challengeResults'),

    scenarioList: must('scenarioList'),
    endRunGrade: must('endRunGrade'),
    endRunGradeCallouts: must('endRunGradeCallouts'),
    endRunVerified: must('endRunVerified'),
  };
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
