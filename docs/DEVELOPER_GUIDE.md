# Developer guide

## Project overview

App Survival: Android Release Night is a web-based simulation game that models Android production trade-offs. Players place architecture components, link dependencies, and respond to incidents to keep a simulated app alive under realistic pressure.

The project is built with TypeScript and Vite. There are zero runtime dependencies -- only `devDependencies` for the build toolchain (Vite, TypeScript, Vitest, Playwright). All game logic, rendering, and i18n run in a single browser bundle.

## Architecture

### State flow

The core loop follows a unidirectional pattern:

```
GameSim.tick() --> sim mutates internal state
       |
       v
main.ts calls sim.getUIState() --> produces a plain UIState snapshot
       |
       v
syncUI() reads UIState --> patches DOM elements directly
```

There is no framework and no virtual DOM. `syncUI()` in `main.ts` reads the snapshot and sets `textContent`, `classList`, `disabled`, etc. on cached element references.

### The 1 Hz tick loop

The simulation runs at one tick per second (`TICK_MS = 1000`). On each tick:

1. `tickPlatformPulse()` and `tickZeroDayPulse()` apply slow-moving world pressure.
2. `tickCoverageGate()` checks test coverage drift.
3. `maybeIncident()` rolls for random incidents (at most one every 26 seconds).
4. Per-component stats are recomputed and requests are spawned and routed.
5. Metrics (failure rate, ANR risk, latency, jank, heap, GC) are updated.
6. Score, rating, and budget are adjusted.

The tick loop is driven by `window.setInterval` in `startTickLoop()`. After each tick, `requestUISync()` schedules a `requestAnimationFrame` (or `setTimeout` in E2E mode) that calls `syncUI()`.

### Key files

| File | Purpose |
|---|---|
| `src/sim.ts` | Simulation engine. Contains `GameSim`, component defs, action defs, incident logic, tick loop internals, scoring, tickets, architecture rules. |
| `src/subsystems.ts` | Pure-function subsystems (`tickPlatformPulse`, `tickCoverageGate`, `computeRegionTarget`). Each takes a read-only input and returns a mutation descriptor; `GameSim` applies it. This is the portable boundary for the stated Kotlin/KMP port goal. |
| `src/types.ts` | Shared type definitions. `COMPONENT_TYPES`, `ACTION_KEYS`, `ComponentDef`, `Component`, `UIState`, `Ticket`, `RunResult`, etc. |
| `src/main.ts` | Entry point. DOM binding, event handlers, canvas rendering, the `syncUI()` function, theme/tab/language setup, integrity checks. |
| `src/achievements.ts` | Achievement catalog and tracker. Defines tiers (bronze/silver/gold), evaluation per preset, storage adapters. |
| `src/scoreboard.ts` | Local scoreboard persistence (`localStorage`). Load, save, add, clear, seal, verify. |
| `src/rng.ts` | Deterministic PRNG (mulberry32). Seeded per run for reproducibility. |
| `src/entropy.ts` | Passive entropy collector. Gathers mouse/keyboard/pointer timing to generate high-quality seeds. |
| `src/integrity.ts` | Tamper detection. HMAC signing of localStorage data, score sanity checks, migration logic. |
| `src/i18n.ts` | Internationalization. All UI strings, fallback chains, `t()` lookup function, DOM `data-i18n` attribute patching. |

## How to add a new component type

1. **Add the type name to `COMPONENT_TYPES` in `src/types.ts`.**
   This is a `const` tuple. Append your new type (e.g. `'BILLING'`) to the array. The `ComponentType` union is derived automatically.

   ```ts
   export const COMPONENT_TYPES = [
     'UI','VM','DOMAIN','REPO','CACHE','DB','NET','WORK','OBS','FLAGS',
     'AUTH','PINNING','KEYSTORE','SANITIZER','ABUSE','A11Y',
     'BILLING'  // <-- new
   ] as const;
   ```

2. **Add a `ComponentDef` entry in `src/sim.ts`.**
   Add to the `ComponentDefs` record. Set `baseCap` (capacity), `baseLat` (latency ms), `baseFail` (failure rate 0..1), `cost` (budget to place), `upgrade` (costs per tier: `[0, tier2, tier3, 0]`), and `desc` (short description for the UI).

   ```ts
   BILLING: { baseCap: 6, baseLat: 20, baseFail: 0.0030, cost: 90, upgrade: [0, 120, 180, 0], desc: 'Billing (IAP/subscription lifecycle)' },
   ```

3. **Add a `COMPONENT_DEPS` entry in `src/sim.ts`.**
   List the third-party dependency tags this component exposes to zero-day advisory pressure. Valid tags: `'net'`, `'image'`, `'json'`, `'auth'`, `'analytics'`. Use an empty array if none apply.

   ```ts
   BILLING: ['net', 'json'],
   ```

