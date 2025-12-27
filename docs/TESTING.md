# Testing and CI

## Tests

Unit tests: **Vitest** covers the simulation engine for key systems such as CoverageGate and regional freeze behavior, plus progression systems such as achievements and unlock rules.

Smoke tests: **Playwright** verifies the app boots and a run can advance without basic wiring regressions.

## E2E marker + deterministic mode

- When Playwright runs the app, it sets `VITE_E2E=1`.
- The app then sets `window.__E2E__ = true`, disables motion (CSS), and uses an initial seed of `12345`.

## CI network note

If npm install or npm ci fails due to registry or proxy configuration in CI, force the public npm registry in the workflow and ensure the lockfile is not pinned to a private registry.
