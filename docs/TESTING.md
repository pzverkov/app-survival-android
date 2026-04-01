# Testing and CI

## Test suites

**Unit tests (Vitest)**: 37 tests across 7 test files covering:
- Simulation subsystems (PlatformPulse, CoverageGate, RegMatrix) as pure functions
- Scoring system (asymmetric bonuses, failure penalties)
- Achievement progression and unlock rules
- Integrity module (HMAC sign/verify, tamper detection, score sanity)
- Entropy pool (seed generation quality)

**E2E tests (Playwright)**: 7 tests covering core game flows:
- App loads and time advances
- Preset switching updates coverage threshold
- Profile modal opens and closes
- Budget decreases while running
- Tab navigation toggles selection state
- Daily seed button populates input
- Score increases after multiple ticks

**DOM validation**: Custom script validates all 135 required element IDs exist exactly once in index.html, preventing wiring regressions between HTML and TypeScript.

## Running tests

```sh
npm run test:unit      # Vitest unit tests
npm run test:dom       # DOM hook validation
npm run test:e2e       # Playwright E2E (requires built app)
npm run test:e2e:ci    # DOM validation + E2E (used in CI)
npm test               # Unit tests + build (type-check + bundle)
```

## E2E deterministic mode

When Playwright runs the app, it sets `VITE_E2E=1`. The app then:
- Sets `window.__E2E__ = true`
- Disables CSS animations (adds `e2e` class)
- Uses a fixed seed of `12345` for reproducible simulation
- Uses `setTimeout(fn, 0)` instead of `requestAnimationFrame` for reliable DOM updates
- Skips the welcome modal to avoid blocking test interactions

## CI pipelines

- **Checks** (on PR + push to main): Unit tests, Playwright E2E, DOM validation
- **Deploy** (on push to main): Build + deploy to GitHub Pages
- **CodeQL** (on PR + push + weekly): Security scanning for JavaScript/TypeScript and Actions
- **Security nightly** (daily): OSV scanner + npm audit, creates PR on findings
- **Dependency review** (on PR): Fails on high-severity dependency vulnerabilities

## CI network note

If npm install or npm ci fails due to registry or proxy configuration in CI, force the public npm registry in the workflow and ensure the lockfile is not pinned to a private registry.