4. **Decide the layer placement.**
   The architecture rules enforce a layered model (UI > VM > DOMAIN > REPO > data layers). Sidecars (OBS, FLAGS, A11Y) can be depended on from anywhere. If your component is a sidecar, no extra work is needed. If it belongs in the main pipeline, review the layer ordering logic in `sim.ts` to ensure it fits.

5. **Test.** Place the component in-game and verify it receives requests, upgrades correctly, and interacts with incidents as expected.

## How to add a new incident type

1. **Add the kind to the `IncidentKind` union in `src/sim.ts`.**

   ```ts
   type IncidentKind =
     | 'TRAFFIC_SPIKE'
     // ... existing kinds ...
     | 'MY_NEW_INCIDENT';
   ```

2. **Add a weighted entry to the `table` array inside `maybeIncident()`.**
   Weights should sum to approximately 1.0 across all entries. Adjust existing weights down to make room.

   ```ts
   const table: Array<[IncidentKind, number]> = [
     ['TRAFFIC_SPIKE',    0.17],
     // ... existing entries with slightly reduced weights ...
     ['MY_NEW_INCIDENT',  0.05],
   ];
   ```

3. **Add a `case` in the `switch (kind)` block.**
   Use the existing helpers: `bumpSupport(n)` to increase support load, `hitTrust(privacy, security, a11y)` to adjust perception metrics. Read component tiers with `this.tierOf('TYPE')` to implement mitigation (higher tiers should reduce impact). Log the incident with `this.log('message')`.

   ```ts
   case 'MY_NEW_INCIDENT': {
     const someTier = this.tierOf('NET');
     const damp = someTier > 0 ? 0.7 : 1.0;
     this.netBadness = clamp(this.netBadness + 0.20 * damp, 1.0, 3.0);
     bumpSupport(4);
     this.log('Something happened: network degraded.');
     break;
   }
   ```

4. **Balance.** Incidents should be punishing but recoverable. Test with different component layouts and presets. Check that a mitigation path exists (placing/upgrading a specific component should reduce the impact).

## How to add a new subsystem

Subsystems are pure functions that model a slice of world state (platform drift, coverage decay, regional policy targets). They live in `src/subsystems.ts`, read a snapshot input, and return a result descriptor. `GameSim` holds all mutable state and applies the result. This separation is what makes the sim portable to Kotlin/KMP.

1. **Define input and result types in `src/subsystems.ts`.** Mirror the shape of `CoverageGateInput` / `CoverageGateResult`: inputs are read-only snapshots; results describe mutations or events the orchestrator should apply.

   ```ts
   export type MySubsystemInput = { foo: number; timeSec: number };
   export type MySubsystemResult = { foo: number; shouldEmitTicket: boolean };
   ```

2. **Write a pure function.** No `this`, no side effects, no `Math.random`. Accept a `randFn: () => number` parameter if you need randomness (see `tickPlatformPulse`).

   ```ts
   export function tickMySubsystem(input: MySubsystemInput, randFn: () => number): MySubsystemResult {
     // derive new values; never mutate input
     return { foo: input.foo - 1, shouldEmitTicket: input.foo <= 0 };
   }
   ```

3. **Wire it into `GameSim`** with a thin private method that builds the input, calls the pure function, and writes results back. Mirror `tickCoverageGate` in `src/sim.ts` (around lines 1176-1201) as the reference.

4. **Unit-test the pure function directly.** No `GameSim` needed, no mocks, just input/output assertions.

Subsystem extraction is the long-term direction for the KMP port. See [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) for the layered model the game itself models.

## How to add a new achievement

1. **Add an entry to the array returned by `achievementCatalog()` in `src/achievements.ts`.**

   ```ts
   {
     id: 'JM_MY_ACH',                        // unique ID, prefixed by preset bucket
     bucket: EVAL_PRESET.JUNIOR_MID,          // which preset this belongs to
     visibility: 'PUBLIC',                    // or 'HIDDEN' (revealed on unlock)
     title: 'My Achievement',
     tiers: [
       { tier: 1, label: 'BRONZE', description: 'Do X once.',  reward: { budget: 100 } },
       { tier: 2, label: 'SILVER', description: 'Do X 3 times.', reward: { budget: 160 } },
       { tier: 3, label: 'GOLD',   description: 'Do X 5 times.', reward: { score: 300 } },
     ],
   },
   ```

2. **Add evaluation logic in `AchievementsTracker`.**
   The tracker receives `AchEvent` objects (RUN_START, RUN_END, TICK, INCIDENT, TICKET_FIXED, PURCHASE). In the evaluation method for the relevant preset, check your conditions against the tracker's accumulated state and return the highest tier met.

3. **Choose rewards carefully.** Budget rewards help early-game recovery. Score rewards help leaderboard positioning. Keep rewards modest to avoid a "must-grind" meta. See existing achievements for reference values.

4. **Test.** Use the `InMemoryAchStorage` adapter in unit tests. Feed synthetic events and verify the correct tier unlocks. See `tests/unit/achievements.test.ts` for patterns.

## How to add translations

All UI strings live in `src/i18n.ts` inside the `DICTS` object, keyed by language code.

