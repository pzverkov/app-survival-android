# app-survival-android (web game, TypeScript, Node.js, Vite)

## Project

App Survival Android Release Night is a web based simulation game inspired by real Android production incidents. It compresses production constraints into a playable loop: design an architecture graph, ship under pressure, and keep user sentiment, reliability, security, and compliance from collapsing at the same time.

Inspired by Server Survival by pshenok at https://pshenok.github.io/server-survival/ This project is an original implementation and is not affiliated with the original author. No code or assets were copied from the original project.

Live demo
https://pzverkov.github.io/app-survival-android/

## Purpose

This project is designed to be usable for Android developer skill evaluation, with emphasis on Senior, Staff, and Principal level production thinking. It targets real world trade offs across performance, reliability, background execution, security and privacy, accessibility, observability, incident response, and multi region policy pressure.

The simulation core is written in TypeScript and intentionally kept separate from UI rendering so it can be ported to a Kotlin and Android implementation later.

## Key concepts

Components represent Android subsystems and capability layers such as UI, ViewModel, Domain, Repository, Cache, DB, Network, WorkManager, Observability, Feature Flags, plus security and accessibility controls.

Actions represent user and system behaviors such as scroll, read, write, search, upload, and sync. Some actions can be satisfied via cache while others must hit DB or network.

Incidents simulate production failure modes including traffic spikes, backend failures, background restrictions, regression waves, zero day advisory pressure, accessibility regressions, and policy enforcement.

Review waves simulate user sentiment and category votes. A fast app can still lose rating if privacy trust, accessibility, or compliance drifts below baseline.

## Production realism layers

These systems intentionally interact. There are no free lunches.

FrameGuard
Frame budget and jank pressure. UI work that looks cheap on paper becomes expensive under load.

MainThreadGuard
Main thread strictness and ANR style pressure. IO on main creates cascading failure risk.

HeapWatch
Memory pressure, GC pauses, and OOM risk. High churn and image realism punish sloppy allocation patterns.

TicketFlow
Open bug tickets with severity, impact, effort, and aging. Fixing consumes engineering capacity. Deferral is allowed but has compounding cost through support load and rating pressure.

ZeroDayPulse
Zero day advisory pressure tied to dependency exposure and mitigations. Unpatched exposure drags security posture and privacy trust quickly.

PlatformPulse
Android platform churn and compatibility pressure across time. The device mix shifts, deprecations bite, and regression risk increases if you under invest in resilience.

RegMatrix
Regional compliance scoring across EU, US, UK, IN, BR. Compliance is driven by privacy trust, security posture, accessibility, platform pressure, and active advisories.

PolicyGates
Regional rollout freezes when compliance is critical. Frozen regions reduce effective traffic and earnings until you stabilize.

CoverageGate
A simplified Android test coverage proxy. Coverage drifts down as complexity and churn rise. Below threshold increases regression risk and opens coverage debt tickets.
Presets adjust expectations:
Junior Mid is forgiving
Senior penalizes low coverage meaningfully
Staff holds a higher threshold and punishes sustained debt
Principal expects the strictest bar (higher effective threshold and heavier enforcement) to reflect org scale release risk

## UI and experience

Material 3 theming
System, Light, Dark theme modes with persisted preference. Native controls follow color scheme. Browser theme color follows the active theme.

LiquidGlass
Optional glass surfaces with blur and saturation when supported. Disabled automatically when unsupported and respects reduced transparency preferences.

Performance conscious UI
UI updates are scheduled and throttled to reduce DOM churn and GC pressure. Large lists avoid unnecessary re render work.

## How to run locally

Prerequisites
Node.js 20 or newer is recommended

Install
npm install

Run
npm run dev

Build
npm run build

Preview
npm run preview

## GitHub Pages deployment

This repository includes a GitHub Actions workflow that builds and publishes the dist folder to GitHub Pages.

Setup
1 Push the repository to GitHub on the main branch
2 In GitHub repository settings, open Pages
3 Set Source to GitHub Actions

CI network note
If npm install or npm ci fails due to registry or proxy configuration in CI, force the public npm registry in the workflow and ensure the lockfile is not pinned to a private registry.

## How to play
Start a run
1) Pick a preset (Senior / Staff / Principal), then press **Start**.
2) Place components, link dependencies, upgrade, and fix tickets to keep the app alive.

Deterministic seeds (reproducible runs)
- Set a **Seed** (number) and press **Reset** to start a deterministic run.
- Press **Daily** to use a deterministic UTC date seed so multiple people can compare the same challenge.
- The current seed is shown next to the controls.

Scoring
- You earn **Score** continuously while the run is alive.
- Score rewards stability (low failure rate / ANR risk / jank / latency) and “realism” metrics (privacy, security, accessibility, regional compliance).
- **Architecture debt** reduces scoring (because messy graphs are expensive in reality too).

