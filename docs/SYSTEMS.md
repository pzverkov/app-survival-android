# Systems

## Key concepts

Components represent Android subsystems and capability layers such as UI, ViewModel, Domain, Repository, Cache, DB, Network, WorkManager, Observability, Feature Flags, plus security and accessibility controls.

Actions represent user and system behaviors such as scroll, read, write, search, upload, and sync. Some actions can be satisfied via cache while others must hit DB or network.

Incidents simulate production failure modes, including traffic spikes, backend failures, background restrictions, regression waves, zero day advisory pressure, accessibility regressions, and policy enforcement.

Review waves simulate user sentiment and category votes. A fast app can still lose rating if privacy trust, accessibility, or compliance drifts below baseline.

## Production realism layers

These systems intentionally interact. There are no free lunches.

- FrameGuard: Frame budget and jank pressure. UI work that looks cheap on paper becomes expensive under load.

- MainThreadGuard: Main thread strictness and ANR style pressure. IO on the main creates a cascading failure risk.

- HeapWatch: Memory pressure, GC pauses, and OOM risk. High churn and image realism punish sloppy allocation patterns.

- TicketFlow: Open bug tickets with severity, impact, effort, and aging. Fixing consumes engineering capacity. Deferral is allowed but has compounding cost through support load and rating pressure.

- ZeroDayPulse: Zero-day advisory pressure tied to dependency exposure and mitigations. Unpatched exposure drags security posture and privacy trust quickly.

- PlatformPulse: Android platform churn and compatibility pressure across time. The device mix shifts, deprecations bite, and regression risk increases if you under invest in resilience.

- RegMatrix: Regional compliance scoring across EU, US, UK, IN, BR. Compliance is driven by privacy trust, security posture, accessibility, platform pressure, and active advisories.

- PolicyGates: Regional rollout freezes when compliance is critical. Frozen regions reduce effective traffic and earnings until you stabilize.

- CoverageGate: A simplified Android test coverage proxy. Coverage drifts down as complexity and churn rise. Below threshold increases regression risk and opens coverage debt tickets.

Presets adjust expectations:
- **Junior & Mid preset** is forgiving
- **Senior preset** penalizes low coverage meaningfully
- **Staff preset** hold a higher threshold and punish sustained debt
- **Principal preset** expects the strictest bar (higher effective threshold and heavier enforcement) to reflect org scale release risk

## Component metrics (Android terms)

Internally, the simulator tracks a few generic signals per component:

- **Capacity** (how much work it can process per tick)
- **Latency** (time cost for work)
- **Failure/exception rate**
- **Backlog** (queued work)
