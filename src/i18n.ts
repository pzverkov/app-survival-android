export type Lang =
  | 'en'
  | 'en-AU'
  | 'en-ZA'
  | 'es'
  | 'fr'
  | 'fr-CH'
  | 'de'
  | 'de-CH'
  | 'pt'
  | 'nl'
  | 'it'
  | 'it-CH'
  | 'rm'
  | 'nb'
  | 'nn'
  | 'af'
  | 'zu'
  | 'xh'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'zh-Hans'
  | 'hi';

export const LANG_KEY = 'lang';

export type Dict = Record<string, string>;

// Only `en` is bundled inline so the fallback always resolves synchronously.
// All other locales live in src/locales/<id>.ts and are loaded on demand via
// ensureLoaded() — see loadLanguage() and setLanguage() below.
const DICTS: Partial<Record<Lang, Dict>> = {
  en: {
    'app.title': 'App Survival: Android Release Night',
    'app.badge': 'M3 • TS + Vite',

    'nav.overview': 'Overview',
    'nav.backlog': 'Backlog',
    'nav.signals': 'Signals',
    'nav.history': 'History',

    'btn.start': 'Start',
    'btn.pause': 'Pause',
    'btn.reset': 'Reset',
    'btn.profile': 'Profile',

    'mode.label': 'Mode:',
    'mode.select': 'Select',
    'mode.link': 'Link',
    'mode.unlink': 'Unlink',

    'card.selected': 'Selected',
    'card.metrics': 'Metrics',
    'card.seed': 'Seed',
    'card.achievements': 'Achievements',
    'card.trust': 'Trust & accessibility',
    'card.platform': 'Platform',
    'card.regions': 'Regions',
    'card.votes': 'User votes (live sentiment)',
    'card.incidents': 'Incidents',
    'card.postmortem': 'Postmortem',
    'card.scoreboard': 'Scoreboard (local)',
    'card.roadmap': 'Refactor Roadmap',

    'lbl.budget': 'Budget',
    'lbl.time': 'Time',
    'lbl.shift': 'Shift',
    'lbl.rating': 'Rating',
    'lbl.score': 'Score',
    'lbl.arch': 'Architecture',
    'lbl.failures': 'Failures',
    'lbl.coverage': 'Coverage',
    'lbl.anr': 'ANR Risk',
    'lbl.latency': 'p95 Latency',
    'lbl.battery': 'Battery',
    'lbl.jank': 'Jank',
    'lbl.heap': 'Heap',

    'hint.budget': 'Run ends at $0 or rating 1.0★',
    'hint.time': 'Sim time',
    'hint.shift': 'Target session length',
    'hint.rating': 'Drops from failures / ANRs / slow',
    'hint.score': 'Deterministic per seed',
    'hint.arch': 'Debt (0..100)',
    'hint.failures': 'Too many = review bombs',
    'hint.coverage': 'Target',
    'hint.anr': 'Main thread pain',
    'hint.latency': 'Queueing makes it worse',
    'hint.battery': 'Work spam drains',
    'hint.jank': 'FrameGuard 16ms',
    'hint.heap': 'HeapWatch GC • OOM',

    'seed.active': 'Active:',
    'seed.placeholder': 'Seed (optional)',
    'seed.daily': 'Daily',
    'seed.note': 'Reset uses the seed above (if set).',

    'ach.preset': 'Preset:',
    'ach.unlocked': 'Unlocked:',
    'ach.openProfile': 'Open profile',

    'profile.title': 'Profile',
    'profile.preset': 'Preset',
    'profile.unlocked': 'Unlocked:',
    'profile.best': 'Best survival:',
    'profile.hiddenNote': 'Hidden achievements show up as “Hidden achievement” until you unlock them.',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',

    'theme.system': 'System',
    'theme.light': 'Light',
    'theme.dark': 'Dark',

    'canvas.zoomIn': 'Zoom in',
    'canvas.zoomOut': 'Zoom out',
    'canvas.fit': 'Fit',

    'toast.achUnlocked': 'Achievement unlocked: {title}{tier}{reward}',
    'toast.reward': ' (+{reward})',
    'toast.tier': ' {tier}',

    'btn.profileTitle': 'Profile & achievements',
    'seed.dailyTitle': 'Use a deterministic daily seed',
    'sel.title': 'Selected',
    'sel.none': 'None',
    'sel.hint': 'Upgrades raise capacity & reliability. Repairs restore health. Both cost budget',
    'btn.upgrade': 'Upgrade',
    'btn.repair': 'Repair',
    'btn.delete': 'Delete',
    'trust.a11y': 'A11y',
    'trust.privacy': 'Privacy',
    'trust.security': 'Security',
    'trust.supportLoad': 'Support load',
    'setup.evalPreset': 'Evaluation preset',
    'setup.evalPresetHint': 'CoverageGate and enforcement weight',
    'preset.juniorMid': 'Junior-Mid',
    'preset.senior': 'Senior',
    'preset.staff': 'Staff',
    'preset.principal': 'Principal',
    'setup.placeComponent': 'Place component',
    'btn.add': 'Add',
    'component.UI': 'UI',
    'component.VM': 'ViewModel',
    'component.DOMAIN': 'Domain',
    'component.REPO': 'Repository',
    'component.CACHE': 'Cache',
    'component.DB': 'Room DB',
    'component.NET': 'Network',
    'component.WORK': 'WorkManager',
    'component.OBS': 'Observability',
    'component.FLAGS': 'Feature Flags',
    'component.AUTH': 'Auth / Sessions',
    'component.PINNING': 'TLS Pinning',
    'component.KEYSTORE': 'Keystore / Crypto',
    'component.SANITIZER': 'Input Sanitizer',
    'component.ABUSE': 'Abuse Protection',
    'component.A11Y': 'Accessibility Layer',
    'setup.dragHintPrefix': 'Drag components to rearrange. Link mode: click',
    'setup.dragHintSource': 'source',
    'setup.dragHintThen': 'click',
    'setup.dragHintDest': 'destination',
    'backlog.capacity': 'Capacity',
    'btn.refill': 'Refill',
    'btn.boostRegen': 'Boost regen',
    'btn.energyDrink': 'Energy drink',
    'btn.energyDrinkTitle': 'Temporary regen booster (unlocks via achievements)',
    'btn.incidentShield': 'Incident shield',
    'btn.incidentShieldTitle': 'Blocks the next incident penalty once (unlocks via achievements)',
    'btn.hire': 'Hire',
    'platform.latestApi': 'Latest API',
    'platform.minApi': 'Min API',
    'platform.oldDevices': 'Old devices',
    'platform.lowRam': 'Low RAM',
    'regions.regPressure': 'Reg pressure',
    'regions.hint': 'Compliance and rollout gates',
    'votes.perf': 'Perf',
    'votes.reliability': 'Reliability',
    'votes.privacy': 'Privacy',
    'votes.a11y': 'A11y',
    'votes.battery': 'Battery',
    'signals.noReviews': 'No reviews yet.',
    'signals.noIncidents': 'No incidents… yet.',
    'btn.copyRunJson': 'Copy run JSON',
    'btn.clear': 'Clear',
    'history.scoreboardHint': 'Top runs stored in localStorage.',
    'history.noRun': 'No run yet.',
    'history.noScores': 'No scores yet.',
    'btn.applyNext': 'Apply next',
    'history.roadmapHint': 'Suggested sequence to pay down architecture debt (Staff/Principal-style).',
    'history.noRoadmap': 'No roadmap yet.',
    'history.realismTitle': 'Android realism features (implemented)',
    'history.realism.frameguard': 'frame budget and jank meter (16ms model)',
    'history.realism.mainthread': 'IO on main strictness (adds ANR and jank)',
    'history.realism.heapwatch': 'heap meter with GC pauses and OOM crashes',
    'history.recoPrefix': 'Recommended starter graph:',
    'history.recoAnd': 'and',
    'history.recoAdd': 'Add',
    'history.recoSuffix': 'to reduce blast radius',
    'incident.label': 'Incident',
    'incident.dismiss': 'Dismiss incident',
    'incident.hint': 'Respond fast: fix or defer the top ticket to stop the bleed.',
    'btn.openBacklog': 'Open backlog',
    'btn.quickTriage': 'Quick triage',
    'profile.close': 'Close profile',
    'heapwatch.gc': 'HeapWatch GC',
    'heapwatch.msOom': 'ms • OOM',
    'history.copyPrompt': 'Copy run JSON:',
    'build.info': 'Build {sha} • base {base}',
    'coverage.below': 'Below {threshold}% increases regressions',
    'coverage.target': 'Target {threshold}%+ for stable releases',
    'advisory.active': 'Active: {title}',
    'roadmap.action': 'Action',
    'roadmap.why': 'Why',

    'toast.achievementUnlocked': 'Achievement unlocked: {title}{tier}{reward}',
    'toast.runCopied': 'Run JSON copied',
    'toast.scoreboardCleared': 'Scoreboard cleared',
    'toast.noRoadmapTicket': 'No architecture debt ticket to refactor',

    'backlog.noTickets': 'No open tickets',
    'backlog.summary.total': '{n} open',
    'backlog.summary.deferred': '{n} deferred',
    'backlog.open': 'Open backlog',
    'backlog.close': 'Close backlog',
    'ticket.more': 'More actions',
    'ticket.fix': 'Fix ({effort})',
    'ticket.need': 'Need {effort}',
    'ticket.defer': 'Defer',
    'ticket.undefer': 'Undefer',
    'ticket.impact': 'impact {impact}',
    'ticket.age': 'age {minutes}m',
    'ticket.deferred': 'deferred',
    'ticket.refactorOptions': 'Refactor options',
    'ticket.closeRefactor': 'Close refactor options',
    'ticket.autoTarget': 'Auto-target (worst violation)',
    'ticket.target': 'Target',
    'ticket.refactorHint': 'Refactors spend budget and reduce architecture debt. Pick the cheapest thing that fixes the worst violation.',
    'ticket.expandTitle': 'Expand',
    'ticket.collapseTitle': 'Collapse',

    'shop.full': 'Full',
    'shop.refillCost': 'Refill ({cost})',
    'shop.boostCost': 'Boost regen ({cost})',
    'shop.boostMax': 'Boost regen (max)',
    'shop.hireCost': 'Hire (+2 max {cost})',
    'shop.hireMax': 'Hire (max)',
    'shop.shieldReady': 'Shield ready',
    'shop.shieldCost': 'Incident shield ({cost})',
    'shop.boosterActive': 'Regen boosted ({sec}s)',
    'shop.energyDrinkCharges': 'Energy drink x{n}',
    'shop.energyDrinkCost': 'Energy drink ({cost})',
    'ach.hiddenDesc': 'Keep playing to reveal this one.',
    'ach.hiddenTitle': 'Hidden achievement',
    'achv.JM_BACKLOG_TAMER.t1': 'Reduce backlog from 8+ down to 4 or less.',
    'achv.JM_BACKLOG_TAMER.t2': 'Reduce backlog from 10+ down to 4 or less.',
    'achv.JM_BACKLOG_TAMER.t3': 'Reduce backlog from 12+ down to 3 or less.',
    'achv.JM_BACKLOG_TAMER.title': 'Backlog Tamer',
    'achv.JM_CLEAN_DESK.t1': 'Keep backlog ≤2 for 30 seconds.',
    'achv.JM_CLEAN_DESK.t2': 'Keep backlog ≤2 for 60 seconds.',
    'achv.JM_CLEAN_DESK.t3': 'Keep backlog ≤2 for 90 seconds.',
    'achv.JM_CLEAN_DESK.title': 'Clean Desk',
    'achv.JM_FAST_RESPONSE.t1': 'Fix a ticket within 15s of an incident (1x).',
    'achv.JM_FAST_RESPONSE.t2': 'Fix within 15s of an incident (2x in a run).',
    'achv.JM_FAST_RESPONSE.t3': 'Fix within 15s of an incident (3x in a run).',
    'achv.JM_FAST_RESPONSE.title': 'Fast Response',
    'achv.JM_NO_REFILL.t1': 'Survive 4 minutes without buying a refill.',
    'achv.JM_NO_REFILL.t2': 'Survive 6 minutes without buying a refill.',
    'achv.JM_NO_REFILL.t3': 'Survive 8 minutes without buying a refill.',
    'achv.JM_NO_REFILL.title': 'No Refill',
    'achv.JM_SHIP_IT.t1': 'Fix 1 ticket in a run.',
    'achv.JM_SHIP_IT.t2': 'Fix 5 tickets in a run.',
    'achv.JM_SHIP_IT.t3': 'Fix 10 tickets in a run.',
    'achv.JM_SHIP_IT.title': 'Ship It',
    'achv.JM_SURVIVOR.t1': 'Survive 3 minutes.',
    'achv.JM_SURVIVOR.t2': 'Survive 5 minutes.',
    'achv.JM_SURVIVOR.t3': 'Survive 7 minutes.',
    'achv.JM_SURVIVOR.title': 'Survivor',
    'achv.JM_TRUST_STACK.t1': 'Survive 5 minutes with all trust & security layers placed.',
    'achv.JM_TRUST_STACK.t2': 'Survive 7 minutes with all trust layers placed.',
    'achv.JM_TRUST_STACK.t3': 'Survive 10 minutes with all trust layers placed.',
    'achv.JM_TRUST_STACK.title': 'Trust Stack',
    'achv.P_BLACK_SWAN.t1': 'Survive 10 minutes and fix 3 incident tickets within 20s.',
    'achv.P_BLACK_SWAN.t2': 'Survive 12 minutes and fix 4 incident tickets within 20s.',
    'achv.P_BLACK_SWAN.t3': 'Survive 15 minutes and fix 5 incident tickets within 20s.',
    'achv.P_BLACK_SWAN.title': 'Black Swan',
    'achv.P_MIN_INTERVENTION.t1': 'Survive 10 minutes with less than 2 refills.',
    'achv.P_MIN_INTERVENTION.t2': 'Survive 12 minutes with less than 2 refills.',
    'achv.P_MIN_INTERVENTION.t3': 'Survive 15 minutes with less than 1 refill.',
    'achv.P_MIN_INTERVENTION.title': 'Minimal Intervention',
    'achv.S_NO_REFILL.t1': 'Survive 6 minutes without buying a refill.',
    'achv.S_NO_REFILL.t2': 'Survive 8 minutes without buying a refill.',
    'achv.S_NO_REFILL.t3': 'Survive 10 minutes without buying a refill.',
    'achv.S_NO_REFILL.title': 'No Refill Run',
    'achv.S_STABLE_OPS.t1': 'Keep rating ≥4.6★ for 2 minutes.',
    'achv.S_STABLE_OPS.t2': 'Keep rating ≥4.7★ for 2.5 minutes.',
    'achv.S_STABLE_OPS.t3': 'Keep rating ≥4.8★ for 3 minutes.',
    'achv.S_STABLE_OPS.title': 'Stable Ops',
    'achv.S_SURVIVOR.t1': 'Survive 7 minutes.',
    'achv.S_SURVIVOR.t2': 'Survive 9 minutes.',
    'achv.S_SURVIVOR.t3': 'Survive 12 minutes.',
    'achv.S_SURVIVOR.title': 'Senior Stamina',
    'achv.S_VELOCITY.t1': 'Fix 3 tickets in a run.',
    'achv.S_VELOCITY.t2': 'Fix 9 tickets in a run.',
    'achv.S_VELOCITY.t3': 'Fix 18 tickets in a run.',
    'achv.S_VELOCITY.title': 'Velocity',
    'achv.ST_ARCH_SURGEON.t1': 'Reduce architecture debt by 25+ in a run.',
    'achv.ST_ARCH_SURGEON.t2': 'Reduce architecture debt by 40+ in a run.',
    'achv.ST_ARCH_SURGEON.t3': 'Reduce architecture debt by 55+ in a run.',
    'achv.ST_ARCH_SURGEON.title': 'Architecture Surgeon',
    'achv.ST_LEAN_RUN.t1': 'Survive 8 minutes with 1 purchase or less.',
    'achv.ST_LEAN_RUN.t2': 'Survive 10 minutes with 1 purchase or less.',
    'achv.ST_LEAN_RUN.t3': 'Survive 12 minutes with 1 purchase or less.',
    'achv.ST_LEAN_RUN.title': 'Lean Run',
    'profile.next': 'Next:',
    'tier.bronze': 'Bronze',
    'tier.gold': 'Gold',
    'tier.silver': 'Silver',
  },
};