Incidents, tickets, and postmortems
- Incidents are appended to the **Incidents** log.
- When a run ends, a **Postmortem** appears with a short summary and key metrics.
- Use **Copy run JSON** to export a structured run report (seed, duration, score, end reason, etc.).

Local scoreboard
- The game stores top runs in your browser (**localStorage**) under `asr:scoreboard:v1`.
- The **Scoreboard (local)** card shows your best runs (final score, preset, debt, rating, duration, seed).
- Use **Clear** to wipe it.

Architecture rules and debt (Clean Architecture “gameified”)
- The linker enforces a layered model (UI → VM → DOMAIN → REPO → DATA). “Sidecars” (OBS/FLAGS/A11Y) can be depended on from anywhere.
- Breaking the rules creates **ARCHITECTURE_DEBT** tickets and increases an **Architecture debt (0..100)** meter.
- Debt increases fragility and drags down score until you pay it down.

Refactor quests (for ARCHITECTURE_DEBT tickets)
Architecture debt tickets come with refactor actions (quests) that cost budget and reduce debt:
- **ADD_BOUNDARY**: dependency inversion / interfaces at boundaries
- **MOVE_MAPPING**: push DTO/mapping to the proper layer, kill shortcuts
- **SPLIT_REPO**: reduce blast radius by splitting “god repos”
- **FEATURE_MODULE**: isolate transitive dependencies behind a module boundary

Targeted refactors
- For architecture debt tickets you can select a specific illegal edge (upward dependency / layer skip) from a dropdown.
- If you don’t select an edge, the game auto-targets the “worst” violation.

Refactor Roadmap
- The **Refactor Roadmap** card suggests a high-signal sequence:
  1) Fix upward deps (ADD_BOUNDARY)
  2) Remove layer skips (MOVE_MAPPING)
  3) Reduce blast radius (SPLIT_REPO)
  4) Add module boundary (FEATURE_MODULE)
- **Apply next** applies the next step to the first open Architecture Debt ticket (when present).

Preset differentiation (Staff vs Principal)
- **Staff**: allows architecture violations but taxes you with debt + debt tickets; pragmatic cleanups are rewarded.
- **Principal**: blocks serious violations (upward deps / big skips) and rewards clean architecture more, but punishes debt harder (your multiplier shrinks with debt).

## Evaluation exercise

Goal
Maintain rating at or above 4.2 for 3 to 5 minutes under incident and policy pressure, while keeping coverage and compliance under control.

Reproducibility and sharing
- Use a fixed **Seed** (or the **Daily** seed) so reviewers can reproduce the same run.
- At the end of a run, use **Copy run JSON** and include it with your notes (or paste it in an issue) to make feedback concrete.


Suggested format
1 Briefing
2 Stabilization run
3 Incident wave run
4 Debrief
5 Optional code task in the simulation engine

Evaluation focuses on diagnosis quality, prioritization, trade off reasoning, and the ability to map interventions to real Android production practices.

Level differentiation lens

Mid level pattern
Stabilizes after issues become visible
Uses basic metrics but misses second order interactions
Optimizes one axis while neglecting privacy, accessibility, compliance, or test debt

Senior level pattern
Stabilizes proactively through multiple incident waves
Chooses targeted upgrades with explicit reasoning
Balances reliability, performance, privacy, accessibility, battery, coverage, and compliance with minimal waste

Staff level pattern
Treats the system as an ecosystem with interacting constraints and multi region policy outcomes
Establishes a resilient baseline early and prevents cascades
Uses observability, feature flags, and safeguards intentionally and explains why
Makes crisp trade off calls and communicates impact to stakeholders
Proposes improvements to the simulation and maps them to an Android org operating model

Principal level pattern
Stabilizes early, then invests in preventative controls and guardrails to reduce whole classes of incidents
Keeps multi region rollout outcomes in mind and avoids "local" optimizations that create global risk
Explains what automation, standards, and release process constraints would prevent the same failures at scale

## Tests

Unit tests
Vitest covers the simulation engine for key systems such as CoverageGate and regional freeze behavior.

Smoke tests
Playwright verifies the app boots and a run can advance without basic wiring regressions.

## Optional code task ideas

Add a new incident type and mitigation rule
Add deterministic seeded randomness and a replay mode
Add a new region rule and enforcement event
Add a new component with tier effects and costs
Add scenario presets for interview mode

## Security

See SECURITY.md for reporting guidance. Do not include secrets in issues or pull requests.

## Contributing

See CONTRIBUTING.md for setup instructions and contribution expectations.

## Code of conduct

See CODE_OF_CONDUCT.md for community standards.

## License

Apache License 2.0 See LICENSE and NOTICE files.