1. **Add keys to the `en` dictionary first.** English is the source of truth and the final fallback.

   ```ts
   const DICTS: Partial<Record<Lang, Dict>> = {
     en: {
       // ... existing keys ...
       'card.myFeature.title': 'My Feature',
       'card.myFeature.desc': 'Description with {variable} interpolation.',
     },
     // ...
   };
   ```

2. **Reference keys in HTML or code.**
   - In HTML: `<span data-i18n="card.myFeature.title"></span>`, `<input data-i18n-placeholder="...">`, or `<button data-i18n-title="...">`.
   - In code: `t('card.myFeature.desc', { variable: someValue })`.

3. **Add translations to other languages.** Add the same key to `es`, `fr`, `de`, etc. inside `DICTS`. You do not need to translate into every language; the fallback chain handles missing keys automatically:
   - Regional variants (e.g. `fr-CH`) fall back to their base language (`fr`).
   - All languages ultimately fall back to `en`.

4. **Adding a new language.** Add the language code to the `Lang` type union, add a `LocaleMeta` entry to the `LOCALES` array (with `group` and optional `base`/`beta` fields), and add a dict entry in `DICTS`.

5. **Dev-mode warnings.** In dev mode, any key lookup that falls through to the raw key string logs a console warning (`[i18n] missing key`). This helps catch untranslated keys early.

## Build environment

The project uses Vite with three environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `VITE_BASE` | Sets `base` in `vite.config.ts`. For GitHub Pages under a repo path, CI sets this to `/<repo>/`. For custom domains or local dev, use `/`. | `/` |
| `VITE_COMMIT_SHA` | The git commit SHA injected at build time. Used by integrity checks to derive an HMAC key for tamper detection of localStorage data. Shown in the build info footer. | `'dev'` |
| `VITE_E2E` | When set to `'1'`, the app enters E2E mode: sets `window.__E2E__ = true`, adds a `e2e` CSS class (disables animations), and forces the seed to `12345` for determinism. | unset |

Local development:
```sh
npm install
npm run dev        # Vite dev server on port 5173
npm run build      # TypeScript check + Vite production build
npm run preview    # Serve the production build locally
```

## Testing guide

### Unit tests (Vitest)

Unit tests live in `tests/unit/` and run with Vitest:

```sh
npm run test:unit          # single run
npm run test:watch         # watch mode
```

**Writing unit tests:**

Instantiate `GameSim` directly and manipulate state. The sim has no DOM dependency.

```ts
import { describe, it, expect } from 'vitest';
import { GameSim } from '../../src/sim';
import { EVAL_PRESET } from '../../src/types';

describe('MyFeature', () => {
  it('does something', () => {
    const sim = new GameSim();
    sim.setPreset(EVAL_PRESET.SENIOR);

    // Manipulate internal state (cast to any for private fields if needed).
    (sim as any).coveragePct = 60;

    // Call internal methods directly.
    (sim as any).tickCoverageGate();

    // Assert against public getters.
    const tickets = sim.getTickets();
    expect(tickets.some(t => t.kind === 'TEST_COVERAGE')).toBe(true);
  });
});
```

For achievement tests, use `InMemoryAchStorage` instead of localStorage:

```ts
import { AchievementsTracker, InMemoryAchStorage } from '../../src/achievements';

const store = new InMemoryAchStorage();
const tracker = new AchievementsTracker(EVAL_PRESET.JUNIOR_MID, store);
const unlocked = tracker.onEvents([
  { type: 'RUN_START', atSec: 0, budget: 3000, architectureDebt: 0 },
  { type: 'TICKET_FIXED', atSec: 10, kind: 'BUG' as any, effort: 4 },
]);
expect(unlocked.map(a => `${a.id}:${a.tier}`)).toContain('JM_SHIP_IT:1');
```

### DOM validation

A static script checks that all `id` and `data-*` attributes referenced in `main.ts` exist in `index.html`:

```sh
npm run test:dom
```

Run this after modifying HTML element IDs or adding new `data-i18n` hooks.

### E2E tests (Playwright)

E2E tests live in `tests/e2e/` and use Playwright:

```sh
npm run test:e2e           # run against a local preview build
npm run test:e2e:ci        # DOM validation + Playwright (used in CI)
```

Playwright builds the app with `VITE_BASE=/ VITE_E2E=1`, then serves it on port 4173. The `VITE_E2E=1` flag ensures:

- The app uses a fixed seed (`12345`) for deterministic simulation.
- CSS animations are disabled to reduce flake.
- `requestAnimationFrame` is replaced with `setTimeout(fn, 0)` for reliable DOM updates in headless mode.

**Writing E2E tests:**

```ts
import { test, expect } from '@playwright/test';

test('my feature works', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#someElement')).toBeVisible();
  await page.click('#btnStart');
  await page.waitForTimeout(2200); // wait for 2+ ticks
  // Assert DOM state changed.
});
```

### Full test suite

```sh
npm test                   # runs test:unit, then build (type-check + bundle)
```