type LocaleGroup = 'core' | 'regional' | 'more';

export type LocaleMeta = {
  id: Lang;
  nativeLabel: string; // self label
  label: string;       // English label
  group: LocaleGroup;
  beta?: boolean;      // partial translation; cleanly falls back
  base?: Lang;         // for regional variants
};

export const LOCALES: ReadonlyArray<LocaleMeta> = [
  // Core
  { id: 'en', label: 'English', nativeLabel: 'English', group: 'core' },
  { id: 'es', label: 'Spanish', nativeLabel: 'Español', group: 'core' },
  { id: 'fr', label: 'French', nativeLabel: 'Français', group: 'core' },
  { id: 'de', label: 'German', nativeLabel: 'Deutsch', group: 'core' },
  { id: 'pt', label: 'Portuguese', nativeLabel: 'Português', group: 'core' },
  { id: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', group: 'core' },
  { id: 'ru', label: 'Russian', nativeLabel: 'Русский', group: 'core' },

  // Regional variants (inherit base language)
  { id: 'en-AU', label: 'English (Australia)', nativeLabel: 'English (Australia)', group: 'regional', base: 'en' },
  { id: 'en-ZA', label: 'English (South Africa)', nativeLabel: 'English (South Africa)', group: 'regional', base: 'en' },
  { id: 'de-CH', label: 'German (Switzerland)', nativeLabel: 'Deutsch (Schweiz)', group: 'regional', base: 'de' },
  { id: 'fr-CH', label: 'French (Switzerland)', nativeLabel: 'Français (Suisse)', group: 'regional', base: 'fr' },
  { id: 'it-CH', label: 'Italian (Switzerland)', nativeLabel: 'Italiano (Svizzera)', group: 'regional', base: 'it', beta: true },
  { id: 'rm', label: 'Romansh', nativeLabel: 'Rumantsch', group: 'regional', base: 'de-CH', beta: true },
  { id: 'nn', label: 'Norwegian (Nynorsk)', nativeLabel: 'Norsk (Nynorsk)', group: 'regional', base: 'nb', beta: true },

  // More languages (partial for now; production fallbacks make them safe to ship)
  { id: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', group: 'more', beta: true },
  { id: 'it', label: 'Italian', nativeLabel: 'Italiano', group: 'more', beta: true },
  { id: 'nb', label: 'Norwegian (Bokmål)', nativeLabel: 'Norsk (Bokmål)', group: 'more', beta: true },
  { id: 'af', label: 'Afrikaans', nativeLabel: 'Afrikaans', group: 'more', beta: true },
  { id: 'zu', label: 'Zulu', nativeLabel: 'isiZulu', group: 'more', beta: true },
  { id: 'xh', label: 'Xhosa', nativeLabel: 'isiXhosa', group: 'more', beta: true },
  { id: 'ja', label: 'Japanese', nativeLabel: '日本語', group: 'more', beta: true },
  { id: 'zh-Hans', label: 'Chinese (Simplified)', nativeLabel: '中文（简体）', group: 'more', beta: true },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', group: 'more', beta: true },
];

const META: Record<Lang, LocaleMeta> = Object.fromEntries(LOCALES.map((l) => [l.id, l])) as Record<Lang, LocaleMeta>;
const CANONICAL: Record<string, Lang> = Object.fromEntries(LOCALES.map((l) => [l.id.toLowerCase(), l.id]));

// Vite glob: each per-locale module exports a default Dict. The import() is
// kept lazy (default behaviour) so only the requested locale is downloaded.
const LOCALE_MODULES = import.meta.glob<{ default: Dict }>('./locales/*.ts');

const loadingLocales = new Map<Lang, Promise<void>>();

function normalizeLocale(input: string): Lang | null {
  const raw = (input || '').replace(/_/g, '-').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  // Exact supported match
  if (CANONICAL[lower]) return CANONICAL[lower];

  // Mandarin: treat any zh-* as Simplified by default (safe for UI)
  if (lower.startsWith('zh')) return 'zh-Hans';

  // Norwegian aliases
  if (lower === 'no' || lower.startsWith('no-')) return 'nb';

  // Base language match
  const base = lower.split('-')[0]!;
  const hit = CANONICAL[base];
  if (hit) return hit;

  // Ukrainian: some environments report 'ua'
  if (base === 'ua') return 'uk';

  return null;
}

function fallbackOf(lang: Lang): Lang | null {
  const meta = META[lang];
  if (meta?.base) return meta.base;
  if (lang === 'en') return null;
  return 'en';
}

function templateFor(key: string, lang: Lang): string | null {
  const dict = DICTS[lang];
  return dict ? (dict[key] ?? null) : null;
}

async function ensureLoaded(lang: Lang): Promise<void> {
  if (DICTS[lang]) return;
  const existing = loadingLocales.get(lang);
  if (existing) return existing;

  const loader = LOCALE_MODULES[`./locales/${lang}.ts`];
  if (!loader) {
    // No dedicated file (e.g. regional variant with no own dict). Leave
    // DICTS[lang] undefined so fallbackOf() walks to the base language.
    return;
  }

  const p = loader().then((mod) => {
    DICTS[lang] = mod.default;
  }).catch(() => {
    // Network / chunk failure: swallow so t() falls back to English rather
    // than blocking the entire UI. The dev-only warning is enough signal.
  });
  loadingLocales.set(lang, p);
  await p;
}

async function ensureLoadedChain(lang: Lang): Promise<void> {
  const visited = new Set<Lang>();
  let cur: Lang | null = lang;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    await ensureLoaded(cur);
    cur = fallbackOf(cur);
  }
}

let currentLang: Lang = 'en';

export function getLanguage(): Lang {
  return currentLang;
}

// Synchronous: stores the preference and triggers a background load of the
// locale chain. Callers that must re-render text once the dict is ready
// should await ensureLanguageReady(lang).
export function setLanguage(lang: Lang): void {
  currentLang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  // Kick off lazy load; caller can also await ensureLanguageReady for the
  // post-load redraw.
  void ensureLoadedChain(lang);
}

export async function ensureLanguageReady(lang: Lang): Promise<void> {
  return ensureLoadedChain(lang);
}

export async function loadLanguage(): Promise<Lang> {
  const saved = (() => {
    try { return localStorage.getItem(LANG_KEY) || ''; } catch { return ''; }
  })();

  const savedNorm = normalizeLocale(saved);
  if (savedNorm) {
    setLanguage(savedNorm);
    await ensureLoadedChain(savedNorm);
    return currentLang;
  }

  const candidates: string[] = Array.isArray(navigator.languages) && navigator.languages.length
    ? [...navigator.languages]
    : [navigator.language || 'en'];

  for (const cand of candidates) {
    const norm = normalizeLocale(cand);
    if (norm) {
      setLanguage(norm);
      await ensureLoadedChain(norm);
      return currentLang;
    }
  }

  setLanguage('en');
  return currentLang;
}

export function populateLanguageSelect(select: HTMLSelectElement, selected?: Lang) {
  while (select.firstChild) select.removeChild(select.firstChild);

  const groups: { id: LocaleGroup; label: string }[] = [
    { id: 'core', label: 'Core' },
    { id: 'regional', label: 'Regional' },
    { id: 'more', label: 'More languages' },
  ];

  for (const g of groups) {
    const og = document.createElement('optgroup');
    og.label = g.label;

    for (const loc of LOCALES.filter((l) => l.group === g.id)) {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = loc.beta ? `${loc.nativeLabel} (beta)` : loc.nativeLabel;
      og.appendChild(opt);
    }

    select.appendChild(og);
  }

  select.value = selected || currentLang;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let lang: Lang | null = currentLang;
  const visited = new Set<string>();

  while (lang && !visited.has(lang)) {
    visited.add(lang);
    const hit = templateFor(key, lang);
    if (hit != null) {
      return vars ? hit.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : hit;
    }
    lang = fallbackOf(lang);
  }

  const enHit = templateFor(key, 'en');
  const tmpl = enHit ?? key;

  const isDev = import.meta.env?.DEV === true;
  if (isDev && tmpl === key) warnMissing(key);

  if (!vars) return tmpl;
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

// Dev-only missing key warnings (non-fatal)
function warnMissing(key: string) {
  const isDev = import.meta.env?.DEV === true;
  if (!isDev) return;

  window.__i18nMissing = window.__i18nMissing ?? new Set();
  const s = window.__i18nMissing;
  if (s.has(key)) return;
  s.add(key);
  // eslint-disable-next-line no-console
  console.warn('[i18n] missing key', key, 'lang=', currentLang);
}

/**
 * Applies translations to the DOM.
 * - data-i18n="key" => textContent
 * - data-i18n-placeholder="key" => placeholder
 * - data-i18n-title="key" => title
 */
export function applyTranslations(root: ParentNode = document) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n]'));
  for (const el of nodes) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.textContent = value;
    }
  }
  const ph = Array.from(root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]'));
  for (const el of ph) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.placeholder = value;
    }
  }

  const aria = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]'));
  for (const el of aria) {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.setAttribute('aria-label', value);
    }
  }

  const title = Array.from(root.querySelectorAll<HTMLElement>('[data-i18n-title]'));
  for (const el of title) {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      const value = t(key);
      if (value === key) warnMissing(key);
      el.title = value;
    }
  }
}
